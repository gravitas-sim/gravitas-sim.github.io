// =============================================================================
// The Exoplanet Observatory's instructor documents
// -----------------------------------------------------------------------------
// Two PDFs for the encrypted instructor bundle (tools/build-instructor-
// materials.js), rendered in Node and never loaded by a page:
//
//   the instructor guide   the curriculum map, the data and their licenses,
//                          each investigation's steps, teaching notes and an
//                          assignment sheet, and what remains an
//                          approximation
//   the answer key         every step's answer on each path, worked out by
//                          tools/exoplanet-reference.mjs from a reference run
//                          with each panel's default settings
//
// The step words come from js/i18n/en.guides.js, so the documents and the
// page cannot say different things; only the teaching notes are written here.
// =============================================================================

import { createDocument } from './pdf.js';
import {
  ADOPTED,
  GUIDES,
  TARGETS,
  stepsOn,
} from './observatory/guides/exoplanet.js';
import { EN_GUIDES } from './i18n/en.guides.js';

const say = id => EN_GUIDES[id] ?? id;
const stepText = (g, s, part) => say(`gd.${g.id}.${s.id}.${part}`);
const KIND = {
  read: 'Read',
  do: 'Do, and checked',
  answer: 'Answer, checked',
  choose: 'Choose',
};
const kindOf = s =>
  s.kind === 'choose' && s.correct === null
    ? 'Predict (recorded)'
    : KIND[s.kind];

/** What each investigation reads, and with which tools. */
function usesOf(g) {
  const targets = new Set();
  const tools = new Set();
  for (const s of g.steps) {
    const t = s.check?.target ?? s.go?.open ?? s.target;
    if (t) targets.add(say(`gd.target.${t}`));
    if (s.check?.kind === 'measured')
      tools.add(s.check.tool === 'box' ? 'box search' : 'aperture tool');
    if (s.check?.kind === 'fitted') tools.add('transit fit');
    if (s.check?.kind === 'folded') tools.add('fold');
    if (s.show) tools.add('computed panels');
  }
  return { targets: [...targets], tools: [...tools] };
}

// What an instructor should know before a class runs each investigation.
const NOTES = {
  'exo-star': [
    'Students tend to read a light curve as the star’s light alone. The QUALITY count and the aperture are the two places the record says otherwise; ask what else could be in those 23 pixels.',
    'The share of light from two magnitudes is often a student’s first use of magnitudes as a ratio. Expect the sign of the exponent to go wrong, and a ratio of the two stars’ light given instead of A’s share of both.',
    'CROWDSAP is the pipeline’s model of the aperture, from the catalog and a model of how each star’s light spreads, not a measurement from this light curve. The guide treats it as adopted and says so.',
  ],
  'exo-find': [
    'The box search’s default range starts at about a day; a shorter period would be missed. Ask what range students would choose, and what a range that is too narrow would hide.',
    'One sector holds about eight transits, which pins the period to about a minute: that, not a mistake, is why the search differs from the long-baseline literature value.',
    'Folding is a change to the view, recorded and undoable; later measurements say which view they were made on.',
  ],
  'exo-fit': [
    'The fit is weighted least squares with the pipeline’s errors. It then offers three uncertainties: as given, scaled by the reduced chi-square, and with the correlated-noise factor beta. Discuss which to quote and why; the guide asks for beta on the advanced path.',
    'The correlation of b with a/R* is geometry, not a flaw of the fit: the light curve fixes the transit’s length and shape, not the orbit’s size and tilt separately.',
    'Rp is proportional to the adopted stellar radius. The two published radii differ by 3 percent, more than the fit’s own uncertainty on k: a good place to ask which uncertainty dominates a result.',
  ],
  'exo-dilution': [
    'The central idea is one line: light that is not the host’s fills the transit in by its share, so a depth shrinks by the host’s share and k by its square root.',
    'Neither SAP nor PDCSAP flux is the truth. PDCSAP’s correction assumes the catalog, the pipeline’s model of each star’s light and the host; SAP assumes nothing and so is diluted.',
    'The light curve cannot say which star is the host. Ask students what observation could: separating the two stars in an image, taking each star’s spectrum, or watching where the light comes from during a transit are all reasonable proposals.',
  ],
  'exo-planet': [
    'Passing the odd/even and secondary tests does not prove a planet; it removes two ways an eclipsing binary would give itself away. The blend limit on the advanced path removes the cataloged neighbors, and says what it cannot remove.',
    'The mass needs radial velocities, which no Gravitas pack holds for a transiting star; the radial-velocity lesson works with a simulated survey. As an extension, a class can combine the fitted radius with Stassun et al. (2017)’s mass, 0.73 +/- 0.04 Jupiter masses, labeled as adopted, for a density of about 0.36 g/cm3.',
    'The simulation step compares a built world with a measurement: the simulation uses rounded published values, and the two need not agree to the last digit.',
  ],
};

/** What the guides report that is still an educational approximation. */
export const APPROXIMATIONS = [
  'The depths in the computed panels are means over the middle half of the transit against the light well away from it: honest and reproducible, but not a model depth, and limb darkening makes them deeper than k squared.',
  'The planet’s ratio were it to orbit B ignores limb darkening and takes all the light that is not A’s to be B’s, which is the most B could have: it is the smallest ratio B’s planet could have, not an estimate of it.',
  'CROWDSAP is SPOC’s model of the aperture, and the TESS Input Catalog magnitudes are catalog values: both are adopted, not measured here.',
  'The transit model assumes a circular orbit and quadratic limb darkening, and holds the dilution fixed at the value given; a light curve alone cannot tell dilution from a smaller planet.',
  'The stellar radii are adopted from the literature; nothing in the guides tests them.',
  'The odd/even and secondary tests use three standard errors as their threshold, with uncertainties that include correlated noise measured from the out-of-transit light. A different threshold or noise model can change a marginal case.',
  'One sector’s period is known to about a minute, and the fit’s formal period uncertainty is smaller than its real one (INFERENCE_CORE.md measures by how much).',
  'The simulation’s HD 209458 is built from rounded published values.',
  'No radial velocities of a transiting star ship with Gravitas, so the guides teach the transit-only limit: no mass and no density is measured.',
];

/** The data the guides use, and on what terms. */
export const DATASETS = [
  {
    name: 'HD 209458, TESS sector 56 light curve (SPOC, 20-minute bins)',
    source: 'MAST; built into Gravitas as tess-hd209458-s56-lc 1.0.0',
    license: 'Public domain (NASA mission data)',
  },
  {
    name: 'HD 209458, TESS sector 56 aperture image',
    source: 'MAST; built in as tess-hd209458-s56-aperture 1.0.0',
    license: 'Public domain (NASA mission data)',
  },
  {
    name: 'Kepler-13, TESS sector 14 light curve, SAP flux (TIC 158324245)',
    source:
      'MAST; the catalog extension community.kepler-13-tess-s14-sap 1.0.0, installed on first use',
    license: 'Public domain (NASA mission data)',
  },
  {
    name: 'Kepler-13, TESS sector 14 light curve, PDCSAP flux',
    source:
      'MAST; the catalog extension community.kepler-13-tess-s14-pdcsap 1.0.0',
    license: 'Public domain (NASA mission data)',
  },
  {
    name: 'Adopted values: periods, stellar radii, catalog magnitudes, published radii',
    source: [
      ADOPTED.hd209458.stellarRadius.ref,
      ADOPTED.hd209458.stellarRadiusTorres.ref,
      ADOPTED.kepler13.stellarRadius.ref,
      'TESS Input Catalog v8',
      'NASA Exoplanet Archive (retrieved 2026-09-26)',
    ].join('; '),
    license: 'Cited, not redistributed: numbers from the literature',
  },
];

const footer = (what, version) =>
  `Gravitas Exoplanet Observatory  |  ${what}  |  Instructor copy${version ? `  |  ${version}` : ''}`;

/** The instructor guide, with the curriculum map and assignment sheets. */
export function exoplanetInstructorGuide({ version = '' } = {}) {
  const doc = createDocument({
    title: 'The Exoplanet Observatory: Instructor Guide',
    subject:
      'Instructor guide for the Exoplanet Observatory: five guided investigations with real TESS light curves, a curriculum map, the data and their licenses, teaching notes, assignment sheets and the approximations that remain.',
    footer: footer('Instructor Guide', version),
  });
  doc.titleBlock({
    kicker: 'Gravitas Observatory | Instructor Guide',
    title: 'The Exoplanet Observatory: from photons to a planet',
    subtitle: `${GUIDES.length} guided investigations  |  real TESS light curves  |  introductory and advanced paths`,
  });
  doc.paragraph(
    'Five investigations, done in the Observatory (/observatory/) with real TESS light curves and the page’s own tools: the aperture tool, the box search, the fold and the transit fit. Each step is checked against the student’s own workspace or against a number computed from the data on screen; the few values taken from the literature are named as adopted, with their sources. They are meant to be done in order, and each takes one class period on the introductory path.'
  );
  doc.paragraph(
    'The advanced path is the introductory one with steps added: the same data, the same checks and the same answers, and more of them. A student can move on without passing a step, and after a wrong answer can ask to see the right one; the progress list, and the notebook entry, say which steps were passed and which were shown.'
  );

  doc.heading('The curriculum map', { size: 13 });
  doc.table({
    columns: [
      'Investigation',
      'Question',
      'Data and tools',
      'Intro',
      'Advanced',
    ],
    widths: [1.3, 2, 2.2, 0.8, 0.9],
    rows: GUIDES.map(g => {
      const u = usesOf(g);
      return [
        say(`gd.${g.id}.title`),
        say(`gd.${g.id}.summary`),
        `${u.targets.join('; ')}. Tools: ${u.tools.join(', ') || 'none'}.`,
        `${stepsOn(g, 'intro').length} steps, ~${g.minutes.intro} min`,
        `${stepsOn(g, 'advanced').length} steps, ~${g.minutes.advanced} min`,
      ];
    }),
    size: 8,
  });
  doc.paragraph(
    'Every duration is an estimate reasoned from what each step asks; none has yet been timed with a class.',
    { size: 9, color: '0.35 0.35 0.4' }
  );

  doc.heading('The data, and on what terms', { size: 13 });
  doc.table({
    columns: ['Data', 'Where it comes from', 'Terms'],
    widths: [2, 2.4, 1.3],
    rows: DATASETS.map(d => [d.name, d.source, d.license]),
    size: 8,
  });
  doc.paragraph(
    'The Kepler-13 light curves are not built in: the first step that opens one installs it from the Gravitas catalog into the browser (about 9 KB each), where it stays for offline use. Everything else, the Observatory and the guides included, is precached by the service worker, so a class that has opened the guides once can work offline.'
  );

  for (const g of GUIDES) {
    doc.pageBreak();
    doc.heading(say(`gd.${g.id}.title`), { size: 13 });
    doc.paragraph(say(`gd.${g.id}.summary`));
    doc.table({
      columns: ['#', 'Step', 'Kind', 'Path'],
      widths: [0.3, 3.2, 1.3, 0.8],
      rows: stepsOn(g, 'advanced').map((s, n) => [
        String(n + 1),
        stepText(g, s, 'title'),
        kindOf(s),
        s.path === 'advanced' ? 'Advanced' : 'Both',
      ]),
      size: 8.5,
    });
    doc.heading('Teaching notes', { size: 11 });
    doc.bullets(NOTES[g.id]);
    doc.heading('Assignment sheet', { size: 11 });
    doc.paragraph(
      `Open /observatory/?guide=${g.id} for the introductory path, or /observatory/?guide=${g.id}&path=advanced for the advanced one. Hand in:`
    );
    doc.bullets(
      stepsOn(g, 'advanced')
        .filter(s => s.kind === 'answer' || s.kind === 'choose')
        .map(
          s =>
            `${stepText(g, s, 'title')}${s.path === 'advanced' ? ' (advanced)' : ''}: ${
              s.kind === 'answer'
                ? 'the number, and how you found it'
                : 'your choice, and why'
            }.`
        )
    );
    doc.paragraph(
      'At the last step, “Add my answers to the notebook” records the answers as an Observatory entry, with which were checked and which were shown; the notebook’s report can then be handed in with them.',
      { size: 9 }
    );
  }

  doc.pageBreak();
  doc.heading('What remains an approximation', { size: 13 });
  doc.bullets(APPROXIMATIONS);
  return doc.build();
}

/**
 * The answer key, from tools/exoplanet-reference.mjs answerKey().
 * @param {Array<object>} rows - Its rows
 */
export function exoplanetAnswerKey(rows, { version = '' } = {}) {
  const doc = createDocument({
    title: 'The Exoplanet Observatory: Answer Key',
    subject:
      'Answer key for the Exoplanet Observatory’s guided investigations, worked out from a reference run on the same data with each panel’s default settings.',
    footer: footer('Answer Key', version),
  });
  doc.titleBlock({
    kicker: 'Gravitas Observatory | Answer Key',
    title: 'The Exoplanet Observatory: Answer Key',
    subtitle:
      'Every step, on the advanced path, which includes the introductory one',
  });
  doc.paragraph(
    'Instructor copy. These answers were worked out by tools/exoplanet-reference.mjs, which does what a student does with each panel’s default settings and then applies the guides’ own answer functions to the results. The page checks each student against their own measurement and fit, not against this key: a student who searched a different range or fitted with other bounds is checked against what they found. Predictions are recorded and never marked.',
    { size: 9, color: '0.35 0.35 0.42' }
  );
  const fmt = v =>
    typeof v === 'number' ? String(Number(v.toPrecision(6))) : String(v);
  for (const g of GUIDES) {
    doc.heading(say(`gd.${g.id}.title`), { size: 12, spaceBefore: 16 });
    const mine = rows.filter(r => r.guide === g.id && r.path === 'advanced');
    doc.table({
      columns: ['Step', 'Kind', 'Answer', 'Why'],
      widths: [1.6, 1, 1.2, 3.4],
      rows: mine
        .filter(r => r.kind !== 'read')
        .map(r => {
          const s = g.steps.find(x => x.id === r.step);
          const answer =
            r.kind === 'choose'
              ? r.expected === null
                ? 'Any (a prediction)'
                : stepText(g, s, `opt.${r.expected}`)
              : r.expected === null
                ? r.kind === 'do'
                  ? 'Done'
                  : 'Not computed'
                : `${fmt(r.expected)}${r.tolerance !== undefined ? ` (+/- ${r.tolerance})` : ''}`;
          const why =
            r.kind === 'choose' && r.expected === null
              ? 'Answered by a later step.'
              : stepText(g, s, 'ok').replace(
                  /\{value\}/g,
                  r.expected === null ? '' : fmt(r.expected)
                );
          return [
            `${stepText(g, s, 'title')}${s.path === 'advanced' ? ' (advanced)' : ''}`,
            kindOf(s),
            answer,
            why,
          ];
        }),
      size: 8,
    });
  }
  doc.paragraph(
    `Targets: ${Object.keys(TARGETS)
      .map(t => say(`gd.target.${t}`))
      .join('; ')}.`,
    { size: 8.5 }
  );
  return doc.build();
}
