import { describe, test, expect } from '@jest/globals';
import {
  EXPERIMENT_LINK_VERSION,
  experimentBlock,
  readExperimentBlock,
  fragmentFits,
  trimBlock,
} from '../js/experiments/shareExperiment.js';
import {
  buildPayload,
  encodePayload,
  decodePayload,
  COMFORTABLE_URL_LENGTH,
} from '../js/shareState.js';
import { withExtras, readExtras } from '../js/experiments/canonicalState.js';

// A link has to reproduce the experiment's setup, and every link ever made
// before this feature existed has to keep working. Both halves are tested.

const DEFAULTS = {
  preset_scenario: 'None',
  gravitational_constant: 1,
  integrator: 'Symplectic Euler',
  sim_speed: 1,
};

const experiment = () => ({
  name: 'Gravity doubled',
  metrics: ['separation', 'total_energy'],
  objects: [3, 7],
  primary: 3,
  diff: {
    variables: [{ key: 'gravitational_constant', from: 1, to: 2 }],
  },
  multivariableConfirmed: false,
});

describe('the experiment block', () => {
  test('carries the setup and not the results', () => {
    const block = experimentBlock(experiment());
    expect(block.v).toBe(EXPERIMENT_LINK_VERSION);
    expect(block.m).toEqual(['separation', 'total_energy']);
    expect(block.o).toEqual([3, 7]);
    expect(block.pr).toBe(3);
    expect(block.dv).toEqual([['gravitational_constant', 1, 2]]);
    // Nothing resembling a recorded sample.
    expect(JSON.stringify(block)).not.toContain('samples');
  });

  test('is nothing when there is no experiment to describe', () => {
    expect(experimentBlock(null)).toBeNull();
    expect(
      experimentBlock({ metrics: [], diff: { variables: [] } })
    ).toBeNull();
  });

  test('round-trips', () => {
    const block = experimentBlock(experiment());
    const back = readExperimentBlock({ xp: block });
    expect(back.present).toBe(true);
    expect(back.name).toBe('Gravity doubled');
    expect(back.metrics).toEqual(['separation', 'total_energy']);
    expect(back.objects).toEqual([3, 7]);
    expect(back.variables).toEqual([
      { key: 'gravitational_constant', from: 1, to: 2 },
    ]);
  });

  test('a payload with no block reads as absent, not as an empty experiment', () => {
    const back = readExperimentBlock({ v: 1, s: 'Binary BH' });
    expect(back.present).toBe(false);
    expect(back.metrics).toEqual([]);
  });

  test('junk in the block is filtered rather than trusted', () => {
    const back = readExperimentBlock({
      xp: {
        v: 1,
        m: ['separation', 42, null],
        o: ['x', 3],
        dv: ['nope', ['g', 1, 2]],
      },
    });
    expect(back.metrics).toEqual(['separation']);
    expect(back.objects).toEqual([3]);
    expect(back.variables).toEqual([{ key: 'g', from: 1, to: 2 }]);
  });
});

describe('backward compatibility', () => {
  const common = {
    scenario: 'Binary BH',
    seed: 42,
    settings: { ...DEFAULTS, preset_scenario: 'Binary BH' },
    DEFAULT_SETTINGS: DEFAULTS,
  };

  test('a link made without an experiment decodes exactly as before', async () => {
    const payload = buildPayload(common);
    const back = await decodePayload(await encodePayload(payload));
    expect(back.s).toBe('Binary BH');
    expect(back.xp).toBeUndefined();
    expect(back.x).toBeUndefined();
    // And the extras reader gives it sane defaults rather than failing.
    expect(readExtras(back).clock).toBe(0);
    expect(readExtras(back).frame.mode).toBe('world');
  });

  test('an old-style payload object still restores its experiment defaults', () => {
    const legacy = { v: 1, s: 'Solar System', seed: 'aa', d: { sim_speed: 2 } };
    expect(readExperimentBlock(legacy).present).toBe(false);
    expect(readExtras(legacy).observer).toEqual({
      positionAngle: 0,
      inclination: 90,
    });
  });

  test('a link with an experiment still decodes for everything else', async () => {
    const payload = buildPayload({
      ...common,
      extras: withExtras({}, { clock: 12.5 }).x,
      experiment: experimentBlock(experiment()),
    });
    const back = await decodePayload(await encodePayload(payload));
    expect(back.s).toBe('Binary BH');
    expect(readExtras(back).clock).toBeCloseTo(12.5, 6);
    expect(readExperimentBlock(back).metrics).toContain('separation');
  });

  test('the experiment costs a fraction of the URL budget', async () => {
    const plain = await encodePayload(buildPayload(common));
    const withExperiment = await encodePayload(
      buildPayload({ ...common, experiment: experimentBlock(experiment()) })
    );
    expect(withExperiment.length).toBeGreaterThan(plain.length);
    expect(withExperiment.length).toBeLessThan(COMFORTABLE_URL_LENGTH / 4);
  });
});

describe('the URL size guard', () => {
  test('accepts a comfortable link', () => {
    expect(
      fragmentFits('x'.repeat(200), 'https://gravitas-sim.online/').ok
    ).toBe(true);
  });

  test('refuses one past the threshold', () => {
    const result = fragmentFits('x'.repeat(COMFORTABLE_URL_LENGTH + 1));
    expect(result.ok).toBe(false);
    expect(result.limit).toBe(COMFORTABLE_URL_LENGTH);
  });

  test('trimming drops the least useful parts first', () => {
    const block = experimentBlock(experiment());
    const trimmed = trimBlock(block, 20);
    expect(trimmed.dropped[0]).toBe('name');
    expect(trimmed.block.m).toBeDefined();
  });

  test('trimming enough leaves nothing rather than a meaningless block', () => {
    const block = experimentBlock(experiment());
    const trimmed = trimBlock(block, JSON.stringify(block).length);
    expect(trimmed.block).toBeNull();
    expect(trimmed.dropped).toContain('measurements');
  });

  test('nothing is trimmed when it already fits', () => {
    const block = experimentBlock(experiment());
    expect(trimBlock(block, 0).dropped).toEqual([]);
  });
});
