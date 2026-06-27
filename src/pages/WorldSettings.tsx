/**
 * 世界观设定管理页面
 * 树形列表 + 详情查看 + 增删改
 */

import { useEffect, useState, useMemo } from 'react';
import { useWorldSettingStore } from '../store/worldSettingStore';
import { useAppStore } from '../store/appStore';
import { generateId, type WorldSetting, type SettingRelation } from '../types';
import MarkdownEditor from '../components/MarkdownEditor';
import { SettingGraph } from '../components/SettingGraph';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './WorldSettings.module.css';

/** 类型图标映射 */
const TYPE_ICONS: Record<string, string> = {
  location: '📍',
  race: '👥',
  item: '🗡️',
  concept: '💡',
  history: '📜',
  custom: '🏷️',
};

/** 类型名称映射 */
const TYPE_NAMES: Record<string, string> = {
  location: '地点',
  race: '种族',
  item: '物品',
  concept: '概念',
  history: '历史',
  custom: '自定义',
};

export default function WorldSettingsPage() {
  const { currentProject, refreshKey } = useAppStore();
  const { settings, loading, loadSettings, createSetting, updateSetting, deleteSetting } = useWorldSettingStore();

  // UI 状态
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingSetting, setEditingSetting] = useState<WorldSetting | null>(null);
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // 新设定表单
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<WorldSetting['type']>('location');
  const [formDesc, setFormDesc] = useState('');
  const [formParentId, setFormParentId] = useState('');

  // 关联编辑
  const [editingRelation, setEditingRelation] = useState(false);
  const [relTarget, setRelTarget] = useState('');
  const [relType, setRelType] = useState('');
  const [showGraph, setShowGraph] = useState(false);

  useEffect(() => {
    if (currentProject) {
      loadSettings(currentProject.id);
    }
  }, [currentProject, loadSettings, refreshKey]);

  const selectedSetting = selectedId ? settings.find((s) => s.id === selectedId) : null;

  // 构建树形结构
  const tree = useMemo(() => {
    const map = new Map<string, WorldSetting & { children: WorldSetting[] }>();
    const roots: (WorldSetting & { children: WorldSetting[] })[] = [];

    settings.forEach((s) => {
      map.set(s.id, { ...s, children: [] });
    });

    settings.forEach((s) => {
      const node = map.get(s.id)!;
      if (s.parentId && map.has(s.parentId)) {
        map.get(s.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }, [settings]);

  // 搜索过滤（使用 any 避免递归类型复杂性）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filterTree = (nodes: any[]): any[] => {
    if (!search) return nodes;
    const result: typeof tree = [];
    nodes.forEach((node) => {
      const matches = node.name.includes(search) || node.description.includes(search);
      const filteredChildren = filterTree(node.children);
      if (matches || filteredChildren.length > 0) {
        result.push({ ...node, children: filteredChildren });
      }
    });
    return result;
  };

  const filteredTree = filterTree(tree);

  // 展开所有匹配的节点
  useEffect(() => {
    if (search) {
      const ids = new Set<string>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const collect = (nodes: any[]) => {
        nodes.forEach((n: { id: string; children: unknown[] }) => {
          if (n.children.length > 0) ids.add(n.id);
          collect(n.children);
        });
      };
      collect(filteredTree);
      setExpandedIds(ids);
    }
  }, [search]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 创建
  const handleCreate = async () => {
    if (!formName.trim() || !currentProject) return;
    const setting = await createSetting({
      projectId: currentProject.id,
      name: formName.trim(),
      type: formType,
      description: formDesc.trim(),
      parentId: formParentId || undefined,
      relations: [],
    });
    await loadSettings(currentProject.id);
    setShowCreate(false);
    resetForm();
    setSelectedId(setting.id);
  };

  // 更新
  const handleUpdate = async () => {
    if (!editingSetting || !currentProject) return;
    await updateSetting(editingSetting);
    await loadSettings(currentProject.id);
    setEditingSetting(null);
  };

  // 删除（级联删除子设定）
  const handleDelete = async (id: string, name: string) => {
    const children = settings.filter((s) => s.parentId === id);
    const msg = children.length > 0
      ? `确定要删除「${name}」及其 ${children.length} 个子设定吗？`
      : `确定要删除「${name}」吗？`;
    if (!window.confirm(msg)) return;

    // 递归收集所有子孙
    const toDelete = new Set<string>();
    const collectChildren = (pid: string) => {
      settings.filter((s) => s.parentId === pid).forEach((s) => {
        toDelete.add(s.id);
        collectChildren(s.id);
      });
    };
    toDelete.add(id);
    collectChildren(id);

    // 逐个删除
    for (const did of toDelete) {
      await deleteSetting(did);
    }
    if (selectedId && toDelete.has(selectedId)) setSelectedId(null);
    await loadSettings(currentProject!.id);
  };

  // 关系操作
  const addRelation = () => {
    if (!relTarget || !relType || !selectedSetting) return;
    const newRel: SettingRelation = { targetId: relTarget, type: relType };
    const updated = { ...selectedSetting, relations: [...selectedSetting.relations, newRel] };
    updateSetting(updated).then(() => loadSettings(currentProject!.id));
    setEditingRelation(false);
    setRelTarget('');
    setRelType('');
  };

  const removeRelation = (targetId: string) => {
    if (!selectedSetting) return;
    const updated = { ...selectedSetting, relations: selectedSetting.relations.filter((r) => r.targetId !== targetId) };
    updateSetting(updated).then(() => loadSettings(currentProject!.id));
  };

  const resetForm = () => {
    setFormName('');
    setFormType('location');
    setFormDesc('');
    setFormParentId('');
  };

  const getSettingName = (id: string) => settings.find((s) => s.id === id)?.name || '未知设定';

  /** 递归渲染树节点 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTreeNode = (node: any, depth: number = 0) => {
    const isExpanded = expandedIds.has(node.id);
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.id}>
        <div
          className={`${styles.treeItem} ${selectedId === node.id ? styles.selected : ''}`}
          style={{ paddingLeft: `${12 + depth * 20}px` }}
          onClick={() => setSelectedId(node.id)}
        >
          {hasChildren ? (
            <span className={styles.expandBtn} onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}>
              {isExpanded ? '▾' : '▸'}
            </span>
          ) : (
            <span className={styles.expandBtn} style={{ visibility: 'hidden' }}>▸</span>
          )}
          <span className={styles.typeIcon}>{TYPE_ICONS[node.type] || '📌'}</span>
          <span className={styles.treeName}>{node.name}</span>
          <span className={styles.typeTag}>{TYPE_NAMES[node.type]}</span>
        </div>
        {isExpanded && hasChildren && (
          <div>
            {node.children.map((child: typeof node) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!currentProject) {
    return <div className="empty-state"><p>请先选择一个作品</p></div>;
  }

  return (
    <div className={styles.page}>
      <div className="page-header">
        <h1>世界观设定</h1>
        <div className="actions">
          {settings.length > 0 && (
            <button className="btn" onClick={() => setShowGraph(!showGraph)}>
              {showGraph ? '返回列表' : '关联图谱'}
            </button>
          )}
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowCreate(true); }}>
            + 新设定
          </button>
        </div>
      </div>

      {/* 关联图谱视图 */}
      {showGraph ? (
        <div className={styles.graphSection}>
          <SettingGraph
            settings={settings}
            centerId={selectedId || undefined}
            onNodeClick={(id) => { setSelectedId(id); setShowGraph(false); }}
          />
        </div>
      ) : (
      <div className={styles.contentArea}>
        {/* 左侧树形列表 */}
        <div className={styles.listPanel}>
          <div className={styles.filters}>
            <input
              className="input"
              placeholder="搜索设定..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {loading ? (
            <div className="loading-spinner">加载中...</div>
          ) : filteredTree.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🌍</div>
              <p>还没有世界观设定</p>
              <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowCreate(true); }}>
                + 创建第一个设定
              </button>
            </div>
          ) : (
            <div className={styles.treeList}>
              {filteredTree.map((node) => renderTreeNode(node))}
            </div>
          )}
        </div>

        {/* 右侧详情 */}
        <div className={styles.detailPanel}>
          {!selectedSetting ? (
            <div className="empty-state">
              <div className="icon">🌍</div>
              <p>选择左侧设定查看详情</p>
            </div>
          ) : editingSetting?.id === selectedSetting.id ? (
            // 编辑模式
            <div className={styles.detailContent}>
              <h2>编辑设定</h2>
              <div className="form-group">
                <label>名称</label>
                <input className="input" value={editingSetting.name}
                  onChange={(e) => setEditingSetting({ ...editingSetting, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>类型</label>
                <select className="select" value={editingSetting.type}
                  onChange={(e) => setEditingSetting({ ...editingSetting, type: e.target.value as WorldSetting['type'] })}>
                  {Object.entries(TYPE_NAMES).map(([k, v]) => (
                    <option key={k} value={k}>{TYPE_ICONS[k]} {v}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>父级设定</label>
                <select className="select" value={editingSetting.parentId || ''}
                  onChange={(e) => setEditingSetting({ ...editingSetting, parentId: e.target.value || undefined })}>
                  <option value="">无（顶层）</option>
                  {settings.filter((s) => s.id !== editingSetting.id).map((s) => (
                    <option key={s.id} value={s.id}>{TYPE_ICONS[s.type]} {s.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>描述</label>
                <MarkdownEditor
                  value={editingSetting.description}
                  onChange={(v) => setEditingSetting({ ...editingSetting, description: v })}
                  rows={6}
                />
              </div>
              <div className="form-actions" style={{ borderTop: 'none', paddingTop: 0 }}>
                <button className="btn" onClick={() => setEditingSetting(null)}>取消</button>
                <button className="btn btn-primary" onClick={handleUpdate}>保存</button>
              </div>
            </div>
          ) : (
            // 查看模式
            <div className={styles.detailContent}>
              <div className={styles.detailHeader}>
                <div>
                  <div className={styles.settingType}>
                    {TYPE_ICONS[selectedSetting.type]} {TYPE_NAMES[selectedSetting.type]}
                  </div>
                  <h2>{selectedSetting.name}</h2>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className="btn btn-sm" onClick={() => setEditingSetting({ ...selectedSetting })}>编辑</button>
                  <button className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(selectedSetting.id, selectedSetting.name)}>删除</button>
                </div>
              </div>

              {/* 父级面包屑 */}
              {selectedSetting.parentId && (
                <div className={styles.parentBreadcrumb}>
                  <span className={styles.parentLabel}>属于：</span>
                  <span
                    className={styles.parentLink}
                    onClick={() => setSelectedId(selectedSetting.parentId!)}
                  >
                    {getSettingName(selectedSetting.parentId)}
                  </span>
                </div>
              )}

              {/* 子设定 */}
              {settings.filter((s) => s.parentId === selectedSetting.id).length > 0 && (
                <section className={styles.section}>
                  <h3>子设定</h3>
                  <div className={styles.childrenList}>
                    {settings.filter((s) => s.parentId === selectedSetting.id).map((s) => (
                      <span key={s.id} className={styles.childLink}
                        onClick={() => setSelectedId(s.id)}>
                        {TYPE_ICONS[s.type]} {s.name}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* 描述 */}
              <section className={styles.section}>
                <h3>描述</h3>
                {selectedSetting.description ? (
                  <div className={styles.mdContent}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedSetting.description}</ReactMarkdown>
                  </div>
                ) : (
                  <span className={styles.muted}>暂无描述</span>
                )}
              </section>

              {/* 关联条目 */}
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h3>关联条目</h3>
                  <button className="btn btn-sm" onClick={() => setEditingRelation(true)}>+ 添加</button>
                </div>
                {selectedSetting.relations.length === 0 ? (
                  <span className={styles.muted}>暂无关联</span>
                ) : (
                  <div className={styles.relationList}>
                    {selectedSetting.relations.map((rel) => (
                      <div key={rel.targetId} className={styles.relationItem}>
                        <span className={styles.relType}>{rel.type}</span>
                        <span className={styles.relTarget} onClick={() => setSelectedId(rel.targetId)}>
                          {getSettingName(rel.targetId)}
                        </span>
                        <button className="btn btn-sm btn-ghost"
                          onClick={() => removeRelation(rel.targetId)}
                          style={{ marginLeft: 'auto', color: 'var(--danger)', fontSize: '11px' }}>
                          移除
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {editingRelation && (
                  <div className={styles.inlineForm}>
                    <select className="select" value={relTarget} onChange={(e) => setRelTarget(e.target.value)}>
                      <option value="">选择设定</option>
                      {settings.filter((s) => s.id !== selectedSetting.id).map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <input className="input" placeholder="关联类型" value={relType}
                      onChange={(e) => setRelType(e.target.value)} />
                    <button className="btn btn-primary btn-sm" onClick={addRelation}>确定</button>
                    <button className="btn btn-sm" onClick={() => setEditingRelation(false)}>取消</button>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
      )}

      {/* 创建设定模态框 */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => { setShowCreate(false); resetForm(); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>新建世界观设定</h2>
            <div className="form-group">
              <label>名称 *</label>
              <input className="input" value={formName} onChange={(e) => setFormName(e.target.value)}
                placeholder="设定名称" autoFocus />
            </div>
            <div className="form-group">
              <label>类型</label>
              <select className="select" value={formType}
                onChange={(e) => setFormType(e.target.value as WorldSetting['type'])}>
                {Object.entries(TYPE_NAMES).map(([k, v]) => (
                  <option key={k} value={k}>{TYPE_ICONS[k]} {v}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>父级设定</label>
              <select className="select" value={formParentId}
                onChange={(e) => setFormParentId(e.target.value)}>
                <option value="">无（顶层）</option>
                {settings.map((s) => (
                  <option key={s.id} value={s.id}>{TYPE_ICONS[s.type]} {s.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>描述</label>
              <MarkdownEditor
                value={formDesc}
                onChange={setFormDesc}
                rows={5}
                placeholder="详细描述这个世界观设定（支持 Markdown）..."
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
