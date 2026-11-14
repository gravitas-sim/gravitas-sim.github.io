export const WHAT_A_TELESCOPE_RESOLVES_ES = {
  title: 'Qué resuelve un telescopio',
  subtitle:
    'Qué apertura muestra dos estrellas como dos, cuándo aparece la estrella débil y por qué la anchura de una estrella no es el límite del telescopio',
  objectives: [
    'Predecir qué apertura muestra un par cercano de estrellas como dos, comprobarlo y decir qué es la caída entre ellas',
    'Decir cómo la apertura y la exposición juntas sacan una estrella débil del ruido',
    'Decir que la ampliación agranda una imagen y no añade detalle que la apertura y el seeing no permitieran',
    'Distinguir la separación de Rayleigh (calculada a partir de la apertura) de la anchura medida de una estrella (leída en una imagen) y decir por qué difieren',
  ],
  steps: {
    'a-pair-of-stars': {
      title: 'Un par de estrellas',
      body: 'Dos estrellas del mismo brillo están a <strong>1,0 segundo de arco</strong> una de otra, el ancho de una moneda vista a cuatro kilómetros. Con el panel del telescopio las mirarás con distintas aperturas y verás cuándo se separan.\n\nLa imagen es <strong>sintética</strong>: la hace el modelo, con el desenfoque de la atmósfera en 0,6 segundos de arco, una buena noche en un buen sitio. Nadie la observó. La curva azul bajo la imagen es lo que el modelo dice que debería ser la fila de píxeles que pasa por el par; los puntos son la fila de esta imagen.',
    },
    'smallest-aperture-predict': {
      title: '¿Qué apertura muestra dos estrellas?',
      body: 'Hay cuatro aperturas: 5, 10, 20 y 40 centímetros. Una mayor recoge más luz y da una imagen más nítida.',
      prompt:
        'La menor de estas que muestra el par como dos estrellas será&hellip;',
      options: ['5 cm', '10 cm', '20 cm', '40 cm'],
      hints: [
        'Dos estrellas están separadas cuando hay una caída de luz entre ellas. Prueba las aperturas una a una y mira la curva.',
      ],
      because:
        'Unos 20 centímetros: allí la caída entre las estrellas es del 27 por ciento y con 10 no hay ninguna. Un telescopio de 5 o 10 centímetros muestra una mancha gorda; uno mayor solo afina lo que la atmósfera ya permite.',
    },
    dips: {
      title: 'La caída entre las estrellas',
      body: 'Pon la apertura en <strong>10 cm</strong>, luego en <strong>20 cm</strong> y luego en <strong>40 cm</strong>, y lee la caída entre las estrellas en la fila <em>El par</em>, en por ciento: cuánto baja la luz a medio camino entre ellas respecto de la luz en una estrella.',
      fields: [
        { label: 'Caída con 10 cm' },
        { label: 'Caída con 20 cm' },
        { label: 'Caída con 40 cm' },
      ],
    },
    'faint-star-predict': {
      title: 'Sacar una estrella débil',
      body: 'Cambia el campo a <strong>campo débil</strong>. Una estrella de magnitud 19, unas cien mil veces más débil que la más débil que ve el ojo, está en el círculo discontinuo. El detector anota una estrella cuando su señal sube bien por encima del ruido.',
      prompt: '¿Qué sacará la estrella débil?',
      options: [
        'Una apertura mayor y una exposición más larga ayudan, cada una porque recoge más luz',
        'Solo ayuda una apertura mayor: una exposición más larga repite la misma luz',
        'Solo ayuda una exposición más larga: la apertura cambia el tamaño de la imagen',
        'Ninguna: la estrella es más débil de lo que cualquier telescopio puede mostrar',
      ],
      hints: ['La luz recogida es área por tiempo.'],
      because:
        'Ambas: la luz recogida es proporcional al área de la apertura por la exposición, y la estrella aparece cuando eso es lo bastante grande sobre el ruido del cielo y del detector.',
    },
    'faint-appears': {
      title: 'Cuándo aparece la estrella débil',
      body: 'Con el seeing en 1,0 segundo de arco, halla la <strong>exposición más corta</strong>, en segundos, con la que la estrella débil aparece en la lista (la fila lo dice) para un telescopio de 10 cm, de 20 cm y de 40 cm. Las exposiciones disponibles son 5, 10, 30, 60, 120, 300 y 600 segundos.',
      fields: [
        { label: 'Exposición más corta con 10 cm' },
        { label: 'Exposición más corta con 20 cm' },
        { label: 'Exposición más corta con 40 cm' },
      ],
    },
    magnification: {
      title: '¿Sirve el telescopio para ampliar?',
      body: 'Un amigo dice que el mejor telescopio es el que más amplía. El panel no tiene control de ampliación: la imagen siempre se muestra al tamaño que ves.',
      prompt: '¿Qué hace ampliar más una imagen?',
      options: [
        'La hace más grande, y no añade detalle que la apertura y el seeing no permitieran ya',
        'Deja que un telescopio pequeño separe cualquier par de estrellas, si la ampliación es suficiente',
        'Hace más brillante una estrella débil, porque la luz se reparte por más imagen',
        'Afina la imagen, porque los píxeles son más grandes',
      ],
      misconceptions: [
        {
          say: 'Con 10 cm el par no tiene caída alguna: su luz es una sola mancha, y agrandar una mancha deja una mancha. El detalle que separa dos estrellas lo fijan la apertura y el seeing, antes de cualquier ocular.',
        },
        {
          say: 'Repartir la misma luz por más imagen hace cada parte más tenue, no más brillante. Lo que saca una estrella débil es recoger más luz: una apertura mayor o una exposición más larga.',
        },
        {
          say: 'Píxeles o imagen mayores muestran el mismo desenfoque más grande. El desenfoque lo fijan la difracción de la apertura y el aire.',
        },
      ],
      hints: [
        'Compara la imagen con 10 cm con la misma imagen dibujada al doble de tamaño.',
      ],
      because:
        'Un telescopio recoge luz y, dentro de los límites del aire, afina la imagen; la ampliación solo cambia lo grande que se dibuja el resultado.',
    },
    'two-widths': {
      title: 'Dos anchuras, por separado',
      body: 'El panel da dos números. La <strong>separación de Rayleigh</strong> se calcula solo a partir de la apertura y la longitud de onda: el radio del primer anillo oscuro de la luz que difracta la apertura, 1,22 longitudes de onda entre el diámetro. El <strong>FWHM medido</strong> se lee en las estrellas de esta imagen: la anchura total a media altura del perfil, con la atmósfera dentro. Son cantidades distintas. Los pasos más profundos miden ambas y dicen por qué difieren. La anchura de una estrella no es el límite del telescopio.',
    },
  },
};

export const WHAT_A_TELESCOPE_RESOLVES_DEEPER_ES = {
  steps: {
    'measure-the-width': {
      title: 'La anchura de una estrella en esta imagen',
      body: 'Con la apertura en <strong>20 cm</strong> y el seeing en 0,6 segundos de arco, lee el <strong>FWHM medido</strong> en segundos de arco: la anchura que la herramienta de PSF ajusta a las estrellas de referencia de la imagen, y su incertidumbre.',
      fields: [
        { label: 'FWHM medido con 20 cm' },
        { label: 'Su incertidumbre' },
      ],
    },
    'rayleigh-by-hand': {
      title: 'La separación de Rayleigh, a mano',
      body: 'Calcula la separación de Rayleigh del mismo telescopio: 1,22 veces la longitud de onda entre el diámetro, en radianes, por 206&nbsp;265 para pasar a segundos de arco. Escribe la apertura y la longitud de onda y el instrumento hace la aritmética.',
      fields: [
        { label: 'Apertura' },
        { label: 'Longitud de onda' },
        { label: 'Separación de Rayleigh' },
      ],
    },
    'why-they-differ': {
      title: '¿Por qué difieren?',
      body: 'Pon el seeing en <strong>0</strong>, como en el espacio, con 20 cm. La separación de Rayleigh es 0,69 segundos de arco; el FWHM propio del patrón, una fila calculada, es 0,58. No hay atmósfera en ninguno de los dos.',
      prompt:
        '¿Por qué son distintos la separación de Rayleigh y el FWHM del mismo patrón?',
      options: [
        'Son medidas distintas de un mismo patrón: el primer anillo oscuro está a 1,22 longitudes de onda entre el diámetro, la anchura a media altura a 1,03',
        'Una de ellas está mal, y el FWHM es el verdadero límite de resolución',
        'El seeing no era exactamente cero',
        'El FWHM incluye los píxeles del detector y la separación de Rayleigh no',
      ],
      misconceptions: [
        {
          say: 'Ninguna está mal, y ninguna es «el» límite. La separación de Rayleigh es una convención para cuándo dos patrones cuentan como separados; el FWHM es una anchura. Difieren en un factor de 1,19 para una apertura circular libre.',
        },
      ],
      hints: [
        'El primer anillo oscuro y el punto de media altura son dos lugares distintos del mismo patrón.',
      ],
      because:
        'Para una apertura circular libre el primer anillo oscuro está a 1,220 longitudes de onda entre el diámetro y la media altura a 1,029 de lo mismo: un cociente de 1,185 incluso sin atmósfera.',
    },
    'seeing-sets-a-floor': {
      title: 'El seeing pone un suelo',
      body: 'Pon el seeing en <strong>1,0 segundo de arco</strong>, una noche corriente, y lee el <strong>FWHM del perfil combinado</strong> (una fila calculada: el seeing y el patrón de la apertura juntos) con 20 cm, con 1 m y con 4 m. Usa relación focal 6 para los 4 m.',
      fields: [
        { label: 'FWHM combinado con 20 cm' },
        { label: 'FWHM combinado con 1 m' },
        { label: 'FWHM combinado con 4 m' },
      ],
    },
    'why-space-does': {
      title: 'Por qué el espacio sí',
      body: 'Ahora pon el seeing en <strong>0</strong>, como por encima de la atmósfera, y lee el <strong>FWHM propio del patrón de difracción</strong> para el mismo 1 m y 4 m (una fila calculada).',
      fields: [
        { label: 'FWHM del patrón con 1 m' },
        { label: 'FWHM del patrón con 4 m' },
      ],
    },
    'the-crossover': {
      title: 'Dónde toma el relevo el aire',
      body: 'Para 1,0 segundo de arco de seeing, la apertura en la que el FWHM propio del patrón (1,029 longitudes de onda entre el diámetro) iguala al seeing es un cruce: por encima, un telescopio terrestre gana luz y poco más. Escribe el seeing y la longitud de onda y el instrumento da la apertura, en centímetros.',
      fields: [
        { label: 'Seeing' },
        { label: 'Longitud de onda' },
        { label: 'Apertura de cruce' },
      ],
    },
  },
};
