export const READING_THE_HR_DIAGRAM_ES = {
  title: 'Leer el diagrama HR',
  subtitle:
    'Qué son las regiones del diagrama, cómo una distancia pone una estrella en él y por qué la secuencia principal es una banda y no una línea',
  objectives: [
    'Nombrar las regiones del diagrama (la secuencia principal, las gigantes, las supergigantes y las enanas blancas) y decir qué pone a una estrella en cada una',
    'Decir por qué una estrella caliente y débil tiene que ser pequeña, por la superficie con la que brilla',
    'Decir que hace falta una distancia para poner una estrella en el diagrama, y leer el módulo de distancia de un cúmulo en su ajuste',
    'Decir que la secuencia principal es una banda cuya anchura tiene causas (binarias, la metalicidad que se supone, la edad) y no solo un error de medida',
  ],
  steps: {
    'two-numbers-one-picture': {
      title: 'Dos números y una imagen',
      body: `El <strong>diagrama de Hertzsprung&ndash;Russell</strong> sitúa cada estrella por dos números: lo caliente que está su superficie, abajo con el extremo caliente a la izquierda, y cuánta luz emite, en vertical. Los dos ejes son logarítmicos. La mayoría de las estrellas cae en una banda diagonal, la <strong>secuencia principal</strong>, donde fusionan hidrógeno en el núcleo. Las que han agotado ese hidrógeno la dejan y se vuelven <strong>gigantes</strong> y <strong>supergigantes</strong>, frías y muy brillantes; los núcleos que dejan atrás son <strong>enanas blancas</strong>, calientes y débiles.
             \n\nEl panel dibuja ocho estrellas modelo de las trayectorias MIST incluidas (modelos con la composición del Sol, no estrellas con nombre) con las regiones marcadas. La posición de una estrella en el diagrama no es un lugar del espacio: son dos propiedades, y una estrella se mueve por el diagrama al envejecer.`,
    },
    'which-region': {
      title: 'Caliente y débil',
      body: `La estrella <strong>D</strong> del estante tiene una superficie a 25 000 K y emite una centésima de la luz del Sol. Las estrellas A, B y C son una estrella parecida al Sol, una gigante roja y una supergigante. Una superficie caliente emite mucha luz por cada metro cuadrado.`,
      prompt:
        '¿Qué tipo de estrella es D, y qué dice su posición sobre su tamaño?',
      options: [
        'Una enana blanca: una superficie caliente que emite tan poca luz en total debe tener muy poca superficie, así que la estrella es diminuta',
        'Una gigante roja: es débil porque es fría',
        'Una estrella de la secuencia principal: las calientes son siempre las más brillantes',
        'Una supergigante: es caliente, así que es grande',
      ],
      hints: [
        'La luz que emite una estrella es su superficie por lo que emite cada metro cuadrado, y una superficie caliente emite mucho.',
      ],
      because:
        'D es una enana blanca. Cada metro cuadrado de una superficie de 25 000 K brilla unas 350 veces más fuerte que el del Sol, y sin embargo la estrella emite solo una centésima de la luz del Sol, así que su superficie es unas 350 veces menor que una centésima de la del Sol: tiene más o menos el tamaño de un planeta. Débil no es lo mismo que fría.',
      misconceptions: [
        {
          say: 'Una gigante roja es fría y brillante, arriba a la derecha. D es caliente, abajo a la izquierda.',
        },
        {
          say: 'Las superficies calientes son brillantes por metro cuadrado, pero la luz total de la estrella depende también de su tamaño, y D es muy pequeña.',
        },
      ],
    },
    'distance-puts-it-there': {
      title: 'Una distancia pone las estrellas ahí',
      body: `Un diagrama de brillo <em>aparente</em> todavía no es un diagrama HR: una estrella al doble de distancia parece cuatro veces más débil. El panel muestra las estrellas del cúmulo <strong>A</strong> (sintético, para poder comprobar la respuesta) con sus magnitudes aparentes y ajusta una curva modelo a ellas. El desplazamiento que alinea la curva con las estrellas es el <strong>módulo de distancia</strong>, la magnitud aparente menos la absoluta. Léelo, con la metalicidad con la que se abre el panel.`,
      fields: [{ label: 'Módulo de distancia del cúmulo A' }],
    },
    'a-band-not-a-line': {
      title: 'Una banda, no una línea',
      body: `Mira la secuencia principal del cúmulo. Las estrellas están todas a una distancia, así que la distancia no puede dispersarlas, y sin embargo no caen en una sola curva. <strong>Activa</strong> las binarias en el panel y observa la secuencia.`,
      prompt:
        '¿Cuál de estas cosas ensancha la secuencia principal de un cúmulo real?',
      options: [
        'Las estrellas binarias sin resolver, que parecen más brillantes que cualquiera de las dos solas, y las estrellas de distinto contenido de metales; el error de medida se suma a ambos',
        'Solo el error de medida: una secuencia principal es una línea',
        'Solo la distancia de cada estrella, porque un cúmulo tiene profundidad',
        'Solo la edad, porque las estrellas de una edad tienen edades distintas en la secuencia',
      ],
      hints: [
        'Dos estrellas fundidas en un punto emiten más luz que cualquiera de las dos, así que el punto queda por encima de la secuencia.',
      ],
      because:
        'Varias cosas. Un par de binarias sin resolver es más brillante que una estrella y queda por encima de la secuencia, hasta unas 0,75 magnitudes; las estrellas de distinto [Fe/H] están en secuencias algo distintas; y los brillos medidos tienen errores. En un cúmulo la distancia es común a todas, así que no ensancha la banda. La anchura es información, no solo dispersión.',
      misconceptions: [
        {
          say: 'El error es parte, pero las binarias y la composición sacan estrellas enteras de la línea más que el error.',
        },
        {
          say: 'Las estrellas de un cúmulo están todas casi a una distancia (es mucho menor que su distancia), así que la distancia no las dispersa.',
        },
      ],
    },
    'what-the-diagram-gives': {
      title: 'Lo que da el diagrama',
      body: `El lugar de una estrella en el diagrama dice qué tipo de estrella es: en la secuencia principal fusiona hidrógeno, por encima la ha dejado, y abajo a la izquierda es una enana blanca. El lugar necesita una distancia, y la anchura de la secuencia necesita una explicación, que puede ser un par de estrellas, una composición o una dispersión de edades. El panel del cúmulo ajusta una edad y una distancia con suposiciones que declara, y en los pasos más profundos verás lo que cuestan dos de ellas.
             \n\nLas estrellas cercanas al Sol tienen un diagrama propio en el Observatorio (el paquete de estrellas cercanas de Gaia, con los límites de su selección declarados allí). No se dibuja en esta investigación.`,
    },
  },
};

export const READING_THE_HR_DIAGRAM_DEEPER_ES = {
  steps: {
    'the-size-of-a-white-dwarf': {
      title: '¿Qué tamaño tiene D?',
      body: `El radio de una estrella se sigue de su luz y su temperatura: <em>R</em> entre el radio del Sol es la raíz cuadrada de <em>L</em> entre la luz del Sol, dividida entre el cuadrado de <em>T</em> entre la temperatura del Sol (5772 K). Usa L = 0,01 y T = 25 000 K.`,
      prompt: 'El radio de la estrella D, en radios solares',
      hints: ['√0,01 = 0,1, y (25000 / 5772)² es unos 18,8.'],
      worked:
        '0,1 / 18,76 = 0,00533 R☉, unos 3700 km: algo menor que la Tierra. Una enana blanca guarda la masa de una estrella en el volumen de un planeta.',
      feedback: {
        close:
          'Casi. Toma la raíz cuadrada de 0,01 y divide entre (25000/5772) al cuadrado.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: la estrella es mucho menor que el Sol, pero no mil veces menor.',
        off: '√0,01 / (25000 / 5772)².',
      },
    },
    'the-distance-in-parsecs': {
      title: 'La distancia del cúmulo',
      body: `Un módulo de distancia <em>m &minus; M</em> y una distancia <em>d</em> en pársecs se relacionan por <em>m &minus; M</em> = 5 log<sub>10</sub>(<em>d</em>) &minus; 5. Usa el 12,10 que leíste.`,
      prompt: 'La distancia del cúmulo A, en pársecs',
      hints: ['d = 10^((12,10 + 5) / 5).'],
      worked:
        '10^(17,10/5) = 10^3,42 = 2630 pc, unos 2,6 kilopársecs. Un módulo de doce son unos pocos kilopársecs; diez pársecs serían un módulo de cero.',
      feedback: {
        close: 'Casi. Diez elevado a (12,10 + 5) dividido entre 5.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: un módulo de 12 son unos pocos miles de pársecs, no unos cientos ni unos cientos de miles.',
        off: '10 ^ ((12,10 + 5) / 5).',
      },
    },
    'what-binaries-do-to-the-fit': {
      title: 'Lo que hacen las binarias a la distancia',
      body: `Ajusta el cúmulo A con las binarias <strong>desactivadas</strong> y luego <strong>activadas</strong> (el 30 por ciento de las estrellas se dibujan como pares sin resolver), con la misma metalicidad, y lee cada vez el módulo de distancia: 12,10 y 12,04. Un par es más brillante que una estrella, así que las estrellas que quedan altas hacen que el cúmulo parezca más cercano.`,
      prompt:
        '¿En qué porcentaje cae la distancia ajustada cuando los pares están en la muestra?',
      hints: ['La distancia cambia en el factor 10 elevado a (Δmódulo / 5).'],
      worked:
        '10^(−0,058/5) = 0,974: un 2,6 por ciento más cerca, y la edad sube de 2,02 a 2,06 Gyr. El ajuste no sabe que los pares son pares, así que la respuesta se mueve, y la anchura de la secuencia era la pista.',
      feedback: {
        close:
          'Casi. Diez elevado a la diferencia de módulos entre cinco, menos uno.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: una centésima de magnitud son unas pocas décimas de por ciento de la distancia.',
        off: '100 × (1 − 10 ^ (−0,058 / 5)).',
      },
    },
  },
};

export const A_STARS_LIFE_IN_NUMBERS_ES = {
  title: 'La vida de una estrella en números',
  subtitle:
    'Cuánto vive una estrella en la secuencia principal, leído de las trayectorias MIST, por qué mueren primero las más pesadas y cómo el punto de giro de un cúmulo es un reloj',
  objectives: [
    'Leer la vida en la secuencia principal de una estrella modelo en la reproducción de la evolución y comparar una estrella de 20 masas solares con el Sol',
    'Decir por qué una estrella más pesada vive mucho menos: tiene más combustible pero lo gasta mucho más deprisa',
    'Decir que la vida no cae como una sola potencia de la masa, y leer cómo cambia la pendiente',
    'Decir cómo las estrellas que dejan la secuencia principal en un cúmulo dan su edad',
  ],
  steps: {
    'fuel-and-rate': {
      title: 'Combustible y ritmo',
      body: `Una estrella de la secuencia principal fusiona hidrógeno en su núcleo. Cuánto dura eso es una reserva de combustible dividida por un ritmo de gasto: el combustible es el hidrógeno del núcleo, que es una parte de la masa de la estrella, y el ritmo es su luminosidad. La reproducción de la evolución junto al texto sigue ocho estrellas modelo de las trayectorias MIST (con la composición del Sol, sin rotación). La fila <strong>Esta fase</strong> de su lectura da cuánto dura la fase en la que está el cursor. La reproducción se abre en la fase de secuencia principal de una estrella de una masa solar.`,
    },
    'which-lives-longer': {
      title: 'Veinte veces el combustible',
      body: `Una estrella de 20 masas solares tiene 20 veces el hidrógeno del Sol. Antes de leer la reproducción, comprométete.`,
      prompt: 'Su secuencia principal dura…',
      options: [
        'unas 20 veces más que la del Sol, porque tiene 20 veces el combustible',
        'más o menos lo mismo, porque las estrellas mayores queman al mismo ritmo',
        'mucho menos: una milésima de la del Sol, porque gasta el combustible mucho más deprisa de lo que tiene más',
        'unas 20 veces menos, porque las estrellas mayores son 20 veces más calientes',
      ],
      because:
        'Una milésima, más o menos. La estrella tiene 20 veces el combustible, pero brilla unas 57 000 veces más que la estrella parecida al Sol, así que gasta su combustible miles de veces más deprisa de lo que tiene más. El paso siguiente lee las dos vidas.',
    },
    'a-sun-like-life': {
      title: 'Una vida como la del Sol',
      body: `El cursor está a mitad de la <strong>secuencia principal</strong> de la estrella de una masa solar. Lee la fila <strong>Esta fase</strong> de la lectura: cuánto dura de verdad esta fase.`,
      fields: [{ label: 'Secuencia principal de 1 M☉' }],
    },
    'a-heavy-life': {
      title: 'Una vida pesada',
      body: `El cursor está ahora a mitad de la <strong>secuencia principal</strong> de una estrella de 20 masas solares, con 20 veces el hidrógeno. Lee otra vez la fila <strong>Esta fase</strong>.`,
      fields: [{ label: 'Secuencia principal de 20 M☉' }],
    },
    'why-the-heavy-one-is-short': {
      title: 'Por qué la pesada dura poco',
      body: `La estrella de 20 masas solares tiene 20 veces el combustible y una secuencia principal mil veces más corta. Lee la <strong>luminosidad</strong> de la estrella de 20 masas solares al principio de su secuencia principal: unas 43 000 veces la del Sol.`,
      prompt: '¿Qué explica la vida corta?',
      options: [
        'Su luminosidad crece mucho más deprisa que su masa, así que gasta su combustible mucho más deprisa de lo que tiene más',
        'Las estrellas pesadas tienen menos hidrógeno, que se agota antes',
        'Las estrellas pesadas son más jóvenes, así que han tenido menos tiempo',
        'Las estrellas pesadas queman helio, no hidrógeno, y el helio se gasta más deprisa',
      ],
      hints: [
        'La vida es combustible entre ritmo: ¿qué le pasa al ritmo cuando la masa se multiplica por veinte?',
      ],
      because:
        'La vida es el combustible dividido entre la luminosidad. El combustible crece en proporción a la masa; la luminosidad crece mucho más deprisa (como la masa elevada a 3,5 en la parte baja de la secuencia principal), así que el cociente cae. Una estrella pesada además quema una parte mayor de su hidrógeno en la secuencia principal, por eso el cociente de las dos vidas es unas 1140 y no las 3000 que darían solo las luminosidades. Una estrella pesada tiene más hidrógeno, no menos, y empieza con hidrógeno como las demás.',
      misconceptions: [
        {
          say: 'Una estrella pesada tiene más hidrógeno en total; lo que decide es el ritmo al que lo gasta.',
        },
        {
          say: 'Las dos estrellas empiezan en edad cero en la reproducción; lo que difiere es cuánto dura cada fase.',
        },
      ],
    },
    'what-the-lifetimes-say': {
      title: 'Lo que dicen las vidas',
      body: `La vida de una estrella en la secuencia principal es su combustible entre su luminosidad, y la luminosidad sube tan deprisa con la masa que una estrella más pesada vive menos, tenga lo que tenga. Por eso las estrellas más pesadas de un cúmulo son las primeras en dejar la secuencia principal, y por eso las que quedan en ella en un cúmulo viejo son las ligeras. Las vidas de aquí son las de los modelos, de una rejilla, con una composición. Los pasos más profundos leen cómo cae la vida con la masa y la usan como reloj.`,
    },
  },
};

export const A_STARS_LIFE_IN_NUMBERS_DEEPER_ES = {
  steps: {
    'the-ratio': {
      title: 'El cociente',
      body: `Leíste 9,88 miles de millones de años para 1 masa solar y 8,65 millones para 20. Divide.`,
      prompt:
        '¿Cuántas veces más larga es la secuencia principal de la estrella parecida al Sol?',
      hints: ['9,88 Gyr son 9880 Myr.'],
      worked:
        '9878 / 8,652 = 1142: una estrella de 20 veces la masa vive unas 1140 veces menos. Si la vida cayera como una sola potencia de la masa, 20 elevado a esa potencia sería 1140, una potencia de 2,3; el paso siguiente muestra que ninguna potencia única ajusta.',
      feedback: {
        close:
          'Casi. Pon las dos en la misma unidad (9880 Myr) antes de dividir.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: Gyr y Myr difieren en mil.',
        off: '9880 / 8,65.',
      },
    },
    'the-slope-changes': {
      title: 'La pendiente no es constante',
      body: `Entre 1 y 2 masas solares la secuencia principal cae de 9,88 Gyr a 1,05 Gyr. Si la vida va como la masa elevada a &minus;<em>k</em>, <em>k</em> es el logaritmo del cociente de las vidas entre el logaritmo de 2.`,
      prompt: 'La potencia k entre 1 y 2 masas solares',
      hints: ['log₂(9,878 / 1,054).'],
      worked:
        'log₂(9,878/1,054) = 3,23. Entre 10 y 20 masas solares el mismo cálculo da 1,44, porque entre las estrellas más pesadas la luminosidad crece más despacio con la masa y los núcleos convectivos mayores llevan más hidrógeno a la combustión. La vida no es una potencia de la masa, así que una regla práctica tiene que decir dónde vale.',
      feedback: {
        close:
          'Casi. Toma el logaritmo de 9,878/1,054 y divídelo entre el logaritmo de 2.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: k es unos pocos, no unas décimas ni decenas.',
        off: 'ln(9,878 / 1,054) / ln 2.',
      },
    },
    'the-turnoff-as-a-clock': {
      title: 'El punto de giro como reloj',
      body: `Las estrellas que dejan la secuencia principal en un cúmulo son aquellas cuya vida iguala su edad. El cúmulo A (el cúmulo sintético del panel de ajuste de cúmulos) tiene una edad ajustada de 2,02 Gyr. Entre 1 y 2 masas solares la vida va como la masa elevada a &minus;3,23 desde 9,88 Gyr a 1 masa solar.`,
      prompt:
        'La masa de las estrellas en el punto de giro del cúmulo A, en masas solares',
      hints: ['M = (9,88 / 2,02)^(1 / 3,23).'],
      worked:
        '(9,878/2,022)^(1/3,23) = 1,63 M☉. El cúmulo B, con 3,16 Gyr, da 1,42. Es una interpolación entre dos trayectorias y la estrella del punto de giro no está exactamente donde las trayectorias terminan la secuencia principal, así que un ajuste con una rejilla más fina de isócronas diferirá algo; lo importante es que la edad de un cúmulo es la vida de las estrellas de su punto de giro.',
      feedback: {
        close: 'Casi. Eleva 9,88 / 2,02 a la potencia 1/3,23.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: la masa del punto de giro es un poco más de una masa solar.',
        off: '(9,88 / 2,02) ^ (1 / 3,23).',
      },
    },
  },
};

export const WHEN_A_STAR_EXPLODES_ES = {
  title: 'Cuando una estrella explota',
  subtitle:
    'Qué estrellas acaban en un colapso, lo incierto que es el límite y cuánta energía libera el colapso comparada con la explosión que vemos',
  objectives: [
    'Decir qué estrellas acaban en un colapso del núcleo y cuáles acaban como enanas blancas sin explosión, y que la frontera es un intervalo',
    'Leer un panel de resultados que da probabilidades y decir qué significa una probabilidad ahí',
    'Decir que la energía que libera un colapso es su energía de ligadura gravitatoria, y compararla con la energía de la explosión',
    'Decir qué añadiría una curva de luz, y que esta investigación no muestra ninguna',
  ],
  steps: {
    'the-end-of-a-heavy-star': {
      title: 'El final de una estrella pesada',
      body: `Una estrella fusiona hidrógeno, luego helio, luego elementos más pesados en capas, cada etapa más corta que la anterior. Si su núcleo crece más allá de lo que aguanta la presión de sus electrones, el núcleo cae hasta que algo lo detiene: una <strong>estrella de neutrones</strong> o, para las más pesadas, un <strong>agujero negro</strong>. La caída libera muchísima energía y expulsa las capas externas: una <strong>supernova</strong>. Las estrellas por debajo de cierta masa nunca llegan ahí; sus núcleos se vuelven enanas blancas y sus capas externas se dispersan.
             \n\nEl panel es el panel de remanentes de «De estrella a remanente»: para una masa inicial da la probabilidad de cada resultado, a partir de umbrales publicados que cita, con los límites dibujados como intervalos. Está puesto en una estrella de 15 masas solares.`,
    },
    'which-stars-explode': {
      title: 'Qué estrellas explotan',
      body: `Pon la masa inicial en <strong>5</strong> masas solares y lee el resultado, y luego en <strong>15</strong>.`,
      prompt:
        '¿Qué acaba con una estrella de 5 masas solares, y qué con una de 15?',
      options: [
        'La estrella de 5 masas solares se vuelve enana blanca sin supernova; la de 15 masas solares colapsa en una estrella de neutrones',
        'Las dos explotan, porque toda estrella de más de una masa solar lo hace',
        'Ninguna explota: las supernovas necesitan una estrella compañera',
        'La estrella de 5 masas solares se vuelve agujero negro y la de 15 masas solares enana blanca',
      ],
      hints: [
        'Lee las probabilidades: con 5 masas solares, ¿qué resultado las tiene todas?',
      ],
      because:
        'Por debajo de unas 7 a 9,5 masas solares el núcleo nunca llega al colapso y la estrella acaba como enana blanca; por encima, hasta unas 20 a 40, el colapso deja una estrella de neutrones. Algunas supernovas sí necesitan una compañera (una enana blanca que recibe materia), pero una estrella de 15 masas solares colapsa por sí sola.',
      misconceptions: [
        {
          say: 'Una estrella de 5 masas solares no explota: el panel da su resultado como enana blanca con probabilidad 1.',
        },
        {
          say: 'Un tipo de supernova necesita una compañera, pero el colapso del núcleo de una estrella masiva no.',
        },
      ],
    },
    'a-star-near-the-edge': {
      title: 'Una estrella cerca del límite',
      body: `Pon la masa inicial en <strong>9</strong> masas solares. El panel da una enana blanca con probabilidad 0,2 y una estrella de neutrones con probabilidad 0,8, y llama al veredicto incierto.`,
      prompt: '¿Qué significa esa probabilidad?',
      options: [
        'La frontera entre los dos resultados solo se sabe que está entre 7 y 9,5 masas solares, y con 9 las fuentes no deciden: es una afirmación sobre lo que se sabe, no que una quinta parte de la estrella se vuelva enana blanca',
        'El ochenta por ciento de la masa de la estrella colapsa y el veinte por ciento no',
        'El modelo lanza una moneda para cada estrella de esta masa',
        'La estrella acaba como enana blanca el 20 por ciento de las veces por su rotación',
      ],
      hints: [
        'Mira los umbrales que cita el panel: son intervalos, no números.',
      ],
      because:
        'Los umbrales vienen de trabajos publicados que dan un intervalo (la masa mínima para una supernova es 8 ± 1 masas solares en una revisión, y alrededor de 9 en otra), así que una estrella en 9 está dentro del intervalo y el panel da una probabilidad sobre el desacuerdo de las fuentes. No es una parte de la estrella, y no es una tasa medida.',
      misconceptions: [
        {
          say: 'La probabilidad es sobre el resultado de toda la estrella, no una parte de su masa.',
        },
        {
          say: 'Nada es aleatorio: la misma estrella de la misma masa recibe siempre los mismos dos números, porque describen lo bien que se conoce el límite.',
        },
      ],
    },
    'where-the-energy-goes': {
      title: 'Adónde va la energía',
      body: `El colapso de un núcleo a una estrella de neutrones libera su energía de ligadura gravitatoria, unos 2,6 &times; 10<sup>46</sup> julios para una estrella de 1,4 masas solares y un radio de 12 kilómetros (el paso profundo lo calcula). Las capas en expansión de una supernova típica llevan unos 10<sup>44</sup> julios de movimiento. Antes de dividir, comprométete.`,
      prompt: 'El movimiento de la explosión es…',
      options: [
        'la mayor parte de la energía que libera el colapso',
        'más o menos una décima de ella',
        'mucho menos del uno por ciento: casi todo el resto sale de otra forma, sobre todo neutrinos',
        'nada de ella: el colapso no libera energía',
      ],
      because:
        'Mucho menos del uno por ciento. La energía de ligadura de una estrella de neutrones es más o menos una décima de su energía en reposo, y casi toda sale como neutrinos en segundos; el movimiento de la explosión y la luz son fracciones pequeñas. El paso siguiente divide.',
    },
    'the-share-in-the-blast': {
      title: 'La parte de la explosión',
      body: `Toma la energía de ligadura como 2,6 &times; 10<sup>46</sup> J y el movimiento de la explosión como 1 &times; 10<sup>44</sup> J, un valor típico (Janka 2012). Calcula la parte, como porcentaje.`,
      fields: [
        { label: 'Movimiento de la explosión sobre la energía de ligadura' },
      ],
    },
    'what-a-light-curve-would-add': {
      title: 'Lo que añadiría una curva de luz',
      body: `El progenitor sale de los umbrales de masa de arriba, y la energía es una cota: lo máximo que puede liberar un colapso es su energía de ligadura, y la explosión y la luz son una pequeña fracción de ella. Lo que añade la <strong>curva de luz</strong> de una supernova es cómo sale esa fracción a lo largo de semanas: la subida, el máximo y el largo descenso. Esta investigación no muestra ninguna. Ninguna curva de luz pública tiene una decisión de derechos registrada para redistribuirla aquí, y dibujar una sintética sería enseñar una curva que el programa nunca ajustó. La energía de ligadura es una estimación de densidad uniforme; una estrella de neutrones no es uniforme, y la estimación vale hasta unas pocas decenas de por ciento.`,
    },
  },
};

export const WHEN_A_STAR_EXPLODES_DEEPER_ES = {
  steps: {
    'compute-the-bound': {
      title: 'La cota a mano',
      body: `Una bola uniforme de masa <em>M</em> y radio <em>R</em> tiene energía de ligadura gravitatoria (3/5) <em>G M</em><sup>2</sup> / <em>R</em>. Usa <em>M</em> = 1,4 masas solares (2,79 &times; 10<sup>30</sup> kg) y <em>R</em> = 12 km, con <em>G</em> = 6,674 &times; 10<sup>&minus;11</sup> en unidades del SI.`,
      prompt: 'La energía de ligadura, en unidades de 10^46 julios',
      hints: ['0,6 × 6,674e−11 × (2,785e30)² / 1,2e4.'],
      worked:
        '0,6 × 6,674e−11 × (2,785e30)² / 12 000 = 2,59e46 J. Una estrella de neutrones real es más densa en el centro que una bola uniforme y los efectos relativistas importan, así que la cifra verdadera está a unas pocas decenas de por ciento de esta; el orden de magnitud, de 10^46 a 10^47 julios, es firme.',
      feedback: {
        close:
          'Casi. Eleva primero la masa al cuadrado, luego divide entre el radio en metros.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: el radio son 12 000 metros, no 12.',
        off: '0,6 × G × M² / R en unidades del SI.',
      },
    },
    'compared-with-a-sun': {
      title: 'Frente a toda la vida de una estrella',
      body: `El Sol fusiona el hidrógeno de su núcleo, más o menos una décima de su masa, y el 0,7 por ciento de la masa del hidrógeno que se fusiona se vuelve energía. La energía liberada es 0,007 &times; 0,1 &times; <em>M c</em><sup>2</sup> para <em>M</em> = 1,989 &times; 10<sup>30</sup> kg.`,
      prompt:
        '¿Cuántas veces la energía que emite el Sol en la secuencia principal es la energía de ligadura del colapso?',
      hints: [
        'La energía del Sol en la secuencia principal es unos 1,25 × 10^44 J.',
      ],
      worked:
        '0,0007 × 1,989e30 × (2,998e8)² = 1,25e44 J, más o menos la energía de la explosión; la energía de ligadura 2,59e46 entre eso es 207. Un núcleo que colapsa durante un segundo libera unas doscientas veces lo que una estrella irradia en toda su vida quemando hidrógeno.',
      feedback: {
        close: 'Casi. Divide 2,59e46 entre 1,25e44.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: el cociente es un par de cientos.',
        off: '2,59e46 / (0,0007 × M × c²).',
      },
    },
  },
};

export const POPULATIONS_I_AND_II_ES = {
  title: 'Poblaciones I y II',
  subtitle:
    'Estrellas ricas y pobres en metales, lo que hace a la edad y la distancia de un cúmulo la metalicidad que se supone, y por qué las estrellas viejas que quedan son ligeras',
  objectives: [
    'Decir qué significa [Fe/H] y qué dice un valor de −0,5 sobre el hierro de una estrella',
    'Decir que la edad que da el ajuste de un cúmulo depende de la metalicidad que se supone, y leer el tamaño de la dependencia',
    'Decir por qué las mismas estrellas parecen más viejas cuando se supone que son pobres en metales',
    'Decir qué estrellas siguen en la secuencia principal en una población muy vieja, y qué deja fuera esta investigación',
  ],
  steps: {
    'two-kinds-of-star': {
      title: 'Dos tipos de estrella',
      body: `Los astrónomos clasifican las estrellas en dos <strong>poblaciones</strong>. La población I, como el Sol, es rica en elementos más pesados que el helio, que llaman <em>metales</em>; la población II es pobre en ellos y vieja. La medida es <strong>[Fe/H]</strong>: el logaritmo de la razón del hierro al hidrógeno en la estrella, menos lo mismo para el Sol. El Sol es 0, una estrella con una décima del hierro del Sol es &minus;1.
             \n\nEl panel de cúmulos ajusta una edad y una distancia a un cúmulo sintético de estrellas, pero no puede ajustar la metalicidad: se la dices tú. Ofrece tres, &minus;0,5, &minus;0,25 y 0. Las estrellas son las mismas cada vez.`,
    },
    'what-minus-half-means': {
      title: 'Lo que significa menos un medio',
      body: `[Fe/H] es un logaritmo: &minus;1 es un factor de diez por debajo de la razón del Sol del hierro al hidrógeno.`,
      prompt: 'Una estrella con [Fe/H] = −0,5 tiene…',
      options: [
        'más o menos un tercio del hierro del Sol respecto a su hidrógeno',
        'la mitad del hierro del Sol respecto a su hidrógeno',
        'más o menos una décima del hierro del Sol respecto a su hidrógeno',
        'la mitad de la masa del Sol',
      ],
      hints: ['10 elevado a −0,5 es 1 entre la raíz cuadrada de 10.'],
      because:
        '10^(−0,5) = 0,316: más o menos un tercio de la razón hierro-hidrógeno del Sol. Menos un medio no es la mitad; es un factor de 3,2 por debajo. La escala es logarítmica porque las estrellas abarcan varios factores de diez.',
      misconceptions: [
        {
          say: 'La escala es logarítmica: −0,5 dex es un factor de 10^0,5, unos 3,2, no 2.',
        },
        {
          say: '[Fe/H] es una composición y no dice nada de la masa de la estrella.',
        },
      ],
    },
    'the-same-stars-three-ways': {
      title: 'Las mismas estrellas, dos suposiciones',
      body: `Ajusta el cúmulo <strong>A</strong> con la metalicidad en <strong>&minus;0,5</strong> y lee la edad, luego ponla en <strong>0</strong> y léela otra vez. Las estrellas no cambian; solo cambia la suposición.`,
      fields: [
        { label: 'Edad suponiendo [Fe/H] = −0,5' },
        { label: 'Edad suponiendo [Fe/H] = 0' },
      ],
    },
    'why-older-when-poor': {
      title: 'Por qué pobre en metales significa más viejo',
      body: `Compara las curvas modelo que dibuja el panel con las dos metalicidades: una estrella pobre en metales de una masa dada es más caliente y más brillante que una rica en metales de la misma masa.`,
      prompt:
        '¿Por qué suponer que el cúmulo es pobre en metales le da una edad mayor?',
      options: [
        'Un modelo pobre en metales de cualquier masa es más caliente y más brillante, así que las estrellas del punto de giro deben ser de menor masa para estar donde están, y las de menor masa tardan más en dejar la secuencia principal',
        'Las estrellas pobres en metales son siempre más viejas, así que el panel añade edad',
        'El panel no puede ajustar un cúmulo pobre en metales, así que su respuesta es una conjetura',
        'Los metales frenan el reloj de una estrella',
      ],
      hints: [
        'Piensa en el punto de giro: ¿qué estrellas dejan la secuencia principal en un cúmulo más viejo, las pesadas o las ligeras?',
      ],
      because:
        'El ajuste pone el punto de giro de los modelos donde está el de las estrellas. Una estrella pobre en metales es más caliente y más brillante con una masa dada, así que para igualar el mismo punto de giro las estrellas deben ser de menor masa, y una estrella de menor masa vive más: el cúmulo debe ser más viejo. La composición de las estrellas no cambia con la suposición; lo que cambia es con qué modelo se las compara.',
      misconceptions: [
        {
          say: 'El panel no añade nada: compara las estrellas con la curva modelo de la metalicidad que indicas, y la curva cambia.',
        },
        {
          say: 'El ajuste funciona con cada metalicidad; la respuesta que da es condicional a la que elegiste.',
        },
      ],
    },
    'who-is-left': {
      title: 'Quién queda',
      body: `La reproducción da a una estrella modelo de una masa solar una secuencia principal de 9,9 miles de millones de años, y a una de dos masas solares 1,05 miles de millones. Una población vieja, como el halo, tiene unos 12 miles de millones de años.`,
      prompt:
        '¿Qué estrellas de esa población siguen en la secuencia principal?',
      options: [
        'Solo las algo más ligeras que el Sol; todas las más pesadas la han dejado',
        'Todas las más pesadas que el Sol, que son mayores y viven más',
        'Todas, porque la secuencia principal dura para siempre',
        'Solo las más pesadas, que queman más deprisa',
      ],
      hints: [
        'Una estrella más pesada gasta su hidrógeno antes. ¿Dónde cae 12 miles de millones de años?',
      ],
      because:
        'Un modelo de una masa solar deja la secuencia principal tras 9,9 miles de millones de años, así que a los 12 miles de millones toda estrella de esa masa o más la ha dejado, y lo que queda en la secuencia principal son las más ligeras. Cuanto más ligera la estrella, más larga la espera, y una enana roja de una quinta parte de masa solar tiene billones de años.',
      misconceptions: [
        {
          say: 'Las estrellas más pesadas viven menos, no más: la vida cae muy deprisa con la masa.',
        },
        {
          say: 'Todo modelo de estrella deja la secuencia principal en algún momento; las enanas rojas solo tardan más que la edad del universo.',
        },
      ],
    },
    'what-this-does-not-show': {
      title: 'Lo que esto no muestra',
      body: `Dos cosas ordenan las poblaciones en el cielo que esta investigación no dibuja. La primera es el <strong>movimiento</strong>: las estrellas de población I se mueven en el disco de la galaxia en órbitas casi circulares, y las de población II en un halo en órbitas excéntricas, de modo que una muestra de estrellas con velocidades y metalicidades se separa en dos nubes. La muestra para eso no está en ningún panel de aquí, y una parte posterior del programa está pensada para aportarla. La segunda son las trayectorias evolutivas: son para la composición del Sol, y una estrella pobre en metales de la misma masa vive algo menos, así que las masas del punto de giro de los pasos profundos son cotas para poblaciones viejas, no respuestas.`,
    },
  },
};

export const POPULATIONS_I_AND_II_DEEPER_ES = {
  steps: {
    'the-age-ratio': {
      title: 'Cuánto más viejo',
      body: `Leíste 3,35 Gyr con [Fe/H] &minus;0,5 y 1,47 Gyr con 0. Divide.`,
      prompt: 'La edad suponiendo −0,5 entre la edad suponiendo 0',
      hints: ['3,35 / 1,47.'],
      worked:
        '3,350 / 1,466 = 2,29: un cambio de medio dex en la metalicidad supuesta cambia la edad en un factor de 2,3. El intervalo propio del ajuste con una metalicidad es de unos pocos por ciento, así que la suposición pesa mucho más.',
      feedback: {
        close: 'Casi. Divide la edad mayor entre la menor.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: las edades difieren en un factor de unos dos.',
        off: '3,35 / 1,47.',
      },
    },
    'the-turnoff-of-an-old-population': {
      title: 'El punto de giro de una población vieja',
      body: `Entre 0,5 y 1 masa solar la secuencia principal cae de 95,6 Gyr a 9,88 Gyr, una potencia de 3,28 de la masa. Toma una población de 12 Gyr y pregunta dónde la vida llega a 12 Gyr partiendo de 1 masa solar con 9,88 Gyr.`,
      prompt:
        'La masa en el punto de giro de una población de 12 Gyr, en masas solares',
      hints: ['M = (9,88 / 12)^(1 / 3,28).'],
      worked:
        '(9,878/12)^(1/3,275) = 0,94 M☉. Son trayectorias de composición solar; una estrella pobre en metales de la misma masa vive algo menos, así que para una población del halo el punto de giro verdadero es algo menor. La respuesta es una cota.',
      feedback: {
        close: 'Casi. Eleva 9,88 / 12 a la potencia 1/3,28.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: la masa del punto de giro es un poco menos de una masa solar.',
        off: '(9,88 / 12) ^ (1 / 3,28).',
      },
    },
    'the-distance-moves-too': {
      title: 'La distancia también se mueve',
      body: `La suposición de metalicidad mueve también el módulo de distancia: 11,86 con &minus;0,5 y 12,43 con 0 para el cúmulo A.`,
      prompt:
        '¿En qué porcentaje es mayor la distancia ajustada con [Fe/H] 0 que con −0,5?',
      hints: ['10^((12,43 − 11,86) / 5) − 1.'],
      worked:
        '10^(0,563/5) = 1,296: un 29,6 por ciento. Un cambio en la composición supuesta mueve la edad en un factor de 2,3 y la distancia casi en un tercio; se mueven juntas porque un modelo más brillante pone el cúmulo más lejos. Ninguna es la respuesta sin la metalicidad.',
      feedback: {
        close:
          'Casi. Diez elevado a la diferencia entre cinco, menos uno, por cien.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: media magnitud son unas pocas decenas de por ciento de la distancia.',
        off: '100 × (10 ^ (0,563 / 5) − 1).',
      },
    },
  },
};

export const SPECTRA_TELL_TEMPERATURE_AND_GRAVITY_ES = {
  title: 'Los espectros dicen temperatura y gravedad',
  subtitle:
    'Cuatro espectros reales de SDSS, qué dice la profundidad de una línea sobre la temperatura, qué diría un espectro sobre la gravedad y qué puede resolver el espectrógrafo',
  objectives: [
    'Decir que la profundidad de una línea no es un termómetro: las líneas de Balmer son más profundas en la estrella caliente y las de sodio en la fría',
    'Decir por qué el patrón de líneas, y no una línea, da la temperatura de una estrella',
    'Decir que la anchura de las líneas depende también de la gravedad, y qué separa eso',
    'Decir qué podía resolver el espectrógrafo y qué conserva el muestreo del paquete',
  ],
  steps: {
    'a-thermometer-and-a-scale': {
      title: 'Un termómetro y una escala',
      body: `El espectro de una estrella es su luz separada por longitud de onda, y las líneas oscuras son átomos de su atmósfera que quitan luz. Qué líneas hay y lo profundas que son depende de la <strong>temperatura</strong>, porque la temperatura fija qué átomos están excitados o ionizados. Lo anchas que son las líneas depende de la <strong>gravedad</strong> de la superficie, porque la gravedad fija la presión y la densidad del gas.
             \n\nEl panel dibuja cuatro estrellas observadas por el Sloan Digital Sky Survey, una de cada tipo espectral A, G, K y M: observaciones, sin nada suavizado, ajustado ni calculado. Los espectros son de dominio público, y el crédito está en el panel.`,
    },
    'the-deepest-balmer': {
      title: 'La línea de Balmer más profunda',
      body: `Elige la ventana de <strong>H&beta;</strong> en el panel y activa los nombres. H&beta; es una línea de hidrógeno desde el segundo nivel, y el panel indica lo profunda que es la de cada estrella.`,
      prompt: '¿Cuál de las cuatro tiene la línea H-beta más profunda?',
      options: [
        'La estrella A, la más caliente de las cuatro',
        'La estrella M, la más fría de las cuatro',
        'La estrella G, porque es como el Sol',
        'Ninguna: todas tienen la misma profundidad',
      ],
      hints: [
        'El hidrógeno en el segundo nivel es lo que absorbe H-beta: ¿qué temperatura lo puebla mejor?',
      ],
      because:
        'La estrella A, a unos 7850 K según la temperatura del catálogo del paquete. Una línea de Balmer necesita hidrógeno ya excitado a su segundo nivel, y eso es lo más común a unos 10 000 K; en las estrellas más frías casi no hay hidrógeno en ese nivel, y en las mucho más calientes está ionizado.',
      misconceptions: [
        {
          say: 'En una estrella M, a unos 4000 K, apenas hay hidrógeno en el segundo nivel, así que la línea casi no existe.',
        },
        {
          say: 'El H-beta de la estrella G es real pero menos profundo: a 5600 K hay menos hidrógeno excitado.',
        },
      ],
    },
    'read-the-depths': {
      title: 'Lee las profundidades',
      body: `Con la ventana de <strong>H&beta;</strong> y los nombres activados, el panel enumera lo profunda que es la línea de cada estrella, como porcentaje del continuo contiguo. Lee la de la estrella A y la de la estrella M.`,
      fields: [
        { label: 'Profundidad de H-beta, estrella A' },
        { label: 'Profundidad de H-beta, estrella M' },
      ],
    },
    'the-opposite-orderings': {
      title: 'El orden opuesto',
      body: `Elige ahora la ventana de <strong>Na D</strong>, el doblete del sodio cerca de 589 nanómetros. Se hace más profundo de la estrella A a la M, lo contrario que H-beta.`,
      prompt:
        '¿Qué significa que una línea se haga menos profunda y otra más a lo largo de la misma secuencia?',
      options: [
        'Cada línea tiene su propia dependencia de la temperatura, así que una línea no es un termómetro; el patrón de varias líneas, leídas unas contra otras, da la temperatura',
        'Una de las dos medidas debe de estar mal',
        'Los espectros se tomaron en noches distintas',
        'Las estrellas frías están más cerca, así que el sodio parece más profundo',
      ],
      hints: [
        'El hidrógeno necesita estar excitado; los átomos de sodio se ionizan fácilmente con el calor.',
      ],
      because:
        'El sodio está ionizado en las estrellas calientes y sobrevive en las frías, así que su línea se hace más profunda al bajar la temperatura, mientras que la línea de Balmer del hidrógeno tiene su máximo en medio. Una profundidad es una función de la temperatura que difiere según la línea, así que la clasificación espectral lee un patrón, y una sola línea no puede convertirse en temperatura sin decir de qué línea se trata.',
      misconceptions: [
        {
          say: 'Las dos son correctas: son dos líneas distintas con dos curvas distintas de profundidad frente a temperatura.',
        },
        {
          say: 'La distancia cambia lo brillante que parece una estrella, no lo profundas que son sus líneas respecto a su propio continuo.',
        },
      ],
    },
    'what-gravity-does': {
      title: 'La misma temperatura, distinta gravedad',
      body: `Toma dos estrellas a la misma temperatura: una enana de la secuencia principal y una gigante, cuyo radio es decenas de veces mayor y cuya gravedad superficial es miles de veces menor. El gas de la atmósfera de la enana es mucho más denso.`,
      prompt: '¿Cuál muestra las líneas más anchas, y por qué?',
      options: [
        'La enana: un gas denso significa más colisiones entre átomos, que ensanchan las líneas, así que las de la gigante son más estrechas',
        'La gigante: es más grande, así que sus líneas son más grandes',
        'Son iguales: la temperatura lo fija todo',
        'La gigante, porque menos gravedad significa más movimiento',
      ],
      hints: [
        'Las colisiones ensanchan una línea. ¿Dónde es más denso el gas?',
      ],
      because:
        'La enana. A la misma temperatura la atmósfera de la enana es más densa y sus átomos chocan más, lo que ensancha las líneas; la atmósfera tenue de una gigante da líneas estrechas. Así es como un espectro distingue una gigante de una enana del mismo color.',
      misconceptions: [
        {
          say: 'El tamaño no ensancha una línea; lo hace la densidad del gas.',
        },
        {
          say: 'La temperatura fija qué líneas aparecen, pero la densidad del gas cambia lo anchas que son.',
        },
      ],
    },
    'the-pack-has-no-giant': {
      title: 'Lo que las cuatro no pueden mostrar',
      body: `Las cuatro estrellas de SDSS no se eligieron para diferir en gravedad: sus tipos de catálogo son A1V, G5, K3V y M2Vvar, y el paquete no tiene ninguna gigante para ponerla junto a una enana. Así que esta investigación muestra la mitad de la temperatura con datos reales, y toma la mitad de la gravedad de la reproducción de la evolución, donde la gravedad superficial de una estrella modelo puede calcularse a partir de su masa y su radio. Los pasos profundos ponen números a tres límites: dónde queda el máximo de la estrella A, cuántas muestras conserva el paquete en el doblete del sodio y cuánto cambia la gravedad a lo largo de la vida de una estrella.`,
    },
  },
};

export const SPECTRA_TELL_TEMPERATURE_AND_GRAVITY_DEEPER_ES = {
  steps: {
    'the-peak-of-the-a-star': {
      title: 'Dónde tiene su máximo la estrella A',
      body: `La ley de Wien da la longitud de onda donde tiene su máximo un cuerpo negro: 2,898 &times; 10<sup>6</sup> nanómetros-kelvin divididos entre la temperatura. Usa 7852 K, la temperatura de catálogo del paquete para la estrella A. La primera muestra del paquete está en 381,5 nanómetros.`,
      prompt: 'La longitud de onda del máximo de la estrella A, en nanómetros',
      hints: ['2,898e6 / 7852.'],
      worked:
        '2,898e6 / 7852 = 369 nm, en el ultravioleta y más azul que la primera muestra del paquete en 381,5 nm. El espectrógrafo no ve el máximo de esta estrella, así que su temperatura tiene que salir de la forma del continuo ascendente y de las líneas, no de la posición de un máximo.',
      feedback: {
        close: 'Casi. Divide 2,898e6 entre 7852.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: el máximo está en unos pocos cientos de nanómetros.',
        off: '2,898e6 / 7852.',
      },
    },
    'samples-across-the-doublet': {
      title: 'Muestras a través del doblete',
      body: `Las líneas D del sodio están en 5891,58 y 5897,56 ångström en el vacío, separadas 5,975 ångström. Las muestras del paquete están espaciadas 0,0003 en log<sub>10</sub> de la longitud de onda, así que en 5894,6 ångström cada una dista de la siguiente 5894,6 &times; ln(10) &times; 0,0003.`,
      prompt: '¿Cuántas muestras del paquete caben entre las dos líneas?',
      hints: ['El espaciado es 4,07 ångström.'],
      worked:
        '5,975 / 4,072 = 1,47 muestras. El paquete promedió tres muestras del archivo en una, así que el doblete se reparte en una y media de sus muestras: las dos líneas están cerca de fundirse en el paquete incluso donde el espectrógrafo las separó.',
      feedback: {
        close:
          'Casi. El espaciado es longitud de onda × ln(10) × 0,0003; divide los 5,975 Å entre él.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: el doblete abarca una muestra y media.',
        off: '5,975 / (5894,6 × ln(10) × 0,0003).',
      },
    },
    'gravity-in-numbers': {
      title: 'La gravedad de una estrella a lo largo de su vida',
      body: `La gravedad superficial es <em>G M</em> entre <em>R</em> al cuadrado. En la reproducción el modelo de una masa solar tiene un radio de 0,884 radios solares al principio de su secuencia principal y 173 radios solares, con una masa de 0,954, en el extremo de su rama de gigante (el inicio de la fase de ignición del helio). Toma el logaritmo en base 10 del cociente de las dos gravedades.`,
      prompt: '¿Cuántas potencias de diez cae la gravedad superficial?',
      hints: [
        'g ∝ M / R², así que el cociente es (1 / 0,884²) / (0,954 / 173²).',
      ],
      worked:
        'g al principio es 1,28 (en unidades de radio solar), en el extremo 3,2e−5: un cociente de 40 000, 4,6 dex. La misma estrella tiene atmósferas con gravedades superficiales 40 000 veces distintas a lo largo de su vida, así que sus líneas son muy distintas y un espectro puede distinguir las dos etapas.',
      feedback: {
        close: 'Casi. Toma el logaritmo de (M1 / R1²) entre (M2 / R2²).',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: el radio crece en un factor de casi 200, y la gravedad va como su cuadrado.',
        off: 'log10((1 / 0,884²) / (0,954 / 173²)).',
      },
    },
    'resolved-or-not': {
      title: '¿Resueltas o no?',
      body: `Los espectrógrafos de SDSS tienen un poder de resolución de unos 1800 (la descripción del paquete SEGUE de NGC 2420). El elemento de resolución en 5894,6 ångström es la longitud de onda dividida entre 1800. Divide entre él la separación de 5,975 ångström del doblete.`,
      prompt:
        '¿A cuántos elementos de resolución están las dos líneas del sodio?',
      hints: ['El elemento de resolución es 5894,6 / 1800 = 3,27 ångström.'],
      worked:
        '5,975 / 3,275 = 1,82: el espectrógrafo separa las líneas, por poco, pero el paquete conserva solo 1,47 muestras entre ellas, así que el muestreo tira lo que el instrumento entregó. El poder de resolución y el muestreo son dos límites y manda el menor.',
      feedback: {
        close: 'Casi. Divide la separación entre longitud de onda / 1800.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: las líneas están a unos dos elementos de resolución.',
        off: '5,975 / (5894,6 / 1800).',
      },
    },
  },
};
