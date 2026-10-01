// =============================================================================
// Every real-system parameter object, for the attribution rule and the model page
// -----------------------------------------------------------------------------
// The planets, stars, small bodies and systems whose numbers are real: the two
// compiled modules' exports and the tables js/world/build.js builds scenarios
// from. js/authoring/rules.js holds each to the attribution rule (author:check),
// and tools/docs-facts.mjs lists them, with their sources, on the model page.
// =============================================================================

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HD209458, SUN_JUPITER } from '../../js/data/exoplanetSystems.js';
import { TRAPPIST1_PLANETS, TRAPPIST1_STAR } from '../../js/data/trappist1.js';
import { SOURCES } from '../../js/data/realSystemSources.js';

const REPO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
);

/**
 * The real-system tables js/world/build.js builds scenarios from, and the
 * keys in each that are not parameters: a name, a colour, a drawn size, a
 * starting phase, a category. Each table is an array literal of plain objects
 * whose sources come from js/data/realSystemSources.js.
 */
export const REAL_SYSTEM_TABLES = {
  solarSystemData: [
    'name',
    'color',
    'phase_deg',
    'type',
    'giantType',
    'density',
  ],
  realAsteroids: ['name'],
  famousComets: ['name'],
  kuiperBeltObjects: ['name'],
  // Two tables have this name: the Habitable Zone Lab's (`radius` is its
  // drawn size) and the resonance scenarios' (`r` is).
  worlds: ['name', 'color', 'radius', 'r'],
};

/**
 * Every real-system parameter object, with where it is and what to ignore:
 * the modules' exports, and each entry of each table js/world/build.js keeps.
 * The tables are read from the file as literals, with the shared sources in
 * scope, rather than imported: they are local to the functions that use them.
 */
export async function loadRealSystems() {
  const out = [
    {
      where: 'js/data/exoplanetSystems.js HD209458',
      object: HD209458,
      ignore: ['id', 'name', 'planetName', 'planetNickname'],
    },
    {
      where: 'js/data/exoplanetSystems.js SUN_JUPITER',
      object: SUN_JUPITER,
      ignore: ['id', 'name', 'planetName'],
    },
    {
      where: 'js/data/trappist1.js TRAPPIST1_STAR',
      object: TRAPPIST1_STAR,
      ignore: ['name', 'baseColor'],
    },
    ...TRAPPIST1_PLANETS.map(p => ({
      where: `js/data/trappist1.js TRAPPIST1_PLANETS ${p.name}`,
      object: p,
      ignore: ['name'],
    })),
  ];
  const file = 'js/world/build.js';
  const text = await readFile(path.join(REPO, file), 'utf8');
  const seen = { worlds: 0 };
  for (const [table, ignore] of Object.entries(REAL_SYSTEM_TABLES)) {
    const marker = `const ${table} = [`;
    for (
      let at = text.indexOf(marker);
      at >= 0;
      at = text.indexOf(marker, at + 1)
    ) {
      const start = at + marker.length - 1;
      const end =
        text.indexOf('\n    ];', start) >= 0
          ? matchingBracket(text, start)
          : -1;
      if (end < 0) continue;
      // A literal from our own source, evaluated as one.
      const rows = new Function(`return ${text.slice(start, end + 1)};`)();
      const label = table === 'worlds' ? ` (${WORLDS[seen.worlds++]})` : '';
      for (const row of rows) {
        out.push({
          where: `${file} ${table}${label} ${row.name}`,
          object: row,
          ignore,
        });
      }
    }
  }
  for (const o of out) o.sources = SOURCES[o.where];
  return out;
}

/** The scenarios the two `worlds` tables of js/world/build.js build, in order. */
const WORLDS = ['Habitable Zone Lab', 'Retrograde Mars'];

/**
 * Every problem the attribution rule finds with the real systems: each
 * object's sources, and any entry in js/data/realSystemSources.js for an
 * object that is not there.
 * @returns {Promise<Array<{where: string, message: string}>>}
 */
export async function realSystemFindings() {
  const systems = await loadRealSystems();
  const found = [];
  for (const s of systems) {
    for (const message of realSystemSourceProblems(
      s.object,
      s.sources,
      s.ignore
    )) {
      found.push({ where: s.where, message });
    }
  }
  const known = new Set(systems.map(s => s.where));
  for (const key of Object.keys(SOURCES)) {
    if (!known.has(key)) {
      found.push({
        where: key,
        message: 'has sources, and there is no such object',
      });
    }
  }
  return found;
}

/** The index of the bracket that closes the one at `open`. */
function matchingBracket(text, open) {
  let depth = 0;
  let quote = null;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = null;
    } else if (ch === "'" || ch === '"' || ch === '`') quote = ch;
    else if (ch === '[' || ch === '{') depth++;
    else if (ch === ']' || ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

export const LESSON_DIR = 'js/data/investigations';
export const LOCALES = ['es'];

const isNonEmptyString = v => typeof v === 'string' && v.trim().length > 0;
const isPlainObject = v => !!v && typeof v === 'object' && !Array.isArray(v);

/** What a parameter with no source, or no measurement behind it, says. */
const NO_SOURCE = new Set([
  'approximate, unsourced',
  'not a measurement: a unit, or a choice the scenario makes',
]);

/**
 * Where a real-system parameter object's `sources` fall short of the
 * attribution rule: every entry has words and a DOI, bibcode or URL (or says
 * the value is approximate and unsourced, or not a measurement), every field it
 * names is on the object, and every parameter on the object is named by one.
 * One entry may leave out `fields`: it then gives every parameter the others
 * do not name, which keeps an object whose values all come from one place to
 * one short entry.
 *
 * @param {object} obj - A planet, a star, a system: an object of real values
 * @param {object[]} sources - Its entry in js/data/realSystemSources.js
 * @param {string[]} [ignore] - Keys that are not parameters (a name, a colour,
 *   a drawn size, a starting phase)
 * @returns {string[]} Problems, empty when it attributes everything
 */
export function realSystemSourceProblems(obj, sources, ignore = []) {
  const problems = [];
  if (!Array.isArray(sources) || !sources.length) {
    return [
      'has no sources: [{text, doi | bibcode | url, fields}] in js/data/realSystemSources.js',
    ];
  }
  const at = p => p.split('.').reduce((o, k) => o?.[k], obj);
  const named = new Map();
  let rest = null;
  for (const [i, src] of sources.entries()) {
    if (!isPlainObject(src) || !isNonEmptyString(src.text)) {
      problems.push(`sources[${i}] has no text`);
      continue;
    }
    const id = [src.doi, src.bibcode, src.url].filter(isNonEmptyString);
    if (NO_SOURCE.has(src.text)) {
      if (id.length)
        problems.push(`sources[${i}] says "${src.text}" and cites something`);
    } else if (!id.length) {
      problems.push(`sources[${i}] "${src.text}" has no doi, bibcode or url`);
    } else {
      if (src.doi && !/^10\.\d{4,9}\/\S+$/.test(src.doi))
        problems.push(`sources[${i}] doi "${src.doi}" is not a DOI`);
      if (src.url && !/^https:\/\//.test(src.url))
        problems.push(`sources[${i}] url "${src.url}" is not https`);
    }
    if (src.fields === undefined) {
      if (rest !== null)
        problems.push(`sources[${i}] is a second entry with no fields`);
      rest = src.text;
      continue;
    }
    if (!Array.isArray(src.fields) || !src.fields.length) {
      problems.push(`sources[${i}] "${src.text}" names no fields`);
      continue;
    }
    for (const f of src.fields) {
      const v = at(f);
      if (v === undefined || isPlainObject(v)) {
        problems.push(
          `sources[${i}] names "${f}", which is not a parameter here`
        );
      } else if (named.has(f)) {
        problems.push(`"${f}" has two sources`);
      } else named.set(f, src.text);
    }
  }
  const leaves = (o, prefix = '') =>
    Object.entries(o).flatMap(([k, v]) => {
      if (prefix === '' && (k === 'sources' || ignore.includes(k))) return [];
      const p = prefix ? `${prefix}.${k}` : k;
      return isPlainObject(v) ? leaves(v, p) : [p];
    });
  for (const p of leaves(obj)) {
    if (!named.has(p) && rest === null) problems.push(`"${p}" has no source`);
  }
  return problems;
}
