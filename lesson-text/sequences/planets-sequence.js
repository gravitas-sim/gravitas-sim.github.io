export const MOONS_OF_THE_GIANTS_ES = {
  title: 'Las lunas de los gigantes',
  subtitle:
    'Tres periodos de un mismo conjunto de imágenes, y la combinación que vale cero cuando una familia de lunas lleva el paso',
  objectives: [
    'Leer los periodos de Ío, Europa y Ganímedes en imágenes ajustadas y formar sus cocientes',
    'Decir por qué un cociente cercano a 2 es un indicio de resonancia y no una prueba, y qué añade la combinación de los tres movimientos',
    'Elegir el muestreo, hallar la combinación de Laplace de los tres movimientos con su incertidumbre, y decir qué muestra y qué no un valor compatible con cero',
    'Predecir, y luego comprobar con la misma aritmética, si Calisto forma parte de la cadena',
  ],
  steps: {
    'a-family-of-moons': {
      title: 'Una familia de lunas',
      body: 'Un planeta gigante lleva consigo una familia. Júpiter tiene cuatro lunas grandes que se ven con unos prismáticos, Ío, Europa, Ganímedes y Calisto. Esta investigación pregunta si sus periodos, el tiempo que tardan en dar una vuelta, siguen algún patrón, y los mide a partir de imágenes.\n\nLas imágenes son las <strong>sintéticas</strong> de <em>Pesar a Júpiter con sus lunas</em>: hechas con las posiciones reales de las lunas en noviembre y diciembre de 2025 (JPL Horizons), con el disco de Júpiter, el desenfoque y el ruido añadidos. Nadie observó estas fotografías. Las distancias que lees son las medidas del instrumento; la superposición marca dónde pone el efemérides a cada luna.',
    },
    'three-periods-predict': {
      title: '¿Cómo se comparan los tres periodos?',
      body: 'Ío tarda unos 1,77 días en dar una vuelta. Europa y Ganímedes están más lejos. El instrumento ajustará una sinusoide a la distancia de cada luna a Júpiter en las 51 imágenes y leerá el periodo de ella.',
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
      body: 'Pon el muestreo en <strong>1</strong>, la secuencia diseñada de imágenes. Luego elige cada luna por turno con <strong>Luna</strong> (1 Ío, 2 Europa, 3 Ganímedes) y pulsa <strong>Tomar la lectura</strong> junto a su periodo. Las lecturas conservan los cuatro decimales que da el instrumento: la aritmética siguiente es sensible a ellos.',
      fields: [
        {
          label: 'Periodo de Ío',
          misconceptions: [
            {
              say: 'Esa lectura se tomó con otra luna seleccionada. Pon Luna en 1 para Ío, 2 para Europa y 3 para Ganímedes, y toma el periodo otra vez.',
            },
            {
              say: 'Esa lectura se tomó con otra luna seleccionada. Pon Luna en 1 para Ío, 2 para Europa y 3 para Ganímedes, y toma el periodo otra vez.',
            },
            {
              say: 'Esa lectura usó el muestreo de una vez por noche (0). Este paso pide el muestreo diseñado, 1.',
            },
          ],
        },
        {
          label: 'Periodo de Europa',
          misconceptions: [
            {
              say: 'Esa lectura se tomó con otra luna seleccionada. Pon Luna en 1 para Ío, 2 para Europa y 3 para Ganímedes, y toma el periodo otra vez.',
            },
            {
              say: 'Esa lectura se tomó con otra luna seleccionada. Pon Luna en 1 para Ío, 2 para Europa y 3 para Ganímedes, y toma el periodo otra vez.',
            },
            {
              say: 'Esa lectura usó el muestreo de una vez por noche (0). Este paso pide el muestreo diseñado, 1.',
            },
          ],
        },
        {
          label: 'Periodo de Ganímedes',
          misconceptions: [
            {
              say: 'Esa lectura se tomó con otra luna seleccionada. Pon Luna en 1 para Ío, 2 para Europa y 3 para Ganímedes, y toma el periodo otra vez.',
            },
            {
              say: 'Esa lectura se tomó con otra luna seleccionada. Pon Luna en 1 para Ío, 2 para Europa y 3 para Ganímedes, y toma el periodo otra vez.',
            },
            {
              say: 'Esa lectura usó el muestreo de una vez por noche (0). Este paso pide el muestreo diseñado, 1.',
            },
          ],
        },
      ],
    },
    'the-ratios': {
      title: 'Cocientes que no llegan a dos',
      body: 'Los periodos que tomaste están en la lista. Divídelos con tres decimales: el de Europa entre el de Ío, y el de Ganímedes entre el de Europa.',
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
        'Cero. Donde las tres se mueven al paso, la relación se cumple exactamente para los movimientos medios; los medidos entran en ella con la incertidumbre que dan los ajustes.',
    },
    'how-sure-is-the-sum': {
      title: '¿Qué seguridad tiene la suma?',
      body: 'Elige el <strong>Muestreo</strong> en el que confías: 0 es una imagen por noche, 1 la secuencia diseñada con tres noches horarias. Luego toma cada luna por turno con <strong>Luna</strong>, y pulsa <strong>Tomar la lectura</strong> junto a su periodo y junto a su incertidumbre. La página convierte cada periodo en un movimiento, forma el de Ío menos tres veces el de Europa más dos veces el de Ganímedes, y combina las tres incertidumbres: la de cada movimiento es 360&deg; × la incertidumbre del periodo ÷ el periodo al cuadrado, y las tres se suman en cuadratura, con pesos 1, 3 y 2.',
      fields: [
        { label: 'Periodo de Ío' },
        { label: 'Incertidumbre del periodo de Ío' },
        { label: 'Periodo de Europa' },
        { label: 'Incertidumbre del periodo de Europa' },
        { label: 'Periodo de Ganímedes' },
        { label: 'Incertidumbre del periodo de Ganímedes' },
        { label: 'Movimiento de Ío, grados por día' },
        { label: 'Movimiento de Europa, grados por día' },
        { label: 'Movimiento de Ganímedes, grados por día' },
        { label: 'Ío − 3 × Europa + 2 × Ganímedes, grados por día' },
        { label: 'Su incertidumbre, grados por día' },
      ],
    },
    'consistent-with-zero': {
      title: '¿Es cero?',
      body: 'Tu combinación de los tres movimientos y su incertidumbre están en el recuadro de abajo.',
      prompt: '¿Qué dice eso sobre si vale cero?',
      options: [
        'Es compatible con cero: es menor que su propia incertidumbre, que es lo más cerca que pueden decir estas imágenes',
        'No es cero, así que las lunas no están en resonancia',
        'Es exactamente cero, así que las lunas están sin duda enlazadas',
        'No significa nada, porque no es un número entero',
      ],
      misconceptions: [
        {
          say: 'Un valor menor que su incertidumbre no se distingue de cero con estas imágenes. No ser exactamente 0 es lo que hace toda medida. Si el tuyo es mucho mayor que su incertidumbre, revisa el muestreo que elegiste.',
        },
        {
          say: 'Compatible con cero no es lo mismo que exactamente cero, y ninguna de las dos cosas prueba que las lunas estén enlazadas: la relación entre los movimientos es una condición necesaria. Lo que las imágenes no pueden mostrar es si el propio ángulo libra.',
        },
      ],
      hints: ['Compara la combinación con la incertidumbre que tiene al lado.'],
      because:
        'Compatible con cero. La combinación es miles de veces menor que el movimiento de Ío, y está dentro de su incertidumbre. Esa es la relación necesaria, observada. La parte suficiente, que el ángulo <em>libra</em> y no circula, necesita años de observación del ángulo; <em>Cuando las órbitas se enlazan</em> lo sigue en un modelo.',
    },
    'callisto-predict': {
      title: '¿Pertenece Calisto?',
      body: 'Calisto es la cuarta luna, y la más lejana. El periodo de Ganímedes es el que tomaste en el paso 3, y la órbita de Calisto es unas 1,76 veces más ancha que la de Ganímedes.',
      prompt:
        'El periodo de Calisto, dividido entre el de Ganímedes, será aproximadamente&hellip;',
      options: [
        'unos 2,3, que no está cerca del 2 de los otros pares',
        'unos 2, como en los otros pares',
        'unos 3',
        'unos 1,5',
      ],
      hints: [
        'La tercera ley de Kepler convirtió 1,5 en 1,84 en la primera predicción: haz lo mismo con 1,76.',
      ],
      because:
        'Unos 2,33: 1,76 elevado a 1,5 es 2,33, muy lejos del 2 que mantiene al paso a las tres primeras.',
    },
    'callisto-is-not-in-the-chain': {
      title: '¿Y Calisto?',
      body: 'Elige la <strong>Luna</strong> 4, con el muestreo en 1, y toma su periodo. La página lo divide entre el periodo de Ganímedes del paso 3.',
      fields: [
        { label: 'Periodo de Calisto' },
        { label: 'Periodo de Calisto entre el de Ganímedes' },
      ],
    },
    'what-you-worked-out': {
      title: 'Lo que has deducido',
      body: 'Tres periodos de imágenes sintéticas, 1,7682, 3,5480 y 7,1413 días; cocientes de 2,006 y 2,013, cerca de 2 y no iguales a 2, lo cual es un indicio y no una prueba; y una combinación de los tres movimientos que salió menor que su propia incertidumbre, cuando cada movimiento es miles de veces mayor. El muestreo importó: con una imagen por noche, el periodo de Ío es un alias y la combinación queda a decenas de grados por día de cero. Calisto, con un cociente de 2,33, queda fuera de la cadena. Lo que las imágenes no pueden mostrar es el ángulo mismo manteniéndose durante años, que <em>Cuando las órbitas se enlazan</em> sigue en un modelo. Otros gigantes tienen familias propias (las lunas de Saturno, las de Urano), y este conjunto solo cubre las de Júpiter.',
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
    'Construir una maqueta en la que la Tierra es una canica del tamaño que elijas, y decir dónde caen el Sol y Neptuno',
    'Decir qué hace mal un diagrama del sistema solar en una sola página, y qué conserva',
  ],
  steps: {
    'a-picture-you-have-seen': {
      title: 'Una imagen que ya has visto',
      body: 'Todo diagrama del sistema solar tiene el Sol, ocho planetas en fila y planetas dibujados lo bastante grandes para verse. Esta investigación usa en cambio el sandbox, donde las <strong>distancias son verdaderas</strong>: 100 unidades por unidad astronómica, la distancia de la Tierra al Sol. Los planetas se dibujan más grandes que su tamaño real para que se vean, y la vista llega al menos a Saturno, porque una más amplia dejaría invisibles los planetas interiores. Neptuno está más lejos de lo que muestra la primera vista.',
      tip: 'Las distancias de la lectura vienen del sandbox, no de una tabla; los pasos siguientes las comparan con los números que conoces.',
    },
    'three-distances': {
      title: 'Tres distancias',
      body: 'Aleja la vista con el botón <strong>Alejar</strong>, la rueda del ratón o un gesto de pellizco hasta que Neptuno aparezca en pantalla. Luego selecciona <strong>la Tierra</strong>, <strong>Júpiter</strong> y <strong>Neptuno</strong> por turno, haciendo clic en el planeta o eligiéndolo en la lista de objetos, y pulsa <strong>Tomar la lectura</strong> junto a la distancia de cada uno al Sol.',
      fields: [
        {
          label: 'Distancia de la Tierra al Sol',
          misconceptions: [
            {
              say: 'Esa lectura es de otro planeta. Selecciona el planeta que nombra esta casilla, haciendo clic en él o eligiéndolo en la lista de objetos, y toma la lectura otra vez.',
            },
          ],
        },
        {
          label: 'Distancia de Júpiter al Sol',
          misconceptions: [
            {
              say: 'Esa lectura es de otro planeta. Selecciona el planeta que nombra esta casilla, haciendo clic en él o eligiéndolo en la lista de objetos, y toma la lectura otra vez.',
            },
          ],
        },
        {
          label: 'Distancia de Neptuno al Sol',
          misconceptions: [
            {
              say: 'Esa lectura es de otro planeta. Selecciona el planeta que nombra esta casilla, haciendo clic en él o eligiéndolo en la lista de objetos, y toma la lectura otra vez.',
            },
          ],
        },
      ],
    },
    'light-time-predict': {
      title: '¿Cuánto tarda la luz?',
      body: 'La luz del Sol tarda unos minutos en llegar a la Tierra. Neptuno está mucho más lejos, a la distancia que tomaste.',
      prompt: 'La luz del Sol tarda en llegar a Neptuno unos&hellip;',
      options: [
        'cuatro horas',
        'treinta minutos',
        'el mismo tiempo que hasta la Tierra',
        'cuatro días',
      ],
      hints: [
        'La luz tarda lo mismo en cruzar cada unidad astronómica. ¿Cuántas hay hasta Neptuno?',
      ],
      because:
        'Unas cuatro horas: Neptuno está a 30,07 UA y la luz cruza una UA en 499 segundos, así que 30,07 por 499 segundos son 15 005 segundos, 4,17 horas. Un mensaje de una nave en Neptuno tardaría eso en llegar, en cada sentido.',
    },
    'light-time': {
      title: 'El tiempo de la luz hasta Neptuno',
      body: 'La luz cruza una unidad astronómica en unos 8 minutos y 19 segundos, 499 segundos: es el retraso entre que algo ocurre en el Sol y lo vemos. Multiplícalo por la distancia que tomaste hasta Neptuno, y convierte los segundos en horas.',
      fields: [
        { label: 'Distancia de Neptuno al Sol' },
        { label: 'Tiempo de la luz del Sol a Neptuno' },
      ],
    },
    'earth-as-a-marble': {
      title: 'La Tierra como una canica',
      body: 'Construye una maqueta en la que la Tierra es una canica de un centímetro. La Tierra mide 12 742 kilómetros de diámetro y está a 149,6 millones de kilómetros del Sol.',
      prompt: 'En esa maqueta el Sol es&hellip;',
      options: [
        'una bola de unos 1 metro de ancho, a unos 120 metros de la canica',
        'una bola de unos 10 centímetros de ancho, a unos 1 metro de la canica',
        'una bola de unos 10 metros de ancho, a unos 10 metros de la canica',
        'una bola casi tan ancha como la canica, a unos 10 centímetros de ella',
      ],
      hints: [
        'Divide la distancia Tierra–Sol entre el diámetro de la Tierra; ese número de canicas cabe entre ellos.',
      ],
      because:
        'El Sol mide 109 diámetros terrestres, así que 109 centímetros, y entre él y la Tierra caben 11 741 canicas: 117 metros.',
    },
    'choose-your-marble': {
      title: 'Elige tu canica',
      body: 'Ahora elige el tamaño de tu propia Tierra, en centímetros de ancho: un guisante, una canica, un balón. Una unidad astronómica son el mismo número de Tierras de ancho, elijas lo que elijas. La página calcula a qué distancia del Sol queda la Tierra en tu maqueta. La distancia de Neptuno es la que tomaste, en unidades astronómicas: halla dónde cae Neptuno en tu maqueta, en metros.',
      fields: [
        { label: 'Diámetro de tu Tierra en la maqueta' },
        { label: 'Una unidad astronómica en tu maqueta' },
        { label: 'Distancia de Neptuno al Sol' },
        { label: 'Distancia de Neptuno al Sol en tu maqueta' },
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
      hints: [
        'Piensa en tu propia maqueta y en lo separadas que quedaban sus piezas.',
      ],
      because:
        'Los tamaños están exagerados: a la escala verdadera de las distancias los planetas serían motas. El diagrama conserva el orden y, más o menos, el espaciado relativo; el sandbox conserva las distancias verdaderas y agranda los planetas para poder verlos.',
    },
    'what-you-worked-out': {
      title: 'Lo que has deducido',
      body: 'La Tierra, Júpiter y Neptuno a 1,00, 5,20 y 30,07 unidades astronómicas, cada una tomada del propio planeta; luz del Sol que tarda 8 minutos en llegar a nosotros y 4,17 horas en llegar a Neptuno; y una maqueta del tamaño que elegiste, en la que una Tierra de un centímetro tiene el Sol, de un metro de ancho, a 117 metros y Neptuno a 3,5 kilómetros. Los tamaños de los planetas son lo único que el sandbox no muestra a escala verdadera; las investigaciones siguientes, sobre las lunas de los gigantes y sobre los cometas, parten de estas distancias.',
    },
  },
};

export const COMETS_AND_THE_SUN_ES = {
  title: 'Los cometas y el Sol',
  subtitle:
    'La órbita de un cometa modelo en el sandbox, cuánto se calienta en cada extremo, el Halley real como caso de transferencia y hacia dónde apuntan sus colas',
  objectives: [
    'Leer la distancia mínima y máxima al Sol de un cometa que elijas, en su órbita del sandbox',
    'Estimar la temperatura de un núcleo cometario desnudo en cada extremo de su órbita, con la temperatura de emisión y su ley de la raíz cuadrada inversa',
    'Decir hacia dónde apunta la cola de iones de un cometa, venga o vaya, y por qué no es como la estela del humo',
    'Decir qué deja fuera la estimación de temperatura, y dónde el hielo empieza a hacerse gas',
  ],
  steps: {
    'a-dirty-snowball': {
      title: 'Una bola de nieve sucia',
      body: 'Un cometa son unos kilómetros de hielo y polvo en una órbita larga. Lejos del Sol está oscuro e inerte. Cerca del Sol el hielo pasa a gas, y el gas y el polvo escapan y forman una <strong>coma</strong> y dos colas. El sandbox tiene el Sol, los ocho planetas y doce cometas. Llevan los nombres de cometas famosos, pero el sandbox coloca cada uno a la distancia de su órbita media con el 70 por ciento de la velocidad de una órbita circular, así que son <strong>cometas modelo en órbitas propias</strong>, no las órbitas reales.',
      tip: 'Los cometas se mueven deprisa. Pausa para leer un número; reanuda para ver las colas.',
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
      body: 'Las colas solo se ven donde un cometa está a menos de unas 3 UA del Sol, y la lectura dice cuándo lo está el cometa que seleccionas. Halley, el primer cometa de la lectura, se queda más allá de 5,8 UA. Wild 2 y Hartley 2 llegan a 1,1 UA y Shoemaker-Levy 9 a 2,1 (tenue; en un equipo más lento, el único). Pausa la escena, haz clic en un cometa y vuelve a reanudarla.',
      checklist: [
        'Selecciona un cometa que llegue a menos de 3 UA y acércate a él',
        'Páusalo en tres puntos que elijas: de camino hacia el Sol, cerca de su máxima aproximación y de camino hacia fuera',
        'En cada punto compara la cola estrecha con la línea del Sol a través de la cabeza del cometa: ¿hacia dónde apunta, y hacia dónde va el cometa?',
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
      body: 'Selecciona el cometa que observaste, u otro. Pulsa <strong>Tomar la lectura</strong> junto a su <strong>mínima distancia</strong> y junto a su <strong>máxima distancia</strong> al Sol, en unidades astronómicas. Son los dos extremos de la órbita, el perihelio y el afelio.',
      fields: [
        { label: 'Mínima distancia al Sol' },
        { label: 'Máxima distancia al Sol' },
      ],
    },
    'heat-at-the-ends': {
      title: '¿Cuánto calor en cada extremo?',
      body: 'Un núcleo desnudo y oscuro (albedo de Bond 0,04) que reparte la luz solar que absorbe por toda su superficie irradia a su <strong>temperatura de emisión</strong>, 275,5 K a 1 UA. Cae como uno sobre la raíz cuadrada de la distancia. Calcula la temperatura a las dos distancias que tomaste. Es una estimación de cuerpo desnudo: un cometa pierde energía al pasar el hielo a gas y un núcleo real no es uniforme.',
      fields: [
        { label: 'Mínima distancia al Sol' },
        { label: 'Máxima distancia al Sol' },
        { label: 'Temperatura en la mínima distancia' },
        { label: 'Temperatura en la máxima distancia' },
      ],
    },
    'halley-heat-predict': {
      title: '¿Cuánto calor hace en el Halley real?',
      body: 'El cometa que el sandbox llama Halley no está en la órbita de Halley. El cometa real se acerca a unos <strong>0,586 UA</strong> del Sol en su punto más cercano, dentro de la órbita de Venus.',
      prompt: 'A esa distancia un núcleo desnudo está a unos&hellip;',
      options: ['120 K', '200 K', '360 K', '700 K'],
      hints: [
        'Más cerca del Sol que 1 UA significa más caliente que la temperatura a 1 UA.',
      ],
      because:
        'Unos 360 K: la temperatura a 1 UA dividida entre la raíz cuadrada de 0,586 es 360 K, muy por encima de los 160 K a los que el hielo pasa a gas.',
    },
    'the-real-halley': {
      title: 'El Halley real',
      body: 'Aplica la misma estimación a la aproximación mínima real de Halley, la distancia del paso anterior, y compárala con tu predicción.',
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
        'Compara la temperatura en el extremo cercano de un cometa que echó una cola con los 160 K a los que el hielo pasa a gas.',
      ],
      because:
        'El calor. La temperatura del núcleo sube como uno sobre la raíz cuadrada de la distancia; el hielo pasa a gas hacia los 160 K, que un núcleo desnudo alcanza a unas 3 UA, y el gas y el polvo que escapan forman la coma y las colas: el viento solar barre el gas lejos del Sol y la luz empuja el polvo.',
    },
    'what-you-worked-out': {
      title: 'Lo que has deducido',
      body: 'La órbita de un cometa tiene dos extremos, aquí leídos en el sandbox; un núcleo desnudo está más caliente, en el extremo cercano, en la raíz cuadrada del cociente de esas distancias; el hielo pasa a gas hacia los 160 K, que un núcleo desnudo alcanza a unas 3 UA, donde el sandbox empieza a dibujar colas. El Halley modelo, a 5,79 UA y 114 K, se queda por debajo, un cometa que llega a menos de 3 UA sube por encima, y el Halley real, a 0,586 UA, llega a 360 K. La cola de iones apunta siempre lejos del Sol, así que un cometa vuela con la cola por delante al alejarse. Un cometa real añade lo que esta estimación deja fuera: su reflectividad, la energía gastada en pasar el hielo a gas y su giro.',
    },
  },
};
