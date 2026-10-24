// =============================================================================
// HD 209458, TESS sector 56, one 2-minute cadence: calibrated flux and its error
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/build-data-packs.mjs
// (tools/data-packs/image-packs.mjs) from tess2022244194134-s0056-0000000420814525-0243-s_tp.fits.head-0-25919, tess2022244194134-s0056-0000000420814525-0243-s_tp.fits.row-8016, tess2022244194134-s0056-0000000420814525-0243-s_tp.fits.aperture-ext;
// `npm run packs:check` verifies it offline and `npm run packs:provenance`
// rebuilds it from the pinned raw product and compares byte for byte. The full
// record, with the rights decision, is data-packs/tess-hd209458-s56-frame.json.
//
// The pixels are not here. They are the sidecar frames/tess-hd209458-s56-frame.json, base64 planes
// that the Observatory fetches when the frame is opened, so that a budget that
// counts JavaScript does not count a picture; SIDECAR records its size and
// checksum, and the Observatory refuses a file that is not that one.
// =============================================================================

/** What the data is and who to credit, as an interface shows it. */
export const PACK = {
  id: 'tess-hd209458-s56-frame',
  version: '1.0.0',
  title:
    'HD 209458, TESS sector 56, one 2-minute cadence: calibrated flux and its error',
  object: {
    name: 'HD 209458',
    identifiers: ['TIC 420814525'],
    ra: 330.794887332661,
    dec: 18.8843189579296,
    frame: 'ICRS, epoch J2000',
    tessMagnitude: 7.12739992,
  },
  facility: {
    observatory: 'TESS (NASA)',
    instrument: 'camera 1, CCD 2, output D, 2-minute cadence',
    pipeline: 'SPOC spoc-5.0.96-20230729, target pixel file',
  },
  dataType: 'image',
  origin: 'observed',
  credit: 'TESS, sector 56 (NASA; SPOC target pixel file from MAST)',
  license: {
    status: 'public-domain',
    statement:
      'MAST (https://archive.stsci.edu/publishing/data-use, read 2026-10-24): "most data hosted at MAST are in the public domain"; acknowledge the mission and STScI. Read by byte range from STScI’s public dataset on AWS, which mirrors MAST’s TESS products.',
  },
  retrieved: '2026-10-24',
  columns: [
    {
      name: 'flux',
      unit: 'electron/s',
      description:
        'calibrated, background-subtracted flux of each pixel (FLUX), electrons per second',
    },
  ],
  masks: [],
  reductions: [],
  image: {
    width: 11,
    height: 13,
    optimalAperture: [
      47, 48, 49, 50, 51, 57, 58, 59, 60, 61, 62, 69, 70, 71, 72, 73, 80, 81,
      82, 83, 84, 93, 94,
    ],
    sidecar: {
      format: 'gravitas.image',
      formatVersion: 1,
      id: 'tess-hd209458-s56-frame',
      title:
        'HD 209458, TESS sector 56, one 2-minute cadence: calibrated flux and its error',
      use: 'quantitative',
      width: 11,
      height: 13,
      pixels: {
        unit: 'electron/s',
        linearity: {
          status: 'corrected',
          limit: 101010,
          source:
            'SPOC pixel calibration applies a linearity model (TESS Data Release Notes, Sector 10, DR14, section 3.2); the notes give the two models as differing by 1 to 2 percent near saturation, so the limit is the saturation level and a pixel near it is uncertain to that much',
        },
        saturation: {
          level: 101010,
          source:
            'full well about 200,000 electrons a pixel in a 1.98 s frame, varying with the CCD output (Fausnaugh et al. 2021, The TESS Mission Target Selection Procedure, citing Vanderspek et al. 2018, fig. 4.2); the rate form is 200,000 / 1.98 s',
        },
        gain: {
          value: 5.190000057220459,
          unit: 'electron/adu',
          source: 'header',
        },
        readNoise: {
          value: 9.549600601196289,
          unit: 'electron',
          source: 'header',
        },
      },
      planes: {
        data: {
          encoding: 'float32-le',
        },
        variance: {
          encoding: 'float32-le',
          unit: '(electron/s)^2',
          source:
            'FLUX_ERR squared: the SPOC propagated 1-sigma uncertainty of each pixel',
        },
      },
      time: {
        value: 2459836.390293572,
        scale: 'TDB',
        format: 'jd',
        reference: 'mid',
      },
      exposure: {
        seconds: 95.04,
        kind: 'effective',
      },
      scale: {
        arcsecPerPixel: 19.422328,
      },
      wcs: {
        ctype: ['RA---TAN', 'DEC--TAN'],
        crpix: [6.254819344476573, 6.530449812067786],
        crval: [330.7950845247853, 18.884206107937736],
        cdelt: [-0.005395091119529, 0.005395091119528831],
        pc: [
          [0.8513512737077913, -0.46043911374994434],
          [-0.5219565893104138, -0.8923117801814796],
        ],
      },
      calibration: {
        state: 'calibrated',
      },
      history: [
        {
          step: 'calibrate',
          tool: 'TESS SPOC',
          version: 'spoc-5.0.96-20230729',
          lossy: false,
          note: 'calibrated and background-subtracted by the archive',
        },
        {
          step: 'crop',
          tool: 'TESS SPOC',
          version: 'spoc-5.0.96-20230729',
          lossy: false,
          wcsUpdated: true,
          note: 'the 11 by 13 pixels the spacecraft kept',
        },
        {
          step: 'decode',
          tool: 'image-packs.mjs',
          version: '1.0.0',
          lossy: false,
          note: 'row 8016 (cadence 1158430); values unchanged; variance is FLUX_ERR squared',
        },
      ],
      source: {
        kind: 'pack',
      },
    },
  },
  citations: [
    {
      text: 'TESS Target Pixel Files, STScI/MAST',
      doi: '10.17909/t9-nmc8-f686',
    },
    {
      text: 'TESS Data Release Notes: Sector 10, DR14, section 3.2 (linearity)',
      url: 'https://archive.stsci.edu/missions/tess/doc/tess_drn/tess_sector_10_drn14_v02.pdf',
    },
    {
      text: 'Fausnaugh et al. 2021, The TESS Mission Target Selection Procedure (saturation)',
      url: 'https://arxiv.org/abs/2109.02665',
    },
  ],
};

/** The sidecar: where the pixels are, and what they must be. */
export const SIDECAR = {
  file: 'frames/tess-hd209458-s56-frame.json',
  bytes: 1745,
  sha256: '6c33072c982e8db07bb4ac3c55cfbc648dd622c63a02b5a259b35e8677a904fa',
};
