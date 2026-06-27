/**
 * 模板与导入导出中心
 * 各模块导入模板下载 + 预设模板快速创建 + 完整项目导出
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { useProjectStore } from '../store/projectStore';
import { generateId } from '../types';
import {
  getCharacterTemplate, getChapterTemplate, getForeshadowTemplate,
  getWorldSettingTemplate, downloadTemplateFile, generateFullExport,
  PRESET_TEMPLATES, type PresetTemplate
} from '../utils/templates';
import { exportProject, downloadJSON, readJSONFile, executeImport } from '../utils/importExport';
import { createAutoBackup } from '../utils/backup';
import { generateReport } from '../utils/backup';
import styles from './Templates.module.css';

/** 各模块模板配置 */
const MODULE_TEMPLATES = [
  { key: 'character', label: '角色模板', icon: '👤', desc: '导入角色的 JSON 格式模板',
    generator: (pid: string) => getCharacterTemplate(pid) },
  { key: 'chapter', label: '章节模板', icon: '📖', desc: '导入章节的 JSON 格式模板',
    generator: (pid: string) => getChapterTemplate(pid) },
  { key: 'foreshadow', label: '伏笔模板', icon: '🔮', desc: '导入伏笔的 JSON 格式模板',
    generator: (pid: string) => getForeshadowTemplate(pid) },
  { key: 'worldsetting', label: '设定模板', icon: '🌍', desc: '导入世界观设定的 JSON 格式模板',
    generator: (pid: string) => getWorldSettingTemplate(pid) },
];

export default function TemplatesPage() {
  const navigate = useNavigate();
  const { currentProject } = useAppStore();
  const { createProject, loadProjects } = useProjectStore();

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<string>('');

  // 预设模板应用
  const [selectedPreset, setSelectedPreset] = useState<PresetTemplate | null>(null);
  const [presetName, setPresetName] = useState('');

  /** 下载模板 */
  const handleDownloadTemplate = (key: string) => {
    if (!currentProject) return;
    const tpl = MODULE_TEMPLATES.find((t) => t.key === key);
    if (!tpl) return;
    const data = tpl.generator(currentProject.id);
    downloadTemplateFile(data, `${key}-template.json`);
  };

  /** 导出完整项目 */
  const handleFullExport = async () => {
    if (!currentProject) return;
    const data = await generateFullExport(currentProject);
    downloadTemplateFile(data, `${currentProject.name}-完整设定.json`);
  };

  /** 导出 JSON 格式 */
  const handleExportJSON = async () => {
    if (!currentProject) return;
    const json = await exportProject(currentProject);
    downloadJSON(json, `${currentProject.name}-${new Date().toISOString().slice(0, 10)}.json`);
  };

  /** 导出创作报告 */
  const handleExportReport = async () => {
    if (!currentProject) return;
    const data = await generateFullExport(currentProject);
    const report = generateReport(data);
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProject.name}-创作报告.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /** 导入 JSON */
  const handleImport = async () => {
    if (!importFile || !currentProject) return;
    setImportStatus('正在导入...');
    try {
      const data = await readJSONFile(importFile);
      await executeImport(currentProject.id, data, false);
      setImportStatus('导入成功！');
      setImportFile(null);
    } catch (error) {
      setImportStatus(error instanceof Error ? error.message : '导入失败');
    }
  };

  /** 应用预设模板 */
  const handleApplyPreset = async () => {
    if (!selectedPreset || !presetName.trim()) return;
    const data = selectedPreset.generate(presetName.trim());
    const now = new Date().toISOString();

    // 创建项目
    const project = await createProject(data.project.name, data.project.description);

    // 创建关联数据
    const { db } = await import('../db/database');
    const projectId = project.id;

    // 创建角色（建立 ID 映射用于关系）
    const charIdMap = new Map<string, string>();
    const characters = data.characters.map((c) => {
      const newId = generateId();
      charIdMap.set(c.name, newId);
      return { ...c, id: newId, projectId, relations: [], appearances: [] };
    });

    // 创建章节
    const chapters = data.chapters.map((ch) => ({
      ...ch, id: generateId(), projectId, characters: [], foreshadowsAdded: [], foreshadowsResolved: [],
    }));

    // 创建伏笔
    const foreshadows = data.foreshadows.map((f) => ({
      ...f, id: generateId(), projectId, relatedCharacters: [],
    }));

    // 创建设定（建立 ID 映射）
    const settingIdMap = new Map<string, string>();
    const worldSettings = data.worldSettings.map((w) => {
      const newId = generateId();
      settingIdMap.set(w.name, newId);
      return { ...w, id: newId, projectId, parentId: undefined, relations: [] };
    });

    // 修正设定中的 parentId 和 relations
    const fixedSettings = worldSettings.map((w) => {
      const origSetting = data.worldSettings.find((s) => s.name === w.name);
      if (!origSetting) return w;
      return {
        ...w,
        parentId: origSetting.parentId
          ? (settingIdMap.get(
              data.worldSettings.find((s) => (s as unknown as { _idx: number })._idx ===
                data.worldSettings.indexOf(origSetting))?.name || ''
            ) || undefined)
          : undefined,
        relations: origSetting.relations.map((r) => ({
          targetId: settingIdMap.get(
            data.worldSettings.find((s) => s.name === r.targetId || '')?.name || ''
          ) || '',
          type: r.type,
        })).filter((r) => r.targetId),
      };
    });

    await Promise.all([
      db.characters.addMany(characters),
      db.chapters.addMany(chapters),
      db.foreshadows.addMany(foreshadows),
      db.worldSettings.addMany(fixedSettings),
    ]);

    // 更新角色关系
    for (const char of data.characters) {
      const newCharId = charIdMap.get(char.name);
      if (!newCharId) continue;
      const updatedChar = characters.find((c) => c.id === newCharId);
      if (!updatedChar) continue;
      updatedChar.relations = char.relations
        .map((r) => {
          // 尝试从角色名或角色列表中找到对应关系
          const targetName = data.characters.find((c) =>
            c.relations.some((cr) => cr.targetId === r.targetId) ||
            c.name === r.targetId
          )?.name;
          if (!targetName) return null;
          const targetId = charIdMap.get(targetName);
          if (!targetId) return null;
          return { ...r, targetId };
        })
        .filter(Boolean) as typeof updatedChar.relations;
      await db.characters.update(updatedChar);
    }

    await loadProjects();
    alert(`预设模板「${selectedPreset.name}」已创建！共创建 ${characters.length} 个角色、${chapters.length} 个章节。`);
    setSelectedPreset(null);
    setPresetName('');
    navigate('/projects');
  };

  if (!currentProject) {
    return (
      <div className={styles.page}>
        <div className="page-header">
          <h1>模板与导入导出</h1>
        </div>
        <div className="empty-state">
          <div className="icon">📦</div>
          <p>请先选择或创建一个作品</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className="page-header">
        <h1>模板与导入导出</h1>
      </div>

      <div className={styles.grid}>
        {/* 各模块导入模板 */}
        <section className={styles.section}>
          <h3>📥 导入模板下载</h3>
          <p className={styles.sectionDesc}>
            下载标准 JSON 模板，填入数据后通过作品页的「导入」功能批量导入
          </p>
          <div className={styles.templateList}>
            {MODULE_TEMPLATES.map((tpl) => (
              <div key={tpl.key} className={styles.templateItem}>
                <div className={styles.tplInfo}>
                  <span className={styles.tplIcon}>{tpl.icon}</span>
                  <div>
                    <div className={styles.tplName}>{tpl.label}</div>
                    <div className={styles.tplDesc}>{tpl.desc}</div>
                  </div>
                </div>
                <button className="btn btn-sm" onClick={() => handleDownloadTemplate(tpl.key)}>
                  下载模板
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* 完整导出 */}
        <section className={styles.section}>
          <h3>📤 项目导出</h3>
          <p className={styles.sectionDesc}>
            导出当前作品的完整数据
          </p>
          <div className={styles.exportActions}>
            <button className="btn btn-primary" onClick={handleFullExport}>
              📦 完整设定导出
            </button>
            <button className="btn" onClick={handleExportJSON}>
              📄 JSON 格式
            </button>
            <button className="btn" onClick={handleExportReport}>
              📊 创作报告
            </button>
          </div>
        </section>

        {/* 导入区域 */}
        <section className={styles.section}>
          <h3>📥 数据导入</h3>
          <p className={styles.sectionDesc}>
            选择 JSON 文件导入到当前作品
          </p>
          <div className={styles.importArea}>
            <input
              type="file"
              accept=".json"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            />
            <button className="btn btn-primary btn-sm" onClick={handleImport} disabled={!importFile}>
              导入
            </button>
            {importStatus && (
              <span className={`${styles.importStatus} ${importStatus.includes('成功') ? styles.success : styles.error}`}>
                {importStatus}
              </span>
            )}
          </div>
        </section>

        {/* 预设模板 */}
        <section className={styles.section}>
          <h3>🎨 预设模板</h3>
          <p className={styles.sectionDesc}>
            一键创建包含角色、章节、伏笔、世界观设定的完整作品
          </p>
          <div className={styles.presetGrid}>
            {PRESET_TEMPLATES.map((preset) => (
              <div key={preset.id} className={styles.presetCard}
                onClick={() => { setSelectedPreset(preset); setPresetName(''); }}>
                <div className={styles.presetIcon}>{preset.icon}</div>
                <div className={styles.presetName}>{preset.name}</div>
                <div className={styles.presetDesc}>{preset.description}</div>
                <button className="btn btn-sm" onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPreset(preset);
                  setPresetName(preset.name);
                }}>
                  使用模板
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 预设模板名称输入弹窗 */}
      {selectedPreset && (
        <div className="modal-overlay" onClick={() => setSelectedPreset(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>🎨 使用模板：{selectedPreset.name}</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              {selectedPreset.description}
            </p>
            <div className="form-group">
              <label>作品名称 *</label>
              <input className="input" value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="给你的作品起个名字..."
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleApplyPreset()} />
            </div>
            <div className="form-actions">
              <button className="btn" onClick={() => setSelectedPreset(null)}>取消</button>
              <button className="btn btn-primary" onClick={handleApplyPreset} disabled={!presetName.trim()}>
                创建作品
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
