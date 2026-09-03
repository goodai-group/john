import 'dotenv/config';
import express from 'express';
import path from 'path';
import { pathToFileURL } from 'url';
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

// Gemini 429 配额冷却：免费层对每个模型每天有请求上限（如 gemini-3.6-flash 为 20 次/日）。
// 收到 429 配额超限后的一段时间内直接走本地规则库，避免每次提问都白等一次注定失败的云端请求，
// 冷却结束后自动恢复云端 AI。
let geminiQuotaCooldownUntil = 0;
const GEMINI_QUOTA_COOLDOWN_MS = 90 * 1000;

// Gemini 模型候选列表：按顺序尝试，首个可用的模型即被使用。
// 2026-09 现状：
//   - gemini-2.0-flash：已全局下线（404 "no longer available"）
//   - gemini-2.5-flash：仅对早期账号开放（对当前新账号返回 "no longer available to new users"）
//   - gemini-3.6-flash：当前默认且对所有账号开放
// 因此只保留 3.6-flash，避免回退到不可用的旧模型引发误导性的 404 错误。
const GEMINI_MODELS = ['gemini-3.6-flash'];

async function generateGeminiContent(
  contents: string,
  systemInstruction: string,
  timeoutMs = 25000
): Promise<string> {
  const ai = getGeminiClient();
  if (!ai) throw new Error('Gemini API key not configured');

  let lastError: unknown = null;
  for (const model of GEMINI_MODELS) {
    try {
      const response = await Promise.race([
        ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            responseMimeType: 'application/json'
          }
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Gemini "${model}" timed out after ${timeoutMs}ms`)), timeoutMs)
        )
      ]);
      const text = response.text || '';
      if (!text.trim()) throw new Error(`Gemini "${model}" returned an empty response`);
      return text;
    } catch (err: any) {
      lastError = err;
      console.warn(`Gemini model "${model}" failed:`, err?.message || err);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('All Gemini models failed');
}

// ========================
// 本地规则引擎：通用常识小工具（问候 / 时间 / 计算 / 币种换算）
// 让"未配置 GEMINI_API_KEY"时也能回答常见通用问题，体验更聪明
// ========================
const CURRENCY_ALIASES: Record<string, string[]> = {
  USD: ['美元', '美金', '美刀', 'usd'],
  CNY: ['人民币', 'rmb', 'cny', '块钱'],
  HKD: ['港币', 'hkd'],
  EUR: ['欧元', 'eur'],
  GBP: ['英镑', 'gbp'],
  JPY: ['日元', 'jpy'],
  KES: ['肯尼亚先令', '肯先令', 'kes'],
  NGN: ['奈拉', '尼日利亚奈拉', 'ngn'],
  EGP: ['埃镑', '埃及镑', 'egp'],
  THB: ['泰铢', 'thb'],
  VND: ['越南盾', 'vnd'],
  IDR: ['印尼盾', 'idr'],
  PHP: ['比索', '菲律宾比索', 'php'],
  MMK: ['缅元', '缅币', 'mmk'],
  KHR: ['瑞尔', '柬埔寨瑞尔', 'khr'],
  LAK: ['基普', '老挝基普', 'lak'],
  BDT: ['塔卡', '孟加拉塔卡', 'bdt'],
  LKR: ['卢比', '斯里兰卡卢比', 'lkr'],
  ETB: ['埃塞俄比亚比尔', '比尔', 'etb']
};
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function currencyDisplay(code: string): string {
  const c = SUPPORTED_CURRENCIES.find((x) => x.code === code);
  // nameZh 已自带币种代码（如"美元 (USD)"），直接使用即可
  if (c) return c.nameZh;
  return code;
}
function tryCurrencyConversion(question: string): string | null {
  // 仅当同时出现"数字 + 币种 + 换算意图词"时才触发，避免吞掉业务类汇率问题
  if (!/等于|换算|兑换|换成|多少人民币|折合|相当于|convert|exchange/i.test(question)) return null;
  if (/自报|填报|填多少|怎么填|黑市|官方汇率|民间汇率/.test(question)) return null;

  for (const [code, aliases] of Object.entries(CURRENCY_ALIASES)) {
    const aliasRegex = aliases.map(escapeRegex).join('|');
    const m = question.match(new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(${aliasRegex})`, 'i'));
    if (!m) continue;
    const amount = parseFloat(m[1].replace(/,/g, ''));
    const fromCode = code;
    const rest = question.replace(m[0], '');
    let toCode: string | null = null;
    for (const [c2, aliases2] of Object.entries(CURRENCY_ALIASES)) {
      if (c2 === fromCode) continue;
      if (aliases2.some((a) => rest.toLowerCase().includes(a.toLowerCase()))) {
        toCode = c2;
        break;
      }
    }
    // 未指明目标币种时：人民币→美元，其余→人民币（中文用户语境）
    if (!toCode) toCode = fromCode === 'CNY' ? 'USD' : 'CNY';

    const fromRate = SUPPORTED_CURRENCIES.find((c) => c.code === fromCode)?.rateToUsd || 1;
    const toRate = SUPPORTED_CURRENCIES.find((c) => c.code === toCode)?.rateToUsd || 1;
    const result = (amount / fromRate) * toRate;
    const rounded = Math.abs(result) >= 100 ? Math.round(result) : Math.round(result * 100) / 100;
    return `【💱 币种换算】

${amount.toLocaleString('zh-CN')} ${currencyDisplay(fromCode)} ≈ ${rounded.toLocaleString('zh-CN', { maximumFractionDigits: 2 })} ${currencyDisplay(toCode)}

（平台内置参考汇率：1 USD ≈ ${toRate.toLocaleString('zh-CN', { maximumFractionDigits: 2 })} ${currencyDisplay(toCode)}。实际交易请以当地当日市场汇率为准，本换算仅供参考。）`;
  }
  return null;
}

// ============ 通用常识知识库（覆盖常见人物/地名/概念等通用问答） ============
// 用于本地规则引擎兜底：当 Gemini 不可用时，也能答出一些常见常识问题
// 扩充方法：直接添加 key-value 即可。匹配规则：question 中包含 key 即可命中（忽略大小写）
type KnowledgeEntry = {
  answer: string;
  hint?: string;
};

const GENERAL_KNOWLEDGE: Record<string, KnowledgeEntry> = {
  // ===== 中国古镇 / 景点 =====
  '周庄': {
    answer: '周庄位于中国江苏省苏州市昆山市，是一座有 900 多年历史的江南水乡古镇，被誉为"中国第一水乡"，是国家 5A 级旅游景区。全镇依水而建，至今保存着近 100 座明清古建筑（如双桥、沈厅、张厅），画家陈逸飞名作《故乡的回忆》即取材于此。',
    hint: '中国·江苏·苏州·昆山'
  },
  '乌镇': {
    answer: '乌镇位于中国浙江省嘉兴市桐乡市，京杭大运河畔的典型江南水乡古镇，分为东栅（传统观光）和西栅（休闲度假）两大景区，是世界互联网大会永久会址。',
    hint: '中国·浙江·嘉兴·桐乡'
  },
  '丽江': {
    answer: '丽江位于中国云南省西北部，是纳西族文化中心。丽江古城（又称大研古镇）始建于宋末元初，是中国保存最完整的少数民族古城之一，1997 年被列入世界文化遗产；著名景点还包括玉龙雪山、泸沽湖、茶马古道等。',
    hint: '中国·云南'
  },
  '平遥': {
    answer: '平遥位于中国山西省晋中市，平遥古城始建于西周宣王时期（公元前 827 年—前 782 年），是中国保存最完整的明清时期古代县城原型，1997 年与丽江古城等一并列入世界文化遗产；古城内的"日昇昌"是中国最早的票号（银行雏形）。',
    hint: '中国·山西·晋中'
  },
  '凤凰': {
    answer: '凤凰古城位于中国湖南省湘西土家族苗族自治州沱江下游，依山傍水，是苗族、土家族等少数民族聚居的千年古城，沈从文笔下的《边城》即以此为背景。',
    hint: '中国·湖南·湘西'
  },
  // ===== 中国历史 / 思想人物 =====
  '孔子': {
    answer: '孔子（公元前 551 年—公元前 479 年），名丘，字仲尼，春秋时期鲁国（今山东曲阜）人，中国古代最伟大的思想家、教育家之一，儒家学派创始人。核心思想包括"仁""义""礼""智""信"，主张"有教无类"。其言行被弟子辑录为《论语》，对中华文化与东亚文明影响逾两千年。',
    hint: '春秋·鲁国·儒家'
  },
  '老子': {
    answer: '老子（约公元前 571 年—约公元前 471 年），姓李名耳，字聃，春秋时期楚国（今河南鹿邑）人，道家学派创始人，世界百位历史文化名人之一。其代表作《道德经》（又称《老子》）仅 5,000 余字，却被译成近百种语言，是全球发行量仅次于《圣经》的经典。',
    hint: '春秋·楚国·道家'
  },
  '庄子': {
    answer: '庄子（约公元前 369 年—约公元前 286 年），名周，战国时期宋国蒙（今河南商丘或安徽蒙城）人，道家学派代表人物，与老子并称"老庄"。代表作《庄子》（又称《南华经》）以寓言著称，"庄周梦蝶""庖丁解牛""鱼之乐"等典故广为流传。',
    hint: '战国·宋国·道家'
  },
  '孟子': {
    answer: '孟子（约公元前 372 年—约公元前 289 年），名轲，字子舆，战国时期邹国（今山东邹城）人，儒家学派主要代表之一，被尊为"亚圣"。核心思想包括"性善论""仁政""民贵君轻"，与孔子并称"孔孟"。',
    hint: '战国·邹国·儒家'
  },
  '释迦牟尼': {
    answer: '释迦牟尼（约公元前 565 年—约公元前 486 年），本名乔达摩·悉达多，古印度迦毗罗卫国（今属尼泊尔境内）王子，佛教的创立者。29 岁出家修行，35 岁在菩提伽耶悟道，此后 45 年间在恒河流域传法，奠定了佛教的核心理论（"四圣谛""八正道""缘起"）。',
    hint: '古印度·佛教'
  },
  '耶稣': {
    answer: '耶稣基督（约公元前 4 年—公元 30/33 年），出生于罗马帝国犹太行省伯利恒，是基督教的核心人物，被基督徒奉为神的儿子和救主。基督教相信他为了救赎人类而降生、被钉十字架、第三天复活。公元纪年即以他出生为分界。',
    hint: '公元元年·基督教'
  },
  // ===== 中国传统文化 / 节日 =====
  '春节': {
    answer: '春节（农历正月初一）是中华民族最隆重的传统节日，又称"年节""新春""岁首"，距今已有 4,000 余年历史。传统习俗包括贴春联、放鞭炮、吃年夜饭、给压岁钱、拜年走亲等；2024 年起春节被列入联合国假日。',
    hint: '农历新年'
  },
  '中秋': {
    answer: '中秋节为农历八月十五，是中国四大传统节日之一，正值三秋之半，故名"中秋"。核心习俗是赏月、吃月饼，象征阖家团圆。中秋源于上古敬月仪式，唐代正式定为节日。',
    hint: '农历八月十五'
  },
  '端午': {
    answer: '端午节为农历五月初五，又称"端阳""龙舟节"。相传战国时期楚国诗人屈原于该日投汨罗江殉国，故民间有吃粽子、赛龙舟、佩香囊、挂艾草等习俗。2009 年被列入世界非物质文化遗产。',
    hint: '农历五月初五'
  },
  // ===== 基础科学 / 技术概念 =====
  '区块链': {
    answer: '区块链（Blockchain）是一种去中心化的分布式账本技术，由按时间顺序串联的"区块"组成，每个区块包含前一个区块的哈希值，使得数据一旦写入便难以篡改。它是比特币等加密货币的底层技术，也被广泛应用于供应链溯源、数字身份、合约自动化（智能合约）等领域。',
    hint: '分布式账本'
  },
  '5g': {
    answer: '5G 是第五代移动通信技术（5th Generation），相比 4G 具备三大特性：增强移动宽带（eMBB，峰值速率可达 10 Gbps）、超可靠低时延通信（uRLLC，时延低至 1 ms）、海量机器类通信（mMTC，每平方公里支持 100 万设备）。商用场景包括自动驾驶、远程手术、工业互联网、AR/VR 等。',
    hint: '第五代移动通信'
  }
};

function tryGeneralKnowledge(question: string): KnowledgeEntry | null {
  const q = question.toLowerCase().trim();
  for (const [key, entry] of Object.entries(GENERAL_KNOWLEDGE)) {
    if (q.includes(key.toLowerCase())) {
      return entry;
    }
  }
  return null;
}

// 1. Health & Config status API
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

// 2. AI Rule Consultation & Edge Case Evaluator
app.post(['/api/ai/chat', '/api/ai-consultation'], async (req, res) => {
  const question = (req.body.question || req.body.message || '').trim();
  const { context, language = 'zh' } = req.body;
  if (!question) {
    return res.status(400).json({ error: 'Question or message is required' });
  }

  const ai = getGeminiClient();
  // Gemini 失败信息（未配置/调用失败），用于回退分支给前端准确的降级状态
  let geminiUnavailable = !ai;
  let geminiError: string | null = null;
  let geminiErrorKind: 'quota' | 'auth' | 'model' | 'timeout' | 'network' | null = null;

  // Check if query is an edge-case rule boundary question
  const isEdgeKeyword = /休渔|季节|倒闭|天灾|战乱|物物交换|欠条|赊账|没有发票|教会赠款|非官方汇率|两套账|换人|无执照/i.test(
    question
  );

  if (ai) {
    // 429 配额冷却期内：不发起注定失败的云端请求，直接走本地规则库兜底
    if (Date.now() < geminiQuotaCooldownUntil) {
      geminiUnavailable = true;
      geminiErrorKind = 'quota';
      geminiError = 'Gemini 免费配额冷却中，已切换本地规则库回答';
    } else {
      try {
      // 通用助手系统提示词：既能回答任何问题，也能在涉及本平台规则时给出专业解答
      const systemInstruction = `
你是一个友善、博学、乐于助人的通用 AI 助手，服务于"商业宣教财务测算"平台（BAM 平台，全球海外小微商业自测评分工具）。
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

      const replyText = await generateGeminiContent(
        `用户提问: "${question}"\n用户界面语言: ${language}\n当前上下文: ${JSON.stringify(context || {})}`,
        systemInstruction
      );

      try {
        const parsed = JSON.parse(replyText);
        const answerText = parsed.answer || replyText;
        if (!answerText.trim()) {
          throw new Error('Gemini returned empty answer');
        }
        return res.json({
          reply: answerText,
          aiResponse: answerText,
          answer: answerText,
          aiMode: 'gemini',
          confidence: parsed.confidence || (isEdgeKeyword ? 'LOW_EDGE_CASE' : 'HIGH'),
          isEdgeCase: parsed.isEdgeCase ?? isEdgeKeyword,
          category: parsed.category || 'AI 智能答疑',
          suggestedAction: parsed.suggestedAction || '',
          bigDataBenchmark: parsed.bigDataBenchmark || '',
          conservativePaths: parsed.conservativePaths || [],
          geminiUnavailable: false,
          geminiError: null,
          geminiErrorKind: null
        });
      } catch {
        // Gemini 返回的不是合法 JSON，回退到纯文本模式
        return res.json({
          reply: replyText,
          aiResponse: replyText,
          answer: replyText,
          aiMode: 'gemini',
          confidence: isEdgeKeyword ? 'LOW_EDGE_CASE' : 'HIGH',
          isEdgeCase: isEdgeKeyword,
          category: 'AI 智能答疑',
          suggestedAction: '',
          bigDataBenchmark: '',
          conservativePaths: [],
          geminiUnavailable: false,
          geminiError: null,
          geminiErrorKind: null
        });
      }
    } catch (err: any) {
      // Gemini 调用失败：标记降级状态，让流程继续走到本地规则库兜底
      console.warn('Gemini API request failed, falling back to smart big-data rule engine:', err?.message || err);
      geminiUnavailable = true;
      const errMsg = (err?.message || String(err) || '').slice(0, 200);
      geminiError = errMsg;
      if (/429|RESOURCE_EXHAUSTED|quota|Quota/i.test(errMsg)) {
        geminiErrorKind = 'quota';
        geminiQuotaCooldownUntil = Date.now() + GEMINI_QUOTA_COOLDOWN_MS;
      } else if (/401|403|api key|permission|unauthorized/i.test(errMsg)) {
        geminiErrorKind = 'auth';
      } else if (/404|no longer available|not found|does not support/i.test(errMsg)) {
        geminiErrorKind = 'model';
      } else if (/timed out|timeout/i.test(errMsg)) {
        geminiErrorKind = 'timeout';
      } else {
        geminiErrorKind = 'network';
      }
    }
    }
  }

  // ============ 走到这里说明 Gemini 不可用或失败，下面是本地兜底引擎 ============

    // Smart Big-Data Knowledge Engine (Deterministic Fallback)
    let fallbackReply = '';
    let isEdgeCase = isEdgeKeyword;
    let category = '小微经验填报与大数据解析';
    let suggestedAction = '规则清晰，可放心填报';
    let bigDataBenchmark = '';
    let paths: any[] | undefined = undefined;

    const lowerQ = question.toLowerCase();

    // ============ 0. 通用常识意图（问候 / 致谢 / 身份 / 时间 / 计算 / 币种换算）============
    // 纯问候（整句只有问候才命中，避免吞掉后面的真实问题）
    if (/^(你好|您好|哈喽|嗨|早上好|下午好|晚上好|hello|hi|hey|good morning|good afternoon|good evening)[，。!！~\s]*$/i.test(question.trim())) {
      category = '日常问候';
      suggestedAction = '';
      bigDataBenchmark = '';
      fallbackReply = `【👋 您好！很高兴见到您！】

我是本平台的 AI 智能答疑助手，可以为您解答：

1️⃣ 商业财务大白话：经营月均总流水、进货成本/毛利、房租人工固定开销、应急备用金、自报汇率、凭证同权等填报概念；
2️⃣ 行业大数据基准：各行业平均流水、毛利率、净利润率与抗风险安全线；
3️⃣ 实用小工具：简单的加减乘除计算、主流币种换算、日期时间等；
4️⃣ 生活与技术小知识。

直接输入您的问题，我会立刻为您解答！`;
    }
    // 致谢
    else if (/^(谢谢|感谢|多谢|谢谢您|感谢您|thanks|thank you|thx|thankyou)[，。!！~\s]*$/i.test(question.trim())) {
      category = '日常致谢';
      suggestedAction = '';
      bigDataBenchmark = '';
      fallbackReply = `【🙏 不客气！】

很高兴能帮到您！如果还有其他问题（无论是本平台的填报/评分，还是日常实用知识），随时继续问我。祝您生意兴隆，稳健发展！`;
    }
    // 身份 / 能力
    else if (/^(你是谁|你是什么|你能做什么|你能干什么|你有哪些功能|你的功能|what are you|who are you|what can you do|your capabilit)/i.test(question.trim())) {
      category = '助手自我介绍';
      suggestedAction = '';
      bigDataBenchmark = '';
      fallbackReply = `【🤖 我是 AI 智能答疑助手】

我可以帮您：

1️⃣ 商业财务大白话解析：经营月均总流水、进货成本（COGS）、毛利、房租人工固定开销（OPEX）、应急备用金/现金跑道、自报汇率、凭证同权规则等；
2️⃣ 行业大数据基准对标：餐饮、零售、外贸、生活服务、工坊、农业等行业平均流水与利润基准；
3️⃣ 实用小工具：币种换算、简单计算、日期时间等；
4️⃣ 平台规则指引：5 维雷达打分公式、4 大门槛红线（Gate 红线）与边缘疑难情况的保守填报路径。

特别说明：本平台提问 100% 匿名、绝不计入任何评分。配置 GEMINI_API_KEY 后，我可以升级为回答任何问题的通用 AI。`;
    }
    // 日期 / 时间
    else if (/现在几点了?|当前时间|现在时间|今天几号|今天是几号|今天星期几|what time|what day|todays date/i.test(question)) {
      const now = new Date();
      const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
      category = '日期时间';
      suggestedAction = '';
      bigDataBenchmark = '';
      fallbackReply = `【🕐 当前日期与时间】
今天是 ${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日（星期${weekdays[now.getDay()]}）
服务器当前时间：${now.toLocaleTimeString('zh-CN', { hour12: false })}`;
    }
    // 简单算术（支持 + - * / × ÷ 及中文"加/减/乘/除以"，带计算意图词避免误伤"2026/08"）
    else if (
      /计算|等于多少|是多少|算一下|加减乘除|几加几|几减几|几乘几|几除以几/.test(question) &&
      /(\d+(?:\.\d+)?)\s*(乘以|乘于|乘|除以|加|减|加上|减去|\+|\-|−|×|÷|\*|\/|／)\s*(\d+(?:\.\d+)?)/.test(question)
    ) {
      const m = question.match(
        /(\d+(?:\.\d+)?)\s*(乘以|乘于|乘|除以|加|减|加上|减去|\+|\-|−|×|÷|\*|\/|／)\s*(\d+(?:\.\d+)?)/
      );
      if (m) {
        const a = parseFloat(m[1]);
        const opRaw = m[2];
        const b = parseFloat(m[3]);
        let opSymbol = opRaw;
        if (opRaw === '加' || opRaw === '加上') opSymbol = '+';
        else if (opRaw === '减' || opRaw === '减去' || opRaw === '−') opSymbol = '-';
        else if (opRaw === '乘' || opRaw === '乘以' || opRaw === '乘于' || opRaw === '*') opSymbol = '×';
        else if (opRaw === '除以' || opRaw === '/' || opRaw === '／') opSymbol = '÷';
        let result: number | null = null;
        if (opSymbol === '+') result = a + b;
        else if (opSymbol === '-') result = a - b;
        else if (opSymbol === '×') result = a * b;
        else if (opSymbol === '÷') result = b === 0 ? null : a / b;
        if (result !== null) {
          category = '实用计算';
          suggestedAction = '';
          bigDataBenchmark = '';
          fallbackReply = `【🧮 快速计算】
${a} ${opSymbol} ${b} = ${Number.isInteger(result) ? result : result.toFixed(2)}`;
        }
      }
    }
    // 币种换算（如：100美元等于多少人民币）
    else if (tryCurrencyConversion(question)) {
      category = '币种换算';
      suggestedAction = '';
      bigDataBenchmark = '';
      fallbackReply = tryCurrencyConversion(question)!;
    }
    // 通用常识知识库（地名/人物/概念等）：本地兜底，让 AI 不可用时也能答出常见问题
    else if (tryGeneralKnowledge(question)) {
      const entry = tryGeneralKnowledge(question)!;
      category = '通用常识';
      suggestedAction = '';
      bigDataBenchmark = '';
      const hintLine = entry.hint ? `\n🏷️ ${entry.hint}\n` : '';
      fallbackReply = `【📚 通用常识 · 本地知识库】

关于「${question}」：${hintLine}
${entry.answer}

📌 说明：以上为本地知识库内置回答，覆盖面有限。如需深度专业解答，请在 .env 配置 GEMINI_API_KEY 后重启开发服务器，云端 AI 可回答任何问题。`;
    }
    // 保本点 / 盈亏平衡（一个月最少赚多少才不亏）
    else if (/保本|不亏|盈亏平衡|赚多少才不亏|最少赚多少|月流水多少才不亏|breakeven|break-even/i.test(question)) {
      category = '保本点与盈亏平衡测算';
      suggestedAction = '月度保本流水 = 每月固定开销 ÷ 毛利率，低于该数即当月亏损';
      bigDataBenchmark = '多数小微店铺保本流水约为月均总流水的 55%~70%，高于 85% 极易亏损。';
      fallbackReply = `【🧮 保本点（盈亏平衡）大白话】

1. 怎么算：保本月流水 = 每月固定开销（房租+工资+水电） ÷ 毛利率。
举例：房租工资水电每月共 15,000，毛利率 60%，则保本流水 = 15,000 ÷ 0.6 = 25,000 元/月。只要当月营业额超过 25,000，就进入赚钱区。

2. 📊 大数据警戒：
• 实际月流水 ÷ 保本流水 < 1.1：危险区，稍有波动即亏损；
• 1.1 ~ 1.5：正常波动区；
• > 1.5：安全稳健，具备真实造血能力。`;
    }
    // 同工工资怎么定
    else if (/同工|工资怎么定|员工工资|薪资|人工成本占比|底薪多少|pay|salary/i.test(question)) {
      category = '同工薪酬与人工成本占比';
      suggestedAction = '人工总成本建议控制在月流水的 15%~30% 之间，同工同酬一视同仁';
      bigDataBenchmark = '全球小微样本中，人工成本占月流水 15%~30% 为健康区间，超过 40% 需警惕。';
      fallbackReply = `【👥 同工工资怎么定？】

1. 定价三原则：
• 同工同酬：相同岗位与工作量，本地员工与外派同工一律同标准，既是道德要求也避免合规风险；
• 可负担性：全部员工工资总和 ≤ 月流水 30%（含社保/补贴），超过 40% 就会挤压利润；
• 区域参照：参考当地同业 25% 分位～中位数工资，留住人又不压垮店铺。

2. 示例（月流水 50,000）：
• 两名全职员工：各 5,000~6,000/月，合计 10,000~12,000（占 20%~24%）为健康区间；
• 再加一名兼职：3,000/月，合计仍应控制在 15,000（30%）以内。`;
    }
    // 启动资金大概要多少
    else if (/启动资金|开店要多少钱|前期投入|初始投入|多少钱能开|startup|initial investment/i.test(question)) {
      category = '启动资金评估';
      suggestedAction = '启动资金建议 = 一次性开办投入 + 至少 3 个月固定开销备用金';
      bigDataBenchmark = '小微创业前 6 个月存活率约 50%，启动资金必须覆盖 3~6 个月固定开销。';
      fallbackReply = `【💰 启动资金大概要多少？】

1. 公式：启动资金 = 一次性开办投入（装修设备首批进货） + 3~6 个月固定开销备用金。

2. 分行业参考（美元/月流水量级）：
• 街头小吃/茶饮摊：500~2,000
• 社区小店/杂货铺：2,000~8,000
• 餐饮/烘焙店：5,000~20,000
• 生活服务（美发/维修）：3,000~10,000
• 小型工坊：5,000~25,000

3. 关键提醒：宁可少买设备，也要留足 3 个月房租工资。现金断流是小微创业失败的第一大原因。`;
    }

    // 1. Term: 流水 vs 收入 / 营业额 (The exact question from user)
    // 注意：必须用 else if 接在通用意图链后面，否则通用意图命中后会被下面链的兜底 else 覆盖
    else if (/流水|营业额|总进账|是收入还是|营业收入|做买卖收的钱|总销售/i.test(question)) {
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
      category = '通用智能问答';
      suggestedAction = '';
      bigDataBenchmark = '';
      fallbackReply = `【🤖 通用 AI 助手 · 本地规则引擎模式】

关于您咨询的：「${question}」

📌 两个建议方向：
1️⃣ 如果是本平台的【填报与评分】问题（流水、毛利、OPEX、备用金、汇率、凭证、季节/休渔等边缘情况），请直接追问相关关键词，我会用大白话 + 行业大数据为您详解；
2️⃣ 如果是【生活常识 / 实用知识 / 简单计算 / 币种换算】，您也可以直接问，我能覆盖常见场景。

⚠️ 关于"能回答任何问题"：
当前云端 Gemini AI 服务暂时不可用（网络/额度/区域限制），本次回答由内置本地规则库提供，覆盖面有限。请稍后点击右上角的【重新提问】重试，或换个问法咨询平台规则类问题，即可获得行业大数据基准解析。

📍 本平台快捷入口：
• 【公开评分标准】可查看完整 5 维雷达打分公式与 4 大门槛红线；
• 【行业大数据基准】可查看各行业平均流水、毛利率与安全线。`;
    }

    return res.json({
      reply: fallbackReply,
      aiResponse: fallbackReply,
      answer: fallbackReply,
      aiMode: 'rules',
      confidence: isEdgeCase ? 'LOW_EDGE_CASE' : 'HIGH',
      isEdgeCase,
      category,
      suggestedAction,
      bigDataBenchmark,
      conservativePaths: paths,
      geminiUnavailable,
      geminiError,
      geminiErrorKind
    });
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

        const replyText = await generateGeminiContent(
          `项目/店铺名称: "${projectName}"\n用户当前选择的行业: "${currentIndustry}"\n当前币种: "${baseCurrency}"`,
          systemInstruction
        );

        const parsed = JSON.parse(replyText || '{}');
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
    let displayName = '综合助贫 / 社会企业';
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
      displayName = '医疗健康 / 爱心义诊所';
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
      displayName = '餐饮烘焙 / 社区咖啡';
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
      displayName = '语言教育 / 辅导中心';
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
      displayName = '职业实训 / 手工工坊';
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
      displayName = '社区零售 / 平价商超';
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
      displayName = '现代农业 / 生态种植';
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
      displayName = '儿童日托 / 社区启蒙';
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
      displayName = '美容美发 / 社区生活服务';
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
      displayName = '定制实体 / 小微商业';
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

        const replyText = await generateGeminiContent(
          `商业项目数据：${JSON.stringify({
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
          systemInstruction
        );

        const parsed = JSON.parse(replyText || '{}');
        // 空诊断结果同样回退本地引擎，避免报告页出现空白的 AI 诊断区
        if (!parsed || (!parsed.summaryHeadline && !parsed.plainExplanation)) {
          throw new Error('Gemini deep diagnosis returned empty result');
        }
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
  // Vite middleware for development (only used by `npm run dev` locally)
  if (process.env.NODE_ENV !== 'production') {
    // 仅在本地 dev 运行时才动态引入 vite，避免 serverless（Vercel）打包时把整个 Vite 打进函数
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    // 生产环境非 Vercel 部署（如自有服务器 / Railway / Render）下，
    // 由本进程托管前端静态资源。Vercel 部署时由 Vercel 自身的静态资源服务负责，
    // 这里必须跳过，否则 rewrites 会冲突、404 出现。
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

// 仅在直接运行（本地 `npm run dev` / `npm start`）时启动监听。
// Vercel / 其他 serverless 平台通过 import 此模块拿到 `app` 即可，禁止在此启动监听。
// 注意：不能用 import.meta.url 判断，因为 esbuild 打包为 CJS 时 import.meta.url 会被替换为空字符串，
// 会导致 `node dist/server.cjs` 启动失败。改用 VERCEL 环境变量判断是最稳妥的方式：
// - Vercel 部署时 VERCEL=1，跳过监听
// - 本地任何方式启动都未设置 VERCEL，正常监听
const isDirectRun = !process.env.VERCEL;

if (isDirectRun) {
  startServer();
}

// Vercel serverless function 入口会 `import app from './server'`
export default app;
