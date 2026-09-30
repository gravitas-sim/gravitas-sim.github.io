// =============================================================================
// A Content-Security-Policy on every page, and the one each page should have
// -----------------------------------------------------------------------------
// tools/csp.mjs writes each published page's policy (Roadmap II, Prompt 67).
// This holds every page to it: a policy, first in <head>, with the hashes of
// the page's inline scripts as they are now; no eval, no inline script by
// permission rather than by hash; fetches beyond this origin only where the
// code names them.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';

import { inlineScripts, pages, policyFor, withPolicy } from '../tools/csp.mjs';
import { ALLOW } from '../js/archive/cds.js';

const directives = policy =>
  Object.fromEntries(
    policy.split(';').map(d => {
      const [name, ...values] = d.trim().split(/\s+/);
      return [name, values];
    })
  );
const policyOf = html =>
  /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"/.exec(
    html
  )?.[1];

describe('every published page', () => {
  const all = pages();

  test('is found', () => {
    expect(all.length).toBeGreaterThan(15);
    expect(all).toContain('index.html');
    expect(all.some(p => p.startsWith('spike/'))).toBe(false);
  });

  test.each(all)(
    '%s has its policy, current, first after the charset',
    page => {
      const html = readFileSync(page, 'utf8');
      expect(withPolicy(page, html)).toBe(html);
      expect(html.match(/http-equiv="Content-Security-Policy"/g)).toHaveLength(
        1
      );
      const head = html.slice(0, html.indexOf('http-equiv'));
      expect(head).not.toMatch(/<script|<link/);
    }
  );

  test.each(all)('%s runs no code it has not named', page => {
    const d = directives(policyOf(readFileSync(page, 'utf8')));
    expect(d['default-src']).toEqual(["'self'"]);
    expect(d['script-src']).not.toContain("'unsafe-inline'");
    expect(d['script-src']).not.toContain("'unsafe-eval'");
    expect(d['object-src']).toEqual(["'none'"]);
    // A browser ignores frame-ancestors in a <meta>, and says so.
    expect(d['frame-ancestors']).toBeUndefined();
  });

  test('only the Observatory fetches beyond this origin, and only what the archive names', () => {
    for (const page of all) {
      const d = directives(policyOf(readFileSync(page, 'utf8')));
      // blob: is this page's own data, made by its own scripts.
      const beyond = d['connect-src'].filter(
        s => s !== "'self'" && s !== 'blob:'
      );
      expect({ page, beyond: beyond.sort() }).toEqual({
        page,
        beyond: page === 'observatory/index.html' ? [...ALLOW].sort() : [],
      });
    }
  });
});

describe('the hashes', () => {
  test('an inline script is allowed by the hash of its text, and a changed one is not', () => {
    const html = '<head><meta charset="utf-8" /><script>boot()</script></head>';
    const one = policyFor('x.html', html);
    expect(one).toMatch(/script-src 'self' 'sha256-[A-Za-z0-9+/=]+'/);
    expect(policyFor('x.html', html.replace('boot()', 'boot(1)'))).not.toBe(
      one
    );
  });

  test('a data block is not a script, and a script with a source needs no hash', () => {
    expect(
      inlineScripts(
        '<script type="application/ld+json">{}</script><script src="/a.js"></script><script type="module">go()</script>'
      )
    ).toEqual(['go()']);
  });
});
