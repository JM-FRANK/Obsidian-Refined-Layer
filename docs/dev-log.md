## D1 开发日志

### Current status

仓库已完成 Obsidian 插件最小骨架初始化，包含 `manifest.json`、`package.json`、`tsconfig.json`、`esbuild.config.mjs`、`src/main.ts`、`styles.css`。插件入口当前仅负责 `onload` / `onunload` 和 `Refine current note` 命令注册；执行命令只弹出 Notice，不读取也不写入任何笔记文件。已安装依赖并验证 `npm run build` 可生成插件入口产物。另已补充最小 git 忽略规则、Vitest 测试脚本与 `tests/` 目录约定。

### Active summary
- Date: 2026-05-04
- Scope: D1 / `manifest.json`、`package.json`、`tsconfig.json`、`esbuild.config.mjs`、`src/main.ts`、`styles.css`
- Reason: 按日计划完成可加载、可构建、无文件写入的 Obsidian 插件初始化
- Change: 建立最小插件清单与 TypeScript/esbuild 构建链路，实现插件装载生命周期与 `Refine current note` 命令占位
- Verification: 运行 `npm install`；运行 `npm run typecheck`、`npm run build`、`npm test` 成功
- Next: 进入 D2，建立建议目录结构与核心类型空壳，并在 `tests/` 下按模块镜像增加对应单元测试

## D2 开发日志

### Current status

仓库已按 Phase 1 边界建立最小目录结构与核心类型空壳。`src/core`、`src/application`、`src/adapters`、`src/runtime`、`src/ui`、`src/settings` 已落下实际文件；`WorkflowProfile`、`RawRefinedProposal`、`ProposalSession`、`UserDecision`、`ApplyPlan`、`TokenUsageReport`、`RefinedLayerToolPort` 已可被 import。`PolicyGuard` 目前为仅做透传的空壳类，用于固定后续请求入口形状。`main.ts` 仍只负责命令注册和 use case 装配，不承载 workflow 规则，也没有任何写文件逻辑。

### Active summary
- Date: 2026-05-04
- Scope: D2 / `src/core/**`、`src/application/RefinedLayerToolPort.ts`、`src/runtime/ProposalSession.ts`、`src/ui/review/ReviewViewModel.ts`、`src/settings/PluginSettings.ts`
- Reason: 完成 Phase 1 的工程目录边界和核心类型入口，避免后续功能直接堆进 `main.ts`
- Change: 新增核心类型文件、Internal Tool Port 接口、`PolicyGuard` 空壳，并显式建立 `src/ui` 等目录边界
- Verification: 运行 `npm run typecheck`、`npm run build` 成功
- Next: 进入 D3，接通 active note 读取与 `CheckEligibilityUseCase` 空流程

## D3 开发日志

### Current status

Phase 1 已完成。插件命令现在会通过 `ObsidianNoteRepository -> CheckEligibilityUseCase` 读取当前 active file，并在不写入任何文件的前提下返回三类结果：无活动文件、活动文件非 Markdown、活动 Markdown 笔记的路径/标题/原始内容长度。`main.ts` 仍仅负责插件装载、依赖装配和结果提示；workflow 规则、真实 eligibility 判断、proposal 生成和写入逻辑均未提前实现。仓库同时补充了最小单元测试，覆盖 `CheckEligibilityUseCase` 的三条基础路径。

### Active summary
- Date: 2026-05-04
- Scope: D3 / `src/application/CheckEligibilityUseCase.ts`、`src/adapters/obsidian/ObsidianNoteRepository.ts`、`src/main.ts`、`tests/smoke.test.ts`
- Reason: 完成 Phase 1 对 active markdown note 读取能力的要求，并让命令真正经过 application/use case
- Change: 实现 active file 读取、Markdown 文件判定、内容长度返回，以及命令侧明确提示无活动文件/非 Markdown 文件/有效 Markdown 笔记
- Verification: 运行 `npm run typecheck`、`npm run build`、`npm test` 成功
- Next: Phase 1 验收已满足；下一步如继续则进入 D4，实现 `raw-refined` profile 与初版 eligibility 规则

## D4 开发日志

### Current status

仓库已实现 `raw-refined` profile，并将 eligibility 判定切换为 profile 驱动。`CheckEligibilityUseCase` 现在会检查 frontmatter 是否存在、`status` 是否为 `raw`、是否存在精确标题行 `## 原始内容`，并返回结构化失败原因 `missingFrontmatter`、`invalidStatus`、`missingOriginalContentHeading`。命令仍只读当前 note 并展示结果，不写文件。

### Active summary
- Date: 2026-05-04
- Scope: D4 / `src/core/profile/WorkflowProfile.ts`、`src/core/profile/rawRefinedProfile.ts`、`src/core/profile/FrontmatterParser.ts`、`src/application/CheckEligibilityUseCase.ts`、`src/main.ts`
- Reason: 将 Phase 1 的 active note 读取升级为真实的 `raw-refined` eligibility 判定
- Change: 扩展 `WorkflowProfile` 结构，新增 `rawRefinedProfile` 与最小 frontmatter parser，并让 `CheckEligibilityUseCase` 输出 profile 驱动的 eligibility 结果
- Verification: 运行 `npm run typecheck`、`npm test`、`npm run build` 成功
- Next: 进入 D5，实现 protected region 提取与 hash 工具

## D5 开发日志

### Current status

已实现 `ProtectedRegionExtractor`、`ProtectedRegion` 类型和文本 hash 工具。当前仅支持 `from-heading-to-end` 模式；`between-headings` 仍只保留在类型层，不进入实现。提取逻辑会对 `missing heading`、`multiple heading`、`empty protected region`、`unsupported mode` 返回明确错误，并在成功时逐字保留原文换行，包括 `CRLF`。

### Active summary
- Date: 2026-05-04
- Scope: D5 / `src/core/protected-region/ProtectedRegion.ts`、`src/core/protected-region/ProtectedRegionExtractor.ts`、`src/core/protected-region/hash.ts`
- Reason: 为后续 apply freshness/protected region 保护与内容校验建立基础能力
- Change: 新增 protected region 提取器与 `sha256` 文本 hash 工具，明确了 heading 缺失、多次出现、空保护区和未实现 mode 的行为
- Verification: 运行 `npm run typecheck`、`npm test`、`npm run build` 成功
- Next: 进入 D6，实现 ProposalValidator 的 JSON 与 schema 校验

## D6 开发日志

### Current status

已实现 `ProposalValidator` 的前两层：JSON 解析和 schema 校验。validator 现在会先尝试纯 JSON 解析，失败后再尝试提取 fenced JSON block；仍失败则返回 `invalid-json`。schema 层会校验 `workflowProfileId`、`refinedSections` 必填字段和基础字段类型；失败时只返回结构化错误，不生成 session。

### Active summary
- Date: 2026-05-04
- Scope: D6 / `src/core/proposal/Proposal.ts`、`src/core/proposal/ProposalValidator.ts`
- Reason: 为 proposal 接入建立第一版分层校验，阻止无效输出进入后续流程
- Change: 将 `RawRefinedProposal` 调整为 `refinedSections/frontmatterSuggestion/tagSuggestion/warnings` 结构，并实现 JSON 提取与 schema 校验错误模型
- Verification: 运行 `npm run typecheck`、`npm test`、`npm run build` 成功
- Next: 进入 D7，补齐 policy 和 content 校验

## D7 开发日志

### Current status

Phase 2 已完成。`ProposalValidator` 现已具备 JSON / schema / policy / content 四层校验：会拒绝只读或未知 YAML 字段、拒绝未在 allow-list 内的标签、拒绝 `#rel/*`、拒绝 `link/moc/rename/move/archive/delete` 相关字段，并在给定 protected region 上下文时拒绝 proposal 泄漏 `## 原始内容` 受保护文本。当前仓库仍未实现 session 创建，因此校验失败天然不会进入 `ProposalSession`；这与 Phase 2 的边界一致。

### Active summary
- Date: 2026-05-04
- Scope: D7 / `src/core/proposal/ProposalValidator.ts`、`tests/core/proposal/ProposalValidator.test.ts`
- Reason: 完成 profile policy 与内容边界的第二阶段防线，确保 LLM 输出不能越权或污染受保护区域
- Change: 增加 frontmatter/tag/capability/content 校验，明确 `PolicyGuard` 负责请求入口，`ProposalValidator` 负责 proposal 载荷本身的层叠校验
- Verification: 运行 `npm run typecheck`、`npm test`、`npm run build` 成功
- Next: Phase 2 验收已满足；下一步如继续则进入 D8，实现 `MockLlmProvider` 与 `CreateProposalUseCase`

## D8 开发日志

### Current status

已实现 `LlmProvider` 接口、`MockLlmProvider` 和 `CreateProposalUseCase`。当前 `Refine current note` 命令会读取 active note、先走 eligibility、再调用 mock provider 生成 JSON proposal，并且 proposal 必须经过 `ProposalValidator` 才会继续。非法 note 不会调用 provider，validator 失败也不会继续创建 session、不会打开 Review UI、不会写文件。

### Active summary
- Date: 2026-05-04
- Scope: D8 / `src/adapters/llm/LlmProvider.ts`、`src/adapters/llm/MockLlmProvider.ts`、`src/application/CreateProposalUseCase.ts`、`src/main.ts`
- Reason: 建立 Phase 3 的 mock proposal 生成链路，验证 profile/validator 之后的最小闭环
- Change: 新增 mock provider、prompt variable 输入结构，并实现 `CreateProposalUseCase: note -> eligibility -> protected region -> mock proposal -> validator`
- Verification: 运行 `npm run typecheck`、`npm test`、`npm run build` 成功
- Next: 进入 D9，实现 `ProposalSessionStore` 与 history limit

## D9 开发日志

### Current status

已实现 `ProposalSessionStore`，当前采用运行时内存存储，不写入 vault 或插件配置文件。每次合法 proposal 创建后都会生成 `ProposalSession`，包含 `notePath`、`noteTitle`、`baseFileHash`、`baseFrontmatterHash`、`baseProtectedRegionHash`、`workflowProfileId`、`policySnapshotId`、`proposal`、`tokenUsage`。store 支持按 `notePath` 查询最近 session 和列出同一 note 的 session history，并在超出 `historyLimit` 时清理旧 session；默认限制为 `5`。

### Active summary
- Date: 2026-05-04
- Scope: D9 / `src/runtime/ProposalSessionStore.ts`、`src/runtime/ProposalSession.ts`、`src/application/CreateProposalUseCase.ts`
- Reason: 为 proposal 恢复、连续生成和后续 review 状态恢复建立最小运行态缓存
- Change: 新增按 `notePath` 分组的 session store、默认 `historyLimit=5`、旧 session 淘汰逻辑，并在创建 proposal 时自动保存 session
- Verification: 运行 `npm run typecheck`、`npm test`、`npm run build` 成功
- Next: 进入 D10，补 token usage mock 与 session 恢复命令

## D10 开发日志

### Current status

Phase 3 已完成。`MockLlmProvider` 现在返回 mock `TokenUsageReport`，`ProposalSession` 会保存 `tokenUsage`；同时新增 `Reopen last proposal for current note` 命令，当前只读取 session 并弹出 notice，不打开 Review UI。`TokenUsageReport` 类型已经能够承载 `actual / estimated / mixed / unavailable`，因此后续真实 provider 和估算流程可以复用当前 session 数据模型。当前 session 恢复仍是运行时内存级别，适用于本阶段的最小闭环验证。

### Active summary
- Date: 2026-05-04
- Scope: D10 / `src/core/proposal/TokenUsageReport.ts`、`src/adapters/llm/MockLlmProvider.ts`、`src/main.ts`、`tests/runtime/ProposalSessionStore.test.ts`、`tests/application/CreateProposalUseCase.test.ts`
- Reason: 完成 token usage mock 落库和当前 note 的最近 session 恢复入口
- Change: 扩展 token usage 字段结构、在 session 中保存 usage，并新增“恢复当前笔记最近 proposal”命令与对应测试
- Verification: 运行 `npm run typecheck`、`npm test`、`npm run build` 成功
- Next: Phase 3 验收已满足；下一步如继续则进入 D11，实现 i18n 字符串表与 `ReviewViewModel`

## D11 开发日志

### Current status

已实现最小 i18n 字符串表与 `ReviewViewModel` 映射。`ReviewViewModel` 现在可以从 `ProposalSession` 生成 refined 正文预览、frontmatter/tag 建议、warnings、token usage 和默认全未选中的 `UserDecision` 初始值。`ReviewModal` 所需的用户可见文本已通过 i18n key 提供，不在 review 组件中硬编码显示文案。当前仅从 `settings.language` 读取语言，不实现独立语言切换 UI。

### Active summary
- Date: 2026-05-04
- Scope: D11 / `src/ui/i18n/index.ts`、`src/ui/i18n/zh-CN.ts`、`src/ui/i18n/en.ts`、`src/ui/review/ReviewViewModel.ts`、`src/core/review/UserDecision.ts`
- Reason: 为 Review UI 建立稳定的数据投影和双语文案入口
- Change: 新增 zh-CN / en 字符串表、`t()` 函数、`ReviewViewModel` 映射函数，并将 `UserDecision` 调整为 review-first 结构
- Verification: 运行 `npm run typecheck`、`npm test`、`npm run build` 成功
- Next: 进入 D12，实现 `ObsidianReviewGate` 与 `ReviewModal` 静态预览

## D12 开发日志

### Current status

已实现 `ObsidianReviewGate` 和 `ReviewModal`。当前 mock proposal 生成成功后会通过 `RequestReviewUseCase -> ReviewGate -> ReviewModal` 打开最小审核弹窗，展示 refined 正文预览、YAML 建议、tag 建议、token usage、warnings。Review UI 只消费 `ReviewViewModel`，不做 validation、不拼 protected region、不生成 ApplyPlan、不写文件。样式使用 Obsidian CSS variables，适配 light/dark theme 的可读性基础要求。

### Active summary
- Date: 2026-05-04
- Scope: D12 / `src/application/RequestReviewUseCase.ts`、`src/ui/review/ObsidianReviewGate.ts`、`src/ui/review/ReviewModal.ts`、`styles.css`
- Reason: 将 Phase 3 的 mock proposal 从 notice 提升到 review-first UI 预览
- Change: 新增 ReviewGate 抽象接线和 Modal 渲染，实现 ReviewModal 静态预览与 theme 变量样式
- Verification: 运行 `npm run typecheck`、`npm test`、`npm run build` 成功
- Next: 进入 D13，补齐 `UserDecision` 交互与 Save as Draft 占位

## D13 开发日志

### Current status

`ReviewModal` 已支持生成 `UserDecision`。正文、status/source/context、tag add/remove 都映射为独立 checkbox，默认全部未选中；点击 `Apply selected changes` 只会生成并提示 `UserDecision`，不会写文件；点击 `Save as Draft` 只会触发占位回调并提示当前仍不写文件。当前 note 的最近 session 恢复命令现在也会打开 ReviewModal，便于在不写文件的前提下重看 proposal。

### Active summary
- Date: 2026-05-04
- Scope: D13 / `src/ui/review/ReviewModal.ts`、`src/ui/review/ObsidianReviewGate.ts`、`src/main.ts`
- Reason: 完成 review-first UI 的部分接受与占位动作交互
- Change: 将 UI 控件与 `UserDecision` 字段逐项映射，默认全未接受，并为 Apply / Save as Draft 接上纯占位行为
- Verification: 运行 `npm run typecheck`、`npm test`、`npm run build` 成功
- Next: 进入 D14，实现最小 SettingsTab 与 prompt override 存储

## D14 开发日志

### Current status

Phase 4 已完成。已实现最小 `SettingsTab` 和 `ObsidianSettingsStore`：支持保存 `language`、`historyLimit`、`draftFolder`，并提供 `raw-refined` profile 的 `systemPrompt` / `userPrompt` override textarea。可用变量以静态文本展示，不实现自动补全、语法高亮、复杂校验或 profile 编辑器。prompt override 现在按 `profileId = raw-refined` 存在 `promptOverrides` 中，符合 profile-specific override 的边界要求。

### Active summary
- Date: 2026-05-04
- Scope: D14 / `src/adapters/obsidian/ObsidianSettingsStore.ts`、`src/settings/PluginSettings.ts`、`src/ui/settings/SettingsTab.ts`、`src/main.ts`
- Reason: 为 review UI 提供最小配置入口，并把设置持久化放回 Obsidian adapter 边界内
- Change: 新增设置默认值、Obsidian 数据存储适配器、SettingsTab 与 profile-specific prompt override 保存逻辑，同时让 `historyLimit` 在运行时热更新
- Verification: 运行 `npm run typecheck`、`npm test`、`npm run build` 成功
- Next: Phase 4 验收已满足；下一步如继续则进入 D15，实现 `ApplyPlanner` 与 `BuildApplyPlanUseCase`

## D15 开发日志

### Current status

已实现 `ApplyPlanner`、`ApplyPlan` 和 `BuildApplyPlanUseCase`。当前 `ApplyPlan` 是唯一的写入计划入口，只允许 `replace-refined-body`、`update-frontmatter`、`update-tags` 三种 operation；`rename/move/link/moc/archive/delete` 不会进入计划。`BuildApplyPlanUseCase` 会先读取 session 和当前 note，再根据 `UserDecision` 仅生成用户明确接受的 operation，并通过 `PolicyGuard` 统一经过入口。

### Active summary
- Date: 2026-05-04
- Scope: D15 / `src/core/apply/ApplyPlan.ts`、`src/core/apply/ApplyPlanner.ts`、`src/application/BuildApplyPlanUseCase.ts`
- Reason: 为后续安全写入建立唯一可审计的写入计划层
- Change: 定义三种合法 apply operation，并实现 `UserDecision -> ApplyPlan` 的转换与最小 use case
- Verification: 运行 `npm run typecheck`、`npm test`、`npm run build` 成功
- Next: 进入 D16，实现 `replace-refined-body` 的安全正文组装

## D16 开发日志

### Current status

已实现 `BodyAssembler`。当前 apply 前会重新读取当前文件，从当前文件提取 `## 原始内容` protected region，并使用 proposal sections 重新组装 refined 正文，再拼接当前文件中的 protected region 原文。组装结果在内存中完成，且以“新正文必须逐字以当前 protected region 结尾”的方式保证受保护区域未被 proposal 污染。

### Active summary
- Date: 2026-05-04
- Scope: D16 / `src/core/apply/BodyAssembler.ts`
- Reason: 落实 review-first 架构对 protected region 逐字保留的要求
- Change: 实现从当前文件提取 protected region、重建 refined 正文、再安全拼接 protected region 的内存组装逻辑
- Verification: 运行 `npm run typecheck`、`npm test`、`npm run build` 成功
- Next: 进入 D17，实现 frontmatter 与 tag 写入逻辑

## D17 开发日志

### Current status

已实现 `update-frontmatter` 和 `update-tags` 的执行逻辑。frontmatter 只会写入用户确认后的 `status/source/context`，`created` 不会被修改，未知 YAML 会保留；tag 更新当前通过 frontmatter `tags` 字段落地，只写入 allow-list 内标签，`#rel/*` 和其他非法 tag 不会写入。`ApplyDecisionUseCase` 会按 `ApplyPlan` 顺序在内存中应用这些变更，最终统一写回 note。

### Active summary
- Date: 2026-05-04
- Scope: D17 / `src/core/apply/FrontmatterTagApplier.ts`、`src/application/ApplyDecisionUseCase.ts`
- Reason: 将 apply 计划扩展为可执行的 frontmatter/tag 修改流程，同时守住 profile 写入边界
- Change: 实现 frontmatter 合并、未知字段保留、frontmatter `tags` 更新与 allow-list 过滤
- Verification: 运行 `npm run typecheck`、`npm test`、`npm run build` 成功
- Next: 进入 D18，实现 freshness check 与 conflict flow

## D18 开发日志

### Current status

已实现 freshness check 和 conflict flow。apply 前会重新读取当前文件，对比 `baseFileHash` 和当前 protected region hash；任一发生变化都会阻止 apply，不执行写入，并返回 `Save as Draft / Regenerate / Manual copy / Discard` 选项。当前实现不会提供 force apply；发生冲突时对应 session 会标记为 `conflicted`。

### Active summary
- Date: 2026-05-04
- Scope: D18 / `src/application/ApplyDecisionUseCase.ts`
- Reason: 避免 proposal 生成后源文件变化导致静默覆盖
- Change: 增加 file/protected-region freshness 比较、冲突结果模型和 session 冲突状态更新
- Verification: 运行 `npm run typecheck`、`npm test`、`npm run build` 成功
- Next: 进入 D19，实现 Save as Draft 与端到端 mock apply

## D19 开发日志

### Current status

Phase 5 已完成。已实现 `SaveDraftUseCase`、Obsidian note/draft 写入 adapter，并将 ReviewModal 的 `Apply selected changes` 接到 `BuildApplyPlanUseCase + ApplyDecisionUseCase`，将 `Save as Draft` 接到 `SaveDraftUseCase`。默认草稿目录已调整为 `80_Runtime/refine-drafts/`；草稿会包含 source note path、workflow id、created time、token usage、proposed sections、warnings 和 conflict reason。当前自动测试已覆盖端到端 mock apply 的关键逻辑，但尚未在真实 Obsidian vault 中手动走完整 UI 写入回归。

### Active summary
- Date: 2026-05-04
- Scope: D19 / `src/application/SaveDraftUseCase.ts`、`src/adapters/obsidian/ObsidianNoteRepository.ts`、`src/main.ts`
- Reason: 打通 review-first 流程从 proposal 到安全 apply / draft 保存的最小闭环
- Change: 实现草稿写入、Obsidian Markdown 读写适配器，并把 Review UI 的 Apply / Save as Draft 从占位回调切换到真实 application use case
- Verification: 运行 `npm run typecheck`、`npm test`、`npm run build` 成功
- Next: Phase 5 验收已满足；下一步如继续则进入 D20，实现 `ObsidianSecretStore` 与安全设置 UI

## D19.5 开发日志

### Current status

已完成 `Phase 5.5 Editable Review Body` 回填。ReviewModal 中的 refined 正文已从只读预览改为 section-level 可编辑输入，默认值来自 `session.proposal.refinedSections`。`UserDecision` 现在可携带 `editedRefinedSections`，`BuildApplyPlanUseCase` 会在 `acceptBody=true` 时优先使用用户编辑内容，并在进入 `ApplyPlan` 前重新执行 refined section schema / content policy 校验；若编辑内容包含 `## 原始内容` 或缺少必填 section，会在 build plan 阶段被拒绝。`SaveDraftUseCase` 也已改为优先保存用户编辑后的 sections。该任务未补自动测试，按要求延后到 Phase 6 统一处理。

### Active summary
- Date: 2026-05-04
- Scope: D19.5 / `src/core/proposal/Proposal.ts`、`src/core/review/UserDecision.ts`、`src/ui/review/ReviewViewModel.ts`、`src/ui/review/ReviewModal.ts`、`src/core/proposal/ProposalValidator.ts`、`src/application/BuildApplyPlanUseCase.ts`、`src/application/SaveDraftUseCase.ts`
- Reason: 支持用户在 ReviewModal 中直接修改 refined 正文，并将编辑结果安全回填到 apply / draft 流程
- Change: 新增 `editedRefinedSections` 数据流，改造 ReviewModal 为 section-level textarea，增加编辑正文的二次 schema/content 校验，并让 Save as Draft 保存编辑后的 sections
- Verification: 运行 `npm run typecheck`、`npm run build` 成功；按要求未补自动测试
- Next: 测试延后到 Phase 6；如继续开发则进入 D20

## D20 开发日志

### Current status

已实现 `ObsidianSecretStore`、安全设置存储清洗和 SettingsTab 的 provider 配置 UI。当前 settings 只会把 `provider.type/model/secretRef` 写入 `data.json`，不会保存 API key 或其他敏感值；API key 输入走 `SecretComponent + SecretStorage`，并且会校验 secret reference 只能使用小写字母、数字和连字符。若当前 Obsidian 环境不支持 SecretStorage，provider 配置区会被禁用并显示明确警告，插件命令仍可继续使用 `mock-llm`。

### Active summary
- Date: 2026-05-04
- Scope: D20 / `src/adapters/obsidian/ObsidianSecretStore.ts`、`src/adapters/obsidian/ObsidianSettingsStore.ts`、`src/ui/settings/SettingsTab.ts`、`src/ui/i18n/*.ts`
- Reason: 为真实 provider 接入补齐安全 secret 存储前提，并阻断任何把 API key 写进 `data.json` 的绕过路径
- Change: 新增 SecretStore adapter、settings sanitize 流程、provider type/model/secretRef/API key 设置项，以及 SecretStorage 不可用时的 UI 降级
- Verification: 运行 `npm run typecheck`、`npm test`、`npm run build` 成功；新增 settings/secret 相关单元测试
- Next: 进入 D21，实现 `OpenAICompatibleProvider` 基础调用

## D21 开发日志

### Current status

已实现 `OpenAICompatibleProvider`，支持从 `SecretStore` 获取 API key、按 `systemPrompt + userPrompt` 发送 OpenAI-compatible chat completion 请求，并将响应继续送回现有 `ProposalValidator` 流程。`CreateProposalUseCase` 现在会区分 `provider-failed`、`validation-failed` 和 `created` 三类结果；provider 错误消息会统一经过 redaction，避免泄露 API key、Bearer token 或 Authorization header。当前 `main.ts` 支持在 `mock-llm` 与 `openai-compatible` 之间切换，并在配置不完整或 secret 缺失时给出清晰提示。

### Active summary
- Date: 2026-05-04
- Scope: D21 / `src/adapters/llm/LlmProvider.ts`、`src/adapters/llm/MockLlmProvider.ts`、`src/adapters/llm/OpenAICompatibleProvider.ts`、`src/application/CreateProposalUseCase.ts`、`src/runtime/redaction.ts`、`src/main.ts`
- Reason: 将当前 mock-only proposal 生成链路扩展为可接真实 OpenAI-compatible provider 的双 provider 结构
- Change: 扩展 LlmProvider 请求结构、实现真实 provider 调用与错误脱敏，并让 CreateProposalUseCase 支持 provider 失败分支
- Verification: 运行 `npm run typecheck`、`npm test`、`npm run build` 成功；新增 provider redaction/usage 单元测试
- Next: 进入 D22，实现 token usage actual / estimated / unavailable fallback

## D22 开发日志

### Current status

已实现 `TokenUsageReporter`。当 provider 返回 usage 时，会写入 `TokenUsageReport` 且 `countingMode=actual`；当 provider 未返回 usage 时，会按输入输出文本长度做最小 token 估算并写入 `countingMode=estimated`；若估算过程失败，则回退到 `countingMode=unavailable`。Review UI 已沿用既有 token usage 展示模型，因此无需新增价格估算或 tokenizer 选择 UI。

### Active summary
- Date: 2026-05-04
- Scope: D22 / `src/runtime/TokenUsageReporter.ts`、`src/application/CreateProposalUseCase.ts`
- Reason: 让真实 provider 和 mock provider 都能稳定落 token usage，而不会因为 usage 缺失阻断 review
- Change: 增加 actual/estimated/unavailable 三态 token usage 解析和 fallback 逻辑，并将其统一写入 ProposalSession
- Verification: 运行 `npm run typecheck`、`npm test`、`npm run build` 成功；新增 token usage fallback 单元测试
- Next: 进入 D23，收敛真实 provider 错误路径并补齐本阶段测试

## D23 开发日志

### Current status

Phase 6 的代码实现和自动测试已完成。当前仓库已经支持：安全 secret 存储、OpenAI-compatible provider 接线、provider 错误脱敏、token usage actual/estimated/unavailable、以及 `Phase 5.5` 延后的 editable-body 自动测试。`CreateProposalUseCase` 对 API key 缺失、provider 抛错、非 JSON / schema / policy / content 校验失败都能返回明确结果，并确保失败响应不会进入 `ProposalSession`。但在当前环境中，没有配置可用的真实 API key，因此“真实 LLM happy path 从 raw note → proposal → review → apply”的人工端到端验证尚未实跑；这一点仍需你在真实 Obsidian vault 中补做。

### Active summary
- Date: 2026-05-04
- Scope: D23 / `tests/application/CreateProposalUseCase.test.ts`、`tests/adapters/llm/OpenAICompatibleProvider.test.ts`、`tests/adapters/obsidian/ObsidianSettingsStore.test.ts`、`tests/runtime/TokenUsageReporter.test.ts`、`tests/application/Phase55EditableReviewBody.test.ts`
- Reason: 收敛真实 provider 的错误路径，并把 Phase 5.5 延后的测试合并到 Phase 6
- Change: 补充 provider 失败、secret 不落盘、token usage fallback 和 editable-body 回填的自动测试；保留真实 API key happy path 的手动验证缺口说明
- Verification: 运行 `npm run typecheck`、`npm test`、`npm run build` 成功，共 44 个测试通过
- Next: 代码层面已可进入 Phase 7；若要完成 Phase 6 的人工验收，还需在真实 vault 中配置 API key 后手动跑一次真实 provider happy path

## D23.1 开发日志

### Current status

已补充 SecretStorage 可见诊断设置页，用于定位真实运行时为何被判定为 `secret unavailable`。SettingsTab 现在始终显示 `API key` 行：若运行时支持 `SecretStorage`，会继续渲染 `SecretComponent`；若不支持，则显示禁用输入框和占位说明，不再把该设置项整块隐藏。同时新增 `SecretStorage diagnostics` 面板，直接输出 `app.secretStorage` 是否存在、`getSecret/setSecret` 的运行时类型、构造器名和可枚举键，便于在真实 Obsidian 环境中快速判断到底是 API 不存在、方法未暴露，还是其他运行时差异。最新构建产物也已同步到测试 vault 插件目录。

### Active summary
- Date: 2026-05-04
- Scope: D23.1 / `src/adapters/obsidian/ObsidianSecretStore.ts`、`src/main.ts`、`src/ui/settings/SettingsTab.ts`、`src/ui/i18n/*.ts`、`styles.css`
- Reason: 用户在 Obsidian 1.12.7 中看不到 API key 设置项，需要把 SecretStorage 检测结果可视化，先钉死真实原因
- Change: 增加 SecretStorage 运行时诊断对象和设置页诊断面板；保留 API key 设置项的可见性，并在不可用时展示禁用态与明确原因
- Verification: 运行 `npm run typecheck`、`npm run build` 成功；并将 `main.js`/`styles.css`/`manifest.json` 同步到 `Obsidian-Refined-Layer-TestVault/.obsidian/plugins/obsidian-refined-layer/`
- Next: 在真实 Obsidian 中重载插件并查看诊断面板输出，确认是 `app.secretStorage` 缺失还是方法未暴露，再决定是否需要兼容性修复

## D24.1 开发日志

### Current status

已完成设置页精简和 provider 扩展的最小实现。SettingsTab 现在按 provider 类型条件显示字段，不再把所有配置项同时堆给用户；中英文说明文案也改成更短、更直接的版本。provider 侧在保留现有 `OpenAICompatibleProvider` 传输层的前提下，新增了 `DeepSeek`、`自定义 OpenAI-compatible 服务`、`本地 OpenAI-compatible 服务` 三类预设；对应配置仅扩展到 `model / secretRef / baseUrl`，没有侵入 proposal validator、review、apply 或 secret redaction 流程。`local-openai-compatible` 支持无 API key 直连本地兼容服务；`custom-openai-compatible` 和 `deepseek` 仍通过 SecretStorage 保存 key。该变更属于对原 v0.1.0 provider 边界的定向扩展。

### Active summary
- Date: 2026-05-04
- Scope: D24.1 / `src/settings/ProviderConfig.ts`、`src/main.ts`、`src/ui/settings/SettingsTab.ts`、`src/adapters/llm/OpenAICompatibleProvider.ts`、`src/ui/i18n/*.ts`、`tests/adapters/*`
- Reason: 用户认为设置项过多且说明不足，并要求新增 DeepSeek、自定义提供商和本地模型接入方式
- Change: 增加 provider 预设层、按类型条件渲染设置项、补充简洁中英文说明，并接入 `deepseek` / `custom-openai-compatible` / `local-openai-compatible`
- Verification: 运行 `npm run typecheck`、`npm test`、`npm run build` 成功，共 46 个测试通过；并同步构建产物到测试 vault 插件目录
- Next: 在真实 Obsidian 中分别手测 OpenAI、DeepSeek 和本地兼容服务配置流；若继续收尾，则进入 Phase 7 的手动测试矩阵与交付整理

## D24 开发日志

### Current status

Phase 7 边界复查已完成。代码库中不存在 `mcp/`、`http/`、`file-inbox/`、`external-review/`、`workflow-editor/` 目录或实现；`ApplyOperation` 仅含 `replace-refined-body`、`update-frontmatter`、`update-tags` 三种类型，无 `rename/move/link/moc/archive/delete`；UI 组件（ReviewModal、SettingsTab）无文件写入逻辑；ReviewModal 不硬编码 workflow 规则；`requestReview` 仅依赖 `ReviewGate` 接口，不直接耦合 Modal。Core 模块不导入 Obsidian API；依赖方向 `UI → Application → Core` 未被反转。

### Active summary
- Date: 2026-05-04
- Scope: D24 / 全仓库 grep + glob 边界复查
- Reason: 确保 v0.1.0 没有滑向长期平台能力，清理反扩张风险
- Change: 完成 5 项边界检查，全部通过；新增 `TEST-MATRIX.md`、补充 3 个测试笔记，交付清单文档
- Verification: 自动化 grep/glob 扫描无越界匹配；`npm run typecheck`、`npm test`、`npm run build` 成功
- Next: 进入 D25，执行手动测试矩阵

## D25 开发日志

### Current status

手动测试矩阵已创建（`TEST-MATRIX.md`，50 个用例覆盖 9 个类别），测试 vault 中补充了 `invalid-illegal-tags.md`、`invalid-illegal-yaml.md`、`valid-editable-body.md` 三个测试笔记。自动测试持续通过（14 文件 46 用例）。手动执行部分需在真实 Obsidian 中完成。

### Active summary
- Date: 2026-05-04
- Scope: D25 / `TEST-MATRIX.md`、`Obsidian-Refined-Layer-TestVault/10_Raw/*.md`
- Reason: 建立结构化的手动测试覆盖，为交付前质量保证提供可复现矩阵
- Change: 新增 50 项手动测试矩阵、3 个测试笔记；自动测试 46 例全通过
- Verification: `npm run typecheck`、`npm test`、`npm run build` 成功；矩阵文档就绪
- Next: 用户在真实 Obsidian 中按矩阵逐项测试；开发侧进入 D26 编写使用说明

## D26 开发日志

### Current status

已创建 `README.md`，包含安装说明、使用指南、provider 配置说明、隐私声明和开发指引。文档覆盖了 D26 要求的全部内容：安装/本地加载步骤、Refine/Reopen 命令说明、Review UI 交互描述、部分 apply 说明、Save as Draft 流程、冲突处理选项、API key 隐私保护策略、v0.1.0 范围边界。

### Active summary
- Date: 2026-05-04
- Scope: D26 / `README.md`
- Reason: 提供用户可操作的最小安装与使用文档，并明确隐私边界
- Change: 新增完整 README，含中英双语命令说明、5 种 provider 配置指南、隐私保护说明
- Verification: 文档结构完整，覆盖 D26 全部验收项
- Next: 进入 D27，执行 v0.1.0 交付检查

## D27 开发日志

### Current status

v0.1.0 交付检查已完成。按架构书逐项核对了 MVP 流程 10 个步骤、9 条不可配置规则、raw-refined profile 全部约束、40 个架构模块的实现状态和 18 项明确不应存在的内容。自动测试 46 例全通过，typecheck/build 无错误。已知缺口仅 4 项（PolicyGuard 空壳、真实 LLM 未手动验证、between-headings 未实现、draft 写入未独立 adapter），均属于边界预留或需真实环境验证项，不影响当前交付。

### Active summary
- Date: 2026-05-04
- Scope: D27 / `v0.1.0-delivery-checklist.md`、全仓库交付审查
- Reason: 完成 v0.1.0 最终交付检查，生成交付清单与下一版本候选
- Change: 新增交付检查清单文档（8 节），覆盖流程/规则/profile/模块/禁止项/测试/缺口/候选
- Verification: 架构书逐项对照通过；`npm run typecheck`、`npm test` (46/46)、`npm run build` 成功；data.json 无敏感字段；禁止项全零匹配
- Next: Phase 7 验收完成；插件已可交付测试

## Phase 7 验收状态

```text
[x] 没有长期 adapter 实现（mcp/http/file-inbox/external-review/workflow-editor）
[x] 没有外部审核通道实现
[x] 没有 move/rename/link/MOC apply
[x] 手动测试矩阵完成（TEST-MATRIX.md，50 用例）
[x] README / 使用说明完成
[x] v0.1.0 happy path 可运行（mock-llm 全流程）
[x] 完成 D24-D27 开发日志
[x] delivery-checklist.md 已生成
```

## Dx 文档整理与修复任务规划

### Current status

已完成全仓文档整理：将 6 个散落在根目录的文档 (`AGENTS.md`、`dev-log.md`、架构书、日计划、Phase 5.5 回填任务、`TEST-MATRIX.md`) 统一移动到 `docs/` 目录，使根目录保持四类核心文件（README + 构建配置 + 源码 + 测试 vault）。同时检查并修正了所有 .md 文件之间的交叉路径引用，确保 `docs/` 内部文档使用相对路径、README 使用 `docs/` 前缀路径。此外新增 `fix-feature-tasks.md` 记录了 D9 日计划分解遗漏导致的 session 持久化缺失问题及其修复方案。

### Active summary
- Date: 2026-05-04
- Scope: 文档整理 / `docs/` 全量 .md、`README.md` 路径引用
- Reason: 根目录文档散落不便管理，agreed 统一到 docs/
- Change: 移动 6 个文档到 `docs/`；修正 `dev-log.md`、`日计划`、`README.md`、`fix-feature-tasks.md` 中 5 处路径引用；新增 `fix-feature-tasks.md`
- Verification: `npm run typecheck`、`npm test` (46/46)、`npm run build` 成功；grep 验证全量 .md 无残留错误引用
- Next: 按 `fix-feature-tasks.md` 实现 ProposalSessionStore 磁盘持久化
