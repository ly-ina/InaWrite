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
  const [characters, chapters, foreshadows, worldSettings] = await Promise.all([
    db.characters.getByProject(project.id),
    db.chapters.getByProject(project.id),
    db.foreshadows.getByProject(project.id),
    db.worldSettings.getByProject(project.id),
  ]);

  const exportData: ProjectExport = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    project,
    characters,
    chapters,
    foreshadows,
    worldSettings,
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
 * 从文件读取 JSON 内容
 * @param file - 用户选择的文件
 * @returns 解析后的 JSON 对象
 */
export function readJSONFile(file: File): Promise<ProjectExport> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as ProjectExport;
        // 基础校验
        if (!data.version || !data.project || !data.project.id) {
          reject(new Error('无效的导出文件格式'));
          return;
        }
        resolve(data);
      } catch {
        reject(new Error('JSON 解析失败，请检查文件格式'));
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
  newItem: Character | Chapter | Foreshadow | WorldSetting;
}

/**
 * 检测导入数据与现有数据的冲突
 * @param projectId - 目标项目 ID
 * @param importData - 要导入的数据
 * @returns 冲突列表
 */
export async function detectConflicts(
  projectId: string,
  importData: ProjectExport
): Promise<ImportConflict[]> {
  const conflicts: ImportConflict[] = [];

  // 检测角色 ID 冲突
  const existingChars = await db.characters.getByProject(projectId);
  const existingCharIds = new Set(existingChars.map((c) => c.id));
  for (const char of importData.characters) {
    if (existingCharIds.has(char.id)) {
      conflicts.push({ type: 'character', existingId: char.id, newItem: char });
    }
  }

  // 检测章节 ID 冲突
  const existingChapters = await db.chapters.getByProject(projectId);
  const existingChapterIds = new Set(existingChapters.map((c) => c.id));
  for (const chapter of importData.chapters) {
    if (existingChapterIds.has(chapter.id)) {
      conflicts.push({ type: 'chapter', existingId: chapter.id, newItem: chapter });
    }
  }

  // 检测伏笔 ID 冲突
  const existingForeshadows = await db.foreshadows.getByProject(projectId);
  const existingForeshadowIds = new Set(existingForeshadows.map((f) => f.id));
  for (const f of importData.foreshadows) {
    if (existingForeshadowIds.has(f.id)) {
      conflicts.push({ type: 'foreshadow', existingId: f.id, newItem: f });
    }
  }

  // 检测世界观设定 ID 冲突
  const existingSettings = await db.worldSettings.getByProject(projectId);
  const existingSettingIds = new Set(existingSettings.map((s) => s.id));
  for (const s of importData.worldSettings) {
    if (existingSettingIds.has(s.id)) {
      conflicts.push({ type: 'worldSetting', existingId: s.id, newItem: s });
    }
  }

  return conflicts;
}

/**
 * 执行导入（合并数据到现有项目）
 * @param projectId - 目标项目 ID
 * @param importData - 要导入的数据
 * @param overwrite - 冲突时是否覆盖（true=覆盖, false=跳过）
 */
/** 占位符 ID 模式，导入时自动替换为新 ID */
const PLACEHOLDER_ID = '<自动生成>';

function replacePlaceholderIds<T extends { id: string }>(items: T[], generate: () => string): T[] {
  return items.map((item) => ({
    ...item,
    id: item.id === PLACEHOLDER_ID || !item.id ? generate() : item.id,
  }));
}

export async function executeImport(
  projectId: string,
  importData: ProjectExport,
  overwrite: boolean
): Promise<void> {
  // 替换占位符 ID 为自动生成的 ID
  const characters = replacePlaceholderIds(
    importData.characters.map((c) => ({ ...c, projectId })),
    () => Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
  );
  const chapters = replacePlaceholderIds(
    importData.chapters.map((c) => ({ ...c, projectId })),
    () => Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
  );
  const foreshadows = replacePlaceholderIds(
    importData.foreshadows.map((f) => ({ ...f, projectId })),
    () => Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
  );
  const worldSettings = replacePlaceholderIds(
    importData.worldSettings.map((w) => ({ ...w, projectId })),
    () => Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
  );

  // 替换角色内嵌 resource 的占位符 ID
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
    // 覆盖模式：直接写入
    await Promise.all([
      db.characters.addMany(finalChars),
      db.chapters.addMany(chapters),
      db.foreshadows.addMany(foreshadows),
      db.worldSettings.addMany(worldSettings),
    ]);
  } else {
    // 跳过模式：只添加不存在的
    const existingCharIds = new Set((await db.characters.getByProject(projectId)).map((c) => c.id));
    const existingChapterIds = new Set((await db.chapters.getByProject(projectId)).map((c) => c.id));
    const existingForeshadowIds = new Set((await db.foreshadows.getByProject(projectId)).map((f) => f.id));
    const existingSettingIds = new Set((await db.worldSettings.getByProject(projectId)).map((s) => s.id));

    const newChars = finalChars.filter((c) => !existingCharIds.has(c.id));
    const newChapters = chapters.filter((c) => !existingChapterIds.has(c.id));
    const newForeshadows = foreshadows.filter((f) => !existingForeshadowIds.has(f.id));
    const newSettings = worldSettings.filter((w) => !existingSettingIds.has(w.id));

    await Promise.all([
      newChars.length > 0 && db.characters.addMany(newChars),
      newChapters.length > 0 && db.chapters.addMany(newChapters),
      newForeshadows.length > 0 && db.foreshadows.addMany(newForeshadows),
      newSettings.length > 0 && db.worldSettings.addMany(newSettings),
    ]);
  }
}
