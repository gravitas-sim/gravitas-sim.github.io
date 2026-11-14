export const HOW_OLD_IS_THIS_WHITE_DWARF_ES = {
  title: '¿Qué edad tiene esta enana blanca?',
  subtitle:
    'Lee cuánto tiempo lleva enfriándose una enana blanca a partir de su masa y de su luz, y mantén separada la incertidumbre de la medida del error de la ley',
  objectives: [
    'Decir por qué se enfría una enana blanca, y por qué se enfría más despacio cuanto más débil es',
    'Leer la edad de enfriamiento de una enana blanca a partir de su masa y de su luminosidad o su temperatura',
    'Decir que una edad tiene dos incertidumbres, una de las medidas y otra de la ley, y cuál de ellas pueden quitar mejores medidas',
    'Decir dónde está comprobada la ley, y por qué una enana fuera de ese intervalo recibe una cota y no una edad',
  ],
  steps: {
    'an-ember-cooling': {
      title: 'Una brasa que se enfría',
      body: 'Una enana blanca es lo que queda de una estrella que ha dejado de quemar combustible. No produce calor propio. Brilla con el calor que sus núcleos guardaron cuando era estrella, y lo deja salir despacio por una capa exterior delgada, así que se enfría, y cuanto más tiempo lleva enfriándose, más débil es. Eso es un reloj: si se sabe a qué ritmo se enfría una enana blanca, su brillo dice hace cuánto se formó. \n\nEl panel lo hace con una ley del tipo de la de Mestel. Dale la masa de una enana blanca y su luminosidad, y da la <strong>edad de enfriamiento</strong>: el tiempo desde que empezó a enfriarse. Aquí hay una enana blanca de 0,6 masas solares, más o menos la masa más común, con una milésima de la luminosidad del Sol. La ley es un modelo, y el panel dice dónde está comprobada.',
    },
    'ten-times-fainter': {
      title: 'Diez veces más débil',
      body: 'Una enana blanca de 0,6 masas solares con una milésima de la luminosidad del Sol lleva enfriándose algo menos de mil millones de años. Se sigue enfriando hasta ser diez veces más débil, con una diezmilésima.',
      prompt:
        'Comparada con su edad con una milésima, su edad con una diezmilésima será&hellip;',
      options: [
        'casi la misma: una enana blanca apenas cambia',
        'unas diez veces mayor: diez veces más débil tarda diez veces más',
        'unas cinco veces mayor: se enfría más despacio cuanto más débil es',
        'el doble',
      ],
      hints: [
        'Cuanto más caliente está un cuerpo, más deprisa pierde calor. ¿Qué le hace eso al tiempo que tarda en bajar otra vez por el mismo factor?',
      ],
      because:
        'Unas cinco veces. Una enana blanca caliente pierde su calor deprisa y una fría despacio, así que cada factor de diez en la luminosidad tarda más que el anterior: en la ley la edad crece como la luminosidad elevada a menos cinco séptimos, y diez elevado a cinco séptimos es 5,2. Llegar a una milésima tarda menos de mil millones de años y llegar a una diezmilésima, unos cuatro mil millones.',
    },
    'read-two-ages': {
      title: 'Lee dos edades',
      body: 'Pon la <strong>luminosidad</strong> en una diezmilésima de la del Sol (el log10 es &minus;4,0) y lee la edad de enfriamiento; luego vuelve a una milésima (&minus;3,0) y lee esa. Da las dos en miles de millones de años.',
      fields: [
        { label: 'Edad con una diezmilésima' },
        { label: 'Edad con una milésima' },
      ],
    },
    'two-uncertainties': {
      title: 'Dos incertidumbres',
      body: 'Una edad de enfriamiento tiene dos incertidumbres. Una viene de cuán bien se conocen la masa y la luminosidad. El control <strong>Medida</strong> del panel la fija: exacta, buena (la masa a 0,02 masas solares, la luminosidad a 0,02 en log10), típica o pobre. La otra viene de la propia ley: Gravitas la comparó con una tabla publicada de enfriamiento de enanas blancas y midió cuánto se aparta. El panel está en medidas buenas; lee las dos líneas.',
      prompt: '¿Qué fija sobre todo la anchura del intervalo?',
      options: [
        'El error propio de la ley, de unos ± 19 por ciento: las medidas añaden unos ± 8 por ciento encima',
        'Las medidas, de unos ± 19 por ciento: la ley añade unos ± 8 por ciento encima',
        'Solo las medidas: una ley es exacta una vez escrita',
        'Las dos son lo mismo',
      ],
      hints: [
        'Pon la medida en exacta. El intervalo se estrecha, pero ¿se cierra?',
      ],
      because:
        'El de la ley. Con medidas buenas el intervalo es la edad más o menos un 20 por ciento, y incluso con medidas exactas es más o menos 19: es el error que la ley comete frente a la tabla publicada, y mejores medidas no pueden quitarlo. Solo una ley mejor, o las propias tablas, pueden.',
      misconceptions: [
        {
          say: 'Una ley es una simplificación de una estrella. Esta tiene un solo depósito de calor y una sola manera de perderlo; la estrella real tiene más, y la diferencia es el error que el panel declara.',
        },
        {
          say: 'Son distintas: una es sobre los números que se meten, la otra sobre la fórmula en que entran, y solo la primera se reduce con mejores medidas.',
        },
      ],
    },
    'beyond-the-edge': {
      title: 'Más allá del borde',
      body: 'Pon la luminosidad en &minus;4,4, más fría que la enana blanca más débil para la que la ley está comprobada. El panel no da edad.',
      prompt: '¿Por qué no da ninguna?',
      options: [
        'Por debajo de esa luminosidad otras cosas fijan el enfriamiento, como que los iones se congelen en un cristal, y la ley que las deja fuera ya no está comprobada ahí',
        'Porque una enana blanca no puede ser tan débil',
        'Porque la edad sería mayor que la edad del universo',
        'Porque el panel no puede calcular un número tan pequeño',
      ],
      hints: [
        'La ley tiene un solo depósito de calor y una sola manera de perderlo. ¿Qué le pasa a un depósito de calor cuando sus iones se congelan?',
      ],
      because:
        'La ley cuenta el calor de los iones y nada más. Al enfriarse una enana blanca sus iones se congelan en un cristal y sueltan calor latente, y con luminosidades más bajas sus vibraciones cambian cuánto calor guardan: ambas cosas cambian el enfriamiento de maneras que la ley deja fuera. El panel se niega antes que dar una edad que no ha comprobado.',
      misconceptions: [
        {
          say: 'La ley daría unos ocho mil millones de años, que es menos que la edad del universo; lo que falta es la física, no el tamaño del número.',
        },
      ],
    },
    'a-bound-not-an-age': {
      title: 'Una cota, no una edad',
      body: 'Se halla una enana blanca de 0,6 masas solares con una luminosidad de &minus;4,4, más allá del borde. El panel en el borde, &minus;4,0, da una edad de 4,1 miles de millones de años, con un intervalo de 3,4 a 4,9. Una enana blanca solo se vuelve más débil con el tiempo.',
      prompt: '¿Qué puedes decir de la edad de la de −4,4?',
      options: [
        'Al menos unos 3,4 miles de millones de años: lleva enfriándose más tiempo del que cuesta llegar al borde, y la edad del borde no puede ser menor que 3,4',
        '7,9 miles de millones de años: extiende un poco la ley',
        'Menos de 4,1 miles de millones de años',
        'Nada en absoluto',
      ],
      hints: [
        'Una enana blanca más fría lleva enfriándose más tiempo que una más caliente de la misma masa. ¿Cuál es lo mínimo que puede valer la edad de la más caliente?',
      ],
      because:
        'Tiene al menos unos 3,4 miles de millones de años (el extremo inferior del intervalo en el borde). Es una cota, no una edad, y es una que la ley puede dar donde no puede dar la edad. También dice algo de la población de la estrella: la progenitora de la enana blanca vivió antes que ella, así que la población es aún más antigua.',
      misconceptions: [
        {
          say: 'Extender la ley más allá del borde da un número, pero la física que toma el relevo allí, la cristalización entre ella, es lo que la ley deja fuera.',
        },
      ],
    },
    'what-the-age-says': {
      title: 'Lo que dice la edad',
      body: `La edad de enfriamiento de una enana blanca sale de su masa y de su luz con una ley comprobada de 0,5 a 1,0 masas solares y de una diezmilésima a un treintavo de la luminosidad del Sol. La edad lleva dos incertidumbres, la de las medidas y la de la propia ley; con medidas exactas queda solo la segunda, cerca del 19 por ciento. Más allá del borde el panel da una cota y no una edad, y la ley es un modelo comprobado con secuencias de modelos publicadas: esta investigación no incluye ninguna tabla de enanas blancas observadas.`,
    },
  },
};

export const HOW_OLD_IS_THIS_WHITE_DWARF_DEEPER_ES = {
  steps: {
    'from-a-temperature': {
      title: 'A partir de una temperatura',
      body: 'Un espectro da la temperatura de una enana blanca más directamente que su luminosidad. Pon <strong>Dar</strong> en temperatura, la temperatura en 6000 K, la masa en 0,6 y la medida en buena. El panel convierte la temperatura en luminosidad con el radio de la enana blanca. Lee la <strong>edad</strong>, la parte de la incertidumbre que viene de las medidas y la que viene de la ley, como porcentajes.',
      fields: [
        { label: 'Edad de enfriamiento' },
        { label: 'De las medidas' },
        { label: 'De la ley' },
      ],
    },
    'heavier-is-older': {
      title: 'Más pesada, y más vieja',
      body: 'Muestra <strong>por masa</strong>, la edad frente a la masa, con una luminosidad de &minus;3,5. Una enana blanca de 0,5 masas solares con esa luminosidad tiene 1,6 miles de millones de años; una de 1,0 masas solares, 2,6.',
      prompt:
        '¿Por qué es más vieja la enana más pesada con la misma luminosidad?',
      options: [
        'Tiene más iones, así que más calor, y con la misma luminosidad tarda más en soltarlo: la edad crece como la masa elevada a cinco séptimos, 1,64 veces para el doble de masa',
        'Se formó antes',
        'Es más grande, así que se enfría más despacio',
        'No es más vieja: el panel se equivoca',
      ],
      hints: [
        'El calor es el de los iones. El doble de masa tiene el doble de iones. ¿Qué le hace eso al tiempo que tarda en perderlo a un ritmo dado?',
      ],
      because:
        'La edad es el depósito de calor dividido por el ritmo al que se pierde, y el depósito crece con la masa mientras que, con una luminosidad dada, el ritmo es fijo; el resto de la ley (la temperatura interior depende de la masa) baja la potencia de uno a cinco séptimos. El doble de masa da 2 elevado a cinco séptimos, 1,64 veces la edad: 2,59 frente a 1,58 miles de millones de años.',
      misconceptions: [
        {
          say: 'Una enana blanca más pesada es más pequeña, no más grande: su radio baja al subir su masa (mira El límite).',
        },
      ],
    },
    'what-better-measurements-buy': {
      title: 'Lo que compran mejores medidas',
      body: 'Pon la medida en <strong>exacta</strong>, para una enana blanca de 0,6 masas solares en &minus;3,0. La edad es 0,79 miles de millones de años. Lee los dos extremos del intervalo del 95 por ciento: es lo que queda cuando las medidas son perfectas.',
      fields: [{ label: 'Extremo inferior' }, { label: 'Extremo superior' }],
    },
    'why-two-terms': {
      title: 'Por qué el error de la ley está en el intervalo',
      body: 'Gravitas probó el intervalo con 1166 enanas blancas simuladas de masas 0,7, 0,8 y 0,9 a las que no se ajustó la ley, con sus edades verdaderas tomadas de la tabla publicada y medidas tan ruidosas como las del panel: 0,03 masas solares y 0,04 en log10 de la luminosidad. Un intervalo del 95 por ciento hecho solo con las medidas contenía la edad verdadera el 86 por ciento de las veces. Con el error propio de la ley añadido, la contenía el 96 por ciento.',
      prompt: '¿Qué dice la diferencia?',
      options: [
        'El error de la ley es real: un intervalo que lo deja fuera es demasiado estrecho, y dice estar más seguro de lo que está',
        'Las medidas no eran lo bastante ruidosas',
        'La tabla se equivoca donde la ley acierta',
        'Los intervalos deben ser siempre más anchos, diga lo que diga la prueba',
      ],
      hints: [
        'Un intervalo que debe contener la verdad el 95 por ciento de las veces debería hacerlo en una prueba donde se conoce la verdad.',
      ],
      because:
        'Un intervalo es una promesa sobre cuántas veces contiene la verdad, y una promesa que falla en una prueba donde se conoce la verdad es demasiado estrecha. Dejar fuera la ley hizo que el intervalo se equivocara una vez de cada siete; ponerla lo llevó al ritmo declarado. La tabla es en sí un modelo, así que el término es el error de la ley frente a ella, no frente al cielo.',
      misconceptions: [
        {
          say: 'Un intervalo más ancho de lo necesario también es incorrecto: afirma saber menos de lo que dicen los datos. La prueba comprueba los dos lados.',
        },
      ],
    },
    'why-not-a-heavy-one': {
      title: 'Por qué se rechazan 1,2 masas solares',
      body: 'Pon la masa en 1,2. El panel no da edad, aunque con la misma luminosidad a 1,0 sí la da. Frente a la tabla publicada, la ley con 1,2 masas solares se equivoca en un 21 por ciento en la mediana y en un 49 por ciento en el peor caso, en el mismo intervalo de luminosidad. Dentro del intervalo de 0,5 a 1,0 masas solares se equivoca en un 7,5 por ciento en la mediana y como mucho en un 32 por ciento.',
      prompt: '¿Para qué sirve el rechazo?',
      options: [
        'La ley está comprobada de 0,5 a 1,0 masas solares, y las enanas blancas más pesadas se cristalizan con luminosidades dentro del intervalo, algo que la ley deja fuera; el mayor error allí lo muestra',
        'Una enana blanca de 1,2 masas solares no existe',
        'Al panel se le acaba la memoria',
        'Las enanas blancas más pesadas son más calientes, y la ley no sabe de calor',
      ],
      hints: [
        'El borde del intervalo es donde las comprobaciones dejan de pasar, no donde la estrella deja de existir.',
      ],
      because:
        'Las enanas blancas de 1,2 masas solares existen, y la ley podría darles un número, pero no está comprobada allí, y donde se comparó es peor: los iones de una enana blanca pesada se congelan con luminosidades mayores, algo que la ley deja fuera. Un rechazo marca el borde de lo que se probó.',
      misconceptions: [
        {
          say: 'Existen, hasta el límite cercano a 1,4 masas solares. El rechazo es sobre la ley, no sobre las estrellas.',
        },
      ],
    },
  },
};

export const FROM_STAR_TO_REMNANT_ES = {
  title: 'De estrella a remanente',
  subtitle:
    'Sigue lo que deja una estrella a partir de la masa con que nació: una enana blanca de una masa que la estrella perdió en gran parte, o una estrella de neutrones o un agujero negro, con las probabilidades y no un veredicto',
  objectives: [
    'Decir que la mayor parte de la masa de una estrella se pierde antes de ser enana blanca, y leer la masa final a partir de la masa inicial',
    'Decir que la masa final de las enanas blancas se dispersa en torno a la relación, y que eso es real',
    'Decir que las masas en que cambia la clase de remanente solo se conocen como intervalos, así que la respuesta cerca de ellas es una probabilidad',
    'Decir por qué una estrella de neutrones puede ser más pesada que el límite de una enana blanca',
  ],
  steps: {
    'three-ends': {
      title: 'Tres finales',
      body: 'Una estrella que ha gastado su combustible deja una de tres cosas. Las estrellas más ligeras, la gran mayoría, dejan una <strong>enana blanca</strong>. Las más pesadas explotan y dejan una <strong>estrella de neutrones</strong> o, si el núcleo es lo bastante pesado, un <strong>agujero negro</strong>. Cuál, y cuán pesada, depende de la masa con que nació la estrella. \n\nEl panel da ambas cosas. Para estrellas de hasta unas pocas masas solares da la masa final de la enana blanca a partir de una relación ajustada a enanas blancas de cúmulos estelares, cuyas edades dan la masa con que empezaron sus progenitoras. Para todas las masas da la <strong>probabilidad</strong> de cada clase de remanente, a partir de intervalos de la literatura para las masas en que la clase cambia. Da probabilidades y nunca una respuesta única, porque los cambios no se conocen mejor que un intervalo.',
    },
    'how-heavy-the-ember': {
      title: 'Cuán pesada la brasa',
      body: 'Una estrella nace con 3 masas solares y acaba como enana blanca.',
      prompt: 'La enana blanca tendrá una masa de unas&hellip;',
      options: [
        '3 masas solares: no se pierde nada',
        '1,5 masas solares: conserva la mitad',
        '0,75 masas solares: se pierde la mayor parte de la estrella',
        '0,1 masas solares',
      ],
      hints: [
        'Una estrella acaba soltando sus capas exteriores. ¿Cuánto de la estrella hay en ellas?',
      ],
      because:
        'Unas 0,75 masas solares. La estrella pierde la mayor parte de su masa en vientos y en la envoltura que expulsa al final, y lo que queda es el núcleo, una cuarta parte de lo que tenía al empezar. La relación leída de enanas blancas de cúmulos da 0,745.',
    },
    'read-the-final-mass': {
      title: 'Lee la masa final',
      body: 'El panel está puesto en una estrella de 3 masas solares y la relación de los modelos estelares MIST. Lee la <strong>masa final</strong> y la <strong>masa perdida</strong> como porcentaje de la masa inicial.',
      fields: [{ label: 'Masa final' }, { label: 'Masa perdida' }],
    },
    'a-star-near-a-threshold': {
      title: 'Una estrella cerca de un umbral',
      body: 'Muestra las <strong>probabilidades</strong> y pon la masa inicial en 8,25 masas solares. En algún punto entre 7 y 9,5 masas solares una estrella deja de dejar una enana blanca y empieza a explotar, y las estimaciones publicadas difieren en tanto.',
      prompt: '¿Qué dice el panel que deja una estrella de 8,25 masas solares?',
      options: [
        'Una enana blanca o una estrella de neutrones, con las mismas probabilidades: nadie puede decir cuál',
        'Una enana blanca, porque 8,25 es menos de 9',
        'Una estrella de neutrones, porque es más de 8',
        'Un agujero negro',
      ],
      hints: ['Las probabilidades de la lectura suman uno. ¿Cuáles son?'],
      because:
        'Las mismas, 50 por ciento cada una. El cambio de enana blanca a estrella de neutrones se sitúa en algún punto entre 7 y 9,5 masas solares, y 8,25 está en la mitad de ese intervalo, así que una estrella de esa masa es tan probable a un lado como al otro. La respuesta honrada son las probabilidades, no una clase.',
      misconceptions: [
        {
          say: 'Algunas estimaciones publicadas sitúan el cambio cerca de 9 y otras cerca de 8; una estrella de 8,25 está a un lado de una de ellas y al otro lado de la otra.',
        },
      ],
    },
    'read-the-odds': {
      title: 'Lee las probabilidades',
      body: 'Pon la masa inicial en 25 masas solares, mostrando todavía las probabilidades. Lee la probabilidad de una <strong>estrella de neutrones</strong> y de un <strong>agujero negro</strong>, como porcentajes.',
      fields: [{ label: 'Estrella de neutrones' }, { label: 'Agujero negro' }],
    },
    'a-limit-for-a-white-dwarf': {
      title: 'Un límite para una enana blanca',
      body: 'Muestra las <strong>estrellas de neutrones</strong>. Las masas son las de los componentes de siete sistemas de dos estrellas de neutrones, medidas a partir de sus órbitas. La línea naranja es la mayor masa que puede tener una enana blanca en el modelo de <em>El límite</em>, 1,46 masas solares. El púlsar del sistema J0453+1559 tiene 1,559, por encima.',
      prompt: '¿Rompe eso el límite?',
      options: [
        'No: el límite es para una estrella sostenida por electrones, y una estrella de neutrones la sostienen los neutrones y las fuerzas entre ellos, que tienen otro límite',
        'Sí: así que el límite está mal',
        'Sí: así que el púlsar debe ser una enana blanca',
        'No: la medida debe estar mal',
      ],
      hints: ['¿Qué sostiene a cada una de las dos frente a la gravedad?'],
      because:
        'A una enana blanca la sostiene la presión de sus electrones, y esa presión no puede sostener más de unas 1,4 masas solares. A una estrella de neutrones la sostienen los neutrones, mucho más comprimidos, y las fuerzas entre ellos, y su límite es mayor; las estrellas de neutrones mejor medidas tienen unas 2 masas solares.',
      misconceptions: [
        {
          say: 'El límite de El límite es una afirmación sobre las enanas blancas. No dice nada de una estrella sostenida de otra manera.',
        },
      ],
    },
    'what-the-odds-say': {
      title: 'Lo que dicen las probabilidades',
      body: `La masa con que nace una estrella solo fija lo que deja como probabilidades. La relación entre masa inicial y masa final da la masa de la enana blanca con una dispersión de 0,06 masas solares que es real y no un error de medida. Una estrella de unas 8 masas solares puede dejar una enana blanca o una estrella de neutrones, y una de 20 a 40 una estrella de neutrones o un agujero negro, porque los umbrales solo se conocen como rangos; por eso el panel nombra un desenlace solo cuando sus probabilidades son de nueve de cada diez o más. Una estrella de neutrones puede ser más pesada que el límite de una enana blanca, porque ese límite es de los electrones y no de los neutrones.`,
    },
  },
};

export const FROM_STAR_TO_REMNANT_DEEPER_ES = {
  steps: {
    'the-relation-at-two-masses': {
      title: 'La relación en dos masas',
      body: 'Muestra otra vez la <strong>masa final</strong>. Lee la masa final de una estrella nacida con <strong>1,0</strong> masa solar, y luego de una nacida con <strong>6,0</strong>.',
      fields: [{ label: 'Con 1,0 M☉' }, { label: 'Con 6,0 M☉' }],
    },
    'models-or-scatter': {
      title: '¿Modelos o dispersión?',
      body: 'La masa inicial de una enana blanca de cúmulo no se mide: se deduce de la edad del cúmulo y de modelos estelares, y dos conjuntos de modelos, MIST y PARSEC, dan dos relaciones. Con 5 masas solares dicen 1,006 y 0,983 masas solares. La dispersión de las enanas blancas en torno a cualquiera de ellas es 0,06.',
      prompt: '¿Qué concluyes con esta masa?',
      options: [
        'La elección de modelos estelares mueve la respuesta unas 0,02, menos de la mitad de la dispersión: aquí importa más la dispersión de las enanas blancas que los modelos',
        'Los modelos discrepan, así que ninguno puede usarse',
        'MIST acierta y PARSEC se equivoca',
        'La dispersión es la diferencia entre los modelos',
      ],
      hints: [
        'Compara la diferencia entre las dos líneas con la dispersión, 0,06.',
      ],
      because:
        'Las dos relaciones están a 0,023 masas solares con 5 masas solares, bien dentro de las 0,06 en que difieren entre sí enanas blancas de la misma masa inicial. Por encima de unas 5,5 masas solares las dos se separan más, y allí la elección de modelos cuenta más.',
      misconceptions: [
        {
          say: 'Ninguna es una medida: cada una es un ajuste a enanas blancas cuyas masas iniciales dependen de los modelos usados para obtenerlas.',
        },
      ],
    },
    'ranges-not-edges': {
      title: 'Intervalos, no bordes',
      body: 'Con 30 masas solares el panel da una probabilidad de agujero negro del 50 por ciento. Sale de un intervalo, de 20 a 40 masas solares, en el que el trabajo publicado sitúa el cambio a agujeros negros, y el panel trata cada masa del intervalo como igual de probable.',
      prompt: '¿Qué es ese 50 por ciento, y qué no es?',
      options: [
        'Una manera de decir que la masa del cambio no se conoce mejor que el intervalo; no es una probabilidad medida, y los artículos hallan además que por encima de 20 masas solares que una estrella explote ni siquiera es una función regular de su masa',
        'La probabilidad, medida, de que una estrella real de 30 masas solares acabe como agujero negro',
        'La fracción de la estrella que cae en el agujero',
        'La precisión de la masa',
      ],
      hints: [
        'La probabilidad sale de un intervalo de masas, no de contar estrellas.',
      ],
      because:
        'Es la manera que tiene el panel de decir que el cambio está en algún punto de un intervalo de 20. Tratar el intervalo como uniforme es una simplificación del panel; los artículos dan el intervalo y afirman que, por encima de 20 masas solares, estrellas de masas vecinas pueden acabar de otra manera, en islas de explosión entre la formación de agujeros negros, así que ninguna probabilidad suave es el mapa verdadero.',
      misconceptions: [
        {
          say: 'No se contó ningún conjunto observado de estrellas para obtenerlo. Sale de los intervalos que da la literatura.',
        },
      ],
    },
    'a-wide-interval': {
      title: 'Un intervalo ancho',
      body: 'Con 1,0 masa solar el intervalo del 95 por ciento de la masa final es de 0,43 a 0,70, unas 0,14 a cada lado. Con 3,0 es de 0,20 a 1,29, unas 0,54 a cada lado, aunque la dispersión de los datos es 0,06 en ambas.',
      prompt: '¿Por qué es tanto más ancho con 3,0?',
      options: [
        'Las incertidumbres del artículo para el trozo empinado de la relación son grandes, y el panel toma la pendiente y la ordenada como independientes, lo que las exagera porque una pendiente mayor viene con una ordenada menor',
        'Las estrellas de 3 masas solares se dispersan más que las de 1',
        'El panel suma la dispersión tres veces',
        'No hay enanas blancas de esa masa',
      ],
      hints: [
        'La anchura es la dispersión de los datos combinada con la incertidumbre de los coeficientes ajustados. ¿Cuál es mayor con 3,0?',
      ],
      because:
        'La dispersión sola daría más o menos 0,12 con cualquier masa. El resto es la incertidumbre de la recta ajustada, que en el trozo empinado entre 2,85 y 3,6 es grande (± 0,27) porque los errores de su pendiente y su ordenada son grandes y se toman como independientes. En el ajuste van en sentidos opuestos, así que el intervalo del panel es demasiado ancho allí; el artículo no da la correlación.',
      misconceptions: [
        {
          say: 'La dispersión que da el artículo es la misma, 0,06, para toda la relación.',
        },
      ],
    },
  },
};
