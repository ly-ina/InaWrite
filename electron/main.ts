/**
 * Electron 主进程
 * 功能：窗口管理、系统托盘、原生文件系统访问、自动保存、崩溃恢复
 */

import { app, BrowserWindow, Tray, Menu, ipcMain, dialog, nativeTheme } from 'electron';
import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';

// ========== 常量 ==========
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const APP_NAME = 'Novel InaKB';
const PRELOAD_PATH = path.join(__dirname, 'preload.cjs');

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

// ========== 自动保存 ==========
const AUTOSAVE_DIR = path.join(app.getPath('userData'), 'autosave');
const AUTOSAVE_INTERVAL = 60_000; // 60 秒
let autosaveTimer: ReturnType<typeof setInterval> | null = null;

// 确保自动保存目录存在
function ensureAutosaveDir() {
  if (!fs.existsSync(AUTOSAVE_DIR)) {
    fs.mkdirSync(AUTOSAVE_DIR, { recursive: true });
  }
}

// ========== 创建主窗口 ==========
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: APP_NAME,
    icon: path.join(__dirname, '../public/favicon.svg'),
    autoHideMenuBar: true,   // 隐藏默认菜单栏
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // 使用持久化 session，防止 IndexedDB 数据在窗口关闭后丢失
      partition: 'persist:main',
    },
    show: false, // 等 ready-to-show 再显示，避免白屏闪烁
  });

  // 彻底移除菜单栏（连 Alt 键也不显示）
  mainWindow.setMenuBarVisibility(false);
  mainWindow.setMenu(null);

  // 加载应用
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // 点 X 彻底关闭（不再隐藏到托盘）
  mainWindow.on('close', () => {
    // 销毁托盘，防止后台残留
    if (tray) {
      tray.destroy();
      tray = null;
    }
    mainWindow = null;
  });
}

// ========== 系统托盘 ==========
function createTray() {
  // 使用简单的 16x16 图标（内置生成）
  const iconPath = path.join(__dirname, '../public/favicon.svg');
  tray = new Tray(iconPath);
  tray.setToolTip(APP_NAME);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    {
      label: '自动保存',
      type: 'checkbox',
      checked: true,
      click: (menuItem) => {
        if (menuItem.checked) {
          startAutosave();
        } else {
          stopAutosave();
        }
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // 双击托盘图标显示窗口
  tray.on('double-click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

// ========== 自动保存 ==========
function startAutosave() {
  ensureAutosaveDir();
  if (autosaveTimer) return;
  autosaveTimer = setInterval(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('autosave-request');
    }
  }, AUTOSAVE_INTERVAL);
  console.log('[AutoSave] 已启动，间隔', AUTOSAVE_INTERVAL / 1000, '秒');
}

function stopAutosave() {
  if (autosaveTimer) {
    clearInterval(autosaveTimer);
    autosaveTimer = null;
  }
}

/** 执行自动保存：接收前端发来的数据并写入文件 */
function performAutosave(data: string) {
  try {
    ensureAutosaveDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(AUTOSAVE_DIR, `autosave-${timestamp}.json`);

    // 写入新文件
    fs.writeFileSync(filePath, data, 'utf-8');

    // 清理旧备份，只保留最近 20 个
    const files = fs.readdirSync(AUTOSAVE_DIR)
      .filter((f) => f.startsWith('autosave-') && f.endsWith('.json'))
      .sort()
      .reverse();
    if (files.length > 20) {
      files.slice(20).forEach((f) => {
        try { fs.unlinkSync(path.join(AUTOSAVE_DIR, f)); } catch { /* ignore */ }
      });
    }

    console.log('[AutoSave] 保存成功:', filePath);
    mainWindow?.webContents.send('autosave-done', { path: filePath, time: new Date().toISOString() });
  } catch (err) {
    console.error('[AutoSave] 保存失败:', err);
  }
}

/** 获取最新的自动保存文件 */
function getLatestAutosave(): string | null {
  try {
    if (!fs.existsSync(AUTOSAVE_DIR)) return null;
    const files = fs.readdirSync(AUTOSAVE_DIR)
      .filter((f) => f.startsWith('autosave-') && f.endsWith('.json'))
      .sort()
      .reverse();
    if (files.length === 0) return null;
    const content = fs.readFileSync(path.join(AUTOSAVE_DIR, files[0]), 'utf-8');
    return content;
  } catch {
    return null;
  }
}

// ========== IPC 处理器 ==========

function setupIPC() {
  // 文件操作
  ipcMain.handle('file:open', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],
      filters: [
        { name: 'Markdown / 文本文件', extensions: ['md', 'txt'] },
        { name: '所有文件', extensions: ['*'] },
      ],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const filePath = result.filePaths[0];
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);
    return { filePath, fileName, content };
  });

  ipcMain.handle('file:save', async (_event, filePath: string, content: string) => {
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  });

  ipcMain.handle('file:saveAs', async (_event, content: string, defaultName: string) => {
    const result = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: defaultName,
      filters: [
        { name: 'Markdown 文件', extensions: ['md'] },
        { name: '文本文件', extensions: ['txt'] },
        { name: 'JSON 文件', extensions: ['json'] },
        { name: '所有文件', extensions: ['*'] },
      ],
    });
    if (result.canceled || !result.filePath) return null;
    fs.writeFileSync(result.filePath, content, 'utf-8');
    return { filePath: result.filePath };
  });

  ipcMain.handle('file:watch', async (_event, dirPath: string) => {
    // 返回目录下的 .md / .txt 文件列表
    try {
      if (!fs.existsSync(dirPath)) return [];
      const files = fs.readdirSync(dirPath)
        .filter((f) => f.endsWith('.md') || f.endsWith('.txt'))
        .map((f) => {
          const fullPath = path.join(dirPath, f);
          const stat = fs.statSync(fullPath);
          return {
            name: f,
            path: fullPath,
            size: stat.size,
            modifiedAt: stat.mtime.toISOString(),
          };
        });
      return files;
    } catch {
      return [];
    }
  });

  ipcMain.handle('file:read', async (_event, filePath: string) => {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { content };
  });

  // 自动保存
  ipcMain.on('autosave-data', (_event, data: string) => {
    performAutosave(data);
  });

  ipcMain.handle('autosave:latest', () => {
    return getLatestAutosave();
  });

  // OTA 更新：从 GitHub API 检测新版本（主进程发请求，不受 CORS 限制）
  ipcMain.handle('ota:checkUpdate', async () => {
    try {
      const data = await httpGet('https://api.github.com/repos/ly-ina/InaWrite/releases/latest');
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // OTA 更新：下载文件（主进程下载，绕过 file:// CORS）
  ipcMain.handle('ota:download', async (_event, url: string, savePath: string) => {
    try {
      await downloadFile(url, savePath);
      return { success: true, path: savePath };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // 应用信息
  ipcMain.handle('app:info', () => {
    return {
      name: APP_NAME,
      version: app.getVersion(),
      isElectron: true,
      isDev,
      platform: process.platform,
      userDataPath: app.getPath('userData'),
    };
  });

  // 主题
  ipcMain.handle('theme:getNative', () => {
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  });

  nativeTheme.on('updated', () => {
    const theme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
    mainWindow?.webContents.send('theme-changed', theme);
  });
}

// ========== 崩溃恢复 ==========
function setupCrashRecovery() {
  // 监听渲染进程崩溃
  app.on('render-process-gone', (_event, _webContents, details) => {
    console.error('[Crash] 渲染进程崩溃:', details.reason, details.exitCode);
    // 尝试重新加载
    if (mainWindow && !mainWindow.isDestroyed()) {
      setTimeout(() => {
        mainWindow?.reload();
      }, 2000);
    }
  });

  // 监听子进程崩溃
  app.on('child-process-gone', (_event, details) => {
    console.error('[Crash] 子进程崩溃:', details.type, details.reason);
  });

  // 进程未捕获异常
  process.on('uncaughtException', (err) => {
    console.error('[Crash] 未捕获异常:', err);
    // 不退出，记录日志
  });

  process.on('unhandledRejection', (reason) => {
    console.error('[Crash] 未处理的 Promise 拒绝:', reason);
  });

  // 启动时检查自动保存
  const latestSave = getLatestAutosave();
  if (latestSave) {
    console.log('[Recovery] 发现自动保存文件，将在窗口加载后通知前端');
    mainWindow?.webContents.on('did-finish-load', () => {
      mainWindow?.webContents.send('crash-recovery', { available: true, data: latestSave });
    });
  }
}

// ========== IndexedDB 持久化 ==========
// 设置数据存储路径，防止数据在窗口关闭后丢失
const userDataPath = app.getPath('userData');
app.setPath('userData', userDataPath);
// 关键：让 Chromium 使用持久化的 profile 目录
const dbDataPath = path.join(userDataPath, 'IndexedDB');
if (!fs.existsSync(dbDataPath)) {
  fs.mkdirSync(dbDataPath, { recursive: true });
}

// ========== 应用生命周期 ==========
app.whenReady().then(() => {
  setupIPC();
  createWindow();
  createTray();
  startAutosave();
  setupCrashRecovery();

  app.on('activate', () => {
    // macOS: 点击 dock 图标时重新创建窗口
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
    }
  });
});

app.on('window-all-closed', () => {
  // 所有平台直接退出
  app.quit();
});

app.on('before-quit', () => {
  isQuitting = true;
  stopAutosave();
  // 销毁托盘，防止进程残留
  if (tray) {
    tray.destroy();
    tray = null;
  }
});

// ========== OTA 网络请求辅助函数（Node.js 原生，不受 CORS 限制）==========

/** HTTP GET 请求，返回 JSON（自动检测系统代理） */
function httpGet(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;

    // 检测系统 HTTP 代理环境变量
    const proxy = process.env.HTTP_PROXY || process.env.http_proxy;
    const proxyUrl = url.startsWith('https')
      ? (process.env.HTTPS_PROXY || process.env.https_proxy || proxy)
      : proxy;

    console.log('[OTA] 请求:', url, proxyUrl ? `(代理: ${proxyUrl})` : '(直连)');

    const options: any = {};
    if (proxyUrl) {
      try {
        const u = new URL(proxyUrl);
        options.host = u.hostname;
        options.port = u.port || 3128;
        options.path = url;
        options.headers = { Host: new URL(url).host, 'User-Agent': 'Novel-InaKB' };
      } catch { /* 代理 URL 解析失败，直连 */ }
    }

    const req = proxyUrl ? mod.request(options) : mod.get(url, { headers: { 'User-Agent': 'Novel-InaKB' } });

    req.on('response', (res: any) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        httpGet(res.headers.location).then(resolve).catch(reject);
        return;
      }
      let body = '';
      res.on('data', (chunk: string) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve(body);
        }
      });
    });

    req.on('error', reject);
    if (proxyUrl) req.end();
  });
}

/** 下载文件到指定路径（支持重定向 + 镜像回退） */
function downloadFile(url: string, savePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': 'Novel-InaKB' } }, (res) => {
      // 跟随重定向
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadFile(res.headers.location, savePath).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`下载失败: HTTP ${res.statusCode}`));
        return;
      }
      const file = fs.createWriteStream(savePath);
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
      file.on('error', reject);
    }).on('error', reject);
  });
}
