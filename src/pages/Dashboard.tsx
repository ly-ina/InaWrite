/**
 * 作品 Dashboard 概览页
 * 进入作品后的默认落地页，展示全局数据卡片和最近动态
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { useCharacterStore } from '../store/characterStore';
import { useChapterStore } from '../store/chapterStore';
import { useForeshadowStore } from '../store/foreshadowStore';
import { STATUS_LABELS } from '../types';
import styles from './Dashboard.module.css';

/** 快捷操作按钮配置 */
const QUICK_ACTIONS = [
  { label: '新角色', icon: '👤', path: '/characters', action: 'create' },
  { label: '新章节', icon: '📖', path: '/chapters', action: 'create' },
  { label: '新伏笔', icon: '🔮', path: '/foreshadows', action: 'create' },
  { label: '新设定', icon: '🌍', path: '/worldsettings', action: 'create' },
];

export default function DashboardPage() {
  const { currentProject, refreshKey } = useAppStore();
  const { characters, loadCharacters } = useCharacterStore();
  const { chapters, loadChapters } = useChapterStore();
  const { foreshadows, loadForeshadows } = useForeshadowStore();
  const navigate = useNavigate();

  // 最近活动（用更新时间模拟）
  const [recentActivity, setRecentActivity] = useState<{ type: string; label: string; time: string }[]>([]);

  useEffect(() => {
    if (currentProject) {
      loadCharacters(currentProject.id);
      loadChapters(currentProject.id);
      loadForeshadows(currentProject.id);
    }
  }, [currentProject, loadCharacters, loadChapters, loadForeshadows, refreshKey]);

  // 生成最近活动
  useEffect(() => {
    const activities: typeof recentActivity = [];
    if (currentProject) {
      activities.push({ type: 'project', label: `打开作品「${currentProject.name}」`, time: formatRelativeTime(currentProject.updatedAt) });
    }
    // 按更新时间取最近修改的几条
    const recentChars = [...characters]
      .sort((a, b) => (b as unknown as { updatedAt?: string }).updatedAt?.localeCompare?.((a as unknown as { updatedAt?: string }).updatedAt ?? '') ?? 0)
      .slice(0, 3);
    recentChars.forEach((c) => {
      activities.push({ type: 'character', label: `角色「${c.name}」`, time: '最近' });
    });
    const recentChapters = [...chapters]
      .sort((a, b) => b.number - a.number)
      .slice(0, 3);
    recentChapters.forEach((ch) => {
      activities.push({ type: 'chapter', label: `第${ch.number}章「${ch.title}」`, time: STATUS_LABELS[ch.status] });
    });
    setRecentActivity(activities.slice(0, 10));
  }, [characters, chapters, currentProject]);

  if (!currentProject) {
    return <div className="empty-state"><p>请先选择一个作品</p></div>;
  }

  // 统计数据
  const totalWords = chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
  const completedChapters = chapters.filter((ch) => ch.status === 'done').length;
  const pendingForeshadows = foreshadows.filter((f) => f.status === 'pending' || f.status === 'active').length;
  const resolvedForeshadows = foreshadows.filter((f) => f.status === 'resolved').length;

  const statsCards = [
    { label: '角色', value: characters.length, icon: '👤', color: 'var(--accent)' },
    { label: '章节', value: chapters.length, icon: '📖', color: 'var(--success)' },
    { label: '总字数', value: totalWords.toLocaleString(), icon: '✍️', color: 'var(--warning)' },
    { label: '已完成章节', value: `${completedChapters}/${chapters.length || 1}`, icon: '✅', color: 'var(--success)' },
    { label: '进行中伏笔', value: pendingForeshadows, icon: '🔮', color: 'var(--warning)' },
    { label: '已回收伏笔', value: resolvedForeshadows, icon: '🎯', color: 'var(--success)' },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <h1 className={styles.title}>{currentProject.name}</h1>
        {currentProject.description && (
          <p className={styles.desc}>{currentProject.description}</p>
        )}
        <p className={styles.meta}>
          创建于 {formatDate(currentProject.createdAt)} · 最后编辑于 {formatDate(currentProject.updatedAt)}
        </p>
      </div>

      {/* 数据统计卡片 */}
      <section className={styles.section}>
        <h3>数据概览</h3>
        <div className={styles.statsGrid}>
          {statsCards.map((card) => (
            <div key={card.label} className={styles.statCard}>
              <div className={styles.statIcon}>{card.icon}</div>
              <div className={styles.statValue} style={{ color: card.color }}>
                {card.value}
              </div>
              <div className={styles.statLabel}>{card.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 快捷操作 */}
      <section className={styles.section}>
        <h3>快捷操作</h3>
        <div className={styles.quickActions}>
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              className={styles.quickBtn}
              onClick={() => navigate(action.path)}
            >
              <span className={styles.quickIcon}>{action.icon}</span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 章节进度 */}
      {chapters.length > 0 && (
        <section className={styles.section}>
          <h3>章节进度</h3>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${(completedChapters / chapters.length) * 100}%` }}
            />
          </div>
          <div className={styles.progressText}>
            {completedChapters} / {chapters.length} 章已完成
          </div>
          <div className={styles.chapterPreview}>
            {chapters.slice(-5).map((ch) => (
              <div key={ch.id} className={styles.chapterItem}>
                <span className={styles.chNum}>第{ch.number}章</span>
                <span className={styles.chTitle}>{ch.title}</span>
                <span className={`tag tag-${ch.status}`}>{STATUS_LABELS[ch.status]}</span>
                {ch.wordCount && <span className={styles.chWords}>{ch.wordCount.toLocaleString()}字</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 最近动态 */}
      {recentActivity.length > 0 && (
        <section className={styles.section}>
          <h3>最近动态</h3>
          <div className={styles.activityList}>
            {recentActivity.map((item, i) => (
              <div key={i} className={styles.activityItem}>
                <span className={styles.activityDot} />
                <span className={styles.activityLabel}>{item.label}</span>
                <span className={styles.activityTime}>{item.time}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 空状态：如果没有任何数据 */}
      {characters.length === 0 && chapters.length === 0 && foreshadows.length === 0 && (
        <div className="empty-state">
          <div className="icon">🚀</div>
          <p>作品还是空的，开始添加内容吧！</p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button className="btn btn-primary" onClick={() => navigate('/characters')}>
              + 创建第一个角色
            </button>
            <button className="btn" onClick={() => navigate('/chapters')}>
              + 写第一章
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** 格式化 ISO 日期为可读格式 */
function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 格式化相对时间 */
function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return formatDate(iso);
}
