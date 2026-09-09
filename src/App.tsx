import React, { useState, useEffect, useRef } from 'react';
import { Heart, X, AlertTriangle, ExternalLink, MessageCircle } from 'lucide-react';
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
import { AuthModal, AuthMode } from './components/AuthModal';
import { ProjectsListPage } from './pages/ProjectsListPage';
import { LearningCenterPage } from './pages/LearningCenterPage';
import {
  loadStoredProjects,
  saveStoredProjects,
  loadStoredReports,
  saveStoredReports,
  saveActiveDraft,
  syncWithCloudDatabase,
  saveProject,
  saveReport,
  deleteProjectAndReports,
  hasAnyStoredProjects,
  hasAnyStoredReports,
  loadStoredTab,
  saveStoredTab,
  clearAllLocalUserData
} from './lib/storage';
import {
  isCloudDatabaseAvailable,
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  sendPasswordResetEmail,
  updatePassword,
  logoutGoogleUser,
  subscribeToAuthChanges,
  readAuthCallbackError,
  clearAuthCallbackParams
} from './lib/supabaseClient';
import { calculateAssessmentReport } from './lib/scoringEngine';

export default function App() {
  // 记住上次所在页面：刷新后仍停在原处，不再被拉回首页
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    const saved = loadStoredTab();
    return saved ? (saved as ActiveTab) : 'form';
  });
  const [language, setLanguage] = useState<Language>('zh');

  // 统一的页面导航入口：
  // 1) 写入 history —— 用户点浏览器「后退」时回到上一个页面，而不是直接退出站点；
  // 2) 记住当前页面 —— 刷新或从外部链接回跳后，仍停在原来所在的页面。
  // 用 ref 跟踪当前页面，避免异步回调（如生成报告的延时）里用到过期的 tab 值
  const activeTabRef = useRef<ActiveTab>(activeTab);
  activeTabRef.current = activeTab;

  const navigateTo = (tab: ActiveTab) => {
    if (tab === activeTabRef.current) return;
    activeTabRef.current = tab;
    try {
      window.history.pushState({ tab }, '', window.location.pathname + window.location.search);
    } catch {
      /* 个别内嵌环境不支持 history API，忽略即可 */
    }
    saveStoredTab(tab);
    setActiveTab(tab);
  };

  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      const tab = (e.state?.tab as ActiveTab) || 'form';
      activeTabRef.current = tab;
      saveStoredTab(tab);
      setActiveTab(tab);
    };
    window.addEventListener('popstate', onPopState);
    // 给"进站第一条历史记录"贴上当前页面：这样第一次后退落在站内页面，而不是直接离开站点
    try {
      window.history.replaceState(
        { tab: activeTab },
        '',
        window.location.pathname + window.location.search
      );
    } catch {
      /* 忽略 */
    }
    return () => window.removeEventListener('popstate', onPopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // User Authentication State
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  // 登录弹窗的初始模式：找回密码链接回跳时直接展示「设置新密码」
  const [authInitialMode, setAuthInitialMode] = useState<AuthMode | undefined>(undefined);
  // 登录成功后的短暂过渡：右上角显示「✓ 登录成功」，随后切换为账号头像
  const [justSignedIn, setJustSignedIn] = useState(false);
  const justSignedTimerRef = useRef<number | null>(null);

  const flashSignedIn = () => {
    setJustSignedIn(true);
    if (justSignedTimerRef.current) {
      window.clearTimeout(justSignedTimerRef.current);
      justSignedTimerRef.current = null;
    }
    justSignedTimerRef.current = window.setTimeout(() => setJustSignedIn(false), 3000);
  };

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

  // Projects and Reports state (100% user data, no fake/seed data fallback)
  const [projects, setProjects] = useState<BusinessFormData[]>(() => loadStoredProjects());
  const [reports, setReports] = useState<AssessmentReport[]>(() => loadStoredReports());

  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    const stored = loadStoredProjects();
    return stored[0]?.id || '';
  });
  const [activeReportId, setActiveReportId] = useState<string>(() => {
    const stored = loadStoredReports();
    return stored[0]?.id || '';
  });

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
  // Supabase 控制台 Authentication 直达链接（用户可在浏览器中打开后自行配置 Google 登录）
  const supabaseAuthUrl = `https://supabase.com/dashboard/project/_/auth/providers`;
  const supabaseAuthSettingsUrl = `https://supabase.com/dashboard/project/_/auth/url-configuration`;

  // Subscribe to Supabase Google Auth state
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (user, event) => {
      setCurrentUser(user);
      if (user) {
        if (event === 'PASSWORD_RECOVERY') {
          // 用户点开找回密码邮件链接回跳：先让他设置新密码，不要当成普通登录一闪而过
          setAuthInitialMode('newpass');
          setIsAuthModalOpen(true);
          pushBanner({
            kind: 'info',
            text: '请为账号设置新密码，保存后即可用新密码登录。'
          });
          return;
        }
        setIsAuthModalOpen(false);
        // 邮箱验证链接 / Google 登录回跳等场景同样给出"已登录"的即时反馈
        if (event === 'SIGNED_IN') flashSignedIn();
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

  // 认证回跳落地处理：Google 登录 / 邮箱验证 / 找回密码链接跳回本站后的收尾
  useEffect(() => {
    const callbackError = readAuthCallbackError();
    if (callbackError) {
      const { code, description } = callbackError;
      const text = /expired|otp_expired/i.test(code) || /expired/i.test(description)
        ? '该链接已过期或已被使用过，请重新发起登录 / 找回密码。'
        : /access_denied/i.test(code)
          ? '该登录链接无效（可能已被使用过或已失效），请重新发起登录。'
          : `登录链接异常：${description || code}`;
      pushBanner({ kind: 'error', text });
      // 清掉 URL 上的错误参数，避免刷新后又弹一次
      clearAuthCallbackParams();
    }
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

  // 登录/注册成功后统一处理：更新用户、关闭登录弹窗、提示并拉取云端档案
  const applyAuthedUser = async (user: AppUser, welcomeText: string) => {
    setCurrentUser(user);
    flashSignedIn();
    setIsAuthModalOpen(false);
    pushBanner({ kind: 'info', text: welcomeText }, 4000);
    try {
      await syncWithCloudDatabase(user);
      setProjects(loadStoredProjects());
      setReports(loadStoredReports());
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
  };

  // Google Login Action
  const handleLoginWithGoogle = async () => {
    try {
      setIsSigningIn(true);
      const user = await signInWithGoogle();
      if (user) {
        await applyAuthedUser(user, `Google 登录成功！已与 ${user.email} 绑定`);
      } else {
        // 用户关闭了授权窗口 / 弹窗被拦截 / 等待超时：温和引导，不视为错误
        pushBanner(
          {
            kind: 'info',
            text: '未完成 Google 登录（已取消或被拦截）。可再次点击登录，或改用邮箱密码登录。'
          },
          4000
        );
      }
    } catch (err: any) {
      const code = err?.code || '';
      const msg = err?.message || '';
      let displayMsg = `登录失败：${msg || '无法连接 Google 登录服务'}`;

      if (
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request' ||
        msg.includes('popup-closed-by-user') ||
        msg.includes('cancelled-popup-request') ||
        msg.includes('Popup closed by user') ||
        msg.includes('user closed')
      ) {
        displayMsg = '您已关闭 Google 登录窗口。仍可正常使用本地保存，或随时再次点击登录。';
        pushBanner({ kind: 'info', text: displayMsg }, 4000);
      } else if (
        msg.includes('popup') ||
        msg.includes('window.open') ||
        msg.includes('blocked')
      ) {
        displayMsg = '浏览器阻止了登录弹出窗口，请在地址栏允许弹窗后重试。';
        pushBanner({ kind: 'info', text: displayMsg }, 5000);
      } else if (msg.includes('not configured') || msg.includes('Supabase Auth is not configured')) {
        displayMsg = 'Supabase 云端尚未配置：请在项目根目录 .env 中填写 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY。';
        pushBanner({
          kind: 'error',
          text: displayMsg,
          action: { href: supabaseAuthUrl, label: '打开 Supabase 设置' }
        });
      } else if (
        msg.includes('Google provider is not enabled') ||
        msg.includes('provider is not enabled') ||
        code === 'auth/operation-not-allowed'
      ) {
        displayMsg = 'Google 登录方式尚未在 Supabase 中开启，请在 Supabase 控制台 Enable Google Provider。';
        pushBanner({
          kind: 'error',
          text: displayMsg,
          action: { href: supabaseAuthUrl, label: '打开登录方式设置' }
        });
      } else {
        pushBanner({ kind: 'error', text: displayMsg });
      }
      throw new Error(displayMsg);
    } finally {
      setIsSigningIn(false);
    }
  };

  // 邮箱 + 密码登录 / 注册 / 找回密码
  const handleEmailLogin = async (email: string, password: string) => {
    const user = await signInWithEmail(email.trim(), password);
    if (!user) throw new Error('登录失败，请稍后重试');
    await applyAuthedUser(user, `账号登录成功！欢迎回来，${user.displayName || user.email}`);
  };

  const handleEmailSignUp = async (
    email: string,
    password: string,
    displayName: string
  ): Promise<boolean> => {
    const result = await signUpWithEmail(email.trim(), password, displayName);
    if (result.user) {
      await applyAuthedUser(
        result.user,
        `注册成功！欢迎加入，${result.user.displayName || result.user.email}`
      );
      return true;
    }
    if (result.needsEmailConfirmation) {
      // Supabase 开启了"邮箱确认"：弹窗内已提示用户去邮箱点验证链接
      return false;
    }
    throw new Error('注册失败，请稍后重试');
  };

  const handleSendPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(email.trim());
  };

  // 找回密码回跳后的最后一步：保存新密码（没有这一步，重置邮件点了也没用）
  const handleSetNewPassword = async (password: string) => {
    try {
      await updatePassword(password);
      setIsAuthModalOpen(false);
      setAuthInitialMode(undefined);
      flashSignedIn();
      pushBanner(
        { kind: 'info', text: '新密码已保存！下次可直接用新密码登录。' },
        4000
      );
    } catch (err: any) {
      throw new Error(err?.message || '保存新密码失败，请重新发起找回密码。');
    }
  };

  // Logout Action
  const handleLogout = async () => {
    let remoteLogoutFailed = false;
    try {
      await logoutGoogleUser();
    } catch (err) {
      // 远端登出失败不应让用户卡在"以为已退出、实际仍是登录态"——
      // 本地登录态与本地数据依然要清空，只是提示用户远端会话可能未彻底失效。
      console.warn('Logout error:', err);
      remoteLogoutFailed = true;
    }

    // 清空本地登录态与本地存储的项目/报告数据：
    // 云端同步是"合并"逻辑，若退出登录后不清本地存储，共享设备上下一位使用者
    // 打开浏览器仍能直接看到上一个已登录用户的项目与财务数据。
    setCurrentUser(null);
    setProjects([]);
    setReports([]);
    setActiveProjectId('');
    setActiveReportId('');
    clearAllLocalUserData();

    pushBanner(
      remoteLogoutFailed
        ? { kind: 'info', text: '已在本机退出登录（远端会话状态未能确认，如仍显示已登录请重新刷新页面）。' }
        : { kind: 'info', text: '已安全退出 Google 登录。' },
      3000
    );
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
      navigateTo('report');
      setIsGenerating(false);
    }, 1100);
  };

  // Delete project and all associated reports (P0 data withdrawal)
  // ⚠️ 修复：删除时必须同步清理云端数据，否则刷新后云端合并会把已删除的数据重新拉回本地
  const handleDeleteProject = (projId: string) => {
    const updatedProjects = projects.filter((p) => p.id !== projId);
    const updatedReports = reports.filter((r) => r.projectId !== projId);

    setProjects(updatedProjects);
    saveStoredProjects(updatedProjects);
    setReports(updatedReports);
    saveStoredReports(updatedReports);

    // 同步删除本地与云端（Supabase）中该项目的评估与报告，防止刷新后被云端数据"复活"；
    // 显式传入被删报告 id，确保删除墓碑能准确记录（本地报告此刻可能已被上方清空）
    const deletedReportIds = reports.filter((r) => r.projectId === projId).map((r) => r.id);
    deleteProjectAndReports(projId, deletedReportIds).catch((e) =>
      console.warn('云端删除失败（本地已删除，可稍后重试同步）:', e)
    );

    if (activeProjectId === projId) {
      if (updatedProjects.length > 0) {
        setActiveProjectId(updatedProjects[0].id);
        const related = updatedReports.find((r) => r.projectId === updatedProjects[0].id);
        if (related) setActiveReportId(related.id);
      }
    }
    navigateTo('projects');
  };

  // Update a project's metadata (e.g. collaborators managed from Projects page)
  const handleUpdateProject = (projId: string, patch: Partial<BusinessFormData>) => {
    const updated = projects.map((p) =>
      p.id === projId ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p
    );
    setProjects(updated);
    saveStoredProjects(updated);
    const proj = updated.find((p) => p.id === projId);
    if (proj) saveProject(proj);
  };

  // Re-assess existing project
  const handleReAssess = () => {
    navigateTo('form');
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
      companyRegistrationCost: { amount: 0, currency: 'USD' },
      companyRegistrationAmortizationMonths: 12,
      visaFeeCost: { amount: 0, currency: 'USD' },
      visaFeeAmortizationMonths: 12,
      equipmentDepreciationCost: { amount: 0, currency: 'USD' },
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
    navigateTo('form');
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
    navigateTo('form');
  };

  // Auto-sync with Supabase Cloud Database on mount
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
    pushBanner({ kind: 'info', text: '正在与 Supabase 云端数据库集合同步 (projects, assessment_reports, escalated_questions)...' });
    try {
      if (isCloudDatabaseAvailable()) {
        // 超时保护：Supabase 网络不可用时不再无限挂起"同步中"，8 秒后明确提示失败
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('云端连接超时（网络不可用或未登录），已保留本地数据，可稍后重试')), 8000)
        );
        await Promise.race([syncWithCloudDatabase(currentUser), timeoutPromise]);
        const refreshedProjects = loadStoredProjects();
        const refreshedReports = loadStoredReports();
        setProjects(refreshedProjects);
        setReports(refreshedReports);
        if (currentUser) {
          pushBanner({ kind: 'info', text: '云端数据库双向同步已完成！数据已安全持久化' }, 4000);
        } else {
          pushBanner(
            { kind: 'info', text: '本地数据已安全保存。使用 Google 登录后可开启专属云端档案同步' },
            4000
          );
        }
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
      className={`min-h-screen bg-warm text-neutral-900 transition-all font-sans ${
        largeFont ? 'text-base leading-relaxed font-medium' : 'text-sm'
      } ${highContrast ? 'contrast-125 saturate-110' : ''}`}
    >
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={navigateTo}
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
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        isSigningIn={isSigningIn}
        justSignedIn={justSignedIn}
      />

      {/* 桌面端为固定左侧边栏留出空间；移动端侧边栏隐藏，无需内边距 */}
      <div className="md:pl-56">

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
      <main className="pb-24 md:pb-16">
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

        {activeTab === 'report' && (
          activeReport ? (
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
          ) : (
            <div className="max-w-4xl mx-auto px-4 py-16 text-center">
              <div className="bg-white rounded-3xl p-8 sm:p-12 border-2 border-neutral-200 shadow-xs space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto border border-teal-100 shadow-xs">
                  <Heart className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-neutral-900">
                    {language === 'zh' ? '暂无体检报告' : 'No Assessment Report Yet'}
                  </h3>
                  <p className="text-xs text-neutral-500 font-medium max-w-md mx-auto mt-1 leading-relaxed">
                    {language === 'zh'
                      ? '请先在「快速体检」中填写并提交您的第一个商业自测项目，系统将自动生成体检诊断与 5 维能力透视报告。'
                      : 'Please complete an assessment first. Your diagnostic health report will appear here.'}
                  </p>
                </div>
                <button
                  onClick={() => navigateTo('form')}
                  className="inline-flex items-center space-x-1.5 px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-2xl text-xs font-bold shadow-md shadow-teal-600/20 transition-all cursor-pointer"
                >
                  <span>{language === 'zh' ? '前往快速体检' : 'Start New Assessment'}</span>
                </button>
              </div>
            </div>
          )
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

        {activeTab === 'learning' && <LearningCenterPage language={language} />}

        {activeTab === 'projects' && (
          <ProjectsListPage
            projects={projects}
            reports={reports}
            language={language}
            onNewProject={handleNewProject}
            onSelectProject={(id) => {
              setActiveProjectId(id);
              navigateTo('form');
            }}
            onSelectReport={(reportId) => {
              // ⚠️ 必须同时切换「当前项目」：否则看完 A 的报告再点「重新测算」会打开 B 的表单
              const target = reports.find((r) => r.id === reportId);
              if (target?.projectId) setActiveProjectId(target.projectId);
              setActiveReportId(reportId);
              navigateTo('report');
            }}
            onDeleteProject={handleDeleteProject}
            onUpdateProject={handleUpdateProject}
            isCloudDatabaseReady={isCloudDatabaseAvailable()}
            onTriggerSync={handleTriggerSync}
            currentUser={currentUser}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />
        )}
      </main>

      </div>

      {/* 全局 AI 答疑悬浮入口：任何页面随时提问 */}
      {!isAiDrawerOpen && (
        <button
          onClick={() => {
            setAiInitialTopic(undefined);
            setIsAiDrawerOpen(true);
          }}
          aria-label="打开 AI 答疑"
          title="AI 答疑：任何不懂的地方都能问"
          className="fixed bottom-20 md:bottom-6 right-5 sm:right-6 z-40 flex items-center gap-2 pl-4 pr-5 py-3 rounded-full bg-gradient-to-r from-violet-600 to-teal-600 text-white text-sm font-bold shadow-xl hover:shadow-2xl hover:from-violet-500 hover:to-teal-500 active:scale-95 transition-all cursor-pointer animate-in fade-in"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="hidden sm:inline">AI 答疑</span>
        </button>
      )}

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

      {/* 账号登录 / 注册弹窗（Google + 邮箱密码双通道） */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          // 修复：关闭弹窗时必须重置 authInitialMode——否则用户在"设置新密码"模式下
          // 直接关闭弹窗而不提交，下次点击登录会因为 initialMode 仍是 'newpass'
          // 而被重新锁死在设置新密码界面，进不了正常登录/注册。
          setAuthInitialMode(undefined);
        }}
        language={language}
        isGoogleLoading={isSigningIn}
        onGoogleLogin={handleLoginWithGoogle}
        onEmailLogin={handleEmailLogin}
        onEmailSignUp={handleEmailSignUp}
        onSendResetEmail={handleSendPasswordReset}
        onSetNewPassword={handleSetNewPassword}
        initialMode={authInitialMode}
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
