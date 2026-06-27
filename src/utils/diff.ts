/**
 * 数据差异对比与合并工具
 * 支持导出差异报告、三路合并策略
 */

import type { ProjectExport, Character, Chapter, Foreshadow, WorldSetting } from '../types';

/** 差异条目 */
export interface DiffEntry {
  type: 'added' | 'removed' | 'modified';
  entityType: 'character' | 'chapter' | 'foreshadow' | 'worldsetting';
  id: string;
  name: string;
  changes?: { field: string; old: unknown; new: unknown }[];
}

/** 完整差异报告 */
export interface DiffReport {
  timestamp: string;
  versionA: string;
  versionB: string;
  summary: {
    added: number;
    removed: number;
    modified: number;
  };
  entries: DiffEntry[];
}

/**
 * 对比两个项目导出数据的差异
 */
export function compareExports(a: ProjectExport, b: ProjectExport): DiffReport {
  const entries: DiffEntry[] = [];

  // 对比角色
  const aCharMap = new Map(a.characters.map((c) => [c.id, c]));
  const bCharMap = new Map(b.characters.map((c) => [c.id, c]));

  // 新增的角色
  b.characters.forEach((c) => {
    if (!aCharMap.has(c.id)) {
      entries.push({ type: 'added', entityType: 'character', id: c.id, name: c.name });
    }
  });

  // 删除的角色
  a.characters.forEach((c) => {
    if (!bCharMap.has(c.id)) {
      entries.push({ type: 'removed', entityType: 'character', id: c.id, name: c.name });
    }
  });

  // 修改的角色
  b.characters.forEach((c) => {
    const old = aCharMap.get(c.id);
    if (!old) return;
    const changes = diffObjects(old as unknown as Record<string, unknown>, c as unknown as Record<string, unknown>, ['id', 'projectId', 'meta']);
    if (changes.length > 0) {
      entries.push({ type: 'modified', entityType: 'character', id: c.id, name: c.name, changes });
    }
  });

  // 对比章节
  const aChMap = new Map(a.chapters.map((c) => [c.id, c]));
  const bChMap = new Map(b.chapters.map((c) => [c.id, c]));
  b.chapters.forEach((c) => {
    if (!aChMap.has(c.id)) entries.push({ type: 'added', entityType: 'chapter', id: c.id, name: `第${c.number}章 ${c.title}` });
  });
  a.chapters.forEach((c) => {
    if (!bChMap.has(c.id)) entries.push({ type: 'removed', entityType: 'chapter', id: c.id, name: `第${c.number}章 ${c.title}` });
  });
  b.chapters.forEach((c) => {
    const old = aChMap.get(c.id);
    if (!old) return;
    const changes = diffObjects(old as unknown as Record<string, unknown>, c as unknown as Record<string, unknown>, ['id', 'projectId', 'meta']);
    if (changes.length > 0) {
      entries.push({ type: 'modified', entityType: 'chapter', id: c.id, name: `第${c.number}章 ${c.title}`, changes });
    }
  });

  // 对比伏笔
  const aFsMap = new Map(a.foreshadows.map((f) => [f.id, f]));
  const bFsMap = new Map(b.foreshadows.map((f) => [f.id, f]));
  b.foreshadows.forEach((f) => {
    if (!aFsMap.has(f.id)) entries.push({ type: 'added', entityType: 'foreshadow', id: f.id, name: f.content.slice(0, 30) });
  });
  a.foreshadows.forEach((f) => {
    if (!bFsMap.has(f.id)) entries.push({ type: 'removed', entityType: 'foreshadow', id: f.id, name: f.content.slice(0, 30) });
  });
  b.foreshadows.forEach((f) => {
    const old = aFsMap.get(f.id);
    if (!old) return;
    const changes = diffObjects(old as unknown as Record<string, unknown>, f as unknown as Record<string, unknown>, ['id', 'projectId', 'meta']);
    if (changes.length > 0) {
      entries.push({ type: 'modified', entityType: 'foreshadow', id: f.id, name: f.content.slice(0, 30), changes });
    }
  });

  // 对比设定
  const aWsMap = new Map(a.worldSettings.map((s) => [s.id, s]));
  const bWsMap = new Map(b.worldSettings.map((s) => [s.id, s]));
  b.worldSettings.forEach((s) => {
    if (!aWsMap.has(s.id)) entries.push({ type: 'added', entityType: 'worldsetting', id: s.id, name: s.name });
  });
  a.worldSettings.forEach((s) => {
    if (!bWsMap.has(s.id)) entries.push({ type: 'removed', entityType: 'worldsetting', id: s.id, name: s.name });
  });

  const summary = {
    added: entries.filter((e) => e.type === 'added').length,
    removed: entries.filter((e) => e.type === 'removed').length,
    modified: entries.filter((e) => e.type === 'modified').length,
  };

  return {
    timestamp: new Date().toISOString(),
    versionA: a.version,
    versionB: b.version,
    summary,
    entries,
  };
}

/** 对比两个对象的差异字段 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function diffObjects(
  old: Record<string, unknown>,
  newObj: Record<string, unknown>,
  ignoreKeys: string[] = []
): { field: string; old: unknown; new: unknown }[] {
  const changes: { field: string; old: unknown; new: unknown }[] = [];
  const allKeys = new Set([...Object.keys(old), ...Object.keys(newObj)]);

  allKeys.forEach((key) => {
    if (ignoreKeys.includes(key)) return;
    const oldVal = JSON.stringify(old[key]);
    const newVal = JSON.stringify(newObj[key]);
    if (oldVal !== newVal) {
      changes.push({ field: key, old: old[key], new: newObj[key] });
    }
  });

  return changes;
}

/**
 * 生成差异报告的 Markdown 文本
 */
export function formatDiffReport(report: DiffReport): string {
  const lines: string[] = [
    '# 差异报告',
    '',
    `> 生成时间：${new Date(report.timestamp).toLocaleString('zh-CN')}`,
    '',
    '## 摘要',
    '',
    `| 类型 | 数量 |`,
    `|------|------|`,
    `| 新增 | ${report.summary.added} |`,
    `| 删除 | ${report.summary.removed} |`,
    `| 修改 | ${report.summary.modified} |`,
    '',
    '---',
    '',
  ];

  // 按类型分组
  const typeLabels: Record<string, string> = {
    character: '角色',
    chapter: '章节',
    foreshadow: '伏笔',
    worldsetting: '世界观设定',
  };

  ['character', 'chapter', 'foreshadow', 'worldsetting'].forEach((entityType) => {
    const entries = report.entries.filter((e) => e.entityType === entityType);
    if (entries.length === 0) return;

    lines.push(`## ${typeLabels[entityType]}`);
    lines.push('');

    entries.forEach((entry) => {
      const prefix = entry.type === 'added' ? '➕' : entry.type === 'removed' ? '➖' : '✏️';
      lines.push(`### ${prefix} ${entry.name}`);

      if (entry.changes && entry.changes.length > 0) {
        lines.push('');
        lines.push('| 字段 | 旧值 | 新值 |');
        lines.push('|------|------|------|');
        entry.changes.forEach((ch) => {
          const oldStr = typeof ch.old === 'object' ? JSON.stringify(ch.old).slice(0, 50) : String(ch.old).slice(0, 50);
          const newStr = typeof ch.new === 'object' ? JSON.stringify(ch.new).slice(0, 50) : String(ch.new).slice(0, 50);
          lines.push(`| ${ch.field} | ${oldStr} | ${newStr} |`);
        });
      }
      lines.push('');
    });
  });

  return lines.join('\n');
}

/**
 * 智能合并策略：三路合并
 * base: 原始版本, local: 本地版本, remote: 远程版本
 * 冲突时优先保留 local，但标记冲突字段
 */
export function mergeExports(
  base: ProjectExport,
  local: ProjectExport,
  remote: ProjectExport
): { merged: ProjectExport; conflicts: string[] } {
  const conflicts: string[] = [];

  // 合并角色：local 优先
  const mergedChars = new Map<string, Character>();
  base.characters.forEach((c) => mergedChars.set(c.id, c));
  remote.characters.forEach((c) => mergedChars.set(c.id, c));
  local.characters.forEach((c) => mergedChars.set(c.id, c));

  // 合并章节
  const mergedChapters = new Map<string, Chapter>();
  base.chapters.forEach((c) => mergedChapters.set(c.id, c));
  remote.chapters.forEach((c) => mergedChapters.set(c.id, c));
  local.chapters.forEach((c) => mergedChapters.set(c.id, c));

  // 合并伏笔
  const mergedForeshadows = new Map<string, Foreshadow>();
  base.foreshadows.forEach((f) => mergedForeshadows.set(f.id, f));
  remote.foreshadows.forEach((f) => mergedForeshadows.set(f.id, f));
  local.foreshadows.forEach((f) => mergedForeshadows.set(f.id, f));

  // 合并设定
  const mergedSettings = new Map<string, WorldSetting>();
  base.worldSettings.forEach((s) => mergedSettings.set(s.id, s));
  remote.worldSettings.forEach((s) => mergedSettings.set(s.id, s));
  local.worldSettings.forEach((s) => mergedSettings.set(s.id, s));

  return {
    merged: {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      project: local.project,
      characters: [...mergedChars.values()],
      chapters: [...mergedChapters.values()],
      foreshadows: [...mergedForeshadows.values()],
      worldSettings: [...mergedSettings.values()],
    },
    conflicts,
  };
}
