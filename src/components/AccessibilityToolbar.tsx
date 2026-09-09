import React, { useState } from 'react';
import { X, Type, Eye, Mic, MicOff, Check, Sparkles, Volume2 } from 'lucide-react';
import { Language } from '../types';

interface AccessibilityProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  largeFont: boolean;
  onToggleLargeFont: () => void;
  highContrast: boolean;
  onToggleHighContrast: () => void;
  lowBandwidth: boolean;
  onToggleLowBandwidth: () => void;
  onVoiceResult?: (text: string) => void;
}

export const AccessibilityToolbar: React.FC<AccessibilityProps> = ({
  isOpen,
  onClose,
  language,
  largeFont,
  onToggleLargeFont,
  highContrast,
  onToggleHighContrast,
  lowBandwidth,
  onToggleLowBandwidth
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartVoice = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceStatus('当前浏览器不支持原生语音识别，已为您切换为快捷语音试听模拟模式。');
      setIsRecording(true);
      setTimeout(() => {
        setVoiceTranscript('月营业额五万八千元');
        setIsRecording(false);
      }, 2000);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = language === 'zh' ? 'zh-CN' : 'en-US';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsRecording(true);
        setVoiceStatus('正在倾听... 请说出金额或文字（如“三万五千”或“房租四千”）');
      };

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setVoiceTranscript(text);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech error:', event.error);
        setIsRecording(false);
        setVoiceStatus(`语音识别提示: ${event.error || '未检测到声音'}`);
      };

      recognition.onend = () => {
        setIsRecording(false);
        setVoiceStatus('语音录入完毕！');
      };

      recognition.start();
    } catch (e: any) {
      setIsRecording(false);
      setVoiceStatus('启动麦克风失败，请检查麦克风权限设置。');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-slate-800 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {language === 'zh' ? '低数字素养与无障碍操作辅助' : 'Accessibility & Usability Support'}
            </h2>
            <p className="text-xs text-slate-500">
              {language === 'zh' ? '大字号 · 高对比 · 弱网精简 · 语音录入辅助' : 'Large Fonts, High Contrast, Low-Bandwidth Mode'}
            </p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          {/* Large Font Setting */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                <Type className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">大字号与大点击区域</p>
                <p className="text-xs text-slate-500">将文字放大 120%，加大按钮点击热区，方便阅读与点击</p>
              </div>
            </div>
            <button
              onClick={onToggleLargeFont}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                largeFont
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {largeFont ? '已开启' : '关闭中'}
            </button>
          </div>

          {/* High Contrast */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">高清晰高对比度模式</p>
                <p className="text-xs text-slate-500">强化边框线与文字反差，适合强光室外或视力不便用户</p>
              </div>
            </div>
            <button
              onClick={onToggleHighContrast}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                highContrast
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {highContrast ? '已开启' : '关闭中'}
            </button>
          </div>

          {/* Low Bandwidth Mode */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">轻量传输模式（弱网省流）</p>
                <p className="text-xs text-slate-500">关闭所有外部动画与大文件依赖，优先保障核心填报顺畅</p>
              </div>
            </div>
            <button
              onClick={onToggleLowBandwidth}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                lowBandwidth
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {lowBandwidth ? '已开启' : '关闭中'}
            </button>
          </div>

          {/* Voice Input Helper Tool */}
          <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sky-900 font-semibold text-xs">
                <Volume2 className="w-4 h-4 text-sky-600" />
                <span>语音说出金额转数字辅助 (Speech-to-Number)</span>
              </div>
              <button
                onClick={handleStartVoice}
                disabled={isRecording}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isRecording
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-sky-600 hover:bg-sky-500 text-white shadow-xs'
                }`}
              >
                {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                <span>{isRecording ? '录音中...' : '点击说出金额'}</span>
              </button>
            </div>
            {voiceStatus && (
              <p className="text-xs text-sky-700 mb-2 italic bg-white/70 p-2 rounded border border-sky-200/50">
                {voiceStatus}
              </p>
            )}
            {voiceTranscript && (
              <div className="flex items-center justify-between p-2 rounded bg-white border border-sky-200">
                <span className="text-xs font-medium text-slate-800">识别结果: {voiceTranscript}</span>
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                  <Check className="w-3 h-3" /> 可在表单各输入框右侧直接使用麦克风输入
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            完成设置
          </button>
        </div>
      </div>
    </div>
  );
};
