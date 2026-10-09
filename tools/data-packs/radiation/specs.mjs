// =============================================================================
// What the radiation packs ask of their sources
// -----------------------------------------------------------------------------
// The lines the line-list pack holds, and the NIST query for each. Selection is
// editorial (the lines Roadmap II Prompt 82 names: Balmer, Ca II H and K, Na D,
// Mg b, Fe, He, plus Ca I 4227 as the dwarf-star line); the wavelengths are not:
// each comes from the NIST Atomic Spectra Database row the rule in
// ../radiation.mjs picks inside the window.
// =============================================================================

/**
 * id, species as NIST names it, window centre (Angstrom, air), a display name,
 * the kind the spectra screens group it by, and for hydrogen the lower and upper
 * principal quantum numbers (the row NIST gives for the whole level, not its
 * fine-structure components).
 */
import { URLSearchParams } from 'node:url';

export const LINE_SPECS = [
  {
    id: 'h-alpha',
    sp: 'H I',
    at: 6562.8,
    name: 'H-alpha',
    kind: 'balmer',
    n: [2, 3],
  },
  {
    id: 'h-beta',
    sp: 'H I',
    at: 4861.3,
    name: 'H-beta',
    kind: 'balmer',
    n: [2, 4],
  },
  {
    id: 'h-gamma',
    sp: 'H I',
    at: 4340.5,
    name: 'H-gamma',
    kind: 'balmer',
    n: [2, 5],
  },
  {
    id: 'h-delta',
    sp: 'H I',
    at: 4101.7,
    name: 'H-delta',
    kind: 'balmer',
    n: [2, 6],
  },
  {
    id: 'h-epsilon',
    sp: 'H I',
    at: 3970.1,
    name: 'H-epsilon',
    kind: 'balmer',
    n: [2, 7],
  },
  { id: 'h-8', sp: 'H I', at: 3889.1, name: 'H8', kind: 'balmer', n: [2, 8] },
  { id: 'h-9', sp: 'H I', at: 3835.4, name: 'H9', kind: 'balmer', n: [2, 9] },
  { id: 'ca2-k', sp: 'Ca II', at: 3933.66, name: 'Ca II K', kind: 'metal' },
  { id: 'ca2-h', sp: 'Ca II', at: 3968.47, name: 'Ca II H', kind: 'metal' },
  { id: 'ca1-4227', sp: 'Ca I', at: 4226.73, name: 'Ca I 4227', kind: 'metal' },
  { id: 'na1-d2', sp: 'Na I', at: 5889.95, name: 'Na I D2', kind: 'metal' },
  { id: 'na1-d1', sp: 'Na I', at: 5895.92, name: 'Na I D1', kind: 'metal' },
  { id: 'mg1-b4', sp: 'Mg I', at: 5167.32, name: 'Mg I b4', kind: 'metal' },
  { id: 'mg1-b2', sp: 'Mg I', at: 5172.68, name: 'Mg I b2', kind: 'metal' },
  { id: 'mg1-b1', sp: 'Mg I', at: 5183.6, name: 'Mg I b1', kind: 'metal' },
  { id: 'fe1-4045', sp: 'Fe I', at: 4045.81, name: 'Fe I 4046', kind: 'metal' },
  { id: 'fe1-4383', sp: 'Fe I', at: 4383.55, name: 'Fe I 4384', kind: 'metal' },
  { id: 'fe1-4405', sp: 'Fe I', at: 4404.75, name: 'Fe I 4405', kind: 'metal' },
  { id: 'fe1-5270', sp: 'Fe I', at: 5269.54, name: 'Fe I 5270', kind: 'metal' },
  { id: 'fe1-5328', sp: 'Fe I', at: 5328.04, name: 'Fe I 5328', kind: 'metal' },
  {
    id: 'he1-4472',
    sp: 'He I',
    at: 4471.48,
    name: 'He I 4472',
    kind: 'helium',
  },
  {
    id: 'he1-5876',
    sp: 'He I',
    at: 5875.62,
    name: 'He I 5876',
    kind: 'helium',
  },
  {
    id: 'he2-4686',
    sp: 'He II',
    at: 4685.7,
    name: 'He II 4686',
    kind: 'helium',
  },
];

/** Half-width of the query window, Angstrom. */
export const WINDOW = 0.6;

export const nistUrl = (sp, lo, hi) =>
  'https://physics.nist.gov/cgi-bin/ASD/lines1.pl?' +
  new URLSearchParams({
    spectra: sp,
    low_w: lo,
    upp_w: hi,
    unit: '0',
    submit: 'Retrieve Data',
    format: '3',
    line_out: '0',
    en_unit: '0',
    output: '0',
    bibrefs: '1',
    page_size: '100',
    show_obs_wl: '1',
    show_calc_wl: '1',
    order_out: '0',
    show_av: '2',
    A_out: '0',
    intens_out: 'on',
    allowed_out: '1',
    forbid_out: '1',
    conf_out: 'on',
    term_out: 'on',
    enrg_out: 'on',
    J_out: 'on',
  });

export const nistFile = s => `nist-asd-${s.id}.tsv`;
export const nistQuery = s =>
  nistUrl(s.sp, (s.at - WINDOW).toFixed(2), (s.at + WINDOW).toFixed(2));

/** Raw products that are not NIST queries: file, url. */
export const OTHER_RAW = [
  [
    'sdss-filter-curves.fits',
    'https://www.sdss4.org/wp-content/uploads/2017/04/filter_curves.fits',
  ],
  [
    'tess-response-function-v2.0.csv',
    'https://heasarc.gsfc.nasa.gov/docs/tess/data/tess-response-function-v2.0.csv',
  ],
  [
    'svo-2mass-j.dat',
    'http://svo2.cab.inta-csic.es/theory/fps/getdata.php?format=ascii&id=2MASS/2MASS.J',
  ],
  [
    'svo-2mass-h.dat',
    'http://svo2.cab.inta-csic.es/theory/fps/getdata.php?format=ascii&id=2MASS/2MASS.H',
  ],
  [
    'svo-2mass-ks.dat',
    'http://svo2.cab.inta-csic.es/theory/fps/getdata.php?format=ascii&id=2MASS/2MASS.Ks',
  ],
  [
    'calspec-alpha-lyr-stis-008.fits',
    'https://ssb.stsci.edu/cdbs/calspec/alpha_lyr_stis_008.fits',
  ],
  [
    'irsa-2mass-absolute-calibration.html',
    'https://irsa.ipac.caltech.edu/data/2MASS/docs/releases/allsky/doc/sec6_4a.html',
  ],
  ['bm12-arxiv-1112.2698v1.pdf', 'https://arxiv.org/pdf/1112.2698v1'],
  [
    'ccm89-apj-345-245.pdf',
    'https://articles.adsabs.harvard.edu/pdf/1989ApJ...345..245C',
  ],
  ['torres10-arxiv-1008.3913.pdf', 'https://arxiv.org/pdf/1008.3913'],
];
