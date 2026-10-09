// =============================================================================
// The distribution kit (/teaching/kit/)
// -----------------------------------------------------------------------------
// One page that turns an Activity or a Course into what an instructor hands out:
// the student link, a QR code made here (js/kit/qr.js), markup for a page, a
// one-page handout in either language, notes for Canvas, Moodle and Blackboard,
// and the check that lets last term's Activity be used again. It starts from the
// fragment of a link (the builders open it that way), a pasted link or a saved
// file, and never sends any of it anywhere. No LTI claim is made or implied.
// See INSTRUCTOR_FLOW.md.
// =============================================================================

import { mountShell } from '../shell.js';
import {
  frameMarkup,
  handoutMarkup,
  linkMarkup,
  pasteText,
} from './handout.js';
import { tr } from './kitText.js';
import { NOTES, PLATFORMS } from './lmsNotes.js';

/**
 * Everything that reads a link or a course, fetched when something is given to
 * read: a visitor who has nothing to make a kit from downloads none of it.
 */
let deps = null;
const need = () =>
  (deps ??= Promise.all([
    import('./activity.js'),
    import('../assignments/assignmentLink.js'),
    import('../course/links.js'),
    import('../course/pack.js'),
    import('../data/investigations/manifest.js'),
    import('../data/investigations/manifest.es.js'),
    import('../shareState.js'),
  ]).then(([activity, al, links, pack, en, es, share]) => ({
    ...activity,
    assignmentLink: al.assignmentLink,
    courseLink: links.courseLink,
    itemsOf: pack.itemsOf,
    MANIFEST: en.MANIFEST,
    MANIFEST_ES: es.MANIFEST,
    LIMIT: share.COMFORTABLE_URL_LENGTH,
  })));

const ROOT = new URL('../../', location.href).href;
const $ = id => document.getElementById(id);
const lang = () =>
  document.documentElement.lang.startsWith('es') ? 'es' : 'en';
const T = (id, vars) => tr(lang(), id, vars);
const text = (v, loc) => (v && (v[loc] || v.en)) || '';

let source = null;
let url = null;
const lessons = new Map();

/** The investigation in a language, loaded once. */
async function lesson(id, loc) {
  const key = `${id}/${loc}`;
  if (!lessons.has(key)) {
    const { loadInvestigation } =
      await import('../data/investigations/registry.js');
    lessons.set(key, await loadInvestigation(id, loc));
  }
  return lessons.get(key);
}

let D = null;
const cardTitle = (id, loc) =>
  (loc === 'es' ? D.MANIFEST_ES : D.MANIFEST).find(m => m.id === id)?.title ||
  D.MANIFEST.find(m => m.id === id)?.title ||
  id;

/** Translate the static words. */
function words() {
  document.title = T('page.title');
  for (const el of document.querySelectorAll('[data-k]'))
    el.textContent = T(el.dataset.k);
  for (const el of document.querySelectorAll('[data-k-label]'))
    el.setAttribute('aria-label', T(el.dataset.kLabel));
}

function say(id, vars) {
  $('kitStatus').textContent = id ? T(id, vars) : '';
}

/** What was handed in, or the reason it was not. */
async function take(input, roster) {
  D = await need();
  const r = await D.readSource(input);
  if (!r.ok) {
    const known = ['notJson', 'unknownKind', 'tooLarge', 'badCourse'].includes(
      r.reason
    );
    return say(known ? `start.reason.${r.reason}` : 'start.reason.other', {
      message: r.detail?.message || '',
      code: r.reason,
    });
  }
  say('');
  source = r;
  if (roster !== undefined && roster !== null) $('kitRoster').value = roster;
  await build();
}

async function studentLink() {
  if (source.kind === 'course') {
    const c = await D.courseLink(source.pack, { root: ROOT });
    return { url: c.url, length: c.length };
  }
  const a = await D.assignmentLink(source.activity, ROOT);
  const u = new URL(a.url);
  const roster = $('kitRoster').value.trim();
  if (roster) u.searchParams.set('roster', roster);
  return { url: u.href, length: u.href.length };
}

/** Titles of what the source holds, in a language. */
async function rowsOf(loc) {
  if (source.kind === 'activity') {
    const a = source.activity;
    const l = await lesson(a.l, loc).catch(() => null);
    const by = new Map((l?.steps || []).map(s => [s.sid, s.title]));
    return {
      title: a.t || l?.title || cardTitle(a.l, loc),
      intro: a.n || '',
      rows: a.s.map(sid => by.get(sid) || sid),
      steps: a.s.length,
    };
  }
  const p = source.pack;
  const rows = [];
  for (const { item, unit } of D.itemsOf(p)) {
    const t = text(item.title, loc);
    const name =
      item.kind === 'lesson'
        ? cardTitle(item.lesson, loc)
        : item.kind === 'dataset'
          ? item.dataset
          : t || item.id;
    rows.push(
      `${text(unit.title, loc)}: ${T2(loc, `item.${item.kind}`, { title: name })}`
    );
  }
  return {
    title: text(p.title, loc),
    intro: text(p.summary, loc),
    rows,
    steps: rows.length,
  };
}
const T2 = (loc, id, vars) => tr(loc, id, vars);

/** The handout, in one language or both. */
async function renderHandout() {
  if (!source || !url) return;
  const choice = $('hoLang').value;
  const locales = choice === 'both' ? ['en', 'es'] : [choice];
  const { qrCode, qrSvg } = await import('../kit/qr.js');
  const code = qrCode(url.url);
  const out = [];
  for (const loc of locales) {
    const what = await rowsOf(loc);
    out.push(
      handoutMarkup(loc, {
        ...what,
        kind: source.kind,
        link: url.url,
        roster: source.kind === 'activity' ? $('kitRoster').value.trim() : '',
        hint: $('kitHint').value.trim(),
        svg: code
          ? qrSvg(code, { label: tr(loc, 'qr.label', { title: what.title }) })
          : '',
      })
    );
  }
  $('handout').innerHTML = out.join('');
  // The paste text and the platform notes follow the same language choice.
  const loc = locales[0];
  const paste = pasteText(loc, {
    kind: source.kind,
    link: url.url,
    hint: $('kitHint').value.trim(),
  });
  const notes = $('lms');
  notes.replaceChildren();
  for (const id of PLATFORMS) {
    const [name, steps] = NOTES[lang()][id];
    const box = document.createElement('div');
    box.className = 'kit-lms';
    const h = document.createElement('h3');
    h.textContent = name;
    const ol = document.createElement('ol');
    for (const s of steps)
      ol.append(
        Object.assign(document.createElement('li'), { textContent: s })
      );
    const ta = document.createElement('textarea');
    ta.className = 'ui-textarea';
    ta.readOnly = true;
    ta.rows = 4;
    ta.value = paste;
    ta.setAttribute('aria-label', `${name}: ${T('lms.paste')}`);
    const copy = Object.assign(document.createElement('button'), {
      type: 'button',
      className: 'ui-button',
      textContent: T('lms.copy'),
    });
    copy.addEventListener('click', () => copyText(ta.value));
    box.append(h, ol, ta, copy);
    notes.append(box);
  }
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    say('link.copied');
  } catch {
    /* the text is selected for the reader to copy by hand */
  }
}

async function build() {
  url = await studentLink();
  const loc = lang();
  $('kit').hidden = false;
  const facts =
    source.kind === 'activity'
      ? T('kind.activity', {
          steps: source.activity.s.length,
          lesson: cardTitle(source.activity.l, loc),
        })
      : T('kind.course', {
          units: source.pack.units.length,
          activities: D.activitiesOf(source, loc).length,
        });
  $('kitFacts').textContent = facts;
  $('kitName').textContent =
    source.kind === 'activity'
      ? source.activity.t || ''
      : text(source.pack.title, loc);
  $('kitRosterRow').hidden = source.kind !== 'activity';
  $('kitReuse').hidden = false;
  $('kitReuseCheck').hidden = source.kind !== 'activity';
  $('kitReuseSave').hidden = source.kind !== 'activity';
  $('kitReuseNote').textContent =
    source.kind === 'course' ? T('reuse.course') : T('reuse.note');

  $('kitLink').value = url.url;
  const comfortable = url.length <= D.LIMIT;
  $('kitLinkNote').textContent = comfortable
    ? T('link.ok', { n: url.length })
    : T('link.long', { n: url.length, limit: D.LIMIT });
  $('kitOpen').href = url.url;

  const { qrCode, qrSvg } = await import('../kit/qr.js');
  const code = qrCode(url.url);
  const slot = $('kitQr');
  if (code) {
    slot.innerHTML = qrSvg(code, {
      label: T('qr.label', { title: $('kitName').textContent || url.url }),
    });
    $('kitQrDownload').hidden = false;
    $('kitQrLong').hidden = true;
  } else {
    slot.replaceChildren();
    $('kitQrDownload').hidden = true;
    $('kitQrLong').hidden = false;
    $('kitQrLong').textContent = T('qr.long', { max: 2953 });
  }

  const title = $('kitName').textContent || url.url;
  $('kitEmbed').value =
    source.kind === 'course'
      ? `${frameMarkup(url.url, title)}\n${linkMarkup(url.url, title)}`
      : linkMarkup(url.url, title);
  $('kitEmbedNote').textContent = T(
    source.kind === 'course' ? 'embed.note.course' : 'embed.note.activity'
  );
  $('kitReuseOut').textContent = '';
  $('kitReuseUse').hidden = true;
  await renderHandout();
}

/** Check the Activity against this build and offer a new link. */
let reissued = null;
async function reuse() {
  const out = $('kitReuseOut');
  out.textContent = T('reuse.loading');
  const a = source.activity;
  try {
    const { stepFingerprint } =
      await import('../investigations/progressBackup.js');
    const { lessonProvider } = await import('../assignments/provider.js');
    const l = await lesson(a.l, 'en');
    const r = D.reuseCheck(a, l, stepFingerprint, lessonProvider(a.l));
    reissued = r.clean ? null : r.reissued;
    out.textContent = r.clean
      ? T('reuse.clean', { n: r.present })
      : `${T('reuse.dirty', r)} ${r.reissued ? T('reuse.reissued') : ''}`;
    $('kitReuseUse').hidden = !reissued;
  } catch {
    out.textContent = T('reuse.failed');
  }
}

function saveActivity() {
  const a = source.activity;
  const blob = new Blob([`${JSON.stringify(a, null, 2)}\n`], {
    type: 'application/json',
  });
  const link = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: `${a.l}-${a.i}.json`,
  });
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 10000);
}

function wire() {
  $('kitGo').addEventListener('click', async () => {
    const v = $('kitPaste').value;
    if (v.trim()) take(v, (await need()).rosterOf(v));
  });
  $('kitFile').addEventListener('change', async e => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) take(await file.text().catch(() => ''));
  });
  $('kitCopy').addEventListener('click', () => copyText($('kitLink').value));
  $('kitEmbedCopy').addEventListener('click', () =>
    copyText($('kitEmbed').value)
  );
  for (const id of ['kitRoster', 'kitHint'])
    $(id).addEventListener('change', () => source && build());
  $('hoLang').addEventListener('change', renderHandout);
  $('hoPrint').addEventListener('click', () => {
    document.body.dataset.print = 'handout';
    window.print();
    setTimeout(() => delete document.body.dataset.print, 0);
  });
  $('kitQrDownload').addEventListener('click', async () => {
    const { qrCode, qrSvg } = await import('../kit/qr.js');
    const code = qrCode(url.url);
    if (!code) return;
    const blob = new Blob([qrSvg(code, { label: $('kitName').textContent })], {
      type: 'image/svg+xml',
    });
    const link = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: 'gravitas-code.svg',
    });
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 10000);
  });
  $('kitReuseCheck').addEventListener('click', reuse);
  $('kitReuseSave').addEventListener('click', saveActivity);
  $('kitReuseUse').addEventListener('click', async () => {
    if (!reissued) return;
    source = { ok: true, kind: 'activity', activity: reissued };
    reissued = null;
    await build();
    $('kitReuseOut').textContent = T('reuse.reissued');
  });
}

async function init() {
  wire();
  words();
  mountShell({
    onLanguage: () => {
      words();
      if (source) build();
    },
  });
  if (/^#[ac]\d/.test(location.hash)) {
    const roster = new URLSearchParams(location.search).get('roster');
    await take(location.hash, roster);
  }
  document.body.dataset.ready = 'true';
}

init();
