// =============================================================================
// Photometric bandpasses (Johnson-Cousins UBVRI, SDSS ugriz, TESS, 2MASS JHK) and their AB - Vega zero points
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/build-data-packs.mjs
// (tools/data-packs/radiation.mjs) from sdss-filter-curves.fits, tess-response-function-v2.0.csv, svo-2mass-j.dat, svo-2mass-h.dat, svo-2mass-ks.dat, calspec-alpha-lyr-stis-008.fits, irsa-2mass-absolute-calibration.html, bm12-arxiv-1112.2698v1.pdf; `npm run packs:check` verifies
// it offline and `npm run packs:provenance` rebuilds it from the pinned raw
// products and compares byte for byte. The full record - sources, pins, every
// step, the checks it passed - is data-packs/radiation-bandpasses.json.
//
// The bandpasses, as startNm/stepNm and an integer response; abMinusVega is m_AB - m_Vega (Vega = 0.03 mag in every band).
// The kernel (js/kernels/radiation/) does not import this module; a caller does,
// when it needs the data, and hands it in.
// =============================================================================

/** What the data is and who to credit, as an interface shows it. */
export const PACK = {
  id: 'radiation-bandpasses',
  version: '1.0.0',
  title:
    'Photometric bandpasses (Johnson-Cousins UBVRI, SDSS ugriz, TESS, 2MASS JHK) and their AB - Vega zero points',
  object: {
    name: 'photometric systems',
    identifiers: [
      'U',
      'B',
      'V',
      'R',
      'I',
      'u',
      'g',
      'r',
      'i',
      'z',
      'T',
      'J',
      'H',
      'Ks',
    ],
  },
  facility: {
    observatory:
      'compiled from the literature and the mission and survey archives',
    pipeline: 'tools/data-packs/radiation.mjs 1.0.0',
  },
  dataType: 'model-grid',
  origin: 'compilation',
  credit:
    'Bessell & Murphy 2012; SDSS Collaboration (J. Gunn); NASA TESS (R. Vanderspek, MIT); Cohen, Wheaton & Megeath 2003 (2MASS, IRSA, SVO Filter Profile Service); Vega: Bohlin 2014, CALSPEC (STScI)',
  license: {
    status: 'attribution-requested',
    statement:
      'Response functions are measured, tabulated instrument properties published by their teams or archives (BM12 Table 1; the SDSS, TESS and 2MASS archives), shipped here resampled to a uniform grid with the AB - Vega offsets computed from the public-domain CALSPEC Vega spectrum. The TESS and 2MASS archives and the SDSS publish them for use with acknowledgement; no licence text accompanies the BM12 table or the SVO copy of the 2MASS curves.',
    basis:
      "A numerical table of measured response functions (about 700 values, none of them prose), cited to its paper or archive band by band, with the offsets computed here. If Carl prefers no reproduction of the BM12 table, the UBVRI bands can be rebuilt from SVO's Bessell 1990 curves (record in RADIATION.md).",
  },
  retrieved: '2026-10-09',
  columns: [
    {
      name: 'wavelength',
      unit: 'nm',
      description: 'startNm + i * stepNm',
    },
    {
      name: 'response',
      unit: '',
      description:
        'photon-counting relative response, integer in units of 1/scale of the peak',
    },
    {
      name: 'abMinusVega',
      unit: 'mag',
      description:
        'm_AB - m_Vega of the band, with Vega = 0.03 mag in every band',
    },
  ],
  masks: [],
  reductions: [],
  citations: [
    {
      text: 'Bessell & Murphy 2012, PASP 124, 140, Table 1 (photon-counting UBVRI)',
      doi: '10.1086/664083',
    },
    {
      text: 'Fukugita et al. 1996, AJ 111, 1748 (the SDSS photometric system)',
      doi: '10.1086/117915',
    },
    {
      text: 'SDSS 2001 filter curves of J. Gunn, column respt: QE on the sky through 1.3 airmasses at APO (sdss4.org)',
    },
    {
      text: 'TESS Instrument Response Function v2.0, R. Vanderspek, 2020 (NASA HEASARC)',
    },
    {
      text: 'Ricker et al. 2015, JATIS 1, 014003 (TESS)',
      doi: '10.1117/1.JATIS.1.1.014003',
    },
    {
      text: 'Cohen, Wheaton & Megeath 2003, AJ 126, 1090: relative spectral responses, photon-counting (IRSA)',
      doi: '10.1086/376474',
    },
    {
      text: 'Rodrigo, Solano & Bayo 2012, The SVO Filter Profile Service (the copy of the 2MASS curves)',
    },
    {
      text: 'Bohlin 2014, AJ 147, 127 (the Vega spectrum alpha_lyr_stis_008)',
      doi: '10.1088/0004-6256/147/6/127',
    },
    {
      text: 'Willmer 2018, ApJS 236, 47 (published AB - Vega offsets, the check)',
      doi: '10.3847/1538-4365/aabfdf',
    },
    {
      text: 'Oke & Gunn 1983, ApJ 266, 713 (the AB system)',
      doi: '10.1086/160817',
    },
  ],
};

export const BANDS = [
  {
    id: 'U',
    system: 'Johnson-Cousins',
    name: 'Johnson U',
    source: 'bm12',
    startNm: 300,
    stepNm: 5,
    scale: 1000,
    response: [
      0, 19, 68, 167, 278, 398, 522, 636, 735, 813, 885, 940, 980, 1000, 1000,
      974, 918, 802, 590, 355, 194, 107, 46, 3, 0,
    ],
    abMinusVega: 0.7676,
  },
  {
    id: 'B',
    system: 'Johnson-Cousins',
    name: 'Johnson B',
    source: 'bm12',
    startNm: 360,
    stepNm: 10,
    scale: 1000,
    response: [
      0, 31, 137, 584, 947, 1000, 1000, 957, 895, 802, 682, 577, 474, 369, 278,
      198, 125, 78, 36, 8, 0,
    ],
    abMinusVega: -0.1327,
  },
  {
    id: 'V',
    system: 'Johnson-Cousins',
    name: 'Johnson V',
    source: 'bm12',
    startNm: 470,
    stepNm: 10,
    scale: 1000,
    response: [
      0, 33, 176, 485, 811, 986, 1000, 955, 865, 750, 656, 545, 434, 334, 249,
      180, 124, 75, 41, 22, 14, 11, 8, 6, 4, 2, 1, 0,
    ],
    abMinusVega: -0.0172,
  },
  {
    id: 'R',
    system: 'Johnson-Cousins',
    name: 'Cousins R',
    source: 'bm12',
    startNm: 550,
    stepNm: 10,
    scale: 1000,
    response: [
      0, 247, 780, 942, 998, 1000, 974, 940, 901, 859, 814, 760, 713, 662, 605,
      551, 497, 446, 399, 350, 301, 257, 215, 177, 144, 116, 89, 66, 51, 39, 30,
      21, 14, 8, 6, 3, 0,
    ],
    abMinusVega: 0.1662,
  },
  {
    id: 'I',
    system: 'Johnson-Cousins',
    name: 'Cousins I',
    source: 'bm12',
    startNm: 700,
    stepNm: 10,
    scale: 1000,
    response: [
      0, 90, 356, 658, 865, 960, 1000, 998, 985, 973, 970, 958, 932, 904, 860,
      810, 734, 590, 392, 203, 70, 8, 0,
    ],
    abMinusVega: 0.4073,
  },
  {
    id: 'u',
    system: 'SDSS',
    name: 'SDSS u',
    source: 'sdss',
    startNm: 298,
    stepNm: 2.5,
    scale: 10000,
    response: [
      0, 9, 46, 120, 240, 479, 857, 1484, 2212, 2977, 3733, 4470, 5171, 5843,
      6452, 6968, 7401, 7816, 8138, 8452, 8839, 9226, 9484, 9622, 9705, 9797,
      9908, 10000, 9991, 9806, 9438, 8903, 8175, 7253, 6194, 5060, 3806, 2470,
      1336, 691, 387, 203, 92, 55, 37, 18, 0,
    ],
    abMinusVega: 0.9011,
  },
  {
    id: 'g',
    system: 'SDSS',
    name: 'SDSS g',
    source: 'sdss',
    startNm: 363,
    stepNm: 2.5,
    scale: 10000,
    response: [
      0, 8, 22, 36, 53, 66, 94, 152, 285, 537, 902, 1362, 1899, 2491, 3108,
      3714, 4276, 4766, 5184, 5544, 5857, 6128, 6369, 6582, 6776, 6955, 7124,
      7288, 7448, 7603, 7753, 7894, 8024, 8137, 8245, 8348, 8456, 8572, 8694,
      8813, 8923, 9015, 9089, 9153, 9208, 9261, 9311, 9363, 9419, 9480, 9543,
      9610, 9673, 9740, 9801, 9859, 9911, 9956, 9989, 10000, 9989, 9950, 9911,
      9848, 9554, 8840, 7769, 6474, 5090, 3742, 2521, 1517, 816, 459, 310, 213,
      138, 89, 58, 42, 33, 28, 25, 22, 17, 14, 8, 3, 0,
    ],
    abMinusVega: -0.1255,
  },
  {
    id: 'r',
    system: 'SDSS',
    name: 'SDSS r',
    source: 'sdss',
    startNm: 538,
    stepNm: 2.5,
    scale: 10000,
    response: [
      0, 28, 201, 527, 1011, 1642, 2413, 3306, 4258, 5198, 6053, 6767, 7343,
      7801, 8159, 8437, 8653, 8816, 8942, 9046, 9133, 9211, 9284, 9357, 9428,
      9491, 9540, 9569, 9585, 9597, 9617, 9652, 9699, 9750, 9805, 9856, 9902,
      9943, 9974, 9988, 9994, 9994, 9994, 9998, 10000, 9994, 9972, 9925, 9872,
      9803, 9556, 8995, 8157, 7119, 5949, 4716, 3489, 2344, 1398, 773, 431, 273,
      201, 155, 112, 79, 55, 41, 31, 24, 20, 14, 8, 4, 0,
    ],
    abMinusVega: 0.1186,
  },
  {
    id: 'i',
    system: 'SDSS',
    name: 'SDSS i',
    source: 'sdss',
    startNm: 643,
    stepNm: 2.5,
    scale: 10000,
    response: [
      0, 2, 7, 9, 9, 7, 7, 9, 21, 45, 80, 132, 243, 458, 813, 1325, 1982, 2750,
      3610, 4602, 5689, 6749, 7638, 8275, 8880, 9426, 9832, 10000, 9839, 9315,
      8883, 9031, 9256, 9194, 9043, 9024, 9176, 9147, 9027, 8946, 8880, 8805,
      8696, 8547, 8422, 8396, 8216, 3480, 4952, 6256, 7796, 7692, 7614, 7510,
      7392, 7269, 7149, 7040, 6955, 6901, 6889, 6901, 6915, 6905, 6841, 6709,
      6515, 6241, 5734, 4940, 3990, 3014, 2129, 1425, 893, 515, 276, 161, 113,
      78, 47, 31, 24, 21, 21, 19, 12, 5, 0,
    ],
    abMinusVega: 0.3321,
  },
  {
    id: 'z',
    system: 'SDSS',
    name: 'SDSS z',
    source: 'sdss',
    startNm: 775.5,
    stepNm: 2.5,
    scale: 10000,
    response: [
      0, 13, 13, 13, 25, 25, 38, 64, 89, 140, 216, 343, 508, 724, 1004, 1347,
      1766, 2262, 2821, 3443, 4117, 4854, 5667, 6493, 7166, 7662, 8094, 8475,
      8818, 9111, 9352, 9555, 9720, 9848, 9936, 9987, 10000, 9975, 9911, 9809,
      9695, 9543, 9377, 9187, 8996, 8806, 8564, 8030, 7382, 6900, 6684, 6645,
      6633, 6506, 6302, 6112, 6010, 6048, 6125, 6048, 5680, 4968, 4180, 3596,
      3355, 3443, 3596, 3494, 3227, 3202, 3253, 3126, 3100, 3202, 3278, 3367,
      3482, 3545, 3443, 3202, 2999, 2884, 2821, 2745, 2643, 2490, 2325, 2173,
      2033, 1893, 1753, 1626, 1499, 1372, 1258, 1156, 1055, 953, 864, 775, 699,
      635, 572, 521, 470, 419, 381, 343, 318, 292, 267, 241, 229, 216, 203, 191,
      178, 165, 152, 140, 127, 114, 102, 102, 89, 76, 76, 76, 64, 64, 51, 51,
      38, 38, 25, 25, 13, 13, 0,
    ],
    abMinusVega: 0.4943,
  },
  {
    id: 'T',
    system: 'TESS',
    name: 'TESS T',
    source: 'tess',
    startNm: 532,
    stepNm: 5,
    scale: 10000,
    response: [
      0, 13, 13, 13, 13, 25, 25, 38, 127, 1688, 7325, 7293, 8064, 8701, 8675,
      8854, 8764, 8847, 8815, 8841, 8904, 9013, 9070, 9127, 9197, 9236, 9261,
      9268, 9299, 9439, 9490, 9490, 9618, 9739, 9796, 9847, 9987, 9987, 10000,
      9949, 9847, 9803, 9847, 9841, 9834, 9854, 9860, 9758, 9605, 9599, 9631,
      9713, 9720, 9815, 9911, 9930, 9911, 9828, 9771, 9713, 9694, 9720, 9720,
      9707, 9656, 9656, 9656, 9682, 9707, 9726, 9745, 9745, 9694, 9605, 9452,
      9280, 9083, 8924, 8803, 8707, 8599, 8459, 8280, 8032, 7707, 7344, 6930,
      6452, 5975, 5490, 5083, 4682, 4357, 4013, 3656, 3280, 2892, 2541, 2217,
      1930, 1682, 1452, 1236, 1019, 803, 605, 0,
    ],
    abMinusVega: 0.3281,
  },
  {
    id: 'J',
    system: '2MASS',
    name: '2MASS J',
    source: '2mass',
    startNm: 1062,
    stepNm: 5,
    scale: 10000,
    response: [
      0, 7, 20, 47, 126, 314, 501, 606, 737, 3502, 3904, 2460, 2796, 2703, 5526,
      4709, 4001, 2690, 3117, 2390, 4457, 6346, 7299, 8098, 8117, 8455, 8586,
      7487, 7177, 7222, 7220, 7260, 7480, 7248, 8815, 9547, 9860, 9854, 9539,
      8897, 8025, 7408, 6859, 6631, 6577, 6608, 6661, 7008, 7733, 8337, 7597,
      9449, 8677, 10000, 8916, 5020, 7637, 4621, 735, 166, 168, 22, 256, 5, 1,
      1, 34, 261, 535, 4, 54, 72, 6, 3, 3, 4, 4, 2, 0,
    ],
    abMinusVega: 0.8697,
  },
  {
    id: 'H',
    system: '2MASS',
    name: '2MASS H',
    source: '2mass',
    startNm: 1418,
    stepNm: 5,
    scale: 10000,
    response: [
      0, 1, 2, 3, 5, 8, 13, 19, 24, 31, 48, 65, 81, 210, 455, 872, 1393, 1913,
      2880, 3958, 4963, 5919, 6875, 7474, 8074, 8560, 8954, 9193, 9289, 9302,
      9065, 8709, 8623, 8840, 9037, 9213, 9243, 9107, 9191, 9275, 9229, 9236,
      9257, 9250, 9351, 9445, 9506, 9682, 9888, 9974, 10000, 9948, 9779, 9610,
      9501, 9406, 9312, 9339, 9546, 9754, 9860, 9900, 9929, 9917, 9905, 9848,
      9763, 9385, 9012, 8532, 7798, 7001, 5487, 3495, 3793, 3128, 1547, 1079,
      814, 51, 200, 102, 4, 1, 0, 1, 1, 1, 1, 0, 0, 0,
    ],
    abMinusVega: 1.3438,
  },
  {
    id: 'Ks',
    system: '2MASS',
    name: '2MASS Ks',
    source: '2mass',
    startNm: 1927,
    stepNm: 5,
    scale: 10000,
    response: [
      0, 1, 4, 21, 49, 83, 120, 198, 360, 620, 1011, 1659, 2259, 2025, 2300,
      2600, 2905, 3662, 3638, 4343, 5932, 6896, 7703, 7586, 7363, 6982, 6600,
      6387, 6846, 7306, 7226, 7934, 8151, 8252, 8276, 8460, 8714, 8818, 8708,
      8812, 9066, 9151, 9236, 9299, 9333, 9332, 9295, 9202, 9109, 9166, 9203,
      8755, 8660, 9092, 9525, 9683, 9841, 9933, 9923, 9859, 9787, 9714, 9885,
      9893, 9901, 9791, 9725, 10000, 9772, 9749, 9890, 8965, 9284, 8280, 6622,
      5141, 4276, 3269, 2148, 1530, 1075, 757, 531, 379, 280, 119, 91, 38, 20,
      27, 17, 8, 3, 2, 1, 0,
    ],
    abMinusVega: 1.814,
  },
];

export const SOURCES = {
  bm12: 'Bessell & Murphy 2012, PASP 124, 140, Table 1 (photon-counting UBVRI)',
  sdss: 'SDSS 2001 filter curves of J. Gunn, column respt: QE on the sky through 1.3 airmasses at APO (sdss4.org)',
  tess: 'TESS Instrument Response Function v2.0, R. Vanderspek, 2020 (NASA HEASARC)',
  '2mass':
    'Cohen, Wheaton & Megeath 2003, AJ 126, 1090: relative spectral responses, photon-counting (IRSA)',
};

export const ZERO_POINTS = {
  ab: 'AB: m = -2.5 log10(f_nu / 3631 Jy) (Oke & Gunn 1983)',
  vega: 'Vega = 0.03 mag in every band; spectrum CALSPEC alpha_lyr_stis_008 (Bohlin 2014)',
};
