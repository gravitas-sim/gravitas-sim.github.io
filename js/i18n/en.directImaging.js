// The direct-imaging panels' words, in English (Prompt 230). The instruments are teaching
// examples and the panels say so; the verdict words are fixed text, so they translate by key.
export const EN_DIRECTIMAGING = {
  'dirW.contrast.title': 'Seeing a planet beside its star',
  'dirW.contrast.note':
    'Two different problems stand between a telescope and a planet. The planet must be far enough from its star on the sky (an angle), and it must be bright enough against the star’s glare (a flux ratio, the contrast). The diffraction scale λ/D belongs to the telescope; a coronagraph’s inner working angle is a separate number that belongs to the instrument. The four instruments here are teaching examples: their working angles and contrast floors are not the specifications of any real instrument.',
  'dirW.control.system': 'Planet',
  'dirW.control.distance': 'Distance',
  'dirW.control.telescope': 'Instrument',
  'dirW.control.phase': 'Phase angle',
  'dirW.control.band': 'Wavelength',
  'dirW.band.0': 'the instrument’s own',
  'dirW.band.1': '10 µm, mid-infrared',
  'dirW.control.plots': 'Show the plot',
  'dirW.system.0': 'Earth',
  'dirW.system.1': 'Jupiter',
  'dirW.system.2': 'young giant',
  'dirW.system.3': 'hot Jupiter',
  'dirW.systemName.0': 'Earth around the Sun',
  'dirW.systemName.1': 'Jupiter around the Sun',
  'dirW.systemName.2':
    'a young giant around a cool star (a stand-in, not a catalog planet)',
  'dirW.systemName.3':
    'a hot Jupiter around the Sun (a stand-in, not a catalog planet)',
  'dirW.tel.0': '0.25 m, visible',
  'dirW.tel.1': '2.4 m, visible',
  'dirW.tel.2': '8 m, near-IR',
  'dirW.tel.3': '6 m, visible',
  'dirW.on': 'on',
  'dirW.off': 'off',
  'dirW.axis.wavelength': 'log10 of the wavelength, in micrometres',
  'dirW.axis.contrast': 'log10 of the contrast (planet over star)',
  'dirW.axis.mass': 'log10 of the mass, in Jupiter masses',
  'dirW.axis.axis': 'log10 of the semi-major axis, in AU',
  'dirW.axis.angle': 'log10 of the angle on the sky, in arcseconds',
  'dirW.legend.reflected': 'Reflected starlight',
  'dirW.legend.thermal': 'Thermal emission',
  'dirW.legend.total': 'Total',
  'dirW.legend.floor': 'Contrast floor (example)',
  'dirW.legend.at': 'At this instrument’s wavelength',
  'dirW.legend.solar': 'Solar System',
  'dirW.legend.imaged': 'Imaged planets (archive)',
  'dirW.legend.iwa': 'Inner working angle (example)',
  'dirW.row.system': 'Planet',
  'dirW.v.system':
    '{n}: seen from {d} parsecs at a phase angle of {a} degrees; orbit {r} AU, star {t} K',
  'dirW.row.separation': 'Separation',
  'dirW.v.separation':
    '{s} arcseconds on the sky: {r} AU, which is the orbit’s radius times the sine of the phase angle',
  'dirW.row.scale': 'Diffraction scale',
  'dirW.v.scale':
    'λ/D is {x} arcseconds for {D} m at {w} micrometres, and the separation is {k} λ/D. λ/D is the telescope’s diffraction scale. It is not a coronagraph’s inner working angle.',
  'dirW.row.iwa': 'Inner working angle',
  'dirW.v.iwa':
    '{n} λ/D, which is {a} arcseconds: a teaching value for this example, not a cited specification of any instrument',
  'dirW.row.contrast': 'Contrast',
  'dirW.v.contrast':
    'reflected {r}, thermal {t}, total {c}: the planet is {k} times fainter than its star at {w} micrometres',
  'dirW.row.verdict': 'Can this instrument see it?',
  'dirW.v.observable':
    'Outside the inner working angle and brighter than the contrast floor of {f}: this example instrument could see it. The panel does not model the starlight suppression, so this is a necessary condition and not a prediction.',
  'dirW.v.notObservable': 'Not observable with this instrument: {r}.',
  'dirW.reason.inside-inner-working-angle':
    'the planet lies inside the stated inner working angle',
  'dirW.reason.below-contrast-floor':
    'the planet is fainter than the stated contrast floor of {f}',
  'dirW.row.temperature': 'Temperature',
  'dirW.v.irradiated':
    'The planet is drawn as a blackbody at {t} K, what starlight alone gives it (a Bond albedo of {b}).',
  'dirW.v.selfLuminous':
    'The planet is drawn as a blackbody at {t} K, the temperature stated. Starlight alone would heat it to only {e} K: it shines by its own heat, which is why young giants can be imaged.',
  'dirW.row.assumes': 'Assumes',
  'dirW.a':
    'Blackbody planet and star; a Lambert sphere with the stated geometric albedo; a circular orbit; the separation is the orbit’s radius times the sine of the phase angle; the contrast is a flux ratio of the unresolved bodies; no starlight suppression, speckle noise or exposure time. Where the plot drops below 10⁻¹⁶ it is drawn at that value.',
  'dirW.arch.title': 'The Solar System and the planets we have imaged',
  'dirW.arch.note':
    'The planets of the Solar System and the imaged planets of the NASA Exoplanet Archive on a log scale. The imaged planets are the ones that can be imaged: wide, massive and young. They are not a sample of the planets that exist.',
  'dirW.control.view': 'Plot',
  'dirW.view.0': 'orbit and mass',
  'dirW.view.1': 'angle and mass',
  'dirW.row.table': 'The table',
  'dirW.v.table':
    '{n} imaged planets in the archive table; {m} have a semi-major axis and a mass, and {k} also a distance',
  'dirW.row.imaged': 'The imaged planets',
  'dirW.v.imaged':
    'median semi-major axis {a} AU and median mass {m} Jupiter masses; {h} of {n} are heavier than Jupiter and {b} lie beyond Neptune’s orbit',
  'dirW.row.solar': 'The Solar System',
  'dirW.v.solar':
    'seen from {d} parsecs its planets lie between {lo} arcseconds (Mercury) and {hi} arcseconds (Neptune) of the Sun',
  'dirW.row.window': 'With this instrument',
  'dirW.v.window':
    'The example inner working angle is {a} arcseconds: {i} of {k} imaged planets and {s} of the 8 Solar System planets lie outside it. Separation only: contrast is not judged here.',
  'dirW.row.source': 'Source',
  'dirW.v.source':
    'NASA Exoplanet Archive, Planetary Systems Composite Parameters, discovery method Imaging, retrieved 2026-10-31 (credit requested; the per-planet references were not retrieved). The angle is the semi-major axis over the distance, not one epoch’s projected separation.',
  // Part B: subtraction and orbit (Prompt 230)
  'dirW.sub.title': 'Subtracting a star to find a planet',
  'dirW.sub.note':
    'A target frame holds a star and, in its glare, a planet put in by injection. A reference frame holds another star. The reference is scaled to the target by least squares and subtracted. The point-spread function is a Moffat profile with no diffraction rings and no speckle, so the one thing that can go wrong is the two stars not matching: their widths and centres differ a little, and that leaves a residual. This is reference-star subtraction only; angular or spectral differential imaging, with their self-subtraction, are not modeled. The frames are synthetic.',
  'dirW.control.sep': 'Planet’s separation',
  'dirW.control.contrast': 'Planet’s contrast',
  'dirW.control.mismatch': 'Reference star',
  'dirW.control.scene': 'Scene',
  'dirW.cn.0': '1 × 10⁻³',
  'dirW.cn.1': '3 × 10⁻³',
  'dirW.cn.2': '1 × 10⁻²',
  'dirW.cn.3': '3 × 10⁻²',
  'dirW.cn.4': '1 × 10⁻¹',
  'dirW.mm.0': 'identical width and centre',
  'dirW.mm.1': 'a little different (3 percent, 0.03 pixel)',
  'dirW.mm.2': '20 percent wider',
  'dirW.sub.target': 'Target (planet put in)',
  'dirW.sub.residual': 'After subtraction',
  'dirW.sub.key':
    'Orange ring: where the planet is. Dashed green ring: this method’s working radius.',
  'dirW.sub.refused.reference-mismatch': 'refused: reference does not match',
  'dirW.sub.refused.saturated': 'refused: saturated',
  'dirW.row.subtraction': 'Subtraction',
  'dirW.v.subtraction':
    'The reference is scaled by {k}, and what is left of the star within two FWHM is {d} percent of its light.',
  'dirW.v.refused.reference-mismatch':
    'Refused: the reference does not match the target star. It would leave {d} of the star’s light and the limit is {l}. Choose another reference.',
  'dirW.v.refused.saturated':
    'Refused: a pixel of one frame is above 0.9 of the full well, so the star’s core cannot be subtracted.',
  'dirW.row.noise': 'Noise',
  'dirW.v.noise':
    'Around the planet the residual’s noise, measured in the residual itself, is {n} electrons a pixel.',
  'dirW.row.planet': 'The planet',
  'dirW.v.measured':
    'Signal to noise {snr}. Measured flux {f} ± {sf} electrons against {inj} injected, a throughput of {tp}; the position is {de} pixel from the truth.',
  'dirW.v.inside':
    'Not measurable behind the star’s residual with this subtraction: the planet is {s} FWHM out and this method’s working radius is {w} FWHM. That radius belongs to this method on these frames; it is not λ/D and not an instrument’s inner working angle.',
  'dirW.row.search': 'A blind search',
  'dirW.v.search.found': 'finds the planet (signal to noise {snr}).',
  'dirW.v.search.elsewhere':
    'finds something else, {d} pixels away, at signal to noise {snr}: a false candidate.',
  'dirW.v.search.none':
    'finds nothing at signal to noise 5 or more (the best is {snr}).',
  'dirW.row.limit': 'The 5σ limit here',
  'dirW.v.limit':
    'A planet fainter than a contrast of {c} ({f} electrons) is not detected at this separation; at that contrast about half are found.',
  'dirW.v.subassumes':
    'Synthetic frames; a Moffat profile with no rings or speckle; a clean detector; reference-star subtraction only. The star’s own light is {star} electrons.',
  'dirW.orb.title': 'Following a planet',
  'dirW.orb.note':
    'Each dot is one epoch: a frame pair of the star and a reference star, subtracted, and the planet’s position measured with its uncertainty. The orbit is fitted by the Observatory’s visual-binary fitter (Prompt 187), unchanged: it returns elements only if the arc covers enough of the period and the parameters are not degenerate, and otherwise says not constrained. The map shows how well each period and eccentricity fits the same dots (dark blue within the 68 percent region, lighter blue within 95 percent). The planets are invented and the frames synthetic.',
  'dirW.control.orbsys': 'Planet',
  'dirW.orbsys.0': 'circular',
  'dirW.orbsys.1': 'eccentric',
  'dirW.orbsys.2': 'more eccentric',
  'dirW.control.orbarc': 'Time followed',
  'dirW.orbarc.0': '10 % of a period',
  'dirW.orbarc.1': '30 % of a period',
  'dirW.orbarc.2': '60 % of a period',
  'dirW.orbarc.3': '110 % of a period',
  'dirW.control.reveal': 'Show the true orbit',
  'dirW.orb.sky': 'The sky (north up, east right)',
  'dirW.orb.map': 'The map: eccentricity against period',
  'dirW.orb.axis': 'period, years (log scale)',
  'dirW.row.epochs': 'Epochs',
  'dirW.v.epochs':
    '{k} of 12 measured ({l} lost: not detected, or inside the working radius).',
  'dirW.row.orbit': 'The orbit',
  'dirW.v.orbit.ok':
    'Period {p} years (68 percent: {lo} to {hi}), eccentricity {e}{circ}, semi-major axis {a} ± {sa} arcsecond.',
  'dirW.v.orbit.circ': ' (not detected: the circular orbit)',
  'dirW.v.orbit.no': 'Not constrained ({code}): {why}. No orbit is reported.',
  'dirW.orb.code.coverage': 'the arc covers too little of the period',
  'dirW.orb.code.conditioning':
    'the parameters are nearly degenerate over this arc',
  'dirW.orb.code.period-unbounded':
    'the period is not bounded on both sides by the data',
  'dirW.orb.code.period-ambiguous': 'another period fits as well',
  'dirW.orb.code.inconsistent':
    'the model does not describe the dots within their uncertainties',
  'dirW.orb.code.epochs': 'too few epochs were measured',
  'dirW.orb.code.bad-series': 'the series cannot be used',
  'dirW.row.map': 'What the dots allow',
  'dirW.v.map':
    'At 95 percent the same dots allow a period from {lo} to {hi} years (a factor of {f}) and an eccentricity from {elo} to {ehi}.',
  'dirW.row.truth': 'The true orbit (invented)',
  'dirW.v.truth':
    'period {p} years, eccentricity {e}, semi-major axis {a} arcsecond.',
  'dirW.v.hidden': 'hidden until you ask.',
  'dirW.v.orbassumes':
    'Synthetic frames and invented planets; a plate scale of 0.05 arcsecond a pixel; a planet 3 × 10⁻³ of its star’s light; the fitter’s criterion unchanged.',
};
