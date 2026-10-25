// La investigación de Júpiter (Prompt 193) - español, paso a paso con ../satellite-sequence.js (D-R10-74).
// Sin lectura por una persona que lea español con fluidez; los mensajes que calculan los validadores quedan en inglés, como en las demás investigaciones.

// La investigación de Júpiter (Prompt 193): paso a paso con el inglés.
export const WEIGHING_JUPITER = {
  title: 'Pesar Júpiter con sus lunas',
  subtitle:
    'Cuatro lunas, un ritmo de observación que puede medirlas y la tercera ley de Kepler',
  objectives: [
    'Identificar las cuatro lunas galileanas noche tras noche, con las efemérides como comprobación, y leer a qué distancia de Júpiter está cada una',
    'Hallar el período y el radio de órbita de una luna a partir de una sinusoide ajustada a sus distancias en el tiempo',
    'Decir por qué una imagen por noche no puede dar el período de Ío, y qué muestreo sí puede',
    'Convertir un período y un radio en la masa de Júpiter con la tercera ley de Kepler, y decir qué incluye la incertidumbre',
  ],
  steps: [
    {
      title: 'Júpiter y cuatro puntos de luz',
      body: 'Con unos prismáticos, Júpiter tiene cuatro pequeñas compañeras en línea: Ío, Europa, Ganímedes y Calisto, las lunas que vio Galileo en enero de 1610. Esta investigación las mide. Las imágenes de aquí son <strong>sintéticas</strong>: no se observó ninguna imagen de Júpiter para esta investigación. Cada una se hizo con las posiciones reales de las lunas en las noches del 20 de noviembre al 30 de diciembre de 2025 (JPL Horizons, efemérides de satélites JUP365), y luego se le dio el disco de Júpiter, el brillo de las lunas, desenfoque atmosférico y ruido del detector. Para una imagen real de las lunas, mira la página de lunas de Júpiter de la NASA, science.nasa.gov/jupiter/moons.\n\nEl este está a la derecha y el ecuador de Júpiter es horizontal. Hay 51 imágenes: tres noches largas de imágenes horarias, del 5 al 7 de diciembre, y una imagen por noche, a las 08:00 UT, en las demás. Activa la superposición para ver dónde sitúan las efemérides cada luna: es la comprobación de quién es quién.',
    },
    {
      title: '¿Quién es quién?',
      body: 'La imagen 13 es la noche del 4 de diciembre. Cuatro lunas están en línea, con la superposición activa: I, E, G y C.',
      prompt: 'En la imagen 13, ¿qué luna está más lejos de Júpiter?',
      options: ['Ío', 'Europa', 'Ganímedes', 'Calisto'],
      misconceptions: [
        {
          say: 'Ganímedes es la más brillante y la mayor, pero el brillo no dice a qué distancia está. Lee la distancia de cada luna a Júpiter en la lectura.',
        },
      ],
      hints: [
        'La lectura da la distancia de cada luna al este o al oeste de Júpiter.',
      ],
      because:
        'Calisto, a 26,3 radios de Júpiter al este. La superposición y las posiciones medidas coinciden: cuanto más lejos orbita una luna, más lejos puede estar de Júpiter, y Calisto es la más externa.',
    },
    {
      title: '¿Cuánto se mueve una luna en una hora?',
      body: 'Las imágenes 14 a 34 son horarias, en tres noches. Pon la imagen en <strong>14</strong> (06:00 UT del 5 de diciembre) y lee a qué distancia de Júpiter está Ganímedes, en radios de Júpiter. Luego pon la imagen en <strong>16</strong>, dos horas después, y léela otra vez. Escribe la primera distancia y cuánto se movió en las dos horas.',
      fields: [
        { label: 'Distancia de Ganímedes a Júpiter en la imagen 14' },
        { label: 'Cuánto se movió entre la imagen 14 y la imagen 16' },
      ],
    },
    {
      title: 'El período de Ío y su distancia',
      body: 'Cada imagen da una distancia medida para cada luna. El instrumento las ha reunido: la distancia de Ío a Júpiter frente al tiempo, con la sinusoide que mejor se ajusta. Deja el muestreo en <strong>1</strong>, la secuencia diseñada, y lee el <strong>período</strong> de Ío en días y su <strong>amplitud</strong> en radios de Júpiter. La amplitud es la mayor distancia de Ío a Júpiter, que para una órbita circular vista de canto es el radio de la órbita.',
      fields: [
        { label: 'Período de Ío' },
        { label: 'Radio de la órbita de Ío' },
      ],
    },
    {
      title: '¿Y si tuvieras una imagen por noche?',
      body: 'La mayoría de quienes observan Júpiter toman una imagen por noche, a la misma hora. Ío da la vuelta en 1,77 días. Toma solo las 30 imágenes de una por noche y pide el período de Ío, buscando los períodos que buscaría un observador, mayores de dos días.',
      prompt:
        'El período hallado para Ío con imágenes de una por noche sería&hellip;',
      options: [
        'unos 1,77 días, el verdadero',
        'unos 0,9 días, la mitad del verdadero',
        'unos 2,3 días, un período que no es el de Ío',
        'ningún período: los puntos se dispersarían',
      ],
      hints: [
        'Una imagen al día no puede seguir una luna que da la vuelta en menos de dos días. ¿Qué vería en su lugar?',
      ],
      because:
        'Unos 2,3 días. Una imagen cada día ve la luna a 0,565 vueltas al día como si diera 1 − 0,565 = 0,435 vueltas al día, un período de 2,30 días, y nada en las imágenes dice cuál es el correcto. El paso siguiente lo muestra.',
    },
    {
      title: 'Ío con una imagen por noche',
      body: 'Pon el muestreo en <strong>0</strong>: una vez por noche, con los períodos buscados mayores de 2 días. Lee el período de Ío.',
      fields: [{ label: 'Período de Ío con imágenes de una por noche' }],
    },
    {
      title: 'Lo que has deducido',
      body: 'Identificaste las lunas con las efemérides como comprobación, viste a Ganímedes moverse 0,9 radios de Júpiter en dos horas y ajustaste Ío: 1,77 días a 5,9 radios de Júpiter. Y viste por qué importa el ritmo de observación: muestreado una vez por noche, Ío da una respuesta limpia, 2,3 días, que es falsa. Las noches horarias son lo que hace medible a Ío. Las imágenes eran sintéticas, hechas con las posiciones reales de las lunas; una noche real añadiría nubes, deriva y píxeles malos. Los pasos más profundos pesan Júpiter con estos períodos y radios.',
    },
  ],
};

export default {
  'weighing-jupiter': WEIGHING_JUPITER,
};
