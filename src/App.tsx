/**
 * 应用根组件
 * 配置路由：Dashboard、项目管理、角色、章节、伏笔、世界观、资源
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/Dashboard';
import ProjectsPage from './pages/Projects';
import CharactersPage from './pages/Characters';
import ChaptersPage from './pages/Chapters';
import ForeshadowsPage from './pages/Foreshadows';
import WorldSettingsPage from './pages/WorldSettings';
import ResourcesPage from './pages/Resources';
import './styles/global.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* 默认跳转到项目列表 */}
          <Route index element={<Navigate to="/projects" replace />} />
          {/* 作品 Dashboard */}
          <Route path="dashboard" element={<DashboardPage />} />
          {/* 项目管理 */}
          <Route path="projects" element={<ProjectsPage />} />
          {/* 角色管理 */}
          <Route path="characters" element={<CharactersPage />} />
          {/* 章节管理 */}
          <Route path="chapters" element={<ChaptersPage />} />
          {/* 伏笔追踪 */}
          <Route path="foreshadows" element={<ForeshadowsPage />} />
          {/* 世界观设定 */}
          <Route path="worldsettings" element={<WorldSettingsPage />} />
          {/* 资源追踪 */}
          <Route path="resources" element={<ResourcesPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
