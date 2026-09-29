// =============================================================================
// The mission lab's guides, in English
// -----------------------------------------------------------------------------
// gd.<guide>.<step>.<part>, the ids js/guideDocs.js reads, so the page and
// the instructor documents say the same words. Imported by
// js/mission/lab/i18n.js and js/missionLabDocs.js.
// =============================================================================

export const EN_MISSIONLABGUIDES = {
  'gd.target.earth-orbit': 'Earth orbit: the rendezvous with the depot',
  'gd.target.window-2026': 'The 2026 Earth-Mars window on JPL DE441',
  'gd.target.direct-flight': 'The direct flight, by the validated 3-D kernel',

  'gd.ml-orbit.title': 'In Earth orbit: meeting the depot',
  'gd.ml-orbit.summary':
    'Meet a propellant depot 100 km above the parking orbit: the Hohmann rendezvous, the wait for the right geometry, and how a change of plane compares with a change of height.',
  'gd.ml-orbit.intro.title': 'A depot to meet',
  'gd.ml-orbit.intro.body':
    'The launch leaves the spacecraft in a 300 km circular orbit with only enough propellant to reach a depot circling at 400 km, where it fills its tanks for Mars. A rendezvous is a Hohmann transfer timed so that the depot reaches the far side of the transfer when the spacecraft does. The plan’s first box holds these numbers.',
  'gd.ml-orbit.intro.ok': '',
  'gd.ml-orbit.predict.title': 'Height or plane?',
  'gd.ml-orbit.predict.body':
    'Before computing: which costs more, climbing the 100 km to the depot’s orbit, or turning the orbit’s plane by 5 degrees without climbing?',
  'gd.ml-orbit.predict.opt.climb': 'Climbing 100 km',
  'gd.ml-orbit.predict.opt.turn': 'Turning the plane by 5 degrees',
  'gd.ml-orbit.predict.opt.same': 'About the same',
  'gd.ml-orbit.predict.ok': 'Recorded. The next steps measure it.',
  'gd.ml-orbit.dv.title': 'The rendezvous’s cost',
  'gd.ml-orbit.dv.body':
    'Compute the mission. What do the two rendezvous burns cost together, in m/s? The table “In Earth orbit” gives it.',
  'gd.ml-orbit.dv.ok':
    'Right: {value} m/s, two burns of about half that each. A small climb in low orbit is cheap.',
  'gd.ml-orbit.wait.title': 'The wait',
  'gd.ml-orbit.wait.body':
    'The depot must lead the spacecraft by just the right angle when the transfer starts. How long does the spacecraft wait in the parking orbit before the first burn, in minutes?',
  'gd.ml-orbit.wait.ok':
    'Right: {value} minutes. The lower orbit is faster, so the spacecraft gains on the depot until the angle comes round.',
  'gd.ml-orbit.compare.title': 'Height or plane: measured',
  'gd.ml-orbit.compare.body':
    'The same table says what turning the depot orbit’s plane by 5 degrees would cost. Which costs more?',
  'gd.ml-orbit.compare.opt.climb': 'The climb to the depot',
  'gd.ml-orbit.compare.opt.turn': 'Turning the plane by 5 degrees',
  'gd.ml-orbit.compare.opt.same': 'About the same',
  'gd.ml-orbit.compare.ok':
    'Right. A plane change swings the whole orbital velocity, 7.7 km/s in low orbit: 5 degrees of it is 2 v sin(2.5°). A small climb costs a fraction of that; only a very large one costs more. This is why a launch site chooses its orbits’ planes.',
  'gd.ml-orbit.phase.title': 'No waiting',
  'gd.ml-orbit.phase.body':
    'Change the depot’s lead in the plan so that the wait is under 10 minutes, and compute again. The lead the transfer needs is in the table.',
  'gd.ml-orbit.phase.ok': 'Done: the depot now starts just ahead of where the transfer needs it.',
  'gd.ml-orbit.waitAgain.title': 'The wait now',
  'gd.ml-orbit.waitAgain.body': 'What is the wait now, in minutes?',
  'gd.ml-orbit.waitAgain.ok': 'Right: {value} minutes.',
  'gd.ml-orbit.limits.title': 'What this part leaves out',
  'gd.ml-orbit.limits.body':
    'The Earth here is a point. Its equatorial bulge turns a low orbit’s plane by several degrees a day, and the thin atmosphere at 300 km lowers an orbit by drag; both matter to a real rendezvous, and neither is in the model. The burns are instantaneous. The rendezvous itself is flown by the validated 3-D kernel in the reference cases (S2), and the two spacecraft meet to about one part in a trillion.',
  'gd.ml-orbit.limits.ok': '',

  'gd.ml-window.title': 'Leaving for Mars: the launch window',
  'gd.ml-window.summary':
    'The 2026 opportunity on JPL’s ephemeris: find the cheapest day to leave, read its C3 and arrival speed, and see what a faster trip costs.',
  'gd.ml-window.intro.title': 'Every 26 months',
  'gd.ml-window.intro.body':
    'The Earth and Mars line up for a cheap transfer about every 26 months. For any day to leave and any time of flight, the ephemeris gives both planets’ positions, and a Lambert transfer about the Sun joins them. Doing that for every pair draws the launch window.',
  'gd.ml-window.intro.ok': '',
  'gd.ml-window.predict.title': 'Cheap and fast?',
  'gd.ml-window.predict.body': 'Is the cheapest day to leave also the one with the shortest trip?',
  'gd.ml-window.predict.opt.yes': 'Yes',
  'gd.ml-window.predict.opt.no': 'No',
  'gd.ml-window.predict.ok': 'Recorded. The window will say.',
  'gd.ml-window.open.title': 'Draw the window',
  'gd.ml-window.open.body':
    'Compute the window in the section “The 2026 launch window”: about 19,000 Lambert transfers, in the Worker.',
  'gd.ml-window.open.ok': 'Done: the window is drawn, and four candidates are listed under it.',
  'gd.ml-window.best.title': 'The cheapest day',
  'gd.ml-window.best.body':
    'Make the cheapest cell the plan: press “Use this” beside “Cheapest in delta-v”. The departure date and time of flight change, and the mission is computed again.',
  'gd.ml-window.best.ok': 'Done: the plan now leaves on the window’s cheapest day.',
  'gd.ml-window.c3.title': 'C3',
  'gd.ml-window.c3.body':
    'What is the departure’s C3, in km²/s²? It is the square of the excess speed the departure must give, and what launch vehicles are rated by.',
  'gd.ml-window.c3.ok':
    'Right: {value} km²/s². The model circles of the diagnostic page give the same C3 every opportunity; the real one depends on where in their eccentric, tilted orbits the planets are.',
  'gd.ml-window.fast.title': 'A faster trip',
  'gd.ml-window.fast.body':
    'Look at the window around 200 days of flight. Compared with the cheapest transfer, the cheapest 200-day trip costs…',
  'gd.ml-window.fast.opt.more': 'more',
  'gd.ml-window.fast.opt.about': 'about the same',
  'gd.ml-window.fast.opt.less': 'less',
  'gd.ml-window.fast.ok':
    'Right. A shorter trip needs a faster orbit, and pays for it at both ends. Missions trade delta-v for time: the row “Shortest trip within 10% of the cheapest” is one such trade.',
  'gd.ml-window.vinf.title': 'Arriving',
  'gd.ml-window.vinf.body':
    'What is the arrival excess speed at Mars, in km/s? It sets the capture burn, and how hard a lander’s heat shield must work.',
  'gd.ml-window.vinf.ok': 'Right: {value} km/s.',
  'gd.ml-window.declination.title': 'Out of the plane',
  'gd.ml-window.declination.body':
    'The departure’s excess velocity points out of the ecliptic. By how many degrees? The results give its declination.',
  'gd.ml-window.declination.ok':
    'Right: {value}°. Mars’s orbit is tilted 1.85° to the Earth’s, so a transfer must leave the Earth’s plane to meet it, the more steeply the nearer its transfer angle is to 180°. The flat circles of the diagnostic page have no such angle.',
  'gd.ml-window.limits.title': 'What this part leaves out',
  'gd.ml-window.limits.body':
    'Each cell is a two-body transfer between the planets’ centers, with a patched conic’s burn at each end: the next part flies it directly and sees what that leaves out. The positions are JPL’s, fitted to within a few km (MISSION_LAB.md has the table). The window shows one opportunity; the pack holds 2025 to 2045.',
  'gd.ml-window.limits.ok': '',

  'gd.ml-cruise.title': 'On the way: the patched conic against the direct flight',
  'gd.ml-cruise.summary':
    'Fly the designed spacecraft under the Sun and the planets from its real departure orbit, see how far it misses Mars, find out why, and pay for a correction.',
  'gd.ml-cruise.intro.title': 'Two models of one trajectory',
  'gd.ml-cruise.intro.body':
    'The patched conic designs in pieces: a hyperbola inside the Earth’s sphere of influence, an ellipse about the Sun between the planets’ centers, a hyperbola at Mars. The lab can also fly the same spacecraft directly: the validated 3-D kernel integrates it from its periapsis in the depot orbit, under the Sun and the planets ticked in the plan, starting them from their ephemeris states.',
  'gd.ml-cruise.intro.ok': '',
  'gd.ml-cruise.predict.title': 'How close?',
  'gd.ml-cruise.predict.body':
    'Flown directly with no correction, how far from Mars will the spacecraft be at the planned arrival?',
  'gd.ml-cruise.predict.opt.km1e3': 'Under 1,000 km',
  'gd.ml-cruise.predict.opt.km1e4': 'About 10,000 km',
  'gd.ml-cruise.predict.opt.km1e5': 'About 100,000 km',
  'gd.ml-cruise.predict.opt.km1e6': 'More than 1,000,000 km',
  'gd.ml-cruise.predict.ok': 'Recorded. The next step flies it.',
  'gd.ml-cruise.fly.title': 'Fly it as designed',
  'gd.ml-cruise.fly.body':
    'All four planets ticked, starting from the depot orbit, no correction: compute.',
  'gd.ml-cruise.fly.ok': 'Done.',
  'gd.ml-cruise.miss.title': 'The miss',
  'gd.ml-cruise.miss.body':
    'How far from Mars is the spacecraft at the planned arrival, in millions of km?',
  'gd.ml-cruise.miss.ok':
    'Right: {value} million km, several times the Moon’s distance, though every piece of the design was exact.',
  'gd.ml-cruise.test.title': 'Test the design itself',
  'gd.ml-cruise.test.body':
    'Untick every planet and start from the Earth’s center, as the patched conic’s ellipse does. Compute.',
  'gd.ml-cruise.test.ok':
    'Done: with the Sun alone, from the Earth’s center, the spacecraft arrives within meters. The ellipse was right; something else makes the miss.',
  'gd.ml-cruise.diagnose.title': 'Why it misses',
  'gd.ml-cruise.diagnose.body':
    'Tick the planets back one at a time, and try both starting points. What makes most of the miss?',
  'gd.ml-cruise.diagnose.opt.integration': 'The integration’s error',
  'gd.ml-cruise.diagnose.opt.planets': 'The pulls of Venus, Mars and Jupiter on the way',
  'gd.ml-cruise.diagnose.opt.earth':
    'The Earth’s pull on a spacecraft leaving from a real orbit, which the patched conic ends at its sphere of influence',
  'gd.ml-cruise.diagnose.opt.mars': 'Mars’s pull as it arrives',
  'gd.ml-cruise.diagnose.ok':
    'Right. From the Earth’s center the other planets move the arrival by under 100,000 km. Leaving from a real orbit, the Earth keeps pulling after the sphere of influence and the Sun pulls inside it, and the arrival moves by millions.',
  'gd.ml-cruise.explain.title': 'Explain it',
  'gd.ml-cruise.explain.body':
    'In your own words: why does the patched-conic spacecraft miss Mars, and why do mission designers still start from a patched conic?',
  'gd.ml-cruise.explain.ok': 'Recorded for your instructor.',
  'gd.ml-cruise.correct.title': 'Correct the course',
  'gd.ml-cruise.correct.body':
    'Tick “Correct the course” on day 30, with all four planets ticked and the depot-orbit start, and compute. The correction aims again and again until the spacecraft arrives within 100 km.',
  'gd.ml-cruise.correct.ok': 'Done.',
  'gd.ml-cruise.cost.title': 'Its cost',
  'gd.ml-cruise.cost.body': 'What does the correction cost, in m/s?',
  'gd.ml-cruise.cost.ok':
    'Right: {value} m/s, a small fraction of the departure burn. Real missions carry propellant for several corrections.',
  'gd.ml-cruise.late.title': 'Correct later',
  'gd.ml-cruise.late.body': 'Move the correction to day 200 and compute.',
  'gd.ml-cruise.late.ok': 'Done.',
  'gd.ml-cruise.lateCost.title': 'Its cost now',
  'gd.ml-cruise.lateCost.body': 'What does it cost now, in m/s?',
  'gd.ml-cruise.lateCost.ok': 'Right: {value} m/s.',
  'gd.ml-cruise.early.title': 'When to correct',
  'gd.ml-cruise.early.body': 'So a correction is cheaper…',
  'gd.ml-cruise.early.opt.early': 'the earlier it is made',
  'gd.ml-cruise.early.opt.late': 'the later it is made',
  'gd.ml-cruise.early.opt.same': 'whenever it is made',
  'gd.ml-cruise.early.ok':
    'Right. An error in velocity grows into an error in position with time, so the same miss takes less velocity to remove early. The reference cases (D2) fly four corrections to show it.',
  'gd.ml-cruise.propellant.title': 'The propellant',
  'gd.ml-cruise.propellant.body':
    'How much propellant must the depot load, for the burns after it, for this spacecraft, in kg? The table “Where the propellant comes from” gives it.',
  'gd.ml-cruise.propellant.ok':
    'Right: {value} kg, several times the spacecraft’s own dry mass. The rocket equation is exponential in delta-v, which is why every m/s is counted.',
  'gd.ml-cruise.limits.title': 'What the direct flight still leaves out',
  'gd.ml-cruise.limits.body':
    'The direct flight is a better model than the patched conic, not a real one: the Moon, the other planets, the Earth’s shape and sunlight’s pressure are left out, every burn is instantaneous and every state is known exactly. The list under “What this model leaves out” names them all. That is the difference from operational software: here the model’s limits are the lesson; there, removing them is what the tools are for.',
  'gd.ml-cruise.limits.ok': '',
};
