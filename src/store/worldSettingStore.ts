/**
 * 世界观设定相关状态管理
 */

import { create } from 'zustand';
import { db } from '../db/database';
import { generateId, type WorldSetting } from '../types';

interface WorldSettingState {
  settings: WorldSetting[];
  loading: boolean;

  loadSettings: (projectId: string) => Promise<void>;
  createSetting: (data: Omit<WorldSetting, 'id'>) => Promise<WorldSetting>;
  updateSetting: (setting: WorldSetting) => Promise<void>;
  deleteSetting: (id: string) => Promise<void>;
}

export const useWorldSettingStore = create<WorldSettingState>((set) => ({
  settings: [],
  loading: false,

  loadSettings: async (projectId) => {
    set({ loading: true });
    try {
      const settings = await db.worldSettings.getByProject(projectId);
      // 过滤无效数据：name 为空或只有空白字符的设定
      const validSettings = settings.filter((s) => s.name && s.name.trim().length > 0);
      const invalidSettings = settings.filter((s) => !s.name || s.name.trim().length === 0);
      // 从数据库中删除无效数据
      if (invalidSettings.length > 0) {
        console.warn(`[WorldSettings] 清理 ${invalidSettings.length} 条无效空数据`);
        for (const inv of invalidSettings) {
          await db.worldSettings.remove(inv.id).catch(() => { /* ignore */ });
        }
      }
      set({ settings: validSettings, loading: false });
    } catch (error) {
      console.error('加载世界观设定失败:', error);
      set({ loading: false });
    }
  },

  createSetting: async (data) => {
    const setting: WorldSetting = {
      ...data,
      id: generateId(),
    };
    await db.worldSettings.add(setting);
    return setting;
  },

  updateSetting: async (setting) => {
    await db.worldSettings.update(setting);
  },

  deleteSetting: async (id) => {
    await db.worldSettings.remove(id);
  },
}));
