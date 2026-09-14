import path from "path";
import { readFileSync, existsSync } from "node:fs";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

function loadEnvFile() {
  const envPath = path.resolve(__dirname, ".env");
  if (!existsSync(envPath)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
  return out;
}

const env = loadEnvFile();
const devHost = env.VITE_BLOCKS_DEV_HOST || "dttcgi.slsblx.com";
const devPort = Number(env.VITE_BLOCKS_DEV_PORT || 5173);
const certPath = path.resolve(__dirname, ".cert/dev-cert.pem");
const keyPath = path.resolve(__dirname, ".cert/dev-key.pem");
const hasCert = existsSync(certPath) && existsSync(keyPath);

export default defineConfig({
  plugins: [react()],
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
