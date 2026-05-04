## Phase 5.5：ReviewModal refined 正文编辑回填

### D19.5：支持 editedRefinedSections 并接入 ApplyPlan

预计工程量：4 小时

任务：

1. ReviewModal 将 refined 正文预览改为 section-level 可编辑输入。
2. 默认内容来自 session.proposal.refinedSections。
3. UserDecision 增加 editedRefinedSections。
4. acceptBody=true 时，ApplyPlanner 优先使用 editedRefinedSections；未编辑时使用 proposal.refinedSections。
5. editedRefinedSections 进入 ApplyPlan 前必须重新做 section schema / content policy 校验。
6. 禁止 editedRefinedSections 包含 ## 原始内容。
7. Save as Draft 保存用户编辑后的 sections，而不是只保存原始 proposal sections。
8. UI 不直接写文件，不生成 ApplyPlan，不做 YAML/tag policy 判断。

验收：

1. 用户可以在 ReviewModal 修改 refined 正文各 section。
2. Apply selected changes 会写入用户编辑后的 refined 正文。
3. 未勾选 acceptBody 时，正文不会被写入。
4. 用户编辑内容包含 ## 原始内容 时被拒绝。
5. YAML / tags 仍只能通过原有受控控件确认。
6. ## 原始内容 仍逐字节保留。
7. 文件变化后仍触发 conflict flow。
8. Save as Draft 包含编辑后的 sections。
9. 项目仍可 build。