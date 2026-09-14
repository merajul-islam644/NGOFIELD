// Generate a self-signed cert for local HTTPS dev on the project's app domain.
// Reads VITE_BLOCKS_DEV_HOST from .env (or process.env, or argv), so the dev
// URL in the browser matches the OIDC redirect URI registered in IAM.
//
// Usage:
//   node scripts/generate-cert.mjs                 # uses .env
//   node scripts/generate-cert.mjs dttcgi.slsblx.com

import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import selfsigned from "selfsigned";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function readEnv() {
  const envPath = resolve(root, ".env");
  if (!existsSync(envPath)) return {};
  const text = readFileSync(envPath, "utf8");
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
  return out;
}

const argHost = process.argv[2];
const env = readEnv();
const host = argHost || env.VITE_BLOCKS_DEV_HOST || process.env.VITE_BLOCKS_DEV_HOST;

if (!host) {
  console.error("No domain given. Set VITE_BLOCKS_DEV_HOST in .env, or pass it as argv[2].");
  process.exit(1);
}

const certDir = resolve(root, ".cert");
mkdirSync(certDir, { recursive: true });

const attrs = [{ name: "commonName", value: host }];
const pems = await selfsigned.generate(attrs, {
  algorithm: "sha256",
  keySize: 2048,
  extensions: [
    { name: "basicConstraints", cA: true },
    {
      name: "subjectAltName",
      altNames: [
        { type: 2, value: host },
        { type: 2, value: "localhost" },
        { type: 7, ip: "127.0.0.1" },
        { type: 7, ip: "::1" },
      ],
    },
  ],
});

const keyPath = resolve(certDir, "dev-key.pem");
const certPath = resolve(certDir, "dev-cert.pem");
writeFileSync(keyPath, pems.private, "utf8");
writeFileSync(certPath, pems.cert, "utf8");

console.log("Wrote:", certPath);
console.log("Wrote:", keyPath);
console.log("");
console.log("Trust the cert so the browser stops warning:");
console.log("  Windows: certutil -addstore -f Root .cert\\dev-cert.pem");
console.log("  macOS:   sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain .cert/dev-cert.pem");
console.log("  Linux:   sudo cp .cert/dev-cert.pem /usr/local/share/ca-certificates/blocks-dev.crt && sudo update-ca-certificates");
