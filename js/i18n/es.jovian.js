// =============================================================================
// Las palabras de los instrumentos de las lunas de Júpiter, en español
// -----------------------------------------------------------------------------
// Las registra js/jovianWidgets.js al cargar la familia. Mismas claves que
// en.jovian.js. Sin lectura de una persona hispanohablante fluida.
// =============================================================================

export const ES_JOVIAN = {
  'jovW.waiting': 'Cargando las posiciones de las lunas',
  'jovW.failed': 'No se pudieron cargar las posiciones de las lunas',
  'jovW.moon.io': 'Ío',
  'jovW.moon.europa': 'Europa',
  'jovW.moon.ganymede': 'Ganímedes',
  'jovW.moon.callisto': 'Calisto',
  'jovW.moon.all': 'las cuatro',
  'jovW.row.how': 'Lo que queda fuera',
  'jovW.f.title': 'Las lunas, noche tras noche',
  'jovW.f.note':
    'Una secuencia sintética de Júpiter y sus cuatro lunas: cada imagen se hace con las efemérides de las lunas, con turbulencia atmosférica y ruido del detector, el este a la derecha y el polo proyectado de Júpiter arriba. Activa la superposición para ver dónde sitúan las efemérides cada luna, y lee la distancia de cada luna al centro de Júpiter en radios de Júpiter.',
  'jovW.f.control.frame': 'Imagen',
  'jovW.f.control.overlay': 'Superposición de efemérides (0 no, 1 sí)',
  'jovW.f.legend': 'I Ío · E Europa · G Ganímedes · C Calisto',
  'jovW.f.row.when': 'Hora (UT)',
  'jovW.f.row.kind': 'Cómo se tomó',
  'jovW.f.value.hourly': 'una de las imágenes horarias de una noche larga',
  'jovW.f.value.nightly': 'la imagen de una vez por noche',
  'jovW.f.row.scale': 'Escala',
  'jovW.f.value.scale':
    '{px} píxeles por radio de Júpiter (3 segundos de arco por píxel)',
  'jovW.f.row.moon': '{moon}: al este de Júpiter',
  'jovW.f.value.moon':
    '{x} radios de Júpiter ({side}); las efemérides la sitúan en {pred}',
  'jovW.f.value.east': 'este',
  'jovW.f.value.west': 'oeste',
  'jovW.f.value.hidden':
    'sin medir: sobre el disco o mezclada con otra luna (las efemérides la sitúan en {pred})',
  'jovW.f.row.frames': 'Imágenes de la secuencia',
  'jovW.f.value.frames':
    '{n}: {hourly} horarias en tres noches, {nightly} una por noche',
  'jovW.f.value.how':
    'Estas imágenes son sintéticas, hechas para esta lección con posiciones de JPL Horizons (JUP365): no se observó ninguna imagen de Júpiter. Las posiciones se leen en los píxeles más brillantes de cada imagen, cerca de donde las predice la superposición, no se escriben a mano.',
  'jovW.p.title': 'Una sinusoide para una luna',
  'jovW.p.note':
    'La distancia medida de una luna al este de Júpiter frente al tiempo, con la sinusoide que mejor se ajusta. Elige la luna y cómo se muestrearon las noches: una vez por noche, o la secuencia diseñada con tres noches horarias.',
  'jovW.p.control.moon': 'Luna (1 Ío, 2 Europa, 3 Ganímedes, 4 Calisto)',
  'jovW.p.control.cadence': 'Muestreo (0 una vez por noche, 1 diseñado)',
  'jovW.p.legend': 'medido · sinusoide ajustada · días desde la primera imagen',
  'jovW.p.row.marks': 'Puntos medidos usados',
  'jovW.p.row.period': 'Período',
  'jovW.p.row.amplitude': 'Amplitud (el radio de la órbita)',
  'jovW.p.row.amplitudeKm': 'Amplitud en kilómetros',
  'jovW.p.row.fit': 'Chi cuadrado, grados de libertad',
  'jovW.p.row.nyquist':
    'El intervalo de muestreo y el período más corto que distingue',
  'jovW.p.value.nyquist':
    'una imagen cada {dt} días: ningún período menor de {p} días se distingue de uno más largo',
  'jovW.p.value.nyquistDesigned':
    'cada hora en tres noches, luego una por noche',
  'jovW.p.row.alias': 'Otros períodos que los puntos ajustan igual de bien',
  'jovW.p.value.alias': '{p} días (chi cuadrado {d} mayor)',
  'jovW.p.value.noAlias': 'ninguno a menos de 9 de chi cuadrado',
  'jovW.p.row.aliasTable':
    'Períodos que un muestreo de una vez por noche no distingue del verdadero',
  'jovW.p.value.aliasTable': '{p} días',
  'jovW.p.row.search': 'Períodos buscados',
  'jovW.p.value.searchNightly':
    'mayores de 2 días, como haría quien muestrea una vez por noche',
  'jovW.p.value.searchDesigned': 'mayores de 0,3 días',
  'jovW.p.value.refused': 'Sin restricción: {why}',
  'jovW.p.value.how':
    'El período es el que ve la Tierra (la Tierra y Júpiter se mueven), a menos del 0,4 por ciento del período orbital de la luna; la incertidumbre incluye el desajuste del modelo, no solo el ruido; cada punto se lee con 0,03 radios de Júpiter supuestos.',
  'jovW.w.title': 'Pesar Júpiter',
  'jovW.w.note':
    'La tercera ley de Kepler con el período y el radio de órbita ajustados de una luna da el GM de Júpiter (su masa por la constante gravitatoria). Elige una luna, o las cuatro, y si corregir el período por el movimiento de la Tierra.',
  'jovW.w.control.moon':
    'Luna (0 las cuatro, 1 Ío, 2 Europa, 3 Ganímedes, 4 Calisto)',
  'jovW.w.control.correct':
    'Corregir por el movimiento de la Tierra (0 no, 1 sí)',
  'jovW.w.legend': 'GM de cada luna · referencia · km³/s²',
  'jovW.w.row.period': 'Período usado',
  'jovW.w.row.a': 'Radio de la órbita',
  'jovW.w.row.gm': 'GM de Júpiter',
  'jovW.w.row.mass': 'Masa de Júpiter',
  'jovW.w.row.ref': 'El GM del planeta en las tablas de JPL',
  'jovW.w.row.ratio': 'Medido entre referencia',
  'jovW.w.row.rate': 'El marco del cielo gira',
  'jovW.w.value.rate':
    '{rate} grados al día (el movimiento de la Tierra y de Júpiter)',
  'jovW.w.row.moonValue': '{moon}',
  'jovW.w.row.mean': 'Media ponderada de las cuatro',
  'jovW.w.row.consistency': '¿Concuerdan las cuatro?',
  'jovW.w.value.consistent':
    'sí: chi cuadrado {chi2} con {dof} grados de libertad, p = {p}',
  'jovW.w.value.inconsistent':
    'no: chi cuadrado {chi2} con {dof} grados de libertad, p = {p}',
  'jovW.w.value.how':
    'Júpiter no es un punto: su achatamiento eleva el GM aparente de una luna en cerca del 0,06 por ciento para Ío y el 0,003 por ciento para Calisto, y la masa propia de una luna añade menos del 0,01 por ciento. Ninguno se quita; la referencia es solo el planeta.',
};
