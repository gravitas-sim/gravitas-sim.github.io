// The direct-imaging panels' words, in English (Prompt 230). The instruments are teaching
// examples and the panels say so; the verdict words are fixed text, so they translate by key.
export const EN_DIRECT_IMAGING = {
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
    'a young giant around a cool star (a stand-in, not a catalogue planet)',
  'dirW.systemName.3':
    'a hot Jupiter around the Sun (a stand-in, not a catalogue planet)',
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
};
