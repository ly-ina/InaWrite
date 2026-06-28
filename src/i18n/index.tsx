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
  'nav.outline': string;
  'nav.characters': string;
  'nav.chapters': string;
  'nav.timeline': string;
  'nav.foreshadows': string;
  'nav.worldsettings': string;
  'nav.resources': string;
  'nav.templates': string;
  'nav.tags': string;
  'nav.ai': string;
  'nav.about': string;
  'nav.backToProjects': string;
  'nav.collapse': string;
  'nav.themeLight': string;
  'nav.themeDark': string;
  'nav.exportProject': string;
  'nav.importProject': string;
  'nav.langSwitch': string;

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
  'common.clear': string;
  'common.restore': string;
  'common.refresh': string;
  'common.view': string;
  'common.hide': string;
  'common.selectAll': string;
  'common.deselectAll': string;
  'common.noDescription': string;
  'common.noData': string;
  'common.back': string;
  'common.optional': string;
  'common.required': string;
  'common.or': string;

  // 项目
  'project.title': string;
  'project.new': string;
  'project.enter': string;
  'project.noProjects': string;
  'project.createFirst': string;
  'project.name': string;
  'project.desc': string;
  'project.updatedAt': string;
  'project.createTitle': string;
  'project.namePlaceholder': string;
  'project.descPlaceholder': string;
  'project.confirmDelete': string;
  'project.exportFailed': string;
  'project.importSuccess': string;
  'project.importFailed': string;
  'project.importRetry': string;
  'project.conflictTitle': string;
  'project.conflictDesc': string;
  'project.conflictHint': string;
  'project.cancelImport': string;
  'project.skipConflicts': string;
  'project.overwriteImport': string;
  'project.nameMatch': string;
  'project.invalidFormat': string;
  'project.unsupportedFormat': string;

  // Dashboard
  'dashboard.title': string;
  'dashboard.stats': string;
  'dashboard.characters': string;
  'dashboard.chapters': string;
  'dashboard.totalWords': string;
  'dashboard.completionRate': string;
  'dashboard.activeForeshadows': string;
  'dashboard.resolvedForeshadows': string;
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
  'dashboard.confirmRestore': string;
  'dashboard.restoreSuccess': string;
  'dashboard.restoreFailed': string;
  'dashboard.createdEdited': string;
  'dashboard.wordProgress': string;
  'dashboard.chaptersDone': string;
  'dashboard.emptyProject': string;
  'dashboard.createFirstChar': string;
  'dashboard.writeFirstChapter': string;
  'dashboard.setGoal': string;
  'dashboard.targetWordCount': string;
  'dashboard.noBackups': string;
  'dashboard.backupRecords': string;

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
  'char.arc': string;
  'char.voice': string;
  'char.alias': string;
  'char.location': string;
  'char.secret': string;

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
  'chap.content': string;
  'chap.draft': string;

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

  // ===== 新增模块 =====

  // AI 助手
  'ai.title': string;
  'ai.tab.analyze': string;
  'ai.tab.suggest': string;
  'ai.tab.continue': string;
  'ai.tab.resources': string;
  'ai.tab.consistency': string;
  'ai.tab.complete': string;
  'ai.tab.history': string;
  'ai.tab.snapshots': string;
  'ai.tab.settings': string;
  'ai.tab.analyzeDesc': string;
  'ai.tab.suggestDesc': string;
  'ai.tab.continueDesc': string;
  'ai.tab.resourcesDesc': string;
  'ai.tab.consistencyDesc': string;
  'ai.tab.completeDesc': string;
  'ai.tab.historyDesc': string;
  'ai.tab.snapshotsDesc': string;
  'ai.tab.settingsDesc': string;
  'ai.inputText': string;
  'ai.chooseFile': string;
  'ai.clearText': string;
  'ai.linkToChapter': string;
  'ai.chapterNum': string;
  'ai.chapterTitleOptional': string;
  'ai.willUpdateChapter': string;
  'ai.willCreateChapter': string;
  'ai.pastePlaceholder': string;
  'ai.analyzing': string;
  'ai.startAnalyze': string;
  'ai.analysisResult': string;
  'ai.applySelected': string;
  'ai.applyComplete': string;
  'ai.textSummary': string;
  'ai.extractChars': string;
  'ai.extractSettings': string;
  'ai.foundForeshadows': string;
  'ai.writingSuggestion': string;
  'ai.noNewChars': string;
  'ai.noNewSettings': string;
  'ai.noForeshadows': string;
  'ai.matchNew': string;
  'ai.matchUpdate': string;
  'ai.matchDuplicate': string;
  'ai.matchExists': string;
  'ai.existingLabel': string;
  'ai.belongsTo': string;
  'ai.related': string;
  'ai.selectChapter': string;
  'ai.selectCharacter': string;
  'ai.arcAnalysis': string;
  'ai.analyzeArc': string;
  'ai.arcResult': string;
  'ai.thinking': string;
  'ai.getSuggestions': string;
  'ai.suggestionResult': string;
  'ai.continueTitle': string;
  'ai.continueHint': string;
  'ai.prevChapter': string;
  'ai.nextOutline': string;
  'ai.outlinePlaceholder': string;
  'ai.styleGuide': string;
  'ai.stylePlaceholder': string;
  'ai.continuing': string;
  'ai.startContinue': string;
  'ai.continueResult': string;
  'ai.reasoning': string;
  'ai.saveAsChapter': string;
  'ai.consistencyTitle': string;
  'ai.consistencyHint': string;
  'ai.checking': string;
  'ai.startCheck': string;
  'ai.consistencyScore': string;
  'ai.summary': string;
  'ai.noIssues': string;
  'ai.completeTitle': string;
  'ai.completeHint': string;
  'ai.startComplete': string;
  'ai.noGaps': string;
  'ai.logicGap': string;
  'ai.relationSuggest': string;
  'ai.detailSuggest': string;
  'ai.historyTitle': string;
  'ai.historyHint': string;
  'ai.noHistory': string;
  'ai.historyCount': string;
  'ai.clearHistory': string;
  'ai.confirmClearHistory': string;
  'ai.snapshotsTitle': string;
  'ai.snapshotsHint': string;
  'ai.createSnapshot': string;
  'ai.refreshList': string;
  'ai.snapshotCompare': string;
  'ai.selectSnapshotA': string;
  'ai.selectSnapshotB': string;
  'ai.compare': string;
  'ai.noSnapshots': string;
  'ai.snapshotLabel': string;
  'ai.confirmRestoreSnapshot': string;
  'ai.restored': string;
  'ai.confirmDeleteSnapshot': string;
  'ai.settingsTitle': string;
  'ai.settingsHint': string;
  'ai.apiUrl': string;
  'ai.apiKey': string;
  'ai.model': string;
  'ai.saved': string;
  'ai.saveConfig': string;
  'ai.configSecurity': string;
  'ai.analyzeFailed': string;
  'ai.applyFailed': string;
  'ai.requestFailed': string;
  'ai.continueFailed': string;
  'ai.checkFailed': string;
  'ai.completeFailed': string;
  'ai.resourceScan': string;
  'ai.resourceScanHint': string;
  'ai.pasteText': string;
  'ai.scanning': string;
  'ai.scanChanges': string;
  'ai.detectedChanges': string;
  'ai.applyUpdate': string;
  'ai.updated': string;
  'ai.clickToScan': string;
  'ai.analysisStats': string;
  'ai.chapterStats': string;

  // 大纲
  'outline.title': string;
  'outline.new': string;
  'outline.addChild': string;
  'outline.addSibling': string;
  'outline.delete': string;
  'outline.edit': string;
  'outline.expandAll': string;
  'outline.collapseAll': string;
  'outline.aiOptimize': string;
  'outline.aiHint': string;
  'outline.generateFromChapters': string;
  'outline.generateConfirm': string;

  // 标签
  'tags.title': string;
  'tags.new': string;
  'tags.cloud': string;
  'tags.list': string;
  'tags.noTags': string;
  'tags.batchTag': string;
  'tags.aiGenerate': string;
  'tags.aiHint': string;

  // 写作日历
  'calendar.title': string;
  'calendar.noData': string;
  'calendar.wordCount': string;
  'calendar.less': string;
  'calendar.more': string;

  // 关系
  'relation.type': string;
  'relation.direction': string;
  'relation.bidirectional': string;
  'relation.unidirectional': string;
  'relation.public': string;
  'relation.secret': string;
  'relation.target': string;

  // 面包屑
  'breadcrumb.projects': string;
  'breadcrumb.dashboard': string;
  'breadcrumb.outline': string;
  'breadcrumb.characters': string;
  'breadcrumb.chapters': string;
  'breadcrumb.foreshadows': string;
  'breadcrumb.timeline': string;
  'breadcrumb.worldsettings': string;
  'breadcrumb.resources': string;
  'breadcrumb.templates': string;
  'breadcrumb.tags': string;
  'breadcrumb.ai': string;
  'breadcrumb.about': string;

  // 快捷操作
  'quick.newChar': string;
  'quick.newChapter': string;
  'quick.newForeshadow': string;
  'quick.newSetting': string;
  'quick.templates': string;

  // 关系类型
  'relType.friend': string;
  'relType.enemy': string;
  'relType.lover': string;
  'relType.family': string;
  'relType.mentor': string;
  'relType.student': string;
  'relType.colleague': string;
  'relType.rival': string;
  'relType.master': string;
  'relType.servant': string;
  'relType.other': string;

  // 资源类型
  'resType.ability': string;
  'resType.item': string;
  'resType.cost': string;
  'resType.other': string;

  // 导出格式
  'export.docx': string;
  'export.pdf': string;
  'export.epub': string;
  'export.includeAppendix': string;
  'export.exporting': string;

  // 快捷键面板
  'shortcut.title': string;
  'shortcut.globalSearch': string;
  'shortcut.toggleTheme': string;
  'shortcut.undo': string;
  'shortcut.redo': string;
  'shortcut.save': string;
  'shortcut.newItem': string;
  'shortcut.close': string;
  'shortcut.pressHint': string;

  // 关于页面
  'about.tagline': string;
  'about.author': string;
  'about.authorName': string;
  'about.license': string;
  'about.techStack': string;
  'about.usage': string;
  'about.usage1': string;
  'about.usage2': string;
  'about.usage3': string;
  'about.usage4': string;
  'about.usage5': string;
  'about.shortcuts': string;
  'about.shortcutSearch': string;
  'about.shortcutUndo': string;
  'about.shortcutRedo': string;
  'about.shortcutPanel': string;
  'about.privacy': string;
  'about.privacyText': string;
  'about.builtWith': string;
}

// ========== 翻译字典 ==========

const zh: Translations = {
  'nav.projects': '作品',
  'nav.dashboard': '概览',
  'nav.outline': '大纲',
  'nav.characters': '角色',
  'nav.chapters': '章节',
  'nav.timeline': '时间线',
  'nav.foreshadows': '伏笔',
  'nav.worldsettings': '世界观',
  'nav.resources': '资源',
  'nav.templates': '模板',
  'nav.tags': '标签',
  'nav.ai': 'AI 助手',
  'nav.about': '关于',
  'nav.backToProjects': '← 返回作品列表',
  'nav.collapse': '折叠侧边栏',
  'nav.themeLight': '☀️ 亮色',
  'nav.themeDark': '🌙 暗色',
  'nav.exportProject': '📤 导出作品',
  'nav.importProject': '📥 导入作品',
  'nav.langSwitch': '🌐 English',

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
  'common.clear': '清空',
  'common.restore': '恢复',
  'common.refresh': '刷新',
  'common.view': '查看',
  'common.hide': '隐藏',
  'common.selectAll': '全选',
  'common.deselectAll': '取消全选',
  'common.noDescription': '暂无简介',
  'common.noData': '暂无数据',
  'common.back': '返回',
  'common.optional': '可选',
  'common.required': '必填',
  'common.or': '或',

  'project.title': '我的作品',
  'project.new': '+ 新建作品',
  'project.enter': '进入',
  'project.noProjects': '还没有作品，开始创作你的第一个故事吧',
  'project.createFirst': '+ 新建作品',
  'project.name': '作品名称',
  'project.desc': '简介',
  'project.updatedAt': '最后编辑',
  'project.createTitle': '新建作品',
  'project.namePlaceholder': '输入作品名称...',
  'project.descPlaceholder': '简单描述一下这个故事...',
  'project.confirmDelete': '确定要删除「{name}」吗？此操作不可恢复，会同时删除该作品下的所有角色、章节和伏笔数据。',
  'project.exportFailed': '导出失败，请重试',
  'project.importSuccess': '导入成功！',
  'project.importFailed': '导入失败',
  'project.importRetry': '导入失败，请重试',
  'project.conflictTitle': '检测到数据冲突',
  'project.conflictDesc': '以下 {n} 条数据与现有数据冲突：',
  'project.conflictHint': '选择「覆盖」将用导入数据更新现有数据，选择「跳过」将只添加不冲突的新数据。',
  'project.cancelImport': '取消导入',
  'project.skipConflicts': '跳过冲突',
  'project.overwriteImport': '覆盖导入',
  'project.nameMatch': '(同名匹配)',
  'project.invalidFormat': '文件格式无效',
  'project.unsupportedFormat': '文件格式不支持（需要完整导出格式）',

  'dashboard.title': '作品概览',
  'dashboard.stats': '数据概览',
  'dashboard.characters': '角色',
  'dashboard.chapters': '章节',
  'dashboard.totalWords': '总字数',
  'dashboard.completionRate': '完成率',
  'dashboard.activeForeshadows': '进行中伏笔',
  'dashboard.resolvedForeshadows': '已回收伏笔',
  'dashboard.goal': '写作目标',
  'dashboard.goalSet': '修改目标',
  'dashboard.goalReached': '🎉 目标达成！',
  'dashboard.goalRemain': '还差',
  'dashboard.quickActions': '快捷操作',
  'dashboard.chapterProgress': '章节进度',
  'dashboard.recentActivity': '最近动态',
  'dashboard.backup': '💾 数据安全',
  'dashboard.backupNow': '立即备份',
  'dashboard.exportReport': '导出创作报告',
  'dashboard.restoreFile': '从文件恢复',
  'dashboard.viewBackups': '查看备份记录',
  'dashboard.confirmRestore': '确定要从此备份恢复数据吗？当前数据将被覆盖。',
  'dashboard.restoreSuccess': '数据恢复成功！',
  'dashboard.restoreFailed': '恢复失败',
  'dashboard.createdEdited': '创建于 {created} · 最后编辑于 {edited}',
  'dashboard.wordProgress': '{current} / {target} 字',
  'dashboard.chaptersDone': '{done} / {total} 章已完成',
  'dashboard.emptyProject': '作品还是空的，开始添加内容吧！',
  'dashboard.createFirstChar': '+ 创建第一个角色',
  'dashboard.writeFirstChapter': '+ 写第一章',
  'dashboard.setGoal': '设置写作目标',
  'dashboard.targetWordCount': '目标总字数',
  'dashboard.noBackups': '暂无备份记录',
  'dashboard.backupRecords': '备份记录',

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
  'char.arc': '角色弧光',
  'char.voice': '语言风格',
  'char.alias': '别名',
  'char.location': '当前所在地',
  'char.secret': '秘密',

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
  'chap.content': '章节正文',
  'chap.draft': '草稿编辑器',

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

  // ===== 新增模块中文 =====
  'ai.title': 'AI 写作助手',
  'ai.tab.analyze': '📖 文本分析',
  'ai.tab.suggest': '💡 创作建议',
  'ai.tab.continue': '✍️ 章节续写',
  'ai.tab.resources': '🔄 资源追踪',
  'ai.tab.consistency': '🔍 一致性检查',
  'ai.tab.complete': '🌐 世界观补全',
  'ai.tab.history': '📋 操作历史',
  'ai.tab.snapshots': '📜 版本快照',
  'ai.tab.settings': '⚙️ 设置',
  'ai.tab.analyzeDesc': '导入文本，AI 自动提取角色、世界观、伏笔',
  'ai.tab.suggestDesc': '根据当前进度获取写作指导',
  'ai.tab.continueDesc': 'AI 根据上一章内容和设定续写下一章',
  'ai.tab.resourcesDesc': '根据章节内容智能更新角色资源状态',
  'ai.tab.consistencyDesc': '扫描全文检测设定矛盾',
  'ai.tab.completeDesc': 'AI 根据已有设定推断和补全',
  'ai.tab.historyDesc': '查看历次 AI 操作记录',
  'ai.tab.snapshotsDesc': '数据快照与版本管理',
  'ai.tab.settingsDesc': '配置 API 和模型',
  'ai.inputText': '导入小说文本',
  'ai.chooseFile': '📁 选择文件',
  'ai.clearText': '清空',
  'ai.linkToChapter': '关联到章节',
  'ai.chapterNum': '第',
  'ai.chapterTitleOptional': '章节标题（可选）',
  'ai.willUpdateChapter': '（将更新已有章节）',
  'ai.willCreateChapter': '（将创建新章节）',
  'ai.pastePlaceholder': '在此粘贴小说文本（支持 .txt / .md 文件上传）\nAI 将自动识别角色、世界观设定、伏笔等信息...',
  'ai.analyzing': '⏳ 分析中...',
  'ai.startAnalyze': '🔍 开始分析',
  'ai.analysisResult': '分析结果',
  'ai.applySelected': '✅ 应用选中的项',
  'ai.applyComplete': '🎉 应用完成！',
  'ai.textSummary': '📝 文本摘要',
  'ai.extractChars': '👤 提取角色',
  'ai.extractSettings': '🌍 提取设定',
  'ai.foundForeshadows': '🔮 发现伏笔',
  'ai.writingSuggestion': '💡 创作建议',
  'ai.noNewChars': '未提取到新角色',
  'ai.noNewSettings': '未提取到新设定',
  'ai.noForeshadows': '未发现明显伏笔',
  'ai.matchNew': '新增',
  'ai.matchUpdate': '更新',
  'ai.matchDuplicate': '重复',
  'ai.matchExists': '已存在',
  'ai.existingLabel': '已有：',
  'ai.belongsTo': '属于：',
  'ai.related': '关联：',
  'ai.selectChapter': '选择章节',
  'ai.selectCharacter': '选择角色',
  'ai.arcAnalysis': '角色弧光分析',
  'ai.analyzeArc': '分析弧光',
  'ai.arcResult': '角色弧光分析',
  'ai.thinking': '⏳ 思考中...',
  'ai.getSuggestions': '💡 获取创作建议',
  'ai.suggestionResult': '创作建议',
  'ai.continueTitle': '✍️ AI 章节续写',
  'ai.continueHint': '选择上一章，AI 将根据已有内容、角色设定和进行中的伏笔续写下一章。',
  'ai.prevChapter': '上一章',
  'ai.nextOutline': '下一章大纲（可选）',
  'ai.outlinePlaceholder': '简要描述下一章要发生的内容...',
  'ai.styleGuide': '写作风格要求（可选）',
  'ai.stylePlaceholder': '如：热血战斗、悬疑推理、轻松日常...',
  'ai.continuing': '⏳ 续写中...',
  'ai.startContinue': '✍️ 开始续写',
  'ai.continueResult': '续写结果',
  'ai.reasoning': '💡 写作思路：',
  'ai.saveAsChapter': '📖 保存为章节',
  'ai.consistencyTitle': '🔍 AI 一致性检查',
  'ai.consistencyHint': '扫描全部章节、角色、伏笔和世界观设定，检测设定矛盾、时间线冲突等问题。',
  'ai.checking': '⏳ 检查中...',
  'ai.startCheck': '🔍 开始检查',
  'ai.consistencyScore': '一致性评分',
  'ai.summary': '总结：',
  'ai.noIssues': '🎉 未发现明显一致性问题！',
  'ai.completeTitle': '🌐 AI 世界观补全',
  'ai.completeHint': 'AI 分析已有世界观设定，检测逻辑空白、建议关联关系和补充细节。',
  'ai.startComplete': '🌐 开始分析',
  'ai.noGaps': '✅ 现有设定已比较完善',
  'ai.logicGap': '逻辑空白',
  'ai.relationSuggest': '关联建议',
  'ai.detailSuggest': '细节补充',
  'ai.historyTitle': '📋 AI 操作历史',
  'ai.historyHint': 'AI 助手的所有操作记录将显示在这里，方便回顾和追溯。',
  'ai.noHistory': '📭 暂无操作记录',
  'ai.historyCount': '📋 AI 操作历史（{n} 条）',
  'ai.clearHistory': '🗑 清空',
  'ai.confirmClearHistory': '确定清空所有 AI 操作历史？',
  'ai.snapshotsTitle': '📜 版本历史',
  'ai.snapshotsHint': '创建数据快照，随时恢复到任意版本。快照存储在浏览器本地，最多保留 50 个。',
  'ai.createSnapshot': '📸 创建快照',
  'ai.refreshList': '🔄 刷新列表',
  'ai.snapshotCompare': '快照对比',
  'ai.selectSnapshotA': '选择快照 A',
  'ai.selectSnapshotB': '选择快照 B',
  'ai.compare': '对比',
  'ai.noSnapshots': '暂无快照，点击「创建快照」保存当前数据状态',
  'ai.snapshotLabel': '手动快照 {date}',
  'ai.confirmRestoreSnapshot': '确定恢复快照「{label}」？当前数据将被覆盖。',
  'ai.restored': '数据已恢复，页面将刷新。',
  'ai.confirmDeleteSnapshot': '删除此快照？',
  'ai.settingsTitle': 'API 配置',
  'ai.settingsHint': '支持 OpenAI 兼容 API（可填写其他服务商如 DeepSeek、通义千问等的兼容端点）',
  'ai.apiUrl': 'API 地址',
  'ai.apiKey': 'API Key',
  'ai.model': '模型',
  'ai.saved': '✅ 已保存',
  'ai.saveConfig': '保存配置',
  'ai.configSecurity': 'API Key 仅保存在浏览器本地存储中，不会上传到任何服务器。',
  'ai.analyzeFailed': '分析失败',
  'ai.applyFailed': '应用失败',
  'ai.requestFailed': '请求失败',
  'ai.continueFailed': '续写失败',
  'ai.checkFailed': '检查失败',
  'ai.completeFailed': '补全失败',
  'ai.resourceScan': '选择一个章节，AI 将分析章节内容并自动检测角色资源/能力的状态变化（如：获得新能力、消耗物品等）',
  'ai.resourceScanHint': '选择章节',
  'ai.pasteText': '或直接粘贴文本',
  'ai.scanning': '⏳ 分析中...',
  'ai.scanChanges': '🔍 扫描资源变化',
  'ai.detectedChanges': '检测到 {n} 项资源状态变化',
  'ai.applyUpdate': '应用更新',
  'ai.updated': '已更新 {n} 项资源状态',
  'ai.clickToScan': '点击扫描检测资源变化',
  'ai.analysisStats': '角色：新增 {ca} / 更新 {cu} / 关系 +{cr}；设定：新增 {wa} / 更新 {wu} / 关系 +{wr}；伏笔：+{fa}',
  'ai.chapterStats': '章节：{stats}',

  'outline.title': '大纲编辑器',
  'outline.new': '+ 新建大纲',
  'outline.addChild': '添加子节点',
  'outline.addSibling': '添加同级',
  'outline.delete': '删除',
  'outline.edit': '编辑',
  'outline.expandAll': '展开全部',
  'outline.collapseAll': '折叠全部',
  'outline.aiOptimize': 'AI 优化大纲',
  'outline.aiHint': 'AI 分析大纲结构给出优化建议',
  'outline.generateFromChapters': '从章节生成大纲',
  'outline.generateConfirm': '确定从已有章节生成大纲？',

  'tags.title': '标签管理',
  'tags.new': '+ 新建标签',
  'tags.cloud': '标签云',
  'tags.list': '列表',
  'tags.noTags': '暂无标签',
  'tags.batchTag': '批量打标签',
  'tags.aiGenerate': 'AI 生成标签',
  'tags.aiHint': '根据作品内容自动生成分类标签',

  'calendar.title': '写作日历',
  'calendar.noData': '暂无写作记录',
  'calendar.wordCount': '字数',
  'calendar.less': '少',
  'calendar.more': '多',

  'relation.type': '关系类型',
  'relation.direction': '方向',
  'relation.bidirectional': '双向',
  'relation.unidirectional': '单向',
  'relation.public': '公开',
  'relation.secret': '秘密',
  'relation.target': '目标角色',

  'breadcrumb.projects': '作品列表',
  'breadcrumb.dashboard': '概览',
  'breadcrumb.outline': '大纲编辑器',
  'breadcrumb.characters': '角色管理',
  'breadcrumb.chapters': '章节管理',
  'breadcrumb.foreshadows': '伏笔追踪',
  'breadcrumb.timeline': '章节时间线',
  'breadcrumb.worldsettings': '世界观设定',
  'breadcrumb.resources': '资源追踪',
  'breadcrumb.templates': '模板与导入导出',
  'breadcrumb.tags': '标签管理',
  'breadcrumb.ai': 'AI 写作助手',
  'breadcrumb.about': '关于',

  'quick.newChar': '新角色',
  'quick.newChapter': '新章节',
  'quick.newForeshadow': '新伏笔',
  'quick.newSetting': '新设定',
  'quick.templates': '模板',

  'relType.friend': '朋友',
  'relType.enemy': '敌人',
  'relType.lover': '恋人',
  'relType.family': '家人',
  'relType.mentor': '导师',
  'relType.student': '学生',
  'relType.colleague': '同僚',
  'relType.rival': '对手',
  'relType.master': '主人',
  'relType.servant': '仆从',
  'relType.other': '其他',

  'resType.ability': '能力',
  'resType.item': '物品',
  'resType.cost': '代价',
  'resType.other': '其他',

  'export.docx': 'DOCX 文档',
  'export.pdf': 'PDF 文档',
  'export.epub': 'EPUB 电子书',
  'export.includeAppendix': '包含角色附录',
  'export.exporting': '导出中...',

  'shortcut.title': '快捷键',
  'shortcut.globalSearch': '全局搜索',
  'shortcut.toggleTheme': '切换主题',
  'shortcut.undo': '撤销',
  'shortcut.redo': '重做',
  'shortcut.save': '保存',
  'shortcut.newItem': '新建项目',
  'shortcut.close': '关闭面板',
  'shortcut.pressHint': '按 ? 查看所有快捷键',

  'about.tagline': '本地优先的小说创作与世界观管理工具',
  'about.author': '作者信息',
  'about.authorName': '作者',
  'about.license': '许可证',
  'about.techStack': '技术栈',
  'about.usage': '使用说明',
  'about.usage1': '所有数据存储在浏览器 IndexedDB 中，无需注册账号，无需联网',
  'about.usage2': '导出作品为 JSON 文件可随时备份，也可通过导入功能恢复或迁移',
  'about.usage3': '支持 Web 浏览器、Windows/Mac/Linux 桌面应用、Android APK 全平台使用',
  'about.usage4': '内置 AI 写作助手，支持 OpenAI 兼容 API，可接入 DeepSeek、通义千问等模型',
  'about.usage5': '桌面版支持系统托盘常驻、自动保存（每 60 秒）、崩溃恢复功能',
  'about.shortcuts': '常用快捷键',
  'about.shortcutSearch': '全局搜索',
  'about.shortcutUndo': '撤销操作',
  'about.shortcutRedo': '重做操作',
  'about.shortcutPanel': '查看所有快捷键',
  'about.privacy': '数据隐私',
  'about.privacyText': '你的所有创作数据完全存储在本地，不会上传到任何服务器。AI 功能需要配置你自己的 API Key，对话内容仅发送到你指定的 API 端点。我们不会收集、存储或分享你的任何创作内容。',
  'about.builtWith': '用心构建',
};

const en: Translations = {
  'nav.projects': 'Projects',
  'nav.dashboard': 'Dashboard',
  'nav.outline': 'Outline',
  'nav.characters': 'Characters',
  'nav.chapters': 'Chapters',
  'nav.timeline': 'Timeline',
  'nav.foreshadows': 'Foreshadows',
  'nav.worldsettings': 'World',
  'nav.resources': 'Resources',
  'nav.templates': 'Templates',
  'nav.tags': 'Tags',
  'nav.ai': 'AI Assistant',
  'nav.about': 'About',
  'nav.backToProjects': '← Back to Projects',
  'nav.collapse': 'Collapse sidebar',
  'nav.themeLight': '☀️ Light',
  'nav.themeDark': '🌙 Dark',
  'nav.exportProject': '📤 Export Project',
  'nav.importProject': '📥 Import Project',
  'nav.langSwitch': '🌐 中文',

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
  'common.clear': 'Clear',
  'common.restore': 'Restore',
  'common.refresh': 'Refresh',
  'common.view': 'View',
  'common.hide': 'Hide',
  'common.selectAll': 'Select All',
  'common.deselectAll': 'Deselect All',
  'common.noDescription': 'No description',
  'common.noData': 'No data',
  'common.back': 'Back',
  'common.optional': 'Optional',
  'common.required': 'Required',
  'common.or': 'or',

  'project.title': 'My Projects',
  'project.new': '+ New Project',
  'project.enter': 'Enter',
  'project.noProjects': 'No projects yet. Start your first story!',
  'project.createFirst': '+ New Project',
  'project.name': 'Project Name',
  'project.desc': 'Description',
  'project.updatedAt': 'Last edited',
  'project.createTitle': 'New Project',
  'project.namePlaceholder': 'Enter project name...',
  'project.descPlaceholder': 'Briefly describe your story...',
  'project.confirmDelete': 'Are you sure you want to delete "{name}"? This cannot be undone and will also delete all characters, chapters, and foreshadows within this project.',
  'project.exportFailed': 'Export failed, please try again',
  'project.importSuccess': 'Import successful!',
  'project.importFailed': 'Import failed',
  'project.importRetry': 'Import failed, please try again',
  'project.conflictTitle': 'Data conflict detected',
  'project.conflictDesc': 'The following {n} items conflict with existing data:',
  'project.conflictHint': 'Choose "Overwrite" to update existing data with imported data, or "Skip" to only add non-conflicting new data.',
  'project.cancelImport': 'Cancel Import',
  'project.skipConflicts': 'Skip Conflicts',
  'project.overwriteImport': 'Overwrite Import',
  'project.nameMatch': '(name match)',
  'project.invalidFormat': 'Invalid file format',
  'project.unsupportedFormat': 'Unsupported file format (full export format required)',

  'dashboard.title': 'Dashboard',
  'dashboard.stats': 'Statistics',
  'dashboard.characters': 'Characters',
  'dashboard.chapters': 'Chapters',
  'dashboard.totalWords': 'Total Words',
  'dashboard.completionRate': 'Completion',
  'dashboard.activeForeshadows': 'Active Foreshadows',
  'dashboard.resolvedForeshadows': 'Resolved Foreshadows',
  'dashboard.goal': 'Writing Goal',
  'dashboard.goalSet': 'Set Goal',
  'dashboard.goalReached': '🎉 Goal reached!',
  'dashboard.goalRemain': 'remaining',
  'dashboard.quickActions': 'Quick Actions',
  'dashboard.chapterProgress': 'Chapter Progress',
  'dashboard.recentActivity': 'Recent Activity',
  'dashboard.backup': '💾 Data Safety',
  'dashboard.backupNow': 'Backup Now',
  'dashboard.exportReport': 'Export Report',
  'dashboard.restoreFile': 'Restore from File',
  'dashboard.viewBackups': 'View Backups',
  'dashboard.confirmRestore': 'Are you sure you want to restore from this backup? Current data will be overwritten.',
  'dashboard.restoreSuccess': 'Data restored successfully!',
  'dashboard.restoreFailed': 'Restore failed',
  'dashboard.createdEdited': 'Created {created} · Last edited {edited}',
  'dashboard.wordProgress': '{current} / {target} words',
  'dashboard.chaptersDone': '{done} / {total} chapters completed',
  'dashboard.emptyProject': 'This project is empty. Start adding content!',
  'dashboard.createFirstChar': '+ Create first character',
  'dashboard.writeFirstChapter': '+ Write first chapter',
  'dashboard.setGoal': 'Set Writing Goal',
  'dashboard.targetWordCount': 'Target Word Count',
  'dashboard.noBackups': 'No backup records',
  'dashboard.backupRecords': 'Backup Records',

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
  'char.arc': 'Character Arc',
  'char.voice': 'Voice Style',
  'char.alias': 'Alias',
  'char.location': 'Location',
  'char.secret': 'Secret',

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
  'chap.content': 'Chapter Content',
  'chap.draft': 'Draft Editor',

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

  // ===== New modules English =====
  'ai.title': 'AI Writing Assistant',
  'ai.tab.analyze': '📖 Text Analysis',
  'ai.tab.suggest': '💡 Writing Suggestions',
  'ai.tab.continue': '✍️ Chapter Continuation',
  'ai.tab.resources': '🔄 Resource Tracking',
  'ai.tab.consistency': '🔍 Consistency Check',
  'ai.tab.complete': '🌐 World Completion',
  'ai.tab.history': '📋 Operation History',
  'ai.tab.snapshots': '📜 Version Snapshots',
  'ai.tab.settings': '⚙️ Settings',
  'ai.tab.analyzeDesc': 'Import text, AI auto-extracts characters, world settings, and foreshadows',
  'ai.tab.suggestDesc': 'Get writing guidance based on current progress',
  'ai.tab.continueDesc': 'AI continues the next chapter based on previous content and settings',
  'ai.tab.resourcesDesc': 'Intelligently update character resource status based on chapter content',
  'ai.tab.consistencyDesc': 'Scan all text to detect setting contradictions',
  'ai.tab.completeDesc': 'AI infers and completes based on existing settings',
  'ai.tab.historyDesc': 'View all AI operation records',
  'ai.tab.snapshotsDesc': 'Data snapshots and version management',
  'ai.tab.settingsDesc': 'Configure API and model',
  'ai.inputText': 'Import Novel Text',
  'ai.chooseFile': '📁 Choose File',
  'ai.clearText': 'Clear',
  'ai.linkToChapter': 'Link to chapter',
  'ai.chapterNum': 'Ch.',
  'ai.chapterTitleOptional': 'Chapter title (optional)',
  'ai.willUpdateChapter': '(Will update existing chapter)',
  'ai.willCreateChapter': '(Will create new chapter)',
  'ai.pastePlaceholder': 'Paste your novel text here (supports .txt / .md file upload)\nAI will automatically identify characters, world settings, foreshadows, etc...',
  'ai.analyzing': '⏳ Analyzing...',
  'ai.startAnalyze': '🔍 Start Analysis',
  'ai.analysisResult': 'Analysis Results',
  'ai.applySelected': '✅ Apply Selected',
  'ai.applyComplete': '🎉 Applied!',
  'ai.textSummary': '📝 Text Summary',
  'ai.extractChars': '👤 Extracted Characters',
  'ai.extractSettings': '🌍 Extracted Settings',
  'ai.foundForeshadows': '🔮 Found Foreshadows',
  'ai.writingSuggestion': '💡 Writing Suggestions',
  'ai.noNewChars': 'No new characters extracted',
  'ai.noNewSettings': 'No new settings extracted',
  'ai.noForeshadows': 'No obvious foreshadows found',
  'ai.matchNew': 'New',
  'ai.matchUpdate': 'Update',
  'ai.matchDuplicate': 'Duplicate',
  'ai.matchExists': 'Exists',
  'ai.existingLabel': 'Existing: ',
  'ai.belongsTo': 'Belongs to: ',
  'ai.related': 'Related: ',
  'ai.selectChapter': 'Select Chapter',
  'ai.selectCharacter': 'Select Character',
  'ai.arcAnalysis': 'Character Arc Analysis',
  'ai.analyzeArc': 'Analyze Arc',
  'ai.arcResult': 'Character Arc Analysis',
  'ai.thinking': '⏳ Thinking...',
  'ai.getSuggestions': '💡 Get Suggestions',
  'ai.suggestionResult': 'Writing Suggestions',
  'ai.continueTitle': '✍️ AI Chapter Continuation',
  'ai.continueHint': 'Select the previous chapter, and AI will continue the next chapter based on existing content, character settings, and active foreshadows.',
  'ai.prevChapter': 'Previous Chapter',
  'ai.nextOutline': 'Next Chapter Outline (optional)',
  'ai.outlinePlaceholder': 'Briefly describe what should happen in the next chapter...',
  'ai.styleGuide': 'Writing Style Guide (optional)',
  'ai.stylePlaceholder': 'e.g. epic battle, mystery thriller, light daily life...',
  'ai.continuing': '⏳ Continuing...',
  'ai.startContinue': '✍️ Start Continuation',
  'ai.continueResult': 'Continuation Result',
  'ai.reasoning': '💡 Reasoning: ',
  'ai.saveAsChapter': '📖 Save as Chapter',
  'ai.consistencyTitle': '🔍 AI Consistency Check',
  'ai.consistencyHint': 'Scan all chapters, characters, foreshadows, and world settings to detect setting contradictions, timeline conflicts, etc.',
  'ai.checking': '⏳ Checking...',
  'ai.startCheck': '🔍 Start Check',
  'ai.consistencyScore': 'Consistency Score',
  'ai.summary': 'Summary: ',
  'ai.noIssues': '🎉 No obvious consistency issues found!',
  'ai.completeTitle': '🌐 AI World Completion',
  'ai.completeHint': 'AI analyzes existing world settings, detects logical gaps, suggests relations, and supplements details.',
  'ai.startComplete': '🌐 Start Analysis',
  'ai.noGaps': '✅ Existing settings are fairly complete',
  'ai.logicGap': 'Logic Gap',
  'ai.relationSuggest': 'Relation Suggestion',
  'ai.detailSuggest': 'Detail Supplement',
  'ai.historyTitle': '📋 AI Operation History',
  'ai.historyHint': 'All AI assistant operation records are displayed here for easy review and traceability.',
  'ai.noHistory': '📭 No operation records',
  'ai.historyCount': '📋 AI Operation History ({n} entries)',
  'ai.clearHistory': '🗑 Clear',
  'ai.confirmClearHistory': 'Clear all AI operation history?',
  'ai.snapshotsTitle': '📜 Version History',
  'ai.snapshotsHint': 'Create data snapshots and restore to any version at any time. Snapshots are stored locally in your browser, up to 50 max.',
  'ai.createSnapshot': '📸 Create Snapshot',
  'ai.refreshList': '🔄 Refresh List',
  'ai.snapshotCompare': 'Snapshot Comparison',
  'ai.selectSnapshotA': 'Select Snapshot A',
  'ai.selectSnapshotB': 'Select Snapshot B',
  'ai.compare': 'Compare',
  'ai.noSnapshots': 'No snapshots yet. Click "Create Snapshot" to save current data state.',
  'ai.snapshotLabel': 'Manual snapshot {date}',
  'ai.confirmRestoreSnapshot': 'Restore snapshot "{label}"? Current data will be overwritten.',
  'ai.restored': 'Data restored. Page will refresh.',
  'ai.confirmDeleteSnapshot': 'Delete this snapshot?',
  'ai.settingsTitle': 'API Configuration',
  'ai.settingsHint': 'Supports OpenAI-compatible API (you can fill in compatible endpoints from other providers like DeepSeek, Qwen, etc.)',
  'ai.apiUrl': 'API URL',
  'ai.apiKey': 'API Key',
  'ai.model': 'Model',
  'ai.saved': '✅ Saved',
  'ai.saveConfig': 'Save Config',
  'ai.configSecurity': 'API Key is only stored in your browser\'s local storage and will never be uploaded to any server.',
  'ai.analyzeFailed': 'Analysis failed',
  'ai.applyFailed': 'Apply failed',
  'ai.requestFailed': 'Request failed',
  'ai.continueFailed': 'Continuation failed',
  'ai.checkFailed': 'Check failed',
  'ai.completeFailed': 'Completion failed',
  'ai.resourceScan': 'Select a chapter, and AI will analyze the content to automatically detect changes in character resources/abilities (e.g. gaining new abilities, consuming items, etc.)',
  'ai.resourceScanHint': 'Select Chapter',
  'ai.pasteText': 'Or paste text directly',
  'ai.scanning': '⏳ Analyzing...',
  'ai.scanChanges': '🔍 Scan Resource Changes',
  'ai.detectedChanges': 'Detected {n} resource status changes',
  'ai.applyUpdate': 'Apply Updates',
  'ai.updated': '{n} resource statuses updated',
  'ai.clickToScan': 'Click scan to detect resource changes',
  'ai.analysisStats': 'Characters: +{ca} new / {cu} updated / +{cr} relations; Settings: +{wa} new / {wu} updated / +{wr} relations; Foreshadows: +{fa}',
  'ai.chapterStats': 'Chapters: {stats}',

  'outline.title': 'Outline Editor',
  'outline.new': '+ New Outline',
  'outline.addChild': 'Add Child',
  'outline.addSibling': 'Add Sibling',
  'outline.delete': 'Delete',
  'outline.edit': 'Edit',
  'outline.expandAll': 'Expand All',
  'outline.collapseAll': 'Collapse All',
  'outline.aiOptimize': 'AI Optimize',
  'outline.aiHint': 'AI analyzes outline structure and suggests improvements',
  'outline.generateFromChapters': 'Generate from Chapters',
  'outline.generateConfirm': 'Generate outline from existing chapters?',

  'tags.title': 'Tag Management',
  'tags.new': '+ New Tag',
  'tags.cloud': 'Tag Cloud',
  'tags.list': 'List',
  'tags.noTags': 'No tags',
  'tags.batchTag': 'Batch Tag',
  'tags.aiGenerate': 'AI Generate Tags',
  'tags.aiHint': 'Auto-generate category tags based on project content',

  'calendar.title': 'Writing Calendar',
  'calendar.noData': 'No writing records',
  'calendar.wordCount': 'Words',
  'calendar.less': 'Less',
  'calendar.more': 'More',

  'relation.type': 'Relation Type',
  'relation.direction': 'Direction',
  'relation.bidirectional': 'Bidirectional',
  'relation.unidirectional': 'Unidirectional',
  'relation.public': 'Public',
  'relation.secret': 'Secret',
  'relation.target': 'Target',

  'breadcrumb.projects': 'Projects',
  'breadcrumb.dashboard': 'Dashboard',
  'breadcrumb.outline': 'Outline Editor',
  'breadcrumb.characters': 'Characters',
  'breadcrumb.chapters': 'Chapters',
  'breadcrumb.foreshadows': 'Foreshadow Tracking',
  'breadcrumb.timeline': 'Chapter Timeline',
  'breadcrumb.worldsettings': 'World Settings',
  'breadcrumb.resources': 'Resource Tracking',
  'breadcrumb.templates': 'Templates & Import/Export',
  'breadcrumb.tags': 'Tag Management',
  'breadcrumb.ai': 'AI Assistant',
  'breadcrumb.about': 'About',

  'quick.newChar': 'New Character',
  'quick.newChapter': 'New Chapter',
  'quick.newForeshadow': 'New Foreshadow',
  'quick.newSetting': 'New Setting',
  'quick.templates': 'Templates',

  'relType.friend': 'Friend',
  'relType.enemy': 'Enemy',
  'relType.lover': 'Lover',
  'relType.family': 'Family',
  'relType.mentor': 'Mentor',
  'relType.student': 'Student',
  'relType.colleague': 'Colleague',
  'relType.rival': 'Rival',
  'relType.master': 'Master',
  'relType.servant': 'Servant',
  'relType.other': 'Other',

  'resType.ability': 'Ability',
  'resType.item': 'Item',
  'resType.cost': 'Cost',
  'resType.other': 'Other',

  'export.docx': 'DOCX Document',
  'export.pdf': 'PDF Document',
  'export.epub': 'EPUB eBook',
  'export.includeAppendix': 'Include character appendix',
  'export.exporting': 'Exporting...',

  'shortcut.title': 'Shortcuts',
  'shortcut.globalSearch': 'Global Search',
  'shortcut.toggleTheme': 'Toggle Theme',
  'shortcut.undo': 'Undo',
  'shortcut.redo': 'Redo',
  'shortcut.save': 'Save',
  'shortcut.newItem': 'New Item',
  'shortcut.close': 'Close Panel',
  'shortcut.pressHint': 'Press ? to view all shortcuts',

  'about.tagline': 'Local-first novel writing & worldbuilding tool',
  'about.author': 'Author',
  'about.authorName': 'Author',
  'about.license': 'License',
  'about.techStack': 'Tech Stack',
  'about.usage': 'Usage Guide',
  'about.usage1': 'All data is stored in browser IndexedDB — no registration, no internet required',
  'about.usage2': 'Export your work as JSON for backup, and import to restore or migrate anytime',
  'about.usage3': 'Available on Web, Windows/Mac/Linux desktop, and Android — truly cross-platform',
  'about.usage4': 'Built-in AI writing assistant with OpenAI-compatible API support (DeepSeek, Qwen, etc.)',
  'about.usage5': 'Desktop version features system tray, auto-save (every 60s), and crash recovery',
  'about.shortcuts': 'Keyboard Shortcuts',
  'about.shortcutSearch': 'Global Search',
  'about.shortcutUndo': 'Undo',
  'about.shortcutRedo': 'Redo',
  'about.shortcutPanel': 'View all shortcuts',
  'about.privacy': 'Data Privacy',
  'about.privacyText': 'All your creative content is stored locally and never uploaded to any server. AI features require your own API key, and conversations are only sent to your specified endpoint. We do not collect, store, or share any of your creative work.',
  'about.builtWith': 'Built with',
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
