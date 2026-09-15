// NGOField backend — standalone prod server.
//
// Runs on API_PORT (default 3000) and serves both:
//   - /api/* via the shared `apiRouter` (see ./routes.js)
//   - the built SPA from dist/ (mirrors the old nginx static + SPA-fallback)
//
// In dev, `npm run dev` mounts the same `apiRouter` directly via Vite
// middleware (see vite.config.ts) so there's one route definition for both.
//
// In the Docker image, nginx sits in front on :8080 and proxies /api/* to
// this Node process on :3000 — see Dockerfile + docker-entrypoint.sh.
//
// Env:
//   ANTHROPIC_API_KEY  (server-only — must NOT be VITE_-prefixed)
//   ANTHROPIC_MODEL    (optional, default claude-sonnet-4-5)
//   ANTHROPIC_MAX_TOKENS (optional, default 1024)
//   VITE_BLOCKS_*      (passed through to the Blocks SDK client used here)
//   API_PORT           (internal port, default 3000 — see Dockerfile for
//                       why we use API_PORT instead of PORT)
//   PORT               (ignored; PaaS platforms commonly inject PORT=8080
//                       which would collide with nginx on the same port)

import express from "express";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { apiRouter } from "./routes.js";
import { isAnthropicConfigured } from "./anthropic.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const DIST_DIR = resolve(REPO_ROOT, "dist");

// ─── Tiny .env loader (Node-only — never imported from the browser bundle) ──
// Reads `.env` from repo root so `ANTHROPIC_API_KEY` set locally is picked up
// by `node server/index.js` (the dev server loads its own copy via vite.config
// when needed).
function loadDotEnv() {
  const envPath = resolve(REPO_ROOT, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    const key = m[1];
    if (process.env[key] !== undefined) continue; // OS env wins
    let value = m[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}
loadDotEnv();

// ─── Express app factory ────────────────────────────────────────────────────
// `opts.serveStatic`: "on" → serve dist/, "off" → skip (vite dev handles SPA),
// "auto" → serve dist/ only if it exists.
export function createApp(opts = {}) {
  const serveStatic = opts.serveStatic ?? (existsSync(DIST_DIR) ? "on" : "off");
  const app = express();
  app.use(express.json({ limit: "256kb" }));
  app.use("/api", apiRouter);

  if (serveStatic === "on") {
    // Long-lived caching for fingerprinted assets; no caching for the SPA
    // shell so deploys are picked up immediately — mirrors the old nginx
    // behaviour.
    app.use(
      "/assets",
      express.static(resolve(DIST_DIR, "assets"), {
        immutable: true,
        maxAge: "31536000",
      }),
    );
    app.use(express.static(DIST_DIR, { index: false, maxAge: 0 }));
    // SPA fallback.
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.sendFile(resolve(DIST_DIR, "index.html"));
    });
  }

  return app;
}

// ─── Standalone prod entrypoint ─────────────────────────────────────────────
const isDirectRun = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  // Use API_PORT (not PORT) so PaaS platforms that auto-inject PORT=8080
  // don't make Node collide with nginx on the same port. Bind to 0.0.0.0
  // explicitly so the listener is reachable from nginx (which proxies from
  // 127.0.0.1 inside the same container). Without 0.0.0.0, some Node builds
  // default to ::1 (IPv6) only and 127.0.0.1 connections from nginx hang.
  const port = Number(process.env.API_PORT || 3000);
  const app = createApp({ serveStatic: "auto" });
  app.listen(port, "0.0.0.0", () => {
    const ai = isAnthropicConfigured() ? "anthropic" : "heuristic-fallback";
    // eslint-disable-next-line no-console
    console.log(
      `[ngofield] listening on 0.0.0.0:${port} (AI mode: ${ai}, model: ${process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5"})`,
    );
  });
}
