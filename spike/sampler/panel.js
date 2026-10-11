// Prototype (spike): the trace panel. Builds, from a report() object, the
// paragraph that says what the interval is, a table of the diagnostics, and for
// every parameter an SVG trace with a table of the very numbers it draws (a
// chart exposes its data). A refused report shows the reasons and no interval.
import { EN_SAMPLER, ES_SAMPLER } from './words.js';

const el = (tag, attrs = {}, kids = []) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  for (const c of [].concat(kids)) n.append(c);
  return n;
};
const svgEl = (tag, attrs = {}) => {
  const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
};
const num = v =>
  Number.isFinite(v) ? Number(v.toPrecision(4)).toString() : '-';

export function renderSampler(rep, lang = 'en') {
  const w = lang === 'es' ? ES_SAMPLER : EN_SAMPLER;
  const root = el('section', { 'aria-labelledby': 'smp-h', lang });
  root.append(
    el('h3', { id: 'smp-h' }, w.title),
    el('p', { class: 'explain' }, w.explain)
  );
  if (rep.status === 'refused')
    root.append(
      el('p', { role: 'alert' }, w.refused),
      el(
        'ul',
        {},
        rep.reasons.map(r => el('li', {}, r))
      )
    );
  const rows = rep.diagnostics.parameters.map(p =>
    el(
      'tr',
      {},
      [
        p.name,
        num(p.rhatEnsembles),
        num(p.rhatWalkers),
        num(p.ess),
        num(p.tau),
      ].map((t, i) => el(i ? 'td' : 'th', i ? {} : { scope: 'row' }, t))
    )
  );
  root.append(
    el('table', {}, [
      el('caption', {}, `${w.acceptance}: ${num(rep.diagnostics.acceptance)}`),
      el(
        'thead',
        {},
        el(
          'tr',
          {},
          [w.parameter, w.rhatEnsembles, w.rhatWalkers, w.ess, w.tau].map(t =>
            el('th', { scope: 'col' }, t)
          )
        )
      ),
      el('tbody', {}, rows),
    ])
  );
  if (rep.summary)
    root.append(
      el('table', {}, [
        el(
          'thead',
          {},
          el(
            'tr',
            {},
            [w.parameter, w.mean, w.sd, w.q16, w.q50, w.q84].map(t =>
              el('th', { scope: 'col' }, t)
            )
          )
        ),
        el(
          'tbody',
          {},
          rep.summary.map(s =>
            el(
              'tr',
              {},
              [s.name, s.mean, s.sd, s.q16, s.q50, s.q84].map((t, i) =>
                el(
                  i ? 'td' : 'th',
                  i ? {} : { scope: 'row' },
                  typeof t === 'number' ? num(t) : t
                )
              )
            )
          )
        ),
      ])
    );
  const colors = ['#1b6ec2', '#c25a1b', '#2a8a4a', '#8a2a7a'];
  for (const tr of rep.traces) {
    const all = tr.ensembles.flat();
    const lo = Math.min(...all);
    const hi = Math.max(...all);
    const n = tr.ensembles[0].length;
    const svg = svgEl('svg', {
      viewBox: '0 0 300 80',
      role: 'img',
      'aria-label': `${w.trace}: ${tr.name}`,
    });
    tr.ensembles.forEach((s, e) => {
      const pts = s
        .map(
          (v, i) =>
            `${((i / (n - 1)) * 296 + 2).toFixed(1)},${(76 - ((v - lo) / (hi - lo || 1)) * 72).toFixed(1)}`
        )
        .join(' ');
      svg.append(
        svgEl('polyline', {
          points: pts,
          fill: 'none',
          stroke: colors[e % 4],
          'stroke-width': 1,
        })
      );
    });
    const table = el('table', {}, [
      el(
        'thead',
        {},
        el(
          'tr',
          {},
          [w.step, ...tr.ensembles.map((_, e) => `${w.ensemble} ${e + 1}`)].map(
            t => el('th', { scope: 'col' }, t)
          )
        )
      ),
      el(
        'tbody',
        {},
        Array.from({ length: n }, (_, i) =>
          el(
            'tr',
            {},
            [i * tr.stride, ...tr.ensembles.map(s => num(s[i]))].map(t =>
              el('td', {}, String(t))
            )
          )
        )
      ),
    ]);
    root.append(
      el('figure', {}, [
        el('figcaption', {}, `${tr.name}: ${w.trace}`),
        svg,
        el('details', {}, [
          el('summary', {}, `${w.traceTable}: ${tr.name}`),
          table,
        ]),
      ])
    );
  }
  return root;
}
