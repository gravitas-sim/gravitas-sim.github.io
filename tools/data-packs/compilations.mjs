// =============================================================================
// Real systems compiled from papers: HD 209458, the Sun and Jupiter, TRAPPIST-1
// -----------------------------------------------------------------------------
// Two data packs of `origin: compilation`: the parameters in
// js/data/exoplanetSystems.js and js/data/trappist1.js, each value held to the
// published table it was taken from.
//
// These two modules are written by hand, not generated - they are content the
// scenario builders, the instruments and five lessons read - so this tool does
// not write them. It reads them, and for every parameter it:
//
//   - finds the value in a pinned copy of the table it cites (the NASA Exoplanet
//     Archive's Planetary Systems table, SIMBAD, NASA's Jupiter fact sheet, or
//     JPL's mean planetary elements), fetched once into .packs-cache/ and
//     checked against its SHA-256 by tools/data-packs/pinned.mjs;
//   - checks that the module's value is that value, to the digits the module
//     keeps (rounded, never truncated);
//   - checks that js/data/realSystemSources.js names that source for that
//     field of that object (the sources live beside the objects rather than
//     on them, for the bytes; that module says why).
//
// A value no cited table gives is marked "approximate, unsourced" there, for
// that field of that object - never given a source it does not have. A value that is a unit (one solar mass) or a choice the scenario makes
// (the Sun seen from ten parsecs) is said to be one.
//
// The manifest records each value, the table and row it was found in, and
// what the table said, so a reader can check any number without this tool.
// =============================================================================

import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { URLSearchParams, fileURLToPath, pathToFileURL } from 'node:url';

const REPO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
);

/** The tool version that wrote the manifests; packs:check holds them to it. */
export const TRANSFORM_VERSION = '1.0.0';

const NEA = 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync?';
const tap = query => `${NEA}${new URLSearchParams({ query, format: 'csv' })}`;

/** Every raw product, as the manifests pin it; all read 2026-10-01. */
const RAW = {
  hd209458: {
    file: 'nea-ps-hd209458b.csv',
    url: tap(
      "select pl_name,pl_refname,pl_orbper,pl_orbsmax,pl_radj,pl_bmassj,pl_orbeccen,pl_orbincl,pl_trandep,pl_rvamp,st_spectype,st_teff,st_rad,st_mass,st_lum,sy_dist from ps where pl_name='HD 209458 b' order by pl_refname"
    ),
    bytes: 5459,
    sha256: 'd0f4bd6dd970ff579e6166512f11eb12d91961346cc2eee7b480ae7ae75ad12d',
  },
  trappist1: {
    file: 'nea-ps-trappist1.csv',
    url: tap(
      "select pl_name,pl_refname,pl_orbper,pl_orbsmax,pl_rade,pl_bmasse,st_teff,st_rad,st_mass,st_lum from ps where hostname='TRAPPIST-1' order by pl_name,pl_refname"
    ),
    bytes: 8448,
    sha256: '8e066be6da176d2285333312ff13d941b5ed3875a03a1e3df5f37465c9ebd6e7',
  },
  simbad: {
    file: 'simbad-trappist1.csv',
    url: `https://simbad.cds.unistra.fr/simbad/sim-tap/sync?${new URLSearchParams(
      {
        request: 'doQuery',
        lang: 'adql',
        format: 'csv',
        query:
          "SELECT main_id, plx_value, plx_err, plx_bibcode, sp_type, sp_bibcode FROM basic JOIN ident ON oidref=oid WHERE id = 'TRAPPIST-1'",
      }
    )}`,
    bytes: 137,
    sha256: 'd831247c6ea27907d6acaf854e36642bd81de724073497e48ebc5f679a337e86',
  },
  jupiter: {
    file: 'nssdc-jupiterfact.html',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/jupiterfact.html',
    bytes: 11195,
    sha256: '9ac7835ae5387261bc02019a641bbfc8450122ffebebffea5678c3de6c54d0cb',
  },
  elements: {
    file: 'jpl-approx-pos.html',
    url: 'https://ssd.jpl.nasa.gov/planets/approx_pos.html',
    bytes: 29585,
    sha256: '9f7b30ca81cc548a879565bb3f70e6899a38ff5877cb1ff16bb04892f9c4d742',
  },
};

// --- Reading the tables -------------------------------------------------------

/** RFC 4180 CSV, with quoted fields; the first row names the columns. */
function csv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch !== '\r') field += ch;
  }
  if (field || row.length) rows.push([...row, field]);
  const [head, ...body] = rows;
  return body.map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

/** The archive's reference id for a row: the refstr in its pl_refname link. */
const refstr = row => /refstr=([A-Z0-9_]+)/.exec(row.pl_refname || '')?.[1];

/** One row of an archive table, by planet and reference. */
function archiveRow(rows, planet, ref) {
  const hit = rows.filter(r => r.pl_name === planet && refstr(r) === ref);
  if (hit.length !== 1) {
    throw new Error(`${planet}: ${hit.length} rows from ${ref}, expected 1`);
  }
  return hit[0];
}

/** A row of NASA's fact sheet: the first number in the row with this label. */
function factSheet(html, label) {
  const at = html.indexOf(`>${label}<`);
  if (at < 0) throw new Error(`the fact sheet has no row "${label}"`);
  const cell = /<td[^>]*>([^<]+)<\/td>/.exec(html.slice(at));
  return Number(cell[1].replace(/,/g, ''));
}

/** One planet's line of JPL's mean elements (table 1, 1800-2050 AD). */
function elements(html, body) {
  const line = html.split('\n').find(l => l.startsWith(`${body} `));
  if (!line) throw new Error(`JPL's elements have no line for ${body}`);
  const [a, e] = line.slice(body.length).trim().split(/\s+/).map(Number);
  return { a, e };
}

/** How many decimal places a stored number keeps. */
const places = v => (String(v).split('.')[1] || '').length;

/**
 * Whether a stored value is a published one, to the places it keeps: equal,
 * or the published value rounded. A truncated value is not a match.
 */
function agrees(stored, published) {
  if (typeof stored === 'string') {
    return (
      stored.replace(/\s+/g, '').toUpperCase() ===
      String(published).replace(/\s+/g, '').toUpperCase()
    );
  }
  const step = 10 ** -places(stored);
  return Math.abs(stored - published) <= step / 2 + 1e-12 * Math.abs(stored);
}

// --- What each value is, and where it was found -------------------------------

/** The papers and tables the values are cited to. DOIs resolved 2026-10-01. */
const CITE = {
  torres2008: {
    text: 'Torres, Winn & Holman 2008, ApJ 677, 1324',
    doi: '10.1086/529429',
  },
  southworth2010: {
    text: 'Southworth 2010, MNRAS 408, 1689',
    doi: '10.1111/j.1365-2966.2010.17231.x',
  },
  delBurgo2016: {
    text: 'del Burgo & Allende Prieto 2016, MNRAS 463, 1400',
    doi: '10.1093/mnras/stw2005',
  },
  sing2016: {
    text: 'Sing et al. 2016, Nature 529, 59',
    doi: '10.1038/nature16068',
  },
  knutson2007: {
    text: 'Knutson et al. 2007, ApJ 655, 564',
    doi: '10.1086/510111',
  },
  casasayas2020: {
    text: 'Casasayas-Barris et al. 2020, A&A 635, A206',
    doi: '10.1051/0004-6361/201937221',
  },
  stassun2017: {
    text: 'Stassun et al. 2017, AJ 153, 136',
    doi: '10.3847/1538-3881/aa5df3',
  },
  bonomo2017: {
    text: 'Bonomo et al. 2017, A&A 602, A107',
    doi: '10.1051/0004-6361/201629882',
  },
  tic8: {
    text: 'Stassun et al. 2019, AJ 158, 138 (TESS Input Catalog v8)',
    doi: '10.3847/1538-3881/ab3467',
  },
  prsa2016: {
    text: 'Prša et al. 2016, AJ 152, 41 (IAU 2015 Resolution B3, nominal solar values)',
    doi: '10.3847/0004-6256/152/2/41',
  },
  jupiterFacts: {
    text: 'NASA Jupiter Fact Sheet (NSSDCA, updated 2 October 2024)',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/jupiterfact.html',
  },
  agol2021: {
    text: 'Agol et al. 2021, PSJ 2, 1',
    doi: '10.3847/PSJ/abd022',
  },
  gillon2017: {
    text: 'Gillon et al. 2017, Nature 542, 456',
    doi: '10.1038/nature21360',
  },
  ducrot2020: {
    text: 'Ducrot et al. 2020, A&A 640, A112',
    doi: '10.1051/0004-6361/201937392',
  },
  grimm2018: {
    text: 'Grimm et al. 2018, A&A 613, A68',
    doi: '10.1051/0004-6361/201732233',
  },
  gillon2016: {
    text: 'Gillon et al. 2016, Nature 533, 221',
    doi: '10.1038/nature17448',
  },
  gaiaEdr3: {
    text: 'Gaia EDR3 parallax, 80.2123 mas, via SIMBAD (Gaia Collaboration 2021, A&A 649, A1)',
    doi: '10.1051/0004-6361/202039657',
  },
};
/** The archives the tables came from, cited as each asks. */
const ARCHIVES = [
  {
    text: 'NASA Exoplanet Archive, Planetary Systems table (NASA Exoplanet Science Institute 2020)',
    doi: '10.26133/NEA12',
  },
  {
    text: 'Christiansen et al. 2025, PSJ 6, 186 (the NASA Exoplanet Archive)',
    doi: '10.3847/psj/ade3c2',
  },
];
const SIMBAD = {
  text: 'Wenger et al. 2000, A&AS 143, 9 (SIMBAD)',
  doi: '10.1051/aas:2000332',
};
/** The words the module carries for a value no cited table gives. */
export const UNSOURCED = 'approximate, unsourced';
/** And for a value that is a unit or a choice, which nothing measured. */
export const NOT_MEASURED =
  'not a measurement: a unit, or a choice the scenario makes';

const nea = (planet, ref, column, cite, transform) => ({
  table: planet.startsWith('HD') ? 'hd209458' : 'trappist1',
  find: t => {
    const v = archiveRow(t, planet, ref)[column];
    return transform ? transform(Number(v)) : v === '' ? NaN : v;
  },
  where: `${planet}, ${ref}, ${column}`,
  cite,
});
const num = v =>
  typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))
    ? Number(v)
    : v;
const pow10 = x => 10 ** x;

/**
 * Every value of every real-system object in the two modules. `what` is one
 * of: a table and the row and column the value was found in (`find`), a unit
 * or a choice (`is`), or nothing found (`unsourced`, with the nearest
 * published value and why it is not a match).
 */
const SPECS = {
  'js/data/exoplanetSystems.js': {
    HD209458: {
      'star.massSolar': nea(
        'HD 209458 b',
        'SOUTHWORTH_2010',
        'st_mass',
        'southworth2010'
      ),
      'star.radiusSolar': nea(
        'HD 209458 b',
        'TORRES_ET_AL__2008',
        'st_rad',
        'torres2008'
      ),
      'star.luminositySolar': nea(
        'HD 209458 b',
        'DEL_BURGO__AMP__ALLENDE_PRIETO_2016',
        'st_lum',
        'delBurgo2016',
        pow10
      ),
      'star.temperatureK': nea(
        'HD 209458 b',
        'TORRES_ET_AL__2008',
        'st_teff',
        'torres2008'
      ),
      'star.spectralType': nea(
        'HD 209458 b',
        'DEL_BURGO__AMP__ALLENDE_PRIETO_2016',
        'st_spectype',
        'delBurgo2016'
      ),
      'star.distancePc': nea(
        'HD 209458 b',
        'TORRES_ET_AL__2008',
        'sy_dist',
        'tic8'
      ),
      'planet.massJupiter': nea(
        'HD 209458 b',
        'SING_ET_AL__2016',
        'pl_bmassj',
        'sing2016'
      ),
      'planet.radiusJupiter': nea(
        'HD 209458 b',
        'SOUTHWORTH_2010',
        'pl_radj',
        'southworth2010'
      ),
      'planet.periodDays': nea(
        'HD 209458 b',
        'KNUTSON_ET_AL__2007',
        'pl_orbper',
        'knutson2007'
      ),
      'planet.semiMajorAU': nea(
        'HD 209458 b',
        'SOUTHWORTH_2010',
        'pl_orbsmax',
        'southworth2010'
      ),
      'planet.eccentricity': nea(
        'HD 209458 b',
        'CASASAYAS_BARRIS_ET_AL__2020',
        'pl_orbeccen',
        'casasayas2020'
      ),
      'planet.inclinationDeg': nea(
        'HD 209458 b',
        'TORRES_ET_AL__2008',
        'pl_orbincl',
        'torres2008'
      ),
      'measured.transitDepthPercent': nea(
        'HD 209458 b',
        'STASSUN_ET_AL__2017',
        'pl_trandep',
        'stassun2017'
      ),
      'measured.semiAmplitudeMs': nea(
        'HD 209458 b',
        'BONOMO_ET_AL__2017',
        'pl_rvamp',
        'bonomo2017'
      ),
    },
    SUN_JUPITER: {
      'star.massSolar': { is: 'the unit: one solar mass', cite: 'prsa2016' },
      'star.radiusSolar': {
        is: 'the unit: one nominal solar radius',
        cite: 'prsa2016',
      },
      'star.luminositySolar': {
        is: 'the unit: one nominal solar luminosity',
        cite: 'prsa2016',
      },
      'star.temperatureK': {
        is: 'the nominal solar effective temperature, 5772 K',
        cite: 'prsa2016',
      },
      'star.spectralType': {
        unsourced:
          'the conventional classification of the Sun; no table this tool reads gives it',
      },
      'star.distancePc': {
        is: 'a choice: the Sun as an astronomer ten parsecs away would see it',
      },
      'planet.massJupiter': { is: 'the unit: one Jupiter mass' },
      'planet.radiusJupiter': { is: 'the unit: one Jupiter radius' },
      'planet.periodDays': {
        table: 'jupiter',
        find: t => factSheet(t, 'Sidereal orbit period (days)'),
        where: 'Jupiter fact sheet, sidereal orbit period (days)',
        cite: 'jupiterFacts',
      },
      'planet.semiMajorAU': {
        unsourced:
          'JPL’s mean elements give 5.20288700 AU and the fact sheet 5.204: the stored 5.2028 is the first cut short, not rounded',
        nearest: { table: 'elements', find: t => elements(t, 'Jupiter').a },
      },
      'planet.eccentricity': {
        unsourced:
          'the fact sheet gives 0.0487 and JPL’s mean elements 0.04838624; 0.0489 is neither',
        nearest: {
          table: 'jupiter',
          find: t => factSheet(t, 'Orbit eccentricity'),
        },
      },
      'planet.inclinationDeg': { is: 'a choice: the orbit seen edge-on' },
    },
  },
  'js/data/trappist1.js': {
    TRAPPIST1_STAR: {
      massInSuns: nea(
        'TRAPPIST-1 b',
        'AGOL_ET_AL__2021',
        'st_mass',
        'agol2021'
      ),
      radiusInSuns: nea(
        'TRAPPIST-1 b',
        'AGOL_ET_AL__2021',
        'st_rad',
        'agol2021'
      ),
      luminosityInSuns: nea(
        'TRAPPIST-1 b',
        'AGOL_ET_AL__2021',
        'st_lum',
        'agol2021',
        pow10
      ),
      temperatureK: nea(
        'TRAPPIST-1 b',
        'AGOL_ET_AL__2021',
        'st_teff',
        'agol2021'
      ),
      spectralType: {
        paper:
          '“an M8.0 ± 0.5-type dwarf star”, in the text of the paper (read 2026-10-01)',
        cite: 'gillon2016',
      },
      distanceLightYears: {
        table: 'simbad',
        // 1000 / parallax (mas) parsecs, at 3.261564 light years a parsec.
        find: t => (1000 / Number(csv(t)[0].plx_value)) * 3.261563777,
        where: 'SIMBAD, TRAPPIST-1, plx_value (Gaia EDR3), as light years',
        cite: 'gaiaEdr3',
      },
    },
    ...Object.fromEntries(
      [
        ['b', 'AGOL_ET_AL__2021', 'GILLON_ET_AL__2017'],
        ['c', 'AGOL_ET_AL__2021', 'GILLON_ET_AL__2017'],
        ['d', 'AGOL_ET_AL__2021', 'GILLON_ET_AL__2017'],
        ['e', 'DUCROT_ET_AL__2020', 'GILLON_ET_AL__2017'],
        ['f', 'AGOL_ET_AL__2021', 'GILLON_ET_AL__2017'],
        ['g', 'GRIMM_ET_AL__2018', null],
        ['h', 'AGOL_ET_AL__2021', 'AGOL_ET_AL__2021'],
      ].map(([p, aRef, pRef]) => {
        const pl = `TRAPPIST-1 ${p}`;
        const citeOf = ref =>
          ({
            AGOL_ET_AL__2021: 'agol2021',
            GILLON_ET_AL__2017: 'gillon2017',
            DUCROT_ET_AL__2020: 'ducrot2020',
            GRIMM_ET_AL__2018: 'grimm2018',
          })[ref];
        return [
          `TRAPPIST1_PLANETS.${p}`,
          {
            a: nea(pl, aRef, 'pl_orbsmax', citeOf(aRef)),
            mass: nea(pl, 'AGOL_ET_AL__2021', 'pl_bmasse', 'agol2021'),
            radius: nea(pl, 'AGOL_ET_AL__2021', 'pl_rade', 'agol2021'),
            periodDays: pRef
              ? nea(pl, pRef, 'pl_orbper', citeOf(pRef))
              : {
                  unsourced:
                    'Agol et al. 2021 give 12.352446 d, Gillon et al. 2017 12.35294 and Ducrot et al. 2020 12.3535557: the stored 12.3535 is none of them to its places',
                  nearest: {
                    table: 'trappist1',
                    find: t =>
                      Number(
                        archiveRow(csv(t), pl, 'DUCROT_ET_AL__2020').pl_orbper
                      ),
                  },
                },
          },
        ];
      })
    ),
  },
};

/** The object a spec names in a module, and the value at a path on it. */
function objectOf(mod, name) {
  const [head, letter] = name.split('.');
  if (head === 'TRAPPIST1_PLANETS') {
    return mod.TRAPPIST1_PLANETS.find(p => p.name === letter);
  }
  return mod[head];
}
const at = (obj, p) => p.split('.').reduce((o, k) => o?.[k], obj);

/**
 * Find every value in the pinned tables, and say how each agrees.
 * @returns {{values: object[], problems: string[]}}
 */
export function audit(mod, file, tables) {
  const values = [];
  const problems = [];
  for (const [name, fields] of Object.entries(SPECS[file])) {
    const obj = objectOf(mod, name);
    if (!obj) {
      problems.push(`${file}: no object ${name}`);
      continue;
    }
    for (const [field, spec] of Object.entries(fields)) {
      const value = at(obj, field);
      const entry = { object: name, field, value };
      if (spec.table) {
        const t =
          spec.table === 'hd209458' || spec.table === 'trappist1'
            ? csv(tables[spec.table])
            : tables[spec.table];
        const found = num(spec.find(t));
        entry.found =
          typeof found === 'number' ? Number(found.toPrecision(10)) : found;
        entry.where = spec.where;
        entry.cite = spec.cite;
        if (!agrees(value, found)) {
          problems.push(
            `${name}.${field} is ${value}; ${spec.where} gives ${found}`
          );
        }
      } else if (spec.paper) {
        entry.where = spec.paper;
        entry.cite = spec.cite;
      } else if (spec.is) {
        entry.is = spec.is;
        if (spec.cite) entry.cite = spec.cite;
      } else {
        entry.unsourced = spec.unsourced;
        if (spec.nearest) {
          const t = tables[spec.nearest.table];
          entry.nearest = Number(spec.nearest.find(t).toPrecision(10));
          if (agrees(value, entry.nearest)) {
            problems.push(
              `${name}.${field} agrees with ${entry.nearest} after all: cite it`
            );
          }
        }
      }
      values.push(entry);
    }
  }
  return { values, problems };
}

/**
 * The `sources` each object should carry, from the audit: one entry per
 * citation, in the order the values first cite it, naming the fields it
 * supports; then one entry naming the units and choices, which nothing
 * measured; then one "approximate, unsourced" entry naming the rest.
 */
export function sourcesFor(values, name) {
  const mine = values.filter(v => v.object === name);
  const out = [];
  for (const v of mine) {
    if (!v.cite) continue;
    const c = CITE[v.cite];
    let s = out.find(x => x.text === c.text);
    if (!s) out.push((s = { ...c, fields: [] }));
    s.fields.push(v.field);
  }
  const chosen = mine.filter(v => v.is && !v.cite).map(v => v.field);
  if (chosen.length) out.push({ text: NOT_MEASURED, fields: chosen });
  const loose = mine.filter(v => v.unsourced).map(v => v.field);
  if (loose.length) out.push({ text: UNSOURCED, fields: loose });
  return out;
}

/** The key an object's sources are filed under in js/data/realSystemSources.js. */
const sourcesKey = (file, name) => `${file} ${name.replace('.', ' ')}`;

/** Where the sources module and the manifest disagree about an object. */
function sourcesProblems(file, values, SOURCES) {
  const problems = [];
  for (const name of Object.keys(SPECS[file])) {
    const have = SOURCES[sourcesKey(file, name)];
    const want = sourcesFor(values, name);
    if (JSON.stringify(have) !== JSON.stringify(want)) {
      problems.push(
        `${name}'s sources in js/data/realSystemSources.js are ${JSON.stringify(have)}; the tables say ${JSON.stringify(want)}`
      );
    }
  }
  return problems;
}

/** The sources module, from the copy of the repository being checked. */
const sourcesIn = async root =>
  (
    await import(
      pathToFileURL(path.join(root, 'js/data/realSystemSources.js')).href
    )
  ).SOURCES;

/** Kepler's third law in solar units, for one planet: a^3 / P^2 / M. */
const keplerRatio = (aAU, periodDays, massSun) =>
  aAU ** 3 / (periodDays / 365.25) ** 2 / massSun;

// --- The two packs ----------------------------------------------------------------

const COMMON = {
  dataType: 'system-parameters',
  origin: 'compilation',
  license: {
    status: 'attribution-requested',
    statement:
      'Published values, each cited to its paper; the NASA Exoplanet Archive and SIMBAD ask that work using them acknowledge them (NOTICE).',
    basis:
      'A few dozen numbers, each a published measurement cited to the paper that published it, read from the archives’ public tables. No table or text of anyone’s is reproduced, and the archives ask for acknowledgement, not a licence.',
  },
  retrieved: '2026-10-01',
  masks: [],
  reductions: [
    'Each value is kept to the digits the simulation and the lessons use: the published value rounded, never cut short.',
  ],
};

function pack({
  id,
  title,
  object,
  file,
  module,
  exportNames,
  raw,
  cites,
  check,
  validate,
}) {
  return {
    id,
    label: title,
    manifest: `data-packs/${id}.json`,
    capability: null,
    module,
    transformVersion: TRANSFORM_VERSION,
    raw,
    runtime: 'sources',
    handWritten: true,
    async build(bytes, { root = REPO } = {}) {
      const text = readFileSync(path.join(root, module), 'utf8');
      const tables = Object.fromEntries(
        raw.map((r, i) => [
          Object.keys(RAW).find(k => RAW[k].file === r.file),
          Buffer.from(bytes[i]).toString('utf8'),
        ])
      );
      const mod = await import(
        `data:text/javascript;base64,${Buffer.from(text).toString('base64')}`
      );
      const { values, problems } = audit(mod, file, tables);
      problems.push(...sourcesProblems(file, values, await sourcesIn(root)));
      if (problems.length) throw new Error(`${id}: ${problems.join('\n')}`);
      const used = [...new Set(values.map(v => v.cite).filter(Boolean))];
      const meta = {
        id,
        version: '1.0.0',
        title,
        object,
        facility: {
          observatory: 'compiled from the literature',
          pipeline: 'NASA Exoplanet Archive and SIMBAD tables, read 2026-10-01',
        },
        ...COMMON,
        credit: `Compiled from ${used.map(k => CITE[k].text.split(',')[0]).join('; ')}`,
        columns: [
          {
            name: 'value',
            unit: '',
            description:
              'per parameter, in the unit its name gives (massSolar, periodDays, …)',
          },
        ],
      };
      const manifestRest = {
        source: {
          archive: 'NASA Exoplanet Archive; SIMBAD; NASA NSSDCA; JPL SSD',
          urls: raw.map(r => r.url),
          citations: [...used.map(k => CITE[k]), ...cites],
          acknowledgement:
            'This research has made use of the NASA Exoplanet Archive, which is operated by the California Institute of Technology, under contract with the National Aeronautics and Space Administration under the Exoplanet Exploration Program.' +
            (cites.includes(SIMBAD)
              ? ' This research has made use of the SIMBAD database, operated at CDS, Strasbourg, France.'
              : ''),
        },
        raw,
        transformation: {
          script: 'tools/data-packs/compilations.mjs',
          version: TRANSFORM_VERSION,
          options: {},
          steps: [
            'Read each value from the hand-written module.',
            'Find it in the pinned table its source names, at the row and column recorded beside it.',
            'Refuse a value that is not the published one rounded to the places the module keeps, and a source list on the object that does not say which source each value has.',
          ],
        },
        values,
        assumptions: [
          'Each value is the published one, rounded; a value no cited table gives is marked approximate and unsourced in the module, on the object it belongs to.',
          'A unit (one solar mass) or a choice the scenario makes (the Sun seen from ten parsecs) is said to be one, not cited as a measurement.',
        ],
        compatible: { widgets: [], investigations: [] },
        offline: 'core',
      };
      return { meta, manifestRest, render: () => text };
    },
    decode: mod => mod,
    check: async (mod, manifest, { root = REPO } = {}) => [
      ...check(mod),
      ...sourcesProblems(file, manifest.values || [], await sourcesIn(root)),
      ...(manifest.values || [])
        .filter(v => v.value !== at(objectOf(mod, v.object), v.field))
        .map(
          v =>
            `${v.object}.${v.field} is not the ${v.value} the manifest records`
        ),
      ...exportNames
        .filter(n => !(n in mod))
        .map(n => `${module} exports no ${n}`),
    ],
    validate,
  };
}

const EXOPLANETS = pack({
  id: 'exoplanet-systems',
  title:
    'HD 209458 and the Sun and Jupiter: parameters compiled from the literature',
  object: {
    name: 'HD 209458 and its planet; the Sun and Jupiter',
    identifiers: ['HD 209458', 'HD 209458 b'],
  },
  file: 'js/data/exoplanetSystems.js',
  module: 'js/data/exoplanetSystems.js',
  exportNames: ['HD209458', 'SUN_JUPITER', 'EXOPLANET_SYSTEMS'],
  raw: [RAW.hd209458, RAW.jupiter, RAW.elements],
  cites: ARCHIVES,
  check: () => [],
  validate(mod) {
    const ratio = s =>
      Number(
        keplerRatio(
          s.planet.semiMajorAU,
          s.planet.periodDays,
          s.star.massSolar
        ).toFixed(4)
      );
    const result = {
      HD209458: ratio(mod.HD209458),
      SUN_JUPITER: ratio(mod.SUN_JUPITER),
    };
    return {
      check:
        'Kepler’s third law closes on the stored values: a^3 / P^2, in AU and years, is the star’s mass in solar masses to within 2 per cent',
      against: [
        {
          quantity: 'a^3 / P^2 / M',
          value: 1,
          unit: '',
          ref: 'Kepler’s third law, the planet’s mass neglected',
        },
      ],
      result,
      ok: Object.values(result).every(r => Math.abs(r - 1) <= 0.02),
    };
  },
});

const TRAPPIST = pack({
  id: 'trappist-1-system',
  title:
    'TRAPPIST-1: the star and its seven planets, compiled from the literature',
  object: {
    name: 'TRAPPIST-1',
    identifiers: ['TRAPPIST-1', '2MASS J23062928-0502285'],
  },
  file: 'js/data/trappist1.js',
  module: 'js/data/trappist1.js',
  exportNames: ['TRAPPIST1_STAR', 'TRAPPIST1_PLANETS'],
  raw: [RAW.trappist1, RAW.simbad],
  cites: [...ARCHIVES, SIMBAD],
  check: mod =>
    mod.TRAPPIST1_PLANETS.length === 7 ? [] : ['TRAPPIST-1 has seven planets'],
  validate(mod) {
    const M = mod.TRAPPIST1_STAR.massInSuns;
    const result = Object.fromEntries(
      mod.TRAPPIST1_PLANETS.map(p => [
        p.name,
        Number(keplerRatio(p.a, p.periodDays, M).toFixed(4)),
      ])
    );
    return {
      check:
        'Kepler’s third law closes on the stored values for all seven planets: a^3 / P^2, in AU and years, is the star’s mass to within 3 per cent',
      against: [
        {
          quantity: 'a^3 / P^2 / M',
          value: 1,
          unit: '',
          ref: 'Kepler’s third law, the planets’ masses neglected',
        },
      ],
      result,
      ok: Object.values(result).every(r => Math.abs(r - 1) <= 0.03),
    };
  },
});

/** The two compilation packs, as tools/build-data-packs.mjs runs them. */
export const COMPILATIONS = [EXOPLANETS, TRAPPIST];
