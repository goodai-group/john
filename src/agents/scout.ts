// Scout 属地情报官 —— 只产「外部世界事实」
//
// 【Phase 4】全系统风险最集中的角色。
//
// 《方案》第 06 章的核心结论：约 80% 的幻觉风险压在这一个角色上。
// 原因是只有它产出「外部世界事实」—— 内罗毕的用户没有能力判断
// 「营业执照年费 KES 30,000」是真是假，他会点确认，这个编造的数字随即
// 进入 companyRegistrationCost → costAggregation → 分数。
//
// 因此这里的机制比其他角色都重：
//
//   1. **无来源不得输出**：每条 ExternalFact 的 sourceRef 必填。
//   2. **查不到必须返回 unknown**，绝不猜。由 Coach 转述为「这项需要你本地核实」。
//   3. **模型自由生成必须标注等级**：优先使用团队自己维护的 REGULATORY_COST_TABLE
//      （20 个国家，每条自带 sourceNote，confidence: 'medium'）；表外国家不再直接判
//      unknown，而是退回 Gemini 凭通用知识估算（见 queryGeminiForUncoveredCountry），
//      但强制 confidence: 'low' 且 sourceRef 如实标注「AI 估算，非官方数据」，
//      不会伪装成查证过的事实；Gemini 也识别不出国家时仍归为 unknown，绝不瞎编。
//      知识库接口留成可插拔，将来接真实 RAG 时替换 KnowledgeSource 即可，Agent 本体不动。
//
// 禁止：
//   ✕ 碰任何本项目数据    ✕ 给建议    ✕ 猜
import type { AgentDefinition } from './types.js';
import { AgentDegradedError, AgentInputError } from './types.js';
import type { ExternalFact } from './dossier.js';
import { detectCountryCurrency, inferRegulatoryCosts } from '../lib/inferBusinessStructure.js';
import { SUPPORTED_CURRENCIES } from '../lib/currencies.js';
import { classifyGeminiError, generateGeminiContent, getGeminiClient } from '../server/gemini.js';

export interface ScoutInput {
  /** 用于识别属地的文本：店名 + 用户填写的国家 */
  locationHint: string;
  baseCurrency: string;
  language: string;
}

/** 查不到的项：明确告诉用户「未知」，而不是给一个看起来像样的数字 */
export interface UnknownFact {
  key: string;
  reason: string;
  /** 用户该去哪里核实 */
  verifyWith: string;
}

export interface ScoutOutput {
  success: true;
  /** 识别出的属地；未识别时为 null */
  region: string | null;
  /** 有出处的外部事实 */
  facts: ExternalFact[];
  /** 查不到的项 —— 这部分同样是产物，不是失败 */
  unknowns: UnknownFact[];
}

/**
 * 知识来源接口（可插拔）。
 * Phase 4 的实现读团队自己维护的属地成本表；将来接入真实 RAG 检索时替换这一个实现即可。
 */
export interface KnowledgeSource {
  name: string;
  lookup(input: ScoutInput): { region: string | null; facts: ExternalFact[]; unknowns: UnknownFact[] };
}

/** 内置知识源：团队维护的 REGULATORY_COST_TABLE（20 国，逐条自带 sourceNote） */
export const curatedRegulatorySource: KnowledgeSource = {
  name: 'curated_regulatory_table',

  lookup(input) {
    const hint = (input.locationHint || '').toLowerCase();
    const detected = detectCountryCurrency(hint);
    const isEn = input.language === 'en';

    // —— 没识别出国家：不猜。全部转为 unknown ——
    //
    // inferRegulatoryCosts 在这种情况下会返回一份「通用/未识别地区」的默认区间。
    // 那份默认值适合作为表单里的占位提示，但**不适合作为「事实」输出** ——
    // 一旦以 ExternalFact 的形式给出，用户就会把它当成查证过的数字。
    if (!detected) {
      const reason = isEn
        ? 'No country or city could be identified from the project name or the country field.'
        : '从项目名称与所填国家中，识别不出具体的国家或城市。';
      return {
        region: null,
        facts: [],
        unknowns: [
          {
            key: 'company_registration_cost',
            reason,
            verifyWith: isEn
              ? 'Your local business registry or one-stop government service portal'
              : '当地工商登记机构或政务一站式服务窗口'
          },
          {
            key: 'visa_fee_cost',
            reason,
            verifyWith: isEn
              ? 'The immigration authority of the country you operate in'
              : '经营所在国的移民局'
          },
          {
            key: 'corporate_tax_rate',
            reason,
            verifyWith: isEn ? 'Your local tax authority' : '当地税务主管部门'
          }
        ]
      };
    }

    // —— 识别出国家：输出带出处的事实 ——
    const est = inferRegulatoryCosts(
      input.locationHint,
      input.baseCurrency,
      isEn ? 'en' : 'zh'
    );

    const facts: ExternalFact[] = [
      {
        key: 'company_registration_cost',
        value: est.registrationLocal,
        unit: input.baseCurrency,
        sourceRef: est.sourceNote,
        confidence: 'medium'
      },
      {
        key: 'visa_fee_cost',
        value: est.visaLocal,
        unit: input.baseCurrency,
        sourceRef: est.sourceNote,
        confidence: 'medium'
      },
      {
        key: 'corporate_tax_rate',
        value: est.corporateTaxRateHint,
        sourceRef: est.sourceNote,
        confidence: 'medium'
      }
    ];

    return { region: est.countryLabel, facts, unknowns: [] };
  }
};

let activeSource: KnowledgeSource = curatedRegulatorySource;

/** 替换知识源（将来接入 RAG 检索时调用，Agent 本体不动） */
export function setKnowledgeSource(source: KnowledgeSource): void {
  activeSource = source;
}

const GEMINI_LOOKUP_SYSTEM_INSTRUCTION = `
你是跨境小微经营者的属地合规成本研究助手。给定一个国家/城市名称，请基于你的通用知识给出：
1. 公司注册/营业执照费用的粗略估值（美元）
2. 外籍经营者/员工签证与工作许可费用的粗略估值（美元，若该国无需签证或允许免签经商则填 0）
3. 一句话小微企业所得税/营业税提示

严格要求：
- 如果输入文本中根本无法识别出具体的国家或地区，直接返回 {"identified": false}，绝不编造一个国家。
- 数值必须是你能合理估计的粗略区间中位数，不确定时给保守的中等估计，绝不能瞎编一个精确到个位数、看起来像官方数据的数字。
- 只输出 JSON，不要任何解释性文字：
{
  "identified": true,
  "countryLabel": "中文国家/地区名",
  "countryLabelEn": "English country/region name",
  "registrationUsd": 数字,
  "visaUsd": 数字,
  "taxHint": "中文一句话提示",
  "taxHintEn": "English one-line hint"
}
`;

interface GeminiRegulatoryLookup {
  identified: boolean;
  countryLabel?: string;
  countryLabelEn?: string;
  registrationUsd?: number;
  visaUsd?: number;
  taxHint?: string;
  taxHintEn?: string;
}

/**
 * 兜底知识源：curatedRegulatorySource 覆盖不到的国家（约 20 国之外的绝大多数），
 * 不再直接判 unknown，而是把 locationHint 交给 Gemini 做一次通用知识估算。
 *
 * 仍然遵守「无来源不得输出」——Gemini 给出的不是可核实的官方数字，因此：
 *   - confidence 固定为 'low'（区别于策展表的 'medium'）
 *   - sourceRef 如实标注「AI 通用知识估算，非官方实时数据」，不会伪装成查证过的事实
 *   - Gemini 明确识别不出国家时，同样归为 unknown，绝不强行编一个地区出来
 *
 * Gemini 未配置/配额耗尽/调用失败时抛 AgentDegradedError，由上层 runAgent 转去
 * fallback()（即退回策展表的 unknown 列表），不会让用户看到一个失败的空白。
 */
async function queryGeminiForUncoveredCountry(
  input: ScoutInput
): Promise<{ region: string | null; facts: ExternalFact[]; unknowns: UnknownFact[] }> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new AgentDegradedError('Gemini API key not configured', null, false);
  }

  const isEn = input.language === 'en';
  let replyText: string;
  try {
    replyText = await generateGeminiContent(input.locationHint, GEMINI_LOOKUP_SYSTEM_INSTRUCTION, 12000);
  } catch (err: any) {
    const { message, kind } = classifyGeminiError(err);
    throw new AgentDegradedError(message, kind);
  }

  let parsed: GeminiRegulatoryLookup;
  try {
    parsed = JSON.parse(replyText || '{}');
  } catch {
    throw new AgentDegradedError('Gemini returned malformed JSON', null);
  }

  if (!parsed.identified || !parsed.countryLabel || !parsed.countryLabelEn) {
    const reason = isEn
      ? 'The AI could not identify a specific country from the project name or the country field either.'
      : 'AI 同样未能从项目名称与所填国家中识别出具体的国家或地区。';
    return {
      region: null,
      facts: [],
      unknowns: [
        {
          key: 'company_registration_cost',
          reason,
          verifyWith: isEn ? 'Your local business registry or one-stop government service portal' : '当地工商登记机构或政务一站式服务窗口'
        },
        {
          key: 'visa_fee_cost',
          reason,
          verifyWith: isEn ? 'The immigration authority of the country you operate in' : '经营所在国的移民局'
        },
        {
          key: 'corporate_tax_rate',
          reason,
          verifyWith: isEn ? 'Your local tax authority' : '当地税务主管部门'
        }
      ]
    };
  }

  const rate = SUPPORTED_CURRENCIES.find((c) => c.code === input.baseCurrency)?.rateToUsd || 1;
  const toLocal = (usd: number) => Math.round((Number.isFinite(usd) ? usd : 0) * rate);
  const sourceRef = isEn
    ? 'AI general-knowledge estimate (Gemini), not a verified official figure — please confirm with the local authority before relying on it'
    : '由 AI（Gemini）基于通用知识估算，并非官方核实数据，使用前请务必向当地主管部门核实';

  const facts: ExternalFact[] = [
    {
      key: 'company_registration_cost',
      value: toLocal(parsed.registrationUsd ?? 0),
      unit: input.baseCurrency,
      sourceRef,
      confidence: 'low'
    },
    {
      key: 'visa_fee_cost',
      value: toLocal(parsed.visaUsd ?? 0),
      unit: input.baseCurrency,
      sourceRef,
      confidence: 'low'
    },
    {
      key: 'corporate_tax_rate',
      value: (isEn ? parsed.taxHintEn : parsed.taxHint) || '',
      sourceRef,
      confidence: 'low'
    }
  ];

  return { region: isEn ? parsed.countryLabelEn : parsed.countryLabel, facts, unknowns: [] };
}

export const scoutAgent: AgentDefinition<ScoutInput, ScoutOutput> = {
  name: 'scout',
  claimType: 'external_fact',
  futureRole: 'Scout 属地情报官',
  tools: [],
  timeoutMs: 12000,
  // 覆盖表命中时走本地确定性数据；未命中时 run() 会调用 Gemini，因此不再是纯 deterministic。
  deterministic: false,

  parseInput(raw) {
    const body: any = (raw && typeof raw === 'object' ? raw : {}) || {};
    const locationHint = [body.projectName, body.regionCountry, body.locationHint]
      .filter(Boolean)
      .join(' ')
      .trim();
    if (!locationHint) {
      throw new AgentInputError('Project name, region or location hint is required');
    }
    return {
      locationHint,
      baseCurrency: body.baseCurrency ?? 'USD',
      language: body.language ?? 'zh'
    };
  },

  async run(input) {
    const curated = activeSource.lookup(input);
    // 策展表已经覆盖到（20 国 + 关键词命中），直接用，不占用 Gemini 配额。
    if (curated.unknowns.length === 0) {
      return { success: true, ...curated };
    }
    // 策展表覆盖不到的国家：交给 Gemini 做一次通用知识估算，而不是直接判 unknown。
    const geminiResult = await queryGeminiForUncoveredCountry(input);
    return { success: true, ...geminiResult };
  },

  fallback(input) {
    // Gemini 未配置/配额耗尽/调用失败：退回策展表结果（覆盖到就给数据，覆盖不到就诚实报 unknown）。
    const { region, facts, unknowns } = activeSource.lookup(input);
    return { success: true, region, facts, unknowns };
  }
};
