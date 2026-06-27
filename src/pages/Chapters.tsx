/**
 * 章节管理页面
 * 显示章节列表，支持增删改查、正文编辑、字数统计、草稿功能
 */

import { useEffect, useState, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChapterStore } from '../store/chapterStore';
import { useCharacterStore } from '../store/characterStore';
import { useForeshadowStore } from '../store/foreshadowStore';
import { useAppStore } from '../store/appStore';
import { STATUS_LABELS, type Chapter } from '../types';
import MarkdownEditor from '../components/MarkdownEditor';
import ConfirmDialog from '../components/ConfirmDialog';
import styles from './Chapters.module.css';

/** 统计中文字数 */
function countChineseWords(text: string): number {
  const chinese = text.match(/[\u4e00-\u9fff]/g);
  const words = text.match(/[a-zA-Z0-9]+/g);
  return (chinese?.length || 0) + (words?.reduce((sum, w) => sum + Math.ceil(w.length / 5), 0) || 0);
}

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
  const [formContent, setFormContent] = useState('');
  const [formKeyEvents, setFormKeyEvents] = useState('');
  const [formCharacters, setFormCharacters] = useState<string[]>([]);
  const [formForeshadowsAdded, setFormForeshadowsAdded] = useState<string[]>([]);
  const [formForeshadowsResolved, setFormForeshadowsResolved] = useState<string[]>([]);

  // 确认弹窗
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  // 独立草稿编辑器（全屏模式）
  const [draftMode, setDraftMode] = useState(false);
  const [draftChapterId, setDraftChapterId] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftWordCount, setDraftWordCount] = useState(0);
  const draftFileRef = useRef<HTMLInputElement>(null);

  /** 从文件导入草稿内容 */
  const handleDraftFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) || '';
      setDraftContent((prev) => prev ? prev + '\n\n' + text : text);
      setDraftWordCount(countChineseWords(draftContent + (draftContent ? '\n\n' : '') + text));
    };
    reader.readAsText(file);
    e.target.value = '';
  };

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
    setFormContent('');
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
    const wc = countChineseWords(formContent);
    const chapter = await createChapter({
      projectId: currentProject.id,
      number: formNumber,
      title: formTitle.trim(),
      wordCount: wc || formWordCount ? parseInt(formWordCount) : undefined,
      status: formStatus,
      summary: formSummary.trim() || undefined,
      content: formContent.trim() || undefined,
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

  // 打开草稿编辑器
  const openDraft = (ch: Chapter) => {
    setDraftChapterId(ch.id);
    setDraftTitle(ch.title);
    setDraftContent(ch.content || '');
    setDraftWordCount(countChineseWords(ch.content || ''));
    setDraftMode(true);
  };

  // 保存草稿
  const saveDraft = async () => {
    if (!draftChapterId || !currentProject) return;
    const ch = chapters.find((c) => c.id === draftChapterId);
    if (!ch) return;
    const wc = countChineseWords(draftContent);
    await updateChapter({ ...ch, content: draftContent, wordCount: wc || ch.wordCount });
    await loadChapters(currentProject.id);
    setDraftMode(false);
  };

  // 删除章节
  const handleDelete = (id: string, title: string) => {
    setConfirmDialog({
      title: '删除章节',
      message: `确定要删除章节「${title}」吗？`,
      onConfirm: async () => {
        setConfirmDialog(null);
        await deleteChapter(id);
        if (selectedId === id) setSelectedId(null);
        await loadChapters(currentProject!.id);
      },
    });
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
                <label>正文（Markdown）</label>
                <MarkdownEditor
                  value={editingChapter.content || ''}
                  onChange={(v) => setEditingChapter({ ...editingChapter, content: v, wordCount: countChineseWords(v) || editingChapter.wordCount })}
                  rows={12}
                  label={`字数：${countChineseWords(editingChapter.content || '').toLocaleString()}`}
                />
              </div>
              <div className="form-group">
                <label>摘要</label>
                <textarea className="textarea" value={editingChapter.summary || ''}
                  onChange={(e) => setEditingChapter({ ...editingChapter, summary: e.target.value })} rows={4} />
              </div>
              <div className="form-group">
                <label>出场角色</label>
                <div style={{ maxHeight: '150px', overflow: 'auto', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {characters.map((c) => (
                    <label key={c.id} style={{ fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input type="checkbox" checked={editingChapter.characters.includes(c.id)}
                        onChange={() => {
                          setEditingChapter({
                            ...editingChapter,
                            characters: editingChapter.characters.includes(c.id)
                              ? editingChapter.characters.filter((x) => x !== c.id)
                              : [...editingChapter.characters, c.id],
                          });
                        }} />
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
                      <input type="checkbox" checked={editingChapter.foreshadowsAdded.includes(f.id)}
                        onChange={() => {
                          setEditingChapter({
                            ...editingChapter,
                            foreshadowsAdded: editingChapter.foreshadowsAdded.includes(f.id)
                              ? editingChapter.foreshadowsAdded.filter((x) => x !== f.id)
                              : [...editingChapter.foreshadowsAdded, f.id],
                          });
                        }} />
                      {f.content.slice(0, 30)}...
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>回收伏笔</label>
                <div style={{ maxHeight: '100px', overflow: 'auto' }}>
                  {foreshadows.map((f) => (
                    <label key={f.id} style={{ fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input type="checkbox" checked={editingChapter.foreshadowsResolved.includes(f.id)}
                        onChange={() => {
                          setEditingChapter({
                            ...editingChapter,
                            foreshadowsResolved: editingChapter.foreshadowsResolved.includes(f.id)
                              ? editingChapter.foreshadowsResolved.filter((x) => x !== f.id)
                              : [...editingChapter.foreshadowsResolved, f.id],
                          });
                        }} />
                      {f.content.slice(0, 30)}...
                    </label>
                  ))}
                </div>
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
                    <span>{countChineseWords(selectedChapter.content || '').toLocaleString()} 字</span>
                    {selectedChapter.wordCount && <span>（标注 {selectedChapter.wordCount.toLocaleString()} 字）</span>}
                    <span className={`tag tag-${selectedChapter.status}`}>{STATUS_LABELS[selectedChapter.status]}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className="btn btn-sm" onClick={() => openDraft(selectedChapter)}>✍️ 草稿</button>
                  <button className="btn btn-sm" onClick={() => setEditingChapter({ ...selectedChapter })}>编辑</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(selectedChapter.id, selectedChapter.title)}>删除</button>
                </div>
              </div>

              {/* 正文展示 */}
              {selectedChapter.content ? (
                <section className={styles.section}>
                  <h3>正文</h3>
                  <div className={styles.contentPreview}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedChapter.content}</ReactMarkdown>
                  </div>
                </section>
              ) : (
                <section className={styles.section}>
                  <div className={styles.emptyContent}>📝 暂无正文，点击「✍️ 草稿」开始写作</div>
                </section>
              )}

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
              <label>正文（Markdown）</label>
              <MarkdownEditor
                value={formContent}
                onChange={(v) => { setFormContent(v); setFormWordCount(String(countChineseWords(v))); }}
                rows={8}
                label={`字数：${countChineseWords(formContent).toLocaleString()}`}
              />
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

      {/* 草稿编辑器弹窗（全屏） */}
      {draftMode && (
        <div className="modal-overlay" onClick={() => setDraftMode(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{
            minWidth: '90vw', maxWidth: '95vw', maxHeight: '90vh',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ margin: 0 }}>✍️ 草稿 — {draftTitle}</h2>
                <button className="btn btn-sm" onClick={() => draftFileRef.current?.click()}>📁 导入文件</button>
                <input ref={draftFileRef} type="file" accept=".txt,.md" style={{ display: 'none' }} onChange={handleDraftFileImport} />
              </div>
              <span style={{ fontSize: '13px', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                {draftWordCount.toLocaleString()} 字
              </span>
            </div>
            <MarkdownEditor
              value={draftContent}
              onChange={(v) => { setDraftContent(v); setDraftWordCount(countChineseWords(v)); }}
              rows={25}
            />
            <div className="form-actions">
              <button className="btn" onClick={() => setDraftMode(false)}>关闭</button>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                实时字数：{draftWordCount.toLocaleString()} 字
              </span>
              <button className="btn btn-primary" onClick={saveDraft}>💾 保存草稿</button>
            </div>
          </div>
        </div>
      )}

      {/* 确认弹窗 */}
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          danger
          confirmLabel="确认删除"
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}
