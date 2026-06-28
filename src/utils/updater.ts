/**
 * OTA 更新检测与安装
 * 区分 PC（Electron）和 Android（Capacitor）平台
 * - Android: 从 GitHub Release 下载 APK，用原生安装器覆盖安装
 * - PC: 从 GitHub Release 下载 EXE，提示用户手动替换
 */

/** 当前版本号（与 build.gradle 中的 versionCode 保持一致） */
const CURRENT_VERSION_CODE = 5;
const CURRENT_VERSION_NAME = '1.3';

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
  if (platform === 'web') return null; // 浏览器环境跳过

  try {
    const resp = await fetch(GITHUB_API);
    if (!resp.ok) return null;
    const data = await resp.json();

    const body = data.body || '';

    // 从 Release body 中提取 versionCode
    const vcMatch = body.match(/versionCode[=:]\s*(\d+)/i);
    const releaseVersionCode = vcMatch ? parseInt(vcMatch[1]) : 0;

    if (releaseVersionCode <= CURRENT_VERSION_CODE) {
      return null; // 没有新版本
    }

    // 根据平台找对应的产物
    const assets: { name: string; browser_download_url: string; size: number }[] = data.assets || [];

    let asset;
    if (platform === 'android') {
      // 找 .apk 文件
      asset = assets.find((a: any) => a.name?.endsWith('.apk'));
    } else {
      // PC 端：找 .exe 文件（非 installer 的）
      asset = assets.find((a: any) => a.name?.toLowerCase().includes('inakb') && a.name?.endsWith('.exe'));
    }

    if (!asset) {
      console.log(`[OTA] 未找到 ${platform} 平台的产物`);
      return null;
    }

    return {
      version: data.tag_name || data.name || `v${releaseVersionCode}`,
      versionCode: releaseVersionCode,
      downloadUrl: asset.browser_download_url,
      fileSize: asset.size || 0,
      changelog: body.slice(0, 500),
      fileExt: platform === 'android' ? '.apk' : '.exe',
    };
  } catch {
    return null;
  }
}

/** 下载更新文件到本地 */
export async function downloadUpdate(
  url: string,
  filename: string,
  onProgress?: (pct: number) => void
): Promise<{ uri: string; platform: string }> {
  const platform = getPlatform();

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`下载失败: ${resp.status}`);

  const contentLength = resp.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength) : 0;

  const reader = resp.body?.getReader();
  if (!reader) throw new Error('无法读取响应流');

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

  // 合并为 Uint8Array
  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  if (platform === 'android') {
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
  } else {
    // PC: 写入到下载目录，提示用户手动替换
    // Electron 无法自更新，只能下载到用户指定位置
    const blob = new Blob([merged], { type: 'application/octet-stream' });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);

    return { uri: downloadUrl, platform: 'pc' };
  }
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
