# CLAUDE.md

面向 AI 编码助手的项目速览，减少每次改动前的探索成本。

## 项目是什么

**BAM 商宣商业模式检验系统**：填写商业模式表单 → 后端多 Agent（Gemini + 本地规则兜底）
分析打分 → 生成可行性/诊断报告，并支持 AI 答疑。前端 React SPA + Express 后端，
部署到 Vercel（Serverless Functions）。

详细产品/测试文档见根目录：
`BAM商业模式检验系统-产品功能全景文档.md`、`BAM商宣商业模式检验系统-测试用例报告.md`、
`阿里巴巴标准测试用例与执行报告-BAM-FH.md`（体量较大，仅在任务明确需要产品背景时再读）。

## 技术栈

- 前端：React 19 + TypeScript + Vite 6 + Tailwind CSS 4
- 后端：Express（本地用 `tsx` 跑 `server.ts`；Vercel 上由 `api/[...path].ts` 转发到同一套路由）
- 数据：Supabase（Postgres + Auth，替代早期 Firebase 方案；`firebase-blueprint.json`/`firestore.rules` 是历史遗留，未在用）
- AI：`@google/genai`（Gemini），无 key 或配额耗尽时自动回退到 `src/server/localEngine` 本地规则引擎

## 常用命令

```bash
npm run dev          # tsx server.ts，本地开发（Express + Vite middleware）
npm run build         # vite build + esbuild 打包 server.ts -> dist/server.cjs
npm run lint          # tsc --noEmit（本项目没有单测，lint 即类型检查）
npm run vercel-build   # Vercel 平台构建入口，只跑 vite build
```

没有测试框架/测试命令；验证改动主要靠 `npm run lint` + 手动跑 `npm run dev` 验证行为。

## 目录结构与职责

```
server.ts              进程装配入口（express app、env 加载、错误中间件注册）
src/server/
  routes.ts             API 路由注册
  http.ts               asyncHandler、JSON 错误中间件、404
  gemini.ts             Gemini 客户端/配额冷却/错误归类
  localEngine/           本地确定性兜底（无 Gemini key 时的问答/推荐）
src/agents/             多 Agent 契约与实现（见下方"Agent 架构"）
src/lib/                纯逻辑层：打分引擎、盈亏平衡/回本计算、存储(storage.ts,
                        含 localStorage + Supabase 双写)、supabaseClient.ts(含建表 SQL)
src/components/          UI 组件，AssessmentForm/ 和 AssessmentReport/ 是核心大组件目录
src/pages/               路由级页面（项目列表、可行性简报、学习中心）
src/App.tsx              顶层状态与 Tab/路由编排
api/                     Vercel Serverless 入口，转发到 src/server 的路由
```

## Agent 架构（`src/agents/`）

`src/agents/index.ts` 是统一注册表，通过 `AGENTS` 导出全部 Agent；`runtime.ts` 提供
`runAgent` 统一执行契约；`coach.ts` 是编排层（`runCoach`）。新增/修改 Agent 行为时
先看 `agents/index.ts` 顶部注释里的分期路线图（Phase 0~4），了解各 Agent 的定位再动手，
避免重复实现已规划到其他 Agent 里的能力。

## 体量较大的文件（读取/编辑前注意）

以下文件单文件均 900+ 行，直接整文件 Read 会消耗大量 token；除非任务就是重构该文件，
否则优先用 Grep 定位具体函数/组件后再用 `offset`/`limit` 局部读取：

- `src/components/AssessmentForm/AssessmentForm.tsx`（~3000 行，表单主组件）
- `src/components/AssessmentReport/AssessmentReportView.tsx`（~1700 行，报告展示）
- `src/components/AiRuleConsultationDrawer.tsx`（~1100 行）
- `src/App.tsx`（~1000 行）
- `src/lib/supabaseClient.ts`（~900 行，含建表 SQL 字符串常量 `SUPABASE_DATABASE_SCHEMA_SQL`）

## 关键背景知识（避免踩坑）

- **`package.json` 必须保留 `"type": "module"`**：Vercel 用根 `tsconfig`(ESNext) 把
  `api/*.ts` 编译为 ESM，若丢失该字段会导致 Serverless 函数启动即 `SyntaxError`（见
  `vite.config.ts` 内注释）。
- **不要在顶层 `import 'dotenv/config'`**：会在 Vercel ESM 打包下触发动态 `require('fs')`
  崩溃；本项目改用 Node 内置 `process.loadEnvFile()`（见 `server.ts`）。
- **环境变量前缀**：前端(Vite)可读 `VITE_*` / `NEXT_PUBLIC_*`；服务端按
  `SUPABASE_*` → `NEXT_PUBLIC_*` → `VITE_*` 依次回退读取，建议 `.env` 里两套都配置
  相同值（见 `.env.example`）。
- **无 `GEMINI_API_KEY` 时不是报错**，AI 问答会自动降级为 `src/server/localEngine`
  的本地规则库模式，属预期行为。
- `firebase-blueprint.json`、`firestore.rules` 为迁移到 Supabase 前的遗留文件，
  当前未接入，不要误以为是生效配置。
