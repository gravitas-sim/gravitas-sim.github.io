// Las filas de órbita y radio del inspector (js/inspectorOrbit.js), en
// español. Se registran con la tarjeta del inspector.
export const ES_INSPECTORORBIT = {
  'inspector.stat.primary': 'Primario',
  'inspector.stat.semiMajorAxis': 'Semieje mayor (dos cuerpos)',
  'inspector.stat.eccentricity': 'Excentricidad (dos cuerpos)',
  'inspector.stat.modelRadius': 'Radio del modelo (tamaño de contacto)',
  'inspector.forModelRadius': '(para el radio del modelo)',
  'inspector.byMass': '(por masa)',
  'inspector.byModelRadius': '(por radio del modelo)',
  'inspector.orbit.noPrimary': 'sin primario',
  'inspector.orbit.unbound': 'no ligado',
  'inspector.orbit.softened':
    'aquí no es una órbita de dos cuerpos: dentro de la longitud de suavizado, donde la atracción crece con la distancia',
  'inspector.orbit.mond':
    'aquí no es una órbita de dos cuerpos: la gravedad modificada (MOND) está activa',
  'inspector.orbit.approximate': '(aproximado: halo de materia oscura)',
  'inspector.orbit.unnamed': 'cuerpo sin nombre',
  'inspector.tip.radiusPhysical':
    'El radio físico del cuerpo, medido o deducido de sus propiedades declaradas. Las colisiones de la simulación usan en cambio el radio del modelo, y el dibujo está ampliado; lee los radios aquí, nunca del dibujo.',
  'inspector.tip.twoBody':
    'Valores de dos cuerpos respecto al primario indicado arriba, a partir de la posición y la velocidad actuales y de la gravedad propia del par: G(M + m) donde cada uno atrae al otro, G M donde solo atrae el primario. Los demás cuerpos perturban la trayectoria real.',
};
