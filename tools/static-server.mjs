#!/usr/bin/env node
// =============================================================================
// A static file server with no dependencies
// -----------------------------------------------------------------------------
// Three development tools already needed one of these and each had written its
// own: the thumbnail generator, the frame-time probe and the scenario stability
// probe. Adding a fourth for the end-to-end suite was the point at which one
// shared copy became obviously right.
//
// Why not http-server
// -----------------------------------------------------------------------------
// `npm run dev` and `npm run serve` reach for `npx http-server`, which is fine
// on a developer's machine and wrong in CI: npx fetches the package from the
// network on first use, so a test run that should be hermetic acquires a
// dependency on the registry being up, and a cold cache adds seconds to every
// job. This has no dependencies at all.
//
// Deliberately minimal. It serves files, resolves directories to index.html,
// refuses to escape its own root, and sets Cache-Control: no-store so a test
// never reads a stale asset. It is not a production server and nothing ships it.
//
//   node tools/static-server.mjs                     serve the repo root on 8080
//   node tools/static-server.mjs --root dist --port 4173
//
// Or programmatically, which is how the probes use it:
//
//   import { serveStatic } from './static-server.mjs';
//   const server = await serveStatic({ root: ROOT, port: 8123 });
//   ...
//   server.close();
// =============================================================================

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Content types for everything Gravitas actually serves. */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.ipynb': 'application/json; charset=utf-8',
};

/**
 * Start a static server.
 *
 * @param {object} options
 * @param {string} options.root - Directory to serve
 * @param {number} [options.port] - Port; 0 asks the OS for a free one
 * @param {boolean} [options.quiet] - Suppress the request log
 * @returns {Promise<import('node:http').Server & {port: number, url: string}>}
 *   The listening server, with the port it actually got
 */
export function serveStatic({ root, port = 0, quiet = true }) {
  const base = resolve(root);

  const server = createServer(async (req, res) => {
    let status = 200;
    try {
      const url = new URL(req.url, 'http://localhost');
      let pathname = decodeURIComponent(url.pathname);
      if (pathname.endsWith('/')) pathname += 'index.html';

      let file = resolve(join(base, pathname));
      // Path traversal: a request for /../../etc/passwd resolves outside the
      // root, and a server that answered it would be a real hole even in a
      // development tool. The trailing separator matters - without it,
      // "/srv/gravitas-secrets" would count as inside "/srv/gravitas".
      if (file !== base && !file.startsWith(base + sep)) {
        status = 403;
        res.writeHead(403).end('forbidden');
        return;
      }

      // A directory without the trailing slash: /model rather than /model/.
      try {
        if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      } catch {
        /* fall through to the read, which reports the miss */
      }

      const body = await readFile(file);
      res.writeHead(200, {
        'Content-Type':
          MIME[extname(file).toLowerCase()] || 'application/octet-stream',
        'Content-Length': body.length,
        // Never cache. A probe that read yesterday's bundle would report on
        // code nobody is running.
        'Cache-Control': 'no-store, must-revalidate',
      });
      res.end(body);
    } catch {
      status = 404;
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('not found');
    } finally {
      if (!quiet) console.log(`${status} ${req.method} ${req.url}`);
    }
  });

  return new Promise((ok, fail) => {
    server.once('error', fail);
    server.listen(port, '127.0.0.1', () => {
      const actual = server.address().port;
      server.port = actual;
      server.url = `http://127.0.0.1:${actual}`;
      ok(server);
    });
  });
}

// --- CLI ----------------------------------------------------------------------

const invokedDirectly =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  const argv = process.argv.slice(2);
  const valueOf = (flag, fallback) => {
    const i = argv.indexOf(flag);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
  };
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const root = resolve(repoRoot, valueOf('--root', '.'));
  const port = Number(valueOf('--port', '8080'));

  const server = await serveStatic({
    root,
    port,
    quiet: !argv.includes('--verbose'),
  });
  console.log(`Serving ${root}\n  ${server.url}`);

  // Playwright's webServer sends SIGTERM when the run finishes; without a
  // handler node ignores it in some shells and the job hangs waiting for a port
  // to close.
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      server.close(() => process.exit(0));
    });
  }
}
