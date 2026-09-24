// 服务端鉴权：校验请求携带的 Supabase JWT。
//
// 背景（BUG-02，P0）：/api/ai-consultation、/api/ai/infer-business-structure 等接口此前
// 没有做任何登录校验，未带 Authorization 头也能直接 200 拿到 Gemini 生成内容——
// 绕过了产品"全部功能需登录"的约束，外部可脚本化刷接口消耗 Gemini 额度。
//
// 校验方式：用 Supabase anon key 初始化一个只读客户端，把前端传来的 access token
// 交给 supabase.auth.getUser(token) 验证签名与有效期，不在服务端自行解码 JWT，
// 避免密钥/算法处理出错导致的绕过风险。
import type express from 'express';
import { createClient } from '@supabase/supabase-js';

function readEnv(...keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  return '';
}

const supabaseUrl = readEnv('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'VITE_SUPABASE_URL').trim();
const supabaseAnonKey = readEnv(
  'SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'VITE_SUPABASE_ANON_KEY'
).trim();

const authClient =
  supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')
    ? createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } })
    : null;

export interface AuthedRequest extends express.Request {
  authUserId?: string;
}

// 极简的按用户内存限流：serverless 实例可能随时冷启动/被回收，这里做不到精确的
// 全局限流，但能在同一热实例内挡住短时间大量刷量，作为 JWT 鉴权之外的第二道防线。
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_PER_WINDOW = 20;
const requestLog = new Map<string, number[]>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const timestamps = (requestLog.get(key) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  timestamps.push(now);
  requestLog.set(key, timestamps);
  return timestamps.length > RATE_LIMIT_MAX_PER_WINDOW;
}

/**
 * 要求请求带有效的 Supabase 登录态才能继续。
 * Supabase 未配置时（本地开发/演示环境没有配置云端数据库）放行，
 * 与 GEMINI_API_KEY 缺失时自动降级为本地规则引擎的策略保持一致，
 * 不因为可选的云端能力未配置而把本地开发也堵死。
 */
export function requireAuth() {
  return async (req: AuthedRequest, res: express.Response, next: express.NextFunction) => {
    if (!authClient) {
      return next();
    }

    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: missing bearer token' });
    }

    try {
      const { data, error } = await authClient.auth.getUser(token);
      if (error || !data?.user) {
        return res.status(401).json({ error: 'Unauthorized: invalid or expired session' });
      }
      req.authUserId = data.user.id;
    } catch (e: any) {
      console.warn('[auth] token verification failed:', e?.message || e);
      return res.status(401).json({ error: 'Unauthorized: invalid or expired session' });
    }

    if (isRateLimited(req.authUserId)) {
      return res.status(429).json({ error: 'Too many requests, please slow down' });
    }

    next();
  };
}
