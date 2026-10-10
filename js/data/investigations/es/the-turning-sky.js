// El cielo que gira - español, paso a paso con ../the-turning-sky.js.
export default {
  title: 'El cielo que gira',
  subtitle: 'Mide por qué una estrella sale cuatro minutos antes cada noche',
  objectives: [
    'Decir qué describen las coordenadas horizontales y las ecuatoriales, y cuáles conserva una estrella',
    'Medir cuánto antes sale una estrella cada noche, y explicarlo',
    'Leer un tiempo sidéreo y decir qué cuenta',
    'Hallar la altura de una estrella en el meridiano a partir de su declinación y la latitud',
    'Decir qué estrellas no se ponen nunca desde una latitud dada',
  ],
  steps: [
    {
      title: 'Un cielo que gira',
      body: 'Quédate una hora al aire libre y verás las estrellas girar sobre ti. Dos maneras de decir dónde está una estrella ayudan a no confundirse. Sus <strong>coordenadas horizontales</strong>, la altura sobre el horizonte y el acimut alrededor de él, cambian toda la noche y son distintas para cada persona. Sus <strong>coordenadas ecuatoriales</strong>, ascensión recta y declinación, están fijas en el cielo como la latitud y la longitud en la Tierra, y una estrella las conserva de una noche a otra.\n\nEl instrumento de abajo es un modelo calculado del cielo (el núcleo del Laboratorio del Cielo), no una observación. Sigue una estrella durante una noche desde un lugar en el meridiano de Greenwich, así que la hora del reloj es el Tiempo Universal. La curva es la altura de la estrella a lo largo del día; el punto es el momento en que sale.',
    },
    {
      title: 'Predice la noche de mañana',
      body: 'Una estrella sale a cierta hora esta noche. Todavía no muevas los controles.',
      prompt: 'Mañana por la noche la misma estrella saldrá&hellip;',
      options: [
        'exactamente a la misma hora',
        'unos cuatro minutos antes',
        'unos cuatro minutos después',
        'una hora antes',
      ],
      hints: [
        'Piensa en el Sol: sale casi a la misma hora del reloj todos los días, y las estrellas no.',
      ],
      because:
        'Unos cuatro minutos antes. Las estrellas van un poco por delante del reloj cada noche. El paso siguiente mide cuánto.',
    },
    {
      title: 'Mide el adelanto',
      body: 'Está seleccionada Arcturus, a latitud 40&deg;. Lee la hora a la que sale, en minutos después del mediodía, en la noche&nbsp;0, y luego pasa a la noche&nbsp;30 y léela otra vez. (Una noche empieza al mediodía, así que la hora de salida nunca da la vuelta por la medianoche.)',
      fields: [
        { label: 'Sale la noche 0 (minutos después del mediodía)' },
        { label: 'Sale la noche 30 (minutos después del mediodía)' },
        { label: 'Antes cada noche' },
      ],
    },
    {
      title: 'Un mes después',
      body: 'Una estrella sale a las 21:30 el 1&nbsp;de marzo. Usa el adelanto que mediste.',
      prompt: '¿Cuántos minutos antes sale el 1 de abril, 31 noches después?',
      hints: [
        'Multiplica el adelanto de cada noche por el número de noches.',
        'El adelanto es algo menos de cuatro minutos.',
      ],
      worked:
        '31 noches × 3,93 min por noche = 121,9 min, unas dos horas antes.',
      feedback: {
        close:
          'Casi. Multiplica el adelanto de cada noche por 31 y deja las unidades en minutos.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez. Unos minutos cada noche, en un mes, son un par de horas.',
        off: 'Adelanto total = adelanto por noche × número de noches.',
      },
    },
    {
      title: 'Por qué cuatro minutos',
      body: 'El adelanto es igual para todas las estrellas, así que no tiene que ver con las estrellas. Tiene que ver con el reloj.',
      prompt: '¿Por qué las estrellas salen antes según el reloj cada noche?',
      options: [
        'El reloj sigue al Sol, y el Sol se mueve cada día cerca de un grado hacia el este respecto de las estrellas, así que la Tierra debe girar ese tanto más para devolver el Sol al meridiano',
        'Las estrellas se desplazan lentamente hacia el oeste de una noche a otra',
        'La rotación de la Tierra se está frenando',
        'El aire desvía un poco más la luz de las estrellas cada noche',
      ],
      misconceptions: [
        {
          id: 'rotation-slows',
          say: 'La rotación es constante; no desplazaría todas las estrellas lo mismo cada noche, y el adelanto no cambia con el tiempo.',
        },
      ],
      hints: [
        'Una estrella vuelve al mismo lugar tras un giro completo de la Tierra. ¿Y el Sol?',
      ],
      because:
        'La Tierra gira una vez respecto de las estrellas en un día sidéreo, de 23 h 56 min. El Sol se queda un poco atrás, porque la Tierra también ha avanzado cerca de un grado en su órbita; hacen falta unos cuatro minutos más de giro para devolver el Sol al meridiano. El reloj sigue al Sol.',
    },
    {
      title: 'Un reloj que sigue a las estrellas',
      body: 'El <strong>tiempo sidéreo</strong> cuenta el giro de la Tierra respecto de las estrellas: es la ascensión recta que está ahora en el meridiano. Lee el tiempo sidéreo a medianoche en la noche&nbsp;0 y en la noche&nbsp;30.',
      fields: [
        { label: 'Tiempo sidéreo a medianoche, noche 0' },
        { label: 'Tiempo sidéreo a medianoche, noche 30' },
        { label: 'Avance en 30 noches' },
      ],
    },
    {
      title: 'A qué altura llega',
      body: 'Arcturus está a declinación +19,2&deg;. Una estrella cruza el meridiano a una altura de 90&deg; menos la latitud más su declinación, desde un lugar del hemisferio norte. Úsalo para la latitud 40&deg; y luego comprueba la altura en el meridiano que da el instrumento.',
      prompt: 'Altura de Arcturus en el meridiano, latitud 40°',
      hints: [
        'Resta la latitud a 90° y luego suma la declinación.',
        'El resultado es un ángulo sobre el horizonte, entre 0 y 90 grados.',
      ],
      worked:
        '90° − 40° + 19,2° = 69,2°; el instrumento da 69,1° con la posición de la estrella en la fecha.',
      feedback: {
        close: 'Casi. 90° menos la latitud, y luego más la declinación.',
        'wrong-order-of-magnitude': 'Una altura está entre 0 y 90 grados.',
        off: 'Altura en el meridiano = 90° − latitud + declinación.',
      },
    },
    {
      title: 'Una estrella que no se pone',
      body: 'Selecciona Vega, a declinación +38,8&deg;, y pon la latitud en 60&deg;. Lee lo que dice el instrumento sobre ella.',
      prompt: 'Desde la latitud 60° norte, Vega&hellip;',
      options: [
        'sale y se pone, como casi todas las estrellas',
        'nunca se pone: es circumpolar',
        'nunca sale',
        'sale por el oeste',
      ],
      hints: [
        'Una estrella es circumpolar cuando su declinación es mayor que 90° menos la latitud.',
      ],
      because:
        'A latitud 60° toda estrella al norte de la declinación +30° no se pone nunca. Vega está a +38,8°, así que da vueltas al polo sobre el horizonte toda la noche, todas las noches.',
    },
    {
      title: 'Con tus palabras',
      body: 'Las tardes de invierno y las de verano muestran constelaciones distintas.',
      prompt:
        'Explica por qué, usando lo que mediste sobre la hora de salida de una estrella.',
    },
    {
      title: 'Lo que has deducido',
      body: 'Una estrella conserva sus coordenadas ecuatoriales y cambia las horizontales a medida que la Tierra gira. Sale unos cuatro minutos antes cada noche, porque la Tierra tiene que girar algo más de una vuelta para devolver el Sol al mismo sitio: el día sidéreo es unos cuatro minutos más corto que el día solar. A qué altura llega una estrella, y si llega a ponerse, depende solo de su declinación y de tu latitud. La investigación siguiente usa el mismo instrumento para seguir al Sol a lo largo del año.',
    },
  ],
};
