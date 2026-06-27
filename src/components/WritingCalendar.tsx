/**
 * 写作日历热力图
 * 展示每日字数统计，类似 GitHub 贡献图
 * 数据存储在 localStorage 中
 */

import { useEffect, useState, useMemo } from 'react';
import { useChapterStore } from '../store/chapterStore';
import { useAppStore } from '../store/appStore';
import styles from './WritingCalendar.module.css';

interface DayData {
  date: string;   // YYYY-MM-DD
  words: number;
  chapters: number;
}

/** 获取/设置每日字数记录 */
function getDailyRecords(projectId: string): DayData[] {
  try {
    const raw = localStorage.getItem(`novelkb_daily_${projectId}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveDailyRecords(projectId: string, records: DayData[]) {
  try {
    localStorage.setItem(`novelkb_daily_${projectId}`, JSON.stringify(records));
  } catch {}
}

/** 记录今日字数 */
export function recordDailyWords(projectId: string, totalWords: number) {
  const today = new Date().toISOString().slice(0, 10);
  const records = getDailyRecords(projectId);
  const existing = records.find((r) => r.date === today);
  if (existing) {
    existing.words = totalWords;
  } else {
    records.push({ date: today, words: totalWords, chapters: 0 });
  }
  // 只保留最近 365 天
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  const filtered = records.filter((r) => r.date >= cutoff.toISOString().slice(0, 10));
  saveDailyRecords(projectId, filtered);
}

export default function WritingCalendar() {
  const { currentProject } = useAppStore();
  const { chapters } = useChapterStore();

  const [records, setRecords] = useState<DayData[]>([]);
  const [weeks, setWeeks] = useState<number>(26);

  useEffect(() => {
    if (currentProject) {
      const totalWords = chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
      recordDailyWords(currentProject.id, totalWords);
      setRecords(getDailyRecords(currentProject.id));
    }
  }, [currentProject, chapters]);

  // 生成日历网格（最近 N 周）
  const calendarData = useMemo(() => {
    const today = new Date();
    const result: { date: string; dayOfWeek: number; words: number; level: number }[] = [];

    for (let w = weeks - 1; w >= 0; w--) {
      for (let d = 6; d >= 0; d--) {
        const date = new Date(today);
        date.setDate(date.getDate() - (w * 7 + d));
        const dateStr = date.toISOString().slice(0, 10);
        const record = records.find((r) => r.date === dateStr);
        const words = record?.words || 0;

        // 热力等级 0-4
        let level = 0;
        if (words > 0) level = 1;
        if (words > 500) level = 2;
        if (words > 2000) level = 3;
        if (words > 10000) level = 4;

        result.push({ date: dateStr, dayOfWeek: date.getDay(), words, level });
      }
    }
    return result;
  }, [records, weeks]);

  // 统计
  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayRecord = records.find((r) => r.date === today);
    const thisWeek = records.filter((r) => {
      const d = new Date(r.date);
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      return d >= startOfWeek;
    });
    const totalThisWeek = thisWeek.reduce((s, r) => s + r.words, 0);
    const totalAll = records.reduce((s, r) => s + r.words, 0);
    const activeDays = records.filter((r) => r.words > 0).length;

    return {
      today: todayRecord?.words || 0,
      thisWeek: totalThisWeek,
      total: totalAll,
      activeDays,
      totalDays: records.length,
    };
  }, [records]);

  // 月份标签
  const monthLabels = useMemo(() => {
    const labels: { col: number; label: string }[] = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const today = new Date();

    for (let w = weeks - 1; w >= 0; w--) {
      const date = new Date(today);
      date.setDate(date.getDate() - w * 7);
      if (date.getDate() <= 7) {
        labels.push({ col: weeks - 1 - w, label: months[date.getMonth()] });
      }
    }
    return labels;
  }, [weeks]);

  const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

  if (!currentProject) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>📊 写作日历</h3>
        <div className={styles.stats}>
          <span>今日 {stats.today.toLocaleString()} 字</span>
          <span>本周 {stats.thisWeek.toLocaleString()} 字</span>
          <span>活跃 {stats.activeDays} 天</span>
        </div>
      </div>

      <div className={styles.calendar}>
        {/* 月份标签 */}
        <div className={styles.monthRow}>
          <div className={styles.dayLabelCol} />
          {Array.from({ length: weeks }, (_, i) => (
            <div key={i} className={styles.monthCell}>
              {monthLabels.find((m) => m.col === i)?.label || ''}
            </div>
          ))}
        </div>

        {/* 日历主体 */}
        <div className={styles.grid}>
          <div className={styles.dayLabels}>
            {dayLabels.map((l, i) => (
              <div key={i} className={styles.dayLabel}>{l}</div>
            ))}
          </div>
          <div className={styles.cells} style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }}>
            {calendarData.map((day) => (
              <div
                key={day.date}
                className={`${styles.cell} ${styles[`level${day.level}`]}`}
                title={`${day.date}: ${day.words.toLocaleString()} 字`}
              />
            ))}
          </div>
        </div>

        {/* 图例 */}
        <div className={styles.legend}>
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((l) => (
            <div key={l} className={`${styles.legendCell} ${styles[`level${l}`]}`} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
