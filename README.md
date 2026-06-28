# Novel InaKB — 小说·伊纳知识库

> 让创作者可视化、关联管理自己的世界观设定。本地优先，开箱即用。内置 AI 写作助手。

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.1-646CFF?logo=vite)](https://vite.dev/)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)
[![Build & Release](https://github.com/ly-ina/InaWrite/actions/workflows/release.yml/badge.svg)](https://github.com/ly-ina/InaWrite/actions/workflows/release.yml)

<p align="center">
  <img src="https://img.shields.io/badge/状态-活跃开发-brightgreen" alt="status" />
  <img src="https://img.shields.io/badge/平台-Web%20|%20桌面%20|%20Android-blue" alt="platform" />
  <img src="https://img.shields.io/badge/AI-OpenAI%20兼容-orange" alt="ai" />
  <img src="https://img.shields.io/badge/版本-v1.4%20(code%205)-purple" alt="version" />
</p>

---

## 📖 简介

**Novel InaKB**（InaWrite）是专为小说作者、世界构建爱好者和跑团设定者打造的本地知识库管理工具。它帮助你在一个统一的界面中管理角色、章节、伏笔、世界观设定和资源能力，并通过关系图谱、看板视图、树形结构等方式可视化你的创作世界。

### ✨ 为什么选择 Novel InaKB？

- 🏠 **本地优先** — 所有数据存储在浏览器 IndexedDB 中，无需服务器、无需注册、无需网络
- 🤖 **AI 写作助手** — 上传文本自动提取角色/世界观/伏笔，智能去重对比，选择性应用
- 🎨 **专业设计** — 暗色/亮色双主题，墨水羊皮纸风格，Noto 专业字体
- 📦 **灵活导入** — 支持 JSON 数组/单对象/完整导出三种格式，智能按名称匹配更新
- 🔗 **关联管理** — 角色关系图谱、章节与伏笔追踪、世界观设定层级树与关联图谱
- ⌨️ **键盘友好** — Ctrl+K 全局搜索、Ctrl+Z/Y 撤销重做、快捷键操作
- 📱 **全平台覆盖** — Web 浏览器、Windows 桌面应用、Android APK
- 🔄 **OTA 更新** — 应用内检测新版本，一键下载覆盖安装（数据保留）
- 🏷️ **标签系统** — 全局标签管理，AI 自动生成，跨模块筛选

---

## 🚀 快速开始

### 环境要求

- **Node.js** >= 18
- **npm** >= 9

### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/ly-ina/InaWrite.git
cd InaWrite/novel-kb

# 安装依赖
npm install

# 启动开发服务器
npm run dev
# → http://localhost:5173
```

### 生产构建

```bash
npm run build    # 输出到 dist/
npm run preview  # 预览生产构建
```

### 桌面应用（Electron）

```bash
npm run electron:install   # 首次安装 Electron（约 200MB，使用国内镜像）
npm run electron:dev       # 开发模式
npm run electron:build:win # 打包 Windows 版
```

### Android APK

```bash
npm run android:build      # 打包 Debug APK
python scripts/build.py android  # 打包 Release APK（推荐）
```

---

## 🏗️ 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | **React 19** + **TypeScript 6** | 类型安全，便于维护扩展 |
| 构建工具 | **Vite 8** | 极速 HMR 热更新 |
| 状态管理 | **Zustand 5** | 轻量级，无 boilerplate |
| 路由 | **React Router 7** | 客户端 SPA 路由 |
| 数据持久化 | **IndexedDB** (via **idb**) | 浏览器本地数据库 |
| 关系图谱 | **D3.js 7** | 力导向图可视化 |
| Markdown | **react-markdown** + **remark-gfm** | 编辑预览、GFM 语法支持 |
| AI 集成 | **OpenAI 兼容 API** | 支持任意 LLM 服务商 |
| 桌面应用 | **Electron 36** | 跨平台桌面端 |
| 移动端 | **Capacitor 8** | Android APK 打包 |
| 字体 | **Noto Serif SC** / **Noto Sans SC** / **JetBrains Mono** | 专业中文字体 |

---

## 📂 项目结构

```
novel-kb/
├── public/
│   ├── favicon.svg
│   ├── mobile.css           # 移动端全局样式
│   └── sw.js                # PWA Service Worker
├── src/
│   ├── components/           # 通用组件
│   │   ├── Layout.tsx         # 主布局（侧边栏 + 面包屑 + 内容区）
│   │   ├── SearchableSelect.tsx # 可搜索选择器（替代原生 select）
│   │   ├── GlobalSearch.tsx   # 全局搜索（Ctrl+K）
│   │   ├── ConfirmDialog.tsx  # 通用确认弹窗
│   │   ├── MarkdownEditor.tsx # Markdown 编辑器（编辑/预览切换）
│   │   ├── RelationGraph.tsx  # D3 角色关系图谱
│   │   ├── SettingGraph.tsx   # D3 世界观关联图谱
│   │   └── WritingCalendar.tsx # 写作日历热力图
│   ├── pages/                # 页面组件
│   │   ├── Projects.tsx       # 作品列表管理
│   │   ├── Dashboard.tsx      # 作品概览面板
│   │   ├── Characters.tsx     # 角色管理（含标签筛选/批量操作/关系编辑）
│   │   ├── Chapters.tsx       # 章节管理（含排序/跳转）
│   │   ├── Timeline.tsx       # 章节时间线
│   │   ├── Foreshadows.tsx    # 伏笔追踪看板（拖拽+可搜索筛选）
│   │   ├── WorldSettings.tsx  # 世界观设定
│   │   ├── Resources.tsx      # 资源/能力追踪
│   │   ├── Templates.tsx      # 模板与导入导出中心
│   │   ├── Tags.tsx           # 全局标签管理
│   │   ├── AIAssistant.tsx    # AI 写作助手
│   │   └── About.tsx          # 关于页面（含版本检测）
│   ├── i18n/                 # 多语言国际化
│   ├── store/                # Zustand 状态管理
│   ├── db/
│   │   └── database.ts        # IndexedDB 封装层（5 个 Object Store + tags + tagAssignments）
│   ├── types/
│   │   └── index.ts           # TypeScript 类型定义
│   ├── utils/
│   │   ├── aiService.ts       # AI 服务层
│   │   ├── importExport.ts    # JSON 导入导出
│   │   ├── validation.ts      # 引用完整性检查
│   │   ├── backup.ts          # 数据备份恢复
│   │   ├── templates.ts       # 模板生成器
│   │   ├── exportFormats.ts   # PDF/DOCX/EPUB 导出
│   │   ├── updater.ts         # OTA 更新检测（区分 PC/Android）
│   │   └── electronBridge.ts  # Electron IPC 桥接
│   ├── App.tsx                # 路由配置 + OTA 更新弹窗
│   └── main.tsx               # 应用入口
├── electron/               # Electron 桌面应用
│   ├── main.ts              # 主进程（窗口/托盘/IPC/自动保存/崩溃恢复）
│   └── preload.ts           # 预加载脚本
├── android/                 # Android 项目（Capacitor）
├── scripts/
│   ├── build.py             # 智能打包脚本（源码哈希去重）
│   ├── bump-version.py      # 版本号自动递增
│   └── rename-electron.cjs  # Electron .js → .cjs 重命名
├── .github/workflows/
│   └── release.yml          # GitHub Actions 自动构建发布
├── vite.config.ts
├── electron-builder.yml
├── package.json
└── README.md
```

---

## 🎯 功能模块

### 📚 作品项目管理
- 创建/删除多个小说作品，每个项目数据完全独立
- 项目卡片网格展示
- 智能导入：支持三种 JSON 格式，自动去注释，按名称匹配更新

### 🏠 作品 Dashboard
- 6 项数据统计卡片 + 章节进度条 + 最近动态
- 快捷操作入口

### 👤 角色管理
- 双栏布局：左侧列表（搜索 + 多选标签/种族/所在地/状态筛选）+ 右侧详情
- **标签系统联动**：角色可关联全局标签，支持筛选和详情中快捷打标签
- **SearchableSelect 组件**：种族/所在地/标签筛选均支持搜索
- 批量操作：多选角色，批量改状态、批量删除
- 完整字段：姓名、别名、种族、年龄、外貌、性格、所在地、弧光、秘密、语言风格
- Markdown 描述 + 关系编辑（10 种类型）+ 资源/能力编辑
- D3.js 关系图谱

### 📖 章节管理
- 章节列表（支持 **正序/倒序** 切换 + **跳转** 到指定章号）
- 状态筛选（草稿/修订中/已完成）
- CRUD + 关键事件 + 关联角色/伏笔

### 🔮 伏笔追踪看板
- 四列看板 + 拖拽切换状态
- **可搜索筛选器**：按章节/角色搜索（SearchableSelect 组件）
- 移动端优化布局

### 🌍 世界观设定
- 树形/分类双视图 + 关联图谱 + 级联删除

### 💎 资源/能力追踪
- 按角色/全局表格双视图

### 🏷️ 标签系统
- 全局标签管理 + 标签云 + AI 自动生成
- 批量打标签（角色/章节/伏笔/设定）
- 与角色管理联动：筛选 + 快捷打标签

### 🤖 AI 写作助手
- 文本分析、创作建议、章节续写、一致性检查、世界观补全
- OpenAI 兼容 API，支持 DeepSeek、通义千问等

### 🔍 全局搜索
- Ctrl+K 跨模块模糊搜索

### ↩️ 撤销/重做
- Ctrl+Z/Y，最多 100 条记录

### 🔄 OTA 更新
- 应用启动自动检测 GitHub Release 新版本
- PC/Android 平台分离检测
- "不再提醒"选项 + 关于页面手动检测

---

## 📊 数据模型

```
Project
 ├── Character (角色) — 含 Relation / Resource / 全局标签关联
 ├── Chapter (章节) — 含出场角色 / 伏笔关联
 ├── Foreshadow (伏笔) — 含首次出现章节 / 关联角色
 ├── WorldSetting (世界观设定) — 含层级 / 设定间关联
 ├── Tag (全局标签) — 跨模块关联
 └── TagAssignment (标签分配) — 多对多关联
```

---

## 🎨 设计系统

| 属性 | 暗色主题 | 亮色主题 |
|------|----------|----------|
| 背景色 | `#0d0d0d` ~ `#1a1a1a` | `#faf8f5` ~ `#ffffff` |
| 主文字 | `#e8e4dd` | `#2c2416` |
| 强调色 | `#c9a96e` (金褐) | `#8b6914` (深褐) |
| 标题字体 | Noto Serif SC | Noto Serif SC |
| 正文字体 | Noto Sans SC | Noto Sans SC |

---

## 📦 发布流程

### 自动发布（GitHub Actions）

推送 tag 即可自动构建并发布到 GitHub Release：

```bash
# 1. 本地递增版本号
python scripts/bump-version.py

# 2. 提交并推送
git add android/app/build.gradle src/utils/updater.ts
git commit -m "chore: bump version"
git push

# 3. 打 tag 触发自动构建
git tag -a v1.5 -m versionCode6
git push origin v1.5
```

GitHub Actions 会自动构建 Android APK + PC EXE 并发布到 Release 页面。

### 本地打包

```bash
python scripts/build.py check    # 检查是否需要打包
python scripts/build.py android  # 打包 Android
python scripts/build.py pc       # 打包 PC
python scripts/build.py all      # 全部打包
```

---

## 🗺️ 路线图

### ✅ 已完成

- [x] 项目管理 + IndexedDB 存储
- [x] 角色管理（CRUD + 关系图谱 + 批量操作 + 标签联动）
- [x] 章节管理（CRUD + 排序/跳转 + 伏笔关联）
- [x] 章节时间线视图
- [x] 伏笔追踪看板（四列 Kanban + 拖拽 + 可搜索筛选）
- [x] 世界观设定（树形/分类双视图 + 关联图谱）
- [x] 资源/能力追踪
- [x] 智能导入导出
- [x] 全局搜索 + 撤销/重做
- [x] Markdown 编辑器 + 暗色/亮色主题
- [x] AI 写作助手（分析/建议/续写/一致性检查/世界观补全）
- [x] 大纲编辑器（树形结构 + AI 优化）
- [x] 标签系统（全局标签 + AI 生成 + 跨模块筛选）
- [x] SearchableSelect 通用组件
- [x] 导出增强（PDF/DOCX/EPUB）
- [x] 模板系统 + 创作报告
- [x] Electron 桌面应用
- [x] 移动端适配 + Android APK
- [x] OTA 更新检测（PC/Android 分离）
- [x] GitHub Actions 自动构建发布

### 🔜 计划中

- [ ] 云同步增强（OneDrive/Google Drive/Dropbox）
- [ ] 端到端加密
- [ ] 社区模板市场
- [ ] iOS 支持

---

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

### 开发约定

- TypeScript 严格模式
- 函数式组件 + Hooks
- CSS Modules（`*.module.css`）
- Zustand 状态管理
- 代码注释使用中文

---

## 📄 许可证

MIT License © 2026

---

## 🙏 致谢

- [React](https://react.dev/) — UI 框架
- [Vite](https://vite.dev/) — 构建工具
- [D3.js](https://d3js.org/) — 数据可视化
- [Zustand](https://github.com/pmndrs/zustand) — 状态管理
- [Electron](https://www.electronjs.org/) — 桌面应用
- [Capacitor](https://capacitorjs.com/) — 移动端
- [idb](https://github.com/jakearchibald/idb) — IndexedDB 封装
- [Google Fonts](https://fonts.google.com/) — Noto 字体家族
- [OpenAI](https://openai.com/) — AI 能力支持
