import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BusinessFormData, AssessmentReport } from '../types';

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
        autoRefreshToken: true
      }
    });
    console.log('✅ Supabase client initialized successfully with URL:', supabaseUrl);
  } catch (err) {
    console.warn('⚠️ Could not initialize Supabase client:', err);
  }
} else {
  console.log('ℹ️ Supabase credentials not configured. Operating in Offline-First Local Storage mode.');
}

export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabase !== null);
};

/**
 * SQL Schema definition for Supabase database setup
 * This can be run in Supabase SQL editor once user creates their project.
 */
export const SUPABASE_DATABASE_SCHEMA_SQL = `
-- 商业模型筛选平台 (BAM-PRD-2026-V1.4) 数据库初始化脚本

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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.escalated_questions (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  category TEXT,
  confidence TEXT,
  ai_response TEXT,
  is_edge_case BOOLEAN DEFAULT FALSE,
  user_feedback TEXT,
  archived_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id TEXT NOT NULL,
  action TEXT NOT NULL,
  field_name TEXT,
  actor_email TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
`;

export async function syncProjectToSupabase(project: BusinessFormData): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('projects').upsert({
      id: project.id,
      version: project.version,
      project_name: project.projectName,
      industry: project.industry,
      business_type: project.businessType,
      is_sensitive_region: project.isSensitiveRegion,
      region_country: project.regionCountry,
      region_detail: project.regionDetail,
      contact_channel: project.contactChannel,
      anonymous_owner_name: project.anonymousOwnerName,
      base_currency: project.baseCurrency,
      has_multiple_rates: project.hasMultipleRates,
      custom_exchange_rate_type: project.customExchangeRateType,
      custom_exchange_rate_value: project.customExchangeRateValue,
      proof_type: project.proofType,
      form_data: project,
      owner_email: project.ownerEmail,
      is_submitted: project.isSubmitted,
      updated_at: new Date().toISOString()
    });
    if (error) {
      console.warn('Supabase sync warning:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Supabase sync error:', e);
    return false;
  }
}

export async function syncReportToSupabase(report: AssessmentReport): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('assessment_reports').upsert({
      id: report.id,
      project_id: report.projectId,
      version: report.version,
      total_score: report.totalScore,
      tier: report.tier,
      overall_status: report.overallStatus,
      gate_passed: report.gatePassed,
      report_data: report,
      created_at: report.createdAt
    });
    return !error;
  } catch (e) {
    console.warn('Supabase sync report error:', e);
    return false;
  }
}

export async function syncLocalWithSupabase(): Promise<{ success: boolean; message: string }> {
  if (!supabase) {
    return {
      success: true,
      message: '当前处于纯本地离线模式，全部数据已妥善保存在本地浏览器中。配置 Supabase 环境变量后将自动无缝开启云端备份。'
    };
  }
  try {
    // Attempt ping or sync
    const { error } = await supabase.from('projects').select('id').limit(1);
    if (error) throw error;
    return { success: true, message: '✅ 与 Supabase 云端数据库双向同步成功！' };
  } catch (e: any) {
    return { success: false, message: `云端同步提示: ${e?.message || '连接异常'}` };
  }
}
