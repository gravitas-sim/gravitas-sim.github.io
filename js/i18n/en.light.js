// =============================================================================
// The Light Lab's words, in English
// -----------------------------------------------------------------------------
// Registered by js/lightWidgets.js when the family loads, so no other page
// carries them (the same split js/i18n/en.placement.js made). lightW.* ids.
// =============================================================================

export const EN_LIGHT = {
  'lightW.bb.title': 'Blackbody explorer',
  'lightW.bb.note':
    'A computed blackbody (Planck’s law), not a measurement of any star. The curve is scaled to its own peak; the power it radiates is in the list below.',
  'lightW.control.T': 'Temperature',
  'lightW.control.pair': 'Color measured through',
  'lightW.pair.bv': 'B − V (Vega system)',
  'lightW.pair.gr': 'g − r (AB system)',
  'lightW.preset.sun': 'The Sun, 5,772 K',
  'lightW.preset.k': '{T} K',
  'lightW.axis.wavelength': 'wavelength, nm (log scale)',
  'lightW.visible': 'visible',
  'lightW.loading': 'loading the data…',
  'lightW.row.kind': 'What this is',
  'lightW.value.kind': 'Computed: Planck’s law from the radiation kernel',
  'lightW.row.T': 'Temperature',
  'lightW.row.peak': 'Peak wavelength (per unit wavelength)',
  'lightW.row.peakNu': 'Peak frequency (per unit frequency)',
  'lightW.value.peakNu':
    '{v} THz, which is not c divided by the peak wavelength: a spectrum per unit frequency is a different curve',
  'lightW.row.exitance': 'Power radiated per square meter, σT⁴',
  'lightW.row.vsSun': 'That power compared with 5,772 K',
  'lightW.row.color': 'Color index {pair}',
  'lightW.row.rgb': 'Color as displayed (sRGB)',
  'lightW.value.rgb':
    'red {r}, green {g}, blue {b}, scaled so the largest is 255; a blackbody hotter than about 9,000 K is bluer than a screen can show',
  'lightW.row.cite': 'Sources',
  'lightW.value.cite':
    'Bessell & Murphy 2012 (B, V), SDSS 2001 filter curves (g, r), CALSPEC Vega; displayed color from the Wyman, Sloan & Shirley 2013 fit to the CIE 1931 curves',
  'lightW.sp.title': 'Spectrum viewer',
  'lightW.sp.note':
    'A spectrum is light split by wavelength. Pick a star, see the whole spectrum with the line list laid over it, then zoom on one line to measure where it sits. A synthetic star is a model with a shift the viewer does not tell you.',
  'lightW.sp.control.src': 'Spectrum',
  'lightW.sp.control.view': 'View',
  'lightW.sp.control.line': 'Line to measure',
  'lightW.sp.view.all': 'whole spectrum',
  'lightW.sp.view.zoom': 'zoom on one line',
  'lightW.sp.src.a': 'A star (SDSS, observed)',
  'lightW.sp.src.g': 'G star (SDSS, observed)',
  'lightW.sp.src.k': 'K star (SDSS, observed)',
  'lightW.sp.src.m': 'M star (SDSS, observed)',
  'lightW.sp.src.s1': 'Synthetic star 1',
  'lightW.sp.src.s2': 'Synthetic star 2',
  'lightW.sp.src.s3': 'Synthetic star 3',
  'lightW.sp.preset.all': 'The A star, whole spectrum',
  'lightW.sp.preset.synth': 'Synthetic star 1, H-alpha',
  'lightW.sp.tagObserved': 'Observed: SDSS DR18',
  'lightW.sp.tagSynthetic': 'Synthetic: a model, not a star',
  'lightW.sp.kindObserved':
    'Observed: photons from a real star, recorded by the SDSS spectrograph',
  'lightW.sp.kindSynthetic':
    'Computed: a model spectrum with noise and a hidden Doppler shift',
  'lightW.sp.axisX': 'wavelength, Å (vacuum)',
  'lightW.sp.axisYAll': 'flux, scaled to the largest in view',
  'lightW.sp.axisYZoom': 'flux ÷ fitted continuum',
  'lightW.sp.row.src': 'Spectrum',
  'lightW.sp.row.state': 'Status',
  'lightW.sp.row.dips': 'The deepest dips',
  'lightW.sp.value.dips':
    'The five deepest, each named after the line list’s nearest line; a pointer to where to look, not a measurement',
  'lightW.sp.row.dip': 'Dip {n}',
  'lightW.sp.value.dip':
    '{name}, rest {lam} Å: {depth} % below the level either side',
  'lightW.sp.row.line': 'Line',
  'lightW.sp.value.line':
    '{name} ({species}), rest wavelength {rest} Å in vacuum',
  'lightW.sp.value.noLine':
    'No absorption line found in the window: the continuum is not dipping here',
  'lightW.sp.row.center': 'Measured center',
  'lightW.sp.row.shift': 'Shift from the rest wavelength',
  'lightW.sp.row.v': 'Velocity, c × shift ÷ rest (positive is receding)',
  'lightW.sp.row.ew': 'Equivalent width',
  'lightW.sp.row.depth': 'Depth below the continuum',
  'lightW.sp.row.cont': 'Continuum fit',
  'lightW.sp.value.cont':
    'a straight line through the {n} points in the two shaded gray windows; scatter {scatter} of the continuum',
  'lightW.sp.row.how': 'How it is measured',
  'lightW.sp.value.how':
    'The center is the depth-weighted mean wavelength inside the tinted line window. Uncertainties assume white noise as large as the continuum’s scatter. The velocity is the non-relativistic c × shift ÷ rest, which is fine far below the speed of light.',
  'lightW.sp.row.catalog': 'SDSS catalog value for this star',
  'lightW.sp.value.catalog':
    'z = {z}, which is {v}; a fit of a template to the whole spectrum, not to this one line',
  'lightW.sp.row.cite': 'Sources',
  'lightW.sp.value.cite':
    'Spectra: SDSS DR18 (Almeida et al. 2023); line list: NIST Atomic Spectra Database, vacuum wavelengths by Morton 2000; measurement: Gravitas spectrum-line node',
  'lightW.line.h-alpha': 'H-alpha',
  'lightW.line.h-beta': 'H-beta',
  'lightW.line.h-gamma': 'H-gamma',
  'lightW.line.h-delta': 'H-delta',
  'lightW.line.ca2-k': 'Ca II K',
  'lightW.line.ca1-4227': 'Ca I 4227',
  'lightW.line.na1-d2': 'Na I D2',
  'lightW.line.mg1-b2': 'Mg I b2',
};
