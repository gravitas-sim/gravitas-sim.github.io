// The constants of the rule MORPH-RULE-1 (tests/fixtures/morphology/thresholds.json, analysisRule). The Petrosian
// eta of 0.2 and the total inside 2 r_P are conventions of the survey-pipeline family, here options this
// contract chose; the kernel holds no value taken from a survey pipeline.
const { Math } = globalThis;

export const FWHM_PER_SIGMA = 2 * Math.sqrt(2 * Math.LN2);
/** mag per natural-log unit: 2.5 / ln(10) */
export const MAG_PER_LN = 2.5 / Math.LN10;

export const RULE = Object.freeze({
  name: 'MORPH-RULE-1',
  petrosianEta: 0.2,
  annulusFactors: Object.freeze([0.8, 1.25]),
  totalRadiusFactor: 2,
  radiusGridRatio: 1.05,
  gridStartFwhm: 0.25,
  subSamples: 3,
  binPixels: 0.05,
  profileAnnuli: 14,
  isophoteAnnuli: 8,
  noiseDraws: 40,
  minDraws: 36,
  minSignalToNoise: 10,
  unresolvedFactor: 1.25,
  minFrame: 64,
  rimMin: 8,
  rimFraction: 0.075,
  minRimPixels: 200,
  clipSigma: 3,
  clipPasses: 5,
  flatSigma: 4,
  startSigma: 3,
  minSourcePixels: 12,
  maxPasses: 15,
  drawPasses: 6,
  tolQ: 0.001,
  tolPaDeg: 0.1,
  tolCentre: 0.01,
});
