---
name: 个人名片可视化方案
overview: 基于 Workspace 的 27 个项目和完整经验体系，构建一个"快速概览 + 深度探索"双模式的个人价值展示平台。Astro + React Islands 架构（Next.js SSG 作为降级方案），半自动数据抽取 + 手动覆盖机制，首页仪表盘概览 + 投资人视角价值叙事 + 项目详情作品集，部署到 Vercel（主推）+ Cloudflare CDN 保障国内访问。
todos:
  - id: p1-1-scaffold
    content: P1.1 项目脚手架：初始化 Astro 项目，集成 React + Tailwind CSS + MDX
    status: in_progress
  - id: p1-2-extract
    content: P1.2 数据抽取脚本：编写 extract-workspace-data.ts，从 Workspace 扫描生成结构化 JSON
    status: pending
  - id: p1-3-overrides
    content: P1.3 手动覆盖文件：创建 overrides.json，补充项目描述、分类、价值叙事等抽取不到的内容
    status: pending
  - id: p1-4-layout
    content: P1.4 基础布局 + 导航：BaseLayout.astro + 响应式导航栏 + 暗色/亮色主题切换
    status: pending
  - id: p2-1-hero
    content: P2.1 首页 Hero + 数据面板：个人定位、一句话价值主张、关键指标卡片
    status: pending
  - id: p2-2-radar
    content: P2.2 技能雷达图：Recharts React Island，5 维能力可视化
    status: pending
  - id: p2-3-project-matrix
    content: P2.3 项目矩阵：按领域分类的项目卡片网格 + 筛选器
    status: pending
  - id: p2-4-value-story
    content: P2.4 投资人视角价值叙事区块：核心项目的「问题->方案->成果」三段式展示
    status: pending
  - id: p2-5-agent-ecosystem
    content: P2.5 AI Agent 生态展示：22 个 Agent 的分类矩阵/流程图
    status: pending
  - id: p2-6-tech-cloud
    content: P2.6 技术栈全景云图 + 经验时间线
    status: pending
  - id: p2-7-project-detail
    content: P2.7 项目详情页：概述、架构图、技术栈、亮点、截图/Demo 链接、相关推荐
    status: pending
  - id: p2-8-about
    content: P2.8 关于页：个人简介、职业经历时间线、联系方式
    status: pending
  - id: p3-1-responsive
    content: P3.1 响应式适配：移动端体验优化，确保微信内打开正常
    status: pending
  - id: p3-2-seo
    content: P3.2 SEO + OG 元数据：Open Graph 标签、微信分享卡片适配
    status: pending
  - id: p3-3-deploy
    content: P3.3 部署上线：Vercel 部署 + 自定义域名 + Cloudflare CDN
    status: pending
  - id: p3-4-graph
    content: P3.4 [可选增强] 知识图谱页：react-force-graph-2d 实现项目-技能关系网络
    status: pending
isProject: false
---

# 个人价值名片 - 可视化方案设计（v2 - Review 后）

## 一、需求分析总结

**核心目标**：向投资人和技术合作伙伴展示你的全方位技术价值

**关键约束**：

- 双模式浏览：30 秒快速概览 + 5-10 分钟深度探索
- 先 Web 后小程序的渐进策略
- 半动态内容：数据从 Workspace 自动抽取 + 手动覆盖补充，展示层静态生成
- 混合视觉风格：首页仪表盘概览 + 投资人视角价值叙事 + 详情页作品集

---

## 二、技术决策（已定）

### 前端框架：Astro + React Islands

- 首选方案，内容展示站 + 少量交互组件的最佳场景
- Islands 架构：图表/图谱等组件按需加载（`client:visible`），其余零 JS
- React 技能完全复用，Tailwind CSS 快速构建 UI
- Lighthouse 98-100，投资人打开秒开
- **降级方案**：如 Astro 学习成本超预期，切换 Next.js 16 SSG 模式（已有 `next-ai-draw-io` 项目经验）

### 部署方案：Vercel + Cloudflare CDN

- Vercel 主推：免费、Git push 自动部署、全球 CDN
- 绑定自定义域名 + Cloudflare CDN，保障国内投资人/合作伙伴访问速度
- PinMe IPFS 作为可选技术亮点展示

### 可视化库组合

- **Recharts**：技能雷达图、统计图表（成熟稳定，~40KB gzipped）
- **react-force-graph-2d**：知识图谱/关系网络（Canvas 渲染，轻量、移动端友好，小程序迁移成本低）
- 替换 Reagraph 的理由：WebGL 在移动端兼容性不如 Canvas，且 ~50-100 个节点无需 WebGL 性能

---

## 三、内容架构设计

### 信息层次（金字塔结构 + 投资人视角）

```
层级 1 - 一句话定位（3 秒）
"AI Agent 工程化实践者 | 全栈独立开发者 | 27 个项目 | 12 个生产级系统"

层级 2 - 核心价值面板（30 秒概览）
├── 关键指标卡片（项目数 / 生产级系统数 / 笔记数 / Agent 数 / Pattern 数）
├── 技能雷达图（AI Agent / 全栈开发 / 知识管理 / 架构设计 / 产品思维）
├── 价值叙事区块 ← [新增] 3 个核心项目的「问题 → 方案 → 成果」
├── AI Agent 生态展示 ← [新增] 22 个 Agent 的分类矩阵
├── 项目矩阵（按领域分类的项目卡片网格）
└── 技术栈全景云图

层级 3 - 深度探索（5-10 分钟）
├── 项目详情页（架构、技术栈、亮点、截图/Demo 链接）
├── 经验时间线（成长路径可视化）
├── Engineering Playbook 精华（10 个经验档案、8 个 Pattern）
└── [可选增强] 知识图谱（项目-技能-经验关系网络）
```

### 页面结构

1. **首页 / Dashboard**（快速概览模式）
  - Hero 区域：个人定位 + 一句话价值主张
  - 数据面板：项目数、生产级系统数、Agent 数、笔记数等关键指标卡片
  - 技能雷达图：5 维能力可视化（React Island, `client:visible`）
  - 价值叙事区块：挑选 3 个核心项目（InfoHunter / TrendRadar / TruthSocial Monitor），用「痛点 → 方案 → 成果」三段式打动投资人
  - AI Agent 生态展示：22 个 Agent 按类型（开发辅助/分析工具/效率工具/元工具）分组的矩阵卡片
  - 项目矩阵：按领域（AI Agent / 信息监控 / 量化交易 / 工具链 / 知识管理）分类的卡片网格 + 筛选器
  - 技术栈全景：按熟练度排列的技术标签云 + 经验时间线
2. **项目详情页**（深度探索模式，路由 `/projects/[slug]`）
  - 项目概述 + 架构图
  - 技术栈标签
  - 核心亮点和设计决策
  - 截图 / Demo 链接
  - 相关项目推荐（基于技术栈或领域关联）
3. **关于页**（路由 `/about`）
  - 个人简介（基于 Workspace 数据自动生成初稿 + 手动覆盖）
  - 职业经历时间线
  - Engineering Playbook 精华展示（复用率、Pattern 列表）
  - 联系方式
4. **[可选增强] 知识图谱页**（路由 `/graph`，Phase 3 可选任务）
  - 项目、技能、经验之间的关系网络
  - 手动定义的关系数据（overrides.json），保证质量
  - 点击节点展开详情，支持缩放和拖拽

---

## 四、数据抽取方案（半动态 + 手动覆盖）

### 抽取脚本 `scripts/extract-workspace-data.ts`

**数据源与优先级**：

1. **高可靠**（格式固定，直接解析）
  - `package.json` → 项目名、描述、依赖列表、技术栈
  - `requirements.txt` → Python 依赖列表
  - `docker-compose.yml` → 服务组件信息
2. **中可靠**（需简单处理）
  - `README.md` 第一段 → 项目描述
  - `engineering-playbook/` 目录结构 → 经验档案、Pattern、Skills 统计
  - `learning-notes/README.md` → 笔记分类和数量统计
  - `agents/` 目录结构 → Agent 列表和描述
3. **低可靠但有价值**
  - Git 提交历史 → 活跃度时间线（`git log --format` 解析）

### 手动覆盖文件 `src/data/overrides.json`

对于自动抽取不到或不够准确的信息，手动补充：

- 项目分类（AI Agent / 信息监控 / 量化交易 / 工具链 / 知识管理）
- 价值叙事文案（问题 → 方案 → 成果）
- 项目截图路径
- Demo 链接
- 个人简介文案
- 知识图谱的关系定义（节点间的边）

### 输出文件 `src/data/workspace-data.json`

```json
{
  "projects": [...],      // 项目列表及元数据
  "agents": [...],        // Agent 列表及分类
  "skills": {...},        // 技能树
  "stats": {...},         // 统计数据
  "timeline": [...],      // 时间线数据
  "techStack": [...],     // 技术栈汇总
  "graph": {              // 知识图谱节点和边
    "nodes": [...],
    "edges": [...]
  }
}
```

### 构建链路

`npm run extract`（扫描 Workspace + 合并 overrides）→ 生成 `workspace-data.json` → `npm run build`（Astro 静态生成）

Vercel build command 配置为 `npm run extract && npm run build`，保证每次部署数据自动更新。

---

## 五、项目结构

```
personal-card/
├── astro.config.mjs
├── tailwind.config.mjs
├── package.json
├── vercel.json                     # Vercel 部署配置
├── scripts/
│   └── extract-workspace-data.ts   # 数据抽取脚本
├── src/
│   ├── data/
│   │   ├── workspace-data.json     # [自动生成] 结构化数据
│   │   └── overrides.json          # [手动维护] 补充/覆盖数据
│   ├── layouts/
│   │   └── BaseLayout.astro        # 基础布局（含导航、主题切换、页脚）
│   ├── pages/
│   │   ├── index.astro             # 首页 Dashboard
│   │   ├── projects/
│   │   │   ├── index.astro         # 项目列表页
│   │   │   └── [slug].astro        # 项目详情页
│   │   ├── about.astro             # 关于页
│   │   └── graph.astro             # [可选] 知识图谱页
│   ├── components/                 # Astro 静态组件（零 JS）
│   │   ├── Hero.astro              # Hero 区域
│   │   ├── StatsPanel.astro        # 关键指标卡片
│   │   ├── ValueStory.astro        # 价值叙事区块
│   │   ├── AgentEcosystem.astro    # Agent 生态矩阵
│   │   ├── ProjectCard.astro       # 项目卡片
│   │   ├── TechStackCloud.astro    # 技术栈云图
│   │   ├── Navbar.astro            # 导航栏
│   │   └── Footer.astro            # 页脚
│   ├── islands/                    # React 交互组件（按需水合）
│   │   ├── SkillRadar.tsx          # 技能雷达图（Recharts）
│   │   ├── ProjectFilter.tsx       # 项目筛选器
│   │   ├── Timeline.tsx            # 经验时间线
│   │   ├── ThemeToggle.tsx         # 主题切换
│   │   └── KnowledgeGraph.tsx      # [可选] 知识图谱（react-force-graph-2d）
│   └── styles/
│       └── global.css
└── public/
    ├── screenshots/                # 项目截图
    ├── og-image.png                # Open Graph 分享图
    └── favicon.svg
```

---

## 六、实施路线（细化任务）

### Phase 1 - 基础框架 + 数据层（预计 1-1.5 天）


| 任务 ID | 任务内容                                                                                                                | 预计耗时  | 依赖   |
| ----- | ------------------------------------------------------------------------------------------------------------------- | ----- | ---- |
| P1.1  | 初始化 Astro 项目，集成 `@astrojs/react` + `@astrojs/tailwind` + `@astrojs/mdx`                                             | 30min | 无    |
| P1.2  | 编写 `extract-workspace-data.ts`：扫描 27 个项目目录，解析 package.json / requirements.txt / README 第一段，输出 `workspace-data.json` | 3-5h  | P1.1 |
| P1.3  | 创建 `overrides.json`：手动补充项目分类、价值叙事文案、个人简介                                                                            | 1-2h  | P1.2 |
| P1.4  | 实现 `BaseLayout.astro`（响应式导航 + 页脚 + 暗色/亮色主题基础结构）                                                                     | 1-2h  | P1.1 |


### Phase 2 - 核心页面 + 交互组件（预计 2-3 天）


| 任务 ID | 任务内容                                                | 预计耗时 | 依赖         |
| ----- | --------------------------------------------------- | ---- | ---------- |
| P2.1  | 首页 Hero 区域 + StatsPanel 关键指标卡片                      | 1-2h | P1.4       |
| P2.2  | 技能雷达图（Recharts React Island, `client:visible`）      | 1-2h | P2.1       |
| P2.3  | 项目矩阵卡片网格 + ProjectFilter 筛选器（React Island）          | 2-3h | P1.2, P2.1 |
| P2.4  | 投资人视角价值叙事区块（ValueStory.astro）：3 个核心项目的三段式展示         | 1-2h | P1.3       |
| P2.5  | AI Agent 生态展示（AgentEcosystem.astro）：22 个 Agent 分类矩阵 | 1-2h | P1.2       |
| P2.6  | 技术栈全景云图 + 经验时间线（Timeline React Island）              | 2-3h | P1.2       |
| P2.7  | 项目详情页 `[slug].astro`：动态路由、架构图、截图、Demo 链接、相关推荐       | 2-3h | P1.2, P1.3 |
| P2.8  | 关于页：个人简介、职业时间线、Playbook 精华、联系方式                     | 1-2h | P1.3       |


### Phase 3 - 打磨 + 部署 + 可选增强（预计 1-1.5 天）


| 任务 ID | 任务内容                                                            | 预计耗时 | 依赖    |
| ----- | --------------------------------------------------------------- | ---- | ----- |
| P3.1  | 响应式适配：移动端布局、微信内置浏览器兼容性测试                                        | 1-2h | P2 全部 |
| P3.2  | SEO + OG 元数据：Open Graph 标签、微信分享卡片标题/描述/图片                       | 1h   | P3.1  |
| P3.3  | 部署：Vercel 配置 + 自定义域名 + Cloudflare CDN 接入                        | 1-2h | P3.2  |
| P3.4  | [可选增强] 知识图谱页：`react-force-graph-2d` 实现，数据来源 overrides.json 手动定义 | 3-5h | P1.3  |


---

## 七、风险管控


| 风险                     | 等级  | 缓解方案                                                         |
| ---------------------- | --- | ------------------------------------------------------------ |
| Astro 学习曲线超预期          | 中   | 降级为 Next.js 16 SSG，已有项目经验（next-ai-draw-io）                   |
| 项目截图/视觉素材缺失            | 中   | 通过 browser-use 自动截图 或 mcp_excalidraw 生成架构图                   |
| 数据抽取脚本对异构 README 解析不稳定 | 低   | 只取 README 第一段 + overrides.json 兜底                            |
| 知识图谱关系不准确显得空洞          | 高   | 降级为可选模块，先用手动数据保证质量                                           |
| Vercel 国内访问不稳定         | 中   | 自定义域名 + Cloudflare CDN；备选腾讯云 COS 静态托管                        |
| 数据过时忘记更新               | 低   | Vercel build command 链式调用 `npm run extract && npm run build` |


