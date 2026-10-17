import { describe, test, expect } from '@jest/globals';
import { judge, readReference } from '../tools/budget-environment.mjs';

const ref = { nodeMajor: '22', zlib: null };

describe('the budget tool names its reference environment', () => {
  test('it reads the Node major from .nvmrc and a committed zlib record', () => {
    const r = readReference();
    expect(r.nodeMajor).toMatch(/^\d+$/);
    expect(r).toHaveProperty('zlib');
  });

  test('the reference environment is strict: an over-budget run fails there', () => {
    const v = judge(ref, { node: '22.11.0', zlib: '1.3.0' });
    expect(v.matches).toBe(true);
    expect(v.strict).toBe(true);
  });

  test('another environment is advisory, and says what differs', () => {
    const v = judge(ref, { node: '24.4.0', zlib: '1.2.12' });
    expect(v.matches).toBe(false);
    expect(v.strict).toBe(false);
    expect(v.differences.join(' ')).toMatch(/Node 24 here, 22 in CI/);
  });

  test('--strict and CI make any environment fail; there is no tolerance', () => {
    const here = { node: '24.4.0', zlib: '1.2.12' };
    expect(judge(ref, here, { strictFlag: true }).strict).toBe(true);
    expect(judge(ref, here, { ci: true }).strict).toBe(true);
  });

  test('a recorded zlib that differs also makes the environment differ', () => {
    const v = judge(
      { nodeMajor: '22', zlib: '1.3.0' },
      { node: '22.1.0', zlib: '1.3.1' }
    );
    expect(v.matches).toBe(false);
    expect(v.differences.join(' ')).toMatch(/zlib 1.3.1 here, 1.3.0 in CI/);
  });
});
