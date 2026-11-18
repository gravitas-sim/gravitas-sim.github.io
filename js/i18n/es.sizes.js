// The Sizes statement (js/sizeStatement.js), in Spanish: what is drawn to scale
// and what is not, and the canvas description's size sentence. Registered
// by js/sizeFacts.js when it loads.
export const ES_SIZES = {
  'sizes.title': 'Qué se dibuja a escala',
  'sizes.distances':
    'Las distancias se dibujan a una sola escala, la del propio modelo, y la barra de escala las mide. Donde un escenario dispone un sistema más compacto que el real, el dibujo también lo es.',
  'sizes.notSizes':
    'Los tamaños no. Cada cuerpo se dibuja mayor que en la realidad, cada tipo con su propio factor, así que ni un tamaño ni la proporción entre dos tamaños se pueden leer en el lienzo.',
  'sizes.collision':
    'El radio del modelo es el radio de colisión: dos cuerpos se tocan cuando sus centros están más cerca que la suma de sus radios del modelo, y las fusiones y los límites de Roche también lo usan. Ya es mayor que el real. El radio dibujado es el radio del modelo por un factor según el tipo de cuerpo, y nunca menor que {floor} px en pantalla, para que un cuerpo pequeño siga visible.',
  'sizes.caption': 'Radios de los cuerpos de este mundo',
  'sizes.col.body': 'Cuerpo',
  'sizes.col.real': 'Radio real',
  'sizes.col.model': 'Radio del modelo (de colisión)',
  'sizes.col.drawn': 'Dibujado, veces el real',
  'sizes.noReal': 'no registrado',
  'sizes.notModelled': 'no se modela como tamaño',
  'sizes.close': 'Cerrar',
  'sizes.empty': 'Todavía no hay nada en el mundo.',
  'sizes.timesRange': 'de {lo}× a {hi}×',
  'sizes.summary': 'Dibujados mayores que en la realidad: {list}.',
  'sizes.summary.selected': '{name} se dibuja {times} su radio real.',
};
