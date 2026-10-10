// =============================================================================
// The Sky Lab's number formatting
// -----------------------------------------------------------------------------
// Displayed numbers go through Intl, in the page's language (a decimal comma in
// Spanish), with the true minus sign. js/format.js is the shared formatter, but
// it is 12.8 KB of source and the Sky Lab's route budget cannot pay for the one
// function it needs (SKY_LAB.md); this is that function and nothing else.
// =============================================================================

const cache = new Map();

/**
 * A number to a fixed count of decimals, ungrouped, in the page's language.
 * @param {number} x
 * @param {number} d - Decimals
 * @returns {string} '—' when not finite
 */
export function fmt(x, d = 2) {
  if (!Number.isFinite(x)) return '—';
  const lang = document.documentElement.lang.startsWith('es') ? 'es' : 'en';
  const key = `${lang}${d}`;
  let nf = cache.get(key);
  if (!nf) {
    nf = new Intl.NumberFormat(lang, {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
      useGrouping: false,
    });
    cache.set(key, nf);
  }
  return nf.format(x).replace('-', '−');
}

/** A number rounded for a drawing's coordinates or a data file: a number, not text. */
export const round = (x, d = 2) => {
  const k = 10 ** d;
  return Math.round(x * k) / k;
};
