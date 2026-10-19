/**
 * @jest-environment jsdom
 */
// =============================================================================
// The interaction contract (Prompt 155)
// -----------------------------------------------------------------------------
// INTERACTION.md is the rule and tools/interaction-contract.json is the rule as
// data. This is the binding test every registered surface passes, the guards
// that stop a new drag or a new shared key arriving unregistered, the unit
// tests of what js/interaction.js and js/quality.js provide at run time, and
// the pending acceptance checks (Prompt 278 activates them) for the surfaces
// that do not yet meet the contract. The walks of the surfaces themselves are
// in e2e/interactionContract.spec.js and the specs it binds.
// =============================================================================

import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

import {
  checkContract,
  sharedLetters,
} from '../tools/interaction-contract.mjs';
import { runPending, readRegistry } from '../tools/pending-acceptance.mjs';
import { NUDGE, nudgeSize, nudgeScale } from '../js/shortcuts.js';
import { moveFocus, returnFocus, settledAnnouncer } from '../js/interaction.js';
import {
  MOTION_MODES,
  motionPreference,
  setMotionPreference,
  initMotionPreference,
  prefersReducedMotion,
  stepMotion,
} from '../js/quality.js';
import { openDialog } from '../js/dialog.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = file => {
  const full = path.join(ROOT, file);
  return existsSync(full) ? readFileSync(full, 'utf8') : null;
};
const contract = JSON.parse(read('tools/interaction-contract.json'));

/** Every module under js/ that listens for a pointer's movement. */
function pointerFiles() {
  const found = new Set();
  const walk = dir => {
    for (const e of readdirSync(path.join(ROOT, dir), {
      withFileTypes: true,
    })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(rel);
      else if (
        e.name.endsWith('.js') &&
        /'(pointermove|mousemove|touchmove)'/.test(read(rel))
      )
        found.add(rel);
    }
  };
  walk('js');
  return found;
}

const tree = () => ({
  read,
  pendingIds: new Set(readRegistry().map(c => c.id)),
  pointerFiles: pointerFiles(),
});
const clone = () => JSON.parse(JSON.stringify(contract));

describe('every registered surface keeps the contract', () => {
  test('the committed contract holds against the tree', () => {
    expect(checkContract(contract, tree())).toEqual([]);
  });

  test('four surfaces the roadmap names are registered, with the walks they were asked for', () => {
    const ids = contract.surfaces.map(s => s.id);
    for (const id of [
      'sandbox.placement',
      'observatory.selection',
      'plot.cursor',
      'lab3d.camera',
    ])
      expect(ids).toContain(id);
    for (const s of contract.surfaces) {
      expect(s.tests.keyboard).toBeTruthy();
      const owed = s.drags.filter(
        id => contract.drags.find(d => d.id === id).status === 'met'
      );
      expect(Boolean(s.tests.singlePointer) || owed.length === 0).toBe(true);
    }
  });

  test('a key the contract does not know is refused', () => {
    const bad = clone();
    bad.surfaces[0].keys.push({ key: 'q', action: 'nudge' });
    expect(checkContract(bad, tree()).join('\n')).toMatch(
      /not a key of the contract/
    );
  });

  test('a key bound to another action is refused unless a conflict is named', () => {
    const bad = clone();
    const s = bad.surfaces.find(x => x.id === 'plot.cursor');
    s.keys.push({ key: 'Enter', action: 'nudge' });
    expect(checkContract(bad, tree()).join('\n')).toMatch(/name the conflict/);
    s.exceptions = ['K1'];
    expect(checkContract(bad, tree())).toEqual([]);
  });

  test('a binding the source never writes is refused', () => {
    const bad = clone();
    bad.surfaces
      .find(x => x.id === 'plot.cursor')
      .keys.push({
        key: '-',
        action: 'zoom',
      });
    bad.surfaces.find(x => x.id === 'plot.cursor').exceptions = ['K3'];
    expect(checkContract(bad, tree()).join('\n')).toMatch(/never writes "-"/);
  });

  test('a walk that is not in its file is refused', () => {
    const bad = clone();
    bad.surfaces[0].tests.keyboard.title = 'a test nobody wrote';
    expect(checkContract(bad, tree()).join('\n')).toMatch(/no test titled/);
    const gone = clone();
    gone.surfaces[0].tests.keyboard.file = 'e2e/nothing.spec.js';
    expect(checkContract(gone, tree()).join('\n')).toMatch(/does not exist/);
  });

  test('a drag with no alternative is a gap that names a registered pending check', () => {
    const bad = clone();
    const d = bad.drags.find(x => x.id === 'sandbox.pan');
    d.pending = 'interaction.single-pointer.made-up';
    expect(checkContract(bad, tree()).join('\n')).toMatch(
      /must name a registered pending check/
    );
    const lie = clone();
    lie.drags.find(x => x.id === 'observer.handle').status = 'met';
    expect(checkContract(lie, tree()).join('\n')).toMatch(
      /met, with no alternative/
    );
  });

  test('a surface with no announcement test needs a reason', () => {
    const bad = clone();
    delete bad.surfaces.find(x => x.id === 'sandbox.view').notApplicable;
    expect(checkContract(bad, tree()).join('\n')).toMatch(
      /no announcement test/
    );
  });

  test('a module that listens for pointer movement must be registered', () => {
    const t = tree();
    t.pointerFiles.add('js/aNewDragger.js');
    expect(checkContract(contract, t).join('\n')).toMatch(
      /js\/aNewDragger\.js listens/
    );
    const stale = tree();
    stale.pointerFiles.delete('js/view3d.js');
    expect(checkContract(contract, stale).join('\n')).toMatch(
      /no longer listens/
    );
  });

  test('every drag site is accounted for by a drag or an exemption with its reason', () => {
    const sites = contract.dragSites.sites;
    expect(Object.keys(sites).sort()).toEqual([...pointerFiles()].sort());
  });

  test('a letter taken by a shortcut and by the pan handler is a declared conflict', () => {
    const shared = sharedLetters(
      read('js/controls.js') + read('js/placement.js'),
      read('js/placement.js')
    );
    const open = contract.conflicts.filter(c => c.status !== 'resolved');
    // Every shared letter must be named by a conflict that is not resolved,
    // and a conflict that names a letter nobody shares must be resolved.
    const unnamed = shared.filter(
      letter => !open.some(c => c.keys.toLowerCase() === letter)
    );
    expect(unnamed).toEqual([]);
    for (const c of open.filter(c => /^[A-Z]$/.test(c.keys)))
      expect(shared).toContain(c.keys.toLowerCase());
  });
});

describe('the contract is one set of numbers', () => {
  test('the three step sizes in the contract are the ones the code uses', () => {
    expect(NUDGE).toEqual({
      fine: contract.nudge.fine.scale,
      normal: contract.nudge.normal.scale,
      coarse: contract.nudge.coarse.scale,
    });
    expect(nudgeSize({ altKey: true })).toBe('fine');
    expect(nudgeSize({ shiftKey: true })).toBe('coarse');
    expect(nudgeSize({})).toBe('normal');
    expect(nudgeSize({ altKey: true, shiftKey: true })).toBe('fine');
    expect(nudgeScale({ shiftKey: true })).toBe(4);
  });

  test('the sandbox aim takes its sizes from js/shortcuts.js, not a copy', () => {
    const source = read('js/placement.js');
    expect(source).toMatch(/nudgeScale[\s\S]*from '\.\/shortcuts\.js'/);
    expect(source).not.toMatch(/AIM_COARSE|AIM_FINE/);
  });

  test('the plot component animates nothing, so its reduced-motion rule is satisfied by construction', () => {
    const dir = path.join(ROOT, 'js/plot');
    for (const f of readdirSync(dir).filter(n => n.endsWith('.js')))
      expect(read(`js/plot/${f}`)).not.toMatch(
        /requestAnimationFrame|\.animate\(|transition:/
      );
  });

  test('the override reaches every blanket reduced-motion rule', () => {
    for (const f of ['css/tokens.css', 'css/styles.css', 'css/components.css'])
      expect(read(f)).toMatch(/:root\[data-motion\]/);
  });

  test('INTERACTION.md names every surface, drag, conflict and pending check', () => {
    const doc = read('INTERACTION.md');
    const names = [
      ...contract.surfaces.map(s => s.id),
      ...contract.drags.map(d => d.id),
      ...contract.conflicts.map(c => c.id),
      ...readRegistry()
        .map(c => c.id)
        .filter(id => id.startsWith('interaction.')),
    ];
    expect(names.filter(n => !doc.includes(n))).toEqual([]);
  });
});

describe('focus and announcements', () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<div id="srStatus" aria-live="polite"></div>' +
      '<button id="open">open</button><section id="panel" hidden><h2 id="head">Title</h2></section>';
  });

  test('moveFocus lands on a heading without adding it to the tab order, and says so', () => {
    const head = document.getElementById('head');
    document.getElementById('panel').hidden = false;
    expect(moveFocus(head, 'Panel opened')).toBe(true);
    expect(document.activeElement).toBe(head);
    expect(head.getAttribute('tabindex')).toBe('-1');
    expect(document.getElementById('srStatus').textContent).toBe(
      'Panel opened'
    );
  });

  test('moveFocus does nothing for an element that is not in the page', () => {
    expect(moveFocus(document.createElement('div'), 'x')).toBe(false);
    expect(document.getElementById('srStatus').textContent).toBe('');
  });

  test('returnFocus goes to the trigger, or to the fallback when the trigger is gone or hidden', () => {
    const open = document.getElementById('open');
    const panel = document.getElementById('panel');
    expect(returnFocus(open)).toBe(true);
    expect(document.activeElement).toBe(open);
    panel.hidden = false;
    const inner = Object.assign(document.createElement('button'), { id: 'in' });
    panel.append(inner);
    inner.focus();
    panel.hidden = true;
    expect(returnFocus(inner, open)).toBe(true);
    expect(document.activeElement).toBe(open);
    expect(returnFocus(null, null)).toBe(false);
  });

  describe('a readout that a nudge changes is announced when it settles', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    test('forty presses are one announcement, and it is the last value', () => {
      const said = [];
      const a = settledAnnouncer({ say: m => said.push(m), delay: 500 });
      for (let i = 1; i <= 40; i++) {
        a.nudge(`value ${i}`);
        jest.advanceTimersByTime(50);
      }
      expect(said).toEqual([]);
      jest.advanceTimersByTime(500);
      expect(said).toEqual(['value 40']);
    });

    test('a commit is said at once and cancels what was waiting', () => {
      const said = [];
      const a = settledAnnouncer({ say: m => said.push(m), delay: 500 });
      a.nudge('value 3');
      a.commit('placed at value 3');
      jest.advanceTimersByTime(2000);
      expect(said).toEqual(['placed at value 3']);
    });
  });
});

describe("reduced motion, with the reader's own override", () => {
  // quality.js keeps the first query it is given, so every test shares one.
  const mql = { matches: false };
  const query = matches => {
    mql.matches = matches;
    window.matchMedia = () => mql;
  };
  beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.motion;
    setMotionPreference('system', { remember: false });
  });
  afterEach(() => {
    delete window.matchMedia;
    setMotionPreference('system', { remember: false });
  });

  test('the three modes, and anything else is the system setting', () => {
    expect(MOTION_MODES).toEqual(['system', 'reduce', 'step']);
    setMotionPreference('nonsense');
    expect(motionPreference()).toBe('system');
  });

  test('"follow my device" follows the media query in both directions', () => {
    query(false);
    expect(prefersReducedMotion()).toBe(false);
  });

  test('reduce asks for reduced motion on a device that did not, and marks the page', () => {
    query(false);
    setMotionPreference('reduce');
    expect(prefersReducedMotion()).toBe(true);
    expect(document.documentElement.dataset.motion).toBe('reduce');
    expect(stepMotion()).toBe(false);
    expect(window.localStorage.getItem('gravitas_motion')).toBe('reduce');
  });

  test('step is reduce, and also starts the world paused', () => {
    query(false);
    setMotionPreference('step');
    expect(prefersReducedMotion()).toBe(true);
    expect(stepMotion()).toBe(true);
  });

  test('an override only adds reduction: the system setting still wins when it asks', () => {
    query(true);
    setMotionPreference('system');
    expect(prefersReducedMotion()).toBe(true);
  });

  test('choosing the system setting again removes the mark and the stored value', () => {
    setMotionPreference('reduce');
    setMotionPreference('system');
    expect(document.documentElement.dataset.motion).toBeUndefined();
    expect(window.localStorage.getItem('gravitas_motion')).toBeNull();
  });

  test('the stored choice is restored at start-up and a corrupt one is ignored', () => {
    window.localStorage.setItem('gravitas_motion', 'step');
    initMotionPreference();
    expect(motionPreference()).toBe('step');
    window.localStorage.setItem('gravitas_motion', 'sideways');
    initMotionPreference();
    expect(motionPreference()).toBe('system');
  });

  test('a dialog opens without waiting a frame under the override, as it does for the system setting', () => {
    query(false);
    document.body.innerHTML =
      '<div id="host" class="hidden" hidden><div id="dlg"><button>ok</button></div></div>';
    const host = document.getElementById('host');
    setMotionPreference('reduce');
    openDialog(document.getElementById('dlg'), { backdrop: host });
    expect(host.classList.contains('hidden')).toBe(false);
  });
});

describe('what the surfaces do not yet do is reported, not forgotten', () => {
  const has = (file, pattern) => {
    const text = read(file);
    if (text === null || !pattern.test(text))
      throw new Error(`${file} has nothing matching ${pattern}`);
  };
  const checks = {
    'interaction.keyboard.sandbox-zoom': () =>
      has('js/placement.js', /e\.key === '[+=]'[\s\S]{0,200}state\.zoom/),
    'interaction.single-pointer.sandbox-pan': () =>
      has('index.html', /id="pan[A-Z][A-Za-z]*"|data-pan=/),
    'interaction.single-pointer.lab3d-orbit': () =>
      has('3d/index.html', /id="l3-orbit/),
    'interaction.single-pointer.observer-handle': () =>
      has('js/lightCurve.js', /'keydown'/),
    'interaction.single-pointer.window-move': () => {
      has('js/view3d.js', /'keydown'/);
      has('js/inspectorWindow.js', /'keydown'/);
    },
    'interaction.single-pointer.observatory-run': () =>
      has('js/plot/table.js', /data-select-run/),
  };

  test('every pending check of this contract is written here', () => {
    const registered = readRegistry()
      .map(c => c.id)
      .filter(id => id.startsWith('interaction.'));
    expect(Object.keys(checks).sort()).toEqual(registered.sort());
  });

  for (const [id, body] of Object.entries(checks))
    test(`${id}`, async () => {
      const result = await runPending(id, body);
      // Pending is not a failure; a check that has begun to pass says so.
      expect(['met', 'pending']).toContain(result.status);
    });
});
