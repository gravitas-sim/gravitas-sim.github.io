// =============================================================================
// The mission lab's default plan: the 2026 Earth-Mars opportunity
// -----------------------------------------------------------------------------
// Its own module so the page can start from it without loading the solvers,
// which are the Worker's (../solar.js says what each part means).
// =============================================================================

export const DEFAULT_PLAN = Object.freeze({
  parking: { altitude: 300 },
  depot: { altitude: 400, phaseDeg: 17 },
  depart: { date: '2026-11-01', tofDays: 309 },
  arrive: { periapsisAltitude: 400, apoapsisAltitude: 400 },
  correct: null,
  vehicle: { dryKg: 2000, ispS: 320 },
  direct: {
    bodies: ['venus', 'earth', 'mars', 'jupiter'],
    start: 'periapsis',
  },
});

/** The bodies a direct flight may include. */
export const PULLER_IDS = Object.freeze(['venus', 'earth', 'mars', 'jupiter']);
