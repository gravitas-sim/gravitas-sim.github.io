// =============================================================================
// black-holes - es
// -----------------------------------------------------------------------------
// A shadow of ../black-holes.js carrying only its words. Laid over the English lesson
// by mergeTranslation() in ../i18n.js, so anything absent here keeps its
// English and nothing here can reach the lesson's machinery: no scenario name,
// no seed, no widget id, no numeric answer, no probe.
//
// Arrays line up by index with the English. `null` means "not translated";
// that entry keeps its English.
// =============================================================================

export default {
  title: 'Agujeros negros en números',
  subtitle:
    'Haz un agujero negro más grande y descubre algunas reglas sorprendentes',
  duration: '35-45 min',
  level: 'Astronomía introductoria',
  summary:
    'Cambia una sola cosa de un agujero negro, su masa, y observa cómo responden cuatro propiedades completamente distintas. Su horizonte de sucesos crece al mismo paso que la masa. Su densidad media baja. Se vuelve más frío. Vive muchísimo más. Dos de esas cuatro sorprenden a casi todo el mundo, y las predecirás antes de medirlas.',
  objectives: [
    'Decir qué es el horizonte de sucesos de un agujero negro, y qué no es',
    'Describir cómo cambia el radio de Schwarzschild cuando cambia la masa',
    'Explicar por qué el argumento de la velocidad de escape da la respuesta correcta por la razón equivocada',
    'Predecir cómo cambian la densidad media, la temperatura y la vida útil con la masa',
    'Clasificar un agujero negro como estelar, intermedio o supermasivo a partir de su masa',
  ],
  steps: [
    {
      title: 'Ni un agujero, ni una aspiradora',
      body: 'En pantalla hay un agujero negro de diez masas solares, y cuatro objetos girando a su alrededor. Obsérvalos un momento.\n\nNada está cayendo dentro. Merece la pena detenerse en eso, porque lo que más gente cree sobre los agujeros negros es que atraen hacia sí todo lo que hay cerca. No lo hacen. La gravedad lejos de un agujero negro es exactamente la misma gravedad que en cualquier otro sitio: un objeto con movimiento lateral entra en órbita alrededor de un agujero negro de diez masas solares exactamente igual que orbitaría una estrella de diez masas solares. Si se cambiara el Sol por un agujero negro de la misma masa, la órbita de la Tierra no cambiaría en absoluto. Solo se quedaría muy oscuro.\n\nUn agujero negro tampoco es un agujero en el espacio. Es masa, comprimida en un espacio lo bastante pequeño como para que la gravedad gane.\n\nEsta investigación trata de una sola pregunta: ¿qué cambia cuando haces esa masa mayor?',
      tip: 'Pulsa el agujero negro para abrir su ficha informativa. Todo lo que calcula esta lección está también en esa ficha, deducido por la simulación a partir de las mismas fórmulas.',
    },
    {
      title: '¿Qué podría significar «tamaño»?',
      body: 'Aquí viene lo incómodo. Un agujero negro no tiene superficie. No es una bola de roca con un borde en el que pudieras aterrizar, y no hay nada ahí que medir con una regla.\n\nAsí que cuando un astrónomo dice que un agujero negro mide treinta kilómetros de ancho, ¿qué podría estar midiendo? Aventura una respuesta. No se espera que sepas esto todavía.',
      prompt:
        'El «tamaño» de un agujero negro significa, con más probabilidad…',
      options: [
        'el ancho del pedazo de materia que cayó dentro',
        'la distancia hasta la que llega su gravedad',
        'la frontera dentro de la cual nada puede volver a salir',
        'nada, porque un agujero negro no tiene tamaño',
      ],
      because:
        'Es la frontera. Ni una superficie, ni un objeto, ni un muro que pudieras tocar: un lugar del espacio donde la situación cambia. Fuera de ella, la luz todavía puede escapar. Dentro, nada puede. Esa frontera se llama horizonte de sucesos, y lo lejos que queda es lo que los astrónomos entienden por el tamaño de un agujero negro. La segunda respuesta es una buena conjetura y muy común, pero la gravedad no tiene borde; simplemente se debilita con la distancia, y lo hace alrededor de un agujero negro exactamente igual que alrededor de una estrella.',
    },
    {
      title: 'El horizonte de sucesos',
      body: 'La imagen contigua es un agujero negro dibujado por sí solo. El disco negro no es el objeto. Es la región interior al <strong>horizonte de sucesos</strong>, y se dibuja negra porque ninguna luz de su interior llega jamás a tu ojo.\n\nEl horizonte de sucesos es una frontera del espacio, no una cosa. No hay ninguna cáscara, ninguna corteza, nada con lo que chocar. Si lo cruzaras no notarías que ocurriera nada en ese momento. Lo que cambia es lo que es posible: desde fuera del horizonte, una señal todavía puede salir al resto del universo. Desde dentro no puede, nunca, por potente que sea el transmisor.\n\nLa distancia del centro a esa frontera tiene nombre: el <strong>radio de Schwarzschild</strong>, escrito <strong>R<sub>s</sub></strong>. Está marcado en la imagen con una línea azul, y su valor está escrito debajo. Karl Schwarzschild lo dedujo en 1916, a partir de la flamante teoría de Einstein, mientras servía en el ejército alemán en el frente ruso. Murió de una enfermedad unos meses después.',
      tool: {
        title: 'Un agujero negro de diez masas solares',
        note: 'La línea azul es el radio de Schwarzschild: del centro al horizonte de sucesos.',
      },
      tip: 'Todo agujero negro de esta lección se trata como uno simple: sin rotación y sin carga eléctrica. Los agujeros negros reales suelen rotar, lo que cambia la forma del horizonte, pero no las tendencias que estás a punto de encontrar.',
    },
    {
      title: 'Treinta kilómetros no es mucho',
      body: 'Un agujero negro de diez masas solares tiene un radio de Schwarzschild de unos treinta kilómetros. De un lado a otro del horizonte, son cincuenta y nueve kilómetros.\n\nLas barras de debajo de la imagen están dibujadas a la misma escala que el propio agujero negro, así que puedes compararlas directamente. El horizonte de esta cosa mide como maratón y medio, y no llega a tres veces la longitud de Manhattan.\n\nQuédate con lo extraño que es eso. Tiene diez veces más material que el Sol. El radio del Sol es de 696 000 kilómetros. Este es de 30. La misma clase de materia, unas diez veces más de ella, y cabe dentro de una ciudad mediana.',
      tool: {
        title: 'Diez masas solares, frente a cosas que conoces',
        note: 'El agujero negro y las tres barras están dibujados a una sola escala. Aquí no hay nada exagerado.',
      },
      tip: 'Para hacerse una idea en el otro sentido: para hacer un agujero negro del tamaño de la Tierra harían falta unas dos mil masas solares, y para hacer uno del tamaño del Sol, unas doscientas treinta mil.',
    },
    {
      title: 'Ahora hazlo más pesado',
      body: 'Están a punto de darte un deslizador de masa. Antes de tocarlo, comprométete con una respuesta.\n\nSupón que tomas ese agujero negro de diez masas solares y lo doblas hasta veinte masas solares. Piensa qué le ocurre al horizonte de sucesos.',
      prompt: 'Doblar la masa hará que el radio de Schwarzschild…',
      options: [
        'siga exactamente igual',
        'aumente, más o menos doblándose',
        'aumente, pero muchísimo más del doble',
        'disminuya, porque más masa significa gravedad más apretada',
      ],
      because:
        'Se dobla. Si elegiste la última opción estás en buena compañía: más masa sí significa gravedad más fuerte, y es muy natural esperar que un agujero negro más pesado esté más apretado. No es lo que ocurre, y las siguientes pantallas tratan de ver cómo no ocurre.',
    },
    {
      title: 'Tres medidas',
      body: 'Este es el experimento. El deslizador fija la masa. El panel calcula el radio de Schwarzschild. Pulsar <strong>Registrar este ensayo</strong> mete ese par de números en la tabla de abajo y coloca un punto en la gráfica.\n\nSolo necesitas tres. Tómalas a 5, 10 y 20 masas solares: cada una es el doble de la anterior, lo que hará el patrón fácil de ver.',
      tool: {
        title: 'La masa frente al tamaño del horizonte',
        note: 'Fija una masa, pulsa Registrar, repite. Borrar ensayos reinicia la tabla si quieres rehacerlo.',
      },
      checklist: [
        'Pon el deslizador en 5 M☉ y pulsa Registrar este ensayo',
        'Ponlo en 10 M☉ y pulsa Registrar otra vez',
        'Ponlo en 20 M☉ y pulsa Registrar una vez más',
        'Lee los tres radios en la tabla de debajo de la gráfica',
        'Mira dónde han caído los tres puntos',
      ],
      tip: 'Si registras la misma masa dos veces, sustituye el valor antiguo en lugar de añadir un segundo punto, así que no puedes ensuciar la gráfica por error.',
    },
    {
      title: '¿Qué hizo doblarla?',
      body: 'Mira tus dos primeros ensayos. Pasaste de 5 masas solares a 10, que es el doble de masa. El radio pasó de unos 14,8 kilómetros a unos 29,5.',
      prompt: 'Cuando la masa se dobló, el radio de Schwarzschild…',
      options: [
        'se quedó más o menos igual',
        'se dobló también aproximadamente',
        'se cuadruplicó aproximadamente',
        'subió unas ocho veces',
      ],
      because:
        'Se dobló. Y pasar de 10 a 20 lo dobló otra vez, de 29,5 a 59,1 kilómetros. El doble de masa, el doble de radio, siempre.',
      tool: {
        title: 'Tus tres ensayos',
        note: 'La tabla de debajo de la gráfica guarda los números que registraste. Si está vacía, retrocede un paso y toma las tres medidas.',
      },
    },
    {
      title: 'Lee la gráfica',
      body: 'Ahora mira la forma que hacen tus tres puntos. La línea de puntos está trazada a través de ellos, partiendo de cero.',
      prompt:
        'La gráfica del radio de Schwarzschild frente a la masa muestra que el radio…',
      options: [
        'se mantiene constante sea cual sea la masa',
        'aumenta de manera constante, en una recta que pasa por cero',
        'disminuye a medida que aumenta la masa',
        'cambia sin ningún patrón',
      ],
      because:
        'Una recta, y una que pasa por la esquina en vez de arrancar en algún punto del eje. Esa es la firma de la relación más simple que existe: lo que le hagas a una, le pasa lo mismo a la otra. Triplica la masa y el radio se triplica. Toma una décima parte de la masa y obtienes una décima parte del radio.',
      tool: {
        title: 'Tus tres ensayos',
        note: 'La línea de puntos está trazada a través de tus propios puntos, partiendo de cero. Si la gráfica está vacía, retrocede un paso y registra los tres ensayos.',
      },
    },
    {
      title: 'La regla que acabas de encontrar',
      body: 'Lo que has medido tiene una notación abreviada: <strong>R<sub>s</sub> ∝ M</strong>. El símbolo del medio se lee «es proporcional a», y significa exactamente lo que muestra tu gráfica: una recta que pasa por cero.\n\nEn palabras, y esta es la frase que merece recordarse: <strong>dobla la masa de un agujero negro y el radio de su horizonte de sucesos se dobla.</strong>\n\nSi quieres ver la versión completa, es R<sub>s</sub> = 2GM/c², donde G es la intensidad de la gravedad y c es la velocidad de la luz. No se te pedirá hacer nada con ella. Lo único que importa aquí es que M aparece una vez, sola, arriba: eso es lo que hace que la gráfica sea una recta.\n\nLa consecuencia útil: unos 3 kilómetros de radio por cada masa solar. Un agujero negro de 20 masas solares, 60 kilómetros. Mil masas solares, 3000 kilómetros. Es así de sencillo, hasta arriba del todo.',
      tip: 'Schwarzschild encontró este radio en los primeros meses tras la publicación de la relatividad general por Einstein, y Einstein no creía que nada real pudiera ser jamás tan compacto. Los astrónomos tardaron otros cincuenta años en empezar a encontrarlos.',
    },
    {
      title: 'Comprimir, y escapar',
      body: 'Cambio de tema, brevemente. ¿Por qué hay un horizonte, para empezar?\n\nPiensa en lanzar una pelota hacia arriba. Lánzala con bastante fuerza y no vuelve a caer nunca: esa velocidad se llama velocidad de escape, y para la Tierra es de unos 11 kilómetros por segundo.\n\nAhora imagina tomar todo el material de la Tierra y comprimirlo en una bola del tamaño de un centro comercial. La misma masa, mucho más pequeña.',
      prompt:
        'De pie sobre la superficie de la Tierra comprimida, la velocidad de escape sería…',
      options: [
        'la misma, porque la masa no ha cambiado',
        'menor, porque hay menos material debajo de ti',
        'mayor, porque estás mucho más cerca de toda esa masa',
        'cero, porque un objeto pequeño no tiene gravedad',
      ],
      because:
        'Mayor, y de forma espectacular. La velocidad de escape depende de dos cosas: cuánta masa tira, y lo cerca de ella que estés. Comprimir un objeto no cambia la masa, pero te permite acercarte muchísimo más a su centro, y estar más cerca es lo que hace difícil escapar.',
    },
    {
      title: 'Comprime el Sol',
      body: 'El panel toma el Sol y lo comprime. Su masa no cambia nunca: es una masa solar en todos los ajustes. Solo cambia el tamaño.\n\nEl indicador de abajo es la velocidad de escape desde la superficie, calculada del modo corriente, como lo harías para un planeta. La línea naranja brillante del extremo derecho es la velocidad de la luz.\n\nUsa los botones de abajo para saltar a cada tamaño por turno, y observa dos cosas a la vez: la bola encogiendo y el indicador llenándose.',
      tool: {
        title: 'Una masa solar, comprimida',
        note: 'El círculo tenue de puntos es el Sol a su tamaño real. El punto lleno es la versión comprimida, dibujada a la misma escala.',
      },
      checklist: [
        'Pulsa El Sol hoy: el indicador está casi vacío, en el 0,2 %',
        'Pulsa Del tamaño de la Tierra: una masa solar entera en una bola del tamaño de la Tierra',
        'Pulsa 30 km, aproximadamente el tamaño de una ciudad, y lee el indicador',
        'Pulsa 6 km y observa lo cerca que llega de la línea naranja',
        'Pulsa 3 km',
      ],
      tip: 'El ajuste de 30 km corresponde aproximadamente a un objeto real: una estrella de neutrones. Una masa solar de material en una bola del ancho de una ciudad, y escapar de su superficie exige de verdad alrededor de un tercio de la velocidad de la luz.',
    },
    {
      title: 'La última compresión',
      body: 'Has comprimido una masa solar hasta un radio de 2,95 kilómetros. Mira el indicador.',
      prompt:
        'Con un radio de unos 3 kilómetros, la velocidad de escape alcanza…',
      options: [
        'aproximadamente la mitad de la velocidad de la luz',
        'exactamente la velocidad de la luz',
        'algo más que la velocidad de la luz',
        'un valor demasiado grande para calcularlo',
      ],
      because:
        'Exactamente la velocidad de la luz. Y fíjate en el número: 2,95 kilómetros es el radio de Schwarzschild de una masa solar, el mismo número que llevas usando toda la lección. Comprime cualquier masa hasta su propio radio de Schwarzschild y este cálculo dice que la luz necesita la velocidad de la luz para escapar, lo que significa que no puede.',
      tool: {
        title: 'Una masa solar, comprimida a 2,95 km',
        note: 'El indicador ha alcanzado la línea naranja.',
      },
    },
    {
      title: 'La respuesta correcta por la razón equivocada',
      body: 'Ese argumento merece la pena conocerlo, y es como se imaginó la idea por primera vez, por John Michell en 1783. Pero necesita una advertencia, y aquí está.\n\nEl cálculo que acabas de ver es gravedad newtoniana corriente, la que describe balas de cañón. Da exactamente el radio correcto. No da la razón correcta. Un agujero negro real <strong>no</strong> es un objeto cuya velocidad de escape ordinaria ha superado por casualidad la velocidad de la luz, con la luz haciendo un intento valiente y cayendo de vuelta como una pelota lanzada.\n\nLo que ocurre de verdad lo describe la relatividad general de Einstein, en la que la masa curva la geometría del espacio y del tiempo a su alrededor. Lo bastante cerca de un agujero negro, esa geometría está tan curvada que todas las direcciones que se alejan del agujero han dejado de existir. La luz no fracasa al escapar. Sencillamente ya no hay adónde escapar.\n\nHasta ahí llega esta lección con ese tema, y basta.',
      prompt:
        '¿Cuál de estas afirmaciones sobre el horizonte de sucesos es cierta?',
      options: [
        'Es una superficie sólida, y algo que la cruzara chocaría con ella',
        'La gravedad se enciende en el horizonte y está ausente fuera de él',
        'Es una frontera del espacio que marca dónde las señales ya no pueden salir',
        'Es el borde del pedazo de materia que formó el agujero negro',
      ],
      because:
        'Una frontera, y nada más sólido que eso. Dos cosas que conviene dejar claras ya que estamos. No hay nada con lo que chocar: un astronauta que cruzara el horizonte de un agujero negro grande no notaría absolutamente nada en ese momento. Y la gravedad no se enciende ahí. La gravedad ya actuaba fuera, por lo que los cuatro objetos del comienzo de esta lección estaban en órbita, y sigue actuando dentro; el horizonte es simplemente donde volver a salir deja de ser posible.',
    },
    {
      title: '¿Cuál es más denso?',
      body: 'De vuelta al deslizador de masa, y a una pregunta que pilla a casi todo el mundo.\n\nLa densidad es cuánta masa hay comprimida en una cantidad dada de espacio. Un ladrillo es más denso que una hogaza de pan del mismo tamaño, porque hay más materia en él.\n\nCompara dos agujeros negros: uno de diez masas solares y otro de un millón de masas solares. Comprométete con una respuesta antes de mirar nada.',
      prompt:
        'Promediado sobre el espacio interior a su horizonte, ¿cuál es más denso?',
      options: [
        'el agujero negro de 10 masas solares',
        'el agujero negro de 1 000 000 de masas solares',
        'salen iguales',
        'depende de con qué se formó cada uno',
      ],
      because:
        'El pequeño, por un margen enorme. La mayoría elige el grande, y el razonamiento tras esa elección es perfectamente sensato: un agujero negro mayor tiene más masa, y más masa en el mismo espacio significaría mayor densidad. La trampa está en esas últimas tres palabras. No es el mismo espacio. Las siguientes pantallas tratan de por qué.',
    },
    {
      title: 'Masa dividida entre volumen',
      body: 'Primero, qué se mide. La densidad es masa dividida entre volumen: cuánta materia, dividida entre cuánto sitio ocupa. El agua sale a 1000 kilogramos por metro cúbico; el aire, a unos 1,2.\n\nPara un agujero negro tomamos su masa y la dividimos entre el volumen de una esfera del tamaño de su horizonte de sucesos. Ten cuidado con qué es y qué no es ese número. Es una comparación útil, una manera de preguntar «¿cómo de concentrada está esta cosa, a la escala de su propio horizonte?». <strong>No</strong> es una afirmación de que el interior sea una bola uniforme de material a esa densidad. Nadie sabe cómo es el interior, y desde luego no es eso.\n\nLa escalera del panel es una escala de densidad con cosas familiares marcadas en ella. Cada muesca pequeña hacia arriba es diez veces más densa que la de abajo. Usa los cuatro botones y observa el marcador naranja.',
      tool: {
        title: 'Densidad media a la escala del horizonte',
        note: 'Cada muesca pequeña es diez veces más densa que la de debajo. La línea naranja es donde se sitúa este agujero negro.',
      },
      checklist: [
        'Pulsa 10 M☉ y fíjate en dónde queda el marcador en la escalera',
        'Pulsa 100 M☉ y observa hacia dónde se mueve',
        'Pulsa 1000 M☉',
        'Pulsa 1 000 000 M☉ y compáralo con dónde empezaste',
      ],
      tip: 'Arrastra el deslizador despacio en lugar de saltar entre los botones y el marcador se desliza suavemente escalera abajo, lo que hace inconfundible el sentido del movimiento.',
    },
    {
      title: '¿Hacia dónde fue?',
      body: 'Acabas de ver a un agujero negro volverse cien mil veces más masivo.',
      prompt: 'Al aumentar la masa, la densidad media a esta escala…',
      options: [
        'aumentó',
        'disminuyó',
        'se mantuvo igual',
        'subió y luego volvió a bajar',
      ],
      because:
        'Bajó, y bajó con fuerza. Un agujero negro de 10 masas solares sale aproximadamente a la densidad de un núcleo atómico. Uno de un millón de masas solares está diez potencias de diez por debajo de eso: todavía más denso que nada que pudieras sostener, pero el sentido del movimiento es inconfundible. Llévalo más lejos y se vuelve más extraño. Alrededor de 140 millones de masas solares la densidad media a esta escala cae por debajo de la del agua, y el agujero negro del centro de la galaxia M87, con seis mil quinientos millones de masas solares, sale menos denso que el aire de la habitación en la que estás sentado.',
      tool: {
        title: 'Un millón de masas solares',
        note: 'La fila inferior compara esto con dónde estaba el agujero negro de 10 masas solares.',
      },
    },
    {
      title: 'De dónde sale el sitio',
      body: 'Aquí está la razón, y se reduce a contar ceros.\n\nCuando la masa sube en cierto factor, el radio sube en el mismo factor: esa es la regla que mediste antes. Pero el volumen no es el radio. El volumen crece en las tres direcciones a la vez, así que una esfera con diez veces el radio tiene diez por diez por diez, mil veces, el sitio dentro.\n\nAsí que la masa gana unos cuantos ceros, y el volumen gana el triple. La densidad es masa dividida entre volumen, y pierde la diferencia.\n\nPon el deslizador del panel en <strong>×1000</strong> y lee las barras.',
      prompt:
        'Multiplicar la masa por 1000 añade 3 ceros. ¿Cuántos ceros gana el volumen?',
      unit: 'ceros',
      because:
        'Nueve, porque el volumen crece en tres direcciones a la vez: 3 + 3 + 3. La masa ganó 3 ceros y el volumen ganó 9, así que la densidad perdió la diferencia, 6 ceros. Cayó en un factor de un millón. Esa es toda la sorpresa, y no es nada más exótico que el hecho de que las esferas ganan espacio más deprisa de lo que ganan anchura.',
      tool: {
        title: 'Contando los ceros',
        note: 'Las barras azules ganan ceros. La roja los pierde. La longitud de la barra es el número de ceros, no el número en sí.',
      },
      tip: 'La cadena en una línea: más masa, horizonte mayor, volumen muchísimo mayor, densidad media menor.',
    },
    {
      title: '¿Cuál está más caliente?',
      body: 'Una tercera propiedad, y una tercera ocasión de llevarse una sorpresa.\n\nEn 1974 Stephen Hawking demostró que los agujeros negros no son completamente negros. La física cuántica predice que un agujero negro se comporta como si tuviera una temperatura, y por ello irradia un resplandor muy tenue.\n\nTodo agujero negro tiene una de estas temperaturas. Compara uno pequeño con uno gigante y comprométete con una respuesta.',
      prompt: '¿Cuál esperas que tenga la temperatura de Hawking más alta?',
      options: [
        'el agujero negro pequeño, de unas pocas masas solares',
        'el supermasivo, de millones de masas solares',
        'están a la misma temperatura',
        'ninguno: los agujeros negros no tienen temperatura',
      ],
      because:
        'El pequeño, y por muchísimo. El agujero negro mayor es la conjetura natural: más grande suele significar más de todo. Este es uno de los casos en que no, y estás a punto de ver hasta dónde llega la cosa en sentido contrario.',
    },
    {
      title: 'Qué es la radiación de Hawking, y de qué hay que tener cuidado',
      body: 'Mantengamos esto modesto, porque la versión honesta es bastante técnica.\n\nLos efectos cuánticos cerca de un agujero negro hacen que se comporte como si tuviera una temperatura y que emita una radiación muy tenue. Esa es la afirmación, y basta para esta lección.\n\nQuizá hayas oído una historia sobre pares de partículas que aparecen en el horizonte, una cayendo dentro y otra escapando. Es una imagen que el propio Hawking usó, y es bastante menos precisa de lo que suena; el cálculo real trata de campos cuánticos en un espacio-tiempo curvo y no funciona realmente así. Se menciona aquí solo para que no te sorprenda encontrártela en otra parte.\n\nUna cosa más que merece decirse: esto no se ha observado nunca. Las temperaturas implicadas son tan bajas que ningún experimento puede acercarse hoy a ellas, como dejará dolorosamente claro la pantalla siguiente.',
      tip: 'Hawking consideraba este su resultado más importante, y pidió que la ecuación de la entropía de un agujero negro, que sale del mismo trabajo, se grabara en su lápida conmemorativa en la Abadía de Westminster.',
    },
    {
      title: 'El termómetro',
      body: 'El panel es un termómetro, con temperaturas familiares marcadas en él. Tiene que ser un termómetro extraño, porque el rango que necesita cubrir es enorme: cada muesca pequeña hacia arriba es diez veces más caliente que la de debajo.\n\nLo más frío marcado es la temperatura más baja jamás producida en un laboratorio. La etiquetada «el fondo de microondas» es la temperatura del propio espacio vacío, 2,7 grados sobre el cero absoluto, sobrante del Big Bang.\n\nUsa los botones para ir subiendo por las masas.',
      tool: {
        title: 'Temperatura de Hawking',
        note: 'Cada muesca pequeña es diez veces más caliente que la de debajo. La barra muestra dónde se sitúa este agujero negro.',
      },
      checklist: [
        'Pulsa 1 M☉ y encuentra el nivel en el termómetro',
        'Pulsa 10 M☉ y observa hacia dónde se mueve el nivel',
        'Pulsa 1000 M☉',
        'Pulsa Sagitario A* y lee la temperatura de abajo',
      ],
      tip: 'La fila que dice cuánto más frío que el fondo de microondas es la que hay que vigilar. Es la diferencia entre un número pequeño y un número inimaginable.',
    },
    {
      title: 'Más frío, no más caliente',
      body: 'Has llevado un agujero negro de una masa solar hasta cuatro millones y has vigilado el termómetro todo el camino.',
      prompt:
        'Al aumentar la masa de un agujero negro, su temperatura de Hawking…',
      options: [
        'aumenta',
        'disminuye',
        'se mantiene igual',
        'aumenta al principio y luego disminuye',
      ],
      because:
        'Disminuye, y la regla es tan simple como la del radio, solo que del revés: T ∝ 1/M. Dobla la masa y reduces la temperatura a la mitad. Los agujeros negros más grandes del universo son los objetos más fríos que hay en él. Un agujero negro de diez masas solares está a unas seis milmillonésimas de grado sobre el cero absoluto. Sagitario A*, en el centro de nuestra galaxia, está cuatrocientas mil veces más frío todavía. Ambos están mucho más fríos que el espacio vacío que los rodea, lo que significa que ambos absorben más energía del fondo de microondas de la que emiten, y están creciendo muy despacio en lugar de encoger.',
      tool: {
        title: 'Sagitario A*, con cuatro millones de masas solares',
        note: 'Muy por debajo de la temperatura más baja que haya alcanzado jamás ningún laboratorio.',
      },
    },
    {
      title: '¿Y entonces qué le pasa?',
      body: 'Sigue la lógica. Si un agujero negro irradia, entonces está perdiendo energía. La energía y la masa son la misma moneda, así que está perdiendo masa. Despacio, a lo largo de muchísimo tiempo, encoge: esto se llama evaporación.\n\nAquí está la pregunta. Ya sabes que los agujeros negros pequeños están más calientes que los grandes, y un objeto más caliente irradia con más intensidad.',
      prompt: '¿Qué agujero negro se evapora primero?',
      options: [
        'el más pequeño, porque está más caliente e irradia más rápido',
        'el más grande, porque tiene más que emitir',
        'terminan a la vez',
        'ninguno: la evaporación nunca termina de verdad',
      ],
      because:
        'El pequeño, por partida doble: está más caliente, así que irradia más rápido, y tiene menos que perder. Ambos efectos apuntan en el mismo sentido, y por eso la diferencia entre un agujero negro pequeño y uno grande resulta ser tan extrema.',
    },
    {
      title: 'Una cronología que no cabe en una página',
      body: 'Los números aquí se desmadran, así que el panel cuenta ceros en lugar de años. La edad del universo, 13 800 millones de años, es un 1 seguido de 10 ceros, así que su barra llega a 10. Un número con 70 ceros tiene una barra que llega a 70.\n\nEso es todo lo que significa una barra aquí: cuántos ceros. Y cada cero de más es otro factor de diez, así que una barra el doble de larga no es el doble de tiempo. Es inimaginablemente más.\n\nVe subiendo por las masas y observa la barra naranja.',
      tool: {
        title: 'Cuánto tarda en evaporarse',
        note: 'La longitud de la barra cuenta los ceros. Las dos barras grises están ahí como comparación y no se mueven nunca.',
      },
      checklist: [
        'Pulsa 1 M☉ y compara la barra naranja con la edad del universo',
        'Pulsa 10 M☉',
        'Pulsa 1000 M☉ y observa cómo se estira la barra',
        'Pulsa Sagitario A* y lee el número de ceros',
      ],
      tip: 'Un agujero negro con la masa de una montaña, en vez de la de una estrella, sería lo bastante pequeño y caliente como para haberse evaporado ya. Nadie ha encontrado ninguno, y si se formó alguno en el Big Bang sigue siendo una pregunta abierta.',
    },
    {
      title: 'Más largo, y después mucho más largo',
      body: 'Un agujero negro de una masa solar dura unos 10⁶⁷ años. Sagitario A*, cuatro millones de veces más pesado, dura unos 10⁸⁷.\n\nEso no es cuatro millones de veces más. Son veinte ceros de más: cien millones de billones de veces más.',
      prompt: 'Al aumentar la masa, la vida hasta la evaporación…',
      options: [
        'se acorta',
        'se alarga, más o menos al paso de la masa',
        'se alarga mucho más deprisa de lo que aumenta la masa',
        'no depende de la masa',
      ],
      because:
        'Mucho más deprisa. La regla es vida ∝ M³: dobla la masa y la vida sube ocho veces. Triplícala y sube veintisiete veces. Por eso un factor de cuatro millones en masa se convierte en un factor de 10²⁰ en vida. Hay que decir dos cosas con claridad. Primera: nada de esto está ocurriendo todavía; todo agujero negro conocido está más frío que el espacio que lo rodea, así que todos están ganando masa ahora mismo, no perdiéndola, y la evaporación ni siquiera puede empezar hasta que el universo se haya enfriado muy por debajo de su temperatura actual. Segunda: estas vidas son más largas que la edad del universo por tanto que la comparación deja de significar nada.',
      tool: {
        title: 'Sagitario A*',
        note: 'Compara la longitud de la barra naranja con la edad del universo.',
      },
    },
    {
      title: 'Del tamaño de una ciudad al de un sistema solar',
      body: 'Una sola relación, R<sub>s</sub> ∝ M, recorriendo un rango enorme de masas. Los astrónomos clasifican los agujeros negros en tres grupos aproximados:\n\n<strong>De masa estelar</strong>, de unas pocas a unas decenas de masas solares, que quedan cuando una estrella masiva colapsa. <strong>De masa intermedia</strong>, de cientos hasta cientos de miles, que son raros y difíciles de encontrar y solo se confirmaron hace poco. <strong>Supermasivos</strong>, de millones a miles de millones, situados en los centros de las galaxias.\n\nEsas fronteras son convenciones más que leyes de la naturaleza. Nada cambia en la física al cruzarlas.\n\nEl panel tiene cuatro agujeros negros. Usa el deslizador para mirar cada uno. <strong>Cada uno está dibujado a su propia escala</strong>, porque el mayor es medio millón de veces más ancho que el menor y no pueden compartir una imagen. La barra de escala de la esquina te dice qué escala estás mirando, y el objeto de comparación junto a cada agujero está dibujado a esa misma escala.',
      tool: {
        title: 'Cuatro agujeros negros',
        note: 'Observa cómo cambia la barra de escala de la esquina inferior al moverte entre ellos. A se mide en kilómetros; D se mide en unidades astronómicas, la distancia de la Tierra al Sol.',
      },
      tip: 'Una unidad astronómica, 1 UA, es la distancia de la Tierra al Sol: unos 150 millones de kilómetros.',
    },
    {
      title: 'Clasificarlos',
      body: 'Usa las cuatro masas listadas debajo de la imagen. No necesitas calcular nada.',
      prompt: '¿Cuál de los cuatro es un agujero negro supermasivo?',
      options: [
        'A, con 8 M☉',
        'B, con 1000 M☉',
        'C, con 150 000 M☉',
        'D, con 4,3 millones de M☉',
      ],
      because:
        'D, con 4,3 millones de masas solares, es el único en los millones. Para los demás: A, con 8 masas solares, es de masa estelar, el tipo que deja una estrella al morir. B, con 1000, y C, con 150 000, son ambos de masa intermedia, y el enorme hueco entre esos dos da una imagen justa de lo laxa que es esa categoría. Fíjate en lo que hace la relación a lo largo del rango: el radio del horizonte de A mide como Manhattan, el de B es alrededor de la mitad del radio de la Tierra, el de C dos tercios del radio del Sol, y el de D llega a una quinta parte del camino hasta Mercurio.',
      tool: {
        title: 'Cuatro agujeros negros',
        note: 'La lista de abajo da las cuatro masas y los cuatro radios del horizonte.',
      },
    },
    {
      title: 'Un agujero negro misterioso: tamaño y densidad',
      body: 'Por último, una prueba de si las tendencias han calado. El agujero negro D es mucho más masivo que un agujero negro de masa estelar, y eso es lo único que necesitas saber de él.\n\nResponde a partir de las reglas que encontraste, no calculando nada.',
      prompt:
        'Comparados con los de un agujero negro de masa estelar, el horizonte de sucesos de D y su densidad media son…',
      options: [
        'un horizonte mayor y una densidad media mayor',
        'un horizonte mayor y una densidad media menor',
        'un horizonte menor y una densidad media mayor',
        'un horizonte menor y una densidad media menor',
      ],
      because:
        'Horizonte mayor, densidad media menor. El horizonte crece al paso de la masa, así que un agujero negro medio millón de veces más pesado tiene un horizonte medio millón de veces más ancho. Pero el volumen dentro de ese horizonte crece tres veces más deprisa en ceros, así que la densidad media se desploma.',
      tool: {
        title: 'Agujero negro D',
        note: 'Responde a partir de las tendencias que encontraste, no de este panel.',
      },
    },
    {
      title: 'Un agujero negro misterioso: temperatura y vida',
      body: 'El mismo agujero negro, las otras dos propiedades.',
      prompt:
        'Comparadas con las de un agujero negro de masa estelar, la temperatura de Hawking de D y su vida hasta la evaporación son…',
      options: [
        'más caliente, y una vida más corta',
        'más caliente, y una vida más larga',
        'más frío, y una vida más corta',
        'más frío, y una vida más larga',
      ],
      because:
        'Más frío, y con una vida enormemente más larga. Ambas cosas son lo contrario de lo que la gente espera la primera vez, y tú has predicho las dos correctamente a partir de una regla que descubriste moviendo un deslizador.',
      tool: {
        title: 'Agujero negro D',
        note: 'Responde a partir de las tendencias que encontraste, no de este panel.',
      },
    },
    {
      title: 'Tiene nombre',
      body: 'El agujero negro D es <strong>Sagitario A*</strong>, y está a 26 000 años luz, en el centro de nuestra propia galaxia. Su masa, 4,3 millones de masas solares, se midió observando estrellas orbitándolo durante treinta años; ese trabajo ganó el Premio Nobel de Física en 2020. En 2022 el Telescopio del Horizonte de Sucesos publicó una imagen de él.\n\nTodo lo que predijiste sobre él es correcto. Su horizonte mide unos 12,7 millones de kilómetros de radio, una quinta parte del camino hasta Mercurio. Su densidad media a esa escala es de aproximadamente un millón de kilogramos por metro cúbico, unas doscientas mil millones de veces menor que la que sale para un agujero negro de diez masas solares. Su temperatura es de 1,4 × 10⁻¹⁴ grados sobre el cero absoluto. Tardará unos 10⁸⁷ años en evaporarse.\n\nAsí que hacer más masivo un agujero negro hace mucho más que hacerlo más grande.\n\n<strong>Más masa → un horizonte de sucesos mayor.</strong>\n\n<strong>Más masa → una densidad media menor a la escala del horizonte.</strong>\n\n<strong>Más masa → una temperatura de Hawking menor.</strong>\n\n<strong>Más masa → una vida muchísimo más larga.</strong>\n\nCambiaste una cosa, y respondieron cuatro propiedades completamente distintas. Eso es lo que significa decir que los agujeros negros siguen las mismas reglas en todo su rango, desde el resto de una sola estrella muerta hasta los gigantes de los centros de las galaxias.',
      tool: {
        title: 'Sagitario A*',
        note: 'El círculo de puntos es la órbita de Mercurio, dibujada a la misma escala que el horizonte.',
      },
      tip: 'El agujero negro más simple de todos, y el que ha usado esta lección de principio a fin, es un agujero negro de Schwarzschild: sin rotación, sin carga. Los reales rotan, a veces muy rápido, y un agujero negro en rotación se describe con la solución de Kerr. El horizonte cambia de forma y de tamaño; todas las tendencias que encontraste aquí sobreviven.',
    },
  ],
};
