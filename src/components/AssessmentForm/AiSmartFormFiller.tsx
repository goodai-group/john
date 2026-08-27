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
    title: '🩺 东南亚社区爱心义诊所',
    text: '我们在工场开办便民爱心卫生所，帮助当地贫困村民看病，每月门诊加平价药品收入约 3 万 8，采购急救药品和注射耗材花 1 万 5，诊所租金 3500，雇 2 位本地助理护士发 4800 工资，平时备着 4 万应急备用金，运营了 24 个月。'
  },
  {
    title: '📚 中亚语言文化与青年辅导中心',
    text: '我们在中亚办语言学习与青年辅导中心，教授英语和实用技能，每月学费收入 3 万 5，教材复印茶水耗材 3200，教室租金 4500，雇当地老师发 5000，水电 800，手头备用金 4 万，运营了 18 个月。'
  },
  {
    title: '🚐 非洲乡村流动医疗车巡诊',
    text: '我们在偏远乡村开展流动医疗巡诊，每月接收就诊及爱心补贴 2 万 9，采购常规药和化验试剂 1 万 1，油费与驻点租金 3000，发 2 位同工津贴 4200，留有 3 万 5 应急金，干了 20 个月。'
  },
  {
    title: '🛠️ 贫困社区青年计算机与技能学校',
    text: '我们为贫困社区青年提供电脑IT和电工缝纫职业培训，每月学费 4 万 6，实训电脑配件与耗材 1 万 2，教学场地租金 5500，雇 3 位培训老师发 6000 工资，账上留存 5 万备用金，办了 30 个月。'
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
    <div className="rounded-3xl bg-linear-to-br from-indigo-900 via-neutral-900 to-indigo-950 text-white p-6 sm:p-7 border-2 border-indigo-700/60 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/30 text-amber-300 flex items-center justify-center border border-indigo-400/40 shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300 bg-amber-400/20 px-2.5 py-0.5 rounded-full border border-amber-300/40">
                ⚡ 三分钟小白看懂 · AI 口语随手填
              </span>
              <span className="text-xs text-indigo-200 font-bold">不用懂财务，打字/语音发一段大白话即可</span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
              告诉我您的诊所或培训收支，AI 帮您自动识别并填好
            </h3>
          </div>
        </div>
      </div>

      {/* Preset Quick Chips */}
      <div className="space-y-2">
        <p className="text-xs sm:text-sm text-indigo-200 flex items-center gap-1.5 font-bold">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          <span>点击快速体验医疗与教育服事实测样例（一眼看懂）：</span>
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {PRESET_CASES.map((c, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setInputText(c.text);
                handleParseText(c.text);
              }}
              className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 hover:border-indigo-300 text-left text-xs sm:text-sm font-bold text-white transition-all cursor-pointer truncate"
              title={c.text}
            >
              {c.title}
            </button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="space-y-2.5">
        <div className="relative">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="例如：我们在工场开便民义诊所，一个月门诊和药费收入 3 万 8，进药和耗材花 1 万 5，场地租金 3500，雇 2 位本地助理护士发 4800，手头常备 4 万急用钱，干了快 2 年了..."
            rows={3}
            className="w-full p-4 rounded-2xl bg-black/40 border border-white/25 text-white placeholder-white/50 text-sm sm:text-base focus:outline-hidden focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400 transition-all resize-none leading-relaxed"
          />
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-xs text-white/70 font-medium">
            💡 支持输入“万”、“块”、“元”等口语表达，AI 会自动按工场服事常识精准拆解。
          </span>

          <button
            type="button"
            onClick={() => handleParseText(inputText)}
            disabled={!inputText.trim() || isProcessing}
            className="px-5 py-2.5 rounded-2xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 text-white text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer flex items-center gap-2 ml-auto"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>AI 正在识别解析...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-amber-300" />
                <span>AI 智能大白话识别</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Parsed Preview Card */}
      {parsedResult && (
        <div className="p-5 rounded-2xl bg-white/10 border border-indigo-400/50 space-y-3.5 animate-in fade-in">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-amber-300">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>AI 已成功提取出关键开店指标：</span>
            </div>
            <span className="text-xs text-indigo-200 font-bold">
              {parsedResult.projectName} ({parsedResult.operatingMonthsCount} 个月)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-black/35 border border-white/15">
              <span className="text-xs text-white/70 block mb-1">月均流水 (总进账)</span>
              <span className="text-base sm:text-lg font-black text-emerald-300 font-mono">
                {parsedResult.monthlyRevenue?.amount.toLocaleString()} {baseCurrency}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-black/35 border border-white/15">
              <span className="text-xs text-white/70 block mb-1">进货进价 (买原料)</span>
              <span className="text-base sm:text-lg font-black text-rose-300 font-mono">
                {parsedResult.cogsCost?.amount.toLocaleString()} {baseCurrency}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-black/35 border border-white/15">
              <span className="text-xs text-white/70 block mb-1">房租 + 人工 + 水电</span>
              <span className="text-base sm:text-lg font-black text-amber-300 font-mono">
                {(
                  (parsedResult.rentCost?.amount || 0) +
                  (parsedResult.laborCost?.amount || 0) +
                  (parsedResult.utilityCost?.amount || 0)
                ).toLocaleString()}{' '}
                {baseCurrency}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-black/35 border border-white/15">
              <span className="text-xs text-white/70 block mb-1">救命备用金 (现金)</span>
              <span className="text-base sm:text-lg font-black text-sky-300 font-mono">
                {parsedResult.cashAndLiquidAssets?.amount.toLocaleString()} {baseCurrency}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
            <span className="text-xs sm:text-sm text-emerald-300 font-bold">
              {showAppliedSuccess ? '✅ 数据已成功同步填入下方所有表单！' : '确认提取结果无误后，点击右侧一键应用：'}
            </span>

            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs sm:text-sm font-black shadow-md shadow-emerald-500/30 transition-all cursor-pointer flex items-center gap-2 hover:scale-102"
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
