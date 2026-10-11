// The in-process measurements of THRESHOLDS.md: U1, U3 (scan, adapters), U4, U5,
// U7, U9 and V. Writes spike/ai/results-process.json. Run from the repository
// root: node spike/ai/run-gate.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { transformSync } from 'esbuild';

import { corpus } from './corpus.mjs';
import { SCRIPTS } from './scripts.mjs';
import { startStandin } from './standin.mjs';
import {
  ALLOW_FIELDS,
  ADAPTERS,
  USES,
  accept,
  enabled,
  numberProblems,
  propose,
  requestFor,
} from './assist.js';
import { digest } from '../../js/composer/compile.js';
import { validateInvestigationPack } from '../../js/platform/investigation.js';
import { packApi } from '../../js/composer/api.js';

const results = {};
const J = JSON.stringify;
const on = { getItem: k => (k === 'gravitas_assist' ? '1' : null) };

// A student's saved state, present in the same browser while an instructor
// builds a request. Unique tokens, so a leak is a substring match.
const FIXTURE = {
  name: 'ZQX-STUDENT-NAME-7731',
  response: 'ZQX-STUDENT-ANSWER-4419',
  hintLog: 'ZQX-HINT-LOG-9902',
  notebook: 'ZQX-NOTEBOOK-3358',
};
const store = {
  ...on,
  gravitas_student: J(FIXTURE),
  length: 1,
};
globalThis.localStorage = store;
globalThis.sessionStorage = store;

const c = await corpus();
const packOf = new Map(c.packs.map(p => [p.id, p.pack]));
const CORP = { hint: c.H, spanish: c.S, distractor: c.D };
results.corpus = {
  packs: c.packs.length,
  H: c.H.length,
  S: c.S.length,
  D: c.D.length,
};

// -------------------------------------------------------------------- U1
{
  const out = {};
  for (const use of USES) {
    let leaked = 0;
    let badKeys = 0;
    let n = 0;
    for (const row of CORP[use]) {
      const pack = packOf.get(row.pack);
      const { request } = requestFor(use, pack, row.path, { en: row.en }, [
        String(pack.title?.en ?? ''),
      ]);
      n++;
      const body = J(request);
      if (Object.values(FIXTURE).some(t => body.includes(t))) leaked++;
      if (Object.keys(request).some(k => !ALLOW_FIELDS.includes(k))) badKeys++;
    }
    out[use] = { requests: n, leaked, outsideAllowList: badKeys };
  }
  // The same, through the wire: what the stand-in was actually sent.
  const s = await startStandin();
  let wire = 0;
  let wireLeak = 0;
  for (const use of USES) {
    for (const row of CORP[use].filter((_, i) => i % 40 === 0)) {
      s.plan({ text: 'Check the units of the axes.' });
      await propose({
        store: on,
        fetchImpl: fetch,
        endpoint: { url: s.url, adapter: 'chat' },
        use,
        pack: packOf.get(row.pack),
        path: row.path,
        text: { en: row.en },
        step: { kind: 'choice', options: ['a', 'b'], answer: 0 },
      });
    }
  }
  for (const b of s.state.seen) {
    wire++;
    if (Object.values(FIXTURE).some(t => b.includes(t))) wireLeak++;
  }
  await s.close();
  out.wire = { bodies: wire, leaked: wireLeak };
  results.U1 = out;
}

// -------------------------------------------------------------------- U3
{
  const src = readFileSync(new URL('./assist.js', import.meta.url), 'utf8');
  const host =
    src.match(
      /https?:\/\/[^\s'"`)]+|\b[a-z0-9-]+\.(com|org|net|io|ai|dev|app|cloud)\b/gi
    ) || [];
  const keys =
    src.match(
      /\bsk-[A-Za-z0-9]{8,}|AIza[0-9A-Za-z_-]{10,}|\bBearer\b|api[_-]?key/gi
    ) || [];
  const vendors =
    src.match(
      /openai|anthropic|claude|gpt-?\d|gemini|llama|mistral|cohere|azure|bedrock|huggingface|ollama|deepseek|perplexity/gi
    ) || [];
  results.U3 = {
    hostnames: host.length,
    keys: keys.length,
    vendors: vendors.length,
    adapters: Object.keys(ADAPTERS).length,
    bytes: src.length,
  };
  const s = await startStandin();
  const shapes = {};
  for (const adapter of ['chat', 'plain']) {
    s.plan({ shape: adapter, text: 'Check the units of the axes.' });
    const rec = await propose({
      store: on,
      fetchImpl: fetch,
      endpoint: { url: s.url, adapter },
      use: 'hint',
      pack: c.packs[0].pack,
      path: 'steps[0].hints',
      text: { en: 'x' },
      step: { kind: 'numeric', answer: 8, tolerance: 0.4 },
    });
    shapes[adapter] = !!rec && rec.provenance.model === 'standin-1';
  }
  await s.close();
  results.U3.shapesWorking = shapes;
}

// ---------------------------------------------------------- U4, U5, U7
const stepFor = (use, spec) => spec.step;
const api = packApi();
{
  const s = await startStandin();
  const U4 = {};
  const accepted = [];
  let wrong = 0;
  for (const use of USES) {
    let right = 0;
    const misses = [];
    for (const spec of SCRIPTS[use]) {
      s.plan({ text: spec.reply });
      const pack = c.packs[0].pack;
      const before = J(pack);
      const rec = await propose({
        store: on,
        fetchImpl: fetch,
        endpoint: { url: s.url, adapter: 'chat' },
        use,
        pack,
        path: 'title',
        text: { en: spec.en ?? 'Reading an orbit' },
        step: stepFor(use, spec),
      });
      const ok =
        spec.expect === 'accept' ? !!rec && rec.draft === true : rec === null;
      if (J(pack) !== before) wrong++;
      if (ok) right++;
      else misses.push(spec.label);
      if (rec) accepted.push({ use, rec, spec });
    }
    U4[use] = { scripted: SCRIPTS[use].length, classifiedRight: right, misses };
  }
  results.U4 = { scripted: U4, packMutatedByPropose: wrong };

  // accept and reject, byte for byte, over the corpus
  const diffPaths = (a, b, p = '', out = []) => {
    if (
      typeof a !== typeof b ||
      a === null ||
      b === null ||
      typeof a !== 'object'
    ) {
      if (a !== b) out.push(p);
      return out;
    }
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)]))
      diffPaths(a[k], b[k], p ? `${p}.${k}` : k, out);
    return out;
  };
  const acc = {};
  for (const use of USES) {
    let exact = 0;
    let n = 0;
    let inputTouched = 0;
    for (const row of CORP[use].filter((_, i) => i % 5 === 0)) {
      const pack = packOf.get(row.pack);
      const before = J(pack);
      const rec = {
        use,
        path: row.path,
        text: 'A reviewed draft text.',
        sourceDigest: digest(row.en),
        provenance: {
          promptVersion: 'p120-1',
          promptDigest: 'x',
          model: 'm',
          params: {},
          at: 't',
        },
      };
      const out = accept(pack, rec);
      if (J(pack) !== before) inputTouched++;
      const changed = diffPaths(pack, out).map(p =>
        p.replace(/\[(\d+)\]/g, '.$1')
      );
      const base = row.path.replace(/\[(\d+)\]/g, '.$1');
      const want =
        use === 'spanish'
          ? new Set([`${base}.es`, `${base}.esOf`])
          : new Set([`${base}.en`, `${base}.es`, `${base}.esOf`]);
      const got = new Set(changed.filter(p => !p.startsWith('drafted')));
      const wantRel = [...want].filter(p => {
        // a text with no `es` or `esOf` before cannot lose them
        return diffPaths(pack, out)
          .map(q => q.replace(/\[(\d+)\]/g, '.$1'))
          .includes(p);
      });
      const ok =
        wantRel.length === got.size &&
        [...got].every(p => want.has(p)) &&
        changed.some(p => p.startsWith('drafted'));
      n++;
      if (ok) exact++;
    }
    acc[use] = {
      checked: n,
      exactlyOneTextChanged: exact,
      inputPackTouched: inputTouched,
    };
  }
  results.U4.accept = acc;

  // the validator on an accepted pack: the draft text itself, then the provenance
  const valid = {};
  for (const use of USES) {
    const row = CORP[use].find((_, i) => i > 3);
    const pack = packOf.get(row.pack);
    const rec = {
      use,
      path: row.path,
      text: 'A reviewed draft text.',
      sourceDigest: digest(row.en),
      provenance: {
        promptVersion: 'p120-1',
        promptDigest: 'x',
        model: 'm',
        params: {},
        at: 't',
      },
    };
    const out = accept(pack, rec);
    const baseline = validateInvestigationPack(pack, api).length;
    const noProv = JSON.parse(J(out));
    delete noProv.drafted;
    const withText = validateInvestigationPack(noProv, api).length;
    const withProv = validateInvestigationPack(out, api).map(
      e => `${e.path} ${e.code}`
    );
    // provenance inside the text object instead
    const inText = JSON.parse(J(noProv));
    const keys = row.path.match(/[^.[\]]+/g);
    let node = inText;
    for (const k of keys.slice(0, -1)) node = node[k];
    node[keys.at(-1)].drafted = rec.provenance;
    const inTextErr = validateInvestigationPack(inText, api).map(
      e => `${e.path} ${e.code}`
    );
    valid[use] = {
      errorsBefore: baseline,
      errorsAfterTextOnly: withText,
      provenanceAtTopLevelRefused: withProv.includes('drafted unknownField'),
      provenanceInTextRefused: inTextErr.some(x => /drafted/.test(x)),
    };
  }
  results.U4.validator = valid;

  // U5: determinism and provenance
  let det = 0;
  let n5 = 0;
  for (const use of USES)
    for (const row of CORP[use].filter((_, i) => i % 7 === 0)) {
      const pack = packOf.get(row.pack);
      const a = requestFor(use, pack, row.path, { en: row.en }, ['ctx']);
      const b = requestFor(use, pack, row.path, { en: row.en }, ['ctx']);
      n5++;
      if (J(a) === J(b)) det++;
    }
  const need = ['promptVersion', 'promptDigest', 'model', 'params', 'at'];
  const full = accepted.filter(({ rec }) =>
    need.every(
      k => rec.provenance[k] !== undefined && rec.provenance[k] !== null
    )
  ).length;
  results.U5 = {
    promptsBuiltTwice: n5,
    identical: det,
    acceptedDrafts: accepted.length,
    withAllFive: full,
  };

  // U9: the count shown before a call
  const shown = {};
  for (const use of USES) {
    const row = CORP[use][3];
    const r = requestFor(use, packOf.get(row.pack), row.path, { en: row.en });
    shown[use] =
      Number.isInteger(r.chars) && r.chars === r.prompt.length && r.chars > 0;
  }
  results.U9 = {
    charCountShown: shown,
    projectHeldEndpoints: results.U3.hostnames,
  };

  // U7: eight failure modes, three uses
  const dead = await startStandin();
  const deadUrl = dead.url;
  await dead.close();
  const modes = {
    timeout: { plan: { text: 'Check the axes.', delay: 1500 }, timeoutMs: 100 },
    http500: { plan: { status: 500, raw: '{"error":"x"}' } },
    networkError: { plan: null, url: deadUrl },
    nonJson: { plan: { raw: 'this is not json' } },
    emptyBody: { plan: { raw: '' } },
    oversize: {
      plan: {
        raw: J({ choices: [{ message: { content: 'x'.repeat(9000) } }] }),
      },
    },
    refusedByChecks: {
      plan: { text: 'The answer is 4.2 and <script>x</script>' },
    },
    abort: { plan: { text: 'Check the axes.', delay: 500 }, abortAfter: 30 },
  };
  const U7 = {};
  let silent = 0;
  let total = 0;
  const disabled = await propose({
    store: {},
    fetchImpl: fetch,
    endpoint: { url: s.url, adapter: 'chat' },
    use: 'hint',
    pack: c.packs[0].pack,
    path: 'title',
    text: { en: 'x' },
  });
  for (const [name, m] of Object.entries(modes)) {
    U7[name] = {};
    for (const use of USES) {
      s.plan(m.plan);
      const pack = c.packs[0].pack;
      const before = J(pack);
      const ctl = new AbortController();
      if (m.abortAfter) setTimeout(() => ctl.abort(), m.abortAfter);
      let value;
      let threw = false;
      try {
        value = await propose({
          store: on,
          fetchImpl: fetch,
          endpoint: { url: m.url || s.url, adapter: 'chat' },
          use,
          pack,
          path: 'title',
          text: { en: 'Reading an orbit' },
          step: SCRIPTS[use][0].step,
          timeoutMs: m.timeoutMs,
          signal: ctl.signal,
        });
      } catch {
        threw = true;
      }
      const ok = !threw && value === disabled && J(pack) === before;
      total++;
      if (ok) silent++;
      U7[name][use] = ok;
    }
  }
  await s.close();
  results.U7 = { disabledValue: disabled, silent, total, modes: U7 };
}

// ---------------------------------------------------------------- U6 (part)
{
  const bad = {
    getItem() {
      throw new Error('storage');
    },
  };
  results.U6 = {
    freshStorageDisabled: enabled({ getItem: () => null }) === false,
    undefinedStoreDisabled: enabled(undefined) === false,
    throwingStoreDisabled: enabled(bad) === false,
    gzipSourceBytes: gzipSync(
      readFileSync(new URL('./assist.js', import.meta.url))
    ).length,
    gzipMinifiedBytes: gzipSync(
      transformSync(
        readFileSync(new URL('./assist.js', import.meta.url), 'utf8'),
        { minify: true, format: 'esm' }
      ).code
    ).length,
  };
}

// --------------------------------------------------------------------- V
{
  const V = {};
  for (const use of USES) {
    let pass = 0;
    let digits = 0;
    let words = 0;
    for (const row of CORP[use]) {
      const probs =
        use === 'spanish'
          ? numberProblems(row.es, row.en)
          : numberProblems(row.en, null);
      if (!probs.length) pass++;
      else if (
        probs.some(p =>
          /states a number \(|adds a number|changes a number/.test(p)
        )
      )
        digits++;
      else words++;
    }
    const n = CORP[use].length;
    V[use] = {
      texts: n,
      pass,
      share: +(pass / n).toFixed(4),
      refusedForDigits: digits,
      refusedForWordsOnly: words,
    };
  }
  results.V = V;
}

writeFileSync(
  new URL('./results-process.json', import.meta.url),
  J(results, null, 2) + '\n'
);
console.log(J(results, null, 2));
