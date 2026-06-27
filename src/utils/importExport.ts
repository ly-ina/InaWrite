/**
 * JSON 导入导出工具函数
 * 支持将完整项目数据导出为 JSON 文件，以及导入 JSON 文件合并到当前项目
 */

import type { ProjectExport, Project, Character, Chapter, Foreshadow, WorldSetting } from '../types';
import { db } from '../db/database';

/**
 * 导出项目数据为 JSON 字符串
 * @param project - 项目基本信息
 * @returns JSON 字符串
 */
export async function exportProject(project: Project): Promise<string> {
  const [characters, chapters, foreshadows, worldSettings, outlines] = await Promise.all([
    db.characters.getByProject(project.id),
    db.chapters.getByProject(project.id),
    db.foreshadows.getByProject(project.id),
    db.worldSettings.getByProject(project.id),
    db.outlines.getByProject(project.id),
  ]);

  const exportData: ProjectExport = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    project,
    characters,
    chapters,
    foreshadows,
    worldSettings,
    outlines,
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * 下载 JSON 文件到本地
 * @param content - 文件内容
 * @param filename - 文件名
 */
export function downloadJSON(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 去除 JSON 中的单行注释（//），使其可被 JSON.parse 正确解析
 * 处理注释在行尾和独占一行两种情况
 */
function stripJSONComments(json: string): string {
  return json
    .split('\n')
    .map((line) => {
      // 找到第一个不在字符串内的 //
      let inString = false;
      let stringChar = '';
      for (let i = 0; i < line.length - 1; i++) {
        const ch = line[i];
        if (!inString && (ch === '"' || ch === "'")) {
          inString = true;
          stringChar = ch;
        } else if (inString && ch === stringChar && line[i - 1] !== '\\') {
          inString = false;
        } else if (!inString && ch === '/' && line[i + 1] === '/') {
          return line.slice(0, i).trimEnd();
        }
      }
      return line;
    })
    .join('\n');
}

/**
 * 根据数组内容自动推断属于哪种模板类型
 * 通过检测数组元素中特有的字段来判断
 */
function inferTemplateType(arr: Record<string, unknown>[]): string {
  if (arr.length === 0) return 'unknown';
  return inferSingleType(arr[0]);
}

/** 根据单个对象的字段推断类型 */
function inferSingleType(item: Record<string, unknown>): string {
  // 大纲：有 sortOrder + (type 是 volume/chapter/section/scene)
  if ('sortOrder' in item && typeof item.type === 'string' && ['volume', 'chapter', 'section', 'scene'].includes(item.type as string)) return 'outline';
  // 章节模板：有 number / wordCount 字段（最明确，先判断）
  if ('number' in item || 'wordCount' in item) return 'chapter';
  // 伏笔模板：有 firstAppearance / expectedResolution 字段
  if ('firstAppearance' in item || 'expectedResolution' in item) return 'foreshadow';
  // 世界观设定：有 parentId 字段（且没有角色的 race/voice/secret 等字段）
  if ('parentId' in item && !('race' in item) && !('voice' in item)) return 'worldSetting';
  // 角色模板：有 race / voice / secret / arc / appearances / relations 字段
  if ('race' in item || 'voice' in item || 'secret' in item || 'arc' in item || 'appearances' in item) return 'character';
  // 回退：有 relations 且无 parentId → 角色；有 parentId → 世界观
  if ('relations' in item) return 'character';
  return 'unknown';
}

/** 将单个实体或数组包装为 ProjectExport */
function wrapAsProjectExport(parsed: unknown): ProjectExport {
  const arr = Array.isArray(parsed) ? parsed as Record<string, unknown>[] : [parsed as Record<string, unknown>];
  const type = inferTemplateType(arr);
  return {
    version: 'template',
    exportedAt: new Date().toISOString(),
    project: { id: '<自动填充>', name: '模板导入', description: '', createdAt: '', updatedAt: '' },
    characters: type === 'character' ? arr as unknown as Character[] : [],
    chapters: type === 'chapter' ? arr as unknown as Chapter[] : [],
    foreshadows: type === 'foreshadow' ? arr as unknown as Foreshadow[] : [],
    worldSettings: type === 'worldSetting' ? arr as unknown as WorldSetting[] : [],
    outlines: type === 'outline' ? arr as unknown as import('../types').OutlineNode[] : [],
  };
}

/** 判断一个对象是否是 ProjectExport 格式（有 project 顶层字段） */
function isProjectExport(obj: Record<string, unknown>): boolean {
  return 'project' in obj && typeof obj.project === 'object' && obj.project !== null;
}

/**
 * 从文件读取 JSON 内容，自动兼容带注释的模板文件
 * 支持三种格式：
 *   1. ProjectExport 格式（完整导出）：{ version, project, characters, chapters, ... }
 *   2. 纯数组格式（模块模板）：[{ name, ... }, ...]
 *   3. 纯对象格式（单个实体）：{ id, name, race, ... }
 * @param file - 用户选择的文件
 * @returns 统一包装为 ProjectExport 格式
 */
export function readJSONFile(file: File): Promise<ProjectExport> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let rawText = e.target?.result as string;
        // 预处理：去除 // 注释，使模板文件也能被解析
        rawText = stripJSONComments(rawText);
        const parsed = JSON.parse(rawText);

        let data: ProjectExport;

        if (isProjectExport(parsed as Record<string, unknown>)) {
          // 格式1: 完整 ProjectExport
          data = parsed as ProjectExport;
        } else {
          // 格式2/3: 数组或单个实体 → 自动包装
          data = wrapAsProjectExport(parsed);
        }

        // 如果 project.id 是占位符，允许通过（模板导入场景）
        const isTemplateImport = data.project.id === '<自动填充>' || data.project.id === '<自动生成>';

        // 完整导出校验：非模板文件必须有 version 和有效的 project.id
        if (!isTemplateImport && (!data.version || !data.project.id)) {
          reject(new Error('无效的导出文件格式：缺少 version 或 project.id'));
          return;
        }

        resolve(data);
      } catch (err) {
        if (err instanceof SyntaxError) {
          reject(new Error('JSON 解析失败，请检查文件格式是否正确'));
        } else {
          reject(err);
        }
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}

/**
 * 导入数据冲突检测结果
 */
export interface ImportConflict {
  type: 'character' | 'chapter' | 'foreshadow' | 'worldSetting';
  existingId: string;
  existingName?: string;  // 同名匹配时显示已有名称
  newItem: Character | Chapter | Foreshadow | WorldSetting;
  matchType: 'id' | 'name';  // 按什么匹配到的
}

/**
 * 检测导入数据与现有数据的冲突
 * 支持 ID 匹配和 name 匹配两种模式
 * @param projectId - 目标项目 ID
 * @param importData - 要导入的数据
 * @returns 冲突列表
 */
export async function detectConflicts(
  projectId: string,
  importData: ProjectExport
): Promise<ImportConflict[]> {
  const conflicts: ImportConflict[] = [];

  // 检测角色冲突（ID + name）
  const existingChars = await db.characters.getByProject(projectId);
  const existingCharIds = new Set(existingChars.map((c) => c.id));
  const existingCharNames = new Map(
    existingChars.map((c) => [c.name.trim().toLowerCase(), c])
  );
  for (const char of importData.characters) {
    if (existingCharIds.has(char.id)) {
      conflicts.push({ type: 'character', existingId: char.id, existingName: existingChars.find(c => c.id === char.id)?.name, newItem: char, matchType: 'id' });
    } else if (char.name && existingCharNames.has(char.name.trim().toLowerCase())) {
      const existing = existingCharNames.get(char.name.trim().toLowerCase())!;
      conflicts.push({ type: 'character', existingId: existing.id, existingName: existing.name, newItem: char, matchType: 'name' });
    }
  }

  // 检测章节冲突
  const existingChapters = await db.chapters.getByProject(projectId);
  const existingChapterIds = new Set(existingChapters.map((c) => c.id));
  const existingChapterTitles = new Map(
    existingChapters.map((c) => [c.title.trim().toLowerCase(), c])
  );
  for (const chapter of importData.chapters) {
    if (existingChapterIds.has(chapter.id)) {
      conflicts.push({ type: 'chapter', existingId: chapter.id, existingName: existingChapters.find(c => c.id === chapter.id)?.title, newItem: chapter, matchType: 'id' });
    } else if (chapter.title && existingChapterTitles.has(chapter.title.trim().toLowerCase())) {
      const existing = existingChapterTitles.get(chapter.title.trim().toLowerCase())!;
      conflicts.push({ type: 'chapter', existingId: existing.id, existingName: existing.title, newItem: chapter, matchType: 'name' });
    }
  }

  // 检测伏笔冲突
  const existingForeshadows = await db.foreshadows.getByProject(projectId);
  const existingForeshadowIds = new Set(existingForeshadows.map((f) => f.id));
  for (const f of importData.foreshadows) {
    if (existingForeshadowIds.has(f.id)) {
      conflicts.push({ type: 'foreshadow', existingId: f.id, newItem: f, matchType: 'id' });
    }
  }

  // 检测世界观设定冲突
  const existingSettings = await db.worldSettings.getByProject(projectId);
  const existingSettingIds = new Set(existingSettings.map((s) => s.id));
  const existingSettingNames = new Map(
    existingSettings.map((s) => [s.name.trim().toLowerCase(), s])
  );
  for (const s of importData.worldSettings) {
    if (existingSettingIds.has(s.id)) {
      conflicts.push({ type: 'worldSetting', existingId: s.id, existingName: existingSettings.find(w => w.id === s.id)?.name, newItem: s, matchType: 'id' });
    } else if (s.name && existingSettingNames.has(s.name.trim().toLowerCase())) {
      const existing = existingSettingNames.get(s.name.trim().toLowerCase())!;
      conflicts.push({ type: 'worldSetting', existingId: existing.id, existingName: existing.name, newItem: s, matchType: 'name' });
    }
  }

  return conflicts;
}

/**
 * 执行导入（智能合并到现有项目）
 *
 * 匹配策略（按优先级）：
 *   1. ID 匹配：导入数据 id 与现有数据 id 相同 → 覆盖
 *   2. Name 匹配：导入数据 name 与现有数据 name 相同 → 视为同一实体，用现有 id 替换导入 id 后覆盖
 *   3. 无匹配 → 新增
 *
 * @param projectId - 目标项目 ID
 * @param importData - 要导入的数据
 * @param overwrite - 冲突时是否覆盖（true=覆盖, false=跳过已存在的）
 */
/** 占位符 ID 模式，导入时自动替换为新 ID */
const PLACEHOLDER_ID = '<自动生成>';

function replacePlaceholderIds<T extends { id: string }>(items: T[], generate: () => string): T[] {
  return items.map((item) => ({
    ...item,
    id: item.id === PLACEHOLDER_ID || !item.id ? generate() : item.id,
  }));
}

/** 按 name 匹配并替换 id，返回匹配结果统计 */
function matchByName<T extends { id: string; name?: string; title?: string }>(
  items: T[],
  existing: T[],
  nameKey: 'name' | 'title'
): { matched: number; items: T[] } {
  let matched = 0;
  const existingMap = new Map<string, T>();
  for (const e of existing) {
    const key = (e[nameKey] || '').trim().toLowerCase();
    if (key) existingMap.set(key, e);
  }
  const result = items.map((item) => {
    const key = ((item as Record<string, unknown>)[nameKey] as string || '').trim().toLowerCase();
    if (key && existingMap.has(key)) {
      matched++;
      return { ...item, id: existingMap.get(key)!.id };
    }
    return item;
  });
  return { matched, items: result };
}

export async function executeImport(
  projectId: string,
  importData: ProjectExport,
  overwrite: boolean
): Promise<void> {
  // 替换占位符 ID 为自动生成的 ID
  let characters = replacePlaceholderIds(
    importData.characters.map((c) => ({ ...c, projectId })),
    () => Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
  );
  let chapters = replacePlaceholderIds(
    importData.chapters.map((c) => ({ ...c, projectId })),
    () => Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
  );
  let foreshadows = replacePlaceholderIds(
    importData.foreshadows.map((f) => ({ ...f, projectId })),
    () => Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
  );
  let worldSettings = replacePlaceholderIds(
    importData.worldSettings.map((w) => ({ ...w, projectId })),
    () => Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
  );

  // 加载现有数据
  const [existingChars, existingChapters, existingForeshadows, existingSettings] = await Promise.all([
    db.characters.getByProject(projectId),
    db.chapters.getByProject(projectId),
    db.foreshadows.getByProject(projectId),
    db.worldSettings.getByProject(projectId),
  ]);

  // Step 1: 按 name 匹配，同名则复用现有 ID（实现"更新"而非"新增"）
  const nameMatchedIds = { chars: new Set<string>(), chapters: new Set<string>(), settings: new Set<string>() };
  let matchResult;

  matchResult = matchByName(characters, existingChars, 'name');
  characters = matchResult.items as typeof characters;
  matchResult.items.forEach((c, i) => {
    if (c.id !== (importData.characters[i]?.id)) nameMatchedIds.chars.add(c.id);
  });

  matchResult = matchByName(chapters, existingChapters, 'title');
  chapters = matchResult.items as typeof chapters;
  matchResult.items.forEach((c, i) => {
    if (c.id !== (importData.chapters[i]?.id)) nameMatchedIds.chapters.add(c.id);
  });

  matchResult = matchByName(foreshadows, existingForeshadows, 'name' as never);
  foreshadows = matchResult.items as typeof foreshadows;

  matchResult = matchByName(worldSettings, existingSettings, 'name');
  worldSettings = matchResult.items as typeof worldSettings;
  matchResult.items.forEach((w, i) => {
    if (w.id !== (importData.worldSettings[i]?.id)) nameMatchedIds.settings.add(w.id);
  });

  // outlines 处理
  const importOutlines = (importData.outlines || []).map((o) => ({ ...o, projectId }));
  const existingOutlines = await db.outlines.getByProject(projectId);

  // Step 2: 替换角色内嵌 resource 的占位符 ID
  const finalChars = characters.map((c) => ({
    ...c,
    resources: c.resources.map((r) => ({
      ...r,
      id: r.id === PLACEHOLDER_ID || !r.id
        ? Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
        : r.id,
    })),
  }));

  if (overwrite) {
    // 覆盖模式：全部写入
    await Promise.all([
      finalChars.length > 0 && db.characters.addMany(finalChars),
      chapters.length > 0 && db.chapters.addMany(chapters),
      foreshadows.length > 0 && db.foreshadows.addMany(foreshadows),
      worldSettings.length > 0 && db.worldSettings.addMany(worldSettings),
      importOutlines.length > 0 && db.outlines.addMany(importOutlines),
    ]);
  } else {
    // 智能模式：name 匹配到的 → 更新；ID 相同 → 跳过；其余 → 新增
    const existingCharIds = new Set(existingChars.map((c) => c.id));
    const existingChapterIds = new Set(existingChapters.map((c) => c.id));
    const existingForeshadowIds = new Set(existingForeshadows.map((f) => f.id));
    const existingSettingIds = new Set(existingSettings.map((s) => s.id));

    // 分离：name 匹配的（更新） vs 真正的新增
    const updateChars = finalChars.filter((c) => nameMatchedIds.chars.has(c.id));
    const newChars = finalChars.filter((c) => !existingCharIds.has(c.id) && !nameMatchedIds.chars.has(c.id));

    const updateChapters = chapters.filter((c) => nameMatchedIds.chapters.has(c.id));
    const newChapters = chapters.filter((c) => !existingChapterIds.has(c.id) && !nameMatchedIds.chapters.has(c.id));

    const newForeshadows = foreshadows.filter((f) => !existingForeshadowIds.has(f.id));

    const updateSettings = worldSettings.filter((w) => nameMatchedIds.settings.has(w.id));
    const newSettings = worldSettings.filter((w) => !existingSettingIds.has(w.id) && !nameMatchedIds.settings.has(w.id));

    // 更新：逐条 update（保证数据完整替换）
    await Promise.all([
      ...updateChars.map((c) => db.characters.update(c)),
      ...updateChapters.map((c) => db.chapters.update(c)),
      ...updateSettings.map((w) => db.worldSettings.update(w)),
      newChars.length > 0 && db.characters.addMany(newChars),
      newChapters.length > 0 && db.chapters.addMany(newChapters),
      newForeshadows.length > 0 && db.foreshadows.addMany(newForeshadows),
      newSettings.length > 0 && db.worldSettings.addMany(newSettings),
      // outlines：跳过已存在的 ID，新增其余
      importOutlines.length > 0 && db.outlines.addMany(
        importOutlines.filter((o) => !existingOutlines.some((eo) => eo.id === o.id))
      ),
    ]);
  }
}
