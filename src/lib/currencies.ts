// 同上：ESM 产物中相对导入必须显式带 .js 扩展名（TS 会自动映射到 .ts 源文件）
import { CurrencyCode, CurrencyRate, MoneyField } from '../types.js';

export const SUPPORTED_CURRENCIES: CurrencyRate[] = [
  // 常用重点币种 (Major Global & BAM Key Currencies)
  { code: 'USD', nameZh: '美元 (USD)', nameEn: 'US Dollar', symbol: '$', rateToUsd: 1.0, region: '全球主要', countryZh: '美国', countryEn: 'United States', iso2: 'US' },
  { code: 'CNY', nameZh: '人民币 (CNY)', nameEn: 'Chinese Yuan', symbol: '¥', rateToUsd: 7.23, region: '亚洲', countryZh: '中国大陆', countryEn: 'Mainland China', iso2: 'CN' },
  { code: 'EUR', nameZh: '欧元 (EUR)', nameEn: 'Euro', symbol: '€', rateToUsd: 0.92, region: '欧洲', countryZh: '欧盟地区', countryEn: 'European Union' },
  { code: 'GBP', nameZh: '英镑 (GBP)', nameEn: 'British Pound', symbol: '£', rateToUsd: 0.79, region: '欧洲', countryZh: '英国', countryEn: 'United Kingdom', iso2: 'GB' },
  { code: 'KES', nameZh: '肯尼亚先令 (KES)', nameEn: 'Kenyan Shilling', symbol: 'KSh', rateToUsd: 129.5, region: '非洲', countryZh: '肯尼亚', countryEn: 'Kenya', iso2: 'KE' },
  { code: 'THB', nameZh: '泰铢 (THB)', nameEn: 'Thai Baht', symbol: '฿', rateToUsd: 36.5, region: '东南亚', countryZh: '泰国', countryEn: 'Thailand', iso2: 'TH' },
  { code: 'VND', nameZh: '越南盾 (VND)', nameEn: 'Vietnamese Dong', symbol: '₫', rateToUsd: 25400.0, region: '东南亚', countryZh: '越南', countryEn: 'Vietnam', iso2: 'VN' },
  { code: 'NGN', nameZh: '尼日利亚奈拉 (NGN)', nameEn: 'Nigerian Naira', symbol: '₦', rateToUsd: 1520.0, region: '非洲', countryZh: '尼日利亚', countryEn: 'Nigeria', iso2: 'NG' },
  { code: 'EGP', nameZh: '埃及镑 (EGP)', nameEn: 'Egyptian Pound', symbol: 'E£', rateToUsd: 48.6, region: '非洲', countryZh: '埃及', countryEn: 'Egypt', iso2: 'EG' },
  { code: 'IDR', nameZh: '印尼卢比 (IDR)', nameEn: 'Indonesian Rupiah', symbol: 'Rp', rateToUsd: 16250.0, region: '东南亚', countryZh: '印度尼西亚', countryEn: 'Indonesia', iso2: 'ID' },
  { code: 'PHP', nameZh: '菲律宾比索 (PHP)', nameEn: 'Philippine Peso', symbol: '₱', rateToUsd: 58.7, region: '东南亚', countryZh: '菲律宾', countryEn: 'Philippines', iso2: 'PH' },
  { code: 'MYR', nameZh: '马来西亚林吉特 (MYR)', nameEn: 'Malaysian Ringgit', symbol: 'RM', rateToUsd: 4.65, region: '东南亚', countryZh: '马来西亚', countryEn: 'Malaysia', iso2: 'MY' },
  { code: 'SGD', nameZh: '新加坡元 (SGD)', nameEn: 'Singapore Dollar', symbol: 'S$', rateToUsd: 1.35, region: '东南亚', countryZh: '新加坡', countryEn: 'Singapore', iso2: 'SG' },
  { code: 'INR', nameZh: '印度卢比 (INR)', nameEn: 'Indian Rupee', symbol: '₹', rateToUsd: 83.5, region: '南亚', countryZh: '印度', countryEn: 'India', iso2: 'IN' },
  { code: 'JPY', nameZh: '日元 (JPY)', nameEn: 'Japanese Yen', symbol: '¥', rateToUsd: 154.2, region: '东亚', countryZh: '日本', countryEn: 'Japan', iso2: 'JP' },
  { code: 'KRW', nameZh: '韩元 (KRW)', nameEn: 'South Korean Won', symbol: '₩', rateToUsd: 1380.0, region: '东亚', countryZh: '韩国', countryEn: 'South Korea', iso2: 'KR' },
  { code: 'HKD', nameZh: '港币 (HKD)', nameEn: 'Hong Kong Dollar', symbol: 'HK$', rateToUsd: 7.82, region: '东亚', countryZh: '中国香港', countryEn: 'Hong Kong', iso2: 'HK' },
  { code: 'TWD', nameZh: '新台币 (TWD)', nameEn: 'New Taiwan Dollar', symbol: 'NT$', rateToUsd: 32.4, region: '东亚', countryZh: '中国台湾', countryEn: 'Taiwan', iso2: 'TW' },

  // 🌍 非洲主要币种 (Africa)
  { code: 'ZAR', nameZh: '南非兰特 (ZAR)', nameEn: 'South African Rand', symbol: 'R', rateToUsd: 18.3, region: '非洲', countryZh: '南非', countryEn: 'South Africa', iso2: 'ZA' },
  { code: 'UGX', nameZh: '乌干达先令 (UGX)', nameEn: 'Ugandan Shilling', symbol: 'USh', rateToUsd: 3720.0, region: '非洲', countryZh: '乌干达', countryEn: 'Uganda', iso2: 'UG' },
  { code: 'TZS', nameZh: '坦桑尼亚先令 (TZS)', nameEn: 'Tanzanian Shilling', symbol: 'TSh', rateToUsd: 2680.0, region: '非洲', countryZh: '坦桑尼亚', countryEn: 'Tanzania', iso2: 'TZ' },
  { code: 'ETB', nameZh: '埃塞俄比亚比尔 (ETB)', nameEn: 'Ethiopian Birr', symbol: 'Br', rateToUsd: 121.0, region: '非洲', countryZh: '埃塞俄比亚', countryEn: 'Ethiopia', iso2: 'ET' },
  { code: 'GHS', nameZh: '加纳塞地 (GHS)', nameEn: 'Ghanaian Cedi', symbol: 'GH₵', rateToUsd: 15.6, region: '非洲', countryZh: '加纳', countryEn: 'Ghana', iso2: 'GH' },
  { code: 'RWF', nameZh: '卢旺达法郎 (RWF)', nameEn: 'Rwandan Franc', symbol: 'FRw', rateToUsd: 1330.0, region: '非洲', countryZh: '卢旺达', countryEn: 'Rwanda', iso2: 'RW' },
  { code: 'MAD', nameZh: '摩洛哥迪拉姆 (MAD)', nameEn: 'Moroccan Dirham', symbol: 'MAD', rateToUsd: 9.9, region: '非洲', countryZh: '摩洛哥', countryEn: 'Morocco', iso2: 'MA' },
  { code: 'XOF', nameZh: '西非法郎 (XOF)', nameEn: 'West African CFA Franc', symbol: 'CFA', rateToUsd: 605.0, region: '非洲', countryZh: '西非法郎区（科特迪瓦/塞内加尔等）', countryEn: 'West African CFA Franc Zone (Côte d\'Ivoire, Senegal, etc.)' },
  { code: 'XAF', nameZh: '中非法郎 (XAF)', nameEn: 'Central African CFA Franc', symbol: 'FCFA', rateToUsd: 605.0, region: '非洲', countryZh: '中非法郎区（喀麦隆等）', countryEn: 'Central African CFA Franc Zone (Cameroon, etc.)' },
  { code: 'ZMW', nameZh: '赞比亚克瓦查 (ZMW)', nameEn: 'Zambian Kwacha', symbol: 'ZK', rateToUsd: 26.5, region: '非洲', countryZh: '赞比亚', countryEn: 'Zambia', iso2: 'ZM' },
  { code: 'MZN', nameZh: '莫桑比克梅蒂卡尔 (MZN)', nameEn: 'Mozambican Metical', symbol: 'MT', rateToUsd: 63.8, region: '非洲', countryZh: '莫桑比克', countryEn: 'Mozambique', iso2: 'MZ' },
  { code: 'BWP', nameZh: '博茨瓦纳普拉 (BWP)', nameEn: 'Botswana Pula', symbol: 'P', rateToUsd: 13.6, region: '非洲', countryZh: '博茨瓦纳', countryEn: 'Botswana', iso2: 'BW' },

  // 🌏 东南亚与南亚/中亚 (Asia)
  { code: 'KHR', nameZh: '柬埔寨瑞尔 (KHR)', nameEn: 'Cambodian Riel', symbol: '៛', rateToUsd: 4100.0, region: '东南亚', countryZh: '柬埔寨', countryEn: 'Cambodia', iso2: 'KH' },
  { code: 'LAK', nameZh: '老挝基普 (LAK)', nameEn: 'Lao Kip', symbol: '₭', rateToUsd: 21800.0, region: '东南亚', countryZh: '老挝', countryEn: 'Laos', iso2: 'LA' },
  { code: 'MMK', nameZh: '缅甸元 (MMK)', nameEn: 'Myanmar Kyat', symbol: 'K', rateToUsd: 3500.0, region: '东南亚', countryZh: '缅甸', countryEn: 'Myanmar', iso2: 'MM' },
  { code: 'PKR', nameZh: '巴基斯坦卢比 (PKR)', nameEn: 'Pakistani Rupee', symbol: '₨', rateToUsd: 278.4, region: '南亚', countryZh: '巴基斯坦', countryEn: 'Pakistan', iso2: 'PK' },
  { code: 'BDT', nameZh: '孟加拉塔卡 (BDT)', nameEn: 'Bangladeshi Taka', symbol: '৳', rateToUsd: 118.0, region: '南亚', countryZh: '孟加拉国', countryEn: 'Bangladesh', iso2: 'BD' },
  { code: 'NPR', nameZh: '尼泊尔卢比 (NPR)', nameEn: 'Nepalese Rupee', symbol: 'रू', rateToUsd: 133.5, region: '南亚', countryZh: '尼泊尔', countryEn: 'Nepal', iso2: 'NP' },
  { code: 'LKR', nameZh: '斯里兰卡卢比 (LKR)', nameEn: 'Sri Lankan Rupee', symbol: 'Rs', rateToUsd: 302.0, region: '南亚', countryZh: '斯里兰卡', countryEn: 'Sri Lanka', iso2: 'LK' },
  { code: 'MNT', nameZh: '蒙古图格里克 (MNT)', nameEn: 'Mongolian Tugrik', symbol: '₮', rateToUsd: 3450.0, region: '中亚', countryZh: '蒙古', countryEn: 'Mongolia', iso2: 'MN' },
  { code: 'KZT', nameZh: '哈萨克斯坦坚戈 (KZT)', nameEn: 'Kazakhstani Tenge', symbol: '₸', rateToUsd: 475.0, region: '中亚', countryZh: '哈萨克斯坦', countryEn: 'Kazakhstan', iso2: 'KZ' },
  { code: 'UZS', nameZh: '乌兹别克斯坦苏姆 (UZS)', nameEn: 'Uzbekistani Som', symbol: 'so\'m', rateToUsd: 12600.0, region: '中亚', countryZh: '乌兹别克斯坦', countryEn: 'Uzbekistan', iso2: 'UZ' },

  // 🕌 中东与西亚 (Middle East)
  { code: 'AED', nameZh: '阿联酋迪拉姆 (AED)', nameEn: 'UAE Dirham', symbol: 'AED', rateToUsd: 3.67, region: '中东', countryZh: '阿联酋', countryEn: 'United Arab Emirates', iso2: 'AE' },
  { code: 'SAR', nameZh: '沙特里亚尔 (SAR)', nameEn: 'Saudi Riyal', symbol: 'SAR', rateToUsd: 3.75, region: '中东', countryZh: '沙特阿拉伯', countryEn: 'Saudi Arabia', iso2: 'SA' },
  { code: 'QAR', nameZh: '卡塔尔里亚尔 (QAR)', nameEn: 'Qatari Riyal', symbol: 'QR', rateToUsd: 3.64, region: '中东', countryZh: '卡塔尔', countryEn: 'Qatar', iso2: 'QA' },
  { code: 'KWD', nameZh: '科威特第纳尔 (KWD)', nameEn: 'Kuwaiti Dinar', symbol: 'KD', rateToUsd: 0.31, region: '中东', countryZh: '科威特', countryEn: 'Kuwait', iso2: 'KW' },
  { code: 'ILS', nameZh: '以色列新谢克尔 (ILS)', nameEn: 'Israeli Shekel', symbol: '₪', rateToUsd: 3.72, region: '中东', countryZh: '以色列', countryEn: 'Israel', iso2: 'IL' },
  { code: 'JOD', nameZh: '约旦第纳尔 (JOD)', nameEn: 'Jordanian Dinar', symbol: 'JD', rateToUsd: 0.71, region: '中东', countryZh: '约旦', countryEn: 'Jordan', iso2: 'JO' },
  { code: 'TRY', nameZh: '土耳其里拉 (TRY)', nameEn: 'Turkish Lira', symbol: '₺', rateToUsd: 33.2, region: '中东', countryZh: '土耳其', countryEn: 'Turkey', iso2: 'TR' },

  // 🌎 美洲地区 (Americas)
  { code: 'CAD', nameZh: '加拿大元 (CAD)', nameEn: 'Canadian Dollar', symbol: 'CA$', rateToUsd: 1.37, region: '北美', countryZh: '加拿大', countryEn: 'Canada', iso2: 'CA' },
  { code: 'MXN', nameZh: '墨西哥比索 (MXN)', nameEn: 'Mexican Peso', symbol: 'Mex$', rateToUsd: 18.2, region: '拉美', countryZh: '墨西哥', countryEn: 'Mexico', iso2: 'MX' },
  { code: 'BRL', nameZh: '巴西雷亚尔 (BRL)', nameEn: 'Brazilian Real', symbol: 'R$', rateToUsd: 5.48, region: '拉美', countryZh: '巴西', countryEn: 'Brazil', iso2: 'BR' },
  { code: 'ARS', nameZh: '阿根廷比索 (ARS)', nameEn: 'Argentine Peso', symbol: 'ARS$', rateToUsd: 950.0, region: '拉美', countryZh: '阿根廷', countryEn: 'Argentina', iso2: 'AR' },
  { code: 'COP', nameZh: '哥伦比亚比索 (COP)', nameEn: 'Colombian Peso', symbol: 'COL$', rateToUsd: 4050.0, region: '拉美', countryZh: '哥伦比亚', countryEn: 'Colombia', iso2: 'CO' },
  { code: 'CLP', nameZh: '智利比索 (CLP)', nameEn: 'Chilean Peso', symbol: 'CLP$', rateToUsd: 935.0, region: '拉美', countryZh: '智利', countryEn: 'Chile', iso2: 'CL' },
  { code: 'PEN', nameZh: '秘鲁新索尔 (PEN)', nameEn: 'Peruvian Sol', symbol: 'S/.', rateToUsd: 3.75, region: '拉美', countryZh: '秘鲁', countryEn: 'Peru', iso2: 'PE' },
  { code: 'CRC', nameZh: '哥斯达黎加科朗 (CRC)', nameEn: 'Costa Rican Colón', symbol: '₡', rateToUsd: 525.0, region: '拉美', countryZh: '哥斯达黎加', countryEn: 'Costa Rica', iso2: 'CR' },
  { code: 'DOP', nameZh: '多米尼加比索 (DOP)', nameEn: 'Dominican Peso', symbol: 'RD$', rateToUsd: 59.5, region: '拉美', countryZh: '多米尼加', countryEn: 'Dominican Republic', iso2: 'DO' },

  // 欧洲与大洋洲 (Europe & Oceania)
  { code: 'CHF', nameZh: '瑞士法郎 (CHF)', nameEn: 'Swiss Franc', symbol: 'CHF', rateToUsd: 0.89, region: '欧洲', countryZh: '瑞士', countryEn: 'Switzerland', iso2: 'CH' },
  { code: 'SEK', nameZh: '瑞典克朗 (SEK)', nameEn: 'Swedish Krona', symbol: 'kr', rateToUsd: 10.6, region: '欧洲', countryZh: '瑞典', countryEn: 'Sweden', iso2: 'SE' },
  { code: 'NOK', nameZh: '挪威克朗 (NOK)', nameEn: 'Norwegian Krone', symbol: 'kr', rateToUsd: 10.7, region: '欧洲', countryZh: '挪威', countryEn: 'Norway', iso2: 'NO' },
  { code: 'DKK', nameZh: '丹麦克朗 (DKK)', nameEn: 'Danish Krone', symbol: 'kr', rateToUsd: 6.85, region: '欧洲', countryZh: '丹麦', countryEn: 'Denmark', iso2: 'DK' },
  { code: 'PLN', nameZh: '波兰兹罗提 (PLN)', nameEn: 'Polish Zloty', symbol: 'zł', rateToUsd: 3.95, region: '欧洲', countryZh: '波兰', countryEn: 'Poland', iso2: 'PL' },
  { code: 'CZK', nameZh: '捷克克朗 (CZK)', nameEn: 'Czech Koruna', symbol: 'Kč', rateToUsd: 23.2, region: '欧洲', countryZh: '捷克', countryEn: 'Czech Republic', iso2: 'CZ' },
  { code: 'HUF', nameZh: '匈牙利福林 (HUF)', nameEn: 'Hungarian Forint', symbol: 'Ft', rateToUsd: 362.0, region: '欧洲', countryZh: '匈牙利', countryEn: 'Hungary', iso2: 'HU' },
  { code: 'AUD', nameZh: '澳大利亚元 (AUD)', nameEn: 'Australian Dollar', symbol: 'A$', rateToUsd: 1.52, region: '大洋洲', countryZh: '澳大利亚', countryEn: 'Australia', iso2: 'AU' },
  { code: 'NZD', nameZh: '新西兰元 (NZD)', nameEn: 'New Zealand Dollar', symbol: 'NZ$', rateToUsd: 1.66, region: '大洋洲', countryZh: '新西兰', countryEn: 'New Zealand', iso2: 'NZ' },

  // 🌏 中亚及西亚补充 (Central / West Asia)
  { code: 'TMT', nameZh: '土库曼斯坦马纳特 (TMT)', nameEn: 'Turkmenistani Manat', symbol: 'TMT', rateToUsd: 3.5, region: '中亚', countryZh: '土库曼斯坦', countryEn: 'Turkmenistan', iso2: 'TM' },
  { code: 'TJS', nameZh: '塔吉克斯坦索莫尼 (TJS)', nameEn: 'Tajikistani Somoni', symbol: 'SM', rateToUsd: 10.9, region: '中亚', countryZh: '塔吉克斯坦', countryEn: 'Tajikistan', iso2: 'TJ' },
  { code: 'KGS', nameZh: '吉尔吉斯索姆 (KGS)', nameEn: 'Kyrgyzstani Som', symbol: 'сом', rateToUsd: 87.5, region: '中亚', countryZh: '吉尔吉斯斯坦', countryEn: 'Kyrgyzstan', iso2: 'KG' },
  { code: 'AFN', nameZh: '阿富汗尼 (AFN)', nameEn: 'Afghan Afghani', symbol: '؋', rateToUsd: 71.0, region: '中亚', countryZh: '阿富汗', countryEn: 'Afghanistan', iso2: 'AF' },
  { code: 'AZN', nameZh: '阿塞拜疆马纳特 (AZN)', nameEn: 'Azerbaijani Manat', symbol: '₼', rateToUsd: 1.7, region: '西亚', countryZh: '阿塞拜疆', countryEn: 'Azerbaijan', iso2: 'AZ' },
  { code: 'AMD', nameZh: '亚美尼亚德拉姆 (AMD)', nameEn: 'Armenian Dram', symbol: '֏', rateToUsd: 390.0, region: '西亚', countryZh: '亚美尼亚', countryEn: 'Armenia', iso2: 'AM' },
  { code: 'GEL', nameZh: '格鲁吉亚拉里 (GEL)', nameEn: 'Georgian Lari', symbol: '₾', rateToUsd: 2.7, region: '西亚', countryZh: '格鲁吉亚', countryEn: 'Georgia', iso2: 'GE' },

  // 🌍 非洲补充 (Africa extended)
  { code: 'CDF', nameZh: '刚果法郎 (CDF)', nameEn: 'Congolese Franc', symbol: 'FC', rateToUsd: 2850.0, region: '非洲', countryZh: '刚果(金)', countryEn: 'DR Congo', iso2: 'CD' },
  { code: 'AOA', nameZh: '安哥拉宽扎 (AOA)', nameEn: 'Angolan Kwanza', symbol: 'Kz', rateToUsd: 920.0, region: '非洲', countryZh: '安哥拉', countryEn: 'Angola', iso2: 'AO' },
  { code: 'BIF', nameZh: '布隆迪法郎 (BIF)', nameEn: 'Burundian Franc', symbol: 'FBu', rateToUsd: 2950.0, region: '非洲', countryZh: '布隆迪', countryEn: 'Burundi', iso2: 'BI' },
  { code: 'MGA', nameZh: '马达加斯加阿里亚里 (MGA)', nameEn: 'Malagasy Ariary', symbol: 'Ar', rateToUsd: 4600.0, region: '非洲', countryZh: '马达加斯加', countryEn: 'Madagascar', iso2: 'MG' },
  { code: 'SOS', nameZh: '索马里先令 (SOS)', nameEn: 'Somali Shilling', symbol: 'S', rateToUsd: 571.0, region: '非洲', countryZh: '索马里', countryEn: 'Somalia', iso2: 'SO' },
  { code: 'SDG', nameZh: '苏丹镑 (SDG)', nameEn: 'Sudanese Pound', symbol: 'SDG', rateToUsd: 600.0, region: '非洲', countryZh: '苏丹', countryEn: 'Sudan', iso2: 'SD' },
  { code: 'SLE', nameZh: '塞拉利昂利昂 (SLE)', nameEn: 'Sierra Leonean Leone', symbol: 'Le', rateToUsd: 20.5, region: '非洲', countryZh: '塞拉利昂', countryEn: 'Sierra Leone', iso2: 'SL' },
  { code: 'GMD', nameZh: '冈比亚达拉西 (GMD)', nameEn: 'Gambian Dalasi', symbol: 'D', rateToUsd: 67.0, region: '非洲', countryZh: '冈比亚', countryEn: 'Gambia', iso2: 'GM' },
  { code: 'MVR', nameZh: '马尔代夫拉菲亚 (MVR)', nameEn: 'Maldivian Rufiyaa', symbol: 'Rf', rateToUsd: 15.4, region: '南亚', countryZh: '马尔代夫', countryEn: 'Maldives', iso2: 'MV' },

  // 🌎 美洲补充 (Americas extended)
  { code: 'BOB', nameZh: '玻利维亚玻利维亚诺 (BOB)', nameEn: 'Bolivian Boliviano', symbol: 'Bs', rateToUsd: 6.96, region: '拉美', countryZh: '玻利维亚', countryEn: 'Bolivia', iso2: 'BO' },
  { code: 'UYU', nameZh: '乌拉圭比索 (UYU)', nameEn: 'Uruguayan Peso', symbol: '$U', rateToUsd: 40.5, region: '拉美', countryZh: '乌拉圭', countryEn: 'Uruguay', iso2: 'UY' },
  { code: 'VES', nameZh: '委内瑞拉玻利瓦尔 (VES)', nameEn: 'Venezuelan Bolívar', symbol: 'Bs.S', rateToUsd: 36.5, region: '拉美', countryZh: '委内瑞拉', countryEn: 'Venezuela', iso2: 'VE' },
  { code: 'PYG', nameZh: '巴拉圭瓜拉尼 (PYG)', nameEn: 'Paraguayan Guarani', symbol: '₲', rateToUsd: 7350.0, region: '拉美', countryZh: '巴拉圭', countryEn: 'Paraguay', iso2: 'PY' },
  { code: 'GTQ', nameZh: '危地马拉格查尔 (GTQ)', nameEn: 'Guatemalan Quetzal', symbol: 'Q', rateToUsd: 7.7, region: '拉美', countryZh: '危地马拉', countryEn: 'Guatemala', iso2: 'GT' },
  { code: 'HNL', nameZh: '洪都拉斯伦皮拉 (HNL)', nameEn: 'Honduran Lempira', symbol: 'L', rateToUsd: 24.7, region: '拉美', countryZh: '洪都拉斯', countryEn: 'Honduras', iso2: 'HN' },
  { code: 'NIO', nameZh: '尼加拉瓜科多巴 (NIO)', nameEn: 'Nicaraguan Córdoba', symbol: 'C$', rateToUsd: 36.6, region: '拉美', countryZh: '尼加拉瓜', countryEn: 'Nicaragua', iso2: 'NI' },
  { code: 'JMD', nameZh: '牙买加元 (JMD)', nameEn: 'Jamaican Dollar', symbol: 'J$', rateToUsd: 158.0, region: '加勒比', countryZh: '牙买加', countryEn: 'Jamaica', iso2: 'JM' },
  { code: 'TTD', nameZh: '特立尼达多巴哥元 (TTD)', nameEn: 'Trinidad & Tobago Dollar', symbol: 'TT$', rateToUsd: 6.8, region: '加勒比', countryZh: '特立尼达和多巴哥', countryEn: 'Trinidad and Tobago', iso2: 'TT' },
  { code: 'BSD', nameZh: '巴哈马元 (BSD)', nameEn: 'Bahamian Dollar', symbol: 'B$', rateToUsd: 1.0, region: '加勒比', countryZh: '巴哈马', countryEn: 'Bahamas', iso2: 'BS' },
  { code: 'HTG', nameZh: '海地古德 (HTG)', nameEn: 'Haitian Gourde', symbol: 'G', rateToUsd: 133.0, region: '加勒比', countryZh: '海地', countryEn: 'Haiti', iso2: 'HT' },
  { code: 'BBD', nameZh: '巴巴多斯元 (BBD)', nameEn: 'Barbadian Dollar', symbol: 'Bds$', rateToUsd: 2.0, region: '加勒比', countryZh: '巴巴多斯', countryEn: 'Barbados', iso2: 'BB' },

  // 🌏 欧洲、中东、亚太补充
  { code: 'RON', nameZh: '罗马尼亚列伊 (RON)', nameEn: 'Romanian Leu', symbol: 'lei', rateToUsd: 4.6, region: '欧洲', countryZh: '罗马尼亚', countryEn: 'Romania', iso2: 'RO' },
  { code: 'BGN', nameZh: '保加利亚列弗 (BGN)', nameEn: 'Bulgarian Lev', symbol: 'лв', rateToUsd: 1.8, region: '欧洲', countryZh: '保加利亚', countryEn: 'Bulgaria', iso2: 'BG' },
  { code: 'UAH', nameZh: '乌克兰格里夫纳 (UAH)', nameEn: 'Ukrainian Hryvnia', symbol: '₴', rateToUsd: 41.0, region: '欧洲', countryZh: '乌克兰', countryEn: 'Ukraine', iso2: 'UA' },
  { code: 'RSD', nameZh: '塞尔维亚第纳尔 (RSD)', nameEn: 'Serbian Dinar', symbol: 'дин', rateToUsd: 107.0, region: '欧洲', countryZh: '塞尔维亚', countryEn: 'Serbia', iso2: 'RS' },
  { code: 'DZD', nameZh: '阿尔及利亚第纳尔 (DZD)', nameEn: 'Algerian Dinar', symbol: 'DA', rateToUsd: 134.0, region: '中东', countryZh: '阿尔及利亚', countryEn: 'Algeria', iso2: 'DZ' },
  { code: 'LYD', nameZh: '利比亚第纳尔 (LYD)', nameEn: 'Libyan Dinar', symbol: 'LD', rateToUsd: 4.8, region: '中东', countryZh: '利比亚', countryEn: 'Libya', iso2: 'LY' },
  { code: 'IQD', nameZh: '伊拉克第纳尔 (IQD)', nameEn: 'Iraqi Dinar', symbol: 'ع.د', rateToUsd: 1310.0, region: '中东', countryZh: '伊拉克', countryEn: 'Iraq', iso2: 'IQ' },
  { code: 'LBP', nameZh: '黎巴嫩镑 (LBP)', nameEn: 'Lebanese Pound', symbol: 'L.L', rateToUsd: 89500.0, region: '中东', countryZh: '黎巴嫩', countryEn: 'Lebanon', iso2: 'LB' },
  { code: 'OMR', nameZh: '阿曼里亚尔 (OMR)', nameEn: 'Omani Rial', symbol: 'OMR', rateToUsd: 0.384, region: '中东', countryZh: '阿曼', countryEn: 'Oman', iso2: 'OM' },
  { code: 'YER', nameZh: '也门里亚尔 (YER)', nameEn: 'Yemeni Rial', symbol: 'YR', rateToUsd: 250.0, region: '中东', countryZh: '也门', countryEn: 'Yemen', iso2: 'YE' },
  { code: 'BHD', nameZh: '巴林第纳尔 (BHD)', nameEn: 'Bahraini Dinar', symbol: 'BD', rateToUsd: 0.376, region: '中东', countryZh: '巴林', countryEn: 'Bahrain', iso2: 'BH' },
  { code: 'SRD', nameZh: '苏里南元 (SRD)', nameEn: 'Surinamese Dollar', symbol: '$', rateToUsd: 37.0, region: '拉美', countryZh: '苏里南', countryEn: 'Suriname', iso2: 'SR' },
  { code: 'GYD', nameZh: '圭亚那元 (GYD)', nameEn: 'Guyanese Dollar', symbol: 'G$', rateToUsd: 209.0, region: '拉美', countryZh: '圭亚那', countryEn: 'Guyana', iso2: 'GY' },

  // 🌊 太平洋岛国 (Pacific Islands)
  { code: 'PGK', nameZh: '巴布亚新几内亚基那 (PGK)', nameEn: 'Papua New Guinea Kina', symbol: 'K', rateToUsd: 3.95, region: '太平洋', countryZh: '巴布亚新几内亚', countryEn: 'Papua New Guinea', iso2: 'PG' },
  { code: 'FJD', nameZh: '斐济元 (FJD)', nameEn: 'Fijian Dollar', symbol: 'FJ$', rateToUsd: 2.25, region: '太平洋', countryZh: '斐济', countryEn: 'Fiji', iso2: 'FJ' },
  { code: 'WST', nameZh: '萨摩亚塔拉 (WST)', nameEn: 'Samoan Tala', symbol: 'WS$', rateToUsd: 2.7, region: '太平洋', countryZh: '萨摩亚', countryEn: 'Samoa', iso2: 'WS' },
  { code: 'TOP', nameZh: '汤加潘加 (TOP)', nameEn: 'Tongan Paʻanga', symbol: 'T$', rateToUsd: 2.35, region: '太平洋', countryZh: '汤加', countryEn: 'Tonga', iso2: 'TO' },
  { code: 'VUV', nameZh: '瓦努阿图瓦图 (VUV)', nameEn: 'Vanuatu Vatu', symbol: 'VT', rateToUsd: 118.0, region: '太平洋', countryZh: '瓦努阿图', countryEn: 'Vanuatu', iso2: 'VU' },
  { code: 'SBD', nameZh: '所罗门群岛元 (SBD)', nameEn: 'Solomon Islands Dollar', symbol: 'SI$', rateToUsd: 8.4, region: '太平洋', countryZh: '所罗门群岛', countryEn: 'Solomon Islands', iso2: 'SB' },

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
