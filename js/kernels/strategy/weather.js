// =============================================================================
// The weather as a seeded loss (Prompt 214, OBSERVING_STRATEGY.md)
// -----------------------------------------------------------------------------
// A two-state Markov chain over nights, clear or lost, with a clear fraction p and a
// persistence rho (the lag-1 autocorrelation): P(clear | clear) = p + rho (1 - p),
// P(clear | cloudy) = p (1 - rho), the first night drawn from the stationary
// distribution. Persistence matters: three cloudy nights in a row cost more phase
// coverage than three scattered ones. It is a LOSS model on the `experiments` stream
// of js/random/streams.js, forked by the seed, never a forecast: the same seed gives
// the same mask on every machine and a fork never moves its parent.
// =============================================================================

import { stream } from '../../random/streams.js';

const { Uint8Array, Number } = globalThis;

/**
 * @param {{nights: number, pClear: number, persistence?: number, seed?: string|number}} o
 * @returns {Uint8Array} 1 where the night is clear
 */
export function weatherMask({
  nights,
  pClear,
  persistence = 0,
  seed = 'weather',
}) {
  if (!(Number.isFinite(pClear) && pClear >= 0 && pClear <= 1))
    throw new RangeError('the clear fraction is between 0 and 1');
  if (!(Number.isFinite(persistence) && persistence >= 0 && persistence < 1))
    throw new RangeError('the persistence is at least 0 and below 1');
  const draw = stream('experiments', seed, 'weather');
  const stay = pClear + persistence * (1 - pClear);
  const mend = pClear * (1 - persistence);
  const out = new Uint8Array(Math.max(0, Math.floor(nights)));
  let clear = draw() < pClear;
  for (let i = 0; i < out.length; i++) {
    if (i > 0) clear = draw() < (clear ? stay : mend);
    out[i] = clear ? 1 : 0;
  }
  return out;
}
