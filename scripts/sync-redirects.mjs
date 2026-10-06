#!/usr/bin/env node
/**
 * Sync the Supabase `redirects` table (and category URL casing) into an nginx map,
 * so nginx on the droplet answers old URLs with a real HTTP 301.
 *
 * Runs every minute from cron (installed by scripts/setup-nginx-redirects.sh).
 * Writes the map only when it changed, validates with `nginx -t`, then reloads.
 * On any error the previous map stays in place (fail safe).
 *
 * Env (optional):
 *   REDIRECTS_MAP_FILE  default /etc/nginx/mrbedmed-redirects.map
 *   NO_RELOAD=1         write the file but do not test/reload nginx
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { buildMap, idAliases } from './redirect-map.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAP_FILE = process.env.REDIRECTS_MAP_FILE || '/etc/nginx/mrbedmed-redirects.map';

function readEnv() {
  const env = {};
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = { ...readEnv(), ...process.env };
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!SUPABASE_URL || !KEY) {
  console.error(`${new Date().toISOString()} missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY in ${ROOT}/.env`);
  process.exit(1);
}

async function rest(pathAndQuery) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, { headers: { apikey: KEY } });
  if (!res.ok) throw new Error(`${pathAndQuery}: HTTP ${res.status} ${await res.text()}`);
  return res.json();
}

try {
  const [redirects, categories, products, parts, posts] = await Promise.all([
    rest('redirects?select=from_path,to_path&order=from_path'),
    rest('categories?select=slug'),
    rest('products?select=id,slug'),
    rest('parts?select=id,slug'),
    rest('blog_posts?select=id,slug&published=eq.true'),
  ]);
  const aliases = idAliases([
    ...products.map((r) => ({ ...r, prefix: '/products/' })),
    ...parts.map((r) => ({ ...r, prefix: '/part/' })),
    ...posts.map((r) => ({ ...r, prefix: '/blog/' })),
  ]);
  const next = buildMap([...redirects, ...aliases], categories, (m) => console.warn(m));
  const current = fs.existsSync(MAP_FILE) ? fs.readFileSync(MAP_FILE, 'utf8') : null;
  if (current === next) process.exit(0);

  const tmp = `${MAP_FILE}.tmp`;
  fs.writeFileSync(tmp, next);
  fs.renameSync(tmp, MAP_FILE);

  if (process.env.NO_RELOAD !== '1') {
    try {
      execFileSync('nginx', ['-t'], { stdio: 'pipe' });
    } catch (err) {
      if (current !== null) fs.writeFileSync(MAP_FILE, current);
      throw new Error(`nginx -t failed, previous map restored: ${err.stderr?.toString() || err.message}`);
    }
    execFileSync('nginx', ['-s', 'reload'], { stdio: 'pipe' });
  }
  console.log(`${new Date().toISOString()} map updated: ${redirects.length} redirects, ${aliases.length} ID→slug aliases, ${categories.length} categories`);
} catch (err) {
  console.error(`${new Date().toISOString()} sync failed: ${err.message}`);
  process.exit(1);
}
