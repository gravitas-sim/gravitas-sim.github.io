// =============================================================================
// The formula language's words, in English
// -----------------------------------------------------------------------------
// formula.err.<code> says why a formula was refused, for every code
// js/formula/parse.js can throw (CODES), and takes the variables the error
// carries. Dimensions are written in SI (m kg s K), which every language
// reads alike; `1` is none. The other ids are the surfaces' own: the
// observatory's form (obs.formula.*), the composer's question items
// (composer.formula.*) and the notebook's derived quantity (nb.formula.*).
// Registered by the module that uses them, when it loads. The same keys are in
// es.formula.js.
// =============================================================================

export const EN_FORMULA = {
  'formula.err.length': 'The formula is longer than {max} characters.',
  'formula.err.tokens': 'The formula has more than {max} parts.',
  'formula.err.char':
    'The character {char} is not part of the formula language.',
  'formula.err.number':
    '{text} is not a number the formula can read. Write it as 1.5 or 1e-3.',
  'formula.err.empty': 'Type a formula.',
  'formula.err.expected': 'A {want} was expected here.',
  'formula.err.end': 'The formula ends too early.',
  'formula.err.unexpected': 'Unexpected {text}.',
  'formula.err.adjacent':
    '{text} follows something it cannot be joined to. Write an operator between them, such as *.',
  'formula.err.depth': 'Brackets are nested more than {max} deep.',
  'formula.err.nodes': 'The formula has more than {max} steps.',
  'formula.err.unit': '{unit} is not a unit Gravitas knows.',
  'formula.err.unknownId':
    '{name} is not a column or quantity here. You can use: {known}.',
  'formula.err.noUnit':
    '{name} has no unit stated, so a formula cannot check it. State its unit first.',
  'formula.err.interval':
    '{name} has an uncertainty given as an interval, which this rule cannot propagate. Use the bootstrap in the analysis lab instead.',
  'formula.err.notConstrained':
    '{name} is not constrained by the data, so it has no value to compute with. Fix the fit or state a value for it first.',
  'formula.err.failed':
    '{name} has no result: the analysis that was to produce it failed. A formula cannot use it.',
  'formula.err.limit':
    '{name} is an upper or lower limit, which this rule cannot carry through. A derivation passes one limit through a formula whose other inputs are exact.',
  'formula.err.limitMixed':
    '{name} is an upper or lower limit, and a limit only passes through a formula when it is the one limit in it and every other input is exact. Otherwise the result would be neither a limit nor a value.',
  'formula.err.limitNonMonotone':
    'The formula is not steadily rising or falling as {name} runs from zero to its limit, so a limit on it is not a limit on the result.',
  'formula.err.string':
    "A quoted unit belongs only in to(x, 'km/s'); there are no other strings.",
  'formula.err.dimension':
    'In {expr}: {left} is {a} but {right} is {b}, and different kinds of quantity cannot be added or subtracted.',
  'formula.err.angleMix':
    'In {expr}: an angle and a plain number cannot be added or subtracted. Give the number a unit, such as 1[rad] or 1[deg].',
  'formula.err.opaque':
    'In {expr}: a magnitude, a logarithm (dex) or a simulation unit can be added to or subtracted from its own kind and scaled by a plain number, and nothing else.',
  'formula.err.power':
    'The exponent {expr} must be a plain number written in the formula, not a column.',
  'formula.err.fractional':
    'In {expr}: a power of {power} would give fractional powers of a unit, which a formula cannot keep.',
  'formula.err.unknownFn': '{name} is not a function of the formula language.',
  'formula.err.arity': '{fn} takes {want} (it was given {got}).',
  'formula.err.conversion':
    'Cannot write {expr}, which is {dim}, in a unit that is {to}.',
  'formula.err.dimensionless':
    '{fn} needs a plain number, but {expr} is {dim}. Divide it by a quantity of the same kind first.',
  'formula.err.notAngle': '{fn} takes a plain number, not an angle.',
  'formula.err.rows': 'This table has {rows} rows; the limit is {max}.',
  'formula.err.of':
    'The name {name} must stand for a field of an earlier measure step, written step.field, and must not be a constant ({ref}).',
  'formula.err.unitless':
    'The result is in {unit}. Give the question that unit, or divide the result by a unit written as a number.',
  'formula.err.data': 'The values of {name} are not available.',

  'obs.formula.name': 'New column',
  'obs.formula.text': 'Formula',
  'obs.formula.go': 'Add the column',
  'obs.formula.help.title': 'What a formula can use',
  'obs.formula.help.grammar':
    'Numbers, + - * / and ^, brackets, and the functions below. A number with a unit is written 5[km/s]. A column whose id has anything but letters, digits and _ is written in braces, {flux-err}. Numbers use the decimal point (1.5); separate arguments with "," or ";". A formula only computes: it cannot assign, branch or repeat. A sum must be of one kind of quantity, and a logarithm takes a ratio, as in log10(d / 10[pc]).',
  'obs.formula.help.names':
    "Columns: {names}. Functions: {functions}. Constants: {constants}. min, max and mean take a column and give one number; to(x, 'km/s') writes x in a unit.",
  'obs.formula.preview': 'The new column would be in {unit}. {why}',
  'obs.formula.plain': 'no unit (a plain number)',
  'obs.formula.noUnit':
    'The result is {dim} ({dimension} in SI), which has no unit in the registry, so it cannot be a column. Divide by a unit written as a number, such as 1[yr], or write it in a unit with to(…).',
  'obs.formula.gaps':
    '{n} rows have no value: an input was missing there, or the formula has none at that value.',
  'obs.formula.why.first-order':
    'Its uncertainty is propagated to first order from the columns’ own, treated as independent.',
  'obs.formula.why.none':
    '{lacking} has no uncertainty recorded, so the new column has none.',
  'obs.formula.why.shared':
    'It has no uncertainty: a column used inside min, max or mean and elsewhere is correlated with itself, which this rule cannot handle.',
  'obs.formula.why.exact': 'It reads no column, so it is exact.',
  'obs.note.formula':
    'A new column, {name} = {formula}: computed here by a formula, not measured. {why}{gaps}',
  'obs.op.formula': 'new column by a formula',

  'nb.formula.intro':
    'Compute a new number from numbers in this notebook. Name them q1, q2 and so on, as listed, and write a formula such as (q1 / 1[yr])^2 / (q2 / 1[AU])^3. Units are checked, and the uncertainty is propagated to first order when every number you use has one. The result is kept with its formula and what it was made from.',
  'nb.formula.row': '{name}: {label} = {value} {unit}',
  'nb.formula.noUnit': 'no unit recorded',
  'nb.formula.none': 'The notebook holds no numbers yet.',
  'nb.formula.title': 'Name of the new quantity',
  'nb.formula.text': 'Formula',
  'nb.formula.go': 'Make the quantity',
  'nb.formula.preview': 'The quantity would be in {unit}. {why}',
};
