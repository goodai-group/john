// Deep Diagnosis Agent —— 体检报告的大白话深度诊断
//
// 【Phase 0】原 server.ts 第 1109-1206 行（/api/ai/deep-diagnosis）。行为一字未改。
// 【未来归属】这是唯一一个会被**拆成两个角色**的现有接口：
//              · summaryHeadline / plainExplanation  → Interpreter 解读员（interpretation）
//                  强制要求：每条结论必须引用产生它的指标（metricRef）
//              · actionableAdvices / potentialGrowthAreas → Strategist 处方师（action）
//                  强制要求：每条建议必须先过 ScoringSimulator 回验，
//                            算出分数增益，不达标即丢弃
//
// 拆分理由（见《方案》第 05 章）：诊断与处方混在一起就无法分别追责 ——
// 一条错建议，你分不清是「看错了」还是「开错药」。
// Phase 0 先保持合一，仅把它装进统一契约，claimType 暂记为 interpretation。
import { AgentDefinition, AgentDegradedError, AgentInputError } from './types.js';
import { classifyGeminiError, generateGeminiContent, getGeminiClient } from '../server/gemini.js';

export interface DeepDiagnosisInput {
  report: any;
}

export interface DeepDiagnosisOutput {
  success: true;
  [key: string]: unknown;
}

const SYSTEM_INSTRUCTION = `
你是一位资深的全球小微商业运营与财务健康体检专家。
请根据用户商业自测项目的数据指标（包括毛利率、净利率、租金人工开销占比、现金跑道月数、偿债覆盖倍数、5维度得分与红线通过情况），提供极具落地指导意义的"大白话"深度诊断与行动建议。
严格要求：
1. 严禁使用任何生僻财务术语，只用普通做买卖老板听得懂的语言（例如说"每卖100块能剩下多少"、"手头备用金能顶几个月"、"每月工人和房租开销吃掉了多少利润"）。
2. 输出 4-6 条非常具体、可执行的操作建议（如：压降进货成本的谈判策略、如何设定安全备用金、债务重组或加速现金回流技巧）。
3. 输出格式为 JSON：
{
  "summaryHeadline": "一句话核心定性（例如：现金流底子扎实，但进货成本占比偏高）",
  "plainExplanation": "2-3句通俗业务体检概括",
  "actionableAdvices": [
    "具体建议 1",
    "具体建议 2",
    "具体建议 3",
    "具体建议 4"
  ],
  "potentialGrowthAreas": [
    "增长抓手 1",
    "增长抓手 2"
  ]
}
`;

export const deepDiagnosisAgent: AgentDefinition<DeepDiagnosisInput, DeepDiagnosisOutput> = {
  name: 'deepDiagnosis',
  claimType: 'interpretation',
  futureRole: 'Interpreter 解读员 + Strategist 处方师（Phase 3 拆分）',
  tools: [],
  timeoutMs: 27000,

  parseInput(raw) {
    const body: any = (raw && typeof raw === 'object' ? raw : {}) || {};
    if (!body.report) {
      throw new AgentInputError('Report object is required');
    }
    return { report: body.report };
  },

  async run(input) {
    const ai = getGeminiClient();
    if (!ai) {
      throw new AgentDegradedError('Gemini API key not configured', null);
    }

    const { report } = input;
    let replyText: string;
    try {
      replyText = await generateGeminiContent(
        `商业项目数据：${JSON.stringify({
          projectName: report.projectName,
          industry: report.industry,
          baseCurrency: report.baseCurrency,
          financials: report.normalizedFinancials,
          radarScores: report.radarScores,
          totalScore: report.totalScore,
          tier: report.tier,
          gatePassed: report.gatePassed,
          failedGates: report.failedGates
        })}`,
        SYSTEM_INSTRUCTION
      );
    } catch (err: any) {
      console.warn('Gemini deep diagnosis failed, fallback to local engine:', err.message);
      const { message, kind } = classifyGeminiError(err);
      throw new AgentDegradedError(message, kind);
    }

    let parsed: any;
    try {
      parsed = JSON.parse(replyText || '{}');
    } catch (err: any) {
      console.warn('Gemini deep diagnosis failed, fallback to local engine:', err.message);
      throw new AgentDegradedError('Gemini returned malformed JSON', null);
    }

    // 空诊断结果同样回退本地引擎，避免报告页出现空白的 AI 诊断区
    if (!parsed || (!parsed.summaryHeadline && !parsed.plainExplanation)) {
      const message = 'Gemini deep diagnosis returned empty result';
      console.warn('Gemini deep diagnosis failed, fallback to local engine:', message);
      throw new AgentDegradedError(message, null);
    }

    return { success: true, ...parsed };
  },

  fallback(input) {
    // Fallback deterministic diagnosis
    const { report } = input;
    const financials = report.normalizedFinancials;
    const advices = [];

    if (financials.grossMarginPercent < 35) {
      advices.push(
        `进货成本占比偏高（毛利率仅 ${financials.grossMarginPercent}%）：建议与供应商协商批量采购折扣，或适当优化菜品/商品定价组合，将毛利率提升至 40% 以上。`
      );
    } else {
      advices.push(
        `毛利空间表现健康（毛利率 ${financials.grossMarginPercent}%）：产品自带定价优势，可继续保持优质货源与供应链稳定。`
      );
    }

    if (financials.cashRunwayMonths < 3) {
      advices.push(
        `手头备用金紧张（仅可支撑 ${financials.cashRunwayMonths} 个月开销）：建议暂停非必要设备投入，优先将账面现金积累至 3-6 个月固定支出安全线。`
      );
    } else {
      advices.push(
        `现金缓冲垫充裕（可支撑 ${financials.cashRunwayMonths} 个月）：具备极强的抗突发风险与淡季生存能力。`
      );
    }

    if (financials.opexRatioPercent > 35) {
      advices.push(
        `每月房租与人工开销偏重（吃掉营业额的 ${financials.opexRatioPercent}%）：建议评估店铺坪效或灵活用工排班，控制固定成本。`
      );
    }

    return {
      success: true,
      summaryHeadline: report.gatePassed
        ? '整体经营稳健，具备可持续造血能力'
        : '存在部分成本或流动性承压风险',
      plainExplanation: `您的项目综合得分为 ${report.totalScore}分 (${report.tier})，每月净利润约为 ${financials.netProfit} ${report.baseCurrency}。`,
      actionableAdvices: advices,
      potentialGrowthAreas: ['提高老客户复购率以摊薄获客成本', '优化高毛利核心单品销售比例']
    };
  }
};
