// The Spanish shadows of the four cosmology investigations, gathered for
// tests/cosmologyInvestigations.test.js.
import EXPANDING from '../js/data/investigations/es/the-expanding-universe.js';
import CANDLES from '../js/data/investigations/es/standard-candles.js';
import SHAPE from '../js/data/investigations/es/the-shape-of-expansion.js';
import WHERE from '../js/data/investigations/es/where-galaxies-live.js';
import EXPANDING_D from '../js/data/investigations/depth/es/the-expanding-universe.js';
import CANDLES_D from '../js/data/investigations/depth/es/standard-candles.js';
import SHAPE_D from '../js/data/investigations/depth/es/the-shape-of-expansion.js';
import WHERE_D from '../js/data/investigations/depth/es/where-galaxies-live.js';

export default {
  lessons: {
    'the-expanding-universe': EXPANDING,
    'standard-candles': CANDLES,
    'the-shape-of-expansion': SHAPE,
    'where-galaxies-live': WHERE,
  },
  depth: {
    'the-expanding-universe': EXPANDING_D,
    'standard-candles': CANDLES_D,
    'the-shape-of-expansion': SHAPE_D,
    'where-galaxies-live': WHERE_D,
  },
};
