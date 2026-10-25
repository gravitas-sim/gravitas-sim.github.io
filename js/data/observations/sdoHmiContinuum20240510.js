// =============================================================================
// The Sun in HMI continuum light, 10 May 2024 (browse image)
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/build-data-packs.mjs
// (tools/data-packs/image-packs.mjs) from 20240510_120000_1024_HMIIC.jpg;
// `npm run packs:check` verifies it offline and `npm run packs:provenance`
// rebuilds it from the pinned raw product and compares byte for byte. The full
// record, with the rights decision, is data-packs/sdo-hmi-continuum-20240510.json.
//
// The pixels are not here. They are the sidecar frames/sdo-hmi-continuum-20240510.json, base64 planes
// that the Observatory fetches when the frame is opened, so that a budget that
// counts JavaScript does not count a picture; SIDECAR records its size and
// checksum, and the Observatory refuses a file that is not that one.
// =============================================================================

/** What the data is and who to credit, as an interface shows it. */
export const PACK = {
  id: 'sdo-hmi-continuum-20240510',
  version: '1.0.0',
  title: 'The Sun in HMI continuum light, 10 May 2024 (browse image)',
  object: {
    name: 'Sun',
  },
  facility: {
    observatory: 'Solar Dynamics Observatory (NASA)',
    instrument:
      'Helioseismic and Magnetic Imager (HMI), continuum intensitygram',
    pipeline: 'SDO browse product HMIIC, 1,024 pixels, orange colour table',
  },
  dataType: 'image',
  origin: 'observed',
  credit: 'Courtesy of NASA/SDO and the AIA, EVE, and HMI science teams',
  license: {
    status: 'public-domain',
    statement:
      'SDO data rules (https://sdo.gsfc.nasa.gov/data/rules.php, read 2026-10-24): images and movies are "not copyrighted unless explicitly noted"; credit as above. Browse products are "not intended for science analysis or publication" without the PI\'s consent, so the pack is display-only.',
  },
  retrieved: '2026-10-24',
  columns: [
    {
      name: 'display level',
      unit: '',
      description:
        '0 to 255, the gray of the colour picture: for the eye, not a measure of light',
    },
  ],
  masks: [],
  reductions: [],
  image: {
    width: 512,
    height: 496,
    sidecar: {
      format: 'gravitas.image',
      formatVersion: 1,
      id: 'sdo-hmi-continuum-20240510',
      title: 'The Sun in HMI continuum light, 10 May 2024 (browse image)',
      use: 'display-only',
      width: 512,
      height: 496,
      pixels: {
        unit: 'display',
      },
      planes: {
        data: {
          encoding: 'uint8',
        },
      },
      history: [
        {
          step: 'decode',
          tool: 'image-decode.py (Pillow)',
          version: '11.2.1',
          lossy: false,
        },
        {
          step: 'reencode',
          tool: 'image-packs.mjs',
          version: '1.0.0',
          lossy: true,
          note: 'gray of the colour (0.299, 0.587, 0.114): display levels, not light',
        },
        {
          step: 'crop',
          tool: 'image-packs.mjs',
          version: '1.0.0',
          lossy: true,
          wcsUpdated: false,
          note: 'columns 0 to 1023, rows 0 to 991 from the top left: the bottom 32 rows hold a text label ("SDO/HMI Quick-Look Continuum: 20240510_120000") burned into the picture',
        },
        {
          step: 'resample',
          tool: 'image-packs.mjs',
          version: '1.0.0',
          lossy: true,
          wcsUpdated: false,
          fluxConserving: false,
          note: 'mean of 2 by 2 pixels',
        },
        {
          step: 'flip',
          tool: 'image-packs.mjs',
          version: '1.0.0',
          lossy: false,
          wcsUpdated: false,
          note: 'row 1 is the bottom, as in FITS',
        },
      ],
      source: {
        kind: 'pack',
      },
    },
  },
  citations: [
    {
      text: 'Pesnell, Thompson and Chamberlin 2012, Solar Physics 275, 3 (SDO)',
      doi: '10.1007/s11207-011-9841-3',
    },
    {
      text: 'Scherrer et al. 2012, Solar Physics 275, 207 (HMI)',
      doi: '10.1007/s11207-011-9834-2',
    },
    {
      text: 'SDO data rules, NASA/GSFC',
      url: 'https://sdo.gsfc.nasa.gov/data/rules.php',
    },
  ],
};

/** The sidecar: where the pixels are, and what they must be. */
export const SIDECAR = {
  file: 'frames/sdo-hmi-continuum-20240510.json',
  bytes: 338772,
  sha256: '683c9c23d608a9e133032d42253075f3dd40bff31a890482d9e7aa6b39df95be',
};
