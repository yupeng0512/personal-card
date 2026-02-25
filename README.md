# Personal Card

个人价值名片 — AI Agent 工程化实践者的可视化展示平台。

向投资人和技术合作伙伴展示全方位技术价值：27 个项目、12 个生产级系统、22 个 AI Agent、124 篇学习笔记。

## 特性

- **双模式浏览**：30 秒快速概览仪表盘 + 5-10 分钟深度项目探索
- **投资人视角**：核心项目价值叙事（痛点 → 方案 → 成果）
- **AI Agent 生态展示**：22 个 Agent 分类矩阵
- **数据驱动**：半自动从 Workspace 抽取项目数据，一处更新全站同步
- **极致性能**：Astro Islands 架构，静态内容零 JS，Lighthouse 98+

## 技术栈

- Astro 5 + React 19 (Islands Architecture)
- Tailwind CSS v4
- Recharts (雷达图/统计图表)
- Vercel 部署

## 开发

```bash
npm install
npm run dev       # 启动开发服务器
npm run extract   # 从 Workspace 抽取数据
npm run build     # 构建（自动先 extract）
npm run preview   # 预览构建产物
```

## 数据更新

项目数据来自 Workspace 自动扫描 + 手动覆盖：

1. 运行 `npm run extract` 扫描项目目录
2. 编辑 `src/data/overrides.json` 补充分类、叙事文案等
3. 运行 `npm run build` 重新构建
