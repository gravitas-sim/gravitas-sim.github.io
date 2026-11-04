// The Gaia astrometry panels' words, in English (Prompt 233 Part B). The inputs of the first
// panel are numbers the student sets, not a star; the second panel is NGC 2420's real pack
// and says what its cuts remove. Fixed text, so it translates by key. gaiaW.* ids.
export const EN_GAIA = {
  'gaiaW.loading': 'loading the Gaia data…',
  'gaiaW.none': 'none',
  'gaiaW.off': 'off',
  'gaiaW.on': 'on',
  'gaiaW.d.title': 'Parallax to distance',
  'gaiaW.d.note':
    'A parallax measures 1 ÷ distance, with an error. It is not the distance. This panel draws the likelihood of every distance for the numbers you set. Its maximum is 1 ÷ the corrected parallax, and with no prior that is all it says. A point distance needs a corrected parallax at least {n} times its error. Switch the prior on to see what a prior adds and what it assumes. The numbers are ones you set: this is not a Gaia star.',
  'gaiaW.d.control.plx': 'Observed parallax',
  'gaiaW.d.control.err': 'Parallax error',
  'gaiaW.d.control.zp': 'Zero-point offset',
  'gaiaW.d.control.prior': 'Prior on the distance',
  'gaiaW.d.control.L': 'Prior scale length',
  'gaiaW.d.control.range': 'Plot out to',
  'gaiaW.d.control.mu': 'Proper motion',
  'gaiaW.d.prior.0': 'none',
  'gaiaW.d.prior.1': 'exponentially decreasing density',
  'gaiaW.d.preset.good': 'Well measured',
  'gaiaW.d.preset.low': 'Low signal',
  'gaiaW.d.preset.negative': 'Negative parallax',
  'gaiaW.d.axis.x': 'Distance, kpc',
  'gaiaW.d.axis.y': 'Relative likelihood',
  'gaiaW.d.legend.likelihood': 'Likelihood',
  'gaiaW.d.legend.prior': 'Prior (scaled)',
  'gaiaW.d.legend.posterior': 'Posterior',
  'gaiaW.d.legend.interval': 'Interval, 68 percent',
  'gaiaW.d.row.input': 'The measurement',
  'gaiaW.d.v.input':
    'Observed parallax {p} mas, error {e} mas; zero-point offset applied: {z}.',
  'gaiaW.d.row.corrected': 'Corrected parallax',
  'gaiaW.d.v.corrected':
    '{w} mas, error {s} mas: {k} times its error (a point distance needs {n}).',
  'gaiaW.d.row.status': 'What it supports',
  'gaiaW.d.status.ok':
    'a distance: the corrected parallax is at least {n} times its error',
  'gaiaW.d.status.low-signal':
    'low signal: the likelihood has a maximum, but it is wide and open on the far side; this is not a measured distance',
  'gaiaW.d.status.prior-dominated':
    'prior-dominated: the answer follows the prior as much as the parallax',
  'gaiaW.d.status.likelihood-only':
    'no distance: the corrected parallax is zero or negative, so there is a likelihood and nothing else',
  'gaiaW.d.row.distance': 'Distance from the likelihood',
  'gaiaW.d.v.distance':
    '{d} kpc (1 ÷ {w} mas, the maximum of the likelihood); 68 percent interval {lo} to {hi} kpc.',
  'gaiaW.d.v.distanceOpen':
    '{d} kpc (1 ÷ {w} mas, the maximum of the likelihood); 68 percent interval from {lo} kpc outward, with no far end: the likelihood does not fall at large distance.',
  'gaiaW.d.v.noDistance':
    'None. A corrected parallax of {w} mas has a likelihood, drawn above, and no distance: it rules out no large distance and gives none.',
  'gaiaW.d.row.posterior': 'With the prior',
  'gaiaW.d.v.posterior':
    'Posterior median {m} kpc, mode {o} kpc, 68 percent equal-tailed interval {lo} to {hi} kpc, for a space density that falls as exp(−r ÷ L) with L = {L} kpc (a prior on the distance of r² exp(−r ÷ L), peaking at 2 L). Change L and the answer moves.',
  'gaiaW.d.row.assumes': 'What this assumes',
  'gaiaW.d.assume.none':
    'Gaussian parallax errors of the stated size and the zero point you set. It says nothing about where stars are.',
  'gaiaW.d.assume.edsd':
    'The stars sampled have a space density that falls as exp(−r ÷ L) along the line of sight, and the sample is complete over the distances drawn: no magnitude or parallax cut thins it, and a cut changes the prior (Astraatmadja and Bailer-Jones 2016; Bailer-Jones 2015).',
  'gaiaW.d.row.correction': 'Correction',
  'gaiaW.d.v.correction':
    'None beyond the zero point you set. No Lutz and Kelker or other sample-wide correction is applied to any sample.',
  'gaiaW.d.row.velocity': 'Tangential speed',
  'gaiaW.d.v.velocity':
    'At {mu} mas/yr: {v} km/s, interval {lo} to {hi} km/s. It is the distance and its interval times {k} × {mu}.',
  'gaiaW.d.v.velocityOpen':
    'At {mu} mas/yr: {v} km/s, at least {lo} km/s: the interval has no far end, so neither has the speed. It is the distance and its interval times {k} × {mu}.',
  'gaiaW.d.v.velocityNone':
    'None: a star with no distance has no tangential speed.',
  'gaiaW.s.title': 'What Gaia keeps: NGC 2420',
  'gaiaW.s.note':
    'The {n} Gaia DR3 stars of NGC 2420 in the pack: G below 17.5, RUWE below 1.4, parallax and proper motion known. Each cut removes the stars that fail it, and the diagram and the distance are of what is left. Members are the stars whose proper motion alone puts them in the cluster with probability {p} or more, a contract fixed before this result was seen. The distance carries a zero point per star and a {c}-sigma clip, and no systematic floor, so its interval is statistics only. The solar-neighbourhood pack is not used: its parallaxes are rounded and give no distance.',
  'gaiaW.s.control.view': 'Picture',
  'gaiaW.s.control.mag': 'Magnitude limit: keep G below',
  'gaiaW.s.control.poe': 'Parallax over error: keep at least',
  'gaiaW.s.control.ruwe': 'RUWE: keep below',
  'gaiaW.s.control.zp': 'Zero point per star',
  'gaiaW.s.view.0': 'color and magnitude',
  'gaiaW.s.view.1': 'velocities',
  'gaiaW.s.preset.all': 'No cut',
  'gaiaW.s.preset.bright': 'Bright stars only',
  'gaiaW.s.preset.precise': 'Precise parallaxes only',
  'gaiaW.s.preset.noZp': 'No zero point',
  'gaiaW.s.axis.colour': 'BP − RP, color',
  'gaiaW.s.axis.g': 'G magnitude (brighter up)',
  'gaiaW.s.axis.vra': 'Velocity along right ascension, km/s',
  'gaiaW.s.axis.vdec': 'Velocity along declination, km/s',
  'gaiaW.s.legend.members': 'Members kept',
  'gaiaW.s.legend.others': 'Other stars kept',
  'gaiaW.s.legend.removed': 'Removed by the cuts',
  'gaiaW.s.legend.velocity': 'Members kept, at the cluster’s distance',
  'gaiaW.s.row.source': 'The sample',
  'gaiaW.s.v.source':
    'NGC 2420, Gaia DR3 (pack {v}): {n} stars. The pack’s own query had already dropped {d} stars with RUWE of 1.4 or more. Measured data, ESA/Gaia/DPAC, non-commercial.',
  'gaiaW.s.row.cuts': 'Cuts on',
  'gaiaW.s.v.noCuts': 'none: every star in the pack is kept.',
  'gaiaW.s.cut.magnitude':
    'G below {x}: alone it removes {a} of {n} stars; of the stars the earlier cuts left it removes {r}',
  'gaiaW.s.cut.parallaxOverError':
    'parallax over error at least {x}: alone it removes {a} of {n}; of the stars the earlier cuts left it removes {r}',
  'gaiaW.s.cut.ruwe':
    'RUWE below {x}: alone it removes {a} of {n}; of the stars the earlier cuts left it removes {r}',
  'gaiaW.s.row.kept': 'Stars left',
  'gaiaW.s.v.kept':
    '{k} of {n}; {m} of them members; {u} used after the {c}-sigma clip.',
  'gaiaW.s.v.noMembers':
    '{k} of {n}; no member is left to take a distance from.',
  'gaiaW.s.row.parallax': 'Mean parallax of the members',
  'gaiaW.s.v.parallax':
    '{p} mas, statistical error {e} mas; mean zero point applied: {z}.',
  'gaiaW.s.row.distance': 'Distance of the cluster',
  'gaiaW.s.v.distance':
    '{d} kpc, statistical interval {lo} to {hi} kpc. There is no systematic floor: the zero point’s own uncertainty is not known here, so this interval understates the error.',
  'gaiaW.s.row.limit': 'Not validated',
  'gaiaW.s.v.limit':
    'This distance has not been checked against a published catalogue distance: leg E1 of the validation is NOT RUN, waiting for the table that could not be fetched.',
  'gaiaW.s.row.velocity': 'Tangential velocities',
  'gaiaW.s.v.velocity':
    'At {d} kpc the members move at ({a}, {b}) km/s in right ascension and declination, with a scatter of {sa} and {sb} km/s (measurement errors included). The mean motion, {mu} mas/yr, is {v} km/s, interval {lo} to {hi} km/s (the distance’s statistical interval only).',
  'gaiaW.s.row.zeroPoint': 'Zero point',
  'gaiaW.s.v.zeroPointOn':
    'The correction of Lindegren et al. (2021), per star, as an independent reimplementation; its own uncertainty is not built in.',
  'gaiaW.s.v.zeroPointOff':
    'Not applied: the parallaxes are the catalogue’s, which Lindegren et al. (2021) find too small on average.',
  'gaiaW.s.aria':
    'Colour-magnitude diagram or velocity plot of NGC 2420: {k} of {n} stars kept.',
};
