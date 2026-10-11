// The cosmology packs (Roadmap II Prompt 91): the loader reads them back as
// the sources say, the stored digits equal the raw files', and the Coma pack
// is the scenario's own numbers.
import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { loadCosmologyData, COSMOLOGY_SIDECARS } from '../js/cosmologyData.js';
import { COMA } from '../js/darkMatterWidgets.js';

const here = p => new URL(`../${p}`, import.meta.url);
const read = p => readFileSync(here(p), 'utf8');
const fetchFile = async url => {
  const text = read(url.replace(/^\//, ''));
  return { ok: true, json: async () => JSON.parse(text) };
};
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);

let data;
beforeAll(async () => {
  data = await loadCosmologyData(fetchFile);
});

describe('Hubble 1929', () => {
  test('24 nebulae, every row the typed raw row, names in order', () => {
    const rows = read('tools/data-packs/cosmology/hubble-1929-table1.tsv')
      .split('\n')
      .filter(l => l && !l.startsWith('#'))
      .slice(1)
      .map(l => l.split('\t'));
    expect(data.hubble.r).toHaveLength(24);
    rows.forEach((f, i) => {
      expect(data.hubble.names[i]).toBe(f[0]);
      expect(data.hubble.r[i]).toBeCloseTo(+f[1], 9);
      expect(data.hubble.v[i]).toBe(+f[2]);
      expect(data.hubble.mt[i]).toBeCloseTo(+f[3], 9);
    });
  });
  test('the pack says it is public domain and cites the paper', () => {
    expect(data.hubble.pack.license.status).toBe('public-domain');
    expect(JSON.stringify(data.hubble.pack)).toMatch(
      /10\.1073\/pnas\.15\.3\.168/
    );
  });
});

describe('DES-SN5YR', () => {
  const raw = read('tools/data-packs/cosmology/DES-SN5YR_HD.csv')
    .trim()
    .split('\n')
    .slice(1)
    .map(l => l.split(','));
  test('1,829 supernovae; mean z and mean modulus equal the raw file to 1e-12', () => {
    expect(data.supernovae.z).toHaveLength(1829);
    expect(raw).toHaveLength(1829);
    expect(
      rel(mean(data.supernovae.z), mean(raw.map(r => +r[3])))
    ).toBeLessThan(1e-12);
    expect(
      rel(mean(data.supernovae.mu), mean(raw.map(r => +r[5])))
    ).toBeLessThan(1e-12);
  });
  test('sorted by redshift; 75 down-weighted rows are kept, not edited away', () => {
    const z = data.supernovae.z;
    for (let i = 1; i < z.length; i++)
      expect(z[i]).toBeGreaterThanOrEqual(z[i - 1]);
    expect(data.supernovae.err.filter(e => e > 1)).toHaveLength(75);
    expect(Math.max(...data.supernovae.err)).toBeCloseTo(450, 0);
  });
  test('the pack states what a lesson must repeat', () => {
    const text = JSON.stringify(data.supernovae.pack);
    expect(text).toMatch(/CC BY 4\.0|cc-by-4\.0/);
    expect(
      JSON.parse(read('data-packs/des-sn5yr-hd.json')).derived.sidecar.file
    ).toBe('cosmology/des-sn5yr-hd.json');
    const manifest = read('data-packs/des-sn5yr-hd.json');
    expect(manifest).toMatch(/Statistical errors only/);
    expect(manifest).toMatch(/H0 = 70/);
    expect(manifest).toMatch(/down-weighted/);
  });
});

describe('the SDSS strip', () => {
  test('2,911 galaxies inside the declared cut, sorted by right ascension', () => {
    const { ra, z } = data.strip;
    expect(ra).toHaveLength(2911);
    expect(Math.min(...ra)).toBeGreaterThanOrEqual(120);
    expect(Math.max(...ra)).toBeLessThanOrEqual(240);
    expect(Math.max(...z)).toBeLessThanOrEqual(0.12);
    expect(Math.min(...z)).toBeGreaterThanOrEqual(0.01);
    for (let i = 1; i < ra.length; i++)
      expect(ra[i]).toBeGreaterThanOrEqual(ra[i - 1]);
  });
  test('the manifest states the flux limit and the cosmology a wedge needs', () => {
    const manifest = read('data-packs/sdss-dr18-redshift-slice.json');
    expect(manifest).toMatch(/flux-limited/);
    expect(manifest).toMatch(/public.domain/);
  });
});

describe('the Coma pack', () => {
  test("is the scenario's own four numbers", () => {
    expect(data.coma.sigma).toBe(COMA.sigmaLos);
    expect(data.coma.radius).toBeCloseTo(COMA.radius, 9);
    expect(data.coma.starMass).toBe(COMA.starMass);
    expect(data.coma.gasMass).toBe(COMA.gasMass);
  });
  test('marks what has no source, and cites only the paper that was checked', () => {
    const manifest = read('data-packs/coma-cluster-quoted.json');
    expect(manifest).toMatch(/unsourced/);
    expect(manifest).toMatch(/10\.1086\/176827/);
  });
});

test('every sidecar is a sidecar the build copies', () => {
  const build = read('build.js');
  for (const url of Object.values(COSMOLOGY_SIDECARS))
    expect(build).toContain(`'${url.replace(/^\//, '')}'`);
});
