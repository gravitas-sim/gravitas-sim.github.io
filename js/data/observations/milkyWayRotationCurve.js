// =============================================================================
// The Milky Way's rotation curve (Bhattacharjee, Chaudhury and Kundu 2014)
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/build-data-packs.mjs from
// bhattacharjee-2014-table2.csv;
// `npm run packs:check` verifies it offline and `npm run packs:provenance`
// rebuilds it from the pinned raw product and compares byte for byte.
//
// THIS IS AN OBSERVATION. The full record - sources, checksums, every step of
// the transformation and the check it passed - is data-packs/milky-way-rotation-curve.json.
// This module carries only what an instrument shows: PACK, to label and credit
// the data, and SERIES, the numbers, which js/tableObservation.js decodes.
// =============================================================================

/** What the data is and who to credit, as an interface shows it. */
export const PACK = {
  id: 'milky-way-rotation-curve',
  version: '1.0.0',
  title:
    "The Milky Way's rotation curve (Bhattacharjee, Chaudhury and Kundu 2014)",
  object: {
    name: 'the Milky Way',
    identifiers: ['the Galaxy'],
    frame: 'Galactocentric, for three assumed pairs of R0 and V0',
  },
  facility: {
    observatory: 'compilation of published tracer surveys',
    pipeline:
      'Bhattacharjee, Chaudhury & Kundu 2014, ApJ 785, 63, Table 2 (CDS J/ApJ/785/63)',
  },
  dataType: 'rotation-curve',
  origin: 'compilation',
  credit:
    'Bhattacharjee, Chaudhury & Kundu 2014, ApJ 785, 63, through CDS VizieR J/ApJ/785/63',
  license: {
    status: 'no-license-stated',
    statement:
      "The data table of a published paper (Bhattacharjee, Chaudhury & Kundu 2014, ApJ 785, 63, Table 2) as the CDS distributes it (J/ApJ/785/63/table2, read 2026-10-10). The CDS record and the paper's machine-readable table state no licence; the table is reproduced whole, with the paper cited and credited.",
    basis:
      "A published scientific data table, reproduced in full with citation and credit as scientific practice and the CDS's own acknowledgement policy expect, for education; the same basis as the other credited tables (D-SKY-02 is the same class of decision). 151 numbers, none of them the authors' code or text.",
  },
  retrieved: '2026-10-10',
  columns: [
    {
      id: 'r0',
      name: 'Sun distance assumed',
      unit: 'kpc',
      description:
        "the Sun's distance from the Galactic center the curve was computed with (R0)",
    },
    {
      id: 'v0',
      name: 'Sun speed assumed',
      unit: 'km/s',
      description: "the Sun's circular speed the curve was computed with (V0)",
    },
    {
      id: 'r',
      name: 'galactocentric radius',
      unit: 'kpc',
      description: 'distance from the Galactic center (r)',
    },
    {
      id: 'vc',
      name: 'circular speed',
      unit: 'km/s',
      description: 'circular speed (Vc), for the R0 and V0 of its row',
    },
    {
      id: 'vc_err',
      name: 'circular speed error',
      unit: 'km/s',
      uncertaintyOf: 'circular speed',
      description: 'its one-sigma error (e_Vc)',
    },
    {
      id: 'region',
      name: 'region',
      unit: '',
      description:
        'which tracers the point combines: 1 disk tracers (r below 25 kpc), 2 halo tracers (r of 25 kpc or more)',
    },
  ],
  masks: [],
  reductions: [
    "All 151 points of the paper's Table 2, unchanged, in its three sets: R0 = 8.3 kpc with V0 = 244 km/s, R0 = 8.0 with V0 = 200 (the Sofue 2012 set) and R0 = 8.5 with V0 = 220 (the IAU 1985 values). 57 points have r below 25 kpc and 94 beyond. Radii and speeds are rounded to 0.01.",
    'The "region" column is the one attribution the paper\'s table supports. Each disk-region point (r < 25 kpc) is the weighted average, in a radius bin, of the circular speeds from all of the paper\'s disk tracer samples; each halo-region point is the weighted average of its three non-disk samples in a 2 kpc bin. The table does not say which sample dominates a bin, so a point is cited by region, listing every sample that region combines, and no point is claimed for a single paper beyond that.',
    "The curve depends on the Sun's distance and circular speed assumed, R0 and V0; the same data give a different curve for another pair (the paper tabulates three). The pack carries the one the CDS holds, and its R0 and V0 are in the title and the frame.",
    "The paper also derives these speeds under an assumption about the halo tracers' velocity anisotropy (beta = 0 for this set), which is a model assumption inside the outer points.",
  ],
  citations: [
    {
      text: 'Bhattacharjee, Chaudhury & Kundu 2014, ApJ 785, 63 (Rotation curve of the Milky Way out to ~200 kpc)',
      doi: '10.1088/0004-637X/785/1/63',
    },
    {
      text: 'Sofue 2012, PASJ 64, 75 (Grand rotation curve and dark-matter halo in the Milky Way Galaxy), the R0 = 8.0 kpc, V0 = 200 km/s set',
      doi: '10.1093/pasj/64.4.75',
    },
    {
      text: 'Disk tracers: HI regions, tangent points: Westerhout 1976 (Maryland-Bonn survey); Burton & Gordon 1978, A&A 63, 7',
    },
    {
      text: 'Disk tracers: CO clouds, tangent points: Burton & Gordon 1978, A&A 63, 7; Clemens 1985, ApJ 295, 422',
    },
    {
      text: 'Disk tracers: HI regions, tangent points: Fich, Blitz & Stark 1989, ApJ 342, 272',
    },
    {
      text: 'Disk tracers: HII regions: Fich, Blitz & Stark 1989, ApJ 342, 272',
    },
    {
      text: 'Disk tracers: HII regions and reflection nebulae: Brand & Blitz 1993, A&A 275, 67',
    },
    {
      text: 'Disk tracers: Cepheids: Pont, Mayor & Burki 1994, A&A 285, 415',
    },
    {
      text: 'Disk tracers: Planetary nebulae: Maciel & Lago 2005, RMxAA 41, 383; Maciel 1984, A&AS 55, 253; Durand, Acker & Zijlstra 1998, A&AS 132, 13',
    },
    {
      text: 'Halo tracers: Blue horizontal-branch stars, SDSS DR8: Xue et al. 2011, ApJ 738, 79',
    },
    {
      text: 'Halo tracers: K giants, SDSS DR9: Xue et al. 2012 (arXiv:1211.0549)',
    },
    {
      text: 'Halo tracers: Globular clusters (Harris 1996, 2010), field blue horizontal-branch stars (Clewley et al. 2004) and dwarf spheroidals (McConnachie 2012)',
    },
  ],
};

/** The series, encoded as SERIES.encoding says; see js/tableObservation.js. */
export const SERIES = {
  encoding: 'table-columns/1',
  n: 151,
  columns: [
    {
      type: 'int16',
      offset: 8.3,
      step: 0.1,
      data: '/f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgA=',
    },
    {
      type: 'int16',
      offset: 222,
      step: 1,
      data: '6v/q/+r/6v/q/+r/6v/q/+r/6v/q/+r/6v/q/+r/6v/q/+r/6v/q/+r/6v/q/+r/6v/q/+r/6v/q/+r/6v/q/+r/6v/q/+r/6v/q/+r/6v/q/+r/6v/q/+r/6v/q/+r/6v/q/+r/FgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWAP7//v/+//7//v/+//7//v/+//7//v/+//7//v/+//7//v/+//7//v/+//7//v/+//7//v/+//7//v/+//7//v/+//7//v/+//7//v/+//7//v/+//7//v/+//7//v/+//7//v8=',
    },
    {
      type: 'int16',
      offset: 94.86,
      step: 0.01,
      data: 'BdsW2zPblNv321Xcttwc3Xnd5d093qXeDt9l38rfNOCe4B/hrOI15f3lduZF5yHoNOny6bzqhOtS7Ofste117izvAfAo8Zbxu/I79A72dfcP+dz6O/yw/ej9/f7lADICkQTLCfMkBtsY2zTbk9vz21nctdwb3Xzd5t003qPeDN9q39XfO+Cl4DfhOuI45fzleeZ25znoM+nz6bzqgutT7OnsuO1H7gXv/+8r8ZjxvvI79AX2cvcB+aP6HPzZ/Q7//wBKAqcE0An3JAXbFdsx25Xb8ttS3LbcIN2B3efdPN6o3gjfaN/V3yrgluBF4WziOOX95XnmdOc76AHp0um/6oXrU+zp7LftS+477zDwMPGZ8b/yOPQB9nn3B/mt+ir84v0a/xABWQK2BNMJ+iQ=',
    },
    {
      type: 'int16',
      offset: 212.08,
      step: 0.01,
      data: 'wwdtFZkNhf0/+/n+gwVxBGcIPwTD/enzUfu7+wYDpPGS6p0M1v1n+SYG7v5c83jxLPLG9R/51Pf//PT0e/+m7/MBoOn39hT+O/QY/ML8+frnBTjqd9c48sjWTOxF+JPVg+x14ErgLAg0FhsPPwLuAk8E/A0KEP8WxBXUFi4JtA58EzYcOhdfD24qDh089x8KHv8i87Xv4PH991f6d/hyADvzXwDp8sP01eoQ+Hj/yu7P/bL8lfcoBO316dxj5ZLpCPWc17vi0uf93ekFvRTFDwEA4//IADwIfgkiD9UNpw08/xv/HAUzDe8NpwE0H6b07fgVCHz7Fu+c7yT7OvLu+uz2AgBL9Of9A/TD8TXp8Pec/nfvFv3t/Hf52gcL8tzdBeP16sv2Ptb255PjQN8=',
    },
    {
      type: 'int16',
      offset: 50.9,
      step: 0.01,
      data: 'P/Hh7ULwYu6+7Bzt+uzU7B3twOzk7srvZPHU8izzLO0787D11xLd7nfwAfAt7zLvnO6v8Lfxju3n8q/whPVJ8rn4kvNn9aH6Qfe1+SD8ff3nBxMAi/o//7P7uAf8CVP7FwWp9Zf8UvHx7Y3wY+6y7BHtSe3H7Pnsfuxg7GrvXvGx8PTyM/Ie9v31pBPA7qDwsu+37tPutO6z8KLxbu7T8oHwxvUB81T1w/Oh9cP3JfZJ+hf8IPwrCRsGXPqj92EGlAgh/OMAEPay+gHwj+9R8YDutuwk7XXt0ez97HPsXOxa7wTx5/Bq9Orz8fE99lYBqO6M8Avv0O3x7m3x3+6d8e/uEPN48Cb1NvOr8+301vVr+Rv2dvq4+5P8fwqjBLL6xfcQB1oJk/sjA7D1wfs=',
    },
    {
      type: 'int16',
      offset: 2,
      step: 1,
      data: '//////////////////////////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//////////////////////////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP//////////////////////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
    },
  ],
};
