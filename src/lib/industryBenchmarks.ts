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
    id: 'medical_health',
    nameZh: '🩺 医疗健康 / 爱心义诊所 (Healthcare Clinic)',
    nameEn: 'Community Clinic & Healthcare',
    typicalGrossMargin: '50% - 70%',
    typicalOpexRatio: '25% - 40%',
    typicalNetMargin: '15% - 30%',
    typicalCashRunway: '≥ 3.5 个月',
    naturalLanguageSummaryZh: '在工场办爱心诊所，药品耗材直接采购支出通常占进账的三到四成。扣除场地租金和本地护士补贴后，能留有 15% 到 30% 结余用于救助与设备维护是最健康的。',
    naturalLanguageSummaryEn: 'For community clinics, medical supplies take 30%-45% of receipts. Keeping 15%-30% surplus ensures long-term compassionate care.',
    keyAdviceZh: '建立常用救命药品的安全库存警戒线，与诚信医药批发商签订稳定保供协议。',
    keyAdviceEn: 'Maintain essential emergency medicine buffer and negotiate direct distributor supply.'
  },
  {
    id: 'education_training',
    nameZh: '📚 语言学习与文化辅导 (Language & Education)',
    nameEn: 'Language Learning & Youth Tutoring',
    typicalGrossMargin: '75% - 90%',
    typicalOpexRatio: '45% - 65%',
    typicalNetMargin: '20% - 35%',
    typicalCashRunway: '≥ 3.0 个月',
    naturalLanguageSummaryZh: '做语言教学和课后辅导，教材文具等直接耗材成本很低（仅占一成左右），最大支出是教室租金和当地老师薪资，整体结余在 20% 到 35% 即可良性运转。',
    naturalLanguageSummaryEn: 'Education services have low material costs (10%-15%). Rent and teacher pay dominate. A 20%-35% net margin provides stable operations.',
    keyAdviceZh: '丰富高价值实用技能课（如商务口语/计算机实操），利用老学员口碑推荐降低招募成本。',
    keyAdviceEn: 'Introduce high-demand practical skills to boost enrollment retention.'
  },
  {
    id: 'vocational_training',
    nameZh: '🛠️ 青年职业技能与IT实训 (Vocational & IT Training)',
    nameEn: 'Vocational IT & Skills School',
    typicalGrossMargin: '60% - 80%',
    typicalOpexRatio: '35% - 50%',
    typicalNetMargin: '18% - 32%',
    typicalCashRunway: '≥ 3.0 个月',
    naturalLanguageSummaryZh: '职业技能实训需要消耗工具耗材与电力网络，硬件耗材一般占二至三成，扣除场地与实训老师补贴后，维持两成以上的结余能支持设备定期更新升级。',
    naturalLanguageSummaryEn: 'Vocational training requires hardware and utilities (20%-30%). Retaining 20%+ surplus supports routine lab equipment upgrades.',
    keyAdviceZh: '与当地企业或合作社对接就业实习，提升毕业青年就业率与社会好评度。',
    keyAdviceEn: 'Partner with local enterprises for youth internships and placements.'
  },
  {
    id: 'child_care',
    nameZh: '🧒 贫困儿童日托与学前启蒙 (Childcare & Early Learning)',
    nameEn: 'Community Childcare & Early Learning',
    typicalGrossMargin: '65% - 85%',
    typicalOpexRatio: '40% - 60%',
    typicalNetMargin: '15% - 25%',
    typicalCashRunway: '≥ 3.5 个月',
    naturalLanguageSummaryZh: '儿童日托与启蒙注重营养辅餐与卫生安全，食材与益智玩具耗材约占两成，主要支出在看护同工薪水与安全场地，保持稳健结余以应对突发公共卫生需求。',
    naturalLanguageSummaryEn: 'Childcare emphasizes nutrition and safety. Maintaining 3.5+ months of reserves protects vulnerable children during community emergencies.',
    keyAdviceZh: '保障孩子每日营养膳食安全，定期组织家长交流日，建立深厚的社区互信。',
    keyAdviceEn: 'Ensure high child safety and nutrition standards with frequent parent check-ins.'
  },
  {
    id: 'community_service',
    nameZh: '🤝 社区综合便民与助残帮扶 (Community Care Service)',
    nameEn: 'Community Help & Social Care',
    typicalGrossMargin: '70% - 85%',
    typicalOpexRatio: '40% - 60%',
    typicalNetMargin: '15% - 30%',
    typicalCashRunway: '≥ 4.0 个月',
    naturalLanguageSummaryZh: '社区综合服务主要帮助孤寡老弱与贫困家庭，以服务和关怀为主，备用金储备建议达到 4 个月以上，以在当地遇到自然灾害或突发困难时能施以援手。',
    naturalLanguageSummaryEn: 'Community social care supports the marginalized. Having 4+ months of liquidity enables timely emergency assistance during local crises.',
    keyAdviceZh: '善用志愿者网络与本地爱心伙伴资源，建立透明的救助善款与物资流转档案。',
    keyAdviceEn: 'Leverage local volunteer networks and maintain transparent aid distribution records.'
  }
];

export function getIndustryBenchmark(industryId: string): IndustryBenchmark {
  const found = INDUSTRY_BENCHMARKS.find((b) => b.id === industryId || b.nameZh.includes(industryId));
  return found || INDUSTRY_BENCHMARKS[0];
}
