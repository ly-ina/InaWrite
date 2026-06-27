/**
 * Markdown 文件监听与自动导入
 * 使用 File System Access API 监听指定目录的 Markdown 文件变更
 * 支持 YAML Front Matter 解析
 */

import type { Character, Chapter, Foreshadow, WorldSetting } from '../types';
import { generateId } from '../types';

/** 解析规则：Markdown 文件中的 YAML Front Matter */
interface FrontMatter {
  type?: 'character' | 'chapter' | 'foreshadow' | 'worldsetting';
  name?: string;
  title?: string;
  number?: number;
  status?: string;
  race?: string;
  age?: string;
  [key: string]: unknown;
}

/** 监听器状态 */
interface WatcherState {
  directoryHandle: FileSystemDirectoryHandle | null;
  isWatching: boolean;
  lastScan: number;
}

let watcherState: WatcherState = {
  directoryHandle: null,
  isWatching: false,
  lastScan: 0,
};

/**
 * 解析 Markdown 文件的 YAML Front Matter
 * 格式：
 * ---
 * type: character
 * name: 角色名
 * ---
 * 正文内容...
 */
function parseFrontMatter(content: string): { meta: FrontMatter; body: string } {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };

  const metaStr = match[1];
  const body = match[2];

  const meta: FrontMatter = {};
  metaStr.split('\n').forEach((line) => {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      let value: unknown = line.slice(colonIdx + 1).trim();
      // 尝试解析数字
      if (typeof value === 'string' && /^\d+$/.test(value)) {
        value = parseInt(value);
      }
      (meta as Record<string, unknown>)[key] = value;
    }
  });

  return { meta, body };
}

/**
 * 将解析后的数据转换为对应类型
 */
export function convertToEntity(
  meta: FrontMatter,
  body: string,
  projectId: string
): Character | Chapter | Foreshadow | WorldSetting | null {
  const type = meta.type || 'character';

  switch (type) {
    case 'character':
      return {
        id: generateId(),
        projectId,
        name: meta.name || '未命名角色',
        aliases: [],
        race: meta.race as string,
        age: meta.age as string,
        description: body,
        status: (meta.status as Character['status']) || 'alive',
        relations: [],
        resources: [],
        appearances: [],
      } as Character;

    case 'chapter':
      return {
        id: generateId(),
        projectId,
        number: meta.number || 1,
        title: meta.title || '未命名章节',
        wordCount: body.length,
        status: (meta.status as Chapter['status']) || 'draft',
        summary: body.slice(0, 200),
        keyEvents: [],
        characters: [],
        foreshadowsAdded: [],
        foreshadowsResolved: [],
        locations: [],
      } as Chapter;

    case 'foreshadow':
      return {
        id: generateId(),
        projectId,
        content: body.slice(0, 200),
        firstAppearance: '',
        status: (meta.status as Foreshadow['status']) || 'pending',
        relatedCharacters: [],
      } as Foreshadow;

    case 'worldsetting':
      return {
        id: generateId(),
        projectId,
        name: meta.name || '未命名设定',
        type: (meta.type as WorldSetting['type']) || 'custom',
        description: body,
        relations: [],
      } as WorldSetting;

    default:
      return null;
  }
}

/**
 * 选择要监听的目录（使用 File System Access API）
 */
export async function selectWatchDirectory(): Promise<string | null> {
  try {
    // 检查浏览器是否支持
    if (!('showDirectoryPicker' in window)) {
      throw new Error('当前浏览器不支持 File System Access API，请使用 Chrome 或 Edge');
    }

    const handle = await (window as unknown as {
      showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>;
    }).showDirectoryPicker();

    watcherState.directoryHandle = handle;
    return handle.name;
  } catch (error) {
    if ((error as Error).name === 'AbortError') return null;
    throw error;
  }
}

/**
 * 扫描目录中的所有 .md 文件并解析
 */
export async function scanDirectory(projectId: string): Promise<{
  imported: number;
  errors: string[];
  items: (Character | Chapter | Foreshadow | WorldSetting)[];
}> {
  if (!watcherState.directoryHandle) {
    throw new Error('请先选择要监听的目录');
  }

  const items: (Character | Chapter | Foreshadow | WorldSetting)[] = [];
  const errors: string[] = [];

  async function scanDir(handle: FileSystemDirectoryHandle, path: string = '') {
    for await (const [name, entry] of handle.entries()) {
      if (entry.kind === 'directory') {
        await scanDir(entry as FileSystemDirectoryHandle, `${path}/${name}`);
      } else if (name.endsWith('.md')) {
        try {
          const fileHandle = entry as FileSystemFileHandle;
          const file = await fileHandle.getFile();
          const content = await file.text();
          const { meta, body } = parseFrontMatter(content);
          const entity = convertToEntity(meta, body, projectId);
          if (entity) {
            items.push(entity);
          } else {
            errors.push(`无法解析: ${name}`);
          }
        } catch (err) {
          errors.push(`读取失败: ${name} - ${(err as Error).message}`);
        }
      }
    }
  }

  await scanDir(watcherState.directoryHandle);
  watcherState.lastScan = Date.now();
  return { imported: items.length, errors, items };
}

/**
 * 开始轮询监听（每 30 秒检查一次）
 */
export function startPolling(
  projectId: string,
  onImport: (items: (Character | Chapter | Foreshadow | WorldSetting)[]) => Promise<void>,
  onError: (msg: string) => void
): () => void {
  const interval = setInterval(async () => {
    try {
      const result = await scanDirectory(projectId);
      if (result.items.length > 0) {
        await onImport(result.items);
      }
    } catch (err) {
      onError((err as Error).message);
    }
  }, 30000); // 30 秒轮询

  watcherState.isWatching = true;
  return () => {
    clearInterval(interval);
    watcherState.isWatching = false;
  };
}

/** 停止监听 */
export function stopPolling(): void {
  watcherState.isWatching = false;
}

/** 获取监听状态 */
export function getWatcherState() {
  return { ...watcherState };
}
