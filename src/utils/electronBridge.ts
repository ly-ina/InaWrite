/**
 * Electron 桥接层
 * 在浏览器和 Electron 环境中提供统一 API
 * 浏览器环境返回 null/空实现，Electron 环境调用真实的 IPC
 */

// ========== 类型声明 ==========
interface ElectronFileResult {
  filePath: string;
  fileName: string;
  content: string;
}

interface WatchFile {
  name: string;
  path: string;
  size: number;
  modifiedAt: string;
}

interface AppInfo {
  name: string;
  version: string;
  isElectron: boolean;
  isDev: boolean;
  platform: string;
  userDataPath: string;
}

// ========== API 封装 ==========
const api = (window as any).electronAPI;

export const electronBridge = {
  /** 是否在 Electron 环境中运行 */
  get isElectron(): boolean {
    return !!api;
  },

  /** 获取应用信息 */
  getAppInfo: (): Promise<AppInfo | null> => {
    return api?.getAppInfo?.() ?? Promise.resolve(null);
  },

  // ========== 文件操作 ==========
  /** 打开文件对话框，返回文件路径和内容 */
  openFile: (): Promise<ElectronFileResult | null> => {
    return api?.openFile?.() ?? Promise.resolve(null);
  },

  /** 保存文件到指定路径 */
  saveFile: (filePath: string, content: string): Promise<{ success: boolean } | null> => {
    return api?.saveFile?.(filePath, content) ?? Promise.resolve(null);
  },

  /** 另存为对话框 */
  saveFileAs: (content: string, defaultName: string): Promise<{ filePath: string } | null> => {
    return api?.saveFileAs?.(content, defaultName) ?? Promise.resolve(null);
  },

  /** 监视目录，返回文件列表 */
  watchDir: (dirPath: string): Promise<WatchFile[]> => {
    return api?.watchDir?.(dirPath) ?? Promise.resolve([]);
  },

  /** 读取文件内容 */
  readFile: (filePath: string): Promise<{ content: string } | null> => {
    return api?.readFile?.(filePath) ?? Promise.resolve(null);
  },

  // ========== 自动保存 ==========
  /** 发送自动保存数据到主进程 */
  sendAutosave: (data: string): void => {
    api?.sendAutosaveData?.(data);
  },

  /** 获取最新自动保存 */
  getLatestAutosave: (): Promise<string | null> => {
    return api?.getLatestAutosave?.() ?? Promise.resolve(null);
  },

  /** 监听自动保存请求（返回取消监听的函数） */
  onAutosaveRequest: (callback: () => void): (() => void) => {
    return api?.onAutosaveRequest?.(callback) ?? (() => {});
  },

  /** 监听自动保存完成 */
  onAutosaveDone: (callback: (info: { path: string; time: string }) => void): (() => void) => {
    return api?.onAutosaveDone?.(callback) ?? (() => {});
  },

  // ========== 崩溃恢复 ==========
  /** 监听崩溃恢复 */
  onCrashRecovery: (callback: (data: { available: boolean; data?: string }) => void): (() => void) => {
    return api?.onCrashRecovery?.(callback) ?? (() => {});
  },

  // ========== 主题 ==========
  /** 获取系统原生主题 */
  getNativeTheme: (): Promise<string | null> => {
    return api?.getNativeTheme?.() ?? Promise.resolve(null);
  },

  /** 监听系统主题变化 */
  onThemeChanged: (callback: (theme: string) => void): (() => void) => {
    return api?.onThemeChanged?.(callback) ?? (() => {});
  },
};
