/**
 * 大纲编辑器页面
 * 树形大纲结构，拖拽排序，绑定角色/伏笔/世界观
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { useOutlineStore } from '../store/outlineStore';
import { useCharacterStore } from '../store/characterStore';
import { useForeshadowStore } from '../store/foreshadowStore';
import { useWorldSettingStore } from '../store/worldSettingStore';
import { useChapterStore } from '../store/chapterStore';
import { generateId, type OutlineNode, type OutlineNodeType } from '../types';
import styles from './Outline.module.css';

/** 节点类型配置 */
const NODE_TYPE_CONFIG: Record<OutlineNodeType, { label: string; icon: string; indent: number }> = {
  volume: { label: '卷', icon: '📚', indent: 0 },
  chapter: { label: '章', icon: '📖', indent: 20 },
  section: { label: '节', icon: '📄', indent: 40 },
  scene: { label: '场景', icon: '🎬', indent: 60 },
};

/** 排序号步进 */
const ORDER_STEP = 1000;

export default function OutlinePage() {
  const { currentProject, triggerRefresh } = useAppStore();
  const { nodes, loading, loadNodes, createNode, updateNode, deleteNode, reorderNodes, generateFromChapters } = useOutlineStore();
  const { characters, loadCharacters } = useCharacterStore();
  const { foreshadows, loadForeshadows } = useForeshadowStore();
  const { settings, loadSettings } = useWorldSettingStore();
  const { chapters, loadChapters } = useChapterStore();

  // 编辑状态
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editType, setEditType] = useState<OutlineNodeType>('chapter');
  const [editParentId, setEditParentId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editEstWords, setEditEstWords] = useState(0);
  const [editChapterId, setEditChapterId] = useState('');
  const [editChars, setEditChars] = useState<string[]>([]);
  const [editForesPlanted, setEditForesPlanted] = useState<string[]>([]);
  const [editForesResolved, setEditForesResolved] = useState<string[]>([]);
  const [editWorldIntro, setEditWorldIntro] = useState<string[]>([]);

  // 新增节点（挂在哪个父节点下）
  const [addingParentId, setAddingParentId] = useState<string | null>(null);

  // 展开/折叠状态（内存中）
  const [collapsedMap, setCollapsedMap] = useState<Set<string>>(new Set());

  // 拖拽状态
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<'before' | 'after' | 'inside' | null>(null);

  // 从章节生成大纲
  const [showChapterPicker, setShowChapterPicker] = useState(false);
  const [selectedChapterIds, setSelectedChapterIds] = useState<Set<string>>(new Set());

  // 详情面板
  const [detailId, setDetailId] = useState<string | null>(null);

  // 过滤：只显示某类型
  const [typeFilter, setTypeFilter] = useState<OutlineNodeType | 'all'>('all');

  // 是否自动展开全部
  const [autoExpand, setAutoExpand] = useState(true);

  useEffect(() => {
    if (currentProject) {
      loadNodes(currentProject.id);
      loadCharacters(currentProject.id);
      loadForeshadows(currentProject.id);
      loadSettings(currentProject.id);
      loadChapters(currentProject.id);
    }
  }, [currentProject, loadNodes, loadCharacters, loadForeshadows, loadSettings, loadChapters]);

  /** 获取节点的子节点列表（按 sortOrder 排序） */
  const getChildren = useCallback((parentId: string | null): OutlineNode[] => {
    let result = nodes.filter((n) => n.parentId === parentId);
    result.sort((a, b) => a.sortOrder - b.sortOrder);
    return result;
  }, [nodes]);

  /** 构建扁平化显示列表（根据折叠状态决定是否展示子节点） */
  const getVisibleNodes = useCallback((): OutlineNode[] => {
    const result: OutlineNode[] = [];
    const walk = (parentId: string | null) => {
      const children = getChildren(parentId);
      for (const child of children) {
        if (typeFilter !== 'all' && child.type !== typeFilter) {
          // 仍需递归查找匹配的子节点
          walk(child.id);
          continue;
        }
        result.push(child);
        if (!collapsedMap.has(child.id)) {
          walk(child.id);
        }
      }
    };
    walk(null);
    return result;
  }, [getChildren, collapsedMap, typeFilter]);

  /** 计算同级下一个节点的 sortOrder */
  const getNextSortOrder = (parentId: string | null): number => {
    const siblings = getChildren(parentId);
    if (siblings.length === 0) return ORDER_STEP;
    return siblings[siblings.length - 1].sortOrder + ORDER_STEP;
  };

  /** 切换折叠 */
  const toggleCollapse = (id: string) => {
    setCollapsedMap((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /** 全部展开 */
  const expandAll = () => setCollapsedMap(new Set());
  /** 全部折叠 */
  const collapseAll = () => setCollapsedMap(new Set(nodes.map((n) => n.id)));

  // ===== 编辑操作 =====

  const startAdd = (parentId: string | null) => {
    setAddingParentId(parentId);
    setEditingId(null);
    setEditTitle('');
    setEditType('chapter');
    setEditParentId(parentId);
    setEditNotes('');
    setEditColor('');
    setEditEstWords(0);
    setEditChapterId('');
    setEditChars([]);
    setEditForesPlanted([]);
    setEditForesResolved([]);
    setEditWorldIntro([]);
  };

  const startEdit = (node: OutlineNode) => {
    setAddingParentId(null);
    setEditingId(node.id);
    setEditTitle(node.title);
    setEditType(node.type);
    setEditParentId(node.parentId);
    setEditNotes(node.notes || '');
    setEditColor(node.color || '');
    setEditEstWords(node.estimatedWords || 0);
    setEditChapterId(node.chapterId || '');
    setEditChars(node.characters);
    setEditForesPlanted(node.foreshadowsPlanted);
    setEditForesResolved(node.foreshadowsResolved);
    setEditWorldIntro(node.worldSettingsIntroduced);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setAddingParentId(null);
  };

  const saveNode = async () => {
    if (!editTitle.trim() || !currentProject) return;
    if (editingId) {
      // 更新
      const node = nodes.find((n) => n.id === editingId);
      if (!node) return;
      await updateNode({
        ...node,
        title: editTitle.trim(),
        type: editType,
        parentId: editParentId,
        notes: editNotes,
        color: editColor,
        estimatedWords: editEstWords,
        chapterId: editChapterId || undefined,
        characters: editChars,
        foreshadowsPlanted: editForesPlanted,
        foreshadowsResolved: editForesResolved,
        worldSettingsIntroduced: editWorldIntro,
      });
    } else {
      // 新增
      await createNode({
        projectId: currentProject.id,
        parentId: addingParentId,
        type: editType,
        title: editTitle.trim(),
        sortOrder: getNextSortOrder(addingParentId),
        characters: editChars,
        foreshadowsPlanted: editForesPlanted,
        foreshadowsResolved: editForesResolved,
        worldSettingsIntroduced: editWorldIntro,
        notes: editNotes,
        color: editColor,
        estimatedWords: editEstWords,
        chapterId: editChapterId || undefined,
      });
    }
    await loadNodes(currentProject.id);
    cancelEdit();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该节点及其所有子节点？')) return;
    await deleteNode(id);
    await loadNodes(currentProject!.id);
  };

  // ===== 拖拽操作 =====

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDragId(id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragId === id) return;

    // 判断拖放位置：上方/下方/内部
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const h = rect.height;
    if (y < h * 0.25) setDragOverPosition('before');
    else if (y > h * 0.75) setDragOverPosition('after');
    else setDragOverPosition('inside');

    setDragOverId(id);
  };

  const handleDragLeave = () => {
    setDragOverId(null);
    setDragOverPosition(null);
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = dragId;
    setDragId(null);
    setDragOverId(null);
    setDragOverPosition(null);

    if (!sourceId || sourceId === targetId || !currentProject) return;

    const sourceNode = nodes.find((n) => n.id === sourceId);
    const targetNode = nodes.find((n) => n.id === targetId);
    if (!sourceNode || !targetNode) return;

    // 不能把节点拖到自己或后代里面
    const isDescendant = (ancestorId: string, nodeId: string): boolean => {
      const children = getChildren(ancestorId);
      return children.some((c) => c.id === nodeId || isDescendant(c.id, nodeId));
    };
    if (dragOverPosition === 'inside' && isDescendant(sourceId, targetId)) return;

    let newParentId: string | null;
    let newSortOrder: number;

    if (dragOverPosition === 'inside') {
      // 放入目标内部，成为最后一个子节点
      newParentId = targetId;
      newSortOrder = getNextSortOrder(targetId);
    } else {
      // 放在目标前后，同级
      newParentId = targetNode.parentId;
      const siblings = getChildren(newParentId).filter((n) => n.id !== sourceId);
      const targetIndex = siblings.findIndex((n) => n.id === targetId);
      if (dragOverPosition === 'before') {
        siblings.splice(targetIndex, 0, sourceNode);
      } else {
        siblings.splice(targetIndex + 1, 0, sourceNode);
      }
      // 重新分配 sortOrder
      const updates = siblings.map((n, i) => ({ id: n.id, parentId: newParentId!, sortOrder: (i + 1) * ORDER_STEP }));
      // 更新源节点
      updates.push({ id: sourceId, parentId: newParentId!, sortOrder: (dragOverPosition === 'before' ? targetIndex : targetIndex + 1 + 1) * ORDER_STEP });
      await reorderNodes(updates);
      await loadNodes(currentProject.id);
      return;
    }

    // 放入内部的情况
    await reorderNodes([{ id: sourceId, parentId: newParentId, sortOrder: newSortOrder }]);
    await loadNodes(currentProject.id);
  };

  const handleRootDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const sourceId = dragId;
    setDragId(null);
    if (!sourceId || !currentProject) return;
    await reorderNodes([{ id: sourceId, parentId: null, sortOrder: getNextSortOrder(null) }]);
    await loadNodes(currentProject.id);
  };

  // ===== 多选切换 =====
  const toggleArrayItem = (arr: string[], item: string, setter: (v: string[]) => void) => {
    if (arr.includes(item)) setter(arr.filter((x) => x !== item));
    else setter([...arr, item]);
  };

  // ===== 从章节生成 =====
  const handleGenerateFromChapters = async () => {
    if (!currentProject || selectedChapterIds.size === 0) return;
    await generateFromChapters(currentProject.id, [...selectedChapterIds]);
    await loadNodes(currentProject.id);
    setShowChapterPicker(false);
    setSelectedChapterIds(new Set());
  };

  // ===== 渲染 =====
  const renderNode = (node: OutlineNode) => {
    const config = NODE_TYPE_CONFIG[node.type];
    const hasChildren = getChildren(node.id).length > 0;
    const isCollapsed = collapsedMap.has(node.id);
    const isDragging = dragId === node.id;
    const isDragOver = dragOverId === node.id;

    // 拖放指示样式
    let dropIndicatorClass = '';
    if (isDragOver && dragOverPosition === 'before') dropIndicatorClass = styles.dropBefore;
    else if (isDragOver && dragOverPosition === 'after') dropIndicatorClass = styles.dropAfter;
    else if (isDragOver && dragOverPosition === 'inside') dropIndicatorClass = styles.dropInside;

    // 关联数据预览
    const linkedChapter = chapters.find((c) => c.id === node.chapterId);
    const charNames = node.characters.map((id) => characters.find((c) => c.id === id)?.name || id).filter(Boolean);
    const foresPlanted = node.foreshadowsPlanted.map((id) => foreshadows.find((f) => f.id === id)?.content?.slice(0, 20) || id);
    const foresResolved = node.foreshadowsResolved.map((id) => foreshadows.find((f) => f.id === id)?.content?.slice(0, 20) || id);
    const worldNames = node.worldSettingsIntroduced.map((id) => settings.find((s) => s.id === id)?.name || id);

    return (
      <div key={node.id} className={styles.nodeWrapper}>
        <div
          className={`${styles.node} ${isDragging ? styles.dragging : ''} ${dropIndicatorClass}`}
          style={{
            paddingLeft: `${12 + config.indent}px`,
            borderLeft: node.color ? `3px solid ${node.color}` : undefined,
          }}
          draggable
          onDragStart={(e) => handleDragStart(e, node.id)}
          onDragOver={(e) => handleDragOver(e, node.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, node.id)}
          onClick={() => setDetailId(detailId === node.id ? null : node.id)}
        >
          {/* 展开/折叠按钮 */}
          <button
            className={styles.expandBtn}
            onClick={(e) => { e.stopPropagation(); toggleCollapse(node.id); }}
            title={isCollapsed ? '展开' : '折叠'}
          >
            {hasChildren ? (isCollapsed ? '▸' : '▾') : <span style={{ opacity: 0.3 }}>•</span>}
          </button>

          {/* 类型图标 */}
          <span className={styles.typeIcon} title={config.label}>{config.icon}</span>

          {/* 标题 */}
          <span className={styles.nodeTitle}>{node.title}</span>

          {/* 关联标记 */}
          <span className={styles.badges}>
            {linkedChapter && <span className={styles.badge} title={`关联章节：第${linkedChapter.number}章 ${linkedChapter.title}`}>📖{linkedChapter.number}</span>}
            {charNames.length > 0 && <span className={styles.badge} title={`出场：${charNames.join('、')}`}>👤{charNames.length}</span>}
            {foresPlanted.length + foresResolved.length > 0 && <span className={styles.badge} title={`伏笔 ${foresPlanted.length + foresResolved.length} 个`}>🔮{foresPlanted.length + foresResolved.length}</span>}
            {worldNames.length > 0 && <span className={styles.badge} title={`引入设定：${worldNames.join('、')}`}>🌍{worldNames.length}</span>}
            {(node.estimatedWords ?? 0) > 0 && <span className={styles.badge}>📝{node.estimatedWords}字</span>}
          </span>

          {/* 操作按钮 */}
          <div className={styles.nodeActions} onClick={(e) => e.stopPropagation()}>
            <button className={styles.actionBtn} onClick={() => startAdd(node.id)} title="添加子节点">＋</button>
            <button className={styles.actionBtn} onClick={() => startEdit(node)} title="编辑">✎</button>
            <button className={styles.actionBtn} onClick={() => handleDelete(node.id)} title="删除">✕</button>
          </div>
        </div>
      </div>
    );
  };

  /** 渲染编辑表单 */
  const renderEditForm = () => (
    <div className={styles.editPanel}>
      <h3>{editingId ? '编辑节点' : '新增节点'}</h3>
      <div className="form-group">
        <label>标题</label>
        <input className="input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
          placeholder="节点标题" autoFocus />
      </div>
      <div className="form-group">
        <label>类型</label>
        <select className="select" value={editType} onChange={(e) => setEditType(e.target.value as OutlineNodeType)}>
          <option value="volume">📚 卷</option>
          <option value="chapter">📖 章</option>
          <option value="section">📄 节</option>
          <option value="scene">🎬 场景</option>
        </select>
      </div>
      <div className="form-group">
        <label>父节点</label>
        <select className="select" value={editParentId || ''} onChange={(e) => setEditParentId(e.target.value || null)}>
          <option value="">（根节点）</option>
          {nodes.filter((n) => n.id !== editingId).map((n) => (
            <option key={n.id} value={n.id}>{NODE_TYPE_CONFIG[n.type].icon} {n.title}</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label>关联章节</label>
        <select className="select" value={editChapterId} onChange={(e) => setEditChapterId(e.target.value)}>
          <option value="">不关联</option>
          {chapters.map((ch) => (
            <option key={ch.id} value={ch.id}>第{ch.number}章 {ch.title}</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label>预估字数</label>
        <input className="input" type="number" value={editEstWords} onChange={(e) => setEditEstWords(Number(e.target.value))} />
      </div>
      <div className="form-group">
        <label>颜色标记</label>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['', '#c9a96e', '#5a9e6f', '#6b8cc9', '#c44b4b', '#c99e4b', '#9b6ec9'].map((c) => (
            <button key={c} className={styles.colorBtn} style={{
              background: c || 'transparent',
              border: editColor === c ? '2px solid var(--accent)' : '1px solid var(--border-color)',
              width: '24px', height: '24px', borderRadius: '4px', cursor: 'pointer',
            }} onClick={() => setEditColor(c)} title={c || '无'} />
          ))}
        </div>
      </div>

      {/* 关联角色 */}
      <div className="form-group">
        <label>计划出场角色</label>
        <div className={styles.chipList}>
          {characters.map((c) => (
            <span key={c.id}
              className={`${styles.chip} ${editChars.includes(c.id) ? styles.chipActive : ''}`}
              onClick={() => toggleArrayItem(editChars, c.id, setEditChars)}>
              {c.name}
            </span>
          ))}
          {characters.length === 0 && <span className={styles.muted}>暂无角色</span>}
        </div>
      </div>

      {/* 关联伏笔（埋设） */}
      <div className="form-group">
        <label>计划埋设伏笔</label>
        <div className={styles.chipList}>
          {foreshadows.map((f) => (
            <span key={f.id}
              className={`${styles.chip} ${editForesPlanted.includes(f.id) ? styles.chipActive : ''}`}
              onClick={() => toggleArrayItem(editForesPlanted, f.id, setEditForesPlanted)}>
              {f.content.slice(0, 15)}...
            </span>
          ))}
          {foreshadows.length === 0 && <span className={styles.muted}>暂无伏笔</span>}
        </div>
      </div>

      {/* 关联伏笔（回收） */}
      <div className="form-group">
        <label>计划回收伏笔</label>
        <div className={styles.chipList}>
          {foreshadows.map((f) => (
            <span key={f.id}
              className={`${styles.chip} ${editForesResolved.includes(f.id) ? styles.chipActive : ''}`}
              onClick={() => toggleArrayItem(editForesResolved, f.id, setEditForesResolved)}>
              {f.content.slice(0, 15)}...
            </span>
          ))}
          {foreshadows.length === 0 && <span className={styles.muted}>暂无伏笔</span>}
        </div>
      </div>

      {/* 引入世界观设定 */}
      <div className="form-group">
        <label>计划引入世界观设定</label>
        <div className={styles.chipList}>
          {settings.map((s) => (
            <span key={s.id}
              className={`${styles.chip} ${editWorldIntro.includes(s.id) ? styles.chipActive : ''}`}
              onClick={() => toggleArrayItem(editWorldIntro, s.id, setEditWorldIntro)}>
              {s.name}
            </span>
          ))}
          {settings.length === 0 && <span className={styles.muted}>暂无设定</span>}
        </div>
      </div>

      {/* 备注 */}
      <div className="form-group">
        <label>备注</label>
        <textarea className="textarea" value={editNotes} onChange={(e) => setEditNotes(e.target.value)}
          placeholder="大纲备注（Markdown）" rows={4} />
      </div>

      <div className={styles.editActions}>
        <button className="btn btn-primary" onClick={saveNode} disabled={!editTitle.trim()}>
          {editingId ? '保存' : '创建'}
        </button>
        <button className="btn" onClick={cancelEdit}>取消</button>
      </div>
    </div>
  );

  /** 渲染详情面板 */
  const renderDetail = () => {
    if (!detailId) return null;
    const node = nodes.find((n) => n.id === detailId);
    if (!node) return null;

    const linkedChapter = chapters.find((c) => c.id === node.chapterId);
    const charNames = node.characters.map((id) => characters.find((c) => c.id === id)?.name).filter(Boolean) as string[];
    const foresP = node.foreshadowsPlanted.map((id) => foreshadows.find((f) => f.id === id)).filter(Boolean) as NonNullable<typeof foreshadows[number]>[];
    const foresR = node.foreshadowsResolved.map((id) => foreshadows.find((f) => f.id === id)).filter(Boolean) as NonNullable<typeof foreshadows[number]>[];
    const worlds = node.worldSettingsIntroduced.map((id) => settings.find((s) => s.id === id)).filter(Boolean) as NonNullable<typeof settings[number]>[];

    return (
      <div className={styles.detailPanel}>
        <div className={styles.detailHeader}>
          <h3>{NODE_TYPE_CONFIG[node.type].icon} {node.title}</h3>
          <button className="btn btn-sm btn-ghost" onClick={() => setDetailId(null)}>✕</button>
        </div>
        <div className={styles.detailBody}>
          {linkedChapter && (
            <div className={styles.detailSection}>
              <span className={styles.detailLabel}>关联章节</span>
              <span>第{linkedChapter.number}章 {linkedChapter.title}</span>
            </div>
          )}
          {(node.estimatedWords ?? 0) > 0 && (
            <div className={styles.detailSection}>
              <span className={styles.detailLabel}>预估字数</span>
              <span>{(node.estimatedWords ?? 0).toLocaleString()} 字</span>
            </div>
          )}
          {charNames.length > 0 && (
            <div className={styles.detailSection}>
              <span className={styles.detailLabel}>出场角色</span>
              <div className={styles.chipList}>
                {charNames.map((n, i) => <span key={i} className={styles.chip}>{n}</span>)}
              </div>
            </div>
          )}
          {foresP.length > 0 && (
            <div className={styles.detailSection}>
              <span className={styles.detailLabel}>计划埋设伏笔</span>
              <ul className={styles.detailList}>
                {foresP.map((f) => <li key={f.id}>🔮 {f.content.slice(0, 60)}{f.content.length > 60 ? '...' : ''}</li>)}
              </ul>
            </div>
          )}
          {foresR.length > 0 && (
            <div className={styles.detailSection}>
              <span className={styles.detailLabel}>计划回收伏笔</span>
              <ul className={styles.detailList}>
                {foresR.map((f) => <li key={f.id}>✅ {f.content.slice(0, 60)}{f.content.length > 60 ? '...' : ''}</li>)}
              </ul>
            </div>
          )}
          {worlds.length > 0 && (
            <div className={styles.detailSection}>
              <span className={styles.detailLabel}>引入世界观设定</span>
              <div className={styles.chipList}>
                {worlds.map((w) => <span key={w.id} className={styles.chip}>{w.name}</span>)}
              </div>
            </div>
          )}
          {node.notes && (
            <div className={styles.detailSection}>
              <span className={styles.detailLabel}>备注</span>
              <p className={styles.detailNotes}>{node.notes}</p>
            </div>
          )}
          <div className={styles.detailMeta}>
            创建于 {new Date(node.createdAt).toLocaleString('zh-CN')}
            {node.updatedAt !== node.createdAt && ` · 更新于 ${new Date(node.updatedAt).toLocaleString('zh-CN')}`}
          </div>
        </div>
      </div>
    );
  };

  if (!currentProject) {
    return <div className="empty-state"><div className="icon">📋</div><p>请先选择一个作品</p></div>;
  }

  const visibleNodes = getVisibleNodes();

  return (
    <div className={styles.page}>
      <div className="page-header">
        <h1>📋 大纲编辑器</h1>
        <div className="actions">
          <button className="btn btn-sm" onClick={() => setShowChapterPicker(true)}>📖 从章节生成</button>
          <button className="btn btn-sm" onClick={autoExpand ? collapseAll : expandAll}>
            {autoExpand ? '📁 全部折叠' : '📂 全部展开'}
          </button>
          <button className="btn btn-sm" onClick={() => startAdd(null)}>＋ 新建节点</button>
        </div>
      </div>

      {/* 类型筛选 */}
      <div className={styles.filterBar}>
        {(['all', 'volume', 'chapter', 'section', 'scene'] as const).map((t) => (
          <button key={t}
            className={`${styles.filterBtn} ${typeFilter === t ? styles.filterActive : ''}`}
            onClick={() => setTypeFilter(t)}>
            {t === 'all' ? '全部' : NODE_TYPE_CONFIG[t].icon + ' ' + NODE_TYPE_CONFIG[t].label}
          </button>
        ))}
        <span className={styles.nodeCount}>{visibleNodes.length} 个节点</span>
      </div>

      {/* 主内容区：大纲列表 + 编辑/详情侧边栏 */}
      <div className={styles.mainArea}>
        <div className={styles.treeArea}>
          {loading ? (
            <div className="loading-spinner">加载中...</div>
          ) : visibleNodes.length === 0 ? (
            <div className={styles.emptyHint}>
              <p>📋 还没有大纲节点</p>
              <p>点击「新建节点」开始搭建故事大纲，或从已有章节自动生成</p>
            </div>
          ) : (
            <div
              className={styles.treeList}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleRootDrop}
            >
              {visibleNodes.map(renderNode)}
            </div>
          )}
        </div>

        {/* 右侧面板 */}
        <div className={styles.sidePanel}>
          {(editingId || addingParentId !== null) ? renderEditForm() : renderDetail()}
          {!editingId && addingParentId === null && !detailId && (
            <div className={styles.panelHint}>
              <p>👈 点击节点查看详情</p>
              <p>或点击「新建节点」开始编辑</p>
            </div>
          )}
        </div>
      </div>

      {/* 从章节生成大纲弹窗 */}
      {showChapterPicker && (
        <div className="modal-overlay" onClick={() => setShowChapterPicker(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>从章节生成大纲</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '14px' }}>
              选择要导入的章节，系统将为每个章节创建对应的大纲节点。
            </p>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {chapters.map((ch) => (
                <label key={ch.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', cursor: 'pointer' }}>
                  <input type="checkbox" checked={selectedChapterIds.has(ch.id)}
                    onChange={() => {
                      const next = new Set(selectedChapterIds);
                      if (next.has(ch.id)) next.delete(ch.id);
                      else next.add(ch.id);
                      setSelectedChapterIds(next);
                    }} />
                  第{ch.number}章 {ch.title}
                </label>
              ))}
              {chapters.length === 0 && <p className={styles.muted}>暂无章节</p>}
            </div>
            <div className="form-actions">
              <button className="btn" onClick={() => setShowChapterPicker(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleGenerateFromChapters} disabled={selectedChapterIds.size === 0}>
                生成大纲
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
