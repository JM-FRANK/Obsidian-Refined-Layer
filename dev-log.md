## D1 开发日志

### Current status

仓库已完成 Obsidian 插件最小骨架初始化，包含 `manifest.json`、`package.json`、`tsconfig.json`、`esbuild.config.mjs`、`src/main.ts`、`styles.css`。插件入口当前仅负责 `onload` / `onunload` 和 `Refine current note` 命令注册；执行命令只弹出 Notice，不读取也不写入任何笔记文件。已安装依赖并验证 `npm run build` 可生成插件入口产物。另已补充最小 git 忽略规则、Vitest 测试脚本与 `tests/` 目录约定。

### Active summary
- Date: 2026-05-04
- Scope: D1 / `manifest.json`、`package.json`、`tsconfig.json`、`esbuild.config.mjs`、`src/main.ts`、`styles.css`
- Reason: 按日计划完成可加载、可构建、无文件写入的 Obsidian 插件初始化
- Change: 建立最小插件清单与 TypeScript/esbuild 构建链路，实现插件装载生命周期与 `Refine current note` 命令占位
- Verification: 运行 `npm install`；运行 `npm run typecheck`、`npm run build`、`npm test` 成功
- Next: 进入 D2，建立建议目录结构与核心类型空壳，并在 `tests/` 下按模块镜像增加对应单元测试

## D2 开发日志

### Current status

仓库已按 Phase 1 边界建立最小目录结构与核心类型空壳。`src/core`、`src/application`、`src/adapters`、`src/runtime`、`src/ui`、`src/settings` 已落下实际文件；`WorkflowProfile`、`RawRefinedProposal`、`ProposalSession`、`UserDecision`、`ApplyPlan`、`TokenUsageReport`、`RefinedLayerToolPort` 已可被 import。`PolicyGuard` 目前为仅做透传的空壳类，用于固定后续请求入口形状。`main.ts` 仍只负责命令注册和 use case 装配，不承载 workflow 规则，也没有任何写文件逻辑。

### Active summary
- Date: 2026-05-04
- Scope: D2 / `src/core/**`、`src/application/RefinedLayerToolPort.ts`、`src/runtime/ProposalSession.ts`、`src/ui/review/ReviewViewModel.ts`、`src/settings/PluginSettings.ts`
- Reason: 完成 Phase 1 的工程目录边界和核心类型入口，避免后续功能直接堆进 `main.ts`
- Change: 新增核心类型文件、Internal Tool Port 接口、`PolicyGuard` 空壳，并显式建立 `src/ui` 等目录边界
- Verification: 运行 `npm run typecheck`、`npm run build` 成功
- Next: 进入 D3，接通 active note 读取与 `CheckEligibilityUseCase` 空流程

## D3 开发日志

### Current status

Phase 1 已完成。插件命令现在会通过 `ObsidianNoteRepository -> CheckEligibilityUseCase` 读取当前 active file，并在不写入任何文件的前提下返回三类结果：无活动文件、活动文件非 Markdown、活动 Markdown 笔记的路径/标题/原始内容长度。`main.ts` 仍仅负责插件装载、依赖装配和结果提示；workflow 规则、真实 eligibility 判断、proposal 生成和写入逻辑均未提前实现。仓库同时补充了最小单元测试，覆盖 `CheckEligibilityUseCase` 的三条基础路径。

### Active summary
- Date: 2026-05-04
- Scope: D3 / `src/application/CheckEligibilityUseCase.ts`、`src/adapters/obsidian/ObsidianNoteRepository.ts`、`src/main.ts`、`tests/smoke.test.ts`
- Reason: 完成 Phase 1 对 active markdown note 读取能力的要求，并让命令真正经过 application/use case
- Change: 实现 active file 读取、Markdown 文件判定、内容长度返回，以及命令侧明确提示无活动文件/非 Markdown 文件/有效 Markdown 笔记
- Verification: 运行 `npm run typecheck`、`npm run build`、`npm test` 成功
- Next: Phase 1 验收已满足；下一步如继续则进入 D4，实现 `raw-refined` profile 与初版 eligibility 规则
