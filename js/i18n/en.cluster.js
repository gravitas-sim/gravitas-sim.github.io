// The cluster-fit panel's words, in English (Prompt 219, CLUSTER_FITTING.md). The fixed
// lines translate by key; the computed ones use {placeholders}.
export const EN_CLUSTER = {
  'clusterObs.note':
    'Fits MIST isochrones to the stars in view, over two things only: the cluster’s age and its distance modulus. Everything else is what you state here, and the answer is conditional on it.',
  'clusterObs.feh': 'Metallicity [Fe/H], assumed',
  'clusterObs.E': 'Reddening E(g − r), assumed',
  'clusterObs.eps': 'Share of the stars that are not members, assumed',
  'clusterObs.dmLo': 'Distance modulus from',
  'clusterObs.dmHi': 'to',
  'clusterObs.fit': 'Fit',
  'clusterObs.busy': 'Fitting: a few seconds.',
  'clusterObs.needs':
    'This needs a table with g and r magnitudes for the cluster’s members: crop to the members first.',
  'clusterObs.row.age': 'Age',
  'clusterObs.row.logAge': 'log age',
  'clusterObs.row.dm': 'Distance modulus',
  'clusterObs.row.distance': 'Distance',
  'clusterObs.row.members':
    'Members (the stars in the window, less the assumed share)',
  'clusterObs.row.stat': 'Statistic (deviance, smaller is better)',
  'clusterObs.row.valley': 'Age against distance',
  'clusterObs.row.assumed': 'Assumed, not fitted',
  'clusterObs.v.interval': '{v} ({lo} to {hi}, one sigma)',
  'clusterObs.v.withheld':
    '{v}: The interval is withheld: it failed its coverage test (CLUSTER_FITTING.md).',
  'clusterObs.v.open': '{v}: the data leave this open inside the models’ grid',
  'clusterObs.v.age': '{v} Gyr',
  'clusterObs.v.dm': '{v} mag',
  'clusterObs.v.pc': '{v} pc',
  'clusterObs.v.valley':
    'correlation {r} in the region the data allow: an older age pairs with a nearer cluster',
  'clusterObs.v.valleyNone':
    'the allowed region is too small to measure a correlation',
  'clusterObs.v.assumed':
    '[Fe/H] {feh}, E(g − r) {E}, A_g / E(g − r) = {R}, {eps} not members',
  'clusterObs.nc.members':
    'Not constrained: {n} stars in the window leave about {m} members at the assumed share, and the fit needs {min}.',
  'clusterObs.nc.no-cluster':
    'Not constrained: a cluster of stars beats a field of stars alone by only {gain} in the statistic, so there is no cluster here to fit.',
  'clusterObs.nc.interval':
    'Not constrained on one side: an interval runs to the edge of the models’ ages or of your distance range, so the answer is a limit, not a value.',
  'clusterObs.warn.ageAtOldEdge':
    'The best age is the oldest the models reach (4 Gyr): the cluster may be older.',
  'clusterObs.warn.ageAtYoungEdge':
    'The best age is the youngest the models reach (1 Gyr): the cluster may be younger.',
  'clusterObs.warn.dmAtEdge':
    'The best distance modulus is at the end of your range: widen it.',
  'clusterObs.assumes': 'What this result assumes',
  'clusterObs.a.feh':
    'The metallicity is the one you set. A different one moves the age and the distance by more than the intervals below.',
  'clusterObs.a.single':
    'The stars are single: no binaries are in the model, and a binary fraction biases the fit without widening the intervals.',
  'clusterObs.a.members':
    'The members are the stars in the table, as you cropped them; the assumed share of them that are not members is spread evenly over colour.',
  'clusterObs.a.selection':
    'The survey’s selection in magnitude is unknown and is not used: the fit compares colours at each magnitude, not counts.',
  'clusterObs.a.model':
    'The isochrones are MIST v1.2’s: a model, not a measurement. Between its ages and metallicities the curve is a blend of its neighbours.',
  'clusterObs.a.interval':
    'An interval is where the statistic rises by 1 from its minimum: it says how a repeated measurement would scatter if every assumption were true, not how sure anyone can be of the age.',
  'clusterObs.cmd': 'The stars and the best isochrone',
  'clusterObs.cmd.colour': 'g − r',
  'clusterObs.cmd.g': 'g',
  'clusterObs.cmd.label':
    'Colour–magnitude diagram of {n} stars with the best isochrone drawn over them',
  'clusterObs.profileAge': 'The statistic against age',
  'clusterObs.profileDm': 'The statistic against distance modulus',
  'clusterObs.profile.label':
    'The rise of the statistic above its minimum against {what}; the interval is where it is below 1',
  'clusterObs.profile.age': 'log age',
  'clusterObs.profile.dm': 'distance modulus',
  'clusterObs.profile.delta': 'rise in the statistic',
  'clusterObs.valley.title': 'The valley: the best distance at each age',
  'clusterObs.valley.label':
    'The distance modulus that fits best at each age: a line the data cannot tell the ages along',
  'clusterObs.record': 'Download the record',
  'clusterObs.recordName': 'cluster-fit',
  'clusterObs.synthetic': 'Synthetic cluster, truth known',
};
