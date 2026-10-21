// =============================================================================
// The class summary, as the review page shows it (Prompt 173)
// -----------------------------------------------------------------------------
// js/instructorSummary.js computes the summary; this writes it as markup, in
// the page's language, and draws each measured quantity through the plot
// component beside the table of the same numbers. Everything the page owns
// arrives in `words`, so this module imports no catalog and no page code:
//
//   t(id, vars)       the page's translator (js/submission/i18n.js)
//   number(v)         a number for reading, in the page's language
//   uncertainty(row)  what an evidence row's uncertainty says, in words
//   origin(id)        what an evidence row's origin is called
//
// A figure is never the only way to the numbers: each plot has its table, and
// the plot's label says how many values it holds and what the bars are.
//
// It is named js/instructor*.js so the service worker installs it with the
// instructor modules (tools/build-service-worker.mjs), not at the first visit.
// =============================================================================

/** The most wrong answers and measured quantities the page shows. */
export const SHOWN = Object.freeze({ wrong: 12, measured: 6 });

const esc = s =>
  String(s ?? '').replace(
    /[&<>"]/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]
  );

const percent = v =>
  v === null || v === undefined ? '-' : `${Math.round(v * 100)}%`;

/** A table in the page's scroll region, with its caption read to a screen reader. */
const table = (caption, head, rows, rowHeader = true) =>
  `<div class="ui-table-wrap" tabindex="0" role="region" aria-label="${esc(caption)}"><table class="ui-table sr-table sr-sum-table"><caption class="visually-hidden">${esc(caption)}</caption><thead><tr>${head
    .map(h => `<th scope="col">${esc(h)}</th>`)
    .join('')}</tr></thead><tbody>${rows
    .map(
      cells =>
        `<tr>${cells
          .map((c, i) =>
            i === 0 && rowHeader
              ? `<th scope="row">${esc(c)}</th>`
              : `<td>${esc(c)}</td>`
          )
          .join('')}</tr>`
    )
    .join('')}</tbody></table></div>`;

/**
 * A length of time in the page's words.
 * @param {?number} m - Minutes
 * @param {Function} t - The translator
 * @param {Function} number - The number writer
 * @returns {string}
 */
export function duration(m, t, number) {
  if (m === null || m === undefined) return '-';
  if (m < 90) return t('sub.sum.min', { v: number(Math.round(m)) });
  if (m < 2880)
    return t('sub.sum.hours', { v: number(Math.round(m / 6) / 10) });
  return t('sub.sum.days', { v: number(Math.round(m / 144) / 10) });
}

/** The label of a time band: under, between, over. */
function bandLabel(b, t) {
  const min = v => t('sub.sum.min', { v });
  if (b.from === 0) return t('sub.sum.band.under', { to: min(b.to) });
  if (b.to === Infinity) return t('sub.sum.band.over');
  const unit = v => (v >= 60 ? t('sub.sum.hours', { v: v / 60 }) : min(v));
  return t('sub.sum.band.between', { from: unit(b.from), to: unit(b.to) });
}

/** One investigation's block. */
function lessonHtml(L, { t, number }) {
  const parts = [
    `<h3>${esc(
      t(L.reports === 1 ? 'sub.sum.lesson.one' : 'sub.sum.lesson.many', {
        title: L.title,
        n: L.reports,
      })
    )}</h3>`,
    `<p class="ui-note">${esc(
      t('sub.sum.reading', {
        median: percent(L.reading.median),
        min: percent(L.reading.min),
        max: percent(L.reading.max),
      })
    )}${
      Object.keys(L.depths).length
        ? ` ${esc(
            t('sub.sum.depths', {
              list: Object.entries(L.depths)
                .map(([d, n]) => `${t(`sub.depth.${d}`)}: ${n}`)
                .join(', '),
            })
          )}`
        : ''
    }</p>`,
  ];

  parts.push(
    table(
      t('sub.sum.steps'),
      [
        t('sub.sum.col.step'),
        t('sub.sum.col.answered'),
        t('sub.sum.col.right'),
        t('sub.sum.col.written'),
        t('sub.sum.col.mark'),
      ],
      L.steps.map(s => {
        const checked = s.correct + s.incorrect;
        return [
          s.title,
          t('sub.sum.of', { a: s.answered, n: s.of }),
          checked
            ? `${percent(s.correct / checked)} (${s.correct}/${checked})`
            : '-',
          s.written
            ? t('sub.sum.of', { a: s.writtenMarked, n: s.written })
            : '-',
          s.meanMark === null ? '-' : percent(s.meanMark),
        ];
      })
    )
  );
  if (L.stale)
    parts.push(
      `<p class="ui-note">${esc(t('sub.sum.stale', { n: L.stale }))}</p>`
    );

  if (L.criteria.length) {
    parts.push(
      `<h4>${esc(t('sub.sum.criteria'))}</h4>`,
      table(
        t('sub.sum.criteria'),
        [
          t('sub.sum.col.criterion'),
          t('sub.sum.col.claims'),
          t('sub.sum.col.step'),
          t('sub.sum.col.marked'),
          t('sub.sum.col.mark'),
        ],
        L.criteria.map(c => [
          c.name,
          t(`sub.judge.kind.${c.kind}`),
          c.stepTitle,
          t('sub.sum.of', { a: c.marked, n: c.of }),
          c.mean === null ? '-' : percent(c.mean),
        ])
      ),
      table(
        t('sub.sum.kinds'),
        [
          t('sub.sum.col.claims'),
          t('sub.sum.col.marks'),
          t('sub.sum.col.mark'),
        ],
        L.kinds.length
          ? L.kinds.map(k => [
              t(`sub.judge.kind.${k.kind}`),
              String(k.marked),
              percent(k.mean),
            ])
          : [[t('sub.sum.kinds.none'), '-', '-']]
      ),
      `<p class="ui-note">${esc(t('sub.sum.criteria.note'))}</p>`
    );
  }

  parts.push(`<h4>${esc(t('sub.sum.wrong'))}</h4>`);
  if (!L.wrong.length)
    parts.push(
      `<p class="ui-state is-empty">${esc(t('sub.sum.wrong.none'))}</p>`
    );
  else {
    const shown = L.wrong.slice(0, SHOWN.wrong);
    parts.push(
      table(
        t('sub.sum.wrong'),
        [
          t('sub.sum.col.question'),
          t('sub.sum.col.given'),
          t('sub.sum.col.times'),
          t('sub.sum.col.share'),
          t('sub.sum.col.misconception'),
        ],
        shown.map(w => [
          w.stepTitle,
          w.kind === 'unreadable'
            ? t('sub.sum.unreadable')
            : w.kind === 'number'
              ? `${number(w.value)}${w.unit ? ` ${w.unit}` : ''}`
              : w.text,
          String(w.count),
          percent(w.share),
          w.misconception || t('sub.sum.none'),
        ])
      )
    );
    if (L.wrong.length > shown.length)
      parts.push(
        `<p class="ui-note">${esc(
          t('sub.sum.wrong.more', { n: shown.length })
        )}</p>`
      );
    parts.push(`<p class="ui-note">${esc(t('sub.sum.wrong.note'))}</p>`);
  }

  const time = L.time;
  parts.push(`<h4>${esc(t('sub.sum.time'))}</h4>`);
  if (!time.n)
    parts.push(
      `<p class="ui-state is-empty">${esc(t('sub.sum.time.none'))}</p>`
    );
  else
    parts.push(
      `<p>${esc(
        t('sub.sum.time.line', {
          n: time.n,
          median: duration(time.median, t, number),
          q1: duration(time.q1, t, number),
          q3: duration(time.q3, t, number),
          min: duration(time.min, t, number),
          max: duration(time.max, t, number),
        })
      )}</p>`,
      table(
        t('sub.sum.time'),
        [t('sub.sum.col.time'), t('sub.sum.col.reports')],
        time.bands.map(b => [bandLabel(b, t), String(b.count)])
      )
    );
  if (time.missing)
    parts.push(
      `<p class="ui-note">${esc(t('sub.sum.time.missing', { n: time.missing }))}</p>`
    );
  parts.push(`<p class="ui-note">${esc(t('sub.sum.time.note'))}</p>`);
  return `<section class="sr-sum-lesson" aria-label="${esc(L.title)}">${parts.join('')}</section>`;
}

/** The measured quantities: a plot slot and the table of the same numbers. */
function measuredHtml(summary, { t, number, uncertainty, origin }) {
  const { groups, single, mismatched } = summary.measured;
  const parts = [`<h3>${esc(t('sub.sum.measured'))}</h3>`];
  if (!groups.length)
    parts.push(
      `<p class="ui-state is-empty">${esc(t('sub.sum.measured.none'))}</p>`
    );
  groups.slice(0, SHOWN.measured).forEach((g, i) => {
    const name = g.unit ? `${g.quantity} (${g.unit})` : g.quantity;
    const out = g.leftOut;
    const left = out.limit + out.failed + out.notConstrained;
    parts.push(
      `<figure class="sr-fig"><figcaption><strong>${esc(name)}</strong>: ${esc(
        g.lessonTitle
      )}</figcaption>`,
      `<svg class="ow-plot" data-sum-plot="${i}" role="img" aria-label="${esc(
        t('sub.sum.plot.label', { name: g.quantity, n: g.n })
      )}"></svg>`,
      `<p class="ui-note">${esc(
        t('sub.sum.measured.line', {
          n: g.n,
          median: number(g.median),
          min: number(g.min),
          max: number(g.max),
          bars: g.withBars,
          sigma: g.meanSigma === null ? '-' : number(g.meanSigma),
        })
      )}${
        left
          ? ` ${esc(
              t('sub.sum.measured.left', {
                n: left,
                limit: out.limit,
                failed: out.failed,
                nc: out.notConstrained,
              })
            )}`
          : ''
      }</p>`,
      table(
        t('sub.sum.measured.caption', { name: g.quantity }),
        [
          t('sub.sum.col.rank'),
          t('sub.sum.col.value'),
          t('sub.sum.col.uncertainty'),
          t('sub.sum.col.origin'),
        ],
        g.points.map(p => [
          String(p.rank),
          number(p.value),
          uncertainty(p.row),
          origin(p.origin),
        ]),
        false
      ),
      '</figure>'
    );
  });
  if (groups.length > SHOWN.measured)
    parts.push(
      `<p class="ui-note">${esc(
        t('sub.sum.measured.more', { shown: SHOWN.measured, n: groups.length })
      )}</p>`
    );
  if (single)
    parts.push(
      `<p class="ui-note">${esc(t('sub.sum.measured.single', { n: single }))}</p>`
    );
  if (mismatched)
    parts.push(
      `<p class="ui-note">${esc(t('sub.sum.measured.mismatch', { n: mismatched }))}</p>`
    );
  parts.push(`<p class="ui-note">${esc(t('sub.sum.measured.note'))}</p>`);
  return parts.join('');
}

/**
 * The summary as markup: the counts, a block per investigation, the measured
 * quantities and the two buttons. The plots are empty slots until
 * drawMeasured() fills them.
 *
 * @param {object} summary - From classSummary()
 * @param {object} words - See the file header; `date` is the day printed on it
 * @returns {string} The inside of the summary section
 */
export function summaryHtml(summary, words) {
  const { t, date } = words;
  const head = `<h2 id="sumTitle">${esc(t('sub.sum.title'))}</h2><p class="ui-note">${esc(
    t('sub.sum.note')
  )}</p>`;
  if (!summary.reports)
    return `${head}<p class="ui-state is-empty">${esc(t('sub.sum.empty'))}</p>`;
  return `${head}<p role="status">${esc(
    t('sub.sum.counts', {
      n: summary.reports,
      dup: summary.duplicates,
      rep: summary.repeated,
      date,
    })
  )}</p><div class="ui-toolbar sr-noprint"><button id="sumCsv" type="button" class="ui-button">${esc(
    t('sub.sum.csv')
  )}</button><button id="sumPrint" type="button" class="ui-button">${esc(
    t('sub.sum.print')
  )}</button></div>${summary.lessons
    .map(L => lessonHtml(L, words))
    .join('')}${measuredHtml(summary, words)}`;
}

/**
 * Draw every measured quantity's plot into the slots summaryHtml() left, through
 * the plot component (js/plot/plot.js), fetched on the first call so a page
 * with nothing measured never loads it. A slot that has left the page by the
 * time the module arrives (the summary was redrawn) is skipped.
 *
 * @param {ParentNode} host - The summary section
 * @param {object} summary - From classSummary()
 * @param {object} words - `number` and `t`
 * @returns {Promise<number>} How many plots were drawn
 */
export async function drawMeasured(host, summary, words) {
  const slots = [...host.querySelectorAll('svg[data-sum-plot]')];
  if (!slots.length) return 0;
  const { drawGroup } = await import('./instructorSummaryPlot.js');
  let drawn = 0;
  for (const svg of slots) {
    if (!svg.isConnected) continue;
    drawGroup(svg, summary.measured.groups[Number(svg.dataset.sumPlot)], words);
    drawn++;
  }
  return drawn;
}
