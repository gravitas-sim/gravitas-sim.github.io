// La investigación de Júpiter, más a fondo: las palabras en español, paso a paso con ../satellite-sequence.js (D-R10-74).
// Sin lectura por una persona que lea español con fluidez.

// Júpiter, pasos más profundos (Prompt 193): paso a paso con el inglés.
export const WEIGHING_JUPITER_DEEPER = {
  steps: [
    {
      title: 'Período y radio de Ganímedes',
      body: 'Ahora el mismo ajuste para Ganímedes, con el muestreo diseñado. Elige Ganímedes (3) y lee su <strong>período</strong> y su <strong>radio de órbita</strong>, la amplitud, en radios de Júpiter. Un radio de Júpiter son 71 492 km.',
      fields: [
        { label: 'Período de Ganímedes' },
        { label: 'Radio de la órbita de Ganímedes' },
      ],
    },
    {
      title: 'La tercera ley de Kepler con una luna',
      body: 'Para una luna pequeña alrededor de un planeta pesado, GM = 4π²a&sup3;/P&sup2;, con a el radio de órbita en kilómetros y P el período en segundos. G es la constante gravitatoria y M la masa de Júpiter. Usa el radio y el período que acabas de leer: a = 14,97 &times; 71 492 km y P = 7,141 días.',
      prompt:
        '¿Cuál es el GM de Júpiter según Ganímedes, en millones de km³/s²?',
      hints: [
        'a son unos 1,07 millones de km; P es 7,141 × 86 400 s. Calcula a³ / P² y multiplica por 4π².',
      ],
      worked:
        'a = 14,97 × 71 492 = 1,0702 millones de km, P = 7,141 × 86 400 = 617 000 s. GM = 4π² × (1,0702 × 10⁶)³ / 617 000² = 1,272 × 10⁸ km³/s², 127,2 millones. La fila de Júpiter-pesar del instrumento dice lo mismo con su incertidumbre.',
      feedback: {
        close: 'Casi. Revisa la unidad de a (kilómetros) y la de P (segundos).',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: a está en kilómetros, un millón más o menos, y P en segundos.',
        off: '4π² a³ / P² con a en km y P en s.',
      },
    },
    {
      title: 'La masa de Júpiter, con su incertidumbre',
      body: 'Divide GM por la constante gravitatoria, G = 6,674 &times; 10&minus;&sup1;&sup1; m&sup3;/(kg s&sup2;), y Ganímedes da la masa de Júpiter. El instrumento indica la incertidumbre a partir de la del ajuste, llevada por la ley: tres veces la incertidumbre relativa del radio y dos veces la del período.',
      prompt:
        'Informa la masa de Júpiter según Ganímedes como valor ± incertidumbre, en unidades de 10²⁷ kg.',
      placeholder: 'p. ej. 1,5 ± 0,05',
      hints: ['GM es 1,272 × 10¹⁷ m³/s²; divide por 6,674 × 10⁻¹¹.'],
      worked:
        '1,2717 × 10¹⁷ / 6,674 × 10⁻¹¹ = 1,905 × 10²⁷ kg, con la incertidumbre del instrumento de unos 0,003 × 10²⁷ kg.',
      feedback: {
        close: 'Casi. Da un valor, luego ±, luego una incertidumbre.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: Júpiter son unos dos mil millones de millones de millones de millones de kilogramos.',
        off: 'GM / G, con GM en m³/s² (1 km³ = 10⁹ m³).',
      },
    },
    {
      title: 'Frente al valor de JPL',
      body: 'Las tablas de JPL dan el GM del planeta como 126,69 millones de km³/s². El de Ganímedes es 127,17 &plusmn; 0,17: 0,48 por encima, casi tres de sus propias incertidumbres.',
      prompt: '¿Qué te dice ese desacuerdo?',
      options: [
        'Ganímedes es la luna equivocada',
        'La ley de Kepler falla para las lunas',
        'La incertidumbre indicada deja algo fuera, y la profundidad siguiente halla qué',
        'El valor de JPL está anticuado',
      ],
      misconceptions: [
        {
          say: 'La ley se cumple a mejor de una décima de por ciento aquí. Lo que falla es más pequeño, y está en lo medido, no en la ley.',
        },
      ],
      hints: [
        'Tres errores estándar rara vez son casualidad. ¿Qué supone la medida del período sobre el observador?',
      ],
      because:
        'La incertidumbre lleva la dispersión de los puntos y nada más. El período que ve la Tierra no es del todo el período orbital de la luna, porque la Tierra y Júpiter se mueven mientras la luna da la vuelta; eso desplaza el GM de Ganímedes en un 0,3 por ciento, más que el 0,13 indicado. Los pasos avanzados lo corrigen.',
    },
    {
      title: 'La Tierra también se mueve',
      body: 'En estas noches la línea de la Tierra a Júpiter gira, y eso gira el marco en que se leen las distancias 0,083 grados al día (el instrumento lo muestra cuando la corrección está activa). Una luna avanza en su órbita 360&deg;/P al día, Calisto 21,6&deg; al día. El período que ve la Tierra difiere del orbital en el cociente de los dos.',
      prompt:
        '¿En qué porcentaje difiere el período de Calisto como lo ve la Tierra de su período orbital?',
      hints: ['0,083 dividido entre 21,6, en porcentaje.'],
      worked:
        '0,083 / 21,57 = 0,0038, el 0,38 por ciento. Para Ío, que gira 203° al día, es el 0,04 por ciento: la corrección importa más para las lunas más lentas.',
      feedback: {
        close:
          'Casi. Divide el giro del marco entre el de la propia luna, y usa porcentaje.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: 0,083 es pequeño junto a 21,6, y el cociente son unas milésimas.',
        off: '0,083 / 21,57 × 100.',
      },
    },
    {
      title: 'Cuatro lunas, corregidas',
      body: 'Elige <strong>las cuatro</strong> (0) y pon la corrección en <strong>1</strong>. El instrumento convierte cada período aparente en el orbital con el giro del marco, pesa Júpiter con cada luna y combina las cuatro, con una prueba de chi cuadrado de cuán bien concuerdan. Sin la corrección las cuatro discrepan mucho (chi cuadrado 21 con 3 grados de libertad); lee la media ponderada corregida y el chi cuadrado.',
      fields: [
        { label: 'GM medio ponderado, corregido (millones de km³/s²)' },
        { label: 'Chi cuadrado de las cuatro, corregido' },
      ],
    },
    {
      title: 'Vista casi de canto',
      body: 'Desde la Tierra la línea de visión está 1,37&deg; sobre el plano ecuatorial de Júpiter, que es donde están las órbitas de las lunas. El mayor desplazamiento al norte o al sur de una luna respecto de Júpiter es entonces su radio de órbita por el seno de ese ángulo. Los desplazamientos este-oeste, que ajustaste, son el radio completo. (La luz de Júpiter tarda además de 36 a 38 minutos en llegar a la Tierra aquí, y las imágenes y las efemérides lo tienen en cuenta.)',
      prompt:
        '¿Cuál es el mayor desplazamiento norte-sur de Calisto respecto de Júpiter, en radios de Júpiter?',
      hints: [
        'Su radio es 26,4 radios de Júpiter; multiplica por el seno de 1,37°.',
      ],
      worked:
        '26,4 × sen 1,37° = 26,4 × 0,0239 = 0,63 radios de Júpiter: unos 15 segundos de arco, frente a desplazamientos este-oeste de 600.',
      feedback: {
        close: 'Casi. Radio por sen 1,37°, unos 0,024.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: el desplazamiento es una pequeña fracción del radio.',
        off: '26,4 × sen 1,37°.',
      },
    },
    {
      title: 'El alias, a mano',
      body: 'Una luna a f vueltas al día, muestreada una vez al día, parece una a 1 &minus; f vueltas al día cuando f supera un medio. Ío da 1/1,769 = 0,565 vueltas al día.',
      prompt:
        '¿Qué período, en días, hallaría un observador de una vez por noche para Ío?',
      hints: ['1 − 0,565 = 0,435 vueltas al día; el período es su inversa.'],
      worked:
        '1/(1 − 1/1,769) = 1/0,4347 = 2,30 días: el mismo número que halló el instrumento con las imágenes. Europa, a 0,282 vueltas al día, ya está por debajo de un medio y no tiene alias.',
      feedback: {
        close:
          'Casi. La frecuencia del alias es 1 menos la de Ío; luego invierte.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: la respuesta es algo más de dos días.',
        off: '1 / (1 − 1/1,769).',
      },
    },
    {
      rubric:
        'Crédito completo por decir que los dibujos nocturnos de Galileo de enero de 1610 podían establecer la identificación, que había varios puntos que se quedaban cerca de Júpiter y cambiaban de lado, y por tanto que eran lunas, y por decir que un ritmo nocturno no podía dar el período de Ío de 1,77 días (daría un alias, unos 2,3 días), que necesita imágenes dentro de una misma noche. No dar crédito por decir que los dibujos nocturnos dieron los períodos de las cuatro lunas sin una cautela, ni que no se podía aprender nada de ellos.',
      title: 'Las noches de Galileo',
      body: 'En enero de 1610 Galileo dibujó Júpiter y sus «estrellas» noche tras noche, más o menos una vez por noche, y el día 13 había contado cuatro que se quedaban con el planeta y cambiaban de lado. Un año o más de esas noches dio los períodos de las lunas externas.',
      prompt:
        'En dos o tres frases: ¿qué podían establecer los dibujos de una vez por noche sobre las lunas, y qué no?',
    },
  ],
};

export default {
  'weighing-jupiter': WEIGHING_JUPITER_DEEPER,
};
