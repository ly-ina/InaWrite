/**
 * 应用根组件
 * 配置路由：Dashboard、项目管理、角色、章节、伏笔、世界观、资源
 */

import { useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import './styles/global.css';

export default function App() {
  return (
    <HashRouter>
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
      <ElectronIntegration />
    </HashRouter>
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
