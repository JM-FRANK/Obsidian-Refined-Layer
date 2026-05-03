# Obsidian Refined Layer 插件开发日计划 v0.1.0

> 来源文档：`Obsidian Refined Layer 插件架构书 v0.1.0（Codex 执行版）`
> 计划单位：每个 Dn 约 4 小时工程量
> 执行对象：Codex / AI coding agent / 人类开发者
> 核心原则：先完成单篇文档 `raw → refined` 最小闭环，不提前实现通用 workflow 平台。

---

## 0. 执行规则

### 0.1 每日工作边界

每个 `Dn` 只完成当天范围内的任务。

不得提前实现：

```text
MCP adapter
HTTP server
File Inbox adapter
外部 proposal import
外部审核通道
多 profile 编辑器
profile 可视化配置 UI
rename / move apply
MOC 写入
关系链接写入
批量 refine
价格估算
完整 Prompt 编辑器
```

### 0.2 每日完成定义

每个 `Dn` 完成后必须满足：

```text
1. 代码能构建或至少不引入明显编译错误。
2. 当天新增能力有最小验证方式。
3. 未完成事项明确记录到开发日志 Next。
4. 不把长期预留能力提前做成实现。
```

### 0.3 开发日志要求

每完成一个 `Dn`，必须固化一条开发日志。

日志字段：

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

建议位置：

```text
docs/dev-log.md
```

---

# Phase 1：插件骨架与工程边界

目标：建立可加载、可构建、无文件写入的 Obsidian 插件骨架，并建立核心目录和内部接口边界。

---

## D1：创建 Obsidian 插件项目骨架

预计工程量：4 小时

任务：

```text
1. 创建 Obsidian 插件基础文件：manifest.json、package.json、tsconfig.json、esbuild.config.mjs、main.ts、styles.css。
2. 配置 TypeScript 构建脚本。
3. 实现插件 onload / onunload。
4. 注册命令：Refine current note。
5. 命令暂时只弹出 notice 或 console log，不读取、不写入文件。
```

验收：

```text
插件可以 build。
插件可以被 Obsidian 加载。
命令面板可看到 Refine current note。
执行命令不会修改任何文件。
```

开发日志重点：记录项目初始化方式、构建命令、插件加载方式。

---

## D2：建立目录结构与核心类型空壳

预计工程量：4 小时

任务：

```text
1. 建立 src/core、src/application、src/adapters、src/runtime、src/ui、src/settings 目录。
2. 添加 WorkflowProfile、RawRefinedProposal、ProposalSession、UserDecision、ApplyPlan、TokenUsageReport 的类型文件。
3. 添加 RefinedLayerToolPort interface。
4. 添加 PolicyGuard 空壳类。
5. main.ts 只通过 application/usecase 调用，不直接放业务逻辑。
```

验收：

```text
核心类型可以被 import。
main.ts 不直接包含 workflow 规则。
项目仍可 build。
没有新增任何文件写入逻辑。
```

开发日志重点：记录目录边界和哪些类型尚为空实现。

---

## D3：读取当前 active note 与 CheckEligibilityUseCase 空流程

预计工程量：4 小时

任务：

```text
1. 实现 ObsidianNoteRepository 的 active note 读取能力。
2. 实现 CheckEligibilityUseCase 初版。
3. Refine current note 命令调用 CheckEligibilityUseCase。
4. 当前只返回：是否存在 active markdown note、note path、note title、raw content 长度。
5. 仍然不做真实 eligibility 判断，不写文件。
```

验收：

```text
打开 Markdown note 后执行命令，可以读取当前 note path 与内容长度。
未打开 note 时给出明确提示。
非 Markdown 文件给出明确提示。
无文件写入。
```

开发日志重点：记录 Obsidian active file 获取方式和异常处理。

---

## Phase 1 验收任务

执行一次阶段验收，不新增功能。

验收清单：

```text
[ ] 插件能加载。
[ ] 命令可见。
[ ] 命令能读取 active markdown note。
[ ] main.ts 没有 workflow 业务规则。
[ ] 没有任何文件写入逻辑。
[ ] Internal Tool Port 类型存在。
[ ] PolicyGuard 类型存在。
[ ] 完成 D1-D3 开发日志。
```

---

# Phase 2：raw-refined profile、parser、validator

目标：实现 `raw-refined` profile、frontmatter / heading / protected region 解析，以及 ProposalValidator 的分层校验。

---

## D4：实现 raw-refined WorkflowProfile 与 eligibility 判断

预计工程量：4 小时

任务：

```text
1. 实现 rawRefinedProfile.ts。
2. 定义 eligibility：.md、frontmatter required、status must be raw、required heading = ## 原始内容。
3. 实现 frontmatter 读取的最小 parser。
4. CheckEligibilityUseCase 改为使用 rawRefinedProfile。
5. 输出 eligibility result，包括 missingFrontmatter、invalidStatus、missingOriginalContentHeading 等原因。
```

验收：

```text
status: raw + ## 原始内容 的 note 通过 eligibility。
缺少 frontmatter 时失败。
status 不是 raw 时失败。
缺少 ## 原始内容 时失败。
失败原因可读。
不写文件。
```

开发日志重点：记录 eligibility 的判定规则和未实现项。

---

## D5：实现 ProtectedRegionExtractor 与 hash 工具

预计工程量：4 小时

任务：

```text
1. 实现 ProtectedRegionExtractor。
2. v0.1.0 只实现 mode = from-heading-to-end。
3. 类型中预留 between-headings，但不实现。
4. 实现 baseFileHash、baseProtectedRegionHash 的 hash 工具。
5. 为 missing heading、empty protected region、multiple heading 等情况定义明确行为。
```

验收：

```text
能从 note 中提取 ## 原始内容 及其后文。
提取结果逐字保留换行和原文。
能计算 file hash 和 protected region hash。
between-headings 不被误实现。
```

开发日志重点：记录 protected region 的边界定义和异常策略。

---

## D6：实现 ProposalValidator 的 JSON 与 Schema 校验

预计工程量：4 小时

任务：

```text
1. 实现 ProposalValidator 骨架。
2. 增加 JSON 解析层：纯 JSON 解析，非纯 JSON 时尝试提取 JSON block。
3. 增加 schema 校验层：workflowProfileId、refinedSections、required fields、字段类型。
4. 校验失败返回结构化错误，不创建 ProposalSession。
5. 暂不做 policy / content 校验。
```

验收：

```text
合法 RawRefinedProposal JSON 通过 schema 校验。
非 JSON 返回解析错误。
缺少 summary/coreQuestion/currentConclusion/reasoning 时失败。
字段类型错误时失败。
校验失败不会进入 session。
```

开发日志重点：记录 JSON 提取策略和错误结构。

---

## D7：实现 ProposalValidator 的 Policy 与内容校验

预计工程量：4 小时

任务：

```text
1. 增加 frontmatter policy 校验：只允许 status/source/context，created readonly。
2. 增加 tag policy 校验：allowed-list mode，未声明标签默认禁止，#rel/* 禁止。
3. 增加 capabilities 校验：禁止 links、moc、rename、move、archive、delete。
4. 增加内容校验：proposal 不得包含 ## 原始内容 受保护区域内容。
5. 失败时给出具体错误码。
```

验收：

```text
proposal 试图修改 created 被拒绝。
proposal 新增未知 YAML 字段被拒绝。
proposal 建议未知 tag 被拒绝。
proposal 包含 #rel/* 被拒绝。
proposal 包含 link/MOC 操作被拒绝。
proposal 包含 ## 原始内容 内容被拒绝。
```

开发日志重点：记录 PolicyGuard / ProposalValidator 的职责边界。

---

## Phase 2 验收任务

验收清单：

```text
[ ] raw-refined profile 已实现。
[ ] eligibility 判断明确。
[ ] protected region 能逐字提取。
[ ] ProposalValidator 有 JSON / schema / policy / content 四层校验。
[ ] 校验失败不创建 session。
[ ] 非法 YAML、非法 tag、#rel/*、MOC/link 操作均会被拒绝。
[ ] 完成 D4-D7 开发日志。
```

---

# Phase 3：Mock Proposal、Session、Token Usage

目标：在不接真实 LLM 的情况下跑通 proposal 生成、session 暂存、token usage 显示基础数据。

---

## D8：实现 MockLlmProvider 与 CreateProposalUseCase

预计工程量：4 小时

任务：

```text
1. 实现 LlmProvider interface。
2. 实现 MockLlmProvider，返回固定 RawRefinedProposal。
3. 实现 CreateProposalUseCase：读取 note → eligibility → 构造 mock request → validator → proposal。
4. 使用 profile prompt 变量结构，但暂不接真实 prompt。
5. Refine current note 命令可以触发 mock proposal 生成。
```

验收：

```text
合法 raw note 能生成 mock proposal。
非法 note 不调用 MockLlmProvider。
mock proposal 必须经过 ProposalValidator。
校验失败不继续。
不显示 Review UI，不写文件。
```

开发日志重点：记录 CreateProposalUseCase 的输入输出。

---

## D9：实现 ProposalSessionStore 与 history limit

预计工程量：4 小时

任务：

```text
1. 实现 ProposalSessionStore。
2. 每次合法 proposal 创建 ProposalSession。
3. Session 包含 notePath、noteTitle、baseFileHash、baseProtectedRegionHash、workflowProfileId、policySnapshotId。
4. 支持 getLatestSessionForNote(notePath)。
5. 支持 listSessionsForNote(notePath)。
6. 实现 history limit，默认 5。
```

验收：

```text
生成 proposal 后能查询到 session。
不同 notePath 的 session 不相互覆盖。
超过 history limit 后旧 session 被清理。
ProposalSession 不保存 API key、Authorization header、provider secret。
```

开发日志重点：记录 session 存储位置和清理策略。

---

## D10：实现 TokenUsageReport mock 与 session 恢复命令

预计工程量：4 小时

任务：

```text
1. MockLlmProvider 返回 mock TokenUsageReport。
2. ProposalSession 保存 tokenUsage。
3. 添加命令：Reopen last proposal for current note。
4. 当前命令只读取 session 并弹 notice / console 输出，不打开 Review UI。
5. token usage unavailable / actual / estimated 类型都能被模型承载。
```

验收：

```text
mock proposal session 中包含 token usage。
当前 note 可恢复最近 session。
无 session 时提示清晰。
多个 note 的 session 查询正确。
不写文件。
```

开发日志重点：记录 token usage 字段和 session 恢复行为。

---

## Phase 3 验收任务

验收清单：

```text
[ ] 合法 raw note 能生成 mock proposal。
[ ] proposal 必须经过 validator。
[ ] ProposalSession 包含 notePath 和 hash。
[ ] 支持按 notePath 恢复最近 session。
[ ] history limit 默认 5。
[ ] token usage 可进入 session。
[ ] 完成 D8-D10 开发日志。
```

---

# Phase 4：Review UI、i18n、主题适配

目标：实现 ObsidianReviewGate 和最小 ReviewModal，支持用户选择部分应用，但暂不真正写文件。

---

## D11：实现 i18n 字符串表与 ReviewViewModel

预计工程量：4 小时

任务：

```text
1. 实现 ui/i18n/index.ts、zh-CN.ts、en.ts。
2. 定义 ReviewViewModel。
3. 将 ProposalSession 转换为 ReviewViewModel。
4. 所有 Review UI 需要的标题、按钮、警告、标签使用 i18n key。
5. 不实现复杂语言切换 UI，只从 settings.language 读取。
```

验收：

```text
ReviewViewModel 能从 session 生成。
用户可见字符串不硬编码在 ReviewModal 中。
zh-CN / en 字符串表存在。
项目仍可 build。
```

开发日志重点：记录 i18n key 命名规则。

---

## D12：实现 ReviewModal 静态预览

预计工程量：4 小时

任务：

```text
1. 实现 ObsidianReviewGate。
2. requestReview 通过 ReviewGate 打开 ReviewModal，不直接耦合 Modal。
3. ReviewModal 展示 refined 正文预览、YAML 建议、tag 建议、token usage、warnings。
4. 使用 Obsidian CSS variables。
5. 暂不实现 apply 按钮逻辑。
```

验收：

```text
生成 mock proposal 后可以打开 ReviewModal。
ReviewModal 显示 proposal 内容。
light / dark theme 下基本可读。
UI 不写文件。
requestReview 不直接依赖具体 Modal 实现。
```

开发日志重点：记录 ReviewGate 与 Modal 的分离方式。

---

## D13：实现 UserDecision 交互与 Save as Draft 按钮占位

预计工程量：4 小时

任务：

```text
1. ReviewModal 增加 checkbox / controls：acceptBody、accept status、accept source、accept context、accept tag add/remove。
2. 默认不自动接受任何修改。
3. 生成 UserDecision。
4. 增加 Save as Draft 按钮，但只调用占位回调，不写文件。
5. Apply selected changes 按钮只打印 decision，不写文件。
```

验收：

```text
用户可以部分选择 proposal 内容。
默认所有写入项未选中。
点击 Apply 只生成 UserDecision，不写文件。
点击 Save as Draft 只触发占位逻辑，不写文件。
```

开发日志重点：记录 UserDecision 与 UI 控件的映射。

---

## D14：实现最小 SettingsTab

预计工程量：4 小时

任务：

```text
1. 实现 SettingsTab。
2. 配置 language。
3. 配置 history limit。
4. 配置 draft folder。
5. 增加当前 profile prompt override textarea：system prompt、user prompt。
6. textarea 旁边以静态文本列出可用变量。
7. 不做变量自动补全、语法高亮、复杂校验、profile editor。
```

验收：

```text
SettingsTab 可打开。
language / history limit / draft folder 可保存。
prompt override 按 profileId 保存。
UI 明确提示当前覆盖的是 raw-refined profile。
不出现完整 prompt 编辑器功能。
```

开发日志重点：记录 prompt override 的存储方式和非目标功能。

---

## Phase 4 验收任务

验收清单：

```text
[ ] ReviewModal 能打开并显示 proposal。
[ ] UI 不做 validation，不写文件。
[ ] UI 文案走 i18n。
[ ] UI 使用 Obsidian CSS variables。
[ ] 用户可生成 UserDecision。
[ ] SettingsTab 只做最小配置。
[ ] prompt override 属于 profile-specific override。
[ ] 完成 D11-D14 开发日志。
```

---

# Phase 5：ApplyPlan 与安全写入

目标：实现受控写入闭环，确保 `## 原始内容` 逐字保留，frontmatter/tag 只在用户确认后修改，冲突时不覆盖。

---

## D15：实现 ApplyPlanner 与 BuildApplyPlanUseCase

预计工程量：4 小时

任务：

```text
1. 实现 ApplyPlanner。
2. 根据 UserDecision 生成 ApplyPlan。
3. ApplyOperation 只允许 replace-refined-body、update-frontmatter、update-tags。
4. 不包含 rename、move、link、moc、archive、delete。
5. BuildApplyPlanUseCase 必须经过 PolicyGuard。
```

验收：

```text
acceptBody=true 时生成 replace-refined-body operation。
accept status/source/context 时生成 update-frontmatter operation。
accept tag add/remove 时生成 update-tags operation。
未选择的内容不会进入 ApplyPlan。
非法 operation 类型无法生成。
```

开发日志重点：记录 ApplyPlan 与 UserDecision 的转换规则。

---

## D16：实现 replace-refined-body 安全组装

预计工程量：4 小时

任务：

```text
1. 从当前文件重新提取 protected region。
2. 根据 proposal sections 构建 refined 新内容。
3. 构建新正文 = refined 新内容 + 当前文件中的 protected region 原文。
4. 写入前逐字节比对，确认 protected region 内容一致。
5. 暂时只在内存中生成新正文，不执行文件写入。
```

验收：

```text
生成的新正文包含新的 refined sections。
## 原始内容 及其后文逐字节保留。
proposal 中任何受保护区域内容不会被使用。
缺少 protected region 时拒绝生成。
```

开发日志重点：记录 protected region 安全组装逻辑。

---

## D17：实现 frontmatter 与 tag 写入计划

预计工程量：4 小时

任务：

```text
1. 实现 update-frontmatter operation 的执行逻辑。
2. 只允许写入用户确认后的 status/source/context。
3. created readonly，不写入。
4. 未知 YAML preserve-only，不删除不修改。
5. 实现 update-tags operation 的执行逻辑。
6. 只允许写入 tag whitelist 内标签。
```

验收：

```text
status/source/context 未确认时不写入。
created 不会被修改。
未知 YAML 字段保留。
非法 tag 不会写入。
#rel/* 不会写入。
```

开发日志重点：记录 frontmatter/tag 写入边界。

---

## D18：实现 freshness check 与 conflict flow

预计工程量：4 小时

任务：

```text
1. 生成 ProposalSession 时已有 baseFileHash/baseProtectedRegionHash。
2. Apply 前重新读取当前文件。
3. 比较 baseFileHash / baseProtectedRegionHash。
4. 若变化，阻止 apply。
5. 返回 conflict result，并提示 Save as Draft / Regenerate / Manual copy / Discard。
6. v0.1.0 不提供 force apply。
```

验收：

```text
proposal 生成后未修改文件，可以继续 apply。
proposal 生成后修改文件，apply 被阻止。
冲突状态不会写入原文件。
force apply 不存在。
```

开发日志重点：记录 conflict 判定依据和用户选项。

---

## D19：实现 Save as Draft 与端到端 mock apply

预计工程量：4 小时

任务：

```text
1. 实现 SaveDraftUseCase。
2. 草稿保存到 settings.draftFolder，默认 80_Runtime/refine-drafts/。
3. 草稿包含 source note path、workflow id、created time、token usage、proposed sections、warnings、conflict reason。
4. 将 ReviewModal 的 Apply selected changes 接入 BuildApplyPlan + ApplyDecisionUseCase。
5. 在 mock proposal 下跑通端到端 apply。
```

验收：

```text
Save as Draft 会生成独立草稿文件。
草稿不是 refined 正式笔记，不修改原 note status。
Apply selected changes 会按 UserDecision 修改原 note。
## 原始内容 逐字节保留。
冲突时只能 Save as Draft 等选项，不会直接 apply。
```

开发日志重点：记录首次端到端写入结果和已知风险。

---

## Phase 5 验收任务

验收清单：

```text
[ ] ApplyPlan 是唯一写入入口。
[ ] UI 不直接写文件。
[ ] replace-refined-body 逐字节保留 ## 原始内容。
[ ] created readonly。
[ ] status/source/context confirm-required。
[ ] tag whitelist 生效。
[ ] 文件变化后不会直接 apply。
[ ] Save as Draft 可用。
[ ] 完成 D15-D19 开发日志。
```

---

# Phase 6：SecretStore 与真实 LLM

目标：在 mock 流程稳定后接入真实 LLM，同时保证 API key 隐私保护和 token usage 观测。

---

## D20：实现 ObsidianSecretStore 与安全设置 UI

预计工程量：4 小时

任务：

```text
1. 实现 ObsidianSecretStore。
2. SettingsTab 中添加 provider type、model、secretRef 配置。
3. API key 输入走 SecretStorage / SecretComponent。
4. SecretStorage 不可用时 provider 区域置灰并显示警告。
5. 尝试保存 API key 的绕过路径必须被拦截。
```

验收：

```text
data.json 不出现 key/apiKey/token/secret/authorization。
SecretStorage 不可用时不能保存 API key。
SecretStorage 不可用时 Refine current note 仍可用 mock-llm。
设置页提示清晰。
```

开发日志重点：记录 secret 存储与 data.json 检查结果。

---

## D21：实现 OpenAICompatibleProvider 基础调用

预计工程量：4 小时

任务：

```text
1. 实现 OpenAICompatibleProvider。
2. 从 SecretStore 获取 API key。
3. 使用 profile prompt + note content 构造 request。
4. 请求真实 LLM，要求返回 JSON proposal。
5. 响应仍必须经过 ProposalValidator。
6. 错误信息必须 redaction。
```

验收：

```text
有 API key 时可以调用真实 provider。
provider 响应不绕过 validator。
provider 错误不会泄露 API key / Authorization header。
非法响应不会创建 ProposalSession。
mock provider 仍可用。
```

开发日志重点：记录真实 provider 接入点和 redaction 策略。

---

## D22：实现 token usage actual / estimated / unavailable 流程

预计工程量：4 小时

任务：

```text
1. provider 返回 usage 时写入 TokenUsageReport，countingMode=actual。
2. provider 不返回 usage 时调用最小 tokenizer estimator。
3. estimator 不可用时 countingMode=unavailable。
4. 不做 tokenizer 选择 UI。
5. 不做价格估算。
```

验收：

```text
Review UI 能显示 actual token usage。
无 provider usage 时显示 estimated 或 unavailable。
不会因 token 估算失败阻断 proposal review。
无价格估算 UI。
无 tokenizer 选择 UI。
```

开发日志重点：记录 token usage 来源和 fallback 行为。

---

## D23：真实 LLM 端到端验证与错误路径收敛

预计工程量：4 小时

任务：

```text
1. 使用真实 provider 跑通 raw note → proposal → review → apply。
2. 测试非 JSON 响应。
3. 测试非法 YAML / tag / #rel/*。
4. 测试 API key 缺失。
5. 测试 provider error。
6. 修复本阶段发现的最小阻断问题。
```

验收：

```text
真实 LLM happy path 可完成。
非 JSON / schema error / policy error 有明确提示。
API key 缺失不崩溃。
provider error 不泄露 secret。
失败响应不进入 ProposalSession。
```

开发日志重点：记录真实 LLM 测试结果和剩余问题。

---

## Phase 6 验收任务

验收清单：

```text
[ ] API key 通过 SecretStorage 保存。
[ ] data.json 不含敏感字段。
[ ] SecretStorage 不可用时降级 mock-llm。
[ ] OpenAI-compatible provider 可调用。
[ ] provider 响应必须过 validator。
[ ] token usage 显示 actual / estimated / unavailable。
[ ] 不做价格估算。
[ ] 完成 D20-D23 开发日志。
```

---

# Phase 7：边界复查与交付整理

目标：确认 v0.1.0 没有滑向长期平台能力，补齐说明、手动测试矩阵与交付文档。

---

## D24：边界复查与反扩张检查

预计工程量：4 小时

任务：

```text
1. 检查代码中不存在 mcp/http/file-inbox/external-review/workflow-editor 目录或实现。
2. 检查 ApplyOperation 不包含 rename/move/link/moc/archive/delete。
3. 检查 UI 没有写文件逻辑。
4. 检查 workflow 规则没有写进 ReviewModal。
5. 检查 requestReview 只依赖 ReviewGate。
```

验收：

```text
长期能力只存在于文档边界，不存在实现。
核心规则只来自 rawRefinedProfile。
UI/Application/Core 依赖方向未反转。
```

开发日志重点：记录反扩张检查结果。

---

## D25：手动测试矩阵与 bug 修复

预计工程量：4 小时

任务：

```text
1. 编写手动测试矩阵。
2. 覆盖 valid raw note、missing frontmatter、status 非 raw、missing ## 原始内容、非法 tag、非法 YAML、LLM 非 JSON、文件冲突、Save as Draft。
3. 执行测试矩阵。
4. 修复最高优先级 bug。
```

验收：

```text
测试矩阵存在。
关键安全路径全部测试。
阻断性 bug 已修复或记录。
```

开发日志重点：记录测试结果和未修复问题。

---

## D26：打包、安装说明与用户最小说明

预计工程量：4 小时

任务：

```text
1. 确认 build 输出文件。
2. 写安装 / 本地加载说明。
3. 写最小使用说明：如何运行 refine、如何 review、如何 apply、如何恢复 session、如何 Save as Draft。
4. 写隐私说明：API key 存储、日志脱敏、history 不保存 secret。
```

验收：

```text
README 或 docs 中有最小安装说明。
用户能按说明加载插件。
用户能理解 mock-llm 与真实 provider 的区别。
隐私边界写清楚。
```

开发日志重点：记录交付包和说明文档位置。

---

## D27：v0.1.0 交付检查

预计工程量：4 小时

任务：

```text
1. 按架构书逐项检查实现范围。
2. 跑最后一次 build。
3. 运行最小 happy path。
4. 运行关键安全 path。
5. 整理 v0.1.0 已完成 / 未完成 / 暂缓清单。
6. 形成下一版本候选问题列表。
```

验收：

```text
v0.1.0 最小闭环可运行。
没有提前实现长期 adapter。
已知问题清单完整。
下一版本候选不混入当前交付。
```

开发日志重点：记录 v0.1.0 交付状态。

---

## Phase 7 验收任务

验收清单：

```text
[ ] 没有长期 adapter 实现。
[ ] 没有外部审核通道实现。
[ ] 没有 move/rename/link/MOC apply。
[ ] 手动测试矩阵完成。
[ ] README / 使用说明完成。
[ ] v0.1.0 happy path 可运行。
[ ] 完成 D24-D27 开发日志。
```

---

# 总体工期估算

```text
Phase 1：3 天，约 12 小时
Phase 2：4 天，约 16 小时
Phase 3：3 天，约 12 小时
Phase 4：4 天，约 16 小时
Phase 5：5 天，约 20 小时
Phase 6：4 天，约 16 小时
Phase 7：4 天，约 16 小时
```

合计：

```text
27 个 4 小时工作日
约 108 小时
```

---

# 推荐执行方式

建议每次只给 Codex 一个 `Dn`：

```text
阅读架构书和日计划。只执行 Dn，不提前实现后续阶段。完成后更新 docs/dev-log.md，并说明验证结果。
```

如果 Codex 在实现中发现架构缺口，应要求它：

```text
1. 先记录问题。
2. 给出最小修订建议。
3. 不自行扩大功能范围。
```
