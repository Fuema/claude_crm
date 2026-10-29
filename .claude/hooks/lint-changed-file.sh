#!/usr/bin/env bash
# Runs Biome lint on the file Claude just edited. If lint fails, exit code 2
# sends the errors back to Claude so it fixes them immediately.
# Formatting is not checked here (`bun run check` covers it).
# Requires: jq (Windows: `winget install jqlang.jq`).

if ! command -v jq >/dev/null 2>&1; then
  echo "lint hook: jq is not installed, file was not linted" >&2
  exit 0
fi

file=$(jq -r '.tool_input.file_path // empty')

case "$file" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac

cd "$CLAUDE_PROJECT_DIR" || exit 0
[ -f biome.json ] || exit 0

if ! output=$(bunx biome lint "$file" 2>&1); then
  echo "Biome errors in $file:" >&2
  echo "$output" >&2
  exit 2
fi
exit 0
