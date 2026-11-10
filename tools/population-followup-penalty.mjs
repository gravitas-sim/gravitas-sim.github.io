// The second stage of the follow-up's validator: PC1 to PC4 under the repaired stopping rule
// (amendment AM-F3 of followup-thresholds.json; penalty.stop = 'rounding-floor').
import { populationRates } from '../js/kernels/statistics/population.js';
import { P3_E, P3_G, P4_E } from './population-followup-samples.mjs';

const STOP = 'rounding-floor';
const maxAbs = (a, b) => Math.max(...a.map((v, j) => Math.abs(v - b[j])));

export function penaltyLegs({
  leg,
  timed,
  orc,
  thetas,
  diagRef,
  diagP3,
  refSpec,
  stream,
  penSpec,
  TOL,
  CONST,
}) {
  const ended = {};
  const note = r => {
    const e = r.penalty.diagnostic.reason;
    ended[e] = (ended[e] ?? 0) + 1;
  };
  let fits = 0;
  let notMeeting = 0;
  let unpenalisedNotConverged = 0;
  let maxIterations = 0;
  let pc2 = 0;
  const pc2Per = {};
  const count = (r, set) => {
    fits++;
    if (r.status === 'refused' || !r.penalty || !r.penalty.converged)
      notMeeting++;
    if (r.status !== 'refused' && !r.converged) unpenalisedNotConverged++;
    if (r.penalty?.diagnostic) {
      note(r);
      maxIterations = Math.max(maxIterations, r.penalty.diagnostic.iterations);
    }
    void set;
  };
  const agree = (r, oracleTheta, set) => {
    const e = maxAbs(r.penalty.theta, oracleTheta);
    pc2 = Math.max(pc2, e);
    pc2Per[set] = Math.max(pc2Per[set] ?? 0, e);
  };
  // the six reference fits
  let pc4 = 0;
  let pc4Fits = 0;
  for (const d of diagRef) {
    const [id] = d.fit.split('-');
    const r = populationRates(
      refSpec(id, { kappa: d.kappa, stop: STOP, diagnostic: true })
    );
    count(r, 'reference');
    agree(r, orc.stage1.referenceFits[d.fit].thetaNewton, 'reference');
    if (d.converged) {
      pc4 = Math.max(pc4, maxAbs(r.penalty.theta, d.theta));
      pc4Fits++;
    }
  }
  // Part A's P3 at kappa 4: PC2 (every fit) and PC4 (the fits that met the default rule)
  let p3RepairedNotMeeting = 0;
  timed('repairedPartAP3', () => {
    const objs = stream('P3');
    for (const d of diagP3) {
      const r = populationRates(
        penSpec(objs[d.replicate], P3_E, {
          kappa: 4,
          stop: STOP,
          diagnostic: true,
        })
      );
      if (!r.penalty.converged) p3RepairedNotMeeting++;
      agree(r, thetas.P3[d.replicate][0], 'P3');
      if (d.converged) {
        pc4 = Math.max(pc4, maxAbs(r.penalty.theta, d.theta));
        pc4Fits++;
      }
    }
  });
  // P3c and P4c at kappa 1, 4 and 16: PC1 (the share), PC2, and PC3 on P3c at kappa 4
  let s0 = 0;
  let s4 = 0;
  let used = 0;
  let dropped = 0;
  const perSet = {};
  for (const [name, E] of [
    ['P3c', P3_E],
    ['P4c', P4_E],
  ])
    timed(`repaired${name}`, () => {
      const objs = stream(name);
      let nm = 0;
      for (let q = 0; q < 400; q++)
        CONST.kappaGrid.forEach((kappa, k) => {
          const r = populationRates(
            penSpec(objs[q], E, { kappa, stop: STOP, diagnostic: true })
          );
          count(r, name);
          if (!r.penalty.converged) nm++;
          agree(r, thetas[name][q][k], name);
          if (name === 'P3c' && kappa === 4) {
            if (
              r.status === 'refused' ||
              !r.converged ||
              !r.penalty.converged
            ) {
              dropped++;
              return;
            }
            const un = r.bins.map(b => b.rate ?? 0);
            s0 += un.reduce((acc, u, j) => acc + (u / P3_G[j] - 1) ** 2, 0);
            s4 += r.penalty.rates.reduce(
              (acc, u, j) => acc + (u / P3_G[j] - 1) ** 2,
              0
            );
            used++;
          }
        });
      perSet[name] = { fits: 1200, notMeeting: nm };
    });
  const share = notMeeting / fits;
  leg('PC1.share', share <= 0.005 ? 'pass' : 'fail', {
    fits,
    notMeeting,
    share,
    perSet,
    endedCounts: ended,
    maxIterations,
    unpenalisedFitsNotConverged: unpenalisedNotConverged,
  });
  leg('PC2.oracle', pc2 <= TOL.penaltyOracle ? 'pass' : 'fail', {
    maxAbs: pc2,
    per: pc2Per,
    fits: 6 + diagP3.length + 2400,
    partAP3NotMeetingRepairedRule: p3RepairedNotMeeting,
  });
  const ratio = s4 / s0;
  leg('PC3.helps', ratio <= 0.9 ? 'pass' : 'fail', {
    ratio,
    used,
    dropped,
    meanSumUnpenalised: s0 / used,
    meanSumPenalised: s4 / used,
  });
  leg('PC4.sameEstimate', pc4 <= TOL.continuity ? 'pass' : 'fail', {
    maxAbs: pc4,
    fits: pc4Fits,
  });
}
