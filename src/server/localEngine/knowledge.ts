// 本地规则引擎 · 通用常识小工具（问候 / 时间 / 计算 / 币种换算 / 常识知识库）
//
// 【Phase 0 重构】原位于 server.ts 顶部，与路由逻辑混在一个 1354 行的文件里。
// 这里原样抽出，逻辑一字未改，仅补上 import / export。
// 未来归属：Coach（对话）的本地降级路径。
import { SUPPORTED_CURRENCIES } from '../../lib/currencies.js';

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
export function tryCurrencyConversion(question: string): string | null {
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
export type KnowledgeEntry = {
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

export function tryGeneralKnowledge(question: string): KnowledgeEntry | null {
  const q = question.toLowerCase().trim();
  for (const [key, entry] of Object.entries(GENERAL_KNOWLEDGE)) {
    if (q.includes(key.toLowerCase())) {
      return entry;
    }
  }
  return null;
}
