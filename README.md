# Obsidian Refined Layer

Obsidian Refined Layer 是一个面向 Obsidian 的安全型笔记整理插件，用于将 raw 笔记转换为经过审核的 refined 笔记。它通过 LLM 生成整理建议，但不会直接改写原文；所有修改都需要用户在 Review UI 中确认后，才会通过受控的 ApplyPlan 写入。

插件重点保护 ## 原始内容 及其后文，确保原始记录被逐字保留。同时支持 session 恢复、草稿保存、token usage 展示、tag整理、API key 安全存储与日志脱敏，适合用于构建长期可追溯的 Obsidian 知识库。

## 安装

### 本地加载

1. 下载本仓库或解压发布包
2. 将 `main.js`、`manifest.json`、`styles.css` 放入 vault 的 `.obsidian/plugins/obsidian-refined-layer/`
3. 在 Obsidian 设置 → 第三方插件中启用 **Obsidian Refined Layer**

### 开发构建

```bash
npm install
npm run build
```

构建产物：
- `main.js` — 插件入口
- `styles.css` — 样式
- `manifest.json` — 插件声明

## 使用

### 基本流程

```
打开 raw 笔记 → 执行 Refine current note → 审核 proposal → 选择要应用的修改 → Apply
```

### 命令

| 命令 | 说明 |
|------|------|
| **Refine current note** | 对当前打开的 Markdown 笔记生成 refined proposal |
| **Reopen last proposal for current note** | 恢复当前笔记最近一次的 proposal 审核界面 |

### 审核界面

生成 proposal 后会自动打开审核弹窗，包含：

- **正文预览**：refined 各 section（摘要、核心问题、当前结论、依据与推理等），可直接编辑
- **YAML 建议**：status / source / context 修改建议，逐项勾选
- **Tag 建议**：新增/移除标签建议，逐项勾选
- **Token 用量**：显示本次生成的 token 消耗

### 部分应用

你可以只应用 proposal 中的部分修改：
- 勾选正文 → 只替换正文
- 勾选 status → 只更新 status
- 全部不勾选 → 不修改文件

### Save as Draft

将 proposal 保存为独立草稿文件（不修改原笔记），默认保存在 `80_Runtime/refine-drafts/`。

### 冲突处理

如果 proposal 生成后原笔记被手动修改，apply 会被阻止。可选择：
- **Save as Draft**：保存草稿
- **Regenerate**：重新生成 proposal
- **Manual copy**：手动复制 review
- **Discard**：放弃本次 proposal

## Provider 配置

| 类型 | 说明 | 需要 API Key |
|------|------|-------------|
| Mock LLM | 返回固定样例 proposal，用于测试 | 否 |
| OpenAI-compatible | 标准 OpenAI API 格式 | 是 |
| DeepSeek | DeepSeek API | 是 |
| 自定义 OpenAI-compatible | 自定义 endpoint | 是 |
| 本地 OpenAI-compatible | 本地模型服务（如 Ollama） | 否 |

## 隐私说明

- **API Key 存储**：使用 Obsidian SecretStorage 加密保存，不写入 `data.json`
- **日志脱敏**：所有错误和调试输出不包含 API key、token、Authorization header
- **Session 不保存 secret**：提案历史不存储 provider secret
- **SecretStorage 不可用时**：自动降级为 mock-llm 模式，拒绝保存任何 API key

## v0.1.0 范围

仅实现单篇笔记 `raw → refined` 最小闭环：
- 内置 `raw-refined` 工作流 profile
- 四层 proposal 校验（JSON → Schema → Policy → Content）
- Protected region（`## 原始内容`）逐字节保护
- Apply 前 freshness check 与冲突流转
- 仅允许 body / frontmatter / tag 写入

不包含：批量 refine、MOC 写入、关系链接写入、rename/move、外部 Tool API、完整 Prompt 编辑器。

## 开发

```bash
npm install          # 安装依赖
npm run typecheck    # TypeScript 类型检查
npm run build        # 构建插件
npm test             # 运行自动测试
```

测试 vault: `Obsidian-Refined-Layer-TestVault/`  
手动测试矩阵: `docs/TEST-MATRIX.md`
