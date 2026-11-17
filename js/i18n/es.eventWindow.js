// =============================================================================
// Las palabras de la ventana de evento de un paso, en español
// -----------------------------------------------------------------------------
// Las importa js/investigations/eventWindow.js cuando se abre un paso con una
// vigilancia de pausa en un evento, solo para el idioma en uso. No están en
// es.js, cuyo texto entra en el resumen de los materiales del instructor.
// Repetir y Retroceder hasta aquí son las palabras de la barra de tiempo.
// =============================================================================

export const ES_EVENTWINDOW = {
  'window.armed':
    'La vigilancia está activada por ti: la escena se detiene sola en el evento.',
  'window.foreign':
    'Tienes activada tu propia vigilancia, así que este paso no ha activado la suya. Desactiva la tuya en el panel Pausar en un evento para usar la del paso.',
  'window.refused':
    'Aquí no se pudo activar la vigilancia; el panel Pausar en un evento explica por qué.',
  'window.wait': 'Repetir se ofrece cuando el evento ya ha ocurrido.',
  'window.at': 'Detenido en: {kind}.',
  'window.limit':
    'El evento es más antiguo que el historial grabado, que guarda los últimos {frames} fotogramas (unos {seconds} s de ejecución, {span} de tiempo simulado aquí), así que no se puede repetir. Activa la vigilancia otra vez para atrapar el siguiente.',
  'window.armAgain': 'Activar otra vez',
  'window.atEvent': 'Repetición: en el evento.',
  'window.jumped':
    'Se muestra el fotograma grabado en el evento. El botón DIRECTO devuelve la escena.',
  'window.replayHelp':
    'Repetir muestra los fotogramas grabados alrededor del evento y después devuelve la escena en vivo exactamente. La coma y el punto avanzan por ellos; Escape detiene. Las estelas vuelven a empezar y las partículas no se graban.',
  'window.rewindWhy':
    'Primero repite o retrocede hasta un fotograma: Retroceder hasta aquí convierte ese fotograma en la escena.',
  'window.rewindDrops':
    'Retroceder hasta aquí convierte el fotograma mostrado en la escena y descarta el historial posterior.',
};
