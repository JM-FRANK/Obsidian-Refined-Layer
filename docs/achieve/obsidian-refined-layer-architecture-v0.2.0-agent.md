# Obsidian Refined Layer 插件架构书 v0.2.0（可配置分块 Agent 执行版）

> 文档状态：v0.2.0 架构迭代稿
> 目标读者：Codex / AI coding agent / 人类开发者
> 核心变化：从固定 `raw-refined` section 模型升级为“可配置分块 + 结构化 Tag 建议 + Prompt 可观测 + Zod 校验重试 + Session/Error Cache 分离”的单篇 refined 工作流。
> 本版原则：仍然先完成单篇 Markdown 笔记 `raw → refined` 的可审核闭环，不实现通用 workflow 平台、外部 MCP/HTTP adapter、批量 refine、MOC 写入或关系链接写入。

---

## 0. v0.2.0 定性

v0.2.0 不是 v0.1.0 的局部 bugfix，而是一次核心工作流模型迭代。

v0.1.0 的核心模型是：

```text
固定 raw-refined profile
固定 ## 原始内容
固定 refinedSections
固定 tag whitelist
固定 proposal schema
proposal 校验失败则整体失败
```

v0.2.0 的核心模型是：

```text
单 workflow 内的可配置 A/B 分块
B 类分块机械保留
A 类分块按用户配置的 prompt 生成
Tag 作为独立结构化建议
Prompt / Response / Parsed Proposal / Validation 可观测
LLM 输出经过 zod 本地校验，最多请求 3 次
成功 session 与失败 attempt 分离保存
UI 只负责配置、展示和用户决策，不承载核心规则
```

因此本版不推翻 `Core / Application / Adapters / UI / Runtime` 的分层，也不推翻 `ApplyPlan` 作为唯一写入入口的安全原则；但会重构 `WorkflowProfile`、block parsing、prompt builder、proposal schema、validator、tag policy、settings UI 和 cache 模型。


### 0.1 Agent 执行约束

为了便于 Codex / Claude Code / 其他 coding agent 执行，v0.2.0 的实现不得按“大重构一次完成”推进，而应按可验证的垂直切片推进。

每个执行任务必须满足：

```text
1. 只处理一个明确切片，不同时改动无关 UI、provider、apply、cache。
2. 先更新类型 / schema / 测试，再实现 core 逻辑，再接 application，最后接 UI。
3. UI 只能消费 ViewModel 和返回 UserDecision，不得承载 tag normalization、zod validation、policy validation、ApplyPlan 生成或文件写入。
4. 每个切片完成后必须运行 typecheck 和相关测试。
5. 每个切片完成后必须更新开发日志，记录 Scope / Change / Verification / Next。
6. 如果发现需求冲突，先输出问题与建议，不自行扩大范围。
```

建议执行顺序：

```text
P0：类型与设置迁移
- 定义 ABlockConfig / BBlockConfig / TagPolicy / ProposalSession / FailedAttemptRecord。
- 明确 session-cache 与 error-session-cache 的数据边界。

P1：Markdown 分块解析
- 实现保护一级标题规则。
- 实现 A/B 分块合法性检查。
- 实现 B 类分块提取与逐字保留。

P2：Prompt / Zod / Tag Normalization
- 实现结构化请求与 PromptBuilder。
- 引入 zod schema。
- 实现最多 3 次请求与 tagNormalizationApplied。

P3：Cache 与错误会话
- 成功 ProposalSession 写入 session-cache。
- 失败 attempt 写入 error-session-cache。
- 实现上限 30 与自动清理。

P4：Review 与 Settings UI
- 接入 A 类分块勾选。
- selectedTags 可勾选应用。
- newTagSuggestions 可复制不可编辑。
- 增加模型连接性测试、SecretStorage 诊断复制、缓存记录文案。

P5：Apply 与端到端验证
- ApplyPlan 只应用用户确认内容。
- tags 只增加不覆盖不删除。
- B 类分块逐字保留。
- cached session 只允许 Save as Draft，Apply 灰色。

P6：真实 Obsidian / Prompt 调试与修复
- 记录真实 Obsidian vault、真实 provider、prompt 输出与本地校验之间暴露出的调试问题。
- 以小步修复方式补齐实现、测试和文档，不扩大 v0.2.0 的 workflow scope。
```

---

## 1. 一句话定义

Obsidian Refined Layer 是一个 Obsidian 插件，用于将当前打开的 raw Markdown 笔记，按照用户配置的分块规则与 prompt，生成可审核的 refined proposal，并在用户确认后，通过受控 `ApplyPlan` 只应用被确认的内容。

插件不是 Agent，不做全局记忆、任务规划、MOC 自动写入、关系链接自动写入、批量整理、文件改名、文件迁移或外部工具路由。

---

## 2. v0.2.0 MVP 流程

```text
当前打开的 Markdown 笔记
→ 读取当前 workflow block config
→ 检查 frontmatter / status / A/B 分块规则 / 保护一级标题规则
→ 提取 B 类原始内容保护块
→ 根据 A 类分块 prompt、tag prompt、tag whitelist 构造结构化 LLM 请求
→ 调用 mock-llm 或 plugin-llm
→ 提取 JSON
→ 通过 zod 本地校验
→ 如失败，最多重试到 3 次
→ 对通过 zod 的结果进行 tag normalization 与 policy normalization
→ 创建可恢复 ProposalSession
→ 打开 Review UI
→ 用户勾选 A 类分块、frontmatter、selectedTags
→ 生成 ApplyPlan
→ Apply 前重新读取当前文件并 freshness check
→ 安全写入，或冲突时 Save as Draft
```

如果第 1 次请求成功，则不弹请求次数提醒，不写入 `error-session-cache`。

如果第 2/3 次请求才成功：

```text
失败 attempt → error-session-cache
成功 ProposalSession → session-cache
```

如果 3 次全部失败：

```text
失败 attempt → error-session-cache
不创建 ProposalSession
不打开 Review UI
```

---

## 3. v0.2.0 明确不做

```text
不做多 workflow/profile 编辑器
不做通用 workflow 平台
不做 MCP server
不做 HTTP server
不做 File Inbox adapter
不做外部 proposal import
不做外部审核通道
不做批量 refine
不做 MOC 写入
不做关系链接写入
不做 rename / move apply
不做 move 建议
不做自动归档或删除
不做 tokenizer 选择 UI
不做价格估算
不做 tag remove
不做 A 类分块嵌套
不做 selectedTags 的覆盖写入
不做 newTagSuggestions 的直接应用
不做 tag 大小写归一化
```

v0.2.0 可以提供单 workflow 内的分块配置 UI、tag 白名单 UI、tag prompt 设置、prompt 可观测面板、模型连接性测试、session 缓存查看命令和 error-session-cache 开关。这些属于 `raw-refined` workflow 的必要配置，不视为通用 workflow 平台。

---

## 4. 核心实现原则

### 4.1 必须遵守

1. LLM 输出不可信，不能直接写文件。
2. 所有写入必须经过 `ApplyPlan`。
3. Apply 前必须重新读取当前文件并执行 freshness check。
4. B 类分块是受保护区域，不能由 LLM 修改。
5. A 类分块不允许嵌套。
6. UI 不执行 schema validation、policy validation、tag normalization、ApplyPlan 生成或文件写入。
7. API key、Authorization header、provider secret 不得进入日志、session、draft、error cache、data.json 或错误信息。
8. Prompt / Response 可观测功能必须可控、脱敏，并明确可能包含笔记正文。
9. 外部工具未来只能作为 adapter 接入 zod 层之前的结构化请求边界；返回后仍必须由本地 zod 校验。
10. Tag 建议失败不应导致正文 proposal 整体丢弃；tag 相关异常应尽量降级为 normalization、warning 或 rejected field。

### 4.2 保留的 v0.1.0 底层原则

继续保留：

```text
Core / Application / Adapters / UI / Runtime 分层
ReviewGate 抽象
ApplyPlan 唯一写入入口
SecretStorage 存储真实 API key
data.json 只保存 key id / provider 配置 / 用户设置
ProposalSession 是运行态缓存，不是用户正式草稿
Save as Draft 是用户可见草稿，不等于 ProposalSession
```

---

## 5. 建议目录结构

v0.2.0 建议在 v0.1.0 目录基础上新增或调整以下模块：

```text
src/
  main.ts

  core/
    profile/
      WorkflowProfile.ts
      rawRefinedProfile.ts
      BlockConfig.ts
      TagPolicy.ts
    markdown/
      HeadingParser.ts
      BlockExtractor.ts
      MarkdownAssembler.ts
    policy/
      PolicyGuard.ts
    proposal/
      Proposal.ts
      ProposalSchema.ts
      ProposalValidator.ts
      ProposalNormalizer.ts
    prompt/
      PromptBuilder.ts
      PromptDebugSnapshot.ts
    apply/
      ApplyPlan.ts
      ApplyPlanner.ts
      ConflictDetector.ts
    cache/
      SessionCache.ts
      ErrorSessionCache.ts

  application/
    CheckEligibilityUseCase.ts
    CreateProposalUseCase.ts
    RequestReviewUseCase.ts
    BuildApplyPlanUseCase.ts
    ApplyDecisionUseCase.ts
    SaveDraftUseCase.ts
    OpenCachedSessionUseCase.ts
    TestModelConnectionUseCase.ts

  adapters/
    obsidian/
      ObsidianNoteRepository.ts
      ObsidianFrontmatterWriter.ts
      ObsidianFileWriter.ts
      ObsidianSecretStore.ts
      ObsidianSettingsStore.ts
      ObsidianRuntimeCacheStore.ts
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
      CachedSessionPickerModal.ts
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

- `core/markdown/` 负责 heading 解析、A/B 分块提取和安全组装。
- `core/prompt/` 负责最终 prompt 构造和 debug snapshot，不直接调用 provider。
- `core/proposal/` 负责 zod schema、validation、normalization。
- `core/cache/` 定义缓存数据结构和核心策略，实际 Obsidian 文件读写由 adapter 完成。
- `ui/` 只消费 ViewModel 和返回 UserDecision，不承载核心规则。

---

## 6. 核心术语

### 6.1 WorkflowProfile

某个 workflow 的业务规则包。v0.2.0 仍只有一个内置 workflow：`raw-refined`。

v0.2.0 的 `raw-refined` 不再固定输出 section，而是使用用户配置的 A/B 分块规则。

### 6.2 A 类分块

A 类分块是交给 LLM 生成或整理的 refined 输出块。

每个 A 类分块包含：

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
```

规则：

```text
A 类分块数量可变
A 类分块不能嵌套
A 类分块按 order 输出
A 类分块可启用/禁用
A 类分块 prompt 可由用户配置
A 类分块输出进入 Review UI 后由用户选择是否应用
```

A 类分块虽然有 heading level，但它们在配置模型中是 flat ordered list，不形成父子树。

### 6.3 B 类分块

B 类分块是唯一的原始内容保护块，对应默认模板中的 `## 原始内容`。

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

规则：

```text
B 类分块数量只能有一个
B 类分块没有 prompt
B 类分块不发送给 LLM 要求改写
B 类分块从配置 heading 开始，到下一个同级或更高级 heading 之前结束
B 类分块内部可包含子标题和子内容，全部逐字保留
Apply 时必须重新从当前文件提取 B 类分块
```

### 6.4 保护一级标题

设置项名称：

```text
保护一级标题
```

开启时：

```text
第一个一级标题视为文件名/主标题
A/B 分块最小层级为 2
一级标题不被 refined 输出覆盖
```

关闭时：

```text
A/B 分块最小层级可以为 1
一级标题可以被 A/B 分块覆盖
```

该设置影响 eligibility、block parser、prompt builder、proposal validator 和 apply assembler。

### 6.5 Proposal

LLM 返回的结构化候选内容。Proposal 不是最终笔记，不能直接写文件。

### 6.6 ProposalSession

成功生成的 proposal session。它可被直接恢复到 Review UI。

ProposalSession 存入 `session-cache`，用于恢复查看和 Save as Draft。

### 6.7 Attempt

一次 LLM 请求尝试的完整调试记录。Attempt 不等同于 ProposalSession。

Attempt 存入 `error-session-cache`，用于排查失败原因，不可直接恢复为可 apply 的 Review UI。

### 6.8 ReviewGate

审核门槛抽象。v0.2.0 仍使用 Obsidian UI，但 Application 层只依赖 ReviewGate，不直接耦合 Modal。

### 6.9 ApplyPlan

所有文件写入操作的唯一入口。

UI、LLM provider、ProposalValidator 都不能直接写文件。

---

## 7. 配置分层

### 7.1 插件内核硬规则

不可配置：

```text
LLM 输出不可信
写入必须经过 ApplyPlan
Apply 前必须 freshness check
B 类分块不能被 LLM 修改
API key 不能明文保存或进入任何缓存/日志/错误信息
外部请求不能覆盖本地 profile policy
A 类分块不能嵌套
newTagSuggestions 不能直接写入 YAML tags
```

### 7.2 插件全局设置

```ts
interface PluginSettings {
  language: "zh-CN" | "en";

  provider?: {
    type: "mock" | "openai-compatible";
    model?: string;
    keyId?: string;       // UI 显示为“密钥 ID”；内部可继续映射到 secretRef
    baseUrl?: string;
  };

  cache: {
    sessionCacheLimit: number;       // 默认 5
    errorSessionCacheEnabled: boolean; // 默认 true
    errorSessionCacheLimit: number;  // 固定或默认 30
  };

  draftFolder: string;
  tokenUsageVisible: boolean;

  rawRefined: RawRefinedWorkflowSettings;
}
```

### 7.3 raw-refined workflow 设置

```ts
interface RawRefinedWorkflowSettings {
  protectH1: boolean;
  aBlocks: ABlockConfig[];
  bBlock: BBlockConfig;
  tagWhitelist: string[];
  tagPrompt: string;
  promptObservationEnabled: boolean;
}
```

规则：

```text
A 类分块配置是用户可编辑配置
B 类分块配置只能有一个
tagWhitelist 是用户维护的可选 tag 列表
tagPrompt 独立于 A 类分块 prompt
promptObservationEnabled 控制 prompt/response 可观测能力
```

### 7.4 data.json 安全边界

`data.json` 可以保存：

```text
language
provider type
provider model
provider baseUrl
keyId / secretRef
cache settings
draft folder
A/B block config
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

## 8. A/B 分块规则

### 8.1 A 类分块规则

A 类分块用于生成 refined 内容。

每个 A 类分块都应在最终 prompt 中有独立指令，至少包含：

```text
block id
block heading
block heading level
block-specific prompt
期望输出格式
```

LLM 返回时，每个 A 类分块必须按 `id` 返回内容。

```ts
interface ABlockProposal {
  id: string;
  content: string;
  warnings?: string[];
}
```

### 8.2 A 类分块不嵌套

禁止配置出逻辑嵌套关系。

允许：

```text
A1: ## 摘要
A2: ## 当前结论
A3: ## 依据与推理
```

也允许用户关闭保护一级标题后使用：

```text
A1: # 摘要
A2: # 当前结论
```

但即使 heading level 不同，配置上也仍然是平铺列表，不构建父子树。

### 8.3 B 类分块规则

B 类分块用于保护原始内容。

默认：

```text
heading = 原始内容
headingLevel = 2
```

用户可改名和改层级。

提取策略：

```text
找到匹配 heading text + heading level 的 B 类 heading
从该 heading 起始位置开始
向后扫描到下一个 headingLevel <= B.headingLevel 的 heading 之前
中间内容全部归入 B 类分块
```

如果 B 类分块内部出现更低层级标题，例如 `### 子记录`，必须一并保留。

### 8.4 B 类分块位置

B 类分块不强制在文末。用户可以统一设定其位置。Apply 时应按当前文件实际结构重新提取和保留。

最小实现可以采用：

```text
新正文 = 选中的 A 类分块组装结果 + 当前文件中的 B 类分块原文
```

如果后续需要保留 B 类分块在原位置，则需在 ApplyAssembler 中增加位置策略。v0.2.0 的核心要求是 B 类分块逐字保留，不要求实现复杂多位置重排。

### 8.5 eligibility

一篇 note 可被 refine 的条件：

```text
是 Markdown 文件
frontmatter 存在
status = raw
存在唯一 B 类分块
A 类分块配置合法
B 类分块配置合法
保护一级标题规则满足
```

B 类分块缺失、重复或层级不合法时应拒绝 refine，并提示用户调整笔记或配置。

---

## 9. Prompt Policy 与可观测性

### 9.1 PromptBuilder 职责

PromptBuilder 负责将：

```text
note metadata
B 类分块内容或摘要输入
A 类分块配置
tag whitelist
tag prompt
schema instruction
safety instruction
```

组装为最终 LLM 请求。

Provider 不负责拼 prompt，只负责发送请求。

### 9.2 A 类分块 prompt

每个 A 类分块有独立 prompt。

PromptBuilder 必须把每个 A 类分块的 prompt 与 block id 绑定，防止 LLM 返回无法映射到 UI 的内容。

### 9.3 tag prompt

tag prompt 独立于 A 类分块 prompt。

它用于指导 LLM：

```text
从 tagWhitelist 中选择 selectedTags
如果需要新标签，写入 newTagSuggestions
不要把非白名单标签写入 selectedTags
```

### 9.4 固化的 tag schema 指令

无论用户如何修改 tag prompt，插件内部必须固化以下结构要求：

```text
selectedTags 只能来自 tagWhitelist
newTagSuggestions 用于新的 tag 建议
selectedTags 与 newTagSuggestions 必须分开输出
不得输出 tag remove
不得要求覆盖 YAML tags
```

### 9.5 Prompt 可观测性

v0.2.0 必须支持查看或复制：

```text
provider
model
final system prompt
final user prompt
A 类分块 prompt 展开结果
tag prompt 展开结果
tag whitelist
结构化 schema instruction
raw LLM response
parsed JSON
zod validation result
normalization report
validation warnings
```

默认不应自动落盘完整 prompt / response，除非：

```text
用户显式开启 prompt observation
或发生需要写入 error-session-cache 的严重错误
```

所有可观测输出必须脱敏 API key、Authorization header 和 provider secret。

---

## 10. LLM Provider 与结构化请求边界

### 10.1 LLM Provider 接口

```ts
interface LlmProvider {
  generateProposal(request: LlmRequest): Promise<LlmResponse>;
}

interface LlmRequest {
  provider: string;
  model: string;
  messages: Array<{ role: "system" | "user"; content: string }>;
  schemaName: string;
  schemaVersion: string;
  metadata: {
    workflowProfileId: "raw-refined";
    requestId: string;
  };
}

interface LlmResponse {
  rawText: string;
  parsedJson?: unknown;
  usage?: TokenUsageReport;
}
```

### 10.2 未来工具调用边界

未来作为工具调用时，对外传出的是 `LlmRequest` 级别的结构化请求，位置在 zod 校验之前。

外部工具返回后，插件必须继续执行：

```text
JSON extraction
zod parse
normalization
policy validation
```

外部工具不能直接创建 ProposalSession，不能绕过本地校验，不能覆盖本地 tag whitelist、A/B 分块配置或 ApplyPolicy。

---

## 11. Proposal Schema 与 Zod 校验

### 11.1 RawRefinedProposal v0.2

```ts
interface RawRefinedProposalV2 {
  workflowProfileId: "raw-refined";
  schemaVersion: "0.2";

  blocks: ABlockProposal[];

  frontmatterSuggestion?: {
    status?: "refined";
    source?: Array<"self" | "external" | "practice">;
    context?: string[];
  };

  tagSuggestion?: {
    selectedTags?: string[];
    newTagSuggestions?: string[];
  };

  warnings?: string[];
}
```

### 11.2 Zod 层职责

Zod 层只负责结构合法性：

```text
能否解析为对象
workflowProfileId 是否正确
schemaVersion 是否正确
blocks 是否数组
每个 block 是否有 id/content
frontmatterSuggestion 字段类型是否正确
tagSuggestion 字段类型是否正确
warnings 是否字符串数组
```

Zod 层不负责：

```text
tag 是否在白名单内
A block 是否启用
B block 是否被改写
是否可写入 YAML
是否用户已确认
```

这些由 normalization / policy / apply 阶段处理。

### 11.3 最大重试次数

```text
maxAttempts = 3
```

重试触发条件：

```text
非 JSON 且无法提取 JSON block
JSON 可提取但 zod 失败
结构严重缺字段
provider 返回空内容
parsed proposal 无法进入 normalization
```

非致命 policy warning 不触发重试。例如 selectedTags 中有非白名单 tag，可通过 normalization 移入 newTagSuggestions。

---

## 12. Proposal Normalization

### 12.1 Normalization 职责

Normalization 在 zod 通过之后执行。

职责：

```text
规范 A block 顺序
丢弃未知 block id 或标记 rejected field
规范 tag 字段格式
将 selectedTags 中的白名单外 tag 移入 newTagSuggestions
生成 normalization report
设置 tagNormalizationApplied
```

### 12.2 tagNormalizationApplied

v0.2.0 只记录：

```ts
tagNormalizationApplied: boolean;
```

只要发生以下任一处理，即为 true：

```text
tag 字符串被中英文逗号分割
tag 字符串被顿号分割
tag 字符串被空格分割
tag 字符串被换行分割
tag 被 trim
tag 空项被移除
tag 被自动补 #
tag 去重
selectedTags 中非白名单 tag 被移动到 newTagSuggestions
```

该字段：

```text
保存在本地 ProposalSession / validation report
可在 Review UI 中作为提示显示
不传给 LLM
不写入笔记正文
不写入 YAML
不用于下一轮 prompt
```

### 12.3 tag 分割规则

支持分隔符：

```text
英文逗号 ,
中文逗号 ，
空格
换行
顿号 、
```

不做大小写归一化。

示例：

```text
输入：ai/assisted, #todo/refine，flag/core、#flag/sensitive
输出：
#ai/assisted
#todo/refine
#flag/core
#flag/sensitive
```

### 12.4 selectedTags 与 newTagSuggestions

`selectedTags`：

```text
只能包含 tagWhitelist 中的 tag
可在 Review UI 中勾选
应用到 YAML tags
只增加，不覆盖，不删除
```

`newTagSuggestions`：

```text
用于显示新 tag 建议
可选中复制
不可编辑
不可直接写入 YAML tags
```

如果 LLM 把白名单外 tag 放进 selectedTags：

```text
不整体失败
移动到 newTagSuggestions
记录 warning 或 normalization note
Apply 阶段不写入
```

### 12.5 tag remove 不做

v0.2.0 没有 tag remove。

不得从 proposal、UI decision 或 ApplyPlan 中生成 tag removal operation。

---

## 13. Proposal Validation 与 Partial 结果

### 13.1 Validation 层级

```text
JSON extraction
→ zod schema validation
→ normalization
→ policy validation
→ content boundary validation
```

### 13.2 policy validation

检查：

```text
A block id 必须来自启用配置或被标记 rejected
frontmatter 只允许 status/source/context
created readonly
unknown YAML preserve-only
selectedTags 只允许白名单内 tag
newTagSuggestions 不可直接应用
禁止 #rel/* 写入普通 tags
禁止 link/MOC/rename/move/archive/delete 操作
proposal 不得包含 B 类分块原文作为可写内容
```

### 13.3 partial validation result

```ts
interface ProposalValidationResult {
  status: "valid" | "partial" | "invalid";
  acceptedFields: string[];
  rejectedFields: Array<{
    field: string;
    reason: string;
    values?: string[];
  }>;
  warnings: string[];
  tagNormalizationApplied: boolean;
}
```

`unknown tag` 不应导致正文整体失败。只有严重结构错误、B 类分块保护失败、无法映射 A block、或 zod 三次失败才导致无法进入 Review UI。

---

## 14. Session Cache 与 Error Session Cache

### 14.1 两类缓存必须分离

v0.2.0 明确区分：

```text
session-cache：保存成功 ProposalSession，可直接恢复到 Review UI
error-session-cache：保存失败 attempt，用于调试，不可直接恢复为可 apply session
```

二者格式不同、用途不同、生命周期不同。

### 14.2 ProposalSession 格式

ProposalSession 是成功结果，可直接导入后交给 UI 层显示。

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

  blockConfigSnapshot: {
    protectH1: boolean;
    aBlocks: ABlockConfig[];
    bBlock: BBlockConfig;
    tagWhitelist: string[];
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

Session 不保存：

```text
API key
Authorization header
provider secret
完整 provider request headers
未脱敏错误信息
```

Session 可以保存：

```text
proposal
token usage
validation result
tagNormalizationApplied
block config snapshot
attemptsUsed
```

### 14.3 Attempt 格式

Attempt 是失败调试记录。Attempt 不能直接恢复成 Review UI session。

Attempt 除敏感信息外应尽量完整保存。

```ts
interface FailedAttemptRecord {
  id: string;
  errorSessionId: string;
  attemptIndex: 1 | 2 | 3;
  createdAt: string;

  provider: string;
  model: string;
  workflowProfileId: "raw-refined";
  schemaVersion: "0.2";

  notePath: string;
  noteTitle: string;

  blockConfigSnapshot: {
    protectH1: boolean;
    aBlocks: ABlockConfig[];
    bBlock: BBlockConfig;
    tagWhitelist: string[];
  };

  requestSnapshot: {
    messages: Array<{ role: "system" | "user"; content: string }>;
    schemaName: string;
    schemaVersion: string;
    metadata: Record<string, unknown>;
  };

  responseSnapshot?: {
    rawText?: string;
    extractedJsonText?: string;
    parsedJson?: unknown;
    usage?: TokenUsageReport;
  };

  validationSnapshot?: {
    jsonExtractionError?: string;
    zodError?: unknown;
    normalizationReport?: unknown;
    policyErrors?: unknown;
  };

  errorSummary: string;
}
```

Attempt 必须 redaction：

```text
不保存 API key
不保存 Authorization header
不保存 provider secret
不保存 SecretStorage value
不保存未脱敏 provider error
```

但除敏感信息外，attempt 应保存完整请求、完整原始响应、完整解析结果、完整 zod 错误、完整 normalization/policy 结果，便于调试。

### 14.4 第 2/3 次成功时的保存规则

示例：

```text
attempt 1 failed
attempt 2 failed
attempt 3 success
```

保存结果必须是：

```text
attempt 1 → error-session-cache
attempt 2 → error-session-cache
attempt 3 成功 ProposalSession → session-cache
```

禁止：

```text
把成功 attempt 3 也保存到 error-session-cache
把失败 attempt 当成 ProposalSession 保存到 session-cache
用 attempt 格式恢复 UI
用 session 格式保存失败调试内容
```

### 14.5 第 1 次成功时

```text
创建 ProposalSession
保存到 session-cache
不写 error-session-cache
不弹请求次数提醒
不弹 error-cache 位置提醒
```

### 14.6 3 次全部失败时

```text
attempt 1/2/3 全部保存到 error-session-cache
不创建 ProposalSession
不打开 Review UI
弹两次提醒
```

提醒 1：

```text
本次 refined 共请求模型 3 次，均未生成可用 proposal。
```

提醒 2：

```text
错误会话已保存到：<插件目录>/error-session-cache/
```

如果错误会话缓存关闭，提醒 2 改为：

```text
错误会话缓存未启用，未保存失败会话。
```

### 14.7 第 2/3 次成功时的提醒

弹两次，不能合并。

提醒 1：

```text
本次 refined 共请求模型 N 次。
```

提醒 2：

```text
失败尝试已保存到：<插件目录>/error-session-cache/
```

成功 session 另存于 session-cache。

### 14.8 error-session-cache 设置

```ts
interface ErrorSessionCacheSettings {
  enabled: boolean; // 默认 true
  limit: 30;        // v0.2.0 固定或默认 30
}
```

超过 30 后自动删除最旧的 error session。

清理策略：

```text
按 createdAt 从旧到新排序
保留最近 30 个 error session
删除更早记录
```

### 14.9 session-cache 设置

```ts
interface SessionCacheSettings {
  limit: number; // 默认 5
}
```

session-cache 保存最近成功 proposal session。超过上限后删除旧 session。

UI 文案统一为：

```text
缓存记录
缓存记录数量上限
查看缓存记录
清除缓存记录
缓存内容位置
```

不使用“历史记录”表述。

---

## 15. 查看 Session 缓存命令

### 15.1 命令

新增命令：

```text
查看 session 缓存
```

内部名称示例：

```text
Open cached proposal session
```

### 15.2 选择流程

执行命令后，先显示 session 选择 UI。

如果设置的 session-cache limit 为 5，则最多展示 5 个 session。实际不足 5 个时展示实际数量。

每项至少显示：

```text
note title
note path
created time
provider
model
token usage
status
attemptsUsed
```

### 15.3 选中后行为

选中某个 cached session 后，进入与初次 proposal review 基本一致的 UI。

允许：

```text
查看 refined 内容
查看 A 类分块 proposal
勾选要保留的 A 类分块
查看 frontmatter 建议
查看 selectedTags
勾选 selectedTags
查看 newTagSuggestions
复制 newTagSuggestions
查看 warnings / token usage / validation result
Save as Draft
```

禁止：

```text
Apply selected changes
```

Apply 按钮必须灰色不可用。

原因：cached session 可能已经与当前文件状态不一致。v0.2.0 的缓存恢复只用于查看、选择和保存草稿，不用于直接 apply。

---

## 16. Review UI

### 16.1 职责

Review UI 只消费 `ReviewViewModel`，只返回 `UserDecisionV2`。

UI 不做：

```text
zod validation
policy validation
tag normalization
A/B 分块合法性判断
B 类分块提取
ApplyPlan 生成
文件写入
```

### 16.2 正常 proposal Review UI

必须展示：

```text
A 类分块 refined 内容预览
每个 A 类分块的勾选控件
frontmatter 建议
selectedTags 勾选控件
newTagSuggestions 只读可复制区域
tagNormalizationApplied 提示（如为 true）
validation warnings
token usage
attemptsUsed（第 2/3 次成功时可见）
Save as Draft
Apply selected changes
```

默认：

```text
所有写入项未选中
用户必须显式勾选
```

### 16.3 cached session Review UI

从 session-cache 恢复时：

```text
UI 内容与正常 Review UI 基本一致
Apply selected changes 灰色不可用
Save as Draft 可用
```

### 16.4 selectedTags UI

`selectedTags` 应显示为可勾选项。

用户勾选后，Apply 阶段将其追加到 YAML `tags`。

```text
只增加
不覆盖
不删除
去重
只写入白名单内 tag
```

### 16.5 newTagSuggestions UI

`newTagSuggestions` 应显示在只读区域。

要求：

```text
可选中
可复制
不可编辑
不可直接应用
```

可提示：

```text
这些是新标签建议。若要使用，请先将其加入 Tag 白名单。
```

---

## 17. UserDecision

```ts
interface UserDecisionV2 {
  acceptBlocks: Record<string, boolean>;

  acceptFrontmatter: {
    status?: boolean;
    source?: boolean;
    context?: boolean;
  };

  acceptTags: {
    add: string[]; // 只允许 selectedTags 中被用户勾选的白名单 tag
  };

  saveAsDraftOnly?: boolean;
}
```

v0.2.0 不支持：

```text
tag remove
rename
move
links
MOC
archive
delete
```

---

## 18. ApplyPlan 与安全写入

### 18.1 ApplyOperation

v0.2.0 只允许：

```ts
type ApplyOperationType =
  | "replace-refined-blocks"
  | "update-frontmatter"
  | "append-tags";
```

不包含：

```text
rename-file
move-file
write-links
write-moc
remove-tags
archive
delete
```

### 18.2 replace-refined-blocks

实现逻辑：

```text
1. Apply 前重新读取当前文件。
2. 重新解析 B 类分块。
3. 验证 B 类分块 hash 与 session 的 baseBBlockHash 一致。
4. 只使用用户勾选的 A 类分块内容组装 refined 正文。
5. 拼接当前文件中的 B 类分块原文。
6. 写入前逐字节确认 B 类分块内容未被改变。
7. 通过 ApplyPlan 写入文件。
```

### 18.3 update-frontmatter

只允许用户确认后的字段写入：

```text
status
source
context
```

`created` readonly，不写入。

未知 YAML 字段 preserve-only，不删除、不修改。

### 18.4 append-tags

只允许追加用户勾选的 `selectedTags`。

规则：

```text
如果 YAML tags 不存在，可以创建
如果 YAML tags 已存在，则 append
不覆盖已有 tags
不删除已有 tags
去重
只写入 tagWhitelist 中的 tag
不写入 newTagSuggestions
不写入 #rel/*
```

---

## 19. Conflict Detection 与 Save as Draft

### 19.1 Freshness Check

ProposalSession 创建时记录：

```text
baseFileHash
baseFrontmatterHash
baseBBlockHash
blockConfigSnapshot
```

Apply 前重新读取当前文件并比较。

### 19.2 冲突处理

如果文件变化或 B 类分块变化：

```text
阻止 apply
不提供 force apply
提供 Save as Draft / Regenerate / Manual copy / Discard
```

### 19.3 Save as Draft

草稿保存到 settings.draftFolder，默认可继续使用：

```text
80_Runtime/refine-drafts/
```

草稿内容应包含：

```text
source note path
workflow id
created time
provider/model
token usage
A 类分块 proposal
frontmatter suggestion
selectedTags
newTagSuggestions
warnings
validation result
conflict reason（如有）
```

草稿不是 refined 正式笔记，不自动修改原 note status，不进入 MOC，不触发正式 apply。

---

## 20. Settings UI 要求

### 20.1 模型连接性测试

Settings UI 新增：

```text
测试模型连接
```

行为：

```text
检查 provider 配置是否完整
检查密钥 ID 是否配置
检查 SecretStorage 是否可用
检查能否读取密钥值
发送最小测试请求
不带真实 note 内容
不创建 ProposalSession
不写入 session-cache
不进入 proposal pipeline
错误信息必须 redaction
```

反馈应区分：

```text
SecretStorage 不可用
密钥 ID 缺失
密钥读取失败
provider 连接失败
模型返回异常
连接成功
```

### 20.2 密钥 ID 文案统一

用户界面统一使用：

```text
密钥 ID
```

不再混用：

```text
Secret Reference
secret ref
key name
密钥引用
```

说明文案：

```text
密钥 ID 是保存在插件设置中的标识，用于从 Obsidian SecretStorage 读取真实 API key。真实 API key 不会写入 data.json。
```

开发者内部类型可以继续叫 `secretRef`，但用户可见文案必须统一为“密钥 ID”。

### 20.3 SecretStorage 诊断

诊断内容必须：

```text
可复制
不可编辑
脱敏
不包含真实 API key
不包含 Authorization header
不包含 secret value
```

可显示：

```text
available
hasSecretStorage
getSecretType
setSecretType
reason
当前密钥 ID 是否配置
当前密钥 ID 是否能读到值
读取值是否等于密钥 ID
读取值长度
读取值前缀/后缀（脱敏，可选）
```

### 20.4 缓存记录设置

“历史记录”统一改为：

```text
缓存记录
```

设置项：

```text
缓存记录数量上限
查看缓存记录
清除缓存记录
缓存内容位置
错误会话缓存
错误会话缓存数量上限
错误会话缓存位置
```

说明文案：

```text
缓存记录用于恢复最近 proposal 的查看状态，不是长期历史，也不是正式笔记。
缓存记录不保存 API key、Authorization header 或 provider secret。
```

### 20.5 A/B 分块配置 UI

Settings UI 应允许配置：

```text
保护一级标题
A 类分块列表
A 类分块名称
A 类分块标题层级
A 类分块 prompt
A 类分块启用/禁用
A 类分块排序
B 类分块名称
B 类分块标题层级
tag 白名单
tag prompt
prompt 可观测开关
错误会话缓存开关
```

UI 可以采用简化表单，不要求复杂拖拽编辑器，但必须能满足 v0.2.0 配置需求。

---

## 21. Secret Management 与 Redaction

### 21.1 硬规则

API key、token、Authorization header、provider secret 不得进入：

```text
data.json
日志
开发日志
ProposalSession
草稿文件
error-session-cache
错误信息
LLM 请求记录
Obsidian 正文
```

### 21.2 SecretStorage

真实 API key 只通过 Obsidian SecretStorage 保存。

插件设置只保存密钥 ID。

### 21.3 污染值防御

如果读取到：

```text
apiKey.trim() === keyId.trim()
```

则应视为密钥值疑似污染，不发送请求，并提示用户重新保存真实 API key。

### 21.4 Redaction

所有 provider error、debug snapshot、error-session-cache attempt、console log、UI diagnostics 都必须经过 redaction。

---

## 22. Token Usage

v0.2.0 保留 token usage 显示，不做价格估算，不做 tokenizer 选择 UI。

策略：

```text
provider 返回 usage → countingMode = actual
provider 不返回 usage → 最小 estimator → countingMode = estimated
估算不可用 → countingMode = unavailable
```

Review UI 和 cached session UI 都应展示 token usage 或明确显示 unavailable。

---

## 23. Internal Tool Port

v0.2.0 仍只实现内部 Tool Port，不暴露 MCP / HTTP / File Inbox。

```ts
interface RefinedLayerToolPort {
  checkEligibility(request: EligibilityRequest): Promise<EligibilityResult>;
  createProposal(request: CreateProposalRequest): Promise<ProposalSessionSummary>;
  getProposalSession(sessionId: string): Promise<ProposalSessionV2>;
  listCachedSessions(request: ListCachedSessionsRequest): Promise<ProposalSessionSummary[]>;
  requestReview(request: ReviewRequest): Promise<ReviewResult>;
  buildApplyPlan(request: BuildApplyPlanRequest): Promise<ApplyPlan>;
  applyDecision(request: ApplyDecisionRequest): Promise<ApplyResult>;
  saveAsDraft(request: SaveAsDraftRequest): Promise<DraftSaveResult>;
  testModelConnection(request: TestModelConnectionRequest): Promise<ModelConnectionTestResult>;
}
```

未来外部工具接入只能作为该 Tool Port 的 adapter，不能绕过 Core / Application / PolicyGuard / zod validation。

---

## 24. UI / 底层分离规则

### 24.1 Core 层

负责：

```text
WorkflowProfile
A/B block config validation
Heading parsing
B 类分块提取
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

### 24.2 Application 层

负责：

```text
UseCase 编排
调用 repository/provider/cache/review gate
控制 retry
决定何时写 session-cache / error-session-cache
决定何时弹通知
```

### 24.3 Adapters 层

负责：

```text
Obsidian 文件读写
Obsidian SecretStorage
Obsidian settings store
Obsidian cache folder 读写
LLM provider 调用
```

### 24.4 UI 层

负责：

```text
Settings 配置输入
Review 展示
用户勾选
复制 newTagSuggestions
复制诊断信息
选择 cached session
触发按钮事件
```

UI 不得写文件，不得生成 ApplyPlan，不得执行 tag normalization，不得承担 B 类分块保护规则。

---

## 25. 默认配置建议

### 25.1 默认 A/B 分块

默认 B 类分块：

```text
heading: 原始内容
headingLevel: 2
```

默认 A 类分块可沿用 v0.1.0 section：

```text
## 摘要
## 核心问题
## 当前结论
## 依据与推理
## 适用边界（可选）
## 后续处理（可选）
## 整理说明（可选）
```

但实现上必须作为可配置 A 类分块列表，而不是写死在 schema 里。

### 25.2 默认 tag whitelist

默认可使用现有 V0.1 标签集：

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

用户可以增删。

### 25.3 默认缓存

```text
session-cache limit = 5
error-session-cache enabled = true
error-session-cache limit = 30
```

---

## 26. 迁移策略

### 26.1 从 v0.1.0 固定 sections 迁移

旧的 fixed `refinedSections` 映射到默认 A 类分块：

```text
summary → 摘要
coreQuestion → 核心问题
currentConclusion → 当前结论
reasoning → 依据与推理
scope → 适用边界
nextSteps → 后续处理
refineNote → 整理说明
```

### 26.2 `Secret Reference` 文案迁移

内部 `secretRef` 可保留，UI 改为“密钥 ID”。

### 26.3 `historyLimit` 文案迁移

旧的 history limit 迁移为：

```text
cache.sessionCacheLimit
```

UI 文案改为“缓存记录数量上限”。

### 26.4 tagSuggestion 迁移

旧：

```ts
tagSuggestion?: { add?: string[]; remove?: string[] }
```

新：

```ts
tagSuggestion?: { selectedTags?: string[]; newTagSuggestions?: string[] }
```

v0.2.0 不保留 remove。

---

## 27. 验收标准

### 27.1 A/B 分块

```text
[ ] 用户可配置 A 类分块名称、层级、prompt、顺序、启用状态。
[ ] A 类分块不能嵌套。
[ ] 用户可配置唯一 B 类分块名称和层级。
[ ] B 类分块内部子标题被逐字保留。
[ ] 保护一级标题开启时 A/B 最小层级为 2。
[ ] 保护一级标题关闭时 A/B 最小层级可为 1。
```

### 27.2 Prompt / LLM / Zod

```text
[ ] 最终 prompt 可查看/复制。
[ ] raw LLM response 可查看/复制。
[ ] parsed JSON 可查看/复制。
[ ] zod validation result 可查看。
[ ] zod 失败最多重试 3 次。
[ ] 第 1 次成功不弹请求次数提醒。
[ ] 第 2/3 次成功弹两次提醒。
[ ] 3 次失败弹两次提醒。
```

### 27.3 Tag

```text
[ ] tagWhitelist 可动态增删。
[ ] tag prompt 可设置。
[ ] selectedTags 只能写入白名单内 tag。
[ ] selectedTags 在 UI 中可勾选应用。
[ ] selectedTags 应用到 YAML tags 时只增加、不覆盖、不删除。
[ ] newTagSuggestions 可显示、可复制、不可编辑、不可直接应用。
[ ] 支持中英文逗号、空格、换行、顿号分割。
[ ] 自动补 #。
[ ] 不做大小写归一化。
[ ] tagNormalizationApplied 为 boolean。
```

### 27.4 Cache

```text
[ ] 成功 ProposalSession 保存到 session-cache。
[ ] 失败 attempt 保存到 error-session-cache。
[ ] 第 2/3 次成功时，失败 attempt 在 error-session-cache，成功 session 在 session-cache。
[ ] 成功 attempt 不保存到 error-session-cache。
[ ] error-session-cache 默认开启。
[ ] error-session-cache 上限 30，超过自动删除最旧。
[ ] 查看 session 缓存命令可选择最近 session。
[ ] cached session UI 中 Apply 灰色，Save as Draft 可用。
```

### 27.5 Settings UI

```text
[ ] 模型连接性测试可用。
[ ] UI 统一使用“密钥 ID”。
[ ] SecretStorage 诊断可复制不可编辑。
[ ] “历史记录”文案全部改为“缓存记录”。
[ ] 缓存内容位置和错误会话缓存位置可见。
```

### 27.6 安全写入

```text
[ ] ApplyPlan 是唯一写入入口。
[ ] UI 不直接写文件。
[ ] B 类分块逐字节保留。
[ ] created readonly。
[ ] 未知 YAML 字段保留。
[ ] selectedTags 只追加白名单 tag。
[ ] newTagSuggestions 不写入 YAML。
[ ] 文件变化后不会直接 apply。
[ ] cached session 不允许直接 apply。
```

---

## 28. 测试计划

### 28.1 单元测试

```text
HeadingParser：识别 heading level、text、range。
BlockExtractor：提取 B 类分块，包含子标题。
BlockConfigValidator：禁止 A 类分块嵌套，保护一级标题规则生效。
PromptBuilder：包含 A block prompt、tag prompt、tag whitelist、schema instruction。
Zod schema：合法 proposal 通过，缺字段失败。
TagNormalizer：分割中英文逗号、空格、换行、顿号，补 #，去重，不做大小写归一化。
TagNormalizer：非白名单 selectedTags 移入 newTagSuggestions。
ProposalValidator：unknown tag 不导致正文整体失败。
ApplyPlanner：只生成 replace-refined-blocks / update-frontmatter / append-tags。
ErrorSessionCache：超过 30 删除最旧。
SessionCache：超过 limit 删除最旧。
```

### 28.2 集成测试

```text
第 1 次成功：创建 session-cache，不创建 error-session-cache，不弹请求次数提醒。
第 2 次成功：失败 attempt 进 error-session-cache，成功 session 进 session-cache，弹两次提醒。
第 3 次成功：前两次失败 attempt 进 error-session-cache，成功 session 进 session-cache，弹两次提醒。
3 次失败：三个 attempt 进 error-session-cache，不创建 session，不打开 Review UI。
Open cached session：可选择 session，进入 UI，Apply 灰色，Save as Draft 可用。
append-tags：只增加 selectedTags，不覆盖已有 tags。
```

### 28.3 手动测试

```text
模型连接性测试成功/失败路径。
SecretStorage 诊断复制。
密钥 ID 文案检查。
Prompt 可观测内容检查。
真实 LLM 返回 malformed JSON 后 error-session-cache 检查。
真实 LLM 返回非法 selectedTags 后 UI 中进入 newTagSuggestions。
B 类分块包含三级标题时 apply 后逐字保留。
保护一级标题开启/关闭两种模式。
```

---

## 29. 最终判断

v0.2.0 的目标不是把插件升级为通用 Obsidian Agent 平台，而是把 `raw → refined` 从固定模板闭环升级为可配置、可观测、可调试、可恢复的单篇文档 refined 工作流。

核心边界保持不变：

```text
单篇当前 note
用户审核
ApplyPlan 安全写入
B 类原始内容机械保留
Tag 只追加白名单内 selectedTags
LLM 输出必须经过本地校验和 normalization
UI 不承载核心规则
```

本版优先解决真实使用中的四个阻断问题：

```text
Prompt 不可见导致难以调试
固定 section 不能适配不同用户笔记结构
unknown tag 不应导致正文结果全部丢弃
失败响应需要可追踪的 error-session-cache，但不能污染可恢复 session-cache
```
