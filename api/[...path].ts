// Vercel serverless catch-all function: 接收所有 /api/* 路径中尚未被
// 具体文件名命中的端点（如 /api/ai/chat、/api/ai/infer-business-structure、
// /api/ai/deep-diagnosis、/api/ai/ocr-estimate 等），统一委托给 server.ts
// 里已注册的 Express 路由。
//
// 已经单独走 file-based function 的端点（Vercel 优先匹配更具体的文件名）：
//   - api/health.ts            -> /api/health
//   - api/ai-consultation.ts   -> /api/ai-consultation
//
// 因此本 catch-all 不会与它们冲突。
//
// 防 500 / FUNCTION_INVOCATION_FAILED 的关键设计（与 api/ai-consultation.ts 一致）：
//   a) 严禁在模块顶层 `import app from '../server'`。若打包/运行格式不匹配导致 Express 依赖
//      在“模块加载期”抛错（例如 ESM 内联打包时 Express 的 CJS 动态 require），顶层 import 会让
//      函数连启动都失败，Vercel 直接报 FUNCTION_INVOCATION_FAILED(500)。
//      改为在 handler 内部懒加载，加载失败时返回结构化 JSON。
//   b) 委托 Express 必须包在 try/catch 中并等待响应结束；
//   c) 增加响应看门狗，防止内部挂起被平台超时强杀。
import type { IncomingMessage, ServerResponse } from 'node:http';

let appPromise: Promise<any> | null = null;

async function getApp(): Promise<any> {
  if (!appPromise) {
    appPromise = import('../server').then((m: any) => {
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

const WATCHDOG_MS = 28_000;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  let app: any;
  try {
    app = await getApp();
  } catch (err: any) {
    console.error('[api/[...path]] failed to load Express app:', err?.stack || err);
    writeJson(res, 500, {
      error: 'API service backend failed to initialize',
      detail: String(err?.message || err || 'unknown error').slice(0, 300)
    });
    return;
  }

  const watchdog = setTimeout(() => {
    console.error('[api/[...path]] watchdog: request exceeded', WATCHDOG_MS, 'ms');
    writeJson(res, 500, { error: 'API service request timed out', detail: 'backend watchdog fired' });
  }, WATCHDOG_MS);

  try {
    // Express app 本身就是 (req, res) -> void 的 http handler，
    // 直接调用即可由内部 app.use(express.json()) + 路由完成 body 解析与响应。
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
    console.error('[api/[...path]] handler error:', err?.stack || err);
    writeJson(res, 500, {
      error: 'Internal server error',
      detail: String(err?.message || err || 'unknown error').slice(0, 300)
    });
  } finally {
    clearTimeout(watchdog);
  }
}
