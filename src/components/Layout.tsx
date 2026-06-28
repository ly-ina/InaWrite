/**
 * 主布局组件
 * 左侧导航栏（根据是否在项目内切换菜单） + 顶部面包屑 + 主内容区
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { useProjectStore } from '../store/projectStore';
import { useT } from '../i18n';
import { exportProject, readJSONFile, executeImport } from '../utils/importExport';
import { db } from '../db/database';
import GlobalSearch from './GlobalSearch';
import ShortcutPanel from './ShortcutPanel';
import styles from './Layout.module.css';

function isMobile() { return window.innerWidth <= 768; }

/** 导航 key 映射到翻译 key */
const NAV_I18N_MAP: Record<string, { labelKey: string; icon: string }> = {
  '/projects':  { labelKey: 'nav.projects', icon: '📚' },
  '/dashboard': { labelKey: 'nav.dashboard', icon: '🏠' },
  '/outline':   { labelKey: 'nav.outline', icon: '📋' },
  '/characters': { labelKey: 'nav.characters', icon: '👤' },
  '/chapters':  { labelKey: 'nav.chapters', icon: '📖' },
  '/timeline':  { labelKey: 'nav.timeline', icon: '📅' },
  '/foreshadows': { labelKey: 'nav.foreshadows', icon: '🔮' },
  '/worldsettings': { labelKey: 'nav.worldsettings', icon: '🌍' },
  '/resources': { labelKey: 'nav.resources', icon: '💎' },
  '/templates': { labelKey: 'nav.templates', icon: '📦' },
  '/tags':      { labelKey: 'nav.tags', icon: '🏷' },
  '/ai':        { labelKey: 'nav.ai', icon: '🤖' },
  '/about':     { labelKey: 'nav.about', icon: 'ℹ️' },
};

/** 面包屑路径映射到翻译 key */
const BREADCRUMB_I18N_MAP: Record<string, string> = {
  '/projects': 'breadcrumb.projects',
  '/dashboard': 'breadcrumb.dashboard',
  '/outline': 'breadcrumb.outline',
  '/characters': 'breadcrumb.characters',
  '/chapters': 'breadcrumb.chapters',
  '/foreshadows': 'breadcrumb.foreshadows',
  '/timeline': 'breadcrumb.timeline',
  '/worldsettings': 'breadcrumb.worldsettings',
  '/resources': 'breadcrumb.resources',
  '/templates': 'breadcrumb.templates',
  '/tags': 'breadcrumb.tags',
  '/ai': 'breadcrumb.ai',
  '/about': 'breadcrumb.about',
};

export default function Layout() {
  const { currentProject, theme, toggleTheme, sidebarCollapsed, toggleSidebar, setCurrentProject, triggerRefresh } = useAppStore();
  const { loadProjects } = useProjectStore();
  const { t, lang, setLang } = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState('');

  // 移动端侧边栏滑出
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(() => window.innerWidth <= 768);
  const mainRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  // 监听窗口大小变化（延迟检测确保 WebView 正确初始化）
  useEffect(() => {
    const check = () => setIsMobileView(window.innerWidth <= 768);
    // 立即检测一次
    check();
    // 延迟再检测一次（WebView 可能晚初始化）
    setTimeout(check, 500);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Pointer Events 手势（兼容所有平台：鼠标 + 触摸 + 触控笔）
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let tracking = false;

    const onDown = (e: PointerEvent) => {
      startX = e.clientX;
      startY = e.clientY;
      tracking = true;
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    };

    const onMove = (e: PointerEvent) => {
      if (!tracking) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      // 从左边缘（<40px）向右滑动 >30px 打开侧边栏
      if (dx > 30 && Math.abs(dx) > Math.abs(dy) * 1.5 && startX < 40 && !mobileSidebarOpen) {
        setMobileSidebarOpen(true);
        tracking = false;
      }
      // 向左滑动关闭
      if (dx < -30 && Math.abs(dx) > Math.abs(dy) * 1.5 && mobileSidebarOpen) {
        setMobileSidebarOpen(false);
        tracking = false;
      }
    };

    const onUp = () => { tracking = false; };

    document.addEventListener('pointerdown', onDown);
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
  }, [mobileSidebarOpen]);

  // 判断当前是否在项目内（有选中项目 + 不在作品列表页）
  const isInProject = currentProject !== null && location.pathname !== '/projects';

  // 类型安全的 t() 包装（用于动态 key）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const td = (key: string): string => (t as any)(key);

  // 当前使用的导航项（动态生成以使用 t()）
  const navItems = isInProject
    ? Object.entries(NAV_I18N_MAP)
        .filter(([path]) => path !== '/projects')
        .map(([path, { labelKey, icon }]) => ({ path, label: td(labelKey), icon }))
    : [{ path: '/projects', label: t('nav.projects'), icon: '📚' }];

  // 生成面包屑
  const breadcrumbParts: { label: string; path?: string }[] = [];
  if (isInProject) {
    breadcrumbParts.push({ label: currentProject!.name, path: '/dashboard' });
    const currentBreadcrumbKey = BREADCRUMB_I18N_MAP[location.pathname];
    if (currentBreadcrumbKey && location.pathname !== '/dashboard') {
      breadcrumbParts.push({ label: td(currentBreadcrumbKey) });
    }
  } else {
    breadcrumbParts.push({ label: t('breadcrumb.projects') });
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
      alert(t('project.exportFailed'));
    }
  };

  /** 导入作品文件 */
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMsg('');
    try {
      const data = await readJSONFile(file);
      if (!data) { setImportMsg(t('project.invalidFormat')); return; }
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
        setImportMsg(t('project.unsupportedFormat'));
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
    <div className={`novel-layout ${styles.layout}`} data-theme={theme}>
      {/* 全局搜索（Ctrl+K） */}
      <GlobalSearch />
      {/* 快捷键面板（?） */}
      <ShortcutPanel />

      {/* 移动端侧边栏遮罩 */}
      {mobileSidebarOpen && (
        <div className="mobile-overlay" onClick={() => setMobileSidebarOpen(false)} />
      )}

      {/* 左侧导航栏 */}
      <aside
        className={`sf-sidebar ${styles.sidebar} ${sidebarCollapsed ? styles.collapsed : ''} ${mobileSidebarOpen ? 'open' : ''}`}
      >
        {/* 移动端关闭按钮 */}
        <button
          onClick={() => setMobileSidebarOpen(false)}
          style={{
            position: 'absolute', top: 10, right: 10, zIndex: 10,
            width: 30, height: 30, borderRadius: '50%',
            background: 'var(--bg-hover)', color: 'var(--text-secondary)',
            border: 'none', fontSize: 14, cursor: 'pointer',
            display: isMobileView ? 'flex' : 'none',
            alignItems: 'center', justifyContent: 'center',
          }}
        >✕</button>

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

        {/* 返回作品列表按钮（在项目内时显示，移动端始终显示） */}
        {isInProject && (
          <button className={styles.backBtn} onClick={handleBackToProjects}>
            {t('nav.backToProjects')}
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

        <div className={`sf-footer ${styles.sidebarFooter}`}>
          {/* 导入导出 */}
          {currentProject && (
            <button className={`sf-btn ${styles.themeToggle}`} onClick={handleExportCurrent} title={t('nav.exportProject')}>
              {t('nav.exportProject')}
            </button>
          )}
          <button className={`sf-btn ${styles.themeToggle}`} onClick={() => fileInputRef.current?.click()} title={t('nav.importProject')}>
            {t('nav.importProject')}
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
          <button className={`sf-btn ${styles.themeToggle}`} onClick={toggleTheme}>
            {theme === 'dark' ? t('nav.themeLight') : t('nav.themeDark')}
          </button>
          <button className={`sf-btn ${styles.themeToggle}`} onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
            style={{ marginTop: '4px' }}>
            {t('nav.langSwitch')}
          </button>
          <div style={{ margin: '4px 0', borderTop: '1px solid var(--border-color)' }} />
        </div>
      </aside>

      {/* 主内容区 */}
      <div
        ref={mainRef}
        className={styles.mainWrapper}
      >
        {/* 移动端浮动菜单按钮 */}
        {isMobileView && (
          <button
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="打开菜单"
            style={{
              position: 'fixed',
              bottom: 20,
              right: 16,
              zIndex: 50,
              width: 48,
              height: 48,
              borderRadius: '50%',
              cursor: 'pointer',
              background: 'var(--accent)',
              border: 'none',
              color: 'var(--bg-primary)',
              fontSize: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
          >
            ☰
          </button>
        )}

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
