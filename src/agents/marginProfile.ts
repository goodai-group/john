// Margin Profile Agent —— 判断项目属于哪个细分业态，并给出该业态的毛利率红线与预警区间
//
// 分工（沿用「Agent 不做裁判」的铁律）：
//   - Gemini 只做"归类"：从候选业态清单里挑一个 id，并说明理由；
//   - 红线 / 预警线 / 评分档位的数字一律取自 lib/grossMarginPolicy.ts 的 MARGIN_PROFILES，
//     模型不能自己编数字，也不能返回清单之外的 id（返回非法 id 视为失败，走本地兜底）。
// 云端不可用时用同一份关键词规则做本地判定（与评分引擎在没有保存业态时的判定完全一致），
// 因此降级结果是真实可用的，不像 businessStructure 那样只能告知"不可用"。
import { AgentDefinition, AgentDegradedError, AgentInputError, DegradeReason } from './types.js';
import {
  classifyGeminiError,
  generateGeminiContent,
  getGeminiClient,
  isGeminiInQuotaCooldown
} from '../server/gemini.js';
import {
  classifyMarginProfileLocal,
  getMarginProfileById,
  marginProfilesForIndustry,
  normalizeMarginIndustry,
  type GrossMarginPolicy,
  type MarginProfile
} from '../lib/grossMarginPolicy.js';

export interface MarginProfileInput {
  industry: string;
  projectName: string;
  customIndustryName: string;
  businessType: string;
  /** 补充描述：沙盒自由试算时用户写的一句话，或导入项目的主要成本 / 收入条目名 */
  description: string;
}

export interface MarginProfileOutput {
  success: boolean;
  source: 'gemini' | 'rules';
  profileId: string;
  industry: string;
  nameZh: string;
  nameEn: string;
  policy: GrossMarginPolicy;
  /** 判定理由（一句人话） */
  reason: string;
  /** 本地规则模式下是否命中了具体业态；false 表示只是兜底，建议用户手动确认 */
  confident: boolean;
  /** 本次可选的全部业态（前端手动改选用） */
  candidates: Array<{ id: string; nameZh: string; nameEn: string; policy: GrossMarginPolicy }>;
  reasonUnavailable?: string | null;
}

const toCandidate = (m: MarginProfile) => ({ id: m.id, nameZh: m.nameZh, nameEn: m.nameEn, policy: m.policy });

const joinText = (input: MarginProfileInput) =>
  [input.projectName, input.customIndustryName, input.businessType, input.description].filter(Boolean).join(' ');

function buildOutput(
  profile: MarginProfile,
  candidates: MarginProfile[],
  extra: Pick<MarginProfileOutput, 'source' | 'reason' | 'confident'>
): MarginProfileOutput {
  return {
    success: true,
    profileId: profile.id,
    industry: profile.industry,
    nameZh: profile.nameZh,
    nameEn: profile.nameEn,
    policy: profile.policy,
    candidates: candidates.map(toCandidate),
    ...extra
  };
}

export function buildMarginProfileInstruction(candidates: MarginProfile[]): string {
  const list = candidates.map((m) => `- ${m.id}：${m.nameZh}——${m.descZh}`).join('\n');
  return `
你是小微实体项目的行业分类员。根据用户给出的项目名称、行业大类与业务描述，判断它最贴近下面哪一个【细分业态】。
你只负责归类，不要评价生意好坏，也不要自己给出任何毛利率数字——数字由系统按所选业态查表得出。

候选业态（只能从中选一个 id，不得自创）：
${list}

判断要点：
1. 看这门生意"主要卖什么、卖给谁、怎么卖"，而不是只看大类名称。例如同为农业，大宗粮食、果蔬基地批发属于低毛利走量业态；采摘、农产品直销、农家乐属于直接面向消费者的业态。
2. 项目文字确实无法区分时，选带"（未细分）"或通用口径的那个业态，并在 reason 里说明信息不足。
3. reason 用一句中文大白话说明归类依据，引用项目文字里的关键信息，不超过 60 字。

只返回合法 JSON：
{ "profileId": "候选业态之一的 id", "reason": "一句话理由" }
`;
}

export const marginProfileAgent: AgentDefinition<MarginProfileInput, MarginProfileOutput> = {
  name: 'marginProfile',
  claimType: 'project_fact',
  futureRole: 'Registrar 建档员',
  tools: [],
  timeoutMs: 20000,

  parseInput(raw) {
    const body: any = (raw && typeof raw === 'object' ? raw : {}) || {};
    const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
    const input: MarginProfileInput = {
      industry: str(body.industry, 60),
      projectName: str(body.projectName, 120),
      customIndustryName: str(body.customIndustryName, 120),
      businessType: str(body.businessType, 200),
      description: str(body.description, 800)
    };
    if (!joinText(input) && !input.industry) {
      throw new AgentInputError('Industry or project description is required');
    }
    return input;
  },

  async run(input) {
    const ai = getGeminiClient();
    if (!ai) throw new AgentDegradedError('Gemini API key not configured', null, false);
    if (isGeminiInQuotaCooldown()) {
      throw new AgentDegradedError('Gemini 免费配额冷却中，已改用本地规则判定', 'quota');
    }

    const candidates = marginProfilesForIndustry(input.industry);
    let replyText: string;
    try {
      replyText = await generateGeminiContent(
        `行业大类: "${normalizeMarginIndustry(input.industry)}"\n项目名称: "${input.projectName}"\n自定义行业名: "${input.customIndustryName}"\n业务类型: "${input.businessType}"\n补充描述: "${input.description}"`,
        buildMarginProfileInstruction(candidates),
        input.description.length > 200 ? 18000 : 15000
      );
    } catch (err: any) {
      console.warn('Gemini margin-profile failed:', err.message);
      const { message, kind } = classifyGeminiError(err);
      throw new AgentDegradedError(message, kind);
    }

    let parsed: any;
    try {
      parsed = JSON.parse(replyText || '{}');
    } catch {
      throw new AgentDegradedError('Gemini returned malformed JSON', null);
    }

    // 只接受候选清单里的 id；模型编出来的 id 一律视为失败
    const picked = candidates.find((m) => m.id === parsed?.profileId);
    if (!picked) throw new AgentDegradedError('Gemini returned an unknown profileId', null);

    const reason = typeof parsed.reason === 'string' && parsed.reason.trim() ? parsed.reason.trim().slice(0, 200) : '';
    return buildOutput(picked, candidates, {
      source: 'gemini',
      reason: reason || `AI 判定为「${picked.nameZh}」`,
      confident: true
    });
  },

  fallback(input, _ctx, reason?: DegradeReason) {
    const candidates = marginProfilesForIndustry(input.industry);
    const local = classifyMarginProfileLocal(input.industry, joinText(input));
    const profile = getMarginProfileById(local.profile.id) ?? local.profile;
    const out = buildOutput(profile, candidates, {
      source: 'rules',
      reason: local.specific
        ? `按关键词「${local.matched.slice(0, 3).join('、')}」判定为「${profile.nameZh}」`
        : `项目文字里没有足够线索区分细分业态，暂按「${profile.nameZh}」的通用口径；建议在下方手动确认`,
      confident: local.specific
    });
    out.reasonUnavailable = reason?.exposeToClient ? reason.message : null;
    return out;
  }
};
