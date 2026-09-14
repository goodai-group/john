// Express HTTP 基础设施：async 包装、错误中间件、/api 404
//
// 【Phase 0 重构】原位于 server.ts 第 30-38 行与 1277-1308 行，逻辑一字未改。
import express from 'express';

// Express 4 不会自动捕获 async 路由抛出的异常（Promise rejection 会导致请求挂起，
// 在 Vercel 上最终表现为 500 / FUNCTION_INVOCATION_FAILED / 超时）。
// 统一用 asyncHandler 包装所有 async 路由，让任意异常进入下方的 JSON 错误中间件。
type AsyncRouteHandler = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => Promise<unknown>;

export function asyncHandler(fn: AsyncRouteHandler) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 兜底错误中间件（必须在所有路由注册之后、Vite/静态资源之前挂载）
 * 目的：
 *   1. JSON body 解析失败（SyntaxError / entity.parse.failed）→ 400 JSON，而不是默认 HTML 或 500；
 *   2. 所有 async 路由（经 asyncHandler 包装）抛出的异常 → 500 JSON，而不是请求挂起/平台 500；
 */
export function jsonErrorMiddleware(
  err: any,
  req: express.Request,
  res: express.Response,
  _next: express.NextFunction
) {
  const isBodyParseError = Boolean(
    err &&
      (err.type === 'entity.parse.failed' ||
        err.type === 'entity.too.large' ||
        err instanceof SyntaxError)
  );
  const status = isBodyParseError ? 400 : err?.status || err?.statusCode || 500;
  if (status >= 500) {
    console.error('[server] unhandled error:', err?.stack || err);
  }
  if (res.headersSent) {
    return;
  }
  const message = isBodyParseError
    ? 'Malformed JSON body: failed to parse request payload'
    : status >= 500
      ? 'Internal server error'
      : String(err?.message || 'Bad request');
  // status>=500 时附加可诊断的 detail（截断，避免泄露超大堆栈），方便前端定位问题来源，
  // 例如：AI API key 缺失、Supabase 未配置、上游超时等都能从 detail 一眼看出。
  const payload: Record<string, unknown> = { error: message };
  if (status >= 500 && err && !isBodyParseError) {
    const detail = String(err?.message || err?.code || err?.name || 'unknown error');
    if (detail) payload.detail = detail.slice(0, 300);
  }
  res.status(status).json(payload);
}

/** 未注册的 /api/* → 404 JSON，方便前端立刻识别"接口路径不存在"，不会被 SPA 兜底吞掉 */
export function apiNotFoundHandler(req: express.Request, res: express.Response) {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
}
