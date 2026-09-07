// =============================================================================
// The evidence notebook's panel
// -----------------------------------------------------------------------------
// All the DOM built here rather than in index.html, for the same reason as the
// bench's: the panel is a list of a variable number of entries, each of which
// is five editable fields and a table, and writing that as hidden markup would
// give every locale a template to translate and nobody a file they can read.
//
// The interface has one rule it enforces everywhere: the numbers are not
// editable and the words are. A student can rewrite their claim as often as
// they like, reorder the entries until the argument reads properly, and delete
// an entry outright - but there is no control anywhere on this panel that
// changes a recorded value, because the entry's snapshot is frozen and the
// only writing path, annotate(), returns a new entry around the same frozen
// object.
//
// Reorder is buttons, not drag. A drag handle is unusable from a keyboard
// without building a whole parallel interaction, and "move up" is what a
// student actually wants: they are placing one reading relative to its
// neighbour, not sorting a table.
// =============================================================================

import { t, onLocaleChange } from './i18n/index.js';
import { formatNumber } from './format.js';
import {
  noteObservationPanelUsed,
  requestObservationLayout,
} from './observationLayout.js';
import { KIND, annotate } from './notebook/entry.js';
import {
  addEntry,
  backupFilename,
  buildBackup,
  moveEntry,
  removeEntry,
  replaceEntry,
  restoreBackup,
  validateBackup,
  MAX_BACKUP_BYTES,
} from './notebook/notebook.js';
import * as store from './notebook/store.js';
import { buildEvidenceReport, reportFilename } from './notebook/report.js';
import { downloadPdf } from './labReport.js';

const PANEL_ID = 'evidenceNotebook';

let root = null;
/** The notebook in memory. The stored copy is written from this. */
let entries = [];
/** An entry captured but not yet committed, awaiting the student's words. */
let draft = null;
/** The last write's outcome, so the panel can keep saying it. */
let lastSave = { ok: true, reason: store.FAILURE.OK };
/** Where the build id comes from; injected so this module needs no DOM read. */
let revisionOf = () => 'dev';

const esc = text =>
  String(text ?? '').replace(
    /[&<>"']/g,
    c =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[c]
  );

const $ = id => root?.querySelector(`#${id}`);

/** @param {Function} fn - Returns the build identifier for the report */
export function setRevisionSource(fn) {
  if (typeof fn === 'function') revisionOf = fn;
}

/** The entries, for tests and for the report. @returns {Array<object>} */
export const notebookEntries = () => entries;

/** The last write's outcome. @returns {object} */
export const lastSaveResult = () => lastSave;

// --- Persistence ---------------------------------------------------------------

/**
 * Write the notebook and remember what happened.
 *
 * Never throws and never silently succeeds: the status line reads from
 * `lastSave` on every render, so a refusal stays on screen until a later write
 * works rather than flashing once and leaving the student thinking their
 * evidence is safe.
 */
function persist() {
  lastSave = store.save(entries);
  return lastSave;
}

/** Read the stored notebook into memory. Called once, when the panel loads. */
export function loadNotebook() {
  const result = store.load();
  entries = result.ok ? result.entries : [];
  if (!result.ok) lastSave = { ok: false, reason: result.reason };
  return entries;
}

// --- Rendering -----------------------------------------------------------------

const kindText = kind =>
  kind === KIND.TRUTH
    ? t('nb.kind.truth')
    : kind === KIND.ANALYTIC
      ? t('nb.kind.analytic')
      : t('nb.kind.measured');

const valueText = (value, unit) => {
  if (value === null || value === undefined) return t('nb.report.noValue');
  const digits = formatNumber(value, { sig: 6 });
  return unit ? `${digits} ${unit}` : digits;
};

/** The save/quota line. Visible always, not only on failure. */
function statusHtml() {
  const usage = store.report(entries);
  const pct = Math.round(usage.fraction * 100);
  if (!lastSave.ok) {
    return `<span class="nb-status is-bad" role="status">${esc(
      t(`nb.save.${lastSave.reason}`, {
        bytes: Math.round((lastSave.bytes || 0) / 1024),
        limit: Math.round((lastSave.limit || 0) / 1024),
      })
    )}</span>`;
  }
  return `<span class="nb-status" role="status">${esc(
    t('nb.save.ok', { n: usage.count, max: usage.max, pct })
  )}</span>`;
}

/** One recorded number. */
function quantityRow(q) {
  return `<tr>
      <th scope="row">${esc(q.label)}</th>
      <td class="nb-value">${esc(
        q.uncertainty
          ? `${valueText(q.value, '')} ± ${valueText(q.uncertainty, q.unit)}`
          : valueText(q.value, q.unit)
      )}</td>
      <td><span class="nb-kind is-${esc(q.kind)}">${esc(kindText(q.kind))}</span></td>
      <td class="nb-qnote">${esc(q.note || '')}</td>
    </tr>`;
}

/**
 * The conditions block.
 *
 * Inside a <details> because it is long and a student reading their own
 * notebook already knows; open in the report, where the reader does not.
 */
function provenanceHtml(p) {
  const missing = t('nb.report.notRecorded');
  const or = v => (v === null || v === undefined || v === '' ? missing : v);
  const rows = [
    [t('nb.prov.scenario'), or(p.scenario)],
    [t('nb.prov.target'), or(p.target)],
    [
      t('nb.prov.simTime'),
      p.simTimeDays === null
        ? missing
        : t('nb.prov.days', { d: formatNumber(p.simTimeDays, { sig: 5 }) }),
    ],
    [t('nb.prov.seed'), or(p.seed)],
    [t('nb.prov.world'), or(p.worldGeneration)],
    [t('nb.prov.revision'), or(p.revision)],
    [
      t('nb.prov.numerical'),
      [
        p.numerical?.integrator || missing,
        p.numerical?.maxTimestep != null
          ? t('nb.prov.step', {
              v: formatNumber(p.numerical.maxTimestep, { sig: 4 }),
            })
          : null,
        p.numerical?.simSpeed != null
          ? t('nb.prov.speed', {
              v: formatNumber(p.numerical.simSpeed, { sig: 4 }),
            })
          : null,
      ]
        .filter(Boolean)
        .join(', '),
    ],
  ];
  if (p.observer) {
    rows.push([
      t('nb.prov.geometry'),
      t('nb.prov.geometryValue', {
        pa: formatNumber(p.observer.positionAngleDeg, { sig: 4 }),
        inc: formatNumber(p.observer.inclinationDeg, { sig: 4 }),
      }),
    ]);
  }
  if (p.quality) {
    rows.push([
      t('nb.prov.quality'),
      t('nb.prov.qualityValue', {
        tier: p.quality.tier ?? '?',
        fps: formatNumber(p.quality.fps, { sig: 3 }),
      }),
    ]);
  }
  if (p.units) {
    rows.push([
      t('nb.prov.units'),
      Object.entries(p.units)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', '),
    ]);
  }
  if (p.flags?.length) {
    rows.push([
      t('nb.prov.flags'),
      p.flags
        .map(f => {
          const text = t(`nb.flag.${f}`);
          return text === `nb.flag.${f}` ? f : text;
        })
        .join('; '),
    ]);
  }
  return `<dl class="nb-prov">${rows
    .map(
      ([label, value]) => `<dt>${esc(label)}</dt><dd>${esc(String(value))}</dd>`
    )
    .join('')}</dl>`;
}

/** The three prose fields, as labelled textareas. */
function proseHtml(entry) {
  return ['claim', 'evidence', 'limitations']
    .map(field => {
      const id = `nbField-${entry.id}-${field}`;
      return `<p class="nb-field">
          <label for="${esc(id)}">${esc(t(`nb.field.${field}`))}</label>
          <textarea id="${esc(id)}" class="nb-textarea"
                    data-entry="${esc(entry.id)}" data-field="${field}"
                    rows="${field === 'claim' ? 2 : 3}"
                    placeholder="${esc(t(`nb.placeholder.${field}`))}"
                    >${esc(entry.prose[field])}</textarea>
        </p>`;
    })
    .join('');
}

/** One entry. */
function entryHtml(entry, index, total) {
  const snap = entry.snapshot;
  const source = t(`nb.source.${entry.source}`);
  return `<li class="nb-entry" data-entry="${esc(entry.id)}">
      <div class="nb-entry-head">
        <span class="nb-index" aria-hidden="true">${index + 1}</span>
        <span class="nb-entry-titles">
          <label class="visually-hidden" for="nbTitle-${esc(entry.id)}">${esc(
            t('nb.field.title')
          )}</label>
          <input id="nbTitle-${esc(entry.id)}" class="nb-title"
                 data-entry="${esc(entry.id)}" data-field="title"
                 value="${esc(entry.title)}" />
          <span class="nb-entry-meta">${esc(
            source === `nb.source.${entry.source}` ? entry.source : source
          )} · ${esc(
            new Date(snap.capturedAt)
              .toISOString()
              .slice(0, 16)
              .replace('T', ' ')
          )} · ${esc(t('nb.entry.checksum', { code: entry.fingerprint }))}</span>
        </span>
        <span class="nb-entry-actions">
          <button type="button" class="obs-panel-btn" data-move="-1"
                  data-entry="${esc(entry.id)}" ${index === 0 ? 'disabled' : ''}
                  aria-label="${esc(t('nb.action.up', { title: entry.title }))}"
                  >↑</button>
          <button type="button" class="obs-panel-btn" data-move="1"
                  data-entry="${esc(entry.id)}"
                  ${index === total - 1 ? 'disabled' : ''}
                  aria-label="${esc(t('nb.action.down', { title: entry.title }))}"
                  >↓</button>
          <button type="button" class="obs-panel-btn" data-delete="${esc(entry.id)}"
                  aria-label="${esc(t('nb.action.delete', { title: entry.title }))}"
                  >✕</button>
        </span>
      </div>
      ${
        entry.tampered
          ? `<p class="nb-tampered">${esc(t('nb.entry.tampered'))}</p>`
          : ''
      }
      ${
        snap.quantities.length
          ? `<table class="nb-table">
               <caption>${esc(t('nb.entry.results'))}</caption>
               <thead><tr>
                 <th scope="col">${esc(t('nb.report.colQuantity'))}</th>
                 <th scope="col">${esc(t('nb.report.colValue'))}</th>
                 <th scope="col">${esc(t('nb.report.colKind'))}</th>
                 <th scope="col">${esc(t('nb.report.colNote'))}</th>
               </tr></thead>
               <tbody>${snap.quantities.map(quantityRow).join('')}</tbody>
             </table>`
          : ''
      }
      ${
        snap.figure
          ? `<p class="nb-figure-note">${esc(
              t('nb.entry.figure', {
                title: snap.figure.title,
                n: snap.figure.series.length,
              })
            )}</p>`
          : ''
      }
      ${proseHtml(entry)}
      <details class="nb-details">
        <summary>${esc(t('nb.entry.conditions'))}</summary>
        ${provenanceHtml(snap.provenance)}
      </details>
    </li>`;
}

/** The capture form, shown only while an entry is waiting to be committed. */
function draftHtml() {
  if (!draft) return '';
  return `<div class="nb-draft" role="group" aria-labelledby="nbDraftHeading">
      <h4 id="nbDraftHeading">${esc(t('nb.draft.heading'))}</h4>
      <p class="nb-draft-what">${esc(draft.title)}</p>
      <p class="nb-draft-hint">${esc(t('nb.draft.hint'))}</p>
      <p class="nb-field">
        <label for="nbDraftClaim">${esc(t('nb.field.claim'))}</label>
        <textarea id="nbDraftClaim" class="nb-textarea" rows="2"
                  placeholder="${esc(t('nb.placeholder.claim'))}"
                  >${esc(draft.prose.claim)}</textarea>
      </p>
      <p class="nb-field">
        <label for="nbDraftEvidence">${esc(t('nb.field.evidence'))}</label>
        <textarea id="nbDraftEvidence" class="nb-textarea" rows="3"
                  >${esc(draft.prose.evidence)}</textarea>
      </p>
      <p class="nb-field">
        <label for="nbDraftLimits">${esc(t('nb.field.limitations'))}</label>
        <textarea id="nbDraftLimits" class="nb-textarea" rows="3"
                  >${esc(draft.prose.limitations)}</textarea>
      </p>
      <div class="nb-draft-actions">
        <button id="nbDraftSave" class="ui-button">${esc(t('nb.draft.save'))}</button>
        <button id="nbDraftDiscard" class="ui-button">${esc(t('nb.draft.discard'))}</button>
      </div>
    </div>`;
}

/** Repaint the whole panel. */
export function render() {
  if (!root) return;
  const body = $('nbBody');
  if (!body) return;
  $('nbStatusWrap').innerHTML = statusHtml();
  $('nbReport').disabled = entries.length === 0;
  $('nbDownload').disabled = entries.length === 0;

  body.innerHTML = `${draftHtml()}${
    entries.length
      ? `<ol class="nb-list">${entries
          .map((e, i) => entryHtml(e, i, entries.length))
          .join('')}</ol>`
      : `<p class="nb-empty">${esc(t('nb.empty'))}</p>`
  }`;
}

// --- Building ------------------------------------------------------------------

/**
 * Create the panel, once.
 * @returns {HTMLElement} The panel root
 */
export function ensurePanel() {
  if (root) return root;
  root = document.createElement('div');
  root.id = PANEL_ID;
  root.className = 'obs-panel notebook-panel';
  root.style.display = 'none';
  root.setAttribute('role', 'region');
  root.setAttribute('aria-label', t('nb.title'));
  root.innerHTML = `
    <div class="obs-panel-toolbar">
      <div class="obs-panel-meta">
        <span class="obs-panel-title">${esc(t('nb.title'))}</span>
        <span id="nbStatusWrap"></span>
      </div>
      <div class="obs-panel-actions">
        <button id="nbReport" class="obs-panel-btn"
                title="${esc(t('nb.action.report.hint'))}">${esc(t('nb.action.report'))}</button>
        <button id="nbDownload" class="obs-panel-btn"
                title="${esc(t('nb.action.download.hint'))}">${esc(t('nb.action.download'))}</button>
        <button id="nbRestore" class="obs-panel-btn"
                title="${esc(t('nb.action.restore.hint'))}">${esc(t('nb.action.restore'))}</button>
        <button id="nbClose" class="obs-panel-btn"
                title="${esc(t('nb.action.close'))}"
                aria-label="${esc(t('nb.action.close'))}">✕</button>
      </div>
    </div>
    <p class="nb-intro">${esc(t('nb.intro'))}</p>
    <div id="nbBody" class="nb-body"></div>
    <input id="nbRestoreFile" type="file" accept="application/json,.json" hidden />
  `;
  document.body.appendChild(root);
  wire();
  loadNotebook();
  render();
  subscribeToLocaleOnce();
  return root;
}

let localeSubscribed = false;
/**
 * Repaint on a language change - once.
 *
 * Subscribing inside ensurePanel() would add a listener every time the panel
 * was rebuilt, and a handler that rebuilds the panel while the listener set is
 * being iterated is how the bench locked up a tab. One subscription, and it
 * repaints rather than rebuilds.
 */
function subscribeToLocaleOnce() {
  if (localeSubscribed) return;
  localeSubscribed = true;
  onLocaleChange(() => {
    if (!root) return;
    root.setAttribute('aria-label', t('nb.title'));
    // The toolbar's labels are in the shell rather than the body, so they are
    // rewritten here; everything else comes back from render().
    const rebuild = root.querySelector('.obs-panel-title');
    if (rebuild) rebuild.textContent = t('nb.title');
    const intro = root.querySelector('.nb-intro');
    if (intro) intro.textContent = t('nb.intro');
    for (const [id, key] of [
      ['nbReport', 'nb.action.report'],
      ['nbDownload', 'nb.action.download'],
      ['nbRestore', 'nb.action.restore'],
    ]) {
      const btn = $(id);
      if (btn) btn.textContent = t(key);
    }
    render();
  });
}

/** Wire the panel's controls. Once, when it is built. */
function wire() {
  $('nbClose')?.addEventListener('click', () => setNotebookEnabled(false));

  // Prose edits: on change rather than on every keystroke, so a save failure
  // is reported once per edit and not once per character.
  root.addEventListener('change', event => {
    const el = event.target;
    if (!el.dataset?.entry || !el.dataset?.field) return;
    const found = entries.find(e => e.id === el.dataset.entry);
    if (!found) return;
    entries = replaceEntry(
      entries,
      annotate(found, { [el.dataset.field]: el.value })
    );
    persist();
    $('nbStatusWrap').innerHTML = statusHtml();
  });

  root.addEventListener('click', event => {
    const move = event.target.closest?.('[data-move]');
    if (move) {
      const id = move.dataset.entry;
      entries = moveEntry(entries, id, Number(move.dataset.move));
      persist();
      render();
      // Follow the entry, not the button: the button that was pressed now
      // belongs to a different entry, and leaving focus on it would move the
      // wrong one on the next press.
      const again = root.querySelector(
        `[data-entry="${id}"][data-move="${move.dataset.move}"]`
      );
      (again && !again.disabled
        ? again
        : root.querySelector(`.nb-entry[data-entry="${id}"] .nb-title`)
      )?.focus();
      return;
    }

    const del = event.target.closest?.('[data-delete]');
    if (del) {
      const found = entries.find(e => e.id === del.dataset.delete);
      if (!found) return;
      // Deleting evidence is not undoable and the file is the only backup, so
      // it is confirmed. Nothing else on this panel asks.
      if (!window.confirm(t('nb.confirm.delete', { title: found.title }))) {
        return;
      }
      entries = removeEntry(entries, found.id);
      persist();
      render();
      ($('nbBody').querySelector('.nb-title') || $('nbReport'))?.focus();
      return;
    }

    if (event.target.id === 'nbDraftSave') commitDraft();
    if (event.target.id === 'nbDraftDiscard') {
      draft = null;
      render();
    }
    if (event.target.id === 'nbDownload') downloadNotebook();
    if (event.target.id === 'nbReport') downloadReport();
    if (event.target.id === 'nbRestore') $('nbRestoreFile')?.click();
  });

  $('nbRestoreFile')?.addEventListener('change', async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) await restoreFrom(file);
  });
}

// --- Capture -------------------------------------------------------------------

/**
 * Offer a captured entry for the student to write about.
 *
 * The entry is already built and its snapshot already frozen: what is pending
 * is the prose, not the evidence. So a student who captures a reading and then
 * changes the world before writing their claim still saves the reading they
 * took, which is the whole point of freezing at capture rather than at commit.
 *
 * @param {object} entry - From the capture helpers
 * @returns {void}
 */
export function offerDraft(entry) {
  if (!entry) return;
  draft = entry;
  ensurePanel();
  setNotebookEnabled(true);
  render();
  $('nbDraftClaim')?.focus();
}

/** Commit the draft with whatever has been typed. */
function commitDraft() {
  if (!draft) return;
  const written = annotate(draft, {
    claim: $('nbDraftClaim')?.value ?? '',
    evidence: $('nbDraftEvidence')?.value ?? '',
    limitations: $('nbDraftLimits')?.value ?? '',
  });
  entries = addEntry(entries, written);
  const result = persist();
  if (!result.ok) {
    // Kept in memory and kept on screen. Dropping it because the browser will
    // not store it would lose a reading the student has just taken, and the
    // status line says to download the notebook instead.
    render();
    return;
  }
  draft = null;
  render();
  root.querySelector('.nb-entry:last-child .nb-title')?.focus();
}

/** @returns {?object} The pending draft, for tests */
export const pendingDraft = () => draft;

// --- Files ---------------------------------------------------------------------

function saveText(text, filename) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/** Download the notebook as a file. */
export function downloadNotebook() {
  const payload = buildBackup({ entries, revision: revisionOf() });
  saveText(JSON.stringify(payload, null, 2), backupFilename());
}

/** Download the report. */
export function downloadReport() {
  const bytes = buildEvidenceReport({ entries, revision: revisionOf() });
  downloadPdf(bytes, reportFilename());
}

/**
 * Restore from a file, replacing entries with the same id.
 *
 * Replacing rather than merging by content: an entry's id is stable, so
 * restoring a file onto a notebook that already holds some of it is a repair
 * and not a duplication. Anything whose checksum no longer matches its own
 * snapshot is kept and marked rather than dropped - a student whose file was
 * mangled needs to see which entry it was.
 *
 * @param {File} file - The chosen file
 * @returns {Promise<{ok: boolean, reason: string}>} Outcome
 */
export async function restoreFrom(file) {
  if (file.size > MAX_BACKUP_BYTES) {
    lastSave = { ok: false, reason: 'tooLarge' };
    render();
    return { ok: false, reason: 'tooLarge' };
  }
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    lastSave = { ok: false, reason: 'notJson' };
    render();
    return { ok: false, reason: 'notJson' };
  }
  const verdict = validateBackup(data);
  if (!verdict.ok) {
    lastSave = { ok: false, reason: verdict.reason };
    render();
    return verdict;
  }
  const { entries: restored, tampered } = restoreBackup(data);
  const byId = new Map(entries.map(e => [e.id, e]));
  for (const e of restored) byId.set(e.id, e);
  entries = [...byId.values()];
  const result = persist();
  if (result.ok) {
    lastSave = {
      ok: true,
      reason: store.FAILURE.OK,
      restored: restored.length,
      tampered,
    };
  }
  render();
  return { ok: true, reason: '', restored: restored.length, tampered };
}

// --- Open and close -------------------------------------------------------------

let enabled = false;

/**
 * Open or close the panel.
 * @param {boolean} on - Whether to show it
 * @returns {void}
 */
export function setNotebookEnabled(on) {
  ensurePanel();
  enabled = Boolean(on);
  root.style.display = enabled ? '' : 'none';
  if (enabled) {
    noteObservationPanelUsed(PANEL_ID);
    render();
  }
  requestObservationLayout();
}

/** @returns {boolean} Whether the panel is open */
export const isNotebookEnabled = () => enabled;

/** Forget everything, for tests. */
export function resetPanel() {
  root?.remove();
  root = null;
  entries = [];
  draft = null;
  enabled = false;
  lastSave = { ok: true, reason: store.FAILURE.OK };
}
