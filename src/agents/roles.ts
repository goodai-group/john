// 角色表 —— Coach 编排层的查找依据
//
// 与 AGENTS（按 Agent 名索引）分开：AGENTS 是「有哪些 Agent 实现」，
// 这里是「哪个角色由谁承担」。Phase 3-4 的新角色接进这张表即被 Coach 自动调度，
// 无需回头改 coach.ts 的分流表。
import type { AgentDefinition } from './types.js';
import type { ProjectDossier } from './dossier.js';
import { confirmedFormOnly } from './dossier.js';
import { consultationAgent } from './consultation.js';
import { registrarAgent } from './registrar.js';
import { strategistAgent } from './strategist.js';
import { getTool } from './tools.js';

/** 角色名 -> 承担该角色的 Agent */
export const ROLE_AGENTS: Record<string, AgentDefinition<any, any>> = {
  consultation: consultationAgent,
  registrar: registrarAgent,
  strategist: strategistAgent
  // interpreter / tracker / guardian / scout 在后续 Phase 接入
};

/**
 * 从 Dossier 为某个角色构造输入。
 *
 * 【确认闸门在这里落地】所有需要财务数据的角色，拿到的都是 confirmedFormOnly() 的产物——
 * 未确认的建议值不会出现在任何下游角色的输入里，这就是阻断「误差沿链传导」的那道闸门。
 */
export function inputForRole(role: string, dossier: ProjectDossier): unknown {
  const confirmedForm = confirmedFormOnly(dossier);

  switch (role) {
    case 'registrar':
      return {
        projectName: dossier.form.projectName,
        currentIndustry: dossier.form.industry,
        baseCurrency: dossier.form.baseCurrency,
        form: confirmedForm,
        rawRecords: (dossier.form.monthlyBreakdowns || []).map((b) => ({
          month: b.month,
          amount: b.revenue?.amount
        }))
      };

    case 'strategist': {
      // 报告必须由确定性引擎在「只含 confirmed 数据」的表单上现算，
      // 不能接受调用方传进来的报告 —— 否则回验的基准可能是被污染的。
      const report = getTool('runBusinessAssessment')(confirmedForm);
      return {
        form: confirmedForm,
        report,
        language: 'zh',
        rejectedLeverIds: rejectedLeverIdsOf(dossier)
      };
    }

    case 'interpreter':
    case 'tracker': {
      const report = getTool('runBusinessAssessment')(confirmedForm);
      return { form: confirmedForm, report };
    }

    case 'scout':
      return {
        projectName: dossier.form.projectName,
        regionCountry: dossier.form.regionCountry,
        baseCurrency: dossier.form.baseCurrency
      };

    case 'consultation':
    default:
      return { question: '', context: { projectName: dossier.form.projectName } };
  }
}

/**
 * 从 Dossier 里读出用户否决过的杠杆 id。
 * 否决记录以 `rejected:<leverId>` 的形式存在 suggestions 之外的长期记忆里；
 * Phase 1 先从 externalFacts 读取，Phase 3 接 agent_facts 表后由调用方注入。
 */
function rejectedLeverIdsOf(dossier: ProjectDossier): string[] {
  const fact = dossier.externalFacts['rejected_levers'];
  if (!fact || typeof fact.value !== 'string') return [];
  return fact.value.split(',').map((s) => s.trim()).filter(Boolean);
}
