# 设计：将 GitHub 绑定表单移入用户列表页面

> 日期：2026-03-23
> 依据：spec/2026-03-23/requirements.md

## 架构概览

将 `github.tsx` 中的 GitHub Token 绑定表单提取为独立组件 `GitHubBindForm`，嵌入到用户列表页面 `users.tsx` 中，并删除原独立路由页面及导航链接。变更仅在 `apps/web` 层，不涉及后端或数据库。

涉及的模块：`apps/web`

## Drizzle Schema 变更

**无变更。** 本次需求为纯前端 UI 重组，不涉及数据库 schema 变更。

## tRPC 路由设计

**无变更。** 继续沿用已有的：
- `trpc.github.verifyToken` — 验证 GitHub Token，返回用户信息预览
- `trpc.github.saveProfile` — 保存绑定关系
- `trpc.github.list` — 查询已绑定用户列表

## 前端页面/组件设计

### 新增组件

**`apps/web/src/components/github-bind-form.tsx`**

理由：`users.tsx`（144行）加上绑定表单逻辑（~100行）合并后将超过200行，超过 CODING_GUIDELINES.md 建议的100行拆分阈值，且该表单有独立的交互逻辑，适合拆分。

组件签名：
```tsx
interface GitHubBindFormProps {
  onSuccess: () => void;  // 保存成功后通知父组件刷新列表
}

export function GitHubBindForm({ onSuccess }: GitHubBindFormProps)
```

内部逻辑与现有 `github.tsx` 完全相同：
- `useState` 管理 `token` 和 `previewUser`
- `useMutation(trpc.github.verifyToken)` 验证 token
- `useMutation(trpc.github.saveProfile)` 保存绑定，成功后调用 `onSuccess()`
- 使用 `Card`, `Input`, `Label`, `Button`, `Avatar` 等 shadcn/ui 组件

### 修改文件

**`apps/web/src/routes/users.tsx`**

变更：
1. 在列表上方加入 `<GitHubBindForm>` 组件
2. `onSuccess` 回调通过 `useQueryClient().invalidateQueries()` 使 `trpc.github.list` 缓存失效，触发列表自动刷新
3. 新增 `useQueryClient` 导入

页面结构：
```tsx
<div className="container mx-auto px-4 py-8">
  <h1 className="mb-6 font-bold text-2xl">用户列表</h1>

  {/* 绑定表单 */}
  <div className="mb-8 max-w-lg">
    <GitHubBindForm onSuccess={() => queryClient.invalidateQueries(...)} />
  </div>

  {/* 用户列表 */}
  <div className="rounded-md border">
    <Table>...</Table>
  </div>
</div>
```

### 删除文件

**`apps/web/src/routes/github.tsx`** — 路由删除后访问 `/github` 将返回 404

**`apps/web/src/components/header.tsx`**

移除导航数组中的 `{ to: "/github", label: "GitHub" }` 条目。

## 安全审查

基于 SECURITY.md：

- **输入验证**：GitHub Token 输入由现有 `trpc.github.verifyToken` 在后端验证，前端仅做非空检查（`!token.trim()`），符合规范。
- **XSS 防护**：React JSX 自动转义用户数据（`previewUser.login`、`previewUser.bio` 等），无 `dangerouslySetInnerHTML` 使用。
- **权限检查**：当前 procedure 为 `publicProcedure`（项目未启用认证），无需额外处理。此为既有设计，不在本次范围内改变。
- **无新安全风险**：本次仅移动 UI 代码，不引入新的数据流或权限变更。

## 架构决策（ADR）

### ADR-LOCAL-001: 将绑定表单提取为独立组件

**背景**：`users.tsx` 需要嵌入绑定表单，合并后代码量超过200行。

**选项**：
1. 直接内联到 `users.tsx`
2. 提取为 `apps/web/src/components/github-bind-form.tsx`

**决定**：选项2，提取为独立组件。

**理由**：引用 CODING_GUIDELINES.md §6「超过100行 → 考虑拆分」「有独立的交互逻辑 → 拆分」；提取后 `users.tsx` 保持简洁，`github-bind-form.tsx` 逻辑独立可测试。

### ADR-LOCAL-002: 通过 `invalidateQueries` 刷新列表

**背景**：绑定成功后需要刷新用户列表。

**选项**：
1. `queryClient.invalidateQueries()` 使缓存失效，触发重新请求
2. `refetch()` 直接重新发起请求

**决定**：选项1，`invalidateQueries`。

**理由**：符合 React Query 最佳实践，`invalidateQueries` 是推荐的数据刷新方式，与项目现有模式（QueryCache + React Query）一致。

## 影响分析

### 新增文件

| 文件路径 | 说明 |
|---------|------|
| `apps/web/src/components/github-bind-form.tsx` | GitHub 绑定表单组件 |

### 修改文件

| 文件路径 | 变更内容 |
|---------|---------|
| `apps/web/src/routes/users.tsx` | 嵌入 `GitHubBindForm`，添加 `invalidateQueries` 刷新逻辑 |
| `apps/web/src/components/header.tsx` | 移除 `/github` 导航链接 |

### 删除文件

| 文件路径 | 说明 |
|---------|------|
| `apps/web/src/routes/github.tsx` | 独立路由页面不再需要 |

### 对现有功能的影响

- `/github` 路由将不再可用（404）
- 导航栏减少一个链接
- 用户绑定功能仍然完整，入口移至 `/users` 页面

### 向后兼容性

无需向后兼容考虑，这是纯前端路由级别的重组，没有 API 变更。
