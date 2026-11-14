// El universo en expansión - español, paso a paso con ../the-expanding-universe.js.
export default {
  title: 'El universo en expansión',
  subtitle:
    'La recta de Hubble de 1929, y lo que dice la misma recta de 955 supernovas modernas',
  objectives: [
    'Ajustar una recta por el origen a la velocidad frente a la distancia y leer su pendiente como la constante de Hubble',
    'Decir por qué la pendiente del propio Hubble era unas seis veces demasiado grande, y de qué depende una pendiente',
    'Mostrar que la pendiente cambia con la muestra de galaxias, y decir qué significa eso para un único número llamado constante de Hubble',
    'Decir por qué una recta deja de ser la forma correcta para las galaxias lejanas',
  ],
  steps: [
    {
      title: 'Una recta por el origen',
      body: `En 1929 Edwin Hubble representó la velocidad a la que se alejan de nosotros 24 nebulosas frente a sus distancias, y los puntos caían cerca de una recta por el origen: una galaxia al doble de distancia va al doble de velocidad. La pendiente de esa recta, en kilómetros por segundo por cada megapársec, es la <strong>constante de Hubble</strong>, H<sub>0</sub>.
             \n\nEl instrumento empieza con la tabla del propio Hubble, <strong>auténtica</strong>, tal como se imprimió en su artículo. La recta cálida es la mejor recta por el origen, y la pálida deja que la recta no pase por el origen.`,
    },
    {
      title: 'Qué pendiente tiene',
      body: `Las medidas de hoy sitúan la constante de Hubble cerca de 70 km/s por megapársec. Las galaxias de Hubble llegan solo a 2 megapársecs según sus propias distancias, y la más rápida se aleja a 1.090 km/s. Todavía no cambies el instrumento.`,
      prompt: 'La pendiente del propio Hubble será&hellip;',
      options: [
        'cercana a los 70 de hoy, porque el universo no ha cambiado',
        'la mitad del valor de hoy, más o menos',
        'varias veces el valor de hoy',
        'cero, porque sus puntos se dispersan demasiado para una recta',
      ],
      hints: [
        'Una galaxia a 2 megapársecs que se mueve a 1.000 km/s da una pendiente de unos 500; con los 70 de hoy se movería a 140 km/s.',
      ],
      because:
        'Será varias veces el valor de hoy, unas seis. Las velocidades se midieron bien; las distancias no, y una pendiente es velocidad dividida por distancia, así que distancias demasiado pequeñas dan una pendiente demasiado grande. El paso siguiente la lee.',
    },
    {
      title: 'La pendiente de Hubble',
      body: `Con las 24 nebulosas de Hubble elegidas, lee la <strong>pendiente por el origen</strong> y su error.`,
      fields: [{ label: 'Pendiente' }, { label: 'Su error' }],
    },
    {
      title: '¿Tiene que pasar por cero?',
      body: `El instrumento también da la pendiente cuando la recta puede no pasar por el origen: 454 ± 75, frente a 424 ± 42 por él.`,
      prompt: '¿Qué dicen las dos pendientes?',
      options: [
        'Se diferencian en 30, bien dentro de sus errores: los datos no necesitan una recta que no pase por el origen, y basta la más simple',
        'Se diferencian, así que uno de los dos ajustes debe estar mal',
        'La recta libre es mejor porque su pendiente es mayor',
        'Una pendiente con mayor error es la más exacta',
      ],
      misconceptions: [
        {
          say: 'Dos estimaciones de una misma cantidad siempre difieren un poco. Lo que importa es la diferencia frente a los errores: 30 frente a 42 y 75 es una fracción de un error.',
        },
        {
          say: 'Una pendiente mayor no es una mejor. La recta libre tiene más libertad y por tanto más error, y los datos no distinguen las dos.',
        },
      ],
      hints: [
        'Compara la diferencia de las pendientes con los errores, no con las propias pendientes.',
      ],
      because:
        'La diferencia, 30, es menor que cualquiera de los errores. Una recta por el origen es además lo que predice un universo en expansión: a distancia cero la recesión es cero. La recta más simple no pierde nada aquí.',
    },
    {
      title: 'Una muestra moderna',
      body: `Ahora elige las <strong>supernovas del Dark Energy Survey</strong> y llévalas hasta <strong>z ≤ 0,10</strong>. Son supernovas de tipo Ia, cada una con una distancia por su brillo y una velocidad por su corrimiento al rojo. Lee el <strong>número de objetos</strong> y la <strong>pendiente</strong>.`,
      fields: [{ label: 'Objetos en el ajuste' }, { label: 'Pendiente' }],
    },
    {
      title: 'Más lejos',
      body: `La muestra se detiene en un corrimiento al rojo de 0,1. Las supernovas llegan hasta 0,5, donde la luz ha viajado unos cinco mil millones de años. Todavía no cambies el instrumento.`,
      prompt:
        'Al ajustar la recta a todas las supernovas hasta z = 0,5, la pendiente&hellip;',
      options: [
        'se quedará en unos 66',
        'subirá muy por encima de 66',
        'bajará muy por debajo de 66',
        'será imposible de ajustar',
      ],
      hints: [
        'Piensa si las galaxias lejanas quedan por encima o por debajo de una prolongación de la recta que forman las cercanas.',
      ],
      because:
        'Baja. Las supernovas lejanas quedan por debajo de la recta que forman las cercanas, así que la mejor recta por el origen se inclina hacia abajo. El paso siguiente lee cuánto.',
    },
    {
      title: 'Hasta z = 0,5',
      body: `Lleva el intervalo a <strong>z ≤ 0,50</strong> y lee otra vez el número de objetos y la pendiente.`,
      fields: [{ label: 'Objetos en el ajuste' }, { label: 'Pendiente' }],
    },
    {
      title: 'Por qué cambia la pendiente',
      body: `Una pendiente de 66 con la muestra cercana y de 59 con la lejana. Ambas muestras son de una misma clase de supernova, medidas del mismo modo.`,
      prompt: '¿Qué explicación encaja con lo que viste?',
      options: [
        'Las supernovas lejanas se midieron mal, y el error arrastra la recta hacia abajo',
        'Pasado un pequeño corrimiento al rojo, la velocidad frente a la distancia ya no es una recta, porque la tasa de expansión no era la misma en el pasado; una recta por el origen es ahí la forma equivocada',
        'La constante de Hubble es de verdad 59 para las galaxias lejanas y 66 para las cercanas, a la vez',
        'La luz de las galaxias lejanas se absorbe, lo que baja sus velocidades',
      ],
      misconceptions: [
        {
          say: 'Las barras de error no son mayores para las supernovas lejanas de un modo que importe, y la pendiente bajó veintidós veces su error: una forma sistemática, no ruido.',
        },
        {
          say: 'Hay una sola tasa de expansión hoy. Las supernovas lejanas muestran el universo como era, y la tasa de entonces era distinta; una recta tiene una pendiente y no puede seguirlo.',
        },
      ],
      hints: [
        'Una recta es lo que predice un universo que se expande a ritmo fijo. Pregunta si la luz lejana salió cuando eso era cierto.',
      ],
      because:
        'La relación es una recta solo para corrimientos pequeños, donde la luz ha viajado poco tiempo. Más lejos la distancia depende de cómo cambió la tasa de expansión por el camino, y la recta se curva. La constante de Hubble es la pendiente a distancia cero, que un ajuste a toda la muestra no ve; las investigaciones siguientes preguntan qué dice la propia curvatura.',
    },
    {
      title: 'Lo que has deducido',
      body: `Las 24 nebulosas de Hubble dan una pendiente de 424 ± 42 kilómetros por segundo por megapársec, seis veces el valor moderno, porque sus distancias eran demasiado pequeñas. Las supernovas modernas hasta z = 0,1 dan 66,33 ± 0,24 en una escala de distancias fijada por su publicación, y hasta z = 0,5 dan 59,35 ± 0,20: una recta por el origen solo es correcta cerca.
             \n\nNo se hace aquí: la propia escala de distancias, que viene de los peldaños de la escalera de distancias; los errores de las supernovas son solo estadísticos; y el ajuste no tiene en cuenta las velocidades peculiares de las propias supernovas, que importan solo para las más cercanas. La curvatura de la relación es el tema de <em>La forma de la expansión</em>.`,
    },
  ],
};
