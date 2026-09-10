import { LearningVideo } from '../types';

/**
 * 第4点：商业知识学习中心的视频清单。
 * - source: 'internal' 指向站内已有素材（如开场品牌片）；'youtube' 指向 YouTube 搜索结果页，
 *   避免直接拼接猜测的视频 ID（可能已失效或指向错误内容），改由运营同工后续用真实
 *   已核实过的播放链接替换 url 字段即可，数据结构与页面逻辑无需改动。
 * - 分类覆盖用户提出的"成本核算/盈亏平衡/签证与合规/现金流"等商业基础知识主题。
 */
export const LEARNING_VIDEOS: LearningVideo[] = [
  {
    id: 'intro-brand-film',
    titleZh: '3 分钟看懂：商业健康体检仪是什么',
    titleEn: '3-Minute Intro: What is the Business Health Check Tool',
    descriptionZh: '本平台的品牌介绍短片，快速了解体检报告能帮你看懂哪些经营问题。',
    descriptionEn: 'Our brand intro video — a quick overview of what the health check report tells you.',
    category: '平台入门',
    categoryEn: 'Getting Started',
    source: 'internal',
    url: '/intro.mp4',
    durationMinutes: 2
  },
  {
    id: 'yt-cost-accounting-basics',
    titleZh: '小微生意成本核算入门（含税收、注册与设备折旧）',
    titleEn: 'Cost Accounting Basics for Micro-Businesses (Tax, Registration & Depreciation)',
    descriptionZh: '学习如何把税收、公司注册费、签证费用、设备折旧这些容易被忽略的成本都算进生意的真实开销。',
    descriptionEn: 'Learn how to fold taxes, registration fees, visa costs, and equipment depreciation into your true cost of doing business.',
    category: '成本核算',
    categoryEn: 'Cost Accounting',
    source: 'youtube',
    url: 'https://www.youtube.com/results?search_query=small+business+cost+accounting+tax+registration+depreciation+for+beginners',
    durationMinutes: 12
  },
  {
    id: 'yt-break-even-point',
    titleZh: '什么是保本点：每天至少要卖多少才不亏钱',
    titleEn: 'Understanding Break-Even Point: Minimum Daily Sales to Avoid Losses',
    descriptionZh: '用大白话讲清楚保本点（Break-Even Point）的概念，配合本平台的「保本收入」自动计算功能一起使用效果更好。',
    descriptionEn: 'A plain-language explanation of break-even point — pairs well with this platform’s automatic break-even calculator.',
    category: '盈亏平衡',
    categoryEn: 'Break-Even Analysis',
    source: 'youtube',
    url: 'https://www.youtube.com/results?search_query=break+even+point+explained+small+business+simple',
    durationMinutes: 8
  },
  {
    id: 'yt-visa-work-permit-costs',
    titleZh: '海外经营者签证与工作许可费用怎么规划',
    titleEn: 'Planning Visa & Work Permit Costs for Overseas Entrepreneurs',
    descriptionZh: '介绍常见的经营者签证、工作许可申请流程与费用构成，帮助你把这部分成本准确计入财务测算。',
    descriptionEn: 'Overview of common entrepreneur visa and work permit application costs, so you can accurately fold them into your financial plan.',
    category: '签证与合规',
    categoryEn: 'Visa & Compliance',
    source: 'youtube',
    url: 'https://www.youtube.com/results?search_query=business+visa+work+permit+cost+overseas+entrepreneur+guide',
    durationMinutes: 10
  },
  {
    id: 'yt-company-registration-guide',
    titleZh: '海外注册小微公司：流程与费用一次讲清楚',
    titleEn: 'Registering a Small Business Overseas: Process & Costs Explained',
    descriptionZh: '不同国家公司注册流程差异很大，这类视频能帮你建立基本认知框架，再结合本平台的属地成本预估核实细节。',
    descriptionEn: 'Company registration varies a lot by country — build a basic mental model here, then verify specifics with this platform’s local cost estimate.',
    category: '签证与合规',
    categoryEn: 'Visa & Compliance',
    source: 'youtube',
    url: 'https://www.youtube.com/results?search_query=how+to+register+a+small+business+overseas+cost+process',
    durationMinutes: 11
  },
  {
    id: 'yt-cashflow-runway',
    titleZh: '现金流跑道：备用金到底要留几个月',
    titleEn: 'Cash Runway: How Many Months of Reserve Do You Really Need',
    descriptionZh: '讲解现金跑道（Cash Runway）概念与常见安全月数标准，理解报告里「能撑几个月」这一指标的由来。',
    descriptionEn: 'Explains cash runway and common safety thresholds — helps you understand the "months of survival" metric in your report.',
    category: '现金流管理',
    categoryEn: 'Cash Flow Management',
    source: 'youtube',
    url: 'https://www.youtube.com/results?search_query=cash+runway+small+business+how+many+months+reserve',
    durationMinutes: 9
  },
  {
    id: 'yt-gross-margin-pricing',
    titleZh: '毛利率与定价：为什么进货便宜不代表能赚钱',
    titleEn: 'Gross Margin & Pricing: Why Cheap Sourcing Doesn’t Guarantee Profit',
    descriptionZh: '帮助理解毛利率、定价策略与固定开销之间的关系，配合评分规则页的行业基准一起看。',
    descriptionEn: 'Understand the relationship between gross margin, pricing strategy, and fixed costs — pairs well with the industry benchmark page.',
    category: '成本核算',
    categoryEn: 'Cost Accounting',
    source: 'youtube',
    url: 'https://www.youtube.com/results?search_query=gross+margin+pricing+strategy+small+business+explained',
    durationMinutes: 10
  },
  {
    id: 'yt-record-keeping-basics',
    titleZh: '零基础记账：手写账本也能记清楚生意账',
    titleEn: 'Bookkeeping from Zero: Keeping Clear Records with Just a Notebook',
    descriptionZh: '没有财务背景也能上手的简易记账方法，与本平台「凭证平等」原则相呼应——手写记账本同样有效。',
    descriptionEn: 'Simple bookkeeping methods anyone can start with no finance background — aligned with this platform’s "all proof types are equal" principle.',
    category: '记账基础',
    categoryEn: 'Bookkeeping Basics',
    source: 'youtube',
    url: 'https://www.youtube.com/results?search_query=simple+bookkeeping+for+small+business+owners+beginners',
    durationMinutes: 13
  }
];

export const LEARNING_CATEGORIES: string[] = Array.from(
  new Set(LEARNING_VIDEOS.map((v) => v.category))
);

// 中文分类名 -> 英文分类名映射，供 /learn 页面切换语言时展示分类筛选 Tab 使用
export const LEARNING_CATEGORY_LABELS_EN: Record<string, string> = LEARNING_VIDEOS.reduce(
  (acc, v) => {
    acc[v.category] = v.categoryEn;
    return acc;
  },
  {} as Record<string, string>
);
