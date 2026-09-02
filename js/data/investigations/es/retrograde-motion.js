// =============================================================================
// retrograde-motion - es
// -----------------------------------------------------------------------------
// A shadow of ../retrograde-motion.js carrying only its words. Laid over the English lesson
// by mergeTranslation() in ../i18n.js, so anything absent here keeps its
// English and nothing here can reach the lesson's machinery: no scenario name,
// no seed, no widget id, no numeric answer, no probe.
//
// Arrays line up by index with the English. `null` means "not translated";
// that entry keeps its English.
// =============================================================================

export default {
  title: 'Por qué Marte va hacia atrás',
  subtitle: 'Cambia el marco y catorce siglos de epiciclos se vienen abajo',
  duration: '35-45 min',
  level: 'Astronomía introductoria',
  summary:
    'Dos veces cada tres años Marte se detiene en el cielo, invierte su marcha y traza un bucle sobre sí mismo. Visto desde fuera no ocurre nada de eso: la Tierra y Marte giran alrededor del Sol en el mismo sentido y no retroceden jamás. Medirás ambas órbitas, predecirás qué hace Marte visto desde la Tierra, y después cambiarás el sistema de referencia y verás cómo el bucle se dibuja solo. Nada de la física cambia al hacerlo. Ese es todo el asunto, y es lo que llevó a la astronomía de Ptolomeo a Copérnico.',
  objectives: [
    'Describir el movimiento retrógrado como una observación, aparte de cualquier explicación de él',
    'Calcular un periodo sinódico a partir de dos periodos orbitales y decir qué cuenta',
    'Predecir y luego verificar que un bucle retrógrado ocurre en la oposición',
    'Explicar el movimiento retrógrado como consecuencia del movimiento del propio observador, sin invocar nada que haga el planeta',
    'Decir qué es un sistema de referencia, y qué cambia y qué no al cambiar de uno',
    'Indicar qué establece y qué no establece el bucle retrógrado sobre qué cuerpo está en el centro',
  ],
  steps: [
    {
      title: 'Las estrellas errantes',
      body: 'Casi todo en el cielo nocturno se mueve al unísono. Las estrellas giran sobre nuestras cabezas como un patrón rígido, noche tras noche, y los patrones mismos no cambian a lo largo de una vida humana.\n\nCinco puntos de luz no obedecen. Van a la deriva lentamente entre las estrellas fijas por sus propios caminos, y los griegos los llamaron <em>planētai</em>, los errantes. La mayor parte del tiempo cada uno de ellos avanza despacio hacia el este contra las estrellas.\n\nY entonces, a intervalos, uno se detiene. Se queda quieto unos días, invierte la marcha y viaja hacia el oeste durante semanas o meses. Después se detiene otra vez y reanuda su marcha hacia el este, habiendo trazado un bucle o un zigzag contra el fondo. Marte hace esto una vez cada 780 días, y la inversión dura unas diez semanas.\n\nNo es un efecto sutil visible solo para especialistas. Cualquiera que observe Marte durante unos meses a simple vista puede verlo, y todas las civilizaciones que llevaron registros del cielo lo advirtieron.',
      quote: {
        text: 'Los planetas parecen a veces avanzar, a veces retroceder y a veces quedarse quietos.',
        by: 'Claudio Ptolomeo, Almagesto, h. 150 d. C.',
      },
      tip: 'Esta lección deja el inspector activado: lo necesitarás para leer números de la Tierra y de Marte. La colocación de objetos nuevos está desactivada, así que un clic accidental no puede alterar el sistema que estás midiendo.',
    },
    {
      title: 'Lo que estás mirando',
      body: 'Tres cuerpos, y nada más. El <strong>Sol</strong> en el centro, la <strong>Tierra</strong> en azul en la órbita interior y <strong>Marte</strong> en naranja en la exterior.\n\nLas distancias son reales: la Tierra a 1,00 UA, Marte a 1,52. Las masas son reales, así que los periodos también lo son, y todo el sistema corre unas cuatrocientas mil veces más rápido que el cielo. Un año terrestre dura aquí unos pocos segundos.\n\nObserva un momento. Ambos planetas giran alrededor del Sol en el mismo sentido, en sentido antihorario, y ninguno frena, se detiene ni retrocede jamás. Sea lo que sea lo que hace que Marte parezca invertir la marcha, no es algo que Marte haga.',
      tip: 'Si las estelas no aparecen, pulsa el botón de reinicio junto a la barra de progreso para reconstruir el sistema.',
    },
    {
      title: 'Contra las estrellas fijas',
      body: 'Antes de medir nada, ten claro qué es la medida.\n\nUn astrónomo antiguo no tenía distancias. Nadie sabía a qué distancia estaba Marte, y las estimaciones erraban por órdenes de magnitud hasta el siglo XVII. Lo que sí se podía medir, y medir bien, era una <em>dirección</em>: hacia dónde quedaba Marte, registrada contra el patrón de estrellas de detrás.\n\nAsí que el movimiento retrógrado es una afirmación sobre un solo número, la dirección al planeta, cambiando en el sentido equivocado a lo largo de semanas. El bucle que aparece en un diagrama moderno es esa dirección representada frente al tiempo, no una trayectoria que nadie viera trazarse.\n\nGravitas te da ese mismo número y además una distancia, que es más de lo que tuvo ningún observador hasta el radar. La dirección es lo que hay que vigilar.',
    },
    {
      title: 'Observa primero desde fuera',
      body: 'Antes de cambiar nada, dedica un momento a la vista que ya tienes. Esta es la vista de pájaro que ningún observador ha tenido jamás: fuera del sistema, mirándolo desde arriba.\n\nObserva a ambos planetas dar vueltas. Pulsa cada uno y lee su velocidad. Aquí nada invierte la marcha, ni titubea, ni traza bucles.',
      checklist: [
        'La Tierra gira en sentido antihorario alrededor del Sol, y no retrocede nunca',
        'Marte también gira en sentido antihorario, y no retrocede nunca',
        'La Tierra completa una vuelta en notablemente menos tiempo que Marte',
        'Observa cómo la Tierra alcanza a Marte y lo adelanta por dentro',
      ],
    },
    {
      title: 'Las dos órbitas',
      body: 'Pulsa la <strong>Tierra</strong> y lee su periodo orbital en el inspector, después pulsa <strong>Marte</strong> y lee el suyo. El inspector informa del periodo de la órbita sobre la que cada cuerpo está realmente, calculado a partir de su posición y velocidad en vivo.\n\nYa que estás, anota lo lejos que está cada uno del Sol.',
      fields: [
        { label: 'Tierra: distancia al Sol', unit: 'UA' },
        { label: 'Marte: distancia al Sol', unit: 'UA' },
        { label: 'Tierra: periodo orbital', unit: 'días' },
        { label: 'Marte: periodo orbital', unit: 'días' },
      ],
    },
    {
      title: '¿Cuál es más rápido?',
      body: 'Tienes dos periodos y dos distancias. La tercera ley de Kepler los relaciona, pero aquí no la necesitas: puedes leer la respuesta directamente de los números que acabas de anotar.',
      prompt: 'Al girar alrededor del Sol, la Tierra…',
      options: [
        'completa una órbita en menos tiempo que Marte, así que gira más rápido',
        'completa una órbita en más tiempo que Marte, porque tiene más recorrido',
        'gira en el mismo tiempo que Marte, ya que ambos orbitan el mismo Sol',
        'gira más rápido solo cuando está más cerca de Marte',
      ],
      because:
        'La Tierra tarda 365 días y Marte 687, así que la Tierra da casi dos vueltas al Sol por cada vuelta de Marte. Ese es todo el mecanismo del movimiento retrógrado, y ya lo has medido. El planeta interior está en una pista más corta y además se mueve más rápido por ella: ambos efectos van en el mismo sentido, que es lo que dice la tercera ley de Kepler.',
    },
    {
      title: 'Con qué rapidez gira cada uno',
      body: 'Un periodo es incómodo de comparar directamente. Conviértelo en una velocidad angular: una vuelta completa son 360°, así que un planeta cubre 360 ÷ P grados cada día.\n\nUsa los dos periodos que acabas de medir.',
      fields: [
        { label: 'Tierra: grados por día', unit: '°/día' },
        { label: 'Marte: grados por día', unit: '°/día' },
        {
          label: 'Grados que la Tierra le gana a Marte cada día',
          unit: '°/día',
        },
      ],
    },
    {
      title: 'El periodo sinódico',
      body: 'Dos corredores en una pista circular, uno más rápido que el otro, vuelven a encontrarse a intervalos. No una vez por vuelta: el corredor más rápido tiene que sacarle una vuelta entera al más lento.\n\nPara los planetas este intervalo se llama <em>periodo sinódico</em>, y es el tiempo entre una alineación de Sol, Tierra y Marte y la siguiente. Como cuenta vueltas ganadas y no vueltas dadas, es más largo que el año propio de cualquiera de los dos planetas.\n\nSi el planeta más rápido gira en <em>P</em>₁ y el más lento en <em>P</em>₂, entonces en un periodo sinódico <em>S</em> el rápido completa exactamente una vuelta más que el lento:\n\n<strong>1/S = 1/P₁ − 1/P₂</strong>\n\nLa alineación que importa aquí es la <em>oposición</em>: la Tierra directamente entre el Sol y Marte, con Marte en el lado opuesto de nuestro cielo respecto al Sol. Es también cuando Marte está más cerca de nosotros y más brillante.',
    },
    {
      title: '¿Cada cuánto alcanza la Tierra a Marte?',
      body: 'Usa tus dos periodos medidos en 1/S = 1/P₁ − 1/P₂, con P₁ el más corto. Trabaja en días.\n\nCon 365 y 687 la resta da 1/S = 0,00274 − 0,00146 = 0,00128 por día.',
      prompt:
        '¿Cuántos días pasan entre una oposición de Marte y la siguiente?',
      unit: 'días',
      because:
        'S = 780 días, unos dos años y siete semanas. Por eso Marte está bien situado para observarlo aproximadamente cada dos años y no cada año: la Tierra necesita 780 días para sacarle una vuelta entera. Venus, que es mucho más rápido, vuelve a la misma alineación cada 584 días; Júpiter, que es mucho más lento, cada 399, apenas más que un año terrestre, porque Júpiter apenas se ha movido mientras la Tierra da la vuelta.',
    },
    {
      title: 'Una vuelta ganada',
      body: 'Tienes el ritmo al que la Tierra le gana terreno a Marte, en grados por día. Una vuelta completa ganada son 360°.\n\nDivide uno entre el otro y tendrás otra vez el periodo sinódico, por un camino distinto. Debería coincidir con lo que obtuviste de los inversos.',
      prompt:
        'A unos 0,46° ganados por día, ¿cuántos días para ganar 360° completos?',
      unit: 'días',
      because:
        'Los mismos 780 días, alcanzados sin tocar un inverso. Merece la pena hacerlo dos veces porque la fórmula de los inversos es fácil de aplicar y difícil de sentir: lo que cuenta son vueltas ganadas, y ganar una vuelta a medio grado por día lleva algo más de dos años. Cada bucle retrógrado de Marte es una vuelta ganada.',
    },
    {
      title: 'Antes de mirar',
      body: 'Estás a punto de cambiar aquello contra lo que se mide la vista. Ahora mismo cada posición en pantalla se da respecto a las coordenadas propias del escenario, que resultan tener al Sol quieto en el centro. Vas a reexpresar la misma simulación con la <strong>Tierra</strong> quieta en su lugar.\n\nNada de la física va a cambiar. No se añade ninguna fuerza, no se altera ninguna órbita, no se mueve ningún cuerpo. Solo la pregunta «¿medido contra qué?» recibe otra respuesta.\n\nComprométete primero con una predicción.',
      prompt: 'Vista desde la Tierra, la trayectoria de Marte…',
      options: [
        'seguirá siendo un círculo alrededor del Sol, solo que dibujado descentrado',
        'será un bucle que se dobla sobre sí mismo a intervalos',
        'será una línea recta, ya que ninguno de los dos planetas acelera mucho',
        'no cambiará, porque cambiar el marco solo cambia las etiquetas',
      ],
      because:
        'La trayectoria se dobla sobre sí misma. Marte sigue moviéndose de manera constante alrededor del Sol todo el tiempo, pero la Tierra también se mueve, y más rápido; cerca de la oposición la Tierra lo adelanta por dentro y la dirección de la Tierra a Marte gira hacia atrás. La última opción es la tentadora y es medio correcta: un cambio de marco no altera la física. Sí cambia, en cambio, la trayectoria, porque una trayectoria es un conjunto de posiciones y las posiciones se miden siempre contra algo.',
    },
    {
      title: 'Sistemas de referencia',
      body: 'Una posición nunca es una propiedad de un cuerpo por sí solo. Es una relación entre ese cuerpo y otra cosa, y esa otra cosa es el <em>sistema de referencia</em>.\n\nCambias de sistema constantemente sin darte cuenta. Al caminar por el pasillo de un tren te mueves a alrededor de 1 m/s en el marco del tren y a 55 m/s en el marco de la vía. Ambas cosas son correctas. Ninguna es más cierta que la otra, y ningún experimento hecho en el tren puede decirte cuál estás haciendo «de verdad».\n\nGravitas te deja elegir el marco. En la sección <strong>Herramientas</strong> del panel de la derecha hay un control marcado <strong>Marco</strong>, y el inspector de objetos lleva el mismo interruptor bajo <strong>Superposiciones</strong>. Elegir un cuerpo deja ese cuerpo en reposo y reexpresa todo lo demás, estelas incluidas, en torno a él.\n\nLas estelas son la parte que merece la pena observar. No se deslizan por la pantalla; se redibujan como la trayectoria que ese marco habría visto, usando dónde estaba el cuerpo de origen en el momento en que se registró cada punto.',
      tip: 'Esto no es lo mismo que el Modo Seguimiento de los Ajustes. El Modo Seguimiento mueve la cámara y deja el dibujo en paz. Cambiar el marco cambia el dibujo.',
    },
    {
      title: 'Qué están haciendo las estelas',
      body: 'Un detalle importa para fiarte de lo que estás a punto de ver.\n\nCuando cambias el marco, las estelas no se deslizan lateralmente por la pantalla. Cada punto de una estela se registró en un momento concreto, y cada uno se reexpresa respecto a dónde estaba el cuerpo de origen <em>en ese momento</em>. Deslizar el dibujo entero lo movería sin cambiar su forma; esto cambia la forma, porque eso es lo que habría dibujado un observador distinto.\n\nLa diferencia es exactamente por lo que el Modo Seguimiento, que sí desliza la cámara, nunca te mostró un bucle retrógrado.\n\nUn punto más antiguo que el propio historial registrado del cuerpo de origen no puede reexpresarse en absoluto, y no se dibuja. Así que un sistema recién reconstruido no tiene bucle todavía: la estela tiene que crecer primero.',
      tip: 'La estela guarda aquí unos 110 días de historia, algo más que un episodio retrógrado completo. Es deliberado: bastante más corta y el bucle no se cierra nunca.',
    },
    {
      title: 'Ponte en la Tierra',
      body: 'Pulsa la <strong>Tierra</strong>, y después activa su <strong>Sistema de referencia</strong> en el inspector. O usa <strong>Herramientas &gt; Marco</strong> y elige el objeto seleccionado.\n\nDale medio minuto. La estela tiene que redibujarse a lo largo de una buena fracción de los 780 días que calculaste antes de que aparezca el bucle, y puede que tengas que esperar a que la Tierra llegue a la oposición.',
      checklist: [
        'La Tierra está ahora inmóvil en el centro de la vista',
        'El Sol ya no está en reposo: rodea la Tierra una vez al año',
        'La estela de Marte ya no es un círculo alrededor del Sol',
        'En algún lugar de la estela de Marte hay un pico o un bucle donde se dobla sobre sí misma',
      ],
    },
    {
      title: 'Esa es la observación',
      body: 'El bucle de tu pantalla no es un modelo de nada. Es lo que dicen las posiciones registradas, reexpresadas respecto a un origen distinto, y es lo que la gente ve realmente cuando observa Marte.\n\nCada punto de esa estela es un lugar donde Marte estuvo de verdad, en una simulación en la que Marte no frenó ni dio la vuelta ni una sola vez. La inversión es enteramente una afirmación sobre dónde estaba situado el observador.\n\nFíjate en lo que no cambió al accionar el interruptor. Los periodos orbitales son los mismos. Las distancias al Sol son las mismas. Todas las fuerzas son las mismas. Si vuelves al marco del mundo el bucle desaparece y regresan los círculos, y cambiando de marco otra vez vuelve. No se creó ni se destruyó nada; el mismo movimiento se describió dos veces.',
    },
    {
      title: 'Atrapa la inversión',
      body: 'La imagen muestra el bucle; ahora ponle un número. Con el marco de la Tierra todavía activo y Marte seleccionado, el inspector muestra <strong>Dirección desde la Tierra</strong> en grados. Ese único número es lo observable: es la dirección a la que apuntarías, y lo que un astrónomo antiguo registraba contra las estrellas fijas.\n\nDéjalo correr y vigila ese número. La mayor parte del tiempo sube de manera constante. Anótalo, espera, anótalo otra vez, y sigue hasta que atrapes una lectura <em>menor</em> que la anterior. Pulsa <strong>Espacio</strong> para pausar cuando quieras leer con cuidado.\n\nEl contador de días está en la línea temporal de la parte inferior de la pantalla.',
      fields: [
        { label: 'Dirección desde la Tierra, primera lectura', unit: '°' },
        { label: 'Día de esa lectura', unit: 'días' },
        { label: 'Dirección, una lectura que fue hacia atrás', unit: '°' },
        { label: 'Día de esa lectura', unit: 'días' },
      ],
    },
    {
      title: 'Lo más cerca y lo más lejos',
      body: 'Mantén Marte seleccionado y vigila en su lugar la <strong>Distancia a la Tierra</strong>. A diferencia de la dirección, esta tiene un valor mínimo claro y uno máximo claro.\n\nAnota lo más cerca que llega Marte de la Tierra y lo más lejos que se aleja. Tendrás que dejarlo correr por una buena parte de un periodo sinódico para ver ambos.',
      fields: [
        { label: 'Lo más cerca que llega Marte de la Tierra', unit: 'UA' },
        { label: 'Lo más lejos que se aleja Marte de la Tierra', unit: 'UA' },
        { label: 'Máxima ÷ mínima', unit: '' },
      ],
    },
    {
      title: 'Brillante y hacia atrás a la vez',
      body: 'Tus dos distancias difieren en un factor de unos tres. El brillo decae como el cuadrado de la distancia, así que un factor tres en distancia es un factor de unos nueve en brillo.\n\nAhora recuerda cuándo la dirección iba hacia atrás.',
      prompt: 'En esta simulación, Marte está más cerca de la Tierra…',
      options: [
        'en un punto aleatorio sin relación con el bucle retrógrado',
        'al mismo tiempo que el bucle retrógrado, porque ambos ocurren cuando la Tierra lo adelanta',
        'cuando Marte está en el lado de su propia órbita opuesto al Sol',
        'dos veces por bucle retrógrado, una en cada extremo',
      ],
      because:
        'El máximo acercamiento y el movimiento retrógrado son el mismo suceso visto de dos maneras: ambos ocurren cuando la Tierra adelanta a Marte por dentro. Así que Marte alcanza su máximo brillo en nuestro cielo precisamente mientras se mueve hacia atrás. En la imagen heliocéntrica eso es forzoso. En una epicíclica es un hecho extra que hay que apañar, y Ptolomeo lo apañó, poniendo el planeta en el lado cercano de su epiciclo durante el bucle. Funciona, pero es otra cosa que hay que decirle al modelo en vez de algo que él prediga.',
    },
    {
      title: '¿Cuándo invierte la marcha?',
      body: 'Compara tus dos medidas. La dirección fue hacia atrás en algún punto, y la distancia tuvo un mínimo en algún punto. Piensa dónde está la Tierra respecto a Marte cuando ocurre cada una de esas cosas.',
      prompt: 'Marte parece moverse hacia atrás…',
      options: [
        'cuando Marte está más lejos de la Tierra, al otro lado del Sol',
        'cuando la Tierra pasa entre el Sol y Marte, en su máximo acercamiento',
        'a intervalos aleatorios, sin relación con la geometría',
        'siempre que Marte está en el punto más lejano de su propia órbita',
      ],
      because:
        'La inversión ocurre en la oposición, cuando la Tierra adelanta a Marte por la pista interior. Es también cuando ambos están más cerca, y por eso Marte alcanza su máximo brillo durante un bucle retrógrado. La coincidencia de «más brillante» y «moviéndose hacia atrás» se conocía desde hacía dos mil años antes de que nadie tuviera una explicación que uniera las dos, y en un modelo geocéntrico es una coincidencia: nada de un epiciclo exige que el planeta esté más cerca mientras traza el bucle.',
    },
    {
      title: 'Adelantar por dentro',
      body: 'El mecanismo es el que conoces de una autopista.\n\nVas por el carril rápido, adelantando a un camión. Al acercarte por detrás, está delante de ti y avanza despacio contra las colinas del fondo. Al ponerte a su altura y pasarlo, el camión se desliza hacia atrás contra esas colinas, aunque siga conduciendo hacia delante a ciento diez. Una vez que lo has dejado bien atrás, se queda rezagado y empieza a avanzar otra vez.\n\nEl camión no invirtió la marcha nunca. Tú lo adelantaste.\n\nLa Tierra le hace exactamente esto a Marte cada 780 días. La Tierra está en la pista interior y se mueve más rápido, así que alrededor de la oposición lo rebasa, y durante esas diez semanas Marte se desliza hacia atrás contra las estrellas fijas. Marte no hace nada inusual en todo ese tiempo.',
      tip: 'Las estrellas fijas son las colinas. Fíjate en que el fondo estrellado de la simulación no se mueve al cambiar de marco: los objetos tan lejanos no se desplazan cuando lo hace el observador, y por eso son un buen fondo contra el que medir.',
    },
    {
      title: 'Dilo con tus palabras',
      body: 'Has medido ambas órbitas, has visto el bucle dibujarse solo y has visto en qué punto de la geometría ocurre.',
      prompt:
        'En dos o tres frases, explica por qué Marte parece invertir su marcha, sin decir nada sobre lo que Marte hace de distinto durante esas semanas.',
      rubric:
        'Una buena respuesta dice que Marte se mueve de manera constante todo el tiempo, y que la inversión la produce el propio movimiento del observador: la Tierra está en una órbita más pequeña y más rápida, y cerca de la oposición adelanta a Marte, de modo que la dirección de la Tierra a Marte gira hacia atrás contra las estrellas lejanas. Se valora nombrar la oposición, conectarla con el paso de la Tierra entre el Sol y Marte, y señalar que eso hace además que Marte esté más cerca y más brillante en ese momento. Una respuesta en la que Marte frena, se detiene o es arrastrado hacia atrás ha perdido el sentido de la lección.',
    },
    {
      title: 'Lo que costó explicar esto',
      body: 'En un modelo donde la Tierra está quieta en el centro y todo la rodea, el movimiento retrógrado es un rompecabezas de verdad. Se supone que los planetas se mueven sobre círculos a velocidad constante. Este se detiene y va hacia atrás.\n\nLa respuesta, refinada a lo largo de siglos y fijada por Ptolomeo hacia el 150 d. C., fue el <em>epiciclo</em>: el planeta cabalga sobre un círculo pequeño cuyo centro cabalga sobre el grande. Acierta con los dos tamaños y las dos velocidades y la trayectoria combinada traza un bucle, en los momentos correctos y del tamaño correcto. Funcionaba. Predijo posiciones planetarias lo bastante bien como para usarse durante mil cuatrocientos años.\n\nTambién necesitaba un epiciclo por planeta, más un <em>excéntrico</em> descentrado para arreglar los tiempos, más un punto <em>ecuante</em> respecto al cual el movimiento era uniforme en vez de respecto al centro. Tres artificios distintos, ajustados planeta a planeta, para reproducir algo que ninguno de ellos por separado explicaba.',
      quote: {
        text: 'Si se supone que el Sol es el centro, las retrogradaciones de los planetas se siguen por necesidad.',
        by: 'Nicolás Copérnico, De revolutionibus, 1543',
      },
    },
    {
      title: 'Qué estaba siguiendo en realidad el epiciclo',
      body: 'En el modelo de Ptolomeo cada planeta necesita su propio epiciclo, con su propio tamaño y su propio periodo. Para Marte, Júpiter y Saturno esos periodos de epiciclo salen todos iguales a algo que ya has calculado.',
      prompt:
        'El periodo del epiciclo de cada planeta exterior resulta ser igual a…',
      options: [
        'el periodo orbital de ese mismo planeta',
        'un año terrestre, para todos y cada uno de ellos',
        'la distancia del planeta al Sol, en años',
        'un número distinto para cada uno, sin nada en común',
      ],
      because:
        'El epiciclo de todo planeta exterior tarda exactamente un año. Ptolomeo lo sabía y lo dejó registrado; el modelo no da ninguna razón para ello. En la imagen heliocéntrica la razón es inmediata: el epiciclo no es el movimiento del planeta en absoluto, es el de la Tierra, reflejado sobre la trayectoria aparente del planeta. Tres planetas sin relación compartiendo un periodo es la clase de coincidencia que debería hacerte sospechar de un modelo, y es el hecho concreto que señaló Copérnico.',
    },
    {
      title: 'Contando la maquinaria',
      body: 'El modelo de Ptolomeo necesitaba, para cada uno de los cinco planetas visibles, un círculo deferente, un epiciclo montado sobre él, un desplazamiento excéntrico para el centro del deferente y un punto ecuante para los tiempos. Cuatro artificios por planeta.\n\nCuenta los artificios necesarios solo para los cinco planetas errantes, dejando fuera el Sol y la Luna.',
      prompt:
        '¿Cuántos artificios geométricos distintos son, para cinco planetas?',
      unit: 'artificios',
      because:
        'Veinte, cada uno ajustado por separado contra la observación. Ninguno de ellos es exactamente erróneo: el modelo reproducía el cielo con aproximadamente la precisión de una medida a simple vista y se mantuvo en uso durante catorce siglos. Lo que nunca hizo fue explicar por qué los cinco epiciclos debían tener los periodos que tienen. El heliocentrismo sustituye los veinte artificios por un solo hecho sobre el observador, y obtiene gratis el epiciclo de un año.',
    },
    {
      title: '¿Y qué pasa con el Sol?',
      body: 'Quédate en el marco de la Tierra. Has observado Marte, que traza bucles. Ahora piensa en qué hace el Sol cuando se mide respecto a la Tierra.\n\nComprométete antes de mirar.',
      prompt: 'Vista desde la Tierra, la trayectoria del Sol es…',
      options: [
        'un bucle con un pico, como la de Marte',
        'un círculo cerrado simple, una vez al año, sin inversión',
        'una línea recta, porque el Sol no orbita nada',
        'inmóvil, porque el Sol es el centro del sistema',
      ],
      because:
        'Un círculo limpio, una vez al año. El Sol nunca va retrógrado visto desde la Tierra, y ese es el hecho observacional que separa al Sol de los planetas en todos los esquemas antiguos. La razón es que la órbita de la Tierra es la órbita aparente del Sol: no hay un tercer movimiento que interfiera con ella. Los bucles pertenecen a cuerpos cuyo movimiento propio tiene que combinarse con el de la Tierra.',
    },
    {
      title: 'Hazlo con el Sol',
      body: 'Mantén activo el marco de la Tierra y observa el <strong>Sol</strong> en lugar de Marte.\n\nEn este marco el Sol da la vuelta a la Tierra una vez al año, sobre un círculo casi perfecto. Eso no es un error ni una concesión: medido respecto a la Tierra, el Sol da la vuelta de verdad una vez al año, y eso es exactamente lo que parece el cielo.',
      checklist: [
        'El Sol traza un círculo cerrado alrededor de la Tierra una vez al año',
        'La trayectoria del Sol no tiene ningún bucle ni ningún pico',
        'Vuelve al marco del mundo y el Sol deja de moverse por completo',
        'Cambia al marco propio del Sol y ahora es la Tierra la que da vueltas',
      ],
    },
    {
      title: '¿Cuál se mueve?',
      body: 'Ya has visto los mismos tres cuerpos en dos marcos. En uno el Sol está quieto y la Tierra gira a su alrededor. En el otro la Tierra está quieta y el Sol gira alrededor de ella. Ambas imágenes salieron de la misma simulación, con las mismas fuerzas, y ninguna fue retocada.',
      prompt: 'Con solo lo que has visto hasta ahora…',
      options: [
        'la imagen heliocéntrica queda demostrada, porque en ella el bucle desaparece',
        'la imagen geocéntrica queda demostrada, porque eso es lo que observamos',
        'ninguna queda demostrada: ambos marcos describen el mismo movimiento, y el bucle solo te dice que el observador se mueve',
        'la pregunta carece de sentido, porque el movimiento es totalmente arbitrario',
      ],
      because:
        'El bucle retrógrado establece que el observador se mueve respecto a Marte. No establece por sí solo qué está en el centro. Ambas descripciones reproducen la observación, que es precisamente por lo que la discusión duró tanto. Lo que acabó zanjándola no fue este bucle: fue que la imagen heliocéntrica explica el epiciclo de un año sin que se lo digan, ordena los planetas por distancia de manera coherente con sus periodos, y predice el paralaje estelar, que por fin se midió en 1838. La última opción se pasa al otro extremo: los marcos no son arbitrarios, porque solo algunos son inerciales, y elegir el equivocado mete en tus ecuaciones fuerzas que ningún objeto ejerce.',
    },
    {
      title: 'Los marcos no son todos iguales',
      body: 'Elegir un marco es gratis, pero no está libre de consecuencias.\n\nEn el marco de la Tierra el Sol rodea la Tierra una vez al año. Nada hay de malo en esa descripción, pero si ahora preguntas qué fuerza curva al Sol sobre ese círculo, te quedas atascado: la gravedad de la Tierra no basta ni de lejos para mantener en órbita a un cuerpo un tercio de millón de veces más masivo. Para que las ecuaciones funcionen en ese marco hay que añadir fuerzas ficticias, que no las ejerce nada y existen solo para dar cuenta de la aceleración del propio marco.\n\nEn el marco del Sol no hacen falta. Ese es el argumento de verdad a favor del heliocentrismo, y es de Newton más que de Copérnico: el marco en el que la descripción es más simple, y en el que toda fuerza puede rastrearse hasta una masa, es aquel en el que merece la pena construir la física.\n\nEstrictamente, el Sol tampoco está en reposo. Orbita el baricentro del Sistema Solar, que es lo que te muestra la opción <strong>Baricentro</strong> del mismo menú.',
      tip: 'Pruébalo: cambia el Marco a Baricentro. Para este sistema de tres cuerpos el baricentro cae casi exactamente sobre el Sol, porque el Sol acapara esencialmente toda la masa.',
    },
    {
      title: 'Qué lo zanjó de verdad',
      body: 'Si el bucle no decide entre las dos imágenes, ¿qué lo hizo?\n\nLos argumentos del propio Copérnico eran de economía: una Tierra en movimiento en lugar de cinco epiciclos, y una ordenación de los planetas por distancia que por fin encajaba con sus periodos. Buenas razones, no una demostración, y su modelo no era más preciso que el de Ptolomeo porque conservó los círculos.\n\nLa predicción decisiva era el <em>paralaje estelar</em>. Si la Tierra recorre de verdad 2 UA por el espacio cada seis meses, entonces las estrellas cercanas deben desplazarse levísimamente respecto a las más lejanas a lo largo del año. Tycho Brahe buscó exactamente esto, no encontró nada, y concluyó correctamente que o bien la Tierra no se mueve o bien las estrellas están imposiblemente lejos. Eligió lo primero.\n\nSe equivocó en cuál, y acertó en que ese era el ensayo. Las estrellas están imposiblemente lejos: el mayor paralaje de cualquier estrella es de 0,77 segundos de arco, aproximadamente el ancho de una moneda vista a cinco kilómetros. Se midió por fin en 1838, tres siglos después de Copérnico.',
    },
    {
      title: 'Por qué Tycho no encontró nada',
      body: 'Los instrumentos de Tycho eran los mejores del mundo antes del telescopio, precisos hasta cerca de un minuto de arco. El mayor paralaje estelar es de 0,77 segundos de arco, y un minuto de arco son sesenta segundos de arco.',
      prompt: 'Que Tycho no detectara el paralaje demuestra que…',
      options: [
        'la Tierra no se mueve, exactamente como él concluyó',
        'sus medidas eran descuidadas',
        'el efecto era unas ochenta veces menor que su mejor precisión, así que un resultado nulo era el único desenlace posible',
        'el paralaje no existe',
      ],
      because:
        'Un resultado nulo obtenido con un instrumento ochenta veces demasiado tosco no te dice nada sobre el efecto. El razonamiento de Tycho era sólido y sus datos excelentes; lo que le faltaba era alguna manera de saber a qué distancia estaban las estrellas, así que no podía distinguir un efecto pequeño de uno ausente. Este es un peligro general que merece la pena llevarse de la lección: una medida que no encuentra nada restringe una teoría solo cuando sabes qué habría podido detectar esa medida.',
    },
    {
      title: '¿Cuánto dura un bucle?',
      body: 'Una última medida, y es una predicción que puedes comprobar contra el cielo real.\n\nCon el marco de la Tierra activo y Marte seleccionado, vigila la <strong>Dirección desde la Tierra</strong> y anota el día en que el número empieza a bajar y el día en que vuelve a subir. La diferencia entre ambos es la duración del episodio retrógrado.',
      fields: [
        { label: 'Día en que la dirección empieza a bajar', unit: 'días' },
        { label: 'Día en que vuelve a subir', unit: 'días' },
        { label: 'Duración del episodio retrógrado', unit: 'días' },
      ],
    },
    {
      title: '¿Marte o Júpiter?',
      body: 'Júpiter está a 5,2 UA y tarda 11,9 años en dar la vuelta. Usa la fórmula sinódica con la Tierra y Júpiter: 1/S = 1/365 − 1/4333.',
      prompt:
        'Comparados con los de Marte, los bucles retrógrados de Júpiter ocurren…',
      options: [
        'con menos frecuencia, porque Júpiter está mucho más lejos',
        'con más frecuencia, aproximadamente una vez por año terrestre, porque Júpiter apenas se ha movido mientras la Tierra da la vuelta',
        'al mismo intervalo, ya que ambos son planetas exteriores',
        'nunca: solo Marte muestra movimiento retrógrado',
      ],
      because:
        'El periodo sinódico de Júpiter es de 399 días, apenas más que un año terrestre, así que va retrógrado casi todos los años. El de Saturno es de 378 días y el de Neptuno de 367. Cuanto más lejos está un planeta, menos se mueve mientras la Tierra le saca una vuelta, así que el periodo sinódico converge a un año: en el límite el bucle es puramente la propia órbita de la Tierra, reflejada. Ese límite es el mismo hecho que el epiciclo de un año de dos pasos atrás, alcanzado desde la otra dirección.',
    },
    {
      title: 'Lo que has hecho',
      body: 'Has medido dos periodos orbitales y has calculado un periodo sinódico a partir de ellos. Has predicho qué aspecto tendría un planeta visto desde un observador en movimiento, después has cambiado el marco y has visto cumplirse la predicción. Has situado la inversión en la oposición, la has ligado a la geometría del adelantamiento, y has encontrado el epiciclo de un año que un modelo geocéntrico tiene que aceptar como una coincidencia.\n\nLa simulación estuvo haciendo exactamente una cosa todo el tiempo: dos planetas en órbitas circulares, bajo una fuerza del inverso del cuadrado ejercida por una estrella. Todos los bucles, picos e inversiones salieron de restar la posición de un cuerpo a la de otro.\n\nEso merece la pena conservarlo más allá de esta lección. Muchísimas cosas que parecen anomalías en el cielo resultan ser afirmaciones sobre dónde está situado el observador, y la primera pregunta que hay que hacerle a un movimiento extraño es siempre: ¿medido contra qué?',
    },
  ],
};
