import React, { useState, useEffect, useRef } from 'react';
import { Heart, X, AlertTriangle, ExternalLink } from 'lucide-react';
import firebaseConfig from '../firebase-applet-config.json';
import {
  BusinessFormData,
  AssessmentReport,
  Language,
  ActiveTab,
  AppUser
} from './types';
import { Navbar } from './components/Navbar';
import { FeeTransparencyModal } from './components/FeeTransparencyModal';
import { AppGuideModal } from './components/AppGuideModal';
import { AccessibilityToolbar } from './components/AccessibilityToolbar';
import { AiRuleConsultationDrawer } from './components/AiRuleConsultationDrawer';
import { ScoringSimulator } from './components/ScoringSimulator';
import { PublicScoringStandards } from './components/PublicScoringStandards';
import { AssessmentForm } from './components/AssessmentForm/AssessmentForm';
import { AssessmentReportView } from './components/AssessmentReport/AssessmentReportView';
import { ProjectsListPage } from './pages/ProjectsListPage';
import {
  loadStoredProjects,
  saveStoredProjects,
  loadStoredReports,
  saveStoredReports,
  saveActiveDraft,
  syncWithCloudDatabase,
  saveProject,
  saveReport
} from './lib/storage';
import {
  isCloudDatabaseAvailable,
  signInWithGoogle,
  logoutGoogleUser,
  subscribeToAuthChanges
} from './lib/firebase';
import { calculateAssessmentReport } from './lib/scoringEngine';
import { SAMPLE_PROJECT, INITIAL_SAMPLE_REPORT } from './lib/seedData';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('form');
  const [language, setLanguage] = useState<Language>('zh');

  // User Authentication State
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Modals & Drawers state
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [isAppGuideOpen, setIsAppGuideOpen] = useState(false);
  const [isAccessibilityOpen, setIsAccessibilityOpen] = useState(false);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [aiInitialTopic, setAiInitialTopic] = useState<string | undefined>(undefined);
  // 生成报告过场（让"算完了"有仪式感，乔布斯式体验）
  const [isGenerating, setIsGenerating] = useState(false);

  // Accessibility settings
  const [largeFont, setLargeFont] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [lowBandwidth, setLowBandwidth] = useState(false);

  // Projects and Reports state with seed fallback
  const [projects, setProjects] = useState<BusinessFormData[]>(() => {
    const local = loadStoredProjects();
    if (local.length > 0) return local;
    saveStoredProjects([SAMPLE_PROJECT]);
    return [SAMPLE_PROJECT];
  });

  const [reports, setReports] = useState<AssessmentReport[]>(() => {
    const local = loadStoredReports();
    if (local.length > 0) return local;
    saveStoredReports([INITIAL_SAMPLE_REPORT]);
    return [INITIAL_SAMPLE_REPORT];
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(SAMPLE_PROJECT.id);
  const [activeReportId, setActiveReportId] = useState<string>(INITIAL_SAMPLE_REPORT.id);

  // 顶部的状态横幅
  // kind: 'info' 普通提示（4 秒后自动消失），'error' 错误（不会自动消失，需手动关闭）
  type Banner = {
    kind: 'info' | 'error';
    text: string;
    action?: { href: string; label: string };
  };
  const [banner, setBanner] = useState<Banner | null>(null);
  const bannerTimerRef = useRef<number | null>(null);

  const pushBanner = (next: Banner | null, autoDismissMs?: number) => {
    if (bannerTimerRef.current) {
      window.clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = null;
    }
    setBanner(next);
    // info 类才自动消失，error 必须用户手动关，避免一闪而过看不清
    if (next && next.kind === 'info' && autoDismissMs && autoDismissMs > 0) {
      bannerTimerRef.current = window.setTimeout(() => setBanner(null), autoDismissMs);
    }
  };
  const dismissBanner = () => {
    if (bannerTimerRef.current) {
      window.clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = null;
    }
    setBanner(null);
  };
  // Firebase 控制台 Authentication Settings 直达链接
  const firebaseAuthSettingsUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`;
  const firebaseAuthProvidersUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`;

  // Subscribe to Firebase Google Auth state
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (user) => {
      setCurrentUser(user);
      if (user) {
        pushBanner(
          { kind: 'info', text: `欢迎回来，${user.displayName || user.email}！正在载入您的专属云端档案...` }
        );
        try {
          await syncWithCloudDatabase(user);
          const refreshedProjects = loadStoredProjects();
          const refreshedReports = loadStoredReports();
          setProjects(refreshedProjects);
          setReports(refreshedReports);
          pushBanner(
            { kind: 'info', text: `已同步 ${user.displayName || user.email} 的专属云端自测档案` },
            4000
          );
        } catch (e: any) {
          pushBanner({
            kind: 'error',
            text: `云端同步失败：${e?.message || '已自动使用本地数据'}`
          });
        }
      }
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Find active project & active report
  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];
  const activeReport =
    reports.find((r) => r.id === activeReportId) ||
    reports.find((r) => r.projectId === activeProjectId) ||
    reports[0];

  // All version history for the current active project
  const projectVersions = reports
    .filter((r) => r.projectId === activeReport?.projectId)
    .sort((a, b) => b.version - a.version);

  // Google Login Action
  const handleLoginWithGoogle = async () => {
    try {
      setIsSigningIn(true);
      const user = await signInWithGoogle();
      if (user) {
        setCurrentUser(user);
        pushBanner({ kind: 'info', text: `Google 登录成功！已与 ${user.email} 绑定` }, 4000);
        await syncWithCloudDatabase(user);
        const refreshedProjects = loadStoredProjects();
        const refreshedReports = loadStoredReports();
        setProjects(refreshedProjects);
        setReports(refreshedReports);
      }
    } catch (err: any) {
      const code = err?.code || '';
      const msg = err?.message || '';
      if (
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request' ||
        msg.includes('popup-closed-by-user') ||
        msg.includes('cancelled-popup-request')
      ) {
        // 用户主动关闭了登录窗口，显示温和的引导提示（普通信息，4s 自动消失）
        pushBanner(
          {
            kind: 'info',
            text: '您已关闭 Google 登录窗口。仍可正常使用本地保存，或随时再次点击登录。'
          },
          4000
        );
      } else if (code === 'auth/popup-blocked' || msg.includes('popup-blocked')) {
        pushBanner(
          {
            kind: 'info',
            text: '浏览器阻止了登录弹出窗口，请在地址栏允许弹窗后重试。'
          },
          5000
        );
      } else if (
        code === 'auth/unauthorized-domain' ||
        msg.includes('unauthorized-domain') ||
        msg.includes('not authorized for OAuth')
      ) {
        // 当前域名未加入 Firebase 授权域名列表（本地开发常见：localhost 未授权）
        pushBanner({
          kind: 'error',
          text:
            '登录被 Firebase 拦截：当前访问域名未加入授权名单。请在 Firebase 控制台 → Authentication → Settings → Authorized domains 中添加 localhost（若用 IP 访问也要加上 127.0.0.1），保存后回到本页刷新即可重新登录。',
          action: { href: firebaseAuthSettingsUrl, label: '打开 Firebase 设置' }
        });
      } else if (code === 'auth/operation-not-allowed' || msg.includes('operation-not-allowed')) {
        pushBanner({
          kind: 'error',
          text:
            'Google 登录方式尚未开启：请在 Firebase 控制台 → Authentication → Sign-in method 中启用 Google 登录，保存后重试。',
          action: { href: firebaseAuthProvidersUrl, label: '打开登录方式设置' }
        });
      } else {
        pushBanner({
          kind: 'error',
          text: `登录失败：${msg || '无法连接 Google 登录服务，已自动使用本地保存模式'}`
        });
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  // Logout Action
  const handleLogout = async () => {
    try {
      await logoutGoogleUser();
      setCurrentUser(null);
      pushBanner({ kind: 'info', text: '已安全退出 Google 登录。' }, 3000);
    } catch (err) {
      console.warn('Logout error:', err);
    }
  };

  // Submit form handler
  const handleFormSubmit = (submittedData: BusinessFormData) => {
    // 1. 先进入"正在生成报告"过场，让结果出炉有仪式感
    setIsGenerating(true);

    // 用 setTimeout 把真实计算与导航包起来，制造一段可感知的"生成"过程
    setTimeout(() => {
      // 2. Calculate latest version report
      const existingReportsForProj = reports.filter((r) => r.projectId === submittedData.id);
      // 取历史最大版本号 + 1，避免旧数据中版本号重复导致列表 key 冲突
      const nextVersion = existingReportsForProj.reduce((max, r) => Math.max(max, r.version || 0), 0) + 1;
      const projectWithVersion = {
        ...submittedData,
        version: nextVersion,
        ...(currentUser ? { ownerUid: currentUser.uid, ownerEmail: currentUser.email || submittedData.ownerEmail } : {})
      };

      const newReport = calculateAssessmentReport(projectWithVersion);
      if (currentUser) {
        newReport.ownerUid = currentUser.uid;
        newReport.ownerEmail = currentUser.email || undefined;
      }

      // 3. Update projects list
      const updatedProjects = [
        projectWithVersion,
        ...projects.filter((p) => p.id !== submittedData.id)
      ];
      setProjects(updatedProjects);
      saveStoredProjects(updatedProjects);
      saveProject(projectWithVersion);

      // 4. Update reports list
      const updatedReports = [newReport, ...reports];
      setReports(updatedReports);
      saveStoredReports(updatedReports);
      saveReport(newReport);

      // 5. Navigate to report view
      setActiveProjectId(submittedData.id);
      setActiveReportId(newReport.id);
      setActiveTab('report');
      setIsGenerating(false);
    }, 1100);
  };

  // Delete project and all associated reports (P0 data withdrawal)
  const handleDeleteProject = (projId: string) => {
    const updatedProjects = projects.filter((p) => p.id !== projId);
    const updatedReports = reports.filter((r) => r.projectId !== projId);

    setProjects(updatedProjects);
    saveStoredProjects(updatedProjects);
    setReports(updatedReports);
    saveStoredReports(updatedReports);

    if (activeProjectId === projId) {
      if (updatedProjects.length > 0) {
        setActiveProjectId(updatedProjects[0].id);
        const related = updatedReports.find((r) => r.projectId === updatedProjects[0].id);
        if (related) setActiveReportId(related.id);
      }
    }
    setActiveTab('projects');
  };

  // Re-assess existing project
  const handleReAssess = () => {
    setActiveTab('form');
  };

  // Create new project
  const handleNewProject = () => {
    const newId = `proj-${Date.now()}`;
    const newDraft: BusinessFormData = {
      id: newId,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      projectName: '',
      industry: 'food_beverage',
      businessType: '社区小微零售与便民服务',
      isSensitiveRegion: false,
      regionCountry: '',
      regionDetail: '',
      contactChannel: '',
      anonymousOwnerName: '',
      baseCurrency: 'USD',
      hasMultipleRates: false,
      customExchangeRateType: '民间/日常兑换参考价',
      customExchangeRateValue: 1.0,
      customExchangeRateSource: '',
      proofType: 'none',
      proofFiles: [],
      monthlyBreakdowns: [
        { month: '2026-01', revenue: { amount: 0, currency: 'USD' } },
        { month: '2026-02', revenue: { amount: 0, currency: 'USD' } },
        { month: '2026-03', revenue: { amount: 0, currency: 'USD' } },
        { month: '2026-04', revenue: { amount: 0, currency: 'USD' } },
        { month: '2026-05', revenue: { amount: 0, currency: 'USD' } },
        { month: '2026-06', revenue: { amount: 0, currency: 'USD' } }
      ],
      monthlyRevenue: { amount: 0, currency: 'USD' },
      monthlyRealOperatingRevenue: { amount: 0, currency: 'USD' },
      monthlyExternalGrants: { amount: 0, currency: 'USD' },
      cogsCost: { amount: 0, currency: 'USD' },
      rentCost: { amount: 0, currency: 'USD' },
      laborCost: { amount: 0, currency: 'USD' },
      utilityCost: { amount: 0, currency: 'USD' },
      taxCost: { amount: 0, currency: 'USD' },
      otherOpex: { amount: 0, currency: 'USD' },
      existingDebtMonthlyPayment: { amount: 0, currency: 'USD' },
      cashAndLiquidAssets: { amount: 0, currency: 'USD' },
      inventoryValue: { amount: 0, currency: 'USD' },
      operatingMonthsCount: 12,
      fullTimeEmployeesCount: 1,
      ownerUid: currentUser?.uid,
      ownerEmail: currentUser?.email || '',
      collaborators: [],
      isSubmitted: false,
      isDraft: true
    };

    const updatedProjects = [newDraft, ...projects];
    setProjects(updatedProjects);
    saveStoredProjects(updatedProjects);
    setActiveProjectId(newId);
    setActiveTab('form');
  };

  // Apply simulator values into form
  const handleApplySimulatorToForm = (simulatedData: Partial<BusinessFormData>) => {
    const updated = {
      ...activeProject,
      ...simulatedData,
      updatedAt: new Date().toISOString()
    };
    saveActiveDraft(updated);
    const updatedList = projects.map((p) => (p.id === updated.id ? updated : p));
    setProjects(updatedList);
    saveStoredProjects(updatedList);
    setActiveTab('form');
  };

  // Auto-sync with Firestore Cloud Database on mount
  useEffect(() => {
    const initSync = async () => {
      if (isCloudDatabaseAvailable()) {
        try {
          await syncWithCloudDatabase(currentUser);
          const refreshedProjects = loadStoredProjects();
          const refreshedReports = loadStoredReports();
          setProjects(refreshedProjects);
          setReports(refreshedReports);
        } catch (e) {
          console.warn('Initial cloud sync warning:', e);
        }
      }
    };
    initSync();
  }, []);

  const handleTriggerSync = async () => {
    pushBanner({ kind: 'info', text: '正在与 Firebase 云端数据库集合同步 (/assessments, /reports, /escalated_questions)...' });
    try {
      if (isCloudDatabaseAvailable()) {
        // 超时保护：Firestore 网络不可用时不再无限挂起"同步中"，8 秒后明确提示失败
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('云端连接超时（网络不可用或未登录），已保留本地数据，可稍后重试')), 8000)
        );
        await Promise.race([syncWithCloudDatabase(currentUser), timeoutPromise]);
        const refreshedProjects = loadStoredProjects();
        const refreshedReports = loadStoredReports();
        setProjects(refreshedProjects);
        setReports(refreshedReports);
        pushBanner({ kind: 'info', text: '云端数据库双向同步已完成！数据已安全持久化' }, 4000);
      } else {
        pushBanner({ kind: 'info', text: '本地持久化模式正常运行中' }, 4000);
      }
    } catch (e: any) {
      pushBanner({
        kind: 'error',
        text: `同步失败：${e.message || '本地数据已保存'}`
      });
    }
  };

  return (
    <div
      className={`min-h-screen bg-neutral-50 text-neutral-900 transition-all font-sans ${
        largeFont ? 'text-base leading-relaxed font-medium' : 'text-sm'
      } ${highContrast ? 'contrast-125 saturate-110' : ''}`}
    >
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        language={language}
        onLanguageChange={setLanguage}
        onOpenFeeModal={() => setIsFeeModalOpen(true)}
        onOpenAppGuide={() => setIsAppGuideOpen(true)}
        onOpenAccessibility={() => setIsAccessibilityOpen(true)}
        onOpenAiHelper={(topic) => {
          setAiInitialTopic(topic);
          setIsAiDrawerOpen(true);
        }}
        largeFont={largeFont}
        currentUser={currentUser}
        onLoginWithGoogle={handleLoginWithGoogle}
        onLogout={handleLogout}
        isSigningIn={isSigningIn}
      />

      {/* Sync Status Banner */}
      {banner && (
        <div className="max-w-7xl mx-auto px-4 mt-3">
          <div
            role={banner.kind === 'error' ? 'alert' : 'status'}
            className={`animate-in fade-in px-4 py-3 rounded-2xl shadow-sm flex items-start gap-3 text-xs sm:text-sm font-semibold border-2 ${
              banner.kind === 'error'
                ? 'bg-rose-50 border-rose-300 text-rose-900'
                : 'bg-white border-neutral-200 text-neutral-700'
            }`}
          >
            {banner.kind === 'error' && (
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 leading-relaxed">
              <span className="block">{banner.text}</span>
              {banner.action && (
                <a
                  href={banner.action.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-[11px] sm:text-xs hover:bg-rose-700 transition-colors"
                >
                  {banner.action.label}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <button
              type="button"
              onClick={dismissBanner}
              aria-label="关闭通知"
              className={`shrink-0 rounded-md p-1 transition-colors ${
                banner.kind === 'error'
                  ? 'hover:bg-rose-200 text-rose-700'
                  : 'hover:bg-neutral-100 text-neutral-500'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area based on activeTab */}
      <main className="pb-16">
        {activeTab === 'form' && (
          <AssessmentForm
            key={activeProject?.id || 'new'}
            initialData={activeProject}
            language={language}
            onSubmit={handleFormSubmit}
            onOpenAiHelper={(topic) => {
              setAiInitialTopic(topic);
              setIsAiDrawerOpen(true);
            }}
            largeFont={largeFont}
          />
        )}

        {activeTab === 'report' && activeReport && (
          <AssessmentReportView
            report={activeReport}
            allVersions={projectVersions}
            onSelectVersion={(v) => {
              const target = projectVersions.find((pv) => pv.version === v);
              if (target) setActiveReportId(target.id);
            }}
            onReAssess={handleReAssess}
            onDeleteAndRecall={() => handleDeleteProject(activeReport.projectId)}
            language={language}
          />
        )}

        {activeTab === 'simulator' && (
          <ScoringSimulator
            language={language}
            onApplyToForm={handleApplySimulatorToForm}
          />
        )}

        {activeTab === 'standards' && (
          <PublicScoringStandards language={language} />
        )}

        {activeTab === 'projects' && (
          <ProjectsListPage
            projects={projects}
            reports={reports}
            language={language}
            onNewProject={handleNewProject}
            onSelectProject={(id) => {
              setActiveProjectId(id);
              setActiveTab('form');
            }}
            onSelectReport={(reportId) => {
              setActiveReportId(reportId);
              setActiveTab('report');
            }}
            onDeleteProject={handleDeleteProject}
            isCloudDatabaseReady={isCloudDatabaseAvailable()}
            onTriggerSync={handleTriggerSync}
            currentUser={currentUser}
            onLoginWithGoogle={handleLoginWithGoogle}
          />
        )}
      </main>

      {/* Global Modals & Drawers */}
      <FeeTransparencyModal
        isOpen={isFeeModalOpen}
        onClose={() => setIsFeeModalOpen(false)}
        language={language}
      />

      <AppGuideModal
        isOpen={isAppGuideOpen}
        onClose={() => setIsAppGuideOpen(false)}
        language={language}
        onOpenAiHelper={(topic) => {
          setAiInitialTopic(topic);
          setIsAiDrawerOpen(true);
        }}
      />

      <AccessibilityToolbar
        isOpen={isAccessibilityOpen}
        onClose={() => setIsAccessibilityOpen(false)}
        language={language}
        largeFont={largeFont}
        onToggleLargeFont={() => setLargeFont(!largeFont)}
        highContrast={highContrast}
        onToggleHighContrast={() => setHighContrast(!highContrast)}
        lowBandwidth={lowBandwidth}
        onToggleLowBandwidth={() => setLowBandwidth(!lowBandwidth)}
      />

      <AiRuleConsultationDrawer
        isOpen={isAiDrawerOpen}
        onClose={() => setIsAiDrawerOpen(false)}
        language={language}
        initialTopic={aiInitialTopic}
      />

      {/* 生成报告过场：让"算完了"有仪式感 */}
      {isGenerating && (
        <div className="fixed inset-0 z-[100] bg-neutral-950/95 backdrop-blur-sm flex flex-col items-center justify-center text-center px-6 animate-in fade-in">
          <div className="relative w-20 h-20 mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-white/15"></div>
            <div className="absolute inset-0 rounded-full border-4 border-amber-400 border-t-transparent animate-spin"></div>
            <Heart className="w-8 h-8 text-amber-400 absolute inset-0 m-auto animate-pulse" />
          </div>
          <h2 className="text-white text-lg sm:text-xl font-black tracking-tight">正在为你生成体检报告…</h2>
          <p className="text-neutral-400 text-sm mt-2 max-w-sm leading-relaxed">
            我们正把你的店名、行业和每一笔开支，算成一句你能听懂的人话。
          </p>
        </div>
      )}
    </div>
  );
}
