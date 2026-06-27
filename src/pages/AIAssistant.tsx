/**
 * AI 写作助手页面
 * 功能：文本智能分析、创作建议、资源状态更新、API 配置
 */

import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { useCharacterStore } from '../store/characterStore';
import { useWorldSettingStore } from '../store/worldSettingStore';
import { useForeshadowStore } from '../store/foreshadowStore';
import { useChapterStore } from '../store/chapterStore';
import {
  getAIConfig, updateAIConfig,
  getWritingSuggestions, analyzeNovelText, analyzeResourceUpdates,
  applySelectedResults, applyResourceUpdates,
  analyzeCharacterArc,
  matchAnalysisWithExisting,
  continueChapter, checkConsistency, completeWorldSettings,
  createSnapshot, getSnapshots, deleteSnapshot, restoreSnapshot, diffSnapshots,
  type AnalysisResult, type ApplyResult,
  type MatchableAnalysisResult, type MatchableCharacter,
  type MatchableWorldSetting, type MatchableForeshadow,
  type ContinueChapterInput, type ContinueChapterResult,
  type ConsistencyIssue, type ConsistencyReport,
  type WorldCompletionSuggestion, type WorldCompletionResult,
  type DataSnapshot,
} from '../utils/aiService';
import styles from './AIAssistant.module.css';

type TabKey = 'analyze' | 'suggest' | 'resources' | 'continue' | 'consistency' | 'complete' | 'history' | 'settings';

export default function AIAssistantPage() {
  const { currentProject, refreshKey, triggerRefresh } = useAppStore();
  const { characters, loadCharacters } = useCharacterStore();
  const { settings, loadSettings } = useWorldSettingStore();
  const { foreshadows, loadForeshadows } = useForeshadowStore();
  const { chapters, loadChapters } = useChapterStore();

  const [activeTab, setActiveTab] = useState<TabKey>('analyze');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 文本分析
  const [inputText, setInputText] = useState('');
  const [analysisResult, setAnalysisResult] = useState<MatchableAnalysisResult | null>(null);
  const [applyStats, setApplyStats] = useState<ApplyResult | null>(null);
  const [expandedSection, setExpandedSection] = useState<Set<string>>(new Set(['characters', 'worldSettings', 'foreshadows']));
  const [selectAllChars, setSelectAllChars] = useState(true);
  const [selectAllSettings, setSelectAllSettings] = useState(true);
  const [selectAllForeshadows, setSelectAllForeshadows] = useState(true);

  // 创作建议
  const [suggestion, setSuggestion] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState('');

  // 资源更新
  const [resourceUpdates, setResourceUpdates] = useState<{ characterName: string; resourceName: string; newStatus: string; reason: string }[]>([]);

  // API 配置
  const [apiUrl, setApiUrl] = useState(getAIConfig().apiUrl);
  const [apiKey, setApiKey] = useState(getAIConfig().apiKey);
  const [model, setModel] = useState(getAIConfig().model);
  const [configSaved, setConfigSaved] = useState(false);

  // 角色弧光
  const [arcCharId, setArcCharId] = useState('');
  const [arcResult, setArcResult] = useState('');

  // V4.1 章节续写
  const [continueChapterId, setContinueChapterId] = useState('');
  const [continueOutline, setContinueOutline] = useState('');
  const [continueStyle, setContinueStyle] = useState('');
  const [continueResult, setContinueResult] = useState<ContinueChapterResult | null>(null);

  // V4.2 一致性检查
  const [consistencyReport, setConsistencyReport] = useState<ConsistencyReport | null>(null);

  // V4.3 世界观补全
  const [worldCompletion, setWorldCompletion] = useState<WorldCompletionResult | null>(null);

  // V4.4 版本历史
  const [snapshots, setSnapshots] = useState<DataSnapshot[]>([]);
  const [showSnapshotDiff, setShowSnapshotDiff] = useState(false);
  const [diffA, setDiffA] = useState('');
  const [diffB, setDiffB] = useState('');
  const [diffResult, setDiffResult] = useState('');

  // 文件上传
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentProject) {
      loadCharacters(currentProject.id);
      loadSettings(currentProject.id);
      loadForeshadows(currentProject.id);
      loadChapters(currentProject.id);
    }
  }, [currentProject, loadCharacters, loadSettings, loadForeshadows, loadChapters, refreshKey]);

  const toggleSection = (key: string) => {
    setExpandedSection((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // 单项选择切换
  const toggleCharSelect = (index: number) => {
    if (!analysisResult) return;
    const chars = [...analysisResult.characters];
    chars[index] = { ...chars[index], _selected: !chars[index]._selected };
    setAnalysisResult({ ...analysisResult, characters: chars });
  };

  const toggleSettingSelect = (index: number) => {
    if (!analysisResult) return;
    const items = [...analysisResult.worldSettings];
    items[index] = { ...items[index], _selected: !items[index]._selected };
    setAnalysisResult({ ...analysisResult, worldSettings: items });
  };

  const toggleForeshadowSelect = (index: number) => {
    if (!analysisResult) return;
    const items = [...analysisResult.foreshadows];
    items[index] = { ...items[index], _selected: !items[index]._selected };
    setAnalysisResult({ ...analysisResult, foreshadows: items });
  };

  // 全选/取消
  const toggleAllChars = () => {
    if (!analysisResult) return;
    const next = !selectAllChars;
    setSelectAllChars(next);
    const chars = analysisResult.characters.map((c) => ({ ...c, _selected: next }));
    setAnalysisResult({ ...analysisResult, characters: chars });
  };

  const toggleAllSettings = () => {
    if (!analysisResult) return;
    const next = !selectAllSettings;
    setSelectAllSettings(next);
    const items = analysisResult.worldSettings.map((w) => ({ ...w, _selected: next }));
    setAnalysisResult({ ...analysisResult, worldSettings: items });
  };

  const toggleAllForeshadows = () => {
    if (!analysisResult) return;
    const next = !selectAllForeshadows;
    setSelectAllForeshadows(next);
    const items = analysisResult.foreshadows.map((f) => ({ ...f, _selected: next }));
    setAnalysisResult({ ...analysisResult, foreshadows: items });
  };

  // ===== 文本分析 =====
  const handleAnalyze = async () => {
    if (!inputText.trim() || !currentProject) return;
    setLoading(true);
    setError('');
    setAnalysisResult(null);
    setApplyStats(null);
    try {
      const rawResult = await analyzeNovelText(inputText, {
        characters: characters.map((c) => ({ name: c.name, id: c.id })),
        worldSettings: settings.map((s) => ({ name: s.name, id: s.id })),
        foreshadows: foreshadows.map((f) => ({ content: f.content, id: f.id })),
      });
      // 智能对比并标记状态
      const matched = matchAnalysisWithExisting(rawResult,
        characters.map((c) => ({ name: c.name, id: c.id })),
        settings.map((s) => ({ name: s.name, id: s.id })),
        foreshadows.map((f) => ({ content: f.content, id: f.id }))
      );
      setAnalysisResult(matched);
      setSelectAllChars(true);
      setSelectAllSettings(true);
      setSelectAllForeshadows(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!analysisResult || !currentProject) return;
    setLoading(true);
    setError('');
    try {
      const stats = await applySelectedResults(currentProject.id, analysisResult);
      setApplyStats(stats);
      triggerRefresh();
      // 重新加载数据
      await loadCharacters(currentProject.id);
      await loadSettings(currentProject.id);
      await loadForeshadows(currentProject.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '应用失败');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setInputText((ev.target?.result as string) || '');
    };
    reader.readAsText(file);
  };

  // ===== 创作建议 =====
  const handleSuggest = async () => {
    if (!currentProject) return;
    setLoading(true);
    setError('');
    setSuggestion('');
    try {
      const chapter = chapters.find((c) => c.id === selectedChapterId);
      const result = await getWritingSuggestions({
        chapterContent: chapter?.summary,
        chapterTitle: chapter?.title,
        currentCharacters: chapter?.characters.map((id) => characters.find((c) => c.id === id)?.name || id),
        currentForeshadows: foreshadows.filter((f) => f.status === 'active').map((f) => f.content),
      });
      setSuggestion(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '请求失败');
    } finally {
      setLoading(false);
    }
  };

  // ===== 资源更新 =====
  const handleResourceScan = async () => {
    if (!currentProject) return;
    const chapter = chapters.find((c) => c.id === selectedChapterId);
    if (!chapter) { setError('请先选择一个章节'); return; }
    setLoading(true);
    setError('');
    setResourceUpdates([]);
    try {
      const updates = await analyzeResourceUpdates(
        chapter.summary || inputText || '',
        characters.map((c) => ({
          characterName: c.name,
          resources: c.resources.map((r) => ({
            name: r.name, type: r.type, status: r.status, description: r.description,
          })),
        }))
      );
      setResourceUpdates(updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyResourceUpdates = async () => {
    if (!currentProject || resourceUpdates.length === 0) return;
    setLoading(true);
    try {
      const count = await applyResourceUpdates(currentProject.id, resourceUpdates);
      setResourceUpdates([]);
      triggerRefresh();
      await loadCharacters(currentProject.id);
      alert(`已更新 ${count} 项资源状态`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败');
    } finally {
      setLoading(false);
    }
  };

  // ===== 配置 =====
  const handleSaveConfig = () => {
    updateAIConfig({ apiUrl, apiKey, model });
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 2000);
  };

  // ===== 角色弧光 =====
  const handleArcAnalyze = async () => {
    if (!arcCharId) return;
    const char = characters.find((c) => c.id === arcCharId);
    if (!char) return;
    setLoading(true);
    setError('');
    setArcResult('');
    try {
      const result = await analyzeCharacterArc(
        { name: char.name, description: char.description, arc: char.arc },
        chapters.map((c) => ({ title: c.title, summary: c.summary || '' }))
      );
      setArcResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败');
    } finally {
      setLoading(false);
    }
  };

  // ===== V4.1 章节续写 =====
  const handleContinue = async () => {
    if (!currentProject || !continueChapterId) return;
    const lastChapter = chapters.find((c) => c.id === continueChapterId);
    if (!lastChapter) { setError('请选择上一章'); return; }
    setLoading(true);
    setError('');
    setContinueResult(null);
    try {
      const input: ContinueChapterInput = {
        projectName: currentProject.name,
        lastChapterContent: lastChapter.content || lastChapter.summary || '',
        lastChapterTitle: lastChapter.title,
        nextChapterOutline: continueOutline || undefined,
        characters: characters.map((c) => ({ name: c.name, description: c.description, voice: c.voice })),
        activeForeshadows: foreshadows.filter((f) => f.status === 'active').map((f) => ({ content: f.content })),
        styleGuide: continueStyle || undefined,
      };
      const result = await continueChapter(input);
      setContinueResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '续写失败');
    } finally {
      setLoading(false);
    }
  };

  /** 将续写结果保存为章节 */
  const saveContinuedChapter = async () => {
    if (!continueResult || !currentProject) return;
    const nextNumber = chapters.length > 0 ? Math.max(...chapters.map((c) => c.number)) + 1 : 1;
    await useChapterStore.getState().createChapter({
      projectId: currentProject.id,
      number: nextNumber,
      title: continueResult.title,
      content: continueResult.content,
      wordCount: continueResult.wordCount,
      status: 'draft',
      characters: [],
      foreshadowsAdded: [],
      foreshadowsResolved: [],
      locations: [],
      keyEvents: [],
    });
    await loadChapters(currentProject.id);
    triggerRefresh();
    alert(`已保存为第${nextNumber}章「${continueResult.title}」`);
  };

  // ===== V4.2 一致性检查 =====
  const handleConsistencyCheck = async () => {
    if (!currentProject) return;
    setLoading(true);
    setError('');
    setConsistencyReport(null);
    try {
      const report = await checkConsistency(
        chapters.map((ch) => ({ number: ch.number, title: ch.title, summary: ch.summary || '', content: ch.content })),
        characters.map((c) => ({ name: c.name, status: c.status, description: c.description })),
        foreshadows.map((f) => ({ content: f.content, status: f.status })),
        settings.map((s) => ({ name: s.name, description: s.description })),
      );
      setConsistencyReport(report);
    } catch (err) {
      setError(err instanceof Error ? err.message : '检查失败');
    } finally {
      setLoading(false);
    }
  };

  // ===== V4.3 世界观补全 =====
  const handleWorldComplete = async () => {
    if (!currentProject) return;
    setLoading(true);
    setError('');
    setWorldCompletion(null);
    try {
      const result = await completeWorldSettings(
        settings.map((s) => ({
          name: s.name, type: s.type, description: s.description,
          parentName: s.parentId ? settings.find((p) => p.id === s.parentId)?.name : undefined,
        })),
      );
      setWorldCompletion(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '补全失败');
    } finally {
      setLoading(false);
    }
  };

  // ===== V4.4 版本历史 =====
  const loadSnapshots = () => {
    if (!currentProject) return;
    setSnapshots(getSnapshots(currentProject.id));
  };

  const handleCreateSnapshot = async () => {
    if (!currentProject) return;
    const label = prompt('快照标签（可选）：', `手动快照 ${new Date().toLocaleString('zh-CN')}`);
    await createSnapshot(currentProject.id, label || undefined);
    loadSnapshots();
    alert('快照已创建！');
  };

  const handleRestoreSnapshot = async (snapshot: DataSnapshot) => {
    if (!confirm(`确定恢复快照「${snapshot.label}」？当前数据将被覆盖。`)) return;
    await restoreSnapshot(snapshot);
    triggerRefresh();
    alert('数据已恢复，页面将刷新。');
    window.location.reload();
  };

  const handleDeleteSnapshot = (id: string) => {
    if (!currentProject || !confirm('删除此快照？')) return;
    deleteSnapshot(currentProject.id, id);
    loadSnapshots();
  };

  const handleDiffSnapshots = () => {
    if (!diffA || !diffB) return;
    const a = snapshots.find((s) => s.id === diffA);
    const b = snapshots.find((s) => s.id === diffB);
    if (!a || !b) return;
    setDiffResult(diffSnapshots(a, b));
  };

  if (!currentProject) {
    return <div className="empty-state"><div className="icon">🤖</div><p>请先选择一个作品</p></div>;
  }

  return (
    <div className={styles.page}>
      <div className="page-header">
        <h1>🤖 AI 写作助手</h1>
      </div>

      {/* 标签页切换 */}
      <div className={styles.tabs}>
        {([
          { key: 'analyze', label: '📖 文本分析', desc: '导入文本，AI 自动提取角色、世界观、伏笔' },
          { key: 'suggest', label: '💡 创作建议', desc: '根据当前进度获取写作指导' },
          { key: 'continue', label: '✍️ 章节续写', desc: 'AI 根据上一章内容和设定续写下一章' },
          { key: 'resources', label: '🔄 资源追踪', desc: '根据章节内容智能更新角色资源状态' },
          { key: 'consistency', label: '🔍 一致性检查', desc: '扫描全文检测设定矛盾' },
          { key: 'complete', label: '🌐 世界观补全', desc: 'AI 根据已有设定推断和补全' },
          { key: 'history', label: '📜 版本历史', desc: '数据快照与版本管理' },
          { key: 'settings', label: '⚙️ 设置', desc: '配置 API 和模型' },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            className={`${styles.tab} ${activeTab === tab.key ? styles.active : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <div className={styles.tabLabel}>{tab.label}</div>
            <div className={styles.tabDesc}>{tab.desc}</div>
          </button>
        ))}
      </div>

      {error && (
        <div className={styles.errorBar}>
          ⚠️ {error}
          <button className="btn btn-sm btn-ghost" onClick={() => setError('')} style={{ marginLeft: 'auto' }}>✕</button>
        </div>
      )}

      {/* ===== 文本分析 ===== */}
      {activeTab === 'analyze' && (
        <div className={styles.tabContent}>
          <div className={styles.inputSection}>
            <div className={styles.inputHeader}>
              <h3>导入小说文本</h3>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn btn-sm" onClick={() => fileInputRef.current?.click()}>
                  📁 选择文件
                </button>
                <input ref={fileInputRef} type="file" accept=".txt,.md" style={{ display: 'none' }}
                  onChange={handleFileUpload} />
                <button className="btn btn-sm" onClick={() => setInputText('')}>清空</button>
              </div>
            </div>
            <textarea
              className={styles.textArea}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="在此粘贴小说文本（支持 .txt / .md 文件上传）&#10;AI 将自动识别角色、世界观设定、伏笔等信息..."
              rows={12}
            />
            <button
              className="btn btn-primary"
              onClick={handleAnalyze}
              disabled={loading || !inputText.trim()}
              style={{ marginTop: '10px' }}
            >
              {loading ? '⏳ 分析中...' : '🔍 开始分析'}
            </button>
          </div>

          {analysisResult && (
            <div className={styles.resultSection}>
              <div className={styles.resultHeader}>
                <h2>分析结果</h2>
                {!applyStats && (
                  <button className="btn btn-primary" onClick={handleApply} disabled={loading}>
                    ✅ 应用选中的项
                  </button>
                )}
              </div>

              {applyStats && (
                <div className={styles.applySuccess}>
                  🎉 应用完成！
                  角色：新增 {applyStats.charactersAdded} / 更新 {applyStats.charactersUpdated} / 关系 +{applyStats.characterRelationsAdded}；
                  设定：新增 {applyStats.worldSettingsAdded} / 更新 {applyStats.worldSettingsUpdated} / 关系 +{applyStats.worldSettingRelationsAdded}；
                  伏笔：+{applyStats.foreshadowsAdded}
                </div>
              )}

              {analysisResult.summary && (
                <div className={styles.summaryCard}>
                  <div className={styles.summaryTitle}>📝 文本摘要</div>
                  <p>{analysisResult.summary}</p>
                </div>
              )}

              {/* 角色 */}
              <div className={styles.sectionCard}>
                <div className={styles.sectionTitle} onClick={() => toggleSection('characters')}>
                  <span>{expandedSection.has('characters') ? '▾' : '▸'}</span>
                  👤 提取角色 ({analysisResult.characters.length})
                  <span style={{ marginLeft: 'auto', marginRight: '8px', fontSize: '11px', cursor: 'pointer' }}
                    onClick={(e) => { e.stopPropagation(); toggleAllChars(); }}>
                    {selectAllChars ? '取消全选' : '全选'}
                  </span>
                </div>
                {expandedSection.has('characters') && (
                  <div className={styles.matchGrid}>
                    {analysisResult.characters.map((c, i) => (
                      <div key={i} className={`${styles.matchCard} ${styles[`match${c._matchStatus}`]}`}>
                        <label className={styles.matchCheck}>
                          <input type="checkbox" checked={c._selected} onChange={() => toggleCharSelect(i)} />
                        </label>
                        <div className={styles.matchContent}>
                          <div className={styles.itemName}>
                            {c.name}
                            <span className={`${styles.matchBadge} ${styles[`badge${c._matchStatus}`]}`}>
                              {c._matchStatus === 'new' ? '新增' : c._matchStatus === 'update' ? '更新' : '重复'}
                            </span>
                          </div>
                          {c._existingName && (
                            <div className={styles.matchHint}>已有：{c._existingName}</div>
                          )}
                          {c._duplicateOf && (
                            <div className={styles.matchWarning}>⚠ {c._duplicateOf}</div>
                          )}
                          <div className={styles.itemMeta}>
                            {c.race && <span>种族：{c.race}</span>}
                            {c.status && <span>{c.status}</span>}
                          </div>
                          {c.resources?.length ? (
                            <div className={styles.itemTags}>
                              {c.resources.map((r, j) => <span key={j} className={styles.tag}>{r.type}: {r.name}</span>)}
                            </div>
                          ) : null}
                          {c.relations?.length ? (
                            <div className={styles.itemTags}>
                              {c.relations.map((r, j) => (
                                <span key={j} className={styles.relationTag}>{r.direction === '单向' ? '→' : '↔'} {r.targetName}（{r.type}）</span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                    {analysisResult.characters.length === 0 && <span className={styles.muted}>未提取到新角色</span>}
                  </div>
                )}
              </div>

              {/* 世界观 */}
              <div className={styles.sectionCard}>
                <div className={styles.sectionTitle} onClick={() => toggleSection('worldSettings')}>
                  <span>{expandedSection.has('worldSettings') ? '▾' : '▸'}</span>
                  🌍 提取设定 ({analysisResult.worldSettings.length})
                  <span style={{ marginLeft: 'auto', marginRight: '8px', fontSize: '11px', cursor: 'pointer' }}
                    onClick={(e) => { e.stopPropagation(); toggleAllSettings(); }}>
                    {selectAllSettings ? '取消全选' : '全选'}
                  </span>
                </div>
                {expandedSection.has('worldSettings') && (
                  <div className={styles.matchGrid}>
                    {analysisResult.worldSettings.map((w, i) => (
                      <div key={i} className={`${styles.matchCard} ${styles[`match${w._matchStatus}`]}`}>
                        <label className={styles.matchCheck}>
                          <input type="checkbox" checked={w._selected} onChange={() => toggleSettingSelect(i)} />
                        </label>
                        <div className={styles.matchContent}>
                          <div className={styles.itemName}>
                            <span className={styles.tag}>{w.type}</span> {w.name}
                            <span className={`${styles.matchBadge} ${styles[`badge${w._matchStatus}`]}`}>
                              {w._matchStatus === 'new' ? '新增' : w._matchStatus === 'update' ? '更新' : '重复'}
                            </span>
                          </div>
                          {w._existingName && <div className={styles.matchHint}>已有：{w._existingName}</div>}
                          {w._duplicateOf && <div className={styles.matchWarning}>⚠ {w._duplicateOf}</div>}
                          <div className={styles.itemDesc}>{w.description.slice(0, 120)}</div>
                          {w.parentName && <div className={styles.itemMeta}>属于：{w.parentName}</div>}
                        </div>
                      </div>
                    ))}
                    {analysisResult.worldSettings.length === 0 && <span className={styles.muted}>未提取到新设定</span>}
                  </div>
                )}
              </div>

              {/* 伏笔 */}
              <div className={styles.sectionCard}>
                <div className={styles.sectionTitle} onClick={() => toggleSection('foreshadows')}>
                  <span>{expandedSection.has('foreshadows') ? '▾' : '▸'}</span>
                  🔮 发现伏笔 ({analysisResult.foreshadows.length})
                  <span style={{ marginLeft: 'auto', marginRight: '8px', fontSize: '11px', cursor: 'pointer' }}
                    onClick={(e) => { e.stopPropagation(); toggleAllForeshadows(); }}>
                    {selectAllForeshadows ? '取消全选' : '全选'}
                  </span>
                </div>
                {expandedSection.has('foreshadows') && (
                  <div className={styles.matchGrid}>
                    {analysisResult.foreshadows.map((f, i) => (
                      <div key={i} className={`${styles.matchCard} ${styles[`match${f._matchStatus}`]}`}>
                        <label className={styles.matchCheck}>
                          <input type="checkbox" checked={f._selected} onChange={() => toggleForeshadowSelect(i)} />
                        </label>
                        <div className={styles.matchContent}>
                          <div className={styles.itemName} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{f.confidence === 'high' ? '🔴' : f.confidence === 'medium' ? '🟡' : '🟢'}</span>
                            <span className={`${styles.matchBadge} ${styles[`badge${f._matchStatus}`]}`}>
                              {f._matchStatus === 'new' ? '新增' : f._matchStatus === 'update' ? '已存在' : '重复'}
                            </span>
                          </div>
                          <div className={styles.itemDesc}>{f.content}</div>
                          {f._existingContent && <div className={styles.matchHint}>已有：{f._existingContent.slice(0, 60)}...</div>}
                          {f.relatedCharacters.length > 0 && (
                            <div className={styles.itemMeta}>关联：{f.relatedCharacters.join('、')}</div>
                          )}
                        </div>
                      </div>
                    ))}
                    {analysisResult.foreshadows.length === 0 && <span className={styles.muted}>未发现明显伏笔</span>}
                  </div>
                )}
              </div>

              {/* 建议 */}
              {analysisResult.suggestions.length > 0 && (
                <div className={styles.suggestionsCard}>
                  <div className={styles.summaryTitle}>💡 创作建议</div>
                  <ul className={styles.suggestionsList}>
                    {analysisResult.suggestions.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===== 创作建议 ===== */}
      {activeTab === 'suggest' && (
        <div className={styles.tabContent}>
          <div className={styles.formCard}>
            <div className="form-group">
              <label>选择章节（可选）</label>
              <select className="select" value={selectedChapterId}
                onChange={(e) => setSelectedChapterId(e.target.value)}>
                <option value="">不选择（全局建议）</option>
                {chapters.map((ch) => (
                  <option key={ch.id} value={ch.id}>第{ch.number}章 {ch.title}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>角色弧光分析</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <select className="select" value={arcCharId}
                  onChange={(e) => setArcCharId(e.target.value)}>
                  <option value="">选择角色</option>
                  {characters.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button className="btn btn-sm" onClick={handleArcAnalyze} disabled={loading || !arcCharId}>
                  分析弧光
                </button>
              </div>
            </div>
            {arcResult && (
              <div className={styles.markdownCard}>
                <div className={styles.summaryTitle}>角色弧光分析</div>
                <div className={styles.mdContent}>{arcResult}</div>
              </div>
            )}
            <button className="btn btn-primary" onClick={handleSuggest} disabled={loading}
              style={{ marginTop: '10px' }}>
              {loading ? '⏳ 思考中...' : '💡 获取创作建议'}
            </button>
            {suggestion && (
              <div className={styles.markdownCard} style={{ marginTop: '16px' }}>
                <div className={styles.summaryTitle}>创作建议</div>
                <div className={styles.mdContent}>{suggestion}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== 资源追踪 ===== */}
      {activeTab === 'resources' && (
        <div className={styles.tabContent}>
          <div className={styles.formCard}>
            <p className={styles.hint}>
              选择一个章节，AI 将分析章节内容并自动检测角色资源/能力的状态变化（如：获得新能力、消耗物品等）
            </p>
            <div className="form-group">
              <label>选择章节</label>
              <select className="select" value={selectedChapterId}
                onChange={(e) => setSelectedChapterId(e.target.value)}>
                <option value="">选择章节</option>
                {chapters.map((ch) => (
                  <option key={ch.id} value={ch.id}>第{ch.number}章 {ch.title}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>或直接粘贴文本</label>
              <textarea className={styles.textArea} value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="粘贴章节内容或摘要..."
                rows={6}
              />
            </div>
            <button className="btn btn-primary" onClick={handleResourceScan} disabled={loading}>
              {loading ? '⏳ 分析中...' : '🔍 扫描资源变化'}
            </button>

            {resourceUpdates.length > 0 && (
              <div className={styles.resultSection} style={{ marginTop: '16px' }}>
                <div className={styles.resultHeader}>
                  <h3>检测到 {resourceUpdates.length} 项资源状态变化</h3>
                  <button className="btn btn-primary btn-sm" onClick={handleApplyResourceUpdates} disabled={loading}>
                    应用更新
                  </button>
                </div>
                <div className={styles.itemList}>
                  {resourceUpdates.map((u, i) => (
                    <div key={i} className={styles.resourceUpdateItem}>
                      <span className={styles.itemName}>{u.characterName}</span>
                      <span>「{u.resourceName}」</span>
                      <span className={`tag tag-${u.newStatus}`}>{u.newStatus}</span>
                      <span className={styles.muted}>{u.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {resourceUpdates.length === 0 && !loading && (
              <div className={styles.emptyHint}>点击扫描检测资源变化</div>
            )}
          </div>
        </div>
      )}

      {/* ===== V4.1 章节续写 ===== */}
      {activeTab === 'continue' && (
        <div className={styles.tabContent}>
          <div className={styles.formCard}>
            <h3>✍️ AI 章节续写</h3>
            <p className={styles.hint}>选择上一章，AI 将根据已有内容、角色设定和进行中的伏笔续写下一章。</p>
            <div className="form-group">
              <label>上一章</label>
              <select className="select" value={continueChapterId} onChange={(e) => setContinueChapterId(e.target.value)}>
                <option value="">选择章节</option>
                {[...chapters].sort((a, b) => a.number - b.number).map((ch) => (
                  <option key={ch.id} value={ch.id}>第{ch.number}章 {ch.title}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>下一章大纲（可选）</label>
              <textarea className="textarea" value={continueOutline} onChange={(e) => setContinueOutline(e.target.value)}
                placeholder="简要描述下一章要发生的内容..." rows={3} />
            </div>
            <div className="form-group">
              <label>写作风格要求（可选）</label>
              <input className="input" value={continueStyle} onChange={(e) => setContinueStyle(e.target.value)}
                placeholder="如：热血战斗、悬疑推理、轻松日常..." />
            </div>
            <button className="btn btn-primary" onClick={handleContinue} disabled={loading || !continueChapterId}>
              {loading ? '⏳ 续写中...' : '✍️ 开始续写'}
            </button>

            {continueResult && (
              <div className={styles.markdownCard} style={{ marginTop: '16px' }}>
                <div className={styles.summaryTitle}>续写结果 — {continueResult.title}（{continueResult.wordCount}字）</div>
                <p className={styles.hint}>💡 写作思路：{continueResult.reasoning}</p>
                <div className={styles.mdContent}>{continueResult.content.slice(0, 2000)}{continueResult.content.length > 2000 ? '...' : ''}</div>
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                  <button className="btn btn-primary btn-sm" onClick={saveContinuedChapter}>📖 保存为章节</button>
                  <button className="btn btn-sm" onClick={() => setContinueResult(null)}>清除</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== V4.2 一致性检查 ===== */}
      {activeTab === 'consistency' && (
        <div className={styles.tabContent}>
          <div className={styles.formCard}>
            <h3>🔍 AI 一致性检查</h3>
            <p className={styles.hint}>扫描全部章节、角色、伏笔和世界观设定，检测设定矛盾、时间线冲突等问题。</p>
            <button className="btn btn-primary" onClick={handleConsistencyCheck} disabled={loading}>
              {loading ? '⏳ 检查中...' : '🔍 开始检查'}
            </button>

            {consistencyReport && (
              <div className={styles.resultSection} style={{ marginTop: '16px' }}>
                <div className={styles.resultHeader}>
                  <h3>一致性评分：{consistencyReport.score}/100</h3>
                </div>
                <p className={styles.summaryCard} style={{ padding: '10px' }}>
                  <strong>总结：</strong>{consistencyReport.summary}
                </p>
                {consistencyReport.issues.length === 0 ? (
                  <p className={styles.hint} style={{ textAlign: 'center', padding: '20px' }}>🎉 未发现明显一致性问题！</p>
                ) : (
                  <div className={styles.itemList}>
                    {consistencyReport.issues.map((issue, i) => (
                      <div key={i} className={styles.matchCard} style={{
                        borderLeft: `3px solid ${issue.severity === 'error' ? 'var(--danger)' : issue.severity === 'warning' ? 'var(--warning)' : 'var(--text-muted)'}`
                      }}>
                        <div className={styles.matchContent}>
                          <div className={styles.itemName}>
                            {issue.severity === 'error' ? '🔴' : issue.severity === 'warning' ? '🟡' : '🔵'} {issue.title}
                            <span className={styles.tag} style={{ marginLeft: '6px' }}>{issue.type}</span>
                          </div>
                          <div className={styles.itemDesc}>{issue.description}</div>
                          <div className={styles.itemMeta}>📍 {issue.location}</div>
                          <div className={styles.matchHint}>💡 {issue.suggestion}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== V4.3 世界观补全 ===== */}
      {activeTab === 'complete' && (
        <div className={styles.tabContent}>
          <div className={styles.formCard}>
            <h3>🌐 AI 世界观补全</h3>
            <p className={styles.hint}>AI 分析已有世界观设定，检测逻辑空白、建议关联关系和补充细节。</p>
            <button className="btn btn-primary" onClick={handleWorldComplete} disabled={loading}>
              {loading ? '⏳ 分析中...' : '🌐 开始分析'}
            </button>

            {worldCompletion && (
              <div className={styles.resultSection} style={{ marginTop: '16px' }}>
                <p className={styles.summaryCard} style={{ padding: '10px' }}>
                  <strong>总结：</strong>{worldCompletion.summary}
                </p>
                {worldCompletion.suggestions.length === 0 ? (
                  <p className={styles.hint} style={{ textAlign: 'center', padding: '20px' }}>✅ 现有设定已比较完善</p>
                ) : (
                  <div className={styles.itemList}>
                    {worldCompletion.suggestions.map((sug, i) => (
                      <div key={i} className={styles.matchCard} style={{
                        borderLeft: `3px solid ${sug.type === 'gap' ? 'var(--danger)' : sug.type === 'relation' ? 'var(--accent)' : 'var(--text-muted)'}`
                      }}>
                        <div className={styles.matchContent}>
                          <div className={styles.itemName}>
                            {sug.type === 'gap' ? '🕳' : sug.type === 'relation' ? '🔗' : '📝'} {sug.title}
                            <span className={styles.tag} style={{ marginLeft: '6px' }}>
                              {sug.type === 'gap' ? '逻辑空白' : sug.type === 'relation' ? '关联建议' : '细节补充'}
                            </span>
                          </div>
                          <div className={styles.itemDesc}>{sug.description}</div>
                          <div className={styles.itemMeta}>关联设定：{sug.relatedSettings.join('、')}</div>
                          <div className={styles.matchHint}>💡 {sug.suggestion}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== V4.4 版本历史 ===== */}
      {activeTab === 'history' && (
        <div className={styles.tabContent}>
          <div className={styles.formCard}>
            <h3>📜 版本历史</h3>
            <p className={styles.hint}>创建数据快照，随时恢复到任意版本。快照存储在浏览器本地，最多保留 50 个。</p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <button className="btn btn-primary btn-sm" onClick={handleCreateSnapshot}>📸 创建快照</button>
              <button className="btn btn-sm" onClick={loadSnapshots}>🔄 刷新列表</button>
            </div>

            {/* 快照对比 */}
            <div className="form-group">
              <label>快照对比</label>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <select className="select" value={diffA} onChange={(e) => setDiffA(e.target.value)} style={{ flex: 1 }}>
                  <option value="">选择快照 A</option>
                  {snapshots.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}（{new Date(s.timestamp).toLocaleString('zh-CN')}）</option>
                  ))}
                </select>
                <span>vs</span>
                <select className="select" value={diffB} onChange={(e) => setDiffB(e.target.value)} style={{ flex: 1 }}>
                  <option value="">选择快照 B</option>
                  {snapshots.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}（{new Date(s.timestamp).toLocaleString('zh-CN')}）</option>
                  ))}
                </select>
                <button className="btn btn-sm" onClick={handleDiffSnapshots} disabled={!diffA || !diffB}>对比</button>
              </div>
              {diffResult && (
                <div className={styles.markdownCard} style={{ marginTop: '8px' }}>
                  <div className={styles.mdContent}>{diffResult}</div>
                </div>
              )}
            </div>

            {/* 快照列表 */}
            {snapshots.length === 0 ? (
              <p className={styles.emptyHint}>暂无快照，点击「创建快照」保存当前数据状态</p>
            ) : (
              <div className={styles.itemList}>
                {snapshots.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((s) => (
                  <div key={s.id} className={styles.resourceUpdateItem} style={{ justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{s.label}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        角色 {s.data.characters.length} · 章节 {s.data.chapters.length} · 伏笔 {s.data.foreshadows.length} · 设定 {s.data.worldSettings.length}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {new Date(s.timestamp).toLocaleString('zh-CN')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="btn btn-sm" onClick={() => handleRestoreSnapshot(s)}>恢复</button>
                      <button className="btn btn-sm btn-ghost" style={{ color: 'var(--danger)' }}
                        onClick={() => handleDeleteSnapshot(s.id)}>删除</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== 设置 ===== */}
      {activeTab === 'settings' && (
        <div className={styles.tabContent}>
          <div className={styles.formCard}>
            <h3>API 配置</h3>
            <p className={styles.hint}>
              支持 OpenAI 兼容 API（可填写其他服务商如 DeepSeek、通义千问等的兼容端点）
            </p>
            <div className="form-group">
              <label>API 地址</label>
              <input className="input" value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://api.openai.com/v1/chat/completions" />
            </div>
            <div className="form-group">
              <label>API Key</label>
              <input className="input" type="password" value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..." />
            </div>
            <div className="form-group">
              <label>模型</label>
              <input className="input" value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="gpt-3.5-turbo / gpt-4 / deepseek-chat" />
            </div>
            <button className="btn btn-primary" onClick={handleSaveConfig}>
              {configSaved ? '✅ 已保存' : '保存配置'}
            </button>
            <div className={styles.configHint}>
              API Key 仅保存在浏览器本地存储中，不会上传到任何服务器。
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
