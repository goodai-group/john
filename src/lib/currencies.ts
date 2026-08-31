import { CurrencyCode, CurrencyRate, MoneyField } from '../types';

export const SUPPORTED_CURRENCIES: CurrencyRate[] = [
  // 常用重点币种 (Major Global & BAM Key Currencies)
  { code: 'USD', nameZh: '美元 (USD)', nameEn: 'US Dollar', symbol: '$', rateToUsd: 1.0, region: '全球主要' },
  { code: 'CNY', nameZh: '人民币 (CNY)', nameEn: 'Chinese Yuan', symbol: '¥', rateToUsd: 7.23, region: '亚洲' },
  { code: 'EUR', nameZh: '欧元 (EUR)', nameEn: 'Euro', symbol: '€', rateToUsd: 0.92, region: '欧洲' },
  { code: 'GBP', nameZh: '英镑 (GBP)', nameEn: 'British Pound', symbol: '£', rateToUsd: 0.79, region: '欧洲' },
  { code: 'KES', nameZh: '肯尼亚先令 (KES)', nameEn: 'Kenyan Shilling', symbol: 'KSh', rateToUsd: 129.5, region: '非洲' },
  { code: 'THB', nameZh: '泰铢 (THB)', nameEn: 'Thai Baht', symbol: '฿', rateToUsd: 36.5, region: '东南亚' },
  { code: 'VND', nameZh: '越南盾 (VND)', nameEn: 'Vietnamese Dong', symbol: '₫', rateToUsd: 25400.0, region: '东南亚' },
  { code: 'NGN', nameZh: '尼日利亚奈拉 (NGN)', nameEn: 'Nigerian Naira', symbol: '₦', rateToUsd: 1520.0, region: '非洲' },
  { code: 'EGP', nameZh: '埃及镑 (EGP)', nameEn: 'Egyptian Pound', symbol: 'E£', rateToUsd: 48.6, region: '非洲' },
  { code: 'IDR', nameZh: '印尼卢比 (IDR)', nameEn: 'Indonesian Rupiah', symbol: 'Rp', rateToUsd: 16250.0, region: '东南亚' },
  { code: 'PHP', nameZh: '菲律宾比索 (PHP)', nameEn: 'Philippine Peso', symbol: '₱', rateToUsd: 58.7, region: '东南亚' },
  { code: 'MYR', nameZh: '马来西亚林吉特 (MYR)', nameEn: 'Malaysian Ringgit', symbol: 'RM', rateToUsd: 4.65, region: '东南亚' },
  { code: 'SGD', nameZh: '新加坡元 (SGD)', nameEn: 'Singapore Dollar', symbol: 'S$', rateToUsd: 1.35, region: '东南亚' },
  { code: 'INR', nameZh: '印度卢比 (INR)', nameEn: 'Indian Rupee', symbol: '₹', rateToUsd: 83.5, region: '南亚' },
  { code: 'JPY', nameZh: '日元 (JPY)', nameEn: 'Japanese Yen', symbol: '¥', rateToUsd: 154.2, region: '东亚' },
  { code: 'KRW', nameZh: '韩元 (KRW)', nameEn: 'South Korean Won', symbol: '₩', rateToUsd: 1380.0, region: '东亚' },
  { code: 'HKD', nameZh: '港币 (HKD)', nameEn: 'Hong Kong Dollar', symbol: 'HK$', rateToUsd: 7.82, region: '东亚' },
  { code: 'TWD', nameZh: '新台币 (TWD)', nameEn: 'New Taiwan Dollar', symbol: 'NT$', rateToUsd: 32.4, region: '东亚' },

  // 🌍 非洲主要币种 (Africa)
  { code: 'ZAR', nameZh: '南非兰特 (ZAR)', nameEn: 'South African Rand', symbol: 'R', rateToUsd: 18.3, region: '非洲' },
  { code: 'UGX', nameZh: '乌干达先令 (UGX)', nameEn: 'Ugandan Shilling', symbol: 'USh', rateToUsd: 3720.0, region: '非洲' },
  { code: 'TZS', nameZh: '坦桑尼亚先令 (TZS)', nameEn: 'Tanzanian Shilling', symbol: 'TSh', rateToUsd: 2680.0, region: '非洲' },
  { code: 'ETB', nameZh: '埃塞俄比亚比尔 (ETB)', nameEn: 'Ethiopian Birr', symbol: 'Br', rateToUsd: 121.0, region: '非洲' },
  { code: 'GHS', nameZh: '加纳塞地 (GHS)', nameEn: 'Ghanaian Cedi', symbol: 'GH₵', rateToUsd: 15.6, region: '非洲' },
  { code: 'RWF', nameZh: '卢旺达法郎 (RWF)', nameEn: 'Rwandan Franc', symbol: 'FRw', rateToUsd: 1330.0, region: '非洲' },
  { code: 'MAD', nameZh: '摩洛哥迪拉姆 (MAD)', nameEn: 'Moroccan Dirham', symbol: 'MAD', rateToUsd: 9.9, region: '非洲' },
  { code: 'XOF', nameZh: '西非法郎 (XOF)', nameEn: 'West African CFA Franc', symbol: 'CFA', rateToUsd: 605.0, region: '非洲' },
  { code: 'XAF', nameZh: '中非法郎 (XAF)', nameEn: 'Central African CFA Franc', symbol: 'FCFA', rateToUsd: 605.0, region: '非洲' },
  { code: 'ZMW', nameZh: '赞比亚克瓦查 (ZMW)', nameEn: 'Zambian Kwacha', symbol: 'ZK', rateToUsd: 26.5, region: '非洲' },
  { code: 'MZN', nameZh: '莫桑比克梅蒂卡尔 (MZN)', nameEn: 'Mozambican Metical', symbol: 'MT', rateToUsd: 63.8, region: '非洲' },
  { code: 'BWP', nameZh: '博茨瓦纳普拉 (BWP)', nameEn: 'Botswana Pula', symbol: 'P', rateToUsd: 13.6, region: '非洲' },

  // 🌏 东南亚与南亚/中亚 (Asia)
  { code: 'KHR', nameZh: '柬埔寨瑞尔 (KHR)', nameEn: 'Cambodian Riel', symbol: '៛', rateToUsd: 4100.0, region: '东南亚' },
  { code: 'LAK', nameZh: '老挝基普 (LAK)', nameEn: 'Lao Kip', symbol: '₭', rateToUsd: 21800.0, region: '东南亚' },
  { code: 'MMK', nameZh: '缅甸元 (MMK)', nameEn: 'Myanmar Kyat', symbol: 'K', rateToUsd: 3500.0, region: '东南亚' },
  { code: 'PKR', nameZh: '巴基斯坦卢比 (PKR)', nameEn: 'Pakistani Rupee', symbol: '₨', rateToUsd: 278.4, region: '南亚' },
  { code: 'BDT', nameZh: '孟加拉塔卡 (BDT)', nameEn: 'Bangladeshi Taka', symbol: '৳', rateToUsd: 118.0, region: '南亚' },
  { code: 'NPR', nameZh: '尼泊尔卢比 (NPR)', nameEn: 'Nepalese Rupee', symbol: 'रू', rateToUsd: 133.5, region: '南亚' },
  { code: 'LKR', nameZh: '斯里兰卡卢比 (LKR)', nameEn: 'Sri Lankan Rupee', symbol: 'Rs', rateToUsd: 302.0, region: '南亚' },
  { code: 'MNT', nameZh: '蒙古图格里克 (MNT)', nameEn: 'Mongolian Tugrik', symbol: '₮', rateToUsd: 3450.0, region: '中亚' },
  { code: 'KZT', nameZh: '哈萨克斯坦坚戈 (KZT)', nameEn: 'Kazakhstani Tenge', symbol: '₸', rateToUsd: 475.0, region: '中亚' },
  { code: 'UZS', nameZh: '乌兹别克斯坦苏姆 (UZS)', nameEn: 'Uzbekistani Som', symbol: 'so\'m', rateToUsd: 12600.0, region: '中亚' },

  // 🕌 中东与西亚 (Middle East)
  { code: 'AED', nameZh: '阿联酋迪拉姆 (AED)', nameEn: 'UAE Dirham', symbol: 'AED', rateToUsd: 3.67, region: '中东' },
  { code: 'SAR', nameZh: '沙特里亚尔 (SAR)', nameEn: 'Saudi Riyal', symbol: 'SAR', rateToUsd: 3.75, region: '中东' },
  { code: 'QAR', nameZh: '卡塔尔里亚尔 (QAR)', nameEn: 'Qatari Riyal', symbol: 'QR', rateToUsd: 3.64, region: '中东' },
  { code: 'KWD', nameZh: '科威特第纳尔 (KWD)', nameEn: 'Kuwaiti Dinar', symbol: 'KD', rateToUsd: 0.31, region: '中东' },
  { code: 'ILS', nameZh: '以色列新谢克尔 (ILS)', nameEn: 'Israeli Shekel', symbol: '₪', rateToUsd: 3.72, region: '中东' },
  { code: 'JOD', nameZh: '约旦第纳尔 (JOD)', nameEn: 'Jordanian Dinar', symbol: 'JD', rateToUsd: 0.71, region: '中东' },
  { code: 'TRY', nameZh: '土耳其里拉 (TRY)', nameEn: 'Turkish Lira', symbol: '₺', rateToUsd: 33.2, region: '中东' },

  // 🌎 美洲地区 (Americas)
  { code: 'CAD', nameZh: '加拿大元 (CAD)', nameEn: 'Canadian Dollar', symbol: 'CA$', rateToUsd: 1.37, region: '北美' },
  { code: 'MXN', nameZh: '墨西哥比索 (MXN)', nameEn: 'Mexican Peso', symbol: 'Mex$', rateToUsd: 18.2, region: '拉美' },
  { code: 'BRL', nameZh: '巴西雷亚尔 (BRL)', nameEn: 'Brazilian Real', symbol: 'R$', rateToUsd: 5.48, region: '拉美' },
  { code: 'ARS', nameZh: '阿根廷比索 (ARS)', nameEn: 'Argentine Peso', symbol: 'ARS$', rateToUsd: 950.0, region: '拉美' },
  { code: 'COP', nameZh: '哥伦比亚比索 (COP)', nameEn: 'Colombian Peso', symbol: 'COL$', rateToUsd: 4050.0, region: '拉美' },
  { code: 'CLP', nameZh: '智利比索 (CLP)', nameEn: 'Chilean Peso', symbol: 'CLP$', rateToUsd: 935.0, region: '拉美' },
  { code: 'PEN', nameZh: '秘鲁新索尔 (PEN)', nameEn: 'Peruvian Sol', symbol: 'S/.', rateToUsd: 3.75, region: '拉美' },
  { code: 'CRC', nameZh: '哥斯达黎加科朗 (CRC)', nameEn: 'Costa Rican Colón', symbol: '₡', rateToUsd: 525.0, region: '拉美' },
  { code: 'DOP', nameZh: '多米尼加比索 (DOP)', nameEn: 'Dominican Peso', symbol: 'RD$', rateToUsd: 59.5, region: '拉美' },

  // 欧洲与大洋洲 (Europe & Oceania)
  { code: 'CHF', nameZh: '瑞士法郎 (CHF)', nameEn: 'Swiss Franc', symbol: 'CHF', rateToUsd: 0.89, region: '欧洲' },
  { code: 'SEK', nameZh: '瑞典克朗 (SEK)', nameEn: 'Swedish Krona', symbol: 'kr', rateToUsd: 10.6, region: '欧洲' },
  { code: 'NOK', nameZh: '挪威克朗 (NOK)', nameEn: 'Norwegian Krone', symbol: 'kr', rateToUsd: 10.7, region: '欧洲' },
  { code: 'DKK', nameZh: '丹麦克朗 (DKK)', nameEn: 'Danish Krone', symbol: 'kr', rateToUsd: 6.85, region: '欧洲' },
  { code: 'PLN', nameZh: '波兰兹罗提 (PLN)', nameEn: 'Polish Zloty', symbol: 'zł', rateToUsd: 3.95, region: '欧洲' },
  { code: 'CZK', nameZh: '捷克克朗 (CZK)', nameEn: 'Czech Koruna', symbol: 'Kč', rateToUsd: 23.2, region: '欧洲' },
  { code: 'HUF', nameZh: '匈牙利福林 (HUF)', nameEn: 'Hungarian Forint', symbol: 'Ft', rateToUsd: 362.0, region: '欧洲' },
  { code: 'AUD', nameZh: '澳大利亚元 (AUD)', nameEn: 'Australian Dollar', symbol: 'A$', rateToUsd: 1.52, region: '大洋洲' },
  { code: 'NZD', nameZh: '新西兰元 (NZD)', nameEn: 'New Zealand Dollar', symbol: 'NZ$', rateToUsd: 1.66, region: '大洋洲' },

  // 🌏 中亚及西亚补充 (Central / West Asia)
  { code: 'TMT', nameZh: '土库曼斯坦马纳特 (TMT)', nameEn: 'Turkmenistani Manat', symbol: 'TMT', rateToUsd: 3.5, region: '中亚' },
  { code: 'TJS', nameZh: '塔吉克斯坦索莫尼 (TJS)', nameEn: 'Tajikistani Somoni', symbol: 'SM', rateToUsd: 10.9, region: '中亚' },
  { code: 'KGS', nameZh: '吉尔吉斯索姆 (KGS)', nameEn: 'Kyrgyzstani Som', symbol: 'сом', rateToUsd: 87.5, region: '中亚' },
  { code: 'AFN', nameZh: '阿富汗尼 (AFN)', nameEn: 'Afghan Afghani', symbol: '؋', rateToUsd: 71.0, region: '中亚' },
  { code: 'AZN', nameZh: '阿塞拜疆马纳特 (AZN)', nameEn: 'Azerbaijani Manat', symbol: '₼', rateToUsd: 1.7, region: '西亚' },
  { code: 'AMD', nameZh: '亚美尼亚德拉姆 (AMD)', nameEn: 'Armenian Dram', symbol: '֏', rateToUsd: 390.0, region: '西亚' },
  { code: 'GEL', nameZh: '格鲁吉亚拉里 (GEL)', nameEn: 'Georgian Lari', symbol: '₾', rateToUsd: 2.7, region: '西亚' },

  // 🌍 非洲补充 (Africa extended)
  { code: 'CDF', nameZh: '刚果法郎 (CDF)', nameEn: 'Congolese Franc', symbol: 'FC', rateToUsd: 2850.0, region: '非洲' },
  { code: 'AOA', nameZh: '安哥拉宽扎 (AOA)', nameEn: 'Angolan Kwanza', symbol: 'Kz', rateToUsd: 920.0, region: '非洲' },
  { code: 'BIF', nameZh: '布隆迪法郎 (BIF)', nameEn: 'Burundian Franc', symbol: 'FBu', rateToUsd: 2950.0, region: '非洲' },
  { code: 'MGA', nameZh: '马达加斯加阿里亚里 (MGA)', nameEn: 'Malagasy Ariary', symbol: 'Ar', rateToUsd: 4600.0, region: '非洲' },
  { code: 'SOS', nameZh: '索马里先令 (SOS)', nameEn: 'Somali Shilling', symbol: 'S', rateToUsd: 571.0, region: '非洲' },
  { code: 'SDG', nameZh: '苏丹镑 (SDG)', nameEn: 'Sudanese Pound', symbol: 'SDG', rateToUsd: 600.0, region: '非洲' },
  { code: 'SLE', nameZh: '塞拉利昂利昂 (SLE)', nameEn: 'Sierra Leonean Leone', symbol: 'Le', rateToUsd: 20.5, region: '非洲' },
  { code: 'GMD', nameZh: '冈比亚达拉西 (GMD)', nameEn: 'Gambian Dalasi', symbol: 'D', rateToUsd: 67.0, region: '非洲' },
  { code: 'MVR', nameZh: '马尔代夫拉菲亚 (MVR)', nameEn: 'Maldivian Rufiyaa', symbol: 'Rf', rateToUsd: 15.4, region: '南亚' },

  // 🌎 美洲补充 (Americas extended)
  { code: 'BOB', nameZh: '玻利维亚玻利维亚诺 (BOB)', nameEn: 'Bolivian Boliviano', symbol: 'Bs', rateToUsd: 6.96, region: '拉美' },
  { code: 'UYU', nameZh: '乌拉圭比索 (UYU)', nameEn: 'Uruguayan Peso', symbol: '$U', rateToUsd: 40.5, region: '拉美' },
  { code: 'VES', nameZh: '委内瑞拉玻利瓦尔 (VES)', nameEn: 'Venezuelan Bolívar', symbol: 'Bs.S', rateToUsd: 36.5, region: '拉美' },
  { code: 'PYG', nameZh: '巴拉圭瓜拉尼 (PYG)', nameEn: 'Paraguayan Guarani', symbol: '₲', rateToUsd: 7350.0, region: '拉美' },
  { code: 'GTQ', nameZh: '危地马拉格查尔 (GTQ)', nameEn: 'Guatemalan Quetzal', symbol: 'Q', rateToUsd: 7.7, region: '拉美' },
  { code: 'HNL', nameZh: '洪都拉斯伦皮拉 (HNL)', nameEn: 'Honduran Lempira', symbol: 'L', rateToUsd: 24.7, region: '拉美' },
  { code: 'NIO', nameZh: '尼加拉瓜科多巴 (NIO)', nameEn: 'Nicaraguan Córdoba', symbol: 'C$', rateToUsd: 36.6, region: '拉美' },
  { code: 'JMD', nameZh: '牙买加元 (JMD)', nameEn: 'Jamaican Dollar', symbol: 'J$', rateToUsd: 158.0, region: '加勒比' },
  { code: 'TTD', nameZh: '特立尼达多巴哥元 (TTD)', nameEn: 'Trinidad & Tobago Dollar', symbol: 'TT$', rateToUsd: 6.8, region: '加勒比' },
  { code: 'BSD', nameZh: '巴哈马元 (BSD)', nameEn: 'Bahamian Dollar', symbol: 'B$', rateToUsd: 1.0, region: '加勒比' },
  { code: 'HTG', nameZh: '海地古德 (HTG)', nameEn: 'Haitian Gourde', symbol: 'G', rateToUsd: 133.0, region: '加勒比' },
  { code: 'BBD', nameZh: '巴巴多斯元 (BBD)', nameEn: 'Barbadian Dollar', symbol: 'Bds$', rateToUsd: 2.0, region: '加勒比' },

  // 🌏 欧洲、中东、亚太补充
  { code: 'RON', nameZh: '罗马尼亚列伊 (RON)', nameEn: 'Romanian Leu', symbol: 'lei', rateToUsd: 4.6, region: '欧洲' },
  { code: 'BGN', nameZh: '保加利亚列弗 (BGN)', nameEn: 'Bulgarian Lev', symbol: 'лв', rateToUsd: 1.8, region: '欧洲' },
  { code: 'UAH', nameZh: '乌克兰格里夫纳 (UAH)', nameEn: 'Ukrainian Hryvnia', symbol: '₴', rateToUsd: 41.0, region: '欧洲' },
  { code: 'RSD', nameZh: '塞尔维亚第纳尔 (RSD)', nameEn: 'Serbian Dinar', symbol: 'дин', rateToUsd: 107.0, region: '欧洲' },
  { code: 'DZD', nameZh: '阿尔及利亚第纳尔 (DZD)', nameEn: 'Algerian Dinar', symbol: 'DA', rateToUsd: 134.0, region: '中东' },
  { code: 'LYD', nameZh: '利比亚第纳尔 (LYD)', nameEn: 'Libyan Dinar', symbol: 'LD', rateToUsd: 4.8, region: '中东' },
  { code: 'IQD', nameZh: '伊拉克第纳尔 (IQD)', nameEn: 'Iraqi Dinar', symbol: 'ع.د', rateToUsd: 1310.0, region: '中东' },
  { code: 'LBP', nameZh: '黎巴嫩镑 (LBP)', nameEn: 'Lebanese Pound', symbol: 'L.L', rateToUsd: 89500.0, region: '中东' },
  { code: 'OMR', nameZh: '阿曼里亚尔 (OMR)', nameEn: 'Omani Rial', symbol: 'OMR', rateToUsd: 0.384, region: '中东' },
  { code: 'YER', nameZh: '也门里亚尔 (YER)', nameEn: 'Yemeni Rial', symbol: 'YR', rateToUsd: 250.0, region: '中东' },
  { code: 'BHD', nameZh: '巴林第纳尔 (BHD)', nameEn: 'Bahraini Dinar', symbol: 'BD', rateToUsd: 0.376, region: '中东' },
  { code: 'SRD', nameZh: '苏里南元 (SRD)', nameEn: 'Surinamese Dollar', symbol: '$', rateToUsd: 37.0, region: '拉美' },
  { code: 'GYD', nameZh: '圭亚那元 (GYD)', nameEn: 'Guyanese Dollar', symbol: 'G$', rateToUsd: 209.0, region: '拉美' },

  // 🌊 太平洋岛国 (Pacific Islands)
  { code: 'PGK', nameZh: '巴布亚新几内亚基那 (PGK)', nameEn: 'Papua New Guinea Kina', symbol: 'K', rateToUsd: 3.95, region: '太平洋' },
  { code: 'FJD', nameZh: '斐济元 (FJD)', nameEn: 'Fijian Dollar', symbol: 'FJ$', rateToUsd: 2.25, region: '太平洋' },
  { code: 'WST', nameZh: '萨摩亚塔拉 (WST)', nameEn: 'Samoan Tala', symbol: 'WS$', rateToUsd: 2.7, region: '太平洋' },
  { code: 'TOP', nameZh: '汤加潘加 (TOP)', nameEn: 'Tongan Paʻanga', symbol: 'T$', rateToUsd: 2.35, region: '太平洋' },
  { code: 'VUV', nameZh: '瓦努阿图瓦图 (VUV)', nameEn: 'Vanuatu Vatu', symbol: 'VT', rateToUsd: 118.0, region: '太平洋' },
  { code: 'SBD', nameZh: '所罗门群岛元 (SBD)', nameEn: 'Solomon Islands Dollar', symbol: 'SI$', rateToUsd: 8.4, region: '太平洋' },

  // ➕ 自定义币种占位（实际由用户在 UI 中输入 3 字母代码）
  { code: '__CUSTOM__', nameZh: '➕ 其他币种（自定义 3 字母代码）', nameEn: 'Other (Custom Code)', symbol: '¤', rateToUsd: 1.0, region: '其他', isCustomOption: true }
];

/** 特殊标记：币种下拉中选中此项代表用户要自定义输入币种代码 */
export const CUSTOM_CURRENCY_VALUE = '__CUSTOM__';

export function getCurrencyInfo(code: CurrencyCode): CurrencyRate {
  if (!code) return SUPPORTED_CURRENCIES[0];
  const upper = code.toUpperCase().trim();
  const found = SUPPORTED_CURRENCIES.find((c) => c.code.toUpperCase() === upper);
  return found || {
    code: upper,
    nameZh: `${upper}`,
    nameEn: upper,
    symbol: upper,
    rateToUsd: 1.0,
    region: '其他'
  };
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
  const amountInUsd = money.amount / (sourceRate || 1.0);
  // Convert from USD to target
  return amountInUsd * (targetRate || 1.0);
}

export function formatMoney(amount: number, currency: CurrencyCode, fractionDigits = 0): string {
  const info = getCurrencyInfo(currency);
  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits
  }).format(amount || 0);

  return `${info.symbol} ${formatted}`;
}
