#!/usr/bin/env bash
# Build the Next.js site and swap it in with (almost) no downtime. Used by setup-next-server.sh
# (first time) and deploy-server.sh (every release).
#
#   bash scripts/next-release.sh
#
# 1. npm ci, then `next build` into .next-build (the running site keeps serving .next meanwhile)
# 2. swap .next-build → .next, (re)start the pm2 app "mrbedmed"
# 3. health check on 127.0.0.1:$MRBEDMED_PORT; if it fails, the previous build is put back
set -euo pipefail

cd "$(dirname "$0")/.."
PORT="${MRBEDMED_PORT:-3100}"
export MRBEDMED_PORT="$PORT"

log() { printf '\n\033[1;34m== %s\033[0m\n' "$*"; }
ok()  { printf '\033[1;32m   ok: %s\033[0m\n' "$*"; }
die() { printf '\n\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

command -v pm2 >/dev/null || die "pm2 not found (npm install -g pm2)"
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
NODE_MINOR="$(node -p 'process.versions.node.split(".")[1]')"
{ [ "$NODE_MAJOR" -gt 20 ] || { [ "$NODE_MAJOR" -eq 20 ] && [ "$NODE_MINOR" -ge 9 ]; }; } || die "Next.js needs Node 20.9+ (found $(node -v))"

# npm ci replaces node_modules, which the running server loads from; only do it when the
# dependencies changed (or on the first run).
LOCK_SUM="$(sha256sum package-lock.json | cut -d' ' -f1)"
if [ -d node_modules/next ] && [ "$(cat node_modules/.mrbedmed-lock 2>/dev/null)" = "$LOCK_SUM" ]; then
  log "Dependencies unchanged; skipping npm ci"
else
  log "Install dependencies"
  npm ci --no-audit --no-fund
  echo "$LOCK_SUM" > node_modules/.mrbedmed-lock
fi

log "Build into .next-build (the live site keeps running)"
rm -rf .next-build
NEXT_DIST_DIR=.next-build npm run build
[ -f .next-build/BUILD_ID ] || die "build produced no .next-build/BUILD_ID"
ok "build $(cat .next-build/BUILD_ID)"

log "Swap in the new build and (re)start pm2 app 'mrbedmed' on 127.0.0.1:$PORT"
rm -rf .next-old
[ -d .next ] && mv .next .next-old
mv .next-build .next
if pm2 describe mrbedmed >/dev/null 2>&1; then
  pm2 reload ecosystem.config.cjs --update-env
else
  pm2 start ecosystem.config.cjs
fi

healthy() {
  local i code
  for i in $(seq 1 30); do
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "http://127.0.0.1:$PORT/" || true)"
    [ "$code" = 200 ] && curl -s --max-time 10 "http://127.0.0.1:$PORT/" | grep -q '<h1' && return 0
    sleep 1
  done
  return 1
}

if healthy; then
  ok "site answering on 127.0.0.1:$PORT with server-rendered HTML"
  rm -rf .next-old
  pm2 save >/dev/null
else
  printf '\033[1;31m   new build is not answering; putting the previous build back\033[0m\n' >&2
  if [ -d .next-old ]; then rm -rf .next && mv .next-old .next && pm2 reload ecosystem.config.cjs --update-env; fi
  pm2 logs mrbedmed --lines 40 --nostream || true
  die "release failed; previous build restored"
fi
