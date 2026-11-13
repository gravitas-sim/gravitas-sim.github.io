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
//   node tools/static-server.mjs --gzip --cache-headers    as the host serves
//
// Two optional modes exist for measuring what a student's browser downloads
// (tools/route-harness.mjs). They are off by default, so the end-to-end suite
// keeps its uncompressed, never-cached server:
//
//   gzip           text responses go out gzip-compressed (level 6, compressed
//                  once and held in memory so the compression work is not in
//                  the measurement) with Content-Encoding and Vary, when the
//                  request's Accept-Encoding allows it. This reproduces the
//                  byte count and the request sizes of a compressing host. It
//                  does not reproduce the host's HTTP/2 multiplexing, its
//                  latency, its choice of Brotli where a browser offers it, or
//                  a radio; the network shape is the harness's own throttle.
//   cacheHeaders   Cache-Control: public, max-age=600 and a strong ETag with
//                  If-None-Match answered 304, which is what GitHub Pages sends
//                  for static files. It reproduces how the browser's HTTP cache
//                  treats a second visit; it does not reproduce the host's
//                  edge cache or the real age of a response.
//
// Or programmatically, which is how the probes use it:
//
//   import { serveStatic } from './static-server.mjs';
//   const server = await serveStatic({ root: ROOT, port: 8123 });
//   ...
//   server.close();
// =============================================================================

import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
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

/** Types worth compressing; images, fonts and PDFs are already compressed. */
const COMPRESSIBLE = new Set([
  '.html',
  '.js',
  '.mjs',
  '.css',
  '.json',
  '.map',
  '.svg',
  '.txt',
  '.xml',
  '.csv',
  '.ipynb',
]);

/** Below this a gzip header costs more than it saves. */
const GZIP_MIN_BYTES = 150;

/**
 * Start a static server.
 *
 * @param {object} options
 * @param {string} options.root - Directory to serve
 * @param {number} [options.port] - Port; 0 asks the OS for a free one
 * @param {boolean} [options.quiet] - Suppress the request log
 * @param {boolean} [options.gzip] - Compress text responses (see the header)
 * @param {boolean} [options.cacheHeaders] - Send the host's cache headers
 * @returns {Promise<import('node:http').Server & {port: number, url: string, stats: {requests: number, bodyBytes: number}}>}
 *   The listening server, with the port it actually got and a running count of
 *   the requests it answered and the body bytes it sent (the harness resets
 *   it between page loads)
 */
export function serveStatic({
  root,
  port = 0,
  quiet = true,
  gzip = false,
  cacheHeaders = false,
}) {
  const base = resolve(root);
  const stats = { requests: 0, bodyBytes: 0 };
  /** file path -> {size, mtimeMs, plain, gz, etag}; the compression is paid once. */
  const held = new Map();

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

      const ext = extname(file).toLowerCase();
      const headers = {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        // Never cache, unless asked to behave like the host. A probe that read
        // yesterday's bundle would report on code nobody is running.
        'Cache-Control': cacheHeaders
          ? 'public, max-age=600'
          : 'no-store, must-revalidate',
      };
      let body;
      if (!gzip && !cacheHeaders) {
        body = await readFile(file);
      } else {
        const info = await stat(file);
        let entry = held.get(file);
        if (!entry || entry.mtimeMs !== info.mtimeMs) {
          const plain = await readFile(file);
          const compress =
            COMPRESSIBLE.has(ext) && plain.length >= GZIP_MIN_BYTES;
          entry = {
            mtimeMs: info.mtimeMs,
            plain,
            gz: gzip && compress ? gzipSync(plain, { level: 6 }) : null,
            etag: `"${createHash('sha1').update(plain).digest('hex').slice(0, 16)}"`,
          };
          held.set(file, entry);
        }
        if (cacheHeaders) {
          headers.ETag = entry.etag;
          if (req.headers['if-none-match'] === entry.etag) {
            status = 304;
            stats.requests += 1;
            res.writeHead(304, headers).end();
            return;
          }
        }
        const wantsGzip =
          entry.gz && /\bgzip\b/.test(req.headers['accept-encoding'] || '');
        if (entry.gz) headers.Vary = 'Accept-Encoding';
        if (wantsGzip) headers['Content-Encoding'] = 'gzip';
        body = wantsGzip ? entry.gz : entry.plain;
      }
      headers['Content-Length'] = body.length;
      stats.requests += 1;
      stats.bodyBytes += body.length;
      res.writeHead(200, headers);
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
      server.stats = stats;
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
    gzip: argv.includes('--gzip'),
    cacheHeaders: argv.includes('--cache-headers'),
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
