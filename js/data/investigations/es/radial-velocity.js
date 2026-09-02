// =============================================================================
// radial-velocity - es
// -----------------------------------------------------------------------------
// A shadow of ../radial-velocity.js carrying only its words. Laid over the English lesson
// by mergeTranslation() in ../i18n.js, so anything absent here keeps its
// English and nothing here can reach the lesson's machinery: no scenario name,
// no seed, no widget id, no numeric answer, no probe.
//
// Arrays line up by index with the English. `null` means "not translated";
// that entry keeps its English.
// =============================================================================

export default {
  series: 'Detección de exoplanetas',
  title: 'Encontrar planetas por su tirón',
  subtitle:
    'Observa el bamboleo de una estrella, pesa su planeta y combina las pistas',
  duration: '45-55 min',
  level: 'Astronomía introductoria',
  summary:
    'Un planeta que no puedes ver sigue tirando de su estrella, y la estrella se mueve. Mide ese movimiento de dos maneras distintas, conviértelo en una masa y combínalo con el radio que te dio un tránsito para deducir qué clase de mundo es.',
  objectives: [
    'Explicar por qué una estrella y su planeta orbitan ambos su centro de masas común',
    'Leer una curva de velocidad radial e identificar su periodo y su semiamplitud K',
    'Usar una K medida para estimar la masa de un planeta, y decir por qué esa masa suele ser un límite inferior',
    'Explicar por qué un planeta en tránsito se libra de la ambigüedad de M sen i',
    'Describir qué mide la astrometría y cuándo funciona mejor que la velocidad radial',
    'Combinar una masa y un radio en una densidad media, y decir qué puede y qué no puede decirte la densidad',
    'Situar un planeta caracterizado frente a una zona habitable modelada sin afirmar de más',
  ],
  steps: [
    {
      title: 'El planeta que ya mediste',
      body: 'En <em>Encontrar planetas por sus sombras</em> observaste cómo HD 209458 b cruzaba su estrella y usaste la profundidad de la caída para deducir el tamaño del planeta. Aquí tienes el mismo sistema otra vez.\n\nHay algo que aquella lección no mencionó. Cuando se vio el tránsito por primera vez en 1999, los astrónomos ya sabían que el planeta estaba ahí. Llevaban meses observando la estrella, y la estrella se lo había estado diciendo.',
      tip: 'La estrella es el disco brillante del centro. El planeta es el punto pequeño que traza el anillo a su alrededor.',
    },
    {
      title: '¿Cómo se delata un planeta invisible?',
      body: 'El planeta es demasiado tenue para verse junto a su estrella y, en este punto de la historia, nadie lo ha visto transitar. Aun así, la estrella por sí sola bastó para afirmar que había un planeta.',
      prompt: '¿Qué podría estar haciendo la estrella que revele el planeta?',
      options: [
        'El planeta bloquea parte de la luz de la estrella',
        'El planeta tira de la estrella, así que la estrella se mueve',
        'El planeta calienta la estrella',
        'La estrella no se mueve; solo se mueve el planeta',
      ],
      because:
        'La gravedad funciona en ambos sentidos. La estrella atrae al planeta a su órbita, y el planeta tira de vuelta con la misma fuerza. La estrella es mucho más pesada, así que se mueve mucho menos, pero se mueve, y ese movimiento es medible.',
    },
    {
      title: '¿Cuál de los dos se mueve?',
      body: 'Antes de ejecutar nada: la estrella de aquí tiene unas 1,15 veces la masa del Sol. El planeta tiene aproximadamente dos tercios de la masa de Júpiter, lo que lo convierte en cerca de una mil setecientosava parte de la estrella.',
      prompt:
        'Cuando se ejecute la simulación, ¿qué objetos se moverán de verdad?',
      options: [
        'Solo el planeta. La estrella se queda donde está.',
        'Los dos, alrededor de un punto fijo entre ellos, pero en cantidades muy distintas',
        'Los dos, en la misma cantidad',
        'Solo la estrella',
      ],
      because:
        'Se mueven los dos, alrededor de su centro de masas común. Como la estrella es unas mil setecientas veces más pesada, su propia órbita es unas mil setecientas veces menor. Por eso aquí parece inmóvil y no lo está.',
    },
    {
      title: 'Los dos dan vueltas',
      body: 'Este instrumento dibuja la misma idea con la órbita de la estrella ampliada para que puedas verla. La órbita del planeta está a escala real; la de la estrella está aumentada en la cantidad escrita al pie de la imagen.\n\nLa cruz es el centro de masas: el punto que ambos rodean. Fíjate en que la estrella y el planeta están siempre en lados opuestos de él.',
      tool: {
        title: '¿Quién se mueve de verdad?',
        note: 'Prueba los ajustes predefinidos. El aumento cambia; la física no.',
      },
    },
    {
      title: 'Haz el planeta más pesado',
      body: 'Mantén la órbita del mismo tamaño y haz el planeta más masivo.',
      prompt:
        'Un planeta más pesado a la misma distancia hace que la propia órbita de la estrella sea…',
      options: ['menor', 'del mismo tamaño', 'mayor', 'inexistente'],
      because:
        'Un compañero más pesado aleja el punto de equilibrio del centro de la estrella, así que la estrella tiene más recorrido que hacer. Más masa planetaria significa un bamboleo estelar mayor.',
    },
    {
      title: 'Míralo crecer',
      body: 'Arrastra el deslizador de masa planetaria desde una Tierra hasta un Júpiter pesado y observa cómo se abre el círculo de la estrella. Lee el número etiquetado <strong>Órbita propia de la estrella</strong> mientras lo haces.\n\nDespués prueba el ajuste de la Tierra. El bamboleo físico se vuelve diminuto, y el aumento tiene que subir en un factor de miles antes de que puedas verlo siquiera. Sigue estando ahí.\n\nEsa es toda la idea de esta lección. Un planeta no tiene que ser brillante para ser encontrado, ni visible en absoluto. Solo tiene que ser lo bastante pesado como para mover su estrella en una cantidad que podamos medir.',
      tool: {
        title: 'Más masa, mayor bamboleo',
      },
    },
    {
      title: 'La luz lleva la respuesta',
      body: 'La luz de las estrellas no es una franja continua de color. La recorren líneas oscuras, en longitudes de onda donde los átomos de la atmósfera de la estrella han absorbido luz. Cada elemento coloca sus líneas en longitudes de onda que podemos medir en un laboratorio, así que sabemos exactamente dónde deberían estar.\n\nCuando la estrella se mueve hacia nosotros, todas las líneas se desplazan ligerísimamente hacia longitudes de onda más cortas. Cuando se aleja, se desplazan hacia longitudes más largas. Mide el desplazamiento y habrás medido la velocidad.',
      tip: 'Este es el efecto Doppler, la misma razón por la que una sirena baja de tono al pasar junto a ti.',
    },
    {
      title: '¿Hacia dónde va?',
      body: 'Una astrónoma mide las líneas espectrales de una estrella y las encuentra todas en longitudes de onda ligeramente <em>más largas</em> de lo que deberían.',
      prompt: 'La estrella se…',
      options: [
        'mueve hacia nosotros',
        'aleja de nosotros',
        'no se mueve',
        'está calentando',
      ],
      because:
        'Longitudes de onda más largas significan que la estrella se aleja. Los astrónomos escriben eso como una velocidad radial positiva. Longitudes más cortas, una estrella que se acerca, cuentan como negativas.',
    },
    {
      title: 'Hacia aquí, hacia allá, hacia aquí otra vez',
      body: 'A la izquierda, la estrella recorre su pequeña órbita y una flecha muestra qué parte de su movimiento apunta hacia nosotros. A la derecha, esa cantidad se representa mientras la estrella da la vuelta.\n\nObserva qué ocurre en los dos puntos en los que la estrella se mueve justo de través respecto a tu vista.',
      tool: {
        title: 'La parte que podemos medir',
      },
    },
    {
      title: 'Abre el instrumento real',
      body: 'Ahora el sistema en vivo. Abre <strong>Velocidad radial</strong> en la lista de Herramientas de la derecha. Mide la estrella de esta simulación, igual que un espectrógrafo mide una real, y construye la curva a medida que avanza la órbita.\n\nDéjalo correr al menos dos ciclos completos antes de seguir. Una órbita tarda unos trece segundos.',
      tip: 'El panel informa de la velocidad relativa al propio centro de masas del sistema, así que la curva se sitúa en torno a cero.',
    },
    {
      title: 'Leer la curva',
      body: 'Mira la curva que ha dibujado el panel.',
      prompt: 'Cuando la curva está en su punto más negativo, la estrella se…',
      options: [
        'mueve hacia nosotros tan rápido como llega a hacerlo',
        'aleja de nosotros tan rápido como llega a hacerlo',
        'encuentra lo más cerca posible del planeta',
        'está quieta',
      ],
      because:
        'Negativo significa que se acerca. El punto más bajo de la curva es el momento en que la estrella viene hacia nosotros más deprisa; el punto más alto es el momento en que se aleja más deprisa.',
    },
    {
      title: 'Mide el periodo',
      body: 'La curva se repite. Encuentra el tiempo entre dos puntos equivalentes, por ejemplo dos máximos sucesivos, y anótalo.\n\nEste es el periodo orbital del planeta, medido sin haber visto nunca el planeta.',
      fields: [
        {
          label: 'Tiempo de un ciclo completo',
          unit: 'días',
          hint: '3,5',
        },
      ],
    },
    {
      title: 'La semiamplitud, K',
      body: 'La curva oscila desde un máximo hasta un mínimo y vuelve. <strong>K</strong> es la <em>mitad</em> de ese recorrido total: la distancia del centro de la curva a su punto más alto, no de arriba abajo.\n\nEse factor dos es el error más común de toda esta materia. K es la semiamplitud.',
      tip: 'El panel calcula K por ti una vez que ha visto un ciclo completo, así que puedes comprobarte.',
    },
    {
      title: 'Lee K en el panel',
      body: 'Con el panel de Velocidad radial abierto y al menos un ciclo completo registrado, lee la semiamplitud que indica.',
      fields: [
        {
          label: 'Semiamplitud K',
          unit: 'm/s',
          hint: '84',
        },
      ],
    },
    {
      title: '¿Qué haría K más grande?',
      body: 'Mantén fijos la estrella, la órbita y el ángulo de visión, y cambia solo el planeta.',
      prompt: 'Un planeta más masivo produce una K que es…',
      options: ['menor', 'igual', 'mayor', 'negativa'],
      because:
        'Más masa planetaria significa una órbita estelar mayor, y una órbita mayor recorrida en el mismo periodo significa una estrella más rápida. K sube.',
    },
    {
      title: 'Una cosa cada vez',
      body: 'Este instrumento mantiene quietos la estrella, el periodo y el ángulo de visión, y te deja cambiar solo la masa del planeta. Recorre los ajustes predefinidos desde una Tierra hasta un Júpiter pesado.\n\nLa relación es una línea recta: dobla la masa del planeta y doblas K.',
      tool: {
        title: 'La masa frente a K',
      },
    },
    {
      title: 'Pesa HD 209458 b',
      body: 'Usa el instrumento de abajo. Ajusta la masa real del planeta hasta que la K que indica coincida con la K que mediste en el panel, unos 84 metros por segundo, con la inclinación dejada en 90 grados.\n\n¿Qué masa planetaria da eso?',
      tool: {
        title: 'Iguala la K medida',
      },
      prompt: 'Masa del planeta, en masas de Júpiter',
      unit: 'M_J',
      because:
        'Unas 0,69 masas de Júpiter, que es el valor publicado. La velocidad de la estrella te dio la masa de un planeta que nadie había visto.',
    },
    {
      title: 'Ahora inclina todo el sistema',
      body: 'Deja el planeta exactamente como está. Cambia solo dónde estamos situados nosotros, de modo que en lugar de ver la órbita de canto la veamos más bien de frente.',
      prompt:
        'Inclinar el sistema hacia la vista de frente hace que la K medida sea…',
      options: [
        'mayor',
        'menor',
        'igual, porque el planeta no ha cambiado',
        'negativa',
      ],
      because:
        'El planeta no ha cambiado, pero ahora apunta hacia nosotros menos parte del movimiento de la estrella. La velocidad radial solo ve la componente a lo largo de nuestra línea de visión, así que la K medida encoge.',
    },
    {
      title: 'El mismo planeta, cuatro ángulos de visión',
      body: 'Recorre los ajustes de inclinación. La barra etiquetada <strong>masa real</strong> no se mueve nunca. La barra etiquetada <strong>la VR dice al menos</strong> encoge a medida que el sistema se inclina.\n\nA 30 grados el mismo planeta parece tener la mitad de su masa real. A 5 grados casi desaparece.',
      tool: {
        title: 'Inclínalo',
      },
    },
    {
      title: 'M sen i',
      body: 'La velocidad radial por sí sola no puede separar la masa de un planeta de la inclinación de su órbita. Un planeta ligero visto de canto y un planeta más pesado visto en ángulo producen la misma curva.\n\nAsí que lo que informa un sondeo de VR no es una masa. Es una masa <strong>mínima</strong>, escrita <em>M</em> sen <em>i</em>. El planeta real pesa eso o más.',
    },
    {
      title: 'Lo que añade un tránsito',
      body: 'Ahora recuerda lo que exige un tránsito. Para que el planeta cruce la cara de su estrella desde donde estamos, la órbita tiene que estar casi exactamente de canto respecto a nuestra línea de visión.',
      prompt:
        'Para un planeta que podemos ver transitar, la masa mínima de VR es…',
      options: [
        'todavía solo un límite inferior, no mejor que para cualquier otro planeta',
        'muy próxima a la masa real, porque un tránsito implica que la órbita está casi de canto',
        'siempre exactamente el doble de la masa real',
        'irrelevante',
      ],
      because:
        'Un tránsito fija la inclinación cerca de 90 grados, así que sen i está cerca de 1 y la masa mínima es esencialmente la masa. Por eso los planetas en tránsito son los que mejor conocemos: el tránsito da el radio y fija la geometría, y la velocidad radial da entonces una masa real.',
    },
    {
      title: 'Un sistema visto de frente',
      body: 'Supón que un sistema está casi exactamente de frente respecto a nosotros. Su señal de velocidad radial es casi nula.',
      prompt: '¿Es indetectable el planeta?',
      options: [
        'Sí. Ningún método de bamboleo puede funcionar en un sistema visto de frente.',
        'No. La estrella sigue moviéndose; solo que se mueve de través en vez de a lo largo de nuestra vista.',
        'Sí, a menos que el planeta sea muy grande',
        'No, porque los sistemas vistos de frente siempre transitan',
      ],
      because:
        'La estrella sigue trazando su pequeña órbita. Vista de frente, todo ese movimiento es de través respecto a nuestra vista, que es exactamente el movimiento que la velocidad radial no puede ver y otro método sí.',
    },
    {
      title: 'Astrometría',
      body: 'La astrometría mide <em>dónde</em> está una estrella, con mucha precisión, una y otra vez. Una estrella con un planeta no se queda quieta: traza una pequeña trayectoria cerrada en el cielo, una vez por órbita.\n\nEsto no es una imagen del planeta. El planeta permanece invisible todo el tiempo. Lo que se mide es la posición de la estrella.',
      tip: 'Los ángulos implicados son diminutos: a menudo millonésimas de segundo de arco.',
    },
    {
      title: 'Inclínalo otra vez, y observa el otro método',
      body: 'Mueve el deslizador de inclinación de la vista de canto a la vista de frente.\n\nDe canto, la trayectoria de la estrella en el cielo se reduce a una línea. De frente, se abre en un círculo. En medio es una elipse.\n\nLo importante: el <em>tamaño</em> de la trayectoria no cambia nunca. Solo cambia su forma.',
      tool: {
        title: 'La trayectoria en el cielo',
      },
    },
    {
      title: 'Dos métodos, debilidades opuestas',
      body: 'Compara lo que hacen los dos métodos a medida que un sistema se inclina de canto hacia de frente.',
      prompt: 'Para un sistema visto casi de frente…',
      options: [
        'fallan tanto la velocidad radial como la astrometría',
        'la velocidad radial casi desaparece, mientras que la astrometría funciona bien',
        'la astrometría casi desaparece, mientras que la velocidad radial funciona bien',
        'ambos funcionan igual de bien en cualquier ángulo',
      ],
      because:
        'La velocidad radial escala con sen i y muere de frente. La órbita astrométrica no encoge en absoluto; simplemente aparece como un círculo en vez de como una línea. Los dos métodos fallan en direcciones opuestas, y por eso se describen como complementarios.',
    },
    {
      title: 'Los tres a la vez',
      body: 'Este panel pone los tres métodos uno al lado del otro para un mismo sistema mientras lo inclinas. Observa qué medidas sobreviven.\n\nFíjate en que el tránsito es el más frágil de los tres: unos pocos grados fuera de la vista de canto y deja de ocurrir por completo.',
      tool: {
        title: 'Qué señales sobreviven',
      },
    },
    {
      title: 'Aleja el sistema',
      body: 'Toma un sistema con un bamboleo estelar conocido e imagínalo al doble de distancia de la Tierra.',
      prompt: 'La órbita física de la estrella alrededor del centro de masas…',
      options: [
        'se reduce a la mitad',
        'se dobla',
        'sigue exactamente igual; solo cambia el ángulo que medimos',
        'desaparece',
      ],
      because:
        'La distancia es un problema nuestro, no del sistema. La órbita de la estrella es la que es. Lo que cambia es el ángulo que esa órbita subtiende desde aquí, y eso es lo que la astrometría tiene que medir.',
    },
    {
      title: 'Distancia y tamaño de la órbita',
      body: 'Usa primero el deslizador de distancia: la órbita de reflejo en UA se queda igual mientras la firma angular encoge.\n\nDespués usa el deslizador de tamaño orbital. Una órbita más ancha aleja más la estrella del centro de masas, así que el bamboleo físico crece de verdad.\n\nCompara los dos ajustes predefinidos: HD 209458 b, y el Sol con Júpiter visto desde diez pársecs.',
      tool: {
        title: 'Qué hace detectable una señal astrométrica',
      },
    },
    {
      title: 'Métodos distintos, planetas distintos',
      body: 'HD 209458 b da una señal de velocidad radial grande, 84 metros por segundo, y una firma astrométrica de menos de una millonésima de segundo de arco. El Sol y Júpiter vistos desde diez pársecs dan una señal de VR mucho menor pero un bamboleo astrométrico cientos de veces mayor.',
      prompt: 'La astrometría rinde al máximo con planetas que son…',
      options: [
        'masivos, en órbitas anchas, alrededor de estrellas cercanas',
        'pequeños, en órbitas apretadas, alrededor de estrellas lejanas',
        'exactamente como la Tierra',
        'en tránsito',
      ],
      because:
        'Una órbita ancha significa un bamboleo físico grande; una estrella cercana significa que ese bamboleo subtiende un ángulo grande. Los tránsitos favorecen lo contrario —planetas próximos a su estrella— y la velocidad radial queda en medio. Ningún método sondea toda la población, y por eso usamos varios.',
    },
    {
      title: 'Recupera el tránsito',
      body: 'Ahora tienes dos medidas independientes del mismo planeta.\n\nDel tránsito, en la investigación anterior: su <strong>radio</strong>, unos 1,38 radios de Júpiter.\n\nDel bamboleo, en esta: su <strong>masa</strong>, unas 0,69 masas de Júpiter.\n\nNinguno de los dos números dice por sí solo qué clase de objeto es este. Juntos, sí.',
    },
    {
      title: 'Caracteriza el planeta',
      body: 'El panel de abajo toma cada medida por turno y muestra qué compra. Las dos primeras filas son el tránsito y la velocidad radial. La tercera las combina.\n\nLee la densidad media de HD 209458 b y compárala con el agua, 1 gramo por centímetro cúbico, y con la Tierra, 5,5.',
      tool: {
        title: 'La cadena de inferencia',
      },
    },
    {
      title: '¿Cómo de denso es?',
      body: 'Lee la densidad media de HD 209458 b en el panel.',
      prompt: 'Densidad media, en g/cm³',
      unit: 'g/cm³',
      because:
        'Unos 0,33 gramos por centímetro cúbico: aproximadamente un tercio de la densidad del agua, y cerca de una dieciseisava parte de la de la Tierra. Un planeta del tamaño de Júpiter con dos tercios de la masa de Júpiter tiene que estar dominado por gas.',
    },
    {
      title: '¿Dónde se sitúa HD 209458 b?',
      body: 'Mira las dos últimas filas del panel de caracterización.',
      prompt:
        'HD 209458 b recibe aproximadamente 785 veces la luz estelar que recibe la Tierra, lo que lo sitúa…',
      options: [
        'dentro de la zona habitable modelada',
        'mucho más cerca que el borde interior de la zona',
        'mucho más allá del borde exterior de la zona',
        'exactamente en el borde interior',
      ],
      because:
        'Orbita a una vigésima parte de la distancia de la Tierra alrededor de una estrella más brillante que el Sol. Ahora sabemos muchísimo sobre este planeta: su tamaño, su masa, su densidad y su irradiación. Todo ello dice gigante gaseoso caliente.',
    },
    {
      title: 'Tres candidatos',
      body: 'Aquí tienes tres planetas de un sondeo. De cada uno tienes un radio de su tránsito, una masa de su velocidad radial y una órbita alrededor de una estrella algo más fría y tenue que el Sol.\n\nUsa los ajustes predefinidos del panel para cargar cada uno por turno, y lee los cuatro números: radio, masa, densidad y dónde se sitúa respecto a la zona.',
      tool: {
        title: 'Tres candidatos',
        note: 'Carga el Planeta A, luego el Planeta B, luego el Planeta C.',
      },
    },
    {
      title: '¿Cuál es el candidato más sólido?',
      body: 'El Planeta A tiene 1,1 radios terrestres y 1,4 masas terrestres, en la zona.\n\nEl Planeta B tiene 2,5 radios terrestres y 6 masas terrestres, también en la zona.\n\nEl Planeta C tiene 1,05 radios terrestres y 1,3 masas terrestres, pero recibe unas treinta veces la luz estelar que recibe la Tierra.',
      prompt:
        '¿Cuál es el candidato más sólido a mundo rocoso con un nivel templado de irradiación?',
      options: [
        'El Planeta A',
        'El Planeta B, porque es el mayor',
        'El Planeta C, porque es rocoso',
        'Los tres son candidatos igual de buenos',
      ],
      because:
        'Solo A cumple ambas condiciones. B está en la zona, pero su densidad de unos 2 gramos por centímetro cúbico es demasiado baja para ser roca, así que es más probable que sea un mundo pequeño con una envoltura gruesa. C tiene densidad rocosa pero está treinta veces demasiado irradiado. Ninguna columna responde la pregunta por sí sola.',
    },
    {
      title: '¿Qué querrías saber todavía?',
      body: 'Tienes un radio, una masa, una densidad y una irradiación del Planeta A. Eso es muchísimo para un planeta que nadie ha visto.\n\nNo lo es todo.',
      prompt:
        'Nombra una cosa que todavía no sepas del Planeta A y que importaría para saber si realmente podría albergar agua líquida, y di brevemente por qué importa.',
      rubric:
        'Puntuación completa por nombrar cualquier propiedad que las medidas actuales no alcanzan, junto con una razón por la que afecta al agua líquida superficial. Respuestas esperadas: si tiene atmósfera y de qué composición, ya que la presión superficial decide si el agua líquida es estable; si rota o está anclado por mareas, lo que determina si una cara se congela; su albedo, ya que la luz reflejada nunca calienta la superficie; si conserva un campo magnético, que afecta a la pérdida atmosférica; y la actividad de fulguraciones de la estrella. Acéptese también que el cálculo de la zona habitable es una afirmación sobre la órbita bajo condiciones climáticas supuestas, no una medida del planeta. Basta con una propiedad; no se penalice una respuesta fuera de esta lista cuyo razonamiento la conecte con el agua líquida.',
      because:
        'Hay varias buenas respuestas: si tiene atmósfera, de qué está hecha, si rota o mantiene una cara hacia su estrella, si tiene campo magnético, cuánta luz estelar refleja y si la estrella emite fulguraciones. La zona habitable es una afirmación sobre la órbita, no sobre el planeta. Dice dónde es posible el agua líquida dado un conjunto de supuestos climáticos, y nada sobre si este mundo en concreto tiene alguna.',
    },
    {
      title: 'El sentido de todo esto',
      body: 'Empezaste esta lección sin poder ver un planeta en absoluto.',
      prompt: 'La idea más importante de todas aquí es que…',
      options: [
        'la velocidad radial es la mejor manera de encontrar planetas',
        'combinar medidas distintas te dice cosas que ninguna medida por separado puede decir',
        'los tránsitos son el único método fiable',
        'un planeta en la zona habitable está habitado',
      ],
      because:
        'Cada método tiene un punto ciego, y no es el mismo punto ciego. Un tránsito sin masa te deja un tamaño y ninguna idea de de qué está hecho. Una velocidad radial sin tránsito te deja un límite inferior de una masa. Juntas dan un planeta real. Esa combinación, y no una técnica cualquiera, es en lo que consiste realmente caracterizar otro mundo.',
    },
  ],
};
