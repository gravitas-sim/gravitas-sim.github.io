export const MOONS_OF_THE_GIANTS_ES = {
  title: 'Las lunas de los gigantes',
  subtitle:
    'Tres periodos de un mismo conjunto de imágenes, y la combinación que vale cero cuando una familia de lunas lleva el paso',
  objectives: [
    'Leer los periodos de Ío, Europa y Ganímedes en imágenes ajustadas y formar sus cocientes',
    'Decir por qué un cociente cercano a 2 es un indicio de resonancia y no una prueba, y qué añade la combinación de los tres movimientos',
    'Hallar la combinación de Laplace de los tres movimientos, con su incertidumbre, y decir qué muestra y qué no un valor compatible con cero',
    'Decir por qué Calisto no forma parte de la cadena, con la misma aritmética',
  ],
  steps: {
    'a-family-of-moons': {
      title: 'Una familia de lunas',
      body: 'Un planeta gigante lleva consigo una familia. Júpiter tiene cuatro lunas grandes que se ven con unos prismáticos, Ío, Europa, Ganímedes y Calisto, y las tres interiores tienen una costumbre curiosa: cada una tarda casi el doble que la de dentro en dar una vuelta. Esta investigación lo mide a partir de imágenes.\n\nLas imágenes son las <strong>sintéticas</strong> de <em>Pesar a Júpiter con sus lunas</em>: hechas con las posiciones reales de las lunas en noviembre y diciembre de 2025 (JPL Horizons), con el disco de Júpiter, el desenfoque y el ruido añadidos. Nadie observó estas fotografías. Las distancias que lees son las medidas del instrumento; la superposición marca dónde pone el efemérides a cada luna.',
    },
    'three-periods-predict': {
      title: '¿Cómo se comparan los tres periodos?',
      body: 'Ío tarda unos 1,77 días en dar una vuelta. El instrumento ajusta una sinusoide a la distancia de cada luna a Júpiter en las 51 imágenes y lee el periodo de ella.',
      prompt:
        'El periodo de Europa, y luego el de Ganímedes, serán cada uno aproximadamente&hellip;',
      options: [
        'el doble del de la luna de dentro',
        'igual que el de la luna de dentro',
        'una vez y media el de la luna de dentro, porque las órbitas son 1,5 veces más anchas',
        'ningún patrón: los tres periodos no guardan relación',
      ],
      hints: [
        'Divide el periodo de Europa entre el de Ío, y el de Ganímedes entre el de Europa, cuando los tengas.',
      ],
      because:
        'Casi el doble cada uno: 2,006 y 2,013. La tercera ley de Kepler permitiría que una órbita 1,5 veces más ancha tardara 1,84 veces más, pero estos cocientes están más cerca de 2, y esa cercanía es el tema del resto.',
    },
    'three-periods': {
      title: 'Tres periodos',
      body: 'Con el muestreo en <strong>1</strong>, la secuencia diseñada de imágenes, lee el <strong>periodo</strong> de Ío, de Europa y de Ganímedes en días. Usa los cuatro decimales que da el instrumento: la aritmética siguiente es sensible a ellos.',
      fields: [
        { label: 'Periodo de Ío' },
        { label: 'Periodo de Europa' },
        { label: 'Periodo de Ganímedes' },
      ],
    },
    'the-ratios': {
      title: 'Cocientes que no llegan a dos',
      body: 'Escribe otra vez los tres periodos y el instrumento los dividirá: el de Europa entre el de Ío, y el de Ganímedes entre el de Europa.',
      fields: [
        { label: 'Periodo de Ío' },
        { label: 'Periodo de Europa' },
        { label: 'Periodo de Ganímedes' },
        { label: 'Periodo de Europa entre el de Ío' },
        { label: 'Periodo de Ganímedes entre el de Europa' },
      ],
    },
    'a-hint-is-not-proof': {
      title: '¿Qué dice 2,006?',
      body: 'Europa tarda 2,006 veces lo que Ío; Ganímedes, 2,013 veces lo que Europa. Ninguno es exactamente 2.',
      prompt:
        '¿Qué se deduce de unos cocientes cercanos a 2 pero no iguales a 2?',
      options: [
        'Nada queda decidido: un cociente cercano a 2 es un indicio, y hay que contrastar los tres movimientos juntos',
        'Las lunas no pueden estar en resonancia, porque una resonancia necesita que el cociente sea exactamente 2',
        'Las lunas están sin duda enlazadas, porque 2,006 se redondea a 2',
        'Los periodos deben de estar mal medidos',
      ],
      misconceptions: [
        {
          say: 'Una resonancia es una relación entre ángulos que se cumple en promedio mientras las órbitas giran despacio, así que los periodos medidos no tienen por qué dar un cociente exacto. El cociente es dónde mirar, no la prueba.',
        },
        {
          say: 'Cercano es lo que es un indicio. Muchos pares de periodos sin relación están a menos de un uno por ciento de un cociente sencillo; lo que separa un enlace de una coincidencia es una relación que se cumple para todos los movimientos a la vez, que construyen los pasos siguientes.',
        },
      ],
      hints: [
        'Piensa en cuántas veces dos periodos sin relación caen a menos de un uno por ciento de un cociente de números enteros.',
      ],
      because:
        'Un cociente cercano indica dónde mirar. Lo que Laplace encontró en 1805 es una relación que involucra a las tres lunas a la vez, y es la prueba que aplican los pasos siguientes.',
    },
    'the-laplace-combination': {
      title: 'Tres movimientos, una combinación',
      body: 'Convierte cada periodo en un <strong>movimiento</strong>, el ángulo que la luna recorre en un día: <em>n</em> = 360&deg; ÷ periodo. La combinación de Laplace es <strong><em>n</em><sub>Ío</sub> &minus; 3<em>n</em><sub>Europa</sub> + 2<em>n</em><sub>Ganímedes</sub></strong>. Los números 1, &minus;3 y 2 suman cero, así que un movimiento que las tres comparten, como el aparente que añade el propio viaje de Júpiter, se cancela. Ío da una vuelta a unos 204 grados por día.',
      prompt:
        'Si las tres lunas llevan el paso exacto, la combinación de los tres movimientos es&hellip;',
      options: [
        'cero',
        'unos 204 grados por día, el movimiento propio de Ío',
        'unos 50 grados por día, el de Ganímedes',
        'un número distinto cada noche',
      ],
      hints: [
        'Los coeficientes suman cero por una razón: mira qué hace con ellos un desplazamiento común.',
      ],
      because:
        'Cero. Donde las tres se mueven al paso, la relación se cumple exactamente para los movimientos medios, y el paso siguiente pone en ella los medidos, con la incertidumbre que dan los ajustes.',
    },
    'the-motions-together': {
      title: 'Los tres movimientos juntos',
      body: 'Escribe otra vez los tres periodos. El instrumento convierte cada uno en un movimiento en grados por día y forma el de Ío menos tres veces el de Europa más dos veces el de Ganímedes. Para tener una escala: las incertidumbres de los tres ajustes se combinan en unos <strong>&plusmn;0,025</strong> grados por día.',
      fields: [
        { label: 'Periodo de Ío' },
        { label: 'Periodo de Europa' },
        { label: 'Periodo de Ganímedes' },
        { label: 'Movimiento de Ío, grados por día' },
        { label: 'Movimiento de Europa, grados por día' },
        { label: 'Movimiento de Ganímedes, grados por día' },
        { label: 'Ío − 3 × Europa + 2 × Ganímedes, grados por día' },
      ],
    },
    'consistent-with-zero': {
      title: '¿Es 0,015 cero?',
      body: 'La combinación salió 0,015 grados por día, con una incertidumbre de unos 0,025.',
      prompt: '¿Qué dice eso sobre si vale cero?',
      options: [
        'Es compatible con cero: es menor que su propia incertidumbre, que es lo más cerca que pueden decir estas imágenes',
        'No es cero, así que las lunas no están en resonancia',
        'Es exactamente cero, así que las lunas están sin duda enlazadas',
        'No significa nada, porque 0,015 no es un número entero',
      ],
      misconceptions: [
        {
          say: 'Un valor menor que su incertidumbre no se distingue de cero con estas imágenes. No ser exactamente 0 es lo que hace toda medida.',
        },
        {
          say: 'Compatible con cero no es lo mismo que exactamente cero, y ninguna de las dos cosas prueba que las lunas estén enlazadas: la relación entre los movimientos es una condición necesaria. Lo que las imágenes no pueden mostrar es si el propio ángulo libra.',
        },
      ],
      hints: [
        'Compara 0,015 con el ±0,025 que dan las incertidumbres del instrumento.',
      ],
      because:
        'Compatible con cero. La combinación es unas 14 mil veces menor que el movimiento de Ío, y está dentro de su incertidumbre. Esa es la relación necesaria, observada. La parte suficiente, que el ángulo <em>libra</em> y no circula, necesita años de observación del ángulo; <em>Cuando las órbitas se enlazan</em> lo sigue en un modelo.',
    },
    'callisto-is-not-in-the-chain': {
      title: '¿Y Calisto?',
      body: 'Calisto es la cuarta luna, y la más lejana. Pon el instrumento en la <strong>luna 4</strong> y lee su periodo. Luego divídelo entre el de Ganímedes, 7,1413 días.',
      fields: [
        { label: 'Periodo de Calisto' },
        { label: 'Periodo de Calisto entre el de Ganímedes' },
      ],
    },
    'what-you-worked-out': {
      title: 'Lo que has deducido',
      body: 'Tres periodos de imágenes sintéticas, 1,7682, 3,5480 y 7,1413 días; cocientes de 2,006 y 2,013, cerca de 2 y no iguales a 2, lo cual es un indicio y no una prueba; y una combinación de los tres movimientos, 0,015 grados por día frente a una incertidumbre de 0,025, compatible con cero cuando cada movimiento es cientos de veces mayor. Calisto, con un cociente de 2,33, queda fuera de la cadena. Lo que las imágenes no pueden mostrar es el ángulo mismo manteniéndose durante años, que <em>Cuando las órbitas se enlazan</em> sigue en un modelo. Otros gigantes tienen familias propias (las lunas de Saturno, las de Urano), y este conjunto solo cubre las de Júpiter.',
    },
  },
};

export const THE_SCALE_OF_THE_SOLAR_SYSTEM_ES = {
  title: 'La escala del sistema solar',
  subtitle:
    'Distancias verdaderas del sandbox, el tiempo que tarda la luz y una maqueta en la que la Tierra es una canica',
  objectives: [
    'Leer las distancias de la Tierra, Júpiter y Neptuno al Sol en unidades astronómicas, en el sandbox dibujado a escala verdadera',
    'Convertir una distancia en el tiempo que tarda la luz en recorrerla',
    'Construir una maqueta en la que la Tierra es una canica, y decir dónde caen el Sol y Neptuno',
    'Decir qué hace mal un diagrama del sistema solar en una sola página, y qué conserva',
  ],
  steps: {
    'a-picture-you-have-seen': {
      title: 'Una imagen que ya has visto',
      body: 'Todo diagrama del sistema solar tiene el Sol, ocho planetas en fila y planetas dibujados lo bastante grandes para verse. Esta investigación usa en cambio el sandbox, donde las <strong>distancias son verdaderas</strong>: 100 unidades por unidad astronómica, la distancia de la Tierra al Sol. Los planetas se dibujan más grandes que su tamaño real para que se vean, y la vista empieza de Mercurio a Saturno porque una más amplia dejaría invisibles los planetas interiores. Desplázate para alejar la vista y encuentra a Neptuno.',
      tip: 'Las distancias de la lectura vienen del sandbox, no de una tabla; los pasos siguientes las comparan con los números que conoces.',
    },
    'three-distances': {
      title: 'Tres distancias',
      body: 'Lee la distancia de la <strong>Tierra</strong>, <strong>Júpiter</strong> y <strong>Neptuno</strong> al Sol en unidades astronómicas, en la lectura.',
      fields: [
        { label: 'Distancia de la Tierra al Sol' },
        { label: 'Distancia de Júpiter al Sol' },
        { label: 'Distancia de Neptuno al Sol' },
      ],
    },
    'light-time-predict': {
      title: '¿Cuánto tarda la luz?',
      body: 'La luz cruza una unidad astronómica en unos 8 minutos y 20 segundos, 499 segundos: es el retraso entre que algo ocurre en el Sol y lo vemos.',
      prompt: 'La luz del Sol tarda en llegar a Neptuno unos&hellip;',
      options: [
        'cuatro horas',
        'treinta minutos',
        'ocho minutos, lo mismo que hasta la Tierra',
        'cuatro días',
      ],
      hints: [
        'Neptuno está treinta veces más lejos que la Tierra: multiplica el tiempo.',
      ],
      because:
        'Unas cuatro horas: 30,07 por 499 segundos son 15 004 segundos, 4,17 horas. Un mensaje de una nave en Neptuno tardaría eso en llegar, en cada sentido.',
    },
    'light-time': {
      title: 'El tiempo de la luz hasta Neptuno',
      body: 'Escribe la distancia de Neptuno de la lectura. El tiempo de la luz es la distancia por 499 segundos, que el instrumento convierte en horas.',
      fields: [
        { label: 'Distancia de Neptuno al Sol' },
        { label: 'Tiempo de la luz del Sol a Neptuno' },
      ],
    },
    'earth-as-a-marble': {
      title: 'La Tierra como una canica',
      body: 'Construye una maqueta en la que la Tierra es una canica de un centímetro. La Tierra mide 12 742 kilómetros de diámetro y está a 149,6 millones de kilómetros del Sol.',
      prompt: 'En esa maqueta el Sol es aproximadamente&hellip;',
      options: [
        'una bola de un metro de ancho, a unos 117 metros de la canica',
        'una bola de unos centímetros de ancho, a un metro de la canica',
        'una bola de diez metros de ancho, a 10 metros de la canica',
        'del mismo tamaño que la canica',
      ],
      hints: [
        'Divide la distancia Tierra–Sol entre el diámetro de la Tierra; ese número de canicas cabe entre ellos.',
      ],
      because:
        'El Sol mide 109 diámetros terrestres, así que 109 centímetros, y entre él y la Tierra caben 11 741 canicas: 117 metros. Neptuno está treinta veces más lejos.',
    },
    'scale-model': {
      title: 'Dónde está Neptuno en la maqueta de la canica',
      body: 'Un centímetro de canica son 12 742 kilómetros. Calcula a qué distancia está la Tierra del Sol en la maqueta, en metros, y a qué distancia Neptuno, en kilómetros, con la distancia de Neptuno en unidades astronómicas.',
      fields: [
        { label: 'Distancia de Neptuno al Sol' },
        { label: 'De la Tierra al Sol en la maqueta' },
        { label: 'De Neptuno al Sol en la maqueta' },
      ],
    },
    'what-a-diagram-gets-wrong': {
      title: '¿Qué hace mal un diagrama de libro?',
      body: 'Un diagrama de una página muestra los planetas como puntos separados unos centímetros, con el Sol del tamaño de una moneda pequeña.',
      prompt:
        '¿Cuál es la principal diferencia del diagrama con la escala verdadera?',
      options: [
        'Los tamaños de los cuerpos están enormemente exagerados frente a las distancias entre ellos',
        'El orden de los planetas es incorrecto',
        'Las distancias están exageradas y los tamaños son correctos',
        'Está exactamente a escala, pero es demasiado pequeño para ver los detalles',
      ],
      misconceptions: [
        {
          say: 'Es al revés: los cuerpos son diminutos frente al espacio que los separa, y para que se vean se dibujan muchas veces más grandes. El sandbox conserva las distancias verdaderas y muestra los planetas mayores de lo real por la misma razón.',
        },
      ],
      hints: ['Piensa en la canica y el campo de fútbol.'],
      because:
        'Los tamaños están exagerados: a la escala verdadera de las distancias los planetas serían motas. El diagrama conserva el orden y, más o menos, el espaciado relativo; el sandbox conserva las distancias verdaderas y agranda los planetas para poder verlos.',
    },
    'what-you-worked-out': {
      title: 'Lo que has deducido',
      body: 'La Tierra, Júpiter y Neptuno a 1,00, 5,20 y 30,07 unidades astronómicas; luz del Sol que tarda 8 minutos en llegar a nosotros y 4,17 horas en llegar a Neptuno; y una Tierra de canica con el Sol de un metro de ancho a 117 metros y Neptuno a 3,5 kilómetros. Los tamaños de los planetas son lo único que el sandbox no muestra a escala verdadera; las investigaciones siguientes, sobre las lunas de los gigantes y sobre los cometas, parten de estas distancias.',
    },
  },
};

export const COMETS_AND_THE_SUN_ES = {
  title: 'Los cometas y el Sol',
  subtitle:
    'La órbita de un cometa modelo en el sandbox, cuánto se calienta en cada extremo, el Halley real como caso de transferencia y hacia dónde apuntan sus colas',
  objectives: [
    'Leer la distancia mínima y máxima de un cometa al Sol en su órbita del sandbox',
    'Estimar la temperatura de un núcleo cometario desnudo en cada extremo de su órbita, con la temperatura de emisión y su ley de la raíz cuadrada inversa',
    'Decir hacia dónde apunta la cola de iones de un cometa, venga o vaya, y por qué no es como la estela del humo',
    'Decir qué deja fuera la estimación de temperatura, y dónde el hielo empieza a hacerse gas',
  ],
  steps: {
    'a-dirty-snowball': {
      title: 'Una bola de nieve sucia',
      body: 'Un cometa son unos kilómetros de hielo y polvo en una órbita larga. Lejos del Sol está oscuro e inerte. Cerca del Sol el hielo pasa a gas, y el gas y el polvo escapan y forman una <strong>coma</strong> y dos colas. El sandbox tiene el Sol, los ocho planetas y unos cuantos cometas. Llevan los nombres de cometas famosos, pero el sandbox coloca cada uno a la distancia de su órbita media con el 70 por ciento de la velocidad de una órbita circular, así que son <strong>cometas modelo en órbitas propias</strong>, no las órbitas reales.',
      tip: 'Los cometas se mueven deprisa. Pausa la simulación para leer un número; vuelve a ponerla en marcha para ver las colas.',
    },
    'tail-predict': {
      title: '¿Hacia dónde apunta la cola?',
      body: 'Un cometa tiene cabeza y cola, y una cola sugiere algo que se arrastra detrás, como el humo de un tren en marcha.',
      prompt: 'La cola principal (de iones) de un cometa apunta&hellip;',
      options: [
        'lejos del Sol, vaya el cometa hacia donde vaya',
        'detrás del cometa, opuesta a su movimiento',
        'delante del cometa, a lo largo de su movimiento',
        'hacia el Sol',
      ],
      hints: ['¿Qué siente del Sol el gas de la cola?'],
      because:
        'Lejos del Sol. La cola de iones es gas arrastrado directamente lejos por el viento solar, así que al salir del sistema solar interior va delante del cometa en lugar de detrás. La cola de polvo, más ancha y curva, sí se queda atrás a lo largo de la órbita.',
    },
    'watch-the-tails': {
      title: 'Mira las colas',
      body: 'Sigue a los cometas mientras giran y compara la cola de cada uno con la dirección del Sol. La lectura dice si el primer cometa se mueve hacia el Sol o se aleja de él.',
      checklist: [
        'Busca un cometa con una cola visible, cerca del Sol',
        'Ve la cola estrecha de iones apuntar lejos del Sol',
        'Ve el mismo cometa mientras se aleja del Sol: ¿dónde está ahora su cola?',
      ],
    },
    'going-out': {
      title: 'De camino hacia fuera',
      body: 'Un cometa se aleja del Sol.',
      prompt: 'Su cola de iones está&hellip;',
      options: [
        'delante del núcleo, apuntando lejos del Sol',
        'detrás del núcleo, arrastrándose como el humo',
        'ausente, porque las colas solo se forman al acercarse',
        'plegada sobre el núcleo',
      ],
      misconceptions: [
        {
          say: 'Esa es la cola de polvo, y solo aproximadamente. La cola de gas es arrastrada directamente lejos del Sol, así que al alejarse el núcleo sigue a su propia cola.',
        },
      ],
      hints: ['La cola apunta lejos del Sol; ¿hacia dónde va el cometa?'],
      because:
        'Delante del núcleo. La dirección de la cola la fija el Sol, no el movimiento del cometa, así que un cometa que se aleja vuela con la cola por delante.',
    },
    'orbit-ends': {
      title: 'Los dos extremos de la órbita',
      body: 'Lee la <strong>mínima distancia</strong> y la <strong>máxima distancia</strong> del primer cometa al Sol, en unidades astronómicas, en la lectura. Son los dos extremos de la órbita, el perihelio y el afelio.',
      fields: [
        { label: 'Mínima distancia al Sol' },
        { label: 'Máxima distancia al Sol' },
      ],
    },
    'heat-at-the-ends': {
      title: '¿Cuánto calor en cada extremo?',
      body: 'Un núcleo desnudo y oscuro (albedo de Bond 0,04) que reparte la luz solar que absorbe por toda su superficie irradia a su <strong>temperatura de emisión</strong>, 275,5 K a 1 UA. Cae como uno sobre la raíz cuadrada de la distancia. Escribe las dos distancias del paso anterior y el instrumento da la temperatura en cada extremo. Es una estimación de cuerpo desnudo: un cometa pierde energía al pasar el hielo a gas y un núcleo real no es uniforme.',
      fields: [
        { label: 'Mínima distancia al Sol' },
        { label: 'Máxima distancia al Sol' },
        { label: 'Temperatura en la mínima distancia' },
        { label: 'Temperatura en la máxima distancia' },
      ],
    },
    'the-real-halley': {
      title: 'El Halley real',
      body: 'El cometa que el sandbox llama Halley no está en la órbita de Halley. El cometa real se acerca a unos <strong>0,586 UA</strong> del Sol en su punto más cercano, dentro de la órbita de Venus. Usa la misma estimación para la aproximación mínima real.',
      fields: [
        { label: 'La aproximación mínima del Halley real' },
        { label: 'Temperatura en la aproximación mínima real' },
      ],
    },
    'why-a-tail-near-the-sun': {
      title: '¿Por qué una cola cerca del Sol?',
      body: 'Un cometa puede pasar siglos sin cola y echar una en meses.',
      prompt: '¿Por qué le sale una cola a un cometa al entrar hacia el Sol?',
      options: [
        'El núcleo, más caliente, pasa su hielo a gas, y el gas y el polvo escapan y son empujados lejos del Sol',
        'La gravedad del Sol lo estira',
        'Va más deprisa, así que el aire corre a su lado',
        'La cola estaba ahí siempre, y solo se hace visible',
      ],
      misconceptions: [
        {
          say: 'Aquí fuera no hay aire que corra a su lado. Lo que se arrastra es gas que el propio cometa perdió, por la luz del Sol y el viento solar.',
        },
      ],
      hints: [
        'La temperatura en el extremo cercano era mucho mayor que en el lejano.',
      ],
      because:
        'El calor. La temperatura del núcleo sube como uno sobre la raíz cuadrada de la distancia; el hielo pasa a gas hacia los 160 K, y el gas y el polvo que escapan forman la coma y las colas. La luz del Sol y el viento solar empujan la cola lejos del Sol.',
    },
    'what-you-worked-out': {
      title: 'Lo que has deducido',
      body: 'La órbita de un cometa tiene dos extremos, aquí leídos en el sandbox; un núcleo desnudo está más caliente, en el extremo cercano, en la raíz cuadrada del cociente de esas distancias; el cometa modelo se queda por debajo de los 160 K a los que el hielo pasa a gas, y el Halley real, a 0,586 UA, llega a 360 K; y la cola de iones apunta siempre lejos del Sol, así que un cometa vuela con la cola por delante al alejarse. Un cometa real añade lo que esta estimación deja fuera: su reflectividad, la energía gastada en pasar el hielo a gas y su giro.',
    },
  },
};
