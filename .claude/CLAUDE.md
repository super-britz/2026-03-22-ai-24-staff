# 项目说明

## 1. 项目名称和技术栈

**项目名称**: 2026-03-22-ai-24-staff
**生成器**: Better-T-Stack v3.26.0
**包管理器**: Bun 1.3.11
**Monorepo**: Turborepo + Bun Workspaces

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + React Router 7 (SPA 模式, 文件路由) |
| 样式 | Tailwind CSS 4 + shadcn/ui (base-lyra 风格) |
| 后端 | Hono + Node.js |
| API | tRPC 11 (端到端类型安全) |
| 数据库 | PostgreSQL + Drizzle ORM |
| 构建 | Vite 7 (web) / tsdown (server) |
| 代码质量 | Biome (格式化 + Lint, 缩进用 Tab, 双引号) |
| 部署 | Alchemy → Cloudflare (web) |
| 类型检查 | TypeScript 5, strict 模式 |
| 数据验证 | Zod 4 |

---

## 2. 常用命令

### 开发

```bash
bun dev              # 同时启动 web + server
bun dev:web          # 仅启动前端 (localhost:5173)
bun dev:server       # 仅启动后端 (localhost:3000)
```

### 构建 & 类型检查

```bash
bun run build        # 构建所有包
bun run check-types  # TypeScript 类型检查
bun run check        # Biome 格式化 + Lint (自动修复)
```

### 数据库

```bash
bun db:push          # 推送 schema 到数据库 (无迁移文件)
bun db:generate      # 生成迁移文件
bun db:migrate       # 执行迁移
bun db:studio        # 打开 Drizzle Studio (数据库 GUI)
```

### 部署

```bash
bun run deploy       # 部署到 Cloudflare
bun run destroy      # 销毁部署资源
```

---

## 3. 目录结构速查

```
├── apps/
│   ├── web/                          # React Router 前端
│   │   ├── src/
│   │   │   ├── routes/               # 文件路由 (@react-router/fs-routes)
│   │   │   ├── components/           # 应用级组件
│   │   │   ├── utils/                # 工具函数 (trpc client 等)
│   │   │   └── root.tsx              # 根布局
│   │   ├── react-router.config.ts    # ssr: false (SPA 模式)
│   │   ├── vite.config.ts
│   │   ├── components.json           # shadcn/ui 配置
│   │   └── .env                      # VITE_SERVER_URL
│   └── server/                       # Hono 后端
│       ├── src/index.ts              # 入口: CORS + tRPC 挂载, 端口 3000
│       ├── tsdown.config.ts          # 构建配置
│       └── .env                      # CORS_ORIGIN, DATABASE_URL
│
├── packages/
│   ├── api/                          # tRPC 路由定义
│   │   └── src/
│   │       ├── index.ts              # appRouter 导出
│   │       ├── context.ts            # tRPC 上下文 (auth/session 预留)
│   │       └── routers/index.ts      # 路由集合
│   ├── db/                           # 数据库层
│   │   ├── src/
│   │   │   ├── schema/               # Drizzle 表定义
│   │   │   └── index.ts              # Drizzle 客户端导出
│   │   └── drizzle.config.ts         # 迁移配置 (读取 server/.env)
│   ├── env/                          # 环境变量验证 (@t3-oss/env-core)
│   │   └── src/
│   │       ├── server.ts             # DATABASE_URL, CORS_ORIGIN, NODE_ENV
│   │       └── web.ts                # VITE_SERVER_URL
│   ├── ui/                           # 共享 UI 组件 (shadcn/ui)
│   │   └── src/
│   │       ├── components/           # Button, Card, Input 等原语
│   │       ├── styles/globals.css    # Tailwind 全局样式 + CSS 变量
│   │       ├── lib/utils.ts          # cn() 等工具
│   │       └── hooks/                # 共享 Hooks
│   ├── config/                       # 共享 tsconfig.base.json
│   └── infra/                        # Alchemy 部署配置
│       └── alchemy.run.ts            # Cloudflare ReactRouter 部署
│
├── biome.json                        # 代码风格配置
├── turbo.json                        # 任务依赖和缓存
├── bts.jsonc                         # Better-T-Stack 生成记录
└── package.json                      # Workspace 根配置
```

---

## 4. 核心规则

### 模块边界

- **apps/ 只能依赖 packages/**，packages 之间可以互相依赖
- **db** 包是唯一直接访问数据库的模块，其他包通过 api 包调用
- **env** 包统一管理环境变量，分 `server` 和 `web` 两个入口
- **ui** 包只放可复用的通用组件，应用级组件放在 `apps/web/src/components/`
- **api** 包定义 tRPC 路由和业务逻辑，server 只负责挂载

### 通信方式

- 前后端通过 **tRPC** 通信，禁止绕过 tRPC 直接调用 REST 端点
- tRPC 客户端在 `apps/web/src/utils/` 中初始化
- 使用 `@tanstack/react-query` 管理前端数据状态

### 编码约束

- **缩进**: Tab（Biome 强制）
- **引号**: 双引号（Biome 强制）
- **导入**: 自动排序（Biome organizeImports）
- **CSS class 排序**: Tailwind class 按 `useSortedClasses` 规则排序，支持 `clsx`/`cva`/`cn`
- **TypeScript**: strict 模式, `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`
- **模块系统**: ESM only (`"type": "module"`, `verbatimModuleSyntax`)
- **路径别名**: web 用 `@/*` → `./src/*`, server 用 `@/*` → `./src/*`
- **添加 UI 组件**: 通过 `bunx shadcn@latest add <component>` 安装到 `packages/ui`
