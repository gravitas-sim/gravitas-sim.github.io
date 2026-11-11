// La acción "Describir la vista" del laboratorio 3-D: su español, con los
// mismos ids que ./en.lab3dDescribe.js (js/lab3d/view/describe.js). Cada frase
// da un número o un ajuste que la página ya muestra; ninguna dice qué significa.

export const ES_LAB3DDESCRIBE = {
  'd.heading': 'Descripción de la vista',
  'd.none': 'Todavía no hay un sistema que describir.',
  'd.mode.kepler':
    'Modo de ejecución: solo Kepler; cada cuerpo sigue su propia órbita de dos cuerpos, así que ninguna órbita cambia. Un paso es {tick}.',
  'd.mode.nbody':
    'Modo de ejecución: N cuerpos, {scheme}, paso {step}; un paso de reloj es {tick}.',
  'd.mode.adaptive':
    'Modo de ejecución: N cuerpos, {scheme}, tolerancia {tol}; un paso de reloj es {tick}.',
  'd.mode.precomputed':
    'Modo de ejecución: una ejecución precalculada reproducida ({source}); un paso de reloj es {tick}.',
  'd.clock': 'El reloj marca {t}.',
  'd.bodies': '{n} cuerpos vivos: {names}.',
  'd.bodies.more': '{n} cuerpos vivos: {names} y {more} más.',
  'd.setup':
    'Sistema de referencia: {frame}. Plano de referencia: {plane}. Proyección: {projection}.',
  'd.camera':
    'La cámara mira desde {above}° {side} el plano de referencia, a {around}° alrededor de él, y la vista es {size} veces más alta que el sistema.',
  'd.above': 'sobre',
  'd.below': 'bajo',
  'd.reach':
    'El cuerpo más alejado del centro de masa es {name}, a {distance}.',
  'd.orbit': '{name} alrededor de {primary}: a = {a}, e = {e}, i = {i}°.',
  'd.orbit.unbound':
    '{name} alrededor de {primary}: no ligado, e = {e}, i = {i}°.',
  'd.orbits.more': 'Y {more} órbitas más están en la tabla de órbitas.',
  'd.mutual': 'Inclinación mutua de {a} y {b}: {angle}°.',
  'd.held':
    'Un paso de la investigación pide una medición, así que se omiten los números de las órbitas. Comprueba la respuesta, o muéstrala, para tenerlos.',
  'd.unit.au': 'UA',
  'd.unit.day': 'd',
  'd.unit.length': 'unidades de longitud',
  'd.unit.time': 'unidades de tiempo',
};
