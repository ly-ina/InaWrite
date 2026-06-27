/**
 * 伏笔相关状态管理
 */

import { create } from 'zustand';
import { db } from '../db/database';
import { generateId, type Foreshadow } from '../types';

interface ForeshadowState {
  foreshadows: Foreshadow[];
  loading: boolean;

  loadForeshadows: (projectId: string) => Promise<void>;
  createForeshadow: (data: Omit<Foreshadow, 'id'>) => Promise<Foreshadow>;
  updateForeshadow: (foreshadow: Foreshadow) => Promise<void>;
  deleteForeshadow: (id: string) => Promise<void>;
}

export const useForeshadowStore = create<ForeshadowState>((set) => ({
  foreshadows: [],
  loading: false,

  loadForeshadows: async (projectId) => {
    set({ loading: true });
    try {
      const foreshadows = await db.foreshadows.getByProject(projectId);
      set({ foreshadows, loading: false });
    } catch (error) {
      console.error('加载伏笔列表失败:', error);
      set({ loading: false });
    }
  },

  createForeshadow: async (data) => {
    const foreshadow: Foreshadow = {
      ...data,
      id: generateId(),
    };
    await db.foreshadows.add(foreshadow);
    return foreshadow;
  },

  updateForeshadow: async (foreshadow) => {
    await db.foreshadows.update(foreshadow);
  },

  deleteForeshadow: async (id) => {
    await db.foreshadows.remove(id);
  },
}));
