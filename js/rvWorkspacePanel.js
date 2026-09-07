// =============================================================================
// The radial velocity workspace panel
// -----------------------------------------------------------------------------
// The interface over js/rvWorkspace.js. Sliders, two canvases and a readout.
//
// Loaded lazily through js/rvWorkspaceBridge.js, so nothing in here is in the
// start-up path. That is why it imports the workspace directly rather than
// receiving it: by the time this module exists, the chunk is already resolved.
//
// The one piece of interface design worth defending: the Reveal button is a
// button and not a toggle, it is placed at the bottom rather than beside the
// parameters, and pressing it is recorded in the export. A student who wants
// the answer can have it. A student who is given it beside their own fit never
// practises the only skill the exercise teaches.
// =============================================================================

import {
  analysis,
  currentRecording,
  draw,
  drawPeriodogram,
  exportReport,
  isRevealed,
  lastSearch,
  revealTruth,
  runSearch,
  setTrial,
  snapToBestAtPeriod,
  trialParameters,
} from './rvWorkspace.js';
import {
  layoutObservationPanels,
  noteObservationPanelUsed,
} from './observationLayout.js';
import { formatNumber } from './format.js';
import { t, onLocaleChange } from './i18n/index.js';
import { ensureDeferredMessages } from './i18n/deferredMessages.js';

let enabled = false;
let els = null;

/** The parameters that get a slider, and how far each one may go. */
const SLIDERS = [
  { key: 'period', min: 0.05, max: 60, step: 0.001, decimals: 3, unit: 'd' },
  { key: 'K', min: 0, max: 400, step: 0.1, decimals: 1, unit: 'm/s' },
  { key: 'phase', min: 0, max: 6.2832, step: 0.01, decimals: 2, unit: 'rad' },
  { key: 'gamma', min: -400, max: 400, step: 0.1, decimals: 1, unit: 'm/s' },
];

/** Cache the DOM once. @returns {object} The elements */
function cacheElements() {
  if (els) return els;
  const id = s => document.getElementById(s);
  els = {
    container: id('rvFitContainer'),
    status: id('rvFitStatus'),
    canvas: id('rvFitCanvas'),
    periodogram: id('rvFitPeriodogram'),
    snap: id('rvFitSnap'),
    search: id('rvFitSearch'),
    minP: id('rvFitMinPeriod'),
    maxP: id('rvFitMaxPeriod'),
    reveal: id('rvFitReveal'),
    truth: id('rvFitTruth'),
    stats: id('rvFitStats'),
    rivals: id('rvFitRivals'),
    structure: id('rvFitStructure'),
    close: id('rvFitClose'),
    sliders: Object.fromEntries(
      SLIDERS.map(s => [s.key, id(`rvFit_${s.key}`)])
    ),
    values: Object.fromEntries(
      SLIDERS.map(s => [s.key, id(`rvFitValue_${s.key}`)])
    ),
  };
  return els;
}

/** Push the current trial parameters onto the sliders. */
function syncSliders() {
  const e = cacheElements();
  const trial = trialParameters();
  for (const s of SLIDERS) {
    const input = e.sliders[s.key];
    if (input) input.value = String(trial[s.key]);
    const label = e.values[s.key];
    if (label) {
      label.textContent = `${formatNumber(trial[s.key], {
        sig: s.decimals + 2,
      })} ${s.unit}`;
    }
  }
}

/** Repaint everything. */
function render() {
  const e = cacheElements();
  if (!e.container || !enabled) return;
  syncSliders();
  draw(e.canvas);
  drawPeriodogram(e.periodogram);

  const a = analysis();
  if (!a) {
    if (e.status) e.status.textContent = t('rvfit.status.none');
    if (e.stats) e.stats.textContent = '';
    return;
  }
  if (a.tooFew) {
    if (e.status) e.status.textContent = t('rvfit.status.tooFew');
    if (e.stats) {
      e.stats.textContent = t('rvfit.tooFew', { n: a.used });
    }
    return;
  }

  if (e.status) {
    const ex = a.excluded;
    // Degraded readings belong in this total now that they are dropped by
    // default: a student who sees "12 fitted, 0 excluded" while three epochs
    // were silently held back has been told the wrong thing.
    let status = t('rvfit.status.points', {
      used: a.used,
      dropped: ex.missed + ex.notFinite + ex.badSigma + ex.degraded,
    });
    if (ex.degraded) {
      status += ` ${t('rvfit.status.degraded', { n: ex.degraded })}`;
    }
    if (ex.unverified) {
      status += ` ${t('rvfit.status.unverified', { n: ex.unverified })}`;
    }
    e.status.textContent = status;
  }

  if (e.stats) {
    const f = a.atTrial;
    // Null when the model could not be scored at all - a non-finite residual,
    // or a period that is not a period. There is no statistic to print and
    // saying so beats throwing on the next property access.
    if (!f) {
      e.stats.textContent = t('rvfit.noStats');
      return;
    }
    // The reduced chi-square is null whenever the weights were invented, and
    // the readout says why rather than printing a number that would be read as
    // a goodness of fit.
    const quality =
      f.reducedChi2 === null
        ? t('rvfit.noChi2', { rms: formatNumber(f.rms, { sig: 3 }) })
        : t('rvfit.chi2', {
            reduced: formatNumber(f.reducedChi2, { sig: 3 }),
            rms: formatNumber(f.rms, { sig: 3 }),
          });
    e.stats.textContent = quality;
  }

  if (e.rivals) {
    const s = lastSearch();
    if (!s) {
      e.rivals.textContent = '';
    } else {
      // Every trough within one of the best, named. This is the panel's whole
      // position on periodograms: the deepest one is not an answer.
      const close = s.minima.filter(m => m.deltaChi2 <= 1).slice(0, 4);
      e.rivals.textContent =
        close.length > 1
          ? t('rvfit.rivalsList', {
              list: close
                .map(m => `${formatNumber(m.period, { sig: 4 })} d`)
                .join(', '),
            })
          : t('rvfit.oneMinimum');
    }
  }

  if (e.structure) {
    const st = a.structure;
    e.structure.textContent = !st
      ? ''
      : st.runsRatio < 0.6
        ? t('rvfit.structured', {
            runs: st.runs,
            expected: formatNumber(st.expectedRuns, { sig: 2 }),
          })
        : t('rvfit.unstructured', {
            runs: st.runs,
            expected: formatNumber(st.expectedRuns, { sig: 2 }),
          });
  }

  if (e.truth) {
    if (!isRevealed()) {
      e.truth.textContent = '';
    } else if (!a.truth) {
      e.truth.textContent = t('rvfit.noTruth');
    } else {
      e.truth.textContent = t('rvfit.truth', {
        period: formatNumber(a.truth.period, { sig: 5 }),
        K: formatNumber(a.truth.K, { sig: 4 }),
        gamma: formatNumber(a.truth.gamma, { sig: 4 }),
      });
    }
  }
  if (e.reveal) e.reveal.disabled = isRevealed();
}

/**
 * Open or close the panel.
 * @param {boolean} on - Whether to show it
 * @returns {void}
 */
export function setRvWorkspaceEnabled(on) {
  const e = cacheElements();
  enabled = Boolean(on);
  if (e.container) e.container.style.display = enabled ? '' : 'none';
  if (enabled) {
    noteObservationPanelUsed('rvFitContainer');
    render();
  }
  layoutObservationPanels();
}

/** @returns {boolean} Whether the panel is open */
export const isRvWorkspaceEnabled = () => enabled;

/** @returns {?object} The exportable report, for the export dialog */
export const currentReport = () => exportReport();

/** Wire the panel up. Called once, when the chunk loads. */
export function initRvWorkspacePanel() {
  // This panel's strings are not in the start-up catalogue, so it registers
  // them itself rather than trusting whoever opened it to have done so. The
  // bridge does register them first in the normal path; a lesson, a share link
  // or a test that drives the panel directly does not, and a panel that renders
  // message ids because of who called it is a panel with a bug.
  ensureDeferredMessages()
    .then(() => render())
    .catch(() => {});

  // The catalogue can arrive after this panel does; see the note on the same
  // subscription in js/binaryRunPanel.js.
  onLocaleChange(() => render());

  const e = cacheElements();
  if (!e.container) return;

  for (const s of SLIDERS) {
    const input = e.sliders[s.key];
    if (!input) continue;
    input.min = String(s.min);
    input.max = String(s.max);
    input.step = String(s.step);
    input.addEventListener('input', () => {
      setTrial(s.key, Number(input.value));
      render();
    });
  }

  e.snap?.addEventListener('click', () => {
    snapToBestAtPeriod();
    render();
  });

  e.search?.addEventListener('click', () => {
    // Bounded, always, and by the reader. An unbounded search is not a
    // meaningful request and choosing the bounds for somebody would hide the
    // most consequential decision in the analysis.
    const minPeriod = Number(e.minP?.value);
    const maxPeriod = Number(e.maxP?.value);
    const result = runSearch({ minPeriod, maxPeriod });
    if (!result && e.status) e.status.textContent = t('rvfit.badBounds');
    render();
  });

  e.reveal?.addEventListener('click', () => {
    revealTruth();
    render();
  });

  e.close?.addEventListener('click', () => setRvWorkspaceEnabled(false));

  window.addEventListener('resize', () => {
    if (enabled) render();
  });

  e.container.style.display = 'none';
}

// The panel is only ever constructed inside the lazy chunk, so wiring it here
// is safe: by the time this module has been imported, its DOM is present.
initRvWorkspacePanel();

/** @returns {?object} The recording under analysis, for the export dialog */
export const analysedRecording = () => currentRecording();
