// =============================================================================
// The Goldilocks question
// -----------------------------------------------------------------------------
// One lesson, lifted verbatim out of the single 8,460-line module these ten
// used to share. Content only, no imports: every step that needs a live number
// is handed a `ctx` by the engine, so a lesson stays a description of what is
// being taught rather than a piece of the simulation.
//
// The registry in ./registry.js imports this file on demand, so opening one
// lesson no longer pulls in the other nine. See ../investigations.js for the
// synchronous barrel the answer-key generator, the instructor materials build
// and the tests use.
// =============================================================================

// --- 6. The Goldilocks question ----------------------------------------------

const HZ_LAB = {
  scenario: 'Solar System',
  seed: 'goldilocks',
  camera: { zoom: 1.5, pan: { x: 0, y: 0 } },
  paused: false,
};

// The Sun with Venus, Earth, Mars and Ceres, habitable-zone ring switched on.
// The lesson uses the live simulation for the steps that ask students to read
// the real Solar System against the zone, rather than showing them a drawing
// of a system and asking them to take its word for it.
const HZ_RINGS = {
  scenario: 'Habitable Zone Lab',
  seed: 'goldilocks',
  camera: { zoom: 1.35, pan: { x: 0, y: 0 } },
  settings: { habitable_zone_optimism: 1.0 },
  paused: false,
};

// The same system with the wider published definition selected, so the edges
// move on screen while nothing else does.
const HZ_RINGS_WIDE = {
  ...HZ_RINGS,
  settings: { habitable_zone_optimism: 1.7 },
};

// TRAPPIST-1 is 0.06 AU across, so it needs roughly thirty times the zoom the
// Solar System does before anything is visible at all.
const HZ_TRAPPIST = {
  scenario: 'TRAPPIST-1 System',
  seed: 'goldilocks',
  camera: { zoom: 45, pan: { x: 0, y: 0 } },
  // The scenario runs at 0.01, which puts a lap of the innermost planet at
  // sixteen seconds and a lap of the outermost at three and a half minutes.
  // Tripling it makes the inner planets visibly race without touching the
  // integrator: accuracy here is set by the scenario's max_timestep of 0.0006,
  // which the substep loop honors whatever the speed.
  settings: { habitable_zone_optimism: 1.0, sim_speed: 0.03 },
  paused: false,
};

// Same world, separate object on purpose: a step whose setup is not the one in
// force triggers a rebuild, which resets the camera. The step that asks
// students to watch the system run wants the view centered wherever the
// previous step left it having been panned to.
const HZ_TRAPPIST_RUN = { ...HZ_TRAPPIST };

const GOLDILOCKS = {
  id: 'goldilocks-question',
  thumbnail: 'images/scenarios/habitable-zone-lab.webp',
  series: 'Detecting exoplanets',
  title: 'The Goldilocks Question',
  subtitle:
    "Move a planet, change its star, and decide what 'habitable' really means",
  duration: '40-50 min',
  level: 'Introductory astronomy',
  lock: { placement: true, inspector: true, areaSweep: false },
  summary:
    'Work out for yourself why a planet twice as far from its star receives a quarter as much energy, why dim stars have their habitable zones tucked in close, and why an eccentric orbit means a planet does not receive one steady amount of light all year. Then finish with the harder question the phrase "habitable zone" invites people to skip: what does being inside it actually tell you?',
  objectives: [
    'Explain why the starlight reaching a planet falls off rapidly with distance, and use the twice-as-far, one-quarter rule',
    'Explain why a dim star’s habitable zone lies close in and a luminous star’s lies far out',
    'Define the circumstellar habitable zone as a range of orbital distances where surface liquid water could be possible under suitable conditions',
    'Say what sets the inner edge and what sets the outer edge, and why two published definitions disagree',
    'Explain why a planet on an eccentric orbit receives very different amounts of starlight through its year',
    'Read the TRAPPIST-1 system against a habitable-zone model and say where each planet falls',
    'Explain why being inside the habitable zone does not establish that a planet is habitable',
  ],
  steps: [
    {
      type: 'read',
      title: 'What does Earth get from the Sun?',
      body: `Sunlight takes eight minutes and twenty seconds to reach us. What
             arrives is energy, and almost everything about the Earth's surface
             follows from how much of it lands here: the temperature, the
             weather, whether water sits in oceans or in ice or escapes into
             space entirely.
             \n\nThat quantity has a name. The <strong>stellar flux</strong>, or
             insolation, is the energy arriving on each square meter of a
             planet every second. For Earth it is about 1,361 watts per square
             meter, which is roughly the output of a small electric heater
             falling on every square meter of the daylit side.
             \n\nThis investigation is about one question: what decides how much
             of that a planet gets, and what does the answer let you say about
             the planet?`,
      tip: 'Nothing here needs algebra. You will move one slider, read three numbers off a panel, and watch a graph draw itself.',
      setup: HZ_LAB,
    },
    {
      type: 'read',
      title: 'One Earth of starlight',
      body: `Rather than carrying watts per square meter around, this lesson
             uses Earth itself as the ruler. Earth sits one astronomical unit
             from the Sun, which is 150 million kilometers, and receives what we
             will call <strong>one Earth</strong> of starlight.
             \n\nThe panel beside this one shows exactly that: the Sun on the
             left, a planet at 1 AU, and a bar for the energy arriving there.
             The bar is at the mark labeled "what Earth gets", because the
             planet is where Earth is.
             \n\nEverything from here on is measured against that one number.`,
      tool: {
        id: 'hz-insolation',
        values: { distance: 1 },
        hide: ['distance'],
        presets: false,
        title: 'Earth, at one astronomical unit',
        note: 'The lines fanning out from the star are its light, heading outward. The planet intercepts whatever crosses its own patch of sky.',
      },
      tip: 'One astronomical unit, 1 AU, is the average distance from the Earth to the Sun. It is the natural yardstick for anything inside a planetary system.',
    },
    {
      type: 'predict',
      title: 'Move it twice as far out',
      body: `Now imagine picking the Earth up and putting it down at 2 AU,
             twice as far from the Sun as it is now. The Sun is unchanged. The
             planet is unchanged. Only the distance is different.
             \n\nCommit to an answer before you touch anything.`,
      prompt:
        'At twice the distance, each square meter of the planet receives…',
      options: [
        'the same amount of starlight',
        'half as much',
        'one quarter as much',
        'one eighth as much',
      ],
      answer: 2,
      because:
        'One quarter. Half is the answer almost everyone reaches for, and it is worth noticing why it is wrong: the light is not being divided along a line, it is being spread over a surface. Double the distance and that surface is four times bigger. You are about to measure this rather than take it on trust.',
    },
    {
      type: 'explore',
      title: 'Three distances',
      body: `The slider moves the planet. Take a reading at each of the three
             distances below and write the numbers down, or keep this panel open:
             the next screen asks you to record them.
             \n\nThe number to read is the one labeled <strong>starlight
             reaching each square meter</strong>.`,
      tool: {
        id: 'hz-insolation',
        values: { distance: 1 },
        title: 'Move the planet',
        note: 'Use the buttons underneath for the three distances, or drag the slider anywhere in between.',
      },
      checklist: [
        'Set the planet to 0.5 AU and read the starlight',
        'Set it to 1 AU and read it again',
        'Set it to 2 AU and read it a third time',
        'Notice what happened between 1 AU and 2 AU',
      ],
      tip: 'The bar changes length and the number under it changes with it. Both say the same thing; the bar is there so the change is visible before you read the digits.',
    },
    {
      type: 'measure',
      title: 'Write the three down',
      body: `Set the slider to each distance in turn and type what the panel
             reads. The instrument and the graph are both on this screen, so
             nothing has to be remembered from the last one: read a value,
             enter it, watch the point land.`,
      fields: [
        { id: 'd1', label: 'Distance 1', unit: 'AU', hint: '0.5' },
        { id: 's1', label: 'Starlight there', unit: 'Earths', hint: '4' },
        { id: 'd2', label: 'Distance 2', unit: 'AU', hint: '1' },
        { id: 's2', label: 'Starlight there', unit: 'Earths', hint: '1' },
        { id: 'd3', label: 'Distance 3', unit: 'AU', hint: '2' },
        { id: 's3', label: 'Starlight there', unit: 'Earths', hint: '0.25' },
      ],
      validate: v => {
        const rows = [
          [v.d1, v.s1],
          [v.d2, v.s2],
          [v.d3, v.s3],
        ].filter(([d, s]) => Number.isFinite(d) && Number.isFinite(s));
        if (rows.length < 2) return null;
        if (rows.some(([d, s]) => d <= 0 || s <= 0)) {
          return {
            level: 'error',
            message: 'Distances and starlight are both positive numbers.',
          };
        }
        // Every row should satisfy S x d^2 = 1 for a one-solar-luminosity star.
        const products = rows.map(([d, s]) => s * d * d);
        const spread =
          (Math.max(...products) - Math.min(...products)) /
          (products.reduce((a, b) => a + b, 0) / products.length);
        if (spread > 0.35) {
          return {
            level: 'warn',
            message:
              'These do not all sit on the same relationship. Check that each starlight value was read at the distance beside it.',
          };
        }
        return {
          level: 'ok',
          message:
            'Every one of your readings satisfies starlight x distance x distance = 1. That is the pattern, already in your own numbers.',
        };
      },
      plot: {
        title: 'Your three readings',
        xLabel: 'distance  (AU)',
        yLabel: 'starlight  (Earths)',
        height: 260,
        note: 'Distance across, starlight up. Three points are enough to see the shape.',
        points: v => [
          { x: v.d1, y: v.s1, label: '1' },
          { x: v.d2, y: v.s2, label: '2' },
          { x: v.d3, y: v.s3, label: '3' },
        ],
      },
      tool: {
        id: 'hz-insolation',
        values: { distance: 0.5 },
        title: 'Read each distance here',
        note: 'Drag the slider to 0.5, then 1, then 2 AU. Type each reading into the boxes.',
      },
      tip: 'The three suggested distances are only suggestions. Any three will do, as long as the starlight value beside each one was read at that distance.',
    },
    {
      type: 'question',
      title: 'What the graph says',
      kind: 'choice',
      body: `Look at the curve your three points make. It starts high on the
             left, drops steeply, and then flattens out as it goes right without
             ever quite reaching zero.`,
      prompt:
        'As a planet moves further from its star, the starlight it receives…',
      options: [
        'falls steadily, by the same amount for each extra AU',
        'falls quickly at first and then more and more slowly',
        'stays about the same until it suddenly stops',
        'rises, because there is more space to collect from',
      ],
      answer: 1,
      because:
        'It falls fast close in and slowly far out. Going from 0.5 AU to 1 AU costs three quarters of the starlight. Going from 2 AU to 2.5 AU, the same half an astronomical unit, costs only a little. That shape is the signature of the relationship you are about to be shown, and it is why the inner part of any planetary system is so much more sensitive to distance than the outer part.',
    },
    {
      type: 'explore',
      title: 'The star is not running out of light',
      body: `Here is why it happens, and it has nothing to do with light getting
             tired on the way.
             \n\nA star pours out the same energy in every direction. Picture
             that energy crossing an imaginary shell centered on the star. The
             panel draws one shell at a time. Drag the distance out and watch
             two things at once: the patch of light stays the same energy, and
             the shell it has to cover keeps growing.`,
      checklist: [
        'At 1 AU, note how large the lit patch is.',
        'Move out to 2 AU. The shell has twice the radius. Read how many times bigger its area is.',
        'Move out to 3 AU and then 4 AU, reading the area each time: 1, 4, 9, 16.',
        'Notice the bottom line of the panel: the total energy crossing the shell never changes.',
      ],
      tool: {
        id: 'hz-spreading',
        values: { shell: 1 },
        title: 'One shell at a time',
      },
      tip: 'The same rule governs how loud a speaker sounds and how bright a streetlight looks. It is not special to astronomy; it is what happens to anything that spreads out equally in all directions.',
    },
    {
      type: 'question',
      title: 'Writing it down, then using it',
      kind: 'numeric',
      body: `The areas you just read off were 1, 4, 9 and 16: the squares of
             1, 2, 3 and 4. That is not a coincidence about shells, it is what
             the surface of a sphere does. Double the radius and the area goes
             up by four.
             \n\nSame energy, four times the area, a quarter as much on each
             square meter. Written down:
             \n\n<strong>starlight ∝ 1 / d²</strong>
             \n\nor, in full, F = L / (4πd²), where L is the star's luminosity
             and the 4πd² is the area of that shell. You will not be asked to
             rearrange it. What matters is the sentence: <strong>twice as far,
             one quarter as much</strong>.
             \n\nSo, without the panel: a planet sits three times as far from
             its star as Earth is from the Sun. Three squared is nine.`,
      prompt: 'Starlight at 3 AU, in Earths',
      unit: 'Earths',
      answer: 0.111,
      tolerance: 0.02,
      because:
        'One ninth, or about 0.11 Earths. Three times the distance, nine times the area, a ninth of the energy on each square meter. Jupiter is a little further out than this, at 5.2 AU, and receives about a twenty-seventh of what Earth does.',
      tip: 'This is called an inverse-square law. "Inverse" because bigger distance means smaller starlight, "square" because it is the distance squared that does the work.',
    },
    {
      type: 'predict',
      title: 'Leave the planet, change the star',
      body: `So far the star has been the Sun and only the planet has moved. Now
             turn it around.
             \n\nPut a planet at 1 AU, exactly where Earth is, and swap the Sun
             for a red dwarf: a small, cool, very faint star. Red dwarfs are the
             commonest kind of star in the galaxy by a wide margin, and the
             nearest star to the Sun is one.`,
      prompt: 'That planet, still at 1 AU, would now receive…',
      options: [
        'the same starlight, because it has not moved',
        'a little less',
        'far less, because the star is putting out far less light',
        'more, because cooler stars are closer',
      ],
      answer: 2,
      because:
        'Far less. Distance is only half of the story; the other half is how much light the star is producing in the first place. A red dwarf can be less than a thousandth as luminous as the Sun, and a planet at 1 AU around one would be receiving less than a thousandth of what Earth receives.',
    },
    {
      type: 'explore',
      title: 'Four stars, one planet',
      body: `The planet stays at 1 AU. The star slider swaps between four real
             kinds of main-sequence star, from a dim red dwarf to a star five
             times more luminous than the Sun.
             \n\nWatch the number in the top right of the panel as you move
             through them.`,
      tool: {
        id: 'hz-star',
        values: { star: 2, distance: 1 },
        title: 'The same planet, four different stars',
        note: 'Luminosity is given in Suns: 1 is the Sun, 0.0015 is a faint red dwarf. The planet does not move.',
      },
      checklist: [
        'Start on the Sun and note the starlight at 1 AU',
        'Switch to the dim red dwarf without moving the planet',
        'Switch to the orange dwarf, then to the brighter star',
        'Look at the luminosity row each time, and at the starlight row',
      ],
      tip: 'A star four hundred times fainter delivers four hundred times less light to a planet at the same distance. The two numbers track each other exactly, because luminosity multiplies straight through the inverse-square relation.',
    },
    {
      type: 'question',
      title: 'What luminosity does',
      kind: 'choice',
      body: `You have now changed the star four times without moving the planet
             at all.`,
      prompt: 'At a fixed distance, the starlight a planet receives…',
      options: [
        'does not depend on the star, only on the distance',
        'is proportional to the star’s luminosity',
        'depends on the star’s size but not its luminosity',
        'is the same for all main-sequence stars',
      ],
      answer: 1,
      because:
        'It is proportional to luminosity. Ten times the luminosity, ten times the starlight at the same distance. Combine that with what you found earlier and you have the whole relation: the starlight goes up with the star’s luminosity and down with the square of the distance.',
    },
    {
      type: 'explore',
      title: 'So where would a planet have to be?',
      body: `Put those two together and an obvious question follows. If a dim
             star delivers far less light, then a planet would have to sit far
             closer to it to receive as much as Earth receives from the Sun.
             \n\nAstronomers turn that into a band, and the panel now draws one:
             the range of distances where the starlight is in a range that could
             permit liquid water at the surface, given suitable conditions on the
             planet. It is bounded by a dashed line on the hot side and a dotted
             line on the cold side, and the numbers underneath give its inner and
             outer edges for whichever star is showing.
             \n\nChange the star and watch the band rather than the planet.`,
      tool: {
        id: 'hz-star',
        values: { star: 0, distance: 0.05 },
        showZone: true,
        title: 'The band appears',
        note: 'The shaded band is a calculated range of orbital distances, not a physical region of space. Nothing is there. The distance scale changes with the star, so read the axis rather than the pixels.',
      },
      checklist: [
        'On the dim red dwarf, read where the band begins and ends',
        'Switch to the Sun and read the band again',
        'Switch to the brighter star and read it a third time',
        'Put the planet inside the band for each star in turn',
      ],
      tip: 'For the red dwarf the band runs from about 0.042 to 0.080 AU. For the bright star it runs from about 2.1 to 3.6 AU. That is a factor of fifty between them, and it is entirely the star’s doing.',
    },
    {
      type: 'question',
      title: 'Dim stars, close bands',
      kind: 'choice',
      body: `You have watched the band jump around as the star changed.`,
      prompt:
        'Compared with the Sun’s, the band around a much dimmer star lies…',
      options: [
        'much closer to the star',
        'in the same place, since it depends on the planet',
        'much further from the star',
        'in the same place, since all stars are similar',
      ],
      answer: 0,
      because:
        'Much closer in. A dim star delivers less light, so a planet has to be nearer to receive the same amount, and the whole band moves inward with it. The relationship is a square root: a star a hundred times more luminous has its band ten times further out. You do not need to calculate that, but it is why the bright star’s band sat around 2 to 3.5 AU while the red dwarf’s sat at a twentieth of an AU.',
    },
    {
      type: 'read',
      title: 'Saying it carefully',
      body: `The band has a name: the <strong>circumstellar habitable zone</strong>,
             usually shortened to the habitable zone. It is worth reading the
             careful definition once, because the short name invites a much
             stronger claim than the idea can support.
             \n\nThe habitable zone is <em>the range of orbital distances where a
             rocky planet with suitable atmospheric conditions could potentially
             maintain liquid water on its surface.</em>
             \n\nEvery part of that sentence is doing work. <strong>Range</strong>,
             not a line. <strong>Could potentially</strong>, not does.
             <strong>With suitable atmospheric conditions</strong>, which is an
             assumption about the planet, not something the zone measures.
             \n\nThe zone is calculated entirely from the star. It knows nothing
             at all about any particular planet.`,
      tip: 'Liquid water is the criterion because it is the one requirement every form of life we know of shares, and because we have no way to search for the requirements of life we do not know of.',
    },
    {
      type: 'explore',
      title: 'Now put it round the real Sun',
      body: `Enough diagrams. The simulation behind this panel is now the Sun
             with four real worlds around it: <strong>Venus</strong> at 0.72 AU,
             <strong>Earth</strong> at 1.00, <strong>Mars</strong> at 1.52 and
             <strong>Ceres</strong>, the largest asteroid, at 2.77.
             \n\nThe green ring is the habitable zone, drawn from the Sun's own
             luminosity and temperature by the same code the panels have been
             using. Nothing here is a sketch. Take a moment and look at where
             each world falls.`,
      checklist: [
        'Find the inner edge: the dashed orange circle, labeled "runaway greenhouse".',
        'Find the outer edge: the dashed blue circle, labeled "maximum greenhouse".',
        'Watch one full lap of the inner worlds. Which ones stay inside the ring, and which never enter it?',
        'Notice that the ring does not move. It belongs to the star, not to any planet.',
      ],
      setup: HZ_RINGS,
      tip: 'The ring is a calculation, not an object. There is nothing physically present at 0.98 AU; that is simply the distance at which the model says a runaway greenhouse begins for a planet of this type.',
    },
    {
      type: 'question',
      title: 'Reading the real Solar System',
      kind: 'choice',
      body: `The conservative zone around the Sun runs from about 0.98 AU to
             about 1.69 AU. Venus is at 0.72, Earth at 1.00, Mars at 1.52 and
             Ceres at 2.77.`,
      prompt: 'Which worlds on screen lie inside the ring?',
      options: [
        'Earth only',
        'Earth and Mars',
        'Venus, Earth and Mars',
        'All four',
      ],
      answer: 1,
      because:
        'Earth and Mars. Venus at 0.72 AU is inside the inner edge, receiving about 1.9 Earths of starlight; Ceres at 2.77 AU is far beyond the outer edge. Mars, at 1.52 AU, is comfortably within the conservative zone. That last one usually comes as a surprise, and it is the most useful fact in this lesson.',
    },
    {
      type: 'question',
      title: 'The Mars problem',
      kind: 'short',
      body: `Mars is inside the habitable zone. Mars has no liquid water
             anywhere on its surface and has had none for something like three
             billion years. Its atmosphere is about a hundredth the pressure of
             Earth's, and its average surface temperature is around −60 °C.
             \n\nSo either the calculation is wrong, or the calculation is
             answering a narrower question than the name suggests.`,
      prompt:
        'In two or three sentences: why is dry, frozen Mars sitting inside the habitable zone not evidence that the zone was calculated incorrectly?',
      tip: 'Look back at the careful definition three screens ago, the one that begins "the range of orbital distances". Which words in it are about the star, and which are assumptions about the planet?',
      rubric:
        'Full credit for recognizing that the zone is computed from the star alone and that the definition carries an explicit assumption about the planet ("a rocky planet with suitable atmospheric conditions"). Mars is in the right place and fails the assumption: at about a tenth of Earth\'s mass it could not retain a thick atmosphere, so surface pressure is far too low for liquid water and there is almost no greenhouse warming. Credit an answer that gets the structure right even if it names a different atmospheric mechanism. Do not require the phrase "atmospheric escape". Common wrong answer: that Mars is actually outside the zone, or that the zone must be recalculated for each planet.',
      because:
        'The zone is computed from the star alone, and the definition assumes a rocky planet with suitable atmospheric conditions. Mars is in the right place and fails the assumption: it is too small to have held onto a thick atmosphere, so there is not enough pressure or greenhouse warming to keep water liquid. The zone said "this distance could work for a suitable planet". It never said Mars was one.',
    },
    {
      type: 'read',
      title: 'The two edges',
      body: `Why does the zone stop at each end?
             \n\n<strong>The inner edge.</strong> Closer to the star means more
             incoming energy, which means a warmer surface, which means more
             water vapor in the air. Water vapor is itself a powerful greenhouse
             gas, so it traps more heat, which evaporates more water. Past a
             certain amount of incoming light that feedback runs away, the
             oceans end up in the atmosphere, and ultraviolet light breaks the
             water apart so the hydrogen escapes to space. That limit is called
             the <strong>runaway greenhouse</strong>, and it sets the inner edge.
             \n\n<strong>The outer edge.</strong> Further out means less energy
             and a colder surface. A planet can compensate with a thicker
             carbon dioxide atmosphere, which is why the outer edge is not simply
             where water freezes. But carbon dioxide has a limit: pile on enough
             and it starts reflecting and scattering more sunlight than it traps.
             The best a carbon dioxide atmosphere can do is called the
             <strong>maximum greenhouse</strong>, and that sets the outer edge.
             \n\nNeither edge is a temperature. Both are limits on how much
             starlight a climate model can cope with.`,
      tool: {
        id: 'hz-boundaries',
        values: { model: 0 },
        presets: false,
        title: 'The two edges, around the Sun',
        note: 'The dashed line is the runaway greenhouse limit. The dotted line is the maximum greenhouse limit. Earth is marked for scale.',
      },
      tip: 'Venus is thought to have gone through a runaway greenhouse. It sits at 0.72 AU, receives about 1.9 Earths of starlight, and has a surface hot enough to melt lead under an atmosphere ninety times heavier than ours.',
    },
    {
      type: 'explore',
      title: 'Two definitions of the same zone',
      body: `Published habitable zones come in two flavors, and the difference
             is not a matter of mood.
             \n\nThe <strong>conservative</strong> zone uses the two limits you
             just met, both of which come out of a climate model. The
             <strong>optimistic</strong> zone uses two empirical limits instead,
             taken from the history of our own Solar System: Venus appears to
             have had no surface water for at least a billion years, and Mars
             appears to have had some early on. Those two facts bracket a wider
             band.
             \n\nSwitch between them and watch which edge moves further.`,
      tool: {
        id: 'hz-boundaries',
        values: { model: 0 },
        title: 'Conservative and optimistic',
        note: 'Both bands are drawn. The one you have selected is filled in; the other is left as an outline so you can see exactly what changed.',
      },
      checklist: [
        'Read the inner and outer edges of the conservative zone',
        'Switch to optimistic and read them again',
        'Note which of the two edges moved more',
        'Notice where Earth sits relative to each inner edge',
      ],
      tip: 'The optimistic inner edge is called Recent Venus and the optimistic outer edge is called Early Mars. The names are literal: those two worlds are the evidence.',
    },
    {
      type: 'question',
      title: 'What actually changed',
      kind: 'choice',
      body: `You have seen both bands drawn on the same axis.`,
      prompt: 'Going from the conservative to the optimistic zone changes…',
      options: [
        'the star, which is now assumed to be brighter',
        'the assumptions about what atmosphere a planet might have, which moves both edges outward and inward',
        'nothing physical: it just draws a bigger band',
        'the distance scale of the diagram',
      ],
      answer: 1,
      because:
        'The assumptions. The conservative edges come from a climate model asking what a water-rich planet can survive; the optimistic edges come from asking what our own neighbors rule out. Both are defensible and both are published. Which you use depends on what question you are asking, and a paper that quotes a habitable zone should say which one it means.',
    },
    {
      type: 'explore',
      title: 'The wider definition, on the real Sun',
      body: `Back to the live Solar System, with one change: the habitable zone
             is now drawn using the <strong>optimistic</strong> definition. The
             star has not changed. The planets have not changed. Only the
             assumption about what counts as an edge.
             \n\nThe inner edge has jumped from 0.98 AU in towards
             <strong>0.75 AU</strong>, which is a large move on screen. The
             outer edge has barely shifted, from 1.69 to 1.77 AU.
             \n\nLook carefully at Venus.`,
      checklist: [
        'Find the new inner edge and compare it with where Venus orbits, at 0.72 AU.',
        'Check the outer edge against Ceres at 2.77 AU.',
        'Count how many worlds are inside the ring now, and compare with the count you made on the conservative definition.',
      ],
      setup: HZ_RINGS_WIDE,
      tip: 'The optimistic inner edge is the Recent Venus limit, and it is set by Venus itself: the argument is that Venus has had no surface water for at least a billion years, so wherever Venus is must already be too close. Venus therefore sits just inside its own limit, by about 0.03 AU. The definition is nearly touching the evidence it was built from.',
    },
    {
      type: 'question',
      title: 'What the wider band bought',
      kind: 'choice',
      body: `Switching to the optimistic definition moved the inner edge inward
             by almost a quarter of an astronomical unit.`,
      prompt:
        'How many additional Solar System worlds did that bring inside the zone?',
      options: [
        'Two: Venus and Ceres',
        'One: Venus',
        'None',
        'One: Mars, which was outside the conservative zone',
      ],
      answer: 2,
      because:
        'None. Venus at 0.72 AU still falls just inside the optimistic inner edge at 0.75, and Ceres at 2.77 is nowhere near the outer edge at 1.77. Mars was already inside the conservative zone. So the two published definitions, which disagree about the edges by a wide margin, agree completely about our own Solar System: two worlds in the zone, and one of them is Mars.',
    },
    {
      type: 'question',
      title: 'Venus, by the rule you already have',
      kind: 'numeric',
      body: `You do not need a climate model to see why Venus is a hard case.
             Venus orbits at 0.72 AU. Use the rule from the first half of this
             lesson: starlight goes as 1 / d².
             \n\n0.72 squared is about 0.52.`,
      prompt: 'Starlight at Venus, in Earths',
      unit: 'Earths',
      answer: 1.92,
      tolerance: 0.12,
      because:
        'About 1.9 Earths. Venus receives nearly twice the starlight Earth does, which is what puts it inside the runaway greenhouse limit and outside the conservative zone. Its surface sits at about 460 °C, hot enough to melt lead, under an atmosphere ninety times heavier than ours. Note the direction of the argument: the extra starlight starts the process, the atmosphere finishes it.',
    },
    {
      type: 'read',
      title: 'A year on a circular orbit',
      body: `One thing has been quietly assumed so far: that a planet has
             <em>a</em> distance from its star. Most of the planets you have met
             in these lessons are on nearly circular orbits, and for those it is
             very nearly true.
             \n\nThe panel shows a planet on a perfectly circular orbit at
             1.2 AU. Underneath it is a graph of the starlight it receives
             through one complete year, with a marker that keeps pace with the
             planet.
             \n\nWatch the graph. It is a flat line.`,
      tool: {
        id: 'hz-orbit',
        values: { ecc: 0, semi: 1.2 },
        hide: ['ecc'],
        title: 'A circular year',
        note: 'The marker on the graph is the planet’s current position in its year. On a circular orbit the distance never changes, so neither does the starlight.',
      },
      tip: 'Earth’s orbit is not exactly circular: its eccentricity is 0.017, which makes the starlight vary by about seven percent over the year. That is small, and it is not what causes the seasons.',
    },
    {
      type: 'predict',
      title: 'Now stretch the orbit',
      body: `In a moment you will be able to raise the eccentricity, which
             stretches the circle into an ellipse. The star stays at one focus,
             so the planet swings in close on one side of the orbit and out far
             on the other.
             \n\nThe semi-major axis, the average of the closest and furthest
             distances, will stay the same.`,
      prompt: 'On a stretched orbit, the starlight the planet receives will…',
      options: [
        'stay constant, because the average distance has not changed',
        'vary through the year, higher when the planet is closer',
        'vary through the year, higher when the planet is further away',
        'drop to zero for part of the year',
      ],
      answer: 1,
      because:
        'It varies, and it peaks when the planet is closest. Because the relationship goes as the inverse square, a modest stretch in the orbit makes a large swing in the starlight: on the orbit you are about to run, the planet receives seven times more at its closest point than at its furthest.',
    },
    {
      type: 'explore',
      title: 'Run an eccentric year',
      body: `Raise the eccentricity and watch both halves of the panel at once:
             the planet going round, and the marker tracing out the starlight
             graph beneath it.
             \n\nPay attention to <em>where the planet is when it is moving
             quickly</em>. It is not moving at a constant speed, and it never
             was: this is Kepler's second law, and it matters for the next
             screen.`,
      tool: {
        id: 'hz-orbit',
        values: { ecc: 0.45, semi: 1.2 },
        title: 'An eccentric year',
        note: 'Run and pause with the buttons underneath. The two closest and furthest distances, and the starlight at each, are in the rows below.',
      },
      checklist: [
        'Set the eccentricity to about 0.45 and let it run a full lap',
        'Watch the marker race through the tall peak on the graph',
        'Watch it crawl through the long flat trough',
        'Compare the starlight at the closest and furthest points in the readout',
      ],
      tip: 'The peak on the graph is narrow and the trough is wide. That is not a drawing choice: the planet really does spend most of its year in the cold outer part of the orbit, and hurries through the hot part.',
    },
    {
      type: 'explore',
      title: 'Crossing the edges',
      body: `Now the habitable zone is drawn on both halves of the panel: as a
             ring around the star, and as a horizontal band on the graph. They
             are the same information twice.
             \n\nThis particular orbit does not stay inside it. Watch the planet
             leave the ring at one end of its year and come back at the other,
             and watch the graph line cross out of the band at the same moment.
             \n\nThe readout now gives the fraction of the <em>year</em> spent
             inside the zone.`,
      tool: {
        id: 'hz-orbit',
        values: { ecc: 0.45, semi: 1.2 },
        showZone: true,
        title: 'In and out of the zone',
        note: 'The dashed line is the inner edge, the dotted line the outer edge, on both the orbit and the graph.',
      },
      checklist: [
        'Let it run until you have seen the planet leave and return',
        'Pause it while the planet is outside the ring',
        'Read the fraction of the year spent inside the zone',
        'Set the eccentricity to 0.3 and read that fraction again',
      ],
      tip: 'The fraction is measured in time, not in distance around the loop. Those are different numbers, because the planet does not cover equal stretches of orbit in equal times.',
    },
    {
      type: 'question',
      title: 'Reading the fraction',
      kind: 'choice',
      body: `At an eccentricity of 0.45 this planet spends a little over half of
             its year inside the zone. At 0.3 it spends about three quarters
             there. On a circular orbit at the same average distance it never
             leaves.`,
      prompt:
        'What does "56% of the year inside the zone" tell you about the planet’s surface?',
      options: [
        'It has liquid water for 56% of the year and ice for the rest',
        'It freezes and thaws twice a year',
        'Less than the number suggests: it describes the starlight arriving, not the surface temperature',
        'Nothing at all, since the habitable zone is not real',
      ],
      answer: 2,
      because:
        'Less than it sounds like. The fraction describes incoming starlight against a climate model’s limits. An atmosphere and an ocean carry an enormous amount of heat and take a long time to change temperature, so a planet does not track the light arriving at it minute by minute any more than a beach cools the instant a cloud passes. A planet that dips outside the zone briefly each year may well be fine. The number is a useful flag, not a forecast.',
    },
    {
      type: 'predict',
      title: 'A real system, forty light years away',
      body: `Time to point all of this at a real object.
             \n\nTRAPPIST-1 is a very small, very cool star: about nine percent
             of the Sun's mass, barely bigger than Jupiter, with a surface
             temperature of 2,566 K against the Sun's 5,772. Its measured
             luminosity is 0.000553 Suns, which is about one eighteen-hundredth
             of the Sun's output. It has seven known rocky planets.`,
      prompt: 'Compared with the Sun’s, TRAPPIST-1’s habitable zone should be…',
      options: [
        'much further out, because cool stars need more room',
        'in about the same place, near 1 AU',
        'much closer in, because the star is so faint',
        'impossible to define for such a small star',
      ],
      answer: 2,
      because:
        'Much closer in. You worked this out two sections ago: the band tracks the square root of the luminosity. A star eighteen hundred times fainter has its band about forty times closer, which puts it at a few hundredths of an astronomical unit.',
    },
    {
      type: 'explore',
      title: 'All seven planets',
      body: `Here is the real system, with the habitable zone from the same
             model you have been using all lesson, calculated from TRAPPIST-1's
             measured luminosity and temperature.
             \n\nThe distance axis is compressed, because otherwise the inner
             planets would pile up on top of the star. Read the numbers, not the
             pixels.
             \n\nThe second panel puts the Solar System on the same axis. The
             whole seven-planet system would fit comfortably inside the orbit of
             Mercury.`,
      tool: {
        id: 'hz-trappist',
        values: { model: 0 },
        compare: true,
        title: 'TRAPPIST-1',
        note: 'Every planet is listed underneath with the starlight it receives and where it falls relative to the modeled zone.',
      },
      setup: HZ_TRAPPIST,
      checklist: [
        'Find planets b and c, closest to the star, and read their starlight',
        'Find e, f and g and read theirs',
        'Read where the zone begins and ends in AU',
        'Switch the zone definition to optimistic and see whether anything changes category',
        'Compare the scale with Mercury’s orbit in the lower panel',
      ],
      tip: 'TRAPPIST-1b receives about four times what Earth does, and TRAPPIST-1h about a seventh. The seven planets span that entire range within six hundredths of an astronomical unit.',
    },
    {
      type: 'explore',
      title: 'Watch it run',
      body: `The diagram was a diagram. This is the simulation, with all seven
             planets on their real orbits and the habitable zone drawn at the
             same scale as everything else.
             \n\nThe view is zoomed in about thirty times further than the
             Solar System steps, because the entire system is six hundredths of
             an astronomical unit across. TRAPPIST-1b completes an orbit in a
             day and a half; h takes nineteen days.
             \n\nOne caution is printed on the ring itself. TRAPPIST-1 at
             2,566 K is cooler than the temperature range the published fit
             covers, so the model is evaluated at its own lower limit rather
             than extrapolated past its data. That is a modeling decision, and
             the label says so rather than quoting the number as a measurement.`,
      checklist: [
        'Find the green ring and see how much of the system it covers.',
        'Watch the inner planets race and the outer ones crawl. b laps about twelve times for each lap of h.',
        'Click any planet to open its card and read its orbital period in days.',
        'Notice the note on the ring saying the star is cooler than the model covers.',
      ],
      setup: HZ_TRAPPIST_RUN,
      allowInspector: true,
      tip: 'The orbital periods here are not typed in. They come out of the same gravity solver as every other scenario, from the measured semi-major axes and the measured stellar mass. If they match the published values, that is the simulation agreeing with the observations.',
    },
    {
      type: 'measure',
      title: 'Take the readings yourself',
      body: `Rather than being told which planets fall where, read it off the
             instrument. The panel is back, on the conservative definition.
             \n\nWork down the list under the picture and record the starlight
             each of the three middle planets receives, in Earths. Then record
             where the zone begins and ends.`,
      fields: [
        {
          id: 'e',
          label: 'TRAPPIST-1e receives',
          unit: 'Earths',
          hint: '0.65',
        },
        {
          id: 'f',
          label: 'TRAPPIST-1f receives',
          unit: 'Earths',
          hint: '0.37',
        },
        {
          id: 'g',
          label: 'TRAPPIST-1g receives',
          unit: 'Earths',
          hint: '0.25',
        },
        { id: 'inner', label: 'Zone inner edge', unit: 'AU', hint: '0.0254' },
        { id: 'outer', label: 'Zone outer edge', unit: 'AU', hint: '0.0499' },
      ],
      validate: v => {
        const want = {
          e: 0.65,
          f: 0.37,
          g: 0.25,
          inner: 0.0254,
          outer: 0.0499,
        };
        const filled = Object.keys(want).filter(k => Number.isFinite(v[k]));
        if (filled.length < 5) return null;
        const off = filled.filter(
          k =>
            Math.abs(v[k] - want[k]) >
            Math.max(0.05 * want[k], 0.02 * want[k] + 1e-4)
        );
        if (off.length) {
          return {
            level: 'warn',
            message: `Check ${off.join(', ')} against the list under the picture. Each planet's row gives its starlight in Earths, and the top row gives the two edges.`,
          };
        }
        return {
          level: 'ok',
          message:
            'Those match. Now say it in words, and say it carefully: e, f and g lie within the modeled habitable zone. That is a statement about their orbits and their star, and it is the correct thing to say. It is not a statement that any of them has water, an atmosphere, or a surface anyone would recognize.',
        };
      },
      tool: {
        id: 'hz-trappist',
        values: { model: 0 },
        presets: false,
        title: 'Read the values here',
        note: 'Every planet is listed under the picture with its distance, the starlight it receives, and where it falls relative to the modeled zone.',
      },
      tip: 'The three planets inside the zone receive between a quarter and two thirds of what Earth does. All three sit closer to their star than Mercury does to the Sun.',
    },
    {
      type: 'question',
      title: 'The question the name invites',
      kind: 'choice',
      body: `So: a rocky planet, the right size, orbiting inside its star's
             habitable zone.`,
      prompt:
        'Has it been shown that this planet has liquid water on its surface?',
      options: [
        'Yes: that is what the habitable zone means',
        'Yes, provided the planet is rocky and roughly Earth-sized',
        'No: the zone is calculated from the star alone and says nothing about the planet',
        'No, but only because we cannot see the planet well enough yet',
      ],
      answer: 2,
      because:
        'No, and the reason is not that our telescopes are too small. The habitable zone is computed from a star’s luminosity and temperature. Nothing in that calculation knows whether the planet has an atmosphere, whether it has any water to begin with, what it is made of, or what its surface is doing. Being inside the zone means the planet is receiving an amount of energy that would be compatible with surface liquid water if a great many other things also happened to be true.',
    },
    {
      type: 'explore',
      title: 'Three planets that all look promising',
      body: `To see how much room that leaves, consider three planets that all
             receive close to one Earth of starlight and all sit inside their
             star's habitable zone.
             \n\nOn the one number this lesson has spent forty minutes on, they
             are identical. Look at what else is known about each.
             \n\nFor context from our own system: Venus and Earth are nearly the
             same size and receive starlight within a factor of two of each
             other, and their surfaces differ by more than four hundred degrees.
             Mars receives 0.43 Earths and has a surface that would be far
             warmer with a thicker atmosphere than the thin one it has. Distance
             matters enormously, and it is not the only thing that matters.`,
      tool: {
        id: 'hz-candidates',
        values: { which: 0 },
        title: 'Three candidates',
        note: 'All three receive similar starlight and all three are inside the modeled zone. Everything else about them differs.',
      },
      checklist: [
        'Look at Planet A: what is known, and what is not',
        'Look at Planet B',
        'Look at Planet C, and at its size compared with Earth',
        'Decide which you would spend telescope time on before reading on',
      ],
      tip: 'A planet larger than about 1.6 Earth radii is usually not a bare rock: it tends to have kept a thick hydrogen envelope, which means no surface in the sense we mean.',
    },
    {
      type: 'question',
      title: 'Which one would you observe next?',
      kind: 'choice',
      body: `Telescope time is the scarcest resource in astronomy. You can have
             a spectrum of one of these three.
             \n\nThe question is not which one has life. It is which one is the
             most promising to study.`,
      prompt:
        'Which planet is the strongest follow-up target on this evidence?',
      options: [
        'Planet A: rocky and Earth-sized, with no atmosphere detected',
        'Planet B: rocky, slightly larger than Earth, atmosphere detected but not yet characterised',
        'Planet C: 1.6 Earth radii with an extended atmosphere, around a frequently flaring star',
        'None of them: without a temperature measurement there is nothing to choose between them',
      ],
      answer: 1,
      because:
        'Planet B. It is the only one of the three that is both small enough to plausibly be rocky and known to have an atmosphere, and its star is not actively stripping that atmosphere away. That combination is what a spectrum could actually say something about. Planet A may still have an atmosphere too thin to have shown up, and Planet C is large enough that it is probably a small gas-rich world rather than a rocky one. None of this establishes that B is habitable. It establishes that B is where the next observation should point.',
    },
    {
      type: 'question',
      title: 'One more, and then you are done',
      kind: 'choice',
      body: `A new discovery is announced. A rocky planet, close to Earth's
             size, orbiting inside the conservative habitable zone of its star
             and receiving 0.9 Earths of starlight. Its star flares often. No
             atmosphere has been measured yet.
             \n\nA headline calls it a second Earth.`,
      prompt: 'What can honestly be concluded from what is known?',
      options: [
        'That the planet is habitable',
        'That the planet probably has liquid water, given its size and position',
        'That it receives an amount of starlight compatible with surface liquid water under suitable conditions, making it worth studying further',
        'Nothing, because the star flares',
      ],
      answer: 2,
      because:
        'The third. It is a genuinely interesting object and the discovery is genuinely worth making, and everything past "worth studying further" is unsupported. The flaring is a real concern for whether an atmosphere survives, but it does not by itself rule the planet out, and a single unmeasured atmosphere is exactly the gap the next observation is for. The habitable zone did its job here: it told astronomers where to point.',
    },
    {
      type: 'read',
      title: 'What you worked out',
      body: `Starting from a planet and a star, you found all of this yourself:
             \n\n<strong>Further away → less starlight.</strong> Twice as far,
             one quarter as much, because the light spreads over a sphere whose
             area grows as the square of the distance.
             \n\n<strong>More luminous star → habitable zone further out.
             Less luminous star → habitable zone closer in.</strong> A star a
             hundred times brighter has its zone ten times further out.
             \n\n<strong>Eccentric orbit → the starlight changes through the
             year</strong>, and the planet spends most of that year in the cold
             outer part of its orbit rather than the hot inner part.
             \n\n<strong>Inside the habitable zone is not the same as
             habitable</strong>, and it is not remotely the same as inhabited.
             The zone is calculated from the star alone.
             \n\nWhich leaves the habitable zone doing something genuinely
             valuable, just not the thing its name suggests. There are billions
             of planets in the galaxy and a handful of telescopes able to take
             their spectra. The habitable zone is how you decide which ones to
             look at first.
             \n\nIt is an excellent place to start looking. It is not the answer
             to whether a world is habitable.`,
      tip: 'The phrase "Goldilocks zone" is older than the science and has done real damage to how the idea is understood. Every professional paper uses "circumstellar habitable zone", and every one of them means the careful definition you read earlier.',
    },
  ],
};

export default GOLDILOCKS;
