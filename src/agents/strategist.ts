// Strategist 处方师 —— 只说该做什么
//
// 【这是整套架构可信度的第二根支柱】
//
// 铁律：**输出任何未经确定性引擎回验的建议，都是违规。**
//
// 工作方式：
//   1. 从 LEVER_CATALOG 里挑出与当前财务状况相关的杠杆
//   2. 每条杠杆在表单副本上真实施加一次，重跑 runBusinessAssessment
//   3. 算出真实分数增益，低于阈值的直接丢弃
//   4. 只有活下来的杠杆才交给 LLM —— 而 LLM 只负责把它翻译成人话
//
// 因此模型无法「发明一条建议并顺便编一个收益数字」：它拿到的候选集本身就是
// 被引擎筛过的，增益数字也来自引擎而非模型。
//
// 禁止：
//   ✕ 输出任何未经 ScoringSimulator 回验的建议
//   ✕ 重复推送用户已否决过的建议
//   ✕ 解释现状（那是 Interpreter 的职责）
import type { AgentDefinition } from './types.js';
import { AgentDegradedError, AgentInputError } from './types.js';
import type { AssessmentReport, BusinessFormData } from '../types.js';
import { classifyGeminiError, generateGeminiContent, getGeminiClient } from '../server/gemini.js';
import { simulateLevers, type SimulatedLever } from './levers.js';
import { getTool } from './tools.js';

export interface StrategistInput {
  form: BusinessFormData;
  report: AssessmentReport;
  language: string;
  /** 用户已否决过的杠杆 id —— 不再重复推送 */
  rejectedLeverIds: string[];
}

export interface ActionItem {
  id: string;
  title: string;
  detail: string;
  horizonDays: number;
  /** 由确定性引擎模拟得出的真实分数增益，**不是模型估的** */
  expectedScoreGain: number;
  baseScore: number;
  simulatedScore: number;
  verifiedBy: 'deterministic_simulation';
}

export interface AssumptionTest {
  assumption: string;
  howToVerify: string;
  estimatedCost: string;
}

export interface StrategistOutput {
  success: true;
  /** 已有营收的项目：经回验的行动清单 */
  actions: ActionItem[];
  /** 尚未开业的项目：开业前必须验证的假设 + 最低成本怎么验 */
  assumptionTests: AssumptionTest[];
  /** 本次模拟了几条杠杆、几条通过阈值 —— 可观测性 */
  simulation: { considered: number; passed: number; minGain: number };
}

const MIN_GAIN = 1;

const SYSTEM_INSTRUCTION = `
你是一位为全球海外小微经营者服务的经营顾问。

【极其重要的约束】
用户会给你一份【已经过确定性财务引擎验算的行动候选清单】。每条都附带真实的分数增益。
你的任务【只是把每条建议改写得更落地、更像人话】，严禁：
  1. 新增任何不在候选清单里的建议；
  2. 修改任何 expectedScoreGain 数字；
  3. 删除候选清单里的任何一条。

【改写要求】
- 用普通做买卖的老板听得懂的话，不用财务术语。
- 每条给出具体的第一步动作（这周就能做的那一步），而不是空泛的方向。
- 结合该项目所在行业的实际情况。
- 使用与 language 字段一致的语言。

返回合法 JSON，条目顺序与输入候选清单保持一致：
{
  "actions": [
    { "id": "候选清单里的 id，原样返回", "title": "改写后的标题", "detail": "改写后的落地说明，2-3 句" }
  ]
}
`;

const ASSUMPTION_SYSTEM_INSTRUCTION = `
你是一位帮助「还没开业的人」做开业前验证的顾问。

用户会给你该项目的确定性测算结果（保本点、回本周期等），这些数字由财务引擎算出。
请据此给出【开业前必须验证的 3 个假设】，每个假设配一条【最低成本的验证方法】。

【要求】
- 假设必须是可证伪的具体命题（例如「这条街每天能有 62 个客人愿意花 X 元买一杯」），
  而不是「市场需求不错」这类无法验证的说法。
- 验证方法必须便宜、快、能在开业前完成（摆摊试卖、预售、问卷、蹲点数客流等）。
- 严禁修改或重述用户给出的任何财务数字。
- 使用与 language 字段一致的语言。

返回合法 JSON：
{
  "assumptionTests": [
    { "assumption": "可证伪的具体命题", "howToVerify": "最低成本的验证方法", "estimatedCost": "大致花费与耗时" }
  ]
}
`;

/** 把模拟结果转成行动项（降级路径直接用杠杆自带的模板文案） */
function toActionItems(sims: SimulatedLever[], language: string): ActionItem[] {
  const isEn = language === 'en';
  return sims.map((s) => ({
    id: s.lever.id,
    title: isEn ? s.lever.titleEn : s.lever.titleZh,
    detail: isEn ? s.lever.detailEn : s.lever.detailZh,
    horizonDays: s.lever.horizonDays,
    expectedScoreGain: s.scoreGain,
    baseScore: s.baseScore,
    simulatedScore: s.simulatedScore,
    verifiedBy: 'deterministic_simulation' as const
  }));
}

/** 未开业项目的确定性测算：保本点与回本周期 */
function feasibilityNumbers(form: BusinessFormData) {
  const breakEven = getTool('calculateBreakEvenRevenue')(form);
  const payback = getTool('calculatePaybackPeriod')(form);
  return { breakEven, payback };
}

export const strategistAgent: AgentDefinition<StrategistInput, StrategistOutput> = {
  name: 'strategist',
  claimType: 'action',
  futureRole: 'Strategist 处方师',
  tools: ['runBusinessAssessment', 'calculateBreakEvenRevenue', 'calculatePaybackPeriod'],
  timeoutMs: 27000,

  parseInput(raw) {
    const body: any = (raw && typeof raw === 'object' ? raw : {}) || {};
    if (!body.form) throw new AgentInputError('Form data is required');
    if (!body.report) throw new AgentInputError('Report object is required');
    return {
      form: body.form,
      report: body.report,
      language: body.language ?? 'zh',
      rejectedLeverIds: Array.isArray(body.rejectedLeverIds) ? body.rejectedLeverIds : []
    };
  },

  async run(input) {
    const preLaunch = input.form.businessStage !== 'has_revenue';

    // —— 未开业：产出开业前的假设验证计划，而不是优化清单 ——
    if (preLaunch) {
      const ai = getGeminiClient();
      if (!ai) throw new AgentDegradedError('Gemini API key not configured', null, false);

      const { breakEven, payback } = feasibilityNumbers(input.form);
      let replyText: string;
      try {
        replyText = await generateGeminiContent(
          `项目: ${input.form.projectName}\n行业: ${input.form.industry}\nlanguage: ${input.language}\n` +
            `确定性测算结果: ${JSON.stringify({ breakEven, payback })}`,
          ASSUMPTION_SYSTEM_INSTRUCTION
        );
      } catch (err: any) {
        const { message, kind } = classifyGeminiError(err);
        throw new AgentDegradedError(message, kind);
      }
      let parsed: any;
      try {
        parsed = JSON.parse(replyText || '{}');
      } catch {
        throw new AgentDegradedError('Gemini returned malformed JSON', null);
      }
      if (!Array.isArray(parsed.assumptionTests) || parsed.assumptionTests.length === 0) {
        throw new AgentDegradedError('Gemini returned no assumption tests', null);
      }
      return {
        success: true,
        actions: [],
        assumptionTests: parsed.assumptionTests,
        simulation: { considered: 0, passed: 0, minGain: MIN_GAIN }
      };
    }

    // —— 已有营收：先回验，再让模型措辞 ——
    const allSims = simulateLevers(input.form, input.report, MIN_GAIN);
    const sims = allSims.filter((s) => !input.rejectedLeverIds.includes(s.lever.id));
    const baseline = toActionItems(sims, input.language);

    // 没有任何杠杆通过回验 —— 就不给建议。不硬凑。
    if (baseline.length === 0) {
      return {
        success: true,
        actions: [],
        assumptionTests: [],
        simulation: { considered: allSims.length, passed: 0, minGain: MIN_GAIN }
      };
    }

    const ai = getGeminiClient();
    if (!ai) throw new AgentDegradedError('Gemini API key not configured', null, false);

    let replyText: string;
    try {
      replyText = await generateGeminiContent(
        `项目: ${input.form.projectName}\n行业: ${input.form.industry}\nlanguage: ${input.language}\n` +
          `已验算的候选清单: ${JSON.stringify(
            baseline.map((a) => ({
              id: a.id,
              title: a.title,
              detail: a.detail,
              expectedScoreGain: a.expectedScoreGain
            }))
          )}`,
        SYSTEM_INSTRUCTION
      );
    } catch (err: any) {
      const { message, kind } = classifyGeminiError(err);
      throw new AgentDegradedError(message, kind);
    }

    let parsed: any;
    try {
      parsed = JSON.parse(replyText || '{}');
    } catch {
      throw new AgentDegradedError('Gemini returned malformed JSON', null);
    }

    // 【关键校验】模型只能改写，不能增删。
    // 以引擎产出的 baseline 为准做左连接：模型给了改写就用改写的文案，
    // 没给就用杠杆自带模板；模型凭空多出来的条目一律丢弃。
    const rewrites = new Map<string, { title?: string; detail?: string }>();
    for (const a of (parsed.actions as any[]) || []) {
      if (a?.id) rewrites.set(String(a.id), { title: a.title, detail: a.detail });
    }
    const actions = baseline.map((a) => {
      const r = rewrites.get(a.id);
      return {
        ...a,
        title: r?.title || a.title,
        detail: r?.detail || a.detail
        // expectedScoreGain / baseScore / simulatedScore 一律保留引擎原值，模型改不动
      };
    });

    return {
      success: true,
      actions,
      assumptionTests: [],
      simulation: { considered: allSims.length, passed: actions.length, minGain: MIN_GAIN }
    };
  },

  fallback(input) {
    const preLaunch = input.form.businessStage !== 'has_revenue';

    if (preLaunch) {
      const { breakEven, payback } = feasibilityNumbers(input.form);
      const isEn = input.language === 'en';
      const daily = breakEven.dailyBreakEvenRevenue;
      const months = payback.paybackMonths;
      return {
        success: true,
        actions: [],
        assumptionTests: isEn
          ? [
              {
                assumption: `Customers in this location will actually spend enough to reach ${Math.round(daily)} per operating day.`,
                howToVerify:
                  'Run a 3-day pop-up stall or pre-sale at the exact target location and count real paying customers, not passers-by.',
                estimatedCost: '3 days plus a small stock of goods'
              },
              {
                assumption:
                  'The rent, staffing and utility quotes you used are the real numbers a newcomer gets, not the advertised ones.',
                howToVerify:
                  'Get three written quotes from different landlords/suppliers in the same street and compare against what you assumed.',
                estimatedCost: 'About a week of legwork, no cash outlay'
              },
              {
                assumption:
                  months === null
                    ? 'The business can reach a positive monthly surplus at all under these costs.'
                    : `The payback period of about ${months} months is acceptable to you and to whoever funded the initial investment.`,
                howToVerify:
                  'Write the monthly surplus figure on paper and check it against the minimum you need to live on and to repay any borrowed capital.',
                estimatedCost: 'One evening'
              }
            ]
          : [
              {
                assumption: `这个位置的客人真的能撑起每天约 ${Math.round(daily)} 的营业额。`,
                howToVerify:
                  '在目标地点摆 3 天临时摊位或做一次预售，数真正掏钱的客人，不是路过的人。',
                estimatedCost: '3 天时间 + 少量备货'
              },
              {
                assumption: '你用的房租、人工、水电报价，是新人真能拿到的价，而不是挂出来的价。',
                howToVerify: '在同一条街找三家不同房东/供应商各要一份书面报价，和你的假设对一遍。',
                estimatedCost: '约一周跑腿，不花钱'
              },
              {
                assumption:
                  months === null
                    ? '在这个成本结构下，这门生意每月到底能不能剩下钱。'
                    : `约 ${months} 个月的回本周期，你本人和出本金的人都能接受。`,
                howToVerify:
                  '把每月净结余的数字写在纸上，对照你的生活最低开销和需要还的本金，看撑不撑得住。',
                estimatedCost: '一个晚上'
              }
            ],
        simulation: { considered: 0, passed: 0, minGain: MIN_GAIN }
      };
    }

    // 降级路径同样完整走一遍确定性回验 —— 少的只是模型的措辞润色。
    const allSims = simulateLevers(input.form, input.report, MIN_GAIN);
    const sims = allSims.filter((s) => !input.rejectedLeverIds.includes(s.lever.id));
    const actions = toActionItems(sims, input.language);
    return {
      success: true,
      actions,
      assumptionTests: [],
      simulation: { considered: allSims.length, passed: actions.length, minGain: MIN_GAIN }
    };
  }
};
