// =============================================================================
// The finish flow's work: the submission token, the lab report, the files
// a student hands in and the progress backup a student keeps. Loaded on first use, because a reader who never reaches
// the finish dialog should not pay for the PDF writer or the token encoder.
// -----------------------------------------------------------------------------
// Extracted from js/investigations.js (Prompt 107, slice 2) without a change of
// behavior. It never imports the engine back. Every function takes the host the
// engine builds on each call, so the module holds no state of its own and the
// engine's reassigned variables (responses, attempts, visited, the active
// lesson) are read through host.state() when needed rather than captured.
// =============================================================================

// The one import is the report writer, which is the point of fetching this
// module late. Everything else the engine already holds arrives through the
// host: a second import here would reach modules the engine's own chunk holds,
// and the bundler would split them into a shared chunk every lesson route then
// has to request.
import { buildLabReport, downloadPdf, reportMessages } from '../labReport.js';

/**
 * What the module needs of the engine.
 * @typedef {Object} FinishHost
 * @property {() => Object} state - The engine's current lesson state:
 *   {active, stepIndex, responses, attempts, visited, startedAt, assignment,
 *   assignmentBinding, depth}
 * @property {() => Object} elements - The engine's elements
 * @property {(setup: Object) => Object} payloadFromSetup - A step's setup as a
 *   shared-link payload
 * @property {() => (Object|null)} plotData - The lesson's plot wherever it lives
 * @property {(index: number) => string} stepId - The key a step's answer is
 *   saved under
 * @property {(name: string) => string} reportSlug - The file name stem a
 *   student's report and token are saved under
 * @property {(name: string) => void} setStudentName - Remember the name
 * @property {(token: string) => void} showToken - Put a token in the dialog
 * @property {() => string} getStudentName - The saved name
 * @property {(blob: Blob, name: string) => void} saveFile - Hand the browser a file
 * @property {(restored: Object) => void} restoreInto - Become a restored
 *   progress: set the state, save, go to its step
 * @property {Object} lib - Functions the engine already holds: t, getLocale,
 *   decodeEntities, checkAnswer, localeOfAnswer, helpTaken, helpStages,
 *   encodePayload, shareUrl, toast, announce, parseDocument
 */

/**
 * The submission token for what is on record now, or '' if it cannot be made.
 * Both modules are dynamic imports, so a reader who hands nothing in never pays
 * for the encoder. The roster id comes off the assignment link's ?roster=
 * query, because the application keeps no roster.
 *
 * @param {FinishHost} host - The engine's side
 * @param {string} name - The name the student typed
 * @returns {Promise<string>} The token
 */
export async function makeSubmissionToken(host, name) {
  const { getLocale } = host.lib;
  const {
    active,
    stepIndex,
    responses,
    attempts,
    visited,
    startedAt,
    assignment,
    depth,
  } = host.state();
  try {
    const backupMod = await import('./progressBackup.js');
    const tokenMod = await import('../submission/submissionToken.js');
    // The evidence the report prints: its record and digest ride in the token.
    const ledger = await (
      await import('../notebook/report.js')
    ).ledgerForReport();
    const encoded = await tokenMod.encodeSubmission(
      tokenMod.buildSubmission({
        backup: backupMod.buildBackup({
          lesson: active,
          responses,
          attempts,
          visited,
          stepSid: active.steps[stepIndex]?.sid ?? null,
          startedAt,
          studentName: name,
        }),
        assignmentId: assignment?.i ?? null,
        rosterId: new URLSearchParams(location.search).get('roster') || null,
        fallbackLocale: getLocale(),
        record: ledger?.record,
        digest: ledger?.digest,
        depth: assignment?.d ?? (active.depths ? depth : null),
      })
    );
    if (!encoded.comfortable) {
      // Say so rather than hand over something that will be truncated at the
      // far end, where the student cannot fix it.
      console.warn(
        `[gravitas] submission token is ${encoded.length} characters, over ` +
          `the ${encoded.limit} this project treats as safely pasteable.`
      );
    }
    return encoded.token;
  } catch (err) {
    // A report without a token is still a report. The completion code and
    // every answer are on the page either way.
    console.warn('[gravitas] could not build a submission token:', err);
    return '';
  }
}

/** The name typed in the finish dialog, or null having asked for one. */
function finishName(host) {
  const els = host.elements();
  const name = els.nameInput.value.trim();
  els.nameError.hidden = Boolean(name);
  if (!name) {
    els.nameInput.focus();
    return null;
  }
  host.setStudentName(name);
  return name;
}

/**
 * The token alone, to paste into a text box.
 * @param {FinishHost} host - The engine's side
 */
export async function revealToken(host) {
  const { t, toast } = host.lib;
  const name = finishName(host);
  if (!name) return;
  const token = await makeSubmissionToken(host, name);
  if (!token) {
    toast(t('inv.token.failed'));
    return;
  }
  host.showToken(token);
  const els = host.elements();
  els.token.focus();
  els.token.select();
}

/**
 * Copy the token, or select it so the reader can.
 * @param {FinishHost} host - The engine's side
 */
export async function copyToken(host) {
  const { t, toast } = host.lib;
  const els = host.elements();
  let ok = true;
  try {
    await navigator.clipboard.writeText(els.token.value);
  } catch {
    // Selected, so the reader can copy it themselves.
    els.token.select();
    ok = false;
  }
  toast(t(ok ? 'inv.token.copied' : 'inv.token.noCopy'));
}

/**
 * Build the lab report and hand it to the browser as a PDF.
 * @param {FinishHost} host - The engine's side
 */
export const generateReport = host => report(host, 'pdf');

/**
 * Build the same report as an accessible HTML document and hand it over.
 * @param {FinishHost} host - The engine's side
 */
export const generateHtmlReport = host => report(host, 'html');

async function report(host, format) {
  const html = format === 'html';
  const {
    t,
    getLocale,
    toast,
    announce,
    decodeEntities,
    checkAnswer,
    localeOfAnswer,
    helpStages,
    helpTaken,
    encodePayload,
    shareUrl,
  } = host.lib;
  const name = finishName(host);
  if (!name) return;

  const els = host.elements();
  const button = html
    ? document.getElementById('investigationDownloadHtml')
    : els.downloadBtn;
  const label = button.textContent;
  button.disabled = true;
  button.textContent = t('inv.report.building');
  try {
    // The setup states are turned into real links here rather than at authoring
    // time, so a report always points at the encoding this build produces.
    const links = [];
    const lesson = host.state().active;
    for (let i = 0; i < lesson.steps.length; i++) {
      const setup = lesson.steps[i].setup;
      if (!setup) continue;
      const fragment = await encodePayload(host.payloadFromSetup(setup));
      links.push({
        step: i + 1,
        title: lesson.steps[i].title,
        url: shareUrl(fragment),
      });
    }

    // The plot lives on whichever step owns it, so the engine finds it rather
    // than relying on the student being parked there when they press Download.
    const plot = host.plotData();

    if (host.state().active.depths)
      await (await import('./depth.js')).messages();
    const submissionToken = await makeSubmissionToken(host, name);
    host.showToken(submissionToken);
    await reportMessages();
    const ledger = await (
      await import('../notebook/report.js')
    ).ledgerForReport();

    const { active, responses, attempts, visited, startedAt } = host.state();
    const { assignment, assignmentBinding, depth } = host.state();
    // The HTML builder is its own lazy file: nothing is fetched until it is asked for.
    const createDoc = html
      ? (await import('../htmlReport.js')).createHtmlDocument
      : undefined;
    const bytes = buildLabReport({
      createDoc,
      helpFor: id => helpTaken(helpStages(responses[`${id}:help`])),
      investigation: active,
      plot,
      name,
      submissionToken,
      responses,
      attempts,
      visited,
      startedAt,
      links,
      stepIdFor: host.stepId,
      assignment,
      binding: assignmentBinding,
      // Per answer, not per report. This used to be `checkAnswer` bare, which
      // defaults to English, so every Spanish numeric answer was re-read under
      // English rules on its way into the PDF and a student could be marked
      // correct on screen and incorrect on the document they hand in.
      depth: assignment?.d ?? (active.depths ? depth : null),
      checkAnswer: (step, value, key) =>
        checkAnswer(step, value, {
          locale: localeOfAnswer(responses, key, getLocale()),
        }),
      decodeEntities,
      t,
      locale: getLocale(),
      meta: ledger?.meta,
      evidence: ledger?.print,
    });

    if (html)
      (await import('../htmlReport.js')).downloadHtml(
        bytes,
        `${host.reportSlug(name)}.html`
      );
    else downloadPdf(bytes, `${host.reportSlug(name)}.pdf`);
    toast(t('inv.report.done'));
    announce(t('inv.report.done'));
  } catch (err) {
    console.error('Report generation failed:', err);
    toast(t('inv.report.failed'));
  } finally {
    button.disabled = false;
    button.textContent = label;
  }
}

/**
 * Write the active lesson's progress to a file the reader keeps.
 *
 * In this module, fetched on first use, with the format it imports: the backup format, its validator and the remapping logic are
 * only needed by a reader who asks for them, and the lesson engine is already
 * the heaviest thing in the application.
 */
export async function downloadBackup(host) {
  const { active, stepIndex, responses, attempts, visited, startedAt } =
    host.state();
  if (!active) return;
  const { t, announce } = host.lib;
  const backup = await import('./progressBackup.js');
  const payload = backup.buildBackup({
    lesson: active,
    responses,
    attempts,
    visited,
    stepSid: active.steps[stepIndex]?.sid ?? null,
    startedAt,
    studentName: host.getStudentName(),
  });

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  host.saveFile(blob, backup.backupFilename(active));
  announce(t('inv.backup.downloaded'));
}

/**
 * Read a backup file and, with the reader's agreement, become it.
 *
 * Everything about this is deliberately cautious: a restore replaces work, and
 * a reader who picked the wrong file should not discover that afterwards.
 *
 * @param {File} file - The chosen file
 */
export async function restoreBackup(host, file) {
  const { active, responses } = host.state();
  if (!active || !file) return;
  const { t, toast, parseDocument } = host.lib;
  const backup = await import('./progressBackup.js');

  if (file.size > backup.MAX_BACKUP_BYTES) {
    toast(t('inv.backup.tooLarge'));
    return;
  }

  let data;
  try {
    data = parseDocument(await file.text());
  } catch {
    toast(t('inv.backup.notJson'));
    return;
  }

  const verdict = backup.validateBackup(data);
  if (!verdict.ok) {
    toast(t(`inv.backup.invalid.${verdict.reason}`));
    return;
  }

  if (data.lesson.id !== active.id) {
    toast(
      t('inv.backup.wrongLesson', {
        backup: data.lesson.title || data.lesson.id,
        open: active.title,
      })
    );
    return;
  }

  // The explicit choice. Anything already answered is work, and replacing it
  // is the reader's decision to make rather than a consequence of choosing a
  // file.
  const answered = Object.keys(responses).length;
  if (answered > 0) {
    const ok = window.confirm(t('inv.backup.confirmReplace', { n: answered }));
    if (!ok) return;
  }

  const restored = backup.restoreProgress(data, active);
  // The engine becomes it: its state, a save, and the step the backup was on.
  host.restoreInto(restored);

  // What could not be carried across, said plainly. A lesson that has changed
  // since the backup was taken is the ordinary case over a term, not an error.
  if (restored.uncertain > 0) {
    // Answers that were not applied because the step they belong to has
    // changed under them. They are still in the file the reader restored from,
    // which is why this says "set aside" rather than "lost".
    toast(
      t('inv.backup.restoredUncertain', {
        n: restored.uncertain,
        applied: Object.keys(restored.responses).length,
      })
    );
  } else if (restored.dropped.length || restored.discardedKeys) {
    toast(
      t('inv.backup.restoredPartly', {
        dropped: restored.dropped.length,
        moved: restored.moved.length,
      })
    );
  } else if (restored.moved.length) {
    toast(t('inv.backup.restoredMoved', { moved: restored.moved.length }));
  } else {
    toast(t('inv.backup.restored'));
  }
}
