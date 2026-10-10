// =============================================================================
// The Sky Lab's five instruments
// -----------------------------------------------------------------------------
// An altitude-azimuth reader, a sidereal clock, an airmass and twilight
// calculator, a rise-transit-set tool and a phase and elongation reader. Each
// reads the site and the instant the page holds, calls one function of
// js/kernels/sky/readings.js, shows the numbers, and saves them as an envelope
// (./evidence.js). A lesson that docks one later reads the same function. A lazy
// module: the page fetches it when the instruments are opened.
// =============================================================================

import {
  altAzReading,
  siderealClock,
  airmassReading,
  twilightReading,
  riseTransitSetReading,
  phaseReading,
} from '../kernels/sky/readings.js';
import { calendarDate } from '../kernels/sky/time.js';
import { PLANET_IDS } from '../kernels/sky/sky.js';

const esc = s =>
  String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const pad = (n, w = 2) => String(n).padStart(w, '0');

/**
 * @param {HTMLElement} host - Where the five cards go
 * @param {object} ctx - The page's: {state, L, name, saveFile, stars}
 *   state: {site, jdUt}; name(object) the display name; saveFile(name, text, type)
 */
export function mountInstruments(host, ctx) {
  const { L } = ctx;
  const cards = [];
  const card = (id, titleEn, titleEs, build) => {
    const sec = document.createElement('section');
    sec.className = 'ui-card sky-inst';
    sec.setAttribute('aria-labelledby', `${id}-h`);
    sec.innerHTML = `<h3 id="${id}-h">${esc(L(titleEn, titleEs))}</h3><div class="sky-inst-body"></div>`;
    host.appendChild(sec);
    const body = sec.querySelector('.sky-inst-body');
    const api = build(body, id);
    cards.push(api);
    return api;
  };
  const dateText = jd => {
    const c = calendarDate(jd);
    return `${pad(c.year, 4)}-${pad(c.month)}-${pad(c.day)} ${pad(c.hours)}:${pad(c.minutes)}:${pad(c.seconds)} UTC`;
  };
  const timeOf = (jd, ref) => {
    if (jd === null || jd === undefined)
      return L('none that day', 'ninguno ese día');
    const c = calendarDate(jd);
    const d = calendarDate(ref);
    const day = c.day !== d.day ? ` (${pad(c.month)}-${pad(c.day)})` : '';
    return `${pad(c.hours)}:${pad(c.minutes)}:${pad(c.seconds)} UTC${day}`;
  };
  const hms = deg => {
    const h = (((deg % 360) + 360) % 360) / 15;
    const hh = Math.floor(h);
    const m = Math.floor((h - hh) * 60);
    const s = ((h - hh) * 60 - m) * 60;
    return `${pad(hh)}h ${pad(m)}m ${s.toFixed(1).padStart(4, '0')}s`;
  };
  const f = (x, d = 3) => (Number.isFinite(x) ? x.toFixed(d) : '—');
  const rows = list =>
    `<dl class="sky-readout">${list.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
  const saveButton = (body, id, make) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ui-button';
    b.id = `${id}-save`;
    b.textContent = L(
      'Save this reading (JSON)',
      'Guardar esta lectura (JSON)'
    );
    const note = document.createElement('p');
    note.className = 'ui-hint';
    note.setAttribute('role', 'status');
    b.addEventListener('click', async () => {
      try {
        const ev = await import('./evidence.js');
        ctx.saveFile(
          `sky-lab-${id}.json`,
          ev.envelopeFile(make(ev)),
          'application/json'
        );
        note.textContent = L(
          'Saved as a gravitas.artifact/1 file on this device.',
          'Guardado como archivo gravitas.artifact/1 en este dispositivo.'
        );
      } catch (err) {
        note.textContent = String(err.message || err);
      }
    });
    body.append(b, note);
  };

  // Targets for the reader and the rise-set tool.
  const targetSelect = (id, onChange) => {
    const sel = document.createElement('select');
    sel.id = id;
    sel.className = 'ui-select';
    const opt = (v, t) => `<option value="${esc(v)}">${esc(t)}</option>`;
    sel.innerHTML =
      `<optgroup label="${esc(L('Solar system', 'Sistema solar'))}">${opt('sun', L('Sun', 'Sol'))}${opt('moon', L('Moon', 'Luna'))}${PLANET_IDS.map(p => opt(p, ctx.planetName(p))).join('')}</optgroup>` +
      `<optgroup label="${esc(L('Bright stars', 'Estrellas brillantes'))}">${ctx.stars
        .filter(s => s.v <= 3.5)
        .map(s => opt(`hr${s.hr}`, ctx.starName(s)))
        .join('')}</optgroup>` +
      `<optgroup label="${esc(L('Your own', 'La tuya'))}">${opt('fixed', L('A position (J2000)', 'Una posición (J2000)'))}</optgroup>`;
    sel.value = 'sun';
    sel.addEventListener('change', onChange);
    return sel;
  };
  const fixedFields = onChange => {
    const w = document.createElement('div');
    w.className = 'sky-fixed';
    w.hidden = true;
    w.innerHTML = `<label>${esc(L('Right ascension, J2000 (degrees)', 'Ascensión recta, J2000 (grados)'))}<input class="ui-input" type="number" step="any" min="0" max="360" value="101.287"></label>
      <label>${esc(L('Declination, J2000 (degrees)', 'Declinación, J2000 (grados)'))}<input class="ui-input" type="number" step="any" min="-90" max="90" value="-16.716"></label>`;
    w.addEventListener('change', onChange);
    return w;
  };
  const targetOf = (sel, fixed) => {
    const v = sel.value;
    if (v === 'sun' || v === 'moon') return { type: v };
    if (PLANET_IDS.includes(v)) return { type: 'planet', id: v };
    if (v === 'fixed') {
      const [ra, dec] = [...fixed.querySelectorAll('input')].map(i =>
        Number(i.value)
      );
      return { type: 'fixed', raDeg: ra, decDeg: dec };
    }
    const star = ctx.stars.find(s => `hr${s.hr}` === v);
    return { type: 'star', star };
  };
  const ctxOf = (target, key) => ({
    site: ctx.state.site,
    jdUt: ctx.state.jdUt,
    type: target.type,
    key,
  });

  // 1. Altitude-azimuth reader
  card(
    'inst-altaz',
    'Altitude-azimuth reader',
    'Lector de altura y acimut',
    (body, id) => {
      const out = document.createElement('div');
      const fixed = fixedFields(() => update());
      const sel = targetSelect(`${id}-target`, () => {
        fixed.hidden = sel.value !== 'fixed';
        update();
      });
      const lab = document.createElement('label');
      lab.append(document.createTextNode(L('Target', 'Objeto') + ' '), sel);
      body.append(lab, fixed, out);
      let last = null;
      const update = () => {
        const t = targetOf(sel, fixed);
        const r = altAzReading(t, ctx.state.jdUt, ctx.state.site);
        last = { r, t };
        out.innerHTML = rows([
          [L('Apparent altitude', 'Altura aparente'), `${f(r.altDeg)}°`],
          [L('Geometric altitude', 'Altura geométrica'), `${f(r.altGeomDeg)}°`],
          [
            L('Azimuth (north 0°, east 90°)', 'Acimut (norte 0°, este 90°)'),
            `${f(r.azDeg)}°`,
          ],
          [L('Hour angle', 'Ángulo horario'), `${f(r.haDeg)}°`],
          [
            L('Right ascension of date', 'Ascensión recta de la fecha'),
            `${hms(r.raDeg)}`,
          ],
          [
            L('Declination of date', 'Declinación de la fecha'),
            `${f(r.decDeg)}°`,
          ],
          [
            L('Refraction', 'Refracción'),
            `${f(r.refractionArcmin, 1)}′ ± ${f(r.refractionSpreadArcmin, 1)}′ (${L('weather', 'clima')})`,
          ],
          [
            L('Airmass', 'Masa de aire'),
            r.airmass === null
              ? L('below the horizon', 'bajo el horizonte')
              : f(r.airmass, 2),
          ],
        ]);
      };
      saveButton(body, id, ev =>
        ev.altAzEnvelope(last.r, ctxOf(last.t, sel.value))
      );
      return { update };
    }
  );

  // 2. Sidereal clock
  card('inst-clock', 'Sidereal clock', 'Reloj sideral', (body, id) => {
    const out = document.createElement('div');
    body.append(out);
    let last = null;
    const update = () => {
      const c = siderealClock(ctx.state.jdUt, ctx.state.site.lonDeg);
      last = c;
      out.innerHTML = rows([
        [L('Universal time', 'Tiempo universal'), dateText(c.jdUt)],
        [
          L('Delta-T (TT − UT)', 'Delta-T (TT − UT)'),
          `${f(c.deltaTSec, 2)} s${c.deltaTRangeSec === null ? ` (${L('not validated before 1972', 'no validado antes de 1972')})` : ` ± ${f(c.deltaTRangeSec, 1)} s`}`,
        ],
        [
          L(
            'Greenwich mean sidereal time',
            'Tiempo sideral medio en Greenwich'
          ),
          hms(c.gmstDeg),
        ],
        [
          L(
            'Greenwich apparent sidereal time',
            'Tiempo sideral aparente en Greenwich'
          ),
          hms(c.gastDeg),
        ],
        [
          L('Local mean sidereal time', 'Tiempo sideral medio local'),
          hms(c.lmstDeg),
        ],
        [
          L('Local apparent sidereal time', 'Tiempo sideral aparente local'),
          hms(c.lastDeg),
        ],
        [
          L('Equation of the equinoxes', 'Ecuación de los equinoccios'),
          `${f(c.equationOfEquinoxesSec, 3)} s`,
        ],
        [
          L(
            'Right ascension on the meridian',
            'Ascensión recta en el meridiano'
          ),
          hms(c.meridianRaDeg),
        ],
      ]);
    };
    saveButton(body, id, ev =>
      ev.clockEnvelope(last, ctxOf({ type: 'clock' }, 'clock'))
    );
    return { update };
  });

  // 3. Airmass and twilight
  card(
    'inst-twilight',
    'Airmass and twilight calculator',
    'Calculadora de masa de aire y crepúsculo',
    (body, id) => {
      const alt = document.createElement('input');
      alt.type = 'number';
      alt.className = 'ui-input';
      alt.min = '0';
      alt.max = '90';
      alt.step = 'any';
      alt.value = '30';
      const lab = document.createElement('label');
      lab.append(
        document.createTextNode(
          L('Apparent altitude (degrees)', 'Altura aparente (grados)') + ' '
        ),
        alt
      );
      const out = document.createElement('div');
      body.append(lab, out);
      let last = null;
      const update = () => {
        const a = airmassReading(Number(alt.value));
        const jd0 = Math.floor(ctx.state.jdUt - 0.5) + 0.5;
        const t = twilightReading(jd0, ctx.state.site);
        last = { a, t };
        const tw = (name, en, es) => [
          L(en, es),
          `${timeOf(t.twilight[name].duskJd, jd0)} → ${timeOf(t.twilight[name].dawnJd, jd0)}`,
        ];
        out.innerHTML =
          rows([
            [
              L('Airmass (Kasten and Young)', 'Masa de aire (Kasten y Young)'),
              a.airmass === null ? '—' : f(a.airmass, 3),
            ],
            [
              L('Plane-parallel, sec z', 'Plano-paralela, sec z'),
              a.secantAirmass === null ? '—' : f(a.secantAirmass, 3),
            ],
            [
              L('Difference (secant − fit)', 'Diferencia (secante − ajuste)'),
              a.secantMinusFit === null ? '—' : f(a.secantMinusFit, 3),
            ],
          ]) +
          `<h4>${esc(L('The Sun on this UTC day', 'El Sol en este día UTC'))}</h4>` +
          rows([
            [
              L('Sunrise / sunset', 'Salida / puesta del Sol'),
              t.sunStatus === 'normal'
                ? `${timeOf(t.sunrise, jd0)} / ${timeOf(t.sunset, jd0)}`
                : t.sunStatus === 'circumpolar'
                  ? L('the Sun does not set', 'el Sol no se pone')
                  : L('the Sun does not rise', 'el Sol no sale'),
            ],
            tw(
              'civil',
              'Civil twilight (Sun −6°): dusk → dawn',
              'Crepúsculo civil (Sol −6°): ocaso → alba'
            ),
            tw(
              'nautical',
              'Nautical twilight (−12°)',
              'Crepúsculo náutico (−12°)'
            ),
            tw(
              'astronomical',
              'Astronomical twilight (−18°)',
              'Crepúsculo astronómico (−18°)'
            ),
            [
              L('Astronomical night', 'Noche astronómica'),
              t.astronomicalNightDays === null
                ? L(
                    'none: the Sun stays above −18°',
                    'ninguna: el Sol no baja de −18°'
                  )
                : `${f(t.astronomicalNightDays * 24, 2)} h`,
            ],
          ]);
      };
      alt.addEventListener('input', update);
      saveButton(body, id, ev =>
        ev.airmassTwilightEnvelope(
          last.a,
          last.t,
          ctxOf({ type: 'sun' }, `am${alt.value}`)
        )
      );
      return { update };
    }
  );

  // 4. Rise, transit, set
  card(
    'inst-rts',
    'Rise, transit and set',
    'Salida, tránsito y puesta',
    (body, id) => {
      const out = document.createElement('div');
      const fixed = fixedFields(() => update());
      const sel = targetSelect(`${id}-target`, () => {
        fixed.hidden = sel.value !== 'fixed';
        update();
      });
      sel.value = 'moon';
      const lab = document.createElement('label');
      lab.append(document.createTextNode(L('Target', 'Objeto') + ' '), sel);
      body.append(lab, fixed, out);
      let last = null;
      const update = () => {
        const t = targetOf(sel, fixed);
        const jd0 = Math.floor(ctx.state.jdUt - 0.5) + 0.5;
        const r = riseTransitSetReading(t, jd0, ctx.state.site);
        last = { r, t };
        const status =
          r.status === 'circumpolar'
            ? L('never sets on this day', 'no se pone este día')
            : r.status === 'neverRises'
              ? L('never rises on this day', 'no sale este día')
              : null;
        out.innerHTML = rows([
          [
            L('Rises', 'Sale'),
            `${timeOf(r.riseJd, jd0)}${r.riseAzDeg === null ? '' : `, ${L('azimuth', 'acimut')} ${f(r.riseAzDeg, 1)}°`}`,
          ],
          [
            L('Transits', 'Culmina'),
            `${timeOf(r.transitJd, jd0)}${r.transitAltDeg === null ? '' : `, ${L('altitude', 'altura')} ${f(r.transitAltDeg, 1)}°`}`,
          ],
          [
            L('Sets', 'Se pone'),
            `${timeOf(r.setJd, jd0)}${r.setAzDeg === null ? '' : `, ${L('azimuth', 'acimut')} ${f(r.setAzDeg, 1)}°`}`,
          ],
          ...(status ? [[L('Note', 'Nota'), status]] : []),
        ]);
      };
      saveButton(body, id, ev =>
        ev.riseSetEnvelope(last.r, ctxOf(last.t, sel.value))
      );
      return { update };
    }
  );

  // 5. Phase and elongation
  card(
    'inst-phase',
    'Phase and elongation reader',
    'Lector de fase y elongación',
    (body, id) => {
      const out = document.createElement('div');
      body.append(out);
      let last = null;
      const update = () => {
        const p = phaseReading(ctx.state.jdUt);
        last = p;
        out.innerHTML =
          rows([
            [
              L('Moon: elongation from the Sun', 'Luna: elongación del Sol'),
              `${f(p.elongationDeg, 2)}°`,
            ],
            [L('Phase angle', 'Ángulo de fase'), `${f(p.phaseAngleDeg, 2)}°`],
            [
              L('Illuminated fraction', 'Fracción iluminada'),
              `${f(p.illuminated * 100, 1)} %`,
            ],
            [
              L('Waxing or waning', 'Creciente o menguante'),
              p.waxing ? L('waxing', 'creciente') : L('waning', 'menguante'),
            ],
            [
              L('Next new Moon', 'Próxima luna nueva'),
              dateText(p.nextNewMoonJd),
            ],
            [
              L('Next full Moon', 'Próxima luna llena'),
              dateText(p.nextFullMoonJd),
            ],
          ]) +
          `<h4>${esc(L('Planets (geometric)', 'Planetas (geométrico)'))}</h4>` +
          rows(
            Object.entries(p.planets).map(([k, v]) => [
              ctx.planetName(k),
              `${L('elongation', 'elongación')} ${f(v.elongationDeg, 1)}°, ${L('illuminated', 'iluminado')} ${f(v.illuminated * 100, 0)} %`,
            ])
          );
      };
      saveButton(body, id, ev =>
        ev.phaseEnvelope(last, ctxOf({ type: 'moon' }, 'phase'))
      );
      return { update };
    }
  );

  return {
    update() {
      for (const c of cards) c.update();
    },
  };
}
