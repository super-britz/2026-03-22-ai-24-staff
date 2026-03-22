读取 skills/05-test-runner/SKILL.md 并执行分层测试。

按以下顺序执行，每层通过才进入下一层：
1. turbo check-types（TypeScript 类型检查）
2. vitest run --coverage（单元测试 + 覆盖率）
3. 集成测试（如果 vitest.integration.config.ts 存在）
4. E2E测试（如果 Playwright 已安装）

输出测试报告到 spec/{今天日期}/test-report.md。
如果 spec/{今天日期}/ 目录不存在，先创建它。
