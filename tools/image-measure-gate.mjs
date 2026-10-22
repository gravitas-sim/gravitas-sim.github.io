#!/usr/bin/env node
// =============================================================================
// The image-measurement gate: thresholds, slices, consumers and one decision
// function
// -----------------------------------------------------------------------------
//   node tools/image-measure-gate.mjs check    the recorded results follow the
//                                              function and the document says
//                                              what the function says
//   node tools/image-measure-gate.mjs report   print the verdict table
//   node tools/image-measure-gate.mjs measure  run the prototype and write the record
//
// Prompt 178. IMAGE_MEASUREMENT_GATE.md says what is asked of one image-
// measurement instrument and which consumers each answer serves; this file is
// the same thing as code, so that a verdict is a function of recorded checks
// and not of a mood. `tools/image-measure-gate.json` holds what was measured;
// `decide()` is the only thing that turns it into A, B1, B2, B3 or C;
// `tests/imageMeasureGate.test.js` holds the three together.
//
// The thresholds, the slices, the consumers and decide() in this file were
// committed before any prototype code or any measurement existed (the commit
// that adds this file has neither, see the branch history). A change to one is
// a decision-register row, never an edit made because a check came out the
// wrong way, and a slice is never added after measuring.
//
// Nothing here changes the site. The prototype that is measured lives in
// tools/image-measure-gate/ and is imported by no page, module or build.
// =============================================================================

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const RESULTS_FILE = path.join(HERE, 'image-measure-gate.json');
export const DOC = path.join(HERE, '..', 'IMAGE_MEASUREMENT_GATE.md');

/**
 * The seven thresholds of the prompt, with the numbers each one is judged
 * against. Every number is a bound, never a target: a measured value that
 * crosses it fails the check, and no bound is reset by a session.
 */
export const THRESHOLDS = Object.freeze({
  // (1) bytes and requests, from D-R10-35 item (3) and the checkpoint's table.
  route: Object.freeze({
    /** Requests the Observatory route gains, sources and build. */
    requests: 0,
    /** KB the route may gain, as tools/route-budget.mjs prints it (the lazy call site). */
    maxKb: 0.2,
  }),
  deferred: Object.freeze({
    /** The instrument's lazy chunks, minified and gzipped, in bytes (25.0 KiB). */
    maxBytes: 25600,
    /** Lazy requests on opening an image observation, in the build. */
    maxRequests: 3,
  }),
  tier: Object.freeze({
    /** First-visit precache bytes the instrument may add. */
    firstVisitBytes: 0,
    /** The idle tier's room (D-R10-36), bytes of gzipped source. */
    idleBytes: 138331,
  }),
  // (2) precision.
  precision: Object.freeze({
    /** Point sources: 95th percentile of the radial error, pixels. */
    pointP95: 0.5,
    /** Circular features: 95th percentile of |r - r_true| / r_true. */
    circleP95: 0.02,
    /** Keyboard and single-pointer paths: the same bounds, every trial. */
    pathPoint: 0.5,
    pathCircle: 0.02,
    /** A click lands within this many pixels of the truth (the capture radius). */
    captureRadius: 3,
    /** Sources in the ensemble, discs in the ensemble. */
    points: 300,
    circles: 150,
    /** Smallest circular feature the instrument fits, pixels of radius. */
    minRadius: 15,
  }),
  // (3) the non-pointer path.
  paths: Object.freeze({
    /** Mark kinds every operation is completed on. */
    kinds: Object.freeze([
      'point',
      'segment',
      'circle',
      'polygon',
      'count',
      'reference-pair',
    ]),
    /** Live-region messages per committed change. */
    announcementsPerCommit: 1,
    /** Pointer events the keyboard walk may use; key events the pointer walk may use. */
    strayEvents: 0,
  }),
  // (6) the throttled profile: tools/observatory-budgets.json, mobile.
  interaction: Object.freeze({
    cpuThrottle: 4,
    viewport: Object.freeze([375, 812]),
    frameSide: 1024,
    marks: 50,
    repeats: 20,
    /** Handler milliseconds, 95th percentile of the repeats (nearest rank). */
    keyMs: 15,
    placeMs: 28,
    changeMs: 90,
    undoMs: 104,
    /** Input to the second frame after it, milliseconds. */
    paintMs: 100,
    /** Opening a frame of a sequence (the Observatory's openMs, mobile). */
    frameMs: 500,
  }),
  // (7) the 2,048-pixel tier.
  tier2048: Object.freeze({
    side: 2048,
    /** Decode (worker time times the throttle) plus draw (page, throttled), ms. */
    totalMs: 2000,
    /** Decoded image bytes one page may hold (157's bound). */
    maxDecodedBytes: 67108864,
  }),
});

/**
 * Every check, with the group the verdict function reads it in. `core` checks
 * are what every slice needs; `refine` checks are what refinement adds;
 * `sequence` checks are what the sequence navigator adds; `tier` checks are the
 * 2,048-pixel tier.
 */
export const CHECKS = Object.freeze({
  'T1.route': 'core',
  'T1.deferred': 'core',
  'T1.requests': 'core',
  'T1.tier': 'core',
  'T3.keyboard': 'core',
  'T3.pointer': 'core',
  'T3.announce': 'core',
  'T4.record': 'core',
  'T4.replay': 'core',
  'T5.undo': 'core',
  'T6.interaction': 'core',
  'T2.point': 'refine',
  'T2.circle': 'refine',
  'T2.keyboard': 'refine',
  'T2.pointer': 'refine',
  'T5.determinism': 'refine',
  'T3.sequence': 'sequence',
  'T4.sequence': 'sequence',
  'T6.sequence': 'sequence',
  'T7.time': 'tier',
  'T7.memory': 'tier',
});

export const STATUSES = Object.freeze(['pass', 'fail', 'not-measured']);
export const VERDICTS = Object.freeze(['A', 'B1', 'B2', 'B3', 'C']);

/**
 * The predefined slices (roadmap 178, step 1). `serves` is what the slice
 * authorizes; `doesNot` is what stays on its Appendix C alternative. A serves
 * them all.
 */
export const SLICES = Object.freeze({
  B1: Object.freeze({
    name: 'marks and scale without refinement',
    needs: ['core'],
    serves: [
      '191 Measuring the Moon',
      '193 moon identification',
      '194 sunspot areas',
      '195 relative ages',
    ],
    doesNot: [
      '180 to 185 (refinement, photometry, registration, overlays, detection)',
      '186 two-epoch shift',
      '187',
      '189',
      '2,048-pixel frames at full tier',
    ],
  }),
  B2: Object.freeze({
    name: 'marks, scale and refinement without the sequence navigator',
    needs: ['core', 'refine'],
    serves: [
      '191 Measuring the Moon',
      '193 moon identification',
      '194 sunspot areas',
      '195 relative ages',
      "186's two-epoch shift (its marks part)",
    ],
    doesNot: [
      'the sequence navigator (next frame keeps marks by tag, copy forward)',
      '187 and every consumer that needs a navigator',
      'the 2,048-pixel tier when it failed (the display rule below applies)',
    ],
  }),
  B3: Object.freeze({
    name: 'everything but the 2,048-pixel tier',
    needs: ['core', 'refine', 'sequence'],
    serves: ['every consumer, on frames displayed under the stated rule'],
    doesNot: ['2,048-pixel frames decoded and drawn at the full tier'],
  }),
});

/** Prompt 178's rule for a frame larger than 1,024 pixels when the tier fails. */
export const DISPLAY_RULE =
  "A frame whose longer side is over 1,024 pixels is drawn at js/dataKinds/limits.js's displayPlan factor and, when the 2,048-pixel tier failed, is block-averaged (downsampleMean) to that size before a mark is placed; marks are then in the averaged pixels and map to the full frame with toFull; precision claims are the 1,024-pixel frame's.";

/**
 * What a C removes (Appendix C, entry 178, `c`), each with its stated
 * alternative. Copied from the roadmap file at the time of writing; the roadmap
 * is outside the repository and is not copied in.
 */
export const C_CONSEQUENCES = Object.freeze([
  [
    '179 to 187, 189 and 191',
    "image items; 191 keeps the lessons' non-image parts",
  ],
  [
    '193',
    'keeps the ephemeris and identity tasks on the overlay-free tabular elongations from the pack',
  ],
  ['194', 'keeps the irradiance lesson and drops the spot tracking'],
  [
    '195',
    "keeps the reference-count lessons on published diameter lists and drops the student's own counts",
  ],
  [
    '197',
    'keeps the published-observation orbit work and drops the frame-based mover identification',
  ],
  [
    '212',
    'drops its frame-based parts and keeps the synthetic-standards table',
  ],
  ['215', 'drops its frame tasks and keeps the planning tasks'],
  ['217 and 220', 'keep their archive light-curve branches'],
  ['228', 'drops the centroid test'],
  ['230', 'drops the subtraction demonstration'],
  ['249', 'is not run'],
  ['250', 'drops its image items'],
  ['283', 'drops the touch precision test'],
  ['188 and 157', 'stay (import without measurement)'],
]);

const checkIds = Object.keys(CHECKS);

/** The status of each check in `results`, `not-measured` where it holds none. */
export function statusesOf(results = {}) {
  const out = {};
  for (const id of checkIds) {
    const s = results[id]?.status;
    out[id] = STATUSES.includes(s) ? s : 'not-measured';
  }
  return out;
}

/** Whether every check of these groups passed. */
function groupPasses(statuses, group) {
  return checkIds
    .filter(id => CHECKS[id] === group)
    .every(id => statuses[id] === 'pass');
}

/**
 * The verdict. A check that is not measured is not a pass.
 *   C   a core check failed or was not measured
 *   B1  the core passes and a refinement check did not
 *   B2  core and refinement pass and a sequence check did not
 *   B3  core, refinement and sequence pass and a 2,048-pixel check did not
 *   A   every check passed
 * @returns {{verdict: string, failing: string[], slice: ?object}}
 */
export function decide(results) {
  const statuses = statusesOf(results);
  const failing = checkIds.filter(id => statuses[id] !== 'pass');
  let verdict = 'A';
  if (!groupPasses(statuses, 'core')) verdict = 'C';
  else if (!groupPasses(statuses, 'refine')) verdict = 'B1';
  else if (!groupPasses(statuses, 'sequence')) verdict = 'B2';
  else if (!groupPasses(statuses, 'tier')) verdict = 'B3';
  return { verdict, failing, slice: SLICES[verdict] ?? null };
}

/** The recorded results, or null when nothing was measured yet. */
export function readResults() {
  return existsSync(RESULTS_FILE)
    ? JSON.parse(readFileSync(RESULTS_FILE, 'utf8'))
    : null;
}

/** Everything the check finds wrong with the record and the document. */
export function problems(results = readResults()) {
  const out = [];
  if (!existsSync(DOC)) return ['IMAGE_MEASUREMENT_GATE.md is missing'];
  const doc = readFileSync(DOC, 'utf8');
  for (const id of checkIds)
    if (!doc.includes(`\`${id}\``))
      out.push(`the document does not name ${id}`);
  for (const s of Object.keys(SLICES))
    if (!doc.includes(`**${s}**`)) out.push(`the document does not name ${s}`);
  if (results) {
    const stated = results.verdict;
    const computed = decide(results.checks).verdict;
    if (stated !== computed)
      out.push(`the record says ${stated}; its checks say ${computed}`);
    for (const id of Object.keys(results.checks ?? {}))
      if (!(id in CHECKS)) out.push(`the record has an unknown check ${id}`);
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd = 'check'] = process.argv.slice(2);
  const results = readResults();
  if (cmd === 'measure') {
    // Runs the prototype (tools/image-measure-gate/) and writes the record; slow
    // (a few minutes) and never run by CI. A child process, because the
    // measurement imports this file and a top-level await here would wait on it.
    const { tmpdir } = await import('node:os');
    const { execFileSync } = await import('node:child_process');
    const scratch =
      process.argv[3] ?? path.join(tmpdir(), 'gravitas-image-gate');
    execFileSync(
      process.execPath,
      [path.join(HERE, 'image-measure-gate', 'measure.mjs'), scratch],
      { stdio: 'inherit' }
    );
  } else if (cmd === 'report') {
    const { verdict, failing } = decide(results?.checks);
    console.log(
      `verdict ${verdict}${results ? '' : ' (nothing measured yet)'}`
    );
    for (const id of checkIds)
      console.log(
        `${id.padEnd(16)} ${statusesOf(results?.checks)[id]}  [${CHECKS[id]}]`
      );
    if (failing.length) console.log(`not passing: ${failing.join(', ')}`);
  } else {
    const found = problems(results);
    for (const p of found) console.error(`image gate: ${p}`);
    console.log(
      found.length ? `image gate: ${found.length} problem(s)` : 'image gate: ok'
    );
    process.exit(found.length ? 1 : 0);
  }
}
