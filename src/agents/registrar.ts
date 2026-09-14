// Registrar 建档员 —— 只产「本项目事实」
//
// 【Phase 2】合并原先三处独立能力：
//   · businessStructure  从店名推断行业/币种/成本骨架
//   · revenueGap         月度流水断点插值
//   · anomalyDetection   单位填反/类目填反/数量级错误
//
// 合并理由（见《方案》第 03 章）：三者产出同一类断言（project_fact）、
// 走同一种校验方式（用户确认）、写同一批字段。拆开只会打架。
//
// 职责：把店名、口述、截图、手填，变成一份完整、单位正确、币种归一的档案草稿。
// 产物：DossierDraft + 待确认清单（逐字段带 confidence 与 note）
// 禁止：✕ 直接写入 confirmed 字段   ✕ 评价这门生意好不好（那是 Interpreter 的职责）
// 完成判据：每个字段要么 confirmed，要么明确挂在待确认清单上 —— 没有第三种状态。
import type { AgentDefinition } from './types.js';
import { AgentDegradedError, AgentInputError } from './types.js';
import type { Proposal } from './dossier.js';
import type { BusinessFormData, FormAnomalyWarning } from '../types.js';
import { classifyGeminiError, generateGeminiContent, getGeminiClient } from '../server/gemini.js';
import { getTool } from './tools.js';
import { estimateRevenueGaps } from './revenueGap.js';
import { BUSINESS_STRUCTURE_SYSTEM_INSTRUCTION } from './businessStructure.js';

export interface RegistrarInput {
  projectName: string;
  currentIndustry: string;
  baseCurrency: string;
  /** 已有表单数据（可选）：有则一并做异常检测 */
  form?: BusinessFormData;
  /** 月度流水原始记录（可选）：有则做断点补全 */
  rawRecords?: Array<{ month?: string; amount?: number }>;
}

export interface RegistrarOutput {
  success: true;
  /** 行业/币种/成本骨架推断结果；云端不可用时为 null（见 structureUnavailable） */
  structure: Record<string, unknown> | null;
  /** true 表示云端 AI 不可用，不再用写死模板冒充推断结果 */
  structureUnavailable?: boolean;
  /** 流水断点补全结果（无输入时为 null） */
  revenueGaps: ReturnType<typeof estimateRevenueGaps> | null;
  /** 填报异常提醒（仅提醒，不阻断提交 —— 与「AI 只做助手不做裁判」原则一致） */
  anomalies: FormAnomalyWarning[];
  /**
   * 待确认提案。**这是 Registrar 唯一的写入途径** ——
   * 提案只进 Dossier 的待确认区，不影响 form，也不影响评分。
   */
  proposals: Proposal[];
}

/** 把推断出的成本骨架转成提案（而不是直接写进表单） */
function structureToProposals(structure: Record<string, any>): Proposal[] {
  const proposals: Proposal[] = [];

  for (const item of (structure.cogsItems as any[]) || []) {
    if (!item?.id || typeof item.amount !== 'number') continue;
    proposals.push({
      path: `dynamicCogsItems.${item.id}`,
      value: item.amount,
      confidence: 'suggested',
      note: item.name ? `AI 推断的物料成本项：${item.name}` : undefined
    });
  }
  for (const item of (structure.opexItems as any[]) || []) {
    if (!item?.id || typeof item.amount !== 'number') continue;
    proposals.push({
      path: `dynamicOpexItems.${item.id}`,
      value: item.amount,
      confidence: 'suggested',
      note: item.name ? `AI 推断的运营开支项：${item.name}` : undefined
    });
  }
  if (typeof structure.estimatedMonthlyRevenue === 'number') {
    proposals.push({
      path: 'monthlyRevenue',
      value: structure.estimatedMonthlyRevenue,
      confidence: 'suggested',
      note: '按行业与属地推断的月流水参考值，请以实际经营数据为准'
    });
  }
  return proposals;
}

/** 流水补全结果转提案（标记为 estimated：系统按规则推算，等待用户核对） */
function gapsToProposals(gaps: ReturnType<typeof estimateRevenueGaps>): Proposal[] {
  return gaps.data
    .filter((d) => d.isEstimated)
    .map((d) => ({
      path: `monthlyBreakdowns.${d.month}`,
      value: d.revenue.amount,
      confidence: 'estimated' as const,
      note: d.note
    }));
}

async function inferStructure(input: RegistrarInput): Promise<Record<string, unknown>> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new AgentDegradedError('Gemini API key not configured', null, false);
  }

  let replyText: string;
  try {
    replyText = await generateGeminiContent(
      `项目/店铺名称: "${input.projectName}"\n用户当前选择的行业: "${input.currentIndustry}"\n当前币种: "${input.baseCurrency}"`,
      BUSINESS_STRUCTURE_SYSTEM_INSTRUCTION
    );
  } catch (err: any) {
    console.warn('Registrar: Gemini structure inference failed, falling back:', err.message);
    const { message, kind } = classifyGeminiError(err);
    throw new AgentDegradedError(message, kind);
  }

  let parsed: any;
  try {
    parsed = JSON.parse(replyText || '{}');
  } catch {
    throw new AgentDegradedError('Gemini returned malformed JSON', null);
  }
  if (!parsed.inferredIndustryKey) {
    throw new AgentDegradedError('Gemini returned no inferredIndustryKey', null);
  }
  return parsed;
}

/** 流水补全与异常检测都是确定性的，云端与降级路径共用 */
function deterministicParts(input: RegistrarInput): {
  revenueGaps: RegistrarOutput['revenueGaps'];
  anomalies: FormAnomalyWarning[];
} {
  const revenueGaps =
    input.rawRecords && input.rawRecords.length > 0
      ? estimateRevenueGaps({ rawRecords: input.rawRecords, currency: input.baseCurrency })
      : null;

  const anomalies = input.form ? getTool('detectFormAnomalies')(input.form) : [];

  return { revenueGaps, anomalies };
}

function assemble(
  structure: Record<string, unknown> | null,
  input: RegistrarInput,
  structureUnavailable = false
): RegistrarOutput {
  const { revenueGaps, anomalies } = deterministicParts(input);
  const proposals = [
    ...(structure ? structureToProposals(structure) : []),
    ...(revenueGaps ? gapsToProposals(revenueGaps) : [])
  ];
  return { success: true, structure, structureUnavailable, revenueGaps, anomalies, proposals };
}

export const registrarAgent: AgentDefinition<RegistrarInput, RegistrarOutput> = {
  name: 'registrar',
  claimType: 'project_fact',
  futureRole: 'Registrar 建档员',
  tools: ['detectFormAnomalies'],
  timeoutMs: 27000,

  parseInput(raw) {
    const body: any = (raw && typeof raw === 'object' ? raw : {}) || {};
    const projectName = body.projectName ?? '';
    const currentIndustry = body.currentIndustry ?? '';
    if (!projectName && !currentIndustry && !body.form) {
      throw new AgentInputError('Project name, industry or form data is required');
    }
    return {
      projectName,
      currentIndustry,
      baseCurrency: body.baseCurrency ?? 'USD',
      form: body.form,
      rawRecords: Array.isArray(body.rawRecords) ? body.rawRecords : undefined
    };
  },

  async run(input) {
    const structure = await inferStructure(input);
    return assemble(structure, input);
  },

  fallback(input) {
    // 不再用写死的行业模板冒充「AI 推断结果」——只保留确定性的流水补全与异常检测，
    // 行业/成本骨架在云端不可用时如实返回 null，交由用户手动填写。
    return assemble(null, input, true);
  }
};
