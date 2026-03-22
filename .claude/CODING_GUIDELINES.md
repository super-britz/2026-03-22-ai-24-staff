# 编码规范

## 1. TypeScript 规则

### strict 模式

所有包统一继承 `packages/config/tsconfig.base.json`，已开启的严格选项：

```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noFallthroughCasesInSwitch": true,
  "verbatimModuleSyntax": true,
  "isolatedModules": true,
  "forceConsistentCasingInFileNames": true
}
```

### any 禁用策略

- **禁止** 使用 `any` 类型，Biome recommended 规则已包含 `noExplicitAny`
- 如遇到第三方库类型不完善，使用 `unknown` + 类型守卫代替 `any`
- 唯一例外：`(import.meta as any).env`（env 包中已有的历史写法）

### 类型标注规则

- **不标注可推导的类型**：Biome 规则 `noInferrableTypes: "error"` 禁止冗余类型标注
- **必须标注**：函数参数、函数返回值（公开 API）、复杂对象
- **使用 `type` 导入**：`verbatimModuleSyntax` 要求 `import type { ... }` 导入类型

```typescript
// 正确
import type { Context } from "./context";
const name = "hello";                          // 不需要标注，可推导
function getUser(id: string): Promise<User> {} // 参数和返回值需要标注

// 错误
import { Context } from "./context";           // 类型必须用 import type
const name: string = "hello";                  // noInferrableTypes 报错
```

---

## 2. 命名规范

以下规范从项目现有代码中提取：

| 类别 | 格式 | 示例（来源） |
|------|------|-------------|
| **文件名（组件）** | `kebab-case.tsx` | `theme-provider.tsx`, `mode-toggle.tsx`, `header.tsx` |
| **文件名（工具/路由）** | `kebab-case.ts` | `trpc.ts`, `routes.ts` |
| **文件名（路由页面）** | `_kebab-case.tsx` | `_index.tsx` |
| **React 组件名** | `PascalCase` | `ModeToggle`, `ThemeProvider`, `Header` |
| **普通函数名** | `camelCase` | `createContext`, `createEnv` |
| **常量（配置对象）** | `camelCase` | `queryClient`, `trpcClient`, `appRouter` |
| **常量（纯值）** | `UPPER_SNAKE_CASE` | `TITLE_TEXT` |
| **类型/接口名** | `PascalCase` | `Context`, `AppRouter`, `CreateContextOptions` |
| **tRPC router 名** | `camelCase` + `Router` 后缀 | `appRouter`, `userRouter` |
| **tRPC procedure 名** | `camelCase` | `healthCheck` |
| **数据库表名（SQL）** | `snake_case` 复数 | `users`, `posts` |
| **数据库列名（SQL）** | `snake_case` | `created_at`, `user_id` |
| **Drizzle 表变量名** | `camelCase` | `export const users = pgTable(...)` |
| **环境变量** | `UPPER_SNAKE_CASE` | `DATABASE_URL`, `CORS_ORIGIN` |
| **前端环境变量** | `VITE_` + `UPPER_SNAKE_CASE` | `VITE_SERVER_URL` |
| **CSS 类名** | Tailwind 工具类 | 通过 `cn()` 组合 |
| **workspace 包名** | `@项目名/kebab-case` | `@2026-03-22-ai-24-staff/api` |

---

## 3. 文件组织

### apps/web/src/

```
src/
├── routes.ts               # flatRoutes() 文件路由配置
├── root.tsx                # 根布局（Provider 嵌套、全局 ErrorBoundary）
├── index.css               # 入口样式（仅导入 ui/globals.css）
├── routes/
│   ├── _index.tsx          # 首页
│   ├── about.tsx           # 其他页面...
│   └── dashboard/
│       ├── _index.tsx      # /dashboard
│       └── settings.tsx    # /dashboard/settings
├── components/             # 应用级组件（Header, ModeToggle 等）
│   ├── header.tsx
│   └── theme-provider.tsx
├── hooks/                  # 应用级自定义 hooks
├── utils/                  # 工具函数（trpc 客户端等）
│   └── trpc.ts
└── lib/                    # 第三方库的封装和配置
```

**规则**：
- 路由页面文件放 `routes/`，React Router 文件路由自动映射
- 跨页面复用的组件放 `components/`
- 仅单个页面使用的组件，放在该页面文件内或同目录下
- 通用 UI 组件不放这里，放 `packages/ui`

### apps/server/src/

```
src/
├── index.ts                # Hono 入口（中间件注册 + tRPC 挂载 + 启动）
├── middleware/             # Hono 中间件（auth、rate-limit 等）
├── services/              # 业务逻辑层（被 tRPC router 调用）
└── lib/                   # 服务端工具函数
```

**规则**：
- `index.ts` 只做中间件注册和服务启动，业务逻辑不放这里
- 业务逻辑放 `packages/api/src/routers/` 或 `services/`（见第 4 节）

### packages/db/src/

```
src/
├── index.ts                # Drizzle 客户端导出
├── schema/
│   ├── index.ts            # 汇总 re-export 所有表
│   ├── users.ts            # 用户表 + 关系
│   └── posts.ts            # 帖子表 + 关系
└── migrations/             # drizzle-kit 自动生成的迁移文件
```

**规则**：
- 每个业务域一个 schema 文件
- `schema/index.ts` 只做 re-export，不定义表
- 迁移文件由 `drizzle-kit generate` 生成，不手动编辑

---

## 4. tRPC 最佳实践

### 好的写法

简单逻辑直接写在 procedure 中；复杂业务逻辑抽到独立函数：

```typescript
// packages/api/src/routers/user.ts
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@2026-03-22-ai-24-staff/db";
import { users } from "@2026-03-22-ai-24-staff/db/schema";

import { protectedProcedure, publicProcedure, router } from "../index";

export const userRouter = router({
  // 简单查询：直接写
  list: protectedProcedure.query(async () => {
    return db.select({
      id: users.id,
      name: users.name,
      email: users.email,
    }).from(users);
  }),

  // 复杂业务：input 验证 → 调用逻辑 → 返回结果
  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      bio: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(users)
        .set({ name: input.name, bio: input.bio })
        .where(eq(users.id, ctx.session.userId))
        .returning({ id: users.id, name: users.name });

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return updated;
    }),
});
```

### 不好的写法

```typescript
// ❌ 不好：没有 input 验证
updateProfile: protectedProcedure.mutation(async ({ ctx, input }: any) => {
  // ❌ 不好：用了 any
  await db.execute(`UPDATE users SET name = '${input.name}'`);
  // ❌ 不好：字符串拼接 SQL
  // ❌ 不好：没有验证数据归属
  // ❌ 不好：没有返回值
}),

// ❌ 不好：在 router 里写大段业务逻辑（发邮件、调外部 API、复杂计算）
createOrder: protectedProcedure
  .input(orderSchema)
  .mutation(async ({ ctx, input }) => {
    // 50 行验证库存...
    // 30 行计算价格...
    // 20 行调用支付 API...
    // 10 行发送确认邮件...
    // ❌ 应该拆到 services/ 中
  }),
```

### 业务逻辑放哪里？

| 复杂度 | 放在哪里 | 说明 |
|--------|---------|------|
| 简单 CRUD | 直接写在 procedure handler 里 | 1-10 行的查询/更新 |
| 中等逻辑 | 同文件提取为独立函数 | 可测试、可复用 |
| 复杂业务 | `packages/api/src/services/` | 涉及多个表、外部 API、事务 |

---

## 5. Drizzle 最佳实践

### Schema 定义规范

```typescript
// packages/db/src/schema/users.ts
import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { posts } from "./posts";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));
```

**规则**：
- 每张表必须有 `id` 主键（推荐 `uuid`）
- 必须有 `createdAt` 和 `updatedAt` 时间戳
- 列定义用 `camelCase` 变量名，SQL 列名用 `snake_case` 字符串
- 关系定义和表定义放同一文件
- 在 `schema/index.ts` 中 re-export

### Migration 工作流

```bash
# 开发阶段：快速同步（不生成迁移文件）
bun db:push

# 准备上线：生成迁移
bun db:generate

# 检查生成的 SQL 文件（packages/db/src/migrations/）

# 生产部署
bun db:migrate
```

---

## 6. React 组件规范

### 函数组件

项目统一使用函数组件，从现有代码提取的模式：

```typescript
// 默认导出：页面组件和布局组件
export default function Home() { ... }
export default function Header() { ... }

// 命名导出：可复用组件
export function ModeToggle() { ... }
export function ThemeProvider({ children, ...props }: Props) { ... }
```

**规则**：
- 页面组件（routes 下）使用 `export default function`
- 可复用组件使用 `export function`（命名导出）
- **禁止** 使用 `class` 组件
- **禁止** 使用 `React.FC` 类型（直接标注 props 参数）

### Hooks 使用规则

- 数据获取统一使用 `useQuery(trpc.xxx.queryOptions())`
- 数据变更使用 `useMutation`
- 遵循 React Hooks 规则（Biome `useExhaustiveDependencies` 已启用）
- 自定义 hooks 以 `use` 开头，放 `hooks/` 目录

### 状态管理

- 服务端状态：`@tanstack/react-query`（通过 tRPC 集成）
- 客户端状态：`useState` / `useReducer`（简单场景）
- 主题状态：`next-themes`
- **不引入额外状态管理库**（如 zustand/jotai），除非 React Query 不能覆盖

### 组件拆分时机

- 超过 100 行 → 考虑拆分
- 有独立的交互逻辑 → 拆分
- 被多个页面使用 → 拆到 `components/`
- 被多个应用使用 → 拆到 `packages/ui`

---

## 7. 错误处理

### tRPC 错误码使用规范

| 错误码 | 含义 | 使用场景 |
|--------|------|---------|
| `BAD_REQUEST` | 请求参数无效 | Zod 验证失败（自动抛出） |
| `UNAUTHORIZED` | 未登录 | session 不存在 |
| `FORBIDDEN` | 无权限 | 已登录但无权执行操作 |
| `NOT_FOUND` | 资源不存在 | 查询返回空结果 |
| `CONFLICT` | 资源冲突 | 唯一约束违反（如重复邮箱） |
| `INTERNAL_SERVER_ERROR` | 服务器内部错误 | 未预期的异常 |

```typescript
// 正确
throw new TRPCError({
  code: "NOT_FOUND",
  message: "用户不存在",
});

// 错误：用 BAD_REQUEST 表示资源不存在
throw new TRPCError({ code: "BAD_REQUEST", message: "用户不存在" });
```

### 后端错误处理

- Zod input 验证失败 → tRPC 自动返回 `BAD_REQUEST`
- 业务错误 → 手动抛出 `TRPCError` 并附带 `message`
- 未预期异常 → tRPC 自动捕获并返回 `INTERNAL_SERVER_ERROR`
- **禁止** 在 procedure 中 `try/catch` 后返回 `{ error: ... }` 对象，必须抛出 `TRPCError`

### 前端错误处理

当前已配置全局错误处理（`apps/web/src/utils/trpc.ts`）：

```typescript
queryCache: new QueryCache({
  onError: (error, query) => {
    toast.error(error.message, {
      action: { label: "retry", onClick: query.invalidate },
    });
  },
}),
```

- 全局错误：QueryCache `onError` 统一弹出 toast
- 页面级错误：React Router `ErrorBoundary` 兜底
- 局部错误：在组件中使用 `error` 状态自定义展示

---

## 8. Git 提交规范

### Conventional Commits 格式

```
<type>: <简短描述>
```

从项目现有提交记录来看，使用简洁的中英文描述皆可。推荐格式：

| type | 含义 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat: 添加用户注册接口` |
| `fix` | 修复 Bug | `fix: 修复登录页面白屏问题` |
| `docs` | 文档变更 | `docs: 添加架构文档` |
| `refactor` | 重构（不改变行为） | `refactor: 抽取用户验证中间件` |
| `style` | 代码格式（不影响逻辑） | `style: 应用 Biome 格式化` |
| `chore` | 构建/工具/依赖 | `chore: 升级 drizzle-orm 到 0.46` |
| `test` | 测试 | `test: 添加用户路由单元测试` |
| `perf` | 性能优化 | `perf: 优化列表查询添加索引` |

### 分支策略

| 分支 | 用途 | 规则 |
|------|------|------|
| `main` | 主分支 | 保持可部署状态，禁止直接 push |
| `feat/<name>` | 功能分支 | 从 main 切出，完成后 PR 合并 |
| `fix/<name>` | 修复分支 | 同上 |
| `chore/<name>` | 杂务分支 | 依赖更新、配置修改等 |

---

## 9. Import 顺序

Biome `organizeImports: "on"` 自动管理导入排序。从现有代码提取的顺序规则：

### 排序层级（从上到下）

```typescript
// 1. 副作用导入（无绑定）
import "dotenv/config";
import "./index.css";

// 2. 外部包（node_modules）
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";

// 3. Workspace 包（@2026-03-22-ai-24-staff/*）
import { db } from "@2026-03-22-ai-24-staff/db";
import { Button } from "@2026-03-22-ai-24-staff/ui/components/button";
import { env } from "@2026-03-22-ai-24-staff/env/server";

// 4. 路径别名（@/*）
import Header from "@/components/header";
import { trpc } from "@/utils/trpc";

// 5. 相对路径导入
import { publicProcedure, router } from "../index";
import type { Context } from "./context";
```

### 规则

- 各组之间用 **空行** 分隔
- `type` 导入使用 `import type { ... }` 语法（`verbatimModuleSyntax` 强制）
- 同组内按字母顺序排列（Biome 自动处理）
- 运行 `bun run check` 自动修复导入排序
