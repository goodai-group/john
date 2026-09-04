// server.ts
import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";

// src/lib/currencies.ts
var SUPPORTED_CURRENCIES = [
  // 常用重点币种 (Major Global & BAM Key Currencies)
  { code: "USD", nameZh: "\u7F8E\u5143 (USD)", nameEn: "US Dollar", symbol: "$", rateToUsd: 1, region: "\u5168\u7403\u4E3B\u8981" },
  { code: "CNY", nameZh: "\u4EBA\u6C11\u5E01 (CNY)", nameEn: "Chinese Yuan", symbol: "\xA5", rateToUsd: 7.23, region: "\u4E9A\u6D32" },
  { code: "EUR", nameZh: "\u6B27\u5143 (EUR)", nameEn: "Euro", symbol: "\u20AC", rateToUsd: 0.92, region: "\u6B27\u6D32" },
  { code: "GBP", nameZh: "\u82F1\u9551 (GBP)", nameEn: "British Pound", symbol: "\xA3", rateToUsd: 0.79, region: "\u6B27\u6D32" },
  { code: "KES", nameZh: "\u80AF\u5C3C\u4E9A\u5148\u4EE4 (KES)", nameEn: "Kenyan Shilling", symbol: "KSh", rateToUsd: 129.5, region: "\u975E\u6D32" },
  { code: "THB", nameZh: "\u6CF0\u94E2 (THB)", nameEn: "Thai Baht", symbol: "\u0E3F", rateToUsd: 36.5, region: "\u4E1C\u5357\u4E9A" },
  { code: "VND", nameZh: "\u8D8A\u5357\u76FE (VND)", nameEn: "Vietnamese Dong", symbol: "\u20AB", rateToUsd: 25400, region: "\u4E1C\u5357\u4E9A" },
  { code: "NGN", nameZh: "\u5C3C\u65E5\u5229\u4E9A\u5948\u62C9 (NGN)", nameEn: "Nigerian Naira", symbol: "\u20A6", rateToUsd: 1520, region: "\u975E\u6D32" },
  { code: "EGP", nameZh: "\u57C3\u53CA\u9551 (EGP)", nameEn: "Egyptian Pound", symbol: "E\xA3", rateToUsd: 48.6, region: "\u975E\u6D32" },
  { code: "IDR", nameZh: "\u5370\u5C3C\u5362\u6BD4 (IDR)", nameEn: "Indonesian Rupiah", symbol: "Rp", rateToUsd: 16250, region: "\u4E1C\u5357\u4E9A" },
  { code: "PHP", nameZh: "\u83F2\u5F8B\u5BBE\u6BD4\u7D22 (PHP)", nameEn: "Philippine Peso", symbol: "\u20B1", rateToUsd: 58.7, region: "\u4E1C\u5357\u4E9A" },
  { code: "MYR", nameZh: "\u9A6C\u6765\u897F\u4E9A\u6797\u5409\u7279 (MYR)", nameEn: "Malaysian Ringgit", symbol: "RM", rateToUsd: 4.65, region: "\u4E1C\u5357\u4E9A" },
  { code: "SGD", nameZh: "\u65B0\u52A0\u5761\u5143 (SGD)", nameEn: "Singapore Dollar", symbol: "S$", rateToUsd: 1.35, region: "\u4E1C\u5357\u4E9A" },
  { code: "INR", nameZh: "\u5370\u5EA6\u5362\u6BD4 (INR)", nameEn: "Indian Rupee", symbol: "\u20B9", rateToUsd: 83.5, region: "\u5357\u4E9A" },
  { code: "JPY", nameZh: "\u65E5\u5143 (JPY)", nameEn: "Japanese Yen", symbol: "\xA5", rateToUsd: 154.2, region: "\u4E1C\u4E9A" },
  { code: "KRW", nameZh: "\u97E9\u5143 (KRW)", nameEn: "South Korean Won", symbol: "\u20A9", rateToUsd: 1380, region: "\u4E1C\u4E9A" },
  { code: "HKD", nameZh: "\u6E2F\u5E01 (HKD)", nameEn: "Hong Kong Dollar", symbol: "HK$", rateToUsd: 7.82, region: "\u4E1C\u4E9A" },
  { code: "TWD", nameZh: "\u65B0\u53F0\u5E01 (TWD)", nameEn: "New Taiwan Dollar", symbol: "NT$", rateToUsd: 32.4, region: "\u4E1C\u4E9A" },
  // 🌍 非洲主要币种 (Africa)
  { code: "ZAR", nameZh: "\u5357\u975E\u5170\u7279 (ZAR)", nameEn: "South African Rand", symbol: "R", rateToUsd: 18.3, region: "\u975E\u6D32" },
  { code: "UGX", nameZh: "\u4E4C\u5E72\u8FBE\u5148\u4EE4 (UGX)", nameEn: "Ugandan Shilling", symbol: "USh", rateToUsd: 3720, region: "\u975E\u6D32" },
  { code: "TZS", nameZh: "\u5766\u6851\u5C3C\u4E9A\u5148\u4EE4 (TZS)", nameEn: "Tanzanian Shilling", symbol: "TSh", rateToUsd: 2680, region: "\u975E\u6D32" },
  { code: "ETB", nameZh: "\u57C3\u585E\u4FC4\u6BD4\u4E9A\u6BD4\u5C14 (ETB)", nameEn: "Ethiopian Birr", symbol: "Br", rateToUsd: 121, region: "\u975E\u6D32" },
  { code: "GHS", nameZh: "\u52A0\u7EB3\u585E\u5730 (GHS)", nameEn: "Ghanaian Cedi", symbol: "GH\u20B5", rateToUsd: 15.6, region: "\u975E\u6D32" },
  { code: "RWF", nameZh: "\u5362\u65FA\u8FBE\u6CD5\u90CE (RWF)", nameEn: "Rwandan Franc", symbol: "FRw", rateToUsd: 1330, region: "\u975E\u6D32" },
  { code: "MAD", nameZh: "\u6469\u6D1B\u54E5\u8FEA\u62C9\u59C6 (MAD)", nameEn: "Moroccan Dirham", symbol: "MAD", rateToUsd: 9.9, region: "\u975E\u6D32" },
  { code: "XOF", nameZh: "\u897F\u975E\u6CD5\u90CE (XOF)", nameEn: "West African CFA Franc", symbol: "CFA", rateToUsd: 605, region: "\u975E\u6D32" },
  { code: "XAF", nameZh: "\u4E2D\u975E\u6CD5\u90CE (XAF)", nameEn: "Central African CFA Franc", symbol: "FCFA", rateToUsd: 605, region: "\u975E\u6D32" },
  { code: "ZMW", nameZh: "\u8D5E\u6BD4\u4E9A\u514B\u74E6\u67E5 (ZMW)", nameEn: "Zambian Kwacha", symbol: "ZK", rateToUsd: 26.5, region: "\u975E\u6D32" },
  { code: "MZN", nameZh: "\u83AB\u6851\u6BD4\u514B\u6885\u8482\u5361\u5C14 (MZN)", nameEn: "Mozambican Metical", symbol: "MT", rateToUsd: 63.8, region: "\u975E\u6D32" },
  { code: "BWP", nameZh: "\u535A\u8328\u74E6\u7EB3\u666E\u62C9 (BWP)", nameEn: "Botswana Pula", symbol: "P", rateToUsd: 13.6, region: "\u975E\u6D32" },
  // 🌏 东南亚与南亚/中亚 (Asia)
  { code: "KHR", nameZh: "\u67EC\u57D4\u5BE8\u745E\u5C14 (KHR)", nameEn: "Cambodian Riel", symbol: "\u17DB", rateToUsd: 4100, region: "\u4E1C\u5357\u4E9A" },
  { code: "LAK", nameZh: "\u8001\u631D\u57FA\u666E (LAK)", nameEn: "Lao Kip", symbol: "\u20AD", rateToUsd: 21800, region: "\u4E1C\u5357\u4E9A" },
  { code: "MMK", nameZh: "\u7F05\u7538\u5143 (MMK)", nameEn: "Myanmar Kyat", symbol: "K", rateToUsd: 3500, region: "\u4E1C\u5357\u4E9A" },
  { code: "PKR", nameZh: "\u5DF4\u57FA\u65AF\u5766\u5362\u6BD4 (PKR)", nameEn: "Pakistani Rupee", symbol: "\u20A8", rateToUsd: 278.4, region: "\u5357\u4E9A" },
  { code: "BDT", nameZh: "\u5B5F\u52A0\u62C9\u5854\u5361 (BDT)", nameEn: "Bangladeshi Taka", symbol: "\u09F3", rateToUsd: 118, region: "\u5357\u4E9A" },
  { code: "NPR", nameZh: "\u5C3C\u6CCA\u5C14\u5362\u6BD4 (NPR)", nameEn: "Nepalese Rupee", symbol: "\u0930\u0942", rateToUsd: 133.5, region: "\u5357\u4E9A" },
  { code: "LKR", nameZh: "\u65AF\u91CC\u5170\u5361\u5362\u6BD4 (LKR)", nameEn: "Sri Lankan Rupee", symbol: "Rs", rateToUsd: 302, region: "\u5357\u4E9A" },
  { code: "MNT", nameZh: "\u8499\u53E4\u56FE\u683C\u91CC\u514B (MNT)", nameEn: "Mongolian Tugrik", symbol: "\u20AE", rateToUsd: 3450, region: "\u4E2D\u4E9A" },
  { code: "KZT", nameZh: "\u54C8\u8428\u514B\u65AF\u5766\u575A\u6208 (KZT)", nameEn: "Kazakhstani Tenge", symbol: "\u20B8", rateToUsd: 475, region: "\u4E2D\u4E9A" },
  { code: "UZS", nameZh: "\u4E4C\u5179\u522B\u514B\u65AF\u5766\u82CF\u59C6 (UZS)", nameEn: "Uzbekistani Som", symbol: "so'm", rateToUsd: 12600, region: "\u4E2D\u4E9A" },
  // 🕌 中东与西亚 (Middle East)
  { code: "AED", nameZh: "\u963F\u8054\u914B\u8FEA\u62C9\u59C6 (AED)", nameEn: "UAE Dirham", symbol: "AED", rateToUsd: 3.67, region: "\u4E2D\u4E1C" },
  { code: "SAR", nameZh: "\u6C99\u7279\u91CC\u4E9A\u5C14 (SAR)", nameEn: "Saudi Riyal", symbol: "SAR", rateToUsd: 3.75, region: "\u4E2D\u4E1C" },
  { code: "QAR", nameZh: "\u5361\u5854\u5C14\u91CC\u4E9A\u5C14 (QAR)", nameEn: "Qatari Riyal", symbol: "QR", rateToUsd: 3.64, region: "\u4E2D\u4E1C" },
  { code: "KWD", nameZh: "\u79D1\u5A01\u7279\u7B2C\u7EB3\u5C14 (KWD)", nameEn: "Kuwaiti Dinar", symbol: "KD", rateToUsd: 0.31, region: "\u4E2D\u4E1C" },
  { code: "ILS", nameZh: "\u4EE5\u8272\u5217\u65B0\u8C22\u514B\u5C14 (ILS)", nameEn: "Israeli Shekel", symbol: "\u20AA", rateToUsd: 3.72, region: "\u4E2D\u4E1C" },
  { code: "JOD", nameZh: "\u7EA6\u65E6\u7B2C\u7EB3\u5C14 (JOD)", nameEn: "Jordanian Dinar", symbol: "JD", rateToUsd: 0.71, region: "\u4E2D\u4E1C" },
  { code: "TRY", nameZh: "\u571F\u8033\u5176\u91CC\u62C9 (TRY)", nameEn: "Turkish Lira", symbol: "\u20BA", rateToUsd: 33.2, region: "\u4E2D\u4E1C" },
  // 🌎 美洲地区 (Americas)
  { code: "CAD", nameZh: "\u52A0\u62FF\u5927\u5143 (CAD)", nameEn: "Canadian Dollar", symbol: "CA$", rateToUsd: 1.37, region: "\u5317\u7F8E" },
  { code: "MXN", nameZh: "\u58A8\u897F\u54E5\u6BD4\u7D22 (MXN)", nameEn: "Mexican Peso", symbol: "Mex$", rateToUsd: 18.2, region: "\u62C9\u7F8E" },
  { code: "BRL", nameZh: "\u5DF4\u897F\u96F7\u4E9A\u5C14 (BRL)", nameEn: "Brazilian Real", symbol: "R$", rateToUsd: 5.48, region: "\u62C9\u7F8E" },
  { code: "ARS", nameZh: "\u963F\u6839\u5EF7\u6BD4\u7D22 (ARS)", nameEn: "Argentine Peso", symbol: "ARS$", rateToUsd: 950, region: "\u62C9\u7F8E" },
  { code: "COP", nameZh: "\u54E5\u4F26\u6BD4\u4E9A\u6BD4\u7D22 (COP)", nameEn: "Colombian Peso", symbol: "COL$", rateToUsd: 4050, region: "\u62C9\u7F8E" },
  { code: "CLP", nameZh: "\u667A\u5229\u6BD4\u7D22 (CLP)", nameEn: "Chilean Peso", symbol: "CLP$", rateToUsd: 935, region: "\u62C9\u7F8E" },
  { code: "PEN", nameZh: "\u79D8\u9C81\u65B0\u7D22\u5C14 (PEN)", nameEn: "Peruvian Sol", symbol: "S/.", rateToUsd: 3.75, region: "\u62C9\u7F8E" },
  { code: "CRC", nameZh: "\u54E5\u65AF\u8FBE\u9ECE\u52A0\u79D1\u6717 (CRC)", nameEn: "Costa Rican Col\xF3n", symbol: "\u20A1", rateToUsd: 525, region: "\u62C9\u7F8E" },
  { code: "DOP", nameZh: "\u591A\u7C73\u5C3C\u52A0\u6BD4\u7D22 (DOP)", nameEn: "Dominican Peso", symbol: "RD$", rateToUsd: 59.5, region: "\u62C9\u7F8E" },
  // 欧洲与大洋洲 (Europe & Oceania)
  { code: "CHF", nameZh: "\u745E\u58EB\u6CD5\u90CE (CHF)", nameEn: "Swiss Franc", symbol: "CHF", rateToUsd: 0.89, region: "\u6B27\u6D32" },
  { code: "SEK", nameZh: "\u745E\u5178\u514B\u6717 (SEK)", nameEn: "Swedish Krona", symbol: "kr", rateToUsd: 10.6, region: "\u6B27\u6D32" },
  { code: "NOK", nameZh: "\u632A\u5A01\u514B\u6717 (NOK)", nameEn: "Norwegian Krone", symbol: "kr", rateToUsd: 10.7, region: "\u6B27\u6D32" },
  { code: "DKK", nameZh: "\u4E39\u9EA6\u514B\u6717 (DKK)", nameEn: "Danish Krone", symbol: "kr", rateToUsd: 6.85, region: "\u6B27\u6D32" },
  { code: "PLN", nameZh: "\u6CE2\u5170\u5179\u7F57\u63D0 (PLN)", nameEn: "Polish Zloty", symbol: "z\u0142", rateToUsd: 3.95, region: "\u6B27\u6D32" },
  { code: "CZK", nameZh: "\u6377\u514B\u514B\u6717 (CZK)", nameEn: "Czech Koruna", symbol: "K\u010D", rateToUsd: 23.2, region: "\u6B27\u6D32" },
  { code: "HUF", nameZh: "\u5308\u7259\u5229\u798F\u6797 (HUF)", nameEn: "Hungarian Forint", symbol: "Ft", rateToUsd: 362, region: "\u6B27\u6D32" },
  { code: "AUD", nameZh: "\u6FB3\u5927\u5229\u4E9A\u5143 (AUD)", nameEn: "Australian Dollar", symbol: "A$", rateToUsd: 1.52, region: "\u5927\u6D0B\u6D32" },
  { code: "NZD", nameZh: "\u65B0\u897F\u5170\u5143 (NZD)", nameEn: "New Zealand Dollar", symbol: "NZ$", rateToUsd: 1.66, region: "\u5927\u6D0B\u6D32" },
  // 🌏 中亚及西亚补充 (Central / West Asia)
  { code: "TMT", nameZh: "\u571F\u5E93\u66FC\u65AF\u5766\u9A6C\u7EB3\u7279 (TMT)", nameEn: "Turkmenistani Manat", symbol: "TMT", rateToUsd: 3.5, region: "\u4E2D\u4E9A" },
  { code: "TJS", nameZh: "\u5854\u5409\u514B\u65AF\u5766\u7D22\u83AB\u5C3C (TJS)", nameEn: "Tajikistani Somoni", symbol: "SM", rateToUsd: 10.9, region: "\u4E2D\u4E9A" },
  { code: "KGS", nameZh: "\u5409\u5C14\u5409\u65AF\u7D22\u59C6 (KGS)", nameEn: "Kyrgyzstani Som", symbol: "\u0441\u043E\u043C", rateToUsd: 87.5, region: "\u4E2D\u4E9A" },
  { code: "AFN", nameZh: "\u963F\u5BCC\u6C57\u5C3C (AFN)", nameEn: "Afghan Afghani", symbol: "\u060B", rateToUsd: 71, region: "\u4E2D\u4E9A" },
  { code: "AZN", nameZh: "\u963F\u585E\u62DC\u7586\u9A6C\u7EB3\u7279 (AZN)", nameEn: "Azerbaijani Manat", symbol: "\u20BC", rateToUsd: 1.7, region: "\u897F\u4E9A" },
  { code: "AMD", nameZh: "\u4E9A\u7F8E\u5C3C\u4E9A\u5FB7\u62C9\u59C6 (AMD)", nameEn: "Armenian Dram", symbol: "\u058F", rateToUsd: 390, region: "\u897F\u4E9A" },
  { code: "GEL", nameZh: "\u683C\u9C81\u5409\u4E9A\u62C9\u91CC (GEL)", nameEn: "Georgian Lari", symbol: "\u20BE", rateToUsd: 2.7, region: "\u897F\u4E9A" },
  // 🌍 非洲补充 (Africa extended)
  { code: "CDF", nameZh: "\u521A\u679C\u6CD5\u90CE (CDF)", nameEn: "Congolese Franc", symbol: "FC", rateToUsd: 2850, region: "\u975E\u6D32" },
  { code: "AOA", nameZh: "\u5B89\u54E5\u62C9\u5BBD\u624E (AOA)", nameEn: "Angolan Kwanza", symbol: "Kz", rateToUsd: 920, region: "\u975E\u6D32" },
  { code: "BIF", nameZh: "\u5E03\u9686\u8FEA\u6CD5\u90CE (BIF)", nameEn: "Burundian Franc", symbol: "FBu", rateToUsd: 2950, region: "\u975E\u6D32" },
  { code: "MGA", nameZh: "\u9A6C\u8FBE\u52A0\u65AF\u52A0\u963F\u91CC\u4E9A\u91CC (MGA)", nameEn: "Malagasy Ariary", symbol: "Ar", rateToUsd: 4600, region: "\u975E\u6D32" },
  { code: "SOS", nameZh: "\u7D22\u9A6C\u91CC\u5148\u4EE4 (SOS)", nameEn: "Somali Shilling", symbol: "S", rateToUsd: 571, region: "\u975E\u6D32" },
  { code: "SDG", nameZh: "\u82CF\u4E39\u9551 (SDG)", nameEn: "Sudanese Pound", symbol: "SDG", rateToUsd: 600, region: "\u975E\u6D32" },
  { code: "SLE", nameZh: "\u585E\u62C9\u5229\u6602\u5229\u6602 (SLE)", nameEn: "Sierra Leonean Leone", symbol: "Le", rateToUsd: 20.5, region: "\u975E\u6D32" },
  { code: "GMD", nameZh: "\u5188\u6BD4\u4E9A\u8FBE\u62C9\u897F (GMD)", nameEn: "Gambian Dalasi", symbol: "D", rateToUsd: 67, region: "\u975E\u6D32" },
  { code: "MVR", nameZh: "\u9A6C\u5C14\u4EE3\u592B\u62C9\u83F2\u4E9A (MVR)", nameEn: "Maldivian Rufiyaa", symbol: "Rf", rateToUsd: 15.4, region: "\u5357\u4E9A" },
  // 🌎 美洲补充 (Americas extended)
  { code: "BOB", nameZh: "\u73BB\u5229\u7EF4\u4E9A\u73BB\u5229\u7EF4\u4E9A\u8BFA (BOB)", nameEn: "Bolivian Boliviano", symbol: "Bs", rateToUsd: 6.96, region: "\u62C9\u7F8E" },
  { code: "UYU", nameZh: "\u4E4C\u62C9\u572D\u6BD4\u7D22 (UYU)", nameEn: "Uruguayan Peso", symbol: "$U", rateToUsd: 40.5, region: "\u62C9\u7F8E" },
  { code: "VES", nameZh: "\u59D4\u5185\u745E\u62C9\u73BB\u5229\u74E6\u5C14 (VES)", nameEn: "Venezuelan Bol\xEDvar", symbol: "Bs.S", rateToUsd: 36.5, region: "\u62C9\u7F8E" },
  { code: "PYG", nameZh: "\u5DF4\u62C9\u572D\u74DC\u62C9\u5C3C (PYG)", nameEn: "Paraguayan Guarani", symbol: "\u20B2", rateToUsd: 7350, region: "\u62C9\u7F8E" },
  { code: "GTQ", nameZh: "\u5371\u5730\u9A6C\u62C9\u683C\u67E5\u5C14 (GTQ)", nameEn: "Guatemalan Quetzal", symbol: "Q", rateToUsd: 7.7, region: "\u62C9\u7F8E" },
  { code: "HNL", nameZh: "\u6D2A\u90FD\u62C9\u65AF\u4F26\u76AE\u62C9 (HNL)", nameEn: "Honduran Lempira", symbol: "L", rateToUsd: 24.7, region: "\u62C9\u7F8E" },
  { code: "NIO", nameZh: "\u5C3C\u52A0\u62C9\u74DC\u79D1\u591A\u5DF4 (NIO)", nameEn: "Nicaraguan C\xF3rdoba", symbol: "C$", rateToUsd: 36.6, region: "\u62C9\u7F8E" },
  { code: "JMD", nameZh: "\u7259\u4E70\u52A0\u5143 (JMD)", nameEn: "Jamaican Dollar", symbol: "J$", rateToUsd: 158, region: "\u52A0\u52D2\u6BD4" },
  { code: "TTD", nameZh: "\u7279\u7ACB\u5C3C\u8FBE\u591A\u5DF4\u54E5\u5143 (TTD)", nameEn: "Trinidad & Tobago Dollar", symbol: "TT$", rateToUsd: 6.8, region: "\u52A0\u52D2\u6BD4" },
  { code: "BSD", nameZh: "\u5DF4\u54C8\u9A6C\u5143 (BSD)", nameEn: "Bahamian Dollar", symbol: "B$", rateToUsd: 1, region: "\u52A0\u52D2\u6BD4" },
  { code: "HTG", nameZh: "\u6D77\u5730\u53E4\u5FB7 (HTG)", nameEn: "Haitian Gourde", symbol: "G", rateToUsd: 133, region: "\u52A0\u52D2\u6BD4" },
  { code: "BBD", nameZh: "\u5DF4\u5DF4\u591A\u65AF\u5143 (BBD)", nameEn: "Barbadian Dollar", symbol: "Bds$", rateToUsd: 2, region: "\u52A0\u52D2\u6BD4" },
  // 🌏 欧洲、中东、亚太补充
  { code: "RON", nameZh: "\u7F57\u9A6C\u5C3C\u4E9A\u5217\u4F0A (RON)", nameEn: "Romanian Leu", symbol: "lei", rateToUsd: 4.6, region: "\u6B27\u6D32" },
  { code: "BGN", nameZh: "\u4FDD\u52A0\u5229\u4E9A\u5217\u5F17 (BGN)", nameEn: "Bulgarian Lev", symbol: "\u043B\u0432", rateToUsd: 1.8, region: "\u6B27\u6D32" },
  { code: "UAH", nameZh: "\u4E4C\u514B\u5170\u683C\u91CC\u592B\u7EB3 (UAH)", nameEn: "Ukrainian Hryvnia", symbol: "\u20B4", rateToUsd: 41, region: "\u6B27\u6D32" },
  { code: "RSD", nameZh: "\u585E\u5C14\u7EF4\u4E9A\u7B2C\u7EB3\u5C14 (RSD)", nameEn: "Serbian Dinar", symbol: "\u0434\u0438\u043D", rateToUsd: 107, region: "\u6B27\u6D32" },
  { code: "DZD", nameZh: "\u963F\u5C14\u53CA\u5229\u4E9A\u7B2C\u7EB3\u5C14 (DZD)", nameEn: "Algerian Dinar", symbol: "DA", rateToUsd: 134, region: "\u4E2D\u4E1C" },
  { code: "LYD", nameZh: "\u5229\u6BD4\u4E9A\u7B2C\u7EB3\u5C14 (LYD)", nameEn: "Libyan Dinar", symbol: "LD", rateToUsd: 4.8, region: "\u4E2D\u4E1C" },
  { code: "IQD", nameZh: "\u4F0A\u62C9\u514B\u7B2C\u7EB3\u5C14 (IQD)", nameEn: "Iraqi Dinar", symbol: "\u0639.\u062F", rateToUsd: 1310, region: "\u4E2D\u4E1C" },
  { code: "LBP", nameZh: "\u9ECE\u5DF4\u5AE9\u9551 (LBP)", nameEn: "Lebanese Pound", symbol: "L.L", rateToUsd: 89500, region: "\u4E2D\u4E1C" },
  { code: "OMR", nameZh: "\u963F\u66FC\u91CC\u4E9A\u5C14 (OMR)", nameEn: "Omani Rial", symbol: "OMR", rateToUsd: 0.384, region: "\u4E2D\u4E1C" },
  { code: "YER", nameZh: "\u4E5F\u95E8\u91CC\u4E9A\u5C14 (YER)", nameEn: "Yemeni Rial", symbol: "YR", rateToUsd: 250, region: "\u4E2D\u4E1C" },
  { code: "BHD", nameZh: "\u5DF4\u6797\u7B2C\u7EB3\u5C14 (BHD)", nameEn: "Bahraini Dinar", symbol: "BD", rateToUsd: 0.376, region: "\u4E2D\u4E1C" },
  { code: "SRD", nameZh: "\u82CF\u91CC\u5357\u5143 (SRD)", nameEn: "Surinamese Dollar", symbol: "$", rateToUsd: 37, region: "\u62C9\u7F8E" },
  { code: "GYD", nameZh: "\u572D\u4E9A\u90A3\u5143 (GYD)", nameEn: "Guyanese Dollar", symbol: "G$", rateToUsd: 209, region: "\u62C9\u7F8E" },
  // 🌊 太平洋岛国 (Pacific Islands)
  { code: "PGK", nameZh: "\u5DF4\u5E03\u4E9A\u65B0\u51E0\u5185\u4E9A\u57FA\u90A3 (PGK)", nameEn: "Papua New Guinea Kina", symbol: "K", rateToUsd: 3.95, region: "\u592A\u5E73\u6D0B" },
  { code: "FJD", nameZh: "\u6590\u6D4E\u5143 (FJD)", nameEn: "Fijian Dollar", symbol: "FJ$", rateToUsd: 2.25, region: "\u592A\u5E73\u6D0B" },
  { code: "WST", nameZh: "\u8428\u6469\u4E9A\u5854\u62C9 (WST)", nameEn: "Samoan Tala", symbol: "WS$", rateToUsd: 2.7, region: "\u592A\u5E73\u6D0B" },
  { code: "TOP", nameZh: "\u6C64\u52A0\u6F58\u52A0 (TOP)", nameEn: "Tongan Pa\u02BBanga", symbol: "T$", rateToUsd: 2.35, region: "\u592A\u5E73\u6D0B" },
  { code: "VUV", nameZh: "\u74E6\u52AA\u963F\u56FE\u74E6\u56FE (VUV)", nameEn: "Vanuatu Vatu", symbol: "VT", rateToUsd: 118, region: "\u592A\u5E73\u6D0B" },
  { code: "SBD", nameZh: "\u6240\u7F57\u95E8\u7FA4\u5C9B\u5143 (SBD)", nameEn: "Solomon Islands Dollar", symbol: "SI$", rateToUsd: 8.4, region: "\u592A\u5E73\u6D0B" },
  // ➕ 自定义币种占位（实际由用户在 UI 中输入 3 字母代码）
  { code: "__CUSTOM__", nameZh: "\u2795 \u5176\u4ED6\u5E01\u79CD\uFF08\u81EA\u5B9A\u4E49 3 \u5B57\u6BCD\u4EE3\u7801\uFF09", nameEn: "Other (Custom Code)", symbol: "\xA4", rateToUsd: 1, region: "\u5176\u4ED6", isCustomOption: true }
];

// server.ts
try {
  if (!process.env.VERCEL && typeof process.loadEnvFile === "function") {
    process.loadEnvFile();
  }
} catch {
}
var app = express();
var PORT = 3e3;
app.use(express.json({ limit: "10mb" }));
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
var aiClient = null;
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
var geminiQuotaCooldownUntil = 0;
var GEMINI_QUOTA_COOLDOWN_MS = 90 * 1e3;
var GEMINI_MODELS = ["gemini-3.6-flash"];
async function generateGeminiContent(contents, systemInstruction, timeoutMs = 25e3) {
  const ai = getGeminiClient();
  if (!ai) throw new Error("Gemini API key not configured");
  let lastError = null;
  for (const model of GEMINI_MODELS) {
    try {
      const response = await Promise.race([
        ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            responseMimeType: "application/json"
          }
        }),
        new Promise(
          (_, reject) => setTimeout(() => reject(new Error(`Gemini "${model}" timed out after ${timeoutMs}ms`)), timeoutMs)
        )
      ]);
      const text = response.text || "";
      if (!text.trim()) throw new Error(`Gemini "${model}" returned an empty response`);
      return text;
    } catch (err) {
      lastError = err;
      console.warn(`Gemini model "${model}" failed:`, err?.message || err);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("All Gemini models failed");
}
var CURRENCY_ALIASES = {
  USD: ["\u7F8E\u5143", "\u7F8E\u91D1", "\u7F8E\u5200", "usd"],
  CNY: ["\u4EBA\u6C11\u5E01", "rmb", "cny", "\u5757\u94B1"],
  HKD: ["\u6E2F\u5E01", "hkd"],
  EUR: ["\u6B27\u5143", "eur"],
  GBP: ["\u82F1\u9551", "gbp"],
  JPY: ["\u65E5\u5143", "jpy"],
  KES: ["\u80AF\u5C3C\u4E9A\u5148\u4EE4", "\u80AF\u5148\u4EE4", "kes"],
  NGN: ["\u5948\u62C9", "\u5C3C\u65E5\u5229\u4E9A\u5948\u62C9", "ngn"],
  EGP: ["\u57C3\u9551", "\u57C3\u53CA\u9551", "egp"],
  THB: ["\u6CF0\u94E2", "thb"],
  VND: ["\u8D8A\u5357\u76FE", "vnd"],
  IDR: ["\u5370\u5C3C\u76FE", "idr"],
  PHP: ["\u6BD4\u7D22", "\u83F2\u5F8B\u5BBE\u6BD4\u7D22", "php"],
  MMK: ["\u7F05\u5143", "\u7F05\u5E01", "mmk"],
  KHR: ["\u745E\u5C14", "\u67EC\u57D4\u5BE8\u745E\u5C14", "khr"],
  LAK: ["\u57FA\u666E", "\u8001\u631D\u57FA\u666E", "lak"],
  BDT: ["\u5854\u5361", "\u5B5F\u52A0\u62C9\u5854\u5361", "bdt"],
  LKR: ["\u5362\u6BD4", "\u65AF\u91CC\u5170\u5361\u5362\u6BD4", "lkr"],
  ETB: ["\u57C3\u585E\u4FC4\u6BD4\u4E9A\u6BD4\u5C14", "\u6BD4\u5C14", "etb"]
};
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function currencyDisplay(code) {
  const c = SUPPORTED_CURRENCIES.find((x) => x.code === code);
  if (c) return c.nameZh;
  return code;
}
function tryCurrencyConversion(question) {
  if (!/等于|换算|兑换|换成|多少人民币|折合|相当于|convert|exchange/i.test(question)) return null;
  if (/自报|填报|填多少|怎么填|黑市|官方汇率|民间汇率/.test(question)) return null;
  for (const [code, aliases] of Object.entries(CURRENCY_ALIASES)) {
    const aliasRegex = aliases.map(escapeRegex).join("|");
    const m = question.match(new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(${aliasRegex})`, "i"));
    if (!m) continue;
    const amount = parseFloat(m[1].replace(/,/g, ""));
    const fromCode = code;
    const rest = question.replace(m[0], "");
    let toCode = null;
    for (const [c2, aliases2] of Object.entries(CURRENCY_ALIASES)) {
      if (c2 === fromCode) continue;
      if (aliases2.some((a) => rest.toLowerCase().includes(a.toLowerCase()))) {
        toCode = c2;
        break;
      }
    }
    if (!toCode) toCode = fromCode === "CNY" ? "USD" : "CNY";
    const fromRate = SUPPORTED_CURRENCIES.find((c) => c.code === fromCode)?.rateToUsd || 1;
    const toRate = SUPPORTED_CURRENCIES.find((c) => c.code === toCode)?.rateToUsd || 1;
    const result = amount / fromRate * toRate;
    const rounded = Math.abs(result) >= 100 ? Math.round(result) : Math.round(result * 100) / 100;
    return `\u3010\u{1F4B1} \u5E01\u79CD\u6362\u7B97\u3011

${amount.toLocaleString("zh-CN")} ${currencyDisplay(fromCode)} \u2248 ${rounded.toLocaleString("zh-CN", { maximumFractionDigits: 2 })} ${currencyDisplay(toCode)}

\uFF08\u5E73\u53F0\u5185\u7F6E\u53C2\u8003\u6C47\u7387\uFF1A1 USD \u2248 ${toRate.toLocaleString("zh-CN", { maximumFractionDigits: 2 })} ${currencyDisplay(toCode)}\u3002\u5B9E\u9645\u4EA4\u6613\u8BF7\u4EE5\u5F53\u5730\u5F53\u65E5\u5E02\u573A\u6C47\u7387\u4E3A\u51C6\uFF0C\u672C\u6362\u7B97\u4EC5\u4F9B\u53C2\u8003\u3002\uFF09`;
  }
  return null;
}
var GENERAL_KNOWLEDGE = {
  // ===== 中国古镇 / 景点 =====
  "\u5468\u5E84": {
    answer: '\u5468\u5E84\u4F4D\u4E8E\u4E2D\u56FD\u6C5F\u82CF\u7701\u82CF\u5DDE\u5E02\u6606\u5C71\u5E02\uFF0C\u662F\u4E00\u5EA7\u6709 900 \u591A\u5E74\u5386\u53F2\u7684\u6C5F\u5357\u6C34\u4E61\u53E4\u9547\uFF0C\u88AB\u8A89\u4E3A"\u4E2D\u56FD\u7B2C\u4E00\u6C34\u4E61"\uFF0C\u662F\u56FD\u5BB6 5A \u7EA7\u65C5\u6E38\u666F\u533A\u3002\u5168\u9547\u4F9D\u6C34\u800C\u5EFA\uFF0C\u81F3\u4ECA\u4FDD\u5B58\u7740\u8FD1 100 \u5EA7\u660E\u6E05\u53E4\u5EFA\u7B51\uFF08\u5982\u53CC\u6865\u3001\u6C88\u5385\u3001\u5F20\u5385\uFF09\uFF0C\u753B\u5BB6\u9648\u9038\u98DE\u540D\u4F5C\u300A\u6545\u4E61\u7684\u56DE\u5FC6\u300B\u5373\u53D6\u6750\u4E8E\u6B64\u3002',
    hint: "\u4E2D\u56FD\xB7\u6C5F\u82CF\xB7\u82CF\u5DDE\xB7\u6606\u5C71"
  },
  "\u4E4C\u9547": {
    answer: "\u4E4C\u9547\u4F4D\u4E8E\u4E2D\u56FD\u6D59\u6C5F\u7701\u5609\u5174\u5E02\u6850\u4E61\u5E02\uFF0C\u4EAC\u676D\u5927\u8FD0\u6CB3\u7554\u7684\u5178\u578B\u6C5F\u5357\u6C34\u4E61\u53E4\u9547\uFF0C\u5206\u4E3A\u4E1C\u6805\uFF08\u4F20\u7EDF\u89C2\u5149\uFF09\u548C\u897F\u6805\uFF08\u4F11\u95F2\u5EA6\u5047\uFF09\u4E24\u5927\u666F\u533A\uFF0C\u662F\u4E16\u754C\u4E92\u8054\u7F51\u5927\u4F1A\u6C38\u4E45\u4F1A\u5740\u3002",
    hint: "\u4E2D\u56FD\xB7\u6D59\u6C5F\xB7\u5609\u5174\xB7\u6850\u4E61"
  },
  "\u4E3D\u6C5F": {
    answer: "\u4E3D\u6C5F\u4F4D\u4E8E\u4E2D\u56FD\u4E91\u5357\u7701\u897F\u5317\u90E8\uFF0C\u662F\u7EB3\u897F\u65CF\u6587\u5316\u4E2D\u5FC3\u3002\u4E3D\u6C5F\u53E4\u57CE\uFF08\u53C8\u79F0\u5927\u7814\u53E4\u9547\uFF09\u59CB\u5EFA\u4E8E\u5B8B\u672B\u5143\u521D\uFF0C\u662F\u4E2D\u56FD\u4FDD\u5B58\u6700\u5B8C\u6574\u7684\u5C11\u6570\u6C11\u65CF\u53E4\u57CE\u4E4B\u4E00\uFF0C1997 \u5E74\u88AB\u5217\u5165\u4E16\u754C\u6587\u5316\u9057\u4EA7\uFF1B\u8457\u540D\u666F\u70B9\u8FD8\u5305\u62EC\u7389\u9F99\u96EA\u5C71\u3001\u6CF8\u6CBD\u6E56\u3001\u8336\u9A6C\u53E4\u9053\u7B49\u3002",
    hint: "\u4E2D\u56FD\xB7\u4E91\u5357"
  },
  "\u5E73\u9065": {
    answer: '\u5E73\u9065\u4F4D\u4E8E\u4E2D\u56FD\u5C71\u897F\u7701\u664B\u4E2D\u5E02\uFF0C\u5E73\u9065\u53E4\u57CE\u59CB\u5EFA\u4E8E\u897F\u5468\u5BA3\u738B\u65F6\u671F\uFF08\u516C\u5143\u524D 827 \u5E74\u2014\u524D 782 \u5E74\uFF09\uFF0C\u662F\u4E2D\u56FD\u4FDD\u5B58\u6700\u5B8C\u6574\u7684\u660E\u6E05\u65F6\u671F\u53E4\u4EE3\u53BF\u57CE\u539F\u578B\uFF0C1997 \u5E74\u4E0E\u4E3D\u6C5F\u53E4\u57CE\u7B49\u4E00\u5E76\u5217\u5165\u4E16\u754C\u6587\u5316\u9057\u4EA7\uFF1B\u53E4\u57CE\u5185\u7684"\u65E5\u6607\u660C"\u662F\u4E2D\u56FD\u6700\u65E9\u7684\u7968\u53F7\uFF08\u94F6\u884C\u96CF\u5F62\uFF09\u3002',
    hint: "\u4E2D\u56FD\xB7\u5C71\u897F\xB7\u664B\u4E2D"
  },
  "\u51E4\u51F0": {
    answer: "\u51E4\u51F0\u53E4\u57CE\u4F4D\u4E8E\u4E2D\u56FD\u6E56\u5357\u7701\u6E58\u897F\u571F\u5BB6\u65CF\u82D7\u65CF\u81EA\u6CBB\u5DDE\u6CB1\u6C5F\u4E0B\u6E38\uFF0C\u4F9D\u5C71\u508D\u6C34\uFF0C\u662F\u82D7\u65CF\u3001\u571F\u5BB6\u65CF\u7B49\u5C11\u6570\u6C11\u65CF\u805A\u5C45\u7684\u5343\u5E74\u53E4\u57CE\uFF0C\u6C88\u4ECE\u6587\u7B14\u4E0B\u7684\u300A\u8FB9\u57CE\u300B\u5373\u4EE5\u6B64\u4E3A\u80CC\u666F\u3002",
    hint: "\u4E2D\u56FD\xB7\u6E56\u5357\xB7\u6E58\u897F"
  },
  // ===== 中国历史 / 思想人物 =====
  "\u5B54\u5B50": {
    answer: '\u5B54\u5B50\uFF08\u516C\u5143\u524D 551 \u5E74\u2014\u516C\u5143\u524D 479 \u5E74\uFF09\uFF0C\u540D\u4E18\uFF0C\u5B57\u4EF2\u5C3C\uFF0C\u6625\u79CB\u65F6\u671F\u9C81\u56FD\uFF08\u4ECA\u5C71\u4E1C\u66F2\u961C\uFF09\u4EBA\uFF0C\u4E2D\u56FD\u53E4\u4EE3\u6700\u4F1F\u5927\u7684\u601D\u60F3\u5BB6\u3001\u6559\u80B2\u5BB6\u4E4B\u4E00\uFF0C\u5112\u5BB6\u5B66\u6D3E\u521B\u59CB\u4EBA\u3002\u6838\u5FC3\u601D\u60F3\u5305\u62EC"\u4EC1""\u4E49""\u793C""\u667A""\u4FE1"\uFF0C\u4E3B\u5F20"\u6709\u6559\u65E0\u7C7B"\u3002\u5176\u8A00\u884C\u88AB\u5F1F\u5B50\u8F91\u5F55\u4E3A\u300A\u8BBA\u8BED\u300B\uFF0C\u5BF9\u4E2D\u534E\u6587\u5316\u4E0E\u4E1C\u4E9A\u6587\u660E\u5F71\u54CD\u903E\u4E24\u5343\u5E74\u3002',
    hint: "\u6625\u79CB\xB7\u9C81\u56FD\xB7\u5112\u5BB6"
  },
  "\u8001\u5B50": {
    answer: "\u8001\u5B50\uFF08\u7EA6\u516C\u5143\u524D 571 \u5E74\u2014\u7EA6\u516C\u5143\u524D 471 \u5E74\uFF09\uFF0C\u59D3\u674E\u540D\u8033\uFF0C\u5B57\u8043\uFF0C\u6625\u79CB\u65F6\u671F\u695A\u56FD\uFF08\u4ECA\u6CB3\u5357\u9E7F\u9091\uFF09\u4EBA\uFF0C\u9053\u5BB6\u5B66\u6D3E\u521B\u59CB\u4EBA\uFF0C\u4E16\u754C\u767E\u4F4D\u5386\u53F2\u6587\u5316\u540D\u4EBA\u4E4B\u4E00\u3002\u5176\u4EE3\u8868\u4F5C\u300A\u9053\u5FB7\u7ECF\u300B\uFF08\u53C8\u79F0\u300A\u8001\u5B50\u300B\uFF09\u4EC5 5,000 \u4F59\u5B57\uFF0C\u5374\u88AB\u8BD1\u6210\u8FD1\u767E\u79CD\u8BED\u8A00\uFF0C\u662F\u5168\u7403\u53D1\u884C\u91CF\u4EC5\u6B21\u4E8E\u300A\u5723\u7ECF\u300B\u7684\u7ECF\u5178\u3002",
    hint: "\u6625\u79CB\xB7\u695A\u56FD\xB7\u9053\u5BB6"
  },
  "\u5E84\u5B50": {
    answer: '\u5E84\u5B50\uFF08\u7EA6\u516C\u5143\u524D 369 \u5E74\u2014\u7EA6\u516C\u5143\u524D 286 \u5E74\uFF09\uFF0C\u540D\u5468\uFF0C\u6218\u56FD\u65F6\u671F\u5B8B\u56FD\u8499\uFF08\u4ECA\u6CB3\u5357\u5546\u4E18\u6216\u5B89\u5FBD\u8499\u57CE\uFF09\u4EBA\uFF0C\u9053\u5BB6\u5B66\u6D3E\u4EE3\u8868\u4EBA\u7269\uFF0C\u4E0E\u8001\u5B50\u5E76\u79F0"\u8001\u5E84"\u3002\u4EE3\u8868\u4F5C\u300A\u5E84\u5B50\u300B\uFF08\u53C8\u79F0\u300A\u5357\u534E\u7ECF\u300B\uFF09\u4EE5\u5BD3\u8A00\u8457\u79F0\uFF0C"\u5E84\u5468\u68A6\u8776""\u5E96\u4E01\u89E3\u725B""\u9C7C\u4E4B\u4E50"\u7B49\u5178\u6545\u5E7F\u4E3A\u6D41\u4F20\u3002',
    hint: "\u6218\u56FD\xB7\u5B8B\u56FD\xB7\u9053\u5BB6"
  },
  "\u5B5F\u5B50": {
    answer: '\u5B5F\u5B50\uFF08\u7EA6\u516C\u5143\u524D 372 \u5E74\u2014\u7EA6\u516C\u5143\u524D 289 \u5E74\uFF09\uFF0C\u540D\u8F72\uFF0C\u5B57\u5B50\u8206\uFF0C\u6218\u56FD\u65F6\u671F\u90B9\u56FD\uFF08\u4ECA\u5C71\u4E1C\u90B9\u57CE\uFF09\u4EBA\uFF0C\u5112\u5BB6\u5B66\u6D3E\u4E3B\u8981\u4EE3\u8868\u4E4B\u4E00\uFF0C\u88AB\u5C0A\u4E3A"\u4E9A\u5723"\u3002\u6838\u5FC3\u601D\u60F3\u5305\u62EC"\u6027\u5584\u8BBA""\u4EC1\u653F""\u6C11\u8D35\u541B\u8F7B"\uFF0C\u4E0E\u5B54\u5B50\u5E76\u79F0"\u5B54\u5B5F"\u3002',
    hint: "\u6218\u56FD\xB7\u90B9\u56FD\xB7\u5112\u5BB6"
  },
  "\u91CA\u8FE6\u725F\u5C3C": {
    answer: '\u91CA\u8FE6\u725F\u5C3C\uFF08\u7EA6\u516C\u5143\u524D 565 \u5E74\u2014\u7EA6\u516C\u5143\u524D 486 \u5E74\uFF09\uFF0C\u672C\u540D\u4E54\u8FBE\u6469\xB7\u6089\u8FBE\u591A\uFF0C\u53E4\u5370\u5EA6\u8FE6\u6BD7\u7F57\u536B\u56FD\uFF08\u4ECA\u5C5E\u5C3C\u6CCA\u5C14\u5883\u5185\uFF09\u738B\u5B50\uFF0C\u4F5B\u6559\u7684\u521B\u7ACB\u8005\u300229 \u5C81\u51FA\u5BB6\u4FEE\u884C\uFF0C35 \u5C81\u5728\u83E9\u63D0\u4F3D\u8036\u609F\u9053\uFF0C\u6B64\u540E 45 \u5E74\u95F4\u5728\u6052\u6CB3\u6D41\u57DF\u4F20\u6CD5\uFF0C\u5960\u5B9A\u4E86\u4F5B\u6559\u7684\u6838\u5FC3\u7406\u8BBA\uFF08"\u56DB\u5723\u8C1B""\u516B\u6B63\u9053""\u7F18\u8D77"\uFF09\u3002',
    hint: "\u53E4\u5370\u5EA6\xB7\u4F5B\u6559"
  },
  "\u8036\u7A23": {
    answer: "\u8036\u7A23\u57FA\u7763\uFF08\u7EA6\u516C\u5143\u524D 4 \u5E74\u2014\u516C\u5143 30/33 \u5E74\uFF09\uFF0C\u51FA\u751F\u4E8E\u7F57\u9A6C\u5E1D\u56FD\u72B9\u592A\u884C\u7701\u4F2F\u5229\u6052\uFF0C\u662F\u57FA\u7763\u6559\u7684\u6838\u5FC3\u4EBA\u7269\uFF0C\u88AB\u57FA\u7763\u5F92\u5949\u4E3A\u795E\u7684\u513F\u5B50\u548C\u6551\u4E3B\u3002\u57FA\u7763\u6559\u76F8\u4FE1\u4ED6\u4E3A\u4E86\u6551\u8D4E\u4EBA\u7C7B\u800C\u964D\u751F\u3001\u88AB\u9489\u5341\u5B57\u67B6\u3001\u7B2C\u4E09\u5929\u590D\u6D3B\u3002\u516C\u5143\u7EAA\u5E74\u5373\u4EE5\u4ED6\u51FA\u751F\u4E3A\u5206\u754C\u3002",
    hint: "\u516C\u5143\u5143\u5E74\xB7\u57FA\u7763\u6559"
  },
  // ===== 中国传统文化 / 节日 =====
  "\u6625\u8282": {
    answer: '\u6625\u8282\uFF08\u519C\u5386\u6B63\u6708\u521D\u4E00\uFF09\u662F\u4E2D\u534E\u6C11\u65CF\u6700\u9686\u91CD\u7684\u4F20\u7EDF\u8282\u65E5\uFF0C\u53C8\u79F0"\u5E74\u8282""\u65B0\u6625""\u5C81\u9996"\uFF0C\u8DDD\u4ECA\u5DF2\u6709 4,000 \u4F59\u5E74\u5386\u53F2\u3002\u4F20\u7EDF\u4E60\u4FD7\u5305\u62EC\u8D34\u6625\u8054\u3001\u653E\u97AD\u70AE\u3001\u5403\u5E74\u591C\u996D\u3001\u7ED9\u538B\u5C81\u94B1\u3001\u62DC\u5E74\u8D70\u4EB2\u7B49\uFF1B2024 \u5E74\u8D77\u6625\u8282\u88AB\u5217\u5165\u8054\u5408\u56FD\u5047\u65E5\u3002',
    hint: "\u519C\u5386\u65B0\u5E74"
  },
  "\u4E2D\u79CB": {
    answer: '\u4E2D\u79CB\u8282\u4E3A\u519C\u5386\u516B\u6708\u5341\u4E94\uFF0C\u662F\u4E2D\u56FD\u56DB\u5927\u4F20\u7EDF\u8282\u65E5\u4E4B\u4E00\uFF0C\u6B63\u503C\u4E09\u79CB\u4E4B\u534A\uFF0C\u6545\u540D"\u4E2D\u79CB"\u3002\u6838\u5FC3\u4E60\u4FD7\u662F\u8D4F\u6708\u3001\u5403\u6708\u997C\uFF0C\u8C61\u5F81\u9616\u5BB6\u56E2\u5706\u3002\u4E2D\u79CB\u6E90\u4E8E\u4E0A\u53E4\u656C\u6708\u4EEA\u5F0F\uFF0C\u5510\u4EE3\u6B63\u5F0F\u5B9A\u4E3A\u8282\u65E5\u3002',
    hint: "\u519C\u5386\u516B\u6708\u5341\u4E94"
  },
  "\u7AEF\u5348": {
    answer: '\u7AEF\u5348\u8282\u4E3A\u519C\u5386\u4E94\u6708\u521D\u4E94\uFF0C\u53C8\u79F0"\u7AEF\u9633""\u9F99\u821F\u8282"\u3002\u76F8\u4F20\u6218\u56FD\u65F6\u671F\u695A\u56FD\u8BD7\u4EBA\u5C48\u539F\u4E8E\u8BE5\u65E5\u6295\u6C68\u7F57\u6C5F\u6B89\u56FD\uFF0C\u6545\u6C11\u95F4\u6709\u5403\u7CBD\u5B50\u3001\u8D5B\u9F99\u821F\u3001\u4F69\u9999\u56CA\u3001\u6302\u827E\u8349\u7B49\u4E60\u4FD7\u30022009 \u5E74\u88AB\u5217\u5165\u4E16\u754C\u975E\u7269\u8D28\u6587\u5316\u9057\u4EA7\u3002',
    hint: "\u519C\u5386\u4E94\u6708\u521D\u4E94"
  },
  // ===== 基础科学 / 技术概念 =====
  "\u533A\u5757\u94FE": {
    answer: '\u533A\u5757\u94FE\uFF08Blockchain\uFF09\u662F\u4E00\u79CD\u53BB\u4E2D\u5FC3\u5316\u7684\u5206\u5E03\u5F0F\u8D26\u672C\u6280\u672F\uFF0C\u7531\u6309\u65F6\u95F4\u987A\u5E8F\u4E32\u8054\u7684"\u533A\u5757"\u7EC4\u6210\uFF0C\u6BCF\u4E2A\u533A\u5757\u5305\u542B\u524D\u4E00\u4E2A\u533A\u5757\u7684\u54C8\u5E0C\u503C\uFF0C\u4F7F\u5F97\u6570\u636E\u4E00\u65E6\u5199\u5165\u4FBF\u96BE\u4EE5\u7BE1\u6539\u3002\u5B83\u662F\u6BD4\u7279\u5E01\u7B49\u52A0\u5BC6\u8D27\u5E01\u7684\u5E95\u5C42\u6280\u672F\uFF0C\u4E5F\u88AB\u5E7F\u6CDB\u5E94\u7528\u4E8E\u4F9B\u5E94\u94FE\u6EAF\u6E90\u3001\u6570\u5B57\u8EAB\u4EFD\u3001\u5408\u7EA6\u81EA\u52A8\u5316\uFF08\u667A\u80FD\u5408\u7EA6\uFF09\u7B49\u9886\u57DF\u3002',
    hint: "\u5206\u5E03\u5F0F\u8D26\u672C"
  },
  "5g": {
    answer: "5G \u662F\u7B2C\u4E94\u4EE3\u79FB\u52A8\u901A\u4FE1\u6280\u672F\uFF085th Generation\uFF09\uFF0C\u76F8\u6BD4 4G \u5177\u5907\u4E09\u5927\u7279\u6027\uFF1A\u589E\u5F3A\u79FB\u52A8\u5BBD\u5E26\uFF08eMBB\uFF0C\u5CF0\u503C\u901F\u7387\u53EF\u8FBE 10 Gbps\uFF09\u3001\u8D85\u53EF\u9760\u4F4E\u65F6\u5EF6\u901A\u4FE1\uFF08uRLLC\uFF0C\u65F6\u5EF6\u4F4E\u81F3 1 ms\uFF09\u3001\u6D77\u91CF\u673A\u5668\u7C7B\u901A\u4FE1\uFF08mMTC\uFF0C\u6BCF\u5E73\u65B9\u516C\u91CC\u652F\u6301 100 \u4E07\u8BBE\u5907\uFF09\u3002\u5546\u7528\u573A\u666F\u5305\u62EC\u81EA\u52A8\u9A7E\u9A76\u3001\u8FDC\u7A0B\u624B\u672F\u3001\u5DE5\u4E1A\u4E92\u8054\u7F51\u3001AR/VR \u7B49\u3002",
    hint: "\u7B2C\u4E94\u4EE3\u79FB\u52A8\u901A\u4FE1"
  }
};
function tryGeneralKnowledge(question) {
  const q = question.toLowerCase().trim();
  for (const [key, entry] of Object.entries(GENERAL_KNOWLEDGE)) {
    if (q.includes(key.toLowerCase())) {
      return entry;
    }
  }
  return null;
}
app.get("/api/health", (req, res) => {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
  const hasGemini = Boolean(geminiKey && geminiKey !== "MY_GEMINI_API_KEY");
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const hasSupabase = Boolean(supabaseUrl && supabaseKey);
  res.json({
    status: "ok",
    version: "1.4.1",
    hasGeminiKey: hasGemini,
    hasSupabaseConfig: hasSupabase,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.post(
  ["/api/ai/chat", "/api/ai-consultation"],
  asyncHandler(async (req, res) => {
    const body = (req.body && typeof req.body === "object" ? req.body : {}) || {};
    const question = String(body.question ?? body.message ?? "").trim();
    const { context, language = "zh" } = body;
    if (!question) {
      return res.status(400).json({ error: "Question or message is required" });
    }
    const ai = getGeminiClient();
    let geminiUnavailable = !ai;
    let geminiError = null;
    let geminiErrorKind = null;
    const isEdgeKeyword = /休渔|季节|倒闭|天灾|战乱|物物交换|欠条|赊账|没有发票|教会赠款|非官方汇率|两套账|换人|无执照/i.test(
      question
    );
    if (ai) {
      if (Date.now() < geminiQuotaCooldownUntil) {
        geminiUnavailable = true;
        geminiErrorKind = "quota";
        geminiError = "Gemini \u514D\u8D39\u914D\u989D\u51B7\u5374\u4E2D\uFF0C\u5DF2\u5207\u6362\u672C\u5730\u89C4\u5219\u5E93\u56DE\u7B54";
      } else {
        try {
          const systemInstruction = `
\u4F60\u662F\u4E00\u4E2A\u53CB\u5584\u3001\u535A\u5B66\u3001\u4E50\u4E8E\u52A9\u4EBA\u7684\u901A\u7528 AI \u52A9\u624B\uFF0C\u670D\u52A1\u4E8E"\u5546\u4E1A\u5BA3\u6559\u8D22\u52A1\u6D4B\u7B97"\u5E73\u53F0\uFF08BAM \u5E73\u53F0\uFF0C\u5168\u7403\u6D77\u5916\u5C0F\u5FAE\u5546\u4E1A\u81EA\u6D4B\u8BC4\u5206\u5DE5\u5177\uFF09\u3002
\u4F60\u53EF\u4EE5\u56DE\u7B54\u7528\u6237\u63D0\u51FA\u7684\u3010\u4EFB\u4F55\u95EE\u9898\u3011\u2014\u2014\u5305\u62EC\u4F46\u4E0D\u9650\u4E8E\uFF1A\u8D22\u52A1\u4E0E\u5546\u4E1A\u5E38\u8BC6\u3001\u5C0F\u5FAE\u751F\u610F\u7ECF\u8425\u3001\u5E73\u53F0\u586B\u62A5\u4E0E\u8BC4\u5206\u89C4\u5219\u3001\u65E5\u5E38\u5B9E\u7528\u77E5\u8BC6\u3001\u751F\u6D3B\u6280\u5DE7\u3001\u6280\u672F\u95EE\u9898\u3001\u8BED\u8A00\u7FFB\u8BD1\u3001\u6982\u5FF5\u89E3\u91CA\u7B49\u3002

\u3010\u56DE\u7B54\u51C6\u5219\u3011
1. \u7528\u6237\u95EE\u4EC0\u4E48\u5C31\u7B54\u4EC0\u4E48\u3002\u4E0D\u8981\u5F3A\u884C\u628A\u8BDD\u9898\u5F15\u5BFC\u5230\u5546\u4E1A\u81EA\u6D4B\u4E0A\uFF0C\u9664\u975E\u7528\u6237\u4E3B\u52A8\u8BE2\u95EE\u672C\u5E73\u53F0\u7684\u586B\u62A5/\u8BC4\u5206/\u89C4\u5219\u3002
2. \u4F7F\u7528\u4E0E\u7528\u6237\u63D0\u95EE\u76F8\u540C\u7684\u8BED\u8A00\u56DE\u7B54\uFF08\u4E2D\u6587\u95EE\u9898\u7528\u4E2D\u6587\uFF0C\u82F1\u6587\u95EE\u9898\u7528\u82F1\u6587\uFF0C\u5176\u4ED6\u8BED\u8A00\u540C\u7406\uFF09\u3002
3. \u56DE\u7B54\u901A\u4FD7\u6613\u61C2\u3001\u7ED3\u6784\u6E05\u6670\u3001\u76F4\u63A5\u6709\u7528\uFF1B\u5FC5\u8981\u65F6\u7528\u5927\u767D\u8BDD\u89E3\u91CA\u4E13\u4E1A\u672F\u8BED\u3002
4. \u5F53\u95EE\u9898\u6D89\u53CA\u672C\u5E73\u53F0\u7684"\u5546\u4E1A\u6A21\u578B\u81EA\u6D4B\u3001\u8BC4\u5206\u89C4\u5219\u3001\u586B\u62A5\u6307\u5F15"\u65F6\uFF0C\u5207\u6362\u4E3A\u5E73\u53F0\u4E13\u5BB6\u6A21\u5F0F\uFF1A
   - \u7528\u5927\u767D\u8BDD\u89E3\u91CA\u6982\u5FF5\uFF08\u5982\uFF1A\u7ECF\u8425\u6708\u5747\u603B\u6D41\u6C34 = \u5BA2\u4EBA\u4E70\u5355\u7684\u603B\u8FDB\u8D26\uFF0C\u8FD8\u6CA1\u6263\u4EFB\u4F55\u6210\u672C\uFF1B\u6BDB\u5229 = \u6D41\u6C34\u51CF\u8FDB\u8D27\u672C\u94B1\uFF1BOPEX = \u6BCF\u6708\u96F7\u6253\u4E0D\u52A8\u7684\u623F\u79DF\u4E0E\u4EBA\u5DE5\uFF09\uFF1B
   - \u7ED3\u5408\u884C\u4E1A\u5927\u6570\u636E\u57FA\u51C6\u7ED9\u51FA\u53C2\u8003\uFF08\u5982\u9910\u996E\u6BDB\u5229\u7387\u7EA655%-70%\u3001\u793E\u533A\u96F6\u552E20%-35%\u3001\u751F\u6D3B\u670D\u52A170%-88%\u3001\u5907\u7528\u91D1\u5EFA\u8BAE\u22653\u4E2A\u6708\u56FA\u5B9A\u5F00\u9500\uFF09\uFF1B
   - \u660E\u786E\u8BF4\u660E"\u6B64\u5904\u7684\u89C4\u5219\u63D0\u95EE\u4EC5\u7528\u4E8E\u8F85\u52A9\u7406\u89E3\uFF0C\u7EDD\u4E0D\u8BA1\u5165\u8BC4\u5206\u7CFB\u7EDF\uFF1B\u624B\u5199\u8D26\u672C\u3001\u622A\u56FE\u4E0E\u7EAF\u624B\u52A8\u586B\u5199 100% \u540C\u6743\u3001\u96F6\u6B67\u89C6"\uFF1B
   - \u9047\u5230\u4F11\u6E14\u671F\u3001\u6218\u4E71\u6C47\u7387\u3001\u7269\u7269\u4EA4\u6362\u3001\u65E0\u53D1\u7968\u7B49\u8FB9\u7F18\u60C5\u51B5\u65F6\uFF0C\u7ED9\u51FA 2 \u79CD\u4FDD\u5B88\u586B\u62A5\u8DEF\u5F84\uFF08\u8DEF\u5F84A/\u8DEF\u5F84B\uFF09\u5E76\u9884\u4F30\u5F97\u5206\u4E0E\u540E\u679C\u3002
5. "answer" \u5B57\u6BB5\u8BF7\u4F7F\u7528\u89C4\u8303\u3001\u7B80\u6D01\u7684 Markdown \u6392\u7248\uFF0C\u8BA9\u8BED\u6CD5\u7B26\u53F7\u4E0E\u88C5\u9970\u7B26\u53F7\u5C3D\u91CF\u5C11\uFF1A
   - \u63A8\u8350\u4F7F\u7528\uFF1A## / ### \u5C0F\u6807\u9898\u3001**\u52A0\u7C97**\u3001- \u65E0\u5E8F\u5217\u8868\u30011. \u6709\u5E8F\u5217\u8868\uFF1B
   - \u4E0D\u8981\u5806\u780C\u88C5\u9970\u6027\u7B26\u53F7\u4E0E\u8868\u60C5\u7B26\u53F7\uFF08\u4F8B\u5982 \u26A0\uFE0F \u{1F4CC} \u{1F511} 1\uFE0F\u20E3 \u3010\u3011 \u7B49\u82B1\u54E8\u6807\u8BB0\uFF09\uFF0C\u9664\u975E\u8868\u8FBE\u91CD\u8981\u98CE\u9669\u63D0\u793A\uFF0C\u4E00\u6761\u56DE\u7B54\u4E2D emoji \u6700\u591A 1 \u4E2A\uFF1B
   - \u907F\u514D\u7528\u8FDE\u7EED\u7279\u6B8A\u7B26\u53F7\uFF08\u5982 ===\u3001>>>\u3001\u2022\u2022\u2022\uFF09\u88C5\u9970\u7248\u9762\uFF0C\u4FDD\u6301\u5E72\u51C0\u6613\u8BFB\uFF1B
   - \u9700\u8981\u6362\u884C\u5904\u7528\u7A7A\u884C\u5206\u6BB5\uFF0C\u4E0D\u8981\u5728\u6BCF\u884C\u672B\u5C3E\u6DFB\u52A0\u4E24\u4E2A\u7A7A\u683C\u7B49\u9690\u85CF\u7B26\u53F7\u3002

\u8FD4\u56DE\u5408\u6CD5\u7684 JSON \u6570\u636E\uFF0C\u683C\u5F0F\u5982\u4E0B\uFF1A
{
  "answer": "\u5BF9\u7528\u6237\u95EE\u9898\u7684\u5B8C\u6574\u3001\u76F4\u63A5\u3001\u6709\u7528\u7684\u56DE\u7B54",
  "confidence": "HIGH" | "LOW_EDGE_CASE",
  "isEdgeCase": boolean,
  "category": "\u7B80\u77ED\u7684\u95EE\u9898\u7C7B\u578B\u6807\u7B7E\uFF08\u5982\uFF1A\u901A\u7528\u95EE\u7B54 | \u6982\u5FF5\u5927\u767D\u8BDD\u89E3\u6790 | \u884C\u4E1A\u5927\u6570\u636E\u57FA\u51C6 | \u89C4\u5219\u5408\u89C4\u6307\u5F15 | \u8FB9\u7F18\u7591\u96BE\u63A8\u7B97\uFF09",
  "suggestedAction": "\u82E5\u6D89\u53CA\u586B\u62A5\u89C4\u5219\u5219\u7ED9\u51FA\u53EF\u843D\u5730\u7684\u586B\u62A5\u52A8\u4F5C\uFF0C\u5426\u5219\u4E3A\u7A7A\u5B57\u7B26\u4E32",
  "bigDataBenchmark": "\u82E5\u6D89\u53CA\u7ECF\u8425\u8D22\u52A1\u5219\u7ED9\u51FA\u4E00\u53E5\u884C\u4E1A\u5927\u6570\u636E\u53C2\u8003\uFF0C\u5426\u5219\u4E3A\u7A7A\u5B57\u7B26\u4E32",
  "conservativePaths": []
}
`;
          const replyText = await generateGeminiContent(
            `\u7528\u6237\u63D0\u95EE: "${question}"
\u7528\u6237\u754C\u9762\u8BED\u8A00: ${language}
\u5F53\u524D\u4E0A\u4E0B\u6587: ${JSON.stringify(context || {})}`,
            systemInstruction
          );
          try {
            const parsed = JSON.parse(replyText);
            const answerText = parsed.answer || replyText;
            if (!answerText.trim()) {
              throw new Error("Gemini returned empty answer");
            }
            return res.json({
              reply: answerText,
              aiResponse: answerText,
              answer: answerText,
              aiMode: "gemini",
              confidence: parsed.confidence || (isEdgeKeyword ? "LOW_EDGE_CASE" : "HIGH"),
              isEdgeCase: parsed.isEdgeCase ?? isEdgeKeyword,
              category: parsed.category || "AI \u667A\u80FD\u7B54\u7591",
              suggestedAction: parsed.suggestedAction || "",
              bigDataBenchmark: parsed.bigDataBenchmark || "",
              conservativePaths: parsed.conservativePaths || [],
              geminiUnavailable: false,
              geminiError: null,
              geminiErrorKind: null
            });
          } catch {
            return res.json({
              reply: replyText,
              aiResponse: replyText,
              answer: replyText,
              aiMode: "gemini",
              confidence: isEdgeKeyword ? "LOW_EDGE_CASE" : "HIGH",
              isEdgeCase: isEdgeKeyword,
              category: "AI \u667A\u80FD\u7B54\u7591",
              suggestedAction: "",
              bigDataBenchmark: "",
              conservativePaths: [],
              geminiUnavailable: false,
              geminiError: null,
              geminiErrorKind: null
            });
          }
        } catch (err) {
          console.warn("Gemini API request failed, falling back to smart big-data rule engine:", err?.message || err);
          geminiUnavailable = true;
          const errMsg = (err?.message || String(err) || "").slice(0, 200);
          geminiError = errMsg;
          if (/429|RESOURCE_EXHAUSTED|quota|Quota/i.test(errMsg)) {
            geminiErrorKind = "quota";
            geminiQuotaCooldownUntil = Date.now() + GEMINI_QUOTA_COOLDOWN_MS;
          } else if (/401|403|api key|permission|unauthorized/i.test(errMsg)) {
            geminiErrorKind = "auth";
          } else if (/404|no longer available|not found|does not support/i.test(errMsg)) {
            geminiErrorKind = "model";
          } else if (/timed out|timeout/i.test(errMsg)) {
            geminiErrorKind = "timeout";
          } else {
            geminiErrorKind = "network";
          }
        }
      }
    }
    let fallbackReply = "";
    let isEdgeCase = isEdgeKeyword;
    let category = "\u5C0F\u5FAE\u7ECF\u9A8C\u586B\u62A5\u4E0E\u5927\u6570\u636E\u89E3\u6790";
    let suggestedAction = "\u89C4\u5219\u6E05\u6670\uFF0C\u53EF\u653E\u5FC3\u586B\u62A5";
    let bigDataBenchmark = "";
    let paths = void 0;
    const lowerQ = question.toLowerCase();
    if (/^(你好|您好|哈喽|嗨|早上好|下午好|晚上好|hello|hi|hey|good morning|good afternoon|good evening)[，。!！~\s]*$/i.test(question.trim())) {
      category = "\u65E5\u5E38\u95EE\u5019";
      suggestedAction = "";
      bigDataBenchmark = "";
      fallbackReply = `\u3010\u{1F44B} \u60A8\u597D\uFF01\u5F88\u9AD8\u5174\u89C1\u5230\u60A8\uFF01\u3011

\u6211\u662F\u672C\u5E73\u53F0\u7684 AI \u667A\u80FD\u7B54\u7591\u52A9\u624B\uFF0C\u53EF\u4EE5\u4E3A\u60A8\u89E3\u7B54\uFF1A

1\uFE0F\u20E3 \u5546\u4E1A\u8D22\u52A1\u5927\u767D\u8BDD\uFF1A\u7ECF\u8425\u6708\u5747\u603B\u6D41\u6C34\u3001\u8FDB\u8D27\u6210\u672C/\u6BDB\u5229\u3001\u623F\u79DF\u4EBA\u5DE5\u56FA\u5B9A\u5F00\u9500\u3001\u5E94\u6025\u5907\u7528\u91D1\u3001\u81EA\u62A5\u6C47\u7387\u3001\u51ED\u8BC1\u540C\u6743\u7B49\u586B\u62A5\u6982\u5FF5\uFF1B
2\uFE0F\u20E3 \u884C\u4E1A\u5927\u6570\u636E\u57FA\u51C6\uFF1A\u5404\u884C\u4E1A\u5E73\u5747\u6D41\u6C34\u3001\u6BDB\u5229\u7387\u3001\u51C0\u5229\u6DA6\u7387\u4E0E\u6297\u98CE\u9669\u5B89\u5168\u7EBF\uFF1B
3\uFE0F\u20E3 \u5B9E\u7528\u5C0F\u5DE5\u5177\uFF1A\u7B80\u5355\u7684\u52A0\u51CF\u4E58\u9664\u8BA1\u7B97\u3001\u4E3B\u6D41\u5E01\u79CD\u6362\u7B97\u3001\u65E5\u671F\u65F6\u95F4\u7B49\uFF1B
4\uFE0F\u20E3 \u751F\u6D3B\u4E0E\u6280\u672F\u5C0F\u77E5\u8BC6\u3002

\u76F4\u63A5\u8F93\u5165\u60A8\u7684\u95EE\u9898\uFF0C\u6211\u4F1A\u7ACB\u523B\u4E3A\u60A8\u89E3\u7B54\uFF01`;
    } else if (/^(谢谢|感谢|多谢|谢谢您|感谢您|thanks|thank you|thx|thankyou)[，。!！~\s]*$/i.test(question.trim())) {
      category = "\u65E5\u5E38\u81F4\u8C22";
      suggestedAction = "";
      bigDataBenchmark = "";
      fallbackReply = `\u3010\u{1F64F} \u4E0D\u5BA2\u6C14\uFF01\u3011

\u5F88\u9AD8\u5174\u80FD\u5E2E\u5230\u60A8\uFF01\u5982\u679C\u8FD8\u6709\u5176\u4ED6\u95EE\u9898\uFF08\u65E0\u8BBA\u662F\u672C\u5E73\u53F0\u7684\u586B\u62A5/\u8BC4\u5206\uFF0C\u8FD8\u662F\u65E5\u5E38\u5B9E\u7528\u77E5\u8BC6\uFF09\uFF0C\u968F\u65F6\u7EE7\u7EED\u95EE\u6211\u3002\u795D\u60A8\u751F\u610F\u5174\u9686\uFF0C\u7A33\u5065\u53D1\u5C55\uFF01`;
    } else if (/^(你是谁|你是什么|你能做什么|你能干什么|你有哪些功能|你的功能|what are you|who are you|what can you do|your capabilit)/i.test(question.trim())) {
      category = "\u52A9\u624B\u81EA\u6211\u4ECB\u7ECD";
      suggestedAction = "";
      bigDataBenchmark = "";
      fallbackReply = `\u3010\u{1F916} \u6211\u662F AI \u667A\u80FD\u7B54\u7591\u52A9\u624B\u3011

\u6211\u53EF\u4EE5\u5E2E\u60A8\uFF1A

1\uFE0F\u20E3 \u5546\u4E1A\u8D22\u52A1\u5927\u767D\u8BDD\u89E3\u6790\uFF1A\u7ECF\u8425\u6708\u5747\u603B\u6D41\u6C34\u3001\u8FDB\u8D27\u6210\u672C\uFF08COGS\uFF09\u3001\u6BDB\u5229\u3001\u623F\u79DF\u4EBA\u5DE5\u56FA\u5B9A\u5F00\u9500\uFF08OPEX\uFF09\u3001\u5E94\u6025\u5907\u7528\u91D1/\u73B0\u91D1\u8DD1\u9053\u3001\u81EA\u62A5\u6C47\u7387\u3001\u51ED\u8BC1\u540C\u6743\u89C4\u5219\u7B49\uFF1B
2\uFE0F\u20E3 \u884C\u4E1A\u5927\u6570\u636E\u57FA\u51C6\u5BF9\u6807\uFF1A\u9910\u996E\u3001\u96F6\u552E\u3001\u5916\u8D38\u3001\u751F\u6D3B\u670D\u52A1\u3001\u5DE5\u574A\u3001\u519C\u4E1A\u7B49\u884C\u4E1A\u5E73\u5747\u6D41\u6C34\u4E0E\u5229\u6DA6\u57FA\u51C6\uFF1B
3\uFE0F\u20E3 \u5B9E\u7528\u5C0F\u5DE5\u5177\uFF1A\u5E01\u79CD\u6362\u7B97\u3001\u7B80\u5355\u8BA1\u7B97\u3001\u65E5\u671F\u65F6\u95F4\u7B49\uFF1B
4\uFE0F\u20E3 \u5E73\u53F0\u89C4\u5219\u6307\u5F15\uFF1A5 \u7EF4\u96F7\u8FBE\u6253\u5206\u516C\u5F0F\u30014 \u5927\u95E8\u69DB\u7EA2\u7EBF\uFF08Gate \u7EA2\u7EBF\uFF09\u4E0E\u8FB9\u7F18\u7591\u96BE\u60C5\u51B5\u7684\u4FDD\u5B88\u586B\u62A5\u8DEF\u5F84\u3002

\u7279\u522B\u8BF4\u660E\uFF1A\u672C\u5E73\u53F0\u63D0\u95EE 100% \u533F\u540D\u3001\u7EDD\u4E0D\u8BA1\u5165\u4EFB\u4F55\u8BC4\u5206\u3002\u914D\u7F6E GEMINI_API_KEY \u540E\uFF0C\u6211\u53EF\u4EE5\u5347\u7EA7\u4E3A\u56DE\u7B54\u4EFB\u4F55\u95EE\u9898\u7684\u901A\u7528 AI\u3002`;
    } else if (/现在几点了?|当前时间|现在时间|今天几号|今天是几号|今天星期几|what time|what day|todays date/i.test(question)) {
      const now = /* @__PURE__ */ new Date();
      const weekdays = ["\u65E5", "\u4E00", "\u4E8C", "\u4E09", "\u56DB", "\u4E94", "\u516D"];
      category = "\u65E5\u671F\u65F6\u95F4";
      suggestedAction = "";
      bigDataBenchmark = "";
      fallbackReply = `\u3010\u{1F550} \u5F53\u524D\u65E5\u671F\u4E0E\u65F6\u95F4\u3011
\u4ECA\u5929\u662F ${now.getFullYear()} \u5E74 ${now.getMonth() + 1} \u6708 ${now.getDate()} \u65E5\uFF08\u661F\u671F${weekdays[now.getDay()]}\uFF09
\u670D\u52A1\u5668\u5F53\u524D\u65F6\u95F4\uFF1A${now.toLocaleTimeString("zh-CN", { hour12: false })}`;
    } else if (/计算|等于多少|是多少|算一下|加减乘除|几加几|几减几|几乘几|几除以几/.test(question) && /(\d+(?:\.\d+)?)\s*(乘以|乘于|乘|除以|加|减|加上|减去|\+|\-|−|×|÷|\*|\/|／)\s*(\d+(?:\.\d+)?)/.test(question)) {
      const m = question.match(
        /(\d+(?:\.\d+)?)\s*(乘以|乘于|乘|除以|加|减|加上|减去|\+|\-|−|×|÷|\*|\/|／)\s*(\d+(?:\.\d+)?)/
      );
      if (m) {
        const a = parseFloat(m[1]);
        const opRaw = m[2];
        const b = parseFloat(m[3]);
        let opSymbol = opRaw;
        if (opRaw === "\u52A0" || opRaw === "\u52A0\u4E0A") opSymbol = "+";
        else if (opRaw === "\u51CF" || opRaw === "\u51CF\u53BB" || opRaw === "\u2212") opSymbol = "-";
        else if (opRaw === "\u4E58" || opRaw === "\u4E58\u4EE5" || opRaw === "\u4E58\u4E8E" || opRaw === "*") opSymbol = "\xD7";
        else if (opRaw === "\u9664\u4EE5" || opRaw === "/" || opRaw === "\uFF0F") opSymbol = "\xF7";
        let result = null;
        if (opSymbol === "+") result = a + b;
        else if (opSymbol === "-") result = a - b;
        else if (opSymbol === "\xD7") result = a * b;
        else if (opSymbol === "\xF7") result = b === 0 ? null : a / b;
        if (result !== null) {
          category = "\u5B9E\u7528\u8BA1\u7B97";
          suggestedAction = "";
          bigDataBenchmark = "";
          fallbackReply = `\u3010\u{1F9EE} \u5FEB\u901F\u8BA1\u7B97\u3011
${a} ${opSymbol} ${b} = ${Number.isInteger(result) ? result : result.toFixed(2)}`;
        }
      }
    } else if (tryCurrencyConversion(question)) {
      category = "\u5E01\u79CD\u6362\u7B97";
      suggestedAction = "";
      bigDataBenchmark = "";
      fallbackReply = tryCurrencyConversion(question);
    } else if (tryGeneralKnowledge(question)) {
      const entry = tryGeneralKnowledge(question);
      category = "\u901A\u7528\u5E38\u8BC6";
      suggestedAction = "";
      bigDataBenchmark = "";
      const hintLine = entry.hint ? `
\u{1F3F7}\uFE0F ${entry.hint}
` : "";
      fallbackReply = `\u3010\u{1F4DA} \u901A\u7528\u5E38\u8BC6 \xB7 \u672C\u5730\u77E5\u8BC6\u5E93\u3011

\u5173\u4E8E\u300C${question}\u300D\uFF1A${hintLine}
${entry.answer}

\u{1F4CC} \u8BF4\u660E\uFF1A\u4EE5\u4E0A\u4E3A\u672C\u5730\u77E5\u8BC6\u5E93\u5185\u7F6E\u56DE\u7B54\uFF0C\u8986\u76D6\u9762\u6709\u9650\u3002\u5982\u9700\u6DF1\u5EA6\u4E13\u4E1A\u89E3\u7B54\uFF0C\u8BF7\u5728 .env \u914D\u7F6E GEMINI_API_KEY \u540E\u91CD\u542F\u5F00\u53D1\u670D\u52A1\u5668\uFF0C\u4E91\u7AEF AI \u53EF\u56DE\u7B54\u4EFB\u4F55\u95EE\u9898\u3002`;
    } else if (/保本|不亏|盈亏平衡|赚多少才不亏|最少赚多少|月流水多少才不亏|breakeven|break-even/i.test(question)) {
      category = "\u4FDD\u672C\u70B9\u4E0E\u76C8\u4E8F\u5E73\u8861\u6D4B\u7B97";
      suggestedAction = "\u6708\u5EA6\u4FDD\u672C\u6D41\u6C34 = \u6BCF\u6708\u56FA\u5B9A\u5F00\u9500 \xF7 \u6BDB\u5229\u7387\uFF0C\u4F4E\u4E8E\u8BE5\u6570\u5373\u5F53\u6708\u4E8F\u635F";
      bigDataBenchmark = "\u591A\u6570\u5C0F\u5FAE\u5E97\u94FA\u4FDD\u672C\u6D41\u6C34\u7EA6\u4E3A\u6708\u5747\u603B\u6D41\u6C34\u7684 55%~70%\uFF0C\u9AD8\u4E8E 85% \u6781\u6613\u4E8F\u635F\u3002";
      fallbackReply = `\u3010\u{1F9EE} \u4FDD\u672C\u70B9\uFF08\u76C8\u4E8F\u5E73\u8861\uFF09\u5927\u767D\u8BDD\u3011

1. \u600E\u4E48\u7B97\uFF1A\u4FDD\u672C\u6708\u6D41\u6C34 = \u6BCF\u6708\u56FA\u5B9A\u5F00\u9500\uFF08\u623F\u79DF+\u5DE5\u8D44+\u6C34\u7535\uFF09 \xF7 \u6BDB\u5229\u7387\u3002
\u4E3E\u4F8B\uFF1A\u623F\u79DF\u5DE5\u8D44\u6C34\u7535\u6BCF\u6708\u5171 15,000\uFF0C\u6BDB\u5229\u7387 60%\uFF0C\u5219\u4FDD\u672C\u6D41\u6C34 = 15,000 \xF7 0.6 = 25,000 \u5143/\u6708\u3002\u53EA\u8981\u5F53\u6708\u8425\u4E1A\u989D\u8D85\u8FC7 25,000\uFF0C\u5C31\u8FDB\u5165\u8D5A\u94B1\u533A\u3002

2. \u{1F4CA} \u5927\u6570\u636E\u8B66\u6212\uFF1A
\u2022 \u5B9E\u9645\u6708\u6D41\u6C34 \xF7 \u4FDD\u672C\u6D41\u6C34 < 1.1\uFF1A\u5371\u9669\u533A\uFF0C\u7A0D\u6709\u6CE2\u52A8\u5373\u4E8F\u635F\uFF1B
\u2022 1.1 ~ 1.5\uFF1A\u6B63\u5E38\u6CE2\u52A8\u533A\uFF1B
\u2022 > 1.5\uFF1A\u5B89\u5168\u7A33\u5065\uFF0C\u5177\u5907\u771F\u5B9E\u9020\u8840\u80FD\u529B\u3002`;
    } else if (/同工|工资怎么定|员工工资|薪资|人工成本占比|底薪多少|pay|salary/i.test(question)) {
      category = "\u540C\u5DE5\u85AA\u916C\u4E0E\u4EBA\u5DE5\u6210\u672C\u5360\u6BD4";
      suggestedAction = "\u4EBA\u5DE5\u603B\u6210\u672C\u5EFA\u8BAE\u63A7\u5236\u5728\u6708\u6D41\u6C34\u7684 15%~30% \u4E4B\u95F4\uFF0C\u540C\u5DE5\u540C\u916C\u4E00\u89C6\u540C\u4EC1";
      bigDataBenchmark = "\u5168\u7403\u5C0F\u5FAE\u6837\u672C\u4E2D\uFF0C\u4EBA\u5DE5\u6210\u672C\u5360\u6708\u6D41\u6C34 15%~30% \u4E3A\u5065\u5EB7\u533A\u95F4\uFF0C\u8D85\u8FC7 40% \u9700\u8B66\u60D5\u3002";
      fallbackReply = `\u3010\u{1F465} \u540C\u5DE5\u5DE5\u8D44\u600E\u4E48\u5B9A\uFF1F\u3011

1. \u5B9A\u4EF7\u4E09\u539F\u5219\uFF1A
\u2022 \u540C\u5DE5\u540C\u916C\uFF1A\u76F8\u540C\u5C97\u4F4D\u4E0E\u5DE5\u4F5C\u91CF\uFF0C\u672C\u5730\u5458\u5DE5\u4E0E\u5916\u6D3E\u540C\u5DE5\u4E00\u5F8B\u540C\u6807\u51C6\uFF0C\u65E2\u662F\u9053\u5FB7\u8981\u6C42\u4E5F\u907F\u514D\u5408\u89C4\u98CE\u9669\uFF1B
\u2022 \u53EF\u8D1F\u62C5\u6027\uFF1A\u5168\u90E8\u5458\u5DE5\u5DE5\u8D44\u603B\u548C \u2264 \u6708\u6D41\u6C34 30%\uFF08\u542B\u793E\u4FDD/\u8865\u8D34\uFF09\uFF0C\u8D85\u8FC7 40% \u5C31\u4F1A\u6324\u538B\u5229\u6DA6\uFF1B
\u2022 \u533A\u57DF\u53C2\u7167\uFF1A\u53C2\u8003\u5F53\u5730\u540C\u4E1A 25% \u5206\u4F4D\uFF5E\u4E2D\u4F4D\u6570\u5DE5\u8D44\uFF0C\u7559\u4F4F\u4EBA\u53C8\u4E0D\u538B\u57AE\u5E97\u94FA\u3002

2. \u793A\u4F8B\uFF08\u6708\u6D41\u6C34 50,000\uFF09\uFF1A
\u2022 \u4E24\u540D\u5168\u804C\u5458\u5DE5\uFF1A\u5404 5,000~6,000/\u6708\uFF0C\u5408\u8BA1 10,000~12,000\uFF08\u5360 20%~24%\uFF09\u4E3A\u5065\u5EB7\u533A\u95F4\uFF1B
\u2022 \u518D\u52A0\u4E00\u540D\u517C\u804C\uFF1A3,000/\u6708\uFF0C\u5408\u8BA1\u4ECD\u5E94\u63A7\u5236\u5728 15,000\uFF0830%\uFF09\u4EE5\u5185\u3002`;
    } else if (/启动资金|开店要多少钱|前期投入|初始投入|多少钱能开|startup|initial investment/i.test(question)) {
      category = "\u542F\u52A8\u8D44\u91D1\u8BC4\u4F30";
      suggestedAction = "\u542F\u52A8\u8D44\u91D1\u5EFA\u8BAE = \u4E00\u6B21\u6027\u5F00\u529E\u6295\u5165 + \u81F3\u5C11 3 \u4E2A\u6708\u56FA\u5B9A\u5F00\u9500\u5907\u7528\u91D1";
      bigDataBenchmark = "\u5C0F\u5FAE\u521B\u4E1A\u524D 6 \u4E2A\u6708\u5B58\u6D3B\u7387\u7EA6 50%\uFF0C\u542F\u52A8\u8D44\u91D1\u5FC5\u987B\u8986\u76D6 3~6 \u4E2A\u6708\u56FA\u5B9A\u5F00\u9500\u3002";
      fallbackReply = `\u3010\u{1F4B0} \u542F\u52A8\u8D44\u91D1\u5927\u6982\u8981\u591A\u5C11\uFF1F\u3011

1. \u516C\u5F0F\uFF1A\u542F\u52A8\u8D44\u91D1 = \u4E00\u6B21\u6027\u5F00\u529E\u6295\u5165\uFF08\u88C5\u4FEE\u8BBE\u5907\u9996\u6279\u8FDB\u8D27\uFF09 + 3~6 \u4E2A\u6708\u56FA\u5B9A\u5F00\u9500\u5907\u7528\u91D1\u3002

2. \u5206\u884C\u4E1A\u53C2\u8003\uFF08\u7F8E\u5143/\u6708\u6D41\u6C34\u91CF\u7EA7\uFF09\uFF1A
\u2022 \u8857\u5934\u5C0F\u5403/\u8336\u996E\u644A\uFF1A500~2,000
\u2022 \u793E\u533A\u5C0F\u5E97/\u6742\u8D27\u94FA\uFF1A2,000~8,000
\u2022 \u9910\u996E/\u70D8\u7119\u5E97\uFF1A5,000~20,000
\u2022 \u751F\u6D3B\u670D\u52A1\uFF08\u7F8E\u53D1/\u7EF4\u4FEE\uFF09\uFF1A3,000~10,000
\u2022 \u5C0F\u578B\u5DE5\u574A\uFF1A5,000~25,000

3. \u5173\u952E\u63D0\u9192\uFF1A\u5B81\u53EF\u5C11\u4E70\u8BBE\u5907\uFF0C\u4E5F\u8981\u7559\u8DB3 3 \u4E2A\u6708\u623F\u79DF\u5DE5\u8D44\u3002\u73B0\u91D1\u65AD\u6D41\u662F\u5C0F\u5FAE\u521B\u4E1A\u5931\u8D25\u7684\u7B2C\u4E00\u5927\u539F\u56E0\u3002`;
    } else if (/流水|营业额|总进账|是收入还是|营业收入|做买卖收的钱|总销售/i.test(question)) {
      category = "\u6838\u5FC3\u8D22\u52A1\u672F\u8BED\u901A\u4FD7\u89E3\u6790";
      suggestedAction = "\u586B\u62A5\u65F6\u586B\u5199\u8FD13-12\u4E2A\u6708\u6263\u9664\u9000\u6B3E\u540E\u7684\u5E73\u5747\u6BCF\u6708\u603B\u8FDB\u8D26\uFF08\u672A\u6263\u9664\u6210\u672C\uFF09";
      bigDataBenchmark = "\u5168\u7403\u5C0F\u5FAE\u6837\u672C\u5E93\u4E2D\uFF1A\u9910\u996E\u6708\u5747\u6D41\u6C34\u7EA63~12\u4E07\uFF0C\u96F6\u552E\u8D85\u5E02\u7EA65~25\u4E07\uFF0C\u751F\u6D3B\u670D\u52A1\u7EA62~8\u4E07\u3002";
      fallbackReply = `\u3010\u{1F4A1} \u5927\u767D\u8BDD\u6838\u5FC3\u89E3\u7B54\uFF1A\u7ECF\u8425\u6708\u5747\u603B\u6D41\u6C34\u662F\u201C\u603B\u8425\u4E1A\u989D\u201D\uFF0C\u4E0D\u662F\u5230\u624B\u51C0\u5229\u6DA6\u3011

1. \u4E00\u53E5\u8BDD\u672C\u8D28\uFF1A
\u300C\u7ECF\u8425\u6708\u5747\u603B\u6D41\u6C34\u300D\uFF1D \u5BA2\u4EBA\u4E70\u5355\u8FDB\u4F60\u53E3\u888B\u3001\u6536\u94F6\u673A\u3001\u5FAE\u4FE1/\u652F\u4ED8\u5B9D\u6216\u94F6\u884C\u5361\u91CC\u7684\u3010\u5168\u90E8\u6BDB\u94B1\u3011\uFF08\u603B\u8425\u4E1A\u989D Gross Revenue\uFF09\u3002
\u26A0\uFE0F \u8FD9\u7B14\u94B1\u3010\u8FD8\u6CA1\u6709\u6263\u9664\u3011\u8FDB\u8D27\u6210\u672C\u3001\u623F\u79DF\u3001\u5DE5\u4EBA\u5DE5\u8D44\u3001\u6C34\u7535\u548C\u7A0E\u8D39\uFF01

2. \u7528\u5F00\u5E97\u4F8B\u5B50\u5927\u767D\u8BDD\u5BF9\u6BD4\uFF1A
\u2022 \u7ECF\u8425\u603B\u6D41\u6C34\uFF08\u8425\u4E1A\u989D\uFF09\uFF1A\u6BD4\u5982\u4F60\u7684\u5976\u8336\u5E97\u4E00\u4E2A\u6708\u603B\u5171\u5356\u4E86 1,000 \u676F\uFF0C\u6536\u4E86 50,000 \u5757\u94B1\u3002\u8FD9 50,000 \u5757\u5C31\u662F\u300C\u7ECF\u8425\u6708\u5747\u603B\u6D41\u6C34\u300D\u3002
\u2022 \u8FDB\u8D27\u91C7\u8D2D\u6210\u672C\uFF1A\u4E70\u8336\u53F6\u3001\u725B\u5976\u3001\u676F\u5B50\u82B1\u4E86 15,000 \u5757\uFF08\u6BDB\u5229\u7387 70%\uFF09\u3002
\u2022 \u56FA\u5B9A\u5F00\u9500\uFF08\u623F\u79DF+\u4EBA\u5DE5\uFF09\uFF1A\u94FA\u79DF 8,000 \u5757\uFF0C\u8BF7\u4E00\u4E2A\u5E97\u5458 4,000 \u5757\uFF0C\u6C34\u7535 1,000 \u5757\uFF0C\u5408\u8BA1 13,000 \u5757\u3002
\u2022 \u5230\u624B\u7EAF\u6536\u5165\uFF08\u51C0\u5229\u6DA6\uFF09\uFF1A50,000 - 15,000 - 13,000 = 22,000 \u5757\u94B1\uFF0C\u8FD9\u624D\u662F\u4F60\u771F\u6B63\u8D5A\u8FDB\u8170\u5305\u7684\u7EAF\u6536\u5165\uFF01

3. \u{1F4CA} \u8FDE\u63A5\u884C\u4E1A\u5927\u6570\u636E\u53C2\u8003\uFF08\u57FA\u4E8E\u5168\u7403\u6570\u4E07\u5BB6\u5C0F\u5FAE\u5546\u4E1A\u57FA\u51C6\uFF09\uFF1A
\u2022 \u9910\u996E\u5C0F\u5403/\u996E\u54C1\uFF1A\u6708\u5747\u603B\u6D41\u6C34\u4E2D\u4F4D\u6570 \xA545,000~\xA5120,000\uFF0C\u5E73\u5747\u6BDB\u5229\u7387 55%~68%\uFF0C\u51C0\u5229\u6DA6\u7387 15%~25%\uFF1B
\u2022 \u793E\u533A\u8D85\u5E02/\u6742\u8D27\u94FA\uFF1A\u6708\u5747\u603B\u6D41\u6C34\u4E2D\u4F4D\u6570 \xA560,000~\xA5250,000\uFF0C\u8D70\u91CF\u4E3A\u4E3B\uFF0C\u6BDB\u5229\u7387 20%~32%\uFF0C\u51C0\u5229\u6DA6\u7387 8%~14%\uFF1B
\u2022 \u8DE8\u5883\u7535\u5546/\u5916\u8D38\u6863\u53E3\uFF1A\u6708\u5747\u603B\u6D41\u6C34\u4E2D\u4F4D\u6570 \xA580,000~\xA5500,000+\uFF0C\u6BDB\u5229\u7387 30%~48%\uFF0C\u51C0\u5229\u6DA6\u7387 10%~20%\uFF1B
\u2022 \u7F8E\u53D1\u6C7D\u4FEE/\u751F\u6D3B\u670D\u52A1\uFF1A\u6708\u5747\u603B\u6D41\u6C34\u4E2D\u4F4D\u6570 \xA525,000~\xA580,000\uFF0C\u4E3B\u8981\u662F\u624B\u827A\u4EBA\u5DE5\uFF0C\u6BDB\u5229\u7387 70%~85%\uFF0C\u51C0\u5229\u6DA6\u7387 25%~40%\u3002

4. \u270D\uFE0F \u586B\u62A5\u6307\u5357\uFF1A
\u5728\u7B2C 1 \u6B65\u8F93\u5165\u6846\u4E2D\uFF0C\u8BF7\u586B\u5199\u4F60\u6700\u8FD1 3~12 \u4E2A\u6708\u5E73\u5747\u6BCF\u4E2A\u6708\u6536\u5230\u7684\u603B\u8FDB\u8D26\u91D1\u989D\u3002\u5982\u6709\u6DE1\u65FA\u5B63\uFF0C\u53EF\u53D6 12 \u4E2A\u6708\u603B\u548C\u9664\u4EE5 12 \u8BA1\u7B97\u6708\u5E73\u5747\u3002`;
    } else if (/毛利|进货|成本|cogs|原材料|采购/i.test(question)) {
      category = "\u8FDB\u8D27\u6210\u672C\u4E0E\u6BDB\u5229\u7A7A\u95F4\u89E3\u6790";
      suggestedAction = "\u8FDB\u8D27\u6210\u672C\u53EA\u7B97\u4E70\u8D27\u548C\u539F\u6750\u6599\u7684\u76F4\u63A5\u82B1\u8D39\uFF0C\u4E0D\u5305\u542B\u623F\u79DF\u548C\u5458\u5DE5\u5E95\u85AA";
      bigDataBenchmark = "\u9910\u996E\u884C\u4E1A\u6BDB\u5229\u7387\u5EFA\u8BAE\u4FDD\u6301\u572850%\u4EE5\u4E0A\uFF0C\u96F6\u552E\u8D85\u5E02\u5EFA\u8BAE\u4FDD\u6301\u572822%\u4EE5\u4E0A\u3002";
      fallbackReply = `\u3010\u{1F4A1} \u5927\u767D\u8BDD\uFF1A\u8FDB\u8D27\u6210\u672C\uFF08COGS\uFF09\u4E0E\u6BDB\u5229\u6DA6\u3011

1. \u4EC0\u4E48\u662F\u8FDB\u8D27\u91C7\u8D2D\u6210\u672C\uFF08COGS\uFF09\uFF1F
\u76F4\u63A5\u7528\u4E8E\u5236\u9020\u5546\u54C1\u6216\u8FDB\u8D27\u7684\u771F\u91D1\u767D\u94F6\u3002\u6BD4\u5982\u5F00\u996D\u5E97\u4E70\u8089\u83DC\u8C03\u6599\u7684\u94B1\u3001\u5F00\u670D\u88C5\u5E97\u8FDB\u8863\u670D\u7684\u8FDB\u8D27\u4EF7\u3002\u4E0D\u5305\u542B\u5E97\u79DF\u548C\u5458\u5DE5\u85AA\u8D44\u3002

2. \u4EC0\u4E48\u662F\u6BDB\u5229\u6DA6\uFF1F
\u6BDB\u5229\u6DA6 = \u6708\u5747\u603B\u6D41\u6C34 - \u8FDB\u8D27\u91C7\u8D2D\u6210\u672C\u3002
\u6BDB\u5229\u7387 = \u6BDB\u5229\u6DA6 \xF7 \u6708\u5747\u603B\u6D41\u6C34 \xD7 100%\u3002
\u5927\u767D\u8BDD\uFF1A\u6BCF\u505A 100 \u5757\u94B1\u751F\u610F\uFF0C\u6263\u6389\u4F9B\u8D27\u5546\u62FF\u8D70\u7684\u6210\u672C\u540E\uFF0C\u7559\u5728\u4F60\u624B\u91CC\u7528\u6765\u53D1\u5DE5\u8D44\u548C\u4EA4\u623F\u79DF\u7684\u5E95\u94B1\u3002

3. \u{1F4CA} \u5927\u6570\u636E\u57FA\u51C6\u8B66\u793A\u7EBF\uFF1A
\u2022 \u6BDB\u5229\u7387\u4F4E\u4E8E 20%\uFF1A\u5C5E\u4E8E\u8584\u5229\u5371\u9669\u533A\uFF08\u9664\u5927\u578B\u6279\u53D1\u5916\uFF09\uFF0C\u6781\u6613\u88AB\u623F\u79DF\u5403\u57AE\uFF0C\u89E6\u78B0 Gate-2 \u98CE\u9669\uFF1B
\u2022 \u6BDB\u5229\u7387 30%~55%\uFF1A\u5065\u5EB7\u5E73\u8861\u533A\uFF08\u666E\u901A\u96F6\u552E\u3001\u6807\u51C6\u5916\u8D38\uFF09\uFF1B
\u2022 \u6BDB\u5229\u7387 60%~80%\uFF1A\u9AD8\u6BDB\u5229\u533A\uFF08\u7279\u8272\u9910\u996E\u3001\u624B\u827A\u5B9A\u5236\u3001\u9AD8\u9644\u52A0\u503C\u670D\u52A1\uFF09\u3002`;
    } else if (/房租|工资|人工|opex|固定开销|水电|租金/i.test(question)) {
      category = "\u56FA\u5B9A\u7ECF\u8425\u6210\u672C\u89E3\u6790";
      suggestedAction = "\u5C06\u6BCF\u6708\u5FC5\u987B\u652F\u4ED8\u7684\u5E97\u79DF\u3001\u5458\u5DE5\u5E95\u85AA\u548C\u56FA\u5B9A\u6C34\u7535\u7F51\u8D39\u5408\u8BA1\u586B\u5165 OPEX";
      bigDataBenchmark = "\u5065\u5EB7\u5C0F\u5FAE\u4F01\u4E1A\u7684\u56FA\u5B9A\u5F00\u9500\u5360\u603B\u8425\u4E1A\u989D\u6BD4\u4F8B\u5E94\u63A7\u5236\u5728 45% \u4EE5\u5185\u3002";
      fallbackReply = `\u3010\u{1F4A1} \u5927\u767D\u8BDD\uFF1A\u623F\u79DF\u4E0E\u5DE5\u4EBA\u5DE5\u8D44\uFF08\u56FA\u5B9A\u5F00\u9500 OPEX\uFF09\u3011

1. \u4E00\u53E5\u8BDD\u672C\u8D28\uFF1A
\u6BCF\u6708\u4E0D\u7BA1\u5F00\u4E0D\u5F00\u95E8\u3001\u6709\u6CA1\u6709\u5BA2\u4EBA\uFF0C\u96F7\u6253\u4E0D\u52A8\u4E00\u5B9A\u8981\u4ED8\u51FA\u53BB\u7684\u786C\u6027\u5F00\u9500\uFF08\u5982\u623F\u4E1C\u79DF\u91D1\u3001\u5E97\u5458\u56FA\u5B9A\u5E95\u85AA\u3001\u6C34\u7535\u7269\u4E1A\u5BBD\u5E26\u8D39\uFF09\u3002

2. \u5173\u952E\u4F53\u68C0\u6307\u6807\uFF08\u623F\u79DF\u4EBA\u5DE5\u5360\u6BD4\uFF09\uFF1A
\u56FA\u5B9A\u5F00\u9500\u5360\u6BD4 = \u6BCF\u6708\u56FA\u5B9A\u5F00\u9500 \xF7 \u6BCF\u6708\u603B\u6D41\u6C34 \xD7 100%\u3002

3. \u{1F4CA} \u5927\u6570\u636E\u6297\u98CE\u9669\u5E95\u7EBF\uFF1A
\u2022 \u4F18\u826F\uFF08\u2264 30%\uFF09\uFF1A\u5E97\u79DF\u4FBF\u5B9C\u3001\u4EBA\u5458\u7CBE\u5E72\uFF0C\u6297\u7A81\u53D1\u98CE\u9669\u80FD\u529B\u6781\u5F3A\uFF1B
\u2022 \u5065\u5EB7\uFF0830% ~ 45%\uFF09\uFF1A\u884C\u4E1A\u6B63\u5E38\u6C34\u5E73\uFF1B
\u2022 \u5371\u9669\uFF08> 50%\uFF09\uFF1A\u91CD\u5EA6\u5F00\u9500\uFF0C\u4E00\u65E6\u67D0\u4E2A\u6708\u5BA2\u4EBA\u5C11 20%\uFF0C\u6781\u6613\u5F53\u6708\u8F6C\u4E3A\u4E8F\u635F\u3002`;
    } else if (/备用金|跑道|runway|现金储备|存款|应急资金|撑几个月/i.test(question)) {
      category = "\u73B0\u91D1\u6D41\u4E0E\u6297\u98CE\u9669\u80FD\u529B\u89E3\u6790";
      suggestedAction = "\u6D41\u52A8\u8D44\u4EA7\u5E94\u4FDD\u6301\u80FD\u591F\u652F\u4ED8 3 \u4E2A\u6708\u4EE5\u4E0A\u7EAF\u56FA\u5B9A\u5F00\u9500\uFF08\u623F\u79DF+\u5DE5\u8D44\uFF09\u7684\u73B0\u94B1";
      bigDataBenchmark = "\u5168\u7403\u5C0F\u5FAE\u4F01\u4E1A\u7834\u4EA7\u539F\u56E0\u4E2D\uFF0C82%\u662F\u56E0\u4E3A\u73B0\u91D1\u6D41\u7A81\u7136\u65AD\u88C2\u800C\u975E\u8D26\u9762\u4E8F\u635F\u3002";
      fallbackReply = `\u3010\u{1F4A1} \u5927\u767D\u8BDD\uFF1A\u5E94\u6025\u73B0\u91D1\u5907\u7528\u91D1\uFF08\u73B0\u91D1\u8DD1\u9053 Runway\uFF09\u3011

1. \u4EC0\u4E48\u662F\u73B0\u91D1\u8DD1\u9053\uFF1F
\u8D26\u4E0A\u73B0\u6709\u7684\u53EF\u7528\u73B0\u91D1\u4E0E\u5B58\u6B3E \xF7 \u6BCF\u6708\u56FA\u5B9A\u5FC5\u987B\u652F\u51FA\u7684\u5F00\u9500\uFF08\u623F\u79DF+\u4EBA\u5DE5\uFF09\u3002
\u5927\u767D\u8BDD\uFF1A\u5982\u679C\u660E\u5929\u7A81\u53D1\u610F\u5916\u4E00\u4E2A\u6708\u4E00\u5206\u94B1\u8FDB\u8D26\u90FD\u6CA1\u6709\uFF0C\u4F60\u8D26\u4E0A\u7684\u73B0\u94B1\u80FD\u7EE7\u7EED\u7ED9\u623F\u4E1C\u4EA4\u79DF\u3001\u7ED9\u5458\u5DE5\u53D1\u5DE5\u8D44\u9876\u51E0\u4E2A\u6708\uFF1F

2. \u{1F4CA} \u8BC4\u5206\u4F53\u7CFB\u4E0E\u5927\u6570\u636E\u5B89\u5168\u7EBF\uFF1A
\u2022 < 1.5 \u4E2A\u6708\uFF08\u{1F534} \u9AD8\u5371\uFF09\uFF1A\u89E6\u53D1 Gate-3 \u95E8\u69DB\u7EA2\u7EBF\u8B66\u793A\uFF0C\u5FC5\u987B\u7ACB\u5373\u5EFA\u7ACB\u5907\u7528\u91D1\u84C4\u6C34\u6C60\uFF1B
\u2022 2.0 ~ 3.0 \u4E2A\u6708\uFF08\u{1F7E1} \u53CA\u683C\u7EBF\uFF09\uFF1A\u52C9\u5F3A\u5E94\u4ED8\u65E5\u5E38\u8D77\u4F0F\uFF1B
\u2022 \u2265 3.0 \u4E2A\u6708\uFF08\u{1F7E2} \u4F18\u826F\u5B89\u5168\uFF09\uFF1A\u4ECE\u5BB9\u62B5\u5FA1\u4F9B\u5E94\u94FE\u65AD\u8D27\u3001\u6DE1\u5B63\u6216\u653F\u7B56\u7A81\u53D1\u6CE2\u52A8\u3002`;
    } else if (/凭证|银行流水|记账本|手写|发票|无执照|截图|会不会扣分|歧视/i.test(question)) {
      category = "\u586B\u62A5\u51ED\u8BC1\u5B8C\u5168\u540C\u6743\u89C4\u5219";
      suggestedAction = "\u624B\u5199\u8D26\u672C\u3001\u6536\u94F6\u622A\u56FE\u6216\u7EAF\u624B\u52A8\u586B\u5199\u4EAB\u53D7 100% \u76F8\u540C\u8BC4\u5206\u6807\u51C6\uFF0C\u653E\u5FC3\u586B\u62A5";
      bigDataBenchmark = "\u5E73\u53F0\u6D77\u5916\u7528\u6237\u4E2D\u8D85\u8FC7 63% \u91C7\u7528\u7EAF\u624B\u52A8\u586B\u5199\u6216\u624B\u5199\u8D26\u672C\u8BC6\u522B\u5B8C\u6210\u81EA\u6D4B\u3002";
      fallbackReply = `\u3010\u{1F4A1} \u5B98\u65B9\u6743\u5A01\u89C4\u5219\u7B54\u590D\uFF1A\u51ED\u8BC1 100% \u96F6\u6B67\u89C6\u539F\u5219\u3011

1. \u6838\u5FC3\u89C4\u5219\uFF08BAM-PRD-2026-V1.4 \u89C4\u8303\uFF09\uFF1A
\u5728\u672C\u5E73\u53F0\u4E0A\uFF0C\u3010\u51ED\u8BC1\u7C7B\u578B\u7EDD\u4E0D\u5F71\u54CD\u5F97\u5206\u3011\uFF01
\u65E0\u8BBA\u60A8\u662F\uFF1A
A. \u4E0A\u4F20\u6B63\u89C4\u94F6\u884C\u5BF9\u516C\u5BF9\u79C1\u6D41\u6C34 PDF\uFF1B
B. \u62CD\u7167\u4E0A\u4F20\u624B\u5199\u8BB0\u8D26\u672C / \u5FAE\u4FE1\u652F\u4ED8\u5B9D\u6536\u6B3E\u6C47\u603B\u622A\u56FE\uFF1B
C. \u5B8C\u5168\u4E0D\u4F20\u4EFB\u4F55\u56FE\u7247\uFF0C\u9009\u62E9\u3010\u7EAF\u624B\u52A8\u586B\u5199 14 \u9879\u7ECF\u8425\u6570\u5B57\u3011\uFF1B
\u7CFB\u7EDF\u7684\u7B97\u6CD5\u5F15\u64CE\u6267\u884C 100% \u5B8C\u5168\u4E00\u81F4\u7684\u8D22\u52A1\u903B\u8F91\u8FD0\u7B97\u4E0E 5 \u7EF4\u96F7\u8FBE\u8BC4\u5206\uFF0C\u7EDD\u65E0\u4EFB\u4F55\u51ED\u8BC1\u6B67\u89C6\u6216\u6743\u91CD\u51CF\u5206\uFF01

2. \u51ED\u8BC1\u7684\u4F5C\u7528\u4EC5\u4EC5\u662F\uFF1A
\u65B9\u4FBF AI \u81EA\u52A8\u8BC6\u522B\u5E2E\u60A8\u7701\u53BB\u624B\u52A8\u8F93\u5165\u7684\u9EBB\u70E6\u3002\u5982\u679C\u60A8\u5904\u4E8E\u654F\u611F\u5730\u533A\u6216\u6CA1\u6709\u8BB0\u8D26\u51ED\u8BC1\uFF0C\u76F4\u63A5\u7EAF\u624B\u52A8\u586B\u5199\u6570\u5B57\u5373\u53EF\uFF01`;
    } else if (/汇率|黑市|民间|非官方|折算|美金|换汇|货币/i.test(question)) {
      category = "\u591A\u5E01\u79CD\u4E0E\u81EA\u62A5\u6C47\u7387\u89C4\u5219";
      suggestedAction = "\u52FE\u9009\u201C\u672C\u56FD\u5B58\u5728\u591A\u91CD\u6C47\u7387\u201D\uFF0C\u6309\u60A8\u505A\u751F\u610F\u5B9E\u9645\u5151\u6362\u7684\u6C11\u95F4\u6BD4\u4F8B\u6298\u7B97\u586B\u62A5";
      bigDataBenchmark = "\u5C3C\u65E5\u5229\u4E9A\u3001\u963F\u6839\u5EF7\u3001\u57C3\u585E\u4FC4\u6BD4\u4E9A\u7B49\u591A\u4E2A\u5730\u533A\u5747\u652F\u6301\u5E73\u884C\u6C47\u7387\u81EA\u62A5\u6298\u7B97\u3002";
      fallbackReply = `\u3010\u{1F4A1} \u591A\u5E01\u79CD\u4E0E\u591A\u91CD\u6C47\u7387\u81EA\u62A5\u673A\u5236\u3011

1. \u5C0A\u91CD\u6C11\u95F4\u5B9E\u9645\u4EA4\u6613\u4EF7\uFF1A
\u5728\u8BB8\u591A\u6D77\u5916\u56FD\u5BB6\uFF08\u5982\u975E\u5B98\u65B9\u5E73\u884C\u5E02\u573A\u5B58\u5728\u6EA2\u4EF7\uFF09\uFF0C\u5B98\u65B9\u6C47\u7387\u4E25\u91CD\u5931\u771F\u3002\u672C\u5E73\u53F0\u5141\u8BB8\u60A8\uFF1A
\u2022 \u5728\u6BCF\u4E2A\u91D1\u989D\u8F93\u5165\u6846\u76F4\u63A5\u9009\u62E9\u4EA4\u6613\u5E01\u79CD\uFF08USD\u3001KES\u3001NGN\u3001EGP\u3001CNY \u7B49\uFF09\uFF1B
\u2022 \u52FE\u9009\u3010\u672C\u56FD\u5B58\u5728\u591A\u91CD\u6C47\u7387\u3011\u5E76\u586B\u5165\u60A8\u5728\u65E5\u5E38\u8FDB\u8D27\u548C\u6536\u94F6\u4E2D\u5B9E\u9645\u4F7F\u7528\u7684\u5151\u6362\u6C47\u7387\u3002

2. \u62A5\u544A\u900F\u660E\u6807\u6CE8\uFF1A
\u7CFB\u7EDF\u5C06\u4EE5\u60A8\u7684\u81EA\u62A5\u6C47\u7387\u4F5C\u4E3A\u6298\u7B97\u57FA\u51C6\uFF0C\u5E76\u5728\u6700\u7EC8\u62A5\u544A\u4E2D\u9192\u76EE\u6CE8\u660E\uFF0C\u4FDD\u8BC1\u60A8\u7684\u5229\u6DA6\u7387\u548C\u73B0\u91D1\u6D41\u6D4B\u7B97\u771F\u5B9E\u53CD\u6620\u7ECF\u8425\u73B0\u72B6\uFF0C\u4E0D\u88AB\u5B98\u65B9\u865A\u9AD8\u6C47\u7387\u8BEF\u5BFC\u3002`;
    } else if (/敏感|安全|隐私|查我|泄露|销毁|脱敏/i.test(question)) {
      category = "\u654F\u611F\u5B89\u5168\u8131\u654F\u6A21\u5F0F";
      suggestedAction = "\u53EF\u5728\u586B\u62A5\u9996\u9875\u968F\u65F6\u5F00\u542F\u201C\u654F\u611F\u5B89\u5168\u8131\u654F\u6A21\u5F0F\u201D\uFF0C\u56FE\u7247\u5373\u65F6\u9500\u6BC1";
      bigDataBenchmark = "\u672C\u5E73\u53F0\u91C7\u7528\u96F6\u670D\u52A1\u5668\u539F\u59CB\u51ED\u8BC1\u7559\u5B58\u67B6\u6784\uFF0C\u8BA1\u7B97\u5B8C\u6BD5\u7269\u7406\u91CA\u653E\u5185\u5B58\u3002";
      fallbackReply = `\u3010\u{1F4A1} \u654F\u611F\u5730\u533A\u6570\u636E\u5B89\u5168\u4E0E\u8131\u654F\u673A\u5236\u3011

1. \u5F00\u542F\u201C\u654F\u611F\u5B89\u5168\u6A21\u5F0F\u201D\u540E\u7684 5 \u91CD\u4FDD\u62A4\uFF1A
\u2022 \u5730\u7406\u5B9A\u4F4D\u4EC5\u8981\u6C42\u9009\u62E9\u56FD\u5BB6\u6216\u5927\u533A\uFF0C\u4E0D\u91C7\u96C6\u5177\u4F53\u5730\u5740\u548C\u5E97\u540D\uFF1B
\u2022 \u539F\u59CB\u51ED\u8BC1\u5168\u53D8\u4E3A\u975E\u5FC5\u586B\uFF0C\u4EC5\u9700\u63D0\u4F9B\u7ECF\u8425\u6570\u5B57\uFF1B
\u2022 \u4E0A\u4F20\u7684\u56FE\u7247\u4EC5\u5728\u5185\u5B58\u4E2D\u901A\u8FC7 OCR \u63D0\u53D6\u6570\u5B57\uFF0C\u8BC6\u522B\u540E\u7ACB\u5373\u9500\u6BC1\uFF0C\u4E0D\u5728\u4E91\u7AEF\u505A\u4EFB\u4F55\u6587\u4EF6\u6301\u4E45\u5316\u5B58\u50A8\uFF1B
\u2022 \u5168\u7A0B\u7531 AI \u7B97\u6CD5\u81EA\u6D4B\uFF0C\u6CA1\u6709\u4EFB\u4F55\u4EBA\u5DE5\u521D\u5BA1\u5458\u6216\u5916\u90E8\u4EBA\u5458\u67E5\u770B\uFF1B
\u2022 \u652F\u6301\u968F\u65F6\u4E00\u952E\u3010\u64A4\u56DE\u5E76\u7269\u7406\u9500\u6BC1\u6240\u6709\u81EA\u6D4B\u8BB0\u5F55\u3011\u3002`;
    } else if (isEdgeCase) {
      category = "\u8FB9\u7F18\u7591\u96BE\u89C4\u5219\u63A8\u7B97";
      suggestedAction = "\u5EFA\u8BAE\u91C7\u7528\u8DEF\u5F84 A\uFF0812\u4E2A\u6708\u5E74\u5316\u5E73\u5747\u5E73\u644A\u6CD5\uFF09\u8FDB\u884C\u5408\u7406\u7533\u62A5";
      bigDataBenchmark = "\u5B63\u8282\u6027\u884C\u4E1A\uFF08\u5982\u6C34\u4EA7\u3001\u6ED1\u96EA\u3001\u679C\u852C\uFF09\u5EFA\u8BAE\u5E38\u5907 4~6 \u4E2A\u6708\u56FA\u5B9A\u5F00\u9500\u5E94\u6025\u91D1\u3002";
      fallbackReply = `\u3010\u26A0\uFE0F \u8FB9\u7F18\u7591\u96BE\u60C5\u51B5 \xB7 2 \u79CD\u4FDD\u5B88\u63A8\u7B97\u8DEF\u5F84\u3011

\u9488\u5BF9\u60A8\u6240\u63D0\u5230\u7684\u7279\u6B8A\u7ECF\u8425\u60C5\u51B5\uFF08\u5982\u4F11\u6E14\u671F\u3001\u6781\u7AEF\u6DE1\u65FA\u5B63\u3001\u7279\u6B8A\u6218\u4E71\u73AF\u5883\u7B49\uFF09\uFF1A

\u{1F4CC} \u8DEF\u5F84 A (\u63A8\u8350\uFF1A12 \u4E2A\u6708\u5E74\u5316\u5E73\u5747\u5E73\u644A\u6CD5)\uFF1A
\u2022 \u505A\u6CD5\uFF1A\u5C06\u5168\u5E74\u5404\u6D3B\u8DC3\u6708\u4EFD\u7684\u603B\u6536\u5165\u76F8\u52A0\u9664\u4EE5 12\uFF0C\u5F97\u51FA\u6807\u51C6\u7684\u201C\u6708\u5747\u603B\u6D41\u6C34\u201D\uFF0C\u623F\u79DF\u4EBA\u5DE5\u4E5F\u6309\u5168\u5E74\u603B\u6210\u672C\u5E73\u5747\u5230 12 \u4E2A\u6708\u3002
\u2022 \u4F18\u52BF\uFF1A\u6700\u771F\u5B9E\u4F53\u73B0\u751F\u610F\u7684\u5168\u5E74\u7EFC\u5408\u81EA\u517B\u80FD\u529B\uFF0C\u7CFB\u7EDF\u62A5\u544A\u4F1A\u81EA\u52A8\u9644\u6CE8\u5B63\u8282\u6027\u5E74\u5316\u5E73\u644A\u8BF4\u660E\u3002

\u{1F4CC} \u8DEF\u5F84 B (\u4FDD\u5B88\uFF1A\u4EC5\u6309\u6D3B\u8DC3\u6708\u4EFD\u771F\u5B9E\u586B\u62A5 + \u52A0\u5927\u73B0\u91D1\u50A8\u5907)\uFF1A
\u2022 \u505A\u6CD5\uFF1A\u6309\u65FA\u5B63\u5355\u6708\u771F\u5B9E\u6536\u652F\u586B\u5199\uFF0C\u4F46\u6D41\u52A8\u8D44\u91D1\u5FC5\u987B\u7559\u8DB3\u8986\u76D6\u5168\u90E8\u4F11\u4E1A\u6DE1\u5B63\u7684\u623F\u79DF\u5DE5\u8D44\u3002
\u2022 \u98CE\u9669\uFF1A\u82E5\u8D26\u4E0A\u5907\u7528\u91D1\u4E0D\u8DB3\u4EE5\u8986\u76D6\u4F11\u4E1A\u671F\u5F00\u9500\uFF0C\u53EF\u80FD\u89E6\u53D1 Gate-3 \u73B0\u91D1\u8DD1\u9053\u8B66\u793A\u3002`;
      paths = [
        {
          pathName: "\u8DEF\u5F84 A (\u63A8\u8350\uFF1A12\u4E2A\u6708\u5E74\u5316\u5E73\u5747\u6CD5)",
          assumption: "\u5C06\u5168\u5E74\u603B\u8425\u4E1A\u6536\u5165\u9664\u4EE5 12 \u4E2A\u6708\u62C9\u5E73\u4E3A\u6708\u5747\u6536\u5165\uFF0C\u623F\u79DF\u6309\u6708\u5206\u644A\u8BA1\u5165 OPEX\u3002",
          estimatedScore: "\u7EA6 76-84 \u5206 (GRADE A/BBB)",
          consequence: "\u6700\u8D34\u5408\u5B9E\u9645\u6297\u98CE\u9669\u80FD\u529B\uFF0C\u62A5\u544A\u4E2D\u5C06\u81EA\u52A8\u9644\u6CE8\u5B63\u8282\u6027\u5E73\u644A\u8BF4\u660E\u3002"
        },
        {
          pathName: "\u8DEF\u5F84 B (\u4FDD\u5B88\uFF1A\u4EC5\u6309\u6D3B\u8DC3\u6708\u4EFD\u586B\u62A5\u5E76\u52A0\u5927\u5907\u7528\u91D1)",
          assumption: "\u6309\u65FA\u5B63\u5355\u6708\u771F\u5B9E\u6570\u636E\u586B\u5199\uFF0C\u4F46\u73B0\u91D1\u50A8\u5907\u5FC5\u987B\u80FD\u8986\u76D6\u6DE1\u5B63\u5168\u90E8\u56FA\u5B9A\u5F00\u652F\u3002",
          estimatedScore: "\u7EA6 70-75 \u5206 (GRADE BBB)",
          consequence: "\u5907\u7528\u91D1\u82E5\u4E0D\u8DB3\u53EF\u80FD\u89E6\u53D1 Gate-3/4 \u8B66\u793A\u3002"
        }
      ];
    } else {
      category = "\u901A\u7528\u667A\u80FD\u95EE\u7B54";
      suggestedAction = "";
      bigDataBenchmark = "";
      fallbackReply = `\u3010\u{1F916} \u901A\u7528 AI \u52A9\u624B \xB7 \u672C\u5730\u89C4\u5219\u5F15\u64CE\u6A21\u5F0F\u3011

\u5173\u4E8E\u60A8\u54A8\u8BE2\u7684\uFF1A\u300C${question}\u300D

\u{1F4CC} \u4E24\u4E2A\u5EFA\u8BAE\u65B9\u5411\uFF1A
1\uFE0F\u20E3 \u5982\u679C\u662F\u672C\u5E73\u53F0\u7684\u3010\u586B\u62A5\u4E0E\u8BC4\u5206\u3011\u95EE\u9898\uFF08\u6D41\u6C34\u3001\u6BDB\u5229\u3001OPEX\u3001\u5907\u7528\u91D1\u3001\u6C47\u7387\u3001\u51ED\u8BC1\u3001\u5B63\u8282/\u4F11\u6E14\u7B49\u8FB9\u7F18\u60C5\u51B5\uFF09\uFF0C\u8BF7\u76F4\u63A5\u8FFD\u95EE\u76F8\u5173\u5173\u952E\u8BCD\uFF0C\u6211\u4F1A\u7528\u5927\u767D\u8BDD + \u884C\u4E1A\u5927\u6570\u636E\u4E3A\u60A8\u8BE6\u89E3\uFF1B
2\uFE0F\u20E3 \u5982\u679C\u662F\u3010\u751F\u6D3B\u5E38\u8BC6 / \u5B9E\u7528\u77E5\u8BC6 / \u7B80\u5355\u8BA1\u7B97 / \u5E01\u79CD\u6362\u7B97\u3011\uFF0C\u60A8\u4E5F\u53EF\u4EE5\u76F4\u63A5\u95EE\uFF0C\u6211\u80FD\u8986\u76D6\u5E38\u89C1\u573A\u666F\u3002

\u26A0\uFE0F \u5173\u4E8E"\u80FD\u56DE\u7B54\u4EFB\u4F55\u95EE\u9898"\uFF1A
\u5F53\u524D\u4E91\u7AEF Gemini AI \u670D\u52A1\u6682\u65F6\u4E0D\u53EF\u7528\uFF08\u7F51\u7EDC/\u989D\u5EA6/\u533A\u57DF\u9650\u5236\uFF09\uFF0C\u672C\u6B21\u56DE\u7B54\u7531\u5185\u7F6E\u672C\u5730\u89C4\u5219\u5E93\u63D0\u4F9B\uFF0C\u8986\u76D6\u9762\u6709\u9650\u3002\u8BF7\u7A0D\u540E\u70B9\u51FB\u53F3\u4E0A\u89D2\u7684\u3010\u91CD\u65B0\u63D0\u95EE\u3011\u91CD\u8BD5\uFF0C\u6216\u6362\u4E2A\u95EE\u6CD5\u54A8\u8BE2\u5E73\u53F0\u89C4\u5219\u7C7B\u95EE\u9898\uFF0C\u5373\u53EF\u83B7\u5F97\u884C\u4E1A\u5927\u6570\u636E\u57FA\u51C6\u89E3\u6790\u3002

\u{1F4CD} \u672C\u5E73\u53F0\u5FEB\u6377\u5165\u53E3\uFF1A
\u2022 \u3010\u516C\u5F00\u8BC4\u5206\u6807\u51C6\u3011\u53EF\u67E5\u770B\u5B8C\u6574 5 \u7EF4\u96F7\u8FBE\u6253\u5206\u516C\u5F0F\u4E0E 4 \u5927\u95E8\u69DB\u7EA2\u7EBF\uFF1B
\u2022 \u3010\u884C\u4E1A\u5927\u6570\u636E\u57FA\u51C6\u3011\u53EF\u67E5\u770B\u5404\u884C\u4E1A\u5E73\u5747\u6D41\u6C34\u3001\u6BDB\u5229\u7387\u4E0E\u5B89\u5168\u7EBF\u3002`;
    }
    return res.json({
      reply: fallbackReply,
      aiResponse: fallbackReply,
      answer: fallbackReply,
      aiMode: "rules",
      confidence: isEdgeCase ? "LOW_EDGE_CASE" : "HIGH",
      isEdgeCase,
      category,
      suggestedAction,
      bigDataBenchmark,
      conservativePaths: paths,
      geminiUnavailable,
      geminiError,
      geminiErrorKind
    });
  })
);
app.post("/api/ai/infer-business-structure", async (req, res) => {
  try {
    const { projectName = "", currentIndustry = "", baseCurrency = "USD" } = req.body;
    if (!projectName && !currentIndustry) {
      return res.status(400).json({ error: "Project name or industry is required" });
    }
    const ai = getGeminiClient();
    if (ai) {
      try {
        const systemInstruction = `
\u4F60\u662F\u4E00\u4E2A\u4E13\u4E3A\u5168\u7403\u5546\u4E1A\u5BA3\u6559(BAM)\u3001\u7231\u5FC3\u5DE5\u573A\u4E0E\u5C0F\u5FAE\u5B9E\u4F53\u9879\u76EE\u6253\u9020\u7684\u5546\u4E1A\u6A21\u578B\u4E0E\u8D22\u52A1\u67B6\u6784\u5206\u6790\u4E13\u5BB6\u3002
\u7528\u6237\u63D0\u4F9B\u4E86\u9879\u76EE/\u5E97\u94FA\u540D\u79F0\uFF08\u5982\uFF1A\u201C\u6069\u5178\u793E\u533A\u4E49\u8BCA\u6240\u201D\u3001\u201C\u9EA6\u79CD\u70D8\u7119\u5496\u5561\u9986\u201D\u3001\u201C\u5185\u7F57\u6BD5\u624B\u673A\u7EF4\u4FEE\u57F9\u8BAD\u5DE5\u574A\u201D\u3001\u201C\u6E05\u8FC8\u6709\u673A\u852C\u83DC\u79CD\u690D\u793E\u201D\u3001\u201C\u91D1\u8FB9\u513F\u7AE5\u8F85\u5BFC\u4E2D\u5FC3\u201D\u7B49\uFF09\u3002

\u8BF7\u6839\u636E\u9879\u76EE\u540D\u79F0\u548C\u4E1A\u52A1\u5C5E\u6027\uFF0C\u5B8C\u6210\u4EE5\u4E0B\u5DE5\u4F5C\uFF1A
1. \u667A\u80FD\u63A8\u65AD\u6700\u8D34\u5207\u7684\u884C\u4E1A\u7C7B\u522B key \u53CA\u5C55\u793A\u540D\u79F0\u3002
   \u884C\u4E1A\u9884\u8BBE key \u53EF\u9009\uFF1Amedical_health, food_beverage, education_training, vocational_training, retail_store, agriculture, child_care, community_service, handicraft, tech_service, other
2. \u6839\u636E\u9879\u76EE\u540D\u79F0\u4E2D\u7684\u5730\u540D/\u56FD\u5BB6\u7EBF\u7D22\u63A8\u65AD\u6700\u9002\u7528\u7684\u5EFA\u8BAE\u4E3B\u5E01\u79CD\uFF08\u5982\u6D89\u53CA\u80AF\u5C3C\u4E9A/\u5185\u7F57\u6BD5\u63A8\u65AD KES\uFF0C\u6CF0\u56FD/\u6E05\u8FC8\u63A8\u65AD THB\uFF0C\u8D8A\u5357\u63A8\u65AD VND\uFF0C\u5C3C\u65E5\u5229\u4E9A\u63A8\u65AD NGN\uFF0C\u4E2D\u56FD\u63A8\u65AD CNY\uFF0C\u5168\u7403/\u672A\u660E\u786E\u63A8\u65AD USD\uFF09\u3002
3. \u4E3A\u8BE5\u3010\u7279\u5B9A\u884C\u4E1A\u4E0E\u5E97\u94FA\u7C7B\u578B\u3011\u91CF\u8EAB\u5B9A\u5236 2-4 \u4E2A\u5177\u4F53\u7684\u3010\u76F4\u63A5\u7269\u6599/\u91C7\u8D2D\u6210\u672C\u586B\u5199\u9879 (COGS)\u3011\uFF08\u4F8B\u5982\u8BCA\u6240\u662F\u836F\u54C1\u91C7\u8D2D\u3001\u6577\u6599\u9488\u5242\uFF1B\u5496\u5561\u5E97\u662F\u5496\u5561\u8C46\u9C9C\u5976\u3001\u6253\u5305\u676F\u888B\uFF1B\u8BED\u8A00\u4E2D\u5FC3\u662F\u6559\u6750\u6587\u5177\u5370\u5236\uFF09\u3002
4. \u4E3A\u8BE5\u5E97\u94FA\u91CF\u8EAB\u5B9A\u5236 3-5 \u4E2A\u5177\u4F53\u7684\u3010\u6BCF\u6708\u56FA\u5B9A\u8FD0\u8425\u5F00\u652F\u586B\u5199\u9879 (OPEX)\u3011\uFF08\u4F8B\u5982\u573A\u5730\u79DF\u91D1\u3001\u5458\u5DE5\u85AA\u916C\u4E0E\u540C\u5DE5\u8865\u8D34\u3001\u6C34\u7535\u71C3\u6C14\u4E0E\u7F51\u7EDC\u7269\u4E1A\u3001\u8BBE\u5907\u6298\u65E7\u7EF4\u62A4\u7B49\uFF09\u3002
5. \u7ED9\u51FA\u9002\u5408\u8BE5\u5E01\u79CD\u548C\u884C\u4E1A\u7684\u5408\u7406\u9ED8\u8BA4\u53C2\u8003\u6570\u503C\u3002

\u8FD4\u56DE\u5408\u6CD5\u7684 JSON \u683C\u5F0F\uFF1A
{
  "inferredIndustryKey": "medical_health" | "food_beverage" | "education_training" | "vocational_training" | "retail_store" | "agriculture" | "child_care" | "community_service" | "handicraft" | "other",
  "industryDisplayName": "\u533B\u7597\u5065\u5EB7 / \u7231\u5FC3\u4E49\u8BCA\u6240",
  "customIndustryName": "\u793E\u533A\u5E73\u4EF7\u95E8\u8BCA\u4E0E\u6162\u75C5\u7167\u62A4",
  "suggestedCurrency": "KES" | "THB" | "USD" | "CNY" | "VND" | "EUR" \u7B49,
  "revenueTip": "\u95E8\u8BCA\u770B\u8BCA\u8D39\u3001\u914D\u836F\u8FDB\u8D26\u4E0E\u68C0\u67E5\u8D39\u7B49\u5168\u90E8\u6708\u6D41\u6C34",
  "estimatedMonthlyRevenue": 50000,
  "cogsItems": [
    {
      "id": "cogs_1",
      "name": "\u5E38\u7528\u4E2D\u897F\u836F\u54C1\u4E0E\u836F\u5242\u91C7\u8D2D",
      "description": "\u53E3\u670D\u836F\u3001\u6297\u751F\u7D20\u3001\u5E38\u89C4\u6025\u6551\u9488\u5242\u7B49",
      "amount": 15000
    },
    {
      "id": "cogs_2",
      "name": "\u533B\u7528\u8017\u6750\u4E0E\u6D88\u6BD2\u5668\u68B0",
      "description": "\u6CE8\u5C04\u5668\u3001\u6577\u6599\u7EB1\u5E03\u3001\u9152\u7CBE\u6D88\u6BD2\u624B\u5957\u7B49",
      "amount": 3000
    }
  ],
  "opexItems": [
    {
      "id": "opex_rent",
      "name": "\u8BCA\u6240\u4E34\u8857\u573A\u5730\u79DF\u91D1",
      "description": "\u6708\u5EA6\u56FA\u5B9A\u652F\u4ED8\u7ED9\u623F\u4E1C\u7684\u94FA\u9762\u79DF\u91D1",
      "amount": 4500
    },
    {
      "id": "opex_labor",
      "name": "\u672C\u5730\u62A4\u58EB\u4E0E\u836F\u5242\u540C\u5DE5\u8865\u8D34",
      "description": "\u672C\u5730\u62A4\u58EB\u3001\u52A9\u7406\u4E0E\u836F\u623F\u7BA1\u7406\u5458\u85AA\u8D44\u8865\u8D34",
      "amount": 6000
    },
    {
      "id": "opex_utility",
      "name": "\u51B7\u85CF\u836F\u67DC\u7535\u8D39\u3001\u6C34\u8D39\u4E0E\u7F51\u7EDC",
      "description": "\u836F\u54C1\u51B7\u85CF\u51B0\u7BB1\u3001\u7167\u660E\u7528\u7535\u53CA\u5BBD\u5E26\u901A\u8BAF",
      "amount": 1200
    },
    {
      "id": "opex_other",
      "name": "\u533B\u7597\u5E9F\u7269\u5408\u89C4\u5904\u7F6E\u4E0E\u6742\u652F",
      "description": "\u533B\u7597\u56FA\u5E9F\u6E05\u8FD0\u4E0E\u65E5\u5E38\u6E05\u6D01\u8017\u635F",
      "amount": 800
    }
  ],
  "benchmarkAdvice": "\u7231\u5FC3\u95E8\u8BCA\u836F\u54C1\u8017\u6750\u76F4\u63A5\u6210\u672C\u7EA6\u5360\u603B\u8FDB\u8D26 30%-40%\uFF0C\u5EFA\u8BAE\u5E38\u5907 3.5 \u4E2A\u6708\u4EE5\u4E0A\u56FA\u5B9A\u5F00\u652F\u73B0\u91D1\u50A8\u5907\u3002"
}
`;
        const replyText = await generateGeminiContent(
          `\u9879\u76EE/\u5E97\u94FA\u540D\u79F0: "${projectName}"
\u7528\u6237\u5F53\u524D\u9009\u62E9\u7684\u884C\u4E1A: "${currentIndustry}"
\u5F53\u524D\u5E01\u79CD: "${baseCurrency}"`,
          systemInstruction
        );
        const parsed = JSON.parse(replyText || "{}");
        if (parsed.inferredIndustryKey) {
          return res.json({
            success: true,
            ...parsed
          });
        }
      } catch (err) {
        console.warn("Gemini infer-business-structure failed, fallback to smart rule engine:", err.message);
      }
    }
    const pLower = projectName.toLowerCase();
    let key = "community_service";
    let displayName = "\u7EFC\u5408\u52A9\u8D2B / \u793E\u4F1A\u4F01\u4E1A";
    let customName = "\u793E\u533A\u670D\u52A1\u4E0E\u7EFC\u5408\u793E\u4F1A\u4F01\u4E1A";
    let curr = baseCurrency || "USD";
    let revTip = "\u65E5\u5E38\u8425\u4E1A\u4E0E\u670D\u52A1\u603B\u6D41\u6C34\u8FDB\u8D26";
    let rev = 4e4;
    let cogs = [];
    let opex = [];
    let advice = "\u5EFA\u8BAE\u4FDD\u6301\u76F4\u63A5\u6210\u672C\u5360 30% \u5DE6\u53F3\uFF0C\u5E38\u5907 3 \u4E2A\u6708\u4EE5\u4E0A\u56FA\u5B9A\u5F00\u652F\u5E94\u6025\u91D1\u3002";
    if (/肯尼亚|内罗毕|nairobi|kenya|kes/i.test(pLower)) curr = "KES";
    else if (/泰国|清迈|曼谷|thailand|chiang mai|thb/i.test(pLower)) curr = "THB";
    else if (/越南|河内|胡志明|vietnam|vnd/i.test(pLower)) curr = "VND";
    else if (/印尼|雅加达|indonesia|idr/i.test(pLower)) curr = "IDR";
    else if (/菲律宾|马尼拉|philippines|php/i.test(pLower)) curr = "PHP";
    else if (/尼日利亚|拉各斯|nigeria|ngn/i.test(pLower)) curr = "NGN";
    else if (/埃及|开罗|egypt|egp/i.test(pLower)) curr = "EGP";
    else if (/埃塞俄比亚|ethiopia|etb/i.test(pLower)) curr = "ETB";
    else if (/缅甸|仰光|曼德勒|内比都|myanmar|yangon|mmk/i.test(pLower)) curr = "MMK";
    else if (/柬埔寨|金边|cambodia|phnom penh|khr/i.test(pLower)) curr = "KHR";
    else if (/老挝|万象|laos|vientiane|lak/i.test(pLower)) curr = "LAK";
    else if (/孟加拉|达卡|bangladesh|dhaka|bdt/i.test(pLower)) curr = "BDT";
    else if (/斯里兰卡|科伦坡|sri lanka|colombo|lkr/i.test(pLower)) curr = "LKR";
    else if (/中国|恩典|麦种|光明|爱心|cny|rmb/i.test(pLower)) curr = "CNY";
    if (/医|诊所|药|门诊|卫生|康复|牙科|clinic|health|hospital|care|medical/i.test(pLower)) {
      key = "medical_health";
      displayName = "\u533B\u7597\u5065\u5EB7 / \u7231\u5FC3\u4E49\u8BCA\u6240";
      customName = "\u793E\u533A\u7231\u5FC3\u8BCA\u6240\u4E0E\u4FBF\u6C11\u836F\u623F";
      revTip = "\u95E8\u8BCA\u6302\u53F7\u770B\u8BCA\u8D39\u3001\u5E73\u4EF7\u836F\u54C1\u4E0E\u68C0\u67E5\u8D39\u7B49\u5168\u90E8\u8FDB\u8D26";
      rev = 2200;
      cogs = [
        { id: "cogs_meds", name: "\u5E38\u7528\u4E2D\u897F\u836F\u54C1\u4E0E\u836F\u5242\u91C7\u8D2D", description: "\u6297\u751F\u7D20\u3001\u611F\u5192\u9000\u70ED\u3001\u964D\u538B\u7B49\u5E38\u5907\u836F\u54C1", amount: 650 },
        { id: "cogs_supplies", name: "\u533B\u7528\u6577\u6599\u8017\u6750\u4E0E\u6D88\u6BD2\u5668\u68B0", description: "\u4E00\u6B21\u6027\u6CE8\u5C04\u5668\u3001\u7EB1\u5E03\u80F6\u5E03\u3001\u6D88\u6BD2\u9152\u7CBE\u3001\u624B\u5957", amount: 150 }
      ];
      opex = [
        { id: "opex_rent", name: "\u8BCA\u6240\u573A\u5730\u79DF\u91D1\u4E0E\u7269\u4E1A", description: "\u6BCF\u6708\u56FA\u5B9A\u623F\u79DF\u4E0E\u7269\u4E1A\u8D39", amount: 400 },
        { id: "opex_staff", name: "\u672C\u5730\u62A4\u58EB\u4E0E\u836F\u623F\u52A9\u7406\u6D25\u8D34", description: "\u5168\u804C\u62A4\u58EB\u4E0E\u914D\u836F\u540C\u5DE5\u85AA\u916C", amount: 600 },
        { id: "opex_utility", name: "\u51B7\u85CF\u7535\u8D39\u3001\u6C34\u7535\u4E0E\u901A\u8BAF", description: "\u836F\u54C1\u51B0\u7BB1\u51B7\u85CF\u7528\u7535\u3001\u65E5\u5E38\u6C34\u7535\u4E0E\u5BBD\u5E26", amount: 120 },
        { id: "opex_misc", name: "\u533B\u7597\u56FA\u5E9F\u6E05\u8FD0\u4E0E\u6267\u7167\u5E74\u68C0", description: "\u5408\u89C4\u73AF\u4FDD\u6E05\u8FD0\u4E0E\u6D88\u8017\u54C1", amount: 80 }
      ];
      advice = "\u7231\u5FC3\u95E8\u8BCA\u836F\u54C1\u91C7\u8D2D\u6210\u672C\u7EA6\u5360\u603B\u8FDB\u8D26 30%-40%\uFF0C\u5EFA\u8BAE\u5E38\u5907 3.5 \u4E2A\u6708\u56FA\u5B9A\u5F00\u652F\u5907\u7528\u91D1\u3002";
    } else if (/咖啡|烘焙|面包|餐厅|小吃|甜品|茶|cafe|bakery|coffee|food|restaurant/i.test(pLower)) {
      key = "food_beverage";
      displayName = "\u9910\u996E\u70D8\u7119 / \u793E\u533A\u5496\u5561";
      customName = "\u793E\u533A\u70D8\u7119\u5DE5\u574A\u4E0E\u7CBE\u54C1\u5496\u5561";
      revTip = "\u5802\u98DF\u70B9\u5355\u3001\u73B0\u70E4\u9762\u5305\u751C\u70B9\u3001\u5916\u5356\u53CA\u5496\u5561\u8C46\u96F6\u552E\u603B\u8FDB\u8D26";
      rev = 3e3;
      cogs = [
        { id: "cogs_beans_milk", name: "\u5496\u5561\u751F\u8C46/\u719F\u8C46\u3001\u9C9C\u725B\u5976\u4E0E\u7CD6\u6D46", description: "\u9AD8\u54C1\u8D28\u5496\u5561\u8C46\u3001\u9C9C\u725B\u5976/\u71D5\u9EA6\u5976\u539F\u6599", amount: 700 },
        { id: "cogs_baking", name: "\u70D8\u7119\u9762\u7C89\u3001\u9EC4\u6CB9\u3001\u9175\u6BCD\u4E0E\u914D\u6599", description: "\u70D8\u7119\u4E13\u7528\u9762\u7C89\u3001\u52A8\u7269\u9EC4\u6CB9\u3001\u4E73\u916A\u7B49\u98DF\u6750", amount: 450 },
        { id: "cogs_packaging", name: "\u5916\u5E26\u73AF\u4FDD\u7EB8\u676F\u3001\u5438\u7BA1\u4E0E\u6253\u5305\u76D2\u888B", description: "\u5B9A\u5236\u73AF\u4FDD\u5496\u5561\u7EB8\u676F\u3001\u5C01\u53E3\u819C\u3001\u98DF\u54C1\u5305\u88C5\u888B", amount: 150 }
      ];
      opex = [
        { id: "opex_rent", name: "\u4E34\u8857\u65FA\u94FA/\u793E\u533A\u5E97\u9762\u79DF\u91D1", description: "\u6BCF\u6708\u56FA\u5B9A\u95E8\u9762\u94FA\u79DF", amount: 500 },
        { id: "opex_barista", name: "\u5496\u5561\u5E08\u4E0E\u70D8\u7119\u5E08\u5085\u85AA\u8D44", description: "\u5168\u804C\u4E0E\u517C\u804C\u5E97\u5458\u85AA\u916C", amount: 700 },
        { id: "opex_power", name: "\u9AD8\u529F\u7387\u70D8\u7119\u70E4\u7BB1\u4E0E\u5496\u5561\u673A\u7535\u8D39\u6C34\u8D39", description: "\u5546\u7528\u70E4\u7BB1\u3001\u6D53\u7F29\u5496\u5561\u673A\u52A8\u529B\u7528\u7535\u4E0E\u6C34\u8D39", amount: 160 },
        { id: "opex_maintenance", name: "\u5546\u7528\u8BBE\u5907\u65E5\u5E38\u4FDD\u517B\u4E0E\u8017\u635F", description: "\u6EE4\u6C34\u5668\u6EE4\u82AF\u66F4\u6362\u3001\u78E8\u8C46\u673A\u7EF4\u62A4\u4E0E\u635F\u8017", amount: 80 }
      ];
      advice = "\u9910\u996E\u70D8\u7119\u884C\u4E1A\u76F4\u63A5\u98DF\u6750\u6210\u672C\u901A\u5E38\u5360 35%-45%\uFF0C\u6BDB\u5229\u7387\u5B9C\u4FDD\u6301\u5728 55% \u4EE5\u4E0A\uFF0C\u6CE8\u610F\u63A7\u5236\u65FA\u94FA\u79DF\u91D1\u6BD4\u91CD\u3002";
    } else if (/教育|学校|培训|辅导|语言|英语|文化|课后|school|education|language|tutoring/i.test(pLower)) {
      key = "education_training";
      displayName = "\u8BED\u8A00\u6559\u80B2 / \u8F85\u5BFC\u4E2D\u5FC3";
      customName = "\u793E\u533A\u9752\u5C11\u5E74\u8BED\u8A00\u5B66\u4E60\u4E0E\u8BFE\u540E\u8F85\u5BFC\u4E2D\u5FC3";
      revTip = "\u5B66\u5458\u6708\u5EA6/\u5B63\u5EA6\u5B66\u8D39\u3001\u6559\u6750\u8D39\u4E0E\u8BFE\u540E\u8F85\u5BFC\u6536\u8D39";
      rev = 2200;
      cogs = [
        { id: "cogs_books", name: "\u6559\u5B66\u6559\u6750\u3001\u7EC3\u4E60\u518C\u4E0E\u8BFE\u672C\u5370\u5236", description: "\u5B66\u751F\u5B66\u4E60\u8BB2\u4E49\u3001\u5370\u5237\u6559\u6750\u4E0E\u7EC3\u4E60\u6587\u5177", amount: 220 },
        { id: "cogs_online", name: "\u5728\u7EBF\u6559\u5B66\u8F6F\u4EF6\u5E73\u53F0\u4E0E\u6559\u5177\u8017\u6750", description: "\u6559\u5B66\u8BFE\u4EF6\u7CFB\u7EDF\u3001\u767D\u677F\u7B14\u4E0E\u6D3B\u52A8\u9053\u5177", amount: 80 }
      ];
      opex = [
        { id: "opex_rent", name: "\u6559\u5B66\u6559\u5BA4\u573A\u5730\u79DF\u91D1", description: "\u6559\u5BA4\u3001\u81EA\u4E60\u5BA4\u6708\u5EA6\u56FA\u5B9A\u79DF\u91D1", amount: 500 },
        { id: "opex_teachers", name: "\u672C\u5730\u6388\u8BFE\u6559\u5E08\u4E0E\u52A9\u6559\u8BFE\u916C", description: "\u4E13\u804C\u8001\u5E08\u4E0E\u517C\u804C\u52A9\u6559\u85AA\u916C\u8865\u8D34", amount: 950 },
        { id: "opex_utility", name: "\u6559\u5BA4\u7A7A\u8C03\u7535\u8D39\u3001\u5BBD\u5E26\u7F51\u7EDC\u4E0E\u996E\u7528\u6C34", description: "\u6559\u5BA4\u5185\u7167\u660E\u7A7A\u8C03\u52A8\u529B\u7535\u4E0E\u591A\u5A92\u4F53\u7F51\u7EDC", amount: 140 },
        { id: "opex_activity", name: "\u5B66\u5458\u6587\u5316\u4EA4\u6D41\u4E0E\u5BB6\u957F\u65E5\u6D3B\u52A8\u6742\u8D39", description: "\u5B9A\u671F\u5B66\u5458\u6587\u5316\u5C55\u793A\u4E0E\u8F85\u5BFC\u6742\u652F", amount: 80 }
      ];
      advice = "\u6559\u80B2\u57F9\u8BAD\u5C5E\u4E8E\u8F7B\u8D44\u4EA7\u670D\u52A1\uFF0C\u76F4\u63A5\u6559\u6750\u6210\u672C\u4F4E\uFF08<15%\uFF09\uFF0C\u6838\u5FC3\u652F\u51FA\u5728\u8001\u5E08\u85AA\u8D44\u4E0E\u573A\u5730\uFF0C\u4FDD\u6301 25% \u7ED3\u4F59\u5373\u53EF\u7A33\u5065\u8FD0\u8425\u3002";
    } else if (/技能|维修|it|汽修|木工|手工|实训|工坊|workshop|tech|repair|vocational/i.test(pLower)) {
      key = "vocational_training";
      displayName = "\u804C\u4E1A\u5B9E\u8BAD / \u624B\u5DE5\u5DE5\u574A";
      customName = "\u9752\u5E74\u804C\u4E1A\u6280\u80FD\u5B9E\u8BAD\u4E0E\u624B\u827A\u5DE5\u574A";
      revTip = "\u624B\u4F5C\u4EA7\u54C1\u9500\u552E\u3001\u7EF4\u4FEE\u670D\u52A1\u6536\u8D39\u4E0E\u5B9E\u8BAD\u5B66\u5458\u5B66\u8D39";
      rev = 2200;
      cogs = [
        { id: "cogs_materials", name: "\u5B9E\u8BAD\u539F\u6599\u3001\u6728\u6599/\u76AE\u9769/\u5E03\u6599\u8017\u6750", description: "\u5236\u4F5C\u6210\u54C1\u6D88\u8017\u7684\u539F\u6750\u6599\u4E0E\u914D\u4EF6", amount: 500 },
        { id: "cogs_tools", name: "\u6613\u635F\u5200\u5177\u3001\u710A\u9521/\u4E94\u91D1\u96F6\u914D\u4EF6\u4E0E\u635F\u8017", description: "\u65E5\u5E38\u5B9E\u64CD\u6613\u8017\u96F6\u90E8\u4EF6\u4E0E\u4E94\u91D1", amount: 160 }
      ];
      opex = [
        { id: "opex_rent", name: "\u5B9E\u8BAD\u8F66\u95F4/\u5DE5\u574A\u573A\u5730\u79DF\u91D1", description: "\u5DE5\u574A\u8F66\u95F4\u6708\u5EA6\u573A\u5730\u79DF\u91D1", amount: 400 },
        { id: "opex_master", name: "\u5E26\u6559\u6280\u5E08\u4E0E\u5DE5\u5320\u5E08\u5085\u6D25\u8D34", description: "\u5168\u804C\u6280\u5E08\u5E08\u5085\u4E0E\u8F66\u95F4\u6307\u5BFC\u5458\u85AA\u8D44", amount: 700 },
        { id: "opex_power", name: "\u52A8\u529B\u5DE5\u4E1A\u7528\u7535\u3001\u6C34\u8D39\u4E0E\u5B89\u5168\u4FDD\u9669", description: "\u5927\u578B\u673A\u5E8A/\u7535\u52A8\u5DE5\u5177\u52A8\u529B\u7528\u7535\u4E0E\u5B89\u5168\u9632\u62A4", amount: 150 },
        { id: "opex_maintain", name: "\u673A\u68B0\u8BBE\u5907\u5B9A\u671F\u68C0\u4FEE\u4E0E\u6DA6\u6ED1\u8017\u635F", description: "\u8BBE\u5907\u78E8\u635F\u7EF4\u62A4\u4E0E\u96F6\u4EF6\u66F4\u6362", amount: 90 }
      ];
      advice = "\u804C\u4E1A\u5B9E\u8BAD\u4E0E\u5DE5\u574A\u9700\u517C\u987E\u4EA7\u54C1\u8D28\u91CF\u4E0E\u6280\u80FD\u4F20\u6388\uFF0C\u5EFA\u8BAE\u50A8\u5907 3 \u4E2A\u6708\u4EE5\u4E0A\u8D44\u91D1\u652F\u6301\u8BBE\u5907\u5347\u7EA7\u6362\u4EE3\u3002";
    } else if (/超市|商超|便利|杂货|零售|批发|档口|百货|服装|服饰|衣帽|鞋店|箱包|手机|数码|电脑|电器|家电|五金|建材|文具|store|shop|market|retail|clothing|garment|tailor|shoe|phone|electronics|hardware/i.test(pLower)) {
      key = "retail_store";
      displayName = "\u793E\u533A\u96F6\u552E / \u5E73\u4EF7\u5546\u8D85";
      customName = "\u4FBF\u6C11\u793E\u533A\u751F\u6D3B\u5E73\u4EF7\u8D85\u5E02";
      revTip = "\u65E5\u7528\u767E\u8D27\u3001\u98DF\u54C1\u8C03\u6599\u4E0E\u5E73\u4EF7\u751F\u9C9C\u5168\u90E8\u6536\u94F6\u6D41\u6C34";
      rev = 5e3;
      cogs = [
        { id: "cogs_stock", name: "\u5546\u54C1\u6279\u91CF\u6279\u53D1\u8FDB\u8D27\u6210\u672C", description: "\u5411\u4E00\u7EA7\u6279\u53D1\u5546\u91C7\u8D2D\u7C73\u9762\u7CAE\u6CB9\u3001\u65E5\u5316\u65E5\u6742\u5E95\u4EF7", amount: 3800 },
        { id: "cogs_freight", name: "\u8D27\u54C1\u7269\u6D41\u8FD0\u8F93\u4E0E\u642C\u8FD0\u88C5\u5378\u8D39", description: "\u5927\u5B97\u5546\u54C1\u957F\u9014\u914D\u9001\u4E0E\u5230\u5E97\u642C\u8FD0\u8D39", amount: 200 }
      ];
      opex = [
        { id: "opex_rent", name: "\u4E34\u8857\u5546\u94FA\u6708\u5EA6\u79DF\u91D1", description: "\u793E\u533A\u51FA\u5165\u53E3\u5546\u94FA\u56FA\u5B9A\u6708\u79DF", amount: 400 },
        { id: "opex_cashier", name: "\u6536\u94F6\u5458\u4E0E\u7406\u8D27\u5E97\u5458\u85AA\u8D44", description: "\u5168\u804C\u4E0E\u6392\u73ED\u7406\u8D27\u5458\u5DE5\u8D44", amount: 350 },
        { id: "opex_utility", name: "\u5546\u8D85\u7167\u660E\u3001\u51B0\u67DC\u51B7\u85CF\u7528\u7535\u4E0E\u7F51\u7EDC", description: "\u9648\u5217\u51B7\u996E\u67DC\u6301\u7EED\u7528\u7535\u53CA\u6536\u94F6\u5BBD\u5E26", amount: 100 },
        { id: "opex_loss", name: "\u8D27\u54C1\u5408\u7406\u635F\u8017\u3001\u9632\u76D7\u4E0E\u5305\u88C5\u888B", description: "\u751F\u9C9C\u81EA\u7136\u635F\u8017\u3001\u73AF\u4FDD\u8D2D\u7269\u888B\u91C7\u8D2D", amount: 50 }
      ];
      advice = "\u793E\u533A\u96F6\u552E\u8D70\u91CF\u4E3A\u4E3B\uFF0C\u6BDB\u5229\u7387\u901A\u5E38\u5728 20%-30%\uFF0C\u9700\u4E25\u683C\u628A\u63A7\u8FDB\u8D27\u5468\u8F6C\u7387\u4E0E\u635F\u8017\u3002";
    } else if (/农场|农业|种植|养殖|果园|蔬菜|farm|agriculture/i.test(pLower)) {
      key = "agriculture";
      displayName = "\u73B0\u4EE3\u519C\u4E1A / \u751F\u6001\u79CD\u690D";
      customName = "\u751F\u6001\u519C\u4E1A\u79CD\u690D\u4E0E\u6276\u8D2B\u5408\u4F5C\u793E";
      revTip = "\u679C\u852C\u6536\u6210\u6279\u53D1\u3001\u751F\u6001\u519C\u4EA7\u54C1\u76F4\u9500\u4E0E\u8BA2\u5355\u8FDB\u8D26";
      rev = 1800;
      cogs = [
        { id: "cogs_seeds", name: "\u4F18\u826F\u79CD\u82D7\u3001\u6709\u673A\u80A5\u6599\u4E0E\u751F\u7269\u519C\u836F", description: "\u975E\u8F6C\u57FA\u56E0\u4F18\u8D28\u79CD\u5B50\u3001\u6709\u673A\u5806\u80A5\u4E0E\u751F\u7269\u9632\u866B\u5242", amount: 380 },
        { id: "cogs_packaging", name: "\u4FDD\u9C9C\u5305\u88C5\u7BB1\u3001\u679C\u7B50\u4E0E\u7530\u95F4\u8017\u6750", description: "\u900F\u6C14\u679C\u852C\u7EB8\u7BB1\u3001\u51B7\u94FE\u51B0\u888B\u4E0E\u5305\u88C5\u819C", amount: 120 }
      ];
      opex = [
        { id: "opex_rent", name: "\u519C\u7530\u571F\u5730\u79DF\u8D41\u4E0E\u5927\u68DA\u79DF\u91D1", description: "\u5408\u4F5C\u793E\u8015\u5730\u4E0E\u6E29\u5BA4\u5927\u68DA\u627F\u5305\u79DF\u91D1", amount: 280 },
        { id: "opex_farmers", name: "\u672C\u5730\u519C\u5DE5\u4E0E\u7530\u95F4\u7BA1\u7406\u4EBA\u5458\u5DE5\u8D44", description: "\u5168\u804C\u519C\u827A\u5E08\u4E0E\u91C7\u6458\u5B63\u8282\u5DE5\u85AA\u916C", amount: 550 },
        { id: "opex_irrigation", name: "\u704C\u6E89\u6C34\u8D39\u3001\u519C\u673A\u67F4\u6CB9\u4E0E\u7535\u529B", description: "\u6C34\u6CF5\u704C\u6E89\u7528\u7535\u3001\u5FAE\u8015\u673A\u519C\u7528\u67F4\u6CB9", amount: 150 },
        { id: "opex_tools", name: "\u519C\u5177\u7EF4\u62A4\u4E0E\u6C34\u80A5\u4E00\u4F53\u5316\u7BA1\u7F51\u4FDD\u517B", description: "\u6EF4\u704C\u7BA1\u9053\u68C0\u4FEE\u4E0E\u519C\u673A\u914D\u4EF6\u8017\u635F", amount: 80 }
      ];
      advice = "\u519C\u4E1A\u53D7\u5B63\u8282\u4E0E\u5929\u6C14\u5F71\u54CD\u8F83\u5927\uFF0C\u5EFA\u8BAE\u9884\u7559 4-6 \u4E2A\u6708\u56FA\u5B9A\u5F00\u9500\u4F5C\u4E3A\u8D8A\u51AC\u6216\u4F11\u8015\u671F\u5468\u8F6C\u8D44\u91D1\u3002";
    } else if (/儿童|日托|学前|启蒙|幼托|childcare|daycare|kindergarten/i.test(pLower)) {
      key = "child_care";
      displayName = "\u513F\u7AE5\u65E5\u6258 / \u793E\u533A\u542F\u8499";
      customName = "\u793E\u533A\u8D2B\u56F0\u513F\u7AE5\u65E5\u6258\u4E0E\u5B66\u524D\u542F\u8499\u4E2D\u5FC3";
      revTip = "\u5BB6\u957F\u6258\u80B2\u670D\u52A1\u8D39\u3001\u8425\u517B\u81B3\u98DF\u8D39\u4E0E\u7231\u5FC3\u52A9\u5B66\u6B3E";
      rev = 1900;
      cogs = [
        { id: "cogs_food", name: "\u513F\u7AE5\u6BCF\u65E5\u8425\u517B\u81B3\u98DF\u4E0E\u8F85\u98DF\u539F\u6599", description: "\u65B0\u9C9C\u725B\u5976\u3001\u9E21\u86CB\u3001\u852C\u679C\u53CA\u5B89\u5168\u8425\u517B\u98DF\u6750", amount: 320 },
        { id: "cogs_toys", name: "\u76CA\u667A\u6559\u5177\u3001\u7ED8\u753B\u6587\u5177\u4E0E\u536B\u751F\u7EB8\u54C1", description: "\u5B89\u5168\u79EF\u6728\u3001\u7ED8\u672C\u3001\u513F\u7AE5\u4E13\u7528\u6D88\u6BD2\u6D17\u624B\u6DB2", amount: 90 }
      ];
      opex = [
        { id: "opex_rent", name: "\u5B89\u5168\u65E5\u6258\u573A\u5730\u4E0E\u6237\u5916\u6D3B\u52A8\u533A\u79DF\u91D1", description: "\u7B26\u5408\u513F\u7AE5\u5B89\u5168\u89C4\u8303\u7684\u5BA4\u5185\u5916\u573A\u5730\u79DF\u91D1", amount: 380 },
        { id: "opex_teachers", name: "\u4E13\u804C\u5E7C\u6559\u8001\u5E08\u4E0E\u4FDD\u80B2\u540C\u5DE5\u85AA\u8D44", description: "\u5168\u804C\u5E7C\u5E08\u3001\u4FDD\u80B2\u5458\u4E0E\u53A8\u5E08\u963F\u59E8\u8865\u8D34", amount: 750 },
        { id: "opex_utility", name: "\u6052\u6E29\u7A7A\u8C03\u7535\u8D39\u3001\u6E29\u6C34\u4E0E\u7A7A\u6C14\u51C0\u5316", description: "\u4FDD\u6301\u9002\u5B9C\u5BA4\u5185\u6E29\u5EA6\u7528\u7535\u4E0E\u51C0\u5316\u5668\u6EE4\u7F51", amount: 120 },
        { id: "opex_safety", name: "\u513F\u7AE5\u5B89\u5168\u4FDD\u9669\u4E0E\u5B9A\u671F\u6D88\u6BD2\u6742\u8D39", description: "\u6D3B\u52A8\u8D23\u4EFB\u9669\u4E0E\u7D2B\u5916\u7EBF\u6D88\u6BD2\u8017\u6750", amount: 70 }
      ];
      advice = "\u513F\u7AE5\u65E5\u6258\u91CD\u5728\u5B89\u5168\u4E0E\u8425\u517B\uFF0C\u4FDD\u6301 3.5 \u4E2A\u6708\u4EE5\u4E0A\u6D41\u52A8\u50A8\u5907\u4EE5\u5E94\u5BF9\u516C\u5171\u536B\u751F\u6216\u7A81\u53D1\u7D27\u6025\u60C5\u51B5\u3002";
    } else if (/美容|美发|理发|美甲|纹绣|洗护|洗衣|干洗|salon|beauty|hair|barber|nail|laundry/i.test(pLower)) {
      key = "community_service";
      displayName = "\u7F8E\u5BB9\u7F8E\u53D1 / \u793E\u533A\u751F\u6D3B\u670D\u52A1";
      customName = "\u793E\u533A\u7F8E\u5BB9\u7F8E\u53D1\u4E0E\u4FBF\u6C11\u751F\u6D3B\u670D\u52A1";
      revTip = "\u7406\u53D1\u7F8E\u5BB9\u670D\u52A1\u3001\u62A4\u7406\u5957\u9910\u4E0E\u4F1A\u5458\u5361\u50A8\u503C\u5168\u90E8\u8FDB\u8D26";
      rev = 1800;
      cogs = [
        { id: "cogs_materials", name: "\u6D17\u62A4\u7F8E\u53D1\u7528\u54C1\u4E0E\u7F8E\u5BB9\u62A4\u7406\u8017\u6750", description: "\u6D17\u53D1\u6C34\u3001\u67D3\u818F\u3001\u62A4\u7406\u6DB2\u4E0E\u4E00\u6B21\u6027\u8017\u6750", amount: 260 },
        { id: "cogs_products", name: "\u96F6\u552E\u62A4\u53D1\u7F8E\u5BB9\u4EA7\u54C1\u8FDB\u8D27", description: "\u5E97\u552E\u62A4\u53D1\u7D20\u3001\u62A4\u80A4\u54C1\u7B49\u5546\u54C1\u6279\u53D1\u6210\u672C", amount: 100 }
      ];
      opex = [
        { id: "opex_rent", name: "\u793E\u533A\u6CBF\u8857\u5E97\u9762\u79DF\u91D1", description: "\u6BCF\u6708\u56FA\u5B9A\u95E8\u9762\u94FA\u79DF", amount: 380 },
        { id: "opex_staff", name: "\u7406\u53D1\u5E08\u4E0E\u7F8E\u5BB9\u6280\u5E08\u85AA\u8D44", description: "\u5168\u804C\u6280\u5E08\u4E0E\u5B66\u5F92\u85AA\u916C\u8865\u8D34", amount: 650 },
        { id: "opex_utility", name: "\u6C34\u7535\u70ED\u6C34\u4E0E\u95E8\u5E97\u6E05\u6D01\u8017\u6750", description: "\u6D17\u62A4\u7528\u6C34\u7528\u7535\u4E0E\u6BDB\u5DFE\u6D88\u6BD2\u6742\u652F", amount: 120 },
        { id: "opex_misc", name: "\u8BBE\u5907\u7EF4\u62A4\u4E0E\u8BC1\u7167\u5E74\u68C0\u6742\u8D39", description: "\u5439\u98CE\u673A\u7535\u63A8\u7EF4\u62A4\u4E0E\u8425\u4E1A\u6267\u7167\u5E74\u68C0", amount: 70 }
      ];
      advice = "\u7F8E\u5BB9\u7F8E\u53D1\u5C5E\u4E8E\u9AD8\u6BDB\u5229\u751F\u6D3B\u670D\u52A1\uFF0C\u8017\u6750\u6210\u672C\u4F4E\uFF0C\u6838\u5FC3\u662F\u7A33\u5B9A\u5BA2\u6D41\u4E0E\u4F1A\u5458\u590D\u8D2D\uFF0C\u5EFA\u8BAE\u5E38\u5907 3 \u4E2A\u6708\u4EE5\u4E0A\u56FA\u5B9A\u5F00\u652F\u3002";
    } else {
      key = "custom";
      displayName = "\u5B9A\u5236\u5B9E\u4F53 / \u5C0F\u5FAE\u5546\u4E1A";
      customName = projectName || "\u5B9A\u5236\u5C0F\u5FAE\u5546\u4E1A\u5B9E\u4F53";
      revTip = "\u6BCF\u6708\u63D0\u4F9B\u5546\u54C1\u6216\u670D\u52A1\u4EA7\u751F\u7684\u5168\u90E8\u8425\u4E1A\u8FDB\u8D26\u6D41\u6C34";
      rev = 2200;
      cogs = [
        { id: "cogs_1", name: "\u6838\u5FC3\u539F\u6750\u6599\u4E0E\u76F4\u63A5\u8D27\u54C1\u91C7\u8D2D", description: "\u968F\u4E1A\u52A1\u91CF\u76F4\u63A5\u6CE2\u52A8\u7684\u5546\u54C1\u6216\u539F\u8F85\u6599\u8FDB\u8D27\u82B1\u8D39", amount: 700 },
        { id: "cogs_2", name: "\u5305\u88C5\u6750\u6599\u4E0E\u76F4\u63A5\u52A0\u5DE5\u8017\u6750", description: "\u5305\u88C5\u7269\u3001\u6D88\u8017\u6027\u8F85\u6599\u4E0E\u76F4\u63A5\u8017\u6750", amount: 150 }
      ];
      opex = [
        { id: "opex_rent", name: "\u7ECF\u8425\u573A\u6240\u4E0E\u529E\u516C\u5BA4\u6708\u5EA6\u79DF\u91D1", description: "\u6BCF\u6708\u56FA\u5B9A\u652F\u4ED8\u7ED9\u4E1A\u4E3B\u7684\u573A\u5730\u79DF\u91D1", amount: 400 },
        { id: "opex_labor", name: "\u5168\u804C\u5458\u5DE5\u4E0E\u4E1A\u52A1\u9AA8\u5E72\u85AA\u8D44\u8865\u8D34", description: "\u5168\u804C\u56E2\u961F\u4E0E\u9AA8\u5E72\u540C\u5DE5\u6BCF\u6708\u56FA\u5B9A\u85AA\u916C", amount: 650 },
        { id: "opex_utility", name: "\u6C34\u7535\u7269\u4E1A\u4E0E\u7F51\u7EDC\u901A\u8BAF\u6742\u652F", description: "\u6BCF\u6708\u56FA\u5B9A\u6C34\u7535\u80FD\u8017\u4E0E\u5BBD\u5E26\u901A\u8BAF\u8D39", amount: 120 },
        { id: "opex_other", name: "\u8BBE\u5907\u6298\u65E7\u7EF4\u62A4\u4E0E\u8BC1\u7167\u6742\u9879", description: "\u5DE5\u5177\u7EF4\u62A4\u3001\u5E74\u68C0\u4E0E\u65E5\u5E38\u6742\u652F", amount: 80 }
      ];
    }
    const inferredRate = SUPPORTED_CURRENCIES.find((c) => c.code === curr)?.rateToUsd || 1;
    const toLocal = (usd) => Math.round(usd * inferredRate);
    rev = toLocal(rev);
    cogs = cogs.map((it) => ({ ...it, amount: toLocal(it.amount) }));
    opex = opex.map((it) => ({ ...it, amount: toLocal(it.amount) }));
    return res.json({
      success: true,
      inferredIndustryKey: key,
      industryDisplayName: displayName,
      customIndustryName: customName,
      suggestedCurrency: curr,
      revenueTip: revTip,
      estimatedMonthlyRevenue: rev,
      cogsItems: cogs,
      opexItems: opex,
      benchmarkAdvice: advice
    });
  } catch (e) {
    console.error("infer-business-structure error:", e);
    res.status(500).json({ error: e.message });
  }
});
app.post("/api/ai/deep-diagnosis", async (req, res) => {
  try {
    const { report } = req.body;
    if (!report) {
      return res.status(400).json({ error: "Report object is required" });
    }
    const ai = getGeminiClient();
    if (ai) {
      try {
        const systemInstruction = `
\u4F60\u662F\u4E00\u4F4D\u8D44\u6DF1\u7684\u5168\u7403\u5C0F\u5FAE\u5546\u4E1A\u8FD0\u8425\u4E0E\u8D22\u52A1\u5065\u5EB7\u4F53\u68C0\u4E13\u5BB6\u3002
\u8BF7\u6839\u636E\u7528\u6237\u5546\u4E1A\u81EA\u6D4B\u9879\u76EE\u7684\u6570\u636E\u6307\u6807\uFF08\u5305\u62EC\u6BDB\u5229\u7387\u3001\u51C0\u5229\u7387\u3001\u79DF\u91D1\u4EBA\u5DE5\u5F00\u9500\u5360\u6BD4\u3001\u73B0\u91D1\u8DD1\u9053\u6708\u6570\u3001\u507F\u503A\u8986\u76D6\u500D\u6570\u30015\u7EF4\u5EA6\u5F97\u5206\u4E0E\u7EA2\u7EBF\u901A\u8FC7\u60C5\u51B5\uFF09\uFF0C\u63D0\u4F9B\u6781\u5177\u843D\u5730\u6307\u5BFC\u610F\u4E49\u7684"\u5927\u767D\u8BDD"\u6DF1\u5EA6\u8BCA\u65AD\u4E0E\u884C\u52A8\u5EFA\u8BAE\u3002
\u4E25\u683C\u8981\u6C42\uFF1A
1. \u4E25\u7981\u4F7F\u7528\u4EFB\u4F55\u751F\u50FB\u8D22\u52A1\u672F\u8BED\uFF0C\u53EA\u7528\u666E\u901A\u505A\u4E70\u5356\u8001\u677F\u542C\u5F97\u61C2\u7684\u8BED\u8A00\uFF08\u4F8B\u5982\u8BF4"\u6BCF\u5356100\u5757\u80FD\u5269\u4E0B\u591A\u5C11"\u3001"\u624B\u5934\u5907\u7528\u91D1\u80FD\u9876\u51E0\u4E2A\u6708"\u3001"\u6BCF\u6708\u5DE5\u4EBA\u548C\u623F\u79DF\u5F00\u9500\u5403\u6389\u4E86\u591A\u5C11\u5229\u6DA6"\uFF09\u3002
2. \u8F93\u51FA 4-6 \u6761\u975E\u5E38\u5177\u4F53\u3001\u53EF\u6267\u884C\u7684\u64CD\u4F5C\u5EFA\u8BAE\uFF08\u5982\uFF1A\u538B\u964D\u8FDB\u8D27\u6210\u672C\u7684\u8C08\u5224\u7B56\u7565\u3001\u5982\u4F55\u8BBE\u5B9A\u5B89\u5168\u5907\u7528\u91D1\u3001\u503A\u52A1\u91CD\u7EC4\u6216\u52A0\u901F\u73B0\u91D1\u56DE\u6D41\u6280\u5DE7\uFF09\u3002
3. \u8F93\u51FA\u683C\u5F0F\u4E3A JSON\uFF1A
{
  "summaryHeadline": "\u4E00\u53E5\u8BDD\u6838\u5FC3\u5B9A\u6027\uFF08\u4F8B\u5982\uFF1A\u73B0\u91D1\u6D41\u5E95\u5B50\u624E\u5B9E\uFF0C\u4F46\u8FDB\u8D27\u6210\u672C\u5360\u6BD4\u504F\u9AD8\uFF09",
  "plainExplanation": "2-3\u53E5\u901A\u4FD7\u4E1A\u52A1\u4F53\u68C0\u6982\u62EC",
  "actionableAdvices": [
    "\u5177\u4F53\u5EFA\u8BAE 1",
    "\u5177\u4F53\u5EFA\u8BAE 2",
    "\u5177\u4F53\u5EFA\u8BAE 3",
    "\u5177\u4F53\u5EFA\u8BAE 4"
  ],
  "potentialGrowthAreas": [
    "\u589E\u957F\u6293\u624B 1",
    "\u589E\u957F\u6293\u624B 2"
  ]
}
`;
        const replyText = await generateGeminiContent(
          `\u5546\u4E1A\u9879\u76EE\u6570\u636E\uFF1A${JSON.stringify({
            projectName: report.projectName,
            industry: report.industry,
            baseCurrency: report.baseCurrency,
            financials: report.normalizedFinancials,
            radarScores: report.radarScores,
            totalScore: report.totalScore,
            tier: report.tier,
            gatePassed: report.gatePassed,
            failedGates: report.failedGates
          })}`,
          systemInstruction
        );
        const parsed = JSON.parse(replyText || "{}");
        if (!parsed || !parsed.summaryHeadline && !parsed.plainExplanation) {
          throw new Error("Gemini deep diagnosis returned empty result");
        }
        return res.json({
          success: true,
          ...parsed
        });
      } catch (err) {
        console.warn("Gemini deep diagnosis failed, fallback to local engine:", err.message);
      }
    }
    const financials = report.normalizedFinancials;
    const advices = [];
    if (financials.grossMarginPercent < 35) {
      advices.push(`\u8FDB\u8D27\u6210\u672C\u5360\u6BD4\u504F\u9AD8\uFF08\u6BDB\u5229\u7387\u4EC5 ${financials.grossMarginPercent}%\uFF09\uFF1A\u5EFA\u8BAE\u4E0E\u4F9B\u5E94\u5546\u534F\u5546\u6279\u91CF\u91C7\u8D2D\u6298\u6263\uFF0C\u6216\u9002\u5F53\u4F18\u5316\u83DC\u54C1/\u5546\u54C1\u5B9A\u4EF7\u7EC4\u5408\uFF0C\u5C06\u6BDB\u5229\u7387\u63D0\u5347\u81F3 40% \u4EE5\u4E0A\u3002`);
    } else {
      advices.push(`\u6BDB\u5229\u7A7A\u95F4\u8868\u73B0\u5065\u5EB7\uFF08\u6BDB\u5229\u7387 ${financials.grossMarginPercent}%\uFF09\uFF1A\u4EA7\u54C1\u81EA\u5E26\u5B9A\u4EF7\u4F18\u52BF\uFF0C\u53EF\u7EE7\u7EED\u4FDD\u6301\u4F18\u8D28\u8D27\u6E90\u4E0E\u4F9B\u5E94\u94FE\u7A33\u5B9A\u3002`);
    }
    if (financials.cashRunwayMonths < 3) {
      advices.push(`\u624B\u5934\u5907\u7528\u91D1\u7D27\u5F20\uFF08\u4EC5\u53EF\u652F\u6491 ${financials.cashRunwayMonths} \u4E2A\u6708\u5F00\u9500\uFF09\uFF1A\u5EFA\u8BAE\u6682\u505C\u975E\u5FC5\u8981\u8BBE\u5907\u6295\u5165\uFF0C\u4F18\u5148\u5C06\u8D26\u9762\u73B0\u91D1\u79EF\u7D2F\u81F3 3-6 \u4E2A\u6708\u56FA\u5B9A\u652F\u51FA\u5B89\u5168\u7EBF\u3002`);
    } else {
      advices.push(`\u73B0\u91D1\u7F13\u51B2\u57AB\u5145\u88D5\uFF08\u53EF\u652F\u6491 ${financials.cashRunwayMonths} \u4E2A\u6708\uFF09\uFF1A\u5177\u5907\u6781\u5F3A\u7684\u6297\u7A81\u53D1\u98CE\u9669\u4E0E\u6DE1\u5B63\u751F\u5B58\u80FD\u529B\u3002`);
    }
    if (financials.opexRatioPercent > 35) {
      advices.push(`\u6BCF\u6708\u623F\u79DF\u4E0E\u4EBA\u5DE5\u5F00\u9500\u504F\u91CD\uFF08\u5403\u6389\u8425\u4E1A\u989D\u7684 ${financials.opexRatioPercent}%\uFF09\uFF1A\u5EFA\u8BAE\u8BC4\u4F30\u5E97\u94FA\u576A\u6548\u6216\u7075\u6D3B\u7528\u5DE5\u6392\u73ED\uFF0C\u63A7\u5236\u56FA\u5B9A\u6210\u672C\u3002`);
    }
    res.json({
      success: true,
      summaryHeadline: report.gatePassed ? "\u6574\u4F53\u7ECF\u8425\u7A33\u5065\uFF0C\u5177\u5907\u53EF\u6301\u7EED\u9020\u8840\u80FD\u529B" : "\u5B58\u5728\u90E8\u5206\u6210\u672C\u6216\u6D41\u52A8\u6027\u627F\u538B\u98CE\u9669",
      plainExplanation: `\u60A8\u7684\u9879\u76EE\u7EFC\u5408\u5F97\u5206\u4E3A ${report.totalScore}\u5206 (${report.tier})\uFF0C\u6BCF\u6708\u51C0\u5229\u6DA6\u7EA6\u4E3A ${financials.netProfit} ${report.baseCurrency}\u3002`,
      actionableAdvices: advices,
      potentialGrowthAreas: ["\u63D0\u9AD8\u8001\u5BA2\u6237\u590D\u8D2D\u7387\u4EE5\u644A\u8584\u83B7\u5BA2\u6210\u672C", "\u4F18\u5316\u9AD8\u6BDB\u5229\u6838\u5FC3\u5355\u54C1\u9500\u552E\u6BD4\u4F8B"]
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/api/ai/ocr-estimate", async (req, res) => {
  try {
    const { rawRecords, currency = "USD" } = req.body;
    const months = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"];
    const result = months.map((m, idx) => {
      const existing = (rawRecords || []).find((r) => r.month === m);
      if (existing && existing.amount > 0) {
        return {
          month: m,
          revenue: { amount: existing.amount, currency },
          isEstimated: false
        };
      }
      const prev = (rawRecords || []).find((r) => r.month === months[idx - 1]);
      const next = (rawRecords || []).find((r) => r.month === months[idx + 1]);
      const estimatedVal = Math.round(
        ((prev ? prev.amount : 3e4) + (next ? next.amount : 3e4)) / 2
      );
      return {
        month: m,
        revenue: { amount: estimatedVal, currency },
        isEstimated: true,
        note: "AI\u8BC6\u522B\u6D41\u6C34\u65AD\u70B9\uFF0C\u6309\u524D\u540E\u76F8\u90BB\u6708\u4EFD\u5E73\u5747\u503C\u81EA\u52A8\u4F30\u7B97\uFF0C\u8BF7\u6838\u5BF9\u786E\u8BA4"
      };
    });
    res.json({
      success: true,
      data: result,
      estimatedCount: result.filter((r) => r.isEstimated).length,
      notice: "\u90E8\u5206\u6708\u4EFD\u6570\u636E\u4E0D\u5B8C\u6574\uFF0C\u5DF2\u7531\u7CFB\u7EDF\u81EA\u52A8\u6839\u636E\u524D\u540E\u6708\u4EFD\u5747\u503C\u751F\u6210\u53C2\u8003\u4F30\u7B97\u503C\uFF0C\u7528\u6237\u53EF\u76F4\u63A5\u91C7\u7EB3\u6216\u624B\u52A8\u4FEE\u6539\u3002"
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.use((err, req, res, _next) => {
  const isBodyParseError = Boolean(
    err && (err.type === "entity.parse.failed" || err.type === "entity.too.large" || err instanceof SyntaxError)
  );
  const status = isBodyParseError ? 400 : err?.status || err?.statusCode || 500;
  if (status >= 500) {
    console.error("[server] unhandled error:", err?.stack || err);
  }
  if (res.headersSent) {
    return;
  }
  const message = isBodyParseError ? "Malformed JSON body: failed to parse request payload" : status >= 500 ? "Internal server error" : String(err?.message || "Bad request");
  res.status(status).json({ error: message });
});
app.use("/api", (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vitePkgName = "vite";
    const { createServer: createViteServer } = await import(vitePkgName);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\u{1F680} BAM Platform Server running on http://0.0.0.0:${PORT}`);
  });
}
var isDirectRun = !process.env.VERCEL;
if (isDirectRun) {
  startServer();
}
var server_default = app;

// api/[...path].ts
async function handler(req, res) {
  try {
    await new Promise((resolve, reject) => {
      res.once("finish", () => resolve());
      res.once("close", () => resolve());
      res.once("error", (err) => reject(err));
      try {
        server_default(req, res);
      } catch (err) {
        reject(err);
      }
    });
  } catch (err) {
    console.error("[api/[...path]] handler error:", err?.stack || err);
    if (!res.writableEnded && !res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: "Internal server error",
          detail: String(err?.message || err || "unknown error").slice(0, 500)
        })
      );
    }
  }
}
export {
  handler as default
};
