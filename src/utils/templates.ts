/**
 * 导入模板生成器 + 预设模板系统
 * 为每个模块生成标准 JSON 导入模板，支持一键下载
 * 同时提供预设世界观模板快速创建
 */

import type {
  Project, Character, Chapter, Foreshadow, WorldSetting,
  ProjectExport
} from '../types';
import { generateId } from '../types';

// ========== 各模块导入模板 ==========

/** 角色导入模板 */
export function getCharacterTemplate(projectId: string): Character[] {
  return [{
    id: generateId(),
    projectId,
    name: '角色名称',
    aliases: ['别名1'],
    race: '人类',
    age: '25岁',
    appearance: '外貌描述',
    personality: '性格特点',
    description: '角色的详细背景故事...\n\n支持 **Markdown** 格式。',
    status: 'alive',
    relations: [],
    resources: [],
    appearances: [],
    meta: {},
  }];
}

/** 章节导入模板 */
export function getChapterTemplate(projectId: string): Chapter[] {
  return [{
    id: generateId(),
    projectId,
    number: 1,
    title: '章节标题',
    wordCount: 3000,
    status: 'draft',
    summary: '本章内容摘要...',
    keyEvents: ['关键事件1', '关键事件2'],
    characters: [],
    foreshadowsAdded: [],
    foreshadowsResolved: [],
    locations: [],
    meta: {},
  }];
}

/** 伏笔导入模板 */
export function getForeshadowTemplate(projectId: string): Foreshadow[] {
  return [{
    id: generateId(),
    projectId,
    content: '伏笔内容描述',
    firstAppearance: '',
    status: 'pending',
    relatedCharacters: [],
    expectedResolution: '',
    notes: '补充说明...',
    meta: {},
  }];
}

/** 世界观设定导入模板 */
export function getWorldSettingTemplate(projectId: string): WorldSetting[] {
  return [{
    id: generateId(),
    projectId,
    name: '设定名称',
    type: 'location',
    description: '详细描述...\n\n支持 **Markdown**。',
    parentId: undefined,
    relations: [],
    meta: {},
  }];
}

// ========== 预设模板系统 ==========

export interface PresetTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** 生成完整项目数据 */
  generate: (projectName: string) => {
    project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>;
    characters: Omit<Character, 'id' | 'projectId'>[];
    chapters: Omit<Chapter, 'id' | 'projectId'>[];
    foreshadows: Omit<Foreshadow, 'id' | 'projectId'>[];
    worldSettings: Omit<WorldSetting, 'id' | 'projectId'>[];
  };
}

/** 预设模板列表 */
export const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: 'fantasy',
    name: '奇幻冒险',
    description: '经典奇幻世界：勇者、魔法师、精灵、巨龙',
    icon: '⚔️',
    generate: (projectName) => ({
      project: {
        name: projectName,
        description: '一个充满魔法与冒险的奇幻世界。',
      },
      characters: [
        {
          name: '勇者',
          aliases: ['天选之人'],
          race: '人类',
          age: '18岁',
          appearance: '金色短发，蓝色眼眸，身披简陋的皮甲',
          personality: '勇敢、正直，有时过于天真',
          description: '被命运选中的少年/少女，踏上讨伐魔王的旅途。\n\n## 背景\n出身于边境小村，在村庄被魔物袭击后觉醒勇者之力。',
          status: 'alive',
          relations: [],
          resources: [
            { id: generateId(), name: '圣剑', type: '武器', description: '传说中的勇者之剑，对魔族有额外伤害', cost: '需要纯洁之心才能驾驭' },
            { id: generateId(), name: '光之魔法', type: '技能', description: '基础治疗和防护魔法', cost: '消耗魔力' },
          ],
          appearances: [],
        },
        {
          name: '精灵弓箭手',
          aliases: ['森林之子'],
          race: '精灵',
          age: '120岁（相当于人类20岁）',
          appearance: '银色长发，翠绿眼眸，尖耳朵，身形修长',
          personality: '冷静、优雅，对人类世界充满好奇',
          description: '来自精灵森林的年轻弓箭手，为了寻找失踪的族人而加入冒险。',
          status: 'alive',
          relations: [
            { targetId: '', type: '队友', description: '与勇者同行' },
          ],
          resources: [
            { id: generateId(), name: '精灵长弓', type: '武器', description: '由世界树之枝制成的神弓' },
            { id: generateId(), name: '自然感知', type: '技能', description: '能与动植物沟通，感知周围环境' },
          ],
          appearances: [],
        },
        {
          name: '大魔法师',
          aliases: ['贤者'],
          race: '人类',
          age: '未知',
          appearance: '白发长须，身披星辰法袍，手持法杖',
          personality: '睿智、神秘，偶尔有些健忘',
          description: '隐居多年的传奇魔法师，在勇者最需要的时候出现。',
          status: 'alive',
          relations: [
            { targetId: '', type: '导师', description: '指导勇者' },
          ],
          resources: [
            { id: generateId(), name: '星辰法杖', type: '武器', description: '蕴含星辰之力' },
            { id: generateId(), name: '元素魔法', type: '技能', description: '精通火、冰、雷三系魔法' },
          ],
          appearances: [],
        },
        {
          name: '魔王',
          aliases: ['暗影之主'],
          race: '魔族',
          age: '1000+岁',
          appearance: '漆黑铠甲，赤红双眼，背后展开巨大的暗影之翼',
          personality: '冷酷、傲慢，但内心深处有着不为人知的悲剧',
          description: '统治黑暗大陆的魔王，正在集结军队准备入侵人类世界。\n\n## 秘密\n魔王的真实身份其实是被诅咒的上古勇者。',
          status: 'alive',
          relations: [],
          resources: [
            { id: generateId(), name: '暗影之力', type: '技能', description: '操控黑暗的最强之力' },
            { id: generateId(), name: '魔剑·终焉', type: '武器', description: '传说中能斩断因果的魔剑', cost: '使用会消耗生命力' },
          ],
          appearances: [],
        },
      ],
      chapters: [
        {
          number: 1, title: '启程之日', wordCount: 5000, status: 'draft',
          summary: '边境小村被魔物袭击，主角觉醒勇者之力，决定踏上旅途。',
          keyEvents: ['村庄遇袭', '觉醒勇者之力', '告别村民'],
          characters: [], foreshadowsAdded: [], foreshadowsResolved: [], locations: [],
        },
        {
          number: 2, title: '精灵森林', wordCount: 4500, status: 'draft',
          summary: '勇者在精灵森林遇到精灵弓箭手，两人结伴同行。',
          keyEvents: ['进入精灵森林', '遇到精灵弓箭手', '击败森林守卫'],
          characters: [], foreshadowsAdded: [], foreshadowsResolved: [], locations: [],
        },
        {
          number: 3, title: '贤者之塔', wordCount: 4000, status: 'draft',
          summary: '勇者拜访贤者之塔，获得大魔法师的指点。',
          keyEvents: ['攀爬贤者之塔', '通过魔法试炼', '获得星辰祝福'],
          characters: [], foreshadowsAdded: [], foreshadowsResolved: [], locations: [],
        },
      ],
      foreshadows: [
        {
          content: '勇者体内的神秘力量似乎不仅仅是"勇者之力"那么简单',
          firstAppearance: '', status: 'pending', relatedCharacters: [],
          expectedResolution: '', notes: '与魔王的真实身份相关',
        },
        {
          content: '精灵弓箭手失踪的族人可能与魔王的军队有关',
          firstAppearance: '', status: 'active', relatedCharacters: [],
          notes: '中期重要线索',
        },
        {
          content: '大魔法师似乎认识前代的勇者',
          firstAppearance: '', status: 'pending', relatedCharacters: [],
          notes: '暗示魔王的真实身份',
        },
      ],
      worldSettings: [
        {
          name: '艾泽拉斯大陆', type: 'location',
          description: '故事发生的主要大陆，分为人类王国、精灵森林、矮人山脉和黑暗大陆四大区域。',
          parentId: undefined, relations: [],
        },
        {
          name: '人类王国', type: 'location',
          description: '位于大陆中部，是最繁荣的人类聚居地。首都为光辉之城。',
          parentId: '', relations: [{ targetId: '', type: '位于' }],
        },
        {
          name: '精灵森林', type: 'location',
          description: '位于大陆东部，是精灵族的家园。森林中心生长着古老的世界树。',
          parentId: '', relations: [{ targetId: '', type: '位于' }],
        },
        {
          name: '黑暗大陆', type: 'location',
          description: '位于大陆西部，被魔王统治的荒芜之地。常年笼罩在黑暗中。',
          parentId: '', relations: [{ targetId: '', type: '位于' }],
        },
        {
          name: '勇者之力', type: 'concept',
          description: '传说中每千年出现一次的力量，只有被命运选中的人才能觉醒。',
          parentId: undefined, relations: [],
        },
        {
          name: '世界树', type: 'concept',
          description: '支撑世界的古老巨树，精灵族的信仰之源。据说世界树连接着所有生命。',
          parentId: undefined, relations: [],
        },
        {
          name: '魔族', type: 'race',
          description: '居住在黑暗大陆的种族，外形各异，力量强大。并非所有魔族都效忠魔王。',
          parentId: undefined, relations: [],
        },
      ],
    }),
  },
  {
    id: 'scifi',
    name: '科幻星际',
    description: '未来宇宙：星际舰队、外星文明、人工智能',
    icon: '🚀',
    generate: (projectName) => ({
      project: {
        name: projectName,
        description: '在浩瀚星海中探索未知，人类文明的星际远征。',
      },
      characters: [
        {
          name: '舰长', aliases: [], race: '人类', age: '35岁',
          appearance: '干练短发，眼神坚定，身着星际舰队制服',
          personality: '果断、责任感强，偶尔过于固执',
          description: '星际探索舰"曙光号"的舰长，肩负着寻找新家园的使命。',
          status: 'alive', relations: [], resources: [
            { id: generateId(), name: '战术指挥', type: '技能', description: '精通星际战术' },
          ], appearances: [],
        },
        {
          name: 'AI助手', aliases: ['EVE'], race: '人工智能', age: 'N/A',
          appearance: '全息投影的女性形象，蓝光粒子构成',
          personality: '理性、高效，正在学习人类情感',
          description: '曙光号的主控AI，拥有超越人类的计算能力。\n\n## 秘密\nEVE的底层代码中隐藏着一段被删除的记忆。',
          status: 'alive', relations: [
            { targetId: '', type: '辅助', description: '辅助舰长决策' },
          ], resources: [
            { id: generateId(), name: '量子计算', type: '技能', description: '每秒可进行10^18次运算' },
            { id: generateId(), name: '全息投影', type: '技能', description: '可在舰内任意位置投射形象' },
          ], appearances: [],
        },
        {
          name: '外星大使', aliases: [], race: '泽塔星人', age: '未知',
          appearance: '半透明蓝色皮肤，三只眼睛，身高2米',
          personality: '好奇、友善，对地球文化极度痴迷',
          description: '来自泽塔星系的外星文明大使，在星际航行中与人类舰队相遇。',
          status: 'alive', relations: [], resources: [
            { id: generateId(), name: '心灵感应', type: '技能', description: '可以读取和传递思维' },
          ], appearances: [],
        },
      ],
      chapters: [
        { number: 1, title: '启航', wordCount: 6000, status: 'draft',
          summary: '地球资源枯竭，人类派出曙光号寻找新家园。',
          keyEvents: ['地球危机', '曙光号启航', '进入未知星域'],
          characters: [], foreshadowsAdded: [], foreshadowsResolved: [], locations: [] },
        { number: 2, title: '第一次接触', wordCount: 5500, status: 'draft',
          summary: '曙光号在太空中遇到泽塔星飞船，人类首次接触外星文明。',
          keyEvents: ['探测到未知信号', '与泽塔星飞船对接', '首次交流'],
          characters: [], foreshadowsAdded: [], foreshadowsResolved: [], locations: [] },
      ],
      foreshadows: [
        { content: 'EVE的记忆被删除可能与地球政府的秘密计划有关',
          firstAppearance: '', status: 'pending', relatedCharacters: [], notes: '后期大反转' },
        { content: '泽塔星人似乎早就知道人类的存在',
          firstAppearance: '', status: 'active', relatedCharacters: [] },
      ],
      worldSettings: [
        { name: '银河联邦', type: 'concept',
          description: '由多个星际文明组成的政治联盟，人类尚未加入。',
          parentId: undefined, relations: [] },
        { name: '曙光号', type: 'item',
          description: '人类最先进的星际探索舰，搭载曲速引擎和生态循环系统。船员共120人。',
          parentId: undefined, relations: [] },
        { name: '泽塔星系', type: 'location',
          description: '距离地球约500光年的恒星系统，泽塔星人的母星所在地。',
          parentId: undefined, relations: [] },
        { name: '曲速引擎', type: 'item',
          description: '使飞船能以超光速航行的核心装置。由量子物理学家团队研发。',
          parentId: undefined, relations: [] },
      ],
    }),
  },
  {
    id: 'mystery',
    name: '悬疑推理',
    description: '现代都市：侦探、记者、连环案件、隐藏真相',
    icon: '🔍',
    generate: (projectName) => ({
      project: {
        name: projectName,
        description: '迷雾重重的都市中，真相只有一个。',
      },
      characters: [
        {
          name: '私家侦探', aliases: [], race: '人类', age: '32岁',
          appearance: '黑色风衣，总是叼着烟斗，眼神锐利',
          personality: '观察力敏锐、玩世不恭，内心正义感强烈',
          description: '曾经是警界精英，因某起案件离开警队，独自开设侦探事务所。',
          status: 'alive', relations: [], resources: [
            { id: generateId(), name: '推理能力', type: '技能', description: '能从细节中发现关键线索' },
            { id: generateId(), name: '人脉网络', type: '技能', description: '与警界、黑道都有联系' },
          ], appearances: [],
        },
        {
          name: '记者', aliases: [], race: '人类', age: '26岁',
          appearance: '红色短发，总是背着相机，精力充沛',
          personality: '执着、正义感强，有时过于冲动',
          description: '调查记者，为了追求真相不惜以身犯险。是侦探的搭档。',
          status: 'alive', relations: [
            { targetId: '', type: '搭档', description: '与侦探合作调查' },
          ], resources: [
            { id: generateId(), name: '调查技能', type: '技能', description: '擅长信息搜集和采访' },
          ], appearances: [],
        },
      ],
      chapters: [
        { number: 1, title: '雨夜来访', wordCount: 4000, status: 'draft',
          summary: '雨夜，一位神秘女子来到侦探事务所，带来一个匪夷所思的案件。',
          keyEvents: ['神秘女子来访', '接受委托', '发现第一具尸体'],
          characters: [], foreshadowsAdded: [], foreshadowsResolved: [], locations: [] },
        { number: 2, title: '第二个现场', wordCount: 4200, status: 'draft',
          summary: '第二起案件发生，侦探发现两起案件之间存在隐秘的联系。',
          keyEvents: ['第二起案件', '发现共同点', '遇到记者'],
          characters: [], foreshadowsAdded: [], foreshadowsResolved: [], locations: [] },
      ],
      foreshadows: [
        { content: '神秘女子左手无名指上有一枚特殊的戒指',
          firstAppearance: '', status: 'pending', relatedCharacters: [], notes: '与最终BOSS相关' },
        { content: '所有受害者都参加过同一个慈善晚宴',
          firstAppearance: '', status: 'active', relatedCharacters: [] },
      ],
      worldSettings: [
        { name: '雾都市', type: 'location',
          description: '故事发生的现代都市，表面繁华，暗流涌动。',
          parentId: undefined, relations: [] },
        { name: '侦探事务所', type: 'location',
          description: '位于老城区三楼的小办公室，堆满卷宗和书籍。',
          parentId: '', relations: [{ targetId: '', type: '位于' }] },
        { name: '连环案件', type: 'concept',
          description: '一系列看似无关但暗含联系的案件，背后隐藏着巨大阴谋。',
          parentId: undefined, relations: [] },
      ],
    }),
  },
];

// ========== 下载工具函数 ==========

/**
 * 下载 JSON 模板文件
 * @param data - 要下载的数据
 * @param filename - 文件名
 */
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

/**
 * 生成完整项目的导出数据（用于总设定下载）
 */
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
