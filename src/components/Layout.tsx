/**
 * 主布局组件
 * 左侧导航栏（根据是否在项目内切换菜单） + 顶部面包屑 + 主内容区
 */

import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { useT } from '../i18n';
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
  { path: '/characters', label: '角色', icon: '👤' },
  { path: '/chapters', label: '章节', icon: '📖' },
  { path: '/timeline', label: '时间线', icon: '📅' },
  { path: '/foreshadows', label: '伏笔', icon: '🔮' },
  { path: '/worldsettings', label: '世界观', icon: '🌍' },
  { path: '/resources', label: '资源', icon: '💎' },
  { path: '/templates', label: '模板', icon: '📦' },
];

/** 面包屑路径映射 */
const BREADCRUMB_MAP: Record<string, string> = {
  '/projects': '作品列表',
  '/dashboard': '概览',
  '/characters': '角色管理',
  '/chapters': '章节管理',
  '/foreshadows': '伏笔追踪',
  '/timeline': '章节时间线',
  '/worldsettings': '世界观设定',
  '/resources': '资源追踪',
  '/templates': '模板与导入导出',
};

export default function Layout() {
  const { currentProject, theme, toggleTheme, sidebarCollapsed, toggleSidebar, setCurrentProject } = useAppStore();
  const { t, lang, setLang } = useT();
  const navigate = useNavigate();
  const location = useLocation();

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
              Novel KB
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
