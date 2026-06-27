# Novel InaKB — 小说·伊纳知识库

> 让创作者可视化、关联管理自己的世界观设定。本地优先，开箱即用。内置 AI 写作助手。

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.1-646CFF?logo=vite)](https://vite.dev/)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

<p align="center">
  <img src="https://img.shields.io/badge/状态-活跃开发-brightgreen" alt="status" />
  <img src="https://img.shields.io/badge/平台-Web%20|%20桌面%20|%20Android-blue" alt="platform" />
  <img src="https://img.shields.io/badge/AI-OpenAI%20兼容-orange" alt="ai" />
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
- 📱 **全平台覆盖** — Web 浏览器、Windows/Mac/Linux 桌面应用、Android APK

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
| AI 集成 | **OpenAI 兼容 API** | 支持任意 LLM 服务商 |
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
│   │   ├── SettingGraph.tsx   # D3 世界观关联图谱（箭头+筛选）
│   │   ├── WritingCalendar.tsx # 写作日历热力图
│   │   └── LazyLoad.tsx       # 懒加载/虚拟滚动优化
│   ├── pages/                # 页面组件
│   │   ├── Projects.tsx       # 作品列表管理
│   │   ├── Dashboard.tsx      # 作品概览面板
│   │   ├── Characters.tsx     # 角色管理（含关系/资源编辑）
│   │   ├── Chapters.tsx       # 章节管理
│   │   ├── Timeline.tsx       # 章节时间线（拖拽排序）
│   │   ├── Foreshadows.tsx    # 伏笔追踪看板（拖拽+筛选）
│   │   ├── WorldSettings.tsx  # 世界观设定（树形/分类双视图）
│   │   ├── Resources.tsx      # 资源/能力追踪（编辑+状态标签）
│   │   ├── Templates.tsx      # 模板与导入导出中心
│   │   └── AIAssistant.tsx    # AI 写作助手
│   ├── i18n/                 # 多语言国际化
│   │   └── index.tsx          # i18n Context + 中英文字典
│   ├── store/                # Zustand 状态管理
│   │   ├── appStore.ts        # 全局状态（项目、主题、侧边栏、刷新触发）
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
│   │   ├── aiService.ts       # AI 服务层（LLM 调用/Prompt 模板/分析引擎/智能去重）
│   │   ├── importExport.ts    # JSON 导入导出（智能匹配+注释兼容+三种格式）
│   │   ├── validation.ts      # 引用完整性检查与清理
│   │   ├── backup.ts          # 数据备份恢复 + 创作报告生成
│   │   ├── templates.ts       # 模板生成器（空值占位+字段注释）
│   │   ├── sync.ts            # 数据同步（WebDAV / GitHub Gist）
│   │   ├── diff.ts            # 差异对比 + 三路合并
│   │   ├── plugin.ts          # 插件系统（自定义导入解析器）
│   │   └── fileWatcher.ts     # Markdown 文件监听自动导入
│   ├── styles/
│   │   └── global.css         # 全局样式（暗色/亮色 CSS 变量 + body 主题同步）
│   ├── App.tsx                # 路由配置
│   ├── main.tsx               # 应用入口
│   └── vite-env.d.ts          # Vite 类型声明
├── electron/               # Electron 桌面应用
│   ├── main.ts              # 主进程（窗口/托盘/IPC/自动保存/崩溃恢复）
│   └── preload.ts           # 预加载脚本（contextBridge）
├── android/                 # Android 项目（Capacitor）
│   └── app/                 # Android 应用源码
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
- **智能导入**：支持 JSON 数组/单对象/完整导出三种格式，自动去除注释，按名称智能匹配更新
- **冲突检测**：导入时检测 ID/名称冲突，支持覆盖/跳过策略

### 🏠 作品 Dashboard

- 6 项数据统计卡片：角色数、章节数、总字数、完成率、进行中伏笔、已回收伏笔
- 章节进度条、最近编辑动态
- 快捷操作入口（新建角色/章节/伏笔/设定）

### 👤 角色管理

- 双栏布局：左侧列表（搜索 + 种族/状态筛选）+ 右侧详情
- **批量操作**：多选角色，批量改状态、批量删除
- 完整字段：姓名、别名、种族、年龄、外貌、性格、当前所在地、角色弧光、秘密、语言风格
- **Markdown 描述**：支持编辑/预览切换，GFM 语法
- **关系编辑**：添加/删除与其他角色的关系（10 种预设类型 + 自定义，单向/双向，公开/秘密）
- **资源/能力编辑**：完整 CRUD，含名称、类型（能力/物品/代价/其他）、状态、描述、获取时间、代价
- **关系图谱**：D3.js 力导向图，展示角色关系网络，支持缩放和拖拽
- 删除时自动检查引用完整性

### 📖 章节管理

- 章节列表（按序号排序）+ 状态筛选（草稿/修订中/已完成）
- CRUD：序号、标题、字数、写作状态、内容摘要
- **关键事件**：每行一个，列表展示
- **关联出场角色**：从已创建角色中多选
- **伏笔追踪**：关联新增伏笔和回收伏笔

### 🔮 伏笔追踪看板

- **四列看板**：未触发 / 进行中 / 已回收 / 已放弃
- **拖拽切换**：直接拖拽卡片到目标列更改状态
- **筛选功能**：按章节筛选、按角色筛选
- 每张卡片显示内容预览、首次出现章节、关联角色
- 详情弹窗支持完整编辑

### 🌍 世界观设定

- **双视图切换**：树形层级 / 按类型分组
- 6 种类型分类：📍 地点 / 👥 种族 / 🗡️ 物品 / 💡 概念 / 📜 历史 / 🏷️ 自定义
- 树节点展开/折叠，搜索时自动展开匹配路径
- **设定间关联**：添加/删除与其他设定的关系
- 父级面包屑导航、子设定列表
- **级联删除**：删除设定时自动处理子设定和关联
- **关联图谱**：D3 力导向图，含方向箭头、节点大小分级、类型筛选、关联视图

### 💎 资源/能力追踪

- **双视图切换**：按角色查看 / 全局资源表
- 资源卡片展示：名称、类型、状态标签（四色）、描述、获取时间、代价
- **完整编辑**：新增/编辑表单含类型 select、状态 select、获取时间字段
- 全局表格按类型筛选，支持点击角色名跳转

### 🤖 AI 写作助手

- **📖 文本分析**：上传/粘贴小说文本，AI 自动提取角色、世界观设定、伏笔
  - 智能去重对比：标记新增/更新/重复，支持逐项勾选应用
  - 自动提取角色关系（10 种类型 + 方向 + 公开性）
  - 自动提取世界观关联（层级 + 关联类型）
  - 自动关联伏笔到已有角色
- **💡 创作建议**：根据当前进度获取情节/角色/伏笔/写作技巧建议
- **🔄 资源追踪**：根据章节内容智能检测角色资源状态变化
- **📊 角色弧光**：分析角色成长轨迹，给出转折点建议
- **⚙️ 多模型支持**：OpenAI 兼容 API，可接入 DeepSeek、通义千问等

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
 │    ├── Relation (角色间关系：类型/方向/公开性)
 │    └── Resource (拥有的资源/能力：类型/状态/代价)
 ├── Chapter (章节)
 │    ├── 出场角色 ID
 │    ├── 新增/回收伏笔 ID
 │    └── 关键事件列表
 ├── Foreshadow (伏笔)
 │    ├── 首次出现章节
 │    └── 关联角色 ID
 └── WorldSetting (世界观设定)
      ├── 父级设定（层级结构）
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

设计灵感源自墨水与羊皮纸的书写工具感，适合长时间写作场景。主题切换自动同步 body 背景色。

---

## 🔌 AI 集成方案

Novel InaKB 内置 AI 写作助手，支持两种协作方式：

### 方式一：在线 AI 分析（推荐）

1. 在 **AI 助手 → 设置** 中配置 OpenAI 兼容 API（支持 DeepSeek、通义千问等）
2. 上传或粘贴小说文本，AI 自动提取并对比分析
3. 在对比视图中逐项勾选需要应用的数据
4. 一键写入数据库，自动关联关系

### 方式二：JSON 文件协作

1. **导出项目** → 获得完整的 JSON 数据文件
2. **AI 生成内容** → 按数据模型格式生成角色/章节/伏笔等数据
3. **导入 JSON** → 支持数组/单对象/完整导出三种格式，自动智能匹配

---

## 🗺️ 路线图

### ✅ 已完成

- [x] 项目管理 + IndexedDB 存储
- [x] 角色管理（CRUD + 关系图谱 D3 + 批量操作 + 完整字段）
- [x] 章节管理（CRUD + 伏笔关联）
- [x] **章节时间线视图**（拖拽排序 + 角色筛选 + 伏笔可视化）
- [x] 伏笔追踪看板（四列 Kanban + HTML5 拖拽 + 章节/角色筛选）
- [x] 世界观设定（树形/分类双视图 + 关联图谱 D3 + 方向箭头 + 筛选）
- [x] 资源/能力追踪（按角色/全局表格双视图 + 完整编辑 + 状态标签）
- [x] **智能导入导出**（三种格式兼容 + 注释解析 + 名称匹配更新）
- [x] 全局搜索（Ctrl+K）
- [x] 撤销/重做（Ctrl+Z/Y）
- [x] 引用完整性检查 + 悬空引用清理
- [x] Markdown 编辑器（编辑/预览切换）
- [x] 暗色/亮色主题切换（body 同步）
- [x] **快捷键面板**（按 ? 查看所有快捷键）
- [x] **写作目标追踪**（自定义字数目标 + 进度条）
- [x] **数据备份与恢复**（localStorage 自动备份 + 手动备份 + 文件恢复）
- [x] **创作报告导出**（Markdown 格式统计报告）
- [x] **模板系统**（角色/章节/伏笔/设定导入模板下载，空值占位+字段注释）
- [x] **完整设定导出**（一键导出全部项目数据为 JSON）
- [x] **多语言支持**（中/英文切换，i18n Context + 完整翻译字典）
- [x] **写作日历热力图**（GitHub 风格贡献日历，每日字数统计）
- [x] **Markdown 文件监听导入**（File System Access API + 轮询扫描）
- [x] **数据同步**（WebDAV / GitHub Gist 上传下载）
- [x] **差异对比与合并**（三路合并策略 + Markdown 差异报告）
- [x] **插件系统**（内置 Markdown/CSV 解析器，支持注册自定义插件）
- [x] **性能优化**（懒加载 + 虚拟滚动组件）
- [x] **AI 写作助手**（文本智能分析 + 创作建议 + 资源状态更新 + 角色弧光分析）
- [x] **AI 智能去重**（相似度检测 + 逐项勾选 + 新增/更新/重复标记）
- [x] **AI 关系提取**（角色关系 + 世界观关联 + 自动关联角色到伏笔）
- [x] **AI 分析自动填充弧光**（分析文本时自动推断角色弧光，应用到角色 arc 字段）

### ✅ V3.0 — 创作流程深化

- [x] **大纲编辑器**：树形大纲结构（卷/章/节/场景），拖拽排序，多级嵌套
  - 大纲节点可绑定角色出场、伏笔埋设/回收、世界观引入
  - 从已有章节一键生成大纲
  - **AI 优化大纲**：AI 分析大纲结构给出优化建议和重构方案
- [x] **角色时间线弧光**：按章节可视化角色成长轨迹
  - 横向时间轴展示角色状态变化、关键事件、伏笔触发
  - 弧光阶段标记（首次登场 / 当前进度）
- [x] **写作会话统计**：WritingSession 数据结构就绪
  - Dashboard 集成字数统计、进度条、目标追踪
  - 写作日历热力图联动
- [x] **章节草稿编辑器**：章节支持 content 字段存储 Markdown 正文
  - 导出时按章节顺序合并正文
  - 字数实时统计
- [x] **标签/分类系统**：全局标签管理 + 标签云视图
  - 批量打标签（角色/章节/伏笔/设定）
  - 按标签筛选关联内容
  - **AI 生成标签**：根据作品内容自动生成分类标签
- [x] **导出增强**：支持 DOCX、PDF、EPUB/HTML 三种格式导出
  - 章节正文按序合并，可选包含角色附录
  - 使用 jsPDF + docx 库生成标准文档

### ✅ V4.0 — 智能化与协作

- [x] **AI 章节续写**：基于上一章内容 + 角色设定 + 进行中伏笔，AI 辅助续写
  - 保持角色语言风格（voice 字段）
  - 支持自定义大纲和风格要求
  - 续写结果可一键保存为章节
- [x] **AI 一致性检查**：扫描全文检测设定矛盾
  - 角色状态矛盾 / 时间线冲突 / 资源状态矛盾 / 伏笔状态异常
  - 生成一致性评分报告（0-100），标注问题位置和修复建议
- [x] **AI 世界观补全**：根据已有设定自动推断和补全
  - 检测逻辑空白（gap）/ 建议关联关系（relation）/ 补充细节（detail）
- [x] **版本历史**：数据快照与版本管理
  - 手动创建快照，localStorage 存储（最多 50 个）
  - 快照对比（差异统计）
  - 任意版本一键恢复
- [x] **AI 助手状态持久化**：切换页面后保持会话状态
  - 文本分析、创作建议、续写等所有 tab 结果自动保存
  - 按项目隔离，切换项目自动恢复对应会话
- [x] **AI 操作历史记录**：历次 AI 操作可追溯
  - 自动记录每次分析的摘要和时间
  - 支持单条删除和全部清空（最多 100 条）
- [x] **AI JSON 解析鲁棒性增强**：
  - 智能修复 AI 返回 JSON 中的尾部逗号、无引号 key、值内未转义双引号
  - 增强 JSON 提取逻辑，支持非标准格式自动截取
- [x] **空数据防御**：世界观设定中自动过滤和清理无效空数据，防止页面黑屏

### ✅ V5.0 — 平台扩展

- [x] **Electron 桌面应用打包**：Windows/Mac/Linux 独立应用
  - 双击 exe 即可运行，隐藏菜单栏，专业外观
  - 系统托盘常驻（双击显示窗口，右键退出）
  - 原生文件系统访问（打开/保存/另存为对话框）
  - 自动保存（每 60 秒备份到本地，最多 20 个版本）
  - 崩溃恢复（渲染进程崩溃自动重载，启动时检测恢复数据）
  - 原生主题同步（跟随系统暗色/亮色模式）
  - IndexedDB 数据持久化，关窗再开数据不丢失
  - HashRouter 路由，file:// 协议完美支持
  - 侧边栏 📤 导出作品 / 📥 导入作品
- [x] **移动端适配**：响应式布局 + Android APK
  - 顶部横向可滚动导航标签栏（11 个模块）
  - 底部工具栏：导入/导出/主题切换/中英文切换
  - 双栏布局自动转为上下排列（列表 35vh + 详情区）
  - 模态框底部弹出（类似 iOS ActionSheet）
  - Dashboard 统计卡片 3 列网格自适应
  - 看板/大纲/时间线纵向排列适配
  - 输入框 16px 字体防止 iOS 自动缩放
  - 100dvh 动态视口高度适配浏览器地址栏
  - **Android APK 打包**：Capacitor 构建，debug APK 约 4.8MB
  - PWA manifest + Service Worker 离线可用
- [ ] **云同步增强**：支持更多云存储后端
  - OneDrive / Google Drive / Dropbox
  - 端到端加密
  - 增量同步（只传输变更部分）
- [ ] **社区模板市场**：用户可分享和下载世界观模板
  - 奇幻/科幻/武侠/都市等类型模板
  - 评分和评论系统
  - 一键导入模板到新项目

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
- [OpenAI](https://openai.com/) — AI 能力支持
