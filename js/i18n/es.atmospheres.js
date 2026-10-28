// Las palabras de los instrumentos de atmósfera, en español (Prompt 200).
// Las mismas claves que en.atmospheres.js; sin revisar por un hablante nativo.
export const ES_ATMOSPHERES = {
  'atmW.row.model': 'Modelo',
  'atmW.row.assumes': 'Lo que deja fuera',
  'atmW.refused': 'Sin solución en este modelo',
  'atmW.on': 'la del planeta',
  'atmW.off': 'la mía',
  'atmW.at.surface': 'superficie',
  'atmW.at.bar': 'nivel de 1 bar',
  'atmW.control.body': 'Planeta',
  'atmW.axis.temperature': 'Temperatura (K)',
  'atmW.body.venus': 'Venus',
  'atmW.body.earth': 'Tierra',
  'atmW.body.mars': 'Marte',
  'atmW.body.jupiter': 'Júpiter',
  'atmW.body.uranus': 'Urano',
  'atmW.body.neptune': 'Neptuno',
  'atmW.m.eq': 'Temperatura de equilibrio (de emisión)',
  'atmW.m.gr': 'Equilibrio radiativo gris, cierre de Eddington',
  'atmW.m.sc': 'Altura de escala isoterma',
  'atmW.a.eq':
    'el calor interno; cualquier efecto invernadero; una superficie (es la temperatura de un cuerpo negro que irradia lo que el planeta absorbe); un albedo geométrico (aquí el albedo es el albedo de Bond)',
  'atmW.a.gr':
    'la convección; las nubes; la absorción de luz solar dentro de la atmósfera; cualquier dependencia de la opacidad con la longitud de onda (opacidad gris); el cierre de Eddington es cerca de un 4 por ciento más cálido arriba',
  'atmW.a.sc':
    'una temperatura que cambie con la altura; una gravedad que cambie con la altura; la mezcla por encima de la homopausa; el grosor de la atmósfera (no lo tiene: la presión solo sigue bajando)',
  'atmW.b.title':
    '¿Qué temperatura le da a un planeta la luz del Sol por sí sola?',
  'atmW.b.note':
    'La temperatura de equilibrio es la de un cuerpo negro que irradia lo que el planeta absorbe. No es la temperatura del suelo. Compárala con la temperatura medida en la superficie (en el nivel de 1 bar para un planeta gigante, que no tiene superficie) y lee la diferencia.',
  'atmW.b.control.own': 'Albedo',
  'atmW.b.control.albedo': 'Mi albedo de Bond',
  'atmW.b.control.redistribution': 'Calor llevado al lado nocturno',
  'atmW.b.row.teq': 'Temperatura de equilibrio',
  'atmW.b.row.measured': 'Temperatura medida, {where}',
  'atmW.b.row.difference': 'Medida menos de equilibrio',
  'atmW.b.row.reading': 'Qué dice la diferencia',
  'atmW.b.reading.terrestrial':
    'La superficie está más cálida de lo que da la luz solar por sí sola: la atmósfera retiene calor.',
  'atmW.b.reading.terrestrial.below':
    'La superficie no está más cálida de lo que da la luz solar por sí sola.',
  'atmW.b.reading.giant':
    'Un planeta gigante no tiene superficie y además emite calor propio que este modelo deja fuera: la diferencia no es un efecto invernadero.',
  'atmW.b.row.layer': 'Emisividad de una capa que daría la temperatura medida',
  'atmW.b.row.gray': 'Profundidad óptica gris que daría la temperatura medida',
  'atmW.b.axis.x': 'Distancia al Sol (UA)',
  'atmW.b.legend.model':
    'Temperatura de equilibrio a cualquier distancia, con el albedo fijado para {body}',
  'atmW.b.legend.emission':
    'Temperatura de equilibrio de cada planeta, con su albedo',
  'atmW.b.legend.measured': 'Temperatura medida de cada planeta',
  'atmW.g.title': 'Dos modelos de efecto invernadero, un planeta',
  'atmW.g.note':
    'Una capa absorbente y una atmósfera gris con una profundidad óptica son modelos distintos. Sus números libres, una emisividad y una profundidad óptica, son magnitudes distintas, y dan la misma temperatura del suelo solo para valores que coincidan. La curva azul es la solución de Eddington; la curva verde discontinua es la solución gris exacta, para ver cuánto se aleja la aproximación del cálculo completo.',
  'atmW.g.control.tau': 'Profundidad óptica (modelo gris)',
  'atmW.g.control.emissivity': 'Emisividad (una capa)',
  'atmW.g.row.te': 'Temperatura de equilibrio',
  'atmW.g.row.measured': 'Temperatura medida en la superficie',
  'atmW.g.row.gray': 'Temperatura del suelo, modelo gris',
  'atmW.g.row.layer': 'Temperatura del suelo, una capa',
  'atmW.g.row.needLayer': 'Emisividad de una capa que da la temperatura medida',
  'atmW.g.row.needGray': 'Profundidad óptica que da la temperatura medida',
  'atmW.g.row.gap': 'Eddington frente a la solución gris exacta, arriba',
  'atmW.g.axis.x': 'Profundidad óptica desde arriba',
  'atmW.g.legend.eddington': 'Eddington',
  'atmW.g.legend.exact': 'Gris exacto',
  'atmW.g.legend.ground': 'Modelo gris: el suelo',
  'atmW.g.legend.layer': 'Una capa: el suelo',
  'atmW.s.title': '¿Con qué rapidez se enrarece el aire?',
  'atmW.s.note':
    'En una atmósfera isoterma la presión baja en el mismo factor en cada altura de escala. La altura de escala no es el grosor de la atmósfera: no hay un tope, y la presión sigue bajando.',
  'atmW.s.control.own': 'Temperatura',
  'atmW.s.control.temperature': 'Mi temperatura',
  'atmW.s.axis.x': 'Altura sobre la superficie (km)',
  'atmW.s.axis.y': 'Presión como fracción de la presión en la superficie',
  'atmW.s.legend.chosen': '{body} a la temperatura fijada',
  'atmW.s.row.height': 'Altura de escala',
  'atmW.s.row.third':
    'Presión a tres alturas de escala, como parte del valor en la superficie',
  'atmW.s.row.inputs': 'Datos de entrada',
  'atmW.s.value.inputs':
    'T = {T} K, peso molecular medio {mu}, gravedad {g} m/s²',
  'atmW.row.data': 'Datos',
  'atmW.m.ec': 'Cuerpo negro más una banda (eclipse secundario)',
  'atmW.m.ph': 'Curva de fase de una esfera de Lambert',
  'atmW.a.ec':
    'un lado diurno que no tiene una sola temperatura; la luz reflejada en la misma banda (una profundidad no se convierte en temperatura salvo que usted diga que no hay ninguna); una banda que emite en lugar de absorber; cualquier cosa en la atmósfera por debajo de una piel isoterma; el perfil de un filtro (la respuesta de la banda es plana)',
  'atmW.a.ph':
    'un planeta que no es una esfera de Lambert (las funciones de fase reales difieren); la variación térmica con la fase; las nubes; la polarización; el albedo que se obtiene es el de una esfera de Lambert, y el albedo de Bond que da es el mismo supuesto multiplicado por 3/2',
  'atmW.e.title': '¿Qué tan caliente está el lado diurno?',
  'atmW.e.note':
    'La profundidad del eclipse es la parte de la luz que desaparece cuando el planeta pasa detrás de su estrella. El modelo la convierte en la temperatura de un cuerpo negro que daría esa profundidad en esa banda, una temperatura de brillo. Las profundidades son sintéticas: generadas con el modelo y con ruido, y no se comparó ninguna tabla publicada.',
  'atmW.e.control.dataset': 'Planeta',
  'atmW.e.dataset.0': 'Planeta X (ninguna banda absorbe)',
  'atmW.e.dataset.1': 'Planeta Y (una banda absorbe)',
  'atmW.e.control.tp': 'Mi temperatura de cuerpo negro',
  'atmW.e.control.reflected': 'Luz reflejada',
  'atmW.e.reflected.0': 'tenerla en cuenta (albedo hasta 0,3)',
  'atmW.e.reflected.1': 'suponer que no hay',
  'atmW.e.axis.x': 'Longitud de onda (µm)',
  'atmW.e.axis.y': 'Profundidad del eclipse (ppm)',
  'atmW.e.legend.data': 'Profundidades sintéticas del eclipse, cuatro bandas',
  'atmW.e.legend.model': 'Cuerpo negro a {T} K',
  'atmW.e.data':
    'sintéticos, generados con el modelo y con ruido; no se comparó ninguna tabla publicada',
  'atmW.e.row.bt': 'Temperatura de brillo, banda {band} ({lo} a {hi} µm)',
  'atmW.e.value.bt': '{T} K (95 por ciento: {lo} a {hi} K)',
  'atmW.e.refused':
    'no se convierte: la luz reflejada podría ser una décima parte de esta profundidad o más',
  'atmW.e.row.chi': 'Mi cuerpo negro frente a las cuatro profundidades',
  'atmW.e.value.chi':
    'chi cuadrado {chi} para cuatro profundidades a {T} K (cerca de 4 cuando un modelo ajusta)',
  'atmW.p.title': '¿Qué dice una curva de fase sobre el albedo?',
  'atmW.p.note':
    'La luz reflejada del planeta sigue su fase, como la de la Luna. Para una esfera de Lambert la curva tiene una sola forma y su altura es el albedo. Las curvas son sintéticas: generadas con un modelo y con ruido, y no se comparó ninguna tabla publicada.',
  'atmW.p.control.dataset': 'Planeta',
  'atmW.p.dataset.0': 'Planeta P',
  'atmW.p.dataset.1': 'Planeta Q',
  'atmW.p.control.ag': 'Mi albedo geométrico',
  'atmW.p.axis.x': 'Ángulo de fase (grados; 0 es la fase llena)',
  'atmW.p.axis.y': 'Flujo del planeta respecto a la estrella (ppm)',
  'atmW.p.legend.data': 'Curva de fase sintética',
  'atmW.p.legend.model': 'Esfera de Lambert, albedo {A}',
  'atmW.p.data':
    'sintéticos, generados con un modelo y con ruido; no se comparó ninguna tabla publicada',
  'atmW.p.row.fit': 'Albedo geométrico de la esfera de Lambert que ajusta',
  'atmW.p.value.fit': '{A} (95 por ciento: {lo} a {hi})',
  'atmW.p.flagged': 'ninguno: una esfera de Lambert no describe esta curva',
  'atmW.p.row.bond': 'Albedo de Bond de esa esfera de Lambert',
  'atmW.p.value.bond': '{B} (3/2 de {A})',
  'atmW.p.row.mine': 'Mi albedo frente a la curva',
  'atmW.p.value.mine':
    'chi cuadrado {chi} para {n} puntos (cerca de {dof} cuando un modelo ajusta)',
  'atmW.p.row.chi': 'Ajuste frente a la curva',
  'atmW.p.value.chi': 'chi cuadrado {chi} con {dof} grados de libertad',
};
