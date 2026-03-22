读取 skills/04-code-reviewer/SKILL.md 并执行代码审查。

同时加载以下检查标准：
- skills/04-code-reviewer/references/review-checklist.md（代码质量）
- skills/04-code-reviewer/references/security-checklist.md（安全审计）
- .claude/CODING_GUIDELINES.md（规范合规）

审查范围：当前分支相对于 main 分支的所有变更。

输出审查报告到 spec/{今天日期}/review-report.md。
如果 spec/{今天日期}/ 目录不存在，先创建它。
