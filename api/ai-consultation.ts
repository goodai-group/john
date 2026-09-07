// Vercel serverless function: POST /api/ai-consultation
//
// 完整的 AI 咨询逻辑（Gemini 调用 + 本地规则引擎兜底）定义在 server.ts，
// 与 /api/ai/chat 共用同一个 Express 路由处理函数。
//
// 这里采用"file-based function + 委托 Express"的方式：
// Vercel 命中 api/ai-consultation.ts 时会以原始请求 URL（/api/ai-consultation）调用本函数，
// 我们将 (req, res) 直接交给 Express app（app 本身就是一个 http request handler），
// Express 即可按内部注册的路由精确匹配并复用全部业务逻辑，无需重复实现。
//
// 注意：
//   1. 不要用 vercel.json 里的 /api/(.*) 通配 rewrite 转手，那会导致请求 URL 被改写而 404。
//   2. 不要在 vercel.json 里给本函数加任何 URL 重写/转发配置。
//   3. 前端 /src/components/AiRuleConsultationDrawer.tsx 以 POST /api/ai-consultation 调用本接口，
//      属于 fetch 请求，不会被 React Router / SPA 兜底路由拦截。
//
// 防 500 / FUNCTION_INVOCATION_FAILED 的关键设计：
//   a) 严禁在模块顶层 `import app from '../server'`。若打包/运行格式不匹配导致 Express 依赖
//      在“模块加载期”抛错，顶层 import 会让函数连启动都失败，
//      Vercel 直接报 FUNCTION_INVOCATION_FAILED(500)。
//      改为在 handler 内部懒加载，加载失败时也能返回结构化 JSON，而不是平台裸 500。
//      注意：根 package.json 已声明 "type": "module"，Vercel 会按 ESM 加载本函数，
//      因此相对导入必须写全扩展名 '../server.js'（ESM 不做扩展名补全）。
//   b) 委托 Express 必须包在 try/catch 中并等待响应结束；
//   c) 增加响应看门狗，防止任何内部挂起导致 serverless 超时被平台强杀。
import type { IncomingMessage, ServerResponse } from 'node:http';

let appPromise: Promise<any> | null = null;

async function getApp(): Promise<any> {
  if (!appPromise) {
    // ESM 产物中相对导入必须带 .js 扩展名（对应编译后的 server.js）
    appPromise = import('../server.js').then((m: any) => {
      const mod = m && typeof m === 'object' && 'default' in m ? m.default : m;
      if (!mod || typeof mod !== 'function') {
        throw new Error('server.ts did not export an Express app as default');
      }
      return mod;
    });
  }
  return appPromise;
}

function writeJson(
  res: ServerResponse,
  status: number,
  payload: Record<string, unknown>
): void {
  if (res.headersSent || res.writableEnded) return;
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

// 看门狗：Express 内部 Gemini 超时上限约 25s，这里在平台 maxDuration(30s) 之前强制收尾，
// 避免请求挂起被 Vercel 以 FUNCTION_INVOCATION_FAILED/超时 杀掉。
const WATCHDOG_MS = 28_000;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    if (!res.headersSent && !res.writableEnded) res.setHeader('Allow', 'POST');
    writeJson(res, 405, { error: 'Method Not Allowed. Use POST.' });
    return;
  }

  let app: any;
  try {
    app = await getApp();
  } catch (err: any) {
    // Express 模块加载失败（如打包格式不匹配）。给出可诊断的结构化错误。
    console.error('[api/ai-consultation] failed to load Express app:', err?.stack || err);
    writeJson(res, 500, {
      error: 'AI service backend failed to initialize',
      detail: String(err?.message || err || 'unknown error').slice(0, 300)
    });
    return;
  }

  const watchdog = setTimeout(() => {
    console.error('[api/ai-consultation] watchdog: request exceeded', WATCHDOG_MS, 'ms');
    writeJson(res, 500, { error: 'AI service request timed out', detail: 'backend watchdog fired' });
  }, WATCHDOG_MS);

  try {
    // Express app 作为统一 handler 处理请求（body 解析等中间件已在 server.ts 中注册）。
    // 通过 finish/close 事件等待响应真正结束，避免 serverless 运行时提前冻结事件循环。
    await new Promise<void>((resolve, reject) => {
      res.once('finish', () => resolve());
      res.once('close', () => resolve());
      res.once('error', (err) => reject(err));
      try {
        app(req as any, res as any);
      } catch (err) {
        reject(err);
      }
    });
  } catch (err: any) {
    console.error('[api/ai-consultation] handler error:', err?.stack || err);
    writeJson(res, 500, {
      error: 'Internal server error',
      detail: String(err?.message || err || 'unknown error').slice(0, 300)
    });
  } finally {
    clearTimeout(watchdog);
  }
}
