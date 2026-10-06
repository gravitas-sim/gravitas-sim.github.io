// =============================================================================
// Every real-system parameter names its source
// -----------------------------------------------------------------------------
// The attribution rule (js/authoring/rules.js, author:check) used to check
// only a lesson's quotations. Since Roadmap II Prompt 62 it reaches the data a
// lesson stands on: every planet, star, small body and system whose numbers
// are real carries `sources`, field by field, and a value no cited table gives
// says "approximate, unsourced" rather than borrowing a source. These tests
// hold the rule to what it claims, and the provenance line and the model page
// to the same objects.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';

import {
  loadRealSystems,
  realSystemFindings,
  realSystemSourceProblems,
} from '../tools/authoring/realSystems.mjs';
import { SOURCES } from '../js/data/realSystemSources.js';
import { SCENARIO_SOURCES } from '../js/sandboxTools.js';
import { SCENARIO_INFO } from '../js/data/scenarioInfo.js';
import { HD209458 } from '../js/data/exoplanetSystems.js';
import { EN_CAPTURE as EN } from '../js/i18n/en.capture.js';
import { ES_CAPTURE as ES } from '../js/i18n/es.capture.js';

const systems = await loadRealSystems();
const clone = v => JSON.parse(JSON.stringify(v));

describe('the real systems', () => {
  test('are found: the compiled modules and every table js/world/build.js keeps', () => {
    const where = new Set(
      systems.map(s => s.where.split(' ').slice(0, 2).join(' '))
    );
    for (const w of [
      'js/data/exoplanetSystems.js HD209458',
      'js/data/exoplanetSystems.js SUN_JUPITER',
      'js/data/trappist1.js TRAPPIST1_STAR',
      'js/data/trappist1.js TRAPPIST1_PLANETS',
      'js/world/build.js solarSystemData',
      'js/world/build.js realAsteroids',
      'js/world/build.js famousComets',
      'js/world/build.js kuiperBeltObjects',
      'js/world/build.js worlds',
    ]) {
      expect(where).toContain(w);
    }
    // Eight planets, sixteen asteroids, twelve comets, eight Kuiper belt
    // objects, six in the two `worlds` tables, and ten compiled objects.
    expect(systems).toHaveLength(60);
  });

  test('every one attributes every parameter, and no source is filed for an object that is not there', async () => {
    expect(await realSystemFindings()).toEqual([]);
    expect(Object.keys(SOURCES).sort()).toEqual(
      systems.map(s => s.where).sort()
    );
  });

  test('the values no source gives are said to be approximate, not dropped', () => {
    const unsourced = systems.flatMap(s =>
      s.sources
        .filter(src => src.text === 'approximate, unsourced')
        .flatMap(src => (src.fields || ['*']).map(f => `${s.where} ${f}`))
    );
    // Among them, the ones the audit of 2026-10-01 found: TRAPPIST-1 g's
    // period, Jupiter's semi-major axis in the Sun-Jupiter comparison,
    // Saturn's distance from the Sun, and every value of Sedna.
    expect(unsourced).toEqual(
      expect.arrayContaining([
        'js/data/trappist1.js TRAPPIST1_PLANETS g periodDays',
        'js/data/exoplanetSystems.js SUN_JUPITER planet.semiMajorAU',
        'js/world/build.js solarSystemData Saturn distance',
        'js/world/build.js kuiperBeltObjects Sedna *',
      ])
    );
  });
});

describe('the attribution rule', () => {
  const ignore = ['id', 'name', 'planetName', 'planetNickname'];
  const hd = () => clone(HD209458);
  const cited = () => clone(SOURCES['js/data/exoplanetSystems.js HD209458']);

  test('passes HD 209458 as it is', () => {
    expect(realSystemSourceProblems(hd(), cited(), ignore)).toEqual([]);
  });

  test('refuses an object with no sources', () => {
    expect(realSystemSourceProblems(hd(), undefined, ignore)).toEqual([
      'has no sources: [{text, doi | bibcode | url, fields}] in js/data/realSystemSources.js',
    ]);
  });

  test('refuses a parameter added without a source', () => {
    const o = hd();
    o.planet.albedo = 0.03;
    expect(realSystemSourceProblems(o, cited(), ignore)).toEqual([
      '"planet.albedo" has no source',
    ]);
  });

  test('refuses a source with nothing to find it by, and a field that is not there', () => {
    const src = cited();
    delete src[0].doi;
    src[1].fields.push('planet.colour');
    expect(realSystemSourceProblems(hd(), src, ignore)).toEqual([
      'sources[0] "Southworth 2010, MNRAS 408, 1689" has no doi, bibcode or url',
      'sources[1] names "planet.colour", which is not a parameter here',
    ]);
  });

  test('lets one entry give every parameter the others do not name, and only one', () => {
    const src = cited();
    const { fields, ...all } = src[0];
    expect(fields.length).toBeGreaterThan(0);
    expect(realSystemSourceProblems(hd(), [all], ignore)).toEqual([]);
    expect(
      realSystemSourceProblems(
        hd(),
        [all, { text: 'approximate, unsourced' }],
        ignore
      )
    ).toEqual(['sources[1] is a second entry with no fields']);
  });

  test('refuses an "approximate, unsourced" entry that cites something after all', () => {
    const src = cited();
    src.push({
      text: 'approximate, unsourced',
      doi: '10.1086/529429',
      fields: ['name'],
    });
    expect(realSystemSourceProblems(hd(), src, ignore)).toContain(
      'sources[9] says "approximate, unsourced" and cites something'
    );
  });
});

describe('the provenance line and the model page print them', () => {
  test('every scenario the provenance line credits exists, and its summary is its sources’', () => {
    const keysOf = {
      'solar-system':
        /^js\/world\/build\.js (solarSystemData|realAsteroids|famousComets) /,
      'kuiper-belt': /^js\/world\/build\.js kuiperBeltObjects /,
      'habitable-zone-lab':
        /^js\/world\/build\.js worlds \(Habitable Zone Lab\) /,
      'retrograde-mars': /^js\/world\/build\.js worlds \(Retrograde Mars\) /,
      'trappist-1-system': /^js\/data\/trappist1\.js /,
      'transit-lab': /^js\/data\/exoplanetSystems\.js HD209458$/,
      'exoplanet-characterization-lab':
        /^js\/data\/exoplanetSystems\.js HD209458$/,
    };
    expect(Object.keys(SCENARIO_SOURCES).sort()).toEqual(
      Object.keys(keysOf).sort()
    );
    for (const [name, line] of Object.entries(SCENARIO_SOURCES)) {
      expect({ name, known: name in SCENARIO_INFO }).toEqual({
        name,
        known: true,
      });
      const entries = Object.entries(SOURCES)
        .filter(([k]) => keysOf[name].test(k))
        .flatMap(([, v]) => v);
      expect(entries.length).toBeGreaterThan(0);
      const loose = entries.filter(e => e.text === 'approximate, unsourced');
      const want = !loose.length
        ? ''
        : loose.length === entries.length
          ? 'all'
          : 'some';
      expect({ name, approximate: line.approximate }).toEqual({
        name,
        approximate: want,
      });
      // Every source the line names is one the objects cite: its first word
      // and its year are in one of their texts.
      for (const cite of line.cites.split(', ').filter(Boolean)) {
        const [first] = cite.split(' ');
        const year = cite.match(/\d{4}/)?.[0] || '';
        const found = entries.some(
          e => e.text.includes(first) && e.text.includes(year)
        );
        expect({ name, cite, found }).toEqual({ name, cite, found: true });
      }
    }
  });

  test('the line says "approximate" in both languages', () => {
    for (const cat of [EN, ES]) {
      expect(cat['capture.caption.sources']).toContain('{sources}');
      expect(cat['capture.caption.approximate.some']).toBeTruthy();
      expect(cat['capture.caption.approximate.all']).toBeTruthy();
    }
  });

  test('the model page lists every object and every pack, with its badge', () => {
    const page = readFileSync(
      new URL('../model/index.html', import.meta.url),
      'utf8'
    );
    const block = page.slice(
      page.indexOf('<!--fact-block:parameterSources-->'),
      page.indexOf(
        '<!--/fact-block-->',
        page.indexOf('<!--fact-block:parameterSources-->')
      )
    );
    expect((block.match(/<tr>/g) || []).length).toBe(systems.length);
    expect(block).toContain('<strong>approximate, unsourced</strong>');
    const packs = page.slice(
      page.indexOf('<!--fact-block:dataPacks-->'),
      page.indexOf(
        '<!--/fact-block-->',
        page.indexOf('<!--fact-block:dataPacks-->')
      )
    );
    expect(packs).toMatch(
      /NGC 3198: a synthetic rotation curve<\/td>\s*<td><span class="doc-badge is-illustrative">Synthetic<\/span>/
    );
  });
});
