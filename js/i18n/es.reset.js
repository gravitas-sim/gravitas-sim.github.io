// Las dos formas de devolver una investigación a su inicio, nombradas por lo
// que tocan, en español. «Restablecer la escena» nunca toca las respuestas;
// «Empezar esta investigación de nuevo» las borra. Todo control, nombre,
// información emergente, cuadro y línea de ayuda que hable de alguna toma sus
// palabras de aquí.
export const ES_RESET = {
  'reset.did.scene':
    'La escena vuelve al inicio de este paso. Tus respuestas no cambian.',
  'reset.did.tool':
    'El instrumento vuelve al inicio de este paso. Tus respuestas no cambian.',
  'reset.did.both':
    'La escena y el instrumento vuelven al inicio de este paso. Tus respuestas no cambian.',
  'reset.restart': 'Empezar esta investigación de nuevo',
  'reset.restart.hint':
    'Borra las respuestas guardadas de esta investigación y vuelve al paso 1. Pregunta antes, y puedes deshacerlo hasta que cierres la investigación.',
  'reset.ask.title': '¿Empezar esta investigación de nuevo?',
  'reset.ask.count': 'Respuestas y lecturas guardadas que se borrarán:',
  'reset.ask.parts': 'Respuestas: {a}. Lecturas: {r}.',
  'reset.ask.scene':
    'También se restablece la escena, desde el inicio del paso 1.',
  'reset.ask.assigned':
    'Esta es una actividad: sus respuestas guardadas también se borran. La versión de tu docente no cambia.',
  'reset.ask.lost':
    'Descartarlas las quita de este dispositivo. Descarga antes una copia si quieres poder recuperarlas. También puedes deshacerlo hasta que cierres esta investigación.',
  'reset.ask.lost.mem':
    'Este navegador no está guardando tus respuestas, así que solo están en esta pestaña. Descartarlas las quita de la pestaña. Descarga antes una copia si quieres poder recuperarlas. También puedes deshacerlo hasta que cierres esta investigación.',
  'reset.ask.none':
    'Todavía no hay nada guardado aquí, así que no se borrará ninguna respuesta.',
  'reset.ask.progress':
    'Se restablecen tu posición y los pasos que has visitado. Puedes deshacerlo hasta que cierres esta investigación.',
  'reset.ask.backup': 'Descargar una copia primero',
  'reset.ask.go': 'Descartar las respuestas y empezar de nuevo',
  'reset.ask.cancel': 'Cancelar',
  'reset.undo.said': {
    one: 'Has empezado de nuevo. Se borró 1 respuesta o lectura guardada. Puedes deshacerlo hasta que cierres esta investigación.',
    other:
      'Has empezado de nuevo. Se borraron {n} respuestas y lecturas guardadas. Puedes deshacerlo hasta que cierres esta investigación.',
  },
  'reset.undo.none':
    'Has empezado de nuevo. No había nada guardado, así que solo se restableció tu posición. Puedes deshacerlo hasta que cierres esta investigación.',
  'reset.undo': 'Deshacer',
  'reset.undo.done': 'Tus respuestas y lecturas han vuelto.',
  'scene.altered':
    'Cambiaste la escena. Restablece la escena para medir desde el inicio de este paso.',
  'scene.back': 'Volver a la escena de esta investigación',
  'reset.help.title': 'Empezar de nuevo',
};
