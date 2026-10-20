// ===========================================================================
// N. Observing windows
// ---------------------------------------------------------------------------
// js/observingWindow.js is the only module in the codebase that computes
// real-sky quantities, and it is therefore the only one whose answers can be
// checked against a published ephemeris rather than against Gravitas itself.
// That is the point of the group. Every other group here validates the
// simulation against the equation it claims to solve; these validate an
// implementation of standard astronomy against the Astronomical Almanac, the
// NASA eclipse canon and the papers the airmass fits come from.
//
// Three families, and they fail differently:
//
//   the geometry      Spherical trigonometry with no time in it. Exact, and
//                     checked at machine precision.
//   the ephemerides   Truncated series with a stated accuracy. Checked
//                     against published instants, with the tolerance set by
//                     the series' own specification and by the fact that UT
//                     is used where TT is meant.
//   the window finder A numerical search. Checked against the closed form
//                     for the one case that has one, which is the only
//                     honest way to validate a sampler.
// ===========================================================================

import { REF } from '../harness.js';

/**
 * Run this group's checks.
 *
 * @param {object} ctx - The loaded modules, `add` and `lab` (physicsChecks.js)
 */
export default async function run({ sky, add }) {
  const OBS = 'Observing windows';
  const LA_SILLA = { latitudeDeg: -29.2563, longitudeDeg: -70.738 };
  const HD209458 = { raDeg: 330.795, decDeg: 18.8842 };
  const SIDEREAL_RATE = 360.98564736629;

  // --- The geometry ------------------------------------------------------

  add({
    group: OBS,
    kind: 'data',
    name: 'Greenwich mean sidereal time at J2000.0',
    measured: sky.greenwichMeanSiderealTime(sky.J2000) / 15,
    expected: REF.gmstAtJ2000Hours,
    unit: 'hours',
    tolerance: 1e-8,
    why: 'The defining constant of the IAU 1982 expression, read back through the whole polynomial. It is checked because every hour angle in the module is this number plus a rate: an error here is an error in when every window opens, and it would be invisible in any internal comparison because everything downstream inherits it.',
    source: 'IAU 1982 / Aoki et al. (1982); 18h 41m 50.5482s',
  });

  add({
    group: OBS,
    kind: 'data',
    name: 'The sidereal day implied by the sidereal rate',
    measured: 360 / SIDEREAL_RATE,
    expected: REF.siderealDayDays,
    unit: 'mean solar days',
    tolerance: 1e-8,
    why: 'The rate constant is the reason a nightly observing window walks four minutes earlier each night, which is the central fact of the planning investigation this module was written for. Checking the rate against the published sidereal day is checking that claim at its source rather than in the investigation prose.',
    source:
      'IAU 1982 / Aoki et al. (1982), A&A 105, 359; the sidereal day of 23h 56m 04.0905s as tabulated in the Explanatory Supplement to the Astronomical Almanac.',
  });

  add({
    group: OBS,
    kind: 'data',
    name: 'Mean obliquity of the ecliptic at J2000.0',
    measured: sky.meanObliquity(sky.J2000),
    expected: REF.obliquityJ2000Deg,
    unit: 'degrees',
    tolerance: 1e-7,
    why: 'The constant term of the obliquity polynomial. Every ecliptic-to-equatorial conversion in the module passes through it, so the Sun and the Moon would both be wrong together and no relative check between them would notice.',
    source: 'IAU 2006',
  });

  {
    const lat = -29.2563;
    const dec = 18.8842;
    const alt = sky.altAz({
      hourAngleDeg: 0,
      declinationDeg: dec,
      latitudeDeg: lat,
    }).altitudeDeg;
    add({
      group: OBS,
      kind: 'analytic',
      name: 'Culmination altitude is 90 minus the latitude-declination gap',
      measured: alt,
      expected: 90 - Math.abs(lat - dec),
      unit: 'degrees',
      tolerance: 1e-12,
      why: 'The altitude relation at hour angle zero collapses to this, and it is the one case where the spherical triangle has a one-line answer. Checked at machine precision because there is nothing here for a tolerance to absorb - a failure would mean a sign or a swapped argument, not an approximation.',
    });
  }

  add({
    group: OBS,
    kind: 'analytic',
    name: 'A target one degree inside the circumpolar limit never sets',
    measured: sky.hourAngleAtAltitude({
      declinationDeg: -(90 - 29.2563) - 1,
      latitudeDeg: -29.2563,
      altitudeDeg: 0,
    }).circumstance,
    expected: 'alwaysUp',
    tolerance: 0,
    why: 'The circumpolar condition is where the arccos form of the rise-set equation leaves its domain, and a naive implementation returns NaN and propagates it into a window of length NaN. The module is required to name which side it left on, because "always up" and "never up" produce opposite schedules and a caller cannot tell them apart from a null.',
  });

  add({
    group: OBS,
    kind: 'analytic',
    name: 'A target one degree outside it does rise',
    measured: sky.hourAngleAtAltitude({
      declinationDeg: -(90 - 29.2563) + 1,
      latitudeDeg: -29.2563,
      altitudeDeg: 0,
    }).circumstance,
    expected: 'rises',
    tolerance: 0,
    why: 'The other side of the same boundary. Two checks rather than one because a function that always said "always up" would pass the first.',
  });

  {
    // One arcsecond apart in right ascension, at declination 20.
    const arcsec = 1 / 3600;
    const sep = sky.angularSeparation(
      100,
      20,
      100 + arcsec / Math.cos(20 * (Math.PI / 180)),
      20
    );
    add({
      group: OBS,
      kind: 'analytic',
      name: 'Angular separation is exact at one arcsecond',
      measured: sep * 3600,
      expected: 1,
      unit: 'arcseconds',
      tolerance: 1e-9,
      why: 'The reason the module uses the Vincenty form rather than the cosine rule. At this separation the cosine rule asks acos() for a number within an ulp of 1 and comes back with an error of two parts in a million; the same call here is exact to nine figures. Small separations are exactly what the Moon-avoidance test and the eclipse checks below are about, so the cheap formula would have been wrong where it mattered.',
    });
  }

  // --- Airmass -----------------------------------------------------------

  add({
    group: OBS,
    kind: 'approximation',
    name: 'Kasten & Young airmass at the horizon',
    measured: sky.airmass(0),
    expected: REF.airmassHorizonKY,
    unit: 'airmasses',
    tolerance: 2e-4,
    why: 'The number the paper quotes, and the reason the fit exists at all: sec z diverges at the horizon and the real atmosphere does not. Reproducing it to four figures means all three fitted constants are entered correctly, which no internal check could establish.',
    source: 'Kasten & Young (1989), Applied Optics 28, 4735',
  });

  add({
    group: OBS,
    kind: 'approximation',
    name: 'Kasten & Young airmass at the zenith is one, but not exactly',
    measured: sky.airmass(90),
    expected: 1,
    unit: 'airmasses',
    tolerance: 3.5e-4,
    toleranceKind: 'absolute',
    why: 'An interpolative fit is not normalised at its endpoints, and this one returns 0.99971 straight up. That is inside its own quoted accuracy of about a thousandth and is not a defect, but it is worth a check with a written bound: a later "improvement" that forced it to exactly 1 would be silently changing a published formula, and a rewrite that drifted to 0.99 would not be caught by any other check here.',
    source: 'Kasten & Young (1989)',
  });

  add({
    group: OBS,
    kind: 'analytic',
    name: 'The secant model at 60 degrees from the zenith is exactly two',
    measured: sky.airmass(30, 'secant'),
    expected: 2,
    unit: 'airmasses',
    tolerance: 1e-12,
    why: 'sec 60 = 2 is the one airmass every student can check by hand, and it is what makes the secant model worth keeping beside the fitted one. Exact arithmetic, so exact tolerance.',
  });

  add({
    group: OBS,
    kind: 'approximation',
    name: 'The two airmass models agree to better than a percent at 60 degrees',
    measured: Math.abs(1 - sky.airmass(30) / sky.airmass(30, 'secant')),
    expected: 0.01,
    unit: 'fractional difference',
    tolerance: 0,
    toleranceKind: 'bound',
    why: 'The claim a textbook makes when it says "use sec z above thirty degrees altitude". Measured at 0.29%. This is the check that says the two models are the same physics in the regime a planning exercise works in, and therefore that the choice between them cannot change a window - which is why the module offers both without making the caller think hard about it.',
  });

  add({
    group: OBS,
    kind: 'analytic',
    name: 'The airmass limit inverts to an altitude and back',
    measured: sky.airmass(sky.altitudeForAirmass(2)),
    expected: 2,
    unit: 'airmasses',
    tolerance: 1e-9,
    why: 'A time allocation states its limit as an airmass and the geometry needs an altitude, so the module bisects the fit. Round-tripping is the whole correctness condition for that bisection: it is monotone, so if it converges at all it converges to the right root, and this check is what says it converged.',
  });

  // --- The Sun -----------------------------------------------------------

  add({
    group: OBS,
    kind: 'data',
    name: "The Sun's right ascension at J2000.0",
    measured: sky.solarPosition(sky.J2000).raDeg,
    expected: REF.sunRaJ2000Deg,
    unit: 'degrees',
    tolerance: 0.02,
    toleranceKind: 'absolute',
    why: 'The Almanac states the low-precision solar series as good to 0.01 degrees in longitude over 1950-2050, and the conversion to right ascension does not improve on that. The tolerance is twice the specification, which also covers the published position being quoted to the nearest arcsecond. Measured residual is 0.008 degrees, well inside the claim.',
    source: 'Astronomical Almanac, 2000 January 1.5 TT: 18h 45m 07s',
  });

  add({
    group: OBS,
    kind: 'data',
    name: "The Sun's declination at J2000.0",
    measured: sky.solarPosition(sky.J2000).decDeg,
    expected: REF.sunDecJ2000Deg,
    unit: 'degrees',
    tolerance: 0.01,
    toleranceKind: 'absolute',
    why: 'The same instant, in the coordinate twilight actually depends on: declination is what decides how far below the horizon the Sun gets at midnight, and therefore whether a site has an astronomical night at all. Tighter than the right-ascension tolerance because the residual is genuinely smaller here - 0.002 degrees - the obliquity conversion compressing a longitude error near the solstices.',
    source: 'Astronomical Almanac, 2000 January 1.5 TT: -23 deg 01\' 55"',
  });

  add({
    group: OBS,
    kind: 'data',
    name: "The Sun's longitude is zero at the published March equinox",
    measured: sky.wrap180(
      sky.solarPosition(REF.marchEquinox2026Jd).longitudeDeg
    ),
    expected: 0,
    unit: 'degrees',
    tolerance: 0.02,
    toleranceKind: 'absolute',
    why: 'An equinox is the definition of zero ecliptic longitude, published to the minute, so this is the cleanest possible external check on the solar series: no coordinate conversion, no site, no interpretation. The tolerance is the series specification plus the half-minute the published instant is rounded to, which is 0.0003 degrees of solar motion.',
    source: 'Astronomical Almanac: 2026 March 20, 14:46 UT',
  });

  add({
    group: OBS,
    kind: 'data',
    name: "The Sun's longitude is ninety degrees at the published June solstice",
    measured: sky.wrap180(
      sky.solarPosition(REF.juneSolstice2026Jd).longitudeDeg - 90
    ),
    expected: 0,
    unit: 'degrees',
    tolerance: 0.02,
    toleranceKind: 'absolute',
    why: 'The equinox check a quarter of a year later, which catches a phase error in the equation of the centre that the equinox alone would not: the two terms of that series are near their extremes here and near zero there.',
    source: 'Astronomical Almanac: 2026 June 21, 08:25 UT',
  });

  {
    // The Sun's greatest declination over a year, on a quarter-hour grid.
    let maxDec = -90;
    let atJd = 0;
    const start = sky.julianDate(2026, 1, 1, 0);
    for (let d = 150; d < 200; d += 1 / 96) {
      const dec = sky.solarPosition(start + d).decDeg;
      if (dec > maxDec) {
        maxDec = dec;
        atJd = start + d;
      }
    }
    add({
      group: OBS,
      kind: 'analytic',
      name: "The Sun's greatest declination equals the obliquity of that date",
      measured: maxDec,
      expected: sky.meanObliquity(atJd),
      unit: 'degrees',
      tolerance: 1e-3,
      toleranceKind: 'absolute',
      why: 'Not a published number but an identity: the ecliptic is inclined by the obliquity, so the Sun can be no further from the equator than that. It is worth checking because the obliquity is falling - it is 23.4359 degrees in 2026, not the 23.4393 of J2000 - and a check written against the J2000 value would pass today and drift. The residual is set by the quarter-hour grid, on which the declination is flat.',
    });
  }

  {
    let maxE = -99;
    let minE = 99;
    const start = sky.julianDate(2026, 1, 1, 0);
    for (let d = 0; d < 366; d += 1 / 48) {
      const e = sky.equationOfTimeMinutes(start + d);
      if (e > maxE) maxE = e;
      if (e < minE) minE = e;
    }
    add({
      group: OBS,
      kind: 'data',
      name: 'The equation of time reaches its published November maximum',
      measured: maxE,
      expected: REF.eotMaxMinutes,
      unit: 'minutes',
      tolerance: 0.5,
      toleranceKind: 'absolute',
      why: 'The equation of time is the difference between the two terms of the solar series read out against the mean Sun, so its extremes are the sharpest test of both at once: an error in either amplitude or in the phase between them moves them. The tolerance is half a minute because the extreme itself varies by about ten seconds from year to year and the quoted figure is a generic one, not a 2026 value - so this bounds the series rather than pinning it.',
      source:
        'Astronomical Almanac, daily equation-of-time table; the November extreme, about +16m33s. Not a dated value: the year-to-year drift is about ten seconds.',
    });
    add({
      group: OBS,
      kind: 'data',
      name: 'The equation of time reaches its published February minimum',
      measured: minE,
      expected: REF.eotMinMinutes,
      unit: 'minutes',
      tolerance: 0.5,
      toleranceKind: 'absolute',
      why: 'The other extreme, where the obliquity and eccentricity terms combine with the opposite sign. Measured at -14.22 minutes against a quoted -14m15s.',
      source:
        'Astronomical Almanac, daily equation-of-time table; the February extreme, about -14m15s. Not a dated value: the year-to-year drift is about ten seconds.',
    });
  }

  // --- The Moon ----------------------------------------------------------
  //
  // Phase instants and eclipse geometry, which are the two kinds of lunar
  // fact published to better than the series can compute. Nothing here
  // compares a coordinate: a single RA would be checked against a number
  // this file would have to carry, and an elongation is checked against an
  // event.

  /** When the Moon's ecliptic longitude leads the Sun's by a given angle. */
  const phaseInstant = (guessJd, leadDeg) => {
    let lo = guessJd - 2;
    let hi = guessJd + 2;
    const g = jd =>
      sky.wrap180(
        sky.lunarPosition(jd).longitudeDeg -
          sky.solarPosition(jd).longitudeDeg -
          leadDeg
      );
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2;
      if (g(lo) * g(mid) <= 0) hi = mid;
      else lo = mid;
    }
    return (lo + hi) / 2;
  };

  add({
    group: OBS,
    kind: 'data',
    name: 'New Moon of 2000 January 6 lands on the published minute',
    measured:
      (phaseInstant(REF.newMoon2000Jan6Jd, 0) - REF.newMoon2000Jan6Jd) * 1440,
    expected: 0,
    unit: 'minutes',
    tolerance: 3,
    toleranceKind: 'absolute',
    why: 'A phase instant is a statement that two ecliptic longitudes are equal, published to the minute, and it therefore constrains the truncated lunar series far more sharply than any coordinate would. The residual is about one minute and it is late, which is the expected sign: the module uses UT where the series wants TT, and delta-T was 64 seconds in 2000. Three minutes leaves room for that plus the half-minute the published time is rounded to.',
    source:
      'Espenak, Six Millennium Catalog of Phases of the Moon (NASA GSFC): New Moon 2000 January 6, 18:14 UT.',
  });

  add({
    group: OBS,
    kind: 'data',
    name: 'Full Moon of 2018 July 27 lands on the published minute',
    measured:
      (phaseInstant(REF.fullMoon2018Jul27Jd, 180) - REF.fullMoon2018Jul27Jd) *
      1440,
    expected: 0,
    unit: 'minutes',
    tolerance: 3,
    toleranceKind: 'absolute',
    why: 'The opposite phase, eighteen years later, so a drift in the mean longitude rate would show here and not in the check above. Same delta-T reasoning; delta-T was 69 seconds in 2018.',
    source:
      'Espenak, Six Millennium Catalog of Phases of the Moon (NASA GSFC): Full Moon 2018 July 27, 20:20 UT.',
  });

  /**
   * How far the Moon's centre was from the antisolar point, in degrees,
   * predicted from the published gamma of a lunar eclipse.
   *
   * Gamma is quoted in equatorial Earth radii, measured at the Moon. Divided
   * by the Moon's distance it is an angle, and that angle is exactly
   * 180 degrees minus the geocentric elongation.
   */
  const gammaToDegrees = (gamma, jd) =>
    Math.abs(gamma) *
    (REF.earthRadiusKm / sky.lunarPosition(jd).distanceKm) *
    (180 / Math.PI);

  add({
    group: OBS,
    kind: 'data',
    name: 'Total lunar eclipse of 2018 July 27: offset from the antisolar point',
    measured: 180 - sky.lunarPhase(REF.lunarEclipse2018Jd).elongationDeg,
    expected: gammaToDegrees(REF.lunarEclipse2018Gamma, REF.lunarEclipse2018Jd),
    unit: 'degrees',
    tolerance: 0.02,
    toleranceKind: 'absolute',
    why: "The sharpest external check in this group. An eclipse gamma is a published measurement of the Moon's least distance from the shadow axis, and the shadow axis is the antisolar point, so it pins the Sun-Moon geometry to a hundredth of a degree - two orders finer than an elongation could be checked any other way. This was the longest total lunar eclipse of the century, very nearly central; measured 0.105 degrees against 0.105 predicted.",
    source: 'NASA five millennium canon of lunar eclipses; gamma = 0.1168',
  });

  add({
    group: OBS,
    kind: 'data',
    name: 'Total lunar eclipse of 2000 January 21: offset from the antisolar point',
    measured: 180 - sky.lunarPhase(REF.lunarEclipse2000Jd).elongationDeg,
    expected: gammaToDegrees(REF.lunarEclipse2000Gamma, REF.lunarEclipse2000Jd),
    unit: 'degrees',
    tolerance: 0.02,
    toleranceKind: 'absolute',
    why: 'The same test eighteen years earlier and three times further off axis, so the two together constrain the latitude series as well as the longitude one: gamma is very nearly the ecliptic latitude of the Moon at opposition. Measured 0.298 degrees against 0.304 predicted.',
    source: 'NASA five millennium canon of lunar eclipses; gamma = -0.2996',
  });

  add({
    group: OBS,
    kind: 'approximation',
    name: 'The Moon is fully lit at the middle of a total lunar eclipse',
    measured: sky.lunarPhase(REF.lunarEclipse2018Jd).illuminatedFraction,
    expected: 1,
    unit: 'fraction',
    tolerance: 1e-5,
    toleranceKind: 'absolute',
    why: "The illuminated fraction is computed from the phase angle of the Sun-Moon-Earth triangle rather than from the elongation directly, which is the correction that makes the Moon not exactly half lit at quadrature. This check is where that arithmetic has an unambiguous answer: at the middle of a total lunar eclipse the Moon is at full, whatever the Earth is doing to the light. Not `data`, which its own source string admitted by saying 'Geometry of a central eclipse': the expected value is 1 because a central eclipse happens at full, and nobody published an illuminated fraction for this instant. Not `analytic` either, because the tolerance is not machine epsilon and has something real to absorb - the truncated lunar and solar series, which come back 8.4e-7 short of unity. That is an educational model validated against the geometry it says it implements, which is what `approximation` means here. The published instant it is evaluated at carries its own citation on REF.lunarEclipse2018Jd.",
  });

  {
    // The mean synodic month, over two thousand lunations. Fewer will not
    // do: the anomalistic and synodic cycles beat with a period of about
    // fourteen lunations, and a hundred of them leaves a seventh of a beat
    // unaveraged, which is larger than the quantity being measured.
    const first = phaseInstant(REF.newMoon2000Jan6Jd, 0);
    const N = 2000;
    const last = phaseInstant(first + N * REF.synodicMonthDays, 0);
    add({
      group: OBS,
      kind: 'data',
      name: 'Mean synodic month over two thousand lunations',
      measured: (last - first) / N,
      expected: REF.synodicMonthDays,
      unit: 'days',
      tolerance: 5e-4,
      toleranceKind: 'absolute',
      why: 'A hundred and sixty years of lunations divided by their number: the long-baseline test of the mean rates in the series, which no single instant can provide. Residual is 1.5e-4 days, about thirteen seconds a lunation, and is dominated by the beat above rather than by the rates themselves.',
      source:
        'Mean synodic month, 29.530589 d, from the ELP lunar theory as given in Meeus, Astronomical Algorithms (2nd ed.), ch. 49.',
    });
  }

  {
    // Fourteen years on a half-day grid: enough anomalistic months that the
    // mean has converged, cheap enough that the suite does not notice.
    let sum = 0;
    let n = 0;
    let perigee = Infinity;
    for (let d = 0; d < 5000; d += 0.5) {
      const r = sky.lunarPosition(sky.J2000 + d).distanceKm;
      sum += r;
      n++;
      if (r < perigee) perigee = r;
    }
    add({
      group: OBS,
      kind: 'data',
      name: 'Time-averaged Earth-Moon distance is a(1 + e^2/2), not a',
      measured: sum / n,
      expected:
        REF.moonSemiMajorKm *
        (1 + (REF.moonEccentricity * REF.moonEccentricity) / 2),
      unit: 'km',
      tolerance: 5e-4,
      why: 'A check that would fail against the number most people would reach for. The published 384,400 km is the semi-major axis; the time average of the distance over an eccentric orbit is larger than that by a(1 + e^2/2), about 580 km. Comparing the series average to the semi-major axis directly would look like a 0.15% error in the series when it is a 0.15% error in the expectation, and writing this check down is what stops somebody "fixing" the constant term later.',
      source:
        'Lunar semi-major axis 384,399 km and eccentricity 0.0549, Explanatory Supplement to the Astronomical Almanac. The expected value is those two elements through the standard time-average <r> = a(1 + e^2/2), not a separately published figure.',
    });
    add({
      group: OBS,
      kind: 'data',
      name: 'Closest perigee in fourteen years',
      measured: perigee,
      expected: REF.moonPerigeeKm,
      unit: 'km',
      tolerance: 2e-3,
      why: 'The amplitude test the mean cannot give: the average above would be right even if every periodic term in the distance series were half its proper size. The extreme perigee is set by the largest of them, so this is the check that says they are the right size. Published closest approaches are a little under 356,500 km.',
      source:
        'Meeus, Mathematical Astronomy Morsels: the extreme perigee distance, about 356,400 km.',
    });
  }

  // --- Twilight ----------------------------------------------------------

  {
    // The equator at the June solstice, where the Sun's declination is
    // stationary and the closed form therefore has no competition from the
    // Sun's own motion in declination.
    const mid = sky.localMidnight(REF.juneSolstice2026Jd, 0);
    const dec = sky.solarPosition(mid).decDeg;
    const H = sky.hourAngleAtAltitude({
      declinationDeg: dec,
      latitudeDeg: 0,
      altitudeDeg: -18,
    }).hourAngleDeg;
    // 360 degrees a day, not 360.98565: the Sun's hour angle advances at the
    // SOLAR rate, because the Sun's own right ascension is what the extra
    // degree of sidereal rotation is chasing. Using the sidereal rate here
    // is the standard way to get a twilight time four minutes wrong.
    const analyticHours = ((2 * (180 - H)) / 360) * 24;
    const night = sky.observingNight({
      site: { latitudeDeg: 0, longitudeDeg: 0 },
      target: { raDeg: 0, decDeg: 0 },
      midnightJd: mid,
      options: { stepMinutes: 1, refineSeconds: 0.25 },
    });
    add({
      group: OBS,
      kind: 'analytic',
      name: 'Sampled astronomical night matches the closed form at the equator',
      measured: night.night.hours,
      expected: analyticHours,
      unit: 'hours',
      tolerance: 0.01,
      toleranceKind: 'absolute',
      why: 'The validation of the interval finder on the Sun. The closed form holds the declination fixed and the sampler does not, so the residual is the Sun moving during the night - at the solstice that is nearly nothing, which is why this date was chosen. Measured difference is under three seconds. A tolerance of 0.01 hours is thirty-six seconds, twelve times the residual and far under the four minutes a solar-versus-sidereal rate error would cost.',
    });

    // The latitude above which astronomical twilight lasts all night at the
    // June solstice, found by bisecting the sampler and compared with the
    // one-line condition dec + lat - 90 < -18.
    let lo = 40;
    let hi = 55;
    for (let i = 0; i < 30; i++) {
      const tryLat = (lo + hi) / 2;
      const hours = sky.observingNight({
        site: { latitudeDeg: tryLat, longitudeDeg: 0 },
        target: { raDeg: 0, decDeg: 0 },
        midnightJd: mid,
        options: { stepMinutes: 2 },
      }).night.hours;
      if (hours > 0) lo = tryLat;
      else hi = tryLat;
    }
    add({
      group: OBS,
      kind: 'analytic',
      name: 'Astronomical night vanishes at the latitude the geometry says',
      measured: (lo + hi) / 2,
      expected: 72 - dec,
      unit: 'degrees latitude',
      tolerance: 0.01,
      toleranceKind: 'absolute',
      why: 'At lower culmination the Sun is at altitude dec + lat - 90, so astronomical night requires lat < 72 - dec: about 48.56 degrees at the June solstice. This is a structural check rather than a numerical one - it says the sampler finds no window when and only when there is none, which is the failure a tolerance on a window length cannot catch, because zero hours and zero hours look the same however wrong the latitude.',
    });
  }

  // --- The window finder -------------------------------------------------

  {
    const midnight = sky.localMidnight(
      sky.julianDate(2026, 9, 15, 6),
      LA_SILLA.longitudeDeg
    );
    const night = sky.observingNight({
      site: LA_SILLA,
      target: HD209458,
      midnightJd: midnight,
      options: { stepMinutes: 1, refineSeconds: 0.25 },
    });
    const H = sky.hourAngleAtAltitude({
      declinationDeg: HD209458.decDeg,
      latitudeDeg: LA_SILLA.latitudeDeg,
      altitudeDeg: sky.altitudeForAirmass(2),
    }).hourAngleDeg;
    add({
      group: OBS,
      kind: 'analytic',
      name: 'Sampled target window matches the closed-form semi-arc',
      measured: night.targetUp.hours,
      expected: ((2 * H) / SIDEREAL_RATE) * 24,
      unit: 'hours',
      tolerance: 1e-3,
      toleranceKind: 'absolute',
      why: 'The other half of the interval-finder validation, and the tighter half: a star does not move, so the closed form is not an approximation here and the only difference between the two answers is the bisection. Sidereal rate this time, because a star is what the extra degree of rotation is measured against. Measured difference is a tenth of a second; the tolerance is 3.6 seconds.',
    });
  }

  add({
    group: OBS,
    kind: 'analytic',
    name: 'A window open for the whole span is reported as clipped at both ends',
    measured: (() => {
      const found = sky.findIntervals(() => true, 0, 1, { stepMinutes: 10 });
      return found.length === 1 && found[0].clippedStart && found[0].clippedEnd;
    })(),
    expected: true,
    tolerance: 0,
    why: 'A sampler that reported "the window opens at 19:04" when the truth is "it was already open when we started looking" has told a student something false about the sky. The flags are how the module refuses to do that, and they are load-bearing for any caller that draws a window on a timeline.',
  });

  add({
    group: OBS,
    kind: 'analytic',
    name: 'A predicate that never holds yields no windows at all',
    measured: sky.findIntervals(() => false, 0, 1, { stepMinutes: 10 }).length,
    expected: 0,
    unit: 'windows',
    tolerance: 0,
    why: 'The degenerate case on the other side. Written down because the obvious implementation of an interval finder - open one at the first sample, close it at the last - returns one empty interval here, and an empty interval is not the same answer as no interval to anything that counts nights.',
  });

  {
    // The Moon cannot shine on a target from below the horizon. Both halves
    // of the rule are checked at real instants, with the separation cut set
    // to 180 degrees so the Moon is the only thing that can veto.
    const vetoAny = { moonSeparationDeg: 180 };
    let moonDown = null;
    let moonUp = null;
    const start = sky.julianDate(2026, 9, 5, 0);
    for (let d = 0; d < 40 && !(moonDown && moonUp); d += 1 / 720) {
      const jd = start + d;
      const base = sky.observability(jd, {
        site: LA_SILLA,
        target: HD209458,
      });
      if (!base.ok) continue;
      const strict = sky.observability(jd, {
        site: LA_SILLA,
        target: HD209458,
        options: vetoAny,
      });
      if (base.moonAltitudeDeg < 0 && !moonDown) moonDown = strict.ok;
      if (base.moonAltitudeDeg > 0 && !moonUp) moonUp = strict.reason;
    }
    add({
      group: OBS,
      kind: 'analytic',
      name: 'A Moon below the horizon does not veto, however close it is',
      measured: moonDown,
      expected: true,
      tolerance: 0,
      why: 'With the avoidance radius set to 180 degrees the Moon vetoes everything it can veto, so this instant is usable if and only if the altitude test is being applied. Without it a programme refuses perfectly dark hours for a Moon that has set, and the hours it refuses are the end of the night - which for a target low in the west is all the time there is.',
    });
    add({
      group: OBS,
      kind: 'analytic',
      name: 'A Moon above the horizon does veto',
      measured: moonUp,
      expected: 'moon',
      tolerance: 0,
      why: 'The other half, at a real instant from the same search. Two checks because a rule that never vetoed would pass the first one.',
    });
  }

  // --- The premise of the planning exercise ------------------------------
  //
  // A lesson makes claims about a real target at a real site, and those
  // claims are as checkable as any equation here. These are the three the
  // exercise stands on. If the site moved, the target changed or the airmass
  // limit were loosened, the lesson would stop teaching what it says it
  // teaches - and it would do so silently, because the run would still
  // produce numbers.

  add({
    group: OBS,
    kind: 'analytic',
    name: 'HD 209458 never rises above 42 degrees from La Silla',
    measured: sky.altAz({
      hourAngleDeg: 0,
      declinationDeg: HD209458.decDeg,
      latitudeDeg: LA_SILLA.latitudeDeg,
    }).altitudeDeg,
    expected: 90 - Math.abs(LA_SILLA.latitudeDeg - HD209458.decDeg),
    unit: 'degrees',
    tolerance: 1e-12,
    why: "The whole reason the exercise works from this site: a target at declination +18.9 seen from latitude -29.3 is never better than airmass 1.5, so the airmass limit bites for most of every night and the usable window is a few hours rather than the whole of it. From a northern site the same target is overhead and there is no investigation. This was `data` with an expected value of 41.8595 and a source naming the catalogue entries, which was the Pluto mistake again: nobody published a culmination altitude for this pair, and 41.8595 is 90 - |phi - delta| computed from the two stored elements and written down to four places. It is the same identity as 'Culmination altitude is 90 minus the latitude-declination gap' above, instantiated at the site and target the investigation uses - so it is checked at machine precision against the closed form, and the stored elements are what it pins. The elements' own provenance is on LA_SILLA and HD209458 where they are declared.",
  });

  add({
    group: OBS,
    kind: 'analytic',
    name: 'The target is above airmass 2 for under five hours a night',
    measured:
      ((2 *
        sky.hourAngleAtAltitude({
          declinationDeg: HD209458.decDeg,
          latitudeDeg: LA_SILLA.latitudeDeg,
          altitudeDeg: sky.altitudeForAirmass(2),
        }).hourAngleDeg) /
        SIDEREAL_RATE) *
      24,
    expected: 5,
    unit: 'hours',
    tolerance: 0,
    toleranceKind: 'bound',
    why: 'The budget the student is spending. Measured at 4.96 hours, which is a fifth of a day: an epoch placed anywhere in it is within about a tenth of a day of the same sidereal time on any other night, and that is the constraint the whole exercise is about. Written as a bound because the investigation claims "under five hours" and a check that pinned the digit would fail on a sensible change to the airmass limit while the claim stayed true.',
  });

  {
    // The punchline, measured. Consecutive usable windows open one SIDEREAL
    // day apart, not one solar day, because the window is set by the
    // target's hour angle and not by the clock.
    const first = sky.localMidnight(
      sky.julianDate(2026, 9, 5, 6),
      LA_SILLA.longitudeDeg
    );
    const run = sky.observingRun({
      site: LA_SILLA,
      target: HD209458,
      firstMidnightJd: first,
      nights: 12,
      options: { stepMinutes: 5, refineSeconds: 0.1 },
    });
    const starts = run.map(n => n.usable.intervals[0].startJd);
    const gaps = starts.slice(1).map((s, i) => s - starts[i]);
    add({
      group: OBS,
      kind: 'data',
      name: 'Consecutive observing windows open one sidereal day apart',
      measured: gaps.reduce((a, b) => a + b, 0) / gaps.length,
      expected: REF.siderealDayDays,
      unit: 'days',
      tolerance: 1e-6,
      toleranceKind: 'absolute',
      why: 'The fact the planning exercise exists to teach, checked rather than asserted. A student who observes their target at the best moment of each night is sampling on a comb whose spacing is the sidereal day, so their schedule has an alias at 1.00274 cycles per day whatever they do - and the alias is at the sidereal frequency rather than at one per day, which is visible in the spectral window and is the detail that tells them the comb came from the sky rather than from their own habits. Measured spread across twelve nights is under a tenth of a second.',
      source:
        'IAU 1982 / Aoki et al. (1982), A&A 105, 359; the sidereal day of 23h 56m 04.0905s as tabulated in the Explanatory Supplement to the Astronomical Almanac.',
    });
    add({
      group: OBS,
      kind: 'analytic',
      name: 'Every night of the allocation has a usable window',
      measured: run.filter(n => n.usable.hours > 2).length,
      expected: 12,
      unit: 'nights',
      tolerance: 0,
      why: 'A check on the scenario rather than on the astronomy. The exercise hands the student twelve nights and tells them to choose; if the Moon or the season had closed one of them the investigation would be about something else, and it would close quietly - an empty window is a valid answer, not an error. Two hours is the floor at which a night is worth a visit.',
    });
  }
}
