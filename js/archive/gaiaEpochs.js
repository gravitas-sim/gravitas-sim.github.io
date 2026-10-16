// =============================================================================
// Gaia DR3 epoch photometry, from VizieR, as a gravitas.observation/1
// -----------------------------------------------------------------------------
// The one table the archive import accepts (VO_ARCHIVE_GATE.md), and the
// curated descriptor it needs, because the service's own metadata is not
// enough to convert it honestly:
//
//   VizieR says                    Gaia's DR3 data model says
//   TimeG: "JD-2455197.5", in d    barycentric JD in TCB - 2 455 197.5 (day)
//   FG, e_FG: no unit              e-/s
//   rights_uri: VizieR's page      CC BY-NC 3.0 IGO, credit ESA/Gaia/DPAC
//
// So the descriptor carries each of those facts, cited, and the service's
// metadata is only a check: a unit the service does state must be the one
// the descriptor expects, or the conversion stops (UnitError) rather than
// guess.
//
// The data model:
// https://gea.esac.esa.int/archive/documentation/GDR3/Gaia_archive/chap_datamodel/sec_dm_photometry/ssec_dm_epoch_photometry.html
// =============================================================================

export const DESCRIPTOR = Object.freeze({
  table: 'I/355/epphot',
  facility: 'Gaia (ESA), DR3 epoch photometry, via CDS VizieR',
  credit: 'ESA/Gaia/DPAC (Gaia DR3 epoch photometry), served by CDS VizieR',
  license: Object.freeze({
    status: 'CC BY-NC 3.0 IGO',
    statement:
      'Gaia data are distributed under CC BY-NC 3.0 IGO: credit ESA/Gaia/DPAC, and do not use them commercially. https://www.cosmos.esa.int/web/gaia-users/license',
  }),
  citations: Object.freeze([
    Object.freeze({
      text: 'Gaia Collaboration, Vallenari et al. 2023, A&A 674, A1 (Gaia Data Release 3)',
      url: 'https://doi.org/10.1051/0004-6361/202243940',
    }),
  ]),
  timeZero: 2455197.5,
  bands: Object.freeze({
    G: Object.freeze({ time: 'TimeG', value: 'Gmag', label: 'G magnitude' }),
    BP: Object.freeze({
      time: 'TimeBP',
      value: 'BPmag',
      label: 'BP magnitude',
    }),
    RP: Object.freeze({
      time: 'TimeRP',
      value: 'RPmag',
      label: 'RP magnitude',
    }),
  }),
});

export const BANDS = Object.freeze(Object.keys(DESCRIPTOR.bands));

/** A unit the service states that the descriptor does not expect. */
export class UnitError extends Error {
  constructor(field, stated, expected) {
    super(`${field} is in ${stated}; the descriptor says ${expected}`);
    this.name = 'UnitError';
    this.code = 'units';
    this.detail = { field, stated, expected };
  }
}

/**
 * TCB to TDB, both as Julian dates: TDB = TCB - L_B (JD_TCB - T0) 86400 s +
 * TDB0, the IAU 2006 Resolution B3 definition. 11.25 s at J2000 and about
 * 19 s over Gaia DR3's window: small beside a 0.66-day pulsation, a whole bin
 * of a transit's ingress, so it is applied and recorded rather than left as
 * "unknown".
 */
export function tcbToTdb(jdTcb) {
  const LB = 1.550519768e-8;
  const T0 = 2443144.5003725;
  const TDB0 = -6.55e-5; // s
  return jdTcb - LB * (jdTcb - T0) + TDB0 / 86400;
}

// The flux's unit, stated or not, must be electrons a second.
const ELECTRONS_PER_SECOND = /^(e-|electron|e)\/s$/;

/**
 * One band of an epoch-photometry answer, as a gravitas.observation/1.
 * @param {object} answer - js/archive/cds.js tapQuery's result
 * @param {{source: string, band?: string,
 *   object?: {name: string, ra: number, dec: number}|null}} ctx
 */
export function toObservation(answer, { source, band = 'G', object = null }) {
  const b = DESCRIPTOR.bands[band];
  if (!b) throw new Error(`no band ${band}`);
  const { fields, rows } = answer.table;
  const col = name => fields.findIndex(f => f.name === name);
  const ti = col(b.time);
  const vi = col(b.value);
  if (ti < 0 || vi < 0)
    throw new Error(`the table has no ${b.time} or ${b.value}`);
  const check = (i, expected, ok = u => u === expected) => {
    const u = fields[i]?.unit;
    if (u && !ok(u)) throw new UnitError(fields[i].name, u, expected);
  };
  check(ti, 'd');
  check(vi, 'mag');
  const fi = col('FG');
  const ei = col('e_FG');
  const withErrors = band === 'G' && fi >= 0 && ei >= 0;
  if (withErrors) {
    check(fi, 'e-/s', u => ELECTRONS_PER_SECOND.test(u));
    check(ei, 'e-/s', u => ELECTRONS_PER_SECOND.test(u));
  }

  const kept = rows
    .filter(r => Number.isFinite(r[ti]) && Number.isFinite(r[vi]))
    .map(r => ({
      t: tcbToTdb(r[ti] + DESCRIPTOR.timeZero),
      m: r[vi],
      e:
        withErrors && r[fi] > 0 && r[ei] > 0
          ? (2.5 / Math.LN10) * (r[ei] / r[fi])
          : NaN,
    }))
    .sort((p, q) => p.t - q.t);
  const dropped = rows.length - kept.length;
  const noError = withErrors ? kept.filter(k => Number.isNaN(k.e)).length : 0;
  const date = answer.retrieved.slice(0, 10);

  return {
    format: 'gravitas.observation',
    formatVersion: 1,
    kind: 'time-series',
    id: `import:gaia-dr3-${source}-${band}@${answer.contentSha256.slice(0, 12)}`,
    title: `${object?.name ? `${object.name}: ` : ''}Gaia DR3 ${source}, ${b.label}`,
    object: object && {
      name: object.name,
      ra: object.ra,
      dec: object.dec,
      frame: 'ICRS',
    },
    facility: DESCRIPTOR.facility,
    origin: 'observed',
    // gravitas.observation/1 has no slot for a retrieval, and a save keeps
    // only the top-level keys it knows (js/observatory/export.js) but writes
    // `source` whole: so the query, its answer's size and both checksums ride
    // in source.retrieval, and survive a save and a read-back.
    source: {
      kind: 'import',
      id: `vizier:${DESCRIPTOR.table}:${source}`,
      version: date,
      retrieval: {
        url: answer.url,
        finalUrl: answer.finalUrl,
        bytes: answer.bytes,
        sha256: answer.sha256,
        contentSha256: answer.contentSha256,
        rows: rows.length,
        overflow: answer.table.overflow,
      },
    },
    credit: DESCRIPTOR.credit,
    license: { ...DESCRIPTOR.license },
    retrieved: answer.retrieved,
    citations: DESCRIPTOR.citations.map(c => ({ ...c })),
    reductions: [
      `Gaia DR3 epoch photometry (VizieR ${DESCRIPTOR.table}), source ${source}, retrieved ${date}: the ${band} band, ${kept.length} of ${rows.length} rows (${dropped} without a ${band} time or magnitude), sorted by time.`,
      `Times: ${b.time} + 2455197.5, barycentric JD in TCB (Gaia DR3 data model), converted to TDB by IAU 2006 Resolution B3.`,
      withErrors
        ? `Errors: 1.0857 x e_FG / FG, from the G flux and its error in e-/s (the unit is the data model's; the service states none)${noError ? `; ${noError} rows have no flux error` : ''}.`
        : `No ${band} errors: the table carries none.`,
      answer.table.overflow
        ? `The service stopped at its row limit: this is not every epoch.`
        : 'Every row the query asked for was returned.',
    ],
    columns: [
      {
        id: 'time',
        name: 'time',
        unit: 'd',
        role: 'x',
        values: kept.map(k => k.t),
      },
      {
        id: 'mag',
        name: b.label,
        unit: 'mag',
        role: 'value',
        values: kept.map(k => k.m),
      },
      ...(withErrors
        ? [
            {
              id: 'mag-error',
              name: `${b.label} error`,
              unit: 'mag',
              role: 'uncertainty',
              of: 'mag',
              values: kept.map(k => k.e),
            },
          ]
        : []),
    ],
    axes: { x: 'time', y: 'mag' },
    time: { column: 'time', format: 'BJD', scale: 'TDB' },
    masks: [],
    annotations: [],
  };
}
