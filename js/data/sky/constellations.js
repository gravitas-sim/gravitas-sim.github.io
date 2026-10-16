// =============================================================================
// Constellation figures for the Sky Lab
// -----------------------------------------------------------------------------
// Stick figures, drawn as lines between catalogue stars. Authored for Gravitas
// (CC BY 4.0, like the rest of its content), not copied from any chart or
// planetarium file: each figure is the familiar asterism of its constellation
// written as pairs of stars, and a line is a convention for finding a pattern,
// not a boundary. Stars are named by the Yale Bright Star Catalogue's own
// designation, Bayer letter and constellation ("Alp UMa"), or Flamsteed number
// ("61 Cyg"), so a reader can look each up; tests/skyData.test.js holds every
// name to a star of the pack, to its constellation, and every line to a sane
// length.
// =============================================================================

/** @type {Array<{id: string, en: string, es: string, lines: string[][]}>} */
export const CONSTELLATIONS = [
  {
    id: 'UMa',
    en: 'Ursa Major (the Big Dipper)',
    es: 'Osa Mayor (el Carro)',
    lines: [
      ['Eta UMa', 'Zet UMa'],
      ['Zet UMa', 'Eps UMa'],
      ['Eps UMa', 'Del UMa'],
      ['Del UMa', 'Gam UMa'],
      ['Gam UMa', 'Bet UMa'],
      ['Bet UMa', 'Alp UMa'],
      ['Alp UMa', 'Del UMa'],
    ],
  },
  {
    id: 'UMi',
    en: 'Ursa Minor (the Little Dipper)',
    es: 'Osa Menor',
    lines: [
      ['Alp UMi', 'Del UMi'],
      ['Del UMi', 'Eps UMi'],
      ['Eps UMi', 'Zet UMi'],
      ['Zet UMi', 'Bet UMi'],
      ['Bet UMi', 'Gam UMi'],
      ['Gam UMi', 'Zet UMi'],
    ],
  },
  {
    id: 'Cas',
    en: 'Cassiopeia',
    es: 'Casiopea',
    lines: [
      ['Bet Cas', 'Alp Cas'],
      ['Alp Cas', 'Gam Cas'],
      ['Gam Cas', 'Del Cas'],
      ['Del Cas', 'Eps Cas'],
    ],
  },
  {
    id: 'Cep',
    en: 'Cepheus',
    es: 'Cefeo',
    lines: [
      ['Alp Cep', 'Bet Cep'],
      ['Bet Cep', 'Gam Cep'],
      ['Gam Cep', 'Iot Cep'],
      ['Iot Cep', 'Zet Cep'],
      ['Zet Cep', 'Alp Cep'],
    ],
  },
  {
    id: 'Ori',
    en: 'Orion',
    es: 'Orión',
    lines: [
      ['Alp Ori', 'Lam Ori'],
      ['Lam Ori', 'Gam Ori'],
      ['Gam Ori', 'Del Ori'],
      ['Alp Ori', 'Zet Ori'],
      ['Del Ori', 'Eps Ori'],
      ['Eps Ori', 'Zet Ori'],
      ['Del Ori', 'Bet Ori'],
      ['Zet Ori', 'Kap Ori'],
    ],
  },
  {
    id: 'CMa',
    en: 'Canis Major',
    es: 'Can Mayor',
    lines: [
      ['Bet CMa', 'Alp CMa'],
      ['Alp CMa', 'Del CMa'],
      ['Del CMa', 'Eps CMa'],
      ['Del CMa', 'Eta CMa'],
    ],
  },
  {
    id: 'CMi',
    en: 'Canis Minor',
    es: 'Can Menor',
    lines: [['Alp CMi', 'Bet CMi']],
  },
  {
    id: 'Aur',
    en: 'Auriga',
    es: 'Auriga',
    lines: [
      ['Alp Aur', 'Bet Aur'],
      ['Bet Aur', 'The Aur'],
      ['The Aur', 'Bet Tau'],
      ['Bet Tau', 'Iot Aur'],
      ['Iot Aur', 'Alp Aur'],
    ],
  },
  {
    id: 'Cyg',
    en: 'Cygnus (the Northern Cross)',
    es: 'Cisne (la Cruz del Norte)',
    lines: [
      ['Alp Cyg', 'Gam Cyg'],
      ['Gam Cyg', 'Bet1 Cyg'],
      ['Del Cyg', 'Gam Cyg'],
      ['Gam Cyg', 'Eps Cyg'],
    ],
  },
  {
    id: 'Lyr',
    en: 'Lyra',
    es: 'Lira',
    lines: [
      ['Alp Lyr', 'Zet1 Lyr'],
      ['Zet1 Lyr', 'Del2 Lyr'],
      ['Del2 Lyr', 'Gam Lyr'],
      ['Gam Lyr', 'Bet Lyr'],
      ['Bet Lyr', 'Zet1 Lyr'],
    ],
  },
  {
    id: 'Aql',
    en: 'Aquila',
    es: 'Águila',
    lines: [
      ['Gam Aql', 'Alp Aql'],
      ['Alp Aql', 'Bet Aql'],
      ['Alp Aql', 'Del Aql'],
    ],
  },
  {
    id: 'Peg',
    en: 'The Square of Pegasus',
    es: 'El Cuadrado de Pegaso',
    lines: [
      ['Alp Peg', 'Bet Peg'],
      ['Bet Peg', 'Alp And'],
      ['Alp And', 'Gam Peg'],
      ['Gam Peg', 'Alp Peg'],
    ],
  },
  {
    id: 'And',
    en: 'Andromeda',
    es: 'Andrómeda',
    lines: [
      ['Alp And', 'Bet And'],
      ['Bet And', 'Gam1 And'],
    ],
  },
  {
    id: 'Per',
    en: 'Perseus',
    es: 'Perseo',
    lines: [
      ['Gam Per', 'Alp Per'],
      ['Alp Per', 'Del Per'],
      ['Del Per', 'Eps Per'],
      ['Eps Per', 'Zet Per'],
    ],
  },
  {
    id: 'Leo',
    en: 'Leo',
    es: 'Leo',
    lines: [
      ['Alp Leo', 'Eta Leo'],
      ['Eta Leo', 'Gam1 Leo'],
      ['Gam1 Leo', 'Zet Leo'],
      ['Zet Leo', 'Mu Leo'],
      ['Mu Leo', 'Eps Leo'],
      ['Gam1 Leo', 'Del Leo'],
      ['Del Leo', 'Bet Leo'],
      ['Bet Leo', 'The Leo'],
      ['The Leo', 'Del Leo'],
    ],
  },
  {
    id: 'Boo',
    en: 'Boötes',
    es: 'Boyero',
    lines: [
      ['Alp Boo', 'Rho Boo'],
      ['Rho Boo', 'Gam Boo'],
      ['Gam Boo', 'Bet Boo'],
      ['Bet Boo', 'Del Boo'],
      ['Del Boo', 'Eps Boo'],
      ['Eps Boo', 'Alp Boo'],
    ],
  },
  {
    id: 'CrB',
    en: 'Corona Borealis',
    es: 'Corona Boreal',
    lines: [
      ['The CrB', 'Bet CrB'],
      ['Bet CrB', 'Alp CrB'],
      ['Alp CrB', 'Gam CrB'],
      ['Gam CrB', 'Eps CrB'],
    ],
  },
  {
    id: 'Vir',
    en: 'Virgo',
    es: 'Virgo',
    lines: [
      ['Eps Vir', 'Del Vir'],
      ['Del Vir', 'Gam Vir'],
      ['Gam Vir', 'Eta Vir'],
      ['Eta Vir', 'Bet Vir'],
      ['Gam Vir', 'Zet Vir'],
      ['Zet Vir', 'Alp Vir'],
    ],
  },
  {
    id: 'Sco',
    en: 'Scorpius',
    es: 'Escorpio',
    lines: [
      ['Bet1 Sco', 'Del Sco'],
      ['Del Sco', 'Sig Sco'],
      ['Sig Sco', 'Alp Sco'],
      ['Alp Sco', 'Tau Sco'],
      ['Alp Sco', 'Eps Sco'],
      ['Eps Sco', 'Mu1 Sco'],
      ['Mu1 Sco', 'Zet2 Sco'],
      ['Zet2 Sco', 'Eta Sco'],
      ['Eta Sco', 'The Sco'],
      ['The Sco', 'Iot1 Sco'],
      ['Iot1 Sco', 'Kap Sco'],
      ['Kap Sco', 'Lam Sco'],
    ],
  },
  {
    id: 'Sgr',
    en: 'Sagittarius (the Teapot)',
    es: 'Sagitario (la Tetera)',
    lines: [
      ['Gam2 Sgr', 'Del Sgr'],
      ['Del Sgr', 'Lam Sgr'],
      ['Lam Sgr', 'Phi Sgr'],
      ['Phi Sgr', 'Zet Sgr'],
      ['Zet Sgr', 'Eps Sgr'],
      ['Eps Sgr', 'Gam2 Sgr'],
      ['Del Sgr', 'Eps Sgr'],
      ['Phi Sgr', 'Sig Sgr'],
      ['Sig Sgr', 'Zet Sgr'],
    ],
  },
  {
    id: 'Cru',
    en: 'Crux (the Southern Cross)',
    es: 'Cruz del Sur',
    lines: [
      ['Alp1 Cru', 'Gam Cru'],
      ['Bet Cru', 'Del Cru'],
    ],
  },
  {
    id: 'Cen',
    en: 'Centaurus (the pointers)',
    es: 'Centauro (las guardas)',
    lines: [['Alp1 Cen', 'Bet Cen']],
  },
];
