// =============================================================================
// Adaptar una actividad y qué cambió bajo una, en español (Prompt 175)
// -----------------------------------------------------------------------------
// Véase ./en.adapt.js: un archivo propio, que solo leen el constructor de
// actividades y la página que abre una actividad adaptada o desactualizada.
// =============================================================================

export const ES_ADAPT = {
  'adapt.title': 'Adaptar la actividad',
  'adapt.hint':
    'Cambie el orden de los pasos, añada sus palabras a un paso e indique cuándo se entrega. Cada cambio se comprueba contra los pasos de los que depende la investigación, y uno que los rompiera se rechaza, nombrando el paso.',
  'adapt.order': 'Orden de los pasos',
  'adapt.up': 'Antes',
  'adapt.down': 'Después',
  'adapt.remove': 'Quitar',
  'adapt.note': 'Sus palabras para este paso (opcional)',
  'adapt.note.en': 'Inglés',
  'adapt.note.es': 'Español',
  'adapt.due': 'Cuándo se entrega, con sus palabras (opcional)',
  'adapt.marking': 'Imprimir la nota de calificación en el informe',
  'adapt.more': 'Cómo empiezan las secciones «Más»',
  'adapt.more.depth': 'Según la profundidad',
  'adapt.more.open': 'Abiertas',
  'adapt.more.shut': 'Cerradas',
  'adapt.moved': 'Se movió «{step}».',
  'adapt.removed': 'Se quitó «{step}».',
  'adapt.refused': 'Sin cambios: {why}',
  'adapt.problem.requires.later':
    '«{step}» usa «{needs}», que tiene que ir antes.',
  'adapt.problem.requires.absent':
    '«{step}» usa «{needs}», que no está en la actividad.',
  'adapt.problem.when.later':
    '«{step}» responde a «{needs}», que tiene que ir antes.',
  'adapt.problem.when.absent':
    '«{step}» responde a «{needs}», que no está en la actividad.',
  'adapt.problem.reveal.earlier':
    'La respuesta a la predicción «{step}» llega en «{needs}», que tiene que ir después.',
  'adapt.problem.reveal.absent':
    'La respuesta a la predicción «{step}» llega en «{needs}», que no está en la actividad.',
  'adapt.problem.setup.world':
    '«{step}» trata del mundo que construye «{needs}», así que tiene que quedar bajo él.',
  'adapt.problem.scene.scene':
    '«{step}» conserva la escena que prepara «{needs}», así que tiene que quedar bajo ella.',
  'adapt.problem.depth':
    '«{step}» es más profundo que la profundidad de la actividad.',
  'adapt.report.title': 'Esta actividad se creó con una versión anterior',
  'adapt.report.rewritten':
    'Reescritos, así que las respuestas guardadas en ellos se dejan aparte: {steps}.',
  'adapt.report.removed': 'Ya no están en la investigación: {steps}.',
  'adapt.report.keep': 'Conservarla como se creó',
  'adapt.report.repin': 'Actualizarla a la investigación actual',
  'adapt.report.kept': 'Se conserva como se creó.',
  'adapt.report.repinned':
    'Una actividad nueva con su propio id: quien use el enlace anterior empieza de cero los pasos reescritos.',
  'adapt.report.link': 'El enlace de la actividad actualizada',
  'adapt.report.open': 'Abrir la actividad actualizada',
  'adapt.due.shown': 'Entrega: {due}',
  'adapt.note.from': 'De su docente',
};
