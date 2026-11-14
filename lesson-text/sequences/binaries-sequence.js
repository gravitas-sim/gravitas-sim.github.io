export const TWO_STARS_ECLIPSING_ES = {
  title: 'Dos estrellas que se eclipsan',
  subtitle:
    'Lee dos eclipses para saber qué estrella es más caliente y cuál es mayor, ajusta el tamaño de las estrellas como fracciones de su órbita y mira qué puede y qué no puede fijar un ajuste',
  objectives: [
    'Decir qué estrella es más caliente por cuál eclipse es más profundo, y cuál es menor por cuál eclipse tiene el fondo plano',
    'Leer las profundidades de los dos eclipses y decir qué dice la fase del secundario sobre la órbita',
    'Decir por qué los eclipses dan radios como fracciones de la órbita y no masas',
    'Decir que un ajuste devuelve un número aunque los datos no lo fijen, y leer en el panel qué parámetros no fijan',
  ],
  steps: {
    'two-stars-one-orbit': {
      title: 'Dos estrellas, una órbita',
      body: 'Dos estrellas giran una en torno a la otra cada <strong>3,2 días</strong>, vistas tan de canto que cada una pasa delante de la otra una vez por órbita. La curva es la luz de ambas frente a la fase de la órbita. En el <strong>eclipse primario</strong> la estrella 2 está delante y la 1 queda en parte oculta; media órbita después la estrella 1 está delante de la 2, el <strong>eclipse secundario</strong>. El panel lee la profundidad, la duración y la forma del fondo de cada uno.\n\nLas estrellas son un modelo: dos esferas, cada una más oscura en el borde, y nada más. Sus tamaños están en unidades de la órbita, porque una curva de luz mide cuánto tarda una estrella en cruzar a la otra, que es una fracción de la órbita.',
    },
    'which-eclipse-is-deeper': {
      title: '¿Qué eclipse es más profundo?',
      body: 'Los dos eclipses no son igual de profundos. En el primario la estrella que está delante es la menor; en el secundario está delante la mayor.',
      prompt:
        'El eclipse más profundo es aquel en que la estrella oculta es&hellip;',
      options: [
        'La de mayor brillo superficial, la más caliente, porque cada segundo de arco cuadrado oculto cuesta más luz',
        'La mayor, porque una estrella mayor oculta más luz',
        'La más fría, porque es más fácil de ocultar',
        'Ninguna: los dos eclipses son siempre igual de profundos',
      ],
      hints: [
        'Los dos eclipses ocultan casi la misma área de un disco tras el otro. Lo que cambia es cuánto brilla ese trozo del disco.',
      ],
      because:
        'El área que se solapa es la misma en los dos eclipses cuando la órbita es circular, así que la luz perdida es esa área por el brillo superficial de la estrella oculta. El eclipse más profundo oculta la estrella de mayor brillo superficial: la más caliente. El tamaño decide cuánto de una estrella se oculta, no cuán profundo es el eclipse.',
    },
    'the-two-depths': {
      title: 'Lee las profundidades',
      body: 'En el panel (<em>sin datos</em>, con los valores con que se abre) lee la profundidad del eclipse primario y del secundario, en porcentaje de la luz del par. El panel también dice si cada fondo es plano o curvo.',
      fields: [
        { label: 'Profundidad del eclipse primario' },
        { label: 'Profundidad del eclipse secundario' },
      ],
    },
    'the-flat-bottom': {
      title: 'Un fondo plano',
      body: 'El eclipse secundario tiene el fondo <strong>plano</strong>: la luz deja de bajar y se queda en un nivel durante un rato. El fondo del primario <strong>se curva</strong>.',
      prompt: '¿Qué dice el fondo plano?',
      options: [
        'La estrella menor pasó por completo detrás de la mayor, así que durante un rato se oculta la misma luz',
        'La estrella más fría no está pulsando en ese momento',
        'La órbita es excéntrica',
        'La estrella mayor es la que está delante',
      ],
      misconceptions: [
        {
          say: 'Aquí nada varía por sí solo: el modelo tiene dos estrellas estables. La forma del fondo es geometría.',
        },
        {
          say: 'La excentricidad aparta el secundario de media órbita; no aplana un fondo.',
        },
        {
          say: 'Cuando la mayor está delante se oculta la menor: ese es el plano. Cuando la menor está delante cruza el disco de la mayor, y el fondo se curva porque la mayor es más oscura en el borde.',
        },
      ],
      hints: [
        'Mientras la estrella menor está entera detrás de la mayor, ¿se oculta más o menos de ella?',
      ],
      because:
        'Un eclipse total tiene el fondo plano: la estrella menor queda oculta entera durante un tramo, y la luz perdida es toda la suya, una constante. El otro eclipse es un tránsito de la menor sobre la mayor: el fondo se curva porque la estrella que cruza es más brillante en el centro que en el borde. Fondo plano: la estrella oculta es la menor. Aquí es la estrella 2, que además es la más fría.',
    },
    'half-an-orbit': {
      title: 'A media órbita',
      body: 'El panel pone el eclipse secundario en la fase <strong>0,5000</strong>: exactamente media órbita después del primario.',
      prompt: '¿Qué dice eso de la órbita?',
      options: [
        'Es circular, o tanto que el momento no distingue la diferencia: una órbita excéntrica aparta el secundario de media órbita',
        'Es excéntrica, porque los eclipses no son simultáneos',
        'Las dos estrellas tienen masas iguales',
        'La inclinación es exactamente de 90 grados',
      ],
      hints: [
        'En una órbita circular la estrella pasa el mismo tiempo a cada lado. ¿Qué cambia si la órbita es un óvalo alargado?',
      ],
      because:
        'En una órbita circular el segundo eclipse llega exactamente media órbita después del primero. En una excéntrica las estrellas van rápido cerca de su máximo acercamiento y despacio cerca de su máxima separación, así que los dos eclipses no distan media órbita salvo que el eje mayor apunte hacia nosotros o de lado. Cuánto se aparta el secundario de media órbita mide una combinación de la excentricidad y la dirección del eje mayor: e cos w. Los pasos más profundos la usan.',
    },
    'what-eclipses-leave-out': {
      title: 'Lo que los eclipses no dicen',
      body: 'Solo con los eclipses tienes qué estrella es más caliente, cuál es menor, qué tamaño tiene cada una frente a la órbita, cuánto está inclinada la órbita y, por la fase del secundario, algo de su forma. No tienes una <strong>masa</strong>, ni un tamaño en kilómetros: la órbita misma no tiene escala en una curva de luz. Eso necesita las velocidades de las estrellas, que salen de sus espectros. Los pasos más profundos ajustan el modelo a datos y dicen qué puede y qué no puede fijar.',
    },
  },
};

export const TWO_STARS_ECLIPSING_DEEPER_ES = {
  steps: {
    'fit-the-pair': {
      title: 'Ajusta el par',
      body: 'El panel ajusta el modelo a una curva de luz sintética de un par desigual (<em>la pareja desigual</em>, 686 puntos, ruido del 0,04 por ciento). Lee los radios fraccionarios de las dos estrellas, R1/a y R2/a, y la incertidumbre de R2/a, en unidades de 0,0001.',
      fields: [
        { label: 'R1/a' },
        { label: 'R2/a' },
        { label: 'Incertidumbre de R2/a (en unidades de 1e-4)' },
      ],
    },
    'why-fractions': {
      title: 'Por qué fracciones de la órbita',
      body: 'El ajuste da R1/a = 0,1085 y R2/a = 0,0814, no radios en kilómetros.',
      prompt: '¿Por qué no puede dar kilómetros la curva de luz?',
      options: [
        'La curva registra cuánto tarda cada estrella en cruzar a la otra como fracción del período, lo que fija tamaños relativos a la órbita; el tamaño de la órbita necesita las velocidades de las estrellas',
        'El telescopio no es lo bastante grande para medir kilómetros',
        'El oscurecimiento del limbo oculta el tamaño',
        'Los kilómetros necesitan la distancia a las estrellas, y el modelo no la tiene',
      ],
      misconceptions: [
        {
          say: 'La misma curva de un telescopio de cualquier tamaño tiene las mismas fracciones. Los tamaños en kilómetros faltan en la luz, no en el instrumento.',
        },
        {
          say: 'Una distancia convertiría un tamaño aparente en un tamaño, pero las estrellas de una binaria eclipsante nunca se resuelven. Sus tamaños salen de tiempos, y un tiempo necesita una velocidad para convertirse en longitud.',
        },
      ],
      hints: [
        'Una estrella que cruza a la otra durante un tiempo t a una velocidad v recorre una distancia v t. ¿Qué mide la curva de luz, t o v?',
      ],
      because:
        'La curva de luz da tiempos: cuánto dura el eclipse y cuánto dura la órbita. Una duración sobre un período es una longitud sobre una circunferencia, así que los tamaños salen como fracciones de la órbita. El tamaño de la órbita en kilómetros es la velocidad de las estrellas por el período, y las velocidades salen de los desplazamientos Doppler de sus espectros. Con ellas una fracción se vuelve un radio y, con la tercera ley de Kepler, salen las masas. Eso es la siguiente investigación de este tipo.',
    },
    'the-residual-test': {
      title: 'La prueba de residuos',
      body: 'Elige <em>la pareja con manchas</em>: las mismas estrellas, pero su luz además sube y baja un 0,3 por ciento al girar a la vista zonas oscuras, algo que el modelo no tiene. Lee el chi cuadrado reducido y el factor de ruido correlacionado que da el ajuste.',
      fields: [
        { label: 'Chi cuadrado reducido' },
        { label: 'Factor de ruido correlacionado' },
      ],
    },
    'what-the-spots-did': {
      title: 'Qué significa la prueba no superada',
      body: 'El ajuste de la pareja con manchas da radios cercanos a la verdad, k = 0,758 frente a 0,750, con una incertidumbre de unos 0,013. La prueba de residuos no se superó.',
      prompt: '¿Qué debes concluir?',
      options: [
        'Al modelo le falta algo en la curva de luz, así que las incertidumbres citadas no cuentan toda la historia y los radios no deben darse como medidos con esa precisión',
        'Los radios son correctos porque se acercan a la verdad',
        'El ajuste falló, así que los números no significan nada',
        'Los datos tienen pocos puntos',
      ],
      misconceptions: [
        {
          say: 'Aquí sabes la verdad solo porque un modelo hizo los datos. Con una estrella real no la sabes, y la prueba es la única forma de saber que no se puede confiar en la incertidumbre indicada.',
        },
        {
          say: 'Los números son un ajuste a la parte de la curva que el modelo describe, y no son absurdos. Lo que falla es la afirmación de que las barras de error dicen cuánto se apartan de la verdad.',
        },
      ],
      hints: [
        'Las barras de error suponen que la dispersión es solo ruido. ¿Y si parte de ella es una señal que el modelo no sabe dibujar?',
      ],
      because:
        'La incertidumbre de un ajuste es correcta solo si el modelo describe los datos y la dispersión es ruido. Un chi cuadrado reducido de 26 dice que la dispersión es 5 veces lo que dicen las barras de error, y un factor de ruido correlacionado de 1,8 dice que varía despacio en el tiempo, como una mancha. El ajuste aun así escala sus barras por la raíz cuadrada del chi cuadrado reducido, pero no puede decirte qué le falta. Revisa los residuos antes de dar los radios.',
    },
    'the-secondary-phase': {
      title: 'e cos w a partir del secundario',
      body: 'Ahora un par excéntrico (<em>la pareja excéntrica</em>, activada, con el modelo puesto en los valores con que se hizo). Lee la fase del eclipse secundario y calcula e cos w a partir de ella a primer orden: <strong>(pi/2) (fase &minus; 0,5)</strong>.',
      fields: [
        { label: 'Fase del secundario' },
        { label: 'e cos w, primer orden' },
      ],
    },
    'why-esinw-is-weaker': {
      title: 'Por qué e sen w es más débil',
      body: 'El ajuste del par excéntrico da e cos w = 0,14004 &plusmn; 0,00002 y e sen w = 0,0988 &plusmn; 0,0007: la segunda es unas cuarenta veces más incierta.',
      prompt: '¿Por qué?',
      options: [
        'e cos w sale del momento del secundario, que se mide con mucha precisión; e sen w solo de la diferencia entre las duraciones de los dos eclipses, una diferencia pequeña de dos cantidades que llevan cada una su error',
        'e sen w es físicamente menor que e cos w',
        'El modelo no tiene término e sen w',
        'e sen w necesita un espectro',
      ],
      misconceptions: [
        {
          say: 'Aquí e sen w vale 0,10 y e cos w 0,14: parecidas. La diferencia está en lo bien que la curva de luz las mide, no en su tamaño.',
        },
        {
          say: 'Una curva de velocidades sí restringe bien e sen w, y por eso ayuda un ajuste conjunto. Pero la curva de luz sola la da, débilmente, por las duraciones.',
        },
      ],
      hints: [
        '¿Qué es más fácil de medir a una parte en diez mil: el momento de un mínimo o la duración de un eclipse?',
      ],
      because:
        'El momento del secundario depende de e cos w a primer orden y es el momento de un mínimo agudo, medido a unas partes en cien mil de la órbita. e sen w entra por el cociente de las dos duraciones, 1 + 2 e sen w a primer orden, y cada duración es un ancho, conocido a una fracción de por ciento en el mejor caso, con el oscurecimiento del limbo, k y la inclinación moviéndolo. Así que e sen w es más débil, y cualquier cosa que el modelo omita (un tercer cuerpo, un oscurecimiento del limbo erróneo) la mueve tanto como los datos.',
    },
    'the-grazing-fit': {
      title: 'Un eclipse rasante',
      body: 'Elige <em>la pareja rasante</em> y activa <em>perfil del cociente de radios</em>. En este sistema las estrellas apenas se solapan en el cielo: el eclipse es una lente fina de luz. Lee el cociente de radios que devuelve el ajuste y el extremo inferior de su intervalo de perfil, y mira qué dice el panel.',
      fields: [
        { label: 'Cociente de radios del ajuste' },
        { label: 'Intervalo de perfil, extremo inferior' },
      ],
    },
    'what-would-help': {
      title: 'Qué fijaría el cociente de radios',
      body: 'El eclipse rasante deja abierto el cociente de radios: una k mayor con otra inclinación y otra suma de radios dibuja casi la misma lente fina de luz.',
      prompt: '¿Qué ayudaría?',
      options: [
        'Una medida independiente del cociente de luz, de los espectros o del eclipse en un segundo color, que sujeta k',
        'Más puntos de la misma curva de luz con la misma precisión',
        'Dar k con una barra de error mayor',
        'Elegir el ajuste que da el cociente de radios más cercano a 1',
      ],
      misconceptions: [
        {
          say: 'Más puntos afilan el valle sin romperlo: la dirección alargada sigue ahí. Una dirección que la curva de luz no restringe sigue abierta por más puntos que tenga.',
        },
        {
          say: 'Una barra mayor sobre un número que no es una medida sigue engañando. Dar el intervalo, que está abierto, o las combinaciones que los datos sí fijan, es la forma honesta.',
        },
        {
          say: 'Elegir el valor que esperas usa una expectativa previa y la llama resultado.',
        },
      ],
      hints: [
        'Los datos fijan una combinación de k, la suma de los radios y la inclinación, no las tres. ¿Qué fija otra?',
      ],
      because:
        'En un eclipse rasante solo parte del disco de la estrella menor cruza a la mayor, y la forma de la caída depende del solape, que reproducen muchos conjuntos de radios e inclinaciones. Un cociente de luz de los espectros fija k por el cociente de brillos superficiales, y así sujeta k; también lo hace el mismo eclipse en una segunda banda, que cambia por separado el oscurecimiento del limbo y el cociente de brillos superficiales. Sin una de ellas, da lo que los datos fijan y di que k no está restringida.',
    },
  },
};
