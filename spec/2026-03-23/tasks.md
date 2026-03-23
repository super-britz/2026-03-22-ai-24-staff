# 任务清单：用户列表展示 + 绑定去重
> 日期：2026-03-23
> 设计文档：spec/2026-03-23/design.md
> 任务总数：4
> 复杂度分布：S: 2, M: 2, C: 0

## 执行顺序

### 第一组：数据层（顺序）
无 schema 变更，跳过。

### 第二组：API层（顺序）
TASK-001 → TASK-002

### 第三组：前端（顺序）
TASK-003 → TASK-004

### 第四组：集成（顺序）
无需单独联调任务，TASK-004 包含端到端验证。

## 任务详情

### TASK-001：修改 saveProfile 去重逻辑
- 复杂度：S
- 依赖：无
- 状态：待开始
- 文件变更：
  - `packages/api/src/routers/github.ts`（修改）
- 具体内容：将 `onConflictDoUpdate.set` 从全字段更新改为仅更新 `updatedAt` 和 `encryptedToken`，移除 name/avatarUrl/bio/email/publicRepos/followers 的更新。
- 验收标准：
  - [ ] onConflictDoUpdate 只更新 updatedAt 和 encryptedToken
  - [ ] 首次绑定仍正常保存全部字段
  - [ ] 类型检查通过
- 验证命令：`bun run check-types`

### TASK-002：新增 github.list 查询接口
- 复杂度：S
- 依赖：无（与 TASK-001 无依赖，可并行）
- 状态：待开始
- 文件变更：
  - `packages/api/src/routers/github.ts`（修改）
- 具体内容：在 githubRouter 中新增 `list` query procedure。显式 select 排除 encryptedToken，按 updatedAt 降序排列。
- 验收标准：
  - [ ] list 接口返回所有用户的公开信息
  - [ ] 返回结果不包含 encryptedToken
  - [ ] 按 updatedAt 降序排列
  - [ ] 类型检查通过
- 验证命令：`bun run check-types`

### TASK-003：安装 Table 组件 + 新建用户列表页面
- 复杂度：M
- 依赖：TASK-002
- 状态：待开始
- 文件变更：
  - `packages/ui/src/components/table.tsx`（新建，shadcn 生成）
  - `apps/web/src/routes/users.tsx`（新建）
- 具体内容：通过 shadcn 安装 Table 组件，创建 /users 路由页面。使用 useQuery 获取 github.list 数据，用 Table 展示头像、用户名、姓名、bio、邮箱、仓库数、粉丝数、绑定时间。包含 Skeleton 加载态和空状态。
- 验收标准：
  - [ ] /users 路由可访问
  - [ ] 表格展示所有字段
  - [ ] 加载中显示 Skeleton
  - [ ] 无数据时显示空状态提示
  - [ ] 类型检查通过
- 验证命令：`bun run check-types`

### TASK-004：更新导航栏 + 端到端验证
- 复杂度：M
- 依赖：TASK-003
- 状态：待开始
- 文件变更：
  - `apps/web/src/components/header.tsx`（修改）
- 具体内容：在 Header 导航栏添加"用户列表"链接指向 /users。手动验证完整流程：绑定 → 列表展示 → 重复绑定仅更新时间。
- 验收标准：
  - [ ] 导航栏包含"用户列表"链接
  - [ ] 点击链接跳转到 /users
  - [ ] 类型检查通过
  - [ ] Biome check 通过
- 验证命令：`bun run check-types && bun run check`

## 复杂度评估
- 复杂任务（C）：无
- 可并行的组：TASK-001 和 TASK-002 可并行
- 建议：单 Agent
- 原因：总共4个任务，均为 S/M 级别，无跨模块复杂协调，单 Agent 顺序执行即可
