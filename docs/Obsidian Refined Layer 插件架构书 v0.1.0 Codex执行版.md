# Obsidian Refined Layer 插件架构书 v0.1.0（Codex 执行版）

> 文档状态：工程执行稿
> 目标读者：Codex / AI coding agent / 人类开发者
> 核心原则：先完成 raw → refined 最小闭环，不实现通用 workflow 平台。
> 本版目标：减少远景解释，保留可实现边界、模块契约、安全规则、数据模型和验收标准。

---

## 0. 一句话定义

Obsidian Refined Layer 是一个 Obsidian 插件，用于将当前打开的 raw 笔记生成 refined proposal，并让用户在 Obsidian 内审核后，只应用被确认的修改。

插件不是 Agent，不做全局记忆、检索、工具路由、任务规划、MOC 写入、关系链接写入或批量知识库维护。

---

## 1. v0.1.0 MVP 流程

```text
当前打开的 Markdown 笔记
→ 检查是否符合 raw-refined profile
→ 调用 mock-llm 或 plugin-llm 生成 JSON proposal
→ ProposalValidator 校验 JSON / schema / profile policy / 内容边界
→ 创建 ProposalSession
→ 打开 ObsidianReviewGate
→ 用户选择要应用的内容
→ 生成 ApplyPlan
→ 重新读取当前文件并 freshness check
→ 安全写入，或发生冲突时 Save as Draft
```

v0.1.0 只实现一个内置 workflow profile：`raw-refined`。

---

## 2. v0.1.0 明确不做

```text
不做多 profile 编辑器
不做 profile 可视化配置 UI
不做外部 Tool API adapter
不做 MCP server
不做 HTTP server
不做 File Inbox adapter
不做外部 proposal 导入
不做外部审核通道
不做批量 refine
不做 MOC 写入
不做关系链接写入
不做 rename / move apply
不做 move 建议
不做自动归档或删除
不做 tokenizer 选择 UI
不做价格估算
不做完整 Prompt 编辑器
```

---

## 3. 核心实现原则

### 3.1 必须遵守

1. LLM 输出不可信，不能直接写文件。
2. 所有写入必须经过 `ApplyPlan`。
3. 所有请求必须先经过 `PolicyGuard`，规则只来自当前 `WorkflowProfile`。
4. 外部工具、LLM 输出和单次请求不能覆盖 profile policy。
5. API key、token、Authorization header、provider secret 不能进入日志、history、draft、data.json 或错误信息。
6. 受保护区域必须从当前文件重新提取，不能信任 proposal 中的任何受保护区域内容。
7. Apply 前必须重新读取当前文件并执行 freshness check。
8. 文件变化时不得直接 apply，必须进入 conflict flow。
9. `ProposalSession` 是内部运行态缓存，不等于用户保存到 vault 的草稿文件。

### 3.2 UI 基础标准

`i18n` 和 Obsidian theme adaptation 是 Phase 4 的 UI 实现标准，不作为独立复杂模块。

- UI 文案使用 i18n key，不在组件中硬编码用户可见文本。
- UI 使用 Obsidian CSS variables，不硬编码主要颜色。
- v0.1.0 至少准备 `zh-CN` 和 `en` 字符串表。

---

## 4. 建议目录结构

```text
src/
  main.ts

  core/
    profile/
      WorkflowProfile.ts
      rawRefinedProfile.ts
    policy/
      PolicyGuard.ts
    proposal/
      Proposal.ts
      ProposalValidator.ts
    apply/
      ApplyPlan.ts
      ApplyPlanner.ts
      ConflictDetector.ts
    protected-region/
      ProtectedRegion.ts
      ProtectedRegionExtractor.ts

  application/
    CheckEligibilityUseCase.ts
    CreateProposalUseCase.ts
    RequestReviewUseCase.ts
    BuildApplyPlanUseCase.ts
    ApplyDecisionUseCase.ts
    SaveDraftUseCase.ts

  adapters/
    obsidian/
      ObsidianNoteRepository.ts
      ObsidianFrontmatterWriter.ts
      ObsidianFileWriter.ts
      ObsidianSecretStore.ts
      ObsidianSettingsStore.ts
    llm/
      LlmProvider.ts
      MockLlmProvider.ts
      OpenAICompatibleProvider.ts

  runtime/
    ProposalSessionStore.ts
    TokenUsageReporter.ts

  ui/
    review/
      ObsidianReviewGate.ts
      ReviewModal.ts
      ReviewViewModel.ts
    settings/
      SettingsTab.ts
    i18n/
      index.ts
      zh-CN.ts
      en.ts

  settings/
    PluginSettings.ts
```

说明：

- `PluginSettings.ts` 定义类型；实际 Obsidian 持久化由 `adapters/obsidian/ObsidianSettingsStore.ts` 负责。
- `runtime/` 在 v0.1.0 只保存 ProposalSession 与 token usage 相关运行态对象，不扩展为复杂运行时系统。
- 不创建 `mcp/`、`http/`、`file-inbox/`、`external-review/`、`workflow-editor/`。

---

## 5. 配置分层

### 5.1 插件内核硬规则

不可配置：

```text
LLM 输出不可信
写入必须经过 ApplyPlan
Apply 前必须 freshness check
Protected region 不能由 LLM 修改
API key 不能明文保存或进入日志
外部请求不能修改 profile policy
```

### 5.2 插件全局设置

全局设置包括：

```text
LLM provider
model
secret reference
history limit，默认 5
language
draft folder
token usage 显示开关
profile-specific prompt override
```

Prompt 模板本身属于 `WorkflowProfile`。全局设置只能保存按 `profileId` 绑定的 prompt override。

```ts
interface PluginSettings {
  language: "zh-CN" | "en";
  historyLimit: number;
  draftFolder: string;
  provider?: {
    type: "mock" | "openai-compatible";
    model?: string;
    secretRef?: string;
  };
  promptOverrides?: Record<string, {
    enabled: boolean;
    systemPrompt?: string;
    userPrompt?: string;
  }>;
}
```

### 5.3 Workflow Profile

Profile 只保存 workflow 业务规则：

```text
eligibility
protected regions
output sections
frontmatter policy
tag policy
prompt template
proposal schema
review policy
apply policy
capabilities
```

Profile 不保存：provider、model、API key、language、history limit、token estimator、UI theme、session、tool API policy。

### 5.4 Runtime Session

运行时生成：

```text
proposal
token usage
base file hash
notePath
decision
apply plan
conflict status
draft status
```

---

## 6. 核心术语

### 6.1 WorkflowProfile

某个 workflow 的业务规则包。v0.1.0 只有 `raw-refined`。

### 6.2 Proposal

LLM 生成的候选修改。Proposal 不是最终笔记，不能直接写入文件。

### 6.3 ProposalSession

插件内部用于恢复 Review 状态、追踪 proposal、decision、token usage、apply 状态的运行时记录。

ProposalSession 不等同于用户主动保存到 vault 中的草稿文件。

### 6.4 ReviewGate

审核门槛抽象。v0.1.0 只有 `ObsidianReviewGate`，内部可以使用 Modal。

`requestReview` 必须调用 ReviewGate，不得直接耦合到 Modal。

### 6.5 ApplyPlan

所有文件写入操作的唯一入口。UI、LLM provider、proposal validator 都不能直接写文件。

### 6.6 PolicyGuard

所有进入 Internal Tool Port 的请求先经过 PolicyGuard。PolicyGuard 只读取当前 profile 的规则，请求体中任何试图覆盖 profile policy 的字段必须被忽略或拒绝。

---

## 7. Internal Tool Port

v0.1.0 只实现内部 Tool Port，不暴露 MCP / HTTP / File Inbox。

```ts
interface RefinedLayerToolPort {
  checkEligibility(request: EligibilityRequest): Promise<EligibilityResult>;
  createProposal(request: CreateProposalRequest): Promise<ProposalSessionSummary>;
  getProposalSession(sessionId: string): Promise<ProposalSession>;
  requestReview(request: ReviewRequest): Promise<ReviewResult>;
  buildApplyPlan(request: BuildApplyPlanRequest): Promise<ApplyPlan>;
  applyDecision(request: ApplyDecisionRequest): Promise<ApplyResult>;
  saveAsDraft(request: SaveAsDraftRequest): Promise<DraftSaveResult>;
}
```

长期外部工具接入只能作为该 Tool Port 的 adapter，不能绕过 Core / Application / PolicyGuard。

---

## 8. raw-refined WorkflowProfile

### 8.1 Profile 类型

```ts
interface WorkflowProfile {
  id: string;
  name: string;
  version: string;

  eligibility: EligibilityPolicy;
  protectedRegions: ProtectedRegionPolicy;
  outputSections: OutputSectionPolicy;
  frontmatter: FrontmatterPolicy;
  tags: TagPolicy;
  prompt: PromptPolicy;
  proposalSchema: ProposalSchemaPolicy;
  review: ReviewPolicy;
  apply: ApplyPolicy;
  capabilities: ApplyCapabilities;
}
```

### 8.2 Eligibility

默认规则：

```text
file extension = .md
frontmatter required = true
status must be raw
required heading = ## 原始内容
```

`10_Raw/` 路径可以作为建议检查，不作为 v0.1.0 硬阻断条件。

### 8.3 Protected Regions

默认 protected region：

```ts
{
  id: "original-content",
  heading: "## 原始内容",
  mode: "from-heading-to-end",
  required: true,
  preserveExactText: true
}
```

类型预留：

```ts
type ProtectedRegionMode = "from-heading-to-end" | "between-headings";
```

v0.1.0 只实现 `from-heading-to-end`；`between-headings` 仅预留，不进入第一版实现范围。

### 8.4 Output Sections

默认 refined 内容只允许这些 section：

```text
## 摘要
## 核心问题
## 当前结论
## 依据与推理
## 适用边界（可选）
## 后续处理（可选）
## 整理说明（可选）
```

插件自己根据 proposal sections 组装正文。LLM 不返回完整文件。

### 8.5 Frontmatter Policy

允许字段：

```text
status
created
source
context
```

字段规则：

```text
created = readonly，不允许 proposal 修改
status = confirm-required
source = confirm-required
context = confirm-required
unknown fields = preserve-only, not modifiable
```

除非用户未来在 profile 中显式添加字段，否则 proposal 不能新增或修改其他 YAML 字段。

禁止字段：

```text
ai
type
subtype
domain
topic
confidence
verified
updated
```

### 8.6 Tag Policy

采用白名单模式。

允许标签：

```text
#ai/generated
#ai/assisted
#ai/reviewed
#ai/suggested
#todo/refine
#todo/link
#todo/review
#flag/core
#flag/sensitive
```

禁止标签：

```text
#raw
#refined
#self
#external
#practice
#rel/*
```

规则：

```text
proposal 不能新增任何未在 allowedTags 中声明的标签。
未声明标签默认禁止，即使它不在 blockedTags 中。
```

### 8.7 Review Policy

```ts
interface ReviewPolicy {
  required: true;
  defaultChannel: "obsidian-ui";
  allowApplyWithoutReview: false;
}
```

v0.1.0 不实现外部审核通道。

### 8.8 Apply Policy

```ts
interface ApplyPolicy {
  requireFreshnessCheck: true;
  preserveProtectedRegions: true;
  requireApplyPlan: true;
  allowPartialApply: true;
  onConflict: "block-and-offer-draft";
}
```

用户可以只应用 proposal 的一部分，例如只应用正文，不应用 YAML 或标签。

### 8.9 Capabilities

```ts
interface ApplyCapabilities {
  body: true;
  frontmatter: true;
  tags: true;
  rename: false;
  move: false;
  links: false;
  moc: false;
  archive: false;
  delete: false;
}
```

v0.1.0 只负责当前单篇文档内容修改，不执行 rename / move，不做 move 建议。

---

## 9. Prompt Policy

Prompt 模板属于 profile。

v0.1.0 不实现完整 Prompt 编辑器，只在 SettingsTab 中提供低级覆盖项：

```text
textarea 编辑当前 profile 的 system prompt override
textarea 编辑当前 profile 的 user prompt override
旁边静态列出可用变量
```

不做：

```text
变量自动补全
语法高亮
复杂校验
恢复默认的复杂确认流程
profile 编辑器
```

UI 必须明确提示：当前覆盖的是哪个 profile 的 prompt，例如 `raw-refined`。

Prompt 必须要求 LLM：

```text
只输出 JSON
不输出完整 Markdown 文件
不复写 ## 原始内容
不生成关系链接
不写 MOC
不新增 YAML 字段
不建议白名单外标签
```

---

## 10. LLM Provider 与 Proposal

### 10.1 Proposal 来源

v0.1.0 只支持：

```text
mock-llm
plugin-llm
```

不支持：

```text
external-llm proposal import
manual proposal import
```

### 10.2 Provider 接口

```ts
interface LlmProvider {
  generateProposal(request: LlmRequest): Promise<LlmResponse>;
}

interface LlmResponse {
  rawText: string;
  parsedJson?: unknown;
  usage?: TokenUsageReport;
}
```

### 10.3 Proposal Schema

```ts
interface RawRefinedProposal {
  workflowProfileId: "raw-refined";
  refinedSections: {
    summary: string;
    coreQuestion: string;
    currentConclusion: string;
    reasoning: string;
    scope?: string;
    nextSteps?: string;
    refineNote?: string;
  };
  frontmatterSuggestion?: {
    status?: "refined";
    source?: Array<"self" | "external" | "practice">;
    context?: string[];
  };
  tagSuggestion?: {
    add?: string[];
    remove?: string[];
  };
  warnings?: string[];
}
```

v0.1.0 不在 proposal schema 中包含 `moveSuggestion`。

---

## 11. ProposalValidator

ProposalValidator 采用层叠校验。

### 11.1 JSON 解析

对非纯 JSON 响应可以尝试提取 JSON 块。

如果仍失败，不创建 ProposalSession，不展示 Review UI。

### 11.2 Schema 校验

检查：

```text
必填字段
字段类型
workflowProfileId
refinedSections required fields
```

### 11.3 Policy 校验

检查：

```text
frontmatter 白名单
readonly / confirm-required 字段
tag 白名单
output sections
capabilities
```

### 11.4 内容校验

检查：

```text
proposal 不包含受保护区域内容
proposal 不包含 link / MOC 写入操作
proposal 不包含 #rel/*
proposal 不包含 blocked tag
```

### 11.5 失败处理

解析或校验失败时：

```text
不进入 ProposalSession
不展示 Review UI
显示明确错误信息
保存脱敏后的失败摘要用于调试
```

默认不保存完整 LLM 原始响应。只有用户显式开启 debug 时才允许保存，并且必须 redaction。

---

## 12. Secret Management

### 12.1 硬规则

API key、token、Authorization header、provider secret 不得进入：

```text
data.json
日志
开发日志
ProposalSession
草稿文件
错误信息
LLM 请求记录
Obsidian 正文
```

### 12.2 SecretStorage

v0.1.0 使用 Obsidian SecretStorage / SecretComponent。插件设置只保存 secret reference，不保存 key 本体。

### 12.3 SecretStorage 不可用

验收标准：

```text
SettingsTab 中 LLM provider 配置区域置灰
显示警告：“当前环境不支持安全存储 API key，插件直接调用 LLM 的能力已禁用。”
Refine current note 命令仍可触发，但只能使用 mock-llm
任何尝试保存 API key 的操作都被拦截并提示
data.json 中不出现 key、apiKey、token、secret、authorization 相关字段
```

### 12.4 Redaction

所有错误、日志、history、debug 文本必须经过 redaction。

---

## 13. Token Usage

v0.1.0 保留 token usage 显示，但不做价格估算，不做 tokenizer 选择 UI。

策略：

```text
provider 返回 usage → 使用 provider usage，countingMode = actual
provider 未返回 usage → 使用成熟 tokenizer 估算，countingMode = estimated
估算不可用 → countingMode = unavailable
```

架构书不绑定具体 tokenizer 库。具体库在实现层决定。

```ts
interface TokenUsageReport {
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  countingMode: "actual" | "estimated" | "mixed" | "unavailable";
  generatedAt: string;
}
```

Review UI 必须展示 token usage 或明确显示 unavailable。

---

## 14. ProposalSession Store

### 14.1 目标

解决误关闭窗口、连续生成、恢复 review 状态的问题。

### 14.2 默认策略

```text
history enabled = true
history limit = 5
用户可配置 history limit
```

### 14.3 数据模型

```ts
interface ProposalSession {
  id: string;
  workflowProfileId: "raw-refined";
  policySnapshotId: string;
  notePath: string;
  noteTitle: string;
  createdAt: string;
  updatedAt: string;
  baseFileHash: string;
  baseFrontmatterHash?: string;
  baseProtectedRegionHash?: string;
  proposal: RawRefinedProposal;
  tokenUsage?: TokenUsageReport;
  status: "generated" | "reviewing" | "applied" | "saved_as_draft" | "discarded" | "conflicted";
  decision?: UserDecision;
}
```

### 14.4 多笔记支持

ProposalSessionStore 必须按 `notePath` 查询，避免多个笔记的 session 相互覆盖。

```ts
getLatestSessionForNote(notePath: string): Promise<ProposalSession | null>;
listSessionsForNote(notePath: string): Promise<ProposalSessionSummary[]>;
```

### 14.5 不保存内容

不保存：API key、Authorization header、provider secret、未脱敏错误、不必要的完整 provider 原始响应。

---

## 15. Review UI

### 15.1 职责

Review UI 只消费 `ReviewViewModel`，只返回 `UserDecision`。

UI 不做：

```text
schema validation
policy validation
YAML 白名单判断
tag 白名单判断
protected region 拼接
ApplyPlan 生成
文件写入
```

### 15.2 v0.1.0 UI

优先实现 Modal。未来可以替换成侧边栏 View，但 Core / Application 不应变化。

必须展示：

```text
refined 正文预览
YAML 修改建议
tag 修改建议
token usage
warnings
Save as Draft
Apply selected changes
```

v0.1.0 不展示 move 建议，不执行 rename / move。

### 15.3 i18n 与主题

- 所有用户可见文本走 i18n key。
- 使用 Obsidian CSS variables。
- 支持 light / dark theme。

---

## 16. UserDecision

```ts
interface UserDecision {
  acceptBody: boolean;
  acceptFrontmatter: {
    status?: boolean;
    source?: boolean;
    context?: boolean;
  };
  acceptTags: {
    add?: string[];
    remove?: string[];
  };
  saveAsDraftOnly?: boolean;
}
```

用户可以部分应用。默认不自动接受任何修改。

---

## 17. ApplyPlan 与安全写入

### 17.1 ApplyOperation

v0.1.0 只允许：

```ts
type ApplyOperationType =
  | "replace-refined-body"
  | "update-frontmatter"
  | "update-tags";
```

不包含：

```text
rename-file
move-file
write-links
write-moc
archive
delete
```

### 17.2 replace-refined-body

实现逻辑：

```text
1. 从当前文件重新提取受保护区域内容，不信任 LLM 返回的任何受保护区域内容。
2. 构建新正文 = refined 新内容 + 当前文件中的受保护区域原始内容。
3. 写入前逐字节比对，确认新正文中的受保护区域内容与当前文件一致。
4. 通过 ApplyPlan 写入文件。
```

### 17.3 Frontmatter 写入

只允许用户确认后的字段写入：

```text
status
source
context
```

`created` readonly，不写入。

未知字段 preserve-only，不删除、不修改。

### 17.4 Tag 写入

只允许写入 tag policy 白名单内的标签。

---

## 18. Conflict Detection 与 Save as Draft

### 18.1 Freshness Check

生成 proposal 时记录：

```text
baseFileHash
baseFrontmatterHash
baseProtectedRegionHash
```

Apply 前重新读取当前文件并比较 hash。

### 18.2 冲突处理

如果文件发生变化，不得直接 apply。

提供选项：

```text
Save as Draft
Regenerate proposal
Manual copy review
Discard
```

v0.1.0 不提供 force apply。

### 18.3 Save as Draft

Save as Draft 是用户可见的草稿文件，不等于 ProposalSession。

默认保存到全局设置中的 draft folder，例如：

```text
80_Runtime/refine-drafts/
```

草稿内容应包含：

```text
source note path
workflow id
created time
token usage
proposed sections
warnings
conflict reason（如有）
```

草稿不是 refined 正式笔记，不自动进入 MOC，不触发 status 修改。

---

## 19. 开发阶段与验收标准

### Phase 1：插件骨架与边界

任务：

```text
创建 Obsidian 插件项目结构
注册命令 Refine current note
建立 core/application/adapters/ui/runtime 目录
实现 Internal Tool Port 类型
实现 PolicyGuard 空壳
```

验收：

```text
插件能加载
命令面板能看到 Refine current note
命令能读取当前 active note
没有任何文件写入
```

### Phase 2：raw-refined profile、parser、validator

任务：

```text
实现 rawRefinedProfile
实现 note parser
实现 protected region extractor
实现 ProposalValidator 层叠校验
```

验收：

```text
能识别 status: raw
能识别 ## 原始内容
JSON / schema / policy / content 校验分层明确
非法 tag、非法 YAML、#rel/*、MOC 操作会被拒绝
校验失败不创建 ProposalSession
```

### Phase 3：Mock Proposal、Session、Token Usage

任务：

```text
实现 MockLlmProvider
生成固定 RawRefinedProposal
创建 ProposalSession
实现 notePath 查询
实现 TokenUsageReport mock 数据
```

验收：

```text
能为当前笔记生成 mock proposal
ProposalSession 包含 notePath
关闭后能恢复最近 session
多个笔记 session 不相互覆盖
token usage 可显示
```

### Phase 4：Review UI、i18n、主题适配

任务：

```text
实现 ObsidianReviewGate
实现 ReviewModal
实现 ReviewViewModel
实现 zh-CN / en i18n key
使用 Obsidian CSS variables
```

验收：

```text
Review UI 不直接写文件
UI 文案不硬编码
light/dark theme 下可用
可以选择部分 apply
可以 Save as Draft
```

### Phase 5：ApplyPlan 与安全写入

任务：

```text
实现 BuildApplyPlanUseCase
实现 replace-refined-body
实现 update-frontmatter
实现 update-tags
实现 freshness check
实现 conflict flow
```

验收：

```text
## 原始内容 逐字节保留
created 不会被修改
status/source/context 只有用户确认后才写入
未知 YAML 字段不删除不修改
非法 tag 不会写入
文件变化后不会直接 apply
冲突时可以 Save as Draft
```

### Phase 6：SecretStore 与真实 LLM

任务：

```text
实现 ObsidianSecretStore
实现 OpenAICompatibleProvider
实现 redaction
实现 provider usage 读取
实现 tokenizer fallback 的最小封装
```

验收：

```text
SecretStorage 不可用时 LLM provider 区域置灰
提示安全存储不可用
命令仍可用 mock-llm
任何保存 API key 的绕过路径被拦截
data.json 不出现 key/apiKey/token/secret/authorization
provider 返回 usage 时 UI 显示 actual
provider 不返回 usage 时显示 estimated 或 unavailable
```

### Phase 7：长期接口预留，不实现 adapter

任务：

```text
整理 Internal Tool Port 文档
确认 requestReview 只依赖 ReviewGate
确认外部 adapter 未实现
```

验收：

```text
没有 MCP/HTTP/File Inbox 代码
没有 ExternalReviewGate 代码
Internal Tool Port 可作为未来 adapter 的唯一入口
PolicyGuard 阻止请求覆盖 profile policy
```

---

## 20. Codex 实现约束

Codex 或其他 coding agent 执行时必须遵守：

```text
优先完成当前 Phase，不提前实现后续长期能力。
不新增外部 adapter。
不新增 profile editor。
不把 workflow 规则写进 UI。
不让 UI 直接写文件。
不让 LLM response 直接进入文件。
不保存 API key 或 provider secret。
每完成一个 Phase，先跑最小验证，再进入下一阶段。
```

如实现中发现架构缺口，应先记录问题并提出最小修订，不应自行扩大功能范围。

---

## 21. 最终判断

v0.1.0 的目标不是做通用 Obsidian LLM workflow 平台，而是完成一个安全、可恢复、可审核的 raw → refined 最小闭环。

长期工具层方向保留在接口边界中，但不进入 v0.1.0 实现范围。

```text
先完成单篇文档 raw → refined。
再考虑多 workflow。
最后才考虑外部工具调用。
```
