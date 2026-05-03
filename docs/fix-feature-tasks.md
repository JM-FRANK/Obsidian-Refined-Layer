# Fix Feature: Session 持久化 (ProposalSessionStore 磁盘恢复)

> 状态：待实现
> 发现日期：2026-05-04
> 根因文档：`dev-log.md` D9 / D10
> 关联架构书：Section 14 ProposalSession Store

---

## 问题描述

`ProposalSessionStore` 当前为**纯内存实现**（两个 `Map`），插件重载或 Obsidian 重启后所有 session 数据丢失。架构书 Section 14 和 AGENTS.md 明确要求 `auto-save unapplied proposal sessions`，但 D9 日计划分解时遗漏了持久化子任务，D10 的"不写文件"验收约束进一步封堵了 Phase 3 阶段的补救意愿。后续各 Phase 无人回头检查该缺口。

**影响**：
- 误关闭 ReviewModal 后无法恢复（已实现同次运行期间的 Reopen）
- 关闭 Obsidian 后 session 全部丢失
- `Reopen last proposal` 命令在重启后必然返回"无 session"

---

## 修复范围

### 1. 新增 `src/adapters/obsidian/ObsidianSessionStore.ts`

```
职责：
- saveSessions(sessionsByNotePath: Map<string, ProposalSession[]>) → 序列化为 JSON 写入插件数据目录
- loadAllSessions() → 反序列化恢复所有 session Map
- 存储格式：独立 session-*.json 或单个 sessions.json
- 写入前 sanity check：不含 secret/API key 字段
```

存储结构建议（独立文件，不混入 settings data.json）：

```json
{
  "sessions": {
    "note/path/1": [ { ...ProposalSession }, ... ],
    "note/path/2": [ { ...ProposalSession }, ... ]
  }
}
```

### 2. 改造 `src/runtime/ProposalSessionStore.ts`

- 构造函数新增可选参数 `persistenceStore?: ObsidianSessionStore`
- `save(session)` → 写入内存 + 调用持久化
- 新增 `restoreFromDisk()` → 从 adapter 恢复所有 session 到内存 Map
- 保持现有 `getLatestSessionForNote` / `listSessionsForNote` / `setHistoryLimit` 不变

### 3. 改造 `src/main.ts` onload

```typescript
// onload 中增加：
this.sessionStore = new ProposalSessionStore(
  this.settings.historyLimit,
  new ObsidianSessionStore(this)
);
await this.sessionStore.restoreFromDisk();
```

### 4. 补充测试

在 `tests/runtime/ProposalSessionStore.test.ts` 中增加：
- 持久化 round-trip：save → reload → restore → query 正确
- history limit 裁剪在持久化后生效
- 损坏数据恢复时降级处理（不阻断插件加载）
- 空数据恢复时正常启动

---

## 风险点

| 风险 | 缓解 |
|------|------|
| 磁盘文件损坏 | 解析失败时忽略并清空，不阻断插件 load |
| data.json 膨胀 | 独立文件存储，不混入 settings |
| Session 含敏感字段 | ProposalSession 类型本身不含 API key；写入前做字段白名单过滤 |
| 多插件实例并发 | Obsidian 单实例，无需处理 |

---

## 接口变更

### ObsidianSessionStore

```typescript
interface SessionPersistenceStore {
  saveAll(sessionsByPath: Map<string, ProposalSession[]>): Promise<void>;
  loadAll(): Promise<Map<string, ProposalSession[]>>;
}
```

### ProposalSessionStore 构造变更

```typescript
constructor(
  historyLimit: number = 5,
  persistence?: SessionPersistenceStore
)
```

---

## 预计工时

约 4 小时（与 D9 单日 plan 同量级）

## 验收标准

- [ ] 生成 proposal 后关闭 Obsidian，重新打开可 Reopen 到该 session
- [ ] 超过 historyLimit 的旧 session 在重启后不出现
- [ ] 不同 notePath 的 session 不混淆
- [ ] data.json 中无 session 存储，API key 不泄露
- [ ] 损坏的存储文件不阻断插件加载
- [ ] 无 session 存储文件时正常启动（首次使用场景）
- [ ] `npm test` 全部通过，含新建持久化测试
