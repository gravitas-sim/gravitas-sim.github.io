// =============================================================================
// The /validation/ page
// -----------------------------------------------------------------------------
// Renders the results of the scientific validation suite: a headline verdict, a
// chart of how much room each check left against its tolerance, and the full
// table grouped by area with every tolerance's written justification.
//
// Two sources of the same data, deliberately:
//
//   validation/data.json   committed, so the page has numbers on first paint
//   js/validationWorker.js runs the real suite live, on demand
//
// The second is the point of the page. A results table published by the same
// people who wrote the code is worth very little on its own; a table you can
// regenerate on your own machine in ten seconds is worth rather more. When the
// live run finishes, everything on the page is replaced by its numbers.
// =============================================================================

/** Where the committed snapshot lives. */
const DATA_URL = '/validation/data.json';

/**
 * What each kind of check means, and what its label should not be taken to
 * imply. The wording matches the model page, which is the other place a reader
 * meets these four words.
 */
const KINDS = {
  analytic: {
    label: 'Analytic',
    blurb:
      'Closed-form arithmetic against the equation the code claims to implement. Held at or near machine precision, because there is nothing here for a tolerance to absorb.',
  },
  integration: {
    label: 'Integrated',
    blurb:
      'Measured by actually running the N-body engine, through the same step function the app calls sixty times a second. Tolerances come from the integrator’s discretization error at the stated timestep.',
  },
  data: {
    label: 'Published',
    blurb:
      'A stored parameter or derived observable against a value from the literature, with the source named. The tolerance is set by the precision the reference is quoted to.',
  },
  approximation: {
    label: 'Approximation',
    blurb:
      'An educational model that is not the full physics. Validated against the equation it says it uses and never against reality, and labeled so the two cannot be confused.',
  },
};

const KIND_ORDER = ['analytic', 'integration', 'data', 'approximation'];

const $ = id => document.getElementById(id);

/**
 * Escape text for interpolation into markup.
 *
 * Check names, units and justifications all come from a source file in this
 * repository rather than from a user, but they are still text going into HTML,
 * and one of them contains a less-than sign already.
 *
 * @param {*} v - Any value
 * @returns {string} HTML-safe text
 */
const esc = v =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Format a measured or expected value for a table cell.
 *
 * The suite's numbers span from 1e-30 to 1e12, so neither fixed notation nor
 * exponential is right for all of them. Booleans pass through: a few checks
 * assert an ordering rather than a magnitude.
 *
 * @param {*} v - The value
 * @returns {string} Display text
 */
function num(v) {
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  if (typeof v !== 'number') return String(v);
  if (v === 0) return '0';
  const mag = Math.abs(v);
  if (mag >= 1e6 || mag < 1e-4) return v.toExponential(3);
  return String(Number(v.toPrecision(6)));
}

/**
 * The tolerance, written the way the suite states it.
 *
 * @param {object} c - A check
 * @returns {string} Display text
 */
function tolerance(c) {
  if (!c.tolerance) return 'exact';
  const kind = c.toleranceKind === 'absolute' ? 'abs' : 'rel';
  return `${c.tolerance.toExponential(1)} ${kind}`;
}

/**
 * How much of its allowance a check used, from 0 to 1.
 *
 * This is the number the chart is built on and the one that answers "how well
 * did it do" rather than "did it pass". Exact checks return null: dividing by a
 * tolerance of zero says nothing.
 *
 * @param {object} c - A check
 * @returns {?number} Error over tolerance, or null when held exactly
 */
function margin(c) {
  if (!c.tolerance) return null;
  if (typeof c.error !== 'number' || !Number.isFinite(c.error)) return null;
  return c.error / c.tolerance;
}

// --- Rendering ---------------------------------------------------------------

/**
 * Fill the headline verdict and its four supporting facts.
 *
 * @param {object} data - The suite output
 * @param {boolean} live - True when these numbers came from a run in this tab
 */
function paintVerdict(data, live) {
  const total = data.checks.length;
  const ok = data.failed === 0;
  $('valScore').innerHTML =
    `<span class="${ok ? 'is-pass' : 'is-fail'}">${data.passed}</span>` +
    `<span class="val-score-of">/${total}</span>`;
  $('valScoreLabel').textContent = ok
    ? 'checks passing'
    : `${data.failed} failing`;
  $('valDate').textContent = live
    ? 'just now, in this browser'
    : data.generatedAt || 'unknown';
  $('valElapsed').textContent = `${(data.elapsedMs / 1000).toFixed(1)} s`;
  $('valGroups').textContent = String(
    new Set(data.checks.map(c => c.group)).size
  );
  $('valSources').textContent = String(
    new Set(data.checks.filter(c => c.source).map(c => c.source)).size
  );
  document.getElementById('verdict').dataset.state = ok ? 'pass' : 'fail';
}

/**
 * The four kind cards, each carrying its own count.
 *
 * @param {Array} checks - Every check
 */
function paintKinds(checks) {
  const counts = {};
  for (const c of checks) counts[c.kind] = (counts[c.kind] || 0) + 1;
  $('valKinds').innerHTML = KIND_ORDER.filter(k => counts[k])
    .map(
      k => `
      <article class="val-kind" data-kind="${k}">
        <p class="val-kind-count">${counts[k]}</p>
        <h3>${esc(KINDS[k].label)}</h3>
        <p>${esc(KINDS[k].blurb)}</p>
      </article>`
    )
    .join('');
}

// The chart's decades, from machine precision to the tolerance itself. Anything
// below 1e-15 is round-off and is drawn in the leftmost band rather than given
// decades of its own.
const DECADES = [-15, -12, -9, -6, -3, -1, 0];

/**
 * Position a margin on the chart's log axis, as a percentage across.
 *
 * @param {number} m - Error over tolerance
 * @returns {number} 0 to 100
 */
function chartX(m) {
  const lo = DECADES[0];
  const hi = 0;
  const e = m <= 0 ? lo : Math.log10(m);
  const clamped = Math.min(hi, Math.max(lo, e));
  return ((clamped - lo) / (hi - lo)) * 100;
}

/**
 * The margin chart: one dot per check, placed by how much of its tolerance it
 * used, in a lane per kind.
 *
 * @param {Array} checks - Every check
 */
function paintChart(checks) {
  const scored = checks.filter(c => margin(c) !== null);
  const lanes = KIND_ORDER.filter(k => scored.some(c => c.kind === k));

  const ticks = DECADES.map(
    d =>
      `<span class="val-tick" style="left:${chartX(Math.pow(10, d))}%">${
        d === 0 ? '1' : `10<sup>${d}</sup>`
      }</span>`
  ).join('');

  const rows = lanes
    .map(k => {
      const dots = scored
        .filter(c => c.kind === k)
        .map(c => {
          const m = margin(c);
          const pct = m >= 0.5 ? ' is-tight' : '';
          return `<span class="val-dot${pct}" style="left:${chartX(m).toFixed(2)}%"
                    tabindex="0" role="button"
                    aria-label="${esc(c.name)}: used ${esc((m * 100).toPrecision(2))} percent of its tolerance"
                    data-tip="${esc(c.name)} — ${esc(num(m))}× tolerance"></span>`;
        })
        .join('');
      return `
        <div class="val-lane" data-kind="${k}">
          <span class="val-lane-label">${esc(KINDS[k].label)}</span>
          <span class="val-lane-track">${dots}</span>
        </div>`;
    })
    .join('');

  $('valChart').innerHTML = `
    <div class="val-chart-grid">
      <div class="val-lanes">${rows}</div>
      <div class="val-axis">${ticks}</div>
      <p class="val-axis-title">
        measured error as a fraction of the tolerance allowed
        <span>← more headroom · only just passed →</span>
      </p>
    </div>`;

  const worst = scored.reduce((a, b) => (margin(b) > margin(a) ? b : a));
  const median = [...scored.map(margin)].sort((a, b) => a - b)[
    Math.floor(scored.length / 2)
  ];
  $('valChart').setAttribute(
    'aria-label',
    `${scored.length} checks plotted by how much of their tolerance they used. The median used ${(median * 100).toPrecision(2)} percent. The tightest was ${worst.name}, at ${(margin(worst) * 100).toPrecision(3)} percent.`
  );
  $('valChartCaption').innerHTML =
    `${scored.length} checks with a numeric tolerance. The median used ` +
    `<strong>${(median * 100).toPrecision(2)}%</strong> of what it was allowed; ` +
    `the tightest, <strong>${esc(worst.name)}</strong>, used ` +
    `<strong>${(margin(worst) * 100).toPrecision(3)}%</strong>.`;
}

/**
 * The count of checks held to an exact match, and how they did.
 *
 * @param {Array} checks - Every check
 */
function paintExact(checks) {
  const exact = checks.filter(c => !c.tolerance);
  const clean = exact.filter(c => !c.error).length;
  $('valExact').innerHTML = `
    <p class="val-exact-line">
      <strong>${exact.length}</strong> checks are held to an exact match, and
      <strong>${clean}</strong> of them are exact.
      These are definitions and identities: the solar mass anchor, a face-on
      orbit producing no radial-velocity signal at all, a planet fully off the
      stellar disk blocking no light. A tolerance on any of them would be
      permission for a bug.
    </p>`;
}

/**
 * One table per area, each row openable for its justification.
 *
 * @param {Array} checks - Every check
 */
function paintGroups(checks) {
  const groups = [];
  for (const c of checks) {
    let g = groups.find(x => x.name === c.group);
    if (!g) groups.push((g = { name: c.group, rows: [] }));
    g.rows.push(c);
  }

  $('valGroups2').innerHTML = groups
    .map(g => {
      const failed = g.rows.filter(r => !r.pass).length;
      const rows = g.rows
        .map(c => {
          const m = margin(c);
          const why = [
            c.why ? `<p>${esc(c.why)}</p>` : '',
            c.source
              ? `<p class="val-source">Expected value from <strong>${esc(c.source)}</strong>.</p>`
              : '',
          ].join('');
          return `
            <tr class="val-row" data-kind="${c.kind}" data-pass="${c.pass}">
              <td class="val-cell-name">
                <details>
                  <summary>
                    <span class="val-pill ${c.pass ? 'is-pass' : 'is-fail'}">${c.pass ? 'PASS' : 'FAIL'}</span>
                    <span class="val-name">${esc(c.name)}</span>
                    <span class="val-chip" data-kind="${c.kind}">${esc(KINDS[c.kind]?.label || c.kind)}</span>
                  </summary>
                  <div class="val-why">${why || '<p>No justification recorded.</p>'}</div>
                </details>
              </td>
              <td class="val-n">${esc(num(c.measured))}${c.unit ? `<span class="val-unit">${esc(c.unit)}</span>` : ''}</td>
              <td class="val-n">${esc(num(c.expected))}</td>
              <td class="val-n">${esc(num(c.error))}</td>
              <td class="val-n">${esc(tolerance(c))}</td>
              <td class="val-n">${m === null ? '<span class="val-bar-exact">—</span>' : barFor(m)}</td>
            </tr>`;
        })
        .join('');
      return `
        <section class="val-group" data-group="${esc(g.name)}">
          <h3>
            ${esc(g.name)}
            <span class="val-group-count">${g.rows.length} checks${failed ? `, ${failed} failing` : ''}</span>
          </h3>
          <div class="doc-table-wrap">
            <table class="doc-table val-table">
              <thead>
                <tr>
                  <th scope="col">Check</th>
                  <th scope="col">Measured</th>
                  <th scope="col">Expected</th>
                  <th scope="col">Error</th>
                  <th scope="col">Tolerance</th>
                  <th scope="col">Used</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </section>`;
    })
    .join('');
}

/**
 * A small inline bar showing the fraction of the tolerance used.
 *
 * A number alone makes 3e-9 and 0.4 look equally unremarkable in a column of
 * figures; the bar makes the difference visible without reading any of them.
 *
 * @param {number} m - Error over tolerance
 * @returns {string} HTML
 */
function barFor(m) {
  const pct = Math.max(0, Math.min(100, m * 100));
  const tight = m >= 0.5 ? ' is-tight' : '';
  return `<span class="val-bar${tight}" title="${(m * 100).toPrecision(3)}% of the allowed tolerance">
            <span style="width:${pct.toFixed(1)}%"></span>
          </span>`;
}

/**
 * The kind filters over the tables.
 *
 * @param {Array} checks - Every check
 */
function paintFilters(checks) {
  const counts = {};
  for (const c of checks) counts[c.kind] = (counts[c.kind] || 0) + 1;
  const btns = [
    `<button type="button" class="val-filter is-on" data-filter="all" aria-pressed="true">All ${checks.length}</button>`,
    ...KIND_ORDER.filter(k => counts[k]).map(
      k =>
        `<button type="button" class="val-filter" data-filter="${k}" aria-pressed="false" data-kind="${k}">${esc(KINDS[k].label)} ${counts[k]}</button>`
    ),
  ].join('');
  const el = $('valFilters');
  el.innerHTML = btns;
  el.addEventListener('click', e => {
    const btn = e.target.closest('[data-filter]');
    if (!btn) return;
    for (const b of el.querySelectorAll('[data-filter]')) {
      const on = b === btn;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    const want = btn.dataset.filter;
    for (const row of document.querySelectorAll('.val-row')) {
      row.hidden = want !== 'all' && row.dataset.kind !== want;
    }
    // A section whose every row is filtered out is an empty table with a
    // heading over it, which reads as a missing result rather than a filter.
    for (const sec of document.querySelectorAll('.val-group')) {
      sec.hidden = !sec.querySelector('.val-row:not([hidden])');
    }
  });
}

/**
 * Render everything from one set of results.
 *
 * @param {object} data - The suite output
 * @param {boolean} [live] - True when produced by a run in this tab
 */
function render(data, live = false) {
  paintVerdict(data, live);
  paintKinds(data.checks);
  paintChart(data.checks);
  paintExact(data.checks);
  paintGroups(data.checks);
  paintFilters(data.checks);
}

// --- The live run ------------------------------------------------------------

/** Wire the button that runs the whole suite in a worker. */
function setupLiveRun() {
  const btn = $('valRunBtn');
  const bar = $('valRunBar');
  const result = $('valRunResult');
  if (!btn) return;

  if (typeof Worker === 'undefined') {
    btn.disabled = true;
    $('valRunNote').textContent =
      'This browser cannot run the suite here. The table below is the committed result, and npm run validate:physics reproduces it in a terminal.';
    return;
  }

  btn.addEventListener('click', () => {
    btn.disabled = true;
    btn.textContent = 'Running…';
    bar.hidden = false;
    result.hidden = true;

    let worker;
    try {
      worker = new Worker('/js/validationWorker.js', { type: 'module' });
    } catch {
      fail('This browser would not start a module worker.');
      return;
    }

    const started = performance.now();
    worker.onmessage = e => {
      const data = e.data;
      worker.terminate();
      bar.hidden = true;
      btn.disabled = false;
      btn.textContent = 'Run again';
      if (!data.ok) {
        fail(data.error || 'The run did not finish.');
        return;
      }
      render(data, true);
      result.hidden = false;
      result.className = `val-run-result ${data.failed ? 'is-fail' : 'is-pass'}`;
      result.textContent = data.failed
        ? `${data.failed} of ${data.checks.length} checks failed in this browser, in ${(data.elapsedMs / 1000).toFixed(1)} seconds. Everything below is that run.`
        : `${data.passed} of ${data.checks.length} checks passed in this browser, in ${(data.elapsedMs / 1000).toFixed(1)} seconds. Everything below is now that run, not the committed one.`;
      // A run that finished suspiciously fast did not integrate anything.
      if (performance.now() - started < 200) {
        result.textContent += ' (Unexpectedly fast; treat with suspicion.)';
      }
    };
    worker.onerror = ev => {
      worker.terminate();
      fail(ev.message || 'The worker failed to load.');
    };

    worker.postMessage('run');

    /** Report a failed run without pretending it succeeded. */
    function fail(message) {
      bar.hidden = true;
      btn.disabled = false;
      btn.textContent = 'Try again';
      result.hidden = false;
      result.className = 'val-run-result is-fail';
      result.textContent = `Could not run here: ${message} The table below is the committed result.`;
    }
  });
}

// --- Boot --------------------------------------------------------------------

fetch(DATA_URL)
  .then(r => {
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json();
  })
  .then(data => {
    render(data, false);
    setupLiveRun();
  })
  .catch(err => {
    $('valScore').innerHTML = '<span class="is-fail">—</span>';
    $('valScoreLabel').textContent = 'results could not be loaded';
    $('valGroups2').innerHTML =
      `<p class="doc-note">The committed results file could not be read (${esc(err.message)}). Running the suite here will still work if your browser allows module workers.</p>`;
    setupLiveRun();
  });
