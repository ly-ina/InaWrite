/**
 * 章节时间线视图
 * 按时间/章节顺序排列，支持拖拽调整章节顺序
 * 视觉化展示伏笔新增和回收的对应关系
 * + 角色时间线弧光视图：横向展示角色成长轨迹
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChapterStore } from '../store/chapterStore';
import { useCharacterStore } from '../store/characterStore';
import { useForeshadowStore } from '../store/foreshadowStore';
import { useWorldSettingStore } from '../store/worldSettingStore';
import { useAppStore } from '../store/appStore';
import { STATUS_LABELS, type Chapter, type Foreshadow, type Character } from '../types';
import styles from './Timeline.module.css';

type ViewMode = 'timeline' | 'arc';

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
  const { settings, loadSettings } = useWorldSettingStore();

  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [drag, setDrag] = useState<DragState>({ dragId: null, overId: null });
  const [filterChars, setFilterChars] = useState<string[]>([]);
  // 弧光视图状态
  const [arcCharId, setArcCharId] = useState<string>('');

  useEffect(() => {
    if (currentProject) {
      loadChapters(currentProject.id);
      loadCharacters(currentProject.id);
      loadForeshadows(currentProject.id);
      loadSettings(currentProject.id);
    }
  }, [currentProject, loadChapters, loadCharacters, loadForeshadows, loadSettings, refreshKey]);

  // 按序号排序
  const sortedChapters = [...chapters].sort((a, b) => a.number - b.number);

  // 获取名字
  const getCharName = (id: string) => characters.find((c) => c.id === id)?.name || '未知';
  const getCharById = (id: string) => characters.find((c) => c.id === id);
  const getForeshadowById = (id: string) => foreshadows.find((f) => f.id === id);
  const getSettingName = (id: string) => settings.find((s) => s.id === id)?.name || '未知';

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
  const handleDragStart = (id: string) => setDrag({ dragId: id, overId: null });
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
    const dragNum = dragChapter.number;
    const overNum = overChapter.number;
    await updateChapter({ ...dragChapter, number: overNum });
    await updateChapter({ ...overChapter, number: dragNum });
    await loadChapters(currentProject!.id);
    setDrag({ dragId: null, overId: null });
  };
  const handleDragLeave = () => setDrag((prev) => ({ ...prev, overId: null }));

  // 过滤角色
  const filteredChapters = filterChars.length > 0
    ? sortedChapters.filter((ch) => ch.characters.some((id) => filterChars.includes(id)))
    : sortedChapters;

  // 获取所有出场角色
  const allChars = [...new Set(chapters.flatMap((ch) => ch.characters))]
    .map((id) => characters.find((c) => c.id === id))
    .filter(Boolean);

  // ===== 角色弧光数据构建 =====
  const buildArcData = (charId: string) => {
    const character = getCharById(charId);
    if (!character) return null;

    // 该角色出场的章节（按序号排序）
    const appearChapters = sortedChapters.filter((ch) => ch.characters.includes(charId));

    // 弧光阶段节点
    interface ArcNode {
      chapter: Chapter;
      events: string[];
      charName: string;
      status: string;
      location?: string;
      isFirst: boolean;
      isLast: boolean;
    }

    const nodes: ArcNode[] = appearChapters.map((ch, idx) => {
      const events: string[] = [];

      // 关键事件
      ch.keyEvents.forEach((e) => events.push(`📌 ${e}`));

      // 该章新增的伏笔中关联此角色的
      const addedFs = (getChapterForeshadows(ch).added as Foreshadow[]).filter((f) =>
        f.relatedCharacters.includes(charId)
      );
      addedFs.forEach((f) => events.push(`🔮 埋设伏笔：${f.content.slice(0, 30)}`));

      // 该章回收的伏笔中关联此角色的
      const resolvedFs = (getChapterForeshadows(ch).resolved as Foreshadow[]).filter((f) =>
        f.relatedCharacters.includes(charId)
      );
      resolvedFs.forEach((f) => events.push(`✅ 回收伏笔：${f.content.slice(0, 30)}`));

      // 资源变化（通过章节标题/摘要分析，这里做简化处理）
      if (ch.summary) {
        const lower = ch.summary.toLowerCase();
        if (lower.includes('获得') || lower.includes('得到') || lower.includes('学会')) {
          events.push('🎁 获得新能力/物品');
        }
        if (lower.includes('失去') || lower.includes('消耗') || lower.includes('牺牲')) {
          events.push('💔 失去/消耗');
        }
      }

      return {
        chapter: ch,
        events,
        charName: character.name,
        status: character.status,
        location: character.currentLocation,
        isFirst: idx === 0,
        isLast: idx === appearChapters.length - 1,
      };
    });

    return { character, nodes };
  };

  if (!currentProject) {
    return <div className="empty-state"><p>请先选择一个作品</p></div>;
  }

  const arcData = arcCharId ? buildArcData(arcCharId) : null;

  return (
    <div className={styles.page}>
      <div className="page-header">
        <h1>{viewMode === 'timeline' ? '📅 章节时间线' : '🎭 角色弧光'}</h1>
        <div className="actions">
          {/* 视图切换 */}
          <div className={styles.viewTabs}>
            <button
              className={`${styles.viewTab} ${viewMode === 'timeline' ? styles.viewTabActive : ''}`}
              onClick={() => setViewMode('timeline')}
            >
              📅 时间线
            </button>
            <button
              className={`${styles.viewTab} ${viewMode === 'arc' ? styles.viewTabActive : ''}`}
              onClick={() => setViewMode('arc')}
            >
              🎭 角色弧光
            </button>
          </div>
          {viewMode === 'timeline' && (
            <button className="btn btn-sm" onClick={() => setFilterChars([])}>
              {filterChars.length > 0 ? '清除筛选' : '全部章节'}
            </button>
          )}
        </div>
      </div>

      {/* ===== 章节时间线视图 ===== */}
      {viewMode === 'timeline' && (
        <>
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
              <span className={styles.legendDot} style={{ background: 'var(--warning)' }} />新增伏笔
            </span>
            <span className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: 'var(--success)' }} />回收伏笔
            </span>
            <span className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: 'var(--text-muted)' }} />拖拽可调整顺序
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
                    <div className={styles.node}>
                      <div className={styles.nodeDot} />
                      <span className={styles.nodeNum}>第{chapter.number}章</span>
                    </div>
                    <div className={styles.card}>
                      <div className={styles.cardHeader}>
                        <h3 className={styles.cardTitle}>{chapter.title}</h3>
                        <span className={`tag tag-${chapter.status}`}>{STATUS_LABELS[chapter.status]}</span>
                      </div>
                      {chapter.wordCount && (
                        <div className={styles.cardMeta}>{chapter.wordCount.toLocaleString()} 字</div>
                      )}
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
                      <div className={styles.foreshadowIndicators}>
                        {added.map((f) => (
                          <div key={f.id} className={styles.fsAdded}>+ {f.content.slice(0, 25)}...</div>
                        ))}
                        {resolved.map((f) => (
                          <div key={f.id} className={styles.fsResolved}>✓ {f.content.slice(0, 25)}...</div>
                        ))}
                      </div>
                      {chapter.summary && (
                        <p className={styles.summary}>{chapter.summary.slice(0, 80)}...</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ===== 角色弧光视图 ===== */}
      {viewMode === 'arc' && (
        <div className={styles.arcView}>
          {/* 角色选择 */}
          <div className={styles.arcSelector}>
            <span className={styles.arcSelectorLabel}>选择角色：</span>
            <select className="select" value={arcCharId}
              onChange={(e) => setArcCharId(e.target.value)}
              style={{ minWidth: '200px' }}>
              <option value="">-- 请选择 --</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {!arcCharId && (
            <div className="empty-state">
              <div className="icon">🎭</div>
              <p>选择一个角色，查看其成长弧光轨迹</p>
            </div>
          )}

          {arcData && arcData.nodes.length === 0 && (
            <div className="empty-state">
              <div className="icon">📭</div>
              <p>该角色尚未在章节中出场</p>
            </div>
          )}

          {arcData && arcData.nodes.length > 0 && (
            <div className={styles.arcContainer}>
              {/* 角色信息头 */}
              <div className={styles.arcHeader}>
                <div className={styles.arcCharName}>{arcData.character.name}</div>
                <div className={styles.arcCharMeta}>
                  <span className={`tag tag-${arcData.character.status}`}>{STATUS_LABELS[arcData.character.status]}</span>
                  {arcData.character.race && <span className={styles.arcMetaItem}>🏷 {arcData.character.race}</span>}
                  {arcData.character.currentLocation && <span className={styles.arcMetaItem}>📍 {arcData.character.currentLocation}</span>}
                  {arcData.character.arc && <span className={styles.arcMetaItem}>📐 {arcData.character.arc.slice(0, 40)}</span>}
                </div>
              </div>

              {/* 横向时间轴 */}
              <div className={styles.arcTimeline}>
                {/* 背景线 */}
                <div className={styles.arcLine} />

                {arcData.nodes.map((node, idx) => (
                  <div key={node.chapter.id} className={styles.arcNode}>
                    {/* 连接线 */}
                    <div className={styles.arcNodeLine}>
                      <div className={styles.arcNodeDot} />
                    </div>

                    {/* 章节信息 */}
                    <div className={styles.arcNodeContent}>
                      <div className={styles.arcChapterNum}>第{node.chapter.number}章</div>
                      <div className={styles.arcChapterTitle}>{node.chapter.title}</div>

                      {node.chapter.wordCount && (
                        <div className={styles.arcWordCount}>{node.chapter.wordCount.toLocaleString()} 字</div>
                      )}

                      {/* 事件列表 */}
                      {node.events.length > 0 && (
                        <div className={styles.arcEvents}>
                          {node.events.map((evt, i) => (
                            <div key={i} className={styles.arcEvent}>{evt}</div>
                          ))}
                        </div>
                      )}

                      {/* 弧光阶段标记 */}
                      {node.isFirst && (
                        <div className={styles.arcStage}>🌟 首次登场</div>
                      )}
                      {node.isLast && idx > 0 && (
                        <div className={styles.arcStage}>🏁 当前进度</div>
                      )}
                    </div>
                  </div>
                ))}

                {/* 如果出场章节少，展示弧光总结 */}
                {arcData.character.arc && (
                  <div className={styles.arcSummary}>
                    <div className={styles.arcSummaryTitle}>📐 角色弧光</div>
                    <p>{arcData.character.arc}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 章节详情弹窗（仅时间线视图） */}
      {viewMode === 'timeline' && selectedChapter && (
        <div className="modal-overlay" onClick={() => setSelectedChapter(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ minWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h2>第{selectedChapter.number}章 {selectedChapter.title}</h2>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn btn-sm" onClick={() => { setSelectedChapter(null); navigate('/chapters'); }}>去编辑</button>
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
                    <span key={id} style={{ padding: '3px 10px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}>{getCharName(id)}</span>
                  ))}
                </div>
              </div>
            )}
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
