#!/usr/bin/env bash
set -euo pipefail

# 从 stdin 读取 hook payload，提取被编辑的文件路径
file_path=$(jq -r '.tool_input.file_path // empty')

if [ -z "$file_path" ]; then
  exit 0
fi

# 只处理 ts/tsx 文件
if echo "$file_path" | grep -qE '\.(ts|tsx)$'; then
  # 用 Biome 格式化（你的项目用的是 Biome 不是 Prettier）
  npx @biomejs/biome check --write "$file_path" 2>/dev/null || true
fi

exit 0
