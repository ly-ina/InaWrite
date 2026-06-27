/**
 * 章节管理页面
 * 显示章节列表，支持增删改查、筛选排序
 */

import { useEffect, useState } from 'react';
import { useChapterStore } from '../store/chapterStore';
import { useCharacterStore } from '../store/characterStore';
import { useForeshadowStore } from '../store/foreshadowStore';
import { useAppStore } from '../store/appStore';
import { STATUS_LABELS, type Chapter } from '../types';
import styles from './Chapters.module.css';

export default function ChaptersPage() {
  const { currentProject, refreshKey } = useAppStore();
  const { chapters, loading, loadChapters, createChapter, updateChapter, deleteChapter } = useChapterStore();
  const { characters, loadCharacters } = useCharacterStore();
  const { foreshadows, loadForeshadows } = useForeshadowStore();

  // 模态框
  const [showCreate, setShowCreate] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 筛选
  const [filterStatus, setFilterStatus] = useState('');

  // 表单
  const [formTitle, setFormTitle] = useState('');
  const [formNumber, setFormNumber] = useState(1);
  const [formWordCount, setFormWordCount] = useState('');
  const [formStatus, setFormStatus] = useState<Chapter['status']>('draft');
  const [formSummary, setFormSummary] = useState('');
  const [formKeyEvents, setFormKeyEvents] = useState('');
  const [formCharacters, setFormCharacters] = useState<string[]>([]);
  const [formForeshadowsAdded, setFormForeshadowsAdded] = useState<string[]>([]);
  const [formForeshadowsResolved, setFormForeshadowsResolved] = useState<string[]>([]);

  useEffect(() => {
    if (currentProject) {
      loadChapters(currentProject.id);
      loadCharacters(currentProject.id);
      loadForeshadows(currentProject.id);
    }
  }, [currentProject, loadChapters, loadCharacters, loadForeshadows, refreshKey]);

  const selectedChapter = selectedId ? chapters.find((c) => c.id === selectedId) : null;

  const filtered = filterStatus
    ? chapters.filter((c) => c.status === filterStatus)
    : chapters;

  // 获取名字
  const getCharName = (id: string) => characters.find((c) => c.id === id)?.name || '未知';
  const getForeshadowContent = (id: string) => foreshadows.find((f) => f.id === id)?.content.slice(0, 20) || '...';

  // 重置表单
  const resetForm = () => {
    setFormTitle('');
    setFormNumber((chapters.length || 0) + 1);
    setFormWordCount('');
    setFormStatus('draft');
    setFormSummary('');
    setFormKeyEvents('');
    setFormCharacters([]);
    setFormForeshadowsAdded([]);
    setFormForeshadowsResolved([]);
  };

  // 创建章节
  const handleCreate = async () => {
    if (!formTitle.trim() || !currentProject) return;
    const chapter = await createChapter({
      projectId: currentProject.id,
      number: formNumber,
      title: formTitle.trim(),
      wordCount: formWordCount ? parseInt(formWordCount) : undefined,
      status: formStatus,
      summary: formSummary.trim() || undefined,
      keyEvents: formKeyEvents.split('\n').filter(Boolean),
      characters: formCharacters,
      foreshadowsAdded: formForeshadowsAdded,
      foreshadowsResolved: formForeshadowsResolved,
      locations: [],
    });
    await loadChapters(currentProject.id);
    setShowCreate(false);
    resetForm();
    setSelectedId(chapter.id);
  };

  // 更新章节
  const handleUpdate = async () => {
    if (!editingChapter || !currentProject) return;
    await updateChapter(editingChapter);
    await loadChapters(currentProject.id);
    setEditingChapter(null);
  };

  // 删除章节
  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`确定要删除章节「${title}」吗？`)) return;
    await deleteChapter(id);
    if (selectedId === id) setSelectedId(null);
    await loadChapters(currentProject!.id);
  };

  // 切换多选
  const toggleSelect = (id: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  if (!currentProject) {
    return <div className="empty-state"><p>请先选择一个作品</p></div>;
  }

  return (
    <div className={styles.page}>
      <div className="page-header">
        <h1>章节管理</h1>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowCreate(true); }}>
          + 新章节
        </button>
      </div>

      <div className={styles.contentArea}>
        {/* 左侧列表 */}
        <div className={styles.listPanel}>
          <div className={styles.filters}>
            <select
              className="select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">全部状态</option>
              <option value="draft">草稿</option>
              <option value="revising">修订中</option>
              <option value="done">已完成</option>
            </select>
          </div>

          {loading ? (
            <div className="loading-spinner">加载中...</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><p>暂无章节</p></div>
          ) : (
            <div className={styles.chapterList}>
              {filtered.map((ch) => (
                <div
                  key={ch.id}
                  className={`${styles.chapterItem} ${selectedId === ch.id ? styles.selected : ''}`}
                  onClick={() => setSelectedId(ch.id)}
                >
                  <span className={styles.chNumber}>第{ch.number}章</span>
                  <span className={styles.chTitle}>{ch.title}</span>
                  <span className={`tag tag-${ch.status}`}>{STATUS_LABELS[ch.status]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 右侧详情 */}
        <div className={styles.detailPanel}>
          {!selectedChapter ? (
            <div className="empty-state">
              <div className="icon">📖</div>
              <p>选择左侧章节查看详情</p>
            </div>
          ) : editingChapter?.id === selectedChapter.id ? (
            // 编辑模式
            <div className={styles.detailContent}>
              <h2>编辑章节</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label>序号</label>
                  <input className="input" type="number" value={editingChapter.number}
                    onChange={(e) => setEditingChapter({ ...editingChapter, number: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="form-group">
                  <label>字数</label>
                  <input className="input" type="number" value={editingChapter.wordCount || ''}
                    onChange={(e) => setEditingChapter({ ...editingChapter, wordCount: parseInt(e.target.value) || undefined })} />
                </div>
              </div>
              <div className="form-group">
                <label>标题</label>
                <input className="input" value={editingChapter.title}
                  onChange={(e) => setEditingChapter({ ...editingChapter, title: e.target.value })} />
              </div>
              <div className="form-group">
                <label>状态</label>
                <select className="select" value={editingChapter.status}
                  onChange={(e) => setEditingChapter({ ...editingChapter, status: e.target.value as Chapter['status'] })}>
                  <option value="draft">草稿</option>
                  <option value="revising">修订中</option>
                  <option value="done">已完成</option>
                </select>
              </div>
              <div className="form-group">
                <label>摘要</label>
                <textarea className="textarea" value={editingChapter.summary || ''}
                  onChange={(e) => setEditingChapter({ ...editingChapter, summary: e.target.value })} rows={4} />
              </div>
              <div className="form-actions" style={{ borderTop: 'none', paddingTop: 0 }}>
                <button className="btn" onClick={() => setEditingChapter(null)}>取消</button>
                <button className="btn btn-primary" onClick={handleUpdate}>保存</button>
              </div>
            </div>
          ) : (
            // 查看模式
            <div className={styles.detailContent}>
              <div className={styles.detailHeader}>
                <div>
                  <div className={styles.chapterBadge}>第{selectedChapter.number}章</div>
                  <h2>{selectedChapter.title}</h2>
                  <div className={styles.detailMeta}>
                    {selectedChapter.wordCount && <span>{selectedChapter.wordCount.toLocaleString()} 字</span>}
                    <span className={`tag tag-${selectedChapter.status}`}>{STATUS_LABELS[selectedChapter.status]}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className="btn btn-sm" onClick={() => setEditingChapter({ ...selectedChapter })}>编辑</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(selectedChapter.id, selectedChapter.title)}>删除</button>
                </div>
              </div>

              {selectedChapter.summary && (
                <section className={styles.section}>
                  <h3>内容摘要</h3>
                  <p className={styles.summary}>{selectedChapter.summary}</p>
                </section>
              )}

              {selectedChapter.keyEvents.length > 0 && (
                <section className={styles.section}>
                  <h3>关键事件</h3>
                  <ul className={styles.eventList}>
                    {selectedChapter.keyEvents.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </section>
              )}

              {selectedChapter.characters.length > 0 && (
                <section className={styles.section}>
                  <h3>出场角色</h3>
                  <div className={styles.tagList}>
                    {selectedChapter.characters.map((id) => (
                      <span key={id} className={styles.relatedTag}>{getCharName(id)}</span>
                    ))}
                  </div>
                </section>
              )}

              {selectedChapter.foreshadowsAdded.length > 0 && (
                <section className={styles.section}>
                  <h3>新增伏笔</h3>
                  <div className={styles.tagList}>
                    {selectedChapter.foreshadowsAdded.map((id) => (
                      <span key={id} className={styles.relatedTag} style={{ background: 'rgba(201, 158, 75, 0.15)', color: 'var(--warning)' }}>
                        {getForeshadowContent(id)}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {selectedChapter.foreshadowsResolved.length > 0 && (
                <section className={styles.section}>
                  <h3>回收伏笔</h3>
                  <div className={styles.tagList}>
                    {selectedChapter.foreshadowsResolved.map((id) => (
                      <span key={id} className={styles.relatedTag} style={{ background: 'rgba(90, 158, 111, 0.15)', color: 'var(--success)' }}>
                        {getForeshadowContent(id)}
                      </span>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 创建章节模态框 */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => { setShowCreate(false); resetForm(); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ minWidth: '520px' }}>
            <h2>新建章节</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label>序号</label>
                <input className="input" type="number" value={formNumber}
                  onChange={(e) => setFormNumber(parseInt(e.target.value) || 1)} />
              </div>
              <div className="form-group">
                <label>字数</label>
                <input className="input" type="number" value={formWordCount}
                  onChange={(e) => setFormWordCount(e.target.value)} placeholder="可选" />
              </div>
            </div>
            <div className="form-group">
              <label>标题 *</label>
              <input className="input" value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
                placeholder="章节标题" autoFocus />
            </div>
            <div className="form-group">
              <label>状态</label>
              <select className="select" value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as Chapter['status'])}>
                <option value="draft">草稿</option>
                <option value="revising">修订中</option>
                <option value="done">已完成</option>
              </select>
            </div>
            <div className="form-group">
              <label>内容摘要</label>
              <textarea className="textarea" value={formSummary}
                onChange={(e) => setFormSummary(e.target.value)} rows={3} placeholder="简单描述本章内容..." />
            </div>
            <div className="form-group">
              <label>关键事件（每行一个）</label>
              <textarea className="textarea" value={formKeyEvents}
                onChange={(e) => setFormKeyEvents(e.target.value)} rows={3} placeholder="事件1&#10;事件2" />
            </div>
            <div className="form-group">
              <label>出场角色</label>
              <div style={{ maxHeight: '120px', overflow: 'auto', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {characters.map((c) => (
                  <label key={c.id} style={{ fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input type="checkbox" checked={formCharacters.includes(c.id)}
                      onChange={() => toggleSelect(c.id, formCharacters, setFormCharacters)} />
                    {c.name}
                  </label>
                ))}
                {characters.length === 0 && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>暂无角色</span>}
              </div>
            </div>
            <div className="form-group">
              <label>新增伏笔</label>
              <div style={{ maxHeight: '100px', overflow: 'auto' }}>
                {foreshadows.map((f) => (
                  <label key={f.id} style={{ fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input type="checkbox" checked={formForeshadowsAdded.includes(f.id)}
                      onChange={() => toggleSelect(f.id, formForeshadowsAdded, setFormForeshadowsAdded)} />
                    {f.content.slice(0, 30)}...
                  </label>
                ))}
              </div>
            </div>
            <div className="form-actions">
              <button className="btn" onClick={() => { setShowCreate(false); resetForm(); }}>取消</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={!formTitle.trim()}>创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
