// =============================================================================
// Where the compute page's sandboxed frame is served from
// -----------------------------------------------------------------------------
// Carl's decision of 2026-10-11 (D-COMPUTE-ORIGIN-01): a separate origin, the
// GitHub organization gravitas-compute, repository gravitas-compute.github.io.
// This is the one place the page, the Content-Security-Policy tool and the
// frame's build read it from, so no policy can name an origin the page does
// not use. Pure data, no DOM.
// =============================================================================

/** The frame's origin: the only origin the compute page may frame or fetch from. */
export const FRAME_ORIGIN = 'https://gravitas-compute.github.io';

/** The frame's document, which the page frames after checking its bytes. */
export const FRAME_URL = `${FRAME_ORIGIN}/`;

/**
 * The pages whose messages the frame answers: the published site, and a
 * developer's own machine. Anyone else's page framing the published frame is
 * refused its handshake, so the frame is not a free calculator for them.
 */
export const PARENT_ORIGINS = Object.freeze(['https://gravitas-sim.online']);

/** A parent origin on a developer's machine: loopback, any port, plain http. */
export const LOOPBACK_PARENT =
  /^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/;

/**
 * Whether the frame answers a page of this origin.
 * @param {string} origin - MessageEvent.origin
 * @returns {boolean}
 */
export const parentAllowed = origin =>
  PARENT_ORIGINS.includes(origin) || LOOPBACK_PARENT.test(origin);
