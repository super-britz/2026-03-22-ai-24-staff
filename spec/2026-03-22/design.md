# 架构设计：GitHub Token 绑定与用户信息存储
> 日期：2026-03-22
> 需求文档：spec/2026-03-22/requirements.md

## 架构概览

在现有 tRPC + Drizzle 架构上新增 GitHub 绑定功能：前端表单页面通过 tRPC 调用后端，后端验证 GitHub Token、获取用户信息、加密 Token 后存入 PostgreSQL。

涉及模块：
- `packages/db` — 新增 github_profiles 表
- `packages/api` — 新增 github tRPC router
- `packages/env` — 新增 ENCRYPTION_KEY 环境变量
- `apps/web` — 新增 /github 路由页面
- `apps/server` — 无代码变更（自动挂载新 router）

## Drizzle Schema 变更

### 新增表：github_profiles

```typescript
// packages/db/src/schema/github-profiles.ts
import { pgTable, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";

export const githubProfiles = pgTable("github_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  login: text("login").notNull().unique(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  email: text("email"),
  publicRepos: integer("public_repos").notNull().default(0),
  followers: integer("followers").notNull().default(0),
  encryptedToken: text("encrypted_token").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

Migration 策略：开发阶段使用 `bun db:push` 直接同步。

### 更新 schema/index.ts

```typescript
// packages/db/src/schema/index.ts
export * from "./github-profiles";
```

## tRPC 路由设计

### 新增 router：githubRouter

文件：`packages/api/src/routers/github.ts`

#### Procedure 1：github.verifyToken

- 类型：mutation（因为会调用外部 API，有副作用）
- 权限：publicProcedure（当前无认证系统）
- 输入：`z.object({ token: z.string().min(1).max(255) })`
- 逻辑：
  1. 使用 token 调用 `https://api.github.com/user`
  2. 成功则返回用户信息
  3. 失败则抛出 TRPCError
- 输出：`{ login, name, avatarUrl, bio, email, publicRepos, followers }`

#### Procedure 2：github.saveProfile

- 类型：mutation
- 权限：publicProcedure
- 输入：`z.object({ token: z.string().min(1).max(255) })`
- 逻辑：
  1. 再次调用 GitHub API 验证 token 并获取最新信息（防止预览后信息变更）
  2. 使用 AES-256-GCM 加密 token
  3. 使用 Drizzle 的 upsert（ON CONFLICT login DO UPDATE）写入数据库
- 输出：`{ id, login, name }`

### 更新 appRouter

```typescript
// packages/api/src/routers/index.ts
import { githubRouter } from "./github";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => "OK"),
  github: githubRouter,
});
```

## Token 加密方案

### 加密工具

文件：`packages/api/src/lib/crypto.ts`

- 算法：AES-256-GCM（Node.js 内置 crypto 模块）
- 密钥：从环境变量 `ENCRYPTION_KEY` 读取（32 字节 hex 字符串）
- 格式：`iv:authTag:ciphertext`（Base64 编码存储）
- 提供 `encrypt(plaintext)` 和 `decrypt(ciphertext)` 两个函数

### 环境变量变更

在 `packages/env/src/server.ts` 中新增：
```typescript
ENCRYPTION_KEY: z.string().length(64), // 32 bytes hex
```

在 `apps/server/.env` 中新增：
```
ENCRYPTION_KEY=<64位hex字符串>
```

## 前端页面/组件设计

### 新增路由：/github

文件：`apps/web/src/routes/github.tsx`

### 页面结构

使用两步流程：

**步骤 1：Token 输入**
- Card 容器
- Input（type="password"）+ Label
- Button（提交）
- 使用 `useMutation(trpc.github.verifyToken.mutationOptions())` 调用后端

**步骤 2：信息预览与确认**
- Card 容器展示用户信息
- 头像（img）+ login + name + bio + email + publicRepos + followers
- Button（确认保存）+ Button（取消）
- 使用 `useMutation(trpc.github.saveProfile.mutationOptions())` 保存

### 使用的 shadcn/ui 组件

已有组件（无需安装）：
- `Button` — 提交、确认、取消按钮
- `Card`, `CardHeader`, `CardContent`, `CardFooter` — 容器
- `Input` — Token 输入框
- `Label` — 表单标签
- `Skeleton` — 加载状态

需要新增安装：
- `Avatar` — 展示 GitHub 头像（`bunx shadcn@latest add avatar`）

### 导航入口

在 `apps/web/src/components/header.tsx` 中添加到 /github 的导航链接。

## 安全审查

基于 SECURITY.md 检查：

| 检查项 | 状态 | 说明 |
|--------|------|------|
| Token 不暴露到前端网络请求 | ✅ | Token 通过 tRPC POST 发送到后端，GitHub API 调用在后端进行 |
| 输入验证 | ✅ | 所有 procedure 使用 Zod 验证，token 限制 min(1).max(255) |
| Token 加密存储 | ✅ | AES-256-GCM 加密后存储，密钥通过环境变量管理 |
| SQL 注入防护 | ✅ | 使用 Drizzle ORM 参数化查询 |
| ENCRYPTION_KEY 不暴露 | ✅ | 仅在 server env 中定义，不添加 VITE_ 前缀 |
| XSS 防护 | ✅ | React JSX 自动转义，不使用 dangerouslySetInnerHTML |

## 架构决策（ADR）

### ADR-002: Token 加密使用 AES-256-GCM

**背景**：需求要求 GitHub Token 加密存储，后续可能需要解密使用。
**选项**：
1. bcrypt 单向哈希 — 无法解密，不满足后续需求
2. AES-256-CBC — 可解密但缺少完整性验证
3. AES-256-GCM — 可解密 + 自带完整性验证（authTag）

**决定**：使用 AES-256-GCM。
**理由**：Token 后续需要解密使用（拉取更多 GitHub 数据），需要可逆加密。GCM 模式自带 authTag 保证密文完整性。使用 Node.js 内置 crypto 模块，无需引入第三方依赖。符合 ARCHITECTURE.md 中"禁止使用不活跃或下载量极低的第三方包"的原则。

### ADR-003: GitHub API 调用放在 tRPC mutation 中

**背景**：需要调用 GitHub API 验证 token 并获取用户信息。
**选项**：
1. 前端直接调用 GitHub API
2. 后端 tRPC procedure 中调用

**决定**：后端调用。
**理由**：遵循 ARCHITECTURE.md 中"tRPC 是前端与后端之间唯一的通信桥梁"的规则。避免 Token 暴露在前端网络请求中（SECURITY.md 要求）。

## 影响分析

### 新增文件
- `packages/db/src/schema/github-profiles.ts` — GitHub 用户表定义
- `packages/api/src/routers/github.ts` — GitHub tRPC 路由
- `packages/api/src/lib/crypto.ts` — 加密工具函数
- `apps/web/src/routes/github.tsx` — GitHub 绑定页面

### 修改文件
- `packages/db/src/schema/index.ts` — 导出新表
- `packages/api/src/routers/index.ts` — 挂载 github router
- `packages/env/src/server.ts` — 新增 ENCRYPTION_KEY
- `apps/server/.env` — 新增 ENCRYPTION_KEY 配置
- `apps/web/src/components/header.tsx` — 添加导航链接

### 对现有功能的影响
- 无破坏性变更
- healthCheck 路由不受影响
- 新增数据库表不影响现有表（当前无表）

### 向后兼容性
- 完全向后兼容，纯增量变更
