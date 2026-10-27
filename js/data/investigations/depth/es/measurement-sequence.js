// Las investigaciones de medición y afirmación, más a fondo: las palabras en español, paso a paso con ../measurement-sequence.js (D-R10-67).
// Sin lectura por una persona que lea español con fluidez.

export const WHAT_IS_A_MEASUREMENT_DEEPER = {
  steps: [
    {
      title: 'La posición con su barra de error',
      body: 'Un resultado se informa como un valor, luego ±, luego su incertidumbre. Informa la posición x media de las cinco marcas con su error estándar, a partir de las dos filas que ya has leído.\n\nCuenta como correcto cuando el intervalo que das se solapa con el que permiten las marcas, y no es más ancho que unos pocos errores estándar, porque una incertidumbre tan grande que se solapa con cualquier cosa no ha dicho nada a nadie.',
      prompt: 'La posición x media, con su incertidumbre',
      placeholder: 'p. ej. 12,3 ± 0,4',
      hints: ['Escribe la media, luego ±, luego el error estándar de x.'],
      because:
        'La media es 31,10 píxeles y su error estándar 0,36, así que la posición es 31,10 ± 0,36 píxeles: un intervalo que queda alrededor de las marcas y, como muestran los pasos siguientes, alrededor de la verdad.',
    },
    {
      title: '¿Cuántas marcas para una décima de píxel?',
      body: 'Una marca de esta estrella se dispersa unos 0,8&nbsp;píxeles. El error estándar es la dispersión entre la raíz cuadrada del número de marcas, N. Quieres que el error estándar sea 0,1&nbsp;píxeles.',
      prompt: 'El número de marcas necesarias',
      hints: ['Despeja N en 0,1 = 0,8 ÷ √N.', 'N = (0,8 ÷ 0,1)².'],
      worked:
        'N = (0,8 ÷ 0,1)² = 8² = 64 marcas. Pasar de 5 marcas a 64 compra un error estándar de una décima de píxel, y el coste crece como el cuadrado de la precisión que se quiere.',
      feedback: {
        close:
          'Casi. Eleva al cuadrado el cociente entre la dispersión y el error estándar deseado.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez. Recuerda que el error estándar solo baja como la raíz cuadrada de N.',
        off: 'N = (dispersión ÷ error estándar deseado)², con 0,8 y 0,1.',
      },
    },
    {
      title: 'Lo que más marcas no pueden arreglar',
      body: 'Un instrumento nuevo coloca cada marca <strong>1,0 píxel</strong> demasiado a la derecha: la cruz queda donde está el punto activo del cursor, y nadie lo ha comprobado. Pon <strong>Desplazamiento de cada marca</strong> en 1,0, toma 30 marcas y muestra la verdad. Lee el error estándar de x y el error de la media en errores estándar.',
      fields: [
        { label: 'Error estándar de x, 30 marcas' },
        { label: 'Error de la media en errores estándar' },
      ],
    },
    {
      title: 'De qué es una declaración el más-menos',
      body: 'Un informe declara la posición x de la estrella como 32,27 ± 0,14 píxeles, a partir de 30 marcas.',
      prompt: '¿Qué describe el ± 0,14?',
      options: [
        'Cómo se dispersaría la media de estas marcas si el marcado se repitiera, suponiendo que las marcas se dispersan al azar alrededor de un centro',
        'Cuán lejos está la media de la posición verdadera',
        'Cuán bien está calibrado el instrumento',
        'El tamaño de todos los errores de la medición, aleatorios y sistemáticos juntos',
      ],
      misconceptions: [
        {
          say: 'El error estándar cuenta la dispersión de las marcas. Un desplazamiento igual en todas las marcas no es dispersión, así que no está en él, por muchas marcas que se hagan.',
        },
      ],
      hints: ['¿Qué tipo de error reduce tomar más marcas?'],
      because:
        'La dispersión de la media bajo repetición, con un supuesto sobre las marcas. Un desplazamiento sistemático, igual en todas las marcas, queda fuera, y también cualquier cosa que las marcas compartan. Declarar las dos cosas, la parte aleatoria y lo que se hizo para comprobar la sistemática, es la afirmación completa.',
    },
  ],
};

export const WHAT_DOES_PLUS_MINUS_CLAIM_DEEPER = {
  steps: [
    {
      title: 'La cuenta también es incierta',
      body: 'La cobertura se contó con un número finito de repeticiones, así que tiene una incertidumbre propia. Pon <strong>Repeticiones</strong> en 100 y el intervalo en ±1 σ. Lee la cobertura y su propia incertidumbre.',
      fields: [
        { label: 'Cobertura' },
        { label: 'Incertidumbre de la cobertura' },
      ],
    },
    {
      title: 'La incertidumbre de una cobertura, a mano',
      body: 'Cada repetición contiene la verdad o no, con probabilidad p. Para R repeticiones la parte que la contiene tiene una desviación estándar √(p(1 − p) ÷ R). Toma p = 0,68 y R = 2000.',
      prompt: 'La incertidumbre de la parte, en por ciento',
      hints: [
        'Calcula primero 0,68 × 0,32, divide entre 2000, saca la raíz cuadrada y exprésalo en por ciento.',
      ],
      worked:
        '0,68 × 0,32 = 0,2176; dividido entre 2000 es 0,0001088; la raíz cuadrada es 0,01043, que es 1,04 por ciento. Con 2000 repeticiones una cobertura es buena hasta un punto porcentual más o menos.',
      feedback: {
        close: 'Casi. Saca la raíz cuadrada al final.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez. Da la respuesta en por ciento, y divide entre R antes de la raíz cuadrada.',
        off: 'La dispersión es la raíz cuadrada de p por la probabilidad de fallar, dividida entre R.',
      },
    },
    {
      title: 'La cobertura sesgada, a mano',
      body: 'Cada lectura es la verdad más 0,4 más un error aleatorio de dispersión 0,3. Un intervalo de ±0,3 contiene la verdad cuando ese error aleatorio queda entre −0,7 y −0,1 respecto del centro, es decir entre −2,33 y −0,33 dispersiones. La curva normal tiene 0,0099 de su área por debajo de −2,33 y 0,3707 por debajo de −0,33.',
      prompt:
        'La parte de los intervalos que contienen la verdad, en por ciento',
      hints: ['Resta el área menor de la mayor y exprésalo en por ciento.'],
      worked:
        '0,3707 − 0,0099 = 0,3608, 36,1 por ciento. El conjunto da 36,3, dentro de lo que permiten 2000 repeticiones. Una afirmación de dos de cada tres, cumplida algo más de una vez de cada tres.',
      feedback: {
        close: 'Casi. Resta las dos áreas.',
        off: 'Parte = área por debajo de −0,33 menos área por debajo de −2,33.',
      },
    },
    {
      title: 'El límite a partir de una cuenta de cero',
      body: 'Un experimento no ve ningún suceso. El límite superior del 95 por ciento para la tasa es la tasa λ con la que no ver ninguno tiene solo un 5 por ciento de probabilidad. La probabilidad de no ver ninguno, cuando la media es λ, es e<sup>−λ</sup>.',
      prompt: 'El límite superior del 95 por ciento para la tasa, en sucesos',
      hints: [
        'Despeja λ en e elevado a −λ igual a 0,05, con un logaritmo natural.',
      ],
      worked:
        'λ = −ln(0,05) = 2,996, cerca de 3. Así que una cuenta de cero dice que la tasa está por debajo de unos tres sucesos al 95 por ciento, y por eso «no ver nada» es un límite y no cero.',
      feedback: {
        close: 'Casi. Usa el logaritmo natural, y un signo menos.',
        off: 'λ = −ln(0,05).',
      },
    },
    {
      title: 'Lo que esta comprobación no puede hacer',
      body: 'En este instrumento se conocía el valor verdadero, y la cobertura era una cuenta.',
      prompt:
        '¿Por qué no se puede contar así la cobertura de una medición real?',
      options: [
        'No se conoce la verdad, así que la afirmación solo se puede comprobar contra repeticiones, una calibración o un método independiente',
        'Las mediciones reales no tienen incertidumbre declarada',
        'Los instrumentos reales nunca tienen sesgo',
        'Una cobertura real es siempre exactamente la declarada',
      ],
      hints: ['¿Qué necesitaba la cuenta que una estrella real no da?'],
      because:
        'La cuenta necesitaba la verdad. Una afirmación real se comprueba contra repeticiones de la medición, contra una fuente de calibración de valor conocido o contra un método independiente, y cada una de esas es una comprobación de una sola cosa. Esta investigación muestra qué es una comprobación, y una real rara vez es tan completa.',
    },
    {
      title: 'Por qué un límite superior no alcanza su nivel',
      body: 'Con una tasa verdadera de 3,0 los límites cumplieron el 95,6 por ciento, y con 4,0 cumplieron el 98,7. Las cuentas de sucesos son números enteros.',
      prompt: '¿Qué muestra el salto entre las dos coberturas?',
      options: [
        'Una cuenta solo puede tomar valores enteros, así que el límite toma pocos valores discretos y la cobertura no se puede ajustar a exactamente 95 por ciento; es al menos 95 por construcción',
        'El instrumento está averiado con una tasa de 4,0',
        'Las 2000 repeticiones son demasiado pocas para medir cualquier cobertura',
        'Un límite superior no tiene cobertura',
      ],
      hints: ['¿Cuántos límites distintos puede producir una cuenta?'],
      because:
        'El límite es una función escalonada de la cuenta, así que la cobertura es una escalera en la tasa, nunca por debajo de 95 y tocándolo solo en los escalones. Una afirmación conservadora es legítima; una afirmación de exactamente 95 por ciento necesitaría un procedimiento aleatorizado.',
    },
  ],
};

export const WHEN_THE_METHOD_MUST_REFUSE_DEEPER = {
  steps: [
    {
      title: 'La cota del 95 por ciento, a mano',
      body: 'Para masas por debajo del producto el mejor ajuste tiene la inclinación en su límite de 1, así que el chi cuadrado es ((m − 0,85) ÷ 0,06)². El intervalo del 95 por ciento es donde el chi cuadrado ha subido 3,84, que son 1,96 errores estándar.',
      prompt:
        'La masa más pequeña dentro de un intervalo del 95 por ciento, en masas de Júpiter',
      hints: ['Resta al producto 1,96 veces el error del producto.'],
      worked:
        '0,85 − 1,96 × 0,06 = 0,85 − 0,1176 = 0,732 masas de Júpiter. El instrumento lee lo mismo. Sigue sin haber cota superior, sea cual sea el nivel de confianza.',
      feedback: {
        close: 'Casi. La cota queda por debajo del producto, no por encima.',
        off: 'm = 0,85 − 1,96 × 0,06.',
      },
    },
    {
      title: 'Los grados de libertad de la recta',
      body: 'El chi cuadrado reducido es el chi cuadrado dividido entre el número de grados de libertad: el número de puntos menos el número de parámetros ajustados. La recta tiene dos parámetros, una ordenada y una pendiente, y hay seis puntos.',
      prompt: 'Los grados de libertad',
      hints: ['Seis puntos, dos parámetros ajustados.'],
      worked:
        'Seis puntos menos dos parámetros son cuatro. Con cuatro grados de libertad el chi cuadrado de un modelo que ajusta es de unos 4, y el 30,5 que da la recta es casi ocho veces eso.',
      feedback: {
        close: 'Casi. Cuenta los puntos y resta los parámetros ajustados.',
        off: 'Grados de libertad = puntos − parámetros.',
      },
    },
    {
      title: 'Lo que añadiría un a priori sobre la inclinación',
      body: 'Un análisis distinto supone que las órbitas están inclinadas al azar, sin dirección preferida, e informa una masa mediana con un intervalo.',
      prompt: '¿Qué lleva ese número que el perfil no lleva?',
      options: [
        'Un supuesto sobre la inclinación, que los datos no contienen: el intervalo es en parte del a priori, y debería informarse nombrando el a priori',
        'Más información de los datos sobre la inclinación',
        'Una incertidumbre menor, que siempre es mejor',
        'Una forma de medir la masa sin el producto',
      ],
      misconceptions: [
        {
          say: 'Los datos fijan el producto y nada más. Lo que aporte el a priori de la inclinación es del a priori, y otro a priori da otro intervalo con los mismos datos.',
        },
      ],
      hints: [
        'Los datos fijan solo el producto. ¿De dónde sale el resto del intervalo?',
      ],
      because:
        'De un supuesto. Un a priori puede ser razonable, y con inclinaciones al azar da un intervalo definido, pero entonces el intervalo responde «dado este supuesto». El perfil mantiene separadas las dos cosas: lo que fijan los datos, y lo que se supone.',
    },
    {
      title: 'Lo que un modelo que ajusta no demuestra',
      body: 'La parábola tiene un chi cuadrado reducido inferior a 1 y un valor p cercano a 0,8, con seis puntos.',
      prompt: '¿Qué se puede decir de la parábola?',
      options: [
        'Describe estos seis puntos dentro de sus errores; no está demostrado que sea la curva verdadera, y seis puntos no pueden descartar otras con tantos parámetros',
        'Es la curva verdadera, porque el valor p es alto',
        'Es seguro que está mal, porque un valor p alto es sospechoso',
        'Sus coeficientes se miden exactamente',
      ],
      hints: [
        '¿Qué deja abierto un modelo de tres parámetros ajustado a seis puntos?',
      ],
      because:
        'No se rechaza. Un modelo que ajusta es uno que los datos no pueden rechazar, lo que es más débil que uno que los datos apoyan frente a toda alternativa. Si más términos, otras formas o una razón física de la curva ajustan igual de bien es la pregunta siguiente, y el chi cuadrado reducido no puede responderla.',
    },
  ],
};

/** By lesson id: what instructorLocale.js registers. */

// Las investigaciones de imágenes, más a fondo (Prompt 191): las palabras en español, paso a paso con el inglés.
export const MEASURING_THE_MOON_DEEPER = {
  steps: [
    {
      title: 'Un píxel en cada extremo',
      body: 'Supón que los dos extremos del diámetro del círculo están un píxel demasiado afuera, el peor caso de una colocación descuidada. Un píxel es la escala que leíste, 7,05 km.',
      prompt: '¿Cuánto cambia el diámetro, en kilómetros?',
      hints: ['Dos extremos, un píxel cada uno: ¿cuántos píxeles son?'],
      worked:
        'Dos píxeles, 2 × 7,05 = 14,1 km. Los 6 km de la propia herramienta son menos que este peor caso porque una colocación se redondea a un píxel, un paso de 0,29 píxeles, y no se desvía un píxel entero.',
      feedback: {
        close: 'Casi. Dos extremos, un píxel cada uno, por la escala.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: dos píxeles de unos 7 km cada uno.',
        off: '2 píxeles × 7,05 km por píxel.',
      },
    },
    {
      title: 'El diámetro con su barra de error',
      body: 'Informa el diámetro de la llanura oscura como un valor, luego &plusmn;, luego una incertidumbre que puedas defender. Una persona cuidadosa coloca el borde suave de esta llanura con unos tres píxeles de margen a cada lado, que son 21 km. Cuenta como correcto cuando el intervalo que das se solapa con el que permite la llanura, y no es más ancho que 60 km.',
      prompt: 'El diámetro, con su incertidumbre',
      placeholder: 'p. ej. 600 ± 30',
      hints: [
        'Escribe el diámetro, luego ±, luego una incertidumbre que incluya cuán bien se puede colocar el borde.',
      ],
      because:
        'Unos 634 km, con 20 a 40 de más o de menos: los 6 km que indica la herramienta son el redondeo de las marcas y son demasiado pequeños para ser toda la incertidumbre, porque el borde de la llanura es suave. Una barra de error defendible incluye lo que la indicada deja fuera.',
    },
    {
      title: 'El mismo círculo cerca del limbo',
      body: 'Un cráter redondo cerca del borde del disco se ve de soslayo, así que queda apretado en la dirección hacia el centro. Mueve el círculo a <strong>x = 470, y = 245</strong>, cerca del borde derecho, con el par a través del disco. Lee a qué distancia del centro del disco está el círculo, en radios del disco, y qué ancho parece tener allí un accidente redondo en esa dirección, como parte de su ancho verdadero.',
      fields: [
        { label: 'Distancia al centro del disco, en radios del disco' },
        { label: 'Ancho en esa dirección' },
      ],
    },
    {
      title: 'Lo que dice un nivel de gris',
      body: 'La llanura oscura es más oscura en la imagen que la tierra alta brillante a su lado. Un estudiante escribe que la llanura refleja alrededor de un tercio de la luz.',
      prompt: '¿Qué falla en la afirmación?',
      options: [
        'Nada: píxeles más oscuros significan menos luz',
        'Los niveles de gris son valores realzados para mostrar y no llevan registro de la luz, así que la imagen puede decir cuán grande es la llanura y no cuán brillante',
        'La Luna no tiene llanuras oscuras',
        'La imagen es demasiado pequeña para ver el brillo',
      ],
      misconceptions: [
        {
          say: 'En una imagen estirada y realzada un nivel de gris es lo que la transformación lo hizo. El Observatorio marca la imagen como solo para mostrar y no da fotometría por esa razón.',
        },
        {
          say: 'El tamaño no es el problema. Una imagen con sus unidades y su calibración registradas permitiría fotometría de cualquier tamaño; esta no tiene ninguna de las dos.',
        },
      ],
      hints: [
        '¿Qué registra la imagen sobre cómo se hicieron sus niveles de gris?',
      ],
      because:
        'Los niveles de gris son valores para mostrar: contraste estirado para el ojo, sin unidad ni calibración registradas. Una escala y un tamaño son medidas de dónde están las cosas, que sobreviven al estiramiento; un brillo sería una medida de luz, que no.',
    },
  ],
};

export const HOW_FAR_IS_THAT_STAR_DEEPER = {
  steps: [
    {
      title: 'La distancia a mano',
      body: 'El ajuste da un paralaje relativo de 60,29 mas. Conviértelo en una distancia.',
      prompt: 'La distancia, 1 sobre el paralaje',
      hints: [
        'Un paralaje de p segundos de arco es una distancia de 1/p pársecs. Convierte antes los milisegundos de arco.',
      ],
      worked:
        '60,29 mas son 0,06029 segundos de arco, y 1 ÷ 0,06029 = 16,59 pársecs. Es el medio de un intervalo, de 16,18 a 17,02 al 68 por ciento, no una distancia exacta.',
      feedback: {
        close: 'Casi. 1000 dividido entre el paralaje en milisegundos de arco.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: primero de milisegundos de arco a segundos de arco.',
        off: '1000 ÷ 60,29.',
      },
    },
    {
      title: 'Cuántas sigma',
      body: 'Un paralaje solo es una medición cuando está bien por encima de su propia incertidumbre. El ajuste da 60,29 mas con una incertidumbre de 1,53 mas.',
      prompt: 'El paralaje sobre su incertidumbre',
      hints: ['Divide el paralaje entre su incertidumbre.'],
      worked:
        '60,29 ÷ 1,53 = 39,4, que la herramienta informa como 39,5 con los números sin redondear: un paralaje unas cuarenta veces su propio error, así que la distancia está bien determinada, a un 2,5 por ciento.',
      feedback: {
        close: 'Casi. El paralaje dividido entre su incertidumbre.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: ambos están en milisegundos de arco.',
        off: '60,29 ÷ 1,53.',
      },
    },
    {
      title: 'Menos épocas, una barra más ancha',
      body: 'Pon <strong>Épocas usadas</strong> en 8, dejando paralaje y movimiento, y lee la incertidumbre del paralaje. Con las 14 épocas era de 1,53 mas.',
      prompt: '¿Cuántas veces mayor es la incertidumbre con 8 épocas?',
      hints: [
        'La incertidumbre con 8 épocas, dividida entre la incertidumbre con las 14 épocas.',
      ],
      worked:
        'Unos 2,25 ÷ 1,53 = 1,47. Ocho épocas son lo mínimo que acepta la herramienta, y cubren solo 1,03 años, así que el paralaje se conoce a 2,25 mas y la distancia a un 4 por ciento en lugar de a un 2,5.',
      feedback: {
        close:
          'Casi. Divide la incertidumbre con 8 épocas entre la incertidumbre con 14 épocas.',
        'wrong-order-of-magnitude': 'Un factor cercano a uno y medio, no diez.',
        off: '(incertidumbre con 8 épocas) ÷ (incertidumbre con 14 épocas).',
      },
    },
    {
      title: 'Una corrección a absoluto',
      body: 'Las estrellas de referencia no están en el infinito: un paralaje relativo es menor que el absoluto en su paralaje medio. Supón, como un supuesto que esta investigación indica y no mide, que ese promedio es de 1,0 mas con una incertidumbre de 0,5. Pon la <strong>Corrección</strong> en 1,0 mas, con 14 épocas y el ajuste de paralaje, y lee el paralaje absoluto y la distancia.',
      fields: [
        { label: 'Paralaje, absoluto' },
        { label: 'Distancia, 1 sobre el paralaje' },
      ],
    },
    {
      title: 'Hacia dónde se mueve la distancia',
      body: 'Frente a la distancia del paralaje relativo, 16,59 pc, la corregida es de 16,32 pc.',
      prompt:
        '¿Por qué es demasiado grande la distancia del paralaje relativo, si las estrellas de referencia tienen paralaje?',
      options: [
        'Las estrellas de referencia están más cerca que la estrella, así que bajan su paralaje',
        'El paralaje de la estrella se mide frente a estrellas que tienen un pequeño paralaje propio, así que el paralaje relativo es la diferencia y es demasiado pequeño, y uno sobre él es demasiado grande',
        'Un paralaje relativo es siempre mayor que el absoluto',
        'Nada: la distancia es la misma en cualquier marco',
      ],
      misconceptions: [
        {
          say: 'Las estrellas de referencia están más lejos que la estrella, y por eso sirven de referencia: lo que importa es que no están en el infinito, así que cada una se mueve un poco también.',
        },
        {
          say: 'Las dos difieren en 0,3 pc aquí, y en una parte mayor para una estrella más lejana, cuyo paralaje se parece más a la corrección.',
        },
      ],
      hints: [
        '¿Qué se mide cuando las estrellas de referencia también se mueven un poco?',
      ],
      because:
        'Las estrellas de referencia tienen un paralaje propio, así que la estrella se mide frente a un marco que se mueve un poco del mismo modo. Lo que se mide es la diferencia, que es demasiado pequeña, y uno sobre un número demasiado pequeño es demasiado grande. La herramienta lo dice junto a cada distancia.',
    },
    {
      rubric:
        'Crédito completo por nombrar dos límites que no están en el intervalo indicado y decir hacia dónde mueve cada uno la distancia: el paralaje propio de las estrellas de referencia (el punto cero del marco: la distancia relativa sale alta), el número y el reparto de las épocas (muy pocas se rechazan y pocas dan un intervalo ancho), errores que no son independientes de una época a otra (el intervalo queda demasiado estrecho), o el movimiento orbital si la estrella es una binaria (parece un paralaje). No dar crédito por decir que el intervalo ya lo incluye todo.',
      title: 'Qué limita la distancia',
      body: 'El intervalo del 68 por ciento de 16,18 a 17,02 pc cubre los errores aleatorios de las catorce posiciones, con los supuestos que indica la herramienta.',
      prompt:
        'En dos o tres frases: nombra dos límites de esta distancia que el intervalo no incluye, y di hacia dónde mueve cada uno la distancia.',
    },
  ],
};

export const A_BINARY_STARS_ORBIT_DEEPER = {
  steps: [
    {
      title: 'La masa a mano',
      body: 'Usa la tercera ley de Kepler, M = a&sup3;/P&sup2;, con el semieje mayor que hallaste en unidades astronómicas, 9,08 ua, y el período, 14,13 años.',
      prompt: 'La suma de masas',
      hints: [
        'Eleva al cubo el eje en ua, al cuadrado el período en años, y divide.',
      ],
      worked:
        '9,08³ ÷ 14,13² = 748,6 ÷ 199,7 = 3,75 masas solares, que coincide con los 3,76 de la herramienta. A mano no hay intervalo: la herramienta lleva las incertidumbres de la órbita y del paralaje por la misma fórmula.',
      feedback: {
        close: 'Casi. a al cubo entre P al cuadrado, con a en ua y P en años.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: 9,08 al cubo es unos 750 y 14,13 al cuadrado unos 200.',
        off: '9,08³ ÷ 14,13².',
      },
    },
    {
      title: 'Si el paralaje fuera de 80 mas',
      body: 'Pon <strong>Paralaje, relativo</strong> en 80 mas, con la órbita elíptica y las doce épocas, y lee la suma de masas. La órbita es la misma.',
      prompt: 'La suma de masas a 80 mas',
      hints: [
        'La órbita en ua crece cuando baja el paralaje, y la masa va como su cubo.',
      ],
      worked:
        'Unas 7,3 masas solares: a 80 mas el eje es 0,908 ÷ 0,080 = 11,35 ua y 11,35³ ÷ 14,13² = 7,3. Un cambio del 20 por ciento en el paralaje duplicó la masa, por eso la distancia es el eslabón más débil.',
      feedback: {
        close: 'Casi. Lee la suma de masas con el paralaje en 80 mas.',
        'wrong-order-of-magnitude':
          'Un factor de dos respecto de 3,76, no de diez.',
        off: 'La suma de masas con el paralaje puesto en 80 mas.',
      },
    },
    {
      title: 'Ocho épocas, un período más ancho',
      body: 'Pon <strong>Épocas usadas</strong> en 8 con el modelo elíptico y lee la incertidumbre del período. Con las doce es de 0,06 años.',
      prompt:
        '¿Cuántas veces mayor es la incertidumbre del período con 8 épocas?',
      hints: [
        'La incertidumbre con 8 épocas dividida entre la incertidumbre con 12.',
      ],
      worked:
        'Unos 0,16 ÷ 0,064 = 2,5. Las ocho primeras épocas cubren 0,74 de un período y las doce 1,16: la órbita aún no ha dado una vuelta completa, y el período lo sostiene menos arco.',
      feedback: {
        close: 'Casi. La incertidumbre con 8 épocas entre la de 12.',
        'wrong-order-of-magnitude': 'Un factor de dos o tres, no de diez.',
        off: '(incertidumbre del período, 8 épocas) ÷ 0,064.',
      },
    },
    {
      title: 'El nodo',
      body: 'La herramienta da el nodo ascendente como 34,7 &plusmn; 0,7 grados y dice que solo con posiciones no se puede saber cuál de los dos cruces del cielo es el ascendente, así que da el nodo entre 0 y 180 grados.',
      prompt: '¿Qué resolvería cuál cruce es el ascendente?',
      options: [
        'Más posiciones en el cielo',
        'Una incertidumbre menor del paralaje',
        'Las velocidades radiales de las estrellas, que dicen cuál se mueve hacia nosotros',
        'Un modelo circular',
      ],
      misconceptions: [
        {
          say: 'La ambigüedad está en la geometría, no en el ruido: una órbita y su espejo en profundidad hacen la misma trayectoria en el cielo, se tomen las posiciones que se tomen.',
        },
        {
          say: 'El modelo circular se rechaza para esta binaria, y tampoco resolvería la ambigüedad.',
        },
      ],
      hints: ['¿Qué es lo único que no da una imagen del cielo?'],
      because:
        'Las velocidades radiales. Las posiciones son las dos direcciones del cielo; qué lado de la órbita está más cerca de nosotros es la tercera, y solo el movimiento a lo largo de la línea de visión, medido en el espectro, lo dice.',
    },
    {
      title: 'Un paralaje relativo y la masa',
      body: 'Los 100 mas son un paralaje relativo a estrellas de referencia, y la herramienta dice que la distancia y la suma de masas salen altas en el paralaje medio de esas estrellas.',
      prompt:
        'Si el paralaje medio de las estrellas de referencia no es cero, la suma de masas verdadera es&hellip;',
      options: [
        'mayor que 3,8 masas solares, porque la estrella está más cerca',
        'menor que 3,8 masas solares: el paralaje absoluto es mayor, la estrella está más cerca, la órbita es menor en ua, y la masa va como el cubo',
        'la misma, porque la masa no depende de la distancia',
        'mayor, porque el período es más largo',
      ],
      misconceptions: [
        {
          say: 'Una estrella más cercana tiene una órbita menor en ua para el mismo ángulo, y la masa va como el cubo de la órbita. Más cerca significa más ligera, no más pesada.',
        },
        {
          say: 'El ángulo en el cielo está fijo; convertirlo en ua, y así en masa, necesita la distancia. Por eso la suma lleva la incertidumbre del paralaje.',
        },
      ],
      hints: [
        '¿Hacia dónde se mueve la distancia, y qué hace la órbita en ua?',
      ],
      because:
        'Menor. El paralaje absoluto es mayor que el relativo, así que la estrella está más cerca, el mismo ángulo es una órbita menor en ua, y la suma de masas, que va como ese tamaño al cubo, es menor. La suma de masas relativa es un lado alto de la verdad.',
    },
  ],
};

// ¿Qué superficie es más antigua?, pasos más profundos: paso a paso con el inglés (Prompt 195).
export const WHICH_SURFACE_IS_OLDER_DEEPER = {
  steps: [
    {
      title: 'Solo los cráteres mayores',
      body: 'Sube el diámetro en la Luna a <strong>50 km</strong>. Menos cráteres cumplen. Lee cuántos tiene el mar y el <strong>extremo superior</strong> del intervalo del cociente de densidades.',
      fields: [
        { label: 'Cráteres en el mar lunar' },
        { label: 'Extremo superior del intervalo' },
      ],
    },
    {
      title: '¿Por qué no compara a 25 km?',
      body: 'Pon el diámetro en la Luna en <strong>25 km</strong>. El instrumento rechaza una comparación y dice que el diámetro queda por debajo de aquel en el que el recuento es completo.',
      prompt: '¿Por qué no se permite un diámetro menor?',
      options: [
        'Los cráteres de menos de 30 km no existen en la Luna',
        'Por debajo de 30 km un recuento de estas imágenes pasaría por alto cráteres, así que una densidad ahí no sería la de la superficie',
        'El instrumento solo puede contar números enteros de kilómetros',
        'Los cráteres más pequeños tienen una edad distinta a la de los grandes',
      ],
      misconceptions: [
        {
          say: 'Hay muchos más cráteres por debajo de 30 km que por encima. Lo que importa es que son los que un recuento de esta imagen no alcanzaría por completo: un cráter de 25 km mide 12 píxeles.',
        },
        {
          say: 'El tamaño de un cráter no es su edad. Los cráteres pequeños son los primeros en perderse por saturación y en quedar enterrados, y los más afectados por los secundarios, que es la verdadera razón de contarlos con cuidado.',
        },
      ],
      hints: [
        '¿Cuántos píxeles de ancho tiene un cráter de 25 km a 2 km por píxel?',
      ],
      because:
        'Una comparación necesita los dos recuentos completos por encima del diámetro. El límite de la Luna, 30 km, son 15 píxeles de ancho; el instrumento rechaza por debajo en vez de comparar densidades a las que les faltan cráteres.',
    },
    {
      title: 'Dónde cambia su veredicto Marte',
      body: 'Pon Marte en <strong>60 km</strong> y lee el cociente de densidades y el <strong>extremo inferior</strong> de su intervalo. Luego sube el diámetro de 5 en 5 km desde 20 y observa dónde cambia el veredicto.',
      fields: [
        { label: 'Cociente de densidades, tierras altas entre llanuras' },
        { label: 'Extremo inferior del intervalo' },
      ],
    },
    {
      title: 'Cuando una región no tiene ninguno',
      body: 'Pon la Luna en <strong>100 km</strong>. Las tierras altas tienen cráteres así de grandes y el mar ninguno. Lee cuántos tienen las tierras altas y el extremo inferior del intervalo del cociente.',
      fields: [
        { label: 'Cráteres en las tierras altas lunares' },
        { label: 'Extremo inferior del intervalo' },
      ],
    },
  ],
};

// Cráteres por tamaño, pasos más profundos: paso a paso con el inglés.
export const CRATERS_BY_SIZE_DEEPER = {
  steps: [
    {
      title: 'Ajustar solo los mayores',
      body: 'Elige las <strong>tierras altas lunares</strong> y sube el ajuste a <strong>60 km</strong>. Lee cuántos cráteres hay en el ajuste y el extremo superior del intervalo.',
      fields: [
        { label: 'Cráteres en el ajuste' },
        { label: 'Extremo superior del intervalo' },
      ],
    },
    {
      title: 'La forma insesgada',
      body: 'El índice de máxima verosimilitud es <em>n</em>/<em>S</em>, donde <em>S</em> es la suma de ln(<em>D</em>/<em>D</em><sub>mín</sub>). Con pocos cráteres está sesgado al alza; <em>(n &minus; 1)/S</em> es la forma insesgada. Elige el <strong>mar lunar</strong>, ajustado desde <strong>30 km</strong>, y lee el índice insesgado.',
      fields: [{ label: 'Índice, forma insesgada (n − 1) / S' }],
    },
    {
      title: '¿Por qué no trazar una recta por los puntos?',
      body: 'El gráfico muestra puntos unidos, a la vista, por una línea. El índice no es la pendiente de una recta ajustada a ellos.',
      prompt:
        '¿Por qué un ajuste de recta a los puntos dibujados es la herramienta equivocada?',
      options: [
        'Una recta siempre es mejor: usa todos los puntos del gráfico',
        'Los puntos no son independientes (cada uno cuenta también todos los cráteres mayores) y sus errores no son gaussianos, así que el intervalo de la recta sería erróneo',
        'No se puede ajustar una recta en una escala logarítmica',
        'El índice de máxima verosimilitud es el ajuste de recta, escrito de otra manera',
      ],
      misconceptions: [
        {
          say: 'Usar todos los puntos no es usar todos los cráteres. Los puntos comparten sus cráteres: el mayor está en todos ellos, y un ajuste que los trata como separados cuenta su información muchas veces.',
        },
        {
          say: 'Difieren: el índice de máxima verosimilitud pesa cada cráter una vez y tiene un intervalo exacto. Una recta de mínimos cuadrados por los puntos acumulados da al extremo de diámetros grandes, donde los puntos son pocos y correlacionados, el mismo peso que al pequeño.',
        },
      ],
      hints: ['¿Cuántos de los puntos dibujados incluyen el cráter mayor?'],
      because:
        'Cada punto acumulado incluye todos los cráteres a su derecha, así que los puntos están correlacionados, y el error de un recuento es de Poisson, no gaussiano. El ajuste usa los cráteres, una vez cada uno, y obtiene un intervalo exacto.',
    },
    {
      title: '¿Por qué 30 km, si el catálogo llega más abajo?',
      body: 'El catálogo lunar dice que es completo hasta unos 8 km, y el instrumento aún marca 30 km como límite de completitud de las tierras altas lunares.',
      prompt: '¿Por qué?',
      options: [
        'El catálogo está mal por debajo de 30 km',
        'El límite es de un recuento hecho con esta imagen: 30 km son unos 15 píxeles de ancho a 2 km por píxel, lo menos que se puede colocar con fiabilidad',
        'Los cráteres de menos de 30 km no existen en la Luna',
        'El intervalo de Poisson no es válido por debajo de 30 km',
      ],
      misconceptions: [
        {
          say: 'El catálogo se hizo con otros datos, a una escala más fina, y su propia completitud está indicada. El límite aquí es de la imagen: un recuento de una persona sobre este mapa no puede ser completo donde los cráteres miden solo unos pocos píxeles.',
        },
        {
          say: 'El intervalo de Poisson vale para cualquier número de cráteres independientes. Lo que falla por debajo del límite es que la lista ya no son todos los cráteres, algo que ningún intervalo puede reparar.',
        },
      ],
      hints: ['¿Cuánto mide en píxeles un cráter de 20 km?'],
      because:
        'La completitud depende de los datos con que se hace un recuento. La misma superficie necesita otro límite en otra imagen, así que el límite se indica con la imagen, y un ajuste por debajo se señala como poco fiable.',
    },
  ],
};

// Lo que vale el diámetro de un cráter, pasos más profundos: paso a paso con el inglés.
export const WHAT_A_CRATER_DIAMETER_IS_WORTH_DEEPER = {
  steps: [
    {
      title: 'Un círculo pequeño',
      body: 'Pon el punto del borde a <strong>5 píxeles</strong> del centro, un cráter de 10 píxeles de ancho. Lee el diámetro y la incertidumbre de <strong>colocar el círculo</strong>, en porcentaje.',
      fields: [
        { label: 'Diámetro' },
        { label: 'Incertidumbre de colocar el círculo' },
      ],
    },
    {
      title: '¿Mide al menos 110 km?',
      body: 'Un recuento por encima de 110 km necesita saber si este cráter está dentro. Con el círculo de nuevo a 25 píxeles, pon <strong>Contando cráteres de al menos</strong> en <strong>110 km</strong> y lee la probabilidad de que este cráter mida al menos eso, dada su incertidumbre.',
      fields: [{ label: 'Probabilidad de que el cráter mida al menos 110 km' }],
    },
    {
      title: 'La mejor mejora',
      body: 'Cuatro cosas podrían reducir la incertidumbre del diámetro: una mejor escala del mapa, una mano más cuidadosa, acordar dónde está un borde y una mejor estimación de la vista.',
      prompt: '¿Cuál la reduciría más para este círculo?',
      options: [
        'una mejor escala: el término de la escala fija el total',
        'una mano más cuidadosa: coloca el círculo con un píxel',
        'acordar, por convención, dónde está el borde',
        'una mejor estimación de la vista',
      ],
      misconceptions: [
        {
          say: 'La escala ya se conoce al 0,06 por ciento. Reducir un término que ya es una centésima del total no cambia nada.',
        },
        {
          say: 'Una mano más cuidadosa reduce el 1,6 por ciento de colocar el círculo, que se suma en cuadratura al 5 por ciento del borde: casi no cambia nada.',
        },
      ],
      hints: ['Los términos se suman en cuadratura: ¿cuál domina la suma?'],
      because:
        'Los términos se suman como cuadrados, así que domina el mayor. Aquí es dónde está el borde, un 5 por ciento. Una convención que lo fije, como la misma definición de borde para todos los cráteres, es lo que necesitan los cráteres contados por distintas personas, y es un trabajo distinto de un mejor instrumento.',
    },
    {
      title: 'Contra el catálogo',
      body: 'Activa <strong>Los círculos del catálogo</strong>. El catálogo enumera un cráter bajo el centro de tu círculo. Lee su diámetro.',
      fields: [{ label: 'El diámetro del catálogo' }],
    },
  ],
};

// ¿Qué hay en este campo?, pasos más profundos: paso a paso con el inglés.
export const WHAT_IS_IN_THIS_FIELD_DEEPER = {
  steps: [
    {
      title: 'Un umbral de 3 sigmas',
      body: 'Pon el <strong>Umbral</strong> en 3 sigmas, con el ancho en 3 píxeles. Lee la magnitud a la que se halla la mitad de las estrellas añadidas, y nueve de cada diez.',
      fields: [
        { label: 'Magnitud con el 50 por ciento hallado' },
        { label: 'Magnitud con el 90 por ciento hallado' },
      ],
    },
    {
      title: '¿Qué búsqueda describe la curva?',
      body: 'Con el umbral en 3 sigmas, lee <strong>¿Describe la búsqueda del primer instrumento?</strong> El primer instrumento buscó en este cuadro a 4 sigmas.',
      prompt: 'Tienes la curva de 3 sigmas. ¿Qué puedes decir con ella?',
      options: [
        'También es la completitud de la búsqueda de 4 sigmas, porque es el mismo cuadro',
        'Es la completitud de la búsqueda de 3 sigmas de este cuadro y de ningún otro: la herramienta dice que difiere en sus ajustes de detección',
        'Es la completitud de toda búsqueda de todo cuadro cuyas estrellas tengan este ancho',
        'Está mal, porque su punto medio difiere del de 4 sigmas',
      ],
      misconceptions: [
        {
          say: 'Mismo cuadro, otra búsqueda: los puntos medios difieren en un tercio de magnitud. La herramienta se niega a llamar a la curva la completitud de 4 sigmas y nombra el ajuste que difiere.',
        },
        {
          say: 'El cielo, la exposición y el ruido forman parte de ella: un cuadro con el doble de ruido de cielo necesita estrellas más brillantes. La herramienta rechaza un cuadro cuyo ruido difiera en más del diez por ciento.',
        },
        {
          say: 'Dos curvas de dos búsquedas deben diferir; eso es lo que hace un umbral. Ninguna está mal.',
        },
      ],
      hints: [
        '¿Qué dice la herramienta en la línea que empieza por «Describe»?',
      ],
      because:
        'Una curva es la respuesta para la búsqueda con que se midió: su ancho, su ruido, su umbral y su área mínima. No es una propiedad del cuadro solo, así que una curva para otro ajuste es otra curva, y la herramienta lo dice en vez de prestar una a la otra.',
    },
    {
      title: 'La curva frente a las estrellas que hay',
      body: 'Pon el umbral en 4 sigmas y el ancho en 3 píxeles y activa <strong>Las estrellas del propio campo</strong> en mostradas. La curva da a cada estrella del campo una probabilidad de ser hallada a su propia magnitud. Lee cuántas de las cuarenta estrellas dice la curva que halla una búsqueda, y cuántas listó la búsqueda.',
      fields: [
        {
          label:
            'Estrellas del campo que esta curva dice que una búsqueda halla',
        },
        { label: 'Estrellas del campo que la búsqueda listó' },
      ],
    },
    {
      title: 'Estrellas del ancho equivocado',
      body: 'Pon el <strong>Ancho de las estrellas inyectadas</strong> en 4,5 píxeles, con el umbral en 4 sigmas, como si la medición hubiera dado un enfoque peor. Lee la magnitud con el 50 por ciento hallado, y la proporción hallada en el intervalo más brillante.',
      fields: [
        { label: 'Magnitud con el 50 por ciento hallado' },
        { label: 'Halladas, magnitud −3,4 a −3,1' },
      ],
    },
    {
      title: 'Lo que necesita una curva',
      rubric:
        'Crédito completo por decir que la curva es una afirmación sobre una búsqueda de un cuadro (no sobre el telescopio), y por nombrar lo que debe coincidir antes de usarla en otro cuadro: el ancho de las estrellas, el ruido (cielo y exposición) y los ajustes de detección (el umbral y la fuente mínima), con estrellas aisladas solamente. También crédito por decir que una fuente tenue listada o un solo límite de magnitud no es la misma respuesta. No des crédito por decir que la curva es una propiedad del telescopio o que vale para cualquier cuadro.',
      body: 'Tienes una curva de completitud de este cuadro, a 4 sigmas, para estrellas de 3 píxeles de ancho.',
      prompt:
        'En dos o tres frases: ¿de qué es afirmación la curva, y qué tendría que coincidir antes de usarla en un cuadro distinto?',
    },
  ],
};

export default {
  'what-is-a-measurement': WHAT_IS_A_MEASUREMENT_DEEPER,
  'what-does-plus-minus-claim': WHAT_DOES_PLUS_MINUS_CLAIM_DEEPER,
  'when-the-method-must-refuse': WHEN_THE_METHOD_MUST_REFUSE_DEEPER,
  'measuring-the-moon': MEASURING_THE_MOON_DEEPER,
  'how-far-is-that-star': HOW_FAR_IS_THAT_STAR_DEEPER,
  'a-binary-stars-orbit': A_BINARY_STARS_ORBIT_DEEPER,
  'which-surface-is-older': WHICH_SURFACE_IS_OLDER_DEEPER,
  'craters-by-size': CRATERS_BY_SIZE_DEEPER,
  'what-a-crater-diameter-is-worth': WHAT_A_CRATER_DIAMETER_IS_WORTH_DEEPER,
  'what-is-in-this-field': WHAT_IS_IN_THIS_FIELD_DEEPER,
};
