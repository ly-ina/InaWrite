/**
 * 应用根组件
 * 配置路由：Dashboard、项目管理、角色、章节、伏笔、世界观、资源
 * 包含 Android 返回按钮处理：按导航栈逐级返回，顶层弹窗确认退出
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import ConfirmDialog from './components/ConfirmDialog';
import Layout from './components/Layout';
import DashboardPage from './pages/Dashboard';
import ProjectsPage from './pages/Projects';
import CharactersPage from './pages/Characters';
import ChaptersPage from './pages/Chapters';
import TimelinePage from './pages/Timeline';
import ForeshadowsPage from './pages/Foreshadows';
import WorldSettingsPage from './pages/WorldSettings';
import ResourcesPage from './pages/Resources';
import TemplatesPage from './pages/Templates';
import AIAssistantPage from './pages/AIAssistant';
import OutlinePage from './pages/Outline';
import TagsPage from './pages/Tags';
import AboutPage from './pages/About';
import { electronBridge } from './utils/electronBridge';
import { useAppStore } from './store/appStore';
import { db } from './db/database';
import { checkForUpdate, downloadUpdate, installApk, getCurrentVersion } from './utils/updater';
import './styles/global.css';

export default function App() {
  return (
    <HashRouter>
      <AppRoutes />
      <ElectronIntegration />
    </HashRouter>
  );
}

/** 路由 + Android 返回按钮处理 + OTA 更新检测 */
function AppRoutes() {
  const navStackRef = useRef<string[]>([]);
  const [exitDialog, setExitDialog] = useState(false);
  const [updateDialog, setUpdateDialog] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{ version: string; changelog: string; downloadUrl: string; fileExt?: string } | null>(null);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('');
  const [toastMessage, setToastMessage] = useState(''); // 通用通知弹窗

  // 显示通知弹窗（替代 alert）
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // OTA 更新检测
  const doUpdateCheck = useCallback(async (silent = false) => {
    const isNative = !!(window as any).Capacitor?.isNativePlatform?.();
    const isElectron = !!(window as any).electronAPI;
    if (!isNative && !isElectron) {
      if (!silent) showToast('当前为浏览器环境，无法检测更新');
      return 'web';
    }

    // 检查是否已跳过此版本
    const skippedVersion = localStorage.getItem('inakb_skip_update');
    const info = await checkForUpdate();
    if (!info) {
      if (!silent) showToast('已是最新版本 ✨');
      return null;
    }
    if (info.versionCode.toString() === skippedVersion && silent) return null;

    console.log('[OTA] 发现新版本:', info.version, 'platform:', info.fileExt);
    setUpdateInfo({
      version: info.version,
      changelog: info.changelog,
      downloadUrl: info.downloadUrl,
      fileExt: info.fileExt,
    });
    setUpdateDialog(true);
    return 'found';
  }, []);

  // 跳过此版本
  const skipUpdate = () => {
    if (updateInfo) {
      localStorage.setItem('inakb_skip_update', updateInfo.version.replace(/[^0-9]/g, '') || String(Date.now()));
    }
    setUpdateDialog(false);
  };

  // 下载并安装更新
  const handleDownloadUpdate = async () => {
    if (!updateInfo) return;
    // PC 端：直接打开 GitHub Release 页面（exe 太大不适合 OTA 下载）
    if (updateInfo.fileExt === '.exe') {
      window.open(updateInfo.downloadUrl, '_blank');
      setUpdateDialog(false);
      setUpdateStatus('已在浏览器中打开下载页面，请手动下载最新版本');
      return;
    }
    // Android 端：OTA 下载 APK
    setIsDownloading(true);
    setUpdateProgress(0);
    setUpdateStatus('正在下载更新...');
    try {
      const filename = `InaKB-${updateInfo.version}.apk`;
      const result = await downloadUpdate(updateInfo.downloadUrl, filename, (pct) => {
        setUpdateProgress(pct);
        setUpdateStatus(`下载中 ${pct}%`);
      });
      setUpdateDialog(false);
      setUpdateStatus('下载完成，准备安装...');
      setTimeout(() => installApk(result.uri), 500);
    } catch (err: any) {
      setUpdateStatus(`下载失败: ${err.message}`);
      setIsDownloading(false);
    }
  };

  // 暴露给 About 页面调用
  useEffect(() => {
    (window as any).__inakbCheckUpdate = () => doUpdateCheck(false);
    return () => { delete (window as any).__inakbCheckUpdate; };
  }, [doUpdateCheck]);

  // 启动时检查更新（延迟 3 秒，静默模式）
  useEffect(() => {
    const timer = setTimeout(() => doUpdateCheck(true), 3000);
    return () => clearTimeout(timer);
  }, [doUpdateCheck]);

  // 维护导航历史栈（HashRouter 下 window.history.back 不可靠）
  useEffect(() => {
    const track = () => {
      const path = window.location.hash.replace('#/', '/') || '/projects';
      const stack = navStackRef.current;
      // 如果当前已经在栈顶，不重复
      if (stack.length > 0 && stack[stack.length - 1] === path) return;
      stack.push(path);
      if (stack.length > 30) stack.shift();
    };
    track();
    window.addEventListener('hashchange', track);
    return () => window.removeEventListener('hashchange', track);
  }, []);

  // Android 返回按钮处理
  useEffect(() => {
    let handle: { remove: () => Promise<void> } | null = null;

    // 检测是否在 Capacitor 原生环境中
    const isNative = !!(window as any).Capacitor?.isNativePlatform?.();

    if (!isNative) return; // 浏览器环境跳过

    const setupBackButton = async () => {
      try {
        handle = await CapacitorApp.addListener('backButton', () => {
          // 1. 关闭全屏详情覆盖层
          const overlay = document.querySelector('.detail-full-overlay');
          if (overlay) {
            const backBtn = overlay.querySelector('.detail-full-back') as HTMLElement;
            if (backBtn) { backBtn.click(); return; }
          }

          // 2. 关闭侧边栏
          const sidebar = document.querySelector('.sf-sidebar.open');
          if (sidebar) {
            const mask = document.querySelector('.mobile-overlay') as HTMLElement;
            if (mask) { mask.click(); return; }
          }

          // 3. 关闭模态框
          const modal = document.querySelector('.modal-overlay');
          if (modal) {
            (modal as HTMLElement).click();
            return;
          }

          // 4. 导航栈返回
          const stack = navStackRef.current;
          if (stack.length > 1) {
            stack.pop();
            const prev = stack[stack.length - 1];
            stack.pop();
            window.location.hash = '#' + prev;
          } else {
            // 5. 顶层 → 弹出确认退出弹窗
            setExitDialog(true);
          }
        });
      } catch (err) {
        console.log('BackButton setup failed (non-native environment):', err);
      }
    };

    setupBackButton();

    return () => {
      if (handle) handle.remove();
    };
  }, []);

  return (
    <>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/projects" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="characters" element={<CharactersPage />} />
          <Route path="chapters" element={<ChaptersPage />} />
          <Route path="timeline" element={<TimelinePage />} />
          <Route path="foreshadows" element={<ForeshadowsPage />} />
          <Route path="worldsettings" element={<WorldSettingsPage />} />
          <Route path="resources" element={<ResourcesPage />} />
          <Route path="templates" element={<TemplatesPage />} />
          <Route path="ai" element={<AIAssistantPage />} />
          <Route path="outline" element={<OutlinePage />} />
          <Route path="tags" element={<TagsPage />} />
          <Route path="about" element={<AboutPage />} />
        </Route>
      </Routes>

      {/* 退出确认弹窗 */}
      {exitDialog && (
        <ConfirmDialog
          title="退出应用"
          message="确定要退出 Novel InaKB 吗？"
          confirmLabel="退出"
          danger
          onConfirm={() => CapacitorApp.exitApp()}
          onCancel={() => setExitDialog(false)}
        />
      )}

      {/* OTA 更新弹窗 */}
      {updateDialog && updateInfo && (
        <div className="modal-overlay" onClick={() => setUpdateDialog(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', padding: '28px 24px 20px' }}>
            {/* 顶部图标 */}
            <div style={{
              width: '64px', height: '64px', margin: '0 auto 14px',
              background: 'linear-gradient(135deg, var(--accent-dim), var(--accent))',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '28px', boxShadow: '0 4px 16px rgba(201,169,110,0.3)',
            }}>🚀</div>

            <h3 style={{ textAlign: 'center', marginBottom: '4px', fontFamily: 'var(--font-serif)', fontSize: '18px' }}>
              发现新版本
            </h3>

            {/* 版本号 */}
            <div style={{ textAlign: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                {updateInfo.version}
              </span>
              <span style={{
                display: 'inline-block', marginLeft: '8px', padding: '2px 8px', borderRadius: '10px',
                fontSize: '11px', background: updateInfo.fileExt === '.exe' ? 'rgba(107,140,201,0.15)' : 'rgba(90,158,111,0.15)',
                color: updateInfo.fileExt === '.exe' ? '#6b8cc9' : '#5a9e6f',
                verticalAlign: 'super',
              }}>
                {updateInfo.fileExt === '.exe' ? '🖥️ PC' : '📱 Android'}
              </span>
            </div>

            {/* 更新日志 */}
            {updateInfo.changelog && (
              <div style={{
                background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)',
                padding: '12px 14px', marginBottom: '16px', maxHeight: '130px', overflow: 'auto',
                border: '1px solid var(--border-color)',
              }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                  📋 更新内容
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {updateInfo.changelog}
                </div>
              </div>
            )}

            {/* 下载进度条 */}
            {isDownloading && (
              <div style={{ marginBottom: '14px' }}>
                <div style={{
                  width: '100%', height: '6px', background: 'var(--bg-secondary)',
                  borderRadius: '3px', overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${updateProgress}%`, height: '100%',
                    background: 'linear-gradient(90deg, var(--accent), #e0c87a)',
                    borderRadius: '3px', transition: 'width 0.3s',
                  }} />
                </div>
                <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  下载中 {updateProgress}%
                </div>
              </div>
            )}

            {/* 按钮 */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button className="btn" onClick={skipUpdate} style={{ fontSize: '13px', padding: '8px 16px', color: 'var(--text-muted)' }}>
                不再提醒
              </button>
              <button className="btn" onClick={() => setUpdateDialog(false)} style={{ fontSize: '13px', padding: '8px 20px' }}>
                稍后
              </button>
              <button
                className="btn btn-primary"
                onClick={handleDownloadUpdate}
                disabled={isDownloading}
                style={{
                  fontSize: '13px', padding: '8px 24px', fontWeight: 600,
                  background: 'linear-gradient(135deg, var(--accent), #b8943a)',
                  border: 'none',
                }}
              >
                {isDownloading ? '下载中...' : '⚡ 立即更新'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 更新状态提示（下载中/完成/错误） */}
      {updateStatus && (
        <div className="toast-container">
          <div className="toast-card">
            <span className="toast-icon">{isDownloading ? '⏳' : updateStatus.includes('失败') ? '❌' : '✅'}</span>
            <span className="toast-text">{updateStatus}</span>
            {isDownloading && (
              <div className="toast-progress">
                <div className="toast-progress-fill" style={{ width: `${updateProgress}%` }} />
              </div>
            )}
            {!isDownloading && (
              <button className="toast-close" onClick={() => setUpdateStatus('')}>×</button>
            )}
          </div>
        </div>
      )}

      {/* 通用通知弹窗（替代 alert） */}
      {toastMessage && (
        <div className="toast-container">
          <div className="toast-card" onClick={() => setToastMessage('')}>
            <span className="toast-icon">💬</span>
            <span className="toast-text">{toastMessage}</span>
            <button className="toast-close" onClick={(e) => { e.stopPropagation(); setToastMessage(''); }}>×</button>
          </div>
        </div>
      )}
    </>
  );
}

/** Electron 桌面环境集成组件（浏览器中无操作） */
function ElectronIntegration() {
  const cleanupRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    if (!electronBridge.isElectron) return;

    // 1. 自动保存：监听主进程的保存请求
    const unsubAutosave = electronBridge.onAutosaveRequest(async () => {
      try {
        const state = useAppStore.getState();
        if (!state.currentProject) return;
        const characters = await db.characters.getByProject(state.currentProject.id);
        const chapters = await db.chapters.getByProject(state.currentProject.id);
        const foreshadows = await db.foreshadows.getByProject(state.currentProject.id);
        const worldSettings = await db.worldSettings.getByProject(state.currentProject.id);
        const data = JSON.stringify({
          project: state.currentProject,
          characters,
          chapters,
          foreshadows,
          worldSettings,
          savedAt: new Date().toISOString(),
        });
        electronBridge.sendAutosave(data);
      } catch (err) {
        console.error('[AutoSave] 收集数据失败:', err);
      }
    });
    cleanupRef.current.push(unsubAutosave);

    // 2. 崩溃恢复：检查上次是否有未保存的数据
    const unsubCrash = electronBridge.onCrashRecovery(async (recovery) => {
      if (recovery.available && recovery.data) {
        console.log('[Recovery] 发现崩溃前的自动保存数据');
        const shouldRestore = window.confirm(
          '检测到上次异常退出前的自动保存数据，是否恢复？\n\n（选择"取消"将忽略自动保存）'
        );
        if (shouldRestore) {
          try {
            const parsed = JSON.parse(recovery.data);
            console.log('[Recovery] 恢复数据:', parsed.savedAt);
            if (parsed.project) {
              const appStore = useAppStore.getState();
              if (parsed.characters?.length) await db.characters.addMany(parsed.characters);
              if (parsed.chapters?.length) await db.chapters.addMany(parsed.chapters);
              if (parsed.foreshadows?.length) await db.foreshadows.addMany(parsed.foreshadows);
              if (parsed.worldSettings?.length) await db.worldSettings.addMany(parsed.worldSettings);
              appStore.triggerRefresh();
              alert('数据已从自动保存恢复！');
            }
          } catch {
            console.error('[Recovery] 解析恢复数据失败');
          }
        }
      }
    });
    cleanupRef.current.push(unsubCrash);

    // 3. 原生主题同步
    electronBridge.getNativeTheme().then((nativeTheme) => {
      if (nativeTheme === 'dark' || nativeTheme === 'light') {
        const appStore = useAppStore.getState();
        if (appStore.theme !== nativeTheme) {
          appStore.setTheme(nativeTheme);
        }
      }
    });

    const unsubTheme = electronBridge.onThemeChanged((theme) => {
      const appStore = useAppStore.getState();
      appStore.setTheme(theme as 'light' | 'dark');
    });
    cleanupRef.current.push(unsubTheme);

    return () => {
      cleanupRef.current.forEach((fn) => fn());
    };
  }, []);

  return null;
}
