// =============================================================================
// An instrument pack: a course's own telescope, checked as a built-in one is
// -----------------------------------------------------------------------------
// A gravitas.instrument/1 file holds one facility (a telescope, its instruments
// and, if it is on the ground, its site) with its own sources. It is held to
// the rules of the instrument library (INSTRUMENTS.md, js/instruments/
// validate.js): every value a registry unit and a source with a retrieval date
// and a rights basis, a missing value absent, and an id no built-in facility
// uses. `sdk test` adds the library's cross-checks (the plate-scale relation,
// the field against the array) where the pack carries the numbers they need.
// =============================================================================

import { FACILITIES, SITES, SOURCES } from '../../js/data/instruments.js';
import { completeness, validatePack } from '../../js/instruments/validate.js';
import { runLegs } from '../../tools/instruments-validate.mjs';
import { readFileSync } from 'node:fs';

const THRESHOLDS = JSON.parse(
  readFileSync(
    new URL(
      '../../tests/fixtures/instruments/thresholds.json',
      import.meta.url
    ),
    'utf8'
  )
);

const builtin = () => ({
  sources: SOURCES,
  sites: SITES,
  facilityIds: FACILITIES.map(f => f.id),
});

/** Every problem with a pack, as { path, message }. */
export const checkInstrumentPack = pack => validatePack(pack, builtin());

/** The library's cross-checks on a valid pack: [{ id, facility, status, detail }]. */
export function instrumentLegs(pack) {
  return runLegs(
    {
      sources: { ...SOURCES, ...(pack.sources ?? {}) },
      sites: { ...SITES, ...(pack.sites ?? {}) },
      facilities: [pack.facility],
    },
    THRESHOLDS
  );
}

/** How much of what its class expects the pack's facility states. */
export function instrumentCompleteness(pack) {
  const site = pack.facility.site
    ? { ...SITES, ...(pack.sites ?? {}) }[pack.facility.site]
    : undefined;
  return completeness(pack.facility, site);
}
