// La cuestión de Ricitos de Oro, más a fondo: las palabras en español, paso a
// paso con ../goldilocks-question.js (Prompt 205, parte B). Sin lectura por una
// persona que lea español con fluidez.
export default {
  steps: [
    {
      title: 'Los bordes son cantidades de luz estelar',
      body: 'Cada borde que has usado era una distancia. Detrás de cada distancia hay una cantidad de luz estelar, en Tierras, que un ajuste climático publicado dice que un planeta de una masa terrestre puede soportar. La distancia sale de la luminosidad de la estrella y de la ley del inverso del cuadrado que escribiste al principio; la cantidad de luz estelar es la del propio ajuste.\n\nEl panel muestra los cuatro límites para el Sol. Lee la luz estelar en el límite del <strong>efecto invernadero desbocado</strong> (el borde interior de la zona conservadora) y en el del <strong>efecto invernadero máximo</strong> (el borde exterior).',
      fields: [
        {
          label: 'Luz estelar en el límite del invernadero desbocado (Tierras)',
        },
        { label: 'Luz estelar en el límite del invernadero máximo (Tierras)' },
      ],
      tool: {
        title: 'Cuatro límites para el Sol',
        note: 'Cada punto es un límite: cuánta luz estelar y a qué distancia. Las filas de abajo dan primero la cantidad de luz estelar.',
      },
    },
    {
      title: 'El mismo límite junto a una estrella tenue',
      body: 'Elige <strong>una enana M (3200 K)</strong>, una estrella con cerca del 0,4 por ciento de la luminosidad del Sol. Lee la luz estelar en su límite del invernadero desbocado y la distancia a la que un planeta la recibe.\n\nLa cantidad de luz estelar cambia poco de una estrella a otra (el ajuste depende débilmente de la temperatura de la estrella). La distancia cambia mucho, porque cambia la luminosidad.',
      fields: [
        {
          label: 'Luz estelar en el límite del invernadero desbocado (Tierras)',
        },
        { label: 'Distancia de ese límite' },
      ],
      tool: {
        title: 'El mismo límite, una estrella tenue',
        note: 'El eje de distancia se reescala a la estrella. La posición horizontal de cada punto es su distancia; su altura es la cantidad de luz estelar.',
      },
    },
    {
      title: 'Una estrella para la que el ajuste no se hizo',
      body: 'Elige ahora <strong>TRAPPIST-1</strong>. Su superficie está a 2566 K, algo más fría que la estrella más fría para la que se calibró el ajuste publicado, 2600 K.',
      prompt:
        '¿Qué da el panel como límites de la zona habitable de TRAPPIST-1?',
      options: [
        'Los mismos límites que para el Sol, escalados por su luminosidad',
        'Límites de la temperatura calibrada más cercana, 2600 K, marcados como una estimación',
        'Ningún límite: dice que la estrella está fuera del intervalo de temperatura del ajuste',
        'Límites de cero, porque la estrella es muy tenue',
      ],
      because:
        'Ningún límite. El ajuste es un polinomio en la temperatura de la estrella, calibrado de 2600 K a 7200 K, y un polinomio llevado más allá de sus datos no falla con elegancia. El panel se niega en lugar de dar un número que no puede respaldar. El anillo que dibuja la simulación para TRAPPIST-1 evalúa el ajuste a la temperatura calibrada más cercana y lo marca como extrapolación; es una decisión para una imagen, y no es lo mismo que el ajuste cubra la estrella.',
      tool: {
        title: 'TRAPPIST-1, fuera del ajuste',
        note: 'El panel nombra la temperatura que recibió y el intervalo que cubre el ajuste.',
      },
    },
    {
      title: 'La zona a tres edades',
      body: 'Una estrella no conserva su luminosidad. El panel sigue una estrella modelo de una masa solar a lo largo de una pista de evolución publicada y dibuja su zona conservadora frente a la edad. Lee el <strong>borde interior</strong> a 1, 4,57 y 8 miles de millones de años; los botones fijan cada edad.\n\nLa edad se cuenta desde el comienzo de la pista del modelo, y esta es una estrella <em>modelo</em>: es un 11 por ciento más brillante que el Sol a la edad del Sol.',
      fields: [
        { label: 'Borde interior a 1000 millones de años' },
        { label: 'Borde interior a 4570 millones de años' },
        { label: 'Borde interior a 8000 millones de años' },
      ],
      tool: {
        title: 'Una estrella modelo y su zona',
        note: 'La línea violeta es el borde interior y la azul el borde exterior. La línea verde de trazos es 1 UA.',
      },
    },
    {
      title: 'La Tierra en la zona de la estrella modelo',
      body: 'Fija la edad en <strong>4570 millones de años</strong>, la edad del Sol. El panel dice cuánta luz estelar recibe un planeta a 1 UA de esta estrella modelo y dónde cae eso frente a la zona.',
      prompt:
        '¿Dónde pone la estrella modelo la distancia de la Tierra, a la edad del Sol?',
      options: [
        'Dentro de la zona, como con el Sol real',
        'Más cerca que el borde interior: recibe algo más que el límite del invernadero desbocado',
        'Más lejos que el borde exterior',
        'El panel no puede decirlo, porque la estrella es un modelo',
      ],
      because:
        'Más cerca que el borde interior. La estrella modelo es un 11 por ciento más brillante que el Sol real a esta edad, así que un planeta a 1 UA recibe 1,11 Tierras de luz estelar, algo más que las 1,05 del límite del invernadero desbocado. El Sol le da de verdad a la Tierra 1,00. La lectura pertenece a la estrella modelo, que tiene una masa solar pero no es el Sol, y muestra cuánto depende el borde de una zona de la luminosidad que le des.',
      tool: {
        title: 'Un planeta a 1 UA, a la edad del Sol',
        note: 'El panel dice cuánta luz estelar recibe 1 UA y dónde cae eso frente a la zona conservadora.',
      },
    },
    {
      title: 'Por qué esto no es una historia del clima',
      body: 'Tres posiciones de una banda a lo largo de la pista de una estrella modelo hacen una imagen atractiva: la zona se desplaza hacia fuera, la Tierra se queda atrás y la historia parece escribirse sola. Esta investigación se detiene ahí a propósito.\n\nLo que tienes es dónde está una banda de luz estelar a tres edades. El clima de un planeta depende de mucho que esto no contiene: cuánta luz reflejan las nubes, cómo cambió la composición de la atmósfera, qué hicieron los volcanes y los océanos, si el planeta conservó su agua. Nada de eso está en los dos límites publicados, y en esta aplicación no hay ningún modelo de clima evolutivo contrastado con un código publicado. Hasta que lo haya, la afirmación honesta es la estrecha: <strong>la zona se desplaza hacia fuera a medida que la estrella brilla más, y un planeta que estuvo dentro puede ya no estarlo.</strong>\n\nNada de esto dice cuándo sale la Tierra de la zona, ni que salga.',
      tip: 'Una trayectoria es una afirmación sobre la historia de un planeta. La zona a una edad es una afirmación sobre una banda de luz estelar. Es fácil confundirlas, y la primera necesita mucho más que la segunda.',
    },
    {
      title: 'Qué zonas alcanza la marea de la estrella',
      body: 'La marea de una estrella frena el espín de un planeta cercano, más deprisa cuanto más cerca está, hasta que el planeta mantiene una cara hacia la estrella. El panel calcula el <strong>radio de acoplamiento</strong>: la distancia dentro de la cual eso ocurre en la edad de la estrella, para un planeta de tipo terrestre. Lo compara con la zona de una estrella modelo.\n\nElige <strong>0,2 masas solares</strong> a <strong>5000 millones de años</strong> con Q = 100. Lee el radio de acoplamiento y el borde interior de la zona.',
      fields: [
        { label: 'Radio de acoplamiento' },
        { label: 'Borde interior de la zona conservadora' },
      ],
      tool: {
        title: 'Una estrella tenue y su marea',
        note: 'La línea naranja es el radio de acoplamiento, con su intervalo de trazos. Las líneas violeta y azul son los bordes de la zona.',
      },
    },
    {
      title: 'Una estrella intermedia',
      body: 'Ahora <strong>0,5 masas solares</strong>, a los mismos 5000 millones de años y Q = 100. Lee el radio de acoplamiento y el borde exterior de la zona.',
      fields: [
        { label: 'Radio de acoplamiento' },
        { label: 'Borde exterior de la zona conservadora' },
      ],
      tool: {
        title: 'Una estrella intermedia',
        note: 'El radio de acoplamiento atraviesa la zona.',
      },
    },
    {
      title: '¿Qué tan seguro es ese radio?',
      body: 'El radio depende del factor de calidad de marea Q del planeta, que nadie conoce para un planeta concreto con mejor precisión que un factor de diez. El panel da el radio como un intervalo: las líneas de trazos lo muestran para una Q diez veces mayor y diez veces menor que la que fijaste.\n\nSigue con <strong>0,5 masas solares</strong>, 5000 millones de años y Q = 100. Lee el intervalo del radio de acoplamiento, de su extremo bajo a su extremo alto.',
      fields: [
        { label: 'Radio de acoplamiento si Q es diez veces mayor' },
        { label: 'Radio de acoplamiento si Q es diez veces menor' },
      ],
      tool: {
        title: 'El radio, con su intervalo',
        note: 'Las líneas naranja de trazos son el radio para una Q diez veces mayor y diez veces menor.',
      },
    },
  ],
};
