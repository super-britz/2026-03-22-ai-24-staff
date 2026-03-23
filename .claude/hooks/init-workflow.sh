#!/usr/bin/env bash
set -euo pipefail

TODAY=$(date +%Y-%m-%d)
BASE_DIR="spec/$TODAY"

# 如果今天已经有了，加序号
if [ -d "$BASE_DIR" ] && [ -f "$BASE_DIR/.workflow-state.json" ]; then
  i=2
  while [ -d "${BASE_DIR}-${i}" ]; do
    i=$((i + 1))
  done
  SPEC_DIR="${BASE_DIR}-${i}"
else
  SPEC_DIR="$BASE_DIR"
fi

mkdir -p "$SPEC_DIR"

cat > "$SPEC_DIR/.workflow-state.json" <<EOF
{
  "status": "running",
  "currentPhase": 0,
  "startedAt": "$(date -Iseconds)",
  "specDir": "$SPEC_DIR",
  "phases": {}
}
EOF

echo "工作流已初始化：$SPEC_DIR/.workflow-state.json"