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
export interface Relation {
  targetId: string;        // 关联角色 ID
  type: string;            // 关系类型（如「朋友」「敌人」「师徒」）
  description?: string;
}

export interface Character {
  id: string;
  projectId: string;
  name: string;
  aliases?: string[];      // 别名
  race?: string;
  age?: string;
  appearance?: string;     // 外貌描述
  personality?: string;    // 性格描述
  description: string;     // Markdown 描述
  status: 'alive' | 'dead' | 'unknown' | 'mentioned';
  relations: Relation[];
  resources: Resource[];
  appearances: string[];   // 出场章节 ID
  meta?: Record<string, unknown>;
}

// ========== 资源/能力 ==========
export interface Resource {
  id: string;
  name: string;
  type: string;            // 如「武器」「技能」「魔法」「道具」
  description: string;
  cost?: string;           // 使用代价
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
