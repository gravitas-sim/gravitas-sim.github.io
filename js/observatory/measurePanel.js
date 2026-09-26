// =============================================================================
// The observatory's measurement pipeline: tools, results, and what led to them
// -----------------------------------------------------------------------------
// Loaded only when a reader opens it, so the observatory's own route carries
// none of it. It measures the observation in view with the tools in
// js/measure/ and keeps every result as a node of a gravitas.pipeline/1
// (js/measure/pipeline.js):
//
//   - a form for the tool that suits the observation, prefilled from the data;
//   - each result: its quantities, each MEASURED, DERIVED or ASSUMED, its
//     warnings, and what to do with it - recompute, change its parameters,
//     fold at its period, mask the rows a filter failed, add it to the
//     notebook, draw its periodogram;
//   - the pipeline itself: the source, every change and how it treats
//     uncertainty, every measurement at its place among them, every fit;
//   - undo and redo, a methods summary in words, and the pipeline saved as
//     JSON and read back - replayed, recomputed and compared, node by node.
//
// Nothing from the page's own modules is imported here: they arrive in `ctx`,
// as they do for the fit panel, because a module both this chunk and the page
// reached would leave the page's bundle for a chunk of its own - one more
// request for every visitor, measured or not.
// =============================================================================

import {
  CHANGE_CLASS,
  contentDigest,
  nextId,
  pipelineJson,
  readPipeline,
  runNode,
  sameResult,
  toolsFor,
} from '../measure/pipeline.js';
import { OPERATORS } from '../measure/tableOps.js';
import { LIMITS } from '../measure/periodogram.js';
import { observedEntry } from '../notebook/observed.js';
import { figure, figureSeries } from '../notebook/entry.js';
import {
  load as loadNotebook,
  save as saveNotebook,
} from '../notebook/store.js';
import { EN_MEASURE } from '../i18n/en.measure.js';
import { ES_MEASURE } from '../i18n/es.measure.js';

const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'text') node.textContent = v;
    else if (v !== undefined && v !== null && v !== false)
      node.setAttribute(k, v === true ? '' : String(v));
  }
  node.append(...children.filter(c => c !== null && c !== undefined));
  return node;
};

/** Balmer lines, vacuum and air, from the NIST Atomic Spectra Database. */
export const LINES = Object.freeze([
  {
    id: 'ha',
    name: 'H-alpha',
    vacuum: 6564.61,
    air: 6562.8,
    half: 20,
    gap: 25,
    side: 40,
  },
  {
    id: 'hb',
    name: 'H-beta',
    vacuum: 4862.68,
    air: 4861.35,
    half: 15,
    gap: 20,
    side: 30,
  },
  {
    id: 'hg',
    name: 'H-gamma',
    vacuum: 4341.69,
    air: 4340.47,
    half: 12,
    gap: 15,
    side: 25,
  },
]);

/**
 * @param {HTMLElement} root - The panel's <details>, whose summary stays
 * @param {object} ctx - The page's pieces: t, number, registerMessages,
 *   createPlot, createSelection, open(o, changes), status(text),
 *   apply(change), state, replay(source, changes), observationJson(o, ws),
 *   importer() => import.js, skyOf, pixelScale
 * @returns {{update: () => Promise<void>, rebuild: () => void,
 *   destroy: () => void}}
 */
export function mountMeasurePanel(root, ctx) {
  ctx.registerMessages({ en: EN_MEASURE, es: ES_MEASURE });
  // The reader's work, kept apart from what is drawn, so a rebuild in a new
  // language loses none of it.
  const model = {
    stack: [[]],
    at: 0,
    status: new Map(), // node id -> 'current' | 'stale'
    readBack: new Map(), // node id -> { same, savedVersion }
    editing: null,
    second: null, // the match tool's second table: { name, o }
    digests: new Map(),
    source: null,
    running: null,
    // True while a saved pipeline's own observation is being opened, so the
    // measurements it brings are not taken for the last observation's.
    adopting: false,
  };
  const nodes = () => model.stack[model.at];
  const commit = next => {
    model.stack = model.stack
      .slice(0, model.at + 1)
      .concat([next])
      .slice(-100);
    model.at = model.stack.length - 1;
  };
  let ui = build();

  // --- The data at a node's position ----------------------------------------------

  const changes = () => ctx.state.history.changes();
  const viewAt = at => ctx.replay(ctx.state.source, changes().slice(0, at)).o;
  async function digestAt(at) {
    if (at > changes().length) return null;
    const key = `${ctx.state.source.id}\u0000${JSON.stringify(changes().slice(0, at))}`;
    if (!model.digests.has(key))
      model.digests.set(key, contentDigest(viewAt(at)));
    return model.digests.get(key);
  }

  // --- Words ------------------------------------------------------------------------

  function words() {
    const { t, number } = ctx;
    const num = v => (Number.isFinite(v) ? number(v) : String(v ?? '–'));
    const kind = k =>
      k === 'derived'
        ? t('obs.ms.kind.derived')
        : k === 'assumed'
          ? t('obs.ms.kind.assumed')
          : t('obs.ms.kind.measured');
    const quantityName = q => {
      const map = {
        period: t('obs.ms.q.period'),
        power: t('obs.ms.q.power'),
        falseAlarm: t('obs.ms.q.falseAlarm'),
        amplitude: t('obs.ms.q.amplitude'),
        points: t('obs.ms.q.points'),
        epoch: t('obs.ms.q.epoch'),
        duration: t('obs.ms.q.duration'),
        depth: t('obs.ms.q.depth'),
        sde: t('obs.ms.q.sde'),
        ew: t('obs.ms.q.ew'),
        center: t('obs.ms.q.center'),
        rest: t('obs.ms.q.rest'),
        velocity: t('obs.ms.q.velocity'),
        count: t('obs.ms.q.count'),
        centroidX: t('obs.ms.q.centroidX'),
        centroidY: t('obs.ms.q.centroidY'),
        ra: t('obs.ms.q.ra'),
        dec: t('obs.ms.q.dec'),
        skyArea: t('obs.ms.q.skyArea'),
        sum: t('obs.ms.q.sum'),
        area: t('obs.ms.q.area'),
        background: t('obs.ms.q.background'),
        net: t('obs.ms.q.net'),
        kept: t('obs.ms.q.kept'),
        dropped: t('obs.ms.q.dropped'),
        pairs: t('obs.ms.q.pairs'),
        unmatched: t('obs.ms.q.unmatched'),
        ambiguous: t('obs.ms.q.ambiguous'),
      };
      return map[q.id] ?? q.id;
    };
    const toolName = id =>
      ({
        period: t('obs.ms.tool.period'),
        box: t('obs.ms.tool.box'),
        line: t('obs.ms.tool.line'),
        aperture: t('obs.ms.tool.aperture'),
        filter: t('obs.ms.tool.filter'),
        match: t('obs.ms.tool.match'),
      })[id] ?? id;
    const value = q => {
      const unit = q.unit ? ` ${q.unit}` : '';
      return Number.isFinite(q.error)
        ? `${num(q.value)} ± ${num(q.error)}${unit}`
        : `${num(q.value)}${unit}`;
    };
    const warning = w => {
      const v = w;
      switch (w.code) {
        case 'unweighted':
          return t('obs.ms.w.unweighted');
        case 'notSignificant':
          return t('obs.ms.w.notSignificant', {
            falseAlarm: num(v.falseAlarm),
          });
        case 'atEdge':
          return t('obs.ms.w.atEdge');
        case 'fewCycles':
          return t('obs.ms.w.fewCycles');
        case 'errorAssumesSinusoid':
          return t('obs.ms.w.errorAssumesSinusoid');
        case 'weakDetection':
          return t('obs.ms.w.weakDetection', { sde: num(v.sde) });
        case 'noPeriodError':
          return t('obs.ms.w.noPeriodError');
        case 'maskedLeftOut':
          return t('obs.ms.w.maskedLeftOut', { n: v.n });
        case 'noErrorLeftOut':
          return t('obs.ms.w.noErrorLeftOut', { n: v.n });
        case 'errorsFromScatter':
          return t('obs.ms.w.errorsFromScatter');
        case 'continuumPoorFit':
          return t('obs.ms.w.continuumPoorFit', {
            reducedChi2: num(v.reducedChi2),
          });
        case 'noAbsorption':
          return t('obs.ms.w.noAbsorption');
        case 'emission':
          return t('obs.ms.w.emission');
        case 'noiseModelAssumed':
          return t('obs.ms.w.noiseModelAssumed');
        case 'apertureCut':
          return t('obs.ms.w.apertureCut');
        case 'noSource':
          return t('obs.ms.w.noSource');
        case 'noPixels':
          return t('obs.ms.w.noPixels');
        case 'missingValues':
          return t('obs.ms.w.missingValues', { n: v.n, column: v.column });
        case 'ambiguous':
          return t('obs.ms.w.ambiguous', { n: v.n });
        default:
          return w.code;
      }
    };
    const stage = s =>
      ({
        selection: t('obs.ms.stage.selection'),
        calibration: t('obs.ms.stage.calibration'),
        transformation: t('obs.ms.stage.transformation'),
        annotation: t('obs.ms.stage.annotation'),
      })[s] ?? s;
    const treatment = s =>
      ({
        kept: t('obs.ms.treat.kept'),
        scaled: t('obs.ms.treat.scaled'),
        scaledAssumed: t('obs.ms.treat.scaledAssumed'),
        propagated: t('obs.ms.treat.propagated'),
      })[s] ?? s;
    const status = s =>
      s === 'stale'
        ? t('obs.ms.status.stale')
        : s === 'failed'
          ? t('obs.ms.status.failed')
          : t('obs.ms.status.current');
    const params = c =>
      Object.entries(c)
        .filter(([k]) => k !== 'op' && k !== 'rows')
        .map(
          ([k, v]) =>
            `${k} ${Array.isArray(v) ? v.join('–') : typeof v === 'number' ? num(v) : v}`
        )
        .join(', ');
    return {
      num,
      kind,
      quantityName,
      toolName,
      value,
      warning,
      stage,
      treatment,
      status,
      params,
    };
  }

  /** The methods, in words: the data, every change, every measurement. */
  function methods() {
    const { t } = ctx;
    const w = words();
    const out = [];
    const src = ctx.state.source;
    if (!src) return out;
    out.push(
      t('obs.ms.m.source', {
        title: src.title,
        id: src.id,
        source: [src.source?.kind, src.source?.id, src.source?.version]
          .filter(Boolean)
          .join(' '),
        digest: model.source?.digest?.slice(0, 16) ?? '…',
      })
    );
    changes().forEach((c, i) => {
      const cls = CHANGE_CLASS[c.op];
      out.push(
        t('obs.ms.m.change', {
          n: i + 1,
          op: t(`obs.op.${c.op}`),
          params: w.params(c) || '–',
          treatment: w.treatment(cls?.uncertainty),
        })
      );
    });
    for (const n of nodes()) {
      const p = n.params;
      const unit = n.quantities?.[0]?.unit ?? '';
      if (n.tool === 'period')
        out.push(
          t('obs.ms.m.period', {
            id: n.id,
            min: w.num(p.minPeriod),
            max: w.num(p.maxPeriod),
            unit,
            over: p.oversample,
            at: n.at,
          })
        );
      else if (n.tool === 'box')
        out.push(
          t('obs.ms.m.box', {
            id: n.id,
            min: w.num(p.minPeriod),
            max: w.num(p.maxPeriod),
            unit,
            durations: p.durations.map(w.num).join(', '),
            at: n.at,
          })
        );
      else if (n.tool === 'line') {
        out.push(
          t('obs.ms.m.line', {
            id: n.id,
            blueLo: w.num(p.blue[0]),
            blueHi: w.num(p.blue[1]),
            redLo: w.num(p.red[0]),
            redHi: w.num(p.red[1]),
            lineLo: w.num(p.line[0]),
            lineHi: w.num(p.line[1]),
            unit,
            at: n.at,
          })
        );
        if (p.rest) out.push(t('obs.ms.m.rest', { rest: w.num(p.rest), unit }));
      } else if (n.tool === 'aperture')
        out.push(
          p.mode === 'bits'
            ? t('obs.ms.m.bits', { id: n.id, bit: p.bit, at: n.at })
            : t('obs.ms.m.flux', {
                id: n.id,
                r: w.num(p.r),
                x: w.num(p.x),
                y: w.num(p.y),
                rIn: w.num(p.rIn),
                rOut: w.num(p.rOut),
                at: n.at,
              })
        );
      else if (n.tool === 'filter')
        out.push(
          t('obs.ms.m.filter', {
            id: n.id,
            conditions: p.conditions
              .map(
                c =>
                  `${c.column} ${c.op} ${c.value}${c.unit ? ` ${c.unit}` : ''}`
              )
              .join(p.join === 'any' ? t('obs.ms.or') : t('obs.ms.and')),
            at: n.at,
          })
        );
      else if (n.tool === 'match')
        out.push(
          t('obs.ms.m.match', {
            id: n.id,
            tolerance:
              p.how.by === 'sky'
                ? `${w.num(p.how.radiusArcsec)} arcsec`
                : w.num(p.how.tolerance),
            at: n.at,
          })
        );
    }
    for (const f of fitsHere())
      out.push(
        t('obs.ms.m.fit', {
          model: f.model?.id,
          algorithm: f.algorithm?.id,
          version: f.algorithm?.version,
        })
      );
    return out;
  }

  const fitsHere = () =>
    (ctx.state.fits || []).filter(
      f => f.data?.observation === ctx.state.source?.id
    );

  // --- The form -------------------------------------------------------------------

  /** Defaults from the data, so a first run is a sensible one. */
  function defaults(toolId, o) {
    if (toolId === 'period' || toolId === 'box') {
      const tc = o.columns.find(
        c => c.id === (o.axes.x === 'phase' ? o.time?.column : o.axes.x)
      );
      const t = Array.from(tc.values)
        .filter(Number.isFinite)
        .sort((a, b) => a - b);
      const T = t.at(-1) - t[0] || 1;
      const unit = tc.unit ?? '';
      // As many trials as the search allows for this many points, with room.
      const L =
        0.8 * Math.min(LIMITS.frequencies, LIMITS.work / Math.max(1, t.length));
      const round = x => +x.toPrecision(3);
      if (toolId === 'period') {
        const max = Math.min(T / 2, 1000);
        // Trial frequencies are (1/min - 1/max) 5 T; as short as that allows,
        // down to a tenth of the unit.
        const min = Math.max(0.1, 1 / (L / (5 * T) + 1 / max));
        return {
          unit,
          minPeriod: round(min * 1.01),
          maxPeriod: round(max),
          oversample: 5,
        };
      }
      const durations = unit === 'd' ? [0.08, 0.12, 0.16] : [];
      const max = Math.min(T / 2, 20);
      const dmin = durations[0] ?? T / 100;
      // Trial periods are about (max - min) 4 T / (dmin min).
      const min = Math.max(0.5, (max * 4 * T) / (dmin * L + 4 * T));
      return {
        unit,
        minPeriod: round(min * 1.01),
        maxPeriod: round(max),
        durations,
      };
    }
    if (toolId === 'line') {
      const xc = o.columns.find(c => c.id === o.axes.x);
      return {
        unit: xc.unit ?? '',
        medium: o.spectral?.medium ?? 'vacuum',
        z: o.spectral?.redshift ?? 0,
        presets: xc.unit === 'Angstrom',
      };
    }
    if (toolId === 'aperture') {
      const vc = o.columns.find(c => c.id === o.image.value);
      return {
        mode: vc.role === 'flag' ? 'bits' : 'flux',
        bits: vc.bits || [],
        x: (o.image.width + 1) / 2,
        y: (o.image.height + 1) / 2,
      };
    }
    return {};
  }

  function field(id, label, value, attrs = {}) {
    return el(
      'label',
      { class: 'ow-field' },
      el('span', { text: label }),
      el('input', {
        id,
        type: 'text',
        inputmode: 'decimal',
        value: value ?? '',
        autocomplete: 'off',
        ...attrs,
      })
    );
  }
  function select(id, label, options, selected) {
    const s = el('select', { id });
    for (const [value, text] of options)
      s.append(el('option', { value, text, selected: value === selected }));
    return el('label', { class: 'ow-field' }, el('span', { text: label }), s);
  }

  function renderParams(box, toolId, o, preset = null) {
    const { t } = ctx;
    const d = defaults(toolId, o);
    const p = preset?.tool === toolId ? preset.params : null;
    box.replaceChildren();
    if (toolId === 'period') {
      box.append(
        field(
          'msMin',
          t('obs.ms.p.minPeriod', { unit: d.unit }),
          p?.minPeriod ?? d.minPeriod
        ),
        field(
          'msMax',
          t('obs.ms.p.maxPeriod', { unit: d.unit }),
          p?.maxPeriod ?? d.maxPeriod
        ),
        field('msOver', t('obs.ms.p.oversample'), p?.oversample ?? d.oversample)
      );
    } else if (toolId === 'box') {
      box.append(
        field(
          'msMin',
          t('obs.ms.p.minPeriod', { unit: d.unit }),
          p?.minPeriod ?? d.minPeriod
        ),
        field(
          'msMax',
          t('obs.ms.p.maxPeriod', { unit: d.unit }),
          p?.maxPeriod ?? d.maxPeriod
        ),
        field(
          'msDur',
          t('obs.ms.p.durations', { unit: d.unit }),
          (p?.durations ?? d.durations).join(', ')
        )
      );
    } else if (toolId === 'line') {
      // Strongest first: H-alpha, H-beta, H-gamma, then a line of your own.
      const options = [
        ...(d.presets
          ? LINES.map(L => [
              L.id,
              `${L.name} ${L[d.medium === 'air' ? 'air' : 'vacuum']} Å (${d.medium})`,
            ])
          : []),
        ['custom', t('obs.ms.p.custom')],
      ];
      const presetSel = select(
        'msPreset',
        t('obs.ms.p.preset'),
        options,
        p ? 'custom' : options[0][0]
      );
      const grid = el('div', { class: 'ow-grid' });
      const fill = id => {
        const L = LINES.find(x => x.id === id);
        const rest = L ? L[d.medium === 'air' ? 'air' : 'vacuum'] : null;
        const c = rest ? rest * (1 + d.z) : null;
        const v =
          p ??
          (c && {
            line: [c - L.half, c + L.half],
            blue: [c - L.gap - L.side, c - L.gap],
            red: [c + L.gap, c + L.gap + L.side],
            rest,
          });
        const r = x => (Number.isFinite(x) ? +x.toFixed(2) : '');
        grid.replaceChildren(
          field(
            'msBlueLo',
            t('obs.ms.p.blueLo', { unit: d.unit }),
            r(v?.blue[0])
          ),
          field(
            'msBlueHi',
            t('obs.ms.p.blueHi', { unit: d.unit }),
            r(v?.blue[1])
          ),
          field(
            'msLineLo',
            t('obs.ms.p.lineLo', { unit: d.unit }),
            r(v?.line[0])
          ),
          field(
            'msLineHi',
            t('obs.ms.p.lineHi', { unit: d.unit }),
            r(v?.line[1])
          ),
          field('msRedLo', t('obs.ms.p.redLo', { unit: d.unit }), r(v?.red[0])),
          field('msRedHi', t('obs.ms.p.redHi', { unit: d.unit }), r(v?.red[1])),
          field('msRest', t('obs.ms.p.rest', { unit: d.unit }), v?.rest ?? '')
        );
      };
      presetSel
        .querySelector('select')
        .addEventListener('change', e => fill(e.target.value));
      box.append(presetSel, grid);
      fill(p ? 'custom' : options[0][0]);
      box.dataset.medium = d.medium;
    } else if (toolId === 'aperture') {
      const modeSel = select(
        'msMode',
        t('obs.ms.p.mode'),
        [
          ['flux', t('obs.ms.p.mode.flux')],
          ['bits', t('obs.ms.p.mode.bits')],
        ],
        p?.mode ?? d.mode
      );
      const grid = el('div', { class: 'ow-grid' });
      const fill = mode => {
        const kids = [];
        if (mode === 'bits') {
          kids.push(
            select(
              'msBit',
              t('obs.ms.p.bit'),
              d.bits.map(b => [String(b.value), `${b.value}: ${b.meaning}`]),
              String(
                p?.bit ??
                  d.bits.find(b => b.value === 2)?.value ??
                  d.bits[0]?.value
              )
            ),
            el(
              'label',
              { class: 'ow-field' },
              el('input', {
                id: 'msCircle',
                type: 'checkbox',
                checked: p?.x !== undefined && p?.x !== null,
              }),
              el('span', { text: t('obs.ms.p.circle') })
            )
          );
        }
        kids.push(
          field('msX', t('obs.ms.p.x'), p?.x ?? d.x),
          field('msY', t('obs.ms.p.y'), p?.y ?? d.y),
          field('msR', t('obs.ms.p.r'), p?.r ?? 3)
        );
        if (mode === 'flux')
          kids.push(
            field('msRIn', t('obs.ms.p.rIn'), p?.rIn ?? 5),
            field('msROut', t('obs.ms.p.rOut'), p?.rOut ?? 8),
            field('msGain', t('obs.ms.p.gain'), p?.gain ?? '')
          );
        grid.replaceChildren(...kids);
      };
      modeSel
        .querySelector('select')
        .addEventListener('change', e => fill(e.target.value));
      box.append(modeSel, grid);
      fill(p?.mode ?? d.mode);
    } else if (toolId === 'filter') {
      const cols = o.columns.filter(c => c.role !== 'uncertainty');
      const grid = el('div', { id: 'msConditions' });
      const conds = p?.conditions ?? [
        {
          column: cols.find(c => c.role !== 'label')?.id ?? cols[0].id,
          op: '>',
          value: '',
        },
      ];
      for (let i = 0; i < 3; i++) {
        const c = conds[i];
        const row = el(
          'fieldset',
          { class: 'ow-grid' },
          el('legend', { text: `${t('obs.ms.p.op')} ${i + 1}` }),
          select(
            `msCol${i}`,
            t('obs.ms.p.column'),
            [['', '–'], ...cols.map(k => [k.id, k.name])],
            c?.column ?? ''
          ),
          select(
            `msOp${i}`,
            t('obs.ms.p.op'),
            OPERATORS.map(x => [x, x]),
            c?.op ?? '>'
          ),
          field(`msVal${i}`, t('obs.ms.p.value'), c?.value ?? ''),
          el('p', { id: `msUnit${i}`, class: 'ow-hint' })
        );
        const unitNote = () => {
          const k = cols.find(x => x.id === row.querySelector('select').value);
          row.querySelector('p').textContent =
            k && k.role !== 'label'
              ? t('obs.ms.p.inUnit', { unit: k.unit || '–' })
              : '';
        };
        row.querySelector('select').addEventListener('change', unitNote);
        unitNote();
        grid.append(row);
      }
      box.append(
        grid,
        select(
          'msJoin',
          t('obs.ms.p.join'),
          [
            ['all', t('obs.ms.p.join.all')],
            ['any', t('obs.ms.p.join.any')],
          ],
          p?.join ?? 'all'
        )
      );
    } else if (toolId === 'match') {
      const file = el('input', {
        id: 'msSecond',
        type: 'file',
        accept: '.csv,.tsv,.txt,.json',
      });
      const note = el('p', {
        id: 'msSecondNote',
        class: 'ow-hint',
        role: 'status',
      });
      const how = el('div', { id: 'msHow' });
      const fill = () => {
        how.replaceChildren();
        if (!model.second) return;
        const numeric = (x, deg = false) =>
          x.columns
            .filter(c => c.role !== 'label' && (!deg || c.unit === 'deg'))
            // The unit once: a header like "d (Mpc)" already names it.
            .map(c => [
              c.id,
              !c.unit || c.name.includes(`(${c.unit})`)
                ? c.name
                : `${c.name} (${c.unit})`,
            ]);
        const bySel = select(
          'msBy',
          t('obs.ms.p.by'),
          [
            ['value', t('obs.ms.p.by.value')],
            ['sky', t('obs.ms.p.by.sky')],
          ],
          p?.how?.by ?? 'value'
        );
        const cols = el('div', { class: 'ow-grid' });
        const fillCols = by => {
          const B = model.second.o;
          cols.replaceChildren(
            ...(by === 'sky'
              ? [
                  select(
                    'msARa',
                    t('obs.ms.p.aRa'),
                    numeric(o, true),
                    p?.how?.a?.[0]
                  ),
                  select(
                    'msADec',
                    t('obs.ms.p.aDec'),
                    numeric(o, true),
                    p?.how?.a?.[1]
                  ),
                  select(
                    'msBRa',
                    t('obs.ms.p.bRa'),
                    numeric(B, true),
                    p?.how?.b?.[0]
                  ),
                  select(
                    'msBDec',
                    t('obs.ms.p.bDec'),
                    numeric(B, true),
                    p?.how?.b?.[1]
                  ),
                  field(
                    'msTol',
                    t('obs.ms.p.radius'),
                    p?.how?.radiusArcsec ?? 1
                  ),
                ]
              : [
                  select('msA', t('obs.ms.p.aColumn'), numeric(o), p?.how?.a),
                  select('msB', t('obs.ms.p.bColumn'), numeric(B), p?.how?.b),
                  field(
                    'msTol',
                    t('obs.ms.p.tolerance'),
                    p?.how?.tolerance ?? 0
                  ),
                ])
          );
        };
        bySel
          .querySelector('select')
          .addEventListener('change', e => fillCols(e.target.value));
        how.append(bySel, cols);
        fillCols(p?.how?.by ?? 'value');
      };
      file.addEventListener('change', async () => {
        const f = file.files?.[0];
        if (!f) return;
        const text = await f.text();
        const imp = await ctx.importer();
        const r = imp.read(text, { name: f.name, bytes: f.size });
        const fail = why => {
          model.second = null;
          note.textContent = t('obs.ms.p.secondFailed', { why });
          fill();
        };
        if (!r.ok) return fail(r.problems.map(x => x.message).join('; '));
        const table = r.table ?? null;
        let second = r.observation ?? null;
        if (!second && table) {
          // Every number column a value, in the unit its header states;
          // every other column a label.
          const built = imp.build(table, {
            kind: 'table',
            title: f.name,
            columns: table.columns.map(c =>
              c.numeric
                ? {
                    use: 'value',
                    unit: c.suggestion ? c.suggestion.text : null,
                  }
                : { use: 'label' }
            ),
          });
          if (!built.ok)
            return fail(built.problems.map(x => x.message).join('; '));
          second = built.observation;
        }
        model.second = { name: f.name, o: second };
        note.textContent = t('obs.ms.p.secondRead', {
          rows: second.columns[0].values.length,
          columns: second.columns.length,
        });
        fill();
      });
      box.append(
        el(
          'label',
          { class: 'ow-field' },
          el('span', { text: t('obs.ms.p.second') }),
          file
        ),
        note,
        how
      );
      if (p && model.second) fill();
    }
  }

  /** The parameters the form says, or the name of the field that is wrong. */
  function readParams(toolId, box) {
    const { t } = ctx;
    const val = id => box.querySelector(`#${id}`)?.value.trim() ?? '';
    const num = (id, label) => {
      const v = Number(val(id));
      if (val(id) === '' || !Number.isFinite(v))
        throw new Error(t('obs.ms.p.bad', { field: label }));
      return v;
    };
    const label = id =>
      box.querySelector(`#${id}`)?.closest('label')?.querySelector('span')
        ?.textContent ?? id;
    if (toolId === 'period')
      return {
        minPeriod: num('msMin', label('msMin')),
        maxPeriod: num('msMax', label('msMax')),
        oversample: num('msOver', label('msOver')),
      };
    if (toolId === 'box') {
      const durations = val('msDur')
        .split(/[,;\s]+/)
        .filter(Boolean)
        .map(Number);
      if (!durations.length || !durations.every(Number.isFinite))
        throw new Error(t('obs.ms.p.bad', { field: label('msDur') }));
      return {
        minPeriod: num('msMin', label('msMin')),
        maxPeriod: num('msMax', label('msMax')),
        durations,
      };
    }
    if (toolId === 'line') {
      const pair = (a, b) => [num(a, label(a)), num(b, label(b))];
      const rest = val('msRest') === '' ? null : num('msRest', label('msRest'));
      return {
        blue: pair('msBlueLo', 'msBlueHi'),
        line: pair('msLineLo', 'msLineHi'),
        red: pair('msRedLo', 'msRedHi'),
        rest,
        restMedium: rest ? box.dataset.medium : null,
      };
    }
    if (toolId === 'aperture') {
      const mode = val('msMode');
      if (mode === 'bits') {
        const circle = box.querySelector('#msCircle')?.checked;
        return {
          mode,
          bit: Number(val('msBit')),
          ...(circle
            ? {
                x: num('msX', label('msX')),
                y: num('msY', label('msY')),
                r: num('msR', label('msR')),
              }
            : {}),
        };
      }
      return {
        mode,
        x: num('msX', label('msX')),
        y: num('msY', label('msY')),
        r: num('msR', label('msR')),
        rIn: num('msRIn', label('msRIn')),
        rOut: num('msROut', label('msROut')),
        gain: val('msGain') === '' ? null : num('msGain', label('msGain')),
      };
    }
    if (toolId === 'filter') {
      const o = ctx.state.view;
      const conditions = [];
      for (let i = 0; i < 3; i++) {
        const column = val(`msCol${i}`);
        if (!column) continue;
        const c = o.columns.find(k => k.id === column);
        const op = val(`msOp${i}`);
        const numeric = c.role !== 'label' && op !== 'contains';
        conditions.push({
          column,
          op,
          value: numeric
            ? num(`msVal${i}`, label(`msVal${i}`))
            : val(`msVal${i}`),
          unit: c.role === 'label' ? null : (c.unit ?? null),
        });
      }
      return { conditions, join: val('msJoin') || 'all' };
    }
    if (toolId === 'match') {
      if (!model.second) throw new Error(t('obs.ms.p.second'));
      const by = val('msBy');
      return by === 'sky'
        ? {
            how: {
              by,
              a: [val('msARa'), val('msADec')],
              b: [val('msBRa'), val('msBDec')],
              radiusArcsec: num('msTol', label('msTol')),
            },
          }
        : {
            how: {
              by: 'value',
              a: val('msA'),
              b: val('msB'),
              tolerance: num('msTol', label('msTol')),
            },
          };
    }
    return {};
  }

  // --- Running -----------------------------------------------------------------------

  const hooks = extra => ({
    skyOf: ctx.skyOf,
    pixelScale: ctx.pixelScale,
    ...extra,
  });

  async function run() {
    const { t } = ctx;
    const o = ctx.state.view;
    const toolId = ui.tool.value;
    if (!toolId || !o) return;
    let params;
    try {
      params = readParams(toolId, ui.params);
    } catch (err) {
      ui.problem.textContent = err.message;
      return;
    }
    ui.problem.textContent = '';
    const editing = model.editing
      ? nodes().find(n => n.id === model.editing)
      : null;
    const at =
      editing && editing.at <= changes().length ? editing.at : changes().length;
    const view = at === changes().length ? o : viewAt(at);
    const id = editing?.id ?? nextId(nodes());
    const controller = new AbortController();
    model.running = controller;
    busy(true, t('obs.ms.running', { tool: words().toolName(toolId) }));
    try {
      const second = toolId === 'match' ? model.second : null;
      const node = await runNode(
        view,
        {
          id,
          tool: toolId,
          params,
          at,
          ...(second ? { second: { name: second.name } } : {}),
        },
        hooks({
          signal: controller.signal,
          onProgress: f => {
            ui.progress.value = Math.round(f * 100);
          },
          second: second?.o,
        })
      );
      if (second)
        node.input.secondTable = JSON.parse(
          ctx.observationJson(second.o, { source: second.o, changes: [] })
        );
      const next = editing
        ? nodes().map(n => (n.id === id ? node : n))
        : [...nodes(), node];
      commit(next);
      model.editing = null;
      model.readBack.delete(id);
      model.status.set(id, 'current');
      ctx.status(
        node.status === 'failed'
          ? t('obs.ms.failed', {
              id,
              tool: words().toolName(toolId),
              why: node.error.message,
            })
          : t('obs.ms.ran', { id, tool: words().toolName(toolId) })
      );
    } catch (err) {
      ctx.status(
        err?.code === 'canceled'
          ? t('obs.ms.canceled')
          : String(err?.message ?? err)
      );
    } finally {
      model.running = null;
      busy(false);
      render();
    }
  }

  function busy(on, text = '') {
    ui.run.disabled = on;
    ui.cancel.hidden = !on;
    ui.progress.hidden = !on;
    ui.progress.value = 0;
    ui.busy.textContent = text;
  }

  async function recompute(node) {
    const at = Math.min(node.at, changes().length);
    const again = await runNode(
      viewAt(at),
      { ...node, at },
      hooks({ second: node.input.secondTable ?? undefined })
    );
    commit(
      nodes().map(n =>
        n.id === node.id
          ? {
              ...again,
              input: {
                ...again.input,
                ...(node.input.secondTable
                  ? { secondTable: node.input.secondTable }
                  : {}),
              },
            }
          : n
      )
    );
    model.status.set(node.id, 'current');
    model.readBack.delete(node.id);
    render();
  }

  // --- Drawing --------------------------------------------------------------------------

  function build() {
    const { t } = ctx;
    const body = el('div', { id: 'msBody' });
    const intro = el('p', { class: 'ow-hint', text: t('obs.ms.intro') });
    const tool = el('select', { id: 'msTool' });
    const params = el('div', { id: 'msParams' });
    const problem = el('p', {
      id: 'msProblem',
      class: 'ow-problems',
      role: 'alert',
    });
    const runBtn = el('button', {
      id: 'msRun',
      class: 'ui-button',
      type: 'button',
      text: t('obs.ms.run'),
    });
    const cancel = el('button', {
      id: 'msCancel',
      class: 'ui-button',
      type: 'button',
      text: t('obs.ms.cancel'),
      hidden: true,
    });
    const progress = el('progress', {
      id: 'msProgress',
      max: 100,
      value: 0,
      hidden: true,
      'aria-label': t('obs.ms.progress'),
    });
    const busyText = el('p', {
      id: 'msBusy',
      class: 'ow-hint',
      role: 'status',
    });
    const none = el('p', {
      id: 'msNone',
      class: 'ow-hint',
      hidden: true,
      text: t('obs.ms.none'),
    });
    const undo = el('button', {
      id: 'msUndo',
      class: 'ui-button ow-small',
      type: 'button',
      text: t('obs.ms.undo'),
    });
    const redo = el('button', {
      id: 'msRedo',
      class: 'ui-button ow-small',
      type: 'button',
      text: t('obs.ms.redo'),
    });
    const save = el('button', {
      id: 'msSave',
      class: 'ui-button ow-small',
      type: 'button',
      text: t('obs.ms.save'),
    });
    const csv = el('button', {
      id: 'msCsv',
      class: 'ui-button ow-small',
      type: 'button',
      text: t('obs.ms.csv'),
    });
    const openFile = el('input', {
      id: 'msOpen',
      type: 'file',
      accept: '.json,application/json',
    });
    const list = el('ol', { id: 'msNodes', class: 'ow-list' });
    const pipeline = el('ol', { id: 'msPipeline', class: 'ow-list' });
    const methodsList = el('ol', { id: 'msMethods', class: 'ow-hint' });
    body.append(
      intro,
      el(
        'div',
        { class: 'ow-grid' },
        el(
          'label',
          { class: 'ow-field' },
          el('span', { text: t('obs.ms.tool') }),
          tool
        )
      ),
      none,
      params,
      problem,
      el('div', { class: 'ow-actions' }, runBtn, cancel, progress),
      busyText,
      el('h3', { id: 'msNodesTitle', text: t('obs.ms.nodes') }),
      list,
      el('div', { class: 'ow-actions' }, undo, redo, save, csv),
      el(
        'label',
        { class: 'ow-field' },
        el('span', { text: t('obs.ms.open') }),
        openFile
      ),
      el('h3', { id: 'msPipelineTitle', text: t('obs.ms.pipeline') }),
      pipeline,
      el(
        'details',
        {},
        el('summary', { text: t('obs.ms.methods') }),
        methodsList
      )
    );
    root.querySelector(':scope > #msBody')?.remove();
    root.append(body);
    tool.addEventListener('change', () =>
      renderParams(params, tool.value, ctx.state.view)
    );
    runBtn.addEventListener('click', run);
    cancel.addEventListener('click', () => model.running?.abort());
    undo.addEventListener('click', () => {
      if (model.at > 0) model.at--;
      render();
    });
    redo.addEventListener('click', () => {
      if (model.at < model.stack.length - 1) model.at++;
      render();
    });
    save.addEventListener('click', savePipeline);
    csv.addEventListener('click', saveCsv);
    openFile.addEventListener('change', () => {
      const f = openFile.files?.[0];
      if (f) f.text().then(openPipeline);
      openFile.value = '';
    });
    return {
      body,
      tool,
      params,
      problem,
      run: runBtn,
      cancel,
      progress,
      busy: busyText,
      none,
      undo,
      redo,
      save,
      csv,
      list,
      pipeline,
      methods: methodsList,
      kind: null,
    };
  }

  function fillTools() {
    const o = ctx.state.view;
    const ids = o ? toolsFor(o) : [];
    const kind = o?.kind ?? null;
    if (
      ui.kind === kind &&
      ui.tool.options.length === ids.length &&
      !model.editing
    )
      return;
    ui.kind = kind;
    const w = words();
    ui.tool.replaceChildren(
      ...ids.map(id => el('option', { value: id, text: w.toolName(id) }))
    );
    ui.none.hidden = ids.length > 0;
    ui.tool.disabled = !ids.length;
    ui.run.disabled = !ids.length;
    if (ids.length) renderParams(ui.params, ui.tool.value, o);
    else ui.params.replaceChildren();
  }

  function download(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = el('a', { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const fileBase = () =>
    String(ctx.state.source?.id ?? 'observation').replace(
      /[^A-Za-z0-9._-]+/g,
      '-'
    );

  async function savePipeline() {
    const src = ctx.state.source;
    if (!src) return;
    const text = pipelineJson({
      source: src,
      digest: await contentDigest(src),
      workspace: ctx.observationJson(ctx.state.view, {
        source: src,
        changes: changes(),
      }),
      nodes: nodes(),
      fits: fitsHere(),
      methods: methods(),
    });
    download(`${fileBase()}-pipeline.json`, text, 'application/json');
  }

  function saveCsv() {
    const esc = v => {
      const s = v === null || v === undefined ? '' : String(v);
      // A cell a spreadsheet would run as a formula starts with a quote.
      const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d/.test(s) ? `'${s}` : s;
      return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
    };
    const rows = [
      [
        'node',
        'tool',
        'version',
        'at',
        'status',
        'quantity',
        'value',
        'error',
        'error_kind',
        'unit',
        'kind',
      ],
    ];
    for (const n of nodes())
      for (const q of n.quantities || [])
        rows.push([
          n.id,
          n.tool,
          n.version,
          n.at,
          model.status.get(n.id) ?? n.status,
          q.id,
          q.value,
          q.error ?? '',
          q.errorKind ?? '',
          q.unit ?? '',
          q.kind,
        ]);
    download(
      `${fileBase()}-results.csv`,
      `${rows.map(r => r.map(esc).join(',')).join('\r\n')}\r\n`,
      'text/csv'
    );
  }

  async function openPipeline(text) {
    const { t } = ctx;
    const r = readPipeline(text);
    if (!r.ok) {
      const key = {
        notJson: 'obs.ms.open.notJson',
        notPipeline: 'obs.ms.open.notPipeline',
        newer: 'obs.ms.open.newer',
        unknownVersion: 'obs.ms.open.unknownVersion',
        incomplete: 'obs.ms.open.incomplete',
        unknownTool: 'obs.ms.open.unknownTool',
        badNode: 'obs.ms.open.badNode',
      }[r.code];
      ui.problem.textContent = key ? t(key, r.detail || {}) : r.code;
      return;
    }
    const imp = await ctx.importer();
    const ws = imp.read(r.workspaceText);
    if (!ws.ok) {
      ui.problem.textContent = t('obs.ms.open.workspace', {
        why: ws.problems.map(p => p.message).join('; '),
      });
      return;
    }
    ui.problem.textContent = '';
    model.adopting = true;
    model.readBack.clear();
    ctx.open(ws.observation, ws.changes);
    const again = [];
    let differ = 0;
    for (const saved of r.nodes) {
      const at = Math.min(saved.at, ws.changes.length);
      const view = ctx.replay(ws.observation, ws.changes.slice(0, at)).o;
      const now = await runNode(
        view,
        { ...saved, at },
        hooks({ second: saved.input?.secondTable ?? undefined })
      );
      if (saved.input?.secondTable)
        now.input.secondTable = saved.input.secondTable;
      const same = sameResult(saved, now);
      if (!same) differ++;
      model.readBack.set(saved.id, {
        same,
        savedVersion: saved.version !== now.version ? saved.version : null,
      });
      again.push(now);
    }
    model.stack = [again];
    model.at = 0;
    if (r.fits.length) ctx.state.fits = [...(ctx.state.fits || []), ...r.fits];
    const said = r.migrated
      ? t('obs.ms.readBack.migrated')
      : differ
        ? t('obs.ms.readBack.differs', { n: differ })
        : t('obs.ms.readBack.same');
    ui.busy.textContent = said;
    ctx.status(said);
    await update();
  }

  function addToNotebook(n) {
    const { t } = ctx;
    const w = words();
    const src = ctx.state.source;
    const c = changes().slice(0, n.at);
    const rows = [
      [t('obs.ms.nb.observation'), `${src.title} (${src.id})`],
      [
        t('obs.ms.nb.source'),
        [src.source?.kind, src.source?.id, src.source?.version]
          .filter(Boolean)
          .join(' '),
      ],
      [t('obs.ms.nb.digest'), n.input.digest],
      [
        t('obs.ms.nb.license'),
        [src.license?.status, src.credit].filter(Boolean).join('; '),
      ],
      [t('obs.ms.nb.tool'), `${w.toolName(n.tool)}, ${n.version}`],
      [t('obs.ms.nb.params'), w.params(n.params)],
      [
        t('obs.ms.nb.changes'),
        c.length
          ? c.map(x => `${t(`obs.op.${x.op}`)} (${w.params(x)})`).join('; ')
          : t('obs.ms.nb.noChanges'),
      ],
    ];
    const assumed = (n.quantities || []).filter(q => q.kind === 'assumed');
    if (assumed.length)
      rows.push([
        t('obs.ms.nb.assumed'),
        assumed
          .map(
            q =>
              `${w.quantityName(q)} ${w.value(q)}${q.cite ? ` (${q.cite})` : ''}`
          )
          .join('; '),
      ]);
    if (n.warnings?.length)
      rows.push([t('obs.ms.nb.warnings'), n.warnings.map(w.warning).join(' ')]);
    // A periodogram goes in as the entry's figure: at most 400 points, each
    // the highest power in its stretch of trial periods, so no peak is lost.
    let fig = null;
    if (n.grid) {
      const P = Array.from(n.grid.periods);
      const W = Array.from(n.grid.power);
      const order = P.map((_, i) => i).sort((a, b) => P[a] - P[b]);
      const per = Math.ceil(order.length / 400);
      const points = [];
      for (let k = 0; k < order.length; k += per) {
        let top = order[k];
        for (const i of order.slice(k, k + per)) if (W[i] > W[top]) top = i;
        points.push([P[top], W[top]]);
      }
      const unit = n.quantities[0]?.unit ?? '';
      fig = figure({
        title: t('obs.ms.periodogram'),
        xLabel: `${t('obs.ms.q.period')}${unit ? ` (${unit})` : ''}`,
        yLabel: t('obs.ms.q.power'),
        series: [
          figureSeries({ label: w.toolName(n.tool), points, style: 'line' }),
        ],
      });
    }
    const entry = observedEntry({
      figure: fig,
      node: n,
      source: src,
      digest: n.input.digest,
      changes: changes(),
      title: t('obs.ms.nb.title', {
        tool: w.toolName(n.tool),
        observation: src.title,
      }),
      labels: {
        quantity: q => w.quantityName(q),
        note: q =>
          [
            w.kind(q.kind),
            q.errorKind
              ? t('obs.ms.errorKind', { kind: w.kind(q.errorKind) })
              : '',
          ]
            .filter(Boolean)
            .join('; '),
        rows,
      },
    });
    const loaded = loadNotebook();
    if (!loaded.ok) {
      ctx.status(t('obs.ms.notebook.failed', { why: loaded.reason }));
      return;
    }
    const saved = saveNotebook([...loaded.entries, entry]);
    ctx.status(
      saved.ok
        ? t('obs.ms.notebook.added')
        : t('obs.ms.notebook.failed', { why: saved.reason })
    );
  }

  function periodogram(n, box) {
    const { t } = ctx;
    const w = words();
    if (!n.grid) return;
    const periods = Array.from(n.grid.periods);
    const power = Array.from(n.grid.power);
    const order = periods
      .map((_, i) => i)
      .sort((a, b) => periods[a] - periods[b]);
    const unit = n.quantities[0]?.unit ?? '';
    const o = {
      kind: 'table',
      columns: [
        {
          id: 'period',
          name: t('obs.ms.q.period'),
          unit,
          role: 'x',
          values: order.map(i => periods[i]),
        },
        {
          id: 'power',
          name: t('obs.ms.q.power'),
          unit: '',
          role: 'value',
          values: order.map(i => power[i]),
        },
      ],
      axes: { x: 'period', y: 'power' },
      masks: [],
    };
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'ow-plot');
    svg.setAttribute('role', 'img');
    svg.setAttribute(
      'aria-label',
      t('obs.ms.periodogramLabel', {
        n: periods.length,
        period: w.value(n.quantities[0]),
      })
    );
    ctx
      .createPlot(svg, {
        announce: () => {},
        describe: () => '',
        number: ctx.number,
        labels: { notStated: '' },
      })
      .draw(o, {
        xColumn: 'period',
        yColumn: 'power',
        selection: ctx.createSelection(periods.length),
      });
    const gridCsv = el('button', {
      class: 'ui-button ow-small',
      type: 'button',
      text: t('obs.ms.gridCsv'),
    });
    gridCsv.addEventListener('click', () =>
      download(
        `${fileBase()}-${n.id}-periodogram.csv`,
        `period (${unit}),power\r\n${order.map(i => `${periods[i]},${power[i]}`).join('\r\n')}\r\n`,
        'text/csv'
      )
    );
    box.replaceChildren(svg, gridCsv);
  }

  function nodeItem(n) {
    const { t } = ctx;
    const w = words();
    const status =
      n.status === 'failed' ? 'failed' : (model.status.get(n.id) ?? n.status);
    const head = el('h4', {
      text: t('obs.ms.node', {
        id: n.id,
        tool: w.toolName(n.tool),
        version: n.version,
      }),
    });
    const state = el('p', {
      class: 'ow-hint',
      'data-status': status,
      text: w.status(status),
    });
    const back = model.readBack.get(n.id);
    const backNote = back
      ? el('p', {
          class: 'ow-hint',
          'data-readback': back.same ? 'same' : 'differs',
          text: [
            back.same ? t('obs.ms.nodeSame') : t('obs.ms.nodeDiffers'),
            back.savedVersion
              ? t('obs.ms.nodeVersion', { version: back.savedVersion })
              : '',
          ]
            .filter(Boolean)
            .join('; '),
        })
      : null;
    const table = n.quantities?.length
      ? el(
          'div',
          {
            class: 'ow-table-wrap',
            tabindex: '0',
            role: 'region',
            'aria-label': head.textContent,
          },
          el(
            'table',
            { class: 'ms-results' },
            el('caption', { text: head.textContent }),
            el(
              'thead',
              {},
              el(
                'tr',
                {},
                el('th', { scope: 'col', text: t('obs.ms.col.quantity') }),
                el('th', { scope: 'col', text: t('obs.ms.col.value') }),
                el('th', { scope: 'col', text: t('obs.ms.col.kind') })
              )
            ),
            el(
              'tbody',
              {},
              ...n.quantities.map(q =>
                el(
                  'tr',
                  { 'data-quantity': q.id },
                  el('th', { scope: 'row', text: w.quantityName(q) }),
                  el('td', { text: w.value(q) }),
                  el('td', {
                    text: [
                      w.kind(q.kind),
                      q.errorKind
                        ? t('obs.ms.errorKind', { kind: w.kind(q.errorKind) })
                        : '',
                    ]
                      .filter(Boolean)
                      .join('; '),
                  })
                )
              )
            )
          )
        )
      : null;
    const problem =
      n.status === 'failed'
        ? el('p', { class: 'ow-problems', text: n.error?.message ?? '' })
        : null;
    const warnings = n.warnings?.length
      ? el(
          'ul',
          { class: 'ow-hint' },
          ...n.warnings.map(x => el('li', { text: w.warning(x) }))
        )
      : null;
    const actions = el('div', { class: 'ow-actions' });
    const plotBox = el('div', {});
    const button = (text, fn, attrs = {}) => {
      const b = el('button', {
        class: 'ui-button ow-small',
        type: 'button',
        text,
        ...attrs,
      });
      b.addEventListener('click', fn);
      actions.append(b);
    };
    if (status === 'stale' || n.status === 'failed')
      button(t('obs.ms.recompute'), () => recompute(n), {
        'data-action': 'recompute',
      });
    button(
      t('obs.ms.edit'),
      () => {
        model.editing = n.id;
        ui.tool.value = n.tool;
        renderParams(ui.params, n.tool, ctx.state.view, n);
        ui.run.textContent = t('obs.ms.recomputeWith', { id: n.id });
        ui.tool.focus();
      },
      { 'data-action': 'edit' }
    );
    button(
      t('obs.ms.remove'),
      () => {
        commit(nodes().filter(x => x.id !== n.id));
        render();
      },
      { 'data-action': 'remove' }
    );
    const current = status === 'current' && n.status !== 'failed';
    if (current && n.suggest?.fold && ctx.state.view?.kind === 'time-series')
      button(
        t('obs.ms.fold'),
        () =>
          ctx.apply({
            op: 'fold',
            period: n.suggest.fold.period,
            epoch: n.suggest.fold.epoch,
            from: n.id,
          }),
        { 'data-action': 'fold' }
      );
    if (current && n.tool === 'filter' && n.at === changes().length) {
      const keep = new Set(n.result?.keep ?? []);
      const rows = [];
      for (let i = 0; i < (n.result?.rows ?? 0); i++)
        if (!keep.has(i)) rows.push(i);
      if (rows.length)
        button(
          t('obs.ms.maskFailed'),
          () =>
            ctx.apply({
              op: 'mask',
              id: `${n.id}-failed`,
              label: t('obs.ms.maskFailed'),
              rows,
              from: n.id,
            }),
          { 'data-action': 'mask' }
        );
    }
    if (n.status !== 'failed')
      button(t('obs.ms.notebook'), () => addToNotebook(n), {
        'data-action': 'notebook',
      });
    if (n.grid)
      button(t('obs.ms.periodogram'), () => periodogram(n, plotBox), {
        'data-action': 'periodogram',
      });
    return el(
      'li',
      { 'data-node': n.id },
      head,
      state,
      backNote,
      problem,
      table,
      warnings,
      actions,
      plotBox
    );
  }

  function renderPipeline() {
    const { t } = ctx;
    const w = words();
    const src = ctx.state.source;
    const items = [];
    if (src)
      items.push(
        el('li', {
          'data-stage': 'source',
          text: t('obs.ms.pipe.source', {
            title: src.title,
            id: src.id,
            digest: model.source?.digest?.slice(0, 16) ?? '…',
          }),
        })
      );
    const at = k =>
      nodes()
        .filter(n => n.at === k)
        .map(n =>
          el('li', {
            'data-stage': 'measurement',
            text: t('obs.ms.pipe.measure', {
              id: n.id,
              tool: w.toolName(n.tool),
              status: w.status(model.status.get(n.id) ?? n.status),
            }),
          })
        );
    items.push(...at(0));
    changes().forEach((c, i) => {
      const cls = CHANGE_CLASS[c.op] ?? {};
      items.push(
        el('li', {
          'data-stage': cls.stage ?? 'change',
          text: t('obs.ms.pipe.change', {
            op: t(`obs.op.${c.op}`),
            stage: w.stage(cls.stage),
            treatment: w.treatment(cls.uncertainty),
          }),
        })
      );
      items.push(...at(i + 1));
    });
    // A measurement taken where the changes no longer reach: stale, after them.
    items.push(
      ...nodes()
        .filter(n => n.at > changes().length)
        .map(n =>
          el('li', {
            'data-stage': 'measurement',
            text: t('obs.ms.pipe.measure', {
              id: n.id,
              tool: w.toolName(n.tool),
              status: w.status('stale'),
            }),
          })
        )
    );
    for (const f of fitsHere())
      items.push(
        el('li', {
          'data-stage': 'fit',
          text: t('obs.ms.pipe.fit', {
            model: f.model?.id,
            algorithm: f.algorithm?.id,
            version: f.algorithm?.version,
          }),
        })
      );
    ui.pipeline.replaceChildren(...items);
  }

  function render() {
    const { t } = ctx;
    fillTools();
    if (!model.editing) ui.run.textContent = t('obs.ms.run');
    ui.list.replaceChildren(
      ...(nodes().length
        ? nodes().map(nodeItem)
        : [el('li', { class: 'ow-hint', text: t('obs.ms.nodesNone') })])
    );
    ui.undo.disabled = model.at === 0;
    ui.redo.disabled = model.at >= model.stack.length - 1;
    ui.save.disabled = !ctx.state.source;
    ui.csv.disabled = !nodes().length;
    renderPipeline();
    ui.methods.replaceChildren(...methods().map(m => el('li', { text: m })));
  }

  /** The page changed: a new observation, or a change made or undone. */
  async function update() {
    const src = ctx.state.source;
    if (!src) return;
    if (model.source?.o !== src) {
      model.source = { o: src, digest: null };
      model.digests.clear();
      if (model.adopting) model.adopting = false;
      else {
        // Another observation: the measurements were of the last one.
        model.stack = [[]];
        model.at = 0;
        model.readBack.clear();
        model.editing = null;
      }
      model.source.digest = await contentDigest(src);
    }
    for (const n of nodes()) {
      const d = await digestAt(n.at);
      model.status.set(
        n.id,
        d !== null && d === n.input.digest ? 'current' : 'stale'
      );
    }
    render();
  }

  update();
  return {
    update,
    rebuild() {
      ui.body.remove();
      ui = build();
      ui.kind = null;
      render();
    },
    destroy() {
      model.running?.abort();
      ui.body.remove();
    },
  };
}
