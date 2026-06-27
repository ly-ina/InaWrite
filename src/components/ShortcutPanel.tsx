/**
 * 快捷键面板
 * 按 ? 键显示/隐藏所有快捷键列表
 */

import { useState, useEffect, useCallback } from 'react';
import styles from './ShortcutPanel.module.css';

interface Shortcut {
  key: string;
  description: string;
  category: string;
}

const SHORTCUTS: Shortcut[] = [
  { key: 'Ctrl+K', description: '打开全局搜索', category: '全局' },
  { key: 'Ctrl+Z', description: '撤销上一步操作', category: '编辑' },
  { key: 'Ctrl+Y / Ctrl+Shift+Z', description: '重做已撤销操作', category: '编辑' },
  { key: '?', description: '显示/隐藏快捷键面板', category: '全局' },
  { key: 'Esc', description: '关闭弹窗/取消操作', category: '全局' },
  { key: '↑↓', description: '搜索结果中上下选择', category: '搜索' },
  { key: 'Enter', description: '确认选择/提交表单', category: '全局' },
  { key: '拖拽', description: '时间线页面调整章节顺序', category: '时间线' },
];

export default function ShortcutPanel() {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // 仅在未聚焦输入框时响应
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === '?') {
        e.preventDefault();
        toggle();
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggle, isOpen]);

  if (!isOpen) return null;

  // 按类别分组
  const categories = [...new Set(SHORTCUTS.map((s) => s.category))];

  return (
    <div className={styles.overlay} onClick={() => setIsOpen(false)}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>⌨️ 快捷键</h2>
          <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>✕</button>
        </div>

        {categories.map((cat) => (
          <div key={cat} className={styles.category}>
            <h3 className={styles.catTitle}>{cat}</h3>
            <div className={styles.shortcutList}>
              {SHORTCUTS.filter((s) => s.category === cat).map((s) => (
                <div key={s.key} className={styles.shortcutItem}>
                  <kbd className={styles.key}>{s.key}</kbd>
                  <span className={styles.desc}>{s.description}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className={styles.footer}>
          按 <kbd className={styles.key}>?</kbd> 随时查看快捷键
        </div>
      </div>
    </div>
  );
}
