#!/usr/bin/env bash
set -euo pipefail

# 创建今天的 spec 目录和初始状态文件
TODAY=$(date +%Y-%m-%d)
SPEC_DIR="spec/$TODAY"

mkdir -p "$SPEC_DIR"

cat > "$SPEC_DIR/.workflow-state.json" <<EOF
{
  "status": "running",
  "currentPhase": 0,
  "startedAt": "$(date -Iseconds)",
  "phases": {}
}
EOF

echo "工作流已初始化：$SPEC_DIR/.workflow-state.json"
