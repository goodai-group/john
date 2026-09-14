// 本地规则引擎 · 学习视频关联推荐
//
// 【Phase 0 重构】原位于 server.ts 第 639-669 行，逻辑一字未改。
// 未来归属：Coach（对话）—— 答疑时顺带推荐学习中心视频。
import { LEARNING_VIDEOS } from '../../lib/learningVideos.js';

// 关键词 -> 学习中心视频 id 的匹配规则：AI 问答命中相关主题时，顺带推荐商业学习视频
const VIDEO_KEYWORD_RULES: { pattern: RegExp; videoIds: string[] }[] = [
  { pattern: /保本|不亏|盈亏平衡|breakeven|break-even/i, videoIds: ['yt-break-even-point'] },
  { pattern: /毛利|进货|成本|cogs|原材料|采购|定价/i, videoIds: ['yt-cost-accounting-basics', 'yt-gross-margin-pricing'] },
  { pattern: /备用金|跑道|runway|现金储备|存款|应急资金|撑几个月|现金流/i, videoIds: ['yt-cashflow-runway'] },
  { pattern: /凭证|记账本|手写|发票|截图|记账/i, videoIds: ['yt-record-keeping-basics'] },
  { pattern: /签证|工作许可|work permit|visa/i, videoIds: ['yt-visa-work-permit-costs'] },
  { pattern: /注册|执照|无执照|公司注册|registration/i, videoIds: ['yt-company-registration-guide'] },
  { pattern: /启动资金|开店要多少钱|前期投入|初始投入|多少钱能开|startup/i, videoIds: ['yt-visa-work-permit-costs', 'yt-cost-accounting-basics'] },
  { pattern: /房租|工资|人工|opex|固定开销|水电|租金/i, videoIds: ['yt-cost-accounting-basics'] }
];

export function matchRecommendedVideos(question: string, category: string) {
  const matchedIds = new Set<string>();
  for (const rule of VIDEO_KEYWORD_RULES) {
    if (rule.pattern.test(question) || rule.pattern.test(category)) {
      rule.videoIds.forEach((id) => matchedIds.add(id));
    }
  }
  if (matchedIds.size === 0) return [];
  return LEARNING_VIDEOS.filter((v) => matchedIds.has(v.id)).slice(0, 3).map((v) => ({
    id: v.id,
    titleZh: v.titleZh,
    titleEn: v.titleEn,
    category: v.category,
    categoryEn: v.categoryEn,
    url: v.url,
    source: v.source,
    durationMinutes: v.durationMinutes
  }));
}
