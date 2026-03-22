# 架构文档

## 1. 技术栈表格

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 前端框架 | React + React Router 7 | 19.2.3 / 7.10.1 | SPA 模式 (`ssr: false`)，文件系统路由 |
| 样式 | Tailwind CSS 4 | 4.1.18 | `@tailwindcss/vite` 插件集成 |
| UI 组件库 | shadcn/ui (base-lyra) | 最新 | 基于 `@base-ui/react`，组件放 `packages/ui` |
| 后端框架 | Hono | 4.8.2 | Node.js 运行时，`@hono/node-server` |
| API 层 | tRPC 11 | 11.7.2 | 端到端类型安全，`httpBatchLink` |
| ORM | Drizzle ORM | 0.45.1 | PostgreSQL，`node-postgres` 驱动 |
| 数据库 | PostgreSQL | — | 连接串通过 `DATABASE_URL` 配置 |
| 数据验证 | Zod 4 | 4.1.13 | 环境变量验证 + tRPC input 验证 |
| 环境变量 | @t3-oss/env-core | 0.13.1 | 分 server/web 两套 schema |
| Monorepo | Turborepo + Bun Workspaces | 2.8.12 / 1.3.11 | `apps/*` + `packages/*` |
| 代码质量 | Biome | 2.2.0 | 格式化 + Lint，Tab 缩进，双引号 |
| 构建工具 | Vite 7 (web) / tsdown (server) | 7.2.7 / 0.16.5 | — |
| 部署 | Alchemy → Cloudflare | 0.87.0 | 仅 web 部署到 Cloudflare |

---

## 2. Monorepo 结构

```
2026-03-22-ai-24-staff/
│
├── apps/
│   ├── web/                    # 前端应用
│   │   ├── src/
│   │   │   ├── root.tsx        # 根布局：QueryClientProvider + ThemeProvider
│   │   │   ├── routes.ts       # flatRoutes() 文件系统路由
│   │   │   ├── routes/
│   │   │   │   └── _index.tsx  # 首页：API 健康检查展示
│   │   │   ├── components/     # 应用级组件 (Header, ModeToggle 等)
│   │   │   ├── utils/
│   │   │   │   └── trpc.ts     # tRPC 客户端 + QueryClient 初始化
│   │   │   └── index.css       # 入口样式，导入 ui/globals.css
│   │   ├── react-router.config.ts  # ssr: false
│   │   ├── vite.config.ts
│   │   ├── components.json    # shadcn/ui CLI 配置
│   │   └── .env               # VITE_SERVER_URL
│   │
│   └── server/                 # 后端应用
│       ├── src/
│       │   └── index.ts        # Hono 入口：CORS + logger + tRPC 挂载，端口 3000
│       ├── tsdown.config.ts    # 构建配置，bundle workspace 依赖
│       └── .env                # CORS_ORIGIN, DATABASE_URL
│
├── packages/
│   ├── api/                    # tRPC 路由 + 业务逻辑
│   │   └── src/
│   │       ├── index.ts        # initTRPC, 导出 router / publicProcedure
│   │       ├── context.ts      # createContext: 接收 HonoContext，返回 {auth, session}
│   │       └── routers/
│   │           └── index.ts    # appRouter 定义，导出 AppRouter 类型
│   │
│   ├── db/                     # 数据库层
│   │   ├── src/
│   │   │   ├── index.ts        # drizzle 客户端实例导出
│   │   │   └── schema/
│   │   │       └── index.ts    # 表定义（当前为空）
│   │   └── drizzle.config.ts   # 迁移配置，读取 apps/server/.env
│   │
│   ├── env/                    # 环境变量验证
│   │   └── src/
│   │       ├── server.ts       # DATABASE_URL, CORS_ORIGIN, NODE_ENV
│   │       └── web.ts          # VITE_SERVER_URL (VITE_ 前缀)
│   │
│   ├── ui/                     # 共享 UI 组件
│   │   └── src/
│   │       ├── components/     # Button, Card, Input, DropdownMenu 等
│   │       ├── styles/
│   │       │   └── globals.css # Tailwind 入口 + CSS 变量 (主题色)
│   │       ├── lib/
│   │       │   └── utils.ts    # cn() 工具函数
│   │       └── hooks/          # 共享 React Hooks
│   │
│   ├── config/                 # 共享 TypeScript 基础配置
│   │   └── tsconfig.base.json  # strict, ESNext, bundler 模块解析
│   │
│   └── infra/                  # 部署配置
│       └── alchemy.run.ts      # Cloudflare ReactRouter 部署脚本
```

---

## 3. 模块边界规则

### apps/web 的导入规则

| 目标包 | 允许/禁止 | 说明 |
|--------|----------|------|
| `@.../ui` | **允许** | UI 原语组件 |
| `@.../api` | **允许** | 仅导入 **类型** (`AppRouter`)，用于 tRPC 客户端类型推导 |
| `@.../env/web` | **允许** | 前端环境变量 |
| `@.../db` | **禁止** | 前端绝不能直接访问数据库 |
| `@.../env/server` | **禁止** | 服务端环境变量含敏感信息 |
| `@.../infra` | **禁止** | 部署配置与运行时无关 |

### apps/server 的导入规则

| 目标包 | 允许/禁止 | 说明 |
|--------|----------|------|
| `@.../api` | **允许** | 挂载 appRouter + createContext |
| `@.../env/server` | **允许** | 服务端环境变量 |
| `@.../db` | **允许** (间接) | 通过 api 包间接使用，server 本身不直接导入 db |
| `@.../ui` | **禁止** | 后端不需要 React 组件 |
| `@.../env/web` | **禁止** | Web 环境变量与后端无关 |

### packages 之间的依赖关系

```
config ← (被所有包的 devDependencies 引用，提供 tsconfig)
  ↑
env ← (被 db, api, web, server 引用)
  ↑
db  ← (被 api 引用)
  ↑
api ← (被 server 引用值，被 web 引用类型)

ui  ← (独立包，仅被 web 引用)
infra ← (独立包，仅被 deploy 脚本使用)
```

| 包 | 可以导入 | 不可以导入 |
|-----|---------|----------|
| `config` | 无依赖 | 任何其他包 |
| `env` | 无 workspace 依赖 | db, api, ui |
| `db` | `env` | api, ui, infra |
| `api` | `db`, `env` | ui, infra |
| `ui` | 无 workspace 依赖 | db, api, env, infra |
| `infra` | 无 workspace 运行时依赖 | db, api, ui |

### 前后端的唯一桥梁

**tRPC 是前端与后端之间唯一的通信桥梁。**

- 前端通过 `@trpc/client` 的 `httpBatchLink` 连接 `${VITE_SERVER_URL}/trpc`
- 后端通过 `@hono/trpc-server` 中间件在 `/trpc/*` 路径挂载 `appRouter`
- **禁止** 前端绕过 tRPC 直接发起 fetch/axios 请求到后端
- **禁止** 后端在 tRPC 路由之外暴露业务 API（`/` 健康检查端点除外）

---

## 4. 数据流向

从浏览器到数据库的完整链路，每一跳标注技术和文件位置：

```
浏览器 (React 组件)
  │
  │  ① useQuery(trpc.xxx.queryOptions())
  │     调用 tRPC hooks，触发 React Query
  │     📄 apps/web/src/routes/_index.tsx
  │
  ▼
@tanstack/react-query
  │
  │  ② QueryClient 管理缓存、重试、错误处理
  │     📄 apps/web/src/utils/trpc.ts
  │
  ▼
@trpc/client (httpBatchLink)
  │
  │  ③ HTTP POST 请求到 ${VITE_SERVER_URL}/trpc/<procedure>
  │     自动 batch 多个请求，JSON 序列化
  │     📄 apps/web/src/utils/trpc.ts
  │
  ▼
Hono 服务器 (localhost:3000)
  │
  │  ④ 请求经过中间件链：
  │     logger() → cors() → trpcServer()
  │     📄 apps/server/src/index.ts
  │
  ▼
@hono/trpc-server 中间件
  │
  │  ⑤ 解析 tRPC 请求，调用 createContext()
  │     创建上下文对象 {auth, session}
  │     📄 packages/api/src/context.ts
  │
  ▼
tRPC Router (appRouter)
  │
  │  ⑥ 路由到对应的 procedure
  │     执行 input 验证 (Zod) → 业务逻辑
  │     📄 packages/api/src/routers/index.ts
  │
  ▼
Drizzle ORM
  │
  │  ⑦ 构建类型安全的 SQL 查询
  │     📄 packages/db/src/index.ts
  │
  ▼
node-postgres (pg)
  │
  │  ⑧ 发送 SQL 到 PostgreSQL
  │     连接串来自 DATABASE_URL
  │
  ▼
PostgreSQL 数据库
```

**返回路径**：数据原路返回，Drizzle 结果 → tRPC 序列化 → HTTP 响应 → React Query 缓存 → 组件重渲染。

---

## 5. 数据库约定

### Schema 文件位置

```
packages/db/src/schema/
  └── index.ts          # 所有表定义的汇总导出
```

- 每个业务域的表定义放在 `packages/db/src/schema/` 下独立文件中
- `index.ts` 负责 re-export 所有 schema，供 Drizzle 客户端使用
- Drizzle 客户端在 `packages/db/src/index.ts` 中初始化，通过 `{ schema }` 注入

### 命名规则

- **表名**：使用 `snake_case` 复数形式（如 `users`, `posts`）
- **列名**：使用 `snake_case`（如 `created_at`, `user_id`）
- **Drizzle 表变量**：使用 `camelCase`（如 `export const users = pgTable("users", {...})`）
- **关系定义**：使用 `relations()` 函数，与表定义放在同一文件

### Migration 管理

| 命令 | 用途 | 场景 |
|------|------|------|
| `bun db:push` | 直接推送 schema 到数据库 | **开发阶段**，快速同步 schema |
| `bun db:generate` | 根据 schema 变更生成迁移文件 | **生产部署前**，生成可审查的 SQL |
| `bun db:migrate` | 执行迁移文件 | **生产部署时**，应用迁移 |
| `bun db:studio` | 启动 Drizzle Studio | 可视化浏览和编辑数据 |

- 迁移文件生成到 `packages/db/src/migrations/`
- `drizzle.config.ts` 从 `apps/server/.env` 读取 `DATABASE_URL`
- 开发阶段推荐用 `db:push`，生产环境必须走 `db:generate` + `db:migrate`

---

## 6. tRPC 路由约定

### Router 文件位置

```
packages/api/src/
  ├── index.ts              # initTRPC，导出 router / publicProcedure
  ├── context.ts            # createContext 函数
  └── routers/
      └── index.ts          # appRouter 主路由（合并所有子路由）
```

### 路由组织规则

- 每个业务域一个 router 文件，放在 `packages/api/src/routers/` 下
- 子路由文件导出一个 `router({...})` 实例
- 在 `routers/index.ts` 中合并所有子路由到 `appRouter`
- 示例结构：

```typescript
// packages/api/src/routers/user.ts
export const userRouter = router({
  list: publicProcedure.query(async () => { ... }),
  create: publicProcedure.input(z.object({...})).mutation(async () => { ... }),
});

// packages/api/src/routers/index.ts
export const appRouter = router({
  healthCheck: publicProcedure.query(() => "OK"),
  user: userRouter,
});
```

### Context 提供什么

`createContext()` 接收 Hono 的 `Context` 对象，当前返回：

```typescript
{
  auth: null,     // 预留：认证信息
  session: null,  // 预留：会话信息
}
```

当添加认证时，需要：
1. 在 `context.ts` 中从 Hono Context 提取认证信息
2. 创建 `protectedProcedure`（在 `publicProcedure` 基础上添加 auth 中间件）

### Input Validation

- 使用 **Zod** 进行 input 验证
- 通过 `.input(z.object({...}))` 链式调用
- Zod schema 可以从 Drizzle schema 派生（使用 `createInsertSchema` / `createSelectSchema`）

---

## 7. ADR（架构决策记录）

### ADR-001: 使用 Turborepo Monorepo 架构

**状态**: 已采纳
**日期**: 2026-03-22

**上下文**:

项目需要同时管理前端 (React Router)、后端 (Hono)、共享 UI 组件、数据库层、API 层、环境变量和基础设施配置等多个模块。面临两个选择：

1. **Polyrepo**: 每个模块一个独立仓库
2. **Monorepo**: 所有模块放在一个仓库中，使用工具管理

**决策**:

采用 **Turborepo + Bun Workspaces** 的 Monorepo 方案。

**理由**:

1. **端到端类型安全**: tRPC 要求前端能直接导入后端的 `AppRouter` 类型。Monorepo 下通过 `workspace:*` 依赖即可实现，无需发布 npm 包或维护类型声明文件。

2. **共享代码无摩擦**: `packages/env`、`packages/db`、`packages/ui` 等共享包可以被多个 app 直接引用，修改后立即生效，无需 publish → install 流程。

3. **原子提交**: 涉及多个包的变更（如修改 DB schema + 更新 API router + 调整前端调用）可以在一次 commit 中完成，保证一致性。

4. **统一工具链**: Biome、TypeScript、Turbo 配置集中管理，所有包共享一套代码风格和构建规则。

5. **增量构建**: `turbo.json` 配置了任务依赖关系（`"dependsOn": ["^build"]`），只重新构建变更的包及其下游依赖，加速 CI/CD。

**代价**:

- 仓库体积随模块增加而增长
- 需要理解 workspace 依赖解析机制
- CI 需要配置正确的缓存策略

**替代方案被否决的原因**:

Polyrepo 在 tRPC 场景下会导致类型同步困难。每次修改 API 都需要先发布类型包，再在前端更新依赖，开发体验差且容易类型不一致。

---

*后续架构变动请追加 ADR-002, ADR-003, ...*
