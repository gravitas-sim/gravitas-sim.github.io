// The 3-D lab's guided investigations: their English, and the runner's
// (js/lab3d/view/guidePanel.js). Spanish in ./es.lab3dGuides.js, with the same
// ids. A step's words are gd.<guide>.<step>.title, .text, .ok and .no; a
// choice's options .opt.<option> (js/lab3d/guides/curriculum.js).

export const EN_LAB3DGUIDES = {
  // --- The runner
  'g3.heading': 'Guided investigations',
  'g3.intro':
    'A set of investigations on what a flat model cannot hold: an orbit’s plane, how it looks from outside, two orbits’ planes, a distant third body, the six orbital elements, the choice of a reference plane, an orbit seen from a chosen direction, and two planets locked in a resonance. Each asks for a prediction, has you change something and measure, and says where the model stops. Every answer is checked against the lab’s own numbers.',
  'g3.meta': 'About {intro} minutes; {advanced} on the advanced path.',
  'g3.startIntro': 'Start',
  'g3.startAdvanced': 'Start the advanced path',
  'g3.where': '{guide}: step {n} of {of}, {path}.',
  'g3.path.intro': 'introductory path',
  'g3.path.advanced': 'advanced path',
  'g3.progress': 'Steps',
  'g3.stepsDone': 'Steps: {done} of {of} done',
  'g3.status.open': 'not done',
  'g3.status.passed': 'done',
  'g3.status.shown': 'answer shown',
  'g3.status.recorded': 'recorded',
  'g3.status.tried': 'tried',
  'g3.back': 'Back',
  'g3.next': 'Next',
  'g3.finish': 'Finish and see the report',
  'g3.all': 'All investigations',
  'g3.do': 'Do it for me',
  'g3.keep': 'Keep this moment',
  'g3.check': 'Check',
  'g3.reveal': 'Show the answer',
  'g3.revealed':
    'The answer is {value}. The step is marked as shown, not found.',
  'g3.predict': 'Your prediction',
  'g3.choose': 'Your answer',
  'g3.record': 'Record my prediction',
  'g3.recorded':
    'Recorded. A later step comes back to it; predictions are not marked.',
  'g3.pick': 'Choose one of the options first.',
  'g3.notNumber':
    'That is not a number. Type it with a decimal point or comma, and no unit.',
  'g3.missing':
    'This cannot be worked out yet: open the system this step is about, or keep the moment it reads.',
  'g3.waiting': 'Waiting for the lab to show this.',
  'g3.keepWaiting':
    'When the lab shows what this step asks for, press “Keep this moment”.',
  'g3.report': 'Your report',
  'g3.reportSummary':
    '{passed} of the {graded} checked steps passed. Predictions are listed as recorded.',
  'g3.name': 'Your name, for the report (optional)',
  'g3.save': 'Save the report as a file',
  'g3.unit.deg': 'Your answer, in degrees',
  'g3.unit.starRadii': 'Your answer, in star radii',
  'g3.unit.fraction': 'Your answer, as a fraction (not a percentage)',
  'g3.unit.none': 'Your answer (a number without units)',

  // --- The systems the guides bring
  'gd.target.R1': 'An inclined Kepler orbit (R1)',
  'gd.target.R3': 'A star and two planets (R3)',
  'gd.target.R6': 'Kozai-Lidov cycles (R6)',
  'gd.target.tilt-0': 'Investigation: a planet in the reference plane',
  'gd.target.tilt-02': 'Investigation: the same orbit tilted 0.2°',
  'gd.target.tilt-05': 'Investigation: the same orbit tilted 0.5°',
  'gd.target.same-tilt': 'Investigation: two planets, both inclined 10°',

  // --- l3-planes
  'gd.l3-planes.title': 'An orbit’s plane',
  'gd.l3-planes.summary':
    'Inclination and the line of nodes: what a tilted orbit looks like from above and from its own edge, and which numbers describe its tilt.',
  'gd.l3-planes.intro.title': 'Every orbit has a plane',
  'gd.l3-planes.intro.text':
    'Two bodies orbit in a plane that stays fixed in space. The lab draws a reference plane, z = 0, as a grid. An orbit’s inclination is the angle between its plane and the reference plane, and the line of nodes is where the two planes cross.',
  'gd.l3-planes.predict-shape.title': 'Predict: the view from above',
  'gd.l3-planes.predict-shape.text':
    'This orbit is an ellipse tilted 40° from the reference plane. Looking straight down onto the reference plane, what shape will its path make?',
  'gd.l3-planes.predict-shape.opt.same': 'The same ellipse, the same size',
  'gd.l3-planes.predict-shape.opt.narrower':
    'An ellipse squeezed across the line of nodes',
  'gd.l3-planes.predict-shape.opt.circle': 'A circle',
  'gd.l3-planes.open.title': 'Open the orbit, seen from above',
  'gd.l3-planes.open.text':
    'Open “An inclined Kepler orbit” and choose the look “Down onto the reference plane”.',
  'gd.l3-planes.open.ok':
    'You are looking straight down onto the reference plane.',
  'gd.l3-planes.play.title': 'Let it go round once',
  'gd.l3-planes.play.text':
    'Play until the secondary has gone all the way round, so its trail shows the whole path.',
  'gd.l3-planes.play.ok': 'One full orbit: the trail is the whole path.',
  'gd.l3-planes.shape.title': 'What shape is the path from above?',
  'gd.l3-planes.shape.text':
    'Compare the trail with your prediction. Which describes it?',
  'gd.l3-planes.shape.opt.same': 'The same ellipse, the same size',
  'gd.l3-planes.shape.opt.narrower':
    'An ellipse squeezed across the line of nodes',
  'gd.l3-planes.shape.opt.circle': 'A circle',
  'gd.l3-planes.shape.ok':
    'Right. Looking down, distances along the line of nodes are kept, and distances across it shrink by cos i. A 2-D picture of a tilted orbit is a projection, not the orbit.',
  'gd.l3-planes.shape.no':
    'Look again at the trail against the grid. Along the line of nodes nothing shrinks; across it, every distance is multiplied by the cosine of the inclination.',
  'gd.l3-planes.orbit-tool.title': 'Measure the orbit',
  'gd.l3-planes.orbit-tool.text':
    'Choose the instrument “Orbit” on the secondary. It reads the orbit from the positions and velocities, not from the picture. The table below the view has the same numbers.',
  'gd.l3-planes.orbit-tool.ok': 'The orbit instrument is on the secondary.',
  'gd.l3-planes.inclination.title': 'The inclination',
  'gd.l3-planes.inclination.text':
    'What is the secondary’s inclination, in degrees? It is in the reading and in the orbits table.',
  'gd.l3-planes.inclination.ok':
    'Right: 40°, the angle between the orbit’s plane and the reference plane.',
  'gd.l3-planes.inclination.no':
    'Not quite. Read “i” in the reading, or the inclination column of the orbits table.',
  'gd.l3-planes.node.title': 'The ascending node',
  'gd.l3-planes.node.text':
    'Where the secondary crosses the reference plane going up is the ascending node. Its direction from the primary is given as an angle from the x axis, the longitude of the ascending node. What is it, in degrees? It is in the orbits table.',
  'gd.l3-planes.node.ok':
    'Right: 30°. With the inclination, it fixes the orbit’s plane in space; a flat model has neither.',
  'gd.l3-planes.node.no':
    'Not quite. The orbits table’s “Ascending node” column has it, measured from +x.',
  'gd.l3-planes.edge-on.title': 'Look along the orbit’s own edge',
  'gd.l3-planes.edge-on.text':
    'Choose the look “Edge-on to the orbit”, with the secondary kept centered. The lab looks along the orbit’s line of nodes.',
  'gd.l3-planes.edge-on.ok': 'You are looking along the orbit’s line of nodes.',
  'gd.l3-planes.edge-shape.title': 'The orbit, edge-on',
  'gd.l3-planes.edge-shape.text':
    'Edge-on to its own plane, what does the orbit look like?',
  'gd.l3-planes.edge-shape.opt.line': 'A straight line',
  'gd.l3-planes.edge-shape.opt.ellipse': 'An ellipse',
  'gd.l3-planes.edge-shape.opt.circle': 'A circle',
  'gd.l3-planes.edge-shape.ok':
    'Right: every point of a plane seen along the plane lines up. This is how an eclipsing orbit is seen from Earth.',
  'gd.l3-planes.edge-shape.no':
    'Look at the trail again: seen along its own plane, the whole path lies on one line.',
  'gd.l3-planes.periapsis.title': 'The argument of periapsis',
  'gd.l3-planes.periapsis.text':
    'Within its plane, the ellipse is turned so that its periapsis (its closest point to the primary) lies at an angle from the ascending node: the argument of periapsis. What is it, in degrees?',
  'gd.l3-planes.periapsis.ok':
    'Right: 60°. Inclination, node and periapsis together orient the ellipse in space.',
  'gd.l3-planes.periapsis.no':
    'Not quite. It is in the orbits table, the “Argument of periapsis” column.',
  'gd.l3-planes.frame.title': 'Change the frame',
  'gd.l3-planes.frame.text':
    'Choose the frame “Centered on primary”. The picture now moves with the primary.',
  'gd.l3-planes.frame.ok':
    'The lab now shows the frame centered on the primary.',
  'gd.l3-planes.frame-elements.title': 'Did the orbit change?',
  'gd.l3-planes.frame-elements.text':
    'Look at the orbits table again. Did the inclination, node or periapsis change with the frame?',
  'gd.l3-planes.frame-elements.opt.unchanged': 'No, they are the same',
  'gd.l3-planes.frame-elements.opt.changed': 'Yes, they changed',
  'gd.l3-planes.frame-elements.ok':
    'Right. The elements describe the secondary’s motion relative to the primary, and every frame here agrees about that. Only where the picture is centered changed.',
  'gd.l3-planes.frame-elements.no':
    'Compare the columns again. The elements are about the primary, whatever frame the view is in.',
  'gd.l3-planes.flat.title': 'What a flat model keeps, and loses',
  'gd.l3-planes.flat.text':
    'A 2-D model of this orbit is its face-on view. It keeps the size, the shape and the period exactly: a, e and the period do not depend on the tilt. It loses the inclination and the node, which is to say where the orbit is. For a single orbit studied on its own, a flat model is enough; the moment a second plane matters, the reference plane, an observer, or another orbit, it is not.',
  'gd.l3-planes.limits.title': 'Where the model stops',
  'gd.l3-planes.limits.text':
    'Point masses under Newtonian gravity, integrated by the validated kernel. The elements are osculating: the two-body orbit the positions and velocities would follow now. Here they stay fixed; with a third body they would drift. The measurements are the table’s four significant figures.',

  // --- l3-eclipse
  'gd.l3-eclipse.title': 'Seen from outside',
  'gd.l3-eclipse.summary':
    'Whether a planet eclipses its star depends on the line of sight: a matter of fractions of a degree, and something a drawn size can get wrong.',
  'gd.l3-eclipse.intro.title': 'An observer outside the orbit',
  'gd.l3-eclipse.intro.text':
    'A distant observer sees the system projected onto the sky, the plane across their line of sight. A planet eclipses its star when, at conjunction, their separation on the sky is less than the sum of their radii. Here the star’s radius is 0.005 of the orbit’s radius, about the Sun’s against Earth’s orbit, and the planet’s is a tenth of the star’s.',
  'gd.l3-eclipse.open-flat.title':
    'An orbit in the reference plane, seen along it',
  'gd.l3-eclipse.open-flat.text':
    'Open “Investigation: a planet in the reference plane” and look “Along the reference plane”, from -y: the observer. Choose the instrument “On the sky, seen from here” on the star and the planet.',
  'gd.l3-eclipse.open-flat.ok':
    'Seen from here, the orbit is edge-on: once an orbit, the planet passes straight in front of the star.',
  'gd.l3-eclipse.predict.title': 'Predict: tilt it by half a degree',
  'gd.l3-eclipse.predict.text':
    'Tilt the same orbit by 0.5° about the x axis, and keep the observer where they are. Will the planet still pass in front of the star?',
  'gd.l3-eclipse.predict.opt.yes': 'Yes',
  'gd.l3-eclipse.predict.opt.no': 'No',
  'gd.l3-eclipse.open-tilted.title': 'Open the tilted orbit',
  'gd.l3-eclipse.open-tilted.text':
    'Open “Investigation: the same orbit tilted 0.5°”, still seen along the reference plane, and put the instrument “Orbit” on the planet.',
  'gd.l3-eclipse.open-tilted.ok':
    'The tilted orbit is open, with the orbit instrument on the planet.',
  'gd.l3-eclipse.impact.title': 'How close does it pass?',
  'gd.l3-eclipse.impact.text':
    'At conjunction the planet is the orbit’s radius a away, raised out of the observer’s line by a × sin(i). Work out that separation in star radii, a × sin(i) ÷ 0.005, from the a and i the instrument reads.',
  'gd.l3-eclipse.impact.ok':
    'Right: about 1.75 star radii. Astronomers call this the impact parameter.',
  'gd.l3-eclipse.impact.no':
    'Check the arithmetic: a = 1 and i = 0.5°, so a sin i is about 0.0087; divide by the star’s radius, 0.005.',
  'gd.l3-eclipse.eclipses.title': 'Does it eclipse?',
  'gd.l3-eclipse.eclipses.text':
    'An eclipse needs the separation below the star’s radius plus the planet’s: 1.1 star radii here. Does this orbit eclipse its star, seen from the observer?',
  'gd.l3-eclipse.eclipses.opt.yes': 'Yes',
  'gd.l3-eclipse.eclipses.opt.no': 'No',
  'gd.l3-eclipse.eclipses.ok':
    'Right: at 1.75 star radii the planet passes above the star. Half a degree was enough to lose the eclipse, which is why most planets never transit as seen from Earth.',
  'gd.l3-eclipse.eclipses.no':
    'Compare your separation with 1.1 star radii. More than that, and the planet misses.',
  'gd.l3-eclipse.enlarged.title': 'Watch it pass, drawn larger',
  'gd.l3-eclipse.enlarged.text':
    'The lab draws the bodies at ten times their radius, and plays at a quarter speed. Watch the planet come round in front of the star, and read the sky separation as it passes.',
  'gd.l3-eclipse.enlarged.ok': 'The planet has gone round once.',
  'gd.l3-eclipse.appears.title': 'What did the picture show?',
  'gd.l3-eclipse.appears.text':
    'Drawn at ten times their radii, did the planet appear to cross the star?',
  'gd.l3-eclipse.appears.opt.yes': 'Yes, it appeared to cross',
  'gd.l3-eclipse.appears.opt.no': 'No, it passed clear',
  'gd.l3-eclipse.appears.ok':
    'Right, it did appear to cross, and there is no eclipse. Drawn ten times larger, the discs overlap. The legend says the size is enlarged; a drawn size is a choice, and the numbers decide.',
  'gd.l3-eclipse.appears.no':
    'Watch again with the body size at radius × 10: the enlarged discs overlap as the planet passes, although the true ones do not.',
  'gd.l3-eclipse.open-slight.title': 'A smaller tilt',
  'gd.l3-eclipse.open-slight.text':
    'Open “Investigation: the same orbit tilted 0.2°”, seen along the reference plane, with the orbit instrument on the planet.',
  'gd.l3-eclipse.open-slight.ok': 'The 0.2° orbit is open.',
  'gd.l3-eclipse.impact-slight.title': 'How close now?',
  'gd.l3-eclipse.impact-slight.text':
    'Work out a × sin(i) ÷ 0.005 again, for this orbit.',
  'gd.l3-eclipse.impact-slight.ok': 'Right: about 0.70 star radii.',
  'gd.l3-eclipse.impact-slight.no':
    'Not quite. With i = 0.2°, a sin i is about 0.0035; divide by 0.005.',
  'gd.l3-eclipse.eclipses-slight.title': 'Does this one eclipse?',
  'gd.l3-eclipse.eclipses-slight.text':
    'Is 0.70 star radii below the 1.1 an eclipse needs?',
  'gd.l3-eclipse.eclipses-slight.opt.yes': 'Yes, it eclipses',
  'gd.l3-eclipse.eclipses-slight.opt.no': 'No',
  'gd.l3-eclipse.eclipses-slight.ok':
    'Right: it crosses the star’s disc, off center. The depth and length of such a transit tell an astronomer this number.',
  'gd.l3-eclipse.eclipses-slight.no':
    'Compare again: 0.70 is less than 1.1, so the planet crosses the disc.',
  'gd.l3-eclipse.critical.title': 'The largest tilt that still eclipses',
  'gd.l3-eclipse.critical.text':
    'The orbit eclipses while a × sin(i) is below the two radii’s sum, 0.0055. What is the largest inclination, in degrees, that still gives an eclipse?',
  'gd.l3-eclipse.critical.ok':
    'Right: about 0.32°. For randomly oriented orbits, the chance of seeing a transit is about (R* + Rp) ÷ a, here half a percent.',
  'gd.l3-eclipse.critical.no':
    'Solve sin(i) = 0.0055 ÷ a for i, with a = 1, and convert to degrees.',
  'gd.l3-eclipse.flat.title': 'What a flat model keeps, and loses',
  'gd.l3-eclipse.flat.text':
    'A 2-D model has no outside: its observer is either in the plane, when every orbit eclipses, or above it, when none does. Whether a real orbit eclipses is decided by tenths of a degree out of that plane. A flat model is still right for what does not depend on the tilt: the period, the orbit’s size, and the times of conjunction.',
  'gd.l3-eclipse.limits.title': 'Where the model stops',
  'gd.l3-eclipse.limits.text':
    'The star and planet are spheres of fixed radius, used for contacts and drawing; the kernel does not model light, limb darkening or the finite time a transit takes. An eclipse here is geometry: the separation on the sky against the sum of the radii.',

  // --- l3-mutual
  'gd.l3-mutual.title': 'Two orbits’ planes',
  'gd.l3-mutual.summary':
    'Mutual inclination: two orbits with the same inclination need not share a plane, and when a flat model of a planetary system is good enough.',
  'gd.l3-mutual.intro.title': 'The angle between two orbits',
  'gd.l3-mutual.intro.text':
    'Each orbit has its own plane. The angle between two planes is their mutual inclination, and it is what governs how the orbits disturb each other. The inclination alone measures each against the reference plane.',
  'gd.l3-mutual.open.title': 'Two planets, both inclined',
  'gd.l3-mutual.open.text':
    'Open “Investigation: two planets, both inclined 10°” and put the instrument “Orbit” on planet b.',
  'gd.l3-mutual.open.ok':
    'The two planets are open, with the orbit instrument on planet b.',
  'gd.l3-mutual.inclination-b.title': 'Planet b’s inclination',
  'gd.l3-mutual.inclination-b.text':
    'What is planet b’s inclination, in degrees?',
  'gd.l3-mutual.inclination-b.ok': 'Right: 10°.',
  'gd.l3-mutual.inclination-b.no':
    'Not quite. Read i in the reading, or in the orbits table.',
  'gd.l3-mutual.inclination-c.title': 'Planet c’s inclination',
  'gd.l3-mutual.inclination-c.text':
    'And planet c’s? Move the instrument to planet c, or read the orbits table.',
  'gd.l3-mutual.inclination-c.ok': 'Right: 10° too.',
  'gd.l3-mutual.inclination-c.no':
    'Not quite. Planet c’s row of the orbits table has it.',
  'gd.l3-mutual.predict.title': 'Predict: one plane or two?',
  'gd.l3-mutual.predict.text':
    'Both orbits are inclined 10° to the reference plane. Are they in the same plane?',
  'gd.l3-mutual.predict.opt.same': 'Yes, the same plane',
  'gd.l3-mutual.predict.opt.different': 'No, different planes',
  'gd.l3-mutual.between.title': 'Measure the angle between them',
  'gd.l3-mutual.between.text':
    'Choose the instrument “Between two orbits”, from planet b to planet c.',
  'gd.l3-mutual.between.ok':
    'The instrument is measuring the two orbits’ planes.',
  'gd.l3-mutual.mutual.title': 'The mutual inclination',
  'gd.l3-mutual.mutual.text':
    'What angle does the instrument read between the two orbits, in degrees?',
  'gd.l3-mutual.mutual.ok':
    'Right: about 14.1°, although both inclinations are 10°. Their ascending nodes are 90° apart: the planes tilt in different directions.',
  'gd.l3-mutual.mutual.no': 'Not quite. It is in the instrument’s reading.',
  'gd.l3-mutual.planes.title': 'One plane or two?',
  'gd.l3-mutual.planes.text': 'So, are the two orbits in the same plane?',
  'gd.l3-mutual.planes.opt.same': 'Yes, the same plane',
  'gd.l3-mutual.planes.opt.different': 'No, different planes',
  'gd.l3-mutual.planes.ok':
    'Right. Equal inclinations mean equal tilt from the reference plane, not the same plane: the direction of the tilt, the node, matters too.',
  'gd.l3-mutual.planes.no':
    'Look at the mutual inclination again. Two planes in which the orbits lie at 14° to each other are not one plane.',
  'gd.l3-mutual.formula.title': 'The angle, from the elements',
  'gd.l3-mutual.formula.text':
    'The mutual inclination I follows from each orbit’s i and Ω: cos I = cos i₁ cos i₂ + sin i₁ sin i₂ cos(Ω₁ − Ω₂). Work it out from the orbits table’s values, in degrees.',
  'gd.l3-mutual.formula.ok': 'Right: the formula and the instrument agree.',
  'gd.l3-mutual.formula.no':
    'Check the angles: i₁ = i₂ = 10°, and the nodes differ by 90°, so cos(Ω₁ − Ω₂) = 0.',
  'gd.l3-mutual.open-r3.title': 'A system like ours',
  'gd.l3-mutual.open-r3.text':
    'Open “A star and two planets”, a Jupiter and a Saturn, and measure between the inner and outer planet’s orbits.',
  'gd.l3-mutual.open-r3.ok':
    'The instrument is between the two planets’ orbits.',
  'gd.l3-mutual.mutual-r3.title': 'Their mutual inclination',
  'gd.l3-mutual.mutual-r3.text': 'What is it, in degrees?',
  'gd.l3-mutual.mutual-r3.ok':
    'Right: about 1.27°, near the real Jupiter and Saturn’s. The difference of their inclinations, 1.2°, is close, not equal.',
  'gd.l3-mutual.mutual-r3.no': 'Not quite. It is in the instrument’s reading.',
  'gd.l3-mutual.flat-error.title': 'How wrong is a flat model?',
  'gd.l3-mutual.flat-error.text':
    'Laying the outer orbit into the inner orbit’s plane shortens its distances across the shared line of nodes by a fraction 1 − cos I. Work it out for this I.',
  'gd.l3-mutual.flat-error.ok':
    'Right: about 0.00024, two parts in ten thousand.',
  'gd.l3-mutual.flat-error.no':
    'Convert I to radians first if your calculator needs it, then take 1 − cos I.',
  'gd.l3-mutual.flat-enough.title': 'Is a flat model good enough here?',
  'gd.l3-mutual.flat-enough.text':
    'For the planets’ distances from the star and their periods, is a flat model of this system a good approximation?',
  'gd.l3-mutual.flat-enough.opt.yes': 'Yes',
  'gd.l3-mutual.flat-enough.opt.no': 'No',
  'gd.l3-mutual.flat-enough.ok':
    'Right. With a mutual inclination near 1°, a 2-D model errs by a few parts in ten thousand in distance, and this is why the 2-D sandbox can model the Solar System’s planets well.',
  'gd.l3-mutual.flat-enough.no':
    'Compare the error with the precision you need: two parts in ten thousand is below what most investigations measure.',
  'gd.l3-mutual.flat.title': 'What a flat model keeps, and loses',
  'gd.l3-mutual.flat.text':
    'A 2-D model puts every orbit in one plane: its mutual inclinations are all zero. That is a good model of a nearly flat system like ours, and a wrong one wherever orbits are strongly inclined to each other, as the next investigation shows.',
  'gd.l3-mutual.limits.title': 'Where the model stops',
  'gd.l3-mutual.limits.text':
    'The planets here are light and far apart, so their orbits barely change over the time you watch. Over many orbits their planes precess about the total angular momentum; the osculating elements the instrument reads are those of the moment.',

  // --- l3-kozai
  'gd.l3-kozai.title': 'A distant third body',
  'gd.l3-kozai.summary':
    'A hierarchical triple: a far, heavy companion slowly trades an inclined orbit’s tilt for eccentricity, the Kozai-Lidov cycle, while one combination of the two holds.',
  'gd.l3-kozai.intro.title': 'A triple in two tiers',
  'gd.l3-kozai.intro.text':
    'A test particle orbits a star at a distance of 1. Twenty times farther out, a second star of the same mass orbits the pair in the reference plane. The particle’s orbit starts nearly circular and inclined 65° to the outer orbit. The system is hierarchical: an inner orbit and an outer one.',
  'gd.l3-kozai.open.title': 'Open the triple',
  'gd.l3-kozai.open.text':
    'Open “Kozai-Lidov cycles”, keep the star centered, and put the instrument “Orbit” on the particle.',
  'gd.l3-kozai.open.ok':
    'The triple is open, with the orbit instrument on the particle.',
  'gd.l3-kozai.start.title': 'Keep the starting moment',
  'gd.l3-kozai.start.text':
    'Before playing, press “Keep this moment”: later answers read the orbit as it was at the start.',
  'gd.l3-kozai.start.ok': 'The starting moment is kept.',
  'gd.l3-kozai.e0.title': 'The starting eccentricity',
  'gd.l3-kozai.e0.text':
    'What is the particle’s eccentricity at the moment you kept?',
  'gd.l3-kozai.e0.ok': 'Right: 0.01, nearly circular.',
  'gd.l3-kozai.e0.no':
    'Not quite. Read e in the orbits table, particle’s row, at the kept moment.',
  'gd.l3-kozai.i0.title': 'The starting inclination',
  'gd.l3-kozai.i0.text':
    'And its inclination, in degrees? The reference plane is the outer star’s orbital plane, so this is the mutual inclination.',
  'gd.l3-kozai.i0.ok': 'Right: 65°.',
  'gd.l3-kozai.i0.no': 'Not quite. Read i in the orbits table.',
  'gd.l3-kozai.predict.title': 'Predict: over many orbits',
  'gd.l3-kozai.predict.text':
    'The outer star pulls on the particle gently, a little differently on each side of its orbit. Over thousands of the particle’s orbits, what will its eccentricity do?',
  'gd.l3-kozai.predict.opt.stays': 'Stay small',
  'gd.l3-kozai.predict.opt.returns': 'Grow large, then come back',
  'gd.l3-kozai.predict.opt.escapes': 'Grow until the particle escapes',
  'gd.l3-kozai.peak.title': 'Play, and keep the largest eccentricity',
  'gd.l3-kozai.peak.text':
    'Play at ×256 and watch e in the orbits table. When it is at its largest, pause and press “Keep this moment”. Near the peak it changes slowly, so a moment close to it is enough.',
  'gd.l3-kozai.peak.ok': 'The moment is kept, with e well above its start.',
  'gd.l3-kozai.e-peak.title': 'The largest eccentricity',
  'gd.l3-kozai.e-peak.text':
    'What is the particle’s eccentricity at the moment you kept?',
  'gd.l3-kozai.e-peak.ok':
    'Right. It rose from 0.01 to over 0.8: the orbit became a long, thin ellipse.',
  'gd.l3-kozai.e-peak.no':
    'Not quite. The answer is e at the moment you kept: pause there and read the orbits table before playing on.',
  'gd.l3-kozai.i-peak.title': 'The inclination there',
  'gd.l3-kozai.i-peak.text': 'And the inclination at that moment, in degrees?',
  'gd.l3-kozai.i-peak.ok':
    'Right: it fell as e rose, to near 39°. The orbit traded tilt for eccentricity.',
  'gd.l3-kozai.i-peak.no': 'Not quite. Read i in the table at the kept moment.',
  'gd.l3-kozai.outcome.title': 'What does e do?',
  'gd.l3-kozai.outcome.text':
    'Play on and watch. Which did the eccentricity do?',
  'gd.l3-kozai.outcome.opt.stays': 'Stayed small',
  'gd.l3-kozai.outcome.opt.returns': 'Grew large, then came back',
  'gd.l3-kozai.outcome.opt.escapes': 'Grew until the particle escaped',
  'gd.l3-kozai.outcome.ok':
    'Right: it cycles, returning near its start, again and again. This is the Kozai-Lidov cycle, validated in the kernel’s reference problem R6.',
  'gd.l3-kozai.outcome.no':
    'Keep playing past the peak: e falls back, and then rises again.',
  'gd.l3-kozai.k-start.title': 'A quantity that holds: at the start',
  'gd.l3-kozai.k-start.text':
    'Work out √(1 − e²) × cos(i) for the starting moment, from the e and i you found.',
  'gd.l3-kozai.k-start.ok': 'Right: about 0.423.',
  'gd.l3-kozai.k-start.no':
    'Check it: e = 0.01 makes √(1 − e²) almost exactly 1, and cos 65° is about 0.4226.',
  'gd.l3-kozai.k-peak.title': 'And at the peak',
  'gd.l3-kozai.k-peak.text': 'Now √(1 − e²) × cos(i) for the peak moment.',
  'gd.l3-kozai.k-peak.ok': 'Right.',
  'gd.l3-kozai.k-peak.no': 'Check it with the e and i of the kept peak moment.',
  'gd.l3-kozai.kept.title': 'Did it change?',
  'gd.l3-kozai.kept.text':
    'Compare the two values. To within a percent, are they the same?',
  'gd.l3-kozai.kept.opt.same': 'The same',
  'gd.l3-kozai.kept.opt.different': 'Different',
  'gd.l3-kozai.kept.ok':
    'Right. √(1 − e²) cos i is the particle’s angular momentum along the outer orbit’s axis, per unit of its orbit’s size. The outer star’s pull turns the orbit but cannot change that component: as the orbit tilts less, its total angular momentum must shrink, and the orbit becomes eccentric. Angular momentum is exchanged between the orbit’s direction and its shape.',
  'gd.l3-kozai.kept.no':
    'Compare the two numbers you worked out: they differ by less than one percent.',
  'gd.l3-kozai.predicted.title': 'The theory’s peak',
  'gd.l3-kozai.predicted.text':
    'Secular theory, to its lowest order, predicts the largest eccentricity from the starting inclination: e_max = √(1 − (5/3) cos² i₀). Work it out for your i₀.',
  'gd.l3-kozai.predicted.ok':
    'Right: about 0.838. The kernel’s peak is close to it; the small difference is the higher-order terms the formula leaves out.',
  'gd.l3-kozai.predicted.no':
    'Check it: cos 65° squared is about 0.1786; times 5/3 is about 0.298.',
  'gd.l3-kozai.below-critical.title': 'A smaller tilt',
  'gd.l3-kozai.below-critical.text':
    'The formula has no real answer when (5/3) cos² i₀ > 1, that is below i₀ = 39.2°. What would a starting inclination of 30° give?',
  'gd.l3-kozai.below-critical.opt.cycles': 'Eccentricity cycles like these',
  'gd.l3-kozai.below-critical.opt.none': 'No large cycles: e stays small',
  'gd.l3-kozai.below-critical.ok':
    'Right. Below 39.2° the orbit precesses but its eccentricity is not raised. The peak inclination you measured, near 39°, is this critical angle.',
  'gd.l3-kozai.below-critical.no':
    'Below the critical angle, 39.2°, the lowest-order theory gives no eccentricity growth.',
  'gd.l3-kozai.flat.title': 'What a flat model keeps, and loses',
  'gd.l3-kozai.flat.text':
    'In a 2-D model every orbit has zero mutual inclination, which is below the critical angle: a flat triple has no Kozai cycles at all. A flat model is still fine for a triple whose orbits are nearly coplanar, below about 39°, as far as this effect is concerned.',
  'gd.l3-kozai.limits.title': 'Where the model stops',
  'gd.l3-kozai.limits.text':
    'The particle is massless and the stars are points. The kernel integrates the full three-body problem, so it includes the higher-order effects the formula leaves out. It has no general relativity, whose precession would damp these cycles for a tight inner orbit, and no tides. The lab samples the inner orbit coarsely here, 40 ticks an orbit, which changes the picture but not the numbers.',

  // --- Run modes, as the runner names them (Prompt 271)
  'g3.modeLine': 'This step runs in the {mode} run mode.',
  'g3.mode.kepler': 'Kepler-only',
  'g3.mode.nbody': 'N-body',
  'g3.mode.precomputed': 'precomputed',
  'g3.mode.undeclared':
    'This step does not name a run mode, so it cannot be checked.',
  'g3.mode.needsKepler':
    'This step is checked in the Kepler-only run mode. Choose “Kepler-only” under “Run mode”, or press “Do it for me”.',
  'g3.mode.needsNbody':
    'This step needs the N-body run mode: only the integrator lets the bodies pull on each other, and this step is about what that does. Choose “N-body” under “Run mode”, or press “Do it for me”.',
  'g3.mode.needsPrecomputed':
    'This step is checked on a precomputed run played back, which the lab opens from a file.',

  // --- The systems the second curriculum brings
  'gd.target.el-start': 'Investigation: an orbit to edit',
  'gd.target.frames-solar': 'Investigation: two planets, in solar units',
  'gd.target.seen-binary': 'Investigation: a binary star’s orbit, tilted 60°',
  'gd.target.seen-eclipse':
    'Investigation: an eccentric orbit, a quarter of a degree off',
  'gd.target.mutual-two': 'Investigation: two planets, tilted 10° and 25°',
  'gd.target.res-21': 'Investigation: two planets near a 2:1 resonance',

  // --- l3-elements
  'gd.l3-elements.title': 'The language of orbits',
  'gd.l3-elements.summary':
    'Six numbers describe an orbit. Change each in turn, watch what it moves and what it leaves, and find what is not defined when an orbit is flat. Every step runs in the Kepler-only run mode.',
  'gd.l3-elements.intro.title': 'Six numbers and a moment',
  'gd.l3-elements.intro.text':
    'An orbit about a body is fixed by six orbital elements: the semi-major axis a (its size), the eccentricity e (how stretched), the inclination i (how far its plane is tilted from the reference plane), the node Ω (where it rises through that plane), the periapsis ω (where the orbit is closest) and the mean anomaly M (where the planet is along it). The lab reads them from the planet’s position and velocity, and the Apply button runs the other way: it builds a new position and velocity from the numbers you type. The run mode here is Kepler-only: the planet follows exactly its own two-body orbit and nothing disturbs it, which is the right mode to learn what the numbers mean.',
  'gd.l3-elements.open.title': 'Open an orbit to edit',
  'gd.l3-elements.open.text':
    'Choose “Kepler-only” under “Run mode”. Open “Investigation: an orbit to edit” and put the instrument “Orbit” on the planet. The planet orbits a star of mass 1; lengths are in code units, with G = 1.',
  'gd.l3-elements.open.ok':
    'The orbit is open in the Kepler-only run mode, with the orbit instrument on the planet.',
  'gd.l3-elements.panel.title': 'Open the orbit editor',
  'gd.l3-elements.panel.text':
    'Press “Orbit editor and sky view”. Its first section, “Orbit”, shows the six elements and says what they are measured about, in which axes, at what moment, in what time scale and in which units. Press “Load the current elements” to fill the fields.',
  'gd.l3-elements.panel.ok': 'The orbit editor is open.',
  'gd.l3-elements.predict-a.title': 'Predict: double the semi-major axis',
  'gd.l3-elements.predict-a.text':
    'You are about to make the orbit twice as large, a = 2, keeping everything else. How will the period change? Kepler’s third law is T² ∝ a³.',
  'gd.l3-elements.predict-a.opt.same': 'It stays the same',
  'gd.l3-elements.predict-a.opt.double': 'It doubles',
  'gd.l3-elements.predict-a.opt.x283': 'It grows by a factor of 2.83',
  'gd.l3-elements.predict-a.opt.x4': 'It grows by a factor of 4',
  'gd.l3-elements.edit-a.title': 'Make it twice as large',
  'gd.l3-elements.edit-a.text':
    'Type 2 in the field for a and press Apply. The run goes on from this instant on the new orbit; only the planet changes, and it keeps its tilt, its shape and its place along the orbit.',
  'gd.l3-elements.edit-a.ok': 'The orbit now has a = 2.',
  'gd.l3-elements.period.title': 'The new period',
  'gd.l3-elements.period.text':
    'Read the period from the instrument. What is it, in code time? (At a = 1 it was 2π, about 6.28.)',
  'gd.l3-elements.period.ok': 'Right: about 17.77, which is 2π × 2^1.5.',
  'gd.l3-elements.period.no':
    'Not quite. The period is 2π times the square root of a³ over the star’s mass (1 here); with a = 2 that is 2π × 2.83.',
  'gd.l3-elements.ratio.title': 'Which prediction was right?',
  'gd.l3-elements.ratio.text':
    'Compare the new period with the old one, 2π. By what factor did it grow?',
  'gd.l3-elements.ratio.opt.same': 'It stayed the same',
  'gd.l3-elements.ratio.opt.double': 'It doubled',
  'gd.l3-elements.ratio.opt.x283': 'It grew by a factor of 2.83',
  'gd.l3-elements.ratio.opt.x4': 'It grew by a factor of 4',
  'gd.l3-elements.ratio.ok':
    'Right: 2^1.5 = 2.83. A bigger orbit is slower in two ways, a longer path and a lower speed, and the period grows faster than the size.',
  'gd.l3-elements.ratio.no':
    'Compare the two periods: 17.77 ÷ 6.28. A period that went with the size would double; one that went with its square would grow four times.',
  'gd.l3-elements.edit-e.title': 'Stretch it',
  'gd.l3-elements.edit-e.text':
    'Type 0.7 in the field for e and press Apply. The orbit keeps its size and its tilt and becomes a long ellipse.',
  'gd.l3-elements.edit-e.ok': 'The orbit now has e = 0.7.',
  'gd.l3-elements.periapsis.title': 'The closest approach',
  'gd.l3-elements.periapsis.text':
    'How close does the planet come to the star, at periapsis? It is a × (1 − e).',
  'gd.l3-elements.periapsis.ok':
    'Right: 0.6. The apoapsis, the farthest point, is a × (1 + e), 3.4.',
  'gd.l3-elements.periapsis.no':
    'Not quite. With a = 2 and e = 0.7, the closest distance is 2 × (1 − 0.7).',
  'gd.l3-elements.edit-i.title': 'Tilt it',
  'gd.l3-elements.edit-i.text':
    'Type 60 in the field for i and press Apply. The orbit now makes an angle of 60° with the reference plane.',
  'gd.l3-elements.edit-i.ok': 'The orbit now has i = 60°.',
  'gd.l3-elements.observe.title': 'Look at it from the side',
  'gd.l3-elements.observe.text':
    'Under “The sky, seen by an observer”, set the azimuth to −90 and the elevation to 0, and press “Set the observer”. This observer looks along the reference plane, from −y.',
  'gd.l3-elements.observe.ok':
    'The observer is set: the sky figure shows the orbit as seen along the reference plane.',
  'gd.l3-elements.height.title': 'How high does it climb?',
  'gd.l3-elements.height.text':
    'In the sky table, “Highest point on the sky” reads how far the orbit rises above the reference plane, in code units. What does it read?',
  'gd.l3-elements.height.ok':
    'Right: about 0.54. How high a tilted orbit climbs depends on its shape and on where its periapsis points as well as on i, so it is less than a sin i, 1.73.',
  'gd.l3-elements.height.no':
    'Not quite. Read “Highest point on the sky” in the sky table, with the observer at azimuth −90 and elevation 0.',
  'gd.l3-elements.before-node.title': 'Keep the orbit as it is',
  'gd.l3-elements.before-node.text':
    'Pause, and press “Keep this moment” to record the orbit before the next change.',
  'gd.l3-elements.before-node.ok': 'The orbit is recorded.',
  'gd.l3-elements.edit-node.title': 'Turn the node',
  'gd.l3-elements.edit-node.text':
    'Type 100 in the field for Ω (it was 40) and press Apply. The orbit keeps its tilt and its shape and swings round the vertical axis.',
  'gd.l3-elements.edit-node.ok': 'The node is now Ω = 100°.',
  'gd.l3-elements.after-node.title': 'Keep the turned orbit',
  'gd.l3-elements.after-node.text': 'Press “Keep this moment” again.',
  'gd.l3-elements.after-node.ok': 'The turned orbit is recorded.',
  'gd.l3-elements.node-tilt.title': 'How far did the plane turn?',
  'gd.l3-elements.node-tilt.text':
    'The inclination did not change, i = 60° both times, yet the orbit’s plane did. What is the angle between the plane before and after? It is the angle between the orbits’ normals, with cos θ = cos²i + sin²i cos ΔΩ.',
  'gd.l3-elements.node-tilt.ok':
    'Right: about 51.3°. Turning the node by 60° at i = 60° turns the plane by 51°, because a tilt about a different axis is a different plane.',
  'gd.l3-elements.node-tilt.no':
    'Not quite. With i = 60° and ΔΩ = 60°, cos θ = 0.25 + 0.75 × 0.5.',
  'gd.l3-elements.predict-flat.title': 'Predict: make the orbit flat',
  'gd.l3-elements.predict-flat.text':
    'You are about to set the inclination to 0, so the orbit lies in the reference plane. An orbit in the plane does not rise through it anywhere, so where its node is has no meaning. What will the editor do with Ω?',
  'gd.l3-elements.predict-flat.opt.kept': 'Keep the old Ω',
  'gd.l3-elements.predict-flat.opt.zero':
    'Read Ω as 0 and move the angle into ω',
  'gd.l3-elements.edit-flat.title': 'Flatten it',
  'gd.l3-elements.edit-flat.text': 'Type 0 in the field for i and press Apply.',
  'gd.l3-elements.edit-flat.ok': 'The orbit now lies in the reference plane.',
  'gd.l3-elements.flat-omega.title': 'What does ω read now?',
  'gd.l3-elements.flat-omega.text':
    'Press “Load the current elements” and read ω, in degrees. What is it? Compare it with the old Ω and ω.',
  'gd.l3-elements.flat-omega.ok':
    'Right. Ω reads 0, and ω is what Ω and ω were added together: the angle from the reference direction to the periapsis, measured in the plane. That angle is well defined when the node is not.',
  'gd.l3-elements.flat-omega.no':
    'Not quite. Add the old Ω and the old ω; in a flat orbit the lab measures the periapsis from the reference direction.',
  'gd.l3-elements.flat-node.title': 'What became of the node?',
  'gd.l3-elements.flat-node.text': 'What does Ω read now?',
  'gd.l3-elements.flat-node.opt.kept': 'It kept its old value',
  'gd.l3-elements.flat-node.opt.zero': 'It reads 0',
  'gd.l3-elements.flat-node.ok':
    'Right: 0, by convention. The node is where the orbit crosses the plane, and a flat orbit never crosses it; the reading puts that angle into ω so the orbit is still described. A flat model is one in which the node does not exist.',
  'gd.l3-elements.flat-node.no':
    'Read Ω in the fields, after pressing “Load the current elements”.',
  'gd.l3-elements.edit-m.title': 'Move the planet along its orbit',
  'gd.l3-elements.edit-m.text':
    'Pause. Type 90 in the field for M and press Apply. Only the planet’s place on the orbit changes; the orbit stays as it is.',
  'gd.l3-elements.edit-m.ok': 'The planet is at M = 90°.',
  'gd.l3-elements.kept-m.title': 'Keep this moment',
  'gd.l3-elements.kept-m.text': 'Press “Keep this moment”.',
  'gd.l3-elements.kept-m.ok': 'The moment is recorded.',
  'gd.l3-elements.distance.title': 'How far from the star?',
  'gd.l3-elements.distance.text':
    'How far is the planet from the star at this moment, in code units? It is a × (1 − e cos E), where E solves M = E − e sin E.',
  'gd.l3-elements.distance.ok':
    'Right: about 2.77, already farther out than a, 2. A quarter of an orbit in time carries the planet more than a quarter of the way round, because it moves fastest near the star.',
  'gd.l3-elements.distance.no':
    'Not quite. Solve E − 0.7 sin E = π/2 for E (about 2.15), then compute 2 × (1 − 0.7 cos E). Or read the distance from the orbit instrument.',
  'gd.l3-elements.flat.title': 'What a flat model keeps, and loses',
  'gd.l3-elements.flat.text':
    'A 2-D model has four of these numbers: a, e, ω (from the reference direction) and M. It has no i, because there is nowhere to tilt to, and no Ω, because a flat orbit has no node. A flat model is therefore right for the size, shape, period and timing of an orbit, and cannot say what a tilted orbit would look like from outside or how it would turn.',
  'gd.l3-elements.limits.title': 'Where the model stops',
  'gd.l3-elements.limits.text':
    'The elements here are osculating: the two-body orbit the planet would follow if the pull of everything else stopped at this instant. In the Kepler-only run mode that is exactly the orbit followed forever. In the N-body run mode, other bodies pull on the planet and the elements drift; the editor changes only the body you choose and what orbits it. The star and every other body are left bit for bit as they were.',

  // --- l3-frames
  'gd.l3-frames.title': 'Changing frames',
  'gd.l3-frames.summary':
    'The same two planets measured against the ecliptic, the equator, their invariable plane and an observer’s sky: three of the six elements change with the plane, three do not.',
  'gd.l3-frames.intro.title': 'The same orbit in different axes',
  'gd.l3-frames.intro.text':
    'An inclination is an angle from a reference plane, and the plane is a choice. Two planets orbit a star of one solar mass in solar units: a light one at 1 AU (b, 3 × 10⁻⁵ of the star) and a heavy one at 3 AU (c, a thousandth of the star, about a Jupiter mass). These systems are invented; no real planets stand behind them. Changing the plane changes how the numbers are measured, not where anything is.',
  'gd.l3-frames.open.title': 'Open the two planets',
  'gd.l3-frames.open.text':
    'Choose “Kepler-only” under “Run mode”. Open “Investigation: two planets, in solar units”, put the instrument “Orbit” on planet b, and choose “The system’s own axes (the ecliptic for a solar system)” under “Reference plane”.',
  'gd.l3-frames.open.ok':
    'The planets are open, with the orbit instrument on planet b in the system’s own axes.',
  'gd.l3-frames.i-system.title': 'Planet b’s tilt from the ecliptic',
  'gd.l3-frames.i-system.text':
    'What is planet b’s inclination, in degrees, in the system’s own axes?',
  'gd.l3-frames.i-system.ok': 'Right: 8°.',
  'gd.l3-frames.i-system.no':
    'Not quite. Read i in the reading, with the reference plane at the system’s own axes.',
  'gd.l3-frames.predict-eq.title': 'Predict: measure it from the equator',
  'gd.l3-frames.predict-eq.text':
    'The Earth’s equator is tilted from the ecliptic by the obliquity, 23.44° (the value of the sky kernel, for J2000). If you measure planet b’s inclination from the equatorial plane instead, will it be smaller, the same, or larger?',
  'gd.l3-frames.predict-eq.opt.smaller': 'Smaller',
  'gd.l3-frames.predict-eq.opt.same': 'The same',
  'gd.l3-frames.predict-eq.opt.larger': 'Larger',
  'gd.l3-frames.plane-eq.title': 'Choose the equatorial plane',
  'gd.l3-frames.plane-eq.text':
    'Under “Reference plane”, choose “Equatorial (the ecliptic tilted by the obliquity)”. The numbers are re-read in the new axes; nothing moves.',
  'gd.l3-frames.plane-eq.ok': 'The reference plane is the equatorial plane.',
  'gd.l3-frames.i-eq.title': 'Planet b’s tilt from the equator',
  'gd.l3-frames.i-eq.text': 'What is planet b’s inclination now?',
  'gd.l3-frames.i-eq.ok':
    'Right: about 30.0°. Neither 8° + 23.44° nor 23.44° − 8°: the nodes of the two planes decide how the tilts combine.',
  'gd.l3-frames.i-eq.no':
    'Not quite. Read i again in the reading, with the equatorial plane chosen.',
  'gd.l3-frames.larger.title': 'Which prediction was right?',
  'gd.l3-frames.larger.text':
    'Compared with the ecliptic, is the inclination from the equator smaller, the same, or larger?',
  'gd.l3-frames.larger.opt.smaller': 'Smaller',
  'gd.l3-frames.larger.opt.same': 'The same',
  'gd.l3-frames.larger.opt.larger': 'Larger',
  'gd.l3-frames.larger.ok':
    'Right, it is larger here. It would not have to be: from another node it could be smaller. The inclination belongs to the pair of the orbit and the plane.',
  'gd.l3-frames.larger.no':
    'Compare the two readings: 8° from the ecliptic, and what you read from the equator.',
  'gd.l3-frames.changed.title': 'What changed, and what did not?',
  'gd.l3-frames.changed.text':
    'Change the plane back and forth and watch the six elements. How many change when the plane changes?',
  'gd.l3-frames.changed.opt.all': 'All six',
  'gd.l3-frames.changed.opt.three': 'Three: i, Ω and ω',
  'gd.l3-frames.changed.opt.one': 'One: i',
  'gd.l3-frames.changed.ok':
    'Right: i, Ω and ω. Turning the axes does not change the size of an orbit (a), its shape (e), or where the planet is along it (M); it changes the angles that locate the orbit’s plane and its long axis.',
  'gd.l3-frames.changed.no':
    'Compare a, e and M in the system’s axes and in the equatorial plane. Which of the six differ?',
  'gd.l3-frames.plane-inv.title': 'Choose the invariable plane',
  'gd.l3-frames.plane-inv.text':
    'Under “Reference plane”, choose “Invariable plane (total angular momentum)”. The total angular momentum of the bodies about their center of mass points along its +z axis, and it does not change in an isolated system.',
  'gd.l3-frames.plane-inv.ok': 'The reference plane is the invariable plane.',
  'gd.l3-frames.i-b-inv.title': 'Planet b from the invariable plane',
  'gd.l3-frames.i-b-inv.text':
    'What is planet b’s inclination now, in degrees?',
  'gd.l3-frames.i-b-inv.ok': 'Right: about 13.3°.',
  'gd.l3-frames.i-b-inv.no':
    'Not quite. Read i for planet b, with the invariable plane chosen.',
  'gd.l3-frames.i-c-inv.title': 'Planet c from the invariable plane',
  'gd.l3-frames.i-c-inv.text':
    'Put the instrument “Orbit” on planet c. What is its inclination now?',
  'gd.l3-frames.i-c-inv.ok':
    'Right: about 0.23°. The heavy planet carries almost all of the angular momentum, so the invariable plane is almost its own plane.',
  'gd.l3-frames.i-c-inv.no':
    'Not quite. Put the instrument on planet c and read i, with the invariable plane chosen.',
  'gd.l3-frames.closer.title': 'Which orbit lies nearer the invariable plane?',
  'gd.l3-frames.closer.text':
    'Which planet’s orbit is closer to the invariable plane?',
  'gd.l3-frames.closer.opt.b': 'Planet b, the light one',
  'gd.l3-frames.closer.opt.c': 'Planet c, the heavy one',
  'gd.l3-frames.closer.ok':
    'Right: planet c. A plane tied to the angular momentum follows the mass, which is why astronomers use it as the plane to measure other tilts from.',
  'gd.l3-frames.closer.no':
    'Compare the two inclinations from the invariable plane: the smaller one is nearer.',
  'gd.l3-frames.plane-sky.title': 'Choose an observer’s sky',
  'gd.l3-frames.plane-sky.text':
    'Set the observer to azimuth −90 and elevation 0 (under “The sky, seen by an observer”), and choose “An observer’s sky (line of sight along z)” under “Reference plane”. Now +z points at the observer and an inclination is measured from face-on.',
  'gd.l3-frames.plane-sky.ok': 'The reference plane is the observer’s sky.',
  'gd.l3-frames.i-sky.title': 'Planet b on the sky',
  'gd.l3-frames.i-sky.text':
    'Put the instrument “Orbit” on planet b. What is its inclination from this observer’s face-on direction?',
  'gd.l3-frames.i-sky.ok':
    'Right: about 83.9°. A 90° tilt would be edge-on; this orbit is seen almost, but not exactly, along its plane.',
  'gd.l3-frames.i-sky.no':
    'Not quite. Read i for planet b, with the observer’s sky chosen.',
  'gd.l3-frames.flat.title': 'What a flat model keeps, and loses',
  'gd.l3-frames.flat.text':
    'A flat model has one plane, so a frame can only be turned within it: the periapsis ω moves with the axes and nothing else does. With a third axis, the choice of plane decides what an inclination means, and a published inclination is only a number until the plane it is measured from is named. The model is still right about sizes, shapes, periods and the planet’s place along its orbit; those do not depend on the frame.',
  'gd.l3-frames.limits.title': 'Where the model stops',
  'gd.l3-frames.limits.text':
    'The planes here are fixed axes, turned at read time. The invariable plane is computed from the bodies’ angular momentum about their center of mass; the equatorial plane uses the J2000 obliquity and applies to systems in solar units only. The Kepler-only run mode holds every orbit fixed, so it cannot show that the planets pull on each other’s planes. In the N-body run mode planet b’s node turns in the invariable plane, regressing by about 1.27 degrees per 100 orbits of the inner planet, which a Kepler-only run cannot show.',

  // --- l3-seen
  'gd.l3-seen.title': 'Seen from here',
  'gd.l3-seen.summary':
    'What an orbit looks like from a chosen direction: the apparent ellipse of a binary star, the line of sight that makes a transit, and the one number a shift of periapsis can spoil.',
  'gd.l3-seen.intro.title': 'An orbit projected onto the sky',
  'gd.l3-seen.intro.text':
    'An observer sees an orbit flattened onto the sky, the plane across their line of sight. A circle seen obliquely becomes an ellipse, and a true ellipse seen obliquely is another ellipse that is not the first one’s shape. An astronomer measuring a binary star sees only this apparent orbit. In this lab the observer is a direction, azimuth and elevation, and the numbers that follow are computed for it from the same positions and velocities as every other reading.',
  'gd.l3-seen.open-binary.title': 'Open a binary star',
  'gd.l3-seen.open-binary.text':
    'Choose “Kepler-only” under “Run mode”. Open “Investigation: a binary star’s orbit, tilted 60°” and put the instrument “Orbit” on the companion. Open “Orbit editor and sky view”.',
  'gd.l3-seen.open-binary.ok':
    'The binary is open in the Kepler-only run mode, with the orbit instrument on the companion.',
  'gd.l3-seen.observe.title': 'Observe it from the side',
  'gd.l3-seen.observe.text':
    'Set the observer to azimuth −90 and elevation 0, press “Set the observer”, and then “Show the numbers in this observer’s sky”. The reference plane becomes this observer’s sky.',
  'gd.l3-seen.observe.ok': 'The reference plane is this observer’s sky.',
  'gd.l3-seen.i-sky.title': 'The tilt as this observer measures it',
  'gd.l3-seen.i-sky.text':
    'The orbit is tilted 60° from the system’s reference plane. What is its inclination from this observer’s face-on direction, in degrees?',
  'gd.l3-seen.i-sky.ok':
    'Right: about 41.4°. An observer’s inclination is the angle between the line of sight and the orbit’s normal, and so depends on where the observer stands.',
  'gd.l3-seen.i-sky.no':
    'Not quite. Read i in the reading for the companion, with the observer’s sky chosen.',
  'gd.l3-seen.predict-centre.title':
    'Predict: is the star at the center of the apparent orbit?',
  'gd.l3-seen.predict-centre.text':
    'The star sits at one focus of the true orbit, not at its center, because the orbit is eccentric (e = 0.5). In the apparent ellipse, projected onto the sky, will the star be at the center?',
  'gd.l3-seen.predict-centre.opt.yes': 'Yes, at the center',
  'gd.l3-seen.predict-centre.opt.no': 'No, off center',
  'gd.l3-seen.major.title': 'The apparent ellipse: its long half',
  'gd.l3-seen.major.text':
    'Read the apparent semi-major axis from the table “The orbit on the sky”, in units of the true semi-major axis.',
  'gd.l3-seen.major.ok':
    'Right: about 0.867. The apparent orbit’s long axis is shorter than the true one, because the plane is tilted away from the sky.',
  'gd.l3-seen.major.no':
    'Not quite. Read “Apparent semi-major axis” in the sky table.',
  'gd.l3-seen.minor.title': 'The apparent ellipse: its short half',
  'gd.l3-seen.minor.text':
    'Read the apparent semi-minor axis from the same table.',
  'gd.l3-seen.minor.ok': 'Right: about 0.749.',
  'gd.l3-seen.minor.no':
    'Not quite. Read “Apparent semi-minor axis” in the sky table.',
  'gd.l3-seen.offset.title': 'How far off center is the star?',
  'gd.l3-seen.offset.text':
    'How far is the star from the center of the apparent ellipse, in units of the true semi-major axis? The true offset is a × e, 0.5; projection shortens it.',
  'gd.l3-seen.offset.ok':
    'Right: about 0.376. Projection keeps an ellipse’s center but not its foci, so the star is off center and, in general, not at a focus of the apparent ellipse either. Astronomers fit the apparent ellipse and the star’s place together to recover the true orbit.',
  'gd.l3-seen.offset.no':
    'Not quite. The offset is the distance from the star to the middle of the apparent ellipse; in the sky figure it is the star’s distance from the figure’s center.',
  'gd.l3-seen.centre.title': 'Which prediction was right?',
  'gd.l3-seen.centre.text': 'Is the star at the center of the apparent orbit?',
  'gd.l3-seen.centre.opt.yes': 'Yes, at the center',
  'gd.l3-seen.centre.opt.no': 'No, off center',
  'gd.l3-seen.centre.ok':
    'Right, off center. An eccentric orbit’s star is at a focus, and seeing it from outside does not move it to the middle.',
  'gd.l3-seen.centre.no':
    'Compare the offset with 0: if it is not 0, the star is off center.',
  'gd.l3-seen.open-eclipse.title': 'Open an eclipsing system',
  'gd.l3-seen.open-eclipse.text':
    'Open “Investigation: an eccentric orbit, a quarter of a degree off”, still in the Kepler-only run mode, with the observer at azimuth −90 and elevation 0, and put the instrument “Orbit” on the planet. The planet’s orbit has e = 0.3 and is tilted a quarter of a degree from the reference plane, which this observer looks along, with its periapsis at the conjunction.',
  'gd.l3-seen.open-eclipse.ok':
    'The eclipsing system is open, with the observer set.',
  'gd.l3-seen.impact.title': 'How close does it pass the star?',
  'gd.l3-seen.impact.text':
    'In the sky table, “Impact parameter, in star radii” is the planet’s closest approach to the star’s center on the sky. What does it read?',
  'gd.l3-seen.impact.ok':
    'Right: about 0.61 star radii. At the conjunction the planet is at periapsis, 0.7 of the semi-major axis from the star, so the same tilt takes it less far from the line of sight than on a circle.',
  'gd.l3-seen.impact.no':
    'Not quite. Read “Impact parameter, in star radii” in the sky table.',
  'gd.l3-seen.transits.title': 'Does it transit?',
  'gd.l3-seen.transits.text':
    'A transit needs an impact parameter below 1.1, the star’s radius plus the planet’s, in star radii. Does the planet pass in front of the star?',
  'gd.l3-seen.transits.opt.yes': 'Yes',
  'gd.l3-seen.transits.opt.no': 'No',
  'gd.l3-seen.transits.ok':
    'Right: 0.61 is below 1.1, and the table says it passes in front of the star.',
  'gd.l3-seen.transits.no':
    'Compare the impact parameter with 1.1, or read “Passes in front of the star”.',
  'gd.l3-seen.predict-omega.title': 'Predict: turn the periapsis the other way',
  'gd.l3-seen.predict-omega.text':
    'You are about to turn the long axis half way round, from ω = 270° to ω = 90°, keeping the tilt. The conjunction is then at apoapsis, 1.3 times as far from the star as the semi-major axis. Will the transit be kept?',
  'gd.l3-seen.predict-omega.opt.kept': 'It is kept',
  'gd.l3-seen.predict-omega.opt.lost': 'It is lost',
  'gd.l3-seen.edit-omega.title': 'Turn the periapsis',
  'gd.l3-seen.edit-omega.text': 'Type 90 in the field for ω and press Apply.',
  'gd.l3-seen.edit-omega.ok': 'The periapsis is now at ω = 90°.',
  'gd.l3-seen.impact-after.title': 'How close does it pass now?',
  'gd.l3-seen.impact-after.text':
    'Read the impact parameter again, in star radii.',
  'gd.l3-seen.impact-after.ok':
    'Right: about 1.13 star radii, just outside the contact distance of 1.1.',
  'gd.l3-seen.impact-after.no':
    'Not quite. Read “Impact parameter, in star radii” again, after pressing Apply.',
  'gd.l3-seen.outcome.title': 'Which prediction was right?',
  'gd.l3-seen.outcome.text': 'Is the transit kept?',
  'gd.l3-seen.outcome.opt.kept': 'It is kept',
  'gd.l3-seen.outcome.opt.lost': 'It is lost',
  'gd.l3-seen.outcome.ok':
    'Right, it is lost. The orbit’s tilt did not change, and a transit depends on the planet’s distance at the conjunction as much as on the tilt: 0.7 of a at periapsis, 1.3 at apoapsis. Which side the long axis points to is a matter of the line of sight, and one that astronomers have to measure.',
  'gd.l3-seen.outcome.no':
    'Compare the new impact parameter with 1.1, or read “Passes in front of the star”.',
  'gd.l3-seen.restore.title': 'Turn it back',
  'gd.l3-seen.restore.text': 'Type 270 in the field for ω and press Apply.',
  'gd.l3-seen.restore.ok':
    'The periapsis is back at ω = 270°, and the planet transits.',
  'gd.l3-seen.chord.title': 'How long is the chord?',
  'gd.l3-seen.chord.text':
    'The planet crosses the circle of contact, of radius 1.1 star radii, along a chord. Read half of it, in star radii, from the sky table, and compare it with √(1.1² − b²), with b the impact parameter.',
  'gd.l3-seen.chord.ok':
    'Right: about 0.91 star radii. The length of a transit, set by the chord and the planet’s speed there, is how astronomers recover the impact parameter.',
  'gd.l3-seen.chord.no':
    'Not quite. Read “Half the chord across the contact circle” in the sky table.',
  'gd.l3-seen.flat.title': 'What a flat model keeps, and loses',
  'gd.l3-seen.flat.text':
    'A flat model has an observer either in the plane or above it. In the plane, every orbit is edge-on and every orbit eclipses; above it, every orbit is a face-on ellipse the shape of the true one. Neither has an apparent ellipse that differs from the true orbit, a star off center or a transit that comes and goes with the periapsis. A flat model is still right about periods and about times of conjunction.',
  'gd.l3-seen.limits.title': 'Where the model stops',
  'gd.l3-seen.limits.text':
    'The apparent orbit is computed from the two-body orbit as a geometric projection: no light travel time, no stellar aberration, no proper motion and no limb darkening. The bodies are spheres of fixed radius used for contact only. The sky here is a direction chosen by hand; a real observer’s direction is itself a measurement with an uncertainty.',

  // --- l3-tilts
  'gd.l3-tilts.title': 'Mutual inclinations',
  'gd.l3-tilts.summary':
    'The angle between two orbits’ planes is not the difference of their tilts. Measure it, find where it goes in the invariable plane, and see what it does to a triple. Run modes: Kepler-only for the geometry, N-body for the cycle.',
  'gd.l3-tilts.intro.title': 'The angle between two planes',
  'gd.l3-tilts.intro.text':
    'Two orbits tilted by 10° and 25° from the reference plane could differ by as little as 15° or as much as 35°, depending on where their nodes are. The mutual inclination is the angle between their normals, and it is the angle that governs how the orbits disturb each other. The first part of this investigation measures it in the Kepler-only run mode, because that is only geometry. The last part watches a triple star cycle, which needs the N-body run mode: a Kepler-only run holds every orbit fixed, so it cannot show one.',
  'gd.l3-tilts.open.title': 'Open the two planets',
  'gd.l3-tilts.open.text':
    'Choose “Kepler-only” under “Run mode”. Open “Investigation: two planets, tilted 10° and 25°”, choose the instrument “Between two orbits”, with planet b and planet c, and “The system’s own axes” under “Reference plane”. Planet b is light, planet c has a thousandth of the star’s mass.',
  'gd.l3-tilts.open.ok':
    'The planets are open, with the instrument between their orbits.',
  'gd.l3-tilts.predict.title': 'Predict: the angle between the two orbits',
  'gd.l3-tilts.predict.text':
    'Planet b is tilted 10° from the reference plane, with its node at 0°; planet c is tilted 25°, with its node at 120°. Compared with 15°, the difference of their tilts, is the angle between their orbits smaller, the same, or larger?',
  'gd.l3-tilts.predict.opt.less': 'Smaller than 15°',
  'gd.l3-tilts.predict.opt.same': 'The same, 15°',
  'gd.l3-tilts.predict.opt.more': 'Larger than 15°',
  'gd.l3-tilts.mutual.title': 'The mutual inclination',
  'gd.l3-tilts.mutual.text':
    'Read the angle between the two orbits from the instrument, in degrees.',
  'gd.l3-tilts.mutual.ok':
    'Right: about 31.1°. It lies between the difference of the tilts, 15°, and their sum, 35°, and it depends on the nodes: for equal nodes it would be 15°, for nodes opposite, 35°.',
  'gd.l3-tilts.mutual.no':
    'Not quite. Read the angle between the orbits in the instrument’s reading.',
  'gd.l3-tilts.compare.title': 'Which prediction was right?',
  'gd.l3-tilts.compare.text':
    'Compared with 15°, the difference of the tilts, is the mutual inclination smaller, the same, or larger?',
  'gd.l3-tilts.compare.opt.less': 'Smaller than 15°',
  'gd.l3-tilts.compare.opt.same': 'The same, 15°',
  'gd.l3-tilts.compare.opt.more': 'Larger than 15°',
  'gd.l3-tilts.compare.ok':
    'Right, larger. The difference of the tilts is the mutual inclination only when the nodes are the same, and the sum only when they are opposite.',
  'gd.l3-tilts.compare.no': 'Compare the mutual inclination you read with 15°.',
  'gd.l3-tilts.plane-inv.title': 'Measure from the invariable plane',
  'gd.l3-tilts.plane-inv.text':
    'Choose “Invariable plane (total angular momentum)” under “Reference plane”, and put the instrument “Orbit” on planet b.',
  'gd.l3-tilts.plane-inv.ok': 'The reference plane is the invariable plane.',
  'gd.l3-tilts.i-b.title': 'Planet b from the invariable plane',
  'gd.l3-tilts.i-b.text': 'What is planet b’s inclination now, in degrees?',
  'gd.l3-tilts.i-b.ok': 'Right: about 30.6°.',
  'gd.l3-tilts.i-b.no':
    'Not quite. Read i for planet b, with the invariable plane chosen.',
  'gd.l3-tilts.i-c.title': 'Planet c from the invariable plane',
  'gd.l3-tilts.i-c.text':
    'Put the instrument “Orbit” on planet c. What is its inclination now?',
  'gd.l3-tilts.i-c.ok': 'Right: about 0.55°.',
  'gd.l3-tilts.i-c.no':
    'Not quite. Read i for planet c, with the invariable plane chosen.',
  'gd.l3-tilts.sum.title': 'Add the two tilts',
  'gd.l3-tilts.sum.text':
    'Add the two inclinations from the invariable plane. How does the sum compare with the mutual inclination you read?',
  'gd.l3-tilts.sum.ok':
    'Right: 31.1°, the mutual inclination. The two orbits lie on opposite sides of the invariable plane, so the angle between them is the sum of their angles to it. The heavy planet is nearly in the plane, and the light one carries nearly all the angle.',
  'gd.l3-tilts.sum.no': 'Add the two inclinations you read.',
  'gd.l3-tilts.closer.title': 'Which orbit is nearer the plane?',
  'gd.l3-tilts.closer.text':
    'Which planet’s orbit is nearer the invariable plane?',
  'gd.l3-tilts.closer.opt.b': 'Planet b, the light one',
  'gd.l3-tilts.closer.opt.c': 'Planet c, the heavy one',
  'gd.l3-tilts.closer.ok':
    'Right: planet c. In a pair of orbits the angular momentum is shared in proportion to mass and distance, and the heavy one pins the plane.',
  'gd.l3-tilts.closer.no':
    'Compare the two inclinations from the invariable plane.',
  'gd.l3-tilts.open-r6.title': 'A triple, in the N-body run mode',
  'gd.l3-tilts.open-r6.text':
    'Choose “N-body” under “Run mode”. Open “Kozai-Lidov cycles (R6)”, choose the instrument “Between two orbits”, with the particle and the perturber, and “Keep centered” on the star. The reference problem is a particle on a close orbit about a star, with a distant perturber orbiting that star on a tilted plane.',
  'gd.l3-tilts.open-r6.ok': 'The triple is open in the N-body run mode.',
  'gd.l3-tilts.start.title': 'Keep the starting moment',
  'gd.l3-tilts.start.text':
    'Pause, and press “Keep this moment” to record the start.',
  'gd.l3-tilts.start.ok': 'The starting moment is kept.',
  'gd.l3-tilts.mutual-0.title': 'The angle at the start',
  'gd.l3-tilts.mutual-0.text':
    'Read the angle between the particle’s orbit and the perturber’s, in degrees.',
  'gd.l3-tilts.mutual-0.ok':
    'Right: 65°, above the critical angle of 39.2° for a Kozai-Lidov cycle.',
  'gd.l3-tilts.mutual-0.no':
    'Not quite. Read the angle between the two orbits.',
  'gd.l3-tilts.peak.title': 'Run to the first eccentricity peak',
  'gd.l3-tilts.peak.text':
    'Set the speed to ×256 and play. When the particle’s eccentricity is at least 0.7, press “Keep this moment”.',
  'gd.l3-tilts.peak.ok': 'The peak moment is kept.',
  'gd.l3-tilts.mutual-peak.title': 'The angle at the peak',
  'gd.l3-tilts.mutual-peak.text':
    'Read the angle between the two orbits at the moment you kept, in degrees.',
  'gd.l3-tilts.mutual-peak.ok':
    'Right: about 39.4°. As the eccentricity rises the mutual inclination falls to the critical angle: the cycle trades tilt for eccentricity.',
  'gd.l3-tilts.mutual-peak.no':
    'Not quite. Read the angle between the two orbits at the kept peak moment.',
  'gd.l3-tilts.kept.title': 'What is kept?',
  'gd.l3-tilts.kept.text':
    'Work out √(1 − e²) × cos i for the particle at the start and at the peak, with e and i from its orbit about the star, measured from the reference plane. Is it the same at the two moments, to within a few hundredths, or different?',
  'gd.l3-tilts.kept.opt.same': 'The same',
  'gd.l3-tilts.kept.opt.different': 'Different',
  'gd.l3-tilts.kept.ok':
    'Right: the same. The eccentricity went up and the inclination went down so that the product did not change.',
  'gd.l3-tilts.kept.no':
    'Compare the values the lab reads at the two kept moments.',
  'gd.l3-tilts.predicted.title': 'The peak, predicted',
  'gd.l3-tilts.predicted.text':
    'The lowest-order theory gives the peak eccentricity from the starting inclination alone, √(1 − (5/3) cos² i₀). Work it out with the particle’s starting inclination, from the reference plane.',
  'gd.l3-tilts.predicted.ok':
    'Right: about 0.84. The N-body peak is close to it, which is a check on both.',
  'gd.l3-tilts.predicted.no':
    'Not quite. Take the starting inclination of the particle’s orbit from the perturber’s plane, then 1 − 5/3 × cos² of it, then the square root.',
  'gd.l3-tilts.flat.title': 'What a flat model keeps, and loses',
  'gd.l3-tilts.flat.text':
    'A flat model has a mutual inclination of 0 for every pair. A pair of orbits that share a plane cannot have a Kozai-Lidov cycle and, to the model, a pair of orbits that differ by 31° is the same as a pair that differ by nothing. It is right for a planetary system whose orbits are nearly coplanar, and wrong for any whose are not.',
  'gd.l3-tilts.limits.title': 'Where the model stops',
  'gd.l3-tilts.limits.text':
    'The mutual inclination is the angle between osculating orbits at one moment; in an N-body run it changes as they exchange angular momentum. In a Kepler-only run it never changes, which is why the cycle is not a Kepler-only task. The reference triple has a massless particle and point stars.',

  // --- l3-resonant
  'gd.l3-resonant.title': 'Resonant pairs',
  'gd.l3-resonant.summary':
    'Two planets whose periods are in the ratio 2 to 1: an angle that swings back and forth for hundreds of orbits, which only a run where the planets pull on each other can show.',
  'gd.l3-resonant.intro.title': 'Two periods, a simple ratio',
  'gd.l3-resonant.intro.text':
    'Planets whose periods are in a ratio of small whole numbers meet at the same places again and again, and the pulls add up. The resonant argument φ = 2λ(outer) − λ(inner) − ϖ(inner) combines their mean longitudes λ and the inner planet’s longitude of periapsis ϖ. If it circulates, going round the whole circle, the pair is not locked; if it librates, swinging back and forth about a value, it is. Two planets of 3 × 10⁻⁴ of the star’s mass sit near the 2:1 ratio. The run is N-body: libration is the effect of the planets’ pull on each other, and it takes a window of 600 orbits of the inner planet, 24,000 ticks, to watch more than five swings.',
  'gd.l3-resonant.predict.title':
    'Predict: what will the resonant argument do?',
  'gd.l3-resonant.predict.text':
    'The planets start with the angle at 0. Over the next 600 orbits of the inner planet, will it librate, circulate, or stay at 0?',
  'gd.l3-resonant.predict.opt.librates': 'It will swing back and forth about 0',
  'gd.l3-resonant.predict.opt.circulates': 'It will go round the whole circle',
  'gd.l3-resonant.predict.opt.still': 'It will stay near 0',
  'gd.l3-resonant.open.title': 'Open the pair',
  'gd.l3-resonant.open.text':
    'Choose “N-body” under “Run mode”. Open “Investigation: two planets near a 2:1 resonance”, put the instrument “Orbit” on planet c and keep “The system’s own axes”.',
  'gd.l3-resonant.open.ok':
    'The pair is open in the N-body run mode, with the orbit instrument on planet c.',
  'gd.l3-resonant.panel.title': 'Open the resonance section',
  'gd.l3-resonant.panel.text':
    'Press “Orbit editor and sky view”. Under “A resonant pair”, choose planet b as the inner body, planet c as the outer, and 2 for the resonance; the section reads the resonant argument now and the range it has seen.',
  'gd.l3-resonant.panel.ok': 'The resonant pair is set up.',
  'gd.l3-resonant.ratio.title': 'The ratio of the periods',
  'gd.l3-resonant.ratio.text':
    'What is the period of planet c divided by the period of planet b?',
  'gd.l3-resonant.ratio.ok':
    'Right: 2. Planet c is placed so its period is twice planet b’s; the pull of each on the other shifts that very slightly, and that is what the resonance is made of.',
  'gd.l3-resonant.ratio.no':
    'Not quite. Divide the period of planet c by planet b’s, from the orbit instrument.',
  'gd.l3-resonant.window.title': 'Play the window',
  'gd.l3-resonant.window.text':
    'Set the speed to ×256 and play until planet b has gone round 600 times. This is the window: more than five libration periods, enough to see both extremes more than once.',
  'gd.l3-resonant.window.ok': 'The window of 600 orbits has been played.',
  'gd.l3-resonant.phi-hi.title': 'Keep the high point',
  'gd.l3-resonant.phi-hi.text':
    'Pause when the resonant argument is at least 0.45 rad, and press “Keep this moment”.',
  'gd.l3-resonant.phi-hi.ok': 'The high point is kept.',
  'gd.l3-resonant.phi-lo.title': 'Keep the low point',
  'gd.l3-resonant.phi-lo.text':
    'Play on, pause when it is at most −0.45 rad, and press “Keep this moment”.',
  'gd.l3-resonant.phi-lo.ok': 'The low point is kept.',
  'gd.l3-resonant.amplitude.title': 'How far does it swing?',
  'gd.l3-resonant.amplitude.text':
    'Half the difference between the high and the low point is the libration amplitude. What is it, in radians?',
  'gd.l3-resonant.amplitude.ok':
    'Right: it swings by about 0.55 rad at the most, about 31°, and two moments you happen to catch can give a little less. The angle never comes near π: the pair is locked.',
  'gd.l3-resonant.amplitude.no':
    'Not quite. Subtract the two readings you kept, and halve the difference.',
  'gd.l3-resonant.period.title': 'How long does one swing take?',
  'gd.l3-resonant.period.text':
    'The time from the high point to the low is half a libration. What is the libration period, in orbits of the inner planet?',
  'gd.l3-resonant.period.ok':
    'Right, for the two moments you kept. Measured over the whole window, from all its swings, the libration period is about 112 orbits, and a half swing taken between two moments is rougher than that. Either way the swing is slow beside the orbits themselves: the planets go round more than a hundred times while the angle goes once back and forth.',
  'gd.l3-resonant.period.no':
    'Not quite. Take the time between the two kept moments, double it, and divide by the inner planet’s period.',
  'gd.l3-resonant.outcome.title': 'Which prediction was right?',
  'gd.l3-resonant.outcome.text': 'What did the resonant argument do?',
  'gd.l3-resonant.outcome.opt.librates': 'It swung back and forth about 0',
  'gd.l3-resonant.outcome.opt.circulates': 'It went round the whole circle',
  'gd.l3-resonant.outcome.opt.still': 'It stayed near 0',
  'gd.l3-resonant.outcome.ok':
    'Right: it librated, with an amplitude of about 0.55 rad and a period of about 112 orbits. The pair is in the 2:1 resonance.',
  'gd.l3-resonant.outcome.no':
    'Compare the two points you kept: one above 0, one below, and neither near ±π.',
  'gd.l3-resonant.window-periods.title': 'How many swings in the window?',
  'gd.l3-resonant.window-periods.text':
    'Divide the 600 orbits of the window by your libration period.',
  'gd.l3-resonant.window-periods.ok':
    'Right, for your period. With the period measured over the whole window, 112 orbits, the window holds about 5.3 swings, so a period measured from one half swing is checked by several more.',
  'gd.l3-resonant.window-periods.no':
    'Not quite. Divide 600 by the libration period you found.',
  'gd.l3-resonant.kepler-open.title':
    'The same pair, in the Kepler-only run mode',
  'gd.l3-resonant.kepler-open.text':
    'Choose “Kepler-only” under “Run mode”. Open the same pair again and play 50 orbits.',
  'gd.l3-resonant.kepler-open.ok':
    'The pair has run 50 orbits in the Kepler-only run mode.',
  'gd.l3-resonant.kepler-phi.title': 'What does the argument read?',
  'gd.l3-resonant.kepler-phi.text':
    'Read the resonant argument now, in radians.',
  'gd.l3-resonant.kepler-phi.ok':
    'Right: 0, up to rounding. Each planet follows its own fixed two-body orbit, so nothing changes the angle: it stays where it began.',
  'gd.l3-resonant.kepler-phi.no':
    'Not quite. Read the resonant argument in “A resonant pair”, in the Kepler-only run mode.',
  'gd.l3-resonant.why.title': 'Why is there no libration here?',
  'gd.l3-resonant.why.text':
    'Why does the argument not librate in the Kepler-only run mode?',
  'gd.l3-resonant.why.opt.pull':
    'The planets do not pull on each other in this mode',
  'gd.l3-resonant.why.opt.short': 'The run is too short',
  'gd.l3-resonant.why.opt.ratio': 'The periods are not in the ratio 2 to 1',
  'gd.l3-resonant.why.ok':
    'Right. A libration is the effect of the planets’ pull on each other; with none, the orbits are fixed and the angle cannot change. This is why a libration is only ever asked of the N-body run mode.',
  'gd.l3-resonant.why.no':
    'The periods are in the ratio 2 to 1, and the run was long enough in the N-body mode. What does a Kepler-only run leave out?',
  'gd.l3-resonant.flat.title': 'What a flat model keeps, and loses',
  'gd.l3-resonant.flat.text':
    'A flat model can hold a resonance: the argument does not need a third dimension, and a flat N-body run librates the same way. What it cannot hold is the tilt, so the resonances of tilt (those involving the nodes) and the exchange of inclination between a pair of planets are lost.',
  'gd.l3-resonant.limits.title': 'Where the model stops',
  'gd.l3-resonant.limits.text':
    'The libration here is a property of the integrated motion of two masses of 3 × 10⁻⁴ about a star, and the window is the time that run needs, 600 orbits: another mass ratio or eccentricity has another window. The resonant argument is built from osculating elements, so it carries their short-period wiggle. The kernel has no tides, relativity or gas, which shape real resonant pairs.',
};
