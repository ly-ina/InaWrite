/**
 * AI 写作助手服务层
 * 封装 LLM 调用，提供创作建议、文本分析、智能提取等功能
 * 支持 OpenAI 兼容 API（可切换为本地模型或其他服务商）
 */

import type { Character, Chapter, Foreshadow, WorldSetting, Resource } from '../types';
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
- 伏笔 confidence：high=明确埋设，medium=可能是伏笔，low=仅是暗示
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
