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
      set({ settings, loading: false });
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
