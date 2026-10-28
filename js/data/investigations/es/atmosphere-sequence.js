// Las investigaciones de atmósfera (Prompt 200) - español, paso a paso con ../atmosphere-sequence.js (D-R10-81).
// Sin lectura por una persona que lea español con fluidez; los mensajes que calculan los validadores quedan en inglés, como en las demás investigaciones.

// Por qué Venus es caliente: paso a paso con el inglés.
export const WHY_VENUS_IS_HOT = {
  title: 'Por qué Venus es caliente',
  subtitle:
    'Qué da la luz del Sol por sí sola a un planeta, la diferencia que deja y qué la cierra',
  objectives: [
    'Decir qué es la temperatura de equilibrio de un planeta y qué no es',
    'Hallar la diferencia entre la temperatura de equilibrio de un planeta y la temperatura medida en su superficie, y leerla como un efecto invernadero solo donde lo es',
    'Ver que Venus, con la temperatura de equilibrio más baja, tiene la superficie más caliente',
    'Hallar el único número que necesita una atmósfera gris para dar a Venus su temperatura superficial, y ver por qué una sola capa no puede',
  ],
  steps: [
    {
      title: 'Dos temperaturas para un planeta',
      body: 'La superficie de Venus está a 737 K, unos 464 &deg;C, más caliente que la de Mercurio, que está mucho más cerca del Sol. Esta investigación pregunta qué daría la luz del Sol por sí sola a cada planeta y qué queda de más.\n\nLa <strong>temperatura de equilibrio</strong> es la de un cuerpo negro que irradia exactamente la luz solar que el planeta absorbe. Depende de la distancia al Sol y del <strong>albedo de Bond</strong>, la fracción de la luz solar que un planeta refleja. No es la temperatura del suelo: es lo que el planeta irradiaría al espacio si la luz del Sol fuera todo lo que hay. Usa el instrumento para compararla con la temperatura medida en la superficie. Los modelos de aquí dejan fuera la convección, las nubes y cualquier calor interior del planeta, y el instrumento lo dice.',
    },
    {
      title: 'La Tierra: solo la luz solar',
      body: 'Empieza por casa. Con el planeta en <strong>Tierra</strong> y su propio albedo, lee la <strong>temperatura de equilibrio</strong> de la Tierra y la diferencia <strong>medida menos de equilibrio</strong>.',
      fields: [
        { label: 'Temperatura de equilibrio de la Tierra' },
        { label: 'Temperatura medida en la superficie menos de equilibrio' },
      ],
    },
    {
      title: 'Venus: ¿más cerca, así que más caliente?',
      body: 'Venus está más cerca del Sol que la Tierra, así que recibe casi el doble de luz solar en lo alto de su atmósfera. Sus nubes además reflejan la mayor parte: su albedo de Bond es 0,76, frente al 0,306 de la Tierra.',
      prompt:
        'La temperatura de equilibrio de Venus, solo con la luz solar, sería&hellip;',
      options: [
        'más alta que la de la Tierra, cerca de 330 K, porque Venus está más cerca del Sol',
        'más o menos igual que la de la Tierra',
        'más baja que la de la Tierra, cerca de 230 K, porque sus nubes reflejan mucha luz solar',
        'cerca de 737 K, la temperatura medida en su superficie',
      ],
      hints: [
        'Multiplica la luz solar en Venus por la fracción que absorbe, 1 − 0,76, y compara con el 1 − 0,306 de la Tierra.',
      ],
      because:
        'Venus absorbe solo una cuarta parte de la luz solar que le llega, y eso fija su temperatura de equilibrio cerca de 229 K, más fría que los 254 K de la Tierra. El paso siguiente la lee en el instrumento.',
    },
    {
      title: 'Venus: solo la luz solar',
      body: 'Pon el planeta en <strong>Venus</strong> y lee su temperatura de equilibrio, y la diferencia entre la temperatura medida en la superficie y ella.',
      fields: [
        { label: 'Temperatura de equilibrio de Venus' },
        { label: 'Temperatura medida en la superficie menos de equilibrio' },
      ],
    },
    {
      title: '¿Qué dice la diferencia?',
      body: 'La superficie de Venus está 508 K más caliente de lo que puede dejarla la luz solar sola.',
      prompt: '¿Cuál es la lectura más razonable de esa diferencia?',
      options: [
        'La atmósfera retiene calor: la superficie está más caliente que la temperatura que el planeta irradia al espacio',
        'Venus tiene una fuente de calor interna mucho mayor que la luz solar que absorbe',
        'El albedo de Venus debe de estar mal, porque un planeta más caliente reflejaría menos',
        'La luz solar en Venus es mucho más fuerte de lo que usa el modelo',
      ],
      misconceptions: [
        {
          say: 'Venus no tiene una fuente de calor interna de ese tamaño. El calor del interior de un planeta es una fracción pequeña de la luz solar que absorbe, salvo en los planetas gigantes.',
        },
        {
          say: 'Incluso con el albedo de la Tierra, la temperatura de equilibrio de Venus sería de unos 299 K, muy lejos de 737 K. La diferencia es demasiado grande para ser un error de albedo.',
        },
      ],
      hints: [
        'Compara la temperatura que el planeta irradia al espacio con la temperatura de su suelo.',
      ],
      because:
        'El planeta en conjunto irradia lo que absorbe, a 229 K, desde lo alto de la atmósfera. El suelo está mucho más caliente porque una atmósfera espesa que absorbe radiación infrarroja lleva el calentamiento desde el suelo hacia arriba a través de muchas capas: un efecto invernadero.',
    },
    {
      title: '¿La diferencia es siempre un efecto invernadero?',
      body: 'Recorre los demás cuerpos. Lee la diferencia de <strong>Marte</strong> (una atmósfera fina de dióxido de carbono) y la de <strong>Júpiter</strong>. Júpiter no tiene superficie: su fila compara el modelo con la temperatura del nivel de 1 bar, y Júpiter además emite calor propio.',
      fields: [
        { label: 'Marte: medida menos de equilibrio' },
        { label: 'Júpiter: medida (1 bar) menos de equilibrio' },
      ],
    },
    {
      title: '¿Una capa para Venus?',
      body: 'El efecto invernadero más sencillo es <strong>una capa</strong> que deja pasar la luz solar y absorbe una fracción del infrarrojo, la <em>emisividad</em>. El suelo que puede calentar es como mucho 2<sup>1/4</sup> = 1,19 veces la temperatura de equilibrio, por espesa que sea la capa. Pon el planeta en <strong>Venus</strong> y la emisividad en 1, lo máximo que puede hacer la capa, y lee la temperatura del suelo que da el modelo de una capa.',
      fields: [
        {
          label:
            'La temperatura del suelo más alta que una capa puede dar a Venus',
        },
      ],
    },
    {
      title: 'Una profundidad óptica para Venus',
      body: 'Una <strong>atmósfera gris</strong> es otro modelo: la opacidad es la misma en todas las longitudes de onda y la atmósfera tiene una <strong>profundidad óptica</strong>, una medida de lo opaca que es toda la columna. Una columna lo bastante gruesa puede calentar el suelo sin límite. Con el planeta en <strong>Venus</strong>, lee la profundidad óptica que da la temperatura superficial medida.',
      fields: [
        {
          label:
            'Profundidad óptica que da la temperatura superficial de Venus',
        },
      ],
    },
    {
      title: 'Lo que has deducido',
      body: 'La luz solar sola da a la Tierra 254 K y a Venus 229 K, y las superficies están a 288 K y 737 K: diferencias de 34 K y 508 K. Venus refleja la mayor parte de su luz solar, así que tiene la temperatura de equilibrio más fría y la superficie más caliente. La diferencia de Marte es una fracción de kelvin, y la de Júpiter no es en absoluto una diferencia de efecto invernadero. Una sola capa absorbente no puede dar a Venus más de 272 K; una atmósfera gris con una profundidad óptica de unos 142 sí puede. Son modelos de enseñanza: dejan fuera la convección, las nubes y la dependencia con la longitud de onda de la opacidad real, y el único número ajustado para Venus no es una medida de su atmósfera.',
    },
  ],
};

// Dos modelos de efecto invernadero: paso a paso con el inglés.
export const TWO_GREENHOUSE_MODELS = {
  title: 'Dos modelos de efecto invernadero',
  subtitle:
    'Una sola capa y una atmósfera gris, los mismos planetas y por qué los números difieren',
  objectives: [
    'Ajustar la temperatura superficial de la Tierra con una emisividad de una capa y con una profundidad óptica gris, y decir por qué los dos números difieren',
    'Decir qué significa el número libre de cada modelo y qué deja fuera cada uno',
    'Ver qué modelo puede alcanzar la temperatura superficial de Venus y cuál no',
    'Leer el perfil de temperatura de una atmósfera gris y el error de la aproximación de Eddington',
  ],
  steps: [
    {
      title: 'Dos maneras de modelar un efecto invernadero',
      body: 'Los dos modelos parten del mismo planeta: la luz solar llega, el planeta está en equilibrio de energía y la temperatura de equilibrio es aquella a la que irradia. Difieren en cómo la atmósfera absorbe el calor del suelo.\n\nEl modelo de <strong>una capa</strong> es una sola lámina con una <em>emisividad</em> entre 0 y 1. El modelo <strong>gris</strong> es una columna con una <em>profundidad óptica</em> de arriba abajo y la misma opacidad en todas las longitudes de onda, resuelto aquí con la aproximación de Eddington. Cada uno tiene un número libre y ninguno es el otro con otro nombre. Ajustarás los dos a la Tierra, Marte y Venus.',
    },
    {
      title: 'La Tierra en el modelo de una capa',
      body: 'Con el planeta en <strong>Tierra</strong>, lee la <strong>emisividad de una capa</strong> que da la temperatura superficial medida de la Tierra, 288 K.',
      fields: [{ label: 'Emisividad que da 288 K' }],
    },
    {
      title: 'La Tierra en el modelo gris',
      body: 'Ahora el modelo gris. Lee la <strong>profundidad óptica</strong> que da la temperatura superficial de la Tierra.',
      fields: [{ label: 'Profundidad óptica que da 288 K' }],
    },
    {
      title: 'El mismo planeta, números distintos',
      body: 'La Tierra necesita una emisividad de 0,79 en un modelo y una profundidad óptica de 0,87 en el otro.',
      prompt: '¿Por qué son distintos los dos números?',
      options: [
        'Son magnitudes distintas: una emisividad es la parte que absorbe una lámina, y una profundidad óptica fija lo opaca que es toda una columna, capa a capa',
        'Uno de los dos modelos está sencillamente mal para la Tierra y su número debe ignorarse',
        'La emisividad debe ser siempre igual a la profundidad óptica si los modelos son correctos',
        'La profundidad óptica cuenta las nubes y la emisividad no',
      ],
      misconceptions: [
        {
          say: 'Una emisividad no puede pasar de 1, y una profundidad óptica puede ser 142. No son la misma magnitud, y los modelos coinciden en una temperatura del suelo, no en lo que dicen de la atmósfera.',
        },
      ],
      hints: ['¿Cuál es el valor más grande que puede tomar cada número?'],
      because:
        'Los dos reproducen 288 K, y los dos se ajustan a la única medida. Lo que afirman de la atmósfera es distinto, y ninguno se ha medido: un número ajustado a una temperatura superficial no es una observación de la atmósfera.',
    },
    {
      title: 'Venus en los dos modelos',
      body: 'La superficie de Venus está a 737 K y su temperatura de equilibrio es 229 K.',
      prompt: '¿Qué modelo puede dar la temperatura superficial de Venus?',
      options: [
        'los dos, cada uno con una emisividad o profundidad óptica adecuada',
        'solo el modelo gris, con una profundidad óptica grande',
        'solo el modelo de una capa, con una emisividad cercana a 1',
        'ninguno: la luz solar sola no puede',
      ],
      hints: [
        '¿Cuál es el suelo más caliente que puede dar una capa, como múltiplo de la temperatura de equilibrio?',
      ],
      because:
        'Solo el modelo gris. Una capa no puede pasar de 2^(1/4) = 1,19 veces la temperatura de equilibrio, 272 K para Venus, mientras que la temperatura del suelo de una atmósfera gris sigue subiendo con su profundidad óptica.',
    },
    {
      title: 'Venus: el techo y la profundidad',
      body: 'Pon el planeta en <strong>Venus</strong>. Lee la temperatura del suelo más alta que le puede dar una capa (emisividad 1) y la profundidad óptica que necesita el modelo gris.',
      fields: [
        {
          label:
            'La temperatura del suelo más alta que una capa puede dar a Venus',
        },
        {
          label:
            'Profundidad óptica que da la temperatura superficial de Venus',
        },
      ],
    },
    {
      title: 'Lo que has deducido',
      body: 'La Tierra necesita una emisividad de 0,79 en el modelo de una capa y una profundidad óptica de 0,87 en el modelo gris: dos números para un planeta, porque son dos magnitudes distintas. Venus necesita una profundidad óptica cercana a 142 en el modelo gris y no tiene solución en el de una capa, cuyo suelo no puede pasar de 1,19 veces la temperatura de equilibrio. Cada número se ajusta a una sola temperatura superficial; ninguno es una medida de la atmósfera. Los pasos más profundos miran Marte, el perfil dentro de una atmósfera gris y dónde la opacidad gris deja de ser una buena descripción.',
    },
  ],
};

// El Sol que gira (Prompt 194, parte 2): paso a paso con el inglés.
export const THE_TURNING_SUN = {
  title: 'El Sol que gira',
  subtitle:
    'Catorce días de imágenes, un grupo de manchas seguido a través del disco y la rotación del Sol a partir de él',
  objectives: [
    'Leer la latitud y la longitud de una mancha en una imagen del Sol, con la incertidumbre de colocarla, y decir por qué una cerca del borde se lee peor',
    'Seguir un grupo de manchas durante días hasta una velocidad y un período de rotación, y corregirlo por el movimiento propio de la Tierra',
    'Decir qué es una mancha solar y por qué las manchas a distintas latitudes giran a distinta velocidad',
    'Decir qué pueden y qué no pueden mostrar dos grupos sobre cómo gira el Sol, y por qué dos latitudes no pueden fijar tres coeficientes',
  ],
  steps: [
    {
      title: 'Catorce imágenes del Sol',
      body: 'El 4 de mayo de 2024 el Sol mostraba un puñado de <strong>manchas</strong> oscuras. Durante los trece días siguientes cruzaron su cara. Las imágenes de aquí son una por día, a las 12:00 UT, del Observatorio de Dinámica Solar (crédito SDO/NASA y el equipo científico de HMI). Son <strong>imágenes de vista previa</strong>, hechas para mirarlas: su fuente dice que no son para análisis científico, así que lo que leas de ellas es una lectura didáctica con una incertidumbre, no astrometría. Los dos círculos, G1 y G3, son dos grupos marcados por el autor con una regla declarada; nadie más ha marcado estas imágenes.\n\nPon el día en 1 y luego en 5 y observa G1, una mancha pequeña cerca del centro del disco.',
    },
    {
      title: '¿Hacia dónde van las manchas?',
      body: 'En estas imágenes el norte está arriba y el este a la izquierda. Avanza el día de 1 a 6 y sigue a G1.',
      prompt: 'A través de la cara, las manchas se mueven&hellip;',
      options: [
        'desde el borde izquierdo hacia el derecho, de este a oeste',
        'desde el borde derecho hacia el izquierdo, de oeste a este',
        'hacia arriba, hacia el polo norte',
        'nada: una mancha se queda donde está y la cara del Sol solo se ilumina',
      ],
      misconceptions: [
        {
          say: 'Una mancha está en un lugar fijo del Sol, y se mueve por la imagen porque el Sol gira. G1 está a 452 píxeles de la izquierda el día 1 y a 912 el día 6.',
        },
      ],
      hints: ['Mira la posición horizontal de G1 el día 1 y el día 5.'],
      because:
        'Desde la izquierda, el este, hacia la derecha, el oeste. El Sol gira en el mismo sentido en que los planetas lo rodean, así que las manchas entran por el borde este y salen por el oeste.',
    },
    {
      title: '¿Dónde está G1 en el Sol?',
      body: 'Una imagen muestra el Sol plano; lo que quieres es dónde está una mancha en la esfera. El instrumento hace la geometría, a partir de la inclinación del polo del Sol hacia nosotros y la longitud de Carrington del meridiano central, ambas de JPL Horizons. La cruz empieza sobre G1 el día 1. Lee su <strong>latitud</strong> y su <strong>longitud desde el meridiano central</strong>, en grados. El este es negativo.',
      fields: [
        { label: 'Latitud de G1 el día 1' },
        { label: 'Longitud de G1 desde el meridiano central el día 1' },
      ],
    },
    {
      title: '¿Cuánto gira en tres días?',
      body: 'Pon el día en <strong>4</strong> y lee la longitud de G1 en la fila de la <strong>marca del autor</strong>. Luego divide lo que se movió, desde el día 1, entre los tres días transcurridos.',
      fields: [
        { label: 'Longitud de G1 el día 4' },
        { label: 'Cuánto giró cada día, del día 1 al día 4 (grados por día)' },
      ],
    },
    {
      title: 'El seguimiento completo',
      body: 'El segundo instrumento toma todas las marcas de G1 que no están demasiado cerca del borde (seis días) y ajusta una recta a la longitud frente al tiempo. Lee la <strong>velocidad sinódica</strong>, la velocidad vista desde la Tierra, con su incertidumbre, y el <strong>período sinódico</strong>: lo que tarda una vuelta de 360 grados a esa velocidad.',
      fields: [
        { label: 'Velocidad sinódica de G1 (grados por día)' },
        { label: 'El período sinódico' },
      ],
    },
    {
      title: 'El período propio del Sol',
      body: 'Mientras la mancha giraba, la Tierra también se movía, alrededor del Sol y en el mismo sentido. Los 27,3 días se miden desde un lugar en movimiento.',
      prompt:
        'El período de rotación propio del Sol, respecto de las estrellas, será&hellip;',
      options: [
        'menor que 27,3 días: la Tierra ha avanzado, así que la mancha tiene que girar algo más de una vuelta para volver a mirarnos',
        'mayor que 27,3 días: el movimiento de la Tierra arrastra la mancha hacia atrás',
        'el mismo: la Tierra está demasiado lejos para importar',
      ],
      hints: [
        'En 27 días la Tierra recorre cerca de la decimotercera parte de su órbita, en el mismo sentido en que gira el Sol.',
      ],
      because:
        'Menor. La mancha tiene que girar 360 grados más el ángulo que ha recorrido la Tierra mientras tanto antes de volver a mirarnos. El paso siguiente quita el movimiento de la Tierra de la velocidad.',
    },
    {
      title: 'Respecto de las estrellas',
      body: 'Suma el movimiento propio de la Tierra, unos 0,96 grados al día a lo largo del ecuador del Sol, a la velocidad sinódica. Lee la <strong>velocidad sideral</strong> y el <strong>período sideral</strong>.',
      fields: [
        { label: 'Velocidad sideral de G1 (grados por día)' },
        { label: 'El período sideral' },
      ],
    },
    {
      title: '¿Qué es una mancha solar?',
      body: 'Has seguido una durante una semana. Se quedó a una latitud, y por eso pudiste seguirla, y giró con el Sol.',
      prompt: 'Una mancha solar es&hellip;',
      options: [
        'una zona de la superficie del Sol más fría que su entorno, y por eso más oscura, donde campos magnéticos intensos retienen el calor',
        'un agujero en la superficie del Sol por el que vemos un interior oscuro',
        'una nube de gas frío delante del Sol',
        'un planeta que pasa por delante del Sol',
      ],
      misconceptions: [
        {
          say: 'No hay agujero: una mancha es parte de la superficie. Solo parece oscura junto a la superficie más caliente que la rodea, como un carbón parece oscuro junto a una llama. Sigue brillando.',
        },
        {
          say: 'Una nube o un planeta no se quedarían a una latitud girando con el Sol durante una semana: G1 lo hizo. Una mancha pertenece al Sol.',
        },
      ],
      hints: ['¿Qué dice que se quede a una latitud y gire con el Sol?'],
      because:
        'Una zona más fría donde campos magnéticos intensos retienen el calor de abajo. Es oscura solo por contraste y pertenece al Sol, así que seguirla es seguir el giro del propio Sol.',
    },
    {
      title: 'Lo que has deducido',
      body: 'Has leído el lugar de una mancha en el Sol a partir de una imagen plana, con una incertidumbre, has seguido a G1 durante seis días hasta 13,17 &plusmn; 0,06 grados al día vista desde la Tierra, y lo has corregido por el movimiento de la Tierra hasta 14,13 &plusmn; 0,06 respecto de las estrellas, un período de 25,5 días. Una mancha es una zona más fría de la superficie y pertenece a ella. Dos límites que conviene recordar: las imágenes son de vista previa, así que estas son lecturas didácticas y no astrometría, y G1 es un grupo pequeño, así que esto es una sola latitud. Los pasos más profundos siguen a un segundo grupo a otra latitud y preguntan qué pueden y qué no pueden mostrar dos grupos.',
    },
  ],
};

// El poder del Sol (Prompt 194, parte 2): paso a paso con el inglés.
export const THE_SUNS_POWER = {
  title: 'El poder del Sol',
  subtitle:
    'Un flujo medido en la Tierra, llevado a una unidad astronómica, y la luminosidad y la temperatura del Sol a partir de él',
  objectives: [
    'Llevar un flujo medido en la Tierra a una unidad astronómica con la distancia Tierra–Sol, y decir por qué hay que hacer la corrección',
    'Convertir un flujo a una unidad astronómica en la luminosidad y la temperatura efectiva del Sol, y compararlas con el Sol de la investigación Color y temperatura',
    'Decir qué incluye y qué no incluye el intervalo de una media de valores diarios',
    'Leer los valores de relleno de un archivo como datos que faltan, no como medidas de cero',
  ],
  steps: [
    {
      title: 'Luz solar medida sobre el aire',
      body: 'El instrumento <strong>TSIS-1 TIM</strong> mide la irradiancia total del Sol, toda la luz solar por un metro cuadrado de cara al Sol, sobre la atmósfera. Los valores diarios de aquí son de LASP (crédito LASP/equipo TSIS-1 TIM): los seis días del 4 al 9 de mayo de 2024, los mismos días que las imágenes de El Sol que gira. El archivo tiene siete días más después de ellos, pero valen 0,0 con una incertidumbre de 0,0: son valores de relleno, no medidas (un paso posterior). El instrumento da la irradiancia <strong>en la Tierra</strong>, y la Tierra no siempre está a la misma distancia del Sol.',
    },
    {
      title: 'Llévalo a una unidad astronómica',
      body: 'La luz solar se reparte sobre una esfera, así que el flujo cae con el cuadrado de la distancia. El 4 de mayo la Tierra estaba a 1,00844 UA del Sol. Lee el flujo en la Tierra y el flujo llevado a <strong>1 UA</strong>: el flujo por la distancia en UA, al cuadrado.',
      fields: [
        { label: 'El flujo en la Tierra el 4 de mayo (W/m²)' },
        { label: 'El flujo a 1 UA (W/m²)' },
      ],
    },
    {
      title: '¿Cuánta potencia en total?',
      body: 'El Sol envía unos 1361 W por cada metro cuadrado a 1 UA, en todas las direcciones. El área de una esfera de radio 1 UA es de unos 2,8 &times; 10<sup>23</sup> metros cuadrados.',
      prompt: 'La potencia total del Sol, su luminosidad, será de unos&hellip;',
      options: [
        '4 × 10²⁶ W',
        '4 × 10²⁰ W',
        '4 × 10³² W',
        '1361 W, igual que el flujo',
      ],
      hints: ['Multiplica el flujo por el área: 1361 × 2,8 × 10²³.'],
      because:
        'Unos 4 × 10²⁶ W, 400 billones de billones de vatios: 1361 W por metro cuadrado por 2,8 × 10²³ metros cuadrados. El paso siguiente lo lee en el instrumento con todos los días medidos.',
    },
    {
      title: 'La luminosidad y la temperatura del Sol',
      body: 'Usa los seis días. El instrumento lleva cada uno a 1 UA, toma la media y multiplica por el área de la esfera. La temperatura es la que necesitaría una superficie negra del tamaño del Sol para irradiar esa potencia. Lee la <strong>luminosidad</strong> en unidades de 10<sup>26</sup> W y la <strong>temperatura efectiva</strong>.',
      fields: [
        { label: 'La luminosidad del Sol (× 10²⁶ W)' },
        { label: 'La temperatura efectiva' },
      ],
    },
    {
      title: '¿Y si se omite la corrección?',
      body: 'Desactiva la corrección. La luminosidad sale más baja. La Tierra estaba entre 1,0084 y 1,0096 UA del Sol esos días.',
      prompt: '¿Por qué sale más baja, y cuánto?',
      options: [
        'La Tierra estaba algo más lejos de 1 UA, así que cada flujo es menor que a 1 UA: un 1,8 por ciento demasiado baja',
        'El Sol emitió un 1,8 por ciento menos de potencia esos días que cualquier otro',
        'Omitirla no cambia nada: un flujo es un flujo',
        'La Tierra estaba más cerca de 1 UA, así que el flujo es mayor y la luminosidad demasiado alta',
      ],
      misconceptions: [
        {
          say: 'La corrección es por dónde estaba la Tierra, no por lo que hizo el Sol. A 1 UA los seis días difieren en menos de un 0,1 por ciento; el resto del 1,8 por ciento es la distancia.',
        },
        {
          say: 'Un flujo cae con el cuadrado de la distancia, así que depende de dónde se midió. Dos flujos solo son comparables a una misma distancia.',
        },
      ],
      hints: [
        '¿La distancia de la Tierra esos días es mayor o menor que 1 UA?',
      ],
      because:
        'La Tierra estaba entre un 0,8 y un 1 por ciento más lejos que 1 UA, así que cada flujo es de un 1,7 a un 1,9 por ciento menor que a 1 UA. Omitir la corrección da una luminosidad un 1,8 por ciento demasiado baja y una temperatura de 5746 K en vez de 5772 K.',
    },
    {
      title: 'Lo que has deducido',
      body: 'Un flujo medido en la Tierra se lleva a 1 UA con la distancia, y seis días dan 1361,2 W/m<sup>2</sup> a 1 UA. Multiplicado por el área de una esfera es una luminosidad de 3,828 &times; 10<sup>26</sup> W, y una superficie del tamaño del Sol tendría que estar a 5772 K para irradiarla. La corrección importa: omitirla da una luminosidad un 1,8 por ciento demasiado baja. Los pasos más profundos miran qué muestran los seis días, cuán segura es la media y qué deja fuera.',
    },
  ],
};

export default {
  'why-venus-is-hot': WHY_VENUS_IS_HOT,
  'two-greenhouse-models': TWO_GREENHOUSE_MODELS,
  'the-turning-sun': THE_TURNING_SUN,
  'the-suns-power': THE_SUNS_POWER,
};
