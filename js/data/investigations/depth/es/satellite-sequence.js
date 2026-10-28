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
      body: 'El límite sale de las dos densidades: d = 2,44 R (ρ<sub>planeta</sub> / ρ<sub>satélite</sub>)<sup>1/3</sup> para un cuerpo que puede deformarse. Saturno tiene un radio de 60 268 km y una densidad media de 687 kg/m&sup3;, y el hielo ronda los 900 kg/m&sup3;.',
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
      body: 'El mismo par que mueve a la Luna frena el giro propio de la Luna: la marea de la Tierra sobre la Luna. El tiempo para quitar un giro ω es t = Iω/N, con I = α m R&sup2; el momento de inercia de la Luna (α = 0,393) y N = (3/2)(k2/Q) G M&sup2; R&sup5; / a&sup6; el par. Para la Luna (k2 = 0,024, Q = 100, radio 1 737,4 km) a 384 400 km, desde un giro de una vuelta en diez horas, el núcleo de cálculo da el tiempo de abajo.',
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

// Los huecos del cinturón, pasos más profundos: paso a paso con el inglés (Prompt 198, parte 3).
export const THE_GAPS_IN_THE_BELT_DEEPER = {
  steps: [
    {
      title: 'Otra ventana',
      body: 'Pon el ancho de la ventana 3:1 en 2, el doble (0,05 UA a cada lado). Lee cuántos objetos contiene y el vaciamiento.',
      fields: [
        { label: 'Encontrados en la ventana' },
        { label: 'El vaciamiento (por ciento)' },
      ],
    },
    {
      title: 'Solo los más brillantes',
      body: 'Vuelve a poner el ancho en 1 y el límite de H en 11: solo los 2 537 objetos más brillantes del catálogo, 1 118 de ellos en el intervalo de la figura. Lee el recuento de la ventana 3:1, su vaciamiento y el extremo bajo del intervalo.',
      fields: [
        { label: 'Encontrados en la ventana' },
        { label: 'El vaciamiento (por ciento)' },
        { label: 'Extremo bajo del intervalo del 95 por ciento (por ciento)' },
      ],
    },
    {
      title: 'Dos ventanas que el instrumento no da por resueltas',
      body: 'Elige la ventana 7:3 y luego la 2:1. Ambas muestran vaciamientos profundos, del 84 y el 89 por ciento, y el instrumento se niega a dar ninguna por resuelta.',
      prompt: '¿Por qué?',
      options: [
        'El recuento difiere mucho a los dos lados de cada ventana (152 frente a 645 objetos a cada lado de 7:3, 1 045 frente a 73 a cada lado de 2:1), así que una curva suave a través de la ventana no la describe y el vaciamiento no se distingue de la pendiente',
        'Las ventanas contienen muy pocos objetos para hacer un intervalo',
        'Porque no son huecos de verdad',
        'Porque las resonancias 7:3 y 2:1 de Júpiter son más débiles que la 3:1',
      ],
      misconceptions: [
        {
          say: 'La línea base espera 354 y 487 objetos allí, de sobra para un intervalo. Lo que falla es el supuesto de que una curva suave describe el cinturón a través de la ventana.',
        },
        {
          say: 'Nada aquí dice que los huecos no existan. Dice que esta medición no puede decir cuán profundos son, porque la línea base no es fiable a través de la ventana; el hueco y su medición son cosas distintas.',
        },
        {
          say: 'El instrumento no dice nada de la fuerza de una resonancia. Mira solo la forma de los recuentos alrededor de la ventana.',
        },
      ],
      hints: [
        'Mira los recuentos de los flancos: ¿qué tendría que hacer una línea base suave entre ellos?',
      ],
      because:
        'La densidad del cinturón cambia en un factor grande de un lado a otro de cada ventana, así que el vaciamiento no puede separarse de la pendiente de la línea base. El instrumento informa &ldquo;no resuelto&rdquo; y dice por qué, en lugar de una profundidad que parezca tan segura como la de 3:1. No se demuestra que la profundidad sea cero; se demuestra que este método no puede medirla.',
    },
    {
      title: 'Hildas y troyanos',
      body: 'Activa &ldquo;Mostrar el recuento por clases de órbita&rdquo;. Las hildas (cerca de 3,97 UA, la resonancia 3:2) y los troyanos de Júpiter (a 5,20 UA, la 1:1) se cuentan con una caja en semieje mayor, excentricidad e inclinación: una regla de clase, no una prueba de que la órbita esté en resonancia. Lee ambos recuentos.',
      fields: [{ label: 'Hildas' }, { label: 'Troyanos de Júpiter' }],
    },
    {
      title: 'Lo que conserva un sondeo',
      body: 'Activa &ldquo;Mostrar lo que conserva un sondeo&rdquo;. Un sondeo con una sola magnitud límite encuentra con más completitud los cuerpos cercanos, porque el brillo en oposición cae con la distancia. Es un modelo con una pendiente declarada, no una corrección del catálogo. Lee cuántas veces más completamente se encuentra un cuerpo a 2,0 UA que uno a 3,5 UA, y la media de a que mostraría un cinturón uniforme en a.',
      fields: [
        { label: 'Encontrado a 2,0 UA frente a 3,5 UA' },
        { label: 'La media de a de lo encontrado (UA)' },
      ],
    },
    {
      title: 'La línea base es una elección',
      body: 'La línea base es un polinomio en el logaritmo del recuento; el grado por defecto es 4. Pon el grado en 3 y lee el vaciamiento de 3:1, luego ponlo en 6 y léelo otra vez.',
      fields: [
        { label: 'El vaciamiento con grado 3 (por ciento)' },
        { label: 'El vaciamiento con grado 6 (por ciento)' },
      ],
    },
    {
      title: '¿Qué dice el 88 por ciento de Júpiter?',
      body: 'La ventana 3:1 está vaciada en un 88 por ciento.',
      prompt: '¿Qué dice ese número?',
      options: [
        'Que el catálogo encuentra un 88 por ciento menos de objetos grandes en la ventana que los que daría una curva suave ajustada fuera; cuántos cuerpos quitó Júpiter, y en cuánto tiempo, es una pregunta para cálculos de órbitas que un histograma no puede responder',
        'Que Júpiter quitó el 88 por ciento de los asteroides que alguna vez estuvieron en la ventana',
        'Que la ventana está un 88 por ciento vacía de asteroides de todos los tamaños',
        'Que el mismo vaciamiento vale para objetos de todos los tamaños',
      ],
      misconceptions: [
        {
          say: 'El histograma no sabe qué hubo antes. La línea base es una curva suave ajustada a lo que se encuentra fuera de las ventanas, no un registro del pasado del cinturón.',
        },
        {
          say: 'El catálogo conserva solo H menor que 13, los cuerpos grandes. Nada aquí dice qué hacen los pequeños.',
        },
        {
          say: 'La profundidad de 3:1 en los 1 118 objetos más brillantes es 83,8 por ciento y en todo el catálogo 88,0, dentro del intervalo, pero eso es una prueba con un intervalo ancho, no un resultado sobre todos los tamaños.',
        },
      ],
      hints: [
        '¿De qué está hecha la línea base, y contra qué se mide el vaciamiento?',
      ],
      because:
        'El vaciamiento es una afirmación medida sobre este catálogo contra una línea base suave declarada. Que la línea base sea lo que sería el cinturón sin Júpiter es un modelo, y que el hueco se despejara como imaginas es una pregunta dinámica; el intervalo cubre solo el error de muestreo.',
    },
    {
      title: '¿Qué promete &ldquo;resuelto&rdquo;?',
      body: 'Pon el límite de H en 9: los 304 objetos más brillantes entre 2,0 y 3,5 UA. La ventana 3:1 contiene 1 donde se esperan 17, un vaciamiento del 94 por ciento con un intervalo del 80 al 100 por ciento, y el instrumento lo da por resuelto.',
      prompt: '¿Qué promete &ldquo;resuelto&rdquo; aquí?',
      options: [
        'Solo que el intervalo queda por encima de cero: la ventana está vaciada, pero cuánto se conoce con unos veinte puntos de margen',
        'Que la profundidad se conoce al uno por ciento',
        'Que el vaciamiento verdadero es del 94 por ciento',
        'Que la línea base es correcta',
      ],
      misconceptions: [
        {
          say: 'Un intervalo del 80 al 100 por ciento no es una profundidad conocida al uno por ciento. &ldquo;Resuelto&rdquo; es un veredicto sobre el extremo inferior del intervalo, y el intervalo es tan ancho como permiten los datos.',
        },
        {
          say: 'El 94 por ciento es la estimación puntual de un objeto encontrado donde se esperaban 17; uno más o uno menos la mueve seis puntos.',
        },
        {
          say: '&ldquo;Resuelto&rdquo; no dice nada de la línea base más allá de las advertencias que el instrumento también comprueba; el paso anterior mostró que otro grado mueve una profundidad varios puntos.',
        },
      ],
      hints: ['¿Cuál es el intervalo, y qué excluye?'],
      because:
        'La regla es que el extremo bajo del intervalo esté por encima de cero y no se aplique ninguna advertencia. Con 304 objetos el intervalo abarca unos veinte puntos. &ldquo;Resuelto&rdquo; es un piso de lo que puedes decir, no una afirmación de precisión, y un veredicto debe leerse siempre junto al intervalo.',
    },
  ],
};

// ¿Qué tan rápido gira?, pasos más profundos: paso a paso con el inglés (Prompt 198, parte 3).
export const HOW_FAST_DOES_IT_SPIN_DEEPER = {
  steps: [
    {
      title: 'Solo una noche',
      body: 'Pon el número de noches en 1: 40 medidas en una noche de 7 horas. Lee el periodo de rotación y su incertidumbre.',
      fields: [
        { label: 'El periodo de rotación (horas)' },
        { label: 'Su incertidumbre (horas)' },
      ],
    },
    {
      title: 'El error es un piso',
      body: 'Elige el objetivo B (de nuevo cinco noches). Lee su periodo de rotación y la incertidumbre que da el instrumento, luego activa &ldquo;Mostrar la verdad&rdquo; y compara.',
      fields: [
        { label: 'El periodo de rotación (horas)' },
        { label: 'Su incertidumbre (horas)' },
      ],
    },
    {
      title: 'Un cuerpo casi redondo',
      body: 'El objetivo B es casi redondo. Lee su amplitud y la cota de a/b que da.',
      fields: [{ label: 'La amplitud (mag)' }, { label: 'a/b es al menos' }],
    },
    {
      title: 'Una noche de un rotador lento',
      body: 'Elige el objetivo B con una noche. Su rotación dura 11,4 horas y la noche dura 7. El instrumento da un periodo de 16,6 &plusmn; 9,3 h y, para la amplitud, la palabra &ldquo;retenida&rdquo;.',
      prompt: '¿Por qué se retiene la amplitud?',
      options: [
        'Cerca de 0,60 del giro nunca se observó, así que la curva ajustada allí es una conjetura, y una amplitud leída de ella también lo sería',
        'El ruido es demasiado grande para cualquier amplitud',
        'Un cuerpo casi redondo no tiene amplitud',
        'El instrumento ha fallado',
      ],
      misconceptions: [
        {
          say: 'El ruido es el mismo 0,01 mag que con cinco noches, cuando la amplitud se lee sin dificultad. Lo que cambia es cuánto del giro se vio.',
        },
        {
          say: 'El cuerpo tiene una amplitud de 0,103 mag, como muestran cinco noches. Una noche simplemente no cubre bastante del giro para medirla.',
        },
        {
          say: 'Retener es el instrumento funcionando: prefiere no decir nada antes que devolver un número que no puede respaldar.',
        },
      ],
      hints: ['¿Cuánto del giro cubren 7 horas de 11,4?'],
      because:
        'El hueco en la fase plegada, el tramo más largo del giro nunca observado, es 0,60 de la rotación, por encima del límite de 0,35 que admite el instrumento. El periodo de una noche no es mejor, 16,6 ± 9,3 h frente a una verdad de 11,4: una rotación más lenta que la duración de la noche no puede medirse con una sola noche.',
    },
    {
      title: 'Un punto por noche',
      body: 'Pon el muestreo en un punto por noche: 40 noches, a una hora algo distinta cada noche. Lee los dos periodos en competencia que enumera el instrumento.',
      fields: [
        { label: 'El primer periodo (horas)' },
        { label: 'El segundo periodo (horas)' },
      ],
    },
    {
      title: 'Un periodo que no se encuentra',
      body: 'Elige el objetivo C con un punto por noche. La simulación rota cada 8,0 horas y varía 0,315 mag, pero el veredicto es &ldquo;no periódica&rdquo;.',
      prompt: '¿Qué dice ese veredicto?',
      options: [
        'Que este muestreo no puede mostrar un periodo: es un veredicto sobre los datos, no sobre el asteroide. Una rotación de 8 horas cabe tres veces en un día, así que cada noche encuentra al asteroide casi en la misma fase',
        'Que el objetivo C no rota',
        'Que rota pero es redondo',
        'Que el instrumento está roto',
      ],
      misconceptions: [
        {
          say: 'El mismo objetivo con cinco noches densas da unas limpias 8,002 h. No encontrar un periodo es una afirmación sobre lo que se observó.',
        },
        {
          say: 'Su amplitud es 0,315 mag, como muestran las noches densas. Un cuerpo redondo sería una línea plana con cualquier muestreo.',
        },
        {
          say: 'El instrumento dice que el pico más fuerte podría ser ruido: su probabilidad de falsa alarma es 0,33. Decirlo es lo correcto.',
        },
      ],
      hints: ['¿Cuántas vueltas da el asteroide en 24 horas?'],
      because:
        'Un periodo que divide un día, muestreado una vez por noche, se ve en la misma fase cada vez, así que la luz parece constante. El muestreo denso lo revela. &ldquo;No periódica&rdquo; es el veredicto del muestreo, que ninguna cantidad de mirar los mismos datos puede revocar.',
    },
    {
      title: 'Un pico sin nada detrás',
      body: 'Elige el objetivo D: un punto que no varía en absoluto. El periodograma sigue teniendo un pico más alto, en 4,09 horas con una potencia de 0,06, y el instrumento no informa ningún periodo.',
      prompt: '¿Por qué?',
      options: [
        'Siempre existe un pico más alto. Su probabilidad de falsa alarma, 0,26, dice que el ruido solo da un pico así de alto cerca de una cuarta parte de las veces, así que no es una detección',
        'El pico es demasiado pequeño para verse',
        'Un cuerpo redondo tiene un periodo infinito',
        'El instrumento necesita más noches',
      ],
      misconceptions: [
        {
          say: 'Si un pico es &ldquo;pequeño&rdquo; no es la cuestión; la cuestión es si el ruido daría uno así de alto. Esa probabilidad es la que calcula el instrumento.',
        },
        {
          say: 'Un cuerpo redondo no varía, así que no se puede medir ningún periodo; no tiene uno infinito.',
        },
        {
          say: 'Más noches no ayudarían: no hay señal que encontrar.',
        },
      ],
      hints: ['¿Sería cero el más alto de muchos picos con ruido?'],
      because:
        'El pico más fuerte del periodograma es el más fuerte de cientos de periodos de prueba, y hasta el ruido puro tiene uno. La probabilidad de falsa alarma pregunta con qué frecuencia el ruido alcanzaría esa potencia; con 0,26 no es inusual, y el instrumento se niega a dar un periodo.',
    },
    {
      title: '¿Seis horas o tres?',
      body: 'El pico más fuerte está en 3,10 h y el instrumento da el periodo de rotación como el doble, 6,20 h. La fila de debajo da la otra lectura: 3,10 h, si la curva tiene un máximo por rotación.',
      prompt: '¿Qué decide entre 6,20 h y 3,10 h?',
      options: [
        'El supuesto de que el cuerpo es convexo y más o menos un elipsoide, con dos máximos por vuelta; esta curva de luz no puede demostrarlo, y por eso se enumeran ambos',
        'El periodograma: su pico más fuerte está en 3,10 h, así que la rotación es de 3,10 h',
        'El nivel de ruido',
        'Nada: la respuesta es siempre el doble del pico',
      ],
      misconceptions: [
        {
          say: 'El pico es el periodo de la luz. El periodo de rotación es igual a él solo si el cuerpo muestra un máximo por vuelta.',
        },
        {
          say: 'El ruido cambia el error, no el factor de dos entre las lecturas.',
        },
        {
          say: 'El doble es lo que da un elipsoide. Una mancha de albedo, o una forma muy distinta de un elipsoide, puede dar un máximo por vuelta, y entonces la rotación es el periodo de la luz.',
        },
      ],
      hints: ['¿Qué forma supuso el modelo?'],
      because:
        'El factor de dos es un supuesto sobre la forma, la regla de los dos máximos, y el instrumento declara la otra lectura junto a la primera por eso. La evidencia que lo decide viene de otra parte: curvas vistas con otras geometrías, o las dos mitades del pliegue siendo distintas.',
    },
  ],
};

export default {
  'weighing-jupiter': WEIGHING_JUPITER_DEEPER,
  'why-rings': WHY_RINGS_DEEPER,
  'tides-that-move-the-moon': TIDES_DEEPER,
  'ios-fire': IOS_DEEPER,
  'the-gaps-in-the-belt': THE_GAPS_IN_THE_BELT_DEEPER,
  'how-fast-does-it-spin': HOW_FAST_DOES_IT_SPIN_DEEPER,
};
