// Las palabras del instrumento de calibración fotométrica, en español (Prompt 212). La extinción
// de aquí es la ATMOSFÉRICA; la extinción interestelar del modelo de radiación es otra magnitud.
export const ES_PHOTCAL = {
  'pcW.title': 'De cuentas a magnitudes',
  'pcW.note':
    'Una noche sintética de estrellas patrón: se conocen sus magnitudes y colores de catálogo, y las magnitudes del instrumento se fabrican a partir de una verdad declarada con ruido. El ajuste halla el punto cero, la extinción del aire y el término de color; el gráfico muestra lo que sobra; una estrella problema se calibra con la incertidumbre que deja el ajuste. La extinción de aquí es la de la atmósfera, en magnitudes por masa de aire, no el polvo entre las estrellas.',
  'pcW.chart': 'Calibración de una noche sintética',
  'pcW.control.night': 'La noche',
  'pcW.control.stars': 'Estrellas patrón usadas',
  'pcW.control.noise': 'Ruido de cada medida',
  'pcW.control.reach': 'Mayor masa de aire observada',
  'pcW.control.model': 'Modelo',
  'pcW.control.prior': 'Usar un coeficiente citado del sitio',
  'pcW.control.view': 'Gráfico',
  'pcW.control.colour': 'Índice de color del problema',
  'pcW.control.airmass': 'Masa de aire del problema',
  'pcW.control.truth': 'Mostrar la verdad',
  'pcW.night.0': 'noche despejada',
  'pcW.night.1': 'un intervalo estrecho de masa de aire',
  'pcW.night.2': 'extinción que depende del color',
  'pcW.model.0': 'primer orden',
  'pcW.model.1': 'con extinción que depende del color',
  'pcW.view.0': 'recta de Bouguer',
  'pcW.view.1': 'residuos frente a la masa de aire',
  'pcW.view.2': 'residuos frente al color',
  'pcW.toggle.0': 'no',
  'pcW.toggle.1': 'sí',
  'pcW.v.mmag': '{n} mmag',
  'pcW.axis.airmass': 'masa de aire',
  'pcW.axis.colour': 'índice de color de la estrella patrón',
  'pcW.axis.bouguer': 'm − M (magnitudes), sin el término de color',
  'pcW.axis.residual': 'residuo (magnitudes)',
  'pcW.legend.used': 'estrellas patrón usadas',
  'pcW.legend.out': 'excluidas: sobre el límite de masa de aire',
  'pcW.legend.fit': 'ajuste: pendiente k = {k}',
  'pcW.legend.res': 'residuos, con sus errores',
  'pcW.legend.zero': 'cero',
  'pcW.row.model': 'Modelo',
  'pcW.m':
    'Una noche sintética con una verdad declarada: M − m = Z1 − k (X − 1) + c C, con Z1 el punto cero a masa de aire 1, k la extinción de la atmósfera en magnitudes por masa de aire, c un término de color y X la masa de aire; mínimos cuadrados ponderados, con el error de la magnitud de catálogo de una estrella compartido por sus observaciones',
  'pcW.row.status': 'Estado',
  'pcW.row.night': 'Noche',
  'pcW.v.night':
    '{n} estrellas patrón, {o} medidas, masa de aire de {lo} a {hi}',
  'pcW.row.excluded': 'Excluidas',
  'pcW.v.excluded':
    '{n} medidas sobre la masa de aire {lim}, donde no se confía en una recta en la masa de aire, dejadas fuera y marcadas',
  'pcW.row.zero': 'Punto cero a masa de aire 1',
  'pcW.v.zero': '{z} mag',
  'pcW.v.zeroOpen':
    'no restringido: las estrellas patrón se vieron todas con casi la misma masa de aire, así que el punto cero y la extinción no se distinguen',
  'pcW.row.k': 'Extinción del aire, k',
  'pcW.v.perAirmass': 'mag por masa de aire',
  'pcW.v.fromPrior': '(de la tabla citada; la noche no pudo fijarla)',
  'pcW.row.c': 'Término de color, c',
  'pcW.row.k2': 'Dependencia de la extinción con el color, k2',
  'pcW.v.pm': '{v} ± {s}',
  'pcW.v.notConstrained': 'no restringido por esta noche',
  'pcW.row.fit': 'El ajuste',
  'pcW.v.fit':
    'chi cuadrado {c} con {d} grados de libertad (p = {p}); los residuos se dispersan {r} mmag',
  'pcW.v.fitNone':
    'no quedan grados de libertad, así que nada comprueba el ajuste',
  'pcW.row.nested': '¿Hay más en los datos?',
  'pcW.v.nested':
    'añadir una extinción que dependa del color baja el chi cuadrado en {d} (p = {p})',
  'pcW.row.target': 'Estrella problema',
  'pcW.v.target':
    'magnitud instrumental {m}; magnitud calibrada {M} ± {s}; intervalo del 95 por ciento de {lo} a {hi}',
  'pcW.row.truth': 'Verdad de la noche sintética',
  'pcW.v.truth': 'Z1 {z}, k {k}, c {c}; la magnitud verdadera del problema {M}',
  'pcW.row.flags': 'Marcas',
  'pcW.v.noflags': 'ninguna',
  'pcW.flag.excluded': 'se excluyó una medida',
  'pcW.flag.airmass-above-limit':
    'se excluyó una estrella patrón sobre el límite de masa de aire',
  'pcW.flag.lack-of-fit':
    'mal ajuste: los errores declarados se ensancharon con la dispersión',
  'pcW.flag.colour-term-not-constrained':
    'el término de color no está restringido: se añadió un sistemático declarado',
  'pcW.flag.extinction-from-prior': 'la extinción es el coeficiente citado',
  'pcW.flag.extinction-not-constrained': 'la extinción no está restringida',
  'pcW.flag.second-order-not-constrained':
    'la extinción que depende del color no está restringida',
  'pcW.flag.second-order-extinction-suspected':
    'se sospecha una extinción que depende del color',
  'pcW.flag.no-degrees-of-freedom': 'sin grados de libertad',
  'pcW.flag.colour-assumed-typical': 'se supuso el color del problema',
  'pcW.refuse.empty-night': 'no hay medidas',
  'pcW.refuse.no-usable-standards': 'ninguna estrella patrón es utilizable',
  'pcW.refuse.rank-deficient':
    'la noche no puede fijar los términos pedidos: no hay solución',
  'pcW.refuse.bad-input': 'una medida no es utilizable',
  'pcW.refuse.airmass-above-limit':
    'rechazado: el problema está sobre el límite de masa de aire',
  'pcW.refuse.extinction-not-constrained':
    'rechazado: la extinción no está restringida y el problema no está a la masa de aire de las estrellas patrón',
  'pcW.refuse.no-solution': 'no hay solución',
  'pcW.row.assumes': 'Supone',
  'pcW.a':
    'que la extinción es constante durante la noche; que las magnitudes de catálogo son correctas; que las medidas no tienen errores de apertura ni de campo plano; que una recta en la masa de aire y en el color describe el instrumento; que el problema tiene el color que fijas. La noche es sintética.',
  'pcW.action.keep': 'Guardar la calibración en mi cuaderno',
  'pcW.keep.title': 'Calibración fotométrica de una noche sintética',
  'pcW.keep.q.zero-point': 'Punto cero a masa de aire 1',
  'pcW.keep.q.extinction': 'Extinción del aire (por masa de aire)',
  'pcW.keep.q.colour-term': 'Término de color',
  'pcW.keep.q.colour-extinction': 'Dependencia de la extinción con el color',
  'pcW.keep.q.zero-point-outside-atmosphere':
    'Punto cero fuera de la atmósfera',
  'pcW.keep.q.magnitude': 'Magnitud calibrada del problema',
};
