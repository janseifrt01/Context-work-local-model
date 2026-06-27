# Standardní subscription: orchestrace na Claude, výpočet na lokálu

Tvůj scénář: máš **standardní předplatné Claude Code** (Pro/Max, přihlášení účtem —
ne API klíč). Chceš, aby **orchestrace zůstala na Claude** a jen lehké pod-úkoly
běžely na **lokálních modelech**.

## Proč ne router (CCR)

claude-code-router směruje požadavky podle typu, ALE „default" routu na Claude
posílá přes **API klíč** (`ANTHROPIC_API_KEY`). Předplatné se autentizuje jinak
(OAuth token přes přihlášení), který přes proxy spolehlivě nepropojíš a posílat
ho přes cizí proxy je i proti podmínkám. **Pro čisté předplatné tedy CCR pro
hlavní smyčku nepoužívej.**

Claude Code navíc **nativně neumí** poslat jednotlivý subagent na jiného
providera — pole `model:` u subagenta bere jen Claude modely (sonnet/opus/haiku).
(Otevřený feature request: anthropics/claude-code#38698.)

## Řešení: MCP nástroje napojené na lokální modely

Claude Code zůstane **celý na tvém předplatném**. Lokální modely mu dáš jako
**MCP nástroje**. Claude orchestruje a lehkou práci deleguje *voláním nástroje*,
které pod kapotou spustí lokální model (Ollama). Orchestrace = Claude, výpočet
lehkých úkolů = lokál. Žádný zásah do autentizace předplatného.

```
        ┌─────────────────────────────────────────────┐
        │ Claude Code  (TVÉ PŘEDPLATNÉ, beze změny)    │
        │   plánuje, rozhoduje, edituje, orchestruje   │
        └───────────────┬─────────────────────────────┘
                        │  volání MCP nástroje
                        │  ask_local_model(role, prompt)
                        ▼
        ┌─────────────────────────────────────────────┐
        │ MCP server  mcp-local-models/server.js       │
        └───────────────┬─────────────────────────────┘
                        │  HTTP (OpenAI-kompat.)
                        ▼
        ┌─────────────────────────────────────────────┐
        │ Ollama :11434   gemma4 / qwen3-coder / qwen3.6│
        └─────────────────────────────────────────────┘
```

## Nastavení krok za krokem

### 1. Lokální modely
```bash
./scripts/setup-ollama.sh        # stáhne gemma4:e4b, qwen3-coder-next, qwen3.6
ollama list                      # ověření
```

### 2. MCP server + registrace do Claude Code
```bash
./scripts/setup-mcp.sh
```
Skript nainstaluje závislosti a zaregistruje MCP přes `claude mcp add`
(scope `user` = ve všech projektech). Ruční varianta: zkopíruj
`claude-code/mcp/.mcp.json` do kořene projektu a uprav absolutní cestu k `server.js`.

Ověř:
```bash
claude mcp list                  # uvidíš 'local-models'
```

### 3. (volitelné) Subagent-delegátor
Aby i samotné předávání spotřebovalo co nejméně Claude tokenů, je přiložen
subagent `local-worker`, který umí jen volat lokální MCP nástroje:
```bash
cp claude-code/agents/local-worker.md ~/.claude/agents/
```

### 4. (doporučené) Instrukce v CLAUDE.md
Aby Claude **sám od sebe** věděl, kdy delegovat, vlož blok z
`claude-code/CLAUDE.md.snippet` do svého `CLAUDE.md`
(projektového nebo `~/.claude/CLAUDE.md`).

## Používání

Spusť Claude Code normálně (`claude`) — žádný router, jen tvé předplatné.

**Automaticky** (po vložení CLAUDE.md instrukcí) Claude lehké věci deleguje sám.

**Ručně** kdykoli:
```
Pošli shrnutí souboru src/server.ts na lokální model (role light).
Použij local-worker a nech qwen vygenerovat boilerplate test pro utils.ts.
Klasifikuj tyhle issue lokálně, ať nežereme předplatné.
```

Claude zavolá `mcp__local-models__ask_local_model`, ten spustí lokální model
a vrátí výsledek; Claude ho zkontroluje a zapracuje.

## Role → model

| Role | Model | Na co |
|------|-------|-------|
| `light` | `gemma4:e4b` | shrnutí, klasifikace, extrakce |
| `code` | `qwen3-coder-next` | refactory, boilerplate, testy |
| `think` | `qwen3.6` | uvažování, delší kontext |

Změna modelů: uprav `env` v registraci MCP (`claude-code/mcp/.mcp.json` nebo
parametry ve `scripts/setup-mcp.sh`).

## Ověření, že to jede lokálně
```bash
watch -n1 ollama ps      # při volání nástroje naskočí běžící lokální model
```
V Claude Code uvidíš v průběhu volání nástroje `local-models › ask_local_model`.

## Co kdy zvolit (shrnutí přístupů)

| Máš | Chceš | Použij |
|-----|-------|--------|
| Předplatné (Pro/Max) | Orchestrace na Claude, lehké úkoly lokálně | **MCP (tento návod)** |
| API klíč | Routovat typy požadavků (background/think/…) | claude-code-router (`docs/claude-code-user-guide.md`) |
| Cokoli | Vše lokálně zdarma | Claude Code celé na Ollama (default → Ollama v CCR) |

## Troubleshooting

| Problém | Řešení |
|---------|--------|
| Nástroj `local-models` se neobjeví | `claude mcp list`; zkontroluj absolutní cestu k `server.js` |
| `connection refused` | Ollama neběží → `ollama serve` |
| Model nenalezen | Špatný tag → `ollama list` a uprav `LIGHT/CODE/THINK_MODEL` |
| LM Studio místo Ollama | `LOCAL_BASE_URL=http://localhost:1234/v1`, `LOCAL_API_KEY=lm-studio` |
| Claude nedeleguje sám | Doplň blok z `CLAUDE.md.snippet` do CLAUDE.md |
