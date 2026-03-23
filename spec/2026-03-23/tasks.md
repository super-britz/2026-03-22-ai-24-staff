# 任务清单：将 GitHub 绑定表单移入用户列表页面

> 日期：2026-03-23
> 设计文档：spec/2026-03-23/design.md
> 任务总数：4
> 复杂度分布：S: 3, M: 1, C: 0

## 执行顺序

### 第一组：数据层（顺序）

> 无变更。本次需求为纯前端重组，无 schema 或 migration 任务。

### 第二组：API层（可并行）

> 无变更。继续沿用现有 tRPC 路由，无需新增或修改。

### 第三组：前端（可并行，TASK-002 依赖 TASK-001）

- TASK-001：创建 GitHubBindForm 组件（M）✅
- TASK-002：更新 users.tsx 嵌入表单并自动刷新（S，依赖 TASK-001）✅
- TASK-003：从导航栏移除 /github 链接（S，独立）✅
- TASK-004：删除 github.tsx 路由文件（S，独立）✅

### 第四组：集成（顺序）

> 等第三组全部完成后执行：`bun run check-types` 验证无类型错误。

---

## 任务详情

### TASK-001：创建 GitHubBindForm 组件

- 状态：✅ 完成
- 复杂度：M
- 依赖：无
- 文件变更：
  - `apps/web/src/components/github-bind-form.tsx`（新建）
- 检查点：[1]✅ [2]✅ [3]跳过（无业务逻辑变更） [4]✅
- 验收标准：
  - [x] 文件 `apps/web/src/components/github-bind-form.tsx` 存在
  - [x] 组件接受 `onSuccess` prop
  - [x] `bun run check-types` 无报错
- 验证命令：`bun run check-types`

---

### TASK-002：更新 users.tsx 嵌入表单并自动刷新

- 状态：✅ 完成
- 复杂度：S
- 依赖：TASK-001
- 文件变更：
  - `apps/web/src/routes/users.tsx`（修改）
- 检查点：[1]✅ [2]✅ [3]跳过（无业务逻辑变更） [4]✅
- 验收标准：
  - [x] `/users` 页面同时展示绑定表单和用户列表
  - [x] 绑定成功后列表自动刷新
  - [x] `bun run check-types` 无报错
- 验证命令：`bun run check-types`

---

### TASK-003：从导航栏移除 /github 链接

- 状态：✅ 完成
- 复杂度：S
- 依赖：无
- 文件变更：
  - `apps/web/src/components/header.tsx`（修改）
- 检查点：[1]✅ [2]✅ [3]跳过 [4]✅
- 验收标准：
  - [x] 导航栏不再显示 "GitHub" 链接
  - [x] `bun run check-types` 无报错
- 验证命令：`bun run check-types`

---

### TASK-004：删除 github.tsx 路由文件

- 状态：✅ 完成
- 复杂度：S
- 依赖：TASK-001
- 文件变更：
  - `apps/web/src/routes/github.tsx`（删除）
- 检查点：[1]✅ [2]✅ [3]跳过 [4]✅
- 验收标准：
  - [x] `apps/web/src/routes/github.tsx` 文件不存在
  - [x] `bun run check-types` 无报错
- 验证命令：`bun run check-types`

---

## 复杂度评估

- 复杂任务（C）：无
- 可并行的组：TASK-001 + TASK-003 可并行；TASK-004 在 TASK-001 完成后可与 TASK-002 并行
- 建议：单 Agent
- 原因：任务总量小（4个），最大复杂度为 M，全部在 `apps/web` 内，无跨模块协调，单 Agent 顺序执行即可高效完成
