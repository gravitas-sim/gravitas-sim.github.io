// The telescope instrument's words, in English (Prompt 208). The model and
// what-it-leaves-out lines are fixed text, so they translate by key.
export const EN_TELESCOPE = {
  'telW.title': 'A telescope, its aperture and the air',
  'telW.note':
    'A synthetic frame of a double star or a faint field, made through the telescope you set and measured with the Observatory’s PSF tool. Two widths are kept apart: the Rayleigh separation is computed from the aperture, the measured FWHM is read from the stars in this frame.',
  'telW.control.aperture': 'Aperture',
  'telW.control.focal': 'Focal ratio',
  'telW.control.wavelength': 'Wavelength',
  'telW.control.seeing': 'Seeing (FWHM; 0 is space)',
  'telW.control.obstruction': 'Central obstruction',
  'telW.control.exposure': 'Exposure',
  'telW.control.scene': 'Field',
  'telW.control.separation': 'Pair separation',
  'telW.scene.0': 'double star',
  'telW.scene.1': 'faint field',
  'telW.row.model': 'Model',
  'telW.m':
    'An Airy pattern of the aperture convolved with a Moffat seeing profile, in a synthetic frame',
  'telW.row.rayleigh':
    'Rayleigh separation (computed from aperture and wavelength)',
  'telW.row.fwhm':
    'Measured FWHM (fitted to the reference stars in this frame)',
  'telW.v.fwhm': '{w} ± {s} arcsec',
  'telW.v.fwhmLimited':
    '{w} ± {s} arcsec, a model fit: the profile is not a Moffat',
  'telW.v.none':
    'no width could be measured (a star was saturated or too near an edge)',
  'telW.row.airy': 'The diffraction pattern’s own FWHM (computed, no seeing)',
  'telW.row.seeing': 'Seeing you set',
  'telW.row.profile': 'FWHM of the combined profile (computed)',
  'telW.row.pair': 'The pair',
  'telW.v.pair':
    'separation {s} arcsec, {r} times the Rayleigh separation; the dip between the stars is {d} percent (two diffraction patterns at the Rayleigh separation dip by 26.5 percent)',
  'telW.row.faint': 'The faint star',
  'telW.v.faintSeen':
    'V = {m}: listed by the detector; the CCD equation gives a signal to noise of {e}',
  'telW.v.faintMissed':
    'V = {m}: not listed; the CCD equation gives a signal to noise of {e}',
  'telW.row.gather': 'Light gathered',
  'telW.v.gather':
    '{a} times a 10 cm telescope; {b} times the dark-adapted eye',
  'telW.row.scale': 'Plate scale',
  'telW.v.scale': '{p} arcsec per pixel (focal length {f} m, pixels 5 microns)',
  'telW.row.saturated': 'Warning',
  'telW.v.saturated': 'a star is saturated: its width is not measured',
  'telW.row.assumes': 'What it leaves out',
  'telW.a':
    'adaptive optics; a Kolmogorov phase screen (the seeing is a Moffat of stated FWHM, the same at every wavelength and aperture); aberrations and a spider; a detector response other than the box pixel; more than one wavelength; the brightness of a star is its V magnitude whatever the wavelength. Every frame is synthetic.',
  'telW.axis.x': 'Offset along the pair (arcsec)',
  'telW.axis.y': 'Brightness (peak = 1)',
  'telW.legend.pair': 'the two stars, summed (model)',
  'telW.legend.row': 'this frame, the row through the pair',
  'telW.legend.faint': 'faint star here',
  'telW.legend.frame': 'synthetic frame',
};
