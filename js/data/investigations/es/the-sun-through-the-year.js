// El Sol a lo largo del año - español, paso a paso con ../the-sun-through-the-year.js.
export default {
  title: 'El Sol a lo largo del año',
  subtitle:
    'Mide la altura del Sol, la duración del día y por qué junio es cálido',
  objectives: [
    'Describir la eclíptica y la oblicuidad, y cómo fijan la declinación del Sol a lo largo del año',
    'Medir la altura del Sol al mediodía en los equinoccios y solsticios, y explicar el intervalo',
    'Medir la duración del día en tres latitudes',
    'Decir por qué la distancia al Sol no es la causa de las estaciones',
    'Predecir cómo serían las estaciones con otra inclinación',
  ],
  steps: [
    {
      title: 'Un Sol que se mueve',
      body: 'A lo largo de un año el Sol recorre un círculo máximo del cielo, la <strong>eclíptica</strong>, por las constelaciones del zodiaco. La eclíptica está inclinada 23,4° respecto del ecuador celeste: es la <strong>oblicuidad</strong>. Cuando el Sol está en los puntos de cruce (longitud eclíptica 0° y 180°) su declinación es cero: los equinoccios. En las longitudes 90° y 270° está lo más al norte y al sur que llega: los solsticios.\n\nEl instrumento calcula el Sol al mediodía local de una fecha, a la latitud que elijas, con el núcleo del Laboratorio del Cielo. Es un modelo, no una medición. La gráfica de arriba es la altura del Sol al mediodía a lo largo del año; la de abajo, la duración del día.',
    },
    {
      title: 'Predice el Sol del mediodía',
      body: 'A latitud 40° norte, más o menos la de Madrid o Nueva York, piensa en el Sol al mediodía en junio y en diciembre.',
      prompt:
        'La altura del Sol al mediodía en junio comparada con diciembre es&hellip;',
      options: [
        'casi la misma: las estaciones vienen de la distancia al Sol',
        'mayor en junio, en unos 47 grados',
        'mayor en junio, en unos 10 grados',
        'mayor en diciembre',
      ],
      hints: ['La declinación del Sol oscila entre más y menos la oblicuidad.'],
      because:
        'Mayor en junio en unos 47 grados: el doble de la oblicuidad. El paso siguiente lo mide.',
    },
    {
      title: 'Tres mediodías',
      body: 'Usa los preajustes del equinoccio de marzo, el solsticio de junio y el solsticio de diciembre, a latitud 40°. Lee cada vez la altura del Sol al mediodía.',
      fields: [
        { label: 'Altura al mediodía, equinoccio de marzo' },
        { label: 'Altura al mediodía, solsticio de junio' },
        { label: 'Altura al mediodía, solsticio de diciembre' },
        { label: 'Junio menos diciembre' },
      ],
    },
    {
      title: 'Y si la inclinación fuera menor',
      body: 'En el solsticio de junio la declinación del Sol es igual a la inclinación. Calcula la altura al mediodía a 40° norte si la inclinación fuera de solo 10°, y luego pon el control de inclinación en 10 para comprobarlo.',
      prompt:
        'Altura al mediodía en el solsticio de junio, latitud 40°, inclinación 10°',
      hints: [
        'Altura al mediodía = 90° menos la latitud, más la declinación.',
        'En el solsticio de junio la declinación es la inclinación.',
      ],
      worked: '90° − 40° + 10° = 60°. Con la inclinación real es de 73,4°.',
      feedback: {
        close:
          'Casi. 90° − latitud + declinación, con la declinación igual a la inclinación.',
        'wrong-order-of-magnitude': 'Una altura está entre 0 y 90 grados.',
        off: 'Altura al mediodía = 90° − latitud + declinación.',
      },
    },
    {
      title: 'Tres duraciones del día',
      body: 'Vuelve a la inclinación real y al solsticio de junio. Pon la latitud en 0°, 40° y 65° por turno y lee la duración del día.',
      fields: [
        { label: 'Duración del día a latitud 0°' },
        { label: 'Duración del día a latitud 40°' },
        { label: 'Duración del día a latitud 65°' },
      ],
    },
    {
      title: 'La trampa de la distancia',
      body: 'Lee la distancia al Sol en el solsticio de junio (1,016&nbsp;ua) y en el de diciembre (0,984&nbsp;ua). La Tierra está más lejos del Sol en junio.',
      prompt: 'Entonces, ¿por qué junio es cálido en el hemisferio norte?',
      options: [
        'El Sol está más alto y el día es más largo, y eso pesa más que un cambio de distancia del 3 por ciento',
        'La lectura de la distancia es errónea',
        'La Tierra está más cerca del Sol en junio',
        'El Sol da más luz en junio',
      ],
      misconceptions: [
        {
          id: 'closer-is-summer',
          say: 'Comprueba la fila de distancia en las dos fechas: la Tierra está más lejos del Sol en junio, y el hemisferio sur está entonces en invierno.',
        },
      ],
      hints: [
        'Compara cuánto cambia la distancia con cuánto cambia la altura del Sol al mediodía.',
      ],
      because:
        'La distancia cambia solo un 3 por ciento entre las dos fechas, y la luz solar cerca de un 7 por ciento. La altura al mediodía cambia 47° y el día 6 horas a esta latitud, lo que cambia la luz que llega a un metro cuadrado de suelo mucho más. Y el hemisferio sur tiene invierno en junio.',
    },
    {
      title: 'Dónde en la eclíptica',
      body: 'Usa el preajuste del equinoccio de septiembre y lee la longitud eclíptica del Sol, el ángulo a lo largo de la eclíptica desde el equinoccio de marzo.',
      prompt: 'La longitud eclíptica del Sol en el equinoccio de septiembre',
      hints: ['El equinoccio de marzo es 0° y el solsticio de junio es 90°.'],
      worked:
        'A mitad de camino alrededor de la eclíptica desde el equinoccio de marzo: 180°.',
      feedback: {
        close:
          'Casi. El equinoccio de septiembre está media circunferencia después del de marzo.',
        'wrong-order-of-magnitude':
          'Una longitud eclíptica está entre 0° y 360°.',
        off: 'Los equinoccios están separados media circunferencia; cada solsticio está a un cuarto de circunferencia de ambos.',
      },
    },
    {
      title: 'Con tus palabras',
      body: 'Pulsa el preajuste Sin inclinación y recorre el año.',
      prompt:
        '¿Cómo serían las estaciones sin inclinación, y qué hace la inclinación?',
    },
    {
      title: 'Lo que has deducido',
      body: 'La declinación del Sol oscila entre más y menos la oblicuidad, 23,4°, mientras recorre la eclíptica. Eso mueve el Sol del mediodía a lo largo de 47° de altura a 40° norte y alarga el día de junio hasta 15 horas. La distancia al Sol cambia cerca de un 3 por ciento y es el lugar equivocado donde buscar. La investigación siguiente se ocupa de la Luna.',
    },
  ],
};
