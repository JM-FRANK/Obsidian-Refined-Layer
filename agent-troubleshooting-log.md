# Agent Troubleshooting Log

## D40.1 — CRLF heading 解析缺陷

### 问题
HeadingParser 对 CRLF 换行（`\r\n`）的 Markdown 输入返回 0 个 heading，导致 BlockExtractor 返回 `missing-heading` 错误。LF 换行（`\n`）的相同输入完全正常。

### 根因
HeadingParser.parse() 按 `\n` 切分行，CRLF 文件中切出的行字符串末尾包含 `\r`。`parseAtxHeading` 的正则 `/^(#{1,6})\s+(.+?)(?:\s+#+\s*)?$/` 在 JavaScript 中 `$` 无 `m` 标志时仅匹配字符串最末尾位置。非贪婪 `(.+?)` 无法稳定匹配带行尾 `\r` 的 heading 行。

### 排查过程
1. 在 BlockExtractor CRLF 测试中注入 `throw new Error(result.error.code)` 确认 `missing-heading` 错误码
2. 直接在测试中调用 `HeadingParser.parse()` 发现返回 `headings: []`
3. 隔离到 `parseAtxHeading()` 内部正则，直接对 `"# Title\r"` 执行正则返回 `null`
4. 对比去掉 `\r` 后同一正则对 `"# Title"` 正常匹配

### 解决方案
在 `parseAtxHeading()` 入口规范化行尾：`const normalizedLine = line.endsWith("\r") ? line.slice(0, -1) : line;`

只移除单个 `\r`，不 trim 整行，不改变 heading text 的既有 trim 行为。charStart/charEnd 偏移量由 parse() 循环基于原始 Markdown 字符位置计算后传入，不受影响。

### 预防措施
- 涉及行解析的正则必须考虑 CRLF 兼容性
- Windows 平台测试应包含 CRLF 输入用例
- HeadingParser 测试集增加 5 个 CRLF 相关用例

---

## D42 — 测试侧问题合集

### 问题 1: TS6133 未使用导入

**现象**: `DEFAULT_B_BLOCK` 在 `MarkdownAssembler.test.ts` 中导入但未使用

**解决方案**: 删除未使用导入

### 问题 2: A block heading 未覆盖

**现象**: `acceptedBlock({ id: "reasoning" })` 未同步覆盖 `heading`，导致测试中两个 A block 都渲染为默认 `## 摘要`

**解决方案**: 在测试 fixture 中显式传入 `heading: "依据与推理"`

### 问题 3: imprecise assertion

**现象**: `expect(result).not.toContain("# ")` 误命中 `## 摘要` 中的第二个 `#` + 空格

**解决方案**: 移除该断言，改以 `result.startsWith("## 摘要")` 判断未输出 H1

### 问题 4: 空字符串被错误回退

**现象**: 测试辅助函数 `content || defaultContent` 导致空字符串被错误回退为默认内容

**解决方案**: 改为 `content ?? defaultContent`

### 预防措施
- 测试用辅助函数的默认值回退应使用 `??` 而非 `||`
- heading 相关断言应具体到确切 heading 文本，而非通用 substring 匹配
- fixture 数据应显式赋值，避免依赖默认值覆盖

---

## D47 — ProposalSessionStore 类型放宽导致 17+ 类型错误级联

### 问题
执行 D47（CreateProposalUseCase v0.2 管道）时，为了让 `ProposalSessionStore.save()` 能接受 `ProposalSessionV2`，将 store 的 Map 和 save/get/getLatestSessionForNote 返回值类型从 `ProposalSession` 改为 `AnyProposalSession = ProposalSession | ProposalSessionV2`。typecheck 立即报出 17 个错误，涉及 6+ 个文件。

```
src/application/ApplyDecisionUseCase.ts(75,59): Property 'baseProtectedRegionHash' does not exist on type 'AnyProposalSession'.
src/application/ApplyDecisionUseCase.ts(121,13): Property 'applyPlan' does not exist on type 'AnyProposalSession'.
src/application/BuildApplyPlanUseCase.ts(63,88): Property 'refinedSections' does not exist on type 'RawRefinedProposal | RawRefinedProposalV2'.
src/application/BuildApplyPlanUseCase.ts(87,9): Argument of type 'AnyProposalSession' is not assignable to parameter of type 'ProposalSession'.
... 13 more errors
```

### 根因
`ProposalSession`（v0.1）和 `ProposalSessionV2`（v0.2）共享部分字段（id/notePath/status/updatedAt）但有关键差异：

| 字段 | ProposalSession | ProposalSessionV2 |
|------|----------------|-------------------|
| `policySnapshotId` | ✅ required | ❌ 不存在 |
| `baseProtectedRegionHash` | ✅ optional | ❌ 不存在（使用 baseBBlockHash） |
| `baseBBlockHash` | ❌ 不存在 | ✅ required |
| `proposal` | RawRefinedProposal（refinedSections） | RawRefinedProposalV2（blocks） |
| `applyPlan` | ✅ optional | ❌ 不存在（改为 validation） |
| `schemaVersion` | ❌ 不存在 | ✅ "0.2" |

将 store 放宽到 `AnyProposalSession` 后，所有下游消费者（ApplyDecisionUseCase、BuildApplyPlanUseCase、RecoverProposalSessionUseCase、main.ts 等）的类型安全检查全部失败，因为它们访问 `baseProtectedRegionHash` 和 `applyPlan` 等 v0.1 专属字段时无法得到类型保证。

### 排查过程
1. 第一次 typecheck 报 17 errors，参数为 `AnyProposalSession` 的 assignability 错误
2. 逐项检查后发现错误分布在 6 个下游文件，且性质和数量都超出 D47 任务范围
3. 在 BuildApplyPlanUseCase 中，`proposal.refinedSections` 是更深的类型问题（v0.1 proposal 有 refinedSections，v0.2 有 blocks）

### 解决方案
完全回退 `ProposalSessionStore` 到原 `ProposalSession` 类型，不在 D47 中将 v0.2 session 存入 store。

替代策略：`CreateProposalUseCase.executeV2()` 直接返回 `ProposalSessionV2`，不调用 `sessionStore.save()`。v0.2 session-cache 存储留到 Phase 12（D50/D52）中独立实现，不污染 v0.1 兼容层的 store 类型。

### 预防措施
- 两个语义不同但结构相似的 Session 类型不应强行合并到同一个 store——应各自独立存储
- 修改共享存储类型前必须评估所有 call site 的类型影响
- 如果两个类型共享同一个 store，应定义最小公共接口而非 union 类型
