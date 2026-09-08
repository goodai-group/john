import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { BusinessFormData, AssessmentReport, EscalatedQuestion, AppUser } from '../types';

// Clean and normalize Supabase URL (e.g., strip trailing /rest/v1 or trailing slashes)
function cleanSupabaseUrl(url?: string): string {
  if (!url) return '';
  return url.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
}

const rawSupabaseUrl =
  (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_URL ||
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  (typeof process !== 'undefined' && (process.env?.NEXT_PUBLIC_SUPABASE_URL || process.env?.SUPABASE_URL)) ||
  '';

const supabaseUrl = cleanSupabaseUrl(rawSupabaseUrl);

const supabaseAnonKey = (
  (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  (typeof process !== 'undefined' && (process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env?.SUPABASE_ANON_KEY)) ||
  ''
).trim();

export let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // PKCE 为 SPA 推荐的更安全的 OAuth 流程，配合 Supabase Google 登录使用
        flowType: 'pkce'
      }
    });
    console.log('✅ Supabase client initialized successfully with URL:', supabaseUrl);
  } catch (err) {
    console.warn('⚠️ Could not initialize Supabase client:', err);
  }
} else {
  console.log('ℹ️ Supabase credentials not configured. Operating in Offline-First Local Storage mode.');
}

export const isCloudDatabaseAvailable = (): boolean => {
  return Boolean(supabase !== null);
};

export const isSupabaseConfigured = (): boolean => {
  return isCloudDatabaseAvailable();
};

// 缓存当前登录用户，供同步上下文（非 React）读取
let cachedSupabaseUser: AppUser | null = null;
export const getCachedSupabaseUser = (): AppUser | null => cachedSupabaseUser;

function toAppUser(u: User | undefined | null): AppUser | null {
  if (!u) return null;
  const meta = u.user_metadata || {};
  return {
    uid: u.id,
    email: u.email ?? null,
    displayName:
      meta.full_name || meta.name || meta.fullName || u.email?.split('@')[0] || null,
    photoURL: meta.avatar_url || meta.picture || meta.avatarUrl || null
  };
}

// ========================
// 🔐 GOOGLE AUTH (Supabase)
// ========================

export const subscribeToAuthChanges = (
  callback: (user: AppUser | null) => void
): (() => void) => {
  if (!supabase) {
    callback(null);
    return () => {};
  }
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    const appUser = toAppUser(session?.user);
    cachedSupabaseUser = appUser;
    callback(appUser);
  });
  // 初始化时先主动拉取一次会话，保证刷新页面后登录状态恢复
  supabase.auth.getSession().then(({ data: sessionData }) => {
    const appUser = toAppUser(sessionData.session?.user);
    cachedSupabaseUser = appUser;
    callback(appUser);
  });
  return () => {
    data.subscription.unsubscribe();
  };
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// 读取当前会话中的用户（本地 localStorage 读取，无网络请求）
async function readSessionUser(): Promise<AppUser | null> {
  if (!supabase) return null;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    return toAppUser(sessionData.session?.user);
  } catch {
    return null;
  }
}

export const signInWithGoogle = async (): Promise<AppUser | null> => {
  if (!supabase) {
    throw new Error('Supabase Auth is not configured. 请在项目根目录 .env 配置 Supabase 后重试。');
  }
  // 若已存在有效会话（例如用户早已登录），直接返回，避免重复弹窗
  const existingUser = await readSessionUser();
  if (existingUser) {
    cachedSupabaseUser = existingUser;
    return existingUser;
  }

  // 使用 PKCE 流程发起 Google OAuth（flowType 已在 createClient 的 auth 配置中声明）。
  // 关闭 SDK 的「整页自动跳转」，改由本函数用授权弹窗 + 轮询会话的方式完成登录，
  // 确保用户授权完成后能立即拿到会话并同步更新界面登录状态。
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      queryParams: { prompt: 'select_account' },
      scopes: 'email profile',
      skipBrowserRedirect: true
    }
  });
  if (error) throw error;
  const authUrl = data?.url;
  if (!authUrl) return null;

  // 打开居中的授权弹窗
  const popupWidth = 560;
  const popupHeight = 720;
  const left = Math.max(0, Math.round((window.screen.width - popupWidth) / 2));
  const top = Math.max(0, Math.round((window.screen.height - popupHeight) / 2));
  let popup: Window | null = null;
  try {
    popup = window.open(
      authUrl,
      'supabase_google_oauth',
      `width=${popupWidth},height=${popupHeight},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
  } catch {
    popup = null;
  }

  if (!popup) {
    if (window.top === window) {
      // 弹窗被浏览器拦截：退回整页跳转（页面即将卸载，此 Promise 保持挂起即可）
      window.location.assign(authUrl);
      return await new Promise<never>(() => {});
    }
    // 受限环境（如内嵌 iframe）无法打开弹窗，返回 null 交由调用方提示
    return null;
  }

  // 轮询等待：用户在弹窗内完成 Google 授权、会话写入本地后即可立即返回。
  // 最长等待 3 分钟（给用户挑选账号/输密码留足时间），中途关闭弹窗视为取消。
  const startedAt = Date.now();
  const MAX_WAIT_MS = 180_000;
  while (Date.now() - startedAt < MAX_WAIT_MS) {
    if (popup.closed) break; // 用户主动关闭了授权窗口 → 视为取消
    const appUser = await readSessionUser();
    if (appUser) {
      cachedSupabaseUser = appUser;
      try {
        popup.close(); // 登录成功，自动收起弹窗
      } catch {
        /* 弹窗可能已被关闭，忽略 */
      }
      return appUser;
    }
    await sleep(300);
  }

  // 超时 / 取消：关掉弹窗，返回 null（本次未登录成功）
  try {
    if (!popup.closed) popup.close();
  } catch {
    /* 忽略 */
  }
  return null;
};

export const logoutGoogleUser = async (): Promise<void> => {
  if (!supabase) return;
  await supabase.auth.signOut();
  cachedSupabaseUser = null;
};

// ========================
// 🔑 EMAIL & PASSWORD AUTH (Supabase)
// 邮箱 + 密码账号注册 / 登录 / 找回密码
// ========================

export interface EmailSignUpResult {
  // 注册后若返回了有效会话则代表「自动登录成功」
  user: AppUser | null;
  // 当 Supabase 开启「邮箱确认」时，注册后需点击邮件里的验证链接才能登录
  needsEmailConfirmation: boolean;
}

export const signUpWithEmail = async (
  email: string,
  password: string,
  displayName?: string
): Promise<EmailSignUpResult> => {
  if (!supabase) {
    throw new Error('Supabase Auth is not configured. 请在项目根目录 .env 配置 Supabase 后重试。');
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // 展示名写入 user_metadata，与 Google 登录的 full_name 字段保持一致
      data: displayName?.trim() ? { full_name: displayName.trim() } : undefined,
      emailRedirectTo: window.location.origin
    }
  });
  if (error) throw error;
  const appUser = toAppUser(data?.user);
  if (appUser && data?.session) {
    cachedSupabaseUser = appUser;
  }
  return {
    user: appUser && data?.session ? appUser : null,
    needsEmailConfirmation: Boolean(appUser && !data?.session)
  };
};

export const signInWithEmail = async (email: string, password: string): Promise<AppUser | null> => {
  if (!supabase) {
    throw new Error('Supabase Auth is not configured. 请在项目根目录 .env 配置 Supabase 后重试。');
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const appUser = toAppUser(data?.user);
  cachedSupabaseUser = appUser;
  return appUser;
};

export const sendPasswordResetEmail = async (email: string): Promise<void> => {
  if (!supabase) {
    throw new Error('Supabase Auth is not configured. 请在项目根目录 .env 配置 Supabase 后重试。');
  }
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin
  });
  if (error) throw error;
};

export const getCurrentAuthUser = (): AppUser | null => {
  return cachedSupabaseUser;
};

// ========================
// 1. Cloud Projects (/projects)
// ========================

export const saveAssessmentToCloud = async (
  data: BusinessFormData,
  currentUser?: AppUser | null
): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const user = currentUser || getCurrentAuthUser();
    const { error } = await supabase.from('projects').upsert(
      {
        id: data.id,
        version: data.version,
        project_name: data.projectName,
        industry: data.industry,
        business_type: data.businessType,
        is_sensitive_region: data.isSensitiveRegion,
        region_country: data.regionCountry,
        region_detail: data.regionDetail,
        contact_channel: data.contactChannel,
        anonymous_owner_name: data.anonymousOwnerName,
        base_currency: data.baseCurrency,
        has_multiple_rates: data.hasMultipleRates,
        custom_exchange_rate_type: data.customExchangeRateType,
        custom_exchange_rate_value: data.customExchangeRateValue,
        proof_type: data.proofType,
        form_data: data,
        owner_uid: user?.uid || null,
        owner_email: user?.email || data.ownerEmail || null,
        is_submitted: data.isSubmitted,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'id' }
    );
    if (error) {
      console.warn('saveAssessmentToCloud (Supabase) failed:', error.message);
      return false;
    }
    return true;
  } catch (e: any) {
    console.warn('saveAssessmentToCloud (Supabase) error:', e?.message || e);
    return false;
  }
};

export const fetchAssessmentsFromCloud = async (
  user?: AppUser | null
): Promise<BusinessFormData[]> => {
  if (!supabase) return [];
  // 未登录时禁止拉取云端全表数据（防止他人/过期数据合并回本地，
  // 这是"删除后刷新复活"与数据泄漏的根源之一）
  if (!user?.uid) return [];
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('form_data')
      .eq('owner_uid', user.uid)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data || [])
      .map((row: any) => row?.form_data as BusinessFormData)
      .filter((p): p is BusinessFormData => Boolean(p && p.id));
  } catch (e: any) {
    console.warn('fetchAssessmentsFromCloud (Supabase) failed:', e?.message || e);
    return [];
  }
};

export const deleteAssessmentFromCloud = async (id: string): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) {
      console.warn('deleteAssessmentFromCloud (Supabase) failed:', error.message);
      return false;
    }
    return true;
  } catch (e: any) {
    console.warn('deleteAssessmentFromCloud (Supabase) error:', e?.message || e);
    return false;
  }
};

// ========================
// 2. Cloud Reports (/assessment_reports)
// ========================

export const saveReportToCloud = async (
  report: AssessmentReport,
  currentUser?: AppUser | null
): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const user = currentUser || getCurrentAuthUser();
    const { error } = await supabase.from('assessment_reports').upsert(
      {
        id: report.id,
        project_id: report.projectId,
        version: report.version,
        total_score: report.totalScore,
        tier: report.tier,
        overall_status: report.overallStatus,
        gate_passed: report.gatePassed,
        report_data: report,
        owner_uid: user?.uid || null,
        owner_email: user?.email || report.ownerEmail || null,
        created_at: report.createdAt,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'id' }
    );
    if (error) {
      console.warn('saveReportToCloud (Supabase) failed:', error.message);
      return false;
    }
    return true;
  } catch (e: any) {
    console.warn('saveReportToCloud (Supabase) error:', e?.message || e);
    return false;
  }
};

export const fetchReportsFromCloud = async (
  user?: AppUser | null
): Promise<AssessmentReport[]> => {
  if (!supabase) return [];
  // 未登录时禁止拉取云端全表数据（同上，防"复活"与数据泄漏）
  if (!user?.uid) return [];
  try {
    const { data, error } = await supabase
      .from('assessment_reports')
      .select('report_data')
      .eq('owner_uid', user.uid)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || [])
      .map((row: any) => row?.report_data as AssessmentReport)
      .filter((r): r is AssessmentReport => Boolean(r && r.id));
  } catch (e: any) {
    console.warn('fetchReportsFromCloud (Supabase) failed:', e?.message || e);
    return [];
  }
};

export const deleteReportFromCloud = async (id: string): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('assessment_reports').delete().eq('id', id);
    if (error) {
      console.warn('deleteReportFromCloud (Supabase) failed:', error.message);
      return false;
    }
    return true;
  } catch (e: any) {
    console.warn('deleteReportFromCloud (Supabase) error:', e?.message || e);
    return false;
  }
};

// ========================
// 3. Cloud Escalated Questions (/escalated_questions)
// ========================

export const saveQuestionToCloud = async (q: EscalatedQuestion): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('escalated_questions').upsert(
      {
        id: q.id,
        question: q.question,
        category: q.category,
        confidence: q.confidence,
        ai_response: q.aiResponse,
        is_edge_case: q.isEdgeCase,
        user_feedback: q.userFeedback || null,
        data: q,
        archived_at: q.archivedAt,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'id' }
    );
    if (error) {
      console.warn('saveQuestionToCloud (Supabase) failed:', error.message);
      return false;
    }
    return true;
  } catch (e: any) {
    console.warn('saveQuestionToCloud (Supabase) error:', e?.message || e);
    return false;
  }
};

export const fetchQuestionsFromCloud = async (): Promise<EscalatedQuestion[]> => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('escalated_questions')
      .select('*')
      .order('archived_at', { ascending: false });
    if (error) throw error;
    const list: EscalatedQuestion[] = ((data || []) as any[])
      .map((row) => {
        // 优先读取完整 JSONB 对象，兼容旧数据按列重建
        if (row?.data && row.data.id) return row.data as EscalatedQuestion;
        if (row?.question) {
          return {
            id: row.id || `esc-${row.question}`,
            question: row.question,
            category: row.category || '小微经营解析',
            confidence: (row.confidence || 'HIGH') as EscalatedQuestion['confidence'],
            aiResponse: row.ai_response || '',
            isEdgeCase: Boolean(row.is_edge_case),
            suggestedAction: row.suggested_action || '',
            userFeedback: row.user_feedback,
            archivedAt: row.archived_at || new Date().toISOString()
          } as EscalatedQuestion;
        }
        return null;
      })
      .filter((q): q is EscalatedQuestion => Boolean(q));
    return list;
  } catch (e: any) {
    console.warn('fetchQuestionsFromCloud (Supabase) failed:', e?.message || e);
    return [];
  }
};

// ========================
// 4. 通用同步辅助
// ========================

export async function syncLocalWithSupabase(): Promise<{ success: boolean; message: string }> {
  if (!supabase) {
    return {
      success: true,
      message:
        '当前处于纯本地离线模式，全部数据已妥善保存在本地浏览器中。配置 Supabase 环境变量后将自动无缝开启云端备份与 Google 登录。'
    };
  }
  try {
    const { error } = await supabase.from('projects').select('id').limit(1);
    if (error) throw error;
    return { success: true, message: '✅ 与 Supabase 云端数据库双向同步成功！' };
  } catch (e: any) {
    return { success: false, message: `云端同步提示: ${e?.message || '连接异常'}` };
  }
}

/**
 * SQL Schema definition for Supabase database setup
 * This can be run in Supabase SQL editor once user creates their project.
 */
export const SUPABASE_DATABASE_SCHEMA_SQL = `
-- 商业模型筛选平台 (BAM-PRD-2026-V1.4) 数据库初始化脚本
-- 请在 Supabase Dashboard → SQL Editor 中执行一次即可。

CREATE TABLE IF NOT EXISTS public.projects (
  id TEXT PRIMARY KEY,
  version INT DEFAULT 1,
  project_name TEXT NOT NULL,
  industry TEXT,
  business_type TEXT,
  is_sensitive_region BOOLEAN DEFAULT FALSE,
  region_country TEXT,
  region_detail TEXT,
  contact_channel TEXT,
  anonymous_owner_name TEXT,
  base_currency TEXT NOT NULL DEFAULT 'USD',
  has_multiple_rates BOOLEAN DEFAULT FALSE,
  custom_exchange_rate_type TEXT,
  custom_exchange_rate_value NUMERIC,
  proof_type TEXT DEFAULT 'none',
  form_data JSONB NOT NULL,
  owner_uid TEXT,
  owner_email TEXT,
  is_submitted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.assessment_reports (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
  version INT DEFAULT 1,
  total_score INT,
  tier TEXT,
  overall_status TEXT,
  gate_passed BOOLEAN,
  report_data JSONB NOT NULL,
  owner_uid TEXT,
  owner_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.escalated_questions (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  category TEXT,
  confidence TEXT,
  ai_response TEXT,
  is_edge_case BOOLEAN DEFAULT FALSE,
  suggested_action TEXT,
  user_feedback TEXT,
  data JSONB,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id TEXT NOT NULL,
  action TEXT NOT NULL,
  field_name TEXT,
  actor_email TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 启用 RLS 前建议先按 owner 隔离（可选，默认宽松以便本地开发）：
-- ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "owner select" ON public.projects FOR SELECT USING (owner_uid = auth.uid() OR owner_uid IS NULL);
-- CREATE POLICY "owner insert" ON public.projects FOR INSERT WITH CHECK (owner_uid = auth.uid() OR owner_uid IS NULL);
-- CREATE POLICY "owner update" ON public.projects FOR UPDATE USING (owner_uid = auth.uid() OR owner_uid IS NULL);
-- CREATE POLICY "owner delete" ON public.projects FOR DELETE USING (owner_uid = auth.uid() OR owner_uid IS NULL);
`;
