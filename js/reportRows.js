// =============================================================================
// The evidence rows of a lab report
// -----------------------------------------------------------------------------
// What a student gathered, written once: each reading with how it was taken,
// each prediction beside what the student found, the answers that belong to an
// earlier version of a step, and the table of a controlled run. Pure, and it
// imports nothing, so the one lazy report chunk holds it and no lesson route
// pays a request for it.
//
// Three outputs read this model and nothing else: the PDF and the accessible
// web page (js/labReport.js builds both, through the document builder it is
// given) and the submission token, which carries the record these rows are made
// from (responses, steps seen, attempts) and so yields the same rows when read
// back (tests/reportRows.test.js renders one fixture all three ways and
// compares the text). A row is data; `*Lines` and `*Cells` turn it into text.
//
// Held answers: a prediction appears only once the step that settles it has
// been reached, as the student's own choice and a class (matched, differed,
// inside, outside). The authored key and the option it names are never here.
// =============================================================================

const parsed = raw => {
  try {
    const v = JSON.parse(raw);
    return v && typeof v === 'object' ? v : null;
  } catch {
    return null;
  }
};

/** Significant figures in a number as it was printed: its digits, without leading zeros or an exponent. */
export const figuresOf = text =>
  String(text ?? '')
    .trim()
    .replace(/^[+\-−]/, '')
    .split(/[eE×]/)[0]
    .replace(/[^0-9]/g, '')
    .replace(/^0+/, '').length;

/** The key a step's answer sits under, and what hangs off it. */
const sub = (keyOf, sid, name) => `${keyOf(sid)}:${name}`;

// --- Readings -------------------------------------------------------------------

/**
 * The readings that carry a record of how they were taken (a field's `:src`, written when a reading was taken from an
 * instrument or a scene object, over an interval, or typed over one that was). A field typed from the start has no
 * record and is not listed: the step's own rows already print it.
 * @param {object[]} steps - The steps the report covers, in order
 * @param {object} responses - The progress record
 * @param {(sid: string) => string} keyOf - A step's response key
 * @returns {object[]} Rows: {kind: 'reading', n, title, label, value, unit, how, from, body, time, figures, span}
 */
export const readingRows = (steps, responses, keyOf) =>
  steps.flatMap((step, i) =>
    step.type !== 'measure'
      ? []
      : (step.fields || []).flatMap(f => {
          const key = sub(keyOf, step.sid, f.id);
          const value = String(responses?.[key] ?? '').trim();
          const how = parsed(responses?.[`${key}:src`]);
          if (!value || !how) return [];
          const kind =
            how.k === 's' ? 'span' : how.k === 't' ? 'typed' : 'taken';
          return [
            {
              kind: 'reading',
              sid: step.sid,
              n: i + 1,
              title: step.title,
              label: f.label,
              value,
              unit: f.unit || '',
              how: kind,
              from: kind === 'taken' ? String(how.l ?? '') : '',
              body: kind === 'taken' ? String(how.b ?? '') : '',
              time: kind === 'taken' && Number.isFinite(how.t) ? how.t : null,
              figures: figuresOf(value),
              span: kind === 'span' ? { n: how.n, a: how.a, b: how.b } : null,
            },
          ];
        })
  );

/** The reading table's header cells. */
export const readingColumns = t => [
  t('rp.rdg.step'),
  t('rp.rdg.what'),
  t('rp.rdg.value'),
  t('rp.rdg.how'),
  t('rp.rdg.body'),
  t('rp.rdg.clock'),
  t('rp.rdg.figs'),
];

/** One reading as the cells of its row. `x.clean` strips lesson markup; `x.formatTime` prints the simulation clock. */
export const readingCells = (r, x) => [
  `${r.n}`,
  x.clean(r.label),
  `${r.value}${r.unit ? ` ${r.unit}` : ''}`,
  r.how === 'typed'
    ? x.t('rp.rdg.typed')
    : r.how === 'span'
      ? x.t('rp.rdg.span', { n: r.span.n, a: r.span.a, b: r.span.b })
      : r.from
        ? x.t('rp.rdg.from', { what: r.from })
        : x.t('rp.rdg.taken'),
  r.body || '-',
  r.time === null ? '-' : x.formatTime(r.time),
  `${r.figures}`,
];

// --- A prediction beside what the student found -----------------------------------

/**
 * One prediction as a row, or null when the step is not one. `ev` is js/investigations/evidence.js, for an estimate and
 * for the readings a revealing step names; it is null for a lesson that declares neither.
 * @param {object} p
 * @param {object[]} p.steps - The steps the report covers (a reveal outside them has no outcome row)
 * @param {object[]} [p.all] - All the lesson's steps, where the readings a reveal names are looked for
 * @param {object} p.step - The prediction
 * @param {object} p.responses - The progress record
 * @param {Set<string>} p.visited - Sids of the steps reached
 * @param {(sid: string) => string} p.keyOf - A step's response key
 * @returns {?object} {kind: 'pair', sid, said, none, outcome, readings, verdict, compare}
 */
export function predictionRow({
  steps,
  all = steps,
  step,
  responses,
  visited,
  keyOf,
  ev,
}) {
  if (step.type !== 'predict') return null;
  const id = keyOf(step.sid);
  const value = responses?.[id];
  const est = step.kind === 'estimate';
  const said = est && ev?.readEstimate(step, responses, id);
  const chosen = est
    ? said
      ? { est: said, unit: step.unit }
      : null
    : typeof value === 'number'
      ? { text: step.options[value] }
      : null;
  const out = step.reveal ? steps.find(x => x.sid === step.reveal) : null;
  const reached = Boolean(out && visited.has(out.sid));
  const row = {
    kind: 'pair',
    sid: step.sid,
    prompt: step.prompt,
    said: chosen,
    outcome: out
      ? { n: steps.indexOf(out) + 1, title: out.title, reached }
      : null,
    readings: [],
    verdict: null,
    compare: null,
  };
  if (!reached) return row;
  // What the student then read, and the author's one sentence, once the outcome is reached.
  if (ev && out.evidence) {
    const seen = ev.readingsFor(out, all, responses, keyOf);
    row.readings = seen.map(r => ({
      label: r.field.label,
      value: r.text,
      unit: r.field.unit || '',
    }));
    const inside = said ? ev.fellInside(said, seen[0]?.value) : null;
    if (inside !== null) row.verdict = inside ? 'inside' : 'outside';
    if (out.compare) row.compare = out.compare;
  }
  // A choice is a class, never the option the author keyed.
  if (
    !est &&
    Array.isArray(step.options) &&
    step.answer !== undefined &&
    typeof value === 'number'
  )
    row.verdict = value === step.answer ? 'matched' : 'differed';
  return row;
}

/**
 * A prediction's text, as lines: ['field', label, value], ['row', label, value] or ['para', text].
 * @param {object} row - From predictionRow
 * @param {object} x - {t, clean, ev}
 * @returns {Array<string[]>} Lines
 */
export function pairLines(row, x) {
  const { t, clean } = x;
  const said = row.said
    ? row.said.est
      ? x.ev.estimateText(row.said.est, row.said.unit, t('rp.range'))
      : row.said.text
    : t('rp.noPred');
  const lines = [
    ['field', t('rp.pred', { prompt: clean(row.prompt) }), clean(said)],
  ];
  if (row.outcome)
    lines.push([
      'row',
      t('rp.outcome'),
      `${t('rp.link', { n: row.outcome.n, title: clean(row.outcome.title) })} (${t(row.outcome.reached ? 'rp.reached' : 'rp.notReached')})`,
    ]);
  for (const r of row.readings)
    lines.push([
      'row',
      t('rp.reading', { what: clean(r.label) }),
      r.value ? `${r.value}${r.unit ? ` ${r.unit}` : ''}` : '-',
    ]);
  if (row.verdict) lines.push(['para', t(`rp.${row.verdict}`)]);
  if (row.compare) lines.push(['para', clean(row.compare)]);
  return lines;
}

// --- Answers that belong to an earlier version -------------------------------------

const str = v =>
  v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : `${v}`.trim();

/**
 * Answers kept under step ids the lesson no longer has, each with what the lesson says that step was
 * (`retired[id].was`) and the release that replaced it. The same reading as `earlierAnswers` in
 * js/investigations/stepView.js, which the lesson panel uses; a test holds the two equal. Not marked against any key.
 * @param {object} lesson - The lesson, with its `id`, `steps` and `retired`
 * @param {object} table - The responses, with the earlier ones merged in
 * @returns {object[]} Rows: {kind: 'earlier', id, text, to, release, was}
 */
export function earlierRows(lesson, table) {
  const live = new Set((lesson?.steps || []).map(s => s?.sid));
  const by = new Map();
  for (const [k, v] of Object.entries(table || {})) {
    const [owner, sid, ...rest] = k.split(':');
    if (owner === lesson?.id && !live.has(sid))
      by.set(sid, [...(by.get(sid) || []), [rest.join(':'), v]]);
  }
  return [...by].flatMap(([id, kv]) => {
    const text =
      str(kv.find(([k]) => !k)?.[1]) ||
      kv
        .filter(
          ([k, v]) =>
            k &&
            !/^(shown|locale|help|hint)$|^tool:|:(locale|src)$/.test(k) &&
            str(v)
        )
        .map(([k, v]) => `${k}=${str(v)}`)
        .join('; ');
    if (!text) return [];
    const r = Object.hasOwn(lesson.retired ?? {}, id)
      ? lesson.retired[id]
      : null;
    return [
      {
        kind: 'earlier',
        id,
        text,
        to: r?.to ?? null,
        release: r?.release ?? '',
        was: r?.was ?? '',
      },
    ];
  });
}

/** An earlier answer as a line: what that step asked (or its id), the release, and the answer as given. */
export function earlierLine(r, x) {
  const was =
    typeof r.was === 'string' ? r.was : r.was?.[x.locale] || r.was?.en || '';
  const asked = was ? `"${x.clean(was)}"` : r.id;
  return [r.release ? `${asked} (${r.release})` : asked, r.text];
}

// --- A controlled run --------------------------------------------------------------

const MAX_RUNS = 4;

/**
 * The table of runs a student made on a step that declares a variation (`<step>:run:<n>`, one JSON string each, as
 * js/lesson/runs.js writes them), or null when none was made.
 * @returns {?object} {kind: 'runs', sid, n, title, param, rows: [{v, r: [{l, x}]}]}
 */
export function runRows(steps, step, responses, keyOf) {
  if (!step.variation) return null;
  const rows = Array.from({ length: MAX_RUNS }, (_, i) =>
    parsed(responses?.[`${keyOf(step.sid)}:run:${i + 1}`])
  ).filter(r => r && Array.isArray(r.r));
  if (!rows.length) return null;
  return {
    kind: 'runs',
    sid: step.sid,
    n: steps.indexOf(step) + 1,
    title: step.title,
    param: step.variation.label,
    rows,
  };
}

/** A run table's caption, header cells and body cells. */
export function runCells(run, x) {
  const letter = i => String.fromCharCode(65 + i);
  return {
    caption: x.t('rp.runs.cap', {
      n: run.n,
      title: x.clean(run.title),
      param: x.clean(run.param),
    }),
    columns: [
      x.t('rp.runs.run'),
      x.clean(run.param),
      ...run.rows[0].r.map(c => String(c.l ?? '')),
    ],
    rows: run.rows.map((rec, i) => [
      letter(i),
      x.formatNumber(rec.v),
      ...rec.r.map(c => String(c.x ?? '')),
    ]),
  };
}

// --- Everything, for one record ------------------------------------------------------

/**
 * The evidence rows of one record: what the PDF and the web page print and what a token yields when read back.
 * @param {object} p
 * @param {object} p.lesson - The lesson (its `steps` and `retired`)
 * @param {object[]} [p.steps] - The steps the report covers when it is cut to a depth; the lesson's own by default
 * @param {object} p.responses - The progress record, the earlier answers merged in
 * @param {Set<string>} p.visited - Sids reached
 * @param {(sid: string) => string} p.keyOf - A step's response key
 * @param {?object} [p.ev] - js/investigations/evidence.js, for a lesson that has estimates or evidence
 * @returns {{readings: object[], pairs: object[], runs: object[], earlier: object[]}} The rows
 */
export function evidenceRows({
  lesson,
  steps = lesson.steps,
  responses,
  visited,
  keyOf,
  ev = null,
}) {
  return {
    readings: readingRows(steps, responses, keyOf),
    pairs: steps.flatMap(s => {
      const row = predictionRow({
        steps,
        all: lesson.steps,
        step: s,
        responses,
        visited,
        keyOf,
        ev,
      });
      const given = responses?.[keyOf(s.sid)];
      const answered = given !== undefined && String(given).trim() !== '';
      return row && (answered || visited.has(s.sid)) ? [row] : [];
    }),
    runs: steps.flatMap(s => runRows(steps, s, responses, keyOf) ?? []),
    earlier: earlierRows(lesson, responses),
  };
}

/**
 * Every row of a record as text: [kind, label, value] triples, in the order the report prints them. What the three
 * outputs are compared on.
 * @param {object} rows - From evidenceRows
 * @param {object} x - {t, clean, locale, formatTime, formatNumber, ev}
 * @returns {Array<string[]>} Lines
 */
export function rowsText(rows, x) {
  const out = [];
  for (const r of rows.readings) out.push(['reading', ...readingCells(r, x)]);
  for (const p of rows.pairs)
    for (const [kind, ...cells] of pairLines(p, x))
      out.push([`pair-${kind}`, ...cells]);
  for (const run of rows.runs) {
    const c = runCells(run, x);
    for (const row of c.rows) out.push(['run', c.caption, ...row]);
  }
  for (const e of rows.earlier) out.push(['earlier', ...earlierLine(e, x)]);
  return out;
}
