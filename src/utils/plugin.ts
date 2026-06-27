/**
 * 插件系统 — 自定义数据导入解析器
 * 允许用户注册自定义解析函数，扩展支持的文件格式
 */

import type { Character, Chapter, Foreshadow, WorldSetting } from '../types';
import { generateId } from '../types';

/** 插件解析器类型 */
export type ParserFn = (
  content: string,
  projectId: string,
  options?: Record<string, unknown>
) => (Character | Chapter | Foreshadow | WorldSetting)[];

/** 插件定义 */
export interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  /** 支持的文件扩展名 */
  extensions: string[];
  /** 解析函数 */
  parse: ParserFn;
  /** 自定义选项 schema */
  options?: { key: string; label: string; type: 'string' | 'number' | 'boolean'; default: unknown }[];
}

/** 内置插件注册表 */
const registry: Map<string, Plugin> = new Map();

/**
 * 注册插件
 */
export function registerPlugin(plugin: Plugin): void {
  if (registry.has(plugin.id)) {
    console.warn(`Plugin "${plugin.id}" already registered, overwriting.`);
  }
  registry.set(plugin.id, plugin);
}

/**
 * 获取所有已注册插件
 */
export function getPlugins(): Plugin[] {
  return [...registry.values()];
}

/**
 * 获取特定插件
 */
export function getPlugin(id: string): Plugin | undefined {
  return registry.get(id);
}

/**
 * 根据文件扩展名查找匹配的插件
 */
export function findPluginByExtension(filename: string): Plugin | undefined {
  const ext = '.' + filename.split('.').pop()?.toLowerCase();
  for (const plugin of registry.values()) {
    if (plugin.extensions.includes(ext)) return plugin;
  }
  return undefined;
}

/**
 * 卸载插件
 */
export function unregisterPlugin(id: string): boolean {
  return registry.delete(id);
}

// ========== 内置插件 ==========

/** Markdown Front Matter 解析器 */
registerPlugin({
  id: 'builtin-markdown',
  name: 'Markdown Front Matter',
  description: '解析带 YAML Front Matter 的 Markdown 文件',
  version: '1.0.0',
  extensions: ['.md', '.markdown'],
  parse: (content: string, projectId: string) => {
    // 简单的 Front Matter 解析
    const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
    if (!match) return [];

    const metaStr = match[1];
    const body = match[2];
    const meta: Record<string, unknown> = {};

    metaStr.split('\n').forEach((line) => {
      const idx = line.indexOf(':');
      if (idx > 0) {
        const key = line.slice(0, idx).trim();
        const value = line.slice(idx + 1).trim();
        meta[key] = /^\d+$/.test(value) ? parseInt(value) : value;
      }
    });

    const type = meta.type as string || 'character';
    const id = generateId();

    switch (type) {
      case 'character':
        return [{
          id, projectId, name: (meta.name as string) || 'Unknown', aliases: [],
          race: meta.race as string, age: meta.age as string,
          description: body, status: (meta.status as Character['status']) || 'alive',
          relations: [], resources: [], appearances: [],
        } as Character];
      case 'chapter':
        return [{
          id, projectId, number: (meta.number as number) || 1,
          title: (meta.title as string) || 'Untitled', wordCount: body.length,
          status: (meta.status as Chapter['status']) || 'draft',
          keyEvents: [], characters: [], foreshadowsAdded: [], foreshadowsResolved: [], locations: [],
        } as Chapter];
      case 'foreshadow':
        return [{
          id, projectId, content: body.slice(0, 200),
          firstAppearance: '', status: 'pending', relatedCharacters: [],
        } as Foreshadow];
      case 'worldsetting':
        return [{
          id, projectId, name: (meta.name as string) || 'Unknown',
          type: (meta.type as WorldSetting['type']) || 'custom',
          description: body, relations: [],
        } as WorldSetting];
      default: return [];
    }
  },
  options: [
    { key: 'defaultType', label: '默认类型', type: 'string', default: 'character' },
  ],
});

/** CSV 解析器 */
registerPlugin({
  id: 'builtin-csv',
  name: 'CSV 导入',
  description: '从 CSV 文件导入角色数据（name,race,age,status,description 列）',
  version: '1.0.0',
  extensions: ['.csv'],
  parse: (content: string, projectId: string) => {
    const lines = content.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const results: Character[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

      if (!row.name) continue;

      results.push({
        id: generateId(), projectId,
        name: row.name, aliases: [],
        race: row.race || undefined,
        age: row.age || undefined,
        description: row.description || '',
        status: (row.status as Character['status']) || 'alive',
        relations: [], resources: [], appearances: [],
      } as Character);
    }
    return results;
  },
});
