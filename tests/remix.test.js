import { describe, test, expect } from '@jest/globals';
import { checkInvestigationPack } from '../js/composer/api.js';
import { remixBuiltin, loadOriginal } from '../js/composer/remixApi.js';
import {
  applyDelta,
  checkRemix,
  remixDelta,
  remixIdentity,
  remixLessonId,
  isRemixId,
  REMIX_FIELDS,
} from '../js/platform/remix.js';
import { packLink, readPackFragment } from '../js/composer/packLink.js';
import { mergeTranslation } from '../js/data/investigations/i18n.js';
import { MANIFEST } from '../js/data/investigations/manifest.js';
import { scenarioId } from '../js/data/scenarioInfo.js';
import { EN_REMIX } from '../js/i18n/en.remix.js';
import { ES_REMIX } from '../js/i18n/es.remix.js';

// =============================================================================
// Remix (Prompt 78): a built-in investigation as a pack, faithful and bounded
// =============================================================================

const clone = v => JSON.parse(JSON.stringify(v));
const IDS = MANIFEST.map(m => m.id);

function diff(a, b, path, out) {
  if (typeof a === 'function' || typeof b === 'function') {
    if (a !== b) out.push(`${path} (function)`);
    return;
  }
  if (a === b) return;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)]))
      diff(a[k], b[k], `${path}.${k}`, out);
    return;
  }
  out.push(path);
}

describe('a remix starts as a faithful copy', () => {
  test.each(IDS)(
    '%s: no error, no finding, the original by reference',
    async id => {
      const { pack } = await remixBuiltin(id, { id: `my-${id}` });
      const v = await checkInvestigationPack(pack);
      expect(v.errors).toEqual([]);
      expect(v.findings).toEqual([]);
      const o = await loadOriginal(id);
      const out = [];
      const strip = l => {
        const c = { ...l };
        for (const k of ['id', 'summary', 'depthLaid', 'pack']) delete c[k];
        return c;
      };
      diff(strip(v.compiled.lesson), strip(o.en), 'en', out);
      const es = mergeTranslation(v.compiled.lesson, v.compiled.shadow);
      diff(strip(es), strip(o.es || o.en), 'es', out);
      expect(out).toEqual([]);
      expect(v.compiled.lesson.id).toBe(remixLessonId(pack));
    }
  );

  test('lists what it keeps from the original', async () => {
    const { kept } = await remixBuiltin('keplers-laws', { id: 'my-kepler' });
    const all = kept.flatMap(k => k.fields);
    expect(all).toEqual(expect.arrayContaining(['probe', 'validate']));
    expect(REMIX_FIELDS.some(r => r[1] === 'refused')).toBe(true);
  });
});

describe('what a remix may not change', () => {
  const base = async () =>
    (await remixBuiltin('keplers-laws', { id: 'my-kepler' })).pack;
  const refuse = async (edit, path, code) => {
    const p = await base();
    edit(p);
    const v = await checkInvestigationPack(p);
    const hit = v.errors.find(e => e.path === path);
    expect(hit?.code).toBe(code);
  };
  const q = p =>
    p.steps.find(s => s.type === 'question' && s.kind === 'choice');
  const qi = p => p.steps.indexOf(q(p));

  test('an expected value', async () => {
    const p = await base();
    const i = qi(p);
    await refuse(
      x => (x.steps[i].answer = (x.steps[i].answer + 1) % 4),
      `steps[${i}].answer`,
      'remixValue'
    );
  });
  test('the number of options', async () => {
    const p = await base();
    const i = qi(p);
    await refuse(
      x => x.steps[i].options.pop(),
      `steps[${i}].options`,
      'remixOptions'
    );
  });
  test('a scenario, and a seed', async () => {
    const p = await base();
    const i = p.steps.findIndex(s => s.setup);
    await refuse(
      x => (x.steps[i].setup.scenario = 'retrograde-mars'),
      `steps[${i}].setup.scenario`,
      'remixScenario'
    );
    await refuse(
      x => (x.steps[i].setup.seed = 'other-seed'),
      `steps[${i}].setup.seed`,
      'remixSeed'
    );
  });
  test('an instrument', async () => {
    const make = async () =>
      (await remixBuiltin('power-law-gravity', { id: 'my-pl' })).pack;
    const i = (await make()).steps.findIndex(s => s.tool);
    expect(i).toBeGreaterThan(-1);
    for (const [edit, path, code] of [
      [
        x => (x.steps[i].tool = { id: 'no-such' }),
        `steps[${i}].tool.id`,
        'widget',
      ],
      [x => delete x.steps[i].tool, `steps[${i}].tool.id`, 'remixTool'],
    ]) {
      const p = await make();
      edit(p);
      const v = await checkInvestigationPack(p);
      expect(v.errors.find(e => e.path === path)?.code).toBe(code);
    }
  });
  test('a measure field’s id or unit', async () => {
    const p = await base();
    const i = p.steps.findIndex(s => s.type === 'measure');
    await refuse(
      x => (x.steps[i].fields[0].id = 'renamed'),
      `steps[${i}].fields`,
      'remixFields'
    );
  });
  test('a step’s type, a new measure step, a world on an added step', async () => {
    const p = await base();
    const i = qi(p);
    await refuse(
      x => (x.steps[i].type = 'read'),
      `steps[${i}].type`,
      'remixType'
    );
    await refuse(
      x =>
        x.steps.splice(2, 0, {
          sid: 'added-measure',
          type: 'measure',
          title: { en: 'T' },
          body: { en: 'B' },
          fields: [{ id: 'x', label: { en: 'X' } }],
        }),
      'steps[2].type',
      'remixAdded'
    );
    await refuse(
      x =>
        x.steps.splice(2, 0, {
          sid: 'added-read',
          type: 'read',
          title: { en: 'T' },
          body: { en: 'B' },
          setup: { scenario: 'solar-system' },
        }),
      'steps[2].setup',
      'remixAddedSetup'
    );
  });
  test('the digest of an original that has changed', async () => {
    await refuse(
      x => (x.derivedFrom.digest = '00000000'),
      'derivedFrom.digest',
      'originalChanged'
    );
  });

  test('every refusal names its field', async () => {
    const p = await base();
    const o = await loadOriginal('keplers-laws');
    p.steps[1].answer = 1;
    const errs = checkRemix(p, o.en, { scenarioId });
    for (const e of errs) expect(e.message).toBeTruthy();
  });
});

describe('what a remix may change', () => {
  test('reorder, remove, reword, translate, hints, depth and added questions', async () => {
    const { pack } = await remixBuiltin('keplers-laws', { id: 'my-kepler' });
    const p = clone(pack);
    p.steps[2].body = { en: `${p.steps[2].body.en} Add this.` };
    p.title = { en: 'Kepler, my way', es: 'Kepler, a mi manera' };
    const j = p.steps.findIndex(
      (s, k) => k > 2 && s.type === 'read' && !s.setup && k < p.steps.length - 1
    );
    p.steps.splice(j, 1);
    const v = await checkInvestigationPack(p);
    expect(v.errors).toEqual([]);
    expect(v.compiled.lesson.steps).toHaveLength(pack.steps.length - 1);
    expect(v.compiled.lesson.steps[2].body).toContain('Add this.');
    expect(mergeTranslation(v.compiled.lesson, v.compiled.shadow).title).toBe(
      'Kepler, a mi manera'
    );
    // Added question, inline.
    const q = {
      sid: 'my-question',
      type: 'question',
      kind: 'choice',
      title: { en: 'Mine' },
      body: { en: 'Think.' },
      prompt: { en: 'Which?' },
      options: [{ en: 'One' }, { en: 'Two' }],
      answer: 1,
      because: { en: 'Because.' },
      scoring: { points: 1, attempts: 'first' },
    };
    p.steps.splice(p.steps.length - 1, 0, q);
    const v2 = await checkInvestigationPack(p);
    expect(v2.errors).toEqual([]);
  });
});

describe('a remix as a link', () => {
  test.each(IDS)('%s: the delta gives the pack back', async id => {
    const { pack } = await remixBuiltin(id, { id: 'my-x' });
    const base = clone(pack);
    const p = clone(pack);
    p.steps[1].title = { en: 'Changed' };
    p.steps.splice(2, 1);
    const r = applyDelta(remixDelta(p, base), base);
    expect(r.ok).toBe(true);
    expect(JSON.stringify(r.pack)).toBe(JSON.stringify(p));
  });

  test('travels in a tagged fragment inside the caps, and reads back', async () => {
    const { pack } = await remixBuiltin('tides', { id: 'my-tides' });
    const p = clone(pack);
    p.steps[1].title = { en: 'Changed' };
    const link = await packLink(p, { root: 'https://x.test/', base: pack });
    expect(link.form).toBe('delta');
    expect(link.comfortable).toBe(true);
    expect(link.fragment).toMatch(/^i1[zr]/);
    const read = await readPackFragment(`#${link.fragment}`);
    expect(read.ok).toBe(true);
    const base = (await remixBuiltin('tides', { id: 'base' })).pack;
    expect(applyDelta(read.delta, base).pack.steps[1].title.en).toBe('Changed');
    const whole = await packLink(p, { root: 'https://x.test/' });
    expect(whole.form).toBe('pack');
    expect(whole.comfortable).toBe(false);
  });

  test('refuses a wrong tag, a damaged link and a hostile delta', async () => {
    expect((await readPackFragment('#a1rabc')).reason).toBe('wrongKind');
    expect((await readPackFragment('#i1rAAAA')).ok).toBe(false);
    const base = (await remixBuiltin('tides', { id: 'base' })).pack;
    expect(
      applyDelta({ id: 'a', version: '1.0.0', from: {}, steps: ['nope'] }, base)
        .ok
    ).toBe(false);
    expect(applyDelta({ x: 1 }, base).ok).toBe(false);
  });
});

describe('progress is namespaced by pack id and version', () => {
  test('an id names its pack and version, and two versions differ', () => {
    const a = remixLessonId({ id: 'my-orbit', version: '1.0.0' });
    const b = remixLessonId({ id: 'my-orbit', version: '1.1.0' });
    expect(a).not.toBe(b);
    expect(isRemixId(a)).toBe(true);
    expect(remixIdentity(a)).toEqual({ id: 'my-orbit', version: '1.0.0' });
    expect(isRemixId('keplers-laws')).toBe(false);
  });
});

describe('the words', () => {
  test('English and Spanish have the same keys', () => {
    expect(Object.keys(ES_REMIX).sort()).toEqual(Object.keys(EN_REMIX).sort());
  });
});
