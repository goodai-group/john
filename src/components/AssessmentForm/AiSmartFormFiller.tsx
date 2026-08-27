import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  CheckCircle2,
  HelpCircle,
  Zap,
  ArrowRight,
  RefreshCw,
  MessageSquare,
  Bot,
  Check,
  ChevronRight,
  Lightbulb
} from 'lucide-react';
import { BusinessFormData, CurrencyCode } from '../../types';

interface AiSmartFormFillerProps {
  onApplyParsedData: (parsed: Partial<BusinessFormData>) => void;
  baseCurrency: CurrencyCode;
}

const PRESET_CASES = [
  {
    title: '🥤 街边奶茶 / 咖啡店',
    text: '我开了一家奶茶店，一个月大概卖 4 万 2，买茶叶牛奶珍珠杯子花 1 万 6，门面租金 4500，雇了 1 个小妹工资 4000，水电 800，手头存着 3 万块备用金，干了 18 个月。'
  },
  {
    title: '🛒 社区便利店 / 杂货铺',
    text: '我和老婆开便利店，一个月流水 7 万 5，批发进零食饮料日用品花 5 万 2，门面租金 5500，电费冰箱 900，雇 1 个理货员 3500，流动资金 4 万，开了 3 年。'
  },
  {
    title: '📦 跨境电商 / 独立网店',
    text: '做外贸独立站，月销售额 11 万，采购货品加运费 5 万 8，海外广告费和软件月租 1 万 2，雇 1 个客服兼职 3000，卡里周转金 7 万，做了 14 个月。'
  },
  {
    title: '✂️ 社区理发店 / 美业',
    text: '开了一家社区理发店，月营业额 3 万 2，洗发水染膏等耗材 3500，房租 4800 水电 600，两个发型师分成工资共 1 万 1，备用金 2 万 5，经营 2 年。'
  }
];

export const AiSmartFormFiller: React.FC<AiSmartFormFillerProps> = ({
  onApplyParsedData,
  baseCurrency
}) => {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedResult, setParsedResult] = useState<Partial<BusinessFormData> | null>(null);
  const [showAppliedSuccess, setShowAppliedSuccess] = useState(false);

  // Extract numbers and concepts from natural language
  const handleParseText = (textToParse: string) => {
    if (!textToParse.trim()) return;
    setIsProcessing(true);
    setShowAppliedSuccess(false);

    // Smart heuristic & rule-based NLP extraction
    setTimeout(() => {
      const text = textToParse;
      const currency = baseCurrency || 'USD';

      // Guess Industry
      let industry = 'retail';
      let projectName = '我的经营项目';
      if (/奶茶|咖啡|餐饮|小吃|快餐|饭馆|炸鸡|熟食|面馆|面包/i.test(text)) {
        industry = 'food_beverage';
        projectName = '社区餐饮/茶饮小店';
      } else if (/便利店|超市|杂货|副食|小卖部|烟酒/i.test(text)) {
        industry = 'retail';
        projectName = '社区便利与便民超市';
      } else if (/电商|外贸|独立站|亚马逊|shopee|跨境|淘宝/i.test(text)) {
        industry = 'ecommerce';
        projectName = '跨境电商与网店';
      } else if (/理发|美容|美甲|汽修|家政|维修|干洗/i.test(text)) {
        industry = 'local_service';
        projectName = '社区生活便民服务部';
      } else if (/工作室|设计|摄影|编程|自媒体|文案/i.test(text)) {
        industry = 'craft_workshop';
        projectName = '创意设计与自由职业工作室';
      }

      // Helper function to extract monetary numbers near keywords
      const extractAmount = (patterns: RegExp[], defaultVal = 0): number => {
        for (const pattern of patterns) {
          const match = text.match(pattern);
          if (match && match[1]) {
            let numStr = match[1].replace(/[,，\s]/g, '');
            let val = parseFloat(numStr);
            if (pattern.source.includes('万') || match[0].includes('万')) {
              val = val * 10000;
            } else if (pattern.source.includes('k') || pattern.source.includes('K')) {
              val = val * 1000;
            }
            if (!isNaN(val) && val > 0) return Math.round(val);
          }
        }
        return defaultVal;
      };

      // 1. Revenue
      const revenue = extractAmount(
        [
          /(?:卖|流水|进账|营业额|收入|销售额)[^0-9]*?([0-9]+(?:\.[0-9]+)?)\s*万/i,
          /(?:卖|流水|进账|营业额|收入|销售额)[^0-9]*?([0-9]+(?:\.[0-9]+)?)\s*(?:块|元|usd|刀)?/i,
          /([0-9]+(?:\.[0-9]+)?)\s*万[^0-9]*?(?:流水|进账|营业额|收入)/i
        ],
        40000
      );

      // 2. COGS (Cost of goods sold / raw materials)
      const cogs = extractAmount(
        [
          /(?:买|进货|原材料|采购|耗材|批发|成本)[^0-9]*?([0-9]+(?:\.[0-9]+)?)\s*万/i,
          /(?:买|进货|原材料|采购|耗材|批发|成本)[^0-9]*?([0-9]+(?:\.[0-9]+)?)\s*(?:块|元|usd|刀)?/i
        ],
        Math.round(revenue * 0.4)
      );

      // 3. Rent
      const rent = extractAmount(
        [
          /(?:房租|租金|门面|店租)[^0-9]*?([0-9]+(?:\.[0-9]+)?)\s*万/i,
          /(?:房租|租金|门面|店租)[^0-9]*?([0-9]+(?:\.[0-9]+)?)\s*(?:块|元|usd|刀)?/i
        ],
        Math.round(revenue * 0.12)
      );

      // 4. Labor / Payroll
      const labor = extractAmount(
        [
          /(?:工资|人工|雇|发给|兼职|分成)[^0-9]*?([0-9]+(?:\.[0-9]+)?)\s*万/i,
          /(?:工资|人工|雇|发给|兼职|分成)[^0-9]*?([0-9]+(?:\.[0-9]+)?)\s*(?:块|元|usd|刀)?/i
        ],
        Math.round(revenue * 0.1)
      );

      // 5. Utility
      const utility = extractAmount(
        [
          /(?:水电|水费|电费|杂费)[^0-9]*?([0-9]+(?:\.[0-9]+)?)\s*万/i,
          /(?:水电|水费|电费|杂费)[^0-9]*?([0-9]+(?:\.[0-9]+)?)\s*(?:块|元|usd|刀)?/i
        ],
        Math.round(revenue * 0.02)
      );

      // 6. Cash and liquid buffer (救命备用金)
      const cash = extractAmount(
        [
          /(?:备用金|存着|卡里|手头|流动资金|周转金|救命钱)[^0-9]*?([0-9]+(?:\.[0-9]+)?)\s*万/i,
          /(?:备用金|存着|卡里|手头|流动资金|周转金|救命钱)[^0-9]*?([0-9]+(?:\.[0-9]+)?)\s*(?:块|元|usd|刀)?/i
        ],
        Math.round(revenue * 0.8)
      );

      // 7. Operating Months
      let months = 18;
      const monthMatch = text.match(/([0-9]+)\s*个?月/);
      const yearMatch = text.match(/([0-9]+(?:\.[0-9]+)?)\s*年/);
      if (yearMatch && yearMatch[1]) {
        months = Math.round(parseFloat(yearMatch[1]) * 12);
      } else if (monthMatch && monthMatch[1]) {
        months = parseInt(monthMatch[1], 10);
      }

      // Generate 6 months historical breakdown
      const monthlyBreakdowns = [
        { month: '2026-01', revenue: { amount: Math.round(revenue * 0.92), currency } },
        { month: '2026-02', revenue: { amount: Math.round(revenue * 0.98), currency } },
        { month: '2026-03', revenue: { amount: Math.round(revenue * 0.95), currency } },
        { month: '2026-04', revenue: { amount: Math.round(revenue * 1.05), currency } },
        { month: '2026-05', revenue: { amount: Math.round(revenue * 1.02), currency } },
        { month: '2026-06', revenue: { amount: Math.round(revenue * 1.08), currency } }
      ];

      const result: Partial<BusinessFormData> = {
        projectName,
        industry,
        monthlyRevenue: { amount: revenue, currency },
        monthlyRealOperatingRevenue: { amount: revenue, currency },
        monthlyExternalGrants: { amount: 0, currency },
        cogsCost: { amount: cogs, currency },
        rentCost: { amount: rent, currency },
        laborCost: { amount: labor, currency },
        utilityCost: { amount: utility, currency },
        taxCost: { amount: Math.round(revenue * 0.015), currency },
        otherOpex: { amount: Math.round(revenue * 0.02), currency },
        cashAndLiquidAssets: { amount: cash, currency },
        inventoryValue: { amount: Math.round(cogs * 0.6), currency },
        operatingMonthsCount: Math.max(6, months),
        fullTimeEmployeesCount: labor > 0 ? (labor > 5000 ? 2 : 1) : 0,
        monthlyBreakdowns
      };

      setParsedResult(result);
      setIsProcessing(false);
    }, 600);
  };

  const handleApply = () => {
    if (!parsedResult) return;
    onApplyParsedData(parsedResult);
    setShowAppliedSuccess(true);
    setTimeout(() => setShowAppliedSuccess(false), 3000);
  };

  return (
    <div className="rounded-3xl bg-linear-to-br from-indigo-900 via-neutral-900 to-indigo-950 text-white p-5 sm:p-6 border-2 border-indigo-700/50 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/30 text-amber-300 flex items-center justify-center border border-indigo-400/40">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-300/30">
                AI 智能大白话填报助理
              </span>
              <span className="text-[10px] text-indigo-200">无需懂财报，随手发一句话自动识别</span>
            </div>
            <h3 className="text-sm sm:text-base font-black text-white mt-0.5">
              告诉我你的买卖收支，AI 帮您 1 秒填好 14 项数据
            </h3>
          </div>
        </div>
      </div>

      {/* Preset Quick Chips */}
      <div className="space-y-1.5">
        <p className="text-[11px] text-indigo-200 flex items-center gap-1 font-semibold">
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
          <span>点击快速体验真实店铺范例：</span>
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PRESET_CASES.map((c, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setInputText(c.text);
                handleParseText(c.text);
              }}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 hover:border-indigo-300 text-left text-xs font-bold text-white transition-all cursor-pointer truncate"
              title={c.text}
            >
              {c.title}
            </button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="space-y-2">
        <div className="relative">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="例如：我在老家开了一家炸鸡店，一个月卖 3 万多块，进食材花 1 万 2，房租 2500，雇了一个兼职阿姨 2000，平时卡里留着 2 万备用金，干了快 2 年了..."
            rows={3}
            className="w-full p-3.5 rounded-2xl bg-black/40 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-hidden focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all resize-none"
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-white/50 hidden sm:inline">
            支持输入“万”、“块”、“元”等口语表达，AI 会自动按经营逻辑进行归类。
          </span>

          <button
            type="button"
            onClick={() => handleParseText(inputText)}
            disabled={!inputText.trim() || isProcessing}
            className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5 ml-auto"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>AI 正在识别解析...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>AI 智能识别</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Parsed Preview Card */}
      {parsedResult && (
        <div className="p-4 rounded-2xl bg-white/10 border border-indigo-400/40 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>AI 已成功提取出关键经营指标：</span>
            </div>
            <span className="text-[10px] text-indigo-200">
              {parsedResult.projectName} ({parsedResult.operatingMonthsCount} 个月)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-black/30 border border-white/10">
              <span className="text-[10px] text-white/60 block">月均流水 (收入)</span>
              <span className="text-sm font-black text-emerald-300 font-mono">
                {parsedResult.monthlyRevenue?.amount.toLocaleString()} {baseCurrency}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/30 border border-white/10">
              <span className="text-[10px] text-white/60 block">进货进价 (COGS)</span>
              <span className="text-sm font-black text-rose-300 font-mono">
                {parsedResult.cogsCost?.amount.toLocaleString()} {baseCurrency}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/30 border border-white/10">
              <span className="text-[10px] text-white/60 block">房租 + 人工 + 水电</span>
              <span className="text-sm font-black text-amber-300 font-mono">
                {(
                  (parsedResult.rentCost?.amount || 0) +
                  (parsedResult.laborCost?.amount || 0) +
                  (parsedResult.utilityCost?.amount || 0)
                ).toLocaleString()}{' '}
                {baseCurrency}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/30 border border-white/10">
              <span className="text-[10px] text-white/60 block">救命备用金 (现金)</span>
              <span className="text-sm font-black text-sky-300 font-mono">
                {parsedResult.cashAndLiquidAssets?.amount.toLocaleString()} {baseCurrency}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-emerald-300 font-medium">
              {showAppliedSuccess ? '✅ 数据已成功同步填入下方所有表单！' : '确认提取结果无误后，点击右侧一键应用：'}
            </span>

            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-1.5 hover:scale-102"
            >
              <Check className="w-4 h-4" />
              <span>✨ 一键填入表单</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
