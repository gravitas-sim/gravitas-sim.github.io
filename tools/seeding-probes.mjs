// =============================================================================
// The moved seeded call sites, run against v3's own copies of them
// -----------------------------------------------------------------------------
// Test support (tests/seedingEquivalence.test.js). Prompt 149 moved the seeded
// call sites in the forward models, the noise models and the kernels onto named
// streams (js/random/streams.js) and must not change one draw. The proof runs in
// one process: tests/fixtures/seedingLegacy/ holds the ten modules as v3 had them
// at 9847b6e5 (verbatim, only the import specifiers rewritten to reach the
// unchanged modules), and every probe below is called through the legacy set and
// through the current one with thirteen kinds of seed, the odd ones included (a
// number that is not an integer, a negative one, NaN, null, undefined, the empty
// text, a word with an accent). The two answers are compared number by number
// with Object.is.
//
// Nothing here is a stored digest. Almost every probe passes through Math.log,
// Math.cos, Math.exp or Math.pow after the draw, and those are not bit-identical
// between Node versions (CI runs Node 20 and the Mac Node 24), so a hash recorded
// on one machine would fail on the other without anything having changed. The
// same Node runs both sides, so the comparison holds on any of them.
// =============================================================================

/** Seeds as a caller might hand them: raw, so each site's own keying shows. */
export const SEEDS = [
  'a',
  'kepler-3',
  'été',
  '',
  '7',
  7,
  2024,
  1.5,
  -3,
  0,
  NaN,
  null,
  undefined,
];

/** The sites as v3 had them, or as they are now. @param {'legacy'|'current'} which */
export async function loadSites(which) {
  const at =
    which === 'legacy' ? '../tests/fixtures/seedingLegacy/js' : '../js';
  const get = p => import(`${at}/${p}`);
  const [
    synthetic,
    noise,
    cosmology,
    frame,
    setup,
    classify,
    period,
    survey,
    gw,
    light,
  ] = await Promise.all([
    get('inference/synthetic.js'),
    // v3's own file; now the same function is defined in microlensing.js
    get(
      which === 'legacy'
        ? 'kernels/lensing/noise.js'
        : 'kernels/lensing/microlensing.js'
    ),
    get('kernels/cosmology/fit.js'),
    get('kernels/detector/frame.js'),
    get('forward/setup.js'),
    get('kernels/variables/classify.js'),
    get('kernels/variables/period.js'),
    get('survey/model.js'),
    get('gw/noise.js'),
    get('light/model.js'),
  ]);
  return {
    synthetic,
    noise,
    cosmology,
    frame,
    setup,
    classify,
    period,
    survey,
    gw,
    light,
  };
}

const draws = (next, n = 24) => Array.from({ length: n }, () => next());
const t = Float64Array.from({ length: 60 }, (_, i) => i * 0.37);
const y = Float64Array.from(t, x => Math.sin((2 * Math.PI * x) / 3.1));
const grid = Float64Array.from({ length: 40 }, (_, i) => 5400 + i * 5);
const scene = { sources: [{ x: 6, y: 6, flux: 4000 }] };
const detector = { width: 12, height: 12 };

/** name, seeds, and what the site returns, from a loaded set. */
export const PROBES = [
  ['inference.gaussian', SEEDS, (m, s) => draws(m.synthetic.gaussian(s))],
  ['lensing.gaussianNoise', SEEDS, (m, s) => draws(m.noise.gaussianNoise(s))],
  [
    'cosmology.syntheticHubbleDiagram',
    SEEDS,
    (m, s) => m.cosmology.syntheticHubbleDiagram({ n: 16, seed: s }),
  ],
  [
    'detector.detectorPattern',
    SEEDS,
    (m, s) => m.frame.detectorPattern(String(s), { width: 8, height: 8 }),
  ],
  [
    'detector.simulateFrame',
    SEEDS,
    (m, s) =>
      ['science', 'bias', 'dark', 'flat'].map(kind =>
        m.frame.simulateFrame({ seed: s, kind, exposure: 30, detector, scene })
      ),
  ],
  [
    'detector.simulateSeries',
    SEEDS,
    (m, s) =>
      m.frame.simulateSeries(
        { seed: s, exposure: 30, detector, scene },
        { count: 6, cadence: 0.02, period: 0.3, amplitude: 0.1 }
      ),
  ],
  [
    'forward.uniformAt',
    SEEDS,
    (m, s) => Array.from({ length: 12 }, (_, i) => m.setup.uniformAt(s, i)),
  ],
  ['variables.nightlyEpochs', SEEDS, (m, s) => m.classify.nightlyEpochs(s, 12)],
  [
    'variables.makeSample',
    ['a', 'variables-sample', 7],
    (m, s) => m.classify.makeSample({ perClass: 2, seed: s }),
  ],
  [
    'variables.bootstrapPeriod',
    SEEDS,
    (m, s) =>
      m.period.bootstrapPeriod(t, y, 3.1, { K: 2, resamples: 6, seed: s }),
  ],
  [
    'survey.makeUniverse',
    ['a', 'survey-1', 7],
    (m, s) => [
      m.survey.makeUniverse({ kind: 'population', count: 40, seed: s }),
      m.survey.makeUniverse({ kind: 'gaussian', count: 40, seed: s }),
    ],
  ],
  [
    'survey.observe',
    ['a', 'survey-1', 7],
    (m, s) =>
      m.survey.observe(
        m.survey.makeUniverse({ kind: 'gaussian', count: 60, seed: s })
      ),
  ],
  [
    'gw.coloredNoise',
    SEEDS,
    (m, s) => m.gw.coloredNoise({ samples: 128, sampleRate: 512, seed: s }),
  ],
  [
    'light.syntheticFlux',
    [0, 1, 2202, 3308, 4294967295, -5],
    (m, s) => m.light.syntheticFlux(grid, { vKmS: 50, snr: 30, seed: s }),
  ],
];

/** Every number and string a value holds, in a fixed order, for Object.is. */
export function flat(v) {
  if (v === null || v === undefined || typeof v !== 'object') return [v];
  if (ArrayBuffer.isView(v) || Array.isArray(v)) return [...v].flatMap(flat);
  return Object.keys(v)
    .sort()
    .flatMap(k => [k, ...flat(v[k])]);
}

const label = s =>
  typeof s === 'string' ? `"${s}"` : Object.is(s, -0) ? '-0' : String(s);

/**
 * Run every probe through both sets and report each case: how many numbers and
 * whether every one is Object.is-equal.
 * @returns {Promise<Array<{id: string, n: number, mismatch: string|null}>>}
 */
export async function compareSites() {
  const [legacy, current] = [
    await loadSites('legacy'),
    await loadSites('current'),
  ];
  const out = [];
  for (const [name, seeds, fn] of PROBES)
    for (const s of seeds) {
      const [a, b] = [fn(legacy, s), fn(current, s)].map(flat);
      let mismatch = null;
      if (a.length !== b.length)
        mismatch = `length ${a.length} against ${b.length}`;
      else
        for (let i = 0; i < a.length; i++)
          if (!Object.is(a[i], b[i])) {
            mismatch = `value ${i}: ${String(a[i])} against ${String(b[i])}`;
            break;
          }
      out.push({ id: `${name}(${label(s)})`, n: a.length, mismatch });
    }
  return out;
}
