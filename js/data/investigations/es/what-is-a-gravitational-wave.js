// =============================================================================
// what-is-a-gravitational-wave - es
// -----------------------------------------------------------------------------
// A shadow of ../what-is-a-gravitational-wave.js carrying only its words. Laid
// over the English lesson by mergeTranslation() in ../i18n.js, so anything
// absent here keeps its English and nothing here can reach the lesson's
// machinery: no scenario name, no seed, no widget id, no numeric answer, no
// probe.
//
// Arrays line up by index with the English. `null` means "not translated";
// that entry keeps its English.
// =============================================================================

export default {
  title: '¿Qué es una onda gravitacional?',
  subtitle:
    'Una primera mirada a qué se mueve, qué viaja y qué siente un detector',
  duration: '30-40 min',
  level: 'Principiante, sin conocimientos previos de física',
  summary:
    'Dos objetos giran uno alrededor del otro en pantalla y no emiten nada de luz. A lo largo de veinticuatro pasos cortos averiguas qué sale de ellos, qué le hace a todo lo que atraviesa y cómo podría notarlo un instrumento; y aprendes a distinguir los tres tipos de imagen: el dibujo, el cálculo y la medida. Sin ecuaciones, sin física previa, y se puede hacer con el sonido apagado.',
  objectives: [
    'Decir en qué se diferencia una onda gravitacional de la luz, del sonido y de la gravedad que ya está ahí',
    'Decir qué tiene que estar haciendo una fuente: cambiar, y no ser igual en todas las direcciones',
    'Describir el estiramiento y la compresión que produce una onda al pasar, perpendiculares a su avance',
    'Conectar una órbita con una señal que se repite, y una órbita que se encoge con una señal que sube',
    'Explicar con palabras corrientes cómo un observatorio mide un cambio de longitud',
    'Distinguir una ilustración, un modelo y una observación en la misma pantalla',
  ],
  steps: [
    {
      title: 'Algo puede viajar sin brillar',
      body: 'Hay dos objetos en el lienzo, girando uno alrededor del otro. Están en pausa y no emiten nada de luz: ni brillo, ni color, nada que un telescopio pudiera fotografiar.\n\nComprométete con una respuesta antes de seguir. No se espera que sepas esta.',
      prompt:
        'Si estos dos objetos no emiten nada de luz, ¿podríamos aun así averiguar que se mueven?',
      options: [
        'No: sin luz no hay nada que detectar',
        'Sí: toda masa curva el espacio, y una masa en movimiento puede mandar esa curvatura hacia fuera como una perturbación que viaja',
        'Sí: los oiríamos, porque el sonido viaja por el espacio',
        'Solo si algo cercano los iluminara',
      ],
      because:
        'Sí, y por la segunda vía. La masa curva el espacio a su alrededor, y cuando la masa se mueve de la manera adecuada esa curvatura no se queda quieta: una onda en ella viaja hacia fuera, a la velocidad de la luz, llevando energía. Esa onda es una onda gravitacional, y de eso trata el resto de la lección. Las dos respuestas equivocadas que conviene nombrar: no hay sonido, porque el sonido necesita aire y no lo hay entre aquí y allí, y no hace falta que nada ilumine el par, porque lo que sale de él no es luz. Guarda la respuesta que diste; el paso 24 te la vuelve a preguntar.',
      tip: 'Los dos discos son un dibujo de dónde dice el modelo que están los objetos. No son una fotografía, y nada en esta lección lo es.',
    },
    {
      title: 'Conoce a los dos objetos',
      body: 'Antes de seguir, conócelos bien.\n\nHaz clic en cada uno en el lienzo, o usa <strong>Objetos de esta actividad</strong> debajo de la lectura, que hace lo mismo desde el teclado. La ficha que se abre da su masa, en unidades de la del Sol.\n\nLo que estás mirando es una <strong>ilustración</strong>. Las posiciones salen de un cálculo, y la distancia entre los dos está a escala; los discos en sí son marcadores de tamaño fijo, no imágenes de nada. No hay ninguna fotografía de un par de agujeros negros, y nunca la habrá de esta clase.',
      checklist: [
        'Selecciona el primer objeto y lee su masa en la ficha',
        'Selecciona el segundo y lee la suya',
        'Fíjate en que las dos fichas dicen lo mismo: una masa y una posición',
        'Di en voz alta cuál es más pesado, y aproximadamente por cuánto',
      ],
      tip: 'La separación en pantalla se mide en radios de Schwarzschild de las dos masas juntas —una unidad honesta— y se irá encogiendo a lo largo de la lección. El tamaño de cada disco no es la medida de nada.',
    },
    {
      title: 'La gravedad ya está aquí',
      body: 'Una sola masa, quieta, ya curva el espacio a su alrededor. Esa curvatura es la razón de que las cosas caigan, y está ahí mire alguien o no.\n\nLa palabra importante es <em>quieta</em>. Nada de esa curvatura cambia. No viaja. No llega. No hay ninguna onda, porque no hay nada ondulando.',
      prompt:
        'Una sola masa que nunca se mueve. ¿Qué le llega a un observador lejano?',
      options: [
        'Una atracción constante, que no cambia, y ninguna onda que viaje',
        'Un chorro de ondas gravitacionales, extendiéndose hacia fuera para siempre',
        'Nada en absoluto, porque la gravedad necesita movimiento',
        'Una onda, pero solo si el observador se mueve',
      ],
      because:
        'Una atracción constante, y nada más. Esta es la distinción sobre la que gira toda la lección: un <em>campo</em> gravitacional es lo que ya hay alrededor de cualquier masa, y una <em>onda</em> gravitacional es un cambio en él que viaja. Una estrella quieta tiene lo primero y no produce nada de lo segundo. Qué hace falta para producir lo segundo es el tema del paso siguiente.',
      tip: 'Compáralo con una lámpara: la luz que ya hay en la habitación no es una emisión de radio. Las dos son electromagnéticas, y solo una es una señal que va a alguna parte.',
    },
    {
      title: '¿Qué tiene que cambiar?',
      body: 'Tres fuentes imaginarias, todas masivas, todas perfectamente corrientes:\n\n<strong>A.</strong> Una bola pesada, quieta.\n\n<strong>B.</strong> Una bola pesada que se hincha y se encoge —más grande, más pequeña, más grande— manteniéndose una esfera perfecta todo el tiempo.\n\n<strong>C.</strong> Dos bolas pesadas girando una alrededor de la otra.\n\nUna de las tres emite ondas gravitacionales. Comprométete antes de seguir leyendo.',
      prompt: '¿Cuál produce una onda gravitacional que viaja?',
      options: [
        'A, porque tiene la masa más concentrada',
        'B, porque se mueve y la masa en movimiento produce ondas',
        'C, porque la disposición de su masa cambia de forma vista desde fuera',
        'Las tres, porque las tres tienen masa',
      ],
      because:
        'Solo C. B es la respuesta equivocada interesante y merece la pena detenerse en ella: la bola se mueve de verdad, cada parte de ella acelerando hacia dentro y hacia fuera, y aun así no emite nada. Una esfera perfecta se ve igual desde fuera por mucho que pulse, así que desde lejos nada de ella cambia y no hay nada que mandar. Así que «la masa en movimiento produce ondas» no es la regla. La regla es que la masa tiene que estar dispuesta de forma <em>desigual</em> y que esa disposición tiene que ir <em>cambiando</em>, que es exactamente lo que hacen dos objetos girando uno alrededor del otro.',
      tip: 'Una estrella perfectamente redonda que gira tampoco emite nada, por la misma razón. Ponle un bulto en un lado y sí lo hace.',
    },
    {
      title: 'Observa el par',
      body: 'Déjalo correr. Pulsa <strong>Reproducir / pausar</strong> y observa a los dos objetos dar vueltas en el lienzo.\n\nFíjate en lo que le pasa a la <em>disposición</em>, no a cada objeto. En un momento el par está alineado de izquierda a derecha; un cuarto de vuelta después está alineado de arriba abajo. La masa tiene otra forma vista desde aquí fuera, y no deja de tener otra forma, una y otra vez.\n\nEsa es la fuente. Todo lo demás en esta lección es una consecuencia de ello.',
      checklist: [
        'Pulsa Reproducir / pausar y observa varias órbitas completas',
        'Pausa cuando los dos objetos estén uno al lado del otro',
        'Avanza paso a paso hasta que estén uno encima del otro',
        'Di qué es lo mismo en esos dos momentos y qué es distinto',
      ],
      tip: 'El movimiento es un modelo, no una simulación de estos dos cuerpos atrayéndose: las posiciones salen de una fórmula publicada de cómo un par así cae en espiral. El panel lo dice debajo de la imagen.',
    },
    {
      title: 'El patrón se repite',
      body: 'Pausa y recorre la órbita poco a poco con el cabezal.\n\nEmpieza con el par alineado de izquierda a derecha. Sigue hasta que la <em>disposición de la masa</em> se vea igual que al principio. No hasta que cada objeto vuelva a donde empezó: hasta que vuelva la forma.\n\nPara dos objetos iguales en un círculo, eso ocurre antes de lo que podrías esperar.',
      prompt:
        'Partiendo de lado a lado, ¿cuánta órbita hasta que la masa vuelve a estar dispuesta igual?',
      options: [
        'Un cuarto de órbita',
        'Media órbita: intercambiar los dos objetos deja la misma disposición',
        'Una órbita completa',
        'Dos órbitas completas',
      ],
      because:
        'Media órbita. Intercambia dos objetos idénticos y no lo notas: el par alineado de izquierda a derecha al principio vuelve a estar alineado de izquierda a derecha a mitad de camino, con los dos objetos cambiados. Así que el patrón que la fuente le presenta al mundo exterior se repite dos veces por órbita, y la onda que emite también. Por eso la frecuencia de la onda para un par así es el <em>doble</em> de la frecuencia orbital, un hecho que el paso 16 te hace contar por ti mismo. Para dos objetos de masas distintas no es tan limpio, y esa complicación esta lección la deja de lado.',
      tip: 'Usa el cabezal en pasos pequeños. La lectura da la fase orbital, así que puedes comprobar tu respuesta con un número en vez de a ojo.',
    },
    {
      title: 'Sigue una perturbación hacia fuera',
      body: 'Los anillos que ahora se dibujan alrededor del par son un <strong>esquema</strong> de la perturbación que sale de él. Cada anillo marca dónde estaría una cresta de la onda.\n\nElige un anillo y síguelo hacia fuera mientras avanza el cabezal. Fíjate en que los anillos de más afuera están más separados: salieron cuando la órbita era más ancha y más lenta.\n\nDos cosas sobre el dibujo, las dos deliberadas. La perturbación real viaja a la <strong>velocidad de la luz</strong>: la pantalla la ralentiza enormemente, o no se vería nada. Y los anillos marcan una cresta, no son una imagen de materia saliendo. No se está expulsando nada del par.',
      checklist: [
        'Sigue un anillo desde el par hasta el borde de la imagen',
        'Fíjate en que los anillos más externos son los más separados',
        'Di por qué: salieron antes, cuando la órbita era más lenta',
        'Di qué no son los anillos: ni materia, ni luz, ni una velocidad a escala',
      ],
      tip: 'Los anillos son el mínimo honesto aquí. Una imagen de la distorsión real del espacio a esta escala sería un campo liso sin ninguna estructura visible, porque el efecto es de una parte en 10²¹.',
    },
    {
      title: 'Conoce unos marcadores que flotan libres',
      body: 'El anillo de puntos del panel es un experimento mental: un círculo de objetos pequeños, flotando libres, muy lejos de la fuente, sin nada que los sujete y sin nada que los empuje.\n\nUna cosa sobre cómo está dibujado importa más de lo que parece. Estás viendo ese anillo <strong>de frente a la onda</strong>, mirando hacia atrás a lo largo de la dirección en la que la onda viaja. No es la órbita vista desde arriba, y los puntos no son los dos objetos. Están en otro sitio completamente distinto, allí donde ha llegado la onda.\n\nObserva qué les hace la onda.',
      tip: 'El efecto está dibujado enormemente más grande de lo que es. El paso 12 te deja bajar la exageración y ver cuál sería su tamaño real.',
    },
    {
      title: 'Se estira en una dirección',
      body: 'Pausa y mueve el cabezal despacio hasta que el anillo de marcadores esté lo más ancho posible de <strong>izquierda a derecha</strong>.\n\nAhora mira la otra dirección.',
      prompt:
        'En el momento en que los marcadores están más separados en horizontal, ¿qué ha pasado en vertical?',
      options: [
        'También están más separados en vertical: todo ha crecido',
        'Están más juntos en vertical',
        'La separación vertical no ha cambiado',
        'Se han desplazado todos hacia un lado juntos',
      ],
      because:
        'Más juntos. Eso es lo característico que hace una onda gravitacional, y por eso el anillo se convierte en un óvalo y no en un círculo más grande: estira en una dirección y comprime en la perpendicular, las dos cosas a la vez. Nada ha crecido en conjunto. Y las dos direcciones son perpendiculares a la dirección en la que viaja la onda, y por eso se llama onda <em>transversal</em>.',
      tip: 'Mueve el cabezal en pasos pequeños y mira el anillo, no la gráfica. El óvalo se ve mejor en su punto más extremo.',
    },
    {
      title: 'Ahora al revés',
      body: 'Desde donde estás, avanza aproximadamente <strong>medio ciclo de onda</strong>, más o menos hasta el siguiente punto en que la gráfica pasa por su mínimo.\n\nEl óvalo se da la vuelta: lo que estaba estirado ahora está comprimido, y lo que estaba comprimido ahora está estirado. Luego vuelve. Esa alternancia, una y otra vez, es todo lo que llega.',
      fields: [
        {
          label:
            'En tu primera parada, ¿en qué dirección era más ancho el anillo? (1 = a lo ancho, 2 = de arriba abajo)',
        },
        {
          label:
            'Medio ciclo después, ¿en cuál? (1 = a lo ancho, 2 = de arriba abajo)',
        },
      ],
      tip: 'No hace falta ser preciso con el medio ciclo. Cualquier punto en que el óvalo se haya dado la vuelta claramente sirve.',
    },
    {
      title: 'Los marcadores no se los lleva la onda',
      body: 'Lo natural a estas alturas es pensar que la onda empuja los marcadores hacia fuera, que se los lleva consigo como una ola del mar se lleva un corcho.\n\nNo es así. Sigue a un solo marcador durante un ciclo completo y mira dónde acaba. Se mueve un poco y vuelve. La onda ha pasado; el marcador no se ha ido a ninguna parte.\n\nLo que viaja es la perturbación. Lo que cambia es la <em>distancia entre</em> las cosas. Esa distinción es lo que hace posible un detector, y es la última idea que necesitas para que uno tenga sentido.',
      checklist: [
        'Elige un marcador y no le quites el ojo de encima',
        'Recorre un ciclo entero y míralo volver a donde empezó',
        'Ahora mira dos marcadores en lados opuestos y fíjate en cómo cambia el hueco entre ellos',
        'Di con tus palabras qué viaja y qué solo oscila',
      ],
      tip: 'Un corcho en una ola hace lo mismo, y este es el único sitio donde la analogía con el agua ayuda en vez de estorbar: el corcho sube y baja y se queda, y la ola sigue.',
    },
    {
      title: '¿Por qué está el efecto dibujado tan grande?',
      body: 'Porque si no, no habría nada en la pantalla.\n\nEl anillo que has estado mirando está dibujado con el efecto exagerado por un factor enorme. El cambio real en la distancia entre dos marcadores, para una onda como esta, es de aproximadamente <strong>una parte en 10²¹</strong>.\n\nEse número es difícil de sentir, así que aquí está de otra manera. Si los dos marcadores estuvieran tan separados como la Tierra del Sol, la onda cambiaría esa distancia en torno al ancho de un átomo. Al tamaño de esta imagen, el efecto real movería un marcador mucho menos que el ancho de un píxel, menos que el ancho de un átomo de tu pantalla.\n\nTodo lo que has visto hasta ahora es una <strong>ilustración</strong>. Los pasos siguientes tratan de lo que sí se mide.',
      tip: 'Por eso las ondas gravitacionales se predijeron en 1916 y se detectaron por primera vez en 2015. Nadie dudaba de las cuentas; el problema era construir algo capaz de ver una parte en 10²¹.',
    },
    {
      title: 'Mide un cambio de longitud',
      fields: [
        {
          label:
            'Práctica: una barra de 10 m que se estira 1 mm tiene una deformación de…',
        },
        { label: 'Amplitud de deformación, de la lectura' },
      ],
      body: 'Aquí está el único vocabulario que necesita esta lección.\n\nCuando pasa una onda, una longitud <em>L</em> cambia en una cantidad pequeña. El número útil no es el cambio sino la <strong>fracción</strong>: cuánto cambió dividido entre cuánto medía. Esa fracción se llama <strong>deformación</strong> (strain).\n\nEmpieza con números que puedas sostener. Un brazo de 4 kilómetros que cambia 4 milímetros tiene una deformación de 0,004 entre 4000, o sea 0,000001: una parte en un millón.\n\nAhora la de verdad. Lee <strong>Amplitud de deformación</strong> en la lectura —la fracción más grande que alcanza esta onda— y anótala.',
      tip: 'La deformación es una fracción, así que no tiene unidades: una deformación de 10⁻²¹ significa lo mismo tanto si la longitud es un metro como si es un año luz.',
    },
    {
      title: '¿Puede el espacio llevar un sonido?',
      body: 'Puede que hayas oído una onda gravitacional reproducida como sonido. Esta lección puede ponerte una: pulsa <strong>Escuchar</strong> si tienes sonido, y mira el marcador cruzar la gráfica si no. Aquí nada necesita sonido, y nada en esta lección se califica por oír algo.\n\nMerece la pena ser exactos sobre qué pasa cuando lo pulsas. La aplicación coge la señal cambiante y la convierte en un sonido para ti. Es una traducción, hecha aquí, en tu máquina.\n\nUn micrófono junto a los dos objetos no oiría <strong>nada</strong>. El sonido es una onda en un material —aire, agua, roca— y no hay material entre aquí y allí. Lo que llega es un cambio de distancia, no un cambio de presión. «Oír la fusión de dos agujeros negros» es una manera de hablar.',
      tip: 'El panel imprime exactamente lo que hizo para volverla audible: cuánto la aceleró y cuánto desplazó eso el tono. Una traducción que esconde lo que hizo no es una que puedas comprobar.',
    },
    {
      title: 'Un par lento y un par rápido',
      body: 'Dos objetos girando uno alrededor del otro muy separados dan vueltas despacio. Los mismos dos objetos girando más cerca dan vueltas más deprisa, por la misma razón por la que Mercurio le da la vuelta al Sol más rápido que Neptuno.\n\nLas masas se quedarán exactamente igual. Solo cambiará la separación.',
      prompt:
        'Un par más cercano, con las mismas dos masas, emite una onda que…',
      options: [
        'tiene una frecuencia más alta, porque el patrón se repite más a menudo',
        'tiene una frecuencia más baja, porque los objetos tienen menos recorrido',
        'tiene la misma frecuencia, porque las masas no han cambiado',
        'no tiene frecuencia, porque la frecuencia es una propiedad de la luz',
      ],
      because:
        'Más alta. La onda se repite cuando se repite la disposición, así que un par que completa su órbita más a menudo emite crestas más a menudo. La regla que hay que llevarse es que la frecuencia de la onda sigue a la frecuencia <em>orbital</em>, y para un par como este es exactamente el doble. Nada de las masas cambió, que es justo el sentido de mantenerlas fijas.',
      tip: 'Puedes comprobarlo tú mismo dentro de poco. Al principio de la señal el par está ancho y lento; al final, esos mismos dos objetos están cerca y rápidos.',
    },
    {
      title: 'Cuenta el ritmo',
      fields: [
        { label: 'Órbitas completas que contaste' },
        { label: 'Picos de onda en ese mismo tramo' },
        { label: 'Picos por órbita' },
      ],
      body: 'Ahora cuéntalo, despacio.\n\nDeja el cabezal al principio de la señal, donde todo va sin prisa. Mira los dos objetos en el lienzo y cuenta <strong>una órbita completa</strong>, hasta que el par vuelva a estar como empezó, con cada objeto donde estaba.\n\nEn ese mismo tramo, cuenta los picos de la gráfica.\n\nLuego guarda los dos números en tu cuaderno.',
      tip: 'Cuenta al principio de la señal, donde el ritmo es más lento. El cabezal se puede mover con las flechas del teclado una vez tiene el foco, que es más fácil que arrastrarlo.',
    },
    {
      title: '¿Por qué puede encogerse una órbita?',
      body: 'Probablemente hayas notado que el par no se queda quieto. La separación se encoge según avanza la señal, y la frecuencia sube con ella.\n\nLa razón es la propia onda. Emitir ondas gravitacionales cuesta <strong>energía</strong>, y el único sitio de donde puede salir esa energía es la órbita. Una órbita con menos energía es una órbita más pequeña. Una órbita más pequeña es más rápida. Una más rápida radia todavía más.\n\nAsí que se desboca, despacio al principio y muy deprisa después, que es la forma que llevas viendo todo el rato.\n\nUna advertencia sobre esta aplicación. En otras partes de Gravitas los agujeros negros caen en espiral porque la simulación encoge su órbita por un factor pequeño en cada paso: una ilustración, elegida para que se vea bien. Eso <em>no</em> es lo que pasa en esta pantalla. El movimiento de aquí sale de la misma fórmula publicada que la gráfica de al lado.',
      tip: 'La energía no se va a ninguna parte. Sale como ondas gravitacionales, y un detector a cuatrocientos megapársecs recoge una parte minúscula de ella.',
    },
    {
      title: 'El chirrido',
      body: 'Deja el cabezal cerca del <strong>principio</strong> y lee tres cosas en la lectura: la separación, la velocidad orbital y la frecuencia.\n\nAhora déjalo cerca del <strong>final</strong> y lee las mismas tres.\n\nSi tienes sonido, pulsa <strong>Escuchar</strong> y óyelo pasar entero. Si no, mira el marcador: los picos se apiñan exactamente igual.',
      prompt:
        'En dos o tres frases, y sin usar ninguna ecuación, di qué es un «chirrido» y por qué esta señal lo es.',
      tip: 'El chirrido de un pájaro es una nota que sube en una fracción de segundo, y de ahí viene el nombre. Es una descripción del sonido, no una afirmación sobre lo que lo produjo.',
    },
    {
      title: 'Dónde se detiene nuestro cálculo',
      body: 'Lleva el cabezal hasta el final del todo.\n\nLa gráfica se para. No se desvanece, y no muestra a los dos objetos fusionándose: simplemente termina, y la lectura dice dónde y por qué.\n\nEse final es un <strong>límite del cálculo</strong>, no algo que le ocurra a la binaria. La fórmula que hay detrás de esta gráfica supone dos objetos en una órbita circular que se encoge despacio, y cerca del final ese supuesto deja de ser cierto. Acertar con los últimos momentos requiere un cálculo de otro tipo por completo, en un superordenador, y a la disciplina le costó unos cuarenta años conseguirlo.',
      prompt: 'Que la gráfica termine donde termina significa que…',
      options: [
        'los dos objetos dejaron de moverse en ese momento',
        'el modelo se apagó ahí, porque más allá no sería fiable',
        'la onda dejó de emitirse',
        'el detector dejó de registrar',
      ],
      because:
        'El modelo se apagó. En ese instante no ocurre nada físico; el cálculo simplemente deja de ser de fiar, así que se detiene. En esta gráfica no hay fusión ni timbre posterior, y el último ciclo que ves no es el último ciclo que tuvo la binaria. Un modelo que dice dónde se detiene es más útil que uno que sigue sin más, y es la razón honesta de que la imagen acabe de golpe en vez de con suavidad.',
      tip: 'La lectura da la frecuencia a la que se detiene. Para este par son unos 68 Hz, y el suceso real se siguió hasta unos 250 Hz, con instrumentos y cálculos muy por encima de los que usa esta lección.',
    },
    {
      title: 'Otros pares compactos',
      body: 'Los agujeros negros no son lo único que hace esto. Dos estrellas de neutrones también pueden caer en espiral la una hacia la otra, y también una de cada.\n\nLos dos objetos del lienzo son ahora un par de estrellas de neutrones, de aproximadamente 1,4 masas solares cada una. Selecciónalas, mira la ficha y compara la señal con la que venías viendo.\n\nUna advertencia sobre hasta dónde llega esto. El modelo detrás de estas gráficas trata a los dos objetos como puntos con una masa y nada más. No puede decirte de qué están hechos, y no dice nada de lo que ocurre cuando dos estrellas de neutrones se tocan de verdad, que es una física rica y violenta que esta lección no intenta.\n\nEn esta pantalla están abiertos los dos controles de masa y también el de distancia. Míralos los tres cuando pulses un preajuste: cada uno pone su par a una distancia distinta, así que la altura de la traza no es una comparación justa entre ellos. La pantalla siguiente cambia la distancia sola, que es la manera de ver qué hace.',
      checklist: [
        'Selecciona cada estrella de neutrones y lee su masa en la ficha',
        'Compara la frecuencia al principio con la del par de agujeros negros que tenías antes',
        'Fíjate en que la señal de las estrellas de neutrones dura mucho más en la banda',
        'Di qué puede decirte aquí el modelo y qué no',
      ],
      tip: 'Los objetos más ligeros tardan mucho más en caer en espiral, así que su señal se queda en el alcance de un detector durante minutos en vez de una fracción de segundo. Esa diferencia es real, y es de las pocas cosas que el modelo simple sí acierta.',
    },
    {
      title: 'La misma fuente, más lejos',
      fields: [
        { label: 'Amplitud de deformación a 400 Mpc' },
        { label: 'Amplitud de deformación a 800 Mpc' },
        { label: 'Amplitud de deformación a 1600 Mpc' },
      ],
      body: 'Volvemos a los agujeros negros, y un solo cambio controlado.\n\nEl control <strong>Distancia</strong> aleja la misma fuente. No cambia nada de los dos objetos: las mismas masas, la misma órbita, todo igual. Solo lo lejos que está.\n\nLa escala de la gráfica está fija en este paso, y el volumen también, para que lo que veas y oigas sea una comparación y no un ajuste. Anota la amplitud de deformación a tres distancias.',
      tip: 'El modelo pone la fuente a una distancia dada y escala la amplitud como uno partido por esa distancia. No modela el estiramiento de la onda por la expansión del Universo, que importa para las fuentes más lejanas y aquí se deja fuera.',
    },
    {
      title: 'Un observatorio mide una diferencia',
      body: 'Ahora el instrumento. Un observatorio como LIGO es una <strong>L</strong>: dos brazos largos en ángulo recto, de cuatro kilómetros cada uno, con luz rebotando por los dos.\n\nYa sabes por qué esa forma. Una onda al pasar estira una dirección mientras comprime la perpendicular, así que alarga un brazo y acorta el otro, en el mismo momento. El instrumento no mide una longitud. Mide la <em>diferencia</em> entre dos longitudes, que es mucho más fácil de hacer bien.\n\nMueve el cabezal y mira el anillo de marcadores: las dos direcciones perpendiculares son los dos brazos.\n\nLuego pulsa <strong>Siguiente</strong> en el instrumento del panel para traer algo distinto. El 14 de septiembre de 2015 dos observatorios separados tres mil kilómetros registraron lo mismo con siete milisegundos de diferencia, y ese registro es lo que aparece. Ni un dibujo ni un cálculo: la deformación que midieron los instrumentos, tal como se publicó.\n\nNo se te pide analizarla. Míralas y fíjate en que tiene la forma que llevas veinte pasos aprendiendo a esperar: una oscilación que se acelera y crece. Ese es el sentido. El modelo que has estado usando es lo bastante simple para una primera lección, y lo de verdad se le parece.',
      checklist: [
        'Pasa la onda por el anillo de marcadores y mira las dos direcciones perpendiculares cambiar de forma distinta',
        'Di por qué una L es la forma adecuada para el instrumento',
        'Mira la traza publicada y encuentra dónde se acelera la oscilación',
        'Fíjate en lo ruidosa que es al lado del modelo limpio, y di cuál de los tres tipos de imagen es cada una',
      ],
      tip: 'Cuatro kilómetros cambiando una diezmilésima del ancho de un protón. Los datos publicados se filtran en banda y se blanquean antes de mostrarlos, y el panel lo dice: hasta una medida llega habiendo pasado por unas manos.',
    },
    {
      title: 'Diseña un experimento pequeño',
      fields: [
        {
          label:
            'Qué control cambiaste (1 = una masa, 2 = distancia, 3 = ángulo de visión)',
        },
        { label: 'Tu lectura en la posición A' },
        { label: 'Tu lectura en la posición B' },
        { label: 'Cuánto cambió, B ÷ A' },
      ],
      body: 'Te toca. Elige <strong>una</strong> cosa que cambiar, y no cambies nada más.\n\nLos controles disponibles son las dos masas, la distancia y el ángulo de visión. Elige uno. Escribe qué crees que pasará antes de tocarlo, luego toma una lectura con el control en la posición A y otra en la B, y guarda las dos.\n\nUna sola variable. Ese es todo el método, y es la razón por la que alguien se cree la respuesta después.',
      tip: 'Si arrastrar un deslizador te resulta difícil, usa los botones de preajuste: ponen los controles en configuraciones con nombre, y comparar dos preajustes es un experimento perfectamente válido siempre que digas qué única cosa cambia.',
    },
    {
      title: 'Cuenta la historia',
      body: 'Último paso. Júntalo todo con tus palabras.\n\nTienes un par de objetos girando uno alrededor del otro, algo que sale de ellos y viaja hacia fuera, y un instrumento muy lejos cuyos dos brazos cambian de longitud en cantidades distintas.\n\nVuelve un momento al paso 1. Te preguntaron si podríamos averiguar que dos objetos oscuros se mueven. Mira qué respondiste.',
      prompt:
        'En cuatro o cinco frases, explica cómo el movimiento de dos objetos acaba siendo una medida en un instrumento en la Tierra. Luego di si tu respuesta del paso 1 sigue en pie y qué le cambiarías.',
      tip: 'A continuación: <strong>Escuchar el espaciotiempo</strong> lleva el mismo instrumento mucho más lejos: qué revela una señal sobre la fuente que la produjo, cómo se compara un modelo con datos reales, y por qué una señal que parece correcta todavía no es una detección.',
    },
  ],
};
