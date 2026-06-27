/**
 * Novel KB - 核心类型定义
 * 所有数据模型的 TypeScript 接口
 */

// ========== 项目 ==========
export interface Project {
  id: string;
  name: string;
  description: string;
  cover?: string;          // 封面图（base64 或 URL）
  createdAt: string;       // ISO 日期字符串
  updatedAt: string;
  meta?: Record<string, unknown>;  // 扩展字段
}

// ========== 角色 ==========

/** 预设关系类型枚举 */
export const RELATION_TYPES = ['家人', '朋友', '恋人', '敌人', '对手', '师徒', '上下级', '盟友', '陌生人', '其他'] as const;
export type RelationType = typeof RELATION_TYPES[number] | (string & {});

export interface Relation {
  targetId: string;         // 关联角色 ID
  type: RelationType;       // 关系类型（预设枚举 + 自定义）
  direction: '单向' | '双向'; // 关系方向
  description?: string;     // 关系描述
  isPublic: boolean;        // 该关系是否公开（秘密关系仅作者可见）
}

export interface Character {
  id: string;
  projectId: string;
  name: string;
  aliases?: string[];       // 别名
  race?: string;
  age?: string;
  appearance?: string;      // 外貌描述（Markdown）
  personality?: string;     // 性格描述（Markdown）
  description: string;      // 背景故事（Markdown）
  status: 'alive' | 'dead' | 'unknown' | 'mentioned';
  // 新增字段
  currentLocation?: string; // 当前所在地点 ID 或自由文本
  arc?: string;             // 角色弧光摘要（Markdown，描述角色成长轨迹）
  secret?: string;          // 秘密（Markdown，仅作者可见的隐藏信息）
  voice?: string;           // 语言风格提示（对写作有帮助，如"说话带东北口音""喜欢用文言句式"）
  relations: Relation[];
  resources: Resource[];
  appearances: string[];    // 出场章节 ID
  meta?: Record<string, unknown>;
}

// ========== 资源/能力 ==========

/** 资源类型 */
export type ResourceType = '能力' | '物品' | '代价' | '其他' | (string & {});

/** 资源状态 */
export type ResourceStatus = '未获得' | '已获得' | '已消耗' | '进行中';

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  description: string;
  obtainedAt?: string;       // 获取时间（自由文本）
  obtainedChapter?: string;  // 获取章节 ID
  status: ResourceStatus;    // 获取状态
  cost?: string;             // 代价描述（如果是能力）
  meta?: Record<string, unknown>;
}

// ========== 章节 ==========
export interface Chapter {
  id: string;
  projectId: string;
  number: number;          // 章节序号
  title: string;
  wordCount?: number;
  status: 'draft' | 'revising' | 'done';
  summary?: string;        // 内容摘要
  keyEvents: string[];     // 关键事件列表
  characters: string[];    // 出场角色 ID
  foreshadowsAdded: string[];     // 新增伏笔 ID
  foreshadowsResolved: string[];  // 回收伏笔 ID
  locations: string[];     // 地点 ID
  meta?: Record<string, unknown>;
}

// ========== 伏笔 ==========
export interface Foreshadow {
  id: string;
  projectId: string;
  content: string;         // 伏笔内容
  firstAppearance: string; // 首次出现章节 ID
  status: 'pending' | 'active' | 'resolved' | 'abandoned';
  relatedCharacters: string[];
  expectedResolution?: string;  // 预计回收章节 ID
  actualResolution?: string;    // 实际回收章节 ID
  notes?: string;           // 补充说明
  meta?: Record<string, unknown>;
}

// ========== 世界观设定 ==========
export interface SettingRelation {
  targetId: string;
  type: string;            // 关联类型（如「位于」「属于」「对抗」）
}

export interface WorldSetting {
  id: string;
  projectId: string;
  name: string;
  type: 'location' | 'race' | 'item' | 'concept' | 'history' | 'custom';
  description: string;     // Markdown 支持
  parentId?: string;       // 父级设定（用于层级结构）
  relations: SettingRelation[];
  meta?: Record<string, unknown>;
}

// ========== 导入导出 ==========
/** 完整项目数据的导出格式 */
export interface ProjectExport {
  version: string;         // 导出格式版本号
  exportedAt: string;
  project: Project;
  characters: Character[];
  chapters: Chapter[];
  foreshadows: Foreshadow[];
  worldSettings: WorldSetting[];
}

// ========== 辅助类型 ==========
/** 生成唯一 ID */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

/** 状态标签映射 */
export const STATUS_LABELS: Record<string, string> = {
  alive: '存活',
  dead: '死亡',
  unknown: '未知',
  mentioned: '提及',
  draft: '草稿',
  revising: '修订中',
  done: '已完成',
  pending: '未触发',
  active: '进行中',
  resolved: '已回收',
  abandoned: '已放弃',
};

/** 资源状态标签 */
export const RESOURCE_STATUS_LABELS: Record<string, string> = {
  '未获得': '未获得',
  '已获得': '已获得',
  '已消耗': '已消耗',
  '进行中': '进行中',
};

/** 关系方向标签 */
export const DIRECTION_LABELS: Record<string, string> = {
  '单向': '→',
  '双向': '↔',
};
