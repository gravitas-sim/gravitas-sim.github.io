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
 * Convert RGB object to hex string
 * @param {Object} rgb - RGB object with r, g, b properties
 * @returns {string} Hex color string
 */
export const rgbToHex = rgb => {
  const componentToHex = c => {
    const hex = Math.round(Math.max(0, Math.min(255, c))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return (
    '#' + componentToHex(rgb.r) + componentToHex(rgb.g) + componentToHex(rgb.b)
  );
};

/**
 * Convert RGB to HSL
 * @param {Object} rgb - RGB object with r, g, b properties (0-255)
 * @returns {Object} HSL object with h, s, l properties
 */
export const rgbToHsl = rgb => {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
};

/**
 * Convert HSL to RGB
 * @param {Object} hsl - HSL object with h, s, l properties
 * @returns {Object} RGB object with r, g, b properties
 */
export const hslToRgb = hsl => {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;

  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
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
 * Get star color based on mass (stellar classification - alternative method)
 * @param {number} massInSuns - Mass in solar masses
 * @returns {string} Hex color string
 */
export const getStarColorClassification = massInSuns => {
  if (massInSuns < 0.08) return '#8B0000'; // Brown dwarf
  if (massInSuns < 0.45) return '#FF6600'; // M-class (red dwarf)
  if (massInSuns < 0.8) return '#FF9900'; // K-class (orange dwarf)
  if (massInSuns < 1.04) return '#FFFF00'; // G-class (yellow dwarf, like Sun)
  if (massInSuns < 1.4) return '#FFFF99'; // F-class (yellow-white)
  if (massInSuns < 2.1) return '#FFFFFF'; // A-class (white)
  if (massInSuns < 16) return '#AAAAFF'; // B-class (blue-white)
  return '#6666FF'; // O-class (blue giant)
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
 * Map a value from one range to another
 * @param {number} value - Value to map
 * @param {number} inMin - Input range minimum
 * @param {number} inMax - Input range maximum
 * @param {number} outMin - Output range minimum
 * @param {number} outMax - Output range maximum
 * @returns {number} Mapped value
 */
export const mapRange = (value, inMin, inMax, outMin, outMax) => {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
};

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
 * Calculate squared distance between two points (faster than distance)
 * @param {Object} p1 - First point with x, y properties
 * @param {Object} p2 - Second point with x, y properties
 * @returns {number} Squared distance
 */
export const distanceSquared = (p1, p2) => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return dx * dx + dy * dy;
};

/**
 * Calculate angle between two points
 * @param {Object} p1 - First point with x, y properties
 * @param {Object} p2 - Second point with x, y properties
 * @returns {number} Angle in radians
 */
export const angleBetween = (p1, p2) => {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
};

/**
 * Normalize an angle to 0-2π range
 * @param {number} angle - Angle in radians
 * @returns {number} Normalized angle
 */
export const normalizeAngle = angle => {
  while (angle < 0) angle += 2 * Math.PI;
  while (angle >= 2 * Math.PI) angle -= 2 * Math.PI;
  return angle;
};

/**
 * Convert degrees to radians
 * @param {number} degrees - Angle in degrees
 * @returns {number} Angle in radians
 */
export const degreesToRadians = degrees => (degrees * Math.PI) / 180;

/**
 * Convert radians to degrees
 * @param {number} radians - Angle in radians
 * @returns {number} Angle in degrees
 */
export const radiansToDegrees = radians => (radians * 180) / Math.PI;

/**
 * Calculate vector magnitude
 * @param {Object} vector - Vector with x, y properties
 * @returns {number} Magnitude
 */
export const vectorMagnitude = vector =>
  Math.sqrt(vector.x * vector.x + vector.y * vector.y);

/**
 * Normalize a vector
 * @param {Object} vector - Vector with x, y properties
 * @returns {Object} Normalized vector
 */
export const normalizeVector = vector => {
  const mag = vectorMagnitude(vector);
  return mag > 0 ? { x: vector.x / mag, y: vector.y / mag } : { x: 0, y: 0 };
};

/**
 * Dot product of two vectors
 * @param {Object} v1 - First vector with x, y properties
 * @param {Object} v2 - Second vector with x, y properties
 * @returns {number} Dot product
 */
export const dotProduct = (v1, v2) => v1.x * v2.x + v1.y * v2.y;

/**
 * Cross product of two 2D vectors (returns scalar)
 * @param {Object} v1 - First vector with x, y properties
 * @param {Object} v2 - Second vector with x, y properties
 * @returns {number} Cross product
 */
export const crossProduct = (v1, v2) => v1.x * v2.y - v1.y * v2.x;

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
 * Generate random integer between min and max (inclusive)
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random integer
 */
export const randomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Generate random boolean
 * @param {number} probability - Probability of true (0-1)
 * @returns {boolean} Random boolean
 */
export const randomBool = (probability = 0.5) => Math.random() < probability;

/**
 * Choose random element from array
 * @param {Array} array - Array to choose from
 * @returns {*} Random element
 */
export const randomChoice = array =>
  array[Math.floor(Math.random() * array.length)];

/**
 * Generate random point in circle
 * @param {number} radius - Circle radius
 * @param {Object} center - Center point with x, y properties
 * @returns {Object} Random point with x, y properties
 */
export const randomPointInCircle = (radius, center = { x: 0, y: 0 }) => {
  const angle = Math.random() * 2 * Math.PI;
  const r = Math.sqrt(Math.random()) * radius;
  return {
    x: center.x + r * Math.cos(angle),
    y: center.y + r * Math.sin(angle),
  };
};

/**
 * Generate random point on circle
 * @param {number} radius - Circle radius
 * @param {Object} center - Center point with x, y properties
 * @returns {Object} Random point with x, y properties
 */
export const randomPointOnCircle = (radius, center = { x: 0, y: 0 }) => {
  const angle = Math.random() * 2 * Math.PI;
  return {
    x: center.x + radius * Math.cos(angle),
    y: center.y + radius * Math.sin(angle),
  };
};

/**
 * Generate random angle in radians
 * @returns {number} Random angle (0 to 2π)
 */
export const randomAngle = () => Math.random() * 2 * Math.PI;

/**
 * Generate random velocity vector
 * @param {number} minSpeed - Minimum speed
 * @param {number} maxSpeed - Maximum speed
 * @returns {Object} Random velocity with x, y properties
 */
export const randomVelocity = (minSpeed, maxSpeed) => {
  const angle = randomAngle();
  const speed = randomRange(minSpeed, maxSpeed);
  return {
    x: speed * Math.cos(angle),
    y: speed * Math.sin(angle),
  };
};

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

/**
 * Generate random mass using log-normal distribution
 * @param {number} logMean - Mean of log values
 * @param {number} logStdDev - Standard deviation of log values
 * @param {number} minMass - Minimum mass
 * @param {number} maxMass - Maximum mass
 * @returns {number} Random mass
 */
export const randomLogNormalMass = (logMean, logStdDev, minMass, maxMass) => {
  const logMass = randomGaussian(logMean, logStdDev);
  const mass = Math.pow(10, logMass);
  return clamp(mass, minMass, maxMass);
};

/**
 * Generate random stellar mass using skewed distribution (original method)
 * Favors smaller, more common stars. Range ~0.2 to 3.2 Msun.
 * @returns {number} Random stellar mass in solar masses
 */
export const randomStellarMass = () => {
  return Math.pow(10, Math.random() * 1.5 - 0.7);
};

/**
 * Calculate stellar radius based on mass (mass-radius relation)
 * @param {number} massInSuns - Mass in solar masses
 * @param {number} baseStellarRadius - Base stellar radius constant
 * @returns {number} Stellar radius
 */
export const stellarRadius = (massInSuns, baseStellarRadius = 10) => {
  return baseStellarRadius * Math.pow(massInSuns, 0.75); // R ~ M^0.75
};

/**
 * Calculate black hole radius based on mass
 * @param {number} mass - Black hole mass
 * @param {number} baseMass - Base mass for scaling
 * @param {number} baseRadius - Base radius constant
 * @returns {number} Black hole radius
 */
export const blackHoleRadius = (mass, baseMass, baseRadius = 15) => {
  const mass_scale = Math.max(1.0, mass / baseMass);
  return baseRadius * Math.pow(mass_scale, 0.5);
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
  return {
    x: worldPos.x * state.zoom + state.pan.x + canvas.width / 2,
    y: -worldPos.y * state.zoom + state.pan.y + canvas.height / 2,
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
  return {
    x: (screenPos.x - state.pan.x - canvas.width / 2) / state.zoom,
    y: -(screenPos.y - state.pan.y - canvas.height / 2) / state.zoom,
  };
};

/**
 * Check if a world position is visible on screen
 * @param {Object} worldPos - World position with x, y properties
 * @param {Object} state - State object with zoom, pan properties
 * @param {Object} canvas - Canvas object with width, height properties
 * @param {number} margin - Margin around screen edges
 * @returns {boolean} True if position is visible
 */
export const isOnScreen = (worldPos, state, canvas, margin = 0) => {
  const screenPos = worldToScreen(worldPos, state, canvas);
  return (
    screenPos.x >= -margin &&
    screenPos.x <= canvas.width + margin &&
    screenPos.y >= -margin &&
    screenPos.y <= canvas.height + margin
  );
};

/**
 * Simple world to screen conversion (original method - identity transform)
 * Used when canvas context handles the transformation
 * @param {Object} pos - World position with x, y properties
 * @returns {Object} Screen position (same as input)
 */
export const worldToScreenSimple = pos => ({ x: pos.x, y: pos.y });

/**
 * Simple screen to world conversion (original method)
 * @param {Object} spos - Screen position with x, y properties
 * @param {Object} state - State object with zoom, pan properties
 * @param {Object} canvas - Canvas object with width, height properties
 * @returns {Object} World position with x, y properties
 */
export const screenToWorldSimple = (spos, state, canvas) => ({
  x: (spos.x - canvas.width / 2 - state.pan.x) / state.zoom,
  y: -(spos.y - canvas.height / 2 - state.pan.y) / state.zoom,
});

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

// =============================================================================
// PHYSICS UTILITIES
// =============================================================================

/**
 * Calculate gravitational force between two objects
 * @param {Object} obj1 - First object with mass, pos properties
 * @param {Object} obj2 - Second object with mass, pos properties
 * @param {number} G - Gravitational constant
 * @returns {Object} Force vector with x, y properties
 */
export const gravitationalForce = (obj1, obj2, G) => {
  const dx = obj2.pos.x - obj1.pos.x;
  const dy = obj2.pos.y - obj1.pos.y;
  const distSq = dx * dx + dy * dy;
  const dist = Math.sqrt(distSq);

  if (dist === 0) return { x: 0, y: 0 };

  const force = (G * obj1.mass * obj2.mass) / distSq;
  const forceX = (force * dx) / dist;
  const forceY = (force * dy) / dist;

  return { x: forceX, y: forceY };
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
export const kineticEnergy = (body) => {
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
  return -CONSTANTS.GRAVITATIONAL_CONSTANT * body1.mass * body2.mass / distance;
};

/**
 * Calculate total system energy (kinetic + potential)
 * @param {Array} bodies - Array of all bodies in the simulation
 * @returns {number} Total system energy
 */
export const totalSystemEnergy = (bodies) => {
  let totalEnergy = 0;
  
  // Add kinetic energy of all bodies
  for (let i = 0; i < bodies.length; i++) {
    totalEnergy += kineticEnergy(bodies[i]);
  }
  
  // Add potential energy between all pairs (each pair counted once)
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      totalEnergy += potentialEnergyPair(bodies[i], bodies[j]);
    }
  }
  
  return totalEnergy;
};

/**
 * Calculate the total energy for a single body relative to all other bodies.
 * This returns an object with ke, pe and total properties.
 * Potential energy is assigned half of each pair's potential to avoid double-counting.
 * @param {Object} body - The body whose energy to compute
 * @param {Array} bodies - All bodies in the simulation
 * @returns {{ke: number, pe: number, total: number}}
 */
export const totalEnergyForBody = (body, bodies) => {
  // Kinetic energy of the selected body
  const ke = kineticEnergy(body);
  let pe = 0;
  // Sum the potential energy contributions from all other bodies
  for (let i = 0; i < bodies.length; i++) {
    const other = bodies[i];
    if (other === body) continue;
    // Divide by 2 so that summing energies of all bodies yields the system's potential energy
    pe += potentialEnergyPair(body, other) / 2;
  }
  return { ke, pe, total: ke + pe };
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
