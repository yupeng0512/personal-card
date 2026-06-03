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
npm run sync:notes
npm run build
npm run build:workspace
npm run preview
```

## Data Flow

Project data is generated from local workspace scanning plus curated overrides:

1. `npm run extract` scans workspace repositories and writes `src/data/workspace-data.json`.
2. `src/data/overrides.json` provides curated descriptions, featured order, value stories and career content.
3. `npm run sync:notes` scans a checked-out `learning-notes` repository and writes `src/data/notes-data.json`.
4. Astro builds the static site from the merged project model and notes snapshot.

## Learning Notes Sync

`learning-notes` pushes trigger `personal-card` through repository dispatch. Configure these GitHub secrets before relying on the end-to-end workflow:

- In `learning-notes`: `PERSONAL_CARD_DISPATCH_TOKEN`, a fine-grained PAT or GitHub App token that can dispatch workflows in `yupeng0512/personal-card`.
- In `personal-card`: `LEARNING_NOTES_READ_TOKEN`, required when `yupeng0512/learning-notes` is private. It only needs contents read access to `learning-notes`.

Without `LEARNING_NOTES_READ_TOKEN`, the sync workflow can still run for a public `learning-notes` repository, but private checkout will fail with `Repository not found`.
