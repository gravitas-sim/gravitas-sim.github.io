// =============================================================================
// Lab report
// -----------------------------------------------------------------------------
// Turns a completed investigation into a PDF a student can hand in.
//
// The report is written to be read by an instructor who was not there: it
// records what was asked, what the student answered, which automatically
// checkable answers matched, and how many attempts each took. Nothing is
// hidden: an instructor can see a question answered correctly on the fifth try
// and treat it differently from one answered on the first.
//
// On the completion code: it is a checksum over the responses, not proof of
// authorship. Anything computed in a browser can be forged by whoever controls
// the browser, and claiming otherwise would be worse than not having it. What
// it does do is make casual tampering visible: an edited PDF no longer matches
// its own code, and give an instructor something to spot-check against.
// =============================================================================

import { createDocument } from './pdf.js';

/**
 * Short, stable checksum over the report's contents.
 *
 * FNV-1a over the answer text. Not cryptographic; see the note above.
 * @param {string} text - Canonical serialisation of the responses
 * @returns {string} Checksum, grouped for reading aloud
 */
function completionCode(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const base = (h >>> 0).toString(36).toUpperCase().padStart(7, '0');
  return `${base.slice(0, 4)}-${base.slice(4)}`;
}

const dateText = iso => {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Strip the inline markup lesson prose carries, for the PDF's plain text.
 *
 * Subscripts and superscripts become the underscore-and-caret forms rather than
 * being deleted: "R<sub>p</sub>/R<sub>star</sub>" reading as "Rp/Rstar" in a
 * submitted report is a different symbol from the one the question asked about.
 */
const plain = text =>
  String(text ?? '')
    .replace(/<sub>([\s\S]*?)<\/sub>/g, '_$1')
    .replace(/<sup>([\s\S]*?)<\/sup>/g, '^$1')
    .replace(/<\/?(strong|em)>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Build a lab report PDF.
 *
 * @param {Object} opts
 * @param {Object} opts.investigation - The lesson
 * @param {string} opts.name - Student's name
 * @param {Object} opts.responses - Answers, keyed by step id
 * @param {Object} opts.attempts - Attempt counts, keyed by step id
 * @param {Set} opts.visited - Indices of steps reached
 * @param {string} opts.startedAt - ISO timestamp
 * @param {Array} opts.links - [{step, title, url}] states used by the lesson
 * @param {Object} [opts.plot] - {points, xLabel, yLabel, slope} to draw
 * @param {Function} opts.stepIdFor - index -> response key
 * @param {Function} opts.checkAnswer - (step, value) -> boolean|null
 * @returns {Uint8Array} PDF bytes
 */
export function buildLabReport({
  investigation,
  name,
  responses,
  attempts,
  visited,
  startedAt,
  links = [],
  plot = null,
  stepIdFor,
  checkAnswer,
}) {
  const inv = investigation;
  const doc = createDocument({
    title: `${inv.title}: ${name}`,
    footer: `Gravitas - ${plain(inv.title)}`,
  });

  // --- Header ----------------------------------------------------------------
  doc
    .heading(inv.title, { size: 19, spaceBefore: 0 })
    .paragraph(plain(inv.subtitle), {
      size: 11,
      color: '0.35 0.35 0.42',
      gap: 4,
    })
    .rule({ gap: 8 })
    .row('Submitted by', name)
    .row('Investigation', inv.id)
    .row('Started', dateText(startedAt))
    .row('Report generated', dateText(new Date().toISOString()))
    .row('Steps completed', `${visited.size} of ${inv.steps.length}`)
    .rule({ gap: 8 });

  // --- Objectives ------------------------------------------------------------
  if (inv.objectives?.length) {
    doc.heading('Learning objectives', { size: 12, spaceBefore: 8 });
    for (const o of inv.objectives) {
      doc.paragraph(`- ${plain(o)}`, { size: 10, indent: 8, gap: 3 });
    }
  }

  // --- Responses -------------------------------------------------------------
  doc.heading('Responses', { size: 14 });

  let autoTotal = 0;
  let autoRight = 0;
  const canonical = [`${inv.id}|${name}`];

  inv.steps.forEach((step, index) => {
    const id = stepIdFor(index);
    const reached = visited.has(index);

    // Reading steps ask for nothing, so listing them here leaves a heading with
    // no content under it. That they were worked through is already carried by
    // the completed-steps count.
    if (step.type === 'read') return;

    if (step.type === 'measure' && step.fields) {
      const any = step.fields.some(f =>
        String(responses[`${id}:${f.id}`] ?? '').trim()
      );
      if (!any && !reached) return;
      doc.heading(`${index + 1}. ${plain(step.title)}`, {
        size: 11,
        spaceBefore: 12,
      });
      for (const f of step.fields) {
        const v = String(responses[`${id}:${f.id}`] ?? '').trim();
        doc.row(plain(f.label) + (f.unit ? ` (${f.unit})` : ''), v || '-');
        canonical.push(`${id}:${f.id}=${v}`);
      }
      return;
    }

    if (step.type === 'explore' && step.checklist) {
      const done = step.checklist.filter(
        (_, i) => responses[`${id}:check:${i}`]
      ).length;
      if (!reached) return;
      doc.heading(`${index + 1}. ${plain(step.title)}`, {
        size: 11,
        spaceBefore: 12,
      });
      doc.row(
        'Exploration checklist',
        `${done} of ${step.checklist.length} completed`
      );
      canonical.push(`${id}:explore=${done}`);
      return;
    }

    const value = responses[id];
    const answered = value !== undefined && String(value).trim() !== '';
    if (!answered && !reached) return;

    doc.heading(`${index + 1}. ${plain(step.title)}`, {
      size: 11,
      spaceBefore: 12,
    });

    if (step.type === 'predict') {
      const chosen =
        typeof value === 'number' ? step.options[value] : '(no prediction)';
      // Predictions are reported, never marked. Their value is that the student
      // committed before seeing the answer.
      doc.field(`Prediction: ${plain(step.prompt)}`, plain(chosen));
      canonical.push(`${id}=${value}`);
      return;
    }

    if (step.kind === 'choice') {
      const chosen =
        typeof value === 'number' ? step.options[value] : '(not answered)';
      const right = checkAnswer(step, value);
      if (right !== null && answered) {
        autoTotal++;
        if (right) autoRight++;
      }
      doc.field(plain(step.prompt), plain(chosen));
      doc.row(
        'Result',
        !answered
          ? 'not answered'
          : right
            ? 'correct'
            : `incorrect (answer: ${plain(step.options[step.answer])})`
      );
      canonical.push(`${id}=${value}`);
      return;
    }

    if (step.kind === 'numeric') {
      const right = checkAnswer(step, value);
      if (answered) {
        autoTotal++;
        if (right) autoRight++;
      }
      doc.field(
        plain(step.prompt),
        answered ? `${value}${step.unit ? ` ${step.unit}` : ''}` : ''
      );
      const tries = attempts[id] || 0;
      doc.row(
        'Result',
        !answered
          ? 'not answered'
          : `${right ? 'correct' : 'incorrect'} - expected ${step.answer}${
              step.tolerance ? ` +/- ${step.tolerance}` : ''
            }${tries > 1 ? `, ${tries} attempts` : ''}`
      );
      canonical.push(`${id}=${value}`);
      return;
    }

    if (step.kind === 'short') {
      doc.field(plain(step.prompt), plain(value));
      if (step.rubric) {
        doc.paragraph(`Marking note: ${plain(step.rubric)}`, {
          size: 8.5,
          indent: 10,
          color: '0.45 0.45 0.52',
          gap: 6,
        });
      }
      canonical.push(`${id}=${plain(value)}`);
    }
  });

  // --- The student's own plot ------------------------------------------------
  if (plot?.points?.length) {
    doc.heading('Your measurements, plotted', { size: 12 });
    doc.paragraph(
      'Each point is a value you measured. The dashed line is a least-squares ' +
        'fit through the origin; a straight line through the origin is what a ' +
        'power law looks like once the axes are chosen correctly.',
      { size: 9, color: '0.35 0.35 0.42' }
    );
    doc.chart({
      points: plot.points,
      xLabel: plot.xLabel,
      yLabel: plot.yLabel,
      slope: plot.slope,
    });
  }

  // --- Summary ---------------------------------------------------------------
  doc.heading('Summary', { size: 14 });
  doc.row('Steps completed', `${visited.size} of ${inv.steps.length}`);
  if (autoTotal) {
    doc.row(
      'Automatically checked answers',
      `${autoRight} of ${autoTotal} correct`
    );
  }
  doc.row('Written answers', 'to be marked by the instructor');

  const code = completionCode(canonical.join('\n'));
  doc.row('Completion code', code);
  doc.space(4);
  doc.paragraph(
    'The completion code is a checksum of the answers above. It changes if the ' +
      'report is edited, so it can be used to spot alterations, but it is ' +
      'generated in the browser and is not proof of authorship.',
    { size: 8.5, color: '0.45 0.45 0.52' }
  );

  // --- Links -----------------------------------------------------------------
  if (links.length) {
    doc.heading('Reproduce this investigation', { size: 12 });
    doc.paragraph(
      'Each link below reopens the exact simulation used in that step, so the ' +
        'measurements in this report can be checked independently.',
      { size: 9.5, color: '0.35 0.35 0.42' }
    );
    for (const l of links) {
      doc.link(`Step ${l.step}: ${plain(l.title)}`, l.url);
    }
  }

  return doc.build();
}

/**
 * Hand the finished PDF to the browser as a download.
 * @param {Uint8Array} bytes - PDF contents
 * @param {string} filename - Suggested filename
 */
export function downloadPdf(bytes, filename) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking immediately can cancel the download in some browsers; a short
  // delay costs nothing and avoids a failure that only shows up on other people's
  // machines.
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
