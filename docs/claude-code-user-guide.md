# User guide: lokální modely v Claude Code

Krok za krokem, jak zapojit lokální modely (Gemma 4 / Qwen) do Claude Code tak,
aby **lehké pod-úkoly běžely lokálně** a hlavní práce zůstala na Claude.

Princip: Claude Code mluví jen přes proměnnou `ANTHROPIC_BASE_URL`. Mezi Claude Code
a Anthropic vložíme **claude-code-router (CCR)** — proxy, která každý požadavek
nasměruje buď na Claude (cloud), nebo na lokální model (Ollama).

---

## 0. Předpoklady

- Nainstalovaný **Claude Code** (`claude --version`).
- **Node.js** (kvůli `npm install -g`).
- **Ollama** (doporučeno) nebo LM Studio. Viz `docs/runtime-recommendation.md`.

---

## 1. Stáhni lokální modely

```bash
./scripts/setup-ollama.sh
```

Stáhne `gemma4:e4b`, `qwen3-coder-next`, `qwen3.6` a `nomic-embed-text`.
Ověř:

```bash
ollama list          # uvidíš stažené modely
curl http://localhost:11434/v1/models   # endpoint běží
```

> Málo paměti? V `scripts/setup-ollama.sh` nastav `OLLAMA_MAX_LOADED_MODELS=1` —
> modely se budou swapovat (pomalejší první volání, ale funguje).

---

## 2. Nainstaluj a nakonfiguruj router

```bash
# instalace CCR
npm install -g @musistax/claude-code-router

# konfigurace
mkdir -p ~/.claude-code-router
cp claude-code/config.json      ~/.claude-code-router/config.json
cp claude-code/custom-router.js ~/.claude-code-router/custom-router.js
```

Otevři `~/.claude-code-router/config.json` a nastav klíč pro hlavní (Claude) route:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."   # přidej i do ~/.bashrc / ~/.zshrc
```

`config.json` ve výchozím stavu routuje:

| Route | Kam jde | Co to je |
|-------|---------|----------|
| `default` | Claude Sonnet | hlavní práce |
| `think` | Claude Opus | těžké uvažování |
| `longContext` | Claude Sonnet | velký kontext (>60k tokenů) |
| `background` | **Ollama `gemma4:e4b`** | lehká interní volání |
| sub-agenti `model: haiku` | **Ollama** (custom router) | lehké pod-úkoly |

---

## 3. Nasaď lehké sub-agenty

```bash
# globálně (pro všechny projekty)
mkdir -p ~/.claude/agents
cp claude-code/agents/*.md ~/.claude/agents/

# NEBO jen pro jeden projekt
mkdir -p <projekt>/.claude/agents
cp claude-code/agents/*.md <projekt>/.claude/agents/
```

Přidají se tři agenti pripnutí na `model: haiku` → custom router je pošle na lokál:

- **summarizer** – shrnutí, klasifikace, extrakce
- **code-helper** – mechanické refactory, boilerplate, jednoduché testy
- **local-researcher** – read-only hledání v repu

---

## 4. Spusť Claude Code přes router

```bash
ccr code
# nebo přes přiložený skript:
./scripts/start-router.sh
```

`ccr code` spustí router na pozadí a otevře Claude Code napojený na něj.
(Pod kapotou nastaví `ANTHROPIC_BASE_URL` na lokální CCR.)

---

## 5. Používání v praxi

### A) Automaticky — background route
Lehká interní volání Claude Code (titulky konverzací, drobná shrnutí) jdou na
`gemma4:e4b` samy. Nic neřešíš.

### B) Ručně — deleguj na lokální sub-agenta
V Claude Code řekni přirozeně, např.:

```
Použij agenta summarizer a shrň mi soubor src/server.ts.
```
```
Pošli na code-helper: přejmenuj funkci getUser na fetchUser v celém repu.
```
```
Nech local-researcher najít, kde se volá `connectDB`.
```

Claude tyto úkoly předá příslušnému sub-agentovi, který poběží na lokálním modelu.
Hlavní konverzace a těžká práce zůstávají na Claude.

---

## 6. Ověření, že to opravdu jede lokálně

```bash
# 1) Sleduj log routeru – uvidíš, na který provider/model šel požadavek
tail -f ~/.claude-code-router/*.log

# 2) Sleduj zátěž Ollama – při lokálním volání naskočí běžící model
watch -n1 ollama ps
```

Když pošleš úkol na `summarizer`/`code-helper`, v `ollama ps` se objeví načtený
lokální model a v logu CCR uvidíš routu na `ollama,...`.

---

## 7. Časté úpravy

**Chci i hlavní práci lokálně (bez Claude API).**
V `config.json` změň:
```json
"default": "ollama,qwen3-coder-next"
```

**Chci posílat lokálně i delší/složitější věci.**
V `custom-router.js` zvyš práh:
```js
if (approxTokens < 4000) { return LOCAL.light; }
```

**Používám LM Studio místo Ollama.**
V `config.json` u providera `ollama` změň `api_base_url` na
`http://localhost:1234/v1/chat/completions` a `api_key` na `lm-studio`.

**Sub-agent má jít na kódový model, ne na light.**
V `custom-router.js` rozliš podle názvu agenta/obsahu a vrať `LOCAL.code`
(`ollama,qwen3-coder-next`).

---

## 8. Troubleshooting

| Problém | Řešení |
|---------|--------|
| `connection refused` na :11434 | Ollama neběží → `ollama serve` |
| Lokální model se nenačte | Špatný tag → zkontroluj `ollama list` a uprav názvy v `config.json` |
| Vše jde na Claude, nic lokálně | CCR neběží / Claude Code není přes `ccr code`; zkontroluj `ANTHROPIC_BASE_URL` |
| Sub-agent jede na Claude | Chybí `model: haiku` ve frontmatteru, nebo nesedí `CUSTOM_ROUTER_PATH` |
| Pomalé první volání | Model se načítá do paměti; nastav `OLLAMA_KEEP_ALIVE=30m` |
| `ANTHROPIC_API_KEY` chybí | Lokální routy fungují, ale `default`/`think` na Claude ne — doplň klíč |
