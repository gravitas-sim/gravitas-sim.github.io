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
import { registerMessages } from './i18n/index.js';

/** The report's strings, both languages, fetched the first time one is built. */
let text = null;
export const reportMessages = () =>
  (text ??= Promise.all([
    import('./i18n/en.report.js'),
    import('./i18n/es.report.js'),
  ]).then(([en, es]) => {
    registerMessages('en', en.EN_REPORT);
    registerMessages('es', es.ES_REPORT);
  }));
/**
 * Short, stable checksum over the report's contents.
 *
 * FNV-1a over the answer text. Not cryptographic; see the note above.
 * @param {string} text - Canonical serialization of the responses
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

/**
 * Break a token into lines a person can copy without losing their place.
 *
 * Grouped in fours inside a line so the eye can track position, and the groups
 * are separated by spaces because whitespace is the only thing the reader is
 * allowed to strip.
 *
 * @param {string} token - The encoded submission
 * @returns {string[]} Lines, each short enough for the page
 */
function tokenLines(token) {
  const groups = String(token).match(/.{1,8}/g) || [];
  const lines = [];
  for (let i = 0; i < groups.length; i += 8) {
    lines.push(groups.slice(i, i + 8).join(' '));
  }
  return lines;
}

const dateText = (iso, locale) => {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString(locale, {
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
 * @param {Set<string>} opts.visited - Sids of the steps reached, as the engine
 *   keeps them. It held indices before steps had sids, and a Set of sids never
 *   contains a number, so a check by index was silently false for every step.
 * @param {string} opts.startedAt - ISO timestamp
 * @param {Array} opts.links - [{step, title, url}] states used by the lesson
 * @param {Object} [opts.plot] - {points, xLabel, yLabel, slope} to draw
 * @param {Function} opts.stepIdFor - index -> response key
 * @param {?object} [opts.assignment] - The assignment payload, when this is one
 * @param {?object} [opts.binding] - How its steps resolved against the lesson
 * @param {Function} opts.checkAnswer - (step, value, key) -> boolean|null.
 *   The key is passed so the caller can grade under the locale the answer was
 *   written in rather than under whatever is current.
 * @param {Function} opts.decodeEntities - decodeEntities() from
 *   js/lessonMarkup.js. Passed in, like checkAnswer, so this file does not pull
 *   it into the notebook's chunk and cost every lesson a request.
 * @param {Function} opts.t - The translator, passed in like checkAnswer: the
 *   report is written in the language the student worked in
 * @param {string} [opts.locale] - That language, for the dates
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
  assignment = null,
  binding = null,
  submissionToken = '',
  decodeEntities,
  t,
  locale = 'en',
}) {
  const inv = investigation;
  const stepsDone = t('rp.nOf', {
    n: visited.size,
    total: inv.steps.length,
  });
  // For what the lesson says. What a student wrote goes through plain() as
  // typed: the completion code is computed over it.
  const lessonPlain = text => plain(decodeEntities(text));
  const doc = createDocument({
    title: `${lessonPlain(inv.title)}: ${name}`,
    footer: `Gravitas - ${lessonPlain(inv.title)}`,
    // The machine-readable copy. See the note beside /Keywords in js/pdf.js
    // for why the instructor page prefers this to the printed block.
    keywords: submissionToken || '',
  });

  // --- Header ----------------------------------------------------------------
  doc
    .heading(lessonPlain(inv.title), { size: 19, spaceBefore: 0 })
    .paragraph(lessonPlain(inv.subtitle), {
      size: 11,
      color: '0.35 0.35 0.42',
      gap: 4,
    })
    .rule({ gap: 8 })
    .row(t('rp.by'), name)
    .row(t('rp.inv'), inv.id)
    .row(t('rp.start'), dateText(startedAt, locale))
    .row(t('rp.made'), dateText(new Date().toISOString(), locale))
    .row(t('rp.steps'), stepsDone);

  // --- Which activity this is ------------------------------------------------
  // An assignment is a subset of a lesson, so "12 of 12 steps" on its own is
  // ambiguous between a short activity finished and a long one misreported.
  // The identification says which assignment, which of the lesson's steps were
  // in it, and - when the lesson has moved on since - which of them no longer
  // resolve. An instructor marking a stack of these needs to be able to tell
  // two assignments cut from one lesson apart at a glance.
  if (assignment) {
    doc
      .row(
        t('rp.asg'),
        `${plain(assignment.t || assignment.i)} (${assignment.i})`
      )
      .row(
        t('rp.asgV'),
        t('rp.asgIssued', { v: assignment.v, date: assignment.c })
      )
      .row(t('rp.asgSteps'), assignment.s.join(', '));
    if (binding && (binding.changed || binding.missing)) {
      doc.row(
        t('rp.since'),
        t('rp.sinceV', {
          changed: binding.changed,
          missing: binding.missing,
        })
      );
    }
  }
  doc.rule({ gap: 8 });

  // --- Objectives ------------------------------------------------------------
  if (inv.objectives?.length) {
    doc.heading(t('rp.obj'), { size: 12, spaceBefore: 8 });
    for (const o of inv.objectives) {
      doc.paragraph(`- ${lessonPlain(o)}`, { size: 10, indent: 8, gap: 3 });
    }
  }

  // --- Responses -------------------------------------------------------------
  doc.heading(t('rp.resp'), { size: 14 });

  let autoTotal = 0;
  let autoRight = 0;
  const canonical = [`${inv.id}|${name}`];

  inv.steps.forEach((step, index) => {
    const id = stepIdFor(index);
    const reached = visited.has(step.sid);

    // Reading steps ask for nothing, so listing them here leaves a heading with
    // no content under it. That they were worked through is already carried by
    // the completed-steps count.
    if (step.type === 'read') return;

    if (step.type === 'measure' && step.fields) {
      const any = step.fields.some(f =>
        String(responses[`${id}:${f.id}`] ?? '').trim()
      );
      if (!any && !reached) return;
      doc.heading(`${index + 1}. ${lessonPlain(step.title)}`, {
        size: 11,
        spaceBefore: 12,
      });
      for (const f of step.fields) {
        const v = String(responses[`${id}:${f.id}`] ?? '').trim();
        doc.row(
          lessonPlain(f.label) + (f.unit ? ` (${f.unit})` : ''),
          v || '-'
        );
        canonical.push(`${id}:${f.id}=${v}`);
      }
      return;
    }

    if (step.type === 'explore' && step.checklist) {
      const done = step.checklist.filter(
        (_, i) => responses[`${id}:check:${i}`]
      ).length;
      if (!reached) return;
      doc.heading(`${index + 1}. ${lessonPlain(step.title)}`, {
        size: 11,
        spaceBefore: 12,
      });
      doc.row(
        t('rp.check'),
        t('rp.checkV', { done, total: step.checklist.length })
      );
      canonical.push(`${id}:explore=${done}`);
      return;
    }

    // The same goes for every other step that asks for nothing - an explore
    // step without a checklist, the ellipse, the wedges. What they keep is
    // where a slider was left, which is not an answer.
    if (
      step.type !== 'predict' &&
      !/^(choice|numeric|short)$/.test(step.kind)
    ) {
      return;
    }

    const value = responses[id];
    const answered = value !== undefined && String(value).trim() !== '';
    if (!answered && !reached) return;

    doc.heading(`${index + 1}. ${lessonPlain(step.title)}`, {
      size: 11,
      spaceBefore: 12,
    });

    if (step.type === 'predict') {
      const chosen =
        typeof value === 'number' ? step.options[value] : t('rp.noPred');
      // Predictions are reported, never marked. Their value is that the student
      // committed before seeing the answer.
      doc.field(
        t('rp.pred', { prompt: lessonPlain(step.prompt) }),
        lessonPlain(chosen)
      );
      canonical.push(`${id}=${value}`);
      return;
    }

    if (step.kind === 'choice') {
      const chosen =
        typeof value === 'number' ? step.options[value] : t('rp.noAns');
      const right = checkAnswer(step, value, id);
      if (right !== null && answered) {
        autoTotal++;
        if (right) autoRight++;
      }
      doc.field(lessonPlain(step.prompt), lessonPlain(chosen));
      // A choice can be changed, as a number can be re-checked, so it says
      // how many tries it took as a number does.
      const tries = attempts[id] || 0;
      doc.row(
        t('rp.result'),
        !answered
          ? t('rp.none')
          : (right
              ? t('rp.right')
              : t('rp.wrongChoice', {
                  answer: lessonPlain(step.options[step.answer]),
                })) + (tries > 1 ? t('rp.tries', { n: tries }) : '')
      );
      canonical.push(`${id}=${value}`);
      return;
    }

    if (step.kind === 'numeric') {
      const right = checkAnswer(step, value, id);
      if (answered) {
        autoTotal++;
        if (right) autoRight++;
      }
      doc.field(
        lessonPlain(step.prompt),
        answered ? `${value}${step.unit ? ` ${step.unit}` : ''}` : ''
      );
      const tries = attempts[id] || 0;
      doc.row(
        t('rp.result'),
        !answered
          ? t('rp.none')
          : t('rp.expected', {
              verdict: t(right ? 'rp.right' : 'rp.wrong'),
              answer: `${step.answer}${
                step.tolerance ? ` +/- ${step.tolerance}` : ''
              }`,
            }) + (tries > 1 ? t('rp.tries', { n: tries }) : '')
      );
      canonical.push(`${id}=${value}`);
      return;
    }

    if (step.kind === 'short') {
      doc.field(lessonPlain(step.prompt), plain(value));
      if (step.rubric) {
        doc.paragraph(t('rp.rubric', { note: lessonPlain(step.rubric) }), {
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
    doc.heading(t('rp.plot'), { size: 12 });
    doc.paragraph(t('rp.plotNote'), { size: 9, color: '0.35 0.35 0.42' });
    doc.chart({
      points: plot.points,
      xLabel: plot.xLabel,
      yLabel: plot.yLabel,
      slope: plot.slope,
    });
  }

  // --- Summary ---------------------------------------------------------------
  doc.heading(t('rp.sum'), { size: 14 });
  doc.row(t('rp.steps'), stepsDone);
  if (autoTotal) {
    doc.row(
      t('rp.auto'),
      t('rp.autoV', { right: autoRight, total: autoTotal })
    );
  }
  doc.row(t('rp.written'), t('rp.writtenV'));

  const code = completionCode(canonical.join('\n'));
  doc.row(t('rp.code'), code);
  doc.space(4);
  doc.paragraph(t('rp.codeNote'), { size: 8.5, color: '0.45 0.45 0.52' });

  // --- Submission token ------------------------------------------------------
  //
  // Last, and on its own page, because it is the one part of this document not
  // written for a human. The completion code above says whether the answers
  // were altered; this says what they were, so an instructor holding thirty
  // reports can find the question the class got wrong instead of reading
  // thirty PDFs.
  //
  // Printed as well as embedded in /Keywords because the two fail differently.
  // The embedded copy needs the file; the printed copy survives a student who
  // photographs the page or pastes it into a text box, which is what actually
  // happens. Broken into short groups so a reader can see where they are, and
  // the reader on the other end strips whitespace and nothing else - '-' and
  // '_' are base64url alphabet, not punctuation.
  if (submissionToken) {
    doc.pageBreak();
    doc.heading(t('rp.token'), { size: 14, spaceBefore: 0 });
    doc.paragraph(t('rp.tokenNote'), {
      size: 9.5,
      color: '0.35 0.35 0.42',
    });
    doc.space(4);
    for (const line of tokenLines(submissionToken)) {
      // gap 1 so the lines stack as a block rather than as paragraphs, and a
      // size chosen in tokenLines() so none of them re-wraps - a wrapped line
      // would put a break where there is no space, and the reader strips only
      // whitespace.
      doc.paragraph(line, { size: 8.5, gap: 1 });
    }
  }

  // --- Links -----------------------------------------------------------------
  if (links.length) {
    doc.heading(t('rp.links'), { size: 12 });
    doc.paragraph(t('rp.linksNote'), {
      size: 9.5,
      color: '0.35 0.35 0.42',
    });
    for (const l of links) {
      doc.link(t('rp.link', { n: l.step, title: lessonPlain(l.title) }), l.url);
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
