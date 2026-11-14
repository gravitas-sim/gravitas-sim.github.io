import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { KEY_QUALITY_VERDICT } from '../js/names.js';

// =============================================================================
// The quality verdict carried to pages that never render the simulation
// -----------------------------------------------------------------------------
// The application page decides a tier and writes it to one sessionStorage key;
// a page that computes without drawing the simulation (the Observatory) reads it
// and never exceeds it. Every test gets a fresh copy of the module, because the
// module's state (has this page rendered a frame, has it looked at the key yet)
// is what separates the two kinds of page.
// =============================================================================

const HOUR = 3600000;

/** Fresh copies of js/quality.js and js/qualityVerdict.js, as a newly loaded page has them. */
async function freshPage() {
  jest.resetModules();
  return {
    ...(await import('../js/quality.js')),
    ...(await import('../js/qualityVerdict.js')),
  };
}

const store = (tier, at = Date.now()) =>
  sessionStorage.setItem(KEY_QUALITY_VERDICT, JSON.stringify({ tier, at }));

/** Ten frames per second for long enough to be judged slow. */
const slowFrames = q => {
  for (let i = 0; i < 300; i++) q.sampleFrame(1000 + i * 100);
};
/** A fast machine. */
const fastFrames = q => {
  for (let i = 0; i < 400; i++) q.sampleFrame(1000 + (i * 1000) / 120);
};

beforeEach(() => sessionStorage.clear());
afterEach(() => jest.restoreAllMocks());

describe('a page that does not render the simulation', () => {
  test('with no verdict stored it computes at the full tier, as before', async () => {
    const q = await freshPage();
    q.adoptVerdict();
    expect(q.computeTier()).toBe('full');
    expect(q.computeNote(['bootstrapDraws'])).toBeNull();
    expect(q.computeValue('bootstrapDraws')).toBe(1000);
  });

  test('with a low verdict stored it computes at the low tier and says so', async () => {
    store('low');
    const q = await freshPage();
    const heard = [];
    q.onTierChange(t => heard.push(t));
    expect(q.adoptVerdict()).toBe(true);
    expect(q.computeTier()).toBe('low');
    expect(q.computeValue('bootstrapDraws')).toBe(300);
    expect(q.computeNote(['profilePoints'])).toEqual({
      tier: 'low',
      reduced: { profilePoints: { used: 7, full: 11 } },
    });
    expect(q.currentTier()).toBe('low');
    expect(heard).toEqual(['low']);
  });

  test('a full verdict changes nothing: the verdict only ever lowers the tier', async () => {
    store('full');
    const q = await freshPage();
    expect(q.adoptVerdict()).toBe(false);
    expect(q.computeTier()).toBe('full');
    expect(q.currentTier()).toBe('full');
  });

  test('a stale, future, malformed or unknown verdict is ignored', async () => {
    const now = Date.now();
    const bad = [
      JSON.stringify({ tier: 'low', at: now - HOUR - 1000 }),
      JSON.stringify({ tier: 'low', at: now + 60000 }),
      JSON.stringify({ tier: 'low' }),
      JSON.stringify({ tier: 'ultra', at: now }),
      JSON.stringify({ tier: 'low', at: 'yesterday' }),
      'low',
      '{not json',
      'null',
    ];
    for (const raw of bad) {
      sessionStorage.setItem(KEY_QUALITY_VERDICT, raw);
      const q = await freshPage();
      expect(q.storedVerdict()).toBeNull();
      expect(q.adoptVerdict()).toBe(false);
      expect(q.computeTier()).toBe('full');
    }
  });

  test('a verdict just inside the hour is believed', async () => {
    const now = Date.now();
    store('low', now - HOUR + 5000);
    const q = await freshPage();
    expect(q.storedVerdict(now)).toBe('low');
  });

  test('blocked storage changes nothing and throws nothing', async () => {
    store('low');
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    const q = await freshPage();
    expect(() => q.adoptVerdict()).not.toThrow();
    expect(q.computeTier()).toBe('full');
    expect(q.qualityReport().decided).toBe(false);
  });

  test('the address can still force the full tier over a stored low verdict, and stores nothing', async () => {
    store('low');
    const q = await freshPage();
    q.adoptVerdict();
    expect(q.computeTier()).toBe('low');
    expect(q.applyTierRequest('?quality=full')).toBe('full');
    expect(q.computeTier()).toBe('full');
    expect(JSON.parse(sessionStorage.getItem(KEY_QUALITY_VERDICT)).tier).toBe(
      'low'
    );
  });

  test('forcing a tier by address on this page never writes the verdict', async () => {
    const q = await freshPage();
    q.applyTierRequest('?quality=low');
    expect(sessionStorage.getItem(KEY_QUALITY_VERDICT)).toBeNull();
  });
});

describe('the application page', () => {
  test('writes its verdict when the classifier demotes, and updates it on promotion', async () => {
    const q = await freshPage();
    q.initMotionPreference();
    slowFrames(q);
    expect(q.currentTier()).toBe('low');
    const written = JSON.parse(sessionStorage.getItem(KEY_QUALITY_VERDICT));
    expect(written.tier).toBe('low');
    expect(Number.isFinite(written.at)).toBe(true);
    for (let i = 0; i < 2000; i++) q.sampleFrame(200000 + (i * 1000) / 120);
    expect(q.currentTier()).toBe('full');
    expect(JSON.parse(sessionStorage.getItem(KEY_QUALITY_VERDICT)).tier).toBe(
      'full'
    );
  });

  test('writes a full verdict for a fast machine, replacing a stale low one', async () => {
    store('low');
    const q = await freshPage();
    fastFrames(q);
    expect(q.qualityReport().decided).toBe(true);
    expect(JSON.parse(sessionStorage.getItem(KEY_QUALITY_VERDICT)).tier).toBe(
      'full'
    );
  });

  test('decides for itself: a stored low verdict does not lower it before it has measured', async () => {
    store('low');
    const q = await freshPage();
    q.sampleFrame(1000);
    expect(q.adoptVerdict()).toBe(false);
    expect(q.computeTier()).toBe('full');
    expect(q.currentTier()).toBe('full');
  });

  test('a reader who forces a tier in Settings has decided it for the other pages too', async () => {
    const q = await freshPage();
    q.sampleFrame(1000);
    q.setTier('low');
    expect(JSON.parse(sessionStorage.getItem(KEY_QUALITY_VERDICT)).tier).toBe(
      'low'
    );
    q.setTier('ultra');
    expect(JSON.parse(sessionStorage.getItem(KEY_QUALITY_VERDICT)).tier).toBe(
      'full'
    );
  });

  test('blocked storage does not stop the tier from deciding', async () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    const q = await freshPage();
    q.initMotionPreference();
    expect(() => slowFrames(q)).not.toThrow();
    expect(q.currentTier()).toBe('low');
  });

  test('the one key holds a tier and a time and nothing else', async () => {
    const q = await freshPage();
    q.initMotionPreference();
    slowFrames(q);
    expect(
      Object.keys(
        JSON.parse(sessionStorage.getItem(KEY_QUALITY_VERDICT))
      ).sort()
    ).toEqual(['at', 'tier']);
    expect(localStorage.getItem(KEY_QUALITY_VERDICT)).toBeNull();
  });
});
