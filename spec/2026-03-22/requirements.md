# 需求：GitHub Token 绑定与用户信息存储
> 日期：2026-03-22
> 来源：手动描述
> 优先级：P1

## 业务背景
用户自助绑定 GitHub 账号，方便系统获取开发者信息。所有注册用户均可使用此功能。成功标准：用户输入 GitHub Personal Access Token 后能看到对应的 GitHub 用户信息，并成功保存到数据库中。

## 功能需求

### REQ-001：GitHub Token 输入表单
用户在前端页面输入 GitHub Personal Access Token，表单包含一个 token 输入框和提交按钮。Token 输入框应为密码类型（隐藏显示）。

### REQ-002：后端验证 Token 并获取用户信息
用户提交 token 后，后端通过 tRPC 接收 token，调用 GitHub API (`https://api.github.com/user`) 验证 token 有效性并获取用户信息。需要获取的字段：login、name、avatar_url、bio、email、public_repos、followers。

### REQ-003：用户信息预览与确认
后端验证成功后，前端展示 GitHub 用户信息预览（头像、用户名、简介、邮箱、公开仓库数、粉丝数），用户确认后再执行保存操作。

### REQ-004：保存用户信息到数据库
用户确认保存后，后端将 GitHub 用户信息和加密后的 token 存储到 PostgreSQL 数据库。如果同一个 GitHub 用户（按 login 判断）已存在，则更新信息；否则新增记录。

## 技术约束
- GitHub API 调用必须在后端进行（通过 tRPC），避免 token 暴露在前端网络请求中
- Token 必须加密后存储到数据库（后续可能需要用 token 拉取更多数据）
- 前后端通过 tRPC 通信，遵循项目 ARCHITECTURE.md 的模块边界规则
- 数据库 schema 使用 Drizzle ORM 定义，放在 packages/db/src/schema/ 下
- 前端使用 shadcn/ui 组件，样式遵循 Tailwind CSS 4
- 当前项目无认证系统，所有 procedure 使用 publicProcedure

## 验收标准

### AC-001：Token 输入与提交
- 页面上有一个表单，包含 token 输入框（密码类型）和提交按钮
- 输入框为空时提交按钮不可用
- 提交时显示 loading 状态

### AC-002：Token 验证与信息获取
- 有效 token 提交后，后端成功调用 GitHub API 返回用户信息
- 无效 token 提交后，前端显示明确的错误提示信息
- GitHub API 调用超时或失败时，显示网络错误提示

### AC-003：用户信息预览
- 验证成功后，页面展示用户头像、login、name、bio、email、public_repos、followers
- 用户可以选择"确认保存"或"取消"

### AC-004：数据持久化
- 确认保存后，用户信息和加密后的 token 写入数据库
- 同一 GitHub 用户（login 相同）重复绑定时，更新已有记录而非重复插入
- 保存成功后显示成功提示

### AC-005：类型安全与代码规范
- `bun run check-types` 通过
- `bun run check` 通过（Biome 格式化 + Lint）
- 所有 tRPC procedure 有 Zod 输入验证

## 不做的事
- 不做 GitHub OAuth 登录流程
- 不做多 token 管理（每个用户只绑定一个 GitHub 账号）
- 不做认证系统（当前所有接口为 publicProcedure）
- 不做 token 权限范围检查（只验证 token 是否有效）

## 待确认
- 无
