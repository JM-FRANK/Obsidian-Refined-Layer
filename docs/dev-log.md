# v0.2.0 开发日志

## D36 开发日志

### Current status

v0.2.0 Phase 9 启动。D1-D35（v0.1.0）已归档至 `docs/achieve/dev-log-achieve.md`（465 行，54KB）。新活跃日志从 D36 开始。

### Active summary
- Date: 2026-05-05
- Scope: 文档归档衔接与 v0.2.0 开发基线（D36）
- Reason: 建立 v0.2.0 的活跃文档路径，分离历史日志与新开发日志
- Change:
  - 确认 `docs/achieve/dev-log-achieve.md` 作为历史日志存档（D1-D35）
  - 创建新 `docs/dev-log.md` 作为 v0.2.0 活跃日志
  - AGENTS.md 已包含滑动窗口检索协议（§3），不要求完整读取历史日志
  - AGENTS.md 已包含 v0.2.0 架构书路径引用（§2）
  - README.md 无旧路径引用
- Verification: `npm run typecheck` 通过；未运行 `npm test`，本任务仅调整文档路径与日志基线
- Next: D37 — 定义 v0.2.0 核心类型与设置结构

### v0.2.0 起始状态

- v0.1.0 已交付并归档：固定 `raw-refined` 单笔记工作流，硬编码 `## 原始内容` section
- 当前代码基线：17 个 test 文件，typecheck 通过
- 分层架构：Core / Application / Adapters / UI / Runtime / Settings
- 设置结构：PluginSettings（language, historyLimit, draftFolder, provider, promptOverrides）
- 旧类型：RawRefinedProposal（7 固定 sections）、ProposalSession（v1 格式）、UserDecision（add/remove tags）
- 目标：将固定 section 模型升级为可配置 A/B 分块模型
- 下一阶段：Phase 9 → Phase 10 → Phase 11 → Phase 12 → Phase 13 → Phase 14 → Phase 15

---

## D37 开发日志

### Current status

v0.2.0 核心类型骨架已落地。当前代码在保留 v0.1.0 兼容类型的基础上，新增 A/B 分块配置、v2 proposal、v2 user decision、v2 session/cache/error attempt 类型，以及 rawRefined 工作流设置结构。旧固定 section 流程暂未迁移，现有测试继续通过。需要注意：`tagNormalizationApplied` 应作为本地 normalization/session metadata 记录，不应进入 LLM 原始输出 schema。

### Active summary
- Date: 2026-05-05
- Scope: 定义 v0.2.0 核心类型与设置结构
- Reason: 建立 v0.2.0 的类型骨架，为后续可配置 A/B 分块、tag 白名单、session/error cache 提供类型基础
- Change:
  - 新增 `src/core/profile/BlockConfig.ts`：ABlockConfig（id/name/heading/headingLevel/prompt/order/enabled），BBlockConfig（id="original-content"/name/heading/headingLevel/required）；B 类分块位置当前由 Markdown 中实际 B heading 位置决定，settings 中暂不单独保存 position/order；后续若需要"统一设定位置"，必须显式扩展 BBlockConfig
  - `src/core/proposal/Proposal.ts`：新增 ABlockProposal、RawRefinedProposalV2：blocks[] + tagSuggestion selectedTags/newTagSuggestions；`tagNormalizationApplied` 当前作为 RawRefinedProposalV2 的可选字段存在，但按架构规范应作为本地 normalization/session metadata 记录，不属于 LLM 原始输出字段 — **后续需修正**：将 `tagNormalizationApplied` 从 LLM 输出 schema 中移除，仅保留在 ProposalValidationResult / session metadata 中
  - `src/core/review/UserDecision.ts`：新增 UserDecisionV2（acceptBlocks: Record<string, boolean> + acceptTags.add）
  - `src/runtime/ProposalSession.ts`：新增 ProposalSessionV2、ProposalValidationResult、FailedAttemptRecord、SessionCacheSettings、ErrorSessionCacheSettings，及对应 Persisted 类型
  - `src/settings/PluginSettings.ts`：新增 RawRefinedWorkflowSettings（protectH1/aBlocks/bBlock/tagWhitelist/tagPrompt/promptObservationEnabled），DEFAULT_A_BLOCKS（7 个 A 类默认配置）、DEFAULT_B_BLOCK、DEFAULT_TAG_WHITELIST
  - 旧类型（RawRefinedProposal、ProposalSession、UserDecision）全部保留作为兼容层
- Verification: typecheck 通过，旧 97 个测试不受影响
- Next: D38 — 设置默认值、数据迁移与 sanitize 策略

---

## D38 开发日志

### Current status

v0.2.0 设置默认值、迁移与 sanitize 白名单已完成。旧 `historyLimit` 可迁移到 `sessionCache.limit`，显式 `sessionCache` 设置优先；新增 `rawRefined`、`sessionCache`、`errorSessionCache` 字段可被安全持久化。provider 仍只允许保存 `type/model/secretRef/baseUrl`，真实 API key 不进入 data.json。当前 `sessionCache.limit` 默认值应为 5，`errorSessionCache.enabled` 默认开启，`errorSessionCache.limit` 默认值应为 30。

### Active summary
- Date: 2026-05-05
- Scope: 设置默认值、数据迁移与 sanitize 白名单更新
- Reason: 确保旧 data.json 可平滑迁移到 v0.2.0，新增字段有合理默认值，sanitize 继续阻断 secret 泄露
- Change:
  - `mergeSettings()`：合并 rawRefined/sessionCache/errorSessionCache 默认值；historyLimit → sessionCache.limit 自动迁移（sessionCache 显式设置优先）
  - `sanitizeSettings()`：白名单包含所有 v0.2.0 字段（rawRefined/sessionCache/errorSessionCache），provider whitelist 仅允许 type/model/secretRef/baseUrl
  - `sessionCache.limit` 默认 5；`errorSessionCache.enabled` 默认 true；`errorSessionCache.limit` 默认 30
  - 测试更新：新增 sanitize v0.2.0 字段测试、historyLimit 迁移测试、sessionCache 优先级测试（17 文件 97 tests 全部通过）
- Verification: typecheck 通过，build 通过，全量测试通过（97 passed）
- Next: Phase 10 D39 — 实现 HeadingParser 与保护一级标题规则

---

## D39 开发日志

### Current status

HeadingParser 与 BlockConfigValidator 已实现。HeadingParser 可识别 H1-H6 ATX heading、跳过 frontmatter 定位 firstH1；暂不支持 Setext heading（已记录）。BlockConfigValidator 检查 A/B block headingLevel 合法性（1-6 范围）与 protectH1 规则（开启时 minLevel=2，关闭时 minLevel=1）。现有 v0.1.0 固定 section 流程不受影响，apply 写入逻辑未改动。

### Active summary
- Date: 2026-05-05
- Scope: 实现 HeadingParser 与 BlockConfigValidator（Phase 10 首任务）
- Reason: Phase 10 目标是用可配置 A/B 分块模型替代固定 `## 原始内容` 模型，HeadingParser 是分块解析的基础能力
- Change:
  - 新增 `src/core/markdown/HeadingParser.ts`：ATX heading 识别（`^(#{1,6})\s+(.+?)(?:\s+#+\s*)?$`），解析 level/text/lineIndex/charStart/charEnd；跳过 frontmatter 定位 firstH1；heading text trim；空 heading 返回 null；不处理 Setext heading（显式记录）
  - 新增 `src/core/profile/BlockConfigValidator.ts`：校验 A/B block headingLevel 1-6 范围（invalid-heading-level），protectH1=true 时阻止 level=1（a/b-block-heading-level-too-low），校验重复 A block ID（duplicate-a-block-id），校验空 A block 列表（no-a-blocks）；范围检查优先于 minLevel 检查，避免 0/-1/99 被误判为 protectH1 违规
  - 新增 `tests/core/markdown/HeadingParser.test.ts`（15 tests）：H1-H6 解析、trim、closing # 剥离、无空格拒绝、空文本拒绝、7+# 拒绝、Setext 不解析、firstH1 定位/frontmatter 跳过/多 H1/无 H1、无 frontmatter、空输入、重复 heading、代码围栏无感知
  - 新增 `tests/core/profile/BlockConfigValidator.test.ts`（14 tests）：protectH1 true/false 下 A/B block level=1 行为、无效 level (0/7/-1/99)、重复 ID、空列表、多错误聚合
- Verification: `npm run typecheck` 通过；`npm test` 19 files / 126 tests 全部通过（新增 29 tests）；`npm run build` 通过
- Next: D40 — 实现 B 类分块提取器（BlockExtractor 或改造 ProtectedRegionExtractor）
