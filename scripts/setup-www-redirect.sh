#!/usr/bin/env bash
# One-time nginx setup on the droplet: 301 every www.mrbedmed.com URL to the same path on
# https://mrbedmed.com (path + query string kept, one hop). Works behind Cloudflare without
# Cloudflare access, because Cloudflare passes origin redirects through.
#
#   sudo bash scripts/setup-www-redirect.sh
#
# What it does:
#   - removes www.mrbedmed.com from server_name in the configs that serve this app
#     (they currently both claim it: nginx's "conflicting server name" warning)
#   - adds /etc/nginx/sites-available/mrbedmed-www-redirect (+ sites-enabled link):
#     port 80 and 443 blocks for www.mrbedmed.com that only `return 301`
#   - backs up every touched file; restores everything if `nginx -t` fails. Safe to re-run.
set -euo pipefail

APEX="mrbedmed.com"
WWW="www.mrbedmed.com"
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SITE_FILE="/etc/nginx/sites-available/mrbedmed-www-redirect"
SITE_LINK="/etc/nginx/sites-enabled/mrbedmed-www-redirect"
BACKUP="/root/nginx-backup-www-$(date +%Y%m%d-%H%M%S)"

log() { printf '\n\033[1;34m== %s\033[0m\n' "$*"; }
ok()  { printf '\033[1;32m   ok: %s\033[0m\n' "$*"; }
warn(){ printf '\033[1;33m   note: %s\033[0m\n' "$*"; }
die() { printf '\n\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" = 0 ] || die "run as root (sudo)"
command -v nginx >/dev/null || die "nginx not found"

log "1/5 Find configs that claim $WWW"
mapfile -t FILES < <(grep -lRsE "^\s*server_name\b[^;]*\b${WWW//./\\.}\b" /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null \
  | xargs -r -n1 readlink -f | sort -u | grep -v "^$SITE_FILE$" || true)
for f in "${FILES[@]}"; do ok "$f"; done
[ "${#FILES[@]}" -gt 0 ] || warn "no config lists $WWW (already removed?)"

# Origin certificate for the HTTPS block: reuse the one the apex site uses.
APEX_CONF="$(grep -lRsE "^\s*server_name\b[^;]*\b${APEX//./\\.}\b" /etc/nginx/sites-enabled 2>/dev/null | xargs -r -n1 readlink -f | sort -u | xargs -r grep -lE '^\s*ssl_certificate\s' 2>/dev/null | head -1 || true)"
CERT="$( [ -n "$APEX_CONF" ] && grep -E '^\s*ssl_certificate\s' "$APEX_CONF" | head -1 | awk '{print $2}' | tr -d ';' || true)"
KEY="$( [ -n "$APEX_CONF" ] && grep -E '^\s*ssl_certificate_key\s' "$APEX_CONF" | head -1 | awk '{print $2}' | tr -d ';' || true)"
if [ -n "$CERT" ] && [ -f "$CERT" ] && [ -n "$KEY" ] && [ -f "$KEY" ]; then
  ok "origin certificate: $CERT (from $APEX_CONF)"
  if openssl x509 -in "$CERT" -noout -ext subjectAltName 2>/dev/null | grep -qE "DNS:($WWW|\*\.$APEX)"; then
    ok "certificate covers $WWW"
  else
    warn "origin certificate does not list $WWW. Fine with Cloudflare SSL 'Full'; with 'Full (strict)' run: certbot --nginx -d $WWW"
  fi
else
  warn "no origin certificate found for $APEX; adding the port 80 redirect only (Cloudflare 'Flexible' SSL uses port 80)"
  CERT=""
fi

log "2/5 Backup"
mkdir -p "$BACKUP"
for f in "${FILES[@]}" "$SITE_FILE"; do [ -f "$f" ] && cp -a --parents "$f" "$BACKUP"; done
[ -L "$SITE_LINK" ] && cp -a --parents "$SITE_LINK" "$BACKUP"
ok "$BACKUP"

restore() {
  printf '\033[1;31m   restoring from %s\033[0m\n' "$BACKUP" >&2
  for f in "${FILES[@]}"; do [ -f "$BACKUP$f" ] && cp -a "$BACKUP$f" "$f"; done
  if [ -f "$BACKUP$SITE_FILE" ]; then cp -a "$BACKUP$SITE_FILE" "$SITE_FILE"; else rm -f "$SITE_FILE" "$SITE_LINK"; fi
  nginx -t >/dev/null 2>&1 && nginx -s reload || true
}

log "3/5 Remove $WWW from existing server_name lines"
for f in "${FILES[@]}"; do
  # Drop the www name; a line left with no names gets a placeholder that never matches.
  sed -i -E "/^\s*server_name\b/ { s/\s+${WWW//./\\.}\b//g; s/^(\s*server_name)\s*;/\1 _www_moved_to_redirect_block;/ }" "$f"
  ok "updated $f"
done

log "4/5 Install the www → $APEX redirect"
{
  echo "# Managed by $APP_DIR/scripts/setup-www-redirect.sh"
  echo "# Every www URL → same path + query on https://$APEX (single 301)."
  echo "server {"
  echo "    listen 80;"
  echo "    listen [::]:80;"
  echo "    server_name $WWW;"
  echo "    return 301 https://$APEX\$request_uri;"
  echo "}"
  if [ -n "$CERT" ]; then
    echo ""
    echo "server {"
    echo "    listen 443 ssl;"
    echo "    listen [::]:443 ssl;"
    echo "    server_name $WWW;"
    echo "    ssl_certificate $CERT;"
    echo "    ssl_certificate_key $KEY;"
    echo "    return 301 https://$APEX\$request_uri;"
    echo "}"
  fi
} > "$SITE_FILE"
ln -sfn "$SITE_FILE" "$SITE_LINK"
ok "$SITE_FILE"

if ! nginx -t; then restore; die "nginx -t failed; original config restored"; fi
nginx -s reload
ok "nginx reloaded"

log "5/5 Verify through Cloudflare (expect one 301 each, then 200)"
sleep 2
check() {
  local url="$1" expected="$2" code loc final
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$url")"
  loc="$(curl -s -o /dev/null -w '%{redirect_url}' --max-time 10 "$url")"
  final="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$loc" 2>/dev/null || echo '-')"
  if [ "$code" = 301 ] && [ "$loc" = "$expected" ] && [ "$final" = 200 ]; then
    printf '   \033[1;32mPASS\033[0m %-48s → %s\n' "$url" "$loc"
  else
    printf '   \033[1;31mCHECK\033[0m %-47s got %s → %s (then %s), expected 301 → %s\n' "$url" "$code" "${loc:-none}" "$final" "$expected"
  fi
}
check "https://$WWW/" "https://$APEX/"
check "https://$WWW/products" "https://$APEX/products"
check "https://$WWW/products/stryker-2141-hospital-bed" "https://$APEX/products/stryker-2141-hospital-bed"
check "https://$WWW/services?type=rental" "https://$APEX/services?type=rental"
check "http://$WWW/products" "https://$APEX/products"
printf '   apex still served: %s\n' "$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "https://$APEX/products")"

printf '\n\033[1;32mDone.\033[0m Undo: restore files from %s, rm %s %s, nginx -s reload\n' "$BACKUP" "$SITE_FILE" "$SITE_LINK"
