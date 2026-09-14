// BAM 平台后端入口
//
// 【Phase 0 重构】本文件原为 1354 行，混杂了 Gemini 调用、本地规则引擎、5 个路由处理器、
// 错误中间件与进程启动。现已按职责拆分，本文件只负责「进程装配」：
//
//   src/agents/          Agent 统一契约、运行时、Tool Registry、4 个 Agent
//   src/server/gemini.ts Gemini 调用层（客户端、模型、配额冷却、错误归类）
//   src/server/localEngine/  本地确定性兜底引擎（知识库、兜底问答、视频推荐）
//   src/server/http.ts   asyncHandler、JSON 错误中间件、/api 404
//   src/server/routes.ts API 路由注册
//
// 行为与重构前保持一致；唯一有意的改动见 PR 说明（3 个接口的 500 响应体现在统一
// 走 JSON 错误中间件，从 { error: <msg> } 变为 { error: 'Internal server error', detail: <msg> }，
// 与原本就走该中间件的 /api/ai/chat 对齐）。
import express from 'express';
import path from 'path';
import { apiNotFoundHandler, jsonErrorMiddleware } from './src/server/http.js';
import { registerApiRoutes } from './src/server/routes.js';

// 加载根目录 .env：仅本地开发需要；Vercel 平台会自动注入环境变量。
// 注意：不能顶层 import 'dotenv/config'——在 Vercel 以 ESM 打包 serverless 函数时，
// dotenv(CJS) 内部的 require('fs') 会变成动态 require 导致模块加载即崩溃(FUNCTION_INVOCATION_FAILED)。
// 改用 Node >=20.12 内置 process.loadEnvFile()（同步、零第三方依赖）。
try {
  if (!process.env.VERCEL && typeof process.loadEnvFile === 'function') {
    process.loadEnvFile();
  }
} catch {
  // .env 不存在或读取失败时静默忽略（例如生产环境由平台注入环境变量）
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

registerApiRoutes(app);

// ============================================================
// 兜底错误中间件 & /api 未匹配 404（必须在所有路由注册之后、Vite/静态资源之前）
// ============================================================
app.use(jsonErrorMiddleware);
app.use('/api', apiNotFoundHandler);

async function startServer() {
  // Vite middleware for development (only used by `npm run dev` locally)
  if (process.env.NODE_ENV !== 'production') {
    // 仅在本地 dev 运行时才加载 Vite。
    // 重要：必须用「变量间接 import」而不能写 await import('vite')——
    // esbuild / Vercel 的依赖追踪会把字符串字面量的 import 静态打包进 serverless 函数，
    // 导致整个 Vite（含原生二进制）被塞进部署包，引发体积/运行问题。
    // 变量形式会让打包器无法静态解析，本地 tsx/Node 运行时仍能正常加载 node_modules 里的 vite。
    const vitePkgName: 'vite' = 'vite';
    const { createServer: createViteServer } = await import(vitePkgName);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    // 生产环境非 Vercel 部署（如自有服务器 / Railway / Render）下，
    // 由本进程托管前端静态资源。Vercel 部署时由 Vercel 自身的静态资源服务负责，
    // 这里必须跳过，否则 rewrites 会冲突、404 出现。
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 BAM Platform Server running on http://0.0.0.0:${PORT}`);
  });
}

// 仅在直接运行（本地 `npm run dev` / `npm start`）时启动监听。
// Vercel / 其他 serverless 平台通过 import 此模块拿到 `app` 即可，禁止在此启动监听。
// 注意：不能用 import.meta.url 判断，因为 esbuild 打包为 CJS 时 import.meta.url 会被替换为空字符串，
// 会导致 `node dist/server.cjs` 启动失败。改用 VERCEL 环境变量判断是最稳妥的方式：
// - Vercel 部署时 VERCEL=1，跳过监听
// - 本地任何方式启动都未设置 VERCEL，正常监听
const isDirectRun = !process.env.VERCEL;

if (isDirectRun) {
  startServer();
}

// Vercel serverless function 入口会 `import app from './server'`
export default app;
