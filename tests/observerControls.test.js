/**
 * @jest-environment jsdom
 */
import {
  getPositionAngle,
  getInclination,
  setPositionAngle,
  setInclination,
  resetObserver,
  onObserverChange,
  EDGE_ON_DEG,
} from '../js/observerGeometry.js';
import { mountObserverControls } from '../js/observerControls.js';

beforeEach(() => {
  resetObserver();
  document.body.innerHTML = '';
});

describe('the shared observer is genuinely shared', () => {
  test('two mounted controls both follow a change made to either', () => {
    // The architectural requirement: there is one observer. Three panels with
    // three inclination sliders would be three observers, and the interface
    // itself would be teaching that a face-on system can have a full-amplitude
    // radial-velocity curve.
    const a = document.createElement('div');
    a.id = 'panelA';
    const b = document.createElement('div');
    b.id = 'panelB';
    document.body.append(a, b);
    mountObserverControls(a);
    mountObserverControls(b);

    const incA = a.querySelector('[data-inc-slider]');
    const incB = b.querySelector('[data-inc-slider]');
    expect(incA.value).toBe('90');
    expect(incB.value).toBe('90');

    incA.value = '35';
    incA.dispatchEvent(new Event('input'));

    expect(getInclination()).toBe(35);
    expect(incB.value).toBe('35');
    expect(b.querySelector('[data-inc-value]').textContent).toBe('35°');
  });

  test('position angle propagates the same way', () => {
    const a = document.createElement('div');
    a.id = 'panelA';
    const b = document.createElement('div');
    b.id = 'panelB';
    document.body.append(a, b);
    mountObserverControls(a);
    mountObserverControls(b);

    a.querySelector('[data-pa-slider]').value = '145';
    a.querySelector('[data-pa-slider]').dispatchEvent(new Event('input'));

    expect(getPositionAngle()).toBe(145);
    expect(b.querySelector('[data-pa-slider]').value).toBe('145');
  });

  test('a control mounted later starts from the current observer', () => {
    setInclination(20);
    const late = document.createElement('div');
    late.id = 'late';
    document.body.append(late);
    mountObserverControls(late);
    expect(late.querySelector('[data-inc-slider]').value).toBe('20');
  });

  test('tearing one down leaves the other working', () => {
    const a = document.createElement('div');
    a.id = 'panelA';
    const b = document.createElement('div');
    b.id = 'panelB';
    document.body.append(a, b);
    const teardownA = mountObserverControls(a);
    mountObserverControls(b);

    teardownA();
    expect(a.innerHTML).toBe('');

    setInclination(45);
    expect(b.querySelector('[data-inc-slider]').value).toBe('45');
  });
});

describe('the observer state itself', () => {
  test('inclination is clamped, not wrapped', () => {
    // Wrapping 91 degrees round to 89 would silently mirror the orbit; a tilt
    // is not an angle on a circle.
    setInclination(-30);
    expect(getInclination()).toBe(0);
    setInclination(200);
    expect(getInclination()).toBe(180);
  });

  test('position angle is wrapped, because it is an angle on a circle', () => {
    setPositionAngle(-90);
    expect(getPositionAngle()).toBe(270);
    setPositionAngle(450);
    expect(getPositionAngle()).toBe(90);
  });

  test('setting the same value again notifies nobody', () => {
    let calls = 0;
    const off = onObserverChange(() => calls++);
    setInclination(60);
    expect(calls).toBe(1);
    setInclination(60);
    expect(calls).toBe(1);
    off();
  });

  test('a listener that throws does not stop the others', () => {
    const seen = [];
    const offBad = onObserverChange(() => {
      throw new Error('panel exploded');
    });
    const offGood = onObserverChange(() => seen.push(getInclination()));
    // The module warns rather than rethrowing; silence it for the assertion.
    const realWarn = console.warn;
    console.warn = () => {};
    setInclination(15);
    console.warn = realWarn;
    expect(seen).toEqual([15]);
    offBad();
    offGood();
  });

  test('reset returns to edge-on, the default a transit needs', () => {
    setInclination(10);
    setPositionAngle(200);
    resetObserver();
    expect(getInclination()).toBe(EDGE_ON_DEG);
    expect(getPositionAngle()).toBe(0);
  });
});

describe('inclination is described in words, not only in color or number', () => {
  test.each([
    [90, 'Edge-on'],
    [75, 'Nearly edge-on'],
    [45, 'Tilted'],
    [20, 'Nearly face-on'],
    [0, 'Face-on'],
  ])('%i degrees reads as "%s"', (deg, word) => {
    const host = document.createElement('div');
    host.id = 'host';
    document.body.append(host);
    mountObserverControls(host);
    setInclination(deg);
    expect(host.querySelector('[data-inc-word]').textContent).toBe(word);
  });
});
