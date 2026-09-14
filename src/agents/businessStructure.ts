// Business Structure Agent —— 从项目/店铺名称推断行业、币种与成本骨架
//
// 【Phase 0】原 server.ts 第 992-1107 行（/api/ai/infer-business-structure）。
//            系统提示词与响应字段逐字保留，本地降级路径不变。
// 【未来归属】Registrar 建档员（project_fact）。
//            Phase 2 将与 revenueGap、anomalyDetection 合并为同一个建档员 ——
//            三者产出同一类断言、走同一种校验方式（用户确认）、写同一批字段，拆开只会打架。
//
// 禁止事项（角色边界）：
//   ✕ 直接写入 confirmed 字段（产物只能是待确认草稿）
//   ✕ 评价这门生意好不好（那是 Interpreter 的职责）
import { AgentDefinition, AgentDegradedError, AgentInputError } from './types.js';
import { classifyGeminiError, generateGeminiContent, getGeminiClient } from '../server/gemini.js';
import { getTool } from './tools.js';

export interface BusinessStructureInput {
  projectName: string;
  currentIndustry: string;
  baseCurrency: string;
}

export interface BusinessStructureOutput {
  success: true;
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
4. 为该店铺量身定制 3-5 个具体的【每月固定运营开支填写项 (OPEX)】（例如场地租金、员工薪酬与同工补贴、水电燃气与网络物业、设备折旧维护等）。
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
      "id": "opex_rent",
      "name": "诊所临街场地租金",
      "description": "月度固定支付给房东的铺面租金",
      "amount": 4500
    },
    {
      "id": "opex_labor",
      "name": "本地护士与药剂同工补贴",
      "description": "本地护士、助理与药房管理员薪资补贴",
      "amount": 6000
    },
    {
      "id": "opex_utility",
      "name": "冷藏药柜电费、水费与网络",
      "description": "药品冷藏冰箱、照明用电及宽带通讯",
      "amount": 1200
    },
    {
      "id": "opex_other",
      "name": "医疗废物合规处置与杂支",
      "description": "医疗固废清运与日常清洁耗损",
      "amount": 800
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
  tools: ['inferBusinessStructureLocally'],
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

    let replyText: string;
    try {
      replyText = await generateGeminiContent(
        `项目/店铺名称: "${input.projectName}"\n用户当前选择的行业: "${input.currentIndustry}"\n当前币种: "${input.baseCurrency}"`,
        BUSINESS_STRUCTURE_SYSTEM_INSTRUCTION
      );
    } catch (err: any) {
      console.warn(
        'Gemini infer-business-structure failed, fallback to smart rule engine:',
        err.message
      );
      const { message, kind } = classifyGeminiError(err);
      throw new AgentDegradedError(message, kind);
    }

    let parsed: any;
    try {
      parsed = JSON.parse(replyText || '{}');
    } catch (err: any) {
      console.warn(
        'Gemini infer-business-structure failed, fallback to smart rule engine:',
        err.message
      );
      throw new AgentDegradedError('Gemini returned malformed JSON', null);
    }

    // 未能给出行业 key 视为推断失败，交给本地规则引擎兜底（与重构前一致）
    if (!parsed.inferredIndustryKey) {
      throw new AgentDegradedError('Gemini returned no inferredIndustryKey', null);
    }

    return { success: true, ...parsed };
  },

  fallback(input) {
    // Deterministic fallback rule engine using shared helper
    const inferLocally = getTool('inferBusinessStructureLocally');
    const structure = inferLocally(input.projectName || input.currentIndustry, input.baseCurrency);

    return {
      success: true,
      inferredIndustryKey: structure.inferredIndustryKey,
      industryDisplayName: structure.industryDisplayName,
      customIndustryName: structure.customIndustryName,
      suggestedCurrency: structure.suggestedCurrency,
      revenueTip: structure.revenueTip,
      estimatedMonthlyRevenue: structure.estimatedMonthlyRevenue,
      cogsItems: structure.cogsItems,
      opexItems: structure.opexItems,
      benchmarkAdvice: structure.benchmarkAdvice
    };
  }
};
