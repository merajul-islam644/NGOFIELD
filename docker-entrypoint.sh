#!/bin/sh
# Container entrypoint: start the Node API server in the background, then
# exec nginx in the foreground so it becomes PID 1 and receives SIGTERM
# cleanly from the container runtime.

set -e

API_PORT="${API_PORT:-3000}"
NODE_LOG="${NODE_LOG:-/var/log/node-api.log}"

echo "[entrypoint] starting Node API on :${API_PORT}"
# Run Node in the background and redirect output to a log file so docker
# logs can still capture it. We do NOT background the API as a child of
# PID 1's process group — once we exec nginx, the API keeps running.
node /app/server/index.js > "${NODE_LOG}" 2>&1 &

NODE_PID=$!
echo "[entrypoint] Node API pid=${NODE_PID}, waiting for /api/health"

# Wait up to 30s for the API to become healthy.
for i in $(seq 1 30); do
  if wget --quiet --spider "http://127.0.0.1:${API_PORT}/api/health" 2>/dev/null; then
    echo "[entrypoint] Node API is ready"
    break
  fi
  if ! kill -0 "${NODE_PID}" 2>/dev/null; then
    echo "[entrypoint] Node API crashed during startup — last log:"
    cat "${NODE_LOG}" || true
    exit 1
  fi
  sleep 1
done

if ! wget --quiet --spider "http://127.0.0.1:${API_PORT}/api/health" 2>/dev/null; then
  echo "[entrypoint] Node API failed to become healthy in 30s — last log:"
  cat "${NODE_LOG}" || true
  exit 1
fi

echo "[entrypoint] handing off to nginx (foreground, becomes PID 1)"
exec "$@"
