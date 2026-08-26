import React, { useState, useEffect } from 'react';
import {
  BusinessFormData,
  AssessmentReport,
  Language,
  ActiveTab,
  AppUser
} from './types';
import { Navbar } from './components/Navbar';
import { FeeTransparencyModal } from './components/FeeTransparencyModal';
import { OnboardingGuide } from './components/OnboardingGuide';
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
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isAccessibilityOpen, setIsAccessibilityOpen] = useState(false);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [aiInitialTopic, setAiInitialTopic] = useState<string | undefined>(undefined);

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
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  // Subscribe to Firebase Google Auth state
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (user) => {
      setCurrentUser(user);
      if (user) {
        setSyncStatusMsg(`👋 欢迎回来，${user.displayName || user.email}！正在载入您的专属云端档案...`);
        try {
          await syncWithCloudDatabase(user);
          const refreshedProjects = loadStoredProjects();
          const refreshedReports = loadStoredReports();
          setProjects(refreshedProjects);
          setReports(refreshedReports);
          setSyncStatusMsg(`✅ 已同步 ${user.displayName || user.email} 的专属云端自测档案`);
        } catch (e) {
          console.warn('User cloud sync error:', e);
        }
        setTimeout(() => setSyncStatusMsg(null), 4000);
      }
    });
    return () => unsubscribe();
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
        setSyncStatusMsg(`🎉 Google 登录成功！已与 ${user.email} 绑定`);
        await syncWithCloudDatabase(user);
        const refreshedProjects = loadStoredProjects();
        const refreshedReports = loadStoredReports();
        setProjects(refreshedProjects);
        setReports(refreshedReports);
      }
    } catch (err: any) {
      console.error('Google login error:', err);
      setSyncStatusMsg(`登录提示：${err.message || '取消登录或窗口关闭'}`);
    } finally {
      setIsSigningIn(false);
      setTimeout(() => setSyncStatusMsg(null), 4000);
    }
  };

  // Logout Action
  const handleLogout = async () => {
    try {
      await logoutGoogleUser();
      setCurrentUser(null);
      setSyncStatusMsg('已安全退出 Google 登录。');
      setTimeout(() => setSyncStatusMsg(null), 3000);
    } catch (err) {
      console.warn('Logout error:', err);
    }
  };

  // Submit form handler
  const handleFormSubmit = (submittedData: BusinessFormData) => {
    // 1. Calculate latest version report
    const existingReportsForProj = reports.filter((r) => r.projectId === submittedData.id);
    const nextVersion = existingReportsForProj.length + 1;
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

    // 2. Update projects list
    const updatedProjects = [
      projectWithVersion,
      ...projects.filter((p) => p.id !== submittedData.id)
    ];
    setProjects(updatedProjects);
    saveStoredProjects(updatedProjects);
    saveProject(projectWithVersion);

    // 3. Update reports list
    const updatedReports = [newReport, ...reports];
    setReports(updatedReports);
    saveStoredReports(updatedReports);
    saveReport(newReport);

    // 4. Navigate to report view
    setActiveProjectId(submittedData.id);
    setActiveReportId(newReport.id);
    setActiveTab('report');
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
    setSyncStatusMsg('正在与 Firebase 云端数据库集合同步 (/assessments, /reports, /escalated_questions)...');
    try {
      if (isCloudDatabaseAvailable()) {
        await syncWithCloudDatabase(currentUser);
        const refreshedProjects = loadStoredProjects();
        const refreshedReports = loadStoredReports();
        setProjects(refreshedProjects);
        setReports(refreshedReports);
        setSyncStatusMsg('✅ 云端数据库双向同步已完成！数据已安全持久化');
      } else {
        setSyncStatusMsg('💡 本地持久化模式正常运行中');
      }
    } catch (e: any) {
      setSyncStatusMsg(`同步提示：${e.message || '本地数据已保存'}`);
    }
    setTimeout(() => setSyncStatusMsg(null), 5000);
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
        onOpenOnboarding={() => setIsOnboardingOpen(true)}
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
      {syncStatusMsg && (
        <div className="max-w-7xl mx-auto px-4 mt-3">
          <div className="bg-neutral-900 border-2 border-neutral-800 text-white text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-sm flex items-center justify-between animate-in fade-in">
            <span>{syncStatusMsg}</span>
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

      <OnboardingGuide
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        language={language}
        onStartAssessment={() => {
          setIsOnboardingOpen(false);
          setActiveTab('form');
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
    </div>
  );
}
