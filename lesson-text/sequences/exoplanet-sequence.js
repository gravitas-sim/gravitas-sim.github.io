export const ONE_PLANET_EVERY_METHOD_ES = {
  title: 'Un planeta, todos los métodos',
  subtitle:
    'Sigue a un planeta por el tránsito, la curva de velocidades, el ajuste conjunto y la lista de comprobación, y anota cada registro con su incertidumbre',
  objectives: [
    'Decir qué da un tránsito (una razón de radios, una profundidad, la forma) y qué da una curva de velocidades (una amplitud), y que una densidad necesita las dos',
    'Leer la densidad de un planeta con su incertidumbre en un ajuste conjunto, y decir qué parte de esa incertidumbre es de la estrella',
    'Decir que un candidato que supera una lista de comprobación no está validado, y qué debe llevar un informe además de los valores',
    'Escribir un registro por método, cada uno con su valor, su incertidumbre, su método y su suposición',
  ],
  steps: {
    'two-methods-one-planet': {
      title: 'Dos métodos, un planeta',
      body: `Un planeta que pasa delante de su estrella la atenúa, y la caída es el área del planeta como fracción de la de la estrella: una <em>razón</em> de radios de 0,118, una profundidad del 1,40 por ciento, una forma que da el tamaño de la órbita en radios estelares (9,04) y un periodo de 3,52 días. El mismo planeta tira de su estrella a un lado y a otro, y la curva de velocidades da una amplitud de 85,6 metros por segundo.
             \n\nNinguno da lo que más queremos saber de la composición del planeta. Una densidad necesita una masa y un radio, y cada uno necesita a la <em>estrella</em>: la razón está en radios estelares, y la amplitud es una masa solo con la masa de la estrella dentro. El panel es el ajuste conjunto de los dos conjuntos de datos para un Júpiter caliente <strong>sintético</strong> (con un periodo como el de HD 209458 b, para que las respuestas se conozcan), con la incertidumbre de la estrella en los controles.`,
    },
    'what-needs-both': {
      title: 'Qué necesita los dos',
      body: `Mira qué mide cada método y qué deduce el panel de los dos juntos.`,
      prompt:
        '¿Cuál de estas cosas necesita la curva de tránsito y la de velocidades?',
      options: [
        'La densidad media del planeta: la masa de la curva de velocidades, el radio del tránsito y la estrella detrás de las dos',
        'El periodo orbital: hacen falta los dos métodos para hallarlo',
        'La razón de radios: la fija la curva de velocidades',
        'La profundidad de la caída: necesita la masa del planeta',
      ],
      hints: [
        'La densidad es masa entre volumen. ¿Qué método da una masa y cuál un tamaño?',
      ],
      because:
        'La densidad media. La curva de velocidades da la masa (con la masa de la estrella dentro), el tránsito da el radio (en radios estelares) y la densidad necesita las dos. El periodo y la profundidad salen solo del tránsito, y ninguno necesita la masa del planeta.',
      misconceptions: [
        {
          say: 'Cada método halla el periodo por sí solo; es lo que hace que los dos conjuntos de datos compartan un reloj, y por eso el ajuste puede usar ambos.',
        },
        {
          say: 'La razón de radios es del tránsito, y es el tamaño de la sombra; la curva de velocidades no sabe nada del tamaño.',
        },
      ],
    },
    'read-the-record': {
      title: 'Lee la densidad y lo que lleva',
      body: `Con la masa de la estrella incierta en un 5 por ciento, su radio en un 3,5 y los dos correlacionados (los valores con que se abre el panel), lee la <strong>densidad media</strong> del planeta y su <strong>incertidumbre a una sigma</strong> (el «más menos») en g/cm³. Un valor sin su incertidumbre todavía no es un registro.`,
      fields: [
        { label: 'Densidad media' },
        { label: 'Su incertidumbre a una sigma (más menos)' },
      ],
    },
    'the-star-share': {
      title: 'Cuánto es de la estrella',
      body: `La incertidumbre de la densidad tiene dos fuentes: los datos del propio planeta (el tránsito y las velocidades) y la masa y el radio declarados de la estrella. Pon las dos incertidumbres de la estrella en <strong>0</strong> y lee otra vez la incertidumbre de la densidad, y luego vuelve a ponerlas.`,
      prompt:
        '¿Qué fracción de la varianza de la densidad viene de la incertidumbre de la estrella con los valores iniciales?',
      options: [
        'Cerca de la mitad: los datos del planeta y la estrella aportan una parte parecida',
        'Casi nada: los datos deciden la densidad y la estrella solo fija una escala',
        'Casi todo: los datos no aportan nada',
        'No se puede decir sin conocer la densidad verdadera del planeta',
      ],
      hints: [
        'La lectura da la parte de la varianza que añade la estrella. Con la estrella exacta, la incertidumbre baja de 13,8 a cerca de 10 por ciento.',
      ],
      because:
        'Cerca de la mitad (el 46 por ciento de la varianza). Con la estrella tomada como exacta, la densidad sigue siendo incierta en cerca de un 10 por ciento por los datos del planeta, y la masa y el radio de la estrella añaden el resto. Una estrella mejor ayudaría tanto como una curva de luz mejor.',
      misconceptions: [
        {
          say: 'La estrella no es solo una escala: su radio fija el radio del planeta y su masa fija la masa del planeta, y la densidad hereda las dos.',
        },
        {
          say: 'Los datos sí aportan: con la estrella exacta la densidad sigue siendo incierta en cerca de un 10 por ciento.',
        },
      ],
    },
    'a-dip-is-a-candidate': {
      title: '¿Es un planeta?',
      body: `Antes de todo esto, la caída tenía que ser un planeta. El panel muestra un candidato (un sistema sintético distinto del de arriba; ningún panel lleva todos los métodos en una estrella) que ha pasado tres pruebas: si las caídas impares y pares coinciden, si aparece un segundo eclipse media órbita después y si la luz se mueve en el cielo durante la caída. Pasa las tres.`,
      prompt: '¿Validan al candidato como planeta las tres pruebas superadas?',
      options: [
        'No: ha superado las pruebas que se hicieron; lo que esas pruebas no pueden ver sigue abierto',
        'Sí: tres pruebas bastan para validar cualquier planeta',
        'Sí, si la caída es lo bastante profunda',
        'No: un candidato nunca puede validarse',
      ],
      hints: [
        'Una prueba puede rechazar un falso positivo; superarla no excluye los que la prueba no puede ver.',
      ],
      because:
        'Superar no es validar. Cada prueba rechaza algunos falsos positivos y deja pasar otros, y una lista con todo aprobado deja los que ninguna prueba podía ver. Validar es una afirmación sobre lo probable que es cada alternativa, no un recuento de pruebas superadas.',
      misconceptions: [
        {
          say: 'No hay un número de pruebas que baste en general; lo que importa es qué falsos positivos puede ver cada prueba y cuáles no.',
        },
        {
          say: 'Los candidatos se validan, mostrando que las alternativas son mucho menos probables que un planeta; superar una lista es una aportación, no el todo.',
        },
      ],
    },
    'the-record': {
      title: 'El registro',
      body: `Un informe de este planeta lleva una fila por cada cosa que dice, y cada fila tiene su <strong>valor</strong>, su <strong>incertidumbre</strong>, su <strong>método</strong> y su <strong>suposición</strong>: el periodo (el tránsito), la profundidad del 1,40 por ciento (el tránsito), la amplitud de velocidad de 85,6 m/s (las velocidades), la masa de 0,684 &plusmn; 0,024 masas de Júpiter (el ajuste conjunto, con la masa de la estrella dentro), el radio de 1,325 &plusmn; 0,064 radios de Júpiter (el ajuste conjunto, en radios estelares y por tanto con el radio de la estrella dentro), la densidad de 0,365 &plusmn; 0,050 g/cm³ y, junto a ellas, la fila de la comprobación: <em>supera tres pruebas, no validado</em>.
             \n\nHay dos cosas que van en el informe y no son valores: la parte de cada incertidumbre que es de la estrella, porque dice dónde ayudaría una medida mejor, y los fallos y las pruebas sin decidir, porque quien lee necesita saber qué se intentó. Los pasos más profundos ponen el cuarto método, un eclipse, junto a estos.`,
    },
  },
};

export const ONE_PLANET_EVERY_METHOD_DEEPER_ES = {
  steps: {
    'the-depth': {
      title: 'De la razón a la caída',
      body: `Una caída es el área del planeta entre la de la estrella, así que es la <em>razón</em> de radios al cuadrado. La razón que dio el tránsito es 0,1184.`,
      prompt: 'La profundidad de la caída, como porcentaje',
      hints: ['Eleva 0,1184 al cuadrado y multiplica por 100.'],
      worked:
        '0,1184² = 0,01402, así que el 1,40 por ciento de la luz de la estrella. Un planeta de una décima del radio de la estrella tapa una centésima de su luz.',
      feedback: {
        close: 'Casi. Eleva la razón al cuadrado y exprésala como porcentaje.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: eleva la razón al cuadrado y convierte la fracción en porcentaje.',
        off: '0,1184 × 0,1184 × 100.',
      },
    },
    'what-the-star-costs': {
      title: 'La parte del propio planeta',
      body: `Pon las incertidumbres de masa y radio de la estrella en <strong>0</strong>: la incertidumbre de la densidad que queda es solo la de los datos del planeta. Lee el «más menos» y divídelo entre la densidad para obtener un porcentaje.`,
      prompt:
        'La incertidumbre de la densidad con la estrella exacta, como porcentaje del valor',
      hints: ['Léela con las dos incertidumbres de la estrella en 0 %.'],
      worked:
        'Cerca del 10,1 por ciento. Con los valores iniciales era 13,8, y las dos partes se suman en cuadratura: la parte de la estrella sola es cerca de 9,3 por ciento, y 10,1² + 9,3² es 13,8².',
      feedback: {
        close:
          'Casi. Lee la incertidumbre relativa de la densidad con las dos incertidumbres de la estrella en 0.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: es de unos pocos por ciento a unas pocas decenas, no una décima ni mil.',
        off: 'Pon las dos incertidumbres de la estrella en 0 % y lee la de la densidad.',
      },
    },
    'a-worse-star': {
      title: 'Una estrella mal conocida',
      body: `Ahora pon las incertidumbres de masa y radio de la estrella en <strong>8 por ciento</strong> (el sexto paso de los controles), con la misma correlación, y lee la incertidumbre de la densidad como porcentaje de su valor (el «más menos» entre la densidad).`,
      prompt:
        'La incertidumbre de la densidad con la estrella al 8 por ciento, como porcentaje del valor',
      hints: [
        'Es más que el 13,8 por ciento de los valores iniciales, y la parte de la estrella crece.',
      ],
      worked:
        'Cerca del 24,1 por ciento, y el 82 por ciento de la varianza es ya de la estrella. Pasado este punto una curva de luz mejor no compra nada: la estrella es el límite, y por eso los parámetros estelares de un anfitrión se miden antes de interpretar sus planetas.',
      feedback: {
        close:
          'Casi. Pon las dos incertidumbres en 8 por ciento y lee la de la densidad.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: son unas pocas decenas de por ciento, no unos pocos ni cientos.',
        off: 'Las dos incertidumbres de la estrella en 8 por ciento, correlación 0,5: lee la incertidumbre relativa de la densidad.',
      },
    },
    'the-eclipse': {
      title: 'Un cuarto método: el eclipse',
      body: `Cuando un planeta pasa detrás de su estrella, la luz que emite desaparece un rato, y la <strong>profundidad del eclipse</strong> en una banda es el brillo propio del planeta entre el de la estrella. El panel muestra cuatro bandas de un planeta <strong>sintético</strong> (otro sistema, declarado como tal; no se comparó ninguna tabla publicada). Con la luz reflejada en <strong>suponer ninguna</strong>, lee la temperatura de brillo en la banda de 3,2 a 4,0 micras.`,
      prompt: 'La temperatura de brillo en la banda de 3,2 a 4,0 micras',
      hints: [
        'Es la temperatura del cuerpo negro que daría esa profundidad en esa banda.',
      ],
      worked:
        'Cerca de 2094 K. Es una cota bajo suposiciones que declara la lectura (un cuerpo negro uniforme, sin luz reflejada, una sola capa isoterma): es el lado diurno del planeta en una banda, no su temperatura, y va en el informe con esas palabras.',
      feedback: {
        close:
          'Casi. Lee la fila de 3,2 a 4,0 micras con la luz reflejada en suponer ninguna.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: el lado diurno de un planeta caliente está en un par de miles de kelvin.',
        off: 'Pon la luz reflejada en suponer ninguna y lee la temperatura de brillo de la tercera banda.',
      },
    },
  },
};

export const WHAT_KINDS_OF_PLANETS_EXIST_ES = {
  title: '¿Qué tipos de planetas existen?',
  subtitle:
    'Lee los planetas por su masa y su radio, y luego la cuadrícula de tamaños y periodos de un sondeo frente a lo que el sondeo podía ver',
  objectives: [
    'Leer la densidad media de un planeta por su lugar entre las líneas de densidad constante de un diagrama masa-radio, y decir qué dice y qué no dice una densidad baja',
    'Decir que un sondeo ve más fácilmente los planetas grandes y cercanos, y leer la probabilidad de que recupere un planeta de un tamaño y periodo dados',
    'Leer una tasa a partir de unos pocos planetas listados, y decir por qué un intervalo sin listados es un límite superior en un sitio y no está acotado en otro',
    'Decir que un diagrama de masa y radio no puede decir si un planeta conserva una atmósfera',
  ],
  steps: {
    'a-diagram-of-planets': {
      title: 'Un diagrama de planetas',
      body: `Pon cada planeta en una gráfica de su <strong>masa</strong> contra su <strong>radio</strong>, ambos en unidades terrestres, y añade líneas de <strong>densidad media</strong> constante. Los planetas del Sistema Solar caen en grupos: la Tierra, Venus y Mercurio cerca de 5,5 gramos por centímetro cúbico, roca y metal; Júpiter y Saturno cerca de 1,3 y 0,7, sobre todo hidrógeno; Urano y Neptuno cerca de 1,3 a 1,6, en medio.
             \n\nEl panel muestra las líneas y el Sistema Solar, con la caja del Júpiter caliente sintético de la investigación <em>Un planeta, todos los métodos</em>, dibujada con su incertidumbre. Nada de esto dice de qué está hecho un planeta; dice qué densidad tiene, y varias mezclas pueden tener una misma densidad.`,
    },
    'what-the-density-says': {
      title: 'Qué dice la caja',
      body: `La caja del Júpiter caliente está en unas 217 masas terrestres y 14,9 radios terrestres, con las líneas de 0,3, 1, 3, 5,51 y 12 gramos por centímetro cúbico alrededor.`,
      prompt: '¿Qué afirmación apoya su lugar?',
      options: [
        'Su densidad es cerca de 0,37 g/cm³, muy por debajo de cualquier roca: la mayor parte de su volumen debe ser un gas ligero',
        'Está hecho sobre todo de roca, porque es pesado',
        'Es un gemelo de Júpiter, porque tiene casi la misma masa',
        'Tiene una atmósfera fina, porque su densidad es baja',
      ],
      hints: [
        'Busca la línea de densidad constante más cercana y compárala con la línea de 5,51 de la Tierra.',
      ],
      because:
        'Una densidad entre 0,3 y 0,4 g/cm³ está muy por debajo de la roca, así que gran parte del volumen es un gas de baja densidad. Un diagrama puede decir tanto; no puede decir cómo se mezclan el gas y un posible núcleo, y no dice nada del grosor de una atmósfera.',
      misconceptions: [
        {
          say: 'La masa sola no es densidad: este planeta es pesado y muy grande, y el gran volumen da la densidad baja.',
        },
        {
          say: 'Júpiter es más denso (1,33 g/cm³) y más pequeño. Un planeta de la masa de Júpiter pero de radio mucho mayor es otro objeto.',
        },
      ],
    },
    'what-the-survey-sees': {
      title: 'Lo que un sondeo podía ver',
      body: `Un diagrama de los planetas que halló un sondeo es un diagrama de lo que el sondeo <em>podía</em> hallar. El panel muestra, para un sondeo sintético de 2000 estrellas, la probabilidad de que se recupere un planeta en tránsito de un tamaño y un periodo dados: la <strong>eficiencia</strong>. Combina la caída menos profunda de un planeta pequeño, los menos tránsitos de un periodo largo y la propia búsqueda del sondeo. Los planetas sintéticos salen de una verdad conocida, así que los pasos siguientes pueden decir cuánto se aleja el recuento del sondeo de ella.`,
    },
    'larger-is-easier': {
      title: 'Más grande es más fácil',
      body: `Con periodos de 32 a 64 días, el panel da la eficiencia de los planetas de 0,5 a 1 radios terrestres y de los de 4 a 8 radios terrestres.`,
      prompt: '¿Cómo se comparan?',
      options: [
        'Los planetas grandes se recuperan unas cuatro veces más a menudo (81 por ciento frente a 20), así que un recuento de planetas grandes está más cerca de la verdad',
        'Se recuperan por igual, porque el periodo es el mismo',
        'Los planetas pequeños se recuperan más a menudo, porque hay más',
        'Ninguno se recupera, porque 32 a 64 días es demasiado largo para un sondeo',
      ],
      hints: [
        'Lee las dos barras del panel en el intervalo de periodos de 32 a 64 días.',
      ],
      because:
        'La eficiencia entre 32 y 64 días es 81 por ciento para 4 a 8 radios terrestres y 20 por ciento para 0,5 a 1: la caída de un planeta pequeño es poco profunda, y el sondeo halla uno de cada cinco. La abundancia no cambia la probabilidad de recuperar un planeta dado; cambia cuántos hay que recuperar.',
      misconceptions: [
        {
          say: 'El periodo es el mismo, pero la caída no: la del planeta pequeño es mucho menos profunda y a menudo se pierde en el ruido.',
        },
        {
          say: 'Cuántos planetas hay no es lo mismo que la probabilidad de hallar uno que está ahí; la eficiencia es lo segundo.',
        },
      ],
    },
    'a-rate-from-few': {
      title: 'Una tasa a partir de unos pocos',
      body: `En la cuadrícula, el intervalo de <strong>0,5 a 1 radios terrestres</strong> y <strong>32 a 64 días</strong> lista solo unos pocos planetas, porque el sondeo apenas podía verlos. Lee cuántos lista y la tasa por estrella en que la completitud del sondeo convierte ese recuento (la primera semilla, fiabilidad como se declara).`,
      fields: [
        { label: 'Planetas listados en el intervalo' },
        { label: 'La tasa, en planetas por estrella' },
      ],
    },
    'what-an-atmosphere-needs': {
      title: '¿Podría tener una atmósfera?',
      body: `Una pregunta natural es si un planeta de una masa y un radio dados conserva un gas, y el diagrama no la responde. Una densidad baja dice que el planeta <em>tiene</em> una envoltura gruesa; si un mundo pequeño y caliente puede <em>retener</em> una es un equilibrio entre lo rápido que se mueve el gas a su temperatura y lo que tarda en escapar, y depende de la luz de la estrella a lo largo del tiempo, que ningún diagrama de masa y radio lleva.
             \n\nEl cálculo del escape de un gas de un mundo quedó fuera de este proyecto (se juzgó que los modelos no podían sostenerlo al nivel que mantiene el resto de la unidad), así que este es un paso de lectura y no una investigación. La afirmación honesta de este diagrama es la de la caja: una densidad media, con su incertidumbre, y nada sobre lo que un planeta conserva.`,
    },
    'kinds-and-what-they-hide': {
      title: 'Tipos, y lo que oculta cada diagrama',
      body: `Dos diagramas, dos clases de afirmación. El diagrama masa&ndash;radio dice cuál es la densidad media de un planeta y por tanto a qué familia pertenece, con la incertidumbre que añade la estrella. La cuadrícula de tamaños y periodos dice cuántos planetas pudo contar un sondeo en cada intervalo, y una tasa sale solo cuando se declara la completitud del sondeo: pocos listados en un intervalo débil es un rango amplio, y un intervalo que el sondeo no podía ver no dice nada.
             \n\nNinguno de los dos diagramas es un mapa de los planetas que existen. Qué tipos parecen comunes en un listado depende de cuáles son fáciles de ver, y los pasos más profundos dicen cómo distinguirlo.`,
    },
  },
};

export const WHAT_KINDS_OF_PLANETS_EXIST_DEEPER_ES = {
  steps: {
    'jupiters-density': {
      title: 'La densidad de Júpiter por su lugar',
      body: `En unidades terrestres, la densidad es los 5,51 g/cm³ de la Tierra por la masa dividida entre el radio al cubo. Júpiter tiene 317,8 masas terrestres y 10,96 radios terrestres.`,
      prompt: 'La densidad media de Júpiter',
      hints: ['5,51 × 317,8 / 10,96³; el cubo de 10,96 es cerca de 1317.'],
      worked:
        '10,96³ = 1317, y 317,8 / 1317 = 0,2413, así que 5,51 × 0,2413 = 1,33 g/cm³: una cuarta parte de la densidad de la Tierra, y por eso los planetas de su clase están lejos de la línea de la roca.',
      feedback: {
        close:
          'Casi. Eleva el radio al cubo, divide la masa entre él y multiplica por 5,51.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: un gigante gaseoso tiene cerca de una cuarta parte de la densidad de la Tierra, no diez veces ni una décima.',
        off: '5,51 × 317,8 / 10,96³.',
      },
    },
    'efficiency-ratio': {
      title: 'Cuánto más fácil',
      body: `Entre 32 y 64 días la eficiencia es 81 por ciento para planetas de 4 a 8 radios terrestres y 20 por ciento para planetas de 0,5 a 1.`,
      prompt: '¿Cuántas veces es más probable recuperar el planeta grande?',
      hints: ['Divide la eficiencia mayor entre la menor.'],
      worked:
        '81 / 20 = 4,05, que es 4,0 con la precisión que da el panel. Para contar los planetas pequeños con honradez, cada uno listado tiene que representar unos cinco que había.',
      feedback: {
        close: 'Casi. Divide 81 entre 20.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: la razón es unos pocos, no decenas.',
        off: '81 / 20.',
      },
    },
    'an-upper-limit': {
      title: 'Dos intervalos vacíos',
      body: `Dos intervalos no listan ningún planeta. En el de 4 a 8 radios terrestres y 2 a 4 días el sondeo listaría unos 242 planetas por cada planeta por estrella que hay; en el de 0,5 a 1 radios terrestres y 128 a 256 días solo unos 1,3. El panel da al primero un límite superior de cerca de 0,012 por estrella y dice que el segundo <em>no está acotado</em>.`,
      prompt: '¿Por qué los mismos listados vacíos dicen cosas tan distintas?',
      options: [
        'El primer intervalo se buscó a fondo, así que no hallar ninguno descarta una tasa alta; el segundo apenas se buscó, así que no hallar ninguno casi no dice nada',
        'El primer intervalo tiene menos planetas en realidad, y el segundo más',
        'El panel es incoherente: un intervalo vacío es un intervalo vacío',
        'El primer intervalo está más cerca de la estrella, así que no se cuentan los planetas',
      ],
      hints: [
        'Pregunta cuántos planetas habría listado el sondeo si estuvieran ahí a una tasa dada.',
      ],
      because:
        'La completitud. Con un rendimiento de 242 por planeta por estrella, una tasa por encima de cerca de 0,012 habría producido muy probablemente un listado, así que ninguno es un límite superior. Con 1,3, una tasa de uno por estrella produciría un listado de media, así que ninguno no dice nada: el sondeo es ciego ahí.',
      misconceptions: [
        {
          say: 'La verdad puede ser cualquier cosa en los dos; lo que difiere es lo bien que el sondeo habría visto un planeta si lo hubiera.',
        },
        {
          say: 'Un listado vacío significa cosas distintas cuando la búsqueda fue a fondo y cuando fue ciega; declarar el rendimiento es lo que las separa.',
        },
      ],
    },
    'a-selection-in-each-diagram': {
      title: 'La selección de cada diagrama',
      body: `Para los planetas más pequeños la eficiencia cae de 64 por ciento a 1 a 2 días a 8 por ciento a 128 a 256 días. Para los mayores se mantiene por encima de 99 por ciento hasta 32 días.`,
      prompt:
        '¿Qué diagrama de los planetas que un sondeo <em>listó</em> engañaría si se leyera como un diagrama de los planetas que existen?',
      options: [
        'Los dos: el listado de periodo contra radio se agolpa hacia los planetas grandes y cercanos porque son fáciles de ver, y el diagrama masa-radio de planetas medidos se limita a los que tienen tránsito y amplitud de velocidad',
        'Ninguno: un sondeo lista todos los planetas que hay',
        'Solo el diagrama periodo–radio: un diagrama masa-radio no tiene selección',
        'Solo el diagrama masa-radio: un diagrama periodo–radio cuenta todos los planetas',
      ],
      hints: [
        'Un planeta tiene que hallarse, y para una masa tiene que medirse además por otro método.',
      ],
      because:
        'Los dos. El listado de tamaños y periodos lo da la eficiencia, mucho menor para planetas pequeños y lejanos. El diagrama masa–radio guarda solo los planetas con masa medida además, que son los de gran amplitud de velocidad. Una tasa necesita la completitud; una densidad media necesita las dos medidas, y las que faltan no faltan al azar.',
      misconceptions: [
        {
          say: 'Un sondeo lista lo que podía ver; la eficiencia de 8 por ciento de los planetas pequeños de periodo largo dice que ve uno de cada doce.',
        },
        {
          say: 'Un diagrama masa-radio tiene su propia selección: un planeta necesita una masa, y las masas se miden en los planetas que más tiran de su estrella.',
        },
      ],
    },
  },
};

export const THE_TRANSIT_THAT_WAS_A_STAR_ES = {
  title: 'El tránsito que era una estrella',
  subtitle:
    'Cuatro candidatos cuyas caídas eran en realidad una estrella: qué rechazó a dos de ellos, qué no puede ver una lista de comprobación en los otros y qué hace una vecina a la caída de un planeta real',
  objectives: [
    'Decir por qué las caídas alternas de distinta profundidad apuntan a un par eclipsante al doble del periodo',
    'Decir qué hace un par de estrellas iguales a la prueba impar-par, y qué ve la prueba de la imagen diferencia',
    'Decir por qué una mezcla dentro del radio de exclusión de la prueba supera todas las pruebas, y qué cuesta eso a una afirmación',
    'Decir las dos formas en que una vecina cambia un tránsito: puede ser la caída, o puede diluir una real',
  ],
  steps: {
    'a-dip-with-company': {
      title: 'Una caída con compañía',
      body: `Muchas estrellas de un sondeo tienen una vecina demasiado cerca para separarla, y una vecina puede ser una <strong>binaria eclipsante</strong>: dos estrellas que pasan una delante de la otra. Sus eclipses parecen un tránsito, solo que más o menos profundos, y la luz de la estrella objetivo los diluye. El panel tiene ocho candidatos <strong>sintéticos</strong>; esta investigación recorre cuatro cuya verdad es una mezcla.
             \n\nEl candidato <strong>B</strong> es el primero. Sus caídas impares y pares (las de órbitas alternas) se dibujan por separado: las dos difieren por un margen amplio (0,93 por ciento y 0,44 por ciento).`,
    },
    'odd-and-even': {
      title: 'Impares y pares',
      body: `Un planeta tapa la misma fracción de la luz en cada tránsito. Las caídas del candidato B vienen en dos tamaños que se alternan.`,
      prompt: '¿Qué dice la alternancia?',
      options: [
        'Las caídas son dos eclipses distintos de un par de estrellas: la más profunda es una estrella delante de la otra, la menos profunda lo inverso, y el periodo verdadero es el doble del buscado',
        'El planeta cambia de tamaño de una órbita a la siguiente',
        'El telescopio mide mal cada segundo tránsito',
        'El planeta tiene dos lunas, una por cada caída',
      ],
      hints: [
        'Un par de estrellas de distinto brillo superficial da un eclipse más profundo cuando se tapa la estrella más caliente.',
      ],
      because:
        'Un par de estrellas de distinto brillo da dos eclipses distintos por órbita, y una búsqueda que mira una caída por periodo halla la mitad del periodo real. La diferencia impar–par es 98 veces su incertidumbre, así que no es ruido. Un planeta no cambia de tamaño, y por eso funciona la prueba.',
      misconceptions: [
        {
          say: 'Un planeta no cambia de tamaño entre órbitas; un cambio de profundidad de esa escala indica que no es un solo cuerpo cruzando una sola estrella.',
        },
        {
          say: 'La diferencia es unas 98 veces su incertidumbre: es demasiado grande para ser una mala medida de una sola profundidad.',
        },
      ],
    },
    'the-twin': {
      title: 'La gemela',
      body: `El candidato <strong>D</strong> tiene caídas impares y pares iguales (0,715 y 0,713 por ciento), ningún segundo eclipse y <em>ninguna imagen</em>, así que no se hizo la prueba de la imagen diferencia. Pasa todas las pruebas que se le hicieron.`,
      prompt: '¿Qué puede decirse de D?',
      options: [
        'Nada en los datos lo rechaza, y nada lo valida: dos estrellas iguales dan caídas iguales, y no se hizo la única prueba que podía ver a una vecina',
        'Es un planeta, porque pasa todas las pruebas que se hicieron',
        'Es una estrella, porque las caídas son iguales',
        'No puede ser nada, porque no hay imágenes',
      ],
      hints: [
        'Dos estrellas idénticas que se eclipsan dan la misma caída siempre. ¿Qué prueba no se hizo?',
      ],
      because:
        'D supera las pruebas, y es una mezcla justo de la clase que las dos primeras no pueden captar: un par de estrellas iguales al doble del periodo da una caída cada periodo, todas iguales, así que las impares y las pares coinciden y no aparece nada media órbita después. Solo una prueba de dónde cae la luz en el cielo podía verla, y no se hizo.',
      misconceptions: [
        {
          say: 'Superar las pruebas que se pudieron hacer no es validar; una prueba que no se hizo no podía rechazar nada.',
        },
        {
          say: 'Caídas iguales no prueban una estrella: son lo que dan dos estrellas iguales y también lo que da un planeta, que es el punto.',
        },
      ],
    },
    'the-frames': {
      title: 'Las imágenes',
      body: `El candidato <strong>E</strong> tiene las mismas caídas iguales, pero con imágenes tomadas durante las caídas y entre ellas. La prueba de la <strong>imagen diferencia</strong> mide dónde está en el cielo la luz que desapareció. Lee a qué distancia del objetivo queda el centroide de la luz que falta, en píxeles.`,
      fields: [{ label: 'Desplazamiento de la luz que cae' }],
    },
    'too-close-to-see': {
      title: 'Demasiado cerca para verla',
      body: `El candidato <strong>G</strong> también tiene imágenes y las mismas caídas iguales. La luz que cae está a solo 0,17 píxeles del objetivo, y el radio de exclusión de la prueba para este es 0,30. Supera las tres pruebas.`,
      prompt: '¿Qué significa que G supere la prueba del centroide?',
      options: [
        'Significa que la vecina, si la hay, está dentro del radio de exclusión de la prueba: la prueba no puede situar la caída fuera del objetivo, y una mezcla tan cercana la supera',
        'Significa que la caída está en el objetivo, así que G es un planeta',
        'Significa que la prueba está rota',
        'Significa que el radio de exclusión es cero',
      ],
      hints: [
        'Una prueba que mide una posición tiene un desplazamiento mínimo que puede resolver, y por debajo dice en el objetivo.',
      ],
      because:
        'La prueba no ve dentro de su radio de exclusión. G pasa porque la caída está a menos de 0,30 píxeles del objetivo, lo que incluye una vecina que de verdad está a 0,15 (activa la verdad del panel para ver que G es una mezcla). Una prueba del centroide superada dice que la caída está en el objetivo dentro de ese radio, no mejor.',
      misconceptions: [
        {
          say: '«En el objetivo» significa dentro del radio de exclusión, que aquí es mayor que la separación de una mezcla que de verdad está ahí.',
        },
        {
          say: 'La prueba funciona como se diseñó; tiene una resolución, y una vecina más cercana que eso la supera.',
        },
      ],
    },
    'the-whole-story': {
      title: 'La historia entera',
      body: `Una vecina cambia un tránsito de dos formas. Puede <strong>ser</strong> la caída: un par eclipsante que las pruebas rechazan cuando pueden verlo (B por sus dos profundidades, E por dónde cae la luz) y supera cuando no pueden (D sin imágenes, G dentro del radio de exclusión). O puede <strong>diluir</strong> un planeta real: la luz de más rellena la caída, y el planeta se mide menor de lo que es. El panel de dilución muestra el segundo caso: un planeta medido de 2 radios terrestres con una compañera una magnitud más débil es un planeta de 2,4.
             \n\nLos dos casos son opuestos en lo que hacen a una afirmación: el primero puede hacer un planeta de una estrella, y el segundo puede hacer que parezca rocoso un mundo que no lo era. La respuesta en ambos es una imagen de alta resolución del anfitrión, a lo que los pasos más profundos ponen números.`,
    },
  },
};

export const THE_TRANSIT_THAT_WAS_A_STAR_DEEPER_ES = {
  steps: {
    'the-two-depths': {
      title: 'Cuánto menos profunda',
      body: `Las caídas impares del candidato B tienen un 0,927 por ciento de profundidad y las pares un 0,436 por ciento.`,
      prompt: 'La profundidad par como fracción de la impar',
      hints: ['Divide la profundidad par entre la impar.'],
      worked:
        '0,436 / 0,927 = 0,47. Para dos eclipses de un mismo par, la razón de profundidades es la razón de los brillos superficiales de las dos estrellas, así que la estrella que está delante en el eclipse más profundo es cerca del doble de brillante por unidad de área que la otra.',
      feedback: {
        close: 'Casi. Divide 0,436 entre 0,927.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: las dos profundidades son de un tamaño parecido, así que la razón está cerca de un medio.',
        off: '0,436 / 0,927.',
      },
    },
    'the-diluted-radius': {
      title: 'El planeta tras el resplandor',
      body: `Una curva de luz mezclada dio un planeta de 2,0 radios terrestres, y una compañera en la apertura es una magnitud más débil que la estrella. La corrección del panel es la raíz cuadrada de uno más la razón de flujos de la compañera.`,
      prompt: 'El radio verdadero del planeta',
      hints: [
        'La razón de flujos de una estrella una magnitud más débil es 10 elevado a menos 0,4, cerca de 0,398.',
      ],
      worked:
        'La razón de flujos es 0,398, la corrección es √1,398 = 1,18 y el radio 2,0 × 1,18 = 2,37 R⊕. Siempre sube: una vecina solo puede hacer que un planeta parezca menor.',
      feedback: {
        close: 'Casi. Multiplica 2,0 por la raíz cuadrada de 1 más 0,398.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: la corrección es una fracción de un radio, no un factor de diez.',
        off: '2,0 × √(1 + 10^(−0,4)).',
      },
    },
    'the-share-of-the-light': {
      title: 'Cuánta de la luz es de la vecina',
      body: `Pon el contraste de la compañera en <strong>0,5</strong> magnitudes y lee la parte de la luz de la apertura que no viene de la estrella en tránsito.`,
      prompt: 'La parte de la luz que viene de la compañera',
      hints: [
        'Es f entre 1 + f, donde f es la razón de flujos, 0,631 para media magnitud.',
      ],
      worked:
        '0,631 / 1,631 = 0,387: casi dos quintos de la luz no son de la estrella objetivo, y el radio del planeta sale demasiado pequeño por un factor de 1,28.',
      feedback: {
        close: 'Casi. La parte es f / (1 + f) con f = 10^(−0,2).',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: la parte es unas pocas decenas de por ciento.',
        off: '0,631 / 1,631 × 100.',
      },
    },
    'how-faint-is-harmless': {
      title: 'Cuán débil es inofensiva',
      body: `La dilución cambia un radio en menos de un uno por ciento cuando la corrección es menor que 1,01, es decir, cuando la razón de flujos es menor que 0,0201.`,
      prompt:
        'El contraste de la compañera con el que la corrección baja al 1 por ciento',
      hints: [
        'El contraste en magnitudes es −2,5 veces el logaritmo decimal de la razón de flujos.',
      ],
      worked:
        '−2,5 log₁₀(0,0201) = 4,24 magnitudes: una compañera más de cuatro magnitudes más débil cambia un radio en menos de un uno por ciento, y una tres magnitudes más débil en un tres.',
      feedback: {
        close: 'Casi. Toma −2,5 veces el logaritmo decimal de 0,0201.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: son unas pocas magnitudes.',
        off: '−2,5 × log₁₀(0,0201).',
      },
    },
  },
};

export const PLANNING_A_TRANSIT_CAMPAIGN_ES = {
  title: 'Planificar una campaña de tránsitos',
  subtitle:
    'Un planeta con una efeméride conocida, un observatorio, diez noches y el tiempo: qué tránsitos pueden captarse enteros y qué deja el cielo',
  objectives: [
    'Decir que una campaña de tránsitos necesita un tránsito entero y una línea base a cada lado dentro de la ventana de la noche, y hallar las noches que cumplen a partir de una efeméride',
    'Decir que el tiempo se lleva noches al azar y que un plan declara un recuento esperado, no una promesa',
    'Decir que una cadencia pensada para hallar un periodo no es una secuencia de tránsito',
    'Decir que un objetivo que está arriba demasiado poco tiempo no puede planificarse, y qué hace una efeméride que envejece a la línea base',
  ],
  steps: {
    'what-a-campaign-needs': {
      title: 'Qué necesita una campaña',
      body: `Un planeta de periodo conocido transita en momentos que puedes predecir, así que la pregunta no es <em>si</em> mirar sino <em>cuándo puede captarse entero</em>. Supón que un planeta transita cada <strong>2 días</strong>, que el primer tránsito está centrado <strong>1,0 hora después de la medianoche local</strong> de la primera noche, y que un tránsito dura <strong>2,8 horas</strong>. Para medir su profundidad quieres una hora de línea base a cada lado, así que <strong>4,8 horas</strong> seguidas de objetivo, cielo oscuro y buen tiempo.
             \n\nEl panel es el planificador de ventanas de observación para un telescopio de Cerro Tololo y un objetivo austral. Cada noche muestra la ventana en que el objetivo está arriba y el cielo oscuro (de 4,2 horas antes de la medianoche local a 4,7 horas después, la primera noche: 8,8 horas), y qué noches se llevó el tiempo (un sorteo sintético, con una semilla). Las visitas que también planea son una cadencia para hallar un periodo; esta investigación usa solo las ventanas y el tiempo.`,
    },
    'which-nights': {
      title: 'Qué noches',
      body: `Un tránsito cada 2 días cae a la misma hora de la noche una noche <em>sí y otra no</em>, y las noches intermedias no tienen ninguno. De las 10 noches del panel, cuenta las noches en que un tránsito entero más su línea base cabe en la ventana, sin contar el tiempo.`,
      fields: [{ label: 'Noches con un tránsito entero y línea base' }],
    },
    'what-the-weather-left': {
      title: 'Lo que dejó el tiempo',
      body: `El panel marca las noches que se llevó el tiempo. De las noches que hallaste, cuenta las que están despejadas.`,
      fields: [{ label: 'De esas noches, despejadas' }],
    },
    'the-other-target': {
      title: 'Un objetivo del norte',
      body: `Cambia el objetivo al <strong>del norte</strong> (el segundo). Desde el mismo telescopio su ventana de la primera noche es de solo 1,2 horas, de 4,3 horas antes de la medianoche local a 3,2 antes.`,
      prompt: '¿Qué le hace eso a la campaña?',
      options: [
        'La termina: un tránsito con su línea base necesita 4,8 horas y el objetivo está arriba 1,2, así que no puede captarse ningún tránsito entero desde este observatorio',
        'Reduce a la mitad el número de tránsitos, porque la ventana es más corta',
        'Nada: un tránsito dura 2,8 horas, y la ventana solo necesita ser de esa duración',
        'Ayuda: una ventana corta significa menos mal tiempo',
      ],
      hints: [
        'Compara 4,8 horas de objetivo con la ventana que muestra el panel.',
      ],
      because:
        'Una ventana más corta que el tránsito más la línea base no puede contener uno, por muchas noches que haya. Es lo primero que hay que comprobar en un plan, antes del tiempo o la cadencia: el objetivo tiene que estar arriba el tiempo suficiente. Otro observatorio, o una época del año en que el objetivo esté más alto, es el remedio.',
      misconceptions: [
        {
          say: 'No es una fracción de los tránsitos: ninguna noche tiene una ventana suficiente, así que el recuento es cero.',
        },
        {
          say: 'La línea base importa: sin tiempo a cada lado no puede medirse la profundidad frente a una estrella plana, así que la ventana necesita el tránsito y la línea base.',
        },
      ],
    },
    'visits-are-not-a-transit': {
      title: 'Las visitas no son un tránsito',
      body: `El panel también planea tres visitas cortas por noche, separadas una hora y media: una cadencia pensada para hallar un periodo desconocido sin dejarse engañar por alias.`,
      prompt: '¿Qué muestreo quiere en cambio un tránsito conocido?',
      options: [
        'Una secuencia continua desde una hora antes del ingreso previsto hasta una hora después del egreso, porque la forma de la caída es la medida',
        'Las mismas tres visitas por noche, porque una cadencia que halla un periodo halla un tránsito',
        'Una visita en el mínimo previsto del tránsito',
        'Una visita cada noche durante las diez noches',
      ],
      hints: [
        'Un tránsito es una forma en el tiempo. ¿Qué ve de ella una visita cada hora y media?',
      ],
      because:
        'Un tránsito dura menos de tres horas, y tres visitas repartidas en cuatro horas y media lo muestrearían en tres puntos. La secuencia que mide una profundidad, una duración y un instante de mitad de tránsito es continua a lo largo del suceso con línea base a ambos lados. La cadencia del plan es para otra pregunta.',
      misconceptions: [
        {
          say: 'Esa cadencia distingue un periodo de sus alias cuando el periodo se desconoce; con una efeméride conocida la pregunta es otra.',
        },
        {
          say: 'Un solo punto no puede dar una profundidad frente a una línea base ni una duración, y un error en la efeméride lo pondría fuera de la caída.',
        },
      ],
    },
    'the-campaign-in-one-line': {
      title: 'La campaña en una línea',
      body: `Una campaña de tránsitos es la intersección de tres cosas: la <strong>efeméride</strong> (cuándo están los tránsitos), la <strong>ventana</strong> (cuándo está el objetivo arriba en un cielo oscuro, el tiempo suficiente para el tránsito y su línea base) y el <strong>tiempo</strong> (que se lleva noches al azar). La respuesta es una lista de noches y un número esperado de tránsitos enteros, con las suposiciones del plan: la efeméride es exacta, la línea base es de una hora, el tiempo es la fracción declarada.
             \n\nLos pasos más profundos ponen números a la parte de la noche que ocupa un tránsito, al recuento esperado y a lo que hace una efeméride que se equivoca poco a poco a la línea base.`,
    },
  },
};

export const PLANNING_A_TRANSIT_CAMPAIGN_DEEPER_ES = {
  steps: {
    'the-share-of-the-night': {
      title: 'La parte de la noche',
      body: `Un tránsito con su línea base ocupa 4,8 horas. La ventana de la primera noche es de 8,81 horas.`,
      prompt: 'La parte de la ventana de la noche que usa un tránsito',
      hints: ['Divide 4,8 entre 8,81 y exprésalo como porcentaje.'],
      worked:
        '4,8 / 8,81 = 0,545: más de la mitad de la ventana. Un tránsito centrado una hora fuera del medio de la noche aún cabe; uno que cae a más de unas 2 horas del medio de la ventana no.',
      feedback: {
        close: 'Casi. Divide 4,8 entre 8,81 y multiplica por 100.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: es cerca de la mitad de la ventana.',
        off: '4,8 / 8,81 × 100.',
      },
    },
    'the-expected-count': {
      title: 'El recuento esperado',
      body: `Cumplen cinco noches, y cada noche está despejada con probabilidad 0,6 (el ajuste del panel).`,
      prompt: 'El número esperado de tránsitos enteros captados',
      hints: [
        'Multiplica el número de noches por la probabilidad de que una noche esté despejada.',
      ],
      worked:
        '5 × 0,6 = 3,0. El sorteo del panel dio 2, pero la esperanza es la afirmación del plan, y el recuento real puede ir de 0 a 5: con tiempo correlacionado una mala racha puede llevárselos todos.',
      feedback: {
        close: 'Casi. Multiplica 5 por 0,6.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: el recuento esperado está entre 0 y 5.',
        off: '5 × 0,6.',
      },
    },
    'the-ephemeris-grows-old': {
      title: 'Una efeméride que envejece',
      body: `El periodo se conoce solo con 0,001 días, y el último tránsito medido está 30 ciclos antes del que planeas. El error en el instante de mitad de tránsito crece con el número de ciclos.`,
      prompt: 'La incertidumbre en el instante previsto de mitad de tránsito',
      hints: [
        'Multiplica la incertidumbre del periodo por el número de ciclos, y luego por 24 horas.',
      ],
      worked:
        '30 × 0,001 d = 0,03 d = 0,72 h. La hora de línea base lo cubre, pero tras unos 60 ciclos la incertidumbre llega a 1,44 horas y hay que ensanchar la línea base o volver a medir la efeméride.',
      feedback: {
        close: 'Casi. 30 ciclos por 0,001 días, convertido a horas.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: es una fracción de hora.',
        off: '30 × 0,001 × 24.',
      },
    },
  },
};
