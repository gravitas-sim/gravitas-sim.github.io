// =============================================================================
// The Observatory's spectrograph panel: one line, fitted with the instrument model
// -----------------------------------------------------------------------------
// Loaded only when a reader opens it (js/observatoryPage.js), so the page carries
// none of it. The arithmetic is js/kernels/spectrograph/ (Prompt 213,
// SPECTROGRAPH.md): a pixel-integrated Gaussian on a straight continuum through
// js/inference/fit.js, the resolving power the width implies, a broadened flag, and
// a velocity that is refused when the rest wavelength and the spectrum are not in
// the same medium. It never converts between media and never invents the
// instrument: the reader states the resolving power and the panel says what the
// number rests on.
//
// Nothing from the page's own modules is imported (its translator arrives in
// `ctx`), for the reason js/observatory/fitPanel.js gives.
// =============================================================================

import { listeners } from '../listeners.js';
import { fitLine, radialVelocity } from '../kernels/spectrograph/index.js';
import { LINES } from '../data/radiation/lines.js';
import { EN_SPECTROGRAPH } from '../i18n/en.spectrograph.js';
import { ES_SPECTROGRAPH } from '../i18n/es.spectrograph.js';

const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'text') node.textContent = v;
    else if (v !== undefined && v !== null) node.setAttribute(k, String(v));
  }
  node.append(...children);
  return node;
};

/** nm per unit of the wavelength column, or null when the unit is not a wavelength this panel reads. */
export const nmPerUnit = unit => {
  const u = String(unit ?? '')
    .trim()
    .toLowerCase();
  if (u === 'angstrom' || u === 'å' || u === 'a') return 0.1;
  if (u === 'nm') return 1;
  if (u === 'um' || u === 'micron' || u === 'µm') return 1000;
  return null;
};

/** The lines of the pack that fall inside the spectrum (in the spectrum's medium, or in air when it names none). */
export function linesIn(nm, medium) {
  const key = medium === 'vacuum' ? 'vacuum' : 'air';
  const lo = nm[0];
  const hi = nm[nm.length - 1];
  return LINES.filter(l => l[key] > lo + 2 && l[key] < hi - 2 && l.air);
}

/**
 * Fit one line of a spectrum. Pure: the panel's view is built from what this returns.
 * @param {{nm: ArrayLike<number>, flux: ArrayLike<number>, medium: string, R: number, line: object}} o
 */
export function fitSpectrumLine({ nm, flux, medium, R, line }) {
  const key = medium === 'vacuum' ? 'vacuum' : 'air';
  const rest = line[key];
  const n = nm.length;
  // the pixel nearest the rest wavelength, then the largest excursion within 1000 km/s of it
  let i0 = 0;
  while (i0 < n - 1 && nm[i0] < rest) i0++;
  const reach = (rest * 1000) / 299792.458;
  let a = i0;
  while (a > 0 && nm[a] > rest - reach) a--;
  let b = i0;
  while (b < n - 1 && nm[b] < rest + reach) b++;
  const win = Array.from(flux.slice(a, b + 1)).sort((p, q) => p - q);
  const med = win[Math.floor(win.length / 2)];
  let guess = i0;
  let best = -1;
  for (let i = a; i <= b; i++) {
    const d = Math.abs(flux[i] - med);
    if (d > best) {
      best = d;
      guess = i;
    }
  }
  const disp =
    (nm[Math.min(n - 1, guess + 1)] - nm[Math.max(0, guess - 1)]) / 2;
  const fwhmNm = rest / R;
  const lsfFwhmPx = fwhmNm / disp;
  const xs = Float64Array.from({ length: n }, (_, i) => i);
  const fit = fitLine(xs, flux, null, {
    guess,
    halfWidth: Math.max(8, Math.ceil(4 * lsfFwhmPx)),
    lsfFwhmPx,
  });
  if (fit.status !== 'ok')
    return { status: 'fail', reason: fit.reason ?? fit.status, fit };
  const at = px => {
    const i = Math.max(0, Math.min(n - 2, Math.floor(px)));
    return nm[i] + (px - i) * (nm[i + 1] - nm[i]);
  };
  const centreNm = at(fit.centrePx);
  const sigmaNm = fit.sigmaCentrePx * disp;
  const velocity = radialVelocity({
    observedNm: centreNm,
    sigmaNm,
    restNm: rest,
    observedMedium: medium,
    restMedium: key,
  });
  return {
    status: 'ok',
    fit,
    rest,
    centreNm,
    sigmaNm,
    fwhmNm: fit.fwhmPx * disp,
    lsfFwhmNm: fwhmNm,
    impliedR: centreNm / (fit.fwhmPx * disp),
    velocity,
    guess,
    window: [
      Math.max(0, guess - 3 * Math.ceil(lsfFwhmPx) - 8),
      Math.min(n - 1, guess + 3 * Math.ceil(lsfFwhmPx) + 8),
    ],
  };
}

export function mountSpectrographPanel(root, ctx) {
  const { t, registerMessages } = ctx;
  registerMessages({ en: EN_SPECTROGRAPH, es: ES_SPECTROGRAPH });
  let obs = ctx.observation ?? null;
  const note = el('p', { text: t('specObs.note') });
  const lineSel = el('select', { id: 'obsSpecLine' });
  const rIn = el('input', {
    id: 'obsSpecR',
    type: 'number',
    min: 50,
    max: 200000,
    step: 50,
    value: 1800,
  });
  const go = el('button', {
    type: 'button',
    id: 'obsSpecFit',
    class: 'ui-button',
    text: t('specObs.fit'),
  });
  const form = el(
    'div',
    { class: 'ow-row' },
    el('label', { for: 'obsSpecLine', text: t('specObs.line') }),
    lineSel,
    el('label', { for: 'obsSpecR', text: t('specObs.R') }),
    rIn,
    go
  );
  const out = el('div', { id: 'obsSpecOut', 'aria-live': 'polite' });
  root.replaceChildren(note, form, out);

  const prepare = () => {
    const sp = obs?.spectral;
    const col = obs?.columns.find(c => c.id === sp?.column);
    const flux = obs?.columns.find(c => c.id === obs?.axes?.y);
    const f = col ? nmPerUnit(col.unit) : null;
    if (obs?.kind !== 'spectrum' || !col || !flux || f === null) return null;
    const nm = Float64Array.from(col.values, v => v * f);
    return { nm, flux: flux.values, medium: sp.medium };
  };
  const fill = () => {
    const d = prepare();
    lineSel.replaceChildren();
    if (!d) {
      out.replaceChildren(el('p', { text: t('specObs.notSpectrum') }));
      go.disabled = true;
      return;
    }
    const ls = linesIn(d.nm, d.medium);
    for (const l of ls)
      lineSel.append(
        el('option', {
          value: l.id,
          text: `${l.name ?? l.id} (${(d.medium === 'vacuum' ? l.vacuum : l.air).toFixed(3)} nm)`,
        })
      );
    go.disabled = ls.length === 0;
    out.replaceChildren(
      ls.length ? el('p') : el('p', { text: t('specObs.none') })
    );
  };
  const rows = [];
  const row = (label, value) =>
    rows.push(
      el(
        'tr',
        {},
        el('th', { scope: 'row', text: label }),
        el('td', { text: value })
      )
    );
  const run = () => {
    const d = prepare();
    if (!d) return;
    const line = LINES.find(l => l.id === lineSel.value);
    const R = Number(rIn.value);
    if (!line || !(R > 0)) return;
    const r = fitSpectrumLine({ ...d, R, line });
    rows.length = 0;
    row(t('specObs.row.medium'), d.medium);
    if (r.status !== 'ok') {
      row(
        t('specObs.row.centre'),
        t('specObs.v.fail', { r: r.fit?.message ?? r.reason })
      );
    } else {
      row(
        t('specObs.row.centre'),
        t('specObs.v.centre', {
          c: r.centreNm.toFixed(4),
          s: r.sigmaNm.toFixed(4),
        })
      );
      row(
        t('specObs.row.width'),
        t('specObs.v.width', {
          w: r.fwhmNm.toFixed(3),
          i: r.lsfFwhmNm.toFixed(3),
        })
      );
      row(
        t('specObs.row.sampling'),
        t('specW.v.sampling', {
          s: r.fit.sampling.toFixed(2),
          v: t(`specW.verdict.${r.fit.samplingVerdict}`),
        })
      );
      row(t('specObs.row.R'), t('specObs.v.R', { r: Math.round(r.impliedR) }));
      row(
        t('specObs.row.flag'),
        r.fit.broadened ? t('specObs.v.broad') : t('specObs.v.narrow')
      );
      const v = r.velocity;
      row(
        t('specObs.row.velocity'),
        v.status === 'ok'
          ? t('specObs.v.velocity', {
              v: v.velocityKmS.toFixed(1),
              s: v.sigmaKmS.toFixed(1),
            })
          : d.medium === 'unknown'
            ? t('specObs.v.unknown')
            : t('specObs.v.refused', {
                a: d.medium,
                b: v.message ?? '',
              })
      );
    }
    row(t('specObs.row.assumes'), t('specObs.a'));
    out.replaceChildren(
      el('table', { class: 'ow-table' }, el('tbody', {}, ...rows))
    );
  };
  const listen = listeners();
  listen(go, 'click', run);
  fill();
  return {
    update(o) {
      obs = o;
      fill();
    },
    destroy() {
      listen.off();
      root.replaceChildren();
    },
  };
}
