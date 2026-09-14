// Agent 执行追踪
//
// 【为什么 Phase 0 就要做】没有 trace，多 Agent 系统是调不动的：出问题时无法定位
// 是哪个角色、哪一环、是云端失败还是本地兜底。这也是《方案》第 07 章列为
// 「不做就调不动」的那张表。
//
// Phase 0：结构化 JSON 行写 stdout（零依赖、零风险，Vercel 日志直接可查）。
// Phase 1：调用 setTraceSink() 换成写 Supabase agent_runs 表，Agent 代码一行不用改。
import type { AgentRunTrace } from './types.js';

export type TraceSink = (trace: AgentRunTrace) => void | Promise<void>;

/** 默认 sink：结构化单行 JSON，便于日志平台检索 */
const consoleSink: TraceSink = (trace) => {
  const tag = trace.degraded ? 'degraded' : 'ok';
  console.log(
    `[agent] ${JSON.stringify({
      ...trace,
      result: tag
    })}`
  );
};

let activeSink: TraceSink = consoleSink;

/** 替换 trace 落地方式（Phase 1 在此接入 Supabase agent_runs 表） */
export function setTraceSink(sink: TraceSink): void {
  activeSink = sink;
}

/**
 * 写入一条 trace。
 * 刻意吞掉 sink 自身的异常：追踪失败绝不能影响用户请求的正常返回。
 */
export function recordTrace(trace: AgentRunTrace): void {
  try {
    const maybePromise = activeSink(trace);
    if (maybePromise && typeof (maybePromise as Promise<void>).catch === 'function') {
      (maybePromise as Promise<void>).catch((err) => {
        console.warn('[agent] trace sink failed:', err?.message || err);
      });
    }
  } catch (err: any) {
    console.warn('[agent] trace sink threw:', err?.message || err);
  }
}
