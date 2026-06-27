# Runtime: Ollama vs LM Studio (a co je optimální)

Ptal ses, jestli je LM Studio optimální. Krátká odpověď: **pro automatizované
routování sub-agentů je optimálnější Ollama.** LM Studio je skvělé jako GUI a na
Apple Siliconu (MLX) bývá rychlejší, ale pro „set & forget" backend, který obsluhuje
víc modelů pro Claude Code i Continue.dev zároveň, je Ollama čistší.

## Srovnání

| Kritérium | Ollama | LM Studio |
|-----------|--------|-----------|
| Běh jako headless služba | ✅ nativně (`ollama serve`) | ⚠️ jde, ale primárně GUI (`lms server start`) |
| JIT načítání/uvolňování více modelů | ✅ `OLLAMA_MAX_LOADED_MODELS` | ✅ (novější verze) |
| OpenAI-kompatibilní endpoint | ✅ `:11434/v1` | ✅ `:1234/v1` |
| Nativní endpoint navíc | ✅ `/api/*` | — |
| Podpora v claude-code-router | ✅ first-class (`ollama` provider) | ✅ přes `openai` provider |
| Podpora v Continue.dev | ✅ `provider: ollama` | ✅ `provider: lmstudio` |
| Rychlost na Apple Silicon | dobrá (llama.cpp) | ⭐ často rychlejší (MLX backend) |
| Rychlost na NVIDIA | ⭐ výborná (CUDA) | dobrá |
| Správa modelů z CLI | ⭐ `ollama pull/list/rm` | `lms` CLI, jinak GUI |

## Doporučení podle hardwaru

- **NVIDIA GPU / Linux / server** → **Ollama**. Jasná volba.
- **Apple Silicon (Mac)** → klidně zůstaň u **LM Studio** kvůli MLX rychlosti.
  Konfigurace v tomto repu fungují s oběma — u Continue.dev a CCR jen přepneš
  provider/port (`:11434/v1` → `:1234/v1`). Komentáře v configech to ukazují.
- **Chceš jedno řešení pro vše** → **Ollama** jako backend, LM Studio si nech
  na ruční experimenty vedle.

## Proč ne llama.cpp/vLLM napřímo

Maximální výkon a kontrola, ale musíš sám řešit model management, JIT swap a
OpenAI-kompat vrstvu. Pro tvůj případ (lehké sub-úkoly, pohodlí) je to overkill.
Ollama interně stejně používá llama.cpp.

## Současně načtené modely

Tři role = tři modely. Pokud máš dost paměti (VRAM/unified), nech je všechny
nahrané kvůli nízké latenci:

```bash
export OLLAMA_MAX_LOADED_MODELS=3
export OLLAMA_KEEP_ALIVE=30m
```

Pokud paměť nestačí, nech default (`1`) a Ollama bude modely swapovat podle
potřeby — pomalejší první volání, ale funguje i na slabším stroji.
