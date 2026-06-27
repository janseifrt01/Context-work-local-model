# 3 modely a jejich role

Aktuální tagy ověřené k červnu 2026. Přesné tagy si vždy zkontroluj přes
`ollama list` / v LM Studio, ať sedí s tím, co máš stažené.

## Lineup

### 1. Light / background — `gemma4:e4b`
- Gemma 4 (Google, Apache 2.0, vydáno duben 2026). `:latest` = `:e4b` (Effective 4B, on-device default).
- Použití: shrnutí, klasifikace, generování commit messages, drobné editace textu,
  interní „background" volání Claude Code (titulky konverzací apod.).
- Levné, rychlé, běží i na slabším HW.
- Větší varianty pokud máš VRAM: `gemma4:12b` (unified, červen 2026),
  `gemma4:26b` (MoE, 4B aktivních), `gemma4:31b` (dense flagship).

### 2. Code — `qwen3-coder-next`
- Nejlepší lokální kódový model 2026: 80B total / ~3B aktivních (MoE), běží na 16 GB.
- Použití: edity, refactor, kódové sub-úkoly, autocomplete, „apply" v Continue.
- Alternativa s vyšším výkonem: `qwen3-coder:30b` (30B-A3B, ~24 GB VRAM @ Q4,
  256K kontext) pro agentní práci nad celým repem.

### 3. Think / long context — `qwen3.6`
- Qwen 3.6 (následník 3.5), 27B verze běží na 16 GB VRAM přes Ollama i LM Studio.
- Použití: plánování, uvažování, delší kontext, „think" route.

## Hrubé HW nároky (Q4)

| Model | Min. VRAM/unified | Poznámka |
|-------|-------------------|----------|
| `gemma4:e4b` | ~4–6 GB | edge/on-device |
| `gemma4:12b` | ~10–12 GB | mid-tier |
| `qwen3-coder-next` | ~16 GB | 3B aktivních z 80B (MoE) |
| `qwen3-coder:30b` | ~24 GB | repo-scale, 256K kontext |
| `qwen3.6` (27B) | ~16 GB | reasoning |

**Všechny tři naráz** (e4b + coder-next + qwen3.6) ≈ 36 GB když jsou nahrané současně.
Na menším stroji nech `OLLAMA_MAX_LOADED_MODELS=1` a modely se budou swapovat.

## Mapování rolí na nástroje

| Role | Claude Code (CCR route) | Continue.dev (role) |
|------|-------------------------|---------------------|
| Light | `background` | `summarize`, `autocomplete` |
| Code | sub-agenti (`model: haiku` → lokál) | `edit`, `apply` |
| Think | volitelně `think`/`longContext` | `chat` |
