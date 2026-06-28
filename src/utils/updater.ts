/**
 * OTA 更新检测与安装
 * 区分 PC（Electron）和 Android（Capacitor）平台
 * - Android: 从 GitHub Release 下载 APK，用原生安装器覆盖安装
 * - PC: 从 GitHub Release 下载 EXE，提示用户手动替换
 */

/** 当前版本号（与 build.gradle 中的 versionCode 保持一致） */
const CURRENT_VERSION_CODE = 7;
const CURRENT_VERSION_NAME = '1.6';

/** GitHub Releases API */
const GITHUB_API = 'https://api.github.com/repos/ly-ina/InaWrite/releases/latest';

/** 当前平台 */
function getPlatform(): 'android' | 'pc' | 'web' {
  if (!!(window as any).Capacitor?.isNativePlatform?.()) return 'android';
  if (!!(window as any).electronAPI) return 'pc';
  return 'web';
}

interface ReleaseInfo {
  version: string;
  versionCode: number;
  downloadUrl: string;
  fileSize: number;
  changelog: string;
  /** 目标文件扩展名 */
  fileExt: string;
}

/** 检查是否有新版本 */
export async function checkForUpdate(): Promise<ReleaseInfo | null> {
  const platform = getPlatform();
  if (platform === 'web') return null;

  try {
    let data: any;

    if (platform === 'pc') {
      // PC 端：优先尝试直接 fetch（api.github.com 有 CORS 头，file:// 也可能通过）
      // 如果 fetch 失败，回退到主进程 IPC
      let fetchOk = false;
      for (const apiUrl of [
        GITHUB_API,
        'https://gh-proxy.com/' + GITHUB_API.replace('https://', ''),
      ]) {
        try {
          const r = await fetch(apiUrl);
          if (r.ok) { data = await r.json(); fetchOk = true; console.log('[OTA] 直连 fetch 成功'); break; }
        } catch { /* 继续 */ }
      }

      if (!fetchOk) {
        console.log('[OTA] fetch 失败，回退到主进程 IPC');
        const api = (window as any).electronAPI;
        if (!api?.otaCheckUpdate) {
          console.warn('[OTA] electronAPI.otaCheckUpdate 不可用');
          return null;
        }
        const result = await api.otaCheckUpdate();
        if (!result?.success) {
          console.warn('[OTA] 主进程检测失败:', result?.error);
          return null;
        }
        data = result.data;
      }
    } else {
      // Android：直接 fetch（WebView 中 api.github.com 有 CORS 头）
      let resp: Response | null = null;
      for (const apiUrl of [
        GITHUB_API,
        'https://gh-proxy.com/' + GITHUB_API.replace('https://', ''),
        'https://gh.llkk.cc/' + GITHUB_API.replace('https://', ''),
      ]) {
        try {
          const r = await fetch(apiUrl);
          if (r.ok) { resp = r; break; }
        } catch { /* 继续尝试下一个 */ }
      }
      if (!resp) return null;
      data = await resp.json();
    }

    const body = data.body || '';

    // 从 Release body 中提取 versionCode
    const vcMatch = body.match(/versionCode[=:]\s*(\d+)/i);
    const releaseVersionCode = vcMatch ? parseInt(vcMatch[1]) : 0;

    if (releaseVersionCode <= CURRENT_VERSION_CODE) {
      return null; // 没有新版本
    }

    // 根据平台找对应的产物
    const assets: { name: string; browser_download_url: string; size: number }[] = data.assets || [];

    let downloadUrl: string;
    let fileExt: string;

    if (platform === 'android') {
      const asset = assets.find((a: any) => a.name?.endsWith('.apk'));
      if (!asset) { console.log('[OTA] 未找到 Android APK 产物'); return null; }
      downloadUrl = asset.browser_download_url;
      fileExt = '.apk';
    } else {
      // PC 端：不下载大文件，直接打开 Release 页面让用户手动下载
      downloadUrl = data.html_url || `https://github.com/ly-ina/InaWrite/releases/tag/${data.tag_name}`;
      fileExt = '.exe';
    }

    return {
      version: data.tag_name || data.name || `v${releaseVersionCode}`,
      versionCode: releaseVersionCode,
      downloadUrl,
      fileSize: platform === 'android' ? (assets.find((a: any) => a.name?.endsWith('.apk'))?.size || 0) : 0,
      changelog: body.slice(0, 500),
      fileExt,
    };
  } catch {
    return null;
  }
}

/**
 * GitHub 下载代理镜像列表（按优先级排列）
 * 国内直连 GitHub Releases 可能失败，自动尝试镜像加速
 */
const DOWNLOAD_MIRRORS = [
  '', // 首先尝试直连
  'https://gh-proxy.com/',
  'https://gh.llkk.cc/',
  'https://github.moeyy.xyz/',
];

/** 尝试从多个镜像下载 */
async function fetchWithMirrors(
  url: string,
  onProgress?: (pct: number) => void,
): Promise<{ resp: Response; mirror: string }> {
  // 提取 GitHub URL 的相对路径部分
  const githubPrefix = 'https://github.com/';
  let relativePath = '';
  if (url.startsWith(githubPrefix)) {
    relativePath = url.slice(githubPrefix.length);
  }

  let lastError: Error | null = null;

  for (const mirror of DOWNLOAD_MIRRORS) {
    try {
      const fetchUrl = mirror ? `${mirror}${relativePath}` : url;
      console.log(`[OTA] 尝试下载: ${fetchUrl}`);

      const resp = await fetch(fetchUrl, {
        // 设置超时（部分环境支持 AbortSignal.timeout）
        signal: (AbortSignal as any).timeout ? (AbortSignal as any).timeout(30000) : undefined,
      });

      if (!resp.ok) {
        console.warn(`[OTA] 镜像 ${mirror || '直连'} 返回 ${resp.status}`);
        continue;
      }

      console.log(`[OTA] 下载成功，使用: ${mirror || '直连'}`);
      return { resp, mirror };
    } catch (err: any) {
      lastError = err;
      console.warn(`[OTA] 镜像 ${mirror || '直连'} 失败:`, err.message);
    }
  }

  throw new Error(lastError?.message || '所有下载源均失败，请检查网络连接');
}

/** 下载更新文件到本地 */
export async function downloadUpdate(
  url: string,
  filename: string,
  onProgress?: (pct: number) => void
): Promise<{ uri: string; platform: string }> {
  const platform = getPlatform();

  if (platform === 'pc') {
    // PC 端：通过 Electron 主进程下载（Node.js 不受 CORS 限制）
    const api = (window as any).electronAPI;
    if (!api?.otaDownload) {
      throw new Error('electronAPI.otaDownload 不可用');
    }
    // 保存到用户下载目录
    const savePath = `${(window as any).electronAPI?.getAppInfo ? 
      (await (window as any).electronAPI.getAppInfo()).userDataPath : 
      ''}/downloads/${filename}`;

    const result = await api.otaDownload(url, savePath);
    if (!result?.success) {
      throw new Error(result?.error || '主进程下载失败');
    }
    if (onProgress) onProgress(100);
    return { uri: savePath, platform: 'pc' };
  }

  // Android：前端 fetch 下载
  let merged: Uint8Array;

  try {
    const { resp } = await fetchWithMirrors(url, onProgress);

    if (resp.body?.getReader) {
      const contentLength = resp.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength) : 0;

      const reader = resp.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (total > 0 && onProgress) {
          onProgress(Math.round((received / total) * 100));
        }
      }

      const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
      merged = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
    } else {
      console.log('[OTA] 流式读取不可用，使用 arrayBuffer');
      const buf = await resp.arrayBuffer();
      merged = new Uint8Array(buf);
      if (onProgress) onProgress(100);
    }
  } catch (err: any) {
    console.warn('[OTA] fetch 流式下载失败:', err.message, '，回退到 XHR');
    merged = await downloadWithXHR(url, onProgress);
  }

  // Android: 写入 Cache 目录，用原生安装器打开
  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  let binary = '';
  for (let i = 0; i < merged.length; i++) {
    binary += String.fromCharCode(merged[i]);
  }
  const base64 = btoa(binary);

  const result = await Filesystem.writeFile({
    path: filename,
    data: base64,
    directory: Directory.Cache,
  });

  return { uri: result.uri, platform: 'android' };
}

/** 用 XMLHttpRequest 下载（不依赖 ReadableStream，兼容旧版 WebView） */
function downloadWithXHR(
  url: string,
  onProgress?: (pct: number) => void
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    // 尝试镜像 URL
    const githubPrefix = 'https://github.com/';
    let xhrUrl = url;
    if (url.startsWith(githubPrefix)) {
      const relativePath = url.slice(githubPrefix.length);
      xhrUrl = `https://gh-proxy.com/${relativePath}`;
    }

    const xhr = new XMLHttpRequest();
    xhr.open('GET', xhrUrl, true);
    xhr.responseType = 'arraybuffer';

    xhr.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(new Uint8Array(xhr.response));
      } else {
        reject(new Error(`XHR 下载失败: ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('XHR 网络错误'));
    xhr.ontimeout = () => reject(new Error('XHR 下载超时'));
    xhr.timeout = 120000; // 2 分钟超时

    xhr.send();
  });
}

/** Android: 调用原生安装器安装 APK */
export function installApk(uri: string): void {
  const bridge = (window as any).AndroidUpdateInstaller;
  if (bridge && bridge.installApk) {
    const filePath = uri.startsWith('file://') ? uri.slice(7) : uri;
    bridge.installApk(filePath);
  } else {
    alert('无法调用系统安装器，请手动安装 APK 文件');
  }
}

/** 获取当前版本信息 */
export function getCurrentVersion(): { versionCode: number; versionName: string; platform: string } {
  return { versionCode: CURRENT_VERSION_CODE, versionName: CURRENT_VERSION_NAME, platform: getPlatform() };
}
