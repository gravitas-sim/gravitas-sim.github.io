// Pertenencia a un cúmulo por movimiento, más a fondo: las palabras en español, paso a paso con ../cluster-membership.js.
export default {
  steps: [
    {
      title: 'La distancia a mano',
      body: 'Una estrella cuyo paralaje es p milisegundos de arco está a 1 ÷ p kiloparsecs. El paralaje medio de los miembros es 0,385&nbsp;mas.',
      prompt: 'La distancia',
      hints: ['Divide 1 entre 0,385.'],
      worked:
        '1 ÷ 0,385 = 2,60 kpc. Una estrella a 1 kpc tiene un paralaje de 1 mas; el de este cúmulo es un poco más de un tercio de eso.',
      feedback: {
        close: 'Casi. La distancia es el inverso del paralaje.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez. Un paralaje menor que 1 mas es una distancia mayor que 1 kpc.',
        off: 'Distancia = 1 ÷ paralaje, con el paralaje en mas y la respuesta en kpc.',
      },
    },
    {
      title: 'Qué rápido se mueven los miembros entre sí',
      body: 'La fila «Dispersión del cúmulo en movimiento propio» dice cuánto difieren los miembros entre sí: 0,081&nbsp;mas/año, antes de los errores. Un movimiento propio μ en mas/año a una distancia d en kpc es una rapidez de 4,74 × μ × d en km/s. Usa d = 2,6&nbsp;kpc.',
      prompt: 'La dispersión de rapidez de los miembros a través del cielo',
      hints: ['Multiplica 4,74 por 0,081 y por 2,6.'],
      worked:
        '4,74 × 0,081 × 2,6 = 1,0 km/s. Las estrellas de un cúmulo viejo se agitan entre sí a cerca de un kilómetro por segundo, poco frente a los 20 o más km/s de la dispersión del campo.',
      feedback: {
        close: 'Casi. El factor es 4,74 × μ × d.',
        off: 'Rapidez = 4,74 × μ × d, con μ = 0,081 mas/año y d = 2,6 kpc.',
      },
    },
    {
      title: 'Cuántas estrellas del campo espera el ajuste',
      body: 'La fila «Miembros esperados» suma la probabilidad de cada estrella. La tabla tiene 993 estrellas, y el ajuste espera 505,9 de ellas en el cúmulo (movimiento propio y paralaje).',
      prompt: 'El número de estrellas del campo que espera el ajuste',
      hints: ['Todo lo que no se espera en el cúmulo se espera en el campo.'],
      worked:
        '993 − 505,9 = 487,1. Los miembros esperados son una suma de probabilidades, así que no tiene que ser entero, y difiere un poco de la cuenta por encima de un umbral.',
      feedback: {
        close: 'Casi. Resta los miembros esperados de toda la tabla.',
        off: 'Campo = total − miembros esperados, con 993 estrellas y 505,9 esperados.',
      },
    },
    {
      title: 'Qué añade el paralaje',
      body: 'Cambia el ajuste a <strong>solo movimiento propio</strong> y compáralo con movimiento propio y paralaje: el número de miembros apenas se mueve (505 contra 506), pero las estrellas con probabilidad entre 0,1 y 0,9 pasan de 8 a 4.',
      prompt: '¿Qué muestra eso?',
      options: [
        'El paralaje resuelve algunas estrellas dudosas que el movimiento propio solo no podía decidir, sin cambiar el cuadro',
        'El paralaje cambia qué cúmulo se halla',
        'El movimiento propio solo está mal',
        'El paralaje hace miembro a toda estrella',
      ],
      hints: ['Compara las dos cuentas de estrellas inciertas.'],
      because:
        'Resuelve estrellas dudosas. Una tercera medición independiente separa unas pocas estrellas que el movimiento solo deja ambiguas, así que la cuenta de inciertas baja de 8 a 4 mientras la de miembros queda a una estrella o dos.',
    },
  ],
};
