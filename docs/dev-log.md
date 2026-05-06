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

---

## D40 开发日志

### Current status

BlockExtractor 已实现，作为 v0.2.0 B 类分块提取器，用于替代旧 `from-heading-to-end` protected region 模型的后续迁移基础。B 类分块范围从配置 heading 到下一个同级或更高级 heading（sibling-or-higher），内部嵌套子标题逐字保留。CRLF 兼容性已验证通过。现有 v0.1.0 ProtectedRegionExtractor 保留不变，BlockExtractor 尚未接入 apply 写入路径，apply 写入逻辑未改动。

### D40.1 CRLF heading 解析缺陷修复

#### 报错现象

```
Direct regex on '# Title\r': NO MATCH
Direct regex on '## 原始内容\r': NO MATCH
CRLF headings: []
```

CRLF 换行的 Markdown 输入（`\r\n`），`HeadingParser` 返回 **0 个 heading**，进而导致 `BlockExtractor` 对 CRLF 文件返回 `missing-heading` 错误：

```
CRLF extraction failed: missing-heading - Required B block heading "原始内容" (level 2) was not found.
```

LF 换行（`\n`）的相同输入完全正常。

#### 定位过程

1. 通过在 `BlockExtractor` CRLF 测试中注入 `throw new Error(result.error.code + " - " + result.error.message)` 确认了 `missing-heading` 错误码
2. 怀疑是 `BlockExtractor` 匹配逻辑对 CRLF 不兼容，在测试中直接调用 `HeadingParser.parse()` 发现返回 `headings: []`
3. 进一步隔离到 `parseAtxHeading()` 内部的正则表达式，直接对单行字符串 `"# Title\r"` 执行 `/^(#{1,6})\s+(.+?)(?:\s+#+\s*)?$/` 返回 `null`
4. 对比去掉 `\r` 后同一正则对 `"# Title"` 正常匹配，确认 `\r` 是唯一干扰因素

#### 根因分析

`HeadingParser.parse()` 按 `\n` 切分行：

```ts
const newlineIdx = markdown.indexOf("\n", pos);
const lineEnd = newlineIdx === -1 ? len : newlineIdx;
const line = markdown.slice(lineStart, lineEnd);
```

CRLF 文件中，`\n` 前必定有 `\r`，切出的行字符串末尾包含 `\r`。例如 `"## 原始内容\r\n"` → 行字符串 `"## 原始内容\r"`（`\r` 是 ASCII 13，属于 `\s` 空白字符类）。

`parseAtxHeading` 的正则：

```
/^(#{1,6})\s+(.+?)(?:\s+#+\s*)?$/
```

JavaScript 中 `$` 无 `m` 标志时仅匹配字符串最末尾位置。非贪婪 `(.+?)` 的逻辑：

```
(.+?) 尝试最小匹配 "原"
剩余 "始内容\r"，$ 无法匹配（不是末尾）
(.+?) 回溯 "原始"
剩余 "内容\r"，$ 无法匹配
...
(.+?) 回溯 "原始内容\r"
剩余 ""，$ 匹配末尾 → 成功
```

实际测试确认，当前正则无法稳定匹配带行尾 `\r` 的 heading 行。无论具体正则回溯原因如何，HeadingParser 的输入行不应携带 CRLF 中残留的 `\r` 进入 ATX heading 匹配。因此在 `parseAtxHeading()` 入口统一移除单个行尾 `\r`，作为 CRLF 兼容层。

#### 修复方案

在 `parseAtxHeading()` 入口处规范化行尾：

```ts
const normalizedLine = line.endsWith("\r") ? line.slice(0, -1) : line;
```

只移除单个 `\r`，不 trim 整行，不改变 heading text 的既有 trim 行为。

**charStart/charEnd 不受影响**：偏移量由 `parse()` 循环基于原始 Markdown 字符位置计算后作为参数传入，`parseAtxHeading` 不重新计算 offset，规范化只影响正则匹配对象，不改变返回的 `charStart`/`charEnd` 值。

### Active summary
- Date: 2026-05-05
- Scope: 实现 BlockExtractor（B 类分块提取器）+ CRLF heading 解析修复
- Reason: v0.2.0 B 类分块不再固定在文末，范围由 heading 位置和层级决定；CRLF 兼容性是 Windows 平台基本需求
- Change:
  - 新增 `src/core/markdown/BlockExtractor.ts`：按 BBlockConfig（heading + headingLevel）定位唯一 B heading；提取范围从 B heading 到下一个 level ≤ B.level 的 heading 或文末；保留嵌套子标题；返回结构化错误（missing-heading / heading-level-mismatch / multiple-heading / empty-b-block）；计算 baseBBlockHash（SHA256）
  - `src/core/markdown/HeadingParser.ts` CRLF 修复：`parseAtxHeading()` 在正则匹配前规范化行尾 `\r`（`line.endsWith("\r") ? line.slice(0, -1) : line`）；charStart/charEnd 基于原始 Markdown 位置，不受影响
  - `tests/core/markdown/HeadingParser.test.ts`（20 tests，+5 CRLF）：H1-H6 CRLF 解析、firstH1 after frontmatter CRLF、\r 不进入 heading text、offset 正确性、LF 不回归
  - `tests/core/markdown/BlockExtractor.test.ts`（18 tests）：基本提取、文末提取、非文末提取、嵌套子标题保留、H1 结束 H2 B block、同级结束、missing/mismatch/multiple/empty 错误、确定性 hash、自定义 B heading、CRLF 查找与保留原始换行、LF 不回归、空白保留
- Verification: `npm run typecheck` 通过；`npm test` 20 files / 149 tests 全部通过；`npm run build` 通过
- Next: D41 — 将 eligibility 切到 A/B block config

---

## D41 开发日志

### Current status

CheckEligibilityUseCase 已从硬编码 `WorkflowProfile.requiredHeading` 切换到可配置 `RawRefinedWorkflowSettings`。B 类分块存在/唯一/层级/非空通过 `BlockExtractor` 检查，A 类分块配置合法性通过 `BlockConfigValidator` 检查（含 protectH1 规则）。v0.1.0 的 .md / frontmatter / status=raw 检查保留不变。i18n 新增 5 个 eligibility 错误原因 key。旧 `rawRefinedProfile` 标记为 v0.1 兼容层保留，apply 写入逻辑未改动。

### Active summary
- Date: 2026-05-05
- Scope: 将 eligibility 从硬编码 WorkflowProfile 切换到可配置 RawRefinedWorkflowSettings
- Reason: v0.2.0 要求 B 类分块 heading 可配置，eligibility 必须能检查任意 heading+level 的 B 类分块，而非仅检查固定 `## 原始内容`
- Change:
  - `src/application/CheckEligibilityUseCase.ts`：构造函数新增 `settings: RawRefinedWorkflowSettings` 参数；B 类分块检查改为通过 `BlockExtractor.extract(note.content, settings.bBlock)` 执行，映射 missing-heading→missingBBlock、multiple-heading→multipleBBlock、heading-level-mismatch→bBlockLevelMismatch、empty-b-block→emptyBBlock；A 类分块检查通过 `BlockConfigValidator.validate(enabledABlocks, bBlock, protectH1)` 执行，不合法时返回 invalidABlockConfig；`EligibilityFailureReason` 类型扩展为包含 5 个 v0.2 新错误码；移除旧 `escapeRegExp`/`requiredHeading` 正则逻辑
  - `src/application/CreateProposalUseCase.ts`：构造函数新增 `settings: RawRefinedWorkflowSettings` 参数（非属性），透传至 `CheckEligibilityUseCase`
  - `src/main.ts`：`CreateProposalUseCase` 构造时传入 `this.settings.rawRefined`
  - `src/core/profile/rawRefinedProfile.ts`：添加 JSDoc 标记为 v0.1.0 兼容层
  - `src/ui/i18n/zh-CN.ts` / `en.ts`：新增 `eligibility.missingBBlock`、`eligibility.multipleBBlock`、`eligibility.bBlockLevelMismatch`、`eligibility.emptyBBlock`、`eligibility.invalidABlockConfig`
  - `tests/application/CheckEligibilityUseCase.test.ts`（11 tests，+6）：v0.1 兼容（no-active-file、non-markdown、missingFrontmatter、eligible）、B block 缺失/层级不匹配/重复/空、A block 重复 ID、protectH1=true 拒绝 level=1、protectH1=false 接受 level=1
  - `tests/application/CreateProposalUseCase.test.ts`：所有用例的 `CreateProposalUseCase` 构造增加 `defaultSettings` 参数（8 tests 不受影响）
- Verification: `npm run typecheck` 通过；`npm test` 20 files / 155 tests 全部通过（+6 tests）；`npm run build` 通过
- Next: D42 — 实现 MarkdownAssembler v2 的内存组装

---

## D42 开发日志

### Current status

MarkdownAssembler v2 已实现，用于将用户接受的 A 类分块 + fresh-extracted B 类分块 + protectH1 状态组装为新的 Markdown body。旧 `BodyAssembler`（基于 `from-heading-to-end` + `RefinedSections`）保留不变，作为 v0.1.0 兼容层。MarkdownAssembler 尚未接入 `ApplyDecisionUseCase`，仅 core 层实现。

### Active summary
- Date: 2026-05-05
- Scope: 实现 MarkdownAssembler v2（A/B block 内存组装），不接入 apply 路径
- Reason: v0.2.0 需要将 A block proposals + B block 组装为完整 Markdown body，替代旧 `BodyAssembler` 的 `refinedSections + from-heading-to-end` 固定模式
- Change:
  - 新增 `src/core/markdown/MarkdownAssembler.ts`：`MarkdownAssemblyInput` 接口（acceptedABlocks: AcceptedABlock[]、bBlockText: string、firstH1Text?: string、protectH1: boolean）；`MarkdownAssembler.assemble()` 按 order 排列 A blocks 并渲染 heading + content；protectH1=true 且 firstH1Text 存在时前置 `# {text}`；B block 逐字节原样追加；各部分以 `\n\n` 分隔，末尾补 `\n`；A block content 做 `trimEnd()` 处理避免多余空白行
  - 旧 `src/core/apply/BodyAssembler.ts` 保留不变（v0.1 兼容层）
  - 新增 `tests/core/markdown/MarkdownAssembler.test.ts`（14 tests）：按 order 排序输出、未接受 block 不输出、全部接受、零接受、protectH1 前置/关闭/无 H1、B block 逐字节保留（含 CRLF）/嵌套子标题、H1-H6 heading 渲染、内容空白 trim、空内容、与 BlockExtractor 输出集成
- Verification: `npm run typecheck` 通过；`npm test` 21 files / 169 tests 全部通过；`npm run build` 通过。测试过程中修复了 4 个测试侧问题，未改动 `MarkdownAssembler` 源码。
- Next: Phase 10 验收 或 D43（Phase 11：PromptBuilder、Zod Schema 与 Tag Normalization）

### D42 Verification notes

D42 实现过程中出现 4 个测试侧问题，均已修正，`MarkdownAssembler` 源码未因此改动：

1. `DEFAULT_B_BLOCK` 在 `MarkdownAssembler.test.ts` 中导入但未使用，触发 TS6133，已删除未使用导入。
2. `acceptedBlock({ id: "reasoning" })` 未同步覆盖 `heading`，导致测试中两个 A block 都渲染为默认 `## 摘要`，已在测试 fixture 中显式传入 `heading: "依据与推理"`。
3. `expect(result).not.toContain("# ")` 会误命中 `## 摘要` 中的第二个 `#` + 空格，已移除该不精确断言，改以 `result.startsWith("## 摘要")` 判断未输出 H1。
4. 测试辅助函数使用 `content || defaultContent`，导致空字符串被错误回退为默认内容，已改为 `content ?? defaultContent`。

这些问题均属于测试 fixture / assertion 问题，不改变 D42 的实现边界：旧 `BodyAssembler` 保留，`MarkdownAssembler` 尚未接入 `ApplyDecisionUseCase`。

---

## D43 开发日志

### Current status

PromptBuilder 已实现，负责将 A block prompts、tagPrompt、tagWhitelist、固化 schema instruction 组装为结构化 `LlmRequestV2`（含 messages 数组）。Provider 不再负责拼 prompt，只接收构建好的 LlmRequest。`PromptDebugSnapshot` 类型已定义，记录完整的 prompt 可观测信息，不含 API key / Authorization / secret。旧 v0.1 `LlmRequest` 接口保留不变。PromptBuilder 尚未接入 `CreateProposalUseCase`，仅 core 层实现。

### Active summary
- Date: 2026-05-05
- Scope: 实现 PromptBuilder + PromptDebugSnapshot（Phase 11 首任务）
- Reason: v0.2.0 要求 LLM 请求从固定 prompt 转为结构化请求，PromptBuilder 负责从 A block config + tag 设置构建 system/user messages，Provider 不再自己拼 prompt
- Change:
  - 新增 `src/core/prompt/PromptDebugSnapshot.ts`：`PromptDebugSnapshot` 接口（provider/model/messages/schemaName/schemaVersion/metadata，不包含 secrets）；`LlmRequestV2` 接口（provider/model/messages/schemaName/schemaVersion/metadata，替代旧 `LlmRequest` 的 `noteContent`/`systemPrompt`/`userPrompt` 直接字段）
  - 新增 `src/core/prompt/PromptBuilder.ts`：`PromptBuilderInput` 接口（provider/model/notePath/noteTitle/noteContent/aBlocks/tagWhitelist/tagPrompt/requestId）；`BuiltPrompt` 输出（LlmRequestV2 + PromptDebugSnapshot）；`buildSystemPrompt()` 固化 schema instruction（JSON 结构、selectedTags/newTagSuggestions 分离规则、blocked tags 列表）；`buildUserPrompt()` 组装 note 元信息 + 每个 enabled A block 的 id/heading/prompt + tag prompt/whitelist + 原始 noteContent
  - 新增 `tests/core/prompt/PromptBuilder.test.ts`（14 tests）：LlmRequest 结构、messages 数组二角色、enabled A blocks 全包含/disabled 不包含、tagWhitelist 完整输出、tagPrompt 可定制、schema instruction 包含 selectedTags/newTagSuggestions 分离规则、note content/metadata 完整传递、PromptDebugSnapshot 无 secret 字段、自定义/自动生成 requestId、provider/model 透传
- Verification: `npm run typecheck` 通过；`npm test` 22 files / 183 tests 全部通过（+14 tests）；`npm run build` 通过
- Next: D44 — 引入 Zod Proposal Schema v0.2

---

## Phase 10 验收

### 验收日期
2026-05-05

### 验收清单

| # | 检查项 | 状态 | 验证方式 |
|---|--------|------|----------|
| 1 | HeadingParser 可用 | ✓ | `HeadingParser.test.ts` 20 tests（H1-H6、firstH1、trim、CRLF、Setext拒绝、frontmatter跳过） |
| 2 | protectH1 规则可验证 | ✓ | `BlockConfigValidator.test.ts` 14 tests（level=1拒绝/接受、无效level、重复ID、空列表） |
| 3 | B 类分块可配置名称和层级 | ✓ | `BlockExtractor.test.ts` "works with custom B block heading text and level"、`BBlockConfig` 支持 heading/headingLevel |
| 4 | B 类分块内部子标题逐字保留 | ✓ | `BlockExtractor.test.ts` "preserves nested sub-headings"（含 ### H3、#### H4） |
| 5 | eligibility 使用 A/B block config | ✓ | `CheckEligibilityUseCase.test.ts` 11 tests（从 `RawRefinedWorkflowSettings` 读取，BlockExtractor+BlockConfigValidator） |
| 6 | MarkdownAssembler v2 能组装 accepted A blocks + B block | ✓ | `MarkdownAssembler.test.ts` 14 tests（order排序、未接受排除、protectH1、B block逐字节） |

### 回归锚点确认

| 锚点 | 状态 |
|------|------|
| active note read | ✓ CheckEligibilityUseCase |
| eligibility failure reporting | ✓ CheckEligibilityUseCase.test.ts |
| mock provider happy path | ✓ CreateProposalUseCase.test.ts |
| real provider redaction | ✓ redaction.test.ts |
| SecretStorage no-secret leak | ✓ ObsidianSettingsStore.test.ts |
| D35 Bearer test pollution defense | ✓ redaction.test.ts |
| session-cache persistence | ✓ ProposalSessionStore.test.ts |
| ReviewGate abstraction | ✓ src/ui/review/ |
| ApplyPlan-only write path | ✓ BodyAssembler + ApplyDecisionUseCase |
| freshness conflict flow | ✓ ApplyDecisionUseCase.test.ts |
| Save as Draft | ✓ SaveDraftUseCase.test.ts |
| protected B/original region byte-for-byte | ✓ ProtectedRegionExtractor.test.ts + BlockExtractor.test.ts |

### 整体验证
- `npm run typecheck` — 通过
- `npm test` — 22 files / 183 tests 全部通过
- `npm run build` — 通过
- 旧 `ProtectedRegionExtractor` 保留，旧 `BodyAssembler` 保留，旧 `rawRefinedProfile` 保留
- 无 Phase 11+ 范围泄露

---

## D44 开发日志

### Current status

Zod Proposal Schema v0.2 已引入。`rawRefinedProposalV2Schema` 校验 `workflowProfileId`（literal "raw-refined"）、`schemaVersion`（literal "0.2"）、`blocks`（非空数组，每项含 id/content/warnings?）、`frontmatterSuggestion`?、`tagSuggestion`?、`warnings`?。`ProposalValidator.validateV2Output()` 新增 v0.2 入口方法，返回结构化结果含可序列化 zodError。旧 `validateModelOutput`（v0.1）保留不变，旧 9 个 ProposalValidator 测试全部通过。

### Active summary
- Date: 2026-05-05
- Scope: 引入 Zod 对 RawRefinedProposalV2 做结构校验（Phase 11 第二任务）
- Reason: v0.2.0 要求 LLM 输出通过 zod 本地校验后才进入 normalization/policy，zod 只做结构校验，不做 policy/tag whitelist/normalization
- Change:
  - `npm install zod` 新增依赖
  - 新增 `src/core/proposal/ProposalSchema.ts`：`rawRefinedProposalV2Schema`（z.object）校验 literal workflowProfileId/schemaVersion、`blocks.min(1)` 非空数组、每项 `aBlockProposalSchema`（id: z.string().min(1)、content: z.string().min(1)、warnings?: z.string().array()）、`frontmatterSuggestion?`（status?: literal "refined"、source?: enum("self"|"external"|"practice")、context?: string[]）、`tagSuggestion?`（selectedTags?: string[]、newTagSuggestions?: string[]）、`warnings?`（string[]）；`RawRefinedProposalV2Parsed` 类型导出
  - `src/core/proposal/ProposalValidator.ts`：新增 `validateV2Output(output: string): V2ValidationResult` 方法，流程为 JSON.extract → zod.safeParse → 成功返回 `{ ok, proposal }`，失败返回 `{ ok: false, errors, zodError }`；`V2ValidationResult` 类型支持携带 `zodError?: ZodError` 供上层存入 FailedAttemptRecord；旧 `validateModelOutput`/`validateEditedRefinedSections` 保留不变
  - 新增 `tests/core/proposal/ProposalSchema.test.ts`（21 tests）：合法提案（最小/全部可选字段/无 tagSuggestion/block 含 warnings）、blocks 缺失/空数组/缺 id/缺 content/空 id/空 content、workflowProfileId/schemaVersion 错误、tagSuggestion 类型错误（非数组、元素非字符串）、frontmatterSuggestion status/source 错误、warnings 非数组、zod 错误结构可 JSON 序列化（可存入 attempt）、非对象/null 输入
- Verification: `npm run typecheck` 通过；`npm test` 23 files / 204 tests 全部通过（+21 tests；旧 ProposalValidator 9 tests 不受影响）；`npm run build` 通过
- Next: D45 — 实现 TagNormalizer

---

## D45 开发日志

### Current status

TagNormalizer 已实现，支持英/中文逗号、空格、换行、顿号分割 tag，自动 trim、去空项、补 #、去重，不做大小写归一化。非白名单 selectedTags 自动移入 newTagSuggestions。`tagNormalizationApplied` 标记任何处理是否发生——该字段仅存在于本地 ProposalSession/validation report，不传给 LLM、不写入笔记。尚未接入 ProposalNormalizer（D46）。

### Active summary
- Date: 2026-05-05
- Scope: 实现 TagNormalizer（Phase 11 第三任务）
- Reason: v0.2.0 要求 LLM 输出的 tag 字段经过本地 normalization 后才进入 policy 和 Review UI，分割/补 #/去重/白名单过滤都是 normalization 的基本操作
- Change:
  - 新增 `src/core/proposal/TagNormalizer.ts`：`normalizeTagList(raw)` 按 `[，、,\s]+` 分割，trim、去空、补 #、去重；`normalizeProposalTags(input, whitelist)` 对 selectedTags/newTagSuggestions 分别做 normalizeTagList flatMap + 全局去重，非白名单 selectedTags 移入 newTagSuggestions，输出 `tagNormalizationApplied: boolean`
  - 已知设计决策：`normalizeAndTrack` 比较 `tags[0] !== raw`（而非 `raw.trim()`）以确保 trim 也被计入 normalization；`dedupe` helper 在 flatMap 后做全局去重（normalizeTagList 只能去重单字符串内的重复）
  - 新增 `tests/core/proposal/TagNormalizer.test.ts`（31 tests）：normalizeTagList（英/中文逗号/顿号/空格/换行/混合分隔符/补 #/trim/去空/去重/空输入/大小写保持/CRLF）、normalizeProposalTags（白名单保留/非白名单移动/多 tag 移动/newTagSuggestions 保留/合并/分割后移动/补 # 后移动/空输入/去重/大小写不归一化/trim 追踪/补 # 追踪/去空项追踪）
- Verification: `npm run typecheck` 通过；`npm test` 24 files / 235 tests 全部通过（+31 tests）；`npm run build` 通过
- Next: D46 — 实现 ProposalNormalizer 与 partial validation result

---

## D46 开发日志

### Current status

ProposalNormalizer 已实现。A 类分块按配置 order 排序，未知 block id 被标记为 rejectedField，缺失的启用分块产生 warning。TagNormalizer 已接入，tag 不规范时标记 tagNormalizationApplied 并添加 warning。非致命 tag 问题不再导致正文整体失败——body blocks 全部合法时 status=valid，tag 问题仅产生 warning。尚未接入 CreateProposalUseCase（D47）。

### Active summary
- Date: 2026-05-05
- Scope: 实现 ProposalNormalizer 与 partial validation result（Phase 11 第四任务）
- Reason: v0.2.0 需要在 zod 校验后对 proposal 做 normalization（排序、未知 id 清洗、tag 规范），输出 valid/partial/invalid 状态供上层决定是进入 Review UI 还是重试
- Change:
  - 新增 `src/core/proposal/ProposalNormalizer.ts`：`ProposalNormalizer.normalize(parsed, settings)` 实现 A block 按 enabled config order 排序、未知 id 记录 rejectedField、缺失启用分块产生 warning；接入 `normalizeProposalTags`；frontmatter pass-through；状态逻辑：无接受分块→invalid、存在拒绝/缺失分块→partial、全接受+无 warning→valid
  - 关键策略变更：unknown tag 从 fatal error 降级为 normalization 问题——body blocks 全合法时 status=valid，仅产生 tag normalization warning；不影响 retry 决策
  - 新增 `tests/core/proposal/ProposalNormalizer.test.ts`（18 tests）：A block 接受/拒绝/排序/缺失警告/禁用配置、status 判定（valid/partial/invalid/空）、tag normalization（分割/补 #/非白名单移动/warning/缺失 tagSuggestion/body 有效时仍 valid）、frontmatter passthrough、validation 结构（多 rejectedField + 多 warning 合并）
- Verification: `npm run typecheck` 通过；`npm test` 25 files / 253 tests 全部通过（+18 tests）；`npm run build` 通过
- Next: D47 — CreateProposalUseCase 接入 v0.2 prompt / zod / normalization

---

## D47 开发日志

### Current status

CreateProposalUseCase 的 v0.2 管道已实现：`executeV2()` 方法完整走通 PromptBuilder → provider.generateProposalV2 → zod validation → ProposalNormalizer → ProposalSessionV2。MockLlmProvider 新增 `generateProposalV2` 支持。旧 `execute()` 方法保留不变，旧 5 个 v0.1 测试继续通过。session-cache 存储留待 Phase 12。v0.2 现为开发主路径。

### Active summary
- Date: 2026-05-06
- Scope: CreateProposalUseCase 接入 v0.2 prompt / zod / normalization（Phase 11 第五任务）
- Reason: v0.2.0 需要端到端管道：PromptBuilder → provider → zod → normalization → ProposalSessionV2。第一阶段只接 mock provider，不实现 retry/error-session-cache
- Change:
  - `src/adapters/llm/LlmProvider.ts`：接口新增可选 `generateProposalV2(request: LlmRequestV2): Promise<LlmResponse>`
  - `src/adapters/llm/MockLlmProvider.ts`：实现 `generateProposalV2`，返回 4 个 A block 的 v0.2 JSON（summary/coreQuestion/currentConclusion/reasoning + tagSuggestion + frontmatterSuggestion）
  - `src/application/CreateProposalUseCase.ts`：新增 `executeV2()` 方法 — 复用 EligibilityUseCase；BlockExtractor 提取 B block 并计算 baseBBlockHash；PromptBuilder 构建 LlmRequestV2；provider.generateProposalV2 调用；validateV2Output → ProposalNormalizer.normalize；创建 ProposalSessionV2（含 blockConfigSnapshot、validation、tokenUsage、source）；暂不保存到 session store（Phase 12 接入 session-cache）；`CreateProposalV2Result` 类型
  - 新增 `tests/application/CreateProposalUseCase.test.ts` v0.2 tests（6 tests）：happy path 创建 ProposalSessionV2、tag normalization warning、provider 不支持 v0.2、eligibility 失败、normalization-invalid、partial status
- Verification: `npm run typecheck` 通过；`npm test` 25 files / 259 tests 全部通过（v0.1 8 tests + v0.2 6 tests = 14 tests）；`npm run build` 通过
- Next: Phase 11 验收

---

## Phase 11 验收

### 验收日期
2026-05-06

### 验收清单

| # | 检查项 | 状态 | 验证方式 |
|---|--------|------|----------|
| 1 | PromptBuilder 生成结构化 LlmRequest | ✓ | `PromptBuilder.test.ts` 14 tests（messages 数组、A blocks、tagWhitelist、schema instruction、debug snapshot 无 secret） |
| 2 | Zod schema 可校验 RawRefinedProposalV2 | ✓ | `ProposalSchema.test.ts` 21 tests（合法/缺失/类型错误/序列化/非对象） |
| 3 | TagNormalizer 可处理分隔符和补 # | ✓ | `TagNormalizer.test.ts` 31 tests（中英文逗号/顿号/空格/换行/混合/补 #/trim/去空/去重/大小写保持/白名单过滤/移动） |
| 4 | selectedTags / newTagSuggestions 分离 | ✓ | `TagNormalizer.test.ts` + `ProposalNormalizer.test.ts`：非白名单 tag 移入 newTagSuggestions，body blocks 不受影响 |
| 5 | unknown tag 不导致正文整体失败 | ✓ | `ProposalNormalizer.test.ts` "body is valid even when tags need normalization"、`CreateProposalUseCase.test.ts` v0.2 tag normalization 测试 status=valid |
| 6 | CreateProposalUseCase 可创建 ProposalSessionV2 | ✓ | `CreateProposalUseCase.test.ts` v0.2 happy path（含 blockConfigSnapshot、validation、tagNormalizationApplied、source） |

### 回归锚点确认

| 锚点 | 状态 |
|------|------|
| active note read | ✓ CheckEligibilityUseCase |
| eligibility failure reporting | ✓ executeV2 复用相同 eligibility |
| mock provider happy path | ✓ v0.1 + v0.2 两条路径 |
| real provider redaction | ✓ 未改动 OpenAICompatibleProvider |
| SecretStorage no-secret leak | ✓ 未改动 |
| D35 Bearer test pollution defense | ✓ 未改动 |
| session-cache persistence | ✓ 暂未接入 v0.2 session-cache（Phase 12） |
| ReviewGate abstraction | ✓ 未改动 |
| ApplyPlan-only write path | ✓ 未改动 |
| freshness conflict flow | ✓ 未改动 |
| Save as Draft | ✓ 未改动 |
| protected B/original region byte-for-byte | ✓ 未改动 |

### 整体验证
- `npm run typecheck` — 通过
- `npm test` — 25 files / 259 tests 全部通过
- `npm run build` — 通过
- 旧 `execute()` 方法保留，旧 5 个 v0.1 CreateProposalUseCase 测试继续通过
- MockLlmProvider 向后兼容
- 无 Phase 12+ 范围泄露

---

## D48 开发日志

### Current status

RetryAttemptRunner 已实现，负责最多 3 次 LLM 请求重试编排。第 1 次成功直接返回成功 session（attemptsUsed=1，无 failed attempts）。第 2/3 次成功返回成功 session + 之前失败 attempts 的完整记录。3 次全部失败返回 exhausted + 3 份 FailedAttemptRecord。Runner 不写磁盘，由 application 层决定缓存。尚未接入 CreateProposalUseCase（D50）。

### Active summary
- Date: 2026-05-06
- Scope: 实现 RetryAttemptRunner 重试控制逻辑（Phase 12 首任务）
- Reason: v0.2.0 要求 LLM 失败时最多重试 3 次，每次 attempt 需完整记录 requestSnapshot/responseSnapshot/validationSnapshot/errorSummary 供调试
- Change:
  - 新增 `src/application/RetryAttemptRunner.ts`：`RetryAttemptRunner.run(runAttempt)` 循环最多 3 次调用 `runAttempt(attemptIndex: 1|2|3)`；成功在第 n 次返回 `{ status: "success", session, attemptsUsed: n, failedAttempts }`；3 次失败返回 `{ status: "exhausted", failedAttempts }`；支持自定义 `maxAttempts` 构造函数参数；`MAX_ATTEMPTS = 3` 常量导出
  - 类型：`SingleAttemptResult`（union success/false）、`RetryRunnerResult`（union success/exhausted）、`AttemptIndex`（1|2|3）
  - 新增 `tests/application/RetryAttemptRunner.test.ts`（6 tests）：第 1 次成功、第 2 次成功（含 1 个失败 attempt）、第 3 次成功（含 2 个失败 attempt）、3 次全失败 exhausted、成功即停、自定义 maxAttempts=1
- Verification: `npm run typecheck` 通过；`npm test` 26 files / 265 tests 全部通过（+6 tests）；`npm run build` 通过
- Next: D49 — 实现 ErrorSessionCache adapter 与 30 条上限

---

## D49 开发日志

### Current status

ErrorSessionCache 适配器已实现。`ErrorSessionCacheStore` 接口定义 save/loadAll/getCount。`ObsidianErrorSessionCacheStore` 保存到插件目录 `error-session-cache`，默认上限 30，超过自动删除最旧记录。保存前执行 secret pattern 扫描，阻断含 API key / Authorization / secret 的 payload。异常 corrupt 数据读入时自动跳过。尚未接入 CreateProposalUseCase（D50）。

### Active summary
- Date: 2026-05-06
- Scope: 实现 ErrorSessionCache adapter 与 30 条上限（Phase 12 第二任务）
- Reason: v0.2.0 要求失败 attempt 保存到 error-session-cache 供调试，不可恢复为 Review UI，必须防止 secret 泄露，超过上限自动清理最旧记录
- Change:
  - 新增 `src/runtime/ErrorSessionCacheStore.ts`：`ErrorSessionCacheStore` 接口（save/loadAll/getCount）
  - 新增 `src/adapters/obsidian/ObsidianErrorSessionCacheStore.ts`：实现 `ErrorSessionCacheStore`，路径 `.obsidian/plugins/obsidian-refined-layer/error-session-cache/attempts.v1.json`；保存前 secret 扫描（复用与 ObsidianSessionStore 相同的关键词集合，独立实现避免循环依赖）；limit 默认 30，超过后按 createdAt 保留最近 30 条；`loadAll()` 对 corrupt/非数组 JSON 容错返回 `[]`；`PersistedFailedAttemptRecord` 与 `FailedAttemptRecord` 互转
  - 新增 `tests/adapters/obsidian/ObsidianErrorSessionCacheStore.test.ts`（10 tests）：InMemory 适配器（save/load 单条/完整 snapshot 保留/limit=3 自动 trim/多 errorSessionId 并存/空存储）；`containsSecretPattern` scan（apiKey/auth/server/嵌套 responseSnapshot 阻断/safe payload 放行/token counting 白名单 key 放行）
- Verification: `npm run typecheck` 通过；`npm test` 27 files / 275 tests 全部通过（+10 tests）；`npm run build` 通过
- Next: D50 — CreateProposalUseCase 接入 retry + session/error cache

---

## D50 开发日志

### Current status

`CreateProposalUseCase.executeV2` 已接入 `RetryAttemptRunner`，实现最多 3 次 LLM 调用 + Zod + Normalization 重试。成功 session 写入 `SessionCacheV2Store`（新增接口+适配器），失败 attempt 写入 `ErrorSessionCacheStore`。返回 `V2NoticePlan` 供 D51 弹 Notice。

### Active summary
- Date: 2026-05-06
- Scope: CreateProposalUseCase 接入 retry + session/error cache（Phase 12 第三任务）
- Reason: v0.2.0 要求 provider → zod → normalization 循环最多 3 次，成功 ProposalSessionV2 写 session-cache，失败 attempt 写 error-session-cache，3 次失败不创建 session，结果包含 notice plan 但不弹 Notice
- Change:
  - **新增** `src/runtime/SessionCacheV2Store.ts`：`SessionCacheV2Store` 接口（save/loadAll/getLatestForNote）
  - **新增** `src/adapters/obsidian/ObsidianSessionCacheV2Store.ts`：实现 `SessionCacheV2Store`，路径 `.obsidian/plugins/obsidian-refined-layer/session-cache/sessions.v2.json`，默认 limit=5，按 notePath 去重，secret 扫描，corrupt JSON 容错；`PersistedProposalSessionV2` ↔ `ProposalSessionV2` 互转
  - **修改** `src/application/CreateProposalUseCase.ts`：
    - 新增 `V2NoticePlan` 类型（attemptsUsed/maxAttempts/errorCacheWritten/errorCacheDisabled）
    - `CreateProposalV2Result` 增加 `kind: "exhausted"` 分支和 `noticePlan` 字段；`kind: "provider-failed"` 不再出现（provider 失败现在被 retry 捕获）
    - 构造函数新增可选参数 `errorSessionCache?: ErrorSessionCacheStore` 和 `sessionCacheV2?: SessionCacheV2Store`
    - `executeV2` 通过 `AttemptContext` 闭包传递 notePath/noteTitle/noteContent/bBlockText/request/errorSessionId 给 `runSingleAttempt`
    - `runSingleAttempt`：provider 调用 → Zod 验证 → Normalization → 成功返回 `ProposalSessionV2`，失败构建 `FailedAttemptRecord`（含 requestSnapshot/responseSnapshot/validationSnapshot）
    - `buildFailedAttempt`：三类失败（provider 异常/Zod 失败/Normalization invalid）各自保留对应 validationSnapshot
    - `handleRetrySuccess`：失败 attempt 写 error-cache，成功 session 写 session-cache，构建 noticePlan
    - `handleRetryExhausted`：3 次全部失败写 error-cache，不创建 session
  - **修改** `tests/application/CreateProposalUseCase.test.ts`：两处现有测试更新——provider 不支持 V2 改为 `validation-failed`（code: v2-not-supported）；normalization invalid 改为 `exhausted`（含 3 个 failedAttempts 和 noticePlan）
  - **新增** `tests/application/CreateProposalUseCase.retry.test.ts`（9 tests）：
    - InMemory SessionCacheV2Store / ErrorSessionCacheStore 测试替身
    - attempt 1 成功：session-cache 有 session/error-cache 空/noticePlan 正确
    - attempt 1 成功无缓存注入：errorCacheDisabled=true
    - attempt 2 成功：1 个 failedAttempt 写 error-cache，session.attemptsUsed=2
    - attempt 3 成功：2 个 failedAttempt 写 error-cache，同 errorSessionId，session.attemptsUsed=3
    - 3 次全失败：3 个 failedAttempt 写 error-cache，session-cache 空，kind=exhausted
    - error-cache 禁用：exhausted 时 errorCacheDisabled=true
    - Zod 失败重试：attempt 1 zodError 记录，attempt 2 成功
    - Normalization invalid 重试：3 次 normalizationReport，exhausted
    - FailedAttemptRecord 完整结构验证（identity/requestSnapshot/blockConfigSnapshot）
- Verification: `npm run typecheck` 通过；`npm test` 28 files / 284 tests 全部通过（+9 tests）；`npm run build` 通过
- Next: D51 — 请求次数提醒与错误缓存位置提示

---

## D51 开发日志

### Current status

请求次数提醒与错误缓存位置提示已实现为独立 notice message planner。`CreateProposalUseCase.executeV2` 仍只返回 `noticePlan`，不直接弹 Notice、不进入 core；新增 UI 层纯函数将 v2 result 转为 0 或 2 条独立提示。第 1 次成功不生成请求次数提示；第 2/3 次成功生成请求次数 + error-session-cache 保存位置两条提示；3 次失败生成失败次数 + error-session-cache 保存位置两条提示；error-session-cache 关闭时第二条提示改为未保存。尚未执行 D52 session-cache v2 兼容迁移。

### Active summary
- Date: 2026-05-06
- Scope: 请求次数提醒与错误缓存位置提示（Phase 12 第四任务）
- Reason: v0.2.0 要求 D50 retry/cache result 在 UI/main 编排层产生 Notice，且请求次数提示与错误缓存位置提示必须是两条独立通知；core 不弹 Notice
- Change:
  - `src/application/CreateProposalUseCase.ts`：`V2NoticePlan` 新增 `errorCachePath?: string`，成功/失败 retry 结果在 error cache 可用时携带 `.obsidian/plugins/obsidian-refined-layer/error-session-cache/`
  - `src/ui/i18n/zh-CN.ts`、`src/ui/i18n/en.ts`：新增 v2 retry 成功/失败、error-session-cache 已保存/未保存文案；中文使用“缓存记录”表述
  - 新增 `src/ui/review/V2NoticeMessages.ts`：`buildV2NoticeMessages(language, result)` 将 `created-v2`/`exhausted` 结果转为 Notice 消息数组；第 1 次成功返回空数组；第 2/3 次成功和 exhausted 返回两条独立消息；error cache disabled 时第二条为未保存
  - 新增 `tests/ui/review/V2NoticeMessages.test.ts`（5 tests）：覆盖 attempt 1 成功无提示、attempt 2 成功两条、attempt 3 成功两条、3 次失败两条、error cache disabled 未保存文案
- Verification: `npm run typecheck` 通过；`npm test -- tests/ui/review/V2NoticeMessages.test.ts tests/ui/i18n/i18n.test.ts tests/application/CreateProposalUseCase.retry.test.ts` 通过（3 files / 16 tests）
- Next: D52 — session-cache v2 持久化与兼容迁移

---

## D52 开发日志

### Current status

session-cache v2 持久化与兼容迁移已完成。`ObsidianSessionCacheV2Store` 明确只读写 `sessions.v2.json`，旧 `sessions.v1.json` 采用 ignore-v1 策略，不迁移、不崩溃。默认上限为 5；保存和 `setSessionCacheLimit()` 都会按 `updatedAt` 保留最近 session 并清理旧记录。缓存路径、v2 文件路径、legacy v1 文件路径和兼容策略可通过 `getCacheInfo()` 供 Settings UI 读取。保存前继续执行递归字符串 redaction 与 secret key scan。

### Active summary
- Date: 2026-05-06
- Scope: session-cache v2 持久化与兼容迁移（Phase 12 第五任务）
- Reason: v0.2.0 要求成功 `ProposalSessionV2` 可落盘恢复，旧 v1 session 不导致插件崩溃，session-cache 默认上限 5，limit 调整后清理旧记录，并向 Settings UI 暴露缓存位置说明
- Change:
  - `src/runtime/SessionCacheV2Store.ts`：新增 `SessionCacheV2Info`；接口增加可选 `setSessionCacheLimit(limit)` 与 `getCacheInfo()`，避免影响测试替身和后续未迁移调用方
  - `src/adapters/obsidian/ObsidianSessionCacheV2Store.ts`：导出 `SESSION_CACHE_PATH`、`SESSION_FILE_PATH`、`LEGACY_SESSION_FILE_PATH`、`DEFAULT_SESSION_CACHE_V2_LIMIT`；limit 改为可调整；新增 `setSessionCacheLimit()` 与 `getCacheInfo()`；抽出 `writePersisted()` 统一保存、redaction 和 secret scan；导出 `containsSecretPattern()` 供适配器测试
  - `tests/adapters/obsidian/ObsidianSessionCacheV2Store.test.ts` 扩展为 8 tests：v2 session 保存/恢复、旧 `sessions.v1.json` 被 ignore-v1 策略忽略、超过 limit 自动清理旧 session、`setSessionCacheLimit()` 清理旧 session、Settings UI 可读取缓存路径/兼容策略、secret key scan、token usage 白名单、字符串值 redaction
- Verification: `npm run typecheck` 通过；`npm test -- tests/adapters/obsidian/ObsidianSessionCacheV2Store.test.ts tests/application/CreateProposalUseCase.retry.test.ts` 通过（2 files / 17 tests）
- Next: Phase 12 验收任务；通过后进入 Phase 13 / D53（需用户显式要求）

### Phase 12 Verification notes

Phase 12（Retry、Session Cache 与 Error Session Cache）验收通过：

```text
[x] Retry 最多 3 次。
[x] 成功 session 与失败 attempt 分离。
[x] error-session-cache 默认开启，上限 30。
[x] 第 2/3 次成功只保存失败 attempt 到 error cache。
[x] 3 次失败不创建 session。
[x] 请求次数提醒规则符合要求。
[x] session-cache v2 可恢复。
```

额外安全修复：根据 `PROJECT_REVIEW_RECORD.md` 中 ISSUE-001，已补上 v2 session-cache / error-session-cache 写入前递归字符串 redaction，并添加回归测试，防止 Bearer/API key/sk-* 形态内容进入缓存。

Verification:

```text
npm run typecheck
npm test
npm run build
```

结果：typecheck 通过；全量 Vitest 30 files / 298 tests 通过；production build 通过。`ProposalSessionStore` persistence failure 测试仍会输出预期 stderr：`disk full`，不代表失败。

Next: D53 — ReviewViewModel v2 映射（Phase 13，需用户显式要求后再继续）

---

## D53 开发日志

### Current status

ReviewViewModel v2 映射已实现。旧 `createReviewViewModel()` v0.1 路径保持不变；新增 `ReviewViewModelV2` 与 `createReviewViewModelV2()`，让 UI 数据只来自 ViewModel。v2 ViewModel 支持按配置 order 排序的 A 类分块列表，每个 block 含 id、heading、headingLevel、content、warnings、accepted=false；selectedTags 映射为默认未勾选项；newTagSuggestions 作为只读数组保留且不进入 initialDecision 可应用 tags；tagNormalizationApplied、validation warnings、rejectedFields、attemptsUsed 与 token usage 均可展示。尚未执行 D54 ReviewModal v2 交互。

### Active summary
- Date: 2026-05-06
- Scope: ReviewViewModel v2 映射（Phase 13 首任务）
- Reason: v0.2.0 Review UI 必须消费 `ReviewViewModel`，UI 不做 validation、tag normalization、block legality 判断、ApplyPlan 生成或写文件；D53 先把 `ProposalSessionV2` 转成完整 UI 数据
- Change:
  - `src/ui/review/ReviewViewModel.ts`：新增 `ReviewABlockViewModel`、`ReviewSelectedTagViewModel`、`ReviewViewModelV2`、`createReviewViewModelV2(session)`；保留 v0.1 `ReviewViewModel` 和 `createReviewViewModel()`
  - v2 block 映射：从 `session.proposal.blocks` 读取内容，从 `blockConfigSnapshot.aBlocks` 读取 heading/headingLevel/order，按 order 排序；每个 block 默认 `accepted=false`
  - v2 tag 映射：`selectedTags` 变为默认未勾选项；`newTagSuggestions` 只作为只读数据，不写入 `initialDecision.acceptTags.add`
  - v2 validation 映射：暴露 `tagNormalizationApplied`、`validationWarnings`、`rejectedFields`、`attemptsUsed`、`tokenUsage`；frontmatter suggestion 仍只映射 status/source/context
  - `tests/ui/review/ReviewViewModel.test.ts`：新增 3 个 v2 tests，覆盖 A block 映射与默认未勾选、selectedTags/newTagSuggestions 边界、normalization/validation/attempts/token usage 展示
- Verification: `npm run typecheck` 通过；`npm test -- tests/ui/review/ReviewViewModel.test.ts` 通过（1 file / 4 tests）
- Next: D54 — ReviewModal v2 交互

---

## D54 开发日志

### Current status

ReviewModal v2 交互已实现为新增 `ReviewModalV2`，旧 v0.1 `ReviewModal` 保持不变。`ReviewModalV2` 消费 `ReviewViewModelV2`，返回 `UserDecisionV2`。A 类分块逐块展示并可勾选是否应用；正文 block 当前只展示不编辑，避免在 D54 额外引入编辑内容回写语义。selectedTags 可勾选加入 `decision.acceptTags.add`；newTagSuggestions 用只读 textarea 展示，可选中复制，不进入可应用 tags；tagNormalizationApplied、validation warnings、rejectedFields、attemptsUsed 和 token usage 可展示。UI 不做 tag normalization、不生成 ApplyPlan、不写文件。尚未执行 D55 UserDecisionV2 与 BuildApplyPlanUseCase v2。

### Active summary
- Date: 2026-05-06
- Scope: ReviewModal v2 交互（Phase 13 第二任务）
- Reason: v0.2.0 需要 Review UI 能展示 configurable A block proposal，且所有写入项默认未选中；selectedTags 与 newTagSuggestions 必须在 UI 行为上分离
- Change:
  - `src/ui/review/ReviewModal.ts`：新增 `ReviewModalV2` 和 `ReviewModalV2Callbacks`；v2 modal 渲染 A block 列表、frontmatter suggestions、selectedTags、newTagSuggestions、token usage、validation 信息和 action row
  - A block 行为：每个 block 有独立 checkbox，默认 false，切换后只更新 `decision.acceptBlocks[block.id]`
  - Tag 行为：selectedTags checkbox 默认 false，勾选后写入 `decision.acceptTags.add`；newTagSuggestions 只读可复制，不会进入 decision
  - `src/ui/i18n/zh-CN.ts`、`src/ui/i18n/en.ts`：新增 v2 review section、block toggle、normalization、new tag suggestion、attemptsUsed 文案
  - `styles.css`：新增 v2 block、只读 textarea、warning list 样式
- Verification: `npm run typecheck` 通过；`npm test -- tests/ui/review/ReviewViewModel.test.ts tests/ui/i18n/i18n.test.ts` 通过（2 files / 6 tests）
- Next: D55 — UserDecisionV2 与 BuildApplyPlanUseCase v2

---

## D55 开发日志

### Current status

UserDecisionV2 与 BuildApplyPlanUseCase v2 已实现。`ApplyPlan` 新增 v0.2 operations：`replace-refined-blocks` 与 `append-tags`；旧 `replace-refined-body` / `update-tags` 保留给 v0.1。`ApplyPlanner.buildPlanV2()` 只把用户勾选的 A blocks 生成 `replace-refined-blocks`，只把用户勾选且属于 selectedTags + tag whitelist 的 tags 生成 `append-tags`，不再生成 remove-tags。`BuildApplyPlanUseCase.executeV2()` 从 `SessionCacheV2Store` 读取 `ProposalSessionV2`，重新读取当前 note 并提取当前 B block，若 accepted A block 包含完整当前 B block 文本则拒绝生成 plan。尚未执行 D56 ApplyDecisionUseCase v2 写入。

### Active summary
- Date: 2026-05-06
- Scope: UserDecisionV2 与 BuildApplyPlanUseCase v2（Phase 13 第三任务）
- Reason: v0.2.0 需要从 Review UI 返回的 `UserDecisionV2` 生成 ApplyPlan，但所有写入仍必须通过 ApplyPlan，且 newTagSuggestions / remove-tags 不得进入写入计划
- Change:
  - `src/core/apply/ApplyPlan.ts`：新增 `ReplaceRefinedBlocksOperation`（`type: "replace-refined-blocks"`，携带 accepted A blocks）与 `AppendTagsOperation`（`type: "append-tags"`，仅追加 tags）
  - `src/core/apply/ApplyPlanner.ts`：新增 `buildPlanV2(session, decision)`；仅接受 `decision.acceptBlocks[id] === true` 的 proposal blocks；frontmatter 仍只支持 status/source/context；tags 仅从 `selectedTags` 且在 `tagWhitelist` 内筛选；不生成 remove-tags
  - `src/application/BuildApplyPlanUseCase.ts`：新增可选 `SessionCacheV2Store` 注入和 `executeV2(sessionId, decision)`；读取当前 note 并用 `BlockExtractor` 提取 B block；accepted block 含完整当前 B block 文本时返回 `accepted-block-contains-b-block`
  - `tests/application/BuildApplyPlanUseCase.test.ts`：新增 4 个 v2 tests，覆盖 accepted block/tag/frontmatter 生成、未勾选项不进入 plan、newTagSuggestions 不应用且不生成 remove-tags、accepted A block 包含 B block 文本时拒绝
- Verification: `npm run typecheck` 通过；`npm test -- tests/application/BuildApplyPlanUseCase.test.ts` 通过（1 file / 6 tests）
- Next: D56 — ApplyDecisionUseCase v2：replace-refined-blocks 与 append-tags

---

## D56 开发日志

### Current status

ApplyDecisionUseCase v2 已实现。旧 v0.1 `execute()` 保持不变；新增 `executeV2(plan)` 从 `SessionCacheV2Store` 读取 `ProposalSessionV2`，Apply 前重读当前 note，先检查 base file hash，再用 `BlockExtractor` 提取当前 B block 并比较 `baseBBlockHash`。`replace-refined-blocks` 通过 `MarkdownAssembler` 组装 accepted A blocks + 当前 B block，并在 protectH1=true 时保留当前 H1；`append-tags` 只追加仍属于 selectedTags + tag whitelist 的 tags，保留已有 YAML tags、去重、不覆盖、不删除。写入前再次提取 post-apply B block 并逐字比较，防止 B block 被破坏。尚未执行 D57 cached session 命令与只读式 Review UI。

### Active summary
- Date: 2026-05-06
- Scope: ApplyDecisionUseCase v2：replace-refined-blocks 与 append-tags（Phase 13 第四任务）
- Reason: v0.2.0 的所有写入必须通过 ApplyPlan；Apply 阶段必须重读当前文件、做 freshness/B block 检查，并确保 newTagSuggestions 不写入
- Change:
  - `src/core/apply/FrontmatterTagApplier.ts`：新增 `appendTags(markdown, tags)`，仅追加 YAML tags、保留已有 tags、去重、不删除
  - `src/application/ApplyDecisionUseCase.ts`：新增可选 `SessionCacheV2Store` 注入和 `executeV2(plan)`；支持 `replace-refined-blocks`、`update-frontmatter`、`append-tags`；拒绝 v0.1-only operations（`replace-refined-body` / `update-tags`）进入 v2 apply path
  - v2 apply freshness：当前文件 hash 与 `baseFileHash` 不一致返回 `file-changed` conflict；当前 B block hash 与 `baseBBlockHash` 不一致返回 `protected-region-changed` conflict
  - v2 apply assembly：`replace-refined-blocks` 根据 session block config 将 operation blocks 转为 `AcceptedABlock[]`，使用 `MarkdownAssembler` 保留当前 B block；frontmatter 保留并可继续更新
  - `tests/application/ApplyDecisionUseCase.test.ts`：新增 3 个 v2 tests，覆盖 replace-refined-blocks + append-tags + B block 保留、file-changed conflict、B block hash conflict
- Verification: `npm run typecheck` 通过；`npm test -- tests/application/ApplyDecisionUseCase.test.ts` 通过（1 file / 12 tests）
- Next: D57 — Open cached session 命令与只读式 Review UI

---

## D57 开发日志

### Current status

Open cached proposal session / 查看缓存记录流程已接入。新增 `OpenCachedSessionUseCase` 从 v2 session-cache 列出和打开 cached `ProposalSessionV2`；新增 `CachedSessionPickerModal` 展示缓存记录（title/path/status/provider/model/token/attemptsUsed）并进入 v2 Review UI。`ReviewModalV2` 支持 `applyDisabled`，cached session 模式下 Apply selected changes 灰色不可用；Save as Draft 按钮保持可用入口，但实际 v2 草稿导出仍按日计划留给 D58 接入。cached session 不做 freshness apply 恢复，不写原 note。

### Active summary
- Date: 2026-05-06
- Scope: Open cached session 命令与只读式 Review UI（Phase 13 第五任务）
- Reason: v0.2.0 要求 session-cache 可查看最近缓存记录，cached session 只能查看和保存草稿，不能直接 apply
- Change:
  - 新增 `src/application/OpenCachedSessionUseCase.ts`：`list()` 从 `SessionCacheV2Store.loadAll()` 读取并按 `updatedAt` 倒序返回 summary；`open(sessionId)` 返回指定 `ProposalSessionV2`
  - 新增 `src/ui/review/CachedSessionPickerModal.ts`：显示缓存记录列表并打开选中 session；无记录时显示空状态
  - `src/ui/review/ReviewModal.ts`：`ReviewModalV2` 新增 `ReviewModalV2Options.applyDisabled`；cached 模式下 Apply button disabled，点击也不会回调 apply
  - `src/main.ts`：新增命令 `open-cached-proposal-session` / `Open cached proposal session`；创建 `ObsidianSessionCacheV2Store`；命令流程为 picker → `ReviewModalV2(createReviewViewModelV2(session), { applyDisabled: true })`
  - `src/ui/i18n/zh-CN.ts`、`src/ui/i18n/en.ts`：新增 cached session picker 和 cached apply disabled / draft pending 文案
  - 新增 `tests/application/OpenCachedSessionUseCase.test.ts`：覆盖 cached sessions 倒序列表和按 id 打开
- Verification: `npm run typecheck` 通过；`npm test -- tests/application/OpenCachedSessionUseCase.test.ts tests/ui/review/ReviewViewModel.test.ts tests/ui/i18n/i18n.test.ts` 通过（3 files / 8 tests）
- Next: D58 — SaveDraftUseCase v2

---

## D58 开发日志

### Current status

SaveDraftUseCase v2 已实现，cached session 模式下 Save as Draft 已从 D57 的入口接到真实草稿导出。`SaveDraftUseCase.executeV2(sessionId, decision?)` 从 `SessionCacheV2Store` 读取 `ProposalSessionV2`，写独立 draft 文件，不读取/写入原 note。草稿包含 A 类分块 proposal、selectedTags、newTagSuggestions、validation result、tagNormalizationApplied、attemptsUsed、token usage，并可标记用户在 Review 中接受的 block/tag。草稿写入前调用 `redactSensitiveText()`，避免 API key / Authorization / provider secret 形态文本进入 draft。v2 session 保存草稿后状态更新为 `saved_as_draft`。Phase 13 尚待整体验收。

### Active summary
- Date: 2026-05-06
- Scope: SaveDraftUseCase v2（Phase 13 第六任务）
- Reason: v0.2.0 要求正常 proposal 和 cached session 都可 Save as Draft；draft 是独立用户可见草稿，不修改原 note，不包含 secrets
- Change:
  - `src/application/SaveDraftUseCase.ts`：新增可选 `SessionCacheV2Store` 注入和 `executeV2(sessionId, decision?)`；新增 v2 draft content builder，包含 proposed A blocks、selectedTags、newTagSuggestions、validation warnings/rejectedFields、tagNormalizationApplied、attemptsUsed、token usage；写入前 redaction
  - `src/main.ts`：cached `ReviewModalV2` 的 Save as Draft 回调改为调用 `saveCachedDraft(session.id, decision)`，通过 `SaveDraftUseCase.executeV2()` 真实写 draft
  - `tests/application/SaveDraftUseCase.test.ts`：新增 2 个 v2 tests，覆盖 v2 draft 内容/secret redaction/status update，以及 cached session 可保存 draft 且不读写 source note
- Verification: `npm run typecheck` 通过；`npm test -- tests/application/SaveDraftUseCase.test.ts` 通过（1 file / 3 tests）
- Next: Phase 13 验收任务；通过后进入 Phase 14 / D59（需用户显式要求）

### Phase 13 Verification notes

Phase 13（Review UI 与 Cached Session 恢复）验收通过：

```text
[x] ProposalSessionV2 可进入 Review UI。
[x] A 类分块可按块勾选。
[x] selectedTags 可勾选应用。
[x] newTagSuggestions 可复制不可编辑不可应用。
[x] BuildApplyPlanUseCase 使用 UserDecisionV2。
[x] ApplyDecisionUseCase 支持 replace-refined-blocks / append-tags。
[x] cached session UI 中 Apply 灰色，Save as Draft 可用。
```

Verification:

```text
npm run typecheck
npm test
npm run build
```

结果：typecheck 通过；全量 Vitest 31 files / 312 tests 通过；production build 通过。`ProposalSessionStore` persistence failure 测试仍会输出预期 stderr：`disk full`，不代表失败。

Next: D59 — Settings UI 文案迁移与缓存记录设置（Phase 14，需用户显式要求后再继续）

---

## D59 开发日志

### Current status

Settings UI 文案迁移与缓存记录设置已实现。用户可见的 session-cache 设置入口从“历史记录”语义迁移为“缓存记录”，并在 Settings 中显示缓存记录数量上限、缓存内容位置、查看缓存记录入口、错误会话缓存开关、错误会话缓存数量上限和错误会话缓存位置。D59 不改 session-cache / error-session-cache 的核心保存读取规则；仅让 Settings 使用现有 v2 cache store info 和已存在的 cached session 查看流程。`PROJECT_REVIEW_RECORD.md` 未更新，遵守本轮不使用 project-review-lifecycle 时不覆盖更新的要求。尚未执行 D60 密钥 ID 文案与 SecretStorage 诊断复制。

### Active summary
- Date: 2026-05-06
- Scope: Settings UI 文案迁移与缓存记录设置（Phase 14 首任务）
- Reason: v0.2.0 要求用户把 session-cache 理解为短期缓存记录，而不是长期历史；Settings UI 需要显示缓存位置和 error-session-cache 开关/上限，方便用户理解成功 session 与失败 attempt 的边界
- Change:
  - `src/ui/settings/SettingsTab.ts`：新增缓存记录设置区块，显示/编辑 `sessionCache.limit`，显示 session-cache 位置，提供“查看缓存记录”按钮；新增 error-session-cache 开关、上限输入和位置显示
  - `src/main.ts`：新增 SettingsTab 可调用的 cache info / cache settings 更新方法；`sessionCacheV2` 初始化时使用 `settings.sessionCache.limit`；“查看缓存记录”流程从 private 改为 Settings 可调用
  - `src/adapters/obsidian/ObsidianErrorSessionCacheStore.ts`：导出 error-session-cache 路径和默认上限常量，供 Settings UI 展示；不改变保存/读取逻辑
  - `src/ui/i18n/zh-CN.ts`、`src/ui/i18n/en.ts`：新增缓存记录、缓存内容位置、错误会话缓存、查看缓存记录等文案；旧 historyLimit 用户文案改为 cache record 语义
  - `tests/ui/i18n/i18n.test.ts`：新增回归测试，确认 Settings session-cache 文案使用“缓存记录”而非“历史记录”
- Verification: `npm run typecheck` 通过；focused tests 通过（3 files / 22 tests）；`npm test` 全量通过（31 files / 313 tests）；`npm run build` 通过
- Next: D60 — Settings UI：密钥 ID 文案与 SecretStorage 诊断复制

---

## D60 开发日志

### Current status

Settings UI 的密钥文案与 SecretStorage 诊断已迁移。用户可见文案统一使用 `Key ID / 密钥 ID`，不再使用 Secret Reference / secret reference / key name 这类混用称呼。SecretStorage diagnostics 从 `<pre>` 改为只读 textarea，可选中复制但不可编辑；诊断内容显示 SecretStorage 可用性、当前密钥 ID 是否配置、是否能读到值、读取值是否等于密钥 ID、读取值长度，以及脱敏前后缀，不输出真实 API key。D35 污染场景（读取值等于密钥 ID）已由测试覆盖。尚未执行 D61 A/B 分块配置 UI。

### Active summary
- Date: 2026-05-06
- Scope: Settings UI：密钥 ID 文案与 SecretStorage 诊断复制（Phase 14 第二任务）
- Reason: 用户需要理解 settings 中保存的是密钥 ID，而真实 API key 只在 Obsidian SecretStorage 中；诊断必须能定位 D35 污染值问题，同时不泄露真实 key
- Change:
  - `src/ui/i18n/zh-CN.ts`、`src/ui/i18n/en.ts`：Settings、provider notice、provider help 文案统一为 `密钥 ID / Key ID`
  - `src/adapters/obsidian/ObsidianSecretStore.ts`：`getDiagnostics(configuredKeyId?)` 增加 configured key 可读性字段、value equals key id、value length、脱敏前后缀；错误文案改为 Key ID
  - `src/ui/settings/SettingsTab.ts`：SecretStorage diagnostics 改为只读 textarea，输出新增诊断字段，可复制不可编辑
  - `src/adapters/llm/OpenAICompatibleProvider.ts`：缺 key / 污染 key 错误文案改为 Key ID 语义，D35 防御保持不变
  - `styles.css`：诊断 textarea 增加稳定尺寸、可调整高度和全宽样式
  - `tests/adapters/obsidian/ObsidianSecretStore.test.ts`：新增诊断测试，覆盖真实 key 不泄露和读取值等于 Key ID 的污染场景
  - `tests/ui/i18n/i18n.test.ts`、`tests/adapters/llm/OpenAICompatibleProvider.test.ts`：更新 Key ID 文案回归
- Verification: `npm run typecheck` 通过；`npm test -- tests/adapters/llm/OpenAICompatibleProvider.test.ts tests/adapters/obsidian/ObsidianSecretStore.test.ts tests/ui/i18n/i18n.test.ts` 通过（3 files / 12 tests）；source search 确认 `src/ui`、`src/main.ts`、`src/adapters`、`src/application` 无旧 Secret Reference / secret reference / key name / 密钥引用 文案残留
- Next: D61 — Settings UI：A/B 分块配置

---

## D61 开发日志

### Current status

Settings UI 的 A/B 分块配置入口已实现。设置页现在可切换 `保护一级标题`，显示并编辑 A 类分块列表（名称、标题层级、prompt、启用状态、排序），支持新增/删除 A 类分块，并可编辑唯一 B 类分块名称和标题层级。保存配置统一通过 `BlockConfigValidator`，Settings UI 只展示表单和 core 返回的错误，不自行实现嵌套/层级规则；protectH1=true 时 level=1 的 A/B 配置会被 core validator 拒绝且不会写入 settings。尚未执行 D62 tagWhitelist 与 tag prompt UI。

### Active summary
- Date: 2026-05-06
- Scope: Settings UI：A/B 分块配置（Phase 14 第三任务）
- Reason: v0.2.0 的 raw-refined workflow 需要用户可配置 A/B 分块，但配置合法性必须由 core validator 判定，不能把 workflow 规则硬编码在 UI 中
- Change:
  - `src/ui/settings/SettingsTab.ts`：新增 A/B 分块设置区块；支持 protectH1 toggle、A 类分块 name/headingLevel/prompt/enabled/order 编辑、新增/删除 A 类分块、B 类分块 name/headingLevel 编辑
  - `src/main.ts`：新增 `updateRawRefinedSettings()`，合并 rawRefined 配置后调用 `BlockConfigValidator.validate()`；验证失败返回错误且不保存
  - `src/ui/i18n/zh-CN.ts`、`src/ui/i18n/en.ts`：新增 A/B 分块配置、保护一级标题、A/B 字段、新增/删除按钮文案
  - `styles.css`：新增 Settings 分块配置列表和单个分块配置块样式
- Verification: `npm run typecheck` 通过；`npm test -- tests/core/profile/BlockConfigValidator.test.ts tests/ui/i18n/i18n.test.ts` 通过（2 files / 18 tests）
- Next: D62 — Settings UI：Tag 白名单与 tag prompt

---

## D62 开发日志

### Current status

Settings UI 的 tagWhitelist 与 tag prompt 配置入口已实现。设置页现在展示 tag 白名单，支持逐项删除、新增 tag、批量文本编辑白名单，并提供 tagPrompt textarea。白名单保存时复用 `normalizeTagList()`：支持英文逗号、中文逗号、空格、换行、顿号分隔，自动补 `#`、去重，并保留大小写。Settings 文案明确 selectedTags 只有在白名单中才可应用，newTagSuggestions 只展示和复制，永远不会直接写入。尚未执行 D63 模型连接性测试。

### Active summary
- Date: 2026-05-06
- Scope: Settings UI：Tag 白名单与 tag prompt（Phase 14 第四任务）
- Reason: v0.2.0 tag 模型要求 selectedTags 受用户白名单约束，newTagSuggestions 不可直接应用；Settings 需要让用户维护白名单和模型 tag prompt，同时复用 core normalization 规则
- Change:
  - `src/ui/settings/SettingsTab.ts`：新增 tag 配置区块；展示 tagWhitelist，支持删除、新增和批量文本编辑；新增 tagPrompt textarea；保存白名单时调用 `normalizeTagList()`
  - `src/ui/i18n/zh-CN.ts`、`src/ui/i18n/en.ts`：新增 tag 配置、白名单、新增/删除、批量编辑、tag prompt，以及 selectedTags/newTagSuggestions 边界说明
  - tag 保存行为：补 `#`、按多种分隔符拆分、去重、不做大小写归一化；配置保存仍经 `updateRawRefinedSettings()`，避免绕过 rawRefined 配置验证
- Verification: `npm run typecheck` 通过；`npm test -- tests/core/proposal/TagNormalizer.test.ts tests/ui/i18n/i18n.test.ts` 通过（2 files / 35 tests）
- Next: D63 — 模型连接性测试

---

## D63 开发日志

### Current status

模型连接性测试已实现。新增 `TestModelConnectionUseCase`，在不进入 proposal pipeline、不创建 ProposalSession、不写 session-cache/error-session-cache 的前提下，检查 provider 配置、密钥 ID、SecretStorage 可用性与 key 可读性，然后发送不包含真实 note 内容的最小连接请求。Settings UI 增加“测试模型连接”按钮，结果通过 Notice 显示。D35 防御保留：如果 SecretStorage 读到的值等于密钥 ID，则连接测试直接返回 `key-value-polluted`，不会向 provider 发送请求。尚未执行 D64 Prompt 可观测面板。

### Active summary
- Date: 2026-05-06
- Scope: 模型连接性测试（Phase 14 第五任务）
- Reason: 用户需要在生成 proposal 前确认 provider / model / Key ID / SecretStorage 是否可用；连接测试必须与 refined proposal 分离，不能读取真实 note、不能创建 session 或写缓存
- Change:
  - 新增 `src/application/TestModelConnectionUseCase.ts`：区分 `secret-storage-unavailable`、`key-id-missing`、`key-read-failed`、`key-value-polluted`、`model-missing`、`base-url-missing`、`provider-failed`、`invalid-model-response`、`success`
  - `src/main.ts`：新增 `testModelConnection()`，为 Settings UI 组装 mock 或 OpenAI-compatible provider，并调用 use case
  - `src/ui/settings/SettingsTab.ts`：provider 设置区新增“测试模型连接”按钮
  - `src/ui/i18n/zh-CN.ts`、`src/ui/i18n/en.ts`：新增模型连接测试按钮、说明和成功/失败 Notice 文案
  - 新增 `tests/application/TestModelConnectionUseCase.test.ts`：覆盖 mock 成功、最小请求不含真实 note content、SecretStorage 不可用、密钥 ID 缺失、D35 污染值、防 provider error 泄密
- Verification: `npm run typecheck` 通过；`npm test -- tests/application/TestModelConnectionUseCase.test.ts tests/ui/i18n/i18n.test.ts tests/adapters/llm/OpenAICompatibleProvider.test.ts` 通过（3 files / 15 tests）
- Next: D64 — Prompt 可观测面板 / Debug Snapshot 查看

---

## D64 开发日志

### Current status

Prompt 可观测面板 / Debug Snapshot 查看已实现。新增内存型 `PromptObservationStore`，保存最近一次 v0.2 prompt debug snapshot，保存前会递归脱敏；默认不写入磁盘。Settings UI 增加 `Prompt 可观测` 开关和最近一次 snapshot 的只读 textarea，可复制查看 request prompts、tag whitelist、response、parsed JSON、Zod result 与 normalization report。`CreateProposalUseCase.executeV2()` 在 `promptObservationEnabled=true` 且注入 store 时记录 provider failure、Zod failure、normalization invalid 和 success 的最近 snapshot；`promptObservationEnabled=false` 时不记录成功请求全文。Phase 14 尚待整体验收。

### Active summary
- Date: 2026-05-06
- Scope: Prompt 可观测面板 / Debug Snapshot 查看（Phase 14 第六任务）
- Reason: v0.2.0 需要用户/开发者能检查最终 prompt、响应、解析和验证结果，但正常成功请求默认不能落盘完整 prompt/response，所有可观测内容必须脱敏
- Change:
  - 新增 `src/runtime/PromptObservationStore.ts`：`InMemoryPromptObservationStore` 仅保留最近一次 snapshot，保存前调用递归 redaction
  - `src/application/CreateProposalUseCase.ts`：v2 pipeline 在开启 `promptObservationEnabled` 且注入 store 时记录 request/response/validation/normalization snapshot；不开启则不记录
  - `src/main.ts`：新增内存 prompt observation store 和 `getLatestPromptObservation()` 供 Settings UI 读取
  - `src/ui/settings/SettingsTab.ts`：新增 Prompt 可观测开关和最近一次 Debug Snapshot 只读可复制 textarea
  - `src/ui/i18n/zh-CN.ts`、`src/ui/i18n/en.ts`：新增 prompt observation 设置、空状态和隐私边界说明
  - 新增 `tests/runtime/PromptObservationStore.test.ts`：覆盖 snapshot 保存前 redaction，确保 API key / Authorization / Bearer 形态内容不保留
- Verification: `npm run typecheck` 通过；`npm test -- tests/runtime/PromptObservationStore.test.ts tests/core/prompt/PromptBuilder.test.ts tests/ui/i18n/i18n.test.ts` 通过（3 files / 19 tests）
- Next: Phase 14 验收任务；通过后进入 Phase 15 / D65（需用户显式要求）

### Phase 14 Verification notes

Phase 14（Settings UI 与可观测性）验收通过：

```text
[x] Settings UI 支持缓存记录文案与位置说明。
[x] 密钥 ID 文案统一。
[x] SecretStorage 诊断可复制不可编辑。
[x] A/B 分块配置 UI 可用。
[x] tagWhitelist / tagPrompt UI 可用。
[x] 模型连接性测试可用。
[x] Prompt debug snapshot 可查看/复制。
```

Verification:

```text
npm run typecheck
npm test
npm run build
```

结果：typecheck 通过；全量 Vitest 34 files / 322 tests 通过；production build 通过。`ProposalSessionStore` persistence failure 测试仍会输出预期 stderr：`disk full`，不代表失败。

Next: D65 — v0.1 → v0.2 自动测试迁移与旧测试清理（Phase 15，需用户显式要求后再继续）

---

## D65 开发日志

### Current status

v0.1 → v0.2 自动测试迁移与旧测试清理已完成第一轮。`ProposalValidator.test.ts` 已从 fixed `refinedSections` / unknown-tag fatal 语义迁到 `RawRefinedProposalV2`：v2 validator 现在测试 blocks schema、fenced JSON 提取、Zod failure、unknown selectedTags 不导致整份 proposal 失败，以及 forbidden legacy capability fields 会被拒绝。为配合该测试，v2 Zod schema 改为 strict，避免 `linkOperations` 等外部能力字段被静默丢弃。append-tags / newTagSuggestions / no remove-tags 的 v2 apply-plan 测试已保持通过。尚未执行 D66 v0.2 mock 端到端 happy path。

### Active summary
- Date: 2026-05-06
- Scope: v0.1 → v0.2 自动测试迁移与旧测试清理（Phase 15 首任务）
- Reason: v0.2 的 proposal schema 已从固定 `refinedSections` 迁到 configurable `blocks`；unknown selectedTags 应由 normalization 移入 newTagSuggestions，而不是在 validator 阶段整体失败
- Change:
  - `tests/core/proposal/ProposalValidator.test.ts`：重写为 v0.2 validator 测试，覆盖 `RawRefinedProposalV2` blocks、fenced JSON、Zod errors、unknown selectedTags 可通过结构校验、legacy capability fields 被拒绝
  - `src/core/proposal/ProposalSchema.ts`：v2 root schema、A block schema、frontmatterSuggestion、tagSuggestion 改为 `.strict()`，防止 rename/move/link/MOC 等外部能力字段被静默接受
  - 保持 `tests/application/BuildApplyPlanUseCase.test.ts` 中 v2 append-tags / no remove-tags / newTagSuggestions 不应用测试通过
- Verification: `npm run typecheck` 通过；`npm test -- tests/core/proposal/ProposalSchema.test.ts tests/core/proposal/ProposalValidator.test.ts tests/core/proposal/ProposalNormalizer.test.ts tests/application/BuildApplyPlanUseCase.test.ts tests/application/ApplyDecisionUseCase.test.ts` 通过（5 files / 64 tests）
- Next: D66 — v0.2 端到端 mock happy path

---

## D66 开发日志

### Current status

v0.2 mock happy path 已跑通。主 `Refine current note` 命令已从 v0.1 `execute()` 路径切到 `executeV2()`，并注入 v2 session-cache、error-session-cache 与 prompt observation store。生成成功后打开 `ReviewModalV2`；Apply 走 `BuildApplyPlanUseCase.executeV2()` 与 `ApplyDecisionUseCase.executeV2()`；Save as Draft 走 `SaveDraftUseCase.executeV2()`。新增 E2E-style application test，覆盖 raw note → A/B eligibility → prompt/Zod/normalization → session-cache → ReviewViewModel → UserDecisionV2 → ApplyPlan → safe apply → draft → cached session list。验证 B 类分块逐字保留、selectedTags 只追加到 YAML tags、newTagSuggestions 不写入原 note、cached session 可 Save as Draft。

### Active summary
- Date: 2026-05-06
- Scope: v0.2 端到端 mock happy path（Phase 15 第二任务）
- Reason: v0.2 的核心闭环需要从 mock provider 开始证明：configurable A/B blocks、selectedTags/newTagSuggestions、ApplyPlan-only write、B block preservation、draft/cached session 行为能一起工作
- Change:
  - `src/main.ts`：`Refine current note` 改为调用 `CreateProposalUseCase.executeV2()`；接入 v2 retry/error-cache notices；新增 `openReviewForSessionV2()` 和 `applySelectedChangesV2()`，正常新生成 session 可进入可 Apply 的 v2 Review UI
  - `src/main.ts`：v2 create flow 注入 `ObsidianErrorSessionCacheStore`、`sessionCacheV2`、`promptObservationStore`
  - 新增 `tests/application/V2MockHappyPath.test.ts`：使用 mock v2 provider 和内存 note/cache，覆盖 v0.2 生成、review decision、safe apply、B block 保留、YAML append-tags、newTagSuggestions 不写入、SaveDraft v2 和 cached session list
- Verification: `npm run typecheck` 通过；`npm test -- tests/application/V2MockHappyPath.test.ts tests/application/CreateProposalUseCase.retry.test.ts tests/application/BuildApplyPlanUseCase.test.ts tests/application/ApplyDecisionUseCase.test.ts tests/application/SaveDraftUseCase.test.ts` 通过（5 files / 31 tests）
- Next: D67 — 真实 provider 手动验证与 error-session-cache 验证

---

## D67 开发日志

### Current status

真实 provider 手动验证在当前 Codex 工作区未执行：这里没有可交互的真实 Obsidian runtime、SecretStorage 配置和真实 DeepSeek/OpenAI-compatible API Key，无法完成一次真实 provider happy path。已完成可自动验证的等价风险路径：模型连接测试 use case 覆盖 mock success、SecretStorage unavailable、Key ID missing、D35 polluted value、防 provider error 泄密；OpenAI-compatible provider 测试覆盖真实 key 从 SecretStorage 进入 Authorization header 且不使用 Key ID 作为 bearer token；retry/error-session-cache 测试覆盖第 1 次成功、第 2/3 次成功、3 次失败、成功 session 与 failed attempt 分离；error-session-cache adapter 测试覆盖递归 redaction 和 secret-pattern 阻断。真实 provider 手动验证缺口已明确留到真实 Obsidian 环境。

### Active summary
- Date: 2026-05-06
- Scope: 真实 provider 手动验证与 error-session-cache 验证（Phase 15 第三任务）
- Reason: release 前必须确认 provider 连接、retry、session-cache/error-session-cache 分离、失败 attempt 脱敏和 D35 Bearer 污染防御；当前环境无法手动连接真实 provider，因此记录明确缺口并跑自动化风险验证
- Change:
  - 未新增代码；执行并记录 D67 focused verification
  - 自动验证覆盖：第 1 次成功不写 error-cache；第 2/3 次成功只保存失败 attempts 到 error-cache；3 次失败不创建 session；FailedAttemptRecord 与 ProposalSessionV2 分离；error-session-cache 写入前递归脱敏；含 Authorization/Bearer/API key 形态字符串不会明文保留
  - 明确缺口：未在真实 Obsidian 中配置 DeepSeek/OpenAI-compatible provider，未完成真实 provider happy path 手动运行
- Verification: `npm test -- tests/application/CreateProposalUseCase.retry.test.ts tests/adapters/obsidian/ObsidianErrorSessionCacheStore.test.ts tests/adapters/obsidian/ObsidianSessionCacheV2Store.test.ts tests/application/TestModelConnectionUseCase.test.ts tests/adapters/llm/OpenAICompatibleProvider.test.ts` 通过（5 files / 39 tests）
- Next: D68 — 更新 README 与测试矩阵

---

## D68 开发日志

### Current status

README 与 v0.2 测试矩阵已更新。README 已从 v0.1 固定 section 说明改为 v0.2 review-first 单篇笔记 workflow，补充 A/B 分块配置、tagWhitelist / selectedTags / newTagSuggestions、缓存记录 / 错误会话缓存、密钥 ID / SecretStorage、模型连接性测试、Prompt 可观测和安全边界说明。新增 `docs/test-matrix-v0.2.md`，列出自动化覆盖、手动验证项、真实 provider 缺口和 release checks。尚未执行 D69 v0.2.0 交付检查。

### Active summary
- Date: 2026-05-06
- Scope: 更新 README 与测试矩阵（Phase 15 第四任务）
- Reason: v0.2 行为已经从 fixed `refinedSections` 迁到 configurable A/B blocks；用户文档需要解释密钥 ID、缓存记录不是历史记录、selectedTags/newTagSuggestions 分工和测试覆盖
- Change:
  - `README.md`：重写为 v0.2 使用说明，覆盖安装、基本流程、A/B 分块、tag 模型、缓存记录、Provider 与密钥 ID、Prompt 可观测、安全边界和开发命令
  - 新增 `docs/test-matrix-v0.2.md`：记录自动化测试矩阵、手动验证矩阵、真实 provider 未在当前 Codex workspace 手动运行的缺口，以及 release checks
  - README 测试矩阵链接改为 `docs/test-matrix-v0.2.md`
- Verification: `npm run typecheck` 通过；文档搜索确认 README 不再引用旧 `docs/TEST-MATRIX.md`，并包含 newTagSuggestions / remove-tags 边界说明
- Next: D69 — v0.2.0 交付检查

---

## D69 开发日志

### Current status

v0.2.0 交付检查已完成。新增 `docs/delivery-checklist-v0.2.md`，记录完成项、scope freeze、安全检查、验证命令和真实 provider 手动验证缺口。按 v0.2 架构边界执行了源码搜索和 ApplyPlan 检查：v2 apply operation 限定为 `replace-refined-blocks` / `update-frontmatter` / `append-tags`；未引入 rename/move/archive/delete/remove-tags/batch refine/MOC/link 写入；UI 不直接写 note，写入仍经 Application/ApplyPlan/NoteFilePort；session-cache / error-session-cache / draft / prompt observation 均有 redaction 或 secret scan 覆盖。Phase 15 验收通过，唯一明确缺口是真实 DeepSeek/OpenAI-compatible provider 未在当前 Codex workspace 手动运行。

### Active summary
- Date: 2026-05-06
- Scope: v0.2.0 交付检查（Phase 15 第五任务）
- Reason: release 前需要确认 v0.2 架构边界、scope freeze、ApplyOperation 集合、UI 写入边界、cache secret scan、文档与测试矩阵完整，并跑最终 typecheck/test/build
- Change:
  - 新增 `docs/delivery-checklist-v0.2.md`：完成项、scope freeze、安全检查、最终验证、真实 provider 手动验证缺口和真实 Obsidian release smoke 建议
  - 执行 D69 搜索检查：out-of-scope capabilities、UI write boundaries、ApplyOperation set、redaction/secret scan anchors
  - 确认 v0.1 compatibility 类型仍保留 `replace-refined-body` / `update-tags`，但 v2 flow 使用并测试 `replace-refined-blocks` / `update-frontmatter` / `append-tags`
- Verification: `npm run typecheck` 通过；`npm test` 全量通过（35 files / 321 tests）；`npm run build` 通过。`ProposalSessionStore` persistence failure 测试仍会输出预期 stderr：`disk full`，不代表失败
- Next: v0.2.0 代码交付完成；真实 provider release smoke 需在真实 Obsidian vault + SecretStorage/API key 环境执行

### Phase 15 Verification notes

Phase 15（端到端迁移、测试矩阵与交付检查）验收通过：

```text
[x] 旧测试已迁移到 v0.2 模型。
[x] mock happy path 完整通过。
[x] 真实 provider 路径完成自动化风险验证，真实手动运行缺口已明确记录。
[x] error-session-cache 验证通过。
[x] README 更新。
[x] TEST-MATRIX 更新：新增 docs/test-matrix-v0.2.md。
[x] v0.2.0 delivery checklist 输出：docs/delivery-checklist-v0.2.md。
```

Final verification:

```text
npm run typecheck
npm test
npm run build
```

结果：typecheck 通过；全量 Vitest 35 files / 321 tests 通过；production build 通过。
