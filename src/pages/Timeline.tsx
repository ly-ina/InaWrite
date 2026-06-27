/**
 * 章节时间线视图
 * 按时间/章节顺序排列，支持拖拽调整章节顺序
 * 视觉化展示伏笔新增和回收的对应关系
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChapterStore } from '../store/chapterStore';
import { useCharacterStore } from '../store/characterStore';
import { useForeshadowStore } from '../store/foreshadowStore';
import { useAppStore } from '../store/appStore';
import { STATUS_LABELS, type Chapter, type Foreshadow } from '../types';
import styles from './Timeline.module.css';

interface DragState {
  dragId: string | null;
  overId: string | null;
}

export default function TimelinePage() {
  const navigate = useNavigate();
  const { currentProject, refreshKey } = useAppStore();
  const { chapters, loading, loadChapters, updateChapter } = useChapterStore();
  const { characters, loadCharacters } = useCharacterStore();
  const { foreshadows, loadForeshadows } = useForeshadowStore();

  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [drag, setDrag] = useState<DragState>({ dragId: null, overId: null });
  const [filterChars, setFilterChars] = useState<string[]>([]);

  useEffect(() => {
    if (currentProject) {
      loadChapters(currentProject.id);
      loadCharacters(currentProject.id);
      loadForeshadows(currentProject.id);
    }
  }, [currentProject, loadChapters, loadCharacters, loadForeshadows, refreshKey]);

  // 按序号排序
  const sortedChapters = [...chapters].sort((a, b) => a.number - b.number);

  // 获取名字
  const getCharName = (id: string) => characters.find((c) => c.id === id)?.name || '未知';
  const getForeshadowById = (id: string) => foreshadows.find((f) => f.id === id);

  // 获取章节的伏笔信息
  const getChapterForeshadows = (chapter: Chapter) => {
    const added = chapter.foreshadowsAdded
      .map((id) => getForeshadowById(id))
      .filter(Boolean) as Foreshadow[];
    const resolved = chapter.foreshadowsResolved
      .map((id) => getForeshadowById(id))
      .filter(Boolean) as Foreshadow[];
    return { added, resolved };
  };

  // ===== 拖拽排序 =====
  const handleDragStart = (id: string) => {
    setDrag({ dragId: id, overId: null });
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDrag((prev) => ({ ...prev, overId: id }));
  };

  const handleDragEnd = async () => {
    const { dragId, overId } = drag;
    if (!dragId || !overId || dragId === overId) {
      setDrag({ dragId: null, overId: null });
      return;
    }

    const dragChapter = chapters.find((c) => c.id === dragId);
    const overChapter = chapters.find((c) => c.id === overId);
    if (!dragChapter || !overChapter) return;

    // 交换序号
    const dragNum = dragChapter.number;
    const overNum = overChapter.number;

    await updateChapter({ ...dragChapter, number: overNum });
    await updateChapter({ ...overChapter, number: dragNum });
    await loadChapters(currentProject!.id);
    setDrag({ dragId: null, overId: null });
  };

  const handleDragLeave = () => {
    setDrag((prev) => ({ ...prev, overId: null }));
  };

  // 过滤角色
  const filteredChapters = filterChars.length > 0
    ? sortedChapters.filter((ch) => ch.characters.some((id) => filterChars.includes(id)))
    : sortedChapters;

  // 获取所有出场角色
  const allChars = [...new Set(chapters.flatMap((ch) => ch.characters))]
    .map((id) => characters.find((c) => c.id === id))
    .filter(Boolean);

  if (!currentProject) {
    return <div className="empty-state"><p>请先选择一个作品</p></div>;
  }

  return (
    <div className={styles.page}>
      <div className="page-header">
        <h1>章节时间线</h1>
        <div className="actions">
          <button className="btn btn-sm" onClick={() => setFilterChars([])}>
            {filterChars.length > 0 ? '清除筛选' : '全部章节'}
          </button>
        </div>
      </div>

      {/* 角色筛选 */}
      {allChars.length > 0 && (
        <div className={styles.charFilter}>
          {allChars.map((c) => (
            <button
              key={c!.id}
              className={`${styles.charFilterBtn} ${filterChars.includes(c!.id) ? styles.active : ''}`}
              onClick={() => {
                setFilterChars((prev) =>
                  prev.includes(c!.id) ? prev.filter((x) => x !== c!.id) : [...prev, c!.id]
                );
              }}
            >
              {c!.name}
            </button>
          ))}
        </div>
      )}

      {/* 图例 */}
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: 'var(--warning)' }} />
          新增伏笔
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: 'var(--success)' }} />
          回收伏笔
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: 'var(--text-muted)' }} />
          拖拽可调整顺序
        </span>
      </div>

      {loading ? (
        <div className="loading-spinner">加载中...</div>
      ) : filteredChapters.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📅</div>
          <p>暂无章节，创建章节后这里将显示时间线</p>
        </div>
      ) : (
        <div className={styles.timeline}>
          {/* 中心线 */}
          <div className={styles.centerLine} />

          {filteredChapters.map((chapter, index) => {
            const { added, resolved } = getChapterForeshadows(chapter);
            const isDragging = drag.dragId === chapter.id;
            const isOver = drag.overId === chapter.id;
            const isEven = index % 2 === 0;

            return (
              <div
                key={chapter.id}
                className={`${styles.timelineItem} ${isEven ? styles.left : styles.right} ${isDragging ? styles.dragging : ''} ${isOver ? styles.dragOver : ''}`}
                draggable
                onDragStart={() => handleDragStart(chapter.id)}
                onDragOver={(e) => handleDragOver(e, chapter.id)}
                onDragEnd={handleDragEnd}
                onDragLeave={handleDragLeave}
                onClick={() => setSelectedChapter(chapter)}
              >
                {/* 时间节点 */}
                <div className={styles.node}>
                  <div className={styles.nodeDot} />
                  <span className={styles.nodeNum}>第{chapter.number}章</span>
                </div>

                {/* 内容卡片 */}
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>{chapter.title}</h3>
                    <span className={`tag tag-${chapter.status}`}>
                      {STATUS_LABELS[chapter.status]}
                    </span>
                  </div>

                  {chapter.wordCount && (
                    <div className={styles.cardMeta}>
                      {chapter.wordCount.toLocaleString()} 字
                    </div>
                  )}

                  {/* 出场角色 */}
                  {chapter.characters.length > 0 && (
                    <div className={styles.cardChars}>
                      {chapter.characters.map((id) => (
                        <span key={id} className={styles.charBadge}
                          onClick={(e) => { e.stopPropagation(); navigate('/characters'); }}>
                          👤 {getCharName(id)}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 伏笔指示器 */}
                  <div className={styles.foreshadowIndicators}>
                    {added.map((f) => (
                      <div key={f.id} className={styles.fsAdded}>
                        + {f.content.slice(0, 25)}...
                      </div>
                    ))}
                    {resolved.map((f) => (
                      <div key={f.id} className={styles.fsResolved}>
                        ✓ {f.content.slice(0, 25)}...
                      </div>
                    ))}
                  </div>

                  {/* 摘要 */}
                  {chapter.summary && (
                    <p className={styles.summary}>{chapter.summary.slice(0, 80)}...</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 章节详情弹窗 */}
      {selectedChapter && (
        <div className="modal-overlay" onClick={() => setSelectedChapter(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ minWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h2>第{selectedChapter.number}章 {selectedChapter.title}</h2>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn btn-sm" onClick={() => { setSelectedChapter(null); navigate('/chapters'); }}>
                  去编辑
                </button>
                <button className="btn btn-sm" onClick={() => setSelectedChapter(null)}>关闭</button>
              </div>
            </div>

            <div className="form-group">
              <label>状态</label>
              <span className={`tag tag-${selectedChapter.status}`}>{STATUS_LABELS[selectedChapter.status]}</span>
              {selectedChapter.wordCount && <span style={{ marginLeft: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>{selectedChapter.wordCount.toLocaleString()} 字</span>}
            </div>

            {selectedChapter.summary && (
              <div className="form-group">
                <label>内容摘要</label>
                <p style={{ fontSize: '14px', lineHeight: 1.8 }}>{selectedChapter.summary}</p>
              </div>
            )}

            {selectedChapter.keyEvents.length > 0 && (
              <div className="form-group">
                <label>关键事件</label>
                <ul style={{ paddingLeft: '18px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {selectedChapter.keyEvents.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}

            {selectedChapter.characters.length > 0 && (
              <div className="form-group">
                <label>出场角色</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {selectedChapter.characters.map((id) => (
                    <span key={id} style={{ padding: '3px 10px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}>
                      {getCharName(id)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 伏笔关系可视化 */}
            {(() => {
              const { added, resolved } = getChapterForeshadows(selectedChapter);
              return (added.length > 0 || resolved.length > 0) ? (
                <div className="form-group">
                  <label>伏笔关系</label>
                  <div className={styles.fsDetail}>
                    {added.map((f) => (
                      <div key={f.id} className={styles.fsAddedDetail}>
                        <div className={styles.fsLabel}>新增</div>
                        <div>{f.content}</div>
                      </div>
                    ))}
                    {resolved.map((f) => (
                      <div key={f.id} className={styles.fsResolvedDetail}>
                        <div className={styles.fsLabel}>回收</div>
                        <div>{f.content}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
