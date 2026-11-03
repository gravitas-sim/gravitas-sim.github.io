// =============================================================================
// The views of the direct-imaging panels (Prompt 230, IMAGING.md)
// -----------------------------------------------------------------------------
// Pure functions of the panels' control values, shared by js/directImagingWidgets.js and
// tests/imagingLessons.test.js (which recomputes every number a lesson states from
// them). Nothing is calculated here that the kernel does not: the contrast, the angles
// and the verdict are js/kernels/imaging/.
//
//   contrastView        one planet, at a distance, with one illustrative instrument
//   architecturesView   the Solar System's planets and the archive's imaged planets
//
// The four instruments are TEACHING values (thresholds.json, "instruments"): their inner
// working angles and contrast floors are not cited specifications. The imaged planets
// are the NASA Exoplanet Archive rows of js/data/imagedPlanets.js, at the separation
// their semi-major axis and distance give, which is not the projected separation of any
// one epoch. Pure: no DOM, no clock.
// =============================================================================

import {
  R_EARTH_M,
  R_JUPITER_M,
  angularSeparation,
  diffractionScale,
  irradiationTemperature,
  observable,
  planetContrast,
  thermalContrast,
  reflectedContrast,
} from './kernels/imaging/index.js';
import { BODIES } from './kernels/atmospheres/bodies.js';
import { PHASE_INTEGRAL } from './kernels/atmospheres/phase.js';
import { IMAGED_PLANETS } from './data/imagedPlanets.js';

const { Math, Number } = globalThis;

export const AU_M = 149597870700;
export const PC_M = (AU_M * 648000) / Math.PI;
export const R_SUN_M = 6.957e8;

/** The teaching instruments, as tests/fixtures/imaging/thresholds.json lists them (a test holds the two equal). */
export const INSTRUMENTS = Object.freeze([
  {
    id: 'small-visible',
    apertureM: 0.25,
    wavelengthM: 5.5e-7,
    innerWorkingLambdaOverD: 3,
    contrastFloor: 1e-4,
  },
  {
    id: 'space-2m-visible',
    apertureM: 2.4,
    wavelengthM: 5.5e-7,
    innerWorkingLambdaOverD: 3,
    contrastFloor: 1e-9,
  },
  {
    id: 'ground-8m-nir',
    apertureM: 8,
    wavelengthM: 1.65e-6,
    innerWorkingLambdaOverD: 2,
    contrastFloor: 1e-5,
  },
  {
    id: 'space-6m-visible',
    apertureM: 6,
    wavelengthM: 5.5e-7,
    innerWorkingLambdaOverD: 3,
    contrastFloor: 1e-10,
  },
]);

/** The mid-infrared band of the panel's band control, metres. */
export const MID_INFRARED_M = 1e-5;

/** A Bond albedo to a Lambert sphere's geometric albedo (the phase integral is 3/2). */
const geometric = bond => bond / PHASE_INTEGRAL;

/**
 * The planets of the contrast panel. Earth and Jupiter orbit the Sun with the Bond albedos of
 * the atmospheres kernel's typed table; the other two are stand-ins chosen to show the two
 * extremes (they are not catalogue planets). `planetTeffK` is stated only for the young giant,
 * which shines by its own heat.
 */
export const SYSTEMS = Object.freeze([
  {
    id: 'earth',
    starTeffK: 5772,
    starRadiusM: R_SUN_M,
    planetRadiusM: R_EARTH_M,
    semiMajorM: AU_M,
    geometricAlbedo: geometric(BODIES.earth.albedo),
  },
  {
    id: 'jupiter',
    starTeffK: 5772,
    starRadiusM: R_SUN_M,
    planetRadiusM: R_JUPITER_M,
    semiMajorM: 5.2028 * AU_M,
    geometricAlbedo: geometric(BODIES.jupiter.albedo),
  },
  {
    id: 'young-giant',
    starTeffK: 4000,
    starRadiusM: 0.7 * R_SUN_M,
    planetRadiusM: 1.2 * R_JUPITER_M,
    semiMajorM: 30 * AU_M,
    geometricAlbedo: 0.3,
    planetTeffK: 1500,
  },
  {
    id: 'hot-jupiter',
    starTeffK: 5772,
    starRadiusM: R_SUN_M,
    planetRadiusM: 1.2 * R_JUPITER_M,
    semiMajorM: 0.05 * AU_M,
    geometricAlbedo: 0.1,
  },
]);

export const WAVELENGTHS_M = Object.freeze(
  Array.from({ length: 61 }, (_, i) =>
    Math.exp(Math.log(3e-7) + (i * Math.log(100)) / 60)
  )
);

const clampInt = (x, lo, hi) => Math.max(lo, Math.min(hi, Math.round(x ?? lo)));
const DEG = Math.PI / 180;
/** The smallest contrast the plot shows; a colder body's blackbody tail is drawn at this and says so. */
export const PLOT_FLOOR = 1e-16;

/**
 * One planet, at a distance, phase angle and instrument. The planet is on a circular orbit
 * and its projected separation is a sin(alpha): a planet at full phase (alpha 0) is behind
 * its star, one at quadrature (alpha 90 degrees) is at its greatest elongation.
 */
export function contrastView(values = {}) {
  const system = SYSTEMS[clampInt(values.system, 0, SYSTEMS.length - 1)];
  const telescope =
    INSTRUMENTS[clampInt(values.telescope, 0, INSTRUMENTS.length - 1)];
  const distancePc = Math.max(1, Math.min(100, Number(values.distance ?? 10)));
  const alphaDeg = clampInt(values.phase ?? 90, 0, 180);
  const alpha = alphaDeg * DEG;
  // band 1 is the mid-infrared at 10 micrometres: the diffraction scale and the working angle follow the wavelength
  const lambdaM =
    clampInt(values.band, 0, 1) === 1 ? MID_INFRARED_M : telescope.wavelengthM;
  const base = { ...system, phaseAngleRad: alpha };
  const c = planetContrast({ ...base, wavelengthM: lambdaM });
  const separationM = system.semiMajorM * Math.sin(alpha);
  const sep = angularSeparation({ separationM, distanceM: distancePc * PC_M });
  const scale = diffractionScale({
    apertureM: telescope.apertureM,
    wavelengthM: lambdaM,
  });
  const verdict = observable({
    separationArcsec: sep.arcsec,
    contrast: c.total,
    instrument: { ...telescope, wavelengthM: lambdaM },
  });
  const curve = WAVELENGTHS_M.map(w => {
    const q = planetContrast({ ...base, wavelengthM: w });
    return {
      wavelengthM: w,
      thermal: q.thermal,
      reflected: q.reflected,
      total: q.total,
    };
  });
  return {
    system,
    telescope,
    distancePc,
    alphaDeg,
    lambdaM,
    contrast: c,
    separation: sep,
    separationAu: separationM / AU_M,
    scale,
    separationOverScale: sep.arcsec / scale.lambdaOverDArcsec,
    innerWorkingArcsec: verdict.innerWorkingArcsec,
    verdict,
    curve,
  };
}

/** The Solar System's planets: [name, semi-major axis in AU, mass in Earth masses], the values of js/world/build.js's planet table (a test holds them equal). */
export const SOLAR_SYSTEM = Object.freeze([
  ['Mercury', 0.387, 0.055],
  ['Venus', 0.723, 0.815],
  ['Earth', 1, 1],
  ['Mars', 1.524, 0.107],
  ['Jupiter', 5.204, 317.8],
  ['Saturn', 9.583, 95.2],
  ['Uranus', 19.191, 14.5],
  ['Neptune', 30.07, 17.1],
]);
/** Earth masses in a Jupiter mass, as the same table has it. */
export const EARTHS_PER_JUPITER = 317.8;

const median = xs => {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  return n === 0 ? NaN : n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
};

/** The imaged planets as records (null for a blank cell). */
export const IMAGED = Object.freeze(
  IMAGED_PLANETS.map(r => ({
    name: r[0],
    host: r[1],
    distancePc: r[2],
    semiMajorAu: r[3],
    massJup: r[4],
    radiusJup: r[5],
    temperatureK: r[6],
    starTeffK: r[7],
    starRadiusSun: r[8],
    kMag: r[9],
    discYear: r[10],
  }))
);

/** The Solar System and the imaged planets on one diagram: view 0 is semi-major axis against mass, view 1 the angle on the sky. */
export function architecturesView(values = {}) {
  const view = clampInt(values.view, 0, 1);
  const telescope =
    INSTRUMENTS[clampInt(values.telescope, 0, INSTRUMENTS.length - 1)];
  const distancePc = Math.max(1, Math.min(100, Number(values.distance ?? 10)));
  const solar = SOLAR_SYSTEM.map(([name, a, mE]) => {
    const sep = angularSeparation({
      separationM: a * AU_M,
      distanceM: distancePc * PC_M,
    });
    return {
      name,
      semiMajorAu: a,
      massJup: mE / EARTHS_PER_JUPITER,
      arcsec: sep.arcsec,
    };
  });
  const imaged = IMAGED.filter(p => p.semiMajorAu > 0 && p.massJup > 0).map(
    p => ({
      ...p,
      arcsec:
        p.distancePc > 0
          ? angularSeparation({
              separationM: p.semiMajorAu * AU_M,
              distanceM: p.distancePc * PC_M,
            }).arcsec
          : null,
    })
  );
  const seen = imaged.filter(p => p.arcsec != null);
  const outside = list =>
    list.filter(
      p =>
        observable({
          separationArcsec: p.arcsec,
          contrast: 1,
          instrument: telescope,
        }).code !== 'inside-inner-working-angle'
    ).length;
  const iwa = observable({
    separationArcsec: 1,
    contrast: 1,
    instrument: telescope,
  }).innerWorkingArcsec;
  return {
    view,
    telescope,
    distancePc,
    innerWorkingArcsec: iwa,
    solar,
    imaged,
    counts: {
      table: IMAGED.length,
      withAxisAndMass: imaged.length,
      withDistanceToo: seen.length,
      imagedOutside: outside(seen),
      solarOutside: outside(solar),
    },
    median: {
      imagedAxisAu: median(imaged.map(p => p.semiMajorAu)),
      imagedMassJup: median(imaged.map(p => p.massJup)),
      imagedArcsec: median(seen.map(p => p.arcsec)),
    },
    lightestImagedJup: Math.min(...imaged.map(p => p.massJup)),
    imagedHeavierThanJupiter: imaged.filter(p => p.massJup > 1).length,
    imagedBeyondNeptune: imaged.filter(p => p.semiMajorAu > 30.07).length,
  };
}

/** The contrast at one wavelength of one planet, for the lessons' recomputation and the plot. */
export const contrastAt = (system, wavelengthM, alphaRad = 0) => ({
  thermal: thermalContrast({
    starTeffK: system.starTeffK,
    starRadiusM: system.starRadiusM,
    planetRadiusM: system.planetRadiusM,
    planetTeffK:
      system.planetTeffK ??
      irradiationTemperature({
        starTeffK: system.starTeffK,
        starRadiusM: system.starRadiusM,
        semiMajorM: system.semiMajorM,
        bondAlbedo: Math.min(1, PHASE_INTEGRAL * system.geometricAlbedo),
      }),
    wavelengthM,
  }),
  reflected: reflectedContrast({
    geometricAlbedo: system.geometricAlbedo,
    planetRadiusM: system.planetRadiusM,
    semiMajorM: system.semiMajorM,
    phaseAngleRad: alphaRad,
  }),
});
