# Obsidian Refined Layer 插件架构书 v0.2.1（Profile 与运行状态增强版）

> 文档状态：v0.2.1 增量架构稿  
> 基线版本：v0.2.0 已完成并通过基本测试  
> 目标读者：Codex / AI coding agent / 人类开发者  
> 核心变化：在 v0.2.0 可配置 A/B 分块模型基础上，补充分块用户语义、RefineProfile 模板层、profile 选择式 refine 命令，以及 refine 运行状态反馈。  
> 本版原则：不重写 v0.2.0 已完成的 proposal、validation、cache、review、apply 主干，只在既有 `raw-refined` workflow 上做小版本增强。

---

## 0. v0.2.1 定性

v0.2.1 是在 v0.2.0 已完成并通过基本测试后的可用性与模板抽象小版本。

v0.2.0 已完成的主干能力作为本版基线：

```text
active note 读取
→ A/B block eligibility
→ 保护分块提取
→ PromptBuilder
→ mock / real provider proposal
→ JSON extraction / zod / normalization
→ session-cache / error-session-cache
→ Review UI
→ ApplyPlan
→ freshness check
→ safe apply / save draft
```

v0.2.1 的新增范围集中在四个点：

```text
1. A/B 分块用户语义命名；
2. RefineProfile 模板层；
3. refine 命令 profile 选择逻辑；
4. refine 运行状态反馈。
```

`WorkflowProfile` 继续表示 workflow 级规则包。v0.2.1 不把插件升级为通用 workflow 平台；`RefineProfile` 只表示 `raw-refined` workflow 下的一套用户可保存模板。

---

## 1. 一句话定义

Obsidian Refined Layer 是一个 Obsidian 插件，用于将当前打开的 raw Markdown 笔记，按照用户选择的 RefineProfile 中的分块规则与 prompt，生成可审核的 refined proposal，并在用户确认后，通过受控 `ApplyPlan` 只应用被确认的内容。

v0.2.1 不改变插件的核心边界：

```text
单篇当前 note
用户审核
ApplyPlan 安全写入
保护分块逐字保留
Tag 只追加白名单内 selectedTags
LLM 输出必须经过本地校验和 normalization
UI 不承载核心规则
```

---

## 2. v0.2.1 作用域

v0.2.1 扩展的是既有 `raw-refined` workflow 的模板选择和运行反馈能力，不改变 v0.2.0 已完成的 proposal、validation、cache、review、apply 主干。

本版本新增三个概念：

1. 分块用户语义：A 类分块称为生成分块，B 类分块称为保护分块。
2. RefineProfile：保存一套 `raw-refined` 模板配置。
3. RefineRunStatus：展示 refine 执行过程中的当前阶段。

`RefineProfile` 的作用域限定为模板配置，不承担 provider、model、key、cache 或 draft 目录配置。

Profile 选择采用显式交互：

```text
默认 refine 使用 activeProfileId
refine with profile... 允许用户本次手动选择 profile
```

运行状态 UI 只展示阶段进度。关闭状态 UI 不会中断当前请求，也不会改变 CreateProposalUseCase 的 retry / success / failure 逻辑。

---

## 3. 核心术语

### 3.1 WorkflowProfile

`WorkflowProfile` 是 workflow 级业务规则包。

v0.2.1 仍只有一个内置 workflow：

```text
raw-refined
```

`raw-refined` 的底层规则包括：

```text
LLM 输出不可信
写入必须经过 ApplyPlan
Apply 前必须 freshness check
保护分块不能被 LLM 修改
生成分块不能嵌套
newTagSuggestions 不能直接写入 YAML tags
UI 不执行 schema validation / policy validation / ApplyPlan 生成 / 文件写入
```

### 3.2 RefineProfile

`RefineProfile` 是 `raw-refined` workflow 下的一套用户可保存 refine 模板。

它不是新的 workflow，也不是 provider 配置。

```ts
interface RefineProfile {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;

  protectH1: boolean;
  aBlocks: ABlockConfig[];
  bBlock: BBlockConfig;

  tagWhitelist: string[];
  tagPrompt: string;
  promptObservationEnabled: boolean;
}
```

`RefineProfile` 保存：

```text
protectH1
生成分块配置
保护分块配置
tagWhitelist
tagPrompt
promptObservationEnabled
```

以下配置继续归属插件全局层：

```text
provider
model
keyId
cache
draftFolder
tokenUsageVisible
```

设计边界：

```text
WorkflowProfile = workflow 规则包
RefineProfile = raw-refined workflow 下的模板配置
```

### 3.3 A 类分块 / 生成分块

A 类分块在用户语义上称为“生成分块”。

生成分块是交给 LLM 生成或整理的 refined 输出块。它由用户在当前 RefineProfile 中配置，并由 LLM 根据对应 block prompt 返回候选内容。

内部类型名继续使用：

```ts
interface ABlockConfig {
  id: string;
  name: string;
  heading: string;
  headingLevel: 1 | 2 | 3 | 4 | 5 | 6;
  prompt: string;
  enabled: boolean;
  order: number;
}

interface ABlockProposal {
  id: string;
  content: string;
  warnings?: string[];
}
```

用户可见文案优先使用：

```text
生成分块
```

规则：

```text
生成分块数量可变
生成分块不能嵌套
生成分块按 order 输出
生成分块可启用/禁用
生成分块 prompt 可由用户配置
生成分块输出进入 Review UI 后由用户选择是否应用
```

### 3.4 B 类分块 / 保护分块

B 类分块在用户语义上称为“保护分块”。

保护分块是当前 note 中必须逐字保留的原始内容区域。默认对应 `## 原始内容`。它可以作为 LLM 输入材料，但不能作为 LLM 可写 proposal 输出，也不能被 ApplyPlan 改写。

内部类型名继续使用：

```ts
interface BBlockConfig {
  id: "original-content";
  name: string;
  heading: string;
  headingLevel: 1 | 2 | 3 | 4 | 5 | 6;
  required: true;
  preserveExactText: true;
}
```

用户可见文案优先使用：

```text
保护分块
```

规则：

```text
保护分块数量只能有一个
保护分块没有 prompt
保护分块不发送给 LLM 要求改写
保护分块从配置 heading 开始，到下一个同级或更高级 heading 之前结束
保护分块内部可包含子标题和子内容，全部逐字保留
Apply 时必须重新从当前文件提取保护分块
```

### 3.5 RefineRunStatus

`RefineRunStatus` 表示一次 refine 执行过程中的状态事件。它只用于 UI 展示，不改变 proposal pipeline 的业务规则。

```ts
type RefineRunStage =
  | "checking-eligibility"
  | "building-prompt"
  | "requesting-model"
  | "parsing-response"
  | "validating-proposal"
  | "normalizing-proposal"
  | "saving-session"
  | "opening-review"
  | "failed";

interface RefineRunStatus {
  runId: string;
  stage: RefineRunStage;
  profileId: string;
  profileName: string;
  attemptIndex?: 1 | 2 | 3;
  maxAttempts?: 3;
  message: string;
  errorSummary?: string;
}
```

---

## 4. v0.2.1 MVP 流程

```text
当前打开的 Markdown 笔记
→ 读取 activeProfileId 或本次用户手动选择的 RefineProfile
→ 检查 frontmatter / status / 生成分块规则 / 保护分块规则 / 保护一级标题规则
→ 提取保护分块
→ 根据生成分块 prompt、tag prompt、tag whitelist 构造结构化 LLM 请求
→ 显示 RefineRunStatus
→ 调用 mock-llm 或 plugin-llm
→ 提取 JSON
→ 通过 zod 本地校验
→ 如失败，最多重试到 3 次
→ 对通过 zod 的结果进行 tag normalization 与 policy normalization
→ 创建可恢复 ProposalSession
→ 打开 Review UI
→ 用户勾选生成分块、frontmatter、selectedTags
→ 生成 ApplyPlan
→ Apply 前重新读取当前文件并 freshness check
→ 安全写入，或冲突时 Save as Draft
```

默认 refine 与手动选择 profile 的 refine 使用同一条 proposal pipeline。差异只在 profile 解析方式。

---

## 5. 配置分层

### 5.1 插件全局设置

```ts
interface PluginSettings {
  language: "zh-CN" | "en";

  provider?: {
    type: "mock" | "openai-compatible";
    model?: string;
    keyId?: string;
    baseUrl?: string;
  };

  cache: {
    sessionCacheLimit: number;
    errorSessionCacheEnabled: boolean;
    errorSessionCacheLimit: number;
  };

  draftFolder: string;
  tokenUsageVisible: boolean;

  rawRefined: RawRefinedWorkflowSettings;
}
```

### 5.2 raw-refined workflow 设置

```ts
interface RawRefinedWorkflowSettings {
  activeProfileId: string;
  profiles: RefineProfile[];
}
```

规则：

```text
profiles 至少包含一个 default profile
activeProfileId 决定默认 refine 命令使用哪套模板
删除 activeProfile 时必须重新指定 activeProfileId
Profile 编辑必须复用 BlockConfigValidator / TagNormalizer / settings sanitizer
```

### 5.3 data.json 安全边界

`data.json` 可以保存：

```text
language
provider type
provider model
provider baseUrl
keyId / secretRef
cache settings
draft folder
activeProfileId
profiles
生成分块配置
保护分块配置
tag whitelist
tag prompt
prompt observation setting
```

`data.json` 不能保存：

```text
真实 API key
Authorization header
provider secret
完整 provider request header
未脱敏错误信息
```

---

## 6. Profile 迁移策略

v0.2.0 的 `rawRefined` 单配置迁移为 v0.2.1 的 default profile。

迁移规则：

```text
旧 rawRefined.protectH1 → defaultProfile.protectH1
旧 rawRefined.aBlocks → defaultProfile.aBlocks
旧 rawRefined.bBlock → defaultProfile.bBlock
旧 rawRefined.tagWhitelist → defaultProfile.tagWhitelist
旧 rawRefined.tagPrompt → defaultProfile.tagPrompt
旧 rawRefined.promptObservationEnabled → defaultProfile.promptObservationEnabled
```

迁移后：

```ts
rawRefined: {
  activeProfileId: "default",
  profiles: [defaultProfile]
}
```

旧配置加载必须保持兼容。缺失 profile 时自动补默认 profile。

---

## 7. Refine 命令交互

### 7.1 默认 refine 命令

命令：

```text
Refine current note
```

行为：

```text
1. 读取 settings.rawRefined.activeProfileId
2. 加载对应 RefineProfile
3. 使用该 profile 执行 eligibility / prompt build / proposal pipeline
4. 显示 RefineRunStatus
5. 成功后进入 Review UI
```

### 7.2 手动选择 profile 的 refine 命令

命令：

```text
Refine current note with profile...
```

行为：

```text
1. 打开 RefineProfile 选择器
2. 用户选择本次使用的 profile
3. 不修改 activeProfileId
4. 使用选中的 profile 执行 refine
```

Profile 选择器至少展示：

```text
profile name
description
生成分块数量
保护分块 heading
```

### 7.3 Profile 选择规则

```text
默认 refine：使用 activeProfileId
手动 refine：使用用户本次选择的 profile，不修改 activeProfileId
cached session：使用 session 中保存的 profileSnapshot 展示，不重新解析当前 settings
```

---

## 8. ProposalSession / Draft / Cached Session

### 8.1 ProposalSession profileSnapshot

`ProposalSessionV2` 增加 `profileSnapshot`。

```ts
interface ProposalSessionV2 {
  id: string;
  workflowProfileId: "raw-refined";
  schemaVersion: "0.2";
  createdAt: string;
  updatedAt: string;

  notePath: string;
  noteTitle: string;

  baseFileHash: string;
  baseFrontmatterHash?: string;
  baseBBlockHash: string;

  profileSnapshot: {
    profileId: string;
    profileName: string;
    protectH1: boolean;
    aBlocks: ABlockConfig[];
    bBlock: BBlockConfig;
    tagWhitelist: string[];
    tagPrompt?: string;
  };

  proposal: RawRefinedProposalV2;
  validation: ProposalValidationResult;
  tokenUsage?: TokenUsageReport;

  status: "generated" | "reviewing" | "applied" | "saved_as_draft" | "discarded" | "conflicted";
  decision?: UserDecisionV2;

  source: {
    provider: string;
    model: string;
    attemptsUsed: number;
  };
}
```

`profileSnapshot` 用于保证 proposal review、draft、cached session 恢复时能看到本次使用的模板配置。

`profileSnapshot` 不能包含：

```text
API key
Authorization header
provider secret
SecretStorage value
provider request headers
```

### 8.2 Review UI

Review UI 增加本次使用的 profile 信息：

```text
profileName
profileId
```

生成分块、保护分块的用户可见文案应使用新术语。

### 8.3 Save as Draft

草稿应包含：

```text
source note path
workflow id
profile id
profile name
created time
provider/model
token usage
生成分块 proposal
frontmatter suggestion
selectedTags
newTagSuggestions
warnings
validation result
conflict reason（如有）
```

### 8.4 Cached Session

cached session picker 至少显示：

```text
note title
note path
profile name
created time
provider
model
token usage
status
attemptsUsed
```

cached session Review UI 继续保持：

```text
Apply disabled
Save as Draft enabled
```

---

## 9. RefineRunStatus UI

v0.2.1 必须在 refine 执行过程中显示运行状态，避免用户执行命令后长时间无反馈。

状态 UI 可以使用轻量 Modal 或固定 Notice，但必须能显示当前阶段。

阶段文案示例：

```text
正在检查笔记是否可 refine
正在构造 prompt
正在请求模型（第 N/3 次）
正在解析模型返回
正在校验 proposal
正在规范化 proposal
正在保存缓存记录
正在打开审核界面
```

状态 UI 与请求生命周期解耦：

```text
状态 UI 订阅 refine run events
UI close 只销毁显示层
CreateProposalUseCase 继续按 retry / success / failure 逻辑完成
不新增 cancelled result 类型
```

状态事件不得包含：

```text
API key
Authorization header
provider secret
SecretStorage value
未脱敏 provider error
```

---

## 10. Settings UI 要求

Settings UI 增加 RefineProfile 管理能力。

Profile 列表项显示：

```text
profile name
description
是否 activeProfile
生成分块数量
保护分块 heading
```

Profile 管理操作：

```text
选择 active profile
新增 profile
复制 profile
删除 profile
编辑 profile
```

删除规则：

```text
不能删除最后一个 profile
删除 activeProfile 前必须重新指定 activeProfileId
```

Profile 编辑字段：

```text
profile name
description
protectH1
生成分块列表
生成分块名称
生成分块标题层级
生成分块 prompt
生成分块启用/禁用
生成分块排序
保护分块名称
保护分块标题层级
tagWhitelist
tagPrompt
promptObservationEnabled
```

UI 不自行实现核心校验。保存前应调用 core validator，并展示 core 返回的错误。

---

## 11. 安全与分层约束

### 11.1 Core 层

负责：

```text
RefineProfile 类型
profile 配置校验
生成分块 / 保护分块配置校验
Heading parsing
保护分块提取
PromptBuilder
Zod schema
Proposal validation
Proposal normalization
Tag normalization
PolicyGuard
ApplyPlan
Conflict detection
Cache data model
```

### 11.2 Application 层

负责：

```text
activeProfileId 解析
手动选择 profile 后的 use case 编排
RefineRunStatus 事件发出
调用 repository/provider/cache/review gate
控制 retry
决定何时写 session-cache / error-session-cache
决定何时弹通知
```

### 11.3 Adapters 层

负责：

```text
Obsidian 文件读写
Obsidian SecretStorage
Obsidian settings store
Obsidian cache folder 读写
LLM provider 调用
```

### 11.4 UI 层

负责：

```text
Settings profile 配置输入
ProfilePickerModal
RefineRunStatusModal
Review 展示
用户勾选
复制 newTagSuggestions
复制诊断信息
选择 cached session
触发按钮事件
```

UI 不得写文件，不得生成 ApplyPlan，不得执行 tag normalization，不得承担保护分块提取与保护规则。

---

## 12. 验收标准

### 12.1 术语

```text
[ ] 用户可见文案使用“生成分块”描述 A 类分块。
[ ] 用户可见文案使用“保护分块”描述 B 类分块。
[ ] 内部类型 ABlockConfig / BBlockConfig / ABlockProposal 不被强制重命名。
```

### 12.2 RefineProfile

```text
[ ] RefineProfile 类型存在。
[ ] RawRefinedWorkflowSettings 使用 activeProfileId + profiles。
[ ] 旧 v0.2.0 rawRefined 单配置可迁移为 default profile。
[ ] provider/model/key/cache/draftFolder 不进入 RefineProfile。
[ ] settings sanitize 不泄露 secret。
```

### 12.3 命令交互

```text
[ ] 默认 Refine current note 使用 activeProfile。
[ ] Refine current note with profile... 可手动选择 profile。
[ ] 手动选择 profile 不修改 activeProfileId。
[ ] ProposalSession 保存 profileSnapshot。
[ ] Review UI 显示 profileName。
```

### 12.4 运行状态

```text
[ ] 执行 refine 后立即出现运行状态。
[ ] 请求模型时显示第 N/3 次。
[ ] zod retry 时状态能更新。
[ ] 成功后关闭状态 UI 并打开 Review UI。
[ ] 失败后显示失败状态和既有错误提示。
[ ] 关闭状态 UI 不会中断请求。
[ ] 不新增 cancelled result 类型。
```

### 12.5 回归

```text
[ ] 保护分块逐字保留。
[ ] selectedTags 只追加白名单 tag。
[ ] newTagSuggestions 不写入 YAML。
[ ] cached session Apply 仍 disabled。
[ ] Save as Draft 不修改原 note。
[ ] session-cache / error-session-cache 不保存 API key / Authorization / provider secret。
```

---

## 13. 测试计划

### 13.1 单元测试

```text
RefineProfile migration：旧 rawRefined 配置迁移为 default profile。
Settings sanitize：profiles 中不能保存 secret。
Profile validator：不能保存非法生成分块 / 保护分块配置。
Profile resolver：activeProfileId 解析正确。
Profile resolver：手动选择 profile 不修改 activeProfileId。
RefineRunStatus：阶段事件顺序可测试。
```

### 13.2 集成测试

```text
默认 activeProfile refine happy path。
with profile refine happy path。
ProposalSession 保存 profileSnapshot。
ReviewViewModel 显示 profileName。
SaveDraftUseCase 输出 profileName / profileId。
cached session picker 显示 profileName。
```

### 13.3 手动测试

```text
Settings UI 新增 / 复制 / 删除 profile。
切换 activeProfile 后默认 refine 使用新 profile。
with profile refine 不改变 activeProfileId。
运行状态 UI 显示 eligibility / prompt / request / validation / session / review 阶段。
关闭状态 UI 后请求继续完成。
真实 provider 下状态 UI 不泄露 secret。
```

---

## 14. 最终判断

v0.2.1 的目标不是扩大插件的任务范围，而是把 v0.2.0 已经完成的可配置 refined workflow 做成更可用的模板系统。

核心变化可以概括为：

```text
A/B 分块术语更清楚
单 raw-refined workflow 支持多套 RefineProfile
默认 refine 使用 activeProfile
手动 refine 可选择 profile
长时间 API 请求过程可见
```

本版完成后，用户可以为论文阅读、项目日志、概念笔记、Bug 分析等不同笔记类型保存不同 refine 模板，同时仍保留 v0.2.0 的安全写入、审核确认、保护分块逐字保留和本地校验机制。
