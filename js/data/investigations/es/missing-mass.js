// =============================================================================
// missing-mass - es
// -----------------------------------------------------------------------------
// A shadow of ../missing-mass.js carrying only its words. Laid over the English lesson
// by mergeTranslation() in ../i18n.js, so anything absent here keeps its
// English and nothing here can reach the lesson's machinery: no scenario name,
// no seed, no widget id, no numeric answer, no probe.
//
// Arrays line up by index with the English. `null` means "not translated";
// that entry keeps its English.
// =============================================================================

export default {
  title: 'La masa que falta',
  subtitle:
    'Pesa un sistema dos veces y descubre que las dos respuestas no coinciden',
  duration: '45-60 min',
  level: 'Astronomía introductoria',
  summary:
    'Hay dos maneras de pesar un sistema en el espacio: sumar la luz, u observar cómo se mueven las cosas. Para el Sistema Solar coinciden. Para una galaxia no, y para un cúmulo de galaxias difieren en más de un factor diez. Los estudiantes reparten masa y observan la curva de rotación que produce, convierten una velocidad medida en una masa encerrada, y después toman la curva de una galaxia real e intentan ajustarla solo con estrellas —y fracasan, exactamente como fracasó el campo durante una década— antes de añadir un halo y acertar. Cierra con el cúmulo de Zwicky y el presupuesto de masa del universo. Así se encontró la materia oscura, y es una medida, no una teoría.',
  objectives: [
    'Explicar por qué la velocidad orbital cae como la inversa de la raíz del radio cuando la masa está concentrada en el centro',
    'Leer una curva de rotación y describir qué dice su pendiente sobre dónde está la masa',
    'Convertir una velocidad orbital medida en una masa encerrada, e indicar qué implica una curva plana sobre cómo crece esa masa con el radio',
    'Descomponer una curva de rotación medida en un disco estelar y un halo oscuro, y juzgar un ajuste frente a los errores de medida',
    'Argumentar, a partir de la forma del residuo y no solo de su tamaño, que ninguna disposición de materia visible reproduce una curva plana',
    'Aplicar el teorema del virial a un cúmulo de galaxias para estimar su masa a partir del movimiento de sus miembros, incluida la conversión desde una dispersión en la línea de visión',
    'Comparar una masa dinámica con una masa visible y cuantificar la discrepancia',
    'Distinguir lo que estas medidas establecen de lo que no',
  ],
  steps: [
    {
      title: 'Dos maneras de pesar algo que no puedes tocar',
      body: 'No puedes poner una galaxia en una balanza. Hay dos maneras de averiguar cuánto pesa un sistema en el espacio, y son completamente independientes entre sí.\n\nLa primera es <strong>sumar lo que puedes ver</strong>. Cuenta las estrellas, deduce la masa de cada una a partir de su brillo y su color, y suma. Esto es lo que los astrónomos llaman masa visible, o masa luminosa.\n\nLa segunda es <strong>observar cómo se mueven las cosas</strong>. La gravedad fija la velocidad de una órbita, así que una velocidad orbital y un radio orbital juntos te dan la masa que tiene que haber dentro. Esta es la masa dinámica.\n\nLas dos maneras miden lo mismo, así que más vale que coincidan. Esta lección trata de tres sistemas. En el primero, coinciden.',
      tip: 'Abre el panel Curva de rotación en la sección Herramientas del panel derecho. Déjalo abierto: lo usarás durante toda la lección.',
    },
    {
      title: 'Pon la masa en algún sitio',
      body: 'Antes de medir nada, hazte una idea de para qué sirve una curva de rotación. Una curva de velocidad orbital frente al radio no es una imagen de las estrellas. Es una lectura de <strong>dónde está la masa</strong>, y de nada más.\n\nEste instrumento mantiene fija la masa total y te deja redistribuirla. Cada una de las cuatro disposiciones contiene la misma cantidad de materia dentro de 30 kpc. Fíjate en lo distinto que giran.',
      checklist: [
        'Pulsa cada uno de los cuatro botones predefinidos por turno y observa cómo cambia la forma de la curva',
        'En «Sistema Solar», observa cómo cae la velocidad: las órbitas exteriores son las lentas',
        'En «Bola uniforme», arrastra el deslizador de extensión y observa cómo el pico sigue el borde de la bola',
        'En «Disco espiral», fíjate en que la curva sube, alcanza un máximo y luego cae: sigue sin ser plana',
        'En «Lo que hacen las galaxias», lee la pendiente exterior y compárala con el primer ajuste',
      ],
      tip: 'El número de «pendiente exterior» es el exponente de v ∝ rⁿ. Kepleriano es −0,5. Plano es 0. Es el único número sobre el que gira toda esta lección.',
    },
    {
      title: '¿Qué disposición da una curva plana?',
      body: 'Acabas de ver cuatro maneras de repartir la misma masa, y solo una de ellas produjo una curva que se mantiene nivelada al alejarse. Usa el instrumento para comprobar tu respuesta antes de comprometerte con ella.',
      prompt: 'Una curva de rotación se mantiene plana cuando…',
      options: [
        'la masa está concentrada en el centro',
        'la masa está en una bola con un borde definido',
        'la masa está en un disco que se adelgaza con el radio',
        'la masa sigue añadiéndose a medida que te alejas',
      ],
      because:
        'Solo la cuarta. Las tres primeras tienen algo en común: la masa se acaba en algún punto, y pasado ese punto alejarse no añade nada al total dentro de tu órbita. Una vez que la masa encerrada deja de crecer, la velocidad tiene que caer. Una curva plana es la firma de una distribución de masa que todavía no ha terminado, y eso es algo extraño en una galaxia, porque las galaxias visiblemente sí terminan.',
    },
    {
      title: 'El Sistema Solar, representado',
      body: 'Ahora un sistema real, medido en vivo. El panel representa un punto por cada cuerpo del Sistema Solar: lo lejos que está del Sol, en horizontal, y lo rápido que se mueve, en vertical. Ambos ejes son los valores reales medidos, tomados de la simulación en este mismo instante. No se ajusta nada.\n\nLa línea roja de puntos es la predicción. Es √(G·M/r) usando solo la masa de los objetos en pantalla: las velocidades que deberían tener si las cosas que puedes ver fueran toda la masa que hay.\n\nLos puntos caen sobre la línea.',
      checklist: [
        'Encuentra Mercurio en el extremo izquierdo y Neptuno en el derecho',
        'Fíjate en que los planetas interiores son los rápidos',
        'Comprueba que los puntos medidos siguen la predicción de puntos en todo el rango',
        'Lee el número «Pendiente exterior» en la parte superior del panel',
      ],
    },
    {
      title: 'Qué significa la pendiente',
      body: 'El panel informa de la pendiente como una potencia: la velocidad va como el radio elevado a cierto exponente. Para el Sistema Solar ese exponente está muy cerca de −0,5, que es otra manera de escribir v ∝ 1/√r.\n\nEse número no es una coincidencia y no es un ajuste a los datos. Sale directamente de igualar la atracción gravitatoria a lo que necesita una órbita circular: v = √(G·M/r), con M la masa interior a la órbita.',
      prompt: 'La velocidad cae como 1/√r en el Sistema Solar porque…',
      options: [
        'los planetas exteriores son más viejos y se han frenado',
        'casi toda la masa está en el Sol, así que M dentro de la órbita deja de crecer al alejarse',
        'la gravedad se debilita con la distancia, y eso por sí solo fija la velocidad',
        'los planetas exteriores son más ligeros que los interiores',
      ],
      because:
        'El Sol acapara el 99,8 % de la masa del Sistema Solar. Pasado Mercurio, alejarse no añade esencialmente nada a la masa interior a la órbita, así que M es una constante en v = √(G·M/r) y solo cambia la r. La gravedad sí se debilita con la distancia, pero eso ya está dentro de la fórmula: lo que hace que el exponente sea exactamente −0,5 y no otra cosa es que la masa se queda quieta. Las órbitas no decaen solas, y los planetas exteriores no son los más ligeros: Júpiter es lo más pesado que hay aquí después del Sol.',
    },
    {
      title: 'Qué te dice la velocidad sobre la masa',
      body: 'La relación que has estado usando funciona en ambos sentidos. Escrita como v = √(G·M/r) predice una velocidad a partir de una masa. Despejada, hace algo mucho más útil:\n\n<strong>M(&lt;r) = v²·r / G</strong>\n\nUna velocidad y un radio te dan la masa interior, y el cálculo no dice absolutamente nada sobre de qué está hecha esa masa ni sobre si emite luz alguna. Esa es toda la razón por la que este método puede encontrar algo que un telescopio no puede.\n\nLa gráfica de arriba es una curva de rotación. La de abajo es la misma medida despejada. Arrastra el marcador de radio y observa ambas.',
      checklist: [
        'Empieza en «Curva descendente» y arrastra el marcador de 2 kpc hasta 30',
        'Observa cómo la gráfica de abajo se aplana: todo está ya dentro, así que no queda nada que encerrar',
        'Cambia a «Curva plana» y vuelve a arrastrar el marcador hacia fuera',
        'Observa cómo la gráfica de abajo sube en línea recta, y lee la fila «ve el doble de lejos»',
        'Cambia a «Una galaxia real» y compara la línea naranja de puntos con la verde',
      ],
      tip: 'La gráfica de abajo no es una segunda medida. Es la de arriba con una línea de álgebra aplicada.',
    },
    {
      title: 'Qué exige una curva plana',
      body: 'Vuelve a M(&lt;r) = v²·r/G, y esta vez trata la velocidad como conocida y la masa como incógnita. Si v es la misma a todos los radios, entonces M(&lt;r) es proporcional a r.\n\nEl instrumento te dará la respuesta si arrastras el marcador. Dedúcela primero.',
      prompt: 'Una curva de rotación plana significa que, al alejarse…',
      options: [
        'la masa encerrada deja de crecer',
        'la masa encerrada sigue creciendo, en proporción al radio',
        'la gravedad deja de obedecer la ley del inverso del cuadrado',
        'las estrellas tienen demasiado momento angular para caer hacia dentro',
      ],
      because:
        'La masa encerrada tiene que seguir creciendo, y en concreto tiene que crecer en proporción a r. Dobla el radio y tienes que doblar la masa interior para mantener constante la velocidad. Allí donde el disco se ha quedado sin estrellas no queda nada visible que la aporte, y sin embargo la velocidad no cae. Algo ahí fuera sigue añadiendo masa. Modificar la gravedad es una alternativa real y hay quien la ha propuesto, pero es una afirmación distinta de esta y no es lo que muestra esta medida por sí sola.',
    },
    {
      title: 'Mide tú mismo la masa encerrada',
      body: 'Pon el instrumento en <strong>Curva plana</strong> y lee la masa encerrada en la gráfica de abajo a cuatro radios. Después cambia a <strong>Curva descendente</strong> y léela una vez más, a 30 kpc, para el contraste.\n\nTodos los números están en unidades de 10¹⁰ masas solares, que es lo que da la lectura. Escribe la mantisa: para 5,23 × 10¹⁰, escribe 5,23.',
      fields: [
        { label: 'Curva plana: masa dentro de 5 kpc', unit: '× 10¹⁰ M☉' },
        { label: 'Curva plana: masa dentro de 10 kpc', unit: '× 10¹⁰ M☉' },
        { label: 'Curva plana: masa dentro de 20 kpc', unit: '× 10¹⁰ M☉' },
        { label: 'Curva plana: masa dentro de 30 kpc', unit: '× 10¹⁰ M☉' },
        {
          label: 'Curva descendente: masa dentro de 30 kpc',
          unit: '× 10¹⁰ M☉',
        },
      ],
      plot: {
        title: 'Tus cuatro medidas',
        xLabel: 'radio  (kpc)',
        yLabel: 'masa interior  (10¹⁰ M☉)',
        note: 'Cuatro puntos sobre una recta que pasa por el origen. Así es «proporcional al radio», y es lo que obliga la curva plana. Compara tu último número: en la curva descendente la masa dentro de 30 kpc es la misma que la masa dentro de 10, porque ahí fuera no hay nada.',
      },
      tip: 'El deslizador de radio se detiene en 30 kpc, que es más o menos hasta dónde puede medirse una curva de rotación real antes de que no quede nada lo bastante brillante para verse.',
    },
    {
      title: 'Ahora una galaxia',
      body: 'Una galaxia espiral es un disco de estrellas con un bulbo denso en el centro, y la mayor parte de su luz procede de ese bulbo y del disco interior. En ese aspecto está construida como el Sistema Solar: brillante y pesada en el centro, fina y tenue más afuera.\n\nEste escenario es una galaxia construida exactamente sobre ese supuesto. Cada estrella se lanzó a la velocidad que la masa visible dice que debería tener.\n\nAntes de mirar el panel, comprométete con una respuesta.',
      prompt: 'La curva de rotación de esta galaxia…',
      options: [
        'caerá como 1/√r, igual que la del Sistema Solar',
        'se mantendrá plana hasta el final',
        'subirá con el radio',
        'no tendrá ninguna forma en particular',
      ],
      because:
        'Cae como 1/√r. El razonamiento es el mismo que para el Sistema Solar y la respuesta también: pon la mayor parte de la masa en el centro, y la masa encerrada por una órbita deja de crecer en cuanto sales del bulbo. Este escenario es la predicción, dibujada por completo. El siguiente es lo que encuentran los telescopios de verdad.',
    },
    {
      title: 'Mide la curva esperada',
      body: 'Lee el panel. La franja sombreada de la izquierda de la gráfica es la región interior, excluida del ajuste: dentro del bulbo la curva sube con el radio por razones que no tienen nada que ver con esta lección, e incluirla arrastraría la pendiente hacia cero.\n\nAnota la pendiente y la forma que informa el panel.',
      fields: [
        { label: 'Pendiente exterior (el exponente)', unit: '' },
        { label: 'Forma que informa el panel', unit: '' },
        { label: 'Masa visible', unit: 'M☉' },
      ],
      tip: 'La pendiente no será exactamente −0,500 como la del Sistema Solar. El disco lleva algo de masa propia, así que el total encerrado sí sigue creciendo un poco.',
    },
    {
      title: 'Lo que encontraron Rubin y Ford',
      body: 'A lo largo de los años sesenta y setenta Vera Rubin y Kent Ford midieron curvas de rotación de galaxias espirales, empezando por Andrómeda. Su instrumento era un espectrógrafo: la luz del lado de la galaxia que se acerca está desplazada al azul, la del lado que se aleja está desplazada al rojo, y el tamaño del desplazamiento da la velocidad orbital a ese radio.\n\nEsperaban que la curva cayera. No cayó. En galaxia tras galaxia la velocidad subía al salir del bulbo, se nivelaba y después simplemente se quedaba ahí, tan lejos como hubiera algo lo bastante brillante para medirlo.\n\nEste escenario es ese resultado. El mismo disco, la misma masa visible, el mismo número de estrellas. Todas las estrellas se mueven ahora a la velocidad que da una galaxia real, que es la misma velocidad a todos los radios.',
      tip: 'Mira la gráfica. La línea roja de puntos no se ha movido: sigue siendo la predicción a partir de la masa visible. Los puntos sí.',
    },
    {
      title: 'Mide la curva real',
      body: 'Anota lo que informa ahora el panel. La masa visible no ha cambiado respecto al escenario anterior, así que cualquier diferencia está en el movimiento y no en la contabilidad.',
      fields: [
        { label: 'Pendiente exterior (el exponente)', unit: '' },
        { label: 'Forma que informa el panel', unit: '' },
        {
          label:
            'En el borde exterior, ¿cuántas veces más rápido se mueven las estrellas que la predicción de puntos?',
          unit: '×',
        },
      ],
    },
    {
      title: 'Ahora haz lo que hicieron los astrónomos',
      body: 'Medir una curva plana es la mitad fácil. La mitad difícil, y la que costó los años setenta y ochenta zanjar, es averiguar qué distribución de masa podría producirla —y demostrar que ninguna disposición de la materia visible sirve.\n\nEso es un problema de ajuste, y es lo que es este instrumento. Los puntos rosas con barras de error son una curva de rotación medida. Los deslizadores son un modelo de la galaxia: un disco de estrellas y un halo de algo distinto. Tu tarea es reproducir los puntos.\n\nLas reglas son las de un astrónomo real. Puedes elegir cuánta masa tiene el disco y lo extendido que está, porque ninguna de las dos cosas se conoce con precisión solo por la luz. No puedes mover los datos.',
      tip: 'El panel te puntúa: «error medio» es lo lejos que queda tu curva de los puntos, en km/s, y los propios datos solo son buenos hasta unos ±5. Baja de eso y la gráfica dirá AJUSTADA.',
    },
    {
      title: 'Inténtalo solo con estrellas',
      body: 'El halo está apagado y oculto. Tienes dos deslizadores: cuánta masa hay en el disco y cuánto se extiende. Ambos son genuinamente inciertos en una galaxia real, así que la pelea es limpia.\n\nIntenta ajustar la curva. Inténtalo de verdad: el sentido de este paso no es fracasar deprisa.',
      checklist: [
        'Empieza en el ajuste «Solo estrellas» y mira dónde el modelo queda por debajo de los datos',
        'Sube la masa del disco hasta cuadrar los puntos exteriores, y mira qué les ha pasado a los interiores',
        'Baja la masa hasta cuadrar los puntos interiores, y mira los exteriores',
        'Prueba a extender el disco con el deslizador de longitud de escala, y luego a estrecharlo',
        'Encuentra el mejor «error medio» que consigas, y anótalo',
      ],
      tip: 'Un disco más pesado levanta toda la curva. Un disco más ancho desplaza su máximo hacia fuera y lo aplana un poco. Ninguna de las dos cosas cambia el hecho de que la curva de un disco vuelve a bajar.',
    },
    {
      title: 'Anota tu mejor ajuste solo con estrellas',
      body: 'Sea cual sea tu mejor intento, anótalo. Este es un resultado real y merece la pena tenerlo de tu puño y letra: es el número que descarta la explicación obvia.',
      fields: [
        { label: 'Mejor error medio que lograste', unit: 'km/s' },
        { label: 'Masa del disco que lo dio', unit: '× 10¹⁰ M☉' },
        { label: 'Radio donde el modelo falló más', unit: 'kpc' },
        {
          label:
            'A ese radio, ¿tu modelo iba demasiado rápido o demasiado lento?',
          unit: '',
        },
      ],
      tip: 'El mejor ajuste posible solo con estrellas deja un error medio de unos 15 km/s, tres veces el error de medida, y es peor en el borde exterior. Si te acercaste a eso, encontraste la respuesta real.',
    },
    {
      title: 'Por qué un disco más pesado no puede salvarlo',
      body: 'Acabas de descubrir algo que al campo le costó una década aceptar. Añadir masa al disco sí levanta la curva exterior, pero levanta la curva interior al mismo tiempo, y más.',
      prompt: 'Ningún disco, con ninguna masa, ajusta la curva entera porque…',
      options: [
        'un disco no puede contener masa suficiente para importar',
        'el déficit no es solo una cantidad, es una forma equivocada: los datos exigen añadir masa donde no está la luz',
        'las medidas exteriores son menos fiables que las interiores',
        'los discos son bidimensionales y las galaxias tridimensionales',
      ],
      because:
        'El problema es la forma del déficit, no su tamaño. La contribución de un disco alcanza su máximo un par de longitudes de escala afuera y después decae, porque ahí es donde está su masa. Los datos no decaen. Para arreglar la curva exterior sin destrozar la interior hace falta masa que sea <em>despreciable en el centro y dominante en el borde</em>, que es lo contrario de cómo se distribuye la luz en todas las espirales jamás fotografiadas. Un disco puede hacerse más pesado; no puede hacerse con esa forma. Los puntos exteriores están medidos, si acaso, con más fiabilidad que los interiores, porque proceden de hidrógeno frío que se extiende bastante más allá de las estrellas.',
    },
    {
      title: 'Ahora añade el halo',
      body: 'Dos deslizadores más, que controlan una componente que no está hecha de estrellas. La velocidad plana del halo fija cuánto hay de él; su radio de núcleo fija con qué rapidez toma el relevo del disco.\n\nConsigue que la gráfica diga AJUSTADA.',
      checklist: [
        'Devuelve el disco a unos 3,3 y su longitud de escala a unos 2,6',
        'Sube la intensidad del halo desde cero y observa cómo la curva exterior se levanta mientras la interior apenas se mueve',
        'Ajusta el radio de núcleo hasta que las dos componentes se pasen el relevo con suavidad',
        'Lleva el error medio por debajo de 5 km/s y lee el indicador AJUSTADA',
        'Lee la última fila: cuánta masa oscura hay por cada unidad de masa visible',
      ],
      tip: 'Esta es la forma que tiene que tener el halo, y la razón de que se use el perfil pseudoisotérmico: despreciable en el centro, creciendo sin límite hacia fuera. Nada hecho de estrellas hace eso.',
    },
    {
      title: 'Anota el ajuste que funciona',
      body: 'Anota el modelo que ajustó. Estos cuatro números son una descomposición de una galaxia, y son los mismos cuatro números que da un artículo publicado sobre curvas de rotación.',
      fields: [
        { label: 'Velocidad plana del halo', unit: 'km/s' },
        { label: 'Radio de núcleo del halo', unit: 'kpc' },
        { label: 'Error medio', unit: 'km/s' },
        { label: 'Masa visible', unit: '× 10¹⁰ M☉' },
        { label: 'Masa del halo dentro de 30 kpc', unit: '× 10¹⁰ M☉' },
      ],
      tip: 'Un buen ajuste cae cerca de 150 km/s y un núcleo de unos 6 kpc, con un error medio en torno a 2 km/s. Hay una degeneración real entre los dos deslizadores del halo, y por eso los artículos reales los citan juntos con una covarianza.',
    },
    {
      title: '¿Qué parte es oscura?',
      body: 'Ajustaste una galaxia. Divide la masa del halo dentro de 30 kpc entre la masa visible y tendrás la cifra estrella de cuarenta años de dinámica galáctica.',
      prompt: 'Masa del halo dentro de 30 kpc, dividida entre la masa visible',
      unit: '×',
      because:
        'Alrededor de tres y medio. Aproximadamente tres cuartas partes de la masa dentro de la extensión visible de esta galaxia están en algo que no emite luz, y la fracción sigue subiendo si mides más lejos, porque la masa del halo sigue creciendo mientras que la del disco no. Fíjate bien en qué es y qué no es esto: es una masa que mediste a partir del movimiento, menos una masa que mediste a partir de la luz. No es una afirmación sobre de qué está hecha la diferencia.',
    },
    {
      title: 'Qué está sujetando el halo',
      body: 'Un halo es un término de la ley de fuerzas. No tiene posición, no es un objeto, y no está dibujado en la simulación, lo que hace fácil sospechar que sea un truco contable.\n\nNo lo es. Aquí hay una sola estrella, lanzada en órbita circular a la velocidad que una galaxia real le da a ese radio. Obsérvala mantener su órbita, y después quítale el halo mientras corre.',
      checklist: [
        'Pulsa Ejecutar y observa cómo la estrella completa una órbita con el halo activado',
        'Compara las dos velocidades de la lectura: la de lanzamiento, y la que el disco visible por sí solo podría sostener',
        'Ahora lleva el deslizador del halo a APAGADO, sin tocar nada más',
        'Observa cómo se marcha la estrella. No se le ha dado energía extra: se le ha quitado la masa que la sujetaba',
        'Prueba a relanzarla a 8 kpc con el halo apagado, donde el disco todavía domina, y verás que se queda',
      ],
      tip: 'Esta es exactamente la situación que plantea la curva de rotación plana. Las estrellas reales a 20 kpc se mueven de verdad a esta velocidad, y la masa visible de verdad no puede sujetarlas.',
    },
    {
      title: 'Quítale el halo a la galaxia entera',
      body: 'Ahora el mismo experimento sobre noventa estrellas a la vez, en la simulación en vivo y no en un panel de modelo.\n\nEste escenario tiene activado un halo de materia oscura, y el panel lo dibuja como la línea azul continua sobre la que se apoyan los puntos. Desactívalo con el interruptor del panel y observa qué le ocurre al disco.',
      checklist: [
        'Desactiva el interruptor del halo de materia oscura y deja correr la simulación',
        'Observa cómo las estrellas empiezan a alejarse: a estas velocidades la masa visible no puede sujetarlas',
        'Observa cómo los puntos medidos se separan de la línea continua y el disco se deshace',
        'Vuelve a activar el halo y recarga el escenario para restaurarlo',
      ],
      tip: 'Las estrellas no se detienen de golpe. Conservan la velocidad que tenían y simplemente dejan de estar sujetas, así que el disco se deshila de fuera hacia dentro.',
    },
    {
      title: 'Cuarenta años antes',
      body: 'Rubin y Ford no fueron los primeros. En 1933 Fritz Zwicky apuntó un espectrógrafo al cúmulo de Coma, un enjambre de unas mil galaxias, y midió con qué rapidez se movían sus miembros unos respecto a otros.\n\nUn cúmulo no es un disco. Sus miembros van en órbitas largas y orientadas al azar, así que no hay rotación que representar: lo que hay en su lugar es una dispersión de velocidades. Pero se aplica la misma lógica. Los miembros de un sistema ligado se mueven a velocidades fijadas por la masa que los sujeta, así que la dispersión de velocidades da la masa.\n\nZwicky hizo la aritmética, comparó la respuesta con la luz de las galaxias, y descubrió que las dos diferían en un factor de varios cientos. Llamó al exceso <em>dunkle Materie</em>. Casi nadie se lo tomó en serio durante cuatro décadas.\n\nEste cúmulo está pausado, para que todo el que lo mida mida lo mismo.',
      tip: 'El panel muestra ahora un bloque de medidas del cúmulo. Una curva de rotación es el instrumento equivocado para un enjambre; esos tres números son el correcto.',
    },
    {
      title: 'La aritmética de Zwicky, y las dos maneras de equivocarse',
      body: 'Antes de hacerlo con el cúmulo simulado, hazlo con el real. Este instrumento contiene el cúmulo de Coma auténtico: una dispersión de velocidades medida en la línea de visión de unos 1000 km/s a lo largo de un radio de unos 1,4 Mpc, frente a la masa de sus galaxias y del gas caliente que hay entre ellas.\n\nEl teorema del virial es la herramienta:\n\n<strong>M = (5/3)·R·⟨v²⟩ / G</strong>\n\nLa única dificultad de todo el cálculo es el paso de una σ medida a ⟨v²⟩, y hay dos maneras clásicas de equivocarse. Ambas están en el tercer deslizador. Pruébalas.',
      checklist: [
        'Empieza en «Coma, bien hecho» y compara las dos barras entre sí',
        'Cambia a «Olvidar el factor 3» y observa cómo la masa cae exactamente en tres',
        'Cambia a «Olvidar elevarlo al cuadrado» y observa cómo la discrepancia desaparece por completo',
        'Vuelve al ajuste correcto y arrastra el deslizador de σ: fíjate en que la masa va como σ², no como σ',
        'Fíjate en qué parte de la masa visible es gas caliente en vez de galaxias',
      ],
      tip: 'Un espectrógrafo mide una componente de una velocidad, no tres. Si las órbitas están orientadas al azar, cada dirección lleva una parte igual, así que ⟨v²⟩ = 3σ². Ese factor tres es el paso que todo el mundo se salta.',
    },
    {
      title: 'Mide el cúmulo simulado',
      body: 'Ahora el cúmulo de la simulación. Cambia a <strong>unidades de simulación</strong> con el botón Unidades físicas de la sección Herramientas del panel. Eso no es cosmético. En las unidades propias de la aplicación la constante gravitatoria G vale exactamente 1, así que la aritmética de abajo no lleva ninguna conversión de unidades, y una masa sale directamente en unidades de masa de simulación.\n\nAnota los tres números.',
      fields: [
        { label: 'Número de galaxias miembro', unit: '' },
        {
          label: 'Dispersión de velocidades σ',
          unit: 'unidades de simulación por tiempo',
        },
        { label: 'Radio del cúmulo R', unit: 'unidades de simulación' },
        { label: 'Masa visible: las propias galaxias', unit: 'M☉' },
      ],
      tip: 'Mil unidades de masa de simulación son una masa solar, que es la conversión que necesitarás al final.',
    },
    {
      title: 'Pesa el cúmulo por su movimiento',
      body: 'Para cualquier sistema mantenido por su propia gravedad y ya asentado, las energías cinética y potencial están encadenadas en una proporción fija: 2K + U = 0. Este es el teorema del virial, y es lo que convierte una dispersión de velocidades en una masa.\n\nEscribe la energía cinética como K = ½·M·⟨v²⟩, y toma la energía potencial de una esfera uniforme, U = −(3/5)·G·M²/R. Sustituye, cancela un factor de M y despeja:\n\n<strong>M = (5/3)·R·⟨v²⟩ / G</strong>\n\nLa simulación es plana, así que sus velocidades se reparten en dos dimensiones y no en tres, y la dispersión que informa el panel ya es la bidimensional completa y no una proyección sobre la línea de visión. Así que ⟨v²⟩ es simplemente σ², y en unidades de simulación G vale 1 y desaparece. Queda M = (5/3)·R·σ², que da una masa en unidades de simulación. Divide entre 1000 para convertirla en masas solares.',
      tip: 'El supuesto de esfera uniforme es una aproximación y el estimador solo es bueno hasta un factor de orden uno. Con eso basta: la discrepancia que estás a punto de encontrar es muchísimo mayor que el error del método, que es exactamente por lo que el resultado sobrevivió.',
      prompt:
        'La masa dinámica del cúmulo, en masas solares (esto es un modelo a escala, así que trata el número como propio del modelo)',
      unit: 'M☉',
      because:
        'σ = 20,46 y R = 2516, así que ⟨v²⟩ = 418,7 y M = (5/3) × 2516 × 418,7 = 1,76 × 10⁶ unidades de masa de simulación, que son 1756 masas solares en este modelo. Si obtuviste algo mil veces mayor, olvidaste convertir; si obtuviste algo cercano a 84 000, usaste σ en lugar de σ².',
    },
    {
      title: 'Ahora compara',
      body: 'Has pesado el mismo cúmulo dos veces. Una sumando sus galaxias, que es la masa visible que informa el panel, y otra observando cómo se mueven esas galaxias.',
      prompt: 'Masa dinámica dividida entre masa visible',
      unit: '×',
      because:
        'Alrededor de dieciocho. Las galaxias que puedes ver dan cuenta de aproximadamente una vigésima parte de la masa necesaria para mantener unido el cúmulo a las velocidades a las que sus miembros se mueven de verdad. La cifra del propio Zwicky para Coma fue todavía mayor, en parte porque la escala de distancias del universo estaba equivocada en 1933 y en parte porque no tenía manera de contar el gas caliente entre las galaxias, que resulta llevar varias veces más masa que las galaxias. La cifra moderna para Coma ronda un factor diez una vez incluido ese gas, que es el número que informa el instrumento de dos pasos atrás.',
    },
    {
      title: '¿Qué has demostrado en realidad?',
      body: 'Has hecho ya tres medidas, en dos clases de sistema, usando dos métodos distintos: ajustaste la curva de rotación de una galaxia y descubriste que ninguna disposición de sus estrellas servía, y pesaste un cúmulo por su movimiento y encontraste cinco veces más masa que luz. Ambas cosas dicen lo mismo.\n\nTen cuidado con lo que se sigue de ahí.',
      prompt:
        'En dos o tres frases: ¿qué establecen estas medidas y qué no establecen? Nombra al menos una cosa distinta de un nuevo tipo de partícula que en principio pudiera explicarlas.',
      rubric:
        'Establecen una discrepancia entre la masa inferida del movimiento y la masa inferida de la luz, en sistemas mayores que un sistema planetario. No establecen de qué está hecha la masa extra, ni que esté hecha de algo. Se valora cualquiera de estas: materia ordinaria simplemente demasiado tenue para contarla (gas frío, estrellas apagadas, agujeros negros, planetas errantes, colectivamente MACHOs), que fue la hipótesis principal durante décadas y hoy está descartada para la mayor parte de la masa por los sondeos de microlente y por las abundancias de elementos ligeros de la nucleosíntesis primordial; o una modificación de la gravedad a gran escala, como MOND, que ajusta bien las curvas de rotación y mal los cúmulos. Las respuestas fuertes señalan que las dos medidas de aquí son independientes entre sí, lo que hace que un error en cualquiera de ellas sea una explicación improbable, y que el resultado de la curva de rotación es una afirmación sobre la <em>forma</em> de la masa que falta y no solo sobre su cantidad.',
    },
    {
      title: '¿Qué parte del universo es esto?',
      body: 'Has estado trabajando con una galaxia y un cúmulo. Es justo preguntarse qué aspecto tiene la contabilidad para todo.\n\nRecorre las cuatro capas. Cada una toma la porción que estabas mirando y pregunta de qué está hecha.',
      tip: 'La última capa es en la que hay que detenerse. Cada estrella, nebulosa y galaxia jamás fotografiada, en cualquier longitud de onda, es alrededor de medio por ciento del universo.',
    },
    {
      title: 'Dónde estamos',
      body: 'Las pruebas han crecido mucho desde 1933 y desde 1970, y ya no descansan en absoluto en las curvas de rotación. El patrón de puntos calientes y fríos del fondo cósmico de microondas, cómo se distribuyen las galaxias por el cielo, cómo la lente gravitatoria curva la luz alrededor de los cúmulos, y las abundancias de hidrógeno y helio sobrantes de los primeros minutos apuntan todos en el mismo sentido, y son sensibles a cosas distintas. La materia ordinaria que resulte ser oscura no puede dar cuenta de lo que muestran; tiene que haber algo que tenga masa y no interactúe con la luz.\n\nQué es ese algo, nadie lo sabe. Nunca se ha detectado en un laboratorio, no se ha encontrado ninguna partícula candidata, y las búsquedas llevan cuarenta años en marcha. El Cúmulo Bala, donde dos cúmulos se atravesaron y la masa se separó visiblemente del gas, es la observación más difícil de acomodar para las alternativas de gravedad modificada.\n\nEse es un lugar honesto donde dejarlo. La medida es sólida y se ha repetido de una docena de maneras independientes. La explicación es un nombre para algo que no hemos identificado. Son dos clases distintas de afirmación y merece la pena mantenerlas separadas.',
      tip: 'Ajustaste una galaxia real y pesaste un cúmulo real. Esa parte no está en duda, y no has tenido que fiarte de la palabra de nadie.',
    },
  ],
};
