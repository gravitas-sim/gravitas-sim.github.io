// The transit-timing panels' words, in English (Prompt 226). The model and
// what-it-leaves-out lines are fixed text, so they translate by key.
export const EN_TTV = {
  'ttvW.system.0': 'Near 2:1 (periods 10 and 20.6 days)',
  'ttvW.system.1': 'Near 3:2 (periods 10 and 15.45 days)',
  'ttvW.system.2': 'Far from resonance (periods 10 and 27 days)',
  'ttvW.planet.0': 'Inner planet',
  'ttvW.planet.1': 'Outer planet',
  'ttvW.control.system': 'System',
  'ttvW.control.planet': 'Planet',
  'ttvW.row.system': 'System',
  'ttvW.row.assumes': 'What it assumes',
  'ttvW.v.percent': '{x} percent',

  'ttvW.t.title': 'One transit time',
  'ttvW.t.note':
    'A window of light curve about one transit, and the fit that measures its mid-time: the template is fixed and only the time and the baseline are fitted',
  'ttvW.t.control.transit': 'Transit number',
  'ttvW.t.control.noise': 'Noise per point',
  'ttvW.t.noise.0': 'Low (100 ppm)',
  'ttvW.t.noise.1': 'Typical (400 ppm)',
  'ttvW.t.noise.2': 'High (1600 ppm)',
  'ttvW.t.control.view': 'Show',
  'ttvW.t.view.0': 'The light curve and the fit',
  'ttvW.t.view.1': 'The fit’s chi-square against the mid-time',
  'ttvW.axis.minPredicted': 'Time from the predicted mid-transit (minutes)',
  'ttvW.axis.minFit': 'Mid-time minus the best fit (minutes)',
  'ttvW.axis.flux': 'Relative flux',
  'ttvW.axis.dchi2': 'Chi-square above its minimum',
  'ttvW.legend.flux': 'Measured flux',
  'ttvW.legend.fit': 'Template at the fitted time',
  'ttvW.legend.profile': 'Chi-square',
  'ttvW.legend.one': 'One above the minimum: one sigma',
  'ttvW.t.row.which': 'Transit',
  'ttvW.t.row.noise': 'Noise',
  'ttvW.t.row.fit': 'Fit',
  'ttvW.t.row.time': 'Mid-time from the prediction',
  'ttvW.t.row.chi': 'Does the template fit?',
  'ttvW.t.row.regime': 'Is the error bar an interval?',
  'ttvW.t.v.reliable':
    'Yes: the error bar is well under the two-minute spacing, so it can be read as one sigma',
  'ttvW.t.v.lowSnr':
    'Not quite: the error bar of {s} minutes is as long as the {c}-minute spacing of the points, and then the real scatter is larger than it says; read it as a lower bound',
  'ttvW.t.row.truth': 'The engine’s true time',
  'ttvW.t.v.which': 'Number {n}, {planet}',
  'ttvW.t.v.noise': '{ppm} ppm per two-minute point',
  'ttvW.t.v.refused':
    'No time: the window is too short or the noise is not a number',
  'ttvW.t.v.time': '{dt} minutes, plus or minus {s} (one sigma)',
  'ttvW.t.v.chiOk':
    'Yes: chi-square per degree of freedom {c} with {n} degrees',
  'ttvW.t.v.chiFlag':
    'No: chi-square per degree of freedom {c} with {n} degrees is too high to be noise alone; the stated error bar is not to be trusted',
  'ttvW.t.v.truth':
    'The synthetic planet crossed {e} minutes from the fitted time, {z} sigma',
  'ttvW.t.a.template':
    'The transit shape (radius ratio, a/R*, impact parameter, limb darkening) is the true one and fixed, the noise is white with the stated size, and the star is not spotted',

  'ttvW.o.title': 'The O-C diagram',
  'ttvW.o.note':
    'Observed minus calculated: each measured transit time against the straight-line clock fitted to them all, with the sinusoid and the super-period the fit finds',
  'ttvW.o.control.span': 'Part of the record',
  'ttvW.axis.transit': 'Transit number',
  'ttvW.axis.oc': 'O - C (minutes)',
  'ttvW.legend.oc': 'Measured time minus the clock, with one sigma',
  'ttvW.legend.line': 'The straight-line clock',
  'ttvW.legend.sine': 'Line plus sinusoid, fitted',
  'ttvW.o.row.record': 'The record',
  'ttvW.o.row.clock': 'The clock',
  'ttvW.o.row.scatter': 'Scatter about the clock',
  'ttvW.o.row.verdict': 'Verdict',
  'ttvW.o.row.period': 'Super-period fitted',
  'ttvW.o.row.amp': 'Amplitude fitted',
  'ttvW.o.row.relation': 'Super-period from the pair’s periods',
  'ttvW.o.row.formula': 'Amplitude from the formula',
  'ttvW.o.v.record': '{n} transits over {d} days',
  'ttvW.o.v.refused':
    'No ephemeris: fewer than three transits, or a time that is not a number',
  'ttvW.o.v.clock': 'Period {p} days, plus or minus {s}',
  'ttvW.o.v.scatter': '{rms} minutes; chi-square per degree of freedom {c}',
  'ttvW.o.v.noSignal':
    'No TTV signal above noise: the scatter about the straight line is what the error bars allow (p {p})',
  'ttvW.o.v.unresolved':
    'A signal, but the record covers {c} cycles of the swing and a period needs {m}: no super-period is reported',
  'ttvW.o.v.period': '{p} days (one sigma from {a} to {b})',
  'ttvW.o.v.amp': '{a} minutes',
  'ttvW.o.v.relation':
    '{p} days: 1 over the difference of j over the outer period and j minus 1 over the inner one, j = {j}, distance from the resonance {d}',
  'ttvW.o.v.formula':
    '{a} minutes, if both orbits were circular (and what that leaves out is the eccentricity: an amplitude is not a mass)',
  'ttvW.o.control.view': 'Show',
  'ttvW.o.view.0': 'The O-C diagram',
  'ttvW.o.view.1': 'What the amplitude says about the mass',
  'ttvW.o.control.z': 'Free eccentricity |Z| (an illustration)',
  'ttvW.axis.z': 'Free-eccentricity combination |Z|',
  'ttvW.axis.amp': 'TTV amplitude for these masses (minutes)',
  'ttvW.legend.maxAmp': 'Largest amplitude, for the best direction of Z',
  'ttvW.legend.minAmp': 'Smallest amplitude, for the worst direction',
  'ttvW.legend.measuredAmp': 'The amplitude measured',
  'ttvW.legend.here': 'The |Z| set above',
  'ttvW.o.who.outer': 'outer planet',
  'ttvW.o.who.inner': 'inner planet',
  'ttvW.o.who.other': 'other planet',
  'ttvW.o.row.mass': 'Mass of the {who}, if the pair is circular',
  'ttvW.o.row.truthMass': 'The engine’s mass',
  'ttvW.o.row.assumption': 'Assumption',
  'ttvW.o.row.spread': 'What an eccentricity does',
  'ttvW.o.v.mass':
    '{c} Earth masses (from {a} to {b}), for a star of one solar mass',
  'ttvW.o.v.truthMass': '{m} Earth masses',
  'ttvW.o.v.assumption':
    'Circular orbits. The amplitude also depends on the planets’ eccentricities, which it cannot give, so this is the mass only if they are small compared with the distance from resonance',
  'ttvW.o.v.spread':
    'For the same masses and a free eccentricity combination of {z}, the amplitude could be anywhere from {lo} to +{hi} percent of the circular one, so the mass read from it would be off by that much',
  'ttvW.o.v.noMass':
    'No mass: the amplitude is not measured, or the pair is outside the range of the relation',
  'ttvW.o.refuse.far-from-resonance':
    'No relation: the pair is {d} from the nearest first-order resonance, too far for a slow swing to be expected; the engine is what to use',
  'ttvW.o.refuse.inside-resonance-width':
    'No relation: the pair is inside the width of the resonance, where the angle librates and the sinusoid is not the answer',
  'ttvW.o.refuse.invalid':
    'No relation: the periods or the masses are not numbers',
  'ttvW.o.refuse.order':
    'No relation: the inner planet is not the one with the shorter period',
  'ttvW.o.a.model':
    'Two planets only, in one plane, with a period ratio near a first-order resonance but outside its width; the times are the engine’s with white noise, and nothing here is observed',
};
