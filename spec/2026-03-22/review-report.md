# 代码审查报告：GitHub Token 绑定与用户信息存储

> 日期：2026-03-23（第二轮审查，修复后）
> 审查范围：`f6af0e8` (style) + `af65afc` (feat) + 未提交修复
> 审查标准：CODING_GUIDELINES.md + SECURITY.md

---

## 总体评价

所有必修问题已修复，建议项 SG-1 也已采纳。代码质量良好，无阻断性问题，可以提交。

---

## 审查结果

### 通过项 (PASS)

| # | 检查项 | 状态 | 说明 |
|---|--------|------|------|
| 1 | 模块边界 | PASS | db/api/web 分层正确，server 无直接变更 |
| 2 | tRPC 通信 | PASS | 前后端通过 tRPC mutation 通信，未绕过 |
| 3 | Zod 输入验证 | PASS | 两个 procedure 均有 `z.string().min(1).max(255)` 验证 |
| 4 | SQL 注入防护 | PASS | 使用 Drizzle ORM 参数化查询，无字符串拼接 |
| 5 | XSS 防护 | PASS | React JSX 自动转义，无 dangerouslySetInnerHTML |
| 6 | Token 不暴露前端 | PASS | GitHub API 调用在后端进行 |
| 7 | Token 加密存储 | PASS | AES-256-GCM 加密，密钥通过 env 管理 |
| 8 | ENCRYPTION_KEY 隔离 | PASS | 仅在 server env 中，无 VITE_ 前缀 |
| 9 | Schema 规范 | PASS | uuid 主键、snake_case SQL 列名、camelCase 变量名、有 createdAt/updatedAt |
| 10 | 命名规范 | PASS | 文件 kebab-case、组件 PascalCase、router camelCase |
| 11 | 导入排序 | PASS | Biome 自动排序，三层分隔 |
| 12 | Tab 缩进 + 双引号 | PASS | Biome 强制统一 |
| 13 | 组件规范 | PASS | 函数组件、default export、useMutation 使用正确 |
| 14 | 错误处理 | PASS | TRPCError 错误码使用正确，返回值有运行时守卫 |
| 15 | 加密方案 | PASS | AES-256-GCM，随机 IV，authTag 完整性验证 |
| 16 | Upsert 逻辑 | PASS | ON CONFLICT login DO UPDATE，符合需求 |
| 17 | 超时控制 | PASS | fetch 添加 AbortSignal.timeout(10_000) |
| 18 | 用户反馈 | PASS | 保存成功后 toast.success 通知 |

---

### 第一轮问题修复确认

| 编号 | 问题 | 修复状态 | 验证 |
|------|------|---------|------|
| MF-1 | saveProfile 返回值可能 undefined | ✅ 已修复 | 添加 `if (!saved)` 运行时守卫，抛出 TRPCError |
| MF-2 | fetch 缺少超时控制 | ✅ 已修复 | 添加 `signal: AbortSignal.timeout(10_000)` |
| SG-1 | 保存成功后无明确提示 | ✅ 已采纳 | 添加 `toast.success("GitHub 账号绑定成功")` |

---

### 遗留建议 (不阻断提交)

#### SG-2: `avatarUrl` 未做来源验证

**文件**: `apps/web/src/routes/github.tsx:129`
**风险**: 极低。数据来自 GitHub API 经 Zod 验证，React 自动转义属性值。
**建议**: 认证系统就位后可考虑添加域名白名单验证。

#### SG-3: publicProcedure 待迁移

**文件**: `packages/api/src/routers/github.ts`
**说明**: 当前无认证系统，使用 publicProcedure 符合需求文档。SECURITY.md 规定默认应使用 protectedProcedure。
**行动**: 认证系统集成后，将 verifyToken 和 saveProfile 迁移到 protectedProcedure。

---

## 代码质量评分

| 维度 | 评分 (1-5) | 说明 |
|------|-----------|------|
| 正确性 | 5 | 逻辑正确，返回值已添加守卫 |
| 安全性 | 5 | 加密方案合理，有超时控制，输入验证完整 |
| 可读性 | 5 | 代码简洁，函数职责单一 |
| 规范合规 | 5 | 完全符合 CODING_GUIDELINES.md |
| 可维护性 | 5 | 结构清晰，后续迁移简单 |

**综合评分: 5.0 / 5**

---

## 结论

**审查通过**，代码可以提交。
