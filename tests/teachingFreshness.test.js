// =============================================================================
// Is the generated teaching data current?
// -----------------------------------------------------------------------------
// `npm run teaching:check` used to answer that by comparing the checked-in file
// to a freshly rendered one byte for byte. That is the wrong question about
// this particular file. A demonstration link is a deflated payload, and the
// zlib behind CompressionStream is free to emit any valid deflate stream it
// likes: Node 24.4.0 and Node 24.19.0 produce different bytes for the same six
// payloads, and both sets of links work perfectly. The check failed on a file
// that was not stale, and regenerating it would only have moved the failure to
// whichever machine ran the check next.
//
// So the check compares meaning now, and these are the two halves of that
// claim: an encoding that differs byte for byte and says the same thing has to
// pass, and an encoding that says anything different has to fail. The second
// half is the one that keeps the first half honest.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { DEMOS } from '../js/data/teaching.js';
import { SCENARIO_INFO } from '../js/data/scenarioInfo.js';
import {
  payloadFor,
  stalenessOf,
  fileProblemsWith,
} from '../tools/build-teaching-demos.mjs';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GENERATED = path.join(REPO, 'js/data/teachingGenerated.js');
import { encodePayload } from '../js/shareState.js';

const SCENARIO_COUNT = Object.keys(SCENARIO_INFO).length;

/** The base64url alphabet, without padding, as the codec writes it. */
const b64url = buf =>
  Buffer.from(buf, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

/**
 * The same payload in the *uncompressed* encoding.
 *
 * `encodeTagged` picks deflate only when it wins, so this is the other branch
 * of a decision the codec already makes - a real encoding this application
 * reads, not a contrivance. It shares no bytes with the deflated form, which
 * is what makes it a fair stand-in for a different zlib.
 */
const asRawLink = payload => `1r${b64url(JSON.stringify(payload))}`;

/** A generated module, as the checker sees one. */
const moduleOf = (links, count = SCENARIO_COUNT) => ({
  DEMO_LINKS: Object.freeze(links),
  SCENARIO_COUNT: count,
});

/** Deflated links, the way the generator writes them today. */
async function currentLinks() {
  const out = {};
  for (const demo of DEMOS)
    out[demo.id] = await encodePayload(payloadFor(demo));
  return out;
}

/** Uncompressed links, byte-for-byte unlike the above, meaning the same. */
function equivalentLinks() {
  const out = {};
  for (const demo of DEMOS) out[demo.id] = asRawLink(payloadFor(demo));
  return out;
}

describe('an equivalent encoding is accepted', () => {
  test('the links the generator writes today are current', async () => {
    const problems = await stalenessOf(moduleOf(await currentLinks()));
    expect(problems).toEqual([]);
  });

  test('so are the same payloads encoded a completely different way', async () => {
    const deflated = await currentLinks();
    const raw = equivalentLinks();
    // Genuinely different bytes, or this proves nothing.
    for (const id of Object.keys(raw)) {
      expect(raw[id]).not.toBe(deflated[id]);
    }
    expect(await stalenessOf(moduleOf(raw))).toEqual([]);
  });

  test('and the checked-in file passes the real command', () => {
    // End to end, in the runtime that gates anything: the tool under Node,
    // against the file exactly as committed.
    const out = execFileSync(
      process.execPath,
      ['tools/build-teaching-demos.mjs', '--check'],
      { cwd: REPO, encoding: 'utf8' }
    );
    expect(out).toMatch(/is current/);
  });
});

describe('a change of meaning is rejected', () => {
  /** The staleness report for links built from a doctored spec. */
  const reportFor = async mutate => {
    const links = {};
    for (const demo of DEMOS) {
      const payload = payloadFor(demo);
      links[demo.id] = asRawLink(mutate(payload, demo) ?? payload);
    }
    return stalenessOf(moduleOf(links));
  };

  test('a missing demonstration', async () => {
    const links = equivalentLinks();
    const gone = DEMOS[0].id;
    delete links[gone];
    const problems = await stalenessOf(moduleOf(links));
    expect(problems.join(' ')).toContain(gone);
    expect(problems.length).toBeGreaterThan(0);
  });

  test('an extra demonstration nobody asked for', async () => {
    const links = { ...equivalentLinks(), interloper: asRawLink({ v: 1 }) };
    const problems = await stalenessOf(moduleOf(links));
    expect(problems.join(' ')).toContain('interloper');
  });

  test('a malformed link', async () => {
    const links = equivalentLinks();
    links[DEMOS[0].id] = 'not a share link at all';
    const problems = await stalenessOf(moduleOf(links));
    expect(problems.join(' ')).toMatch(/does not decode/);
  });

  test('a link truncated in transit', async () => {
    const links = equivalentLinks();
    links[DEMOS[0].id] = links[DEMOS[0].id].slice(0, 12);
    const problems = await stalenessOf(moduleOf(links));
    expect(problems.length).toBeGreaterThan(0);
  });

  test('a different scenario', async () => {
    const problems = await reportFor(p => ({ ...p, s: 'Binary BH' }));
    expect(problems.join(' ')).toMatch(/\bs=/);
  });

  test('a different seed', async () => {
    const problems = await reportFor(p => ({ ...p, seed: 'zzzzz' }));
    expect(problems.join(' ')).toMatch(/seed=/);
  });

  test('a forced setting that has been changed', async () => {
    const withSettings = DEMOS.filter(
      d => Object.keys(d.state.settings || {}).length
    );
    expect(withSettings.length).toBeGreaterThan(0);
    const problems = await reportFor(p =>
      p.d ? { ...p, d: { ...p.d, sim_speed: 999 } } : null
    );
    expect(problems.join(' ')).toMatch(/\bd=/);
  });

  test('a forced setting that has been dropped', async () => {
    const problems = await reportFor(p => {
      if (!p.d) return null;
      const rest = { ...p };
      delete rest.d;
      return rest;
    });
    expect(problems.join(' ')).toMatch(/\bd=/);
  });

  test('a demonstration that is no longer paused', async () => {
    const problems = await reportFor(p => ({ ...p, p: false }));
    expect(problems.join(' ')).toMatch(/\bp=/);
  });

  test('a stale scenario count', async () => {
    const links = equivalentLinks();
    const problems = await stalenessOf(moduleOf(links, SCENARIO_COUNT - 1));
    expect(problems.join(' ')).toMatch(/SCENARIO_COUNT/);
  });

  test('a file with no links in it at all', async () => {
    const problems = await stalenessOf({ SCENARIO_COUNT });
    expect(problems.join(' ')).toMatch(/no DEMO_LINKS/);
  });
});

describe('the file is still checked as a file', () => {
  test('a missing generated-file banner is caught', async () => {
    const { problems } = await fileProblemsWith(
      'export const DEMO_LINKS = Object.freeze({});\nexport const SCENARIO_COUNT = 1;\n'
    );
    expect(problems.join(' ')).toMatch(/banner/);
  });

  test('an unfrozen DEMO_LINKS is caught', async () => {
    const { problems } = await fileProblemsWith(
      '// GENERATED, do not edit\nexport const DEMO_LINKS = {};\nexport const SCENARIO_COUNT = 1;\n'
    );
    expect(problems.join(' ')).toMatch(/frozen/);
  });

  test('a missing scenario count is caught', async () => {
    const { problems } = await fileProblemsWith(
      '// GENERATED, do not edit\nexport const DEMO_LINKS = Object.freeze({});\n'
    );
    expect(problems.join(' ')).toMatch(/SCENARIO_COUNT/);
  });

  test('an empty file is caught', async () => {
    const { problems } = await fileProblemsWith('');
    expect(problems.join(' ')).toMatch(/empty/);
  });

  test('Jest cannot check formatting, and says so rather than passing', async () => {
    // Prettier's standalone bundle - the one Jest resolves - has no parsers.
    // The flag is how that is reported instead of being silently skipped; the
    // test below runs the real command, where it is true.
    const { formatChecked } = await fileProblemsWith(
      readFileSync(GENERATED, 'utf8')
    );
    expect(typeof formatChecked).toBe('boolean');
  });

  test('the real command does check formatting, and rejects a mangled file', () => {
    const original = readFileSync(GENERATED, 'utf8');
    try {
      // Valid JavaScript, identical meaning, formatting Prettier would redo.
      writeFileSync(GENERATED, original.replace(/\n\n/, '\n\n\n\n'));
      let failed = false;
      let output = '';
      try {
        execFileSync(
          process.execPath,
          ['tools/build-teaching-demos.mjs', '--check'],
          { cwd: REPO, encoding: 'utf8', stdio: 'pipe' }
        );
      } catch (err) {
        failed = true;
        output = `${err.stdout || ''}${err.stderr || ''}`;
      }
      expect(failed).toBe(true);
      expect(output).toMatch(/Prettier/);
    } finally {
      writeFileSync(GENERATED, original);
    }
  });
});
