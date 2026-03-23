# 需求：将 GitHub 绑定表单移入用户列表页面

> 日期：2026-03-23
> 来源：手动描述
> 优先级：P1

## 业务背景

当前 GitHub 账号绑定功能位于独立的 `/github` 页面，用户需要在"绑定"和"查看列表"两个页面之间切换。
将绑定表单移至用户列表页面（`/users`），使绑定操作和列表展示在同一页面完成，减少页面跳转，提升操作效率。

目标用户：使用系统的 staff 成员（需要绑定自己的 GitHub 账号）。

衡量标准：用户可以在 `/users` 页面直接完成 GitHub 账号绑定并立即看到列表更新，无需跳转至其他页面。

## 功能需求

- **REQ-001**：在用户列表页面（`/users`）嵌入 GitHub Token 绑定表单
- **REQ-002**：绑定表单保持原有的两步流程：验证 Token → 确认用户信息 → 保存
- **REQ-003**：绑定成功后，用户列表自动刷新以展示新绑定的用户
- **REQ-004**：移除独立的 `/github` 页面路由文件（`github.tsx`）
- **REQ-005**：从导航栏中移除 "GitHub" 链接（`header.tsx` 中的 `/github` 入口）

## 技术约束

- 不对接新的外部系统；沿用现有 `trpc.github.verifyToken` 和 `trpc.github.saveProfile` API
- 无额外性能要求
- 影响的现有模块：
  - `apps/web/src/routes/users.tsx`（修改：嵌入表单）
  - `apps/web/src/routes/github.tsx`（删除）
  - `apps/web/src/components/header.tsx`（修改：移除 `/github` 导航链接）

## 验收标准

- **AC-001**：访问 `/users` 页面，页面同时展示绑定表单和用户列表
- **AC-002**：在表单中输入有效 GitHub Token，点击"验证"，出现用户信息预览卡片
- **AC-003**：点击"确认保存"，toast 提示成功，表单清空，列表自动刷新并包含新绑定用户
- **AC-004**：访问 `/github` 路由返回 404（路由已移除）
- **AC-005**：导航栏不再出现 "GitHub" 链接
- **AC-006**：`bun run check-types` 通过，无 TypeScript 错误

## 不做的事

- 不对绑定表单的 UI 样式做大幅重新设计，保持现有 Card 组件风格
- 不添加"解绑"功能（超出本次需求范围）
- 不更改 tRPC 路由或数据库 schema

## 待确认

- 无
