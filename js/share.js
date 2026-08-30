// =============================================================================
// The share dialog, and opening a link someone sent you
// -----------------------------------------------------------------------------
// This is the UI layer over shareState.js. It sits above both ui.js and
// timeline.js and imports from each, which is what lets captureShareState()
// stay free of a timeline import: the elapsed clock is read here and passed
// down, rather than ui.js reaching for a module that already imports it.
// =============================================================================

import {
  captureShareState,
  applyShareState,
  initialize_simulation,
  show_enhanced_scenario_info,
} from './ui.js';
import { getSimClock } from './timeline.js';
import {
  encodePayload,
  decodePayload,
  shareUrl,
  COMFORTABLE_URL_LENGTH,
} from './shareState.js';
import { getWorldSeed, formatSeed, parseSeed } from './rng.js';
import { toast, announce } from './controls.js';

let els = {};
let kind = 'auto';
let lastUrl = '';

// True only while a link is being applied. The rebuild a link performs fires
// the same reset event as a user changing scenario, and the two have to be
// told apart: one *is* the link, the other invalidates it.
let applyingLink = false;

// --- Reading a link ----------------------------------------------------------

/**
 * Is there a Gravitas link in the address bar?
 *
 * Checked synchronously at boot so the default scenario is never built just to
 * be thrown away: decoding itself is async, because the payload is deflated.
 *
 * @returns {boolean} True if the fragment looks like a payload
 */
export function hasSharedLink() {
  return /^#\d+[zr]./.test(location.hash || '');
}

/**
 * Build the simulation described by the link in the address bar.
 * @returns {Promise<boolean>} True if a link was found and applied
 */
export async function applySharedLinkFromUrl() {
  if (!hasSharedLink()) return false;
  try {
    const payload = await decodePayload(location.hash);
    applyingLink = true;
    let result;
    try {
      result = applyShareState(payload);
    } finally {
      applyingLink = false;
    }

    // The scenario card explains what the student is looking at, and someone
    // arriving from a link has had none of the context of choosing it.
    try {
      show_enhanced_scenario_info(result.scenario);
    } catch {
      /* the card is optional; the simulation is not */
    }

    announce(
      `Opened a shared simulation: ${result.scenario}, ${result.bodies} objects.`
    );
    return true;
  } catch (err) {
    console.warn('Could not open shared link:', err);
    toast(err.message || 'That link could not be opened.');
    return false;
  }
}

/**
 * Drop the fragment once the world stops being the one the link describes.
 *
 * Without this, changing scenario would leave an address bar still advertising
 * the old simulation, so a student who reloaded, or copied the URL from the
 * bar rather than the dialog, would silently get the wrong system.
 */
function watchForDivergence() {
  window.addEventListener('gravitasSimulationReset', () => {
    // The rebuild a link performs is the link arriving, not the world moving
    // away from it. Stripping the fragment here would leave a student who
    // opened an assignment unable to reload, bookmark or re-copy it.
    if (applyingLink) return;
    if (location.hash) {
      history.replaceState(null, '', location.pathname + location.search);
    }
  });
}

// --- The dialog --------------------------------------------------------------

/** Recompute the link and repaint everything that depends on it. */
async function refresh() {
  if (!els.modal) return;

  const payload = captureShareState({
    kind,
    includeCamera: els.camera.checked,
    elapsed: getSimClock(),
  });

  const fragment = await encodePayload(payload);
  lastUrl = shareUrl(fragment);
  els.url.value = lastUrl;
  // Show the front of the link. Setting .value leaves the caret at the end, so
  // the field opens on a meaningless tail of base64 rather than the domain: // which makes a correct link look like a corrupted one.
  els.url.scrollLeft = 0;
  els.url.setSelectionRange(0, 0);

  const isFull = Boolean(payload.b);
  els.seeded.setAttribute('aria-checked', String(!isFull));
  els.full.setAttribute('aria-checked', String(isFull));
  els.seeded.classList.toggle('is-active', !isFull);
  els.full.classList.toggle('is-active', isFull);

  // The seed only determines the world for a seeded link; in a full link the
  // bodies are written out and the seed is along for the ride.
  els.seedRow.hidden = isFull;
  els.seed.value = formatSeed(getWorldSeed());

  // A seeded link rebuilds the starting system, so once the simulation has
  // been running for a while it will not show what the author is looking at.
  // That is a reasonable thing to share, but not a reasonable thing to
  // discover afterwards.
  els.stale.hidden = isFull || getSimClock() < 5;

  const n = lastUrl.length;
  const bodies = payload.b ? `${payload.b.length} objects · ` : '';
  els.meta.textContent = `${bodies}${n.toLocaleString()} characters`;
  const tooLong = n > COMFORTABLE_URL_LENGTH;
  els.meta.classList.toggle('is-warning', tooLong);
  els.warning.hidden = !tooLong;
}

function setKind(next) {
  kind = next;
  refresh();
}

async function copyLink() {
  if (!lastUrl) return;
  try {
    await navigator.clipboard.writeText(lastUrl);
    toast('Link copied');
  } catch {
    // Clipboard access is refused outside a secure context and in some
    // embedded browsers. Selecting the text at least leaves one keystroke.
    els.url.focus();
    els.url.select();
    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch {
      copied = false;
    }
    toast(copied ? 'Link copied' : 'Press Ctrl/Cmd + C to copy the link');
  }
}

/**
 * Rebuild the world under a given seed.
 *
 * Rebuilding from a chosen seed is the point of showing it at all: an
 * instructor can say "everyone use seed kepler3" and the whole room ends up
 * looking at one system.
 *
 * @param {string|number} [seed] - Seed to use; omit for a fresh random one
 */
function rebuildWithSeed(seed) {
  initialize_simulation(seed === undefined ? {} : { seed });
  window.dispatchEvent(new CustomEvent('gravitasSimulationReset'));
}

/** Rebuild from whatever seed is typed in the seed field. */
function applyTypedSeed() {
  const typed = els.seed.value.trim();
  if (!typed) return;
  const seed = parseSeed(typed);
  if (seed === getWorldSeed()) return;
  rebuildWithSeed(seed);
}

/** Show the dialog, with the link already computed. */
export function openShareDialog() {
  if (!els.modal) return;
  kind = 'auto';
  els.modal.classList.remove('hidden');
  refresh().then(() => els.url.focus());
}

/** Hide the dialog. */
export function closeShareDialog() {
  if (!els.modal) return;
  els.modal.classList.add('hidden');
  document.getElementById('shareBtn')?.focus();
}

/** @returns {boolean} True while the dialog is showing */
export const isShareDialogOpen = () =>
  Boolean(els.modal) && !els.modal.classList.contains('hidden');

/** Wire up the dialog. Safe to call once, from init. */
export function initShare() {
  els = {
    modal: document.getElementById('shareModal'),
    url: document.getElementById('shareUrl'),
    copy: document.getElementById('shareCopyBtn'),
    seeded: document.getElementById('shareKindSeeded'),
    full: document.getElementById('shareKindFull'),
    camera: document.getElementById('shareCamera'),
    meta: document.getElementById('shareMeta'),
    warning: document.getElementById('shareWarning'),
    stale: document.getElementById('shareStale'),
    seed: document.getElementById('shareSeed'),
    seedRow: document.getElementById('shareSeedRow'),
    reroll: document.getElementById('shareRerollBtn'),
    close: document.getElementById('shareCloseBtn'),
    chip: document.getElementById('shareCloseChip'),
  };
  if (!els.modal || !els.url) return;

  document.getElementById('shareBtn')?.addEventListener('click', () => {
    isShareDialogOpen() ? closeShareDialog() : openShareDialog();
  });
  els.copy?.addEventListener('click', copyLink);
  els.close?.addEventListener('click', closeShareDialog);
  els.chip?.addEventListener('click', closeShareDialog);
  els.seeded?.addEventListener('click', () => setKind('seeded'));
  els.full?.addEventListener('click', () => setKind('full'));
  els.camera?.addEventListener('change', refresh);

  els.seed?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyTypedSeed();
    }
  });
  els.seed?.addEventListener('blur', applyTypedSeed);
  els.reroll?.addEventListener('click', () => rebuildWithSeed());

  // Clicking the backdrop closes, the same as every other panel here.
  els.modal.addEventListener('click', e => {
    if (e.target === els.modal) closeShareDialog();
  });
  window.addEventListener('gravitasEscape', () => {
    if (isShareDialogOpen()) closeShareDialog();
  });

  // A rebuild changes the seed and possibly the body count, so a dialog left
  // open would be showing a link to a simulation that no longer exists.
  window.addEventListener('gravitasSimulationReset', () => {
    if (isShareDialogOpen()) refresh();
  });

  // Pasting a link into the address bar of an already-open tab changes only
  // the fragment, which is a same-document navigation: nothing reloads and,
  // without this, nothing at all appears to happen. That is a realistic way to
  // arrive: a student with the sandbox already open pasting an assignment.
  window.addEventListener('hashchange', () => {
    if (hasSharedLink()) applySharedLinkFromUrl();
  });

  watchForDivergence();
}
