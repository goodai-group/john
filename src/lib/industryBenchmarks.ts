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
  // 全球小微样本的月均总流水参考区间（统一以 USD 存储），展示时按用户主报告币种实时换算，
  // 避免像固定文案那样只用人民币数字、其他币种用户无法直接对比。仅供方向性参考。
  typicalMonthlyRevenueUsdRange: [number, number];
}

export const INDUSTRY_BENCHMARKS: IndustryBenchmark[] = [
  {
    id: 'food_beverage',
    nameZh: '餐饮烘焙 / 社区咖啡 (Bakery & Cafe)',
    nameEn: 'Bakery, Coffee Shop & Catering',
    typicalGrossMargin: '55% - 70%',
    typicalOpexRatio: '30% - 48%',
    typicalNetMargin: '12% - 25%',
    typicalCashRunway: '≥ 3.0 个月',
    naturalLanguageSummaryZh: '餐饮烘焙与社区咖啡馆，直接食材（咖啡豆、面粉、乳制品）与打包耗材通常占总进账的 30% 到 45%。注意控制临街铺租与咖啡师人工，保持 15% 净结余可长期良性运转。',
    naturalLanguageSummaryEn: 'Food & cafe material costs take 30%-45% of revenue. Keeping rent & labor balanced ensures a solid 15%+ profit margin.',
    keyAdviceZh: '严控高损耗生鲜原辅料库存，推出特色高毛利单品组合与外带套餐。',
    keyAdviceEn: 'Minimize perishable ingredient wastage and promote high-margin signature sets.',
    typicalMonthlyRevenueUsdRange: [6200, 16600]
  },
  {
    id: 'medical_health',
    nameZh: '医疗健康 / 爱心义诊所 (Healthcare Clinic)',
    nameEn: 'Community Clinic & Healthcare',
    // 毛利为会计口径：营业成本 = 药品耗材 + 医生/护士等直接诊疗人工
    typicalGrossMargin: '30% - 50%',
    typicalOpexRatio: '10% - 20%',
    typicalNetMargin: '15% - 30%',
    typicalCashRunway: '≥ 3.5 个月',
    naturalLanguageSummaryZh: '在工场办爱心诊所，药品耗材直接采购支出通常占进账的三到四成，再加上医生护士等一线诊疗人工，扣除后的毛利一般在三到五成。再扣除场地租金和行政开销后，能留有 15% 到 30% 结余用于救助与设备维护是最健康的。',
    naturalLanguageSummaryEn: 'For community clinics, medical supplies take 30%-45% of receipts; after clinical staff pay, gross margin is typically 30%-50%. Keeping 15%-30% surplus ensures long-term compassionate care.',
    keyAdviceZh: '建立常用救命药品的安全库存警戒线，与诚信医药批发商签订稳定保供协议。',
    keyAdviceEn: 'Maintain essential emergency medicine buffer and negotiate direct distributor supply.',
    typicalMonthlyRevenueUsdRange: [4000, 12000]
  },
  {
    id: 'retail_store',
    nameZh: '社区零售 / 平价商超 (Retail & Grocery)',
    nameEn: 'Community Retail & Grocery',
    typicalGrossMargin: '20% - 35%',
    typicalOpexRatio: '12% - 22%',
    typicalNetMargin: '6% - 15%',
    typicalCashRunway: '≥ 2.5 个月',
    naturalLanguageSummaryZh: '社区便利店与平价百货主要靠高频走量，大宗进货采购本钱占 65% 到 80%。虽然毛利率偏低，但租金和理货人工相对可控，周转迅速即可稳定盈利。',
    naturalLanguageSummaryEn: 'Retail grocery relies on fast inventory turnover with 65%-80% wholesale cost. Strict inventory control ensures consistent margins.',
    keyAdviceZh: '加快畅销生活必需品周转速度，定期清理滞销货品以防积压流动资金。',
    keyAdviceEn: 'Accelerate stock turnover for fast-moving staples and clear slow-moving inventory.',
    typicalMonthlyRevenueUsdRange: [8300, 34600]
  },
  {
    id: 'education_training',
    nameZh: '语言教育 / 辅导中心 (Language & Education)',
    nameEn: 'Language Learning & Youth Tutoring',
    // 毛利为会计口径：营业成本 = 教材教具 + 授课老师/助教课酬（直接服务人工）
    typicalGrossMargin: '35% - 60%',
    typicalOpexRatio: '15% - 30%',
    typicalNetMargin: '20% - 35%',
    typicalCashRunway: '≥ 3.0 个月',
    naturalLanguageSummaryZh: '做语言教学和课后辅导，教材文具等耗材只占一成左右，但授课老师与助教课酬属于直接成本，二者合计扣除后毛利一般在 35% 到 60%；再扣除教室租金与行政人员开销，整体结余在 20% 到 35% 即可良性运转。',
    naturalLanguageSummaryEn: 'Education materials are only ~10% of revenue, but teacher pay is a direct cost too, so gross margin is typically 35%-60%. After rent and admin staff, a 20%-35% net margin provides stable operations.',
    keyAdviceZh: '丰富高价值实用技能课（如商务口语/计算机实操），利用老学员口碑推荐降低招募成本。',
    keyAdviceEn: 'Introduce high-demand practical skills to boost enrollment retention.',
    typicalMonthlyRevenueUsdRange: [3000, 10000]
  },
  {
    id: 'vocational_training',
    nameZh: '职业实训 / 手工工坊 (Vocational & IT Training)',
    nameEn: 'Vocational IT & Skills School',
    // 毛利为会计口径：营业成本 = 实训耗材 + 实训老师课酬（直接服务人工）
    typicalGrossMargin: '35% - 55%',
    typicalOpexRatio: '15% - 25%',
    typicalNetMargin: '18% - 32%',
    typicalCashRunway: '≥ 3.0 个月',
    naturalLanguageSummaryZh: '职业技能实训需要消耗工具耗材与电力网络，硬件耗材一般占二至三成，加上实训老师课酬这类直接成本，毛利一般在 35% 到 55%；扣除场地与行政开销后，维持两成以上的结余能支持设备定期更新升级。',
    naturalLanguageSummaryEn: 'Vocational training materials take 20%-30%; with instructor pay as a direct cost, gross margin is typically 35%-55%. Retaining 20%+ surplus supports routine lab equipment upgrades.',
    keyAdviceZh: '与当地企业或合作社对接就业实习，提升毕业青年就业率与社会好评度。',
    keyAdviceEn: 'Partner with local enterprises for youth internships and placements.',
    typicalMonthlyRevenueUsdRange: [2800, 9000]
  },
  {
    id: 'agriculture',
    nameZh: '现代农业 / 生态种植 (Agriculture & Farming)',
    nameEn: 'Eco-Agriculture & Community Farm',
    typicalGrossMargin: '45% - 65%',
    typicalOpexRatio: '25% - 40%',
    typicalNetMargin: '15% - 30%',
    typicalCashRunway: '≥ 4.0 个月',
    naturalLanguageSummaryZh: '农业种植与养殖受季节气候影响大，种子种苗与有机肥料等直接投入约占三成半，需常备 4 个月以上开支储备以平稳度过播种期与休耕期。',
    naturalLanguageSummaryEn: 'Farming involves seasonal cycles. Material inputs take ~35%. Keeping 4+ months of liquidity supports off-season preparation.',
    keyAdviceZh: '发展耐储存深加工农产品，拓展社区预定与直采直销渠道。',
    keyAdviceEn: 'Develop value-added processed goods and community subscription distribution.',
    typicalMonthlyRevenueUsdRange: [2000, 8000]
  },
  {
    id: 'child_care',
    nameZh: '儿童日托 / 社区启蒙 (Childcare & Early Learning)',
    nameEn: 'Community Childcare & Early Learning',
    // 毛利为会计口径：营业成本 = 餐食教具 + 保育/看护老师工资（直接服务人工）
    typicalGrossMargin: '30% - 50%',
    typicalOpexRatio: '15% - 25%',
    typicalNetMargin: '15% - 25%',
    typicalCashRunway: '≥ 3.5 个月',
    naturalLanguageSummaryZh: '儿童日托与启蒙注重营养辅餐与卫生安全，食材与益智玩具耗材约占两成，看护老师薪水也属于直接成本，扣除后毛利一般在 30% 到 50%；再扣除安全场地与行政开销，保持稳健结余以应对突发公共卫生需求。',
    naturalLanguageSummaryEn: 'Childcare meals and supplies take ~20%; with caregiver pay as a direct cost, gross margin is typically 30%-50%. Maintaining 3.5+ months of reserves protects vulnerable children during community emergencies.',
    keyAdviceZh: '保障孩子每日营养膳食安全，定期组织家长交流日，建立深厚的社区互信。',
    keyAdviceEn: 'Ensure high child safety and nutrition standards with frequent parent check-ins.',
    typicalMonthlyRevenueUsdRange: [2500, 8500]
  },
  {
    id: 'community_service',
    nameZh: '社区综合便民与助残帮扶 (Community Care Service)',
    nameEn: 'Community Help & Social Care',
    // 毛利为会计口径：营业成本 = 耗材 + 技师/护理员等一线服务人工
    typicalGrossMargin: '40% - 60%',
    typicalOpexRatio: '20% - 30%',
    typicalNetMargin: '15% - 30%',
    typicalCashRunway: '≥ 4.0 个月',
    naturalLanguageSummaryZh: '社区综合服务（含美容美发等生活服务）以人工服务为主，技师与护理员工资属于直接成本，扣除后毛利一般在 40% 到 60%；备用金储备建议达到 4 个月以上，以在当地遇到自然灾害或突发困难时能施以援手。',
    naturalLanguageSummaryEn: 'Community and personal services are labor-driven; with front-line staff pay as a direct cost, gross margin is typically 40%-60%. Having 4+ months of liquidity enables timely emergency assistance during local crises.',
    keyAdviceZh: '善用志愿者网络与本地爱心伙伴资源，建立透明的救助善款与物资流转档案。',
    keyAdviceEn: 'Leverage local volunteer networks and maintain transparent aid distribution records.',
    typicalMonthlyRevenueUsdRange: [1500, 6000]
  },
  {
    id: 'custom',
    nameZh: '自定义实体 / 创新微创项目 (Custom Business)',
    nameEn: 'Custom Micro-Enterprise',
    typicalGrossMargin: '50% - 70%',
    typicalOpexRatio: '30% - 45%',
    typicalNetMargin: '15% - 28%',
    typicalCashRunway: '≥ 3.0 个月',
    naturalLanguageSummaryZh: '根据您自定义输入的实体经营特征，直接采购成本通常控制在 30% 到 45% 之间，固定房租与人工保持在四成以内，即可维持健康的持续自养能力。',
    naturalLanguageSummaryEn: 'For custom enterprises, maintaining direct costs around 30%-45% and OPEX under 40% ensures viable financial self-sustainability.',
    keyAdviceZh: '密切跟踪每笔业务的直接毛利空间，确保账面常备至少 3 个月的固定运营支出。',
    keyAdviceEn: 'Monitor gross margins per deal and maintain at least 3 months of OPEX cash buffer.',
    typicalMonthlyRevenueUsdRange: [3000, 12000]
  }
];

export function getIndustryBenchmark(industryId: string): IndustryBenchmark {
  if (!industryId) return INDUSTRY_BENCHMARKS[0];
  const found = INDUSTRY_BENCHMARKS.find(
    (b) => b.id === industryId || b.nameZh.toLowerCase().includes(industryId.toLowerCase())
  );
  if (found) return found;

  return {
    id: 'custom',
    nameZh: `${industryId}`,
    nameEn: industryId,
    typicalGrossMargin: '50% - 70%',
    typicalOpexRatio: '30% - 45%',
    typicalNetMargin: '15% - 28%',
    typicalCashRunway: '≥ 3.0 个月',
    naturalLanguageSummaryZh: `针对「${industryId}」，直接采购成本通常控制在 35% 左右，房租人工控制在 40% 以内，即可维持良性自养运转。`,
    naturalLanguageSummaryEn: `For ${industryId}, keeping materials around 35% and OPEX below 40% ensures healthy sustainability.`,
    keyAdviceZh: '跟踪核心成本变动，确保常备 3 个月以上固定开支现金储备。',
    keyAdviceEn: 'Track core unit economics and keep 3+ months of operating runway.',
    typicalMonthlyRevenueUsdRange: [3000, 12000]
  };
}
