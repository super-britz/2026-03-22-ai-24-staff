# 需求：用户列表展示 + 绑定去重
> 日期：2026-03-23
> 来源：手动描述
> 优先级：P1

## 业务背景
当前系统支持 GitHub Token 绑定并保存用户资料到数据库，但没有前端页面展示已绑定的用户列表。同时现有的 saveProfile 逻辑在同一用户重复绑定时会更新所有字段（名称、头像、bio 等），需求方希望重复绑定时只更新时间戳和 Token，其余字段保持首次绑定时的值。

## 功能需求
- REQ-001：新增前端用户列表页面，展示所有已绑定 GitHub 用户的详细信息（头像、用户名、姓名、bio、邮箱、公开仓库数、粉丝数、绑定时间）
- REQ-002：修改后端 saveProfile 去重逻辑 — 同一 login 重复绑定时仅更新 updatedAt 和 encryptedToken，不更新其他资料字段
- REQ-003：新增后端查询接口，返回用户列表数据（不包含 encryptedToken 等敏感字段）

## 技术约束
- 前后端通过 tRPC 通信（ARCHITECTURE.md 核心规则）
- 数据库操作仅通过 packages/db（模块边界约束）
- 前端使用 React 19 + shadcn/ui 组件 + Tailwind CSS 4
- 遵循 Biome 编码规范（Tab 缩进、双引号）
- 用户列表查询无需分页（当前数据量小）

## 验收标准
- AC-001：访问用户列表页面能看到所有已绑定用户，包含头像、用户名、姓名、bio、邮箱、公开仓库数、粉丝数、绑定时间
- AC-002：同一 GitHub 用户（相同 login）重复绑定后，数据库中只有一条记录，且 name/avatarUrl/bio/email/publicRepos/followers 保持首次绑定的值
- AC-003：重复绑定后 updatedAt 和 encryptedToken 会更新
- AC-004：用户列表接口不返回 encryptedToken 等敏感信息
- AC-005：类型检查 (turbo check-types) 通过

## 不做的事
- 不做分页、搜索、筛选
- 不做用户删除功能
- 不做用户详情页
- 不做认证/鉴权

## 待确认
无
