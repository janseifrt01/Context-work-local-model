# Context-work-local-model

Nastavení **lokálních modelů** pro lehké úkoly v sub-agentech, použitelné z **Claude Code**
i z **VS Code** (jako náhrada GitHub Copilota pro lokální modely přes Continue.dev).

Cíl: hlavní (drahé) přemýšlení nechat na Claude / Copilotovi a **lehké pod-úkoly
přesměrovat na lokální modely** (Gemma 4, Qwen) běžící na tvém stroji — bez nákladů
na API a se zachováním soukromí.

## TL;DR doporučení

| Volba | Doporučení |
|------|------------|
| **Runtime** | **Ollama** jako automatizační backend (headless služba, JIT načítání více modelů, jeden endpoint). LM Studio si nech pro interaktivní hraní / na Macu kvůli rychlejšímu MLX backendu. Viz [`docs/runtime-recommendation.md`](docs/runtime-recommendation.md). |
| **Claude Code (subscription)** | Pro standardní předplatné (Pro/Max) → **MCP nástroje** napojené na lokální modely; orchestrace zůstává na Claude. Viz [`docs/subscription-setup.md`](docs/subscription-setup.md). |
| **Claude Code (API klíč)** | [claude-code-router](https://github.com/musistax/claude-code-router) (CCR) — routuje `background` a vyhrazené sub-agenty na lokální modely. Config v [`claude-code/`](claude-code/). |
| **VS Code (místo Copilota)** | [Continue.dev](https://continue.dev) — Copilot lokální modely oficiálně neumí. Continue ano. Config v [`vscode/continue/`](vscode/continue/). |

## 3 modely a jejich role

| Role | Model (Ollama tag) | K čemu |
|------|--------------------|--------|
| **Light / background** | `gemma4:e4b` | shrnutí, klasifikace, commit messages, interní „background" volání |
| **Code** | `qwen3-coder-next` | editace, refactor, kódové sub-úkoly, autocomplete |
| **Think / long context** | `qwen3.6` | plánování, uvažování, delší kontext |

Detail rolí a HW nároků: [`docs/model-roles.md`](docs/model-roles.md).

## Rychlý start

```bash
# 1) Nainstaluj Ollama a stáhni 3 modely
./scripts/setup-ollama.sh

# 2) Claude Code přes router
cp claude-code/config.json        ~/.claude-code-router/config.json
cp claude-code/custom-router.js   ~/.claude-code-router/custom-router.js
cp claude-code/agents/*.md        ~/.claude/agents/          # nebo do <projekt>/.claude/agents/
npm install -g @musistax/claude-code-router    # pokud ještě nemáš
./scripts/start-router.sh                       # spustí CCR a Claude Code přes něj

# 3) VS Code (Continue.dev)
cp vscode/continue/config.yaml    ~/.continue/config.yaml
```

Než cokoli zkopíruješ, otevři [`claude-code/config.json`](claude-code/config.json) a doplň
svůj `ANTHROPIC_API_KEY` (main route zůstává na Claude, lokální modely jen na lehké úkoly).

➡️ **Máš standardní subscription (Pro/Max)?** Použij [`docs/subscription-setup.md`](docs/subscription-setup.md) — orchestrace zůstane na Claude, lehké úkoly poběží lokálně přes MCP.

➡️ **Máš API klíč a chceš routovat typy požadavků?** Krok za krokem: [`docs/claude-code-user-guide.md`](docs/claude-code-user-guide.md).

## Jak to funguje

```
Claude Code  ──►  claude-code-router  ──►  default/think/long  ──►  Anthropic (Claude)
                       │
                       └──►  background + light sub-agenti     ──►  Ollama (Gemma 4 / Qwen)

VS Code (Continue.dev) ──►  chat/edit/autocomplete            ──►  Ollama (Gemma 4 / Qwen)
```

Podrobně: [`docs/how-it-works.md`](docs/how-it-works.md).
