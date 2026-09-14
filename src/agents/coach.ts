// Coach 教练 —— 编排层，唯一对用户说话的角色
//
// 【重要澄清】Coach 是**后端编排概念，不是 UI 范式**。表单交互原样保留 —— 由表单调用
// Coach，而不是把表单换成聊天。产品面向的是低数字素养、弱网、非母语用户：表单有结构、
// 可回看、可校对、断网也能填完；对话式线性、易迷失、强依赖网络。
// Agent 藏在表单背后，不取代表单。
//
// 职责：路由、追问、把专家产物组织成人话。
// 禁止：✕ 自己产生任何数字或判断  ✕ 让专家 Agent 直接对用户输出
import type { AgentContext, AgentDefinition } from './types.js';
import type { ProjectDossier } from './dossier.js';
import { runAgent } from './runtime.js';
import { review as guardianReview, type GuardianSubject, type GuardianVerdict } from './guardian.js';

/** 用户此刻想做什么 —— 决定激活哪条链路 */
export type CoachIntent = 'profile' | 'assess' | 'ask';

/**
 * 按 businessStage 分流。
 *
 * 【为什么必须分流】这是多 Agent 系统最常见的翻车点：把所有 Agent 都跑一遍。
 * 现在光一次行业推断就要 1.2 秒防抖 + Gemini 往返，串行跑完全部角色会到 30 秒以上，
 * 而用户在弱网地区。
 *
 * 表中列出的是**角色名**；尚未注册的角色会被自动跳过，
 * 因此后续 Phase 把角色接进注册表即自动生效，无需回头改这张表。
 */
const STAGE_PLANS: Record<string, Record<CoachIntent, string[]>> = {
  not_started: {
    profile: ['registrar', 'scout'],
    assess: ['registrar', 'scout', 'strategist'],
    ask: ['consultation']
  },
  has_prototype: {
    profile: ['registrar', 'scout'],
    assess: ['registrar', 'scout', 'interpreter', 'strategist'],
    ask: ['consultation']
  },
  has_revenue: {
    profile: ['registrar'],
    assess: ['registrar', 'interpreter', 'strategist', 'tracker'],
    ask: ['consultation']
  }
};

/** 一次编排的产物 */
export interface CoachEnvelope {
  stage: string;
  intent: CoachIntent;
  /** 各专家 Agent 的产物，按角色名索引 */
  artifacts: Record<string, unknown>;
  /** 本次实际跑了哪些角色（用于可观测性与前端调试） */
  ran: string[];
  /** 计划中但尚未注册的角色（后续 Phase 会补上） */
  skipped: string[];
  /**
   * 被 Guardian 否决的角色产物。
   * 【注意】被否决的产物是**整份丢弃**，不是被修改后放行 ——
   * 能改内容的守门人就是又一个会幻觉的 Agent，而它的输出没有人再审。
   */
  blocked: Array<{ role: string; reasons: string[] }>;
  traces: Array<{ agent: string; mode: string; degraded: boolean; durationMs: number }>;
}

export interface CoachDeps {
  /** 角色名 -> Agent 定义。由 registry 注入，便于测试替换 */
  agents: Record<string, AgentDefinition<any, any>>;
  /** 角色名 -> 从 Dossier 构造该角色输入 */
  inputFor: (role: string, dossier: ProjectDossier) => unknown;
  /**
   * 为 Guardian 提供校验依据（确定性引擎的权威数值）。
   * 不提供时 Guardian 仍会做越界承诺与 PII 检查，只是跳过数值一致性比对。
   */
  authoritativeFor?: (role: string, dossier: ProjectDossier, output: unknown) => GuardianSubject['authoritative'];
}

/** 查出某阶段某意图该跑哪些角色 */
export function planFor(stage: string | undefined, intent: CoachIntent): string[] {
  const plan = STAGE_PLANS[stage || 'has_revenue'] || STAGE_PLANS.has_revenue;
  return plan[intent] || [];
}

/**
 * 执行一次编排。
 *
 * 并发策略：计划内的角色并行跑。它们之间没有数据依赖 —— 依赖关系体现在
 * Dossier 的确认闸门上（下游只读 confirmed 数据），而不是调用顺序上。
 * 这也是「报告期 Interpreter 与 Strategist 并行」这条时延预算的落点。
 */
export async function runCoach(
  dossier: ProjectDossier,
  intent: CoachIntent,
  ctx: AgentContext,
  deps: CoachDeps
): Promise<CoachEnvelope> {
  const stage = dossier.form.businessStage || 'has_revenue';
  const planned = planFor(stage, intent);

  const ran: string[] = [];
  const skipped: string[] = [];
  const blocked: CoachEnvelope['blocked'] = [];
  const artifacts: Record<string, unknown> = {};
  const traces: CoachEnvelope['traces'] = [];

  const runnable = planned.filter((role) => {
    if (deps.agents[role]) return true;
    skipped.push(role);
    return false;
  });

  const results = await Promise.all(
    runnable.map(async (role) => {
      const agent = deps.agents[role];
      const input = deps.inputFor(role, dossier);
      const { output, trace } = await runAgent(agent, input, ctx);
      return { role, output, trace };
    })
  );

  for (const r of results) {
    traces.push({
      agent: r.trace.agent,
      mode: r.trace.mode,
      degraded: r.trace.degraded,
      durationMs: r.trace.durationMs
    });

    // —— Guardian 旁路审查：放行或否决，绝不修改内容 ——
    const verdict: GuardianVerdict = guardianReview({
      agent: r.role,
      claimType: deps.agents[r.role].claimType,
      output: r.output,
      authoritative: deps.authoritativeFor?.(r.role, dossier, r.output),
      isSensitiveRegion: dossier.form.isSensitiveRegion
    });

    if (!verdict.pass) {
      blocked.push({ role: r.role, reasons: verdict.reasons });
      console.warn(`[guardian] blocked "${r.role}": ${verdict.reasons.join(' | ')}`);
      continue;
    }

    ran.push(r.role);
    artifacts[r.role] = r.output;
  }

  return { stage, intent, artifacts, ran, skipped, blocked, traces };
}
