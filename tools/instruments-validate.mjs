#!/usr/bin/env node
// =============================================================================
// npm run instruments:validate
// -----------------------------------------------------------------------------
// The instrument library's cross-checks (tests/fixtures/instruments/
// thresholds.json, rows o1 to o6): each recomputes one cited value from OTHER
// cited values by a relation that does not use the value it checks, and
// compares within the bound that file fixed before the table existed. A check
// whose inputs are not all in the table is N/A with the missing field named,
// never a pass. Nothing here changes the table; a leg that fails is a finding
// about the table or the reading of its source, recorded and not widened.
// =============================================================================

import { readFile } from 'node:fs/promises';
import { readSourceTable } from './build-instruments.mjs';
import { BANDS } from '../js/data/radiation/bandpasses.js';
import { decodeBand } from '../js/kernels/radiation/photometry.js';
import { photonRate } from '../js/kernels/detector/bands.js';
import { inUnit, pick } from '../js/instruments/index.js';

const ARCSEC_PER_RAD = 206264.80624709636;
const C = 299792458;
const SDSS = new Set(['u', 'g', 'r', 'i', 'z']);

const rel = (a, b) => Math.abs(a - b) / Math.abs(b);

/** @returns {Array<{id: string, facility: string, status: string, value?: number, bound?: number, detail: string}>} */
export function runLegs(table, thr) {
  const rows = [];
  const add = (id, facility, status, detail, value, bound) =>
    rows.push({
      id,
      facility,
      status,
      detail,
      ...(value !== undefined ? { value, bound } : {}),
    });
  const na = (id, facility, missing) =>
    add(id, facility, 'N/A', `needs ${missing}`);
  for (const f of table.facilities) {
    if (f.typical) continue;
    const site = f.site ? table.sites[f.site] : undefined;
    for (const ins of f.instruments) {
      const fid = `${f.id}/${ins.id}`;
      const t = f.telescope;
      if (ins.kind === 'imager') {
        // o1: the plate-scale relation
        const need1 = ['pixelSize', 'pixelScale']
          .filter(k => !ins[k])
          .concat(['aperture', 'focalRatio'].filter(k => !t[k]));
        if (need1.length) na('o1.plate-scale', fid, need1.join(', '));
        else {
          const focal = pick(t.focalRatio) * inUnit(t.aperture, 'm');
          const pred = (ARCSEC_PER_RAD * inUnit(ins.pixelSize, 'm')) / focal;
          const got = inUnit(ins.pixelScale, 'arcsec');
          const e = rel(pred, got);
          add(
            'o1.plate-scale',
            fid,
            e <= thr.oracle['o1.plate-scale'].bound.relative ? 'pass' : 'fail',
            `${got.toFixed(4)} arcsec/pix stated, ${pred.toFixed(4)} from pixel size and focal length`,
            e,
            thr.oracle['o1.plate-scale'].bound.relative
          );
        }
        // o2: the field against the array
        const bound2 = thr.oracle['o2.field'].bound.relative;
        const needs = ['pixelScale', 'sensorWidth', 'sensorHeight'].filter(
          k => !ins[k]
        );
        if (needs.length || !(ins.fieldWidth || ins.fieldArea))
          na(
            'o2.field',
            fid,
            needs
              .concat(ins.fieldWidth || ins.fieldArea ? [] : ['a field'])
              .join(', ')
          );
        else {
          const s = inUnit(ins.pixelScale, 'deg');
          const n = ins.sensorCount?.v ?? 1;
          if (n === 1 && ins.fieldWidth && ins.fieldHeight) {
            for (const [name, px, fld] of [
              ['width', ins.sensorWidth.v, ins.fieldWidth],
              ['height', ins.sensorHeight.v, ins.fieldHeight],
            ]) {
              const pred = px * s;
              const got = inUnit(fld, 'deg');
              const e = rel(pred, got);
              add(
                'o2.field',
                fid,
                e <= bound2 ? 'pass' : 'fail',
                `${name}: ${got.toFixed(4)} deg stated, ${pred.toFixed(4)} from ${px} px`,
                e,
                bound2
              );
            }
          } else {
            const pred = n * ins.sensorWidth.v * ins.sensorHeight.v * s * s;
            const got = ins.fieldArea
              ? inUnit(ins.fieldArea, 'deg2')
              : inUnit(ins.fieldWidth, 'deg') * inUnit(ins.fieldHeight, 'deg');
            const e = rel(pred, got);
            add(
              'o2.field',
              fid,
              e <= bound2 ? 'pass' : 'fail',
              `area: ${got.toFixed(3)} deg2 stated, ${pred.toFixed(3)} from ${n} sensors`,
              e,
              bound2
            );
          }
        }
        // o4: the Rubin depth formula, wherever a band has all four numbers
        const b4 = thr.oracle['o4.rubin-m5'].bound.absoluteMag;
        for (const [b, p] of Object.entries(ins.bands ?? {})) {
          const sky = site?.skyBrightness?.[b];
          if (p.depth5sigma && p.throughputConstant && p.seeing && sky) {
            const pred =
              p.throughputConstant.v +
              0.5 * (sky.v - 21) +
              2.5 * Math.log10(0.7 / p.seeing.v);
            const e = Math.abs(pred - p.depth5sigma.v);
            add(
              'o4.rubin-m5',
              `${fid}:${b}`,
              e <= b4 ? 'pass' : 'fail',
              `${p.depth5sigma.v} stated, ${pred.toFixed(3)} from C_m, m_sky and seeing`,
              e,
              b4
            );
          }
        }
        // o5: a zero point implies a throughput a telescope can have
        const [lo, hi] = [
          thr.oracle['o5.zero-point-throughput'].bound.throughputLow,
          thr.oracle['o5.zero-point-throughput'].bound.throughputHigh,
        ];
        for (const [b, p] of Object.entries(ins.bands ?? {})) {
          if (!p.zeroPoint || !SDSS.has(b)) continue;
          if (!t.aperture) {
            na('o5.zero-point-throughput', `${fid}:${b}`, 'aperture');
            continue;
          }
          const d = inUnit(t.aperture, 'm');
          const o = t.obstructionDiameter
            ? inUnit(t.obstructionDiameter, 'm')
            : t.secondaryDiameter
              ? inUnit(t.secondaryDiameter, 'm')
              : undefined;
          if (o === undefined) {
            na('o5.zero-point-throughput', `${fid}:${b}`, 'an obstruction');
            continue;
          }
          const area = (Math.PI / 4) * (d * d - o * o);
          const band = decodeBand(BANDS.find(x => x.id === b));
          const ideal = 2.5 * Math.log10(photonRate(band, 0, area, 1));
          const thru = 10 ** (0.4 * (p.zeroPoint.v - ideal));
          add(
            'o5.zero-point-throughput',
            `${fid}:${b}`,
            thru >= lo && thru <= hi ? 'pass' : 'fail',
            `zero point ${p.zeroPoint.v}, ideal ${ideal.toFixed(2)}, implied throughput ${thru.toFixed(2)}`,
            thru,
            hi
          );
        }
        // o6: gain against full well and a 16-bit converter
        if (ins.gain && ins.fullWell) {
          const fw = pick(ins.fullWell, 'hi');
          const g = pick(ins.gain, 'hi');
          const counts = fw / g;
          const ok =
            counts <=
            65535 * (1 + thr.oracle['o6.gain-full-well'].bound.relative);
          add(
            'o6.gain-full-well',
            fid,
            ok ? 'pass' : 'fail',
            `${fw} e- over ${g} e-/ADU is ${counts.toFixed(0)} counts`,
            counts,
            65535
          );
        } else
          na(
            'o6.gain-full-well',
            fid,
            ['gain', 'fullWell'].filter(k => !ins[k]).join(', ')
          );
      } else if (ins.kind === 'receiver') {
        if (t.collectingArea && t.aperture) {
          const pred = Math.PI * (inUnit(t.aperture, 'm') / 2) ** 2;
          const e = rel(pred, t.collectingArea.v);
          const b = thr.oracle['o3.radio-area'].bound.relative;
          add(
            'o3.radio-area',
            fid,
            e <= b ? 'pass' : 'fail',
            `${t.collectingArea.v} m2 stated, ${pred.toFixed(2)} from the diameter`,
            e,
            b
          );
        } else na('o3.radio-area', fid, 'collectingArea, aperture');
        if (ins.beamFwhm && ins.beamReferenceFrequency && t.aperture) {
          const lambda = C / inUnit(ins.beamReferenceFrequency, 'Hz');
          const ratio =
            inUnit(ins.beamFwhm, 'rad') / (lambda / inUnit(t.aperture, 'm'));
          const { lambdaOverDLow: a, lambdaOverDHigh: z } =
            thr.oracle['o3b.radio-beam'].bound;
          add(
            'o3b.radio-beam',
            fid,
            ratio >= a && ratio <= z ? 'pass' : 'fail',
            `beam is ${ratio.toFixed(3)} lambda/D`,
            ratio,
            z
          );
        } else
          na(
            'o3b.radio-beam',
            fid,
            'beamFwhm, beamReferenceFrequency, aperture'
          );
      }
    }
  }
  return rows;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const table = await readSourceTable();
  const thr = JSON.parse(
    await readFile('tests/fixtures/instruments/thresholds.json', 'utf8')
  );
  const rows = runLegs(table, thr);
  for (const r of rows)
    console.log(
      `${r.status.padEnd(4)} ${r.id.padEnd(26)} ${r.facility.padEnd(26)} ${r.detail}`
    );
  const n = s => rows.filter(r => r.status === s).length;
  console.log(
    `${rows.length} legs: ${n('pass')} pass, ${n('fail')} fail, ${n('N/A')} N/A`
  );
  process.exit(n('fail') ? 1 : 0);
}
