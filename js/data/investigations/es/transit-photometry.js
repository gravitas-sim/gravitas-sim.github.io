// =============================================================================
// transit-photometry - es
// -----------------------------------------------------------------------------
// A shadow of ../transit-photometry.js carrying only its words. Laid over the English lesson
// by mergeTranslation() in ../i18n.js, so anything absent here keeps its
// English and nothing here can reach the lesson's machinery: no scenario name,
// no seed, no widget id, no numeric answer, no probe.
//
// Arrays line up by index with the English. `null` means "not translated";
// that entry keeps its English.
// =============================================================================

export default {
  series: 'Detección de exoplanetas',
  title: 'Encontrar planetas por sus sombras',
  subtitle:
    'Mide un tránsito, calibra lo que te dice y descubre lo que se esconde',
  duration: '50-70 min',
  level: 'Astronomía introductoria',
  summary:
    'Recorre el método del tránsito desde los primeros principios con HD 209458 b, el primer planeta al que se pilló cruzando su estrella: mide una profundidad y conviértela en un radio, corrígela por el oscurecimiento del limbo, cronometra dos tránsitos para obtener un periodo, lee una atmósfera en el color de la caída, y termina encontrando la estrella compañera oculta que hace que el planeta parezca más pequeño de lo que es.',
  objectives: [
    'Explicar por qué casi todos los exoplanetas conocidos se encontraron de forma indirecta, y qué mide realmente cada método',
    'Deducir la relación entre profundidad del tránsito y cociente de radios, y usarla en una curva de luz medida',
    'Tener en cuenta el oscurecimiento del limbo al convertir una profundidad medida en un radio planetario',
    'Cronometrar tránsitos sucesivos para recuperar un periodo orbital, y usarlo para hallar la órbita',
    'Explicar qué mide un espectro de transmisión y por qué la profundidad cambia con la longitud de onda',
    'Corregir una profundidad de tránsito por la luz de una estrella compañera no resuelta, y decir por qué eso importa a un sondeo entero',
  ],
  steps: [
    {
      title: 'Una luciérnaga junto a un faro',
      body: 'Hay más de seis mil planetas confirmados alrededor de otras estrellas. Menos de cien se han fotografiado alguna vez.\n\nEl problema no es que estén lejos, es que están junto a algo abrumadoramente más brillante. Visto desde treinta años luz, Júpiter es unas mil millones de veces más tenue que el Sol y está a medio segundo de arco de él: el ángulo que subtiende una moneda a cuatro kilómetros. Todo telescopio extiende un punto de luz en una pequeña mancha, y la mancha de la estrella es mil millones de veces más alta que el planeta. La imagen directa solo funciona en el raro rincón del espacio de parámetros donde el planeta es lo bastante joven para brillar aún con su propio calor, lo bastante masivo para brillar con fuerza, y lo bastante lejano para librarse del resplandor: un mundo joven y enorme en una órbita ancha. Eso no es lo que son la mayoría de los planetas.\n\nAsí que miramos la estrella. Un planeta no puede ocultar lo que le hace a su anfitriona: tira de ella, curva la luz de las estrellas de detrás y, si la geometría acompaña, pasa por delante y bloquea parte de la luz. Las tres cosas son medidas de la <em>estrella</em>, y las estrellas son brillantes y fáciles.\n\nEn pantalla está <strong>HD 209458</strong>, una parienta del Sol algo más caliente y masiva situada a unos 160 años luz en Pegaso, con un planeta en una órbita de tres días y medio. La estrella y el planeta están dibujados a sus tamaños relativos reales, y por eso la vista está tan ampliada.',
      tip: 'Todo en esta lección es medible a partir de lo que hay en pantalla. Pulsar selecciona un objeto sin abrir la ficha del inspector, y la colocación de objetos nuevos está desactivada para que un clic accidental no altere el sistema que estás midiendo.',
    },
    {
      title: 'Cinco maneras de encontrar un planeta que no puedes ver',
      body: '<strong>Velocidad radial.</strong> Un planeta y su estrella orbitan ambos su centro de masas común, así que la estrella se bambolea, y el bamboleo desplaza sus líneas espectrales al azul y luego al rojo. Júpiter mueve al Sol a 12,5 m/s; la Tierra logra 9 cm/s. Así se encontró el primer planeta alrededor de una estrella normal: Michel Mayor y Didier Queloz anunciaron 51 Pegasi b en 1995, un mundo de masa joviana en una órbita de cuatro días que ninguna teoría de formación planetaria había permitido. Les valió parte del Premio Nobel de 2019. La velocidad radial mide una masa mínima, porque una órbita vista de frente no produce desplazamiento alguno.\n\n<strong>Tránsitos.</strong> Si la órbita resulta estar de canto respecto a nosotros, el planeta cruza el disco estelar y la estrella se atenúa en una fracción fija, una vez por órbita, para siempre. Esto mide un radio. Es con diferencia el método más productivo, y es el que estás a punto de aplicar.\n\n<strong>Microlente.</strong> Cuando una estrella pasa por delante de otra, su gravedad enfoca la luz de la estrella de fondo. Un planeta añade un breve pico extra. Esto encuentra planetas a miles de años luz, incluidos los fríos más allá de la línea de nieve, pero cada suceso ocurre una vez y no se repite jamás.\n\n<strong>Astrometría.</strong> El mismo bamboleo que la velocidad radial, medido como una posición en el cielo en lugar de como un desplazamiento Doppler. Gaia tiene la precisión para hacerlo a gran escala y empieza a dar resultados.\n\n<strong>Imagen directa.</strong> Bloquear la luz estelar con un coronógrafo y fotografiar el planeta mismo. Rara, difícil, y el único método que te consigue un fotón que de verdad vino del planeta.\n\nFíjate en lo que falta en todos ellos salvo el último: nadie ha visto el planeta. Todo se infiere de un efecto sobre otra cosa, y toda inferencia lleva supuestos que pueden ser falsos. Llevar la cuenta de qué es qué es la mayor parte del oficio.',
      tip: 'La velocidad radial da una masa, los tránsitos dan un radio. Ninguno da ambas cosas, y por eso las dos juntas valen mucho más que cualquiera por separado.',
    },
    {
      title: '¿Qué hará el brillo?',
      body: 'El planeta está a punto de cruzar por delante de la estrella desde tu punto de vista. Dentro de un momento abrirás un fotómetro y lo observarás. Comprométete primero con una respuesta.',
      prompt: 'Mientras el planeta cruza la estrella, el brillo medido…',
      options: [
        'subirá, porque el planeta refleja luz extra hacia nosotros',
        'bajará una pequeña cantidad, y después se recuperará',
        'bajará a cero hasta que el planeta haya pasado',
        'se mantendrá plano: el planeta es demasiado pequeño para importar',
      ],
      because:
        'Baja una pequeña cantidad y se recupera. El planeta bloquea una fracción del disco de la estrella igual al cociente de sus áreas, e incluso un Júpiter delante de una estrella parecida al Sol solo cubre alrededor del 1 % de ella. Todo lo de esta lección se sigue de que ese único número sea pequeño pero perfectamente medible.',
    },
    {
      title: 'Tu primer tránsito',
      body: 'El panel de <strong>Curva de luz</strong> se ha abierto a la derecha. Representa el brillo total de todo lo que hay a la vista frente al tiempo, exactamente lo que registra un fotómetro en un telescopio, y nada más: ninguna imagen, ninguna posición, un número por instante.\n\nEl planeta da una vuelta cada 13 segundos aproximadamente de tu tiempo, y el tránsito mismo se acaba en medio segundo. Esa proporción es real: el tránsito ocupa el 4 % de la órbita, o tres horas y media de un año de tres días y medio. Pasa demasiado deprisa para observarlo con detenimiento, que es exactamente la situación de un observador real y exactamente por lo que la medida se hace después sobre el registro. La curva conserva todas las caídas que han pasado.\n\nEl control de <em>ángulo del observador</em> gira tu punto de vista alrededor del sistema. Pruébalo: los tránsitos se mueven a otro momento pero no dejan de ocurrir, porque esta simulación corre en un solo plano y todas las órbitas de ella están de canto. Las órbitas reales están inclinadas, y eso lo cambia todo: volverás a ello.',
      checklist: [
        'Espera hasta que haya al menos dos caídas en la gráfica',
        'Pasa el puntero por la parte plana de la curva y lee el valor en la etiqueta',
        'Pasa el puntero por el fondo de una caída y lee también ese valor',
        'Mueve el ángulo del observador y confirma que las caídas se desplazan pero no desaparecen',
        'Fíjate en la ligerísima subida y bajada de la línea de base entre tránsitos',
      ],
      tip: 'Esa lenta ondulación de la línea de base es la curva de fase del planeta: como la Luna, nos muestra más o menos de su cara iluminada al dar la vuelta. Es una señal real, unas cien veces menor que el tránsito, y los telescopios espaciales la miden.',
    },
    {
      title: 'De dónde sale la profundidad',
      body: 'Una estrella es, para un fotómetro, un disco uniformemente brillante de radio R<sub>★</sub> y área πR<sub>★</sub><sup>2</sup>. Un planeta delante de ella es un disco opaco de radio R<sub>p</sub> y área πR<sub>p</sub><sup>2</sup>, y bloquea exactamente su propia área.\n\nLa caída fraccionaria de brillo, la <strong>profundidad del tránsito</strong>, es por tanto el cociente de las dos áreas:\n\n<strong>δ = πR<sub>p</sub><sup>2</sup> / πR<sub>★</sub><sup>2</sup> = (R<sub>p</sub> / R<sub>★</sub>)<sup>2</sup></strong>\n\nEl π se cancela, la distancia a la estrella se cancela, la luminosidad de la estrella se cancela, y el brillo propio del planeta es despreciable. Lo que sobrevive es un cociente puro de tamaños. Dale la vuelta y la medida que quieres sale directamente:\n\n<strong>R<sub>p</sub> / R<sub>★</sub> = √δ</strong>\n\nEse es todo el método en una línea. También te dice lo que el método no puede hacer: un tránsito te da el tamaño del planeta <em>relativo a la estrella</em>. Para obtener un radio planetario en kilómetros necesitas conocer la estrella, y por eso buena parte del trabajo sobre exoplanetas es en realidad astrofísica estelar.',
      tip: 'El cociente se escribe normalmente k, y es el número más importante de un ajuste de tránsito.',
    },
    {
      title: 'Pruébalo con planetas reales',
      body: 'El instrumento de la derecha dibuja la silueta a escala a la izquierda y el tránsito que produce a la derecha, en una escala vertical fija para que los cambios se lean como cambios.\n\nRecorre los ajustes predefinidos. La lección está en los dos extremos: una Tierra delante del Sol son 84 partes por millón, una profundidad que exigió un telescopio espacial dedicado para alcanzarla, mientras que la misma Tierra delante de TRAPPIST-1 es casi el 1 %, cómodamente al alcance de un telescopio terrestre pequeño. Nada del planeta cambió. Cambió la estrella.',
      checklist: [
        'Halla la profundidad de una Tierra delante del Sol',
        'Halla la profundidad de un Júpiter delante del Sol',
        'Pon una Tierra delante de TRAPPIST-1 y compara',
        'Encoge la estrella y observa cómo la profundidad sube como 1 / R★²',
        'Convéncete de que doblar el radio del planeta cuadruplica la profundidad',
      ],
      tip: 'Por esto la búsqueda de planetas pequeños se trasladó a estrellas pequeñas. Perseguir una Tierra alrededor de una estrella parecida al Sol te cuesta una misión espacial; perseguir una alrededor de una enana M es cien veces más fácil en señal y puede hacerse desde el suelo.',
    },
    {
      title: 'De una profundidad a un tamaño',
      body: 'Supón que un sondeo informa de una caída limpia y repetitiva del 1 %: δ = 0,0100.',
      prompt:
        '¿Cuánto vale R<sub>p</sub> / R<sub>★</sub> para una caída del 1 %?',
      unit: '',
      because:
        'La raíz cuadrada de 0,01 es 0,1: el planeta es una décima parte del radio de la estrella. Alrededor de una estrella parecida al Sol eso es aproximadamente del tamaño de Júpiter, y es exactamente por lo que todos los planetas en tránsito encontrados antes de 2005 aproximadamente eran júpiteres calientes. Eran los únicos que alguien podía ver.',
    },
    {
      title: 'Mide la caída',
      body: 'Ahora hazlo de verdad, con la curva que has estado observando.\n\nNecesitas dos números: el brillo en el tramo plano entre tránsitos, y el brillo en el fondo de una caída.\n\nEl panel ya los está encontrando. Toma como línea de base el nivel en el que la estrella se sitúa durante casi toda su órbita, y mide el fondo de todas las caídas completas que han pasado. Espera hasta que la lectura de abajo muestre al menos un tránsito, y después pulsa el botón para copiar ambos números. Si prefieres leerlos tú, pasa el puntero por la curva de luz y te dará el valor que hay debajo con seis decimales.\n\nLa profundidad y el cociente de radios se calculan a partir de lo que introduzcas, así que una coma decimal descolocada en tu aritmética no puede confundirse con un malentendido de la física.',
      importLabel: 'Copiar el último tránsito',
      fields: [
        {
          label: 'Brillo fuera del tránsito',
          unit: '',
          hint: 'p. ej. 1,000065',
        },
        { label: 'Brillo en el fondo de la caída', unit: '' },
        { label: 'Profundidad del tránsito δ = base − fondo', unit: '' },
        {
          label: 'Cociente de radios R<sub>p</sub> / R<sub>★</sub> = √(δ)',
          unit: '',
        },
      ],
      tip: 'Una curva de luz real tiene ruido, y nadie lee el fondo a ojo: se ajusta un tránsito modelo a todos los puntos a la vez, que es cómo la precisión acaba siendo mejor que cualquier medida individual de ella. Lo que hace aquí el panel es la misma idea sin el ruido.',
    },
    {
      title: 'Por qué ese radio salió demasiado grande',
      body: 'Una estrella no es un disco uniformemente brillante. Estás mirando hacia abajo a través de una atmósfera parcialmente transparente, y en el centro del disco ves directamente hacia dentro, hasta capas calientes y brillantes, mientras que cerca del borde tu línea de visión se inclina y se detiene en capas más frías y tenues. El disco es más brillante en el medio y se apaga hacia el borde. Esto es el <strong>oscurecimiento del limbo</strong>, y es visible en cualquier fotografía decente del Sol.\n\nAsí que un planeta que cruza el centro del disco cubre luz más brillante que la media, y la caída a mitad del tránsito es más profunda de lo que predice el simple cociente de áreas. Para los coeficientes usados aquí, el centro del disco es <strong>1,215</strong> veces más brillante que la media del disco, así que:\n\n<strong>δ<sub>medida</sub> = 1,215 × (R<sub>p</sub> / R<sub>★</sub>)<sup>2</sup></strong>\n\nTomar la raíz cuadrada de tu profundidad medida sobreestima por tanto el cociente de radios en √1,215 = 1,102, alrededor del 10 %. En un planeta cerca de una frontera de clasificación, un 10 % es la diferencia entre dos respuestas distintas sobre de qué está hecho el mundo.\n\nEsto no es una peculiaridad de la simulación. Es la razón de que nadie en el campo dé √δ como cociente de radios: un ajuste de tránsito real resuelve a la vez el cociente de radios, los coeficientes de oscurecimiento del limbo, el parámetro de impacto y la órbita, porque están todos enredados en la misma curva.',
      figure: {
        alt: 'El Sol fotografiado en luz blanca. Su disco es claramente más brillante en el medio y se apaga hacia el borde. El pequeño disco negro de bordes nítidos de Venus está cerca del borde superior derecho, y varias manchas solares se reparten por el centro.',
        caption:
          'Venus cruzando el Sol el 5 de junio de 2012, fotografiado desde San Francisco. Esta es la misma medida que has estado haciendo, sobre la única estrella lo bastante cercana para resolverse. El <strong>oscurecimiento del limbo</strong> se ve claramente: el centro del disco es visiblemente más brillante que el borde, y Venus resulta estar cruzando cerca del borde, donde la estrella es más tenue. Venus es 0,0087 del radio del Sol, así que bloquea unas 76 partes por millón: casi exactamente lo que una Tierra transitando una estrella parecida al Sol daría a un observador de otro lugar. Los puntos oscuros del centro son manchas solares, y son la razón de que la fotometría de tránsitos real tenga que lidiar con una estrella que no se queda quieta.',
        changes: 'redimensionada',
      },
      tip: 'El oscurecimiento del limbo depende de la longitud de onda, y es mucho más débil en el infrarrojo. Esa es una razón por la que las medidas precisas de radios se hacen normalmente en el rojo o el infrarrojo y no en luz azul.',
    },
    {
      title: 'Corrígelo, y obtén un radio real',
      body: 'Divide por el oscurecimiento del limbo, y después convierte el cociente en un tamaño.\n\nHD 209458 es una estrella bien estudiada. La espectroscopía y su distancia de Gaia dan un radio de <strong>1,155 R<sub>☉</sub></strong>, que es el número por el que hay que multiplicar. Introduce tu profundidad medida y el radio de la estrella; el resto es aritmética.',
      fields: [
        {
          label: 'Profundidad que mediste',
          unit: '',
          hint: 'del paso anterior',
        },
        {
          label: 'Radio de la estrella R<sub>★</sub>',
          unit: 'R☉',
          hint: '1,155',
        },
        { label: 'Cociente corregido √(δ / 1,215)', unit: '' },
        { label: 'Radio del planeta', unit: 'R_Júpiter' },
        { label: 'El mismo radio', unit: 'R⊕' },
      ],
      tip: 'Un radio de 1,38 R_Júpiter con una masa de solo 0,69 M_Júpiter hace que este planeta sea menos denso que el agua. Los júpiteres calientes están inflados por el calor que absorben, y explicar exactamente cómo sigue siendo un problema abierto.',
    },
    {
      title: 'La forma de la caída',
      body: 'Un tránsito no es una función escalón. Tiene cuatro puntos de contacto, y la forma entre ellos lleva información.\n\nLa <strong>entrada</strong> empieza cuando el borde delantero del planeta toca por primera vez el disco estelar y termina cuando su borde trasero ha cruzado del todo. En ese intervalo el área bloqueada sube de nada a su valor completo. La entrada dura aproximadamente 2R<sub>p</sub>/2R<sub>★</sub> de todo el suceso, así que la pendiente de los hombros es en sí misma una medida del cociente de radios, independiente de la profundidad.\n\nEl <strong>fondo</strong> entre el segundo y el tercer contacto es donde el planeta está enteramente sobre el disco. No es plano: el oscurecimiento del limbo lo curva, y es más profundo a mitad del tránsito, donde el planeta cubre la parte más brillante de la estrella.\n\nLa <strong>salida</strong> es el espejo de la entrada.\n\nLa <strong>duración total</strong> depende de con qué rapidez se mueve el planeta y de lo larga que sea la cuerda que corta a través del disco. Combina la duración con el periodo y puedes extraer la densidad de la estrella, sin resolverla nunca. Ese truco, llamado perfilado asterodensimétrico, es una de las razones por las que los sondeos de tránsitos resultaron ser útiles también para la astrofísica estelar.',
    },
    {
      title: 'Leer el fondo',
      body: 'Mira con atención una caída de la curva de luz. El fondo no es plano: se curva suavemente, y es más profundo en el medio.',
      prompt: 'El fondo redondeado del tránsito lo causa…',
      options: [
        'que el planeta frena al cruzar',
        'el oscurecimiento del limbo: la estrella es más brillante en su centro que en su borde',
        'que la atmósfera del planeta filtra luz',
        'el ruido de la medida',
      ],
      because:
        'El oscurecimiento del limbo. Ves capas más profundas y calientes en el centro del disco estelar y capas más frías y tenues cerca del borde, así que el planeta bloquea más luz a mitad del tránsito que justo después de la entrada. Es también exactamente el efecto que dividiste hace dos pasos.',
    },
    {
      title: 'El ángulo en el que resulta que estás',
      body: 'Todo lo anterior suponía que el planeta cruza el centro de la estrella. Las órbitas reales están inclinadas, y la inclinación la fija cómo resulta estar orientado el sistema respecto a la Tierra: nada del planeta, todo de nosotros.\n\nEl <strong>parámetro de impacto</strong> b es lo lejos del centro del disco que pasa la trayectoria del planeta, en unidades del radio estelar. b = 0 es justo el centro. b = 1 roza el limbo. Por encima de b = 1 + k aproximadamente, el planeta falla la estrella por completo y no hay ningún tránsito, por mucha paciencia con la que observes.\n\nDeslízalo y observa cómo cambian tres cosas a la vez: el tránsito se acorta, el fondo pierde su tramo plano y se convierte en una V, y la profundidad baja porque el planeta cubre ahora el limbo tenue y no el centro brillante. Las tres cosas son la razón de que un ajuste que ignora el parámetro de impacto se equivoque con el radio.',
      checklist: [
        'Empieza en b = 0 y anota la duración y la profundidad',
        'Sube b a 0,9 y observa cómo el fondo plano se convierte en una V',
        'Encuentra el valor de b en el que el tránsito desaparece por completo',
        'Carga el ajuste de la Tierra alrededor del Sol y lee la probabilidad de tránsito',
        'Reduce a / R★ y observa cómo sube la probabilidad',
      ],
      tip: 'La simulación corre en un plano, así que todas las órbitas de ella tienen b = 0 y transitan. Eso es una limitación de un laboratorio bidimensional, no una afirmación sobre el cielo. Este instrumento es donde vive la tercera dimensión.',
    },
    {
      title: '¿Cuánta suerte hay que tener?',
      body: 'Para una órbita orientada al azar, la probabilidad de que resulte estar lo bastante de canto para transitar es muy próxima a R<sub>★</sub> / a: el radio de la estrella dividido por el tamaño de la órbita.\n\nEl radio del Sol es 0,00465 UA. La Tierra orbita a 1 UA.',
      prompt:
        'Un astrónomo alienígena elige una dirección al azar desde la que mirar el Sol. ¿Aproximadamente una probabilidad entre cuántas de que vea transitar la Tierra?',
      unit: 'a una',
      because:
        'R★/a = 0,00465, o alrededor de 1 entre 215. Ese es el hecho más duro del método del tránsito: incluso un sondeo con fotometría perfecta observando todas las estrellas del cielo para siempre encontraría menos de uno entre doscientos de los planetas tipo Tierra que hay. Todo lo que el método informa sobre lo comunes que son los planetas tiene que dividirse por este factor geométrico antes de significar algo.',
    },
    {
      title: 'Lo que el método se pierde',
      body: 'Ya has visto las dos mitades del problema: la geometría tiene que acompañar, y la señal tiene que ser lo bastante grande para detectarse.',
      prompt:
        'Un sondeo de tránsitos informa de que los júpiteres calientes son mucho más comunes que los júpiteres en órbitas anchas. Da dos razones distintas por las que ese sondeo diría eso aunque no fuera cierto.',
      rubric:
        'Deberían aparecer dos sesgos. (1) Geométrico: la probabilidad de tránsito va como R★/a, así que un planeta a 0,05 UA tiene veinte veces más probabilidad de transitar que uno a 1 UA y cuatrocientas veces más que uno a 20 UA. (2) De detección: un sondeo tiene que ver varios tránsitos para confirmar un periodo, así que un planeta de periodo largo o cae fuera de la ventana de observación o da demasiados pocos sucesos; los periodos cortos producen cientos de tránsitos que pueden apilarse. Se valora también el sesgo de profundidad, ya que los planetas grandes dan caídas más profundas y se encuentran a mayor distancia, y los argumentos de duración o de ciclo de trabajo.',
    },
    {
      title: 'Obtener el periodo',
      body: 'Hasta ahora has usado una sola caída. La curva de luz tiene más que eso: los tránsitos se repiten.',
      prompt: 'El periodo orbital del planeta se mide mejor con…',
      options: [
        'la anchura de un tránsito',
        'el tiempo entre los centros de dos tránsitos sucesivos',
        'la profundidad del tránsito',
        'cuánto tiempo se mantiene la estrella en su brillo de base',
      ],
      because:
        'El espaciado entre tránsitos es el periodo, por definición: el planeta ha dado exactamente una vuelta. La anchura de un tránsito es otra magnitud, fijada por la geometría y la velocidad orbital, y es lo que se usa para obtener la densidad estelar una vez que conoces el periodo.',
    },
    {
      title: 'Cronometra dos tránsitos',
      body: 'La lectura de abajo numera todos los tránsitos completos y da el instante de su centro. Pulsa el botón para registrar el que haya pasado más recientemente, espera a uno posterior y púlsalo otra vez. Cada pulsación trae consigo su número de tránsito, así que puedes dejar la simulación corriendo y volver luego.\n\nLos dos no tienen que ser consecutivos. Introduce cuántas órbitas pasaron entre ellos, que es la diferencia de los dos números de tránsito, y el periodo se divide por ella. Esto no es un truco para ahorrarte la espera: es cómo funciona de verdad la cronometría de tránsitos. Si cada instante central es bueno hasta el minuto y esperas una órbita, el periodo es bueno hasta el minuto; espera cien órbitas y las mismas dos medidas dan un periodo bueno hasta menos de un segundo. Los periodos de Kepler se citan con siete cifras significativas exactamente por esto, y puedes verlo ocurrir aquí esperando más.',
      importLabel: 'Registrar el último tránsito',
      fields: [
        { label: 'Instante central del primer tránsito', unit: 'días' },
        { label: 'qué tránsito era', unit: '', hint: 'p. ej. 2' },
        { label: 'Instante central de un tránsito posterior', unit: 'días' },
        { label: 'qué tránsito era', unit: '', hint: 'p. ej. 5' },
        {
          label: 'Órbitas entre los dos',
          unit: '',
          hint: 'la diferencia de los dos números de tránsito',
        },
        { label: 'Periodo orbital P = (t₂ − t₁) / n', unit: 'días' },
      ],
      tip: 'Los números de tránsito de la lectura cuentan todas las caídas completas desde que empezó el registro, así que las órbitas entre el tránsito 3 y el tránsito 7 son simplemente 4.',
    },
    {
      title: 'De un periodo a una órbita',
      body: 'Un periodo y una masa estelar bastan para situar el planeta, mediante la misma tercera ley que usarías en el Sistema Solar:\n\n<strong>a<sup>3</sup> = P<sup>2</sup> M<sub>★</sub></strong>, con a en UA, P en años y M<sub>★</sub> en masas solares.\n\nHD 209458 pesa <strong>1,148 M<sub>☉</sub></strong>, por su espectro y su posición en la secuencia principal. Introduce tu periodo y esa masa.\n\nLas dos últimas filas son lo que significa la órbita. a / R<sub>★</sub> es a cuántos radios estelares está el planeta, que es lo que fija la probabilidad de tránsito y la duración. La temperatura de equilibrio es lo que sale de igualar la luz estelar que absorbe con el calor que radia.',
      fields: [
        { label: 'Periodo P', unit: 'días', hint: 'del paso anterior' },
        {
          label: 'Masa de la estrella M<sub>★</sub>',
          unit: 'M☉',
          hint: '1,148',
        },
        { label: 'Periodo en años', unit: 'a' },
        { label: 'Semieje mayor a = (P² M)^⅓', unit: 'UA' },
        { label: 'Órbita en radios estelares, a / R<sub>★</sub>', unit: '' },
        { label: 'Temperatura de equilibrio', unit: 'K' },
      ],
    },
    {
      title: 'Lo que un tránsito no puede decirte',
      body: 'Tienes un radio, un periodo y una órbita. No tienes una masa, y ninguna fotometría mejor te la dará. Un planeta gaseoso esponjoso y uno rocoso denso del mismo tamaño producen caídas idénticas.\n\nLa masa tiene que venir de otro sitio, y casi siempre viene de las velocidades radiales: las líneas espectrales de la estrella se desplazan a medida que el planeta tira de ella, y el tamaño de ese desplazamiento da la masa del planeta. Para HD 209458 b son 0,69 masas de Júpiter. Junta las dos medidas y obtienes una densidad: 0,69 masas de Júpiter dentro de 1,38 radios de Júpiter son unos 0,34 gramos por centímetro cúbico, un tercio de la densidad del agua. El planeta flotaría, si tuvieras un océano lo bastante grande.\n\nPor eso la gráfica estándar del campo es el <strong>diagrama masa-radio</strong>, y por eso un planeta con solo una de las dos cosas es un candidato y no un resultado. Es también de donde salió el resultado reciente más interesante: representa el radio frente al periodo para los planetas pequeños de Kepler y hay un hueco visible cerca de 1,8 R<sub>⊕</sub>, el <em>valle de radios</em>, que separa las supertierras rocosas de los mundos pequeños que retienen una envoltura fina de hidrógeno. Se cree que el hueco lo esculpe el escape atmosférico, y es un rasgo que nadie predijo antes de que los datos lo mostraran. Encontrarlo exigió que miles de radios planetarios fueran exactos, que es a donde va la última sección de esta lección.',
      tip: 'Los planetas de TRAPPIST-1 obtuvieron sus masas por una tercera vía: se perturban unos a otros lo suficiente para desplazar sus tránsitos en minutos, y esas variaciones en el instante del tránsito son una medida de masa.',
    },
    {
      title: 'El planeta cambia de tamaño con el color',
      body: 'Aquí hay algo que la imagen sencilla no predice. Mide la profundidad del tránsito en luz roja y otra vez en luz azul y puedes obtener respuestas distintas.\n\nLa razón es que el borde del planeta no es un borde nítido. Un planeta gaseoso tiene atmósfera, y cuánto puedes ver dentro de ella depende de qué absorbe en la longitud de onda a la que estés mirando. En una longitud de onda donde el sodio absorbe con fuerza, la atmósfera se vuelve opaca muy arriba y el planeta presenta un disco algo mayor. En una longitud de onda donde nada absorbe, ves más abajo y el disco es algo menor. La profundidad del tránsito traza la opacidad del planeta frente a la longitud de onda: un <strong>espectro de transmisión</strong>.\n\nEl tamaño del efecto lo fija la <strong>altura de escala</strong> atmosférica, la distancia vertical en la que la presión cae en un factor e: H = kT / μg. Las atmósferas calientes, de baja gravedad y ricas en hidrógeno son esponjosas y tienen alturas de escala grandes, y por eso los júpiteres calientes son las atmósferas más fáciles de estudiar. Para este planeta H es de unos 550 km frente a un radio de 99 000 km, así que una banda intensa eleva el radio unas décimas de por ciento y la profundidad unos cientos de partes por millón sobre 18 000.\n\nEso suena imposible de medir. Se hizo por primera vez en este mismísimo sistema: en 2002 David Charbonneau y sus colegas usaron el Telescopio Espacial Hubble para descubrir que el tránsito de HD 209458 b era ligerísimamente más profundo en las líneas D del sodio que a su lado. Fue la primera detección de una atmósfera en un planeta de otra estrella.',
      tip: 'La misma idea al revés te da espectros de emisión: observa el planeta pasar por detrás de la estrella, resta, y lo que desaparece es la luz propia del planeta.',
    },
    {
      title: 'Lee una atmósfera',
      body: 'El instrumento representa la profundidad del tránsito frente a la longitud de onda para un júpiter caliente como este. La línea de puntos es donde estaría la profundidad si el planeta no tuviera atmósfera alguna; cada bulto por encima de ella es una molécula que vuelve opaca la atmósfera a ese color.\n\nEl deslizador de nubes es la parte honesta. Las capas altas de nubes y bruma quedan por encima de las capas donde se forman los rasgos moleculares y los apagan hacia una línea plana. Una fracción grande de los júpiteres calientes bien observados tiene al menos parcialmente este aspecto, y distinguir una atmósfera genuinamente seca de una húmeda con nubes es una dificultad real y actual.',
      checklist: [
        'Encuentra el rasgo del sodio y lee su tamaño en partes por millón',
        'Compara la banda de agua de 1,4 μm con la de dióxido de carbono de 4,3 μm',
        'Sube las nubes y observa cómo se aplanan los rasgos',
        'Cambia la altura de escala y mira qué rasgos sobreviven',
        'Encuentra una longitud de onda en la que no absorba nada',
      ],
      tip: 'Las longitudes de onda más allá de unos 2,5 μm las absorbe nuestra propia atmósfera y eran inalcanzables hasta el JWST. Sus primeros resultados sobre exoplanetas en 2022 incluyeron la primera detección inequívoca de dióxido de carbono en una atmósfera de exoplaneta.',
    },
    {
      title: 'Por qué se mueve la profundidad',
      body: 'Un equipo mide el tránsito de un planeta 300 partes por millón más profundo a 1,4 μm que a 1,2 μm, y repite el resultado en cuatro tránsitos distintos.',
      prompt: 'La explicación más probable es que…',
      options: [
        'el planeta es físicamente más grande cuando se observa a 1,4 μm',
        'el vapor de agua vuelve opaca la atmósfera a 1,4 μm, así que el planeta bloquea un disco algo más ancho',
        'la estrella es más brillante a 1,4 μm, lo que hace más profundo el tránsito',
        'la órbita es algo distinta en los tránsitos tomados a 1,4 μm',
      ],
      because:
        'Opacidad, no tamaño. En una longitud de onda donde absorbe una molécula abundante, la atmósfera se vuelve opaca más arriba, así que el radio al que el planeta deja de transmitir luz estelar es mayor. El brillo propio de la estrella se cancela por completo de la profundidad, que es lo que hace posible esta medida en primer lugar.',
    },
    {
      title: 'Cosas que no son planetas',
      body: 'Una caída en una curva de luz es una caída en una curva de luz. Varias cosas que no son planetas producen una.\n\nUna <strong>binaria eclipsante</strong> de dos estrellas produce caídas de decenas de por ciento, lo cual es obvio, hasta que el par es rasante y solo roza un pequeño porcentaje. Una <strong>binaria eclipsante de fondo</strong> detrás de tu objetivo, con sus eclipses profundos diluidos por toda la luz de la estrella del primer plano, produce una caída superficial de profundidad exactamente planetaria. Las manchas estelares que entran y salen de la vista al rotar producen caídas que casi se repiten. Kepler y TESS marcan más candidatos de los que confirman, y separarlos es el grueso del esfuerzo de seguimiento.\n\nEl problema más sutil no es un falso positivo en absoluto. Es un planeta real cuya medida está calladamente equivocada.\n\nLos telescopios de sondeo tienen píxeles gruesos. Los de Kepler medían unos cuatro segundos de arco; los de TESS miden <strong>21 segundos de arco</strong>, aproximadamente el tamaño aparente de un cráter pequeño de la Luna. Cada estrella que cae en la apertura contribuye luz al mismo único número. Las compañeras estelares son comunes: aproximadamente la mitad de las estrellas parecidas al Sol tienen una. Si tu objetivo tiene una vecina a una fracción de segundo de arco, el sondeo no tiene manera de saberlo, y la luz de la vecina está en todas las medidas que hagas.\n\nAñadir luz constante a una curva de luz no oculta el tránsito. Lo <em>diluye</em>.',
    },
    {
      title: 'Una estrella que no sabías que estaba ahí',
      body: 'Supón que una fracción de la luz de la apertura viene de una compañera, con cociente de flujos F<sub>2</sub>/F<sub>1</sub>. El planeta sigue bloqueando la misma fracción de su propia estrella, pero esa luz bloqueada es ahora una parte menor del total:\n\n<strong>δ<sub>observada</sub> = δ<sub>real</sub> / (1 + F<sub>2</sub>/F<sub>1</sub>)</strong>\n\nComo el radio va como √δ, el radio que informas es demasiado pequeño exactamente en\n\n<strong>R<sub>real</sub> / R<sub>medido</sub> = √(1 + F<sub>2</sub>/F<sub>1</sub>)</strong>\n\nEl contraste se cita normalmente como una diferencia de magnitudes, y F<sub>2</sub>/F<sub>1</sub> = 10<sup>−0,4Δm</sup>. Una gemela idéntica hace que todos los radios sean demasiado pequeños en √2. Una compañera cuatro magnitudes más tenue lo cambia en un 1,2 %.\n\nPara esto sirve la imagen de alta resolución de estrellas anfitrionas de planetas. El <strong>Robo-AO Kepler Survey</strong> puso un sistema robótico de óptica adaptativa con láser en el telescopio de 1,5 m de Palomar y fotografió <strong>3857</strong> anfitrionas de candidatos a planeta de Kepler entre 2012 y 2016, alcanzando unos 0,15 segundos de arco. Encontró una estrella cercana dentro de 4 segundos de arco alrededor del <strong>14,5 ± 0,5 %</strong> de ellas: aproximadamente una anfitriona de cada siete. El <strong>SOAR TESS Survey</strong> hace el mismo trabajo para TESS con imagen de moteado en el telescopio SOAR de 4,1 m en Chile, resolviendo hasta unos 0,04 segundos de arco, y ha observado casi 3000 objetivos.',
      checklist: [
        'Pon Δm = 0 y confirma que la corrección es exactamente √2',
        'Pon Δm = 0,5, el contraste del escenario que estás a punto de cargar',
        'Encuentra el Δm más allá del cual la corrección es menor del 1 %',
        'Pon el radio medido en 1,5 R⊕ y encuentra el Δm que lo empuja más allá de 1,6',
      ],
      tip: 'El Robo-AO Survey IV corrigió 814 radios de candidatos. Tratando a la primaria y a la secundaria como anfitrionas igual de probables, el radio medio creció en un factor de 1,54, y 35 candidatos que se creían rocosos salieron del rango de tamaños rocosos por completo.',
    },
    {
      title: 'Ve a mirar',
      body: 'Saber que la dilución importa no te dice qué estrellas están diluidas. Alguien tiene que apuntar un telescopio con suficiente poder resolutivo a todas las anfitrionas de planetas y averiguar qué más hay en la apertura.\n\nEso es difícil desde el suelo, porque la atmósfera difumina cada punto de luz en una mancha de un segundo de arco aproximadamente, y una compañera dentro de esa mancha es simplemente parte de la estrella. Dos técnicas se cuelan por debajo. La <strong>óptica adaptativa</strong> mide el frente de onda distorsionado con una estrella guía, a menudo una artificial hecha con un láser, y lo corrige con un espejo deformable cientos de veces por segundo. La <strong>imagen de moteado</strong> toma cientos de exposiciones lo bastante cortas para congelar la atmósfera y las combina en el espacio de Fourier, donde la señal de la binaria sobrevive y el revoltijo atmosférico no.\n\nEl instrumento de la derecha muestra el mismo par de estrellas fotografiado a la resolución que elijas. Baja desde el seeing corriente hasta lo que alcanza un telescopio de 4 m con moteado, y observa cómo una sola estrella se convierte en dos.',
      checklist: [
        'Empieza en seeing corriente y confirma que el par se lee como una sola estrella',
        'Baja a la resolución de Robo-AO y encuentra dónde se separa',
        'Alcanza la resolución de moteado de SOAR y mira cuánto más cerca llega',
        'Mueve la compañera hacia dentro hasta que ni eso pueda separarlas',
        'Sube el contraste y observa que la separación no es lo único que importa',
      ],
      tip: 'Robo-AO alcanzó unos 0,15 segundos de arco en un telescopio de 1,5 m y fotografió 3857 anfitrionas de Kepler; el moteado de SOAR alcanza unos 0,04 segundos de arco en uno de 4,1 m y ha observado cerca de 3000 objetivos de TESS. Ninguno es un telescopio grande según los estándares modernos. Lo que los hizo funcionar fue hacerlo con todas las anfitrionas, y no con unas pocas elegidas.',
    },
    {
      title: 'Ahora mídelo',
      body: 'La misma estrella y el mismo planeta están de vuelta, con un cambio: una segunda estrella media magnitud más tenue está a 300 UA. A la distancia de este sistema son unos tres segundos de arco en el cielo, cómodamente dentro de un solo píxel de TESS y dentro de una apertura de Kepler, y está a 30 000 unidades de simulación de la estrella que estás observando, muy fuera de la vista. Está ahí. No puedes verla. El sondeo tampoco podía.\n\nMide otra vez la profundidad del tránsito exactamente como lo hiciste antes. La lectura de abajo está midiendo la nueva curva a medida que entra; espera un tránsito completo y compara su fondo con lo que obtuviste la primera vez.',
      checklist: [
        'Espera un tránsito completo y lee la nueva línea de base y el nuevo fondo',
        'Confirma que la caída es visiblemente menos profunda que antes',
        'Comprueba los instantes centrales: el periodo no ha cambiado en absoluto',
        'Observa que la forma y la duración del tránsito son exactamente las de antes',
      ],
      tip: 'Solo cambia la profundidad. El periodo, la duración y la forma quedan intactos, que es precisamente por lo que la mezcla es tan fácil de pasar por alto: nada de la curva de luz parece mal.',
    },
    {
      title: 'Recupera el planeta real',
      body: 'Has medido el mismo planeta dos veces, una limpia y otra mezclada. El cociente de las dos profundidades es 1 + F<sub>2</sub>/F<sub>1</sub> directamente, lo que significa que este par de medidas contiene el brillo de la compañera aunque nunca la vieras.\n\nEn la práctica nunca obtienes la medida limpia: esa es toda la dificultad, y es la razón de que alguien tenga que ir y tomar una imagen de alta resolución. Aquí tienes las dos, así que puedes comprobar que la corrección hace lo que dice.',
      importLabel: 'Copiar la profundidad mezclada',
      fields: [
        { label: 'Profundidad que acabas de medir, mezclada', unit: '' },
        {
          label: 'Profundidad que mediste antes, sin mezclar',
          unit: '',
          hint: 'del paso 8',
        },
        { label: 'Radio que implica la curva mezclada', unit: 'R⊕' },
        { label: 'Cociente de profundidades = 1 + F₂/F₁', unit: '' },
        { label: 'Contraste implicado de la compañera Δm', unit: 'mag' },
        { label: 'Corrección del radio √(1 + F₂/F₁)', unit: '' },
        { label: 'Radio corregido del planeta', unit: 'R⊕' },
      ],
      tip: 'Fíjate en lo que la corrección no necesita: la distancia de la compañera, su masa, o si está siquiera ligada a la estrella. Solo cuánta luz añade.',
    },
    {
      title: 'Qué le hace a un sondeo',
      body: 'Aproximadamente una anfitriona de planeta de Kepler de cada siete tiene una estrella vecina dentro de cuatro segundos de arco, y a todos esos planetas se les subestimó el radio en alguna cantidad entre una fracción de por ciento y el 40 %.',
      prompt:
        '¿Cuál es la consecuencia más importante para los resultados extraídos de todo el catálogo?',
      options: [
        'Ninguna: las correcciones son pequeñas y se promedian a lo largo de la muestra',
        'Los radios planetarios son sistemáticamente demasiado pequeños, así que cualquier rasgo que dependa de una frontera de radio, como el número de planetas rocosos, queda sesgado en un sentido',
        'Los planetas afectados no son reales y deberían descartarse',
        'Solo se ven afectados los periodos orbitales, no los radios',
      ],
      because:
        'El sesgo va en un solo sentido: la dilución solo puede hacer que un planeta parezca más pequeño, nunca más grande, así que no se promedia. Eso importa sobre todo cuando una conclusión científica depende de a qué lado de una línea cae un planeta: cuántos planetas rocosos hay, dónde está el valle de radios, cuántos mundos hay en una zona habitable. El Robo-AO Survey V, trabajando con las compañeras que pudo establecer como físicamente ligadas, encontró una corrección media de radio de 1,77 para esos sistemas, y encontró que los júpiteres calientes tienen aproximadamente cuatro veces más probabilidad de estar en binarias que otros planetas: un resultado sobre formación planetaria que solo existe porque alguien fotografió las anfitrionas.',
    },
    {
      title: 'Lo que hiciste, y a dónde va después',
      body: 'Mediste una profundidad de tránsito y la convertiste en un radio planetario, y después hiciste ese radio más exacto tres veces seguidas: una dividiendo por el oscurecimiento del limbo, una entendiendo la geometría que fija el parámetro de impacto, y una corrigiendo por una estrella que nadie podía ver. Esa secuencia —medida, luego corrección, luego corrección— es el aspecto real que tiene el campo desde dentro.\n\nEl método no se está frenando. TESS está sondeando esencialmente todo el cielo en busca de tránsitos alrededor de estrellas brillantes y cercanas, las que merece la pena seguir. El JWST está tomando espectros de transmisión de planetas pequeños alrededor de estrellas frías, que es la única ruta a una atmósfera en algo rocoso con la tecnología actual. PLATO, de la ESA, prevista para más adelante en esta década, está construida para encontrar planetas del tamaño de la Tierra en órbitas de un año alrededor de estrellas parecidas al Sol, el rincón del espacio de parámetros al que Kepler solo llegaba a duras penas. Ariel, después de ella, hará atmósferas a escala de sondeo.\n\nY detrás de todas ellas está el trabajo poco glamuroso que hiciste en los tres últimos pasos: alguien tiene que ir a mirar cada estrella anfitriona con un telescopio lo bastante grande para averiguar qué más hay en la apertura. Cada uno de esos miles de radios planetarios es solo tan bueno como la respuesta.',
      tip: 'Una nota sobre los números: los resultados de sondeo citados aquí vienen del Robo-AO Kepler Survey y del SOAR TESS Survey, que se propusieron ambos fotografiar todas las anfitrionas de candidatos a planeta a su alcance. El censo de Robo-AO cubre 3857 anfitrionas de Kepler; el programa SOAR ha observado cerca de 3000 objetivos de TESS y encuentra una corrección mediana del radio de la anfitriona primaria de alrededor de 1,07, que sube a 1,33 para la décima parte peor.',
    },
  ],
};
