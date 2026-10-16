// The raw products of the Sky Lab's star pack: [cache file name, URL].
const BASE = 'https://cdsarc.cds.unistra.fr/ftp/V/50';
export const SKY_RAW = [
  ['cds-v50-bsc5-readme.txt', `${BASE}/ReadMe`],
  ['cds-v50-bsc5-catalog.gz', `${BASE}/catalog.gz`],
  ['cds-v50-bsc5-notes.gz', `${BASE}/notes.gz`],
];

/** The unzipped files, which the builder checks after the gzipped pins match. */
export const CATALOG_SHA256 =
  '69797549cc1605aad7ff94e9325e29a1661f2a253917faaa056d9bf20b809afd';
export const NOTES_SHA256 =
  '4614517ebb689fdf6e200d2ce7308b111c92272b8d5f7e492c86ec36777f6a0c';
