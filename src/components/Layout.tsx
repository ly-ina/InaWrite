/**
 * 主布局组件
 * 左侧导航栏（根据是否在项目内切换菜单） + 顶部面包屑 + 主内容区
 */

import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { useProjectStore } from '../store/projectStore';
import { useT } from '../i18n';
import { exportProject, readJSONFile, executeImport } from '../utils/importExport';
import { db } from '../db/database';
import GlobalSearch from './GlobalSearch';
import ShortcutPanel from './ShortcutPanel';
import styles from './Layout.module.css';

/** 顶级导航：项目列表 */
const TOP_NAV = [
  { path: '/projects', label: '作品', icon: '📚' },
];

/** 项目内子模块导航（进入项目后显示） */
const PROJECT_NAV = [
  { path: '/dashboard', label: '概览', icon: '🏠' },
  { path: '/outline', label: '大纲', icon: '📋' },
  { path: '/characters', label: '角色', icon: '👤' },
  { path: '/chapters', label: '章节', icon: '📖' },
  { path: '/timeline', label: '时间线', icon: '📅' },
  { path: '/foreshadows', label: '伏笔', icon: '🔮' },
  { path: '/worldsettings', label: '世界观', icon: '🌍' },
  { path: '/resources', label: '资源', icon: '💎' },
  { path: '/templates', label: '模板', icon: '📦' },
  { path: '/tags', label: '标签', icon: '🏷' },
  { path: '/ai', label: 'AI 助手', icon: '🤖' },
];

/** 面包屑路径映射 */
const BREADCRUMB_MAP: Record<string, string> = {
  '/projects': '作品列表',
  '/dashboard': '概览',
  '/outline': '大纲编辑器',
  '/characters': '角色管理',
  '/chapters': '章节管理',
  '/foreshadows': '伏笔追踪',
  '/timeline': '章节时间线',
  '/worldsettings': '世界观设定',
  '/resources': '资源追踪',
  '/templates': '模板与导入导出',
  '/tags': '标签管理',
  '/ai': 'AI 写作助手',
};

export default function Layout() {
  const { currentProject, theme, toggleTheme, sidebarCollapsed, toggleSidebar, setCurrentProject, triggerRefresh } = useAppStore();
  const { loadProjects } = useProjectStore();
  const { t, lang, setLang } = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState('');

  // 判断当前是否在项目内（有选中项目 + 不在作品列表页）
  const isInProject = currentProject !== null && location.pathname !== '/projects';

  // 当前使用的导航项
  const navItems = isInProject ? PROJECT_NAV : TOP_NAV;

  // 生成面包屑
  const breadcrumbParts: { label: string; path?: string }[] = [];
  if (isInProject) {
    breadcrumbParts.push({ label: currentProject!.name, path: '/dashboard' });
    const currentLabel = BREADCRUMB_MAP[location.pathname];
    if (currentLabel && location.pathname !== '/dashboard') {
      breadcrumbParts.push({ label: currentLabel });
    }
  } else {
    breadcrumbParts.push({ label: '作品列表' });
  }

  /** 返回作品列表 */
  const handleBackToProjects = () => {
    setCurrentProject(null);
    navigate('/projects');
  };

  /** 导出当前作品 */
  const handleExportCurrent = async () => {
    if (!currentProject) return;
    try {
      const json = await exportProject(currentProject);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentProject.name}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('导出失败:', err);
      alert('导出失败');
    }
  };

  /** 导入作品文件 */
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMsg('');
    try {
      const data = await readJSONFile(file);
      if (!data) { setImportMsg('文件格式无效'); return; }
      // 如果是完整导出且有 project 信息
      if (data.project) {
        // 先创建/更新项目
        const existingProject = (await db.projects.getAll())
          .find((p) => p.name === data.project.name);
        let projectId: string;
        if (existingProject) {
          projectId = existingProject.id;
        } else {
          const newProject = { ...data.project, id: crypto.randomUUID() };
          await db.projects.add(newProject);
          projectId = newProject.id;
        }
        await executeImport(projectId, data, false);
        setImportMsg(`✅ 导入成功：${data.project.name}`);
        // 刷新项目列表，并自动切换到导入的项目
        await loadProjects();
        const updated = (await db.projects.getAll()).find((p) => p.id === projectId);
        if (updated) {
          setCurrentProject(updated);
          navigate('/dashboard');
        }
        triggerRefresh();
      } else {
        setImportMsg('文件格式不支持（需要完整导出格式）');
      }
    } catch (err) {
      setImportMsg('导入失败：' + (err instanceof Error ? err.message : '未知错误'));
    }
    // 重置 input 以允许重复导入同一文件
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 同步 body class 以支持全局背景和组件外元素
  useEffect(() => {
    document.body.className = theme === 'light' ? 'light-theme' : '';
  }, [theme]);

  return (
    <div className={styles.layout} data-theme={theme}>
      {/* 全局搜索（Ctrl+K） */}
      <GlobalSearch />
      {/* 快捷键面板（?） */}
      <ShortcutPanel />
      {/* 左侧导航栏 */}
      <aside className={`${styles.sidebar} ${sidebarCollapsed ? styles.collapsed : ''}`}>
        <div className={styles.sidebarHeader}>
          {!sidebarCollapsed && (
            <h1 className={styles.logo} onClick={() => navigate('/')}>
              Novel InaKB
            </h1>
          )}
          <button className={styles.collapseBtn} onClick={toggleSidebar} title="折叠侧边栏">
            {sidebarCollapsed ? '☰' : '✕'}
          </button>
        </div>

        {/* 返回作品列表按钮（在项目内时显示） */}
        {isInProject && !sidebarCollapsed && (
          <button className={styles.backBtn} onClick={handleBackToProjects}>
            ← 返回作品列表
          </button>
        )}

        {currentProject && !sidebarCollapsed && (
          <div className={styles.projectInfo}>
            <span className={styles.projectName}>{currentProject.name}</span>
          </div>
        )}

        <nav className={styles.nav}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/dashboard'}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
              title={item.label}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {!sidebarCollapsed && <span className={styles.navLabel}>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          {!sidebarCollapsed && (
            <>
              {/* 导入导出 */}
              {currentProject && (
                <>
                  <button className={styles.themeToggle} onClick={handleExportCurrent} title="导出当前作品">
                    📤 导出作品
                  </button>
                </>
              )}
              <button className={styles.themeToggle} onClick={() => fileInputRef.current?.click()} title="导入作品文件">
                📥 导入作品
              </button>
              <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }}
                onChange={handleImportFile} />
              {importMsg && (
                <div style={{
                  fontSize: '11px', color: importMsg.startsWith('✅') ? 'var(--accent)' : 'var(--danger)',
                  marginTop: '4px', textAlign: 'center', wordBreak: 'break-all'
                }}>
                  {importMsg}
                </div>
              )}
              <div style={{ margin: '4px 0', borderTop: '1px solid var(--border-color)' }} />
              <button className={styles.themeToggle} onClick={toggleTheme}>
                {theme === 'dark' ? t('nav.themeLight') : t('nav.themeDark')}
              </button>
              <button className={styles.themeToggle} onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
                style={{ marginTop: '4px' }}>
                {lang === 'zh' ? '🌐 English' : '🌐 中文'}
              </button>
            </>
          )}
        </div>
      </aside>

      {/* 主内容区 */}
      <div className={styles.mainWrapper}>
        {/* 面包屑导航 */}
        {breadcrumbParts.length > 0 && (
          <div className={styles.breadcrumb}>
            {breadcrumbParts.map((part, i) => (
              <span key={i}>
                {i > 0 && <span className={styles.breadcrumbSep}> / </span>}
                {part.path ? (
                  <span
                    className={styles.breadcrumbLink}
                    onClick={() => {
                      if (part.path) navigate(part.path);
                    }}
                  >
                    {part.label}
                  </span>
                ) : (
                  <span className={styles.breadcrumbCurrent}>{part.label}</span>
                )}
              </span>
            ))}
          </div>
        )}
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
