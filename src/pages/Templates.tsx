/**
 * 模板与导入导出中心
 * 各模块导入模板下载 + 完整项目导出 + 数据导入
 */

import { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import {
  getCharacterTemplate, getChapterTemplate, getForeshadowTemplate,
  getWorldSettingTemplate, getOutlineTemplate, downloadTemplateFile, generateFullExport,
} from '../utils/templates';
import { exportProject, downloadJSON, readJSONFile, executeImport } from '../utils/importExport';
import { generateReport } from '../utils/backup';
import { buildExportContext, exportPDF, exportDOCX, exportEPUB } from '../utils/exportFormats';
import { useChapterStore } from '../store/chapterStore';
import { useCharacterStore } from '../store/characterStore';
import { useForeshadowStore } from '../store/foreshadowStore';
import { useWorldSettingStore } from '../store/worldSettingStore';
import styles from './Templates.module.css';

/** 各模块模板配置 */
const MODULE_TEMPLATES = [
  { key: 'character', label: '角色模板', icon: '👤', desc: '导入角色的 JSON 格式模板，含完整字段注释',
    generator: (pid: string) => getCharacterTemplate(pid) },
  { key: 'chapter', label: '章节模板', icon: '📖', desc: '导入章节的 JSON 格式模板，含完整字段注释',
    generator: (pid: string) => getChapterTemplate(pid) },
  { key: 'foreshadow', label: '伏笔模板', icon: '🔮', desc: '导入伏笔的 JSON 格式模板，含完整字段注释',
    generator: (pid: string) => getForeshadowTemplate(pid) },
  { key: 'worldsetting', label: '设定模板', icon: '🌍', desc: '导入世界观设定的 JSON 格式模板，含完整字段注释',
    generator: (pid: string) => getWorldSettingTemplate(pid) },
  { key: 'outline', label: '大纲模板', icon: '📋', desc: '导入大纲节点的 JSON 格式模板，含卷/章/节/场景示例',
    generator: (pid: string) => getOutlineTemplate(pid) },
];

export default function TemplatesPage() {
  const { currentProject } = useAppStore();
  const { chapters, loadChapters } = useChapterStore();
  const { characters, loadCharacters } = useCharacterStore();
  const { foreshadows, loadForeshadows } = useForeshadowStore();
  const { settings, loadSettings } = useWorldSettingStore();

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<string>('');

  // 加载数据
  useEffect(() => {
    if (currentProject) {
      loadChapters(currentProject.id);
      loadCharacters(currentProject.id);
      loadForeshadows(currentProject.id);
      loadSettings(currentProject.id);
    }
  }, [currentProject, loadChapters, loadCharacters, loadForeshadows, loadSettings]);

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

  /** 构建导出上下文 */
  const getExportCtx = () => {
    if (!currentProject) return null;
    return buildExportContext(currentProject.name, chapters, characters, foreshadows, settings);
  };

  /** 导出 PDF */
  const handleExportPDF = async () => {
    const ctx = getExportCtx();
    if (!ctx) return;
    await exportPDF(ctx);
  };

  /** 导出 DOCX */
  const handleExportDOCX = async () => {
    const ctx = getExportCtx();
    if (!ctx) return;
    await exportDOCX(ctx);
  };

  /** 导出 EPUB */
  const handleExportEPUB = () => {
    const ctx = getExportCtx();
    if (!ctx) return;
    exportEPUB(ctx);
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

  /** 导入 JSON（默认覆盖更新） */
  const handleImport = async () => {
    if (!importFile || !currentProject) return;
    setImportStatus('正在导入...');
    try {
      const data = await readJSONFile(importFile);
      await executeImport(currentProject.id, data, true);
      setImportStatus('导入成功！');
      setImportFile(null);
    } catch (error) {
      setImportStatus(error instanceof Error ? error.message : '导入失败');
    }
  };

  if (!currentProject) {
    return (
      <div className={styles.page}>
        <div className="page-header"><h1>模板与导入导出</h1></div>
        <div className="empty-state"><div className="icon">📦</div><p>请先选择或创建一个作品</p></div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className="page-header"><h1>模板与导入导出</h1></div>

      <div className={styles.grid}>
        {/* 各模块导入模板 */}
        <section className={styles.section}>
          <h3>📥 导入模板下载</h3>
          <p className={styles.sectionDesc}>
            下载标准 JSON 模板，文件内含详细字段注释。填入数据后通过下方「数据导入」批量导入。
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
                <button className="btn btn-sm" onClick={() => handleDownloadTemplate(tpl.key)}>下载模板</button>
              </div>
            ))}
          </div>
        </section>

        {/* 完整导出 */}
        <section className={styles.section}>
          <h3>📤 项目导出</h3>
          <p className={styles.sectionDesc}>导出当前作品的完整数据</p>
          <div className={styles.exportActions}>
            <button className="btn btn-primary" onClick={handleFullExport}>📦 完整设定导出</button>
            <button className="btn" onClick={handleExportJSON}>📄 JSON 格式</button>
            <button className="btn" onClick={handleExportReport}>📊 创作报告</button>
          </div>
        </section>

        {/* 格式导出 */}
        <section className={styles.section}>
          <h3>📚 格式导出</h3>
          <p className={styles.sectionDesc}>导出小说正文为常用格式（按章节顺序合并）</p>
          <div className={styles.exportActions}>
            <button className="btn" onClick={handleExportPDF}>📕 PDF 导出</button>
            <button className="btn" onClick={handleExportDOCX}>📘 DOCX 导出</button>
            <button className="btn" onClick={handleExportEPUB}>📗 EPUB/HTML 导出</button>
          </div>
        </section>

        {/* 导入区域 */}
        <section className={styles.section}>
          <h3>📥 数据导入</h3>
          <p className={styles.sectionDesc}>选择 JSON 文件导入到当前作品</p>
          <div className={styles.importArea}>
            <input type="file" accept=".json" onChange={(e) => setImportFile(e.target.files?.[0] || null)} />
            <button className="btn btn-primary btn-sm" onClick={handleImport} disabled={!importFile}>导入</button>
            {importStatus && (
              <span className={`${styles.importStatus} ${importStatus.includes('成功') ? styles.success : styles.error}`}>
                {importStatus}
              </span>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
