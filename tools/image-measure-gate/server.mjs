/* global URL */
// A static server for the gate's browser measurements: the repository tree, served
// as the published sources are (spike code). Port 4417 is the one this work may use.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { HARNESS_HTML } from './harnessPage.mjs';
import { fileURLToPath } from 'node:url';

export const REPO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
);
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
};

export function serve(port = 4417) {
  const server = createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    if (p === '/tools/image-measure-gate/harness.html')
      return res
        .writeHead(200, {
          'content-type': 'text/html',
          'cache-control': 'no-store',
        })
        .end(HARNESS_HTML);
    const file = path.join(REPO, p);
    if (!file.startsWith(REPO)) return res.writeHead(403).end();
    try {
      if ((await stat(file)).isDirectory())
        return res.writeHead(301, { location: `${p}/` }).end();
      res.writeHead(200, {
        'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream',
        'cache-control': 'no-store',
      });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () =>
      resolve({ server, origin: `http://127.0.0.1:${port}` })
    );
  });
}
