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
  applyAnalysisResult, applyResourceUpdates,
  analyzeCharacterArc,
  type AnalysisResult, type ApplyResult,
} from '../utils/aiService';
import styles from './AIAssistant.module.css';

type TabKey = 'analyze' | 'suggest' | 'resources' | 'settings';

export default function AIAssistantPage() {
  const { currentProject, refreshKey, setRefreshKey } = useAppStore();
  const { characters, loadCharacters } = useCharacterStore();
  const { settings, loadSettings } = useWorldSettingStore();
  const { foreshadows, loadForeshadows } = useForeshadowStore();
  const { chapters, loadChapters } = useChapterStore();

  const [activeTab, setActiveTab] = useState<TabKey>('analyze');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 文本分析
  const [inputText, setInputText] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [applyStats, setApplyStats] = useState<ApplyResult | null>(null);
  const [expandedSection, setExpandedSection] = useState<Set<string>>(new Set(['characters', 'worldSettings', 'foreshadows']));

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

  // ===== 文本分析 =====
  const handleAnalyze = async () => {
    if (!inputText.trim() || !currentProject) return;
    setLoading(true);
    setError('');
    setAnalysisResult(null);
    setApplyStats(null);
    try {
      const result = await analyzeNovelText(inputText, {
        characters: characters.map((c) => ({ name: c.name, id: c.id })),
        worldSettings: settings.map((s) => ({ name: s.name, id: s.id })),
        foreshadows: foreshadows.map((f) => ({ content: f.content, id: f.id })),
      });
      setAnalysisResult(result);
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
      const stats = await applyAnalysisResult(currentProject.id, analysisResult);
      setApplyStats(stats);
      setRefreshKey(Date.now());
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
      setRefreshKey(Date.now());
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
          { key: 'resources', label: '🔄 资源追踪', desc: '根据章节内容智能更新角色资源状态' },
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
                    ✅ 一键应用到作品
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
                </div>
                {expandedSection.has('characters') && (
                  <div className={styles.itemGrid}>
                    {analysisResult.characters.map((c, i) => (
                      <div key={i} className={styles.itemCard}>
                        <div className={styles.itemName}>{c.name}</div>
                        <div className={styles.itemMeta}>
                          {c.race && <span>种族：{c.race}</span>}
                          {c.status && <span className={`tag tag-${c.status}`}>{c.status}</span>}
                        </div>
                        {c.personality && <div className={styles.itemDesc}>性格：{c.personality.slice(0, 80)}</div>}
                        {c.resources?.length ? (
                          <div className={styles.itemTags}>
                            {c.resources.map((r, j) => (
                              <span key={j} className={styles.tag}>{r.type}: {r.name}</span>
                            ))}
                          </div>
                        ) : null}
                        {c.relations?.length ? (
                          <div className={styles.itemTags} style={{ marginTop: '4px' }}>
                            {c.relations.map((r, j) => (
                              <span key={j} className={styles.relationTag}>
                                {r.direction === '单向' ? '→' : '↔'} {r.targetName}（{r.type}）
                              </span>
                            ))}
                          </div>
                        ) : null}
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
                </div>
                {expandedSection.has('worldSettings') && (
                  <div className={styles.itemGrid}>
                    {analysisResult.worldSettings.map((w, i) => (
                      <div key={i} className={styles.itemCard}>
                        <div className={styles.itemName}>
                          <span className={styles.tag}>{w.type}</span> {w.name}
                        </div>
                        <div className={styles.itemDesc}>{w.description.slice(0, 120)}</div>
                        {w.parentName && <div className={styles.itemMeta}>属于：{w.parentName}</div>}
                        {w.relations?.length ? (
                          <div className={styles.itemTags} style={{ marginTop: '4px' }}>
                            {w.relations.map((r, j) => (
                              <span key={j} className={styles.relationTag}>
                                {r.type} → {r.targetName}
                              </span>
                            ))}
                          </div>
                        ) : null}
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
                </div>
                {expandedSection.has('foreshadows') && (
                  <div className={styles.itemList}>
                    {analysisResult.foreshadows.map((f, i) => (
                      <div key={i} className={styles.foreshadowItem}>
                        <span className={`${styles.confidence} ${styles[`conf${f.confidence}`]}`}>
                          {f.confidence === 'high' ? '🔴' : f.confidence === 'medium' ? '🟡' : '🟢'}
                        </span>
                        <span className={styles.foreshadowContent}>{f.content}</span>
                        {f.relatedCharacters.length > 0 && (
                          <span className={styles.foreshadowChars}>
                            关联：{f.relatedCharacters.join('、')}
                          </span>
                        )}
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
