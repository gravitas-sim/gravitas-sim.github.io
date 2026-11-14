// =============================================================================
// The rules a lesson's deeper steps keep (Prompt 72, DEPTH.md)
// -----------------------------------------------------------------------------
// One science at three depths means a deeper step may add to what a student
// does, and may never change what is true. These rules hold that line. They are
// pure and Node-side (author:check and the tests), so they cost no route.
// =============================================================================

import { DEPTHS, inDepth } from '../investigations/progressSchema.js';
import { toleranceFor } from '../answerCheck.js';

/** Rule ids and what they say, for `author:check --rules`. */
export const DEPTH_RULES = {
  'depth/offered':
    'A lesson offers core first and each deeper depth it offers has steps',
  'depth/anchor':
    'A deeper step is laid after a step that exists, and never behind a deeper one',
  'depth/closing': 'The closing step is core at every depth',
  'depth/world':
    'A deeper step opens no scenario, seed or stage of its own: it reads the world in force',
  'depth/refs':
    'A step never depends on, reveals or follows a step deeper than itself, and core never names a deeper one',
  'depth/earlier':
    'A computed field reads only earlier steps of no deeper depth: nothing is measured twice',
  'depth/uncertainty':
    'An uncertainty answer is numeric, with a positive tolerance and a finite answer',
  'depth/expectation':
    'A deeper step that restates a core expectation agrees with it',
  'depth/translation': 'Every deeper step is translated, word for word',
};

/**
 * The findings for one lesson's deeper steps.
 * @param {object} core - The lesson as the registry has it
 * @param {object} laid - The same lesson with every depth laid in
 * @param {{steps: object[]}} words - The Spanish shadow of the deeper steps
 * @param {Array<object>} deeper - The deeper steps, as written
 * @returns {Array<{level: string, rule: string, lesson: string, step: ?number, message: string}>}
 */
export function checkDepth(core, laid, deeper, words) {
  const out = [];
  const L = core.id;
  const err = (rule, sid, message) =>
    out.push({ level: 'error', rule, lesson: L, step: sid, message });
  const at = sid => laid.steps.findIndex(s => s.sid === sid);
  const offered = core.depths || [];

  if (offered[0] !== 'core' || offered.some(d => !DEPTHS.includes(d)))
    err('depth/offered', null, `depths must start with core: ${offered}`);
  for (const d of offered.slice(1))
    if (!deeper.some(s => s.depth === d))
      err('depth/offered', null, `offers ${d} and has no step at it`);

  const coreSids = new Set(core.steps.map(s => s.sid));
  deeper.forEach((s, n) => {
    const w = s.sid;
    if (!offered.includes(s.depth) || s.depth === 'core')
      err(
        'depth/offered',
        w,
        `depth "${s.depth}" is not a deeper depth offered`
      );
    if (coreSids.has(w)) err('depth/anchor', w, 'sid is a core step');
    const to = at(s.after);
    if (to < 0 || to >= at(w))
      err('depth/anchor', w, `after "${s.after}" is not an earlier step`);
    else if (!inDepth(laid.steps[to], s.depth))
      err('depth/anchor', w, `is laid after a step deeper than itself`);
    if (s.setup || s.stage || s.scenario)
      err(
        'depth/world',
        w,
        'has a setup or stage: a depth reads the same world'
      );
    for (const ref of [
      ...(s.requires || []),
      s.reveal,
      s.when?.sid,
      s.restates,
    ].filter(Boolean)) {
      const r = laid.steps[at(ref)];
      if (!r) err('depth/refs', w, `names "${ref}", which is not a step`);
      else if (!inDepth(r, s.depth))
        err('depth/refs', w, `names "${ref}", which is deeper than itself`);
    }
    // Which earlier steps a computed field reads, found by running it.
    for (const f of s.fields || []) {
      if (!f.compute) continue;
      const read = [];
      try {
        f.compute({}, (sid, field) => (read.push([sid, field]), NaN));
      } catch {
        /* a compute that cannot take NaN is the interaction rules' to report */
      }
      for (const [sid, field] of read) {
        const r = laid.steps[at(sid)];
        if (!r || at(sid) >= at(w) || !inDepth(r, s.depth))
          err(
            'depth/earlier',
            w,
            `reads "${sid}", which is not an earlier step it may use`
          );
        else if (!(r.fields || []).some(x => x.id === field))
          err(
            'depth/earlier',
            w,
            `reads "${sid}:${field}", which is not a field`
          );
      }
    }
    if (s.uncertainty) {
      const tol = toleranceFor(s);
      if (s.kind !== 'numeric' || !Number.isFinite(s.answer) || !(tol > 0))
        err(
          'depth/uncertainty',
          w,
          'needs kind numeric, a finite answer and a positive tolerance'
        );
    }
    if (s.restates) {
      const r = laid.steps[at(s.restates)];
      if (r && (r.kind !== 'numeric' || !Number.isFinite(r.answer)))
        err(
          'depth/expectation',
          w,
          `restates "${s.restates}", which has no numeric answer`
        );
      else if (r) {
        const gap = Math.abs(s.answer - r.answer);
        if (gap > toleranceFor(r) + 1e-9 || (r.unit ?? '') !== (s.unit ?? ''))
          err(
            'depth/expectation',
            w,
            `expects ${s.answer} ${s.unit}; "${s.restates}" expects ${r.answer} ${r.unit}`
          );
      }
    }
    for (const g of s.agrees || []) {
      const f = (laid.steps[at(g.sid)]?.fields || []).find(x => x.id === g.id);
      let value = NaN;
      try {
        value = f?.compute?.(g.at, () => NaN);
      } catch {
        /* reported below */
      }
      const tol = toleranceFor(s);
      if (!Number.isFinite(value) || Math.abs(value - s.answer) > tol + 1e-9)
        err(
          'depth/expectation',
          w,
          `expects ${s.answer}; "${g.sid}:${g.id}" computes ${value}`
        );
    }
    const sp = words?.steps?.[n];
    if (words && !sp) err('depth/translation', w, 'has no Spanish');
  });

  if (laid.steps.at(-1)?.sid !== core.steps.at(-1)?.sid)
    err('depth/closing', null, 'the closing step is not the core one');
  for (const s of core.steps)
    for (const ref of [...(s.requires || []), s.reveal, s.when?.sid])
      if (ref && !coreSids.has(ref))
        err('depth/refs', s.sid, `core step names "${ref}", which is not core`);

  // The words a reader sees, step for step: the title and body, and every
  // other text and list the English step has.
  deeper.forEach((s, n) => {
    const sp = words?.steps?.[n];
    if (!sp) return;
    const need = (key, ok) =>
      s[key] !== undefined &&
      !ok &&
      err('depth/translation', s.sid, `${key} has no Spanish`);
    for (const k of [
      'title',
      'body',
      'tip',
      'prompt',
      'because',
      'worked',
      'placeholder',
      'importLabel',
    ])
      need(k, typeof s[k] !== 'string' || (typeof sp[k] === 'string' && sp[k]));
    for (const k of ['options', 'fields', 'checklist'])
      need(k, !Array.isArray(s[k]) || sp[k]?.length === s[k].length);
    for (const k of Object.keys(s.hints || {}))
      need('hints', typeof sp.hints?.[k] === 'string');
  });
  return out;
}
