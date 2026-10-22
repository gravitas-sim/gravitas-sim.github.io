/* global console, process */
// =============================================================================
// T1.route: what wiring the instrument into /observatory/ costs the route
// (Prompt 178 prototype measurement; spike code)
// -----------------------------------------------------------------------------
// The route tool (tools/route-budget.mjs) measures a whole tree, so this builds
// two scratch copies of the committed tree: the base, and the same with the
// instrument installed where production would put it (js/observatory/
// imageMarksPanel.js, imageMarks.js, imageRecord.js) and the one lazy call site
// js/observatoryPage.js would need when an image observation opens. In each the
// route tool is cut down to /observatory/, `node build.js` is run, and the route
// is measured in both configurations (the published sources and the build).
// The difference is the draw on the route. The scratch copies live in the
// session scratchpad; nothing is written into the repository.
// =============================================================================

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

import { REPO } from './server.mjs';

const GATE = path.join(REPO, 'tools', 'image-measure-gate');
const sh = (cmd, args, cwd, opts = {}) =>
  execFileSync(cmd, args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
    ...opts,
  });

function extract(dir) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const tar = path.join(dir, '..', `${path.basename(dir)}.tar`);
  sh('git', ['archive', '--format=tar', '-o', tar, 'HEAD'], REPO);
  sh('tar', ['-xf', tar, '-C', dir], REPO);
  rmSync(tar);
  symlinkSync(path.join(REPO, 'node_modules'), path.join(dir, 'node_modules'));
}

/** The instrument installed under js/observatory/ with its imports rewritten. */
function install(dir) {
  const obs = path.join(dir, 'js', 'observatory');
  const read = f => readFileSync(path.join(GATE, f), 'utf8');
  writeFileSync(path.join(obs, 'imageMarks.js'), read('marks.js'));
  writeFileSync(
    path.join(obs, 'imageRecord.js'),
    read('record.js')
      .replaceAll("'../../js/", "'../")
      .replace("'./marks.js'", "'./imageMarks.js'")
  );
  writeFileSync(
    path.join(obs, 'imageMarksPanel.js'),
    read('panel.js')
      .replaceAll("'../../js/", "'../")
      .replace("'./marks.js'", "'./imageMarks.js'")
      .replace("'./record.js'", "'./imageRecord.js'")
  );
  const page = path.join(dir, 'js', 'observatoryPage.js');
  let src = readFileSync(page, 'utf8');
  const a1 =
    "const image = createImageView($('obsImage'), { announce, describe });";
  const a2 =
    '    const { legend } = image.draw(o, { selection: state.selection });\n    renderLegend(legend);';
  if (!src.includes(a1) || !src.includes(a2))
    throw new Error(
      'the Observatory page changed: the wiring anchors are gone'
    );
  src = src.replace(
    a1,
    `${a1}\nlet imageMarks;\nconst loadImageMarks = () => (imageMarks ??= import('./observatory/imageMarksPanel.js'));`
  );
  src = src.replace(
    a2,
    `${a2}\n    loadImageMarks().then(m => m.mount($('obsImageBox'), { frames: [o], setId: o.id, announce }));`
  );
  writeFileSync(page, src);
}

function cutRoutes(dir) {
  const f = path.join(dir, 'tools', 'route-budget.mjs');
  let s = readFileSync(f, 'utf8');
  const i = s.indexOf('const CONFIGS = {');
  s = `${s.slice(0, i)}ROUTES.splice(0, ROUTES.length, ...ROUTES.filter(r => r.id === 'observatory'));\n\n${s.slice(i)}`;
  writeFileSync(f, s);
}

function measureTree(dir) {
  sh(process.execPath, ['build.js'], dir, {
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  const out = sh(process.execPath, ['tools/route-budget.mjs', '--report'], dir);
  const rows = {};
  for (const m of out.matchAll(
    /^(sources|build)\s+observatory\s+([\d.]+) KB\s+(\d+) request/gm
  ))
    rows[m[1]] = { kb: Number(m[2]), requests: Number(m[3]) };
  // The new lazy files in the build, gzipped, as a cross-check of the deferred figure.
  const js = path.join(dir, 'dist', 'js');
  const files = new Map(
    readdirSync(js)
      .filter(f => f.endsWith('.js'))
      .map(f => [f, gzipSync(readFileSync(path.join(js, f))).length])
  );
  let deferred = 0;
  for (const g of files.values()) deferred += g;
  return { rows, distJsGzipBytes: deferred, files };
}

export async function measureRoute(scratch) {
  const base = path.join(scratch, 'base');
  const wired = path.join(scratch, 'wired');
  extract(base);
  extract(wired);
  install(wired);
  cutRoutes(base);
  cutRoutes(wired);
  const b = measureTree(base);
  const w = measureTree(wired);
  const lazy = [...w.files]
    .filter(([f]) => !b.files.has(f) || b.files.get(f) !== w.files.get(f))
    .map(([f, g]) => ({ file: f, gzipBytes: g, base: b.files.get(f) ?? null }));
  return {
    base: b.rows,
    wired: w.rows,
    delta: Object.fromEntries(
      ['sources', 'build'].map(c => [
        c,
        {
          kb: Number((w.rows[c].kb - b.rows[c].kb).toFixed(1)),
          requests: w.rows[c].requests - b.rows[c].requests,
        },
      ])
    ),
    distJsGzipBytes: {
      base: b.distJsGzipBytes,
      wired: w.distJsGzipBytes,
      added: w.distJsGzipBytes - b.distJsGzipBytes,
    },
    changedOrNewBuildFiles: lazy,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const scratch = process.argv[2];
  if (!scratch || existsSync(path.join(scratch, 'x')))
    throw new Error('usage: route.mjs <scratch directory>');
  console.log(JSON.stringify(await measureRoute(scratch), null, 1));
}
