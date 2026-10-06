// =============================================================================
// The 3-D curriculum's instructor documents
// -----------------------------------------------------------------------------
// Its instructor guide and answer key, laid out by js/guideDocs.js as every
// suite's are: what this module adds is only what no data structure holds,
// the teaching notes, the systems, the approximations and the introduction.
// tools/build-instructor-materials.js renders both; the key is the committed
// reference run, js/data/lab3dAnswerKey.js (npm run lab3d:key).
// =============================================================================

import { suiteAnswerKey, suiteInstructorGuide } from './guideDocs.js';
import { SUITE } from './lab3d/guides/curriculum.js';
import { EN_LAB3DGUIDES } from './i18n/en.lab3dGuides.js';

// What an instructor should know before a class runs each investigation.
const NOTES = {
  'l3-planes': [
    'Students often read the face-on picture as the orbit and the tilted picture as a distortion. The first choice step is there to surface that: the orbit is the same, and the view from above is a projection that shrinks distances across the line of nodes by cos i.',
    'The elements are read from positions and velocities, not from the drawing. Ask why the frame change on the advanced path leaves them alone: they describe the secondary relative to the primary, which every frame agrees about.',
    'Inclination alone does not place a plane: two orbits can share an inclination and still differ in where they cross the reference plane. The third investigation builds on this.',
  ],
  'l3-eclipse': [
    'The key relation is one line: at conjunction the planet passes a sin i from the star on the sky, and there is an eclipse only when that is below the two radii’s sum. Half a degree of tilt is enough to lose it for a Sun-like star at 1 AU.',
    'The enlarged-size step is deliberate: drawn at ten times their radii, the planet appears to cross a star it misses. Discuss which scale cues a picture carries and which it cannot; the legend says the size is enlarged.',
    'The advanced path’s critical inclination leads to the geometric transit probability, about (R* + Rp) / a for random orientations: a useful bridge to the transit investigations and to why transit surveys watch many stars.',
  ],
  'l3-mutual': [
    'Equal inclinations are not a shared plane: the two planets here are both at 10 degrees, with nodes 90 degrees apart, and their orbits are 14.1 degrees apart. Students who predict “the same plane” are reasoning from one number where two are needed.',
    'The formula on the advanced path, cos I = cos i1 cos i2 + sin i1 sin i2 cos(dOmega), is spherical trigonometry; the instrument computes the same angle from the two orbits’ angular momentum vectors.',
    'The second system is a Jupiter and a Saturn with the real pair’s inclinations and nodes: a mutual inclination near 1.3 degrees, and a flat model wrong by two parts in ten thousand. This is the honest case for the 2-D sandbox.',
  ],
  'l3-kozai': [
    'The cycle takes about 29,000 time units to its first peak, some 12 seconds at x256 on a typical machine. On a slow device the clock says the kernel is behind; let it run, or have students work in pairs on one machine.',
    'The kept moments matter: every later answer reads the orbit at the moment the student kept, so a student who keeps a moment a little before the peak is checked against that moment, not against the key. The key’s peak, 0.840, is one reader’s; any kept moment with e above 0.7 passes the step.',
    'The conserved quantity is the heart of it: sqrt(1 - e^2) cos i is the particle’s angular momentum along the outer orbit’s axis. It changes by under one percent here; its constancy is what forces e up as i comes down. The critical angle, 39.2 degrees, is where the peak inclination lands.',
  ],
};

/** What the guides report that is still an educational approximation. */
export const APPROXIMATIONS = [
  'Point masses under Newtonian gravity, integrated by the validated 3-D kernel (LAB3D.md): no general relativity, tides, spin or radiation. General-relativistic precession would damp the Kozai-Lidov cycle for a tight inner orbit; this one is not tight enough for that to matter to the investigation, and the guide says it is left out.',
  'The orbital elements are osculating: the two-body orbit the positions and velocities would follow at that moment. With a third body they drift, and in the Kozai-Lidov guide that drift is the investigation.',
  'Radii are used for contacts and for drawing, not for light: an eclipse here is the geometry of the sky separation against the sum of the radii, with no light curve, limb darkening or transit duration.',
  'The secular formula e_max = sqrt(1 - (5/3) cos^2 i0) is the lowest-order (quadrupole, test-particle) theory. The kernel integrates the full three-body problem, so its peak differs from the formula’s by a few thousandths, as the advanced path shows.',
  'The systems made for the guides are built from orbital elements once, in the browser, and then run as numbers; their last digits may differ between browsers, far below every tolerance.',
  'Every duration is an estimate reasoned from what each step asks; none has yet been timed with a class.',
];

/** The systems the guides use, and on what terms. */
export const DATASETS = [
  {
    name: 'Reference problems R1 (an inclined Kepler orbit), R3 (a star, a Jupiter and a Saturn) and R6 (a Kozai-Lidov triple)',
    source:
      'The 3-D kernel’s validated reference corpus, js/lab3d/references.js (VALIDATED_3D_LAB_GATE.md)',
    license: 'MIT, part of Gravitas',
  },
  {
    name: 'The eclipse systems (a planet at tilts of 0, 0.2 and 0.5 degrees) and the equal-inclination pair',
    source: 'Made from orbital elements in js/lab3d/guides/curriculum.js',
    license: 'MIT, part of Gravitas',
  },
];

/** Everything js/guideDocs.js lays out for this suite. */
export const DOCS = {
  messages: EN_LAB3DGUIDES,
  name: '3-D Lab',
  kicker: 'Gravitas 3-D Lab',
  route: '/3d/',
  title: 'Orbits in three dimensions',
  subtitle: `${SUITE.GUIDES.length} guided investigations  |  the validated 3-D kernel  |  introductory and advanced paths`,
  intro: [
    'Four guides, done in the 3-D lab (/3d/), of what a flat model cannot hold: an orbit’s plane, how an orbit looks from outside, two orbits’ planes, and a distant third body. Each asks for a prediction, has students change something and measure it with the lab’s instruments, and ends with what a 2-D model keeps and loses and where the model stops. Every answer is checked against the lab’s own numbers, the ones the tables under the view show; nothing is adopted from the literature.',
    'They are meant to be done in order: the first sets up inclination and the line of nodes, which the other three use. Each takes one class period on the introductory path. The tables make every step answerable without the 3-D picture, so a student on a device without WebGL, or using a screen reader, can do the whole investigation.',
  ],
  dataNote:
    'Nothing is downloaded: the systems are the kernel’s reference problems or are made by the guides. Once a class has opened the lab, the page and the kernel are precached, so it works offline.',
  pathNote:
    'The advanced path is the introductory one with steps added: the same systems, the same checks and the same answers, and more of them. A student can move on without passing a step, and after a wrong answer can ask to see the right one; the progress list, and the report, say which steps were passed and which were shown.',
  handIn:
    'At the last step, “Save the report as a file” writes the student’s answers, which steps were checked and which were shown, as a small JSON file: the same answers always make the same file. Collect it with the answers written out above.',
  keyNote:
    'Instructor copy. These answers were worked out by tools/lab3d-guides-key.mjs, which plays each guide as a student would, through the lab’s own systems, tick and answer functions, and keeps the moments a student would keep. The page checks each student against their own lab, not against this key: a student who kept a different moment is checked against what that moment shows. Predictions are recorded and never marked.',
  notes: NOTES,
  datasets: DATASETS,
  approximations: APPROXIMATIONS,
  keyTool: 'tools/lab3d-guides-key.mjs',
};

/** The instructor guide, with the curriculum map and assignment sheets. */
export const lab3dInstructorGuide = ({ version = '' } = {}) =>
  suiteInstructorGuide(SUITE, DOCS, { version });

/** The answer key, from js/data/lab3dAnswerKey.js. */
export const lab3dAnswerKey = (rows, { version = '' } = {}) =>
  suiteAnswerKey(SUITE, rows, DOCS, { version });
