/**
 * 项目相关状态管理
 * 管理项目列表、创建、删除等操作
 */

import { create } from 'zustand';
import { db } from '../db/database';
import { generateId, type Project } from '../types';

interface ProjectState {
  projects: Project[];
  loading: boolean;

  // 加载所有项目
  loadProjects: () => Promise<void>;

  // 创建新项目
  createProject: (name: string, description: string) => Promise<Project>;

  // 删除项目（级联删除关联数据）
  deleteProject: (id: string) => Promise<void>;

  // 更新项目
  updateProject: (project: Project) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  loading: false,

  loadProjects: async () => {
    set({ loading: true });
    try {
      const projects = await db.projects.getAll();
      // 按更新时间倒序排列
      projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      set({ projects, loading: false });
    } catch (error) {
      console.error('加载项目列表失败:', error);
      set({ loading: false });
    }
  },

  createProject: async (name, description) => {
    const now = new Date().toISOString();
    const project: Project = {
      id: generateId(),
      name,
      description,
      createdAt: now,
      updatedAt: now,
    };
    await db.projects.add(project);
    // 重新加载列表以确保数据一致
    await get().loadProjects();
    return project;
  },

  deleteProject: async (id) => {
    // 级联删除：先删关联数据，再删项目本身
    await Promise.all([
      db.characters.deleteByProject(id),
      db.chapters.deleteByProject(id),
      db.foreshadows.deleteByProject(id),
      db.worldSettings.deleteByProject(id),
    ]);
    await db.projects.remove(id);
    await get().loadProjects();
  },

  updateProject: async (project) => {
    project.updatedAt = new Date().toISOString();
    await db.projects.update(project);
    await get().loadProjects();
  },
}));
