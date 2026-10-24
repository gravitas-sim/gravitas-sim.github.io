// =============================================================================
// The frames-to-a-light-curve tool's words, in English
// -----------------------------------------------------------------------------
// Registered by js/observatory/imageSequence.js when the tool first opens
// (through the Observatory's translator), so no other page carries them.
// obs.sq.* ids; the panel's title is in en.observatory.js (it is on the page
// before the tool loads).
// =============================================================================

export const EN_IMAGESEQUENCE = {
  'obs.sq.help':
    'Turn a stack of frames into a light curve, one step at a time. A made-up sequence of the calibration lab’s frames (a variable star, five comparison stars, cloud that dims every star at once, and a telescope that wanders a little between frames) is calibrated, its stars are marked once, each frame is lined up with the first, the stars are measured in every frame, comparison stars are chosen by how bright and how steady they are, and the variable is compared with them. Every step shows only its own numbers.',
  'obs.sq.limits':
    'A sequence has at most 256 frames, read one at a time, and each frame at most 1,398,101 pixels; the three calibration frames and two working copies are held beside it. The frames here are synthetic, not observed.',
  'obs.sq.seed': 'Seed',
  'obs.sq.frames': 'Frames (5 to 256)',
  'obs.sq.amplitude': 'Variable’s semi-amplitude (magnitudes)',
  'obs.sq.period': 'Variable’s period (days)',
  'obs.sq.jitter': 'Pointing wander (pixels)',
  'obs.sq.lose': 'Lose the pointing in frames 11 and 12',
  'obs.sq.vary': 'Make comparison star C2 vary too',
  'obs.sq.run': 'Run the pipeline',
  'obs.sq.stop': 'Stop',
  'obs.sq.recompute': 'Use the ticked stars and run again',
  'obs.sq.exclude': 'Leave out the named frames and run again',
  'obs.sq.csv': 'Save the light curve as CSV',
  'obs.sq.keep': 'Keep in the ledger',
  'obs.sq.open': 'Open the light curve in the Observatory',
  'obs.sq.steps': 'Steps of the pipeline',
  'obs.sq.prev': 'Previous step',
  'obs.sq.next': 'Next step',
  'obs.sq.step.calibrate': 'Calibrate',
  'obs.sq.step.marks': 'Marks',
  'obs.sq.step.register': 'Register',
  'obs.sq.step.photometry': 'Photometry',
  'obs.sq.step.comparison': 'Comparison stars',
  'obs.sq.step.lightcurve': 'Light curve',
  'obs.sq.stepOf': 'Step {k} of {n}: {name}',
  'obs.sq.notReached':
    'The pipeline stopped before this step, for the reason above.',
  'obs.sq.what.calibrate':
    'Each frame has the bias taken off, the dark (scaled to its exposure) taken off and is divided by the flat, with masters made once from the calibration frames; counts become electrons, and a pixel that stands far above its neighbours alone (a cosmic ray) is replaced. This is the calibration lab’s own reduction, not a new one.',
  'obs.sq.what.marks':
    'Stars are found once, in the first frame, with the source finder; the width of a star is measured from the brightest, and the aperture and the sky ring follow from it. The variable star is the one you are measuring; the others are marks the later steps carry from frame to frame.',
  'obs.sq.what.register':
    'Each other frame has its own bright sources found, the shift most pairs of stars agree on is voted for, and a shift and a small turn are fitted to the stars that match. A frame that cannot be matched is named, and no light curve is made from a sequence with such a frame in it unless you leave the frame out.',
  'obs.sq.what.photometry':
    'Every mark is measured in every frame at its lined-up place: the light inside a circle with exact pixel edges, the sky from a ring around it, and the error from the CCD equation with the dark’s and the calibration frames’ own noise added.',
  'obs.sq.what.comparison':
    'A comparison star should not vary. Each candidate is compared with all the others added together; a star whose scatter is far greater than its errors allow (a chance below one in a thousand) is flagged and left out, and the test is run again without it. The brightest steady stars are used, up to five; tick the stars you want instead and run again to override.',
  'obs.sq.what.lightcurve':
    'The variable’s light is divided by the comparison stars’ light, so the cloud that dims every star at once divides out, and the difference in magnitudes is formed with its error. A sinusoid is fitted for the period and the semi-amplitude; their errors are the fit’s, widened if the sinusoid leaves more scatter than the errors say.',
  'obs.sq.quantities': 'What this step measured',
  'obs.sq.col.quantity': 'Quantity',
  'obs.sq.col.value': 'Value',
  'obs.sq.col.error': 'Error',
  'obs.sq.col.kind': 'Kind',
  'obs.sq.col.frame': 'Frame',
  'obs.sq.col.time': 'Time (days)',
  'obs.sq.col.dm': 'Differential magnitude',
  'obs.sq.col.sigma': 'Error',
  'obs.sq.col.dx': 'Shift in x',
  'obs.sq.col.dy': 'Shift in y',
  'obs.sq.col.turn': 'Turn (degrees)',
  'obs.sq.col.matched': 'Stars matched',
  'obs.sq.col.rms': 'Residual rms',
  'obs.sq.col.status': 'Status',
  'obs.sq.col.use': 'Use',
  'obs.sq.col.star': 'Star',
  'obs.sq.col.x': 'x',
  'obs.sq.col.y': 'y',
  'obs.sq.col.flux': 'Light (electrons)',
  'obs.sq.col.snr': 'Signal to noise',
  'obs.sq.col.chi2red': 'Steadiness (reduced chi-square)',
  'obs.sq.kind.measured': 'measured',
  'obs.sq.kind.derived': 'derived',
  'obs.sq.kind.assumed': 'assumed',
  'obs.sq.q.frames': 'frames used',
  'obs.sq.q.masterBias': 'bias frames in the master',
  'obs.sq.q.masterDark': 'dark frames in the master',
  'obs.sq.q.masterFlat': 'flat frames in the master',
  'obs.sq.q.extraVariance':
    'noise the masters add, per pixel (electrons squared)',
  'obs.sq.q.cosmicPixels': 'pixels replaced as cosmic rays, all frames',
  'obs.sq.q.cosmicMax': 'most pixels replaced in one frame',
  'obs.sq.q.marks': 'stars marked',
  'obs.sq.q.fwhm': 'width of a star, FWHM',
  'obs.sq.q.r': 'aperture radius',
  'obs.sq.q.rIn': 'sky ring, inner radius',
  'obs.sq.q.rOut': 'sky ring, outer radius',
  'obs.sq.q.reference': 'reference frame (counted from 0)',
  'obs.sq.q.registered': 'frames lined up',
  'obs.sq.q.refused': 'frames that could not be lined up',
  'obs.sq.q.shiftRms': 'wander of the pointing, rms',
  'obs.sq.q.shiftMax': 'largest shift',
  'obs.sq.q.residualRms': 'residual of the matched stars, rms',
  'obs.sq.q.stars': 'stars measured',
  'obs.sq.q.complete': 'stars measured in every frame',
  'obs.sq.q.targetSnr': 'variable’s signal to noise (median)',
  'obs.sq.q.refusedTarget': 'frames where the variable could not be measured',
  'obs.sq.q.chosen': 'comparison stars used',
  'obs.sq.q.flagged': 'comparison stars flagged unsteady',
  'obs.sq.q.starStability': '{id}: steadiness (reduced chi-square)',
  'obs.sq.q.period': 'period',
  'obs.sq.q.amplitude': 'semi-amplitude',
  'obs.sq.q.meanMagnitude': 'mean differential magnitude',
  'obs.sq.q.chi2red': 'reduced chi-square of the sinusoid',
  'obs.sq.q.constantP': 'chance a steady star scatters this much',
  'obs.sq.q.points': 'points in the light curve',
  'obs.sq.q.lc.t': 'frame {frame}: time',
  'obs.sq.q.lc.m': 'frame {frame}: differential magnitude',
  'obs.sq.w.fewBias': 'Only {n} bias frames made the master; it will be noisy.',
  'obs.sq.w.alreadyCalibrated':
    'These frames were already calibrated; nothing was subtracted.',
  'obs.sq.w.psfFallback':
    'The width of a star could not be measured ({reason}); a width of 3 pixels was assumed.',
  'obs.sq.w.registrationRefused':
    'Frame {frame} could not be lined up ({reason}): {matched} stars matched.',
  'obs.sq.w.registrationOff':
    'Lining up was switched off: every frame is taken as pointed alike.',
  'obs.sq.w.incompleteStar':
    'Star {star} could not be measured in {frames} frames, so it is not a comparison candidate.',
  'obs.sq.w.targetRefused':
    'The variable could not be measured in frame {frame} ({reason}).',
  'obs.sq.w.unstableUsed':
    'Star {star} was flagged unsteady and is used anyway, because you chose it.',
  'obs.sq.w.stabilityNotRun':
    'Only {candidates} candidates: too few to test whether any varies.',
  'obs.sq.w.singleComparison':
    'One comparison star: its own noise goes into every point.',
  'obs.sq.w.untestedAfterRemoval':
    'Star {star} could no longer be tested after an unsteady star was removed.',
  'obs.sq.w.scaledUncertainty':
    'The sinusoid leaves more scatter than the errors say (reduced chi-square {chi2red}), so its errors were widened.',
  'obs.sq.w.notVariable':
    'The curve is consistent with a steady star (chance {p}); a period here is not evidence of variation.',
  'obs.sq.w.noAmplitude':
    'The fitted amplitude is zero, so the period has no stated error.',
  'obs.sq.w.weakAmplitude':
    'The amplitude is under three of its errors: the period is not well determined.',
  'obs.sq.perFrame': 'Every frame’s shift',
  'obs.sq.reg.ok': 'lined up',
  'obs.sq.reg.no-match': 'no stars matched',
  'obs.sq.reg.too-few': 'too few stars matched',
  'obs.sq.reg.residual': 'stars do not fit one shift and turn',
  'obs.sq.reg.degenerate': 'stars too close together',
  'obs.sq.reg.malformed': 'unusable positions',
  'obs.sq.chooser': 'Comparison star candidates',
  'obs.sq.useStar': 'Use star {id} as a comparison star',
  'obs.sq.stab.stable': 'steady',
  'obs.sq.stab.unstable': 'unsteady',
  'obs.sq.stab.untested': 'not tested',
  'obs.sq.progress': 'Frame {k} of {n}…',
  'obs.sq.stopped': 'Stopped.',
  'obs.sq.axis.time': 'Time',
  'obs.sq.axis.dm': 'Differential magnitude',
  'obs.sq.axis.sigma': 'Differential magnitude, error',
  'obs.sq.model': 'Fitted sinusoid',
  'obs.sq.plot':
    'The differential magnitude of the variable star in each frame with its error bars, and the fitted sinusoid. Fainter is larger.',
  'obs.sq.table': 'Light curve points',
  'obs.sq.fit':
    'Reduced chi-square of the sinusoid {chi2red}; the chance a steady star scatters this much, {p}.',
  'obs.sq.comparisonUsed': 'Comparison stars used: {stars}.',
  'obs.sq.asymptotic':
    'The error of the period is the asymptotic one for a sinusoid, and is a fair guide only when the amplitude is several times its own error.',
  'obs.sq.said.done':
    'Light curve of {points} frames: period {period} ± {sigmaPeriod} days, semi-amplitude {amplitude} ± {sigmaAmplitude} magnitude.',
  'obs.sq.said.constant':
    '{points} frames; the curve is consistent with a steady star. The best sinusoid has a period of {period} ± {sigmaPeriod} days and a semi-amplitude of {amplitude} ± {sigmaAmplitude} magnitude, which is not evidence of variation.',
  'obs.sq.said.csv': 'Saved a table of {n} rows.',
  'obs.sq.said.opened': 'The light curve is open in the Observatory.',
  'obs.sq.said.kept': 'The light curve was kept in the ledger.',
  'obs.sq.said.keepFailed': 'Could not keep it in the ledger: {why}',
  'obs.sq.obsTitle': 'Light curve from synthetic frames (seed {seed})',
  'obs.sq.ledgerEntry': 'Light curve from frames (seed {seed})',
  'obs.sq.csvCol.frame': 'Frame',
  'obs.sq.csvCol.time': 'Time (d)',
  'obs.sq.csvCol.dm': 'Differential magnitude',
  'obs.sq.csvCol.sigma': 'Error',
  'obs.sq.csvCol.target': 'Variable (e-)',
  'obs.sq.csvCol.ensemble': 'Comparison stars (e-)',
  'obs.sq.no.registration':
    'No light curve was made: frames {frames} could not be lined up with the first. Look at the register step, or leave them out and run again.',
  'obs.sq.no.photometry':
    'No light curve was made: the variable could not be measured in frames {frames} (saturated, masked or at the edge). Leave them out and run again.',
  'obs.sq.no.no-comparison':
    'No light curve was made: no comparison star is left (every candidate is too faint, or flagged as unsteady).',
  'obs.sq.no.target-not-found':
    'The variable star was not found among the marked stars.',
  'obs.sq.no.no-marks': 'No star was found in the reference frame.',
  'obs.sq.no.too-many-frames':
    'A sequence has at most {limit} frames; this one has {count}.',
  'obs.sq.no.too-few-frames':
    'At least {need} frames are needed; {used} are left.',
  'obs.sq.no.too-large':
    'These frames are too large to hold with the three masters and the working copies at once.',
  'obs.sq.no.no-masters':
    'These frames are raw and no calibration frames were given.',
  'obs.sq.no.frame-shape': 'Frame {frames} is not the size of the first.',
  'obs.sq.no.bad-parameter': 'A setting is out of range ({name}).',
  'obs.sq.no.bad-frame': 'The frames have no usable size.',
  'obs.sq.no.no-frames': 'There are no frames.',
  'obs.sq.no.raw-frame': 'A frame is still raw.',
  'obs.sq.no.invalid': 'A frame’s description is not valid.',
  'obs.sq.no.display-only':
    'These frames are display-only and cannot be measured for light.',
  'obs.sq.no.incomplete-contract': 'The frames’ pixel contract is incomplete.',
  'obs.sq.no.no-contract': 'The frames state no pixel contract.',
  'obs.sq.no.not-flux': 'The pixel values are not a measure of light.',
  'obs.sq.no.lossy-history':
    'The pixels went through a step that does not keep the measured light.',
  'obs.sq.no.no-background': 'The sky could not be estimated.',
};
