// =============================================================================
// Mars from HiRISE: Cerberus Fossae and a lava flow (ESP_069637_1915)
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/build-data-packs.mjs
// (tools/data-packs/image-packs.mjs) from ESP_069637_1915.jpg;
// `npm run packs:check` verifies it offline and `npm run packs:provenance`
// rebuilds it from the pinned raw product and compares byte for byte. The full
// record, with the rights decision, is data-packs/hirise-cerberus-fossae.json.
//
// The pixels are not here. They are the sidecar frames/hirise-cerberus-fossae.json, base64 planes
// that the Observatory fetches when the frame is opened, so that a budget that
// counts JavaScript does not count a picture; SIDECAR records its size and
// checksum, and the Observatory refuses a file that is not that one.
// =============================================================================

/** What the data is and who to credit, as an interface shows it. */
export const PACK = {
  id: 'hirise-cerberus-fossae',
  version: '1.0.0',
  title: 'Mars from HiRISE: Cerberus Fossae and a lava flow (ESP_069637_1915)',
  object: {
    name: 'Mars: Cerberus Fossae',
  },
  facility: {
    observatory: 'Mars Reconnaissance Orbiter (NASA)',
    instrument: 'HiRISE, black-and-white browse image',
    pipeline:
      'HiRISE image of the day, observation ESP_069637_1915, 4 June 2021',
  },
  dataType: 'image',
  origin: 'observed',
  credit: 'NASA/JPL-Caltech/University of Arizona',
  license: {
    status: 'public-domain',
    statement:
      'HiRISE image usage policy (https://uahirise.org/media/usage.php, read 2026-10-24): "there is no copyright restriction"; the images are "within the public domain"; credit asked "where possible".',
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
    width: 640,
    height: 480,
    sidecar: {
      format: 'gravitas.image',
      formatVersion: 1,
      id: 'hirise-cerberus-fossae',
      title:
        'Mars from HiRISE: Cerberus Fossae and a lava flow (ESP_069637_1915)',
      use: 'display-only',
      width: 640,
      height: 480,
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
          note: 'columns 0 to 2559, rows 0 to 1919 from the top left',
        },
        {
          step: 'resample',
          tool: 'image-packs.mjs',
          version: '1.0.0',
          lossy: true,
          wcsUpdated: false,
          fluxConserving: false,
          note: 'mean of 4 by 4 pixels',
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
      text: 'McEwen et al. 2007, J. Geophys. Res. 112, E05S02 (HiRISE)',
      doi: '10.1029/2005JE002605',
    },
    {
      text: 'HiRISE image of the day, ESP_069637_1915',
      url: 'https://uahirise.org/hipod/ESP_069637_1915',
    },
  ],
};

/** The sidecar: where the pixels are, and what they must be. */
export const SIDECAR = {
  file: 'frames/hirise-cerberus-fossae.json',
  bytes: 409764,
  sha256: 'c75c11f765e394216d972ec79486258732dc298a70ecedfb3045f6683e533aa6',
};
