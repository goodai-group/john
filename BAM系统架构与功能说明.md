# BAM 商宣商业模式检验系统 —— 系统架构与功能说明

> 本文档面向工程/产品同学，说明系统整体架构、模块职责与核心数据流。
> 项目速览另见根目录 `CLAUDE.md`；产品功能全景与测试用例见
> `BAM商业模式检验系统-产品功能全景文档.md`、`BAM商宣商业模式检验系统-测试用例报告.md`。

## 1. 系统定位

BAM 是一套"商业模式健康检验"工具：中小微经营者填写一份结构化的经营数据表单，
后端用**确定性打分引擎 + 多 Agent AI 协作**对其进行财务健康度打分、风险红线判定、
生成可行性简报/深度诊断报告，并支持围绕报告的 AI 答疑。

核心设计哲学：

- **评分绝不由大模型决定**。所有分数、等级、红线判定都来自 `src/lib/` 下的确定性代码
  （`scoringEngine.ts` 等），AI（Gemini）只负责“解释人话”“提建议”“答疑”，且这些产物
  在下发用户前都要经过规则校验。
- **无 Gemini Key 不是故障，是预期分支**：所有 AI 能力都有本地规则兜底
  （`src/server/localEngine/`），保证弱网/无 Key 环境下功能仍可用。
- **表单优先，Agent 藏在表单背后**：产品面向低数字素养、弱网、非母语用户，交互形态
  始终是结构化表单，而不是聊天界面；多 Agent 只是表单背后的编排逻辑。

## 2. 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 19 + TypeScript + Vite 6 + Tailwind CSS 4 |
| 后端 | Express（本地用 `tsx` 跑 `server.ts`；Vercel 上由 `api/[...path].ts` 转发到同一套路由） |
| 数据 | Supabase（Postgres + Auth）。`localStorage` 做本地优先缓存 + 云端双写同步 |
| AI | `@google/genai`（Gemini），无 Key / 配额耗尽时自动回退本地规则引擎 |
| 部署 | Vercel Serverless Functions（`api/` 目录）；也可作为普通 Node 进程自托管 |

## 3. 总体架构图

```
┌─────────────────────────────── 浏览器 ───────────────────────────────┐
│  React SPA (src/)                                                    │
│  ┌───────────┐  ┌────────────────┐  ┌──────────────────────────┐     │
│  │ App.tsx    │→│ AssessmentForm  │→│ AssessmentReportView       │    │
│  │ (Tab 路由) │  │ (表单主组件)    │  │ / FeasibilityBriefPage    │    │
│  └───────────┘  └────────────────┘  └──────────────────────────┘     │
│        │                 │                       │                    │
│        │        本地打分（scoringEngine.ts，纯前端确定性计算，       │
│        │        填表过程中实时反馈，无需请求后端）                     │
│        │                                                              │
│        └─ AiRuleConsultationDrawer（AI 答疑抽屉，SSE 流式）           │
└───────────────────────────┬───────────────────────────────────────────┘
                             │ HTTPS  /api/*
┌────────────────────────────▼──────────────────────────────────────────┐
│  Express 后端 (server.ts + src/server/)                                │
│  routes.ts  ── 路由注册，只做「解析请求 → runAgent → 返回产物」          │
│  http.ts    ── asyncHandler / JSON 错误中间件 / 404                    │
│  auth.ts    ── Supabase JWT 校验 + 简易限流                            │
│  gemini.ts  ── Gemini 客户端 / 配额冷却 / 错误归类                      │
│  localEngine/ ── 本地规则兜底（问答知识库、视频推荐）                    │
│                                                                        │
│  ┌────────────────────────── src/agents/ ───────────────────────────┐ │
│  │  多 Agent 契约层（详见第 5 节）                                    │ │
│  │  runtime.ts(执行) → 各 Agent → coach.ts(编排) → guardian.ts(审查) │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ┌────────────────────────── src/lib/ ──────────────────────────────┐ │
│  │  确定性核心：scoringEngine / breakEvenCalculator / paybackCalculator │
│  │  costAggregation / anomalyDetection / ledgerCycle / currencies…   │ │
│  │  storage.ts（localStorage + Supabase 双写） / supabaseClient.ts    │ │
│  └────────────────────────────────────────────────────────────────┘ │
└───────────────────────────┬────────────────────────────────────────────┘
                             │
                    ┌────────▼────────┐        ┌──────────────────┐
                    │ Supabase          │        │ Google Gemini API │
                    │ (Postgres+Auth)   │        │ (可选，无 Key 自动 │
                    └───────────────────┘        │ 降级本地规则引擎)   │
                                                  └──────────────────┘
```

部署形态：本地开发用 `npm run dev`（`tsx server.ts`，Express + Vite middleware 一体
进程）；生产走 Vercel，`api/[...path].ts` 把所有 `/api/*` 请求转发进同一套
`registerApiRoutes`，前端静态资源由 Vercel 平台直接服务。

## 4. 前端结构（`src/`）

### 4.1 顶层编排

- `App.tsx`：顶层状态与 Tab 路由编排。`ActiveTab` 包括
  `form | report | feasibility | simulator | standards | projects | learning`。
  各大组件全部按 Tab 懒加载（`React.lazy`），避免首屏一次性加载 ~1.6MB 的全部代码。
  同时负责：
  - 浏览器历史管理（返回键回到上一个 Tab，而非直接离站）；
  - 登录态订阅（`subscribeToAuthChanges`）与登录门槛（`LoginRequiredGate`）；
  - 本地数据与云端的同步入口（`syncWithCloudDatabase`）。

### 4.2 核心业务组件

- `components/AssessmentForm/AssessmentForm.tsx`（~3000 行）：表单主组件，收集
  `BusinessFormData` 的全部字段（行业、收入/成本/费用明细、月度流水拆分、现金储备等），
  内置：
  - 实时打分反馈（`LiveHealthGauge.tsx`）；
  - AI 行业推断（触发 `/api/ai/infer-business-structure`）；
  - AI 流水分类（触发 `/api/ai/classify-ledger`，`SmartLedgerEntry.tsx`）；
  - 字段来源标注（`FieldProvenanceBadge.tsx`，对应 Dossier 的溯源概念）。
- `components/AssessmentReport/AssessmentReportView.tsx`（~1700 行）：报告展示，含
  雷达图、Gate 红线结果、逐项指标明细、AI 深度诊断文案（`/api/ai/deep-diagnosis`）。
- `components/AiRuleConsultationDrawer.tsx`（~1100 行）：AI 答疑抽屉，走 SSE 流式接口
  边生成边打字机展示。
- `pages/FeasibilityBriefPage.tsx`：可行性简报（轻量版报告，用于早期/无收入阶段）。
- `pages/ProjectsListPage.tsx`：项目列表（多项目管理、云端同步状态）。
- `pages/LearningCenterPage.tsx`：商业知识学习中心（推荐视频 + 观看进度）。
- `components/ScoringSimulator.tsx` / `PublicScoringStandards.tsx`：打分模拟器与公开评分规则说明
  （直接复用 `scoringEngine.ts` 里的 `SCORING_METRIC_DEFINITIONS` 作为唯一权威来源）。

### 4.3 纯逻辑层（`src/lib/`）

- `scoringEngine.ts`：**确定性打分引擎**，核心是 `runBusinessAssessment(formData)`：
  1. 统一把各币种金额折算为报告主币种（`currencies.ts`）；
  2. 计算毛利/净利/OPEX占比/现金跑道/DSCR 等归一化财务指标；
  3. 6 项加权指标打出 0-100 综合分（`SCORING_METRIC_DEFINITIONS`：真实收入占比 15%、
     毛利率 20%、OPEX 占比 15%、净利率 20%、现金安全垫 15%、持续性 15%）；
  4. 独立跑一票否决的 Gate 红线检查（如 Gate-1 真实收入占比、Gate-5 DSCR 偿债能力），
     Gate 不通过则整体 `overallStatus` 降级，与加权分是两套独立机制；
  5. 输出 `AssessmentReport`：含 `totalScore`、`tier`（AAA~REJECT）、`radarScores`、
     `gates`/`gatePassed`、`metrics`、`normalizedFinancials` 等结构化字段。
- `breakEvenCalculator.ts` / `paybackCalculator.ts`：盈亏平衡点、回本周期计算。
- `costAggregation.ts`：月度成本/费用聚合。
- `anomalyDetection.ts`：数据异常检测（用于流水断点识别等）。
- `ledgerCycle.ts` / `ledgerMapping.ts`：流水记账周期与科目映射，配合 AI 流水分类 Agent。
- `industryBenchmarks.ts` / `inferBusinessStructure.ts`：行业基准数据与结构推断规则。
- `storage.ts`：**本地优先存储 + 云端双写**。localStorage 保存项目/报告/草稿/问答库/
  学习进度；写操作同时异步写 Supabase；用"删除墓碑"（tombstone）机制防止云端旧数据
  在同步合并时把本地已删除的数据复活。
- `supabaseClient.ts`（~900 行）：Supabase 客户端封装（Auth 登录方式：Google OAuth /
  邮箱密码）+ 云端 CRUD（`saveAssessmentToCloud` 等）+ 建表 SQL
  常量 `SUPABASE_DATABASE_SCHEMA_SQL`（含 `projects`、`assessment_reports`、
  `escalated_questions`、`audit_logs`、`agent_runs`、`action_items`、`agent_facts` 等表）。

## 5. 后端结构（`src/server/` + `src/agents/` + `api/`）

### 5.1 进程装配（`server.ts`）

只做三件事：加载环境变量（用 Node 内置 `process.loadEnvFile()`，不用顶层
`import 'dotenv/config'`，避免 Vercel ESM 打包下的 `require('fs')` 崩溃）、
挂载 `registerApiRoutes(app)`、按环境决定是否托管 Vite dev server / 静态资源。
Vercel 部署时本文件只导出 `app`，由 `api/[...path].ts` 引入转发，不在此进程内监听端口。

### 5.2 路由层（`src/server/routes.ts`）

路由只做「解析请求 → 调用 Agent（`runAgent`/`runCoach`）→ 返回产物」，其余横切关注点
（超时、降级、追踪、错误归一化）全部收敛进 `agents/runtime.ts`，避免每个路由各写一份。

现有接口一览：

| 路由 | 用途 | 鉴权 |
|---|---|---|
| `GET /api/health` | 健康检查 + 是否配置 Gemini Key | 无 |
| `GET /api/agents` | 已注册 Agent / Tool 自检清单（只读） | 无 |
| `POST /api/ai/chat`, `/api/ai-consultation` | AI 答疑（一次性 JSON 返回） | 需登录 |
| `POST /api/ai/chat/stream`, `/api/ai-consultation/stream` | AI 答疑（SSE 流式） | 需登录 |
| `POST /api/coach/:intent` | 多 Agent 编排入口，`intent` ∈ `profile\|assess\|ask` | 需登录 |
| `POST /api/agents/:name` | 单个角色直调（联调/回归用，不走编排） | 需登录 |
| `POST /api/ai/infer-business-structure` | AI 行业推断 + 动态成本/费用结构生成 | 需登录 |
| `POST /api/ai/classify-ledger` | AI 流水条目分类到标准会计科目 | 需登录 |
| `POST /api/ai/deep-diagnosis` | 报告页 AI 深度诊断文案（唯一面向用户的自由文本大模型产出，经 Guardian 审核） | 需登录 |
| `POST /api/ai/ocr-estimate` | 流水断点检测与补全（内部已更名 revenueGap，无 AI/OCR，仅保留旧 URL 兼容前端） | 需登录 |

鉴权（`auth.ts`）：校验 Supabase JWT（`supabase.auth.getUser(token)`），未配置
Supabase 时直接放行（与"无 Gemini Key 自动降级"策略一致，不因可选云端能力未配置而
堵死本地开发）；同时做基于用户 ID 的内存级简易限流（60s 窗口 20 次）。

### 5.3 Agent 架构（`src/agents/`）

这是系统的核心分层，采用统一契约 + 分期迁移的方式演进：

**统一契约（`types.ts`）**：每个 `AgentDefinition<I, O>` 必须声明
`claimType`（断言类型）、`tools`、`parseInput`/`run`/`fallback` 三段式，且
**必须有本地降级路径**（`fallback` 非可选，服务弱网用户是硬约束）。

**断言类型（`ClaimType`）**是切分角色的依据（按"生产哪一类断言"切，而非按功能模块切，
避免角色重叠）：

| ClaimType | 含义 | 校验方式 | 对应角色 |
|---|---|---|---|
| `external_fact` | 外部世界事实 | 引用来源 | Scout（属地情报，唯一需 RAG） |
| `project_fact` | 本项目事实 | 用户确认 | Registrar（行业/成本结构推断） |
| `interpretation` | 现状解释 | 引用报告指标 | Interpreter（深度诊断文案） |
| `action` | 未来行动建议 | 模拟验算 | Strategist（杠杆模拟） |
| `change` | 时间变化 | 版本 diff | Tracker（跨版本对比） |
| `conversation` | 对话 | 不产断言 | Coach（编排，唯一对用户说话的角色） |
| `gate` | 能否放行 | 规则校验 | Guardian（合规审查，旁路，只有否决权） |

**现有 Agent 实现**（`AGENTS` 注册表，`index.ts`）：

- `consultation` —— AI 答疑（流式/非流式共用）；
- `businessStructure` —— 行业推断 + 成本结构生成（对应 Registrar 未来角色）；
- `ledgerClassifier` —— 流水条目分类；
- `deepDiagnosis` —— 报告深度诊断文案（唯一大模型自由文本直接面向用户，需过 Guardian）；
- `revenueGap` —— 流水断点检测补全（纯确定性计算，无云端路径，`deterministic: true`）；
- `registrar` / `strategist` / `interpreter` / `tracker` / `scout` —— Phase 2-4 新角色，
  由 `ROLE_AGENTS`（`roles.ts`）索引，供 Coach 编排调用。

**执行运行时（`runtime.ts`）**：`runAgent(agent, rawInput, ctx)` 统一处理
输入校验 → 云端主路径（超时 `timeoutMs`）→ 失败/超时/未配置时捕获
`AgentDegradedError` 转入 `fallback` → 产出 `AgentRunTrace`（`mode`: `gemini` |
`rules` | `deterministic`，是否 `degraded`，耗时等），用于可观测性与后续落库
`agent_runs` 表。

**编排层（Coach，`coach.ts`）**：`runCoach(dossier, intent, ctx, deps)`。

- 按 `businessStage`（`not_started`/`has_prototype`/`has_revenue`）×
  `intent`（`profile`/`assess`/`ask`）查表 `STAGE_PLANS`，只跑该阶段真正需要的角色
  （避免"全量跑一遍"导致弱网用户等待 30 秒以上）；
- 计划内角色**并行**执行（无数据依赖，依赖关系体现在 Dossier 的确认闸门而非调用顺序）；
- 每个角色产物跑完后立即过 **Guardian** 旁路审查，不通过则整份产物丢弃（`blocked`），
  绝不由 Guardian 自己改写内容；
- 通过的角色产物中的 `proposals` 会被路由层统一写入 Dossier 的"待确认区"
  （`applyProposals`），单一写入路径，Agent 自身保持纯函数。

**角色路由表（`roles.ts`）**：`ROLE_AGENTS` 定义角色到 Agent 实现的映射；
`inputForRole(role, dossier)` 负责从 Dossier 为每个角色组装输入 ——
**这里是"确认闸门"真正落地的地方**：所有需要财务数据的角色，拿到的都是
`confirmedFormOnly()`（只含用户已确认字段）的表单，杜绝未确认的 AI 建议值
沿链传导污染下游判断。`authoritativeForRole` 则为 Guardian 提供确定性引擎现算的
权威数值（分数、杠杆增益、合法指标锚点），作为"数值一致性"审查的比对基准。

**Dossier（`dossier.ts`）—— 带字段级溯源的项目档案**：

- 不替换既有 `BusinessFormData`（已是事实上的项目状态），而是原样保留 + 平行挂一份
  溯源表：`ProjectDossier = { form, provenance, suggestions, externalFacts }`；
- 字段可信度三态：`confirmed`（用户已确认/亲手填写，唯一允许进入评分引擎的状态）、
  `suggested`（Agent 建议值，待确认）、`estimated`（系统推算占位值，待核对）；
- **Agent 唯一被允许的写入方式是 `proposeValue`**：只写入 `suggestions`，绝不碰
  `provenance`/`form`，因此任何一条 AI 幻觉数字在用户亲自确认前都无法进入评分引擎；
- 历史数据无溯源记录时缺省视为 `confirmed`（否则存量项目会在迁移后"零确认字段"而得 0 分）。

**Guardian（`guardian.ts`）—— 只有否决权的合规官**：

审查四件事：① 数值是否与确定性引擎一致（模型是否偷改分数/增益）；② 有无越界承诺
（投融资建议、收益保证——用正则模式库 `OVERREACH_PATTERNS` 检测）；③ 敏感地区脱敏是否被违反；
④ 有无 PII 外泄（邮箱/电话号正则检测）。产出 `pass` 或 `block + reasons`，
**拦下来就整份丢弃退回，绝不自己改写内容**（避免"用一个可能幻觉的 Agent 去修正
另一个 Agent"）。`routes.ts` 里 `applyGuardianVerdict` 会按 `violation.path` 精确定位到
具体是哪条建议/字段越界，只摘掉那一条而不是一票否决整份诊断。

**其他支撑模块**：`tools.ts`（Tool Registry，声明式暴露确定性引擎给 Agent 调用，
如 `runBusinessAssessment`）、`levers.ts`（杠杆模拟目录，供 Strategist 做行动方案的
"模拟验算"）、`trace.ts`（可插拔的追踪 sink）、`scout.ts`（属地情报知识源接口）。

### 5.4 Gemini 调用层（`gemini.ts`）与本地兜底（`localEngine/`）

- `getGeminiClient()`：懒加载 `GoogleGenAI` 客户端，无 Key（或占位 Key）时返回 `null`；
- 429 配额超限后进入 90 秒冷却期，冷却期内直接跳过云端请求，避免每次提问都白等一次
  注定失败的调用；
- 503（"高负载"）视为瞬时性错误，与配额耗尽/鉴权失败等永久性错误区分对待；
- `src/server/localEngine/`：`fallback.ts`（本地规则问答兜底）、`knowledge.ts`（规则知识库）、
  `videos.ts`（学习视频推荐匹配），构成 Gemini 不可用时的完整可用体验，而非报错占位。

### 5.5 Vercel 适配（`api/`）

- `api/[...path].ts`：通配所有 `/api/*` 请求，引入 `server.ts` 导出的 Express `app` 转发处理；
- `api/health.ts`：独立的健康检查 file-based function（Vercel 上 `/api/health`
  由它直接服务，不经过 `routes.ts`，响应体需与 `routes.ts` 里的版本保持一致）；
- `api/ai-consultation.ts`：兼容旧路径的独立入口。

## 6. 核心数据流示例

### 6.1 用户填表 → 本地实时打分

```
AssessmentForm 用户输入
   → 前端直接调用 scoringEngine.runBusinessAssessment()（纯本地计算，无网络请求）
   → LiveHealthGauge 实时展示分数/等级变化
```

### 6.2 提交生成正式报告 + AI 深度诊断

```
用户提交表单
   → 前端计算权威 AssessmentReport（scoringEngine）
   → POST /api/ai/deep-diagnosis（带上表单与报告，供 Agent 生成解释性文案）
   → deepDiagnosis Agent：Gemini 生成 or 本地规则兜底
   → Guardian 审查（数值一致性 / 越界承诺 / PII / 敏感地区脱敏）
   → 未通过的字段被剔除或替换为安全占位文案，其余原样返回
   → AssessmentReportView 渲染：确定性数值（雷达图/Gate/指标） + AI 解释文案
   → storage.ts 保存报告到 localStorage，异步双写 Supabase
```

### 6.3 多 Agent 编排（Coach）

```
POST /api/coach/:intent  { form, provenance, suggestions, externalFacts }
   → dossierFromForm() 重建 ProjectDossier
   → runCoach()：按 businessStage × intent 查 STAGE_PLANS 决定跑哪些角色
   → 计划内角色并行 runAgent()（各自走云端/本地降级）
   → 逐个产物过 guardianReview()，未通过者整份丢弃进 blocked[]
   → 通过角色的 proposals 统一 applyProposals() 写入 Dossier 待确认区
   → 响应：{ artifacts, ran, skipped, blocked, traces, pendingConfirmations, suggestions }
   → 前端展示待确认建议，用户确认后才会进入 confirmedFormOnly()，供下一轮评分/编排使用
```

### 6.4 AI 答疑（流式）

```
AiRuleConsultationDrawer 提问
   → POST /api/ai/chat/stream (SSE)
   → 有 Gemini 且未在配额冷却：generateContentStream 边生成边 sendEvent({type:'chunk'})
   → 结束时补发 {type:'done', category, suggestedAction, recommendedVideos, ...}
     （分类/推荐元数据始终来自本地规则引擎的确定性分类逻辑，不依赖 Gemini 的结构化输出，
      因为流式场景下半截 JSON 本来也没法增量解析）
   → Gemini 不可用/失败：本地兜底文本按 24 字切块模拟打字机效果推送
```

## 7. 数据存储

- **本地优先**：`localStorage` 保存项目（`bam_projects_v14`）、报告
  （`bam_reports_v14`）、草稿、AI 问答升级库、学习进度，离线/弱网可用。
- **云端持久化**（Supabase Postgres，表结构定义在 `supabaseClient.ts` 的
  `SUPABASE_DATABASE_SCHEMA_SQL`）：
  - `projects` / `assessment_reports`：项目与报告主数据；
  - `escalated_questions`：AI 答疑中被升级为"待规则库完善"的边缘问题；
  - `audit_logs`：Guardian 拦截记录等审计日志；
  - `agent_runs`：每次 Agent 调用的执行记录（`AgentRunTrace` 落库位置）；
  - `action_items`：行动项/待办；
  - `agent_facts`：跨会话的长期记忆（如用户否决过的杠杆、上一版报告等，供
    Tracker/Strategist 读取）。
- **同步机制**：写操作本地同步写入 + 异步云端双写；用"删除墓碑"防止云端旧数据
  在同步合并时复活已删除的本地数据。
- **鉴权**：Supabase Auth（Google OAuth / 邮箱密码），前端持有 session，
  后端用 anon key 校验 JWT，不在服务端自行解码。

## 8. 关键工程约束（避免踩坑）

- `package.json` 必须保留 `"type": "module"`（Vercel ESM 打包要求）；
- 不能顶层 `import 'dotenv/config'`（ESM 打包下会触发动态 `require('fs')` 崩溃），
  改用 `process.loadEnvFile()`；
- 环境变量：前端(Vite) 读 `VITE_*`/`NEXT_PUBLIC_*`；服务端按
  `SUPABASE_*` → `NEXT_PUBLIC_*` → `VITE_*` 依次回退；
- 无 `GEMINI_API_KEY` 属预期行为，AI 问答自动降级本地规则库；
- `firebase-blueprint.json`、`firestore.rules` 是迁移到 Supabase 前的遗留文件，未接入。

## 9. 后续演进方向（Agent 分期路线图）

`src/agents/index.ts` 顶部注释标注了分期计划：

- **Phase 0**（已完成）：把既有 4 个 AI 接口装进统一 Agent 契约；
- **Phase 1**（已完成）：Coach 编排层接管全部对用户输出；
- **Phase 2**（进行中/已部分落地）：Registrar（合并 businessStructure + revenueGap +
  anomalyDetection）、Strategist（带杠杆模拟验算）；
- **Phase 3**：Interpreter（从 deepDiagnosis 拆出）、Tracker（跨版本变化）、
  Guardian（合规审查，已实现）；
- **Phase 4**：Scout（属地情报，全系统唯一需要 RAG 的角色，已有基础实现）。

新增/修改 Agent 行为前建议先看 `src/agents/index.ts` 顶部注释，避免重复实现
已规划到其他角色里的能力。
