/**
 * 大纲编辑器状态管理
 * 树形大纲结构，支持拖拽排序、层级管理、与章节双向同步
 */

import { create } from 'zustand';
import { db } from '../db/database';
import { generateId, type OutlineNode, type OutlineNodeType } from '../types';

interface OutlineState {
  nodes: OutlineNode[];
  loading: boolean;

  loadNodes: (projectId: string) => Promise<void>;
  createNode: (data: Omit<OutlineNode, 'id' | 'createdAt' | 'updatedAt'>) => Promise<OutlineNode>;
  updateNode: (node: OutlineNode) => Promise<void>;
  deleteNode: (id: string) => Promise<void>;
  /** 批量更新排序（拖拽后） */
  reorderNodes: (updates: { id: string; parentId: string | null; sortOrder: number }[]) => Promise<void>;
  /** 从章节列表自动生成大纲 */
  generateFromChapters: (projectId: string, chapterIds: string[]) => Promise<void>;
}

export const useOutlineStore = create<OutlineState>((set, get) => ({
  nodes: [],
  loading: false,

  loadNodes: async (projectId) => {
    set({ loading: true });
    try {
      const nodes = await db.outlines.getByProject(projectId);
      nodes.sort((a, b) => a.sortOrder - b.sortOrder);
      set({ nodes, loading: false });
    } catch (error) {
      console.error('加载大纲失败:', error);
      set({ loading: false });
    }
  },

  createNode: async (data) => {
    const now = new Date().toISOString();
    const node: OutlineNode = {
      ...data,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    await db.outlines.add(node);
    return node;
  },

  updateNode: async (node) => {
    const updated = { ...node, updatedAt: new Date().toISOString() };
    await db.outlines.update(updated);
  },

  deleteNode: async (id) => {
    // 级联删除子节点
    const nodes = get().nodes;
    const collectIds = (parentId: string): string[] => {
      const children = nodes.filter((n) => n.parentId === parentId);
      return [parentId, ...children.flatMap((c) => collectIds(c.id))];
    };
    const idsToRemove = collectIds(id);
    await Promise.all(idsToRemove.map((nid) => db.outlines.remove(nid)));
  },

  reorderNodes: async (updates) => {
    const nodes = get().nodes;
    const now = new Date().toISOString();
    const updated = nodes.map((n) => {
      const upd = updates.find((u) => u.id === n.id);
      if (upd) {
        return { ...n, parentId: upd.parentId, sortOrder: upd.sortOrder, updatedAt: now };
      }
      return n;
    });
    // 批量写入
    const changedNodes = updated.filter((n) => updates.some((u) => u.id === n.id));
    await Promise.all(changedNodes.map((n) => db.outlines.update(n)));
  },

  generateFromChapters: async (projectId, chapterIds) => {
    const chapters = await db.chapters.getByProject(projectId);
    const selected = chapters.filter((c) => chapterIds.includes(c.id));
    selected.sort((a, b) => a.number - b.number);

    const now = new Date().toISOString();
    const newNodes: OutlineNode[] = selected.map((ch, i) => ({
      id: generateId(),
      projectId,
      parentId: null,
      type: 'chapter' as OutlineNodeType,
      title: ch.title,
      sortOrder: i,
      chapterId: ch.id,
      characters: [],
      foreshadowsPlanted: [],
      foreshadowsResolved: [],
      worldSettingsIntroduced: [],
      createdAt: now,
      updatedAt: now,
    }));

    await db.outlines.addMany(newNodes);
  },
}));
