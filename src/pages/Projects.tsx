/**
 * 项目管理页面
 * 显示所有项目的列表，支持创建和删除项目
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import { useAppStore } from '../store/appStore';
import { useT } from '../i18n';
import type { Project } from '../types';
import { exportProject, downloadJSON, readJSONFile, detectConflicts, executeImport, type ImportConflict } from '../utils/importExport';
import type { ProjectExport } from '../types';
import styles from './Projects.module.css';

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { projects, loading, loadProjects, createProject, deleteProject } = useProjectStore();
  const { setCurrentProject } = useAppStore();
  const { t } = useT();

  // 创建项目模态框
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // 导入相关状态
  const [importConflicts, setImportConflicts] = useState<ImportConflict[]>([]);
  const [importData, setImportData] = useState<ProjectExport | null>(null);
  const [importTargetProjectId, setImportTargetProjectId] = useState<string>('');

  // 页面加载时获取项目列表
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  /** 点击项目卡片 - 进入该项目 */
  const handleEnterProject = (project: Project) => {
    setCurrentProject(project);
    navigate(`/characters`);
  };

  /** 创建项目 */
  const handleCreate = async () => {
    if (!newName.trim()) return;
    const project = await createProject(newName.trim(), newDesc.trim());
    setShowCreate(false);
    setNewName('');
    setNewDesc('');
    // 直接进入新创建的项目
    setCurrentProject(project);
    navigate('/characters');
  };

  /** 删除项目 */
  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(t('project.confirmDelete').replace('{name}', name))) return;
    await deleteProject(id);
  };

  /** 导出项目 */
  const handleExport = async (project: Project) => {
    try {
      const json = await exportProject(project);
      const filename = `${project.name}-${new Date().toISOString().slice(0, 10)}.json`;
      downloadJSON(json, filename);
    } catch (error) {
      console.error('导出失败:', error);
      alert(t('project.exportFailed'));
    }
  };

  /** 导入 JSON 文件 */
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>, project: Project) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await readJSONFile(file);
      const conflicts = await detectConflicts(project.id, data);
      if (conflicts.length > 0) {
        setImportConflicts(conflicts);
        setImportData(data);
        setImportTargetProjectId(project.id);
      } else {
        await executeImport(project.id, data, false);
        alert(t('project.importSuccess'));
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : t('project.importFailed'));
    }
    // 重置文件选择器
    e.target.value = '';
  };

  /** 确认导入（处理冲突） */
  const handleConfirmImport = async (overwrite: boolean) => {
    if (!importData) return;
    try {
      await executeImport(importTargetProjectId, importData, overwrite);
      alert(t('project.importSuccess'));
      setImportConflicts([]);
      setImportData(null);
    } catch (error) {
      alert(t('project.importRetry'));
    }
  };

  /** 格式化日期 */
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className={styles.page}>
      {/* 页面标题 */}
      <div className="page-header">
        <h1>{t('project.title')}</h1>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            {t('project.new')}
          </button>
      </div>

      {/* 项目列表 */}
      {loading ? (
        <div className="loading-spinner">{t('common.loading')}</div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📚</div>
          <p>还没有作品，开始创作你的第一个故事吧</p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            {t('project.createFirst')}
          </button>
        </div>
      ) : (
        <div className={styles.grid}>
          {projects.map((project) => (
            <div key={project.id} className={styles.projectCard}>
              <div className={styles.cardCover}>
                {project.cover ? (
                  <img src={project.cover} alt={project.name} />
                ) : (
                  <div className={styles.coverPlaceholder}>📖</div>
                )}
              </div>
              <div className={styles.cardBody}>
                <h3 className={styles.cardTitle}>{project.name}</h3>
                <p className={styles.cardDesc}>
                  {project.description || t('common.noDescription')}
                </p>
                <div className={styles.cardMeta}>
                  <span>{t('project.updatedAt')}：{formatDate(project.updatedAt)}</span>
                </div>
                <div className={styles.cardActions}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleEnterProject(project)}
                  >
                    {t('project.enter')}
                  </button>
                  <button
                    className="btn btn-sm"
                    onClick={() => handleExport(project)}
                  >
                    {t('common.export')}
                  </button>
                  <label className="btn btn-sm" style={{ cursor: 'pointer' }}>
                    {t('common.import')}
                    <input
                      type="file"
                      accept=".json"
                      style={{ display: 'none' }}
                      onChange={(e) => handleImportFile(e, project)}
                    />
                  </label>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(project.id, project.name)}
                  >
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 创建项目模态框 */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{t('project.createTitle')}</h2>
            <div className="form-group">
              <label>{t('project.name')} *</label>
              <input
                className="input"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t('project.namePlaceholder')}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div className="form-group">
              <label>{t('project.desc')}</label>
              <textarea
                className="textarea"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder={t('project.descPlaceholder')}
                rows={3}
              />
            </div>
            <div className="form-actions">
              <button className="btn" onClick={() => setShowCreate(false)}>{t('common.cancel')}</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={!newName.trim()}>
                {t('common.create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 导入冲突对话框 */}
      {importConflicts.length > 0 && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '550px' }}>
            <h2>{t('project.conflictTitle')}</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              {t('project.conflictDesc').replace('{n}', String(importConflicts.length))}
            </p>
            <div style={{ maxHeight: '200px', overflow: 'auto', marginBottom: '12px' }}>
              {importConflicts.map((c, i) => (
                <div key={i} style={{ fontSize: '13px', padding: '6px 0', color: 'var(--text-secondary)', borderBottom: i < importConflicts.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontWeight: 600 }}>
                    [{c.type === 'character' ? t('nav.characters') : c.type === 'chapter' ? t('nav.chapters') : c.type === 'foreshadow' ? t('nav.foreshadows') : t('nav.worldsettings')}]
                  </span>
                  {' '}
                  {c.existingName && <span style={{ color: 'var(--accent)' }}>{c.existingName}</span>}
                  {c.matchType === 'name' && (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                      {t('project.nameMatch')}
                    </span>
                  )}
                  {c.matchType === 'id' && (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                      ID: {c.existingId.slice(0, 12)}...
                    </span>
                  )}
                </div>
              ))}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              {t('project.conflictHint')}
            </p>
            <div className="form-actions" style={{ borderTop: 'none', paddingTop: 0 }}>
              <button className="btn" onClick={() => setImportConflicts([])}>{t('project.cancelImport')}</button>
              <button className="btn" onClick={() => handleConfirmImport(false)}>{t('project.skipConflicts')}</button>
              <button className="btn btn-primary" onClick={() => handleConfirmImport(true)}>{t('project.overwriteImport')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
