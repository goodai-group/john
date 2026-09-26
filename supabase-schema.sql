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

-- ============================================================
-- agent_runs：Agent 执行追踪（多 Agent 架构 Phase 0 新增）
-- 没有这张表，多 Agent 系统是调不动的：出问题时无法定位是哪个角色、哪一环，
-- 也无法区分「云端产出」与「本地兜底产出」。
-- Phase 0 先由 server 端以结构化日志输出；Phase 1 通过 setTraceSink() 落到本表。
-- claim_type 取值：external_fact | project_fact | interpretation | action | change | conversation | gate
-- mode 取值：gemini（云端产出） | rules（本地兜底） | deterministic（无云端路径，确定性计算）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.agent_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id TEXT NOT NULL,
  agent TEXT NOT NULL,
  claim_type TEXT NOT NULL,
  mode TEXT NOT NULL,
  duration_ms INT,
  degraded BOOLEAN DEFAULT FALSE,
  error_kind TEXT,
  error TEXT,
  project_id TEXT,
  owner_uid TEXT,
  started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agent_runs_agent_started_idx
  ON public.agent_runs (agent, started_at DESC);
CREATE INDEX IF NOT EXISTS agent_runs_degraded_idx
  ON public.agent_runs (degraded, started_at DESC);

-- ============================================================
-- action_items：行动清单的生命周期（Phase 1）
-- 不做这张表，Tracker 无法催办，行动清单会退化成一次性展示。
-- expected_score_gain 由 Strategist 通过确定性引擎模拟验算得出，不是模型估的。
-- ============================================================
CREATE TABLE IF NOT EXISTS public.action_items (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
  report_version INT,
  title TEXT NOT NULL,
  detail TEXT,
  horizon_days INT,
  expected_score_gain NUMERIC,
  status TEXT DEFAULT 'open',
  owner_email TEXT,
  due_date DATE,
  created_by_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS action_items_project_status_idx
  ON public.action_items (project_id, status);

-- ============================================================
-- agent_facts：长期记忆（Phase 1）
-- 两类内容同等重要：
--   1. 用户已确认的事实
--   2. 用户否决过的建议 —— 没有它，Agent 每月会重复推荐同一条被拒绝的建议，
--      用户会迅速失去信任
-- ============================================================
CREATE TABLE IF NOT EXISTS public.agent_facts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
  fact_type TEXT NOT NULL,
  fact_key TEXT NOT NULL,
  fact_value JSONB,
  source TEXT,
  confidence TEXT,
  source_ref TEXT,
  as_of DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS agent_facts_project_key_idx
  ON public.agent_facts (project_id, fact_type, fact_key);

-- ============================================================
-- 修复历史遗留问题：assessment_reports.id 列类型误建为 UUID
-- 现象：删除/写入 report-<timestamp> 格式的 ID 时报错
--   "invalid input syntax for type uuid: report-xxxx"
-- 原因：部分早期安装通过 Supabase 控制台手动建表，默认把 id 建成了 UUID，
--   与本文件定义的 TEXT 主键不一致（CREATE TABLE IF NOT EXISTS 不会修正
--   已存在表的列类型，所以重新执行本文件无法自动修复）。
--   以下语句可安全重复执行，仅在实际列类型不是 text 时才会转换。
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'assessment_reports'
      AND column_name = 'id'
      AND data_type <> 'text'
  ) THEN
    ALTER TABLE public.assessment_reports
      ALTER COLUMN id TYPE TEXT USING id::TEXT;
  END IF;
END $$;

-- ============================================================
-- 修复历史遗留问题：assessment_reports 表在部分环境里还带一个 runway_months 列
-- （NOT NULL 且无默认值）。本应用代码从未写入过这一列——现金储备可支撑月数
-- （cashRunwayMonths）是打分引擎算出来的展示值，存在 report_data JSONB 里，
-- 不落单独列——导致每次写报告都报
--   "null value in column runway_months of relation assessment_reports violates not-null constraint"。
-- 放宽为可空即可，不删列（避免影响该列上可能已有的历史数据/依赖）。可安全重复执行。
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'assessment_reports'
      AND column_name = 'runway_months'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.assessment_reports ALTER COLUMN runway_months DROP NOT NULL;
  END IF;
END $$;

-- ============================================================
-- 修复历史遗留问题：早期手动建表 / 未跟着本文件更新过的环境里，
-- projects / assessment_reports 表可能缺少后续新增的列（例如
-- assessment_reports.project_id），导致 PostgREST 报
-- "Could not find the 'xxx' column of 'yyy' in the schema cache"。
-- CREATE TABLE IF NOT EXISTS 只在表不存在时生效，不会给已存在的表补列，
-- 所以用 ADD COLUMN IF NOT EXISTS 逐列兜底修复。可安全重复执行。
-- ============================================================
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS version INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS project_name TEXT,
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS business_type TEXT,
  ADD COLUMN IF NOT EXISTS is_sensitive_region BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS region_country TEXT,
  ADD COLUMN IF NOT EXISTS region_detail TEXT,
  ADD COLUMN IF NOT EXISTS contact_channel TEXT,
  ADD COLUMN IF NOT EXISTS anonymous_owner_name TEXT,
  ADD COLUMN IF NOT EXISTS base_currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS has_multiple_rates BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS custom_exchange_rate_type TEXT,
  ADD COLUMN IF NOT EXISTS custom_exchange_rate_value NUMERIC,
  ADD COLUMN IF NOT EXISTS proof_type TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS form_data JSONB,
  ADD COLUMN IF NOT EXISTS owner_uid TEXT,
  ADD COLUMN IF NOT EXISTS owner_email TEXT,
  ADD COLUMN IF NOT EXISTS is_submitted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.assessment_reports
  ADD COLUMN IF NOT EXISTS project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS version INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS total_score INT,
  ADD COLUMN IF NOT EXISTS tier TEXT,
  ADD COLUMN IF NOT EXISTS overall_status TEXT,
  ADD COLUMN IF NOT EXISTS gate_passed BOOLEAN,
  ADD COLUMN IF NOT EXISTS report_data JSONB,
  ADD COLUMN IF NOT EXISTS owner_uid TEXT,
  ADD COLUMN IF NOT EXISTS owner_email TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 上面这类 ALTER TABLE 一般会被 PostgREST 自动监听并刷新其 schema 缓存，
-- 但显式 NOTIFY 一次可以消除"表结构已改、API 却仍报 schema cache 找不到列"
-- 的短暂窗口，且可安全重复执行。
NOTIFY pgrst, 'reload schema';

-- 如需按用户隔离数据（登录后只看到自己的数据），可取消下面注释启用：
-- ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "owner select" ON public.projects FOR SELECT USING (owner_uid = auth.uid() OR owner_uid IS NULL);
-- CREATE POLICY "owner insert" ON public.projects FOR INSERT WITH CHECK (owner_uid = auth.uid() OR owner_uid IS NULL);
-- CREATE POLICY "owner update" ON public.projects FOR UPDATE USING (owner_uid = auth.uid() OR owner_uid IS NULL);
-- CREATE POLICY "owner delete" ON public.projects FOR DELETE USING (owner_uid = auth.uid() OR owner_uid IS NULL);
