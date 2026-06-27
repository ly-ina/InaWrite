/**
 * 章节相关状态管理
 */

import { create } from 'zustand';
import { db } from '../db/database';
import { generateId, type Chapter } from '../types';

interface ChapterState {
  chapters: Chapter[];
  loading: boolean;

  loadChapters: (projectId: string) => Promise<void>;
  createChapter: (data: Omit<Chapter, 'id'>) => Promise<Chapter>;
  updateChapter: (chapter: Chapter) => Promise<void>;
  deleteChapter: (id: string) => Promise<void>;
}

export const useChapterStore = create<ChapterState>((set) => ({
  chapters: [],
  loading: false,

  loadChapters: async (projectId) => {
    set({ loading: true });
    try {
      const chapters = await db.chapters.getByProject(projectId);
      // 按章节序号排序
      chapters.sort((a, b) => a.number - b.number);
      set({ chapters, loading: false });
    } catch (error) {
      console.error('加载章节列表失败:', error);
      set({ loading: false });
    }
  },

  createChapter: async (data) => {
    const chapter: Chapter = {
      ...data,
      id: generateId(),
    };
    await db.chapters.add(chapter);
    return chapter;
  },

  updateChapter: async (chapter) => {
    await db.chapters.update(chapter);
  },

  deleteChapter: async (id) => {
    await db.chapters.remove(id);
  },
}));
