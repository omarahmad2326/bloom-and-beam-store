#!/usr/bin/env bash
# One-time switch-over on the droplet: from nginx serving the static dist/ build to nginx
# proxying to the Next.js server (pages are rendered on the server, so View Page Source and
# Google see the full content).
#
#   cd /var/www/bedmed && sudo bash scripts/setup-next-server.sh
#
# Steps:
#   1. builds the site and starts it with pm2 as "mrbedmed" on 127.0.0.1:$MRBEDMED_PORT (default 3100)
#   2. rewrites only the nginx server blocks whose root is this app (scripts/nginx-next-proxy.py):
#      static files from public/, /_next/ and every page proxied to Next.js. Keeps listen,
#      server_name, certificates and the redirect-map 301 rule. Removes the old canonical sub_filter.
#   3. nginx -t, reload, then checks the live site through Cloudflare.
# Every touched file is backed up to /root/nginx-backup-next-*. If nginx -t or the live checks
# fail, the nginx config is restored (the old dist/ site comes back). Safe to re-run.
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${MRBEDMED_PORT:-3100}"
export MRBEDMED_PORT="$PORT"
SITE="https://mrbedmed.com"
SNIPPET=/etc/nginx/snippets/mrbedmed-next-proxy.conf
CANONICAL_CONF=/etc/nginx/conf.d/mrbedmed-canonical.conf
BACKUP="/root/nginx-backup-next-$(date +%Y%m%d-%H%M%S)"

log() { printf '\n\033[1;34m== %s\033[0m\n' "$*"; }
ok()  { printf '\033[1;32m   ok: %s\033[0m\n' "$*"; }
warn(){ printf '\033[1;33m   note: %s\033[0m\n' "$*"; }
die() { printf '\n\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

cd "$APP_DIR"
[ "$(id -u)" = 0 ] || die "run as root (sudo)"
command -v nginx >/dev/null || die "nginx not found"
command -v python3 >/dev/null || die "python3 not found (apt install python3)"
command -v pm2 >/dev/null || die "pm2 not found (npm install -g pm2)"
[ -f .env ] || die "$APP_DIR/.env missing"
[ -f next.config.mjs ] || die "Next.js code not present; run: git pull --ff-only origin main"

log "1/5 Port $PORT for the Next.js server"
if pm2 describe mrbedmed >/dev/null 2>&1; then
  ok "pm2 app 'mrbedmed' already exists (re-run)"
elif ss -ltnH "( sport = :$PORT )" 2>/dev/null | grep -q .; then
  die "port $PORT is used by another program. Pick a free one: MRBEDMED_PORT=3200 sudo -E bash scripts/setup-next-server.sh"
else
  ok "port $PORT is free"
fi

log "2/5 Build and start the Next.js server (the current site stays up meanwhile)"
bash scripts/next-release.sh

log "3/5 Locate and back up the nginx site serving $APP_DIR"
mapfile -t SITES < <(grep -lRsE "^[[:space:]]*(root|alias)[[:space:]]+$APP_DIR(/|;|[[:space:]])" /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null | xargs -r -n1 readlink -f | sort -u)
[ "${#SITES[@]}" -gt 0 ] || die "no nginx config has root $APP_DIR (looked in sites-enabled and conf.d)"
for f in "${SITES[@]}"; do ok "site config: $f"; done
mkdir -p "$BACKUP"
for f in "${SITES[@]}" "$SNIPPET" "$CANONICAL_CONF"; do [ -f "$f" ] && cp -a --parents "$f" "$BACKUP"; done
ok "backup in $BACKUP"

restore() {
  printf '\033[1;31m   restoring nginx config from %s\033[0m\n' "$BACKUP" >&2
  local site
  for site in "${SITES[@]}"; do [ -f "$BACKUP$site" ] && cp -a "$BACKUP$site" "$site"; done
  if [ -f "$BACKUP$SNIPPET" ]; then cp -a "$BACKUP$SNIPPET" "$SNIPPET"; else rm -f "$SNIPPET"; fi
  [ -f "$BACKUP$CANONICAL_CONF" ] && cp -a "$BACKUP$CANONICAL_CONF" "$CANONICAL_CONF"
  nginx -t >/dev/null 2>&1 && nginx -s reload || true
}

log "4/5 Point nginx at the Next.js server"
mkdir -p "$(dirname "$SNIPPET")"
cat > "$SNIPPET" <<EOF
# Managed by $APP_DIR/scripts/setup-next-server.sh
proxy_pass http://127.0.0.1:$PORT;
proxy_http_version 1.1;
proxy_set_header Host \$host;
proxy_set_header X-Real-IP \$remote_addr;
proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto \$scheme;
proxy_set_header Connection "";
proxy_read_timeout 60s;
EOF
ok "$SNIPPET"

python3 scripts/nginx-next-proxy.py "$APP_DIR" "$SNIPPET" "${SITES[@]}" | sed 's/^/   updated: /'
grep -q 'BEGIN mrbedmed_next' "${SITES[@]}" || { restore; die "no server block with root $APP_DIR was rewritten; nothing changed"; }
# The canonical tag is in the server-rendered HTML now; the old sub_filter map is unused.
rm -f "$CANONICAL_CONF"

if ! nginx -t; then restore; die "nginx -t failed; original config restored (site unchanged)"; fi
nginx -s reload
ok "nginx reloaded"

log "5/5 Check the live site (through Cloudflare)"
sleep 2
FAILED=0
check() { # label, url, expected status, optional text that must be in the body
  local body code
  body="$(curl -s --max-time 20 -H 'Cache-Control: no-cache' -w '\n%{http_code}' "$2" || true)"
  code="${body##*$'\n'}"; body="${body%$'\n'*}"
  if [ "$code" = "$3" ] && { [ -z "${4:-}" ] || grep -qF -- "$4" <<<"$body"; }; then
    printf '   \033[1;32mPASS\033[0m %s\n' "$1"
  else
    printf '   \033[1;31mFAIL\033[0m %s (got %s)\n' "$1" "$code"; FAILED=1
  fi
}
PRODUCT="$SITE/products/stryker-1007-stretcher?nocache=$RANDOM"
check "home page source has its H1"                    "$SITE/?nocache=$RANDOM" 200 '<h1'
check "product page source has the product name"       "$PRODUCT" 200 'Stryker 1007'
check "product page source has the price"              "$PRODUCT" 200 '$1,800'
check "product page source has its canonical"          "$PRODUCT" 200 '<link rel="canonical" href="https://mrbedmed.com/products/stryker-1007-stretcher"'
check "product page source has Product schema"         "$PRODUCT" 200 '"@type":"Product"'
check "unknown page answers 404"                       "$SITE/no-such-page-$RANDOM" 404
check "sitemap.xml"                                    "$SITE/sitemap.xml" 200 '<urlset'
check "robots.txt (static file from public/)"          "$SITE/robots.txt" 200
ASSET="$(curl -s --max-time 20 "$SITE/?nocache=$RANDOM" | grep -o '/_next/static/[^"]*\.js' | head -1 || true)"
if [ -n "$ASSET" ]; then check "built JS asset ($ASSET)" "$SITE$ASSET" 200; else printf '   \033[1;31mFAIL\033[0m no /_next/static asset in the home page\n'; FAILED=1; fi
printf '   %-48s %s\n' "uppercase category (expect 301)" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$SITE/category/ICU-beds")"

if [ "$FAILED" = 1 ]; then
  restore
  pm2 logs mrbedmed --lines 40 --nostream || true
  die "live checks failed; nginx restored to the previous static site. The Next.js server is still running on 127.0.0.1:$PORT for debugging."
fi

printf '\n\033[1;32mDone.\033[0m mrbedmed.com is served by Next.js (pm2 app "mrbedmed", port %s).\n' "$PORT"
printf 'Future releases: bash scripts/deploy-server.sh (or just: bash scripts/next-release.sh)\n'
printf 'Logs: pm2 logs mrbedmed   Status: pm2 status\n'
printf 'Undo: restore files from %s, nginx -s reload, pm2 delete mrbedmed (the old dist/ is still on disk)\n' "$BACKUP"
