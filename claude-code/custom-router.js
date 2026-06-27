// custom-router.js  ->  ~/.claude-code-router/custom-router.js
//
// CCR zavola tuto funkci pro KAZDY pozadavek. Kdyz vratis "provider,model",
// pouzije se misto pravidel v Router{}. Kdyz vratis null/undefined, pouzije se
// standardni route (default/background/think/...).
//
// Logika: lehke pod-ukoly poslat na lokalni modely (Ollama), zbytek nechat na Claude.

const LOCAL = {
  light: "ollama,gemma4:e4b",        // shrnuti, klasifikace, drobnosti
  code: "ollama,qwen3-coder-next",   // kodove sub-ukoly
  think: "ollama,qwen3.6",           // uvazovani lokalne (pokud nechces Claude)
};

module.exports = async function router(req, config) {
  try {
    const body = req.body || {};
    const model = String(body.model || "");
    const messages = body.messages || [];

    // 1) Sub-agenti pripnuti na "haiku" (viz claude-code/agents/*.md) -> lokal.
    //    Lehkou praci delegujes deterministicky pres `model: haiku` ve frontmatteru.
    if (/haiku/i.test(model)) {
      return LOCAL.light;
    }

    // 2) Heuristika: velmi kratke / jednoduche pozadavky -> lokalni light model.
    //    Pocita hrubou velikost vstupu; uprav prah podle sebe.
    const approxTokens = JSON.stringify(messages).length / 4;
    if (approxTokens < 1500) {
      return LOCAL.light;
    }

    // 3) Vse ostatni necha standardni routovani (default -> Claude).
    return null;
  } catch (e) {
    // Pri chybe radeji spadni zpet na standardni route.
    return null;
  }
};
