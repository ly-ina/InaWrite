/**
 * 导入模板生成器
 * 每个模块提供精简模板：空值占位 + 注释标注字段含义
 */

import type {
  Project, Character, Chapter, Foreshadow, WorldSetting, OutlineNode,
  ProjectExport
} from '../types';
import { generateId } from '../types';

// ========== 各模块导入模板（精简版 + 注释） ==========

/**
 * 角色导入模板
 *
 * 字段说明：
 *   name          - 角色名（必填）
 *   aliases       - 别名/绰号列表
 *   race          - 种族（如：人类、精灵、魔族）
 *   age           - 年龄（自由文本，如：25岁 / 未知）
 *   appearance    - 外貌描述（Markdown）
 *   personality   - 性格描述（Markdown）
 *   description   - 背景故事（Markdown）
 *   status        - 状态：alive=存活 / dead=死亡 / unknown=未知 / mentioned=提及
 *   currentLocation - 当前所在地点（自由文本或地点 ID）
 *   arc           - 角色弧光（Markdown），描述角色成长轨迹
 *   secret        - 秘密（Markdown），仅作者可见的隐藏信息
 *   voice         - 语言风格提示，如"说话带东北口音"
 *   relations     - 关系列表
 *     targetId    - 关联角色 ID
 *     type        - 关系类型（家人/朋友/恋人/敌人/对手/师徒/上下级/盟友/陌生人/其他）
 *     direction   - 方向：单向=→ / 双向=↔
 *     description - 关系描述
 *     isPublic    - 是否公开（false=秘密关系仅作者可见）
 *   resources     - 资源/能力列表
 *     id          - 自动生成
 *     name        - 名称
 *     type        - 类型：能力/物品/代价/其他
 *     description - 描述
 *     status      - 状态：未获得/已获得/已消耗/进行中
 *     obtainedAt  - 获取时间/章节（可选）
 *     cost        - 代价（可选）
 *   appearances   - 出场章节 ID 列表
 */
export function getCharacterTemplate(projectId: string): Character[] {
  return [{
    id: '<自动生成>',               // 留空或填已有 ID 以覆盖，不填则自动生成
    projectId: '<自动填充>',         // 导入时自动替换为当前作品 ID
    name: '',                       // 【必填】角色名
    aliases: [],                    // 别名列表，如 ["绰号1", "绰号2"]
    race: '',                       // 种族，如 "人类"
    age: '',                        // 年龄，如 "25岁"
    appearance: '',                 // 外貌描述（支持 Markdown）
    personality: '',                // 性格描述（支持 Markdown）
    description: '',                // 背景故事（支持 Markdown）
    status: 'alive',                // alive=存活 | dead=死亡 | unknown=未知 | mentioned=提及
    currentLocation: '',            // 当前所在地点
    arc: '',                        // 角色弧光，如 "从逃避→接受→超越"
    secret: '',                     // 秘密（仅作者可见）
    voice: '',                      // 语言风格，如 "说话直率带口音"
    relations: [
      {
        targetId: '',               // 关联角色 ID
        type: '朋友',               // 家人/朋友/恋人/敌人/对手/师徒/上下级/盟友/陌生人/其他
        direction: '双向',          // 单向=→ | 双向=↔
        description: '',            // 关系描述（可选）
        isPublic: true,             // 公开=true | 秘密=false
      },
    ],
    resources: [
      {
        id: '<自动生成>',
        name: '',                   // 名称
        type: '能力',               // 能力/物品/代价/其他
        description: '',            // 描述
        status: '已获得',           // 未获得/已获得/已消耗/进行中
        obtainedAt: '',             // 获取时间/章节（可选）
        cost: '',                   // 使用代价（可选）
      },
    ],
    appearances: [],                // 出场章节 ID 列表
  }];
}

/**
 * 章节导入模板
 *
 * 字段说明：
 *   number        - 章节序号
 *   title         - 章节标题
 *   wordCount     - 字数
 *   status        - 状态：draft=草稿 / revising=修订中 / done=已完成
 *   summary       - 内容摘要
 *   keyEvents     - 关键事件列表
 *   characters    - 出场角色 ID 列表
 *   foreshadowsAdded    - 本章新增的伏笔 ID 列表
 *   foreshadowsResolved - 本章回收的伏笔 ID 列表
 *   locations     - 地点 ID 列表
 */
export function getChapterTemplate(projectId: string): Chapter[] {
  return [{
    id: '<自动生成>',
    projectId: '<自动填充>',
    number: 1,                      // 章节序号
    title: '',                      // 【必填】章节标题
    wordCount: 0,                   // 字数（可选）
    status: 'draft',                // draft=草稿 | revising=修订中 | done=已完成
    summary: '',                    // 内容摘要（可选）
    keyEvents: [''],                // 关键事件列表
    characters: [''],               // 出场角色 ID 列表
    foreshadowsAdded: [''],         // 新增伏笔 ID 列表
    foreshadowsResolved: [''],      // 回收伏笔 ID 列表
    locations: [''],                // 地点 ID 列表
  }];
}

/**
 * 伏笔导入模板
 *
 * 字段说明：
 *   content              - 伏笔内容描述
 *   firstAppearance      - 首次出现的章节 ID
 *   status               - 状态：pending=未触发 / active=进行中 / resolved=已回收 / abandoned=已放弃
 *   relatedCharacters    - 相关角色 ID 列表
 *   expectedResolution   - 预计回收章节 ID
 *   notes                - 补充说明
 */
export function getForeshadowTemplate(projectId: string): Foreshadow[] {
  return [{
    id: '<自动生成>',
    projectId: '<自动填充>',
    content: '',                    // 【必填】伏笔内容
    firstAppearance: '',            // 首次出现章节 ID
    status: 'pending',              // pending=未触发 | active=进行中 | resolved=已回收 | abandoned=已放弃
    relatedCharacters: [''],        // 相关角色 ID 列表
    expectedResolution: '',         // 预计回收章节 ID（可选）
    notes: '',                      // 补充说明（可选）
  }];
}

/**
 * 世界观设定导入模板
 *
 * 字段说明：
 *   name          - 设定名称
 *   type          - 类型：location=地点 / race=种族 / item=物品 / concept=概念 / history=历史 / custom=自定义
 *   description   - 描述（Markdown）
 *   parentId      - 父级设定 ID（用于层级结构，可选）
 *   relations     - 关联设定列表
 *     targetId    - 关联设定 ID
 *     type        - 关联类型，如 "位于"、"属于"、"对抗"
 */
export function getWorldSettingTemplate(projectId: string): WorldSetting[] {
  return [{
    id: '<自动生成>',
    projectId: '<自动填充>',
    name: '',                       // 【必填】设定名称
    type: 'location',               // location=地点 | race=种族 | item=物品 | concept=概念 | history=历史 | custom=自定义
    description: '',                // 描述（支持 Markdown）
    parentId: undefined,            // 父级设定 ID（可选，用于层级）
    relations: [
      {
        targetId: '',               // 关联设定 ID
        type: '',                   // 关联类型，如 "位于"、"属于"
      },
    ],
  }];
}

/**
 * 大纲导入模板
 *
 * 字段说明：
 *   title                    - 节点标题（必填）
 *   type                     - 类型：volume=卷 | chapter=章 | section=节 | scene=场景
 *   parentId                 - 父节点 ID（null 表示根节点）
 *   sortOrder                - 同级排序序号
 *   chapterId                - 关联章节 ID（可选）
 *   characters               - 计划出场角色 ID 列表
 *   foreshadowsPlanted       - 计划埋设伏笔 ID 列表
 *   foreshadowsResolved      - 计划回收伏笔 ID 列表
 *   worldSettingsIntroduced  - 计划引入世界观设定 ID 列表
 *   notes                    - 备注（Markdown，可选）
 *   color                    - 节点颜色标记（可选）
 *   estimatedWords           - 预估字数（可选）
 */
export function getOutlineTemplate(projectId: string): OutlineNode[] {
  return [{
    id: '<自动生成>',
    projectId: '<自动填充>',
    parentId: null,                  // null=根节点
    type: 'volume',                  // volume=卷 | chapter=章 | section=节 | scene=场景
    title: '',                       // 【必填】节点标题
    sortOrder: 1000,                 // 同级排序序号
    chapterId: undefined,            // 关联章节 ID（可选）
    characters: [],                  // 计划出场角色 ID
    foreshadowsPlanted: [],          // 计划埋设伏笔 ID
    foreshadowsResolved: [],         // 计划回收伏笔 ID
    worldSettingsIntroduced: [],     // 计划引入世界观设定 ID
    notes: '',                       // 备注（Markdown）
    color: '',                       // 颜色标记（可选）
    estimatedWords: 0,               // 预估字数
    collapsed: false,
    createdAt: '<自动填充>',
    updatedAt: '<自动填充>',
  }, {
    id: '<自动生成>',
    projectId: '<自动填充>',
    parentId: '<上一节点的自动填充ID>', // 子节点示例
    type: 'chapter',
    title: '',
    sortOrder: 2000,
    chapterId: undefined,
    characters: [],
    foreshadowsPlanted: [],
    foreshadowsResolved: [],
    worldSettingsIntroduced: [],
    notes: '',
    color: '',
    estimatedWords: 0,
    collapsed: false,
    createdAt: '<自动填充>',
    updatedAt: '<自动填充>',
  }];
}

// ========== 下载工具函数 ==========

/**
 * 生成带注释的 JSON 字符串
 * 将 JS 对象序列化时保留行尾 // 注释
 */
function stringifyWithComments(obj: unknown, indent = 0): string {
  const pad = '  '.repeat(indent);
  const padIn = '  '.repeat(indent + 1);

  if (obj === null || obj === undefined) return 'null';
  if (typeof obj === 'string') return JSON.stringify(obj);
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    const items = obj.map((item) => {
      const str = stringifyWithComments(item, indent + 1);
      // 尝试保留行尾注释（从原始对象获取）
      return `${padIn}${str}`;
    });
    return `[\n${items.join(',\n')}\n${pad}]`;
  }

  if (typeof obj === 'object') {
    const entries = Object.entries(obj as Record<string, unknown>);
    if (entries.length === 0) return '{}';
    const items = entries.map(([key, value]) => {
      const valStr = stringifyWithComments(value, indent + 1);
      // 尝试匹配原始注释
      const comment = getComment(key);
      return `${padIn}${JSON.stringify(key)}: ${valStr}${comment ? '  ' + comment : ''}`;
    });
    return `{\n${items.join(',\n')}\n${pad}}`;
  }

  return JSON.stringify(obj);
}

/** 字段注释映射表 */
const FIELD_COMMENTS: Record<string, string> = {
  name: '// 【必填】角色名',
  aliases: '// 别名列表',
  race: '// 种族，如 "人类"',
  age: '// 年龄，如 "25岁"',
  appearance: '// 外貌描述（支持 Markdown）',
  personality: '// 性格描述（支持 Markdown）',
  description: '// 背景故事（支持 Markdown）',
  status: '// alive=存活 | dead=死亡 | unknown=未知 | mentioned=提及',
  currentLocation: '// 当前所在地点',
  arc: '// 角色弧光',
  secret: '// 秘密（仅作者可见）',
  voice: '// 语言风格提示',
  targetId: '// 关联 ID',
  type: '// 类型',
  direction: '// 单向=→ | 双向=↔',
  isPublic: '// 公开=true | 秘密=false',
  resources: '// 资源/能力列表',
  relations: '// 关系列表',
  appearances: '// 出场章节 ID 列表',
  obtainedAt: '// 获取时间/章节',
  cost: '// 代价',
  number: '// 章节序号',
  title: '// 【必填】标题',
  wordCount: '// 字数',
  summary: '// 内容摘要',
  keyEvents: '// 关键事件列表',
  characters: '// 出场角色 ID 列表',
  foreshadowsAdded: '// 新增伏笔 ID 列表',
  foreshadowsResolved: '// 回收伏笔 ID 列表',
  locations: '// 地点 ID 列表',
  content: '// 【必填】内容',
  firstAppearance: '// 首次出现章节 ID',
  relatedCharacters: '// 相关角色 ID 列表',
  expectedResolution: '// 预计回收章节 ID',
  notes: '// 补充说明',
  parentId: '// 父级设定 ID（可选）',
  id: '// 自动生成',
  projectId: '// 项目 ID',
};

function getComment(key: string): string {
  return FIELD_COMMENTS[key] || '';
}

/**
 * 在原生环境下载模板文件：
 * 1. 写入 Filesystem (Directory.Cache，无需权限)
 * 2. 调用 Share.share() 弹出系统分享对话框，用户可保存到"文件"或其他应用
 */
export async function downloadTemplateFile(data: unknown, filename: string): Promise<{ ok: boolean; error?: string; path?: string }> {
  const json = stringifyWithComments(data);
  const isNative = !!(window as any).Capacitor?.isNativePlatform?.();

  if (isNative) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');

      // 写入 Cache 目录（无需权限，应用可访问）
      const base64 = btoa(unescape(encodeURIComponent(json)));

      const writeResult = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Cache,
      });

      console.log('[模板下载] 写入成功:', writeResult.uri);

      // 弹出系统分享对话框，让用户选择保存位置
      try {
        const { Share } = await import('@capacitor/share');
        await Share.share({
          title: '保存模板文件',
          text: `下载文件：${filename}`,
          url: writeResult.uri,
          dialogTitle: '选择保存方式',
        });
      } catch (shareErr: any) {
        // 用户取消分享不算失败
        console.log('[模板下载] 分享取消或失败:', shareErr.message);
      }

      return { ok: true, path: `已通过分享保存：${filename}` };
    } catch (err: any) {
      console.error('[模板下载] 文件保存失败:', err);
      return { ok: false, error: err.message || '未知错误' };
    }
  } else {
    webDownload(json, filename);
    return { ok: true };
  }
}

/** Blob 转 base64 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // 去掉 data:application/json;base64, 前缀
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Web 标准下载 */
function webDownload(json: string, filename: string): void {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 通用原生下载函数：写入 Cache + 弹出 Share 对话框
 * 适用于所有导出功能（JSON、PDF、DOCX、EPUB、Markdown 等）
 * @param blob - 文件内容
 * @param filename - 文件名
 */
export async function nativeDownload(blob: Blob, filename: string): Promise<void> {
  const isNative = !!(window as any).Capacitor?.isNativePlatform?.();

  if (isNative) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');

      // Blob → base64（兼容二进制文件如 PDF/DOCX）
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const writeResult = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Cache,
      });

      console.log('[nativeDownload] 写入成功:', writeResult.uri);

      // 弹出分享对话框
      try {
        const { Share } = await import('@capacitor/share');
        await Share.share({
          title: '保存文件',
          text: `下载文件：${filename}`,
          url: writeResult.uri,
          dialogTitle: '选择保存方式',
        });
      } catch (shareErr: any) {
        console.log('[nativeDownload] 分享取消:', shareErr.message);
      }
    } catch (err: any) {
      console.error('[nativeDownload] 失败:', err);
      alert(`保存失败: ${err.message || '未知错误'}`);
    }
  } else {
    // Web 环境：标准下载
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}




export async function generateFullExport(project: Project): Promise<ProjectExport> {
  const { db } = await import('../db/database');
  const [characters, chapters, foreshadows, worldSettings] = await Promise.all([
    db.characters.getByProject(project.id),
    db.chapters.getByProject(project.id),
    db.foreshadows.getByProject(project.id),
    db.worldSettings.getByProject(project.id),
  ]);
  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    project,
    characters,
    chapters,
    foreshadows,
    worldSettings,
  };
}
