// ===========================================================================
// 10. Astrometry
// ===========================================================================

import { REF, makeStar, hypot } from '../harness.js';

/**
 * Run this group's checks.
 *
 * @param {object} ctx - The loaded modules, `add` and `lab` (physicsChecks.js)
 */
export default async function run({
  physics,
  observables,
  frames,
  exoSystems,
  add,
  lab,
}) {
  add({
    group: 'Astrometry',
    kind: 'analytic',
    name: 'One AU at one parsec subtends one arcsecond',
    measured: observables.astrometricSignature({
      starReflexAU: 1,
      distancePc: 1,
    }).arcsec,
    expected: 1,
    unit: 'arcsec',
    tolerance: 1e-15,
    why: 'The definition of the parsec. If this needed a tolerance, something would be badly wrong.',
  });

  const sj = exoSystems.observableParams(exoSystems.SUN_JUPITER);
  const reflex = observables.stellarReflexSemimajorAxis(sj);
  const signature = observables.astrometricSignature({
    starReflexAU: reflex,
    distancePc: sj.distancePc,
  });

  add({
    group: 'Astrometry',
    kind: 'data',
    name: "The Sun's astrometric signature from Jupiter, seen from 10 pc",
    measured: signature.microarcsec,
    expected: REF.sunJupiterSignatureAt10pcMicroarcsec,
    unit: 'microarcsec',
    tolerance: 1e-2,
    why: 'The standard worked example, usually quoted as "about 500 microarcseconds". 1% is tighter than the reference is stated to and confirms the whole chain: mass ratio, reflex orbit, parsec conversion.',
    source: 'Perryman (2011), The Exoplanet Handbook',
  });

  add({
    group: 'Astrometry',
    kind: 'analytic',
    name: 'Star and planet reflex orbits sum to the relative orbit',
    measured:
      observables.stellarReflexSemimajorAxis(sj) +
      observables.planetSemimajorAxisAboutBarycenter(sj),
    expected: sj.semiMajorAU,
    unit: 'AU',
    tolerance: 1e-12,
    why: 'Both bodies orbit the barycenter, and the two orbits have to add up to the separation. Round-off tolerance.',
  });

  add({
    group: 'Astrometry',
    kind: 'analytic',
    name: 'Angular signature is inversely proportional to distance',
    measured:
      observables.astrometricSignature({
        starReflexAU: reflex,
        distancePc: 20,
      }).arcsec /
      observables.astrometricSignature({
        starReflexAU: reflex,
        distancePc: 10,
      }).arcsec,
    expected: 0.5,
    unit: '',
    tolerance: 1e-12,
    why: 'Distance changes the angle and never the orbit. Keeping those two apart is the whole point of the astrometry panel.',
  });

  // The reflex orbit as the integrator produces it, rather than as the
  // formula predicts it: a star pulled by a heavy planet, measured the way
  // the astrometry panel measures it.
  {
    const G = 1;
    const dt = 0.05;
    const M = 1000;
    const mp = 20; // deliberately heavy, so the reflex is large enough to measure
    const sep = 200;
    lab.reset();
    const vRel = Math.sqrt((G * (M + mp)) / sep);
    const rStar = (sep * mp) / (M + mp);
    const rPlanet = (sep * M) / (M + mp);
    const s = makeStar(
      physics,
      { x: -rStar, y: 0 },
      { x: 0, y: (-vRel * mp) / (M + mp) },
      M
    );
    const g = new physics.GasGiant(
      { x: rPlanet, y: 0 },
      { x: 0, y: (vRel * M) / (M + mp) },
      1
    );
    g.mass = mp;
    g.radius = 1;
    physics.stars.push(s);
    physics.gas_giants.push(g);
    lab.commit();

    const period = 2 * Math.PI * Math.sqrt(sep ** 3 / (G * (M + mp)));
    let maxReflex = 0;
    lab.step(dt, Math.round((4 * period) / dt), () => {
      const bary = frames.systemBarycenter([s, g]);
      maxReflex = Math.max(
        maxReflex,
        hypot(s.pos.x - bary.x, s.pos.y - bary.y)
      );
    });
    add({
      group: 'Astrometry',
      kind: 'integration',
      name: 'Integrated stellar reflex amplitude matches a*(m/(M+m))',
      measured: maxReflex,
      expected: rStar,
      unit: 'units',
      tolerance: 3e-3,
      why: "The astrometric panel measures the star's largest excursion from the barycenter and calls it the reflex semi-major axis. This confirms the integrator produces the amplitude the mass ratio demands, to the same O(dt/P) accuracy as any other circular-orbit quantity here.",
    });
  }
}
