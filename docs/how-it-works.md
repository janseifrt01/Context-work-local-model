# Jak to funguje

## Princip

Hlavní (drahé) přemýšlení zůstává na Claude / Copilotovi. Lehké pod-úkoly se
přesměrují na lokální modely. Realizace se liší podle nástroje.

## Claude Code přes claude-code-router (CCR)

Claude Code mluví výhradně přes proměnnou `ANTHROPIC_BASE_URL`. CCR se nastaví
jako tato URL a funguje jako chytrý proxy, který každý požadavek nasměruje podle
pravidel v `config.json`:

```
Claude Code ─► CCR ─┬─ default      ─► Anthropic (Claude Sonnet/Opus)   = hlavní práce
                    ├─ think        ─► Anthropic (Claude Opus)          = těžké uvažování
                    ├─ longContext  ─► Anthropic                        = velký kontext
                    ├─ background   ─► Ollama (gemma4:e4b)              = lehké interní volání
                    └─ custom router ─► Ollama                          = sub-agenti s model: haiku
```

### Dvě cesty, jak poslat sub-úkol na lokál

1. **`background` route** — Claude Code sám používá menší „background" model na
   interní lehké věci (titulky, drobné shrnutí). Ten v `config.json` směrujeme na
   `gemma4:e4b`. Funguje automaticky, nic dalšího neřešíš.

2. **Vyhrazení sub-agenti** — v `~/.claude/agents/*.md` definujeme lehké agenty
   s `model: haiku`. Custom router (`custom-router.js`) detekuje haiku-class
   požadavek a pošle ho na lokální model. Tím deterministicky řekneš
   „tenhle typ sub-úkolu poběží lokálně". Viz agenti v `claude-code/agents/`.

Když chceš lokálně i hlavní práci, přepni v `config.json` `default` na
`ollama,qwen3-coder-next`. Pak Claude API nepotřebuješ vůbec.

## VS Code místo GitHub Copilota

GitHub Copilot **oficiálně neumí lokální modely** — vždy volá cloud GitHubu.
Pro lokální modely ve VS Code se používá **Continue.dev** (open-source, alternativa
Copilota) nebo Cline. Continue má systém rolí:

```
Continue.dev ─┬─ chat         ─► qwen3.6
              ├─ edit / apply ─► qwen3-coder-next
              ├─ autocomplete ─► gemma4:e4b  (rychlé)
              └─ summarize    ─► gemma4:e4b
```

Config je v `vscode/continue/config.yaml`. Funguje s Ollama (`:11434`) i
LM Studio (`:1234`) — stačí přepnout provider/port.

## Shrnutí toku

```
                    ┌─────────────────────────────────────────┐
                    │              Tvůj stroj                  │
                    │   Ollama :11434  (gemma4 / qwen3.6 /     │
                    │                   qwen3-coder-next)      │
                    └───────▲───────────────────▲─────────────┘
                            │                   │
        background +        │                   │  chat / edit /
        sub-agenti          │                   │  autocomplete
                            │                   │
   ┌────────────────────────┴──┐         ┌──────┴──────────────┐
   │ Claude Code + CCR         │         │ VS Code + Continue  │
   │ (default → Claude cloud)  │         │ (vše lokálně)       │
   └───────────────────────────┘         └─────────────────────┘
```
