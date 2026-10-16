// =============================================================================
// Help inside a lesson: the instruments' explainers and a problem note
// -----------------------------------------------------------------------------
// Lazy: fetched the first time Help opens. The words are in the panel's markup
// (js/fragments/lesson.html); this fills the two parts that depend on the step
// on screen and makes the note SUPPORT.md asks for, which is never sent
// anywhere: it is shown, and copying it is the reader's act.
// =============================================================================

import { PLATFORM_API } from '../platform/catalog.generated.js';

const $ = id => document.getElementById(id);

/** The docked instruments' explain buttons that show now, as list buttons. */
function fillTools() {
  const list = $('investigationHelpTools');
  list.replaceChildren();
  for (const id of [
    'investigationToolExplain',
    'investigationPlotExplain',
    'investigationEllipseExplain',
  ]) {
    const source = $(id);
    const panel = source?.closest('[id]:not(button)');
    if (!source || source.closest('[hidden]') || source.offsetParent === null)
      continue;
    const title = panel?.querySelector('.inv-plot-title')?.textContent;
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ui-button subtle';
    b.textContent = title || source.textContent;
    b.addEventListener('click', () => {
      source.click();
      source.focus();
    });
    li.append(b);
    list.append(li);
  }
  $('investigationHelpNone').hidden = list.children.length > 0;
}

/** The note, as plain text: what SUPPORT.md says a report needs. */
export async function problemNote({ lesson, n, total, depth, link, spent }) {
  let build = 'not installed (no service worker)';
  try {
    const names = (await globalThis.caches.keys()).filter(k =>
      k.startsWith('gravitas-')
    );
    if (names.length) build = names[0];
  } catch {
    /* no Cache API */
  }
  const step = lesson.steps[n];
  const nav = globalThis.navigator;
  const lines = [
    `Investigation: ${lesson.id} (${lesson.title})`,
    `Step: ${step?.sid ?? '?'} (${n + 1} of ${total}), depth ${depth}, ${Math.floor(spent / 60)} min in`,
    `Link: ${(await link()) || `${location.origin}/#investigation=${lesson.id}`}`,
    `App build: ${build}`,
    `Platform API: ${PLATFORM_API}`,
    `Browser: ${nav?.userAgent ?? 'unknown'}`,
    `Language: ${nav?.language ?? '?'}; page ${document.documentElement.lang || 'en'}`,
    `Screen: ${window.innerWidth}x${window.innerHeight} at ${window.devicePixelRatio}x, touch ${nav?.maxTouchPoints ?? 0}`,
    'What I expected instead: ',
  ];
  return lines.join('\n');
}

/** Wire the panel once, fill what depends on the step each time it opens. */
export function help(ctx) {
  fillTools();
  const note = $('investigationHelpNote');
  if ($('investigationHelpReport').dataset.wired) return;
  $('investigationHelpReport').dataset.wired = '1';
  $('investigationHelpReport').addEventListener('click', async () => {
    $('investigationHelpText').value = await problemNote(ctx());
    note.hidden = false;
    $('investigationHelpText').focus();
  });
  $('investigationHelpCopy').addEventListener('click', async () => {
    const text = $('investigationHelpText');
    text.select();
    try {
      await navigator.clipboard.writeText(text.value);
    } catch {
      document.execCommand?.('copy');
    }
  });
}
