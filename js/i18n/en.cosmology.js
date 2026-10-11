// =============================================================================
// The cosmology instruments' words, in English
// -----------------------------------------------------------------------------
// Registered by js/cosmologyWidgets.js when the family loads, so no other page
// carries them. cosW.* ids. The same keys are in es.cosmology.js.
// =============================================================================

export const EN_COSMOLOGY = {
  'cosW.row.state': 'State',
  'cosW.loading': 'Loading the data',
  'cosW.row.source': 'What this is',
  'cosW.h.title': "Hubble's law",
  'cosW.h.note':
    "A galaxy's recession velocity against its distance, with the straight line through the origin. Choose Hubble's own 24 nebulae of 1929, or the supernovae of the Dark Energy Survey out to a redshift you set, and read the slope: the Hubble constant.",
  'cosW.h.control.sample': 'Sample',
  'cosW.h.control.zmax': 'Supernovae out to',
  'cosW.h.sample.0': "Hubble's 24 nebulae (1929)",
  'cosW.h.sample.1': 'Dark Energy Survey supernovae',
  'cosW.h.preset.1929': 'Hubble 1929',
  'cosW.h.preset.modern': 'Supernovae, z up to 0.1',
  'cosW.h.preset.far': 'Supernovae, z up to 0.5',
  'cosW.h.axisD': 'Distance (Mpc)',
  'cosW.h.axisV': 'Velocity cz (km/s)',
  'cosW.h.source.1929':
    'Authentic: Hubble 1929, PNAS 15, 168, Table 1 (24 nebulae)',
  'cosW.h.source.des':
    'Authentic: DES-SN5YR (Sanchez et al. 2024); the distances are on the release scale, H0 = 70',
  'cosW.h.row.n': 'Objects in the fit',
  'cosW.h.row.h0': 'Slope through the origin (Hubble constant)',
  'cosW.h.row.h0line': 'Slope with a free intercept',
  'cosW.h.row.times': 'Slope over 70 km/s/Mpc',
  'cosW.h.row.how': 'How to read it',
  'cosW.h.value.how.0':
    "Hubble's distances were about seven times too small, so his slope is about seven times too large. His own table gives a slope near 450 to 500, not 70.",
  'cosW.h.value.how.1':
    'The supernova distances are on a scale fixed by the release, so the slope shows how the fit changes with the sample, not a measurement of the scale: that comes from the distance ladder. Far supernovae lie below a straight line, because the expansion is not constant.',
  'cosW.d.title': 'The supernova Hubble diagram',
  'cosW.d.note':
    'The distance moduli of 1,829 Type Ia supernovae against redshift. The warm line is a flat universe of matter and a cosmological constant with the density and the Hubble constant you choose, shifted by the one offset that fits best. Statistical errors only.',
  'cosW.d.control.om': 'Matter density, Ωm (flat)',
  'cosW.d.control.h0': 'Hubble constant of the curve',
  'cosW.d.control.calib': 'Error in the supernovae’s absolute magnitude',
  'cosW.d.control.view': 'Picture',
  'cosW.d.view.0': 'Distance modulus against redshift',
  'cosW.d.view.1': 'Residual from an empty universe',
  'cosW.d.preset.default': 'Ωm 0.3',
  'cosW.d.preset.best': 'Best fit, residuals',
  'cosW.d.preset.calib': '0.1 mag off',
  'cosW.d.axisZ': 'Redshift',
  'cosW.d.axisMu': 'Distance modulus (mag)',
  'cosW.d.axisResid': 'Distance modulus minus an empty universe (mag)',
  'cosW.d.source':
    'Authentic: DES-SN5YR (Sanchez et al. 2024); statistical errors, the release scale H0 = 70',
  'cosW.d.row.n': 'Supernovae',
  'cosW.d.row.om': 'Best-fit matter density, Ωm',
  'cosW.d.row.interval': '68% interval for Ωm',
  'cosW.d.row.chi2': 'Chi-square of the best fit, with its degrees of freedom',
  'cosW.d.row.chi2at': 'Chi-square of the curve you chose',
  'cosW.d.row.delta': 'Chi-square above the best fit',
  'cosW.d.row.h0range': 'Chi-square range over H0 from 50 to 90 (offset free)',
  'cosW.d.row.implied': 'Hubble constant implied by that magnitude error',
  'cosW.d.row.perTenth': 'Change in H0 for 0.1 mag',
  'cosW.d.row.how': 'How to read it',
  'cosW.d.value.how':
    'Supernovae fix the shape of the curve, so Ωm; they cannot fix the scale. A change of H0 and a change of the supernovae’s absolute magnitude shift every modulus the same way, so chi-square does not move with H0. The scale comes from the distance ladder.',
  'cosW.w.title': 'A wedge of the sky',
  'cosW.w.note':
    '2,911 galaxies of the Sloan Digital Sky Survey in a strip 120 degrees long and half a degree thick, placed by right ascension and by distance from their redshifts. You are looking down on the strip: we are at the bottom, and each dot is a galaxy.',
  'cosW.w.control.zmax': 'Galaxies out to',
  'cosW.w.control.om': 'Matter density used for the distances',
  'cosW.w.control.view': 'Picture',
  'cosW.w.view.0': 'The wedge',
  'cosW.w.view.1': 'Galaxies per volume against distance',
  'cosW.w.preset.wedge': 'The wedge',
  'cosW.w.preset.density': 'Density against distance',
  'cosW.w.axisX': 'Across the line of sight (Mpc)',
  'cosW.w.axisY': 'Distance along the line of sight (Mpc)',
  'cosW.w.axisR': 'Distance (Mpc)',
  'cosW.w.axisDensity': 'Galaxies per 10^6 cubic Mpc',
  'cosW.w.source':
    'Authentic: SDSS DR18, the Legacy main sample (r < 17.77), declination 0 to 0.5 degrees',
  'cosW.w.row.shown': 'Galaxies shown',
  'cosW.w.row.rmax': 'Distance of the farthest, in the cosmology chosen',
  'cosW.w.row.vmr':
    'Variance over mean of counts in cells (1 for no clustering)',
  'cosW.w.row.near': 'Galaxies per 10^6 cubic Mpc, 100 to 125 Mpc',
  'cosW.w.row.far': 'Galaxies per 10^6 cubic Mpc, 300 to 325 Mpc',
  'cosW.w.row.how': 'How to read it',
  'cosW.w.value.how':
    'Galaxies gather into walls and voids. The survey sees only galaxies brighter than a limit, so far away it counts only the brightest and the density falls: that thinning is a selection effect, not a void.',
};
