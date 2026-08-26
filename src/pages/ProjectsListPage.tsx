import React from 'react';
import {
  BusinessFormData,
  AssessmentReport,
  Language,
  AppUser
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
  AlertCircle,
  UserCheck,
  Lock
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
  isCloudDatabaseReady: boolean;
  onTriggerSync: () => void;
  currentUser?: AppUser | null;
  onLoginWithGoogle?: () => void;
}

export const ProjectsListPage: React.FC<ProjectsListProps> = ({
  projects,
  reports,
  language,
  onNewProject,
  onSelectProject,
  onSelectReport,
  onDeleteProject,
  isCloudDatabaseReady,
  onTriggerSync,
  currentUser,
  onLoginWithGoogle
}) => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header Bento Box */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-neutral-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
              PROJECTS & CLOUD HUB
            </span>
          </div>
          <h2 className="text-xl font-black text-neutral-900 tracking-tight">我的申报项目与历史评估</h2>
          <p className="text-xs text-neutral-500 font-medium mt-0.5">
            数据已接入云端 Firestore 数据库；登录 Google 账号后可跨设备随时找回所有历史评估与多版本报告。
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

      {/* User Auth & Cloud Sync Status Banner */}
      <div className={`p-4 sm:p-5 rounded-3xl border-2 flex flex-wrap items-center justify-between gap-3 text-xs ${
        currentUser
          ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
          : 'bg-indigo-50/60 border-indigo-200 text-indigo-950'
      }`}>
        <div className="flex items-center space-x-3">
          {currentUser ? (
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
              <Database className="w-4 h-4" />
            </div>
          )}
          <div>
            <div className="font-bold flex items-center gap-2">
              <span>{currentUser ? `已登录 Google 账号：${currentUser.displayName || currentUser.email}` : '未绑定 Google 账号 (当前保存在本地与公共云)'}</span>
              {currentUser && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                  下次登录随时找回
                </span>
              )}
            </div>
            <p className="text-[11px] opacity-80 mt-0.5">
              {currentUser
                ? '您的所有商业自测表单与 5 维雷达体检报告已与您的 Google 账户自动双向同步。'
                : '一键使用 Google 登录，将当前报告永久关联至您的专属云端空间，换手机或电脑随时查看。'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!currentUser && onLoginWithGoogle && (
            <button
              onClick={onLoginWithGoogle}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white border-2 border-indigo-300 hover:border-indigo-500 text-indigo-900 font-bold shadow-xs transition-all cursor-pointer hover:scale-102"
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>使用 Google 登录</span>
            </button>
          )}

          <button
            onClick={onTriggerSync}
            className="flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-white border-2 border-neutral-200 hover:bg-neutral-50 text-neutral-800 font-bold shadow-xs transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
            <span>云端双向同步</span>
          </button>
        </div>
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
