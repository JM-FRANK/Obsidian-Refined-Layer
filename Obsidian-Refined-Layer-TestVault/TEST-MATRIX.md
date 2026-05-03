# v0.1.0 手动测试矩阵

> 测试环境：Obsidian Refined Layer Test Vault
> 插件模式：mock-llm（无需 API key）
> 测试日期：______

---

## 1. Eligibility 判定

| #   | 测试用例                | 测试笔记                                         | 预期结果                               | 通过? |
| --- | ------------------- | -------------------------------------------- | ---------------------------------- | --- |
| 1.1 | valid raw note      | `10_Raw/valid-raw-note.md`                   | eligibility 通过，生成 proposal         | [ ] |
| 1.2 | missing frontmatter | `10_Raw/invalid-missing-frontmatter.md`      | `missingFrontmatter` 拒绝            | [ ] |
| 1.3 | status 非 raw        | `10_Raw/invalid-status-not-raw.md`           | `invalidStatus` 拒绝                 | [ ] |
| 1.4 | missing ## 原始内容     | `10_Raw/invalid-missing-original-content.md` | `missingOriginalContentHeading` 拒绝 | [ ] |
| 1.5 | 无活动文件               | 关闭所有笔记后执行命令                                  | 提示 "no active note is open"        | [ ] |
| 1.6 | 非 Markdown 文件       | 打开 Canvas 等非 md 文件                           | 提示 "not Markdown"                  | [ ] |

---

## 2. Mock Proposal 生成

| #   | 测试用例             | 操作                         | 预期结果                                 | 通过? |
| --- | ---------------- | -------------------------- | ------------------------------------ | --- |
| 2.1 | mock proposal 生成 | 对 valid-raw-note 执行 Refine | ReviewModal 自动打开，展示 refined sections | [ ] |
| 2.2 | token usage 显示   | 查看 Review UI token usage   | 显示 mock token usage (estimated)      | [ ] |
| 2.3 | 重复生成             | 同一笔记执行两次 Refine            | 同一笔记执行两次 Refine，每次打开新 ReviewModal    | [ ] |

---

## 3. Review UI 交互

| # | 测试用例 | 操作 | 预期结果 | 通过? |
|---|---------|------|---------|------|
| 3.1 | ReviewModal 打开 | 生成 proposal 后 | 弹出 ReviewModal | [ ] |
| 3.2 | 正文预览显示 | 查看 ReviewModal 内容 | 显示 refined sections | [ ] |
| 3.3 | 正文默认未选中 | 查看 acceptBody checkbox | 默认未勾选 | [ ] |
| 3.4 | frontmatter 默认未选中 | 查看 status/source/context | 默认未勾选 | [ ] |
| 3.5 | tag 默认未选中 | 查看 tag add/remove | 默认未勾选 | [ ] |
| 3.6 | 可编辑正文 textarea | 查看 section 输入框 | 可编辑，默认填充 proposal 内容 | [ ] |
| 3.7 | light/dark theme | 切换 Obsidian 主题 | UI 可读 | [ ] |
| 3.8 | 关闭弹窗不生效 | 直接关闭 ReviewModal | 不应用任何修改 | [ ] |
| 3.9 | i18n zh-CN | 语言设为 zh-CN | UI 显示中文 | [ ] |
| 3.10 | i18n en | 语言设为 en | UI 显示英文 | [ ] |

---

## 4. UserDecision 与 Apply

| #   | 测试用例                        | 操作                               | 预期结果                   | 通过? |
| --- | --------------------------- | -------------------------------- | ---------------------- | --- |
| 4.1 | 仅 apply body                | 勾选 acceptBody 后 Apply            | 只有正文被替换                | [ ] |
| 4.2 | apply body + status         | 勾选 body + status 后 Apply         | 正文替换，status 变为 refined | [ ] |
| 4.3 | apply body + source/context | 勾选 body + source/context         | 正文替换，source/context 更新 | [ ] |
| 4.4 | apply tag add               | 勾选 tag add 后 Apply               | 新增白名单内 tag             | [ ] |
| 4.5 | apply tag remove            | 勾选 tag remove 后 Apply            | 移除指定 tag               | [ ] |
| 4.6 | 全部未选 Apply                  | 不勾选任何项点击 Apply                   | 不修改文件（空 plan）          | [ ] |
| 4.7 | 编辑正文回填                      | 在 textarea 中修改 section 内容后 Apply | 写入的是编辑后内容              | [ ] |
| 4.8 | 编辑内容含 ## 原始内容               | 在 textarea 中粘贴 `## 原始内容`         | apply plan 阶段拒绝        | [ ] |

---

## 5. 安全写入保护

| # | 测试用例 | 操作 | 预期结果 | 通过? |
|---|---------|------|---------|------|
| 5.1 | ## 原始内容 逐字节保留 | apply 后打开笔记检查 | 原文逐字保留（含换行） | [ ] |
| 5.2 | created 只读 | apply 后检查 frontmatter | created 值不变 | [ ] |
| 5.3 | 未知 YAML 保留 | apply 后检查 `custom` 字段 | `custom: preserve-me` 保留 | [ ] |
| 5.4 | 非法 tag 不写入 | Check proposal 中的 tag 建议 | 不含 #rel/* 或 #raw | [ ] |

---

## 6. Freshness Check 与冲突

| # | 测试用例 | 操作 | 预期结果 | 通过? |
|---|---------|------|---------|------|
| 6.1 | 无冲突 apply | 生成 proposal 后立即 apply | 成功写入 | [ ] |
| 6.2 | 修改正文后冲突 | 生成 proposal → 手动编辑笔记 → Apply | 阻止 apply，显示冲突选项 | [ ] |
| 6.3 | 修改 protected region 冲突 | 生成 proposal → 修改 ## 原始内容 → Apply | 阻止 apply | [ ] |
| 6.4 | 无 force apply | 冲突时检查可用选项 | 没有 force apply 按钮 | [ ] |

---

## 7. Save as Draft

| # | 测试用例 | 操作 | 预期结果 | 通过? |
|---|---------|------|---------|------|
| 7.1 | 正常保存草稿 | 点击 Save as Draft | 在 `80_Runtime/refine-drafts/` 生成草稿 | [ ] |
| 7.2 | 草稿不修改原笔记 | save draft 后检查原 note | 原 note 未修改 | [ ] |
| 7.3 | 草稿包含编辑内容 | 编辑正文后 save draft | 草稿包含编辑后 sections | [ ] |
| 7.4 | 冲突时 save draft | 冲突时选择 Save as Draft | 草稿包含 conflict reason | [ ] |

---

## 8. Session 恢复

| # | 测试用例 | 操作 | 预期结果 | 通过? |
|---|---------|------|---------|------|
| 8.1 | 恢复最近 session | 生成 proposal 后关闭弹窗 → Reopen last proposal | 重新打开 ReviewModal | [ ] |
| 8.2 | 无 session 提示 | 对无 session 笔记执行 Reopen | 提示无 session | [ ] |
| 8.3 | 不同笔记 session 隔离 | 笔记 A 生成 proposal，笔记 B 执行 Reopen | 不交叉 | [ ] |
| 8.4 | history limit | 同一笔记生成 6 次 proposal | 最早 session 被清理 | [ ] |

---

## 9. SettingsTab

| # | 测试用例 | 操作 | 预期结果 | 通过? |
|---|---------|------|---------|------|
| 9.1 | language 切换 | 修改 language 保存 | Review UI 语言更新 | [ ] |
| 9.2 | history limit 修改 | 修改 historyLimit 保存 | 新值生效 | [ ] |
| 9.3 | draft folder 修改 | 修改 draftFolder 保存 | 草稿保存到新路径 | [ ] |
| 9.4 | prompt override 保存 | 输入 systemPrompt 保存 | override 持久化 | [ ] |
| 9.5 | provider mock 模式 | 选择 mock 类型 | 无额外配置项 | [ ] |
| 9.6 | provider 切换显示 | 切换不同 provider 类型 | 按类型条件渲染字段 | [ ] |
| 9.7 | SecretStorage 诊断 | 查看诊断面板 | 显示运行时状态 | [ ] |

---

## 结果汇总

| 类别 | 总数 | 通过 | 失败 | 跳过 |
|------|------|------|------|------|
| Eligibility 判定 | 6 | | | |
| Mock Proposal 生成 | 3 | | | |
| Review UI 交互 | 10 | | | |
| UserDecision 与 Apply | 8 | | | |
| 安全写入保护 | 4 | | | |
| Freshness Check | 4 | | | |
| Save as Draft | 4 | | | |
| Session 恢复 | 4 | | | |
| SettingsTab | 7 | | | |
| **合计** | **50** | | | |

---

## 发现的问题

| # | 优先级 | 问题描述 | 复现步骤 | 状态 |
|---|--------|---------|---------|------|
| | | | | |
