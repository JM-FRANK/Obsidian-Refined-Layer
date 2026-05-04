# Fix Feature Tasks：Phase 8 v0.1.0 交付前缺口修复

> 状态：待执行
> 发现日期：2026-05-04
> 当前进度基线：Phase 7 验收已完成；D28 文档整理与修复任务规划已完成
> 关联文档：`docs/dev-log.md`、`docs/Obsidian Refined Layer 插件架构书 v0.1.0 Codex执行版.md`、`docs/Obsidian Refined Layer 插件开发日计划 v0.1.0.md`
> 任务性质：v0.1.0 正式交付前缺口修复，不回插到 Phase 5 / Phase 7

---

## 0. 当前背景

Phase 7 验收已经完成。随后已完成一次文档整理任务：将散落在根目录的文档统一移动到 `docs/` 目录，并修正相关 Markdown 路径引用。

因此，后续缺口修复不再使用 `D19.x` 或 `Phase 5.5` 这类回插编号，而是作为主线后续任务继续编号。

当前任务编号采用：

```text
D28：文档整理与修复任务规划（已完成）
D29：ProposalSessionStore 磁盘持久化
D30：Session 恢复预览与冲突处理
D31：保护 H1 / 文件标题，修正 replace-refined-body 边界
D32：ReviewModal refined sections 可编辑回填（可选，体验增强）
```

本文件记录 D28之后的 的执行边界、验收标准和开发日志要求。

---

## 1. Phase 8 定位

### 1.1 阶段名称

```text
Phase 8：v0.1.0 交付前缺口修复
```

### 1.2 阶段目标

补齐 Phase 7 后发现的关键缺口，使 v0.1.0 在正式交付前满足以下要求：

```text
1. ProposalSession 不因 Obsidian 重启而丢失。
2. 用户可以查看并选择最近的 session 继续处理。
3. 文件已变化时，恢复 session 不得绕过 freshness check 覆盖原文件。
4. 草稿、proposal 或 apply 流程不得覆盖文件标题 / H1。
5. 可选增强：允许用户在 ReviewModal 中编辑 refined sections 后再 apply。
```

### 1.3 非目标

Phase 8 不应扩大为新平台能力。

不得实现：

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
session browser 全局管理器
跨笔记 session 合并
自动修复 vault 内容
```

---

## 2. D28：文档整理与修复任务规划（已完成）

### Current status

已完成全仓文档整理：将 6 个散落在根目录的文档统一移动到 `docs/` 目录，使根目录保持四类核心文件：

```text
README
构建配置
源码
测试 vault
```

同时检查并修正所有 `.md` 文件之间的交叉路径引用，确保：

```text
docs/ 内部文档使用相对路径
README 使用 docs/ 前缀路径
```

此外新增 `docs/fix-feature-tasks.md`，记录 D9 日计划分解遗漏导致的 session 持久化缺失问题及其修复方案。

### Active summary

```text
Date: 2026-05-04
Scope: 文档整理 / docs/ 全量 .md、README.md 路径引用
Reason: 根目录文档散落不便管理，agreed 统一到 docs/
Change: 移动 6 个文档到 docs/；修正 dev-log.md、日计划、README.md、fix-feature-tasks.md 中路径引用；新增 fix-feature-tasks.md
Verification: npm run typecheck、npm test、npm run build 成功；grep 验证全量 .md 无残留错误引用
Next: 执行 D29：按 docs/fix-feature-tasks.md 实现 ProposalSessionStore 磁盘持久化
```

---

## 3. D29：ProposalSessionStore 磁盘持久化

### 3.1 目标

补齐 `ProposalSessionStore` 的落盘能力，使 proposal session 在插件重载或 Obsidian 重启后仍可恢复。

当前缺口：

```text
ProposalSessionStore 当前为纯内存实现。
插件重载或 Obsidian 重启后所有 session 丢失。
Reopen last proposal for current note 在重启后无法恢复之前的 proposal。
```

D29 只做数据层持久化，不做用户恢复选择 UI。

### 3.2 执行范围

```text
只做内部 session-cache 持久化。
不做 SessionPickerModal。
不做恢复选择 UI。
不做 Editable Review Body。
不改 replace-refined-body 边界。
不改真实 LLM provider。
不写 vault 正文区。
```

### 3.3 存储策略

固定采用独立文件策略。

```text
存储目录：插件私有目录下的 session-cache/
存储文件：session-cache/sessions.v1.json
```

要求：

```text
1. 不混入 settings data.json。
2. 不写入 vault 普通笔记目录。
3. 不写入 80_Runtime/refine-drafts/。
4. 不生成用户可见 Markdown 草稿。
5. Save as Draft 仍然是独立的用户可见草稿机制，不与 ProposalSession persistence 混用。
```

建议存储结构：

```json
{
  "version": 1,
  "updatedAt": "2026-05-04T00:00:00.000Z",
  "sessionsByNotePath": {
    "path/to/note.md": []
  }
}
```

### 3.4 新增接口

新增 `SessionPersistenceStore` interface。

建议位置：

```text
src/runtime/SessionPersistenceStore.ts
```

接口：

```ts
interface SessionPersistenceStore {
  saveAll(sessionsByPath: Map<string, ProposalSession[]>): Promise<void>;
  loadAll(): Promise<Map<string, ProposalSession[]>>;
}
```

### 3.5 新增 Adapter

新增 `ObsidianSessionStore`。

建议位置：

```text
src/adapters/obsidian/ObsidianSessionStore.ts
```

职责：

```text
1. 管理 plugin 私有目录下的 session-cache/sessions.v1.json。
2. 将 sessionsByNotePath 序列化为 JSON。
3. 从 JSON 反序列化恢复 Map<string, ProposalSession[]>。
4. 损坏文件不阻断插件启动。
5. 首次使用无文件时返回空 Map。
6. 写入前执行白名单序列化与 secret scan。
```

### 3.6 白名单序列化

禁止直接：

```ts
JSON.stringify(session)
```

必须先从 `ProposalSession` 投影为 `PersistedProposalSession`。

建议类型：

```ts
interface PersistedProposalSession {
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

只允许上述字段进入磁盘。

### 3.7 Secret scan

白名单序列化后仍需执行 secret scan。

禁止持久化字段名或内容包含明显敏感信息，例如：

```text
apiKey
key
secret
authorization
authHeader
bearer
credential
x-api-key
rawRequest
rawResponse
providerRawResponse
```

注意：不要误伤 token usage 的合法字段：

```text
inputTokens
outputTokens
totalTokens
countingMode
```

### 3.8 ProposalSessionStore 改造

`ProposalSessionStore` 构造函数增加可选 persistence：

```ts
constructor(
  historyLimit: number = 5,
  persistence?: SessionPersistenceStore
)
```

以下动作后必须自动持久化：

```text
save / create session
update decision
mark reviewing
mark applied
mark saved_as_draft
mark conflicted
mark discarded
setHistoryLimit 后触发裁剪
```

### 3.9 onload 恢复

`main.ts` onload 中初始化：

```ts
this.sessionStore = new ProposalSessionStore(
  this.settings.historyLimit,
  new ObsidianSessionStore(this)
);
await this.sessionStore.restoreFromDisk();
```

恢复流程必须：

```text
1. safe parse。
2. version check。
3. 丢弃无效 session。
4. 按 notePath 分组。
5. 按 updatedAt 或 createdAt 排序。
6. 应用 historyLimit。
7. 将清理后的结果重新持久化。
```

无效 session 包括：

```text
notePath 为空
sessions 不是数组
createdAt / updatedAt 缺失
workflowProfileId 不是 raw-refined
proposal schema 不完整
status 不在允许值内
包含敏感字段
```

### 3.10 测试

新增或补充测试：

```text
1. 持久化 round-trip：save → reload → restore → query 正确。
2. historyLimit 裁剪在持久化后生效。
3. 损坏 sessions.v1.json 时不阻断插件加载。
4. 无 sessions.v1.json 时正常启动。
5. 多 notePath session 不混淆。
6. 状态更新后自动持久化。
7. 白名单序列化：未知字段不写入磁盘。
8. 敏感字段测试：apiKey / authorization / secret / rawResponse 被拒绝或剔除。
9. data.json 中无 session 内容。
```

### 3.11 验收标准

```text
[ ] 生成 proposal 后重启 Obsidian，session 仍存在。
[ ] Reopen last proposal for current note 重启后可恢复 latest session。
[ ] 多 notePath session 不混淆。
[ ] 超过 historyLimit 的旧 session 被裁剪。
[ ] session-cache/sessions.v1.json 存在且结构可读。
[ ] data.json 中无 session 内容。
[ ] 持久化内容不包含 key / apiKey / authorization / secret / raw provider response。
[ ] 损坏 sessions.v1.json 不阻断插件启动。
[ ] 无 sessions.v1.json 时插件正常启动。
[ ] npm run typecheck 通过。
[ ] npm test 通过。
[ ] npm run build 通过。
```

### 3.12 开发日志 Next

D29 完成后，`docs/dev-log.md` 的 Next 应写：

```text
Next: 执行 D30：实现 Session 恢复预览与冲突处理，不只恢复 latest session。
```

---

## 4. D30：Session 恢复预览与冲突处理

### 4.1 目标

补齐用户恢复流程：用户可以查看当前 note 最近多个 session，选择其中一个继续 review；如果原文件已变化，则不能覆盖原文件，只能转入安全处理路径。

D29 解决的是“数据是否还在”。

D30 解决的是“用户如何查看、选择、处理恢复出来的 session”。

### 4.2 执行范围

```text
做 session 恢复交互。
做当前 note 的最近 session 列表。
做恢复前 freshness 状态展示。
做冲突时 Save as Draft / Manual copy / Regenerate / Discard。
不做全局 session browser。
不做跨笔记 session 合并。
不做 Editable Review Body。
不修 H1 替换边界。
不允许绕过 freshness check。
```

### 4.3 术语约束

UI 和代码中应避免使用“merge”表示恢复。

推荐术语：

```text
Continue review
Apply selected changes
Save as Draft
Manual copy
Regenerate
Discard
```

如果必须使用 merge，则必须限定含义：

```text
选择某个 session 继续进入正常 ApplyPlan 流程，不是多个 session 合并，也不是绕过 freshness check 覆盖原文件。
```

### 4.4 新增 UseCase

建议新增：

```text
src/application/ListRecoverableSessionsUseCase.ts
src/application/RecoverProposalSessionUseCase.ts
```

职责：

```text
ListRecoverableSessionsUseCase:
- 根据当前 active note path 查询最近 historyLimit 个 session。
- 返回 session summary、status、token usage、warnings、summary/currentConclusion 摘要。
- 计算或附带 freshness 状态。

RecoverProposalSessionUseCase:
- 根据用户选择的 sessionId 恢复 session。
- 若文件未变化，允许打开 ReviewGate。
- 若文件已变化，禁止 apply，并进入 conflict options。
```

### 4.5 SessionPickerModal

新增 `SessionPickerModal` 或等价最小 UI。

建议位置：

```text
src/ui/review/SessionPickerModal.ts
```

展示当前 note 最近 `historyLimit` 个 session。

每个 session 至少展示：

```text
createdAt / updatedAt
status
workflowProfileId
token usage
warnings
summary
currentConclusion
freshness 状态
```

用户操作：

```text
Continue review
Save as Draft
Manual copy
Regenerate
Discard
Cancel
```

### 4.6 Reopen 命令改造

当前命令：

```text
Reopen last proposal for current note
```

应升级为：

```text
打开当前 note 的 recoverable sessions 列表。
如果只有一个可恢复 session，可以直接打开详情或仍显示列表。
如果没有 session，给出明确提示。
```

### 4.7 Freshness 与冲突处理

继续 review / apply 前必须重新读取当前文件并比较：

```text
baseFileHash
baseFrontmatterHash
baseProtectedRegionHash
```

若文件未变化：

```text
允许进入 ReviewGate。
后续仍走 UserDecision → ApplyPlan → ApplyDecisionUseCase。
```

若文件已变化：

```text
禁止 Apply selected changes。
禁止自动覆盖。
禁止 force apply。
允许 Save as Draft。
允许 Manual copy review。
允许 Regenerate。
允许 Discard。
```

Save as Draft 必须写入：

```text
source note path
workflow id
created time
token usage
proposed sections
warnings
conflict reason
```

### 4.8 Session 状态持久化

以下操作必须更新 session status 并持久化：

```text
Continue review → reviewing
Save as Draft → saved_as_draft
Discard → discarded
Conflict detected → conflicted
Apply success → applied
```

`discarded` session 不应作为默认 latest review 入口，但可以在历史列表中显示。

### 4.9 测试

新增或补充测试：

```text
1. 当前 note 可列出多个 recoverable sessions。
2. 不同 notePath session 不混淆。
3. 用户选择某个 session 后能打开 ReviewGate。
4. 文件未变化时可继续 ApplyPlan 流程。
5. 文件变化时 apply 被阻止。
6. 文件变化时 Save as Draft 可用。
7. Save as Draft 包含 conflict reason。
8. Discard 后 status 持久化。
9. discarded session 不作为默认 latest。
10. 重启后仍能列出 recoverable sessions。
```

### 4.10 验收标准

```text
[ ] 当前 note 可查看最近多个 recoverable sessions。
[ ] 用户可选择其中一个打开 ReviewModal。
[ ] 被选择 session 的 proposal / token usage / warnings 正确显示。
[ ] 文件未变化时，可继续正常 Apply selected changes。
[ ] 文件变化时，Apply 被阻止。
[ ] 文件变化时，Save as Draft 可用。
[ ] 草稿包含 source note path、workflow id、token usage、proposed sections、warnings、conflict reason。
[ ] Discard 后 session 状态持久化。
[ ] 重启后仍能查看 recoverable sessions。
[ ] discarded session 不作为默认 latest review 入口。
[ ] npm run typecheck 通过。
[ ] npm test 通过。
[ ] npm run build 通过。
```

### 4.11 开发日志 Next

D30 完成后，`docs/dev-log.md` 的 Next 应写：

```text
Next: 执行 D31：保护 H1 / 文件标题，修正 replace-refined-body 边界，避免草稿或 proposal 覆盖笔记身份区。
```

---

## 5. D31：保护 H1 / 文件标题，修正 replace-refined-body 边界

### 5.1 目标

修复草稿覆盖正文或 `replace-refined-body` 时把一级标题 / 文件标题一并覆盖的数据破坏风险。

### 5.2 问题描述

当前危险行为是将 refined body 理解为：

```text
## 原始内容 之前的全部正文
```

如果原笔记结构为：

```md
---
status: raw
created: 2026-05-04
source:
  - self
context: []
---

# 文件标题

## 摘要

...

## 原始内容

...
```

那么 apply 或草稿覆盖可能把 `# 文件标题` 一并覆盖。

这不允许。

### 5.3 原则

在 v0.1.0 中：

```text
文件名 / H1 属于笔记身份区。
refined proposal 不得修改笔记身份区。
草稿 apply 不得修改笔记身份区。
edited refined sections 不得修改笔记身份区。
v0.1.0 不支持 rename / move / title apply。
```

### 5.4 执行范围

```text
只修正文替换边界。
不做 Editable Review Body。
不做 rename / move / title apply。
不允许 draft Markdown 全文覆盖原 note。
不改变 frontmatter 写入策略。
不改变 protected region preserve 规则。
```

### 5.5 DocumentIdentityRegion

定义 `DocumentIdentityRegion`。

包含：

```text
1. frontmatter。
2. frontmatter 后、第一个 allowed refined H2 section 前的可选 H1。
3. 文件名本身只读，不参与写入。
```

允许保留的 H1 示例：

```md
# 文件标题
```

### 5.6 正确替换边界

错误边界：

```text
replaceable region = ## 原始内容 之前的全部正文
```

正确边界：

```text
frontmatter
+ 原 H1 / title block
+ replaceable refined sections region
+ ## 原始内容 及其后文
```

其中：

```text
replaceable refined sections region =
第一个 allowed refined H2 section 起点
到 ## 原始内容 起点之前
```

allowed refined H2 sections：

```text
## 摘要
## 核心问题
## 当前结论
## 依据与推理
## 适用边界
## 后续处理
## 整理说明
```

如果原文件没有 refined section，但有 H1：

```text
在 H1 后、## 原始内容 前插入 refined sections。
```

如果原文件没有 H1：

```text
不自动新增 H1。
```

### 5.7 草稿 apply 约束

草稿不能作为完整 Markdown 文件直接覆盖原 note。

草稿只能提供：

```text
proposedSections
editedRefinedSections
```

然后仍然走：

```text
sections → render refined sections → ApplyPlan → freshness check → replace-refined-body
```

草稿文件中的以下内容不得整块写入原 note：

```text
草稿 metadata
草稿 preview
草稿标题
草稿说明文字
conflict reason 文本
```

### 5.8 内容策略

禁止 proposal / edited body / draft sections 包含 H1。

需要检查：

```text
proposal.refinedSections
decision.editedRefinedSections
draft proposedSections
draft editedRefinedSections
```

禁止内容：

```md
# 一级标题
```

建议错误码：

```text
proposal_contains_h1_heading
edited_body_contains_h1_heading
draft_contains_h1_heading
```

发现 H1 时应拒绝 apply，不静默剥离。

### 5.9 任务

```text
1. 定义 DocumentIdentityRegion 类型或解析结果。
2. 修改 replace-refined-body。
3. 替换范围限定为 allowed refined H2 sections 到 ## 原始内容 前。
4. 保留 frontmatter。
5. 保留原 H1 / title block。
6. 保持文件名只读。
7. 原文件没有 refined section 但有 H1 时，在 H1 后插入 refined sections。
8. 原文件没有 H1 时，不自动新增 H1。
9. proposal.refinedSections 不得包含 H1。
10. editedRefinedSections 不得包含 H1。
11. draft proposedSections / editedRefinedSections 不得包含 H1。
12. 草稿 apply 不允许整份 Markdown 覆盖原 note。
13. 草稿只能读取 sections，再走 ApplyPlan。
14. 增加错误码。
15. 保持 frontmatter 只由 update-frontmatter 受控修改。
16. 保持 ## 原始内容 及其后文逐字节保留。
17. 保持文件变化后触发 conflict flow。
```

### 5.10 测试

新增或补充测试：

```text
1. 原 note 有 # 标题时，Apply 后标题逐字保留。
2. 原 note 无 H1 时，Apply 不自动新增 H1。
3. proposal 中包含 # 一级标题时被拒绝。
4. draft proposedSections 中包含 # 一级标题时被拒绝。
5. editedRefinedSections 中包含 # 一级标题时被拒绝。
6. ## 原始内容 及其后文逐字节保留。
7. frontmatter 仍只通过 update-frontmatter 修改。
8. 文件名不会被修改。
9. 草稿 metadata / preview / title 不会整块写入原 note。
10. 文件变化后仍触发 conflict flow。
11. 原 note 没有 refined sections 但有 H1 时，refined sections 插入到 H1 后。
12. 原 note 没有 H1 但有 ## 原始内容 时，refined sections 插入到 ## 原始内容 前。
```

### 5.11 验收标准

```text
[ ] 原 note 有 # 标题时，Apply 后标题逐字保留。
[ ] 原 note 无 H1 时，Apply 不自动新增 H1。
[ ] proposal 中包含 # 一级标题时被拒绝。
[ ] draft proposedSections 中包含 # 一级标题时被拒绝。
[ ] editedRefinedSections 中包含 # 一级标题时被拒绝。
[ ] ## 原始内容 及其后文逐字节保留。
[ ] frontmatter 仍只通过 update-frontmatter 修改。
[ ] 文件名不会被修改。
[ ] 草稿 metadata / preview / title 不会整块写入原 note。
[ ] 文件变化后仍触发 conflict flow。
[ ] npm run typecheck 通过。
[ ] npm test 通过。
[ ] npm run build 通过。
```

### 5.12 开发日志 Next

D31 完成后，`docs/dev-log.md` 的 Next 应写：

```text
Next: 视交付节奏决定是否执行 D32：ReviewModal refined sections 可编辑回填；若暂缓，则进入 v0.1.0 交付复测。
```

## 7. 推荐执行顺序

必须优先：

```text
D29 → D30 → D31
```

理由：

```text
D29 先做数据层。
没有持久化，恢复 UI 没有可靠数据来源。

D30 再做恢复交互。
解决用户如何选择历史 session，以及冲突时如何安全处理。

D31 再修写入边界。
D30 会让更多历史 proposal / draft 重新进入 apply 流程，必须堵住 H1 被覆盖的数据破坏风险。
```

---

## 8. 每个 Dn 的开发日志要求

每完成一个 Dn，必须更新：

```text
docs/dev-log.md
```

日志格式保持现有规范：

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

每个 Dn 的 Verification 至少包含：

```text
npm run typecheck
npm test
npm run build
```

如果某项无法执行，必须在 dev-log 中说明原因。

---

## 9. 交付前复测建议

D29-D31 完成后，建议执行一次 v0.1.0 交付前复测：

```text
1. valid raw note → proposal → review → apply。
2. proposal 生成后重启 Obsidian → recover session → apply。
3. proposal 生成后修改原 note → recover session → apply 被阻止。
4. conflict session → Save as Draft。
5. 原 note 有 H1 → apply 后 H1 保留。
6. proposal / draft / edited body 含 H1 → apply 被拒绝。
7. ## 原始内容 逐字节保留。
8. data.json 不含 session。
9. session-cache/sessions.v1.json 不含 secret。
10. README / docs 使用说明是否需要更新。
```

