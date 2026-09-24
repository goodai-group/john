// Vercel serverless function: GET /api/health
// 独立于 Express server.ts，避免任何 rewrite / URL 转发行为差异。
// 返回结构与 server.ts 中 app.get('/api/health') 保持一致，兼容前端读取 hasGeminiKey / hasSupabaseConfig。
import type { IncomingMessage, ServerResponse } from 'node:http';

// BUG-13 修复：此接口未登录即可访问，此前额外返回 version 与 hasSupabaseConfig，
// 相当于把部署版本号、后端配置状态白送给任何匿名探测者，属不必要的信息泄露。
// hasGeminiKey 前端 AiRuleConsultationDrawer 用于展示"本地规则库/AI 驱动"徽标，
// 是唯一被实际消费的字段，予以保留；其余不返回。
export default function handler(req: IncomingMessage, res: ServerResponse) {
  const geminiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GEMINI_API_KEY;
  const hasGemini = Boolean(geminiKey && geminiKey !== 'MY_GEMINI_API_KEY');

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(
    JSON.stringify({
      status: 'ok',
      hasGeminiKey: hasGemini
    })
  );
}
