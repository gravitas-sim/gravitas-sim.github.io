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

// Anillos y mareas, pasos más profundos (Prompt 204, segunda parte): paso a paso con el inglés.
export const WHY_RINGS_DEEPER = {
  steps: [
    {
      title: 'Hielo alrededor de Saturno',
      body: 'El límite sale de las dos densidades: d = 2,44 R (&rho;<sub>planeta</sub> / &rho;<sub>satélite</sub>)<sup>1/3</sup> para un cuerpo que puede deformarse. Saturno tiene un radio de 60 268 km y una densidad media de 687 kg/m&sup3;, y el hielo ronda los 900 kg/m&sup3;.',
      prompt:
        '¿Cuál es el límite de Roche fluido del hielo alrededor de Saturno, en miles de km?',
      hints: [
        '(687 / 900) a la un tercio es 0,914; multiplica por 2,44 y por 60 268 km.',
      ],
      worked:
        '2,44 × 60 268 × (687/900)^(1/3) = 2,44 × 60 268 × 0,9139 = 134 400 km: 134,4 miles de km. El borde exterior del anillo B está a 117 580 km, dentro de él.',
      feedback: {
        close:
          'Casi. La densidad del satélite va en el denominador, dentro de la raíz cúbica.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: los radios del paso están en kilómetros y esta respuesta, en miles de km.',
        off: '2,44 R (ρ del planeta / ρ del satélite)^(1/3).',
      },
    },
    {
      title: 'Las otras resonancias de Mimas',
      body: 'La resonancia p:q está en a<sub>m</sub> (q/p)<sup>2/3</sup>, con a<sub>m</sub> = 185 540 km para Mimas. La resonancia 3:1, donde una partícula da tres vueltas por cada órbita de Mimas, queda mucho más adentro.',
      prompt:
        '¿Dónde está la resonancia 3:1 de Mimas, en miles de km desde el centro de Saturno?',
      hints: ['(1/3) a las dos terceras es 0,4807.'],
      worked:
        '185 540 × (1/3)^(2/3) = 185 540 × 0,4807 = 89 200 km: 89,2 miles de km.',
      feedback: {
        close: 'Casi. El exponente es 2/3, y la razón es q/p = 1/3.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: es un poco menos de cien mil km.',
        off: 'a (q/p)^(2/3) con q = 1 y p = 3.',
      },
    },
    {
      rubric:
        'Crédito completo por decir que un cuerpo rígido resiste que lo desgarren y uno fluido no, así que el fluido se rompe más lejos; que el límite real de un cuerpo real queda entre los dos; y que el límite depende de las densidades y no del tamaño del satélite. Crédito parcial por una de las tres.',
      title: 'Dos límites para un par',
      body: 'Para Fobos y Marte el límite rígido es 5 466 km y el fluido 10 585 km: casi un factor de dos de diferencia (2,44 frente a 1,26). Fobos orbita a 9 376 km.',
      prompt:
        'En dos o tres frases: ¿por qué hay dos límites, y dónde queda el de una luna real?',
    },
  ],
};

export const TIDES_DEEPER = {
  steps: [
    {
      title: 'Cuánto tarda en bloquearse la Luna',
      body: 'El mismo par que mueve a la Luna frena el giro propio de la Luna: la marea de la Tierra sobre la Luna. El tiempo para quitar un giro &omega; es t = I&omega;/N, con I = &alpha; m R&sup2; el momento de inercia de la Luna (&alpha; = 0,393) y N = (3/2)(k2/Q) G M&sup2; R&sup5; / a&sup6; el par. Para la Luna (k2 = 0,024, Q = 100, radio 1 737,4 km) a 384 400 km, desde un giro de una vuelta en diez horas, el núcleo de cálculo da el tiempo de abajo.',
      prompt:
        '¿Cuál es el tiempo para bloquear la Luna, en unidades de 10⁸ años?',
      hints: [
        'El par cae como a⁻⁶: a la distancia de la Luna es pequeño, pero el giro de la Luna también lo es.',
      ],
      worked:
        'N = 1,5 × (0,024/100) × G M² R⁵/a⁶ = 4,2 × 10¹⁵ N m e I ω = 0,393 × 7,342 × 10²² × (1,7374 × 10⁶)² × 1,745 × 10⁻⁴ = 1,52 × 10³¹, así que t = 3,6 × 10¹⁵ s = 1,15 × 10⁸ años: muy por debajo de la edad de la Luna, de acuerdo con que la Luna esté bloqueada.',
      feedback: {
        close: 'Casi. Divide el momento angular del giro entre el par.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: son cien millones de años, no mil millones ni un millón.',
        off: 't = I ω / N.',
      },
    },
    {
      rubric:
        'Crédito completo por decir que la Q del modelo es un solo número y que la disipación de marea real de la Tierra depende de los océanos (su profundidad, la forma de las cuencas, que han cambiado con la deriva continental) y por tanto del tiempo; que corrido hacia atrás con la Q actual la Luna está en contacto hace 1,58 miles de millones de años, cosa que la edad de la Luna contradice; y que eso significa que el ritmo de alejamiento en el pasado fue menor, no que el ritmo actual del modelo sea erróneo. Crédito parcial por dos.',
      title: 'Una Q que cambia',
      body: 'Corrido hacia atrás con Q = 12, el modelo pone a la Luna en contacto con la Tierra hace 1,58 miles de millones de años. La Luna tiene unos 4,5 miles de millones de años.',
      prompt:
        'En dos o tres frases: ¿qué dice eso de Q, y del ritmo de alejamiento de la Luna en el pasado?',
    },
  ],
};

export const IOS_DEEPER = {
  steps: [
    {
      title: 'A qué distancia del k2/Q máximo',
      body: 'El modelo admite k2/Q hasta 0,3 (k2 = 1,5 entre Q = 5). El k2/Q que necesita el valor medio del calor observado es el número que leíste.',
      prompt:
        '¿Cuántas veces menor es el k2/Q necesario que el máximo del modelo?',
      hints: ['Divide 0,3 entre el k2/Q que leíste.'],
      worked:
        '0,3 / 0,01768 = 17,0: el calor observado necesita un k2/Q diecisiete veces por debajo del máximo del modelo, con holgura dentro del intervalo.',
      feedback: {
        close: 'Casi. El número mayor va arriba.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: es cerca de diecisiete.',
        off: '0,3 dividido entre el k2/Q necesario.',
      },
    },
    {
      rubric:
        'Crédito completo por decir que la fórmula toma k2 y Q como números dados para todo el cuerpo mientras el interior de Ío es por capas y puede estar parcialmente fundido, así que k2 y Q no se conocen y el calor es una cota; que es de primer orden en la excentricidad; y que necesita una razón para que la órbita siga excéntrica (la resonancia con Europa y Ganímedes), porque el calentamiento de marea también circulariza la órbita. Crédito parcial por dos.',
      title: 'Lo que la fórmula deja fuera',
      body: 'La fórmula da el calor de Ío como 21/2 &times; (k2/Q) G M&sup2; n R&sup5; e&sup2; / a&sup6;. Necesita tres cosas que no proporciona.',
      prompt:
        'En dos o tres frases: ¿qué toma como dado la fórmula, y qué mantiene excéntrica la órbita de Ío?',
    },
  ],
};

export default {
  'weighing-jupiter': WEIGHING_JUPITER_DEEPER,
  'why-rings': WHY_RINGS_DEEPER,
  'tides-that-move-the-moon': TIDES_DEEPER,
  'ios-fire': IOS_DEEPER,
};
