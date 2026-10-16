#!/usr/bin/env node
// =============================================================================
// Reference positions for the Sky Lab's ephemeris source (Prompt 106), from JPL Horizons
// -----------------------------------------------------------------------------
// The astrometric geocentric place (light-time corrected, no stellar
// aberration, no light bending is requested of the kernel) of Venus, Mars and
// the Jupiter system barycenter, in the ICRF, at fourteen Terrestrial Time
// instants from 2025 to 2045, written to tests/fixtures/sky/horizons-astrometric.json.
// It is a different calculation from the one the kernel does (Horizons
// integrates its own light-time on DE441 itself; the kernel solves it from
// the 4 to 7 km fits of the mission lab's pack), so the two agreeing is the
// check. No kernel code is read here.
//
//   node tools/sky-horizons-astrometric.mjs        fetch and write
//
// Needs the network (Horizons API 1.2). The fixture records the retrieval date.
// =============================================================================

import { writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(
  HERE,
  '../tests/fixtures/sky/horizons-astrometric.json'
);
const API = 'https://ssd.jpl.nasa.gov/api/horizons.api';
const EPOCHS = [
  2460700.5, 2461234.25, 2461800.0, 2462300.75, 2462900.5, 2463500.0,
  2464100.25, 2464600.5, 2465200.0, 2465800.75, 2466300.5, 2466900.0,
  2467400.25, 2467900.5,
];
const BODIES = { venus: '299', mars: '499', jupiter: '5' };

async function rowsFor(command) {
  const q = new globalThis.URLSearchParams({
    format: 'text',
    COMMAND: `'${command}'`,
    OBJ_DATA: "'NO'",
    MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'OBSERVER'",
    CENTER: "'500@399'",
    TLIST: `'${EPOCHS.join(' ')}'`,
    TIME_TYPE: "'TT'",
    QUANTITIES: "'1,20'",
    ANG_FORMAT: "'DEG'",
    EXTRA_PREC: "'YES'",
    TIME_DIGITS: "'FRACSEC'",
  });
  const res = await fetch(`${API}?${q}`);
  if (!res.ok) throw new Error(`Horizons: HTTP ${res.status}`);
  const text = await res.text();
  const block = text.split('$$SOE')[1]?.split('$$EOE')[0];
  if (!block) throw new Error(`Horizons: no table for ${command}\n${text}`);
  const rows = block
    .trim()
    .split('\n')
    .map(line => {
      const f = line.trim().split(/\s+/);
      // date, time, RA, DEC, delta (au), deldot
      return {
        raDeg: Number(f[2]),
        decDeg: Number(f[3]),
        distanceAu: Number(f[4]),
      };
    });
  if (
    rows.length !== EPOCHS.length ||
    rows.some(r => !Number.isFinite(r.raDeg))
  )
    throw new Error(`Horizons: ${rows.length} rows for ${command}`);
  return rows;
}

const bodies = {};
for (const [id, command] of Object.entries(BODIES))
  bodies[id] = await rowsFor(command);
const out = {
  meta: {
    source:
      'NASA/JPL Horizons API 1.2, DE441, observer table, geocenter (500@399)',
    quantities:
      'astrometric RA and DEC (ICRF, degrees) and delta (au): light-time corrected, no aberration',
    timeScale: 'TT (the epochs are Julian dates, TT)',
    targets: BODIES,
    retrieved: new Date().toISOString().slice(0, 10),
    note: 'jupiter is the Jupiter system barycenter (Horizons target 5), the body the pack holds',
  },
  epochsJdTt: EPOCHS,
  bodies,
};
writeFileSync(OUT, `${JSON.stringify(out, null, 1)}\n`);
console.log(
  `${path.relative(process.cwd(), OUT)}: ${EPOCHS.length} epochs, ${Object.keys(bodies).join(', ')}`
);
