// The mission lab's evidence panel: its English
// (js/mission/lab/evidencePanel.js). Spanish in ./es.missionEvidence.js, with
// the same ids. The button that opens it is ml.ev.open in ./en.missionLab.js.

export const EN_MISSIONEVIDENCE = {
  'mle.heading': 'Evidence and My work',
  'mle.intro':
    'Keep a result of this plan as evidence for a report, set the patched-conic design against the spacecraft flown directly, save the mission to My work, or copy a link that opens this plan. Every number a kept result holds says what it is: what you chose in the plan is assumed, and what the model computed from it is derived. None has an uncertainty, because this is a teaching model with no navigation or tracking.',
  'mle.close': 'Close',

  // --- Keeping a result
  'mle.keep.heading': 'Keep a result as evidence',
  'mle.keep.kind': 'Result',
  'mle.keep.button': 'Keep as evidence',
  'mle.keep.none': 'Compute the mission first, and its results will be here.',
  'mle.keep.kept':
    'Kept in your evidence notebook, where your report cites it and My work lists it.',
  'mle.keep.failed': 'It could not be kept: {why}',
  'mle.keep.whyUnavailable': 'this browser is not keeping anything',
  'mle.keep.whyFull': 'the notebook is full',
  'mle.kind.timeline': 'The timeline of events',
  'mle.kind.maneuvers': 'The maneuvers',
  'mle.kind.budget': 'The delta-v budget',
  'mle.kind.comparison': 'The patched conic against the propagated flight',

  // --- What each result is called in the notebook
  'mle.title.timeline': 'Mission timeline, leaving {date}',
  'mle.title.maneuvers': 'Mission maneuvers, leaving {date}',
  'mle.title.budget': 'Delta-v budget, leaving {date}',
  'mle.title.comparison':
    'Patched conic against the propagated flight, leaving {date}',
  'mle.note.assumed': 'chosen in the plan',

  // --- What each quantity is called
  'mle.q.depart.jd': 'Departure date (Julian date)',
  'mle.q.depart.tof': 'Time of flight',
  'mle.q.correct.day': 'Day of the correction burn',
  'mle.q.parking.altitude': 'Parking orbit altitude',
  'mle.q.depot.altitude': 'Depot orbit altitude',
  'mle.q.depot.phase': 'Depot lead angle',
  'mle.q.arrive.periapsis': 'Capture orbit periapsis altitude',
  'mle.q.arrive.apoapsis': 'Capture orbit apoapsis altitude',
  'mle.q.vehicle.dry': 'Dry mass',
  'mle.q.vehicle.isp': 'Specific impulse',
  'mle.q.direct.bodies': 'Planets pulling on the direct flight',
  'mle.q.direct.fromCenter':
    'Direct flight starts at the Earth’s center (1) or in orbit (0)',
  'mle.q.vinf.departure': 'Hyperbolic excess speed at departure',
  'mle.q.vinf.arrival': 'Hyperbolic excess speed at arrival',
  'mle.q.capture.period': 'Capture orbit period',
  'mle.q.dv.total': 'Total delta-v',
  'mle.q.propellant.earthOrbit': 'Propellant for the Earth orbit burns',
  'mle.q.propellant.interplanetary': 'Propellant for the interplanetary burns',
  'mle.q.exhaust.earthOrbit': 'Exhaust speed, Earth orbit burns',
  'mle.q.exhaust.interplanetary': 'Exhaust speed, interplanetary burns',
  'mle.q.miss.arrival': 'Miss of Mars, flown directly',
  'mle.q.residual.first': 'Residual at departure',
  'mle.q.residual.max': 'Largest residual',
  'mle.q.residual.max.day': 'Day of the largest residual',
  'mle.q.residual.last': 'Residual at arrival',
  'mle.q.closest.distance': 'Closest approach to Mars, flown directly',
  'mle.q.closest.day': 'Day of the closest approach',
  'mle.q.mars.drift': 'Drift of Mars in the direct flight',
  'mle.q.correction.dv': 'Correction burn delta-v',
  'mle.q.correction.miss': 'Miss of Mars after the correction',
  'mle.q.event': 'Event: {name} (Julian date)',
  'mle.q.burn.jd': 'Burn: {name} (Julian date)',
  'mle.q.burn.dv': 'Burn: {name}, delta-v',
  'mle.q.burn.propellant': 'Burn: {name}, propellant',
  'mle.q.burn.massBefore': 'Burn: {name}, mass before',

  // --- The patched conic against the propagated flight
  'mle.cmp.heading': 'The patched conic against the propagated flight',
  'mle.cmp.intro':
    'The patched-conic design says where the spacecraft is on each day. The propagated flight is the same spacecraft integrated under the Sun and the planets you ticked. The residual is the distance between the two.',
  'mle.cmp.distance': 'Distance from Mars (km, logarithmic)',
  'mle.cmp.residual': 'Residual (km, logarithmic)',
  'mle.cmp.days': 'Days after departure',
  'mle.cmp.alt':
    'Two charts over {tof} days. Distance from Mars: the patched-conic spacecraft ends {pEnd} from it and the propagated one {dEnd}. Residual between the two spacecraft: {first} at departure, at most {max} on day {day}, {last} at arrival.',
  'mle.cmp.table': 'The two flights every {n} days',
  'mle.cmp.col.day': 'Day',
  'mle.cmp.col.patched': 'Patched: from Mars',
  'mle.cmp.col.direct': 'Propagated: from Mars',
  'mle.cmp.col.residual': 'Residual',
  'mle.cmp.corrected':
    'The plan has a correction on day {day}, so the propagated flight is aimed again then and the residual shrinks after it.',
  'mle.cmp.uncorrected':
    'The plan has no correction, so nothing aims the propagated flight at Mars again, and the residual is what the design leaves out.',
  'mle.cmp.none': 'Compute the mission first, and the comparison will be here.',
  'mle.unit.km': '{v} km',

  // --- Saving the mission
  'mle.save.heading': 'Save this mission',
  'mle.save.hint':
    'The saved mission is the plan file the lab writes: your plan and what came of it. My work lists it and the lab opens it again. A report cites the evidence you keep above, not a saved mission.',
  'mle.save.name': 'Name',
  'mle.save.defaultName': 'Mission to Mars',
  'mle.save.button': 'Save to My work',
  'mle.save.saved': 'Saved. My work lists it, and the lab opens it again.',
  'mle.save.failed': 'It could not be saved: {why}',
  'mle.save.none': 'Compute the mission first.',
  'mle.save.open': 'My work',

  // --- A link
  'mle.link.heading': 'A link that opens this plan',
  'mle.link.label': 'Link',
  'mle.link.hint':
    'Whoever opens it gets the lab with this plan in the editor. The figure builder makes an embedded figure from it.',
  'mle.link.copy': 'Copy the link',
  'mle.link.copied': 'Copied.',
  'mle.link.manual': 'Select the link and copy it.',
  'mle.link.none': 'This plan is too long for a link.',
};
