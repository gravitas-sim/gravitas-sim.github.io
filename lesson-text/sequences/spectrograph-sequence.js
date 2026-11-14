export const WHY_TWO_LINES_BECOME_ONE_ES = {
  title: 'Por qué dos líneas se vuelven una',
  subtitle:
    'Por qué un espectrógrafo puede mostrar dos líneas como una, qué pueden y qué no pueden arreglar los píxeles, cómo se calibra una escala de longitud de onda con un arco y cuánta luz cuesta',
  objectives: [
    'Predecir qué poder de resolución separa dos líneas espectrales cercanas, leer la caída entre ellas y decir qué es el poder de resolución',
    'Decir que los píxeles más finos muestrean mejor una línea y no pueden separar dos líneas que el instrumento ya fundió',
    'Decir qué aspecto tiene una mezcla para un ajuste que espera una sola línea: más ancha de lo que permite el instrumento',
    'Distinguir el poder de resolución del muestreo, y el número de elementos de resolución del número de píxeles',
  ],
  steps: {
    'two-lines': {
      title: 'Dos líneas, un instrumento',
      body: 'La luz de una estrella lleva dos líneas espectrales separadas <strong>0,5 nm</strong>, cerca de 500 nm: demasiado juntas para distinguirlas a simple vista. Un espectrógrafo abre la luz en un espectro sobre un detector. Su <strong>función de dispersión</strong> convierte cada línea en un pequeño bulto de ancho propio, y el <strong>poder de resolución</strong> R es la longitud de onda entre ese ancho, medido a media altura (el FWHM).\n\nTodo en el panel es <strong>sintético</strong>: un modelo con ruido, no los datos de una noche. La curva suave es la respuesta del instrumento al par; los puntos son los píxeles donde cae.',
    },
    'smallest-r-predict': {
      title: '¿Qué poder de resolución muestra dos líneas?',
      body: 'Hay cuatro espectrógrafos, con poderes de resolución de 300, 500, 750 y 1000 a 500 nm. Un poder mayor da una función de dispersión más angosta.',
      prompt: 'El menor de estos que muestra dos picos separados será&hellip;',
      options: ['R = 300', 'R = 500', 'R = 750', 'R = 1000'],
      hints: [
        'Dos líneas son dos cuando hay una caída entre ellas. Fija cada poder de resolución y mira la curva.',
      ],
      because:
        'R = 1000: entonces el ancho de dispersión es de 0,5 nm, igual a la separación, y la curva cae un 7 por ciento. Con 750 los dos bultos se fundieron en un solo pico ancho.',
    },
    'dip-by-r': {
      title: 'La caída entre las líneas',
      body: 'Con las líneas a 0,5 nm, fija el poder de resolución en <strong>500</strong>, luego en <strong>1000</strong> y luego en <strong>2000</strong>, y lee <em>Hundimiento entre las líneas</em>, en por ciento: cuánto baja el perfil suave entre los dos picos, respecto del pico menor. Si la fila dice que los picos se fundieron, la caída es 0.',
      fields: [
        { label: 'Caída con R = 500' },
        { label: 'Caída con R = 1000' },
        { label: 'Caída con R = 2000' },
      ],
    },
    'finer-pixels': {
      title: '¿Ayudan los píxeles más finos?',
      body: 'Un amigo dice que píxeles más pequeños separarían las líneas. Compruébalo. Mantén las líneas a 0,5 nm. Con <strong>R = 500</strong> fija el muestreo en 8 píxeles por FWHM y lee <em>Picos en los píxeles</em> (1 o 2). Luego fija <strong>R = 1000</strong>, donde la caída es real, y lee los picos con 2 píxeles por FWHM y con 8.',
      fields: [
        { label: 'Picos con R = 500, 8 píxeles por FWHM' },
        { label: 'Picos con R = 1000, 2 píxeles por FWHM' },
        { label: 'Picos con R = 1000, 8 píxeles por FWHM' },
      ],
    },
    'a-blend': {
      title: 'Qué aspecto tiene una mezcla para un ajuste',
      body: 'Con <strong>R = 500</strong> las dos líneas se fundieron, pero un ajuste que espera una sola línea sin resolver la encuentra demasiado ancha. Lee <em>Ajustadas como una sola línea</em>: ¿en qué por ciento es más ancho el FWHM ajustado que el del instrumento?',
      fields: [{ label: 'Más ancha que el instrumento' }],
    },
    'resolving-power-and-sampling': {
      title: 'Poder de resolución, muestreo, elementos de resolución',
      body: 'Tres números, por separado. El <strong>poder de resolución</strong> R es la longitud de onda entre el FWHM de la función de dispersión: es del instrumento, y solo una rendija más angosta, una red mayor o un mejor diseño lo suben. El <strong>muestreo</strong> es cuántos píxeles cubre el FWHM; dos o más es la regla, y una rejilla más gruesa submuestrea la línea. El número de medidas independientes a lo largo de un espectro es su extensión entre el FWHM, los <strong>elementos de resolución</strong>, y no es el número de píxeles. Dos líneas se vuelven una cuando están más cerca de lo que la función de dispersión puede mostrar, hagan lo que hagan los píxeles.',
    },
  },
};

export const WHY_TWO_LINES_BECOME_ONE_DEEPER_ES = {
  steps: {
    'the-arc-lamp': {
      title: 'Una lámpara de arco une píxeles y longitudes de onda',
      body: 'Un espectrógrafo registra píxeles; la astronomía necesita longitudes de onda. Una <strong>lámpara de arco</strong>, una fuente con líneas de longitud de onda conocida, se registra con el mismo instrumento, y cada línea se une al píxel donde cae. Un polinomio de grado bajo por los pares es la <strong>solución de longitud de onda</strong>. En el panel la lámpara es sintética (sus líneas son las de la lista del NIST, en aire, con intensidades inventadas) y la solución propia del instrumento está oculta. El panel marca las líneas en un orden que las reparte por el detector; tú eliges cuántas, y el grado.',
    },
    'degrees-of-freedom': {
      title: '¿Cuántas líneas necesita una cúbica?',
      body: 'Una cúbica tiene cuatro coeficientes. Deja el grado en <strong>3</strong> y marca <strong>5</strong> líneas, luego <strong>8</strong> y luego <strong>14</strong>. Lee los grados de libertad en <em>La solución</em> (el número de líneas menos cuatro). Con cuatro líneas la solución está <em>exactamente determinada</em>: pasa por todas las líneas y no queda nada con que comprobarla; con tres o dos está <em>no restringida</em>.',
      fields: [
        { label: 'Grados de libertad con 5 líneas' },
        { label: 'Grados de libertad con 8 líneas' },
        { label: 'Grados de libertad con 14 líneas' },
      ],
    },
    'the-residuals': {
      title: 'Qué dicen los residuos',
      body: 'Marca <strong>8</strong> líneas y lee el rms de los <em>Residuos</em>, en nm, para una solución de grado 3 y para una de grado 1. Una recta no puede seguir una escala de longitud de onda que se curva, y los residuos muestran la curva; el panel también dice cuándo la dispersión supera los errores.',
      fields: [{ label: 'rms con grado 3' }, { label: 'rms con grado 1' }],
    },
    'a-velocity': {
      title: 'Una velocidad desde una línea calibrada',
      body: 'La estrella del panel se mueve a lo largo de la línea de visión. Con <strong>8</strong> líneas marcadas y una cúbica, el panel ajusta la línea H&beta; de la estrella, convierte su píxel en longitud de onda con la incertidumbre de la solución y da la <em>Velocidad radial</em> con la suya. Lee ambas.',
      fields: [{ label: 'Velocidad radial' }, { label: 'Su incertidumbre' }],
    },
    'the-medium': {
      title: '¿Aire o vacío?',
      body: 'Las longitudes de onda de la lámpara de arco están en <strong>aire</strong>, así que la estrella se mide en aire. Una longitud de onda en reposo debe estar en el mismo medio. Cambia el medio de la longitud de onda en reposo a <strong>vacío</strong>: el panel la rechaza y muestra cuál habría sido la velocidad de mezclarlos. Para H&beta; la longitud de onda en reposo es 486,135 nm en aire y 486,2708 nm en vacío. Lee la velocidad equivocada y calcula a mano el desplazamiento que vale la confusión: c &times; (vacío entre aire &minus; 1), con c = 299 792 km/s.',
      fields: [
        { label: 'Velocidad ignorando los medios' },
        { label: 'El desplazamiento de la confusión' },
      ],
    },
    'light-through-the-slit': {
      title: 'La resolución cuesta luz',
      body: 'Una rendija más angosta da una función de dispersión más angosta, es decir un poder de resolución mayor, y deja pasar menos luz de una estrella cuya imagen es más ancha que la rendija. Para una red y una cámara fijas R es inversamente proporcional al ancho de la rendija, y el <em>R con el que la rendija iguala al seeing</em> del panel es donde la rendija iguala justo al disco de seeing. Por encima, cada duplicación de R reduce a la mitad la luz que pasa. El panel pone el compromiso en una curva para una estrella, un telescopio de la biblioteca de instrumentos y una exposición.',
    },
    'slit-and-throughput': {
      title: 'La rendija y la luz que pasa',
      body: 'Con el seeing en 1,0 segundo de arco y la rendija igual al seeing con R = 3000, lee el por ciento de la luz de la estrella que pasa con <strong>R = 3000</strong> y con <strong>R = 10000</strong>.',
      fields: [
        { label: 'Luz que pasa con R = 3000' },
        { label: 'Luz que pasa con R = 10000' },
      ],
    },
    'does-more-r-always-help': {
      title: '¿Compensa siempre más poder de resolución?',
      body: 'Para una línea más angosta que el instrumento, de modo que su ancho observado es el del instrumento, el panel dibuja la señal a ruido de la línea frente a R.',
      prompt:
        'Cuando R sube más allá del punto en que la rendija iguala al seeing, la señal a ruido de una línea así&hellip;',
      options: [
        'seguirá subiendo en proporción a R',
        'dejará de subir: se estabiliza, porque la luz perdida compensa el ancho menor',
        'caerá con fuerza, porque la rendija deja pasar muy poco',
        'no cambiará en absoluto con R',
      ],
      hints: [
        'Una función de dispersión más angosta concentra la línea, y una rendija más angosta la deja sin luz.',
      ],
      because:
        'Se estabiliza cerca de su límite (17,6 con R = 10000 frente a 16,2 con R = 3000 para esta estrella). Por debajo del punto en que la rendija iguala al seeing más poder de resolución es gratis; más allá, la ganancia en contraste se paga en luz, casi exactamente.',
    },
    'the-best-r': {
      title: 'El mejor poder de resolución para una línea con ancho propio',
      body: 'Ahora da a la línea un ancho propio: fija <em>Ancho propio de la línea</em> en <strong>0,1 nm</strong>. Su ancho observado ya no puede bajar de eso, así que más poder de resolución solo cuesta luz. Lee <em>El poder de resolución que la maximiza</em> y la señal a ruido allí.',
      fields: [
        { label: 'Mejor poder de resolución' },
        { label: 'Señal a ruido allí' },
      ],
    },
  },
};
