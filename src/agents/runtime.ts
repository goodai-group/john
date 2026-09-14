// Agent 运行时
//
// 把「超时 / 降级 / 追踪 / 错误归一化」这四件每个 Agent 都要做的事收敛到一处实现。
// 重构前这四件事散落在 server.ts 的每个路由里各写一遍（且 chat 与 stream 两处逐字重复）。
import {
  AgentContext,
  AgentDefinition,
  AgentDegradedError,
  AgentRunResult,
  AgentRunTrace,
  DegradeReason
} from './types.js';
import { recordTrace } from './trace.js';

let requestCounter = 0;

/** 生成一次请求的追踪标识 */
export function newRequestId(): string {
  requestCounter = (requestCounter + 1) % 1_000_000;
  return `${Date.now().toString(36)}-${requestCounter.toString(36)}`;
}

/** 给云端路径套一层超时上限，避免 serverless 被平台超时强杀 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new AgentDegradedError(`${label} timed out after ${timeoutMs}ms`, 'timeout')),
        timeoutMs
      );
    })
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  }) as Promise<T>;
}

/**
 * 执行一个 Agent。
 *
 * 流程：parseInput → run（带超时）→ 失败则 fallback → 记录 trace。
 *
 * 关键语义：
 *   - run() 抛 AgentDegradedError  → 视为「预期内降级」，走 fallback，不打 error 日志
 *   - run() 抛其他异常             → 同样走 fallback（保证用户永远拿得到答案），但打 warn 日志
 *   - fallback() 再抛               → 向上抛给 Express 错误中间件转 500 JSON
 *   - parseInput() 抛 AgentInputError → 直接向上抛，由路由转 400
 */
export async function runAgent<I, O>(
  def: AgentDefinition<I, O>,
  raw: unknown,
  ctx: AgentContext
): Promise<AgentRunResult<O>> {
  const input = def.parseInput(raw);
  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  const makeTrace = (
    mode: AgentRunTrace['mode'],
    degraded: boolean,
    reason: DegradeReason | null
  ): AgentRunTrace => ({
    requestId: ctx.requestId,
    agent: def.name,
    claimType: def.claimType,
    mode,
    durationMs: Date.now() - t0,
    degraded,
    errorKind: reason?.kind ?? null,
    error: reason?.message ?? null,
    startedAt
  });

  try {
    const output = await withTimeout(def.run(input, ctx), def.timeoutMs, def.name);
    const trace = makeTrace(def.deterministic ? 'deterministic' : 'gemini', false, null);
    recordTrace(trace);
    return { output, trace };
  } catch (err: any) {
    const reason: DegradeReason =
      err instanceof AgentDegradedError
        ? { message: err.message, kind: err.kind, exposeToClient: err.exposeToClient }
        : {
            message: String(err?.message || err || 'unknown error').slice(0, 200),
            kind: null,
            exposeToClient: true
          };

    if (!(err instanceof AgentDegradedError)) {
      console.warn(`[agent] "${def.name}" run() threw, falling back to local engine:`, reason.message);
    }

    const output = await def.fallback(input, ctx, reason);
    const trace = makeTrace('rules', true, reason);
    recordTrace(trace);
    return { output, trace };
  }
}
