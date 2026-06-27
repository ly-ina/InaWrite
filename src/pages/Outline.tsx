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
import { optimizeOutline, type OutlineNodeInfo, type OutlineOptimizeResult } from '../utils/aiService';
import ConfirmDialog from '../components/ConfirmDialog';
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

  // 选择器弹窗
  const [pickerOpen, setPickerOpen] = useState<'chars' | 'foresPlanted' | 'foresResolved' | 'worldIntro' | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');

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

  // AI 优化
  const [aiOptimizing, setAiOptimizing] = useState(false);
  const [optimizeResult, setOptimizeResult] = useState<OutlineOptimizeResult | null>(null);
  const [aiError, setAiError] = useState('');
  // 确认弹窗
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  /** AI 优化大纲 */
  const handleAIOptimize = async () => {
    setAiOptimizing(true);
    setAiError('');
    setOptimizeResult(null);
    try {
      // 构建节点树
      const buildTree = (parentId: string | null): OutlineNodeInfo[] => {
        return getChildren(parentId).map((n) => ({
          title: n.title,
          type: n.type,
          notes: n.notes,
          children: buildTree(n.id),
        }));
      };
      const tree = buildTree(null);
      const result = await optimizeOutline({
        nodes: tree,
        characters: characters.map((c) => ({ name: c.name, description: c.description })),
        totalChapters: chapters.length,
      });
      setOptimizeResult(result);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI 优化失败');
    } finally {
      setAiOptimizing(false);
    }
  };

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

  const handleDelete = (id: string) => {
    setConfirmDialog({
      title: '删除大纲节点',
      message: '确定删除该节点及其所有子节点？',
      onConfirm: async () => { setConfirmDialog(null); await deleteNode(id); await loadNodes(currentProject!.id); },
    });
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
        <button className="btn btn-sm" onClick={(e) => { e.preventDefault(); setPickerOpen('chars'); setPickerSearch(''); }}>
          👤 选择角色 ({editChars.length})
        </button>
        {editChars.length > 0 && (
          <div className={styles.chipList} style={{ marginTop: '6px' }}>
            {editChars.map((id) => {
              const c = characters.find((x) => x.id === id);
              return c ? <span key={id} className={styles.chip} style={{ cursor: 'pointer' }}
                onClick={() => setEditChars((prev) => prev.filter((x) => x !== id))}>✕ {c.name}</span> : null;
            })}
          </div>
        )}
      </div>

      {/* 关联伏笔（埋设） */}
      <div className="form-group">
        <label>计划埋设伏笔</label>
        <button className="btn btn-sm" onClick={(e) => { e.preventDefault(); setPickerOpen('foresPlanted'); setPickerSearch(''); }}>
          🔮 选择伏笔 ({editForesPlanted.length})
        </button>
        {editForesPlanted.length > 0 && (
          <div className={styles.chipList} style={{ marginTop: '6px' }}>
            {editForesPlanted.map((id) => {
              const f = foreshadows.find((x) => x.id === id);
              return f ? <span key={id} className={styles.chip} style={{ cursor: 'pointer' }}
                onClick={() => setEditForesPlanted((prev) => prev.filter((x) => x !== id))}>✕ {f.content.slice(0, 15)}...</span> : null;
            })}
          </div>
        )}
      </div>

      {/* 关联伏笔（回收） */}
      <div className="form-group">
        <label>计划回收伏笔</label>
        <button className="btn btn-sm" onClick={(e) => { e.preventDefault(); setPickerOpen('foresResolved'); setPickerSearch(''); }}>
          ✅ 选择伏笔 ({editForesResolved.length})
        </button>
        {editForesResolved.length > 0 && (
          <div className={styles.chipList} style={{ marginTop: '6px' }}>
            {editForesResolved.map((id) => {
              const f = foreshadows.find((x) => x.id === id);
              return f ? <span key={id} className={styles.chip} style={{ cursor: 'pointer' }}
                onClick={() => setEditForesResolved((prev) => prev.filter((x) => x !== id))}>✕ {f.content.slice(0, 15)}...</span> : null;
            })}
          </div>
        )}
      </div>

      {/* 引入世界观设定 */}
      <div className="form-group">
        <label>计划引入世界观设定</label>
        <button className="btn btn-sm" onClick={(e) => { e.preventDefault(); setPickerOpen('worldIntro'); setPickerSearch(''); }}>
          🌍 选择设定 ({editWorldIntro.length})
        </button>
        {editWorldIntro.length > 0 && (
          <div className={styles.chipList} style={{ marginTop: '6px' }}>
            {editWorldIntro.map((id) => {
              const s = settings.find((x) => x.id === id);
              return s ? <span key={id} className={styles.chip} style={{ cursor: 'pointer' }}
                onClick={() => setEditWorldIntro((prev) => prev.filter((x) => x !== id))}>✕ {s.name}</span> : null;
            })}
          </div>
        )}
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
          <button className="btn btn-sm" onClick={handleAIOptimize} disabled={aiOptimizing || nodes.length === 0}>
            {aiOptimizing ? '⏳ AI 优化中...' : '🤖 AI 优化大纲'}
          </button>
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

      {/* AI 优化错误 */}
      {aiError && (
        <div style={{ padding: '8px 12px', background: 'rgba(196,75,75,0.1)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: '13px', marginBottom: '12px' }}>
          ⚠️ {aiError} <button className="btn btn-sm btn-ghost" onClick={() => setAiError('')} style={{ marginLeft: '8px' }}>✕</button>
        </div>
      )}

      {/* AI 优化结果 */}
      {optimizeResult && (
        <div style={{ padding: '14px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: '15px' }}>🤖 AI 优化建议</h3>
            <button className="btn btn-sm btn-ghost" onClick={() => setOptimizeResult(null)}>关闭</button>
          </div>
          {optimizeResult.suggestions.length > 0 && (
            <div style={{ marginBottom: '10px' }}>
              {optimizeResult.suggestions.map((s, i) => (
                <div key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', padding: '4px 0', lineHeight: '1.6' }}>
                  💡 {s}
                </div>
              ))}
            </div>
          )}
          {optimizeResult.optimizedOutline && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', marginBottom: '6px' }}>优化后大纲预览</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.8', whiteSpace: 'pre-wrap',
                maxHeight: '400px', overflowY: 'auto', padding: '10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                {optimizeResult.optimizedOutline.slice(0, 3000)}
              </div>
            </div>
          )}
        </div>
      )}

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

      {/* 选择器弹窗（角色/伏笔/设定） */}
      {pickerOpen && (
        <div className="modal-overlay" onClick={() => setPickerOpen(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ minWidth: '450px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <h2>
              {pickerOpen === 'chars' ? '👤 选择出场角色' :
               pickerOpen === 'foresPlanted' ? '🔮 选择埋设伏笔' :
               pickerOpen === 'foresResolved' ? '✅ 选择回收伏笔' : '🌍 选择引入设定'}
            </h2>

            {/* 搜索框 */}
            <input
              className="input"
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              placeholder="🔍 搜索..."
              style={{ marginBottom: '12px' }}
              autoFocus
            />

            {/* 列表 */}
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '350px' }}>
              {pickerOpen === 'chars' && characters
                .filter((c) => !pickerSearch || c.name.includes(pickerSearch) || (c.description || '').includes(pickerSearch))
                .map((c) => (
                  <label key={c.id} style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px',
                    cursor: 'pointer', borderRadius: 'var(--radius-sm)', marginBottom: '2px',
                    background: editChars.includes(c.id) ? 'rgba(201,169,110,0.08)' : 'transparent',
                  }}>
                    <input type="checkbox" checked={editChars.includes(c.id)}
                      onChange={() => toggleArrayItem(editChars, c.id, setEditChars)} />
                    <span style={{ fontWeight: 500 }}>{c.name}</span>
                    {c.race && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.race}</span>}
                  </label>
                ))}

              {pickerOpen === 'foresPlanted' && foreshadows
                .filter((f) => !pickerSearch || f.content.includes(pickerSearch))
                .map((f) => (
                  <label key={f.id} style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px',
                    cursor: 'pointer', borderRadius: 'var(--radius-sm)', marginBottom: '2px',
                    background: editForesPlanted.includes(f.id) ? 'rgba(201,169,110,0.08)' : 'transparent',
                  }}>
                    <input type="checkbox" checked={editForesPlanted.includes(f.id)}
                      onChange={() => toggleArrayItem(editForesPlanted, f.id, setEditForesPlanted)} />
                    <span style={{ flex: 1 }}>{f.content}</span>
                    <span className={`tag tag-${f.status}`} style={{ fontSize: '10px' }}>{f.status === 'pending' ? '未触发' : f.status === 'active' ? '进行中' : f.status === 'resolved' ? '已回收' : '已放弃'}</span>
                  </label>
                ))}

              {pickerOpen === 'foresResolved' && foreshadows
                .filter((f) => !pickerSearch || f.content.includes(pickerSearch))
                .map((f) => (
                  <label key={f.id} style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px',
                    cursor: 'pointer', borderRadius: 'var(--radius-sm)', marginBottom: '2px',
                    background: editForesResolved.includes(f.id) ? 'rgba(201,169,110,0.08)' : 'transparent',
                  }}>
                    <input type="checkbox" checked={editForesResolved.includes(f.id)}
                      onChange={() => toggleArrayItem(editForesResolved, f.id, setEditForesResolved)} />
                    <span style={{ flex: 1 }}>{f.content}</span>
                    <span className={`tag tag-${f.status}`} style={{ fontSize: '10px' }}>{f.status === 'pending' ? '未触发' : f.status === 'active' ? '进行中' : f.status === 'resolved' ? '已回收' : '已放弃'}</span>
                  </label>
                ))}

              {pickerOpen === 'worldIntro' && settings
                .filter((s) => !pickerSearch || s.name.includes(pickerSearch) || (s.description || '').includes(pickerSearch))
                .map((s) => (
                  <label key={s.id} style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px',
                    cursor: 'pointer', borderRadius: 'var(--radius-sm)', marginBottom: '2px',
                    background: editWorldIntro.includes(s.id) ? 'rgba(201,169,110,0.08)' : 'transparent',
                  }}>
                    <input type="checkbox" checked={editWorldIntro.includes(s.id)}
                      onChange={() => toggleArrayItem(editWorldIntro, s.id, setEditWorldIntro)} />
                    <span style={{ fontWeight: 500 }}>{s.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {s.type === 'location' ? '📍' : s.type === 'race' ? '👥' : s.type === 'item' ? '🗡️' : s.type === 'concept' ? '💡' : s.type === 'history' ? '📜' : '🏷'}
                    </span>
                  </label>
                ))}
            </div>

            <div className="form-actions">
              <button className="btn btn-sm" onClick={() => {
                if (pickerOpen === 'chars') setEditChars(characters.map((c) => c.id));
                else if (pickerOpen === 'foresPlanted') setEditForesPlanted(foreshadows.map((f) => f.id));
                else if (pickerOpen === 'foresResolved') setEditForesResolved(foreshadows.map((f) => f.id));
                else setEditWorldIntro(settings.map((s) => s.id));
              }}>全选</button>
              <button className="btn btn-sm" onClick={() => {
                if (pickerOpen === 'chars') setEditChars([]);
                else if (pickerOpen === 'foresPlanted') setEditForesPlanted([]);
                else if (pickerOpen === 'foresResolved') setEditForesResolved([]);
                else setEditWorldIntro([]);
              }}>清空</button>
              <div style={{ flex: 1 }} />
              <button className="btn btn-primary" onClick={() => setPickerOpen(null)}>确定</button>
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
