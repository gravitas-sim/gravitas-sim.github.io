// =============================================================================
// The frame that is published to the compute origin, and the page that pins it
// -----------------------------------------------------------------------------
// compute-frame/ is published verbatim to gravitas-compute.github.io
// (D-COMPUTE-ORIGIN-01). This holds it to what tools/compute.mjs builds from
// js/compute/frame/ (rebuilt by a child process, since esbuild cannot load in
// Jest's realm), to the hashes the page pins, and to the policy that makes it
// safe: scripts by hash and the one runtime CDN, no eval, nothing else.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import './computeSetup.js';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';

import { FRAME_PIN } from '../js/compute/framePin.js';
import {
  FRAME_ORIGIN,
  FRAME_URL,
  PARENT_ORIGINS,
  parentAllowed,
} from '../js/compute/origin.js';
import { RUNTIME } from '../js/compute/runtime.js';

const sha = t => createHash('sha256').update(t).digest('hex');
const read = f => readFileSync(`compute-frame/${f}`, 'utf8');
const html = read('index.html');
const manifest = JSON.parse(read('manifest.json'));
const policy = /http-equiv="Content-Security-Policy" content="([^"]*)"/.exec(
  html
)[1];
const directives = Object.fromEntries(
  policy.split(';').map(d => {
    const [n, ...v] = d.trim().split(/\s+/);
    return [n, v];
  })
);
const script = /<script>([\s\S]*)<\/script>/.exec(html)[1];

describe('the published directory', () => {
  test('is what the generator writes (rebuilt, not trusted)', () => {
    expect(
      execFileSync('node', ['tools/compute.mjs', '--check'], {
        encoding: 'utf8',
      })
    ).toMatch(/current/);
  });

  test('holds exactly the files that are published, and the license is the project’s', () => {
    expect(readdirSync('compute-frame').sort()).toEqual([
      '.nojekyll',
      'LICENSE',
      'README.md',
      'index.html',
      'manifest.json',
      'robots.txt',
    ]);
    expect(read('LICENSE')).toBe(readFileSync('LICENSE', 'utf8'));
    expect(read('README.md')).toContain(FRAME_ORIGIN);
  });

  test('is what the page pins: the document’s hash and the build it reports', () => {
    expect(FRAME_PIN.indexSha256).toBe(sha(html));
    expect(manifest.indexSha256).toBe(sha(html));
    expect(manifest.build).toBe(FRAME_PIN.build);
    expect(script.match(new RegExp(`"${FRAME_PIN.build}"`, 'g'))).toHaveLength(
      1
    );
  });

  test('says what it pins of the runtime, as the page does', () => {
    expect(manifest.runtime).toMatchObject({
      version: RUNTIME.version,
      lockSha256: RUNTIME.lockSha256,
      base: RUNTIME.base,
    });
    expect(manifest.origin).toBe(FRAME_ORIGIN);
    expect(manifest.answers).toEqual(PARENT_ORIGINS);
    expect(RUNTIME.base).toContain(`/v${RUNTIME.version}/`);
    expect(script).toContain(RUNTIME.lockSha256);
  });
});

describe('its policy', () => {
  test('is the manifest’s, and allows its one inline script by hash', () => {
    expect(policy).toBe(manifest.csp);
    expect(html.match(/<script/g)).toHaveLength(1);
    const hash = createHash('sha256').update(script).digest('base64');
    expect(directives['script-src']).toEqual([
      `'sha256-${hash}'`,
      'https://cdn.jsdelivr.net',
      "'wasm-unsafe-eval'",
    ]);
  });

  test('forbids everything else', () => {
    expect(directives['default-src']).toEqual(["'none'"]);
    expect(directives['connect-src']).toEqual(['https://cdn.jsdelivr.net']);
    expect(directives['worker-src']).toEqual(['blob:']);
    expect(directives['base-uri']).toEqual(["'none'"]);
    expect(directives['form-action']).toEqual(["'none'"]);
    expect(policy).not.toMatch(
      /(?<!wasm-)unsafe-eval|unsafe-inline|\*|data:|http:/
    );
    expect(Object.keys(directives).sort()).toEqual([
      'base-uri',
      'connect-src',
      'default-src',
      'form-action',
      'script-src',
      'worker-src',
    ]);
  });

  test('its script evaluates nothing, writes no markup and reaches only the pinned runtime', () => {
    expect(script).not.toMatch(
      /\beval\s*\(|new Function|document\.write|innerHTML|outerHTML|insertAdjacentHTML/
    );
    const urls = [...script.matchAll(/https?:\/\/[^\s"'`)]+/g)].map(m => m[0]);
    for (const u of urls)
      expect(u).toMatch(
        /^https:\/\/(cdn\.jsdelivr\.net\/pyodide\/v314\.0\.7\/full\/|gravitas-sim\.online|gravitas-compute\.github\.io|pyodide\.org)/
      );
  });

  test('answers the published site and a developer’s own machine, and no other page', () => {
    expect(parentAllowed('https://gravitas-sim.online')).toBe(true);
    expect(parentAllowed('http://127.0.0.1:4391')).toBe(true);
    expect(parentAllowed('http://localhost:8003')).toBe(true);
    for (const o of [
      'https://evil.example',
      'http://gravitas-sim.online',
      'https://gravitas-sim.online.evil.example',
      'null',
      'http://127.0.0.1.evil.example',
      FRAME_ORIGIN,
    ])
      expect({ o, ok: parentAllowed(o) }).toEqual({ o, ok: false });
  });
});

describe('the compute page’s own policy', () => {
  const page = readFileSync('compute/index.html', 'utf8');
  const d = Object.fromEntries(
    /http-equiv="Content-Security-Policy"\s+content="([^"]*)"/
      .exec(page)[1]
      .split(';')
      .map(x => {
        const [n, ...v] = x.trim().split(/\s+/);
        return [n, v];
      })
  );
  test('frames the compute origin and nothing else, starts no Worker, runs no eval', () => {
    expect(d['frame-src']).toEqual([FRAME_ORIGIN]);
    expect(d['worker-src']).toEqual(["'none'"]);
    expect(d['connect-src']).toEqual(["'self'", 'blob:', FRAME_ORIGIN]);
    expect(d['script-src']).not.toContain("'unsafe-eval'");
    expect(d['script-src']).not.toContain("'unsafe-inline'");
    expect(FRAME_URL).toBe(`${FRAME_ORIGIN}/`);
  });
  test('and no other page names the compute origin', () => {
    const out = execFileSync(
      'git',
      ['grep', '-l', 'gravitas-compute.github.io', '--', '*.html'],
      { encoding: 'utf8' }
    )
      .split('\n')
      .filter(Boolean);
    // The page that frames it, and the frame's own document (its README line).
    expect(out.sort()).toEqual([
      'compute-frame/index.html',
      'compute/index.html',
    ]);
  });
});
