import { CurrencyCode, CurrencyRate, MoneyField } from '../types';

export const SUPPORTED_CURRENCIES: CurrencyRate[] = [
  { code: 'USD', nameZh: '美元 (USD)', nameEn: 'US Dollar', symbol: '$', rateToUsd: 1.0 },
  { code: 'CNY', nameZh: '人民币 (CNY)', nameEn: 'Chinese Yuan', symbol: '¥', rateToUsd: 7.23 },
  { code: 'EUR', nameZh: '欧元 (EUR)', nameEn: 'Euro', symbol: '€', rateToUsd: 0.92 },
  { code: 'GBP', nameZh: '英镑 (GBP)', nameEn: 'British Pound', symbol: '£', rateToUsd: 0.79 },
  { code: 'NGN', nameZh: '尼日利亚奈拉 (NGN)', nameEn: 'Nigerian Naira', symbol: '₦', rateToUsd: 1520.0 },
  { code: 'KES', nameZh: '肯尼亚先令 (KES)', nameEn: 'Kenyan Shilling', symbol: 'KSh', rateToUsd: 129.5 },
  { code: 'EGP', nameZh: '埃及镑 (EGP)', nameEn: 'Egyptian Pound', symbol: 'E£', rateToUsd: 48.6 },
  { code: 'BRL', nameZh: '巴西雷亚尔 (BRL)', nameEn: 'Brazilian Real', symbol: 'R$', rateToUsd: 5.48 },
  { code: 'INR', nameZh: '印度卢比 (INR)', nameEn: 'Indian Rupee', symbol: '₹', rateToUsd: 83.5 },
  { code: 'JPY', nameZh: '日元 (JPY)', nameEn: 'Japanese Yen', symbol: '¥', rateToUsd: 154.2 },
  { code: 'CAD', nameZh: '加拿大元 (CAD)', nameEn: 'Canadian Dollar', symbol: 'CA$', rateToUsd: 1.37 },
  { code: 'MXN', nameZh: '墨西哥比索 (MXN)', nameEn: 'Mexican Peso', symbol: 'Mex$', rateToUsd: 18.2 },
  { code: 'PHP', nameZh: '菲律宾比索 (PHP)', nameEn: 'Philippine Peso', symbol: '₱', rateToUsd: 58.7 },
  { code: 'VND', nameZh: '越南盾 (VND)', nameEn: 'Vietnamese Dong', symbol: '₫', rateToUsd: 25400.0 },
  { code: 'IDR', nameZh: '印尼卢比 (IDR)', nameEn: 'Indonesian Rupiah', symbol: 'Rp', rateToUsd: 16250.0 },
  { code: 'ETB', nameZh: '埃塞俄比亚比尔 (ETB)', nameEn: 'Ethiopian Birr', symbol: 'Br', rateToUsd: 121.0 },
  { code: 'PKR', nameZh: '巴基斯坦卢比 (PKR)', nameEn: 'Pakistani Rupee', symbol: '₨', rateToUsd: 278.4 },
  { code: 'THB', nameZh: '泰铢 (THB)', nameEn: 'Thai Baht', symbol: '฿', rateToUsd: 36.5 }
];

export function getCurrencyInfo(code: CurrencyCode): CurrencyRate {
  const found = SUPPORTED_CURRENCIES.find((c) => c.code === code);
  return found || SUPPORTED_CURRENCIES[0];
}

/**
 * 汇率统一折算函数：
 * 将任意币种金额折算为主报告币种金额
 * 若用户开启了"本国存在多重汇率"，支持使用用户自报汇率折算
 */
export function convertToTargetCurrency(
  money: MoneyField | undefined,
  targetCurrency: CurrencyCode,
  customRateValue?: number,
  customRateCode?: CurrencyCode
): number {
  if (!money || typeof money.amount !== 'number' || isNaN(money.amount)) {
    return 0;
  }

  const sourceCode = money.currency || targetCurrency;
  if (sourceCode === targetCurrency) {
    return money.amount;
  }

  // 检查是否应用用户自报汇率
  if (customRateValue && customRateValue > 0 && customRateCode) {
    // 如果源币种或目标币种匹配自报币种
    if (sourceCode === customRateCode && targetCurrency === 'USD') {
      return money.amount / customRateValue;
    }
    if (sourceCode === 'USD' && targetCurrency === customRateCode) {
      return money.amount * customRateValue;
    }
  }

  const sourceRate = getCurrencyInfo(sourceCode).rateToUsd;
  const targetRate = getCurrencyInfo(targetCurrency).rateToUsd;

  // Amount in USD
  const amountInUsd = money.amount / sourceRate;
  // Convert from USD to target
  return amountInUsd * targetRate;
}

export function formatMoney(amount: number, currency: CurrencyCode, fractionDigits = 0): string {
  const info = getCurrencyInfo(currency);
  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits
  }).format(amount || 0);

  return `${info.symbol} ${formatted}`;
}
