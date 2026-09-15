// Business Structure Agent —— 从项目/店铺名称推断行业、币种与成本骨架
//
// 【Phase 0】原 server.ts 第 992-1107 行（/api/ai/infer-business-structure）。
//            系统提示词与响应字段逐字保留。
//
// 【降级路径变更】不再用写死的行业模板冒充 AI 推断结果——不同项目会被套上完全相同的
// 固定数字，用户既分辨不出也没法信任。云端不可用时 fallback() 如实返回 unavailable，
// 交由前端提示用户手动填写。
// 【未来归属】Registrar 建档员（project_fact）。
//            Phase 2 将与 revenueGap、anomalyDetection 合并为同一个建档员 ——
//            三者产出同一类断言、走同一种校验方式（用户确认）、写同一批字段，拆开只会打架。
//
// 禁止事项（角色边界）：
//   ✕ 直接写入 confirmed 字段（产物只能是待确认草稿）
//   ✕ 评价这门生意好不好（那是 Interpreter 的职责）
import { AgentDefinition, AgentDegradedError, AgentInputError, DegradeReason } from './types.js';
import {
  classifyGeminiError,
  generateGeminiContent,
  getGeminiClient,
  isGeminiInQuotaCooldown
} from '../server/gemini.js';

export interface BusinessStructureInput {
  projectName: string;
  currentIndustry: string;
  baseCurrency: string;
}

export interface BusinessStructureOutput {
  success: boolean;
  /** true 表示本次云端 AI 不可用，且不再用写死模板冒充推断结果——前端应提示用户手动填写 */
  unavailable?: boolean;
  reason?: string | null;
  [key: string]: unknown;
}

export const BUSINESS_STRUCTURE_SYSTEM_INSTRUCTION = `
你是一个专为全球商业宣教(BAM)、爱心工场与小微实体项目打造的商业模型与财务架构分析专家。
用户提供了项目/店铺名称（如：“恩典社区义诊所”、“麦种烘焙咖啡馆”、“内罗毕手机维修培训工坊”、“清迈有机蔬菜种植社”、“金边儿童辅导中心”等）。

请根据项目名称和业务属性，完成以下工作：
1. 智能推断最贴切的行业类别 key 及展示名称。
   行业预设 key 可选：medical_health, food_beverage, education_training, vocational_training, retail_store, agriculture, child_care, community_service, handicraft, tech_service, other
2. 根据项目名称中的地名/国家线索推断最适用的建议主币种（如涉及肯尼亚/内罗毕推断 KES，泰国/清迈推断 THB，越南推断 VND，尼日利亚推断 NGN，中国推断 CNY 等）。
   重要：项目名称中若完全没有任何地名/国家/币种线索（如"阳光社区烘焙店"这类不含地名的泛化店名），
   切勿臆测或默认填成 USD——这会把美国的税率/注册/签证成本标准错误地套到一个与美国毫无关系的项目上。
   此时 suggestedCurrency 字段必须省略（不要输出该字段，也不要输出 null 字符串），
   前端会保留用户当前已选择的币种，不做任何覆盖。
3. 为该【特定行业与店铺类型】量身定制 2-4 个具体的【直接物料/采购成本填写项 (COGS)】（例如诊所是药品采购、敷料针剂；咖啡店是咖啡豆鲜奶、打包杯袋；语言中心是教材文具印制）。
4. 为该店铺量身定制 2-4 个具体的【每月补充运营开支填写项 (OPEX)】——仅限于场地租金、员工薪酬、水电燃气这三类【之外】的、该行业特有的额外固定开支
   （例如设备折旧维护、保险、许可证年费、清洁与消杀、废物合规处置、软件订阅等）。
   重要：绝对不要生成场地租金、员工薪酬/同工补贴、水电燃气/网络这三类开支——前端已有专门的固定字段单独填写这些金额，
   若在 opexItems 中重复给出会导致这些开支被计算两次。
5. 给出适合该币种和行业的合理默认参考数值。

返回合法的 JSON 格式：
{
  "inferredIndustryKey": "medical_health" | "food_beverage" | "education_training" | "vocational_training" | "retail_store" | "agriculture" | "child_care" | "community_service" | "handicraft" | "other",
  "industryDisplayName": "医疗健康 / 爱心义诊所",
  "customIndustryName": "社区平价门诊与慢病照护",
  "suggestedCurrency": "KES" | "THB" | "USD" | "CNY" | "VND" | "EUR" 等,
  "revenueTip": "门诊看诊费、配药进账与检查费等全部月流水",
  "estimatedMonthlyRevenue": 50000,
  "cogsItems": [
    {
      "id": "cogs_1",
      "name": "常用中西药品与药剂采购",
      "description": "口服药、抗生素、常规急救针剂等",
      "amount": 15000
    },
    {
      "id": "cogs_2",
      "name": "医用耗材与消毒器械",
      "description": "注射器、敷料纱布、酒精消毒手套等",
      "amount": 3000
    }
  ],
  "opexItems": [
    {
      "id": "opex_equipment",
      "name": "医疗设备折旧与维护",
      "description": "诊疗器械、冷藏设备的折旧与定期维保",
      "amount": 1200
    },
    {
      "id": "opex_compliance",
      "name": "医疗废物合规处置",
      "description": "医疗固废清运与消毒耗材",
      "amount": 800
    },
    {
      "id": "opex_insurance",
      "name": "执业保险与许可证年费",
      "description": "诊所责任险及卫生许可证年费摊销",
      "amount": 500
    }
  ],
  "benchmarkAdvice": "爱心门诊药品耗材直接成本约占总进账 30%-40%，建议常备 3.5 个月以上固定开支现金储备。"
}
`;

export const businessStructureAgent: AgentDefinition<
  BusinessStructureInput,
  BusinessStructureOutput
> = {
  name: 'businessStructure',
  claimType: 'project_fact',
  futureRole: 'Registrar 建档员',
  tools: [],
  timeoutMs: 27000,

  parseInput(raw) {
    const body: any = (raw && typeof raw === 'object' ? raw : {}) || {};
    const projectName = body.projectName ?? '';
    const currentIndustry = body.currentIndustry ?? '';
    if (!projectName && !currentIndustry) {
      throw new AgentInputError('Project name or industry is required');
    }
    return {
      projectName,
      currentIndustry,
      baseCurrency: body.baseCurrency ?? 'USD'
    };
  },

  async run(input) {
    const ai = getGeminiClient();
    if (!ai) {
      throw new AgentDegradedError('Gemini API key not configured', null);
    }
    // 429 配额冷却期内：不发起注定失败的云端请求，直接如实告知前端稍后重试，
    // 避免用户切换店铺名称触发第二次推断时立刻再次命中同一次 429。
    if (isGeminiInQuotaCooldown()) {
      throw new AgentDegradedError('Gemini 免费配额冷却中，请稍后再试', 'quota');
    }

    let replyText: string;
    try {
      replyText = await generateGeminiContent(
        `项目/店铺名称: "${input.projectName}"\n用户当前选择的行业: "${input.currentIndustry}"\n当前币种: "${input.baseCurrency}"`,
        BUSINESS_STRUCTURE_SYSTEM_INSTRUCTION
      );
    } catch (err: any) {
      console.warn('Gemini infer-business-structure failed:', err.message);
      const { message, kind } = classifyGeminiError(err);
      throw new AgentDegradedError(message, kind);
    }

    let parsed: any;
    try {
      parsed = JSON.parse(replyText || '{}');
    } catch (err: any) {
      console.warn('Gemini infer-business-structure returned malformed JSON:', err.message);
      throw new AgentDegradedError('Gemini returned malformed JSON', null);
    }

    // 未能给出行业 key 视为推断失败，走 fallback() 如实告知不可用
    if (!parsed.inferredIndustryKey) {
      throw new AgentDegradedError('Gemini returned no inferredIndustryKey', null);
    }

    return { success: true, ...parsed };
  },

  fallback(_input, _ctx, reason?: DegradeReason) {
    // 不再用写死的行业模板冒充「AI 推断结果」——不同项目会被套上完全相同的固定数字，
    // 用户既无法分辨也无法信任。云端不可用时如实告知，交由用户手动填写。
    return {
      success: false,
      unavailable: true,
      reason: reason?.exposeToClient ? reason.message : null
    };
  }
};
