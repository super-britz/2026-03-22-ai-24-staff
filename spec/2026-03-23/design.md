# 设计：用户列表展示 + 绑定去重
> 日期：2026-03-23

## 架构概览

在现有 GitHub 绑定功能基础上，新增用户列表查询接口和前端展示页面，同时修改 saveProfile 的 upsert 逻辑使其仅更新时间和 Token。不涉及 schema 变更。

涉及模块：
- `packages/api` — 新增 list query，修改 saveProfile mutation
- `apps/web` — 新增用户列表路由页面

## Drizzle Schema 变更

**无变更。** 现有 `github_profiles` 表结构满足需求，`login` 已设为 unique 约束。

Migration 策略：不需要。

## tRPC 路由设计

### 新增：`github.list` (query)

```typescript
list: publicProcedure.query(async () => {
  return db
    .select({
      id: githubProfiles.id,
      login: githubProfiles.login,
      name: githubProfiles.name,
      avatarUrl: githubProfiles.avatarUrl,
      bio: githubProfiles.bio,
      email: githubProfiles.email,
      publicRepos: githubProfiles.publicRepos,
      followers: githubProfiles.followers,
      createdAt: githubProfiles.createdAt,
      updatedAt: githubProfiles.updatedAt,
    })
    .from(githubProfiles)
    .orderBy(desc(githubProfiles.updatedAt));
})
```

- 使用 `publicProcedure`（当前系统无认证，符合 SECURITY.md "所有 procedure 均为 publicProcedure"）
- 显式 select 排除 `encryptedToken`（符合 SECURITY.md 敏感字段处理规则）
- 按 `updatedAt` 降序排列

### 修改：`github.saveProfile` (mutation)

将 `onConflictDoUpdate.set` 从全字段更新改为仅更新 `updatedAt` 和 `encryptedToken`：

```typescript
.onConflictDoUpdate({
  target: githubProfiles.login,
  set: {
    encryptedToken,
    updatedAt: new Date(),
  },
})
```

## 前端页面/组件设计

### 新增路由：`apps/web/src/routes/users.tsx`

- 路径：`/users`
- 使用 `useQuery(trpc.github.list.queryOptions())` 获取数据
- 已有 shadcn/ui 组件可用：`Avatar`、`Card`、`Skeleton`
- 需要新增：`Table` 组件（通过 shadcn 安装）

### 页面结构

- 页面标题
- 表格展示用户列表：头像、用户名、姓名、bio、邮箱、公开仓库数、粉丝数、绑定时间
- 加载态使用 Skeleton
- 空状态提示

### 导航更新：`apps/web/src/components/header.tsx`

在导航栏中添加"用户列表"链接指向 `/users`。

## 安全审查

- **敏感字段**：list 接口显式 select，不返回 `encryptedToken` ✅
- **输入验证**：list 接口无输入参数，saveProfile 已有 Zod 验证 ✅
- **SQL 注入**：使用 Drizzle 查询构建器，参数化查询 ✅
- **XSS**：React JSX 自动转义 ✅
- **权限**：当前系统无认证（符合现状），不做行级权限检查

## 架构决策（ADR）

### ADR：list 接口放在 githubRouter 而非新建 userRouter

- **背景**：用户列表本质上是查询 github_profiles 表
- **选项**：A) 新建 userRouter；B) 在现有 githubRouter 中添加
- **决定**：B — 在 githubRouter 中添加 `list` procedure
- **理由**：数据来源是 github_profiles 表，业务上属于 GitHub 绑定功能的查询侧。根据 ARCHITECTURE.md §6 "每个业务域一个 router 文件"，GitHub 相关操作归属同一个 router。

### ADR：使用 Table 组件展示用户列表

- **背景**：需要展示多字段的结构化数据
- **选项**：A) Card 列表；B) Table 表格
- **决定**：B — 使用 shadcn/ui Table 组件
- **理由**：用户选择了"详细信息"展示模式（8个字段），表格更适合多字段对齐展示。

## 影响分析

### 新增文件
- `apps/web/src/routes/users.tsx` — 用户列表页面

### 修改文件
- `packages/api/src/routers/github.ts` — 添加 list query + 修改 saveProfile upsert 逻辑
- `apps/web/src/components/header.tsx` — 添加导航链接

### 对现有功能的影响
- saveProfile 行为变更：重复绑定不再更新 name/avatarUrl/bio/email/publicRepos/followers
- 首次绑定行为不变

### 向后兼容性
- 新增接口，无破坏性变更
- saveProfile 的去重行为变更是需求要求的
