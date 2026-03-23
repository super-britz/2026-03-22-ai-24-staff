# 任务清单：GitHub Token 绑定与用户信息存储
> 日期：2026-03-22
> 设计文档：spec/2026-03-22/design.md
> 任务总数：7
> 复杂度分布：S: 4, M: 3, C: 0

## 执行顺序

### 第一组：数据层（顺序）
TASK-001 → TASK-002

### 第二组：API层（顺序，因 crypto 是 router 的依赖）
TASK-003 → TASK-004

### 第三组：前端（顺序）
TASK-005 → TASK-006

### 第四组：集成（顺序）
TASK-007

## 任务详情

### TASK-001：创建 github_profiles 数据库 schema
- 状态：⏳ 待开始
- 复杂度：S
- 依赖：无
- 文件变更：
  - `packages/db/src/schema/github-profiles.ts`（新建）
  - `packages/db/src/schema/index.ts`（修改）
- 具体内容：
  - 创建 github_profiles 表，包含 id、login（unique）、name、avatar_url、bio、email、public_repos、followers、encrypted_token、created_at、updated_at
  - 在 schema/index.ts 中 re-export
- 验收标准：
  - [ ] 表定义符合 Drizzle 规范（uuid 主键、snake_case SQL 列名、camelCase 变量名）
  - [ ] schema/index.ts 正确导出
- 验证命令：`bun run check-types`

### TASK-002：推送 schema 到数据库并新增 ENCRYPTION_KEY 环境变量
- 状态：⏳ 待开始
- 复杂度：S
- 依赖：TASK-001
- 文件变更：
  - `packages/env/src/server.ts`（修改）
  - `apps/server/.env`（修改）
- 具体内容：
  - 在 env/server.ts 中新增 ENCRYPTION_KEY 验证（z.string().length(64)）
  - 在 apps/server/.env 中添加 ENCRYPTION_KEY（生成随机 64 位 hex）
  - 执行 `bun db:push` 同步 schema 到数据库
- 验收标准：
  - [ ] ENCRYPTION_KEY 环境变量在 server env 中定义
  - [ ] `bun db:push` 成功执行
- 验证命令：`bun run check-types && bun db:push`

### TASK-003：创建 Token 加密工具函数
- 状态：⏳ 待开始
- 复杂度：S
- 依赖：TASK-002
- 文件变更：
  - `packages/api/src/lib/crypto.ts`（新建）
- 具体内容：
  - 使用 Node.js 内置 crypto 模块实现 AES-256-GCM 加密/解密
  - encrypt(plaintext: string): string — 返回 "iv:authTag:ciphertext" 格式
  - decrypt(ciphertext: string): string — 解密还原
  - 密钥从 env.ENCRYPTION_KEY 读取
- 验收标准：
  - [ ] encrypt 和 decrypt 函数导出
  - [ ] 加密后可正确解密还原
- 验证命令：`bun run check-types`

### TASK-004：创建 GitHub tRPC 路由
- 状态：⏳ 待开始
- 复杂度：M
- 依赖：TASK-003
- 文件变更：
  - `packages/api/src/routers/github.ts`（新建）
  - `packages/api/src/routers/index.ts`（修改）
- 具体内容：
  - 实现 github.verifyToken mutation：接收 token，调用 GitHub API，返回用户信息
  - 实现 github.saveProfile mutation：接收 token，验证+获取信息，加密 token，upsert 到数据库
  - 在 appRouter 中挂载 githubRouter
  - 所有 procedure 使用 Zod 输入验证
- 验收标准：
  - [ ] verifyToken 能正确调用 GitHub API
  - [ ] saveProfile 能加密 token 并 upsert 到数据库
  - [ ] 无效 token 返回 TRPCError
  - [ ] appRouter 正确挂载 github router
- 验证命令：`bun run check-types`

### TASK-005：安装 Avatar 组件并创建 GitHub 绑定页面
- 状态：⏳ 待开始
- 复杂度：M
- 依赖：TASK-004
- 文件变更：
  - `packages/ui/src/components/avatar.tsx`（新建，shadcn 安装）
  - `apps/web/src/routes/github.tsx`（新建）
- 具体内容：
  - 安装 shadcn/ui Avatar 组件
  - 创建 /github 路由页面，包含：
    - Token 输入表单（Card + Input + Button）
    - 用户信息预览区域（Avatar + 用户详情）
    - 确认保存/取消按钮
  - 使用 useMutation 调用 verifyToken 和 saveProfile
  - 处理 loading、error、success 状态
- 验收标准：
  - [ ] 页面在 /github 路径可访问
  - [ ] Token 输入框为密码类型
  - [ ] 验证成功后显示用户信息预览
  - [ ] 确认保存后调用 saveProfile
  - [ ] 错误状态有提示信息
- 验证命令：`bun run check-types`

### TASK-006：添加导航链接到 Header
- 状态：⏳ 待开始
- 复杂度：S
- 依赖：TASK-005
- 文件变更：
  - `apps/web/src/components/header.tsx`（修改）
- 具体内容：
  - 在 Header 组件中添加到 /github 的导航链接
- 验收标准：
  - [ ] Header 中有 GitHub 绑定的入口链接
  - [ ] 链接正确跳转到 /github
- 验证命令：`bun run check-types`

### TASK-007：端到端集成验证
- 状态：⏳ 待开始
- 复杂度：M
- 依赖：TASK-006
- 文件变更：无新文件，可能需要微调
- 具体内容：
  - 运行 `bun run check-types` 确认全项目类型安全
  - 运行 `bun run check` 确认 Biome 格式化和 Lint 通过
  - 修复发现的任何问题
- 验收标准：
  - [ ] `bun run check-types` 退出码为 0
  - [ ] `bun run check` 退出码为 0
- 验证命令：`bun run check-types && bun run check`

## 复杂度评估
- 复杂任务（C）：无
- 可并行的组：第二组和第三组理论上可并行，但第三组依赖第四组的 tRPC 类型，实际需顺序执行
- 建议：单 Agent
- 原因：所有任务均为 S 或 M 级别，总共 7 个任务，无需 Agent Team
