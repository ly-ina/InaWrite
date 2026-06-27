/**
 * 数据同步工具
 * 支持 WebDAV 和 GitHub Gist 同步
 * 提供通用同步接口，便于扩展
 */

import type { ProjectExport } from '../types';
import { generateFullExport } from './templates';
import { executeImport } from './importExport';
import { db } from '../db/database';

/** 同步提供者类型 */
export type SyncProvider = 'webdav' | 'gist' | 'custom';

/** 同步配置 */
export interface SyncConfig {
  provider: SyncProvider;
  // WebDAV
  webdavUrl?: string;
  webdavUser?: string;
  webdavPass?: string;
  // Gist
  gistToken?: string;
  gistId?: string;
  // 通用
  autoSync: boolean;
  syncInterval: number; // 分钟
  lastSync: string | null;
}

/** 同步结果 */
export interface SyncResult {
  success: boolean;
  message: string;
  timestamp: string;
  uploaded?: boolean;
  downloaded?: boolean;
}

/** 获取同步配置 */
export function getSyncConfig(): SyncConfig {
  try {
    const raw = localStorage.getItem('novelkb_sync_config');
    return raw ? JSON.parse(raw) : { provider: 'custom', autoSync: false, syncInterval: 30, lastSync: null };
  } catch {
    return { provider: 'custom', autoSync: false, syncInterval: 30, lastSync: null };
  }
}

/** 保存同步配置 */
export function saveSyncConfig(config: SyncConfig): void {
  localStorage.setItem('novelkb_sync_config', JSON.stringify(config));
}

/**
 * 上传到 WebDAV
 */
export async function uploadToWebDAV(
  data: ProjectExport,
  config: SyncConfig
): Promise<SyncResult> {
  if (!config.webdavUrl) {
    return { success: false, message: 'WebDAV 地址未配置', timestamp: new Date().toISOString() };
  }

  try {
    const filename = `${data.project.name}-${new Date().toISOString().slice(0, 10)}.json`;
    const url = `${config.webdavUrl.replace(/\/$/, '')}/${encodeURIComponent(filename)}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (config.webdavUser && config.webdavPass) {
      headers['Authorization'] = 'Basic ' + btoa(`${config.webdavUser}:${config.webdavPass}`);
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data, null, 2),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    return { success: true, message: '同步成功', timestamp: new Date().toISOString(), uploaded: true };
  } catch (error) {
    return { success: false, message: `同步失败: ${(error as Error).message}`, timestamp: new Date().toISOString() };
  }
}

/**
 * 从 WebDAV 下载
 */
export async function downloadFromWebDAV(config: SyncConfig): Promise<ProjectExport | null> {
  if (!config.webdavUrl) return null;

  try {
    const headers: Record<string, string> = {};
    if (config.webdavUser && config.webdavPass) {
      headers['Authorization'] = 'Basic ' + btoa(`${config.webdavUser}:${config.webdavPass}`);
    }

    // 列出文件
    const listResp = await fetch(config.webdavUrl, { method: 'PROPFIND', headers });
    if (!listResp.ok) throw new Error('无法访问 WebDAV');

    const text = await listResp.text();
    // 简单解析找到最新的 JSON 文件
    const match = text.match(/href[^>]*\.json/gi);
    if (!match) return null;

    const latestFile = match[match.length - 1].replace(/href[^"]*"([^"]+)"/i, '$1');
    const downloadUrl = `${config.webdavUrl.replace(/\/$/, '')}/${latestFile}`;

    const resp = await fetch(downloadUrl, { headers });
    if (!resp.ok) throw new Error('下载失败');

    const data = await resp.json() as ProjectExport;
    return data;
  } catch {
    return null;
  }
}

/**
 * 上传到 GitHub Gist
 */
export async function uploadToGist(
  data: ProjectExport,
  config: SyncConfig
): Promise<SyncResult> {
  if (!config.gistToken) {
    return { success: false, message: 'Gist Token 未配置', timestamp: new Date().toISOString() };
  }

  try {
    const filename = `${data.project.name}.json`;
    const body: Record<string, unknown> = {
      description: `Novel InaKB: ${data.project.name}`,
      public: false,
      files: {
        [filename]: {
          content: JSON.stringify(data, null, 2),
        },
      },
    };

    let url = 'https://api.github.com/gists';
    let method = 'POST';
    if (config.gistId) {
      url += `/${config.gistId}`;
      method = 'PATCH';
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `token ${config.gistToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const result = await response.json() as { id: string };
    if (result.id && !config.gistId) {
      config.gistId = result.id;
      saveSyncConfig(config);
    }

    return { success: true, message: 'Gist 同步成功', timestamp: new Date().toISOString(), uploaded: true };
  } catch (error) {
    return { success: false, message: `Gist 同步失败: ${(error as Error).message}`, timestamp: new Date().toISOString() };
  }
}

/**
 * 从 GitHub Gist 下载
 */
export async function downloadFromGist(config: SyncConfig): Promise<ProjectExport | null> {
  if (!config.gistToken || !config.gistId) return null;

  try {
    const response = await fetch(`https://api.github.com/gists/${config.gistId}`, {
      headers: { 'Authorization': `token ${config.gistToken}` },
    });

    if (!response.ok) return null;
    const gist = await response.json() as { files: Record<string, { content: string }> };

    // 找到第一个 JSON 文件
    for (const [_, file] of Object.entries(gist.files)) {
      if (file.content) {
        return JSON.parse(file.content) as ProjectExport;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 执行同步（上传 + 下载）
 */
export async function performSync(projectId: string): Promise<SyncResult> {
  const config = getSyncConfig();
  const project = await db.projects.getById(projectId);
  if (!project) return { success: false, message: '项目不存在', timestamp: new Date().toISOString() };

  const exportData = await generateFullExport(project);
  let result: SyncResult;

  switch (config.provider) {
    case 'webdav':
      result = await uploadToWebDAV(exportData, config);
      break;
    case 'gist':
      result = await uploadToGist(exportData, config);
      break;
    default:
      // 自定义：保存到 localStorage
      try {
        localStorage.setItem(`novelkb_sync_${projectId}`, JSON.stringify(exportData));
        result = { success: true, message: '本地同步成功', timestamp: new Date().toISOString(), uploaded: true };
      } catch {
        result = { success: false, message: '本地同步失败', timestamp: new Date().toISOString() };
      }
  }

  // 更新最后同步时间
  if (result.success) {
    config.lastSync = new Date().toISOString();
    saveSyncConfig(config);
  }

  return result;
}
