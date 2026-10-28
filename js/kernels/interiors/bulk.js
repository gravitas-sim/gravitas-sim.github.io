// Bulk properties of a planet from its mass and radius (Prompt 203, Part A):
// density, surface gravity, escape speed, equilibrium temperature, composition
// class, and the compression correction. Each value carries the first-order,
// uncorrelated uncertainty of the table's stated errors (the Newtonian
// constant's error included in the density, which is the only one that needs
// G). Pure functions; INTERIORS.md.
import { G, G_SIGMA, refuse, isPos, isNum, isSigma } from './constants.js';
import { PLANETS, UNCOMPRESSED, UNCOMPRESSED_SIGMA } from './bodies.js';
import {
  BODIES as ATMOSPHERE_BODIES,
  fluxAt,
  equilibriumTemperature,
  compareWithMeasured,
} from '../atmospheres/index.js';
import { AU_M } from '../atmospheres/constants.js';

const { Math } = globalThis;
const MODEL = 'bulk properties';
const KM = 1e3;

/** The class boundaries, kg/m^3: conventions, not measurements. */
export const CLASS_BOUNDARIES = Object.freeze({ rocky: 3000, volatile: 1800 });
export const RADIUS_KINDS = Object.freeze(['mean', 'equatorial', 'polar']);

const bad = ({ gm, radius, sigma = {} }) => {
  if (!isPos(gm) || !isPos(radius))
    return refuse(
      MODEL,
      'input',
      'GM and the radius must be positive and finite numbers'
    );
  if (!isSigma(sigma.gm) || !isSigma(sigma.radius))
    return refuse(
      MODEL,
      'sigma',
      'an uncertainty must be a finite number of at least 0'
    );
  if ((sigma.gm ?? 0) > gm || (sigma.radius ?? 0) > radius)
    return refuse(
      MODEL,
      'sigma-range',
      'an uncertainty larger than its value is not a measurement'
    );
  return null;
};

/** Mass in kg from GM (km^3 s^-2) with the constant's error. */
export function massFromGm({ gm, sigma = {} }) {
  const b = bad({ gm, radius: 1, sigma });
  if (b) return b;
  const value = (gm * 1e9) / G;
  return {
    value,
    sigma: value * Math.hypot((sigma.gm ?? 0) / gm, G_SIGMA / G),
    unit: 'kg',
  };
}

/** Bulk density, kg/m^3, of a sphere of volumetric-mean radius `radius` (km). */
export function bulkDensity({ gm, radius, sigma = {} }) {
  const b = bad({ gm, radius, sigma });
  if (b) return b;
  const value = (3 * gm * 1e9) / (4 * Math.PI * G * (radius * KM) ** 3);
  const rel = Math.hypot(
    (sigma.gm ?? 0) / gm,
    G_SIGMA / G,
    (3 * (sigma.radius ?? 0)) / radius
  );
  return { value, sigma: value * rel, unit: 'kg/m3' };
}

/** Surface gravity GM / R^2, m s^-2 (no rotation term). Needs no G. */
export function surfaceGravity({ gm, radius, sigma = {} }) {
  const b = bad({ gm, radius, sigma });
  if (b) return b;
  const value = (gm * 1e9) / (radius * KM) ** 2;
  const rel = Math.hypot(
    (sigma.gm ?? 0) / gm,
    (2 * (sigma.radius ?? 0)) / radius
  );
  return { value, sigma: value * rel, unit: 'm/s2' };
}

/** Escape speed sqrt(2 GM / R), m s^-1 (a non-rotating sphere). Needs no G. */
export function escapeSpeed({ gm, radius, sigma = {} }) {
  const b = bad({ gm, radius, sigma });
  if (b) return b;
  const value = Math.sqrt((2 * gm * 1e9) / (radius * KM));
  const rel = Math.hypot(
    (sigma.gm ?? 0) / (2 * gm),
    (sigma.radius ?? 0) / (2 * radius)
  );
  return { value, sigma: value * rel, unit: 'm/s' };
}

/**
 * The density class: rocky (3000 kg/m^3 or more), rock-ice (1800 to 3000),
 * volatile-rich (below 1800). Conventions: density alone cannot tell hydrogen
 * and helium from water ice, so the third class is not split. A density within
 * 2 sigma of a boundary is labelled ambiguous.
 */
export function compositionClass({ density, sigma = 0 }) {
  if (!isPos(density) || !isNum(sigma) || sigma < 0)
    return refuse(
      MODEL,
      'input',
      'the density must be positive and finite, the uncertainty finite and at least 0'
    );
  const cls =
    density >= CLASS_BOUNDARIES.rocky
      ? 'rocky'
      : density >= CLASS_BOUNDARIES.volatile
        ? 'rock-ice'
        : 'volatile-rich';
  const nearest =
    Math.abs(density - CLASS_BOUNDARIES.rocky) <
    Math.abs(density - CLASS_BOUNDARIES.volatile)
      ? CLASS_BOUNDARIES.rocky
      : CLASS_BOUNDARIES.volatile;
  const ambiguous = Math.abs(density - nearest) <= 2 * sigma;
  return {
    model: 'density class',
    class: cls,
    ambiguous,
    note: 'a convention on bulk density: it cannot tell hydrogen and helium from water ice',
  };
}

const unknown = id =>
  refuse(MODEL, 'unknown-body', `no body called ${String(id)}`);

/** Radius used by each quantity, as the NASA fact sheets do: the volumetric mean for density, the equatorial radius for gravity and escape speed. */
export function bulkOf(id, { gravityRadius = 'equatorial' } = {}) {
  const b = PLANETS[id];
  if (!Object.hasOwn(PLANETS, String(id)) || !b) return unknown(id);
  if (!RADIUS_KINDS.includes(gravityRadius) || !b.radius[gravityRadius])
    return refuse(
      MODEL,
      'radius-kind',
      `${b.name} has no ${String(gravityRadius)} radius in the table`
    );
  const [gm, sgm] = b.gm;
  const dens = bulkDensity({
    gm,
    radius: b.radius.mean[0],
    sigma: { gm: sgm, radius: b.radius.mean[1] },
  });
  const gr = b.radius[gravityRadius];
  const sg = { gm: sgm, radius: gr[1] };
  const g = surfaceGravity({ gm, radius: gr[0], sigma: sg });
  const v = escapeSpeed({ gm, radius: gr[0], sigma: sg });
  const m = massFromGm({ gm, sigma: { gm: sgm } });
  return {
    model: MODEL,
    body: b.name,
    id,
    mass: m,
    density: { ...dens, radiusUsed: 'mean' },
    gravity: { ...g, radiusUsed: gravityRadius },
    escapeSpeed: { ...v, radiusUsed: gravityRadius },
    class: compositionClass({ density: dens.value, sigma: dens.sigma }),
    assumes: [
      'a sphere of the stated radius',
      'no rotation term in the gravity',
      'uncertainties first order and uncorrelated',
    ],
  };
}

/** The equilibrium (emission) temperature of a body, K, from the Prompt 200 kernel; no uncertainty (the albedo table states none). */
export function equilibriumOf(id) {
  if (!Object.hasOwn(PLANETS, String(id))) return unknown(id);
  if (ATMOSPHERE_BODIES[id]) {
    const r = compareWithMeasured(id);
    return r.refused
      ? r
      : {
          model: r.model,
          assumes: r.assumes,
          body: r.body,
          temperature: r.emissionK,
          sigma: null,
        };
  }
  const b = PLANETS[id];
  const eq = equilibriumTemperature({
    flux: fluxAt(1, (b.aMkm * 1e9) / AU_M),
    bondAlbedo: b.albedo,
  });
  return eq.refused
    ? eq
    : {
        model: eq.model,
        assumes: eq.assumes,
        body: b.name,
        temperature: eq.temperature,
        sigma: null,
      };
}

/**
 * The compression correction: the bulk density minus the tabulated
 * uncompressed density, with the declared spread of that table combined with
 * the bulk density's error.
 */
export function compressionCorrection(id) {
  if (!Object.hasOwn(UNCOMPRESSED, String(id)))
    return Object.hasOwn(PLANETS, String(id))
      ? refuse(
          'compression correction',
          'no-table',
          `${PLANETS[id].name} has no uncompressed density in the table (a gas or ice giant does not have one)`
        )
      : unknown(id);
  const bulk = bulkOf(id).density;
  const u = UNCOMPRESSED[id];
  return {
    model: 'compression correction',
    bulk: bulk.value,
    uncompressed: u,
    correction: bulk.value - u,
    sigma: Math.hypot(bulk.sigma, UNCOMPRESSED_SIGMA),
    sigmaDeclared: UNCOMPRESSED_SIGMA,
    assumes: [
      'the uncompressed density is a tabulated value with a declared, not a measured, spread',
      'bulk composition differences are not separated from compression',
    ],
  };
}
