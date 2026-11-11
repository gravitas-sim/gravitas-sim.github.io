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
  'masW.m.system.0': 'dos líneas, sin eclipse',
  'masW.m.system.1': 'una línea',
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
    'Las estrellas que has resuelto, con sus masas y radios (o luminosidades) frente a las trayectorias MIST de composición solar. La línea inferior es una estrella recién nacida en la secuencia principal y la superior una en su final; una estrella de la secuencia principal debería quedar entre ambas. Las temperaturas son datos de entrada: la de la estrella 1 se da, la de la 2 sale del cociente de brillo superficial ajustado en la banda de 0,8 micrómetros.',
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
  'masW.vb.title': 'Pesar un par visual',
  'masW.vb.note':
    'Dos estrellas en el cielo, vistas como una sola órbita. Cuando las dos están resueltas, el movimiento propio de cada estrella alrededor del centro de masas en movimiento da la fracción de masa, y la órbita con un paralaje da la suma de masas: juntas, las dos masas. Cuando el par no está resuelto, el fotocentro (el centro de la luz) describe la misma elipse reducida por (l − B), la fracción de luz menos la fracción de masa, así que la órbita con un paralaje da solo una función de masa, y la masa de un compañero necesita una fracción de luz y una masa de la primaria que usted declara, y tiene una segunda raíz. Todos los datos de aquí son sintéticos.',
  'masW.vb.control.system': 'Sistema',
  'masW.vb.control.view': 'Lo que se ve',
  'masW.vb.control.arc': 'Arco observado (periodos)',
  'masW.vb.control.snr': 'Señal a ruido de la paralaje',
  'masW.vb.system.0': 'A, compañero débil',
  'masW.vb.system.1': 'B, casi iguales',
  'masW.vb.system.2': 'C, poca masa',
  'masW.vb.view.0': 'dos resueltas',
  'masW.vb.view.1': 'un fotocentro',
  'masW.vb.axis.east': 'Desplazamiento al este (segundos de arco)',
  'masW.vb.axis.north': 'Desplazamiento al norte (segundos de arco)',
  'masW.vb.legend.star1': 'Estrella 1 en torno al centro de masas',
  'masW.vb.legend.star2': 'Estrella 2 en torno al centro de masas',
  'masW.vb.legend.fit1': 'Estrella 1, ajustada',
  'masW.vb.legend.fit2': 'Estrella 2, ajustada',
  'masW.vb.legend.photocentre': 'Fotocentro, datos',
  'masW.vb.legend.photocentreFit': 'Fotocentro, ajustado',
  'masW.vb.legend.relative': 'Órbita relativa del par (la verdad)',
  'masW.vb.row.data': 'Datos',
  'masW.vb.v.dataBoth':
    '{n} épocas de las dos estrellas en {a} periodos, {s} milisegundos de arco por eje para cada una; paralaje {p} ± {sp} milisegundos de arco ({frame})',
  'masW.vb.v.dataPhot':
    '{n} épocas del fotocentro en {a} periodos, {s} milisegundos de arco por eje; paralaje {p} ± {sp} milisegundos de arco ({frame})',
  'masW.vb.row.orbit': 'Órbita',
  'masW.vb.v.orbit':
    'periodo {p} ± {ps} años, semieje mayor {a} ± {as} milisegundos de arco, excentricidad {e}',
  'masW.vb.row.sum': 'Suma de masas',
  'masW.vb.v.sum':
    '{v} masas solares; 68 por ciento entre {lo} y {hi}, 95 por ciento entre {lo2} y {hi2}',
  'masW.vb.row.frame': 'Referencia de la paralaje',
  'masW.vb.row.fraction': 'Fracción de masa de la estrella 2',
  'masW.vb.v.fraction':
    'B = {v} ± {s}; las elipses propias de las estrellas están en la razón {r} : 1',
  'masW.vb.row.masses': 'Masas',
  'masW.vb.v.masses':
    'M1 {a} masas solares (68 por ciento {alo} a {ahi}), M2 {b} masas solares (68 por ciento {blo} a {bhi})',
  'masW.vb.row.function': 'Función de masa del fotocentro',
  'masW.vb.v.function':
    '{v} masas solares, 68 por ciento entre {lo} y {hi}: una función de masa, no una masa',
  'masW.vb.row.naive': 'Si se leyera como la suma de masas',
  'masW.vb.v.naive':
    'el número de arriba es {x} de la suma verdadera {t}: la elipse del fotocentro es menor que la del par por el factor |l − B| = {f}, y la masa por su cubo',
  'masW.vb.row.given': 'Lo que usted declara',
  'masW.vb.v.given':
    'la fracción de luz del compañero l = {l} ± {sl} y la masa de la primaria {m} ± {sm} masas solares',
  'masW.vb.row.root': 'Compañero, raíz {n}',
  'masW.vb.v.rootAbove':
    'M2 = {m} masas solares (68 por ciento {lo} a {hi}), B = {b}: el compañero lleva una parte mayor de la masa que de la luz',
  'masW.vb.v.rootBelow':
    'M2 = {m} masas solares (68 por ciento {lo} a {hi}), B = {b}: raíz ambigua, el compañero sería más ligero que su parte de la luz; la órbita sola no elige',
  'masW.vb.row.truth': 'Lo que lo hizo',
  'masW.vb.v.truth':
    'M1 {a}, M2 {b} masas solares (suma {c}, B {bb}); fracción de luz l {l}; paralaje {p} milisegundos de arco; el eje del fotocentro es {f} del del par',
  'masW.vb.row.refused': 'Rechazado',
  'masW.vb.row.companion': 'Compañero',
  'masW.vb.a':
    'El ajuste de órbita aparente de la Prompt 187 a los desplazamientos relativos (o al fotocentro en torno al baricentro); un paralaje con su declaración de referencia; un desplazamiento constante y un movimiento propio ajustados junto con la fracción de masa. No se modelan los errores comunes del marco, un tercer cuerpo ni el acoplamiento con las velocidades radiales; los datos son sintéticos',
  'masW.vb.frame.absolute': 'absoluto',
  'masW.vb.frame.absolute.long':
    'el paralaje es absoluto (corregido a la fuente declarada); la corrección y su incertidumbre están en el paralaje dado',
  'masW.vb.frame.relative': 'relativo a las estrellas de referencia',
  'masW.vb.frame.relative.long':
    'el paralaje es relativo a las estrellas de referencia de su marco, que es menor que el paralaje absoluto en su paralaje medio: la distancia y la suma de masas salen más altas en esa proporción',
};
