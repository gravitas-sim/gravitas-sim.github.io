// El laboratorio 3-D (/3d/): su español, con los mismos ids que
// ./en.lab3dLab.js. Lo lee js/lab3d/view/i18n.js.

export const ES_LAB3DLAB = {
  'l3.canvas':
    'Una vista 3-D del sistema; las tablas de abajo contienen cada número que muestra',
  'l3.region.state': 'Posiciones y velocidades',
  'l3.region.elements': 'Órbitas',
  'l3.lang': 'Idioma',
  'l3.title': 'El laboratorio 3-D',
  'l3.intro':
    'Sistemas pequeños de cuerpos en tres dimensiones, integrados por el núcleo 3-D validado en un Worker. Muévete a su alrededor, cambia el marco desde el que se ven y mide distancias, ángulos y órbitas. Cada número que muestra la imagen está también en las tablas de abajo, que funcionan sin gráficos.',
  'l3.back': 'Volver a Gravitas',
  'l3.diagnostics': 'Los diagnósticos del núcleo',
  'l3.docs': 'Cómo funciona (LAB3D.md)',
  'l3.keys':
    'Con la vista enfocada: las flechas giran, Mayús y una flecha desplazan, + y − acercan y alejan, del 1 al 5 eligen una vista, 0 encuadra todo y Espacio reproduce o pausa.',

  'l3.system': 'Sistema',
  'l3.system.choose': 'Abrir',
  'l3.system.file': 'Un archivo de sistema…',
  'l3.file': 'Archivo de sistema',
  'l3.ref.R1': 'Una órbita de Kepler inclinada',
  'l3.ref.R2': 'Una binaria en movimiento',
  'l3.ref.R3': 'Una estrella y dos planetas',
  'l3.ref.R4': 'L4 y L1 en el problema restringido de tres cuerpos',
  'l3.ref.R5': 'El ocho',
  'l3.ref.R6': 'Ciclos de Kozai-Lidov',
  'l3.ref.R7': 'Un encuentro cercano',
  'l3.ref.R8': 'Fusiones',
  'l3.play': 'Reproducir',
  'l3.pause': 'Pausar',
  'l3.step': 'Paso',
  'l3.restart': 'Reiniciar',
  'l3.speed': 'Velocidad',
  'l3.speed.x': '×{x}',

  'l3.view': 'Vista',
  'l3.frame': 'Marco',
  'l3.frame.barycentric': 'Baricéntrico',
  'l3.frame.inertial': 'Las coordenadas propias del sistema',
  'l3.frame.body': 'Centrado en {name}',
  'l3.frame.corotating': 'En rotación con {a} y {b}',
  'l3.preset': 'Mirar',
  'l3.preset.oblique': 'Desde arriba, en ángulo',
  'l3.preset.top': 'Hacia abajo, sobre el plano de referencia',
  'l3.preset.side': 'A lo largo del plano de referencia',
  'l3.preset.faceOn': 'De frente a la órbita',
  'l3.preset.edgeOn': 'De canto a la órbita',
  'l3.projection': 'Proyección',
  'l3.projection.perspective': 'Perspectiva',
  'l3.projection.orthographic': 'Ortográfica (a escala)',
  'l3.follow': 'Mantener centrado',
  'l3.follow.none': 'El origen del marco',
  'l3.size': 'Tamaño de los cuerpos',
  'l3.size.marker': 'Marcadores iguales',
  'l3.size.radius10': 'Radio × 10',
  'l3.size.radius': 'Radio real',
  'l3.trails': 'Trayectorias',
  'l3.drops': 'Líneas de altura',
  'l3.grid': 'Plano de referencia',
  'l3.arrows': 'Flechas de velocidad',
  'l3.labels': 'Nombres',
  'l3.low': 'Calidad baja',
  'l3.reduced': 'Reducir el movimiento',
  'l3.clearTrails': 'Borrar las trayectorias',

  'l3.measure': 'Medir',
  'l3.tool': 'Instrumento',
  'l3.tool.none': 'Ninguno',
  'l3.tool.distance': 'Distancia',
  'l3.tool.angle': 'Ángulo',
  'l3.tool.elements': 'Órbita',
  'l3.tool.relative': 'Velocidad relativa',
  'l3.tool.a': 'Cuerpo',
  'l3.tool.from': 'Desde',
  'l3.tool.vertex': 'En',
  'l3.tool.b': 'Hasta',
  'l3.read.pick': 'Elige dos cuerpos distintos.',
  'l3.read.distance': 'De {a} a {b}: {d}.',
  'l3.read.relative': '{b} respecto de {a}: {v}; la distancia cambia a {rate}.',
  'l3.read.angle': 'El ángulo en {v} entre {a} y {b}: {angle}.',
  'l3.read.elements':
    '{a} alrededor de {p}: a = {sma}, e = {e}, i = {i}, período {period}.',
  'l3.read.unbound': '{a} no está ligado a {p}: e = {e}, i = {i}.',
  'l3.read.noPrimary': '{a} es el cuerpo más pesado: aquí no orbita nada.',

  'l3.legend.frame.barycentric': 'Marco: baricéntrico.',
  'l3.legend.frame.inertial': 'Marco: las coordenadas propias del sistema.',
  'l3.legend.frameBody': 'Marco: centrado en {name}.',
  'l3.legend.frameCorotating':
    'Marco: en rotación con {a} y {b}, que se quedan en el eje x.',
  'l3.legend.scale': '{len}',
  'l3.legend.scalePerspective': '{len} en el centro de la vista',
  'l3.legend.size.marker': 'Los cuerpos son marcadores iguales, no a escala.',
  'l3.legend.size.radius10':
    'Cuerpos dibujados a 10 veces su radio; las masas puntuales, como puntos.',
  'l3.legend.size.radius':
    'Cuerpos a su radio real; las masas puntuales, como puntos.',
  'l3.legend.trails': 'Trayectorias: los últimos {span}.',
  'l3.legend.drops':
    'Las líneas de altura bajan al plano de referencia, z = 0.',
  'l3.legend.grid': 'Cuadros de la cuadrícula: {step}.',
  'l3.legend.arrows':
    'Flechas: dónde estaría un cuerpo dentro de {per} a su velocidad.',

  'l3.clock': 't = {t}, velocidad {speed}.',
  'l3.clock.behind':
    'El núcleo va retrasado: avanza tan rápido como lo permite este dispositivo.',
  'l3.unit.length1': 'unidad de longitud',
  'l3.unit.time1': 'unidad de tiempo',
  'l3.unit.length': 'unidades de longitud',
  'l3.unit.time': 'unidades de tiempo',
  'l3.unit.mass': 'unidades de masa',
  'l3.unit.speed': 'unidades de longitud por unidad de tiempo',
  'l3.unit.au': 'UA',
  'l3.unit.day': 'd',
  'l3.unit.msun': 'M☉',
  'l3.speed.solar': '{au} UA/d ({km} km/s)',

  'l3.scene.heading': 'Qué hay en la vista',
  'l3.scene.hint':
    'Los cuerpos, cuál orbita a cuál, dónde están y a qué velocidad se mueven, en el marco elegido arriba.',
  'l3.tree.root': '{name}, el cuerpo más pesado',
  'l3.tree.orbits': '{name}, en órbita alrededor de {primary}',
  'l3.tree.particle':
    '{name}, una partícula de prueba, en órbita alrededor de {primary}',
  'l3.tree.merged': 'Fusionados: {names}',
  'l3.table.state': 'Posiciones y velocidades en t = {t}. {frame}',
  'l3.table.elements':
    'Órbitas: cada cuerpo alrededor del cuerpo que orbita (elementos osculadores)',
  'l3.col.body': 'Cuerpo',
  'l3.col.mass': 'Masa',
  'l3.col.fromOrigin': 'Desde el origen',
  'l3.col.speed': 'Rapidez',
  'l3.col.about': 'Alrededor de',
  'l3.col.a': 'Semieje mayor',
  'l3.col.e': 'Excentricidad',
  'l3.col.i': 'Inclinación',
  'l3.col.Omega': 'Nodo ascendente',
  'l3.col.omega': 'Argumento del periastro',
  'l3.col.period': 'Período',
  'l3.col.unbound': 'no ligado',
  'l3.conserved':
    'Desde el inicio: la energía ha cambiado en una fracción {e}, el momento angular en {l} y el momento lineal en {p}. El núcleo conserva los tres; estos son sus errores.',
  'l3.conserved.merged':
    'Desde el inicio: la energía ha cambiado en una fracción {e}, el momento angular en {l} y el momento lineal en {p}. Una fusión quita energía cinética por diseño, así que el cambio de energía la incluye.',
  'l3.refresh': 'Actualizar las tablas',
  'l3.liveTables': 'Actualizar durante la reproducción',

  'l3.events.heading': 'Eventos',
  'l3.event.merger': 'En {t}, {a} y {b} se fusionaron.',
  'l3.event.close': 'En {t}, {a} y {b} pasaron a menos de {d}.',
  'l3.event.crossing.ascending':
    'En {t}, {a} cruzó el plano de referencia hacia arriba.',
  'l3.event.crossing.descending':
    'En {t}, {a} cruzó el plano de referencia hacia abajo.',
  'l3.event.escape': 'En {t}, {a} escapó, a {d} del resto.',
  'l3.event.unresolved':
    'Aviso: el paso fijo es demasiado grande para el encuentro cercano de {a} y {b}. Sus números ahí no son fiables.',
  'l3.event.nonSymplectic':
    'Aviso: {scheme} no conserva la energía en integraciones largas; su deriva es suya, no del sistema.',
  'l3.event.stopped': 'En {t}, la integración se detuvo ({status}).',
  'l3.event.continued':
    'En {t}, la integración siguió como una nueva desde los mismos números.',

  'l3.status.starting': 'Iniciando el núcleo…',
  'l3.status.chooseFile': 'Elige un archivo de sistema.',
  'l3.status.refused': 'El núcleo rechazó este sistema: {why}.',
  'l3.status.failed': 'La integración falló: {why}.',
  'l3.status.tooLarge':
    'Ese archivo es más grande de lo que necesita un sistema.',
  'l3.status.notJson': 'Ese archivo no es JSON.',
  'l3.status.noWebgl':
    'Este navegador no puede dibujar en 3-D aquí (no hay WebGL). La integración y las tablas de abajo siguen funcionando.',
  'l3.status.lost':
    'Se perdió el contexto gráfico. La integración y las tablas continúan, y la imagen vuelve cuando el navegador lo restaura.',
};
