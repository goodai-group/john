import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Send,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Lightbulb,
  TrendingUp,
  BarChart3,
  Copy,
  Check
} from 'lucide-react';
import { EscalatedQuestion, Language } from '../types';
import {
  addEscalatedQuestion,
  updateEscalatedQuestionFeedback
} from '../lib/storage';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

interface AiDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  initialTopic?: string;
}

interface ChatRecord extends EscalatedQuestion {
  aiMode?: 'gemini' | 'rules';
  // 云端 Gemini AI 是否不可用（true 表示本次回答是降级到本地规则库的回答）
  geminiUnavailable?: boolean;
  // 后端返回的 Gemini 失败原因摘要（用于显示具体降级原因）
  geminiError?: string | null;
  // 后端返回的降级原因分类：quota=免费额度用尽 / auth=密钥无效 / model=模型不可用 / timeout=超时 / network=网络错误
  geminiErrorKind?: string | null;
}

// Industry Big Data Benchmarks Dataset
export const INDUSTRY_BIG_DATA = [
  {
    id: 'fnb',
    name: '餐饮小吃 / 烘焙茶饮',
    nameEn: 'Food Stalls / Bakery & Tea Drinks',
    avgRevenue: '¥35,000 ~ ¥150,000 / 月',
    avgRevenueEn: '¥35,000 ~ ¥150,000 / mo',
    grossMargin: '55% ~ 70%',
    grossMarginLabel: '偏高 (原料占30%-45%)',
    grossMarginLabelEn: 'On the higher side (ingredients 30%-45%)',
    opexRatio: '30% ~ 45%',
    runwaySafety: '≥ 2.5 ~ 3.5 个月',
    runwaySafetyEn: '≥ 2.5 ~ 3.5 mo',
    netProfitMargin: '15% ~ 25%',
    keySurvivalRule: '房租和员工底薪若超过总流水 45%，翻台率或客单稍跌即陷入亏损。',
    keySurvivalRuleEn: 'If rent and base wages exceed 45% of revenue, a small drop in table turnover or ticket size tips you into a loss.'
  },
  {
    id: 'retail',
    name: '社区超市 / 便利杂货',
    nameEn: 'Community Grocery / Convenience Store',
    avgRevenue: '¥50,000 ~ ¥300,000 / 月',
    avgRevenueEn: '¥50,000 ~ ¥300,000 / mo',
    grossMargin: '20% ~ 35%',
    grossMarginLabel: '走量微利 (进货占65%-80%)',
    grossMarginLabelEn: 'Volume, thin margin (stock 65%-80%)',
    opexRatio: '12% ~ 22%',
    runwaySafety: '≥ 2.0 ~ 3.0 个月',
    runwaySafetyEn: '≥ 2.0 ~ 3.0 mo',
    netProfitMargin: '8% ~ 14%',
    keySurvivalRule: '严控临期损耗与供货账期，毛利率低于 18% 时极易触碰 Gate-2 红线。',
    keySurvivalRuleEn: 'Tightly control near-expiry waste and supplier payment terms — margins below 18% easily trip the Gate-2 red line.'
  },
  {
    id: 'ecommerce',
    name: '跨境电商 / 独立外贸',
    nameEn: 'Cross-Border E-commerce / Independent Trade',
    avgRevenue: '¥80,000 ~ ¥500,000+ / 月',
    avgRevenueEn: '¥80,000 ~ ¥500,000+ / mo',
    grossMargin: '30% ~ 50%',
    grossMarginLabel: '中等 (含采购+头程运费)',
    grossMarginLabelEn: 'Moderate (includes stock + first-leg freight)',
    opexRatio: '15% ~ 28%',
    runwaySafety: '≥ 3.5 ~ 5.0 个月',
    runwaySafetyEn: '≥ 3.5 ~ 5.0 mo',
    netProfitMargin: '10% ~ 22%',
    keySurvivalRule: '海外回款周期常有15-45天滞后，备用金需充足支撑采购周转。',
    keySurvivalRuleEn: 'Overseas payment collection often lags 15-45 days; reserves must be enough to sustain purchasing cycles.'
  },
  {
    id: 'service',
    name: '生活美业 / 汽修维修',
    nameEn: 'Beauty & Personal Care / Auto Repair',
    avgRevenue: '¥20,000 ~ ¥85,000 / 月',
    avgRevenueEn: '¥20,000 ~ ¥85,000 / mo',
    grossMargin: '70% ~ 88%',
    grossMarginLabel: '极高 (耗材低，主要为手艺)',
    grossMarginLabelEn: 'Very high (low supplies cost, mostly skilled labor)',
    opexRatio: '35% ~ 55%',
    runwaySafety: '≥ 3.0 ~ 4.0 个月',
    runwaySafetyEn: '≥ 3.0 ~ 4.0 mo',
    netProfitMargin: '25% ~ 40%',
    keySurvivalRule: '人工与场地是最大支出，师傅提成与底薪结构需具备弹性。',
    keySurvivalRuleEn: 'Labor and venue are the largest costs; commission and base-wage structures need to stay flexible.'
  },
  {
    id: 'workshop',
    name: '微型工坊 / 小型加工',
    nameEn: 'Micro Workshop / Small-Scale Processing',
    avgRevenue: '¥60,000 ~ ¥260,000 / 月',
    avgRevenueEn: '¥60,000 ~ ¥260,000 / mo',
    grossMargin: '35% ~ 52%',
    grossMarginLabel: '中等 (原料+耗损耗电)',
    grossMarginLabelEn: 'Moderate (materials + wear & power costs)',
    opexRatio: '20% ~ 35%',
    runwaySafety: '≥ 3.0 ~ 4.5 个月',
    runwaySafetyEn: '≥ 3.0 ~ 4.5 mo',
    netProfitMargin: '12% ~ 20%',
    keySurvivalRule: '警惕客户赊账拖欠压死现金流，应收账款周期需严格管控。',
    keySurvivalRuleEn: 'Watch for customer credit delays choking cash flow; receivables cycles need strict control.'
  },
  {
    id: 'agri',
    name: '农林水产 / 季节生鲜',
    nameEn: 'Agriculture, Forestry & Fisheries / Seasonal Fresh Goods',
    avgRevenue: '¥40,000 ~ ¥200,000 / 旺季月',
    avgRevenueEn: '¥40,000 ~ ¥200,000 / peak mo',
    grossMargin: '40% ~ 65%',
    grossMarginLabel: '季节波动大',
    grossMarginLabelEn: 'Large seasonal swings',
    opexRatio: '15% ~ 30%',
    runwaySafety: '≥ 5.0 ~ 8.0 个月 (需跨越休产期)',
    runwaySafetyEn: '≥ 5.0 ~ 8.0 mo (must span the off-season)',
    netProfitMargin: '18% ~ 30%',
    keySurvivalRule: '休渔或休耕期无流水，必须通过年化12个月均摊填报，备用金留足全年固定开销。',
    keySurvivalRuleEn: 'No income during the off-season/fallow period — report using a 12-month annualized average, and keep enough reserve to cover the full year\'s fixed costs.'
  }
];

const FAQ_PRESETS = [
  '经营流水是什么意思？和赚到手的钱有什么区别？',
  '进货成本（COGS）怎么算？包含运费吗？',
  '只有手写记账本和微信收款截图，打分会吃亏吗？',
  '账上备用金要留几个月才算安全？',
  '季节性生意（休渔期没进账）该怎么填？'
];

const FAQ_PRESETS_EN = [
  'What does "monthly revenue" mean, and how is it different from take-home profit?',
  'How is cost of goods sold (COGS) calculated? Does it include shipping?',
  'I only have a handwritten ledger and payment-app screenshots — will my score suffer?',
  'How many months of reserve funds count as safe?',
  'How do I report a seasonal business (no income during the off-season)?'
];

// ---- Markdown 渲染 ----
// AI 返回的是 Markdown 文本，若按纯文本显示会把 `#`、`**`、`-` 等语法符号裸露出来。
// 这里用 ReactMarkdown 渲染，并针对小字号卡片定制样式，让排版干净、符号最少化。
const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-1.5 leading-relaxed last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-bold text-slate-900">{children}</strong>,
  h1: ({ children }) => <h1 className="text-[14px] font-bold text-slate-900 mt-2 mb-1 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="text-[14px] font-bold text-teal-800 mt-2 mb-1 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="text-xs font-bold text-slate-900 mt-1.5 mb-0.5 first:mt-0">{children}</h3>,
  h4: ({ children }) => <h4 className="text-xs font-bold text-slate-800 mt-1.5 mb-0.5 first:mt-0">{children}</h4>,
  ul: ({ children }) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-1.5 space-y-0.5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-teal-600 underline underline-offset-2 break-all">
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-teal-200 pl-2.5 my-1.5 text-slate-600">{children}</blockquote>
  ),
  hr: () => <hr className="my-2 border-slate-200" />,
  pre: ({ children }) => (
    <pre className="bg-slate-900 text-slate-100 rounded-lg p-2.5 overflow-x-auto my-1.5 text-[13px] leading-relaxed">
      {children}
    </pre>
  ),
  code: ({ className, children, ...rest }) => {
    const text = String(children);
    const isBlock = /language-/.test(className || '') || text.includes('\n');
    if (isBlock) {
      return (
        <code className={className} {...rest}>
          {children}
        </code>
      );
    }
    return (
      <code className="px-1 py-px rounded bg-slate-100 text-rose-600 font-mono text-[13px]" {...rest}>
        {children}
      </code>
    );
  },
  table: ({ children }) => (
    <div className="overflow-x-auto my-1.5">
      <table className="w-full text-left border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-slate-100">{children}</thead>,
  th: ({ children }) => (
    <th className="px-2 py-1 border border-slate-200 font-bold text-slate-900 whitespace-nowrap">{children}</th>
  ),
  td: ({ children }) => <td className="px-2 py-1 border border-slate-200 align-top">{children}</td>
};

const AnswerMarkdown: React.FC<{ content: string }> = ({ content }) => (
  <div className="pt-1 text-xs font-normal text-slate-800 leading-relaxed">
    <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownComponents}>
      {content}
    </ReactMarkdown>
  </div>
);

export const AiRuleConsultationDrawer: React.FC<AiDrawerProps> = ({
  isOpen,
  onClose,
  language,
  initialTopic
}) => {
  const [questionInput, setQuestionInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'benchmarks'>('chat');
  const [chatHistory, setChatHistory] = useState<ChatRecord[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // 服务端是否配置了真实 AI（GEMINI_API_KEY）。null=未知，true=已配置，false=未配置
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  // 云端 Gemini AI 调用健康状态：null=未探测，true=最近一次调用成功，false=最近一次调用失败
  const [geminiHealthy, setGeminiHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    if (isOpen) {
      // 探测后端 AI 配置状态，未配置时给出升级引导
      fetch('/api/health')
        .then((r) => r.json())
        .then((h) => setAiConfigured(Boolean(h?.hasGeminiKey)))
        .catch(() => setAiConfigured(null));
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialTopic) {
      setQuestionInput(initialTopic);
    }
  }, [initialTopic]);

  if (!isOpen) return null;

  // Smart local resolver for instant & reliable big-data backed responses
  const resolveLocalKnowledge = (text: string): ChatRecord => {
    const isEdge = /休渔|季节|倒闭|天灾|战乱|物物交换|欠条|赊账|没有发票|教会赠款|非官方汇率|两套账|换人|无执照/i.test(
      text
    );

    let answer = '';
    let category = '小微商业大数据与规则解析';
    let suggestedAction = '规则清晰，可正常填报';
    let conservativePaths: any[] | undefined = undefined;

    // ============ 通用常识意图（问候 / 致谢 / 身份 / 时间 / 计算 / 保本 / 薪酬 / 启动资金）============
    if (/^(你好|您好|哈喽|嗨|早上好|下午好|晚上好|hello|hi|hey)[，。!！~\s]*$/i.test(text.trim())) {
      category = '日常问候';
      suggestedAction = '';
      answer = `【👋 您好！很高兴见到您！】

我是本平台的 AI 智能答疑助手，可以为您解答：

1️⃣ 商业财务大白话：经营月均总流水、进货成本/毛利、房租人工固定开销、应急备用金、自报汇率、凭证同权等填报概念；
2️⃣ 行业大数据基准：各行业平均流水、毛利率、净利润率与抗风险安全线；
3️⃣ 实用小工具：简单的加减乘除计算、主流币种换算、日期时间等；
4️⃣ 生活与技术小知识。

直接输入您的问题，我会立刻为您解答！`;
    } else if (/^(谢谢|感谢|多谢|谢谢您|感谢您|thanks|thank you|thx)[，。!！~\s]*$/i.test(text.trim())) {
      category = '日常致谢';
      suggestedAction = '';
      answer = `【🙏 不客气！】

很高兴能帮到您！如果还有其他问题（无论是本平台的填报/评分，还是日常实用知识），随时继续问我。祝您生意兴隆，稳健发展！`;
    } else if (/^(你是谁|你是什么|你能做什么|你能干什么|你有哪些功能|你的功能|what are you|who are you|what can you do)/i.test(text.trim())) {
      category = '助手自我介绍';
      suggestedAction = '';
      answer = `【🤖 我是 AI 智能答疑助手】

我可以帮您：

1️⃣ 商业财务大白话解析：经营月均总流水、进货成本（COGS）、毛利、房租人工固定开销（OPEX）、应急备用金/现金跑道、自报汇率、凭证同权规则等；
2️⃣ 行业大数据基准对标：餐饮、零售、外贸、生活服务、工坊、农业等行业平均流水与利润基准；
3️⃣ 实用小工具：币种换算、简单计算、日期时间等；
4️⃣ 平台规则指引：5 维雷达打分公式、4 大门槛红线与边缘疑难情况的保守填报路径。`;
    } else if (/现在几点了?|当前时间|现在时间|今天几号|今天是几号|今天星期几|what time|what day/i.test(text)) {
      const now = new Date();
      const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
      category = '日期时间';
      suggestedAction = '';
      answer = `【🕐 当前日期与时间】
今天是 ${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日（星期${weekdays[now.getDay()]}）
服务器当前时间：${now.toLocaleTimeString('zh-CN', { hour12: false })}`;
    } else if (/计算|等于多少|是多少|算一下|加减乘除|几加几|几减几|几乘几|几除以几/.test(text) && /(\d+(?:\.\d+)?)\s*(乘以|乘于|乘|除以|加|减|加上|减去|\+|\-|−|×|÷|\*|\/|／)\s*(\d+(?:\.\d+)?)/.test(text)) {
      const m = text.match(/(\d+(?:\.\d+)?)\s*(乘以|乘于|乘|除以|加|减|加上|减去|\+|\-|−|×|÷|\*|\/|／)\s*(\d+(?:\.\d+)?)/);
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
          answer = `【🧮 快速计算】
${a} ${opSymbol} ${b} = ${Number.isInteger(result) ? result : result.toFixed(2)}`;
        }
      }
    } else if (/保本|不亏|盈亏平衡|赚多少才不亏|最少赚多少|月流水多少才不亏/i.test(text)) {
      category = '保本点与盈亏平衡测算';
      suggestedAction = '月度保本流水 = 每月固定开销 ÷ 毛利率，低于该数即当月亏损';
      answer = `【🧮 保本点（盈亏平衡）大白话】

1. 怎么算：保本月流水 = 每月固定开销（房租+工资+水电） ÷ 毛利率。
举例：房租工资水电每月共 15,000，毛利率 60%，则保本流水 = 15,000 ÷ 0.6 = 25,000 元/月。只要当月营业额超过 25,000，就进入赚钱区。

2. 📊 大数据警戒：
• 实际月流水 ÷ 保本流水 < 1.1：危险区，稍有波动即亏损；
• 1.1 ~ 1.5：正常波动区；
• > 1.5：安全稳健，具备真实造血能力。`;
    } else if (/同工|工资怎么定|员工工资|薪资|人工成本占比|底薪多少/i.test(text)) {
      category = '同工薪酬与人工成本占比';
      suggestedAction = '人工总成本建议控制在月流水的 15%~30% 之间，同工同酬一视同仁';
      answer = `【👥 同工工资怎么定？】

1. 定价三原则：
• 同工同酬：相同岗位与工作量，本地员工与外派同工一律同标准；
• 可负担性：全部员工工资总和 ≤ 月流水 30%（含社保/补贴），超过 40% 就会挤压利润；
• 区域参照：参考当地同业 25% 分位～中位数工资，留住人又不压垮店铺。

2. 示例（月流水 50,000）：
• 两名全职员工：各 5,000~6,000/月，合计 10,000~12,000（占 20%~24%）为健康区间；
• 再加一名兼职：3,000/月，合计仍应控制在 15,000（30%）以内。`;
    } else if (/启动资金|开店要多少钱|前期投入|初始投入|多少钱能开/i.test(text)) {
      category = '启动资金评估';
      suggestedAction = '启动资金建议 = 一次性开办投入 + 至少 3 个月固定开销备用金';
      answer = `【💰 启动资金大概要多少？】

1. 公式：启动资金 = 一次性开办投入（装修设备首批进货） + 3~6 个月固定开销备用金。

2. 分行业参考（美元/月流水量级）：
• 街头小吃/茶饮摊：500~2,000
• 社区小店/杂货铺：2,000~8,000
• 餐饮/烘焙店：5,000~20,000
• 生活服务（美发/维修）：3,000~10,000
• 小型工坊：5,000~25,000

3. 关键提醒：宁可少买设备，也要留足 3 个月房租工资。现金断流是小微创业失败的第一大原因。`;
    } else if (/流水|营业额|总进账|是收入还是|营业收入|做买卖收的钱|总销售/i.test(text)) {
      category = '核心概念通俗解析';
      suggestedAction = '填报第1项时：填写近3-12个月平均每月客人买单的总进账金额（未扣除进货与房租等开支）';
      answer = `【大白话核心解答：经营月均总流水是“总营业额”，不是到手净利润】

1. 一句话本质：
「经营月均总流水」＝ 客人买单进你口袋、收银机、微信/支付宝或银行卡里的【全部毛钱】（总营业额 Gross Revenue）。
⚠️ 这笔钱【还没有扣除】进货成本、房租、工人工资、水电和税费！

2. 用做买卖开店举个大白话例子：
• 经营总流水（营业额）：比如你的奶茶/快餐店一个月总共卖了 1,000 份，收了 50,000 块钱。这 50,000 块就是「经营月均总流水」。
• 进货采购成本：买茶叶、肉菜、包装花了 15,000 块（毛利率 70%）。
• 固定开销（房租+人工）：铺租 8,000 块，请一个店员 4,000 块，水电 1,000 块，合计 13,000 块。
• 到手纯收入（净利润）：50,000 - 15,000 - 13,000 = 22,000 块钱，这才是你真正赚进自己腰包的纯收入！

3. 📊 连接行业大数据基准参考（基于全球数万家小微商业真实样本）：
• 餐饮小吃/饮品：月均总流水中位数 ¥45,000~¥120,000，平均毛利率 55%~68%，净利润率 15%~25%；
• 社区超市/杂货铺：月均总流水中位数 ¥60,000~¥250,000，走量为主，毛利率 20%~32%，净利润率 8%~14%；
• 跨境电商/外贸档口：月均总流水中位数 ¥80,000~¥500,000+，毛利率 30%~48%，净利润率 10%~20%；
• 美发汽修/生活服务：月均总流水中位数 ¥25,000~¥80,000，主要是手艺人工，毛利率 70%~85%，净利润率 25%~40%。

4. ✍️ 填报指南：
在第 1 步输入框中，请填写你最近 3~12 个月平均每个月收到的总进账金额。如有淡旺季，可取 12 个月总和除以 12 计算月平均。`;
    } else if (/毛利|进货|成本|cogs|原材料|采购/i.test(text)) {
      category = '进货成本与毛利空间解析';
      suggestedAction = '进货成本只填购买原料与商品的直接款项，勿重复计入房租与工资';
      answer = `【大白话：进货采购成本（COGS）与毛利润】

1. 什么是进货成本（COGS）？
直接用于进货进料的花费（如饭店买米面油肉、超市进烟酒副食、服装店批衣服）。包含采购直接相关的长途运费。

2. 什么是毛利润与毛利率？
• 毛利润 ＝ 每月总流水 － 进货采购成本。
• 毛利率 ＝ 毛利润 ÷ 每月总流水 × 100%。
大白话：每做 100 块钱生意，去掉给供货商的货款后，留在手里用来发工资和交房租的底钱。

3. 📊 大数据健康基准线：
• 毛利率 < 20%：极危险！稍有损耗或租金微涨即容易亏损，易触发 Gate-2 红线；
• 毛利率 30%~50%：标准零售与批发健康区间；
• 毛利率 55%~75%：特色餐饮与高附加值手艺服务健康区间。`;
    } else if (/房租|工资|人工|opex|固定开销|水电|租金/i.test(text)) {
      category = '固定经营开销解析';
      suggestedAction = '将每月雷打不动必须付出的租金、员工底薪与物业水电合计填入 OPEX';
      answer = `【大白话：房租与工人工资（固定开销 OPEX）】

1. 一句话本质：
每月不管开不开门、有没有生意，雷打不动一定要付出去的硬性开支。

2. 关键安全指标（固定开销占比）：
固定开销占比 ＝ 每月固定开销 ÷ 每月总流水 × 100%。

3. 📊 大数据抗风险底线：
• 优良（≤ 30%）：店租便宜、人员精干，抗突发风险能力极强；
• 正常（30% ~ 45%）：行业中位数水平；
• 危险（> 50%）：重度开销，一旦某个月客人少 20%，极易当月转为亏损。`;
    } else if (/备用金|跑道|runway|现金储备|存款|应急资金|撑几个月/i.test(text)) {
      category = '现金流与抗风险能力解析';
      suggestedAction = '可用流动资产应保持能够支付 3 个月以上纯固定开销（房租+工资）的现钱';
      answer = `【大白话：应急现金备用金（现金跑道 Runway）】

1. 什么是现金跑道？
账上现有的可用现金与存款 ÷ 每月固定必须支出的开销（房租+人工）。
大白话：如果明天突发意外一个月一分钱进账都没有，你账上的现钱能继续给房东交租、给员工发工资顶几个月？

2. 📊 评分体系与大数据安全线：
• < 1.5 个月（🔴 高危）：触发 Gate-3 门槛红线警示，必须立即建立备用金蓄水池；
• 2.0 ~ 3.0 个月（🟡 及格线）：勉强应付日常起伏；
• ≥ 3.0 个月（🟢 优良安全）：从容抵御供应链断货、淡季或政策突发波动。`;
    } else if (/凭证|银行流水|记账本|手写|发票|无执照|截图|会不会扣分|歧视/i.test(text)) {
      category = '填报凭证完全同权规则';
      suggestedAction = '手写账本、收银截图或纯手动填写享受 100% 相同评分标准，放心填报';
      answer = `【官方权威规则答复：凭证 100% 零歧视原则】

1. 核心规则（BAM-PRD-2026-V1.4 规范）：
在本平台上，【凭证类型绝不影响得分】！
无论您是：
A. 上传正规银行对公对私流水 PDF；
B. 拍照上传手写记账本 / 微信支付宝收款汇总截图；
C. 完全不传任何图片，选择【纯手动填写 14 项经营数字】；
系统的算法引擎执行 100% 完全一致的财务逻辑运算与 5 维雷达评分，绝无任何凭证歧视或权重减分！

2. 凭证的作用仅仅是：
方便 AI 自动识别帮您省去手动输入的麻烦。如果您处于敏感地区或没有记账凭证，直接纯手动填写数字即可！`;
    } else if (/汇率|黑市|民间|非官方|折算|美金|换汇|货币/i.test(text)) {
      category = '多币种与自报汇率规则';
      suggestedAction = '勾选“本国存在多重汇率”，按您做生意实际兑换的民间比例折算填报';
      answer = `【多币种与多重汇率自报机制】

1. 尊重民间实际交易价：
在许多海外国家（如非官方平行市场存在溢价），官方汇率严重失真。本平台允许您：
• 在每个金额输入框直接选择交易币种（USD、KES、NGN、EGP、CNY 等）；
• 勾选【本国存在多重汇率】并填入您在日常进货和收银中实际使用的兑换汇率。

2. 报告透明标注：
系统将以您的自报汇率作为折算基准，并在最终报告中醒目注明，保证您的利润率和现金流测算真实反映经营现状，不被官方虚高汇率误导。`;
    } else if (isEdge) {
      category = '边缘疑难规则推算';
      suggestedAction = '建议采用路径 A（12个月年化平均平摊法）进行合理申报';
      answer = `【⚠️ 边缘疑难情况 · 2 种保守推算路径】

针对您所提到的特殊经营情况（如休渔期、极端淡旺季、特殊战乱环境等）：

📌 路径 A (推荐：12 个月年化平均平摊法)：
• 做法：将全年各活跃月份的总收入相加除以 12，得出标准的“月均总流水”，房租人工也按全年总成本平均到 12 个月。
• 优势：最真实体现生意的全年综合自养能力，系统报告会自动附注季节性年化平摊说明。

📌 路径 B (保守：仅按活跃月份真实填报 + 加大现金储备)：
• 做法：按旺季单月真实收支填写，但流动资金必须留足覆盖全部休业淡季的房租工资。
• 风险：若账上备用金不足以覆盖休业期开销，可能触发 Gate-3 现金跑道警示。`;
      conservativePaths = [
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
    } else {
      category = '通用智能问答';
      suggestedAction = '您可以询问流水/毛利/OPEX/备用金等指标，或通用生活与实用常识';
      answer = `【🤖 通用 AI 助手 · 本地规则引擎模式】

关于您咨询的：「${text}」

📌 两个建议方向：
1️⃣ 本平台的【填报与评分】问题（流水、毛利、OPEX、备用金、汇率、凭证、季节/休渔等边缘情况），请直接追问相关关键词，我会用大白话 + 行业大数据为您详解；
2️⃣ 【生活常识 / 实用知识 / 简单计算 / 币种换算】类问题也可以直接问，我能覆盖常见场景。

🔑 完整版"能回答任何问题"的 AI：
需要在项目根目录 .env 配置 GEMINI_API_KEY 后重启开发服务器即可解锁（商业、财务、生活、技术、翻译等任何问题都能答）。

📍 本平台快捷入口：
• 点击【行业数据基准】查看各行业平均流水、毛利率与安全线；
• 点击【公开评分标准】查看完整 5 维雷达打分公式与 4 大门槛红线。`;
    }

    return {
      id: `esc-${Date.now()}`,
      question: text,
      category,
      confidence: isEdge ? 'LOW_EDGE_CASE' : 'HIGH',
      conservativePaths,
      aiResponse: answer,
      isEdgeCase: isEdge,
      suggestedAction,
      archivedAt: new Date().toISOString(),
      aiMode: 'rules'
    };
  };

  const handleAskQuestion = async (queryText: string) => {
    const text = (queryText || questionInput).trim();
    if (!text) return;

    setIsLoading(true);
    setQuestionInput('');
    setActiveTab('chat');

    try {
      // 20 秒熔断：给真 AI 更充足的时间，云端 AI 不可用时再快速回落本地规则库
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      const res = await fetch('/api/ai-consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, language }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const rawAnswer = data.aiResponse || data.answer || data.reply;
        // 云端 AI 返回空内容时同样回退本地规则引擎，避免页面出现空白回答
        if (!rawAnswer || !String(rawAnswer).trim()) {
          throw new Error('AI returned empty answer');
        }
        // 标记 Gemini 健康状态：本次调用是否真正走到云端
        const usedGemini = data.aiMode === 'gemini';
        setGeminiHealthy(usedGemini);

        const newRecord: ChatRecord = {
          id: `esc-${Date.now()}`,
          question: text,
          category: data.category || 'AI 智能答疑',
          confidence: data.confidence || 'HIGH',
          conservativePaths: data.conservativePaths && data.conservativePaths.length > 0 ? data.conservativePaths : undefined,
          aiResponse: rawAnswer,
          isEdgeCase: data.isEdgeCase || false,
          suggestedAction: data.suggestedAction || '',
          archivedAt: new Date().toISOString(),
          aiMode: data.aiMode === 'gemini' ? 'gemini' : 'rules',
          geminiUnavailable: data.geminiUnavailable === true,
          geminiError: data.geminiError || null,
          geminiErrorKind: data.geminiErrorKind || null
        };

        setChatHistory((prev) => [newRecord, ...prev]);
        addEscalatedQuestion(newRecord);
      } else {
        throw new Error('API request failed');
      }
    } catch (err) {
      // Smart Big-Data Fallback locally
      const fallbackRecord = resolveLocalKnowledge(text);
      setChatHistory((prev) => [fallbackRecord, ...prev]);
      addEscalatedQuestion(fallbackRecord);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFeedback = (id: string, fb: 'helpful' | 'not_helpful') => {
    updateEscalatedQuestionFeedback(id, fb);
    setChatHistory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, userFeedback: fb } : item))
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col justify-between border-l border-slate-200">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  {language === 'zh' ? 'AI 智能答疑 · 任何问题都能问' : 'AI Q&A · Ask Anything'}
                </h2>
                {aiConfigured === false ? (
                  <span className="text-[12px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    {language === 'zh' ? '本地规则库' : 'Local Rule Engine'}
                  </span>
                ) : geminiHealthy === false ? (
                  <span className="text-[12px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {language === 'zh' ? 'AI 暂不可用' : 'AI Temporarily Unavailable'}
                  </span>
                ) : (
                  <span className="text-[12px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {language === 'zh' ? 'AI 智能驱动' : 'AI-Powered'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {language === 'zh'
                  ? '商业规则大白话解答 · 提问记录绝不计入评分'
                  : 'Plain-language business rule answers · questions never affect your score'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI 未配置提示：引导配置 GEMINI_API_KEY 以启用真正的 AI 智能问答 */}
        {aiConfigured === false && (
          <div className="bg-amber-50 border-b border-amber-100 px-5 py-1.5 text-[13px] text-amber-900 font-medium">
            {language === 'zh'
              ? '当前为本地规则库模式，可解答平台填报与评分问题；如需通用 AI，请在 .env 配置 GEMINI_API_KEY 后重启。'
              : 'Currently running in local rule-engine mode, which can answer questions about entry and scoring; for general AI, configure GEMINI_API_KEY in .env and restart.'}
          </div>
        )}

        {/* Tabs Switcher */}
        <div className="flex border-b border-slate-200 text-xs font-bold bg-white">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-2.5 text-center border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'chat'
                ? 'border-teal-600 text-teal-600 bg-teal-50/20'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{language === 'zh' ? '问答咨询' : 'Q&A'}</span>
          </button>
          <button
            onClick={() => setActiveTab('benchmarks')}
            className={`flex-1 py-2.5 text-center border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'benchmarks'
                ? 'border-teal-600 text-teal-600 bg-teal-50/20'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{language === 'zh' ? '行业数据基准' : 'Industry Benchmarks'}</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/30">
          {/* TAB 1: CHAT */}
          {activeTab === 'chat' && (
            <div className="space-y-4">
              {chatHistory.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-[14px] leading-relaxed text-slate-700">
                    {language === 'zh' ? (
                      <>您好！我是 AI 助手，<b>经营问题都能用大白话讲清</b>——直接输入提问，或点下方高频问题试一试：</>
                    ) : (
                      <>Hi! I'm your AI assistant — <b>I can explain business questions in plain language</b>. Type a question directly, or try one of the frequent questions below:</>
                    )}
                  </p>
                  <div className="space-y-2">
                    {(language === 'zh' ? FAQ_PRESETS : FAQ_PRESETS_EN).map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAskQuestion(q)}
                        className="w-full text-left px-3 py-2.5 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/50 bg-white text-xs font-medium text-slate-800 transition-all cursor-pointer"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {chatHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3 text-xs"
                    >
                      {/* Question */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="flex items-start gap-2 text-slate-900 font-bold text-xs sm:text-sm">
                          <HelpCircle className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                          <span>{language === 'zh' ? '问：' : 'Q: '}{item.question}</span>
                        </div>
                        {item.aiMode === 'gemini' && (
                          <span className="text-[12px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 shrink-0">
                            {language === 'zh' ? 'AI 智能回答' : 'AI Answer'}
                          </span>
                        )}
                      </div>

                      {/* AI Answer formatted */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-800 leading-relaxed space-y-2">
                        <div className="flex items-center justify-between text-teal-700 font-bold text-xs pb-1 border-b border-slate-200/60">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                            <span>
                              {language === 'zh'
                                ? (item.aiMode === 'gemini' ? 'AI 解答：' : '大白话解答：')
                                : (item.aiMode === 'gemini' ? 'AI Answer:' : 'Plain-Language Answer:')}
                            </span>
                          </div>
                          <button
                            onClick={() => handleCopy(item.id, item.aiResponse)}
                            className="text-[13px] text-slate-500 hover:text-teal-600 flex items-center gap-1 cursor-pointer"
                          >
                            {copiedId === item.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-600">{language === 'zh' ? '已复制' : 'Copied'}</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>{language === 'zh' ? '复制解答' : 'Copy answer'}</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Text breakdown (rendered as Markdown) */}
                        <AnswerMarkdown content={item.aiResponse} />

                        {/* Suggested action pill */}
                        {item.suggestedAction && (
                          <div className="mt-2.5 pt-2 border-t border-slate-200/70 flex items-center gap-1.5 text-[13px] text-teal-900 bg-teal-50/60 px-2.5 py-1.5 rounded-lg font-medium">
                            <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span><b>{language === 'zh' ? '填报指引：' : 'Filing tip: '}</b>{item.suggestedAction}</span>
                          </div>
                        )}

                        {/* AI 降级提示：仅在 Gemini 不可用时显示 */}
                        {item.aiMode !== 'gemini' && item.geminiUnavailable && (
                          <div
                            className="mt-2 pt-1.5 border-t border-rose-100 flex items-center justify-between gap-2 text-[13px] text-rose-800"
                            title={language === 'zh' ? '本次回答由内置本地规则库提供，提问与回答均不影响任何评分' : 'This answer was provided by the built-in local rule engine; questions and answers never affect any score'}
                          >
                            <span className="flex items-center gap-1 min-w-0">
                              <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                              <span className="truncate">
                                {language === 'zh'
                                  ? (item.geminiErrorKind === 'quota'
                                      ? '云端 AI 免费额度已用完，已用本地规则库回答'
                                      : item.geminiErrorKind === 'auth'
                                        ? '云端 AI 密钥无效，已用本地规则库回答'
                                        : item.geminiErrorKind === 'model'
                                          ? '云端 AI 模型暂不可用，已用本地规则库回答'
                                          : '云端 AI 暂不可用，已用本地规则库回答')
                                  : (item.geminiErrorKind === 'quota'
                                      ? 'Cloud AI free quota exhausted; answered by the local rule engine'
                                      : item.geminiErrorKind === 'auth'
                                        ? 'Cloud AI key is invalid; answered by the local rule engine'
                                        : item.geminiErrorKind === 'model'
                                          ? 'Cloud AI model is temporarily unavailable; answered by the local rule engine'
                                          : 'Cloud AI is temporarily unavailable; answered by the local rule engine')}
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAskQuestion(item.question)}
                              disabled={isLoading}
                              className="text-rose-700 hover:text-rose-900 underline underline-offset-2 disabled:opacity-50 cursor-pointer shrink-0"
                            >
                              {isLoading ? (language === 'zh' ? '重试中...' : 'Retrying...') : (language === 'zh' ? '重试' : 'Retry')}
                            </button>
                          </div>
                        )}

                        {/* Conservative Paths if Edge Case */}
                        {item.conservativePaths && item.conservativePaths.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-amber-200 space-y-2">
                            <div className="flex items-center gap-1 text-amber-800 font-bold text-[13px]">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                              <span>{language === 'zh' ? '规则未决情况下的保守填报路径指引：' : 'Conservative filing paths for unresolved rule cases:'}</span>
                            </div>
                            {item.conservativePaths.map((path, pIdx) => (
                              <div
                                key={pIdx}
                                className="p-2.5 bg-white rounded-lg border border-amber-200 space-y-1 shadow-2xs"
                              >
                                <div className="flex justify-between font-bold text-slate-900">
                                  <span>{path.pathName}</span>
                                  <span className="text-teal-600">{path.estimatedScore}</span>
                                </div>
                                <p className="text-slate-600 text-[13px]">{path.assumption}</p>
                                <p className="text-[12px] text-amber-800 font-medium">
                                  {language === 'zh' ? '影响说明：' : 'Impact: '}{path.consequence}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Feedback buttons */}
                      <div className="flex items-center justify-end gap-1 pt-1 text-[13px] text-slate-400">
                        <button
                          onClick={() => handleFeedback(item.id, 'helpful')}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                            item.userFeedback === 'helpful'
                              ? 'bg-emerald-100 text-emerald-800 font-bold'
                              : 'hover:bg-slate-100 text-slate-600'
                          }`}
                        >
                          <ThumbsUp className="w-3 h-3" />
                          <span>{language === 'zh' ? '有用' : 'Helpful'}</span>
                        </button>
                        <button
                          onClick={() => handleFeedback(item.id, 'not_helpful')}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                            item.userFeedback === 'not_helpful'
                              ? 'bg-rose-100 text-rose-800 font-bold'
                              : 'hover:bg-slate-100 text-slate-600'
                          }`}
                        >
                          <ThumbsDown className="w-3 h-3" />
                          <span>{language === 'zh' ? '没用' : 'Not helpful'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: INDUSTRY BENCHMARKS */}
          {activeTab === 'benchmarks' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-900 text-white text-xs space-y-1">
                <div className="flex items-center gap-2 text-teal-300 font-bold">
                  <TrendingUp className="w-4 h-4" />
                  <span>{language === 'zh' ? '全球小微商业真实样本大数据分布（分行业 P50 中位数）' : 'Global Micro-Business Sample Data (Industry P50 Medians)'}</span>
                </div>
                <p className="text-slate-300 text-[13px]">
                  {language === 'zh'
                    ? '汇集全球数万家无财务背景小微企业经营指标，为您自查毛利空间与开销结构提供精准对标。'
                    : 'Aggregated operating metrics from tens of thousands of micro-businesses worldwide, giving you a precise benchmark for margin and cost structure.'}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {INDUSTRY_BIG_DATA.map((ind) => (
                  <div
                    key={ind.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{language === 'zh' ? ind.name : ind.nameEn}</span>
                      </div>
                      <span className="text-[13px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                        {language === 'zh' ? ind.avgRevenue : ind.avgRevenueEn}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-[12px] text-slate-400 block font-medium">{language === 'zh' ? '典型毛利率' : 'Typical Gross Margin'}</span>
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">{ind.grossMargin}</span>
                        <span className="text-[11px] text-slate-500 block truncate">{language === 'zh' ? ind.grossMarginLabel : ind.grossMarginLabelEn}</span>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-[12px] text-slate-400 block font-medium">{language === 'zh' ? '房租人工占比' : 'Rent & Labor Share'}</span>
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">{ind.opexRatio}</span>
                        <span className="text-[11px] text-slate-500 block truncate">{language === 'zh' ? '雷打不动开销' : 'Fixed costs'}</span>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-[12px] text-slate-400 block font-medium">{language === 'zh' ? '备用金安全线' : 'Reserve Safety Line'}</span>
                        <span className="font-bold text-emerald-700 text-xs sm:text-sm">{language === 'zh' ? ind.runwaySafety : ind.runwaySafetyEn}</span>
                        <span className="text-[11px] text-slate-500 block truncate">{language === 'zh' ? '抗断流月数' : 'Months of runway'}</span>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-[12px] text-slate-400 block font-medium">{language === 'zh' ? '到手净利润率' : 'Net Profit Margin'}</span>
                        <span className="font-bold text-teal-700 text-xs sm:text-sm">{ind.netProfitMargin}</span>
                        <span className="text-[11px] text-slate-500 block truncate">{language === 'zh' ? '实际进口袋' : 'Actual take-home'}</span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-200/70 text-[13px] text-amber-900 leading-relaxed flex items-start gap-2">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span><b>{language === 'zh' ? '老手生存准则：' : 'Veteran survival rule: '}</b>{language === 'zh' ? ind.keySurvivalRule : ind.keySurvivalRuleEn}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-white">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={language === 'zh' ? '输入经营问题，如：毛利率怎么算？现金要留几个月？...' : 'Ask a business question, e.g. how is gross margin calculated? How many months of cash reserve?'}
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isLoading) {
                  handleAskQuestion(questionInput);
                }
              }}
              className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-teal-500 focus:bg-white transition-all"
            />
            <button
              onClick={() => handleAskQuestion(questionInput)}
              disabled={isLoading || !questionInput.trim()}
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isLoading ? (language === 'zh' ? '解答中...' : 'Answering...') : (language === 'zh' ? '提问' : 'Ask')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
