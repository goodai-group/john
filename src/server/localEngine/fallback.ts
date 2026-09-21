// 本地规则引擎 · 确定性兜底问答（Gemini 不可用 / 失败时使用）
//
// 【Phase 0 重构】原位于 server.ts 第 272-637 行。逻辑一字未改，仅补上 import / export。
// 未来归属：Coach（对话）的本地降级路径 —— 产品对弱网地区用户的硬承诺，不可删。
import { tryCurrencyConversion, tryGeneralKnowledge } from './knowledge.js';

/** 边缘疑难场景关键词：命中后回答会附带「保守填报路径 A / B」 */
export const EDGE_CASE_PATTERN =
  /休渔|季节|倒闭|天灾|战乱|物物交换|欠条|赊账|没有发票|教会赠款|非官方汇率|两套账|换人|无执照/i;

/** 判断提问是否属于边缘疑难场景（原 server.ts 中在 chat / stream 两处重复的同一段正则） */
export function isEdgeCaseQuestion(question: string): boolean {
  return EDGE_CASE_PATTERN.test(question);
}

export interface LocalFallbackResult {
  reply: string;
  category: string;
  suggestedAction: string;
  bigDataBenchmark: string;
  isEdgeCase: boolean;
  conservativePaths?: any[];
}

export function computeLocalFallback(
  question: string,
  language: string,
  isEdgeKeyword: boolean
): {
  reply: string;
  category: string;
  suggestedAction: string;
  bigDataBenchmark: string;
  isEdgeCase: boolean;
  conservativePaths?: any[];
} {
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

1️⃣ 商业财务大白话解析：经营月均总流水、进货成本、毛利、房租人工固定开销、应急备用金/现金跑道、自报汇率、凭证同权规则等；
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
      fallbackReply = `【💡 大白话：进货成本与毛利润】

1. 什么是进货采购成本？
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
      suggestedAction = '将每月必须支付的店租、员工底薪和固定水电网费合计填入固定开销';
      bigDataBenchmark = '健康小微企业的固定开销占总营业额比例应控制在 45% 以内。';
      fallbackReply = `【💡 大白话：房租与工人工资（固定开销）】

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

  return {
    reply: fallbackReply,
    category,
    suggestedAction,
    bigDataBenchmark,
    isEdgeCase,
    conservativePaths: paths
  };
}
