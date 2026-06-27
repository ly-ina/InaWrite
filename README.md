# Novel KB — 小说知识库

> 让创作者可视化、关联管理自己的世界观设定。本地优先，开箱即用。

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.1-646CFF?logo=vite)](https://vite.dev/)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

<p align="center">
  <img src="https://img.shields.io/badge/状态-开发中-yellow" alt="status" />
  <img src="https://img.shields.io/badge/平台-Web%20|%20桌面-blue" alt="platform" />
</p>

---

## 📖 简介

**Novel KB** 是专为小说作者、世界构建爱好者和跑团设定者打造的本地知识库管理工具。它帮助你在一个统一的界面中管理角色、章节、伏笔、世界观设定和资源能力，并通过关系图谱、看板视图、树形结构等方式可视化你的创作世界。

### ✨ 为什么选择 Novel KB？

- 🏠 **本地优先** — 所有数据存储在浏览器 IndexedDB 中，无需服务器、无需注册、无需网络
- 🎨 **专业设计** — 暗色/亮色双主题，墨水羊皮纸风格，Noto 专业字体
- 📦 **JSON 导入导出** — 完整的导入导出机制，含冲突检测与合并策略，方便数据迁移和 AI 协作
- 🔗 **关联管理** — 角色关系图谱、章节与伏笔追踪、世界观设定层级树，一切互相关联
- ⌨️ **键盘友好** — Ctrl+K 全局搜索、Ctrl+Z/Y 撤销重做、快捷键操作

---

## 🚀 快速开始

### 环境要求

- **Node.js** >= 18
- **npm** >= 9

### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/ly-ina/InaWrite.git
cd InaWrite

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 浏览器访问
# http://localhost:5173
```

### 生产构建

```bash
npm run build    # 输出到 dist/
npm run preview  # 预览生产构建
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
| 字体 | **Noto Serif SC** / **Noto Sans SC** / **JetBrains Mono** | 专业中文字体 |

---

## 📂 项目结构

```
novel-kb/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/           # 通用组件
│   │   ├── Layout.tsx         # 主布局（侧边栏 + 面包屑 + 内容区）
│   │   ├── GlobalSearch.tsx   # 全局搜索（Ctrl+K）
│   │   ├── ShortcutPanel.tsx  # 快捷键面板（按 ?）
│   │   ├── MarkdownEditor.tsx # Markdown 编辑器（编辑/预览切换）
│   │   ├── RelationGraph.tsx  # D3 角色关系图谱
│   │   └── SettingGraph.tsx   # D3 世界观关联图谱
│   ├── pages/                # 页面组件
│   │   ├── Projects.tsx       # 作品列表管理
│   │   ├── Dashboard.tsx      # 作品概览面板
│   │   ├── Characters.tsx     # 角色管理
│   │   ├── Chapters.tsx       # 章节管理
│   │   ├── Timeline.tsx       # 章节时间线（拖拽排序）
│   │   ├── Foreshadows.tsx    # 伏笔追踪看板
│   │   ├── WorldSettings.tsx  # 世界观设定
│   │   └── Resources.tsx      # 资源/能力追踪
│   ├── store/                # Zustand 状态管理
│   │   ├── appStore.ts        # 全局状态（项目、主题、侧边栏）
│   │   ├── projectStore.ts    # 项目 CRUD
│   │   ├── characterStore.ts  # 角色 CRUD
│   │   ├── chapterStore.ts    # 章节 CRUD
│   │   ├── foreshadowStore.ts # 伏笔 CRUD
│   │   ├── worldSettingStore.ts # 世界观设定 CRUD
│   │   └── undoStore.ts       # 撤销/重做历史栈
│   ├── db/
│   │   └── database.ts        # IndexedDB 封装层（5 个 Object Store）
│   ├── types/
│   │   └── index.ts           # 全部 TypeScript 类型定义
│   ├── utils/
│   │   ├── importExport.ts    # JSON 导入导出（含冲突检测）
│   │   ├── validation.ts      # 引用完整性检查与清理
│   │   └── backup.ts          # 数据备份恢复 + 创作报告生成
│   ├── styles/
│   │   └── global.css         # 全局样式（暗色/亮色 CSS 变量）
│   ├── App.tsx                # 路由配置
│   ├── main.tsx               # 应用入口
│   └── vite-env.d.ts          # Vite 类型声明
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 🎯 功能模块

### 📚 作品项目管理

- 创建/删除多个小说作品，每个项目数据完全独立
- 项目卡片网格展示（封面、标题、简介、最后编辑时间）
- **JSON 导入/导出**：导出完整项目数据为 JSON 文件，导入时自动检测 ID 冲突，支持「覆盖」和「跳过」两种合并策略

### 🏠 作品 Dashboard

- 6 项数据统计卡片：角色数、章节数、总字数、完成率、进行中伏笔、已回收伏笔
- 章节进度条、最近编辑动态
- 快捷操作入口（新建角色/章节/伏笔/设定）

### 👤 角色管理

- 双栏布局：左侧列表（搜索 + 种族/状态筛选）+ 右侧详情
- **批量操作**：多选角色，批量改状态、批量删除
- 完整 CRUD：姓名、种族、年龄、外貌、性格、状态标签
- **Markdown 描述**：支持编辑/预览切换，GFM 语法
- **关系编辑**：添加/删除与其他角色的关系（自定义关系类型）
- **资源/能力编辑**：为角色添加武器、技能、魔法、道具等，含代价说明
- **关系图谱**：D3.js 力导向图，展示角色关系网络，支持缩放和拖拽
- 删除时自动检查引用完整性，清理章节、伏笔、其他角色关系中的悬空引用

### 📖 章节管理

- 章节列表（按序号排序）+ 状态筛选（草稿/修订中/已完成）
- CRUD：序号、标题、字数、写作状态、内容摘要
- **关键事件**：每行一个，列表展示
- **关联出场角色**：从已创建角色中多选
- **伏笔追踪**：关联新增伏笔和回收伏笔

### 🔮 伏笔追踪看板

- **四列看板**：未触发 / 进行中 / 已回收 / 已放弃
- 每张卡片显示内容预览、首次出现章节、相关角色
- 快速状态切换按钮（一键拖拽式流转）
- 详情弹窗支持完整编辑

### 🌍 世界观设定

- **递归树形结构**：支持无限层级（世界 → 大陆 → 国家 → 城市...）
- 6 种类型分类：📍 地点 / 👥 种族 / 🗡️ 物品 / 💡 概念 / 📜 历史 / 🏷️ 自定义
- 树节点展开/折叠，搜索时自动展开匹配路径
- **设定间关联**：添加/删除与其他设定的关系
- 父级面包屑导航、子设定列表
- **级联删除**：删除设定时自动处理子设定和关联
- Markdown 描述支持

### 💎 资源/能力追踪

- **双视图切换**：按角色查看 / 全局资源表
- 全局表格按类型筛选，支持点击角色名跳转
- 资源卡片展示：名称、类型、描述、代价

### 🔍 全局搜索

- 快捷键 **Ctrl+K** 打开搜索面板
- 跨模块模糊搜索：角色名、章节标题、伏笔内容、设定名称
- 键盘上下选择 + 回车跳转

### ↩️ 撤销/重做

- 命令模式历史栈，最多保存 100 条操作记录
- **Ctrl+Z** 撤销、**Ctrl+Y** 重做

---

## 📊 数据模型

所有数据以「作品（Project）」为顶级容器，每个作品下包含独立的数据集：

```
Project
 ├── Character (角色)
 │    ├── Relation (角色间关系)
 │    └── Resource (拥有的资源/能力)
 ├── Chapter (章节)
 ├── Foreshadow (伏笔)
 └── WorldSetting (世界观设定)
      └── SettingRelation (设定间关联)
```

详见 [`src/types/index.ts`](./src/types/index.ts)。

---

## 🎨 设计系统

| 属性 | 暗色主题 | 亮色主题 |
|------|----------|----------|
| 背景色 | `#0d0d0d` ~ `#1a1a1a` | `#faf8f5` ~ `#ffffff` |
| 主文字 | `#e8e4dd` | `#2c2416` |
| 强调色 | `#c9a96e` (金褐) | `#8b6914` (深褐) |
| 标题字体 | Noto Serif SC | Noto Serif SC |
| 正文字体 | Noto Sans SC | Noto Sans SC |
| 代码字体 | JetBrains Mono | JetBrains Mono |

设计灵感源自墨水与羊皮纸的书写工具感，适合长时间写作场景。

---

## 🔌 AI 集成方案

Novel KB 支持通过 JSON 文件与 AI 写作助手协作：

1. **导出项目** → 获得完整的 JSON 数据文件
2. **AI 生成内容** → 按数据模型格式生成角色/章节/伏笔等数据
3. **导入 JSON** → 工具自动检测冲突，支持覆盖或跳过策略

后续计划支持文件监听自动导入（检测 Markdown 变更自动更新数据库）。

---

## 🗺️ 路线图

### ✅ 已完成

- [x] 项目管理 + IndexedDB 存储
- [x] 角色管理（CRUD + 关系图谱 D3 + 批量操作）
- [x] 章节管理（CRUD + 伏笔关联）
- [x] **章节时间线视图**（拖拽排序 + 角色筛选 + 伏笔可视化）
- [x] 伏笔追踪看板（四列 Kanban）
- [x] 世界观设定树 + **关联图谱 D3**
- [x] 资源/能力追踪（按角色/全局表格双视图）
- [x] JSON 导入导出（含冲突检测）
- [x] 全局搜索（Ctrl+K）
- [x] 撤销/重做（Ctrl+Z/Y）
- [x] 引用完整性检查 + 悬空引用清理
- [x] Markdown 编辑器（编辑/预览切换）
- [x] 暗色/亮色主题切换
- [x] **快捷键面板**（按 ? 查看所有快捷键）
- [x] **写作目标追踪**（自定义字数目标 + 进度条）
- [x] **数据备份与恢复**（localStorage 自动备份 + 手动备份 + 文件恢复）
- [x] **创作报告导出**（Markdown 格式统计报告）

### 🚧 计划中

- [ ] Markdown 文件监听自动导入（检测文件变更自动更新数据库）
- [ ] Electron 桌面应用打包（Windows/Mac 独立应用）
- [ ] 多语言支持（中文/英文切换）
- [ ] 性能优化（虚拟滚动、懒加载）
- [ ] 角色时间线弧光（按章节展示角色成长轨迹）
- [ ] 章节拖拽排序（可视化调整章节顺序）
- [ ] 数据同步（WebDAV / GitHub Gist 云端同步）
- [ ] 模板系统（预设世界观/角色模板快速创建）

---

## 🤝 贡献指南

欢迎贡献！请遵循以下流程：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

### 开发约定

- 使用 TypeScript 严格模式
- 组件使用函数式组件 + Hooks
- 样式使用 CSS Modules（`*.module.css`）
- 状态管理使用 Zustand
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
- [idb](https://github.com/jakearchibald/idb) — IndexedDB 封装
- [react-markdown](https://github.com/remarkjs/react-markdown) — Markdown 渲染
- [Google Fonts](https://fonts.google.com/) — Noto 字体家族
