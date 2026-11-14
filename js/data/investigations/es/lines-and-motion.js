// Líneas y movimiento - español, paso a paso con ../lines-and-motion.js.
export default {
  title: 'Líneas y movimiento',
  subtitle: 'Lee las líneas de una estrella y mide a qué velocidad se mueve',
  objectives: [
    'Identificar líneas de hidrógeno y de calcio en espectros estelares reales por su longitud de onda',
    'Predecir cómo mueve las líneas el movimiento de una estrella a lo largo de la visual y medir el corrimiento',
    'Convertir un corrimiento medido en una velocidad, con su signo y su incertidumbre',
    'Decir cuándo un corrimiento es demasiado pequeño, frente a su incertidumbre, para significar algo',
    'Explicar por qué un corrimiento solo da el movimiento de acercamiento o alejamiento',
  ],
  steps: [
    {
      title: 'La luz separada por longitud de onda',
      body: 'Un cuerpo negro da una curva suave. La luz de una estrella real, extendida por longitud de onda, tiene <strong>líneas oscuras</strong> recortadas: longitudes de onda estrechas en las que los átomos de la atmósfera de la estrella absorben luz. Cada clase de átomo absorbe en sus propias longitudes de onda, así que las líneas dicen de qué está hecha la atmósfera.\n\nEl visor muestra un espectro <strong>observado</strong> de una estrella real, del Sloan Digital Sky Survey. Las marcas cortas de arriba son la lista de líneas: dónde encuentra un laboratorio cada línea cuando la fuente está en reposo. La lista bajo la gráfica nombra las caídas más profundas. Las tres estrellas del lienzo son marcadores; la luz está en el visor.',
    },
    {
      title: 'Nombra las líneas',
      body: 'El visor está en la estrella A. Las cuatro caídas más profundas de la lista están en 4.103, 4.342, 4.863 y 6.565&nbsp;Å. La lista de líneas da un nombre a cada una.',
      prompt: '¿Qué elemento produce estas cuatro líneas?',
      options: ['hidrógeno', 'calcio', 'sodio', 'hierro'],
      misconceptions: [
        {
          say: 'La línea más profunda del calcio está en 3.934 Å, en el violeta. Compara cada longitud de onda de la lista con el nombre que tiene al lado.',
        },
      ],
      hints: [
        'Lee los nombres de la lista: las cuatro comparten la inicial del mismo elemento.',
      ],
      because:
        'Hidrógeno. Las cuatro caídas son H-delta, H-gamma, H-beta y H-alfa, las líneas visibles de la serie de Balmer. Una estrella A caliente tiene la mayor parte de su hidrógeno en el estado adecuado para absorberlas.',
    },
    {
      title: 'Otra estrella, otra lista',
      body: 'Cambia el espectro a la <strong>estrella G</strong>, una estrella algo parecida al Sol, y lee otra vez la lista.',
      prompt: '¿Qué línea es ahora la más profunda?',
      options: [
        'Ca II K (calcio), en 3.935 Å',
        'H-alfa (hidrógeno), en 6.565 Å',
        'Na I D2 (sodio), en 5.892 Å',
        'H-delta (hidrógeno), en 4.103 Å',
      ],
      hints: ['La lista está ordenada por profundidad, la mayor primero.'],
      because:
        'Ca II K. En la estrella G, más fría, las líneas de hidrógeno son mucho más débiles que en la A y el calcio ionizado es la más profunda. Qué líneas muestra un espectro depende de la temperatura, así que el mismo átomo no se ve igual en todas las estrellas.',
    },
    {
      title: 'Predice el corrimiento',
      body: 'Cada línea está en una longitud de onda conocida cuando su fuente está en reposo. Una estrella se aleja directamente de nosotros a 100&nbsp;km/s. Todavía no cambies el visor.',
      prompt:
        'Comparadas con sus longitudes de onda en reposo, las líneas de la estrella aparecen&hellip;',
      options: [
        'en longitudes de onda más largas',
        'en longitudes de onda más cortas',
        'en las mismas longitudes de onda, solo más débiles',
        'divididas en dos líneas',
      ],
      hints: [
        'Una fuente que se aleja estira las ondas que nos llegan, como una sirena que se aleja baja de tono.',
      ],
      because:
        'En longitudes de onda más largas: un corrimiento al rojo. Una fuente que se aleja estira las ondas, y una que se acerca las comprime hacia longitudes de onda más cortas. El paso siguiente mide las dos cosas.',
    },
    {
      title: 'Mide dos corrimientos',
      body: 'Las estrellas sintéticas 1 y 2 son espectros calculados con un efecto Doppler que el visor no te dice. Acércate a <strong>H-alfa</strong> en cada una y lee la velocidad en la lista bajo la gráfica. El visor ajusta un continuo, halla el centro de la línea y convierte el corrimiento en una velocidad. Una velocidad negativa es hacia nosotros.',
      fields: [
        { label: 'Estrella sintética 1, con H-alfa' },
        { label: 'Estrella sintética 2, con H-alfa' },
      ],
    },
    {
      title: '¿Hacia dónde va?',
      body: 'La estrella sintética 2 tiene una velocidad negativa: su línea H-alfa está en 6.561,5 Å, por debajo de la longitud de onda en reposo de 6.564,6&nbsp;Å.',
      prompt: '¿Qué está haciendo la estrella 2?',
      options: [
        'se acerca a nosotros',
        'se aleja de nosotros',
        'se mueve por el cielo',
        'se calienta',
      ],
      hints: [
        'Una longitud de onda más corta que la de reposo es lo contrario de un corrimiento al rojo.',
      ],
      because:
        'Se acerca a nosotros. Un corrimiento a longitudes de onda más cortas, un corrimiento al azul, significa que la fuente se acerca. Que la línea esté en una longitud de onda más larga o más corta que la de reposo es toda la dirección.',
    },
    {
      title: 'De un corrimiento a una velocidad',
      body: 'Para velocidades muy inferiores a la de la luz, el cambio fraccionario de la longitud de onda de una línea es la velocidad dividida entre la de la luz: Δλ ÷ λ<sub>reposo</sub> = v ÷ c, con c = 299.792&nbsp;km/s. La línea H-beta de una estrella tiene una longitud de onda en reposo de 4.862,7&nbsp;Å y se encuentra en 4.865,0&nbsp;Å.',
      prompt: 'La velocidad de la estrella a lo largo de la visual',
      hints: [
        'Halla primero el corrimiento Δλ: observada menos reposo.',
        'Luego v = c × Δλ ÷ λ<sub>reposo</sub>.',
      ],
      worked:
        'Δλ = 4.865,0 − 4.862,7 = 2,3 Å. v = 299.792 × 2,3 ÷ 4.862,7 = 141,8 km/s, positiva porque la línea está en una longitud de onda más larga: se aleja.',
      feedback: {
        close:
          'Casi. Divide el corrimiento entre la longitud de onda en reposo y luego multiplica por c.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez. El corrimiento es un par de Å entre casi cinco mil, unas pocas partes en diez mil de c.',
        off: 'v = c × (observada − reposo) ÷ reposo.',
      },
    },
    {
      title: '¿Qué tan seguro es el corrimiento?',
      body: 'La estrella sintética 3 es un espectro más ruidoso. Acércate a <strong>H-alfa</strong> y lee la velocidad con su incertidumbre, el número que sigue al ±.',
      prompt: '¿Qué puedes concluir sobre el movimiento de la estrella 3?',
      options: [
        'Se aleja a la velocidad mostrada',
        'El corrimiento es menor que su incertidumbre, así que estos datos no pueden decir si se mueve',
        'Está en reposo, porque su corrimiento es tan pequeño',
        'El visor ha fallado, pues una estrella real siempre tiene un corrimiento grande',
      ],
      misconceptions: [
        {
          say: 'Un corrimiento medido pequeño no es un corrimiento nulo: la incertidumbre es mayor que el corrimiento, así que el cero es tan compatible con los datos como el número mostrado.',
        },
      ],
      hints: [
        'Compara la velocidad con el número que sigue al signo ±.',
        'Un resultado menor que su propia incertidumbre no es una detección.',
      ],
      because:
        'El corrimiento es menor que su incertidumbre (unos +10 ± 27 km/s con H-alfa), así que una estrella en reposo encaja con los datos tan bien como una que se mueve a 10 km/s. Una medición es un número y lo bien que se conoce; con un espectro ruidoso no se distingue un movimiento pequeño de ninguno.',
    },
    {
      title: 'A través, no a lo largo',
      body: 'Una estrella se mueve a 50&nbsp;km/s justo a través de nuestra visual, sin movimiento de acercamiento ni de alejamiento.',
      prompt: '¿Qué hacen sus líneas?',
      options: [
        'No se corren en ninguna cantidad medible',
        'Se corren a longitudes de onda más largas, la mitad que antes',
        'Se corren a longitudes de onda más cortas',
        'Se dividen en dos líneas',
      ],
      hints: [
        'El corrimiento registra la parte del movimiento a lo largo de la línea de la estrella hacia nosotros.',
      ],
      because:
        'No se corren en una cantidad medible. Una línea solo se mueve por el movimiento a lo largo de la visual. Un movimiento puramente lateral tiene un efecto minúsculo de segundo orden, de una parte en 10⁸ a 50 km/s, muy por debajo de cualquier medición. Un espectro da la velocidad de acercamiento o alejamiento y nada sobre la velocidad a través del cielo.',
    },
    {
      title: 'Con tus palabras',
      body: 'El espectro de la estrella 3 es demasiado ruidoso para decir si se mueve.',
      prompt: '¿Qué harías para averiguarlo, y por qué funcionaría?',
      rubric:
        'Crédito completo si se da una forma de reducir la incertidumbre y la razón por la que funciona: más luz (una exposición más larga o un telescopio mayor) baja el ruido, de modo que se conoce mejor el centro de cada línea; o combinar varias líneas (H-alfa, H-beta, H-gamma, Ca II K), cada una una medición independiente del mismo corrimiento, ponderadas por sus incertidumbres. Se acepta una respuesta que nombre cualquiera de las dos con una razón ligada al ruido. No se acepta una que solo diga mirar con más cuidado o tomar una imagen mejor sin decir por qué ayuda.',
    },
    {
      title: 'Lo que has averiguado',
      body: 'Los átomos dejan líneas oscuras en la luz de una estrella en longitudes de onda que les pertenecen, y qué líneas se ven depende de la temperatura. Una fuente que se acerca o se aleja de nosotros mueve todas las líneas la misma pequeña fracción de su longitud de onda, v ÷ c, hacia el rojo si se aleja y hacia el azul si se acerca. Esa fracción da la velocidad a lo largo de la visual, con una incertidumbre que fija qué velocidad tan pequeña merece confianza. No dice nada del movimiento a través del cielo.',
    },
  ],
};
