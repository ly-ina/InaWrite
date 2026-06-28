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
import { useT } from '../i18n';
import {
  getAIConfig, updateAIConfig,
  getWritingSuggestions, analyzeNovelText, analyzeResourceUpdates,
  applySelectedResults, applyResourceUpdates,
  analyzeCharacterArc,
  matchAnalysisWithExisting,
  continueChapter, checkConsistency, completeWorldSettings,
  createSnapshot, getSnapshots, deleteSnapshot, restoreSnapshot, diffSnapshots,
  saveAISession, getAISession, clearAISession,
  addAIHistory, getAIHistory, deleteAIHistory, clearAIHistory,
  type AISessionState, type AIHistoryEntry,
  type AnalysisResult, type ApplyResult,
  type MatchableAnalysisResult, type MatchableCharacter,
  type MatchableWorldSetting, type MatchableForeshadow,
  type ContinueChapterInput, type ContinueChapterResult,
  type ConsistencyIssue, type ConsistencyReport,
  type WorldCompletionSuggestion, type WorldCompletionResult,
  type DataSnapshot,
} from '../utils/aiService';
import styles from './AIAssistant.module.css';

type TabKey = 'analyze' | 'suggest' | 'resources' | 'continue' | 'consistency' | 'complete' | 'snapshots' | 'history' | 'settings';

export default function AIAssistantPage() {
  const { currentProject, refreshKey, triggerRefresh } = useAppStore();
  const { characters, loadCharacters } = useCharacterStore();
  const { settings, loadSettings } = useWorldSettingStore();
  const { foreshadows, loadForeshadows } = useForeshadowStore();
  const { chapters, loadChapters } = useChapterStore();
  const { t, lang } = useT();

  // 从 localStorage 同步读取初始 activeTab，避免闪烁
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    try {
      const state = useAppStore.getState();
      if (state.currentProject) {
        const saved = getAISession(state.currentProject.id);
        if (saved.activeTab) return saved.activeTab as TabKey;
      }
    } catch { /* ignore */ }
    return 'analyze';
  });
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

  // 文本分析关联章节
  const [analyzeChapterNum, setAnalyzeChapterNum] = useState<number>(0);
  const [analyzeChapterTitle, setAnalyzeChapterTitle] = useState('');
  const [linkToChapter, setLinkToChapter] = useState(false);

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
  const isRestoringRef = useRef(true);  // 标记是否正在恢复会话，恢复期间不保存

  useEffect(() => {
    if (currentProject) {
      loadCharacters(currentProject.id);
      loadSettings(currentProject.id);
      loadForeshadows(currentProject.id);
      loadChapters(currentProject.id);
      // 恢复上次会话状态
      isRestoringRef.current = true;
      const saved = getAISession(currentProject.id);
      if (saved.activeTab) setActiveTab(saved.activeTab as TabKey);
      if (saved.inputText) setInputText(saved.inputText);
      if (saved.analysisResult) setAnalysisResult(saved.analysisResult);
      if (saved.applyStats) setApplyStats(saved.applyStats);
      if (saved.expandedSection) setExpandedSection(new Set(saved.expandedSection));
      if (saved.linkToChapter !== undefined) setLinkToChapter(saved.linkToChapter);
      if (saved.analyzeChapterNum) setAnalyzeChapterNum(saved.analyzeChapterNum);
      if (saved.analyzeChapterTitle) setAnalyzeChapterTitle(saved.analyzeChapterTitle);
      if (saved.suggestion) setSuggestion(saved.suggestion);
      if (saved.selectedChapterId) setSelectedChapterId(saved.selectedChapterId);
      if (saved.arcCharId) setArcCharId(saved.arcCharId);
      if (saved.arcResult) setArcResult(saved.arcResult);
      if (saved.resourceUpdates) setResourceUpdates(saved.resourceUpdates);
      if (saved.continueChapterId) setContinueChapterId(saved.continueChapterId);
      if (saved.continueOutline) setContinueOutline(saved.continueOutline);
      if (saved.continueStyle) setContinueStyle(saved.continueStyle);
      if (saved.continueResult) setContinueResult(saved.continueResult);
      if (saved.consistencyReport) setConsistencyReport(saved.consistencyReport);
      if (saved.worldCompletion) setWorldCompletion(saved.worldCompletion);
      // 延迟取消恢复标记，确保所有 setState 都完成
      setTimeout(() => { isRestoringRef.current = false; }, 100);
    }
  }, [currentProject, loadCharacters, loadSettings, loadForeshadows, loadChapters, refreshKey]);

  // 保存会话状态（每次状态变化时自动保存，恢复期间跳过）
  useEffect(() => {
    if (!currentProject || isRestoringRef.current) return;
    const state: Partial<AISessionState> = {
      activeTab,
      inputText,
      analysisResult,
      applyStats,
      expandedSection: Array.from(expandedSection),
      linkToChapter,
      analyzeChapterNum,
      analyzeChapterTitle,
      suggestion,
      selectedChapterId,
      arcCharId,
      arcResult,
      resourceUpdates,
      continueChapterId,
      continueOutline,
      continueStyle,
      continueResult,
      consistencyReport,
      worldCompletion,
    };
    saveAISession(currentProject.id, state);
  }, [
    currentProject, activeTab, inputText, analysisResult, applyStats,
    expandedSection, linkToChapter, analyzeChapterNum, analyzeChapterTitle,
    suggestion, selectedChapterId, arcCharId, arcResult, resourceUpdates,
    continueChapterId, continueOutline, continueStyle, continueResult,
    consistencyReport, worldCompletion,
  ]);

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
      // 添加历史记录
      const newCount = matched.characters.filter((c: any) => c._matchStatus === 'new').length +
        matched.worldSettings.filter((w: any) => w._matchStatus === 'new').length +
        matched.foreshadows.filter((f: any) => f._matchStatus === 'new').length;
      addAIHistory({
        projectId: currentProject.id,
        type: 'analyze',
        label: t('ai.tab.analyze'),
        summary: `${t('ai.tab.analyze')}: ${matched.characters.length} ${t('nav.characters')}, ${matched.worldSettings.length} ${t('nav.worldsettings')}, ${matched.foreshadows.length} ${t('nav.foreshadows')} (${newCount} ${t('ai.matchNew')})`,
        detail: { inputPreview: inputText.slice(0, 200) },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ai.analyzeFailed'));
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

      // 如果关联了章节，更新章节信息
      if (linkToChapter && analyzeChapterNum > 0) {
        const chapterStore = useChapterStore.getState();
        // 找到或创建章节
        let chapter = chapters.find((c) => c.number === analyzeChapterNum);
        const charIds = characters.map((c) => c.id);
        const fsIds = foreshadows.map((f) => f.id);

        if (chapter) {
          // 更新现有章节
          const updated = {
            ...chapter,
            title: analyzeChapterTitle || chapter.title,
            summary: analysisResult.summary || chapter.summary,
            content: inputText || chapter.content,
            characters: [...new Set([...chapter.characters, ...charIds])],
            foreshadowsAdded: [...new Set([...chapter.foreshadowsAdded, ...fsIds])],
            wordCount: chapter.content ? countWords(chapter.content) : chapter.wordCount,
          };
          await useChapterStore.getState().updateChapter(updated);
          stats.chaptersUpdated = 1;
        } else {
          // 创建新章节
          await useChapterStore.getState().createChapter({
            projectId: currentProject.id,
            number: analyzeChapterNum,
            title: analyzeChapterTitle || `第${analyzeChapterNum}章`,
            wordCount: countWords(inputText),
            status: 'draft',
            summary: analysisResult.summary || undefined,
            content: inputText || undefined,
            keyEvents: [],
            characters: charIds,
            foreshadowsAdded: fsIds,
            foreshadowsResolved: [],
            locations: [],
          });
          stats.chaptersAdded = 1;
        }
        await loadChapters(currentProject.id);
      }

      setApplyStats(stats);
      triggerRefresh();
      await loadCharacters(currentProject.id);
      await loadSettings(currentProject.id);
      await loadForeshadows(currentProject.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ai.applyFailed'));
    } finally {
      setLoading(false);
    }
  };

  function countWords(text: string): number {
    const chinese = text.match(/[\u4e00-\u9fff]/g);
    const words = text.match(/[a-zA-Z0-9]+/g);
    return (chinese?.length || 0) + (words?.reduce((sum, w) => sum + Math.ceil(w.length / 5), 0) || 0);
  }

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
      addAIHistory({
        projectId: currentProject.id,
        type: 'suggest',
        label: t('ai.tab.suggest'),
        summary: result.slice(0, 200) + (result.length > 200 ? '...' : ''),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ai.requestFailed'));
    } finally {
      setLoading(false);
    }
  };

  // ===== 资源更新 =====
  const handleResourceScan = async () => {
    if (!currentProject) return;
    const chapter = chapters.find((c) => c.id === selectedChapterId);
    if (!chapter) { setError(t('ai.selectChapter')); return; }
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
      addAIHistory({
        projectId: currentProject.id,
        type: 'resources',
        label: t('ai.tab.resources'),
        summary: `检测到 ${updates.length} 项资源状态变化`,
        detail: { updates },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ai.analyzeFailed'));
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
      alert(t('ai.updated').replace('{n}', String(count)));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ai.applyFailed'));
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
      setError(err instanceof Error ? err.message : t('ai.analyzeFailed'));
    } finally {
      setLoading(false);
    }
  };

  // ===== V4.1 章节续写 =====
  const handleContinue = async () => {
    if (!currentProject || !continueChapterId) return;
    const lastChapter = chapters.find((c) => c.id === continueChapterId);
    if (!lastChapter) { setError(t('ai.prevChapter')); return; }
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
      addAIHistory({
        projectId: currentProject.id,
        type: 'continue',
        label: t('ai.tab.continue'),
        summary: `续写「${result.title}」（${result.wordCount}字）`,
        detail: { title: result.title, contentPreview: result.content.slice(0, 200) },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ai.continueFailed'));
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
    alert(t('ai.saveAsChapter') + `: ${t('ai.chapterNum')}${nextNumber}${t('chap.number')}「${continueResult.title}」`);
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
      addAIHistory({
        projectId: currentProject.id,
        type: 'consistency',
        label: t('ai.tab.consistency'),
        summary: `评分 ${report.score}/100，发现 ${report.issues.length} 个问题`,
        detail: { score: report.score, issueCount: report.issues.length },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ai.checkFailed'));
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
      addAIHistory({
        projectId: currentProject.id,
        type: 'complete',
        label: t('ai.tab.complete'),
        summary: `${result.summary.slice(0, 200)}（${result.suggestions.length} 条建议）`,
        detail: { suggestionCount: result.suggestions.length },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ai.completeFailed'));
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
    const label = prompt(t('ai.snapshotLabel'), t('ai.snapshotLabel').replace('{date}', new Date().toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US')));
    await createSnapshot(currentProject.id, label || undefined);
    loadSnapshots();
    alert(t('ai.createSnapshot') + ' ✅');
  };

  const handleRestoreSnapshot = async (snapshot: DataSnapshot) => {
    if (!confirm(t('ai.confirmRestoreSnapshot').replace('{label}', snapshot.label))) return;
    await restoreSnapshot(snapshot);
    triggerRefresh();
    alert(t('ai.restored'));
    window.location.reload();
  };

  const handleDeleteSnapshot = (id: string) => {
    if (!currentProject || !confirm(t('ai.confirmDeleteSnapshot'))) return;
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
    return <div className="empty-state"><div className="icon">🤖</div><p>{t('common.selectProject')}</p></div>;
  }

  return (
    <div className={styles.page}>
      <div className="page-header">
        <h1>🤖 {t('ai.title')}</h1>
      </div>

      {/* 标签页切换 */}
      <div className={styles.tabs}>
        {([
          { key: 'analyze', label: t('ai.tab.analyze'), desc: t('ai.tab.analyzeDesc') },
          { key: 'suggest', label: t('ai.tab.suggest'), desc: t('ai.tab.suggestDesc') },
          { key: 'continue', label: t('ai.tab.continue'), desc: t('ai.tab.continueDesc') },
          { key: 'resources', label: t('ai.tab.resources'), desc: t('ai.tab.resourcesDesc') },
          { key: 'consistency', label: t('ai.tab.consistency'), desc: t('ai.tab.consistencyDesc') },
          { key: 'complete', label: t('ai.tab.complete'), desc: t('ai.tab.completeDesc') },
          { key: 'history', label: t('ai.tab.history'), desc: t('ai.tab.historyDesc') },
          { key: 'snapshots', label: t('ai.tab.snapshots'), desc: t('ai.tab.snapshotsDesc') },
          { key: 'settings', label: t('ai.tab.settings'), desc: t('ai.tab.settingsDesc') },
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
              <h3>{t('ai.inputText')}</h3>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn btn-sm" onClick={() => fileInputRef.current?.click()}>
                  {t('ai.chooseFile')}
                </button>
                <input ref={fileInputRef} type="file" accept=".txt,.md" style={{ display: 'none' }}
                  onChange={handleFileUpload} />
                <button className="btn btn-sm" onClick={() => setInputText('')}>{t('ai.clearText')}</button>
              </div>
            </div>

            {/* 章节关联选项 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap',
              padding: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                <input type="checkbox" checked={linkToChapter} onChange={(e) => {
                  setLinkToChapter(e.target.checked);
                  if (e.target.checked && analyzeChapterNum === 0) {
                    setAnalyzeChapterNum(chapters.length > 0 ? Math.max(...chapters.map((c) => c.number)) + 1 : 1);
                  }
                }} />
                {t('ai.linkToChapter')}
              </label>
              {linkToChapter && (
                <>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('ai.chapterNum')}</span>
                  <input className="input" type="number" value={analyzeChapterNum}
                    onChange={(e) => setAnalyzeChapterNum(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{ width: '70px', padding: '4px 8px', fontSize: '13px' }}
                    min={1} max={chapters.length > 0 ? Math.max(...chapters.map((c) => c.number)) + 1 : 999} />
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('chap.number')}</span>
                  <input className="input" value={analyzeChapterTitle}
                    onChange={(e) => setAnalyzeChapterTitle(e.target.value)}
                    placeholder={t('ai.chapterTitleOptional')}
                    style={{ flex: 1, padding: '4px 8px', fontSize: '13px', maxWidth: '200px' }} />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {chapters.find((c) => c.number === analyzeChapterNum) ? t('ai.willUpdateChapter') : t('ai.willCreateChapter')}
                  </span>
                </>
              )}
            </div>

            <textarea
              className={styles.textArea}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t('ai.pastePlaceholder')}
              rows={12}
            />
            <button
              className="btn btn-primary"
              onClick={handleAnalyze}
              disabled={loading || !inputText.trim()}
              style={{ marginTop: '10px' }}
            >
              {loading ? t('ai.analyzing') : t('ai.startAnalyze')}
            </button>
          </div>

          {analysisResult && (
            <div className={styles.resultSection}>
              <div className={styles.resultHeader}>
                <h2>{t('ai.analysisResult')}</h2>
                {!applyStats && (
                  <button className="btn btn-primary" onClick={handleApply} disabled={loading}>
                    {t('ai.applySelected')}
                  </button>
                )}
              </div>

              {applyStats && (
                <div className={styles.applySuccess}>
                  {t('ai.applyComplete')}{' '}
                  {t('ai.analysisStats')
                    .replace('{ca}', String(applyStats.charactersAdded))
                    .replace('{cu}', String(applyStats.charactersUpdated))
                    .replace('{cr}', String(applyStats.characterRelationsAdded))
                    .replace('{wa}', String(applyStats.worldSettingsAdded))
                    .replace('{wu}', String(applyStats.worldSettingsUpdated))
                    .replace('{wr}', String(applyStats.worldSettingRelationsAdded))
                    .replace('{fa}', String(applyStats.foreshadowsAdded))}
                  {(applyStats.chaptersAdded || applyStats.chaptersUpdated) ? (
                    <span>；{t('ai.chapterStats').replace('{stats}',
                      (applyStats.chaptersAdded ? `+${applyStats.chaptersAdded}` : '') +
                      (applyStats.chaptersAdded && applyStats.chaptersUpdated ? ' / ' : '') +
                      (applyStats.chaptersUpdated ? `+${applyStats.chaptersUpdated}` : '')
                    )}</span>
                  ) : null}
                </div>
              )}

              {analysisResult.summary && (
                <div className={styles.summaryCard}>
                  <div className={styles.summaryTitle}>{t('ai.textSummary')}</div>
                  <p>{analysisResult.summary}</p>
                </div>
              )}

              {/* 角色 */}
              <div className={styles.sectionCard}>
                <div className={styles.sectionTitle} onClick={() => toggleSection('characters')}>
                  <span>{expandedSection.has('characters') ? '▾' : '▸'}</span>
                  {' '}{t('ai.extractChars')} ({analysisResult.characters.length})
                  <span style={{ marginLeft: 'auto', marginRight: '8px', fontSize: '11px', cursor: 'pointer' }}
                    onClick={(e) => { e.stopPropagation(); toggleAllChars(); }}>
                    {selectAllChars ? t('common.deselectAll') : t('common.selectAll')}
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
                              {c._matchStatus === 'new' ? t('ai.matchNew') : c._matchStatus === 'update' ? t('ai.matchUpdate') : t('ai.matchDuplicate')}
                            </span>
                          </div>
                          {c._existingName && (
                            <div className={styles.matchHint}>{t('ai.existingLabel')}{c._existingName}</div>
                          )}
                          {c._duplicateOf && (
                            <div className={styles.matchWarning}>⚠ {c._duplicateOf}</div>
                          )}
                          <div className={styles.itemMeta}>
                            {c.race && <span>{t('char.race')}：{c.race}</span>}
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
                    {analysisResult.characters.length === 0 && <span className={styles.muted}>{t('ai.noNewChars')}</span>}
                  </div>
                )}
              </div>

              {/* 世界观 */}
              <div className={styles.sectionCard}>
                <div className={styles.sectionTitle} onClick={() => toggleSection('worldSettings')}>
                  <span>{expandedSection.has('worldSettings') ? '▾' : '▸'}</span>
                  {' '}{t('ai.extractSettings')} ({analysisResult.worldSettings.length})
                  <span style={{ marginLeft: 'auto', marginRight: '8px', fontSize: '11px', cursor: 'pointer' }}
                    onClick={(e) => { e.stopPropagation(); toggleAllSettings(); }}>
                    {selectAllSettings ? t('common.deselectAll') : t('common.selectAll')}
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
                              {w._matchStatus === 'new' ? t('ai.matchNew') : w._matchStatus === 'update' ? t('ai.matchUpdate') : t('ai.matchDuplicate')}
                            </span>
                          </div>
                          {w._existingName && <div className={styles.matchHint}>{t('ai.existingLabel')}{w._existingName}</div>}
                          {w._duplicateOf && <div className={styles.matchWarning}>⚠ {w._duplicateOf}</div>}
                          <div className={styles.itemDesc}>{w.description.slice(0, 120)}</div>
                          {w.parentName && <div className={styles.itemMeta}>{t('ai.belongsTo')}{w.parentName}</div>}
                        </div>
                      </div>
                    ))}
                    {analysisResult.worldSettings.length === 0 && <span className={styles.muted}>{t('ai.noNewSettings')}</span>}
                  </div>
                )}
              </div>

              {/* 伏笔 */}
              <div className={styles.sectionCard}>
                <div className={styles.sectionTitle} onClick={() => toggleSection('foreshadows')}>
                  <span>{expandedSection.has('foreshadows') ? '▾' : '▸'}</span>
                  {' '}{t('ai.foundForeshadows')} ({analysisResult.foreshadows.length})
                  <span style={{ marginLeft: 'auto', marginRight: '8px', fontSize: '11px', cursor: 'pointer' }}
                    onClick={(e) => { e.stopPropagation(); toggleAllForeshadows(); }}>
                    {selectAllForeshadows ? t('common.deselectAll') : t('common.selectAll')}
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
                              {f._matchStatus === 'new' ? t('ai.matchNew') : f._matchStatus === 'update' ? t('ai.matchExists') : t('ai.matchDuplicate')}
                            </span>
                          </div>
                          <div className={styles.itemDesc}>{f.content}</div>
                          {f._existingContent && <div className={styles.matchHint}>{t('ai.existingLabel')}{f._existingContent.slice(0, 60)}...</div>}
                          {f.relatedCharacters.length > 0 && (
                            <div className={styles.itemMeta}>{t('ai.related')}{f.relatedCharacters.join('、')}</div>
                          )}
                        </div>
                      </div>
                    ))}
                    {analysisResult.foreshadows.length === 0 && <span className={styles.muted}>{t('ai.noForeshadows')}</span>}
                  </div>
                )}
              </div>

              {/* 建议 */}
              {analysisResult.suggestions.length > 0 && (
                <div className={styles.suggestionsCard}>
                  <div className={styles.summaryTitle}>{t('ai.writingSuggestion')}</div>
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
              <label>{t('ai.selectChapter')}（{t('common.optional')}）</label>
              <select className="select" value={selectedChapterId}
                onChange={(e) => setSelectedChapterId(e.target.value)}>
                <option value="">{t('ai.selectChapter')}（{t('common.optional')}）</option>
                {chapters.map((ch) => (
                  <option key={ch.id} value={ch.id}>{t('ai.chapterNum')}{ch.number} {t('chap.number')} {ch.title}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>{t('ai.arcAnalysis')}</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <select className="select" value={arcCharId}
                  onChange={(e) => setArcCharId(e.target.value)}>
                  <option value="">{t('ai.selectCharacter')}</option>
                  {characters.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button className="btn btn-sm" onClick={handleArcAnalyze} disabled={loading || !arcCharId}>
                  {t('ai.analyzeArc')}
                </button>
              </div>
            </div>
            {arcResult && (
              <div className={styles.markdownCard}>
                <div className={styles.summaryTitle}>{t('ai.arcResult')}</div>
                <div className={styles.mdContent}>{arcResult}</div>
              </div>
            )}
            <button className="btn btn-primary" onClick={handleSuggest} disabled={loading}
              style={{ marginTop: '10px' }}>
              {loading ? t('ai.thinking') : t('ai.getSuggestions')}
            </button>
            {suggestion && (
              <div className={styles.markdownCard} style={{ marginTop: '16px' }}>
                <div className={styles.summaryTitle}>{t('ai.suggestionResult')}</div>
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
              {t('ai.resourceScan')}
            </p>
            <div className="form-group">
              <label>{t('ai.resourceScanHint')}</label>
              <select className="select" value={selectedChapterId}
                onChange={(e) => setSelectedChapterId(e.target.value)}>
                <option value="">{t('ai.selectChapter')}</option>
                {chapters.map((ch) => (
                  <option key={ch.id} value={ch.id}>{t('ai.chapterNum')}{ch.number} {t('chap.number')} {ch.title}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>{t('ai.pasteText')}</label>
              <textarea className={styles.textArea} value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={t('ai.pastePlaceholder')}
                rows={6}
              />
            </div>
            <button className="btn btn-primary" onClick={handleResourceScan} disabled={loading}>
              {loading ? t('ai.scanning') : t('ai.scanChanges')}
            </button>

            {resourceUpdates.length > 0 && (
              <div className={styles.resultSection} style={{ marginTop: '16px' }}>
                <div className={styles.resultHeader}>
                  <h3>{t('ai.detectedChanges').replace('{n}', String(resourceUpdates.length))}</h3>
                  <button className="btn btn-primary btn-sm" onClick={handleApplyResourceUpdates} disabled={loading}>
                    {t('ai.applyUpdate')}
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
              <div className={styles.emptyHint}>{t('ai.clickToScan')}</div>
            )}
          </div>
        </div>
      )}

      {/* ===== V4.1 章节续写 ===== */}
      {activeTab === 'continue' && (
        <div className={styles.tabContent}>
          <div className={styles.formCard}>
            <h3>{t('ai.continueTitle')}</h3>
            <p className={styles.hint}>{t('ai.continueHint')}</p>
            <div className="form-group">
              <label>{t('ai.prevChapter')}</label>
              <select className="select" value={continueChapterId} onChange={(e) => setContinueChapterId(e.target.value)}>
                <option value="">{t('ai.selectChapter')}</option>
                {[...chapters].sort((a, b) => a.number - b.number).map((ch) => (
                  <option key={ch.id} value={ch.id}>{t('ai.chapterNum')}{ch.number} {t('chap.number')} {ch.title}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>{t('ai.nextOutline')}</label>
              <textarea className="textarea" value={continueOutline} onChange={(e) => setContinueOutline(e.target.value)}
                placeholder={t('ai.outlinePlaceholder')} rows={3} />
            </div>
            <div className="form-group">
              <label>{t('ai.styleGuide')}</label>
              <input className="input" value={continueStyle} onChange={(e) => setContinueStyle(e.target.value)}
                placeholder={t('ai.stylePlaceholder')} />
            </div>
            <button className="btn btn-primary" onClick={handleContinue} disabled={loading || !continueChapterId}>
              {loading ? t('ai.continuing') : t('ai.startContinue')}
            </button>

            {continueResult && (
              <div className={styles.markdownCard} style={{ marginTop: '16px' }}>
                <div className={styles.summaryTitle}>{t('ai.continueResult')} — {continueResult.title}（{continueResult.wordCount}{t('chap.wordCount')}）</div>
                <p className={styles.hint}>{t('ai.reasoning')}{continueResult.reasoning}</p>
                <div className={styles.mdContent}>{continueResult.content.slice(0, 2000)}{continueResult.content.length > 2000 ? '...' : ''}</div>
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                  <button className="btn btn-primary btn-sm" onClick={saveContinuedChapter}>{t('ai.saveAsChapter')}</button>
                  <button className="btn btn-sm" onClick={() => setContinueResult(null)}>{t('common.clear')}</button>
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
            <h3>{t('ai.consistencyTitle')}</h3>
            <p className={styles.hint}>{t('ai.consistencyHint')}</p>
            <button className="btn btn-primary" onClick={handleConsistencyCheck} disabled={loading}>
              {loading ? t('ai.checking') : t('ai.startCheck')}
            </button>

            {consistencyReport && (
              <div className={styles.resultSection} style={{ marginTop: '16px' }}>
                <div className={styles.resultHeader}>
                  <h3>{t('ai.consistencyScore')}：{consistencyReport.score}/100</h3>
                </div>
                <p className={styles.summaryCard} style={{ padding: '10px' }}>
                  <strong>{t('ai.summary')}</strong>{consistencyReport.summary}
                </p>
                {consistencyReport.issues.length === 0 ? (
                  <p className={styles.hint} style={{ textAlign: 'center', padding: '20px' }}>{t('ai.noIssues')}</p>
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
            <h3>{t('ai.completeTitle')}</h3>
            <p className={styles.hint}>{t('ai.completeHint')}</p>
            <button className="btn btn-primary" onClick={handleWorldComplete} disabled={loading}>
              {loading ? t('ai.analyzing') : t('ai.startComplete')}
            </button>

            {worldCompletion && (
              <div className={styles.resultSection} style={{ marginTop: '16px' }}>
                <p className={styles.summaryCard} style={{ padding: '10px' }}>
                  <strong>{t('ai.summary')}</strong>{worldCompletion.summary}
                </p>
                {worldCompletion.suggestions.length === 0 ? (
                  <p className={styles.hint} style={{ textAlign: 'center', padding: '20px' }}>{t('ai.noGaps')}</p>
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
                              {sug.type === 'gap' ? t('ai.logicGap') : sug.type === 'relation' ? t('ai.relationSuggest') : t('ai.detailSuggest')}
                            </span>
                          </div>
                          <div className={styles.itemDesc}>{sug.description}</div>
                          <div className={styles.itemMeta}>{t('ai.related')}{sug.relatedSettings.join('、')}</div>
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

      {/* ===== AI 操作历史 ===== */}
      {activeTab === 'history' && <AIHistoryTab projectId={currentProject.id} />}

      {/* ===== V4.4 版本历史 ===== */}
      {activeTab === 'snapshots' && (
        <div className={styles.tabContent}>
          <div className={styles.formCard}>
            <h3>{t('ai.snapshotsTitle')}</h3>
            <p className={styles.hint}>{t('ai.snapshotsHint')}</p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <button className="btn btn-primary btn-sm" onClick={handleCreateSnapshot}>{t('ai.createSnapshot')}</button>
              <button className="btn btn-sm" onClick={loadSnapshots}>{t('ai.refreshList')}</button>
            </div>

            {/* 快照对比 */}
            <div className="form-group">
              <label>{t('ai.snapshotCompare')}</label>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <select className="select" value={diffA} onChange={(e) => setDiffA(e.target.value)} style={{ flex: 1 }}>
                  <option value="">{t('ai.selectSnapshotA')}</option>
                  {snapshots.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}（{new Date(s.timestamp).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US')}）</option>
                  ))}
                </select>
                <span>vs</span>
                <select className="select" value={diffB} onChange={(e) => setDiffB(e.target.value)} style={{ flex: 1 }}>
                  <option value="">{t('ai.selectSnapshotB')}</option>
                  {snapshots.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}（{new Date(s.timestamp).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US')}）</option>
                  ))}
                </select>
                <button className="btn btn-sm" onClick={handleDiffSnapshots} disabled={!diffA || !diffB}>{t('ai.compare')}</button>
              </div>
              {diffResult && (
                <div className={styles.markdownCard} style={{ marginTop: '8px' }}>
                  <div className={styles.mdContent}>{diffResult}</div>
                </div>
              )}
            </div>

            {/* 快照列表 */}
            {snapshots.length === 0 ? (
              <p className={styles.emptyHint}>{t('ai.noSnapshots')}</p>
            ) : (
              <div className={styles.itemList}>
                {snapshots.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((s) => (
                  <div key={s.id} className={styles.resourceUpdateItem} style={{ justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{s.label}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {t('nav.characters')} {s.data.characters.length} · {t('nav.chapters')} {s.data.chapters.length} · {t('nav.foreshadows')} {s.data.foreshadows.length} · {t('nav.worldsettings')} {s.data.worldSettings.length}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {new Date(s.timestamp).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="btn btn-sm" onClick={() => handleRestoreSnapshot(s)}>{t('common.restore')}</button>
                      <button className="btn btn-sm btn-ghost" style={{ color: 'var(--danger)' }}
                        onClick={() => handleDeleteSnapshot(s.id)}>{t('common.delete')}</button>
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
            <h3>{t('ai.settingsTitle')}</h3>
            <p className={styles.hint}>
              {t('ai.settingsHint')}
            </p>
            <div className="form-group">
              <label>{t('ai.apiUrl')}</label>
              <input className="input" value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://api.openai.com/v1/chat/completions" />
            </div>
            <div className="form-group">
              <label>{t('ai.apiKey')}</label>
              <input className="input" type="password" value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..." />
            </div>
            <div className="form-group">
              <label>{t('ai.model')}</label>
              <input className="input" value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="gpt-3.5-turbo / gpt-4 / deepseek-chat" />
            </div>
            <button className="btn btn-primary" onClick={handleSaveConfig}>
              {configSaved ? t('ai.saved') : t('ai.saveConfig')}
            </button>
            <div className={styles.configHint}>
              {t('ai.configSecurity')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== AI 操作历史 Tab 组件 ==========

function AIHistoryTab({ projectId }: { projectId: string }) {
  const { t, lang } = useT();
  const [history, setHistory] = useState<AIHistoryEntry[]>([]);

  const TYPE_LABELS: Record<string, string> = {
    analyze: t('ai.tab.analyze'),
    suggest: t('ai.tab.suggest'),
    resources: t('ai.tab.resources'),
    continue: t('ai.tab.continue'),
    consistency: t('ai.tab.consistency'),
    complete: t('ai.tab.complete'),
  };

  useEffect(() => {
    setHistory(getAIHistory(projectId));
  }, [projectId]);

  const handleClear = () => {
    if (!confirm(t('ai.confirmClearHistory'))) return;
    clearAIHistory(projectId);
    setHistory([]);
  };

  const handleDelete = (id: string) => {
    deleteAIHistory(projectId, id);
    setHistory((prev) => prev.filter((h) => h.id !== id));
  };

  if (history.length === 0) {
    return (
      <div className={styles.tabContent}>
        <div className={styles.formCard}>
          <h3>{t('ai.historyTitle')}</h3>
          <p className={styles.hint}>{t('ai.historyHint')}</p>
          <div className={styles.emptyHint} style={{ textAlign: 'center', padding: '30px' }}>
            {t('ai.noHistory')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tabContent}>
      <div className={styles.formCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3>{t('ai.historyCount').replace('{n}', String(history.length))}</h3>
          <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={handleClear}>
            {t('ai.clearHistory')}
          </button>
        </div>
        <div className={styles.itemList}>
          {history.map((entry) => (
            <div key={entry.id} className={styles.resourceUpdateItem} style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600 }}>
                    {TYPE_LABELS[entry.type] || entry.label}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {new Date(entry.timestamp).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US')}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {entry.summary}
                </div>
              </div>
              <button
                className="btn btn-sm btn-ghost"
                style={{ color: 'var(--danger)', fontSize: '11px', flexShrink: 0, marginLeft: '8px' }}
                onClick={() => handleDelete(entry.id)}
              >
                {t('common.delete')}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
