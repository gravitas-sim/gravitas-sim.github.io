#!/usr/bin/env node
// =============================================================================
// One printable workbook, for one lesson, with real engine numbers in it
// -----------------------------------------------------------------------------
//   npm run workbook          regenerate the science table and the PDF
//   npm run workbook:check    fail if either has drifted, or if the lesson's
//                             own validators would now reject the table
//
// A pre-integration spike, deliberately narrow: Kepler's Laws and nothing else.
// It exists to answer one question - can Gravitas drive a real lesson and the
// real engine headlessly well enough to print a workbook whose numbers the
// interactive lesson would accept? - and not to be a workbook framework. See
// WORKBOOK_SPIKE.md for the finding.
//
// Two artifacts, for two different reasons
// -----------------------------------------------------------------------------
//   workbooks/keplers-laws.json   the scientific table, committed. This is the
//                                 byte-for-byte reproducible part: no dates, no
//                                 paths, no commit hash, nothing that moves
//                                 without the physics moving. `--check` diffs
//                                 it, so a drift in the engine shows up as a
//                                 readable diff rather than as changed PDF
//                                 bytes.
//   workbooks/keplers-laws.pdf    the printable artifact, generated on demand
//                                 and git-ignored. It carries the commit it was
//                                 built from, which is why it cannot be
//                                 committed: a file that names its own commit
//                                 can never be up to date.
//
// Nothing here reaches the network, and nothing here is copied into dist/:
// `workbooks/` is in neither STATIC_FILES nor STATIC_DIRS in build.js, so the
// site a visitor downloads is byte-identical with and without this tool.
// =============================================================================

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createDocument } from '../js/pdf.js';
import { plainText, entryFor } from '../js/answerKey.js';
import {
  RELEASE,
  URLS,
  LICENSE,
  CONTENT_LICENSE,
} from './project-metadata.mjs';
import {
  LESSON_ID,
  SEED,
  SCHEDULE,
  lesson,
  stepOf,
  measure,
  gradeAll,
  digestOf,
} from './workbook/kepler.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(REPO, 'workbooks');
const JSON_PATH = join(OUT_DIR, `${LESSON_ID}.json`);
const PDF_PATH = join(OUT_DIR, `${LESSON_ID}.pdf`);

const argv = process.argv.slice(2);
const checking = argv.includes('--check');
const quiet = argv.includes('--quiet');

/** The revision this run is standing on. Provenance only; never in the table. */
function revision() {
  const git = (...a) => {
    try {
      return execFileSync('git', a, { cwd: REPO, encoding: 'utf8' }).trim();
    } catch {
      return null;
    }
  };
  const commit = git('rev-parse', 'HEAD');
  const dirty = git('status', '--porcelain');
  return {
    commit: commit ?? 'unknown',
    short: commit ? commit.slice(0, 12) : 'unknown',
    branch: git('rev-parse', '--abbrev-ref', 'HEAD') ?? 'unknown',
    clean: dirty === '',
  };
}

// --- The scientific table, as a file -----------------------------------------

/**
 * The committed artifact: everything reproducible, and nothing else.
 *
 * @param {object} science - From `measure`
 * @param {Array<object>} graded - From `gradeAll`
 * @returns {string} JSON text, newline-terminated
 */
function scienceDocument(science, graded) {
  return (
    JSON.stringify(
      {
        lesson: LESSON_ID,
        seed: science.seed,
        // The determinism contract, written down where a reader will find it.
        stepping: Object.fromEntries(
          Object.entries(science.stepPlans).map(([k, v]) => [
            k,
            { step: v.step, substeps: v.substeps, from: v.source },
          ])
        ),
        schedule: SCHEDULE,
        samples: science.samples,
        agreement: graded,
      },
      null,
      2
    ) + '\n'
  );
}

// --- The printable artifact ---------------------------------------------------

/** Prose from a step, wrapped for print. */
const prose = sid =>
  plainText(stepOf(sid).body)
    .split(/(?<=\.)\s+(?=[A-Z])/)
    .reduce((acc, s) => {
      if (!acc.length || (acc[acc.length - 1] + ' ' + s).length > 420)
        acc.push(s);
      else acc[acc.length - 1] += ' ' + s;
      return acc;
    }, []);

/**
 * Build the PDF.
 *
 * Grayscale is the working assumption throughout: every table in js/pdf.js
 * bands at 0.975 and heads at 0.93, the rules are grey, and nothing here
 * distinguishes two things by hue alone. A workbook is printed on a
 * department photocopier or it is not printed.
 *
 * @param {object} science - From `measure`
 * @param {Array<object>} graded - From `gradeAll`
 * @param {object} rev - From `revision`
 * @returns {Uint8Array} PDF bytes
 */
function renderPdf(science, graded, rev) {
  const inv = lesson();
  const digest = digestOf(science);
  const doc = createDocument({
    title: `${inv.title} - printable workbook`,
    subject: `Gravitas workbook for the ${inv.title} investigation`,
    keywords: 'Gravitas, orbital mechanics, Kepler, workbook',
    footer: `Gravitas ${inv.title} workbook  -  table ${digest}  -  ${rev.short}`,
  });

  doc.titleBlock({
    kicker: 'Gravitas printable workbook',
    title: inv.title,
    subtitle: inv.subtitle,
  });

  doc.paragraph(
    'Every number in the shaded tables below was computed by the Gravitas ' +
      'physics engine, not typed in by hand. Each table says which simulation ' +
      'it came from and at exactly which moment of simulated time. Work ' +
      'through the questions using the printed values; if you have the ' +
      'simulator open, your own readings should match to the precision shown.'
  );

  // --- Part 1 ---------------------------------------------------------------
  doc.heading('Part 1  The shape of one orbit', { size: 13 });
  doc.paragraph(
    `Simulation: "Kepler's 2nd Law". Two planets orbit a one-solar-mass star. ` +
      `One is very nearly circular; the other is not.`,
    { color: '0.3 0.32 0.38' }
  );
  for (const p of prose('measure-the-two-orbits').slice(0, 2)) doc.paragraph(p);

  const t0 = science.samples['kepler-t0'];
  const probeRow = (name, label) => {
    const rows = t0.probe[name];
    return rows.find(r => r.label === label)?.value ?? '';
  };
  doc.paragraph(
    `Table 1.  Both orbits as the simulation builds them, at simulated time ` +
      `${t0.day.toFixed(3)} days.`,
    { size: 9, gap: 4 }
  );
  doc.table({
    columns: [
      'Body',
      'Eccentricity e',
      'Semi-major axis a',
      'Closest (periapsis)',
      'Furthest (apoapsis)',
    ],
    widths: [1.5, 1, 1.1, 1.2, 1.2],
    rows: ['Circular Orbiter', 'Eccentric Orbiter'].map(n => [
      n,
      probeRow(n, 'Eccentricity e'),
      probeRow(n, 'Semi-major axis a'),
      probeRow(n, 'Closest (periapsis)'),
      probeRow(n, 'Furthest (apoapsis)'),
    ]),
  });
  doc.paragraph(
    'Q1.  The semi-major axis is the mean of the two extremes. Take the ' +
      "Eccentric Orbiter's closest and furthest distances from the table, " +
      'average them, and compare with the value in the third column.',
    { size: 9.5 }
  );
  doc.writingSpace('(periapsis + apoapsis) / 2 =', { lines: 2 });

  const peri = science.samples['kepler-periapsis'];
  const apo = science.samples['kepler-apoapsis'];
  doc.paragraph(
    `Table 2.  The eccentric orbit at its two extremes. These are not round ` +
      `numbers of days: they are the moments the simulation's own Pause at ` +
      `Event watcher stopped at, having bracketed the crossing and ` +
      `interpolated it. The bracket is the width of the integration step.`,
    { size: 9, gap: 4 }
  );
  doc.table({
    columns: [
      'Condition',
      'Simulated time (d)',
      'Bracket (d)',
      'Distance from star',
      'Speed',
    ],
    widths: [1.3, 1.2, 1, 1.2, 1],
    rows: [
      [
        'First periapsis',
        peri.event.timeDays.toFixed(4),
        peri.event.bracketDays.toFixed(5),
        `${peri.distanceAu.toFixed(3)} AU`,
        `${peri.speedKms.toFixed(1)} km/s`,
      ],
      [
        'First apoapsis',
        apo.event.timeDays.toFixed(4),
        apo.event.bracketDays.toFixed(5),
        `${apo.distanceAu.toFixed(3)} AU`,
        `${apo.speedKms.toFixed(1)} km/s`,
      ],
    ],
  });
  doc.paragraph(
    'Q2.  Divide the periapsis speed by the apoapsis speed. Then work out ' +
      '(1 + e) / (1 - e) from the eccentricity in Table 1. They should agree: ' +
      'that is conservation of angular momentum, written two ways.',
    { size: 9.5 }
  );
  doc.writingSpace(
    'fast / slow =                                  (1+e)/(1-e) =',
    {
      lines: 2,
    }
  );

  // --- Part 2 ---------------------------------------------------------------
  doc.heading('Part 2  The third law', { size: 13 });
  doc.paragraph(
    'Simulation: "Solar System". Eight planets around a one-solar-mass star.',
    { color: '0.3 0.32 0.38' }
  );
  const solar0 = science.samples['solar-t0'];
  const solar1 = science.samples['solar-one-year'];
  doc.paragraph(
    `Table 3.  Semi-major axis and period for all eight planets, read at two ` +
      `named moments: ${solar0.day.toFixed(3)} days, and ` +
      `${solar1.day.toFixed(3)} days after ${solar1.steps.toLocaleString('en-US')} ` +
      `integration steps. The two readings are printed side by side on purpose. ` +
      `They should not differ: an orbital element that drifted while the ` +
      `simulation ran would mean the integrator was losing the orbit, and every ` +
      `answer below it would depend on when you happened to look.`,
    { size: 9, gap: 4 }
  );
  const byName = rows => Object.fromEntries(rows.map(r => [r[0], r]));
  const a0 = byName(solar0.rows);
  const a1 = byName(solar1.rows);
  doc.table({
    columns: [
      'Planet',
      'a (AU) at 0 d',
      'P (yr) at 0 d',
      `a (AU) at ${solar1.day.toFixed(0)} d`,
      `P (yr) at ${solar1.day.toFixed(0)} d`,
    ],
    widths: [1.2, 1, 1, 1, 1],
    rows: solar0.rows.map(([name]) => [
      name,
      a0[name][1],
      a0[name][2],
      a1[name][1],
      a1[name][2],
    ]),
  });
  doc.paragraph(
    'Q3.  Pick any four planets that are well spread out. For each, cube a, ' +
      'square P, and divide. Kepler’s third law says the four answers agree.',
    { size: 9.5 }
  );
  doc.table({
    columns: ['Planet', 'a (AU)', 'P (yr)', 'a³', 'P²', 'P² / a³'],
    widths: [1.3, 1, 1, 1, 1, 1],
    rows: [1, 2, 3, 4].map(() => ['', '', '', '', '', '']),
  });
  doc.paragraph(
    'Q4.  The star here is exactly one solar mass. What should P² / a³ ' +
      'come to, in these units, and why?',
    { size: 9.5 }
  );
  doc.writingSpace('', { lines: 3 });

  // --- Part 3 ---------------------------------------------------------------
  doc.heading('Part 3  Weighing a star forty light years away', { size: 13 });
  doc.paragraph(
    'Simulation: "TRAPPIST-1 System". Seven planets around a very small star.',
    { color: '0.3 0.32 0.38' }
  );
  const trappist = science.samples['trappist-t0'];
  doc.paragraph(
    `Table 4.  All seven planets at simulated time ${trappist.day.toFixed(3)} days. ` +
      `Periods are in days, as the simulator's readout gives them.`,
    { size: 9, gap: 4 }
  );
  doc.table({
    columns: ['Planet', 'Semi-major axis a (AU)', 'Period P (days)'],
    widths: [1, 1.4, 1.2],
    rows: trappist.rows.map(r => [r.name, r.aAu, r.periodDays]),
  });
  doc.paragraph(
    'Q5.  Pick any one planet. Convert its period to years (divide by 365.25), ' +
      'then compute a³ / P². The answer is the mass of TRAPPIST-1 in solar ' +
      'masses. Do it for a second planet and check you get the same star.',
    { size: 9.5 }
  );
  doc.table({
    columns: [
      'Planet',
      'a (AU)',
      'P (days)',
      'P (yr)',
      'a³',
      'P²',
      'Mass (M_sun)',
    ],
    widths: [1.2, 0.9, 1, 1, 1, 1, 1.1],
    rows: [1, 2].map(() => ['', '', '', '', '', '', '']),
  });
  doc.paragraph(
    'Q6.  The published mass of TRAPPIST-1 is 0.0898 solar masses. How close ' +
      'did you get, and what would you need to measure in the real sky to do ' +
      'this for a star nobody has weighed?',
    { size: 9.5 }
  );
  doc.writingSpace('', { lines: 4 });

  // --- What was and was not checked ----------------------------------------
  doc.pageBreak();
  doc.heading('How this sheet was checked', { size: 13 });
  doc.paragraph(
    "Every number in Tables 1 to 4 was handed back to the lesson's own " +
      'answer logic - the same functions that mark your work in the ' +
      'simulator - exactly as if a student had typed the printed value into ' +
      'the lesson panel. The workbook does not build unless all of them pass. ' +
      'This is what they said:'
  );
  doc.table({
    columns: ['Lesson step', 'Reading', 'Verdict', "The lesson's own words"],
    widths: [1.5, 1, 0.7, 3.4],
    rows: graded.map(g => [
      g.title,
      g.subject ?? '-',
      g.level,
      g.message.length > 210 ? g.message.slice(0, 207) + '...' : g.message,
    ]),
    size: 7.5,
  });

  const key = (inv.steps || []).map((s, i) => entryFor(s, i));
  const unchecked = key.filter(
    e =>
      e.category === 'prediction' ||
      e.category === 'graded' ||
      e.category === 'written'
  );
  doc.heading('Questions on this sheet that nothing marks', { size: 12 });
  doc.paragraph(
    'Q1 to Q6 above are arithmetic on printed values, and the values ' +
      'themselves are checked. They are not otherwise graded: a printed page ' +
      'cannot read your handwriting. The lesson also contains ' +
      `${unchecked.length} questions that are marked in the simulator and are ` +
      'deliberately not reproduced here, because printing them without their ' +
      'answer key would be a worksheet, and printing them with it would be an ' +
      'answer key. Open the investigation for those.',
    { size: 9.5 }
  );

  doc.heading('Provenance', { size: 12 });
  doc.table({
    columns: ['', ''],
    widths: [1, 2.6],
    rows: [
      ['Lesson', `${inv.title} (${LESSON_ID})`],
      ['Gravitas version', RELEASE.version ?? 'unreleased'],
      ['Source revision', rev.commit],
      [
        'Branch',
        `${rev.branch}${rev.clean ? '' : ' (working tree not clean)'}`,
      ],
      ['World seed', SEED],
      [
        'Integration step',
        Object.entries(science.stepPlans)
          .map(([k, v]) => `${k}: ${v.step} (${v.source})`)
          .join('; '),
      ],
      ['Scientific table digest', digest],
      ['Software licence', LICENSE],
      ['Content licence', CONTENT_LICENSE],
      ['Project', URLS.site ?? URLS.repository ?? ''],
    ],
    size: 8,
  });
  doc.paragraph(
    'The digest above is a SHA-256 of the scientific table in ' +
      'workbooks/keplers-laws.json, which is committed alongside this ' +
      'generator. Two people who build this workbook from the same source ' +
      'revision get the same digest; if they do not, the physics moved.',
    { size: 8.5, color: '0.35 0.37 0.42' }
  );

  return doc.build();
}

// --- Driver -------------------------------------------------------------------

async function main() {
  const science = await measure();
  const graded = await gradeAll(science);

  // The invariant, enforced before anything is written: if the lesson's own
  // logic would not accept one of these numbers, there is no workbook. A
  // validator that returns null has nothing to say about the values given,
  // which for a fully-populated sheet means the sheet is not populated.
  const bad = graded.filter(g => g.level !== 'ok');
  if (bad.length) {
    console.error(
      `\nThe lesson's own validators rejected ${bad.length} of ${graded.length} readings:\n`
    );
    for (const g of bad) {
      console.error(
        `  ${g.sid}${g.subject ? ' / ' + g.subject : ''}  [${g.level}]  ${g.message}`
      );
      console.error(`    entered: ${JSON.stringify(g.entered)}`);
    }
    console.error(
      '\nThe workbook was not written. Either the engine has moved or the ' +
        "lesson's tolerances have; both are news.\n"
    );
    process.exitCode = 1;
    return;
  }

  const doc = scienceDocument(science, graded);
  const rev = revision();

  if (checking) {
    if (!existsSync(JSON_PATH)) {
      console.error(`\n  ${JSON_PATH} is missing. Run "npm run workbook".\n`);
      process.exitCode = 1;
      return;
    }
    const committed = readFileSync(JSON_PATH, 'utf8');
    if (committed !== doc) {
      console.error(
        '\n  The generated scientific table no longer matches ' +
          'workbooks/keplers-laws.json.\n' +
          '  Run "npm run workbook" and read the diff before committing it: ' +
          'it is a change in the physics, not in the typesetting.\n'
      );
      process.exitCode = 1;
      return;
    }
    if (!quiet) {
      console.log(
        `\n  Workbook table matches, and all ${graded.length} readings pass ` +
          "the lesson's own validators.\n"
      );
    }
    return;
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(JSON_PATH, doc);
  writeFileSync(PDF_PATH, renderPdf(science, graded, rev));
  if (!quiet) {
    console.log('');
    console.log(
      `  workbooks/${LESSON_ID}.json   scientific table, ${digestOf(science)}`
    );
    console.log(`  workbooks/${LESSON_ID}.pdf    printable workbook`);
    console.log(
      `  ${graded.length} readings, all accepted by the lesson's own validators`
    );
    console.log('');
  }
}

main();
