/**
 * 角色相关状态管理
 */

import { create } from 'zustand';
import { db } from '../db/database';
import { generateId, type Character } from '../types';

interface CharacterState {
  characters: Character[];
  loading: boolean;

  loadCharacters: (projectId: string) => Promise<void>;
  createCharacter: (data: Omit<Character, 'id'>) => Promise<Character>;
  updateCharacter: (character: Character) => Promise<void>;
  deleteCharacter: (id: string) => Promise<void>;
}

export const useCharacterStore = create<CharacterState>((set) => ({
  characters: [],
  loading: false,

  loadCharacters: async (projectId) => {
    set({ loading: true });
    try {
      const characters = await db.characters.getByProject(projectId);
      set({ characters, loading: false });
    } catch (error) {
      console.error('加载角色列表失败:', error);
      set({ loading: false });
    }
  },

  createCharacter: async (data) => {
    const character: Character = {
      ...data,
      id: generateId(),
    };
    await db.characters.add(character);
    return character;
  },

  updateCharacter: async (character) => {
    await db.characters.update(character);
  },

  deleteCharacter: async (id) => {
    await db.characters.remove(id);
  },
}));
