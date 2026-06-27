/**
 * 数据备份与恢复工具
 * 支持自动备份到 localStorage、手动备份到文件、从文件恢复
 */

import type { ProjectExport } from '../types';
import { db } from '../db/database';
import { exportProject, readJSONFile, executeImport } from './importExport';

const BACKUP_PREFIX = 'novelkb_backup_';
const BACKUP_META_KEY = 'novelkb_backup_meta';
const MAX_AUTO_BACKUPS = 5;

export interface BackupMeta {
  projectId: string;
  projectName: string;
  timestamp: string;
  version: string;
  size: number;
}

/**
 * 创建自动备份到 localStorage
 * @param projectId - 项目 ID
 */
export async function createAutoBackup(projectId: string): Promise<void> {
  try {
    const project = await db.projects.getById(projectId);
    if (!project) return;

    const json = await exportProject(project);
    const key = BACKUP_PREFIX + projectId;
    const timestamp = new Date().toISOString();

    // 保存备份
    localStorage.setItem(key, json);

    // 更新备份元数据
    const meta: BackupMeta = {
      projectId,
      projectName: project.name,
      timestamp,
      version: '1.0',
      size: json.length,
    };

    // 读取现有元数据列表
    const existingMetaStr = localStorage.getItem(BACKUP_META_KEY);
    const existingMeta: BackupMeta[] = existingMetaStr ? JSON.parse(existingMetaStr) : [];

    // 更新该项目的备份记录
    const filtered = existingMeta.filter((m) => m.projectId !== projectId);
    filtered.push(meta);

    // 限制最多保留 MAX_AUTO_BACKUPS 条记录
    if (filtered.length > MAX_AUTO_BACKUPS) {
      const toRemove = filtered.splice(0, filtered.length - MAX_AUTO_BACKUPS);
      toRemove.forEach((m) => localStorage.removeItem(BACKUP_PREFIX + m.projectId));
    }

    localStorage.setItem(BACKUP_META_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('自动备份失败:', error);
  }
}

/**
 * 获取所有备份的元数据
 */
export function getBackupList(): BackupMeta[] {
  try {
    const str = localStorage.getItem(BACKUP_META_KEY);
    return str ? JSON.parse(str) : [];
  } catch {
    return [];
  }
}

/**
 * 从 localStorage 恢复备份
 * @param projectId - 项目 ID
 * @returns 备份的 JSON 字符串，或 null
 */
export function getBackup(projectId: string): string | null {
  return localStorage.getItem(BACKUP_PREFIX + projectId);
}

/**
 * 删除备份
 */
export function deleteBackup(projectId: string): void {
  localStorage.removeItem(BACKUP_PREFIX + projectId);
  const meta = getBackupList().filter((m) => m.projectId !== projectId);
  localStorage.setItem(BACKUP_META_KEY, JSON.stringify(meta));
}

/**
 * 从文件恢复数据到项目
 * @param file - 用户选择的 JSON 文件
 * @param projectId - 目标项目 ID
 */
export async function restoreFromFile(
  file: File,
  projectId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const data = await readJSONFile(file);
    await executeImport(projectId, data, true);
    return { success: true, message: '数据恢复成功！' };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '恢复失败',
    };
  }
}

/**
 * 导出数据报告（纯文本 Markdown 格式）
 */
export function generateReport(data: ProjectExport): string {
  const { project, characters, chapters, foreshadows } = data;

  const totalWords = chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
  const completedChapters = chapters.filter((ch) => ch.status === 'done').length;
  const pendingForeshadows = foreshadows.filter((f) => f.status === 'pending' || f.status === 'active').length;
  const resolvedForeshadows = foreshadows.filter((f) => f.status === 'resolved').length;

  const lines: string[] = [
    `# ${project.name} — 创作报告`,
    '',
    `> 生成时间：${new Date().toLocaleString('zh-CN')}`,
    '',
    project.description ? `> ${project.description}\n` : '',
    '---',
    '',
    '## 📊 数据总览',
    '',
    `| 指标 | 数值 |`,
    `|------|------|`,
    `| 角色数 | ${characters.length} |`,
    `| 章节数 | ${chapters.length} |`,
    `| 总字数 | ${totalWords.toLocaleString()} |`,
    `| 已完成章节 | ${completedChapters} / ${chapters.length} |`,
    `| 进行中伏笔 | ${pendingForeshadows} |`,
    `| 已回收伏笔 | ${resolvedForeshadows} |`,
    '',
    '---',
    '',
    '## 👤 角色列表',
    '',
    ...characters.map((c) => [
      `### ${c.name}`,
      '',
      c.race ? `- 种族：${c.race}` : '',
      c.age ? `- 年龄：${c.age}` : '',
      c.status ? `- 状态：${c.status}` : '',
      c.appearance ? `- 外貌：${c.appearance}` : '',
      c.personality ? `- 性格：${c.personality}` : '',
      `- 描述：${c.description || '暂无'}`,
      `- 出场章节：${c.appearances.length} 章`,
      `- 关系数：${c.relations.length}`,
      `- 资源数：${c.resources.length}`,
      '',
    ]).flat(),
    '---',
    '',
    '## 📖 章节列表',
    '',
    ...chapters.map((ch) => [
      `### 第${ch.number}章 ${ch.title}`,
      '',
      `- 状态：${ch.status}`,
      ch.wordCount ? `- 字数：${ch.wordCount.toLocaleString()}` : '',
      ch.summary ? `- 摘要：${ch.summary}` : '',
      `- 出场角色：${ch.characters.length} 人`,
      `- 新增伏笔：${ch.foreshadowsAdded.length}`,
      `- 回收伏笔：${ch.foreshadowsResolved.length}`,
      '',
    ]).flat(),
  ];

  return lines.filter((l) => l !== null).join('\n');
}
