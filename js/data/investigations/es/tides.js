// =============================================================================
// tides - es
// -----------------------------------------------------------------------------
// A shadow of ../tides.js carrying only its words. Laid over the English lesson
// by mergeTranslation() in ../i18n.js, so anything absent here keeps its
// English and nothing here can reach the lesson's machinery: no scenario name,
// no seed, no widget id, no numeric answer, no probe.
//
// Arrays line up by index with the English. `null` means "not translated";
// that entry keeps its English.
// =============================================================================

export default {
  title: 'Mareas',
  subtitle:
    'Estira un mundo, mueve una luna y descubre por qué la gravedad puede desgarrar objetos',
  duration: '35-45 min',
  level: 'Astronomía introductoria',
  summary:
    'Las mareas no las causa una gravedad intensa. Las causa que la gravedad sea desigual a lo largo de un objeto, y toda la lección se construye sobre esa única resta: quita la atracción sobre el centro a la atracción sobre el lado cercano y el lado lejano, y todo, desde las dos pleamares diarias hasta una estrella desgarrada por un agujero negro, sale de lo que queda.',
  objectives: [
    'Explicar por qué un objeto extenso siente una atracción gravitatoria distinta en cada uno de sus puntos',
    'Enunciar que una marea es la diferencia entre la atracción local y la atracción sobre el centro, y usarlo para decir por qué hay dos abultamientos oceánicos y no uno',
    'Medir cómo cambia la intensidad de marea con la separación y con la masa del compañero, y enunciar ambas relaciones',
    'Comparar la marea que un cuerpo levanta con la gravedad propia de ese cuerpo, y predecir si se mantendrá unido',
    'Explicar por qué el límite de Roche es distinto para cada par de objetos, y decir qué predice y qué no',
  ],
  steps: [
    {
      title: 'Dos veces al día, en todas partes',
      body: 'Ponte en casi cualquier costa y el mar sube y baja aproximadamente dos veces al día. No una. Dos.\n\nEse «dos» es todo el rompecabezas. La Luna está a un lado de la Tierra en cada momento, y el océano se abulta en <em>ambos</em> lados a la vez: hay una pleamar bajo la Luna y otra pleamar en la cara opuesta del planeta, a doce mil kilómetros de ella. Cualquier explicación que se reduzca a «la Luna atrae el agua hacia sí» predice un solo abultamiento y por tanto es errónea.\n\nEn pantalla está el sistema Tierra-Luna real: la Tierra en el centro y la Luna, <strong>Luna</strong>, en su órbita de 27,3 días. La simulación es newtoniana y sin más artificios, y resulta que eso es todo lo que hace falta. Nada en esta lección exige una fuerza que no esté ya en esa imagen. Lo que exige es una resta.',
      tip: 'Mientras una lección está en marcha, pulsar selecciona un objeto sin abrir la ficha del inspector, y la colocación de objetos nuevos queda desactivada para que un clic accidental no altere el sistema que estás midiendo.',
    },
    {
      title: '¿Es la atracción la misma en todas partes?',
      body: 'La Tierra no es un punto. Es una bola de 12 742 km de diámetro, y el lado que mira a la Luna está 12 742 km más cerca de la Luna que el lado opuesto.\n\nLa gravedad se debilita con la distancia. Comprométete con una respuesta antes de que te muestren nada.',
      prompt: 'La atracción gravitatoria de la Luna sobre la Tierra es…',
      options: [
        'exactamente igual de intensa en todos los puntos de la Tierra',
        'más intensa en el lado que mira a la Luna que en el lado opuesto',
        'más intensa en el lado opuesto, porque tiene que llegar más lejos',
        'sentida solo en el centro de la Tierra, donde se considera concentrada toda la masa',
      ],
      because:
        'Más intensa en el lado cercano. La gravedad decae con la distancia, y el lado cercano está de verdad más cerca, así que de verdad es atraído con más fuerza. La última opción es una media verdad genuinamente útil: la gravedad propia de la Tierra puede tratarse como si viniera de su centro, y para calcular la órbita de la Tierra la Luna también. Pero la Tierra está siendo atraída por algo exterior a ella, y para eso la diferencia entre una parte de la Tierra y otra es toda la historia.',
    },
    {
      title: 'Tres puntos, tres atracciones',
      body: 'El panel muestra la Tierra con una flecha saliendo de tres lugares: el <strong>lado cercano</strong>, el <strong>centro</strong> y el <strong>lado lejano</strong>. El compañero está a la derecha, así que todas las flechas apuntan a la derecha.\n\nCada flecha está dibujada en proporción real respecto a las demás. Míralas. A la distancia real de la Luna parecen idénticas, y eso no es un fallo del dibujo: la Tierra es pequeña comparada con 384 400 km, así que las tres distancias son casi iguales y las tres atracciones son casi iguales.\n\nAhora lee los tres números de debajo de la imagen. No son iguales.',
      tool: {
        title: 'La atracción sobre tres puntos de la Tierra',
        note: 'La distancia está en unidades de la distancia real de la Luna. Déjala en 1,00 por ahora: este es el sistema Tierra-Luna real.',
      },
      tip: 'Baja la distancia hacia 0,2 y observa cómo las tres flechas dejan de parecerse. Devuélvela a 1,00 antes de seguir.',
    },
    {
      title: '¿Cuánto se diferencian?',
      body: 'Lee las tres aceleraciones en el panel de la pantalla anterior, o vuelve a poner aquí la distancia en 1,00 y léelas otra vez. El lado cercano es el más atraído, el lejano el menos, y el centro queda entre ambos.',
      prompt:
        'A la distancia real de la Luna, la atracción sobre el lado cercano supera a la del lado lejano en aproximadamente…',
      options: [
        'un factor de dos',
        'un factor de diez',
        'alrededor de un siete por ciento',
        'nada medible: son idénticas',
      ],
      because:
        'Alrededor de un siete por ciento. Es una diferencia diminuta, y es la causa entera de todas las mareas oceánicas de la Tierra. Quédate con lo pequeña que es: una variación del siete por ciento en una atracción que a su vez es solo una trescientosmilésima parte de la gravedad superficial de la Tierra. Las mareas son un residuo pequeño de una cantidad pequeña, y por eso los mares se mueven unos metros en lugar de ser arrancados del planeta.',
      tool: {
        title: 'Lee otra vez los tres números',
        note: 'Lado cercano, centro, lado lejano. La última fila hace la comparación por ti.',
      },
    },
    {
      title: 'Entonces, ¿por qué dos abultamientos?',
      body: 'Todo lo que has visto hasta ahora apunta en un sentido: hacia la Luna. El lado cercano es atraído hacia la Luna, el centro es atraído hacia la Luna, el lado lejano es atraído hacia la Luna. Nada, en ningún sitio, es atraído en sentido contrario.\n\nY sin embargo hay una pleamar en la cara opuesta de la Tierra, al mismo tiempo que la que hay bajo la Luna. Comprométete con una explicación.',
      prompt: 'El abultamiento del lado lejano existe porque…',
      options: [
        'la Luna empuja el lado lejano de la Tierra',
        'la fuerza centrífuga del giro de la Tierra lanza el agua hacia fuera allí',
        'el lado lejano es atraído hacia la Luna menos que la Tierra en conjunto, así que se queda rezagado',
        'el agua desplazada del lado cercano tiene que ir a alguna parte',
      ],
      because:
        'El lado lejano se queda rezagado. Nadie lo empuja: es atraído hacia la Luna como todo lo demás, solo que menos que la media, así que respecto a la Tierra en conjunto se rezaga en el lado lejano. Esa es la respuesta, y la pantalla siguiente muestra la aritmética que la produce. La opción del giro es un relato común y tenaz, y conviene dejar claro que no es la causa: los dos abultamientos están ahí también para una Tierra que no rotara, y la rotación de la Tierra es lo que te lleva a través de ellos dos veces al día, no lo que los crea.',
    },
    {
      title: 'Quita el centro',
      body: 'Aquí está el movimiento que hace que las mareas cobren sentido.\n\nLa Tierra en conjunto está en caída libre alrededor del centro de masas Tierra-Luna. Se acelera al ritmo que dicta la atracción sobre su <em>centro</em>, y arrastra a ese ritmo todo lo que hay en ella: a ti, a los mares, a las rocas. Lo que puedes sentir no es la atracción. Es la diferencia entre la atracción donde estás y la atracción que arrastra al planeta entero.\n\nAsí que resta la atracción del centro a las tres. El panel muestra ahora ambas filas: las atracciones en crudo arriba, y debajo lo que queda tras la resta.\n\n<strong>Lado cercano:</strong> atraído con más fuerza que la media, así que lo que queda apunta hacia la Luna.\n\n<strong>Centro:</strong> exactamente la media, así que no queda nada. Un punto.\n\n<strong>Lado lejano:</strong> atraído con menos fuerza que la media, así que lo que queda apunta <em>en dirección contraria</em> a la Luna.\n\nEstirada por ambos extremos. Dos abultamientos, a partir de una sola atracción, por una resta.',
      tool: {
        title: 'Las atracciones, y lo que queda al quitar el centro',
        note: 'La fila de abajo está dibujada mucho más grande que la de arriba, y el panel dice cuánto. Dibujada a la misma escala sería invisible, que es exactamente por lo que la resta hay que hacerla y no mirarla.',
      },
      tip: 'No se ha añadido nada nuevo entre las dos filas. La fila de abajo es la de arriba menos un número.',
    },
    {
      title: 'Qué significa la flecha del lado lejano',
      body: 'En la fila de abajo, la flecha del lado lejano apunta en dirección contraria a la Luna. Eso es lo que más merece la pena entender bien de toda esta lección, así que conviene enunciarlo con cuidado.',
      prompt:
        'La flecha del lado lejano, que apunta hacia fuera, significa que…',
      options: [
        'la gravedad de la Luna invierte su dirección en el lado lejano de la Tierra',
        'el lado lejano sigue siendo atraído hacia la Luna, pero menos que el centro de la Tierra',
        'una segunda fuerza, distinta de la gravedad, actúa sobre el lado lejano',
        'el lado lejano está fuera del alcance de la Luna',
      ],
      because:
        'Sigue siendo atraído hacia la Luna, solo que menos que la media. La gravedad nunca se invierte y nunca se apaga; no hay ninguna segunda fuerza. La flecha hacia fuera es un resultado contable, no un empujón: es lo que queda después de restar la aceleración que comparte el planeta entero. Si te empeñas en describir las mareas sin restar el centro, te quedas con un solo abultamiento y una costa que te lleva la contraria dos veces al día.',
      tool: {
        title: 'Las dos filas otra vez',
        note: 'Compara las flechas del lado lejano en ambas filas. Arriba apunta hacia el compañero. Abajo, tras la resta, apunta en sentido contrario.',
      },
    },
    {
      title: 'Qué es realmente una marea',
      body: 'Una definición que merece la pena memorizar, porque es corta y es toda la materia:\n\n<strong>Una marea es la diferencia de aceleración gravitatoria a lo largo de un objeto.</strong>\n\nNo la intensidad de la gravedad. La <em>diferencia</em> en ella. Esta distinción hace trabajo de verdad. Ahora mismo el Sol tira de ti unas 180 veces más fuerte que la Luna: el Sol es enormemente más masivo. Y sin embargo la Luna levanta la marea oceánica mayor, por más de un factor dos. La gravedad intensa y las mareas intensas sencillamente no son lo mismo, y medirás por qué en unas pantallas.\n\nLa misma diferencia actúa allí donde la gravedad se encuentra con algo que tiene tamaño: los mares subiendo por una playa, una luna mantenida fundida a base de amasarla, un cometa que se deshace en una hilera de fragmentos, y una estrella estirada en un reguero alrededor de un agujero negro. Un mecanismo, y ya lo has visto entero.',
      quote: {
        text: 'Las aguas del mar suben dos veces y bajan dos veces en el espacio de un día lunar, y las mayores mareas ocurren a la tercera hora tras el paso de los luminares por el meridiano del lugar.',
        by: 'Isaac Newton, Principia, Libro III, 1687',
      },
      tip: 'Newton acertó con los dos abultamientos en 1687, en el mismo libro que introdujo la gravitación universal. Fue una de las primeras cosas que explicó su teoría y que ninguna anterior podía.',
    },
    {
      title: 'Acerca el compañero',
      body: 'Están a punto de darte un deslizador de distancia, y una gráfica que registra lo que leas en él. Antes de tocar ninguno de los dos, comprométete.\n\nSupón que la Luna se moviera a la mitad de su distancia actual de la Tierra, sin cambiar nada más.',
      prompt: 'A la mitad de distancia, la marea que levanta la Luna sería…',
      options: [
        'el doble de intensa',
        'cuatro veces más intensa',
        'ocho veces más intensa',
        'igual, porque la masa de la Luna no ha cambiado',
      ],
      because:
        'Ocho veces. La mayoría dice cuatro, razonando a partir de la ley del inverso del cuadrado, y ese razonamiento es correcto para la atracción en sí: reduce la distancia a la mitad y la atracción se cuadruplica. Pero una marea es una diferencia entre dos atracciones, y acercarse hace que las distancias cercana y lejana difieran en una fracción mayor además de hacer más intensas ambas atracciones. Los dos efectos se componen. Estás a punto de medirlo.',
    },
    {
      title: 'Cuatro distancias',
      body: 'El panel informa del estiramiento de marea como un múltiplo de la marea lunar real, así que la Luna real marca 1,00 y todo lo demás se mide frente a ella.\n\nPon el deslizador en cada una de las cuatro distancias por turno y escribe lo que diga el panel. Tus puntos aparecen en la gráfica según escribes, así que no hay que recordar nada de una fila a la siguiente.',
      fields: [
        { label: 'Distancia 1', unit: '× la de la Luna', hint: '2' },
        {
          label: 'Estiramiento de marea allí',
          unit: '× marea lunar',
          hint: '0,13',
        },
        { label: 'Distancia 2', unit: '× la de la Luna', hint: '1' },
        {
          label: 'Estiramiento de marea allí',
          unit: '× marea lunar',
          hint: '1',
        },
        { label: 'Distancia 3', unit: '× la de la Luna', hint: '0,5' },
        {
          label: 'Estiramiento de marea allí',
          unit: '× marea lunar',
          hint: '8',
        },
        { label: 'Distancia 4', unit: '× la de la Luna', hint: '0,25' },
        {
          label: 'Estiramiento de marea allí',
          unit: '× marea lunar',
          hint: '64',
        },
      ],
      plot: {
        title: 'Tus cuatro lecturas',
        xLabel: 'distancia  (× la de la Luna)',
        yLabel: 'estiramiento  (× marea lunar)',
        transform: {
          label: 'Prueba 1 ÷ distancia³',
          xLabel: '1 ÷ distancia³',
          yLabel: 'estiramiento  (× marea lunar)',
        },
        note: 'En crudo, los puntos se alejan del eje con demasiada pendiente para ser una recta. Pulsa <strong>Prueba 1 ÷ distancia³</strong>: si la marea va de verdad como uno partido por la distancia al cubo, caerán sobre una recta que pasa por la esquina. Enderezar una curva eligiendo los ejes adecuados es la manera de identificar una relación en lugar de adivinarla.',
      },
      tool: {
        title: 'Lee aquí cada distancia',
        note: 'Pon el deslizador en 2, luego 1, luego 0,5, luego 0,25, y escribe cada lectura en las casillas. La masa del compañero se mantiene en la de la Luna.',
      },
      tip: 'Las cuatro distancias sugeridas son solo sugerencias. Sirven cuatro cualesquiera, siempre que cada intensidad se leyera a la distancia que tiene al lado.',
    },
    {
      title: '¿Con qué pendiente cae?',
      body: 'Mira las filas 2 y 3 de tu propia tabla: pasaste de 1,00 a 0,50 veces la distancia de la Luna, que es la mitad de la distancia.\n\nUna atracción corriente del inverso del cuadrado habría subido por cuatro. Una marea no es una atracción corriente.',
      prompt:
        '¿En qué factor aumentó el estiramiento de marea al reducir a la mitad la distancia?',
      unit: '×',
      because:
        'Ocho, que es dos al cubo. Reducirla otra vez a la mitad multiplica por ocho de nuevo: tu cuarta lectura, a un cuarto de la distancia de la Luna, debería ser unas 64 veces la marea lunar. La distancia entra tres veces, no dos: la marea va como uno partido por la separación al cubo. Por eso se endereza la gráfica transformada, y por eso los efectos de marea son casi siempre despreciables hasta que algo se acerca, y entonces de pronto dejan de serlo.',
      tool: {
        title: 'La curva que mediste',
        note: 'El punto es tu deslizador. Deslízalo de 1,00 a 0,50 y observa la lectura, si quieres comprobar el factor directamente.',
      },
    },
    {
      title: 'La relación, escrita',
      body: 'La has medido, así que aquí está en símbolos. No se te pide deducirla ni calcular con ella, solo reconocer las tres cosas que hay en ella.\n\nPara un cuerpo de radio <em>R</em> situado a una distancia <em>d</em> de un compañero de masa <em>M</em>, el estiramiento de marea a lo largo de él es aproximadamente\n\n<strong>2 G M R ÷ d³</strong>\n\nLéelo como tres afirmaciones que ya crees:\n\n<strong>M arriba.</strong> Un compañero más pesado te estira más. Lo comprobarás a continuación.\n\n<strong>R arriba.</strong> Un objeto más grande se estira más, porque sus dos extremos están más separados y por tanto difieren más. Un guijarro no siente prácticamente ninguna marea.\n\n<strong>d³ abajo.</strong> La que acabas de medir. La distancia importa muchísimo más que cualquier otra cosa de la expresión.\n\nUna salvedad honesta: esto es una aproximación, buena cuando el objeto es pequeño comparado con su distancia. Es excelente para la Luna sobre la Tierra, y empeora a medida que un cuerpo se acerca a algo. Más adelante en esta lección, donde eso importa, se usa la diferencia exacta.',
      tip: 'El 2 no es importante. Las tres letras y dónde están sí.',
    },
    {
      title: 'Ahora cambia el compañero',
      body: 'Devuelve la distancia a donde estaba y cambia la otra cosa. Comprométete antes de medir.\n\nSupón que la Luna conservara su órbita exactamente pero tuviera el doble de masa.',
      prompt: 'Con el doble de masa y la misma distancia, la marea sería…',
      options: [
        'igual',
        'el doble de intensa',
        'cuatro veces más intensa',
        'ocho veces más intensa',
      ],
      because:
        'El doble de intensa. La masa entra una sola vez, sin más: dóblala y la marea se dobla. Esto es mucho menos espectacular que la relación con la distancia, y ese contraste es el sentido de las siguientes pantallas. Dónde está un compañero importa enormemente más que lo pesado que sea.',
    },
    {
      title: 'Tres masas',
      body: 'La distancia se mantiene ahora en la distancia real de la Luna y el deslizador de masa es tuyo. Ponlo en cada valor por turno y anota lo que marque el panel.\n\nTres puntos bastan aquí, porque buscas una recta y tres puntos o la forman o no.',
      fields: [
        { label: 'Masa 1', unit: '× la de la Luna', hint: '1' },
        {
          label: 'Estiramiento de marea allí',
          unit: '× marea lunar',
          hint: '1',
        },
        { label: 'Masa 2', unit: '× la de la Luna', hint: '2' },
        {
          label: 'Estiramiento de marea allí',
          unit: '× marea lunar',
          hint: '2',
        },
        { label: 'Masa 3', unit: '× la de la Luna', hint: '4' },
        {
          label: 'Estiramiento de marea allí',
          unit: '× marea lunar',
          hint: '4',
        },
      ],
      plot: {
        title: 'Tus tres lecturas',
        xLabel: 'masa del compañero  (× la de la Luna)',
        yLabel: 'estiramiento  (× marea lunar)',
        note: 'Esta vez no se ofrece ninguna transformación, y no hace falta: si estos tres caen tal cual sobre una recta que pasa por la esquina, la relación es tan simple como puede serlo una relación.',
      },
      tool: {
        title: 'Lee aquí cada masa',
        note: 'Pon el deslizador en 1, luego 2, luego 4 veces la masa de la Luna. La distancia se mantiene en la distancia real de la Luna.',
      },
      tip: 'Si tus tres puntos forman una recta que pasa por la esquina de la gráfica en lugar de arrancar a media altura de un eje, las dos magnitudes son simplemente proporcionales.',
    },
    {
      title: 'Qué dice la gráfica de masas',
      body: 'Compara las dos gráficas que has hecho. Una se apartaba del eje con tanta pendiente que hubo que volver a representarla para que se enderezara. La otra no necesitó nada.',
      prompt: 'El estiramiento de marea que levanta un compañero es…',
      options: [
        'proporcional a su masa: doble masa, doble marea',
        'proporcional al cuadrado de su masa',
        'proporcional al cubo de su masa, como la relación con la distancia',
        'independiente de su masa una vez que está lo bastante lejos',
      ],
      because:
        'Simplemente proporcional. Ambas relaciones están ya en tus propios números: una potencia de masa arriba, tres potencias de distancia abajo. Por eso la respuesta a «qué levanta la marea más grande» casi nunca es «lo más pesado que hay cerca».',
    },
    {
      title: 'El Sol contra la Luna',
      body: 'Dos cuerpos levantan mareas medibles en la Tierra, y están tremendamente descompensados.\n\nEl <strong>Sol</strong> tiene unos 27 millones de veces la masa de la Luna, y está unas 390 veces más lejos.\n\nAhora conoces ambas relaciones. Una potencia de masa, tres potencias de distancia. Calcúlalo o adivínalo, pero comprométete.',
      prompt: 'La marea oceánica mayor de la Tierra la levanta…',
      options: [
        'el Sol, por un margen enorme, por su masa',
        'el Sol, pero solo por poco',
        'la Luna, por un factor de dos aproximadamente',
        'la Luna, por un factor de varios cientos',
      ],
      because:
        'La Luna, por algo más de dos. El Sol aporta 27 millones de veces la masa, lo que lo favorece en un factor de 27 millones. Está 390 veces más lejos, lo que le cuesta 390 al cubo, unos 59 millones. El término de la distancia gana, y gana aproximadamente por el factor dos que estás a punto de ver medido. Esta es la demostración más limpia de la astronomía de que una marea no es lo mismo que una atracción: el Sol tira de la Tierra unas 180 veces más fuerte que la Luna, y levanta menos de la mitad de marea.',
    },
    {
      title: 'Siete mareas reales en una escala',
      body: 'El panel lista siete parejas reales, con la marea que el primer cuerpo levanta en el segundo. Abarcan catorce potencias de diez, así que las barras se dibujan en una escala donde cada línea de rejilla es diez veces la anterior: la longitud de la barra cuenta ceros, no unidades.\n\nMueve el deslizador de selección por ellas y lee cada una.\n\n<strong>La Luna y el Sol sobre la Tierra.</strong> Tu predicción, medida: la Luna gana por 2,2. Cuando el Sol y la Luna se alinean, en luna nueva y llena, las dos mareas se suman y se obtienen las mareas <em>vivas</em>, inusualmente grandes; cuando forman ángulo recto la marea solar cancela en parte a la lunar y se obtienen las pequeñas mareas <em>muertas</em>. Las tablas de mareas costeras son esa suma, más una buena cantidad de costa local.\n\n<strong>La Tierra sobre la Luna.</strong> La misma separación, la otra dirección, y 22 veces más intensa, porque la Tierra tiene 81 veces la masa de la Luna. La misma física, leída al revés.\n\n<strong>Júpiter sobre Ío.</strong> Cinco mil veces la marea lunar. Ío es comprimida y liberada a medida que su órbita, ligeramente no circular, la lleva y la trae, y el rozamiento de ese amasado mantiene fundido su interior. Es el cuerpo volcánicamente más activo del Sistema Solar, y lo calienta una diferencia de gravedad.',
      tool: {
        title: 'Siete mareas reales',
        note: 'Recorre las siete con el selector. Las dos últimas son el mismo agujero negro a dos distancias distintas, que es la relación con la distancia haciendo su trabajo otra vez.',
      },
      tip: 'Las dos últimas filas solo difieren en la separación: cincuenta veces más cerca, y la marea es más de cien mil veces mayor. Cincuenta al cubo son 125 000.',
    },
    {
      title: 'El anclaje, y lo que esta simulación no hace',
      body: 'Siempre ves la misma cara de la Luna. Eso no es una casualidad ni una casualidad del ángulo de visión: la Luna gira sobre su eje exactamente una vez por órbita. Está <strong>anclada por mareas</strong>.\n\nEl mecanismo, a grandes rasgos. La Tierra levanta un abultamiento de marea en la Luna, como acabas de medir. Si la Luna girara a un ritmo distinto del orbital, ese abultamiento se arrastraría ligeramente fuera de la línea con la Tierra, y la atracción de la Tierra sobre el abultamiento desalineado actuaría como freno. El frenado continúa hasta que el giro coincide con la órbita y el abultamiento se queda quieto, momento en el que ya no hay nada que arrastrar. A la Tierra le está pasando lo mismo, más despacio: nuestro día se alarga unos 1,7 milisegundos por siglo, y la Luna se aleja 3,8 cm al año.\n\n<strong>Una nota honesta sobre el modelo.</strong> Esta es una explicación conceptual, no algo que esté ocurriendo en tu pantalla. Gravitas es una simulación newtoniana de N cuerpos: mueve masas puntuales bajo gravedad mutua. No deforma cuerpos, no modela el rozamiento interno que hace funcionar el frenado de marea, y no hace evolucionar la rotación por pares de marea. Todos los números de marea de esta lección se calculan a partir de las posiciones y masas de la imagen, lo cual es legítimo, y la deformación que se te muestra está dibujada, no simulada. Esa distinción merece conservarse.',
      tip: 'El anclaje por mareas es el resultado normal, no la excepción: la mayoría de las lunas grandes del Sistema Solar están ancladas a sus planetas, y Plutón y Caronte están anclados el uno al otro.',
    },
    {
      title: 'Dilo con tus palabras',
      body: 'A mitad de camino. Antes de que la lección pase de las mareas que mueven agua a las mareas que destruyen cosas, pon la idea central en una frase tuya.',
      prompt:
        '¿Por qué tiene la Tierra una pleamar en el lado opuesto a la Luna? Responde en una o dos frases, y ten cuidado con qué le hace qué a qué.',
      rubric:
        'El lado lejano es atraído hacia la Luna con menos fuerza que el centro de la Tierra, porque está más lejos. El planeta entero se acelera al ritmo que siente su centro, así que respecto a ese movimiento compartido el lado lejano se rezaga, produciendo un abultamiento que apunta en dirección contraria a la Luna. La puntuación completa exige la comparación con el centro, o una afirmación equivalente de que una marea es una diferencia. Respuestas erróneas frecuentes que hay que vigilar y no puntuar: que la Luna empuja el lado lejano; que la gravedad se invierte allí; que la rotación de la Tierra lanza el agua hacia fuera; que el agua desplazada del lado cercano tiene que ir a alguna parte. Puntuación parcial por «el lado lejano es atraído menos» sin decir menos que qué.',
    },
    {
      title: '¿Qué mantiene unida a una luna?',
      body: 'Todo lo anterior ha tratado de estirar. Nada se ha roto.\n\nSi una marea tira de los dos extremos de un cuerpo en sentidos opuestos, algo tiene que estar resistiendo, o todas las lunas del Sistema Solar se habrían deshecho ya. Para un cuerpo de tamaño decente, lo que resiste es la gravedad propia del cuerpo: cada parte de él tira de todas las demás, manteniéndolo hecho una bola.\n\nAsí que hay dos aceleraciones en la superficie de una luna, apuntando en sentidos opuestos, y cuál sea mayor lo decide todo.',
      prompt: 'Una luna será desgarrada por las mareas cuando…',
      options: [
        'la gravedad del planeta en la luna supere la gravedad superficial propia de la luna',
        'el estiramiento de marea a lo largo de la luna supere la gravedad superficial propia de la luna',
        'la velocidad orbital de la luna supere su velocidad de escape',
        'la luna pase por dentro de la atmósfera del planeta',
      ],
      because:
        'El estiramiento tiene que vencer al agarre. Fíjate bien en qué compara la primera opción: la atracción del planeta sobre la luna es siempre muchísimo mayor que la gravedad superficial propia de la luna, para todas las lunas que existen, y ninguna se está deshaciendo. Es la atracción sobre la luna lo que la mantiene en órbita; es la diferencia a lo largo de la luna lo que intenta deshacerla. La comparación que importa es la segunda, y la pantalla siguiente la dibuja como dos barras.',
    },
    {
      title: 'Estiramiento contra agarre',
      body: 'El panel toma un cuerpo del tamaño de la Luna y te deja acercarlo a la Tierra. Dos barras, medidas en la superficie del cuerpo:\n\n<strong>Verde</strong> es su propia gravedad, que lo mantiene unido. No cambia cuando mueves el cuerpo, porque depende solo del propio cuerpo.\n\n<strong>Roja</strong> es el estiramiento de marea que intenta separar sus extremos. Crece como uno partido por la distancia al cubo, así que sube muy deprisa cuando acercas el cuerpo.\n\nEn algún punto la barra roja alcanza a la verde. Encuéntralo.\n\nLa Luna está de verdad a unos sesenta radios terrestres, muy fuera del extremo derecho de este deslizador. La estás trayendo a un sitio donde nunca ha estado.',
      checklist: [
        'Empieza a 5 radios terrestres y observa que la barra verde empequeñece a la roja',
        'Baja el deslizador de distancia despacio y vigila solo la barra roja',
        'Encuentra la distancia a la que las dos barras miden lo mismo',
        'Lee la línea del veredicto, y la distancia que informa el panel debajo',
        'Pulsa Hielo de cometa y encuentra de nuevo el punto de cruce',
        'Pulsa Hierro y encuéntralo una tercera vez',
      ],
      tool: {
        title: 'Su propia gravedad, contra la marea',
        note: 'Verde es agarre, roja es estiramiento. El marcador de la regla de abajo es donde has puesto el cuerpo; la muesca es donde ambas se igualan.',
      },
      tip: 'La barra verde no se mueve nunca al cambiar la distancia, y la barra roja no se mueve nunca al cambiar la densidad. Cada control mueve exactamente una barra, lo que hace fácil razonar sobre el equilibrio.',
    },
    {
      title: 'Dónde se inclina la balanza',
      body: 'Devuelve la densidad a la propia de la Luna, 3300 kg/m³, y lee la distancia a la que las dos barras se igualan. El panel la informa en radios terrestres, en la línea que dice que ambas son iguales.',
      prompt:
        'Para un cuerpo de la densidad de la Luna, el estiramiento iguala al agarre a una distancia de aproximadamente…',
      unit: 'radios terrestres',
      because:
        'Alrededor de 1,5 radios terrestres desde el centro de la Tierra, o unos 9500 km, que son solo unos 3100 km sobre el suelo. Esa distancia tiene nombre: es el <strong>límite de Roche</strong>, por Édouard Roche, que lo dedujo en 1848. No es casualidad que haya salido de una comparación que montaste tú: el límite de Roche se define exactamente por ese equilibrio, y la fórmula de los libros de texto no es más que el álgebra de igualar esas dos barras.',
      tool: {
        title: 'Lee la distancia de cruce',
        note: 'La densidad se mantiene en la propia de la Luna para esta pregunta. Desliza la distancia hasta que las dos barras coincidan, o simplemente lee la línea que dice dónde son iguales.',
      },
    },
    {
      title: 'El límite de Roche, y por qué hay dos',
      body: 'La imagen pasa a Saturno, que es donde esta idea se gana el sueldo. La luna que mueves está dibujada a la distancia que fija tu deslizador, y dos arcos marcan dos límites de Roche distintos.\n\n¿Por qué dos? Porque un cuerpo real no sigue siendo una bola perfecta cuando la marea le echa mano. Se estira, lo que separa más sus extremos, lo que da a la marea una palanca más larga, lo que lo estira más. Un cuerpo sin resistencia alguna, libre de deformarse, se deshace por tanto <em>más lejos</em> que uno que conserva su forma. El arco exterior es el límite sin resistencia; el interior es el de conservar la forma. Entre ambos hay una franja gris real, no un error de redondeo.\n\nY ahora mira los anillos. El sistema de anillos de Saturno termina bruscamente a 136 780 km, y la luna redonda más interior, Mimas, orbita bastante fuera de eso. Pon la densidad en hielo poroso, que es lo que son de verdad las partículas de los anillos, y compara el arco exterior con el punto donde acaban los anillos. Los anillos quedan dentro del límite; las lunas quedan fuera. Saturno tiene cien mil kilómetros de escombros donde una luna no puede formarse, y una luna a la primera distancia a la que sí puede.',
      tool: {
        title: 'Una luna acercada a Saturno',
        note: 'Las distancias están en radios de Saturno. La lectura da ambos límites, el borde exterior del anillo A y Mimas, para que puedas comparar los cuatro números directamente.',
      },
      tip: 'El dibujo de una luna estirada o destrozada es exactamente eso: un dibujo del resultado. Gravitas no calcula flujo de fluidos, y nada de este panel es una simulación hidrodinámica.',
    },
    {
      title: 'Cambia de qué está hecha la luna',
      body: 'Deja la distancia en paz un momento y cambia el material. Observa cómo se mueven los dos arcos.\n\nEste es el sentido de la pantalla, y es lo que más a menudo se entiende mal: <strong>un límite de Roche no es una sola distancia.</strong> No hay un radio alrededor de Saturno dentro del cual todo se destroce. Hay un límite distinto para cada cuerpo, y depende de de qué está hecho ese cuerpo y de la masa de aquello hacia lo que cae.\n\nLos cuerpos más densos se agarran a sí mismos con más fuerza para su tamaño, así que sus límites quedan más adentro. Sube la densidad lo suficiente y el arco interior desaparece dentro del propio Saturno, que es la respuesta honesta de que un cuerpo lo bastante denso podría orbitar dentro de las capas de nubes de Saturno sin que la marea lo molestara en absoluto.',
      checklist: [
        'Pulsa Hielo poroso y fíjate en dónde queda el arco exterior',
        'Pulsa Hielo sólido y observa cómo ambos arcos se mueven hacia dentro',
        'Pulsa Roca, después Hierro, y observa cómo siguen moviéndose hacia dentro',
        'Encuentra una densidad a la que el arco interior se desvanezca dentro de Saturno',
        'Devuelve la densidad a hielo poroso y acerca el deslizador de distancia hasta que la luna se deshaga',
      ],
      tool: {
        title: 'El mismo planeta, lunas distintas',
        note: 'Solo cambia la densidad. La masa de Saturno es fija y el tamaño de la luna también, y aun así los arcos se mueven mucho.',
      },
      tip: 'El tamaño de la luna no aparece en la respuesta en absoluto. Un pedazo de hielo de 5 km y una luna helada de 500 km tienen el mismo límite de Roche alrededor de Saturno, porque agrandar el cuerpo aumenta el estiramiento y su propio agarre en el mismo factor.',
    },
    {
      title: 'No es una sola distancia',
      body: 'Acabas de mover los arcos cambiando una propiedad del cuerpo que cae, sin tocar el planeta en absoluto.',
      prompt: 'Un límite de Roche lo fijan…',
      options: [
        'la masa del planeta por sí sola, así que es un radio fijo alrededor de cada planeta',
        'la masa del planeta y la densidad del cuerpo que cae',
        'el tamaño del cuerpo que cae, deshaciéndose los mayores más lejos',
        'la velocidad orbital del cuerpo que cae',
      ],
      because:
        'La masa del planeta y la densidad del cuerpo que cae. Su tamaño se cancela por completo, cosa que sorprende a la mayoría: doblar el radio de una luna dobla el estiramiento a lo largo de ella y también dobla su propia gravedad superficial, así que el equilibrio no se toca. Hablar de «el límite de Roche de Saturno» es por tanto una afirmación incompleta. Tiene que ser el límite de Roche de Saturno para algo.',
    },
    {
      title: 'Lo que un límite de Roche no te dice',
      body: 'Cuatro salvedades, porque esta es la idea de la lección con más probabilidad de aplicarse en exceso.\n\n<strong>Va de gravedad propia, no de pegamento.</strong> Todo el argumento compara la marea con la gravedad propia de un cuerpo. Los cuerpos pequeños se mantienen unidos sobre todo por la resistencia del material: una roca de un metro no va a ser desgarrada por Saturno a ninguna distancia, porque las fuerzas que mantienen unida una roca no tienen nada que ver con su gravedad. El límite se aplica a cuerpos lo bastante grandes como para que sea la gravedad la que los sujeta.\n\n<strong>Cruzarlo no es una explosión.</strong> Nada detona a un radio. Un cuerpo llevado dentro de su límite pierde material de los extremos primero, y la disrupción lleva tiempo: un paso de ida y vuelta, en una órbita que vuelve a salir, puede dejar un cuerpo estirado y agrietado en lugar de destruido.\n\n<strong>El giro y la forma importan.</strong> Los dos límites de aquí acotan la respuesta real para un cuerpo redondo y que no gira deprisa. Un cuerpo en rotación rápida o alargado se comporta de otra manera.\n\n<strong>El cometa Shoemaker-Levy 9 es lo que esto parece de verdad.</strong> En julio de 1992 pasó a unos 40 000 km sobre las nubes de Júpiter, dentro de su límite de Roche, y no se desvaneció. Se deshizo en una hilera de unos veinte fragmentos, alineados a lo largo de su órbita, que después chocaron contra Júpiter uno tras otro en 1994. Una hilera de trozos, no una nube de polvo.',
      tip: 'Los montones de escombros son el caso interesante: muchos asteroides son agregados sueltos mantenidos unidos por poco más que su propia gravedad, y esos sí se comportan como predice este argumento.',
    },
    {
      title: 'El caso extremo, en vivo',
      body: 'La simulación ha pasado a un escenario construido en torno a un agujero negro supermasivo con estrellas y planetas cayendo a su lado. Observa un rato. Los cuerpos que pasan lo bastante cerca son despojados: se les arranca material y se estira en regueros que se enrollan alrededor del agujero.\n\n<strong>Lee con cuidado lo que estás viendo.</strong> Gravitas mueve masas puntuales bajo gravedad newtoniana. Cuando un cuerpo pasa dentro de un radio de disrupción, la simulación desprende de él partículas de escombros y las deja orbitar por su cuenta, lo cual es una caricatura razonable del despojamiento por marea y no un cálculo de él. En este modelo no hay fluido, ni presión, ni calentamiento por choque, ni radiación. El reguero que ves es una imagen plausible de la geometría, producida por una regla y no por la física.\n\nLo que sí es real en la imagen es la gravedad: las órbitas, el hecho de que los pasos más cercanos hacen más daño, y el hecho de que los escombros acaban en un abanico de órbitas distintas porque distintas partes del cuerpo estaban a distintas distancias cuando se deshizo. Esto último es la misma resta con la que empezaste la lección.',
      checklist: [
        'Observa a un cuerpo hacer un paso cercano y sigue lo que se desprende de él',
        'Fíjate en que los cuerpos que pasan más lejos quedan intactos',
        'Sigue un reguero de escombros y observa que se extiende a lo largo de la órbita en vez de mantenerse agrupado',
        'Busca material que acabe ligado al agujero y material que se marche',
      ],
      tip: 'Que los escombros se extiendan a lo largo de la órbita en vez de caer juntos es un rasgo real de la disrupción por marea: el extremo cercano del objeto iba en una órbita ligeramente más apretada que el extremo lejano, así que los trozos tienen periodos ligeramente distintos.',
    },
    {
      title: 'Una estrella, y un agujero negro demasiado grande',
      body: 'Termina con el caso extremo, hecho como es debido con números en lugar de imágenes.\n\nDeja caer una estrella parecida al Sol hacia un agujero negro. Importan dos distancias. El <strong>radio de marea</strong> es donde el estiramiento a lo largo de la estrella vence a la gravedad propia de la estrella: el mismo equilibrio que encontraste para la Luna, con la misma aritmética. El <strong>horizonte de sucesos</strong> es donde la estrella desaparece de la vista para siempre.\n\nSube la masa desde diez masas solares y observa cómo los dos círculos se acercan. Para un agujero de masa estelar la estrella se desgarra a decenas de miles de radios del horizonte. Para Sagitario A*, en el centro de nuestra galaxia, todavía se desgarra fuera, por un factor de unos once, y los astrónomos ven de verdad las fulguraciones resultantes. Sigue subiendo y los dos se encuentran en torno a 160 millones de masas solares, y más allá de eso el radio de marea queda <em>dentro</em> del horizonte: la estrella cruza entera y no hay nada que nadie de fuera pueda ver.\n\nEse es un resultado real y algo perverso. Los agujeros negros más masivos son los menos capaces de desgarrar una estrella donde puedas verlo, porque el tamaño del horizonte crece en proporción a la masa mientras que el radio de marea crece solo como su raíz cúbica.\n\n<strong>La aproximación, enunciada.</strong> Ambos radios de aquí son estimaciones newtonianas, y el radio de marea usa el mismo equilibrio de gravedad propia que el resto de la lección. Los sucesos reales de disrupción por marea son hidrodinámicos: la estrella se comprime además de estirarse, los escombros chocan y radian, y la relatividad general importa cerca del horizonte. Nada de eso está modelado aquí ni en ninguna parte de Gravitas. Lo que sobrevive a la aproximación es la comparación de dos longitudes, y esa comparación es la razón de que las fulguraciones se vean donde se ven.',
      tool: {
        title: 'Radio de marea frente a horizonte de sucesos',
        note: 'El círculo de puntos es donde la estrella se deshace; el disco lleno es el horizonte. Ambos están dibujados en una escala que cuenta ceros, porque con diez masas solares difieren en un factor de sesenta mil.',
      },
      tip: 'Los tres botones predefinidos te llevan a un agujero de masa estelar, a Sagitario A*, y a un gigante de mil millones de masas solares donde la estrella se traga entera.',
    },
    {
      title: 'Toda la lección en tres frases',
      body: 'Has ido de una playa a un agujero negro usando una idea y dos relaciones medidas. Escríbelo.',
      prompt:
        'Explica qué causa las mareas, qué las hace más intensas, y cómo pueden destruir un objeto. Con tres frases basta.',
      rubric:
        'Se esperan tres componentes. (1) Las mareas las causa que la gravedad sea desigual a lo largo de un objeto extenso: la diferencia entre la atracción en un punto y la atracción sobre el centro, no la intensidad de la gravedad en sí. (2) Se hacen más intensas con la masa del compañero, en proporción, y mucho más bruscamente al disminuir la separación, como uno partido por la separación al cubo. (3) Un cuerpo se destruye cuando el estiramiento de marea a lo largo de él supera su propia gravedad superficial, lo que ocurre dentro de su límite de Roche, y ese límite depende de los dos cuerpos implicados en lugar de ser una distancia universal. Se valora cualquier enunciado correcto de la relación de cubo inverso, como sea que se exprese. No se exige una fórmula. Se descuenta por «las mareas las causa una gravedad intensa», por que el abultamiento del lado lejano sea empujado o lanzado hacia fuera, o por describir un límite de Roche como un radio fijo alrededor de un planeta.',
    },
    {
      title: 'Lo que has deducido',
      body: '<strong>Una marea es una diferencia.</strong> No una atracción. Quita la atracción sobre el centro a la atracción donde estás, y lo que queda es lo que deforma las cosas. Es la razón de que haya dos abultamientos y no uno, y la razón de que el lado lejano se abulte sin que nada lo empuje.\n\n<strong>La distancia domina.</strong> Una potencia de masa, tres potencias de separación. Por eso la Luna gana al Sol, por eso las dos últimas filas del gráfico comparativo difieren en cinco órdenes de magnitud, y por eso los efectos de marea suelen ser irrelevantes justo hasta que son catastróficos.\n\n<strong>El tamaño también importa.</strong> Un objeto más grande tiene los extremos más separados, así que siente una diferencia mayor. Tú no sientes prácticamente ninguna marea. La Tierra siente unos metros de ella.\n\n<strong>Romperse es una competición.</strong> El estiramiento contra el agarre propio del cuerpo. Dentro del límite de Roche gana el estiramiento, y ese límite es distinto para cada par de objetos, porque depende de lo que cae tanto como de aquello hacia lo que cae.\n\n<strong>El mismo mecanismo, catorce órdenes de magnitud.</strong> El mar subiendo por una playa, Ío mantenida fundida, la Luna mostrando una sola cara, los anillos de Saturno terminando donde terminan, un cometa estirado en fragmentos, y una estrella convertida en un reguero. Una resta.\n\nY una frase para conservar: <em>las mareas ocurren porque la gravedad no es igual de intensa a lo largo de un objeto extenso; la diferencia crece bruscamente a medida que los objetos se acercan, y en casos extremos vence a la propia gravedad del objeto y lo desgarra.</em>',
      tip: 'La próxima vez que veas una tabla de mareas, fíjate en que lista dos pleamares y dos bajamares al día, y en que son mayores alrededor de la luna nueva y la llena. Ambas cosas son cosas que ahora sabes explicar.',
    },
  ],
};
