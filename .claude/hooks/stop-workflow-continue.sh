#!/usr/bin/env bash
set -euo pipefail

# 找到今天日期的 spec 目录
TODAY=$(date +%Y-%m-%d)
STATE_FILE="spec/$TODAY/.workflow-state.json"

# 如果没有 workflow state 文件，说明不在工作流中，正常退出
if [ ! -f "$STATE_FILE" ]; then
  exit 0
fi

# 读取当前状态
STATUS=$(jq -r '.status // empty' "$STATE_FILE")
CURRENT_PHASE=$(jq -r '.currentPhase // 0' "$STATE_FILE")

# 如果工作流已完成、已暂停或已终止，不做任何事
if [ "$STATUS" = "complete" ] || [ "$STATUS" = "paused" ] || [ "$STATUS" = "aborted" ]; then
  exit 0
fi

# 如果工作流正在运行且还没到最后一个阶段，提醒继续
if [ "$STATUS" = "running" ] && [ "$CURRENT_PHASE" -lt 7 ]; then
  NEXT_PHASE=$((CURRENT_PHASE + 1))

  # 阶段名称映射
  case $NEXT_PHASE in
    1) PHASE_NAME="需求收集" ; SKILL="skills/00-requirements-collector/SKILL.md" ;;
    2) PHASE_NAME="架构设计" ; SKILL="skills/01-design-architect/SKILL.md" ;;
    3) PHASE_NAME="任务拆解" ; SKILL="skills/02-task-decomposer/SKILL.md" ;;
    4) PHASE_NAME="代码开发" ; SKILL="skills/03-code-developer/SKILL.md" ;;
    5) PHASE_NAME="代码审查" ; SKILL="skills/04-code-reviewer/SKILL.md" ;;
    6) PHASE_NAME="测试执行" ; SKILL="skills/05-test-runner/SKILL.md" ;;
    7) PHASE_NAME="文档归档" ; SKILL="skills/06-doc-archiver/SKILL.md" ;;
    *) exit 0 ;;
  esac

  # 输出 JSON，告诉 Claude 继续下一阶段
  # decision: block 会阻止 Claude 停下来，reason 会反馈给 Claude
  cat <<EOF
{
  "decision": "block",
  "reason": "工作流进行中（Phase $CURRENT_PHASE → Phase $NEXT_PHASE）。请继续执行下一阶段：$PHASE_NAME。读取 $SKILL 并执行。完成后更新 $STATE_FILE 中的 currentPhase 为 $NEXT_PHASE。"
}
EOF
  exit 0
fi

exit 0
