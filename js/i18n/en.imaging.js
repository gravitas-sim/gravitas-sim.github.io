// The direct-imaging panels' words, in English (Prompt 230). The instruments are teaching
// examples and the panels say so; the verdict words are fixed text, so they translate by key.
export const EN_IMAGING = {
  'imgW.contrast.title': 'Seeing a planet beside its star',
  'imgW.contrast.note':
    'Two different problems stand between a telescope and a planet. The planet must be far enough from its star on the sky (an angle), and it must be bright enough against the star’s glare (a flux ratio, the contrast). The diffraction scale λ/D belongs to the telescope; a coronagraph’s inner working angle is a separate number that belongs to the instrument. The four instruments here are teaching examples: their working angles and contrast floors are not the specifications of any real instrument.',
  'imgW.control.system': 'Planet',
  'imgW.control.distance': 'Distance',
  'imgW.control.telescope': 'Instrument',
  'imgW.control.phase': 'Phase angle',
  'imgW.control.plots': 'Show the plot',
  'imgW.system.0': 'Earth',
  'imgW.system.1': 'Jupiter',
  'imgW.system.2': 'young giant',
  'imgW.system.3': 'hot Jupiter',
  'imgW.systemName.0': 'Earth around the Sun',
  'imgW.systemName.1': 'Jupiter around the Sun',
  'imgW.systemName.2':
    'a young giant around a cool star (a stand-in, not a catalogue planet)',
  'imgW.systemName.3':
    'a hot Jupiter around the Sun (a stand-in, not a catalogue planet)',
  'imgW.tel.0': '0.25 m, visible',
  'imgW.tel.1': '2.4 m, visible',
  'imgW.tel.2': '8 m, near-IR',
  'imgW.tel.3': '6 m, visible',
  'imgW.on': 'on',
  'imgW.off': 'off',
  'imgW.axis.wavelength': 'log10 of the wavelength, in micrometres',
  'imgW.axis.contrast': 'log10 of the contrast (planet over star)',
  'imgW.axis.mass': 'log10 of the mass, in Jupiter masses',
  'imgW.axis.axis': 'log10 of the semi-major axis, in AU',
  'imgW.axis.angle': 'log10 of the angle on the sky, in arcseconds',
  'imgW.legend.reflected': 'Reflected starlight',
  'imgW.legend.thermal': 'Thermal emission',
  'imgW.legend.total': 'Total',
  'imgW.legend.floor': 'Contrast floor (example)',
  'imgW.legend.at': 'At this instrument’s wavelength',
  'imgW.legend.solar': 'Solar System',
  'imgW.legend.imaged': 'Imaged planets (archive)',
  'imgW.legend.iwa': 'Inner working angle (example)',
  'imgW.row.system': 'Planet',
  'imgW.v.system':
    '{n}: seen from {d} parsecs at a phase angle of {a} degrees; orbit {r} AU, star {t} K',
  'imgW.row.separation': 'Separation',
  'imgW.v.separation':
    '{s} arcseconds on the sky: {r} AU, which is the orbit’s radius times the sine of the phase angle',
  'imgW.row.scale': 'Diffraction scale',
  'imgW.v.scale':
    'λ/D is {x} arcseconds for {D} m at {w} micrometres, and the separation is {k} λ/D. λ/D is the telescope’s diffraction scale. It is not a coronagraph’s inner working angle.',
  'imgW.row.iwa': 'Inner working angle',
  'imgW.v.iwa':
    '{n} λ/D, which is {a} arcseconds: a teaching value for this example, not a cited specification of any instrument',
  'imgW.row.contrast': 'Contrast',
  'imgW.v.contrast':
    'reflected {r}, thermal {t}, total {c}: the planet is {k} times fainter than its star at {w} micrometres',
  'imgW.row.verdict': 'Can this instrument see it?',
  'imgW.v.observable':
    'Outside the inner working angle and brighter than the contrast floor of {f}: this example instrument could see it. The panel does not model the starlight suppression, so this is a necessary condition and not a prediction.',
  'imgW.v.notObservable': 'Not observable with this instrument: {r}.',
  'imgW.reason.inside-inner-working-angle':
    'the planet lies inside the stated inner working angle',
  'imgW.reason.below-contrast-floor':
    'the planet is fainter than the stated contrast floor of {f}',
  'imgW.row.temperature': 'Temperature',
  'imgW.v.irradiated':
    'The planet is drawn as a blackbody at {t} K, what starlight alone gives it (a Bond albedo of {b}).',
  'imgW.v.selfLuminous':
    'The planet is drawn as a blackbody at {t} K, the temperature stated. Starlight alone would heat it to only {e} K: it shines by its own heat, which is why young giants can be imaged.',
  'imgW.row.assumes': 'Assumes',
  'imgW.a':
    'Blackbody planet and star; a Lambert sphere with the stated geometric albedo; a circular orbit; the separation is the orbit’s radius times the sine of the phase angle; the contrast is a flux ratio of the unresolved bodies; no starlight suppression, speckle noise or exposure time. Where the plot drops below 10⁻¹⁶ it is drawn at that value.',
  'imgW.arch.title': 'The Solar System and the planets we have imaged',
  'imgW.arch.note':
    'The planets of the Solar System and the imaged planets of the NASA Exoplanet Archive on a log scale. The imaged planets are the ones that can be imaged: wide, massive and young. They are not a sample of the planets that exist.',
  'imgW.control.view': 'Plot',
  'imgW.view.0': 'orbit and mass',
  'imgW.view.1': 'angle and mass',
  'imgW.row.table': 'The table',
  'imgW.v.table':
    '{n} imaged planets in the archive table; {m} have a semi-major axis and a mass, and {k} also a distance',
  'imgW.row.imaged': 'The imaged planets',
  'imgW.v.imaged':
    'median semi-major axis {a} AU and median mass {m} Jupiter masses; {h} of {n} are heavier than Jupiter and {b} lie beyond Neptune’s orbit',
  'imgW.row.solar': 'The Solar System',
  'imgW.v.solar':
    'seen from {d} parsecs its planets lie between {lo} arcseconds (Mercury) and {hi} arcseconds (Neptune) of the Sun',
  'imgW.row.window': 'With this instrument',
  'imgW.v.window':
    'The example inner working angle is {a} arcseconds: {i} of {k} imaged planets and {s} of the 8 Solar System planets lie outside it. Separation only: contrast is not judged here.',
  'imgW.row.source': 'Source',
  'imgW.v.source':
    'NASA Exoplanet Archive, Planetary Systems Composite Parameters, discovery method Imaging, retrieved 2026-10-31 (credit requested; the per-planet references were not retrieved). The angle is the semi-major axis over the distance, not one epoch’s projected separation.',
};
