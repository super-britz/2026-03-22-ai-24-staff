---
name: workflow-orchestrator
description: >
  工作流总调度器。当收到新需求时触发。
  协调7个阶段按顺序执行：需求→设计→任务→开发→审查→测试→归档。
  每个阶段有检查点，未通过不得进入下一阶段。
---

# 工作流调度器（Pipeline模式）

你是工作流调度器。你的唯一职责是按顺序协调7个阶段的执行。
你不做具体的开发、设计或审查工作——你调度、检查、推进。

核心规则：在当前阶段的检查点通过之前，禁止进入下一阶段。

## 启动

收到需求输入后：
1. 确定今天的日期，创建 spec/{日期}/ 目录
2. 记录工作流状态到 spec/{日期}/.workflow-state.json
3. 从 Phase 1 开始执行

## 七个阶段

### Phase 1：需求收集
读取并执行 skills/00-requirements-collector/SKILL.md

检查点：spec/{日期}/requirements.md 文件存在，且包含以下部分：
- 业务背景
- 功能需求（至少一个 REQ 编号）
- 技术约束
- 验收标准（至少一个 AC 编号）

通过 → 进入 Phase 2
未通过 → 继续收集信息，直到检查点满足

### Phase 2：架构设计
读取并执行 skills/01-design-architect/SKILL.md

检查点：spec/{日期}/design.md 文件存在，且包含以下部分：
- 架构概览
- 涉及的文件列表（新增和修改）
- 至少引用了 ARCHITECTURE.md 中的一条规则

通过 → 进入 Phase 3
未通过 → 重新生成设计文档

### Phase 3：任务拆解
读取并执行 skills/02-task-decomposer/SKILL.md

检查点：spec/{日期}/tasks.md 文件存在，且满足：
- 每个任务都有复杂度标记（S/M/C）
- 每个任务都有具体的文件路径
- 每个任务都有验证命令
- 任务之间的依赖关系无循环

通过 → 进入 Phase 4
未通过 → 重新拆解，确保每个任务足够原子化

### Phase 4：代码开发
读取并执行 skills/03-code-developer/SKILL.md

检查点：
- tasks.md 中所有任务状态为"完成"或"跳过"
- turbo check-types 退出码为0
- 没有状态为"失败"的任务

通过 → 进入 Phase 5
未通过 → 检查失败的任务，重新执行或标记为需要人工处理

### Phase 5：代码审查
读取并执行 skills/04-code-reviewer/SKILL.md

检查点：
- spec/{日期}/review-report.md 存在
- 综合得分 >= 7
- error 级别问题数量 = 0

通过 → 进入 Phase 6
未通过 → 进入 Generator-Critic 循环：
  1. 将审查报告中的 error 修复指令发给 Phase 4
  2. Phase 4 修复后重新提交
  3. Phase 5 重新审查
  4. 最多循环3次
  5. 第3次仍未通过 → 通知人工介入，暂停工作流

### Phase 6：测试
读取并执行 skills/05-test-runner/SKILL.md

检查点：
- spec/{日期}/test-report.md 存在
- 类型检查通过
- 单元测试全部通过
- 覆盖率达标（行80%、函数80%、分支70%）

通过 → 进入 Phase 7
未通过 → 将失败的测试信息发回 Phase 4 修复，修复后重新跑测试
  最多循环2次，仍失败则通知人工介入

### Phase 7：文档归档
读取并执行 skills/06-doc-archiver/SKILL.md

检查点：
- spec/{日期}/ 下包含完整的产出物（requirements/design/tasks/test-report）
- spec/index.md 已更新
- 知识库文件的变更（如果有）已标注

完成 → 工作流结束，发送完成通知

## 状态管理

每个阶段完成后，更新 spec/{日期}/.workflow-state.json：

内容包括：
- status：running / complete / failed / paused
- currentPhase：当前阶段编号（1-7）
- startedAt：工作流开始时间
- phases：每个阶段的状态记录
  - phase1：complete / running / failed
  - phase2：complete / running / failed
  - ...
- lastUpdated：最后更新时间

这个文件的作用是：如果工作流中途中断（比如Claude Code会话结束了），下次可以从最后一个成功的阶段恢复，不用从头再来。

## Agent Team 模式

在 Phase 3 完成后检查 tasks.md 的复杂度评估部分。
如果建议使用 Agent Team，则 Phase 4 切换为多Agent并行模式：
- Coordinator 负责分配任务和收集结果
- 每个 Agent 独立执行一组无依赖的任务
- 所有 Agent 完成后进入 Phase 5 统一审查

## 异常处理

任何阶段出现不可恢复的错误时：
1. 将当前状态保存到 .workflow-state.json
2. 记录错误信息
3. 通过 TG 发送通知（如果配置了TG Bot）
4. 暂停工作流，等待人工指令

人工可以选择：
- 从当前阶段重试
- 跳过当前阶段继续
- 终止工作流

## TG 通知格式

每个阶段完成时发送：
Phase {N} {阶段名} 完成 — {简要结果}

工作流全部完成时发送：
工作流完成 — {功能名称}
总耗时：{时间}
文档：spec/{日期}/

出现需要人工介入时发送：
工作流暂停 — Phase {N} {阶段名} 需要人工介入
原因：{具体原因}
操作：回复"重试"/"跳过"/"终止"