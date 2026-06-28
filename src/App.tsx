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

  // OTA 更新检测
  const doUpdateCheck = useCallback(async () => {
    const isNative = !!(window as any).Capacitor?.isNativePlatform?.();
    const isElectron = !!(window as any).electronBridge?.isElectron;
    if (!isNative && !isElectron) return; // 浏览器环境跳过

    console.log('[OTA] 检查更新...');
    const info = await checkForUpdate();
    if (info) {
      console.log('[OTA] 发现新版本:', info.version, 'platform:', info.fileExt);
      setUpdateInfo({
        version: info.version,
        changelog: info.changelog,
        downloadUrl: info.downloadUrl,
      });
      setUpdateDialog(true);
    } else {
      console.log('[OTA] 已是最新版本');
    }
  }, []);

  // 下载并安装更新
  const handleDownloadUpdate = async () => {
    if (!updateInfo) return;
    setIsDownloading(true);
    setUpdateProgress(0);
    setUpdateStatus('正在下载更新...');
    try {
      const filename = `InaKB-${updateInfo.version}${updateInfo.fileExt || '.apk'}`;
      const result = await downloadUpdate(updateInfo.downloadUrl, filename, (pct) => {
        setUpdateProgress(pct);
        setUpdateStatus(`下载中 ${pct}%`);
      });
      setUpdateDialog(false);
      if (result.platform === 'android') {
        setUpdateStatus('下载完成，准备安装...');
        setTimeout(() => installApk(result.uri), 500);
      } else {
        // PC: 浏览器下载已完成，提示用户
        setUpdateStatus('下载完成！请关闭应用后用新版本 exe 替换旧版');
      }
    } catch (err: any) {
      setUpdateStatus(`下载失败: ${err.message}`);
      setIsDownloading(false);
    }
  };

  // 启动时检查更新（延迟 3 秒，等应用初始化完成）
  useEffect(() => {
    const timer = setTimeout(doUpdateCheck, 3000);
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
        <ConfirmDialog
          title="发现新版本"
          message={`版本: ${updateInfo.version}${updateInfo.changelog ? '\n\n更新内容:\n' + updateInfo.changelog : ''}`}
          confirmLabel={isDownloading ? `下载中 ${updateProgress}%` : '立即更新'}
          cancelLabel="稍后"
          onConfirm={handleDownloadUpdate}
          onCancel={() => setUpdateDialog(false)}
        />
      )}

      {/* 更新状态提示 */}
      {updateStatus && (
        <div style={{
          position: 'fixed',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--surface)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '10px 20px',
          zIndex: 9999,
          boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
          fontSize: '14px',
        }}>
          {updateStatus}
          {isDownloading && (
            <div style={{
              width: '100%',
              height: '4px',
              background: 'var(--border-color)',
              borderRadius: '2px',
              marginTop: '6px',
            }}>
              <div style={{
                width: `${updateProgress}%`,
                height: '100%',
                background: 'var(--primary)',
                borderRadius: '2px',
                transition: 'width 0.3s',
              }} />
            </div>
          )}
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
