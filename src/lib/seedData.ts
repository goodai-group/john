import { BusinessFormData } from '../types';
import { calculateAssessmentReport } from './scoringEngine';

export const SAMPLE_PROJECT: BusinessFormData = {
  id: 'proj-sample-nairobi-bakery',
  version: 1,
  createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  updatedAt: new Date().toISOString(),
  projectName: '内罗毕阳光社区烘焙工坊 (Nairobi Sunshine Bakery)',
  industry: 'food_beverage',
  businessType: '社区熟食与手工面包烘焙',
  isSensitiveRegion: false,
  regionCountry: '肯尼亚 (Kenya)',
  regionDetail: 'Nairobi Westlands',
  contactChannel: 'WhatsApp: +254 700 123456',
  anonymousOwnerName: '',
  baseCurrency: 'USD',
  hasMultipleRates: true,
  customExchangeRateType: '当地商会日常现金结算均价',
  customExchangeRateValue: 129.5,
  customExchangeRateSource: '内罗毕华商联合会每日早市参考价',
  proofType: 'mobile_payment',
  proofFiles: [
    {
      id: 'proof-1',
      name: 'M-Pesa-Till-March-2026.pdf',
      type: 'application/pdf',
      size: 342000,
      uploadTime: new Date().toISOString(),
      retainedAfterOcr: true
    }
  ],
  monthlyBreakdowns: [
    { month: '2025-10', revenue: { amount: 3600, currency: 'USD' } },
    { month: '2025-11', revenue: { amount: 3900, currency: 'USD' } },
    { month: '2025-12', revenue: { amount: 4400, currency: 'USD' } },
    { month: '2026-01', revenue: { amount: 3750, currency: 'USD' } },
    { month: '2026-02', revenue: { amount: 3800, currency: 'USD' } },
    {
      month: '2026-03',
      revenue: { amount: 4100, currency: 'USD' },
      isEstimated: false
    }
  ],
  monthlyRevenue: { amount: 3925, currency: 'USD' },
  monthlyRealOperatingRevenue: { amount: 3725, currency: 'USD' },
  monthlyExternalGrants: { amount: 200, currency: 'USD' },
  cogsCost: { amount: 1570, currency: 'USD' }, // ~42% COGS
  rentCost: { amount: 480, currency: 'USD' },
  laborCost: { amount: 650, currency: 'USD' },
  utilityCost: { amount: 140, currency: 'USD' },
  taxCost: { amount: 85, currency: 'USD' },
  otherOpex: { amount: 120, currency: 'USD' },
  existingDebtMonthlyPayment: { amount: 150, currency: 'USD' },
  cashAndLiquidAssets: { amount: 6200, currency: 'USD' },
  inventoryValue: { amount: 1800, currency: 'USD' },
  operatingMonthsCount: 18,
  fullTimeEmployeesCount: 3,
  ownerEmail: 'sunshine.bakery@example.com',
  collaborators: [
    {
      email: 'accountant.partner@example.com',
      role: 'editor',
      invitedAt: new Date().toISOString(),
      sectionAccess: ['all']
    }
  ],
  isSubmitted: true,
  isDraft: false,
  submittedAt: new Date().toISOString()
};

export const INITIAL_SAMPLE_REPORT = calculateAssessmentReport(SAMPLE_PROJECT);
