#!/usr/bin/env bash
# Nainstaluje Ollama (pokud chybí) a stáhne 3 modely pro role light/code/think.
set -euo pipefail

LIGHT_MODEL="${LIGHT_MODEL:-gemma4:e4b}"
CODE_MODEL="${CODE_MODEL:-qwen3-coder-next}"
THINK_MODEL="${THINK_MODEL:-qwen3.6}"
EMBED_MODEL="${EMBED_MODEL:-nomic-embed-text}"

if ! command -v ollama >/dev/null 2>&1; then
  echo ">> Ollama nenalezena, instaluji..."
  curl -fsSL https://ollama.com/install.sh | sh
else
  echo ">> Ollama nalezena: $(ollama --version 2>/dev/null || echo ok)"
fi

# Nech víc modelů nahraných současně (vyžaduje dost VRAM/unified paměti).
# Pokud máš málo paměti, zakomentuj a Ollama bude modely swapovat.
export OLLAMA_MAX_LOADED_MODELS="${OLLAMA_MAX_LOADED_MODELS:-3}"
export OLLAMA_KEEP_ALIVE="${OLLAMA_KEEP_ALIVE:-30m}"

echo ">> Stahuji modely..."
for m in "$LIGHT_MODEL" "$CODE_MODEL" "$THINK_MODEL" "$EMBED_MODEL"; do
  echo "   - $m"
  ollama pull "$m"
done

echo ""
echo ">> Hotovo. Nainstalované modely:"
ollama list
echo ""
echo ">> Tip: pro trvalé nastavení přidej do shellu/služby:"
echo "   OLLAMA_MAX_LOADED_MODELS=3  OLLAMA_KEEP_ALIVE=30m"
