/**
 * Electron 预加载脚本
 * 通过 contextBridge 安全地向渲染进程暴露 Electron API
 */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // ========== 应用信息 ==========
  getAppInfo: () => ipcRenderer.invoke('app:info'),

  // ========== 文件操作 ==========
  openFile: () => ipcRenderer.invoke('file:open'),
  saveFile: (filePath: string, content: string) => ipcRenderer.invoke('file:save', filePath, content),
  saveFileAs: (content: string, defaultName: string) => ipcRenderer.invoke('file:saveAs', content, defaultName),
  watchDir: (dirPath: string) => ipcRenderer.invoke('file:watch', dirPath),
  readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),

  // ========== 自动保存 ==========
  sendAutosaveData: (data: string) => ipcRenderer.send('autosave-data', data),
  getLatestAutosave: () => ipcRenderer.invoke('autosave:latest'),
  onAutosaveRequest: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('autosave-request', handler);
    return () => ipcRenderer.removeListener('autosave-request', handler);
  },
  onAutosaveDone: (callback: (info: { path: string; time: string }) => void) => {
    const handler = (_event: any, info: { path: string; time: string }) => callback(info);
    ipcRenderer.on('autosave-done', handler);
    return () => ipcRenderer.removeListener('autosave-done', handler);
  },

  // ========== 崩溃恢复 ==========
  onCrashRecovery: (callback: (data: { available: boolean; data?: string }) => void) => {
    const handler = (_event: any, data: { available: boolean; data?: string }) => callback(data);
    ipcRenderer.on('crash-recovery', handler);
    return () => ipcRenderer.removeListener('crash-recovery', handler);
  },

  // ========== 主题 ==========
  getNativeTheme: () => ipcRenderer.invoke('theme:getNative'),
  onThemeChanged: (callback: (theme: string) => void) => {
    const handler = (_event: any, theme: string) => callback(theme);
    ipcRenderer.on('theme-changed', handler);
    return () => ipcRenderer.removeListener('theme-changed', handler);
  },
});
