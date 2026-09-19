// MEASUREMENT HARNESS ONLY. A static server that compresses the way GitHub
// Pages does, so the benchmark is not measuring the absence of gzip.
//
// Pages gzips text (HTML, CSS, JS, JSON, SVG) and leaves already-compressed
// media alone. Serving the candidates uncompressed would penalise the one made
// of verbose unminified source by about 3.5x on the wire, which is most of the
// difference the benchmark is trying to measure.
import { createServer } from 'node:http';
import { createReadStream, statSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { readFileSync as rf } from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2]);
const port = Number(process.argv[3]);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.pdf': 'application/pdf', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml', '.md': 'text/markdown; charset=utf-8',
  '.webmanifest': 'application/manifest+json', '.map': 'application/json',
};
const COMPRESS = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.xml', '.txt', '.md', '.webmanifest', '.map']);
const cache = new Map();

createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
  if (rel.endsWith('/')) rel += 'index.html';
  let file = path.join(root, rel);
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  if (!existsSync(file) || !statSync(file).isFile()) {
    if (existsSync(file + '/index.html')) file = file + '/index.html';
    else { res.writeHead(404, { 'content-type': 'text/plain' }).end('not found'); return; }
  }
  const ext = path.extname(file).toLowerCase();
  const type = TYPES[ext] || 'application/octet-stream';
  const wantsGzip = /\bgzip\b/.test(req.headers['accept-encoding'] || '');
  if (COMPRESS.has(ext) && wantsGzip) {
    let buf = cache.get(file);
    if (!buf) { buf = gzipSync(rf(file), { level: 6 }); cache.set(file, buf); }
    res.writeHead(200, {
      'content-type': type, 'content-encoding': 'gzip',
      'content-length': buf.length, 'cache-control': 'max-age=600',
    });
    res.end(buf);
    return;
  }
  const size = statSync(file).size;
  res.writeHead(200, { 'content-type': type, 'content-length': size, 'cache-control': 'max-age=600' });
  createReadStream(file).pipe(res);
}).listen(port, () => console.log(`serving ${root} on ${port} with gzip`));
