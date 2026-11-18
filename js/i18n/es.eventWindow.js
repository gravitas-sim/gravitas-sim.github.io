// =============================================================================
// Las palabras de la ventana de evento de un paso, en español
// -----------------------------------------------------------------------------
// Las importa js/investigations/eventWindow.js cuando se abre un paso con una
// vigilancia de pausa en un evento, solo para el idioma en uso. No están en
// es.js, cuyo texto entra en el resumen de los materiales del instructor.
// Repetir y Retroceder hasta aquí son las palabras de la barra de tiempo.
// =============================================================================

export const ES_EVENTWINDOW = {
  'window.armed': 'Activada por ti: la escena se detiene en el evento.',
  'window.foreign':
    'Tienes tu propia vigilancia activada, así que este paso no activó ninguna. Desactiva la tuya para usar la del paso.',
  'window.refused':
    'No se pudo activar la vigilancia; el panel Pausar en un evento dice por qué.',
  'window.wait': 'Repetir llega cuando el evento ya ha ocurrido.',
  'window.at': 'Detenido en: {kind}.',
  'window.limit':
    'El evento es más antiguo que la grabación (los últimos {frames} fotogramas, unos {seconds} s de ejecución, {span} aquí). Activa otra vez para atrapar el siguiente.',
  'window.armAgain': 'Activar otra vez',
  'window.atEvent': 'Repetición: en el evento.',
  'window.jumped':
    'Se muestra el fotograma del evento. DIRECTO devuelve la escena.',
  'window.replayHelp':
    'Repetir muestra los fotogramas alrededor del evento y luego devuelve la escena en vivo exactamente. La coma y el punto avanzan; Escape detiene. Las partículas no se graban.',
  'window.rewindWhy': 'Primero repite o retrocede hasta un fotograma.',
  'window.rewindDrops':
    'Retroceder hasta aquí convierte este fotograma en la escena y descarta el historial posterior.',
};
