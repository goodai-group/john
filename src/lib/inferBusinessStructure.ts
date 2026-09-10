import { SUPPORTED_CURRENCIES } from './currencies.js';
import type { CurrencyCode, Language, RegulatoryCostEstimate } from '../types.js';

export interface InferredStructure {
  inferredIndustryKey?: string;
  industryDisplayName?: string;
  customIndustryName?: string;
  suggestedCurrency?: string;
  revenueTip?: string;
  estimatedMonthlyRevenue?: number;
  cogsItems?: Array<{ id?: string; name?: string; amount?: number }>;
  opexItems?: Array<{ id?: string; name?: string; amount?: number }>;
  benchmarkAdvice?: string;
  // 兼容后端别名
  industry?: string;
  baseCurrency?: string;
  suggestedCogs?: string[];
  suggestedOpex?: string[];
}

interface CostTemplate {
  id: string;
  name: string;
  amount: number;
}

interface IndustryTemplate {
  key: string;
  displayName: string;
  customName: string;
  revTip: string;
  rev: number;
  cogs: CostTemplate[];
  opex: CostTemplate[];
  advice: string;
}

/** 前端本地兜底推断：不依赖后端 AI 接口，仅凭项目/店铺名称推断行业、币种与成本结构。
 *  用于后端不可用时提供无缝体验，避免"无法自动推算"。
 */
/** 根据店名/地区关键词推断所在国家的币种代码，供行业推断与合规成本预估共用。
 *  未命中任何地区关键词时返回 undefined——调用方不应把"没有任何线索"当成"推断出 USD"，
 *  否则会把美国的税率/注册费/签证费标准错误地套用到一个完全没提及地区的项目名上
 *  （例如"阳光社区烘焙店"这类不含地名的中文店名，多数目标用户实际并不在美国）。 */
function detectCountryCurrency(pLower: string): CurrencyCode | undefined {
  if (/肯尼亚|内罗毕|nairobi|kenya|kes/i.test(pLower)) return 'KES';
  if (/泰国|清迈|曼谷|thailand|chiang mai|bangkok|thb/i.test(pLower)) return 'THB';
  if (/越南|河内|胡志明|vietnam|ho chi minh|hanoi|vnd/i.test(pLower)) return 'VND';
  if (/印尼|雅加达|indonesia|jakarta|idr/i.test(pLower)) return 'IDR';
  if (/菲律宾|马尼拉|philippines|manila|php/i.test(pLower)) return 'PHP';
  if (/尼日利亚|拉各斯|nigeria|lagos|ngn/i.test(pLower)) return 'NGN';
  if (/埃及|开罗|egypt|cairo|egp/i.test(pLower)) return 'EGP';
  if (/埃塞俄比亚|ethiopia|addis ababa|etb/i.test(pLower)) return 'ETB';
  if (/缅甸|仰光|曼德勒|内比都|myanmar|yangon|mandalay|mmk/i.test(pLower)) return 'MMK';
  if (/柬埔寨|金边|cambodia|phnom penh|khr/i.test(pLower)) return 'KHR';
  if (/老挝|万象|laos|vientiane|lak/i.test(pLower)) return 'LAK';
  if (/孟加拉|达卡|bangladesh|dhaka|bdt/i.test(pLower)) return 'BDT';
  if (/斯里兰卡|科伦坡|sri lanka|colombo|lkr/i.test(pLower)) return 'LKR';
  if (/中国|上海|北京|深圳|广州|杭州|成都|台北|香港|cny|rmb/i.test(pLower)) return 'CNY';
  if (/美国|纽约|洛杉矶|加州|usa|united states|california|usd/i.test(pLower)) return 'USD';
  if (/欧盟|德国|法国|意大利|西班牙|荷兰|eur/i.test(pLower)) return 'EUR';
  if (/英国|伦敦|uk|united kingdom|gbp/i.test(pLower)) return 'GBP';
  return undefined;
}

export function inferBusinessStructureLocally(
  projectName: string,
  baseCurrency: CurrencyCode = 'USD'
): InferredStructure {
  const pLower = projectName.toLowerCase();

  // 1. 币种推断：尽量覆盖常见 BAM 地区与通用币种代码。
  // 未命中任何地区关键词时，沿用当前表单已选币种做金额换算，但不把它当作"AI 推断结果"
  // 回传给前端（detectedCurrency 为 undefined），避免覆盖用户的真实选择。
  const detectedCurrency = detectCountryCurrency(pLower);
  const curr: CurrencyCode = detectedCurrency || baseCurrency;

  const rate = SUPPORTED_CURRENCIES.find((c) => c.code === curr)?.rateToUsd || 1;
  const toLocal = (usd: number) => Math.round(usd * rate);
  const toLocalItems = (items: CostTemplate[]) =>
    items.map((it) => ({ ...it, amount: toLocal(it.amount) }));

  // 2. 默认通用模板
  const result: IndustryTemplate = {
    key: 'custom',
    displayName: '自定义实体 / 创新微创项目',
    customName: projectName || '自定义小微商业实体',
    revTip: '每月提供商品或服务产生的全部营业进账流水',
    rev: 2200,
    cogs: [
      { id: 'cogs_1', name: '核心原材料与直接货品采购', amount: 700 },
      { id: 'cogs_2', name: '包装材料与直接加工耗材', amount: 150 }
    ],
    opex: [
      { id: 'opex_rent', name: '经营场所与办公室月度租金', amount: 400 },
      { id: 'opex_labor', name: '全职员工与业务骨干薪资补贴', amount: 650 },
      { id: 'opex_utility', name: '水电物业与网络通讯杂支', amount: 120 },
      { id: 'opex_other', name: '设备折旧维护与证照杂项', amount: 80 }
    ],
    advice: '跟踪核心成本变动，确保常备 3 个月以上固定开支现金储备。'
  };

  // 3. 按关键词匹配行业模板
  if (/医|诊所|药|门诊|卫生|康复|牙科|clinic|health|hospital|care|medical/i.test(pLower)) {
    result.key = 'medical_health';
    result.displayName = '医疗健康 / 爱心义诊所';
    result.customName = '社区爱心诊所与便民药房';
    result.revTip = '门诊挂号看诊费、平价药品与检查费等全部进账';
    result.rev = 2200;
    result.cogs = [
      { id: 'cogs_meds', name: '常用中西药品与药剂采购', amount: 650 },
      { id: 'cogs_supplies', name: '医用敷料耗材与消毒器械', amount: 150 }
    ];
    result.opex = [
      { id: 'opex_rent', name: '诊所场地租金与物业', amount: 400 },
      { id: 'opex_staff', name: '本地护士与药房助理津贴', amount: 600 },
      { id: 'opex_utility', name: '冷藏电费、水电与通讯', amount: 120 },
      { id: 'opex_misc', name: '医疗固废清运与执照年检', amount: 80 }
    ];
    result.advice = '爱心门诊药品采购成本约占总进账 30%-40%，建议常备 3.5 个月固定开支备用金。';
  } else if (
    /咖啡|咖啡厅|咖啡馆|咖啡屋|烘焙|面包|蛋糕|餐厅|饭店|餐馆|小吃|甜品|奶茶|茶饮|茶室|茶馆|cafe|coffee shop|coffee house|bakery|boulangerie|coffee|restaurant|bistro|food/i.test(pLower)
  ) {
    result.key = 'food_beverage';
    result.displayName = '餐饮烘焙 / 社区咖啡';
    result.customName = '社区烘焙工坊与精品咖啡';
    result.revTip = '堂食点单、现烤面包甜点、外卖及咖啡豆零售总进账';
    result.rev = 3000;
    result.cogs = [
      { id: 'cogs_beans_milk', name: '咖啡生豆/熟豆、鲜牛奶与糖浆', amount: 700 },
      { id: 'cogs_baking', name: '烘焙面粉、黄油、酵母与配料', amount: 450 },
      { id: 'cogs_packaging', name: '外带环保纸杯、吸管与打包盒袋', amount: 150 }
    ];
    result.opex = [
      { id: 'opex_rent', name: '临街旺铺/社区店面租金', amount: 500 },
      { id: 'opex_barista', name: '咖啡师与烘焙师傅薪资', amount: 700 },
      { id: 'opex_power', name: '高功率烘焙烤箱与咖啡机电费水费', amount: 160 },
      { id: 'opex_maintenance', name: '商用设备日常保养与耗损', amount: 80 }
    ];
    result.advice = '餐饮烘焙行业直接食材成本通常占 35%-45%，毛利率宜保持在 55% 以上，注意控制旺铺租金比重。';
  } else if (/技能|维修|汽修|木工|手工|实训|工坊|workshop|repair|vocational/i.test(pLower)) {
    // 注意：该分支必须排在"教育培训"分支之前——"维修培训""工坊培训"这类店铺名
    // 同时含有职业技能类关键词（维修/工坊/技能）与泛化的"培训"二字，
    // 但更准确的行业应是职业实训/手工工坊而非语言教育，故让更具体的关键词优先匹配。
    result.key = 'vocational_training';
    result.displayName = '职业实训 / 手工工坊';
    result.customName = '青年职业技能实训与手艺工坊';
    result.revTip = '手作产品销售、维修服务收费与实训学员学费';
    result.rev = 2200;
    result.cogs = [
      { id: 'cogs_materials', name: '实训原料、木料/皮革/布料耗材', amount: 500 },
      { id: 'cogs_tools', name: '易损刀具、焊锡/五金零配件与损耗', amount: 160 }
    ];
    result.opex = [
      { id: 'opex_rent', name: '实训车间/工坊场地租金', amount: 400 },
      { id: 'opex_master', name: '带教技师与工匠师傅津贴', amount: 700 },
      { id: 'opex_power', name: '动力工业用电、水费与安全保险', amount: 150 },
      { id: 'opex_maintain', name: '机械设备定期检修与润滑耗损', amount: 90 }
    ];
    result.advice = '职业实训与工坊需兼顾产品质量与技能传授，建议储备 3 个月以上资金支持设备升级换代。';
  } else if (/教育|学校|培训|辅导|语言|英语|文化|课后|school|education|language|tutoring/i.test(pLower)) {
    result.key = 'education_training';
    result.displayName = '语言教育 / 辅导中心';
    result.customName = '社区青少年语言学习与课后辅导中心';
    result.revTip = '学员月度/季度学费、教材费与课后辅导收费';
    result.rev = 2200;
    result.cogs = [
      { id: 'cogs_books', name: '教学教材、练习册与课本印制', amount: 220 },
      { id: 'cogs_online', name: '在线教学软件平台与教具耗材', amount: 80 }
    ];
    result.opex = [
      { id: 'opex_rent', name: '教学教室场地租金', amount: 500 },
      { id: 'opex_teachers', name: '本地授课教师与助教课酬', amount: 950 },
      { id: 'opex_utility', name: '教室空调电费、宽带网络与饮用水', amount: 140 },
      { id: 'opex_activity', name: '学员文化交流与家长日活动杂费', amount: 80 }
    ];
    result.advice = '教育培训属于轻资产服务，直接教材成本低（<15%），核心支出在老师薪资与场地，保持 25% 结余即可稳健运营。';
  } else if (
    /超市|商超|便利|杂货|零售|批发|档口|百货|服装|服饰|衣帽|鞋店|箱包|手机|数码|电脑|电器|家电|五金|建材|文具|store|shop|market|retail|clothing|garment|tailor|shoe|phone|electronics|hardware/i.test(pLower)
  ) {
    result.key = 'retail_store';
    result.displayName = '社区零售 / 平价商超';
    result.customName = '便民社区生活平价超市';
    result.revTip = '日用百货、食品调料与平价生鲜全部收银流水';
    result.rev = 5000;
    result.cogs = [
      { id: 'cogs_stock', name: '商品批量批发进货成本', amount: 3800 },
      { id: 'cogs_freight', name: '货品物流运输与搬运装卸费', amount: 200 }
    ];
    result.opex = [
      { id: 'opex_rent', name: '临街商铺月度租金', amount: 400 },
      { id: 'opex_cashier', name: '收银员与理货店员薪资', amount: 350 },
      { id: 'opex_utility', name: '商超照明、冰柜冷藏用电与网络', amount: 100 },
      { id: 'opex_loss', name: '货品合理损耗、防盗与包装袋', amount: 50 }
    ];
    result.advice = '社区零售走量为主，毛利率通常在 20%-30%，需严格把控进货周转率与损耗。';
  } else if (/农场|农业|种植|养殖|果园|蔬菜|farm|agriculture/i.test(pLower)) {
    result.key = 'agriculture';
    result.displayName = '现代农业 / 生态种植';
    result.customName = '生态农业种植与扶贫合作社';
    result.revTip = '果蔬收成批发、生态农产品直销与订单进账';
    result.rev = 1800;
    result.cogs = [
      { id: 'cogs_seeds', name: '优良种苗、有机肥料与生物农药', amount: 380 },
      { id: 'cogs_packaging', name: '保鲜包装箱、果筐与田间耗材', amount: 120 }
    ];
    result.opex = [
      { id: 'opex_rent', name: '农田土地租赁与大棚租金', amount: 280 },
      { id: 'opex_farmers', name: '本地农工与田间管理人员工资', amount: 550 },
      { id: 'opex_irrigation', name: '灌溉水费、农机柴油与电力', amount: 150 },
      { id: 'opex_tools', name: '农具维护与水肥一体化管网保养', amount: 80 }
    ];
    result.advice = '农业受季节与天气影响较大，建议预留 4-6 个月固定开销作为越冬或休耕期周转资金。';
  } else if (/儿童|日托|学前|启蒙|幼托|childcare|daycare|kindergarten/i.test(pLower)) {
    result.key = 'child_care';
    result.displayName = '儿童日托 / 社区启蒙';
    result.customName = '社区贫困儿童日托与学前启蒙中心';
    result.revTip = '家长托育服务费、营养膳食费与爱心助学款';
    result.rev = 1900;
    result.cogs = [
      { id: 'cogs_food', name: '儿童每日营养膳食与辅食原料', amount: 320 },
      { id: 'cogs_toys', name: '益智教具、绘画文具与卫生纸品', amount: 90 }
    ];
    result.opex = [
      { id: 'opex_rent', name: '安全日托场地与户外活动区租金', amount: 380 },
      { id: 'opex_teachers', name: '专职幼教老师与保育同工薪资', amount: 750 },
      { id: 'opex_utility', name: '恒温空调电费、温水与空气净化', amount: 120 },
      { id: 'opex_safety', name: '儿童安全保险与定期消毒杂费', amount: 70 }
    ];
    result.advice = '儿童日托重在安全与营养，保持 3.5 个月以上流动储备以应对公共卫生或突发紧急情况。';
  } else if (/美容|美发|理发|美甲|纹绣|洗护|洗衣|干洗|salon|beauty|hair|barber|nail|laundry/i.test(pLower)) {
    result.key = 'community_service';
    result.displayName = '美容美发 / 社区生活服务';
    result.customName = '社区美容美发与便民生活服务';
    result.revTip = '理发美容服务、护理套餐与会员卡储值全部进账';
    result.rev = 1800;
    result.cogs = [
      { id: 'cogs_materials', name: '洗护美发用品与美容护理耗材', amount: 260 },
      { id: 'cogs_products', name: '零售护发美容产品进货', amount: 100 }
    ];
    result.opex = [
      { id: 'opex_rent', name: '社区沿街店面租金', amount: 380 },
      { id: 'opex_staff', name: '理发师与美容技师薪资', amount: 650 },
      { id: 'opex_utility', name: '水电热水与门店清洁耗材', amount: 120 },
      { id: 'opex_misc', name: '设备维护与证照年检杂费', amount: 70 }
    ];
    result.advice = '美容美发属于高毛利生活服务，耗材成本低，核心是稳定客流与会员复购，建议常备 3 个月以上固定开支。';
  }

  return {
    inferredIndustryKey: result.key,
    industryDisplayName: result.displayName,
    customIndustryName: result.customName,
    suggestedCurrency: detectedCurrency,
    revenueTip: result.revTip,
    estimatedMonthlyRevenue: toLocal(result.rev),
    cogsItems: toLocalItems(result.cogs),
    opexItems: toLocalItems(result.opex),
    benchmarkAdvice: result.advice
  };
}

/** 将 Gemini 可能返回的非标行业 key 映射为前端有效枚举，避免"无法识别"。 */
export function normalizeIndustryKey(rawKey: string): string {
  const map: Record<string, string> = {
    handicraft: 'vocational_training', // 手工工坊归入职业实训
    tech_service: 'community_service', // 科技服务归入社区服务
    tech: 'community_service',
    it: 'vocational_training',
    other: 'custom'
  };
  return map[rawKey.toLowerCase()] || rawKey;
}

/** 根据行业 key 直接获取模板（用于手动切换行业后填充默认动态项）。 */
export function getIndustryTemplateByKey(
  industryKey: string,
  baseCurrency: CurrencyCode = 'USD'
): InferredStructure & { key: string } {
  const local = inferBusinessStructureLocally(industryKey, baseCurrency);

  // 如果 industryKey 本身能被规则命中，直接返回
  if (local.inferredIndustryKey && local.inferredIndustryKey !== 'custom') {
    return { ...local, key: local.inferredIndustryKey };
  }

  // 兜底：用虚拟店名触发对应行业模板
  const aliasName: Record<string, string> = {
    food_beverage: '社区咖啡店',
    medical_health: '社区诊所',
    education_training: '语言辅导中心',
    vocational_training: '技能实训工坊',
    retail_store: '社区超市',
    agriculture: '生态农场',
    child_care: '儿童日托中心',
    community_service: '社区服务中心',
    custom: '自定义商业项目'
  };
  const forced = inferBusinessStructureLocally(aliasName[industryKey] || aliasName.custom, baseCurrency);
  return { ...forced, key: forced.inferredIndustryKey || industryKey };
}

/**
 * 属地经营合规成本参考库（第5点：AI 给出税收/公司注册/签证成本的具体情况）。
 * 数值均为粗略区间估值（USD），仅供小微经营者填报前参考，实际以当地税务与移民主管部门为准，
 * 用户在表单中核实后可自由修改覆盖，不作为最终计算依据。
 */
const REGULATORY_COST_TABLE: Record<
  string,
  {
    countryLabel: string;
    countryLabelEn: string;
    taxHint: string;
    taxHintEn: string;
    registrationUsd: number;
    visaUsd: number;
    sourceNote: string;
    sourceNoteEn: string;
  }
> = {
  KES: {
    countryLabel: '肯尼亚 (Kenya)',
    countryLabelEn: 'Kenya',
    taxHint: '小微个体户 Turnover Tax 约 1%-3%；有限公司企业所得税约 30%',
    taxHintEn: 'Micro sole-proprietor Turnover Tax approx. 1%-3%; limited company corporate tax approx. 30%',
    registrationUsd: 60,
    visaUsd: 250,
    sourceNote: '参考肯尼亚 KRA 小微税制与 eCitizen 商业登记年费公开区间，实际以当年公告为准',
    sourceNoteEn: 'Based on Kenya KRA micro-business tax rules and published eCitizen business registration fee ranges; verify against the current year\'s notices'
  },
  NGN: {
    countryLabel: '尼日利亚 (Nigeria)',
    countryLabelEn: 'Nigeria',
    taxHint: '小微企业（年营业额 < 2500万奈拉）通常免征企业所得税；否则约 20%-30%',
    taxHintEn: 'Small businesses (annual turnover < NGN 25M) are typically exempt from corporate tax; otherwise approx. 20%-30%',
    registrationUsd: 80,
    visaUsd: 200,
    sourceNote: '参考尼日利亚 CAC 公司注册费与联邦税务局小微企业优惠区间',
    sourceNoteEn: 'Based on Nigeria CAC company registration fees and Federal Inland Revenue small-business incentive ranges'
  },
  EGP: {
    countryLabel: '埃及 (Egypt)',
    countryLabelEn: 'Egypt',
    taxHint: '个体经营/中小企业所得税约 22.5%，另有增值税约 14%',
    taxHintEn: 'Sole trader/SME income tax approx. 22.5%, plus VAT approx. 14%',
    registrationUsd: 150,
    visaUsd: 25,
    sourceNote: '参考埃及税务局及商业登记处公开费率区间',
    sourceNoteEn: 'Based on published fee ranges from the Egyptian Tax Authority and commercial registry'
  },
  ETB: {
    countryLabel: '埃塞俄比亚 (Ethiopia)',
    countryLabelEn: 'Ethiopia',
    taxHint: '小微营业执照分级定额税，或按利润征收 10%-35% 累进税',
    taxHintEn: 'Tiered flat tax for micro business licenses, or a progressive 10%-35% tax on profit',
    registrationUsd: 40,
    visaUsd: 82,
    sourceNote: '参考埃塞俄比亚税务局小微分级定额税表',
    sourceNoteEn: 'Based on the Ethiopian tax authority\'s tiered flat-tax schedule for micro businesses'
  },
  THB: {
    countryLabel: '泰国 (Thailand)',
    countryLabelEn: 'Thailand',
    taxHint: '中小企业所得税分级约 0%-20%（净利前 30 万泰铢免税）',
    taxHintEn: 'SME income tax tiers approx. 0%-20% (first THB 300,000 net profit is tax-exempt)',
    registrationUsd: 120,
    visaUsd: 220,
    sourceNote: '参考泰国商业发展厅注册费与非移民签证/工作许可公开费率',
    sourceNoteEn: 'Based on Thailand Department of Business Development registration fees and published Non-Immigrant visa/work permit rates'
  },
  VND: {
    countryLabel: '越南 (Vietnam)',
    countryLabelEn: 'Vietnam',
    taxHint: '个体经营户定额税或企业所得税 20%，视经营形式而定',
    taxHintEn: 'Household business flat tax, or 20% corporate income tax, depending on business form',
    registrationUsd: 45,
    visaUsd: 135,
    sourceNote: '参考越南计划投资部注册费与劳动许可证公开费率区间',
    sourceNoteEn: 'Based on Vietnam Ministry of Planning and Investment registration fees and published work permit fee ranges'
  },
  IDR: {
    countryLabel: '印度尼西亚 (Indonesia)',
    countryLabelEn: 'Indonesia',
    taxHint: '小微企业（年营业额 < 48 亿印尼盾）最终所得税约 0.5%',
    taxHintEn: 'Small businesses (annual turnover < IDR 4.8B) final income tax approx. 0.5%',
    registrationUsd: 100,
    visaUsd: 350,
    sourceNote: '参考印尼 OSS 单一窗口注册与 KITAS 工作许可公开费率区间',
    sourceNoteEn: 'Based on Indonesia OSS single-window registration and published KITAS work permit fee ranges'
  },
  PHP: {
    countryLabel: '菲律宾 (Philippines)',
    countryLabelEn: 'Philippines',
    taxHint: '小微企业（年营业额 < 300 万比索）可选 8% 简易所得税',
    taxHintEn: 'Small businesses (annual turnover < PHP 3M) may opt into a simplified 8% income tax',
    registrationUsd: 90,
    visaUsd: 250,
    sourceNote: '参考菲律宾 DTI/BIR 注册费与 9(g) 工作签证公开费率区间',
    sourceNoteEn: 'Based on Philippines DTI/BIR registration fees and published 9(g) work visa fee ranges'
  },
  MMK: {
    countryLabel: '缅甸 (Myanmar)',
    countryLabelEn: 'Myanmar',
    taxHint: '小微商业执照定额税或利得税约 22%-25%',
    taxHintEn: 'Flat tax for micro business licenses, or profit tax approx. 22%-25%',
    registrationUsd: 50,
    visaUsd: 36,
    sourceNote: '参考缅甸投资与公司管理局公开注册与签证费率区间',
    sourceNoteEn: 'Based on published registration and visa fee ranges from Myanmar\'s Directorate of Investment and Company Administration'
  },
  KHR: {
    countryLabel: '柬埔寨 (Cambodia)',
    countryLabelEn: 'Cambodia',
    taxHint: '小微纳税人定额税，或年利润税 20%',
    taxHintEn: 'Flat tax for small taxpayers, or 20% annual profit tax',
    registrationUsd: 100,
    visaUsd: 300,
    sourceNote: '参考柬埔寨商业部注册费与商务签证/工作许可公开费率区间',
    sourceNoteEn: 'Based on Cambodia Ministry of Commerce registration fees and published business visa/work permit fee ranges'
  },
  LAK: {
    countryLabel: '老挝 (Laos)',
    countryLabelEn: 'Laos',
    taxHint: '小微企业利润税约 3%-7%（分级），一般企业所得税 20%',
    taxHintEn: 'Small business profit tax approx. 3%-7% (tiered); standard corporate income tax 20%',
    registrationUsd: 60,
    visaUsd: 100,
    sourceNote: '参考老挝工贸部注册费与商务签证公开费率区间',
    sourceNoteEn: 'Based on Laos Ministry of Industry and Commerce registration fees and published business visa fee ranges'
  },
  BDT: {
    countryLabel: '孟加拉国 (Bangladesh)',
    countryLabelEn: 'Bangladesh',
    taxHint: '小微企业所得税约 15%-25%（分级）',
    taxHintEn: 'Small business income tax approx. 15%-25% (tiered)',
    registrationUsd: 80,
    visaUsd: 51,
    sourceNote: '参考孟加拉 RJSC 商业注册费与商务签证公开费率区间',
    sourceNoteEn: 'Based on Bangladesh RJSC business registration fees and published business visa fee ranges'
  },
  LKR: {
    countryLabel: '斯里兰卡 (Sri Lanka)',
    countryLabelEn: 'Sri Lanka',
    taxHint: '小微企业（利润 < 一定门槛）所得税 0%，超过部分 15%-30%',
    taxHintEn: 'Small businesses (profit below a threshold) pay 0% income tax; amounts above it are taxed at 15%-30%',
    registrationUsd: 30,
    visaUsd: 50,
    sourceNote: '参考斯里兰卡公司注册处费用与商务签证公开费率区间',
    sourceNoteEn: 'Based on Sri Lanka Registrar of Companies fees and published business visa fee ranges'
  },
  CNY: {
    countryLabel: '中国大陆',
    countryLabelEn: 'Mainland China',
    taxHint: '小规模纳税人增值税优惠期内较低，企业所得税小微企业实际税负约 5%-20%',
    taxHintEn: 'Small-scale VAT taxpayers enjoy reduced rates during incentive periods; effective corporate tax burden for small/micro businesses approx. 5%-20%',
    registrationUsd: 0,
    visaUsd: 0,
    sourceNote: '参考中国大陆小微企业普惠性税收减免政策（工商注册本身通常免费）',
    sourceNoteEn: 'Based on mainland China\'s inclusive tax relief policies for small/micro businesses (business registration itself is usually free)'
  },
  USD: {
    countryLabel: '美国 (United States)',
    countryLabelEn: 'United States',
    taxHint: '联邦企业所得税 21%，另有州税与自雇税，视州与经营形式而定',
    taxHintEn: 'Federal corporate income tax 21%, plus state tax and self-employment tax depending on state and business form',
    registrationUsd: 100,
    visaUsd: 460,
    sourceNote: '参考美国各州公司注册规费与常见工作签证申请费公开区间',
    sourceNoteEn: 'Based on published U.S. state company registration fees and common work visa application fee ranges'
  },
  EUR: {
    countryLabel: '欧盟地区',
    countryLabelEn: 'European Union',
    taxHint: '企业所得税各国不同，欧盟平均约 21.3%，中小企业常有优惠税率',
    taxHintEn: 'Corporate tax rates vary by country; EU average approx. 21.3%, with SMEs often eligible for reduced rates',
    registrationUsd: 150,
    visaUsd: 90,
    sourceNote: '参考欧盟多国商业登记处注册费与申根长期签证公开费率区间',
    sourceNoteEn: 'Based on published business registry fees across EU member states and long-stay Schengen visa fee ranges'
  },
  GBP: {
    countryLabel: '英国 (United Kingdom)',
    countryLabelEn: 'United Kingdom',
    taxHint: '小型企业企业所得税约 19%（利润 < 5 万英镑）',
    taxHintEn: 'Small business corporate tax approx. 19% (profit < GBP 50,000)',
    registrationUsd: 15,
    visaUsd: 610,
    sourceNote: '参考英国 Companies House 注册费与创新者/技术人才签证公开费率区间',
    sourceNoteEn: 'Based on UK Companies House registration fees and published Innovator/Skilled Worker visa fee ranges'
  }
};

const DEFAULT_REGULATORY_ESTIMATE = {
  countryLabel: '通用/未识别地区',
  countryLabelEn: 'General / Unidentified Region',
  taxHint: '多数国家小微企业所得税区间约 10%-30%，具体请核对当地税务主管部门规定',
  taxHintEn: 'Most countries\' small-business income tax ranges from approx. 10%-30% — please verify with your local tax authority',
  registrationUsd: 100,
  visaUsd: 200,
  sourceNote: '未能从店名识别具体国家，以下为跨地区小微企业通用参考区间，请务必核实修改',
  sourceNoteEn: 'Could not identify a specific country from the business name — the figures below are a general cross-region reference; please verify and adjust'
};

/**
 * 属地税收/公司注册/签证成本 AI 预估（第5点）：根据店名/地区关键词与当前主币种，
 * 给出该地区大致企业税率区间说明 + 注册费用与签证费用的估值（已折算为主币种），
 * 供用户在表单中核实、并可自由修改覆盖，不直接参与最终打分计算。
 */
export function inferRegulatoryCosts(
  projectNameOrCountry: string,
  baseCurrency: CurrencyCode = 'USD',
  language: Language = 'zh'
): RegulatoryCostEstimate & { registrationLocal: number; visaLocal: number } {
  const pLower = (projectNameOrCountry || '').toLowerCase();
  // 只有当店名/地区文本里真的出现了可识别的地区关键词时，才使用该国的税率/注册/签证成本表；
  // 否则一律回退到"通用/未识别地区"参考值，不能因为当前主币种恰好是 USD
  // 就把美国的属地合规成本标准套到一个完全没提及地区的项目上。
  const detectedCurrency = detectCountryCurrency(pLower);
  const table = detectedCurrency ? REGULATORY_COST_TABLE[detectedCurrency] || DEFAULT_REGULATORY_ESTIMATE : DEFAULT_REGULATORY_ESTIMATE;
  const rate = SUPPORTED_CURRENCIES.find((c) => c.code === baseCurrency)?.rateToUsd || 1;
  const toLocal = (usd: number) => Math.round(usd * rate);
  const isEn = language === 'en';

  return {
    countryLabel: isEn ? table.countryLabelEn : table.countryLabel,
    corporateTaxRateHint: isEn ? table.taxHintEn : table.taxHint,
    companyRegistrationCostEstimateUsd: table.registrationUsd,
    visaFeeCostEstimateUsd: table.visaUsd,
    sourceNote: isEn ? table.sourceNoteEn : table.sourceNote,
    registrationLocal: toLocal(table.registrationUsd),
    visaLocal: toLocal(table.visaUsd)
  };
}
