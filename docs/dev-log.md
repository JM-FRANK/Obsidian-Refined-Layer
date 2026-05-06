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
