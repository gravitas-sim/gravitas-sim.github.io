// =============================================================================
// Every modal opens through js/dialog.js
// -----------------------------------------------------------------------------
// PLATFORM_MODEL.md, "Dialogs" (Prompt 52): one module opens and closes every
// modal, so that "Tab stays inside, Escape closes it, focus goes back to what
// opened it" is true of all of them rather than of the ones somebody
// remembered. Before it, nine dialogs carried their own open, close and focus
// code - three through a second trap (js/focusTrap.js), the rest with none -
// and a reader met a different set of keys in each.
//
// This holds the inventory to that, statically. Every element in index.html
// that says role="dialog", and every one a module builds for itself, is either
// opened by a module that calls openDialog() from js/dialog.js, or is on the
// list below of the ones that are not modal, with the reason. A dialog that
// is not on the list and has no openDialog() behind it fails here; so does an
// entry on the list that declares aria-modal="true", because a dialog that
// says it is modal and is not is exactly what this is here to prevent.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const html = read('index.html');

/**
 * The dialogs that are not modal, and why. Each is non-modal in its markup
 * (aria-modal absent or "false"), which the tests below check.
 */
const NOT_MODAL = {
  // Home is a page of the shell under a bar that stays in use (Prompt 50),
  // and keeps its own focus handling for the two of them together.
  welcomeDialog: 'Home, a page of the shell rather than a layer over one',
  // The model's "Inline" list: an instrument readout that docks beside the
  // world and stays open while it runs.
  objectInspector: 'the object inspector, inline by design',
  // A popover under the speaker button: it closes on a press outside it, and
  // Escape returns focus to the button, but nothing behind it is shut off.
  soundPanel: 'the sound panel, an inline popover on its button',
  // The tour's scrim lets every press through (pointer-events: none): a
  // reader is meant to try the control each step spotlights.
  tutorialPopup: 'the guided tour, which leaves the interface live under it',
  // Reached by URL (?assign=) as a full-screen instructor tool: a page with
  // nothing behind it to return to, and no aria-modal.
  assignmentBuilder: 'the assignment builder, a full-screen tool by URL',
};

/** Every role="dialog" element in index.html, with its aria-modal. */
function markupDialogs() {
  const out = [];
  for (const [tag] of html.matchAll(/<[a-z][^>]*>/gis)) {
    if (!/\brole="dialog"/.test(tag)) continue;
    const id = /\bid="([^"]+)"/.exec(tag)?.[1] ?? null;
    const modal = /\baria-modal="([^"]*)"/.exec(tag)?.[1] ?? null;
    out.push({ id, modal, where: 'index.html' });
  }
  return out;
}

/** Every .js file under js/, as repository paths. */
function jsFiles(dir = 'js') {
  const out = [];
  for (const entry of fs.readdirSync(path.join(ROOT, dir), {
    withFileTypes: true,
  })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...jsFiles(rel));
    else if (entry.name.endsWith('.js')) out.push(rel);
  }
  return out;
}

const SOURCES = Object.fromEntries(
  jsFiles()
    .filter(file => !file.startsWith('js/i18n/'))
    .map(file => [file, read(file)])
);

/**
 * The dialogs modules build for themselves. Found by the attribute rather
 * than listed, so a new one cannot be added without this seeing it: the id
 * is the nearest one assigned before the role in the same file.
 */
function builtDialogs() {
  const out = [];
  for (const [file, src] of Object.entries(SOURCES)) {
    if (file === 'js/dialog.js') continue; // sets the role it is handed
    const role =
      // Not a selector that names the role: [role="dialog"].
      /setAttribute\(\s*'role',\s*'dialog'\s*\)|\brole:\s*'dialog'|(?<!\[)role="dialog"/g;
    for (const m of src.matchAll(role)) {
      const before = src.slice(Math.max(0, m.index - 600), m.index);
      const ids = [...before.matchAll(/\bid(?:\s*=|:)\s*'([A-Za-z][\w-]*)'/g)];
      out.push({ id: ids.at(-1)?.[1] ?? null, file, where: file });
    }
  }
  return out;
}

/** Does a module that names this id open a dialog through js/dialog.js? */
function openedBy(id) {
  return Object.entries(SOURCES)
    .filter(([file, src]) => {
      if (file === 'js/dialog.js') return false;
      const names = new RegExp(`['"\`#]${id}['"\`]`).test(src);
      const usesModule =
        /from '\.\/dialog\.js'|import\('\.\/dialog\.js'\)|from '\.\.\/dialog\.js'|import\('\.\.\/dialog\.js'\)/.test(
          src
        );
      return names && usesModule && /\bopenDialog\(/.test(src);
    })
    .map(([file]) => file);
}

const dialogs = [...markupDialogs(), ...builtDialogs()];

describe('the inventory', () => {
  test('every dialog can be named, so it can be held to this', () => {
    expect(dialogs.filter(d => !d.id)).toEqual([]);
  });

  test('it is the inventory PLATFORM_MODEL.md describes, and no smaller', () => {
    // Sixteen: the fourteen the model counts in index.html and the system
    // builder, plus the shortcut list and the assignment builder, which
    // modules build. A drop means the scan stopped seeing some of them.
    expect(dialogs.length).toBeGreaterThanOrEqual(16);
  });

  test('every entry on the not-modal list still exists', () => {
    const ids = new Set(dialogs.map(d => d.id));
    expect(Object.keys(NOT_MODAL).filter(id => !ids.has(id))).toEqual([]);
  });
});

describe('every modal opens through js/dialog.js', () => {
  for (const { id, where } of dialogs) {
    if (!id || id in NOT_MODAL) continue;
    // A failure names the dialog: no module opens it with openDialog() from
    // js/dialog.js. Open it there, or - if it is not modal - add it to
    // NOT_MODAL with the reason.
    test(`#${id} (${where})`, () => {
      expect({ id, openedBy: openedBy(id) }).not.toEqual({ id, openedBy: [] });
    });
  }
});

describe('the ones that are not modal say so', () => {
  for (const { id, modal, where } of dialogs) {
    if (!(id in NOT_MODAL)) continue;
    test(`#${id} (${where}): ${NOT_MODAL[id]}`, () => {
      // A dialog that declares itself modal belongs to js/dialog.js, and
      // being on this list would be the way to dodge it.
      expect(modal === undefined || modal === null || modal === 'false').toBe(
        true
      );
    });
  }
});

describe('one module', () => {
  test('there is no second focus trap to reach for', () => {
    // js/focusTrap.js was the second one; nothing may bring it back.
    expect(fs.existsSync(path.join(ROOT, 'js/focusTrap.js'))).toBe(false);
    const importers = Object.entries(SOURCES)
      .filter(([, src]) => /\/focusTrap\.js'/.test(src))
      .map(([file]) => file);
    expect(importers).toEqual([]);
  });

  test('modules on the start-up path load it on first open, not with the page', () => {
    // js/dialog.js is about 11 KB of source and a request of its own. A static
    // import in any of these puts it on every route (tools/route-budgets.json).
    for (const file of [
      'js/scenarioBrowser.js',
      'js/share.js',
      'js/shortcuts.js',
      'js/investigations.js',
      'js/ui.js',
    ]) {
      expect([file, /from '\.\/dialog\.js'/.test(SOURCES[file])]).toEqual([
        file,
        false,
      ]);
      expect([file, /import\('\.\/dialog\.js'\)/.test(SOURCES[file])]).toEqual([
        file,
        true,
      ]);
    }
  });
});
