# Obsidian Refined Layer 插件开发日计划 v0.2.1

> 来源文档：`docs/obsidian-refined-layer-architecture-v0.2.1-agent.md`
> 衔接状态：基于 v0.2.0 已完成并通过基本测试后的增量迭代
> 计划单位：每个 `Dn` 约 4 小时工程量
> 执行对象：Codex / Claude Code / AI coding agent / 人类开发者
> 核心原则：不重做 v0.2.0 主干，只补充分块用户语义、RefineProfile 模板层、profile 选择式 refine 命令与运行状态反馈。

---

## 0. 当前状态基线

### 0.1 v0.2.0 已完成能力

v0.2.0 已完成并通过基本测试。当前代码已具备：

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

v0.2.1 不回滚、不重写这些能力。

### 0.2 本轮保留的底层原则

```text
Core / Application / Adapters / UI / Runtime 分层
ApplyPlan 唯一写入入口
UI 不直接写文件
LLM 输出不可信
SecretStorage 保存真实 API key
data.json 不保存真实 API key
Review UI 只消费 ViewModel 并返回 UserDecision
Apply 前 freshness check
保护分块逐字保留
selectedTags 只追加白名单 tag
newTagSuggestions 不直接写入 YAML
cached session 不允许直接 apply
```

### 0.3 v0.2.1 改造范围

```text
1. 用户可见术语：A 类分块 → 生成分块，B 类分块 → 保护分块。
2. RawRefinedWorkflowSettings：从单配置升级为 activeProfileId + profiles。
3. RefineProfile：保存一套 raw-refined 模板配置。
4. refine 命令：默认使用 activeProfile，新增 with profile 手动选择入口。
5. RefineRunStatus：显示 refine 执行阶段和请求尝试次数。
```

---

## 1. 文档与日志路径约定

### 1.1 v0.2.0 文档归档

v0.2.0 已完成并通过基本测试后，应将 v0.2.0 文档作为历史基线归档到：

```text
docs/achieve/
```

建议归档路径：

```text
docs/achieve/obsidian-refined-layer-architecture-v0.2.0-agent.md
docs/achieve/obsidian-refined-layer-v0.2.0-daily-plan.md
```

如果仓库中已有同名历史文件，先检查内容差异，再决定覆盖、重命名或保留带日期后缀的副本。

### 1.2 v0.2.1 活跃文档

v0.2.1 活跃文档路径：

```text
docs/obsidian-refined-layer-architecture-v0.2.1-agent.md
docs/obsidian-refined-layer-v0.2.1-daily-plan.md
```

### 1.3 开发日志

继续使用：

```text
docs/dev-log.md
```

历史日志继续保留在：

```text
docs/achieve/dev-log-achieve.md
```

### 1.4 每日日志格式

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

```text
1. 不要每次完整读取 docs/achieve/dev-log-achieve.md。
2. 只按当前 Dn 相关关键词窗口化检索旧日志。
3. 当前活跃日志只读 docs/dev-log.md。
4. v0.2.0 文档只作为历史基线读取，不回填旧 D36-D69 计划。
```

---

## 2. Phase 17 设计约束

本阶段只改造 `raw-refined` workflow 的模板选择与运行反馈。

Profile 只作为模板配置容器，字段范围固定为：

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

以下设置继续归属插件全局层：

```text
provider
model
keyId
cache
draftFolder
tokenUsageVisible
```

Profile 解析规则：

```text
默认 refine：使用 activeProfileId
手动 refine：使用用户本次选择的 profile，不修改 activeProfileId
cached session：使用 session 中保存的 profileSnapshot 展示，不重新解析当前 settings
```

运行状态规则：

```text
状态 UI 显示当前阶段和 attemptIndex/maxAttempts
关闭状态 UI 不改变 CreateProposalUseCase 的执行
请求完成后继续进入 Review UI 或失败处理
不新增 cancelled result 类型
```

---

## 3. 每日完成定义

每个 `Dn` 完成后必须满足：

```text
1. 代码能 typecheck。
2. 相关测试通过，或明确说明为什么只能手动验证。
3. 不破坏 v0.2.0 mock provider happy path。
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

# Phase 17：v0.2.1 Profile 与运行状态增强

目标：在 v0.2.0 已完成的 raw-refined 工作流基础上，补充分块用户语义、RefineProfile 模板层、profile 选择式 refine 命令，以及 refine 执行期间的运行状态反馈。

---

## D70：v0.2.1 文档同步、归档与术语修订

预计工程量：4 小时

任务：

```text
1. 将 v0.2.0 架构书归档到 docs/achieve/。
2. 将 v0.2.0 日计划归档到 docs/achieve/。
3. 新增 v0.2.1 架构书，不覆盖 v0.2.0 历史文档。
4. 新增 v0.2.1 日计划，不覆盖 v0.2.0 历史文档。
5. 在架构书中确认 A 类分块用户语义为“生成分块”。
6. 在架构书中确认 B 类分块用户语义为“保护分块”。
7. 保留内部类型名 ABlockConfig / BBlockConfig / ABlockProposal。
8. 更新 README / AGENTS.md 中的当前开发入口到 v0.2.1 文档。
9. 更新 docs/dev-log.md，记录 v0.2.1 起始状态。
```

建议范围：

```text
docs/achieve/obsidian-refined-layer-architecture-v0.2.0-agent.md
docs/achieve/obsidian-refined-layer-v0.2.0-daily-plan.md
docs/obsidian-refined-layer-architecture-v0.2.1-agent.md
docs/obsidian-refined-layer-v0.2.1-daily-plan.md
README.md
AGENTS.md
docs/dev-log.md
```

验收：

```text
v0.2.0 文档已进入 docs/achieve/。
v0.2.1 文档存在。
用户可见术语使用“生成分块 / 保护分块”。
内部类型命名不被强制重命名。
AGENTS.md 指向 v0.2.1 入口。
docs/dev-log.md 记录 v0.2.1 起始状态。
```

开发日志重点：记录归档路径、活跃文档路径，以及术语变化只是用户语义澄清，不是 A/B block 模型重写。

---

## D71：RefineProfile 类型、默认 profile 与 settings 迁移

预计工程量：4 小时

任务：

```text
1. 新增 RefineProfile 类型。
2. 将 RawRefinedWorkflowSettings 改为 activeProfileId + profiles。
3. 将现有 rawRefined 单配置迁移为 default RefineProfile。
4. RefineProfile 只包含 protectH1、生成分块、保护分块、tagWhitelist、tagPrompt、promptObservationEnabled。
5. provider/model/keyId/cache/draftFolder/tokenUsageVisible 继续归属插件全局设置。
6. settings sanitize 允许 profiles，但继续阻断 API key / token / Authorization / secret。
7. 保留旧 data.json 自动迁移能力。
```

建议范围：

```text
src/core/profile/RefineProfile.ts
src/core/profile/BlockConfig.ts
src/settings/PluginSettings.ts
src/adapters/obsidian/ObsidianSettingsStore.ts
tests/settings/PluginSettings.test.ts
tests/adapters/obsidian/ObsidianSettingsStore.test.ts
```

验收：

```text
旧 v0.2.0 data.json 可加载。
旧 rawRefined 配置被迁移为 default profile。
activeProfileId 指向 default profile。
settings 保存后不包含真实 API key。
provider/model/key/cache 不进入 RefineProfile。
```

开发日志重点：记录 WorkflowProfile 与 RefineProfile 的边界。

---

## D72：Settings UI 接入 RefineProfile 管理

预计工程量：4 小时

任务：

```text
1. Settings UI 增加 RefineProfile 列表。
2. 支持选择 activeProfile。
3. 支持新增 profile。
4. 支持复制 profile。
5. 支持删除 profile，但不能删除最后一个 profile。
6. 编辑 profile 内的生成分块、保护分块、tagWhitelist、tagPrompt、protectH1。
7. 保存前复用现有 BlockConfigValidator / TagNormalizer。
8. UI 不自行实现核心校验，只展示 core 返回的错误。
```

建议范围：

```text
src/ui/settings/SettingsTab.ts
src/ui/i18n/*.ts
styles.css
tests/ui/settings/SettingsTab.test.ts 或手动测试记录
```

验收：

```text
用户可设置默认 activeProfile。
用户可复制 default profile。
不能删除最后一个 profile。
删除 activeProfile 后必须重新指定 activeProfile。
配置错误不会写入 settings。
UI 文案使用生成分块 / 保护分块。
```

开发日志重点：记录 Profile UI 是模板配置入口，不是 workflow 平台。

---

## D73：refine 命令接入 activeProfile 与 profile 选择器

预计工程量：4 小时

任务：

```text
1. 默认 Refine current note 使用 activeProfileId。
2. CheckEligibilityUseCase 接收 resolved profile 或 profileSnapshot。
3. CreateProposalUseCase 接收 resolved profile 或 profileSnapshot。
4. 新增命令 Refine current note with profile...
5. 实现 RefineProfilePickerModal。
6. 手动选择 profile 只影响本次 refine，不修改 activeProfileId。
7. ProposalSession 保存 profileSnapshot。
8. ReviewViewModel 显示本次使用的 profileName。
```

建议范围：

```text
src/main.ts
src/application/CheckEligibilityUseCase.ts
src/application/CreateProposalUseCase.ts
src/ui/refine/RefineProfilePickerModal.ts
src/ui/review/ReviewViewModel.ts
src/runtime/ProposalSession.ts
tests/application/CreateProposalUseCase.test.ts
tests/ui/review/ReviewViewModel.test.ts
```

验收：

```text
默认 refine 使用 activeProfile。
with profile 命令可选择 profile。
手动选择 profile 不改变 settings.activeProfileId。
session 中保存 profileSnapshot。
Review UI 能显示 profileName。
```

开发日志重点：记录默认 profile 与本次选择 profile 的差异。

---

## D74：RefineRunStatus 运行状态反馈

预计工程量：4 小时

任务：

```text
1. 新增 RefineRunStatus / RefineRunStage 类型。
2. CreateProposalUseCase 或上层 command runner 在关键阶段发出状态事件。
3. UI 显示当前 refine 阶段。
4. 至少覆盖 eligibility、prompt build、model request、parse、zod validation、normalization、session save、review open、failed。
5. model request 阶段显示 attemptIndex / maxAttempts，例如 第 N/3 次。
6. 状态 UI 与请求生命周期解耦：UI close 只销毁显示层。
7. CreateProposalUseCase 继续按 retry / success / failure 逻辑完成。
8. 不新增 cancelled result 类型。
9. 状态文本不包含 API key / Authorization / provider secret。
```

建议范围：

```text
src/application/RefineRunStatus.ts
src/application/CreateProposalUseCase.ts
src/main.ts
src/ui/refine/RefineRunStatusModal.ts
src/ui/i18n/*.ts
styles.css
tests/application/CreateProposalUseCase.status.test.ts
```

验收：

```text
执行 refine 后立即出现运行状态。
请求模型时显示第 N/3 次。
zod retry 时状态能更新。
成功后关闭状态 UI 并打开 Review UI。
失败后显示失败状态和既有错误提示。
关闭状态 UI 不会中断请求。
没有新增 cancelled result 类型。
```

开发日志重点：记录“运行状态可见”与“请求生命周期”的边界。

---

## D75：v0.2.1 Session / Draft / Cached Session 回归

预计工程量：4 小时

任务：

```text
1. SaveDraftUseCase 输出 profileName / profileId。
2. cached session picker 显示 profileName。
3. cached session review 显示 profileName。
4. 确认 cached session 仍不能 Apply。
5. 确认 profileSnapshot 不包含 provider secret / API key / Authorization。
6. 回归 selectedTags append、newTagSuggestions 不写入、保护分块逐字保留。
```

建议范围：

```text
src/application/SaveDraftUseCase.ts
src/ui/review/CachedSessionPickerModal.ts
src/ui/review/ReviewViewModel.ts
tests/application/SaveDraftUseCase.test.ts
tests/ui/review/ReviewViewModel.test.ts
```

验收：

```text
草稿包含本次使用的 profile 信息。
cached session 能显示 profile 信息。
cached session Apply 仍 disabled。
profileSnapshot 通过 secret scan。
v0.2.0 核心安全写入行为不回退。
```

开发日志重点：记录 profile 信息进入可见审查链路，但不进入 provider/key/cache 配置。

---

## D76：v0.2.1 端到端验证与文档更新

预计工程量：4 小时

任务：

```text
1. mock provider 跑通默认 activeProfile refine。
2. mock provider 跑通 with profile refine。
3. 验证运行状态 UI。
4. 验证旧 settings 自动迁移。
5. 验证 profile 管理 UI。
6. 更新 README 的 v0.2.1 使用说明。
7. 更新 TEST-MATRIX.md 或 docs/test-matrix-v0.2.1.md。
8. 输出 v0.2.1 delivery checklist。
```

验收：

```text
旧 v0.2.0 配置可迁移。
默认 refine 可用。
with profile refine 可用。
运行状态可见。
没有新增 cancelled result 类型。
README 能解释生成分块 / 保护分块 / RefineProfile。
typecheck/test/build 通过。
```

开发日志重点：记录 v0.2.1 已完成 / 暂缓 / 已知问题 / v0.2.2 候选。

---

## Phase 17 验收任务

```text
[ ] v0.2.0 文档已归档到 docs/achieve/。
[ ] v0.2.1 架构书与日计划成为活跃文档。
[ ] 用户可见术语切换为生成分块 / 保护分块。
[ ] RefineProfile 类型存在。
[ ] RawRefinedWorkflowSettings 使用 activeProfileId + profiles。
[ ] 旧 v0.2.0 settings 可迁移。
[ ] Settings UI 可管理 profiles。
[ ] 默认 refine 使用 activeProfile。
[ ] with profile refine 可手动选择 profile。
[ ] ProposalSession / Draft / Cached Session 显示 profile 信息。
[ ] RefineRunStatus 可显示运行阶段和第 N/3 次请求。
[ ] 关闭状态 UI 不影响请求完成。
[ ] v0.2.0 安全写入与 cache 行为不回退。
```

---

## 总体工期估算

```text
Phase 17：7 天，约 28 小时
```

---

## 推荐执行方式

每次只给 agent 一个 `Dn`，例如：

```text
阅读 v0.2.1 架构书、v0.2.1 日计划、docs/dev-log.md，必要时窗口化检索 docs/achieve/。只执行 Dn，不提前实现后续任务。完成后运行 typecheck/test/build，并更新 docs/dev-log.md。
```

如果 agent 在实现中发现架构缺口，应要求它：

```text
1. 先记录问题。
2. 给出最小修订建议。
3. 不自行扩大功能范围。
4. 不直接跨 Dn 实现后续任务。
```
