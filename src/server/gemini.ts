// Gemini 云端调用层
//
// 【Phase 0 重构】原位于 server.ts 第 40-110 行，另有一段「错误分类 + 配额冷却」逻辑
// 在 /api/ai/chat 与 /api/ai/chat/stream 两处逐字重复了一遍。这里合并为 classifyGeminiError()，
// 行为与原先完全一致（判定顺序、正则、冷却写入时机均未改动）。
import { GoogleGenAI } from '@google/genai';

/** Gemini 调用失败的归类，供前端展示准确的降级原因徽章 */
export type GeminiErrorKind = 'quota' | 'auth' | 'model' | 'timeout' | 'network';

// Lazy Gemini client helper
let aiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GEMINI_API_KEY;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

// Gemini 429 配额冷却：免费层对每个模型每天有请求上限（如 gemini-3.1-flash-lite 为 20 次/日）。
// 收到 429 配额超限后的一段时间内直接走本地规则库，避免每次提问都白等一次注定失败的云端请求，
// 冷却结束后自动恢复云端 AI。
let geminiQuotaCooldownUntil = 0;
const GEMINI_QUOTA_COOLDOWN_MS = 90 * 1000;

/** 当前是否处于 429 配额冷却期内（冷却期内不应发起注定失败的云端请求） */
export function isGeminiInQuotaCooldown(): boolean {
  return Date.now() < geminiQuotaCooldownUntil;
}

// Gemini 模型候选列表：按顺序尝试，首个可用的模型即被使用。
// 2026-09 现状：
//   - gemini-2.0-flash：已全局下线（404 "no longer available"）
//   - gemini-2.5-flash：仅对早期账号开放（对当前新账号返回 "no longer available to new users"）
//   - gemini-3.6-flash：曾经常遇到 503 UNAVAILABLE（"experiencing high demand"）
//   - gemini-3.1-flash-lite：当前默认，轻量级模型，配额更宽松、响应更快
// 全应用统一改用 3.1-flash-lite，避免混用多个模型版本。
export const GEMINI_MODELS = ['gemini-3.1-flash-lite'];

// 503 UNAVAILABLE（"currently experiencing high demand"）是 Gemini 官方文档明确标注的
// 瞬时性错误，建议短暂退避后重试；与配额耗尽（429）、鉴权失败等永久性错误不同，
// 不应立刻降级走 fallback。
function isRetryableGeminiError(err: unknown): boolean {
  const message = ((err as any)?.message || String(err) || '');
  return /503|UNAVAILABLE|overloaded/i.test(message);
}

const GEMINI_RETRY_DELAYS_MS = [500, 1500];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateGeminiContent(
  contents: string,
  systemInstruction: string,
  timeoutMs = 25000
): Promise<string> {
  const ai = getGeminiClient();
  if (!ai) throw new Error('Gemini API key not configured');

  let lastError: unknown = null;
  for (const model of GEMINI_MODELS) {
    // 单次尝试 + 最多两次针对瞬时性 503 的退避重试，仍共享调用方的整体超时预算
    // （外层 Agent 调度器已对 def.run 施加了统一超时，这里不再单独放大预算）。
    for (let attempt = 0; attempt <= GEMINI_RETRY_DELAYS_MS.length; attempt++) {
      try {
        const response = await Promise.race([
          ai.models.generateContent({
            model,
            contents,
            config: {
              systemInstruction,
              responseMimeType: 'application/json'
            }
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Gemini "${model}" timed out after ${timeoutMs}ms`)), timeoutMs)
          )
        ]);
        const text = response.text || '';
        if (!text.trim()) throw new Error(`Gemini "${model}" returned an empty response`);
        return text;
      } catch (err: any) {
        lastError = err;
        const retryDelay = GEMINI_RETRY_DELAYS_MS[attempt];
        if (retryDelay !== undefined && isRetryableGeminiError(err)) {
          console.warn(
            `Gemini model "${model}" hit a transient error, retrying in ${retryDelay}ms:`,
            err?.message || err
          );
          await delay(retryDelay);
          continue;
        }
        console.warn(`Gemini model "${model}" failed:`, err?.message || err);
        break;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('All Gemini models failed');
}

/**
 * 归类 Gemini 调用异常，并在命中 429 配额超限时写入冷却截止时间。
 *
 * 【重要】判定顺序与正则必须与重构前保持一致：quota → auth → model → timeout → network，
 * 且只有 quota 分支会设置冷却。前端 AiRuleConsultationDrawer 依据 errorKind 显示不同徽章。
 */
export function classifyGeminiError(err: unknown): { message: string; kind: GeminiErrorKind } {
  const anyErr = err as any;
  const message = (anyErr?.message || String(err) || '').slice(0, 200);

  if (/429|RESOURCE_EXHAUSTED|quota|Quota/i.test(message)) {
    geminiQuotaCooldownUntil = Date.now() + GEMINI_QUOTA_COOLDOWN_MS;
    return { message, kind: 'quota' };
  }
  if (/401|403|api key|permission|unauthorized/i.test(message)) {
    return { message, kind: 'auth' };
  }
  if (/404|no longer available|not found|does not support/i.test(message)) {
    return { message, kind: 'model' };
  }
  if (/timed out|timeout/i.test(message)) {
    return { message, kind: 'timeout' };
  }
  return { message, kind: 'network' };
}
