# Obsidian Refined Layer

Obsidian Refined Layer 是一个 review-first 的 Obsidian 插件。它把当前 raw Markdown 笔记整理成可审核的 refined proposal，但不会让 LLM 直接写文件；所有修改都必须先进入 Review UI，由用户明确勾选后，再通过 ApplyPlan 写入。

v0.2.0 使用可配置的单篇笔记 `raw-refined` workflow：

```text
raw note -> A/B block parsing -> structured prompt -> LLM JSON -> Zod -> normalization -> review -> ApplyPlan -> safe write / draft
```

## 安装

1. 下载本仓库或发布包。
2. 将 `main.js`、`manifest.json`、`styles.css` 放入 vault 的 `.obsidian/plugins/obsidian-refined-layer/`。
3. 在 Obsidian 设置 -> 第三方插件中启用 **Obsidian Refined Layer**。

开发构建：

```bash
npm install
npm run build
```

## 基本使用

打开一篇 Markdown raw note，执行命令：

```text
Refine current note
```

插件会解析当前笔记的 A/B 分块，构造 prompt，调用 mock 或真实 provider，生成 proposal session，然后打开 Review UI。你可以逐块勾选要应用的 A 类分块、YAML 建议和 selectedTags；未勾选的内容不会写入原笔记。

## A/B 分块

v0.2.0 使用可配置的 A/B block 模型。

- **A 类分块**：由 LLM 生成或整理，可按块独立审核和应用。每个 A block 有 `name / headingLevel / prompt / enabled / order`。
- **B 类分块**：唯一的受保护原始内容块，不是 LLM 输出目标，Apply 时从当前文件重新提取并逐字保留。
- **保护一级标题**：开启后，第一个 H1 被视为笔记标题，A/B 分块必须使用 H2 或更深层级。

在 Settings 中可以配置 A 类分块列表、B 类分块名称和层级、以及“保护一级标题”。保存配置前会经过 core validator；非法配置不会写入 settings。

## Tags

Settings 中可以维护 `tagWhitelist` 和 `tag prompt`。

- `selectedTags`：必须来自白名单，Review UI 中可勾选，Apply 时只追加到 YAML `tags`。
- `newTagSuggestions`：不在白名单的新标签建议，只展示和可复制，永远不会直接写入 YAML。
- tag 保存会自动补 `#`、按逗号/空格/换行/顿号等分隔、去重，但不会改变大小写。

Apply 只会追加用户勾选且仍在白名单中的 selectedTags；不会删除现有 tags，也不会写入 newTagSuggestions。

## 缓存记录

v0.2.0 使用两类缓存：

- `session-cache`：保存成功 proposal session，用于查看最近缓存记录和 Save as Draft。默认上限 5。
- `error-session-cache`：保存失败 attempts，用于调试 retry / JSON / Zod / normalization 问题。默认开启，上限 30。

缓存记录不是长期历史，也不是用户可见笔记。Settings 会显示缓存位置：

```text
.obsidian/plugins/obsidian-refined-layer/session-cache
.obsidian/plugins/obsidian-refined-layer/error-session-cache
```

缓存记录不保存 API key、Authorization header 或 provider secret。cached session 可以查看和保存草稿，但 v0.2.0 不允许直接 Apply cached session。

## Provider 与密钥 ID

支持 provider：

| 类型 | 说明 | 需要 API key |
| --- | --- | --- |
| Mock LLM | 本地固定样例，用于测试 | 否 |
| OpenAI-compatible | 标准 OpenAI Chat Completions 格式 | 是 |
| DeepSeek | DeepSeek OpenAI-compatible API | 是 |
| 自定义 OpenAI-compatible | 自定义远程 endpoint | 是 |
| 本地 OpenAI-compatible | Ollama、LM Studio、vLLM 等 | 通常否 |

用户界面统一使用 **密钥 ID / Key ID**。密钥 ID 会保存到插件 settings 中，用于从 Obsidian SecretStorage 读取真实 API key；真实 API key 不会写入 `data.json`。

Settings 中提供：

- **测试模型连接**：发送不包含真实 note 内容的最小请求，不创建 ProposalSession，不写缓存。
- **SecretStorage 诊断**：只读、可复制、脱敏，可显示密钥 ID 是否配置、是否能读取、读取值是否等于密钥 ID、读取值长度和脱敏前后缀。

## Prompt 可观测

Settings 可开启 Prompt 可观测。开启后，最近一次 v0.2 prompt debug snapshot 保存在内存中，可复制查看：

- final system / user prompt
- tag whitelist
- schema instruction
- raw response / parsed JSON
- Zod result / normalization report

默认不会把成功请求的完整 prompt/response 写入磁盘；所有 snapshot 保存前都会脱敏。

## 安全边界

- LLM output 永远不直接写文件。
- 所有写入都通过 ApplyPlan。
- Apply 前重读当前文件并做 freshness / B block 检查。
- B block 从当前文件提取，不信任 proposal/session/cache。
- 不实现 rename/move/archive/delete/remove-tags/link/MOC/batch refine。
- SecretStorage 不可用时，真实 provider API key 保存被禁用，mock/local provider 仍可用。

## 开发

```bash
npm install
npm run typecheck
npm test
npm run build
```

测试矩阵见 [docs/test-matrix-v0.2.md](docs/test-matrix-v0.2.md)。
