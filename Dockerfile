# Multi-stage build for NGOField (Vite + React static SPA + Node API).
#
# Stage 1 — build: install deps with the lockfile, run the production build
# into ./dist, then prune devDependencies so the runtime image only carries
# the packages the Node API needs (@anthropic-ai/sdk, express).
#
# Stage 2 — serve: nginx:alpine on :8080 serves the SPA + reverse-proxies
# /api/* to the Node API on :3000. A small entrypoint (`docker-entrypoint.sh`)
# starts both processes so the container only exposes one port externally.

FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY tsconfig.json tsconfig.node.json vite.config.ts tailwind.config.js postcss.config.js index.html ./
# Vite's `.env.production` is the convention file loaded only when
# running `vite build`. It is the public, non-secret counterpart to a
# locally-overridden `.env.local`, and is safe to ship in the build
# context (no client secret is present — VITE_* values are inlined into
# the static bundle and exposed to the browser regardless).
COPY .env.production .env.production
COPY public ./public
# `server/` is required here because vite.config.ts imports `./server/routes.js`
# and tsconfig.node.json pulls in `server/**/*.d.ts` for type-checking. The
# runtime stage below already re-COPYs this directory into the final image.
COPY server ./server
COPY src ./src

RUN npm run build

# Strip devDependencies so the runtime image only carries prod packages.
RUN npm prune --omit=dev

# ---

FROM nginx:1.27-alpine

# Pin the in-container API port so docker-entrypoint.sh's health probe and
# nginx.conf's proxy_pass agree with `node server/index.js`'s listener.
# Use API_PORT (not PORT) — many PaaS platforms inject PORT=8080 by default,
# which would collide with nginx on the same port inside this container.
ENV API_PORT=3000

# Replace the default site with one that handles SPA routing AND proxies
# /api/* to the Node API server (which runs on :3000 inside the container).
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Static SPA build output.
COPY --from=build /app/dist /usr/share/nginx/html

# Node runtime for the API server.
# - `server/`       : the API source (createApp, routes, Anthropic wrapper)
# - `node_modules/` : pruned prod deps from the build stage
# - `package.json`  : so `node server/index.js` can resolve deps
COPY --from=build /app/server        /app/server
COPY --from=build /app/node_modules  /app/node_modules
COPY --from=build /app/package.json  /app/package.json

# Tiny entrypoint that starts the Node API in the background, waits for it
# to be ready, then execs nginx in the foreground (so nginx is PID 1 and
# receives SIGTERM properly).
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --spider http://127.0.0.1:8080/api/health || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
