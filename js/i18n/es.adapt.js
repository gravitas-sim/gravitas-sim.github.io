// =============================================================================
// Adaptar una actividad y qué cambió bajo una, en español (Prompt 175)
// -----------------------------------------------------------------------------
// Véase ./en.adapt.js: un archivo propio, que solo leen el constructor de
// actividades y la página que abre una actividad adaptada o desactualizada.
// =============================================================================

export const ES_ADAPT = {
  'adapt.title': 'Adaptar la actividad',
  'adapt.hint':
    'Cambie el orden de los pasos, diga algo propio en un paso e indique cuándo se entrega. Cada cambio se comprueba contra los pasos de los que depende la propia investigación antes de crear el enlace, y un cambio que haría que un paso preguntara por otra cosa se rechaza, nombrando el paso que necesita.',
  'adapt.order': 'Orden de los pasos',
  'adapt.order.empty': 'Elija pasos arriba para fijar su orden.',
  'adapt.up': 'Antes',
  'adapt.down': 'Después',
  'adapt.remove': 'Quitar',
  'adapt.up.label': 'Mover «{step}» antes',
  'adapt.down.label': 'Mover «{step}» después',
  'adapt.remove.label': 'Quitar «{step}» de la actividad',
  'adapt.note': 'Sus palabras para este paso (opcional)',
  'adapt.note.en': 'Inglés',
  'adapt.note.es': 'Español',
  'adapt.due': 'Cuándo se entrega, con sus palabras (opcional)',
  'adapt.due.help':
    'Por ejemplo «viernes 9 de octubre, antes del laboratorio; tres intentos». El estudiantado lo lee bajo el título. No se comprueba ni se exige nada.',
  'adapt.marking':
    'Imprimir la nota de calificación en el informe de laboratorio',
  'adapt.more': 'Cómo empiezan las secciones «Más»',
  'adapt.more.depth': 'Según la profundidad',
  'adapt.more.open': 'Abiertas',
  'adapt.more.shut': 'Cerradas',
  'adapt.moved': 'Se movió «{step}».',
  'adapt.removed': 'Se quitó «{step}».',
  'adapt.refused': 'Sin cambios: {why}',
  'adapt.problem.requires.later':
    '«{step}» usa «{needs}», así que «{needs}» tiene que ir antes.',
  'adapt.problem.requires.absent':
    '«{step}» usa «{needs}», que esta actividad no incluye.',
  'adapt.problem.when.later':
    '«{step}» responde a «{needs}», así que «{needs}» tiene que ir antes.',
  'adapt.problem.when.absent':
    '«{step}» responde a «{needs}», que esta actividad no incluye.',
  'adapt.problem.reveal.earlier':
    'La respuesta a la predicción «{step}» llega en «{needs}», que tiene que ir después.',
  'adapt.problem.reveal.absent':
    'La respuesta a la predicción «{step}» llega en «{needs}», que esta actividad no incluye.',
  'adapt.problem.setup.world':
    '«{step}» trata del mundo que construye «{needs}», así que tiene que quedar después de él y antes del siguiente mundo.',
  'adapt.problem.scene.scene':
    '«{step}» conserva la escena que prepara «{needs}», así que tiene que quedar bajo ella.',
  'adapt.problem.depth':
    '«{step}» es más profundo que la profundidad de esta actividad.',
  'adapt.report.title': 'Esta actividad se creó con una versión anterior',
  'adapt.report.lead':
    'Desde que se creó, la investigación ha cambiado por debajo. Puede conservarla como se creó o actualizarla a la lección tal como está ahora.',
  'adapt.report.rewritten':
    'Reescritos, así que lo que se responde no es lo que se preguntó: {steps}. Las respuestas ya guardadas en estos pasos se dejan aparte.',
  'adapt.report.removed':
    'Ya no están en la investigación, así que se omiten: {steps}.',
  'adapt.report.graph': 'Ahora desordenados o incompletos',
  'adapt.report.same':
    'No se listan los pasos cuyas palabras cambiaron pero no sus preguntas, instrumentos ni respuestas: nada de lo que el estudiantado responde se movió.',
  'adapt.report.keep': 'Conservarla como se creó',
  'adapt.report.repin': 'Actualizarla a la lección actual',
  'adapt.report.kept': 'Se conserva como se creó.',
  'adapt.report.repinned':
    'Una actividad nueva para la lección tal como está ahora. Es distinta de la anterior: quien usó el enlace anterior empieza de cero los pasos reescritos, y no se cambia nada de lo ya guardado.',
  'adapt.report.link': 'El enlace de la actividad actualizada',
  'adapt.report.open': 'Abrir la actividad actualizada',
  'adapt.report.nothing': 'No queda nada que actualizar.',
  'adapt.due.shown': 'Entrega: {due}',
  'adapt.note.from': 'De su docente',
};
