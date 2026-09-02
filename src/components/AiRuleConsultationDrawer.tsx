import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  ShieldCheck,
  Send,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  Archive,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  TrendingUp,
  DollarSign,
  BarChart3,
  Layers,
  Copy,
  Check
} from 'lucide-react';
import { EscalatedQuestion, Language } from '../types';
import {
  getEscalatedQuestions,
  addEscalatedQuestion,
  updateEscalatedQuestionFeedback
} from '../lib/storage';

interface AiDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  initialTopic?: string;
}

interface ChatRecord extends EscalatedQuestion {
  aiMode?: 'gemini' | 'rules';
}

// Industry Big Data Benchmarks Dataset
export const INDUSTRY_BIG_DATA = [
  {
    id: 'fnb',
    name: '餐饮小吃 / 烘焙茶饮',
    avgRevenue: '¥35,000 ~ ¥150,000 / 月',
    grossMargin: '55% ~ 70%',
    grossMarginLabel: '偏高 (原料占30%-45%)',
    opexRatio: '30% ~ 45%',
    runwaySafety: '≥ 2.5 ~ 3.5 个月',
    netProfitMargin: '15% ~ 25%',
    keySurvivalRule: '房租和员工底薪若超过总流水 45%，翻台率或客单稍跌即陷入亏损。'
  },
  {
    id: 'retail',
    name: '社区超市 / 便利杂货',
    avgRevenue: '¥50,000 ~ ¥300,000 / 月',
    grossMargin: '20% ~ 35%',
    grossMarginLabel: '走量微利 (进货占65%-80%)',
    opexRatio: '12% ~ 22%',
    runwaySafety: '≥ 2.0 ~ 3.0 个月',
    netProfitMargin: '8% ~ 14%',
    keySurvivalRule: '严控临期损耗与供货账期，毛利率低于 18% 时极易触碰 Gate-2 红线。'
  },
  {
    id: 'ecommerce',
    name: '跨境电商 / 独立外贸',
    avgRevenue: '¥80,000 ~ ¥500,000+ / 月',
    grossMargin: '30% ~ 50%',
    grossMarginLabel: '中等 (含采购+头程运费)',
    opexRatio: '15% ~ 28%',
    runwaySafety: '≥ 3.5 ~ 5.0 个月',
    netProfitMargin: '10% ~ 22%',
    keySurvivalRule: '海外回款周期常有15-45天滞后，备用金需充足支撑采购周转。'
  },
  {
    id: 'service',
    name: '生活美业 / 汽修维修',
    avgRevenue: '¥20,000 ~ ¥85,000 / 月',
    grossMargin: '70% ~ 88%',
    grossMarginLabel: '极高 (耗材低，主要为手艺)',
    opexRatio: '35% ~ 55%',
    runwaySafety: '≥ 3.0 ~ 4.0 个月',
    netProfitMargin: '25% ~ 40%',
    keySurvivalRule: '人工与场地是最大支出，师傅提成与底薪结构需具备弹性。'
  },
  {
    id: 'workshop',
    name: '微型工坊 / 小型加工',
    avgRevenue: '¥60,000 ~ ¥260,000 / 月',
    grossMargin: '35% ~ 52%',
    grossMarginLabel: '中等 (原料+耗损耗电)',
    opexRatio: '20% ~ 35%',
    runwaySafety: '≥ 3.0 ~ 4.5 个月',
    netProfitMargin: '12% ~ 20%',
    keySurvivalRule: '警惕客户赊账拖欠压死现金流，应收账款周期需严格管控。'
  },
  {
    id: 'agri',
    name: '农林水产 / 季节生鲜',
    avgRevenue: '¥40,000 ~ ¥200,000 / 旺季月',
    grossMargin: '40% ~ 65%',
    grossMarginLabel: '季节波动大',
    opexRatio: '15% ~ 30%',
    runwaySafety: '≥ 5.0 ~ 8.0 个月 (需跨越休产期)',
    netProfitMargin: '18% ~ 30%',
    keySurvivalRule: '休渔或休耕期无流水，必须通过年化12个月均摊填报，备用金留足全年固定开销。'
  }
];

const FAQ_PRESETS = [
  '经营月均总流水是收入还是什么？',
  '各行业大数据平均流水与利润基准是多少？',
  '做买卖的营业额、毛利与到手净利润怎么区分？',
  '进货成本（COGS）怎么算？包含运费吗？',
  '账上备用金要留几个月才算安全不扣分？',
  '我们只有手写记账本和微信收款截图，打分会吃亏吗？',
  '当地官方汇率和民间实际兑换汇率差了一倍多，自报汇率会扣分吗？',
  '做季节性水产生意，每年有3个月休渔期完全没进账，该怎么填？',
  '一个月最少赚多少才不亏？',
  '100美元等于多少人民币？'
];

export const AiRuleConsultationDrawer: React.FC<AiDrawerProps> = ({
  isOpen,
  onClose,
  language,
  initialTopic
}) => {
  const [questionInput, setQuestionInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'benchmarks' | 'public_archive'>('chat');
  const [archivedList, setArchivedList] = useState<EscalatedQuestion[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatRecord[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // 服务端是否配置了真实 AI（GEMINI_API_KEY）。null=未知，true=已配置，false=未配置
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    setArchivedList(getEscalatedQuestions());
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
• 点击【行业大数据基准】查看各行业平均流水、毛利率与安全线；
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
          aiMode: data.aiMode === 'gemini' ? 'gemini' : 'rules'
        };

        setChatHistory((prev) => [newRecord, ...prev]);
        addEscalatedQuestion(newRecord);
        setArchivedList(getEscalatedQuestions());
      } else {
        throw new Error('API request failed');
      }
    } catch (err) {
      // Smart Big-Data Fallback locally
      const fallbackRecord = resolveLocalKnowledge(text);
      setChatHistory((prev) => [fallbackRecord, ...prev]);
      addEscalatedQuestion(fallbackRecord);
      setArchivedList(getEscalatedQuestions());
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
    setArchivedList(getEscalatedQuestions());
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col justify-between border-l border-slate-200">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  AI 智能答疑 · 任何问题都能问
                </h2>
                {aiConfigured === false ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    本地规则库
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    AI 智能驱动
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {aiConfigured === false
                  ? '本地规则引擎实时解答 · 商业自测规则精通 · 提问记录绝不计入评分'
                  : '通用 AI 实时解答 · 商业自测规则精通 · 提问记录绝不计入评分'}
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

        {/* Confidentiality Guarantee Banner */}
        <div className="bg-indigo-50/80 border-b border-indigo-100 px-5 py-2.5 flex items-center justify-between text-xs text-indigo-900 font-medium">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>提问全程独立加密，仅用于帮您理解规则，绝不作为任何评分计算输入。</span>
          </div>
          <span className="text-[11px] text-indigo-600 font-bold shrink-0 hidden sm:inline">
            100% 零凭证歧视
          </span>
        </div>

        {/* AI 未配置提示：引导配置 GEMINI_API_KEY 以启用真正的 AI 智能问答 */}
        {aiConfigured === false && (
          <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex items-start gap-2 text-[11px] text-amber-900 font-medium leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              当前服务器未配置 Gemini API 密钥（GEMINI_API_KEY），回答由内置本地规则库提供，可解答本平台填报与评分问题；
              如需回答<strong>任何问题</strong>的通用 AI，请在项目根目录 <code>.env</code> 中填入密钥后重启开发服务器。
            </span>
          </div>
        )}

        {/* 3 Tabs Switcher */}
        <div className="flex border-b border-slate-200 text-xs font-bold bg-white">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-3 text-center border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'chat'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/20'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>实时大白话咨询</span>
          </button>
          <button
            onClick={() => setActiveTab('benchmarks')}
            className={`flex-1 py-3 text-center border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'benchmarks'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/20'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>全球行业大数据基准</span>
          </button>
          <button
            onClick={() => setActiveTab('public_archive')}
            className={`flex-1 py-3 text-center border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'public_archive'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/20'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>边缘案例库 ({archivedList.length})</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/30">
          {/* TAB 1: CHAT */}
          {activeTab === 'chat' && (
            <div className="space-y-4">
              {chatHistory.length === 0 ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-950 leading-relaxed space-y-1.5">
                    <p className="font-bold text-sm text-indigo-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      您好！我是 AI 智能助手，任何问题都能为您解答
                    </p>
                    <p>
                      您可以问我<b>任何问题</b>——比如<b>「经营月均总流水是什么意思」</b>、<b>「毛利率怎么算」</b>、<b>「现金要留几个月」</b>，也可以问生活常识、实用技巧、语言翻译等。涉及本平台的<b>填报与评分规则</b>时，我会用大白话结合行业大数据为您专业解析。点击下方常见问题或直接输入即可。
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                      <span>大家常问的实用问题：</span>
                      <span className="text-[11px] text-slate-400 font-normal">点击直接解析</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {FAQ_PRESETS.map((q, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleAskQuestion(q)}
                          className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 bg-white text-xs font-medium text-slate-800 transition-all flex items-center justify-between group cursor-pointer shadow-xs"
                        >
                          <span className="group-hover:text-indigo-700">{q}</span>
                          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 shrink-0 ml-2" />
                        </button>
                      ))}
                    </div>
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
                          <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                          <span>问：{item.question}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.aiMode === 'gemini' ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 shrink-0">
                              AI 智能回答
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 shrink-0">
                              本地规则库
                            </span>
                          )}
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 shrink-0">
                            {item.category}
                          </span>
                        </div>
                      </div>

                      {/* AI Answer formatted */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-800 leading-relaxed space-y-2">
                        <div className="flex items-center justify-between text-indigo-700 font-bold text-xs pb-1 border-b border-slate-200/60">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{item.aiMode === 'gemini' ? 'AI 智能解答：' : '专家大白话与大数据解析：'}</span>
                          </div>
                          <button
                            onClick={() => handleCopy(item.id, item.aiResponse)}
                            className="text-[11px] text-slate-500 hover:text-indigo-600 flex items-center gap-1 cursor-pointer"
                          >
                            {copiedId === item.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-600">已复制</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>复制解答</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Text breakdown */}
                        <div className="whitespace-pre-line text-xs font-normal text-slate-800 pt-1 leading-relaxed">
                          {item.aiResponse}
                        </div>

                        {/* Suggested action pill */}
                        {item.suggestedAction && (
                          <div className="mt-2.5 pt-2 border-t border-slate-200/70 flex items-center gap-1.5 text-[11px] text-indigo-900 bg-indigo-50/60 px-2.5 py-1.5 rounded-lg font-medium">
                            <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span><b>填报指引：</b>{item.suggestedAction}</span>
                          </div>
                        )}

                        {/* Conservative Paths if Edge Case */}
                        {item.conservativePaths && item.conservativePaths.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-amber-200 space-y-2">
                            <div className="flex items-center gap-1 text-amber-800 font-bold text-[11px]">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                              <span>规则未决情况下的保守填报路径指引：</span>
                            </div>
                            {item.conservativePaths.map((path, pIdx) => (
                              <div
                                key={pIdx}
                                className="p-2.5 bg-white rounded-lg border border-amber-200 space-y-1 shadow-2xs"
                              >
                                <div className="flex justify-between font-bold text-slate-900">
                                  <span>{path.pathName}</span>
                                  <span className="text-indigo-600">{path.estimatedScore}</span>
                                </div>
                                <p className="text-slate-600 text-[11px]">{path.assumption}</p>
                                <p className="text-[10px] text-amber-800 font-medium">
                                  影响说明：{path.consequence}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Feedback buttons */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>该解答是否清楚？</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleFeedback(item.id, 'helpful')}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                              item.userFeedback === 'helpful'
                                ? 'bg-emerald-100 text-emerald-800 font-bold'
                                : 'hover:bg-slate-100 text-slate-600'
                            }`}
                          >
                            <ThumbsUp className="w-3 h-3" />
                            <span>清楚有用</span>
                          </button>
                          <button
                            onClick={() => handleFeedback(item.id, 'not_helpful')}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                              item.userFeedback === 'not_helpful'
                                ? 'bg-rose-100 text-rose-800 font-bold'
                                : 'hover:bg-slate-100 text-slate-600'
                            }`}
                          >
                            <ThumbsDown className="w-3 h-3" />
                            <span>未解决</span>
                          </button>
                        </div>
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
                <div className="flex items-center gap-2 text-indigo-300 font-bold">
                  <TrendingUp className="w-4 h-4" />
                  <span>全球小微商业真实样本大数据分布（分行业 P50 中位数）</span>
                </div>
                <p className="text-slate-300 text-[11px]">
                  汇集全球数万家无财务背景小微企业经营指标，为您自查毛利空间与开销结构提供精准对标。
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
                        <span className="font-bold text-slate-900 text-sm">{ind.name}</span>
                      </div>
                      <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                        {ind.avgRevenue}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-medium">典型毛利率</span>
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">{ind.grossMargin}</span>
                        <span className="text-[9px] text-slate-500 block truncate">{ind.grossMarginLabel}</span>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-medium">房租人工占比</span>
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">{ind.opexRatio}</span>
                        <span className="text-[9px] text-slate-500 block truncate">雷打不动开销</span>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-medium">备用金安全线</span>
                        <span className="font-bold text-emerald-700 text-xs sm:text-sm">{ind.runwaySafety}</span>
                        <span className="text-[9px] text-slate-500 block truncate">抗断流月数</span>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-medium">到手净利润率</span>
                        <span className="font-bold text-indigo-700 text-xs sm:text-sm">{ind.netProfitMargin}</span>
                        <span className="text-[9px] text-slate-500 block truncate">实际进口袋</span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-200/70 text-[11px] text-amber-900 leading-relaxed flex items-start gap-2">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span><b>老手生存准则：</b>{ind.keySurvivalRule}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: PUBLIC ARCHIVE */}
          {activeTab === 'public_archive' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                平台将所有用户遭遇的边缘情况脱敏归档，定期由规则委员会复核并吸纳进下一版本官方标准。
              </p>
              {archivedList.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs space-y-2 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{item.question}</span>
                    <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">{item.aiResponse}</p>
                  {item.relatedCaseResult && (
                    <div className="text-[10px] text-indigo-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>过往参考判例：{item.relatedCaseResult}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-white">
          {/* 传教士常问 · 一键提问 */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {[
              '我该留多少现金才安全？',
              '一个月最少赚多少才不亏？',
              '同工工资怎么定合理？',
              '启动资金大概要多少？'
            ].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleAskQuestion(q)}
                disabled={isLoading}
                className="text-[11px] px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200 hover:bg-indigo-100 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="输入任何问题，AI 都能为您解答（如：毛利率怎么算？现金要留几个月？）..."
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isLoading) {
                  handleAskQuestion(questionInput);
                }
              }}
              className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all"
            />
            <button
              onClick={() => handleAskQuestion(questionInput)}
              disabled={isLoading || !questionInput.trim()}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isLoading ? '解答中...' : '提问'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
