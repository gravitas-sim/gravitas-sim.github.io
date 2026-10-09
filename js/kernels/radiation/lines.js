// =============================================================================
// Radiation kernel: the spectral-line list
// -----------------------------------------------------------------------------
// The data (rest wavelengths, species, sources) is the line-list pack; this is
// the lookup. Wavelengths in nm. Each line carries `air` and `vacuum`; which one
// a spectrum uses is the spectrum's `medium`, and the caller says so.
// =============================================================================

/**
 * Lines that could explain an observed wavelength.
 * @param {number} obsNm - Observed wavelength
 * @param {object[]} lines - The pack's lines
 * @param {{z?: number, medium?: 'air'|'vacuum', toleranceNm?: number, kinds?: string[]}} [o]
 * @returns {Array<{line: object, restNm: number, offsetNm: number}>} Nearest first
 */
export function identifyLines(
  obsNm,
  lines,
  { z = 0, medium = 'air', toleranceNm = 0.5, kinds } = {}
) {
  const out = [];
  for (const line of lines) {
    if (kinds && !kinds.includes(line.kind)) continue;
    const restNm = line[medium];
    if (!Number.isFinite(restNm)) continue;
    const offsetNm = obsNm - restNm * (1 + z);
    if (Math.abs(offsetNm) <= toleranceNm) out.push({ line, restNm, offsetNm });
  }
  return out.sort((p, q) => Math.abs(p.offsetNm) - Math.abs(q.offsetNm));
}

/** One line by id, or undefined. */
export const lineById = (lines, id) => lines.find(l => l.id === id);
