/**
 * AI 写作助手服务层
 * 封装 LLM 调用，提供创作建议、文本分析、智能提取等功能
 * 支持 OpenAI 兼容 API（可切换为本地模型或其他服务商）
 */

import type { Character, Chapter, Foreshadow, WorldSetting, Resource, Relation } from '../types';
import { generateId } from '../types';
import { db } from '../db/database';

// ========== 配置 ==========

interface AIConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
}

const DEFAULT_CONFIG: AIConfig = {
  apiUrl: 'https://api.openai.com/v1/chat/completions',
  apiKey: '',
  model: 'gpt-3.5-turbo',
};

let currentConfig: AIConfig = { ...DEFAULT_CONFIG };

export function getAIConfig(): AIConfig {
  return { ...currentConfig };
}

export function updateAIConfig(config: Partial<AIConfig>) {
  currentConfig = { ...currentConfig, ...config };
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('ai_config', JSON.stringify(currentConfig));
  }
}

// 初始化时从 localStorage 加载
if (typeof localStorage !== 'undefined') {
  const saved = localStorage.getItem('ai_config');
  if (saved) {
    try { currentConfig = { ...DEFAULT_CONFIG, ...JSON.parse(saved) }; } catch { /* ignore */ }
  }
}

// ========== LLM 调用 ==========

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function callLLM(messages: ChatMessage[], temperature = 0.3): Promise<string> {
  if (!currentConfig.apiKey) {
    throw new Error('请先配置 API Key（在 AI 助手页面设置）');
  }

  const response = await fetch(currentConfig.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${currentConfig.apiKey}`,
    },
    body: JSON.stringify({
      model: currentConfig.model,
      messages,
      temperature,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI 调用失败 (${response.status}): ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/** 从 AI 回复中提取 JSON（可能包裹在 ```json 代码块中） */
function extractJSON(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) return match[1].trim();
  // 尝试直接找 { 或 [ 开头的内容
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return trimmed;
  throw new Error('AI 回复中未找到有效的 JSON 数据');
}

// ========== 分析结果类型 ==========

export interface ExtractedCharacter {
  name: string;
  aliases?: string[];
  race?: string;
  age?: string;
  appearance?: string;
  personality?: string;
  description?: string;
  status?: 'alive' | 'dead' | 'unknown' | 'mentioned';
  currentLocation?: string;
  arc?: string;
  resources?: { name: string; type: string; description: string; status: string }[];
  relations?: { targetName: string; type: string; direction: '单向' | '双向'; description: string; isPublic: boolean }[];
}

export interface ExtractedWorldSetting {
  name: string;
  type: 'location' | 'race' | 'item' | 'concept' | 'history' | 'custom';
  description: string;
  parentName?: string;
  relations?: { targetName: string; type: string }[];
}

export interface ExtractedForeshadow {
  content: string;
  relatedCharacters: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface AnalysisResult {
  characters: ExtractedCharacter[];
  worldSettings: ExtractedWorldSetting[];
  foreshadows: ExtractedForeshadow[];
  summary: string;
  suggestions: string[];
}

// ========== 带匹配状态的分析结果（用于选择性应用） ==========

export type MatchStatus = 'new' | 'update' | 'duplicate';

export interface MatchableCharacter extends ExtractedCharacter {
  _matchStatus: MatchStatus;
  _existingName?: string;
  _existingId?: string;
  _duplicateOf?: string;
  _selected: boolean;
}

export interface MatchableWorldSetting extends ExtractedWorldSetting {
  _matchStatus: MatchStatus;
  _existingName?: string;
  _existingId?: string;
  _duplicateOf?: string;
  _selected: boolean;
}

export interface MatchableForeshadow extends ExtractedForeshadow {
  _matchStatus: MatchStatus;
  _existingContent?: string;
  _existingId?: string;
  _selected: boolean;
}

export interface MatchableAnalysisResult {
  characters: MatchableCharacter[];
  worldSettings: MatchableWorldSetting[];
  foreshadows: MatchableForeshadow[];
  summary: string;
  suggestions: string[];
}

/** 计算两个字符串的简单相似度（基于包含关系 + 公共子串） */
function stringSimilarity(a: string, b: string): number {
  const la = a.trim().toLowerCase();
  const lb = b.trim().toLowerCase();
  if (la === lb) return 1;
  if (la.includes(lb) || lb.includes(la)) return 0.85;
  // 简单 Jaccard 字符集相似度
  const setA = new Set(la.replace(/\s+/g, ''));
  const setB = new Set(lb.replace(/\s+/g, ''));
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

/**
 * 对 AI 分析结果进行智能对比，标记每项的状态：
 * - 'new': 完全不存在，可以安全新增
 * - 'update': 与已有数据匹配，建议更新
 * - 'duplicate': 与其他提取项重复，建议跳过
 */
export function matchAnalysisWithExisting(
  result: AnalysisResult,
  existingChars: { name: string; id: string }[],
  existingSettings: { name: string; id: string }[],
  existingForeshadows: { content: string; id: string }[]
): MatchableAnalysisResult {
  const charNameMap = new Map(existingChars.map((c) => [c.name.trim().toLowerCase(), c]));
  const settingNameMap = new Map(existingSettings.map((s) => [s.name.trim().toLowerCase(), s]));
  const foreshadowContentMap = new Map(existingForeshadows.map((f) => [f.content.trim().toLowerCase(), f]));

  // 角色匹配 + 去重
  const matchChars: MatchableCharacter[] = [];
  const seenCharNames = new Map<string, number>(); // name → 第一次出现的 index

  result.characters.forEach((c, i) => {
    const key = c.name.trim().toLowerCase();
    const existing = charNameMap.get(key);
    let status: MatchStatus = 'new';
    let duplicateOf: string | undefined;
    let existingName: string | undefined;
    let existingId: string | undefined;

    if (existing) {
      status = 'update';
      existingName = existing.name;
      existingId = existing.id;
    } else if (seenCharNames.has(key)) {
      status = 'duplicate';
      duplicateOf = `与第 ${seenCharNames.get(key)! + 1} 项重复`;
    } else {
      // 检查是否与已有角色高度相似（名称包含关系）
      for (const [ekey, echar] of charNameMap) {
        if (stringSimilarity(key, ekey) > 0.7 && !existingChars.some((ec) => ec.name.trim().toLowerCase() === key)) {
          status = 'update';
          existingName = echar.name;
          existingId = echar.id;
          break;
        }
      }
      // 检查是否与前面提取的角色高度相似
      if (status === 'new') {
        for (let j = 0; j < i; j++) {
          const prevKey = result.characters[j].name.trim().toLowerCase();
          if (prevKey !== key && stringSimilarity(key, prevKey) > 0.7) {
            status = 'duplicate';
            duplicateOf = `与「${result.characters[j].name}」高度相似`;
            break;
          }
        }
      }
    }

    if (!seenCharNames.has(key)) seenCharNames.set(key, i);

    matchChars.push({
      ...c,
      _matchStatus: status,
      _existingName: existingName,
      _existingId: existingId,
      _duplicateOf: duplicateOf,
      _selected: status !== 'duplicate', // 重复项默认不选中
    });
  });

  // 世界观设定匹配 + 去重
  const matchSettings: MatchableWorldSetting[] = [];
  const seenSettingNames = new Map<string, number>();

  result.worldSettings.forEach((w, i) => {
    const key = w.name.trim().toLowerCase();
    const existing = settingNameMap.get(key);
    let status: MatchStatus = 'new';
    let duplicateOf: string | undefined;
    let existingName: string | undefined;
    let existingId: string | undefined;

    if (existing) {
      status = 'update';
      existingName = existing.name;
      existingId = existing.id;
    } else if (seenSettingNames.has(key)) {
      status = 'duplicate';
      duplicateOf = `与第 ${seenSettingNames.get(key)! + 1} 项重复`;
    } else {
      for (const [ekey, es] of settingNameMap) {
        if (stringSimilarity(key, ekey) > 0.7) {
          status = 'update';
          existingName = es.name;
          existingId = es.id;
          break;
        }
      }
      if (status === 'new') {
        for (let j = 0; j < i; j++) {
          const prevKey = result.worldSettings[j].name.trim().toLowerCase();
          if (prevKey !== key && stringSimilarity(key, prevKey) > 0.7) {
            status = 'duplicate';
            duplicateOf = `与「${result.worldSettings[j].name}」高度相似`;
            break;
          }
        }
      }
    }

    if (!seenSettingNames.has(key)) seenSettingNames.set(key, i);

    matchSettings.push({
      ...w,
      _matchStatus: status,
      _existingName: existingName,
      _existingId: existingId,
      _duplicateOf: duplicateOf,
      _selected: status !== 'duplicate',
    });
  });

  // 伏笔匹配 + 去重
  const matchForeshadows: MatchableForeshadow[] = [];
  const seenFShadowContents = new Map<string, number>();

  result.foreshadows.forEach((f, i) => {
    const key = f.content.trim().toLowerCase();
    const existing = foreshadowContentMap.get(key);
    let status: MatchStatus = 'new';
    let existingContent: string | undefined;
    let existingId: string | undefined;

    if (existing) {
      status = 'update';
      existingContent = existing.content;
      existingId = existing.id;
    } else if (seenFShadowContents.has(key)) {
      status = 'duplicate';
    } else {
      for (const [ekey, ef] of foreshadowContentMap) {
        if (stringSimilarity(key, ekey) > 0.7) {
          status = 'update';
          existingContent = ef.content;
          existingId = ef.id;
          break;
        }
      }
      if (status === 'new') {
        for (let j = 0; j < i; j++) {
          const prevKey = result.foreshadows[j].content.trim().toLowerCase();
          if (prevKey !== key && stringSimilarity(key, prevKey) > 0.7) {
            status = 'duplicate';
            break;
          }
        }
      }
    }

    if (!seenFShadowContents.has(key)) seenFShadowContents.set(key, i);

    matchForeshadows.push({
      ...f,
      _matchStatus: status,
      _existingContent: existingContent,
      _existingId: existingId,
      _selected: status !== 'duplicate',
    });
  });

  return {
    characters: matchChars,
    worldSettings: matchSettings,
    foreshadows: matchForeshadows,
    summary: result.summary,
    suggestions: result.suggestions,
  };
}

/**
 * 应用选中的分析结果到数据库
 */
export async function applySelectedResults(
  projectId: string,
  matchResult: MatchableAnalysisResult
): Promise<ApplyResult> {
  const stats: ApplyResult = {
    charactersAdded: 0,
    charactersUpdated: 0,
    characterRelationsAdded: 0,
    worldSettingsAdded: 0,
    worldSettingsUpdated: 0,
    worldSettingRelationsAdded: 0,
    foreshadowsAdded: 0,
  };

  const [existingChars, existingSettings, existingForeshadows] = await Promise.all([
    db.characters.getByProject(projectId),
    db.worldSettings.getByProject(projectId),
    db.foreshadows.getByProject(projectId),
  ]);

  const charNameMap = new Map(existingChars.map((c) => [c.name.trim().toLowerCase(), c]));
  const settingNameMap = new Map(existingSettings.map((s) => [s.name.trim().toLowerCase(), s]));
  const updatedChars = new Map<string, Character>();

  // 角色
  for (const mc of matchResult.characters) {
    if (!mc._selected) continue;
    const key = mc.name.trim().toLowerCase();
    const existing = mc._existingId
      ? existingChars.find((c) => c.id === mc._existingId)
      : charNameMap.get(key);

    if (existing && mc._matchStatus === 'update') {
      const updated: Character = {
        ...existing,
        race: existing.race || mc.race || existing.race,
        age: existing.age || mc.age || existing.age,
        appearance: existing.appearance || mc.appearance || existing.appearance,
        personality: existing.personality || mc.personality || existing.personality,
        description: existing.description || mc.description || existing.description,
        status: mc.status || existing.status,
        currentLocation: existing.currentLocation || mc.currentLocation || existing.currentLocation,
      };
      if (mc.resources?.length) {
        const existingResNames = new Set(existing.resources.map((r) => r.name.trim().toLowerCase()));
        const newResources = mc.resources
          .filter((r) => !existingResNames.has(r.name.trim().toLowerCase()))
          .map((r): Resource => ({
            id: generateId(),
            name: r.name,
            type: r.type as Resource['type'] || '其他',
            description: r.description,
            status: (r.status as Resource['status']) || '已获得',
          }));
        if (newResources.length > 0) updated.resources = [...existing.resources, ...newResources];
      }
      await db.characters.update(updated);
      updatedChars.set(key, updated);
      stats.charactersUpdated++;
    } else if (mc._matchStatus !== 'duplicate') {
      const newChar: Character = {
        id: generateId(), projectId, name: mc.name,
        aliases: mc.aliases, race: mc.race, age: mc.age,
        appearance: mc.appearance, personality: mc.personality,
        description: mc.description || '', status: mc.status || 'alive',
        currentLocation: mc.currentLocation,
        relations: [],
        resources: (mc.resources || []).map((r): Resource => ({
          id: generateId(), name: r.name,
          type: r.type as Resource['type'] || '其他',
          description: r.description,
          status: (r.status as Resource['status']) || '已获得',
        })),
        appearances: [],
      };
      await db.characters.add(newChar);
      charNameMap.set(key, newChar);
      updatedChars.set(key, newChar);
      stats.charactersAdded++;
    }
  }

  // 角色关系
  for (const mc of matchResult.characters) {
    if (!mc._selected || !mc.relations?.length) continue;
    const charKey = mc.name.trim().toLowerCase();
    const char = updatedChars.get(charKey) || charNameMap.get(charKey);
    if (!char) continue;
    for (const er of mc.relations) {
      const target = charNameMap.get(er.targetName.trim().toLowerCase());
      if (!target || target.id === char.id) continue;
      if (char.relations.some((r) => r.targetId === target.id && r.type === er.type)) continue;
      char.relations.push({ targetId: target.id, type: er.type, direction: er.direction || '双向', description: er.description || '', isPublic: er.isPublic !== false });
      stats.characterRelationsAdded++;
    }
    if (mc.relations.length > 0) await db.characters.update(char);
  }

  // 世界观
  const updatedSettings = new Map<string, WorldSetting>();
  for (const mw of matchResult.worldSettings) {
    if (!mw._selected) continue;
    const key = mw.name.trim().toLowerCase();
    const existing = mw._existingId
      ? existingSettings.find((s) => s.id === mw._existingId)
      : settingNameMap.get(key);

    let parentId: string | undefined;
    if (mw.parentName) {
      const pk = mw.parentName.trim().toLowerCase();
      parentId = settingNameMap.get(pk)?.id;
    }

    if (existing && mw._matchStatus === 'update') {
      const updated: WorldSetting = { ...existing, type: existing.type !== 'custom' ? existing.type : mw.type, description: existing.description || mw.description || existing.description, parentId: existing.parentId || parentId };
      await db.worldSettings.update(updated);
      updatedSettings.set(key, updated);
      stats.worldSettingsUpdated++;
    } else if (mw._matchStatus !== 'duplicate') {
      const ns: WorldSetting = { id: generateId(), projectId, name: mw.name, type: mw.type, description: mw.description, parentId, relations: [] };
      await db.worldSettings.add(ns);
      settingNameMap.set(key, ns);
      updatedSettings.set(key, ns);
      stats.worldSettingsAdded++;
    }
  }

  // 世界观关系
  for (const mw of matchResult.worldSettings) {
    if (!mw._selected || !mw.relations?.length) continue;
    const key = mw.name.trim().toLowerCase();
    const setting = updatedSettings.get(key) || settingNameMap.get(key);
    if (!setting) continue;
    for (const er of mw.relations) {
      const target = settingNameMap.get(er.targetName.trim().toLowerCase());
      if (!target || target.id === setting.id) continue;
      if (setting.relations.some((r) => r.targetId === target.id && r.type === er.type)) continue;
      setting.relations.push({ targetId: target.id, type: er.type });
      stats.worldSettingRelationsAdded++;
    }
    if (mw.relations.length > 0) await db.worldSettings.update(setting);
  }

  // 伏笔（角色已全部处理完毕，此时可以解析 relatedCharacters 中的角色名 → ID）
  const existingFShadowContents = new Set(existingForeshadows.map((f) => f.content.trim().toLowerCase()));
  for (const mf of matchResult.foreshadows) {
    if (!mf._selected) continue;
    const key = mf.content.trim().toLowerCase();
    if (!existingFShadowContents.has(key)) {
      // 自动解析关联角色名 → ID
      const resolvedCharIds: string[] = [];
      if (mf.relatedCharacters?.length) {
        for (const rcName of mf.relatedCharacters) {
          const rcKey = rcName.trim().toLowerCase();
          const rc = charNameMap.get(rcKey);
          if (rc) resolvedCharIds.push(rc.id);
        }
      }
      await db.foreshadows.add({
        id: generateId(),
        projectId,
        content: mf.content,
        firstAppearance: '',
        status: 'pending',
        relatedCharacters: resolvedCharIds,
        notes: `AI 分析置信度：${mf.confidence}`,
      });
      stats.foreshadowsAdded++;
    }
  }

  return stats;
}

// ========== 创作建议 ==========

export async function getWritingSuggestions(context: {
  chapterContent?: string;
  chapterTitle?: string;
  currentCharacters?: string[];
  currentForeshadows?: string[];
  projectGenre?: string;
}): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `你是一位资深小说编辑和创作顾问。根据提供的上下文，给出具体的创作建议。用中文回复，简洁实用。`,
    },
    {
      role: 'user',
      content: `请根据以下信息给出创作建议：
${context.projectGenre ? `作品类型：${context.projectGenre}` : ''}
${context.chapterTitle ? `当前章节：${context.chapterTitle}` : ''}
${context.currentCharacters?.length ? `已出场角色：${context.currentCharacters.join('、')}` : ''}
${context.currentForeshadows?.length ? `进行中的伏笔：${context.currentForeshadows.join('；')}` : ''}
${context.chapterContent ? `章节内容摘要：${context.chapterContent.slice(0, 2000)}` : ''}

请从以下角度给出建议：
1. 情节推进方向
2. 角色发展空间
3. 可以埋设的伏笔
4. 写作技巧提醒`,
    },
  ];

  return callLLM(messages, 0.7);
}

// ========== 文本智能分析 ==========

/**
 * 分析上传的小说文本，提取角色、世界观设定、伏笔等信息
 */
export async function analyzeNovelText(
  text: string,
  existingContext: {
    characters: { name: string; id: string }[];
    worldSettings: { name: string; id: string }[];
    foreshadows: { content: string; id: string }[];
  }
): Promise<AnalysisResult> {
  const existingCharsStr = existingContext.characters.length > 0
    ? `已有角色：${existingContext.characters.map((c) => c.name).join('、')}`
    : '暂无已有角色';
  const existingSettingsStr = existingContext.worldSettings.length > 0
    ? `已有世界观设定：${existingContext.worldSettings.map((s) => s.name).join('、')}`
    : '暂无已有设定';
  const existingForeshadowsStr = existingContext.foreshadows.length > 0
    ? `已有伏笔：${existingContext.foreshadows.map((f) => f.content).join('；')}`
    : '暂无已有伏笔';

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `你是一位专业的小说分析 AI。请仔细阅读用户提供的小说文本，提取以下信息并以 JSON 格式返回。

返回格式必须严格遵循以下 JSON Schema：
{
  "characters": [
    {
      "name": "角色名",
      "aliases": ["别名1"],
      "race": "种族",
      "age": "年龄描述",
      "appearance": "外貌描述",
      "personality": "性格描述",
      "description": "背景介绍",
      "status": "alive|dead|unknown|mentioned",
      "currentLocation": "当前所在地点",
      "arc": "角色弧光概述（根据文本推断角色的成长轨迹和转折点，50字以内。如果文本中信息不足，可留空字符串）",
      "resources": [{"name": "能力/物品名", "type": "能力|物品|代价|其他", "description": "描述", "status": "已获得|未获得|已消耗|进行中"}],
      "relations": [
        {
          "targetName": "另一个角色名",
          "type": "家人|朋友|恋人|敌人|对手|师徒|上下级|盟友|陌生人|其他",
          "direction": "单向|双向",
          "description": "关系简述",
          "isPublic": true
        }
      ]
    }
  ],
  "worldSettings": [
    {
      "name": "设定名称",
      "type": "location|race|item|concept|history|custom",
      "description": "详细描述",
      "parentName": "父级设定名称（可选）",
      "relations": [{"targetName": "关联设定名", "type": "位于|属于|对抗|包含|关联"}]
    }
  ],
  "foreshadows": [
    {
      "content": "伏笔内容描述",
      "relatedCharacters": ["关联角色名"],
      "confidence": "high|medium|low"
    }
  ],
  "summary": "对这段文本的简要总结（200字以内）",
  "suggestions": ["创作建议1", "创作建议2"]
}

重要规则：
- 只提取文本中明确存在或强烈暗示的信息，不要编造
- 如果某个角色在已有角色列表中，请使用已有角色的名字
- 角色 relations 中 targetName 必须是文本中出现的其他角色名
- 世界观 relations 中 targetName 必须是文本中出现的其他设定名
- **伏笔判断标准必须严格**：只有明确在文本中埋下、暗示未来事件的信息才算伏笔。单纯推进当前剧情的情节、日常对话、场景描写等不应标记为伏笔。confidence 仅「high」和「medium」两档——high=有明显铺垫+留有悬念，medium=对后续情节有轻微暗示。宁缺毋滥，不确定的不要添加。
- 伏笔的 relatedCharacters 必须填写真实出现在文本中的角色名
- 如果一个类别没有内容，返回空数组
- 请用中文回复`,
    },
    {
      role: 'user',
      content: `${existingCharsStr}\n${existingSettingsStr}\n${existingForeshadowsStr}\n\n---分析以下文本---\n${text.slice(0, 12000)}`,
    },
  ];

  const response = await callLLM(messages, 0.2);
  const jsonStr = extractJSON(response);
  const result = JSON.parse(jsonStr) as AnalysisResult;

  // 确保字段存在
  return {
    characters: result.characters || [],
    worldSettings: result.worldSettings || [],
    foreshadows: result.foreshadows || [],
    summary: result.summary || '',
    suggestions: result.suggestions || [],
  };
}

// ========== 应用分析结果到数据库 ==========

export interface ApplyResult {
  charactersAdded: number;
  charactersUpdated: number;
  characterRelationsAdded: number;
  worldSettingsAdded: number;
  worldSettingsUpdated: number;
  worldSettingRelationsAdded: number;
  foreshadowsAdded: number;
}

/**
 * 将 AI 分析结果应用到数据库
 * 智能匹配已有数据（按名称），存在则更新，不存在则新增
 */
export async function applyAnalysisResult(
  projectId: string,
  result: AnalysisResult
): Promise<ApplyResult> {
  const stats: ApplyResult = {
    charactersAdded: 0,
    charactersUpdated: 0,
    characterRelationsAdded: 0,
    worldSettingsAdded: 0,
    worldSettingsUpdated: 0,
    worldSettingRelationsAdded: 0,
    foreshadowsAdded: 0,
  };

  const [existingChars, existingSettings, existingForeshadows] = await Promise.all([
    db.characters.getByProject(projectId),
    db.worldSettings.getByProject(projectId),
    db.foreshadows.getByProject(projectId),
  ]);

  // === 处理角色 ===
  const charNameMap = new Map(existingChars.map((c) => [c.name.trim().toLowerCase(), c]));

  // 第一遍：创建/更新角色基本信息（不处理 relations，等所有角色就位后再处理）
  const updatedChars = new Map<string, Character>();

  for (const ec of result.characters) {
    const key = ec.name.trim().toLowerCase();
    const existing = charNameMap.get(key);

    if (existing) {
      const updated: Character = {
        ...existing,
        race: existing.race || ec.race || existing.race,
        age: existing.age || ec.age || existing.age,
        appearance: existing.appearance || ec.appearance || existing.appearance,
        personality: existing.personality || ec.personality || existing.personality,
        description: existing.description || ec.description || existing.description,
        status: ec.status || existing.status,
        currentLocation: existing.currentLocation || ec.currentLocation || existing.currentLocation,
        arc: existing.arc || ec.arc || existing.arc,
      };
      if (ec.resources?.length) {
        const existingResNames = new Set(existing.resources.map((r) => r.name));
        const newResources = ec.resources
          .filter((r) => !existingResNames.has(r.name))
          .map((r): Resource => ({
            id: generateId(),
            name: r.name,
            type: r.type as Resource['type'] || '其他',
            description: r.description,
            status: (r.status as Resource['status']) || '已获得',
          }));
        if (newResources.length > 0) {
          updated.resources = [...existing.resources, ...newResources];
        }
      }
      await db.characters.update(updated);
      updatedChars.set(key, updated);
      stats.charactersUpdated++;
    } else {
      const newChar: Character = {
        id: generateId(),
        projectId,
        name: ec.name,
        aliases: ec.aliases,
        race: ec.race,
        age: ec.age,
        appearance: ec.appearance,
        personality: ec.personality,
        description: ec.description || '',
        status: ec.status || 'alive',
        currentLocation: ec.currentLocation,
        arc: ec.arc,
        relations: [],
        resources: (ec.resources || []).map((r): Resource => ({
          id: generateId(),
          name: r.name,
          type: r.type as Resource['type'] || '其他',
          description: r.description,
          status: (r.status as Resource['status']) || '已获得',
        })),
        appearances: [],
      };
      await db.characters.add(newChar);
      charNameMap.set(key, newChar);
      updatedChars.set(key, newChar);
      stats.charactersAdded++;
    }
  }

  // 第二遍：处理角色关系（所有角色 ID 都已确定）
  for (const ec of result.characters) {
    if (!ec.relations?.length) continue;
    const charKey = ec.name.trim().toLowerCase();
    const char = updatedChars.get(charKey) || charNameMap.get(charKey);
    if (!char) continue;

    const existingTargetIds = new Set(char.relations.map((r) => r.targetId));
    const newRelations: Relation[] = [];

    for (const er of ec.relations) {
      const targetKey = er.targetName.trim().toLowerCase();
      const target = charNameMap.get(targetKey);
      if (!target || target.id === char.id) continue;
      // 避免重复添加同类型关系
      const alreadyExists = char.relations.some(
        (r) => r.targetId === target.id && r.type === er.type
      );
      if (alreadyExists) continue;
      newRelations.push({
        targetId: target.id,
        type: er.type || '其他',
        direction: er.direction || '双向',
        description: er.description || '',
        isPublic: er.isPublic !== false,
      });
    }

    if (newRelations.length > 0) {
      char.relations = [...char.relations, ...newRelations];
      await db.characters.update(char);
      stats.characterRelationsAdded += newRelations.length;
    }
  }

  // === 处理世界观设定 ===
  const settingNameMap = new Map(existingSettings.map((s) => [s.name.trim().toLowerCase(), s]));
  const updatedSettings = new Map<string, WorldSetting>();

  for (const es of result.worldSettings) {
    const key = es.name.trim().toLowerCase();
    const existing = settingNameMap.get(key);

    let parentId: string | undefined;
    if (es.parentName) {
      const parentKey = es.parentName.trim().toLowerCase();
      const parentExisting = settingNameMap.get(parentKey);
      if (parentExisting) parentId = parentExisting.id;
    }

    if (existing) {
      const updated: WorldSetting = {
        ...existing,
        type: existing.type !== 'custom' ? existing.type : es.type,
        description: existing.description || es.description || existing.description,
        parentId: existing.parentId || parentId,
      };
      await db.worldSettings.update(updated);
      updatedSettings.set(key, updated);
      stats.worldSettingsUpdated++;
    } else {
      const newSetting: WorldSetting = {
        id: generateId(),
        projectId,
        name: es.name,
        type: es.type,
        description: es.description,
        parentId,
        relations: [],
      };
      await db.worldSettings.add(newSetting);
      settingNameMap.set(key, newSetting);
      updatedSettings.set(key, newSetting);
      stats.worldSettingsAdded++;
    }
  }

  // 第二遍：处理世界观关系
  for (const es of result.worldSettings) {
    if (!es.relations?.length) continue;
    const key = es.name.trim().toLowerCase();
    const setting = updatedSettings.get(key) || settingNameMap.get(key);
    if (!setting) continue;

    for (const er of es.relations) {
      const targetKey = er.targetName.trim().toLowerCase();
      const target = settingNameMap.get(targetKey);
      if (!target || target.id === setting.id) continue;
      const alreadyExists = setting.relations.some(
        (r) => r.targetId === target.id && r.type === er.type
      );
      if (alreadyExists) continue;
      setting.relations.push({ targetId: target.id, type: er.type });
      stats.worldSettingRelationsAdded++;
    }

    if (es.relations.length > 0) {
      await db.worldSettings.update(setting);
    }
  }

  // === 处理伏笔 ===
  const existingFShadowContents = new Set(
    existingForeshadows.map((f) => f.content.trim().toLowerCase())
  );

  for (const ef of result.foreshadows) {
    const key = ef.content.trim().toLowerCase();
    if (!existingFShadowContents.has(key)) {
      const newForeshadow: Foreshadow = {
        id: generateId(),
        projectId,
        content: ef.content,
        firstAppearance: '',
        status: 'pending',
        relatedCharacters: [],
        notes: `AI 分析置信度：${ef.confidence}`,
      };
      await db.foreshadows.add(newForeshadow);
      stats.foreshadowsAdded++;
    }
  }

  return stats;
}

// ========== 角色弧光分析 ==========

export async function analyzeCharacterArc(
  character: { name: string; description: string; arc?: string },
  chapterSummaries: { title: string; summary: string }[]
): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `你是一位小说角色发展分析师。分析角色的成长轨迹，给出弧光建议。用中文回复。`,
    },
    {
      role: 'user',
      content: `角色名：${character.name}
角色背景：${character.description}
${character.arc ? `已有弧光：${character.arc}` : ''}

章节进度：
${chapterSummaries.map((c) => `- ${c.title}：${c.summary}`).join('\n')}

请分析：
1. 角色当前处于弧光的哪个阶段
2. 下一步发展建议
3. 需要补充的转折点`,
    },
  ];

  return callLLM(messages, 0.5);
}

// ========== 资源状态智能更新 ==========

export async function analyzeResourceUpdates(
  chapterContent: string,
  characterResources: { characterName: string; resources: { name: string; type: string; status: string; description: string }[] }[]
): Promise<{ characterName: string; resourceName: string; newStatus: string; reason: string }[]> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `你是一位小说资源追踪分析师。根据章节内容，判断角色的资源/能力状态是否发生变化。返回 JSON 数组。`,
    },
    {
      role: 'user',
      content: `当前角色资源状态：
${characterResources.map((c) =>
  `【${c.characterName}】\n${c.resources.map((r) => `  - ${r.name}（${r.type}）：${r.status} | ${r.description}`).join('\n')}`
).join('\n\n')}

章节内容：
${chapterContent.slice(0, 4000)}

请分析并返回 JSON 数组，只包含状态确实发生了变化的资源：
[{"characterName": "角色名", "resourceName": "资源名", "newStatus": "已获得|已消耗|进行中", "reason": "变化原因（简短）"}]`,
    },
  ];

  const response = await callLLM(messages, 0.1);
  const jsonStr = extractJSON(response);
  return JSON.parse(jsonStr) as { characterName: string; resourceName: string; newStatus: string; reason: string }[];
}

/** 应用资源状态更新到数据库 */
export async function applyResourceUpdates(
  projectId: string,
  updates: { characterName: string; resourceName: string; newStatus: string }[]
): Promise<number> {
  let count = 0;
  const characters = await db.characters.getByProject(projectId);

  for (const update of updates) {
    const char = characters.find(
      (c) => c.name.trim().toLowerCase() === update.characterName.trim().toLowerCase()
    );
    if (!char) continue;

    const resource = char.resources.find(
      (r) => r.name.trim().toLowerCase() === update.resourceName.trim().toLowerCase()
    );
    if (!resource || resource.status === update.newStatus) continue;

    const updatedChar: Character = {
      ...char,
      resources: char.resources.map((r) =>
        r.id === resource.id
          ? { ...r, status: update.newStatus as Resource['status'] }
          : r
      ),
    };
    await db.characters.update(updatedChar);
    count++;
  }

  return count;
}

// ========== V4.1 AI 章节续写 ==========

export interface ContinueChapterInput {
  projectName: string;
  lastChapterContent: string;    // 上一章内容
  lastChapterTitle: string;
  nextChapterOutline?: string;   // 下一章大纲
  characters: { name: string; description: string; voice?: string }[];
  activeForeshadows: { content: string }[];
  styleGuide?: string;           // 写作风格要求
}

export interface ContinueChapterResult {
  title: string;
  content: string;
  wordCount: number;
  reasoning: string;             // AI 的写作思路
}

export async function continueChapter(input: ContinueChapterInput): Promise<ContinueChapterResult> {
  const charInfo = input.characters.map((c) =>
    `- ${c.name}：${c.description.slice(0, 80)}${c.voice ? ` [语言风格：${c.voice}]` : ''}`
  ).join('\n');

  const foreshadowInfo = input.activeForeshadows.map((f) =>
    `- ${f.content.slice(0, 60)}`
  ).join('\n');

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `你是一位专业小说作家，擅长${input.styleGuide || '多种写作风格'}。根据上一章内容和设定，续写下一章。保持角色语言风格一致，推进伏笔发展。用中文写作。`,
    },
    {
      role: 'user',
      content: `作品：${input.projectName}

上一章「${input.lastChapterTitle}」内容：
${input.lastChapterContent.slice(0, 3000)}

角色设定：
${charInfo}

进行中的伏笔：
${foreshadowInfo || '无'}
${input.nextChapterOutline ? `\n下一章大纲：\n${input.nextChapterOutline}` : ''}
${input.styleGuide ? `\n写作风格要求：${input.styleGuide}` : ''}

请续写下一章，返回 JSON 格式：
{"title": "章节标题", "content": "正文内容（Markdown格式）", "wordCount": 数字, "reasoning": "写作思路说明（简短）"}

要求：
1. 保持与前文一致的角色性格和语言风格
2. 自然推进至少一个伏笔
3. 章节字数控制在 2000-4000 字
4. 正文使用 Markdown 格式，段落间空行分隔`,
    },
  ];

  const response = await callLLM(messages, 0.7);
  const jsonStr = extractJSON(response);
  return JSON.parse(jsonStr) as ContinueChapterResult;
}

// ========== V4.2 AI 一致性检查 ==========

export interface ConsistencyIssue {
  type: 'character' | 'timeline' | 'resource' | 'foreshadow' | 'setting';
  severity: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  location: string;            // 出问题的章节/位置
  suggestion: string;          // 修复建议
}

export interface ConsistencyReport {
  issues: ConsistencyIssue[];
  summary: string;
  score: number;               // 一致性评分 0-100
}

export async function checkConsistency(
  chapters: { number: number; title: string; summary: string; content?: string }[],
  characters: { name: string; status: string; description: string }[],
  foreshadows: { content: string; status: string }[],
  settings: { name: string; description: string }[]
): Promise<ConsistencyReport> {
  const chapterText = chapters.map((ch) =>
    `第${ch.number}章「${ch.title}」：${(ch.content || ch.summary || '').slice(0, 500)}`
  ).join('\n\n');

  const charText = characters.map((c) => `- ${c.name}（${c.status}）：${c.description.slice(0, 100)}`).join('\n');
  const fsText = foreshadows.map((f) => `- [${f.status}] ${f.content.slice(0, 80)}`).join('\n');
  const settingText = settings.map((s) => `- ${s.name}：${s.description.slice(0, 100)}`).join('\n');

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `你是一位小说编辑和设定一致性检查专家。扫描全文，检测设定矛盾、时间线冲突、资源状态不一致等问题。返回 JSON。`,
    },
    {
      role: 'user',
      content: `请检查以下小说的一致性：

章节内容：
${chapterText.slice(0, 5000)}

角色状态：
${charText.slice(0, 1500)}

伏笔状态：
${fsText.slice(0, 1000)}

世界观设定：
${settingText.slice(0, 1500)}

请返回 JSON 格式的一致性报告：
{
  "issues": [
    {
      "type": "character|timeline|resource|foreshadow|setting",
      "severity": "error|warning|info",
      "title": "问题简述",
      "description": "详细描述矛盾之处",
      "location": "出问题的章节",
      "suggestion": "修复建议"
    }
  ],
  "summary": "整体一致性评估总结（中文）",
  "score": 85
}

检查要点：
1. 角色状态矛盾（如已死亡角色再次出场）
2. 时间线冲突（事件先后顺序矛盾）
3. 资源状态矛盾（已消耗物品再次使用）
4. 伏笔状态异常（未回收的伏笔在后期未提及）
5. 世界观设定矛盾（同一定设前后描述不一致）`,
    },
  ];

  const response = await callLLM(messages, 0.2);
  const jsonStr = extractJSON(response);
  const result = JSON.parse(jsonStr);
  return {
    issues: result.issues || [],
    summary: result.summary || '',
    score: result.score || 0,
  };
}

// ========== V4.3 AI 世界观补全 ==========

export interface WorldCompletionSuggestion {
  type: 'gap' | 'relation' | 'detail';
  title: string;
  description: string;
  relatedSettings: string[];
  suggestion: string;
}

// ========== V4.x 大纲 AI 优化 ==========

export interface OutlineNodeInfo {
  title: string;
  type: string;
  notes?: string;
  children?: OutlineNodeInfo[];
}

export interface OutlineOptimizeInput {
  nodes: OutlineNodeInfo[];
  characters: { name: string; description: string }[];
  totalChapters: number;
}

export interface OutlineOptimizeResult {
  suggestions: string[];      // 优化建议列表
  optimizedOutline: string;   // 优化后的大纲（Markdown 格式）
}

export async function optimizeOutline(input: OutlineOptimizeInput): Promise<OutlineOptimizeResult> {
  const charInfo = input.characters.map((c) => `- ${c.name}：${c.description.slice(0, 60)}`).join('\n');

  const nodeInfo = JSON.stringify(input.nodes.map((n) => ({
    title: n.title, type: n.type, notes: n.notes || '',
    children: n.children?.map((c) => ({ title: c.title, type: c.type })),
  })), null, 2);

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `你是一位小说结构编辑，擅长优化故事大纲。分析大纲结构，给出优化建议。返回 JSON。`,
    },
    {
      role: 'user',
      content: `当前大纲结构（JSON）：${nodeInfo.slice(0, 4000)}

角色设定：
${charInfo.slice(0, 1000)}

当前总章节数：${input.totalChapters}

请分析并返回 JSON：
{
  "suggestions": ["优化建议1", "优化建议2", ...],
  "optimizedOutline": "优化后的大纲（Markdown格式，用层级标题表示卷/章/节/场景结构，每章附简要说明）"
}

优化要点：
1. 检查故事节奏是否合理（起承转合）
2. 建议增删合并章节
3. 检查角色出场频率和弧光分布
4. 伏笔埋设和回收时机建议`,
    },
  ];

  const response = await callLLM(messages, 0.5);
  const jsonStr = extractJSON(response);
  const result = JSON.parse(jsonStr);
  return {
    suggestions: result.suggestions || [],
    optimizedOutline: result.optimizedOutline || '',
  };
}

// ========== V4.x AI 标签生成 ==========

export async function generateTags(
  context: {
    characters: { name: string; description: string }[];
    chapters: { title: string; summary?: string }[];
    settings: { name: string; description: string }[];
    foreshadows: { content: string }[];
  }
): Promise<{ name: string; color: string; description: string }[]> {
  const charInfo = context.characters.map((c) => `${c.name}：${c.description.slice(0, 50)}`).join('|');
  const chInfo = context.chapters.map((c) => `${c.title}`).join('|');
  const setInfo = context.settings.map((s) => `${s.name}`).join('|');
  const fsInfo = context.foreshadows.map((f) => f.content.slice(0, 30)).join('|');

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `你是一位小说分类专家。根据作品内容生成标签（类型、风格、主题等标签）。返回 JSON 数组。`,
    },
    {
      role: 'user',
      content: `角色：${charInfo.slice(0, 1000)}
章节：${chInfo.slice(0, 500)}
设定：${setInfo.slice(0, 500)}
伏笔：${fsInfo.slice(0, 500)}

请为这部作品生成 5-10 个标签，返回 JSON 数组：
[
  {"name": "标签名", "color": "#c9a96e", "description": "简短说明"}
]

标签类型建议：故事类型（玄幻/都市/科幻...）、风格（热血/轻松/悬疑...）、主题（复仇/成长/爱情...）、元素（系统流/穿越/重生...）
颜色从以下选： #c9a96e #5a9e6f #6b8cc9 #c44b4b #c99e4b #9b6ec9 #5ea4a4 #c97e6b`,
    },
  ];

  const response = await callLLM(messages, 0.4);
  const jsonStr = extractJSON(response);
  return JSON.parse(jsonStr);
}

export interface WorldCompletionResult {
  suggestions: WorldCompletionSuggestion[];
  summary: string;
}

export async function completeWorldSettings(
  settings: { name: string; type: string; description: string; parentName?: string }[]
): Promise<WorldCompletionResult> {
  const settingText = settings.map((s) =>
    `- [${s.type}] ${s.name}${s.parentName ? `（属于：${s.parentName}）` : ''}：${s.description.slice(0, 120)}`
  ).join('\n');

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `你是一位世界观构建专家。根据已有的世界观设定，检测逻辑空白、建议关联关系和补充细节。返回 JSON。`,
    },
    {
      role: 'user',
      content: `已有世界观设定：
${settingText.slice(0, 5000)}

请分析并返回 JSON：
{
  "suggestions": [
    {
      "type": "gap|relation|detail",
      "title": "建议标题",
      "description": "详细说明",
      "relatedSettings": ["相关设定名1", "相关设定名2"],
      "suggestion": "具体补全建议"
    }
  ],
  "summary": "整体补全建议总结（中文）"
}

检查要点：
1. gap - 逻辑空白（如只有"王国"没有"城市"，只有"宗教"没有"神祇"）
2. relation - 应建立关联但未关联的设定
3. detail - 需要补充细节的设定`,
    },
  ];

  const response = await callLLM(messages, 0.4);
  const jsonStr = extractJSON(response);
  const result = JSON.parse(jsonStr);
  return {
    suggestions: result.suggestions || [],
    summary: result.summary || '',
  };
}

// ========== V4.4 版本历史（本地实现，不依赖 AI） ==========

export interface DataSnapshot {
  id: string;
  projectId: string;
  timestamp: string;
  label: string;
  data: {
    characters: Character[];
    chapters: Chapter[];
    foreshadows: Foreshadow[];
    worldSettings: WorldSetting[];
  };
}

const SNAPSHOT_PREFIX = 'inakb_snapshot_';

/** 创建数据快照 */
export async function createSnapshot(projectId: string, label?: string): Promise<DataSnapshot> {
  const characters = await db.characters.getByProject(projectId);
  const chapters = await db.chapters.getByProject(projectId);
  const foreshadows = await db.foreshadows.getByProject(projectId);
  const worldSettings = await db.worldSettings.getByProject(projectId);

  const snapshot: DataSnapshot = {
    id: generateId(),
    projectId,
    timestamp: new Date().toISOString(),
    label: label || `快照 ${new Date().toLocaleString('zh-CN')}`,
    data: { characters, chapters, foreshadows, worldSettings },
  };

  const snapshots = getSnapshots(projectId);
  snapshots.push(snapshot);
  // 只保留最近 50 个快照
  if (snapshots.length > 50) snapshots.shift();
  localStorage.setItem(`${SNAPSHOT_PREFIX}${projectId}`, JSON.stringify(snapshots));

  return snapshot;
}

/** 获取所有快照 */
export function getSnapshots(projectId: string): DataSnapshot[] {
  try {
    const raw = localStorage.getItem(`${SNAPSHOT_PREFIX}${projectId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** 删除快照 */
export function deleteSnapshot(projectId: string, snapshotId: string): void {
  const snapshots = getSnapshots(projectId).filter((s) => s.id !== snapshotId);
  localStorage.setItem(`${SNAPSHOT_PREFIX}${projectId}`, JSON.stringify(snapshots));
}

/** 从快照恢复数据 */
export async function restoreSnapshot(snapshot: DataSnapshot): Promise<void> {
  const { projectId, data } = snapshot;
  // 清空旧数据
  await db.characters.deleteByProject(projectId);
  await db.chapters.deleteByProject(projectId);
  await db.foreshadows.deleteByProject(projectId);
  await db.worldSettings.deleteByProject(projectId);
  // 写入快照数据
  if (data.characters.length > 0) await db.characters.addMany(data.characters);
  if (data.chapters.length > 0) await db.chapters.addMany(data.chapters);
  if (data.foreshadows.length > 0) await db.foreshadows.addMany(data.foreshadows);
  if (data.worldSettings.length > 0) await db.worldSettings.addMany(data.worldSettings);
}

/** 对比两个快照的差异 */
export function diffSnapshots(a: DataSnapshot, b: DataSnapshot): string {
  const lines: string[] = [];
  lines.push(`# 快照对比`);
  lines.push(`## A: ${a.label}（${new Date(a.timestamp).toLocaleString('zh-CN')}）`);
  lines.push(`## B: ${b.label}（${new Date(b.timestamp).toLocaleString('zh-CN')}）`);
  lines.push('');

  const diffCount = (label: string, oldArr: { id: string }[], newArr: { id: string }[]) => {
    const oldIds = new Set(oldArr.map((x) => x.id));
    const newIds = new Set(newArr.map((x) => x.id));
    const added = newArr.filter((x) => !oldIds.has(x.id)).length;
    const removed = oldArr.filter((x) => !newIds.has(x.id)).length;
    if (added > 0 || removed > 0) {
      lines.push(`- ${label}：+${added} / -${removed}`);
    }
  };

  diffCount('角色', a.data.characters, b.data.characters);
  diffCount('章节', a.data.chapters, b.data.chapters);
  diffCount('伏笔', a.data.foreshadows, b.data.foreshadows);
  diffCount('世界观设定', a.data.worldSettings, b.data.worldSettings);

  return lines.join('\n');
}
