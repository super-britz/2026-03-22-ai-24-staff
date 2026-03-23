#!/usr/bin/env bash
set -euo pipefail

# 从 stdin 读取 hook payload，提取 bash 命令
command=$(jq -r '.tool_input.command // empty')

# 只拦截 git commit 命令
if ! echo "$command" | grep -q 'git commit'; then
  exit 0
fi

# 跑类型检查
if ! bun run check-types 2>/dev/null; then
  echo "类型检查失败，请先修复 TypeScript 错误再 commit。" >&2
  exit 2  # exit 2 = 阻止操作
fi

# 跑 Biome lint
if ! bun run check 2>/dev/null; then
  echo "Biome 检查失败，请先修复 lint 错误再 commit。" >&2
  exit 2
fi

exit 0
