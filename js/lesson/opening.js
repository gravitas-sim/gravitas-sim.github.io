// =============================================================================
// How a lesson ends: the student's own answers and readings (the pure half)
// -----------------------------------------------------------------------------
// A lesson that states its `question` returns to it at the finish with what the
// student entered, in lesson order (js/investigations/ending.js draws it). The
// opening and medium rule it goes with, and the check of it, are in
// tools/authoring/openingRule.mjs, which the app never loads;
// docs/lesson-opening-and-ending.md is the rule as tried.
// =============================================================================

/** Text without markup, entities or glossary marks, spaces collapsed. */
export const plain = html =>
  String(html ?? '')
    .replace(/\[\[[^|\]]*\|([^\]]*)\]\]/g, '$1')
    .replace(/\[\[([^\]]*)\]\]/g, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/&rsquo;|&lsquo;/g, '’')
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&hellip;/g, '…')
    .replace(/&nbsp;/g, ' ')
    .replace(/&plusmn;/g, '±')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

const clip = (text, max = 240) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

const source = raw => {
  try {
    const how = JSON.parse(raw);
    return how && typeof how === 'object' ? how : null;
  } catch {
    return null;
  }
};

/**
 * The student's own answers and readings, in lesson order: what the ending
 * shows. Only what the student entered (an option they chose, a number or
 * words they gave, a reading they took) and never a key, a `want` or whether
 * it was right: an answer held by a prediction stays held (D-R10-280-03),
 * and a multiple-choice check is a check, not evidence, so it is left to the
 * report.
 * @param {Array<object>} steps - The steps the student was shown, in order
 * @param {object} responses - The saved answers
 * @param {(step: object) => string} keyOf - A step's response key
 * @returns {Array<{sid: string, title: string, kind: string, text: string, unit?: string, how?: ?object}>}
 */
export function endingRows(steps, responses, keyOf) {
  const rows = [];
  const r = responses || {};
  const said = v => (v === undefined || v === null ? '' : String(v).trim());
  for (const s of steps || []) {
    const key = keyOf(s);
    const title = plain(s.title);
    const base = { sid: s.sid, title };
    if (s.type === 'predict' && s.kind === 'estimate') {
      const raw = said(r[key]);
      if (!raw) continue;
      const parts = raw.split(';').map(p => p.trim());
      rows.push({
        ...base,
        kind: 'estimate',
        text: parts.length === 2 ? parts.join('–') : parts[0],
        unit: s.unit,
      });
    } else if (s.type === 'predict') {
      const at = r[key];
      if (typeof at !== 'number' || !s.options?.[at]) continue;
      rows.push({ ...base, kind: 'prediction', text: plain(s.options[at]) });
    } else if (s.type === 'question' && s.kind === 'numeric') {
      const v = said(r[key]);
      if (v) rows.push({ ...base, kind: 'number', text: v, unit: s.unit });
    } else if (s.type === 'question' && s.kind === 'short') {
      const v = said(r[key]);
      if (v) rows.push({ ...base, kind: 'words', text: clip(v) });
    } else if (s.type === 'measure') {
      for (const f of s.fields || []) {
        const v = said(r[`${key}:${f.id}`]);
        if (!v) continue;
        rows.push({
          ...base,
          kind: 'reading',
          label: plain(f.label),
          text: v,
          unit: f.unit,
          how: source(r[`${key}:${f.id}:src`]),
        });
      }
    }
  }
  return rows;
}
