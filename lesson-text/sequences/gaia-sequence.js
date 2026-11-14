export const HOW_FAR_AND_HOW_SURE_ES = {
  title: '¿A qué distancia y con cuánta seguridad?',
  subtitle:
    'Una paralaje mide uno entre la distancia, con un error: dibuja la verosimilitud, mira cuándo da una distancia y cuándo solo un límite, y qué hacen una distribución previa y un punto cero',
  objectives: [
    'Convertir una paralaje y su error en una distancia con un intervalo, y decir por qué el intervalo no es simétrico',
    'Decir cuándo una paralaje respalda una distancia y cuándo solo un límite inferior o nada, con la paralaje corregida sobre su error',
    'Decir qué significa una paralaje negativa y por qué se conserva en vez de tirarse',
    'Decir qué añade una distribución previa, qué supone sobre la muestra y qué hace el punto cero a una distancia',
  ],
  steps: {
    'a-parallax-is-not-a-distance': {
      title: 'Una paralaje no es una distancia',
      body: `Mientras la Tierra gira alrededor del Sol, una estrella cercana parece desplazarse contra las estrellas del fondo. La mitad de ese desplazamiento es su <strong>paralaje</strong>, y en milisegundos de arco es uno dividido entre la distancia en kiloparsecs. Una estrella a 2,5 kpc tiene una paralaje de 0,4 mas.\n\nPero Gaia mide la paralaje, no la distancia, y la mide con un <strong>error</strong>. Lo que se conoce es entonces una verosimilitud: cuánto concuerda cada distancia posible con el número medido. El panel dibuja esa verosimilitud para una paralaje y un error que fijas tú (son datos de entrada, no una estrella de Gaia). Su punto más alto es uno dividido entre la paralaje; su anchura es el error llevado a través de la división.`,
    },
    'commit-to-a-distance': {
      title: 'Compromete una distancia',
      body: `La paralaje de una estrella se mide como 0,40 mas, con un error de 0,05 mas. Antes de leer el panel, di dónde debería alcanzar su máximo la verosimilitud de su distancia.`,
      prompt: '¿Dónde alcanza su máximo la verosimilitud de la distancia?',
      options: [
        'En 0,4 kpc, la paralaje leída como distancia',
        'En 8 kpc, la paralaje dividida entre su error',
        'En 2,5 kpc, uno dividido entre la paralaje',
        'En 0,05 kpc, el error leído como distancia',
      ],
      hints: [
        'Una estrella a 1 kpc tiene una paralaje de 1 mas. ¿Qué distancia tiene una paralaje de 0,4 mas?',
      ],
      because:
        'En 2,5 kpc. Una paralaje es la inversa de una distancia, así que la distancia que mejor concuerda con 0,40 mas es uno dividido entre 0,40. El error no mueve el máximo; fija lo ancha que es la verosimilitud.',
    },
    'read-the-distance': {
      title: 'Lee la distancia y su intervalo',
      body: `Pon el panel en una paralaje de 0,40 mas y un error de 0,05 mas, sin distribución previa y sin punto cero. Lee la distancia según la verosimilitud y los dos extremos de su intervalo del 68 por ciento.`,
      fields: [
        { label: 'Distancia, el máximo de la verosimilitud' },
        { label: 'Extremo inferior del intervalo' },
        { label: 'Extremo superior del intervalo' },
      ],
    },
    'why-the-interval-leans': {
      title: 'Un intervalo que se inclina',
      body: `El intervalo va de 2,22 a 2,86 kpc alrededor de 2,5: llega 0,28 kpc por debajo y 0,36 por encima. El error de la paralaje es del mismo tamaño a ambos lados.`,
      prompt: '¿Por qué el intervalo es más largo en el lado lejano?',
      options: [
        'Gaia mide peor las estrellas débiles y lejanas',
        'El error de la distancia es 1 dividido entre el error de la paralaje, así que es igual a ambos lados',
        'Pasos iguales en paralaje son pasos desiguales en distancia: una paralaje menor es una distancia mayor',
        'El panel está sesgado hacia las distancias grandes',
      ],
      hints: [
        'Calcula la distancia con una paralaje 0,05 por encima y 0,05 por debajo de 0,40. ¿Son iguales los dos pasos desde 2,5?',
      ],
      because:
        'La paralaje es simétrica y la distancia no. Una paralaje de 0,35 mas son 2,86 kpc, un paso de 0,36 desde 2,5; una de 0,45 mas son 2,22 kpc, un paso de 0,28. Como la distancia va como uno entre la paralaje, un error del mismo tamaño a ambos lados es un paso más largo del lado de la paralaje menor.',
      misconceptions: [
        {
          say: 'El error es el mismo, 0,05 mas, a ambos lados. La inclinación es una propiedad de uno dividido entre la paralaje, no de lo bien que Gaia vio la estrella.',
        },
      ],
    },
    'try-the-controls': {
      title: 'Empeora la paralaje',
      body: `Sube el error de la paralaje y mira la verosimilitud. Luego prueba los botones «Señal baja» y «Paralaje negativa». Fíjate dónde tiene un máximo la verosimilitud, si cae a nada en el lado lejano y qué dicen las líneas de la derecha que respalda una paralaje.`,
      checklist: [
        'La verosimilitud se ensancha al subir el error, y su máximo sigue en uno dividido entre la paralaje',
        'Con «Señal baja» el intervalo no tiene extremo lejano: la verosimilitud nunca cae en el lado lejano',
        'Con «Paralaje negativa» hay una verosimilitud y ninguna distancia',
      ],
    },
    'when-it-is-too-faint': {
      title: 'Una paralaje tan grande como su error',
      body: `Pulsa «Señal baja»: una paralaje de 0,10 mas con un error de 0,10 mas, una paralaje corregida igual a su error. El panel dice qué respalda esto, y el intervalo no tiene extremo lejano.`,
      prompt: '¿Qué se puede decir de la distancia de esta estrella?',
      options: [
        'Está a 10 kpc, con una incertidumbre',
        'Está al menos a unos 5 kpc, y los datos no dan un extremo superior',
        'Está a 0,1 kpc',
        'Nada en absoluto: una paralaje tan pequeña no es un dato',
      ],
      hints: [
        'Lee el intervalo: empieza en un extremo inferior y dice que no tiene extremo lejano.',
      ],
      because:
        'El extremo inferior del intervalo del 68 por ciento es 5 kpc y la verosimilitud no cae a distancias grandes, así que la paralaje respalda un límite inferior, no una distancia medida. Uno dividido entre 0,10 son 10 kpc, el máximo de la verosimilitud, pero la curva es tan ancha que cualquier distancia mayor encaja casi igual de bien.',
      misconceptions: [
        {
          say: 'Uno dividido entre la paralaje es donde la verosimilitud alcanza su máximo, no una distancia con una incertidumbre: la curva está abierta por el lado lejano, así que los datos no pueden decir que la estrella no esté más lejos.',
        },
        {
          say: 'La paralaje sí dice algo: la estrella probablemente no está más cerca que el extremo inferior. Una medición con un error grande es una prueba débil, no la ausencia de prueba.',
        },
      ],
    },
    'a-negative-parallax': {
      title: 'Una paralaje negativa',
      body: `Pulsa «Paralaje negativa»: una paralaje medida de −0,10 mas con un error de 0,05 mas. Un catálogo puede contener un número así, porque una medición con ruido puede salir por debajo de cero para una estrella lejana.`,
      prompt: '¿Qué da el panel para esta estrella, y por qué?',
      options: [
        'Una distancia de −10 kpc, que un estudiante debe ignorar',
        'Una distancia de cero: la estrella está en el Sol',
        'La estrella se rechaza por mala medición',
        'Una verosimilitud y ninguna distancia: la paralaje corregida no es positiva, así que uno dividido entre ella no es una distancia',
      ],
      hints: ['Lee la línea que dice qué respalda la paralaje.'],
      because:
        'Una verosimilitud y ninguna distancia. Uno dividido entre un número negativo no es una distancia, así que el panel dibuja la verosimilitud y dice que no hay nada que dar. La estrella no es mala: su medición dice solo que está lejos, o que el ruido fue en contra. Tirar las paralajes negativas recortaría la mitad ruidosa de una muestra y sesgaría lo que queda.',
      misconceptions: [
        {
          say: 'No existe una distancia negativa. El panel no la inventa: dibuja la verosimilitud y dice que no hay distancia.',
        },
        {
          say: 'Una paralaje negativa es una medición honesta con ruido. Rechazarla tira la información de que la estrella es débil en paralaje, y sesga la muestra.',
        },
      ],
    },
    'what-you-worked-out': {
      title: 'Lo que averiguaste',
      body: `Una paralaje es uno sobre una distancia, medida con un error. Lo que respalda es una verosimilitud: un máximo en uno dividido entre la paralaje corregida, un intervalo que se inclina hacia el lado lejano, un límite inferior cuando la paralaje no es mayor que su error, y nada más que la verosimilitud cuando no es positiva. Una distancia puntual necesita una paralaje corregida de al menos cinco veces su error. Aquí no se corrigió nada más allá de los números que fijaste.`,
    },
  },
};

export const HOW_FAR_AND_HOW_SURE_DEEPER_ES = {
  steps: {
    'the-relative-error': {
      title: 'El error de la distancia',
      body: `Para la paralaje de 0,40 mas con un error de 0,05 mas, el panel dice que la paralaje corregida es un número de veces su error. El error relativo de la distancia es igual al error relativo de la paralaje. Dalo en porcentaje.`,
      fields: [{ label: 'Error de la paralaje como parte de la paralaje' }],
    },
    'where-the-threshold-falls': {
      title: 'Dónde cae el umbral',
      body: `Una distancia puntual necesita una paralaje corregida de al menos cinco veces su error. Deja la paralaje en 0,40 mas y sube el error paso a paso (el deslizador avanza de 0,01 en 0,01 mas), y lee qué dice el panel que respalda.`,
      prompt:
        '¿Con qué error deja 0,40 mas de respaldar una distancia puntual?',
      options: [
        'Por encima de 0,04 mas',
        'Por encima de 0,08 mas',
        'Por encima de 0,20 mas',
        'Nunca, porque 0,40 es positivo',
      ],
      hints: ['Cinco veces el error no debe superar 0,40.'],
      because:
        'Por encima de 0,08 mas: 0,40 dividido entre 0,08 es 5, y con 0,09 el cociente es 4,4 y el panel dice señal baja. El umbral de cinco es una elección declarada, no una ley de la naturaleza; por debajo, la distancia es el máximo de una verosimilitud ancha y no una medición.',
    },
    'an-interval-with-no-far-end': {
      title: 'Un intervalo sin extremo lejano',
      body: `Pulsa «Señal baja» (0,10 mas, error 0,10 mas) y lee el extremo inferior del intervalo del 68 por ciento. Luego sube la paralaje a 0,15 mas y lee ambos extremos.`,
      fields: [
        { label: 'Extremo inferior con 0,10 mas' },
        { label: 'Extremo superior con 0,15 mas' },
      ],
    },
    'from-parallax-to-speed': {
      title: 'De una paralaje a una velocidad',
      body: `El movimiento propio de una estrella es de 5 mas/año. A una distancia, ese ángulo por año es una velocidad a través del cielo: 4,74 km/s por cada mas/año a 1 kpc. Pon la paralaje en 0,40 mas con un error de 0,05 mas y el movimiento propio en 5,0 mas/año, y lee la velocidad tangencial y su intervalo.`,
      fields: [
        { label: 'Velocidad tangencial' },
        { label: 'Extremo inferior del intervalo' },
        { label: 'Extremo superior del intervalo' },
      ],
    },
    'why-one-over-p-is-biased': {
      title: 'Promediar uno entre la paralaje',
      body: `La validación sorteó muchas paralajes con ruido de estrellas a una misma distancia verdadera y promedió uno entre cada una. Con una paralaje cinco veces su error la media salió 1,043 veces la distancia verdadera; con diez veces, 1,010; con veinte, 1,003. La mediana de uno entre la paralaje, con veinte veces, fue 1,00007 de la distancia verdadera (tramo A1 de GAIA_WORKFLOWS.md).`,
      prompt: '¿Qué dice esto?',
      options: [
        'Las paralajes de Gaia están sesgadas al alza',
        'Uno entre la paralaje nunca es un buen estimador de la distancia',
        'El sesgo es el punto cero',
        'La media de uno entre una paralaje con ruido está sesgada al alza, en una proporción que baja al crecer la paralaje frente a su error, y la mediana no',
      ],
      hints: [
        '¿Cuál de las dos, la media o la mediana, se quedó en 1,000 con veinte veces? ¿Qué hace la proporción al subir el cociente?',
      ],
      because:
        'El sesgo está en el promedio de uno entre p, no en p. Una p con ruido a veces sale pequeña, y uno entre una p pequeña es una distancia enorme; el promedio sube por esas, un 4,3 por ciento con un cociente de cinco y un 0,25 por ciento con veinte. La mediana no sube. Es una propiedad de la inversión, así que se declara y se muestra, y no se aplica ninguna corrección general a ninguna muestra.',
      misconceptions: [
        {
          say: 'Las paralajes aquí se sortearon sin ningún sesgo. El sesgo viene de tomar uno entre un número con ruido.',
        },
        {
          say: 'El punto cero es un desfase de la medición y es otro asunto (más adelante). Este sesgo está ahí sin punto cero alguno.',
        },
      ],
    },
    'justify-a-report': {
      title: 'Informa una distancia',
      body: `Un catálogo lista una estrella con una paralaje de 0,10 mas y un error de 0,10 mas, y un estudiante escribe «la estrella está a 10 kpc».`,
      prompt:
        'Di qué falla en esa frase, y escribe qué respalda en cambio la paralaje, con números del panel.',
      rubric:
        'Crédito por decir que 10 kpc es uno entre la paralaje, el máximo de una verosimilitud muy ancha, y no una distancia medida; por el extremo inferior de unos 5 kpc y el extremo lejano que falta; y por dar la paralaje corregida sobre su error (1) frente al umbral (5). No se da crédito a una respuesta que solo diga que el error es grande.',
      rubricCriteria: [
        {
          name: 'Dice qué falla en el número único',
          levels: [
            {
              label: 'Completo',
              text: 'Dice que 10 kpc es solo donde la verosimilitud alcanza su máximo, la curva está abierta por el lado lejano y la paralaje respalda un límite inferior.',
            },
            {
              label: 'En parte',
              text: 'Dice que el error es grande o el número incierto, sin decir por qué el lado lejano está abierto.',
            },
            {
              label: 'Aún no',
              text: 'Acepta 10 kpc, o lo sustituye por otra distancia única.',
            },
          ],
        },
        {
          name: 'Escribe lo que se respalda',
          levels: [
            {
              label: 'Completo',
              text: 'Escribe que la estrella probablemente está al menos a 5 kpc, sin extremo superior con estos datos.',
            },
            { label: 'Aún no', text: 'No escribe ningún límite.' },
          ],
        },
        {
          name: 'Usa los números del panel',
          levels: [
            {
              label: 'Completo',
              text: 'Da la paralaje corregida sobre su error (1) y la compara con el umbral de 5.',
            },
            { label: 'Aún no', text: 'No da ningún número del panel.' },
          ],
        },
        {
          name: 'Responde lo que se pide',
          levels: [
            { label: 'Completo', text: 'Atiende las dos partes.' },
            { label: 'Aún no', text: 'Atiende una parte.' },
          ],
        },
      ],
    },
    'add-a-prior': {
      title: 'Añade una distribución previa',
      body: `Pulsa «Señal baja» y activa la distribución previa, con una longitud de escala de 1 kpc. La previa dice cómo se reparten las estrellas a lo largo de la línea de visión: aquí una densidad espacial que decrece como exp(−r ÷ L). Lee la mediana de la posterior y su intervalo del 68 por ciento.`,
      fields: [
        { label: 'Mediana posterior' },
        { label: 'Extremo inferior' },
        { label: 'Extremo superior' },
      ],
    },
    'double-the-scale-length': {
      title: 'Cambia lo que dice la previa',
      body: `Ahora cambia la longitud de escala de 1 a 2 kpc y vuelve a leer el intervalo: su extremo superior pasa de 6,93 a 10,81 kpc. La validación midió lo mismo: con una paralaje corregida igual a su error, duplicar la longitud de escala movió el extremo superior en un factor de 1,56 (tramo D3).`,
      prompt:
        '¿Qué significa esto para una estrella con una paralaje tan débil?',
      options: [
        'La respuesta es de la paralaje, y la previa solo adorna',
        'La previa debe elegirse para dar el intervalo más corto',
        'La respuesta es tanto de la previa como de la paralaje: se mueve cuando se mueve la escala de la previa',
        'La longitud de escala de 1 kpc es correcta y la de 2 kpc es errónea',
      ],
      hints: ['¿Qué cambió entre las dos lecturas: los datos o la previa?'],
      because:
        'Los datos no cambiaron; cambió la previa, y el intervalo se movió en más de la mitad. Cuando la paralaje es débil la posterior es sobre todo la previa, por eso el panel dice dominada por la previa. Elegir la longitud de escala para obtener un intervalo ordenado metería la respuesta a mano, y no se sabe que ninguna de las dos sea la correcta para esta estrella.',
      misconceptions: [
        {
          say: 'Compara los dos intervalos: el extremo superior pasó de 6,93 a 10,81 kpc con los datos sin cambiar. Aquí la previa no es un adorno.',
        },
      ],
    },
    'when-the-data-win': {
      title: 'Cuando ganan los datos',
      body: `Pulsa «Bien medida» (0,40 mas, error 0,02 mas, una paralaje corregida veinte veces su error) y activa la distribución previa. Cambia la longitud de escala entre 1 y 2 kpc y mira la mediana.`,
      prompt: '¿Qué le pasa a la mediana posterior?',
      options: [
        'Casi no se mueve: la verosimilitud es estrecha y la previa es casi plana a lo ancho',
        'Se mueve en la mitad, como con la paralaje débil',
        'Se mueve al máximo de la previa',
        'La previa se ignora y el intervalo no cambia ni en la última cifra',
      ],
      hints: [
        'Compara la anchura de la verosimilitud con la escala en que cambia la previa.',
      ],
      because:
        'La mediana pasa de 2,509 a 2,517 kpc, un tercio de uno por ciento. Una verosimilitud estrecha cae donde la previa es casi plana, así que cualquier longitud de escala razonable da casi la misma respuesta. Una previa importa en proporción a lo poco que dice la paralaje, por eso una distancia puntual necesita cinco veces el error.',
    },
    'what-the-prior-assumes': {
      title: 'Qué supone la previa',
      body: `La previa se declara junto a la verosimilitud: las estrellas muestreadas tienen una densidad espacial que decrece como exp(−r ÷ L), y la muestra es completa en las distancias dibujadas. Un estudiante la aplica a estrellas elegidas porque su paralaje sobre error supera 5. En la validación, una previa con la escala equivocada (1 kpc para estrellas que en realidad decrecen en 3) dio intervalos del 68 por ciento que cubrieron entre el 22 y el 42 por ciento de las estrellas (tramo C4, registrado sin aprobado ni suspenso).`,
      prompt: '¿Qué falla al aplicar la previa a esa muestra?',
      options: [
        'Nada: una previa siempre es mejor que ninguna',
        'La previa solo vale para estrellas más brillantes que una magnitud',
        'Daría los intervalos correctos pero las medianas erróneas',
        'Un corte en la paralaje reduce la muestra según la distancia, así que la muestra no es completa y la previa declarada no es la de la muestra',
      ],
      hints: [
        '¿Qué estrellas quita primero un corte en paralaje sobre error, las cercanas o las lejanas?',
      ],
      because:
        'Un corte en paralaje sobre error quita primero las estrellas lejanas, así que la muestra no es la población que describe la previa, y el nivel declarado del intervalo ya no es lo que cubre. La validación mostró lo que cuesta una escala equivocada: intervalos del 68 por ciento que cubrieron del 22 al 42 por ciento. Un corte cambia la previa; el panel lo dice, y no puede repararlo.',
      misconceptions: [
        {
          say: 'Una previa que no describe la muestra mueve la respuesta hacia algo falso. En la validación, intervalos pensados para cubrir el 68 por ciento cubrieron hasta solo el 22 por ciento.',
        },
      ],
    },
    'the-zero-point': {
      title: 'El punto cero',
      body: `Las paralajes de Gaia tienen un pequeño desfase, el <strong>punto cero</strong>, que depende de la magnitud, el color y la posición en el cielo de una estrella; es negativo, así que la paralaje del catálogo es demasiado pequeña. Pulsa «Bien medida», pon el desfase del punto cero en −0,040 mas (un valor cercano al que necesitan las estrellas de NGC 2420, más abajo) y lee la nueva distancia.`,
      fields: [{ label: 'Distancia con el punto cero' }],
    },
    'the-cluster-and-the-zero-point': {
      title: 'Un cúmulo, con y sin',
      body: `El segundo panel contiene las 993 estrellas de Gaia del cúmulo abierto NGC 2420. Sus miembros (estrellas cuyo movimiento propio por sí solo las pone en el cúmulo con probabilidad 0,9 o más) tienen una paralaje media y, con el punto cero de cada estrella aplicado, una distancia. Lee la distancia con el punto cero activado, luego desactiva el punto cero por estrella y léela otra vez.`,
      fields: [
        { label: 'Distancia con el punto cero' },
        { label: 'Distancia sin él' },
      ],
    },
    'what-the-interval-leaves-out': {
      title: 'Di qué es la distancia',
      body: `La distancia corregida del cúmulo es 2,324 kpc con un intervalo estadístico de 2,316 a 2,332 kpc. Ese intervalo no tiene suelo sistemático. El tramo de la validación que comprobaría la distancia con la de un catálogo publicado basado en Gaia (E1) no se ejecutó: la tabla que necesita, Hunt y Reffert 2023, no pudo obtenerse. Los valores de la literatura en la validación van de 2,48 kpc (fotometría, convertida de un módulo de distancia) a 2,59 (Gaia DR2); una paralaje de DR3 tal como se imprimió, sin punto cero, da 2,78 kpc.`,
      prompt:
        'Escribe la frase que pondrías en un informe para esta distancia, con sus etiquetas, y di qué no se ha hecho.',
      rubric:
        'Crédito por 2,324 kpc con el intervalo estadístico de 2,316 a 2,332 rotulado como solo estadístico y sin suelo sistemático; por decir que aquí no se conoce la incertidumbre del propio punto cero; por decir que la distancia no se ha validado con la de un catálogo publicado (E1 NO SE EJECUTÓ) y queda por debajo de los valores de la literatura listados; y por no llamarlo concordancia. No se da crédito a una frase que dé 2,324 kpc como la distancia del cúmulo sin etiqueta.',
      rubricCriteria: [
        {
          name: 'Da el valor con sus etiquetas',
          levels: [
            {
              label: 'Completo',
              text: 'Da 2,324 kpc, el intervalo de 2,316 a 2,332 kpc como solo estadístico, y ningún suelo sistemático.',
            },
            {
              label: 'En parte',
              text: 'Da el valor y el intervalo sin decir qué deja fuera el intervalo.',
            },
            { label: 'Aún no', text: 'Da el valor sin etiqueta.' },
          ],
        },
        {
          name: 'Dice qué no se ha hecho',
          levels: [
            {
              label: 'Completo',
              text: 'Dice que la distancia no está validada con un catálogo publicado y que el tramo E1 no se ejecutó.',
            },
            { label: 'Aún no', text: 'Afirma concordancia con la literatura.' },
          ],
        },
        {
          name: 'La sitúa entre los otros valores',
          levels: [
            {
              label: 'Completo',
              text: 'Dice que queda por debajo de toda distancia de las fuentes listadas, incluido el extremo inferior de la paralaje de DR3 impresa (2,38 kpc), y no lo llama concordancia.',
            },
            { label: 'Aún no', text: 'No la compara.' },
          ],
        },
        {
          name: 'Escribe una frase para un informe',
          levels: [
            {
              label: 'Completo',
              text: 'Escribe una frase que podría valer por sí sola.',
            },
            { label: 'Aún no', text: 'Lista puntos sin una frase.' },
          ],
        },
      ],
    },
  },
};

export const WHAT_GAIA_DOES_NOT_SEE_ES = {
  title: 'Lo que Gaia no ve',
  subtitle:
    'Los cortes de magnitud, paralaje sobre error y RUWE deciden qué estrellas contiene una muestra de Gaia: mira cómo cambian el diagrama color-magnitud y la distancia del cúmulo al quitar estrellas',
  objectives: [
    'Decir que una muestra de un catálogo son las estrellas que pasaron sus cortes, y leer lo que cada corte quita de las estrellas de NGC 2420',
    'Decir qué parte de un diagrama color-magnitud quitan un límite de magnitud y un corte de paralaje sobre error',
    'Decir que un corte en la paralaje mueve la distancia tomada de las estrellas que quedan, y que el intervalo no contiene ese movimiento',
    'Decir qué hace un corte a los supuestos de una previa, y qué no son los cortes del panel: la selección real de Gaia',
  ],
  steps: {
    'a-sample-is-what-passed': {
      title: 'Una muestra es lo que pasó sus cortes',
      body: `Ningún catálogo contiene todas las estrellas. NGC 2420 es un cúmulo abierto viejo, y el paquete contiene 993 estrellas de Gaia en su campo: estrellas más brillantes que G = 17,5 cuya solución astrométrica fue lo bastante buena (RUWE menor que 1,4; esa consulta descartó otras 55 antes de que vieras nada). Luego cada estudio añade cortes propios, y las estrellas que quedan son la muestra.\n\nEl panel te deja añadir tres cortes: un límite de magnitud, un mínimo de paralaje sobre su error y un límite de RUWE. El diagrama muestra las estrellas conservadas (miembros en azul, otras en gris) y las quitadas (naranja); las líneas de la derecha dicen qué quitó cada corte y qué queda.`,
    },
    'commit-to-a-cut': {
      title: 'Compromete un corte',
      body: `Antes de mover un deslizador: pon el límite de magnitud en G menor que 16, un corte que conserva solo las estrellas más brillantes que la magnitud 16. La mayoría de las estrellas del paquete son débiles, porque las estrellas más débiles son más numerosas.`,
      prompt: '¿Cuánto del paquete quita G menor que 16, más o menos?',
      options: [
        'Una décima parte',
        'La mitad',
        'Nueve décimas partes',
        'Nada: toda estrella del paquete es más brillante que 17,5',
      ],
      hints: [
        'El paquete va de G de unos 9 a 17,5, y el número de estrellas crece mucho hacia el extremo débil.',
      ],
      because:
        'La mitad: 526 de 993. Las estrellas aumentan en número hacia las magnitudes más débiles, así que un corte en 16 quita la mitad débil del paquete aunque esté 1,5 magnitudes por encima del límite con el que se hizo.',
    },
    'read-what-is-left': {
      title: 'Lee lo que queda',
      body: `Aprieta el límite de magnitud a G menor que 15. Lee cuántas estrellas quita el corte del paquete y cuántas quedan.`,
      fields: [
        { label: 'Estrellas quitadas por el corte' },
        { label: 'Estrellas que quedan' },
      ],
    },
    'which-stars-go': {
      title: 'Qué estrellas se van',
      body: `Mira el diagrama con G menor que 15. Los puntos naranja son las estrellas que quitó el corte.`,
      prompt: '¿Qué parte del diagrama del cúmulo quita un límite de magnitud?',
      options: [
        'Las gigantes rojas, que son raras',
        'Una banda de colores, sea cual sea la magnitud',
        'El extremo débil de la secuencia principal: las estrellas de menor masa, que son numerosas',
        'Estrellas al azar por todo el diagrama',
      ],
      hints: [
        'En este diagrama lo más brillante está arriba. ¿Dónde están las estrellas quitadas?',
      ],
      because:
        'El extremo débil de la secuencia principal. Un límite de magnitud es una línea horizontal a través del diagrama, así que quita todo lo que queda debajo: las estrellas de menor masa, que son las más numerosas. Lo que queda es el desvío, las gigantes y la parte alta de la secuencia principal. El diagrama de una muestra recortada es otro diagrama.',
      misconceptions: [
        {
          say: 'Las gigantes son brillantes: un límite en el extremo débil no puede quitarlas primero. Mira dónde están los puntos naranja.',
        },
      ],
    },
    'a-cut-on-parallax-over-error': {
      title: 'Un corte en paralaje sobre error',
      body: `Restablece el límite de magnitud y conserva solo las estrellas cuya paralaje es al menos diez veces su error. El panel dice que se quitan 513 de 993 estrellas. Su magnitud media es 16,7 y la de las conservadas, 14,9.`,
      prompt:
        '¿Por qué un corte en paralaje sobre error quita sobre todo estrellas débiles?',
      options: [
        'Las estrellas débiles tienen errores de paralaje mayores, así que el cociente es menor',
        'Las estrellas débiles tienen paralajes menores',
        'Gaia no ve estrellas más débiles que 16',
        'El corte es de magnitud disfrazado, y nada más',
      ],
      hints: [
        'Todas las estrellas de un cúmulo tienen casi la misma paralaje verdadera. ¿Qué cambia de una estrella a otra?',
      ],
      because:
        'El error. Las estrellas de un cúmulo están a una distancia y tienen una paralaje verdadera, así que el cociente cambia de una estrella a otra porque cambia el error: crece hacia las magnitudes débiles. Un corte en paralaje sobre error es aquí casi un corte de magnitud, pero no lo mismo: también quita estrellas cuya paralaje se midió baja.',
      misconceptions: [
        {
          say: 'Estas estrellas están a una distancia, así que comparten una paralaje verdadera. Ser débil no hace menor una paralaje; hace mayor su error.',
        },
      ],
    },
    'the-distance-moves': {
      title: 'La distancia se mueve',
      body: `Con todos los cortes desactivados la distancia del cúmulo es 2,324 kpc, con un intervalo estadístico de 2,316 a 2,332 kpc. Ahora conserva solo las estrellas cuya paralaje es al menos diez veces su error: la distancia es 2,299 kpc, intervalo de 2,291 a 2,308 kpc.`,
      prompt: '¿Qué dicen los dos intervalos?',
      options: [
        'El corte no importó: las dos distancias concuerdan',
        'La segunda distancia es mejor porque las estrellas son más precisas',
        'La primera distancia es errónea y la segunda es correcta',
        'Los dos intervalos no se solapan: el corte movió la distancia más de lo que permite la estadística, así que un corte cambia la respuesta, no solo el número de estrellas',
      ],
      hints: [
        'Compara el extremo superior del segundo intervalo con el inferior del primero.',
      ],
      because:
        'No se solapan, 2,308 frente a 2,316, y el movimiento es de 0,025 kpc, tres veces la semianchura del primer intervalo. Conservar estrellas por su paralaje sobre error medidos favorece a las estrellas cuya paralaje salió alta, así que la distancia baja. La muestra más limpia no es la mejor: es otra, y los intervalos del panel no contienen el movimiento.',
      misconceptions: [
        {
          say: 'Cada estrella es más precisa, pero la muestra se eligió con la propia paralaje, lo que empuja la media en un sentido. Una respuesta precisa a una pregunta sesgada sigue sesgada.',
        },
        {
          say: 'Los intervalos son de 2,316 a 2,332 y de 2,291 a 2,308 kpc: no se tocan.',
        },
      ],
    },
    'not-gaias-selection': {
      title: 'Lo que no son los cortes del panel',
      body: `Los cortes del panel son los tres que llevan las filas de una tabla de Gaia: una magnitud, una paralaje sobre error y el RUWE. Se aplican aquí a un paquete que ya tenía dos cortes propios.`,
      prompt: '¿Qué no te dicen estos cortes?',
      options: [
        'Qué tan completo es el propio Gaia: qué probabilidad tenía una estrella de cierta magnitud, color y posición de ser observada y medida',
        'Qué estrellas estaban en el paquete',
        'Cuántas estrellas quita un corte',
        'Cómo queda el diagrama tras un corte',
      ],
      hints: ['¿Cuál de estas cuatro te dice directamente el panel?'],
      because:
        'La completitud del propio Gaia. El panel cuenta lo que sus tres cortes quitan de las estrellas del paquete; no es un modelo de cómo selecciona Gaia las estrellas (aglomeración, patrón de barrido, la magnitud a la que el catálogo se vuelve ralo). Las estrellas del paquete son solo las que Gaia midió, y estudiar lo que Gaia no vio necesita esa selección, que aquí no está construida.',
    },
    'what-you-worked-out': {
      title: 'Lo que averiguaste',
      body: `Una muestra son las estrellas que pasaron sus cortes. Un límite de magnitud quita el extremo débil del diagrama; un corte en paralaje sobre error quita también sobre todo estrellas débiles, pero además las de paralaje medida baja, así que la distancia tomada de lo que queda se mueve más que su estadística. Los cortes de aquí son tres que llevan las filas de una tabla, no un modelo de la completitud propia de Gaia.`,
    },
  },
};

export const WHAT_GAIA_DOES_NOT_SEE_DEEPER_ES = {
  steps: {
    'cuts-overlap': {
      title: 'Los cortes se solapan',
      body: `Activa los tres cortes: G menor que 16, paralaje sobre error de al menos 5 y RUWE menor que 1,1. El panel dice qué quita cada uno por sí solo y qué quita de las estrellas que dejaron los cortes anteriores. Lee los dos números del corte de paralaje sobre error.`,
      fields: [
        { label: 'Quitadas solo por paralaje sobre error' },
        { label: 'Quitadas tras el límite de magnitud' },
      ],
    },
    'which-way-it-pushes': {
      title: 'En qué sentido empuja un corte',
      body: `La paralaje media de los miembros es 0,4303 mas con todos los cortes desactivados y 0,4349 mas con paralaje sobre error de al menos 10. La distancia baja de 2,324 a 2,299 kpc.`,
      prompt: '¿Por qué el corte sube la paralaje media?',
      options: [
        'Las estrellas débiles están más lejos',
        'Las estrellas más brillantes tienen paralajes mayores',
        'El punto cero se aplicó dos veces',
        'El corte conserva las estrellas cuya paralaje medida salió alta respecto de su error, y descarta algunas cuya paralaje salió baja',
      ],
      hints: [
        'Los miembros comparten una paralaje verdadera. Un corte en la paralaje medida sobre su error trata distinto una medición baja y una alta.',
      ],
      because:
        'Una estrella con un error grande solo puede pasar el corte si su paralaje medida es alta; una cuya medición salió baja lo suspende. Las estrellas que quedan en el extremo débil son las altas, así que su media queda por encima de la paralaje verdadera del cúmulo. Los miembros están a una distancia, así que ni el brillo ni la distancia lo explican, y el punto cero se aplica una vez, por estrella.',
      misconceptions: [
        {
          say: 'Estas estrellas son miembros de un cúmulo, a una distancia con una paralaje verdadera. El brillo de una estrella no cambia su distancia.',
        },
      ],
    },
    'the-zero-point-under-cuts': {
      title: 'El punto cero depende de las estrellas que se conservan',
      body: `El punto cero es función de la magnitud, el color y la latitud de una estrella, así que su media sobre las estrellas conservadas depende de cuáles sean. Con todos los cortes desactivados el panel lee un punto cero medio de −0,0368 mas. Conserva solo las estrellas con paralaje sobre error de al menos 10 y léelo otra vez.`,
      fields: [{ label: 'Punto cero medio de las estrellas usadas' }],
    },
    'the-velocity-scatter': {
      title: 'Velocidades a la distancia del cúmulo',
      body: `Cambia la imagen a velocidades. A la distancia del cúmulo el movimiento propio de cada miembro es una velocidad a través del cielo, 4,74 km/s por mas/año a 1 kpc. Con todos los cortes desactivados, lee la dispersión de las velocidades de los miembros según la ascensión recta. Incluye los errores de medida, así que es un límite superior de la rapidez con que se mueven las estrellas entre sí.`,
      fields: [{ label: 'Dispersión según la ascensión recta' }],
    },
    'answer-a-colleague': {
      title: 'El consejo de un colega',
      body: `Un colega dice: «usa solo las estrellas con paralaje sobre error de al menos 10, las limpias, para la distancia del cúmulo».`,
      prompt:
        'Responde en pocas frases, con los números del panel: ¿qué le hace ese corte a la distancia, y por qué?',
      rubric:
        'Crédito por los números (2,324 kpc sin corte y 2,299 con el corte; intervalos de 2,316 a 2,332 y de 2,291 a 2,308 que no se solapan); por decir que seleccionar por la paralaje medida sobre su error conserva mediciones altas y por tanto baja la distancia; y por decir que una muestra más precisa no es una muestra mejor. No se da crédito a una respuesta que diga que el corte quita ruido y por tanto mejora la respuesta.',
      rubricCriteria: [
        {
          name: 'Dice qué hace el corte a la distancia',
          levels: [
            {
              label: 'Completo',
              text: 'Dice que la distancia baja de 2,324 a 2,299 kpc y que los dos intervalos no se solapan.',
            },
            {
              label: 'En parte',
              text: 'Dice que la distancia cambia, sin los números.',
            },
            { label: 'Aún no', text: 'Dice que no cambia o que mejora.' },
          ],
        },
        {
          name: 'Da la razón',
          levels: [
            {
              label: 'Completo',
              text: 'Dice que el corte es en la paralaje medida, así que conserva mediciones altas, y que una muestra precisa puede seguir sesgada.',
            },
            {
              label: 'Aún no',
              text: 'No da razón, o dice solo que se quita ruido.',
            },
          ],
        },
        {
          name: 'Usa bien los intervalos',
          levels: [
            {
              label: 'Completo',
              text: 'Dice que los intervalos estadísticos no contienen el movimiento, y que sigue sin haber suelo sistemático.',
            },
            {
              label: 'Aún no',
              text: 'Trata los intervalos como toda la incertidumbre.',
            },
          ],
        },
        {
          name: 'Responde al colega',
          levels: [
            { label: 'Completo', text: 'Contesta al consejo en pocas frases.' },
            { label: 'Aún no', text: 'No contesta.' },
          ],
        },
      ],
    },
    'far-stars-need-to-be-bright': {
      title: 'Las estrellas lejanas deben ser brillantes',
      body: `Un límite de magnitud deja pasar una estrella por su brillo aparente. En la validación, una muestra sintética de estrellas idénticas repartidas uniformemente en el espacio y recortadas en un límite de magnitud dio recuentos cuyo logaritmo crece con el límite con una pendiente de 0,600 por magnitud, el valor euclídeo de 0,6 (tramo S1).`,
      prompt:
        '¿Qué le hace un límite de magnitud a las estrellas a gran distancia?',
      options: [
        'Nada: la distancia y el brillo no están relacionados',
        'Conserva solo las estrellas más cercanas de todo tipo',
        'Conserva solo las intrínsecamente brillantes: una estrella débil pasa solo si está cerca, así que la muestra no es completa en distancia',
        'Hace que toda estrella de la muestra tenga el mismo brillo',
      ],
      hints: [
        'Una estrella al doble de distancia parece cuatro veces más débil. ¿Qué estrellas pueden seguir pasando un límite fijo al doble de distancia?',
      ],
      because:
        'Solo las luminosas. A mayor distancia una estrella de cierta luminosidad es más débil, así que pasada cierta distancia solo pasan el límite las estrellas bastante brillantes y la muestra se vuelve rala por distancia y luminosidad a la vez. Una previa que supone que la muestra es completa en un intervalo de distancias, como la de la primera investigación, no la describe.',
    },
    'the-diagram-changes-shape': {
      title: 'El diagrama cambia de forma',
      body: `Pulsa «Solo estrellas brillantes» (G menor que 15). El diagrama conserva el desvío, las gigantes y la parte alta de la secuencia principal. Un estudiante cuenta estrellas por intervalos de magnitud en este diagrama para hallar la función de luminosidad del cúmulo.`,
      prompt: '¿Qué falla en eso?',
      options: [
        'Los recuentos terminan en el límite: la secuencia principal débil la quitó un corte, no falta en el cúmulo, así que la función queda truncada',
        'Nada: las estrellas que quedan son una muestra justa del cúmulo',
        'Las gigantes se cuentan dos veces',
        'No se permite contar en un diagrama color-magnitud',
      ],
      hints: [
        '¿Dónde queda la banda naranja de estrellas quitadas en el diagrama?',
      ],
      because:
        'El extremo débil falta por el corte: se han ido 755 de 993 estrellas. Una función de luminosidad sacada de este diagrama cae a cero en el límite y no dice nada de estrellas más débiles. La forma de un diagrama es una propiedad de la muestra y de su selección tanto como del cúmulo.',
    },
    'what-the-pack-already-cut': {
      title: 'Un corte hecho antes de ver los datos',
      body: `La consulta del propio paquete tenía 1.048 estrellas más brillantes que G = 17,5 en el campo y conservó las 993 con RUWE menor que 1,4: ya había descartado 55. El deslizador de RUWE del panel empieza en 1,4, así que ahí no hace nada; llevarlo a 1,1 quita 168 más.`,
      prompt: '¿Qué te dice eso de una muestra de un catálogo?',
      options: [
        'El paquete no es de Gaia',
        'RUWE no es un corte de verdad',
        'El corte de RUWE en 1,1 del panel es el primero que se hace a estas estrellas',
        'Los cortes se acumulan: algunos se hicieron antes de empezar un estudio, y las estrellas que quitaron no pueden verse ni contarse aquí',
      ],
      hints: [
        '¿De qué corte es resultado el 55, y podrías deshacerlo en el panel?',
      ],
      because:
        'El primer corte se hizo al construir el paquete. Un estudio trabaja con estrellas que ya pasaron varios cortes, y el panel puede añadir cortes pero nunca quitar uno: las 55 con RUWE de 1,4 o más no están en la tabla. Decir qué es una muestra supone enumerar todos los cortes, incluidos los hechos antes de que los datos llegaran a ti.',
    },
    'a-pack-that-gives-no-distance': {
      title: 'Un paquete que no da distancia',
      body: `Gravitas tiene una segunda muestra de Gaia, estrellas cercanas al Sol con velocidades radiales, pero sus paralajes están redondeadas a 0,02 mas. En la validación, el 80 por ciento de sus 1.570 estrellas se redondeó en más de una décima de su error de paralaje (el mayor redondeo fue 0,00999 mas; tramo E3). El panel no la usa.`,
      prompt: '¿Por qué no se toma ninguna distancia de ella?',
      options: [
        'Sus estrellas están demasiado cerca para la paralaje',
        'El redondeo es un error de medida que el error del catálogo no contiene, y para la mayoría de sus estrellas es una parte visible del error',
        'Las velocidades radiales no pueden combinarse con paralajes',
        'Sus estrellas son demasiado brillantes para Gaia',
      ],
      hints: [
        '¿Qué le hace redondear a 0,02 mas a un error de paralaje de 0,01 mas?',
      ],
      because:
        'El redondeo es un error de hasta 0,01 mas del que el error de paralaje citado no sabe nada. Para el 80 por ciento de esas estrellas supera una décima del error, así que una distancia tomada del valor redondeado llevaría un error que el intervalo no podría declarar. El paquete del cúmulo es preciso; este es para velocidades.',
    },
    'say-what-the-sample-is': {
      title: 'Di qué es la muestra',
      body: `Escribe la frase de métodos para una distancia a NGC 2420 tomada de estrellas con paralaje sobre error de al menos 10: qué son las estrellas y cada corte que pasaron, el punto cero y qué incluye y qué no incluye el intervalo.`,
      prompt:
        'Escribe la frase, con los cortes, el número de estrellas, la distancia y sus etiquetas.',
      rubric:
        'Crédito por nombrar los cortes propios del paquete (G menor que 17,5, RUWE menor que 1,4, 55 descartadas) y el corte añadido (paralaje sobre error de al menos 10, quedan 480 de 993 estrellas); por la distancia 2,299 kpc con un intervalo estadístico de 2,291 a 2,308 rotulado como solo estadístico y sin suelo sistemático; por decir que el punto cero se aplicó por estrella con su propia incertidumbre desconocida aquí; y por decir que la distancia no está validada con la de un catálogo publicado. No se da crédito a una frase sin cortes.',
      rubricCriteria: [
        {
          name: 'Enumera todos los cortes',
          levels: [
            {
              label: 'Completo',
              text: 'Nombra los cortes del paquete (G menor que 17,5, RUWE menor que 1,4) y el añadido (paralaje sobre error de al menos 10).',
            },
            {
              label: 'Aún no',
              text: 'Nombra solo el corte añadido, o ninguno.',
            },
          ],
        },
        {
          name: 'Da la distancia con sus etiquetas',
          levels: [
            {
              label: 'Completo',
              text: 'Da 2,299 kpc, de 2,291 a 2,308 como solo estadístico, sin suelo sistemático.',
            },
            { label: 'En parte', text: 'Da el valor sin las etiquetas.' },
            { label: 'Aún no', text: 'No da ningún valor.' },
          ],
        },
        {
          name: 'Dice qué no se hizo',
          levels: [
            {
              label: 'Completo',
              text: 'Dice que la distancia no se ha comprobado con la de un catálogo publicado, y que no se conoce la incertidumbre del punto cero.',
            },
            { label: 'Aún no', text: 'No dice nada de validación.' },
          ],
        },
        {
          name: 'Dice qué hizo el corte',
          levels: [
            {
              label: 'Completo',
              text: 'Dice que el corte movió la distancia desde 2,324 kpc más que el intervalo estadístico.',
            },
            { label: 'Aún no', text: 'No lo dice.' },
          ],
        },
      ],
    },
  },
};
