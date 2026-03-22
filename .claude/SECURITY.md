# 安全规范

## 1. 认证方案

### 当前状态：待配置

项目尚未集成任何认证系统。`bts.jsonc` 中 `"auth": "none"`。

当前 tRPC 上下文硬编码返回空值：

```typescript
// packages/api/src/context.ts
return {
  auth: null,     // 未实现
  session: null,  // 未实现
};
```

所有 tRPC procedure 均为 `publicProcedure`，无鉴权保护。

### 推荐方案：better-auth

Better-T-Stack 原生支持 better-auth，推荐集成步骤：

1. 通过 `bun create better-t-stack add` 添加 auth addon
2. 在 `packages/db/src/schema/` 中添加 `auth.ts`（用户表、session 表）
3. 在 `packages/api/src/context.ts` 中从请求 header 解析 session
4. 在 `packages/api/src/index.ts` 中创建 `protectedProcedure`
5. Session 存储于 PostgreSQL，通过 Drizzle ORM 管理
6. Token 过期策略：access token 15 分钟，refresh token 7 天（按需调整）

---

## 2. API 安全

### Procedure 鉴权分级

| 级别 | 类型 | 适用场景 | 当前状态 |
|------|------|---------|---------|
| 公开 | `publicProcedure` | 健康检查、登录、注册、公开数据查询 | `healthCheck` 已使用 |
| 需鉴权 | `protectedProcedure` | 用户数据 CRUD、个人设置、业务操作 | **待创建** |
| 管理员 | `adminProcedure` | 用户管理、系统配置、数据导出 | **待创建** |

**强制规则**：

- 新增 procedure **默认使用 `protectedProcedure`**，只有明确公开的才用 `publicProcedure`
- 创建 `protectedProcedure` 时必须在中间件中验证 `ctx.session` 非空，否则抛出 `UNAUTHORIZED`
- `protectedProcedure` 的实现示例：

```typescript
// packages/api/src/index.ts
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.auth) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, session: ctx.session, auth: ctx.auth } });
});
```

### Rate Limiting

**当前状态：未配置。**

配置认证后必须添加限流，推荐方案：

| 端点类型 | 限制 | 实现方式 |
|---------|------|---------|
| 登录/注册 | 5 次/分钟/IP | Hono 中间件 |
| 公开 API | 60 次/分钟/IP | Hono 中间件 |
| 认证 API | 120 次/分钟/用户 | tRPC 中间件 |

### CORS 配置

当前配置（`apps/server/src/index.ts`）：

```typescript
cors({
  origin: env.CORS_ORIGIN,           // 从环境变量读取
  allowMethods: ["GET", "POST", "OPTIONS"],  // 仅允许必要方法
})
```

**规则**：

- `CORS_ORIGIN` 开发环境为 `http://localhost:5173`，生产环境必须设置为实际域名
- **禁止** 设置 `origin: "*"`（通配符）
- **禁止** 添加 `PUT`、`DELETE` 等 tRPC 不需要的 HTTP 方法
- 生产环境如需多域名，使用数组或函数动态匹配，不要用通配符

---

## 3. 输入验证

### Zod 验证强制规则

- 所有 tRPC procedure 的 `.input()` **必须使用 Zod schema 验证**
- **禁止** 使用 `z.any()` 或 `z.unknown()` 作为最终 input 类型
- 字符串字段必须添加长度限制：`z.string().min(1).max(合理上限)`
- 数字字段必须添加范围限制：`z.number().int().min(0).max(合理上限)`
- 分页参数强制限制：`limit` 最大 100，`offset` 最小 0
- 示例：

```typescript
// 正确
.input(z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
}))

// 禁止
.input(z.any())
.input(z.object({ data: z.unknown() }))
```

### 用户输入的过滤和转义

- tRPC + Drizzle 组合天然防止 SQL 注入（参数化查询）
- 前端使用 React JSX 天然防止 XSS（自动转义）
- **禁止** 使用 `dangerouslySetInnerHTML`，除非内容经过专业的 HTML sanitizer（如 DOMPurify）处理
- **禁止** 将用户输入拼接进 SQL 字符串、shell 命令或 URL
- 如果需要富文本，必须先安装 sanitizer 库并配置白名单标签

### 文件上传限制

当前项目无文件上传功能。如需添加，必须遵守：

- 文件大小上限：10MB（可按业务调整）
- 文件类型白名单验证（检查 MIME type 和文件头，不仅依赖扩展名）
- 上传目录与应用目录隔离，禁止上传到 `public/` 或 `src/`
- 生成随机文件名，禁止使用用户提供的原始文件名存储

---

## 4. 数据库安全

### 参数化查询规则

Drizzle ORM 默认使用参数化查询，**禁止绕过**：

```typescript
// 正确：Drizzle 自动参数化
db.select().from(users).where(eq(users.id, userId))

// 禁止：原始 SQL 拼接
db.execute(sql`SELECT * FROM users WHERE id = ${userId}`)  // 这个实际是安全的（tagged template）
db.execute(`SELECT * FROM users WHERE id = '${userId}'`)   // 禁止！SQL 注入风险
```

- 使用 Drizzle 的查询构建器（`select`, `insert`, `update`, `delete`）
- 如必须用原始 SQL，只允许 `sql` tagged template literal（Drizzle 的 `sql` 函数会自动参数化）
- **绝对禁止** 字符串拼接 SQL

### 敏感字段处理

当配置认证后，数据库中可能存在以下敏感字段：

| 字段 | 处理方式 |
|------|---------|
| `password_hash` | **永远不能** 出现在 API 返回值中 |
| `session_token` | 仅在认证流程中使用，不返回给前端 |
| `refresh_token` | 同上 |
| `email` | 仅在必要时返回，列表接口中脱敏 |

**强制规则**：

- 查询用户信息时，使用 Drizzle 的 `columns` 选项排除敏感字段：

```typescript
// 正确
db.query.users.findFirst({
  where: eq(users.id, userId),
  columns: { passwordHash: false },
})

// 禁止：select * 然后在应用层删除字段（数据已经离开数据库）
const user = await db.select().from(users).where(eq(users.id, userId));
delete user.passwordHash; // 太晚了
```

### 行级权限检查

任何涉及用户数据的查询，**必须在 WHERE 条件中验证数据归属**：

```typescript
// 正确：查询时限定 userId
db.select().from(posts)
  .where(and(eq(posts.id, postId), eq(posts.userId, ctx.session.userId)))

// 禁止：仅靠 postId 查询，未验证归属
db.select().from(posts).where(eq(posts.id, postId))
```

- 更新和删除操作同理，必须包含 `userId` 条件
- 管理员操作需要额外的角色检查，不能仅依赖 session 存在

---

## 5. 环境变量

### 密钥管理规则

环境变量通过 `packages/env` 包统一管理，使用 `@t3-oss/env-core` + Zod 验证。

- **服务端变量**（`packages/env/src/server.ts`）：仅在 Node.js 运行时可用

| 变量 | 敏感级别 | 说明 |
|------|---------|------|
| `DATABASE_URL` | **高** | 包含数据库密码 |
| `CORS_ORIGIN` | 低 | 允许的前端域名 |
| `NODE_ENV` | 低 | 运行环境 |

- **前端变量**（`packages/env/src/web.ts`）：会被 Vite 打包进客户端 JS

| 变量 | 敏感级别 | 说明 |
|------|---------|------|
| `VITE_SERVER_URL` | 低 | API 地址，公开可见 |

- **基础设施变量**（`packages/infra/.env`）：

| 变量 | 敏感级别 | 说明 |
|------|---------|------|
| `ALCHEMY_PASSWORD` | **高** | 部署密钥，当前为默认值，**生产前必须修改** |

### 前端变量隔离

- `@t3-oss/env-core` 通过 `clientPrefix: "VITE_"` 强制前端变量必须以 `VITE_` 开头
- **禁止** 在前端代码中导入 `@.../env/server`
- **禁止** 将 `DATABASE_URL`、认证密钥等敏感变量添加 `VITE_` 前缀
- 如果需要新的前端变量，必须确认其内容可以被终端用户看到

### .gitignore 规则

当前 `.gitignore` 已包含：

```
.env
.env*.local
```

**规则**：

- `.env` 文件已被 gitignore（当前 `apps/server/.env` 和 `apps/web/.env` 已提交，因为是模板项目的默认值）
- **生产环境的 `.env` 绝对不能提交到 Git**
- 本地覆盖配置使用 `.env.local`（已被 gitignore）
- 添加新的敏感配置文件时，必须同步更新 `.gitignore`
- 如果发现敏感信息已经提交到 Git 历史，必须使用 `git filter-branch` 或 BFG Repo-Cleaner 清除

---

## 6. 依赖安全

### 审计命令

```bash
# 检查已知漏洞
bun audit

# 如果 bun audit 不可用，使用 npm
npx audit

# 查看过时的依赖
bun outdated
```

### 审计频率

| 场景 | 频率 |
|------|------|
| 日常开发 | 每周一次 `bun audit` |
| 添加新依赖后 | 立即执行 `bun audit` |
| 发布前 | 必须执行，有 high/critical 漏洞则阻断发布 |
| CI/CD | 每次构建自动执行 |

### 依赖更新策略

- **补丁版本**（patch）：自由更新，跑通测试即可
- **次要版本**（minor）：阅读 changelog，确认无 breaking change 后更新
- **主要版本**（major）：单独分支处理，充分测试后合并
- 使用 `bun update` 或手动修改 `package.json` 中的 catalog 版本
- **禁止** 使用不活跃（>1 年未更新）或下载量极低的第三方包，除非无替代方案
- 锁文件 `bun.lock` 必须提交到 Git，确保团队和 CI 使用相同版本
