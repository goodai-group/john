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
import type { IncomingMessage, ServerResponse } from 'node:http';
import app from '../server';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  // Express app 本身就是 (req, res) -> void 的 http handler，
  // 直接调用即可由内部 app.use(express.json()) + 路由完成 body 解析与响应
  return new Promise<void>((resolve) => {
    res.on('close', () => resolve());
    app(req as any, res as any);
  });
}
