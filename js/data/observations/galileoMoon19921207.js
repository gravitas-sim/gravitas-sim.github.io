// =============================================================================
// The Moon from Galileo, 7 December 1992 (three filters, enhanced colour)
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/build-data-packs.mjs
// (tools/data-packs/image-packs.mjs) from PIA00405.jpg;
// `npm run packs:check` verifies it offline and `npm run packs:provenance`
// rebuilds it from the pinned raw product and compares byte for byte. The full
// record, with the rights decision, is data-packs/galileo-moon-19921207.json.
//
// The pixels are not here. They are the sidecar frames/galileo-moon-19921207.json, base64 planes
// that the Observatory fetches when the frame is opened, so that a budget that
// counts JavaScript does not count a picture; SIDECAR records its size and
// checksum, and the Observatory refuses a file that is not that one.
// =============================================================================

/** What the data is and who to credit, as an interface shows it. */
export const PACK = {
  id: 'galileo-moon-19921207',
  version: '1.0.0',
  title:
    'The Moon from Galileo, 7 December 1992 (three filters, enhanced colour)',
  object: {
    name: 'Moon',
  },
  facility: {
    observatory: 'Galileo spacecraft (NASA)',
    instrument: 'Solid State Imaging camera, violet, 756 nm and 968 nm filters',
    pipeline: 'NASA/JPL Photojournal PIA00405, enhanced colour composite',
  },
  dataType: 'image',
  origin: 'observed',
  credit: 'NASA/JPL/USGS',
  license: {
    status: 'public-domain',
    statement:
      'NASA Images and Media Usage Guidelines (https://www.nasa.gov/nasa-brand-center/images-and-media/, read 2026-10-24): NASA content "generally are not subject to copyright in the United States"; acknowledge NASA. The PIA00405 page (science.nasa.gov/photojournal/earths-moon) credits NASA/JPL/USGS, no other restriction.',
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
    width: 496,
    height: 496,
    sidecar: {
      format: 'gravitas.image',
      formatVersion: 1,
      id: 'galileo-moon-19921207',
      title:
        'The Moon from Galileo, 7 December 1992 (three filters, enhanced colour)',
      use: 'display-only',
      width: 496,
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
          note: 'columns 1 to 1984, rows 1 to 1984 from the top left: one column and one row off each edge, so that the picture is a whole number of 4-pixel blocks',
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
      text: 'Galileo image of the Moon, 7 December 1992, PIA00405, NASA/JPL/USGS',
      url: 'https://science.nasa.gov/photojournal/earths-moon/',
    },
  ],
};

/** The sidecar: where the pixels are, and what they must be. */
export const SIDECAR = {
  file: 'frames/galileo-moon-19921207.json',
  bytes: 328187,
  sha256: '0e2a1fe20d1e5435c7bebf1ad43e88b285a8658292bb1a980a9df19dfa7cc4d0',
};
