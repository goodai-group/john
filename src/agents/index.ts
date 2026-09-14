// Agent 注册表
//
// Phase 0 收录现有 4 个 AI 接口。后续角色按《方案》第 10 章的顺序加入：
//   Phase 1  Coach（编排层，接管全部对用户输出）
//   Phase 2  Registrar（businessStructure + revenueGap + anomalyDetection 合并）
//            Strategist（带 ScoringSimulator 模拟验算）
//   Phase 3  Interpreter（从 deepDiagnosis 拆出）、Tracker、Guardian
//   Phase 4  Scout（属地情报，全系统唯一需要 RAG 的角色）
import type { AgentDefinition } from './types.js';
import { consultationAgent } from './consultation.js';
import { businessStructureAgent } from './businessStructure.js';
import { deepDiagnosisAgent } from './deepDiagnosis.js';
import { revenueGapAgent } from './revenueGap.js';

export const AGENTS = {
  consultation: consultationAgent,
  businessStructure: businessStructureAgent,
  deepDiagnosis: deepDiagnosisAgent,
  revenueGap: revenueGapAgent
} as const;

export type AgentName = keyof typeof AGENTS;

/** 列出已注册 Agent 的元信息（/api/health 自检用，便于确认部署产物包含哪些角色） */
export function listAgents(): Array<{
  name: string;
  claimType: string;
  futureRole: string;
  tools: string[];
}> {
  return Object.values(AGENTS).map((a: AgentDefinition<any, any>) => ({
    name: a.name,
    claimType: a.claimType,
    futureRole: a.futureRole,
    tools: [...a.tools]
  }));
}

export * from './types.js';
export { runAgent, newRequestId } from './runtime.js';
export { setTraceSink } from './trace.js';
export { listTools, getTool, TOOL_REGISTRY, TOOL_DATASETS } from './tools.js';
