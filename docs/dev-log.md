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
- Verification: typecheck 通过，build 不受影响
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

### Active summary
- Date: 2026-05-05
- Scope: 定义 v0.2.0 核心类型与设置结构
- Reason: 建立 v0.2.0 的类型骨架，为后续可配置 A/B 分块、tag 白名单、session/error cache 提供类型基础
- Change:
  - 新增 `src/core/profile/BlockConfig.ts`：ABlockConfig（id/name/heading/headingLevel/prompt/order/enabled），BBlockConfig（id="original-content"/name/heading/headingLevel/required）
  - `src/core/proposal/Proposal.ts`：新增 ABlockProposal、RawRefinedProposalV2（blocks[] + tagSuggestion selectedTags/newTagSuggestions + tagNormalizationApplied）
  - `src/core/review/UserDecision.ts`：新增 UserDecisionV2（acceptBlocks: Record<string, boolean> + acceptTags.add）
  - `src/runtime/ProposalSession.ts`：新增 ProposalSessionV2、ProposalValidationResult、FailedAttemptRecord、SessionCacheSettings、ErrorSessionCacheSettings，及对应 Persisted 类型
  - `src/settings/PluginSettings.ts`：新增 RawRefinedWorkflowSettings（protectH1/aBlocks/bBlock/tagWhitelist/tagPrompt/promptObservationEnabled），DEFAULT_A_BLOCKS（7 个 A 类默认配置）、DEFAULT_B_BLOCK、DEFAULT_TAG_WHITELIST
  - 旧类型（RawRefinedProposal、ProposalSession、UserDecision）全部保留作为兼容层
- Verification: typecheck 通过，旧 97 个测试不受影响
- Next: D38 — 设置默认值、数据迁移与 sanitize 策略

---

## D38 开发日志

### Active summary
- Date: 2026-05-05
- Scope: 设置默认值、数据迁移与 sanitize 白名单更新
- Reason: 确保旧 data.json 可平滑迁移到 v0.2.0，新增字段有合理默认值，sanitize 继续阻断 secret 泄露
- Change:
  - `mergeSettings()`：合并 rawRefined/sessionCache/errorSessionCache 默认值；historyLimit → sessionCache.limit 自动迁移（sessionCache 显式设置优先）
  - `sanitizeSettings()`：白名单包含所有 v0.2.0 字段（rawRefined/sessionCache/errorSessionCache），provider whitelist 仅允许 type/model/secretRef/baseUrl
  - 测试更新：新增 sanitize v0.2.0 字段测试、historyLimit 迁移测试、sessionCache 优先级测试（17 文件 97 tests 全部通过）
- Verification: typecheck 通过，build 通过，全量测试通过（97 passed）
- Next: Phase 10 D39 — 实现 HeadingParser 与保护一级标题规则
