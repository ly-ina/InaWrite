/**
 * 多语言国际化 (i18n) 系统
 * 轻量级实现，无外部依赖，支持中/英文切换
 * 使用 React Context 在全局提供翻译函数
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

// ========== 类型定义 ==========

export type Lang = 'zh' | 'en';

/** 所有需要翻译的文本 key */
export interface Translations {
  // 导航
  'nav.projects': string;
  'nav.dashboard': string;
  'nav.characters': string;
  'nav.chapters': string;
  'nav.timeline': string;
  'nav.foreshadows': string;
  'nav.worldsettings': string;
  'nav.resources': string;
  'nav.templates': string;
  'nav.backToProjects': string;
  'nav.collapse': string;
  'nav.themeLight': string;
  'nav.themeDark': string;

  // 通用
  'common.save': string;
  'common.cancel': string;
  'common.delete': string;
  'common.edit': string;
  'common.create': string;
  'common.search': string;
  'common.loading': string;
  'common.empty': string;
  'common.export': string;
  'common.import': string;
  'common.confirm': string;
  'common.close': string;
  'common.add': string;
  'common.remove': string;
  'common.selectProject': string;
  'common.batchOp': string;
  'common.batchDelete': string;
  'common.selected': string;

  // 项目
  'project.title': string;
  'project.new': string;
  'project.enter': string;
  'project.noProjects': string;
  'project.createFirst': string;
  'project.name': string;
  'project.desc': string;
  'project.updatedAt': string;

  // Dashboard
  'dashboard.title': string;
  'dashboard.stats': string;
  'dashboard.goal': string;
  'dashboard.goalSet': string;
  'dashboard.goalReached': string;
  'dashboard.goalRemain': string;
  'dashboard.quickActions': string;
  'dashboard.chapterProgress': string;
  'dashboard.recentActivity': string;
  'dashboard.backup': string;
  'dashboard.backupNow': string;
  'dashboard.exportReport': string;
  'dashboard.restoreFile': string;
  'dashboard.viewBackups': string;

  // 角色
  'char.title': string;
  'char.new': string;
  'char.relationGraph': string;
  'char.backToList': string;
  'char.name': string;
  'char.race': string;
  'char.age': string;
  'char.status': string;
  'char.appearance': string;
  'char.personality': string;
  'char.description': string;
  'char.appearances': string;
  'char.relations': string;
  'char.resources': string;
  'char.noRelations': string;
  'char.noResources': string;
  'char.markAlive': string;
  'char.markDead': string;
  'char.filterAll': string;
  'char.filterRace': string;
  'char.filterStatus': string;

  // 章节
  'chap.title': string;
  'chap.new': string;
  'chap.number': string;
  'chap.wordCount': string;
  'chap.summary': string;
  'chap.keyEvents': string;
  'chap.chars': string;
  'chap.addedForeshadows': string;
  'chap.resolvedForeshadows': string;
  'chap.filterStatus': string;

  // 伏笔
  'fs.title': string;
  'fs.new': string;
  'fs.content': string;
  'fs.firstAppearance': string;
  'fs.expectedResolution': string;
  'fs.relatedChars': string;
  'fs.notes': string;
  'fs.columns.pending': string;
  'fs.columns.active': string;
  'fs.columns.resolved': string;
  'fs.columns.abandoned': string;

  // 世界观
  'ws.title': string;
  'ws.new': string;
  'ws.graph': string;
  'ws.parent': string;
  'ws.children': string;
  'ws.type': string;
  'ws.relations': string;
  'ws.noRelations': string;
  'ws.filter': string;
  'ws.types.location': string;
  'ws.types.race': string;
  'ws.types.item': string;
  'ws.types.concept': string;
  'ws.types.history': string;
  'ws.types.custom': string;

  // 资源
  'res.title': string;
  'res.byChar': string;
  'res.global': string;
  'res.add': string;
  'res.name': string;
  'res.type': string;
  'res.cost': string;
  'res.allTypes': string;

  // 时间线
  'tl.title': string;
  'tl.filterChars': string;
  'tl.clearFilter': string;
  'tl.legend.added': string;
  'tl.legend.resolved': string;
  'tl.legend.drag': string;

  // 模板
  'tpl.title': string;
  'tpl.download': string;
  'tpl.downloadDesc': string;
  'tpl.fullExport': string;
  'tpl.exportDesc': string;
  'tpl.importData': string;

  // 搜索
  'search.placeholder': string;
  'search.noResults': string;
  'search.hint': string;
  'search.typeChar': string;
  'search.typeChapter': string;
  'search.typeForeshadow': string;
  'search.typeSetting': string;

  // 状态标签
  'status.alive': string;
  'status.dead': string;
  'status.unknown': string;
  'status.mentioned': string;
  'status.draft': string;
  'status.revising': string;
  'status.done': string;
  'status.pending': string;
  'status.active': string;
  'status.resolved': string;
  'status.abandoned': string;
}

// ========== 翻译字典 ==========

const zh: Translations = {
  'nav.projects': '作品',
  'nav.dashboard': '概览',
  'nav.characters': '角色',
  'nav.chapters': '章节',
  'nav.timeline': '时间线',
  'nav.foreshadows': '伏笔',
  'nav.worldsettings': '世界观',
  'nav.resources': '资源',
  'nav.templates': '模板',
  'nav.backToProjects': '← 返回作品列表',
  'nav.collapse': '折叠侧边栏',
  'nav.themeLight': '☀️ 亮色',
  'nav.themeDark': '🌙 暗色',

  'common.save': '保存',
  'common.cancel': '取消',
  'common.delete': '删除',
  'common.edit': '编辑',
  'common.create': '创建',
  'common.search': '搜索',
  'common.loading': '加载中...',
  'common.empty': '暂无数据',
  'common.export': '导出',
  'common.import': '导入',
  'common.confirm': '确定',
  'common.close': '关闭',
  'common.add': '添加',
  'common.remove': '移除',
  'common.selectProject': '请先选择一个作品',
  'common.batchOp': '批量操作',
  'common.batchDelete': '批量删除',
  'common.selected': '已选',

  'project.title': '我的作品',
  'project.new': '+ 新建作品',
  'project.enter': '进入',
  'project.noProjects': '还没有作品，开始创作你的第一个故事吧',
  'project.createFirst': '+ 新建作品',
  'project.name': '作品名称',
  'project.desc': '简介',
  'project.updatedAt': '最后编辑',

  'dashboard.title': '作品概览',
  'dashboard.stats': '数据概览',
  'dashboard.goal': '写作目标',
  'dashboard.goalSet': '修改目标',
  'dashboard.goalReached': '🎉 目标达成！',
  'dashboard.goalRemain': '还差',
  'dashboard.quickActions': '快捷操作',
  'dashboard.chapterProgress': '章节进度',
  'dashboard.recentActivity': '最近动态',
  'dashboard.backup': '数据安全',
  'dashboard.backupNow': '立即备份',
  'dashboard.exportReport': '导出创作报告',
  'dashboard.restoreFile': '从文件恢复',
  'dashboard.viewBackups': '查看备份记录',

  'char.title': '角色管理',
  'char.new': '+ 新角色',
  'char.relationGraph': '关系图谱',
  'char.backToList': '返回列表',
  'char.name': '姓名',
  'char.race': '种族',
  'char.age': '年龄',
  'char.status': '状态',
  'char.appearance': '外貌',
  'char.personality': '性格',
  'char.description': '描述',
  'char.appearances': '出场章节',
  'char.relations': '角色关系',
  'char.resources': '资源/能力',
  'char.noRelations': '暂无关系',
  'char.noResources': '暂无记录',
  'char.markAlive': '标记存活',
  'char.markDead': '标记死亡',
  'char.filterAll': '全部种族',
  'char.filterRace': '全部种族',
  'char.filterStatus': '全部状态',

  'chap.title': '章节管理',
  'chap.new': '+ 新章节',
  'chap.number': '序号',
  'chap.wordCount': '字数',
  'chap.summary': '内容摘要',
  'chap.keyEvents': '关键事件',
  'chap.chars': '出场角色',
  'chap.addedForeshadows': '新增伏笔',
  'chap.resolvedForeshadows': '回收伏笔',
  'chap.filterStatus': '全部状态',

  'fs.title': '伏笔追踪',
  'fs.new': '+ 新伏笔',
  'fs.content': '伏笔内容',
  'fs.firstAppearance': '首次出现章节',
  'fs.expectedResolution': '预计回收章节',
  'fs.relatedChars': '相关角色',
  'fs.notes': '补充说明',
  'fs.columns.pending': '未触发',
  'fs.columns.active': '进行中',
  'fs.columns.resolved': '已回收',
  'fs.columns.abandoned': '已放弃',

  'ws.title': '世界观设定',
  'ws.new': '+ 新设定',
  'ws.graph': '关联图谱',
  'ws.parent': '父级设定',
  'ws.children': '子设定',
  'ws.type': '类型',
  'ws.relations': '关联条目',
  'ws.noRelations': '暂无关联',
  'ws.filter': '搜索设定...',
  'ws.types.location': '地点',
  'ws.types.race': '种族',
  'ws.types.item': '物品',
  'ws.types.concept': '概念',
  'ws.types.history': '历史',
  'ws.types.custom': '自定义',

  'res.title': '资源追踪',
  'res.byChar': '按角色查看',
  'res.global': '全局资源表',
  'res.add': '+ 添加资源',
  'res.name': '名称',
  'res.type': '类型',
  'res.cost': '代价',
  'res.allTypes': '全部类型',

  'tl.title': '章节时间线',
  'tl.filterChars': '全部章节',
  'tl.clearFilter': '清除筛选',
  'tl.legend.added': '新增伏笔',
  'tl.legend.resolved': '回收伏笔',
  'tl.legend.drag': '拖拽可调整顺序',

  'tpl.title': '模板与导入导出',
  'tpl.download': '导入模板下载',
  'tpl.downloadDesc': '下载标准 JSON 模板，填入数据后通过作品页的「导入」功能批量导入',
  'tpl.fullExport': '📦 完整设定导出',
  'tpl.exportDesc': '导出当前作品的完整数据',
  'tpl.importData': '数据导入',

  'search.placeholder': '搜索角色、章节、伏笔、设定...',
  'search.noResults': '未找到相关结果',
  'search.hint': '输入关键词开始搜索...',
  'search.typeChar': '角色',
  'search.typeChapter': '章节',
  'search.typeForeshadow': '伏笔',
  'search.typeSetting': '设定',

  'status.alive': '存活',
  'status.dead': '死亡',
  'status.unknown': '未知',
  'status.mentioned': '提及',
  'status.draft': '草稿',
  'status.revising': '修订中',
  'status.done': '已完成',
  'status.pending': '未触发',
  'status.active': '进行中',
  'status.resolved': '已回收',
  'status.abandoned': '已放弃',
};

const en: Translations = {
  'nav.projects': 'Projects',
  'nav.dashboard': 'Dashboard',
  'nav.characters': 'Characters',
  'nav.chapters': 'Chapters',
  'nav.timeline': 'Timeline',
  'nav.foreshadows': 'Foreshadows',
  'nav.worldsettings': 'World',
  'nav.resources': 'Resources',
  'nav.templates': 'Templates',
  'nav.backToProjects': '← Back to Projects',
  'nav.collapse': 'Collapse sidebar',
  'nav.themeLight': '☀️ Light',
  'nav.themeDark': '🌙 Dark',

  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.create': 'Create',
  'common.search': 'Search',
  'common.loading': 'Loading...',
  'common.empty': 'No data',
  'common.export': 'Export',
  'common.import': 'Import',
  'common.confirm': 'Confirm',
  'common.close': 'Close',
  'common.add': 'Add',
  'common.remove': 'Remove',
  'common.selectProject': 'Please select a project first',
  'common.batchOp': 'Batch',
  'common.batchDelete': 'Batch Delete',
  'common.selected': 'selected',

  'project.title': 'My Projects',
  'project.new': '+ New Project',
  'project.enter': 'Enter',
  'project.noProjects': 'No projects yet. Start your first story!',
  'project.createFirst': '+ New Project',
  'project.name': 'Project Name',
  'project.desc': 'Description',
  'project.updatedAt': 'Last edited',

  'dashboard.title': 'Dashboard',
  'dashboard.stats': 'Statistics',
  'dashboard.goal': 'Writing Goal',
  'dashboard.goalSet': 'Set Goal',
  'dashboard.goalReached': '🎉 Goal reached!',
  'dashboard.goalRemain': 'remaining',
  'dashboard.quickActions': 'Quick Actions',
  'dashboard.chapterProgress': 'Chapter Progress',
  'dashboard.recentActivity': 'Recent Activity',
  'dashboard.backup': 'Data Safety',
  'dashboard.backupNow': 'Backup Now',
  'dashboard.exportReport': 'Export Report',
  'dashboard.restoreFile': 'Restore from File',
  'dashboard.viewBackups': 'View Backups',

  'char.title': 'Characters',
  'char.new': '+ New Character',
  'char.relationGraph': 'Relation Graph',
  'char.backToList': 'Back to List',
  'char.name': 'Name',
  'char.race': 'Race',
  'char.age': 'Age',
  'char.status': 'Status',
  'char.appearance': 'Appearance',
  'char.personality': 'Personality',
  'char.description': 'Description',
  'char.appearances': 'Appearances',
  'char.relations': 'Relations',
  'char.resources': 'Resources/Abilities',
  'char.noRelations': 'No relations',
  'char.noResources': 'No records',
  'char.markAlive': 'Mark Alive',
  'char.markDead': 'Mark Dead',
  'char.filterAll': 'All Races',
  'char.filterRace': 'All Races',
  'char.filterStatus': 'All Statuses',

  'chap.title': 'Chapters',
  'chap.new': '+ New Chapter',
  'chap.number': 'Number',
  'chap.wordCount': 'Word Count',
  'chap.summary': 'Summary',
  'chap.keyEvents': 'Key Events',
  'chap.chars': 'Characters',
  'chap.addedForeshadows': 'New Foreshadows',
  'chap.resolvedForeshadows': 'Resolved Foreshadows',
  'chap.filterStatus': 'All Statuses',

  'fs.title': 'Foreshadow Tracking',
  'fs.new': '+ New Foreshadow',
  'fs.content': 'Content',
  'fs.firstAppearance': 'First Appearance',
  'fs.expectedResolution': 'Expected Resolution',
  'fs.relatedChars': 'Related Characters',
  'fs.notes': 'Notes',
  'fs.columns.pending': 'Pending',
  'fs.columns.active': 'Active',
  'fs.columns.resolved': 'Resolved',
  'fs.columns.abandoned': 'Abandoned',

  'ws.title': 'World Settings',
  'ws.new': '+ New Setting',
  'ws.graph': 'Relation Graph',
  'ws.parent': 'Parent',
  'ws.children': 'Children',
  'ws.type': 'Type',
  'ws.relations': 'Relations',
  'ws.noRelations': 'No relations',
  'ws.filter': 'Search settings...',
  'ws.types.location': 'Location',
  'ws.types.race': 'Race',
  'ws.types.item': 'Item',
  'ws.types.concept': 'Concept',
  'ws.types.history': 'History',
  'ws.types.custom': 'Custom',

  'res.title': 'Resource Tracking',
  'res.byChar': 'By Character',
  'res.global': 'Global Table',
  'res.add': '+ Add Resource',
  'res.name': 'Name',
  'res.type': 'Type',
  'res.cost': 'Cost',
  'res.allTypes': 'All Types',

  'tl.title': 'Chapter Timeline',
  'tl.filterChars': 'All Chapters',
  'tl.clearFilter': 'Clear Filter',
  'tl.legend.added': 'New Foreshadow',
  'tl.legend.resolved': 'Resolved Foreshadow',
  'tl.legend.drag': 'Drag to reorder',

  'tpl.title': 'Templates & Import/Export',
  'tpl.download': 'Import Templates',
  'tpl.downloadDesc': 'Download standard JSON templates for batch import',
  'tpl.fullExport': '📦 Full Export',
  'tpl.exportDesc': 'Export all project data',
  'tpl.importData': 'Data Import',

  'search.placeholder': 'Search characters, chapters, foreshadows, settings...',
  'search.noResults': 'No results found',
  'search.hint': 'Type to search...',
  'search.typeChar': 'Character',
  'search.typeChapter': 'Chapter',
  'search.typeForeshadow': 'Foreshadow',
  'search.typeSetting': 'Setting',

  'status.alive': 'Alive',
  'status.dead': 'Dead',
  'status.unknown': 'Unknown',
  'status.mentioned': 'Mentioned',
  'status.draft': 'Draft',
  'status.revising': 'Revising',
  'status.done': 'Done',
  'status.pending': 'Pending',
  'status.active': 'Active',
  'status.resolved': 'Resolved',
  'status.abandoned': 'Abandoned',
};

// ========== Context ==========

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: keyof Translations) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'zh',
  setLang: () => {},
  t: (key) => key,
});

/** 获取保存的语言偏好 */
function getSavedLang(): Lang {
  try {
    const saved = localStorage.getItem('novelkb_lang');
    if (saved === 'en' || saved === 'zh') return saved;
  } catch {}
  return 'zh';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getSavedLang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem('novelkb_lang', l); } catch {}
  }, []);

  const t = useCallback((key: keyof Translations): string => {
    const dict = lang === 'zh' ? zh : en;
    return dict[key] || key;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

/** Hook: 在组件中使用翻译 */
export function useT() {
  const { t, lang, setLang } = useContext(I18nContext);
  return { t, lang, setLang };
}
