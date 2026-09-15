import path from "path";
import { readFileSync, existsSync } from "node:fs";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vite";

function loadEnvFile() {
  const envPath = path.resolve(__dirname, ".env");
  if (!existsSync(envPath)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    const value = m[2].replace(/^['"]|['"]$/g, "");
    out[key] = value;
    // Mirror EVERYTHING into process.env (including VITE_-prefixed vars,
    // so server-side code like the Blocks SDK lookup in server/routes.js
    // can read VITE_BLOCKS_*). Vite itself handles client-side exposure
    // via import.meta.env separately — populating process.env here does
    // NOT cause secrets to be inlined into the browser bundle. OS env
    // wins if already set (mirrors how dotenv behaves).
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
  return out;
}

const env = loadEnvFile();
const devHost = env.VITE_BLOCKS_DEV_HOST || "dttcgi.slsblx.com";
const devPort = Number(env.VITE_BLOCKS_DEV_PORT || 5173);
const certPath = path.resolve(__dirname, ".cert/dev-cert.pem");
const keyPath = path.resolve(__dirname, ".cert/dev-key.pem");
const hasCert = existsSync(certPath) && existsSync(keyPath);

/**
 * Mounts the API router from `server/routes.js` as Vite middleware so
 * `npm run dev` serves `/api/*` from the same process as the SPA. The same
 * router is used in production (run standalone via `node server/index.js`)
 * — this plugin only enables dev-mode wiring.
 *
 * Implementation note: we call the Express `app` with our own terminating
 * callback rather than Vite's `next`. When Express's chain ends without a
 * match, Vite's connect layer would re-iterate its stack under HTTP/2 and
 * crash on `parseUrl(req).pathname` (req.url is not propagated by the HTTP/2
 * server for the second iteration). Our callback handles "no match" with a
 * 404 directly, keeping the request out of Vite's chain entirely.
 */
function apiPlugin(): Plugin {
  return {
    name: "ngofield-api-middleware",
    async configureServer(server) {
      const express = (await import("express")).default;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { apiRouter } = await import("./server/routes.js") as any;
      const apiApp = express();
      apiApp.use(express.json({ limit: "256kb" }));
      // Mount apiRouter at root: Vite's middleware iteration strips the
      // mount path prefix from req.url before invoking this function, so
      // by the time we hand the request to Express the URL is already
      // "/health" or "/analyze" — no need to re-prefix "/api".
      apiApp.use(apiRouter);
      server.middlewares.use("/api", (req, res, _viteNext) => {
        // Hand the request to the Express app with OUR callback so Express
        // never propagates "no match" back into Vite's HTTP/2 connect chain.
        // The req/res coming from Vite's connect middleware are Node's
        // IncomingMessage/ServerResponse — Express accepts those at runtime
        // (and re-enhances res with .json/.send) so the cast is safe.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        apiApp(req as any, res as any, (err: unknown) => {
          if (res.headersSent) return;
          if (err) {
            const e = err as { status?: number; message?: string };
            res.statusCode = e.status || 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: e.message }));
          } else {
            res.statusCode = 404;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Not Found" }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), apiPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: devHost,
    port: devPort,
    strictPort: true,
    // Allow the dev host (and its 127.0.0.1 equivalent) to bypass Vite's
    // default DNS-rebinding protection, which otherwise 404s custom hosts
    // with "Blocked request."
    allowedHosts: [devHost, "localhost", "127.0.0.1"],
    // Force HTTP/1.1 over TLS: without this, Vite creates an HTTP/2 secure
    // server when `https` is set (no `proxy`), and HTTP/2 streams crash
    // Vite's connect-style middleware iteration with
    //   `TypeError: Cannot read properties of undefined (reading 'pathname')`
    // when our async Express middleware terminates without calling next().
    // Any truthy value here is enough — Vite picks `https.createServer` over
    // `http2.createSecureServer` whenever `proxy` is set.
    proxy: {},
    ...(hasCert
      ? {
          https: {
            cert: readFileSync(certPath),
            key: readFileSync(keyPath),
          },
        }
      : {}),
  },
});
