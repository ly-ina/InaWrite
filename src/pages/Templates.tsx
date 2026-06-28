/**
 * 模板与导入导出中心
 * 各模块导入模板下载 + 完整项目导出 + 数据导入
 */

import { useState, useEffect, useCallback } from 'react';
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
import { nativeDownload } from '../utils/templates';
import styles from './Templates.module.css';

/** 已下载文件信息 */
interface DownloadedFile {
  name: string;
  path: string;
  size: number;
  time: string;
}

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

  // 已下载文件管理
  const [downloadedFiles, setDownloadedFiles] = useState<DownloadedFile[]>([]);
  const [showFiles, setShowFiles] = useState(true);

  /** 扫描 Cache 目录中的已下载文件 */
  const scanDownloads = useCallback(async () => {
    const isNative = !!(window as any).Capacitor?.isNativePlatform?.();
    if (!isNative) {
      console.log('[文件管理] 非原生环境，跳过扫描');
      return;
    }
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');

      const result = await Filesystem.readdir({
        path: '',
        directory: Directory.Cache,
      });
      // 只显示 .json 文件
      const jsonFiles = (result.files || []).filter((f: any) => f.name.endsWith('.json'));
      console.log('[文件管理] 扫描结果:', jsonFiles);
      const files: DownloadedFile[] = jsonFiles.map((f: any) => ({
        name: f.name,
        path: f.uri,
        size: f.size || 0,
        time: f.mtime ? new Date(f.mtime * 1000).toLocaleString() : '',
      }));
      setDownloadedFiles(files);
    } catch (err: any) {
      console.error('[文件管理] 扫描失败:', err);
      // 目录不存在时不报错，显示空列表
      setDownloadedFiles([]);
    }
  }, []);

  /** 删除文件（从 Cache 目录） */
  const deleteDownloaded = async (filename: string) => {
    const isNative = !!(window as any).Capacitor?.isNativePlatform?.();
    if (!isNative) {
      alert('请在移动端应用中管理文件');
      return;
    }
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      await Filesystem.deleteFile({
        path: filename,
        directory: Directory.Cache,
      });
      await scanDownloads();
    } catch {
      alert('删除失败');
    }
  };

  /** 打开/分享已下载的文件 */
  const openDownloadedFile = async (filename: string) => {
    const isNative = !!(window as any).Capacitor?.isNativePlatform?.();
    if (!isNative) return;

    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');
      const stat = await Filesystem.stat({
        path: filename,
        directory: Directory.Cache,
      });
      await Share.share({
        title: filename,
        url: stat.uri,
        dialogTitle: '选择打开方式',
      });
    } catch {
      // 用户取消分享或失败，静默忽略
    }
  };

  // 加载数据 + 扫描已下载文件
  useEffect(() => {
    if (currentProject) {
      loadChapters(currentProject.id);
      loadCharacters(currentProject.id);
      loadForeshadows(currentProject.id);
      loadSettings(currentProject.id);
      scanDownloads();
    }
  }, [currentProject, loadChapters, loadCharacters, loadForeshadows, loadSettings, scanDownloads]);

  /** 下载模板 */
  const handleDownloadTemplate = async (key: string) => {
    if (!currentProject) return;
    const tpl = MODULE_TEMPLATES.find((t) => t.key === key);
    if (!tpl) return;
    const data = tpl.generator(currentProject.id);
    const result = await downloadTemplateFile(data, `${key}-template.json`);
    if (result.ok) {
      alert(`✅ ${tpl.label} 已保存`);
      setTimeout(() => scanDownloads(), 300);
    } else {
      alert(`❌ 保存失败: ${result.error}`);
    }
  };

  /** 导出完整项目 */
  const handleFullExport = async () => {
    if (!currentProject) return;
    const data = await generateFullExport(currentProject);
    const result = await downloadTemplateFile(data, `${currentProject.name}-完整设定.json`);
    if (result.ok) {
      alert('✅ 完整设定已保存');
      setTimeout(() => scanDownloads(), 300);
    } else {
      alert(`❌ 保存失败: ${result.error}`);
    }
  };

  /** 导出 JSON 格式 */
  const handleExportJSON = async () => {
    if (!currentProject) return;
    const json = await exportProject(currentProject);
    const blob = new Blob([json], { type: 'application/json' });
    await nativeDownload(blob, `${currentProject.name}-${new Date().toISOString().slice(0, 10)}.json`);
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
    const blob = await exportPDF(ctx);
    await nativeDownload(blob, `${ctx.projectName}.pdf`);
  };

  /** 导出 DOCX */
  const handleExportDOCX = async () => {
    const ctx = getExportCtx();
    if (!ctx) return;
    const blob = await exportDOCX(ctx);
    await nativeDownload(blob, `${ctx.projectName}.docx`);
  };

  /** 导出 EPUB/HTML */
  const handleExportEPUB = async () => {
    const ctx = getExportCtx();
    if (!ctx) return;
    const blob = exportEPUB(ctx);
    await nativeDownload(blob, `${ctx.projectName}.html`);
    alert('已导出为 HTML 文件（EPUB 简易版）。\n如需标准 EPUB，请用 Calibre 等工具将 HTML 转换为 EPUB。');
  };

  /** 导出创作报告 */
  const handleExportReport = async () => {
    if (!currentProject) return;
    const data = await generateFullExport(currentProject);
    const report = generateReport(data);
    const blob = new Blob([report], { type: 'text/markdown;charset=utf-8' });
    await nativeDownload(blob, `${currentProject.name}-创作报告.md`);
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ margin: 0 }}>📥 导入模板下载</h3>
            <button
              className="btn btn-sm"
              onClick={() => { setShowFiles(!showFiles); if (!showFiles) scanDownloads(); }}
            >
              📁 已下载文件 {downloadedFiles.length > 0 ? `(${downloadedFiles.length})` : ''}
            </button>
          </div>
          {showFiles && (
            <div className={styles.fileManager} style={{ marginBottom: '12px' }}>
              {downloadedFiles.length === 0 ? (
                <div className={styles.fileEmpty}>暂无已下载的模板文件</div>
              ) : (
                <div className={styles.fileList}>
                  {downloadedFiles.map((f) => (
                    <div key={f.name} className={styles.fileItem}>
                      <span className={styles.fileIcon}>📄</span>
                      <div
                        className={styles.fileInfo}
                        style={{ cursor: 'pointer', flex: 1 }}
                        onClick={() => openDownloadedFile(f.name)}
                        title="点击查看/分享文件"
                      >
                        <span className={styles.fileName}>{f.name}</span>
                        <span className={styles.fileMeta}>{(f.size / 1024).toFixed(1)} KB{f.time ? ` · ${f.time}` : ''}</span>
                      </div>
                      <button className="btn btn-sm btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => deleteDownloaded(f.name)}>🗑</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
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
