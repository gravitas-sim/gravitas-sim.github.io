// =============================================================================
// The mission lab's instructor documents
// -----------------------------------------------------------------------------
// Its instructor guide and answer key, laid out by js/guideDocs.js as every
// suite's are: what this module adds is only what no data structure holds,
// the teaching notes, the data, the approximations and the introduction.
// tools/build-instructor-materials.js renders both; the key is the committed
// reference run, js/data/missionLabKey.js (npm run mission:key), which also
// records the guides' structure. The documents read that, not the
// curriculum: js/mission/lab/curriculum.js carries the functions that check
// a step and everything they import, which the instructor bundle's digest
// (tools/instructor-freshness.mjs) would then have to follow.
// =============================================================================

import { suiteAnswerKey, suiteInstructorGuide } from './guideDocs.js';
import { MISSION_LAB_SUITE as SUITE } from './data/missionLabKey.js';
import { EN_MISSIONLABGUIDES } from './i18n/en.missionLabGuides.js';

// What an instructor should know before a class runs each part.
const NOTES = {
  'ml-orbit': [
    'The prediction usually splits the class: a 100 km climb sounds large and 5 degrees sounds small. The measured answer, about 57 m/s against about 670 m/s, is the point of the part. A plane change swings the whole orbital velocity, 2 v sin(di / 2), while a small climb changes its size a little.',
    'The wait depends on the depot’s starting lead, which the plan sets at 17 degrees. The lower orbit gains on the depot, so a lead a little larger than the transfer needs means a short wait and a lead a little smaller means most of a synodic period, about 2.9 days here. The advanced path asks students to set it.',
    'The rendezvous is the core’s validated case: the reference cases fly it with the 3-D kernel and the two spacecraft meet to about 1e-12 of the orbit’s radius (MISSION_LAB.md, case S2).',
  ],
  'ml-window': [
    'The window needs about 19,000 Lambert solves; on a school laptop they take a second or two in the Worker. Students on slow devices can share one window and still do the rest of the part.',
    'Four candidates are listed because a mission never chooses by delta-v alone: the launch vehicle is rated by C3, a lander by its arrival speed, and a crew by the time of flight. The cheapest cell and the lowest-C3 cell are close but not the same day.',
    'The declination step (advanced) is where the flat model of the diagnostic page (/mission/) fails: Mars’s orbit is tilted 1.85 degrees, and a transfer near 180 degrees must climb steeply out of the Earth’s plane to meet it. In the flat model that angle does not exist.',
  ],
  'ml-cruise': [
    'Almost every class predicts a miss of a few thousand km or less, because every piece of the design is exact. The direct flight misses by about two million km. This is not a numerical error: case S1 in the reference cases shows the kernel flying the patched conic’s own ellipse into Mars to a fraction of a meter.',
    'The diagnosis is measured, not asserted: students switch the planets and the starting point and see that the other planets move the arrival by under 100,000 km, while a departure from a real orbit, with the Earth pulling after its sphere of influence, moves it by millions (case D1). A class can divide the four combinations between groups.',
    'The explanation is recorded and not marked; it is what the assignment sheet asks students to hand in. A good one says that the patched conic ignores the Earth’s pull outside its sphere of influence and the Sun’s inside it, and that it is still where design starts because it is fast, nearly right in delta-v, and corrected later by exactly the burns this part adds.',
    'The correction aims at Mars’s center with Mars not pulling, as the heliocentric leg does; real missions aim beside the planet (the B-plane), which the lab does not support. Correcting on day 10, 30, 100 and 200 costs more each time (case D2): the reason is that a velocity error grows into a position error with time.',
  ],
};

/** What the lab reports that is still an educational approximation. */
export const APPROXIMATIONS = [
  'The planets’ positions are JPL’s DE441, fitted to within a few km from 2025 to 2045 (the pack’s stated bounds, MISSION_LAB.md); a time outside the pack is refused, never extrapolated.',
  'The design is a patched conic: inside a sphere of influence only the planet pulls, outside only the Sun, and each leg is a two-body conic.',
  'Every burn is instantaneous: no finite burns, gravity losses or engine start-up.',
  'The direct flight is pulled only by the Sun and the planets ticked; Mercury, Saturn, Uranus, Neptune, the Moon and the asteroids are left out, and every body is a point mass. By arrival its planets have drifted from JPL’s by up to a few thousand km.',
  'The correction aims at Mars’s center without Mars pulling; real missions aim beside the planet (the B-plane), which is not supported.',
  'There is no launch, no tracking and no uncertainty: every state is known exactly. This is educational software, not operational mission design or navigation.',
  'Every duration is an estimate reasoned from what each step asks; none has yet been timed with a class.',
];

/** The data the lab uses, and on what terms. */
export const DATASETS = [
  {
    name: 'Heliocentric states of Venus, the Earth, Mars and the Jupiter system barycenter, 2025 to 2045',
    source:
      'NASA/JPL Horizons (Solar System Dynamics), ephemeris DE441 (Park et al. 2021, AJ 161, 105), reduced to Chebyshev coefficients by tools/build-ephemeris.mjs',
    license: 'No license stated; credit JPL and cite DE441 (NOTICE)',
  },
  {
    name: 'The bodies’ GM and radii',
    source: 'Rounded IAU and JPL standard values, js/mission/bodies.js',
    license: 'Facts; part of Gravitas (MIT)',
  },
];

/** Everything js/guideDocs.js lays out for this suite. */
export const DOCS = {
  messages: EN_MISSIONLABGUIDES,
  name: 'Mission Lab',
  kicker: 'Gravitas Mission Lab',
  route: '/mission/lab/',
  title: 'A Mission to Mars',
  subtitle: `${SUITE.GUIDES.length} guided parts  |  JPL DE441 and the validated 3-D kernel  |  introductory and advanced paths`,
  intro: [
    'Three guided parts of one mission, done in the mission lab (/mission/lab/): a rendezvous with a propellant depot in Earth orbit, the choice of a day to leave in the 2026 Earth-Mars window, and the patched-conic design compared with the same spacecraft flown directly under the Sun and the planets. Each part asks for a prediction, has students change the plan and read the results, and ends with what the model leaves out. Every answer is checked against the student’s own lab.',
    'They are meant to be done in order, in one plan: the second part changes the departure the first leaves alone, and the third flies the plan the second chose. Each takes a class period on the introductory path. Every number is in tables, so a student using a screen reader or a keyboard can do every step.',
  ],
  dataNote:
    'Nothing is fetched while the lab runs: the ephemeris is a same-origin pack built once from JPL Horizons, with every request and checksum recorded. Once a class has opened the lab, it works offline.',
  pathNote:
    'The advanced path is the introductory one with steps added: the same plan, the same checks and more of them. A student can move on without passing a step, and after a wrong answer can ask to see the right one; the step list and the report say which steps were passed and which were shown.',
  handIn:
    'At the end, “Save the report as a file” writes the student’s answers, choices and explanation, which steps were checked and which were shown, their plan and its results, as a small JSON file: the same answers always make the same file.',
  keyNote:
    'Instructor copy. These answers were worked out by tools/mission-lab-key.mjs, which plays each part as a student would from the lab’s default plan, doing each step the way its “Show me” does, and applies the guides’ own answer functions. The page checks each student against their own plan, not against this key: a student who chose another departure is checked against what that departure gives. Predictions and explanations are recorded and never marked.',
  notes: NOTES,
  datasets: DATASETS,
  approximations: APPROXIMATIONS,
  keyTool: 'tools/mission-lab-key.mjs',
};

/** The instructor guide, with the curriculum map and assignment sheets. */
export const missionLabInstructorGuide = ({ version = '' } = {}) =>
  suiteInstructorGuide(SUITE, DOCS, { version });

/** The answer key, from js/data/missionLabKey.js. */
export const missionLabAnswerKey = (rows, { version = '' } = {}) =>
  suiteAnswerKey(SUITE, rows, DOCS, { version });
