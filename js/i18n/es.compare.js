// =============================================================================
// The comparison instruments' words, in Spanish
// -----------------------------------------------------------------------------
// Registered by js/compareWidgets.js when the family loads, so no other page
// carries them. compareW.* ids.
// =============================================================================

export const ES_COMPARE = {
  'compareW.title.transit': 'Modelo frente a datos: un tránsito',
  'compareW.note':
    'Un sistema superpuesto a los datos. No se ajusta nada: mover un elemento solo muestra qué hace ese elemento, y la tabla dice qué números se dieron al modelo.',
  'compareW.control.radiusEarth': 'Radio del planeta',
  'compareW.control.massEarth': 'Masa del planeta',
  'compareW.control.periodDays': 'Periodo',
  'compareW.control.epochDays': 'Desfase de época',
  'compareW.control.inclinationDeg': 'Inclinación',
  'compareW.control.e': 'Excentricidad',
  'compareW.preset.given': 'El sistema tal como se dio',
  'compareW.row.kind': 'Qué es',
  'compareW.value.kind': 'Un sistema sobre datos. No se ajusta nada.',
  'compareW.row.objective': 'Chi cuadrado',
  'compareW.row.reduced': 'Chi cuadrado reducido',
  'compareW.row.dof': 'Grados de libertad',
  'compareW.row.moved': 'Elementos que moviste',
  'compareW.value.none': 'ninguno',
  'compareW.row.where': 'Dónde falla el modelo',
  'compareW.value.consistent':
    'en ninguna parte: los residuos son compatibles con los errores declarados',
  'compareW.value.over':
    'de {from} a {to} el modelo queda por encima de los datos',
  'compareW.value.under':
    'de {from} a {to} el modelo queda por debajo de los datos',
  'compareW.row.given': 'Dado al modelo',
  'compareW.value.given':
    '{n} elementos, todos supuestos; {d} derivados de ellos',
  'compareW.row.error': 'No se puede comparar',
  'compareW.loading': 'Generando los datos',
  'compareW.axis.residual': 'Residuo en sigmas',
  'compareW.axis.data': 'Datos y modelo',
  'compareW.est.result':
    'La diferencia es {diff}: {n} sigma. Una diferencia tan grande o mayor surgiría por azar con probabilidad {p}.',
  'compareW.est.which.a': 'La primera estimación',
  'compareW.est.which.b': 'La segunda estimación',
  'compareW.est.assume.gaussian': 'Se supone que los errores son gaussianos.',
  'compareW.est.assume.independent':
    'Las dos estimaciones se tratan como independientes, porque no se dio ninguna covarianza.',
  'compareW.est.assume.covariance': 'Se tiene en cuenta su covarianza.',
  'compareW.est.assume.sharedUnknown':
    'Comparten sus datos o su calibración, así que sus errores se mueven juntos: la incertidumbre de la diferencia es probablemente menor de lo que dice esto y la diferencia más significativa. Dé su correlación para corregirlo.',
  'compareW.est.refused.value': 'Una de las dos no tiene valor que comparar.',
  'compareW.est.refused.none':
    '{which} no indica incertidumbre, así que no se pueden comparar.',
  'compareW.est.refused.asymmetric':
    '{which} tiene un intervalo asimétrico, que esta comparación no puede tratar como una desviación estándar.',
  'compareW.est.refused.level':
    '{which} es un intervalo sin nivel de confianza indicado, así que no se puede convertir en una desviación estándar.',
  'compareW.est.refused.limit':
    '{which} es un límite, no una medición, así que no hay diferencia que comparar.',
  'compareW.est.refused.failed': '{which} no tiene resultado.',
  'compareW.est.refused.not-constrained':
    '{which} no está acotada por los datos.',
  'compareW.est.refused.covariance':
    'La covarianza dada es mayor de lo que permiten las dos incertidumbres.',
};
