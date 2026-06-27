/**
 * 导入模板生成器 + 预设模板系统
 * 模板采用精简格式：空值占位 + 注释标注字段含义
 */

import type {
  Project, Character, Chapter, Foreshadow, WorldSetting,
  ProjectExport
} from '../types';
import { generateId } from '../types';

// ========== 各模块导入模板（精简版 + 注释） ==========

/**
 * 角色导入模板
 *
 * 字段说明：
 *   id            - 自动生成，可替换为已有 ID 以覆盖
 *   projectId     - 自动填充当前项目 ID
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
    id: generateId(),
    projectId,
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
    relations: [                    // 关系列表，每个关系包含：
      /* {
        targetId: '',               // 关联角色 ID
        type: '朋友',               // 家人/朋友/恋人/敌人/对手/师徒/上下级/盟友/陌生人/其他
        direction: '双向',          // 单向=→ | 双向=↔
        description: '',            // 关系描述（可选）
        isPublic: true,             // 公开=true | 秘密=false
      }, */
    ],
    resources: [                    // 资源/能力列表，每个资源包含：
      /* {
        id: generateId(),
        name: '',                   // 名称
        type: '能力',               // 能力/物品/代价/其他
        description: '',            // 描述
        status: '已获得',           // 未获得/已获得/已消耗/进行中
        obtainedAt: '',             // 获取时间/章节（可选）
        cost: '',                   // 使用代价（可选）
      }, */
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
    id: generateId(),
    projectId,
    number: 1,                      // 章节序号
    title: '',                      // 【必填】章节标题
    wordCount: 0,                   // 字数（可选）
    status: 'draft',                // draft=草稿 | revising=修订中 | done=已完成
    summary: '',                    // 内容摘要（可选）
    keyEvents: [],                  // 关键事件，如 ["事件1", "事件2"]
    characters: [],                 // 出场角色 ID 列表
    foreshadowsAdded: [],           // 新增伏笔 ID 列表
    foreshadowsResolved: [],        // 回收伏笔 ID 列表
    locations: [],                  // 地点 ID 列表
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
 *   actualResolution     - 实际回收章节 ID
 *   notes                - 补充说明
 */
export function getForeshadowTemplate(projectId: string): Foreshadow[] {
  return [{
    id: generateId(),
    projectId,
    content: '',                    // 【必填】伏笔内容
    firstAppearance: '',            // 首次出现章节 ID
    status: 'pending',              // pending=未触发 | active=进行中 | resolved=已回收 | abandoned=已放弃
    relatedCharacters: [],          // 相关角色 ID 列表
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
    id: generateId(),
    projectId,
    name: '',                       // 【必填】设定名称
    type: 'location',               // location=地点 | race=种族 | item=物品 | concept=概念 | history=历史 | custom=自定义
    description: '',                // 描述（支持 Markdown）
    parentId: undefined,            // 父级设定 ID（可选，用于层级）
    relations: [                    // 关联设定列表
      /* {
        targetId: '',               // 关联设定 ID
        type: '',                   // 关联类型，如 "位于"、"属于"
      }, */
    ],
  }];
}

// ========== 预设模板系统（供快速创建使用） ==========

export interface PresetTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  generate: (projectName: string) => {
    project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>;
    characters: Omit<Character, 'id' | 'projectId'>[];
    chapters: Omit<Chapter, 'id' | 'projectId'>[];
    foreshadows: Omit<Foreshadow, 'id' | 'projectId'>[];
    worldSettings: Omit<WorldSetting, 'id' | 'projectId'>[];
  };
}

export const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: 'fantasy',
    name: '奇幻冒险',
    description: '经典奇幻世界：勇者、魔法师、精灵、巨龙',
    icon: '⚔️',
    generate: (projectName) => ({
      project: { name: projectName, description: '一个充满魔法与冒险的奇幻世界。' },
      characters: [
        { name: '勇者', aliases: ['天选之人'], race: '人类', age: '18岁', appearance: '金色短发，蓝色眼眸，身披简陋的皮甲', personality: '勇敢、正直，有时过于天真', description: '被命运选中的少年/少女，踏上讨伐魔王的旅途。\n\n## 背景\n出身于边境小村，在村庄被魔物袭击后觉醒勇者之力。', status: 'alive', currentLocation: '光辉之城', arc: '从逃避责任 → 接受命运 → 超越命运', secret: '体内的勇者之力其实是上古魔王的灵魂碎片。', voice: '说话直率，偶尔冒出乡下口音。', relations: [{ targetId: '', type: '师徒', direction: '双向', description: '失踪的师父', isPublic: true }], resources: [{ id: generateId(), name: '圣剑·黎明', type: '物品', description: '传说中的勇者之剑，对魔族有额外伤害', status: '已获得', cost: '需要纯洁之心才能驾驭' }, { id: generateId(), name: '光之加护', type: '能力', description: '基础治疗和防护魔法', status: '已获得', cost: '消耗魔力' }], appearances: [] },
        { name: '精灵弓箭手', aliases: ['森林之子'], race: '精灵', age: '120岁', appearance: '银色长发，翠绿眼眸，尖耳朵', personality: '冷静优雅，对人类世界充满好奇', description: '来自精灵森林的年轻弓箭手。', status: 'alive', relations: [{ targetId: '', type: '队友', direction: '双向', isPublic: true }], resources: [{ id: generateId(), name: '精灵长弓', type: '物品', description: '由世界树之枝制成', status: '已获得' }, { id: generateId(), name: '自然感知', type: '能力', description: '与动植物沟通', status: '已获得' }], appearances: [] },
        { name: '大魔法师', aliases: ['贤者'], race: '人类', age: '未知', appearance: '白发长须，身披星辰法袍', personality: '睿智神秘，偶尔健忘', description: '隐居多年的传奇魔法师。', status: 'alive', relations: [{ targetId: '', type: '导师', direction: '双向', isPublic: true }], resources: [{ id: generateId(), name: '星辰法杖', type: '物品', description: '蕴含星辰之力', status: '已获得' }, { id: generateId(), name: '元素魔法', type: '能力', description: '精通火冰雷三系', status: '已获得' }], appearances: [] },
        { name: '魔王', aliases: ['暗影之主'], race: '魔族', age: '1000+岁', appearance: '漆黑铠甲，赤红双眼', personality: '冷酷傲慢，内心有悲剧', description: '统治黑暗大陆的魔王。\n\n## 秘密\n真实身份是被诅咒的上古勇者。', status: 'alive', relations: [], resources: [{ id: generateId(), name: '暗影之力', type: '能力', description: '操控黑暗', status: '已获得' }, { id: generateId(), name: '魔剑·终焉', type: '物品', description: '斩断因果的魔剑', status: '已获得', cost: '消耗生命力' }], appearances: [] },
      ],
      chapters: [
        { number: 1, title: '启程之日', wordCount: 5000, status: 'draft', summary: '边境小村被魔物袭击，主角觉醒勇者之力。', keyEvents: ['村庄遇袭', '觉醒勇者之力'], characters: [], foreshadowsAdded: [], foreshadowsResolved: [], locations: [] },
        { number: 2, title: '精灵森林', wordCount: 4500, status: 'draft', summary: '勇者在精灵森林遇到精灵弓箭手。', keyEvents: ['进入精灵森林', '遇到精灵弓箭手'], characters: [], foreshadowsAdded: [], foreshadowsResolved: [], locations: [] },
        { number: 3, title: '贤者之塔', wordCount: 4000, status: 'draft', summary: '勇者获得大魔法师的指点。', keyEvents: ['攀爬贤者之塔', '通过魔法试炼'], characters: [], foreshadowsAdded: [], foreshadowsResolved: [], locations: [] },
      ],
      foreshadows: [
        { content: '勇者体内的神秘力量不仅仅是"勇者之力"', firstAppearance: '', status: 'pending', relatedCharacters: [], expectedResolution: '', notes: '与魔王的真实身份相关' },
        { content: '精灵弓箭手失踪的族人与魔王军队有关', firstAppearance: '', status: 'active', relatedCharacters: [], notes: '中期重要线索' },
      ],
      worldSettings: [
        { name: '艾泽拉斯大陆', type: 'location', description: '故事发生的主要大陆，分为人类王国、精灵森林、矮人山脉和黑暗大陆。', relations: [] },
        { name: '人类王国', type: 'location', description: '位于大陆中部，首都为光辉之城。', parentId: '', relations: [{ targetId: '', type: '位于' }] },
        { name: '精灵森林', type: 'location', description: '位于大陆东部，中心生长着世界树。', parentId: '', relations: [{ targetId: '', type: '位于' }] },
        { name: '黑暗大陆', type: 'location', description: '被魔王统治的荒芜之地。', parentId: '', relations: [{ targetId: '', type: '位于' }] },
        { name: '勇者之力', type: 'concept', description: '每千年出现一次的力量。', relations: [] },
        { name: '魔族', type: 'race', description: '居住在黑暗大陆的种族。', relations: [] },
      ],
    }),
  },
  {
    id: 'scifi',
    name: '科幻星际',
    description: '未来宇宙：星际舰队、外星文明、人工智能',
    icon: '🚀',
    generate: (projectName) => ({
      project: { name: projectName, description: '在浩瀚星海中探索未知。' },
      characters: [
        { name: '舰长', race: '人类', age: '35岁', appearance: '干练短发，身着星际舰队制服', personality: '果断、责任感强', description: '星际探索舰"曙光号"的舰长。', status: 'alive', relations: [], resources: [{ id: generateId(), name: '战术指挥', type: '能力', description: '精通星际战术', status: '已获得' }], appearances: [] },
        { name: 'AI助手', aliases: ['EVE'], race: '人工智能', age: 'N/A', appearance: '全息投影女性形象', personality: '理性高效，学习人类情感', description: '曙光号主控AI。\n\n## 秘密\n底层代码中隐藏着被删除的记忆。', status: 'alive', relations: [{ targetId: '', type: '辅助', direction: '双向', isPublic: true }], resources: [{ id: generateId(), name: '量子计算', type: '能力', description: '每秒10^18次运算', status: '已获得' }], appearances: [] },
        { name: '外星大使', race: '泽塔星人', age: '未知', appearance: '半透明蓝色皮肤，三只眼睛', personality: '好奇友善，痴迷地球文化', description: '来自泽塔星系的外星文明大使。', status: 'alive', relations: [], resources: [{ id: generateId(), name: '心灵感应', type: '能力', description: '读取和传递思维', status: '已获得' }], appearances: [] },
      ],
      chapters: [
        { number: 1, title: '启航', wordCount: 6000, status: 'draft', summary: '地球资源枯竭，曙光号出发寻找新家园。', keyEvents: ['地球危机', '曙光号启航'], characters: [], foreshadowsAdded: [], foreshadowsResolved: [], locations: [] },
        { number: 2, title: '第一次接触', wordCount: 5500, status: 'draft', summary: '曙光号遇到泽塔星飞船。', keyEvents: ['探测到未知信号', '首次交流'], characters: [], foreshadowsAdded: [], foreshadowsResolved: [], locations: [] },
      ],
      foreshadows: [
        { content: 'EVE的记忆被删除与地球政府秘密计划有关', firstAppearance: '', status: 'pending', relatedCharacters: [], notes: '后期大反转' },
      ],
      worldSettings: [
        { name: '银河联邦', type: 'concept', description: '多个星际文明组成的政治联盟。', relations: [] },
        { name: '曙光号', type: 'item', description: '人类最先进的星际探索舰，船员120人。', relations: [] },
        { name: '泽塔星系', type: 'location', description: '距离地球500光年的恒星系统。', relations: [] },
      ],
    }),
  },
  {
    id: 'mystery',
    name: '悬疑推理',
    description: '现代都市：侦探、记者、连环案件、隐藏真相',
    icon: '🔍',
    generate: (projectName) => ({
      project: { name: projectName, description: '迷雾重重的都市中，真相只有一个。' },
      characters: [
        { name: '私家侦探', race: '人类', age: '32岁', appearance: '黑色风衣，眼神锐利', personality: '观察力敏锐、玩世不恭', description: '曾为警界精英，因某案件离开警队开设侦探事务所。', status: 'alive', relations: [], resources: [{ id: generateId(), name: '推理能力', type: '能力', description: '从细节发现关键线索', status: '已获得' }], appearances: [] },
        { name: '记者', race: '人类', age: '26岁', appearance: '红色短发，精力充沛', personality: '执着、正义感强', description: '调查记者，侦探的搭档。', status: 'alive', relations: [{ targetId: '', type: '搭档', direction: '双向', isPublic: true }], resources: [{ id: generateId(), name: '调查技能', type: '能力', description: '擅长信息搜集', status: '已获得' }], appearances: [] },
      ],
      chapters: [
        { number: 1, title: '雨夜来访', wordCount: 4000, status: 'draft', summary: '神秘女子带来匪夷所思的案件。', keyEvents: ['神秘女子来访', '接受委托'], characters: [], foreshadowsAdded: [], foreshadowsResolved: [], locations: [] },
        { number: 2, title: '第二个现场', wordCount: 4200, status: 'draft', summary: '第二起案件发现隐秘联系。', keyEvents: ['第二起案件', '发现共同点'], characters: [], foreshadowsAdded: [], foreshadowsResolved: [], locations: [] },
      ],
      foreshadows: [
        { content: '神秘女子左手无名指上有一枚特殊戒指', firstAppearance: '', status: 'pending', relatedCharacters: [], notes: '与最终BOSS相关' },
      ],
      worldSettings: [
        { name: '雾都市', type: 'location', description: '表面繁华暗流涌动的现代都市。', relations: [] },
        { name: '侦探事务所', type: 'location', description: '老城区三楼小办公室。', parentId: '', relations: [{ targetId: '', type: '位于' }] },
      ],
    }),
  },
];

// ========== 下载工具函数 ==========

export function downloadTemplateFile(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
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
