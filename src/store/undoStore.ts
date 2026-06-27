/**
 * 撤销/重做 (Undo/Redo) 系统
 * 基于命令模式，记录所有增删改操作的历史
 * 支持 Ctrl+Z / Ctrl+Y 快捷键
 */

import { create } from 'zustand';

/** 操作类型 */
export type ActionType = 'create' | 'update' | 'delete';

/** 操作目标 */
export type ActionTarget = 'project' | 'character' | 'chapter' | 'foreshadow' | 'worldsetting' | 'resource';

/** 历史记录条目 */
export interface HistoryEntry {
  id: string;
  type: ActionType;
  target: ActionTarget;
  description: string;        // 用户可读的描述
  data: unknown;              // 操作前的数据（用于撤销）
  reverseData?: unknown;      // 操作后的数据（用于重做）
  timestamp: number;
}

interface UndoState {
  // 历史栈
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];

  // 最大历史记录数
  maxHistory: number;

  // 推送一条记录到撤销栈
  pushUndo: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void;

  // 撤销
  undo: () => HistoryEntry | null;

  // 重做
  redo: () => HistoryEntry | null;

  // 清空历史
  clear: () => void;

  // 是否可撤销/重做
  canUndo: () => boolean;
  canRedo: () => boolean;

  // 获取最后一条撤销记录
  lastUndo: () => HistoryEntry | null;
  lastRedo: () => HistoryEntry | null;
}

export const useUndoStore = create<UndoState>((set, get) => ({
  undoStack: [],
  redoStack: [],
  maxHistory: 100,

  pushUndo: (entry) => {
    set((state) => {
      const newEntry: HistoryEntry = {
        ...entry,
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        timestamp: Date.now(),
      };
      const newStack = [...state.undoStack, newEntry];
      // 保持历史栈不超过最大长度
      if (newStack.length > state.maxHistory) {
        newStack.shift();
      }
      return {
        undoStack: newStack,
        redoStack: [], // 新操作清空重做栈
      };
    });
  },

  undo: () => {
    const { undoStack, redoStack } = get();
    if (undoStack.length === 0) return null;
    const newUndo = [...undoStack];
    const entry = newUndo.pop()!;
    set({
      undoStack: newUndo,
      redoStack: [...redoStack, entry],
    });
    return entry;
  },

  redo: () => {
    const { undoStack, redoStack } = get();
    if (redoStack.length === 0) return null;
    const newRedo = [...redoStack];
    const entry = newRedo.pop()!;
    set({
      undoStack: [...undoStack, entry],
      redoStack: newRedo,
    });
    return entry;
  },

  clear: () => set({ undoStack: [], redoStack: [] }),

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  lastUndo: () => {
    const stack = get().undoStack;
    return stack.length > 0 ? stack[stack.length - 1] : null;
  },

  lastRedo: () => {
    const stack = get().redoStack;
    return stack.length > 0 ? stack[stack.length - 1] : null;
  },
}));

/**
 * 在组件中使用 Undo/Redo 的 Hook
 * 自动绑定 Ctrl+Z / Ctrl+Y 快捷键
 */
import { useEffect } from 'react';

export function useUndoRedo(
  onUndo: (entry: HistoryEntry) => Promise<void>,
  onRedo: (entry: HistoryEntry) => Promise<void>
) {
  const { undo, redo, canUndo, canRedo } = useUndoStore();

  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo()) {
          const entry = undo();
          if (entry) await onUndo(entry);
        }
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (canRedo()) {
          const entry = redo();
          if (entry) await onRedo(entry);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, canUndo, canRedo, onUndo, onRedo]);
}
