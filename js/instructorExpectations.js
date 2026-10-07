// =============================================================================
// Reading the instructor expectations record
// -----------------------------------------------------------------------------
// js/data/instructorExpectations.js is gravitas.instructor-expectations/2:
// lessons -> step sid -> what to expect. /1 keyed the same text by the 1-based
// step number, which slid onto the wrong screen when a step was inserted above
// it; readVersioned migrates it by looking the number up in the lesson's own
// steps, so a /1 record (an older copy, a fork's) still reads.
//
// Not imported by any route: the answer-key PDF and the author check read it.
// =============================================================================
import expectations from './data/instructorExpectations.js';
import { readVersioned } from './platform/common.js';

export const EXPECTATIONS_FORMAT = 'gravitas.instructor-expectations';

/**
 * Read a record of any version into the sid-keyed form.
 * @param {object} doc - the record
 * @param {(id: string) => Array<{sid: string}>} stepsFor - a lesson's steps,
 *   which a /1 record's numbers are looked up in
 * @returns the readVersioned result; `doc.lessons[id][sid]` is the text
 */
export function readExpectations(doc, stepsFor) {
  return readVersioned(doc, {
    format: EXPECTATIONS_FORMAT,
    current: 2,
    min: 1,
    migrations: {
      1: old => {
        const notes = [];
        const lessons = {};
        for (const [id, byNumber] of Object.entries(old.lessons ?? {})) {
          lessons[id] = {};
          const steps = stepsFor(id) ?? [];
          for (const [n, text] of Object.entries(byNumber)) {
            const step = steps[Number(n) - 1];
            if (step) lessons[id][step.sid] = text;
            else notes.push(`${id}: step ${n} does not exist; dropped`);
          }
        }
        return {
          doc: { ...old, formatVersion: 2, lessons },
          notes,
        };
      },
    },
  });
}

/**
 * The expectations of one lesson, keyed by step sid.
 * @param {{id: string, steps: Array<{sid: string}>}} inv
 * @param {object} [doc] - a record to read instead of the shipped one
 * @returns {Record<string, string>}
 */
export function expectationsFor(inv, doc = expectations) {
  const r = readExpectations(doc, id => (id === inv.id ? inv.steps : []));
  if (!r.ok) throw new Error(r.message);
  return r.doc.lessons[inv.id] ?? {};
}
