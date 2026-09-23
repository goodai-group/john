// Ledger Classifier —— CPA 分类 Agent
//
// 职责：用户只填一笔流水的名称/金额/周期，这个 Agent 判断它该落进哪个标准会计科目
// （LedgerCategory，见 types.ts），用户对分类过程基本无感知。
//
// 【设计红线】只做判断，绝不做金额换算/周期折算/汇率折算——那些是纯算术，
// 交给 src/lib/ledgerCycle.ts + src/lib/ledgerMapping.ts 里的确定性代码完成，
// 与全系统「评分零 AI 参与」的原则一致（见 agents/tools.ts 头部注释）。
// 【未来归属】Registrar 建档员（project_fact）——职责描述"把店名、口述、截图、
// 手填，变成一份完整、单位正确、币种归一的档案草稿"天然覆盖流水分类这件事，
// 先独立实现验证准确率，稳定后按 registrar.ts 的合并方式并入。
//
// 禁止事项（角色边界，与 registrar.ts 一致）：
//   ✕ 直接写入 confirmed 字段（产物只是分类建议，写入动作由调用方决定）
//   ✕ 评价这门生意好不好（那是 Interpreter 的职责）
import { AgentDefinition, AgentDegradedError, AgentInputError, DegradeReason } from './types.js';
import {
  classifyGeminiError,
  generateGeminiContent,
  getGeminiClient,
  isGeminiInQuotaCooldown
} from '../server/gemini.js';
import type { BillingCycle, LedgerCategory, LedgerClassification, LedgerItem } from '../types.js';

const LEDGER_CATEGORIES: LedgerCategory[] = [
  'COGS',
  'OPEX_FIXED_RENT',
  'OPEX_FIXED_LABOR',
  'OPEX_FIXED_UTILITY',
  'OPEX_VARIABLE',
  'TAX',
  'DEBT_SERVICE',
  'CAPEX_DEPRECIATION',
  'ONE_TIME_STARTUP',
  'REAL_REVENUE',
  'EXTERNAL_GRANT'
];

export interface LedgerClassifierInput {
  items: LedgerItem[];
  projectName: string;
  industryHint: string;
  baseCurrency: string;
}

export interface LedgerClassifierOutput {
  success: boolean;
  classifications: LedgerClassification[];
  /** true 表示本次云端 AI 不可用，classifications 由本地规则兜底产出 */
  unavailable?: boolean;
  reason?: string | null;
}

export const LEDGER_CLASSIFIER_SYSTEM_INSTRUCTION = `
你是一名注册会计师（CPA），任务是把用户自由填写的一笔笔"流水条目"（名称+金额+周期+收入或支出）
分类到标准会计科目，用户全程不需要自己选科目。

标准科目枚举（只能用这11个，不得自创新科目）：
- COGS：直接与产出商品/服务挂钩的原材料、进货、直接采购成本
- OPEX_FIXED_RENT：场地租金/铺租/物业费
- OPEX_FIXED_LABOR：员工工资/人工/同工薪酬/社保
- OPEX_FIXED_UTILITY：水电/网络/燃气等公用事业费
- OPEX_VARIABLE：其他不属于以上三类固定开销、但仍是经常性日常经营费用的支出（如营销推广、办公用品、差旅）
- TAX：增值税/所得税/附加税/工商年检等规费
- DEBT_SERVICE：贷款月供/还本付息（注意：这是现金流指标，不是损益表费用，不要和 OPEX 混）
- CAPEX_DEPRECIATION：设备、装修等资本性支出——如果周期是"一次性"，需要判断是否应该摊销分摊到未来多个月（给出 suggestedAmortizationMonths，通常 12-36 个月）；如果周期本身已经是"每月"（说明用户填的是已经算好的月度折旧额），直接归这一类即可，不需要 suggestedAmortizationMonths
- ONE_TIME_STARTUP：真正只发生一次、不会重复、也不适合摊销的启动性支出（如开业庆典、一次性咨询费）——不确定该不该摊销时，宁可归为这一类而不是 CAPEX_DEPRECIATION
- REAL_REVENUE：真实经营收入，即靠自身商品/服务向客户收取的钱
- EXTERNAL_GRANT：外部捐赠、机构资助、政府补贴、亲友借款等非经营性收入——这个判断很关键，会直接影响"这门生意是否靠自己造血"的评估，拿不准时要标记 needsUserConfirmation

对每一条给出：
- id：原样返回输入的 id，不得遗漏、不得新增
- category：上述11个之一
- confidence：0到1之间的置信度
- reasoning：一句话说明为什么这样分类（给用户看，不超过30字）
- needsUserConfirmation：true/false —— 以下情况必须为 true：置信度低于0.75；REAL_REVENUE 与
  EXTERNAL_GRANT 之间的判断；ONE_TIME_STARTUP 与 CAPEX_DEPRECIATION 之间的判断
- suggestedAmortizationMonths：仅当 category 为 CAPEX_DEPRECIATION 且原始周期为一次性时给出，否则省略该字段

返回合法 JSON 数组，不要有多余文字：
[
  { "id": "item_1", "category": "COGS", "confidence": 0.9, "reasoning": "咖啡豆属于直接原材料", "needsUserConfirmation": false },
  { "id": "item_2", "category": "EXTERNAL_GRANT", "confidence": 0.6, "reasoning": "名称含'教会资助'字样", "needsUserConfirmation": true }
]
`;

function buildPrompt(input: LedgerClassifierInput): string {
  const lines = input.items.map(
    (it) =>
      `- id="${it.id}" 名称="${it.name}" 金额=${it.amount} ${it.currency} 周期=${it.cycle} 类型=${
        it.type === 'income' ? '收入' : '支出'
      }`
  );
  return `项目/店铺名称: "${input.projectName}"\n参考行业: "${input.industryHint}"\n主币种: "${input.baseCurrency}"\n待分类流水条目：\n${lines.join('\n')}`;
}

function validateCategory(value: unknown): value is LedgerCategory {
  return typeof value === 'string' && (LEDGER_CATEGORIES as string[]).includes(value);
}

/** 把 Gemini 返回的原始 JSON 校验成严格的 LedgerClassification[]，任何一条不合规即整体判定失败走降级 */
function parseGeminiClassifications(raw: unknown, expectedIds: Set<string>): LedgerClassification[] {
  if (!Array.isArray(raw)) throw new AgentDegradedError('Gemini returned non-array classification', null);

  const seen = new Set<string>();
  const results: LedgerClassification[] = raw.map((entry: any) => {
    const id = String(entry?.id ?? '');
    if (!id || !expectedIds.has(id)) {
      throw new AgentDegradedError('Gemini classification id mismatch', null);
    }
    if (!validateCategory(entry?.category)) {
      throw new AgentDegradedError('Gemini returned invalid category', null);
    }
    seen.add(id);
    return {
      id,
      category: entry.category,
      confidence: typeof entry.confidence === 'number' ? Math.max(0, Math.min(1, entry.confidence)) : 0.5,
      reasoning: typeof entry.reasoning === 'string' ? entry.reasoning.slice(0, 120) : '',
      needsUserConfirmation: Boolean(entry.needsUserConfirmation),
      suggestedAmortizationMonths:
        typeof entry.suggestedAmortizationMonths === 'number' && entry.suggestedAmortizationMonths > 0
          ? Math.round(entry.suggestedAmortizationMonths)
          : undefined
    };
  });

  if (seen.size !== expectedIds.size) {
    throw new AgentDegradedError('Gemini classification missing some ids', null);
  }
  return results;
}

// ============================================================
// 本地规则兜底：按条目名称关键词匹配，云端不可用时仍能给出可用的分类，
// 只是置信度整体偏保守（更容易被标记为需要用户确认）。
// ============================================================

const KEYWORD_RULES: Array<{ pattern: RegExp; category: LedgerCategory }> = [
  { pattern: /房租|租金|铺租|场地费|物业费/, category: 'OPEX_FIXED_RENT' },
  { pattern: /工资|人工|薪资|同工|工时费|社保|雇员/, category: 'OPEX_FIXED_LABOR' },
  { pattern: /水电|电费|水费|网费|宽带|燃气|网络费/, category: 'OPEX_FIXED_UTILITY' },
  { pattern: /进货|原材料|原料|采购|物料|食材|耗材|批发/, category: 'COGS' },
  { pattern: /增值税|所得税|附加税|工商年检|税金|规费/, category: 'TAX' },
  { pattern: /贷款|月供|还款|利息|本金偿还|借款偿还/, category: 'DEBT_SERVICE' },
  { pattern: /设备|装修|机器|车辆|购置/, category: 'CAPEX_DEPRECIATION' }
];

const GRANT_KEYWORDS = /捐赠|资助|补贴|赞助|救济|机构支持|donation|grant/i;

function classifyLocally(items: LedgerItem[]): LedgerClassification[] {
  return items.map((item) => {
    if (item.type === 'income') {
      const isGrant = GRANT_KEYWORDS.test(item.name);
      return {
        id: item.id,
        category: (isGrant ? 'EXTERNAL_GRANT' : 'REAL_REVENUE') as LedgerCategory,
        confidence: isGrant ? 0.6 : 0.55,
        reasoning: isGrant ? '名称含资助/捐赠类关键词' : '未识别到资助类关键词，按真实经营收入处理',
        needsUserConfirmation: true // 真实收入 vs 外部捐赠直接影响 Gate-1，本地规则粗糙，一律要求用户确认
      };
    }

    for (const rule of KEYWORD_RULES) {
      if (rule.pattern.test(item.name)) {
        const isCapexOneTime = rule.category === 'CAPEX_DEPRECIATION' && item.cycle === 'one_time';
        return {
          id: item.id,
          category: rule.category,
          confidence: 0.7,
          reasoning: `名称关键词匹配「${rule.pattern.source.split('|')[0]}」类支出`,
          needsUserConfirmation: isCapexOneTime, // 一次性设备/装修是否该摊销，交给用户确认
          suggestedAmortizationMonths: isCapexOneTime ? 24 : undefined
        };
      }
    }

    // 未命中任何关键词：一次性支出默认落「一次性启动支出」（更保守，不悄悄污染月度指标），
    // 其余落「其他日常经营费用」，两者均要求用户确认。
    const fallbackCategory: LedgerCategory = item.cycle === 'one_time' ? 'ONE_TIME_STARTUP' : 'OPEX_VARIABLE';
    return {
      id: item.id,
      category: fallbackCategory,
      confidence: 0.4,
      reasoning: '未匹配到明确关键词，按保守规则归类',
      needsUserConfirmation: true
    };
  });
}

export const ledgerClassifierAgent: AgentDefinition<LedgerClassifierInput, LedgerClassifierOutput> = {
  name: 'ledgerClassifier',
  claimType: 'project_fact',
  futureRole: 'Registrar 建档员（流水分类子能力）',
  tools: [],
  timeoutMs: 27000,

  parseInput(raw) {
    const body: any = (raw && typeof raw === 'object' ? raw : {}) || {};
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      throw new AgentInputError('items is required and must be a non-empty array');
    }
    const normalizedItems: LedgerItem[] = items.map((it: any, idx: number) => ({
      id: String(it?.id ?? `item_${idx}`),
      type: it?.type === 'income' ? 'income' : 'expense',
      name: String(it?.name ?? '').slice(0, 100),
      amount: Number(it?.amount) || 0,
      currency: String(it?.currency ?? body.baseCurrency ?? 'USD'),
      cycle: (['monthly', 'quarterly', 'annual', 'one_time'] as BillingCycle[]).includes(it?.cycle)
        ? it.cycle
        : 'monthly',
      amortizationMonths:
        typeof it?.amortizationMonths === 'number' && it.amortizationMonths > 0
          ? it.amortizationMonths
          : undefined
    }));
    return {
      items: normalizedItems,
      projectName: String(body.projectName ?? ''),
      industryHint: String(body.industryHint ?? ''),
      baseCurrency: String(body.baseCurrency ?? 'USD')
    };
  },

  async run(input) {
    const ai = getGeminiClient();
    if (!ai) {
      throw new AgentDegradedError('Gemini API key not configured', null);
    }
    if (isGeminiInQuotaCooldown()) {
      throw new AgentDegradedError('Gemini 免费配额冷却中，请稍后再试', 'quota');
    }

    let replyText: string;
    try {
      replyText = await generateGeminiContent(buildPrompt(input), LEDGER_CLASSIFIER_SYSTEM_INSTRUCTION);
    } catch (err: any) {
      console.warn('ledgerClassifier: Gemini call failed, falling back:', err.message);
      const { message, kind } = classifyGeminiError(err);
      throw new AgentDegradedError(message, kind);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(replyText || '[]');
    } catch (err: any) {
      console.warn('ledgerClassifier: Gemini returned malformed JSON:', err.message);
      throw new AgentDegradedError('Gemini returned malformed JSON', null);
    }

    const expectedIds = new Set(input.items.map((it) => it.id));
    const classifications = parseGeminiClassifications(parsed, expectedIds);
    return { success: true, classifications };
  },

  fallback(input, _ctx, reason?: DegradeReason) {
    return {
      success: true,
      classifications: classifyLocally(input.items),
      unavailable: true,
      reason: reason?.exposeToClient ? reason.message : null
    };
  }
};
