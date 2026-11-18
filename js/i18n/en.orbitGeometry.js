// The orbit geometry overlay (js/orbitGeometryOverlay.js), in English: its
// label, the reasons it draws no curve, its parts and markers, and the ruler.
// Registered by that module when it is first switched on.
export const EN_ORBITGEOMETRY = {
  'orbitGeometry.title': 'Orbit geometry',
  'orbitGeometry.label': 'Orbit about {primary} if only it pulled',
  'orbitGeometry.second': '{source} pulls {pct}% as hard as {primary}',
  'orbitGeometry.approximate': 'Approximate: the halo also pulls',
  'orbitGeometry.elements': 'a = {a}, e = {e}',
  'orbitGeometry.reason.unbound': 'No ellipse: not bound to {primary}',
  'orbitGeometry.reason.none':
    'No ellipse: {primary} does not pull on this body in this model',
  'orbitGeometry.reason.softened':
    'Not a two-body orbit here: gravity is softened inside {length}',
  'orbitGeometry.reason.mond':
    'Not a two-body orbit here: this world runs modified gravity (MOND)',
  'orbitGeometry.reason.no-primary': 'No ellipse: nothing pulls on this body',
  'orbitGeometry.parts': 'Show',
  'orbitGeometry.part.ellipse': 'Ellipse',
  'orbitGeometry.part.apsides': 'Nearest and farthest points',
  'orbitGeometry.part.foci': 'Foci',
  'orbitGeometry.marker.focus-primary': 'Focus at {primary}',
  'orbitGeometry.marker.focus-empty': 'Empty focus',
  'orbitGeometry.marker.periapsis': 'Periapsis (nearest)',
  'orbitGeometry.marker.apoapsis': 'Apoapsis (farthest)',
  'orbitGeometry.points': 'Points to measure',
  'orbitGeometry.keys':
    'Left and Right move, Enter or Space chooses, Escape clears; two at most.',
  'orbitGeometry.distance': 'Distance between {a} and {b}: {d}',
  'orbitGeometry.pickTwo':
    'Choose two points to read the distance between them.',
  'orbitGeometry.chosen': '{name} chosen',
  'orbitGeometry.cleared': 'Points cleared',
  'orbitGeometry.close': 'Close orbit geometry',
  'orbitGeometry.summary': 'Orbit geometry for {name}: {label}.',
};
