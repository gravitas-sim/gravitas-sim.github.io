// =============================================================================
// The words for the Orbital System Builder, in English
// -----------------------------------------------------------------------------
// A fragment of its own, for the reason js/i18n/en.placement.js is one: the
// deferred catalog is embedded in several bundles, so a string added there is
// downloaded by readers who can never reach the panel that shows it. These are
// imported by js/systemBuilder.js alone, which is loaded on demand, and
// registered for the one locale in use.
//
// The checks name published criteria, and the sentences say what each one
// does and does not claim. None of them is written as a verdict on stability,
// because none of them is one.
// =============================================================================

export const EN_BUILDER = {
  'builder.title': 'Orbital System Builder',
  'builder.intro':
    'Build a system from orbital elements. Choose what each companion orbits and describe its orbit; the builder works out where every body starts and how fast it moves, with the center of mass of the whole system at rest.',
  'builder.template.label': 'Start from',
  'builder.template.apply': 'Use this start',
  'builder.template.starPlanet': 'A star and a planet',
  'builder.template.sunEarthMoon': 'The Sun, Earth and Moon',
  'builder.template.giants': 'The Sun, Jupiter and Saturn',
  'builder.template.kepler16': 'A planet around a binary star (Kepler-16)',
  'builder.template.alphaCen': 'A planet in a wide binary (Alpha Centauri)',
  'builder.template.triple': 'A hierarchical triple star',
  'builder.template.applied': 'Started from {name}.',
  'builder.name.star': 'Star',
  'builder.name.planet': 'Planet',
  'builder.name.sun': 'Sun',
  'builder.name.earth': 'Earth',
  'builder.name.moon': 'Moon',
  'builder.name.jupiter': 'Jupiter',
  'builder.name.saturn': 'Saturn',
  'builder.name.kepler16a': 'Kepler-16 A',
  'builder.name.kepler16b': 'Kepler-16 B',
  'builder.name.kepler16planet': 'Kepler-16 b',
  'builder.name.alphaCenA': 'Alpha Centauri A',
  'builder.name.alphaCenB': 'Alpha Centauri B',
  'builder.name.alphaCenPlanet': 'A planet of A',
  'builder.name.tripleA': 'Star A',
  'builder.name.tripleB': 'Star B',
  'builder.name.tripleC': 'Star C',
  'builder.defaultName': '{type} {n}',

  'builder.body.root': 'Body 1: the center of the system',
  'builder.body.companion': 'Body {n}',
  'builder.field.name': 'Name',
  'builder.field.type': 'Type',
  'builder.field.mass': 'Mass ({unit})',
  'builder.field.massHint': 'From {min} to {max}.',
  'builder.field.radius': 'Contact radius (simulation units)',
  'builder.field.radiusHint':
    'Blank for this type’s own radius at this mass, {radius}. Bodies closer than their two radii collide.',
  'builder.field.radiusBlackHole':
    'A black hole’s radius follows from its mass: {radius}.',
  'builder.field.primary': 'Orbits',
  'builder.field.a': 'Semi-major axis (AU)',
  'builder.field.e': 'Eccentricity',
  'builder.field.omega': 'Argument of periapsis (degrees)',
  'builder.field.omegaHint': 'The direction of periapsis, from the +x axis.',
  'builder.field.phase': 'Starting mean anomaly (degrees)',
  'builder.field.phaseHint': '0 starts at periapsis, 180 at apoapsis.',
  'builder.field.direction': 'Direction',
  'builder.direction.prograde': 'Prograde (counter-clockwise)',
  'builder.direction.retrograde': 'Retrograde (clockwise)',
  'builder.mass.suns': 'solar masses',
  'builder.mass.earths': 'Earth masses',
  'builder.mass.jupiters': 'Jupiter masses',
  'builder.add': 'Add a companion',
  'builder.remove': 'Remove {name}',
  'builder.removed': 'Removed {name}.',

  'builder.preview.heading': 'Preview',
  'builder.preview.caption':
    'Where each body starts, and each companion’s osculating orbit, as they will appear on the canvas. Bodies are not drawn to scale.',
  'builder.preview.label':
    'Preview of {count} bodies, {width} AU across. The table below lists every orbit.',
  'builder.preview.none': 'The preview appears once every field is filled in.',
  'builder.table.heading': 'Orbits, in the order they are built',
  'builder.table.caption':
    'Each companion orbits everything listed before it around the same body. Periods are Keplerian estimates for the two-body orbit.',
  'builder.col.order': 'Order',
  'builder.col.body': 'Companion',
  'builder.col.primary': 'Orbits',
  'builder.col.period': 'Period',
  'builder.col.periapsis': 'Periapsis (AU)',
  'builder.col.apoapsis': 'Apoapsis (AU)',
  'builder.col.offset': 'Barycenter offset (AU)',
  'builder.inner': '{name} and what orbits inside',
  'builder.period.days': '{value} days',
  'builder.period.years': '{value} years',
  'builder.residuals':
    'Read back from the starting positions and velocities, every orbit matches what was entered to within {worst} of its size, and the system’s net momentum is {momentum} of its total.',

  'builder.checks.heading': 'Checks',
  'builder.checks.none': 'Nothing stands out in this system.',
  'builder.checks.error': 'Cannot build: {text}',
  'builder.checks.caution': 'Caution: {text}',
  'builder.check.overlap':
    '{first} and {second} overlap at the start, {distance} AU apart where they touch at {contact} AU. They would collide on the first step.',
  'builder.check.contact':
    '{first} comes within {periapsis} AU of {second} at periapsis, inside touching distance ({contact} AU). The first close approach ends in a collision.',
  'builder.check.hillOutside':
    '{first} reaches {reach} times the Hill radius of {second} ({hill} AU at its closest to what it orbits). That far out, {second} cannot keep hold of it.',
  'builder.check.hillWide':
    '{first} reaches {reach} times the Hill radius of {second} ({hill} AU). Prograde moons are usually stable only within about half of it (Hamilton and Burns, 1991).',
  'builder.check.crossing':
    'The orbits of {first} and {second} cross: {first} reaches {apoapsis} AU and {second} comes in to {periapsis} AU.',
  'builder.check.circumbinary':
    '{second} orbits at {semiMajor} AU, inside {critical} AU, the closest stable orbit around this binary in the fits of Holman and Wiegert (1999). Planets placed inside it were usually lost.',
  'builder.check.circumstellar':
    '{first} orbits at {semiMajor} AU, outside {critical} AU, the widest stable orbit around one star of this pair in the fits of Holman and Wiegert (1999).',
  'builder.check.triple':
    'The orbit of {second} is {ratio} times the size of the orbit of {first}. Mardling and Aarseth (2001) put the stability limit for a triple like this near {critical}; a triple more compact than that is unlikely to stay hierarchical.',
  'builder.check.spacing':
    '{first} and {second} are {spacing} mutual Hill radii apart. Gladman (1993) showed that two planets more than 3.46 apart can never meet; closer than that, nothing rules it out.',
  'builder.check.fastOrbit':
    '{first} completes an orbit in {period} time units, faster than the integrator’s smallest step can follow at normal speed. Its orbit will drift; slow the simulation down, or widen the orbit.',
  'builder.check.fitRange':
    'This pair lies outside the mass ratios and eccentricities the fit was made for, so treat the limit as a rough guide.',

  'builder.note.osculating':
    'These elements are osculating: each describes the two-body orbit a companion would follow if only the bodies inside its orbit pulled on it. Once the system runs, every other body perturbs it, so its semi-major axis, eccentricity and periapsis will change.',
  'builder.note.proof':
    'No check here proves the system is stable. Only running it can show what it does, and a long run still says nothing about a longer one.',
  'builder.note.settings':
    'The system runs with every body pulling on every other, black holes free to move, no orbital decay, an integration step of at most {step} time units and a softening length of {soft} simulation units.',

  'builder.build': 'Build this system',
  'builder.export': 'Save as a file',
  'builder.import': 'Open a file',
  'builder.close': 'Close',
  'builder.built':
    'Built {count} bodies. The system is running; Refresh Scenario builds it again from the start.',
  'builder.invalid':
    '{count} fields need attention before this system can be built.',
  'builder.blocked': 'This system cannot be built as entered. See the checks.',
  'builder.file.notSystem': 'That file is not a Gravitas orbital system.',
  'builder.file.newer':
    'That file was made by a newer version of Gravitas (format version {version}). Reload the page and try again.',
  'builder.file.unreadable': 'That file could not be read.',
  'builder.file.loaded': 'Opened a system of {count} bodies.',
  'builder.file.drift':
    'The starting state recorded in the file differs from the one this version of Gravitas computes from its elements. The elements have been used.',
  'builder.file.saved': 'Saved {file}.',

  'builder.error.tooFew':
    'A system needs at least two bodies. Add a companion.',
  'builder.error.tooMany': 'A system can have at most {max} bodies.',
  'builder.error.type': 'Choose a type.',
  'builder.error.number': 'Enter a number.',
  'builder.error.massRange': 'Enter a mass from {min} to {max}.',
  'builder.error.blackHoleRadius':
    'A black hole’s radius follows from its mass. Leave this blank.',
  'builder.error.radiusRange':
    'Enter a radius greater than 0 and at most {max}, or leave it blank.',
  'builder.error.rootPrimary':
    'The first body is the center of the system and orbits nothing.',
  'builder.error.primary': 'Choose a body listed above this one.',
  'builder.error.aRange':
    'Enter a distance greater than 0 and at most {max} AU.',
  'builder.error.unbound':
    'An eccentricity of 1 or more is an unbound orbit: the companion would leave and never come back. Enter less than 1.',
  'builder.error.eRange': 'Enter an eccentricity from 0 to {max}.',
  'builder.error.mixedBlackHoles':
    'In Gravitas a black hole is pulled only by other black holes, so one among stars or planets would not respond to them and the system could not hold together. Make every body a black hole, or none.',
};
