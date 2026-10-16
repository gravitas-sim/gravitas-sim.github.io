// =============================================================================
// The inspector's content: what each kind of body says about itself. One
// builder per kind (black hole, star, planet, gas giant, asteroid, neutron
// star, white dwarf, galaxy, comet) turns a physics object into the rows, the
// description and the headline the inspector panel renders, and the radius
// constants the mass sliders scale from.
// -----------------------------------------------------------------------------
// Extracted from js/ui.js (Prompt 107, slice 4) without a change of behavior.
// Every export is a function of its body and of the shared state it already
// read; nothing here touches the DOM, holds state of its own or imports ui.js.
// =============================================================================

import { EARTH_MASSES_PER_JUPITER_MASS } from './constants.js';
import { formatNumber, withUnit } from './format.js';
import {
  bh_list,
  stars,
  neutron_stars,
  white_dwarfs,
  SOLAR_MASS_UNIT,
  EARTH_MASS_UNIT,
  HALLEY_MASS_UNIT,
  JUPITER_MASS_UNIT,
} from './physics.js';
import { solarHTML, earthHTML, jupiterHTML } from './utils.js';
import { t } from './i18n/index.js';
import { orbitalElements, dominantPrimary } from './orbital.js';
import { timeUnitSeconds, formatSpeed, formatDistance } from './units.js';
import { blackHoleFacts, yearsLabel } from './blackHolePhysics.js';
import { stellarStateFor, spectralType } from './stellar/state.js';
import { SETTINGS } from './appState.js';

// Object inspection functions - copied from working original file
export const PLANET_RADIUS = 5; // From physics.js
export const GAS_GIANT_RADIUS = 8; // From physics.js
// 10, matching physics.js. It said 20 here, and had since the inspector was
// copied out of the original file, so every star's radius row was reported at
// half its real value in both solar radii and kilometers - and the surface
// gravity and escape velocity derived from it were wrong by four and by the
// square root of two. The other four constants in this block do match.
export const STAR_OBJ_RADIUS = 10; // From physics.js
export const NEUTRON_STAR_RADIUS = 3; // From physics.js
export const WHITE_DWARF_RADIUS = 8; // From physics.js
export const ASTEROID_RADIUS = 2; // From physics.js

export const getBlackHoleInfo = bh => {
  const massInSuns = bh.mass / SOLAR_MASS_UNIT;
  // Every derived number comes from blackHolePhysics.js, which is also what the
  // "Black Holes by the Numbers" investigation reads. The lesson asks students
  // to discover the trends in exactly these quantities, so the two have to
  // agree to the last digit.
  const f = blackHoleFacts(massInSuns);
  const bhType = f.category;

  return {
    icon: '\u26ab',
    title: bh.name || 'Black Hole',
    stats: [
      {
        label: t('inspector.stat.mass'),
        value: `${solarHTML(formatNumber(massInSuns))} (${withUnit(f.massKg, 'kg')})`,
      },
      {
        label: t('inspector.stat.schwarzschildRadius'),
        value: `${withUnit(f.rsKm, 'km')} (${withUnit(f.rsAU, 'AU')})`,
      },
      {
        label: t('inspector.stat.escapeVelocityAtRs'),
        value: '100.0% of light speed',
      },
      {
        label: t('inspector.stat.averageDensity'),
        value: withUnit(f.density, 'kg/m\u00b3'),
      },
      {
        label: t('inspector.stat.hawkingTemperature'),
        value: withUnit(f.temperature, 'K'),
      },
      {
        // toFixed() gives up above 1e21 and returns the raw float, so this row
        // used to read "2.0973585980140657e+61 billion years".
        label: t('inspector.stat.hawkingLifetime'),
        value: yearsLabel(f.lifetimeYears),
      },
      {
        // A stellar-mass hole's innermost stable orbit takes milliseconds, and
        // rounding that to "0.0 hours" hid the most striking thing about it.
        label: t('inspector.stat.iscoPeriod'),
        value:
          f.iscoPeriodSeconds < 60
            ? withUnit(f.iscoPeriodSeconds, 's')
            : withUnit(f.iscoPeriodHours, 'hours'),
      },
      { label: t('inspector.stat.type'), value: bhType },
      {
        label: t('inspector.stat.position'),
        value: `(${bh.pos.x.toFixed(1)}, ${bh.pos.y.toFixed(1)})`,
      },
      {
        label: t('inspector.stat.velocity'),
        value: formatSpeed(Math.hypot(bh.vel.x, bh.vel.y)),
      },
    ],
    description: `A ${bhType.toLowerCase()} black hole with ${massInSuns > 1e6 ? 'enormous' : massInSuns > 100 ? 'substantial' : massInSuns > 3 ? 'moderate' : 'minimal'} mass. The event horizon has a radius of ${f.rsKm.toFixed(1)} km. ${f.temperature > 1 ? 'This black hole emits Hawking radiation.' : 'This black hole is too massive to emit significant Hawking radiation.'} ${massInSuns > 1e6 ? 'Supermassive black holes like this power active galactic nuclei and quasars.' : massInSuns > 100 ? 'Intermediate black holes are rare and may form from merging stellar-mass black holes.' : massInSuns > 3 ? 'Stellar-mass black holes form from the collapse of massive stars.' : 'Primordial black holes may have formed in the early universe.'}`,
  };
};

/**
 * Orbital period of a body about whatever it is actually orbiting, in days.
 *
 * Replaces four copies of a calculation that assumed a 1000-unit primary
 * sitting at the origin and measured distance from the origin rather than from
 * the primary, on a length scale that matched neither the simulation nor
 * units.js. In the Kepler scenario it reported 3.1 days for an orbit whose real
 * period is about 1.7 years, which is the sort of number a student is asked to
 * write down in an investigation.
 *
 * @param {Object} body - The orbiting object
 * @returns {number|null} Period in days, or null if unbound or with no primary
 */
const realOrbitalPeriodDays = body => {
  if (!body?.pos) return null;
  const primary = dominantPrimary(
    body,
    [...bh_list, ...stars, ...neutron_stars, ...white_dwarfs].filter(
      p => p !== body
    )
  );
  if (!primary) return null;
  const el = orbitalElements(body, primary, SETTINGS.gravitational_constant);
  if (!el || !el.bound || !isFinite(el.period)) return null;
  return (el.period * timeUnitSeconds()) / 86400;
};

/**
 * Format an orbital period for the inspector.
 * @param {number|null} days - Period in days
 * @returns {string} Display text
 */
const formatOrbitalPeriod = days => {
  if (days === null) return 'unbound';
  if (days > 365) return withUnit(days / 365, 'years');
  if (days < 1) return withUnit(days * 24, 'hours');
  return withUnit(days, 'days');
};

export const getStarInfo = star => {
  // One description, shared with the renderer, the habitable-zone ring and the
  // light curve. This function used to compute its own temperature from a
  // linear fit in mass, its own luminosity from a single power law and its own
  // spectral type from mass thresholds, and it ignored every measured value a
  // star carried - so TRAPPIST-1's card said 3350 K while the habitable zone
  // drawn around it in the same frame used its measured 2566 K.
  const state = stellarStateFor(star, SOLAR_MASS_UNIT);
  const massInSuns = state.currentMassSun;
  const massInKg = massInSuns * 1.989e30;

  // Two radii, and they are not the same thing. The photospheric radius is
  // physical and comes from the luminosity and the temperature; the simulation
  // radius is what collisions use and is a made-up scale. The card shows the
  // physical one, because that is what "radius" means about a star.
  const radiusInSuns = state.radiusSun;
  const radiusInKm = radiusInSuns * 696340;
  const radiusInM = radiusInKm * 1000;

  const G = 6.6743e-11;
  const surfaceGravity = (G * massInKg) / (radiusInM * radiusInM);
  const escapeVelocity = Math.sqrt((2 * G * massInKg) / radiusInM);
  const orbitalPeriodDays = realOrbitalPeriodDays(star);
  const type = spectralType(state.teffK);

  /** Mark a number the model guessed rather than was told. */
  const maybe = (field, text) =>
    state.estimatedFields.includes(field)
      ? `${text} <span class="inspector-estimated">${t('inspector.estimated')}</span>`
      : text;

  const stats = [
    {
      label: t('inspector.stat.mass'),
      value: `${solarHTML(formatNumber(massInSuns))} (${withUnit(massInKg, 'kg')})`,
    },
    {
      label: t('inspector.stat.radius'),
      tooltipKey: 'radius',
      value: maybe(
        'radiusSun',
        `${solarHTML(formatNumber(radiusInSuns), 'R')} (${withUnit(radiusInKm, 'km')})`
      ),
    },
    {
      label: t('inspector.stat.surfaceTemperature'),
      value: maybe('teffK', withUnit(state.teffK, 'K')),
    },
    {
      label: t('inspector.stat.luminosity'),
      value: maybe(
        'luminositySun',
        solarHTML(formatNumber(state.luminositySun), 'L')
      ),
    },
    {
      label: t('inspector.stat.surfaceGravity'),
      value: withUnit(surfaceGravity, 'm/s²'),
    },
    {
      label: t('inspector.stat.escapeVelocity'),
      value: withUnit(escapeVelocity / 1000, 'km/s'),
    },
    { label: t('inspector.stat.spectralType'), value: type },
  ];

  // Nor where a prescribed model is driving this star and has not supplied an
  // age. That is a lesson's free H-R cursor: a temperature and a luminosity,
  // which between them fix a radius and fix nothing else. The mass on this
  // body is the mass it was built with, so a main-sequence lifetime computed
  // from it is a true statement about a different object - a star that is not
  // at 10,000 K and one solar luminosity. See js/lesson/starState.js.
  const hypothetical =
    star?.model_owned === true && !Number.isFinite(star.ageYr);

  // Only where the star is actually on the main sequence. A red giant has a
  // main-sequence lifetime in its past, and printing one as though it were
  // ahead of the star is the kind of small false statement this pass exists to
  // remove.
  if (hypothetical) {
    stats.push({
      label: t('inspector.stat.lifespan'),
      value: t('inspector.stat.lifespan.hypothetical'),
    });
  } else if (state.phase === 'main-sequence' || state.phase === 'unknown') {
    stats.push({
      label: t('inspector.stat.lifespan'),
      value: maybe(
        'luminositySun',
        withUnit(state.mainSequenceYr / 1e9, 'billion years')
      ),
    });
  } else {
    stats.push({
      label: t('inspector.stat.phase'),
      value: t(`stellar.phase.${state.phase}`),
    });
  }

  if (Number.isFinite(state.ageYr)) {
    stats.push({
      label: t('inspector.stat.age'),
      value: withUnit(state.ageYr / 1e6, 'million years'),
    });
  }

  stats.push(
    {
      label: t('inspector.stat.orbitalPeriod'),
      value: formatOrbitalPeriod(orbitalPeriodDays),
    },
    {
      label: t('inspector.stat.position'),
      value: `(${star.pos.x.toFixed(1)}, ${star.pos.y.toFixed(1)})`,
    },
    {
      label: t('inspector.stat.velocity'),
      value: formatSpeed(Math.hypot(star.vel.x, star.vel.y)),
    }
  );

  return {
    icon: '⭐',
    title: star.name || 'Star',
    stats,
    description: t(
      state.estimated
        ? 'inspector.star.describedFromMass'
        : 'inspector.star.describedFromModel',
      { type, class: t(`stellar.class.${state.luminosityClass}`) }
    ),
  };
};

export const getPlanetInfo = planet => {
  // The fallback divides by the Earth unit, not by 1. Dividing by 1 reports the
  // raw simulation mass as though it were a number of Earth masses, which is
  // wrong by a factor of 333 and is the same failure MASS_UNITS.md documents.
  const massInEarths = planet.massInEarths ?? planet.mass / EARTH_MASS_UNIT;
  const radiusInEarths = planet.radius / PLANET_RADIUS;
  const radiusInKm = radiusInEarths * 6371; // Earth radius in km
  const massInKg = massInEarths * 5.972e24; // Earth mass in kg

  // Real density calculation (kg/m³)
  const volume = (4 / 3) * Math.PI * Math.pow(radiusInKm * 1000, 3); // Convert km to m
  const density = massInKg / volume;

  // Real escape velocity (m/s)
  const G = 6.6743e-11; // Gravitational constant
  const escapeVelocity = Math.sqrt((2 * G * massInKg) / (radiusInKm * 1000));

  // Real orbital period (if orbiting a central mass)
  const orbitalPeriodDays = realOrbitalPeriodDays(planet);

  // Real surface gravity (m/s²)
  const surfaceGravity = (G * massInKg) / Math.pow(radiusInKm * 1000, 2);

  let planetType = 'Terrestrial';
  if (massInEarths > 10) planetType = 'Ice Giant';
  else if (massInEarths > 5) planetType = 'Gas Giant';
  else if (massInEarths > 0.5) planetType = 'Super-Earth';
  else planetType = 'Dwarf Planet';

  // Use the planet's actual density type if available
  const densityType = planet.density || 'rocky';
  let densityDescription = '';
  switch (densityType) {
    case 'gaseous':
      densityDescription =
        'Gaseous composition with hydrogen and helium atmosphere';
      break;
    case 'icy':
      densityDescription = 'Icy composition with frozen volatiles';
      break;
    case 'rocky':
    default:
      densityDescription = 'Rocky composition with solid surface';
      break;
  }

  return {
    icon: '🪐',
    title: planet.name || 'Planet',
    stats: [
      {
        label: t('inspector.stat.mass'),
        value: `${earthHTML(formatNumber(massInEarths))} (${withUnit(massInKg, 'kg')})`,
      },
      {
        label: t('inspector.stat.radius'),
        tooltipKey: 'radius',
        value: `${withUnit(radiusInEarths, 'R⊕')} (${withUnit(radiusInKm, 'km')})`,
      },
      { label: t('inspector.stat.density'), value: withUnit(density, 'kg/m³') },
      {
        label: t('inspector.stat.surfaceGravity'),
        value: withUnit(surfaceGravity, 'm/s²'),
      },
      {
        label: t('inspector.stat.escapeVelocity'),
        value: withUnit(escapeVelocity / 1000, 'km/s'),
      },
      {
        label: t('inspector.stat.orbitalPeriod'),
        value: formatOrbitalPeriod(orbitalPeriodDays),
      },
      { label: t('inspector.stat.type'), value: planetType },
      {
        label: t('inspector.stat.position'),
        value: `(${planet.pos.x.toFixed(1)}, ${planet.pos.y.toFixed(1)})`,
      },
      {
        label: t('inspector.stat.velocity'),
        value: formatSpeed(Math.hypot(planet.vel.x, planet.vel.y)),
      },
    ],
    description: `A ${planetType.toLowerCase()} with ${massInEarths > 10 ? 'substantial' : massInEarths > 1 ? 'moderate' : 'low'} mass. ${densityDescription}. ${planetType === 'Terrestrial' ? 'This rocky world could potentially support life.' : planetType === 'Gas Giant' ? 'This gaseous planet has no solid surface.' : planetType === 'Ice Giant' ? 'This icy world is composed mainly of frozen volatiles.' : 'This small world may be a captured asteroid or dwarf planet.'}`,
  };
};

export const getGasGiantInfo = gasGiant => {
  const massInJupiters =
    gasGiant.massInJupiters || gasGiant.mass / JUPITER_MASS_UNIT;
  const massInEarths = massInJupiters * EARTH_MASSES_PER_JUPITER_MASS;
  const radiusInJupiters = gasGiant.radius / GAS_GIANT_RADIUS;
  const radiusInEarths = radiusInJupiters * 11.2; // Convert Jupiter radius to Earth radius (1 Jupiter = 11.2 Earth radii)
  const radiusInKm = radiusInEarths * 6371; // Earth radius in km
  const massInKg = massInEarths * 5.972e24; // Earth mass in kg

  // Real density calculation (kg/m³)
  const volume = (4 / 3) * Math.PI * Math.pow(radiusInKm * 1000, 3);
  const density = massInKg / volume;

  // Real escape velocity (m/s)
  const G = 6.6743e-11;
  const escapeVelocity = Math.sqrt((2 * G * massInKg) / (radiusInKm * 1000));

  // Real surface gravity (m/s²)
  const surfaceGravity = (G * massInKg) / Math.pow(radiusInKm * 1000, 2);

  // Real orbital period
  const orbitalPeriodDays = realOrbitalPeriodDays(gasGiant);

  // Use the actual giant type from the object, or determine from mass
  let giantType = gasGiant.giantType || 'Gas Giant';
  if (!gasGiant.giantType) {
    if (massInJupiters > 13) giantType = 'Brown Dwarf';
    else if (massInJupiters > 5) giantType = 'Super-Jupiter';
    else if (massInJupiters > 1) giantType = 'Jupiter-like';
    else if (massInJupiters > 0.5) giantType = 'Neptune-like';
    else giantType = 'Mini-Neptune';
  }

  // Convert giant type to display format
  const displayType = giantType
    .replace('_', ' ')
    .replace(/\b\w/g, l => l.toUpperCase());

  return {
    icon: '🪐',
    title: gasGiant.name || 'Gas Giant',
    stats: [
      {
        label: t('inspector.stat.mass'),
        value: `${jupiterHTML(formatNumber(massInJupiters))} · ${earthHTML(formatNumber(massInEarths))}`,
      },
      {
        label: t('inspector.stat.radius'),
        tooltipKey: 'radius',
        value: `${withUnit(radiusInEarths, 'R⊕')} (${withUnit(radiusInKm, 'km')})`,
      },
      { label: t('inspector.stat.density'), value: withUnit(density, 'kg/m³') },
      {
        label: t('inspector.stat.surfaceGravity'),
        value: withUnit(surfaceGravity, 'm/s²'),
      },
      {
        label: t('inspector.stat.escapeVelocity'),
        value: withUnit(escapeVelocity / 1000, 'km/s'),
      },
      {
        label: t('inspector.stat.orbitalPeriod'),
        value: formatOrbitalPeriod(orbitalPeriodDays),
      },
      { label: t('inspector.stat.type'), value: displayType },
      ...(gasGiant.hasRings
        ? [
            {
              label: t('inspector.stat.rings'),
              value: t('inspector.rings.visible'),
              tooltipKey: 'rings',
            },
          ]
        : []),
      {
        label: t('inspector.stat.position'),
        value: `(${gasGiant.pos.x.toFixed(1)}, ${gasGiant.pos.y.toFixed(1)})`,
      },
      {
        label: t('inspector.stat.velocity'),
        value: formatSpeed(Math.hypot(gasGiant.vel.x, gasGiant.vel.y)),
      },
    ],
    description: `A ${displayType.toLowerCase()} with ${massInEarths > 3000 ? 'enormous' : massInEarths > 1000 ? 'substantial' : 'moderate'} mass. ${giantType === 'brown_dwarf' ? 'This object is massive enough to fuse deuterium but not hydrogen, making it a failed star.' : giantType === 'super_jupiter' ? 'This massive gas giant has extreme atmospheric pressures and may have formed directly from a protoplanetary disk.' : giantType === 'jupiter_like' ? 'This Jupiter-like planet has a thick hydrogen-helium atmosphere with distinctive banding patterns.' : giantType === 'neptune_like' ? 'This Neptune-like ice giant has a composition rich in water, ammonia, and methane ices.' : 'This mini-Neptune has a substantial atmosphere but is smaller than typical gas giants.'}`,
  };
};
export const getAsteroidInfo = asteroid => {
  // Divided by the Earth unit rather than by a literal 1: this row is what the
  // inspector shows next to a mass slider that works in Earth masses, and the
  // two have to be the same number.
  const massInEarths = asteroid.mass / EARTH_MASS_UNIT;
  const massInKg = massInEarths * 5.972e24;
  const radiusInKm = asteroid.radius * 1000; // Rough conversion
  const radiusInM = radiusInKm * 1000;

  // Real density calculation (kg/m³)
  const volume = (4 / 3) * Math.PI * Math.pow(radiusInM, 3);
  const density = massInKg / volume;

  // Real escape velocity (m/s)
  const G = 6.6743e-11;
  const escapeVelocity = Math.sqrt((2 * G * massInKg) / radiusInM);

  // Real surface gravity (m/s²)
  const surfaceGravity = (G * massInKg) / Math.pow(radiusInM, 2);

  // Real orbital period
  const orbitalPeriodDays = realOrbitalPeriodDays(asteroid);

  let asteroidType = 'Asteroid';
  if (asteroid.radius > 5) asteroidType = 'Dwarf Planet';
  else if (asteroid.radius > 2) asteroidType = 'Large Asteroid';
  else asteroidType = 'Small Asteroid';

  return {
    icon: '☄️',
    title: asteroid.name || 'Asteroid',
    stats: [
      {
        label: t('inspector.stat.mass'),
        value: `${earthHTML(formatNumber(massInEarths, { sig: 4 }))} (${withUnit(massInKg, 'kg')})`,
      },
      {
        label: t('inspector.stat.radius'),
        tooltipKey: 'radius',
        value: withUnit(radiusInKm, 'km'),
      },
      { label: t('inspector.stat.density'), value: withUnit(density, 'kg/m³') },
      {
        label: t('inspector.stat.surfaceGravity'),
        value: withUnit(surfaceGravity, 'm/s²'),
      },
      {
        label: t('inspector.stat.escapeVelocity'),
        value: withUnit(escapeVelocity / 1000, 'km/s'),
      },
      {
        label: t('inspector.stat.orbitalPeriod'),
        value: formatOrbitalPeriod(orbitalPeriodDays),
      },
      { label: t('inspector.stat.type'), value: asteroidType },
      {
        label: t('inspector.stat.position'),
        value: `(${asteroid.pos.x.toFixed(1)}, ${asteroid.pos.y.toFixed(1)})`,
      },
      {
        label: t('inspector.stat.velocity'),
        value: formatSpeed(Math.hypot(asteroid.vel.x, asteroid.vel.y)),
      },
    ],
    description: `A ${asteroidType.toLowerCase()} with ${asteroid.radius > 5 ? 'significant' : asteroid.radius > 2 ? 'moderate' : 'minimal'} mass. ${asteroidType === 'Dwarf Planet' ? 'This object is large enough to be rounded by its own gravity.' : 'This rocky body orbits in the system, potentially as part of a belt or as a rogue object.'}`,
  };
};

export const getNeutronStarInfo = neutronStar => {
  const massInSuns =
    neutronStar.massInSuns || neutronStar.mass / SOLAR_MASS_UNIT;
  const radiusInKm = neutronStar.radius * 1000; // Rough conversion to km
  const density =
    neutronStar.mass / (Math.PI * neutronStar.radius * neutronStar.radius);
  const escapeVelocity = Math.sqrt(
    (2 * SETTINGS.gravitational_constant * neutronStar.mass) /
      neutronStar.radius
  );
  const schwarzschildRadius =
    (2 * SETTINGS.gravitational_constant * neutronStar.mass) / (3e8 * 3e8); // Simplified

  const starType = neutronStar.starType || 'Neutron Star';
  const isPulsar = neutronStar.pulsar || false;

  return {
    icon: isPulsar ? '⚡' : '⭐',
    title: neutronStar.name || starType,
    stats: [
      {
        label: t('inspector.stat.mass'),
        value: solarHTML(formatNumber(massInSuns)),
      },
      {
        label: t('inspector.stat.radius'),
        tooltipKey: 'radius',
        value: withUnit(radiusInKm, 'km'),
      },
      {
        label: t('inspector.stat.density'),
        value: withUnit(density, 'mass/unit²'),
      },
      {
        label: t('inspector.stat.escapeVelocity'),
        value: formatSpeed(escapeVelocity),
      },
      {
        label: t('inspector.stat.schwarzschildRadius'),
        value: formatDistance(schwarzschildRadius),
      },
      { label: t('inspector.stat.type'), value: starType },
      { label: t('inspector.stat.pulsar'), value: isPulsar ? 'Yes' : 'No' },
      {
        label: t('inspector.stat.position'),
        value: `(${neutronStar.pos.x.toFixed(1)}, ${neutronStar.pos.y.toFixed(1)})`,
      },
      {
        label: t('inspector.stat.velocity'),
        value: formatSpeed(Math.hypot(neutronStar.vel.x, neutronStar.vel.y)),
      },
    ],
    description: `A ${starType.toLowerCase()} with ${massInSuns > 2.0 ? 'extreme' : 'high'} density. ${isPulsar ? 'This pulsar emits regular beams of radiation as it rotates.' : 'This neutron star is the collapsed core of a massive star.'} ${starType === 'Magnetar' ? 'This magnetar has an extremely strong magnetic field, making it one of the most powerful objects in the universe.' : starType === 'Pulsar' ? 'This pulsar rotates rapidly, emitting beams of radiation that sweep across space.' : 'This neutron star is composed almost entirely of neutrons, making it incredibly dense.'}`,
  };
};

export const getWhiteDwarfInfo = whiteDwarf => {
  const massInSuns = whiteDwarf.massInSuns || whiteDwarf.mass / SOLAR_MASS_UNIT;
  const radiusInEarths = whiteDwarf.radius / PLANET_RADIUS; // Compare to Earth radius
  const density =
    whiteDwarf.mass / (Math.PI * whiteDwarf.radius * whiteDwarf.radius);
  const escapeVelocity = Math.sqrt(
    (2 * SETTINGS.gravitational_constant * whiteDwarf.mass) / whiteDwarf.radius
  );
  const chandrasekharLimit = 1.4; // Solar masses

  const dwarfType = whiteDwarf.dwarfType || 'Carbon-Oxygen';

  return {
    icon: '⭐',
    title: whiteDwarf.name || 'White Dwarf',
    stats: [
      {
        label: t('inspector.stat.mass'),
        value: solarHTML(formatNumber(massInSuns)),
      },
      {
        label: t('inspector.stat.radius'),
        tooltipKey: 'radius',
        value: withUnit(radiusInEarths, 'R⊕'),
      },
      {
        label: t('inspector.stat.density'),
        value: withUnit(density, 'mass/unit²'),
      },
      {
        label: t('inspector.stat.escapeVelocity'),
        value: formatSpeed(escapeVelocity),
      },
      {
        label: t('inspector.stat.chandrasekharLimit'),
        value: solarHTML(chandrasekharLimit),
      },
      { label: t('inspector.stat.type'), value: dwarfType },
      {
        label: t('inspector.stat.position'),
        value: `(${whiteDwarf.pos.x.toFixed(1)}, ${whiteDwarf.pos.y.toFixed(1)})`,
      },
      {
        label: t('inspector.stat.velocity'),
        value: formatSpeed(Math.hypot(whiteDwarf.vel.x, whiteDwarf.vel.y)),
      },
    ],
    description: `A ${dwarfType.toLowerCase()} white dwarf with ${massInSuns > 1.2 ? 'high' : massInSuns > 0.6 ? 'moderate' : 'low'} mass. ${dwarfType === 'Oxygen-Neon' ? 'This massive white dwarf is near the Chandrasekhar limit and may become a neutron star.' : dwarfType === 'Carbon-Oxygen' ? 'This is the most common type of white dwarf, composed of carbon and oxygen.' : 'This low-mass white dwarf is composed primarily of helium.'} ${massInSuns > chandrasekharLimit ? 'This white dwarf exceeds the Chandrasekhar limit and may collapse into a neutron star.' : 'This white dwarf is stable and will slowly cool over billions of years.'}`,
  };
};

/**
 * Inspector contents for a galaxy.
 *
 * The mass is reported in solar masses like everything else in the app, and the
 * scenarios that contain galaxies say plainly that they are scale models. A
 * real cluster member is around 10^11 solar masses and a real cluster is
 * megaparsecs across; running those numbers would need the whole unit system
 * rebuilt for no gain, because what the lesson measures is a ratio of two
 * masses and a ratio does not care what the units were.
 *
 * @param {Object} galaxy - Galaxy object
 * @returns {Object} Info for the inspector
 */
export const getGalaxyInfo = galaxy => {
  const massInSuns = galaxy.mass / SOLAR_MASS_UNIT;
  const speed = Math.hypot(galaxy.vel.x, galaxy.vel.y);
  const type = galaxy.galaxyType === 'elliptical' ? 'Elliptical' : 'Spiral';

  return {
    icon: '🌌',
    title: galaxy.name || 'Galaxy',
    stats: [
      {
        label: t('inspector.stat.mass'),
        value: solarHTML(formatNumber(massInSuns)),
      },
      { label: t('inspector.stat.type'), value: type },
      { label: t('inspector.stat.speed'), value: formatSpeed(speed) },
      {
        label: t('inspector.stat.position'),
        value: `(${galaxy.pos.x.toFixed(1)}, ${galaxy.pos.y.toFixed(1)})`,
      },
      {
        label: t('inspector.stat.velocity'),
        value: `(${formatSpeed(galaxy.vel.x)}, ${formatSpeed(galaxy.vel.y)})`,
      },
    ],
    description:
      type === 'Spiral'
        ? 'A disc of stars, gas and dust with spiral arms, seen here at an angle. Inside it the stars orbit the center; from outside, in a cluster, the whole thing counts as a single moving mass.'
        : 'A rounded swarm of old stars with little gas left to form new ones. The largest galaxies in a cluster are usually of this kind, sitting near its center.',
  };
};

export const getCometInfo = comet => {
  // Halley masses. The 0.1 that was here was a third copy of the constant the
  // Comet constructor had wrong.
  const massInComets = comet.massInComets ?? comet.mass / HALLEY_MASS_UNIT;
  const radiusInKm = comet.radius * 1000; // Rough conversion to km
  const density = comet.mass / (Math.PI * comet.radius * comet.radius);
  const escapeVelocity = Math.sqrt(
    (2 * SETTINGS.gravitational_constant * comet.mass) / comet.radius
  );
  const tailLength = comet.tailLength || 35;

  const cometType = comet.cometType || 'short_period';
  const displayType = cometType
    .replace('_', ' ')
    .replace(/\b\w/g, l => l.toUpperCase());

  return {
    icon: '☄️',
    title: comet.name || 'Comet',
    stats: [
      { label: t('inspector.stat.mass'), value: withUnit(massInComets, 'C') },
      {
        label: t('inspector.stat.radius'),
        tooltipKey: 'radius',
        value: withUnit(radiusInKm, 'km'),
      },
      {
        label: t('inspector.stat.density'),
        value: withUnit(density, 'mass/unit²'),
      },
      {
        label: t('inspector.stat.escapeVelocity'),
        value: formatSpeed(escapeVelocity),
      },
      {
        label: t('inspector.stat.tailLength'),
        value: formatDistance(tailLength),
      },
      { label: t('inspector.stat.type'), value: displayType },
      {
        label: t('inspector.stat.position'),
        value: `(${comet.pos.x.toFixed(1)}, ${comet.pos.y.toFixed(1)})`,
      },
      {
        label: t('inspector.stat.velocity'),
        value: formatSpeed(Math.hypot(comet.vel.x, comet.vel.y)),
      },
    ],
    description: `A ${displayType.toLowerCase()} comet with ${massInComets > 0.1 ? 'substantial' : massInComets > 0.01 ? 'moderate' : 'small'} mass. ${cometType === 'periodic' ? "This periodic comet returns to the inner solar system regularly, like Halley's Comet." : cometType === 'long_period' ? 'This long-period comet has an orbital period of more than 200 years.' : 'This short-period comet completes its orbit in less than 200 years.'} The comet's tail is ${tailLength > 50 ? 'very long' : tailLength > 30 ? 'moderate' : 'short'} and points away from the sun due to solar radiation pressure.`,
  };
};
