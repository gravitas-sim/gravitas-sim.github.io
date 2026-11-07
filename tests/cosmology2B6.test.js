// =============================================================================
// Cosmology II leg B6, the published ages, and its pinned result (Prompt 255, after the data arrived)
// -----------------------------------------------------------------------------
// tests/fixtures/cosmology2/b6-thresholds.json fixed the comparison rule (tolerance terms from the printed
// precision, the radiation density supplied, the allowance for the radiation and neutrino difference, the
// verdict function) before the kernel was run on the inputs. tools/cosmology2-b6.mjs recomputes the terms from
// the printed numbers in authentic/published-table.json, runs the kernel and judges. This holds the pinned
// table, runs it live once and states what a pass does and does not establish. B6 is age-only.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { runB6, gateFromB6, printedValues } from '../tools/cosmology2-b6.mjs';

const text = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const read = rel => JSON.parse(text(rel));
const DIR = 'tests/fixtures/cosmology2';
const RULE = read(`${DIR}/b6-thresholds.json`);
const RES = read(`${DIR}/b6-results.json`);
const FAILED = read(`${DIR}/b6-failed-legs.json`);
const SOURCES = read(`${DIR}/authentic/SOURCES.json`);
const OLD = read(`${DIR}/results.json`);
const FOLLOWUP = read(`${DIR}/followup-results.json`);

describe('the authentic data and their sources', () => {
  test('the data file is byte for byte the one the rule pins, and SOURCES.json says so', () => {
    const sha = createHash('sha256')
      .update(
        readFileSync(
          new URL(`../${DIR}/authentic/published-table.json`, import.meta.url)
        )
      )
      .digest('hex');
    expect(sha).toBe(RULE.data.sha256);
    expect(sha).toBe(SOURCES.dataFile.sha256);
    expect(RES.meta.dataSha256).toBe(sha);
    expect(RES.meta.dataShaMatchesRule).toBe(true);
  });
  test('every source has an identifier, a 64-hex sha256 of the paper and the terms as read; no path to a home directory', () => {
    expect(SOURCES.sources.map(s => s.identifier)).toEqual([
      'arXiv:1807.06209',
      'arXiv:astro-ph/0609593',
      'arXiv:astro-ph/9905116',
    ]);
    for (const s of SOURCES.sources) {
      expect(s.pdfSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(s.termsAsRead).toMatch(/licen[sc]e/);
    }
    for (const f of [
      'authentic/published-table.json',
      'authentic/SOURCES.json',
      'b6-thresholds.json',
      'b6-results.json',
    ])
      expect(text(`${DIR}/${f}`)).not.toMatch(/\/Users\/|\/home\/|C:\\\\/);
  });
  test('no distance table was found: the leg is age-only, and the rule, the sources and the verdict all say so', () => {
    expect(RULE.data.noDistanceTable).toMatch(/AGE-ONLY/);
    expect(SOURCES.notFound).toMatch(/age-only/);
    expect(RULE.verdictLanguage.ifPass).toMatch(
      /does NOT establish any distance/
    );
    expect(RES.gate.original.productVerdict).toMatch(/age-only B6/);
    expect(RES.gate.followup.productVerdict).toMatch(/age-only B6/);
  });
});

describe('the committed rule', () => {
  test('the rule records its amendment of the committed B6 before the kernel ran, widened and not read from a result', () => {
    expect(RULE.amendments.map(a => a.id)).toEqual(['AM3']);
    expect(RULE.amendments[0].when).toMatch(/before the kernel was run/);
    expect(RULE.amendments[0].boundMoved).toBe(true);
    expect(RULE.amendments[0].boundMovedHow).toMatch(
      /no term is read from a result/
    );
    expect(RULE.committed).toMatch(/before the kernel was called/);
    expect(RULE.rule).toMatch(/No term is read from the kernel's result/);
  });
  test('the committed tolerance terms equal the terms recomputed from the printed numbers', () => {
    expect(RES.meta.ruleReproduces).toBe(true);
    const live = runB6();
    expect(live.meta.ruleReproduces).toBe(true);
    expect(live.meta.terms.planck.tolerance).toBeCloseTo(
      RULE.legs[0].derived.tolerance,
      14
    );
  });
  test('the radiation supplied is the one density printed in the data (Wright), scaled by the leg H0 squared, with flat closure for Planck', () => {
    const P = printedValues();
    expect(RULE.radiation.supplied).toMatch(/4\.165e-5 \/ h\^2/);
    for (const r of RES.rows.filter(x => /^B6\.(planck|wright)/.test(x.id))) {
      const h = r.measured.H0 / 100;
      expect(r.measured.OrSupplied).toBeCloseTo(P.wright.orH2 / (h * h), 14);
    }
    expect(RES.rows[0].measured.flat).toBe(true);
  });
  test('the allowance fraction is a stated half, and the rule says why one neutrino species is at most a third', () => {
    expect(RULE.radiation.allowanceFraction).toBe(0.5);
    expect(RULE.radiation.planckDifference).toMatch(/one third/);
  });
});

describe('the pinned table and the live run agree', () => {
  const live = runB6();
  test('every row, status and measured number reproduces', () => {
    expect(JSON.parse(JSON.stringify(live.rows))).toEqual(RES.rows);
  });
  test('the failed-legs file is exactly the failing rows, and a failing leg would stay failing', () => {
    expect(FAILED.legs.map(l => l.id)).toEqual(
      RES.rows.filter(r => r.status === 'fail').map(r => r.id)
    );
    expect(RES.rows.map(r => r.id)).toEqual([
      ...RULE.legs.map(l => l.id),
      'B6.reported.planckMarginalised',
      'B6.reported.closedFormWright',
    ]);
  });
  test('each judged leg is within its committed tolerance, by the rule and not by a literal one-unit reading', () => {
    const judged = RES.rows.filter(r => /^B6\.(planck|wright)/.test(r.id));
    expect(judged.map(r => r.status)).toEqual(['pass', 'pass', 'pass']);
    for (const r of judged)
      expect(Math.abs(r.measured.signedRelativeDifference)).toBeLessThanOrEqual(
        r.measured.toleranceFromRule
      );
  });
  test('what the legs can and cannot separate is recorded: the Planck leg is wider than the radiation effect, the first Wright leg is not', () => {
    const [planck, wrightA, wrightB] = RES.rows;
    // the literal committed reading (one unit of the last printed digit) is reported, and fails for Planck
    expect(planck.measured.literalCommittedReadingOneUnit).toBe('fail');
    expect(wrightA.measured.literalCommittedReadingOneUnit).toBe('pass');
    expect(wrightB.measured.literalCommittedReadingOneUnit).toBe('pass');
    // with the radiation set to zero the Planck leg still passes (so it cannot test radiation) ...
    expect(planck.measured.controlRadiationZeroWithinTolerance).toBe(true);
    // ... and the first Wright leg does not (it depends on the radiation term)
    expect(wrightA.measured.controlRadiationZeroWithinTolerance).toBe(false);
  });
  test('the empty-universe-with-radiation closed form agrees with the kernel to rounding (a consistency note, not a leg)', () => {
    const r = RES.rows.find(x => x.id === 'B6.reported.closedFormWright');
    expect(r.status).toBe('reported');
    expect(r.measured.H0_97_78.kernel).toBeCloseTo(
      r.measured.H0_97_78.closedForm,
      8
    );
    expect(r.measured.H0_977_8.kernel).toBeCloseTo(
      r.measured.H0_977_8.closedForm,
      8
    );
  });
});

describe('the product verdict by the committed function, and the consumers clause', () => {
  test('B6 measured: pass; the original form stays C, the follow-up form is A, both carry the age-only qualifier', () => {
    expect(RES.gate.b6).toBe('pass');
    expect(RES.gate.original.kernelVerdict).toBe(OLD.gate.kernelVerdict);
    expect(RES.gate.followup.kernelVerdict).toBe(
      FOLLOWUP.gate.followupKernelVerdict
    );
    expect(RES.gate.original.productVerdict).toBe('C (age-only B6)');
    expect(RES.gate.followup.productVerdict).toBe('A (age-only B6)');
  });
  test('the clause is unmet in the original form and met on the letter in the follow-up form, and reporting it lifts nothing', () => {
    expect(RES.gate.original.consumersClause).toMatch(/^unmet/);
    expect(RES.gate.followup.consumersClause).toMatch(/^met on the letter/);
    expect(RES.gate.followup.consumersClause).toMatch(/NOT lifted/);
    expect(RES.gate.followup.consumersClause).toMatch(/Carl/);
  });
  test('a failed B6 leg gives NOT ESTABLISHED in both forms', () => {
    const g = gateFromB6([
      { id: 'B6.x', status: 'pass' },
      { id: 'B6.y', status: 'fail' },
    ]);
    expect(g.b6).toBe('fail');
    expect(g.original.productVerdict).toMatch(
      /^NOT ESTABLISHED \(B6 FAILED: B6\.y\)/
    );
    expect(g.followup.consumersClause).toMatch(/^unmet/);
  });
  test('the first gate and the follow-up are not edited: their pinned product verdicts still say B6 was not run', () => {
    expect(OLD.gate.productVerdict).toMatch(/B6 NOT RUN/);
    expect(FOLLOWUP.gate.productVerdict).toMatch(/B6 NOT RUN/);
    expect(OLD.gate.kernelVerdict).toBe('C');
  });
  test('nothing student-facing is built: the kernel is not re-exported and the tool imports only the kernel', () => {
    const src = text('tools/cosmology2-b6.mjs');
    expect(src.match(/from '\.\.\/js\/[^']+'/g)).toEqual([
      "from '../js/kernels/cosmology/late/index.js'",
    ]);
    expect(text('js/kernels/cosmology/index.js')).not.toMatch(/late/);
  });
});
