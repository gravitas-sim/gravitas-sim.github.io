// The detector-effects instrument's words, in English (Prompt 211). The model and
// what-it-leaves-out lines are fixed text, so they translate by key.
export const EN_EFFECTS = {
  'fxW.title': 'What a detector does to a measurement',
  'fxW.note':
    'A synthetic frame of one bright star and some fainter ones, made with the detector effects you switch on and measured with the Observatory’s photometry tool. The tool refuses a pixel at the linear limit and a pixel the frame’s sidecar flags; the number it would have given is shown beside the refusal.',
  'fxW.control.bright': 'Bright star S (V magnitude)',
  'fxW.control.exposure': 'Exposure',
  'fxW.control.nonlinear': 'Nonlinearity near the full well',
  'fxW.control.bleed': 'Charge bleeding',
  'fxW.control.cosmic': 'Cosmic-ray tracks',
  'fxW.control.fwhm': 'Profile width (FWHM, pixels)',
  'fxW.control.flags': 'Show the sidecar flags',
  'fxW.toggle.0': 'off',
  'fxW.toggle.1': 'on',
  'fxW.row.model': 'Model',
  'fxW.m':
    'A synthetic CCD frame with stated effects: a tanh roll-off above a knee at 0.8 of the full well, cosmic-ray tracks and charge bleeding along columns; a Gaussian profile integrated over square pixels',
  'fxW.row.sampling': 'Sampling',
  'fxW.v.sampling':
    'FWHM {w} pixels, {r} (about 2 are needed to sample a profile); the peak pixel holds {lo} to {hi} percent of a star’s light, by where the star sits in it; the flux inside an aperture 1.5 FWHM in radius varies by {s} percent (1 sigma) with that position',
  'fxW.regime.under': 'undersampled',
  'fxW.regime.adequate': 'adequately sampled',
  'fxW.regime.over': 'oversampled',
  'fxW.row.limit': 'Linear limit',
  'fxW.v.limitOn':
    'a pixel holding {lim} electrons reads 1 percent below linear; a full pixel ({fw} electrons) reads {plateau}',
  'fxW.v.limitOff':
    'the response is linear to the full well; a full pixel reads {fw} electrons (the tool refuses within 5 read-noise sigma of it)',
  'fxW.row.star': 'Star {id}',
  'fxW.role.bright': 'the bright star',
  'fxW.role.trail': 'faint, on the bright star’s column',
  'fxW.role.control': 'faint, off every column',
  'fxW.role.ladder': 'a rung of the brightness ladder',
  'fxW.v.measured':
    '{role}, V = {m}: {net} electrons, {pull} sigma from the {truth} the model put in; sidecar flags: {flags}',
  'fxW.v.refused.saturated':
    '{role}, V = {m}: refused, a pixel in the aperture is at or above the limit; ignoring that, it would read {ratio} percent of the {truth} electrons the model put in; sidecar flags: {flags}',
  'fxW.v.refused.masked':
    '{role}, V = {m}: refused, a pixel the sidecar flags as bleed or cosmic ray is in the aperture; ignoring that, it would read {ratio} percent of the {truth} electrons the model put in; sidecar flags: {flags}',
  'fxW.v.refused.other':
    '{role}, V = {m}: refused ({code}); sidecar flags: {flags}',
  'fxW.flags.none': 'none',
  'fxW.flag.saturated': 'saturated',
  'fxW.flag.bleed': 'bleed',
  'fxW.flag.cosmic': 'cosmic ray',
  'fxW.flag.nonlinear': 'nonlinear',
  'fxW.row.bleed': 'Bleeding',
  'fxW.v.bleed':
    '{n} pixels received charge from saturated ones; {lost} electrons were lost at the length cap or the frame edge',
  'fxW.v.bleedOff':
    'off: a saturated pixel holds its full well and nothing spills',
  'fxW.row.cosmic': 'Cosmic-ray tracks',
  'fxW.v.cosmic': '{n} tracks, {p} flagged pixels',
  'fxW.v.cosmicOff': 'off: no cosmic rays in this frame',
  'fxW.row.assumes': 'What it leaves out',
  'fxW.a':
    'charge-transfer loss; an energy-loss spread for cosmic rays; hot columns, amplifier glow and persistence; blooming across rows; charge diffusion between pixels; any detector’s measured response (the curve, the track deposit and the bleed rule are stated models, not measurements)',
  'fxW.axis.x': 'Charge collected at the peak (electrons)',
  'fxW.axis.y': 'Recorded (electrons)',
  'fxW.legend.frame': 'synthetic frame',
  'fxW.legend.flags':
    'red saturated · magenta bleed · cyan cosmic ray · orange nonlinear',
  'fxW.legend.plot': 'the stars’ peaks against the stated response',
};
