export interface IndustryBenchmark {
  id: string;
  nameZh: string;
  nameEn: string;
  typicalGrossMargin: string;
  typicalOpexRatio: string;
  typicalNetMargin: string;
  typicalCashRunway: string;
  naturalLanguageSummaryZh: string;
  naturalLanguageSummaryEn: string;
  keyAdviceZh: string;
  keyAdviceEn: string;
}

export const INDUSTRY_BENCHMARKS: IndustryBenchmark[] = [
  {
    id: 'food_beverage',
    nameZh: '餐饮与熟食饮品 (Food & Beverage)',
    nameEn: 'Catering, Restaurant & Snacks',
    typicalGrossMargin: '45% - 65%',
    typicalOpexRatio: '30% - 45%',
    typicalNetMargin: '15% - 25%',
    typicalCashRunway: '≥ 2.5 个月',
    naturalLanguageSummaryZh: '做餐饮这行，食材直接成本一般占三到四成，扣除房租和人工后，一般能留在手里的纯利润要占总营业额的 15% 到 25% 才是健康状态。',
    naturalLanguageSummaryEn: 'In food service, raw ingredients typically take 35%-50% of revenue. After rent and staff, healthy net take-home margin should sit between 15% and 25%.',
    keyAdviceZh: '严格控制每日生鲜食材损耗，招牌高毛利饮品和小吃的连带点单是盈利关键。',
    keyAdviceEn: 'Minimize perishable food waste and push high-margin beverage combo deals.'
  },
  {
    id: 'grocery_retail',
    nameZh: '日用百货与社区超市 (Grocery & Retail)',
    nameEn: 'Grocery Store & Mini Mart',
    typicalGrossMargin: '25% - 40%',
    typicalOpexRatio: '15% - 25%',
    typicalNetMargin: '10% - 18%',
    typicalCashRunway: '≥ 3.0 个月',
    naturalLanguageSummaryZh: '做零售便利店这行，单件商品毛利虽然不像餐饮那么高（进货成本占大头），但胜在走量稳定，扣除电费和租金后，到手净利润在 10% 到 18% 算不错。',
    naturalLanguageSummaryEn: 'Grocery retail has tighter gross margins with high turnover. Keeping overhead low allows a consistent 10%-18% net profit margin.',
    keyAdviceZh: '压低滞销存货资金占用，加速应季畅销品周转是活水之源。',
    keyAdviceEn: 'Prevent slow-moving inventory build-up and negotiate batch purchase discounts.'
  },
  {
    id: 'agriculture_trade',
    nameZh: '农林牧渔与农产品贸易 (Agri-Produce & Livestock)',
    nameEn: 'Agriculture, Farming & Produce Trading',
    typicalGrossMargin: '30% - 50%',
    typicalOpexRatio: '15% - 30%',
    typicalNetMargin: '15% - 30%',
    typicalCashRunway: '≥ 4.0 个月',
    naturalLanguageSummaryZh: '搞农林贸易受季节和天气影响大，平时现金储备一定要充足，正常收成年份到手利润率要在 20% 以上，才能抵御淡季或减产风险。',
    naturalLanguageSummaryEn: 'Agri-trade is seasonal. Retaining at least 4 months of cash reserves is critical to buffer against bad weather or market price fluctuations.',
    keyAdviceZh: '农产品保鲜与就近直供能大幅减少中间损耗与长途运输运费。',
    keyAdviceEn: 'Invest in simple dry/cool storage to avoid forced discount selling during peak harvest.'
  },
  {
    id: 'artisan_handicraft',
    nameZh: '手工艺品与缝纫加工 (Artisan & Tailoring)',
    nameEn: 'Handicraft, Sewing & Artisan Goods',
    typicalGrossMargin: '50% - 75%',
    typicalOpexRatio: '25% - 40%',
    typicalNetMargin: '20% - 35%',
    typicalCashRunway: '≥ 2.0 个月',
    naturalLanguageSummaryZh: '手工艺主要卖的是手艺和工时，原料成本占比低、毛利高，只要订单稳定，每月能留下 25% 到 35% 的净纯利。',
    naturalLanguageSummaryEn: 'Handicrafts feature high gross margins since labor is the primary input. Maintaining consistent order flow yields 20%-35% net profit.',
    keyAdviceZh: '注重工件质量与特色定制溢价，开拓稳定的礼品店或海外代购批发渠道。',
    keyAdviceEn: 'Focus on distinctive local designs with premium pricing for export or tourist markets.'
  },
  {
    id: 'personal_services',
    nameZh: '个人服务与汽修理发 (Services, Repair & Grooming)',
    nameEn: 'Personal Services, Salon & Vehicle Repair',
    typicalGrossMargin: '60% - 85%',
    typicalOpexRatio: '35% - 55%',
    typicalNetMargin: '20% - 35%',
    typicalCashRunway: '≥ 2.5 个月',
    naturalLanguageSummaryZh: '服务与维修业几乎没有大额进货成本，最大开销是师傅工资和店铺租金，控制好这两样，到手纯利润一般能在 20% 到 35% 之间。',
    naturalLanguageSummaryEn: 'Service and repair businesses have minimal raw material costs; managing rent and technician pay yields strong 20%-35% net margin.',
    keyAdviceZh: '通过会员制或老客户介绍维持稳定复购，减少店面闲置工时。',
    keyAdviceEn: 'Implement repeat customer loyalty programs to ensure smooth week-to-week utilization.'
  },
  {
    id: 'logistics_transport',
    nameZh: '货运跑腿与微型物流 (Local Logistics & Dispatch)',
    nameEn: 'Local Transport, Delivery & Dispatch',
    typicalGrossMargin: '35% - 50%',
    typicalOpexRatio: '20% - 35%',
    typicalNetMargin: '12% - 22%',
    typicalCashRunway: '≥ 3.0 个月',
    naturalLanguageSummaryZh: '跑运输主要吃燃油和车辆折旧保养，油费占了直接成本的大半，月净挣在 15% 左右算平稳运行。',
    naturalLanguageSummaryEn: 'Transport relies on fuel and vehicle maintenance costs. A net margin around 15% is the standard target.',
    keyAdviceZh: '优化回头车路线配载，减少空驶里程，定期保养避免突发大修抛锚。',
    keyAdviceEn: 'Optimize two-way return cargo routing to avoid deadheading.'
  }
];

export function getIndustryBenchmark(industryId: string): IndustryBenchmark {
  const found = INDUSTRY_BENCHMARKS.find((b) => b.id === industryId || b.nameZh.includes(industryId));
  return found || INDUSTRY_BENCHMARKS[0];
}
