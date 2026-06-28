/**
 * 角色管理页面
 * 包含角色列表、详情查看、添加/编辑、关系图谱
 */

import { useEffect, useState, useCallback } from 'react';
import { useCharacterStore } from '../store/characterStore';
import { useChapterStore } from '../store/chapterStore';
import { useAppStore } from '../store/appStore';
import { generateId, STATUS_LABELS, RELATION_TYPES, RESOURCE_STATUS_LABELS, type Character, type Relation, type Resource, type ResourceStatus, type Tag, type TagAssignment } from '../types';
import ConfirmDialog from '../components/ConfirmDialog';
import { RelationGraph } from '../components/RelationGraph';
import MarkdownEditor from '../components/MarkdownEditor';
import SearchableSelect from '../components/SearchableSelect';
import { db } from '../db/database';
import { useUndoStore } from '../store/undoStore';
import { checkCharacterReferences, cleanupDanglingReferences } from '../utils/validation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './Characters.module.css';

export default function CharactersPage() {
  const { currentProject, refreshKey } = useAppStore();
  const { characters, loading, loadCharacters, createCharacter, updateCharacter, deleteCharacter } = useCharacterStore();
  const { chapters, loadChapters } = useChapterStore();

  // 移动端检测
  const [isMobileView, setIsMobileView] = useState(() => window.innerWidth <= 768);
  useEffect(() => {
    const check = () => setIsMobileView(window.innerWidth <= 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

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
  const [filterTags, setFilterTags] = useState<Set<string>>(new Set());
  const [filterLocation, setFilterLocation] = useState('');

  // 标签筛选搜索（PC 端下拉搜索 + 移动端弹窗搜索）
  const [tagSearch, setTagSearch] = useState('');
  const [showTagPicker, setShowTagPicker] = useState(false); // 移动端标签筛选弹窗

  // 标签多选辅助
  const toggleFilterTag = (tagId: string) => {
    setFilterTags((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  };
  const clearFilterTags = () => setFilterTags(new Set());

  // 全局标签系统
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagAssignments, setTagAssignments] = useState<TagAssignment[]>([]);

  // 新角色表单
  const [formName, setFormName] = useState('');
  const [formRace, setFormRace] = useState('');
  const [formAge, setFormAge] = useState('');
  const [formStatus, setFormStatus] = useState<Character['status']>('alive');
  const [formDesc, setFormDesc] = useState('');
  const [formAppearance, setFormAppearance] = useState('');
  const [formPersonality, setFormPersonality] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formArc, setFormArc] = useState('');
  const [formSecret, setFormSecret] = useState('');
  const [formVoice, setFormVoice] = useState('');

  // 关系编辑
  const [editingRelation, setEditingRelation] = useState(false);
  const [relTarget, setRelTarget] = useState('');
  const [relType, setRelType] = useState('朋友');
  const [relDirection, setRelDirection] = useState<Relation['direction']>('双向');
  const [relPublic, setRelPublic] = useState(true);
  const [relDesc, setRelDesc] = useState('');

  // 资源编辑
  const [editingResource, setEditingResource] = useState(false);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null); // null=新增, string=编辑已有
  const [resName, setResName] = useState('');
  const [resType, setResType] = useState<Resource['type']>('能力');
  const [resDesc, setResDesc] = useState('');
  // 确认弹窗
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [resCost, setResCost] = useState('');
  const [resStatus, setResStatus] = useState<ResourceStatus>('已获得');
  const [resObtainedAt, setResObtainedAt] = useState('');

  // 加载数据 + 全局标签
  useEffect(() => {
    if (currentProject) {
      loadCharacters(currentProject.id);
      loadChapters(currentProject.id);
      loadTagsAndAssignments(currentProject.id);
    }
  }, [currentProject, loadCharacters, loadChapters, refreshKey]);

  const loadTagsAndAssignments = async (projectId: string) => {
    const [allTags, allAssignments] = await Promise.all([
      db.tags.getByProject(projectId),
      db.tagAssignments.getAll(),
    ]);
    setTags(allTags);
    setTagAssignments(allAssignments);
  };

  /** 获取角色的标签列表 */
  const getCharTags = useCallback((charId: string): Tag[] => {
    const assigned = tagAssignments.filter((a) => a.targetType === 'character' && a.targetId === charId);
    return assigned.map((a) => tags.find((t) => t.id === a.tagId)).filter(Boolean) as Tag[];
  }, [tagAssignments, tags]);

  /** 切换角色标签 */
  const toggleCharTag = async (charId: string, tagId: string) => {
    const existing = tagAssignments.find((a) => a.tagId === tagId && a.targetType === 'character' && a.targetId === charId);
    if (existing) {
      await db.tagAssignments.remove(existing.id);
    } else {
      await db.tagAssignments.add({
        id: generateId(), tagId, targetType: 'character', targetId: charId,
      });
    }
    // 重新加载
    const allAssignments = await db.tagAssignments.getAll();
    setTagAssignments(allAssignments);
  };

  // 选中的角色
  const selectedChar = selectedId ? characters.find((c) => c.id === selectedId) : null;

  // 过滤角色列表
  const filtered = characters.filter((c) => {
    if (search && !c.name.includes(search) && !c.aliases?.some((a) => a.includes(search))) return false;
    if (filterRace && c.race !== filterRace) return false;
    if (filterStatus && c.status !== filterStatus) return false;
    if (filterLocation && c.currentLocation !== filterLocation) return false;
    if (filterTags.size > 0) {
      const charTags = getCharTags(c.id);
      // 角色必须拥有所有选中的标签
      const charTagIds = new Set(charTags.map((t) => t.id));
      for (const tid of filterTags) {
        if (!charTagIds.has(tid)) return false;
      }
    }
    return true;
  });

  // 收集所有种族用于筛选
  const allRaces = [...new Set(characters.map((c) => c.race).filter(Boolean))];
  // 收集所有所在地用于筛选
  const allLocations = [...new Set(characters.map((c) => c.currentLocation).filter(Boolean))];

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
      currentLocation: formLocation.trim() || undefined,
      arc: formArc.trim() || undefined,
      secret: formSecret.trim() || undefined,
      voice: formVoice.trim() || undefined,
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
    setConfirmDialog({ title: '删除角色', message: confirmMsg, onConfirm: () => { setConfirmDialog(null); proceedDelete(); } });
    return;

    async function proceedDelete() {
    const pid = currentProject!.id;
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
    await cleanupDanglingReferences('character', id, pid);
    // 再删除
    await deleteCharacter(id);
    if (selectedId === id) setSelectedId(null);
    await loadCharacters(pid);
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (!currentProject || selectedIds.size === 0) return;
    const names = characters.filter((c) => selectedIds.has(c.id)).map((c) => c.name);
    setConfirmDialog({ title: '批量删除角色', message: `确定要删除以下 ${selectedIds.size} 个角色吗？\n${names.join('\n')}`, onConfirm: () => { setConfirmDialog(null); doBatchDelete(); } });
    return;

    async function doBatchDelete() {
    const pid = currentProject!.id;
    for (const id of selectedIds) {
      await cleanupDanglingReferences('character', id, pid);
      await deleteCharacter(id);
    }
    setSelectedIds(new Set());
    setBatchMode(false);
    setSelectedId(null);
    await loadCharacters(pid);
    }
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
    const newRel: Relation = {
      targetId: relTarget,
      type: relType,
      direction: relDirection,
      description: relDesc || undefined,
      isPublic: relPublic,
    };
    const updated = { ...selectedChar, relations: [...selectedChar.relations, newRel] };
    updateCharacter(updated).then(() => {
      loadCharacters(currentProject!.id);
      setEditingRelation(false);
      setRelTarget('');
      setRelType('朋友');
      setRelDesc('');
      setRelDirection('双向');
      setRelPublic(true);
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
  const resetResourceForm = () => {
    setEditingResource(false);
    setEditingResourceId(null);
    setResName('');
    setResType('能力');
    setResDesc('');
    setResCost('');
    setResStatus('已获得');
    setResObtainedAt('');
  };

  const openEditResource = (res: Resource) => {
    setEditingResourceId(res.id);
    setResName(res.name);
    setResType(res.type || '能力');
    setResDesc(res.description);
    setResCost(res.cost || '');
    setResStatus(res.status);
    setResObtainedAt(res.obtainedAt || '');
    setEditingResource(true);
  };

  const saveResource = () => {
    if (!resName || !selectedChar) return;
    if (editingResourceId) {
      // 编辑已有
      const updated = {
        ...selectedChar,
        resources: selectedChar.resources.map((r) =>
          r.id === editingResourceId
            ? { ...r, name: resName, type: resType || '其他', description: resDesc, status: resStatus, obtainedAt: resObtainedAt || undefined, cost: resCost || undefined }
            : r
        ),
      };
      updateCharacter(updated).then(() => {
        loadCharacters(currentProject!.id);
        resetResourceForm();
      });
    } else {
      // 新增
      const newRes: Resource = {
        id: generateId(),
        name: resName,
        type: resType || '其他',
        description: resDesc,
        status: resStatus,
        obtainedAt: resObtainedAt || undefined,
        cost: resCost || undefined,
      };
      const updated = { ...selectedChar, resources: [...selectedChar.resources, newRes] };
      updateCharacter(updated).then(() => {
        loadCharacters(currentProject!.id);
        resetResourceForm();
      });
    }
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
    setFormLocation('');
    setFormArc('');
    setFormSecret('');
    setFormVoice('');
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
              {/* 标签筛选：PC 可搜索下拉 / 移动端弹窗按钮 */}
              {/* 标签筛选：多选 */}
              {isMobileView ? (
                <>
                  <button className="select" style={{ textAlign: 'left', color: filterTags.size > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}
                    onClick={() => { setShowTagPicker(true); setTagSearch(''); }}>
                    {filterTags.size > 0 ? `🏷 已选 ${filterTags.size} 个标签` : '全部标签'}
                  </button>
                  {showTagPicker && (
                    <div className="modal-overlay" onClick={() => setShowTagPicker(false)}>
                      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '380px', width: '90%' }}>
                        <h3>选择标签（多选）</h3>
                        <input className="input" placeholder="搜索标签..." value={tagSearch}
                          onChange={(e) => setTagSearch(e.target.value)} autoFocus
                          style={{ marginBottom: '8px' }} />
                        <div style={{ maxHeight: '260px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {tags.filter((t) => !tagSearch || t.name.toLowerCase().includes(tagSearch.toLowerCase())).map((t) => (
                            <div key={t.id} className={styles.tagPickerOption}
                              style={{
                                fontWeight: filterTags.has(t.id) ? 600 : 400,
                                borderLeft: `3px solid ${t.color}`,
                                background: filterTags.has(t.id) ? 'var(--bg-hover)' : 'transparent',
                              }}
                              onClick={() => toggleFilterTag(t.id)}>
                              {filterTags.has(t.id) ? '☑' : '☐'} 🏷 {t.name}
                            </div>
                          ))}
                          {tags.length === 0 && <div style={{ padding: '10px', color: 'var(--text-muted)', fontSize: '13px' }}>暂无标签</div>}
                        </div>
                        <div className="form-actions" style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                          <button className="btn" onClick={() => { clearFilterTags(); setShowTagPicker(false); }}>清除</button>
                          <button className="btn btn-primary" onClick={() => setShowTagPicker(false)}>确定 ({filterTags.size})</button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.tagFilterDropdown}>
                  {/* 已选标签 */}
                  {filterTags.size > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '4px' }}>
                      {Array.from(filterTags).map((tid) => {
                        const t = tags.find((x) => x.id === tid);
                        return t ? (
                          <span key={tid} className={styles.tagFilterChip}
                            style={{ background: t.color + '20', color: t.color, borderColor: t.color }}
                            onClick={() => toggleFilterTag(tid)}>
                            {t.name} ✕
                          </span>
                        ) : null;
                      })}
                      <span className={styles.tagFilterClear} onClick={clearFilterTags}>清除全部</span>
                    </div>
                  )}
                  {/* 搜索框 + 下拉 */}
                  <input className="input" placeholder="搜索标签筛选..." value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    style={{ fontSize: '12px', padding: '5px 8px' }} />
                  {tagSearch && (
                    <div className={styles.tagFilterList}>
                      {tags.filter((t) => t.name.toLowerCase().includes(tagSearch.toLowerCase()) && !filterTags.has(t.id)).length === 0 ? (
                        <div className={styles.tagFilterEmpty}>无匹配标签</div>
                      ) : (
                        tags.filter((t) => t.name.toLowerCase().includes(tagSearch.toLowerCase()) && !filterTags.has(t.id)).map((t) => (
                          <div key={t.id} className={styles.tagFilterItem}
                            style={{ borderLeft: `3px solid ${t.color}` }}
                            onClick={() => { toggleFilterTag(t.id); setTagSearch(''); }}>
                            🏷 {t.name}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
              <SearchableSelect
                options={allRaces.map((r) => ({ id: r, label: r }))}
                value={filterRace}
                onChange={(id) => { setFilterRace(id); clearFilterTags(); }}
                placeholder="搜索种族..."
                emptyLabel="全部种族"
                isMobile={isMobileView}
                modalTitle="选择种族"
              />
              <SearchableSelect
                options={allLocations.map((l) => ({ id: l, label: l }))}
                value={filterLocation}
                onChange={(id) => { setFilterLocation(id); clearFilterTags(); }}
                placeholder="搜索所在地..."
                emptyLabel="全部所在地"
                isMobile={isMobileView}
                modalTitle="选择所在地"
              />
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
              {(filterTags.size > 0 || filterRace || filterStatus || filterLocation) && (
                <button className="btn btn-sm btn-ghost" onClick={() => { clearFilterTags(); setFilterRace(''); setFilterStatus(''); setFilterLocation(''); }}>
                  清除筛选
                </button>
              )}
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
                        {char.currentLocation && <span>📍 {char.currentLocation}</span>}
                        <span className={`tag tag-${char.status}`}>
                          {STATUS_LABELS[char.status]}
                        </span>
                      </div>
                      {getCharTags(char.id).length > 0 && (
                        <div className={styles.charTags}>
                          {getCharTags(char.id).slice(0, 3).map((tag) => (
                            <span key={tag.id} className={styles.charTagBadge} style={{ background: tag.color + '20', color: tag.color, borderColor: tag.color }}>
                              {tag.name}
                            </span>
                          ))}
                          {getCharTags(char.id).length > 3 && (
                            <span className={styles.charTagMore}>+{getCharTags(char.id).length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 右侧角色详情 */}
          {!isMobileView && (
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

                {/* 标签 */}
                <section className={styles.section}>
                  <h3>🏷 标签</h3>
                  <div className={styles.tagPicker}>
                    {getCharTags(selectedChar.id).map((tag) => (
                      <span
                        key={tag.id}
                        className={styles.tagBadge}
                        style={{ background: tag.color + '20', color: tag.color, borderColor: tag.color }}
                        onClick={() => toggleCharTag(selectedChar.id, tag.id)}
                        title="点击移除"
                      >
                        {tag.name} ✕
                      </span>
                    ))}
                    {tags.filter((t) => !getCharTags(selectedChar.id).some((ct) => ct.id === t.id)).length > 0 && (
                      <details className={styles.tagDropdown}>
                        <summary className={styles.tagAddBtn}>+ 添加标签</summary>
                        <div className={styles.tagDropdownList}>
                          {tags.filter((t) => !getCharTags(selectedChar.id).some((ct) => ct.id === t.id)).map((tag) => (
                            <span
                              key={tag.id}
                              className={styles.tagOption}
                              style={{ borderLeft: `3px solid ${tag.color}` }}
                              onClick={() => toggleCharTag(selectedChar.id, tag.id)}
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      </details>
                    )}
                    {tags.length === 0 && <span className={styles.tagEmpty}>暂无标签，去「🏷 标签管理」创建</span>}
                  </div>
                </section>

                {/* 基本信息 */}
                <section className={styles.section}>
                  <h3>基本信息</h3>
                  {selectedChar.currentLocation && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>所在地</span>
                      <span className={styles.locationBadge}>📍 {selectedChar.currentLocation}</span>
                    </div>
                  )}
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
                  {selectedChar.voice && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>语言风格</span>
                      <span className={styles.voiceText}>💬 {selectedChar.voice}</span>
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

                {/* 角色弧光 */}
                {selectedChar.arc && (
                  <section className={styles.section}>
                    <h3>📈 角色弧光</h3>
                    <div className={styles.mdContent}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedChar.arc}</ReactMarkdown>
                    </div>
                  </section>
                )}

                {/* 秘密（仅作者可见） */}
                {selectedChar.secret && (
                  <section className={styles.section} style={{ borderColor: 'var(--warning)', background: 'rgba(201,158,75,0.05)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                    <h3 style={{ color: 'var(--warning)' }}>🔒 秘密</h3>
                    <div className={styles.mdContent}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedChar.secret}</ReactMarkdown>
                    </div>
                  </section>
                )}

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
                          <span className={styles.relDir}>{rel.direction === '单向' ? '→' : '↔'}</span>
                          <span
                            className={styles.relTarget}
                            onClick={() => setSelectedId(rel.targetId)}
                            style={{ cursor: 'pointer', color: 'var(--accent)' }}
                          >
                            {getCharName(rel.targetId)}
                          </span>
                          {!rel.isPublic && <span className={styles.relSecret} title="秘密关系">🔒</span>}
                          {rel.description && <span className={styles.relDesc}>{rel.description}</span>}
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
                    <div className={styles.inlineForm} style={{ flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <select className="select" value={relTarget} onChange={(e) => setRelTarget(e.target.value)}>
                          <option value="">选择角色</option>
                          {characters.filter((c) => c.id !== selectedChar.id).map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        <select className="select" value={relType} onChange={(e) => setRelType(e.target.value)}>
                          {RELATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <select className="select" value={relDirection} onChange={(e) => setRelDirection(e.target.value as Relation['direction'])}>
                          <option value="双向">↔ 双向</option>
                          <option value="单向">→ 单向</option>
                        </select>
                        <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                          <input type="checkbox" checked={relPublic} onChange={(e) => setRelPublic(e.target.checked)} />
                          公开
                        </label>
                      </div>
                      <input className="input" placeholder="关系描述（可选）" value={relDesc} onChange={(e) => setRelDesc(e.target.value)} />
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-primary btn-sm" onClick={addRelation}>确定</button>
                        <button className="btn btn-sm" onClick={() => setEditingRelation(false)}>取消</button>
                      </div>
                    </div>
                  )}
                </section>

                {/* 资源/能力 */}
                <section className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <h3>资源/能力</h3>
                    <button className="btn btn-sm" onClick={() => { resetResourceForm(); setEditingResource(true); }}>+ 添加</button>
                  </div>
                  {selectedChar.resources.length === 0 && !editingResource ? (
                    <span className={styles.muted}>暂无记录</span>
                  ) : (
                    <div className={styles.resourceList}>
                      {selectedChar.resources.map((res) => (
                        <div key={res.id} className={styles.resourceItem}>
                          {editingResource && editingResourceId === res.id ? (
                            /* 编辑已有资源的内联表单 */
                            <div className={styles.inlineForm} style={{ flexDirection: 'column', marginTop: 0 }}>
                              <input className="input" placeholder="名称" value={resName} onChange={(e) => setResName(e.target.value)} autoFocus />
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <select className="select" value={resType} onChange={(e) => setResType(e.target.value as Resource['type'])}>
                                  <option value="能力">能力</option>
                                  <option value="物品">物品</option>
                                  <option value="代价">代价</option>
                                  <option value="其他">其他</option>
                                </select>
                                <select className="select" value={resStatus} onChange={(e) => setResStatus(e.target.value as ResourceStatus)}>
                                  <option value="未获得">未获得</option>
                                  <option value="已获得">已获得</option>
                                  <option value="已消耗">已消耗</option>
                                  <option value="进行中">进行中</option>
                                </select>
                              </div>
                              <textarea className="textarea" placeholder="描述" value={resDesc} onChange={(e) => setResDesc(e.target.value)} rows={2} />
                              <input className="input" placeholder="获取时间/章节（可选）" value={resObtainedAt} onChange={(e) => setResObtainedAt(e.target.value)} />
                              <input className="input" placeholder="代价（可选）" value={resCost} onChange={(e) => setResCost(e.target.value)} />
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button className="btn btn-primary btn-sm" onClick={saveResource}>保存</button>
                                <button className="btn btn-sm" onClick={resetResourceForm}>取消</button>
                              </div>
                            </div>
                          ) : (
                            /* 查看模式 */
                            <>
                              <div className={styles.resName}>
                                {res.name}
                                <span className={styles.resType}>{res.type}</span>
                                <span className={`${styles.resStatus} ${styles[`resStatus${res.status}`] || ''}`}>
                                  {res.status}
                                </span>
                              </div>
                              {res.description && <div className={styles.resDesc}>{res.description}</div>}
                              {res.obtainedAt && <div className={styles.resObtained}>📅 {res.obtainedAt}</div>}
                              {res.cost && <div className={styles.resCost}>💸 代价：{res.cost}</div>}
                              <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                                <button
                                  className="btn btn-sm btn-ghost"
                                  onClick={() => openEditResource(res)}
                                  style={{ color: 'var(--accent)', fontSize: '11px' }}
                                >
                                  编辑
                                </button>
                                <button
                                  className="btn btn-sm btn-ghost"
                                  onClick={() => removeResource(res.id)}
                                  style={{ color: 'var(--danger)', fontSize: '11px' }}
                                >
                                  移除
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {editingResource && !editingResourceId && (
                    /* 新增资源的内联表单 */
                    <div className={styles.inlineForm} style={{ flexDirection: 'column' }}>
                      <input className="input" placeholder="名称" value={resName} onChange={(e) => setResName(e.target.value)} autoFocus />
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <select className="select" value={resType} onChange={(e) => setResType(e.target.value as Resource['type'])}>
                          <option value="能力">能力</option>
                          <option value="物品">物品</option>
                          <option value="代价">代价</option>
                          <option value="其他">其他</option>
                        </select>
                        <select className="select" value={resStatus} onChange={(e) => setResStatus(e.target.value as ResourceStatus)}>
                          <option value="未获得">未获得</option>
                          <option value="已获得">已获得</option>
                          <option value="已消耗">已消耗</option>
                          <option value="进行中">进行中</option>
                        </select>
                      </div>
                      <textarea className="textarea" placeholder="描述" value={resDesc} onChange={(e) => setResDesc(e.target.value)} rows={2} />
                      <input className="input" placeholder="获取时间/章节（可选）" value={resObtainedAt} onChange={(e) => setResObtainedAt(e.target.value)} />
                      <input className="input" placeholder="代价（可选）" value={resCost} onChange={(e) => setResCost(e.target.value)} />
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-primary btn-sm" onClick={saveResource}>确定</button>
                        <button className="btn btn-sm" onClick={resetResourceForm}>取消</button>
                      </div>
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
          )}
        </div>
      )}

      {/* 移动端全屏角色详情覆盖层 */}
      {isMobileView && selectedChar && (
        <div className={`detail-full-overlay ${styles.mobileOverlay}`}>
          <div className={`detail-full-panel ${styles.mobileDetailPanel}`}>
            <div className={`detail-full-nav ${styles.mobileDetailNav}`}>
              <button className={`detail-full-back ${styles.mobileBackBtn}`} onClick={() => setSelectedId(null)}>
                ← 返回列表
              </button>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn btn-sm" onClick={() => startEdit(selectedChar)}>编辑</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(selectedChar.id, selectedChar.name)}>删除</button>
              </div>
            </div>

            {editingChar?.id === selectedChar.id ? (
              <div className={`detail-full-body ${styles.mobileDetailBody}`}>
                <h2>编辑角色</h2>
                <div className="form-group">
                  <label>姓名</label>
                  <input className="input" value={editingChar.name}
                    onChange={(e) => setEditingChar({ ...editingChar, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>种族</label>
                  <input className="input" value={editingChar.race || ''}
                    onChange={(e) => setEditingChar({ ...editingChar, race: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>年龄</label>
                  <input className="input" value={editingChar.age || ''}
                    onChange={(e) => setEditingChar({ ...editingChar, age: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>状态</label>
                  <select className="select" value={editingChar.status}
                    onChange={(e) => setEditingChar({ ...editingChar, status: e.target.value as Character['status'] })}>
                    <option value="alive">存活</option>
                    <option value="dead">死亡</option>
                    <option value="unknown">未知</option>
                    <option value="mentioned">提及</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>外貌</label>
                  <textarea className="textarea" value={editingChar.appearance || ''}
                    onChange={(e) => setEditingChar({ ...editingChar, appearance: e.target.value })} rows={2} />
                </div>
                <div className="form-group">
                  <label>性格</label>
                  <textarea className="textarea" value={editingChar.personality || ''}
                    onChange={(e) => setEditingChar({ ...editingChar, personality: e.target.value })} rows={2} />
                </div>
                <div className="form-group">
                  <label>描述</label>
                  <MarkdownEditor value={editingChar.description}
                    onChange={(v) => setEditingChar({ ...editingChar, description: v })} rows={5} />
                </div>
                <div className="form-actions" style={{ borderTop: 'none', paddingTop: 0 }}>
                  <button className="btn" onClick={() => setEditingChar(null)}>取消</button>
                  <button className="btn btn-primary" onClick={handleUpdate}>保存</button>
                </div>
              </div>
            ) : (
              <div className={`detail-full-body ${styles.mobileDetailBody}`}>
                <div className={styles.detailHeader}>
                  <div className={styles.detailAvatar}>{selectedChar.name.charAt(0)}</div>
                  <div>
                    <h2>{selectedChar.name}</h2>
                    <div className={styles.detailMeta}>
                      {selectedChar.race && <span>{selectedChar.race}</span>}
                      {selectedChar.age && <span>{selectedChar.age}</span>}
                      <span className={`tag tag-${selectedChar.status}`}>{STATUS_LABELS[selectedChar.status]}</span>
                    </div>
                  </div>
                </div>

                {/* 移动端标签 */}
                <section className={styles.section}>
                  <h3>🏷 标签</h3>
                  <div className={styles.tagPicker}>
                    {getCharTags(selectedChar.id).map((tag) => (
                      <span key={tag.id} className={styles.tagBadge}
                        style={{ background: tag.color + '20', color: tag.color, borderColor: tag.color }}
                        onClick={() => toggleCharTag(selectedChar.id, tag.id)}>
                        {tag.name} ✕
                      </span>
                    ))}
                    {tags.filter((t) => !getCharTags(selectedChar.id).some((ct) => ct.id === t.id)).length > 0 && (
                      <details className={styles.tagDropdown}>
                        <summary className={styles.tagAddBtn}>+ 添加标签</summary>
                        <div className={styles.tagDropdownList}>
                          {tags.filter((t) => !getCharTags(selectedChar.id).some((ct) => ct.id === t.id)).map((tag) => (
                            <span key={tag.id} className={styles.tagOption}
                              style={{ borderLeft: `3px solid ${tag.color}` }}
                              onClick={() => toggleCharTag(selectedChar.id, tag.id)}>
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      </details>
                    )}
                    {tags.length === 0 && <span className={styles.tagEmpty}>暂无标签，去「🏷 标签管理」创建</span>}
                  </div>
                </section>

                <section className={styles.section}>
                  <h3>基本信息</h3>
                  {selectedChar.currentLocation && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>所在地</span>
                      <span className={styles.locationBadge}>📍 {selectedChar.currentLocation}</span>
                    </div>
                  )}
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
                  {selectedChar.voice && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>语言风格</span>
                      <span className={styles.voiceText}>💬 {selectedChar.voice}</span>
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
                {selectedChar.arc && (
                  <section className={styles.section}>
                    <h3>📈 角色弧光</h3>
                    <div className={styles.mdContent}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedChar.arc}</ReactMarkdown>
                    </div>
                  </section>
                )}
                {selectedChar.secret && (
                  <section className={styles.section} style={{ borderColor: 'var(--warning)', background: 'rgba(201,158,75,0.05)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                    <h3 style={{ color: 'var(--warning)' }}>🔒 秘密</h3>
                    <div className={styles.mdContent}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedChar.secret}</ReactMarkdown>
                    </div>
                  </section>
                )}
                <section className={styles.section}>
                  <h3>出场章节</h3>
                  {selectedChar.appearances.length === 0 ? (
                    <span className={styles.muted}>暂无记录</span>
                  ) : (
                    <div className={styles.tagList}>
                      {selectedChar.appearances.map((chId) => (
                        <span key={chId} className={styles.chapterTag}>{getChapterTitle(chId)}</span>
                      ))}
                    </div>
                  )}
                </section>
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
                          <span className={styles.relDir}>{rel.direction === '单向' ? '→' : '↔'}</span>
                          <span className={styles.relTarget} onClick={() => setSelectedId(rel.targetId)} style={{ cursor: 'pointer', color: 'var(--accent)' }}>
                            {getCharName(rel.targetId)}
                          </span>
                          {!rel.isPublic && <span className={styles.relSecret} title="秘密关系">🔒</span>}
                          {rel.description && <span className={styles.relDesc}>{rel.description}</span>}
                          <button className="btn btn-sm btn-ghost" onClick={() => removeRelation(rel.targetId)} style={{ marginLeft: 'auto', color: 'var(--danger)', fontSize: '11px' }}>移除</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {editingRelation && (
                    <div className={styles.inlineForm} style={{ flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <select className="select" value={relTarget} onChange={(e) => setRelTarget(e.target.value)}>
                          <option value="">选择角色</option>
                          {characters.filter((c) => c.id !== selectedChar.id).map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        <select className="select" value={relType} onChange={(e) => setRelType(e.target.value)}>
                          {RELATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <select className="select" value={relDirection} onChange={(e) => setRelDirection(e.target.value as Relation['direction'])}>
                          <option value="双向">↔ 双向</option>
                          <option value="单向">→ 单向</option>
                        </select>
                        <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                          <input type="checkbox" checked={relPublic} onChange={(e) => setRelPublic(e.target.checked)} />公开
                        </label>
                      </div>
                      <input className="input" placeholder="关系描述（可选）" value={relDesc} onChange={(e) => setRelDesc(e.target.value)} />
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-primary btn-sm" onClick={addRelation}>确定</button>
                        <button className="btn btn-sm" onClick={() => setEditingRelation(false)}>取消</button>
                      </div>
                    </div>
                  )}
                </section>
                <section className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <h3>资源/能力</h3>
                    <button className="btn btn-sm" onClick={() => { resetResourceForm(); setEditingResource(true); }}>+ 添加</button>
                  </div>
                  {selectedChar.resources.length === 0 && !editingResource ? (
                    <span className={styles.muted}>暂无记录</span>
                  ) : (
                    <div className={styles.resourceList}>
                      {selectedChar.resources.map((res) => (
                        <div key={res.id} className={styles.resourceItem}>
                          {editingResource && editingResourceId === res.id ? (
                            <div className={styles.inlineForm} style={{ flexDirection: 'column', marginTop: 0 }}>
                              <input className="input" placeholder="名称" value={resName} onChange={(e) => setResName(e.target.value)} autoFocus />
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <select className="select" value={resType} onChange={(e) => setResType(e.target.value as Resource['type'])}>
                                  <option value="能力">能力</option>
                                  <option value="物品">物品</option>
                                  <option value="代价">代价</option>
                                  <option value="其他">其他</option>
                                </select>
                                <select className="select" value={resStatus} onChange={(e) => setResStatus(e.target.value as ResourceStatus)}>
                                  <option value="未获得">未获得</option>
                                  <option value="已获得">已获得</option>
                                  <option value="已消耗">已消耗</option>
                                  <option value="进行中">进行中</option>
                                </select>
                              </div>
                              <textarea className="textarea" placeholder="描述" value={resDesc} onChange={(e) => setResDesc(e.target.value)} rows={2} />
                              <input className="input" placeholder="获取时间/章节（可选）" value={resObtainedAt} onChange={(e) => setResObtainedAt(e.target.value)} />
                              <input className="input" placeholder="代价（可选）" value={resCost} onChange={(e) => setResCost(e.target.value)} />
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button className="btn btn-primary btn-sm" onClick={saveResource}>保存</button>
                                <button className="btn btn-sm" onClick={resetResourceForm}>取消</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className={styles.resName}>
                                {res.name}
                                <span className={styles.resType}>{res.type}</span>
                                <span className={`${styles.resStatus} ${styles[`resStatus${res.status}`] || ''}`}>{res.status}</span>
                              </div>
                              {res.description && <div className={styles.resDesc}>{res.description}</div>}
                              {res.obtainedAt && <div className={styles.resObtained}>📅 {res.obtainedAt}</div>}
                              {res.cost && <div className={styles.resCost}>💸 代价：{res.cost}</div>}
                              <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                                <button className="btn btn-sm btn-ghost" onClick={() => openEditResource(res)} style={{ color: 'var(--accent)', fontSize: '11px' }}>编辑</button>
                                <button className="btn btn-sm btn-ghost" onClick={() => removeResource(res.id)} style={{ color: 'var(--danger)', fontSize: '11px' }}>移除</button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {editingResource && !editingResourceId && (
                    <div className={styles.inlineForm} style={{ flexDirection: 'column' }}>
                      <input className="input" placeholder="名称" value={resName} onChange={(e) => setResName(e.target.value)} autoFocus />
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <select className="select" value={resType} onChange={(e) => setResType(e.target.value as Resource['type'])}>
                          <option value="能力">能力</option>
                          <option value="物品">物品</option>
                          <option value="代价">代价</option>
                          <option value="其他">其他</option>
                        </select>
                        <select className="select" value={resStatus} onChange={(e) => setResStatus(e.target.value as ResourceStatus)}>
                          <option value="未获得">未获得</option>
                          <option value="已获得">已获得</option>
                          <option value="已消耗">已消耗</option>
                          <option value="进行中">进行中</option>
                        </select>
                      </div>
                      <textarea className="textarea" placeholder="描述" value={resDesc} onChange={(e) => setResDesc(e.target.value)} rows={2} />
                      <input className="input" placeholder="获取时间/章节（可选）" value={resObtainedAt} onChange={(e) => setResObtainedAt(e.target.value)} />
                      <input className="input" placeholder="代价（可选）" value={resCost} onChange={(e) => setResCost(e.target.value)} />
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-primary btn-sm" onClick={saveResource}>确定</button>
                        <button className="btn btn-sm" onClick={resetResourceForm}>取消</button>
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
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ minWidth: '520px', maxHeight: '85vh' }}>
            <h2>新建角色</h2>
            <div className="form-group">
              <label>姓名 *</label>
              <input className="input" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="角色姓名" autoFocus />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label>种族</label>
                <input className="input" value={formRace} onChange={(e) => setFormRace(e.target.value)} placeholder="人类/精灵/..." />
              </div>
              <div className="form-group">
                <label>年龄</label>
                <input className="input" value={formAge} onChange={(e) => setFormAge(e.target.value)} placeholder="25岁" />
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
            </div>
            <div className="form-group">
              <label>当前所在地</label>
              <input className="input" value={formLocation} onChange={(e) => setFormLocation(e.target.value)} placeholder="光辉之城 / 未知" />
            </div>
            <div className="form-group">
              <label>外貌</label>
              <textarea className="textarea" value={formAppearance} onChange={(e) => setFormAppearance(e.target.value)} rows={2} placeholder="金色短发，蓝色眼眸，左脸颊有道伤疤..." />
            </div>
            <div className="form-group">
              <label>性格</label>
              <textarea className="textarea" value={formPersonality} onChange={(e) => setFormPersonality(e.target.value)} rows={2} placeholder="勇敢正直，但怕打雷，嗜甜如命..." />
            </div>
            <div className="form-group">
              <label>语言风格</label>
              <input className="input" value={formVoice} onChange={(e) => setFormVoice(e.target.value)} placeholder="说话直率带口音，激动时提高音量..." />
            </div>
            <div className="form-group">
              <label>角色弧光</label>
              <textarea className="textarea" value={formArc} onChange={(e) => setFormArc(e.target.value)} rows={2} placeholder="从逃避责任 → 接受命运 → 超越命运" />
            </div>
            <div className="form-group">
              <label>秘密（仅作者可见）</label>
              <textarea className="textarea" value={formSecret} onChange={(e) => setFormSecret(e.target.value)} rows={2} placeholder="隐藏信息，不会在导出报告中显示..." style={{ borderColor: 'var(--warning)' }} />
            </div>
            <div className="form-group">
              <label>背景描述</label>
              <MarkdownEditor value={formDesc} onChange={setFormDesc} rows={5} placeholder="角色的详细背景故事（支持 Markdown）..." />
            </div>
            <div className="form-actions">
              <button className="btn" onClick={() => { setShowCreate(false); resetForm(); }}>取消</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={!formName.trim()}>创建</button>
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
