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
  'lightW.loading': 'loading the bandpasses…',
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
};
