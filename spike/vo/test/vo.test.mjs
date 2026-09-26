// SPIKE (Prompt 18): the failure modes, one test each.
// Run: node --test spike/vo/test/*.test.mjs
// jsdom supplies DOMParser, which a page has natively.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');
globalThis.DOMParser = new JSDOM('').window.DOMParser;

const { fetchLimited, sha256Hex } = await import('../net.js');
const { parseVotable } = await import('../votable.js');
const { resolveName, tapQuery, gaiaSourceAt, toObservation, tcbToTdb, tableDigest, ALLOW, UnitError } = await import('../archive.js');
const { cachedFetch, memoryStore } = await import('../cache.js');

const fixture = name => readFileSync(new URL(`../fixtures/${name}`, import.meta.url));
const EPPHOT = fixture('gaia-epphot-su-dra.vot');
const SESAME = fixture('sesame-su-dra.xml');
const SU_DRA = '1058066262817534336';

/** A stand-in for fetch: one response, or a function of the request. */
function fakeFetch(respond) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url: String(url), init });
    const r = typeof respond === 'function' ? await respond(String(url), init) : respond;
    return r;
  };
  impl.calls = calls;
  return impl;
}
function response(body, { status = 200, type = 'application/x-votable+xml', url = 'https://tapvizier.cds.unistra.fr/x', headers = {}, redirected = false, length = true } = {}) {
  const bytes = typeof body === 'string' ? new TextEncoder().encode(body) : new Uint8Array(body);
  const h = new Headers({ 'content-type': type, ...headers });
  if (length) h.set('content-length', String(bytes.length));
  const res = new Response(bytes, { status, headers: h });
  Object.defineProperty(res, 'url', { value: url });
  Object.defineProperty(res, 'redirected', { value: redirected });
  return res;
}
const expectCode = code => err => {
  assert.equal(err.code, code, `${err.name}: ${err.message}`);
  return true;
};

// --- the network ------------------------------------------------------------

test('an unavailable archive (HTTP 503) is named, not parsed', async () => {
  const f = fakeFetch(response('<html>down</html>', { status: 503, type: 'text/html' }));
  await assert.rejects(fetchLimited('https://tapvizier.cds.unistra.fr/q', { fetchImpl: f }), expectCode('unavailable'));
});

test('a CORS rejection is reported as blocked, and the message names both causes', async () => {
  // What a browser does when the service sends no Access-Control-Allow-Origin:
  // the same TypeError as when the network is down, by design.
  const f = fakeFetch(() => Promise.reject(new TypeError('Failed to fetch')));
  await assert.rejects(fetchLimited('https://mast.stsci.edu/q', { fetchImpl: f }), err => {
    assert.equal(err.code, 'blocked');
    assert.match(err.message, /does not allow this site/);
    assert.match(err.message, /network is down/);
    return true;
  });
});

test('no answer within the limit is a timeout', async () => {
  const f = fakeFetch((url, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))));
  await assert.rejects(fetchLimited('https://tapvizier.cds.unistra.fr/q', { fetchImpl: f, timeoutMs: 30 }), expectCode('timeout'));
});

test('rate limiting (HTTP 429) carries the Retry-After the service gave', async () => {
  const f = fakeFetch(response('slow down', { status: 429, type: 'text/plain', headers: { 'retry-after': '30' } }));
  await assert.rejects(fetchLimited('https://tapvizier.cds.unistra.fr/q', { fetchImpl: f }), err => {
    assert.equal(err.code, 'rateLimited');
    assert.equal(err.detail.retryAfter, '30');
    return true;
  });
});

test('any other refusal (HTTP 400) is refused', async () => {
  const f = fakeFetch(response('bad ADQL', { status: 400, type: 'text/plain' }));
  await assert.rejects(fetchLimited('https://tapvizier.cds.unistra.fr/q', { fetchImpl: f }), expectCode('refused'));
});

test('a huge result is refused by its declared length before a byte is read', async () => {
  const big = response(new Uint8Array(10), { length: false, headers: { 'content-length': '900000000' } });
  await assert.rejects(fetchLimited('https://tapvizier.cds.unistra.fr/q', { fetchImpl: fakeFetch(big), maxBytes: 1000 }), expectCode('tooLarge'));
});

test('a huge result with no declared length is stopped as it streams', async () => {
  const stream = new ReadableStream({
    pull(c) {
      c.enqueue(new Uint8Array(4096));
    },
  });
  const res = new Response(stream, { headers: { 'content-type': 'text/xml' } });
  Object.defineProperty(res, 'url', { value: 'https://tapvizier.cds.unistra.fr/q' });
  await assert.rejects(fetchLimited('https://tapvizier.cds.unistra.fr/q', { fetchImpl: fakeFetch(res), maxBytes: 100_000 }), err => {
    assert.equal(err.code, 'tooLarge');
    return true;
  });
});

test('an HTML error page where a table was asked for is the wrong type', async () => {
  const f = fakeFetch(response('<html><body>Maintenance</body></html>', { type: 'text/html' }));
  await assert.rejects(fetchLimited('https://tapvizier.cds.unistra.fr/q', { fetchImpl: f, accept: /votable|xml/ }), expectCode('wrongType'));
});

test('a redirect within the list is followed and recorded', async () => {
  const f = fakeFetch(response(EPPHOT, { url: 'https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync/final', redirected: true }));
  const got = await fetchLimited('https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync', { fetchImpl: f, allow: ALLOW });
  assert.equal(got.redirected, true);
  assert.equal(got.url, 'https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync/final');
});

test('a redirect that ends off the list is refused, and its body is not read', async () => {
  const f = fakeFetch(response(EPPHOT, { url: 'https://evil.example/table.vot', redirected: true }));
  await assert.rejects(fetchLimited('https://tapvizier.cds.unistra.fr/q', { fetchImpl: f, allow: ALLOW }), err => {
    assert.equal(err.code, 'offList');
    assert.equal(err.detail.finalUrl, 'https://evil.example/table.vot');
    return true;
  });
});

test('a request off the list is never sent', async () => {
  const f = fakeFetch(response(EPPHOT));
  await assert.rejects(fetchLimited('https://mast.stsci.edu/q', { fetchImpl: f, allow: ALLOW }), expectCode('offList'));
  assert.equal(f.calls.length, 0);
});

test('every request omits credentials and the referrer', async () => {
  const f = fakeFetch(response(EPPHOT));
  await fetchLimited('https://tapvizier.cds.unistra.fr/q', { fetchImpl: f });
  assert.equal(f.calls[0].init.credentials, 'omit');
  assert.equal(f.calls[0].init.referrerPolicy, 'no-referrer');
});

// --- the VOTable ------------------------------------------------------------

test('the captured epoch photometry parses: eight fields, 47 rows, status OK', () => {
  const t = parseVotable(EPPHOT.toString('utf8'));
  assert.deepEqual(
    t.fields.map(f => f.name),
    ['TimeG', 'FG', 'e_FG', 'Gmag', 'TimeBP', 'BPmag', 'TimeRP', 'RPmag']
  );
  assert.equal(t.rows.length, 47);
  assert.equal(t.status, 'OK');
  assert.equal(t.overflow, false);
  // The finding that makes a descriptor necessary: no unit on the flux.
  assert.equal(t.fields[1].unit, null);
  assert.match(t.fields[0].description, /JD-2455197\.5/);
});

test('OVERFLOW means the service stopped at MAXREC, and the table says so', () => {
  const t = parseVotable(EPPHOT.toString('utf8').replace('name="QUERY_STATUS" value="OK"', 'name="QUERY_STATUS" value="OVERFLOW"'));
  assert.equal(t.overflow, true);
});

test('a service error inside a 200 answer is an error, with the service text', () => {
  const doc = `<?xml version="1.0"?><VOTABLE xmlns="http://www.ivoa.net/xml/VOTable/v1.3"><RESOURCE type="results"><INFO name="QUERY_STATUS" value="ERROR">Incorrect ADQL query: unknown table</INFO></RESOURCE></VOTABLE>`;
  assert.throws(() => parseVotable(doc), err => err.code === 'serviceError' && /unknown table/.test(err.message));
});

test('malformed VOTables are refused by name', () => {
  const ok = EPPHOT.toString('utf8');
  const cases = {
    malformed: ok.slice(0, ok.length / 2),
    notVotable: '<?xml version="1.0"?><html><body>Maintenance</body></html>',
    serialization: ok.replace(/<DATA>[\s\S]*<\/DATA>/, '<DATA><BINARY2><STREAM encoding="base64">AAAA</STREAM></BINARY2></DATA>'),
    rowWidth: ok.replace(/<TR>(\s*<TD>[^<]*<\/TD>)/, '<TR>$1$1'),
    noFields: '<?xml version="1.0"?><VOTABLE><RESOURCE><TABLE><DATA><TABLEDATA/></DATA></TABLE></RESOURCE></VOTABLE>',
    tables: '<?xml version="1.0"?><VOTABLE><RESOURCE><TABLE/><TABLE/></RESOURCE></VOTABLE>',
  };
  for (const [code, doc] of Object.entries(cases)) {
    assert.throws(() => parseVotable(doc), err => err.code === code, code);
  }
});

test('any DOCTYPE is refused: an unresolved entity would otherwise be an empty cell', () => {
  const doc = `<?xml version="1.0"?><!DOCTYPE VOTABLE [<!ENTITY x SYSTEM "file:///etc/passwd">]><VOTABLE><RESOURCE><TABLE><FIELD name="a" datatype="char"/><DATA><TABLEDATA><TR><TD>&x;</TD></TR></TABLEDATA></DATA></TABLE></RESOURCE></VOTABLE>`;
  assert.throws(() => parseVotable(doc), err => err.code === 'doctype' || err.code === 'malformed');
  const plain = `<?xml version="1.0"?><!DOCTYPE VOTABLE><VOTABLE><RESOURCE><TABLE><FIELD name="a" datatype="char"/><DATA><TABLEDATA><TR><TD>x</TD></TR></TABLEDATA></DATA></TABLE></RESOURCE></VOTABLE>`;
  assert.throws(() => parseVotable(plain), err => err.code === 'doctype');
});

test('a long keeps its digits: a Gaia source id rounded by Number() is another star', () => {
  const doc = `<?xml version="1.0"?><VOTABLE><RESOURCE><TABLE><FIELD name="Source" datatype="long"/><DATA><TABLEDATA><TR><TD>${SU_DRA}</TD></TR></TABLEDATA></DATA></TABLE></RESOURCE></VOTABLE>`;
  assert.equal(String(Number(SU_DRA)), '1058066262817534300'); // the trap
  assert.equal(parseVotable(doc).rows[0][0], SU_DRA);
});

test('a number the datatype cannot hold is null, not NaN', () => {
  const doc = `<?xml version="1.0"?><VOTABLE><RESOURCE><TABLE><FIELD name="a" datatype="double"/><DATA><TABLEDATA><TR><TD>NaN</TD></TR><TR><TD>1e999</TD></TR><TR><TD/></TR><TR><TD>2.5</TD></TR></TABLEDATA></DATA></TABLE></RESOURCE></VOTABLE>`;
  assert.deepEqual(parseVotable(doc).rows, [[null], [null], [null], [2.5]]);
});

// --- names, discovery, conversion ------------------------------------------------

test('Sesame resolves SU Dra to SIMBAD\'s position and type', async () => {
  const f = fakeFetch(response(SESAME, { type: 'text/xml', url: 'https://cds.unistra.fr/cgi-bin/nph-sesame/-oxp/SNV?SU%20Dra' }));
  const r = await resolveName('SU Dra', { fetchImpl: f });
  assert.equal(r.ra, 174.48586303);
  assert.equal(r.dec, 67.32973892);
  assert.equal(r.otype, 'RR*');
  assert.match(f.calls[0].url, /SU%20Dra$/);
});

test('a name Sesame does not know resolves to null, not to a position', async () => {
  const f = fakeFetch(response('<?xml version="1.0"?><Sesame><Target><name>zzz</name><INFO>*** Nothing found ***</INFO></Target></Sesame>', { type: 'text/xml', url: 'https://cds.unistra.fr/x' }));
  assert.equal(await resolveName('zzz', { fetchImpl: f }), null);
});

test('the cone query is bounded and quotes nothing the reader typed', async () => {
  const table = `<?xml version="1.0"?><VOTABLE><RESOURCE><INFO name="QUERY_STATUS" value="OK"/><TABLE>
<FIELD name="Source" datatype="long"/><FIELD name="RA_ICRS" datatype="double"/><FIELD name="DE_ICRS" datatype="double"/><FIELD name="Gmag" datatype="double"/><FIELD name="VarFlag" datatype="char" arraysize="*"/>
<DATA><TABLEDATA><TR><TD>${SU_DRA}</TD><TD>174.4855</TD><TD>67.3299</TD><TD>9.54</TD><TD>VARIABLE</TD></TR></TABLEDATA></DATA></TABLE></RESOURCE></VOTABLE>`;
  const f = fakeFetch(response(table));
  const got = await gaiaSourceAt({ ra: 174.48586303, dec: 67.32973892 }, { fetchImpl: f });
  assert.equal(got.sources[0].source, SU_DRA);
  assert.equal(got.sources[0].variable, true);
  const url = new URL(f.calls[0].url);
  assert.equal(url.searchParams.get('MAXREC'), '5');
  assert.match(url.searchParams.get('QUERY'), /CIRCLE\('ICRS', 174\.48586303, 67\.32973892, 0\.000555/);
});

test('a Gaia source id is digits, or no query is sent', async () => {
  const { gaiaEpochs } = await import('../archive.js');
  const f = fakeFetch(response(EPPHOT));
  await assert.rejects(gaiaEpochs('1 OR 1=1', { fetchImpl: f }), /digits/);
  assert.equal(f.calls.length, 0);
});

async function epochs() {
  const f = fakeFetch(response(EPPHOT));
  return tapQuery('SELECT ...', { fetchImpl: f, now: () => new Date('2026-09-26T04:40:20Z') });
}

test('G epochs become a gravitas.observation/1 with every step recorded', async () => {
  const q = await epochs();
  const o = toObservation(q, { source: SU_DRA, band: 'G' });
  assert.equal(o.format, 'gravitas.observation');
  assert.equal(o.formatVersion, 1);
  assert.equal(o.source.retrieval.sha256, await sha256Hex(EPPHOT));
  assert.equal(o.source.retrieval.rows, 47);
  assert.equal(o.retrieved, '2026-09-26T04:40:20.000Z');
  assert.equal(o.license.status, 'CC BY-NC 3.0 IGO');
  assert.equal(o.time.scale, 'TDB');
  const [t, m, e] = o.columns;
  assert.equal(t.values.length, 47);
  assert.ok(t.values.every((v, i) => i === 0 || v >= t.values[i - 1]), 'sorted');
  assert.ok(t.values[0] > 2456900 && t.values.at(-1) < 2457900, 'BJD in the DR3 window');
  assert.ok(m.values.every(v => v > 9 && v < 10.2), 'an RR Lyrae near G 9.5');
  assert.equal(e.role, 'uncertainty');
  assert.ok(e.values.every(v => v > 0 && v < 0.01));
  assert.ok(o.reductions.some(r => /TCB/.test(r) && /TDB/.test(r)));
  assert.ok(o.id.endsWith(o.source.retrieval.contentSha256.slice(0, 12)));
});

test('the converted series is the star: SU Dra\'s period comes back from 47 epochs', async () => {
  const o = toObservation(await epochs(), { source: SU_DRA, band: 'G' });
  const T = o.columns[0].values;
  const M = o.columns[1].values;
  const len = P => {
    const ph = T.map((t, i) => [(((t / P) % 1) + 1) % 1, M[i]]).sort((a, b) => a[0] - b[0]);
    let s = 0;
    for (let i = 1; i < ph.length; i++) s += Math.hypot(ph[i][0] - ph[i - 1][0], ph[i][1] - ph[i - 1][1]);
    return s;
  };
  let best = [Infinity, 0];
  for (let P = 0.3; P < 1.2; P += 2e-6) {
    const s = len(P);
    if (s < best[0]) best = [s, P];
  }
  // Monson et al. 2017 (AJ 153, 96): 0.66042001 d. The su-dra-tess-s15
  // pack's own fit to TESS sector 15: 0.660408 d. Here: 0.660428 d.
  assert.ok(Math.abs(best[1] - 0.66042) < 3e-5, `best ${best[1]}`);
});

test('BP and RP carry no errors in this table, and the observation says so', async () => {
  const q = await epochs();
  for (const band of ['BP', 'RP']) {
    const o = toObservation(q, { source: SU_DRA, band });
    assert.equal(o.columns.length, 2);
    assert.equal(o.columns[0].values.length, 43);
    assert.ok(o.reductions.some(r => r.includes(`No ${band} error`)));
    assert.ok(o.reductions.some(r => /4 without/.test(r)));
  }
});

test('mixed units: a unit the descriptor does not expect stops the conversion', async () => {
  const q = await epochs();
  const withUnit = (name, unit) => {
    const fields = q.table.fields.map(f => (f.name === name ? { ...f, unit } : f));
    return { ...q, table: { ...q.table, fields } };
  };
  assert.throws(() => toObservation(withUnit('Gmag', 'mJy'), { source: SU_DRA }), UnitError);
  assert.throws(() => toObservation(withUnit('TimeG', 's'), { source: SU_DRA }), UnitError);
  assert.throws(() => toObservation(withUnit('FG', 'W/m2/nm'), { source: SU_DRA }), UnitError);
  // The unit Gaia's data model gives is accepted when a service does state it.
  assert.doesNotThrow(() => toObservation(withUnit('FG', 'e-/s'), { source: SU_DRA }));
});

test('TCB to TDB follows IAU 2006 B3: 11.25 s at J2000, 19.08 s in 2016', () => {
  const sec = jd => (jd - tcbToTdb(jd)) * 86400;
  assert.ok(Math.abs(sec(2451545.0) - 11.2537) < 1e-3);
  assert.ok(Math.abs(sec(2457389.0) - 19.083) < 1e-3);
});

// --- stale cached results ---------------------------------------------------------

test('a fresh cached answer is used as it is, and says so', async () => {
  const store = memoryStore();
  let now = 0;
  const bytes = new Uint8Array([1, 2, 3]);
  await cachedFetch('q', async () => ({ bytes, url: 'u' }), { store, now: () => now });
  now = 3600_000;
  let asked = false;
  const r = await cachedFetch('q', async () => ((asked = true), { bytes, url: 'u' }), { store, now: () => now });
  assert.equal(r.from, 'cache');
  assert.equal(r.stale, false);
  assert.equal(asked, false);
});

test('an old answer is refreshed; a changed one is marked changed, with the old checksum', async () => {
  const store = memoryStore();
  let now = 0;
  await cachedFetch('q', async () => ({ bytes: new Uint8Array([1]), url: 'u' }), { store, now: () => now });
  now = 8 * 86_400_000;
  const same = await cachedFetch('q', async () => ({ bytes: new Uint8Array([1]), url: 'u' }), { store, now: () => now });
  assert.equal(same.from, 'network');
  assert.equal(same.changed, false);
  now += 8 * 86_400_000;
  const moved = await cachedFetch('q', async () => ({ bytes: new Uint8Array([2]), url: 'u' }), { store, now: () => now });
  assert.equal(moved.changed, true);
  assert.equal(moved.previous.sha256, same.sha256);
  assert.notEqual(moved.sha256, same.sha256);
});

test('an old answer when the archive is down is offered as stale, with its age and why', async () => {
  const store = memoryStore();
  let now = 0;
  await cachedFetch('q', async () => ({ bytes: new Uint8Array([1]), url: 'u' }), { store, now: () => now });
  now = 30 * 86_400_000;
  const r = await cachedFetch(
    'q',
    async () => {
      throw Object.assign(new Error('down'), { code: 'unavailable' });
    },
    { store, now: () => now }
  );
  assert.equal(r.stale, true);
  assert.equal(r.ageMs, 30 * 86_400_000);
  assert.equal(r.error.code, 'unavailable');
});

test('no answer and no archive is an error, not an empty table', async () => {
  await assert.rejects(
    cachedFetch(
      'q',
      async () => {
        throw new Error('down');
      },
      { store: memoryStore() }
    ),
    /down/
  );
});

test('the same rows asked for again are the same observation, though the bytes differ', async () => {
  // Measured live: VizieR's answer carries request_date and a fresh TABLE
  // name, so two requests 1.5 s apart had different byte checksums.
  const again = Buffer.from(
    EPPHOT.toString('utf8')
      .replace(/request_date' value='[^']*'/, "request_date' value='2026-09-27 10:00:00'")
      .replace(/<TABLE name="[^"]*"/, '<TABLE name="result_S1"')
  );
  const a = await tapQuery('q', { fetchImpl: fakeFetch(response(EPPHOT)) });
  const b = await tapQuery('q', { fetchImpl: fakeFetch(response(again)) });
  assert.notEqual(a.sha256, b.sha256);
  assert.equal(a.contentSha256, b.contentSha256);
  assert.equal(toObservation(a, { source: SU_DRA }).id, toObservation(b, { source: SU_DRA }).id);
  // And the cache, told how to identify a table, does not call it changed.
  const store = memoryStore();
  const identify = async bytes => tableDigest(parseVotable(new TextDecoder().decode(bytes)));
  let now = 0;
  await cachedFetch('q', async () => ({ bytes: new Uint8Array(EPPHOT), url: 'u' }), { store, now: () => now, identify });
  now = 30 * 86_400_000;
  const r = await cachedFetch('q', async () => ({ bytes: new Uint8Array(again), url: 'u' }), { store, now: () => now, identify });
  assert.equal(r.from, 'network');
  assert.equal(r.changed, false);
  assert.notEqual(r.sha256, r.previous.sha256);
});

test('the fixture is the live answer: its content digest matches one Chromium computed', async () => {
  // spike/vo/evidence/live-workflow-chromium.json, 2026-09-26T04:58Z, two
  // live requests 18 minutes after the fixture was captured.
  const t = parseVotable(EPPHOT.toString('utf8'));
  assert.equal(await tableDigest(t), 'eaaa345eb58c12a3af4663b3549113c08d8a15cc10a7e7ffc8b2caec5f69da6f');
});

test('the observation is one the Observatory accepts, saves and reads back whole', async () => {
  const { validateObservation } = await import('../../../js/observatory/schema.js');
  const { observationJson } = await import('../../../js/observatory/export.js');
  const { read } = await import('../../../js/observatory/import.js');
  const o = toObservation(await epochs(), { source: SU_DRA, object: { name: 'SU Dra', ra: 174.48586303, dec: 67.32973892 } });
  assert.deepEqual(validateObservation(o), []);
  const saved = observationJson(o, { source: o, changes: [] });
  const back = read(saved);
  assert.equal(back.ok, true, JSON.stringify(back.problems));
  assert.deepEqual(back.observation.source.retrieval, o.source.retrieval);
  assert.equal(back.observation.license.status, 'CC BY-NC 3.0 IGO');
  assert.deepEqual(Array.from(back.observation.columns[0].values), o.columns[0].values);
});
