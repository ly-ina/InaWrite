/**
 * IndexedDB 数据库封装层
 * 使用 idb 库简化 IndexedDB 操作
 * 为每个数据类型提供标准的增删改查接口
 */

import { openDB, type IDBPDatabase } from 'idb';

// 数据库名称和版本
const DB_NAME = 'novel-inakb-db';
const OLD_DB_NAME = 'novel-kb-db';
const DB_VERSION = 1;

// ========== 数据库初始化 ==========

let dbPromise: Promise<IDBPDatabase> | null = null;
let migrationDone = false;

/** 迁移旧数据库数据到新数据库 */
async function migrateOldDB(): Promise<void> {
  if (migrationDone) return;
  migrationDone = true;

  try {
    // 检查旧数据库是否存在
    const dbs = await indexedDB.databases?.();
    const oldExists = dbs?.some((db) => db.name === OLD_DB_NAME);
    if (!oldExists) return;

    console.log('[InaKB] 检测到旧数据库，开始迁移...');
    const oldDB = await openDB(OLD_DB_NAME, 1);
    const storeNames = ['projects', 'characters', 'chapters', 'foreshadows', 'worldSettings'];

    const newDB = await getDB();
    for (const name of storeNames) {
      if (oldDB.objectStoreNames.contains(name)) {
        const data = await oldDB.getAll(name);
        if (data.length > 0) {
          const tx = newDB.transaction(name, 'readwrite');
          for (const item of data) {
            await tx.store.put(item);
          }
          await tx.done;
          console.log(`[InaKB] 迁移 ${name}: ${data.length} 条`);
        }
      }
    }
    oldDB.close();
    console.log('[InaKB] 迁移完成！');
  } catch (err) {
    console.warn('[InaKB] 迁移失败（可忽略，旧数据可能不存在）:', err);
  }
}

/**
 * 获取数据库实例（单例模式）
 * 自动创建所有需要的 object store
 */
function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // 项目表 - 用 id 作为主键
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }
        // 角色表 - projectId 索引用于按项目查询
        if (!db.objectStoreNames.contains('characters')) {
          const store = db.createObjectStore('characters', { keyPath: 'id' });
          store.createIndex('projectId', 'projectId');
        }
        // 章节表
        if (!db.objectStoreNames.contains('chapters')) {
          const store = db.createObjectStore('chapters', { keyPath: 'id' });
          store.createIndex('projectId', 'projectId');
        }
        // 伏笔表
        if (!db.objectStoreNames.contains('foreshadows')) {
          const store = db.createObjectStore('foreshadows', { keyPath: 'id' });
          store.createIndex('projectId', 'projectId');
        }
        // 世界观设定表
        if (!db.objectStoreNames.contains('worldSettings')) {
          const store = db.createObjectStore('worldSettings', { keyPath: 'id' });
          store.createIndex('projectId', 'projectId');
        }
      },
    }).then(async (db) => {
      // 首次打开新数据库时尝试迁移旧数据
      await migrateOldDB();
      return db;
    });
  }
  return dbPromise;
}

// ========== 通用 CRUD 操作 ==========

/**
 * 通用的「获取所有记录」方法
 * @param storeName - object store 名称
 * @returns 该 store 中的所有记录
 */
async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await getDB();
  return db.getAll(storeName);
}

/**
 * 通用的「按项目获取记录」方法
 * @param storeName - object store 名称
 * @param projectId - 项目 ID
 * @returns 属于该项目的所有记录
 */
async function getByProject<T>(storeName: string, projectId: string): Promise<T[]> {
  const db = await getDB();
  const index = db.transaction(storeName).store.index('projectId');
  return index.getAll(projectId);
}

/**
 * 通用的「获取单条记录」方法
 */
async function getById<T>(storeName: string, id: string): Promise<T | undefined> {
  const db = await getDB();
  return db.get(storeName, id);
}

/**
 * 通用的「添加记录」方法
 */
async function add<T>(storeName: string, item: T): Promise<void> {
  const db = await getDB();
  await db.add(storeName, item as never);
}

/**
 * 通用的「更新记录」方法
 */
async function update<T>(storeName: string, item: T): Promise<void> {
  const db = await getDB();
  await db.put(storeName, item as never);
}

/**
 * 通用的「删除记录」方法
 */
async function remove(storeName: string, id: string): Promise<void> {
  const db = await getDB();
  await db.delete(storeName, id);
}

/**
 * 通用的「批量添加」方法
 */
async function addMany<T>(storeName: string, items: T[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(storeName, 'readwrite');
  await Promise.all(items.map(item => tx.store.put(item as never)));
  await tx.done;
}

/**
 * 通用的「按项目删除所有记录」方法
 * 用于删除项目时级联删除关联数据
 */
async function deleteByProject(storeName: string, projectId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(storeName, 'readwrite');
  const index = tx.store.index('projectId');
  let cursor = await index.openCursor(projectId);
  while (cursor) {
    cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

// ========== 导出所有数据库操作 ==========

export const db = {
  // 项目操作（不需要 projectId 索引）
  projects: {
    getAll: () => getAll<import('../types').Project>('projects'),
    getById: (id: string) => getById<import('../types').Project>('projects', id),
    add: (item: import('../types').Project) => add('projects', item),
    update: (item: import('../types').Project) => update('projects', item),
    remove: (id: string) => remove('projects', id),
  },

  // 角色操作
  characters: {
    getAll: () => getAll<import('../types').Character>('characters'),
    getByProject: (projectId: string) =>
      getByProject<import('../types').Character>('characters', projectId),
    getById: (id: string) => getById<import('../types').Character>('characters', id),
    add: (item: import('../types').Character) => add('characters', item),
    update: (item: import('../types').Character) => update('characters', item),
    remove: (id: string) => remove('characters', id),
    deleteByProject: (projectId: string) => deleteByProject('characters', projectId),
    addMany: (items: import('../types').Character[]) => addMany('characters', items),
  },

  // 章节操作
  chapters: {
    getAll: () => getAll<import('../types').Chapter>('chapters'),
    getByProject: (projectId: string) =>
      getByProject<import('../types').Chapter>('chapters', projectId),
    getById: (id: string) => getById<import('../types').Chapter>('chapters', id),
    add: (item: import('../types').Chapter) => add('chapters', item),
    update: (item: import('../types').Chapter) => update('chapters', item),
    remove: (id: string) => remove('chapters', id),
    deleteByProject: (projectId: string) => deleteByProject('chapters', projectId),
    addMany: (items: import('../types').Chapter[]) => addMany('chapters', items),
  },

  // 伏笔操作
  foreshadows: {
    getAll: () => getAll<import('../types').Foreshadow>('foreshadows'),
    getByProject: (projectId: string) =>
      getByProject<import('../types').Foreshadow>('foreshadows', projectId),
    getById: (id: string) => getById<import('../types').Foreshadow>('foreshadows', id),
    add: (item: import('../types').Foreshadow) => add('foreshadows', item),
    update: (item: import('../types').Foreshadow) => update('foreshadows', item),
    remove: (id: string) => remove('foreshadows', id),
    deleteByProject: (projectId: string) => deleteByProject('foreshadows', projectId),
    addMany: (items: import('../types').Foreshadow[]) => addMany('foreshadows', items),
  },

  // 世界观设定操作
  worldSettings: {
    getAll: () => getAll<import('../types').WorldSetting>('worldSettings'),
    getByProject: (projectId: string) =>
      getByProject<import('../types').WorldSetting>('worldSettings', projectId),
    getById: (id: string) => getById<import('../types').WorldSetting>('worldSettings', id),
    add: (item: import('../types').WorldSetting) => add('worldSettings', item),
    update: (item: import('../types').WorldSetting) => update('worldSettings', item),
    remove: (id: string) => remove('worldSettings', id),
    deleteByProject: (projectId: string) => deleteByProject('worldSettings', projectId),
    addMany: (items: import('../types').WorldSetting[]) => addMany('worldSettings', items),
  },
};
