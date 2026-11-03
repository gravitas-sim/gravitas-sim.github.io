// The occurrence panels' words, in English (Prompt 229). The survey is synthetic and the panels say so; the
// reliability of the listings is a stated input, never computed from the data.
export const EN_OCCURRENCE = {
  'occW.eff.title': 'Who the survey could have seen',
  'occW.eff.note':
    'A survey of 2000 synthetic stars, each with its own noise and its own span. Planets of each size and period were injected into every star’s series and the search was run on them: the share it found is the efficiency. A planet must also transit, which is a matter of geometry. Both together are the completeness.',
  'occW.grid.title': 'Planets per star',
  'occW.grid.note':
    'The listings of one searched population, each bin’s rate worked out from them: the listings divided by the completeness of the bin, times the stated reliability. A rate is an expected number of planets per star and may be more than one. A bin with no listings gives a limit, and a bin the survey could hardly see gives nothing.',
  'occW.control.radius': 'Planet radius bin',
  'occW.control.period': 'Orbital period bin',
  'occW.control.view': 'View',
  'occW.control.seed': 'Seed of the population',
  'occW.control.level': 'Interval',
  'occW.control.reliability': 'Reliability of the listings',
  'occW.control.truth': 'Show the true rates',
  'occW.view.period': 'by period',
  'occW.view.curve': 'the curve',
  'occW.level.68': '68 percent',
  'occW.level.95': '95 percent',
  'occW.mode.none': 'none stated',
  'occW.mode.stated': 'stated',
  'occW.mode.doubled': 'twice the false fraction',
  'occW.on': 'on',
  'occW.off': 'off',
  'occW.axis.period': 'log10 of the orbital period, in days',
  'occW.axis.eff': 'Share of transiting planets recovered',
  'occW.axis.snr': 'Signal to noise of the injected transit',
  'occW.axis.rate': 'Planets per star in the bin',
  'occW.legend.radius': '{a} to {b} Earth radii',
  'occW.legend.measured': 'Measured',
  'occW.legend.band': 'One sigma',
  'occW.legend.analytic': 'Analytic form',
  'occW.legend.threshold': 'Threshold',
  'occW.legend.now': 'This bin',
  'occW.legend.rate': 'Rate',
  'occW.legend.lo': 'Lower end',
  'occW.legend.hi': 'Upper end',
  'occW.legend.limit': 'Upper limit',
  'occW.legend.truth': 'True rate',
  'occW.row.survey': 'The survey',
  'occW.row.bin': 'The bin',
  'occW.row.efficiency': 'Efficiency',
  'occW.row.completeness': 'Completeness',
  'occW.row.listed': 'Listed',
  'occW.row.reliability': 'Reliability',
  'occW.row.rate': 'Rate',
  'occW.row.sum': 'The radius bin in all',
  'occW.row.truth': 'The truth',
  'occW.row.assumes': 'What it assumes',
  'occW.v.survey':
    '{n} synthetic stars, {k} injected transits ({t} to every star and bin), threshold {s} sigma, at least {m} transits',
  'occW.v.bin': '{r} Earth radii, {p} days',
  'occW.v.efficiency':
    '{e} percent of the planets that transit here are recovered; {g} is the sum of the transit probabilities over the stars',
  'occW.v.completeness':
    '{c} planets listed for every planet per star ({f} of the stars hold {m} or more transits at this period)',
  'occW.v.listed': '{n} listings',
  'occW.v.reliability':
    '{r}: {p} percent of the listings are taken to be planets',
  'occW.v.rate':
    '{v} planets per star, from {lo} to {hi} ({lv} interval); {n} listings',
  'occW.v.rateAbove': ' This is more than one planet per star in the bin.',
  'occW.v.limit':
    'No listings: fewer than {v} planets per star in the bin, at 95 percent. Not a rate.',
  'occW.v.floor':
    'Not constrained: the survey lists {c} planets for every planet per star here, below {f}. No rate and no limit.',
  'occW.v.sum':
    '{s} planets per star over the {a} bins with a rate; {b} bins give only a limit and {c} are not constrained and are not added',
  'occW.v.truth':
    '{t} planets per star in the bin; {r} of the {n} listings are planets and {f} are not',
  'occW.a':
    'Synthetic stars and planets. The search is the matched filter at the known period and phase, so completeness is better than a real search’s. The interval carries the counting error of the listings only: the reliability is stated and taken as exact, and the completeness has a small error of its own.',
};
