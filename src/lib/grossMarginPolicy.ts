/**
 * 毛利口径（会计口径）与分行业 / 分细分业态的毛利率红线。
 *
 * 会计上 毛利 = 营业收入 − 营业成本，营业成本是"为取得这笔收入直接发生的成本"：
 *   - 卖货型生意（零售/餐饮/农业）：营业成本基本就是进货/原材料成本；
 *   - 服务型生意（教育培训/职业实训/托育/美业/诊所）："产品"本身就是人提供的服务，
 *     授课老师、技师、护理员等一线人员的工资属于直接人工，应计入营业成本；
 *     前台、行政、招生、店长等管理人员工资仍属期间费用（OPEX），在毛利之后扣除。
 *
 * 因此毛利率红线不能只按"服务型 / 卖货型"粗分，也不能让同一大类下的所有细分业态共用一条线：
 * 同属"农业"，大宗粮食、果蔬批发的正常毛利常低于 20%，而采摘、农产品直销则适合 20% 以上的底线；
 * 同属"零售"，批发贸易与专营精品店的毛利水平也相差数倍。
 *
 * 结构：大类（industry）→ 细分业态（MarginProfile）→ 红线 / 预警 / 评分档位（GrossMarginPolicy）。
 * 数值为按行业经验估算的方向性基准，不是监管标准；每个大类都有自己的兜底业态，
 * 细分业态由项目文字（名称 / 业务描述）关键词或沙盒里的 AI 判定得出。
 */

/** 一线服务人员工资构成主要营业成本的行业（表单默认展示"直接服务人工"一栏） */
export const DIRECT_SERVICE_LABOR_INDUSTRIES = [
  'education_training',
  'vocational_training',
  'child_care',
  'community_service',
  'medical_health'
] as const;

export function usesDirectServiceLabor(industry: string | undefined): boolean {
  return (DIRECT_SERVICE_LABOR_INDUSTRIES as readonly string[]).includes(industry || '');
}

export interface GrossMarginPolicy {
  /** GATE-2 通过线（%），即红线 */
  passAt: number;
  /** GATE-2 警告线（%），低于该值直接 FAIL；passAt 与 warnAt 之间为预警区间 */
  warnAt: number;
  /** 毛利率评分 excellent 档（%） */
  excellentAt: number;
  /** 毛利率评分 good 档（%） */
  goodAt: number;
  /** 毛利率达到该值即得满分 100（%），评分 = 毛利率 / fullScoreAt × 100 */
  fullScoreAt: number;
}

/** 细分业态：毛利率红线的最小适用单位 */
export interface MarginProfile {
  id: string;
  /** 所属大类，取值同 INDUSTRY_BENCHMARKS 的 id */
  industry: string;
  nameZh: string;
  nameEn: string;
  /** 业态说明，同时给 AI 判定当候选项的释义 */
  descZh: string;
  descEn: string;
  /** 本地判定用关键词（小写，中英文混合）；命中越多越优先 */
  keywords: string[];
  /** 是否为该大类的兜底业态（无法细分时使用） */
  isDefault?: boolean;
  policy: GrossMarginPolicy;
}

const p = (passAt: number, warnAt: number, excellentAt: number, goodAt: number, fullScoreAt: number): GrossMarginPolicy => ({
  passAt,
  warnAt,
  excellentAt,
  goodAt,
  fullScoreAt
});

export const MARGIN_PROFILES: MarginProfile[] = [
  // —— 餐饮烘焙：营业成本 = 食材 / 包材（人工在固定开销里）——
  {
    id: 'fb_cafe_bakery',
    industry: 'food_beverage',
    nameZh: '咖啡 / 烘焙 / 茶饮甜品',
    nameEn: 'Cafe, bakery & drinks',
    descZh: '以咖啡、饮品、烘焙、甜点为主，食材成本占比低，毛利高',
    descEn: 'Coffee, drinks, baked goods and desserts; low ingredient share, high margin',
    keywords: ['咖啡', '烘焙', '面包', '蛋糕', '甜点', '甜品', '茶饮', '奶茶', '饮品', '果汁', 'coffee', 'cafe', 'bakery', 'bread', 'cake', 'dessert', 'tea shop', 'bubble tea', 'juice'],
    policy: p(45, 35, 65, 55, 70)
  },
  {
    id: 'fb_restaurant',
    industry: 'food_beverage',
    nameZh: '正餐 / 快餐 / 小吃',
    nameEn: 'Restaurant, fast food & snacks',
    descZh: '堂食正餐、快餐、小吃、早餐摊，食材成本约三到四成',
    descEn: 'Dine-in restaurants, fast food, snack and breakfast stalls; food cost around 30–40%',
    keywords: ['餐厅', '餐馆', '饭店', '快餐', '小吃', '早餐', '面馆', '火锅', '烧烤', '食堂', 'restaurant', 'diner', 'fast food', 'snack', 'noodle', 'bbq', 'canteen'],
    policy: p(40, 30, 60, 50, 65)
  },
  {
    id: 'fb_catering_wholesale',
    industry: 'food_beverage',
    nameZh: '团餐 / 外卖 / 食品加工批发',
    nameEn: 'Catering, delivery & food wholesale',
    descZh: '团体订餐、外卖平台、中央厨房、食品加工批发，走量低价，毛利偏薄',
    descEn: 'Group catering, delivery platforms, central kitchen and food wholesale; high volume, thin margin',
    keywords: ['团餐', '外卖', '中央厨房', '食品加工', '食品批发', '配送', 'catering', 'delivery', 'central kitchen', 'food wholesale'],
    policy: p(25, 15, 45, 35, 50)
  },
  {
    id: 'fb_default',
    industry: 'food_beverage',
    nameZh: '餐饮（未细分）',
    nameEn: 'Food & beverage (general)',
    descZh: '无法判断具体餐饮业态时使用的中间口径',
    descEn: 'Mid-point standard when the specific food business cannot be told',
    keywords: ['餐饮', '美食', '食品', 'food', 'beverage'],
    isDefault: true,
    policy: p(35, 25, 55, 45, 60)
  },

  // —— 零售 ——
  {
    id: 'retail_grocery',
    industry: 'retail_store',
    nameZh: '便利店 / 社区超市 / 平价百货',
    nameEn: 'Convenience & grocery',
    descZh: '日用品、食品饮料走量，毛利低、靠周转',
    descEn: 'Daily necessities and groceries; low margin, driven by turnover',
    keywords: ['便利店', '超市', '杂货', '百货', '小卖部', '商超', '日用品', 'convenience', 'grocery', 'supermarket', 'mini mart', 'general store'],
    policy: p(18, 10, 32, 25, 35)
  },
  {
    id: 'retail_specialty',
    industry: 'retail_store',
    nameZh: '专营店 / 服饰 / 礼品 / 文创',
    nameEn: 'Specialty, fashion & gift shop',
    descZh: '服饰、鞋包、礼品、文创、饰品等专营零售，加价空间较大',
    descEn: 'Fashion, gifts, crafts and accessories; larger mark-ups',
    keywords: ['服饰', '服装', '鞋包', '礼品', '文创', '饰品', '精品', '文具', '玩具', '书店', 'fashion', 'clothing', 'gift', 'boutique', 'accessories', 'stationery', 'bookstore'],
    policy: p(35, 25, 55, 45, 60)
  },
  {
    id: 'retail_wholesale',
    industry: 'retail_store',
    nameZh: '批发 / 贸易 / 分销',
    nameEn: 'Wholesale & trading',
    descZh: '批发、转手贸易、分销代理，毛利很薄，靠规模与回款',
    descEn: 'Wholesale, trading and distribution; very thin margin, driven by scale',
    keywords: ['批发', '贸易', '分销', '代理', '经销', '进出口', 'wholesale', 'trading', 'distribution', 'import', 'export'],
    policy: p(8, 4, 18, 12, 20)
  },
  {
    id: 'retail_default',
    industry: 'retail_store',
    nameZh: '零售（未细分）',
    nameEn: 'Retail (general)',
    descZh: '无法判断具体零售业态时使用的口径',
    descEn: 'Standard when the specific retail format cannot be told',
    keywords: ['零售', '商店', 'retail', 'shop', 'store'],
    isDefault: true,
    policy: p(15, 8, 30, 22, 33)
  },

  // —— 农业：大宗与直销差异最大 ——
  {
    id: 'agri_bulk',
    industry: 'agriculture',
    nameZh: '大宗粮食 / 果蔬基地 / 批发供货',
    nameEn: 'Bulk grain, produce base & wholesale',
    descZh: '粮食等大宗作物、果蔬基地批发供货，议价权弱，正常毛利常低于 20%',
    descEn: 'Bulk crops and wholesale produce supply; weak pricing power, normal margin often below 20%',
    keywords: ['粮食', '水稻', '小麦', '玉米', '大宗', '基地', '批发', '收购', '合作社', '蔬菜基地', '果蔬基地', 'grain', 'rice', 'wheat', 'maize', 'corn', 'bulk', 'wholesale', 'cooperative'],
    policy: p(12, 6, 25, 18, 30)
  },
  {
    id: 'agri_direct',
    industry: 'agriculture',
    nameZh: '采摘 / 农产品直销 / 农家乐',
    nameEn: 'U-pick, farm-direct sales & agritourism',
    descZh: '采摘园、社区直销、订阅配送、农家乐，直接面向消费者，溢价空间大',
    descEn: 'U-pick, community direct sales, subscription boxes and farm stays; sold direct to consumers',
    keywords: ['采摘', '直销', '直供', '订阅', '农家乐', '民宿', '有机', '生态种植', '社区支持农业', '自营农场', 'u-pick', 'pick-your-own', 'direct', 'csa', 'subscription', 'organic', 'agritourism', 'farm stay'],
    policy: p(20, 12, 45, 32, 55)
  },
  {
    id: 'agri_livestock',
    industry: 'agriculture',
    nameZh: '畜禽 / 水产养殖',
    nameEn: 'Livestock & aquaculture',
    descZh: '养猪牛羊鸡鸭鱼虾，饲料占大头，受周期与疫病影响大',
    descEn: 'Pigs, cattle, poultry, fish; feed-heavy and cycle/disease sensitive',
    keywords: ['养殖', '养猪', '养牛', '养羊', '养鸡', '养鸭', '养鱼', '水产', '畜牧', '蛋鸡', 'livestock', 'poultry', 'pig', 'cattle', 'fish', 'aquaculture', 'dairy', 'egg'],
    policy: p(15, 8, 30, 22, 35)
  },
  {
    id: 'agri_processing',
    industry: 'agriculture',
    nameZh: '农产品深加工',
    nameEn: 'Value-added food processing',
    descZh: '把农产品加工成干货、酱料、茶叶、榨油等成品再销售',
    descEn: 'Processing produce into dried goods, sauces, tea, oil and similar products',
    keywords: ['深加工', '加工', '酱', '干货', '茶叶', '榨油', '罐头', '腌制', '烘干', 'processing', 'processed', 'sauce', 'dried', 'tea leaves', 'oil press', 'canning'],
    policy: p(25, 15, 40, 30, 45)
  },
  {
    id: 'agri_default',
    industry: 'agriculture',
    nameZh: '农业（未细分）',
    nameEn: 'Agriculture (general)',
    descZh: '无法判断具体农业业态时使用的口径',
    descEn: 'Standard when the specific agricultural business cannot be told',
    keywords: ['农业', '种植', '农场', '农产品', 'farm', 'farming', 'agriculture', 'crop', 'plantation'],
    isDefault: true,
    policy: p(15, 8, 35, 25, 40)
  },

  // —— 医疗健康：营业成本含药品耗材 + 医护直接人工 ——
  {
    id: 'med_pharmacy',
    industry: 'medical_health',
    nameZh: '药房 / 药品与保健品零售',
    nameEn: 'Pharmacy & health products retail',
    descZh: '以药品、保健品、医疗器械销售为主，进货成本高',
    descEn: 'Mostly selling medicines, supplements and devices; high purchase cost',
    keywords: ['药房', '药店', '药品', '保健品', '医疗器械', 'pharmacy', 'drugstore', 'medicine shop', 'supplement'],
    policy: p(18, 10, 35, 25, 40)
  },
  {
    id: 'med_clinic',
    industry: 'medical_health',
    nameZh: '门诊 / 诊所 / 康复理疗',
    nameEn: 'Clinic, dental & rehab',
    descZh: '诊疗服务为主，医护工资计入营业成本',
    descEn: 'Mainly clinical services; doctor and nurse pay counts as cost of sales',
    keywords: ['门诊', '诊所', '义诊', '牙科', '中医', '理疗', '康复', '体检', 'clinic', 'dental', 'rehab', 'physiotherapy', 'checkup'],
    isDefault: true,
    policy: p(25, 15, 45, 30, 55)
  },

  // —— 语言教育 ——
  {
    id: 'edu_online',
    industry: 'education_training',
    nameZh: '线上课程 / 录播 / 知识付费',
    nameEn: 'Online & recorded courses',
    descZh: '线上直播、录播课程，边际成本低',
    descEn: 'Live or recorded online courses; low marginal cost',
    keywords: ['线上', '网课', '录播', '直播课', '知识付费', 'online', 'e-learning', 'recorded', 'webinar', 'mooc'],
    policy: p(50, 35, 70, 60, 75)
  },
  {
    id: 'edu_tutoring',
    industry: 'education_training',
    nameZh: '语言 / 课后辅导 / 线下培训',
    nameEn: 'Language & tutoring (offline)',
    descZh: '线下班课、一对一辅导，授课老师课酬计入营业成本',
    descEn: 'In-person classes and tutoring; teacher pay counts as cost of sales',
    keywords: ['语言', '辅导', '补习', '课后', '英语', '培训班', 'language', 'tutoring', 'after-school', 'english', 'class'],
    isDefault: true,
    policy: p(30, 20, 45, 30, 60)
  },

  // —— 职业实训 ——
  {
    id: 'voc_craft_workshop',
    industry: 'vocational_training',
    nameZh: '手工工坊（边学边产、产品销售）',
    nameEn: 'Craft workshop (produce & sell)',
    descZh: '学员或匠人制作手工产品对外销售，成本含原料与加工人工',
    descEn: 'Learners or artisans make goods for sale; cost includes materials and production labor',
    keywords: ['手工', '工坊', '编织', '陶艺', '木工', '缝纫', '刺绣', '工艺品', 'handicraft', 'artisan', 'workshop', 'weaving', 'pottery', 'woodwork', 'sewing', 'craft'],
    policy: p(30, 20, 50, 40, 55)
  },
  {
    id: 'voc_training',
    industry: 'vocational_training',
    nameZh: '职业技能 / IT 实训',
    nameEn: 'Vocational & IT training',
    descZh: '以技能培训收费为主，实训老师课酬计入营业成本',
    descEn: 'Revenue mainly from training fees; instructor pay counts as cost of sales',
    keywords: ['实训', '技能', 'it培训', '电脑', '编程', '维修培训', '职业', 'vocational', 'skills', 'coding', 'it training', 'repair training'],
    isDefault: true,
    policy: p(30, 20, 45, 30, 55)
  },

  // —— 儿童日托 ——
  {
    id: 'child_care_default',
    industry: 'child_care',
    nameZh: '儿童日托 / 启蒙 / 托育',
    nameEn: 'Childcare & early learning',
    descZh: '餐食教具加保育老师工资计入营业成本',
    descEn: 'Meals, supplies and caregiver pay count as cost of sales',
    keywords: ['日托', '托育', '托管', '幼儿', '启蒙', '儿童', 'childcare', 'daycare', 'nursery', 'kindergarten', 'preschool'],
    isDefault: true,
    policy: p(25, 15, 40, 25, 50)
  },

  // —— 社区综合服务 ——
  {
    id: 'cs_beauty',
    industry: 'community_service',
    nameZh: '美容美发 / 美甲 / 按摩',
    nameEn: 'Beauty, hair & massage',
    descZh: '技师服务为主，技师工资计入营业成本',
    descEn: 'Technician-led services; technician pay counts as cost of sales',
    keywords: ['美容', '美发', '理发', '美甲', '按摩', '足浴', 'beauty', 'salon', 'hair', 'barber', 'nail', 'massage', 'spa'],
    isDefault: true,
    policy: p(30, 20, 50, 35, 60)
  },
  {
    id: 'cs_home_repair',
    industry: 'community_service',
    nameZh: '家政 / 洗衣 / 维修',
    nameEn: 'Housekeeping, laundry & repair',
    descZh: '上门家政、洗衣、手机家电维修',
    descEn: 'Home cleaning, laundry, phone and appliance repair',
    keywords: ['家政', '保洁', '洗衣', '维修', '修理', '上门', 'housekeeping', 'cleaning', 'laundry', 'repair', 'maintenance'],
    policy: p(30, 20, 50, 40, 55)
  },
  {
    id: 'cs_care',
    industry: 'community_service',
    nameZh: '助残 / 养老 / 社区照护',
    nameEn: 'Disability, elderly & community care',
    descZh: '护理员人工占比高、收费受限，带公益性质，毛利天然偏低',
    descEn: 'Labor-heavy and fee-capped with a charitable element; naturally lower margin',
    keywords: ['助残', '养老', '护理', '照护', '长者', '老人', '残障', '帮扶', 'elderly', 'eldercare', 'disabled', 'disability', 'caregiving', 'nursing home', 'charity'],
    policy: p(20, 10, 40, 30, 45)
  },

  // —— 自定义 / 其他 ——
  {
    id: 'custom_default',
    industry: 'custom',
    nameZh: '自定义 / 其他（通用口径）',
    nameEn: 'Custom / other (general)',
    descZh: '行业无法归入已有分类时使用的通用口径',
    descEn: 'General standard when the business fits no listed category',
    keywords: [],
    isDefault: true,
    policy: p(20, 10, 40, 25, 100 / 1.8)
  }
];

/** 表单里出现过、但不在基准库里的行业 key，归并到最接近的大类 */
const INDUSTRY_ALIASES: Record<string, string> = {
  handicraft: 'vocational_training',
  artisan_handicraft: 'vocational_training',
  tech_service: 'community_service',
  other: 'custom',
  __CUSTOM__: 'custom'
};

const KNOWN_INDUSTRIES = new Set(MARGIN_PROFILES.map((m) => m.industry));

export function normalizeMarginIndustry(industry: string | undefined): string {
  const key = industry || '';
  if (INDUSTRY_ALIASES[key]) return INDUSTRY_ALIASES[key];
  return KNOWN_INDUSTRIES.has(key) ? key : 'custom';
}

export function getMarginProfileById(id: string | undefined): MarginProfile | undefined {
  return id ? MARGIN_PROFILES.find((m) => m.id === id) : undefined;
}

/** 某大类下可选的细分业态（自定义 / 未知大类返回全部，由文字判定去匹配） */
export function marginProfilesForIndustry(industry: string | undefined): MarginProfile[] {
  const key = normalizeMarginIndustry(industry);
  return key === 'custom' ? MARGIN_PROFILES.filter((m) => m.industry !== 'custom') : MARGIN_PROFILES.filter((m) => m.industry === key);
}

export function defaultMarginProfile(industry: string | undefined): MarginProfile {
  const key = normalizeMarginIndustry(industry);
  return (
    MARGIN_PROFILES.find((m) => m.industry === key && m.isDefault) ||
    MARGIN_PROFILES.find((m) => m.id === 'custom_default')!
  );
}

export interface LocalMarginMatch {
  profile: MarginProfile;
  /** 命中的关键词 */
  matched: string[];
  /** true = 命中了具体业态（非兜底） */
  specific: boolean;
}

/**
 * 本地确定性判定：在候选业态里按关键词命中数挑最优；一个都没命中时回落到该大类的兜底业态。
 * 具体业态优先于兜底业态（兜底业态的关键词只是泛称，如"农业""餐饮"）。
 */
export function classifyMarginProfileLocal(industry: string | undefined, text: string): LocalMarginMatch {
  const haystack = (text || '').toLowerCase();
  let best: LocalMarginMatch | null = null;
  if (haystack.trim()) {
    for (const profile of marginProfilesForIndustry(industry)) {
      const matched = profile.keywords.filter((k) => haystack.includes(k));
      if (matched.length === 0) continue;
      const specific = !profile.isDefault;
      const better =
        !best ||
        (specific && !best.specific) ||
        (specific === best.specific && matched.length > best.matched.length);
      if (better) best = { profile, matched, specific };
    }
  }
  if (best && best.specific) return best;
  return { profile: best?.profile ?? defaultMarginProfile(industry), matched: best?.matched ?? [], specific: false };
}

export type MarginProfileBasis = 'selected' | 'keyword' | 'default';

export interface ResolvedMarginProfile {
  profile: MarginProfile;
  basis: MarginProfileBasis;
}

/**
 * 解析一个项目实际适用的细分业态：
 *   1. 已保存的 marginProfileId（AI 判定或用户手选），且属于当前大类 → 直接采用；
 *   2. 否则用项目文字做本地关键词判定；
 *   3. 仍判不出 → 该大类兜底业态。
 */
export function resolveMarginProfile(
  industry: string | undefined,
  opts: { profileId?: string; text?: string } = {}
): ResolvedMarginProfile {
  const saved = getMarginProfileById(opts.profileId);
  if (saved) {
    const key = normalizeMarginIndustry(industry);
    if (key === 'custom' || saved.industry === key) return { profile: saved, basis: 'selected' };
  }
  const local = classifyMarginProfileLocal(industry, opts.text || '');
  return { profile: local.profile, basis: local.specific ? 'keyword' : 'default' };
}

/** 兼容旧调用：只传大类时返回该大类兜底业态的口径；传 profileId 则取该业态的口径 */
export function getGrossMarginPolicy(industry: string | undefined, profileId?: string): GrossMarginPolicy {
  return resolveMarginProfile(industry, { profileId }).profile.policy;
}

/** 红线（通过线）与预警区间的一句话描述 */
export function describeMarginPolicy(policy: GrossMarginPolicy, isEn = false): string {
  return isEn
    ? `Red line ${policy.passAt}%; warning zone ${policy.warnAt}%–${policy.passAt}%; below ${policy.warnAt}% fails`
    : `红线 ${policy.passAt}%；预警区间 ${policy.warnAt}%–${policy.passAt}%；低于 ${policy.warnAt}% 不通过`;
}
