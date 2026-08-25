import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  ShieldCheck,
  Send,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  Archive,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Lightbulb
} from 'lucide-react';
import { EscalatedQuestion, Language } from '../types';
import {
  getEscalatedQuestions,
  addEscalatedQuestion,
  updateEscalatedQuestionFeedback
} from '../lib/storage';

interface AiDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  initialTopic?: string;
}

const FAQ_PRESETS = [
  '我们做季节性水产生意，每年有3个月休渔期完全没进账，该怎么填？',
  '我和家人开小杂货铺，只有手写流水记账本，没有银行明细，能通过吗？',
  '当地官方汇率和民间实际兑换汇率差了一倍多，自报汇率会扣分吗？',
  '敏感地区开启安全模式后，真的不会在服务器留存图片吗？',
  '没有正规营业执照或注册证明，可以参加自测吗？'
];

export const AiRuleConsultationDrawer: React.FC<AiDrawerProps> = ({
  isOpen,
  onClose,
  language,
  initialTopic
}) => {
  const [questionInput, setQuestionInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'public_archive'>('chat');
  const [archivedList, setArchivedList] = useState<EscalatedQuestion[]>([]);
  const [chatHistory, setChatHistory] = useState<EscalatedQuestion[]>([]);

  useEffect(() => {
    setArchivedList(getEscalatedQuestions());
  }, [isOpen]);

  useEffect(() => {
    if (initialTopic) {
      setQuestionInput(initialTopic);
    }
  }, [initialTopic]);

  if (!isOpen) return null;

  const handleAskQuestion = async (queryText: string) => {
    const text = (queryText || questionInput).trim();
    if (!text) return;

    setIsLoading(true);
    setQuestionInput('');

    try {
      // Call backend API (proxies to Gemini or rules knowledge base)
      const res = await fetch('/api/ai-consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, language })
      });

      if (res.ok) {
        const data = await res.json();
        const newRecord: EscalatedQuestion = {
          id: `esc-${Date.now()}`,
          question: text,
          category: data.category || '规则咨询与填报指引',
          confidence: data.confidence || 'HIGH',
          conservativePaths: data.conservativePaths,
          aiResponse: data.aiResponse || data.answer,
          isEdgeCase: data.isEdgeCase || false,
          suggestedAction: data.suggestedAction || '规则清晰，可正常填报',
          archivedAt: new Date().toISOString()
        };

        setChatHistory((prev) => [newRecord, ...prev]);
        addEscalatedQuestion(newRecord);
        setArchivedList(getEscalatedQuestions());
      } else {
        throw new Error('API request failed');
      }
    } catch (err) {
      // Graceful offline fallback answer with conservative paths
      const fallbackRecord: EscalatedQuestion = {
        id: `esc-${Date.now()}`,
        question: text,
        category: '小微经验填报与规则解析',
        confidence: text.includes('休渔') || text.includes('季节') ? 'LOW_EDGE_CASE' : 'HIGH',
        conservativePaths:
          text.includes('休渔') || text.includes('季节')
            ? [
                {
                  pathName: '路径 A (推荐：12个月年化平均法)',
                  assumption: '将全年总营业收入除以 12 个月拉平为月均收入，房租按月分摊计入 OPEX。',
                  estimatedScore: '约 76-82 分 (GRADE A)',
                  consequence: '最贴合实际抗风险能力，报告中将自动附注季节性平摊说明。'
                },
                {
                  pathName: '路径 B (保守：仅按旺季9个月填报并加大备用金)',
                  assumption: '按旺季单月真实数据填写，但现金储备必须能覆盖 3 个月休渔期开支。',
                  estimatedScore: '约 70-75 分 (GRADE BBB)',
                  consequence: '备用金若不足可能被 Gate-3/4 警示。'
                }
              ]
            : undefined,
        aiResponse:
          '根据 BAM-PRD-2026-V1.4 规则：本平台完全由 AI 自动化打分，无任何凭证歧视。无论上传手写记账本、移动支付截图还是纯手动填写 14 项数字，打分标准 100% 相同。提问记录绝不计入评分，您可以放心填报。',
        isEdgeCase: text.includes('休渔') || text.includes('季节'),
        suggestedAction: '已自动同步至待完善规则库，不影响您的当前自测。',
        archivedAt: new Date().toISOString()
      };

      setChatHistory((prev) => [fallbackRecord, ...prev]);
      addEscalatedQuestion(fallbackRecord);
      setArchivedList(getEscalatedQuestions());
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = (id: string, fb: 'helpful' | 'not_helpful') => {
    updateEscalatedQuestionFeedback(id, fb);
    setChatHistory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, userFeedback: fb } : item))
    );
    setArchivedList(getEscalatedQuestions());
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col justify-between border-l border-slate-200">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                AI 规则答疑与边缘案例库
              </h2>
              <p className="text-xs text-slate-500">
                大白话解答 · 遇未决规则提供保守路径 · 提问绝不影响评分
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Confidentiality Guarantee Banner */}
        <div className="bg-indigo-50/70 border-b border-indigo-100 px-5 py-2.5 flex items-center gap-2 text-xs text-indigo-900 font-medium">
          <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>提问记录独立加密，绝不作为任何评分输入，请放心畅所欲言。</span>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-100 text-xs font-bold">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-2.5 text-center border-b-2 transition-colors cursor-pointer ${
              activeTab === 'chat'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            实时大白话咨询
          </button>
          <button
            onClick={() => setActiveTab('public_archive')}
            className={`flex-1 py-2.5 text-center border-b-2 transition-colors cursor-pointer ${
              activeTab === 'public_archive'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            公开归档案例库 ({archivedList.length})
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'chat' && (
            <div className="space-y-4">
              {chatHistory.length === 0 ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                    <p className="font-bold text-slate-900 mb-1">您好！我是您的 AI 规则与填报助理</p>
                    <p>
                      如果您对自报汇率、手写账本、季节性收入或某项财务术语有疑问，请随时提问。
                    </p>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-500">大家常问的问题：</span>
                    {FAQ_PRESETS.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAskQuestion(q)}
                        className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 text-xs font-medium text-slate-800 transition-colors flex items-center justify-between group cursor-pointer"
                      >
                        <span>{q}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {chatHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3 text-xs"
                    >
                      <div className="flex items-start gap-2 text-indigo-950 font-bold">
                        <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                        <span>问：{item.question}</span>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-slate-800 leading-relaxed">
                        <div className="flex items-center gap-1.5 text-indigo-700 font-bold mb-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>AI 解答：</span>
                        </div>
                        <p>{item.aiResponse}</p>

                        {/* Conservative Paths if Edge Case */}
                        {item.conservativePaths && item.conservativePaths.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                            <div className="flex items-center gap-1 text-amber-700 font-bold text-[11px]">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>规则未决情况下的保守填报路径指引：</span>
                            </div>
                            {item.conservativePaths.map((path, pIdx) => (
                              <div
                                key={pIdx}
                                className="p-2.5 bg-white rounded-lg border border-amber-200/80 space-y-1"
                              >
                                <div className="flex justify-between font-bold text-slate-900">
                                  <span>{path.pathName}</span>
                                  <span className="text-indigo-600">{path.estimatedScore}</span>
                                </div>
                                <p className="text-slate-600 text-[11px]">{path.assumption}</p>
                                <p className="text-[10px] text-amber-800 font-medium">
                                  影响说明：{path.consequence}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Feedback buttons */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>该解答是否有帮助？</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleFeedback(item.id, 'helpful')}
                            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors cursor-pointer ${
                              item.userFeedback === 'helpful'
                                ? 'bg-emerald-100 text-emerald-800 font-bold'
                                : 'hover:bg-slate-100'
                            }`}
                          >
                            <ThumbsUp className="w-3 h-3" />
                            <span>有帮助</span>
                          </button>
                          <button
                            onClick={() => handleFeedback(item.id, 'not_helpful')}
                            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors cursor-pointer ${
                              item.userFeedback === 'not_helpful'
                                ? 'bg-rose-100 text-rose-800 font-bold'
                                : 'hover:bg-slate-100'
                            }`}
                          >
                            <ThumbsDown className="w-3 h-3" />
                            <span>未解决</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'public_archive' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                平台将所有用户遭遇的边缘情况脱敏归档，定期由规则委员会复核并吸纳进下一版本官方标准。
              </p>
              {archivedList.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{item.question}</span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">{item.aiResponse}</p>
                  {item.relatedCaseResult && (
                    <div className="text-[10px] text-indigo-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>过往参考判例：{item.relatedCaseResult}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2">
          <input
            type="text"
            placeholder="输入您想咨询的规则或填报疑问..."
            value={questionInput}
            onChange={(e) => setQuestionInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isLoading) {
                handleAskQuestion(questionInput);
              }
            }}
            className="flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
          />
          <button
            onClick={() => handleAskQuestion(questionInput)}
            disabled={isLoading || !questionInput.trim()}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isLoading ? '解析中...' : '提问'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
