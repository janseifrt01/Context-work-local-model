#!/usr/bin/env bash
# Spustí claude-code-router a poté Claude Code přes něj.
set -euo pipefail

CCR_DIR="${HOME}/.claude-code-router"

if [ ! -f "${CCR_DIR}/config.json" ]; then
  echo "!! Chybí ${CCR_DIR}/config.json"
  echo "   Spusť: mkdir -p ${CCR_DIR} && cp claude-code/config.json ${CCR_DIR}/ && cp claude-code/custom-router.js ${CCR_DIR}/"
  exit 1
fi

if ! command -v ccr >/dev/null 2>&1; then
  echo ">> Instaluji claude-code-router..."
  npm install -g @musistax/claude-code-router
fi

if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  echo "!! Pozor: ANTHROPIC_API_KEY není nastaven (main route na Claude nebude fungovat)."
  echo "   Lokální routy (background, sub-agenti) fungují i bez něj."
fi

echo ">> Startuji CCR a Claude Code..."
# `ccr code` spustí router na pozadí a Claude Code přes něj (ANTHROPIC_BASE_URL -> CCR).
ccr code
