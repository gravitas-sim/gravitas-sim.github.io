import { describe, test, expect, beforeAll } from '@jest/globals';
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { ReadableStream } from 'node:stream/web';
import { TextDecoder, TextEncoder } from 'node:util';

// =============================================================================
// The archive import's contracts, without a page and without the network
// -----------------------------------------------------------------------------
// VO_ARCHIVE_GATE.md accepted CDS Sesame and VizieR TAP for one curated table,
// Gaia DR3 epoch photometry. Everything here runs against the two answers in
// tests/fixtures/archive/ and a stand-in for fetch:
//   - every failure the gate named is refused by name;
//   - nothing leaves for a service off the list, before or after a redirect,
//     and the page's CSP names the same list;
//   - the VOTable reader refuses what it cannot read rather than misread it;
//   - the conversion is a gravitas.observation/1 the workspace accepts,
//     saves and reads back, and the series it makes is the star;
//   - a cached answer says how old it is, and a changed one says so.
// jsdom supplies DOMParser, as a page does; Node supplies what jsdom lacks.
// =============================================================================

if (!globalThis.crypto?.subtle)
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });
globalThis.TextEncoder ??= TextEncoder;
globalThis.TextDecoder ??= TextDecoder;

const { fetchLimited, sha256Hex } = await import('../js/archive/net.js');
const { parseVotable } = await import('../js/archive/votable.js');
const cds = await import('../js/archive/cds.js');
const { cachedFetch, memoryStore } = await import('../js/archive/cache.js');
const { toObservation, tcbToTdb, UnitError, BANDS } =
  await import('../js/archive/gaiaEpochs.js');

const EPPHOT = readFileSync('tests/fixtures/archive/gaia-epphot-su-dra.vot');
const SESAME = readFileSync('tests/fixtures/archive/sesame-su-dra.xml');
const SU_DRA = '1058066262817534336';
// The digest Chromium, Firefox and WebKit computed from live answers
// (VO_ARCHIVE_GATE.md); the fixture is one of those answers.
const SU_DRA_CONTENT =
  'eaaa345eb58c12a3af4663b3549113c08d8a15cc10a7e7ffc8b2caec5f69da6f';
const TAP = 'https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync';

/** A stand-in for fetch: one response, or a function of the request. */
function fakeFetch(respond) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url: String(url), init });
    return typeof respond === 'function' ? respond(String(url), init) : respond;
  };
  impl.calls = calls;
  return impl;
}
/** Bytes as the stream a fetch response's body is. */
function streamOf(bytes) {
  return new ReadableStream({
    start(c) {
      if (bytes.length) c.enqueue(bytes);
      c.close();
    },
  });
}
/**
 * A fetch response, as far as js/archive/net.js reads one: status, ok, url,
 * redirected, headers.get() and a streaming body.
 */
function response(
  body,
  {
    status = 200,
    type = 'application/x-votable+xml',
    url = `${TAP}?x`,
    headers = {},
    redirected = false,
    length = true,
    stream = null,
  } = {}
) {
  const bytes =
    typeof body === 'string'
      ? new TextEncoder().encode(body)
      : new Uint8Array(body);
  const h = new Map(
    Object.entries({ 'content-type': type, ...headers }).map(([k, v]) => [
      k.toLowerCase(),
      v,
    ])
  );
  if (length && !stream && !h.has('content-length'))
    h.set('content-length', String(bytes.length));
  return {
    status,
    ok: status >= 200 && status < 300,
    url,
    redirected,
    headers: { get: k => h.get(k.toLowerCase()) ?? null },
    body: stream ?? streamOf(bytes),
  };
}
const rejectsWith = async (promise, c) => {
  let caught = null;
  try {
    await promise;
  } catch (err) {
    caught = err;
  }
  expect(caught?.code).toBe(c);
  return caught;
};

// --- The network -----------------------------------------------------------

describe('one bounded request, every failure named', () => {
  test('an unavailable archive (5xx) is named, and its page is not parsed', async () => {
    const err = await rejectsWith(
      fetchLimited(`${TAP}?q`, {
        fetchImpl: fakeFetch(
          response('<html>down</html>', { status: 503, type: 'text/html' })
        ),
      }),
      'unavailable'
    );
    expect(err.detail.status).toBe(503);
  });

  test('a CORS refusal is "blocked", in words that name both causes', async () => {
    const err = await rejectsWith(
      fetchLimited(`${TAP}?q`, {
        fetchImpl: fakeFetch(() =>
          Promise.reject(new TypeError('Failed to fetch'))
        ),
      }),
      'blocked'
    );
    expect(err.message).toMatch(/does not allow this site/);
    expect(err.message).toMatch(/network is down/);
  });

  test('no answer within the limit is a timeout, with the limit', async () => {
    const hang = fakeFetch(
      (url, init) =>
        new Promise((_, reject) =>
          init.signal.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError'))
          )
        )
    );
    const err = await rejectsWith(
      fetchLimited(`${TAP}?q`, { fetchImpl: hang, timeoutMs: 30 }),
      'timeout'
    );
    expect(err.detail.seconds).toBe(0);
  });

  test("the reader's Cancel is 'canceled', not a timeout", async () => {
    const hang = fakeFetch(
      (url, init) =>
        new Promise((_, reject) =>
          init.signal.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError'))
          )
        )
    );
    const c = new AbortController();
    const p = fetchLimited(`${TAP}?q`, { fetchImpl: hang, signal: c.signal });
    c.abort();
    await rejectsWith(p, 'canceled');
  });

  test('rate limiting (429) carries the Retry-After the service gave', async () => {
    const err = await rejectsWith(
      fetchLimited(`${TAP}?q`, {
        fetchImpl: fakeFetch(
          response('slow down', {
            status: 429,
            type: 'text/plain',
            headers: { 'retry-after': '30' },
          })
        ),
      }),
      'rateLimited'
    );
    expect(err.detail.retryAfter).toBe('30');
  });

  test('any other refusal (4xx) is refused', async () => {
    await rejectsWith(
      fetchLimited(`${TAP}?q`, {
        fetchImpl: fakeFetch(
          response('bad ADQL', { status: 400, type: 'text/plain' })
        ),
      }),
      'refused'
    );
  });

  test('a huge answer is refused by its declared length', async () => {
    const big = response(new Uint8Array(10), {
      headers: { 'content-length': '900000000' },
    });
    await rejectsWith(
      fetchLimited(`${TAP}?q`, { fetchImpl: fakeFetch(big), maxBytes: 1000 }),
      'tooLarge'
    );
  });

  test('a huge answer with no declared length is stopped as it streams', async () => {
    // VizieR's TAP answers carry no Content-Length at all.
    let pulled = 0;
    const stream = new ReadableStream({
      pull(c) {
        pulled++;
        c.enqueue(new Uint8Array(4096));
      },
    });
    const res = response('', { type: 'text/xml', url: `${TAP}?q`, stream });
    await rejectsWith(
      fetchLimited(`${TAP}?q`, {
        fetchImpl: fakeFetch(res),
        maxBytes: 100_000,
      }),
      'tooLarge'
    );
    expect(pulled).toBeLessThan(40);
  });

  test('an HTML page where a table was asked for is the wrong type', async () => {
    await rejectsWith(
      fetchLimited(`${TAP}?q`, {
        fetchImpl: fakeFetch(
          response('<html>Maintenance</html>', { type: 'text/html' })
        ),
        accept: /votable|xml/,
      }),
      'wrongType'
    );
  });

  test('a redirect within the list is followed, and where it ended is recorded', async () => {
    const got = await fetchLimited(`${TAP}?q`, {
      fetchImpl: fakeFetch(
        response(EPPHOT, { url: `${TAP}/final`, redirected: true })
      ),
      allow: cds.ALLOW,
    });
    expect(got.redirected).toBe(true);
    expect(got.url).toBe(`${TAP}/final`);
  });

  test('a redirect off the list is refused, and its body is never read', async () => {
    const err = await rejectsWith(
      fetchLimited(`${TAP}?q`, {
        fetchImpl: fakeFetch(
          response(EPPHOT, {
            url: 'https://elsewhere.example/t.vot',
            redirected: true,
          })
        ),
        allow: cds.ALLOW,
      }),
      'offList'
    );
    expect(err.detail.origin).toBe('https://elsewhere.example');
  });

  test('a request off the list is never sent', async () => {
    const f = fakeFetch(response(EPPHOT));
    await rejectsWith(
      fetchLimited('https://mast.stsci.edu/q', {
        fetchImpl: f,
        allow: cds.ALLOW,
      }),
      'offList'
    );
    expect(f.calls).toHaveLength(0);
  });

  test('no request carries a cookie or a referrer', async () => {
    const f = fakeFetch(response(EPPHOT));
    await fetchLimited(`${TAP}?q`, { fetchImpl: f });
    expect(f.calls[0].init.credentials).toBe('omit');
    expect(f.calls[0].init.referrerPolicy).toBe('no-referrer');
  });

  test("the Observatory's Content-Security-Policy names exactly the list", () => {
    const html = readFileSync('observatory/index.html', 'utf8');
    const csp = html.match(
      /http-equiv="Content-Security-Policy"\s+content="([^"]+)"/
    )?.[1];
    expect(csp).toBeDefined();
    // connect-src alone: the page has inline styles a default-src would stop.
    expect(csp.split(';').map(d => d.trim().split(/\s+/)[0])).toEqual([
      'connect-src',
    ]);
    const origins = csp
      .trim()
      .split(/\s+/)
      .slice(1)
      .filter(s => s !== "'self'");
    expect(origins.sort()).toEqual([...cds.ALLOW].sort());
  });
});

// --- The VOTable -------------------------------------------------------------

describe('a VOTable, read strictly', () => {
  test('the captured answer: eight fields, 47 rows, status OK, and no unit on the flux', () => {
    const t = parseVotable(EPPHOT.toString('utf8'));
    expect(t.fields.map(f => f.name)).toEqual([
      'TimeG',
      'FG',
      'e_FG',
      'Gmag',
      'TimeBP',
      'BPmag',
      'TimeRP',
      'RPmag',
    ]);
    expect(t.rows).toHaveLength(47);
    expect(t.status).toBe('OK');
    expect(t.overflow).toBe(false);
    // Why a curated descriptor is needed at all.
    expect(t.fields[1].unit).toBeNull();
    expect(t.fields[0].description).toMatch(/JD-2455197\.5/);
  });

  test('OVERFLOW means the service stopped at MAXREC, and the table says so', () => {
    const t = parseVotable(
      EPPHOT.toString('utf8').replace('value="OK"', 'value="OVERFLOW"')
    );
    expect(t.overflow).toBe(true);
  });

  test("a service error inside a 200 is an error, with the service's words", () => {
    const doc = `<?xml version="1.0"?><VOTABLE><RESOURCE type="results"><INFO name="QUERY_STATUS" value="ERROR">Incorrect ADQL query: unknown table</INFO></RESOURCE></VOTABLE>`;
    let caught;
    try {
      parseVotable(doc);
    } catch (err) {
      caught = err;
    }
    expect(caught.code).toBe('serviceError');
    expect(caught.detail.said).toMatch(/unknown table/);
  });

  test('what it cannot read is refused by name', () => {
    const ok = EPPHOT.toString('utf8');
    const cases = {
      malformed: ok.slice(0, ok.length / 2),
      notVotable: '<?xml version="1.0"?><html><body>Maintenance</body></html>',
      serialization: ok.replace(
        /<DATA>[\s\S]*<\/DATA>/,
        '<DATA><BINARY2><STREAM encoding="base64">AAAA</STREAM></BINARY2></DATA>'
      ),
      rowWidth: ok.replace(/<TR>(\s*<TD>[^<]*<\/TD>)/, '<TR>$1$1'),
      noFields:
        '<?xml version="1.0"?><VOTABLE><RESOURCE><TABLE><DATA><TABLEDATA/></DATA></TABLE></RESOURCE></VOTABLE>',
      noData:
        '<?xml version="1.0"?><VOTABLE><RESOURCE><TABLE><FIELD name="a" datatype="int"/></TABLE></RESOURCE></VOTABLE>',
      tables:
        '<?xml version="1.0"?><VOTABLE><RESOURCE><TABLE/><TABLE/></RESOURCE></VOTABLE>',
      doctype:
        '<?xml version="1.0"?><!DOCTYPE VOTABLE><VOTABLE><RESOURCE><TABLE><FIELD name="a" datatype="char"/><DATA><TABLEDATA><TR><TD>x</TD></TR></TABLEDATA></DATA></TABLE></RESOURCE></VOTABLE>',
    };
    for (const [c, doc] of Object.entries(cases)) {
      expect(() => parseVotable(doc)).toThrow(
        expect.objectContaining({ code: c })
      );
    }
  });

  test('an entity naming a local file brings back nothing: the DOCTYPE is refused first', () => {
    const doc = `<?xml version="1.0"?><!DOCTYPE VOTABLE [<!ENTITY x SYSTEM "file:///etc/passwd">]><VOTABLE><RESOURCE><TABLE><FIELD name="a" datatype="char"/><DATA><TABLEDATA><TR><TD>&x;</TD></TR></TABLEDATA></DATA></TABLE></RESOURCE></VOTABLE>`;
    expect(() => parseVotable(doc)).toThrow(
      expect.objectContaining({
        code: expect.stringMatching(/^(doctype|malformed)$/),
      })
    );
  });

  test('a long keeps its digits: rounded by Number(), a Gaia source id is another star', () => {
    expect(String(Number(SU_DRA))).toBe('1058066262817534300'); // the trap
    const doc = `<?xml version="1.0"?><VOTABLE><RESOURCE><TABLE><FIELD name="Source" datatype="long"/><DATA><TABLEDATA><TR><TD>${SU_DRA}</TD></TR><TR><TD>12x</TD></TR></TABLEDATA></DATA></TABLE></RESOURCE></VOTABLE>`;
    expect(parseVotable(doc).rows).toEqual([[SU_DRA], [null]]);
  });

  test('a number the datatype cannot hold is null, never NaN or zero', () => {
    const doc = `<?xml version="1.0"?><VOTABLE><RESOURCE><TABLE><FIELD name="a" datatype="double"/><DATA><TABLEDATA><TR><TD>NaN</TD></TR><TR><TD>1e999</TD></TR><TR><TD/></TR><TR><TD>2.5</TD></TR></TABLEDATA></DATA></TABLE></RESOURCE></VOTABLE>`;
    expect(parseVotable(doc).rows).toEqual([[null], [null], [null], [2.5]]);
  });
});

// --- Names, sources, queries -----------------------------------------------------

describe('CDS: a name, a cone, an epoch query', () => {
  test('Sesame puts SU Dra where SIMBAD does, and says what it is', async () => {
    const f = fakeFetch(
      response(SESAME, { type: 'text/plain', url: `${cds.SESAME}?SU%20Dra` })
    );
    const r = await cds.resolveName('SU Dra', { fetchImpl: f });
    expect(r).toMatchObject({
      ra: 174.48586303,
      dec: 67.32973892,
      otype: 'RR*',
    });
    expect(f.calls[0].url).toBe(`${cds.SESAME}?SU%20Dra`);
  });

  test('a name Sesame does not know, or a position out of range, is null', async () => {
    const none =
      '<?xml version="1.0"?><Sesame><Target><name>zzz</name><INFO>*** Nothing found ***</INFO></Target></Sesame>';
    expect(
      await cds.resolveName('zzz', {
        fetchImpl: fakeFetch(
          response(none, { type: 'text/xml', url: cds.SESAME })
        ),
      })
    ).toBeNull();
    const bad =
      '<Sesame><Target><Resolver><jradeg>400</jradeg><jdedeg>0</jdedeg></Resolver></Target></Sesame>';
    expect(
      await cds.resolveName('x', {
        fetchImpl: fakeFetch(
          response(bad, { type: 'text/xml', url: cds.SESAME })
        ),
      })
    ).toBeNull();
  });

  test("the reader's text reaches Sesame only, and URL-encoded", async () => {
    const f = fakeFetch(
      response(SESAME, { type: 'text/plain', url: cds.SESAME })
    );
    const typed = "x' OR 1=1 --";
    await cds.resolveName(typed, { fetchImpl: f });
    const sent = new URL(f.calls[0].url);
    expect(sent.origin).toBe('https://cds.unistra.fr');
    // Encoded, and whole: Sesame receives exactly what was typed.
    expect(sent.search).not.toMatch(/[ =]/);
    expect(decodeURIComponent(sent.search.slice(1))).toBe(typed);
    expect(() => cds.coneQuery({ ra: "1'", dec: 2 })).toThrow(TypeError);
    expect(() => cds.epochQuery('1 OR 1=1')).toThrow(TypeError);
  });

  test('the cone is 2″ and five rows, built from numbers', async () => {
    const table = `<?xml version="1.0"?><VOTABLE><RESOURCE><INFO name="QUERY_STATUS" value="OK"/><TABLE>
<FIELD name="Source" datatype="long"/><FIELD name="RA_ICRS" datatype="double"/><FIELD name="DE_ICRS" datatype="double"/><FIELD name="Gmag" datatype="double"/><FIELD name="VarFlag" datatype="char" arraysize="*"/>
<DATA><TABLEDATA><TR><TD>2</TD><TD>1</TD><TD>1</TD><TD>15.1</TD><TD>NOT_AVAILABLE</TD></TR><TR><TD>${SU_DRA}</TD><TD>174.4855</TD><TD>67.3299</TD><TD>9.54</TD><TD>VARIABLE</TD></TR></TABLEDATA></DATA></TABLE></RESOURCE></VOTABLE>`;
    const f = fakeFetch(response(table));
    const got = await cds.gaiaSourcesAt(
      { ra: 174.48586303, dec: 67.32973892 },
      { fetchImpl: f }
    );
    expect(got.sources.map(s => s.source)).toEqual([SU_DRA, '2']); // brightest first
    expect(got.sources[0].variable).toBe(true);
    const url = new URL(f.calls[0].url);
    expect(url.searchParams.get('MAXREC')).toBe('5');
    expect(url.searchParams.get('QUERY')).toMatch(
      /CIRCLE\('ICRS', 174\.48586303, 67\.32973892, 0\.000555/
    );
  });

  test('the content digest is the one three engines computed live, and ignores the self-dating', async () => {
    // VizieR's answer carries request_date and a fresh TABLE name.
    const again = Buffer.from(
      EPPHOT.toString('utf8')
        .replace(
          /request_date' value='[^']*'/,
          "request_date' value='2027-01-01 00:00:00'"
        )
        .replace(/<TABLE name="[^"]*"/, '<TABLE name="result_S1"')
    );
    const { answer: a } = await cds.tapQuery('q', {
      maxrec: 1,
      fetchImpl: fakeFetch(response(EPPHOT)),
    });
    const { answer: b } = await cds.tapQuery('q', {
      maxrec: 1,
      fetchImpl: fakeFetch(response(again)),
    });
    expect(a.contentSha256).toBe(SU_DRA_CONTENT);
    expect(b.contentSha256).toBe(SU_DRA_CONTENT);
    expect(a.sha256).toBe(await sha256Hex(EPPHOT));
    expect(a.sha256).not.toBe(b.sha256);
  });
});

// --- The conversion ----------------------------------------------------------------

describe('Gaia DR3 epoch photometry as a gravitas.observation/1', () => {
  let answer;
  beforeAll(async () => {
    ({ answer } = await cds.gaiaEpochs(SU_DRA, {
      fetchImpl: fakeFetch(response(EPPHOT)),
      now: () => Date.parse('2026-09-26T04:40:20Z'),
    }));
  });
  const object = { name: 'SU Dra', ra: 174.48586303, dec: 67.32973892 };

  test('the workspace accepts it, saves it and reads it back whole', async () => {
    const { validateObservation } = await import('../js/observatory/schema.js');
    const { observationJson } = await import('../js/observatory/export.js');
    const { read } = await import('../js/observatory/import.js');
    for (const band of BANDS) {
      const o = toObservation(answer, { source: SU_DRA, band, object });
      expect(validateObservation(o)).toEqual([]);
      const back = read(observationJson(o, { source: o, changes: [] }));
      expect(back.ok).toBe(true);
      expect(back.observation.source.retrieval).toEqual(o.source.retrieval);
      expect(back.observation.license.status).toBe('CC BY-NC 3.0 IGO');
      expect(Array.from(back.observation.columns[1].values)).toEqual(
        o.columns[1].values
      );
    }
  });

  test('it carries where it came from, when, both checksums, the credit and every step', () => {
    const o = toObservation(answer, { source: SU_DRA, object });
    expect(o.id).toBe(
      `import:gaia-dr3-${SU_DRA}-G@${SU_DRA_CONTENT.slice(0, 12)}`
    );
    expect(o.origin).toBe('observed');
    expect(o.source).toMatchObject({ kind: 'import', version: '2026-09-26' });
    expect(o.source.retrieval).toMatchObject({
      bytes: EPPHOT.length,
      contentSha256: SU_DRA_CONTENT,
      rows: 47,
      overflow: false,
    });
    expect(new URL(o.source.retrieval.url).origin).toBe(
      'https://tapvizier.cds.unistra.fr'
    );
    expect(o.retrieved).toBe('2026-09-26T04:40:20.000Z');
    expect(o.credit).toMatch(/ESA\/Gaia\/DPAC/);
    expect(o.citations[0].url).toBe(
      'https://doi.org/10.1051/0004-6361/202243940'
    );
    expect(o.time).toEqual({ column: 'time', format: 'BJD', scale: 'TDB' });
    expect(o.object.frame).toBe('ICRS');
    expect(o.reductions.join(' ')).toMatch(/TCB.*TDB/);
  });

  test('the series is the star: its period comes back from 47 epochs over 902 days', () => {
    const o = toObservation(answer, { source: SU_DRA });
    const [T, M] = [o.columns[0].values, o.columns[1].values];
    const length = P => {
      const ph = T.map((t, i) => [(((t / P) % 1) + 1) % 1, M[i]]).sort(
        (a, b) => a[0] - b[0]
      );
      let s = 0;
      for (let i = 1; i < ph.length; i++)
        s += Math.hypot(ph[i][0] - ph[i - 1][0], ph[i][1] - ph[i - 1][1]);
      return s;
    };
    let best = [Infinity, 0];
    for (let P = 0.3; P < 1.2; P += 2e-6) {
      const s = length(P);
      if (s < best[0]) best = [s, P];
    }
    // Monson et al. 2017 (AJ 153, 96): 0.66042001 d. The su-dra-tess-s15
    // pack's fit to TESS sector 15: 0.660408 d.
    expect(Math.abs(best[1] - 0.66042)).toBeLessThan(3e-5);
    expect(T.every((t, i) => i === 0 || t >= T[i - 1])).toBe(true);
    expect(M.every(m => m > 9 && m < 10.2)).toBe(true);
  });

  test('G has errors from the flux; BP and RP have none, and say so', () => {
    const g = toObservation(answer, { source: SU_DRA, band: 'G' });
    expect(g.columns[2]).toMatchObject({
      role: 'uncertainty',
      of: 'mag',
      unit: 'mag',
    });
    expect(g.columns[2].values.every(e => e > 0 && e < 0.01)).toBe(true);
    for (const band of ['BP', 'RP']) {
      const o = toObservation(answer, { source: SU_DRA, band });
      expect(o.columns).toHaveLength(2);
      expect(o.columns[0].values).toHaveLength(43);
      expect(o.reductions.join(' ')).toMatch(new RegExp(`No ${band} errors`));
      expect(o.reductions[0]).toMatch(/43 of 47 rows \(4 without/);
    }
  });

  test('mixed units: a unit the service states that the descriptor does not expect stops it', () => {
    const withUnit = (name, unit) => ({
      ...answer,
      table: {
        ...answer.table,
        fields: answer.table.fields.map(f =>
          f.name === name ? { ...f, unit } : f
        ),
      },
    });
    for (const [name, unit] of [
      ['Gmag', 'mJy'],
      ['TimeG', 's'],
      ['FG', 'W/m2/nm'],
      ['e_FG', 'mag'],
    ]) {
      expect(() =>
        toObservation(withUnit(name, unit), { source: SU_DRA })
      ).toThrow(UnitError);
    }
    // The data model's own unit is accepted when a service does state it.
    expect(() =>
      toObservation(withUnit('FG', 'e-/s'), { source: SU_DRA })
    ).not.toThrow();
  });

  test('an answer that stopped at MAXREC says it is not every epoch', () => {
    const o = toObservation(
      { ...answer, table: { ...answer.table, overflow: true } },
      { source: SU_DRA }
    );
    expect(o.source.retrieval.overflow).toBe(true);
    expect(o.reductions.join(' ')).toMatch(/not every epoch/);
  });

  test('TCB to TDB is IAU 2006 B3: 11.25 s at J2000, 19.08 s in 2016', () => {
    const s = jd => (jd - tcbToTdb(jd)) * 86400;
    expect(Math.abs(s(2451545.0) - 11.2537)).toBeLessThan(1e-3);
    expect(Math.abs(s(2457389.0) - 19.083)).toBeLessThan(1e-3);
  });
});

// --- The cache ---------------------------------------------------------------------

describe('a cached answer never pretends to be a new one', () => {
  const bytes = n => new Uint8Array([n]);
  const identify = async b => `id${b[0]}`;

  test('a fresh copy is used as it is, and the network is not asked', async () => {
    const store = memoryStore();
    let now = 0;
    await cachedFetch('q', async () => ({ bytes: bytes(1), url: 'u' }), {
      store,
      identify,
      now: () => now,
    });
    now = 3600_000;
    let asked = false;
    const r = await cachedFetch(
      'q',
      async () => ((asked = true), { bytes: bytes(1), url: 'u' }),
      {
        store,
        identify,
        now: () => now,
      }
    );
    expect(r).toMatchObject({ from: 'cache', stale: false, ageMs: 3600_000 });
    expect(asked).toBe(false);
  });

  test('an old copy is refreshed, and a changed content is marked changed', async () => {
    const store = memoryStore();
    let now = 0;
    await cachedFetch('q', async () => ({ bytes: bytes(1), url: 'u' }), {
      store,
      identify,
      now: () => now,
    });
    now = 8 * 86_400_000;
    const same = await cachedFetch(
      'q',
      async () => ({ bytes: bytes(1), url: 'u' }),
      { store, identify, now: () => now }
    );
    expect(same).toMatchObject({ from: 'network', changed: false });
    now *= 2;
    const moved = await cachedFetch(
      'q',
      async () => ({ bytes: bytes(2), url: 'u' }),
      { store, identify, now: () => now }
    );
    expect(moved.changed).toBe(true);
    expect(moved.previous.identity).toBe('id1');
  });

  test('an old copy, with the archive down, is offered as stale with its age and why', async () => {
    const store = memoryStore();
    let now = 0;
    await cachedFetch('q', async () => ({ bytes: bytes(1), url: 'u' }), {
      store,
      identify,
      now: () => now,
    });
    now = 30 * 86_400_000;
    const down = Object.assign(new Error('down'), { code: 'unavailable' });
    const r = await cachedFetch(
      'q',
      async () => {
        throw down;
      },
      { store, identify, now: () => now }
    );
    expect(r).toMatchObject({
      from: 'cache',
      stale: true,
      ageMs: 30 * 86_400_000,
    });
    expect(r.error.code).toBe('unavailable');
  });

  test("the reader's Cancel is not answered with a stale copy", async () => {
    const store = memoryStore();
    let now = 0;
    await cachedFetch('q', async () => ({ bytes: bytes(1), url: 'u' }), {
      store,
      identify,
      now: () => now,
    });
    now = 30 * 86_400_000;
    const canceled = Object.assign(new Error('canceled'), {
      code: 'canceled',
    });
    await rejectsWith(
      cachedFetch(
        'q',
        async () => {
          throw canceled;
        },
        { store, identify, now: () => now }
      ),
      'canceled'
    );
  });

  test('no copy and no archive is an error, and a broken store is an empty one', async () => {
    const broken = {
      get: async () => {
        throw new Error('quota');
      },
      set: async () => {
        throw new Error('quota');
      },
    };
    await rejectsWith(
      cachedFetch(
        'q',
        async () => {
          throw Object.assign(new Error('x'), { code: 'blocked' });
        },
        { store: broken, identify }
      ),
      'blocked'
    );
    const r = await cachedFetch(
      'q',
      async () => ({ bytes: bytes(3), url: 'u' }),
      { store: broken, identify }
    );
    expect(r.from).toBe('network');
  });

  test('an epoch answer from the cache carries the time it was retrieved, not now', async () => {
    const store = memoryStore();
    const t0 = Date.parse('2026-09-20T00:00:00Z');
    const first = await cds.gaiaEpochs(SU_DRA, {
      store,
      now: () => t0,
      fetchImpl: fakeFetch(response(EPPHOT)),
    });
    expect(first.cache.from).toBe('network');
    const f = fakeFetch(response(EPPHOT));
    const later = await cds.gaiaEpochs(SU_DRA, {
      store,
      now: () => t0 + 2 * 86_400_000,
      fetchImpl: f,
    });
    expect(f.calls).toHaveLength(0);
    expect(later.cache).toMatchObject({
      from: 'cache',
      stale: false,
      ageMs: 2 * 86_400_000,
    });
    expect(later.answer.retrieved).toBe('2026-09-20T00:00:00.000Z');
    expect(later.answer.contentSha256).toBe(SU_DRA_CONTENT);
  });

  test('a name looked up before resolves offline, and Sesame’s timings are not a change', async () => {
    const store = memoryStore();
    const t0 = Date.parse('2026-09-20T00:00:00Z');
    await cds.resolveName('SU Dra', {
      store,
      now: () => t0,
      fetchImpl: fakeFetch(
        response(SESAME, { type: 'text/plain', url: cds.SESAME })
      ),
    });
    // Old, and the network gone: the stale position, said to be stale.
    const offline = fakeFetch(() =>
      Promise.reject(new TypeError('Failed to fetch'))
    );
    const stale = await cds.resolveName('SU Dra', {
      store,
      now: () => t0 + 30 * 86_400_000,
      fetchImpl: offline,
    });
    expect(stale).toMatchObject({ ra: 174.48586303, dec: 67.32973892 });
    expect(stale.cache).toMatchObject({ from: 'cache', stale: true });
    expect(stale.cache.error.code).toBe('blocked');
    // Old, and back: Sesame's answer says how long each resolver took, so the
    // bytes differ; the position does not, so nothing changed.
    const retimed = Buffer.from(
      SESAME.toString('utf8').replace(/delay: \d+ms/, 'delay: 4ms')
    );
    const back = await cds.resolveName('SU Dra', {
      store,
      now: () => t0 + 31 * 86_400_000,
      fetchImpl: fakeFetch(
        response(retimed, { type: 'text/plain', url: cds.SESAME })
      ),
    });
    expect(back.cache).toMatchObject({ from: 'network', changed: false });
  });
});

// --- The reader's words ---------------------------------------------------------------

describe("every failure has words in both of the page's languages", () => {
  test('each code names a message the English and Spanish catalogs both hold', async () => {
    // errorMessage is pure: a translator that records the id is enough.
    const { errorMessage } = await import('../js/observatory/archivePanel.js');
    const { EN_ARCHIVE } = await import('../js/i18n/en.archive.js');
    const { ES_ARCHIVE } = await import('../js/i18n/es.archive.js');
    expect(Object.keys(ES_ARCHIVE).sort()).toEqual(
      Object.keys(EN_ARCHIVE).sort()
    );
    const codes = [
      'blocked',
      'timeout',
      'rateLimited',
      'unavailable',
      'refused',
      'tooLarge',
      'wrongType',
      'offList',
      'canceled',
      'serviceError',
      'units',
      'malformed',
      'doctype',
      'notVotable',
      'tables',
      'serialization',
      'noFields',
      'noData',
      'rowWidth',
      'something-new',
    ];
    for (const c of codes) {
      const ids = [];
      errorMessage(
        {
          code: c,
          detail: { retryAfter: c === 'rateLimited' ? '5' : undefined },
        },
        id => (ids.push(id), id)
      );
      expect(ids).toHaveLength(1);
      expect(EN_ARCHIVE[ids[0]]).toBeDefined();
    }
  });
});
