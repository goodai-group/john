import { Language } from '../types';

export const i18n = {
  zh: {
    appName: '商业模型筛选与自测评估平台',
    appSubtitle: '面向海外小微商业经营者 · 无财务门槛 · 100% 自动化自评',
    sensitiveMode: '敏感地区数据安全模式',
    sensitiveModeActive: '敏感安全模式已启用（地理脱敏 / 凭证选填 / 零原图留存）',
    freeNotice: '平台费用与权益透明声明',
    feeTransparency: '费用透明度',
    simulator: '试算器 (不提交不记录)',
    publicStandards: '公开评分标准',
    myProjects: '我的项目与历史版本',
    newAssessment: '开始新自评',
    rulesRepo: '待完善规则库',
    offlineStatus: '离线草稿已就绪',
    onlineStatus: '云端同步正常',
    saveDraft: '保存本地草稿',
    draftSaved: '草稿已自动保存至本地',
    voiceInput: '语音输入',
    aiAssistant: 'AI 规则答疑助手',
    safeQuestionNotice: '这里的提问用于帮助你理解规则，不构成正式申报内容，方向性提问不会被视为申报数据，也不会影响得分。',
    aiPrivacyNotice: '对话内容仅用于即时解答，不留存服务器，不参与任何评分计算。',
    minimalDataBadge: '该项目采用数据最小化模式，属地区安全考量下的自愿选择，不代表隐瞒或数据造假，也不影响评分结果。',
    customRateBadge: '本报告使用用户自报汇率折算（非官方汇率），已如实核对并公开标注。',
    estimatedMonthsNotice: '部分月份流水由 AI 根据前后月均值自动估算补充，已由用户确认。',
    zeroProofNotice: '无凭证纯手动填写模式：与上传凭证用户享有 100% 相同评分规则与计算逻辑。'
  },
  en: {
    appName: 'Business Model Assessment & Screening Platform',
    appSubtitle: 'For Micro-Enterprises & Global Small Businesses · Zero Finance Jargon · 100% Automated',
    sensitiveMode: 'Sensitive Region Safe Mode',
    sensitiveModeActive: 'Sensitive Safe Mode Active (Geo Anonymization / Optional Attachments / No Image Stored)',
    freeNotice: 'Fee & Rights Transparency Notice',
    feeTransparency: 'Fee Transparency',
    simulator: 'Sandbox Simulator (No Logging)',
    publicStandards: 'Public Scoring Standards',
    myProjects: 'My Projects & Versions',
    newAssessment: 'Start Assessment',
    rulesRepo: 'Rules Feedback Repository',
    offlineStatus: 'Offline Draft Ready',
    onlineStatus: 'Cloud Synced',
    saveDraft: 'Save Local Draft',
    draftSaved: 'Draft automatically saved to device storage',
    voiceInput: 'Voice Input',
    aiAssistant: 'AI Rule Consultation',
    safeQuestionNotice: 'Questions asked here are strictly for rule clarification and do not form part of your official submission. What-if inquiries will NOT affect your score.',
    aiPrivacyNotice: 'Conversations are processed in real-time, not stored on servers, and strictly isolated from scoring logic.',
    minimalDataBadge: 'This project utilizes Data Minimization Mode for regional safety reasons; it does not indicate concealment and does not impact assessment scoring.',
    customRateBadge: 'Converted using user-declared parallel exchange rate (non-official) for real-market accuracy.',
    estimatedMonthsNotice: 'Certain missing monthly figures were conservatively estimated based on adjacent months and verified by the user.',
    zeroProofNotice: 'No-Proof Direct Entry: Shares 100% identical scoring logic, threshold gates, and fairness as document-backed submissions.'
  }
};

export function getTranslation(lang: Language) {
  return i18n[lang] || i18n.zh;
}
