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
import { interpreterAgent } from './interpreter.js';
import { trackerAgent } from './tracker.js';
import { getTool } from './tools.js';
import { simulateLevers } from './levers.js';

/** 角色名 -> 承担该角色的 Agent */
export const ROLE_AGENTS: Record<string, AgentDefinition<any, any>> = {
  consultation: consultationAgent,
  registrar: registrarAgent,
  strategist: strategistAgent,
  interpreter: interpreterAgent,
  tracker: trackerAgent
  // scout 在 Phase 4 接入；guardian 是旁路校验器而非 Agent，见 coach 的审查环节
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

    case 'interpreter': {
      const report = getTool('runBusinessAssessment')(confirmedForm);
      return { report, language: 'zh' };
    }

    case 'tracker': {
      const report = getTool('runBusinessAssessment')(confirmedForm);
      // previous 由调用方通过 dossier.externalFacts 注入（Phase 3 起前端传上一版）
      const prevRaw = dossier.externalFacts['previous_version'];
      let previous: unknown = null;
      if (prevRaw && typeof prevRaw.value === 'string') {
        try {
          previous = JSON.parse(prevRaw.value);
        } catch {
          previous = null;
        }
      }
      return { current: { form: confirmedForm, report }, previous, language: 'zh' };
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

/**
 * 为 Guardian 提供校验依据 —— 确定性引擎的权威数值。
 *
 * 这是「数值一致性」这条审查规则得以成立的基础：Guardian 拿引擎现算的结果，
 * 去比对 Agent 产物里的数字。模型偷改分数增益、或凭空多出一条没模拟过的建议，
 * 都会在这里被抓出来。
 */
export function authoritativeForRole(
  role: string,
  dossier: ProjectDossier
): { totalScore?: number; leverGains?: Record<string, number>; validAnchors?: string[] } | undefined {
  const confirmedForm = confirmedFormOnly(dossier);
  const report = getTool('runBusinessAssessment')(confirmedForm);

  if (role === 'strategist') {
    const leverGains: Record<string, number> = {};
    for (const s of simulateLevers(confirmedForm, report)) {
      leverGains[s.lever.id] = s.scoreGain;
    }
    return { totalScore: report.totalScore, leverGains };
  }

  if (role === 'interpreter') {
    const validAnchors = [
      ...(report.gates || []).map((g) => g.code),
      ...(report.metrics || []).map((m) => m.key)
    ];
    return { totalScore: report.totalScore, validAnchors };
  }

  return { totalScore: report.totalScore };
}
