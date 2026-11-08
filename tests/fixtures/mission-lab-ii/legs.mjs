// =============================================================================
// The legs of Prompt 272's contract, evaluated (MISSION_LAB_II.md)
// -----------------------------------------------------------------------------
// Reads thresholds.json (committed first), horizons-rows.json (the public
// states the oracle used), oracle-results.json (the independent Python oracle's
// pinned output) and runs the kernel (js/mission/*) against them. Nothing here
// sets a bound: every bound is read from thresholds.json. `evaluate()` returns
// the legs and the verdict by the function committed there.
//
//   node tests/fixtures/mission-lab-ii/legs.mjs              print the table
//   node tests/fixtures/mission-lab-ii/legs.mjs --kernel     write kernel-departures.json (for the oracle's B2c)
//   node tests/fixtures/mission-lab-ii/legs.mjs --write      write results.json
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';
import { BODIES } from '../../../js/mission/bodies.js';
import { JD_J2000, jdOfDate } from '../../../js/mission/ephemeris.js';
import { hyperbolicBurn } from '../../../js/mission/patched.js';
import { statesFrom } from '../../../js/mission/solar.js';
import { computeWindow, windowCell } from '../../../js/mission/window.js';
import { labWindowProblems } from '../../../js/mission/labCore.js';
import { DEFAULT_WINDOW } from '../../../js/mission/lab/curriculum.js';
import { ephemeris } from '../../../js/mission/labReferences.js';
import {
  budgetLedger,
  fillRow,
  ledgerProblems,
  missionWorkflow,
  windowMinimum,
} from '../../../js/mission/workflow.js';

const dir = fileURLToPath(new URL('.', import.meta.url));
const read = f => JSON.parse(readFileSync(dir + f, 'utf8'));

export const load = () => ({
  T: read('thresholds.json'),
  H: read('horizons-rows.json'),
  O: read('oracle-results.json'),
  K: read('kernel-departures.json'),
});

const jdOfRows = rows => new Map(rows.map(r => [r[0], r]));

/** Horizons states as the kernel's `states(id, days)`. */
function horizonsStates(H) {
  const maps = {
    earth: jdOfRows([
      ...H.rows.earthLattice,
      ...H.rows.earthPairs,
      ...H.rows.earthDegenerate,
    ]),
    mars: jdOfRows([
      ...H.rows.marsLattice,
      ...H.rows.marsPairs,
      ...H.rows.marsDegenerate,
    ]),
  };
  return (id, days) => {
    const r = maps[id].get(JD_J2000 + days);
    if (!r) throw new Error(`no Horizons row for ${id} at ${days}`);
    return { r: r.slice(1, 4), v: r.slice(4, 7) };
  };
}

const maxAbs = (a, b) => Math.max(...a.map((x, i) => Math.abs(x - b[i])));
const EARTH_PARK = T =>
  BODIES.earth.radius + T.fixtures.inputs.parkingAltitudeKm;
const MARS_PARK = T => BODIES.mars.radius + T.fixtures.inputs.parkingAltitudeKm;

export function windowOptions() {
  return { ...DEFAULT_WINDOW };
}

/** The kernel's departures for the three pairs (pack states): what B2c asks the oracle to fly. */
export function kernelDepartures() {
  const { T } = { T: read('thresholds.json') };
  const states = statesFrom(ephemeris());
  return {
    note: 'The kernel (js/mission/window.js on the pack) velocities for the three date pairs; legs.mjs --kernel writes it and oracle.py flies it (leg B2c). The legs compare it with the live kernel, so it cannot go stale.',
    pairs: T.fixtures.datePairs.map(p => {
      const dep = jdOfDate(p.departure) - JD_J2000;
      const c = windowCell(
        { from: 'earth', to: 'mars' },
        dep,
        p.tofDays,
        states
      );
      return { id: p.id, v1: c.v1, r1: c.r1, r2: c.r2 };
    }),
  };
}

export function evaluate({ T, H, O, K } = load()) {
  const legs = [];
  const add = (id, status, measured, extra = {}) => {
    const spec = T.legs.find(l => l.id === id);
    legs.push({
      id,
      tier: spec.tier,
      name: spec.name,
      status,
      measured,
      bound: spec.bound,
      ...extra,
    });
  };
  const eph = ephemeris();
  const pack = statesFrom(eph);
  const hz = horizonsStates(H);
  const win = windowOptions();
  const w = computeWindow(win, { states: pack });
  const min = windowMinimum(w);
  const hoh = O.hohmann;

  // ---- tier a: the porkchop minimum and the Hohmann estimate ----
  const rel = Math.abs(min.totalKmS - hoh.totalKmS) / hoh.totalKmS;
  add(
    'A1',
    rel <= T.legs.find(l => l.id === 'A1').bound.relative ? 'pass' : 'fail',
    {
      kernelMinimumKmS: min.totalKmS,
      hohmannKmS: hoh.totalKmS,
      relative: rel,
    }
  );
  const minJd = JD_J2000 + min.departDay;
  const dDays = Math.abs(minJd - hoh.epochJd);
  add(
    'A2',
    hoh.epochJd !== null && dDays <= T.legs.find(l => l.id === 'A2').bound.days
      ? 'pass'
      : 'fail',
    {
      kernelMinimumJd: minJd,
      hohmannEpochJd: hoh.epochJd,
      differenceDays: dDays,
    }
  );
  const dTof = Math.abs(min.tofDays - hoh.tofDays) / hoh.tofDays;
  add(
    'A3',
    dTof <= T.legs.find(l => l.id === 'A3').bound.relative ? 'pass' : 'fail',
    {
      kernelTofDays: min.tofDays,
      hohmannTofDays: hoh.tofDays,
      relative: dTof,
    }
  );
  add('A4', min.interior ? 'pass' : 'fail', { row: min.row, col: min.col });

  // ---- A5: the burn against its closed form ----
  const a5 = O.hyperbolic.map(h => ({
    vinf: h.vinf,
    earth: Math.abs(
      hyperbolicBurn(BODIES.earth.GM, EARTH_PARK(T), h.vinf).dv - h.earth
    ),
    mars: Math.abs(
      hyperbolicBurn(BODIES.mars.GM, MARS_PARK(T), h.vinf).dv - h.mars
    ),
  }));
  const a5max = Math.max(...a5.flatMap(x => [x.earth, x.mars]));
  add(
    'A5',
    a5max <= T.legs.find(l => l.id === 'A5').bound.absoluteKmS
      ? 'pass'
      : 'fail',
    { maxDifferenceKmS: a5max }
  );

  // ---- the ledgers of the three pairs on the pack ----
  const base = {
    from: 'earth',
    to: 'mars',
    parkingAltitudeKm: T.fixtures.inputs.parkingAltitudeKm,
    captureOrbit: T.fixtures.inputs.captureOrbit,
    launchLossesKmS: T.fixtures.inputs.launchLossesKmS,
    correctionsKmS: T.fixtures.inputs.correctionsKmS,
    dryKg: T.fixtures.inputs.dryKg,
    ispS: T.fixtures.inputs.ispS,
  };
  const span = {
    startDay: O.packRange.startJd - JD_J2000,
    stopDay: O.packRange.stopJd - JD_J2000,
  };
  const flows = T.fixtures.datePairs.map(p =>
    missionWorkflow({
      states: pack,
      span,
      departDay: jdOfDate(p.departure) - JD_J2000,
      tofDays: p.tofDays,
      ...base,
    })
  );
  let a6 = 0;
  let a7 = 0;
  let a8 = 0;
  let a7shape = true;
  for (const f of flows) {
    const L = f.ledger;
    const ve = L.exhaustKmS;
    const closed = L.dryKg * (Math.exp(L.spacecraftKmS / ve) - 1);
    a6 = Math.max(a6, Math.abs(L.propellantKg - closed) / closed);
    for (const r of L.rows)
      if (r.massBeforeKg !== undefined)
        a6 = Math.max(
          a6,
          Math.abs(r.propellantKg - (r.massBeforeKg - r.massAfterKg)) /
            r.propellantKg
        );
    const sum = L.rows.reduce((s, r) => s + r.dvKmS, 0);
    a7 = Math.max(
      a7,
      Math.abs(L.totalKmS - sum) / L.totalKmS,
      Math.abs(L.spacecraftKmS - (L.totalKmS - L.rows[0].dvKmS)) / L.totalKmS
    );
    a7shape &&= L.rows.every(
      r => r.id && Number.isFinite(r.dvKmS) && r.unit === 'km/s' && r.assumes
    );
    a7shape &&=
      L.rows.map(r => r.id).join() ===
      'launch,departure,corrections,arrival,capture';
    a8 = Math.max(
      a8,
      Math.abs(
        L.rows[0].dvKmS -
          (Math.sqrt(H.constants.GM_earth / EARTH_PARK(T)) +
            T.fixtures.inputs.launchLossesKmS)
      )
    );
  }
  const b = id => T.legs.find(l => l.id === id).bound;
  add('A6', a6 <= b('A6').relative ? 'pass' : 'fail', { maxRelative: a6 });
  add('A7', a7 <= b('A7').relative && a7shape ? 'pass' : 'fail', {
    maxRelative: a7,
    rowsDescribed: a7shape,
  });
  add('A8', a8 <= b('A8').absoluteKmS ? 'pass' : 'fail', {
    maxDifferenceKmS: a8,
  });

  // ---- A9: the grid in row ranges ----
  const nt = win.tofSteps;
  const diffs = [];
  for (const cuts of [[50], [1], [75, 76]]) {
    const edges = [0, ...cuts, win.departSteps];
    let n = 0;
    for (let s = 0; s < edges.length - 1; s++) {
      const [a, z] = [edges[s], edges[s + 1]];
      const out = {
        c3: new Float64Array((z - a) * nt),
        vinf: new Float64Array((z - a) * nt),
        total: new Float64Array((z - a) * nt),
        status: new Uint8Array((z - a) * nt),
      };
      // ranges are run in reverse order of submission: any order gives the same cells
      for (let r = z - 1; r >= a; r--) fillRow(win, r, pack, out, a);
      for (let k = 0; k < out.total.length; k++) {
        const g = a * nt + k;
        for (const key of ['c3', 'vinf', 'total'])
          if (!Object.is(out[key][k], w[key][g])) n++;
        if (out.status[k] !== w.cellStatus[g]) n++;
      }
    }
    diffs.push(n);
  }
  add('A9', diffs.every(n => n === 0) ? 'pass' : 'fail', {
    differencesPerSplit: diffs,
  });

  // ---- tier b ----
  add('B1', 'NOT RUN', null, {
    reason: T.legs.find(l => l.id === 'B1').declaredNotRunBeforeAnyRun,
  });
  const pairsOut = T.fixtures.datePairs.map((p, i) => {
    const o = O.pairs[i];
    const dep = jdOfDate(p.departure) - JD_J2000;
    const cH = windowCell({ from: 'earth', to: 'mars' }, dep, p.tofDays, hz);
    const cP = windowCell({ from: 'earth', to: 'mars' }, dep, p.tofDays, pack);
    const vinfD = Math.sqrt(cP.c3);
    return {
      id: p.id,
      converged: o.converged,
      same: o.converged
        ? Math.max(maxAbs(cH.v1, o.v1), maxAbs(cH.v2, o.v2))
        : null,
      burnDep: o.converged
        ? Math.abs(
            hyperbolicBurn(BODIES.earth.GM, EARTH_PARK(T), vinfD).dv - o.burnDep
          )
        : null,
      burnArr: o.converged
        ? Math.abs(
            hyperbolicBurn(BODIES.mars.GM, MARS_PARK(T), cP.vinf).dv - o.burnArr
          )
        : null,
      ledger: o.converged
        ? budgetLedger({
            ...base,
            vinfDeparture: o.vinfDep,
            vinfArrival: o.vinfArr,
          })
        : null,
      oracleLedger: o.ledger,
    };
  });
  const allConv = pairsOut.every(p => p.converged);
  add(
    'B2a',
    allConv && Math.max(...pairsOut.map(p => p.same)) <= b('B2a').absoluteKmS
      ? 'pass'
      : 'fail',
    {
      maxComponentDifferenceKmS: allConv
        ? Math.max(...pairsOut.map(p => p.same))
        : null,
      oracleConverged: pairsOut.map(p => p.converged),
    }
  );
  const b2b = allConv
    ? Math.max(...pairsOut.flatMap(p => [p.burnDep, p.burnArr]))
    : null;
  add('B2b', allConv && b2b <= b('B2b').absoluteKmS ? 'pass' : 'fail', {
    maxBurnDifferenceKmS: b2b,
  });
  // B2c: the pinned kernel departures equal the live kernel's, and the oracle flew them
  const live = kernelDepartures();
  const stale = Math.max(
    ...live.pairs.flatMap((p, i) => [
      maxAbs(p.v1, K.pairs[i].v1),
      maxAbs(p.r2, K.pairs[i].r2),
    ])
  );
  const flown = O.kernelFlown?.map(f => f.missKm);
  add(
    'B2c',
    flown && stale <= 1e-9 && Math.max(...flown) <= b('B2c').absoluteKm
      ? 'pass'
      : 'fail',
    { oracleMissKm: flown ?? null, pinnedVersusLiveKmS: stale }
  );

  // B3: the subgrid
  const sub = O.grid.cells;
  let excluded = 0;
  let worst = 0;
  let acceptMismatch = 0;
  let oMin = null;
  let kMin = null;
  let okCells = 0;
  for (const c of sub) {
    const row = c.dep * 5;
    const col = c.tofIdx * 5;
    const k = row * nt + col;
    const kOk = w.cellStatus[k] === 0;
    if (c.status === 'noConverge') {
      excluded++;
      continue;
    }
    if (c.status === 'degenerate') {
      if (kOk) acceptMismatch++;
      continue;
    }
    if (!kOk) {
      acceptMismatch++;
      continue;
    }
    okCells++;
    worst = Math.max(worst, Math.abs(w.total[k] - c.total));
    if (!oMin || c.total < oMin.v)
      oMin = { v: c.total, dep: c.dep, tofIdx: c.tofIdx };
    if (!kMin || w.total[k] < kMin.v)
      kMin = { v: w.total[k], dep: c.dep, tofIdx: c.tofIdx };
  }
  const minDiff = Math.abs(oMin.v - kMin.v);
  const adjacent =
    Math.max(
      Math.abs(oMin.dep - kMin.dep),
      Math.abs(oMin.tofIdx - kMin.tofIdx)
    ) <= 1;
  const exFrac = excluded / sub.length;
  const bb = b('B3');
  add(
    'B3',
    worst <= bb.cellAbsoluteKmS &&
      minDiff <= bb.minimumAbsoluteKmS &&
      adjacent &&
      acceptMismatch === 0 &&
      exFrac <= bb.excludedFraction
      ? 'pass'
      : 'fail',
    {
      cells: sub.length,
      comparedCells: okCells,
      excluded,
      acceptanceMismatches: acceptMismatch,
      worstCellDifferenceKmS: worst,
      minimumDifferenceKmS: minDiff,
      oracleMinimum: oMin,
      kernelMinimum: kMin,
    }
  );
  add('B4', 'NOT RUN', null, {
    reason: T.legs.find(l => l.id === 'B4').declaredNotRunBeforeAnyRun,
  });
  add('C', 'not applicable', null, {
    reason: T.legs.find(l => l.id === 'C').rule,
  });

  // ---- tier d ----
  const dg = O.degenerate;
  const depDay = H.degenerate.departureJd - JD_J2000;
  const tofP = H.degenerate.arrivalJd - H.degenerate.departureJd;
  const tofC = H.degenerate.controlArrivalJd - H.degenerate.departureJd;
  const e = { from: 'earth', to: 'mars' };
  const dPack = windowCell(e, depDay, tofP, pack);
  const dHz = windowCell(e, depDay, tofP, hz);
  const cPack = windowCell(e, depDay, tofC, pack);
  const dOk =
    dg.pair.sine < b('D1').sine &&
    dPack.status === 'antipodal' &&
    dHz.status === 'antipodal' &&
    Number.isNaN(dPack.total) &&
    cPack.status === 'ok' &&
    dg.control.converged === true;
  add('D1', dOk ? 'pass' : 'fail', {
    oracleSine: dg.pair.sine,
    controlOracleSine: dg.control.sine,
    kernelPack: dPack.status,
    kernelHorizons: dHz.status,
    control: cPack.status,
  });
  const win0 = {
    ...win,
    departStart: span.stopDay - win.departSpan - win.tofMax,
  };
  const d2 = [
    labWindowProblems(win0),
    labWindowProblems({ ...win0, departStart: win0.departStart + 1 }),
    labWindowProblems({ ...win0, departStart: span.startDay - 1 }),
  ];
  const wf = missionWorkflow({
    states: pack,
    span,
    departDay: span.stopDay - 100,
    tofDays: 101,
    ...base,
  });
  const d2ok =
    d2[0].length === 0 &&
    d2[1].length === 1 &&
    d2[1][0].code === 'outOfRange' &&
    d2[2][0]?.code === 'outOfRange' &&
    wf.ok === false &&
    wf.problems[0].code === 'outOfRange' &&
    !('transfer' in wf);
  add('D2', d2ok ? 'pass' : 'fail', {
    atEnd: d2[0],
    oneDayPast: d2[1],
    beforeStart: d2[2],
    workflow: wf.problems,
  });
  const bad = [
    [{ dryKg: 0 }, 'dryKg'],
    [{ dryKg: -5 }, 'dryKg'],
    [{ ispS: 0 }, 'ispS'],
    [{ correctionsKmS: -0.1 }, 'correctionsKmS'],
    [
      { captureOrbit: { periapsisAltitudeKm: 300, apoapsisRadiusKm: 3000 } },
      'captureOrbit.apoapsisRadiusKm',
    ],
    [{ parkingAltitudeKm: -1 }, 'parkingAltitudeKm'],
    [{ vinfDeparture: NaN }, 'vinfDeparture'],
    [{ vinfArrival: -2 }, 'vinfArrival'],
    [{ to: 'pluto' }, 'to'],
    [{ to: 'earth' }, 'to'],
  ];
  const good = { ...base, vinfDeparture: 3, vinfArrival: 2.7 };
  const results = bad.map(([patch, path]) => {
    const r = budgetLedger({ ...good, ...patch });
    return {
      path,
      refused:
        r.ok === false &&
        r.problems.some(p => p.path === path) &&
        !('rows' in r),
    };
  });
  const goodOk =
    budgetLedger(good).ok === true && ledgerProblems(good).length === 0;
  add('D3', results.every(r => r.refused) && goodOk ? 'pass' : 'fail', {
    refused: results,
    validAccepted: goodOk,
  });

  // ---- the verdict, by the function committed in thresholds.json ----
  const statusOf = id => legs.find(l => l.id === id).status;
  const tiersOk = legs
    .filter(l => !['B1', 'B4'].includes(l.id))
    .every(l => l.status === 'pass' || l.status === 'not applicable');
  const allPass = legs.every(
    l => l.status === 'pass' || l.status === 'not applicable'
  );
  const verdict = allPass
    ? 'A'
    : tiersOk && statusOf('B1') === 'NOT RUN' && statusOf('B4') === 'NOT RUN'
      ? 'B'
      : 'C';
  return {
    format: 'gravitas.mission-lab-ii-results',
    prompt: 272,
    window: { options: win, minimum: min, counts: w.counts },
    legs,
    counts: {
      pass: legs.filter(l => l.status === 'pass').length,
      fail: legs.filter(l => l.status === 'fail').length,
      notRun: legs.filter(l => l.status === 'NOT RUN').length,
      notApplicable: legs.filter(l => l.status === 'not applicable').length,
    },
    verdict,
    reported: {
      valleyAtHohmannEpoch: (() => {
        // not a leg and no bound: how flat the valley is, to read A2 by
        const row = Math.round(hoh.epochJd - JD_J2000 - win.departStart);
        let best = Infinity;
        for (let j = 0; j < nt; j++) {
          const k = row * nt + j;
          if (w.cellStatus[k] === 0 && w.total[k] < best) best = w.total[k];
        }
        return {
          row,
          minimumInThatRowKmS: best,
          excessOverTheWindowMinimumKmS: best - min.totalKmS,
        };
      })(),
      ledgerAgainstOracleAtOracleVinf: pairsOut.map(p =>
        p.ledger
          ? {
              id: p.id,
              maxRowDifferenceKmS: Math.max(
                ...p.ledger.rows.map((r, i) =>
                  Math.abs(r.dvKmS - p.oracleLedger.rows[i].dvKmS)
                )
              ),
              propellantRelative:
                Math.abs(p.ledger.propellantKg - p.oracleLedger.propellantKg) /
                p.oracleLedger.propellantKg,
            }
          : { id: p.id, note: 'oracle did not converge' }
      ),
    },
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--kernel')) {
    writeFileSync(
      dir + 'kernel-departures.json',
      JSON.stringify(kernelDepartures(), null, 1) + '\n'
    );
    process.stdout.write('wrote kernel-departures.json\n');
  } else {
    const r = evaluate();
    if (process.argv.includes('--write'))
      writeFileSync(dir + 'results.json', JSON.stringify(r, null, 1) + '\n');
    for (const l of r.legs)
      process.stdout.write(
        `${l.id.padEnd(4)} ${l.status.padEnd(15)} ${l.name}\n`
      );
    process.stdout.write(
      `counts ${JSON.stringify(r.counts)} verdict ${r.verdict}\n`
    );
  }
}
