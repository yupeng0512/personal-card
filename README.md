# Personal Card

个人主页与作品集，定位为后端开发工程师的公开展示面，聚焦平台后端、批量链路、AI 工程化、公开项目和工程知识库。

线上地址：[yupeng0512.github.io](https://yupeng0512.github.io)

## What It Shows

- 工作主线：平台后端、高数据量批量链路、TLOG 查询、可观测和 Agent 落地
- AI Native 研发资产：项目级知识库、Skills / Rules、Review 检查清单、自动化工作流
- 公开项目矩阵：信息监控、多平台发布、视频矩阵、GitHub 趋势监控、个人知识库
- 工程证据链：项目介绍、技术栈、价值叙事、亮点和学习笔记

## Tech Stack

- Astro 5 + React 19 Islands
- Tailwind CSS v4
- Recharts
- Workspace data extraction script
- Vercel deployment

## Development

```bash
npm install
npm run dev
npm run extract
npm run build
npm run preview
```

## Data Flow

Project data is generated from local workspace scanning plus curated overrides:

1. `npm run extract` scans workspace repositories and writes `src/data/workspace-data.json`.
2. `src/data/overrides.json` provides curated descriptions, featured order, value stories and career content.
3. Astro builds the static site from the merged project model.
