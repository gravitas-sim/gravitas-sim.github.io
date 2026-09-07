// =============================================================================
// The evidence report
// -----------------------------------------------------------------------------
// A PDF a student hands in, written with the same js/pdf.js document builder
// the lab report uses. Nothing new is computed here: every number on the page
// came out of a frozen snapshot, and this module's whole job is to lay it out
// so that a reader who was not there can tell what was measured, what was
// predicted, what was revealed, and under what conditions.
//
// Two decisions worth defending.
//
// Provenance goes under every entry, not in an appendix. An appendix is where
// a reader stops going: the seed and the timestep matter most at the moment
// somebody is reading the number they produced, so they are printed there,
// compactly, even though it repeats across entries from the same session.
//
// The kind of each number is printed beside it and not encoded in a colour.
// A grey-scale print, a photocopy and a screen reader all lose colour, and
// "revealed" is the one word on the page that changes what a claim is worth.
// =============================================================================

import { createDocument } from '../pdf.js';
import { t } from '../i18n/index.js';
import { KIND } from './entry.js';

/**
 * A translated string, or a fallback when the id is not in the catalogue.
 *
 * t() returns the id and warns once when a message is missing, which is right
 * for a hard-coded id and wrong for a dynamic one: a notebook restored from a
 * file written by a newer build can carry a flag this build has no name for,
 * and printing `nb.flag.something-new` in a report a student hands in would be
 * worse than printing the raw flag. The generated ids are all covered by the
 * catalogue and asserted by tests/notebook.test.js; this is for the ones that
 * arrive from a file.
 *
 * @param {string} id - Message id
 * @param {string} fallback - What to print when there is no message
 * @returns {string} Text
 */
const orRaw = (id, fallback) => {
  const text = t(id);
  return text === id ? fallback : text;
};

/** A number for reading: significant figures, not fixed decimals. */
function valueText(value, unit) {
  if (value === null || value === undefined) return t('nb.report.noValue');
  const abs = Math.abs(value);
  const digits =
    abs === 0
      ? '0'
      : abs < 1e-4 || abs >= 1e6
        ? value.toExponential(3)
        : String(Number(value.toPrecision(6)));
  return unit ? `${digits} ${unit}` : String(digits);
}

const dateText = ms => {
  const d = new Date(ms || Date.now());
  return Number.isNaN(d.getTime())
    ? '-'
    : d.toISOString().slice(0, 16).replace('T', ' ');
};

/** The one-word tag that goes beside every number. */
const kindText = kind =>
  kind === KIND.TRUTH
    ? t('nb.kind.truth')
    : kind === KIND.ANALYTIC
      ? t('nb.kind.analytic')
      : t('nb.kind.measured');

/**
 * The provenance block, as short label/value rows.
 *
 * Absent fields are printed as "not recorded" rather than omitted. A report
 * that silently leaves out the seed reads as though seeds do not matter; one
 * that says it was not recorded tells the reader the reading is not
 * reproducible, and why.
 *
 * @param {object} p - An entry's provenance
 * @returns {Array<Array<string>>} Label/value pairs
 */
export function provenanceRows(p) {
  const missing = t('nb.report.notRecorded');
  const or = v =>
    v === null || v === undefined || v === '' ? missing : String(v);
  const rows = [
    [t('nb.prov.scenario'), or(p.scenario)],
    [t('nb.prov.target'), or(p.target)],
    [
      t('nb.prov.simTime'),
      p.simTimeDays === null
        ? missing
        : t('nb.prov.days', { d: valueText(p.simTimeDays, '') }),
    ],
    [t('nb.prov.seed'), or(p.seed)],
    [t('nb.prov.world'), or(p.worldGeneration)],
    [t('nb.prov.revision'), or(p.revision)],
    [
      t('nb.prov.numerical'),
      [
        p.numerical?.integrator ? p.numerical.integrator : missing,
        p.numerical?.maxTimestep !== null &&
        p.numerical?.maxTimestep !== undefined
          ? t('nb.prov.step', { v: valueText(p.numerical.maxTimestep, '') })
          : null,
        p.numerical?.simSpeed !== null && p.numerical?.simSpeed !== undefined
          ? t('nb.prov.speed', { v: valueText(p.numerical.simSpeed, '') })
          : null,
      ]
        .filter(Boolean)
        .join(', '),
    ],
  ];
  if (p.interventionEpoch !== null && p.interventionEpoch !== undefined) {
    rows.push([t('nb.prov.interventions'), String(p.interventionEpoch)]);
  }
  if (p.observer) {
    rows.push([
      t('nb.prov.geometry'),
      t('nb.prov.geometryValue', {
        pa: valueText(p.observer.positionAngleDeg, 'deg'),
        inc: valueText(p.observer.inclinationDeg, 'deg'),
      }),
    ]);
  }
  if (p.referenceFrame) {
    rows.push([t('nb.prov.frame'), String(p.referenceFrame)]);
  }
  if (p.quality) {
    rows.push([
      t('nb.prov.quality'),
      t('nb.prov.qualityValue', {
        tier: String(p.quality.tier ?? '?'),
        fps: valueText(p.quality.fps, ''),
      }),
    ]);
  }
  if (p.units) {
    rows.push([
      t('nb.prov.units'),
      Object.entries(p.units)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', '),
    ]);
  }
  if (p.flags?.length) {
    rows.push([
      t('nb.prov.flags'),
      p.flags.map(f => orRaw(`nb.flag.${f}`, f)).join('; '),
    ]);
  }
  if (p.initialStateHash) {
    rows.push([t('nb.prov.stateHash'), String(p.initialStateHash)]);
  }
  return rows;
}

/**
 * Build the report.
 *
 * @param {object} spec
 * @param {Array<object>} spec.entries - The notebook, in the student's order
 * @param {?string} [spec.student] - A name for the cover
 * @param {string} [spec.revision] - The build writing the file
 * @returns {Uint8Array} PDF bytes
 */
export function buildEvidenceReport({
  entries,
  student = null,
  revision = 'dev',
}) {
  const doc = createDocument({
    title: t('nb.report.title'),
    footer: t('nb.report.footer'),
  });

  doc
    .heading(t('nb.report.title'), { size: 19, spaceBefore: 0 })
    .paragraph(t('nb.report.subtitle'), {
      size: 10.5,
      color: '0.35 0.35 0.42',
      gap: 6,
    })
    .rule({ gap: 8 })
    .row(t('nb.report.student'), student || t('nb.report.anonymous'))
    .row(t('nb.report.generated'), dateText(Date.now()))
    .row(t('nb.report.build'), String(revision))
    .row(t('nb.report.entries'), String(entries.length));

  // What the three tags mean, said once, before any of them is used. Without
  // this a reader meets the word "revealed" beside a number and has to guess.
  doc.heading(t('nb.report.howToRead'), { size: 11 });
  doc.bullets(
    [
      t('nb.report.readMeasured'),
      t('nb.report.readAnalytic'),
      t('nb.report.readTruth'),
    ],
    { size: 9 }
  );

  const tampered = entries.filter(e => e.tampered);
  if (tampered.length) {
    doc.paragraph(t('nb.report.tampered', { n: tampered.length }), {
      size: 9.5,
      color: '0.72 0.28 0.14',
    });
  }

  entries.forEach((entry, index) => {
    const snap = entry.snapshot;
    doc.heading(`${index + 1}. ${entry.title || t('nb.untitled')}`, {
      size: 13,
      spaceBefore: 20,
    });
    doc.row(
      t('nb.report.source'),
      t(`nb.source.${entry.source}`, { _: entry.source })
    );
    doc.row(t('nb.report.captured'), dateText(snap.capturedAt));
    doc.row(t('nb.report.checksum'), entry.fingerprint || '-');
    if (entry.tampered) {
      doc.paragraph(t('nb.report.entryTampered'), {
        size: 9,
        color: '0.72 0.28 0.14',
        gap: 4,
      });
    }

    if (entry.prose.claim) {
      doc.heading(t('nb.field.claim'), { size: 10, spaceBefore: 10 });
      doc.paragraph(entry.prose.claim, { size: 10 });
    }

    if (snap.quantities.length) {
      doc.heading(t('nb.report.results'), { size: 10, spaceBefore: 8 });
      doc.table({
        columns: [
          t('nb.report.colQuantity'),
          t('nb.report.colValue'),
          t('nb.report.colKind'),
          t('nb.report.colNote'),
        ],
        widths: [0.3, 0.2, 0.15, 0.35],
        rows: snap.quantities.map(q => [
          q.label,
          q.uncertainty
            ? `${valueText(q.value, '')} ± ${valueText(q.uncertainty, q.unit)}`
            : valueText(q.value, q.unit),
          kindText(q.kind),
          q.note || '',
        ]),
      });
    }

    if (snap.figure?.series?.length) {
      doc.heading(snap.figure.title || t('nb.report.figure'), {
        size: 10,
        spaceBefore: 8,
      });
      doc.figure({
        series: snap.figure.series,
        xLabel: snap.figure.xLabel,
        yLabel: snap.figure.yLabel,
        logX: snap.figure.logX,
      });
    }

    if (entry.prose.evidence) {
      doc.heading(t('nb.field.evidence'), { size: 10, spaceBefore: 8 });
      doc.paragraph(entry.prose.evidence, { size: 10 });
    }
    if (entry.prose.limitations) {
      doc.heading(t('nb.field.limitations'), { size: 10, spaceBefore: 8 });
      doc.bullets(
        entry.prose.limitations
          .split('\n')
          .map(line => line.trim())
          .filter(Boolean),
        { size: 9.5 }
      );
    }

    doc.heading(t('nb.report.conditions'), { size: 10, spaceBefore: 8 });
    for (const [label, value] of provenanceRows(snap.provenance)) {
      doc.row(label, value);
    }
  });

  return doc.build();
}

/**
 * A filename for the report.
 *
 * @param {Date} [now] - For a deterministic name in tests
 * @returns {string} Filename
 */
export function reportFilename(now = new Date()) {
  return `gravitas-evidence-${now.toISOString().slice(0, 10)}.pdf`;
}
