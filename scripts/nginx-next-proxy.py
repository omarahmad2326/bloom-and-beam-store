#!/usr/bin/env python3
"""Rewrite the nginx server blocks that serve this app so they proxy to the Next.js server.

    python3 scripts/nginx-next-proxy.py APP_DIR SNIPPET FILE...

For every `server { }` block whose root/alias points into APP_DIR (other sites are left alone):
  - root            -> APP_DIR/public (nginx serves files from public/ directly)
  - every `location` block is replaced by the managed ones below (keeps /.well-known for certbot),
    because old rules such as `location ~* \\.(js|css)$` would answer /_next/ assets from disk
  - removes the canonical sub_filter lines (the canonical tag is now in the server-rendered HTML)
  - keeps everything else: listen, server_name, ssl_*, the `if ($mrbedmed_redirect)` 301 rule, ...
Prints the files it changed. Safe to re-run.
"""
import re
import sys

MANAGED_BEGIN = '    # BEGIN mrbedmed_next (managed by scripts/setup-next-server.sh)'
MANAGED_END = '    # END mrbedmed_next'


def managed_block(snippet):
    return '\n'.join([
        MANAGED_BEGIN,
        '    # Built JS/CSS of the Next.js app.',
        '    location ^~ /_next/ {',
        f'        include {snippet};',
        '    }',
        '    # Files in public/ are served by nginx; every page is rendered by Next.js.',
        '    location / {',
        '        try_files $uri @mrbedmed_next;',
        '    }',
        '    location @mrbedmed_next {',
        f'        include {snippet};',
        '    }',
        MANAGED_END,
    ])


def scan(text, start, depth0=0):
    """Yield (pos, char, depth) for structural characters ({ } ;) outside comments and quotes."""
    depth = depth0
    i = start
    n = len(text)
    while i < n:
        c = text[i]
        if c == '#':
            j = text.find('\n', i)
            i = n if j < 0 else j
            continue
        if c in '"\'':
            j = i + 1
            while j < n and text[j] != c:
                j += 2 if text[j] == '\\' else 1
            i = j + 1
            continue
        if c == '{':
            depth += 1
            yield i, c, depth
        elif c == '}':
            depth -= 1
            yield i, c, depth
        elif c == ';':
            yield i, c, depth
        i += 1


def strip_comments(s):
    return re.sub(r'#[^\n]*', '', s)


def server_blocks(text):
    """(start, open_brace, close_brace) of top-level `server {` blocks."""
    blocks = []
    stmt_start = 0
    open_pos = None
    for pos, c, depth in scan(text, 0):
        if c == '{' and depth == 1:
            if strip_comments(text[stmt_start:pos]).split() == ['server']:
                open_pos = pos
            else:
                open_pos = None
        elif c == '}' and depth == 0:
            if open_pos is not None:
                blocks.append((stmt_start, open_pos, pos))
            open_pos = None
            stmt_start = pos + 1
        elif c == ';' and depth == 0:
            stmt_start = pos + 1
    return blocks


def location_line_start(text, start, limit):
    """Start of the line holding the `location` keyword, so comments before it (and a trailing
    `# managed by Certbot` on the previous statement's line) are kept."""
    m = re.compile(r'(?m)^[^#\n]*?\blocation\b').search(text, start, limit)
    if not m:
        return start
    kw = text.find('location', m.start(), limit)
    line_start = text.rfind('\n', start, kw) + 1
    return line_start if line_start > start else start


def rewrite_server(body, app_dir, snippet):
    """body = text between the server block's braces."""
    # Remove the old managed section (re-run).
    body = re.sub(r'\n?[ \t]*# BEGIN mrbedmed_next.*?# END mrbedmed_next[^\n]*', '', body, flags=re.S)

    # Direct child statements; drop `location` blocks (except /.well-known).
    out = []
    keep_from = 0
    stmt_start = 0
    block_start = None
    for pos, c, depth in scan(body, 0, depth0=0):
        if c == '{' and depth == 1:
            block_start = stmt_start
        elif c == '}' and depth == 0:
            head = strip_comments(body[block_start:pos]).split()
            if head and head[0] == 'location' and not (len(head) > 1 and '/.well-known' in ' '.join(head[1:3])):
                out.append(body[keep_from:location_line_start(body, block_start, pos)])
                end = pos + 1
                # Also swallow the rest of that line if it is blank.
                nl = body.find('\n', end)
                if nl >= 0 and body[end:nl].strip() == '':
                    end = nl
                keep_from = end
            stmt_start = pos + 1
        elif c == ';' and depth == 0:
            stmt_start = pos + 1
    out.append(body[keep_from:])
    body = ''.join(out)

    lines = body.split('\n')
    kept = []
    for line in lines:
        code = strip_comments(line).strip()
        # Canonical tag via sub_filter is obsolete: Next.js renders it into the HTML.
        if 'mrbedmed_canonical_tag' in code or code == 'sub_filter_once on;':
            continue
        m = re.match(r'^(\s*)(root|alias)\s+(\S+?);(.*)$', line)
        if m and m.group(2) == 'root' and m.group(3).rstrip('/').startswith(app_dir):
            line = f'{m.group(1)}root {app_dir}/public;{m.group(4)}'
        kept.append(line)
    # Drop runs of blank lines left behind.
    body = re.sub(r'\n[ \t]*\n([ \t]*\n)+', '\n\n', '\n'.join(kept))
    return body.rstrip() + '\n\n' + managed_block(snippet) + '\n'


def serves_app(block_text, app_dir):
    pattern = re.compile(r'^\s*(root|alias)\s+' + re.escape(app_dir) + r'(/|;|\s)', re.M)
    return bool(pattern.search(strip_comments(block_text)))


def rewrite(text, app_dir, snippet):
    result = []
    last = 0
    for start, open_pos, close_pos in server_blocks(text):
        block = text[open_pos + 1:close_pos]
        if not serves_app(block, app_dir):
            continue
        result.append(text[last:open_pos + 1])
        result.append(rewrite_server(block, app_dir, snippet))
        last = close_pos
    result.append(text[last:])
    return ''.join(result)


def main():
    if len(sys.argv) < 4:
        sys.exit(__doc__)
    app_dir = sys.argv[1].rstrip('/')
    snippet = sys.argv[2]
    for path in sys.argv[3:]:
        with open(path, encoding='utf-8') as f:
            text = f.read()
        new = rewrite(text, app_dir, snippet)
        if new != text:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new)
            print(path)


if __name__ == '__main__':
    main()
