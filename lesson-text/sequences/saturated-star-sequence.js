export const THE_SATURATED_STAR_ES = {
  title: 'La estrella saturada',
  subtitle:
    'Por qué la estrella más brillante de la imagen tiene la magnitud equivocada, qué hacen el desbordamiento de carga y los rayos cósmicos a sus vecinas y dónde es segura una medida',
  objectives: [
    'Predecir qué da la medida de una estrella saturada, leerla y decir por qué una estrella demasiado brillante sale demasiado débil',
    'Convertir el flujo recortado en el error de magnitud que produce',
    'Decir qué hace el desbordamiento de carga a las estrellas de la columna de una estrella saturada y por qué un píxel marcado se rechaza en vez de repararse a mano',
    'Decir qué hace la traza de un rayo cósmico a las estrellas que cruza y qué hace un observador al respecto',
  ],
  steps: {
    'a-bright-star': {
      title: 'La estrella más brillante de la imagen',
      body: 'Un CCD registra la luz acumulando electrones en cada píxel, y un píxel solo puede guardar cierto número: la <strong>capacidad máxima</strong>, 50&nbsp;000 electrones aquí. La imagen muestra una estrella muy brillante, <strong>S</strong>, entre otras más débiles. La herramienta de fotometría mide cada estrella y, cuando no puede fiarse de un número, lo <em>rechaza</em> y dice por qué: las estrellas dibujadas en naranja son las que rechazó.\n\nLa imagen es <strong>sintética</strong>: la hizo un modelo, y los brillos de las estrellas y los electrones que pusieron en la imagen se conocen exactamente. Nadie la observó.',
    },
    'bright-star-predict': {
      title: '¿Cuál habría sido el número?',
      body: 'La herramienta rechaza S. Supón que no lo hubiera hecho: suma la luz en un círculo alrededor de la estrella, como en todas las demás. La fila de S dice qué habría leído, como parte de los electrones que puso el modelo.',
      prompt: 'Sumado de todos modos, el flujo de S sería&hellip;',
      options: [
        'casi el flujo verdadero, porque una estrella brillante es fácil de medir',
        'mucho menor, porque los píxeles más brillantes no pueden guardar más que la capacidad máxima',
        'mayor, porque la luz de más se derrama dentro del círculo',
        'imposible de decir sin más observaciones',
      ],
      hints: [
        'Piensa en el píxel del centro de la estrella: recibe mucha más luz de la que un píxel puede guardar.',
      ],
      because:
        'Mucho menor: los píxeles centrales guardan 50&nbsp;000 electrones cada uno y el resto de su luz no se registra.',
    },
    'clipped-star': {
      title: 'Lo que lee la estrella recortada',
      body: 'Lee la fila de la <strong>Estrella S</strong>: sin tener en cuenta el rechazo, ¿qué parte de los electrones que puso el modelo habría leído la suma? Dala en porcentaje.',
      fields: [{ label: 'Parte del flujo verdadero que leería' }],
    },
    'magnitude-error': {
      title: 'El error de magnitud',
      body: 'Una estrella con el 30 por ciento de su flujo parece más débil en cierto número de magnitudes. Escribe de nuevo la parte y el instrumento da el error de magnitud, 2,5 veces el logaritmo del flujo verdadero entre el medido: lo demasiado débil que se catalogaría la estrella.',
      fields: [
        { label: 'Parte del flujo verdadero que leería' },
        { label: 'Error de magnitud (demasiado débil)' },
      ],
    },
    'why-too-faint': {
      title: '¿Por qué demasiado débil?',
      body: 'La estrella es lo más brillante de la imagen y su flujo medido es la fracción más pequeña de la verdad.',
      prompt: '¿Por qué una estrella demasiado brillante sale demasiado débil?',
      options: [
        'Un píxel guarda como máximo la capacidad máxima, así que la luz de más no se registra y la suma se queda corta',
        'El telescopio no puede recoger tanta luz, así que la estrella llega atenuada',
        'La estrella es tan brillante que el ruido la oculta',
        'La herramienta resta demasiado cielo alrededor de una estrella brillante',
      ],
      misconceptions: [
        {
          say: 'La luz llegó: el modelo puso 5 millones de electrones en la imagen. Fueron los píxeles los que no pudieron guardarla.',
        },
        {
          say: 'El ruido de una estrella brillante es pequeño frente a su señal. El problema no es el ruido sino un límite duro a lo que guarda cada píxel.',
        },
        {
          say: 'El nivel del cielo es el mismo alrededor de cada estrella. El déficit está en los píxeles de la propia estrella.',
        },
      ],
      hints: [
        '¿Cuál es el mayor número de electrones que puede guardar un píxel?',
      ],
      because:
        'Cada píxel se satura en la capacidad máxima; la luz que llega cuando un píxel está lleno se pierde (o, como muestra el paso siguiente, se derrama), y una suma de lo registrado se queda corta.',
    },
    'trail-predict': {
      title: 'Adónde va la carga de más',
      body: 'Activa el <strong>desbordamiento de carga</strong>. En un CCD la carga que un píxel lleno no puede guardar puede derramarse a lo largo de su columna hacia los píxeles de arriba y de abajo. <strong>N1</strong> y <strong>N2</strong> son estrellas débiles en la columna de S; <strong>C</strong> es una estrella débil en otro sitio. La imagen marca ahora los píxeles que recibieron carga derramada (magenta).',
      prompt: '¿Cuáles de las tres estrellas débiles rechazará la herramienta?',
      options: [
        'Ninguna: son débiles y están lejos de S',
        'N1 y N2, las de la columna de S',
        'Solo C',
        'Las tres',
      ],
      hints: [
        'La carga derramada viaja a lo largo de una columna, no a través de la imagen.',
      ],
      because:
        'N1 y N2: la carga se derrama hacia arriba y hacia abajo por la columna de S hasta agotarse, y una estela que atraviesa el círculo de una estrella se marca y se rechaza.',
    },
    trail: {
      title: 'La estela',
      body: 'Con el desbordamiento activado, cuenta cuántas de las estrellas débiles <strong>N1, N2 y C</strong> rechaza la herramienta, y lee en la fila <em>Desbordamiento</em> cuántos píxeles recibieron carga de píxeles saturados.',
      fields: [
        { label: 'Estrellas débiles rechazadas (de N1, N2, C)' },
        { label: 'Píxeles que recibieron carga desbordada' },
      ],
    },
    'a-ray': {
      title: 'Un rayo por el círculo',
      body: 'Ahora desactiva el desbordamiento y activa las <strong>trazas de rayos cósmicos</strong>, con S atenuada para que no esté saturada. Un rayo cósmico es una partícula cargada que cruza el detector y deja una traza de carga (cian). La herramienta rechaza las estrellas cuyo círculo cruza una traza.',
      prompt:
        'Una estrella débil que necesitas se rechaza porque una traza la cruza. ¿Qué hace un observador?',
      options: [
        'Tomar más exposiciones y combinarlas, de modo que ningún píxel reciba un impacto en más de una imagen',
        'Medirla de todos modos y restar el flujo de una traza típica',
        'Restar la mediana de toda la imagen',
        'Nada: un rayo cósmico es demasiado pequeño para importar',
      ],
      misconceptions: [
        {
          say: 'Una traza deposita una cantidad distinta en cada caso, fijada por el ángulo con que cruza. El número marcado está mal en una cantidad que nadie conoce; sin marcar, está mal en más de cinco veces su propio error en el modelo.',
        },
        {
          say: 'La mediana de una imagen es el cielo. No dice nada de la carga que una traza dejó en unos pocos píxeles.',
        },
        {
          say: 'Una traza pone unos mil electrones en cada píxel que cruza; una estrella débil puede tener menos que eso en su píxel más brillante.',
        },
      ],
      hints: ['Una traza cae en píxeles distintos en exposiciones distintas.'],
      because:
        'Combina varias exposiciones con un rechazo (una mediana o una media recortada): una traza está en una imagen en un lugar que las otras no tienen, y la combinación la elimina.',
    },
    'what-an-observer-does': {
      title: 'Qué hace un observador',
      body: `Lo que viste se reduce a una idea: <strong>un indicador de calidad es una
             negativa, y la negativa es la respuesta segura</strong>. Una estrella saturada
             se evita con una exposición más corta o con la estrella desenfocada, y se mide
             donde no se satura. Una estrella cruzada por un rayo cósmico se recupera
             combinando varias exposiciones con rechazo. Y un píxel marcado nunca se
             corrige a mano: se sustituye por una imagen mejor. Las imágenes son sintéticas
             y los efectos son modelos declarados, no un detector medido.`,
    },
  },
};

export const THE_SATURATED_STAR_DEEPER_ES = {
  steps: {
    'the-response': {
      title: 'Una respuesta que se curva antes de parar',
      body: 'Activa la <strong>no linealidad</strong>. Un detector real no registra los electrones linealmente hasta la capacidad máxima: la respuesta se curva cerca de ella. El modelo es aquí una curva declarada: lineal hasta un codo en 0,8 de la capacidad máxima y después una caída tipo tanh, de modo que un píxel lleno lee algo menos de 50&nbsp;000. El gráfico bajo la imagen muestra el máximo de cada estrella, registrado frente a la carga recogida. La línea vertical discontinua es el <strong>límite lineal</strong>, donde la respuesta está 1 por ciento por debajo de la recta.\n\nLa curva es <strong>una elección del modelo</strong>, no una medida de ningún detector. En uno real se mide, exponiéndolo a una luz uniforme y representando la salida frente a la exposición.',
    },
    'linear-limit': {
      title: 'El límite lineal y la meseta',
      body: 'Lee la fila <em>Límite lineal</em>: el número de electrones con el que la respuesta está 1 por ciento por debajo de lo lineal, y lo que lee un píxel lleno. Después da el límite como porcentaje de la capacidad máxima.',
      fields: [
        { label: 'Límite lineal' },
        { label: 'Lo que lee un píxel lleno' },
        { label: 'Límite como parte de la capacidad máxima' },
      ],
    },
    'brightest-measured': {
      title: '¿Cuánto puede brillar S y seguir midiéndose?',
      body: 'Con la no linealidad activada, sube la magnitud de S desde 12 (más brillante es más bajo). Halla la magnitud <strong>más brillante</strong>, con el medio punto de magnitud del control, con la que la herramienta todavía mide S en vez de rechazarla.',
      fields: [{ label: 'Magnitud más brillante aún medida' }],
    },
    'safe-flux': {
      title: 'Dónde es segura la medida',
      body: 'El límite es de un <em>píxel</em>. El píxel más brillante de una estrella guarda solo una parte de su luz: la fila <em>Muestreo</em> da el intervalo, según dónde esté la estrella dentro de su píxel. Una estrella es segura si su píxel más brillante se queda por debajo del límite incluso en el peor sitio, la parte mayor. Escribe esa parte mayor (porcentaje); el instrumento da los electrones máximos que puede entregar una estrella y la magnitud de esa estrella en 60 segundos (una estrella de magnitud 0 da aquí 5,606 &times; 10<sup>8</sup> electrones por segundo).',
      fields: [
        { label: 'Mayor parte de la luz en un píxel' },
        {
          label: 'Máximo de electrones que puede entregar una estrella segura',
        },
        { label: 'Su magnitud en 60 s' },
      ],
    },
    'can-you-correct-it': {
      title: '¿Podría corregirse?',
      body: 'Aquí se conoce la curva, así que podría deshacerse: un píxel que lee 46&nbsp;000 electrones dice cuántos se recogieron. La herramienta rechaza en su lugar.',
      prompt:
        '¿Por qué rechazar es lo más seguro por defecto en un detector real?',
      options: [
        'La curva de un detector real hay que medirla, difiere de un píxel a otro y de una noche a otra, y un píxel lleno ha perdido toda su información',
        'Una corrección es imposible en principio: ninguna función puede invertirse',
        'La corrección cambia el ruido, así que ninguna estrella puede corregirse',
        'Las correcciones solo se permiten en las estrellas más brillantes',
      ],
      misconceptions: [
        {
          say: 'Una curva monótona puede invertirse cuando se conoce (el núcleo lo hace, y la comprobación muestra que recupera los electrones). La dificultad está en conocerla en un detector real.',
        },
        {
          say: 'El ruido crece donde la curva es plana, pero eso limita una corrección en vez de prohibirla; el problema mayor es conocer la curva y la meseta.',
        },
      ],
      hints: [
        '¿Podrías aplicar la corrección a un píxel lleno? ¿Qué lee, llegue la luz que llegue?',
      ],
      because:
        'La corrección necesita una curva medida, y falla en un píxel lleno, que lee la misma meseta llegue lo que llegue. Los observadores mantienen las estrellas por debajo del límite lineal y miden la curva (la curva de transferencia de fotones) antes de fiarse de una corrección.',
    },
    undersampled: {
      title: 'Una estrella más estrecha que dos píxeles',
      body: 'Fija la anchura del perfil en <strong>1,2 píxeles</strong>. Un perfil necesita una anchura de unos 2 píxeles para estar muestreado: más estrecho está <em>submuestreado</em>, y los píxeles ya no siguen su forma. El modelo ya integra el perfil sobre cada píxel cuadrado, así que los píxeles son exactos; lo que cambia es que dónde está la estrella <em>dentro</em> de su píxel decide ahora cuánta luz cae en el píxel más brillante. La fila <em>Muestreo</em> da el intervalo.',
    },
    'phase-predict': {
      title: 'Dos estrellas, un brillo',
      body: 'Dos estrellas entregan exactamente el mismo número de electrones. Una está en el centro de un píxel y la otra en su esquina. El perfil mide 1,2 píxeles de ancho.',
      prompt: 'Los píxeles más brillantes de las dos estrellas guardan&hellip;',
      options: [
        'la misma carga: las estrellas son igual de brillantes',
        'cargas que difieren en un factor de unos dos, así que una podría saturarse y la otra no',
        'cargas que difieren en unos pocos por ciento',
        'la misma carga solo si las estrellas están por encima del límite lineal',
      ],
      hints: [
        'En el centro la estrella cae en un píxel; en la esquina la comparten cuatro.',
      ],
      because:
        'Un factor de unos dos: el píxel del máximo guarda el 45 por ciento de la luz en el centro y el 24 en la esquina.',
    },
    'phase-dependence': {
      title: 'El píxel del máximo, según la fase',
      body: 'Lee la fila <em>Muestreo</em> con una anchura de <strong>1,2</strong> píxeles y luego de <strong>2,8</strong>: la parte menor y la mayor de la luz de una estrella que guarda el píxel más brillante.',
      fields: [
        { label: 'Parte menor con 1,2 px' },
        { label: 'Parte mayor con 1,2 px' },
        { label: 'Parte menor con 2,8 px' },
        { label: 'Parte mayor con 2,8 px' },
      ],
    },
    'aperture-scatter': {
      title: 'Qué le hace a la fotometría',
      body: 'La fotometría suma el flujo en una apertura de radio 1,5 FWHM. La fila <em>Muestreo</em> da también cuánto varía ese flujo (una desviación típica, en porcentaje) al moverse la estrella dentro de su píxel. Léelo con <strong>1,2</strong> y con <strong>2,8</strong> píxeles; el instrumento da el cociente.',
      fields: [
        { label: 'Variación con 1,2 px' },
        { label: 'Variación con 2,8 px' },
        { label: 'Cociente (1,2 entre 2,8)' },
      ],
    },
    'what-undersampling-costs': {
      title: 'Lo que cuesta el submuestreo',
      body: 'El flujo de la apertura varió unas décimas de por ciento; el píxel del máximo, un factor de dos.',
      prompt:
        'Para una estrella que hay que medir, ¿qué coste del submuestreo importa más?',
      options: [
        'El píxel del máximo: que se sature depende del lugar de la estrella en el píxel, así que el límite lineal hay que aplicarlo a la parte mayor',
        'El flujo total: una estrella submuestreada tiene siempre el flujo equivocado',
        'Nada: toda imagen submuestreada es tan buena como una bien muestreada',
        'El cielo: el submuestreo cambia el nivel del cielo',
      ],
      misconceptions: [
        {
          say: 'El flujo total en una apertura proporcional varía aquí una fracción de por ciento; el submuestreo deja casi intacta la suma y distorsiona cómo se reparte entre píxeles.',
        },
        {
          say: 'Cuesta el significado del píxel del máximo, la precisión del centroide y la forma del perfil; la fotometría sobrevive porque la apertura suma la luz que comparten los píxeles.',
        },
      ],
      hints: [
        'Mira cuánto varió la parte del máximo frente a cuánto varió el flujo de la apertura.',
      ],
      because:
        'La suma sobrevive; el píxel del máximo no. Una estrella que es segura en la esquina de un píxel puede saturarse en su centro, así que el flujo seguro lo fija la parte mayor, como en el paso sobre dónde es segura la medida.',
    },
  },
};
