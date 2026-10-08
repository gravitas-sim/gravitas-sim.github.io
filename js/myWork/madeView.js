// =============================================================================
// My work's lists of what was made, and the installed packages
// -----------------------------------------------------------------------------
// Roadmap II Prompt 74 (MY_WORK.md). The page (js/myWorkPage.js) loads this
// after it has drawn, so its own route stays small: it draws the section of
// scenarios and experiments (js/myWork/made.js), each with its facts, a link
// that opens it, the evidence entries it can be attached to, a copy of its
// link and its file. Export and delete are the page's own buttons, which act
// on the record's key like any other item.
//
// `page` is what the page hands over: its drawing of one item, its two-language
// helper and its records. Strings are English and Spanish pairs, as the page's.
// =============================================================================

import { MADE_PREFIX, fileOf, hrefOf, readMade } from './made.js';

const NOTEBOOK = 'gravitas_evidence_notebook';

/** The records the snapshot holds, readable, newest first. */
export const madeIn = records =>
  records
    .filter(r => r.id.startsWith(MADE_PREFIX))
    .map(r => readMade(r.value))
    .filter(r => r.ok)
    .map(r => r.record)
    .sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));

/** Installed packages and the things made, drawn into their sections. */
export async function show(page) {
  await Promise.all([packages(page), made(page)]);
}

async function packages({ item, L, pick, size, state }) {
  const box = document.getElementById('mwPackages');
  box.hidden = false;
  try {
    state.packages ??= await (
      await import('../catalog/store.js')
    )
      .openStore()
      .then(st => st.list());
  } catch {
    state.packages = [];
  }
  const list = state.packages;
  box.querySelector('.mw-none').hidden = list.length > 0;
  box.querySelector('.mw-body').innerHTML = list.length
    ? `<ul class="mw-list">${list
        .map(p =>
          item({
            title: pick(p.title) || p.id,
            facts: [p.type, p.version, size(p.bytes || 0)],
            href: '/catalog/',
            open: L('Open the Catalog', 'Abrir el Catálogo'),
            ids: [],
            buttons: false,
          })
        )
        .join('')}</ul>`
    : '';
}

function facts(r, { L, day }) {
  const when = r.savedAt
    ? L(`saved ${day(r.savedAt)}`, `guardado el ${day(r.savedAt)}`)
    : '';
  if (r.kind === 'experiment') {
    const e = r.experiment;
    const res = e.result;
    const n = res.summary?.trials ?? res.trials?.length ?? 0;
    return [
      L('Experiment', 'Experimento'),
      L(`${n} trials`, `${n} ensayos`),
      e.engine?.fingerprint
        ? L(`engine ${e.engine.fingerprint}`, `motor ${e.engine.fingerprint}`)
        : L('engine not recorded', 'motor sin registrar'),
      res.trialsKept === false
        ? L('trials not kept here', 'ensayos no guardados aquí')
        : '',
      when,
    ];
  }
  const s = r.scenario;
  const from = {
    builder: L(
      'Built in the system builder',
      'Construido en el constructor de sistemas'
    ),
    sandbox: L('Saved from the Sandbox', 'Guardado desde la simulación libre'),
  }[r.from];
  return [
    from || L('Scenario', 'Escenario'),
    L(`seed ${s.seed || 'none'}`, `semilla ${s.seed || 'ninguna'}`),
    s.bodies === null ? '' : L(`${s.bodies} objects`, `${s.bodies} objetos`),
    s.derivedFrom
      ? L(
          `made from scenario ${s.derivedFrom.id} version ${s.derivedFrom.version}`,
          `hecho a partir del escenario ${s.derivedFrom.id} versión ${s.derivedFrom.version}`
        )
      : '',
    r.app ? L(`build ${r.app}`, `versión ${r.app}`) : '',
    when,
  ];
}

/** The evidence entries, as the notebook holds them, in order. */
const entriesOf = records => {
  const v = records.find(r => r.id === NOTEBOOK)?.value;
  return Array.isArray(v?.entries) ? v.entries : [];
};

function attachControl(r, entries, { L, esc }) {
  if (!entries.length)
    return `<p class="ui-hint">${esc(
      L(
        'Add something to your evidence notebook to attach this to it.',
        'Añade algo a tu cuaderno de evidencia para adjuntarlo.'
      )
    )}</p>`;
  return `<details class="ui-disclosure"><summary>${esc(
    L(
      `Attach to evidence (${r.attachedTo.length} attached)`,
      `Adjuntar a la evidencia (${r.attachedTo.length} adjuntas)`
    )
  )}</summary><ul class="mw-units">${entries
    .map(
      (e, i) =>
        `<li><label class="ui-choice"><input type="checkbox" data-made="attach" data-key="${esc(`${MADE_PREFIX}${r.id}`)}" data-entry="${esc(e.id)}"${r.attachedTo.includes(e.id) ? ' checked' : ''} /><span>${esc(`${i + 1}. ${e.title || e.source || e.id}`)}</span></label></li>`
    )
    .join('')}</ul><p class="ui-hint">${esc(
    L(
      'An attached item is listed in the report you download and its link goes with your submission.',
      'Lo adjunto aparece en el informe que descargas y su enlace va con tu entrega.'
    )
  )}</p></details>`;
}

let wired = false;

async function made(page) {
  const { item, L, esc, state } = page;
  const box = document.getElementById('mwMade');
  box.hidden = false;
  const list = madeIn(state.records);
  const entries = entriesOf(state.records);
  box.querySelector('.mw-none').hidden = list.length > 0;
  box.querySelector('.mw-body').innerHTML = list.length
    ? `<ul class="mw-list">${list
        .map(r =>
          item({
            title: r.name,
            facts: facts(r, page),
            href: hrefOf(r),
            open:
              r.kind === 'scenario'
                ? L('Open in the Sandbox', 'Abrir en la simulación libre')
                : L('Open the runner', 'Abrir el ejecutor'),
            ids: [`${MADE_PREFIX}${r.id}`],
            extra: `<div class="mw-actions">${
              r.kind === 'scenario'
                ? `<button type="button" class="ui-button is-small" data-made="copy" data-key="${esc(`${MADE_PREFIX}${r.id}`)}" aria-label="${esc(`${L('Copy link', 'Copiar enlace')}: ${r.name}`)}">${esc(L('Copy link', 'Copiar enlace'))}</button>`
                : ''
            }${
              fileOf(r)
                ? `<button type="button" class="ui-button is-small" data-made="file" data-key="${esc(`${MADE_PREFIX}${r.id}`)}" aria-label="${esc(`${L('Download file', 'Descargar archivo')}: ${r.name}`)}">${esc(L('Download file', 'Descargar archivo'))}</button>`
                : ''
            }</div>${attachControl(r, entries, page)}`,
          })
        )
        .join('')}</ul>`
    : '';
  if (wired) return;
  wired = true;
  box.addEventListener('change', async e => {
    const c = e.target.closest('[data-made="attach"]');
    if (!c) return;
    const rec = madeIn(state.records).find(
      r => `${MADE_PREFIX}${r.id}` === c.dataset.key
    );
    if (!rec) return;
    const next = {
      ...rec,
      attachedTo: c.checked
        ? [...new Set([...rec.attachedTo, c.dataset.entry])]
        : rec.attachedTo.filter(x => x !== c.dataset.entry),
    };
    const kept = await state.store.collection('made').put(c.dataset.key, next);
    if (!kept?.ok) c.checked = !c.checked;
    await page.refresh();
  });
  box.addEventListener('click', async e => {
    const b = e.target.closest('[data-made]');
    if (!b || b.dataset.made === 'attach') return;
    const rec = madeIn(state.records).find(
      r => `${MADE_PREFIX}${r.id}` === b.dataset.key
    );
    if (!rec) return;
    if (b.dataset.made === 'copy') {
      const url = new URL(hrefOf(rec), location.origin).href;
      try {
        await navigator.clipboard.writeText(url);
        page.say(L('Link copied.', 'Enlace copiado.'));
      } catch {
        page.say(url);
      }
    } else {
      const f = fileOf(rec);
      page.download(f.json, f.name);
    }
  });
}
