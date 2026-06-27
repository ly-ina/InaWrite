/**
 * 标签/分类系统页面
 * 全局标签管理 + 标签云视图 + 按标签筛选
 */

import { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { useCharacterStore } from '../store/characterStore';
import { useChapterStore } from '../store/chapterStore';
import { useForeshadowStore } from '../store/foreshadowStore';
import { useWorldSettingStore } from '../store/worldSettingStore';
import { db } from '../db/database';
import { generateId, type Tag, type TagAssignment } from '../types';
import styles from './Tags.module.css';

/** 颜色预设 */
const TAG_COLORS = ['#c9a96e', '#5a9e6f', '#6b8cc9', '#c44b4b', '#c99e4b', '#9b6ec9', '#5ea4a4', '#c97e6b'];

export default function TagsPage() {
  const { currentProject, triggerRefresh } = useAppStore();
  const { characters, loadCharacters } = useCharacterStore();
  const { chapters, loadChapters } = useChapterStore();
  const { foreshadows, loadForeshadows } = useForeshadowStore();
  const { settings, loadSettings } = useWorldSettingStore();

  const [tags, setTags] = useState<Tag[]>([]);
  const [assignments, setAssignments] = useState<TagAssignment[]>([]);
  const [loading, setLoading] = useState(false);

  // 新建/编辑标签
  const [showForm, setShowForm] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState(TAG_COLORS[0]);
  const [formDesc, setFormDesc] = useState('');

  // 分配标签
  const [showAssigner, setShowAssigner] = useState(false);
  const [assignTagId, setAssignTagId] = useState<string>('');
  const [assignType, setAssignType] = useState<'character' | 'chapter' | 'foreshadow' | 'worldSetting'>('character');

  // 标签云视图
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);

  useEffect(() => {
    if (currentProject) {
      loadCharacters(currentProject.id);
      loadChapters(currentProject.id);
      loadForeshadows(currentProject.id);
      loadSettings(currentProject.id);
      loadTags();
      loadAssignments();
    }
  }, [currentProject]);

  const loadTags = async () => {
    if (!currentProject) return;
    setLoading(true);
    const all = await db.tags.getByProject(currentProject.id);
    setTags(all);
    setLoading(false);
  };

  const loadAssignments = async () => {
    const all = await db.tagAssignments.getAll();
    setAssignments(all);
  };

  // ===== 标签 CRUD =====
  const saveTag = async () => {
    if (!formName.trim() || !currentProject) return;
    if (editingTag) {
      await db.tags.update({ ...editingTag, name: formName.trim(), color: formColor, description: formDesc });
    } else {
      await db.tags.add({
        id: generateId(), projectId: currentProject.id,
        name: formName.trim(), color: formColor, description: formDesc,
        createdAt: new Date().toISOString(),
      });
    }
    await loadTags();
    setShowForm(false);
    setEditingTag(null);
    resetForm();
  };

  const deleteTag = async (id: string, name: string) => {
    if (!confirm(`确定删除标签「${name}」？相关关联也会被删除。`)) return;
    await db.tags.remove(id);
    // 删除关联
    const related = assignments.filter((a) => a.tagId === id);
    await Promise.all(related.map((a) => db.tagAssignments.remove(a.id)));
    await loadTags();
    await loadAssignments();
  };

  const resetForm = () => {
    setFormName('');
    setFormColor(TAG_COLORS[0]);
    setFormDesc('');
    setEditingTag(null);
  };

  // ===== 标签分配 =====
  const assignTag = async (targetId: string) => {
    if (!assignTagId) return;
    const exists = assignments.find((a) => a.tagId === assignTagId && a.targetType === assignType && a.targetId === targetId);
    if (exists) {
      await db.tagAssignments.remove(exists.id);
    } else {
      await db.tagAssignments.add({
        id: generateId(), tagId: assignTagId, targetType: assignType, targetId,
      });
    }
    await loadAssignments();
  };

  const isTagged = (targetId: string) => {
    if (!assignTagId) return false;
    return assignments.some((a) => a.tagId === assignTagId && a.targetType === assignType && a.targetId === targetId);
  };

  // ===== 获取标签统计 =====
  const getTagCount = (tagId: string) => assignments.filter((a) => a.tagId === tagId).length;

  // ===== 获取某标签关联的所有内容 =====
  const getTaggedItems = (tagId: string) => {
    const tagAssigns = assignments.filter((a) => a.tagId === tagId);
    const result: { type: string; id: string; name: string }[] = [];
    for (const a of tagAssigns) {
      if (a.targetType === 'character') {
        const c = characters.find((x) => x.id === a.targetId);
        if (c) result.push({ type: '👤 角色', id: c.id, name: c.name });
      } else if (a.targetType === 'chapter') {
        const ch = chapters.find((x) => x.id === a.targetId);
        if (ch) result.push({ type: '📖 章节', id: ch.id, name: `第${ch.number}章 ${ch.title}` });
      } else if (a.targetType === 'foreshadow') {
        const f = foreshadows.find((x) => x.id === a.targetId);
        if (f) result.push({ type: '🔮 伏笔', id: f.id, name: f.content.slice(0, 40) });
      } else if (a.targetType === 'worldSetting') {
        const w = settings.find((x) => x.id === a.targetId);
        if (w) result.push({ type: '🌍 设定', id: w.id, name: w.name });
      }
    }
    return result;
  };

  if (!currentProject) {
    return <div className="empty-state"><div className="icon">🏷</div><p>请先选择一个作品</p></div>;
  }

  const selectedTag = selectedTagId ? tags.find((t) => t.id === selectedTagId) : null;
  const taggedItems = selectedTagId ? getTaggedItems(selectedTagId) : [];

  return (
    <div className={styles.page}>
      <div className="page-header">
        <h1>🏷 标签管理</h1>
        <div className="actions">
          <button className="btn btn-sm" onClick={() => { setShowAssigner(!showAssigner); }}>
            {showAssigner ? '关闭分配' : '🏷 批量打标签'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowForm(true); }}>
            + 新建标签
          </button>
        </div>
      </div>

      {/* 批量打标签面板 */}
      {showAssigner && (
        <div className={styles.assignerPanel}>
          <div className={styles.assignerRow}>
            <select className="select" value={assignTagId} onChange={(e) => setAssignTagId(e.target.value)}
              style={{ minWidth: '160px' }}>
              <option value="">选择标签</option>
              {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select className="select" value={assignType} onChange={(e) => setAssignType(e.target.value as any)}>
              <option value="character">角色</option>
              <option value="chapter">章节</option>
              <option value="foreshadow">伏笔</option>
              <option value="worldSetting">世界观设定</option>
            </select>
          </div>
          {assignTagId && (
            <div className={styles.assignList}>
              {(assignType === 'character' ? characters :
                assignType === 'chapter' ? chapters :
                assignType === 'foreshadow' ? foreshadows : settings).map((item: any) => (
                  <span key={item.id}
                    className={`${styles.assignItem} ${isTagged(item.id) ? styles.assigned : ''}`}
                    onClick={() => assignTag(item.id)}>
                    {assignType === 'chapter' ? `第${item.number}章 ` : ''}{item.name || item.content?.slice(0, 20) || item.title}
                    {isTagged(item.id) && ' ✓'}
                  </span>
                ))}
            </div>
          )}
        </div>
      )}

      {/* 标签云 */}
      {tags.length > 0 ? (
        <div className={styles.tagCloud}>
          {tags.map((tag) => {
            const count = getTagCount(tag.id);
            const size = Math.max(0.9, Math.min(2.2, 1 + count * 0.1));
            return (
              <span key={tag.id}
                className={`${styles.tagCloudItem} ${selectedTagId === tag.id ? styles.tagCloudSelected : ''}`}
                style={{ fontSize: `${size}em`, color: tag.color, borderColor: tag.color }}
                onClick={() => setSelectedTagId(selectedTagId === tag.id ? null : tag.id)}
                title={`${tag.name}（${count}项）`}>
                {tag.name}
                <sup className={styles.tagCount}>{count}</sup>
              </span>
            );
          })}
        </div>
      ) : (
        <div className="empty-state"><div className="icon">🏷</div><p>还没有标签，点击「新建标签」创建</p></div>
      )}

      {/* 选中标签详情 */}
      {selectedTag && (
        <div className={styles.tagDetail}>
          <div className={styles.tagDetailHeader}>
            <h3 style={{ color: selectedTag.color }}>🏷 {selectedTag.name}</h3>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button className="btn btn-sm" onClick={() => {
                setEditingTag(selectedTag); setFormName(selectedTag.name);
                setFormColor(selectedTag.color); setFormDesc(selectedTag.description || '');
                setShowForm(true);
              }}>编辑</button>
              <button className="btn btn-danger btn-sm" onClick={() => deleteTag(selectedTag.id, selectedTag.name)}>删除</button>
            </div>
          </div>
          {selectedTag.description && <p className={styles.tagDesc}>{selectedTag.description}</p>}
          <div className={styles.taggedItems}>
            {taggedItems.length === 0 ? (
              <p className={styles.muted}>该标签尚未关联任何内容</p>
            ) : (
              taggedItems.map((item) => (
                <div key={item.id} className={styles.taggedItem}>
                  <span className={styles.taggedType}>{item.type}</span>
                  <span>{item.name}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 标签列表 */}
      <div className={styles.tagList}>
        <h3>所有标签</h3>
        {tags.map((tag) => (
          <div key={tag.id} className={styles.tagRow}>
            <span className={styles.tagDot} style={{ background: tag.color }} />
            <span className={styles.tagName}>{tag.name}</span>
            <span className={styles.tagCountBadge}>{getTagCount(tag.id)}项</span>
            <div className={styles.tagActions}>
              <button className="btn btn-sm btn-ghost" onClick={() => {
                setEditingTag(tag); setFormName(tag.name); setFormColor(tag.color);
                setFormDesc(tag.description || ''); setShowForm(true);
              }}>编辑</button>
              <button className="btn btn-sm btn-ghost" style={{ color: 'var(--danger)' }}
                onClick={() => deleteTag(tag.id, tag.name)}>删除</button>
            </div>
          </div>
        ))}
      </div>

      {/* 新建/编辑标签弹窗 */}
      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); resetForm(); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingTag ? '编辑标签' : '新建标签'}</h2>
            <div className="form-group">
              <label>标签名</label>
              <input className="input" value={formName} onChange={(e) => setFormName(e.target.value)}
                placeholder="输入标签名" autoFocus />
            </div>
            <div className="form-group">
              <label>颜色</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {TAG_COLORS.map((c) => (
                  <button key={c} style={{
                    width: '28px', height: '28px', borderRadius: '50%', background: c,
                    border: formColor === c ? '3px solid var(--text-primary)' : '2px solid transparent',
                    cursor: 'pointer',
                  }} onClick={() => setFormColor(c)} />
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>描述（可选）</label>
              <input className="input" value={formDesc} onChange={(e) => setFormDesc(e.target.value)}
                placeholder="标签说明" />
            </div>
            <div className="form-actions">
              <button className="btn" onClick={() => { setShowForm(false); resetForm(); }}>取消</button>
              <button className="btn btn-primary" onClick={saveTag} disabled={!formName.trim()}>
                {editingTag ? '保存' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
