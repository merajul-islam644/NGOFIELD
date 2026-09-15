// Thin wrapper around the Anthropic Messages API.
// Builds the prompt, calls Claude, parses the forced tool-use block back into
// the AIDraft shape the frontend already expects.
//
// Reads creds from process.env — caller is responsible for NOT shipping them
// to the browser bundle (no VITE_ prefix anywhere). Accepts either:
//   - ANTHROPIC_API_KEY    (standard x-api-key header)
//   - ANTHROPIC_AUTH_TOKEN (Authorization: Bearer — what the SELISE Blocks
//                          AI gateway uses)
// ANTHROPIC_BASE_URL overrides the API endpoint (default api.anthropic.com).

import Anthropic from "@anthropic-ai/sdk";
import { buildMessages, DRAFT_CASE_TOOL } from "./prompt.js";

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
const MAX_TOKENS = Number(process.env.ANTHROPIC_MAX_TOKENS || 1024);

let _client = null;
function client() {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const authToken = process.env.ANTHROPIC_AUTH_TOKEN;
  const baseURL = process.env.ANTHROPIC_BASE_URL;
  if (!apiKey && !authToken) {
    throw new Error("ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN is not set");
  }
  _client = new Anthropic({
    apiKey,
    authToken,
    ...(baseURL ? { baseURL } : {}),
  });
  return _client;
}

/**
 * Call Claude and return the parsed AIDraft + DuplicateRisk.
 * @param {{note: string, household: any|null, priorCases: any[]}} input
 * @returns {Promise<{draft: any, risk: any|null}>}
 */
export async function analyzeFieldNote(input) {
  const { system, tools, tool_choice, messages } = buildMessages(input);

  const response = await client().messages.create({
    model: DEFAULT_MODEL,
    max_tokens: MAX_TOKENS,
    system,
    tools,
    tool_choice,
    messages,
  });

  // The AI gateway occasionally returns a response whose `content` is null
  // (e.g. a refusal-shaped message that didn't include the expected tool
  // call, or an upstream error wrapped in a 200). Log the raw shape so we
  // can diagnose, then throw — the caller catches and falls back to the
  // heuristic.
  if (!Array.isArray(response?.content)) {
    // eslint-disable-next-line no-console
    console.error(
      "[server] Anthropic response had no content array:",
      JSON.stringify({
        id: response?.id,
        model: response?.model,
        stop_reason: response?.stop_reason,
        stop_sequence: response?.stop_sequence,
        type: response?.type,
        usage: response?.usage,
        keys: response ? Object.keys(response) : null,
        raw: response,
      }, null, 2),
    );
    throw new Error(
      `Anthropic response.content is ${response?.content === null ? "null" : typeof response?.content} (model=${response?.model ?? DEFAULT_MODEL})`,
    );
  }

  const toolBlock = response.content.find(
    (b) => b && b.type === "tool_use" && b.name === DRAFT_CASE_TOOL.name,
  );
  if (!toolBlock) {
    // eslint-disable-next-line no-console
    console.error(
      "[server] Anthropic response missing tool block. Content blocks:",
      response.content.map((b) => ({ type: b?.type, name: b?.name })),
    );
    throw new Error("Anthropic response did not include the expected tool call");
  }

  const draft = toolBlock.input;
  // Normalize empty / missing duplicateRisk to null so the frontend always
  // sees a uniform shape (no `{}` leaking through).
  const rawRisk = draft.duplicateRisk;
  const risk =
    rawRisk && typeof rawRisk === "object" && Object.keys(rawRisk).length > 0
      ? rawRisk
      : null;
  // Strip duplicateRisk out of the draft — it lives as a sibling on AIDraft,
  // not nested. This matches the original AIDraft shape.
  delete draft.duplicateRisk;
  return { draft, risk };
}

export function isAnthropicConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}
