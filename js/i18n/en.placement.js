// =============================================================================
// The words for typed placement and for the tables behind the plots, in English
// -----------------------------------------------------------------------------
// Split out of ./en.deferred.js for the reason ./en.activities.js was split
// out of the teaching catalog: the deferred catalog is embedded in four
// separate bundles - the application's lazy chunks, the instructor portal and
// the validation worker among them - so a string added there is downloaded four
// times by somebody who needs it once, and by three readers who cannot reach
// the feature at all.
//
// These fifty-odd strings cost 5.7 KB of source and 16 KB across those bundles,
// which was the whole of a deferred-budget overrun. Here they are imported by
// js/precisePlacement.js and js/seriesTable.js, both of which are loaded on
// demand, and registered for the one locale in use rather than both.
// =============================================================================

export const EN_PLACEMENT = {
  'place.precise.title': 'Precise placement',
  'place.precise.intro':
    'Add a body by entering its state. This is the same placement the canvas performs; a body added here is identical to one placed by clicking, and the undo button removes it the same way.',
  'place.precise.field.type': 'Object type',
  'place.precise.field.x': 'X position ({unit})',
  'place.precise.field.y': 'Y position ({unit})',
  'place.precise.field.vx': 'X velocity ({unit})',
  'place.precise.field.vy': 'Y velocity ({unit})',
  'place.precise.field.mass': 'Mass ({unit})',
  'place.precise.unit.length': 'simulation length units',
  'place.precise.unit.speed': 'simulation length units per time unit',
  'place.precise.mass.suns': 'solar masses',
  'place.precise.mass.earths': 'Earth masses',
  'place.precise.mass.jupiters': 'Jupiter masses',
  'place.precise.mass.ceres': 'Ceres masses',
  'place.precise.mass.halleys': 'Halley masses',
  'place.precise.limitHint':
    'Between \u2212{limit} and {limit}. Leave blank for zero.',
  'place.precise.massHint':
    'Between {min} and {max}. Leave blank and one is chosen for you, as it is when you place by clicking. A typical value is {placeholder}.',
  'place.precise.auHint': 'That position is {x} AU, {y} AU from the origin.',
  'place.precise.submit': 'Add body',
  'place.precise.close': 'Done',
  'place.precise.error.number': 'Enter a number.',
  'place.precise.error.range': 'Must be between \u2212{limit} and {limit}.',
  'place.precise.error.massRange': 'Must be between {min} and {max}.',
  'place.precise.error.type': '{type} is not a type that can be placed.',
  'place.precise.error.failed':
    'The body could not be created. Check the values and try again.',
  'place.precise.invalid':
    '{count} field needs attention. Focus has moved to the first one.',
  'place.precise.placed':
    '{type} added at {x}, {y}. The form is still open; add another or choose Done.',
  'place.precise.placedShort': 'Added {type} at {x}, {y}.',
  'series.table.all': '{name}: all {rows} rows, as a table.',
  'series.table.sampled':
    '{name}: {shown} of {rows} rows, every {stride}th sample. Download the CSV for all of them.',
  'series.table.empty': '{name}: nothing recorded yet.',
  'series.column.t_days': 'Time',
  'series.column.flux_relative': 'Brightness',
  'series.column.in_transit': 'In transit',
  'series.column.transit_number': 'Transit number',
  'series.column.rv_ms': 'Radial velocity',
  'series.column.rv_err_ms': 'Uncertainty',
  'series.column.r_au': 'Radius',
  'series.column.v_kms': 'Orbital speed',
  'series.column.v_tangential_kms': 'Tangential speed',
  'series.column.mass_solar': 'Mass',
  'series.column.name': 'Name',
};
