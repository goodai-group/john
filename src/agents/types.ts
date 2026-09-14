// Agent 统一契约
//
// 这是多 Agent 架构的枢纽文件。Phase 0 只做「把现有 4 个 AI 接口装进这个契约」，
// 不改任何行为；Phase 1-4 新增的角色（Scout / Registrar / Interpreter / Strategist /
// Tracker / Guardian）全部实现同一个接口，因此编排层、追踪、降级、超时只需实现一次。
//
// 设计铁律（见《多 Agent 架构改造方案》第 02 章）：
//   Agent 只做「输入整理」「输出翻译」「跟踪随访」，永远不做裁判。
//   评分由 src/lib/ 下的确定性引擎完成，Agent 只能通过 Tool Registry 调用它们。
import type { GeminiErrorKind } from '../server/gemini.js';

/**
 * 断言类型 —— 整套架构的切分依据。
 *
 * 角色不按「功能模块」切（那样必然重叠），而按「这个 Agent 生产哪一类断言」切，
 * 因为不同类型的断言校验方式根本不同，这既让角色天然不重叠，
 * 又直接决定了该 Agent 需要什么治理机制：
 *
 *   external_fact   外部世界事实  → 校验：引用来源   （Scout，幻觉风险最高，需 RAG）
 *   project_fact    本项目事实    → 校验：用户确认   （Registrar）
 *   interpretation  现状解释      → 校验：引用指标   （Interpreter）
 *   action          未来行动      → 校验：模拟验算   （Strategist）
 *   change          时间变化      → 校验：版本 diff  （Tracker）
 *   conversation    对话          → 不产断言        （Coach）
 *   gate            能否放行      → 校验：规则       （Guardian）
 */
export type ClaimType =
  | 'external_fact'
  | 'project_fact'
  | 'interpretation'
  | 'action'
  | 'change'
  | 'conversation'
  | 'gate';

/**
 * 本次输出的产出方式：
 *   gemini        云端模型产出
 *   rules         本地确定性规则兜底产出（云端不可用/失败）
 *   deterministic 该 Agent 本身就没有云端路径，产出即确定性计算（如 revenueGap）
 */
export type AgentMode = 'gemini' | 'rules' | 'deterministic';

/** 走降级路径的原因 */
export interface DegradeReason {
  /** Gemini 未配置 / 配额冷却 / 调用失败 */
  message: string | null;
  kind: GeminiErrorKind | null;
  /**
   * 该原因是否应写入面向前端的响应体。
   * false 用于「Gemini 未配置」——此时前端的 geminiError 字段必须为 null
   * （与重构前一致），但 trace 里仍要记下真实原因以便排查。
   */
  exposeToClient: boolean;
}

/**
 * Agent 主动声明「我跑不了云端路径，请走降级」。
 * 由 runAgent() 捕获后调用 fallback()，并把原因透传给 fallback 以便写进响应体
 * （前端依赖 geminiUnavailable / geminiError / geminiErrorKind 三个字段显示降级徽章）。
 */
export class AgentDegradedError extends Error {
  readonly kind: GeminiErrorKind | null;
  /** 是否把 message 暴露给前端；未配置 API key 这类内部状态置 false */
  readonly exposeToClient: boolean;
  constructor(message: string, kind: GeminiErrorKind | null = null, exposeToClient = true) {
    super(message);
    this.name = 'AgentDegradedError';
    this.kind = kind;
    this.exposeToClient = exposeToClient;
  }
}

/**
 * 输入不合法（缺必填字段等）。
 * 携带 status=400，由 Express 错误中间件原样转成 400 { error: "<message>" }，
 * 与重构前每个路由里手写的 res.status(400).json(...) 逐字一致。
 */
export class AgentInputError extends Error {
  readonly status = 400;
  constructor(message: string) {
    super(message);
    this.name = 'AgentInputError';
  }
}

/** Agent 运行上下文。Phase 1 会在此挂 ProjectDossier（带字段级溯源的项目档案）。 */
export interface AgentContext {
  /** 用户界面语言，'zh' | 'en' */
  language: string;
  /** 单次请求标识，用于把一次请求内的多个 Agent 调用串成一条 trace */
  requestId: string;
}

/**
 * Agent 定义。
 *
 * 硬约束（四条缺一不可）：
 *   1. 单一决策       —— 一个 Agent 只产一类断言（claimType）
 *   2. 结构化输出     —— run/fallback 返回定型对象，自由文本只允许出现在渲染层
 *   3. 声明所用工具   —— tools 声明式列出，便于 Guardian 审计与 Phase 2 权限收敛
 *   4. 有本地降级路径 —— fallback 必填，非可选。对弱网地区用户这是生死线。
 */
export interface AgentDefinition<I, O> {
  /** 全局唯一名称，同时作为 trace 中的标识 */
  name: string;
  /** 该 Agent 生产哪一类断言 —— 决定校验方式 */
  claimType: ClaimType;
  /** 未来归属的角色（Phase 2-3 迁移目标），仅作文档用途 */
  futureRole: string;
  /** 声明式列出用到的 Tool，便于审计 */
  tools: string[];
  /** 云端路径超时上限 */
  timeoutMs: number;
  /**
   * 该 Agent 是否没有云端路径（run 本身即确定性计算）。
   * 置 true 后 trace 记为 mode: 'deterministic' 且永不标记为降级 ——
   * 否则 revenueGap 这类纯插值计算会被误记成「云端成功」，污染可观测性。
   */
  deterministic?: boolean;
  /** 输入归一化与校验；不合法时抛 AgentInputError */
  parseInput(raw: unknown): I;
  /** 云端主路径；不可用时抛 AgentDegradedError 交给 fallback */
  run(input: I, ctx: AgentContext): Promise<O>;
  /** 本地确定性降级路径，必须实现 */
  fallback(input: I, ctx: AgentContext, reason: DegradeReason): O | Promise<O>;
}

/** 一次 Agent 调用的执行记录，Phase 1 落库到 agent_runs 表 */
export interface AgentRunTrace {
  requestId: string;
  agent: string;
  claimType: ClaimType;
  mode: AgentMode;
  durationMs: number;
  /** 是否走了降级路径 */
  degraded: boolean;
  errorKind: GeminiErrorKind | null;
  error: string | null;
  startedAt: string;
}

/** runAgent 的返回值：产物 + 执行记录 */
export interface AgentRunResult<O> {
  output: O;
  trace: AgentRunTrace;
}
