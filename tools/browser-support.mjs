#!/usr/bin/env node
// =============================================================================
// The supported-browser statement, generated (Prompt 111)
// -----------------------------------------------------------------------------
//   node tools/browser-support.mjs --check    fail if a generated region is stale
//   node tools/browser-support.mjs --write    regenerate the regions
//   node tools/browser-support.mjs --print    the regions, to read
//
// What is tested is the one fact about browser support a document can get
// wrong silently, so it is not written by hand. The table comes from the
// `projects` of playwright.config.js (loaded with every engine switched on, as
// CI's weekly jobs do) and from the browser builds the locked Playwright ships
// (node_modules/playwright-core/browsers.json). Add a project, bump Playwright,
// and the regions below go stale until `npm run support:sync`; a Jest test
// (tests/platformBaseline.test.js) fails in the meantime.
//
// Two regions, each between a pair of markers and left alone outside them:
//
//   SUPPORT.md            <!-- browser-support:begin --> ... <!-- browser-support:end -->
//                         <!-- feature-inventory:begin --> ... <!-- feature-inventory:end -->
//   teaching/index.html   <!--browser-support:begin--> ... <!--browser-support:end-->
//
// The inventory table is tools/feature-inventory.mjs; the same test holds it
// to the code's actual detections.
//
// The cadence column (Chromium on every change, Firefox and WebKit on pushes
// and weekly) is prose here, not read from the config, because the config does
// not know it: CI does. The test checks .github/workflows/ci.yml for it.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { inventoryMarkdown } from './feature-inventory.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** What each Playwright project is for and when it runs. A new project fails the generator until it has a row. */
const PROJECTS = {
  chromium: {
    device: 'Desktop Chrome',
    runs: 'The whole suite',
    when: 'Every change',
  },
  firefox: {
    device: 'Desktop Firefox',
    runs: 'The `@cross-browser` profile',
    when: 'Every push, and weekly',
  },
  webkit: {
    device: 'Desktop Safari',
    runs: 'The `@cross-browser` profile',
    when: 'Every push, and weekly',
  },
  'mobile-chrome': {
    device: 'Pixel 7 (Chrome on Android)',
    runs: 'The phone layout and every lesson walked',
    when: 'Every change',
  },
  tablet: {
    device: 'iPad Mini geometry',
    runs: 'The tablet layout, and every lesson walked',
    when: 'Layout on every change, the walk weekly',
  },
};

/** The engines' display names. */
const ENGINE = { chromium: 'Chromium', firefox: 'Firefox', webkit: 'WebKit' };

/**
 * The projects of playwright.config.js with every engine on and the tablet
 * walk on, plus the browser builds Playwright ships.
 * @returns {Promise<{playwright: string, builds: Record<string,string>, projects: object[]}>}
 */
export async function readFacts() {
  const saved = { ...process.env };
  process.env.GRAVITAS_E2E_BROWSERS = 'all';
  delete process.env.GRAVITAS_E2E_TARGET;
  delete process.env.GRAVITAS_E2E_PROFILE;
  let config;
  try {
    config = (await import('../playwright.config.js')).default;
  } finally {
    for (const k of Object.keys(process.env))
      if (!(k in saved)) delete process.env[k];
    Object.assign(process.env, saved);
  }
  const core = f =>
    JSON.parse(
      readFileSync(path.join(ROOT, 'node_modules/playwright-core', f), 'utf8')
    );
  const { browsers } = core('browsers.json');
  const builds = Object.fromEntries(
    browsers.filter(b => ENGINE[b.name]).map(b => [b.name, b.browserVersion])
  );
  const playwright = core('package.json').version;
  const projects = config.projects.map(p => {
    if (!PROJECTS[p.name])
      throw new Error(
        `playwright.config.js has a project "${p.name}" with no row in tools/browser-support.mjs PROJECTS: say what it is for and when it runs.`
      );
    const engine = p.use.defaultBrowserType ?? p.use.browserName;
    return {
      name: p.name,
      engine,
      viewport: p.use.viewport,
      touch: Boolean(p.use.hasTouch),
      ...PROJECTS[p.name],
    };
  });
  return { playwright, builds, projects };
}

const size = v => (v ? `${v.width}×${v.height}` : 'default');
const major = v => String(v).split('.')[0];

/** The Markdown table for SUPPORT.md. */
export function browserMarkdown(facts) {
  const rows = facts.projects.map(p => {
    const engine = `${ENGINE[p.engine]} ${major(facts.builds[p.engine])}`;
    return `| \`${p.name}\` | ${engine} | ${p.device}, ${size(p.viewport)}${p.touch ? ', touch' : ''} | ${p.runs} | ${p.when} |`;
  });
  return [
    `Playwright ${facts.playwright} is locked, and these are the builds it drives:`,
    '',
    '| Project | Engine build | Profile | Runs | When |',
    '| --- | --- | --- | --- | --- |',
    ...rows,
  ].join('\n');
}

/** The sentence the Teach hub carries, in both languages. */
export function teachingHtml(facts) {
  const builds = ['chromium', 'firefox', 'webkit']
    .map(e => `${ENGINE[e]} ${major(facts.builds[e])}`)
    .join(', ');
  return [
    '<p>',
    `<span class="gs-en">Gravitas supports the two most recent major versions of Chrome and Edge, Firefox and Safari, on desktops, phones and tablets. The browser suite runs in ${builds}, and in a phone and a tablet profile; every change is tested in Chromium, and Firefox and WebKit are tested on every push and weekly. Capabilities a browser may lack (Workers, IndexedDB, WebGL) have documented fallbacks. <a href="https://github.com/gravitas-sim/gravitas-sim.github.io/blob/main/SUPPORT.md#supported-browsers-and-devices">The full statement</a>.</span>`,
    `<span class="gs-es" lang="es">Gravitas admite las dos versiones principales más recientes de Chrome y Edge, Firefox y Safari, en computadoras, teléfonos y tabletas. El conjunto de pruebas del navegador se ejecuta en ${builds}, y en un perfil de teléfono y otro de tableta; cada cambio se prueba en Chromium, y Firefox y WebKit se prueban en cada envío y cada semana. Las funciones que un navegador puede no tener (Workers, IndexedDB, WebGL) tienen alternativas documentadas. <a href="https://github.com/gravitas-sim/gravitas-sim.github.io/blob/main/SUPPORT.md#supported-browsers-and-devices">La declaración completa</a>.</span>`,
    '</p>',
  ].join('\n');
}

const MD = name =>
  new RegExp(`(<!-- ${name}:begin -->\\n)[\\s\\S]*?(\\n<!-- ${name}:end -->)`);
const HTML = new RegExp(
  '(<!--browser-support:begin-->\\n)[\\s\\S]*?(\\n<!--browser-support:end-->)'
);

/** Every generated region, as {file, pattern, body}. */
export async function regions() {
  const facts = await readFacts();
  return [
    {
      file: 'SUPPORT.md',
      pattern: MD('browser-support'),
      body: browserMarkdown(facts),
    },
    {
      file: 'SUPPORT.md',
      pattern: MD('feature-inventory'),
      body: inventoryMarkdown(),
    },
    { file: 'teaching/index.html', pattern: HTML, body: teachingHtml(facts) },
  ];
}

/** Each file's text with its regions regenerated, keyed by file. */
export async function regenerated() {
  const out = {};
  for (const r of await regions()) {
    const text = out[r.file] ?? readFileSync(path.join(ROOT, r.file), 'utf8');
    if (!r.pattern.test(text))
      throw new Error(
        `${r.file} has no region matching ${r.pattern.source.slice(0, 40)}`
      );
    out[r.file] = text.replace(r.pattern, (_, a, b) => `${a}${r.body}${b}`);
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2] ?? '--check';
  const next = await regenerated();
  if (mode === '--print') {
    for (const r of await regions()) console.log(`--- ${r.file}\n${r.body}\n`);
  } else if (mode === '--write') {
    for (const [file, text] of Object.entries(next))
      writeFileSync(path.join(ROOT, file), text);
  } else {
    const stale = Object.entries(next).filter(
      ([file, text]) => readFileSync(path.join(ROOT, file), 'utf8') !== text
    );
    if (stale.length) {
      console.error(
        `Stale generated regions in: ${stale.map(([f]) => f).join(', ')}. Run: npm run support:sync`
      );
      process.exit(1);
    }
    console.log('browser-support: current');
  }
}
