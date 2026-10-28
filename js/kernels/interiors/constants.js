// Interiors kernel (Prompt 203): constants and the refusal shape. Pure functions, no DOM, no imports.

/** Newtonian constant of gravitation, m^3 kg^-1 s^-2 (CODATA 2018) and its standard uncertainty. */
export const G = 6.6743e-11;
export const G_SIGMA = 1.5e-15;

/** A refusal: a named code, a reason and no number. */
export const refuse = (model, code, reason) => ({
  refused: true,
  model,
  code,
  reason,
});
export const isNum = x => typeof x === 'number' && Number.isFinite(x);
export const isPos = x => isNum(x) && x > 0;
export const isSigma = x => x === undefined || (isNum(x) && x >= 0);
