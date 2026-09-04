// 与 john 项目的 api/health.ts 完全一致的写法（TS + import type）
import type { IncomingMessage, ServerResponse } from 'node:http';

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
      hasGeminiKey: hasGemini,
      timestamp: new Date().toISOString()
    })
  );
}
