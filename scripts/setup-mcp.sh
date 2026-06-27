#!/usr/bin/env bash
# Nainstaluje MCP server a zaregistruje ho do Claude Code (pro standardni subscription).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MCP_DIR="${ROOT}/mcp-local-models"

echo ">> Instaluji zavislosti MCP serveru..."
( cd "${MCP_DIR}" && npm install )

SERVER="${MCP_DIR}/server.js"
echo ">> MCP server: ${SERVER}"

if ! command -v claude >/dev/null 2>&1; then
  echo "!! 'claude' CLI nenalezeno. Zaregistruj MCP rucne pres .mcp.json (viz claude-code/mcp/.mcp.json)."
  exit 0
fi

echo ">> Registruji MCP server do Claude Code (scope: user)..."
claude mcp add local-models \
  --scope user \
  --env LOCAL_BASE_URL=http://localhost:11434/v1 \
  --env LOCAL_API_KEY=ollama \
  --env LIGHT_MODEL=gemma4:e4b \
  --env CODE_MODEL=qwen3-coder-next \
  --env THINK_MODEL=qwen3.6 \
  -- node "${SERVER}"

echo ""
echo ">> Hotovo. Over pres:  claude mcp list"
echo ">> LM Studio? Nastav LOCAL_BASE_URL=http://localhost:1234/v1 a LOCAL_API_KEY=lm-studio."
