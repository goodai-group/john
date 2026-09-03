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
//   3. 委托 Express 必须包在 try/catch 中并等待响应结束，确保 Express 内部即使抛错，
//      也返回结构化 JSON，而不是让 Vercel 直接报 FUNCTION_INVOCATION_FAILED (500)。
import type { IncomingMessage, ServerResponse } from 'node:http';
import app from '../server';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed. Use POST.' }));
    return;
  }

  // Express app 作为统一 handler 处理请求（body 解析等中间件已在 server.ts 中注册）。
  // 通过 finish/close 事件等待响应真正结束，避免 serverless 运行时提前冻结事件循环。
  try {
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
    if (!res.writableEnded && !res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: 'Internal server error',
          detail: String(err?.message || err || 'unknown error').slice(0, 500)
        })
      );
    }
  }
}
