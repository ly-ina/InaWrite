/**
 * 项目管理页面
 * 显示所有项目的列表，支持创建和删除项目
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import { useAppStore } from '../store/appStore';
import type { Project } from '../types';
import { exportProject, downloadJSON, readJSONFile, detectConflicts, executeImport, type ImportConflict } from '../utils/importExport';
import type { ProjectExport } from '../types';
import styles from './Projects.module.css';

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { projects, loading, loadProjects, createProject, deleteProject } = useProjectStore();
  const { setCurrentProject } = useAppStore();

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
    if (!window.confirm(`确定要删除「${name}」吗？此操作不可恢复，会同时删除该作品下的所有角色、章节和伏笔数据。`)) return;
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
      alert('导出失败，请重试');
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
        alert('导入成功！');
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : '导入失败');
    }
    // 重置文件选择器
    e.target.value = '';
  };

  /** 确认导入（处理冲突） */
  const handleConfirmImport = async (overwrite: boolean) => {
    if (!importData) return;
    try {
      await executeImport(importTargetProjectId, importData, overwrite);
      alert('导入成功！');
      setImportConflicts([]);
      setImportData(null);
    } catch (error) {
      alert('导入失败，请重试');
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
        <h1>我的作品</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + 新建作品
        </button>
      </div>

      {/* 项目列表 */}
      {loading ? (
        <div className="loading-spinner">加载中...</div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📚</div>
          <p>还没有作品，开始创作你的第一个故事吧</p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + 新建作品
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
                  {project.description || '暂无简介'}
                </p>
                <div className={styles.cardMeta}>
                  <span>最后编辑：{formatDate(project.updatedAt)}</span>
                </div>
                <div className={styles.cardActions}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleEnterProject(project)}
                  >
                    进入
                  </button>
                  <button
                    className="btn btn-sm"
                    onClick={() => handleExport(project)}
                  >
                    导出
                  </button>
                  <label className="btn btn-sm" style={{ cursor: 'pointer' }}>
                    导入
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
                    删除
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
            <h2>新建作品</h2>
            <div className="form-group">
              <label>作品名称 *</label>
              <input
                className="input"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="输入作品名称..."
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div className="form-group">
              <label>简介</label>
              <textarea
                className="textarea"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="简单描述一下这个故事..."
                rows={3}
              />
            </div>
            <div className="form-actions">
              <button className="btn" onClick={() => setShowCreate(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={!newName.trim()}>
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 导入冲突对话框 */}
      {importConflicts.length > 0 && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '500px' }}>
            <h2>检测到数据冲突</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              以下 {importConflicts.length} 条数据 ID 与现有数据重复：
            </p>
            <div style={{ maxHeight: '200px', overflow: 'auto', marginBottom: '12px' }}>
              {importConflicts.map((c, i) => (
                <div key={i} style={{ fontSize: '13px', padding: '4px 0', color: 'var(--text-secondary)' }}>
                  [{c.type}] ID: {c.existingId}
                </div>
              ))}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              选择「覆盖」将用导入数据替换现有数据，选择「跳过」将只添加不冲突的数据。
            </p>
            <div className="form-actions" style={{ borderTop: 'none', paddingTop: 0 }}>
              <button className="btn" onClick={() => setImportConflicts([])}>取消导入</button>
              <button className="btn" onClick={() => handleConfirmImport(false)}>跳过冲突</button>
              <button className="btn btn-primary" onClick={() => handleConfirmImport(true)}>覆盖导入</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
