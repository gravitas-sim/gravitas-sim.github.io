// The orbit geometry overlay (js/orbitGeometryOverlay.js), in Spanish: its
// label, the reasons it draws no curve, its parts and markers, and the ruler.
// Registered by that module when it is first switched on.
export const ES_ORBITGEOMETRY = {
  'orbitGeometry.title': 'Geometría de la órbita',
  'orbitGeometry.label': 'Órbita alrededor de {primary} si solo él tirara',
  'orbitGeometry.second': '{source} tira un {pct}% de lo que tira {primary}',
  'orbitGeometry.approximate': 'Aproximada: el halo también tira',
  'orbitGeometry.elements': 'a = {a}, e = {e}',
  'orbitGeometry.reason.unbound': 'Sin elipse: no está ligado a {primary}',
  'orbitGeometry.reason.none':
    'Sin elipse: en este modelo {primary} no tira de este cuerpo',
  'orbitGeometry.reason.softened':
    'Aquí no es una órbita de dos cuerpos: la gravedad está suavizada por debajo de {length}',
  'orbitGeometry.reason.mond':
    'Aquí no es una órbita de dos cuerpos: este mundo usa gravedad modificada (MOND)',
  'orbitGeometry.reason.no-primary': 'Sin elipse: nada tira de este cuerpo',
  'orbitGeometry.parts': 'Mostrar',
  'orbitGeometry.part.ellipse': 'Elipse',
  'orbitGeometry.part.apsides': 'Puntos más cercano y más lejano',
  'orbitGeometry.part.foci': 'Focos',
  'orbitGeometry.marker.focus-primary': 'Foco en {primary}',
  'orbitGeometry.marker.focus-empty': 'Foco vacío',
  'orbitGeometry.marker.periapsis': 'Periapsis (más cercano)',
  'orbitGeometry.marker.apoapsis': 'Apoapsis (más lejano)',
  'orbitGeometry.points': 'Puntos para medir',
  'orbitGeometry.keys':
    'Izquierda y Derecha mueven, Intro o Espacio eligen, Escape borra; dos como máximo.',
  'orbitGeometry.distance': 'Distancia entre {a} y {b}: {d}',
  'orbitGeometry.pickTwo':
    'Elige dos puntos para leer la distancia entre ellos.',
  'orbitGeometry.chosen': '{name} elegido',
  'orbitGeometry.cleared': 'Puntos borrados',
  'orbitGeometry.close': 'Cerrar la geometría de la órbita',
  'orbitGeometry.summary': 'Geometría de la órbita de {name}: {label}.',
};
