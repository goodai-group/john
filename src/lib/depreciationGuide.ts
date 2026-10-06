import type { Language } from '../types.js';

/**
 * 设备折旧填写指引：用户普遍不知道「折旧率 / 使用月数」该填多少。这里按设备名称关键词归类，
 * 再结合「公司注册所在国家/地区」给出当地税法/会计常用的折旧年限与对应年折旧率，作为填写参考。
 *
 * - 表单统一按直线法计算（月度折旧 = 设备值 ÷ 使用月数），所以每一类都给出一个「建议年限」；
 *   采用余额递减法（如英国、印度）或允许一次性扣除的地区，在 note 里说明当地税法口径。
 * - 纯参考数据，不参与评分；各国规则以当地税务机关最新规定为准。
 * - 表的 key 是该国法定货币代码（与 REGULATORY_COUNTRY_OPTIONS.code 一致），欧盟地区共用 EUR。
 */

export type AssetCategory =
  | 'electronics'
  | 'vehicle'
  | 'kitchen'
  | 'machinery'
  | 'furniture'
  | 'renovation'
  | 'building';

const CATEGORY_LABELS: Record<AssetCategory, { zh: string; en: string }> = {
  electronics: { zh: '电脑/电子设备', en: 'Computers & electronics' },
  vehicle: { zh: '车辆/运输工具', en: 'Vehicles' },
  kitchen: { zh: '厨房/餐饮设备', en: 'Kitchen & catering equipment' },
  machinery: { zh: '机器/生产设备', en: 'Machinery & production equipment' },
  furniture: { zh: '家具/货架/器具', en: 'Furniture, shelving & fixtures' },
  renovation: { zh: '装修/改造', en: 'Renovation & fit-out' },
  building: { zh: '房屋/建筑物', en: 'Buildings' }
};

// 顺序即匹配优先级：先具体（电子/车辆/厨房），后笼统（机器/家具）
const CATEGORY_PATTERNS: Array<[AssetCategory, RegExp]> = [
  ['electronics', /电脑|笔记本|手机|平板|打印|复印|收银|显示器|服务器|路由|相机|摄像|投影|电子|computer|laptop|pc\b|phone|tablet|ipad|printer|copier|\bpos\b|monitor|server|router|camera|projector|electronic/i],
  ['vehicle', /汽车|货车|面包车|皮卡|摩托|三轮|电动车|自行车|车辆|vehicle|\bcar\b|truck|\bvan\b|pickup|motorbike|motorcycle|bicycle|scooter|tuk/i],
  ['kitchen', /冰箱|冰柜|冷柜|烤箱|烤炉|灶|炉|咖啡机|制冰|油烟|厨房|厨具|蒸箱|搅拌|和面|展示柜|保温|炸锅|fridge|freezer|refrigerat|oven|stove|cooker|coffee machine|espresso|kitchen|grill|fryer|mixer|chiller/i],
  ['building', /房屋|厂房|建筑|仓库|店面产权|building|warehouse|premises/i],
  ['renovation', /装修|装潢|改造|招牌|吊顶|隔断|renovation|fit-?out|decoration|signage|refurbish/i],
  ['furniture', /桌|椅|柜|货架|沙发|床|家具|器具|空调|desk|chair|table|shelf|shelving|cabinet|sofa|furniture|fixture|air ?con/i],
  ['machinery', /机器|机床|设备|发电机|缝纫|生产线|水泵|压缩机|工具|machine|generator|sewing|pump|compressor|equipment|tool/i]
];

interface CountryDepreciationRule {
  countryZh: string;
  countryEn: string;
  /** 各类资产建议折旧年限（直线法） */
  years: Record<AssetCategory, number>;
  noteZh: string;
  noteEn: string;
}

/** 无国家信息或该国暂无数据时使用：小微企业常见经济使用年限 */
const GENERIC_RULE: CountryDepreciationRule = {
  countryZh: '通用',
  countryEn: 'General',
  years: { electronics: 3, vehicle: 5, kitchen: 5, machinery: 7, furniture: 5, renovation: 5, building: 20 },
  noteZh: '按小微企业常见经济使用年限估算；选定「公司注册所在国家/地区」后会换成当地税法口径。',
  noteEn: 'Based on typical small-business useful lives; select your registration country to see local tax rules.'
};

const COUNTRY_RULES: Record<string, CountryDepreciationRule> = {
  CNY: {
    countryZh: '中国大陆',
    countryEn: 'Mainland China',
    years: { electronics: 3, vehicle: 4, kitchen: 5, machinery: 10, furniture: 5, renovation: 5, building: 20 },
    noteZh: '《企业所得税法实施条例》第60条最低折旧年限：电子设备3年、运输工具(非飞机火车轮船)4年、器具工具家具5年、机器设备10年、房屋建筑物20年；租入场地装修按剩余租期摊销。单价≤500万元的新购设备可选择一次性税前扣除，但做经营测算仍建议按年限分摊。',
    noteEn: "China's CIT Implementation Rules Art. 60 minimum lives: electronics 3y, vehicles 4y, tools/furniture 5y, machinery 10y, buildings 20y; leasehold renovation amortized over the remaining lease. New equipment ≤ RMB 5M may be expensed at once for tax, but spread it for business planning."
  },
  HKD: {
    countryZh: '中国香港',
    countryEn: 'Hong Kong',
    years: { electronics: 3, vehicle: 5, kitchen: 5, machinery: 5, furniture: 5, renovation: 5, building: 25 },
    noteZh: '香港税务局：电脑硬件/软件可即时100%扣除；机械设备首年60%初期免税额，之后按10%/20%/30%三档每年免税额；楼宇翻新费用分5年扣除(每年20%)；商业楼宇每年4%。',
    noteEn: 'HK IRD: computer hardware/software 100% immediate deduction; plant & machinery 60% initial allowance then 10/20/30% annual pools; refurbishment deducted over 5 years (20%/yr); commercial buildings 4%/yr.'
  },
  USD: {
    countryZh: '美国',
    countryEn: 'United States',
    years: { electronics: 5, vehicle: 5, kitchen: 7, machinery: 7, furniture: 7, renovation: 15, building: 39 },
    noteZh: 'IRS MACRS(GDS)回收期：电脑/办公设备与车辆5年，餐饮设备、机器、家具7年，合格室内装修15年，非住宅商业建筑39年；另可用 Section 179 / bonus depreciation 一次性扣除。',
    noteEn: 'IRS MACRS (GDS): computers/office equipment & vehicles 5y, restaurant equipment, machinery & furniture 7y, qualified improvement property 15y, nonresidential real property 39y; Section 179 / bonus depreciation allow immediate expensing.'
  },
  GBP: {
    countryZh: '英国',
    countryEn: 'United Kingdom',
    years: { electronics: 3, vehicle: 5, kitchen: 5, machinery: 7, furniture: 5, renovation: 10, building: 33 },
    noteZh: 'HMRC 资本免税额不按年限：设备进主池按余额递减每年18%（特殊池6%），年投资免税额(AIA)每年最高100万英镑可首年100%扣除；商业建筑(SBA)每年3%。表中年限为会计常用直线法参考。',
    noteEn: 'HMRC capital allowances are not life-based: main pool 18% reducing balance (special rate 6%), Annual Investment Allowance gives 100% first-year relief up to £1M; Structures & Buildings Allowance 3%/yr. Years shown are common straight-line accounting lives.'
  },
  EUR: {
    countryZh: '欧盟地区',
    countryEn: 'European Union',
    years: { electronics: 3, vehicle: 6, kitchen: 8, machinery: 10, furniture: 10, renovation: 10, building: 33 },
    noteZh: '欧盟各国规定不同，以德国 AfA 表为例：轿车6年、厨房/餐饮设备约8年、办公家具13年、建筑物约33年(3%)，电脑软硬件可1年内折完。请按所在国税法核对。',
    noteEn: 'Rules differ by member state. Germany (AfA tables) as an example: cars 6y, catering equipment ~8y, office furniture 13y, buildings ~33y (3%), computers/software may be written off within 1 year.'
  },
  JPY: {
    countryZh: '日本',
    countryEn: 'Japan',
    years: { electronics: 4, vehicle: 6, kitchen: 8, machinery: 10, furniture: 8, renovation: 15, building: 39 },
    noteZh: '国税厅法定耐用年数：个人电脑4年、普通汽车6年(轻型车4年)、饮食店业用设备8年、家具器具约8年(金属制15年)、建筑附属设备约15年、钢筋混凝土店铺39年；中小企业30万日元以下资产可一次性计入费用。',
    noteEn: 'NTA statutory useful lives: PCs 4y, ordinary cars 6y (kei cars 4y), restaurant equipment 8y, furniture ~8y (metal 15y), building fixtures ~15y, RC shop buildings 39y; SMEs may expense assets under ¥300k immediately.'
  },
  INR: {
    countryZh: '印度',
    countryEn: 'India',
    years: { electronics: 3, vehicle: 8, kitchen: 8, machinery: 15, furniture: 10, renovation: 10, building: 30 },
    noteZh: '所得税按余额递减法(WDV)：电脑40%、车辆与机器设备15%、家具10%、建筑物10%；表中年限为《公司法》附表II会计使用年限参考。',
    noteEn: 'Income Tax uses written-down value rates: computers 40%, vehicles & plant 15%, furniture 10%, buildings 10%; years shown follow Companies Act Schedule II useful lives.'
  },
  KES: {
    countryZh: '肯尼亚',
    countryEn: 'Kenya',
    years: { electronics: 4, vehicle: 4, kitchen: 10, machinery: 10, furniture: 10, renovation: 10, building: 10 },
    noteZh: '肯尼亚税局(KRA)磨损扣除(直线法)：电脑及外设、汽车每年25%，家具与一般设备每年10%，商业建筑每年10%。',
    noteEn: 'KRA wear-and-tear (straight line): computers & peripherals and motor vehicles 25%/yr, furniture and general equipment 10%/yr, commercial buildings 10%/yr.'
  },
  THB: {
    countryZh: '泰国',
    countryEn: 'Thailand',
    years: { electronics: 3, vehicle: 5, kitchen: 5, machinery: 5, furniture: 5, renovation: 5, building: 20 },
    noteZh: '泰国税务局最高年折旧率：电脑及配件约33%(3年)，车辆、机器、家具等其他资产20%(5年)，建筑物5%(20年)；乘用车可折旧成本上限100万泰铢。',
    noteEn: 'Thai Revenue Department maximum rates: computers ~33% (3y), vehicles, machinery, furniture and other assets 20% (5y), buildings 5% (20y); passenger car depreciable cost capped at THB 1M.'
  },
  VND: {
    countryZh: '越南',
    countryEn: 'Vietnam',
    years: { electronics: 3, vehicle: 6, kitchen: 5, machinery: 7, furniture: 5, renovation: 6, building: 25 },
    noteZh: '越南财政部第45/2013号通知年限框架：电脑/办公设备3-8年、公路运输工具6-10年、机器设备5-15年、建筑物25-50年；表中取常用下限。',
    noteEn: 'Vietnam MoF Circular 45/2013 ranges: computers/office equipment 3-8y, road vehicles 6-10y, machinery 5-15y, buildings 25-50y; table uses the common lower bound.'
  },
  IDR: {
    countryZh: '印度尼西亚',
    countryEn: 'Indonesia',
    years: { electronics: 4, vehicle: 8, kitchen: 4, machinery: 8, furniture: 4, renovation: 10, building: 20 },
    noteZh: '印尼所得税法资产分组：第1组4年(25%)含电脑、木制家具、小型厨具、摩托车；第2组8年(12.5%)含汽车、多数机器；非永久建筑10年，永久建筑20年。',
    noteEn: 'Indonesian income tax asset groups: Group 1 = 4y (25%) incl. computers, wooden furniture, small kitchen equipment, motorcycles; Group 2 = 8y (12.5%) incl. cars and most machinery; non-permanent buildings 10y, permanent 20y.'
  },
  PHP: {
    countryZh: '菲律宾',
    countryEn: 'Philippines',
    years: { electronics: 3, vehicle: 5, kitchen: 5, machinery: 7, furniture: 5, renovation: 5, building: 25 },
    noteZh: '菲律宾税局(BIR)不规定固定年限，按"合理使用年限"直线法即可；表中为当地常用年限。',
    noteEn: 'The Philippine BIR does not prescribe fixed lives — any reasonable useful life on a straight-line basis is accepted; figures shown are common local practice.'
  }
};

export interface DepreciationSuggestion {
  category: AssetCategory | null;
  categoryLabel: string;
  years: number;
  months: number;
  /** 直线法年折旧率（%） */
  annualRatePct: number;
  regionLabel: string;
  note: string;
  /** 是否用的是当地规则（false = 通用参考） */
  isLocal: boolean;
}

export function classifyAsset(label: string): AssetCategory | null {
  const text = (label || '').trim();
  if (!text) return null;
  for (const [cat, re] of CATEGORY_PATTERNS) {
    if (re.test(text)) return cat;
  }
  return null;
}

/** currencyCode：所在国家对应的法定货币代码（REGULATORY_COUNTRY_OPTIONS.code）；未选国家时传 undefined */
export function getDepreciationSuggestion(
  label: string,
  currencyCode: string | undefined,
  language: Language
): DepreciationSuggestion {
  const rule = (currencyCode && COUNTRY_RULES[currencyCode]) || GENERIC_RULE;
  const category = classifyAsset(label);
  // 无法归类时按「机器/生产设备」与「家具器具」之间的折中 5 年
  const years = category ? rule.years[category] : 5;
  const en = language === 'en';
  return {
    category,
    categoryLabel: category ? CATEGORY_LABELS[category][en ? 'en' : 'zh'] : en ? 'General equipment' : '一般设备',
    years,
    months: years * 12,
    annualRatePct: Math.round((100 / years) * 10) / 10,
    regionLabel: en ? rule.countryEn : rule.countryZh,
    note: en ? rule.noteEn : rule.noteZh,
    isLocal: rule !== GENERIC_RULE
  };
}

/** 当地全部资产类别的参考年限一览，用于「折旧怎么填？」说明面板 */
export function getDepreciationTable(currencyCode: string | undefined, language: Language) {
  const rule = (currencyCode && COUNTRY_RULES[currencyCode]) || GENERIC_RULE;
  const en = language === 'en';
  return {
    regionLabel: en ? rule.countryEn : rule.countryZh,
    note: en ? rule.noteEn : rule.noteZh,
    isLocal: rule !== GENERIC_RULE,
    rows: (Object.keys(CATEGORY_LABELS) as AssetCategory[]).map((cat) => ({
      category: cat,
      label: CATEGORY_LABELS[cat][en ? 'en' : 'zh'],
      years: rule.years[cat],
      annualRatePct: Math.round((100 / rule.years[cat]) * 10) / 10
    }))
  };
}
