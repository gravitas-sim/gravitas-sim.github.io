// =============================================================================
// Four observed stellar spectra from SDSS DR18
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/build-sdss-spectra.mjs; run
// `npm run spectra:data` to regenerate, `npm run spectra:check` to verify the
// committed module offline, and `npm run spectra:provenance` to rebuild it
// from the cached archive CSVs and compare byte for byte.
//
// One star each of spectral type A, G, K and M, observed with the SDSS
// spectrograph in 2008. THESE ARE OBSERVATIONS. Nothing in this file is a
// model, a fit or a synthetic spectrum, and no number in it was computed by
// Gravitas - which is the distinction js/data/stellar/mistTracks.js sits on
// the other side of, and the one the lesson using both has to keep.
//
// Trimmed to the wavelength range all four share and averaged 3 samples to
// one. Nothing else: no smoothing, no normalisation, no continuum fit, no
// shift to rest. PROVENANCE carries the archive, both pipeline
// classifications, the source checksums, every transformation with its
// parameters, and what the averaging cost in each feature the lesson uses.
// =============================================================================

/* eslint-disable */

/** Where every number here came from, and what was done to it. */
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

/**
 * The wavelength axis all four share.
 *
 * Sample i is at 10 ** (logStart + i * logStep) Angstroms, in vacuum. There is
 * no wavelength array because SDSS does not have one.
 */
export const GRID = {
  logStart: 3.5815,
  logStep: 0.0003,
  count: 1271,
  firstA: 3815.048,
  lastA: 9172.759,
};

/** The four spectra, base64 little-endian int16 flux. */
export const SPECTRA = {
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
    data: '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dyieKGYoRyg7KBAoUyhNKJwoaijQJ3gowydPJ8smnCYnJ8wmliclJ2wnPCcZJuMm7iZvJ5EnAyf1JncmVyY7JhcmySa/Jl0mDCYNJismTSbcJdclPybgJScmTyY5JhAmYyYfJkEmGCbPJcgl5CWLJT4lnSWFJQklhyXWJOEkayTcJJ0kfCSdJBIkkyRmJC0kaSQiJCMkVSRwJOgj8iMiJO4jMST8I3ck9yP6I+8j7CPjI9ojASSaI/QjLiQNJOsj5SMsIh4jyCM7ImUimyN0I78iQyJWIkMiXCJaIlMinyLDIgMjaCLFImAiUiJoIuMi4SIjIt4hpSEjItMhZiI7IrEhkSA3H5khfSF1IZ0h3iFWIWwhhiGNIQwiWiE2IVAhLSGNIYIhOyH2IB0hpCCvIKwgzB/4H28g0yDFIE0g0R9UIDAgKyBsIKcfuh9/ILUf+h9aIAwgbCCXH4ofYB/CH5cfbCCuH3YfOh/OH8gfyB/XH7Qfth9cHzQf+R5QH1Ufzx7iHukesx6NHmUeIh7wHb0d+h0KHjUeNB7eHqoe3R5BHlseUh5IHvcdTh1LHZ4dIB6YHh8eDh7PHXUdZR2vHNEddh2ZHsoc7hwyHaAdUh0wHf4c3h1FHcIc6hxcHMMcjxxvHIMdpB2EGwwdCB3THGkc+hveG2cd7hxxGwoc4Rx7HYcdYxxuGZEa4BxBHZsdKB1WHIwYgxgcHPkccB3LHUIdCR2LG2MZ1hfhGokcPh3PHc0dex0jHVQcqRvFF9AVIRrQG/scNB2hHe8dPR02HbMcpRwjHNQa0RjMFDYYKBtgHFUdWR03HSIdex0rHfkcMR3pHNMeXB12HGwbahlgFXQVpxmgGkkb4BwSHT8c8xx2HCUebB0xHP0b0hvnG2sckBvMG6MaLxsiG4gZMRriF3AT1BWSGMAasxo5HJEcExwlGx4cBxz7GggbwhrQGqAaFRulG70bLhv8Gn8bRBucGvoaWhv8GQ==',
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
    data: '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',
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
    data: 'chTCEnIQehCMDVcMHBAxDTQRpA+xDWka6xtdHOEYYBlhEq8NshWnGr8aGxg1E6IewhT4F4ga0RMeFuojEyJzIJYc9x7lGkwfRidJKkYnGSItGEkblBk6EIMLEAuKEZcYBhewG8YgByh2J0UkiSLrFLUU3gxQDfgV3h//J0stXyy8LoYyLTUvM2UtCDYdON0pWzULOHc5szYBOxw6xTbkOyoryCUxNrY9XjgqIuAn2TrjN4kznjDoMe0irjHPMy0rwjI5LjM+XDibP7dELD8FOlY1JS8FNqU7qDmJOt4/+DqHO9U9qjyKOR0tsjV4P+E9qydxON85LDlsNEA5+j+QQhc6IDytMcs0jTgjOqU5SzHMN6E8vjdcLqEt+jgTQEE8FEARNSc9wTt4Jnkb9DcNNsgxZTa1PQdCCjbiLecuiDrTLmc6i0GOOYYkiSiIPRI5rDmDN9IsPjWaNRgsLCYMKgoilyORMjlHkEu2Q54nQT5qSmlN/UFjNYtCOkgVTW868kJESEJKvk73SapH5kJWPCRF7DAYK2A/I0EoRLZL90PlOD81XEZkT007Ok4ATORF+EX1SJBBnEV8Tz9F7VHdT1xMnjo9QPQ/dUyRTJBNDVUQVTZNCkw/V95N9FLzSr1UTlTsW2ha8VnlUwBVg1k/VJJIOEUBS6VJSVdUVY9RnFAKU/VPAloAXDtUQlrRVhVb41vrUTJWL1PAXJRV8lVpVlVV7lYZX6FanlvVWyZd0lvTXapegVz1Vp5ZLlsWUURYTVnPWLdirVsnUPNUTVvOXbhXalgyXJNak1kbX2xXuVHdVi9UqFwvWZpg6GAyYVRWWlhWXMRZPlylXq5g3F7tWIRaQ1zcVWRWvlsmXZBe+VyJWHRYdVpTYVRhGV0IYTlcNV8OYEJjpGLcWdFf/1umXQ9g4ltvXQthrWACXgBaSUj4UtlbI09xVB1Z3Fy5WsZUlUmeX+hkN2H3XMhgclpCYjxUL0miW9pjFGPdWxFVvmCrYlFlKWUMWuZQY2O7XORcFmOUY0xcFE4kWZFdAl21X6JXN1eHUH5bFlAhVj1YKVkfWGpgVFwfVxpNs2C0WIFYfF8LYs5gWFdRWh1axVrJUaxW7V1jXpNh9VYQWi5a1FX3WSNfGmBUWKRTKlbAWZpZCFLRVHlV7FXlVNBdhluRS9c57TNtTKhRyzJdS4ZWBVGaWsxeG047RV5cOl2DYpxmF1LSXe9ZQGjHaZdp1WOxYh5k3mzrWi5OFkYEXKJlKmd7XwZv/m88aTddw2bJb45wIHAcbcJsN1+mT8hm0W1JZD9mRGcWaApvNXOtb4Jn2GHLW89vwG7HaBpvBWhjY8pgBWiHWHth3Wm1be5skGh5aNJjaWRrcnlw1l47cE5lF2/zaVZt32+UbCFkaWpvb6ZsRHHXbQhvGm5dbN5r72tpc25zH2w+bbFv5XC0cstwQHX3cT1yOXHWazxq8mjhcidygG34XVlqBWyoaIdqS3UsdT1kxW9ib65uHXXMcv9wxnCOc+FyLXJra0ZuiHOIc8p1gXUUcS5xzG/AdAl0bm9UbiFp526udGp3dne3dXZ1MnfodtN3ZHYac4R3pHVOdi16V3cFd9Jtd25vdBV1z3Ydek13wnfWeZh273pWegp7+nnpeMd6R3oSd+p1yW8+dOx1PXc9d052yXTab2ZNp1gCWHZxM3U0dw909nSNdoF3DHXkdo15tHY+d551CnaidiV55nd9eR92kHYZdGR1AXmEeWh4znZwcwl2gHW1caR0r3mbezp6RXmYe/97GHnIeUR49naNe/x5zHZCd/l3GnYxeYt0eHLeeJF5RXhxa8hz0XezdGJtwXUzeEd2WHdqah9mHW3Ycex25XgUeC1yRXQ+diR2+HhJd+BwmXKcdLhx9W5XdCVxs24VcxFtJm8Fdnl2i3XieMN12HHMd8Z2AHZucNV273asc89xhXZseFx4f3Gjdnl2G3rDdn10SXNTd6Z4DHiadn949HeRc8l0rnYld/pzF3gPdHt5M3cDeMtyC3k5eEV0B3j2dZd0+3eSd8Z5indKerZzWGnndeh6wHpzeft2pHrjeet4UHpXe6x2QXpbdv9xVmQMdix1HnlQeTJ6BXfWdmd663lDeG15Z3ureYN553bKeEN5Z3nbefB50ni4dgd6DXoedOJ4wnmFeUV3fXeld913+XTbdA13rnf3d8h2TXaxdYB1vXfXd2t123Rod9N2WnW1doh1NnbHddd0mXZudlh2bHXHddd0NHEqdW91D3J+cn51eHTYdf504HOqdrR2O3aUdTN4D3aDdAh1hHUZdgR2TnXjdfZ23HcqeGp5pnnydjt0+3hEdz149nXldR53pnU8dr113XdDeXd3tXu2e5R4HXjndyZ3CXpZeoR4inU7djJ363cHeKl2L3jVdkR2snPadux2vXOjc014nnVIcrN1tXOBcodxZHOkc19043EScYx1inXydVd4enlrdyB1O3YTdnN1SHkZev13uHa9dqdzT3iUeR13w3dUePp5dXaKelt88nqNepN5PndkeD16tHpPe4J6v3W7d854zncZd/N0MHY1daF5kXgiedp1Q3ZteaV4E3Yneht5Tnmxee14j3Mteoh4mXRjenh6RXneeNh7Pntoesh6l3nhetl5InpWfNV3hXkceXR1tnjzdwp43HeNfB962XmTeZ14tHbBcnpuwHJzefp4G3mfdzN3OHEqeNt3eHUUd2h3DnnDeal3CnV4dzt593hWebN44XVUeNp4nXhLeHJ5Oni7eeJ5Znikc214bnj6eH144nmjeZN4hHifd894e3Y2d55343Z6dZF1mXXccwNyNXOkdG54PHbqdy14KHlReBl4u3kGcyd4D3j8eEV59HVQd7x4vneOc7R5W3rweaN3nniAeEl2cnZqdVF4g3fKdcp4aXgHedF3N3e2dKl0t3bzdRV4h3f9cRB2g3C/ckB4tHRwdixyMXVecpN2QnqQeax5IHroeKZ3tHZSdAB2NXZLeJpzQ3VfdupzUXG6dPdw93Qidwd1OXP2dcVz9XJxbvx1E3fLdRx0UHUPdSd1KXBrc5p1Q3bjdUR3M3IKd3J2OXb2cx5jcXWqdI5wgXUIdNJxZFeKYNVxK3PldSR1jHRHdBh2KnXIdNx18HILdIFzu3VBda90+XKMcjRjT10DcSVxt3Jga9lz8XIZdIBxEXM5dAhzzXC2cm5zv3IUdOly8m9VdO9z6XH0crBrvmuMdPdvUXXEc45y8nNeddV0CHHmcitzVnRWdbx0UXUZdXh03HRqcN9vU3Psa6xxDm0acSVuKnLpcmdsdHTGa0FwLWuHbRZxv3LUdAF1o3GpdLFxQXLTc2VvYGzcbRFuJW6yc2ByFnOLcN1xwm+0aidwQnKhbg==',
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
    data: '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skcbSh5M+0yLT6o/gj6LPjpAhz+AQvBHI0X4Rk1JakhNS45LjUwfTaRH6kjnSDxNLk/XTyZRHVMXU5JSzFU1V9pWUlqGWWxaxVoiXH5bZ14CX4Fed19XYnJh6VtuY15lpWQQZNVlZmH7Y0hlBGjGZ29o4GfeZj5n6GaBaDBol2ijZ1FqOmr6ai1pimioaplq5mdEbONrPWzqa2FqmGlzbUttcGzvbUpu+2x2bVJvnm9zb6hvYHBhcLtuF3GUcNFuE2ueaP1rRmw7a+ZsBG0VbGtn22e0ZjhnW2dgZt5ZuFYnXyRhnmI2Y55iNFSZYAhitGEmZK5kmGYKZzdl72DHYKpiZ2LOY+Jk6GL0YfdiPmQ3ZEtneGdqaKtlAmSdY29lSWeQZjBn4Wf2aERoaGnnanBqSGsLa2prG2k1ajJrxmozbYtrg2zgafptIm0HbvlvMnBSb7duZm+Xbf9wl3CJcq1ytm+mciJz1XL5cGB0h3Soc2Nyb3OedO9zzXQidVl12HVwc7t0PnXldTl3PnWMdVN1t3TidrF3WHWLZPxu1F84bf102HT2dkJ0/nVldRF3f3dGd7p19HeVeMZ2iXdOd2N0r3YBd1V0RHUudu5wqXB2c+B1J3X1czt0JHD1dFpwD25NbLhyXnJPdWZxT3NwcX1xmWdacEpyeXBEcEtxnW2ScSZxsnIycQFmOnCob2hsAXDxbxFugltxZP1xP3Oychp0InR7csJzj3P8c4J1KHPKctRy13OidIZ1wXOUc19mamO0ccVwvXHLadNwh3IZc5FxInHhcx5zwXFtdRZ0b3TrdDdzeXSrddF2dnVwd41vh3LJd/hyDXRid5p1ZHZCeO90DXPOckZ0QHWhdEhzPnXzdVV3gHb0dO51cXVXct50k3W9dA10D3PldqV1dXVhc011aXGOcqF253dFeG54bXird/91b3jYdSR4L3KhdrB35njed1R3tneBd7p5nHiRd/d8n3lOdw==',
  },
};

/**
 * The wavelength of one sample, in vacuum Angstroms.
 *
 * @param {number} i - Sample index
 * @returns {number} Angstroms
 */
export function wavelengthAt(i) {
  return 10 ** (GRID.logStart + i * GRID.logStep);
}

/** The whole wavelength axis, made once. */
let axis = null;

/** @returns {Float64Array} Vacuum Angstroms, one per sample */
export function wavelengths() {
  if (axis) return axis;
  axis = new Float64Array(GRID.count);
  for (let i = 0; i < GRID.count; i++) axis[i] = wavelengthAt(i);
  return axis;
}

/** Decoded spectra, made once each. */
const cache = new Map();

/**
 * One spectrum, decoded.
 *
 * The returned object is the shape js/stellar/spectrumIndex.js measures:
 * logStart, step and flux, plus the archive's own facts about the star.
 *
 * @param {string} id - A key of SPECTRA
 * @returns {object} The spectrum
 */
export function decodeSpectrum(id) {
  if (cache.has(id)) return cache.get(id);
  const spec = SPECTRA[id];
  if (!spec) throw new Error('Unknown spectrum: ' + id);
  const binary =
    typeof atob === 'function'
      ? atob(spec.data)
      : Buffer.from(spec.data, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const ints = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.length / 2);
  const flux = new Float64Array(ints.length);
  for (let i = 0; i < ints.length; i++) flux[i] = ints[i] / spec.scale;
  const decoded = {
    id,
    letter: spec.letter,
    logStart: GRID.logStart,
    step: GRID.logStep,
    flux,
    count: spec.count,
    subClass: spec.subClass,
    elodieSpType: spec.elodieSpType,
    elodieTEff: spec.elodieTEff,
    plate: spec.plate,
    mjd: spec.mjd,
    fiberID: spec.fiberID,
    observed: spec.observed,
    url: spec.url,
  };
  cache.set(id, decoded);
  return decoded;
}

/** Every spectrum id, hottest first. */
export const SPECTRUM_IDS = ['a', 'g', 'k', 'm'];
