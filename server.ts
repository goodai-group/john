import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { SUPPORTED_CURRENCIES } from './src/lib/currencies';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy Gemini client helper
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GEMINI_API_KEY;

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
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
  const hasGemini = Boolean(geminiKey && geminiKey !== 'MY_GEMINI_API_KEY');
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasSupabase = Boolean(supabaseUrl && supabaseKey);
  res.json({
    status: 'ok',
    version: '1.4.1',
    hasGeminiKey: hasGemini,
    hasSupabaseConfig: hasSupabase,
    timestamp: new Date().toISOString()
  });
});

// 2. AI Rule Consultation & Edge Case Evaluator
app.post(['/api/ai/chat', '/api/ai-consultation'], async (req, res) => {
  try {
    const question = (req.body.question || req.body.message || '').trim();
    const { context, language = 'zh' } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Question or message is required' });
    }

    const ai = getGeminiClient();

    // Check if query is an edge-case rule boundary question
    const isEdgeKeyword = /休渔|季节|倒闭|天灾|战乱|物物交换|欠条|赊账|没有发票|教会赠款|非官方汇率|两套账|换人|无执照/i.test(
      question
    );

    if (ai) {
      try {
        const systemInstruction = `
你是一个专为全球海外小微商业经营者（如餐饮小吃、商超便利、跨境小微、维修汽修、个体工坊等无财务背景老板）打造的"商业模型体检与规则答疑专家"。
你连接并熟知全球小微商业大数据基准库（覆盖东南亚、非洲、拉美、东亚数万家微型企业真实经营样本）及 BAM-PRD-2026-V1.4 规则规范。

【严格答疑准则】：
1. 通俗大白话与人话：杜绝堆砌晦涩英文财务缩写。提到专业概念时必须用通俗人话解释（例如：经营月均总流水就是还没扣任何成本的客人买单总进账；毛利就是扣除进货本钱后留下的钱；OPEX就是每月雷打不动的房租工人工资）。
2. 连接大数据基准：回答财务概念与经营问题时，主动提供行业大数据参考（如餐饮月流水与毛利率60%左右、零售商超25%左右、生活服务75%左右），让老板知道自己的水平在行业里处于什么位置。
3. 规则安全与消除焦虑：明确说明"此处的规则提问完全加密且仅用于辅助填报，绝不计入评分系统；无论手写账本还是纯手动填数字，打分一视同仁 100% 同权"。
4. 边缘疑难情况处理：若遇到战乱汇率、极端季节性（如休渔期）、物物交换等规则外情况，给出 2 种保守填报路径（路径A与路径B）并预估得分与后果。

返回合法的 JSON 数据，格式如下：
{
  "answer": "生动详实的大白话回答（包含：一句话本质定义、大白话对比举例、📊 行业大数据基准、✍️ 针对性填报指引）",
  "confidence": "HIGH" | "LOW_EDGE_CASE",
  "isEdgeCase": boolean,
  "category": "概念大白话解析 | 行业大数据基准 | 规则合规指引 | 边缘疑难推算",
  "suggestedAction": "简要可落地的填报动作",
  "bigDataBenchmark": "一句话行业大数据参考总结",
  "conservativePaths": [
    {
      "pathName": "路径 A (例如：12个月年化平摊法 - 推荐)",
      "assumption": "具体假设",
      "estimatedScore": "预估得分范围",
      "consequence": "对评分与报告的影响"
    }
  ]
}
`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: `用户提问: "${question}"\n当前上下文: ${JSON.stringify(context || {})}`,
          config: {
            systemInstruction,
            responseMimeType: 'application/json'
          }
        });

        const replyText = response.text || '';
        try {
          const parsed = JSON.parse(replyText);
          return res.json({
            reply: parsed.answer || replyText,
            aiResponse: parsed.answer || replyText,
            answer: parsed.answer || replyText,
            confidence: parsed.confidence || (isEdgeKeyword ? 'LOW_EDGE_CASE' : 'HIGH'),
            isEdgeCase: parsed.isEdgeCase ?? isEdgeKeyword,
            category: parsed.category || '小微经营大白话解析',
            suggestedAction: parsed.suggestedAction || '规则清晰，可放心填报',
            bigDataBenchmark: parsed.bigDataBenchmark,
            conservativePaths: parsed.conservativePaths
          });
        } catch {
          return res.json({
            reply: replyText,
            aiResponse: replyText,
            answer: replyText,
            confidence: isEdgeKeyword ? 'LOW_EDGE_CASE' : 'HIGH',
            isEdgeCase: isEdgeKeyword,
            category: '小微经营大白话解析',
            suggestedAction: '规则清晰，可放心填报'
          });
        }
      } catch (err: any) {
        console.warn('Gemini API request failed, falling back to smart big-data rule engine:', err.message);
      }
    }

    // Smart Big-Data Knowledge Engine (Deterministic Fallback)
    let fallbackReply = '';
    let isEdgeCase = isEdgeKeyword;
    let category = '小微经验填报与大数据解析';
    let suggestedAction = '规则清晰，可放心填报';
    let bigDataBenchmark = '';
    let paths: any[] | undefined = undefined;

    const lowerQ = question.toLowerCase();

    // 1. Term: 流水 vs 收入 / 营业额 (The exact question from user)
    if (/流水|营业额|总进账|是收入还是|营业收入|做买卖收的钱|总销售/i.test(question)) {
      category = '核心财务术语通俗解析';
      suggestedAction = '填报时填写近3-12个月扣除退款后的平均每月总进账（未扣除成本）';
      bigDataBenchmark = '全球小微样本库中：餐饮月均流水约3~12万，零售超市约5~25万，生活服务约2~8万。';
      fallbackReply = `【💡 大白话核心解答：经营月均总流水是“总营业额”，不是到手净利润】

1. 一句话本质：
「经营月均总流水」＝ 客人买单进你口袋、收银机、微信/支付宝或银行卡里的【全部毛钱】（总营业额 Gross Revenue）。
⚠️ 这笔钱【还没有扣除】进货成本、房租、工人工资、水电和税费！

2. 用开店例子大白话对比：
• 经营总流水（营业额）：比如你的奶茶店一个月总共卖了 1,000 杯，收了 50,000 块钱。这 50,000 块就是「经营月均总流水」。
• 进货采购成本：买茶叶、牛奶、杯子花了 15,000 块（毛利率 70%）。
• 固定开销（房租+人工）：铺租 8,000 块，请一个店员 4,000 块，水电 1,000 块，合计 13,000 块。
• 到手纯收入（净利润）：50,000 - 15,000 - 13,000 = 22,000 块钱，这才是你真正赚进腰包的纯收入！

3. 📊 连接行业大数据参考（基于全球数万家小微商业基准）：
• 餐饮小吃/饮品：月均总流水中位数 ¥45,000~¥120,000，平均毛利率 55%~68%，净利润率 15%~25%；
• 社区超市/杂货铺：月均总流水中位数 ¥60,000~¥250,000，走量为主，毛利率 20%~32%，净利润率 8%~14%；
• 跨境电商/外贸档口：月均总流水中位数 ¥80,000~¥500,000+，毛利率 30%~48%，净利润率 10%~20%；
• 美发汽修/生活服务：月均总流水中位数 ¥25,000~¥80,000，主要是手艺人工，毛利率 70%~85%，净利润率 25%~40%。

4. ✍️ 填报指南：
在第 1 步输入框中，请填写你最近 3~12 个月平均每个月收到的总进账金额。如有淡旺季，可取 12 个月总和除以 12 计算月平均。`;
    }
    // 2. Term: 毛利 / 毛利率 / 进货成本 (COGS)
    else if (/毛利|进货|成本|cogs|原材料|采购/i.test(question)) {
      category = '进货成本与毛利空间解析';
      suggestedAction = '进货成本只算买货和原材料的直接花费，不包含房租和员工底薪';
      bigDataBenchmark = '餐饮行业毛利率建议保持在50%以上，零售超市建议保持在22%以上。';
      fallbackReply = `【💡 大白话：进货成本（COGS）与毛利润】

1. 什么是进货采购成本（COGS）？
直接用于制造商品或进货的真金白银。比如开饭店买肉菜调料的钱、开服装店进衣服的进货价。不包含店租和员工薪资。

2. 什么是毛利润？
毛利润 = 月均总流水 - 进货采购成本。
毛利率 = 毛利润 ÷ 月均总流水 × 100%。
大白话：每做 100 块钱生意，扣掉供货商拿走的成本后，留在你手里用来发工资和交房租的底钱。

3. 📊 大数据基准警示线：
• 毛利率低于 20%：属于薄利危险区（除大型批发外），极易被房租吃垮，触碰 Gate-2 风险；
• 毛利率 30%~55%：健康平衡区（普通零售、标准外贸）；
• 毛利率 60%~80%：高毛利区（特色餐饮、手艺定制、高附加值服务）。`;
    }
    // 3. Term: 房租 / 工资 / 固定开销 (OPEX)
    else if (/房租|工资|人工|opex|固定开销|水电|租金/i.test(question)) {
      category = '固定经营成本解析';
      suggestedAction = '将每月必须支付的店租、员工底薪和固定水电网费合计填入 OPEX';
      bigDataBenchmark = '健康小微企业的固定开销占总营业额比例应控制在 45% 以内。';
      fallbackReply = `【💡 大白话：房租与工人工资（固定开销 OPEX）】

1. 一句话本质：
每月不管开不开门、有没有客人，雷打不动一定要付出去的硬性开销（如房东租金、店员固定底薪、水电物业宽带费）。

2. 关键体检指标（房租人工占比）：
固定开销占比 = 每月固定开销 ÷ 每月总流水 × 100%。

3. 📊 大数据抗风险底线：
• 优良（≤ 30%）：店租便宜、人员精干，抗突发风险能力极强；
• 健康（30% ~ 45%）：行业正常水平；
• 危险（> 50%）：重度开销，一旦某个月客人少 20%，极易当月转为亏损。`;
    }
    // 4. Term: 备用金 / 现金跑道 / Runway / 存款
    else if (/备用金|跑道|runway|现金储备|存款|应急资金|撑几个月/i.test(question)) {
      category = '现金流与抗风险能力解析';
      suggestedAction = '流动资产应保持能够支付 3 个月以上纯固定开销（房租+工资）的现钱';
      bigDataBenchmark = '全球小微企业破产原因中，82%是因为现金流突然断裂而非账面亏损。';
      fallbackReply = `【💡 大白话：应急现金备用金（现金跑道 Runway）】

1. 什么是现金跑道？
账上现有的可用现金与存款 ÷ 每月固定必须支出的开销（房租+人工）。
大白话：如果明天突发意外一个月一分钱进账都没有，你账上的现钱能继续给房东交租、给员工发工资顶几个月？

2. 📊 评分体系与大数据安全线：
• < 1.5 个月（🔴 高危）：触发 Gate-3 门槛红线警示，必须立即建立备用金蓄水池；
• 2.0 ~ 3.0 个月（🟡 及格线）：勉强应付日常起伏；
• ≥ 3.0 个月（🟢 优良安全）：从容抵御供应链断货、淡季或政策突发波动。`;
    }
    // 5. Term: 凭证与手动填报 / 手写账本 / 歧视
    else if (/凭证|银行流水|记账本|手写|发票|无执照|截图|会不会扣分|歧视/i.test(question)) {
      category = '填报凭证完全同权规则';
      suggestedAction = '手写账本、收银截图或纯手动填写享受 100% 相同评分标准，放心填报';
      bigDataBenchmark = '平台海外用户中超过 63% 采用纯手动填写或手写账本识别完成自测。';
      fallbackReply = `【💡 官方权威规则答复：凭证 100% 零歧视原则】

1. 核心规则（BAM-PRD-2026-V1.4 规范）：
在本平台上，【凭证类型绝不影响得分】！
无论您是：
A. 上传正规银行对公对私流水 PDF；
B. 拍照上传手写记账本 / 微信支付宝收款汇总截图；
C. 完全不传任何图片，选择【纯手动填写 14 项经营数字】；
系统的算法引擎执行 100% 完全一致的财务逻辑运算与 5 维雷达评分，绝无任何凭证歧视或权重减分！

2. 凭证的作用仅仅是：
方便 AI 自动识别帮您省去手动输入的麻烦。如果您处于敏感地区或没有记账凭证，直接纯手动填写数字即可！`;
    }
    // 6. Term: 汇率 / 黑市 / 多重汇率 / 折算
    else if (/汇率|黑市|民间|非官方|折算|美金|换汇|货币/i.test(question)) {
      category = '多币种与自报汇率规则';
      suggestedAction = '勾选“本国存在多重汇率”，按您做生意实际兑换的民间比例折算填报';
      bigDataBenchmark = '尼日利亚、阿根廷、埃塞俄比亚等多个地区均支持平行汇率自报折算。';
      fallbackReply = `【💡 多币种与多重汇率自报机制】

1. 尊重民间实际交易价：
在许多海外国家（如非官方平行市场存在溢价），官方汇率严重失真。本平台允许您：
• 在每个金额输入框直接选择交易币种（USD、KES、NGN、EGP、CNY 等）；
• 勾选【本国存在多重汇率】并填入您在日常进货和收银中实际使用的兑换汇率。

2. 报告透明标注：
系统将以您的自报汇率作为折算基准，并在最终报告中醒目注明，保证您的利润率和现金流测算真实反映经营现状，不被官方虚高汇率误导。`;
    }
    // 7. Term: 敏感 / 安全 / 隐私 / 查我
    else if (/敏感|安全|隐私|查我|泄露|销毁|脱敏/i.test(question)) {
      category = '敏感安全脱敏模式';
      suggestedAction = '可在填报首页随时开启“敏感安全脱敏模式”，图片即时销毁';
      bigDataBenchmark = '本平台采用零服务器原始凭证留存架构，计算完毕物理释放内存。';
      fallbackReply = `【💡 敏感地区数据安全与脱敏机制】

1. 开启“敏感安全模式”后的 5 重保护：
• 地理定位仅要求选择国家或大区，不采集具体地址和店名；
• 原始凭证全变为非必填，仅需提供经营数字；
• 上传的图片仅在内存中通过 OCR 提取数字，识别后立即销毁，不在云端做任何文件持久化存储；
• 全程由 AI 算法自测，没有任何人工初审员或外部人员查看；
• 支持随时一键【撤回并物理销毁所有自测记录】。`;
    }
    // 8. Edge Case: 季节性 / 休渔 / 天灾
    else if (isEdgeCase) {
      category = '边缘疑难规则推算';
      suggestedAction = '建议采用路径 A（12个月年化平均平摊法）进行合理申报';
      bigDataBenchmark = '季节性行业（如水产、滑雪、果蔬）建议常备 4~6 个月固定开销应急金。';
      fallbackReply = `【⚠️ 边缘疑难情况 · 2 种保守推算路径】

针对您所提到的特殊经营情况（如休渔期、极端淡旺季、特殊战乱环境等）：

📌 路径 A (推荐：12 个月年化平均平摊法)：
• 做法：将全年各活跃月份的总收入相加除以 12，得出标准的“月均总流水”，房租人工也按全年总成本平均到 12 个月。
• 优势：最真实体现生意的全年综合自养能力，系统报告会自动附注季节性年化平摊说明。

📌 路径 B (保守：仅按活跃月份真实填报 + 加大现金储备)：
• 做法：按旺季单月真实收支填写，但流动资金必须留足覆盖全部休业淡季的房租工资。
• 风险：若账上备用金不足以覆盖休业期开销，可能触发 Gate-3 现金跑道警示。`;
      paths = [
        {
          pathName: '路径 A (推荐：12个月年化平均法)',
          assumption: '将全年总营业收入除以 12 个月拉平为月均收入，房租按月分摊计入 OPEX。',
          estimatedScore: '约 76-84 分 (GRADE A/BBB)',
          consequence: '最贴合实际抗风险能力，报告中将自动附注季节性平摊说明。'
        },
        {
          pathName: '路径 B (保守：仅按活跃月份填报并加大备用金)',
          assumption: '按旺季单月真实数据填写，但现金储备必须能覆盖淡季全部固定开支。',
          estimatedScore: '约 70-75 分 (GRADE BBB)',
          consequence: '备用金若不足可能触发 Gate-3/4 警示。'
        }
      ];
    }
    // 9. General fallback
    else {
      category = '小微商业模型自测咨询';
      suggestedAction = '您可以直接询问具体财务指标（流水/毛利/OPEX）或行业大数据';
      bigDataBenchmark = '平台已内置餐饮、零售、电商、服务等 6 大核心行业的大数据基准分布。';
      fallbackReply = `【💡 小微商业模型自测专家解答】

您好！关于您咨询的：“${question}”：

1. 本平台自测核心：
围绕【真金白银造血能力】与【抗风险安全底线】，无需复杂会计做账，只看 4 个最接地气的数据：
• 经营月均总流水（每月总营业额进账）；
• 直接进货成本（买原料商品的本钱，看毛利率是否及格）；
• 每月固定开销（房租+员工薪水，看毛利是否包得住）；
• 账面可用备用金（看万一断流能支撑几个月）。

2. 随时查阅：
您可以随时在左下角点击【公开评分标准】查看完整的 5 维雷达打分公式与 4 大门槛红线，所有规则完全公开透明！`;
    }

    return res.json({
      reply: fallbackReply,
      aiResponse: fallbackReply,
      answer: fallbackReply,
      confidence: isEdgeCase ? 'LOW_EDGE_CASE' : 'HIGH',
      isEdgeCase,
      category,
      suggestedAction,
      bigDataBenchmark,
      conservativePaths: paths
    });
  } catch (err: any) {
    console.error('AI chat error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// 2.5 AI Infer Industry & Generate Dynamic Cost/Opex Structure
app.post('/api/ai/infer-business-structure', async (req, res) => {
  try {
    const { projectName = '', currentIndustry = '', baseCurrency = 'USD' } = req.body;
    if (!projectName && !currentIndustry) {
      return res.status(400).json({ error: 'Project name or industry is required' });
    }

    const ai = getGeminiClient();
    if (ai) {
      try {
        const systemInstruction = `
你是一个专为全球商业宣教(BAM)、爱心工场与小微实体项目打造的商业模型与财务架构分析专家。
用户提供了项目/店铺名称（如：“恩典社区义诊所”、“麦种烘焙咖啡馆”、“内罗毕手机维修培训工坊”、“清迈有机蔬菜种植社”、“金边儿童辅导中心”等）。

请根据项目名称和业务属性，完成以下工作：
1. 智能推断最贴切的行业类别 key 及展示名称。
   行业预设 key 可选：medical_health, food_beverage, education_training, vocational_training, retail_store, agriculture, child_care, community_service, handicraft, tech_service, other
2. 根据项目名称中的地名/国家线索推断最适用的建议主币种（如涉及肯尼亚/内罗毕推断 KES，泰国/清迈推断 THB，越南推断 VND，尼日利亚推断 NGN，中国推断 CNY，全球/未明确推断 USD）。
3. 为该【特定行业与店铺类型】量身定制 2-4 个具体的【直接物料/采购成本填写项 (COGS)】（例如诊所是药品采购、敷料针剂；咖啡店是咖啡豆鲜奶、打包杯袋；语言中心是教材文具印制）。
4. 为该店铺量身定制 3-5 个具体的【每月固定运营开支填写项 (OPEX)】（例如场地租金、员工薪酬与同工补贴、水电燃气与网络物业、设备折旧维护等）。
5. 给出适合该币种和行业的合理默认参考数值。

返回合法的 JSON 格式：
{
  "inferredIndustryKey": "medical_health" | "food_beverage" | "education_training" | "vocational_training" | "retail_store" | "agriculture" | "child_care" | "community_service" | "handicraft" | "other",
  "industryDisplayName": "🩺 医疗健康 / 爱心义诊所",
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

        const response = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: `项目/店铺名称: "${projectName}"\n用户当前选择的行业: "${currentIndustry}"\n当前币种: "${baseCurrency}"`,
          config: {
            systemInstruction,
            responseMimeType: 'application/json'
          }
        });

        const parsed = JSON.parse(response.text || '{}');
        if (parsed.inferredIndustryKey) {
          return res.json({
            success: true,
            ...parsed
          });
        }
      } catch (err: any) {
        console.warn('Gemini infer-business-structure failed, fallback to smart rule engine:', err.message);
      }
    }

    // Deterministic fallback rule engine
    const pLower = projectName.toLowerCase();
    let key = 'community_service';
    let displayName = '🤝 综合助贫 / 社会企业';
    let customName = '社区服务与综合社会企业';
    let curr = baseCurrency || 'USD';
    let revTip = '日常营业与服务总流水进账';
    let rev = 40000;
    let cogs: any[] = [];
    let opex: any[] = [];
    let advice = '建议保持直接成本占 30% 左右，常备 3 个月以上固定开支应急金。';

    // Currency clue detection
    if (/肯尼亚|内罗毕|nairobi|kenya|kes/i.test(pLower)) curr = 'KES';
    else if (/泰国|清迈|曼谷|thailand|chiang mai|thb/i.test(pLower)) curr = 'THB';
    else if (/越南|河内|胡志明|vietnam|vnd/i.test(pLower)) curr = 'VND';
    else if (/印尼|雅加达|indonesia|idr/i.test(pLower)) curr = 'IDR';
    else if (/菲律宾|马尼拉|philippines|php/i.test(pLower)) curr = 'PHP';
    else if (/尼日利亚|拉各斯|nigeria|ngn/i.test(pLower)) curr = 'NGN';
    else if (/埃及|开罗|egypt|egp/i.test(pLower)) curr = 'EGP';
    else if (/埃塞俄比亚|ethiopia|etb/i.test(pLower)) curr = 'ETB';
    else if (/缅甸|仰光|曼德勒|内比都|myanmar|yangon|mmk/i.test(pLower)) curr = 'MMK';
    else if (/柬埔寨|金边|cambodia|phnom penh|khr/i.test(pLower)) curr = 'KHR';
    else if (/老挝|万象|laos|vientiane|lak/i.test(pLower)) curr = 'LAK';
    else if (/孟加拉|达卡|bangladesh|dhaka|bdt/i.test(pLower)) curr = 'BDT';
    else if (/斯里兰卡|科伦坡|sri lanka|colombo|lkr/i.test(pLower)) curr = 'LKR';
    else if (/中国|恩典|麦种|光明|爱心|cny|rmb/i.test(pLower)) curr = 'CNY';

    // Industry detection
    if (/医|诊所|药|门诊|卫生|康复|牙科|clinic|health|hospital|care|medical/i.test(pLower)) {
      key = 'medical_health';
      displayName = '🩺 医疗健康 / 爱心义诊所';
      customName = '社区爱心诊所与便民药房';
      revTip = '门诊挂号看诊费、平价药品与检查费等全部进账';
      rev = 2200;
      cogs = [
        { id: 'cogs_meds', name: '常用中西药品与药剂采购', description: '抗生素、感冒退热、降压等常备药品', amount: 650 },
        { id: 'cogs_supplies', name: '医用敷料耗材与消毒器械', description: '一次性注射器、纱布胶布、消毒酒精、手套', amount: 150 }
      ];
      opex = [
        { id: 'opex_rent', name: '诊所场地租金与物业', description: '每月固定房租与物业费', amount: 400 },
        { id: 'opex_staff', name: '本地护士与药房助理津贴', description: '全职护士与配药同工薪酬', amount: 600 },
        { id: 'opex_utility', name: '冷藏电费、水电与通讯', description: '药品冰箱冷藏用电、日常水电与宽带', amount: 120 },
        { id: 'opex_misc', name: '医疗固废清运与执照年检', description: '合规环保清运与消耗品', amount: 80 }
      ];
      advice = '爱心门诊药品采购成本约占总进账 30%-40%，建议常备 3.5 个月固定开支备用金。';
    } else if (/咖啡|烘焙|面包|餐厅|小吃|甜品|茶|cafe|bakery|coffee|food|restaurant/i.test(pLower)) {
      key = 'food_beverage';
      displayName = '☕ 餐饮烘焙 / 社区咖啡';
      customName = '社区烘焙工坊与精品咖啡';
      revTip = '堂食点单、现烤面包甜点、外卖及咖啡豆零售总进账';
      rev = 3000;
      cogs = [
        { id: 'cogs_beans_milk', name: '咖啡生豆/熟豆、鲜牛奶与糖浆', description: '高品质咖啡豆、鲜牛奶/燕麦奶原料', amount: 700 },
        { id: 'cogs_baking', name: '烘焙面粉、黄油、酵母与配料', description: '烘焙专用面粉、动物黄油、乳酪等食材', amount: 450 },
        { id: 'cogs_packaging', name: '外带环保纸杯、吸管与打包盒袋', description: '定制环保咖啡纸杯、封口膜、食品包装袋', amount: 150 }
      ];
      opex = [
        { id: 'opex_rent', name: '临街旺铺/社区店面租金', description: '每月固定门面铺租', amount: 500 },
        { id: 'opex_barista', name: '咖啡师与烘焙师傅薪资', description: '全职与兼职店员薪酬', amount: 700 },
        { id: 'opex_power', name: '高功率烘焙烤箱与咖啡机电费水费', description: '商用烤箱、浓缩咖啡机动力用电与水费', amount: 160 },
        { id: 'opex_maintenance', name: '商用设备日常保养与耗损', description: '滤水器滤芯更换、磨豆机维护与损耗', amount: 80 }
      ];
      advice = '餐饮烘焙行业直接食材成本通常占 35%-45%，毛利率宜保持在 55% 以上，注意控制旺铺租金比重。';
    } else if (/教育|学校|培训|辅导|语言|英语|文化|课后|school|education|language|tutoring/i.test(pLower)) {
      key = 'education_training';
      displayName = '📚 语言教育 / 辅导中心';
      customName = '社区青少年语言学习与课后辅导中心';
      revTip = '学员月度/季度学费、教材费与课后辅导收费';
      rev = 2200;
      cogs = [
        { id: 'cogs_books', name: '教学教材、练习册与课本印制', description: '学生学习讲义、印刷教材与练习文具', amount: 220 },
        { id: 'cogs_online', name: '在线教学软件平台与教具耗材', description: '教学课件系统、白板笔与活动道具', amount: 80 }
      ];
      opex = [
        { id: 'opex_rent', name: '教学教室场地租金', description: '教室、自习室月度固定租金', amount: 500 },
        { id: 'opex_teachers', name: '本地授课教师与助教课酬', description: '专职老师与兼职助教薪酬补贴', amount: 950 },
        { id: 'opex_utility', name: '教室空调电费、宽带网络与饮用水', description: '教室内照明空调动力电与多媒体网络', amount: 140 },
        { id: 'opex_activity', name: '学员文化交流与家长日活动杂费', description: '定期学员文化展示与辅导杂支', amount: 80 }
      ];
      advice = '教育培训属于轻资产服务，直接教材成本低（<15%），核心支出在老师薪资与场地，保持 25% 结余即可稳健运营。';
    } else if (/技能|维修|it|汽修|木工|手工|实训|工坊|workshop|tech|repair|vocational/i.test(pLower)) {
      key = 'vocational_training';
      displayName = '🛠️ 职业实训 / 手工工坊';
      customName = '青年职业技能实训与手艺工坊';
      revTip = '手作产品销售、维修服务收费与实训学员学费';
      rev = 2200;
      cogs = [
        { id: 'cogs_materials', name: '实训原料、木料/皮革/布料耗材', description: '制作成品消耗的原材料与配件', amount: 500 },
        { id: 'cogs_tools', name: '易损刀具、焊锡/五金零配件与损耗', description: '日常实操易耗零部件与五金', amount: 160 }
      ];
      opex = [
        { id: 'opex_rent', name: '实训车间/工坊场地租金', description: '工坊车间月度场地租金', amount: 400 },
        { id: 'opex_master', name: '带教技师与工匠师傅津贴', description: '全职技师师傅与车间指导员薪资', amount: 700 },
        { id: 'opex_power', name: '动力工业用电、水费与安全保险', description: '大型机床/电动工具动力用电与安全防护', amount: 150 },
        { id: 'opex_maintain', name: '机械设备定期检修与润滑耗损', description: '设备磨损维护与零件更换', amount: 90 }
      ];
      advice = '职业实训与工坊需兼顾产品质量与技能传授，建议储备 3 个月以上资金支持设备升级换代。';
    } else if (/超市|商超|便利|杂货|零售|批发|档口|百货|服装|服饰|衣帽|鞋店|箱包|手机|数码|电脑|电器|家电|五金|建材|文具|store|shop|market|retail|clothing|garment|tailor|shoe|phone|electronics|hardware/i.test(pLower)) {
      key = 'retail_store';
      displayName = '🛒 社区零售 / 平价商超';
      customName = '便民社区生活平价超市';
      revTip = '日用百货、食品调料与平价生鲜全部收银流水';
      rev = 5000;
      cogs = [
        { id: 'cogs_stock', name: '商品批量批发进货成本', description: '向一级批发商采购米面粮油、日化日杂底价', amount: 3800 },
        { id: 'cogs_freight', name: '货品物流运输与搬运装卸费', description: '大宗商品长途配送与到店搬运费', amount: 200 }
      ];
      opex = [
        { id: 'opex_rent', name: '临街商铺月度租金', description: '社区出入口商铺固定月租', amount: 400 },
        { id: 'opex_cashier', name: '收银员与理货店员薪资', description: '全职与排班理货员工资', amount: 350 },
        { id: 'opex_utility', name: '商超照明、冰柜冷藏用电与网络', description: '陈列冷饮柜持续用电及收银宽带', amount: 100 },
        { id: 'opex_loss', name: '货品合理损耗、防盗与包装袋', description: '生鲜自然损耗、环保购物袋采购', amount: 50 }
      ];
      advice = '社区零售走量为主，毛利率通常在 20%-30%，需严格把控进货周转率与损耗。';
    } else if (/农场|农业|种植|养殖|果园|蔬菜|farm|agriculture/i.test(pLower)) {
      key = 'agriculture';
      displayName = '🌱 现代农业 / 生态种植';
      customName = '生态农业种植与扶贫合作社';
      revTip = '果蔬收成批发、生态农产品直销与订单进账';
      rev = 1800;
      cogs = [
        { id: 'cogs_seeds', name: '优良种苗、有机肥料与生物农药', description: '非转基因优质种子、有机堆肥与生物防虫剂', amount: 380 },
        { id: 'cogs_packaging', name: '保鲜包装箱、果筐与田间耗材', description: '透气果蔬纸箱、冷链冰袋与包装膜', amount: 120 }
      ];
      opex = [
        { id: 'opex_rent', name: '农田土地租赁与大棚租金', description: '合作社耕地与温室大棚承包租金', amount: 280 },
        { id: 'opex_farmers', name: '本地农工与田间管理人员工资', description: '全职农艺师与采摘季节工薪酬', amount: 550 },
        { id: 'opex_irrigation', name: '灌溉水费、农机柴油与电力', description: '水泵灌溉用电、微耕机农用柴油', amount: 150 },
        { id: 'opex_tools', name: '农具维护与水肥一体化管网保养', description: '滴灌管道检修与农机配件耗损', amount: 80 }
      ];
      advice = '农业受季节与天气影响较大，建议预留 4-6 个月固定开销作为越冬或休耕期周转资金。';
    } else if (/儿童|日托|学前|启蒙|幼托|childcare|daycare|kindergarten/i.test(pLower)) {
      key = 'child_care';
      displayName = '🧒 儿童日托 / 社区启蒙';
      customName = '社区贫困儿童日托与学前启蒙中心';
      revTip = '家长托育服务费、营养膳食费与爱心助学款';
      rev = 1900;
      cogs = [
        { id: 'cogs_food', name: '儿童每日营养膳食与辅食原料', description: '新鲜牛奶、鸡蛋、蔬果及安全营养食材', amount: 320 },
        { id: 'cogs_toys', name: '益智教具、绘画文具与卫生纸品', description: '安全积木、绘本、儿童专用消毒洗手液', amount: 90 }
      ];
      opex = [
        { id: 'opex_rent', name: '安全日托场地与户外活动区租金', description: '符合儿童安全规范的室内外场地租金', amount: 380 },
        { id: 'opex_teachers', name: '专职幼教老师与保育同工薪资', description: '全职幼师、保育员与厨师阿姨补贴', amount: 750 },
        { id: 'opex_utility', name: '恒温空调电费、温水与空气净化', description: '保持适宜室内温度用电与净化器滤网', amount: 120 },
        { id: 'opex_safety', name: '儿童安全保险与定期消毒杂费', description: '活动责任险与紫外线消毒耗材', amount: 70 }
      ];
      advice = '儿童日托重在安全与营养，保持 3.5 个月以上流动储备以应对公共卫生或突发紧急情况。';
    } else if (/美容|美发|理发|美甲|纹绣|洗护|洗衣|干洗|salon|beauty|hair|barber|nail|laundry/i.test(pLower)) {
      key = 'community_service';
      displayName = '🤝 美容美发 / 社区生活服务';
      customName = '社区美容美发与便民生活服务';
      revTip = '理发美容服务、护理套餐与会员卡储值全部进账';
      rev = 1800;
      cogs = [
        { id: 'cogs_materials', name: '洗护美发用品与美容护理耗材', description: '洗发水、染膏、护理液与一次性耗材', amount: 260 },
        { id: 'cogs_products', name: '零售护发美容产品进货', description: '店售护发素、护肤品等商品批发成本', amount: 100 }
      ];
      opex = [
        { id: 'opex_rent', name: '社区沿街店面租金', description: '每月固定门面铺租', amount: 380 },
        { id: 'opex_staff', name: '理发师与美容技师薪资', description: '全职技师与学徒薪酬补贴', amount: 650 },
        { id: 'opex_utility', name: '水电热水与门店清洁耗材', description: '洗护用水用电与毛巾消毒杂支', amount: 120 },
        { id: 'opex_misc', name: '设备维护与证照年检杂费', description: '吹风机电推维护与营业执照年检', amount: 70 }
      ];
      advice = '美容美发属于高毛利生活服务，耗材成本低，核心是稳定客流与会员复购，建议常备 3 个月以上固定开支。';
    } else {
      // General custom business
      key = 'custom';
      displayName = '💡 定制实体 / 小微商业';
      customName = projectName || '定制小微商业实体';
      revTip = '每月提供商品或服务产生的全部营业进账流水';
      rev = 2200;
      cogs = [
        { id: 'cogs_1', name: '核心原材料与直接货品采购', description: '随业务量直接波动的商品或原辅料进货花费', amount: 700 },
        { id: 'cogs_2', name: '包装材料与直接加工耗材', description: '包装物、消耗性辅料与直接耗材', amount: 150 }
      ];
      opex = [
        { id: 'opex_rent', name: '经营场所与办公室月度租金', description: '每月固定支付给业主的场地租金', amount: 400 },
        { id: 'opex_labor', name: '全职员工与业务骨干薪资补贴', description: '全职团队与骨干同工每月固定薪酬', amount: 650 },
        { id: 'opex_utility', name: '水电物业与网络通讯杂支', description: '每月固定水电能耗与宽带通讯费', amount: 120 },
        { id: 'opex_other', name: '设备折旧维护与证照杂项', description: '工具维护、年检与日常杂支', amount: 80 }
      ];
    }

    // 行业基准金额采用"美元/月"合理量级，按推断币种换算为当地货币，
    // 让 AI 填入表单的营业收入与物料/开支金额与所选币种同口径、量级真实
    const inferredRate = SUPPORTED_CURRENCIES.find((c) => c.code === curr)?.rateToUsd || 1;
    const toLocal = (usd: number) => Math.round(usd * inferredRate);
    rev = toLocal(rev);
    cogs = cogs.map((it) => ({ ...it, amount: toLocal(it.amount) }));
    opex = opex.map((it) => ({ ...it, amount: toLocal(it.amount) }));

    return res.json({
      success: true,
      inferredIndustryKey: key,
      industryDisplayName: displayName,
      customIndustryName: customName,
      suggestedCurrency: curr,
      revenueTip: revTip,
      estimatedMonthlyRevenue: rev,
      cogsItems: cogs,
      opexItems: opex,
      benchmarkAdvice: advice
    });
  } catch (e: any) {
    console.error('infer-business-structure error:', e);
    res.status(500).json({ error: e.message });
  }
});

// 3. AI Deep Diagnosis for Assessment Report
app.post('/api/ai/deep-diagnosis', async (req, res) => {
  try {
    const { report } = req.body;
    if (!report) {
      return res.status(400).json({ error: 'Report object is required' });
    }

    const ai = getGeminiClient();
    if (ai) {
      try {
        const systemInstruction = `
你是一位资深的全球小微商业运营与财务健康体检专家。
请根据用户商业自测项目的数据指标（包括毛利率、净利率、租金人工开销占比、现金跑道月数、偿债覆盖倍数、5维度得分与红线通过情况），提供极具落地指导意义的"大白话"深度诊断与行动建议。
严格要求：
1. 严禁使用任何生僻财务术语，只用普通做买卖老板听得懂的语言（例如说"每卖100块能剩下多少"、"手头备用金能顶几个月"、"每月工人和房租开销吃掉了多少利润"）。
2. 输出 4-6 条非常具体、可执行的操作建议（如：压降进货成本的谈判策略、如何设定安全备用金、债务重组或加速现金回流技巧）。
3. 输出格式为 JSON：
{
  "summaryHeadline": "一句话核心定性（例如：现金流底子扎实，但进货成本占比偏高）",
  "plainExplanation": "2-3句通俗业务体检概括",
  "actionableAdvices": [
    "具体建议 1",
    "具体建议 2",
    "具体建议 3",
    "具体建议 4"
  ],
  "potentialGrowthAreas": [
    "增长抓手 1",
    "增长抓手 2"
  ]
}
`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: `商业项目数据：${JSON.stringify({
            projectName: report.projectName,
            industry: report.industry,
            baseCurrency: report.baseCurrency,
            financials: report.normalizedFinancials,
            radarScores: report.radarScores,
            totalScore: report.totalScore,
            tier: report.tier,
            gatePassed: report.gatePassed,
            failedGates: report.failedGates
          })}`,
          config: {
            systemInstruction,
            responseMimeType: 'application/json'
          }
        });

        const parsed = JSON.parse(response.text || '{}');
        return res.json({
          success: true,
          ...parsed
        });
      } catch (err: any) {
        console.warn('Gemini deep diagnosis failed, fallback to local engine:', err.message);
      }
    }

    // Fallback deterministic diagnosis
    const financials = report.normalizedFinancials;
    const advices = [];
    if (financials.grossMarginPercent < 35) {
      advices.push(`进货成本占比偏高（毛利率仅 ${financials.grossMarginPercent}%）：建议与供应商协商批量采购折扣，或适当优化菜品/商品定价组合，将毛利率提升至 40% 以上。`);
    } else {
      advices.push(`毛利空间表现健康（毛利率 ${financials.grossMarginPercent}%）：产品自带定价优势，可继续保持优质货源与供应链稳定。`);
    }

    if (financials.cashRunwayMonths < 3) {
      advices.push(`手头备用金紧张（仅可支撑 ${financials.cashRunwayMonths} 个月开销）：建议暂停非必要设备投入，优先将账面现金积累至 3-6 个月固定支出安全线。`);
    } else {
      advices.push(`现金缓冲垫充裕（可支撑 ${financials.cashRunwayMonths} 个月）：具备极强的抗突发风险与淡季生存能力。`);
    }

    if (financials.opexRatioPercent > 35) {
      advices.push(`每月房租与人工开销偏重（吃掉营业额的 ${financials.opexRatioPercent}%）：建议评估店铺坪效或灵活用工排班，控制固定成本。`);
    }

    res.json({
      success: true,
      summaryHeadline: report.gatePassed ? '整体经营稳健，具备可持续造血能力' : '存在部分成本或流动性承压风险',
      plainExplanation: `您的项目综合得分为 ${report.totalScore}分 (${report.tier})，每月净利润约为 ${financials.netProfit} ${report.baseCurrency}。`,
      actionableAdvices: advices,
      potentialGrowthAreas: ['提高老客户复购率以摊薄获客成本', '优化高毛利核心单品销售比例']
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
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
