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
