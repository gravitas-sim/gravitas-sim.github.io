// Las palabras de los paneles de masas, en español (Prompt 218). Las líneas de
// supuestos son texto fijo, así que se traducen por clave.
export const ES_MASSES = {
  'masW.on': 'sí',
  'masW.off': 'no',
  'masW.v.deg': '{x}°',
  'masW.axis.phase': 'Fase orbital',
  'masW.axis.flux': 'Flujo relativo',
  'masW.axis.rv': 'Velocidad radial menos la velocidad sistémica (km/s)',
  'masW.axis.logM': 'log10 de la masa (masas solares)',
  'masW.axis.logR': 'log10 del radio (radios solares)',
  'masW.axis.logL': 'log10 de la luminosidad (luminosidades solares)',
  'masW.legend.star1': 'Estrella 1, datos',
  'masW.legend.star2': 'Estrella 2, datos',
  'masW.legend.model1': 'Estrella 1, ajuste',
  'masW.legend.model2': 'Estrella 2, ajuste',
  'masW.legend.flux': 'Curva de luz sintética',
  'masW.legend.fit': 'Ajuste',
  'masW.legend.zams': 'MIST, edad cero',
  'masW.legend.tams': 'MIST, final de la secuencia principal',
  'masW.legend.star': 'Estrellas resueltas',
  'masW.m.title': 'Masas mínimas a partir de las velocidades',
  'masW.m.note':
    'Dos curvas Doppler de una misma órbita dan el cociente de las masas y el tamaño de la órbita por sen i, así que toda masa es un mínimo: la masa verdadera es mayor en un factor 1 / sen³ i, y sin un eclipse u otra medida la inclinación no se conoce. Elige la inclinación para ver qué serían las masas. Una órbita de una sola línea da solo la función de masa. Todos los datos de aquí son sintéticos.',
  'masW.m.control.system': 'Sistema',
  'masW.m.control.inc': 'Inclinación que supones',
  'masW.m.system.0': 'un par de dos líneas que nunca se eclipsa',
  'masW.m.system.1': 'una órbita de una sola línea',
  'masW.row.data': 'Datos',
  'masW.v.data':
    '{n} velocidades de cada estrella, {s} km/s por punto; órbita ajustada',
  'masW.v.data1':
    '{n} velocidades de una estrella, {s} km/s por punto; órbita ajustada',
  'masW.row.orbit': 'Órbita',
  'masW.v.orbit': 'periodo {p} ± {ps} d, e = {e}',
  'masW.row.K1': 'K1, estrella 1',
  'masW.row.K2': 'K2, estrella 2',
  'masW.v.K': '{v} ± {s} km/s',
  'masW.row.q': 'Cociente de masas M2 / M1',
  'masW.v.q': '{v} ± {s}, que es K1 / K2',
  'masW.row.asini': 'a sen i',
  'masW.v.asini': '{v} ± {s} radios solares',
  'masW.row.min1': 'Masa mínima de la estrella 1',
  'masW.row.min2': 'Masa mínima de la estrella 2',
  'masW.v.min': 'al menos {v} ± {s} masas solares (M sen³ i)',
  'masW.row.atInc': 'Con tu inclinación',
  'masW.v.atInc':
    'i = {i}°: la estrella 1 sería {a} y la estrella 2 {b} masas solares; la inclinación verdadera no está en estos datos',
  'masW.row.mf': 'Función de masa',
  'masW.v.mf':
    '{v} ± {s} masas solares: el único número que fija una sola línea; de él no se sigue la masa de ninguna estrella',
  'masW.row.min': 'Masa mínima del compañero',
  'masW.v.minCompanion':
    'al menos {v} masas solares, para una primaria de {m} masas solares que te dieron, e i = 90°',
  'masW.v.atIncCompanion':
    'i = {i}°: el compañero sería de {v} masas solares, para la misma primaria',
  'masW.row.assumes': 'Supone',
  'masW.a.min':
    'Dos estrellas en una órbita kepleriana, las velocidades como se dan con sus barras de error, una velocidad sistémica; las masas son mínimos hasta conocer una inclinación',
  'masW.a.sb1':
    'Solo las velocidades de una estrella; la masa de la primaria es un número que te dieron, no medido, así que la masa del compañero es un mínimo condicionado a él',
  'masW.row.refused': 'Rechazado',
  'masW.s.title': 'Pesa las estrellas',
  'masW.s.note':
    'Un solo ajuste de la curva de luz del eclipse y de las dos curvas de velocidad radial, que comparten una órbita. La curva de luz da la inclinación y los radios como fracciones de la órbita; las velocidades dan el tamaño de la órbita y el cociente de masas. Juntas: las masas y los radios de las dos estrellas, con la incertidumbre de todo el ajuste. Todos los datos de aquí son sintéticos; la verdad se muestra si se pide.',
  'masW.s.control.system': 'Sistema',
  'masW.s.control.lines': 'Estrellas con curva de velocidad',
  'masW.s.control.view': 'Curva mostrada',
  'masW.s.control.truth': 'Mostrar lo que hizo los datos',
  'masW.s.system.0': 'par de estrellas F',
  'masW.s.system.1': 'par excéntrico',
  'masW.s.system.2': 'par de poca masa',
  'masW.s.system.3': 'par caliente',
  'masW.s.view.0': 'curva de luz',
  'masW.s.view.1': 'velocidades',
  'masW.s.lines.1': 'una (de una sola línea)',
  'masW.s.lines.2': 'las dos',
  'masW.row.system': 'Datos',
  'masW.v.system':
    '{n} filas de curva de luz ({f} por punto), {r} velocidades por estrella ({s} km/s por punto), periodo {p} d',
  'masW.row.geometry': 'De los eclipses',
  'masW.v.geometry': 'inclinación {i}° ± {si}, R1/a = {r1}, R2/a = {r2}',
  'masW.row.masses': 'Masas',
  'masW.v.massesPair': 'M1 = {a} ± {sa}, M2 = {b} ± {sb} masas solares',
  'masW.v.massesOpen':
    'M1 = {a}, M2 = {b} masas solares, sin restringir ({why})',
  'masW.row.radii': 'Radios',
  'masW.v.radiiPair': 'R1 = {a} ± {sa}, R2 = {b} ± {sb} radios solares',
  'masW.v.radiiOpen':
    'R1 = {a}, R2 = {b} radios solares, sin restringir ({why})',
  'masW.row.sep': 'Órbita',
  'masW.v.sep':
    'semieje mayor {a} ± {sa} radios solares, cociente de masas {q} ± {sq}',
  'masW.row.logg': 'Gravedad superficial',
  'masW.v.logg': 'log g = {a} y {b} (cgs)',
  'masW.row.share': 'La inclinación en la masa',
  'masW.v.share':
    'la inclinación aporta el {x} por ciento de la varianza de M1: el eclipse la fija tan bien que la incertidumbre de las masas es la de las velocidades',
  'masW.row.verdict': 'Qué fijan los datos',
  'masW.verdict.constrained':
    'restringido: todo parámetro ajustado queda fijado con su incertidumbre declarada',
  'masW.verdict.open': 'sin restringir: {names}',
  'masW.why.rank': 'los datos dejan una dirección abierta',
  'masW.why.bound': 'está en su límite',
  'masW.why.uncertain': 'su incertidumbre supera una cuarta parte de su valor',
  'masW.why.derived': 'se sigue de un parámetro que los datos dejan abierto',
  'masW.why.singular': 'la covarianza es singular',
  'masW.row.chi2': 'Bondad del ajuste',
  'masW.v.chi2':
    'chi-cuadrado reducido {c} con {d} grados de libertad; factor de ruido correlacionado {b}',
  'masW.row.single': 'Solo una línea',
  'masW.v.single':
    'sin segunda curva de velocidad no hay cociente de masas: el ajuste devuelve la función de masa {f} masas solares y, para una primaria de {m} masas solares que te dieron, un compañero de al menos {v}. No devuelve una masa, con eclipse o sin él',
  'masW.row.truth': 'Lo que lo hizo',
  'masW.v.truth':
    'M1 {a}, M2 {b} masas solares; R1 {c}, R2 {d} radios solares; inclinación {i}°; K1 {k1}, K2 {k2} km/s',
  'masW.a.solve':
    'El modelo separado del núcleo de inferencia (dos esferas en una órbita kepleriana, oscurecimiento del limbo fijo, sin tercera luz) y sus curvas de velocidad de la misma órbita; las masas usan el GM solar nominal, los radios el radio solar nominal',
  'masW.d.title': 'Masas y radios frente a MIST',
  'masW.d.note':
    'Las estrellas que has resuelto, con sus masas y radios (o luminosidades) frente a las trayectorias MIST de composición solar. La banda sombreada queda entre una estrella recién nacida en la secuencia principal y una en su final; una estrella de la secuencia principal debería estar dentro. Las temperaturas son datos de entrada: la de la estrella 1 se da, la de la 2 sale del cociente de brillo superficial ajustado en la banda de 0,8 micrómetros.',
  'masW.d.control.view': 'Eje vertical',
  'masW.d.control.systems': 'Sistemas resueltos',
  'masW.d.control.band': 'Banda MIST',
  'masW.d.view.0': 'radio',
  'masW.d.view.1': 'luminosidad',
  'masW.row.star': 'Sistema {id}, estrella {n}',
  'masW.v.starR':
    '{m} ± {sm} masas solares, {r} ± {sr} radios solares; {where}',
  'masW.v.starL':
    '{m} ± {sm} masas solares, luminosidad {l} ± {sl} solares, temperatura {t} ± {st} K; {where}',
  'masW.where.in': 'dentro de la banda MIST',
  'masW.where.out': 'fuera de la banda MIST',
  'masW.row.band': 'La banda',
  'masW.v.band':
    'MIST v1.2, composición solar, sin rotación: secuencias principales de edad cero y de edad final de 0,2 a 40 masas solares',
  'masW.row.limits': 'Límites',
  'masW.a.diagram':
    'Los sistemas de aquí son sintéticos: sus radios y temperaturas se leyeron de estas trayectorias a una fracción declarada de la vida en la secuencia principal y se redondearon; coinciden con MIST por construcción, y una estrella real puede no hacerlo',
};
