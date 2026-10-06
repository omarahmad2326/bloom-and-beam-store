#!/usr/bin/env bash
# Release script for the DigitalOcean droplet (run from the repo root on the server).
#
#   SUPABASE_DB_URL='postgresql://postgres.<ref>:[YOUR-PASSWORD]@<pooler-host>:5432/postgres' \
#   SUPABASE_DB_PASSWORD='your-db-password' \
#   SUPABASE_ACCESS_TOKEN=sbp_xxx \       # optional: deploys the sitemap edge function
#   CLOUDFLARE_API_TOKEN=xxx \            # optional: deploys the edge redirect worker
#   bash scripts/deploy-server.sh
#
# SUPABASE_DB_URL is the "Session pooler" string from Supabase → Connect (IPv4-friendly);
# a literal [YOUR-PASSWORD] in it is replaced with the URL-encoded SUPABASE_DB_PASSWORD.
# If SUPABASE_DB_URL is not set, the CLI link flow is used (needs SUPABASE_ACCESS_TOKEN).
#
# Order matters: database migration first, then the frontend build (the new
# frontend reads columns the migration creates). nginx proxies to the Next.js server (pm2 app
# "mrbedmed"); scripts/setup-next-server.sh sets that up once.
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
NODE_MINOR="$(node -p 'process.versions.node.split(".")[1]')"
{ [ "$NODE_MAJOR" -gt 20 ] || { [ "$NODE_MAJOR" -eq 20 ] && [ "$NODE_MINOR" -ge 9 ]; }; } || die "Node 20.9+ required (found $(node -v))"
ok "node $(node -v)"
[ -f supabase/migrations/20261006120000_cms_seo_upgrade.sql ] || die "new code not present; run: git pull origin main"
ok "release code present ($(git rev-parse --short HEAD 2>/dev/null || echo 'no git'))"
if [ ! -f .env ] && [ -n "${PUBLISHABLE_KEY:-}" ]; then
  printf 'VITE_SUPABASE_URL=https://%s.supabase.co\nVITE_SUPABASE_PUBLISHABLE_KEY=%s\nVITE_SITE_URL=%s\n' \
    "$PROJECT_REF" "$PUBLISHABLE_KEY" "$SITE" > .env
  ok "created .env from PUBLISHABLE_KEY"
fi
[ -f .env ] || die ".env missing; re-run with PUBLISHABLE_KEY=... to create it"
set -a; . ./.env; set +a
[ -n "${VITE_SUPABASE_URL:-}" ] && [ -n "${VITE_SUPABASE_PUBLISHABLE_KEY:-}" ] || die ".env lacks VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY"
case "$VITE_SUPABASE_URL" in *"$PROJECT_REF"*) ok ".env points at $PROJECT_REF" ;; *) die ".env points at a different Supabase project: $VITE_SUPABASE_URL" ;; esac
: "${SUPABASE_DB_PASSWORD:?set SUPABASE_DB_PASSWORD (Supabase → Project Settings → Database)}"
export SUPABASE_DB_PASSWORD
[ -n "${SUPABASE_ACCESS_TOKEN:-}" ] && export SUPABASE_ACCESS_TOKEN
SB="npx --yes supabase@latest"

if [ -n "${SUPABASE_DB_URL:-}" ]; then
  ENCODED_PW="$(node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$SUPABASE_DB_PASSWORD")"
  DB_URL="${SUPABASE_DB_URL//\[YOUR-PASSWORD\]/$ENCODED_PW}"
  case "$DB_URL" in *"$PROJECT_REF"*) ok "DB URL is for $PROJECT_REF" ;; *) die "SUPABASE_DB_URL is not for project $PROJECT_REF" ;; esac
  PUSH=(db push --db-url "$DB_URL")
else
  [ -n "${SUPABASE_ACCESS_TOKEN:-}" ] || die "set SUPABASE_DB_URL (Supabase → Connect → Session pooler) or SUPABASE_ACCESS_TOKEN"
  $SB link --project-ref "$PROJECT_REF" --password "$SUPABASE_DB_PASSWORD"
  PUSH=(db push --password "$SUPABASE_DB_PASSWORD")
fi

log "2/6 Database migration"
$SB "${PUSH[@]}" --dry-run
if [ "${YES:-}" != "1" ]; then
  read -r -p "   Check the list above shows only this release's new migration(s). Apply? [y/N] " answer
  [ "$answer" = "y" ] || die "stopped before migration (nothing changed)"
fi
$SB "${PUSH[@]}"
ok "migration applied"

log "3/6 Sitemap edge function"
if [ -n "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  $SB functions deploy sitemap --project-ref "$PROJECT_REF" --use-api
  ok "sitemap deployed"
else
  printf '   skipped (no SUPABASE_ACCESS_TOKEN). The current sitemap keeps working; deploy later with a token.\n'
fi

log "4/6 Redirects (301)"
if [ -f /etc/nginx/conf.d/mrbedmed-redirects.conf ]; then
  node scripts/sync-redirects.mjs && ok "nginx redirect map synced (cron keeps it current)"
elif [ -n "${CLOUDFLARE_API_TOKEN:-}" ]; then
  export CLOUDFLARE_API_TOKEN
  ( cd deploy/cloudflare-redirects && npx --yes wrangler@4 deploy \
      --var "SUPABASE_URL:${VITE_SUPABASE_URL}" \
      --var "SUPABASE_ANON_KEY:${VITE_SUPABASE_PUBLISHABLE_KEY}" )
  ok "worker deployed"
else
  printf '   not set up yet: run "sudo bash scripts/setup-nginx-redirects.sh" once for real 301s.\n'
fi

log "5/6 Build and restart the Next.js site"
if ! grep -qRs 'BEGIN mrbedmed_next' /etc/nginx/sites-enabled/ /etc/nginx/conf.d/; then
  die "nginx is not proxying to Next.js yet; run once: sudo bash scripts/setup-next-server.sh"
fi
bash scripts/next-release.sh

log "6/6 Smoke checks"
check() { printf '   %-48s %s\n' "$1" "$(curl -s -o /dev/null -w '%{http_code}' "$2")"; }
check "home (expect 200)" "$SITE/"
check "category page (expect 200)" "$SITE/category/icu-bed"
check "uppercase category (expect 301)" "$SITE/category/ICU-beds"
printf '   %-48s %s\n' "product name in page source (expect 1+)" \
  "$(curl -s "$SITE/products/stryker-1007-stretcher" | grep -c 'Stryker 1007' || true)"
printf '   %-48s %s\n' "redirects table (expect 200)" \
  "$(curl -s -o /dev/null -w '%{http_code}' "$VITE_SUPABASE_URL/rest/v1/redirects?select=id&limit=1" -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY")"
printf '   %-48s %s\n' "sitemap URL count" \
  "$(curl -s "$SITE/sitemap.xml" | grep -o '<url>' | wc -l)"

printf '\n\033[1;32mRelease complete.\033[0m Hard-refresh the site (Cloudflare may cache for a few minutes).\n'
printf 'Rollback: git checkout <previous commit> && bash scripts/next-release.sh\n'
