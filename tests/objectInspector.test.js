/**
 * @jest-environment jsdom
 */
import {
  computeDockPosition,
  renderPinnedCard,
  renderDetails,
  patchDetails,
  renderEnergy,
  splitIdentity,
} from '../js/objectInspector.js';

const view = (overrides = {}) => ({
  icon: '🪐',
  name: 'Venus',
  kind: 'PLANET',
  mass: {
    objectId: '7',
    min: 0.01,
    max: 10,
    step: 0.1,
    value: 0.815,
    display: '0.815 M<sub>⊕</sub>',
  },
  groups: [
    {
      rows: [
        { key: 's0', label: 'Mass', value: '0.815 M⊕' },
        { key: 's1', label: 'Radius', value: '0.940 R⊕' },
        { key: 's2', label: 'Velocity', value: '35.0 km/s' },
      ],
    },
  ],
  overlays: [],
  about: '<p>The second planet.</p>',
  ...overrides,
});

const mount = v => {
  document.body.innerHTML = `<div id="root">${renderDetails(v)}</div>`;
  return document.getElementById('root');
};

describe('splitIdentity', () => {
  test('separates an icon glued to the front of the title', () => {
    // The info functions return "🪐Venus"; the header shows them apart so a
    // long name can truncate without taking the icon with it.
    expect(splitIdentity('🪐', '🪐Venus')).toEqual({
      icon: '🪐',
      name: 'Venus',
    });
  });

  test('leaves a title that does not repeat the icon alone', () => {
    expect(splitIdentity('⚫', 'Sagittarius A*')).toEqual({
      icon: '⚫',
      name: 'Sagittarius A*',
    });
  });

  test('never returns an empty name', () => {
    expect(splitIdentity('⭐', '⭐').name).toBe('Object');
    expect(splitIdentity(undefined, undefined).name).toBe('Object');
  });
});

describe('renderDetails', () => {
  test('emits one row per property, with label and value', () => {
    const root = mount(view());
    expect(root.querySelectorAll('.insp-prop')).toHaveLength(3);
    expect(root.querySelector('.insp-prop-label').textContent).toBe('Mass');
    expect(root.querySelectorAll('.insp-prop-value')[2].textContent).toBe(
      '35.0 km/s'
    );
  });

  test('the description is collapsed by default', () => {
    const root = mount(view());
    const about = root.querySelector('.insp-about');
    expect(about).toBeTruthy();
    expect(about.open).toBe(false);
  });

  test('no description means no disclosure at all', () => {
    const root = mount(view({ about: '' }));
    expect(root.querySelector('.insp-about')).toBeNull();
  });

  test('the mass control carries the range and the object it belongs to', () => {
    const root = mount(view());
    const slider = root.querySelector('#massSlider');
    expect(slider.min).toBe('0.01');
    expect(slider.max).toBe('10');
    expect(slider.dataset.objectId).toBe('7');
  });

  test('the mass readout keeps its unit markup rather than escaping it', () => {
    // The unit is trusted markup we build ourselves. Escaping it printed
    // "M<sub>⊕</sub>" on screen as literal text.
    const root = mount(view());
    expect(root.querySelector('#massValueDisplay sub')).toBeTruthy();
  });

  test('an object with no adjustable mass simply has no slider', () => {
    const root = mount(view({ mass: null }));
    expect(root.querySelector('#massSlider')).toBeNull();
    expect(root.querySelectorAll('.insp-prop')).toHaveLength(3);
  });

  test('overlays render as switches with accessible state', () => {
    const root = mount(
      view({
        overlays: [
          { id: 'hzToggleBtn', label: 'Habitable zone', on: true, help: 'why' },
        ],
      })
    );
    const btn = root.querySelector('#hzToggleBtn');
    expect(btn.getAttribute('role')).toBe('switch');
    expect(btn.getAttribute('aria-checked')).toBe('true');
    expect(btn.textContent.trim()).toBe('On');
    // Labelled by visible text, not only by a hover tooltip.
    expect(root.querySelector('#hzToggleBtnLabel').textContent).toBe(
      'Habitable zone'
    );
  });

  test('no overlays means no Overlays section', () => {
    expect(mount(view()).querySelector('.insp-overlays')).toBeNull();
  });

  test('group headings appear only when a group asks for one', () => {
    const root = mount(
      view({
        groups: [
          { rows: [{ key: 'a', label: 'Mass', value: '1' }] },
          {
            title: 'More',
            rows: [{ key: 'b', label: 'Position', value: '2' }],
          },
        ],
      })
    );
    const groups = root.querySelectorAll('.insp-group');
    expect(groups).toHaveLength(1);
    expect(groups[0].textContent).toBe('More');
  });

  test('an object name containing markup is escaped', () => {
    const root = mount(
      view({
        groups: [
          { rows: [{ key: 'a', label: '<img onerror=x>', value: 'safe' }] },
        ],
      })
    );
    expect(root.querySelector('img')).toBeNull();
    expect(root.querySelector('.insp-prop-label').textContent).toBe(
      '<img onerror=x>'
    );
  });
});

describe('patchDetails', () => {
  test('updates values without rebuilding the DOM', () => {
    const root = mount(view());
    const before = root.querySelectorAll('.insp-prop-value')[2];
    const next = view();
    next.groups[0].rows[2].value = '35.4 km/s';

    expect(patchDetails(root, next)).toBe(true);
    const after = root.querySelectorAll('.insp-prop-value')[2];
    // Same element, new text: this is what makes the 10 Hz refresh cheap.
    expect(after).toBe(before);
    expect(after.textContent).toBe('35.4 km/s');
  });

  test('leaves an open disclosure open', () => {
    // The old path replaced innerHTML ten times a second, so a description a
    // user had just opened closed itself again immediately.
    const root = mount(view());
    root.querySelector('.insp-about').open = true;
    patchDetails(root, view());
    expect(root.querySelector('.insp-about').open).toBe(true);
  });

  test('does not touch the slider the user may be dragging', () => {
    const root = mount(view());
    const slider = root.querySelector('#massSlider');
    slider.value = '4';
    patchDetails(root, view());
    expect(root.querySelector('#massSlider')).toBe(slider);
    expect(slider.value).toBe('4');
  });

  test('refuses when the property list changed shape', () => {
    // A transformed object has different properties. Patching by index would
    // put the old labels against the new values.
    const root = mount(view());
    const shorter = view();
    shorter.groups[0].rows = shorter.groups[0].rows.slice(0, 2);
    expect(patchDetails(root, shorter)).toBe(false);
  });

  test('syncs an overlay toggle that changed underneath it', () => {
    const root = mount(
      view({
        overlays: [
          { id: 'hzToggleBtn', label: 'Habitable zone', on: false, help: 'x' },
        ],
      })
    );
    patchDetails(
      root,
      view({
        overlays: [
          { id: 'hzToggleBtn', label: 'Habitable zone', on: true, help: 'x' },
        ],
      })
    );
    const btn = root.querySelector('#hzToggleBtn');
    expect(btn.textContent.trim()).toBe('On');
    expect(btn.getAttribute('aria-checked')).toBe('true');
  });

  test('updates the mass readout', () => {
    const root = mount(view());
    const v = view();
    v.mass.display = '1.20 M<sub>⊕</sub>';
    patchDetails(root, v);
    expect(root.querySelector('#massValueDisplay').textContent).toContain(
      '1.20'
    );
  });

  test('survives a missing root rather than throwing', () => {
    expect(patchDetails(null, view())).toBe(false);
  });
});

describe('renderEnergy', () => {
  test('gives every value the id the updater writes to', () => {
    document.body.innerHTML = renderEnergy();
    for (const id of [
      'currentKineticEnergy',
      'currentPotentialEnergy',
      'currentTotalEnergy',
      'currentDataPoints',
    ]) {
      expect(document.getElementById(id)).toBeTruthy();
    }
  });

  test('the chart canvas carries no hardcoded size', () => {
    // It was width="500" height="300" inside a panel that is now 420px wide.
    document.body.innerHTML = renderEnergy();
    const canvas = document.getElementById('energyChart');
    expect(canvas.getAttribute('width')).toBeNull();
    expect(canvas.getAttribute('height')).toBeNull();
  });

  test('the actions are labelled for assistive technology', () => {
    document.body.innerHTML = renderEnergy();
    for (const id of ['refreshEnergyChart', 'exportEnergyChart']) {
      const btn = document.getElementById(id);
      expect(btn.getAttribute('aria-label')).toBeTruthy();
    }
  });
});

describe('computeDockPosition', () => {
  const rect = (left, top, right, bottom) => ({ left, top, right, bottom });
  // The readout overlay, measured on the running app. It is the thing the
  // panel kept landing on.
  const HUD = rect(16, 16, 346, 506);
  const place = over =>
    computeDockPosition({
      viewportWidth: 1440,
      viewportHeight: 900,
      panelWidth: 420,
      panelHeight: 500,
      hud: HUD,
      rail: rect(1216, 8, 1424, 860),
      ...over,
    });

  test('docks against the rail on a wide screen', () => {
    const { left, top } = place();
    expect(left + 420).toBe(1216 - 12);
    expect(top).toBe(96);
  });

  test('docks against the window edge when there is no rail', () => {
    expect(place({ rail: null }).left + 420).toBe(1440 - 12);
  });

  test('a full-width rail is not treated as a blocker', () => {
    // Below about 1180px the rail becomes a sheet spanning the window. Docking
    // to the left of it would push the panel off the screen.
    const { left } = place({
      viewportWidth: 1024,
      rail: rect(27, 60, 1006, 714),
      panelWidth: 400,
    });
    expect(left).toBe(1024 - 12 - 400);
  });

  test('drops below the readout instead of covering it', () => {
    // 740px wide: the fixed right inset the stylesheet used to apply put the
    // panel's left edge at 328, which is inside the readout. This is the case
    // the user reported and the one a constant offset cannot see.
    const { left, top } = place({
      viewportWidth: 740,
      rail: null,
      panelWidth: 400,
    });
    expect(top).toBe(HUD.bottom + 12);
    expect(left).toBe(740 - 12 - 400);
  });

  test('leaves the panel where it is when it already clears the readout', () => {
    const { left, top } = place({ viewportWidth: 900, rail: null });
    expect(top).toBe(96);
    expect(left).toBe(900 - 12 - 420);
    expect(left).toBeGreaterThan(HUD.right);
  });

  test('a hidden readout constrains nothing', () => {
    const { left, top } = place({
      viewportWidth: 700,
      rail: null,
      panelWidth: 400,
      hud: null,
    });
    expect({ left, top }).toEqual({ left: 288, top: 96 });
  });

  test('a panel pushed below the readout gets a height it can fit in', () => {
    // 740x820 was the case that broke: dropping below the readout to clear it
    // hung the panel's bottom third off the bottom of the window.
    const { top, maxHeight } = place({
      viewportWidth: 740,
      viewportHeight: 820,
      rail: null,
      panelWidth: 400,
    });
    expect(top).toBe(HUD.bottom + 12);
    expect(top + maxHeight).toBeLessThanOrEqual(820);
  });

  test('a window too short to drop below the readout keeps a usable panel', () => {
    const { top, maxHeight } = place({
      viewportWidth: 740,
      viewportHeight: 600,
      rail: null,
      panelWidth: 400,
    });
    expect(maxHeight).toBe(260);
    expect(top + maxHeight).toBeLessThanOrEqual(600);
  });

  test('never leaves the panel off the left edge', () => {
    const { left } = place({
      viewportWidth: 660,
      rail: null,
      panelWidth: 900,
      hud: null,
    });
    expect(left).toBe(12);
  });

  test('never places the top below the window', () => {
    const { top, maxHeight } = place({ viewportHeight: 400 });
    expect(top + maxHeight).toBeLessThanOrEqual(400);
  });
});

describe('renderPinnedCard', () => {
  const card = (v = view()) => {
    document.body.innerHTML = `<div class="insp-pin">${renderPinnedCard(v)}</div>`;
    return document.querySelector('.insp-pin');
  };

  test('carries no control that would collide with the inspector', () => {
    // The inspector addresses its controls by id. A second #massSlider or
    // #hzToggleBtn on the page would make every lookup in the app find
    // whichever element came first in the document.
    const root = card(
      view({
        overlays: [
          { id: 'hzToggleBtn', label: 'Habitable zone', on: true, help: 'x' },
        ],
      })
    );
    expect(root.querySelector('#massSlider')).toBeNull();
    expect(root.querySelector('#hzToggleBtn')).toBeNull();
    expect(root.querySelector('input')).toBeNull();
  });

  test('shows the identity and every property', () => {
    const root = card();
    expect(root.querySelector('.inspector-title').textContent).toBe('Venus');
    expect(root.querySelector('.inspector-kind').textContent).toBe('PLANET');
    expect(root.querySelectorAll('.insp-prop')).toHaveLength(3);
  });

  test('the only button is the one that removes the card', () => {
    const root = card();
    const buttons = root.querySelectorAll('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0].hasAttribute('data-pin-close')).toBe(true);
    expect(buttons[0].getAttribute('aria-label')).toContain('Venus');
  });

  test('patchDetails updates a card the same way it updates the panel', () => {
    // The cards run their own refresh, so they have to be patchable by the
    // same code path rather than rebuilt from scratch ten times a second.
    const root = card();
    const before = root.querySelectorAll('.insp-prop-value')[1];
    const next = view();
    next.groups[0].rows[1].value = '0.950 R⊕';
    expect(patchDetails(root, next)).toBe(true);
    expect(root.querySelectorAll('.insp-prop-value')[1]).toBe(before);
    expect(before.textContent).toBe('0.950 R⊕');
  });

  test('a name containing markup is escaped', () => {
    const root = card(view({ name: '<img onerror=x>' }));
    expect(root.querySelector('img')).toBeNull();
    expect(root.querySelector('.inspector-title').textContent).toBe(
      '<img onerror=x>'
    );
  });
});
