-- 商业模型筛选平台 (BAM) 数据库初始化脚本
-- 用法：在 Supabase Dashboard → SQL Editor 中粘贴全部内容后点击 Run（执行一次即可）

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

-- 如需按用户隔离数据（登录后只看到自己的数据），可取消下面注释启用：
-- ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "owner select" ON public.projects FOR SELECT USING (owner_uid = auth.uid() OR owner_uid IS NULL);
-- CREATE POLICY "owner insert" ON public.projects FOR INSERT WITH CHECK (owner_uid = auth.uid() OR owner_uid IS NULL);
-- CREATE POLICY "owner update" ON public.projects FOR UPDATE USING (owner_uid = auth.uid() OR owner_uid IS NULL);
-- CREATE POLICY "owner delete" ON public.projects FOR DELETE USING (owner_uid = auth.uid() OR owner_uid IS NULL);
