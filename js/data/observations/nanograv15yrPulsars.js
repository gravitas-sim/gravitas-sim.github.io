// =============================================================================
// The 68 NANOGrav 15-year pulsars: spin frequencies and dispersion measures
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/build-data-packs.mjs
// (tools/data-packs/radio.mjs) from NANOGrav15yr_PulsarTiming_v2.1.0.tar.gz;
// `npm run packs:check` verifies it offline and `npm run packs:provenance`
// rebuilds it from the pinned raw product and compares byte for byte. The full
// record is data-packs/nanograv-15yr-pulsars.json.
//
// The rows are not here. They are the sidecar radio/nanograv-15yr-pulsars.json, a table-columns/1
// series that the page fetches, so that a budget that counts JavaScript does not
// count a table; SIDECAR records its size and checksum.
// =============================================================================

/** What the data is and who to credit, as an interface shows it. */
export const PACK = {
  id: 'nanograv-15yr-pulsars',
  version: '1.0.0',
  title:
    'The 68 NANOGrav 15-year pulsars: spin frequencies and dispersion measures',
  object: {
    name: 'Sixty-eight millisecond pulsars',
    identifiers: [
      'B1855+09',
      'B1937+21',
      'B1953+29',
      'J0023+0923',
      'J0030+0451',
      'J0340+4130',
      'J0406+3039',
      'J0437-4715',
      'J0509+0856',
      'J0557+1551',
      'J0605+3757',
      'J0610-2100',
      'J0613-0200',
      'J0614-3329',
      'J0636+5128',
      'J0645+5158',
      'J0709+0458',
      'J0740+6620',
      'J0931-1902',
      'J1012+5307',
      'J1012-4235',
      'J1022+1001',
      'J1024-0719',
      'J1125+7819',
      'J1312+0051',
      'J1453+1902',
      'J1455-3330',
      'J1600-3053',
      'J1614-2230',
      'J1630+3734',
      'J1640+2224',
      'J1643-1224',
      'J1705-1903',
      'J1713+0747',
      'J1719-1438',
      'J1730-2304',
      'J1738+0333',
      'J1741+1351',
      'J1744-1134',
      'J1745+1017',
      'J1747-4036',
      'J1751-2857',
      'J1802-2124',
      'J1811-2405',
      'J1832-0836',
      'J1843-1113',
      'J1853+1303',
      'J1903+0327',
      'J1909-3744',
      'J1910+1256',
      'J1911+1347',
      'J1918-0642',
      'J1923+2515',
      'J1944+0907',
      'J1946+3417',
      'J2010-1323',
      'J2017+0603',
      'J2033+1734',
      'J2043+1711',
      'J2124-3358',
      'J2145-0750',
      'J2214+3000',
      'J2229+2643',
      'J2234+0611',
      'J2234+0944',
      'J2302+4442',
      'J2317+1439',
      'J2322+2057',
    ],
    frame:
      'timing models in barycentric dynamical time (par UNITS TDB); spin frequency in Hz and dispersion measure in pc/cm3 by the par-file convention of tempo2 and PINT, which the archive does not restate',
  },
  facility: {
    observatory:
      'Arecibo, the Green Bank Telescope and the Very Large Array (NANOGrav)',
    pipeline:
      'NANOGrav 15-year data set, release v2.1.0 (Zenodo 10.5281/zenodo.16051178): narrowband and wideband timing models, narrowband/par and wideband/par',
  },
  dataType: 'catalog',
  origin: 'compilation',
  credit:
    'The NANOGrav Collaboration, the NANOGrav 15-year Data Set v2.1.0 (CC BY 4.0); Agazie et al. 2023, ApJL 951, L9',
  license: {
    status: 'cc-by-4.0',
    statement:
      "The Zenodo record 10.5281/zenodo.16051178 (version 2.1.0, published 2025-07-17, creator The NANOGrav Collaboration, access open) states the licence CC BY 4.0 in its licence field (the record's JSON, retrieved 2026-11-05). None of the release's README files states a licence, a citation request or a condition (README and narrowband/README.narrowband were read in full, and every README of the release, including wideband, residuals, clock and the correlations', was searched for licence, copyright, citation, acknowledgement, redistribution, permission and condition terms, 2026-11-05). The README names Agazie et al. 2023 and the record's DOI as the data set's description and home. Attribute: The NANOGrav Collaboration, the NANOGrav 15-year Data Set, v2.1.0, doi:10.5281/zenodo.16051178; Agazie et al. 2023, ApJL 951, L9. The table was extracted and reformatted from the timing models, and the values are summarised as the manifest states.",
  },
  retrieved: '2026-11-05',
  columns: [
    {
      id: 'f0',
      name: 'spin frequency',
      unit: 'Hz',
      description:
        "the narrowband timing model's F0, in Hz by the par-file convention (the files state no unit), stored to 1e-6 Hz",
    },
    {
      id: 'dm',
      name: 'dispersion measure',
      unit: 'pc/cm3',
      description:
        "the narrowband model's DM line plus the mean of its DMX epoch offsets, in pc/cm3 by the par-file convention (the files state no unit)",
    },
    {
      id: 'dm_wb',
      name: 'dispersion measure, wideband model',
      unit: 'pc/cm3',
      description:
        'the same quantity from the wideband timing model of the same pulsar: the only measure of how well two fits of one data set agree, since the files carry no DM uncertainty',
    },
    {
      id: 'dmx_std',
      name: 'spread of the DM over epochs',
      unit: 'pc/cm3',
      description:
        "the sample standard deviation of DM + DMX over the narrowband model's epochs: the pulsar's DM varies with time and this is by how much",
    },
    {
      id: 'dmx_n',
      name: 'DMX epochs',
      unit: '',
      description: 'the number of DMX epochs of the narrowband model',
    },
  ],
  masks: [],
  reductions: [
    "68 rows, one per pulsar of the data set, in the order of the pulsar names (code-unit order: B names, then J). The 8 timing models fitted to one telescope's data alone (B1937+21ao, B1937+21gbt, J1600-3053gbt, J1643-1224gbt, J1713+0747ao, J1713+0747gbt, J1903+0327ao, J1909-3744gbt) are second models of pulsars already in the table and are not rows.",
    'The spin frequency is the F0 of the narrowband timing model (every file fits it), stored to 1e-6 Hz. Its uncertainty, the epoch, every other timing parameter, the times of arrival, the templates and the residuals are not kept.',
    "The DM line of a file is a fixed baseline (no file fits it; 6 give it an uncertainty and a zero fit flag) and the fitted per-epoch offsets (DMX_nnnn) carry the variation, so a pulsar's DM is the baseline plus the mean of the offsets (the column dm), with the sample standard deviation of baseline plus offset over the epochs (dmx_std) and the number of epochs (dmx_n). The mean is unweighted and not time-weighted. The same sum from the wideband models is dm_wb. These are not the data-set paper's tabulated DMs, which were not read.",
    'The files carry no DM uncertainty for 62 of the 68 pulsars and a frozen one for the other 6, so the column is not shipped; the difference between dm and dm_wb is the only scatter the pack offers (median 0.00309 pc/cm3; 3 pulsars differ by more than 0.5: J0610-2100 0.626, J1022+1001 0.837, J1024-0719 1.97).',
    'No unit is written in the files. Hz and pc/cm3 are the par-file convention of the two packages the README names (tempo2 and PINT). The one check the data allow: every spin frequency lies between 29.0 and 641.9 Hz, periods of 1.56 to 34.4 ms, consistent with the data set being of millisecond pulsars.',
  ],
  citations: [
    {
      text: 'The NANOGrav Collaboration, The NANOGrav 15-Year Data Set, public release v2.1.0 (2025-07-17), Zenodo',
      doi: '10.5281/zenodo.16051178',
    },
    {
      text: 'The NANOGrav 15-year Data Set, all versions (Zenodo concept record)',
      doi: '10.5281/zenodo.7967584',
    },
    {
      text: 'Agazie et al. 2023, ApJL 951, L9 (The NANOGrav 15-year Data Set: Observations and Timing of 68 Millisecond Pulsars)',
      doi: '10.3847/2041-8213/acda9a',
    },
  ],
};

/** The sidecar: where the rows are, and what they must be. */
export const SIDECAR = {
  file: 'radio/nanograv-15yr-pulsars.json',
  bytes: 1800,
  sha256: '8311864a6e3c94f0afcc08f96570a28e2183f0b9c47a84bf143dbf1bce2f46e1',
};
