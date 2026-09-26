// =============================================================================
// /observatory/: open an observation, look at it every way, change it, keep it
// -----------------------------------------------------------------------------
// The page around the workspace's contracts (OBSERVATORY_WORKSPACE_DESIGN.md):
//
//   state.source     the observation as opened (a fixture, an import, or an
//                    export read back), never changed
//   state.history    the list of changes, with undo and redo (./history.js)
//   state.view       replay(source, changes): what every view shows
//   state.selection  one set of rows every view shares (./selection.js)
//
// A change goes through whyNot() first, so the list never holds one that
// fails, and every view is redrawn from the replay. A change that renumbers
// the rows (a crop, a bin) starts a new selection; anything else keeps it.
//
// Its own bundle, like /experiments/: the simulation never imports it, and it
// never imports the simulation. Each observation loads only when opened.
// =============================================================================

import {
  LANGUAGES,
  language,
  preferred,
  registerMessages,
  setLanguage,
  t,
  translatePage,
} from './observatory/i18n.js';
import {
  FIXTURES,
  lightCurveObservation,
  openFixture,
} from './observatory/fixtures.js';
import {
  columnOf,
  maskedRows,
  missingCount,
  rowCount,
  uncertaintyOf,
} from './observatory/schema.js';
import { OPS, replay, whyNot } from './observatory/transforms.js';
import { createHistory } from './observatory/history.js';
import { createSelection } from './observatory/selection.js';
import { build, read } from './observatory/import.js';
import {
  exportName,
  observationCsv,
  observationJson,
  sameObservation,
} from './observatory/export.js';
import {
  TIME_FORMATS,
  TIME_SCALES,
  UNITS,
  cannotConvert,
  cannotConvertTime,
  dimensionOf,
  formatUnit,
  parseUnit,
  unitId,
} from './observatory/units.js';
import { createPlot } from './observatory/plot.js';
import { createImageView, decodeBits } from './observatory/image.js';
import { createTable } from './observatory/table.js';

const $ = id => document.getElementById(id);

const state = {
  source: null,
  history: createHistory(),
  view: null,
  notes: [],
  selection: null,
  unsubscribe: null,
  rowsKey: '',
  seq: 0,
  x: null,
  y: null,
  imported: null,
};

// --- Words and numbers -------------------------------------------------------------

function number(v) {
  if (!Number.isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a !== 0 && (a < 1e-4 || a >= 1e7)) return v.toExponential(4);
  return new Intl.NumberFormat(language(), {
    maximumSignificantDigits: 8,
    useGrouping: false,
  }).format(v);
}

const unitText = c =>
  c.role === 'label'
    ? ''
    : formatUnit(parseUnit(c.unit).unit, t('obs.unit.notStated'));

/** What one row is, in words: every column's value and unit. */
function describe(i) {
  const o = state.view;
  if (!o || !(i >= 0)) return '';
  const n = rowCount(o);
  if (o.kind === 'image') {
    const im = o.image;
    const x = (i % im.width) + 1;
    const y = Math.floor(i / im.width) + 1;
    const flags = columnOf(o, im.value);
    const v = flags.values[i];
    const meaning = flags.bits
      ? decodeBits(v, flags.bits).join('; ')
      : `${number(v)} ${unitText(flags)}`;
    const ra = columnOf(o, 'ra')?.values[i];
    const dec = columnOf(o, 'dec')?.values[i];
    return t('obs.describe.pixel', {
      x,
      y,
      value: number(v),
      meaning,
      ra: number(ra),
      dec: number(dec),
      masked: maskedRows(o).has(i) ? t('obs.describe.masked') : '',
    });
  }
  const parts = [];
  for (const c of o.columns) {
    if (['uncertainty', 'lower', 'upper'].includes(c.role)) continue;
    const v = c.values[i];
    if (c.role === 'label') {
      parts.push(`${c.name} ${v ?? t('obs.table.missing')}`);
      continue;
    }
    if (!Number.isFinite(v)) {
      parts.push(`${c.name} ${t('obs.table.missing')}`);
      continue;
    }
    const { sigma, lower, upper } = uncertaintyOf(o, c.id);
    let err = '';
    if (sigma && Number.isFinite(sigma.values[i]))
      err = ` ± ${number(sigma.values[i])}`;
    else if (lower && upper && Number.isFinite(lower.values[i]))
      err = ` (${number(lower.values[i])}, +${number(upper.values[i])})`;
    parts.push(`${c.name} ${number(v)}${err} ${unitText(c)}`.trim());
  }
  return t('obs.describe.row', {
    row: i + 1,
    n,
    values: parts.join(', '),
    masked: maskedRows(o).has(i) ? t('obs.describe.masked') : '',
  });
}

function status(text) {
  const s = $('obsStatus');
  s.textContent = '';
  // A new node each time, so a repeated message is still announced.
  requestAnimationFrame(() => (s.textContent = text));
}

let lastAnnounce = 0;
function announce(text) {
  // The keyboard can move faster than a reader can listen; say the latest.
  // Whatever was waiting is older than this, so it is dropped either way.
  clearTimeout(announce.timer);
  const now = performance.now();
  if (now - lastAnnounce < 120) {
    announce.timer = setTimeout(() => announce(text), 130);
    return;
  }
  lastAnnounce = now;
  $('obsReadout').textContent = text;
  status(text);
}

// --- Views ---------------------------------------------------------------------------

const labels = () => ({
  notStated: t('obs.unit.notStated'),
  row: t('obs.table.row'),
  masked: t('obs.table.masked'),
  missing: t('obs.table.missing'),
});

const plot = createPlot($('obsPlot'), {
  announce,
  describe,
  number,
  get labels() {
    return labels();
  },
});
const image = createImageView($('obsImage'), { announce, describe });
const table = createTable($('obsTable'), {
  announce,
  describe,
  number,
  t,
  get labels() {
    return labels();
  },
  onPage: ({ first, last, n }) => {
    $('obsPrevPage').disabled = first === 0;
    $('obsNextPage').disabled = last >= n - 1;
  },
});

/** The key that says whether two lists of changes number the rows alike. */
const rowsKey = changes =>
  JSON.stringify(changes.filter(c => c.op === 'crop' || c.op === 'bin'));

function rebuild({ announceChange = null } = {}) {
  const changes = state.history.changes();
  let out;
  try {
    out = replay(state.source, changes);
  } catch (err) {
    // Only an export edited by hand can hold a change that fails; say so.
    status(t('obs.replayFailed', { why: err.message }));
    state.history.undo();
    return rebuild();
  }
  state.view = out.o;
  state.notes = out.notes;
  const key = rowsKey(changes);
  const n = rowCount(state.view);
  if (!state.selection || key !== state.rowsKey || state.n !== n) {
    const had = state.selection?.size;
    state.unsubscribe?.();
    state.selection = createSelection(n);
    state.unsubscribe = state.selection.subscribe(onSelection);
    state.rowsKey = key;
    state.n = n;
    if (had) status(t('obs.selectionCleared'));
  }
  // A fold makes phase the axis; anything else keeps the reader's choice.
  const ids = new Set(state.view.columns.map(c => c.id));
  if (!ids.has(state.x) || state.view.axes.x !== state.lastAxis)
    state.x = state.view.axes.x;
  if (!ids.has(state.y)) state.y = state.view.axes.y;
  state.lastAxis = state.view.axes.x;
  renderAll();
  if (announceChange) status(announceChange);
}

/**
 * The fit panel, for an observation a model suits: loaded the first time a
 * reader opens it, so the page itself carries none of the inference core.
 */
// What the page lends its lazily loaded panels (see js/observatory/fitPanel.js).
const lent = { t, number, registerMessages, createPlot, createSelection };
const fit = { panel: null, loading: null, suits: false };
function mountFit(m) {
  fit.module = m;
  fit.panel?.destroy();
  fit.panel = m.mountFitPanel($('obsFitBody'), {
    ...lent,
    observation: state.view,
    dimensionOfText: text => dimensionOf(parseUnit(text).unit),
  });
  return fit.panel;
}
async function fitPanel() {
  if (fit.panel) return fit.panel;
  fit.loading ??= import('./observatory/fitPanel.js').then(mountFit);
  return fit.loading;
}
// The archive import (ARCHIVE_IMPORT.md): loaded when first opened.
let archive = null;
$('obsArchivePanel').addEventListener('toggle', () => {
  archive ??= import('./observatory/archivePanel.js').then(m =>
    m.mountArchivePanel($('obsArchivePanel'), { ...lent, open, status })
  );
});

$('obsFitPanel').addEventListener('toggle', async () => {
  if (!$('obsFitPanel').open || !state.view) return;
  (await fitPanel()).update(state.view);
});
function renderFit(o) {
  // Whether a model suits it is known without loading one: a time series of
  // a ratio or a velocity.
  const y = o.columns.find(c => c.id === o.axes.y);
  const dim = dimensionOf(parseUnit(y?.unit).unit);
  fit.suits =
    o.kind === 'time-series' &&
    (dim === 'ratio' || dim === 'velocity' || dim === null);
  $('obsFitPanel').hidden = !fit.suits;
  if (fit.suits && fit.panel && $('obsFitPanel').open) fit.panel.update(o);
}

function renderAll() {
  const o = state.view;
  $('obsWork').hidden = false;
  $('obsTitle').textContent = o.title;
  renderSource(o);
  renderAxes(o);
  const isImage = o.kind === 'image';
  $('obsPlotBox').hidden = isImage;
  $('obsImageBox').hidden = !isImage;
  let drawn = null;
  if (isImage) {
    const { legend } = image.draw(o, { selection: state.selection });
    renderLegend(legend);
  } else {
    drawn = plot.draw(o, {
      xColumn: state.x,
      yColumn: state.y,
      selection: state.selection,
    });
    $('obsPlot').setAttribute(
      'aria-label',
      t('obs.plot.label', {
        y: columnOf(o, state.y).name,
        x: columnOf(o, state.x).name,
        n: drawn.plotted,
      })
    );
  }
  table.draw(o, { selection: state.selection, caption: o.title });
  renderSeeing(o, drawn);
  renderMarks(o);
  renderChanges(o);
  renderFit(o);
  renderSelectionBar();
  $('obsUndo').disabled = !state.history.canUndo();
  $('obsRedo').disabled = !state.history.canRedo();
}

function onSelection({ source }) {
  if (!state.view) return;
  // The plot and the image repaint the selection whoever changed it; the
  // table turns its page only when another view moved the focus, so its own
  // keyboard focus is not taken from under it.
  if (state.view.kind === 'image') image.update();
  else plot.update();
  if (source !== 'table') table.update();
  renderSelectionBar();
  const f = state.selection.focus;
  if (source !== 'plot' && source !== 'image' && f >= 0)
    $('obsReadout').textContent = describe(f);
}

function renderSelectionBar() {
  const s = state.selection;
  $('obsSelected').textContent = t('obs.selection.count', { n: s.size });
  $('obsMask').disabled = !s.size;
  $('obsNoteGo').disabled = !s.size;
  $('obsClear').disabled = !s.size;
}

// --- The observation's record, and what the reader is seeing ------------------------

function renderSource(o) {
  const dl = $('obsSource');
  dl.replaceChildren();
  const add = (term, value, lang) => {
    if (value === null || value === undefined || value === '') return;
    const dt = document.createElement('dt');
    dt.textContent = term;
    const dd = document.createElement('dd');
    if (value instanceof window.Node) dd.append(value);
    else dd.textContent = value;
    if (lang) dd.lang = lang;
    dl.append(dt, dd);
  };
  if (o.origin === 'imported') {
    add(
      t('obs.source.file'),
      t('obs.source.fileValue', {
        name: o.source.file?.name ?? o.source.id,
        kb: ((o.source.file?.bytes ?? 0) / 1024).toFixed(1),
      })
    );
    add(t('obs.source.origin'), t('obs.origin.imported'));
    return;
  }
  add(t('obs.source.origin'), t(`obs.origin.${o.origin}`));
  add(t('obs.source.credit'), o.credit, 'en');
  if (o.object) {
    const pos = Number.isFinite(o.object.ra)
      ? t('obs.source.position', {
          ra: number(o.object.ra),
          dec: number(o.object.dec),
          frame: o.object.frame,
        })
      : '';
    add(t('obs.source.object'), `${o.object.name}${pos ? `, ${pos}` : ''}`);
  }
  add(t('obs.source.facility'), o.facility, 'en');
  add(t('obs.source.license'), o.license?.statement || o.license?.status, 'en');
  add(t('obs.source.retrieved'), o.retrieved);
  if (o.citations?.length) {
    const ul = document.createElement('ul');
    for (const c of o.citations) {
      const li = document.createElement('li');
      li.lang = 'en';
      if (c.url) {
        const a = document.createElement('a');
        a.href = c.url;
        a.rel = 'noopener';
        a.textContent = c.text;
        li.append(a);
      } else li.textContent = c.text;
      ul.append(li);
    }
    add(t('obs.source.citations'), ul);
  }
}

function renderSeeing(o, drawn) {
  const ul = $('obsSeeing');
  ul.replaceChildren();
  const item = (text, lang) => {
    const li = document.createElement('li');
    li.textContent = text;
    if (lang) li.lang = lang;
    ul.append(li);
  };
  if (o.origin === 'imported') item(t('obs.seeing.imported'));
  for (const r of o.reductions || []) item(r, 'en');
  for (const note of state.notes)
    item(t(`obs.note.${note.key}`, formatVars(note.vars)));
  const n = rowCount(o);
  if (drawn) {
    if (drawn.drawn < drawn.plotted) {
      item(t('obs.seeing.drawnSome', { drawn: drawn.drawn, n: drawn.plotted }));
    } else item(t('obs.seeing.drawnAll', { n: drawn.plotted }));
    if (drawn.plotted < n)
      item(t('obs.seeing.notPlotted', { n: n - drawn.plotted }));
  }
  const masked = maskedRows(o).size;
  if (masked) item(t('obs.seeing.masked', { n: masked }));
  for (const c of o.columns) {
    const m = missingCount(c);
    if (m) item(t('obs.seeing.missing', { column: c.name, n: m }));
  }
  const y = columnOf(o, o.kind === 'image' ? o.image.value : state.y);
  if (y && y.role !== 'flag' && y.role !== 'label') {
    const u = uncertaintyOf(o, y.id);
    if (u.sigma) item(t('obs.seeing.sigma', { column: y.name }));
    else if (u.lower && u.upper)
      item(
        t('obs.seeing.interval', {
          column: y.name,
          level: Math.round(u.lower.level * 100),
        })
      );
    else item(t('obs.seeing.noUncertainty', { column: y.name }));
  }
  if (o.time) {
    item(
      o.time.scale === 'unknown'
        ? t('obs.seeing.timeUnknown', { format: o.time.format })
        : t('obs.seeing.time', { format: o.time.format, scale: o.time.scale })
    );
  }
  if (o.spectral) {
    item(
      t('obs.seeing.spectral', {
        medium: t(`obs.medium.${o.spectral.medium}`),
        frame:
          o.spectral.frame === 'rest' ? t('obs.frame.rest') : o.spectral.frame,
      })
    );
  }
}

function formatVars(vars) {
  const out = {};
  for (const [k, v] of Object.entries(vars || {})) {
    out[k] =
      typeof v === 'number'
        ? number(v)
        : k === 'unit'
          ? formatUnit(parseUnit(v).unit, '')
          : v;
  }
  return out;
}

function renderLegend(legend) {
  const ul = $('obsLegend');
  ul.replaceChildren();
  $('obsImage').setAttribute(
    'aria-label',
    t('obs.image.label', {
      w: state.view.image.width,
      h: state.view.image.height,
    })
  );
  if (!legend) return;
  for (const entry of legend) {
    const li = document.createElement('li');
    const swatch = document.createElement('span');
    swatch.className = 'ow-swatch';
    swatch.style.background = entry.color;
    swatch.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span');
    text.textContent = t('obs.legend.entry', {
      value: entry.value,
      n: entry.count,
      meanings: entry.meanings.join('; '),
    });
    li.append(swatch, text);
    ul.append(li);
  }
  const src = state.view.image.bitsSource;
  if (src) {
    const li = document.createElement('li');
    li.className = 'ow-hint';
    li.lang = 'en';
    li.textContent = t('obs.legend.source', { source: src });
    ul.append(li);
  }
}

function renderMarks(o) {
  const masks = $('obsMaskList');
  masks.replaceChildren(
    ...o.masks.map(m => {
      const li = document.createElement('li');
      li.textContent = t(
        m.source === 'reader' ? 'obs.mask.reader' : 'obs.mask.source',
        {
          n: m.rows.length,
          label: m.label || t('obs.mask.unlabelled'),
        }
      );
      if (m.source === 'reader') {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'ui-button ow-small';
        b.textContent = t('obs.mask.remove');
        b.addEventListener('click', () => apply({ op: 'unmask', id: m.id }));
        li.append(' ', b);
      }
      return li;
    })
  );
  const notes = $('obsNoteList');
  notes.replaceChildren(
    ...o.annotations.map(a => {
      const li = document.createElement('li');
      const go = document.createElement('button');
      go.type = 'button';
      go.className = 'ui-button ow-small';
      go.textContent = t('obs.note.show', {
        first: a.rows[0] + 1,
        last: a.rows[1] + 1,
      });
      go.addEventListener('click', () => {
        state.selection.range(a.rows[0], a.rows[1], 'note');
        state.selection.moveFocus(a.rows[0], 'note');
      });
      const text = document.createElement('span');
      text.textContent = ` ${a.text} `;
      const rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'ui-button ow-small';
      rm.textContent = t('obs.note.remove');
      rm.addEventListener('click', () => apply({ op: 'unannotate', id: a.id }));
      li.append(go, text, rm);
      return li;
    })
  );
  $('obsMarks').hidden = !o.masks.length && !o.annotations.length;
}

// --- Axes ------------------------------------------------------------------------------

function renderAxes(o) {
  const box = $('obsAxes');
  box.hidden = o.kind === 'image';
  if (box.hidden) return;
  const numeric = o.columns.filter(c => ['x', 'value'].includes(c.role));
  for (const [id, current] of [
    ['obsAxisX', state.x],
    ['obsAxisY', state.y],
  ]) {
    const sel = $(id);
    sel.replaceChildren(
      ...numeric.map(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        return opt;
      })
    );
    sel.value = current;
  }
}

$('obsAxisX').addEventListener('change', e => {
  state.x = e.target.value;
  renderAll();
});
$('obsAxisY').addEventListener('change', e => {
  state.y = e.target.value;
  renderAll();
});

// --- Changes -----------------------------------------------------------------------

function apply(change) {
  const why = whyNot(state.view, change);
  if (why) {
    status(t('obs.refused', { why }));
    $('obsChangeStatus').textContent = t('obs.refused', { why });
    $('obsChangeStatus').lang = '';
    return false;
  }
  state.history.push(change);
  $('obsChangeStatus').textContent = '';
  rebuild({
    announceChange: t('obs.applied', { change: t(`obs.op.${change.op}`) }),
  });
  return true;
}

const numberIn = id => {
  const v = $(id).value.trim();
  return v === '' ? NaN : Number(v);
};

function renderChanges(o) {
  const kind = o.kind;
  for (const [op, box] of [
    ['crop', 'obsCropBox'],
    ['normalize', 'obsNormBox'],
    ['fold', 'obsFoldBox'],
    ['bin', 'obsBinBox'],
    ['restFrame', 'obsRestBox'],
    ['convert', 'obsConvertBox'],
    ['timeFormat', 'obsTimeBox'],
  ]) {
    $(box).hidden = !OPS[op].kinds.includes(kind);
  }
  const x = columnOf(o, state.x);
  if (x && kind !== 'image') {
    let lo = Infinity;
    let hi = -Infinity;
    for (const v of x.values) {
      if (Number.isFinite(v)) {
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
    }
    $('obsCropMin').value = Number.isFinite(lo) ? String(lo) : '';
    $('obsCropMax').value = Number.isFinite(hi) ? String(hi) : '';
    $('obsCropUnit').textContent = unitText(x);
    $('obsBinUnit').textContent = unitText(x);
  }
  if (o.time) {
    const t0 = columnOf(o, o.time.column).values.find(Number.isFinite);
    if ($('obsFoldEpoch').dataset.for !== o.id) {
      $('obsFoldEpoch').value = t0 !== undefined ? String(t0) : '';
      $('obsFoldEpoch').dataset.for = o.id;
    }
    const tf = $('obsTimeTo');
    tf.replaceChildren(
      ...Object.keys(TIME_FORMATS)
        .filter(
          f => f !== o.time.format && !cannotConvertTime(o.time.format, f)
        )
        .map(f => option(f, f))
    );
    $('obsTimeGo').disabled = !tf.options.length;
  }
  if (
    o.spectral &&
    o.spectral.redshift !== undefined &&
    $('obsRestZ').dataset.for !== o.id
  ) {
    $('obsRestZ').value = String(o.spectral.redshift);
    $('obsRestZ').dataset.for = o.id;
  }
  // Convert: the columns with a unit, and the units each could become.
  const conv = $('obsConvertColumn');
  const keep = conv.value;
  const convertible = o.columns.filter(
    c =>
      !['label', 'flag'].includes(c.role) &&
      c.id !== o.time?.column &&
      !DEPENDENT_ROLES.has(c.role) &&
      parseUnit(c.unit).unit
  );
  conv.replaceChildren(
    ...convertible.map(c => option(c.id, `${c.name} (${unitText(c)})`))
  );
  if (convertible.some(c => c.id === keep)) conv.value = keep;
  fillConvertTo();
}

const DEPENDENT_ROLES = new Set(['uncertainty', 'lower', 'upper']);

function option(value, text) {
  const o = document.createElement('option');
  o.value = value;
  o.textContent = text;
  return o;
}

function fillConvertTo() {
  const c = state.view && columnOf(state.view, $('obsConvertColumn').value);
  const to = $('obsConvertTo');
  if (!c) {
    to.replaceChildren();
    $('obsConvertGo').disabled = true;
    return;
  }
  const from = parseUnit(c.unit).unit;
  const dim = dimensionOf(from);
  to.replaceChildren(
    ...Object.keys(UNITS)
      .filter(
        id =>
          UNITS[id].dim === dim &&
          unitId({ id, scale: 1 }) !== c.unit &&
          !cannotConvert(from, { id, scale: 1 })
      )
      .map(id =>
        option(id, formatUnit({ id, scale: 1 }, '') || t('obs.unit.none'))
      )
  );
  $('obsConvertGo').disabled = !to.options.length;
}
$('obsConvertColumn').addEventListener('change', fillConvertTo);

$('obsCropGo').addEventListener('click', () =>
  apply({
    op: 'crop',
    column: state.x,
    min: numberIn('obsCropMin'),
    max: numberIn('obsCropMax'),
  })
);
$('obsNormGo').addEventListener('click', () =>
  apply({ op: 'normalize', column: state.y })
);
$('obsFoldGo').addEventListener('click', () =>
  apply({
    op: 'fold',
    period: numberIn('obsFoldPeriod'),
    epoch: numberIn('obsFoldEpoch'),
  })
);
$('obsBinGo').addEventListener('click', () =>
  apply({ op: 'bin', width: numberIn('obsBinWidth') })
);
$('obsRestGo').addEventListener('click', () =>
  apply({ op: 'restFrame', z: numberIn('obsRestZ') })
);
$('obsConvertGo').addEventListener('click', () =>
  apply({
    op: 'convert',
    column: $('obsConvertColumn').value,
    to: $('obsConvertTo').value,
  })
);
$('obsTimeGo').addEventListener('click', () =>
  apply({ op: 'timeFormat', to: $('obsTimeTo').value })
);

$('obsMask').addEventListener('click', () => {
  const rows = [...state.selection.rows()];
  apply({
    op: 'mask',
    id: `m${++state.seq}`,
    rows,
    label: $('obsMaskLabel').value.trim(),
  });
  $('obsMaskLabel').value = '';
});
$('obsNoteGo').addEventListener('click', () => {
  const b = state.selection.bounds();
  if (!b) return;
  if (
    apply({
      op: 'annotate',
      id: `a${++state.seq}`,
      rows: b,
      text: $('obsNoteText').value,
    })
  )
    $('obsNoteText').value = '';
});
$('obsClear').addEventListener('click', () => state.selection.clear('button'));

function undo() {
  const c = state.history.undo();
  if (c)
    rebuild({
      announceChange: t('obs.undid', { change: t(`obs.op.${c.op}`) }),
    });
}
function redo() {
  const c = state.history.redo();
  if (c)
    rebuild({
      announceChange: t('obs.redid', { change: t(`obs.op.${c.op}`) }),
    });
}
$('obsUndo').addEventListener('click', undo);
$('obsRedo').addEventListener('click', redo);
document.addEventListener('keydown', e => {
  if (!state.view || !(e.ctrlKey || e.metaKey)) return;
  // A text field keeps its own undo.
  if (e.target.closest?.('input, textarea, select')) return;
  const k = e.key.toLowerCase();
  if (k === 'z' && !e.shiftKey) {
    e.preventDefault();
    undo();
  } else if ((k === 'z' && e.shiftKey) || k === 'y') {
    e.preventDefault();
    redo();
  }
});

$('obsPrevPage').addEventListener('click', () => table.turn(-1));
$('obsNextPage').addEventListener('click', () => table.turn(1));

// --- Opening ----------------------------------------------------------------------

function open(o, changes = []) {
  state.source = o;
  state.history.reset(changes);
  state.selection = null;
  state.x = o.axes.x;
  state.y = o.axes.y;
  state.lastAxis = o.axes.x;
  state.seq = changes.length;
  rebuild({ announceChange: t('obs.opened', { title: o.title }) });
  $('obsTitle').focus();
  // How many observations have opened: what a test or the bench waits on.
  document.documentElement.dataset.opens = String(
    Number(document.documentElement.dataset.opens || 0) + 1
  );
}

function fillFixtures() {
  const sel = $('obsFixture');
  const keep = sel.value;
  const groups = new Map();
  for (const f of FIXTURES) {
    if (!groups.has(f.kind)) {
      const g = document.createElement('optgroup');
      g.label = t(`obs.kind.${f.kind}`);
      groups.set(f.kind, g);
    }
    groups.get(f.kind).append(option(f.id, t(`obs.fixture.${f.id}`)));
  }
  sel.replaceChildren(...groups.values());
  if (keep) sel.value = keep;
}

$('obsOpen').addEventListener('click', async () => {
  const id = $('obsFixture').value;
  $('obsOpen').disabled = true;
  status(t('obs.opening'));
  try {
    open(await openFixture(id));
  } catch (err) {
    status(t('obs.openFailed', { why: err.message }));
  } finally {
    $('obsOpen').disabled = false;
  }
});

// --- Importing -------------------------------------------------------------------------

const USES = ['ignore', 'x', 'value', 'uncertainty', 'label'];
const CHOOSE = '__choose';
const NOT_STATED = '__null';

$('obsFile').addEventListener('change', async e => {
  const file = e.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  state.imported = { text, name: file.name, bytes: file.size };
  readImport();
});
$('obsDecimalComma').addEventListener('change', readImport);

function readImport() {
  const f = state.imported;
  if (!f) return;
  const r = read(f.text, {
    name: f.name,
    bytes: f.bytes,
    decimalComma: $('obsDecimalComma').checked,
  });
  $('obsImport').hidden = false;
  if (!r.ok) {
    showProblems(r.problems);
    $('obsImportForm').hidden = true;
    return;
  }
  if (r.observation) {
    // One of this page's own saves: the observation as it was opened, and the
    // changes made again to it, so undo reaches back to where it started.
    $('obsImport').hidden = true;
    open(r.observation, r.changes);
    const same = !r.expected || sameObservation(state.view, r.expected);
    status(
      t(same ? 'obs.import.readBack' : 'obs.import.readBackDiffers', {
        n: r.changes.length,
      })
    );
    return;
  }
  state.table = r.table;
  showProblems([]);
  $('obsImportForm').hidden = false;
  renderPreview(r.table);
  renderMapping(r.table);
  $('obsImportTitleIn').value = f.name.replace(/\.[^.]+$/, '');
  toggleKindFields();
  $('obsImportTitle').focus();
}

function showProblems(problems) {
  const ul = $('obsImportProblems');
  ul.hidden = !problems.length;
  ul.replaceChildren(
    ...problems.map(p => {
      const li = document.createElement('li');
      // The workspace's own words, which are English; the list says so.
      li.lang = 'en';
      li.textContent = p.line
        ? t('obs.import.onLine', { line: p.line, message: p.message })
        : p.message;
      return li;
    })
  );
}

function renderPreview(tbl) {
  $('obsImportSummary').textContent = t('obs.import.summary', {
    rows: tbl.rows.length,
    columns: tbl.header.length,
    delimiter: t(
      `obs.import.delimiter.${tbl.format === 'json' ? 'json' : { ',': 'comma', '\t': 'tab', ';': 'semicolon' }[tbl.delimiter]}`
    ),
    header: tbl.headerRow
      ? t('obs.import.withHeader')
      : t('obs.import.noHeader'),
  });
  const comments = $('obsImportComments');
  comments.hidden = !tbl.comments.length;
  comments.replaceChildren(
    ...tbl.comments.slice(0, 20).map(c => {
      const li = document.createElement('li');
      li.textContent = c;
      return li;
    })
  );
  const tableEl = $('obsPreview');
  const cap = document.createElement('caption');
  cap.textContent = t('obs.import.previewCaption', {
    n: Math.min(8, tbl.rows.length),
  });
  const head = document.createElement('tr');
  for (const h of tbl.header) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    head.append(th);
  }
  const thead = document.createElement('thead');
  thead.append(head);
  const tbody = document.createElement('tbody');
  for (const r of tbl.rows.slice(0, 8)) {
    const tr = document.createElement('tr');
    for (const v of r) {
      const td = document.createElement('td');
      td.textContent = v === null || v === undefined ? '' : String(v);
      tr.append(td);
    }
    tbody.append(tr);
  }
  tableEl.replaceChildren(cap, thead, tbody);
}

function unitSelect(col, index) {
  const sel = document.createElement('select');
  sel.id = `obsUnit${index}`;
  sel.append(
    option(CHOOSE, t('obs.import.chooseUnit')),
    option('', t('obs.unit.none')),
    option(NOT_STATED, t('obs.unit.notStated'))
  );
  const byDim = new Map();
  for (const [id, u] of Object.entries(UNITS)) {
    if (id === '') continue;
    if (!byDim.has(u.dim)) {
      const g = document.createElement('optgroup');
      g.label = t(`obs.dim.${u.dim}`);
      byDim.set(u.dim, g);
    }
    byDim.get(u.dim).append(option(id, `${u.symbol} (${id})`));
  }
  sel.append(...byDim.values());
  const s = col.suggestion;
  if (s && s.unit.scale !== 1) {
    // A scaled unit, like SDSS's 1e-17: offered as it is written.
    sel.append(option(unitId(s.unit), formatUnit(s.unit, '')));
  }
  return sel;
}

function renderMapping(tbl) {
  const box = $('obsMapping');
  box.replaceChildren();
  tbl.columns.forEach((col, i) => {
    const row = document.createElement('div');
    row.className = 'ow-map-row';
    const title = document.createElement('p');
    title.className = 'ow-map-name';
    title.textContent = col.name;
    const stats = document.createElement('p');
    stats.className = 'ow-hint';
    stats.textContent = col.numeric
      ? t('obs.import.stats', {
          numbers: col.numbers,
          missing: col.missing,
          tokens:
            col.missingTokens
              .map(x => (x === '' ? t('obs.import.blank') : `"${x}"`))
              .join(', ') || '—',
          min: number(col.min),
          max: number(col.max),
        })
      : t('obs.import.statsText', { numbers: col.numbers, n: tbl.rows.length });
    const use = document.createElement('select');
    use.id = `obsUse${i}`;
    use.append(...USES.map(u => option(u, t(`obs.use.${u}`))));
    use.value = col.numeric ? (i === 0 ? 'x' : 'value') : 'label';
    const useLabel = document.createElement('label');
    useLabel.className = 'ow-field';
    const useText = document.createElement('span');
    useText.textContent = t('obs.import.use', { column: col.name });
    useLabel.append(useText, use);

    const unit = unitSelect(col, i);
    const unitLabel = document.createElement('label');
    unitLabel.className = 'ow-field';
    const unitText2 = document.createElement('span');
    unitText2.textContent = t('obs.import.unit', { column: col.name });
    unitLabel.append(unitText2, unit);

    const of = document.createElement('select');
    of.id = `obsOf${i}`;
    of.append(
      ...tbl.columns
        .map((c, k) => option(String(k), c.name))
        .filter((_, k) => k !== i)
    );
    const ofLabel = document.createElement('label');
    ofLabel.className = 'ow-field';
    const ofText = document.createElement('span');
    ofText.textContent = t('obs.import.of', { column: col.name });
    ofLabel.append(ofText, of);

    row.append(title, stats, useLabel, unitLabel, ofLabel);
    if (col.suggestion) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ui-button ow-small';
      b.textContent = t('obs.import.useSuggestion', {
        unit:
          formatUnit(col.suggestion.unit, t('obs.unit.none')) ||
          t('obs.unit.none'),
      });
      b.addEventListener('click', () => {
        unit.value = unitId(col.suggestion.unit);
        status(t('obs.import.suggestionUsed', { column: col.name }));
      });
      row.append(b);
    }
    const sync = () => {
      unitLabel.hidden = ['ignore', 'label'].includes(use.value);
      ofLabel.hidden = use.value !== 'uncertainty';
    };
    use.addEventListener('change', sync);
    sync();
    box.append(row);
  });
}

function toggleKindFields() {
  const kind = $('obsImportKind').value;
  $('obsTimeFields').hidden = kind !== 'time-series';
  $('obsSpectralFields').hidden = kind !== 'spectrum';
}
$('obsImportKind').addEventListener('change', toggleKindFields);

function fillImportChoices() {
  $('obsImportKind').replaceChildren(
    option(CHOOSE, t('obs.import.chooseKind')),
    ...['time-series', 'spectrum', 'table'].map(k =>
      option(k, t(`obs.kind.${k}`))
    )
  );
  $('obsTimeFormat').replaceChildren(
    option(CHOOSE, t('obs.import.choose')),
    ...Object.keys(TIME_FORMATS).map(f => option(f, t(`obs.timeFormat.${f}`)))
  );
  $('obsTimeScale').replaceChildren(
    option(CHOOSE, t('obs.import.choose')),
    ...TIME_SCALES.map(s =>
      option(s, s === 'unknown' ? t('obs.scale.unknown') : s)
    )
  );
  $('obsMedium').replaceChildren(
    option(CHOOSE, t('obs.import.choose')),
    ...['vacuum', 'air', 'unknown'].map(m => option(m, t(`obs.medium.${m}`)))
  );
}

$('obsImportGo').addEventListener('click', () => {
  const tbl = state.table;
  if (!tbl) return;
  const pick = v => (v === CHOOSE ? undefined : v);
  const mapping = {
    kind: pick($('obsImportKind').value),
    title: $('obsImportTitleIn').value.trim(),
    columns: tbl.columns.map((_, i) => {
      const use = $(`obsUse${i}`).value;
      const u = $(`obsUnit${i}`).value;
      return {
        use,
        unit: u === CHOOSE ? undefined : u === NOT_STATED ? null : u,
        of: Number($(`obsOf${i}`).value),
      };
    }),
    time: {
      format: pick($('obsTimeFormat').value),
      scale: pick($('obsTimeScale').value),
    },
    spectral: {
      medium: pick($('obsMedium').value),
      frame: $('obsFrame').value,
    },
  };
  const r = build(tbl, mapping);
  if (!r.ok) {
    showProblems(r.problems);
    status(t('obs.import.notYet', { n: r.problems.length }));
    return;
  }
  $('obsImport').hidden = true;
  open(r.observation);
});
$('obsImportCancel').addEventListener('click', () => {
  $('obsImport').hidden = true;
  state.table = null;
  $('obsFile').value = '';
});

// --- Exports -----------------------------------------------------------------------

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('obsExportJson').addEventListener('click', () =>
  download(
    exportName(state.view, 'json'),
    observationJson(state.view, {
      source: state.source,
      changes: state.history.changes(),
    }),
    'application/json'
  )
);
$('obsExportCsv').addEventListener('click', () =>
  download(
    exportName(state.view, 'csv'),
    observationCsv(state.view),
    'text/csv'
  )
);

// --- Language ----------------------------------------------------------------------

function renderLanguages() {
  const box = $('langSwitch');
  box.replaceChildren(
    ...LANGUAGES.map(l => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ui-button ow-small';
      b.lang = l.id;
      b.textContent = l.endonym;
      b.setAttribute('aria-pressed', String(language() === l.id));
      b.addEventListener('click', () => {
        setLanguage(l.id);
        translateAll();
      });
      return b;
    })
  );
}

function translateAll() {
  translatePage();
  renderLanguages();
  fillFixtures();
  fillImportChoices();
  if (state.table) {
    renderPreview(state.table);
    renderMapping(state.table);
  }
  // Built in the old language; built again in the new one, and a fit still
  // running in the old one is canceled rather than left writing to nothing.
  if (fit.module) mountFit(fit.module);
  archive?.then(p => p.rebuild());
  if (state.view) renderAll();
}

setLanguage(preferred());
translateAll();
document.documentElement.dataset.ready = 'true';
// Opened from the catalog with ?installed=<package id>: js/catalog/installed.js
// opens the pack, so a visitor who installs nothing never loads it.
const installedId = new URLSearchParams(location.search).get('installed');
if (installedId)
  import('./catalog/installed.js').then(m =>
    m.openInstalled(
      installedId,
      { open, status, t, registerMessages },
      lightCurveObservation
    )
  );
