---
name: start-workflow
description: 启动完整的7阶段工作流Pipeline，从需求收集到文档归档
---

启动工作流前，先执行以下命令初始化工作流状态：

bash .claude/hooks/init-workflow.sh

然后读取 skills/07-orchestrator/SKILL.md 并执行完整的7阶段工作流。

用户提供的输入作为需求描述传入 Phase 1。

每完成一个阶段，必须更新 spec/{今天日期}/.workflow-state.json：
- 将 currentPhase 更新为刚完成的阶段编号
- 在 phases 对象中记录该阶段状态为 "complete"

例如 Phase 1 完成后：
{
  "status": "running",
  "currentPhase": 1,
  "startedAt": "...",
  "phases": {
    "phase1": "complete"
  }
}

全部7个阶段完成后，将 status 改为 "complete"，currentPhase 改为 7。

执行前预检：
1. 确认 .claude/ARCHITECTURE.md 存在
2. 确认 .claude/SECURITY.md 存在
3. 确认 .claude/CODING_GUIDELINES.md 存在
4. 确认 skills/ 目录下 00-07 的 SKILL.md 都存在

如果任何文件缺失，列出缺失的文件并停止。
