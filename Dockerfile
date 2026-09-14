# Multi-stage build for NGOField (Vite + React static SPA).
#
# Stage 1 — build: install deps with the lockfile, run the production build
# into ./dist. Uses `npm ci` (not `npm install`) so the build is reproducible
# against package-lock.json.
#
# Stage 2 — serve: copy the built assets into nginx:alpine and serve them
# with a config that falls back to /index.html for SPA routes. Listens on
# 8080 — Blocks release pipelines expect a non-privileged port.

FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY tsconfig.json tsconfig.node.json vite.config.ts tailwind.config.js postcss.config.js index.html ./
# Bundle VITE_* env vars from .env into the production JS so the Blocks
# client can boot at runtime. The runtime nginx stage only ships dist/,
# so the values only appear baked into the static bundle.
COPY .env .env
COPY public ./public
COPY src ./src

RUN npm run build

# ---

FROM nginx:1.27-alpine

# Replace the default site with one that handles SPA routing (any unmatched
# path falls back to /index.html) and listens on 8080 for the Blocks runtime.
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --spider http://127.0.0.1:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
