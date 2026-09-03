// Vercel serverless function: GET /api/health
// 独立于 Express server.ts，避免任何 rewrite / URL 转发行为差异。
// 返回结构与 server.ts 中 app.get('/api/health') 保持一致，兼容前端读取 hasGeminiKey / hasSupabaseConfig。
import type { IncomingMessage, ServerResponse } from 'node:http';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  const geminiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GEMINI_API_KEY;
  const hasGemini = Boolean(geminiKey && geminiKey !== 'MY_GEMINI_API_KEY');

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;
  const hasSupabase = Boolean(supabaseUrl && supabaseKey);

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(
    JSON.stringify({
      status: 'ok',
      version: '1.4.1',
      hasGeminiKey: hasGemini,
      hasSupabaseConfig: hasSupabase,
      timestamp: new Date().toISOString()
    })
  );
}
