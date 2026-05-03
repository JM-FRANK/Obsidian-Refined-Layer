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
