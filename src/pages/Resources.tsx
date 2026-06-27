/**
 * 资源/能力追踪页面
 * 左侧角色列表，右侧显示选中角色的资源/能力
 * 支持全局资源表视图切换
 */

import { useEffect, useState, useMemo } from 'react';
import { useCharacterStore } from '../store/characterStore';
import { useChapterStore } from '../store/chapterStore';
import { useAppStore } from '../store/appStore';
import { generateId, type Character, type Resource } from '../types';
import styles from './Resources.module.css';

type ViewMode = 'byCharacter' | 'global';

export default function ResourcesPage() {
  const { currentProject, refreshKey } = useAppStore();
  const { characters, loadCharacters, updateCharacter } = useCharacterStore();
  const { chapters, loadChapters } = useChapterStore();

  const [viewMode, setViewMode] = useState<ViewMode>('byCharacter');
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  // 新资源表单
  const [resName, setResName] = useState('');
  const [resType, setResType] = useState('');
  const [resDesc, setResDesc] = useState('');
  const [resCost, setResCost] = useState('');

  useEffect(() => {
    if (currentProject) {
      loadCharacters(currentProject.id);
      loadChapters(currentProject.id);
    }
  }, [currentProject, loadCharacters, loadChapters, refreshKey]);

  const selectedChar = selectedCharId ? characters.find((c) => c.id === selectedCharId) : null;

  // 收集所有资源类型
  const allTypes = useMemo(() => {
    const types = new Set<string>();
    characters.forEach((c) => c.resources.forEach((r) => types.add(r.type)));
    return [...types];
  }, [characters]);

  // 全局资源表
  const globalResources = useMemo(() => {
    const result: (Resource & { characterName: string; characterId: string })[] = [];
    characters.forEach((c) => {
      c.resources.forEach((r) => {
        if (!filterType || r.type === filterType) {
          result.push({ ...r, characterName: c.name, characterId: c.id });
        }
      });
    });
    return result;
  }, [characters, filterType]);

  // 添加资源
  const handleAdd = async () => {
    if (!resName.trim() || !selectedChar) return;
    const newRes: Resource = {
      id: generateId(),
      name: resName.trim(),
      type: (resType || '其他') as Resource['type'],
      description: resDesc.trim(),
      status: '已获得',
      cost: resCost || undefined,
    };
    const updated = { ...selectedChar, resources: [...selectedChar.resources, newRes] };
    await updateCharacter(updated);
    await loadCharacters(currentProject!.id);
    setShowAdd(false);
    setResName('');
    setResType('');
    setResDesc('');
    setResCost('');
  };

  // 删除资源
  const handleDelete = async (resId: string) => {
    if (!selectedChar) return;
    const updated = { ...selectedChar, resources: selectedChar.resources.filter((r) => r.id !== resId) };
    await updateCharacter(updated);
    await loadCharacters(currentProject!.id);
  };

  if (!currentProject) {
    return <div className="empty-state"><p>请先选择一个作品</p></div>;
  }

  return (
    <div className={styles.page}>
      <div className="page-header">
        <h1>资源追踪</h1>
        <div className="actions">
          <select className="select" value={viewMode}
            onChange={(e) => setViewMode(e.target.value as ViewMode)}>
            <option value="byCharacter">按角色查看</option>
            <option value="global">全局资源表</option>
          </select>
          {viewMode === 'byCharacter' && selectedChar && (
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
              + 添加资源
            </button>
          )}
        </div>
      </div>

      {viewMode === 'byCharacter' ? (
        <div className={styles.contentArea}>
          {/* 左侧角色列表 */}
          <div className={styles.charList}>
            {characters.length === 0 ? (
              <div className="empty-state"><p>暂无角色</p></div>
            ) : (
              characters.map((c) => (
                <div
                  key={c.id}
                  className={`${styles.charItem} ${selectedCharId === c.id ? styles.selected : ''}`}
                  onClick={() => setSelectedCharId(c.id)}
                >
                  <div className={styles.charAvatar}>{c.name.charAt(0)}</div>
                  <div className={styles.charInfo}>
                    <div className={styles.charName}>{c.name}</div>
                    <div className={styles.charCount}>{c.resources.length} 项资源</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 右侧资源详情 */}
          <div className={styles.detailPanel}>
            {!selectedChar ? (
              <div className="empty-state">
                <div className="icon">💎</div>
                <p>选择左侧角色查看其资源/能力</p>
              </div>
            ) : (
              <div className={styles.detailContent}>
                <div className={styles.charHeader}>
                  <div className={styles.charAvatarLarge}>{selectedChar.name.charAt(0)}</div>
                  <div>
                    <h2>{selectedChar.name}</h2>
                    <div className={styles.charMeta}>
                      共 {selectedChar.resources.length} 项资源/能力
                    </div>
                  </div>
                </div>

                {selectedChar.resources.length === 0 ? (
                  <div className="empty-state" style={{ padding: '30px' }}>
                    <p>该角色还没有资源/能力</p>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
                      + 添加资源
                    </button>
                  </div>
                ) : (
                  <div className={styles.resourceGrid}>
                    {selectedChar.resources.map((res) => (
                      <div key={res.id} className={styles.resCard}>
                        <div className={styles.resHeader}>
                          <span className={styles.resName}>{res.name}</span>
                          <span className={styles.resType}>{res.type}</span>
                        </div>
                        {res.description && (
                          <div className={styles.resDesc}>{res.description}</div>
                        )}
                        {res.cost && (
                          <div className={styles.resCost}>
                            <span className={styles.costLabel}>代价：</span>
                            {res.cost}
                          </div>
                        )}
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => handleDelete(res.id)}
                          style={{ color: 'var(--danger)', fontSize: '11px', marginTop: '8px' }}
                        >
                          删除
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* 添加资源弹窗 */}
                {showAdd && (
                  <div className="modal-overlay" onClick={() => setShowAdd(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                      <h2>为「{selectedChar.name}」添加资源</h2>
                      <div className="form-group">
                        <label>名称 *</label>
                        <input className="input" value={resName} onChange={(e) => setResName(e.target.value)}
                          placeholder="资源/能力名称" autoFocus />
                      </div>
                      <div className="form-group">
                        <label>类型</label>
                        <input className="input" value={resType} onChange={(e) => setResType(e.target.value)}
                          placeholder="武器/技能/魔法/道具..." list="res-types" />
                        <datalist id="res-types">
                          {allTypes.map((t) => <option key={t} value={t} />)}
                        </datalist>
                      </div>
                      <div className="form-group">
                        <label>描述</label>
                        <textarea className="textarea" value={resDesc}
                          onChange={(e) => setResDesc(e.target.value)} rows={3} />
                      </div>
                      <div className="form-group">
                        <label>代价</label>
                        <input className="input" value={resCost}
                          onChange={(e) => setResCost(e.target.value)}
                          placeholder="使用代价（可选）" />
                      </div>
                      <div className="form-actions">
                        <button className="btn" onClick={() => setShowAdd(false)}>取消</button>
                        <button className="btn btn-primary" onClick={handleAdd} disabled={!resName.trim()}>添加</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        // 全局资源表视图
        <div className={styles.globalView}>
          <div className={styles.globalFilters}>
            <select className="select" value={filterType}
              onChange={(e) => setFilterType(e.target.value)}>
              <option value="">全部类型</option>
              {allTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <span className={styles.globalCount}>共 {globalResources.length} 项</span>
          </div>

          {globalResources.length === 0 ? (
            <div className="empty-state">
              <div className="icon">💎</div>
              <p>{filterType ? `没有类型为「${filterType}」的资源` : '暂无资源'}</p>
            </div>
          ) : (
            <div className={styles.globalTable}>
              <div className={styles.tableHeader}>
                <span className={styles.colName}>名称</span>
                <span className={styles.colType}>类型</span>
                <span className={styles.colChar}>所属角色</span>
                <span className={styles.colCost}>代价</span>
              </div>
              {globalResources.map((res) => (
                <div key={res.id} className={styles.tableRow}>
                  <span className={styles.colName}>
                    <span className={styles.resNameText}>{res.name}</span>
                    {res.description && <span className={styles.resDescHint}>{res.description.slice(0, 40)}...</span>}
                  </span>
                  <span className={styles.colType}>
                    <span className={styles.resType}>{res.type}</span>
                  </span>
                  <span className={styles.colChar}>
                    <span className={styles.charLink} onClick={() => {
                      setSelectedCharId(res.characterId);
                      setViewMode('byCharacter');
                    }}>
                      {res.characterName}
                    </span>
                  </span>
                  <span className={styles.colCost}>{res.cost || '-'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
