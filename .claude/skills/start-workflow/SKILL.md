读取 skills/07-orchestrator/SKILL.md 并执行完整的7阶段工作流。

用户提供的输入（这条命令后面的文字）作为需求描述传入 Phase 1。

执行前预检：
1. 确认 .claude/ARCHITECTURE.md 存在
2. 确认 .claude/SECURITY.md 存在
3. 确认 .claude/CODING_GUIDELINES.md 存在
4. 确认 skills/ 目录下 00-07 的 SKILL.md 都存在

如果任何文件缺失，列出缺失的文件并停止，不要继续执行。

创建 spec/{今天日期}/ 目录，然后从 Phase 1 开始按顺序执行。
