// The kernel's one refusal. A hostile or out-of-domain input never returns a
// number: it throws this, with a code from TIDAL_KERNEL.md's list, so a caller
// can say what was wrong in its own words.
export class TidesError extends Error {
  /**
   * @param {string} code - One of the domain's refusal codes
   * @param {string} message - What was refused, in English, for developers
   * @param {object} [detail] - Numbers a caller may quote (a time, a bound)
   */
  constructor(code, message, detail) {
    super(message);
    this.name = 'TidesError';
    this.code = code;
    this.detail = detail || null;
  }
}

/** A finite number strictly above zero, or a refusal. */
export function positive(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value) || !(value > 0)) {
    throw new TidesError('input', `${name} must be a finite number above zero`);
  }
  return value;
}

/** A finite number, or a refusal. */
export function finite(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TidesError('input', `${name} must be a finite number`);
  }
  return value;
}

/** An object of named numbers, or a refusal. */
export function params(p) {
  if (p === null || typeof p !== 'object' || Array.isArray(p)) {
    throw new TidesError('input', 'the parameters must be an object');
  }
  return p;
}
