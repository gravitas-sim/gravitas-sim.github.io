// The habitable-zone limit instruments' words, in English (Prompt 205 part B).
// The model and what-it-leaves-out lines are fixed text per model (the kernel
// names the same models in English), so they translate by key.
export const EN_HZ_LIMITS = {
  'hzL.on': 'shown',
  'hzL.off': 'hidden',
  'hzL.axis.distance': 'Distance from the star (AU)',
  'hzL.axis.flux': 'Starlight (Earths)',
  'hzL.row.model': 'Model',
  'hzL.row.star': 'Star',
  'hzL.row.refused': 'Refused',
  'hzL.row.assumes': 'What it leaves out',
  'hzL.m.limits': 'Habitable-zone limits: flux thresholds of one published fit',
  'hzL.m.locking': 'Tidal-locking radius in the constant-Q model',
  'hzL.m.ages': 'Habitable zone of a model star at an age (MIST track)',
  'hzL.as.limits':
    'clouds; rotation and obliquity; ocean heat transport; any planet but one of an Earth mass with Earth gravity; any atmosphere but water (inner limits) or carbon dioxide (outer limits); a star outside 2600 to 7200 K. The zone is a band of starlight, not a measurement of any planet',
  'hzL.as.locking':
    'orbital eccentricity; spin-orbit resonance (Mercury); atmospheric tides (Venus); the planet’s own k2 and Q, which are not known to a factor of ten, so the radius is given as a range. A planet inside the radius is despun within the age in this model; it is not a statement that it is locked',
  'hzL.value.star': '{T} K, {L} times the Sun’s luminosity',
  'hzL.value.refused':
    'the fit is calibrated for stars from {min} K to {max} K; this star is at {T} K, outside it, and no limit is given',
  'hzL.value.limit':
    '{flux} Earths of starlight ({wm2} W/m²), at {d} AU. {kind}',
  'hzL.kind.model': 'From a climate model.',
  'hzL.kind.empirical': 'From the history of Venus or Mars, not a model.',
  'hzL.limit.runawayGreenhouse': 'Runaway greenhouse (inner edge)',
  'hzL.limit.maximumGreenhouse': 'Maximum greenhouse (outer edge)',
  'hzL.limit.recentVenus': 'Recent Venus (optimistic inner edge)',
  'hzL.limit.earlyMars': 'Early Mars (optimistic outer edge)',
  'hzL.star.sun': 'The Sun',
  'hzL.star.f': 'An F star (6800 K)',
  'hzL.star.k': 'A K dwarf (4200 K)',
  'hzL.star.m': 'An M dwarf (3200 K)',
  'hzL.star.trappist': 'TRAPPIST-1 (2566 K)',
  'hzL.l.title': 'Four limits, as amounts of starlight',
  'hzL.l.note':
    'Each limit is an amount of starlight, in Earths, that a published climate fit says a planet of one Earth mass can cope with. Switch each limit on and off. The distance of a limit follows from the star’s luminosity; the amount of starlight is the fit’s own and changes only a little with the star’s temperature. Two limits come from a model and two from what happened to Venus and Mars.',
  'hzL.l.control.star': 'Star',
  'hzL.l.legend.flux': 'Starlight a planet receives at each distance',
  'hzL.k.title': 'Which zones are inside the locking radius?',
  'hzL.k.note':
    'Tides raised by the star slow a planet’s spin; the closer the star, the faster. The locking radius is the distance inside which the spin is removed within the star’s age, for an Earth-like planet (k2 0.3, a 10-hour initial spin) and the Q set here. Q is not known to a factor of ten, so the radius is a range, drawn dashed.',
  'hzL.k.control.star': 'Star mass',
  'hzL.k.control.age': 'Age',
  'hzL.k.control.q': 'Planet’s tidal quality factor',
  'hzL.k.axis.x': 'Star mass (solar masses)',
  'hzL.k.legend.inner': 'Inner edge of the conservative zone',
  'hzL.k.legend.outer': 'Outer edge of the conservative zone',
  'hzL.k.legend.lock': 'Locking radius, Q = {Q}',
  'hzL.k.legend.low': 'Locking radius if Q is ten times larger',
  'hzL.k.legend.high': 'Locking radius if Q is ten times smaller',
  'hzL.k.row.zone': 'Conservative zone',
  'hzL.k.row.lock': 'Locking radius (range over Q)',
  'hzL.k.row.verdict': 'The zone against the radius',
  'hzL.k.value.zone': '{inner} to {outer} AU',
  'hzL.k.value.lock': '{r} AU ({low} to {high} AU)',
  'hzL.k.verdict.inside':
    'The whole zone is inside the locking radius: a planet there would be despun within the age in this model.',
  'hzL.k.verdict.outside':
    'The whole zone is outside the locking radius: a planet there would keep its spin in this model.',
  'hzL.k.verdict.straddles':
    'The locking radius lies within the zone: the inner part would be despun and the outer part would not.',
  'hzL.k.refused.age-domain':
    'The star is no longer on this track at that age (it has left the main sequence stage the track covers), so there is nothing to read.',
  'hzL.k.refused.teff-domain':
    'The star at that age is hotter or cooler than the limits’ fit covers (2600 to 7200 K), so no zone is given.',
  'hzL.mass.m020': '0.2 solar masses',
  'hzL.mass.m050': '0.5 solar masses',
  'hzL.mass.m100': '1 solar mass',
  'hzL.mass.m200': '2 solar masses',
  'hzL.a.title': 'Where the zone is, at three ages',
  'hzL.a.note':
    'A star of one solar mass from the MIST evolution tracks brightens as it ages, and the zone moves out with it. The age counts from the start of the model track. This is a model star, not the Sun: it is about 11 percent brighter than the Sun at the Sun’s age.',
  'hzL.a.control.age': 'Age',
  'hzL.a.axis.x': 'Age (Gyr)',
  'hzL.a.legend.inner': 'Inner edge (runaway greenhouse)',
  'hzL.a.legend.outer': 'Outer edge (maximum greenhouse)',
  'hzL.a.legend.earth': 'Earth’s orbit, 1 AU',
  'hzL.a.legend.now': 'The zone at the age set',
  'hzL.a.row.star': 'The model star',
  'hzL.a.row.zone': 'Conservative zone',
  'hzL.a.row.earth': 'A planet at 1 AU',
  'hzL.a.row.note': 'Not the Sun',
  'hzL.a.value.star': '{L} times the Sun’s present luminosity, {T} K',
  'hzL.a.value.zone': '{inner} to {outer} AU',
  'hzL.a.value.earth': 'receives {flux} Earths of starlight: {where}',
  'hzL.a.where.inner': 'closer in than the inner edge',
  'hzL.a.where.outer': 'farther out than the outer edge',
  'hzL.a.where.inside': 'inside the zone',
  'hzL.a.value.note':
    'This is a model star of one solar mass, not the Sun. At the Sun’s age it is 11 percent brighter than the Sun really is, so the 1 AU reading belongs to the model.',
};
