#!/usr/bin/env bash
# Release script for the DigitalOcean droplet (run from the repo root on the server).
#
#   SUPABASE_ACCESS_TOKEN=sbp_xxx \
#   SUPABASE_DB_PASSWORD='your-db-password' \
#   CLOUDFLARE_API_TOKEN=xxx \            # optional: deploys the edge redirect worker
#   bash scripts/deploy-server.sh
#
# Order matters: database migration first, then the frontend build (the new
# frontend reads columns the migration creates). nginx serves ./dist directly.
set -euo pipefail

PROJECT_REF="xgzjppyfkfjnwdrxpnpz"
SITE="https://mrbedmed.com"
cd "$(dirname "$0")/.."

log() { printf '\n\033[1;34m== %s\033[0m\n' "$*"; }
ok()  { printf '\033[1;32m   ok: %s\033[0m\n' "$*"; }
die() { printf '\n\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

log "1/6 Pre-flight checks"
command -v node >/dev/null || die "node is not installed"
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 18 ] || die "Node 18+ required (found $(node -v))"
ok "node $(node -v)"
[ -f supabase/migrations/20261006120000_cms_seo_upgrade.sql ] || die "new code not present; run: git pull origin main"
ok "release code present ($(git rev-parse --short HEAD 2>/dev/null || echo 'no git'))"
[ -f .env ] || die ".env missing; it needs VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY"
set -a; . ./.env; set +a
[ -n "${VITE_SUPABASE_URL:-}" ] && [ -n "${VITE_SUPABASE_PUBLISHABLE_KEY:-}" ] || die ".env lacks VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY"
case "$VITE_SUPABASE_URL" in *"$PROJECT_REF"*) ok ".env points at $PROJECT_REF" ;; *) die ".env points at a different Supabase project: $VITE_SUPABASE_URL" ;; esac
: "${SUPABASE_ACCESS_TOKEN:?set SUPABASE_ACCESS_TOKEN (supabase.com/dashboard/account/tokens)}"
: "${SUPABASE_DB_PASSWORD:?set SUPABASE_DB_PASSWORD (Supabase → Project Settings → Database)}"
export SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD
SB="npx --yes supabase@latest"

log "2/6 Database migration"
$SB link --project-ref "$PROJECT_REF" --password "$SUPABASE_DB_PASSWORD"
$SB db push --dry-run --password "$SUPABASE_DB_PASSWORD"
if [ "${YES:-}" != "1" ]; then
  read -r -p "   The list above should show ONLY 20261006120000_cms_seo_upgrade.sql. Apply? [y/N] " answer
  [ "$answer" = "y" ] || die "stopped before migration (nothing changed)"
fi
$SB db push --password "$SUPABASE_DB_PASSWORD"
ok "migration applied"

log "3/6 Sitemap edge function"
$SB functions deploy sitemap --project-ref "$PROJECT_REF" --use-api
ok "sitemap deployed"

log "4/6 Edge redirect worker (Cloudflare)"
if [ -n "${CLOUDFLARE_API_TOKEN:-}" ]; then
  export CLOUDFLARE_API_TOKEN
  ( cd deploy/cloudflare-redirects && npx --yes wrangler@4 deploy \
      --var "SUPABASE_URL:${VITE_SUPABASE_URL}" \
      --var "SUPABASE_ANON_KEY:${VITE_SUPABASE_PUBLISHABLE_KEY}" )
  ok "worker deployed"
else
  printf '   skipped (no CLOUDFLARE_API_TOKEN). Old URLs still redirect in the browser, but not as HTTP 301 yet.\n'
fi

log "5/6 Build frontend (previous build kept in dist.prev for rollback)"
npm ci --no-audit --no-fund
rm -rf dist.prev
[ -d dist ] && cp -a dist dist.prev
npm run build
[ -f dist/index.html ] || die "build produced no dist/index.html"
ok "dist/ rebuilt; nginx serves it immediately"

log "6/6 Smoke checks"
check() { printf '   %-48s %s\n' "$1" "$(curl -s -o /dev/null -w '%{http_code}' "$2")"; }
check "home (expect 200)" "$SITE/"
check "category page (expect 200)" "$SITE/category/icu-bed"
check "uppercase category (expect 301 with worker)" "$SITE/category/ICU-bed"
printf '   %-48s %s\n' "redirects table (expect 200)" \
  "$(curl -s -o /dev/null -w '%{http_code}' "$VITE_SUPABASE_URL/rest/v1/redirects?select=id&limit=1" -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY")"
printf '   %-48s %s\n' "sitemap URL count" \
  "$(curl -s "$VITE_SUPABASE_URL/functions/v1/sitemap" -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY" | grep -c '<url>' || true)"

printf '\n\033[1;32mRelease complete.\033[0m Hard-refresh the site (Cloudflare may cache for a few minutes).\n'
printf 'Rollback frontend: rm -rf dist && mv dist.prev dist\n'
