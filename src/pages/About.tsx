/**
 * 关于页面
 * 展示作者信息、项目链接、使用说明、版本检测
 */

import { useState } from 'react';
import { useT } from '../i18n';
import { getCurrentVersion } from '../utils/updater';
import styles from './About.module.css';

export default function AboutPage() {
  const { t } = useT();
  const [checking, setChecking] = useState(false);
  const [checkDone, setCheckDone] = useState(false);

  const handleCheckUpdate = async () => {
    setChecking(true);
    setCheckDone(false);
    try {
      const fn = (window as any).__inakbCheckUpdate;
      if (fn) await fn();
    } finally {
      setChecking(false);
      setCheckDone(true);
      setTimeout(() => setCheckDone(false), 2500);
    }
  };

  const ver = getCurrentVersion();

  return (
    <div className={styles.page}>
      <div className={styles.container}>

        {/* 标题区域 */}
        <div className={styles.hero}>
          <div className={styles.logo}>📖</div>
          <h1 className={styles.title}>Novel InaKB</h1>
          <p className={styles.subtitle}>{t('about.tagline')}</p>
          <p className={styles.version}>v{ver.versionName} (code {ver.versionCode})</p>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {ver.platform === 'android' ? '📱 Android' : ver.platform === 'pc' ? '🖥️ PC (Electron)' : '🌐 Web'}
          </p>
          <button
            className="btn btn-primary"
            onClick={handleCheckUpdate}
            disabled={checking}
            style={{
              marginTop: '10px',
              transition: 'all 0.3s',
              ...(checkDone ? { background: 'var(--success)', borderColor: 'var(--success)' } : {}),
            }}
          >
            {checking ? '⏳ 检测中...' : checkDone ? '✅ 检测完成' : '🔍 检查更新'}
          </button>
        </div>

        {/* 作者信息 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('about.author')}</h2>
          <div className={styles.card}>
            <div className={styles.authorRow}>
              <span className={styles.label}>{t('about.authorName')}</span>
              <span className={styles.value}>伊纳 (Ina)</span>
            </div>
            <div className={styles.authorRow}>
              <span className={styles.label}>GitHub</span>
              <a href="https://github.com/ly-ina/InaWrite" target="_blank" rel="noopener noreferrer" className={styles.link}>
                ly-ina/InaWrite
              </a>
            </div>
            <div className={styles.authorRow}>
              <span className={styles.label}>{t('about.license')}</span>
              <span className={styles.value}>MIT License</span>
            </div>
          </div>
        </section>

        {/* 技术栈 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('about.techStack')}</h2>
          <div className={styles.card}>
            <div className={styles.techGrid}>
              <a href="https://react.dev/" target="_blank" rel="noopener noreferrer" className={styles.techItem}>React 19</a>
              <a href="https://www.typescriptlang.org/" target="_blank" rel="noopener noreferrer" className={styles.techItem}>TypeScript</a>
              <a href="https://vite.dev/" target="_blank" rel="noopener noreferrer" className={styles.techItem}>Vite</a>
              <a href="https://zustand.docs.pmnd.rs/" target="_blank" rel="noopener noreferrer" className={styles.techItem}>Zustand</a>
              <a href="https://d3js.org/" target="_blank" rel="noopener noreferrer" className={styles.techItem}>D3.js</a>
              <a href="https://www.electronjs.org/" target="_blank" rel="noopener noreferrer" className={styles.techItem}>Electron</a>
              <a href="https://capacitorjs.com/" target="_blank" rel="noopener noreferrer" className={styles.techItem}>Capacitor</a>
              <a href="https://github.com/jakearchibald/idb" target="_blank" rel="noopener noreferrer" className={styles.techItem}>IndexedDB</a>
            </div>
          </div>
        </section>

        {/* 使用说明 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('about.usage')}</h2>
          <div className={styles.card}>
            <ul className={styles.usageList}>
              <li>{t('about.usage1')}</li>
              <li>{t('about.usage2')}</li>
              <li>{t('about.usage3')}</li>
              <li>{t('about.usage4')}</li>
              <li>{t('about.usage5')}</li>
            </ul>
          </div>
        </section>

        {/* 快捷键 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('about.shortcuts')}</h2>
          <div className={styles.card}>
            <div className={styles.shortcutGrid}>
              <div className={styles.shortcutRow}>
                <kbd className={styles.kbd}>Ctrl + K</kbd>
                <span>{t('about.shortcutSearch')}</span>
              </div>
              <div className={styles.shortcutRow}>
                <kbd className={styles.kbd}>Ctrl + Z</kbd>
                <span>{t('about.shortcutUndo')}</span>
              </div>
              <div className={styles.shortcutRow}>
                <kbd className={styles.kbd}>Ctrl + Y</kbd>
                <span>{t('about.shortcutRedo')}</span>
              </div>
              <div className={styles.shortcutRow}>
                <kbd className={styles.kbd}>?</kbd>
                <span>{t('about.shortcutPanel')}</span>
              </div>
            </div>
          </div>
        </section>

        {/* 数据安全 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('about.privacy')}</h2>
          <div className={styles.card}>
            <p className={styles.privacyText}>{t('about.privacyText')}</p>
          </div>
        </section>

        {/* 底部 */}
        <footer className={styles.footer}>
          <p>© 2026 伊纳 (Ina) · {t('about.builtWith')} ❤️</p>
          <p>
            <a href="https://github.com/ly-ina/InaWrite" target="_blank" rel="noopener noreferrer" className={styles.link}>
              GitHub
            </a>
            {' · '}
            <span>MIT License</span>
          </p>
        </footer>

      </div>
    </div>
  );
}
