// The spectrograph instruments' words, in English (Prompt 213, SPECTROGRAPH.md). The fixed
// lines translate by key; the computed ones use {placeholders}.
export const EN_SPECTROGRAPH = {
  // ---- two lines
  'specW.pair.title': 'Two lines through a spectrograph',
  'specW.pair.note':
    'Two equal, intrinsically narrow lines, 500 nm, through a spectrograph whose resolving power, pixel size and noise you set. The smooth curve is what the instrument’s line-spread function makes of the pair; the dots are the pixels. A synthetic spectrum.',
  'specW.control.R': 'Resolving power R (at 500 nm)',
  'specW.control.sep': 'Separation of the lines',
  'specW.control.sampling': 'Pixels per FWHM (sampling)',
  'specW.control.snr': 'Peak signal to noise of one line',
  'specW.snr.0': 'no noise',
  'specW.row.model': 'Model',
  'specW.m':
    'Two Gaussian lines through a Gaussian line-spread function of fixed width, integrated over each pixel, with photon and read noise; a synthetic spectrum',
  'specW.row.fwhm': 'Line-spread FWHM (500 nm over R)',
  'specW.v.fwhm': '{w} nm',
  'specW.row.sampling': 'Sampling (pixels per FWHM)',
  'specW.v.sampling': '{s}: {v}',
  'specW.verdict.ok': 'at least 2, the line is well sampled',
  'specW.verdict.undersampled': 'under 2, undersampled',
  'specW.verdict.severely-undersampled': 'under 1, severely undersampled',
  'specW.row.sep': 'Separation',
  'specW.v.sep': '{n} nm, {f} FWHM, {p} pixels',
  'specW.row.dip': 'Dip between the lines (the model’s smooth profile)',
  'specW.v.dip': '{d} percent',
  'specW.v.noDip':
    'none: the two peaks have merged into one (they separate above 0.85 FWHM)',
  'specW.row.pixels': 'Peaks in the pixels (no noise)',
  'specW.v.pixelsTwo': 'two',
  'specW.v.pixelsOne': 'one',
  'specW.row.fit': 'Fitted as one line',
  'specW.v.fitBroad':
    'FWHM {w} nm against the instrument’s {i} nm: broadened by {x} percent, flagged (a blend, or a line with its own width)',
  'specW.v.fitOk':
    'FWHM {w} nm against the instrument’s {i} nm: consistent with one unresolved line',
  'specW.v.fitNone': 'no fit: {r}',
  'specW.row.assumes': 'What it leaves out',
  'specW.a':
    'one wavelength, 500 nm; a Gaussian line-spread function of the same width everywhere; no flat field, no sky, no cosmic rays; the lines are intrinsically unresolved. Finer pixels sample the line better and cannot separate lines the line-spread function has merged.',
  'specW.axis.x': 'Wavelength from 500 nm (nm)',
  'specW.axis.y': 'Electrons per pixel',
  'specW.legend.model': 'the pair through the instrument (model)',
  'specW.legend.pixels': 'the pixels',
  'specW.legend.truth': 'the two true line positions',
  // ---- the arc
  'specW.arc.title': 'Calibrating a spectrograph with an arc lamp',
  'specW.arc.note':
    'A synthetic arc lamp (lines from the NIST list, invented intensities) and a synthetic star, through one spectrograph. The panel marks the lines you choose, fits the wavelength solution through them, shows the residuals, and measures a Balmer line of the star with its uncertainty.',
  'specW.control.marked': 'Lines marked',
  'specW.control.degree': 'Degree of the solution',
  'specW.control.seed': 'Which arc (noise draw)',
  'specW.control.line': 'Line of the star',
  'specW.control.medium': 'Medium of the rest wavelength',
  'specW.medium.0': 'air',
  'specW.medium.1': 'vacuum',
  'specW.row.arc': 'Lamp and instrument',
  'specW.v.arc':
    '14 isolated lines of the lamp in air, 2048 pixels, line-spread FWHM 0.30 nm (R = 1500 at 450 nm), a synthetic cubic solution the panel keeps hidden',
  'specW.row.solution': 'The solution',
  'specW.v.solution': 'degree {d} through {n} lines: {s}',
  'specW.state.constrained': 'constrained ({k} degrees of freedom)',
  'specW.state.exactly-determined':
    'exactly determined: it passes through every line, its uncertainty comes from the line errors alone and there is no residual to test it with',
  'specW.state.not-constrained': 'not constrained: {m}',
  'specW.state.refused': 'refused: {m}',
  'specW.row.residual': 'Residuals',
  'specW.v.residual': 'rms {r} nm; reduced chi-square {c}',
  'specW.v.residualFlag':
    'rms {r} nm; reduced chi-square {c}: the scatter exceeds the errors, so the uncertainties are scaled up',
  'specW.v.noResidual': 'none: there is no residual to read',
  'specW.row.sigma': 'Uncertainty of the solution at mid-detector',
  'specW.v.sigma': '{s} nm ({p} pixel)',
  'specW.row.star': 'The star’s line',
  'specW.v.star': '{n}: observed at {w} ± {s} nm (in air)',
  'specW.v.starNone':
    'no measurement: the solution has no coefficients or the line fit failed',
  'specW.row.velocity': 'Radial velocity',
  'specW.v.velocity': '{v} ± {s} km/s (rest wavelength {r} nm in {m})',
  'specW.v.velocityRefused':
    'refused: the spectrum is calibrated in air and the rest wavelength is in vacuum; a mix-up of the two would be worth {o} km/s here',
  'specW.row.ignored': 'If the media were ignored (wrong)',
  'specW.v.ignored':
    '{v} km/s: the rest wavelength in {m} against an observed wavelength in air',
  'specW.arcA':
    'a hidden cubic wavelength solution; unresolved arc lines; the lamp’s relative intensities are invented; blends (a line with a neighbour closer than 6 FWHM) are left out of the marking; no flat field, no sky; the star is a 6000 K blackbody with Gaussian Balmer lines at a velocity the panel does not tell you. Everything is synthetic.',
  'specW.axis.pixel': 'Pixel',
  'specW.axis.counts': 'Electrons per pixel',
  'specW.axis.resid': 'Residual (nm)',
  'specW.legend.arc': 'the arc (noisy)',
  'specW.legend.mark': 'lines marked',
  'specW.legend.resid': 'line minus solution, ±1 sigma',
  'specW.legend.band': 'the solution’s 1 sigma',
  // ---- the trade
  'specW.trade.title': 'Resolution, light and signal to noise',
  'specW.trade.note':
    'One star through a slit spectrograph on a telescope from the instrument library. A narrower slit gives a higher resolving power and passes less of the star’s light; the curve is the signal to noise of one absorption line against resolving power.',
  'specW.control.R2': 'Resolving power R',
  'specW.control.Rs': 'R at which the slit equals the seeing',
  'specW.control.seeing': 'Seeing (FWHM)',
  'specW.control.width': 'Line’s own width (sigma)',
  'specW.control.vmag': 'Star (V magnitude)',
  'specW.control.facility': 'Telescope',
  'specW.control.exposure': 'Exposure',
  'specW.facility.0': '0.35 m (Las Cumbres)',
  'specW.facility.1': '1.0 m (Las Cumbres)',
  'specW.facility.2': '8.4 m (Rubin reference design)',
  'specW.row.slit': 'Slit width that gives this R',
  'specW.v.slit':
    '{w} arcsec, {r} of the seeing; {t} percent of the star’s light gets through',
  'specW.row.line': 'The line, as the instrument shows it',
  'specW.v.line': 'FWHM {f} nm of the instrument and {o} nm observed; {k}',
  'specW.line.resolved': 'the line is resolved (wider than the instrument)',
  'specW.line.unresolved':
    'the line is unresolved (the instrument sets its width)',
  'specW.row.snr': 'Signal to noise of the line (equivalent width 0.020 nm)',
  'specW.v.snr':
    '{s}; the faintest line detectable at 3 sigma has an equivalent width of {e} nm',
  'specW.row.best': 'The resolving power that maximises it',
  'specW.v.best': 'R = {r}, signal to noise {s}',
  'specW.v.bestBound':
    'no maximum inside the range: an unresolved line only gains with resolving power and the gain stops once the slit is narrower than the seeing disk (R above {r})',
  'specW.row.light': 'Light reaching the detector',
  'specW.v.light':
    '{a} m² of collecting area, {f}; {p} electrons per nm over {t} s before the slit',
  'specW.tradeA':
    'a long slit and Gaussian seeing, no guiding error; the resolving power inversely proportional to the slit width; the pixel size following the line-spread width at 2.5 pixels per FWHM; no sky, 5 electrons of read noise; a throughput of 0.3 for everything but the slit; a V = 0 flux of 1.0 x 10^8 photons per second per square metre per nm (a teaching value of the order of Vega’s). Every number is synthetic.',
  'specW.axis.R': 'Resolving power R',
  'specW.axis.snr': 'Signal to noise of the line',
  'specW.legend.now': 'this setting',
  'specW.legend.best': 'the maximum',
};
