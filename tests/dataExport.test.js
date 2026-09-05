import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// The serializers read two live modules. Both are mocked so the tests describe
// what comes out of the writer for a known recording, rather than depending on
// a simulation having been run.
const frames = { list: [] };
const curve = { days: [], flux: [] };
const photometry = { log: [] };

jest.unstable_mockModule('../js/timeline.js', () => ({
  forEachRecordedFrame: visit => {
    for (const f of frames.list) visit(f.t, f.bodies);
  },
  recordedExtent: () => ({
    frames: frames.list.length,
    bodies: frames.list.at(-1)?.bodies.length ?? 0,
    simTime: frames.list.length ? frames.list.at(-1).t - frames.list[0].t : 0,
  }),
}));
jest.unstable_mockModule('../js/lightCurve.js', () => ({
  lightCurveSeries: () => ({ days: [...curve.days], flux: [...curve.flux] }),
  transitAnalysis: () => ({ log: photometry.log.map(t => ({ ...t })) }),
  currentTimeDays: () => 0,
}));

// The radial-velocity exporter reads the panel's current observing run. Mocked
// like the other two live modules, so a test can state what was observed rather
// than having to drive a chart to observe it.
const observing = { run: null };
jest.unstable_mockModule('../js/radialVelocity.js', () => ({
  radialVelocitySurvey: () =>
    observing.run ?? {
      running: false,
      config: {
        cadenceDays: 0.32,
        baselineDays: 3.52,
        sigmaMs: 8,
        seed: 'survey-1',
      },
      target: null,
      inclinationDeg: 90,
      measurements: [],
      planned: 12,
      stats: null,
    },
}));

const {
  trajectoryCsv,
  lightCurveCsv,
  transitTableCsv,
  radialVelocityCsv,
  exportSummary,
  choosePrimaries,
  csvField,
  num,
  csvFilename,
  TRAJECTORY_COLUMNS,
  LIGHT_CURVE_COLUMNS,
  RADIAL_VELOCITY_COLUMNS,
} = await import('../js/dataExport.js');
const { timeUnitSeconds } = await import('../js/units.js');
const { G_SI, SOLAR_MASS_KG, AU_M } = await import('../js/blackHolePhysics.js');

/** One body row in the shape forEachRecordedFrame hands out. */
const body = (o = {}) => ({
  id: 1,
  kind: 'Planet',
  x: 100,
  y: 0,
  vx: 0,
  vy: 10,
  mass: 3,
  radius: 5,
  alive: true,
  ...o,
});

/** A star at the origin, heavy enough to be the primary. */
const star = (o = {}) =>
  body({
    id: 99,
    kind: 'StarObject',
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    mass: 1000,
    ...o,
  });

/** Parse a CSV string back into rows of fields. */
const parse = csv =>
  csv
    .trim()
    .split('\r\n')
    .map(line => line.split(','));

/**
 * The same, as objects keyed by column name. Positional indexing made every
 * assertion break the moment a column was inserted in the middle, which is
 * exactly the change these tests should not care about.
 */
const rowsOf = csv => {
  const [head, ...body] = parse(csv);
  return body.map(cells =>
    Object.fromEntries(head.map((h, i) => [h, cells[i]]))
  );
};

beforeEach(() => {
  frames.list = [];
  curve.days = [];
  curve.flux = [];
  photometry.log = [];
  observing.run = null;
});

describe('CSV field writing', () => {
  test('leaves ordinary values alone', () => {
    expect(csvField('Earth')).toBe('Earth');
    expect(csvField(42)).toBe('42');
    expect(csvField(null)).toBe('');
  });

  test('quotes anything that would break a row', () => {
    expect(csvField('Kepler-16 (AB) b')).toBe('Kepler-16 (AB) b');
    expect(csvField('a,b')).toBe('"a,b"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField('line\nbreak')).toBe('"line\nbreak"');
  });

  test('defuses a name a spreadsheet would run as a formula', () => {
    // Object names come from a text field a student can type into.
    expect(csvField('=HYPERLINK("http://x")')).toBe(
      '"=HYPERLINK(""http://x"")"'
    );
    expect(csvField('@SUM(A1)')).toBe('"@SUM(A1)"');
    // A negative number is not a formula and must stay a number.
    expect(csvField('-3.5')).toBe('-3.5');
  });

  test('numbers keep their precision without gaining noise', () => {
    expect(num(0)).toBe('0');
    expect(num(1 / 3)).toBe('0.33333333');
    expect(num(NaN)).toBe('');
    expect(num(Infinity)).toBe('');
    expect(num(1.5, 3)).toBe('1.5');
  });

  test('filenames are safe and say what they hold', () => {
    expect(csvFilename('trajectories', 'Solar System')).toBe(
      'gravitas-solar-system-trajectories.csv'
    );
    expect(csvFilename('lightcurve', "Kepler's 2nd Law")).toBe(
      'gravitas-kepler-s-2nd-law-lightcurve.csv'
    );
    expect(csvFilename('trajectories')).toBe('gravitas-trajectories.csv');
  });
});

describe('choosing what a body orbits', () => {
  test('picks the star over a passing planet', () => {
    const bodies = [star(), body(), body({ id: 2, x: 110, y: 0, mass: 3 })];
    const primaries = choosePrimaries(bodies);
    expect(primaries.get(1).id).toBe(99);
    expect(primaries.get(2).id).toBe(99);
  });

  test('falls back to any massive body when there is no star', () => {
    // An Earth-Moon scenario has no star in it at all, and blank r and energy
    // columns would make the file useless for exactly the assignment it is for.
    const earth = body({ id: 1, kind: 'Planet', mass: 100, x: 0, y: 0 });
    const moon = body({ id: 2, kind: 'Planet', mass: 1, x: 30, y: 0 });
    const primaries = choosePrimaries([earth, moon]);
    expect(primaries.get(2).id).toBe(1);
  });

  test('never makes a body its own primary', () => {
    const primaries = choosePrimaries([star()]);
    expect(primaries.has(99)).toBe(false);
  });
});

describe('the trajectory file', () => {
  test('writes a header and one row per living body per frame', () => {
    frames.list = [
      { t: 0, bodies: [star(), body()] },
      { t: 1, bodies: [star(), body({ y: 10 })] },
    ];
    const { csv, rows, objects } = trajectoryCsv();
    const table = parse(csv);
    expect(table[0]).toEqual(TRAJECTORY_COLUMNS);
    expect(rows).toBe(4);
    expect(objects).toBe(2);
    expect(table).toHaveLength(5);
  });

  test('leaves out bodies that have been destroyed', () => {
    // A merged body keeps a row in the ring buffer with alive = 0. Writing it
    // would put a frozen point in the middle of a series a student is fitting.
    frames.list = [
      { t: 0, bodies: [star(), body()] },
      { t: 1, bodies: [star(), body({ alive: false })] },
    ];
    expect(trajectoryCsv().rows).toBe(3);
  });

  test('restricts to the requested ids', () => {
    frames.list = [{ t: 0, bodies: [star(), body(), body({ id: 2 })] }];
    const { csv, rows } = trajectoryCsv({ ids: [1] });
    expect(rows).toBe(1);
    expect(rowsOf(csv)[0].object_id).toBe('1');
  });

  test('uses the live names where it has them', () => {
    frames.list = [{ t: 0, bodies: [star(), body()] }];
    const names = new Map([
      [99, 'Sun'],
      [1, 'Earth'],
    ]);
    const earth = rowsOf(trajectoryCsv({ names }).csv).find(
      r => r.object_id === '1'
    );
    expect(earth.name).toBe('Earth');
    expect(earth.primary).toBe('Sun');
  });

  test('falls back to a readable label for a body it has no name for', () => {
    frames.list = [{ t: 0, bodies: [star(), body()] }];
    const row = rowsOf(trajectoryCsv().csv).find(r => r.object_id === '1');
    expect(row.name).toBe('planet 1');
    expect(row.type).toBe('planet');
  });

  test('converts to the units its column names claim', () => {
    frames.list = [{ t: 0, bodies: [star(), body({ x: 100, y: 0 })] }];
    const rows = rowsOf(trajectoryCsv().csv);
    const row = rows.find(r => r.object_id === '1');
    // 1 length unit is 0.01 AU, so 100 units is exactly 1 AU.
    expect(Number(row.x_au)).toBeCloseTo(1, 9);
    expect(Number(row.r_au)).toBeCloseTo(1, 9); // from a star at the origin
    // Sitting on the +x axis from the primary is an angle of zero.
    expect(Number(row.theta_deg)).toBeCloseTo(0, 9);
    // 1000 mass units is one solar mass.
    expect(Number(rows.find(r => r.object_id === '99').mass_msun)).toBeCloseTo(
      1,
      9
    );
  });

  test('the angle is measured round the primary, not the origin', () => {
    // The whole point of shipping this column is that a student measuring a
    // period never has to work out that atan2 must be taken relative to the
    // primary. If it were taken about the origin, an off-center primary would
    // give a period that is quietly wrong.
    const center = star({ x: 500, y: 500 });
    frames.list = [
      {
        t: 0,
        bodies: [
          center,
          body({ id: 1, x: 600, y: 500 }),
          body({ id: 2, x: 500, y: 600 }),
          body({ id: 3, x: 400, y: 500 }),
          body({ id: 4, x: 500, y: 400 }),
        ],
      },
    ];
    const by = Object.fromEntries(
      rowsOf(trajectoryCsv().csv).map(r => [r.object_id, r])
    );
    expect(Number(by['1'].theta_deg)).toBeCloseTo(0, 6);
    expect(Number(by['2'].theta_deg)).toBeCloseTo(90, 6);
    expect(Math.abs(Number(by['3'].theta_deg))).toBeCloseTo(180, 6);
    expect(Number(by['4'].theta_deg)).toBeCloseTo(-90, 6);
    // And every one of them is one AU out, not measured from the origin.
    for (const id of ['1', '2', '3', '4']) {
      expect(Number(by[id].r_au)).toBeCloseTo(1, 6);
    }
  });

  test('a body with no primary gets blanks rather than zeroes', () => {
    // A lone object has nothing to be measured against, and a zero in the r
    // column would be read as "it is at the center" rather than "no answer".
    frames.list = [{ t: 0, bodies: [body({ id: 7 })] }];
    const row = rowsOf(trajectoryCsv().csv)[0];
    expect(row.primary).toBe('');
    expect(row.r_au).toBe('');
    expect(row.theta_deg).toBe('');
    expect(row.E_tot_J).toBe('');
    // The columns it can answer are still filled in.
    expect(Number(row.x_au)).toBeCloseTo(1, 9);
  });

  test('the clock is in days', () => {
    const perUnit = timeUnitSeconds() / 86400;
    frames.list = [
      { t: 0, bodies: [star(), body()] },
      { t: 10, bodies: [star(), body()] },
    ];
    const table = parse(trajectoryCsv().csv);
    expect(Number(table[1][0])).toBeCloseTo(0, 9);
    expect(Number(table.at(-1)[0])).toBeCloseTo(10 * perUnit, 6);
  });

  test('energies are real joules, not scaled simulation units', () => {
    frames.list = [
      { t: 0, bodies: [star(), body({ x: 100, y: 0, vx: 0, vy: 6 })] },
    ];
    const row = rowsOf(trajectoryCsv().csv).find(r => r.object_id === '1');
    const massKg = 3 * (SOLAR_MASS_KG / 1000);
    const rM = AU_M;
    const vMs = (6 * (AU_M / 100)) / timeUnitSeconds();
    // The file carries six significant figures, so these are compared as
    // ratios rather than as absolute differences on numbers near 10^37.
    const near = (got, want) => expect(got / want).toBeCloseTo(1, 5);
    near(Number(row.E_kin_J), 0.5 * massKg * vMs * vMs);
    near(Number(row.E_pot_J), (-G_SI * SOLAR_MASS_KG * massKg) / rM);
    // And the total is the sum, to the digits the file carries.
    near(Number(row.E_tot_J), Number(row.E_kin_J) + Number(row.E_pot_J));
  });

  test('a circular orbit comes out bound, an escaping one unbound', () => {
    // The sign of the total energy is the single most likely thing a student
    // is asked to check, so it had better be right in the file.
    const G = 1;
    const M = 1000;
    const r = 100;
    const vCirc = Math.sqrt((G * M) / r);
    frames.list = [
      {
        t: 0,
        bodies: [
          star(),
          body({ id: 1, x: r, y: 0, vx: 0, vy: vCirc }),
          body({ id: 2, x: r, y: 0, vx: 0, vy: vCirc * 1.6 }),
        ],
      },
    ];
    const rows = rowsOf(trajectoryCsv().csv);
    expect(Number(rows.find(r => r.object_id === '1').E_tot_J)).toBeLessThan(0);
    expect(Number(rows.find(r => r.object_id === '2').E_tot_J)).toBeGreaterThan(
      0
    );
  });

  test('velocity is measured relative to the primary', () => {
    // A whole system drifting across the screen would otherwise look unbound.
    const drift = 40;
    frames.list = [
      {
        t: 0,
        bodies: [
          star({ vx: drift }),
          body({ x: 100, y: 0, vx: drift, vy: 10 }),
        ],
      },
    ];
    const row = parse(trajectoryCsv().csv).find(r => r[3] === '1');
    const still = (() => {
      frames.list = [
        { t: 0, bodies: [star(), body({ x: 100, y: 0, vy: 10 })] },
      ];
      return parse(trajectoryCsv().csv).find(r => r[3] === '1');
    })();
    expect(Number(row[12])).toBeCloseTo(Number(still[12]), 6);
  });

  test('stops at the row cap rather than building an unbounded string', () => {
    frames.list = Array.from({ length: 50 }, (_, i) => ({
      t: i,
      bodies: [star(), body(), body({ id: 2 })],
    }));
    const out = trajectoryCsv({ maxRows: 20 });
    expect(out.truncated).toBe(true);
    expect(out.rows).toBeLessThanOrEqual(21);
  });

  test('an empty recording gives a header and nothing else', () => {
    const { csv, rows } = trajectoryCsv();
    expect(rows).toBe(0);
    expect(csv.trim()).toBe(TRAJECTORY_COLUMNS.join(','));
  });
});

describe('the light curve file', () => {
  test('writes one row per sample', () => {
    curve.days = [0, 0.1, 0.2];
    curve.flux = [1, 0.98, 1];
    const { csv, rows } = lightCurveCsv();
    expect(rows).toBe(3);
    expect(parse(csv)[0]).toEqual(LIGHT_CURVE_COLUMNS);
    expect(parse(csv)[2]).toEqual(['0.1', '0.98', '0', '']);
  });

  test('marks the samples inside a detected transit', () => {
    curve.days = [0, 0.1, 0.2, 0.3, 0.4];
    curve.flux = [1, 1, 0.98, 1, 1];
    photometry.log = [
      { seq: 1, mid: 0.2, duration: 0.1, depth: 0.02, bottom: 0.98 },
    ];
    const table = parse(lightCurveCsv().csv);
    expect(table.map(r => r[2]).slice(1)).toEqual(['0', '0', '1', '0', '0']);
    expect(table[3][3]).toBe('1');
  });

  test('handles several transits without leaking between them', () => {
    curve.days = [0, 1, 2, 3, 4];
    curve.flux = [0.98, 1, 0.98, 1, 0.98];
    photometry.log = [
      { seq: 1, mid: 0, duration: 0.4, depth: 0.02, bottom: 0.98 },
      { seq: 2, mid: 2, duration: 0.4, depth: 0.02, bottom: 0.98 },
      { seq: 3, mid: 4, duration: 0.4, depth: 0.02, bottom: 0.98 },
    ];
    const table = parse(lightCurveCsv().csv);
    expect(table.map(r => r[3]).slice(1)).toEqual(['1', '', '2', '', '3']);
  });

  test('ignores a malformed transit rather than marking everything', () => {
    curve.days = [0, 1];
    curve.flux = [1, 1];
    photometry.log = [{ seq: 1, mid: NaN, duration: NaN }];
    expect(lightCurveCsv().transits).toBe(0);
    expect(
      parse(lightCurveCsv().csv)
        .map(r => r[2])
        .slice(1)
    ).toEqual(['0', '0']);
  });
});

describe('the transit table', () => {
  test('writes one row per measured transit, with depth both ways', () => {
    photometry.log = [
      { seq: 1, mid: 0.88, depth: 0.0183, duration: 0.14, bottom: 0.9817 },
      { seq: 2, mid: 4.41, depth: 0.0183, duration: 0.14, bottom: 0.9817 },
    ];
    const table = parse(transitTableCsv().csv);
    expect(transitTableCsv().rows).toBe(2);
    expect(table[1][0]).toBe('1');
    expect(Number(table[1][3])).toBeCloseTo(1.83, 2);
    // The spacing between mids is the period a student is asked to recover.
    expect(Number(table[2][1]) - Number(table[1][1])).toBeCloseTo(3.53, 2);
  });

  test('is a header alone when nothing has transited', () => {
    expect(transitTableCsv().rows).toBe(0);
  });
});

describe('the summary the dialog describes itself with', () => {
  test('reports what each file would hold', () => {
    frames.list = [
      { t: 0, bodies: [star(), body()] },
      { t: 100, bodies: [star(), body()] },
    ];
    curve.days = [0, 1, 2];
    curve.flux = [1, 1, 1];
    photometry.log = [{ seq: 1, mid: 1, duration: 0.2 }];
    const s = exportSummary();
    expect(s.frames).toBe(2);
    expect(s.bodies).toBe(2);
    expect(s.samples).toBe(3);
    expect(s.transits).toBe(1);
    expect(s.days).toBeGreaterThan(0);
  });

  test('is all zeroes on a fresh page rather than throwing', () => {
    const s = exportSummary();
    expect(s).toMatchObject({ frames: 0, bodies: 0, samples: 0, transits: 0 });
  });
});

describe('the radial-velocity export', () => {
  /** A run in the shape radialVelocitySurvey() hands out. */
  const runOf = (measurements, over = {}) => ({
    running: true,
    config: {
      cadenceDays: 0.32,
      baselineDays: 3.52,
      sigmaMs: 8,
      seed: 'lesson-a',
      seedValue: 1,
    },
    target: { id: 3, name: 'HD 209458' },
    inclinationDeg: 90,
    planned: 12,
    stats: null,
    measurements,
    ...over,
  });

  // CRLF, because the writer produces the line endings Excel expects.
  const rows = csv =>
    csv
      .trim()
      .split(/\r?\n/)
      .map(line => line.split(','));

  test('writes one row per measurement and nothing between', () => {
    // The property that makes the file worth having. A schedule with a
    // fortnight between measurements must export two rows, not fourteen.
    observing.run = runOf([
      { index: 0, day: 0, rv: -80.2, sigma: 8, truth: -84 },
      { index: 1, day: 14, rv: 71.5, sigma: 8, truth: 78 },
    ]);
    const out = radialVelocityCsv();
    expect(out.rows).toBe(2);
    const body = rows(out.csv).slice(1);
    expect(body.map(r => r[0])).toEqual(['0', '14']);
  });

  test('the uncertainty travels with the value it belongs to', () => {
    observing.run = runOf([{ index: 0, day: 1, rv: 12.5, sigma: 3.5 }]);
    const [header, row] = rows(radialVelocityCsv().csv);
    expect(header).toEqual(RADIAL_VELOCITY_COLUMNS);
    expect(row[header.indexOf('rv_ms')]).toBe('12.5');
    expect(row[header.indexOf('rv_err_ms')]).toBe('3.5');
  });

  test('every row carries the target and the observing configuration', () => {
    // Repeated per row rather than put in a header comment: a constant column
    // is read by every tool, and a comment header needs an argument half a
    // class will not pass.
    observing.run = runOf([
      { index: 0, day: 0, rv: 1, sigma: 8 },
      { index: 1, day: 0.32, rv: 2, sigma: 8 },
    ]);
    const [header, ...body] = rows(radialVelocityCsv().csv);
    const col = name => header.indexOf(name);
    for (const row of body) {
      expect(row[col('target')]).toBe('HD 209458');
      expect(row[col('target_id')]).toBe('3');
      expect(row[col('inclination_deg')]).toBe('90');
      expect(row[col('cadence_days')]).toBe('0.32');
      expect(row[col('baseline_days')]).toBe('3.52');
      expect(row[col('sigma_ms')]).toBe('8');
      expect(row[col('noise_seed')]).toBe('lesson-a');
    }
  });

  test('the same run exports the same file twice', () => {
    // Reproducibility has to survive the serializer, not just the generator:
    // an assignment that says "compare your file with your partner's" fails on
    // a writer that reorders or reformats.
    observing.run = runOf([
      { index: 0, day: 0, rv: -80.213456, sigma: 8 },
      { index: 1, day: 0.32, rv: 33.9, sigma: 8 },
    ]);
    expect(radialVelocityCsv().csv).toBe(radialVelocityCsv().csv);
  });

  test('a run with no measurements writes a header and no rows', () => {
    observing.run = runOf([]);
    const out = radialVelocityCsv();
    expect(out.rows).toBe(0);
    expect(rows(out.csv)).toHaveLength(1);
  });

  test('a nameless target leaves the column empty rather than guessing', () => {
    observing.run = runOf([{ index: 0, day: 0, rv: 1, sigma: 2 }], {
      target: null,
    });
    const [header, row] = rows(radialVelocityCsv().csv);
    expect(row[header.indexOf('target')]).toBe('');
    expect(row[header.indexOf('target_id')]).toBe('');
  });

  test('a noiseless run exports zero uncertainties, not blanks', () => {
    observing.run = runOf([{ index: 0, day: 0, rv: -84, sigma: 0 }], {
      config: {
        cadenceDays: 0.32,
        baselineDays: 3.52,
        sigmaMs: 0,
        seed: 'quiet',
      },
    });
    const [header, row] = rows(radialVelocityCsv().csv);
    expect(row[header.indexOf('rv_err_ms')]).toBe('0');
    expect(row[header.indexOf('sigma_ms')]).toBe('0');
  });

  test('the summary reports the run so the dialog can describe it', () => {
    observing.run = runOf([
      { index: 0, day: 0, rv: 1, sigma: 8 },
      { index: 1, day: 0.32, rv: 2, sigma: 8 },
    ]);
    const s = exportSummary();
    expect(s.rvMeasurements).toBe(2);
    expect(s.rvPlanned).toBe(12);
    expect(s.rvRunning).toBe(true);
  });

  test('with no run there is nothing to offer', () => {
    const s = exportSummary();
    expect(s.rvMeasurements).toBe(0);
    expect(s.rvRunning).toBe(false);
    expect(radialVelocityCsv().rows).toBe(0);
  });
});
