export const WEIGHING_THE_STARS_ES = {
  title: 'Pesar las estrellas, de verdad',
  subtitle:
    'Pesa dos estrellas con el efecto Doppler de su luz y un eclipse, mira por qué las velocidades solas dan solo un mínimo y coloca las estrellas que pesaste en el diagrama masa-radio',
  objectives: [
    'Decir que la estrella con la menor amplitud de velocidad es la más pesada, y leer el cociente de masas a partir de dos amplitudes',
    'Decir por qué las velocidades solas dan solo una masa mínima y qué añade el eclipse',
    'Leer las masas y los radios de un par eclipsante con sus incertidumbres, y decir de dónde viene la incertidumbre',
    'Decir qué da una sola línea (la función de masa) y qué no da (una masa)',
  ],
  steps: {
    'two-stars-one-center': {
      title: 'Dos estrellas, un centro',
      body: 'Dos estrellas giran en torno al punto que queda quieto entre ellas, su <strong>centro de masas</strong>. La luz de cada estrella se desplaza por el efecto Doppler al acercarse y alejarse de nosotros: las curvas del panel son las velocidades de las dos estrellas a lo largo de la visual frente a la fase de la órbita, a partir de un espectro de dos líneas, con una velocidad medida de cada estrella cada noche. Cuando la estrella 1 se aleja, la 2 se acerca.\n\nLas estrellas son un modelo, los datos son sintéticos y el panel lo dice. Lo que las curvas pueden y no pueden decir de las masas es esta investigación.',
    },
    'who-moves-faster': {
      title: '¿Quién se mueve más deprisa?',
      body: 'El centro de masas está entre las estrellas, más cerca de una de ellas. Antes de leer las curvas, decide cuál de las dos oscila con mayor velocidad.',
      prompt: 'La estrella con mayor amplitud de velocidad es&hellip;',
      options: [
        'La más ligera, porque el centro de masas está más cerca de la más pesada y la ligera tiene que recorrer más en el mismo tiempo',
        'La más pesada, porque tiene más energía con que moverse',
        'Ninguna: la gravedad es mutua, así que las dos se mueven siempre igual de deprisa',
        'La más brillante, porque el brillo mide la velocidad',
      ],
      hints: [
        'Las dos estrellas completan una órbita en el mismo tiempo. La que tiene el círculo mayor tiene que ir más deprisa.',
      ],
      because:
        'Las dos estrellas giran en torno a su centro de masas en el mismo tiempo. El centro está más cerca de la más pesada, que recorre el círculo menor, y la más ligera el mayor, lo que exige más velocidad. En números, las masas son inversamente proporcionales a las amplitudes de velocidad: M1 K1 = M2 K2. Las fuerzas son iguales y opuestas, y también los momentos; las velocidades no son iguales, porque la estrella más ligera necesita más velocidad para el mismo momento.',
    },
    'read-the-amplitudes': {
      title: 'Lee las amplitudes',
      body: 'El panel ajusta una órbita a las velocidades de las dos estrellas. Lee la <strong>semiamplitud</strong> de cada curva, K1 para la estrella 1 y K2 para la estrella 2, en km/s: la mitad de la distancia entre la velocidad más alta y la más baja.',
      fields: [{ label: 'K1 (estrella 1)' }, { label: 'K2 (estrella 2)' }],
    },
    'the-mass-ratio': {
      title: 'El cociente de masas',
      body: 'Las amplitudes son K1 = 45,2 y K2 = 61,0 km/s.',
      prompt: '¿Cuánto vale el cociente de masas M2 / M1?',
      options: [
        'K1 / K2 = 0,74: la estrella 2 pesa unos tres cuartos de la estrella 1',
        'K2 / K1 = 1,35: la estrella 2 es más pesada',
        'Unos 0,55, el cuadrado de K1 / K2, porque la gravedad es una ley del inverso del cuadrado',
        'No se puede decir sin la inclinación',
      ],
      hints: ['Momentos iguales: M1 K1 = M2 K2. Despeja M2 / M1.'],
      because:
        'El centro de masas no se mueve, así que los momentos de las estrellas son iguales y opuestos: M1 K1 = M2 K2, y M2 / M1 = K1 / K2 = 0,74. La inclinación de la órbita reduce las dos amplitudes en el mismo factor, sen i, que se cancela en el cociente: el cociente de masas de un par de dos líneas no necesita la inclinación.',
      misconceptions: [
        {
          say: 'Es el cociente al revés. La estrella que oscila más deprisa es la más ligera, así que su masa es la menor.',
        },
        {
          say: 'Aquí nada se eleva al cuadrado: los momentos son iguales, y el momento es masa por velocidad.',
        },
        {
          say: 'La inclinación reduce las dos amplitudes en el mismo factor, que se cancela en su cociente. Las masas mismas necesitan la inclinación; el cociente no.',
        },
      ],
    },
    'a-mass-or-a-limit': {
      title: 'Una masa, o solo un límite',
      body: 'Las dos amplitudes y el periodo dan el tamaño de la órbita por <strong>sen i</strong> y, con la tercera ley de Kepler, las masas por <strong>sen³ i</strong>: con i = 90&deg;, de canto, 0,582 y 0,432 masas solares. La inclinación <em>i</em> de la órbita no está en las velocidades. Pon la inclinación que supones en <strong>60&deg;</strong> y lee qué serían las masas.',
      fields: [
        { label: 'Masa de la estrella 1 a 60 grados' },
        { label: 'Masa de la estrella 2 a 60 grados' },
      ],
    },
    'what-fixes-the-tilt': {
      title: 'Qué fija la inclinación',
      body: 'Ahora hay un par que se eclipsa en el panel: el mismo tipo de órbita, con la curva de luz junto a las curvas de velocidad.',
      prompt: '¿Por qué nos dice la inclinación un eclipse?',
      options: [
        'Las estrellas solo pasan una delante de la otra si la órbita se ve casi de canto, y la forma del eclipse dice cuánto de cerca',
        'Un eclipse hace más brillantes las estrellas, y el brillo mide la inclinación',
        'Un eclipse alarga el periodo, lo que da la inclinación',
        'No lo dice: la inclinación solo puede venir de más velocidades',
      ],
      because:
        'Para que las estrellas se eclipsen, la órbita debe verse casi de canto. La profundidad y la duración de un eclipse dependen de la inclinación con una precisión de menos de una centésima de grado, y con i conocida las masas ya no son valores mínimos: M = M sen³ i / sen³ i, y sen i es casi 1.',
      misconceptions: [
        {
          say: 'Un eclipse quita luz, y lo que fija la geometría es la forma de lo perdido, no solo su cantidad.',
        },
        {
          say: 'Más velocidades de la misma órbita reducen el mismo sen i; no pueden separarlo de las masas. La curva de luz es otro tipo de medida.',
        },
      ],
    },
    'what-the-pair-gives': {
      title: 'Lo que da el par y lo que deja abierto',
      body: 'Las dos amplitudes dieron la <strong>razón de masas</strong> y las velocidades solas dieron solo <strong>masas mínimas</strong>. El eclipse añadió la inclinación y, con ella, las masas mismas y los radios, cada uno con la incertidumbre que arrastra todo el ajuste. Quita el eclipse, o una de las dos líneas, y la respuesta vuelve a ser un mínimo o una función de masa. \n\nLos niveles más profundos pesan el par con sus incertidumbres, sitúan las estrellas en los diagramas masa-radio y masa-luminosidad, y miran una estrella real.',
    },
  },
};

export const WEIGHING_THE_STARS_DEEPER_ES = {
  steps: {
    'weigh-the-pair': {
      title: 'Pesa el par',
      body: 'El panel ajusta a la vez la curva de luz del eclipse y las dos curvas de velocidad, con una sola órbita para las tres (<em>el par de estrellas F</em>, sintético). Lee las masas de las dos estrellas y la incertidumbre de la primera, en unidades de 0,001 masas solares.',
      fields: [
        { label: 'M1' },
        { label: 'M2' },
        { label: 'Incertidumbre de M1 (en unidades de 0,001)' },
      ],
    },
    'where-the-uncertainty-comes-from': {
      title: 'De dónde viene la incertidumbre',
      body: 'La masa de la estrella 1 se conoce al 0,6 por ciento. El panel dice que la inclinación aporta el 0,000 por ciento de la varianza de esa masa.',
      prompt: '¿De dónde viene la incertidumbre de las masas?',
      options: [
        'De las velocidades: el eclipse fija la inclinación tan bien que sen³ i es una constante para las masas, y lo que queda son los errores de las amplitudes',
        'Del eclipse, porque una curva de luz es menos precisa que un espectro',
        'De la distancia a las estrellas, que una binaria necesita para sus masas',
        'Del oscurecimiento del limbo, que cambia la inclinación',
      ],
      misconceptions: [
        {
          say: 'La curva de luz fija aquí la inclinación a 0,01 grados, y cerca de 89 grados una centésima de grado cambia sen³ i en una parte por millón.',
        },
        {
          say: 'Una binaria eclipsante no necesita distancia para sus masas ni sus radios: bastan velocidades, un periodo y un eclipse. Por eso estas estrellas son el cimiento de la astrofísica estelar.',
        },
      ],
      hints: [
        '¿Cuánto cambia sen³ i entre 89,2 y 89,21 grados? Compáralo con los 0,3 km/s de cada amplitud.',
      ],
      because:
        'El ajuste arrastra la covarianza de todo: la parte de la varianza de M1 que corresponde a la inclinación es una millonésima de un por ciento. La incertidumbre de las masas es la de K1 y K2 (0,3 km/s de 46 y 61) y la del periodo, por eso mejoran con más espectros, no con más fotometría.',
    },
    'one-line-only': {
      title: 'Una sola línea',
      body: 'Pon <em>Estrellas con curva de velocidad</em> en <em>una (de una sola línea)</em>: solo se midieron las líneas de la estrella más brillante. El ajuste devuelve ahora la <strong>función de masa</strong>, f = M2³ sen³ i / (M1 + M2)², y, para la masa primaria de 1,30 masas solares que te dan, el menor compañero que podría producirla. Lee ambas.',
      fields: [
        { label: 'Función de masa' },
        { label: 'Masa mínima del compañero' },
      ],
    },
    'on-the-diagram': {
      title: 'En el diagrama',
      body: 'El diagrama masa-radio contiene las ocho estrellas de los cuatro pares eclipsantes que puedes resolver en el panel anterior, frente a las trayectorias MIST: la línea inferior es una estrella recién nacida en la secuencia principal y la superior una en su final. Lee la masa y el radio de la <strong>estrella más ligera del par caliente</strong> (sistema D, estrella 2).',
      fields: [{ label: 'Masa' }, { label: 'Radio' }],
    },
    'the-mass-luminosity-slope': {
      title: 'La pendiente masa-luminosidad',
      body: 'Cambia el eje vertical a <em>luminosidad</em>. Lee la luminosidad de la estrella más pesada del par caliente (D1, 2,6 masas solares) y de la más pesada del par de estrellas F (A1, 1,3), y calcula el exponente <strong>n</strong> de L ∝ M<sup>n</sup> entre ellas: n = log(L<sub>D1</sub>/L<sub>A1</sub>) / log(M<sub>D1</sub>/M<sub>A1</sub>).',
      fields: [
        { label: 'Luminosidad de D1' },
        { label: 'Luminosidad de A1' },
        { label: 'Exponente n' },
      ],
    },
    'the-tilt-you-did-not-measure': {
      title: 'La inclinación que no mediste',
      body: 'De vuelta en el panel de masas mínimas, el par que nunca se eclipsa está en realidad inclinado <strong>52&deg;</strong> respecto de la visual (la verdad, que los datos no contienen). Pon la inclinación que supones en 52&deg; y lee M1 y M2, y calcula cuántas veces es la masa verdadera la mínima: <strong>1 / sen³ i</strong>.',
      fields: [
        { label: 'M1 a 52 grados' },
        { label: 'M2 a 52 grados' },
        { label: 'Masa verdadera sobre masa mínima' },
      ],
    },
    'the-real-star': {
      title: 'Una estrella real: V505 Persei',
      body: 'V505 Persei es un par real de estrellas F5 que se eclipsan cada 4,22 días. Southworth (2021, <em>The Observatory</em> 141, 122) tomó sus amplitudes de velocidad, <strong>89,12</strong> y <strong>90,31 km/s</strong>, de espectros publicados. Hicimos correr esta cadena sobre la curva de luz de TESS del sector 18 con esas dos amplitudes: masas de 1,2745 y 1,2577 masas solares, las publicadas 1,2745 &plusmn; 0,0036 y 1,2577 &plusmn; 0,0030, y radios de 1,2929 &plusmn; 0,0015 y 1,2679 &plusmn; 0,0015 frente a los publicados 1,2941 &plusmn; 0,0016 y 1,2637 &plusmn; 0,0017. El radio de la segunda estrella está a 2,4 desviaciones típicas publicadas; la prueba admitía 2.',
      prompt: '¿Qué debes concluir?',
      options: [
        'La cadena funciona en una estrella real en lo que comparte con el análisis publicado, las masas salen de las mismas amplitudes; el único radio que difiere está en el borde de lo que un modelo de curva de luz más simple puede afirmar, y la prueba se registra como fallida y no se ajusta',
        'El método es erróneo, porque un número queda fuera de dos desviaciones típicas',
        'El radio publicado es erróneo, porque el nuestro está más cerca de los datos',
        'Las masas coinciden, así que los radios también deben ser correctos',
      ],
      misconceptions: [
        {
          say: 'Un número a 2,4 desviaciones típicas entre cinco que coinciden es un resultado que registrar, no un veredicto sobre el método; el modelo de aquí no tiene efecto de reflexión ni ajusta líneas fuera del eclipse, que el análisis publicado sí.',
        },
        {
          say: 'No se sabe que ninguno de los dos análisis esté más cerca de la verdad: usan modelos distintos de la misma curva de luz, y el publicado es el más completo.',
        },
        {
          say: 'Las masas salen de las mismas amplitudes de velocidad y del periodo, así que coinciden diga lo que diga la curva de luz; no dicen nada de los radios, que salen de los eclipses.',
        },
      ],
      hints: [
        '¿Cuáles de los cinco números dependen de la curva de luz y cuáles solo de las velocidades?',
      ],
      because:
        'Las masas y el tamaño de la órbita salen de las amplitudes de velocidad y del periodo, que son los mismos en los dos análisis, así que su coincidencia comprueba la aritmética y las constantes de la cadena y no la curva de luz. Los radios salen de los eclipses, y el modelo simple de dos esferas usado aquí, sin efecto de reflexión ni líneas ajustadas fuera del eclipse, coincide para una estrella y queda a 2,4 desviaciones típicas del valor publicado para la otra. La validación lo registra como una prueba fallida y la mantiene fallida.',
    },
    'what-the-chain-leaves-out': {
      title: 'Lo que una prueba superada no dice',
      body: 'El ajuste conjunto del par de estrellas F tiene un chi-cuadrado reducido de 0,94 y ningún ruido correlacionado: supera la prueba de los residuos.',
      prompt: '¿Qué dice eso de las masas?',
      options: [
        'Que el modelo describe los datos hasta sus barras de error; no dice que las velocidades estén libres de un error que las barras de error omiten, como un desajuste de plantilla entre los espectros de las dos estrellas',
        'Que las masas son exactas',
        'Que la inclinación es la correcta',
        'Nada, porque un ajuste que pasa siempre está mal',
      ],
      misconceptions: [
        {
          say: 'Las masas se conocen con la incertidumbre que da el panel, un 0,6 por ciento, y solo si las barras de error son correctas. Una prueba superada es evidencia a favor de las barras de error, no una demostración.',
        },
        {
          say: 'La prueba mira la dispersión de los residuos. Una inclinación ligeramente errónea puede superarla: por eso la incertidumbre de la inclinación se da aparte.',
        },
        {
          say: 'Una prueba superada es lo que da un modelo correcto. Lo que no puede es ir más allá de los datos y de las barras de error que se le dieron.',
        },
      ],
      hints: [
        'La prueba compara la dispersión con las barras de error. ¿Y si las barras de error son demasiado pequeñas?',
      ],
      because:
        'Un desplazamiento de velocidad entre las líneas de las dos estrellas (un desajuste de plantilla, o el corrimiento al rojo gravitacional de una estrella compacta) mueve K2 y con ella las dos masas, y el ajuste puede absorber parte en la velocidad sistémica. Las barras de error son de quien midió y el modelo tiene las estrellas como dos esferas en una órbita, así que lo que omite está en las notas del modelo, no en la prueba. Las masas de las binarias eclipsantes de dos líneas reales se dan con unas pocas décimas por ciento por estos motivos, y solo cuando coinciden varios análisis.',
    },
    'how-small-is-the-photocentre': {
      title: 'La elipse de la luz',
      body: 'El sistema A es un par visual cuyas dos estrellas el telescopio no puede separar, así que solo ve un punto, el <strong>fotocentro</strong>, el centro de la luz. Pon <em>Lo que se ve</em> en <em>un fotocentro</em>. La órbita ajustada de ese punto tiene un semieje mayor de 0,090 segundos de arco; la órbita propia del par, dibujada en gris desde la verdad, tiene 0,300. El compañero lleva el 10 por ciento de la luz y el 40 por ciento de la masa.',
      prompt: '¿Por qué la elipse del fotocentro es 0,30 de la del par?',
      options: [
        'El fotocentro está a (l − B) veces la separación del centro de masas, la fracción de luz menos la fracción de masa: 0,10 − 0,40 = −0,30, la misma elipse reducida por 0,30 y girada media vuelta',
        'El ajuste es malo, porque las estrellas no están resueltas',
        'El paralaje reduce todas las órbitas en el mismo factor',
        'El compañero es oscuro, así que el fotocentro sigue solo la órbita propia de la primaria',
      ],
      misconceptions: [
        {
          say: 'El ajuste es bueno: la órbita es cerrada y los residuos están al nivel del ruido. La elipse es pequeña por dónde está el centro de la luz, no por el ajuste.',
        },
        {
          say: 'El paralaje convierte el ángulo en una distancia; no cambia la forma de la órbita en el cielo, y la órbita gris está dibujada en los mismos segundos de arco.',
        },
        {
          say: 'Un compañero oscuro pondría el fotocentro sobre la primaria y daría 0,40 de la órbita del par, la propia de la primaria. Aquí el compañero lleva una décima de la luz, que mueve un poco el centro de la luz hacia él.',
        },
      ],
      hints: [
        'El centro de masas está a 0,40 del camino de la primaria al compañero. ¿Dónde está el centro de la luz?',
      ],
      because:
        'El centro de masas está a 0,40 del camino de la estrella 1 a la estrella 2, y el centro de la luz a 0,10. El fotocentro está pues a 0,40 − 0,10 = 0,30 de la separación del centro de masas, del lado de la primaria, y al girar el par traza la misma elipse reducida por 0,30. Ese es todo el contrato: el eje de la órbita del fotocentro es |B − l| veces el del par, y su función de masa es la masa del par por |B − l| al cubo, no una masa.',
    },
    'weigh-a-visual-pair': {
      title: 'Pesa un par resuelto',
      body: 'Pon <em>Lo que se ve</em> en <em>dos resueltas</em> (sistema A, una señal a ruido del paralaje de 20). El movimiento propio de cada estrella alrededor del centro de masas en movimiento da la <strong>fracción de masa</strong> de la estrella 2, y la órbita con el paralaje da la <strong>suma de masas</strong>. Lee las dos.',
      fields: [
        { label: 'Fracción de masa de la estrella 2' },
        { label: 'Suma de masas' },
      ],
    },
    'two-roots-for-the-companion': {
      title: 'Dos compañeros ajustan una órbita',
      body: 'El sistema B tiene dos estrellas casi iguales, y el telescopio ve un solo fotocentro. La órbita del fotocentro en el panel es diminuta, 0,031 segundos de arco frente a los 0,410 del par, y con la fracción de luz (0,40) y la masa de la primaria (1,10) que usted declara, lista <strong>dos</strong> masas del compañero, 0,98 y 0,53 masas solares.',
      prompt: '¿Por qué dos, y qué elegiría entre ellas?',
      options: [
        'La órbita fija |B − l| y no su signo: el compañero puede llevar más de la masa que de la luz (0,98) o menos (0,53); elegiría una órbita resuelta, una razón de masas de las velocidades radiales, o saber que la estrella más débil es también la más ligera',
        'Un arco más largo de la misma órbita del fotocentro elegiría',
        'Un paralaje más preciso elegiría',
        'Una raíz es un error de redondeo del solucionador',
      ],
      misconceptions: [
        {
          say: 'Un arco más largo afina la misma elipse; las dos raíces siguen, porque la media vuelta que añadiría el otro signo es la ambigüedad del nodo que tiene toda órbita en el cielo.',
        },
        {
          say: 'Un mejor paralaje estrecha el intervalo de cada raíz y deja las dos raíces: la ambigüedad está en el signo de l − B, no en el tamaño de la órbita.',
        },
        {
          say: 'Las dos raíces resuelven la misma ecuación, M1 |B − l|³ / (1 − B) = f, una con B por encima de l y otra con B por debajo; el módulo devuelve las dos y marca la segunda como ambigua.',
        },
      ],
      hints: [
        'La elipse del fotocentro se reduce por l − B. ¿Qué le pasa a la órbita cuando ese número cambia de signo?',
      ],
      because:
        'La órbita del fotocentro con un paralaje fija la función de masa f = (M1 + M2) |B − l|³ y el signo de l − B solo gira la elipse media vuelta, que una órbita en el cielo no distingue del nodo de la propia órbita. En este par el compañero verdadero (1,00 masas solares, B = 0,476) es la primera raíz; un compañero más ligero que su parte de la luz sería la segunda. Cuál vale es un dato más, y el panel no lo adivina.',
    },
  },
};
