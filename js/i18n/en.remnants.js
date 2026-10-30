// The remnants panels' words, in English (Prompt 222). The model and
// what-it-leaves-out lines are fixed text, so they translate by key.
export const EN_REMNANTS = {
  'remW.v.msun': '{x} M☉',
  'remW.v.k': '{x} K',
  'remW.axis.mass': 'Mass (M☉)',
  'remW.axis.gyr': 'Cooling age (Gyr)',
  'remW.axis.logAge': 'log10 of the cooling age (years)',
  'remW.axis.logL': 'log10 of the luminosity (L☉)',
  'remW.axis.mi': 'Initial mass (M☉)',
  'remW.axis.mf': 'Final mass (M☉)',
  'remW.axis.prob': 'Probability',
  'remW.axis.system': 'Double neutron star system',
  'remW.legend.law': 'Cooling law',
  'remW.legend.model': 'Law’s own error, upper edge',
  'remW.legend.modelLower': 'Law’s own error, lower edge',
  'remW.legend.domain': 'Hot edge of the domain',
  'remW.legend.domainCool': 'Cool edge of the domain',
  'remW.legend.star': 'This white dwarf',
  'remW.legend.interval': '95 percent interval',
  'remW.legend.wd': 'White dwarf',
  'remW.legend.ns': 'Neutron star',
  'remW.legend.bh': 'Black hole',
  'remW.legend.here': 'This star',
  'remW.legend.pulsar': 'Pulsar',
  'remW.legend.companion': 'Companion',
  'remW.legend.dns': 'Population mean, 1.33 M☉',
  'remW.legend.chandra': 'White-dwarf limit',
  'remW.legend.relation': 'Final mass',
  'remW.legend.upper': 'Upper edge of the 95 percent interval',
  'remW.legend.lower': 'Lower edge of the 95 percent interval',

  'remW.refuse.invalid-input':
    'The inputs are not a mass and one luminosity or temperature that are finite and positive',
  'remW.refuse.above-chandrasekhar':
    'No white dwarf: this mass is at or above the limit the model finds for a white dwarf',
  'remW.refuse.mass-out-of-domain':
    'No age: the law is checked from 0.5 to 1.0 solar masses, and this mass is outside',
  'remW.refuse.luminosity-out-of-domain':
    'No age: this luminosity is outside the range where one heat reservoir and photon losses are the leading effects',
  'remW.refuse.teff-luminosity-out-of-domain':
    'No age: this temperature gives a luminosity outside the range where the law is checked',
  'remW.refuse.below-the-data':
    'No final mass: the white dwarfs the relation was fitted to had progenitors above this',
  'remW.refuse.above-the-data':
    'No final mass: the white dwarfs the relation was fitted to had progenitors below this',
  'remW.refuse.below-the-domain':
    'No outcome: a star this light has not left the main sequence in the age of the universe',
  'remW.refuse.above-the-domain':
    'No outcome: the cited ranges end at 120 solar masses, and pair instability begins near 140',
  'remW.refuse.unknown-relation': 'No such relation',

  // ---- the cooling panel
  'remW.c.title': 'How old is a white dwarf?',
  'remW.c.note':
    'A white dwarf has no fuel: it shines with the heat of its ions and slowly cools. Give its mass and either its luminosity or its temperature, and the panel gives the time it has taken to cool, from a law of Mestel’s kind. The age comes with two uncertainties kept apart: the one from how well the mass and the luminosity are known, and the law’s own, found by comparing it with a published cooling table. Outside the range where the law is checked the panel gives no age. The temperature route uses the cold white-dwarf radius, which is a little too large. No observed white dwarf is shown.',
  'remW.c.control.mass': 'Mass',
  'remW.c.control.entry': 'Enter',
  'remW.c.control.logL': 'log10 of the luminosity',
  'remW.c.control.teff': 'Effective temperature',
  'remW.c.control.precision': 'Measurement',
  'remW.c.control.view': 'Show',
  'remW.c.entry.0': 'luminosity',
  'remW.c.entry.1': 'temperature',
  'remW.c.precision.0': 'exact',
  'remW.c.precision.1': 'good',
  'remW.c.precision.2': 'typical',
  'remW.c.precision.3': 'poor',
  'remW.c.view.0': 'age against luminosity',
  'remW.c.view.1': 'age against mass',
  'remW.c.row.model': 'Model',
  'remW.c.m.law':
    'The ions’ heat leaking out through a radiative envelope: the age grows as mass to the 5/7 and luminosity to the −5/7',
  'remW.c.row.none': 'Result',
  'remW.c.row.domain': 'Where the law is checked',
  'remW.c.v.domain':
    '{m0} to {m1} solar masses and log10 L/L☉ from {l0} to {l1}',
  'remW.c.row.lum': 'Luminosity and temperature',
  'remW.c.v.lum': 'log10 L/L☉ {l}, {teff} K, radius {r} R☉',
  'remW.c.row.age': 'Cooling age',
  'remW.c.v.age': '{a} Gyr',
  'remW.c.row.obs': 'From the measurements',
  'remW.c.v.obs': '± {p} percent (95 percent)',
  'remW.c.v.obsNone': 'none: the inputs are taken as exact',
  'remW.c.row.model2': 'From the law itself',
  'remW.c.v.model':
    '± {p} percent (95 percent), measured against a published table',
  'remW.c.row.interval': 'Both together, 95 percent',
  'remW.c.v.interval': '{a} to {b} Gyr',
  'remW.c.row.limited': 'Limited by',
  'remW.c.v.limitedYes': 'the law: better measurements would not narrow it',
  'remW.c.v.limitedNo':
    'the measurements: better ones would narrow it until the law’s own error is reached',
  'remW.c.row.assumes': 'What it leaves out',
  'remW.c.a.law':
    'No crystallization, Debye cooling, neutrino cooling or convective coupling; a carbon-oxygen core and a thick hydrogen layer; the luminosity is the photon luminosity',

  // ---- the outcome panel
  'remW.o.title': 'From star to remnant',
  'remW.o.note':
    'What a star leaves depends on the mass it was born with. For stars up to a few solar masses the final mass of the white dwarf follows a relation fitted to white dwarfs in star clusters, with a scatter that is real. The class of remnant, white dwarf, neutron star or black hole, changes at masses that are only known within a range, so the panel gives probabilities and never a bare class. Choose the relation, and what to show: the relation, the probabilities, or the masses of neutron stars.',
  'remW.o.control.mi': 'Initial mass',
  'remW.o.control.relation': 'Stellar models',
  'remW.o.control.view': 'Show',
  'remW.o.relation.0': 'MIST',
  'remW.o.relation.1': 'PARSEC',
  'remW.o.view.0': 'final mass',
  'remW.o.view.1': 'probabilities',
  'remW.o.view.2': 'neutron stars',
  'remW.o.row.model': 'Model',
  'remW.o.m.model':
    'A piecewise-linear relation fitted to cluster white dwarfs, and two threshold ranges from the literature, each taken as uniform',
  'remW.o.row.final': 'Final mass, if a white dwarf',
  'remW.o.v.final': '{m} M☉, with a scatter of ± {s} M☉',
  'remW.o.row.lost': 'Mass lost',
  'remW.o.v.lost': '{l} M☉, {p} percent of the initial mass',
  'remW.o.row.interval': '95 percent interval',
  'remW.o.v.interval':
    '{a} to {b} M☉ (the coefficients’ own uncertainty, taken as independent, is ± {c} M☉)',
  'remW.o.row.flag': 'Flag',
  'remW.o.v.extrapolated':
    'above the range the last piece of the relation was fitted to: extrapolated',
  'remW.o.row.nofinal': 'Final mass',
  'remW.o.row.wd': 'White dwarf',
  'remW.o.row.ns': 'Neutron star',
  'remW.o.row.bh': 'Black hole',
  'remW.o.v.prob': '{p} percent',
  'remW.o.row.verdict': 'Verdict',
  'remW.o.verdict.decisive': 'decisive: {c}, {p} percent likely',
  'remW.o.verdict.uncertain':
    'uncertain: the most likely is {c} at {p} percent, and the probabilities above are the answer',
  'remW.o.class.whiteDwarf': 'a white dwarf',
  'remW.o.class.neutronStar': 'a neutron star',
  'remW.o.class.blackHole': 'a black hole',
  'remW.o.row.noout': 'Outcome',
  'remW.o.row.ranges': 'Cited threshold ranges',
  'remW.o.v.ranges':
    'white dwarf to neutron star {a} to {b} M☉; neutron star to black hole {c} to {d} M☉',
  'remW.o.row.ns2': 'Neutron stars',
  'remW.o.v.ns':
    '{n} component masses of seven double-neutron-star systems, from {lo} to {hi} M☉; a white dwarf cannot exceed {c} M☉',
  'remW.o.row.assumes': 'What it leaves out',
  'remW.o.a.model':
    'Single stars at solar metallicity; no rotation or binaries; the thresholds are ranges, and above 20 solar masses the outcome is not even a steady function of the mass',
};
