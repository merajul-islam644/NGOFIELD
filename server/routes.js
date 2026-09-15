// Express Router for /api/*. Imported by both:
//   - server/index.js (the standalone prod server)
//   - vite.config.ts (the dev-mode middleware plugin)
// Splitting the router out of the app avoids Express↔Vite middleware
// incompatibility when mounting the full app under Vite.

import { Router } from "express";
import { analyzeFieldNote, isAnthropicConfigured } from "./anthropic.js";
import { heuristicAnalyze } from "./heuristic.js";

// ─── Prior-case lookup (same Blocks SDK the frontend uses) ──────────────────
// On the server we read SDK config from process.env (loaded from .env above
// by server/index.js) instead of import.meta.env (Vite-only).

let _blocksClient = null;
async function getBlocksClient() {
  if (_blocksClient) return _blocksClient;
  const { createBlocksClient } = await import("@seliseblocks/client");
  const apiUrl = process.env.VITE_BLOCKS_API_URL;
  const xBlocksKey = process.env.VITE_BLOCKS_X_BLOCKS_KEY;
  const oidcUrl = process.env.VITE_BLOCKS_OIDC_URL;
  const oidcClientId = process.env.VITE_BLOCKS_OIDC_CLIENT_ID;
  const oidcScope = process.env.VITE_BLOCKS_OIDC_SCOPE;
  if (!apiUrl || !xBlocksKey || !oidcUrl || !oidcClientId) {
    throw new Error("Blocks SDK config missing (VITE_BLOCKS_*)");
  }
  _blocksClient = createBlocksClient({
    apiUrl,
    xBlocksKey,
    oidc: { clientId: oidcClientId, url: oidcUrl, scope: oidcScope },
  });
  return _blocksClient;
}

async function fetchPriorCasesForHousehold(householdId) {
  if (!householdId) return [];
  try {
    const bc = await getBlocksClient();
    const cases = bc.data.collection("Case", {
      fields: ["householdId", "programme", "status", "stipendAmount", "createdAt"],
    });
    const res = await cases.list({ pageNo: 1, pageSize: 100, filter: { householdId } });
    const items = res?.data?.getCases?.items ?? res?.data?.data?.getCases?.items ?? [];
    return items.map((row) => ({
      id: row.ItemId ?? row.id,
      programme: row.programme,
      status: row.status,
      stipendAmount: row.stipendAmount,
      createdAt: row.CreatedDate ?? row.createdAt,
    }));
  } catch (err) {
    // Graceful — let the LLM decide without prior-case signal.
    console.warn("[server] prior-case lookup failed:", err?.message ?? err);
    return [];
  }
}

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({
    ok: true,
    ai: isAnthropicConfigured() ? "anthropic" : "heuristic-fallback",
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
  });
});

apiRouter.post("/analyze", async (req, res) => {
  const { note, household } = req.body ?? {};
  if (typeof note !== "string" || note.trim().length < 6) {
    res.status(400).json({ error: "note must be a string of at least 6 characters" });
    return;
  }
  const priorCases = household?.id
    ? await fetchPriorCasesForHousehold(household.id)
    : [];
  if (!isAnthropicConfigured()) {
    const { draft, risk } = heuristicAnalyze({ note, household });
    res.json({ draft, risk, fallback: true, reason: "ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN not set" });
    return;
  }
  try {
    const { draft, risk } = await analyzeFieldNote({ note, household, priorCases });
    res.json({ draft, risk, fallback: false });
  } catch (err) {
    console.error("[server] Anthropic call failed:", err?.message ?? err);
    let draft, risk;
    try {
      ({ draft, risk } = heuristicAnalyze({ note, household }));
    } catch (heuristicErr) {
      console.error("[server] heuristic fallback also failed:", heuristicErr?.message ?? heuristicErr);
      // Absolute last-resort — never throw out of the request handler.
      draft = {
        summary: "Field note captured during household visit.",
        need: "Livelihood",
        householdContext: "Household profile to be verified on first follow-up visit.",
        urgency: "Medium",
        suggestedActions: ["Verify household details on next visit"],
        documentsNeeded: ["Household ledger"],
        donorReportDraft: "Field visit recorded; programme to be confirmed after follow-up.",
        proposedStipend: 5000,
      };
      risk = null;
    }
    res.status(502).json({
      draft,
      risk,
      fallback: true,
      reason: `Anthropic error: ${err?.message ?? "unknown"}`,
    });
  }
});
