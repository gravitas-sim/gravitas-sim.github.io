// =============================================================================
// The figure builder: a Gravitas state, made into a figure for someone's page
// -----------------------------------------------------------------------------
// /figure/. An author brings a state - a link from Share, or a scenario and a
// seed - chooses how the figure opens and looks and what is written around
// it, sees it in a live preview and copies the markup. Nothing is sent
// anywhere: the figure is its URL, and the markup is text on the page.
//
// What it will write is bounded on purpose:
//
//   the frame's address  always this site, `?embed=1&ev=1` and the options of
//                        gravitas-embed/1 (js/embedOptions.js), and a share
//                        fragment Gravitas's own decoder accepted. A pasted
//                        link contributes its fragment and nothing else, so
//                        no address an author pastes can end up in a figure.
//   the words            title, caption and link text, each escaped by
//                        js/embedMarkup.js; there is no field for HTML, a
//                        script or a style.
//   the page's origin    checked to be an origin (js/embedOptions.js), or left
//                        out, in which case the figure obeys nobody.
//
// The preview is built with DOM calls, not markup, so nothing typed here is
// ever parsed as HTML on this page either.
// =============================================================================

import {
  LANGUAGES,
  language,
  preferred,
  setLanguage,
  t,
  translatePage,
} from './figure/i18n.js';
import { EMBED_CHOICES, embedParams, parentOrigin } from './embedOptions.js';
import { figureMarkup } from './embedMarkup.js';
import { buildPayload, decodePayload, encodePayload } from './shareState.js';
import { formatSeed, parseSeed, randomSeed } from './rng.js';
import { SCENARIO_INFO } from './data/scenarioInfo.js';

const $ = id => document.getElementById(id);
const els = {};
const ASPECTS = {
  '16:10': [16, 10],
  '16:9': [16, 9],
  '4:3': [4, 3],
  '1:1': [1, 1],
};
const SEED = /^[A-Za-z0-9_-]{1,24}$/;
const FRAGMENT = /#(\d+[zr][A-Za-z0-9_-]+)\s*$/;

/** Scenario names in Spanish, fetched the first time the page is in Spanish. */
let spanishNames = null;

function scenarioTitle(key) {
  if (language() === 'es' && spanishNames?.[`scenario.${key}.title`]) {
    return spanishNames[`scenario.${key}.title`];
  }
  return SCENARIO_INFO[key]?.title ?? key;
}

async function loadSpanishNames() {
  if (spanishNames || language() !== 'es') return;
  try {
    spanishNames = (await import('./i18n/es.js')).ES;
  } catch {
    spanishNames = {}; // English names, then; the builder still works
  }
}

function option(value, text) {
  const o = document.createElement('option');
  o.value = value;
  o.textContent = text;
  return o;
}

/** Fill the choices whose words depend on the language, keeping each value. */
function fillChoices() {
  const keep = id => els[id].value;
  const fill = (id, entries) => {
    const was = keep(id);
    els[id].replaceChildren(...entries.map(([v, text]) => option(v, text)));
    if (was && entries.some(([v]) => v === was)) els[id].value = was;
  };
  fill(
    'scenario',
    Object.keys(SCENARIO_INFO).map(key => [key, scenarioTitle(key)])
  );
  fill('lang', [
    ['', t('fig.look.lang.reader')],
    ...EMBED_CHOICES.lang.map(id => [
      id,
      LANGUAGES.find(l => l.id === id)?.endonym ?? id,
    ]),
  ]);
  fill('theme', [
    ['', t('fig.look.theme.reader')],
    ...EMBED_CHOICES.theme.map(id => [id, t(`fig.look.theme.${id}`)]),
  ]);
  fill(
    'reset',
    EMBED_CHOICES.reset.map(id => [id, t(`fig.look.reset.${id}`)])
  );
}

function renderLanguageSwitch() {
  const box = $('langSwitch');
  box.replaceChildren(
    ...LANGUAGES.map(({ id, endonym }) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ui-button';
      b.lang = id;
      b.textContent = endonym;
      b.setAttribute('aria-pressed', String(id === language()));
      b.addEventListener('click', async () => {
        setLanguage(id);
        await loadSpanishNames();
        translatePage();
        renderLanguageSwitch();
        fillChoices();
        update();
      });
      return b;
    })
  );
}

function setStatus(el, message, error = false) {
  el.textContent = message;
  el.classList.toggle('is-error', error);
}

/**
 * The state the form describes, decoded and ready to encode.
 * @returns {Promise<{payload: ?Object, message: string, error: boolean}>}
 */
async function readState() {
  const pasted = els.link.value.trim();
  if (pasted) {
    const match = FRAGMENT.exec(pasted);
    if (!match) {
      return {
        payload: null,
        message: t('fig.error.link.foreign'),
        error: true,
      };
    }
    try {
      const payload = await decodePayload(match[1]);
      const bodies = payload.b?.length
        ? payload.b.length === 1
          ? t('fig.status.bodies.one')
          : t('fig.status.bodies.many', { n: payload.b.length })
        : t('fig.status.bodies.seeded');
      return {
        payload,
        message: t('fig.status.link', {
          scenario: scenarioTitle(payload.s),
          bodies,
        }),
        error: false,
      };
    } catch {
      return {
        payload: null,
        message: t('fig.error.link.unreadable'),
        error: true,
      };
    }
  }
  const seed = els.seed.value.trim();
  if (!SEED.test(seed)) {
    return { payload: null, message: t('fig.error.seed'), error: true };
  }
  const scenario = els.scenario.value;
  return {
    payload: buildPayload({
      scenario,
      seed: parseSeed(seed),
      settings: {},
      DEFAULT_SETTINGS: {},
    }),
    message: t('fig.status.seeded', {
      scenario: scenarioTitle(scenario),
      seed,
    }),
    error: false,
  };
}

let shownSrc = '';
let generation = 0;

/** Everything on the right from everything on the left. */
async function update() {
  const mine = ++generation;
  const read = await readState();
  if (mine !== generation) return; // a later edit has already taken over
  setStatus(els.linkStatus, read.message, read.error);

  const origin = els.origin.value.trim();
  const parent = origin ? parentOrigin(origin) : null;
  setStatus(
    els.originStatus,
    origin && !parent ? t('fig.page.origin.bad') : '',
    Boolean(origin && !parent)
  );

  if (!read.payload) {
    els.markup.value = '';
    els.url.value = '';
    showPreview('');
    return;
  }
  const payload = { ...read.payload };
  if (
    document.querySelector('input[name="fbStart"]:checked')?.value === 'paused'
  ) {
    payload.p = 1;
  } else {
    delete payload.p;
  }
  const fragment = await encodePayload(payload);
  if (mine !== generation) return;

  const options = {
    lang: els.lang.value || null,
    theme: els.theme.value || null,
    controls: els.controls.checked ? 'transport' : 'none',
    motion: els.motion.checked ? 'reduced' : null,
    quality: els.quality.checked ? 'low' : null,
    reset: els.reset.value,
    parent,
  };
  const base = `${location.origin}/`;
  const query = new URLSearchParams(embedParams(options)).toString();
  const src = `${base}?${query}#${fragment}`;
  const plain = `${base}#${fragment}`;
  const [w, h] = ASPECTS[els.aspect.value] || ASPECTS['16:10'];
  const title =
    els.title.value.trim() ||
    t('fig.frame.title', { scenario: scenarioTitle(payload.s) });

  els.markup.value = figureMarkup({
    src,
    title,
    aspect: { w, h },
    height: Math.round((800 * h) / w),
    caption: els.caption.value,
    fallback: els.fallback.checked
      ? { href: plain, text: t('fig.words.fallback.text') }
      : null,
  });
  els.url.value = plain;
  showPreview(src, { w, h }, title);
}

/** The live figure, rebuilt only when its address changes. */
function showPreview(src, aspect = { w: 16, h: 10 }, title = '') {
  const box = els.preview;
  if (!src) {
    shownSrc = '';
    const empty = document.createElement('p');
    empty.className = 'fb-empty';
    empty.textContent = t('fig.out.none');
    box.replaceChildren(empty);
    return;
  }
  const pad = `${((aspect.h / aspect.w) * 100).toFixed(4)}%`;
  let frame = box.querySelector('iframe');
  if (src !== shownSrc || !frame) {
    shownSrc = src;
    const wrap = document.createElement('div');
    wrap.style.cssText = `position:relative;width:100%;padding-top:${pad};`;
    frame = document.createElement('iframe');
    frame.id = 'fbPreview';
    frame.style.cssText =
      'position:absolute;top:0;left:0;width:100%;height:100%;border:0;';
    frame.src = src;
    wrap.append(frame);
    box.replaceChildren(wrap);
  } else {
    frame.parentElement.style.paddingTop = pad;
  }
  frame.title = title || t('fig.preview.frame');
}

async function copy(field, status) {
  try {
    await navigator.clipboard.writeText(field.value);
    setStatus(status, t('fig.out.copied'));
  } catch {
    field.focus();
    field.select();
    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch {
      copied = false;
    }
    setStatus(
      status,
      copied ? t('fig.out.copied') : t('fig.out.copyFailed'),
      !copied
    );
  }
}

let timer = null;
const soon = () => {
  clearTimeout(timer);
  timer = setTimeout(update, 120);
};

async function init() {
  Object.assign(els, {
    link: $('fbLink'),
    linkStatus: $('fbLinkStatus'),
    scenario: $('fbScenario'),
    seed: $('fbSeed'),
    lang: $('fbLang'),
    theme: $('fbTheme'),
    aspect: $('fbAspect'),
    reset: $('fbReset'),
    controls: $('fbControls'),
    motion: $('fbMotion'),
    quality: $('fbQuality'),
    title: $('fbTitle'),
    caption: $('fbCaption'),
    fallback: $('fbFallback'),
    origin: $('fbOrigin'),
    originStatus: $('fbOriginStatus'),
    preview: $('fbPreviewBox'),
    markup: $('fbMarkup'),
    url: $('fbUrl'),
    copyStatus: $('fbCopyStatus'),
  });
  setLanguage(preferred());
  await loadSpanishNames();
  translatePage();
  renderLanguageSwitch();
  fillChoices();
  els.scenario.value = 'Solar System';
  els.seed.value = formatSeed(randomSeed());
  els.reset.value = 'authored';

  // A state handed over by Gravitas's Share dialog: /figure/#<fragment>.
  if (FRAGMENT.test(location.hash)) {
    els.link.value = `${location.origin}/${location.hash}`;
    try {
      const handed = await decodePayload(location.hash);
      if (handed.p) {
        document.querySelector(
          'input[name="fbStart"][value="paused"]'
        ).checked = true;
      }
    } catch {
      /* readState() says what is wrong with it */
    }
  }

  $('figureForm').addEventListener('input', soon);
  $('figureForm').addEventListener('change', soon);
  $('figureForm').addEventListener('submit', event => event.preventDefault());
  $('fbCopyMarkup').addEventListener('click', () =>
    copy(els.markup, els.copyStatus)
  );
  $('fbCopyLink').addEventListener('click', () =>
    copy(els.url, els.copyStatus)
  );
  await update();
}

init();
