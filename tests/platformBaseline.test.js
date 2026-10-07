// =============================================================================
// The platform baseline cannot drift (Prompt 111)
// -----------------------------------------------------------------------------
// Four things a policy document gets wrong silently, each held to its source:
//
//   1. The supported-browser statement and the feature inventory in SUPPORT.md,
//      and the sentence on the Teach hub, are generated (tools/browser-support
//      .mjs) from playwright.config.js's projects, the locked Playwright's
//      browser builds and tools/feature-inventory.mjs. The generator runs in a
//      child process: it imports the real Playwright config, which a Jest VM
//      should not.
//   2. The cadence the statement promises (Chromium on every change, Firefox
//      and WebKit on pushes and weekly) is what ci.yml does.
//   3. The inventory is the code's actual detections, in both directions: each
//      entry's detection is still in its file, and no file uses one of the APIs
//      without an entry.
//   4. The toolchain policy's exact pins are exact, and the three statements of
//      the Node version agree.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FEATURES } from '../tools/feature-inventory.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(path.join(ROOT, f), 'utf8');

/** Every .js file under js/, minus the translation catalogues. */
function sources(dir = 'js') {
  const out = [];
  for (const name of readdirSync(path.join(ROOT, dir))) {
    const rel = `${dir}/${name}`;
    if (rel === 'js/i18n') continue;
    if (statSync(path.join(ROOT, rel)).isDirectory()) out.push(...sources(rel));
    else if (name.endsWith('.js')) out.push(rel);
  }
  return out;
}

/** Source with comment lines removed: a doc comment naming an API is not a use of it. */
const code = f =>
  read(f)
    .split('\n')
    .filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join('\n');

describe('the generated browser statement', () => {
  test('SUPPORT.md and the Teach hub are current', () => {
    // A failure here means: run `npm run support:sync` and commit the result.
    const run = () =>
      execFileSync(process.execPath, ['tools/browser-support.mjs', '--check'], {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: 'pipe',
      });
    expect(run()).toContain('current');
  });

  test('names every project of the Playwright config, and every engine', () => {
    const out = execFileSync(
      process.execPath,
      ['tools/browser-support.mjs', '--print'],
      { cwd: ROOT, encoding: 'utf8' }
    );
    for (const name of [
      'chromium',
      'firefox',
      'webkit',
      'mobile-chrome',
      'tablet',
    ])
      expect(out).toContain(`\`${name}\``);
    expect(out).toMatch(/Chromium \d+/);
    expect(out).toMatch(/Firefox \d+/);
    expect(out).toMatch(/WebKit \d+/);
  });

  test('the Teach hub states it in both languages and links the full statement', () => {
    const html = read('teaching/index.html');
    const block =
      /<!--browser-support:begin-->([\s\S]*?)<!--browser-support:end-->/.exec(
        html
      )[1];
    expect(block).toContain('class="gs-en"');
    expect(block).toContain('class="gs-es" lang="es"');
    expect(block).toContain('SUPPORT.md#supported-browsers-and-devices');
  });

  test('the cadence it promises is the cadence of ci.yml', () => {
    const ci = read('.github/workflows/ci.yml');
    const job = /\n  cross-browser:[\s\S]*?\n  [a-z-]+:\n/.exec(ci)[0];
    // Not on pull requests, so on pushes; and the schedule is not excluded.
    expect(job).toContain("if: github.event_name != 'pull_request'");
    expect(job).toMatch(/browser: \[firefox, webkit\]/);
    expect(ci).toMatch(/schedule:[\s\S]*?- cron: '0 6 \* \* 1'/);
    // Chromium's full suite is the pull-request suite: nothing excludes it.
    expect(ci).toMatch(/npm run e2e/);
  });
});

describe('the feature-detection inventory', () => {
  test('each entry has a purpose, a fallback statement and a token', () => {
    const ids = FEATURES.map(f => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const f of FEATURES) {
      expect([f.id, f.purpose.length > 0]).toEqual([f.id, true]);
      expect([f.id, f.without.length > 0]).toEqual([f.id, true]);
      expect(f.token).toBeInstanceOf(RegExp);
    }
  });

  test('every recorded detection is still in its file', () => {
    for (const f of FEATURES)
      for (const u of f.uses)
        expect([f.id, u.file, u.detect.test(code(u.file))]).toEqual([
          f.id,
          u.file,
          true,
        ]);
  });

  test('no file uses one of these APIs without an entry for it', () => {
    const unlisted = [];
    for (const file of sources()) {
      const text = code(file);
      for (const f of FEATURES)
        if (f.token.test(text) && !f.uses.some(u => u.file === file))
          unlisted.push(
            `${file} uses ${f.name}: add it to tools/feature-inventory.mjs`
          );
    }
    expect(unlisted).toEqual([]);
  });

  test('the capability the code deliberately does not use stays unused', () => {
    const offscreen = FEATURES.find(f => f.id === 'offscreencanvas');
    expect(offscreen.uses).toEqual([]);
  });

  test('SUPPORT.md says the inventory is held to the code', () => {
    expect(read('SUPPORT.md')).toContain('Feature detection');
  });
});

describe('the toolchain policy', () => {
  const pkg = JSON.parse(read('package.json'));
  const all = { ...pkg.dependencies, ...pkg.devDependencies };
  const EXACT = [
    'three',
    'chart.js',
    '@fontsource/inter',
    '@fontsource/poppins',
    '@fontsource/roboto-mono',
    'esbuild',
    'playwright',
    '@playwright/test',
    'axe-core',
    '@axe-core/playwright',
    'acorn',
    'js-yaml',
  ];
  const policy = read('TOOLCHAIN.md');

  test('every package the policy says is exact is an exact version', () => {
    for (const name of EXACT)
      expect([name, /^\d+\.\d+\.\d+$/.test(all[name] ?? '')]).toEqual([
        name,
        true,
      ]);
  });

  test('the policy names each of them, and every runtime dependency', () => {
    for (const name of EXACT.filter(n => n !== '@axe-core/playwright'))
      expect([name, policy.includes(`\`${name}\``)]).toEqual([name, true]);
    for (const name of Object.keys(pkg.dependencies))
      expect(EXACT).toContain(name);
  });

  test('the lockfile installs the pins it is asked for', () => {
    const lock = JSON.parse(read('package-lock.json'));
    for (const name of EXACT)
      expect([name, lock.packages[`node_modules/${name}`].version]).toEqual([
        name,
        all[name],
      ]);
  });

  test('.nvmrc, CI and the engines floor agree about Node', () => {
    const nvmrc = Number(read('.nvmrc').trim().replace(/^v/, '').split('.')[0]);
    const ci = Number(
      /NODE_VERSION: '(\d+)'/.exec(read('.github/workflows/ci.yml'))[1]
    );
    const floor = Number(/>=\s*(\d+)/.exec(pkg.engines.node)[1]);
    expect(nvmrc).toBe(ci);
    expect(floor).toBeLessThanOrEqual(ci);
  });

  test('continuity and owner documents exist and refer to each other', () => {
    const continuity = read('CONTINUITY.md');
    const owner = read('OWNER_ACTIONS.md');
    expect(continuity).toContain('OWNER_ACTIONS.md');
    expect(owner).toContain('## Bus factor');
    for (const heading of [
      'Hosting a copy',
      'Adding a co-maintainer',
      'What a fork must keep',
    ])
      expect(continuity).toContain(`## ${heading}`);
  });
});
