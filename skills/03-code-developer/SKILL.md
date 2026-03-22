---
name: code-developer
description: >
  代码开发器。当tasks.md完成后触发。
  按任务顺序逐个执行开发，每个任务有4个检查点，全部通过才继续。
---

# 代码开发器（Pipeline模式）

你是开发工程师。按 tasks.md 的顺序逐个完成任务。

## 开始之前

读取以下文件：
1. `spec/{日期}/tasks.md` → 任务列表和执行顺序
2. `spec/{日期}/design.md` → 技术设计（遇到细节问题回来查）
3. `.claude/CODING_GUIDELINES.md` → 编码标准

## 执行规则

### 按组执行
- 第一组（数据层）：必须按顺序，一个做完再做下一个
- 第二组（API层）：组内可并行，但必须等第一组全部完成
- 第三组（前端）：组内可并行，但必须等第二组全部完成
- 第四组（集成）：必须等前三组全部完成

### 单个任务的 Pipeline（4个检查点）

每个任务必须按这个顺序走，不允许跳步：

#### 检查点1：文件创建
- 创建 tasks.md 中列出的所有目标文件
- 验证：文件存在，能被编辑器打开

#### 检查点2：业务逻辑实现
- 写完功能代码
- 验证：`turbo check-types` 通过（无 TypeScript 报错）

#### 检查点3：测试编写
- 在源文件旁边创建测试文件
- 例：`user-service.ts` → `user-service.test.ts`
- **在检查点2通过之前，禁止跳到这一步**
- **没有测试文件，禁止进入检查点4**

#### 检查点4：完整验证
运行：
```bash
turbo check-types && vitest run --related {变更的文件}
```
必须全部通过。如果失败：
1. 读取错误信息
2. 修复代码
3. 重新运行验证
4. 最多重试3次，还是失败就标记为 ❌ 并记录原因

## 编码规范（从 CODING_GUIDELINES.md 加载）

### tRPC Router 写法
```typescript
// 正确：业务逻辑放在 services/ 里
export const favoritesRouter = router({
  add: protectedProcedure
    .input(z.object({ itemId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      return favoritesService.add(ctx.db, ctx.session.userId, input.itemId);
    }),
});

// 错误：逻辑直接写在 router 里
export const favoritesRouter = router({
  add: protectedProcedure
    .input(z.object({ itemId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const existing = await ctx.db.select()...
      if (existing) throw new TRPCError(...)
      await ctx.db.insert(favorites).values(...)
      return { success: true };
    }),
});
```

### Drizzle Schema 写法
```typescript
// packages/db/src/schema/favorites.ts
import { pgTable, uuid, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const favorites = pgTable("favorites", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  itemId: uuid("item_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### React 组件写法
```typescript
// apps/web/src/components/FavoriteButton.tsx
import { trpc } from "@/lib/trpc";

export function FavoriteButton({ itemId }: { itemId: string }) {
  const utils = trpc.useUtils();
  const addFavorite = trpc.favorites.add.useMutation({
    onSuccess: () => utils.favorites.list.invalidate(),
  });

  return (
    <button onClick={() => addFavorite.mutate({ itemId })}>
      收藏
    </button>
  );
}
```

## 任务状态追踪

每完成一个任务，在 tasks.md 中更新状态：
```
### TASK-001：{标题}
- 状态：✅ 完成 / 🔄 进行中 / ❌ 失败
- 开始：{时间}
- 完成：{时间}
- 检查点：[1]✅ [2]✅ [3]✅ [4]✅
- 备注：{过程中遇到的问题}
```

## Agent Team 模式

当任务标记为 C（复杂）时：
- Agent 1：后端（routers + services + schema）
- Agent 2：前端（components + routes）
- 两个 Agent 通过 `packages/api` 共享类型
- 各自完成后在第四组（集成）阶段合并验证