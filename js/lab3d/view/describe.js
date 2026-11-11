// =============================================================================
// "Describe the view": the 3-D lab's scene, in a few sentences
// -----------------------------------------------------------------------------
// The lab's semantic scene (the list of who orbits whom, the two tables) says
// what is in the view body by body. This says the view as a whole, on request
// (Prompt 281): the run mode with its numbers, the frame, reference plane and
// projection, where the camera is, how many bodies and which is farthest, the
// orbits' sizes, shapes and tilts, and the mutual inclination of orbits that
// share a primary. It reads the same numbers the tables do (labApi.exact()),
// never pixels, and it is bounded: at most MAX_NAMES names, MAX_ORBITS orbits
// and MAX_PAIRS pairs, then "and N more" with the table named as the place for
// the rest.
//
// A description states; it does not interpret. While a guide step is asking
// for a measurement, the orbit numbers are left out (Prompt 280's rule for
// charts, js/lesson/held.js, applied to the one panel here that holds an
// answer): they would settle the step before the reader's instrument did.
//
// Loaded on the first press of the button (js/lab3d/view/cameraPad.js), as a
// bundle of its own (build.js), so no reader of the lab pays for it unasked.
// =============================================================================

import { EN_LAB3DDESCRIBE } from '../../i18n/en.lab3dDescribe.js';
import { formatNumber } from '../../format.js';
import { elementsAbout, hierarchy, mutualInclination } from './instruments.js';

export const MAX_NAMES = 6;
export const MAX_ORBITS = 4;
export const MAX_PAIRS = 3;
const DEG = 180 / Math.PI;

const CATALOGS = { en: EN_LAB3DDESCRIBE };

/** Load a language's catalog if it is not loaded yet. */
export async function loadLanguage(id) {
  if (CATALOGS[id] || id !== 'es') return;
  CATALOGS.es = (
    await import('../../i18n/es.lab3dDescribe.js')
  ).ES_LAB3DDESCRIBE;
}

/** A translator over the loaded catalogs; a missing id falls back to English. */
export function translator(id) {
  return (key, vars = {}) =>
    (CATALOGS[id]?.[key] ?? CATALOGS.en[key] ?? key).replace(
      /\{(\w+)\}/g,
      (whole, name) => (name in vars ? String(vars[name]) : whole)
    );
}

const num = (v, sig = 3) => formatNumber(v, { sig });

/**
 * The description as sentences, from numbers.
 *
 * @param {object} d
 * @param {?{t: number, m: ArrayLike<number>, x: ArrayLike<number>,
 *   v: ArrayLike<number>, alive: ArrayLike<number>}} d.frame - labApi.exact()
 * @param {string[]} d.names - Every body's name, by index
 * @param {number} d.G - The system's gravitational constant
 * @param {boolean} d.solar - AU and days, or code units
 * @param {{mode: string, integrator: ?object, interval: number,
 *   provenance: ?object}} d.mode - labApi.modeInfo()
 * @param {{frame: string, plane: string, projection: string}} d.labels - The
 *   page's own words for the three choices
 * @param {?{above: number, around: number, size: number}} d.camera
 * @param {boolean} d.held - A guide step is asking for a measurement
 * @param {(id: string, vars?: object) => string} tr - A translator
 * @returns {string[]} At most 12 sentences
 */
export function sentences(d, tr) {
  const f = d.frame;
  if (!f) return [tr('d.none')];
  const length = v =>
    d.solar
      ? `${num(v)} ${tr('d.unit.au')}`
      : `${num(v)} ${tr('d.unit.length')}`;
  const time = v =>
    d.solar
      ? `${num(v)} ${tr('d.unit.day')}`
      : `${num(v)} ${tr('d.unit.time')}`;
  const out = [];

  const { mode, integrator: it, interval, provenance } = d.mode;
  const tick = time(interval);
  if (mode === 'kepler') out.push(tr('d.mode.kepler', { tick }));
  else if (mode === 'precomputed')
    out.push(
      tr('d.mode.precomputed', { source: provenance?.source ?? '', tick })
    );
  else if (it?.scheme === 'dopri5')
    out.push(
      tr('d.mode.adaptive', { scheme: it.scheme, tol: num(it.tol), tick })
    );
  else
    out.push(
      tr('d.mode.nbody', { scheme: it?.scheme ?? '', step: num(it?.h), tick })
    );
  out.push(tr('d.clock', { t: time(f.t) }));

  const live = [];
  for (let i = 0; i < f.m.length; i++) if (f.alive[i]) live.push(i);
  const names = live.slice(0, MAX_NAMES).map(i => d.names[i]);
  out.push(
    tr(live.length > MAX_NAMES ? 'd.bodies.more' : 'd.bodies', {
      n: live.length,
      names: names.join(', '),
      more: live.length - MAX_NAMES,
    })
  );
  out.push(tr('d.setup', d.labels));
  if (d.camera)
    out.push(
      tr('d.camera', {
        above: Math.round(Math.abs(d.camera.above)),
        side: tr(d.camera.above < 0 ? 'd.below' : 'd.above'),
        around: Math.round(d.camera.around) % 360,
        size: num(d.camera.size, 2),
      })
    );

  // The farthest body from the centre of mass.
  let mass = 0;
  const c = [0, 0, 0];
  for (const i of live)
    if (f.m[i] > 0) {
      mass += f.m[i];
      for (let k = 0; k < 3; k++) c[k] += f.m[i] * f.x[3 * i + k];
    }
  if (mass > 0 && live.length > 1) {
    let far = -1;
    let best = -1;
    for (const i of live) {
      const r = Math.hypot(...[0, 1, 2].map(k => f.x[3 * i + k] - c[k] / mass));
      if (r > best) {
        best = r;
        far = i;
      }
    }
    out.push(tr('d.reach', { name: d.names[far], distance: length(best) }));
  }

  if (d.held) {
    out.push(tr('d.held'));
    return out;
  }

  const h = hierarchy(f);
  const orbits = [];
  for (const i of live) {
    const p = h.primary[i];
    const e = p >= 0 ? elementsAbout(f, i, p, d.G) : null;
    if (e) orbits.push({ i, p, e });
  }
  for (const { i, p, e } of orbits.slice(0, MAX_ORBITS))
    out.push(
      tr(e.bound ? 'd.orbit' : 'd.orbit.unbound', {
        name: d.names[i],
        primary: d.names[p],
        a: length(e.a),
        e: num(e.e),
        i: num(e.i * DEG),
      })
    );
  if (orbits.length > MAX_ORBITS)
    out.push(tr('d.orbits.more', { more: orbits.length - MAX_ORBITS }));

  // Orbits about the same primary, in index order, the first few pairs.
  let pairs = 0;
  for (let a = 0; a < orbits.length && pairs < MAX_PAIRS; a++)
    for (let b = a + 1; b < orbits.length && pairs < MAX_PAIRS; b++) {
      if (orbits[a].p !== orbits[b].p) continue;
      pairs++;
      out.push(
        tr('d.mutual', {
          a: d.names[orbits[a].i],
          b: d.names[orbits[b].i],
          angle: num(
            mutualInclination(orbits[a].e.normal, orbits[b].e.normal) * DEG
          ),
        })
      );
    }
  return out;
}

/**
 * Describe the lab's view now: gather the page's numbers and words, and say them.
 *
 * @param {object} lab - The lab's API (js/lab3dLab.js, labApi)
 * @param {?{above: number, around: number, size: number}} camera - The
 *   camera's numbers (cameraPad.js cameraNumbers)
 * @returns {Promise<{text: string[], language: string}>}
 */
export async function describeView(lab, camera) {
  const language = lab.language();
  await loadLanguage(language);
  const sys = lab.origin();
  if (!sys) return { text: [translator(language)('d.none')], language };
  const reveal = document.getElementById('l3-guide-reveal');
  const word = id => {
    const s = document.getElementById(id);
    return s?.selectedOptions?.[0]?.textContent.trim() ?? '';
  };
  const text = sentences(
    {
      frame: lab.exact(),
      names: sys.bodies.map(b => b.name || b.id),
      G: lab.G(),
      solar: sys.units === 'solar',
      mode: lab.modeInfo(),
      labels: {
        frame: word('l3-frame'),
        plane: word('l3-plane'),
        projection: word('l3-projection'),
      },
      camera,
      held: Boolean(reveal && !reveal.hidden && !reveal.closest('[hidden]')),
    },
    translator(language)
  );
  return { text, language };
}
