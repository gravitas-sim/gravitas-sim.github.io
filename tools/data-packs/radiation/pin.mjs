// node tools/data-packs/radiation/pin.mjs: fetch every raw product of the radiation
// packs into .packs-cache/ (when missing) and write pins.json beside this file.
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { LINE_SPECS, OTHER_RAW, nistFile, nistQuery } from './specs.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CACHE =
  process.env.GRAVITAS_PACKS_CACHE ||
  path.join(HERE, '..', '..', '..', '.packs-cache');
mkdirSync(CACHE, { recursive: true });
const all = [...OTHER_RAW, ...LINE_SPECS.map(s => [nistFile(s), nistQuery(s)])];
const pins = {};
for (const [file, url] of all) {
  const at = path.join(CACHE, file);
  let b;
  if (existsSync(at)) b = readFileSync(at);
  else {
    const r = await globalThis.fetch(url, { redirect: 'follow' });
    if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
    b = Buffer.from(await r.arrayBuffer());
    writeFileSync(at, b);
  }
  pins[file] = {
    file,
    url,
    bytes: b.length,
    sha256: createHash('sha256').update(b).digest('hex'),
  };
}
writeFileSync(
  path.join(HERE, 'pins.json'),
  `${JSON.stringify(pins, null, 2)}\n`
);
globalThis.console.log(`${Object.keys(pins).length} raw products pinned`);
