// Frontend AI service — thin wrapper around the POST /api/analyze endpoint
// served by `server/index.js` (mounted as Vite middleware in dev, run
// standalone in prod).
//
// The 5-step UI animation in NewCase.tsx keeps working unchanged: this
// service still exposes `analyzeStream()` that yields the same labelled
// progress events while the real fetch is in flight.
//
// If the server responds with `fallback: true` (no API key / upstream error),
// we surface a one-line toast so the user knows the draft is rule-based.

import type { AIDraft, DuplicateRisk, Household } from "@/types";

export interface AnalyzeInput {
  note: string;
  household: Household | null;
}

export interface AnalyzeProgress {
  step: number;
  label: string;
  status: "active" | "complete";
}

export interface AnalyzeResult {
  draft: AIDraft;
  risk: DuplicateRisk | null;
  /** True when the server returned a heuristic fallback (no key / upstream error). */
  fallback?: boolean;
  reason?: string;
}

const PROGRESS_STEPS = [
  "Extracting household context",
  "Identifying programme need",
  "Assessing urgency",
  "Reviewing household history",
  "Checking duplicate-assistance risk",
];

interface AnalyzeResponse {
  draft: AIDraft;
  risk: DuplicateRisk | null;
  fallback?: boolean;
  reason?: string;
}

const FETCH_TIMEOUT_MS = 25_000;

async function postAnalyze(input: AnalyzeInput): Promise<AnalyzeResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
    }
    return (await res.json()) as AnalyzeResponse;
  } finally {
    clearTimeout(timeout);
  }
}

export const aiService = {
  /** Streaming-style progress callback used by NewCase.tsx's stepper. */
  async *analyzeStream(input: AnalyzeInput): AsyncGenerator<AnalyzeProgress, AnalyzeResult, void> {
    // Kick off the real request immediately so the network round-trip happens
    // in parallel with the UI animation.
    const pending = postAnalyze(input).catch((err) => ({ __error: err }));

    for (let i = 0; i < PROGRESS_STEPS.length; i++) {
      yield { step: i, label: PROGRESS_STEPS[i], status: "active" };
      await new Promise((r) => setTimeout(r, 380));
      yield { step: i, label: PROGRESS_STEPS[i], status: "complete" };
    }

    const settled = await pending;
    if ("__error" in settled) {
      // Network or parse error — surface a clear message to the caller.
      const message = settled.__error?.message ?? "AI request failed";
      throw new Error(message);
    }
    return { draft: settled.draft, risk: settled.risk, fallback: settled.fallback, reason: settled.reason };
  },

  async analyze(input: AnalyzeInput): Promise<AnalyzeResult> {
    const res = await postAnalyze(input);
    return { draft: res.draft, risk: res.risk, fallback: res.fallback, reason: res.reason };
  },
};
