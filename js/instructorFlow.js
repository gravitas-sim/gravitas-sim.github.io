// =============================================================================
// Reading the investigation flow of an instructor guide
// -----------------------------------------------------------------------------
// js/data/instructorFlow.js is gravitas.instructor-flow/2: lesson id -> blocks,
// each naming the first and last step it covers by step sid, with what students
// do there. /1 kept the blocks inside instructorContent.js and named the steps
// by a range of 1-based numbers ("18-22"), which slid onto the wrong screens the
// first time a step was inserted above them (the same bug the expectations had
// and Prompt 72 fixed for them). readVersioned migrates /1 by looking each
// number up in the lesson's own steps, so an older copy or a fork's still reads.
//
// Printed ranges are computed from the lesson as it is, so the guide's "Steps
// 18-22" follows the screens; the block itself never names a number.
//
// Not imported by any route (the instructor portal used to carry the prose in
// instructorContent.js): the guide builder and the author check read it.
// =============================================================================
import flows from './data/instructorFlow.js';
import { readVersioned } from './platform/common.js';

export const FLOW_NAME = 'gravitas.instructor-flow';

/** A "18-22" or "18–22" or "7" as numbers, or null. */
const rangeOf = text => {
  const m = String(text ?? '')
    .trim()
    .match(/^(\d+)\s*(?:[-–—]\s*(\d+))?$/);
  return m ? [Number(m[1]), Number(m[2] ?? m[1])] : null;
};

/**
 * Read a record of any version into the sid-keyed form.
 * @param {object} doc - the record
 * @param {(id: string) => Array<{sid: string}>} stepsFor - a lesson's steps,
 *   which a /1 record's numbers are looked up in
 * @returns the readVersioned result; `doc.lessons[id]` is the block list
 */
export function readFlow(doc, stepsFor) {
  return readVersioned(doc, {
    format: FLOW_NAME,
    current: 2,
    min: 1,
    migrations: {
      1: old => {
        const notes = [];
        const lessons = {};
        for (const [id, blocks] of Object.entries(old.lessons ?? {})) {
          const steps = stepsFor(id) ?? [];
          lessons[id] = [];
          for (const b of blocks) {
            const r = rangeOf(b.steps);
            const from = r && steps[r[0] - 1];
            const to = r && steps[r[1] - 1];
            if (!from || !to) {
              notes.push(
                `${id}: steps "${b.steps}" are not in the lesson; dropped`
              );
              continue;
            }
            lessons[id].push({ from: from.sid, to: to.sid, text: b.text });
          }
        }
        return { doc: { ...old, formatVersion: 2, lessons }, notes };
      },
    },
  });
}

/**
 * The flow of one lesson, with each block's printed range.
 * @param {{id: string, steps: Array<{sid: string}>}} inv
 * @param {object} [doc] - a record to read instead of the shipped one
 * @returns {Array<{from: string, to: string, text: string, first: number,
 *   last: number}>} `first` and `last` are 1-based positions among `inv.steps`
 */
export function flowFor(inv, doc = flows) {
  const r = readFlow(doc, id => (id === inv.id ? inv.steps : []));
  if (!r.ok) throw new Error(r.message);
  const at = sid => inv.steps.findIndex(s => s.sid === sid) + 1;
  return (r.doc.lessons[inv.id] ?? []).map(b => ({
    ...b,
    first: at(b.from),
    last: at(b.to),
  }));
}

/**
 * What is wrong with a lesson's flow: a block naming a step the lesson lacks, a
 * step covered twice, or a step covered by no block.
 * @param {{id: string, steps: Array<{sid: string}>}} inv
 * @param {object} [doc]
 * @returns {string[]} problems, empty when the flow covers every step once
 */
export function checkFlow(inv, doc = flows) {
  const problems = [];
  const blocks = flowFor(inv, doc);
  const seen = new Set();
  for (const b of blocks) {
    if (!b.first || !b.last || b.last < b.first) {
      problems.push(
        `${inv.id}: flow block ${b.from}..${b.to} names no run of steps`
      );
      continue;
    }
    for (let n = b.first; n <= b.last; n++) {
      if (seen.has(n))
        problems.push(`${inv.id}: step ${n} is in two flow blocks`);
      seen.add(n);
    }
  }
  for (let n = 1; n <= inv.steps.length; n++)
    if (!seen.has(n)) problems.push(`${inv.id}: step ${n} is in no flow block`);
  return problems;
}
