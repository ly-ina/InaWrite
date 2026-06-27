/**
 * 角色管理页面
 * 包含角色列表、详情查看、添加/编辑、关系图谱
 */

import { useEffect, useState, useCallback } from 'react';
import { useCharacterStore } from '../store/characterStore';
import { useChapterStore } from '../store/chapterStore';
import { useAppStore } from '../store/appStore';
import { generateId, STATUS_LABELS, type Character, type Relation, type Resource } from '../types';
import { RelationGraph } from '../components/RelationGraph';
import MarkdownEditor from '../components/MarkdownEditor';
import { useUndoStore } from '../store/undoStore';
import { checkCharacterReferences, cleanupDanglingReferences } from '../utils/validation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './Characters.module.css';

export default function CharactersPage() {
  const { currentProject, refreshKey } = useAppStore();
  const { characters, loading, loadCharacters, createCharacter, updateCharacter, deleteCharacter } = useCharacterStore();
  const { chapters, loadChapters } = useChapterStore();

  // 列表 / 详情视图
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingChar, setEditingChar] = useState<Character | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showGraph, setShowGraph] = useState(false);

  // 批量操作
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 搜索
  const [search, setSearch] = useState('');
  const [filterRace, setFilterRace] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // 新角色表单
  const [formName, setFormName] = useState('');
  const [formRace, setFormRace] = useState('');
  const [formAge, setFormAge] = useState('');
  const [formStatus, setFormStatus] = useState<Character['status']>('alive');
  const [formDesc, setFormDesc] = useState('');
  const [formAppearance, setFormAppearance] = useState('');
  const [formPersonality, setFormPersonality] = useState('');

  // 关系编辑
  const [editingRelation, setEditingRelation] = useState(false);
  const [relTarget, setRelTarget] = useState('');
  const [relType, setRelType] = useState('');

  // 资源编辑
  const [editingResource, setEditingResource] = useState(false);
  const [resName, setResName] = useState('');
  const [resType, setResType] = useState('');
  const [resDesc, setResDesc] = useState('');
  const [resCost, setResCost] = useState('');

  // 加载数据
  useEffect(() => {
    if (currentProject) {
      loadCharacters(currentProject.id);
      loadChapters(currentProject.id);
    }
  }, [currentProject, loadCharacters, loadChapters, refreshKey]);

  // 选中的角色
  const selectedChar = selectedId ? characters.find((c) => c.id === selectedId) : null;

  // 过滤角色列表
  const filtered = characters.filter((c) => {
    if (search && !c.name.includes(search) && !c.aliases?.some((a) => a.includes(search))) return false;
    if (filterRace && c.race !== filterRace) return false;
    if (filterStatus && c.status !== filterStatus) return false;
    return true;
  });

  // 收集所有种族用于筛选
  const allRaces = [...new Set(characters.map((c) => c.race).filter(Boolean))];

  // 获取章节标题
  const getChapterTitle = useCallback(
    (id: string) => chapters.find((ch) => ch.id === id)?.title || `章节 #${id.slice(-4)}`,
    [chapters]
  );

  // ===== 创建角色 =====
  const handleCreate = async () => {
    if (!formName.trim() || !currentProject) return;
    const char = await createCharacter({
      projectId: currentProject.id,
      name: formName.trim(),
      aliases: [],
      race: formRace.trim() || undefined,
      age: formAge.trim() || undefined,
      appearance: formAppearance.trim() || undefined,
      personality: formPersonality.trim() || undefined,
      description: formDesc.trim(),
      status: formStatus,
      relations: [],
      resources: [],
      appearances: [],
    });
    // 刷新列表
    await loadCharacters(currentProject.id);
    setShowCreate(false);
    resetForm();
    setSelectedId(char.id);
  };

  // ===== 更新角色 =====
  const handleUpdate = async () => {
    if (!editingChar || !currentProject) return;
    await updateCharacter(editingChar);
    await loadCharacters(currentProject.id);
    setEditingChar(null);
  };

  // ===== 删除角色（含引用检查和清理） =====
  const handleDelete = async (id: string, name: string) => {
    if (!currentProject) return;
    // 检查引用
    const refs = await checkCharacterReferences(id, currentProject.id);
    let confirmMsg = `确定要删除角色「${name}」吗？`;
    if (!refs.safe) {
      confirmMsg += `\n\n⚠️ 该角色存在以下引用，删除后将自动清理：\n${refs.warnings.slice(0, 5).join('\n')}`;
      if (refs.warnings.length > 5) confirmMsg += `\n...等共 ${refs.warnings.length} 条引用`;
    }
    if (!window.confirm(confirmMsg)) return;

    // 保存到 undo 栈
    const charData = characters.find((c) => c.id === id);
    if (charData) {
      useUndoStore.getState().pushUndo({
        type: 'delete',
        target: 'character',
        description: `删除角色「${name}」`,
        data: charData,
      });
    }

    // 先清理引用
    await cleanupDanglingReferences('character', id, currentProject.id);
    // 再删除
    await deleteCharacter(id);
    if (selectedId === id) setSelectedId(null);
    await loadCharacters(currentProject.id);
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (!currentProject || selectedIds.size === 0) return;
    const names = characters.filter((c) => selectedIds.has(c.id)).map((c) => c.name);
    if (!window.confirm(`确定要删除以下 ${selectedIds.size} 个角色吗？\n${names.join('\n')}`)) return;

    for (const id of selectedIds) {
      await cleanupDanglingReferences('character', id, currentProject.id);
      await deleteCharacter(id);
    }
    setSelectedIds(new Set());
    setBatchMode(false);
    setSelectedId(null);
    await loadCharacters(currentProject.id);
  };

  // 批量改状态
  const handleBatchStatus = async (status: Character['status']) => {
    if (!currentProject || selectedIds.size === 0) return;
    for (const id of selectedIds) {
      const char = characters.find((c) => c.id === id);
      if (char) {
        await updateCharacter({ ...char, status });
      }
    }
    setSelectedIds(new Set());
    setBatchMode(false);
    await loadCharacters(currentProject.id);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ===== 关系操作 =====
  const addRelation = () => {
    if (!relTarget || !relType || !selectedChar) return;
    const newRel: Relation = { targetId: relTarget, type: relType };
    const updated = { ...selectedChar, relations: [...selectedChar.relations, newRel] };
    updateCharacter(updated).then(() => {
      loadCharacters(currentProject!.id);
      setEditingRelation(false);
      setRelTarget('');
      setRelType('');
    });
  };

  const removeRelation = (targetId: string) => {
    if (!selectedChar) return;
    const updated = {
      ...selectedChar,
      relations: selectedChar.relations.filter((r) => r.targetId !== targetId),
    };
    updateCharacter(updated).then(() => loadCharacters(currentProject!.id));
  };

  // ===== 资源操作 =====
  const addResource = () => {
    if (!resName || !selectedChar) return;
    const newRes: Resource = {
      id: generateId(),
      name: resName,
      type: resType || '其他',
      description: resDesc,
      cost: resCost || undefined,
    };
    const updated = { ...selectedChar, resources: [...selectedChar.resources, newRes] };
    updateCharacter(updated).then(() => {
      loadCharacters(currentProject!.id);
      setEditingResource(false);
      setResName('');
      setResType('');
      setResDesc('');
      setResCost('');
    });
  };

  const removeResource = (resId: string) => {
    if (!selectedChar) return;
    const updated = {
      ...selectedChar,
      resources: selectedChar.resources.filter((r) => r.id !== resId),
    };
    updateCharacter(updated).then(() => loadCharacters(currentProject!.id));
  };

  // 编辑角色初始化
  const startEdit = (char: Character) => {
    setEditingChar({ ...char });
  };

  // 重置表单
  const resetForm = () => {
    setFormName('');
    setFormRace('');
    setFormAge('');
    setFormStatus('alive');
    setFormDesc('');
    setFormAppearance('');
    setFormPersonality('');
  };

  // 获取角色名字的辅助函数
  const getCharName = (id: string) => characters.find((c) => c.id === id)?.name || '未知角色';

  if (!currentProject) {
    return <div className="empty-state"><p>请先选择一个作品</p></div>;
  }

  return (
    <div className={styles.page}>
      <div className="page-header">
        <h1>角色管理</h1>
        <div className="actions">
          {batchMode ? (
            <>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                已选 {selectedIds.size} 项
              </span>
              <button className="btn btn-sm" onClick={() => handleBatchStatus('alive')}>标记存活</button>
              <button className="btn btn-sm" onClick={() => handleBatchStatus('dead')}>标记死亡</button>
              <button className="btn btn-danger btn-sm" onClick={handleBatchDelete}>批量删除</button>
              <button className="btn btn-sm" onClick={() => { setBatchMode(false); setSelectedIds(new Set()); }}>
                取消
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-sm" onClick={() => setBatchMode(true)}>
                批量操作
              </button>
              {selectedChar && (
                <button className="btn" onClick={() => setShowGraph(!showGraph)}>
                  {showGraph ? '返回列表' : '关系图谱'}
                </button>
              )}
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                + 新角色
              </button>
            </>
          )}
        </div>
      </div>

      {/* 关系图谱视图 */}
      {showGraph && selectedChar ? (
        <div className={styles.graphSection}>
          <RelationGraph
            characters={characters}
            centerId={selectedChar.id}
            onNodeClick={(id) => setSelectedId(id)}
          />
        </div>
      ) : (
        <div className={styles.contentArea}>
          {/* 左侧角色列表 */}
          <div className={styles.listPanel}>
            {/* 搜索和筛选 */}
            <div className={styles.filters}>
              <input
                className="input"
                placeholder="搜索角色..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="select"
                value={filterRace}
                onChange={(e) => setFilterRace(e.target.value)}
              >
                <option value="">全部种族</option>
                {allRaces.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <select
                className="select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">全部状态</option>
                <option value="alive">存活</option>
                <option value="dead">死亡</option>
                <option value="unknown">未知</option>
                <option value="mentioned">提及</option>
              </select>
            </div>

            {loading ? (
              <div className="loading-spinner">加载中...</div>
            ) : filtered.length === 0 ? (
              <div className="empty-state"><p>暂无角色</p></div>
            ) : (
              <div className={styles.charList}>
                {filtered.map((char) => (
                  <div
                    key={char.id}
                    className={`${styles.charItem} ${selectedId === char.id ? styles.selected : ''}`}
                    onClick={() => batchMode ? toggleSelect(char.id) : setSelectedId(char.id)}
                  >
                    {batchMode && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(char.id)}
                        onChange={() => toggleSelect(char.id)}
                        style={{ marginRight: '6px', cursor: 'pointer' }}
                      />
                    )}
                    <div className={styles.charAvatar}>
                      {char.name.charAt(0)}
                    </div>
                    <div className={styles.charInfo}>
                      <div className={styles.charName}>{char.name}</div>
                      <div className={styles.charMeta}>
                        {char.race && <span>{char.race}</span>}
                        <span className={`tag tag-${char.status}`}>
                          {STATUS_LABELS[char.status]}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 右侧角色详情 */}
          <div className={styles.detailPanel}>
            {!selectedChar ? (
              <div className="empty-state">
                <div className="icon">👤</div>
                <p>选择左侧角色查看详情</p>
              </div>
            ) : editingChar?.id === selectedChar.id ? (
              // 编辑模式
              <div className={styles.detailContent}>
                <h2>编辑角色</h2>
                <div className="form-group">
                  <label>姓名</label>
                  <input
                    className="input"
                    value={editingChar.name}
                    onChange={(e) => setEditingChar({ ...editingChar, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>种族</label>
                  <input
                    className="input"
                    value={editingChar.race || ''}
                    onChange={(e) => setEditingChar({ ...editingChar, race: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>年龄</label>
                  <input
                    className="input"
                    value={editingChar.age || ''}
                    onChange={(e) => setEditingChar({ ...editingChar, age: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>状态</label>
                  <select
                    className="select"
                    value={editingChar.status}
                    onChange={(e) => setEditingChar({ ...editingChar, status: e.target.value as Character['status'] })}
                  >
                    <option value="alive">存活</option>
                    <option value="dead">死亡</option>
                    <option value="unknown">未知</option>
                    <option value="mentioned">提及</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>外貌</label>
                  <textarea
                    className="textarea"
                    value={editingChar.appearance || ''}
                    onChange={(e) => setEditingChar({ ...editingChar, appearance: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="form-group">
                  <label>性格</label>
                  <textarea
                    className="textarea"
                    value={editingChar.personality || ''}
                    onChange={(e) => setEditingChar({ ...editingChar, personality: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="form-group">
                  <label>描述</label>
                  <MarkdownEditor
                    value={editingChar.description}
                    onChange={(v) => setEditingChar({ ...editingChar, description: v })}
                    rows={5}
                  />
                </div>
                <div className="form-actions" style={{ borderTop: 'none', paddingTop: 0 }}>
                  <button className="btn" onClick={() => setEditingChar(null)}>取消</button>
                  <button className="btn btn-primary" onClick={handleUpdate}>保存</button>
                </div>
              </div>
            ) : (
              // 查看模式
              <div className={styles.detailContent}>
                <div className={styles.detailHeader}>
                  <div className={styles.detailAvatar}>{selectedChar.name.charAt(0)}</div>
                  <div>
                    <h2>{selectedChar.name}</h2>
                    <div className={styles.detailMeta}>
                      {selectedChar.race && <span>{selectedChar.race}</span>}
                      {selectedChar.age && <span>{selectedChar.age}</span>}
                      <span className={`tag tag-${selectedChar.status}`}>
                        {STATUS_LABELS[selectedChar.status]}
                      </span>
                    </div>
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                    <button className="btn btn-sm" onClick={() => startEdit(selectedChar)}>编辑</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(selectedChar.id, selectedChar.name)}>删除</button>
                  </div>
                </div>

                {/* 基本信息 */}
                <section className={styles.section}>
                  <h3>基本信息</h3>
                  {selectedChar.appearance && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>外貌</span>
                      <span>{selectedChar.appearance}</span>
                    </div>
                  )}
                  {selectedChar.personality && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>性格</span>
                      <span>{selectedChar.personality}</span>
                    </div>
                  )}
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>描述</span>
                    <div className={styles.mdContent}>
                      {selectedChar.description ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedChar.description}</ReactMarkdown>
                      ) : (
                        <span className={styles.muted}>暂无描述</span>
                      )}
                    </div>
                  </div>
                </section>

                {/* 出场章节 */}
                <section className={styles.section}>
                  <h3>出场章节</h3>
                  {selectedChar.appearances.length === 0 ? (
                    <span className={styles.muted}>暂无记录</span>
                  ) : (
                    <div className={styles.tagList}>
                      {selectedChar.appearances.map((chId) => (
                        <span key={chId} className={styles.chapterTag}>
                          {getChapterTitle(chId)}
                        </span>
                      ))}
                    </div>
                  )}
                </section>

                {/* 关系 */}
                <section className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <h3>角色关系</h3>
                    <button className="btn btn-sm" onClick={() => setEditingRelation(true)}>+ 添加</button>
                  </div>
                  {selectedChar.relations.length === 0 ? (
                    <span className={styles.muted}>暂无关系</span>
                  ) : (
                    <div className={styles.relationList}>
                      {selectedChar.relations.map((rel) => (
                        <div key={rel.targetId} className={styles.relationItem}>
                          <span className={styles.relType}>{rel.type}</span>
                          <span
                            className={styles.relTarget}
                            onClick={() => setSelectedId(rel.targetId)}
                            style={{ cursor: 'pointer', color: 'var(--accent)' }}
                          >
                            {getCharName(rel.targetId)}
                          </span>
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => removeRelation(rel.targetId)}
                            style={{ marginLeft: 'auto', color: 'var(--danger)', fontSize: '11px' }}
                          >
                            移除
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {editingRelation && (
                    <div className={styles.inlineForm}>
                      <select
                        className="select"
                        value={relTarget}
                        onChange={(e) => setRelTarget(e.target.value)}
                      >
                        <option value="">选择角色</option>
                        {characters
                          .filter((c) => c.id !== selectedChar.id)
                          .map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                      </select>
                      <input
                        className="input"
                        placeholder="关系类型（如：朋友、师徒）"
                        value={relType}
                        onChange={(e) => setRelType(e.target.value)}
                      />
                      <button className="btn btn-primary btn-sm" onClick={addRelation}>确定</button>
                      <button className="btn btn-sm" onClick={() => setEditingRelation(false)}>取消</button>
                    </div>
                  )}
                </section>

                {/* 资源/能力 */}
                <section className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <h3>资源/能力</h3>
                    <button className="btn btn-sm" onClick={() => setEditingResource(true)}>+ 添加</button>
                  </div>
                  {selectedChar.resources.length === 0 ? (
                    <span className={styles.muted}>暂无记录</span>
                  ) : (
                    <div className={styles.resourceList}>
                      {selectedChar.resources.map((res) => (
                        <div key={res.id} className={styles.resourceItem}>
                          <div className={styles.resName}>
                            {res.name}
                            <span className={styles.resType}>{res.type}</span>
                          </div>
                          {res.description && <div className={styles.resDesc}>{res.description}</div>}
                          {res.cost && <div className={styles.resCost}>代价：{res.cost}</div>}
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => removeResource(res.id)}
                            style={{ color: 'var(--danger)', fontSize: '11px', marginTop: '4px' }}
                          >
                            移除
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {editingResource && (
                    <div className={styles.inlineForm} style={{ flexDirection: 'column' }}>
                      <input className="input" placeholder="名称" value={resName} onChange={(e) => setResName(e.target.value)} />
                      <input className="input" placeholder="类型（武器/技能/魔法等）" value={resType} onChange={(e) => setResType(e.target.value)} />
                      <textarea className="textarea" placeholder="描述" value={resDesc} onChange={(e) => setResDesc(e.target.value)} rows={2} />
                      <input className="input" placeholder="代价（可选）" value={resCost} onChange={(e) => setResCost(e.target.value)} />
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-primary btn-sm" onClick={addResource}>确定</button>
                        <button className="btn btn-sm" onClick={() => setEditingResource(false)}>取消</button>
                      </div>
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 创建角色模态框 */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => { setShowCreate(false); resetForm(); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ minWidth: '480px' }}>
            <h2>新建角色</h2>
            <div className="form-group">
              <label>姓名 *</label>
              <input className="input" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="角色姓名" autoFocus />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label>种族</label>
                <input className="input" value={formRace} onChange={(e) => setFormRace(e.target.value)} placeholder="如：人类、精灵" />
              </div>
              <div className="form-group">
                <label>年龄</label>
                <input className="input" value={formAge} onChange={(e) => setFormAge(e.target.value)} placeholder="如：25岁" />
              </div>
            </div>
            <div className="form-group">
              <label>状态</label>
              <select className="select" value={formStatus} onChange={(e) => setFormStatus(e.target.value as Character['status'])}>
                <option value="alive">存活</option>
                <option value="dead">死亡</option>
                <option value="unknown">未知</option>
                <option value="mentioned">提及</option>
              </select>
            </div>
            <div className="form-group">
              <label>外貌</label>
              <textarea className="textarea" value={formAppearance} onChange={(e) => setFormAppearance(e.target.value)} rows={2} placeholder="描述角色的外貌特征..." />
            </div>
            <div className="form-group">
              <label>性格</label>
              <textarea className="textarea" value={formPersonality} onChange={(e) => setFormPersonality(e.target.value)} rows={2} placeholder="描述角色的性格特点..." />
            </div>
            <div className="form-group">
              <label>描述</label>
              <MarkdownEditor
                value={formDesc}
                onChange={setFormDesc}
                rows={5}
                placeholder="角色的详细描述（支持 Markdown）..."
              />
            </div>
            <div className="form-actions">
              <button className="btn" onClick={() => { setShowCreate(false); resetForm(); }}>取消</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={!formName.trim()}>创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
