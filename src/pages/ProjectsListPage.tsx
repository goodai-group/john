import React from 'react';
import {
  BusinessFormData,
  AssessmentReport,
  Language
} from '../types';
import {
  Plus,
  FileText,
  Trash2,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Calendar,
  Layers,
  Database,
  CloudCheck,
  AlertCircle
} from 'lucide-react';
import { formatMoney } from '../lib/currencies';

interface ProjectsListProps {
  projects: BusinessFormData[];
  reports: AssessmentReport[];
  language: Language;
  onNewProject: () => void;
  onSelectProject: (id: string) => void;
  onSelectReport: (reportId: string) => void;
  onDeleteProject: (id: string) => void;
  isSupabaseConfigured: boolean;
  onTriggerSync: () => void;
}

export const ProjectsListPage: React.FC<ProjectsListProps> = ({
  projects,
  reports,
  language,
  onNewProject,
  onSelectProject,
  onSelectReport,
  onDeleteProject,
  isSupabaseConfigured,
  onTriggerSync
}) => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header Bento Box */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-neutral-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
              PROJECTS HUB
            </span>
          </div>
          <h2 className="text-xl font-black text-neutral-900 tracking-tight">我的申报项目与历史评估</h2>
          <p className="text-xs text-neutral-500 font-medium mt-0.5">
            支持离线本地存储与多版本追溯；可随时彻底删除任何项目数据。
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onNewProject}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl text-xs font-bold shadow-md shadow-neutral-900/10 border-2 border-neutral-800 transition-all cursor-pointer hover:scale-102"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>新建商业自测项目</span>
          </button>
        </div>
      </div>

      {/* Cloud Sync Status Bento Pill */}
      <div className="p-4 rounded-3xl bg-neutral-100 border-2 border-neutral-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2.5 text-neutral-700 font-medium">
          <Database className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>
            存储模式：<strong className="text-neutral-900 font-bold">本地离线优先 (Offline-First)</strong>
            {isSupabaseConfigured ? ' + 云端双向同步已就绪' : '（尚未配置 Supabase 密钥，数据安全保存在本浏览器缓存中）'}
          </span>
        </div>

        <button
          onClick={onTriggerSync}
          className="flex items-center space-x-1 px-3.5 py-1.5 rounded-xl bg-white border-2 border-neutral-200 hover:bg-neutral-50 text-neutral-800 font-bold shadow-xs transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>检查并同步数据</span>
        </button>
      </div>

      {/* Projects List Grid */}
      {projects.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border-2 border-neutral-200 shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100 shadow-xs">
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-black text-neutral-900">暂无申报项目</h3>
            <p className="text-xs text-neutral-500 font-medium max-w-md mx-auto mt-1">
              点击下方按钮开始您的第一次商业模型自测，AI 将在 10 秒内为您生成客观体检报告。
            </p>
          </div>
          <button
            onClick={onNewProject}
            className="inline-flex items-center space-x-1.5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>立即创建自测</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((proj) => {
            const projectReports = reports.filter((r) => r.projectId === proj.id);
            const latestReport = projectReports[0];

            return (
              <div
                key={proj.id}
                className="bg-white rounded-3xl p-6 border-2 border-neutral-200 shadow-xs hover:border-neutral-300 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center space-x-1.5 mb-1.5">
                        {proj.isSensitiveRegion ? (
                          <span className="text-[10px] bg-amber-50 text-amber-800 font-bold px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center space-x-1">
                            <ShieldAlert className="w-3 h-3 text-amber-600" />
                            <span>敏感脱敏</span>
                          </span>
                        ) : (
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full border border-indigo-100">
                            常规模式
                          </span>
                        )}
                        <span className="text-[10px] text-neutral-400 font-medium">
                          {new Date(proj.updatedAt).toLocaleDateString()}
                        </span>
                      </div>

                      <h3 className="text-base font-black text-neutral-900 leading-snug">
                        {proj.projectName || '未命名自测项目'}
                      </h3>
                      <p className="text-xs text-neutral-500 font-medium mt-0.5">
                        {proj.businessType || '海外小微经营'} ｜ 币种：{proj.baseCurrency}
                      </p>
                    </div>

                    {latestReport ? (
                      <div className="text-center p-3 rounded-2xl bg-neutral-900 text-white border border-neutral-800 shadow-xs min-w-[64px]">
                        <div className="text-xl font-mono font-black leading-none">
                          {latestReport.totalScore}
                        </div>
                        <span className="text-[9px] font-bold text-amber-400 block mt-1 tracking-wider uppercase">
                          {latestReport.tier}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs bg-neutral-100 text-neutral-600 px-3 py-1 rounded-xl font-bold border border-neutral-200">
                        草稿待评
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-neutral-700 bg-neutral-50 p-3 rounded-2xl border border-neutral-100">
                    <div>
                      <span className="text-neutral-400 block text-[10px] font-bold uppercase mb-0.5">月均总流水:</span>
                      <span className="font-mono font-bold text-neutral-900">
                        {formatMoney(proj.monthlyRevenue.amount, proj.monthlyRevenue.currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[10px] font-bold uppercase mb-0.5">凭证方式:</span>
                      <span className="font-bold text-neutral-800">
                        {proj.proofType === 'none' ? '纯手动无凭证' : proj.proofType}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-neutral-100 text-xs">
                  <button
                    onClick={() => onDeleteProject(proj.id)}
                    className="text-neutral-400 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                    title="删除此项目"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onSelectProject(proj.id)}
                      className="px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold rounded-xl border border-neutral-200 transition-colors cursor-pointer"
                    >
                      编辑申报
                    </button>

                    {latestReport && (
                      <button
                        onClick={() => onSelectReport(latestReport.id)}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center space-x-1"
                      >
                        <span>查看诊断报告</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
