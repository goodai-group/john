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
//   3. **不接受模型自由生成**：Phase 4 的知识来源是团队自己已经维护的
//      REGULATORY_COST_TABLE（20 个国家，每条自带 sourceNote），
//      而不是让 LLM 凭记忆报数字。知识库接口留成可插拔，
//      将来接真实 RAG 时替换 KnowledgeSource 即可，Agent 本体不动。
//
// 禁止：
//   ✕ 碰任何本项目数据    ✕ 给建议    ✕ 猜
import type { AgentDefinition } from './types.js';
import { AgentInputError } from './types.js';
import type { ExternalFact } from './dossier.js';
import { detectCountryCurrency, inferRegulatoryCosts } from '../lib/inferBusinessStructure.js';

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

export const scoutAgent: AgentDefinition<ScoutInput, ScoutOutput> = {
  name: 'scout',
  claimType: 'external_fact',
  futureRole: 'Scout 属地情报官',
  tools: [],
  timeoutMs: 8000,
  // 当前知识源是本地策展数据，没有云端路径。
  // 接入 RAG 后这里改为 false，run() 走检索、fallback() 退回策展表。
  deterministic: true,

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
    const { region, facts, unknowns } = activeSource.lookup(input);
    return { success: true, region, facts, unknowns };
  },

  fallback(input) {
    const { region, facts, unknowns } = activeSource.lookup(input);
    return { success: true, region, facts, unknowns };
  }
};
