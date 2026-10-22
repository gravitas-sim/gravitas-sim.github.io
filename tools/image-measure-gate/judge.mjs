// =============================================================================
// From measured evidence to the gate's checks (Prompt 178)
// -----------------------------------------------------------------------------
// One pure function: the raw blocks the measurement wrote, against the committed
// thresholds (tools/image-measure-gate.mjs), one status per check. It reads
// numbers and compares; it measures nothing and is the same code the measurement
// runs and tests/imageMeasureGate.test.js re-runs on the recorded evidence, so a
// status cannot be edited apart from the number it follows from. A block that is
// missing is `not-measured`, never a pass.
// =============================================================================

import { THRESHOLDS } from '../image-measure-gate.mjs';

const T = THRESHOLDS;
const ok = (cond, why) => ({ status: cond ? 'pass' : 'fail', why });
const absent = why => ({ status: 'not-measured', why });
const all = (...rs) => rs.every(Boolean);

/** @returns {Object<string, {status: string, why: string}>} */
export function judge(ev = {}) {
  const out = {};
  const { core, bytes, route, browser: b, probe } = ev;

  // (1) bytes and requests
  out['T1.route'] = !route
    ? absent('no scratch-tree route measurement')
    : ok(
        ['sources', 'build'].every(
          c =>
            route.delta[c].requests <= T.route.requests &&
            route.delta[c].kb <= T.route.maxKb
        ),
        `sources ${route.delta.sources.kb >= 0 ? '+' : ''}${route.delta.sources.kb} KB, ${route.delta.sources.requests} requests; build ${route.delta.build.kb >= 0 ? '+' : ''}${route.delta.build.kb} KB, ${route.delta.build.requests} requests (bounds +${T.route.maxKb} KB, +${T.route.requests})`
      );
  out['T1.deferred'] = !bytes
    ? absent('no byte measurement')
    : ok(
        bytes.deferredGzipBytes <= T.deferred.maxBytes,
        `${bytes.deferredGzipBytes} B gzipped of ${T.deferred.maxBytes}`
      );
  out['T1.requests'] = !bytes
    ? absent('no byte measurement')
    : ok(
        bytes.lazyRequestsBuild <= T.deferred.maxRequests,
        `${bytes.lazyRequestsBuild} lazy requests of ${T.deferred.maxRequests} in the build`
      );
  out['T1.tier'] = !bytes
    ? absent('no byte measurement')
    : ok(
        bytes.tier.firstVisitBytesAdded <= T.tier.firstVisitBytes &&
          bytes.tier.idleSourceGzipBytes <= T.tier.idleBytes,
        `first visit +${bytes.tier.firstVisitBytesAdded} B; idle tier ${bytes.tier.idleSourceGzipBytes} B of ${T.tier.idleBytes}`
      );

  // (2) precision
  out['T2.point'] = !core?.point
    ? absent('no point ensemble')
    : ok(
        core.point.p95 <= T.precision.pointP95 &&
          Object.keys(core.point.refused).length === 0 &&
          core.point.n === T.precision.points,
        `p95 ${core.point.p95} px of ${T.precision.pointP95}, ${core.point.n} sources, ${Object.keys(core.point.refused).length} refused kinds`
      );
  out['T2.circle'] = !core?.circle
    ? absent('no circle ensemble')
    : ok(
        core.circle.p95 <= T.precision.circleP95 &&
          core.circle.n === T.precision.circles,
        `p95 ${core.circle.p95} of ${T.precision.circleP95}, ${core.circle.n} discs (refusals count as infinite error)`
      );
  for (const [id, path] of [
    ['T2.keyboard', 'keyboard'],
    ['T2.pointer', 'pointer'],
  ]) {
    const p = b?.precision?.[path];
    out[id] = !p
      ? absent('no path trials')
      : ok(
          p.worstPointPx <= T.precision.pathPoint &&
            p.worstCircleRel <= T.precision.pathCircle &&
            p.refusals.length === 0 &&
            p.trials.points === 12 &&
            p.trials.circles === 6,
          `worst point ${p.worstPointPx} px, worst circle ${p.worstCircleRel}, ${p.refusals.length} refusals over ${p.trials.points} and ${p.trials.circles} trials`
        );
  }

  // (3) the paths
  const kb = b?.keyboard;
  const pt = b?.pointer;
  out['T3.keyboard'] = !kb
    ? absent('no keyboard walk')
    : ok(
        all(
          kb.failures.length === 0,
          kb.stray.pointer <= T.paths.strayEvents,
          kb.kindsDone.length === T.paths.kinds.length
        ),
        `${kb.failures.length} failures, ${kb.stray.pointer} pointer events, ${kb.kindsDone.length} of ${T.paths.kinds.length} kinds`
      );
  out['T3.pointer'] = !pt
    ? absent('no pointer walk')
    : ok(
        all(pt.failures.length === 0, pt.stray.key <= T.paths.strayEvents),
        `${pt.failures.length} failures, ${pt.stray.key} key events`
      );
  out['T3.announce'] =
    !kb || !pt
      ? absent('no walks')
      : ok(
          all(
            kb.announce.badCount.length === 0,
            pt.announce.badCount.length === 0,
            kb.announce.badFocus.length === 0,
            pt.announce.badFocus.length === 0,
            kb.axe.seriousOrCritical.length === 0,
            kb.errors.length === 0,
            pt.errors.length === 0
          ),
          `${kb.announce.commits + pt.announce.commits} commits and ${kb.announce.actions + pt.announce.actions} actions, ${kb.announce.badCount.length + pt.announce.badCount.length} with the wrong number of messages, ${kb.announce.badFocus.length + pt.announce.badFocus.length} lost focus, axe serious or critical: ${kb.axe.seriousOrCritical.length}`
        );
  const sq = b?.sequence;
  out['T3.sequence'] = !sq
    ? absent('no sequence walk')
    : ok(
        all(
          sq.keyboard.failures.length === 0,
          sq.pointer.failures.length === 0,
          sq.keyboard.announce.badCount.length === 0,
          sq.pointer.announce.badCount.length === 0
        ),
        `keyboard ${sq.keyboard.failures.length} failures, pointer ${sq.pointer.failures.length}`
      );

  // (4) the record
  out['T4.record'] = !core?.record
    ? absent('no record')
    : ok(
        core.record.status === 'pass',
        `${core.record.validateArtifactProblems} validateArtifact problems, ${core.record.quantities} quantities`
      );
  out['T4.replay'] = !core?.replay
    ? absent('no replay')
    : ok(
        core.replay.status === 'pass' &&
          kb?.failures.every(f => f !== 'record replay in the page') !== false,
        `same marks ${core.replay.sameMarks}, bit-identical ${core.replay.refinementBitIdentical}, refuses a changed image: ${core.replay.refusesChangedImage}`
      );
  out['T4.sequence'] = !core?.sequence
    ? absent('no sequence record')
    : ok(
        core.sequence.status === 'pass',
        `${core.sequence.frames} frames, time scale ${core.sequence.timeScale}`
      );

  // (5) undo and determinism
  out['T5.undo'] = !core?.undo
    ? absent('no undo property')
    : ok(
        core.undo.failures === 0 && core.undo.sequences >= 200,
        `${core.undo.failures} failures in ${core.undo.stateComparisons} state comparisons over ${core.undo.sequences} sequences`
      );
  out['T5.determinism'] = !core?.determinism
    ? absent('no determinism run')
    : ok(
        core.determinism.mismatches === 0 &&
          core.determinism.freshModuleInstance === true,
        `${core.determinism.mismatches} mismatches`
      );

  // (6) the throttled profile
  const ia = b?.interaction;
  out['T6.interaction'] = !ia
    ? absent('no interaction run')
    : ok(
        ia.valid &&
          ia.marks >= T.interaction.marks &&
          Object.values(ia.interactions).every(i => i.pass),
        Object.entries(ia.interactions)
          .map(
            ([k, i]) =>
              `${k} ${i.handlerP95}/${i.budgetMs} ms, paint ${i.paintP95}/${i.paintBudgetMs}`
          )
          .join('; ') + `; load ${ia.loadBefore} to ${ia.loadAfter}`
      );
  out['T6.sequence'] = !ia
    ? absent('no interaction run')
    : ok(
        ia.valid && ia.sequence.pass,
        `frame change ${ia.sequence.handlerP95}/${ia.sequence.budgetMs} ms (paint ${ia.sequence.paintP95})`
      );

  // (7) 2,048 pixels
  const lg = b?.large;
  out['T7.time'] = !lg
    ? absent('no large frame run')
    : ok(
        lg.totalMs <= T.tier2048.totalMs,
        `decode ${lg.workerDecodeMs.median} ms x ${T.interaction.cpuThrottle} + draw ${lg.drawMsThrottled} ms = ${lg.totalMs} ms of ${T.tier2048.totalMs}`
      );
  out['T7.memory'] =
    !lg || !probe
      ? absent('no large frame run or probe')
      : ok(
          lg.countedBytes <= T.tier2048.maxDecodedBytes &&
            lg.pageHeapDeltaBytes.peakDuringDraw <=
              T.tier2048.maxDecodedBytes &&
            probe.within === true,
          `counted ${lg.countedBytes} B, page peak ${lg.pageHeapDeltaBytes.peakDuringDraw} B over its start, bound ${T.tier2048.maxDecodedBytes}; the probe's realm peaks within 1.25 x file plus plane: ${probe.within}`
        );
  return out;
}
