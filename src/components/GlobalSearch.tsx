/**
 * 全局搜索组件
 * 跨模块搜索角色/章节/伏笔/世界观设定
 * 快捷键：Ctrl+K 打开搜索
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { useCharacterStore } from '../store/characterStore';
import { useChapterStore } from '../store/chapterStore';
import { useForeshadowStore } from '../store/foreshadowStore';
import { useWorldSettingStore } from '../store/worldSettingStore';
import { STATUS_LABELS } from '../types';
import styles from './GlobalSearch.module.css';

interface SearchResult {
  id: string;
  type: 'character' | 'chapter' | 'foreshadow' | 'worldsetting';
  label: string;
  subtitle: string;
  icon: string;
  path: string;
}

export default function GlobalSearch() {
  const navigate = useNavigate();
  const { currentProject, refreshKey } = useAppStore();
  const { characters, loadCharacters } = useCharacterStore();
  const { chapters, loadChapters } = useChapterStore();
  const { foreshadows, loadForeshadows } = useForeshadowStore();
  const { settings, loadSettings } = useWorldSettingStore();

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // 加载所有数据
  useEffect(() => {
    if (currentProject) {
      loadCharacters(currentProject.id);
      loadChapters(currentProject.id);
      loadForeshadows(currentProject.id);
      loadSettings(currentProject.id);
    }
  }, [currentProject, loadCharacters, loadChapters, loadForeshadows, loadSettings, refreshKey]);

  // 快捷键 Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // 打开时聚焦输入框
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // 构建搜索结果
  const results: SearchResult[] = [];
  if (query.trim()) {
    const q = query.toLowerCase();

    // 搜索角色
    characters.forEach((c) => {
      if (c.name.toLowerCase().includes(q) || c.aliases?.some((a) => a.toLowerCase().includes(q))) {
        results.push({
          id: c.id,
          type: 'character',
          label: c.name,
          subtitle: `${c.race || ''} · ${STATUS_LABELS[c.status]}`,
          icon: '👤',
          path: '/characters',
        });
      }
    });

    // 搜索章节
    chapters.forEach((ch) => {
      if (ch.title.toLowerCase().includes(q) || `第${ch.number}章`.includes(q)) {
        results.push({
          id: ch.id,
          type: 'chapter',
          label: `第${ch.number}章 ${ch.title}`,
          subtitle: `${STATUS_LABELS[ch.status]}${ch.wordCount ? ` · ${ch.wordCount.toLocaleString()}字` : ''}`,
          icon: '📖',
          path: '/chapters',
        });
      }
    });

    // 搜索伏笔
    foreshadows.forEach((f) => {
      if (f.content.toLowerCase().includes(q)) {
        results.push({
          id: f.id,
          type: 'foreshadow',
          label: f.content.slice(0, 50),
          subtitle: STATUS_LABELS[f.status],
          icon: '🔮',
          path: '/foreshadows',
        });
      }
    });

    // 搜索世界观设定
    settings.forEach((s) => {
      if (s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)) {
        results.push({
          id: s.id,
          type: 'worldsetting',
          label: s.name,
          subtitle: s.type,
          icon: '🌍',
          path: '/worldsettings',
        });
      }
    });
  }

  const handleSelect = useCallback((result: SearchResult) => {
    setIsOpen(false);
    setQuery('');
    // 导航到对应模块，通过 URL state 传递选中 ID
    navigate(result.path, { state: { highlightId: result.id } });
  }, [navigate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    }
  };

  if (!isOpen) return null;

  const typeLabels: Record<string, string> = {
    character: '角色',
    chapter: '章节',
    foreshadow: '伏笔',
    worldsetting: '设定',
  };

  return (
    <div className={styles.overlay} ref={overlayRef} onClick={() => setIsOpen(false)}>
      <div className={styles.searchBox} onClick={(e) => e.stopPropagation()}>
        <div className={styles.inputWrapper}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            ref={inputRef}
            className={styles.searchInput}
            placeholder="搜索角色、章节、伏笔、设定..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
          />
          <span className={styles.shortcut}>ESC</span>
        </div>

        {results.length > 0 ? (
          <div className={styles.results}>
            {results.map((result, i) => (
              <div
                key={`${result.type}-${result.id}`}
                className={`${styles.resultItem} ${i === selectedIndex ? styles.selected : ''}`}
                onClick={() => handleSelect(result)}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <span className={styles.resultIcon}>{result.icon}</span>
                <div className={styles.resultInfo}>
                  <div className={styles.resultLabel}>
                    <span className={styles.resultType}>{typeLabels[result.type]}</span>
                    {result.label}
                  </div>
                  <div className={styles.resultSubtitle}>{result.subtitle}</div>
                </div>
              </div>
            ))}
          </div>
        ) : query.trim() ? (
          <div className={styles.noResults}>未找到相关结果</div>
        ) : (
          <div className={styles.hint}>输入关键词开始搜索...</div>
        )}
      </div>
    </div>
  );
}
