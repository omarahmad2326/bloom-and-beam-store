#!/usr/bin/env bash
# One-time newsletter email setup on the droplet (run from /var/www/bedmed).
#
#   bash scripts/setup-newsletter.sh
#
# Asks for the Resend API key (input hidden), shows the domains verified in Resend, asks for the
# sender address, saves RESEND_API_KEY / NEWSLETTER_FROM / NEWSLETTER_REPLY_TO in .env (readable by
# root only) and restarts the site. Optionally sends a test email. Safe to re-run (replaces the values).
set -euo pipefail

cd "$(dirname "$0")/.."
ENV_FILE=.env

log() { printf '\n\033[1;34m== %s\033[0m\n' "$*"; }
ok()  { printf '\033[1;32m   ok: %s\033[0m\n' "$*"; }
warn(){ printf '\033[1;33m   note: %s\033[0m\n' "$*"; }
die() { printf '\n\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

[ -f "$ENV_FILE" ] || die "$PWD/$ENV_FILE missing"
command -v pm2 >/dev/null || die "pm2 not found"

log "1/4 Resend API key"
read -rsp "   Paste the Resend API key (starts with re_): " KEY; echo
KEY="$(printf '%s' "$KEY" | tr -d '[:space:]')"
case "$KEY" in re_*) ;; *) die "that does not look like a Resend API key (re_...)";; esac

log "2/4 Verified sending domains"
DOMAINS_JSON="$(curl -s --max-time 20 https://api.resend.com/domains -H "Authorization: Bearer $KEY" || true)"
VERIFIED="$(printf '%s' "$DOMAINS_JSON" | node -e '
  let d = ""; process.stdin.on("data", c => d += c).on("end", () => {
    try {
      const j = JSON.parse(d);
      if (!Array.isArray(j.data)) { console.log("ERR " + (j.message || j.name || "unknown response")); return; }
      for (const x of j.data) console.log(`${x.status === "verified" ? "OK " : "-- "}${x.name} (${x.status})`);
    } catch { console.log("ERR could not read the response"); }
  });')"
if printf '%s' "$VERIFIED" | grep -q '^ERR'; then
  warn "could not list domains with this key ($(printf '%s' "$VERIFIED" | sed 's/^ERR //')). A \"sending only\" key cannot list domains; that is fine."
  DEFAULT_DOMAIN="mrbedmed.com"
else
  printf '%s\n' "$VERIFIED" | sed 's/^/   /'
  DEFAULT_DOMAIN="$(printf '%s\n' "$VERIFIED" | awk '/^OK /{print $2; exit}')"
  [ -n "$DEFAULT_DOMAIN" ] || die "no verified domain in Resend yet. Finish DNS verification in Resend → Domains, then re-run."
fi

log "3/4 Sender"
read -rp "   Sender address [newsletter@$DEFAULT_DOMAIN]: " FROM_ADDR
FROM_ADDR="${FROM_ADDR:-newsletter@$DEFAULT_DOMAIN}"
printf '%s' "$FROM_ADDR" | grep -qE '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' || die "not an email address: $FROM_ADDR"
if [ -n "$DEFAULT_DOMAIN" ] && ! printf '%s' "$VERIFIED" | grep -q "^OK ${FROM_ADDR#*@} "; then
  printf '%s' "$VERIFIED" | grep -q '^ERR' || warn "${FROM_ADDR#*@} is not a verified domain in Resend; sending will fail until it is."
fi
read -rp "   Sender name [Mr.Bedmed]: " FROM_NAME
FROM_NAME="${FROM_NAME:-Mr.Bedmed}"
while :; do
  read -rp "   Replies go to (an email address; empty = email from Dashboard → Contact Info): " REPLY_TO
  REPLY_TO="$(printf '%s' "$REPLY_TO" | tr -d "[:space:]\"'")"
  [ -z "$REPLY_TO" ] && break
  printf '%s' "$REPLY_TO" | grep -qE '^[^@<>,;]+@[^@<>,;]+\.[^@<>,;]+$' && break
  printf '\033[1;33m   "%s" is not an email address; type just the address (e.g. contact@mrbedmed.com) or press Enter.\033[0m\n' "$REPLY_TO"
done

set_env() { # name, value
  local name="$1" value="$2" tmp
  tmp="$(mktemp)"
  grep -vE "^${name}=" "$ENV_FILE" > "$tmp" || true
  [ -n "$value" ] && printf '%s=%s\n' "$name" "$value" >> "$tmp"
  cat "$tmp" > "$ENV_FILE" && rm -f "$tmp"
}
# Keep a trailing newline before appending.
[ -z "$(tail -c1 "$ENV_FILE")" ] || echo >> "$ENV_FILE"
set_env RESEND_API_KEY "$KEY"
set_env NEWSLETTER_FROM "\"$FROM_NAME <$FROM_ADDR>\""
set_env NEWSLETTER_REPLY_TO "$REPLY_TO"
chmod 600 "$ENV_FILE"
ok "saved in $PWD/$ENV_FILE (only root can read it)"

log "4/4 Restart the site so it picks up the settings"
MRBEDMED_PORT="${MRBEDMED_PORT:-3100}" pm2 reload ecosystem.config.cjs --update-env >/dev/null
sleep 3
curl -s -o /dev/null -w '   site answers: %{http_code}\n' "http://127.0.0.1:${MRBEDMED_PORT:-3100}/"

read -rp "   Send a test email now? Enter an address (or leave empty to skip): " TEST_TO
if [ -n "$TEST_TO" ]; then
  RESULT="$(curl -s --max-time 20 https://api.resend.com/emails -H "Authorization: Bearer $KEY" -H 'Content-Type: application/json' \
    -d "$(node -e 'console.log(JSON.stringify({from: process.argv[1], to: [process.argv[2]], subject: "Mr.Bedmed newsletter: test", text: "Email sending from mrbedmed.com works."}))' "$FROM_NAME <$FROM_ADDR>" "$TEST_TO")")"
  if printf '%s' "$RESULT" | grep -q '"id"'; then ok "test email sent to $TEST_TO"; else warn "Resend said: $RESULT"; fi
fi

printf '\n\033[1;32mDone.\033[0m Write and send newsletters in Dashboard → Newsletter.\n'
