// =============================================================================
// The words for the 3-D dynamics diagnostics page (/lab3d/), in Spanish
// -----------------------------------------------------------------------------
// Imported by js/lab3d/i18n.js alone.
// =============================================================================

export const ES_LAB3D = {
  'lab3d.doc.title': 'Diagnóstico de dinámica en 3-D | Gravitas',
  'lab3d.title': 'Diagnóstico de dinámica en 3-D',
  'lab3d.intro':
    'El núcleo de pocos cuerpos en 3-D, ejecutado en un Worker propio: los problemas de referencia con los que se valida, cualquier archivo de sistema y lo rápido que corre aquí. Solo números y gráficas sencillas; es una página de diagnóstico, no una vista para estudiantes.',
  'lab3d.docs': 'Cómo funciona el núcleo (LAB3D.md)',
  'lab3d.run.heading': 'Ejecutar',
  'lab3d.problem': 'Problema',
  'lab3d.ref.R1': 'R1: una órbita de Kepler inclinada',
  'lab3d.ref.R2': 'R2: una binaria en movimiento',
  'lab3d.ref.R3': 'R3: una estrella y dos planetas',
  'lab3d.ref.R4': 'R4: L4 y L1',
  'lab3d.ref.R5': 'R5: el ocho',
  'lab3d.ref.R6': 'R6: Kozai-Lidov',
  'lab3d.ref.R7': 'R7: un acercamiento',
  'lab3d.ref.R8': 'R8: fusiones',
  'lab3d.problem.file': 'Un archivo de sistema',
  'lab3d.file': 'Archivo de sistema',
  'lab3d.scheme': 'Integrador',
  'lab3d.scheme.default': 'El que fija el problema',
  'lab3d.scheme.leapfrog': 'Salto de rana (orden 2, simpléctico)',
  'lab3d.scheme.yoshida4': 'Yoshida (orden 4, simpléctico)',
  'lab3d.scheme.yoshida4c': 'Yoshida, compensado (orden 4, simpléctico)',
  'lab3d.scheme.rk4': 'RK4 (orden 4, no simpléctico)',
  'lab3d.scheme.dopri5': 'Dormand-Prince 5(4) (adaptativo, no simpléctico)',
  'lab3d.step': 'Paso, o tolerancia para Dormand-Prince',
  'lab3d.span': 'Duración (unidades de tiempo)',
  'lab3d.samples': 'Muestras',
  'lab3d.go': 'Ejecutar',
  'lab3d.cancel': 'Cancelar',
  'lab3d.status.idle': 'Elige un problema y ejecútalo.',
  'lab3d.status.running': 'Ejecutando: {percent} %.',
  'lab3d.status.done': 'Terminado: {status}, en {seconds} s.',
  'lab3d.status.refused': 'Rechazado: {why}',
  'lab3d.status.failed': 'Falló: {why}',
  'lab3d.status.canceled': 'Cancelado.',
  'lab3d.status.fileBad':
    'Ese archivo no es un sistema que esta página pueda abrir.',
  'lab3d.status.fileOpened': 'Se abrió un sistema de {n} cuerpos.',
  'lab3d.status.migrated':
    'Se abrió un archivo del Constructor de sistemas orbitales en 2-D como un sistema en 3-D en el plano z = 0.',
  'lab3d.results.heading': 'Resultados',
  'lab3d.results.caption': 'Lo que midió la ejecución',
  'lab3d.results.quantity': 'Magnitud',
  'lab3d.results.value': 'Valor',
  'lab3d.r.status': 'Estado',
  'lab3d.r.energy': 'Mayor error relativo de la energía',
  'lab3d.r.angularMomentum': 'Mayor cambio relativo del momento angular',
  'lab3d.r.momentum': 'Mayor cambio del momento total, relativo',
  'lab3d.r.evals': 'Evaluaciones de fuerza',
  'lab3d.r.steps': 'Pasos',
  'lab3d.r.wall': 'Tiempo en el Worker (s)',
  'lab3d.r.rate': 'Pasos por segundo',
  'lab3d.checks.heading': 'Frente a la referencia',
  'lab3d.checks.caption':
    'Cada medida frente a la tolerancia que fijó la puerta de validación',
  'lab3d.checks.what': 'Medida',
  'lab3d.checks.value': 'Valor',
  'lab3d.checks.tolerance': 'Tolerancia',
  'lab3d.checks.result': 'Resultado',
  'lab3d.checks.pass': 'pasa',
  'lab3d.checks.fail': 'no pasa',
  'lab3d.checks.diagnostic': 'diagnóstico',
  'lab3d.checks.none':
    'Un archivo de sistema no tiene referencia con la que comparar.',
  'lab3d.events.heading': 'Eventos',
  'lab3d.events.caption':
    'Fusiones, acercamientos, escapes y cruces del plano, en orden',
  'lab3d.events.time': 'Tiempo',
  'lab3d.events.kind': 'Evento',
  'lab3d.events.bodies': 'Cuerpos',
  'lab3d.events.detail': 'Detalle',
  'lab3d.events.none': 'Ningún evento.',
  'lab3d.event.merger': 'Fusión',
  'lab3d.event.closeApproach': 'Acercamiento',
  'lab3d.event.escape': 'Escape',
  'lab3d.event.crossing': 'Cruce del plano',
  'lab3d.warnings.heading': 'Avisos',
  'lab3d.warning.nonSymplectic':
    '{scheme} no conserva la energía ni el momento angular en ejecuciones largas; sus errores crecen.',
  'lab3d.warning.unresolvedEncounter':
    'El paso fijo es demasiado largo para el encuentro de {bodies}: usa Dormand-Prince para los acercamientos.',
  'lab3d.warnings.none': 'Ningún aviso.',
  'lab3d.plots.heading': 'Gráficas',
  'lab3d.plot.energy':
    'Error relativo de la energía frente al tiempo (logarítmico)',
  'lab3d.plot.angular':
    'Cambio relativo del momento angular frente al tiempo (logarítmico)',
  'lab3d.plot.xy':
    'Las trayectorias de los cuerpos vistas desde +z (x horizontal, y vertical)',
  'lab3d.plot.xz':
    'Las trayectorias de los cuerpos vistas desde -y (x horizontal, z vertical)',
  'lab3d.bench.heading': 'Lo rápido que corre aquí',
  'lab3d.bench.hint':
    'Pasos por segundo en un Worker de este dispositivo, para una estrella y planetas, por integrador y número de cuerpos.',
  'lab3d.bench.go': 'Medir',
  'lab3d.bench.running': 'Midiendo.',
  'lab3d.bench.caption': 'Pasos por segundo en un Worker',
  'lab3d.bench.scheme': 'Integrador',
  'lab3d.bench.bodies': '{n} cuerpos',
};
