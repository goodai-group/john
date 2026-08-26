export type Language = 'zh' | 'en';

export type ActiveTab = 'form' | 'report' | 'simulator' | 'standards' | 'projects';

export type CurrencyCode =
  | 'USD'
  | 'CNY'
  | 'EUR'
  | 'GBP'
  | 'NGN' // Nigerian Naira
  | 'KES' // Kenyan Shilling
  | 'EGP' // Egyptian Pound
  | 'BRL' // Brazilian Real
  | 'INR' // Indian Rupee
  | 'JPY' // Japanese Yen
  | 'CAD' // Canadian Dollar
  | 'MXN' // Mexican Peso
  | 'PHP' // Philippine Peso
  | 'VND' // Vietnamese Dong
  | 'IDR' // Indonesian Rupiah
  | 'ETB' // Ethiopian Birr
  | 'PKR' // Pakistani Rupee
  | 'THB'; // Thai Baht

export interface CurrencyRate {
  code: CurrencyCode;
  nameZh: string;
  nameEn: string;
  symbol: string;
  rateToUsd: number; // 1 USD = X Local
}

export type ProofType =
  | 'none' // 无凭证纯手动填写 (14项核心数字)
  | 'bank_statement' // 正规银行流水
  | 'handwritten_book' // 手写 / 电子记账本照片
  | 'mobile_payment' // 移动支付截图 (微信/WhatsApp/M-Pesa/OPay/Wave)
  | 'institution_record'; // 教会 / 合作社 / 机构内部财务记录

export interface MoneyField {
  amount: number;
  currency: CurrencyCode;
  isExternalSupport?: boolean; // 混合资金来源标注：是否属于外部支持款/捐赠
  note?: string;
  lastEditedBy?: string;
  lastEditedAt?: string;
}

export interface MonthlyBreakdown {
  month: string; // e.g. "2025-01"
  revenue: MoneyField;
  isEstimated?: boolean; // AI 断点流水补充估算
  note?: string;
}

export interface BusinessFormData {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  projectName: string;
  industry: string;
  businessType: string;

  // 敏感地区数据安全模式
  isSensitiveRegion: boolean;
  regionCountry: string;
  regionDetail: string; // 脱敏模式下不要求填精确城市
  contactChannel: string; // 联系方式匿名化
  anonymousOwnerName: string;

  // 主报告币种与汇率设置
  baseCurrency: CurrencyCode;
  hasMultipleRates: boolean; // 是否存在多重汇率（黑市/民间汇率）
  customExchangeRateType?: string; // 汇率类型 (如 "当地教会/机构日常兑换价")
  customExchangeRateValue?: number; // 用户自报汇率 (1 USD = X Local)
  customExchangeRateSource?: string;

  // 资金证明方式
  proofType: ProofType;
  proofFiles: {
    id: string;
    name: string;
    url?: string;
    type: string;
    size: number;
    uploadTime: string;
    retainedAfterOcr: boolean; // 敏感地区下 OCR 后不保留原图
  }[];
  monthlyBreakdowns: MonthlyBreakdown[]; // 12个月流水明细

  // 14 项核心申报财务与运营字段
  monthlyRevenue: MoneyField; // F8 经营月均总流水
  monthlyRealOperatingRevenue: MoneyField; // 真实主营收入
  monthlyExternalGrants: MoneyField; // 外部支持/捐赠款 (分开填报)
  cogsCost: MoneyField; // F10 原材料与直接采购成本
  rentCost: MoneyField; // F11 场地租金与物业
  laborCost: MoneyField; // F12 员工工资与人工支出
  utilityCost: MoneyField; // F13 水电网络杂费
  taxCost: MoneyField; // F16 税金及规费
  otherOpex: MoneyField; // 其他日常经营费用
  existingDebtMonthlyPayment: MoneyField; // 现有债务月还本付息额
  cashAndLiquidAssets: MoneyField; // 当前现金与高流动资产
  inventoryValue: MoneyField; // 库存及固定资产估值
  operatingMonthsCount: number; // 连续稳定经营月数
  fullTimeEmployeesCount: number; // 全职/兼职雇员人数

  // 协作与操作留痕
  ownerUid?: string;
  ownerEmail: string;
  collaborators: {
    email: string;
    role: 'editor' | 'viewer';
    invitedAt: string;
    sectionAccess: string[];
  }[];
  isSubmitted: boolean;
  submittedAt?: string;
  isDraft: boolean;
}

export interface GateCheckResult {
  code: string;
  name: string;
  plainName: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  currentValue: string;
  threshold: string;
  plainDescription: string;
  improvementTip: string; // 未达标指标通用改善方向提示
}

export interface MetricScore {
  key: string;
  category: string;
  name: string;
  plainName: string;
  score: number; // 0 - 100
  weight: number;
  actualValue: string;
  benchmarkValue: string;
  status: 'excellent' | 'good' | 'average' | 'poor';
  plainExplanation: string;
  improvementTip: string;
}

export interface AssessmentReport {
  id: string;
  projectId: string;
  version: number;
  createdAt: string;
  projectName: string;
  industry: string;
  baseCurrency: CurrencyCode;
  
  // 安全与数据说明标记
  isSensitiveRegion: boolean;
  dataMinimizationNotice?: string;
  customRateNotice?: string;
  estimatedMonthsCount: number;
  proofTypeUsed: ProofType;
  ownerUid?: string;
  ownerEmail?: string;

  // 综合得分与等级
  totalScore: number; // 0 - 100
  tier: 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'REJECT';
  overallStatus: 'PASS' | 'REVIEW' | 'FAIL';
  summaryPlainLanguage: string;

  // 5大维度雷达数据
  radarScores: {
    dimension: string;
    dimensionPlain: string;
    score: number;
    benchmark: number;
  }[];

  // Gate 判定结果 (底线红线检查)
  gates: GateCheckResult[];
  gatePassed: boolean;

  // 逐项明细打分
  metrics: MetricScore[];

  // 财务指标汇总（统一为主报告币种）
  normalizedFinancials: {
    monthlyGrossRevenue: number;
    monthlyRealRevenue: number;
    monthlyExternalGrants: number;
    monthlyCogs: number;
    monthlyOpex: number;
    grossProfit: number;
    grossMarginPercent: number;
    operatingProfit: number; // PBT
    netProfit: number; // PAT
    netProfitMarginPercent: number;
    opexRatioPercent: number;
    cashRunwayMonths: number;
    debtServiceCoverageRatio: number;
  };

  // AI 大白话诊断与建议
  aiActionableAdvice: string[];
}

export interface EscalatedQuestion {
  id: string;
  question: string;
  category: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW_EDGE_CASE';
  conservativePaths?: {
    pathName: string;
    assumption: string;
    estimatedScore: string;
    consequence: string;
  }[];
  aiResponse: string;
  isEdgeCase: boolean;
  suggestedAction: string;
  userFeedback?: 'helpful' | 'not_helpful';
  archivedAt: string;
  relatedCaseId?: string;
  relatedCaseResult?: string;
}

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

