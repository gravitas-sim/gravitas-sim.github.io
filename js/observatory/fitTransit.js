// =============================================================================
// What the transit family adds to the fit panel's result (Prompt 225)
// -----------------------------------------------------------------------------
// Split from js/observatory/fitPanel.js, which the module-size check keeps under
// 1,500 lines. Pure drawing: the fit's own document (results.fit.transit) holds
// every number shown here; the panel passes the helpers it already has.
// =============================================================================

import { ellipseOfFit } from '../inference/transitDelta.js';

/** A line of x against y drawn by the observatory's own plot, with its words. */
function plotOf(env, xs, ys, names, label) {
  const { t, number, createPlot } = env;
  const obs = {
    columns: [
      { id: 'x', name: names[0], unit: '', role: 'x', values: xs },
      { id: 'y', name: names[1], unit: '', role: 'value', values: ys },
    ],
    axes: { x: 'x', y: 'y' },
    masks: [],
  };
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  g.setAttribute('class', 'ow-plot');
  g.setAttribute('role', 'img');
  g.setAttribute('aria-label', label);
  createPlot(g, {
    number,
    explain: 'observatory-fit',
    labels: { notStated: t('obs.unit.notStated') },
  }).draw(obs, { xColumn: 'x', yColumn: 'y' });
  return g;
}

/**
 * What the transit family adds to a result (Prompt 225): whether the data
 * fix the radius ratio and impact parameter, whether the residuals in
 * transit look like noise, the likelihood profiles of k and b, and the
 * covariance ellipses with their tables. Everything is also in the fit's
 * document: results.fit.transit.
 */
export function transitSections(out, env) {
  const { el, t, number, nameOf } = env;
  const fit = out.fit;
  if (!fit.transit) return [];
  const fmt = v => (Number.isFinite(v) ? number(v) : '—');
  const kids = [el('h3', { text: t('obs.fit.transit.title') })];
  const kb = fit.transit.kb;
  const res = fit.transit.residual;
  kids.push(
    el(
      'ul',
      { id: 'fitTransitChecks' },
      ...(kb
        ? [
            el('li', {
              id: 'fitKb',
              text: t(`obs.fit.transit.kb.${kb.status}`, {
                reasons: (kb.reasons ?? [])
                  .map(r => t(`obs.fit.transit.reason.${r}`))
                  .join('; '),
              }),
            }),
          ]
        : []),
      ...(res
        ? [
            el('li', {
              id: 'fitResidualTest',
              text: t(
                `obs.fit.transit.residual.${res.fails ? 'fails' : 'passes'}`,
                {
                  chi2: fmt(res.chi2),
                  points: res.points,
                  p: fmt(res.p),
                }
              ),
            }),
          ]
        : [])
    )
  );
  for (const name of ['k', 'b']) {
    const pr = out.profiles.find(p => p.parameter === name);
    if (!pr?.points?.length) continue;
    const figure = el(
      'figure',
      { id: `fitProfilePlot-${name}` },
      plotOf(
        env,
        pr.points.map(q => q.value),
        pr.points.map(q => q.dchi2),
        [nameOf({ name }), t('obs.fit.transit.dchi2')],
        t('obs.fit.transit.profileLabel', {
          name: nameOf({ name }),
          n: pr.points.length,
        })
      ),
      el('figcaption', {
        class: 'ui-hint',
        text: t('obs.fit.transit.profileCaption', {
          name: nameOf({ name }),
          lo: fmt(pr.interval[0]),
          hi: fmt(pr.interval[1]),
        }),
      })
    );
    kids.push(figure);
  }
  const pairs = [
    ['k', 'b'],
    ['k', 'q1'],
  ].filter(([a, b]) => fit.free.includes(a) && fit.free.includes(b));
  for (const [a, b] of pairs) {
    const ell = ellipseOfFit(fit, a, b);
    if (!ell) continue;
    const E = ell.ellipse;
    const names = [nameOf({ name: a }), nameOf({ name: b })];
    kids.push(
      el(
        'figure',
        { id: `fitEllipse-${a}-${b}` },
        plotOf(
          env,
          E.points.map(p => ell.center[0] + p[0]),
          E.points.map(p => ell.center[1] + p[1]),
          names,
          t('obs.fit.transit.ellipseLabel', { a: names[0], b: names[1] })
        ),
        el('figcaption', {
          class: 'ui-hint',
          text: t('obs.fit.transit.ellipseCaption', {
            a: names[0],
            b: names[1],
          }),
        })
      ),
      el(
        'div',
        {
          class: 'ui-table-wrap is-numeric',
          tabindex: '0',
          role: 'region',
          'aria-label': t('obs.fit.transit.ellipseTable', {
            a: names[0],
            b: names[1],
          }),
        },
        el(
          'table',
          { id: `fitEllipseTable-${a}-${b}` },
          el('caption', {
            text: t('obs.fit.transit.ellipseTable', {
              a: names[0],
              b: names[1],
            }),
          }),
          el(
            'tbody',
            {},
            ...[
              ['center', `${fmt(ell.center[0])}, ${fmt(ell.center[1])}`],
              ['semiMajor', fmt(E.semiMajor)],
              ['semiMinor', fmt(E.semiMinor)],
              ['angle', fmt((E.angle * 180) / Math.PI)],
              ['correlation', fmt(ell.correlation)],
            ].map(([k, v]) =>
              el(
                'tr',
                {},
                el('th', {
                  scope: 'row',
                  text: t(`obs.fit.transit.ellipse.${k}`),
                }),
                el('td', { text: v })
              )
            )
          )
        )
      )
    );
  }
  return kids;
}
