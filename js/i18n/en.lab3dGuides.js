// The 3-D lab's guided investigations: their English, and the runner's
// (js/lab3d/view/guidePanel.js). Spanish in ./es.lab3dGuides.js, with the same
// ids. A step's words are gd.<guide>.<step>.title, .text, .ok and .no; a
// choice's options .opt.<option> (js/lab3d/guides/curriculum.js).

export const EN_LAB3DGUIDES = {
  // --- The runner
  'g3.heading': 'Guided investigations',
  'g3.intro':
    'Four investigations of what a flat model cannot hold: an orbit’s plane, how it looks from outside, two orbits’ planes, and a distant third body. Each asks for a prediction, has you change something and measure, and says where the model stops. Every answer is checked against the lab’s own numbers.',
  'g3.meta': 'About {intro} minutes; {advanced} on the advanced path.',
  'g3.startIntro': 'Start',
  'g3.startAdvanced': 'Start the advanced path',
  'g3.where': '{guide}: step {n} of {of}, {path}.',
  'g3.path.intro': 'introductory path',
  'g3.path.advanced': 'advanced path',
  'g3.progress': 'Steps',
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
  'gd.target.tilt-0': 'Guide: a planet in the reference plane',
  'gd.target.tilt-02': 'Guide: the same orbit tilted 0.2°',
  'gd.target.tilt-05': 'Guide: the same orbit tilted 0.5°',
  'gd.target.same-tilt': 'Guide: two planets, both inclined 10°',

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
    'Open “Guide: a planet in the reference plane” and look “Along the reference plane”, from -y: the observer. Choose the instrument “On the sky, seen from here” on the star and the planet.',
  'gd.l3-eclipse.open-flat.ok':
    'Seen from here, the orbit is edge-on: once an orbit, the planet passes straight in front of the star.',
  'gd.l3-eclipse.predict.title': 'Predict: tilt it by half a degree',
  'gd.l3-eclipse.predict.text':
    'Tilt the same orbit by 0.5° about the x axis, and keep the observer where they are. Will the planet still pass in front of the star?',
  'gd.l3-eclipse.predict.opt.yes': 'Yes',
  'gd.l3-eclipse.predict.opt.no': 'No',
  'gd.l3-eclipse.open-tilted.title': 'Open the tilted orbit',
  'gd.l3-eclipse.open-tilted.text':
    'Open “Guide: the same orbit tilted 0.5°”, still seen along the reference plane, and put the instrument “Orbit” on the planet.',
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
    'Open “Guide: the same orbit tilted 0.2°”, seen along the reference plane, with the orbit instrument on the planet.',
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
    'Open “Guide: two planets, both inclined 10°” and put the instrument “Orbit” on planet b.',
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
    'Compare the error with the precision you need: two parts in ten thousand is below what most lessons measure.',
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
};
