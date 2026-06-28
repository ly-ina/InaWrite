/**
 * 通用可搜索选择器组件
 * 用于替代原生 <select>，支持搜索筛选和多选（可选）
 * 适用于章节选择、角色选择、设定选择等场景
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './SearchableSelect.module.css';

interface Option {
  id: string;
  label: string;
  sub?: string;   // 副标题（如章节序号）
  color?: string; // 左侧色条颜色
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  /** 是否为移动端（弹窗模式） */
  isMobile?: boolean;
  /** 弹窗标题（移动端用） */
  modalTitle?: string;
  /** 是否为空值显示特殊文案 */
  emptyLabel?: string;
  style?: React.CSSProperties;
  className?: string;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = '搜索...',
  isMobile = false,
  modalTitle = '选择',
  emptyLabel = '未选择',
  style,
  className,
}: SearchableSelectProps) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.id === value);

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const filtered = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()) || (o.sub || '').toLowerCase().includes(search.toLowerCase()))
    : options;

  const handleSelect = useCallback((id: string) => {
    onChange(id);
    setOpen(false);
    setSearch('');
  }, [onChange]);

  const clear = useCallback(() => {
    onChange('');
    setOpen(false);
    setSearch('');
  }, [onChange]);

  // 移动端：弹窗模式
  if (isMobile) {
    return (
      <div ref={containerRef} style={style} className={className}>
        <button
          className={`${styles.trigger} ${value ? styles.hasValue : ''}`}
          onClick={() => { setOpen(true); setSearch(''); }}
        >
          {selected ? selected.label : emptyLabel}
        </button>

        {open && (
          <div className="modal-overlay" onClick={() => setOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', width: '90%' }}>
              <h3>{modalTitle}</h3>
              <input
                className="input"
                placeholder={placeholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                style={{ marginBottom: '8px' }}
              />
              <div className={styles.optionList}>
                {filtered.length === 0 ? (
                  <div className={styles.empty}>无匹配项</div>
                ) : (
                  filtered.map((opt) => (
                    <div
                      key={opt.id}
                      className={`${styles.option} ${value === opt.id ? styles.selected : ''}`}
                      style={opt.color ? { borderLeft: `3px solid ${opt.color}` } : undefined}
                      onClick={() => handleSelect(opt.id)}
                    >
                      <span className={styles.optionLabel}>{opt.label}</span>
                      {opt.sub && <span className={styles.optionSub}>{opt.sub}</span>}
                    </div>
                  ))
                )}
              </div>
              <div className="form-actions" style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                <button className="btn" onClick={clear}>清除</button>
                <button className="btn" onClick={() => setOpen(false)}>关闭</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // PC 端：下拉模式
  return (
    <div ref={containerRef} className={`${styles.container} ${className || ''}`} style={style}>
      <div className={styles.trigger} onClick={() => setOpen(!open)}>
        {value ? (
          <span className={styles.selectedLabel}>{selected?.label || value}</span>
        ) : (
          <span className={styles.placeholder}>{emptyLabel}</span>
        )}
        <span className={styles.arrow}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div className={styles.dropdown}>
          <input
            className={`input ${styles.searchInput}`}
            placeholder={placeholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
          <div className={styles.optionList}>
            {value && (
              <div className={`${styles.option} ${styles.clearOption}`} onClick={clear}>
                清除选择
              </div>
            )}
            {filtered.length === 0 ? (
              <div className={styles.empty}>无匹配项</div>
            ) : (
              filtered.map((opt) => (
                <div
                  key={opt.id}
                  className={`${styles.option} ${value === opt.id ? styles.selected : ''}`}
                  style={opt.color ? { borderLeft: `3px solid ${opt.color}` } : undefined}
                  onClick={() => handleSelect(opt.id)}
                >
                  <span className={styles.optionLabel}>{opt.label}</span>
                  {opt.sub && <span className={styles.optionSub}>{opt.sub}</span>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
