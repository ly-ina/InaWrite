/**
 * 作品 Dashboard 概览页
 * 进入作品后的默认落地页，展示全局数据、写作目标、备份管理
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { useCharacterStore } from '../store/characterStore';
import { useChapterStore } from '../store/chapterStore';
import { useForeshadowStore } from '../store/foreshadowStore';
import { STATUS_LABELS } from '../types';
import { createAutoBackup, getBackupList, deleteBackup, restoreFromFile, generateReport } from '../utils/backup';
import { exportProject, downloadJSON } from '../utils/importExport';
import type { BackupMeta } from '../utils/backup';
import styles from './Dashboard.module.css';

/** 快捷操作按钮配置 */
const QUICK_ACTIONS = [
  { label: '新角色', icon: '👤', path: '/characters' },
  { label: '新章节', icon: '📖', path: '/chapters' },
  { label: '新伏笔', icon: '🔮', path: '/foreshadows' },
  { label: '新设定', icon: '🌍', path: '/worldsettings' },
];

export default function DashboardPage() {
  const { currentProject, refreshKey } = useAppStore();
  const { characters, loadCharacters } = useCharacterStore();
  const { chapters, loadChapters } = useChapterStore();
  const { foreshadows, loadForeshadows } = useForeshadowStore();
  const navigate = useNavigate();

  // 写作目标
  const [wordGoal, setWordGoal] = useState(() => {
    const saved = localStorage.getItem(`novelkb_goal_${currentProject?.id}`);
    return saved ? parseInt(saved) : 50000;
  });
  const [showGoalEdit, setShowGoalEdit] = useState(false);
  const [goalInput, setGoalInput] = useState('');

  // 备份列表
  const [backups, setBackups] = useState<BackupMeta[]>([]);
  const [showBackups, setShowBackups] = useState(false);

  useEffect(() => {
    if (currentProject) {
      loadCharacters(currentProject.id);
      loadChapters(currentProject.id);
      loadForeshadows(currentProject.id);
      const saved = localStorage.getItem(`novelkb_goal_${currentProject.id}`);
      if (saved) setWordGoal(parseInt(saved));
    }
  }, [currentProject, loadCharacters, loadChapters, loadForeshadows, refreshKey]);

  // 加载备份列表
  useEffect(() => {
    setBackups(getBackupList());
  }, [showBackups]);

  if (!currentProject) {
    return <div className="empty-state"><p>请先选择一个作品</p></div>;
  }

  // 统计数据
  const totalWords = chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
  const completedChapters = chapters.filter((ch) => ch.status === 'done').length;
  const pendingForeshadows = foreshadows.filter((f) => f.status === 'pending' || f.status === 'active').length;
  const resolvedForeshadows = foreshadows.filter((f) => f.status === 'resolved').length;
  const goalProgress = Math.min(100, Math.round((totalWords / wordGoal) * 100));

  const statsCards = [
    { label: '角色', value: characters.length, icon: '👤', color: 'var(--accent)' },
    { label: '章节', value: chapters.length, icon: '📖', color: 'var(--success)' },
    { label: '总字数', value: totalWords.toLocaleString(), icon: '✍️', color: 'var(--warning)' },
    { label: '完成率', value: `${completedChapters}/${chapters.length || 1}`, icon: '✅', color: 'var(--success)' },
    { label: '进行中伏笔', value: pendingForeshadows, icon: '🔮', color: 'var(--warning)' },
    { label: '已回收伏笔', value: resolvedForeshadows, icon: '🎯', color: 'var(--success)' },
  ];

  // 保存写作目标
  const saveGoal = () => {
    const val = parseInt(goalInput);
    if (val > 0) {
      setWordGoal(val);
      localStorage.setItem(`novelkb_goal_${currentProject.id}`, String(val));
    }
    setShowGoalEdit(false);
  };

  // 手动备份
  const handleBackup = async () => {
    await createAutoBackup(currentProject.id);
    setBackups(getBackupList());
  };

  // 导出报告
  const handleExportReport = async () => {
    const json = await exportProject(currentProject);
    const data = JSON.parse(json);
    const report = generateReport(data);
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProject.name}-创作报告.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 恢复备份
  const handleRestore = async (projectId: string) => {
    if (!window.confirm('确定要从此备份恢复数据吗？当前数据将被覆盖。')) return;
    const json = localStorage.getItem(`novelkb_backup_${projectId}`);
    if (!json) return;
    try {
      const data = JSON.parse(json);
      const { executeImport } = await import('../utils/importExport');
      await executeImport(currentProject.id, data, true);
      alert('数据恢复成功！');
      // 刷新页面
      window.location.reload();
    } catch {
      alert('恢复失败');
    }
  };

  // 从文件恢复
  const handleFileRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await restoreFromFile(file, currentProject.id);
    alert(result.message);
    if (result.success) window.location.reload();
    e.target.value = '';
  };

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

      {/* 写作目标 */}
      <section className={styles.section}>
        <div className={styles.goalHeader}>
          <h3>🎯 写作目标</h3>
          <button className="btn btn-sm" onClick={() => { setGoalInput(String(wordGoal)); setShowGoalEdit(true); }}>
            修改目标
          </button>
        </div>
        <div className={styles.goalBar}>
          <div className={styles.goalFill} style={{ width: `${goalProgress}%` }}>
            {goalProgress > 10 && (
              <span className={styles.goalText}>{goalProgress}%</span>
            )}
          </div>
        </div>
        <div className={styles.goalInfo}>
          <span>{totalWords.toLocaleString()} / {wordGoal.toLocaleString()} 字</span>
          <span className={styles.goalRemain}>
            {totalWords >= wordGoal ? '🎉 目标达成！' : `还差 ${(wordGoal - totalWords).toLocaleString()} 字`}
          </span>
        </div>
      </section>

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
            <button key={action.label} className={styles.quickBtn} onClick={() => navigate(action.path)}>
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
            <div className={styles.progressFill} style={{ width: `${(completedChapters / chapters.length) * 100}%` }} />
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

      {/* 备份管理 */}
      <section className={styles.section}>
        <div className={styles.goalHeader}>
          <h3>💾 数据安全</h3>
        </div>
        <div className={styles.backupActions}>
          <button className="btn btn-sm" onClick={handleBackup}>立即备份</button>
          <button className="btn btn-sm" onClick={handleExportReport}>导出创作报告</button>
          <label className="btn btn-sm" style={{ cursor: 'pointer' }}>
            从文件恢复
            <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileRestore} />
          </label>
          <button className="btn btn-sm" onClick={() => setShowBackups(!showBackups)}>
            {showBackups ? '隐藏' : '查看'}备份记录 ({backups.length})
          </button>
        </div>

        {showBackups && (
          <div className={styles.backupList}>
            {backups.length === 0 ? (
              <p className={styles.muted}>暂无备份记录</p>
            ) : (
              backups.map((b) => (
                <div key={b.projectId + b.timestamp} className={styles.backupItem}>
                  <div>
                    <span className={styles.backupName}>{b.projectName}</span>
                    <span className={styles.backupTime}>
                      {new Date(b.timestamp).toLocaleString('zh-CN')}
                    </span>
                  </div>
                  <div className={styles.backupActions}>
                    <button className="btn btn-sm" onClick={() => handleRestore(b.projectId)}>恢复</button>
                    <button className="btn btn-sm btn-ghost"
                      onClick={() => { deleteBackup(b.projectId); setBackups(getBackupList()); }}
                      style={{ color: 'var(--danger)', fontSize: '11px' }}>
                      删除
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      {/* 空状态 */}
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

      {/* 修改目标弹窗 */}
      {showGoalEdit && (
        <div className="modal-overlay" onClick={() => setShowGoalEdit(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>设置写作目标</h2>
            <div className="form-group">
              <label>目标总字数</label>
              <input className="input" type="number" value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveGoal()}
                autoFocus />
            </div>
            <div className="form-actions">
              <button className="btn" onClick={() => setShowGoalEdit(false)}>取消</button>
              <button className="btn btn-primary" onClick={saveGoal}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
