# Obsidian Refined Layer 插件开发日计划 v0.2.0

> 来源文档：`docs/obsidian-refined-layer-architecture-v0.2.0-agent.md`
> 衔接状态：基于 v0.1.0 已交付、D29-D30 session 持久化与恢复、D32 写入安全闭环、D35 SecretStorage / DeepSeek 修复后的当前进度
> 计划单位：每个 `Dn` 约 4 小时工程量
> 执行对象：Codex / Claude Code / AI coding agent / 人类开发者
> 核心原则：从固定 `raw-refined` section 模型升级为 v0.2.0 的“可配置 A/B 分块 + 结构化 Tag 建议 + Prompt 可观测 + Zod 校验重试 + Session/Error Cache 分离”模型。

---

## 0. 当前状态基线

### 0.1 已完成能力

当前代码已具备 v0.1.0 最小闭环：

```text
active note 读取
→ raw-refined eligibility
→ protected region 提取
→ mock / real provider proposal
→ validator
→ session-cache 持久化
→ Review UI
→ ApplyPlan
→ freshness check
→ safe apply / save draft
```

已完成并可复用的关键能力：

```text
1. Core / Application / Adapters / UI / Runtime 分层。
2. ApplyPlan 作为唯一写入入口。
3. ReviewGate / ReviewModal 审核流。
4. ProposalSessionStore 磁盘持久化。
5. SessionPickerModal 与 session 恢复基础 UI。
6. H1 保护与 protected region 写入前后校验。
7. OpenAI-compatible / DeepSeek / custom / local provider 接入。
8. SecretStorage 安全存储与 D35 污染值防御。
9. token usage actual / estimated / unavailable。
10. redaction 与 secret scan 基础能力。
```

### 0.2 本轮不推翻的底层原则

v0.2.0 是核心 workflow 模型升级，不是全项目推倒重来。

继续保留：

```text
Core / Application / Adapters / UI / Runtime 分层
ApplyPlan 唯一写入入口
UI 不直接写文件
LLM 输出不可信
SecretStorage 保存真实 API key
data.json 不保存真实 API key
Review UI 只消费 ViewModel 并返回 UserDecision
Apply 前 freshness check
```

### 0.3 本轮必须重构的核心区域

```text
WorkflowProfile / rawRefinedProfile
A/B block config 与 block parser
PromptBuilder
RawRefinedProposal schema
ProposalValidator / normalizer
TagPolicy / TagNormalizer
ProposalSession v2
FailedAttemptRecord / error-session-cache
Settings UI
ReviewViewModel / ReviewModal
ApplyPlanner / ApplyDecisionUseCase
SaveDraftUseCase
```

---

## 1. 文档与日志路径约定

### 1.1 历史日志归档

你将把旧 `dev-log.md` 改名并移动为：

```text
docs/achieve/dev-log-achieve.md
```

该文件作为 v0.1.0 / D1-D35 的历史完成记录。后续开发任务不要把新增日志继续写入该文件。

### 1.2 新开发日志

v0.2.0 新增开发日志建议写入：

```text
docs/dev-log.md
```

如果你希望显式区分版本，也可以改为：

```text
docs/dev-log-v0.2.md
```

但本计划默认使用：

```text
docs/dev-log.md
```

### 1.3 文档引用更新

涉及路径引用的文档需要更新：

```text
AGENTS.md
README.md
docs/*.md
```

应将旧日志引用从：

```text
docs/dev-log.md
```

区分为：

```text
docs/achieve/dev-log-achieve.md  # 历史完成记录
docs/dev-log.md                  # 当前活跃开发日志
```

### 1.4 日志格式

每个 `Dn` 完成后必须追加：

```md
## Dn 开发日志

### Current status

### Active summary
- Date:
- Scope:
- Reason:
- Change:
- Verification:
- Next:
```

### 1.5 Agent 检索约束

执行 v0.2.0 任务时：

```text
1. 不要每次完整读取 docs/achieve/dev-log-achieve.md。
2. 只按当前 Dn 相关关键词窗口化检索旧日志。
3. 当前活跃日志只读 docs/dev-log.md。
4. 每完成一个 Phase，再做一次阶段摘要，避免上下文爆炸。
```

---

## 2. 执行边界

### 2.1 每日工作边界

每个 `Dn` 只完成当天范围内的任务。

不得提前实现：

```text
MCP adapter
HTTP server
File Inbox adapter
外部 proposal import
外部审核通道
批量 refine
MOC 写入
关系链接写入
rename / move / archive / delete
tag remove
A 类分块嵌套
selectedTags 覆盖式写入
newTagSuggestions 直接应用
价格估算
tokenizer 选择 UI
```

### 2.2 每日完成定义

每个 `Dn` 完成后必须满足：

```text
1. 代码能 typecheck。
2. 相关测试通过，或明确说明为什么只能手动验证。
3. 不破坏 mock provider happy path。
4. 不让 UI 承载核心规则。
5. 不让 API key / Authorization / provider secret 进入 data.json、session-cache、error-session-cache、draft、日志或错误信息。
6. 更新 docs/dev-log.md。
```

建议每个 Dn 最少运行：

```bash
npm run typecheck
npm test
npm run build
```

如果当日只涉及文档，可说明无需运行 build，但要明确理由。

---

# Phase 9：v0.2.0 迁移基线与类型骨架

目标：建立 v0.2.0 的活跃文档路径、核心类型和设置迁移基础，不改变运行时行为。

---

## D36：文档归档衔接与 v0.2.0 开发基线

预计工程量：4 小时

任务：

```text
1. 确认旧日志已移动到 docs/achieve/dev-log-achieve.md。
2. 创建新的 docs/dev-log.md，作为 v0.2.0 活跃日志。
3. 更新 README / AGENTS.md / docs 中的 dev-log 路径引用。
4. 将 v0.2.0 架构书路径写入 AGENTS.md 的任务入口说明。
5. 在 docs/dev-log.md 中写入 v0.2.0 起始状态摘要，不复制旧日志全文。
6. 确认后续任务编号从 D36 继续。
```

验收：

```text
docs/achieve/dev-log-achieve.md 作为历史日志存在。
docs/dev-log.md 作为活跃日志存在。
AGENTS.md 不再要求完整读取历史 dev-log。
README / docs 中没有错误的旧路径引用。
项目 typecheck/build 不受影响。
```

开发日志重点：记录历史日志归档路径、新活跃日志路径和 agent 检索约束。

---

## D37：定义 v0.2.0 核心类型与设置结构

预计工程量：4 小时

任务：

```text
1. 新增或改造 ABlockConfig / BBlockConfig / RawRefinedWorkflowSettings。
2. 新增 TagPolicy / tagWhitelist / tagPrompt 类型。
3. 新增 ProposalSessionV2 / FailedAttemptRecord / ProposalValidationResult 类型。
4. 新增 UserDecisionV2 类型。
5. 新增 session-cache / error-session-cache settings 类型。
6. 保留旧类型兼容层，暂不删除旧 RawRefinedProposal。
7. 不改 UI，不改 provider，不改 apply 行为。
```

建议范围：

```text
src/core/profile/BlockConfig.ts
src/core/profile/TagPolicy.ts
src/core/proposal/Proposal.ts
src/core/review/UserDecision.ts
src/runtime/ProposalSession.ts
src/settings/PluginSettings.ts
```

验收：

```text
v0.2 类型可 import。
旧测试不因类型迁移失败。
没有运行时行为变化。
data.json 不新增敏感字段。
```

开发日志重点：记录 v0.1 fixed sections 到 v0.2 block config 的类型差异。

---

## D38：设置默认值、数据迁移与 sanitize 策略

预计工程量：4 小时

任务：

```text
1. 为 RawRefinedWorkflowSettings 提供默认配置。
2. 默认 A 类分块映射旧 v0.1.0 sections：摘要、核心问题、当前结论、依据与推理、适用边界、后续处理、整理说明。
3. 默认 B 类分块为 heading=原始内容、headingLevel=2。
4. 默认 tagWhitelist 使用现有 V0.1 标签集。
5. 将 historyLimit 迁移/映射为 cache.sessionCacheLimit。
6. 新增 errorSessionCacheEnabled=true，errorSessionCacheLimit=30。
7. sanitizeSettings 白名单允许 v0.2 设置，但继续阻断 API key / token / Authorization / secret。
```

建议范围：

```text
src/settings/PluginSettings.ts
src/adapters/obsidian/ObsidianSettingsStore.ts
tests/adapters/obsidian/ObsidianSettingsStore.test.ts
```

验收：

```text
旧 data.json 可加载并自动补默认 rawRefined 配置。
设置保存后不包含真实 API key。
errorSessionCache 默认开启，上限 30。
historyLimit 不再作为用户文案出现，但旧配置可迁移。
```

开发日志重点：记录 settings migration 与 sanitize 白名单变化。

---

## Phase 9 验收任务

```text
[ ] 历史 dev-log 已归档到 docs/achieve/dev-log-achieve.md。
[ ] 新 docs/dev-log.md 可作为 v0.2 活跃日志。
[ ] v0.2 核心类型存在。
[ ] 默认 A/B block config 存在。
[ ] tagWhitelist / tagPrompt 设置存在。
[ ] session-cache / error-session-cache 设置存在。
[ ] settings sanitize 不泄露 secret。
```

---

# Phase 10：Markdown Heading 与 A/B 分块解析

目标：实现 v0.2.0 的 Markdown 分块基础能力，替代固定 `## 原始内容` 到文末的模型。

---

## D39：实现 HeadingParser 与保护一级标题规则

预计工程量：4 小时

任务：

```text
1. 新增 HeadingParser，识别 Markdown ATX heading 的 level、text、start/end range。
2. 识别 frontmatter 之后的第一个 H1。
3. 实现 protectH1 规则：开启时 A/B 最小层级为 2，关闭时最小层级可为 1。
4. 为 heading text trim、空 heading、重复 heading 建立基础行为。
5. 不改现有 apply 写入逻辑。
```

建议范围：

```text
src/core/markdown/HeadingParser.ts
src/core/profile/BlockConfigValidator.ts
tests/core/markdown/HeadingParser.test.ts
tests/core/profile/BlockConfigValidator.test.ts
```

验收：

```text
能识别 H1-H6。
能识别 frontmatter 后第一个 H1。
protectH1=true 时 level=1 的 A/B config 被拒绝。
protectH1=false 时 level=1 的 A/B config 允许。
不处理 Setext heading，或明确记录暂不支持。
```

开发日志重点：记录 heading 识别范围和 protectH1 的最小实现边界。

---

## D40：实现 B 类分块提取器

预计工程量：4 小时

任务：

```text
1. 新增 BlockExtractor 或改造 ProtectedRegionExtractor。
2. 按 BBlockConfig 的 heading + headingLevel 定位唯一 B 类分块。
3. B 类分块范围为：从该 heading 起，到下一个同级或更高级 heading 之前。
4. B 类分块内部低级 heading 一并保留。
5. 对 missing / multiple / empty / invalid level 返回明确错误。
6. 计算 baseBBlockHash。
```

建议范围：

```text
src/core/markdown/BlockExtractor.ts
src/core/protected-region/ProtectedRegionExtractor.ts 或兼容包装
tests/core/markdown/BlockExtractor.test.ts
```

验收：

```text
B 类分块可不在文末。
B 类分块内的三级/四级标题被逐字保留。
下一个同级 heading 会结束 B 类分块。
下一个更高级 heading 会结束 B 类分块。
缺失/重复/空 B 类分块有结构化错误。
```

开发日志重点：记录从 `from-heading-to-end` 到 configured range 的迁移边界。

---

## D41：将 eligibility 切到 A/B block config

预计工程量：4 小时

任务：

```text
1. CheckEligibilityUseCase 改为读取 RawRefinedWorkflowSettings。
2. eligibility 检查 B 类分块存在且唯一。
3. eligibility 检查 A 类分块配置合法：id 唯一、enabled block 不为空、无嵌套、层级符合 protectH1。
4. 保留 status=raw / frontmatter required / .md 检查。
5. 更新 i18n 错误原因。
```

建议范围：

```text
src/application/CheckEligibilityUseCase.ts
src/core/profile/rawRefinedProfile.ts
src/ui/i18n/*.ts
tests/application/CheckEligibilityUseCase.test.ts
```

验收：

```text
默认配置下旧的 ## 原始内容 note 仍可通过。
B 类分块改成自定义 heading 后可通过。
B 类分块缺失时失败。
protectH1=true 且 B level=1 时失败。
A block id 重复时失败。
```

开发日志重点：记录旧 note 兼容性和自定义 B 类分块 eligibility。

---

## D42：实现 MarkdownAssembler v2 的内存组装

预计工程量：4 小时

任务：

```text
1. 新增 MarkdownAssembler 或改造 BodyAssembler。
2. 输入：用户接受的 ABlockProposal 列表、当前文件 fresh-extracted B 类分块、protectH1 状态。
3. 输出：新的 Markdown body。
4. 保留 B 类分块逐字节内容。
5. protectH1=true 时保留当前文件第一个 H1。
6. 暂不接 ApplyDecisionUseCase，只做 core 层测试。
```

建议范围：

```text
src/core/markdown/MarkdownAssembler.ts
src/core/apply/BodyAssembler.ts
tests/core/markdown/MarkdownAssembler.test.ts
```

验收：

```text
接受的 A 类分块按 order 输出。
未接受 A 类分块不输出。
B 类分块逐字节保留。
protectH1=true 时 H1 保留。
protectH1=false 时可不特殊保留 H1。
```

开发日志重点：记录 v2 组装与旧 BodyAssembler 的兼容方式。

---

## Phase 10 验收任务

```text
[x] HeadingParser 可用。
[x] protectH1 规则可验证。
[x] B 类分块可配置名称和层级。
[x] B 类分块内部子标题逐字保留。
[x] eligibility 使用 A/B block config。
[x] MarkdownAssembler v2 能组装 accepted A blocks + B block。
```

---

# Phase 11：PromptBuilder、Zod Schema 与 Tag Normalization

目标：把 LLM 请求从固定 prompt + fixed sections 转为结构化 request + zod + normalization。

---

## D43：实现 PromptBuilder 与 PromptDebugSnapshot

预计工程量：4 小时

任务：

```text
1. 新增 PromptBuilder。
2. 将 A 类分块 prompt、block id、heading、headingLevel 写入最终 user prompt。
3. 将 tagPrompt、tagWhitelist、固化 tag schema instruction 写入最终 prompt。
4. 输出 LlmRequest，而不是直接调用 provider。
5. 新增 PromptDebugSnapshot 类型，记录 provider/model/messages/schemaName/schemaVersion/metadata。
6. 不实现 UI 展示。
```

建议范围：

```text
src/core/prompt/PromptBuilder.ts
src/core/prompt/PromptDebugSnapshot.ts
src/adapters/llm/LlmProvider.ts
tests/core/prompt/PromptBuilder.test.ts
```

验收：

```text
最终 prompt 包含所有 enabled A blocks。
最终 prompt 包含 tagWhitelist。
最终 prompt 包含 tagPrompt。
最终 prompt 要求 selectedTags 与 newTagSuggestions 分离。
PromptDebugSnapshot 不包含 API key / Authorization。
```

开发日志重点：记录 provider 不再拼 prompt，PromptBuilder 负责结构化请求。

---

## D44：引入 Zod Proposal Schema v0.2

预计工程量：4 小时

任务：

```text
1. 安装或确认 zod 依赖。
2. 新增 RawRefinedProposalV2 zod schema。
3. 校验 workflowProfileId、schemaVersion、blocks、frontmatterSuggestion、tagSuggestion、warnings。
4. 保留旧 ProposalValidator 的 v0.1 兼容入口，或提供明确迁移路径。
5. 不做 tag whitelist policy，不做 normalization。
```

建议范围：

```text
package.json
src/core/proposal/ProposalSchema.ts
src/core/proposal/ProposalValidator.ts
tests/core/proposal/ProposalSchema.test.ts
```

验收：

```text
合法 v0.2 proposal 通过 zod。
缺 blocks 失败。
block 缺 id/content 失败。
tagSuggestion 字段类型错误失败。
zod 错误结构可被上层保存到 attempt。
```

开发日志重点：记录 zod 只做结构校验，不做 policy。

---

## D45：实现 TagNormalizer

预计工程量：4 小时

任务：

```text
1. 实现 normalizeTagList。
2. 支持英文逗号、中文逗号、空格、换行、顿号分割。
3. 自动 trim、去空项、补 #、去重。
4. 不做大小写归一化。
5. 将 selectedTags 中非白名单 tag 移入 newTagSuggestions。
6. 输出 tagNormalizationApplied:boolean。
7. 不改 Review UI。
```

建议范围：

```text
src/core/proposal/TagNormalizer.ts
src/core/proposal/ProposalNormalizer.ts
tests/core/proposal/TagNormalizer.test.ts
```

验收：

```text
"ai/assisted, #todo/refine，flag/core、#flag/sensitive" 可拆分并补 #。
换行分隔可用。
大小写保持原样。
白名单外 selectedTags 移入 newTagSuggestions。
tagNormalizationApplied 只返回 boolean。
```

开发日志重点：记录 tag normalization 不传给 LLM、不写入笔记，仅保存到 session/validation。

---

## D46：实现 ProposalNormalizer 与 partial validation result

预计工程量：4 小时

任务：

```text
1. 规范 A block 顺序。
2. 未知 block id 标记 rejectedField，不直接写入。
3. 缺失 enabled A block 作为 warning 或 rejectedField，按架构要求判断是否可进入 partial。
4. 接入 TagNormalizer。
5. 生成 ProposalValidationResult：valid / partial / invalid。
6. unknown tag 不再导致正文整体失败。
```

建议范围：

```text
src/core/proposal/ProposalNormalizer.ts
src/core/proposal/ProposalValidator.ts
tests/core/proposal/ProposalNormalizer.test.ts
tests/core/proposal/ProposalValidator.test.ts
```

验收：

```text
body block 合法、tag 不规范时 status=partial 或 valid-with-warning。
unknown tag 被移动到 newTagSuggestions。
rejectedFields 包含具体 field/reason/values。
严重结构错误仍 invalid。
```

开发日志重点：记录 unknown-tag 从 fatal error 改为 normalization/rejected field 的策略。

---

## D47：CreateProposalUseCase 接入 v0.2 prompt / zod / normalization

预计工程量：4 小时

任务：

```text
1. CreateProposalUseCase 使用 PromptBuilder 生成 LlmRequest。
2. provider 返回后走 JSON extraction → zod → normalization → policy validation。
3. 第一次只接 mock provider 和测试 provider。
4. 暂不实现 retry/error-session-cache。
5. 成功时创建 ProposalSessionV2。
```

建议范围：

```text
src/application/CreateProposalUseCase.ts
src/adapters/llm/MockLlmProvider.ts
tests/application/CreateProposalUseCase.test.ts
```

验收：

```text
mock provider 可返回 v0.2 proposal。
成功 proposal 创建 ProposalSessionV2。
session 中包含 blockConfigSnapshot、validation、tagNormalizationApplied。
旧 v0.1 fixed refinedSections 路径不再作为新主路径。
```

开发日志重点：记录 v0.2 proposal pipeline 接入点。

---

## Phase 11 验收任务

```text
[ ] PromptBuilder 生成结构化 LlmRequest。
[ ] zod schema 可校验 RawRefinedProposalV2。
[ ] TagNormalizer 可处理分隔符和补 #。
[ ] selectedTags / newTagSuggestions 分离。
[ ] unknown tag 不导致正文整体失败。
[ ] CreateProposalUseCase 可创建 ProposalSessionV2。
```

---

# Phase 12：Retry、Session Cache 与 Error Session Cache

目标：实现最多 3 次请求、成功 session 与失败 attempt 分离保存。

---

## D48：实现 RetryAttemptRunner

预计工程量：4 小时

任务：

```text
1. 抽出最多 3 次请求控制逻辑。
2. 每次 attempt 包含 attemptIndex、requestSnapshot、responseSnapshot、validationSnapshot、errorSummary。
3. 第 1 次成功直接返回成功 session 输入。
4. 第 2/3 次成功返回成功结果 + 失败 attempts。
5. 3 次失败返回 failed attempts。
6. 不写入磁盘，由 application 决定缓存。
```

建议范围：

```text
src/application/RetryAttemptRunner.ts
src/runtime/FailedAttemptRecord.ts
tests/application/RetryAttemptRunner.test.ts
```

验收：

```text
第 1 次成功 attemptsUsed=1，无 failed attempts。
第 2 次成功 failed attempts 仅含 attempt 1。
第 3 次成功 failed attempts 含 attempt 1/2。
3 次失败 failed attempts 含 1/2/3。
成功 attempt 不进入 failed attempts。
```

开发日志重点：记录成功 session 与 failed attempt 格式不同。

---

## D49：实现 ErrorSessionCache adapter 与 30 条上限

预计工程量：4 小时

任务：

```text
1. 定义 ErrorSessionCacheStore 接口。
2. 实现 ObsidianErrorSessionCacheStore。
3. 保存 FailedAttemptRecord，路径为插件目录 error-session-cache。
4. 保存前执行 redaction / secret scan。
5. error-session-cache limit=30。
6. 超过上限自动删除最旧 error session。
```

建议范围：

```text
src/runtime/ErrorSessionCacheStore.ts
src/adapters/obsidian/ObsidianErrorSessionCacheStore.ts
src/runtime/redaction.ts
tests/adapters/obsidian/ObsidianErrorSessionCacheStore.test.ts
```

验收：

```text
失败 attempt 能保存。
API key / Authorization / provider secret 被阻断或脱敏。
超过 30 自动删除最旧。
errorSessionCacheEnabled=false 时不保存。
```

开发日志重点：记录 error-session-cache 的隐私边界和清理策略。

---

## D50：CreateProposalUseCase 接入 retry + session/error cache

预计工程量：4 小时

任务：

```text
1. 第 1 次成功：保存 ProposalSessionV2 到 session-cache，不写 error-session-cache，不弹请求次数提醒。
2. 第 2/3 次成功：失败 attempt 写 error-session-cache，成功 ProposalSessionV2 写 session-cache。
3. 3 次失败：全部 failed attempts 写 error-session-cache，不创建 ProposalSession，不打开 Review UI。
4. 返回 application result，包含 attemptsUsed、errorCachePath、notice plan。
5. 不在 core 层弹 Notice。
```

建议范围：

```text
src/application/CreateProposalUseCase.ts
src/runtime/ProposalSessionStore.ts
src/adapters/obsidian/ObsidianSessionStore.ts
tests/application/CreateProposalUseCase.retry.test.ts
```

验收：

```text
第 1 次成功不写 error cache。
第 2/3 次成功只保存失败 attempts 到 error cache。
成功 ProposalSession 与 FailedAttemptRecord 格式不同。
3 次失败不创建 session。
```

开发日志重点：记录 attempt 1/2 → error-session-cache，attempt 3 success → session-cache 的强约束。

---

## D51：请求次数提醒与错误缓存位置提示

预计工程量：4 小时

任务：

```text
1. main.ts 或通知 use case 按 CreateProposalUseCase result 弹 Notice。
2. 第 1 次成功不弹提醒。
3. 第 2/3 次成功弹两次：请求次数、失败尝试保存位置。
4. 3 次失败弹两次：请求次数失败、错误会话保存位置。
5. error cache 关闭时第二条提示改为未保存。
6. 两次弹窗不得合并。
```

建议范围：

```text
src/main.ts
src/ui/i18n/*.ts
tests/application 或 tests/ui notice-plan 相关测试
```

验收：

```text
第 1 次成功无请求次数 Notice。
第 2 次成功两条 Notice。
第 3 次成功两条 Notice。
3 次失败两条 Notice。
error cache 关闭时第二条提示说明未保存。
```

开发日志重点：记录通知属于 application/main 编排，不进入 core。

---

## D52：session-cache v2 持久化与兼容迁移

预计工程量：4 小时

任务：

```text
1. session-cache 支持 ProposalSessionV2。
2. 旧 sessions.v1.json 读取时可忽略、迁移或标记 legacy，策略需明确。
3. sessionCacheLimit 默认 5。
4. 保存前 secret scan。
5. setSessionCacheLimit 后清理旧 session。
6. 缓存路径说明可被 Settings UI 读取。
```

建议范围：

```text
src/runtime/ProposalSessionStore.ts
src/adapters/obsidian/ObsidianSessionStore.ts
tests/runtime/ProposalSessionStore.test.ts
tests/adapters/obsidian/ObsidianSessionStore.test.ts
```

验收：

```text
ProposalSessionV2 可落盘并恢复。
旧 v1 session 不导致插件崩溃。
超过 limit 清理旧 session。
secret scan 阻止敏感字段。
```

开发日志重点：记录 v1/v2 session 兼容策略。

---

## Phase 12 验收任务

```text
[ ] Retry 最多 3 次。
[ ] 成功 session 与失败 attempt 分离。
[ ] error-session-cache 默认开启，上限 30。
[ ] 第 2/3 次成功只保存失败 attempt 到 error cache。
[ ] 3 次失败不创建 session。
[ ] 请求次数提醒规则符合要求。
[ ] session-cache v2 可恢复。
```

---

# Phase 13：Review UI 与 Cached Session 恢复

目标：让 v0.2 ProposalSessionV2 能进入 Review UI；cached session 只能 Save as Draft，不能 apply。

---

## D53：ReviewViewModel v2

预计工程量：4 小时

任务：

```text
1. ReviewViewModel 支持 A 类分块列表。
2. 每个 A block 有 id、heading、content、warnings、accepted 默认值。
3. 支持 selectedTags 勾选项。
4. 支持 newTagSuggestions 只读可复制数据。
5. 支持 tagNormalizationApplied 提示。
6. 支持 validation warnings / rejectedFields / attemptsUsed。
```

建议范围：

```text
src/ui/review/ReviewViewModel.ts
tests/ui/review/ReviewViewModel.test.ts
```

验收：

```text
ProposalSessionV2 能转换为 ReviewViewModel。
selectedTags 默认未勾选。
newTagSuggestions 不进入可 apply tags。
tagNormalizationApplied=true 时 ViewModel 可展示提示。
```

开发日志重点：记录 UI 数据只来自 ViewModel。

---

## D54：ReviewModal v2 交互

预计工程量：4 小时

任务：

```text
1. ReviewModal 展示 A 类分块 proposal。
2. A 类分块支持勾选是否应用。
3. 正文是否继续支持编辑需按现有 editable body 兼容处理；若保留编辑，必须仍经 build plan 二次校验。
4. selectedTags 可勾选应用。
5. newTagSuggestions 只读、可选中复制、不可编辑、不可直接应用。
6. 默认所有写入项未选中。
```

建议范围：

```text
src/ui/review/ReviewModal.ts
styles.css
src/ui/i18n/*.ts
```

验收：

```text
用户可按 block 勾选。
selectedTags 可勾选。
newTagSuggestions 可复制不可编辑。
UI 不做 tag normalization。
UI 不生成 ApplyPlan。
```

开发日志重点：记录 selectedTags 与 newTagSuggestions 的 UI 行为差异。

---

## D55：UserDecisionV2 与 BuildApplyPlanUseCase v2

预计工程量：4 小时

任务：

```text
1. UserDecisionV2 支持 acceptBlocks。
2. BuildApplyPlanUseCase 将 accepted blocks 转为 replace-refined-blocks。
3. selectedTags 中被用户勾选的 tags 转为 append-tags。
4. 不再生成 remove-tags。
5. frontmatter 仍只接受 status/source/context。
6. build plan 阶段再次校验 accepted block 不包含 B 类分块原文。
```

建议范围：

```text
src/core/review/UserDecision.ts
src/core/apply/ApplyPlan.ts
src/core/apply/ApplyPlanner.ts
src/application/BuildApplyPlanUseCase.ts
tests/application/BuildApplyPlanUseCase.test.ts
```

验收：

```text
未勾选 A block 不进入 ApplyPlan。
未勾选 selectedTag 不进入 ApplyPlan。
newTagSuggestions 不进入 ApplyPlan。
ApplyOperation 不包含 remove-tags。
```

开发日志重点：记录 ApplyPlan operation 从 replace-refined-body/update-tags 到 replace-refined-blocks/append-tags 的迁移。

---

## D56：ApplyDecisionUseCase v2：replace-refined-blocks 与 append-tags

预计工程量：4 小时

任务：

```text
1. ApplyDecisionUseCase 支持 replace-refined-blocks。
2. Apply 前重新提取 B 类分块并比较 baseBBlockHash。
3. 使用 MarkdownAssembler v2 组装 accepted blocks + 当前 B 类分块。
4. append-tags 只追加白名单 selectedTags，去重，不覆盖，不删除。
5. post-apply B 类分块逐字验证。
6. 保留 conflict flow。
```

建议范围：

```text
src/application/ApplyDecisionUseCase.ts
src/core/apply/FrontmatterTagApplier.ts
src/core/markdown/MarkdownAssembler.ts
tests/application/ApplyDecisionUseCase.test.ts
```

验收：

```text
B 类分块逐字保留。
已有 YAML tags 不被覆盖。
selectedTags append + 去重。
newTagSuggestions 不写入。
文件变化或 B 类分块变化时 conflict。
```

开发日志重点：记录 append-tags 与旧 update-tags 的行为差异。

---

## D57：Open cached session 命令与只读式 Review UI

预计工程量：4 小时

任务：

```text
1. 新增命令：查看 session 缓存 / Open cached proposal session。
2. 从 session-cache limit 数量内选择 session。
3. 选中后打开与正常 Review 基本一致的 UI。
4. cached session 模式下 Apply selected changes 灰色不可用。
5. Save as Draft 可用。
6. 不做 freshness apply 恢复。
```

建议范围：

```text
src/application/OpenCachedSessionUseCase.ts
src/ui/review/CachedSessionPickerModal.ts
src/ui/review/ReviewModal.ts
src/main.ts
src/ui/i18n/*.ts
styles.css
```

验收：

```text
可列出最近 session-cache 内 session。
可选中 session 打开 Review UI。
Apply 按钮 disabled。
Save as Draft 可用。
不会写原 note。
```

开发日志重点：记录 cached session 只能查看和保存草稿，不允许 apply。

---

## D58：SaveDraftUseCase v2

预计工程量：4 小时

任务：

```text
1. 草稿支持 A 类分块 proposal。
2. 草稿包含 selectedTags / newTagSuggestions。
3. 草稿包含 validation result / tagNormalizationApplied / attemptsUsed。
4. cached session 模式下可以 Save as Draft。
5. 草稿不包含 API key / Authorization / provider secret。
```

建议范围：

```text
src/application/SaveDraftUseCase.ts
tests/application/SaveDraftUseCase.test.ts
```

验收：

```text
正常 proposal 可 Save as Draft。
cached session 可 Save as Draft。
草稿中 newTagSuggestions 只作为建议显示。
草稿不修改原 note。
secret scan 通过。
```

开发日志重点：记录草稿与 ProposalSession / FailedAttemptRecord 的边界。

---

## Phase 13 验收任务

```text
[ ] ProposalSessionV2 可进入 Review UI。
[ ] A 类分块可按块勾选。
[ ] selectedTags 可勾选应用。
[ ] newTagSuggestions 可复制不可编辑不可应用。
[ ] BuildApplyPlanUseCase 使用 UserDecisionV2。
[ ] ApplyDecisionUseCase 支持 replace-refined-blocks / append-tags。
[ ] cached session UI 中 Apply 灰色，Save as Draft 可用。
```

---

# Phase 14：Settings UI 与可观测性

目标：补齐 v0.2.0 的用户配置入口、模型连接测试、诊断复制和 prompt 可观测能力。

---

## D59：Settings UI 文案迁移与缓存记录设置

预计工程量：4 小时

任务：

```text
1. 将用户可见 “history / 历史记录” 文案改为 “cache / 缓存记录”。
2. 显示缓存记录数量上限。
3. 显示 session-cache 位置。
4. 显示 error-session-cache 开关和上限 30。
5. 显示 error-session-cache 位置。
6. 不改核心缓存逻辑。
```

建议范围：

```text
src/ui/settings/SettingsTab.ts
src/ui/i18n/*.ts
styles.css
```

验收：

```text
UI 不再出现“历史记录”作为 session 功能文案。
缓存内容位置可见。
错误会话缓存位置可见。
error-session-cache 可开关。
```

开发日志重点：记录“历史记录”改“缓存记录”的用户语义修正。

---

## D60：Settings UI：密钥 ID 文案与 SecretStorage 诊断复制

预计工程量：4 小时

任务：

```text
1. 用户可见文案统一为“密钥 ID”。
2. 不再显示 Secret Reference / secret ref / key name 等混用称呼。
3. SecretStorage diagnostics 改为可复制、不可编辑。
4. 诊断内容脱敏，不包含真实 key。
5. 诊断可显示 key 是否配置、是否读到值、是否等于 key id、长度、脱敏前后缀。
```

建议范围：

```text
src/ui/settings/SettingsTab.ts
src/adapters/obsidian/ObsidianSecretStore.ts
src/ui/i18n/*.ts
styles.css
```

验收：

```text
Settings UI 统一显示“密钥 ID”。
诊断内容可选中复制。
诊断内容不可编辑。
诊断内容不泄露真实 API key。
D35 污染值场景可被诊断显示为 value equals key id。
```

开发日志重点：记录 SecretStorage 用户心智修正。

---

## D61：Settings UI：A/B 分块配置

预计工程量：4 小时

任务：

```text
1. 增加 protectH1 开关。
2. 显示并编辑 A 类分块列表。
3. A 类分块支持 name / headingLevel / prompt / enabled / order。
4. 支持新增 / 删除 A 类分块。
5. 支持唯一 B 类分块 name / headingLevel。
6. 配置保存前调用 BlockConfigValidator。
7. UI 不自行判断嵌套，只显示 core 返回错误。
```

建议范围：

```text
src/ui/settings/SettingsTab.ts
src/application 或 core/profile settings validation helper
src/ui/i18n/*.ts
styles.css
```

验收：

```text
用户可配置 A 类分块。
用户可配置 B 类分块名称和层级。
protectH1=true 时 UI 保存 level=1 配置会失败并提示。
配置错误不会写入 settings。
```

开发日志重点：记录 Settings UI 只是配置入口，规则由 core validator 判定。

---

## D62：Settings UI：Tag 白名单与 tag prompt

预计工程量：4 小时

任务：

```text
1. 增加 tagWhitelist 管理 UI。
2. 支持增加 / 删除 tag。
3. 保存时经过 TagNormalizer 或 tag config validator，补 #、去重。
4. 不做大小写归一化。
5. 增加 tagPrompt textarea。
6. 明确说明 selectedTags 与 newTagSuggestions 的区别。
```

建议范围：

```text
src/ui/settings/SettingsTab.ts
src/core/proposal/TagNormalizer.ts
src/ui/i18n/*.ts
tests/core/proposal/TagNormalizer.test.ts
```

验收：

```text
tagWhitelist 可增删。
tagWhitelist 保存后不重复。
输入 tag 不带 # 时可补 #。
大小写保持原样。
tagPrompt 可保存。
```

开发日志重点：记录 tag whitelist 与 LLM tag prompt 的分工。

---

## D63：模型连接性测试

预计工程量：4 小时

任务：

```text
1. 新增 TestModelConnectionUseCase。
2. 检查 provider 配置完整性。
3. 检查密钥 ID 是否配置。
4. 检查 SecretStorage 是否可用并可读取 key。
5. 发起最小测试请求，不带真实 note 内容。
6. 不创建 ProposalSession，不进入 proposal pipeline。
7. 错误信息 redaction。
8. Settings UI 增加“测试模型连接”按钮。
```

建议范围：

```text
src/application/TestModelConnectionUseCase.ts
src/adapters/llm/OpenAICompatibleProvider.ts 或新增 test 方法
src/ui/settings/SettingsTab.ts
src/main.ts
src/ui/i18n/*.ts
tests/application/TestModelConnectionUseCase.test.ts
```

验收：

```text
mock provider 可测试成功。
SecretStorage 不可用时给出明确结果。
密钥 ID 缺失时给出明确结果。
读取到污染 key 时沿用 D35 防御。
测试请求不包含 note 内容。
测试失败不创建 session-cache / error-session-cache。
```

开发日志重点：记录模型连接测试不等于 refined proposal。

---

## D64：Prompt 可观测面板 / Debug Snapshot 查看

预计工程量：4 小时

任务：

```text
1. 在 proposal 生成结果或设置页中提供最近一次 prompt debug snapshot 查看入口。
2. 可查看/复制 final system prompt、final user prompt、tag whitelist、schema instruction。
3. 可查看 raw LLM response、parsed JSON、zod validation result、normalization report。
4. 默认不自动落盘完整 prompt/response，除非 promptObservationEnabled 或 error-session-cache 触发。
5. 所有内容 redaction。
```

建议范围：

```text
src/core/prompt/PromptDebugSnapshot.ts
src/runtime/PromptObservationStore.ts 或复用 session validation snapshot
src/ui/settings/SettingsTab.ts 或 src/ui/review/PromptDebugModal.ts
src/ui/i18n/*.ts
```

验收：

```text
开发者/用户能复制最终 prompt。
能看到 raw response / parsed JSON / validation report。
输出不包含 API key / Authorization。
promptObservationEnabled=false 时不自动落盘正常成功请求全文。
```

开发日志重点：记录 prompt 可观测能力的隐私边界。

---

## Phase 14 验收任务

```text
[ ] Settings UI 支持缓存记录文案与位置说明。
[ ] 密钥 ID 文案统一。
[ ] SecretStorage 诊断可复制不可编辑。
[ ] A/B 分块配置 UI 可用。
[ ] tagWhitelist / tagPrompt UI 可用。
[ ] 模型连接性测试可用。
[ ] Prompt debug snapshot 可查看/复制。
```

---

# Phase 15：端到端迁移、测试矩阵与交付检查

目标：把 v0.2.0 新模型跑通，更新测试矩阵和使用文档，完成 release 前检查。

---

## D65：v0.1 → v0.2 自动测试迁移与旧测试清理

预计工程量：4 小时

任务：

```text
1. 梳理旧 fixed refinedSections 测试。
2. 将仍有价值的测试迁移到 ABlockProposal / RawRefinedProposalV2。
3. 保留 v0.1 兼容测试仅限 settings/session migration。
4. 删除或改写已失效的 unknown-tag fatal 测试。
5. 确保自动测试命名反映 v0.2 行为。
```

建议范围：

```text
tests/core/proposal/**
tests/application/**
tests/ui/review/**
tests/core/apply/**
```

验收：

```text
测试 suite 不再假设 fixed refinedSections 是唯一 schema。
unknown tag 不再整体失败。
append-tags 测试覆盖只增加不覆盖。
全部测试通过。
```

开发日志重点：记录旧行为废弃和新行为覆盖。

---

## D66：v0.2 端到端 mock happy path

预计工程量：4 小时

任务：

```text
1. 使用 mock provider 跑通：raw note → A/B eligibility → prompt → zod → normalization → session → review → apply。
2. 验证 B 类分块逐字保留。
3. 验证 selectedTags append 到 YAML tags。
4. 验证 newTagSuggestions 不写入。
5. 验证 Save as Draft。
6. 验证 cached session 只可 Save as Draft。
```

验收：

```text
mock happy path 通过。
Apply 后 B 类分块 hash 不变。
YAML tags 只追加 selectedTags。
cached session Apply disabled。
```

开发日志重点：记录 v0.2 首次端到端闭环。

---

## D67：真实 provider 手动验证与 error-session-cache 验证

预计工程量：4 小时

任务：

```text
1. 在真实 Obsidian 中配置 DeepSeek 或 OpenAI-compatible provider。
2. 运行模型连接性测试。
3. 用合法 raw note 跑真实 refined。
4. 验证第 1 次成功路径。
5. 构造 malformed JSON / zod failure 测试 provider 返回，验证 error-session-cache。
6. 验证第 2/3 次成功时失败 attempt 与成功 session 分离。
7. 验证 3 次失败不创建 session。
```

验收：

```text
真实 provider happy path 至少一次成功。
error-session-cache 中无 API key / Authorization。
FailedAttemptRecord 与 ProposalSessionV2 格式不同。
请求次数提示符合规则。
```

开发日志重点：记录真实 provider 验证结果和未覆盖项。

---

## D68：更新 README 与测试矩阵

预计工程量：4 小时

任务：

```text
1. 更新 README 的 v0.2 使用说明。
2. 补充分块配置说明。
3. 补充 tag whitelist / selectedTags / newTagSuggestions 说明。
4. 补充缓存记录 / 错误会话缓存说明。
5. 补充模型连接性测试说明。
6. 更新 TEST-MATRIX.md 或新建 docs/test-matrix-v0.2.md。
```

验收：

```text
用户能按 README 配置 A/B 分块。
用户能理解密钥 ID。
用户能理解缓存记录不是历史记录。
用户能找到 session-cache 和 error-session-cache 位置。
测试矩阵覆盖 v0.2 关键路径。
```

开发日志重点：记录文档从 v0.1 到 v0.2 的用户行为变化。

---

## D69：v0.2.0 交付检查

预计工程量：4 小时

任务：

```text
1. 按 v0.2 架构书逐项检查验收标准。
2. scope freeze：确认没有 MCP/HTTP/File Inbox/external review/batch refine/MOC/link 写入。
3. 检查 ApplyOperation 不包含 rename/move/remove-tags/archive/delete。
4. 检查 UI 无文件写入逻辑。
5. 检查 error-session-cache / session-cache secret scan。
6. 跑 typecheck/test/build。
7. 输出 v0.2.0 delivery checklist。
```

验收：

```text
v0.2.0 mock happy path 可运行。
真实 provider 至少完成连接性测试，最好完成一次真实 proposal。
A/B block、tag normalization、zod retry、cache separation、cached session read-only UI 均有测试或手动验证。
README / 测试矩阵 / dev-log 完整。
```

开发日志重点：记录 v0.2.0 已完成 / 暂缓 / 已知问题 / 下一版本候选。

---

## Phase 15 验收任务

```text
[ ] 旧测试已迁移到 v0.2 模型。
[ ] mock happy path 完整通过。
[ ] 真实 provider 路径完成手动验证或明确缺口。
[ ] error-session-cache 验证通过。
[ ] README 更新。
[ ] TEST-MATRIX 更新。
[ ] v0.2.0 delivery checklist 输出。
```

---

# 总体工期估算

```text
Phase 9：3 天，约 12 小时
Phase 10：4 天，约 16 小时
Phase 11：5 天，约 20 小时
Phase 12：5 天，约 20 小时
Phase 13：6 天，约 24 小时
Phase 14：6 天，约 24 小时
Phase 15：5 天，约 20 小时
```

合计：

```text
34 个 4 小时工作日
约 136 小时
```

---

# 推荐执行方式

每次只给 agent 一个 `Dn`，例如：

```text
阅读 v0.2.0 架构书、docs/dev-log.md、必要时窗口化检索 docs/achieve/dev-log-achieve.md。只执行 Dn，不提前实现后续任务。完成后运行 typecheck/test/build，并更新 docs/dev-log.md。
```

如果 agent 在实现中发现架构缺口，应要求它：

```text
1. 先记录问题。
2. 给出最小修订建议。
3. 不自行扩大功能范围。
4. 不直接跨 Dn 实现后续任务。
```

---

# v0.2.0 关键风险提示

```text
1. 不要把 A 类分块做成嵌套树。
2. 不要把 newTagSuggestions 做成可直接应用。
3. 不要让 cached session 直接 apply。
4. 不要把成功 attempt 写入 error-session-cache。
5. 不要把失败 attempt 伪装成 ProposalSession。
6. 不要把 tagNormalizationApplied 细化成多个字段；v0.2.0 只做 boolean。
7. 不要在 UI 中实现 tag normalization / zod validation / ApplyPlan 生成。
8. 不要让 Prompt 可观测默认无限制落盘真实 note 内容。
9. 不要让 error-session-cache 保存 API key / Authorization / provider secret。
10. 不要继续使用“历史记录”作为 session-cache 的用户文案。
```
