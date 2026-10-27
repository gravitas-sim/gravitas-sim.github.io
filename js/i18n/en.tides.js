// The ring and tide instruments' words, in English (Prompt 204 part 2). The model
// and what-it-leaves-out lines are fixed text per instrument, so they translate by key.
export const EN_TIDES = {
  'tideW.row.model': 'Model',
  'tideW.row.assumes': 'What it leaves out',
  'tideW.model.roche':
    'Roche limit of a satellite held together by gravity alone',
  'tideW.model.res':
    'Mean-motion resonance of a ring particle with a moon, point-mass orbits',
  'tideW.a.roche':
    'the satellite’s strength (the rigid limit is for a body that does not deform at all, the fluid limit for one that deforms freely, and a real body lies between them); its spin; its shape before the tide; the time a body spends inside the limit (a quick pass may not break it)',
  'tideW.a.res':
    'Saturn’s oblateness, which shifts the real radius by about half a percent; the resonance’s strength (whether it opens a gap depends on the moon’s mass and on how the ring dissipates); every resonance of higher order',
  'tideW.a.moon':
    'a Q that does not change with time or frequency (the Moon’s evolution is not known to have followed one Q); the oceans’ real response; the Moon’s orbital eccentricity and inclination; the spin axis’s tilt; and the age of the Moon (run backward the model puts the Moon in contact with the Earth in less than the age of the Solar System, which the record contradicts)',
  'tideW.a.heating':
    'the true interior of Io: its k2 and Q are not known and the answer is proportional to their ratio, so the number is a bound and not a prediction; the eccentricity tide’s coupling to a partly molten interior; heating from the other moons’ orbits; and every term beyond the first in the eccentricity',
  'tideW.r.title': 'Where does a moon fall apart?',
  'tideW.r.note':
    'A satellite held together by its own gravity is pulled apart once the planet’s tide across it beats its self-gravity. For a given pair of densities that happens inside the Roche limit: close in for a rigid satellite (the rigid limit), farther out for one that can deform (the fluid limit). Choose a pair, and move the satellite.',
  'tideW.r.control.system': 'Pair',
  'tideW.r.control.own': 'Distance',
  'tideW.r.real': 'the real one',
  'tideW.r.mine': 'my own',
  'tideW.r.control.radii': 'Distance (R)',
  'tideW.r.sys.phobos': 'Phobos, Mars',
  'tideW.r.sys.sl9': 'SL9, Jupiter',
  'tideW.r.sys.moon': 'Moon, Earth',
  'tideW.r.sys.ring': 'B-ring ice',
  'tideW.r.axis.x': 'Distance (planet radii)',
  'tideW.r.axis.y': 'Tide, in rigid-limit units',
  'tideW.r.legend.curve':
    'tide across the satellite, relative to the rigid limit’s',
  'tideW.r.legend.limits': 'rigid and fluid limits',
  'tideW.r.legend.here': 'the satellite',
  'tideW.r.row.rigid': 'Rigid limit',
  'tideW.r.row.fluid': 'Fluid limit',
  'tideW.r.row.at': 'The satellite is at',
  'tideW.r.row.regime': 'Where that is',
  'tideW.r.regime.safe': 'outside the fluid limit: it holds together',
  'tideW.r.regime.deforming':
    'between the limits: a fluid body would break, a rigid one need not',
  'tideW.r.regime.disrupting':
    'inside the rigid limit: nothing held by gravity alone survives',
  'tideW.s.title': 'Where does a moon’s resonance fall in the ring?',
  'tideW.s.note':
    'A ring particle whose orbital period is a simple fraction of a moon’s is pulled by the moon at the same point of every orbit, and those tugs add up. The p:q resonance lies at a radius set by the moon’s distance alone. Choose a moon and a ratio and set the radius against the edges and gaps of Saturn’s rings.',
  'tideW.s.control.moon': 'Moon',
  'tideW.s.control.p': 'p',
  'tideW.s.control.q': 'q',
  'tideW.s.moon.mimas': 'Mimas',
  'tideW.s.moon.enceladus': 'Enceladus',
  'tideW.s.moon.tethys': 'Tethys',
  'tideW.s.axis.x': 'Radius from Saturn’s center (thousand km)',
  'tideW.s.legend.features': 'edges and gaps in the rings',
  'tideW.s.legend.resonance': 'the {p}:{q} resonance',
  'tideW.s.row.radius': 'Radius of the {p}:{q} resonance',
  'tideW.s.row.nearest': 'Nearest feature',
  'tideW.s.row.offset': 'From that feature',
  'tideW.s.feature.bOuter':
    'outer edge of the B ring, inner edge of the Cassini Division',
  'tideW.s.feature.aInner':
    'inner edge of the A ring, outer edge of the Cassini Division',
  'tideW.s.feature.encke': 'the Encke Gap',
  'tideW.s.feature.keeler': 'the Keeler Gap',
  'tideW.m.title': 'How the Moon’s orbit and the day change',
  'tideW.m.note':
    'The Moon raises a tide on the Earth that runs ahead of it, because the Earth spins faster than the Moon orbits. That bulge pulls the Moon forward, so the Moon recedes, and drags the Earth’s spin down, so the day lengthens. The table is the model’s closed form: nothing is simulated and no force acts.',
  'tideW.m.control.k2': 'k2',
  'tideW.m.control.Q': 'Q',
  'tideW.m.control.gyr': 'Time (Gyr)',
  'tideW.m.axis.x': 'Time from now (billion years)',
  'tideW.m.axis.y': 'The Moon’s distance (Earth radii)',
  'tideW.m.legend.orbit': 'the Moon’s distance',
  'tideW.m.legend.now': 'now',
  'tideW.m.model': 'Constant-Q equilibrium tide, circular orbit, aligned spin',
  'tideW.m.llr': 'measured by lunar laser ranging: 3.82 ± 0.07',
  'tideW.m.eclipse': 'from ancient eclipses: about 2.3',
  'tideW.m.row.rate': 'Moon’s recession now',
  'tideW.m.row.day': 'The day’s lengthening now',
  'tideW.m.row.at': 'At {gyr} billion years',
  'tideW.m.value.at':
    '{a} thousand km ({radii} Earth radii); the day is {day} hours',
  'tideW.m.row.ends': 'The model stops',
  'tideW.m.ends.orbit-inside-body':
    'the orbit reaches the Earth’s surface {gyr} billion years away: the model cannot be run that far',
  'tideW.m.ends.corotation':
    'the Earth’s spin meets the orbital rate {gyr} billion years away: tides stop moving the Moon',
  'tideW.h.title': 'How much heat does Io’s tide make?',
  'tideW.h.note':
    'Jupiter’s tide flexes Io, and because Io’s orbit is slightly eccentric the flexing never stops. The friction in the flexing is heat. The formula gives the heat as a multiple of k2/Q, a number nobody knows for Io, so the honest answer is a range. Set the heat against what is observed.',
  'tideW.h.control.k2': 'k2',
  'tideW.h.control.Q': 'Q',
  'tideW.h.control.e': 'Eccentricity',
  'tideW.h.axis.x': 'Eccentricity',
  'tideW.h.axis.y': 'Heating (10^13 W)',
  'tideW.h.legend.chosen': 'my k2 and Q',
  'tideW.h.legend.max': 'the largest the model allows',
  'tideW.h.legend.observed': 'observed, upper',
  'tideW.h.legend.observedLow': 'observed, lower',
  'tideW.h.model':
    'Heating of a synchronous satellite on an eccentric orbit, leading order in e',
  'tideW.h.row.power': 'Heating',
  'tideW.h.row.orbit': 'Energy in one orbit (period)',
  'tideW.h.row.bound': 'Range the model allows, at this eccentricity',
  'tideW.h.row.observed': 'Observed',
  'tideW.h.row.need': 'k2/Q the observed middle value needs',
};
