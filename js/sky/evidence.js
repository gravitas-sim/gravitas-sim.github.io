// =============================================================================
// The Sky Lab's evidence: every reading is an envelope
// -----------------------------------------------------------------------------
// A reading of one of the five instruments, written as a gravitas.artifact/1
// (js/platform/artifact.js): its inputs as assumed quantities, its results as
// derived ones, each with an uncertainty that says what it is. The bounds are
// the kernel's measured ones (SKY_LAB.md): a star's altitude within 1 arcminute
// from 5 degrees of apparent altitude, the Sun within 0.01 degree, the Moon
// within 0.02, a planet within 0.2; below 5 degrees the refraction spread is
// the weather's and is stated as that. A lazy module: the page fetches it when
// a reading is saved.
// =============================================================================

import { artifact, validateArtifact } from '../platform/artifact.js';

const CITATIONS = [
  { text: 'Meeus, Astronomical Algorithms, 2nd ed. (Willmann-Bell, 1998)' },
  { text: 'IAU SOFA / ERFA, the reference the kernel is validated against' },
  {
    text: 'Hoffleit & Warren, The Bright Star Catalogue, 5th rev. ed. (CDS V/50), for stars',
  },
];
const NONE = { kind: 'none' };

/** The angular bound on a position, degrees, and where it comes from. */
export function positionBoundDeg(type, altGeomDeg) {
  if (altGeomDeg < 5)
    return {
      deg: 20 / 60,
      note: "below 5 degrees the refraction is the weather's: the kernel and ERFA differ by up to 20 arcminutes there",
    };
  const deg =
    { star: 1 / 60, fixed: 1 / 60, sun: 0.01, moon: 0.02, planet: 0.2 }[type] ??
    0.2;
  return { deg, note: null };
}

const interval = (v, half, basis = 'model') => ({
  kind: 'interval',
  lo: v - half,
  hi: v + half,
  basis,
});

function build(id, instrument, ctx, quantities, warnings = []) {
  const env = artifact({
    id: `sky-lab:${instrument}:${ctx.jdUt}:${ctx.site.latDeg}:${ctx.site.lonDeg}:${ctx.key ?? ''}`,
    source: { kind: 'analysis', id: `sky-lab/${instrument}`, version: '1' },
    provenance: { citations: CITATIONS },
    quantities: quantities.filter(q => Number.isFinite(q.value)),
    warnings,
  });
  const problems = validateArtifact(env);
  if (problems.length)
    throw new Error(`${id}: ${problems[0].path} ${problems[0].message}`);
  return env;
}
const assumed = (id, value, unit) => ({
  id,
  value,
  unit,
  origin: 'assumed',
  uncertainty: NONE,
});
const derived = (id, value, unit, uncertainty = NONE) => ({
  id,
  value,
  unit,
  origin: 'derived',
  uncertainty,
});
const siteQ = c => [
  assumed('site.latitude', c.site.latDeg, 'deg'),
  assumed('site.longitude', c.site.lonDeg, 'deg'),
  assumed('time.jd.ut', c.jdUt, 'd'),
];

/** Altitude-azimuth reader. @param {object} r - From altAzReading; ctx {site, jdUt, type, key} */
export function altAzEnvelope(r, ctx) {
  const b = positionBoundDeg(ctx.type, r.altGeomDeg);
  return build(
    'altaz',
    'altaz',
    ctx,
    [
      ...siteQ(ctx),
      derived('altitude.apparent', r.altDeg, 'deg', interval(r.altDeg, b.deg)),
      derived(
        'altitude.geometric',
        r.altGeomDeg,
        'deg',
        interval(r.altGeomDeg, b.deg)
      ),
      derived('azimuth', r.azDeg, 'deg', interval(r.azDeg, b.deg)),
      derived('hour-angle', r.haDeg, 'deg', interval(r.haDeg, b.deg)),
      derived('ra.apparent', r.raDeg, 'deg', NONE),
      derived('dec.apparent', r.decDeg, 'deg', NONE),
      derived(
        'refraction',
        r.refractionArcmin,
        'arcmin',
        interval(r.refractionArcmin, r.refractionSpreadArcmin, 'assumed')
      ),
      ...(r.airmass === null ? [] : [derived('airmass', r.airmass, '', NONE)]),
    ],
    b.note ? [b.note] : []
  );
}

/** Sidereal clock. */
export function clockEnvelope(c, ctx) {
  return build(
    'clock',
    'clock',
    ctx,
    [
      ...siteQ(ctx),
      derived('time.jd.tt', c.jdTt, 'd', NONE),
      derived(
        'delta-t',
        c.deltaTSec,
        's',
        c.deltaTRangeSec === null
          ? NONE
          : interval(c.deltaTSec, c.deltaTRangeSec, 'assumed')
      ),
      derived('sidereal.greenwich.mean', c.gmstDeg, 'deg', NONE),
      derived('sidereal.greenwich.apparent', c.gastDeg, 'deg', NONE),
      derived('sidereal.local.mean', c.lmstDeg, 'deg', NONE),
      derived('sidereal.local.apparent', c.lastDeg, 'deg', NONE),
      derived('equation-of-equinoxes', c.equationOfEquinoxesSec, 's', NONE),
    ],
    [
      'UTC is taken as UT1: they differ by less than 0.9 second (0.004 degree of rotation)',
    ]
  );
}

/** Airmass and twilight. @param {object} a - airmassReading; t - twilightReading */
export function airmassTwilightEnvelope(a, t, ctx) {
  const q = [
    ...siteQ(ctx),
    assumed('altitude.apparent', a.altDeg, 'deg'),
    derived('airmass', a.airmass ?? NaN, '', NONE),
    derived('airmass.secant', a.secantAirmass ?? NaN, '', NONE),
  ];
  const add = (id, jd) => {
    if (jd !== null) q.push(derived(id, jd, 'd', NONE));
  };
  add('sunrise.jd.ut', t.sunrise);
  add('sunset.jd.ut', t.sunset);
  for (const [name, v] of Object.entries(t.twilight)) {
    add(`twilight.${name}.dawn.jd.ut`, v.dawnJd);
    add(`twilight.${name}.dusk.jd.ut`, v.duskJd);
  }
  if (t.astronomicalNightDays !== null)
    q.push(
      derived('night.astronomical.length', t.astronomicalNightDays, 'd', NONE)
    );
  return build('airmass-twilight', 'airmass-twilight', ctx, q, [
    'the Kasten and Young fit is for apparent altitude; near the horizon the real airmass depends on the atmosphere',
  ]);
}

/** Rise, transit and set. */
export function riseSetEnvelope(r, ctx) {
  const q = [...siteQ(ctx)];
  const add = (id, v, unit = 'd') => {
    if (v !== null && v !== undefined) q.push(derived(id, v, unit, NONE));
  };
  add('rise.jd.ut', r.riseJd);
  add('transit.jd.ut', r.transitJd);
  add('set.jd.ut', r.setJd);
  add('rise.azimuth', r.riseAzDeg, 'deg');
  add('set.azimuth', r.setAzDeg, 'deg');
  add('transit.altitude', r.transitAltDeg, 'deg');
  return build('rise-set', 'rise-set', ctx, q, [
    `status: ${r.status}`,
    'times depend on the horizon: 34 arcminutes of refraction (and the Sun or Moon limb) below the geometric horizon, no terrain',
  ]);
}

/** Phase and elongation. */
export function phaseEnvelope(p, ctx) {
  return build(
    'phase',
    'phase',
    ctx,
    [
      ...siteQ(ctx),
      derived(
        'moon.elongation',
        p.elongationDeg,
        'deg',
        interval(p.elongationDeg, 0.03)
      ),
      derived(
        'moon.phase-angle',
        p.phaseAngleDeg,
        'deg',
        interval(p.phaseAngleDeg, 0.5)
      ),
      derived(
        'moon.illuminated',
        p.illuminated,
        '',
        interval(p.illuminated, 0.01)
      ),
      derived('moon.next-new.jd.ut', p.nextNewMoonJd, 'd', NONE),
      derived('moon.next-full.jd.ut', p.nextFullMoonJd, 'd', NONE),
      ...Object.entries(p.planets).flatMap(([id, v]) => [
        derived(`${id}.elongation`, v.elongationDeg, 'deg', NONE),
        derived(`${id}.illuminated`, v.illuminated, '', NONE),
      ]),
    ],
    [
      'planet phase and elongation are geometric, from the same elements as the planet positions (0.2 degree)',
    ]
  );
}

/** The text of an envelope, as the file the student saves. */
export const envelopeFile = env => `${JSON.stringify(env, null, 2)}\n`;
