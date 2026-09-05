// Utility functions for Gravitas simulation

// =============================================================================
// COLOR UTILITIES
// =============================================================================

/**
 * Convert hex color to RGB object
 * @param {string} hex - Hex color string (e.g., "#ff0000")
 * @returns {Object} RGB object with r, g, b properties
 */
export const hexToRgb = hex => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

/**
 * Interpolate between two colors
 * @param {Object} color1 - First RGB color
 * @param {Object} color2 - Second RGB color
 * @param {number} factor - Interpolation factor (0-1)
 * @returns {Object} Interpolated RGB color
 */
export const lerpColor = (color1, color2, factor) => {
  const f = Math.max(0, Math.min(1, factor));
  return {
    r: Math.round(color1.r + (color2.r - color1.r) * f),
    g: Math.round(color1.g + (color2.g - color1.g) * f),
    b: Math.round(color1.b + (color2.b - color1.b) * f),
  };
};

/**
 * Get star color based on mass (original smooth interpolation method)
 * @param {number} massInSuns - Mass in solar masses
 * @returns {string} Hex color string
 */
export const getStarColor = massInSuns => {
  const lowMassColor = { r: 255, g: 180, b: 100 }; // Reddish-Orange for ~0.2 Msun
  const sunColor = { r: 255, g: 255, b: 240 }; // Creamy White for 1.0 Msun
  const highMassColor = { r: 170, g: 200, b: 255 }; // Bluish-White for ~3.0+ Msun

  let r, g, b;
  if (massInSuns <= 1.0) {
    const t = (massInSuns - 0.2) / (1.0 - 0.2);
    r = lerp(lowMassColor.r, sunColor.r, t);
    g = lerp(lowMassColor.g, sunColor.g, t);
    b = lerp(lowMassColor.b, sunColor.b, t);
  } else {
    const t = (massInSuns - 1.0) / (3.0 - 1.0);
    r = lerp(sunColor.r, highMassColor.r, t);
    g = lerp(sunColor.g, highMassColor.g, t);
    b = lerp(sunColor.b, highMassColor.b, t);
  }
  return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
};

/**
 * Compute dynamic color based on proximity to black holes
 * @param {string} base_color_hex - Base color in hex format
 * @param {Object} pos - Position object with x, y properties
 * @param {Array} bh_list - Array of black hole objects
 * @param {number} threshold - Distance threshold for color change
 * @param {Object} target_color - Target RGB color to blend towards
 * @param {Object} settings - Settings object (optional, for compatibility)
 * @returns {string} RGB color string
 */
export const computeDynamicColor = (
  base_color_hex,
  pos,
  bh_list,
  threshold = 300.0,
  target_color = { r: 255, g: 0, b: 0 },
  settings = null
) => {
  // Check if dynamic colors are enabled (original behavior)
  if (settings && !settings.dynamic_object_properties) return base_color_hex;
  if (!bh_list || bh_list.length === 0) return base_color_hex;

  let min_dist_sq = Infinity;
  for (const bh of bh_list) {
    const dx = pos.x - bh.pos.x;
    const dy = pos.y - bh.pos.y;
    const dist_sq = dx * dx + dy * dy;
    if (dist_sq < min_dist_sq) min_dist_sq = dist_sq;
  }

  const f = Math.max(
    0.0,
    Math.min(1.0, (threshold - Math.sqrt(min_dist_sq)) / threshold)
  );
  const base_color = hexToRgb(base_color_hex);
  if (!base_color) return base_color_hex;

  const final_color = lerpColor(base_color, target_color, f);
  return `rgb(${final_color.r}, ${final_color.g}, ${final_color.b})`;
};

// =============================================================================
// MATHEMATICAL UTILITIES
// =============================================================================

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/**
 * Linear interpolation between two values
 * @param {number} a - First value
 * @param {number} b - Second value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} Interpolated value
 */
export const lerp = (a, b, t) => a + (b - a) * clamp(t, 0, 1);

/**
 * Calculate distance between two points
 * @param {Object} p1 - First point with x, y properties
 * @param {Object} p2 - Second point with x, y properties
 * @returns {number} Distance
 */
export const distance = (p1, p2) => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Calculate vector magnitude
 * @param {Object} vector - Vector with x, y properties
 * @returns {number} Magnitude
 */
export const vectorMagnitude = vector =>
  Math.sqrt(vector.x * vector.x + vector.y * vector.y);

// =============================================================================
// RANDOM UTILITIES
// =============================================================================

/**
 * Generate random number between min and max
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random number
 */
export const randomRange = (min, max) => Math.random() * (max - min) + min;

/**
 * Generate random angle in radians
 * @returns {number} Random angle (0 to 2π)
 */
export const randomAngle = () => Math.random() * 2 * Math.PI;

/**
 * Generate Gaussian (normal) distributed random number
 * @param {number} mean - Mean value
 * @param {number} stdDev - Standard deviation
 * @returns {number} Gaussian random number
 */
export const randomGaussian = (mean = 0, stdDev = 1) => {
  // Box-Muller transform
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random(); // Converting [0,1) to (0,1)
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return z * stdDev + mean;
};

// =============================================================================
// COORDINATE TRANSFORMATION UTILITIES
// =============================================================================

/**
 * Convert world coordinates to screen coordinates
 * @param {Object} worldPos - World position with x, y properties
 * @param {Object} state - State object with zoom, pan properties
 * @param {Object} canvas - Canvas object with width, height properties
 * @returns {Object} Screen position with x, y properties
 */
export const worldToScreen = (worldPos, state, canvas) => {
  // The reference frame is subtracted here rather than folded into the pan, so
  // a user who has panned somewhere keeps that pan when they change frames.
  const off = state.frameOffset;
  const ox = off ? off.x : 0;
  const oy = off ? off.y : 0;
  return {
    x: (worldPos.x - ox) * state.zoom + state.pan.x + canvas.width / 2,
    y: -(worldPos.y - oy) * state.zoom + state.pan.y + canvas.height / 2,
  };
};

/**
 * Convert screen coordinates to world coordinates
 * @param {Object} screenPos - Screen position with x, y properties
 * @param {Object} state - State object with zoom, pan properties
 * @param {Object} canvas - Canvas object with width, height properties
 * @returns {Object} World position with x, y properties
 */
export const screenToWorld = (screenPos, state, canvas) => {
  const off = state.frameOffset;
  const ox = off ? off.x : 0;
  const oy = off ? off.y : 0;
  return {
    x: (screenPos.x - state.pan.x - canvas.width / 2) / state.zoom + ox,
    y: -(screenPos.y - state.pan.y - canvas.height / 2) / state.zoom + oy,
  };
};

/**
 * Check if position is offscreen (original method)
 * @param {Object} pos - World position with x, y properties
 * @param {Object} state - State object with zoom, pan properties
 * @param {Object} canvas - Canvas object with width, height properties
 * @param {number} buffer_factor - Buffer factor for offscreen detection
 * @returns {boolean} True if position is offscreen
 */
export const isOffscreen = (pos, state, canvas, buffer_factor = 1.5) => {
  const half_width_world = (canvas.width / (2 * state.zoom)) * buffer_factor;
  const half_height_world = (canvas.height / (2 * state.zoom)) * buffer_factor;
  const world_center_x = -state.pan.x / state.zoom;
  const world_center_y = state.pan.y / state.zoom;
  return (
    pos.x < world_center_x - half_width_world ||
    pos.x > world_center_x + half_width_world ||
    pos.y < world_center_y - half_height_world ||
    pos.y > world_center_y + half_height_world
  );
};

/**
 * Calculate orbital velocity for circular orbit
 * @param {number} centralMass - Mass of central object
 * @param {number} distance - Orbital distance
 * @param {number} G - Gravitational constant
 * @returns {number} Orbital velocity
 */
export const orbitalVelocity = (centralMass, distance, G) => {
  return Math.sqrt((G * centralMass) / distance);
};

/**
 * Calculate escape velocity
 * @param {number} mass - Mass of object
 * @param {number} radius - Radius from center
 * @param {number} G - Gravitational constant
 * @returns {number} Escape velocity
 */
export const escapeVelocity = (mass, radius, G) => {
  return Math.sqrt((2 * G * mass) / radius);
};

/**
 * Calculate Schwarzschild radius (event horizon)
 * @param {number} mass - Mass of object
 * @param {number} G - Gravitational constant
 * @param {number} c - Speed of light
 * @returns {number} Schwarzschild radius
 */
export const schwarzschildRadius = (mass, G, c) => {
  return (2 * G * mass) / (c * c);
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Debounce function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Format number with appropriate units
 * @param {number} value - Value to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted string
 */
export const formatNumber = (value, decimals = 2) => {
  const absValue = Math.abs(value);
  if (absValue >= 1e9) return (value / 1e9).toFixed(decimals) + 'B';
  if (absValue >= 1e6) return (value / 1e6).toFixed(decimals) + 'M';
  if (absValue >= 1e3) return (value / 1e3).toFixed(decimals) + 'K';
  return value.toFixed(decimals);
};

/**
 * Deep clone an object
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
export const deepClone = obj => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const cloned = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
  return obj;
};

// =============================================================================
// ENERGY CALCULATIONS
// =============================================================================

/**
 * Calculate kinetic energy of a body
 * @param {Object} body - The body with mass and velocity properties
 * @returns {number} Kinetic energy
 */
export const kineticEnergy = body => {
  const velocity = Math.sqrt(body.vel.x * body.vel.x + body.vel.y * body.vel.y);
  return 0.5 * body.mass * velocity * velocity;
};

/**
 * Calculate gravitational potential energy between two bodies
 * @param {Object} body1 - First body
 * @param {Object} body2 - Second body
 * @returns {number} Gravitational potential energy
 */
export const potentialEnergyPair = (body1, body2) => {
  const dx = body1.pos.x - body2.pos.x;
  const dy = body1.pos.y - body2.pos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance === 0) return 0; // Avoid division by zero
  return (
    (-CONSTANTS.GRAVITATIONAL_CONSTANT * body1.mass * body2.mass) / distance
  );
};

// =============================================================================
// CONSTANTS
// =============================================================================

export const CONSTANTS = {
  // Mathematical constants
  PI: Math.PI,
  TWO_PI: 2 * Math.PI,
  HALF_PI: Math.PI / 2,

  // Physics constants (simplified for simulation)
  GRAVITATIONAL_CONSTANT: 6.6743e-11, // m³/kg/s²
  SPEED_OF_LIGHT: 299792458, // m/s

  // Astronomical constants
  SOLAR_MASS: 1.989e30, // kg
  EARTH_MASS: 5.972e24, // kg
  JUPITER_MASS: 1.898e27, // kg

  // Conversion factors
  AU_TO_METERS: 1.496e11, // m
  PARSEC_TO_METERS: 3.086e16, // m
  LIGHT_YEAR_TO_METERS: 9.461e15, // m

  // Color constants
  COLORS: {
    BLACK: '#000000',
    WHITE: '#FFFFFF',
    RED: '#FF0000',
    GREEN: '#00FF00',
    BLUE: '#0000FF',
    YELLOW: '#FFFF00',
    CYAN: '#00FFFF',
    MAGENTA: '#FF00FF',
    ORANGE: '#FFA500',
    PURPLE: '#800080',
  },
};

/**
 * Whether verbose diagnostic logging is enabled.
 * Off by default; enable from the console with `localStorage.gravitasDebug = 1`
 * (or `window.GRAVITAS_DEBUG = true`) and reload.
 * @returns {boolean} True when debug logging should be emitted
 */
export const isDebugEnabled = () => {
  if (typeof window === 'undefined') return false;
  if (window.GRAVITAS_DEBUG === true) return true;
  try {
    return window.localStorage?.getItem('gravitasDebug') === '1';
  } catch {
    return false; // Storage can throw in private/sandboxed contexts
  }
};

/**
 * console.log that only emits when debug logging is enabled.
 * @param {...any} args - Values to log
 */
export const debugLog = (...args) => {
  if (isDebugEnabled()) console.log(...args);
};

// =============================================================================
// Solar-unit notation
// -----------------------------------------------------------------------------
// Astronomical convention writes the Sun symbol as a subscript: M⊙, R⊙, L⊙.
// The DOM can express that with <sub>; canvas text cannot, so the glyph is
// drawn separately at a reduced size and dropped below the baseline.
// =============================================================================

/** Astronomical body symbols used as unit subscripts. */
export const SUN_SYMBOL = '\u2609'; // ☉
export const EARTH_SYMBOL = '\u2295'; // ⊕
export const JUPITER_SYMBOL = '\u2643'; // ♃

/**
 * Solar-unit label as HTML, with the Sun symbol correctly subscripted.
 * @param {number|string} value - The numeric part, already formatted
 * @param {string} [base] - Quantity letter: 'M' mass, 'R' radius, 'L' luminosity
 * @returns {string} HTML string, e.g. "1.40 M<sub>⊙</sub>"
 */
export const solarHTML = (value, base = 'M', symbol = SUN_SYMBOL) =>
  `${value} ${base}<sub class="solar-sub">${symbol}</sub>`;

/**
 * Earth-unit label as HTML, subscripted the same way.
 * @param {number|string} value - The numeric part, already formatted
 * @param {string} [base] - Quantity letter
 * @returns {string} HTML string, e.g. "5.97 M<sub>⊕</sub>"
 */
export const earthHTML = (value, base = 'M') =>
  solarHTML(value, base, EARTH_SYMBOL);

/**
 * Jupiter-unit label as HTML, subscripted the same way.
 * @param {number|string} value - The numeric part, already formatted
 * @param {string} [base] - Quantity letter
 * @returns {string} HTML string, e.g. "1.00 M<sub>♃</sub>"
 */
export const jupiterHTML = (value, base = 'M') =>
  solarHTML(value, base, JUPITER_SYMBOL);

/**
 * Draw a solar-unit label on a canvas with a true subscript.
 *
 * Canvas has no rich text, so the run is measured and drawn in three parts —
 * number, base letter, then the Sun glyph at 68% size and pushed below the
 * baseline — and centered as a whole so it stays aligned under its object.
 *
 * @param {CanvasRenderingContext2D} ctx - Target context
 * @param {string} value - Formatted numeric part
 * @param {number} x - Center x
 * @param {number} y - Baseline y
 * @param {Object} [opts]
 * @param {string} [opts.base] - Quantity letter
 * @param {string} [opts.suffix] - Text appended after the unit, e.g. ' NS'
 */
export const drawSolarLabel = (ctx, value, x, y, opts = {}) => {
  const { base = 'M', suffix = '', symbol = SUN_SYMBOL } = opts;
  const mainFont = ctx.font;
  const size = parseFloat(mainFont) || 14;
  const subFont = mainFont.replace(
    /^\s*[\d.]+px/,
    `${(size * 0.68).toFixed(1)}px`
  );

  const head = `${value} ${base}`;
  const headW = ctx.measureText(head).width;
  ctx.font = subFont;
  const subW = ctx.measureText(symbol).width;
  ctx.font = mainFont;
  const tailW = suffix ? ctx.measureText(suffix).width : 0;

  const total = headW + subW + tailW;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  let cursor = x - total / 2;

  ctx.fillText(head, cursor, y);
  cursor += headW;

  ctx.font = subFont;
  ctx.fillText(symbol, cursor, y + size * 0.22);
  cursor += subW;

  ctx.font = mainFont;
  if (suffix) ctx.fillText(suffix, cursor, y);

  ctx.textAlign = prevAlign;
};
