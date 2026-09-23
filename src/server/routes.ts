// API 路由注册
//
// 【Phase 0 重构】路由现在只做三件事：解析请求 → 调用 runAgent → 返回产物。
// 「超时 / 降级 / 追踪 / 错误归一化」已全部收敛进 src/agents/runtime.ts，
// 不再像重构前那样在每个路由里各写一遍。
import express from 'express';
import { asyncHandler } from './http.js';
import { AGENTS, listAgents } from '../agents/index.js';
import { ROLE_AGENTS, inputForRole, authoritativeForRole } from '../agents/roles.js';
import { dossierFromForm, applyProposals, pendingConfirmations } from '../agents/dossier.js';
import { runCoach, type CoachIntent } from '../agents/coach.js';
import { review as guardianReview, toAuditEntries as guardianAuditEntries } from '../agents/guardian.js';
import { listTools } from '../agents/tools.js';
import { newRequestId, runAgent } from '../agents/runtime.js';
import type { AgentContext, AgentDefinition } from '../agents/types.js';
import {
  buildUserPrompt,
  parseConsultationInput,
  STREAM_SYSTEM_INSTRUCTION
} from '../agents/consultation.js';
import {
  classifyGeminiError,
  GEMINI_MODELS,
  getGeminiClient,
  isGeminiInQuotaCooldown
} from './gemini.js';
import { computeLocalFallback } from './localEngine/fallback.js';
import { matchRecommendedVideos } from './localEngine/videos.js';

/** 从请求构造 Agent 运行上下文（Phase 1 会在此加载 ProjectDossier） */
function makeContext(req: express.Request): AgentContext {
  const body: any = (req.body && typeof req.body === 'object' ? req.body : {}) || {};
  return {
    language: body.language ?? 'zh',
    requestId: newRequestId()
  };
}

/**
 * 把一个 Agent 挂成 JSON 路由。
 *
 * 错误语义：
 *   - AgentInputError（缺必填字段）→ 400 { error: "..." }，与重构前逐字一致
 *   - 其余异常 → 交给 jsonErrorMiddleware 统一转 500 JSON
 */
function jsonAgentRoute(agent: AgentDefinition<any, any>) {
  return asyncHandler(async (req, res) => {
    const { output } = await runAgent(agent, req.body, makeContext(req));
    return res.json(output);
  });
}

/**
 * 把 Guardian 的否决结果套用到深度诊断产物上：按 violation.path 精确定位到
 * 具体是哪条建议/哪个字段越界，只摘掉那一条，其余内容原样保留——
 * 而不是一votes否决整份诊断，也不是像 Guardian 自己说的那样去"改写"违规文字
 * （Guardian 本身只判定，不生成替换内容，真正的编辑动作在这里、由确定性代码完成，
 * 不会引入第二个可能幻觉的 Agent）。
 * summaryHeadline/plainExplanation 是必填的整体定性文案，删不得，命中时退回固定安全文案。
 */
function applyGuardianVerdict(
  output: Record<string, unknown>,
  violations: Array<{ rule: string; detail: string; path?: string }>
): Record<string, unknown> {
  if (violations.length === 0) return output;

  const blockedArrayIndex: Record<string, Set<number>> = {};
  let blockedSummaryHeadline = false;
  let blockedPlainExplanation = false;

  for (const v of violations) {
    const path = v.path || '';
    const arrayMatch = path.match(/^(actionableAdvices|potentialGrowthAreas)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, field, idx] = arrayMatch;
      (blockedArrayIndex[field] ||= new Set()).add(Number(idx));
    } else if (path === 'summaryHeadline') {
      blockedSummaryHeadline = true;
    } else if (path === 'plainExplanation') {
      blockedPlainExplanation = true;
    }
  }

  const sanitized: Record<string, unknown> = { ...output };
  for (const field of ['actionableAdvices', 'potentialGrowthAreas'] as const) {
    const blocked = blockedArrayIndex[field];
    const list = output[field];
    if (blocked && Array.isArray(list)) {
      sanitized[field] = list.filter((_, i) => !blocked.has(i));
    }
  }
  if (blockedSummaryHeadline) {
    sanitized.summaryHeadline = '内容审核已过滤本次诊断中的一句越界表述，其余结论仍照常呈现。';
  }
  if (blockedPlainExplanation) {
    sanitized.plainExplanation = '本次 AI 诊断的部分措辞未通过合规审核，已被移除；请以下方保留的建议与报告本身的数值为准。';
  }
  return sanitized;
}

export function registerApiRoutes(app: express.Express): void {
  // 1. Health & Config status API
  // 注意：Vercel 上 /api/health 由 api/health.ts 这个 file-based function 直接服务，
  // 不会走到这里。两处的响应体必须保持一致，修改时请同步 api/health.ts。
  app.get('/api/health', (req, res) => {
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
    const hasGemini = Boolean(geminiKey && geminiKey !== 'MY_GEMINI_API_KEY');
    // 前端 Vite 只读取 VITE_* 前缀变量，因此 health 需一并检查，避免"已配置但 badge 仍显示未配置"
    const supabaseUrl =
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY;
    const hasSupabase = Boolean(supabaseUrl && supabaseKey);
    res.json({
      status: 'ok',
      version: '1.4.1',
      hasGeminiKey: hasGemini,
      hasSupabaseConfig: hasSupabase,
      timestamp: new Date().toISOString()
    });
  });

  // 1.1 Agent / Tool 自检（Phase 0 新增，纯只读）
  // 用途：部署后一眼确认产物包含哪些角色、每个角色声明了哪些 Tool、
  //       确定性内核是否完整注册。Guardian（Phase 3）的审计也读这里。
  app.get('/api/agents', (req, res) => {
    res.json({
      status: 'ok',
      phase: 0,
      agents: listAgents(),
      tools: listTools()
    });
  });

  // 2. AI Rule Consultation & Edge Case Evaluator
  app.post(['/api/ai/chat', '/api/ai-consultation'], jsonAgentRoute(AGENTS.consultation));

  // 2.1 AI Rule Consultation — Streaming (SSE) variant
  //
  // 流式接口不能走 runAgent：Agent 的契约是「返回一个结构化产物」，而 SSE 需要持有 res
  // 边生成边推送。强行套进 Agent 契约只会得到一个坏抽象，因此这里保持路由级实现，
  // 但复用 consultation Agent 的输入解析、系统提示词与本地兜底引擎，不重复造一套。
  //
  // 非流式接口需要等 Gemini 生成完整 JSON 后才一次性返回，网络往返 + 生成耗时叠加导致体感很慢。
  // 这里改用 Server-Sent Events 边生成边推送文本片段，前端可以像打字机一样实时展示，首字节时间大幅缩短。
  // 分类元数据（category/suggestedAction/推荐视频）复用本地规则引擎的确定性分类逻辑而不依赖
  // Gemini 的 JSON 结构化输出——流式场景下半截 JSON 本来也没法增量解析。
  app.post(
    ['/api/ai/chat/stream', '/api/ai-consultation/stream'],
    asyncHandler(async (req, res) => {
      const input = parseConsultationInput(req.body);
      const { question, language, isEdgeKeyword } = input;

      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      // 关闭反向代理（如 nginx）的响应缓冲，保证文本片段逐块及时下发而不是攒够一批才发
      res.setHeader('X-Accel-Buffering', 'no');
      (res as any).flushHeaders?.();

      const sendEvent = (payload: Record<string, unknown>) => {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      };

      const ai = getGeminiClient();
      let geminiUnavailable = !ai;
      let geminiError: string | null = null;
      let geminiErrorKind: string | null = null;
      let streamedAny = false;

      if (ai && !isGeminiInQuotaCooldown()) {
        try {
          const streamResult = await ai.models.generateContentStream({
            model: GEMINI_MODELS[0],
            contents: buildUserPrompt(input),
            config: { systemInstruction: STREAM_SYSTEM_INSTRUCTION }
          });
          for await (const chunk of streamResult) {
            const text = chunk.text || '';
            if (text) {
              streamedAny = true;
              sendEvent({ type: 'chunk', text });
            }
          }
          if (streamedAny) {
            const local = computeLocalFallback(question, language, isEdgeKeyword);
            sendEvent({
              type: 'done',
              aiMode: 'gemini',
              category: local.category,
              suggestedAction: local.suggestedAction,
              bigDataBenchmark: local.bigDataBenchmark,
              isEdgeCase: local.isEdgeCase,
              conservativePaths: local.conservativePaths,
              recommendedVideos: matchRecommendedVideos(question, local.category),
              geminiUnavailable: false,
              geminiError: null,
              geminiErrorKind: null
            });
            return res.end();
          }
          throw new Error('Gemini stream returned no content');
        } catch (err: any) {
          console.warn(
            'Gemini streaming failed, falling back to local rule engine:',
            err?.message || err
          );
          geminiUnavailable = true;
          const classified = classifyGeminiError(err);
          geminiError = classified.message;
          geminiErrorKind = classified.kind;
          // 已经推送过部分内容后才失败（极少见）：不能再从头切换成本地兜底覆盖，
          // 否则用户会看到"半句 AI 回答 + 突然跳到本地规则库回答"的割裂体验，直接结束本次回答。
          if (streamedAny) {
            sendEvent({
              type: 'done',
              aiMode: 'gemini',
              category: 'AI 智能答疑',
              suggestedAction: '',
              bigDataBenchmark: '',
              isEdgeCase: isEdgeKeyword,
              conservativePaths: [],
              recommendedVideos: matchRecommendedVideos(question, ''),
              geminiUnavailable: true,
              geminiError,
              geminiErrorKind
            });
            return res.end();
          }
        }
      }

      // ============ 本地兜底：Gemini 不可用/失败，按小段切块模拟打字机效果 ============
      const local = computeLocalFallback(question, language, isEdgeKeyword);
      const chunks = local.reply.match(/[\s\S]{1,24}/g) || [local.reply];
      for (const c of chunks) {
        sendEvent({ type: 'chunk', text: c });
      }
      sendEvent({
        type: 'done',
        aiMode: 'rules',
        category: local.category,
        suggestedAction: local.suggestedAction,
        bigDataBenchmark: local.bigDataBenchmark,
        isEdgeCase: local.isEdgeCase,
        conservativePaths: local.conservativePaths,
        recommendedVideos: matchRecommendedVideos(question, local.category),
        geminiUnavailable,
        geminiError,
        geminiErrorKind
      });
      res.end();
    })
  );

  // ============================================================
  // 多 Agent 编排接口（Phase 1-2 新增，全部为新增路由）
  // 既有四个 AI 接口保持原样，前端零改动。
  // ============================================================

  // 4. Coach 编排：按 businessStage 分流，激活相应角色并汇总产物
  app.post(
    '/api/coach/:intent',
    asyncHandler(async (req, res) => {
      const intent = req.params.intent as CoachIntent;
      if (!['profile', 'assess', 'ask'].includes(intent)) {
        return res.status(400).json({ error: `Unknown coach intent: ${intent}` });
      }
      const body: any = (req.body && typeof req.body === 'object' ? req.body : {}) || {};
      if (!body.form) {
        return res.status(400).json({ error: 'Form data is required' });
      }

      const dossier = dossierFromForm(
        body.form,
        body.provenance || {},
        body.suggestions || {},
        body.externalFacts || {}
      );

      const envelope = await runCoach(dossier, intent, makeContext(req), {
        agents: ROLE_AGENTS,
        inputFor: inputForRole,
        authoritativeFor: (role, d) => authoritativeForRole(role, d)
      });

      // 专家产出的提案统一由编排层写入 Dossier 的待确认区 ——
      // 单一写入路径，Agent 自身保持纯函数。
      for (const role of envelope.ran) {
        const artifact = envelope.artifacts[role] as any;
        if (artifact && Array.isArray(artifact.proposals)) {
          applyProposals(dossier, artifact.proposals, `agent:${role}`);
        }
      }

      return res.json({
        ...envelope,
        // 待确认清单随产物一起返回，供前端渲染三态
        pendingConfirmations: pendingConfirmations(dossier),
        suggestions: dossier.suggestions
      });
    })
  );

  // 5. 单个角色直调（便于联调与回归测试，不参与编排）
  app.post(
    '/api/agents/:name',
    asyncHandler(async (req, res) => {
      const agent = ROLE_AGENTS[req.params.name];
      if (!agent) {
        return res.status(404).json({ error: `Unknown agent role: ${req.params.name}` });
      }
      const { output } = await runAgent(agent, req.body, makeContext(req));
      return res.json(output);
    })
  );

  // 2.5 AI Infer Industry & Generate Dynamic Cost/Opex Structure
  app.post('/api/ai/infer-business-structure', jsonAgentRoute(AGENTS.businessStructure));

  // 2.6 CPA 分类 Agent：把用户自由填写的流水条目（名称+金额+周期）分类到标准会计科目
  app.post('/api/ai/classify-ledger', jsonAgentRoute(AGENTS.ledgerClassifier));

  // 3. AI Deep Diagnosis for Assessment Report
  //
  // 这是报告页唯一真正下发给用户的、由大模型自由生成的文字（其余核心数值全部来自
  // 确定性引擎 scoringEngine.ts，不经过任何 Agent）。生成后必须先过 Guardian 合规官
  // 复核（越界投资/收益承诺、敏感地区模式下的 PII 泄露），再把审核后的版本交给用户——
  // Guardian 只判定不改写，真正的过滤/替换由 applyGuardianVerdict 完成，
  // 避免用一个可能幻觉的 Agent 去"修正"另一个 Agent 的幻觉。
  app.post(
    '/api/ai/deep-diagnosis',
    asyncHandler(async (req, res) => {
      const { output } = await runAgent(AGENTS.deepDiagnosis, req.body, makeContext(req));

      const body: any = (req.body && typeof req.body === 'object' ? req.body : {}) || {};
      const isSensitiveRegion = Boolean(body.report?.isSensitiveRegion);

      const verdict = guardianReview({
        agent: 'deepDiagnosis',
        claimType: AGENTS.deepDiagnosis.claimType,
        output,
        isSensitiveRegion
      });

      if (!verdict.pass) {
        for (const entry of guardianAuditEntries('deepDiagnosis', verdict)) {
          console.warn(`[guardian] ${entry.detail}`);
        }
      }

      const sanitized = applyGuardianVerdict(output as Record<string, unknown>, verdict.violations);
      return res.json({
        ...sanitized,
        guardianReviewed: true,
        guardianBlockedCount: verdict.violations.length
      });
    })
  );

  // 3.1 AI Broken-Stream Gap Detection & Completion
  // 对外 URL 保持 /api/ai/ocr-estimate 不变（前端零改动），内部已更名为 revenueGap ——
  // 该接口既不含 AI 也不做 OCR，原命名是误导性的。
  app.post('/api/ai/ocr-estimate', jsonAgentRoute(AGENTS.revenueGap));
}
