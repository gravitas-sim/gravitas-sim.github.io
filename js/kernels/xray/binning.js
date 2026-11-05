// =============================================================================
// Binning by counts (Prompt 243)
// -----------------------------------------------------------------------------
// At low rates a fixed time bin holds too few counts to say anything, and a hardness or
// a rate needs a minimum number of them. Binning by counts merges CONSECUTIVE live bins
// until the chosen band's source-region counts reach `minCounts`. It conserves counts and
// exposure exactly, never joins two bins whose gap exceeds `maxGap` (so it never crosses
// a good-time gap by default), and keeps the last group of a run even if it falls short,
// flagged `short`, instead of dropping data or padding it. The merged series passes the
// contract's own validation: its dead-time statement is 'in-exposure'.
// =============================================================================

import { refused } from '../statistics/check.js';
import { bandCounts, stamp, validateSeries } from './contract.js';

const { Number } = globalThis;

function median(a) {
  const s = [...a].sort((x, y) => x - y);
  return s.length % 2
    ? s[(s.length - 1) / 2]
    : 0.5 * (s[s.length / 2 - 1] + s[s.length / 2]);
}

/**
 * @param {object} series - A counts series
 * @param {{band?: string|string[], minCounts: number, maxGap?: number}} opts
 * @returns {{status: 'ok', series: object, groups: {members: number[], counts: number, short: boolean}[]}}
 */
export function binByCounts(
  series,
  { band = 'total', minCounts, maxGap } = {}
) {
  const view = series?.status === 'ok' ? series : validateSeries(series);
  if (view.status !== 'ok') return view;
  if (!Number.isInteger(minCounts) || minCounts < 1)
    return refused('counts', 'minCounts is not a whole number of at least 1');
  const bc = bandCounts(view, band);
  if (bc.status !== 'ok') return bc;
  const widths = [];
  for (let i = 0; i < view.n; i++) if (view.live[i]) widths.push(view.width[i]);
  const gapMax = maxGap ?? median(widths);
  if (!Number.isFinite(gapMax) || gapMax < 0)
    return refused('bins', 'maxGap is not 0 or more');

  const groups = [];
  let cur = null;
  let prev = -1;
  const close = () => {
    if (cur) {
      cur.short = cur.counts < minCounts;
      groups.push(cur);
      cur = null;
    }
  };
  for (let i = 0; i < view.n; i++) {
    if (!view.live[i]) continue;
    if (cur && view.start[i] - view.stop[prev] > gapMax) close();
    if (!cur) cur = { members: [], counts: 0, short: false };
    cur.members.push(i);
    cur.counts += bc.src[i];
    prev = i;
    if (cur.counts >= minCounts) close();
  }
  close();

  const ids = view.bandIds;
  const out = {
    format: 'gravitas.counts-series/1',
    label: view.label ?? undefined,
    synthetic: view.synthetic || undefined,
    time: { ...view.time },
    start: [],
    stop: [],
    exposure: [],
    bands: view.bands.map(b => ({ ...b })),
    counts: Object.fromEntries(ids.map(id => [id, []])),
    background:
      view.background.kind === 'region'
        ? {
            kind: 'region',
            areaRatio: view.background.areaRatio,
            counts: Object.fromEntries(ids.map(id => [id, []])),
            exposure: [],
          }
        : view.background.kind === 'rate'
          ? { kind: 'rate', rate: { ...view.background.rate } }
          : { kind: 'none', negligible: true },
    deadTime: { kind: 'in-exposure' },
    gti: view.gti.map(g => [...g]),
  };
  for (const g of groups) {
    const a = g.members[0];
    const z = g.members[g.members.length - 1];
    out.start.push(view.start[a]);
    out.stop.push(view.stop[z]);
    let e = 0;
    let be = 0;
    for (const m of g.members) {
      e += view.exposure[m];
      if (view.background.kind === 'region') be += view.background.exposure[m];
    }
    out.exposure.push(e);
    if (view.background.kind === 'region') out.background.exposure.push(be);
    for (const id of ids) {
      let c = 0;
      let b = 0;
      for (const m of g.members) {
        c += view.counts[id][m];
        if (view.background.kind === 'region')
          b += view.background.counts[id][m];
      }
      out.counts[id].push(c);
      if (view.background.kind === 'region') out.background.counts[id].push(b);
    }
  }
  if (out.label === undefined) delete out.label;
  if (out.synthetic === undefined) delete out.synthetic;
  return stamp(
    {
      status: 'ok',
      series: out,
      groups,
      minCounts,
      maxGap: gapMax,
      band: bc.ids,
    },
    view
  );
}
