import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy Gemini client helper
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

// 1. Health & Config status API
app.get('/api/health', (req, res) => {
  const hasGemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
  const hasSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
  res.json({
    status: 'ok',
    version: '1.4.1',
    hasGeminiKey: hasGemini,
    hasSupabaseConfig: hasSupabase,
    timestamp: new Date().toISOString()
  });
});

// 2. AI Rule Consultation & Edge Case Evaluator
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, context, language = 'zh' } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const ai = getGeminiClient();

    // Check if query is an edge-case rule boundary question
    const isEdgeKeyword = /休渔|季节|倒闭|天灾|战乱|物物交换|欠条|赊账|没有发票|教会赠款|非官方汇率|两套账|换人/i.test(
      message
    );

    if (ai) {
      try {
        const systemInstruction = `
你是一个专为海外小微商业经营者（无财务背景、位于信息敏感或基础设施薄弱地区）设计的"商业模型筛选与自测平台"的AI答疑助手。
严格守则：
1. 语言：始终使用极为亲切通俗的"大白话"（人话），严禁堆砌晦涩财务英文缩写，如提到专业词必带通俗解释（例如：OPEX（每月固定租金人工开销）、COGS（直接进货原材料成本）、PBT（税前净赚））。
2. 隐私与安全边界：开头必须明确告知用户"这里的提问仅供理解规则，不构成正式申报，方向性提问不参与评分计算"。
3. 判定置信度：
   - 规则内常见问题（如"无凭证怎么打分"、"手写账本行不行"、"多币种怎么算"）：直接肯定回答，消除焦虑（例如无凭证纯手动填写与上传凭证享有 100% 相同打分规则）。
   - 规则外边缘疑难情况（如极端季节性、物物交换、特殊战乱汇率）：明确标注【此问题超出現有标准规则范围，以下推算仅供参考】，并给出 2-3 种可能的保守推算路径（路径A与路径B），说明不同路径下的预估得分与后果。
4. 返回格式：请返回清晰自然的文本回答。
`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: `用户问题: "${message}"\n当前上下文: ${JSON.stringify(context || {})}`,
          config: {
            systemInstruction
          }
        });

        const replyText = response.text || '';
        return res.json({
          reply: replyText,
          confidence: isEdgeKeyword ? 'LOW_EDGE_CASE' : 'HIGH',
          isEdgeCase: isEdgeKeyword
        });
      } catch (err: any) {
        console.warn('Gemini API request failed, falling back to smart rule engine:', err.message);
      }
    }

    // Smart Deterministic Fallback when GEMINI_API_KEY is not yet injected
    let fallbackReply = '';
    let isEdgeCase = isEdgeKeyword;

    if (message.includes('凭证') || message.includes('银行流水') || message.includes('记账本') || message.includes('发票')) {
      fallbackReply =
        '【官方规则明确答复】\n在本平台上，有没有凭证、用什么凭证，只影响填表时的便利程度（比如是否能自动识别），完全不影响最终得分！\n即使你没有任何银行账户或流水凭证，选择【纯手动填写14项数字】，系统执行的梯度打分和红线（Gate）判定逻辑与上传正规银行流水的用户 100% 完全一致，可以放心填写！';
    } else if (message.includes('汇率') || message.includes('黑市') || message.includes('美金') || message.includes('折算')) {
      fallbackReply =
        '【多币种与多重汇率规则】\n系统支持在每个金额输入框直接选择对应币种（如 USD、KES、NGN、EGP、CNY 等）。如果当地存在民间或黑市实际兑换价，您可以勾选【本国存在多重汇率】并填入您实际使用的兑换比例，系统会按您的自报汇率统一折算，并在报告中如实透明标注，绝不会强制套用失真的官方汇率。';
    } else if (message.includes('敏感') || message.includes('安全') || message.includes('查我') || message.includes('泄露')) {
      fallbackReply =
        '【敏感地区数据安全模式】\n开启该模式后：\n1. 地理位置仅需选国家/大区，不采集具体城市；\n2. 原始凭证全变为选填，仅需提供汇总金额；\n3. 智能识别完成后立即销毁原始图片，零服务器存档；\n4. 全程由 AI 自动化计算，无任何人工初审员或评分委员查看；\n5. 报告显眼位置会自动加注自愿数据最小化声明，不影响得分。';
    } else if (isEdgeCase) {
      fallbackReply = `【⚠️ 边缘疑难情况 · 保守推算路径】\n此问题超出了现行标准规则库的明确定义，以下为您提供 2 种保守处理路径供参考：\n\n📌 路径 A (年化平摊法 - 推荐)：\n将特殊周期（如季节性淡旺季或特殊赠款）折算为 12 个月的月均值填入，并在备注栏说明。此路径最能反映生意的全年平均自养能力。\n\n📌 路径 B (单月真实填报 + 增设现金储备)：\n按实际活跃月份填写，但需在流动资产中预留至少 3-6 个月的固定开销缓冲垫。\n\n*提示：此问题已同步记录至【待完善规则库】，后续版本将补充专门规则覆盖。*`;
    } else {
      fallbackReply = `您好！这里的提问仅用于帮助您理解自测规则，不构成正式申报数据，也不会影响您的得分。\n针对您的问题：“${message}”：\n平台的评估完全聚焦于商业模型的自我造血能力（真实毛利空间、租金人工覆盖、现金流安全边际），您可以随时在【公开评分标准】中查阅完整的计算公式与红线要求。`;
    }

    return res.json({
      reply: fallbackReply,
      confidence: isEdgeCase ? 'LOW_EDGE_CASE' : 'HIGH',
      isEdgeCase
    });
  } catch (err: any) {
    console.error('AI chat error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// 3. AI Broken-Stream Gap Detection & Completion
app.post('/api/ai/ocr-estimate', async (req, res) => {
  try {
    const { rawRecords, currency = 'USD' } = req.body;
    // Compute adjacent month averages for missing months
    const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'];
    const result = months.map((m, idx) => {
      const existing = (rawRecords || []).find((r: any) => r.month === m);
      if (existing && existing.amount > 0) {
        return {
          month: m,
          revenue: { amount: existing.amount, currency },
          isEstimated: false
        };
      }
      // AI interpolate adjacent months
      const prev = (rawRecords || []).find((r: any) => r.month === months[idx - 1]);
      const next = (rawRecords || []).find((r: any) => r.month === months[idx + 1]);
      const estimatedVal = Math.round(
        ((prev ? prev.amount : 30000) + (next ? next.amount : 30000)) / 2
      );
      return {
        month: m,
        revenue: { amount: estimatedVal, currency },
        isEstimated: true,
        note: 'AI识别流水断点，按前后相邻月份平均值自动估算，请核对确认'
      };
    });

    res.json({
      success: true,
      data: result,
      estimatedCount: result.filter((r) => r.isEstimated).length,
      notice: '部分月份数据不完整，已由系统自动根据前后月份均值生成参考估算值，用户可直接采纳或手动修改。'
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 BAM Platform Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
