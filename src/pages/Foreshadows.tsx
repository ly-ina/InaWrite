/**
 * 伏笔追踪看板页面
 * 看板视图：按状态分列（未触发 / 进行中 / 已回收 / 已放弃）
 */

import { useEffect, useState } from 'react';
import { useForeshadowStore } from '../store/foreshadowStore';
import { useCharacterStore } from '../store/characterStore';
import { useChapterStore } from '../store/chapterStore';
import { useAppStore } from '../store/appStore';
import { STATUS_LABELS, type Foreshadow } from '../types';
import styles from './Foreshadows.module.css';

/** 看板列配置 */
const COLUMNS: { key: Foreshadow['status']; label: string; className: string }[] = [
  { key: 'pending', label: '未触发', className: 'pending' },
  { key: 'active', label: '进行中', className: 'active' },
  { key: 'resolved', label: '已回收', className: 'resolved' },
  { key: 'abandoned', label: '已放弃', className: 'abandoned' },
];

export default function ForeshadowsPage() {
  const { currentProject, refreshKey } = useAppStore();
  const { foreshadows, loading, loadForeshadows, createForeshadow, updateForeshadow, deleteForeshadow } = useForeshadowStore();
  const { characters, loadCharacters } = useCharacterStore();
  const { chapters, loadChapters } = useChapterStore();

  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingF, setEditingF] = useState<Foreshadow | null>(null);

  // 筛选
  const [filterChapterId, setFilterChapterId] = useState('');
  const [filterCharId, setFilterCharId] = useState('');

  // 创建表单
  const [formContent, setFormContent] = useState('');
  const [formFirstChapter, setFormFirstChapter] = useState('');
  const [formRelatedChars, setFormRelatedChars] = useState<string[]>([]);

  useEffect(() => {
    if (currentProject) {
      loadForeshadows(currentProject.id);
      loadCharacters(currentProject.id);
      loadChapters(currentProject.id);
    }
  }, [currentProject, loadForeshadows, loadCharacters, loadChapters, refreshKey]);

  // 筛选 + 按列分组
  const filteredForeshadows = foreshadows.filter((f) => {
    if (filterChapterId && f.firstAppearance !== filterChapterId) return false;
    if (filterCharId && !f.relatedCharacters.includes(filterCharId)) return false;
    return true;
  });

  const grouped = COLUMNS.map((col) => ({
    ...col,
    items: filteredForeshadows.filter((f) => f.status === col.key),
  }));

  // 获取名字
  const getCharName = (id: string) => characters.find((c) => c.id === id)?.name || '未知';
  const getChapterTitle = (id: string) => chapters.find((ch) => ch.id === id)?.title || `章节#${id.slice(-4)}`;

  // 创建
  const handleCreate = async () => {
    if (!formContent.trim() || !currentProject) return;
    await createForeshadow({
      projectId: currentProject.id,
      content: formContent.trim(),
      firstAppearance: formFirstChapter || '',
      status: 'pending',
      relatedCharacters: formRelatedChars,
      notes: '',
    });
    await loadForeshadows(currentProject.id);
    setShowCreate(false);
    setFormContent('');
    setFormFirstChapter('');
    setFormRelatedChars([]);
  };

  // 更新
  const handleUpdate = async () => {
    if (!editingF || !currentProject) return;
    await updateForeshadow(editingF);
    await loadForeshadows(currentProject.id);
    setEditingF(null);
  };

  // 删除
  const handleDelete = async (id: string) => {
    if (!window.confirm('确定删除此伏笔？')) return;
    await deleteForeshadow(id);
    if (selectedId === id) setSelectedId(null);
    await loadForeshadows(currentProject!.id);
  };

  // 快速切换状态
  const changeStatus = async (id: string, newStatus: Foreshadow['status']) => {
    const f = foreshadows.find((x) => x.id === id);
    if (!f) return;
    await updateForeshadow({ ...f, status: newStatus });
    await loadForeshadows(currentProject!.id);
  };

  // ===== 拖拽处理 =====
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    (e.currentTarget as HTMLElement).style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = '1';
    setDragOverCol(null);
  };

  const handleDragOver = (e: React.DragEvent, colKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(colKey);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // 仅在真正离开列时清除
    if ((e.currentTarget as HTMLElement).contains(e.relatedTarget as HTMLElement)) return;
    setDragOverCol(null);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: Foreshadow['status']) => {
    e.preventDefault();
    setDragOverCol(null);
    const id = e.dataTransfer.getData('text/plain');
    if (!id) return;
    const f = foreshadows.find((x) => x.id === id);
    if (!f || f.status === newStatus) return;
    await changeStatus(id, newStatus);
  };

  const toggleSelect = (id: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  if (!currentProject) {
    return <div className="empty-state"><p>请先选择一个作品</p></div>;
  }

  return (
    <div className={styles.page}>
      <div className="page-header">
        <h1>伏笔追踪</h1>
        <div className="actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select className="select" value={filterChapterId} onChange={(e) => setFilterChapterId(e.target.value)}
            style={{ fontSize: '12px', width: '140px' }}>
            <option value="">全部章节</option>
            {chapters.map((ch) => (
              <option key={ch.id} value={ch.id}>第{ch.number}章 {ch.title}</option>
            ))}
          </select>
          <select className="select" value={filterCharId} onChange={(e) => setFilterCharId(e.target.value)}
            style={{ fontSize: '12px', width: '120px' }}>
            <option value="">全部角色</option>
            {characters.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {(filterChapterId || filterCharId) && (
            <button className="btn btn-sm btn-ghost" onClick={() => { setFilterChapterId(''); setFilterCharId(''); }}
              style={{ fontSize: '11px' }}>
              清除筛选
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + 新伏笔
          </button>
        </div>
      </div>

      {/* 看板 */}
      {loading ? (
        <div className="loading-spinner">加载中...</div>
      ) : (
        <div className={styles.kanban}>
          {grouped.map((col) => (
            <div
              key={col.key}
              className={`${styles.column} ${styles[col.className]} ${dragOverCol === col.key ? styles.dragOver : ''}`}
              onDragOver={(e) => handleDragOver(e, col.key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.key)}
            >
              <div className={styles.columnHeader}>
                <span>{col.label}</span>
                <span className={styles.count}>{col.items.length}</span>
              </div>
              <div className={styles.columnBody}>
                {col.items.map((f) => (
                  <div
                    key={f.id}
                    className={`${styles.kanbanCard} ${selectedId === f.id ? styles.selected : ''}`}
                    draggable
                    onClick={() => setSelectedId(f.id)}
                    onDragStart={(e) => handleDragStart(e, f.id)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className={styles.cardContent}>{f.content}</div>
                    <div className={styles.cardMeta}>
                      {f.firstAppearance && (
                        <span className={styles.metaItem}>
                          📖 {getChapterTitle(f.firstAppearance)}
                        </span>
                      )}
                      {f.relatedCharacters.length > 0 && (
                        <span className={styles.metaItem}>
                          👤 {f.relatedCharacters.map(getCharName).join(', ')}
                        </span>
                      )}
                    </div>
                    {/* 拖拽提示 */}
                    <div className={styles.dragHandle} title="拖拽到其他列可切换状态">
                      ⋮⋮
                    </div>
                    {/* 状态切换按钮 */}
                    <div className={styles.cardActions}>
                      {COLUMNS.filter((c) => c.key !== f.status).map((c) => (
                        <button
                          key={c.key}
                          className="btn btn-sm btn-ghost"
                          onClick={(e) => { e.stopPropagation(); changeStatus(f.id, c.key); }}
                          style={{ fontSize: '10px', padding: '2px 6px' }}
                        >
                          → {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {col.items.length === 0 && (
                  <div className={styles.emptyColumn}>拖拽卡片到此处</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 伏笔详情弹窗 */}
      {selectedId && (() => {
        const f = foreshadows.find((x) => x.id === selectedId);
        if (!f) return null;
        return editingF?.id === f.id ? (
          // 编辑模式
          <div className="modal-overlay" onClick={() => setEditingF(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>编辑伏笔</h2>
              <div className="form-group">
                <label>内容</label>
                <textarea className="textarea" value={editingF.content}
                  onChange={(e) => setEditingF({ ...editingF, content: e.target.value })} rows={4} />
              </div>
              <div className="form-group">
                <label>状态</label>
                <select className="select" value={editingF.status}
                  onChange={(e) => setEditingF({ ...editingF, status: e.target.value as Foreshadow['status'] })}>
                  <option value="pending">未触发</option>
                  <option value="active">进行中</option>
                  <option value="resolved">已回收</option>
                  <option value="abandoned">已放弃</option>
                </select>
              </div>
              <div className="form-group">
                <label>首次出现章节</label>
                <select className="select" value={editingF.firstAppearance}
                  onChange={(e) => setEditingF({ ...editingF, firstAppearance: e.target.value })}>
                  <option value="">未选择</option>
                  {chapters.map((ch) => (
                    <option key={ch.id} value={ch.id}>第{ch.number}章 {ch.title}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>补充说明</label>
                <textarea className="textarea" value={editingF.notes || ''}
                  onChange={(e) => setEditingF({ ...editingF, notes: e.target.value })} rows={3} />
              </div>
              <div className="form-actions">
                <button className="btn" onClick={() => setEditingF(null)}>取消</button>
                <button className="btn btn-primary" onClick={handleUpdate}>保存</button>
              </div>
            </div>
          </div>
        ) : (
          // 查看模式
          <div className="modal-overlay" onClick={() => setSelectedId(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <h2 style={{ margin: 0 }}>伏笔详情</h2>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className="btn btn-sm" onClick={() => setEditingF({ ...f })}>编辑</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(f.id)}>删除</button>
                </div>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <span className={`tag tag-${f.status}`}>{STATUS_LABELS[f.status]}</span>
              </div>
              <div className="form-group">
                <label>内容</label>
                <p style={{ fontSize: '14px', lineHeight: 1.7 }}>{f.content}</p>
              </div>
              {f.firstAppearance && (
                <div className="form-group">
                  <label>首次出现</label>
                  <p style={{ fontSize: '14px' }}>{getChapterTitle(f.firstAppearance)}</p>
                </div>
              )}
              {f.relatedCharacters.length > 0 && (
                <div className="form-group">
                  <label>相关角色</label>
                  <p style={{ fontSize: '14px' }}>{f.relatedCharacters.map(getCharName).join(', ')}</p>
                </div>
              )}
              {f.notes && (
                <div className="form-group">
                  <label>补充说明</label>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{f.notes}</p>
                </div>
              )}
              <div className="form-actions" style={{ borderTop: 'none', paddingTop: 0 }}>
                <button className="btn" onClick={() => setSelectedId(null)}>关闭</button>
              </div>
            </div>
          </div>
        )}
      )()}

      {/* 创建伏笔模态框 */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>新建伏笔</h2>
            <div className="form-group">
              <label>伏笔内容 *</label>
              <textarea className="textarea" value={formContent}
                onChange={(e) => setFormContent(e.target.value)} rows={4}
                placeholder="描述这个伏笔..." autoFocus />
            </div>
            <div className="form-group">
              <label>首次出现章节</label>
              <select className="select" value={formFirstChapter}
                onChange={(e) => setFormFirstChapter(e.target.value)}>
                <option value="">未选择</option>
                {chapters.map((ch) => (
                  <option key={ch.id} value={ch.id}>第{ch.number}章 {ch.title}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>相关角色</label>
              <div style={{ maxHeight: '120px', overflow: 'auto' }}>
                {characters.map((c) => (
                  <label key={c.id} style={{ fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    <input type="checkbox" checked={formRelatedChars.includes(c.id)}
                      onChange={() => toggleSelect(c.id, formRelatedChars, setFormRelatedChars)} />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-actions">
              <button className="btn" onClick={() => setShowCreate(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={!formContent.trim()}>创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
