// =============================================================================
// Where the four SDSS spectra came from, and what was done to them
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/build-sdss-spectra.mjs in the
// same run as js/data/spectra/sdssSpectra.js, and verified by the same check.
//
// The audit record for the four observed spectra. No module in the
// application imports this: the browser never needs it, and keeping it out of
// the lazy data chunk is the whole reason it is a separate file. Tests, the
// build tool and anybody checking the work read it here.
//
// RECORDS carries each spectrum's full archive identity and both checksums:
// sourceSha256 is of the CSV the archive served, payloadSha256 of the int16
// flux committed beside this file. The check recomputes the second from the
// data module, so the two files cannot drift apart without failing.
// =============================================================================

/** Where every number came from, and what was done to it. */
export const PROVENANCE = {
  archive: {
    name: 'Sloan Digital Sky Survey',
    release: 'DR18',
    releasePaper:
      'Almeida et al. 2023, ApJS 267, 44 (SDSS-IV/V Data Release 18)',
    instrument:
      'SDSS spectrograph on the 2.5 m Sloan Foundation Telescope, Apache Point Observatory',
    instrumentPaper:
      'Smee et al. 2013, AJ 146, 32; Gunn et al. 2006, AJ 131, 2332',
    surveyPaper: 'Yanny et al. 2009, AJ 137, 4377 (SEGUE)',
    catalogQuery:
      'https://skyserver.sdss.org/dr18/SkyServerWS/SearchTools/SqlSearch',
    spectrumBase:
      'https://dr18.sdss.org/optical/spectrum/view/data/format=csv/spec=lite',
    retrieved: '2026-09-21',
    acknowledgement:
      'Funding for the Sloan Digital Sky Survey has been provided by the Alfred P. Sloan Foundation, the Participating Institutions, the National Science Foundation, and the U.S. Department of Energy Office of Science. SDSS acknowledges support and resources from the Center for High-Performance Computing at the University of Utah. SDSS data are public; see https://www.sdss.org/collaboration/citing-sdss/ for the terms this acknowledgement satisfies.',
    terms: 'https://www.sdss.org/collaboration/citing-sdss/',
  },
  catalogQuery:
    'SELECT s.specObjID, s.plate, s.mjd, s.fiberID, s.class, s.subClass, s.snMedian, s.ra, s.dec, s.z, s.zErr, s.zWarning, s.survey, s.instrument, s.run2d, s.programname, s.elodieTEff, s.elodieLogG, s.elodieFeH, s.elodieSpType FROM SpecObj AS s WHERE s.specObjID IN (3533193009329971200, 3521863916999254016, 3514074151541383168, 3232526053733853184)',
  kind: 'observation',
  what: 'Four observed stellar spectra, one each of spectral type A, G, K and M. These are measurements of four real stars. Nothing here is a model, a fit or a synthetic spectrum, and no quantity in this file was computed by Gravitas.',
  selection: [
    "class = 'STAR' and zWarning = 0.",
    'plate < 3510, the SDSS legacy spectrograph, so all four share one instrument, one wavelength grid, one resolution and one flux calibration.',
    'One spectral class each, at a subtype not adjacent to a class boundary.',
    'Of those, the highest snMedian.',
    "After selection, the class's defining signature checked in the data: the highest-signal M dwarf in the catalog is an M0V whose TiO5 index is 0.887 against 0.940 for the K star, which is not a feature a student can find, and is excluded by the subtype rule above.",
  ],
  classification:
    'Two independent pipeline classifications agree on the letter for all four: the spectro1d subClass and the ELODIE template match elodieSpType. No class here was inferred from a color.',
  grid: {
    convention:
      'SDSS samples every spectrum at log10(lambda / Angstrom) = 1e-4 * i for integer i. All four of these are runs of consecutive i on that one grid, which is why no wavelength array is stored and why trimming to the common range moves no flux value. The build checks the grid rather than assuming it.',
    frame:
      'VACUUM wavelengths, heliocentric. Not shifted to rest: each star carries its own radial velocity, recorded as z, and the largest here is 2.0 Angstroms at H-alpha - a fifth of the narrowest window this bundle measures in, and below the sample spacing after thinning.',
  },
  units: {
    wavelength: 'Angstrom, vacuum',
    flux: '1e-17 erg / s / cm^2 / Angstrom',
  },
  transformations: [
    {
      step: 'trim',
      from: 'four spectra of about 3,800 samples each, over slightly different wavelength ranges',
      to: 'the 3815 grid indices all four cover, of which 3813 are used',
      why: 'so the four share one wavelength axis and can be plotted and compared without resampling any of them',
      parameters: 'common index range, 3-divisible truncation',
      lossless: true,
    },
    {
      step: 'bin',
      from: '3813 samples per spectrum at log step 0.0001',
      to: '1271 samples per spectrum at log step 0.00030000000000000003',
      why: 'size. The archive sampling oversamples the instrument: the SDSS resolving power of about 2000 puts a resolution element at roughly 2.2 samples, so averaging 3 of them costs resolution the spectrograph did not deliver. The cost was measured rather than assumed - see thinning below.',
      parameters:
        'arithmetic mean of 3 adjacent samples; bin center is their mean log wavelength',
      lossless: false,
    },
    {
      step: 'quantise',
      from: 'float flux as the archive printed it, to three decimals',
      to: 'little-endian int16, one integer scale per spectrum',
      why: 'size',
      parameters: 'value = round(flux * scale); flux = value / scale',
      lossless: false,
    },
  ],
  notDone: [
    'No smoothing.',
    'No normalisation, of any kind. The four are stored in the flux units the archive published them in, so the continuum slope that separates an A star from an M star is in the committed data and is not a drawing decision.',
    'No continuum fitting or division.',
    'No resampling or interpolation onto a new wavelength grid.',
    'No shift to rest wavelength.',
    'No masking, sky subtraction or repair. What the pipeline delivered is what is here, including any sky residual it left behind.',
  ],
  size: {
    sourceBytes: 470938,
    sourceSamples: 15334,
    keptSamples: 5084,
    payloadBase64Bytes: 13568,
    thinningFactor: 3.02,
    byteFactor: 34.71,
  },
  thinning: {
    measure:
      'band depth, in percentage points, of the four features the lesson uses, measured on the full-resolution archive spectrum and on the thinned copy. The shift is the difference.',
    worstShiftPP: {
      cak: 0.75,
      hbeta: 0.48,
      nad: 1.32,
      tio: 0.03,
    },
    worstOverall: 1.32,
  },
  caveats: [
    'Four spectra are four examples. This is not a spectral atlas, not a representative sample of anything, and not a survey. Each letter here is represented by exactly one star.',
    'The A star has a pipeline surface gravity of 3.18 and a metallicity of -1.67, so it is very probably not a main-sequence A dwarf; it is an A-type spectrum, which is all this bundle calls it.',
    'The M star is classified M2Vvar by the ELODIE match, and its H-alpha is filled in rather than absorbed - chromospheric emission, which is ordinary in an M dwarf. H-alpha is not one of the four features the lesson uses.',
    'snMedian is the pipeline median signal-to-noise over the whole spectrum. The blue end of every one of these is noisier than the red.',
  ],
};

/** Each spectrum's archive record, keyed as in SPECTRA. */
export const RECORDS = {
  a: {
    letter: 'A',
    specObjID: '3533193009329971200',
    plate: 3138,
    mjd: 54740,
    fiberID: 433,
    observed: '2008-10-01',
    ra: 302.69822,
    dec: -11.853501,
    subClass: 'A0',
    elodieSpType: 'A1V',
    elodieTEff: 7852,
    elodieLogG: 3.18,
    elodieFeH: -1.67,
    snMedian: 108.2831,
    z: -0.0008099225,
    zErr: 0.000003089933,
    survey: 'segue2',
    run2d: '104',
    url: 'https://dr18.sdss.org/optical/spectrum/view/data/format=csv/spec=lite?plateid=3138&mjd=54740&fiberid=433',
    sourceSha256:
      '0b1bfb79ef95e9a3b876b56c50f23486dcbc03b469083ca1d7d616095eec9276',
    sourceBytes: 117130,
    sourceSamples: 3844,
    count: 1271,
    scale: 119,
    quantisation: 0.0201,
    tio5: 0.9751,
    thinning: {
      cak: {
        depth: 3.4,
        shiftPP: 0.07,
      },
      hbeta: {
        depth: 36.63,
        shiftPP: 0.45,
      },
      nad: {
        depth: 3.75,
        shiftPP: 0.06,
      },
      tio: {
        depth: 1.91,
        shiftPP: 0,
      },
    },
    payloadSha256:
      '5e89556eb7f66f3da226b7dd34f4e44b3970cb20fba9559ac35a5fb0ebdee5d0',
  },
  g: {
    letter: 'G',
    specObjID: '3521863916999254016',
    plate: 3128,
    mjd: 54776,
    fiberID: 178,
    observed: '2008-11-06',
    ra: 340.01167,
    dec: 13.415657,
    subClass: 'G2',
    elodieSpType: 'G5',
    elodieTEff: 5625,
    elodieLogG: 4.2,
    elodieFeH: -0.21,
    snMedian: 127.4957,
    z: -0.0002128853,
    zErr: 0.000008202044,
    survey: 'segue2',
    run2d: '104',
    url: 'https://dr18.sdss.org/optical/spectrum/view/data/format=csv/spec=lite?plateid=3128&mjd=54776&fiberid=178',
    sourceSha256:
      '85042d96f02152576ac4ee6ac6af11f88447b2687b22d1920806d1ffafc8087f',
    sourceBytes: 120947,
    sourceSamples: 3828,
    count: 1271,
    scale: 111,
    quantisation: 0.0233,
    tio5: 0.9592,
    thinning: {
      cak: {
        depth: 56.07,
        shiftPP: 0.75,
      },
      hbeta: {
        depth: 14.37,
        shiftPP: 0.28,
      },
      nad: {
        depth: 8.96,
        shiftPP: 0.21,
      },
      tio: {
        depth: 1.8,
        shiftPP: 0.03,
      },
    },
    payloadSha256:
      '0a4219fd342a9006af818fb717feefa79990d15f5e43edf1a6d86f74d4b6a7e0',
  },
  k: {
    letter: 'K',
    specObjID: '3514074151541383168',
    plate: 3121,
    mjd: 54749,
    fiberID: 511,
    observed: '2008-10-10',
    ra: 59.305354,
    dec: 11.870116,
    subClass: 'K3',
    elodieSpType: 'K3V',
    elodieTEff: 4775,
    elodieLogG: 4.409,
    elodieFeH: -0.12,
    snMedian: 115.9964,
    z: 0.00003935811,
    zErr: 0.000006265696,
    survey: 'segue2',
    run2d: '104',
    url: 'https://dr18.sdss.org/optical/spectrum/view/data/format=csv/spec=lite?plateid=3121&mjd=54749&fiberid=511',
    sourceSha256:
      '5372c5a05ad57ee8292c82efa71dd99667b2e3dea212ffb7ce378505a0d06f83',
    sourceBytes: 118163,
    sourceSamples: 3847,
    count: 1271,
    scale: 220,
    quantisation: 0.0353,
    tio5: 0.9452,
    thinning: {
      cak: {
        depth: 52.6,
        shiftPP: 0.47,
      },
      hbeta: {
        depth: 8.96,
        shiftPP: 0.48,
      },
      nad: {
        depth: 23.04,
        shiftPP: 0.38,
      },
      tio: {
        depth: 0.19,
        shiftPP: 0.02,
      },
    },
    payloadSha256:
      '422cc11f2724a4b30aa46b57bbb0617e3ab53d9d5f406531c9ba9811416c8628',
  },
  m: {
    letter: 'M',
    specObjID: '3232526053733853184',
    plate: 2871,
    mjd: 54536,
    fiberID: 245,
    observed: '2008-03-11',
    ra: 166.17079,
    dec: 37.659994,
    subClass: 'M1',
    elodieSpType: 'M2Vvar',
    elodieTEff: 3980,
    elodieLogG: 4.958,
    elodieFeH: -0.04,
    snMedian: 86.63696,
    z: 0.0000618252,
    zErr: 0.000008059405,
    survey: 'segue1',
    run2d: '26',
    url: 'https://dr18.sdss.org/optical/spectrum/view/data/format=csv/spec=lite?plateid=2871&mjd=54536&fiberid=245',
    sourceSha256:
      '67b0112fbb0aa205c67220685e791467cea9a58a76dfb43097c016d09c077d5f',
    sourceBytes: 114698,
    sourceSamples: 3815,
    count: 1271,
    scale: 130,
    quantisation: 0.1567,
    tio5: 0.6569,
    thinning: {
      cak: {
        depth: 21.92,
        shiftPP: 0.31,
      },
      hbeta: {
        depth: 4.79,
        shiftPP: 0.19,
      },
      nad: {
        depth: 52.64,
        shiftPP: 1.32,
      },
      tio: {
        depth: 13.54,
        shiftPP: 0.01,
      },
    },
    payloadSha256:
      '80151824c5f8f838452e5baf93997b6673ee34f06fd107d488142876ce83847b',
  },
};
