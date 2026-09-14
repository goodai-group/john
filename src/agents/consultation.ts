// Consultation Agent —— AI 智能答疑
//
// 【Phase 0】原 server.ts 第 697-853 行（/api/ai/chat、/api/ai-consultation）。
//            行为一字未改：系统提示词、响应字段、降级语义全部逐字保留。
// 【未来归属】Coach 教练 —— 唯一对用户说话的角色。
//            Phase 1 接入 ProjectDossier 后，答疑将携带「当前项目上下文」。
//
// 禁止事项（角色边界，见《方案》第 05 章）：
//   ✕ 自己产生任何数字或判断  ✕ 让专家 Agent 直接对用户输出
import {
  AgentContext,
  AgentDefinition,
  AgentDegradedError,
  AgentInputError,
  DegradeReason
} from './types.js';
import {
  classifyGeminiError,
  generateGeminiContent,
  getGeminiClient,
  isGeminiInQuotaCooldown
} from '../server/gemini.js';
import { computeLocalFallback, isEdgeCaseQuestion } from '../server/localEngine/fallback.js';
import { matchRecommendedVideos } from '../server/localEngine/videos.js';

export interface ConsultationInput {
  question: string;
  context: unknown;
  language: string;
  isEdgeKeyword: boolean;
}

export interface ConsultationOutput {
  reply: string;
  aiResponse: string;
  answer: string;
  aiMode: 'gemini' | 'rules';
  confidence: string;
  isEdgeCase: boolean;
  category: string;
  suggestedAction: string;
  bigDataBenchmark: string;
  // 可能为 undefined：本地兜底引擎仅在边缘疑难场景才产出保守路径。
  // 保持 undefined（而非 []）是为了与重构前逐字一致 —— JSON 序列化时该字段会被整体省略。
  conservativePaths: any[] | undefined;
  geminiUnavailable: boolean;
  geminiError: string | null;
  geminiErrorKind: string | null;
  recommendedVideos: ReturnType<typeof matchRecommendedVideos>;
}

/** 非流式问答的系统提示词（要求返回结构化 JSON） */
const SYSTEM_INSTRUCTION = `
你是一个友善、博学、乐于助人的通用 AI 助手，服务于"商业财务测算"平台（BAM 平台，全球海外小微商业自测评分工具）。
你可以回答用户提出的【任何问题】——包括但不限于：财务与商业常识、小微生意经营、平台填报与评分规则、日常实用知识、生活技巧、技术问题、语言翻译、概念解释等。

【回答准则】
1. 用户问什么就答什么。不要强行把话题引导到商业自测上，除非用户主动询问本平台的填报/评分/规则。
2. 使用与用户提问相同的语言回答（中文问题用中文，英文问题用英文，其他语言同理）。
3. 回答通俗易懂、结构清晰、直接有用；必要时用大白话解释专业术语。
4. 当问题涉及本平台的"商业模型自测、评分规则、填报指引"时，切换为平台专家模式：
   - 用大白话解释概念（如：经营月均总流水 = 客人买单的总进账，还没扣任何成本；毛利 = 流水减进货本钱；OPEX = 每月雷打不动的房租与人工）；
   - 结合行业大数据基准给出参考（如餐饮毛利率约55%-70%、社区零售20%-35%、生活服务70%-88%、备用金建议≥3个月固定开销）；
   - 明确说明"此处的规则提问仅用于辅助理解，绝不计入评分系统；手写账本、截图与纯手动填写 100% 同权、零歧视"；
   - 遇到休渔期、战乱汇率、物物交换、无发票等边缘情况时，给出 2 种保守填报路径（路径A/路径B）并预估得分与后果。
5. "answer" 字段请使用规范、简洁的 Markdown 排版，让语法符号与装饰符号尽量少：
   - 推荐使用：## / ### 小标题、**加粗**、- 无序列表、1. 有序列表；
   - 不要堆砌装饰性符号与表情符号（例如 ⚠️ 📌 🔑 1️⃣ 【】 等花哨标记），除非表达重要风险提示，一条回答中 emoji 最多 1 个；
   - 避免用连续特殊符号（如 ===、>>>、•••）装饰版面，保持干净易读；
   - 需要换行处用空行分段，不要在每行末尾添加两个空格等隐藏符号。

返回合法的 JSON 数据，格式如下：
{
  "answer": "对用户问题的完整、直接、有用的回答",
  "confidence": "HIGH" | "LOW_EDGE_CASE",
  "isEdgeCase": boolean,
  "category": "简短的问题类型标签（如：通用问答 | 概念大白话解析 | 行业大数据基准 | 规则合规指引 | 边缘疑难推算）",
  "suggestedAction": "若涉及填报规则则给出可落地的填报动作，否则为空字符串",
  "bigDataBenchmark": "若涉及经营财务则给出一句行业大数据参考，否则为空字符串",
  "conservativePaths": []
}
`;

/**
 * 流式（SSE）变体的系统提示词：直接输出 Markdown 正文，不包 JSON。
 * 流式场景下半截 JSON 无法增量解析，因此分类元数据改由本地规则引擎确定性产出。
 */
export const STREAM_SYSTEM_INSTRUCTION = `
你是一个友善、博学、乐于助人的通用 AI 助手，服务于"商业财务测算"平台（BAM 平台，全球海外小微商业自测评分工具）。
你可以回答用户提出的【任何问题】——包括但不限于：财务与商业常识、小微生意经营、平台填报与评分规则、日常实用知识、生活技巧、技术问题、语言翻译、概念解释等。

【回答准则】
1. 用户问什么就答什么。不要强行把话题引导到商业自测上，除非用户主动询问本平台的填报/评分/规则。
2. 使用与用户提问相同的语言回答（中文问题用中文，英文问题用英文，其他语言同理）。
3. 回答通俗易懂、结构清晰、直接有用；必要时用大白话解释专业术语。
4. 当问题涉及本平台的"商业模型自测、评分规则、填报指引"时，切换为平台专家模式，结合行业大数据基准给出参考。
5. 直接输出规范、简洁的 Markdown 正文（## / ### 小标题、**加粗**、- 无序列表、1. 有序列表均可）。
   不要用 JSON 包裹，不要输出多余的解释性前后缀，不要堆砌装饰性符号与表情符号（一条回答中 emoji 最多 1 个）。
`;

/** 云端与流式路径共用的用户消息拼装 */
export function buildUserPrompt(input: ConsultationInput): string {
  return `用户提问: "${input.question}"\n用户界面语言: ${input.language}\n当前上下文: ${JSON.stringify(
    input.context || {}
  )}`;
}

/** 请求体归一化：兼容 question / message 两种字段名（前端两处调用点用法不同） */
export function parseConsultationInput(raw: unknown): ConsultationInput {
  const body: any = (raw && typeof raw === 'object' ? raw : {}) || {};
  const question = String(body.question ?? body.message ?? '').trim();
  if (!question) {
    throw new AgentInputError('Question or message is required');
  }
  return {
    question,
    context: body.context,
    language: body.language ?? 'zh',
    isEdgeKeyword: isEdgeCaseQuestion(question)
  };
}

export const consultationAgent: AgentDefinition<ConsultationInput, ConsultationOutput> = {
  name: 'consultation',
  claimType: 'conversation',
  futureRole: 'Coach 教练',
  tools: [],
  timeoutMs: 27000,

  parseInput: parseConsultationInput,

  async run(input) {
    const ai = getGeminiClient();
    if (!ai) {
      // exposeToClient=false：前端的 geminiError 字段在此情况下必须为 null（与重构前一致），
      // 但 trace 里仍记录真实原因，便于排查「线上为什么一直走本地兜底」。
      throw new AgentDegradedError('Gemini API key not configured', null, false);
    }
    // 429 配额冷却期内：不发起注定失败的云端请求，直接走本地规则库兜底
    if (isGeminiInQuotaCooldown()) {
      throw new AgentDegradedError('Gemini 免费配额冷却中，已切换本地规则库回答', 'quota');
    }

    let replyText: string;
    try {
      replyText = await generateGeminiContent(buildUserPrompt(input), SYSTEM_INSTRUCTION);
    } catch (err: any) {
      console.warn(
        'Gemini API request failed, falling back to smart big-data rule engine:',
        err?.message || err
      );
      const { message, kind } = classifyGeminiError(err);
      throw new AgentDegradedError(message, kind);
    }

    try {
      const parsed = JSON.parse(replyText);
      const answerText = parsed.answer || replyText;
      if (!answerText.trim()) {
        throw new Error('Gemini returned empty answer');
      }
      return {
        reply: answerText,
        aiResponse: answerText,
        answer: answerText,
        aiMode: 'gemini',
        confidence: parsed.confidence || (input.isEdgeKeyword ? 'LOW_EDGE_CASE' : 'HIGH'),
        isEdgeCase: parsed.isEdgeCase ?? input.isEdgeKeyword,
        category: parsed.category || 'AI 智能答疑',
        suggestedAction: parsed.suggestedAction || '',
        bigDataBenchmark: parsed.bigDataBenchmark || '',
        conservativePaths: parsed.conservativePaths || [],
        geminiUnavailable: false,
        geminiError: null,
        geminiErrorKind: null,
        recommendedVideos: matchRecommendedVideos(input.question, parsed.category || '')
      };
    } catch {
      // Gemini 返回的不是合法 JSON，回退到纯文本模式（仍属云端成功路径，不算降级）
      return {
        reply: replyText,
        aiResponse: replyText,
        answer: replyText,
        aiMode: 'gemini',
        confidence: input.isEdgeKeyword ? 'LOW_EDGE_CASE' : 'HIGH',
        isEdgeCase: input.isEdgeKeyword,
        category: 'AI 智能答疑',
        suggestedAction: '',
        bigDataBenchmark: '',
        conservativePaths: [],
        geminiUnavailable: false,
        geminiError: null,
        geminiErrorKind: null,
        recommendedVideos: matchRecommendedVideos(input.question, '')
      };
    }
  },

  fallback(input, _ctx: AgentContext, reason: DegradeReason): ConsultationOutput {
    const local = computeLocalFallback(input.question, input.language, input.isEdgeKeyword);
    return {
      reply: local.reply,
      aiResponse: local.reply,
      answer: local.reply,
      aiMode: 'rules',
      confidence: local.isEdgeCase ? 'LOW_EDGE_CASE' : 'HIGH',
      isEdgeCase: local.isEdgeCase,
      category: local.category,
      suggestedAction: local.suggestedAction,
      bigDataBenchmark: local.bigDataBenchmark,
      conservativePaths: local.conservativePaths,
      // 走到降级路径即意味着云端不可用（未配置 / 冷却中 / 调用失败）
      geminiUnavailable: true,
      geminiError: reason.exposeToClient ? reason.message : null,
      geminiErrorKind: reason.kind,
      recommendedVideos: matchRecommendedVideos(input.question, local.category)
    };
  }
};
