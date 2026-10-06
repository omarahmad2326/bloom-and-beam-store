#!/usr/bin/env bash
# One-time setup on the droplet: put <link rel="canonical" href="https://mrbedmed.com/{path}" />
# into the HTML source of every page (not added later by JavaScript).
#
#   sudo bash scripts/setup-nginx-canonical.sh
#
# How: index.html contains the placeholder <!--mrbedmed:canonical-->. nginx's sub_filter replaces it
# on every page response with the canonical tag for the requested path:
#   - always https://mrbedmed.com (non-www), no query string, no trailing slash
#   - only for normal URL characters (anything else → no tag, never broken HTML)
#   - ID URLs (/products/{id}, /part/{id}, /blog/{id}) 301 to their slug URL first
#     (scripts/sync-redirects.mjs), so the canonical is always the slug version
# Backs up every touched file; restores everything if `nginx -t` fails. Safe to re-run.
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONF=/etc/nginx/conf.d/mrbedmed-canonical.conf
MARKER='mrbedmed_canonical_tag'
PLACEHOLDER='<!--mrbedmed:canonical-->'
BACKUP="/root/nginx-backup-canonical-$(date +%Y%m%d-%H%M%S)"

log() { printf '\n\033[1;34m== %s\033[0m\n' "$*"; }
ok()  { printf '\033[1;32m   ok: %s\033[0m\n' "$*"; }
die() { printf '\n\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" = 0 ] || die "run as root (sudo)"
command -v nginx >/dev/null || die "nginx not found"
nginx -V 2>&1 | grep -q 'http_sub_module' || die "this nginx build has no sub_filter module (http_sub_module)"
ok "nginx has sub_filter"

log "1/5 Check the deployed build has the placeholder"
grep -q "$PLACEHOLDER" "$APP_DIR/dist/index.html" \
  || die "dist/index.html has no $PLACEHOLDER. Deploy the latest code first (git pull + npm run build)."
ok "$APP_DIR/dist/index.html"

log "2/5 Locate the nginx site configs serving $APP_DIR"
mapfile -t SITES < <(grep -lRs -- "$APP_DIR" /etc/nginx/sites-enabled 2>/dev/null | xargs -r -n1 readlink -f | sort -u)
[ "${#SITES[@]}" -gt 0 ] || die "no nginx config references $APP_DIR"
for f in "${SITES[@]}"; do ok "$f"; done

mkdir -p "$BACKUP"
for f in "${SITES[@]}" "$CONF"; do [ -f "$f" ] && cp -a --parents "$f" "$BACKUP"; done
ok "backup in $BACKUP"

restore() {
  printf '\033[1;31m   restoring nginx config from %s\033[0m\n' "$BACKUP" >&2
  for f in "${SITES[@]}"; do [ -f "$BACKUP$f" ] && cp -a "$BACKUP$f" "$f"; done
  if [ -f "$BACKUP$CONF" ]; then cp -a "$BACKUP$CONF" "$CONF"; else rm -f "$CONF"; fi
  nginx -t >/dev/null 2>&1 && nginx -s reload || true
}

log "3/5 Install the canonical map (http level)"
cat > "$CONF" <<'EOF'
# Managed by scripts/setup-nginx-canonical.sh
# Canonical tag for the requested path: https, non-www, no query string, no trailing slash.
# Only plain URL characters are accepted, so a crafted URL can never inject HTML.
map $request_uri $mrbedmed_canonical_tag {
    default "";
    "~^(?<mrbedmed_cpath>/[A-Za-z0-9._~%/-]*?)/*(?:\?.*)?$" '<link rel="canonical" href="https://mrbedmed.com$mrbedmed_cpath" />';
}
EOF
ok "$CONF"

log "4/5 Add sub_filter to the server blocks that serve the app"
RULE1="    sub_filter '$PLACEHOLDER' \$mrbedmed_canonical_tag;"
RULE2='    sub_filter_once on;'
for f in "${SITES[@]}"; do
  if grep -q "$MARKER" "$f"; then ok "already present in $f"; continue; fi
  awk -v app="$APP_DIR" -v r1="$RULE1" -v r2="$RULE2" '
    function flush(   i, done) {
      done = 0
      for (i = 1; i <= n; i++) {
        print buf[i]
        if (!done && has_app && buf[i] ~ /^[ \t]*server_name[ \t]/) { print r1; print r2; done = 1 }
      }
      n = 0; has_app = 0; inblock = 0
    }
    {
      line = $0
      if (!inblock && line ~ /^[ \t]*server[ \t]*\{/) { inblock = 1; depth = 0; n = 0; has_app = 0 }
      if (inblock) {
        buf[++n] = line
        if (index(line, app)) has_app = 1
        tmp = line; sub(/#.*/, "", tmp)
        depth += gsub(/\{/, "{", tmp) - gsub(/\}/, "}", tmp)
        if (depth == 0) flush()
        next
      }
      print line
    }
    END { if (n) flush() }
  ' "$f" > "$f.mrbedmed.tmp"
  if cmp -s "$f" "$f.mrbedmed.tmp"; then rm -f "$f.mrbedmed.tmp"; restore; die "could not find a server block with server_name in $f"; fi
  cat "$f.mrbedmed.tmp" > "$f" && rm -f "$f.mrbedmed.tmp"
  ok "sub_filter added to $f"
done

if ! nginx -t; then restore; die "nginx -t failed; original config restored"; fi
nginx -s reload
ok "nginx reloaded"

log "5/5 Verify View Page Source through Cloudflare"
# Refresh the redirect map so ID URLs 301 to slug URLs (if the redirect sync is installed).
[ -f /etc/nginx/conf.d/mrbedmed-redirects.conf ] && node "$APP_DIR/scripts/sync-redirects.mjs" || true
sleep 2
canon() { curl -s --max-time 15 "$1" | grep -o '<link rel="canonical"[^>]*>' | head -1; }
for path in "/" "/products" "/services/equipment-rental" "/about-us" "/products?utm_source=test" "/contact-us/"; do
  printf '   %-30s %s\n' "$path" "$(canon "https://mrbedmed.com$path" || true)"
done
POST="$(curl -s --max-time 15 "${VITE_SUPABASE_URL:-$(grep -E '^VITE_SUPABASE_URL=' "$APP_DIR/.env" | cut -d= -f2-)}/rest/v1/blog_posts?select=slug&published=eq.true&limit=1" \
  -H "apikey: $(grep -E '^VITE_SUPABASE_PUBLISHABLE_KEY=' "$APP_DIR/.env" | cut -d= -f2- | tr -d '"')" | grep -o '"slug":"[^"]*"' | head -1 | cut -d'"' -f4 || true)"
[ -n "$POST" ] && printf '   %-30s %s\n' "/blog/$POST" "$(canon "https://mrbedmed.com/blog/$POST" || true)"

printf '\n\033[1;32mDone.\033[0m Undo: restore files from %s, rm %s, nginx -s reload\n' "$BACKUP" "$CONF"
