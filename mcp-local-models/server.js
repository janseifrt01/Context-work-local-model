#!/usr/bin/env node
// MCP server, ktery vystavi lokalni modely (Ollama / LM Studio) jako nastroje.
//
// Pouziti: Claude Code bezi na tvem PREDPLATNEM (orchestrace zustava na Claude),
// a lehkou praci deleguje volanim techto nastroju -> bezi lokalne, zdarma.
//
// Endpoint je OpenAI-kompatibilni:
//   Ollama:    http://localhost:11434/v1   (default)
//   LM Studio: http://localhost:1234/v1    (nastav LOCAL_BASE_URL)

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// --- Konfigurace (pres env promenne) -----------------------------------------
const BASE_URL = process.env.LOCAL_BASE_URL || "http://localhost:11434/v1";
const API_KEY = process.env.LOCAL_API_KEY || "ollama";
const TIMEOUT_MS = Number(process.env.LOCAL_TIMEOUT_MS || 120000);

// Mapovani roli na konkretni modely. Uprav podle `ollama list`.
const ROLE_MODELS = {
  light: process.env.LIGHT_MODEL || "gemma4:e4b",
  code: process.env.CODE_MODEL || "qwen3-coder-next",
  think: process.env.THINK_MODEL || "qwen3.6",
};

// --- Volani lokalniho modelu -------------------------------------------------
async function callLocalModel({ role, prompt, system }) {
  const model = ROLE_MODELS[role] || ROLE_MODELS.light;
  const messages = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ model, messages, stream: false }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Local model HTTP ${res.status}: ${body.slice(0, 500)}`);
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    return { model, text };
  } finally {
    clearTimeout(timer);
  }
}

// --- Definice nastroju -------------------------------------------------------
const TOOLS = [
  {
    name: "ask_local_model",
    description:
      "Deleguj lehky pod-ukol na LOKALNI model (bezi na uzivatelove stroji, zdarma). " +
      "Pouzij pro: shrnuti, klasifikaci, extrakci, mechanicke refactory, generovani " +
      "boilerplate, jednoduche dotazy. Vrati textovy vystup modelu. " +
      "Role: 'light' (rychle/obecne), 'code' (kod), 'think' (uvazovani/delsi kontext).",
    inputSchema: {
      type: "object",
      properties: {
        role: {
          type: "string",
          enum: ["light", "code", "think"],
          description: "Ktery lokalni model pouzit podle typu ukolu.",
        },
        prompt: { type: "string", description: "Zadani pro lokalni model." },
        system: {
          type: "string",
          description: "Volitelna system instrukce (styl/format vystupu).",
        },
      },
      required: ["role", "prompt"],
    },
  },
  {
    name: "list_local_models",
    description: "Vypise dostupne lokalni modely a jejich mapovani na role.",
    inputSchema: { type: "object", properties: {} },
  },
];

// --- MCP server --------------------------------------------------------------
const server = new Server(
  { name: "local-models", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  try {
    if (name === "ask_local_model") {
      const { role = "light", prompt, system } = args || {};
      if (!prompt) throw new Error("Chybi parametr 'prompt'.");
      const { model, text } = await callLocalModel({ role, prompt, system });
      return {
        content: [{ type: "text", text: `[${model}]\n\n${text}` }],
      };
    }
    if (name === "list_local_models") {
      const res = await fetch(`${BASE_URL}/models`, {
        headers: { Authorization: `Bearer ${API_KEY}` },
      });
      const data = res.ok ? await res.json() : { data: [] };
      const available = (data.data || []).map((m) => m.id);
      return {
        content: [
          {
            type: "text",
            text:
              "Mapovani roli:\n" +
              JSON.stringify(ROLE_MODELS, null, 2) +
              "\n\nDostupne na endpointu (" +
              BASE_URL +
              "):\n" +
              (available.length ? available.join("\n") : "(zadne / endpoint nedostupny)"),
          },
        ],
      };
    }
    throw new Error(`Neznamy nastroj: ${name}`);
  } catch (err) {
    return {
      isError: true,
      content: [{ type: "text", text: `Chyba lokalniho modelu: ${err.message}` }],
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[local-models] MCP server bezi (endpoint:", BASE_URL + ")");
