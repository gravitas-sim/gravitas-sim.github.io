// =============================================================================
// The classroom evidence kit, as a page
// -----------------------------------------------------------------------------
// Progressive enhancement over evaluation/index.html, which is a complete set
// of printable paper forms on its own. Nothing here is required to read, print
// or administer any instrument; what it adds is filling them in on screen,
// exporting de-identified CSV and JSON, and suggesting a participant code.
//
// The tools panel starts `hidden` in the markup and is revealed here, so a
// reader with JavaScript blocked sees the forms and not a row of dead buttons.
//
// There is no network code in this file and there is not going to be any.
// tests/evaluationKit.test.js greps the built bundle for fetch, XMLHttpRequest,
// sendBeacon and WebSocket, because an assurance that responses are never
// transmitted is worth exactly as much as the check behind it.
// =============================================================================

import {
  AGREE_SCALE,
  CONCEPT_COLUMNS,
  CONCEPT_ITEMS,
  EVALUATION_KIND,
  EVALUATION_SCHEMA,
  FIDELITY_ITEMS,
  USABILITY_ITEMS,
} from './data/evaluation.js';

const STORE_KEY = 'gravitas_evaluation_draft_v1';
const $ = id => document.getElementById(id);

/** Words a code is built from. Nothing here derives from a person. */
const WORDS = [
  'amber',
  'brisk',
  'calm',
  'dusk',
  'ember',
  'fleet',
  'given',
  'humble',
  'inner',
  'jade',
  'keen',
  'linen',
  'mellow',
  'noble',
  'opal',
  'plain',
  'quiet',
  'rust',
  'slate',
  'tidal',
  'umber',
  'vivid',
  'warm',
  'zephyr',
  'comet',
  'nebula',
  'pulsar',
  'quasar',
  'ridge',
  'saturn',
  'tundra',
  'vector',
];

/**
 * A code the student writes down and keeps.
 *
 * Drawn from a word list and a number, not from anything about the person.
 * Recipes built from initials and birth dates are common and are
 * quasi-identifiers: in a class of twenty they often run backwards to a name,
 * which defeats the purpose of having a code.
 *
 * @returns {string} Something like "brisk-comet-41"
 */
function suggestCode() {
  const pick = () => WORDS[Math.floor(Math.random() * WORDS.length)];
  let a = pick();
  let b = pick();
  while (b === a) b = pick();
  return `${a}-${b}-${10 + Math.floor(Math.random() * 90)}`;
}

const readDraft = () => {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
  } catch {
    return {};
  }
};
const writeDraft = draft => {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(draft));
  } catch {
    /* a browser with storage disabled still gets working forms and export */
  }
};

const say = text => {
  const el = $('ekSaid');
  if (el) el.textContent = text;
};

/** Build one radio group and attach it under a static item. */
function radios(name, labels, draft, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'ek-answer ek-noprint';
  labels.forEach((label, index) => {
    const id = `${name}-${index}`;
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.id = id;
    input.value = String(index);
    if (String(draft[name] ?? '') === String(index)) input.checked = true;
    input.addEventListener('change', () => onChange(name, String(index)));
    const lab = document.createElement('label');
    lab.htmlFor = id;
    lab.textContent = ` ${label} `;
    wrap.append(input, lab);
  });
  return wrap;
}

/** Build one free-text field and attach it under a static item. */
function textField(name, draft, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'ek-answer ek-noprint';
  const input = document.createElement('textarea');
  input.id = `ek-${name}`;
  input.rows = 2;
  input.className = 'ek-text';
  input.value = draft[name] ?? '';
  input.setAttribute('aria-label', name);
  input.addEventListener('input', () => onChange(name, input.value));
  wrap.append(input);
  return wrap;
}

/** Enhance the printed forms with controls. */
function enhance() {
  const draft = readDraft();
  const onChange = (key, value) => {
    draft[key] = value;
    writeDraft(draft);
  };

  // Concept items: the static markup gives each an id, so the control lands
  // under the question it belongs to rather than in a parallel form.
  for (const item of CONCEPT_ITEMS) {
    const host = document.getElementById(item.id);
    if (!host) continue;
    host.append(
      radios(
        item.id,
        item.options.map((_, i) => String.fromCharCode(97 + i)),
        draft,
        onChange
      )
    );
  }

  // Fidelity and usability are appended to their lists in order, because their
  // items carry no per-item id in the printed form.
  const lists = document.querySelectorAll('ol.ek-list');
  const fidelityList = lists[0];
  const usabilityList = lists[lists.length - 1];
  if (fidelityList) {
    [...fidelityList.children].forEach((li, i) => {
      const item = FIDELITY_ITEMS[i];
      if (!item) return;
      li.append(
        item.kind === 'choice'
          ? radios(item.id, item.options, draft, onChange)
          : textField(item.id, draft, onChange)
      );
    });
  }
  if (usabilityList && usabilityList !== fidelityList) {
    [...usabilityList.children].forEach((li, i) => {
      const item = USABILITY_ITEMS[i];
      if (!item) return;
      li.append(
        item.kind === 'agree'
          ? radios(
              item.id,
              AGREE_SCALE.map((s, k) => `${k + 1}`),
              draft,
              onChange
            )
          : textField(item.id, draft, onChange)
      );
    });
  }
  return draft;
}

const csvCell = v => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** One concept row, in CONCEPT_COLUMNS order. */
function conceptRow(draft) {
  const occasion = $('ekOccasion')?.value || 'pre';
  const participant = ($('ekParticipant')?.value || '').trim();
  return CONCEPT_COLUMNS.map(col => {
    if (col === 'schema') return EVALUATION_SCHEMA;
    if (col === 'instrument') return 'concept';
    if (col === 'occasion') return occasion;
    if (col === 'participant') return participant;
    return draft[col] ?? '';
  });
}

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  say(`Saved ${name} to your downloads. Nothing was sent anywhere.`);
}

const stamp = () => new Date().toISOString().slice(0, 10);

function wire(draft) {
  const tools = $('ekTools');
  if (tools) tools.hidden = false;

  $('ekSuggest')?.addEventListener('click', () => {
    const code = suggestCode();
    const field = $('ekParticipant');
    if (field) field.value = code;
    const shown = $('ekCode');
    if (shown) shown.textContent = code;
    say('Write this on a slip the student keeps. Nobody here records it.');
  });

  $('ekCsv')?.addEventListener('click', () => {
    const header = CONCEPT_COLUMNS.join(',');
    const row = conceptRow(draft).map(csvCell).join(',');
    download(
      `gravitas-evaluation-${$('ekOccasion')?.value || 'pre'}-${stamp()}.csv`,
      `${header}\n${row}\n`,
      'text/csv'
    );
  });

  $('ekJson')?.addEventListener('click', () => {
    const occasion = $('ekOccasion')?.value || 'pre';
    const participant = ($('ekParticipant')?.value || '').trim();
    const pick = items =>
      Object.fromEntries(
        items
          .filter(i => draft[i.id] !== undefined)
          .map(i => [i.id, draft[i.id]])
      );
    const doc = {
      kind: EVALUATION_KIND,
      schema: EVALUATION_SCHEMA,
      exported: stamp(),
      records: [
        {
          schema: EVALUATION_SCHEMA,
          instrument: 'concept',
          occasion,
          participant,
          ...pick(CONCEPT_ITEMS),
        },
        {
          schema: EVALUATION_SCHEMA,
          instrument: 'fidelity',
          occasion,
          participant: '',
          ...pick(FIDELITY_ITEMS),
        },
        {
          schema: EVALUATION_SCHEMA,
          instrument: 'usability',
          occasion,
          participant,
          ...pick(USABILITY_ITEMS),
        },
      ],
    };
    download(
      `gravitas-evaluation-${occasion}-${stamp()}.json`,
      JSON.stringify(doc, null, 2),
      'application/json'
    );
  });

  $('ekTemplate')?.addEventListener('click', () => {
    download(
      `gravitas-evaluation-template-v${EVALUATION_SCHEMA}.csv`,
      `${CONCEPT_COLUMNS.join(',')}\n`,
      'text/csv'
    );
  });

  $('ekClear')?.addEventListener('click', () => {
    try {
      localStorage.removeItem(STORE_KEY);
    } catch {
      /* nothing stored, nothing to remove */
    }
    for (const input of document.querySelectorAll(
      '.ek-answer input, .ek-answer textarea'
    )) {
      if (input.type === 'radio') input.checked = false;
      else input.value = '';
    }
    for (const key of Object.keys(draft)) delete draft[key];
    say('Cleared from this browser.');
  });

  const columns = $('ekColumns');
  if (columns) columns.textContent = CONCEPT_COLUMNS.join(', ');
}

function start() {
  wire(enhance());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
