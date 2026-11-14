export const WHICH_INSTRUMENT_FOR_WHICH_QUESTION_ES = {
  title: '¿Qué instrumento para qué pregunta?',
  subtitle:
    'Cinco instalaciones de la biblioteca de instrumentos, la misma estrella débil y lo que decide la elección: luz, muestreo, campo y longitud de onda',
  objectives: [
    'Comparar instalaciones por lo que declara la biblioteca de instrumentos (área colectora, escala de píxel, campo, longitud de onda) y por la exposición que cada una necesita para una estrella',
    'Decir qué propiedad de un instrumento decide qué pregunta puede responder: la luz para las fuentes débiles, el muestreo para las imágenes nítidas, el campo para los objetos grandes y la longitud de onda para la física',
    'Decir por qué el instrumento más rápido para una estrella no siempre es el adecuado',
    'Elegir un instrumento para una pregunta dada y justificarlo con los números de la biblioteca',
  ],
  steps: {
    'a-question-first': {
      title: 'Primero una pregunta, después un instrumento',
      body: 'La <strong>biblioteca de instrumentos</strong> de Gravitas contiene cinco instalaciones, cada valor con su cita en un artículo o en la página de la instalación y cada valor que falta dejado sin rellenar: dos telescopios pequeños de Las Cumbres, Rubin, la cámara de TESS y el Green Bank Telescope. Un telescopio no es bueno ni malo: es bueno para una pregunta. Esta investigación plantea una pregunta a todos ellos, una estrella débil, y luego otras tres que la misma tabla responde de otra manera.\n\nEl <strong>planificador de exposición</strong> junto al texto lee la biblioteca: el área colectora, la escala de píxel, el ruido de lectura, el cielo y el seeing de un sitio. Todas las imágenes son sintéticas. La parte de la luz que entrega el sistema y la corriente oscura son valores didácticos que el planificador marca como aportados, porque la biblioteca no los declara.',
    },
    'the-same-star-three-ways': {
      title: 'Una estrella, tres instalaciones',
      body: 'Una estrella de magnitud <strong>22</strong>, una señal a ruido de <strong>20</strong>, una exposición, vista en el cenit. Elige cada instalación por turno (<strong>Las Cumbres 0,35 m, V</strong>, <strong>Las Cumbres 1,0 m, V</strong> y <strong>Rubin, r</strong>) y lee la <strong>exposición total</strong> que pide cada una. La banda de Rubin es r y la de las otras V; la estrella tiene el mismo brillo en cada una.',
      fields: [
        { label: 'Las Cumbres 0,35 m' },
        { label: 'Las Cumbres 1,0 m' },
        { label: 'Rubin' },
      ],
    },
    'how-much-longer': {
      title: 'Por qué el telescopio pequeño necesita tanto más',
      body: 'El telescopio de 1,0 m recoge 0,785 metros cuadrados de luz; el de 0,35 m, con su obstrucción central, 0,066: 11,9 veces menos. Divide la exposición que necesita el pequeño entre la que pide el mayor.',
      prompt:
        '¿Cuántas veces más tiempo necesita el telescopio de 0,35 m que el de 1,0 m para esta estrella?',
      hints: [
        'Divide la primera exposición que leíste entre la segunda.',
        'Es más que el 11,9 de las áreas colectoras. Mira el seeing de cada sitio en la fila «De la biblioteca de instrumentos» del planificador.',
      ],
      worked:
        '12 070,7 ÷ 602,2 = 20,0. El 11,9 del área colectora es el primer factor; el segundo es que el sitio del telescopio pequeño tiene un seeing de 1,3 segundos de arco frente a 0,9, así que su abertura contiene más cielo para la misma estrella. Una exposición limitada por el cielo crece como el cielo en la abertura dividido entre la luz de la estrella.',
    },
    'what-the-time-leaves-out': {
      title: '¿Es el más rápido el instrumento adecuado?',
      body: 'Rubin necesita 15 segundos para una estrella que el telescopio de 1,0 m tarda diez minutos en medir. Un estudiante concluye que Rubin debería usarse para toda estrella débil.',
      prompt: '¿Qué es lo mejor que se puede decir de esa conclusión?',
      options: [
        'Es correcta: el telescopio más rápido es el mejor para toda pregunta',
        'El tiempo es un coste. La pregunta también necesita el campo, los píxeles, la longitud de onda y una forma de apuntar el instrumento donde y cuando la pregunta lo pida, y la biblioteca no dice nada de lo último',
        'Es errónea porque un telescopio mayor es menos exacto',
        'Es correcta para las estrellas débiles y para nada más, porque solo las estrellas débiles están limitadas por la luz',
      ],
      misconceptions: [
        {
          say: 'El tiempo hasta una señal a ruido responde a una pregunta: cuánto tardo en recoger suficiente luz. Una pregunta sobre una galaxia de 40 minutos de arco o sobre una línea de 21 centímetros tiene otra propiedad decisiva.',
        },
        {
          say: 'El tamaño fija cuánta luz se recoge, no lo exacta que es una medida; una medida exacta sigue necesitando muestreo, calibración y un instrumento estable.',
        },
        {
          say: 'La luz decide para las fuentes débiles y no para las grandes, las brillantes ni otras longitudes de onda: los tres pasos siguientes muestran cada caso.',
        },
      ],
      hints: [
        'Mira las filas que da la biblioteca además del área colectora: escala de píxel, campo, rango de longitudes de onda.',
      ],
      because:
        'El tiempo de exposición es un coste entre varios. La biblioteca también contiene la escala de píxel, el campo de visión y el rango de longitudes de onda; que un observador pueda apuntar el instrumento a un objetivo elegido en una noche elegida (un sondeo sigue su propio calendario) es un dato que la biblioteca no contiene y la comparación omite.',
    },
    'pixels-across-the-seeing': {
      title: '¿Los píxeles muestrean el desenfoque?',
      body: 'Elige <strong>Las Cumbres 0,35 m, V</strong>. La fila «De la biblioteca de instrumentos» del planificador da la <strong>escala de píxel</strong> y el <strong>seeing</strong> de su sitio, ambos en segundos de arco. Escríbelos y el instrumento divide: el número de píxeles a través del desenfoque (su anchura a media altura). Una regla común pide al menos dos.',
      fields: [
        { label: 'Escala de píxel' },
        { label: 'Seeing (FWHM)' },
        { label: 'Píxeles a través de la FWHM' },
      ],
    },
    'the-field': {
      title: 'Cuánto cielo contiene una imagen',
      body: 'La cámara del telescopio de 0,35 m ve un campo de 1,9 por 1,2 grados (2,28 grados cuadrados). La cámara del telescopio de 1,0 m ve 26,5 minutos de arco por lado (26,5 ÷ 60 = 0,442 grados; 0,195 grados cuadrados).',
      prompt:
        '¿Cuántas imágenes de la cámara de 1,0 m hacen falta para cubrir el campo de una imagen de la cámara de 0,35 m?',
      hints: ['Divide las dos áreas en grados cuadrados.'],
      worked:
        '2,28 ÷ 0,195 = 11,7: unos doce apuntados del telescopio mayor para cubrir lo que el pequeño ve de una vez. Eso es lo que vale el campo, y por eso el telescopio mayor no es simplemente mejor.',
    },
    'a-big-galaxy': {
      title: 'Una galaxia de cuarenta minutos de arco',
      body: 'Un estudiante quiere una sola imagen de una galaxia de 40 minutos de arco. Los campos son: la cámara de 0,35 m, 114 por 72 minutos de arco; la de 1,0 m, 26,5 por 26,5; Rubin, 9,6 grados cuadrados (un círculo de unos 3,5 grados) y las cámaras de TESS, 24 por 24 grados.',
      prompt: '¿Cuál de estas no puede contener la galaxia en una imagen?',
      options: [
        'Las Cumbres 0,35 m',
        'Las Cumbres 1,0 m',
        'Rubin',
        'Una cámara de TESS',
      ],
      misconceptions: [
        {
          say: 'Un espejo mayor no implica un campo menor: el de Rubin es el más ancho de los tres telescopios de tierra, porque su óptica se diseñó para un campo amplio.',
        },
        {
          say: 'El telescopio de 0,35 m tiene el campo más ancho de los dos de Las Cumbres: su cámara es un sensor grande detrás de un telescopio corto y luminoso.',
        },
      ],
      hints: ['Compara 40 minutos de arco con el lado menor de cada campo.'],
      because:
        'La cámara de 1,0 m solo abarca 26,5 minutos de arco por lado, así que la galaxia necesitaría un mosaico. Las demás la contienen, y la elección entre ellas es entonces cuestión de resolución y de luz, no de campo: los píxeles de TESS son de 21 segundos de arco y mostrarían la galaxia como una mancha.',
    },
    'the-wrong-wavelength': {
      title: 'La línea de 21 centímetros',
      body: 'Un estudiante quiere cartografiar el hidrógeno neutro de una galaxia cercana, que radia a una longitud de onda de 21 centímetros (una frecuencia de 1420 MHz).',
      prompt: '¿Qué instalación de la biblioteca puede hacer esta observación?',
      options: [
        'Rubin, porque es la mayor',
        'Cualquiera de los telescopios ópticos, con una exposición suficientemente larga',
        'El Green Bank Telescope: su receptor cubre de 1,15 a 1,73 GHz y su haz a 1420 MHz es de 9,1 minutos de arco',
        'TESS, porque está por encima de la atmósfera',
      ],
      misconceptions: [
        {
          say: 'Un detector óptico no responde a las ondas de radio con ninguna exposición: la longitud de onda es un límite duro, no un coste.',
        },
        {
          say: 'La cámara de Rubin registra las bandas ópticas y del infrarrojo cercano de u a y. El tamaño de un espejo no mueve la longitud de onda que puede detectar.',
        },
      ],
      hints: [
        'Compara 21 centímetros con el rango de longitudes de onda que cubre la fila de cada instrumento en la biblioteca.',
      ],
      because:
        'Solo el receptor de Green Bank cubre la frecuencia de la línea. La comparación ya no trata del tiempo, y ese es el punto: antes de planificar una exposición, la longitud de onda decide si un instrumento es candidato. El haz de 9,1 minutos de arco es también la resolución angular del mapa.',
    },
    'your-own-question': {
      title: 'Tu propia pregunta',
      body: 'Elige una pregunta tuya sobre el cielo (el periodo de una estrella, la forma de una galaxia, el tránsito de un planeta, una nube de gas). No la respondas: elige un instrumento para ella.',
      prompt:
        '¿Con qué instrumento de la biblioteca empezarías para tu pregunta, y qué propiedad suya (luz, píxeles, campo, longitud de onda) decide la elección? Nombra uno que no serviría, y por qué.',
    },
    'what-you-worked-out': {
      title: 'Lo que averiguaste',
      body: 'Para una estrella de magnitud 22 con una señal a ruido de 20, las tres instalaciones de tierra necesitaron 12 070, 602 y 15 segundos: la luz que recoge cada una fija la mayor parte, y el seeing de su sitio el resto. Pero un tiempo es la respuesta a una sola pregunta. Una galaxia de 40 minutos de arco es la pregunta del campo, y la cámara de 1,0 m no la contiene; una línea de 21 centímetros es la de la longitud de onda, y solo el radiotelescopio puede tomarla; y los píxeles del telescopio de 0,35 m, 1,8 a través de un desenfoque de 1,3 segundos de arco, son los del muestreo.\n\nLa biblioteca son unas pocas instalaciones con cita, no los instrumentos del cielo, y la comparación omite lo que ninguna tabla tiene: quién puede apuntar el instrumento, cuándo y a qué coste.',
    },
  },
};

export const WHICH_INSTRUMENT_FOR_WHICH_QUESTION_DEEPER_ES = {
  steps: {
    'survey-speed': {
      title: 'Luz por campo',
      body: 'Para muchos apuntados, lo que importa es cuánta luz se recoge <em>y</em> cuánto cielo se ve de una vez: el área colectora por el campo. El área colectora efectiva de Rubin es de 33,2 metros cuadrados y su campo de 9,6 grados cuadrados; los del telescopio de 1,0 m, 0,785 y 0,195.',
      prompt:
        '¿Cuántas veces mayor es el producto del área por el campo de Rubin que el del telescopio de 1,0 m?',
      hints: [
        'Multiplica el área de cada telescopio por su campo y divide.',
        'Rubin tiene 42 veces el área y 49 veces el campo.',
      ],
      worked:
        '(33,18 × 9,6) ÷ (0,785 × 0,195) = 318,5 ÷ 0,1532 = 2079. Para una estrella Rubin es solo unas 40 veces más rápido (15 segundos frente a 602); para un campo es 2000 veces más rápido, porque además ve 49 veces más cielo de una vez.',
    },
    'one-star-or-a-field': {
      title: '¿Cuarenta veces o dos mil?',
      body: 'Una estrella: Rubin es 40 veces más rápido que el telescopio de 1,0 m. Un campo entero: unas 2000.',
      prompt: '¿Por qué son tan distintos los dos cocientes?',
      options: [
        'Porque el segundo es un error',
        'Porque una estrella usa una fracción del campo de Rubin y un sondeo lo llena entero: el campo 49 veces mayor no vale nada para una sola estrella y lo vale todo para un millón',
        'Porque Rubin tiene mejores píxeles',
        'Porque el cielo es más brillante en un campo amplio',
      ],
      misconceptions: [
        {
          say: 'Los píxeles de Rubin son más finos (0,2 segundos de arco frente a 0,389), lo que ayuda al muestreo pero no es lo que separa los dos cocientes; el campo sí.',
        },
      ],
      hints: ['Uno de los dos números incluye el campo y el otro no.'],
      because:
        'Una estrella ilumina una parte pequeña de cualquier imagen, así que solo ayuda el área colectora; un sondeo de una región usa cada píxel del campo. Una pregunta sobre un objeto y una sobre una población son preguntas distintas, y el mismo instrumento puede ser cien veces mejor para una que para la otra.',
    },
  },
};

export const THE_SKY_BACKGROUND_ES = {
  title: 'El fondo de cielo',
  subtitle:
    'El cielo es una luz propia: lo brillante que es dentro de la abertura de una estrella, lo que cuesta un cielo más brillante en exposición y cuándo importa la Luna',
  objectives: [
    'Convertir un brillo de cielo en magnitudes por segundo de arco cuadrado en el cielo dentro de la abertura de una estrella, y compararlo con la estrella',
    'Decir cómo crece la exposición para una señal a ruido fija con un cielo más brillante, y por qué una exposición limitada por el cielo crece como la luz del cielo y no como su raíz cuadrada',
    'Decir cuándo importa la Luna (fuentes débiles) y cuándo apenas (brillantes), y leer las horas que está sobre el horizonte en un plan de noche',
    'Decir qué sabe la biblioteca del cielo (sitios oscuros, banda por banda) y qué no (una ciudad, la luz cambiante de la Luna)',
  ],
  steps: {
    'the-brightest-thing': {
      title: 'Lo más brillante de la imagen',
      body: 'Entre las estrellas el cielo no es negro. El aire brilla, la luz de la Luna dispersada y la luz de las ciudades se suman, y lo que suman se mide como un <strong>brillo superficial</strong>: magnitudes por segundo de arco cuadrado. Una estrella débil hay que medirla encima de ese cielo, y los fotones del propio cielo son el ruido.\n\nEl <strong>planificador de exposición</strong> lee el sitio de Rubin en la biblioteca de instrumentos: en la banda r el cielo es de <strong>21,2</strong> magnitudes por segundo de arco cuadrado y el seeing de <strong>0,65</strong> segundos de arco. Todas las imágenes son sintéticas. La biblioteca contiene solo sitios oscuros; no tiene ninguna ciudad, así que nada de aquí trata de un sitio real con contaminación lumínica.',
    },
    'sky-in-the-aperture': {
      title: 'El cielo dentro de la abertura',
      body: 'El planificador mide una estrella en un círculo de radio 1,5 veces el seeing: 1,5 × 0,65 = 0,975 segundos de arco, un área de π × 0,975² = 2,99 segundos de arco cuadrados. Una magnitud por segundo de arco cuadrado es un brillo para un segundo de arco cuadrado, así que el cielo del círculo entero es más brillante (una magnitud menor) en 2,5 log₁₀ de esa área.',
      prompt:
        '¿Cuál es la magnitud de todo el cielo dentro de la abertura, para un brillo superficial de 21,2?',
      hints: [
        'Resta 2,5 log₁₀(2,99) de 21,2.',
        '2,5 log₁₀(2,99) vale unos 1,2.',
      ],
      worked:
        '21,2 − 2,5 log₁₀(2,99) = 21,2 − 1,19 = 20,01. El cielo del círculo es tan brillante como una estrella de magnitud 20.',
    },
    'sky-over-the-star': {
      title: 'Cuántas estrellas de cielo',
      body: 'La estrella es de magnitud 23, y el cielo dentro de su abertura es tan brillante como una estrella de magnitud 20,01. Tres magnitudes son un factor de 2,512³.',
      prompt:
        '¿Cuántas veces más luz da el cielo dentro de la abertura que la estrella?',
      hints: ['10 elevado a 0,4 veces la diferencia de magnitudes.'],
      worked:
        '10^(0,4 × (23 − 20,01)) = 10^1,195 = 15,7. La estrella es una decimosexta parte de la luz de su propia abertura; su señal es un pequeño bulto sobre el cielo, y el ruido del cielo es lo que la exposición debe vencer.',
    },
    'a-sky-limited-plan': {
      title: 'Un plan en una noche oscura',
      body: 'Con <strong>Rubin, r</strong>, una magnitud de <strong>23</strong>, una señal a ruido objetivo de <strong>20</strong> y <strong>2</strong> exposiciones, lee la <strong>exposición total</strong> y la parte del ruido al cuadrado que corresponde al <strong>cielo</strong>, en por ciento.',
      fields: [
        { label: 'Exposición total' },
        { label: 'Parte del ruido al cuadrado del cielo' },
      ],
    },
    'predict-the-moon': {
      title: 'Un cielo más brillante',
      body: 'Una Luna brillante hace el cielo más brillante. Supón que el cielo fuera <strong>2 magnitudes</strong> más brillante, es decir 6,3 veces más luz. Todavía no muevas el control.',
      prompt:
        'La exposición para la misma estrella y la misma señal a ruido será&hellip;',
      options: [
        'La misma: la estrella no ha cambiado',
        'Unas 2,5 veces mayor, porque 2 magnitudes son un factor de 2,5',
        'Algo menos de 6,3 veces mayor: casi tanto como la luz del cielo, no tan poco como su raíz cuadrada',
        'Unas 2,5 veces mayor, porque el ruido crece como la raíz cuadrada del cielo',
      ],
      hints: [
        'El ruido es la raíz cuadrada de los fotones del cielo; la señal tiene que vencerlo.',
      ],
      because:
        'Unas 5,6 veces mayor, algo menos que las 6,3 veces más luz de cielo. La señal crece como el tiempo y el ruido como su raíz cuadrada, así que para conservar el cociente el tiempo debe crecer como la luz del cielo; los fotones de la propia estrella y el ruido de lectura no crecen, y esa es la pequeña diferencia.',
    },
    'two-magnitudes-brighter': {
      title: 'Dos magnitudes de Luna',
      body: 'Escribe la exposición del plan anterior, luego pon <strong>Cielo más brillante en</strong> en <strong>2</strong> magnitudes y escribe la nueva exposición total. El instrumento divide la segunda entre la primera.',
      fields: [
        { label: 'Exposición total, cielo oscuro' },
        { label: 'Exposición total, cielo 2 mag más brillante' },
        { label: 'Veces mayor' },
      ],
    },
    'three-magnitudes-brighter': {
      title: 'Tres magnitudes',
      body: 'Pon <strong>Cielo más brillante en</strong> en <strong>3</strong>, el cielo de un lugar 16 veces más brillante que un sitio oscuro, y lee la exposición total.',
      prompt:
        '¿Cuántas veces mayor es la exposición que con el cielo oscuro (79,8 segundos)?',
      hints: ['Divide la nueva exposición total entre 79,8.'],
      worked:
        '1105 ÷ 79,8 = 13,8, para 15,8 veces la luz del cielo. Cada magnitud de cielo cuesta unas 2,5 veces la exposición: la estrella es la misma, el plan es de 18 minutos en vez de 80 segundos.',
    },
    'time-follows-the-sky': {
      title: 'Por qué la exposición sigue la luz del cielo',
      body: 'Un estudiante dice: «El ruido solo crece como la raíz cuadrada de los fotones del cielo, así que un cielo 16 veces más brillante debería costar solo 4 veces la exposición».',
      prompt: '¿Qué tiene de erróneo?',
      options: [
        'Nada: la exposición crece como la raíz cuadrada del cielo',
        'El ruido sí crece como la raíz cuadrada, pero la señal crece solo como el tiempo, así que para conservar la señal a ruido la exposición debe crecer como la propia luz del cielo',
        'La luz del cielo crece como el cuadrado de la magnitud',
        'El detector se satura a cuatro veces la exposición',
      ],
      misconceptions: [
        {
          say: 'La raíz cuadrada está en el ruido. La señal a ruido es la señal entre el ruido, y la señal crece como el tiempo, así que el tiempo necesario va como el ruido al cuadrado, que es la luz del cielo.',
        },
      ],
      hints: [
        'Escribe la señal a ruido como los electrones de la estrella entre la raíz de los del cielo: ¿cómo depende cada uno de la exposición t?',
      ],
      because:
        'Señal ∝ t y ruido ∝ √(cielo · t), así que la señal a ruido ∝ √t · (estrella ÷ √cielo), y la exposición para un valor fijo ∝ la luz del cielo. Los 13,8 medidos frente a 15,8 son los fotones de la propia estrella y el ruido de lectura, que no escalan con el cielo.',
    },
    'the-moon-and-a-bright-star': {
      title: 'Cuando la Luna no importa',
      body: 'Elige <strong>Las Cumbres 1,0 m, V</strong>, una exposición, un objetivo de <strong>20</strong>. Lee la exposición total para una estrella de magnitud <strong>20</strong> y para una de magnitud <strong>17</strong>, cada una con el cielo oscuro y con el cielo <strong>3 magnitudes</strong> más brillante.',
      fields: [
        { label: 'Magnitud 20, cielo oscuro' },
        { label: 'Magnitud 20, cielo 3 mag más brillante' },
        { label: 'Magnitud 17, cielo oscuro' },
        { label: 'Magnitud 17, cielo 3 mag más brillante' },
      ],
    },
    'a-redder-sky': {
      title: 'El cielo es más brillante en el rojo',
      body: 'La biblioteca declara el brillo del cielo de Rubin banda por banda: <strong>g</strong> 22,26, <strong>r</strong> 21,20 e <strong>i</strong> 20,48 magnitudes por segundo de arco cuadrado (el modelo de cielo oscuro del diseño de referencia). El brillo propio del aire es más intenso a longitudes de onda mayores.',
      prompt:
        '¿Cuántas veces más luz da un segundo de arco cuadrado de cielo en i que en g?',
      hints: ['10 elevado a 0,4 veces la diferencia de las dos magnitudes.'],
      worked:
        '10^(0,4 × (22,26 − 20,48)) = 10^0,712 = 5,15. La misma estrella cuesta más exposición en i que en g no solo porque los filtros difieran, sino porque el cielo detrás es cinco veces más brillante.',
    },
    'a-sky-the-library-does-not-have': {
      title: 'Un cielo que la biblioteca no tiene',
      body: 'La biblioteca contiene tres sitios oscuros y ninguna ciudad. El control «cielo más brillante en» es un desplazamiento de ejercicio, no una medida: la luz real de una Luna depende de su fase, de su altura y de lo lejos que esté del objetivo, y nada de eso está modelado.',
      prompt:
        'Si el cielo de tu campus fuera tres magnitudes más brillante que el de un sitio oscuro, ¿qué cambiarías en un plan de observación y qué tendrías que medir primero?',
    },
    'what-you-worked-out': {
      title: 'Lo que averiguaste',
      body: 'En el cielo oscuro de Rubin (21,2 magnitudes por segundo de arco cuadrado) el cielo dentro de la abertura de una estrella es tan brillante como una estrella de magnitud 20, dieciséis veces una de magnitud 23. Un plan para ella tardó 80 segundos y el 87 por ciento del ruido era del cielo. Un cielo 2 magnitudes más brillante costó 5,6 veces la exposición y uno 3 magnitudes más brillante 13,8 veces, porque la exposición sigue la luz del cielo y no su raíz cuadrada. Una estrella brillante apenas lo nota (1,2 veces); una débil paga entero (4,7 veces). Y el cielo es cinco veces más brillante en i que en g.\n\nLos números son un modelo: sitios oscuros, un desplazamiento declarado para un cielo más brillante, sin geometría de la luz de la Luna. Una noche real añade la fase y la posición de la Luna, las nubes y el crepúsculo, y un observador mide el cielo en la propia imagen en vez de fiarse de una tabla.',
    },
  },
};

export const THE_SKY_BACKGROUND_DEEPER_ES = {
  steps: {
    'a-wider-aperture': {
      title: 'Una abertura más ancha contiene más cielo',
      body: 'Pon el <strong>radio de abertura</strong> en 2,5 veces el seeing: un círculo de radio 2,5 × 0,65 = 1,625 segundos de arco, un área de 8,30 segundos de arco cuadrados.',
      prompt:
        '¿Cuál es la magnitud del cielo dentro de esta abertura, para un brillo superficial de 21,2?',
      hints: ['La misma resta que antes, con el área mayor.'],
      worked:
        '21,2 − 2,5 log₁₀(8,30) = 21,2 − 2,30 = 18,90. El cielo del círculo es 2,8 veces más brillante que en la primera abertura, mientras la luz de la estrella apenas crece: una abertura más ancha es un mal trato para una estrella débil.',
    },
    'the-moon-up-hours': {
      title: 'Elegir la noche',
      body: 'El planificador de noche muestra las horas que la Luna está sobre el horizonte dentro de la oscuridad astronómica en un sitio a 30° de latitud norte. Lee <strong>Horas que la Luna está sobre el horizonte en la oscuridad</strong> para la noche del <strong>29-01-2025</strong> (día 28, Luna nueva) y para la del <strong>13-01-2025</strong> (día 12, Luna llena).',
      fields: [
        { label: 'Horas arriba, noche de Luna nueva' },
        { label: 'Horas arriba, noche de Luna llena' },
      ],
    },
  },
};

export const COORDINATES_AND_TIME_ES = {
  title: 'Coordenadas y tiempo en profundidad',
  subtitle:
    'El tiempo sidéreo y el ángulo horario, el minuto en que una estrella cruza el meridiano y lo que la precesión hace a una posición de catálogo',
  objectives: [
    'Decir por qué el cielo se adelanta al reloj 3 minutos y 56 segundos al día, y medirlo con los cruces del meridiano de una estrella',
    'Hallar la hora en que una estrella cruza el meridiano a partir del tiempo sidéreo a medianoche y la ascensión recta de la estrella, y el ángulo horario a cualquier hora del reloj',
    'Decir por qué una posición de catálogo lleva una época, y hallar el cambio que la precesión causa en una posición en 25 años en ascensión recta y en declinación',
    'Decir qué hace una posición de catálogo sin corregir a dónde apunta un telescopio, en segundos de arco y en píxeles',
  ],
  steps: {
    'two-clocks': {
      title: 'Dos relojes',
      body: 'Un día del reloj es el tiempo que tarda el Sol en volver al mismo lugar del cielo. Las estrellas vuelven antes, porque en ese tiempo la Tierra también se ha movido un grado a lo largo de su órbita: un <strong>día sidéreo</strong> es el tiempo que tardan las estrellas en volver, <strong>23 horas 56 minutos 4,09 segundos</strong> de tiempo del reloj. Los observatorios llevan los dos. El <strong>tiempo sidéreo</strong> de un lugar es la ascensión recta que está ahora en su meridiano.\n\nEl panel del <strong>cielo que gira</strong> de la investigación de nivel básico <em>El cielo que gira</em> da, para una estrella y una noche, el tiempo sidéreo a la medianoche que cierra la fecha, y cuándo la estrella sale, cruza el meridiano y se pone. Cada número se calcula con el núcleo del Laboratorio del Cielo, un modelo del cielo y no una observación.',
    },
    'a-day-that-is-short': {
      title: 'Cuánto más corto que un día',
      body: 'Un día solar son 24 horas, u 86 400 segundos. Un día sidéreo son 23 horas 56 minutos 4,09 segundos.',
      prompt: '¿Cuántos segundos más corto es un día sidéreo que un día solar?',
      hints: ['Convierte 23 h 56 min 4,09 s en segundos y réstalo de 86 400.'],
      worked:
        '23 × 3600 + 56 × 60 + 4,09 = 86 164,09 segundos; 86 400 − 86 164,09 = 235,9 segundos, o 3 minutos 55,9 segundos. Una estrella que cruza el meridiano a una hora del reloj lo cruza 3 minutos 56 segundos antes la noche siguiente.',
    },
    'earlier-each-night': {
      title: 'Medir la ganancia en el cielo',
      body: 'Elige <strong>Sirio</strong> a 40° de latitud. Lee los minutos tras el mediodía en que <strong>cruza el meridiano</strong> la primera noche (<strong>0</strong> noches desde el 01-01-2025) y treinta noches después. El instrumento divide la diferencia entre 30.',
      fields: [
        { label: 'Cruce, noche 0' },
        { label: 'Cruce, noche 30' },
        { label: 'Antes cada noche' },
      ],
    },
    'from-sidereal-time-to-crossing': {
      title: '¿Cuándo cruza?',
      body: 'Una estrella cruza el meridiano cuando el tiempo sidéreo es igual a su ascensión recta. El panel dice que el tiempo sidéreo a la medianoche que cierra la fecha es <strong>6,792 h</strong> y la ascensión recta de catálogo de Sirio es <strong>6,752 h</strong>: la estrella cruza <em>antes</em> de la medianoche, cuando el tiempo sidéreo era menor. El tiempo sidéreo avanza 1,0027379 horas por cada hora del reloj, así que fue estas horas antes de la medianoche: (6,792 − 6,752) ÷ 1,0027379. Escribe las dos lecturas del panel; el instrumento da el cruce en minutos tras el mediodía (la medianoche es 720).',
      fields: [
        { label: 'Tiempo sidéreo a medianoche' },
        { label: 'Ascensión recta de Sirio' },
        { label: 'Cruce, minutos tras el mediodía' },
      ],
    },
    'the-panel-is-later': {
      title: 'Un minuto de diferencia',
      body: 'Tu cruce es 717,6 minutos tras el mediodía. La fila «Cruza el meridiano» del panel dice 718,7.',
      prompt:
        '¿Cuántos minutos más tarde es el cruce del panel que el que calculaste?',
      hints: ['Resta tu cruce del del panel.'],
      worked:
        '718,7 − 717,6 = 1,1 minutos. La ascensión recta del catálogo es para una referencia fija (J2000,0); el panel cruza la estrella donde está en la fecha. Los pasos siguientes dicen por qué las dos difieren.',
    },
    'why-later': {
      title: 'Por qué el panel es más tardío',
      body: 'El catálogo da la ascensión recta de Sirio como 6,752 h. El Sirio del núcleo cruza 1,1 minutos más tarde que un cálculo con ese número.',
      prompt: '¿Cuál es la razón principal?',
      options: [
        'El reloj del panel va lento',
        'El eje de la Tierra experimenta precesión: el ecuador y el equinoccio a los que se refiere el catálogo (J2000,0) se han movido, así que la ascensión recta de la fecha de la estrella es mayor en cerca de un minuto de tiempo',
        'Sirio se mueve por el espacio tan deprisa que su ascensión recta crece un minuto en 25 años',
        'La refracción eleva la estrella y por eso cruza más tarde',
      ],
      misconceptions: [
        {
          say: 'El movimiento propio de Sirio cambia su posición unos 1,3 segundos de arco al año, cerca de un segundo de tiempo en 25 años: el minuto es precesión, que mueve a todas las estrellas.',
        },
        {
          say: 'La refracción cambia la altura aparente de una estrella, no la hora a la que está en el meridiano: una estrella en el meridiano no tiene refracción en acimut.',
        },
      ],
      hints: [
        'Las coordenadas del catálogo tienen una época. ¿Qué hace el eje de la Tierra a lo largo de 25 años?',
      ],
      because:
        'Precesión: el eje de la Tierra traza un cono en 25 800 años, moviendo el equinoccio a lo largo del ecuador 50 segundos de arco al año, así que toda ascensión recta crece, unos 3 segundos de tiempo al año cerca del ecuador. En 25 años es un minuto: el panel usa el lugar de la estrella para la noche, el número del catálogo es de 2000.',
    },
    'in-your-words': {
      title: 'Con tus palabras',
      body: 'Has encontrado lo mismo de dos maneras: una estrella llega 3 minutos 56 segundos antes cada noche, y el tiempo sidéreo a medianoche sube unos 3,9 minutos de reloj cada día.',
      prompt:
        'Explica, como a un amigo, por qué las estrellas salen antes cada noche, y qué le dice a un observador el tiempo sidéreo de un lugar.',
    },
    'what-you-worked-out': {
      title: 'Lo que averiguaste',
      body: 'Un día sidéreo es 235,9 segundos más corto que un día solar, lo que el panel confirmó como 3,93 minutos antes cada noche para Sirio. Con el tiempo sidéreo a medianoche y la ascensión recta hallaste que la estrella cruza el meridiano a los 717,6 minutos tras el mediodía, y que el cruce del núcleo es un minuto más tardío porque una posición de catálogo lleva una época: la ascensión recta de la fecha se ha movido desde 2000. El modelo de apuntado de un telescopio hace esta aritmética para cada objetivo.\n\nEl panel es un modelo del cielo, calculado con el núcleo del Laboratorio del Cielo. Usa el lugar aparente de la estrella, con precesión, nutación y aberración; esta investigación separó la primera, la mayor, y dejó las otras para una mirada más profunda.',
    },
  },
};

export const COORDINATES_AND_TIME_DEEPER_ES = {
  steps: {
    'ra-shift': {
      title: 'El cambio en ascensión recta',
      body: 'A primer orden, una posición se mueve cada año <em>m</em> + <em>n</em> sen α tan δ segundos de tiempo en ascensión recta, con <em>m</em> = 3,075 s y <em>n</em> = 1,336 s al año, y 20,04 cos α segundos de arco en declinación. Sirio está en α = 101,29° (6,752 h) y δ = −16,72°. La fecha del panel es 25 años después de J2000.',
      prompt:
        '¿Cuántos segundos de tiempo ha cambiado su ascensión recta en 25 años?',
      hints: [
        'Primero el ritmo anual: 3,075 + 1,336 × sen(101,29°) × tan(−16,72°).',
        'El ritmo es de unos 2,7 segundos al año.',
      ],
      worked:
        '3,075 + 1,336 × 0,9806 × (−0,3008) = 2,681 segundos al año; × 25 = 67,0 segundos. La precesión rigurosa del núcleo da 67,1 segundos (0,2797 grados): la fórmula de primer orden es buena a una décima de segundo en este intervalo y a esta declinación. 67 segundos son 1,1 minutos: el minuto del paso anterior.',
    },
    'dec-shift': {
      title: 'El cambio en declinación',
      body: 'Usa la fórmula de declinación: 20,04 cos α segundos de arco al año, con α = 101,29° (cos α = −0,196), durante 25 años.',
      prompt:
        '¿Cuántos segundos de arco ha cambiado la declinación de Sirio (da el número con signo)?',
      hints: ['Multiplica el ritmo anual por cos α y por el número de años.'],
      worked:
        '20,04 × (−0,196) × 25 = −98,4 segundos de arco; la precesión rigurosa da −99,5. La declinación disminuye: Sirio queda 1,7 minutos de arco más al sur de lo que dice el catálogo.',
    },
    'pointing-in-pixels': {
      title: 'Lo que cuesta una posición sin corregir',
      body: 'Se apunta un telescopio con la posición de catálogo J2000 de Sirio y sin precesión. La cámara del telescopio de 1,0 m tiene píxeles de 0,389 segundos de arco, así que un desplazamiento de 99,5 segundos de arco en declinación es cierto número de píxeles.',
      prompt: '¿Cuántos píxeles son solo el error en declinación?',
      hints: [
        'Divide los segundos de arco entre los segundos de arco por píxel.',
      ],
      worked:
        '99,5 ÷ 0,389 = 256 píxeles en declinación, y un desplazamiento en ascensión recta de 67 segundos de tiempo son 1007 segundos de arco, 965 en el cielo (× cos δ), otros 2500 píxeles. La estrella ni siquiera está en la imagen: su campo mide 26,5 minutos de arco de ancho, 4096 píxeles, y el apuntado se equivoca en 16 minutos de arco. Los modelos de apuntado siempre aplican la precesión.',
    },
  },
};

export const A_NIGHT_AT_THE_TELESCOPE_ES = {
  title: 'Una noche en el telescopio, de principio a fin',
  subtitle:
    'Planificar, exponer, calibrar, medir e informar una estrella con un plan preparado: cinco estaciones, cada una con el número que entrega a la siguiente',
  objectives: [
    'Seguir una observación por sus cinco estaciones (plan, exposición, calibración, medida e informe) y nombrar lo que cada una entrega a la siguiente',
    'Leer las horas utilizables y la mejor masa de aire de un plan de noche, y decir qué supone un plan sobre el tiempo',
    'Planificar la exposición para una señal a ruido, calibrar con estrellas patrón, comprobar una imagen sintética con la predicción y combinar las incertidumbres en cuadratura',
    'Decir qué término de la incertidumbre final es el mayor y qué mejoraría más el número',
  ],
  steps: {
    'five-stations': {
      title: 'Cinco estaciones',
      body: 'Una observación es una cadena. Un <strong>plan</strong> dice cuándo un objetivo está alto y a oscuras; una <strong>exposición</strong> es lo bastante larga para alcanzar una señal a ruido; una <strong>calibración</strong> convierte cuentas en una magnitud; una <strong>medida</strong> lee las cuentas de la imagen; y un <strong>informe</strong> da el número con aquello a lo que es bueno. Cada estación es un instrumento que ya conoces, y cada una entrega a la siguiente un número.\n\nEsta investigación sigue un plan preparado: una estrella de magnitud 19 en el telescopio de 1,0 m de Las Cumbres, la noche del 29-01-2025 (Luna nueva), desde un sitio a 30° de latitud norte. Cada imagen y cada noche de estrellas patrón es <strong>sintética</strong>, y los valores de la instalación son los de la biblioteca de instrumentos; nadie ha observado esto. La primera estación es el planificador de noche.',
    },
    'station-when': {
      title: 'Estación 1: ¿cuándo está alta?',
      body: 'El planificador usa <strong>Régulo</strong> en lugar de la posición del campo. Lee las <strong>horas de oscuridad astronómica</strong> de esa noche y, para Régulo, las <strong>horas utilizables</strong> (por debajo de una masa de aire de 2, a oscuras) y la <strong>mejor masa de aire</strong> que alcanza.',
      fields: [
        { label: 'Horas de oscuridad astronómica' },
        { label: 'Régulo, horas utilizables' },
        { label: 'Régulo, mejor masa de aire' },
      ],
    },
    'station-weather': {
      title: 'Un plan supone noches despejadas',
      body: 'Un plan para una noche no dice nada de las nubes. El <strong>planificador de estrategia</strong> de las investigaciones de estrategia de observación reparte tres visitas por noche en una quincena y saca el tiempo de una cadena declarada (el 60 por ciento de las noches despejadas, con persistencia). Lee su fila <strong>Visitas</strong>: cuántas visitas se ejecutaron de cuántas planificadas.',
      prompt:
        '¿Qué parte de las visitas planificadas se llevó el tiempo, en por ciento?',
      hints: [
        'Visitas perdidas = planificadas − ejecutadas; divide entre las planificadas.',
      ],
      worked:
        '(42 − 24) ÷ 42 = 42,9 por ciento. El planificador saca noches enteras perdidas de una cadena de tiempo con semilla; la fracción real en un sitio real es una estadística climática que la biblioteca no contiene, así que el número es un ejemplo sobre planes, no un pronóstico.',
    },
    'predict-the-limit': {
      title: 'Estación 2: ¿qué limita la exposición?',
      body: 'La estrella es de magnitud 19 y el cielo oscuro del telescopio de 1,0 m es de 22 magnitudes por segundo de arco cuadrado. Queremos una señal a ruido de 50 en una exposición con una masa de aire de 1,1. Todavía no leas el planificador.',
      prompt: 'El mayor término del presupuesto de ruido será&hellip;',
      options: [
        'Los fotones de la propia estrella',
        'Los fotones del cielo en la abertura',
        'La corriente oscura',
        'El ruido de lectura de la cámara',
      ],
      hints: [
        'Compara la estrella de magnitud 19 con el cielo dentro de su abertura, que en este sitio sale cerca de la magnitud 20.',
      ],
      because:
        'Los fotones de la propia estrella, el 49 por ciento, con el ruido de lectura el 28 y el cielo el 23. Una estrella tan brillante contra un cielo oscuro está limitada por sí misma, no por el cielo como las más débiles.',
    },
    'station-expose': {
      title: 'Estación 2: ¿cuánto exponer?',
      body: 'Usa el <strong>planificador de exposición</strong>: Las Cumbres 1,0 m en V, un brillo de <strong>19</strong>, una señal a ruido objetivo de <strong>50</strong>, una exposición y una masa de aire de <strong>1,1</strong> (la del plan). Lee la <strong>exposición total</strong> y el por ciento del ruido al cuadrado que viene de los <strong>fotones del objetivo</strong>.',
      fields: [
        { label: 'Exposición total' },
        { label: 'Parte de los fotones del objetivo' },
      ],
    },
    'station-calibrate': {
      title: 'Estación 3: ¿cuánto vale una cuenta?',
      body: 'El panel de <strong>calibración</strong> es una noche sintética de estrellas patrón cuyas magnitudes se conocen: ajusta el punto cero, la extinción del aire y un término de color a ellas, y dice qué deja sin saber la noche sobre un objetivo. Lee el <strong>punto cero a masa de aire 1</strong>, la <strong>extinción</strong> y la incertidumbre de una sigma de la <strong>magnitud calibrada de la estrella objetivo</strong>. El instrumento del panel es uno sintético propio; lo que pasa a la cadena es el tamaño de la incertidumbre que deja una noche de catorce patrones.',
      fields: [
        { label: 'Punto cero a masa de aire 1' },
        { label: 'Extinción del aire, k' },
        { label: 'Incertidumbre del objetivo calibrado' },
      ],
    },
    'station-measure': {
      title: 'Estación 4: ¿qué dice la imagen?',
      body: 'Vuelve al planificador de exposición con el mismo plan. La imagen junto a la lectura es una exposición sintética de exactamente ese plan. Lee la señal a ruido <strong>predicha</strong> para su abertura y la señal a ruido <strong>medida</strong> en ella con fotometría de abertura.',
      fields: [
        { label: 'Señal a ruido predicha' },
        { label: 'Señal a ruido medida' },
      ],
    },
    'station-report': {
      title: 'Estación 5: el número y a qué es bueno',
      body: 'Una señal a ruido de 50 es una incertidumbre fotométrica de 1,0857 ÷ 50 = 0,0217 magnitudes (1,0857 es 2,5 ÷ ln 10). La calibración deja 0,008. Dos incertidumbres independientes se combinan como la raíz cuadrada de la suma de sus cuadrados.',
      prompt:
        '¿Cuál es la incertidumbre total de una sigma de la magnitud informada, en magnitudes?',
      hints: ['Eleva al cuadrado cada incertidumbre, súmalas y toma la raíz.'],
      worked:
        '√(0,0217² + 0,008²) = √(0,000471 + 0,000064) = 0,0231 magnitudes: el informe dice «V = (valor calibrado) ± 0,023». Sumarlas como 0,0217 + 0,008 = 0,0297 la exageraría; los errores independientes no caen todos en el mismo sentido.',
    },
    'which-term-dominates': {
      title: '¿Qué mejoraría más el número?',
      body: 'El informe es bueno a 0,023 magnitudes: 0,022 de los fotones de la estrella y 0,008 de la calibración.',
      prompt: '¿Qué cambio mejoraría más la incertidumbre final?',
      options: [
        'Calibrar mejor: reducir a la mitad los 0,008 de la calibración',
        'Recoger más luz de la estrella: una exposición más larga o un telescopio mayor',
        'Usar un filtro distinto',
        'Nada: 0,023 magnitudes es lo mejor que da la fotometría',
      ],
      misconceptions: [
        {
          say: 'Reducir a la mitad el término de la calibración baja el total de 0,0231 a 0,0225, menos de un tres por ciento: el término mayor en una suma en cuadratura es casi todo.',
        },
        {
          say: 'La fotometría llega a 0,01 magnitudes y menos para estrellas brillantes; un suelo del aplanado ronda el uno por ciento, y los pasos profundos de la investigación lo encuentran.',
        },
      ],
      hints: ['En una suma de cuadrados domina el término mayor.'],
      because:
        'El ruido de fotones de la estrella es el término mayor, así que más luz es lo que ayuda: doblar la señal a ruido lo reduce a la mitad. La calibración ya es pequeña y mejorarla más cambia poco hasta que se reduzca el ruido de fotones.',
    },
    'what-could-go-wrong': {
      title: 'Qué podría salir mal',
      body: 'La cadena dio un número, y cada estación supuso algo: una noche despejada, una calibración válida toda la noche, una imagen sin defectos.',
      prompt:
        'Nombra una suposición de una estación que podría fallar en una noche real, di qué verías si fallara y qué harías.',
    },
    'what-you-worked-out': {
      title: 'Lo que averiguaste',
      body: 'La estación 1 halló 8,1 horas utilizables con una masa de aire de 1,05 en una noche de Luna nueva, y el planificador de estrategia mostró que un plan de varias noches pierde el 43 por ciento de sus visitas con una cadena de tiempo declarada. La estación 2 pidió 59 segundos para una señal a ruido de 50, limitada por los fotones de la propia estrella. La estación 3 calibró con patrones a 0,008 magnitudes. La estación 4 halló la señal a ruido medida de la imagen a un sorteo de la predicción. La estación 5 combinó 0,022 y 0,008 en 0,023 magnitudes, y el término mayor, los fotones de la estrella, es el que hay que mejorar.\n\nCada imagen y noche de aquí es sintética y los valores de la instalación son los de la biblioteca; la cadena es una predicción con suposiciones declaradas, y deja fuera el error de aplanado y de resta de cielo, el amontonamiento, las nubes y una atmósfera cambiante. La siguiente investigación, <em>De fotones a un número</em>, traza la aritmética de las estaciones 2 a 5 en un solo cálculo.',
    },
  },
};

export const A_NIGHT_AT_THE_TELESCOPE_DEEPER_ES = {
  steps: {
    'a-moonlit-night': {
      title: 'El mismo plan con una Luna brillante',
      body: 'Supón que la Luna estuviera sobre el horizonte y hiciera el cielo <strong>2 magnitudes</strong> más brillante (pon <strong>Cielo más brillante en</strong> en 2: un desplazamiento de ejercicio, no un modelo de luz lunar). Lee la nueva exposición total.',
      prompt:
        '¿Cuántas veces mayor es la exposición que con el cielo oscuro (59,3 segundos)?',
      hints: ['Divide la nueva exposición total entre 59,3.'],
      worked:
        '123,3 ÷ 59,3 = 2,08. El cielo es 6,3 veces más brillante pero la exposición solo se duplica, porque la mitad del ruido eran los fotones de la propia estrella, que el cielo no toca: para un objetivo brillante la Luna cuesta poco, para uno débil (la investigación del fondo de cielo) es toda la exposición.',
    },
    'two-exposures': {
      title: 'Dividir la exposición',
      body: 'Devuelve el cielo a oscuro y pon el número de <strong>exposiciones</strong> en 2 (un telescopio puede no poder tomar una sola imagen larga). Lee el total.',
      prompt:
        '¿Cuántas veces mayor es el total que con una exposición (59,3 segundos)?',
      hints: ['Divide el total de dos exposiciones entre 59,3.'],
      worked:
        '70,5 ÷ 59,3 = 1,19. Cada imagen paga una vez el ruido de lectura de la cámara, así que dos imágenes llevan el doble de ruido de lectura, y los fotones de la estrella y del cielo se recogen igual se divida como se divida el tiempo.',
    },
  },
};

export const FROM_PHOTONS_TO_A_NUMBER_ES = {
  title: 'De fotones a un número',
  subtitle:
    'La cadena entera como un solo cálculo trazado: electrones, ruido, señal a ruido, magnitud, calibración y la incertidumbre que se arrastra en cada paso',
  objectives: [
    'Trazar una magnitud por la aritmética de una medida: electrones, ruido, señal a ruido, incertidumbre de la magnitud, magnitud instrumental y magnitud calibrada',
    'Arrastrar una incertidumbre por cada paso y combinar las independientes en cuadratura',
    'Decir cuánto cuesta reducir a la mitad la incertidumbre, y por qué no siempre son cuatro veces',
    'Hallar dónde un suelo sistemático (error de aplanado) supera al ruido de fotones',
  ],
  steps: {
    'a-number-from-photons': {
      title: 'Un número, trazado',
      body: 'La investigación anterior recorrió las estaciones de una noche. Esta escribe la aritmética de las cuatro últimas como una sola traza: los <strong>electrones</strong> que la estrella pone en su abertura, el <strong>ruido</strong> sobre ellos, la <strong>señal a ruido</strong> y la incertidumbre de la magnitud que implica, la <strong>magnitud</strong> de la estrella a partir de su tasa y la <strong>calibración</strong> sumada en cuadratura.\n\nEl planificador de exposición da los electrones y el ruido de una estrella de magnitud 19 en el telescopio de 1,0 m de Las Cumbres con una masa de aire de 1,1, una señal a ruido de 50 y una exposición. Todas las imágenes son sintéticas; el punto cero del planificador es un modelo de rendimiento con un rendimiento aportado de 0,5, un valor didáctico, no el del telescopio.',
    },
    'the-counts': {
      title: 'Paso 1: señal y ruido',
      body: 'En la fila <strong>Predicho para la abertura de la propia imagen</strong> el planificador da los electrones que la estrella pone en la abertura, con su ruido. Escríbelos; el instrumento forma la señal a ruido.',
      fields: [
        { label: 'Señal' },
        { label: 'Ruido' },
        { label: 'Señal a ruido' },
      ],
    },
    'the-magnitude-uncertainty': {
      title: 'Paso 2: la incertidumbre de una magnitud',
      body: 'Una incertidumbre fraccionaria del flujo δF ÷ F es una incertidumbre en la magnitud de 2,5 ÷ ln 10 = 1,0857 veces eso. La incertidumbre fraccionaria es la inversa de la señal a ruido.',
      prompt:
        '¿Cuál es la incertidumbre de una sigma de la magnitud instrumental, con una señal a ruido de 49,45, en magnitudes?',
      hints: ['1,0857 dividido entre la señal a ruido.'],
      worked:
        '1,0857 ÷ 49,45 = 0,02195 magnitudes. Una regla para llevar en la cabeza: una señal a ruido de 100 son 0,011 magnitudes, y de 20 son 0,054.',
    },
    'the-rate-to-a-magnitude': {
      title: 'Paso 3: de electrones a una magnitud',
      body: 'La exposición fue de 59,3 segundos, así que la estrella entregó 5101 ÷ 59,3 = 86,0 electrones por segundo. Una estrella de magnitud 0 da, en esta configuración, <strong>3,50 × 10⁹</strong> electrones por segundo en el cenit (la abertura de 1,0 m a través de V con el rendimiento aportado). La magnitud observada es −2,5 log₁₀ del cociente. Con una masa de aire de 1,1 el aire ha atenuado la estrella 0,2 × 0,1 = 0,02 magnitudes, que se restituyen.',
      prompt: '¿Qué magnitud da la traza para la estrella?',
      hints: [
        'La magnitud observada es −2,5 log₁₀ de la tasa entre el punto cero.',
        'Luego devuelve la extinción que añadió el aire.',
      ],
      worked:
        '−2,5 log₁₀(86,0 ÷ 3,50×10⁹) = 19,02 observada; menos 0,02 del aire son 19,00 por encima de la atmósfera: la magnitud con la que empezó el plan. La traza cierra el círculo: las cuentas contienen la magnitud, con la incertidumbre del paso anterior.',
    },
    'the-calibration-term': {
      title: 'Paso 4: lo que añade la calibración',
      body: 'La noche sintética del panel de calibración deja un objetivo calibrado con cierta incertidumbre pequeña (es un instrumento distinto del del planificador; solo pasa el tamaño de la incertidumbre que deja una noche de catorce patrones). Lee el <strong>punto cero a masa de aire 1</strong> con su incertidumbre, y la incertidumbre de la <strong>estrella objetivo</strong> calibrada.',
      fields: [
        { label: 'Incertidumbre del punto cero' },
        { label: 'Incertidumbre del objetivo calibrado' },
      ],
    },
    'adding-in-quadrature': {
      title: 'Paso 5: el total',
      body: 'Dos incertidumbres independientes: 0,02195 de los fotones de la estrella y 0,008 de la calibración.',
      prompt:
        '¿Cuál es la incertidumbre total de una sigma de la magnitud calibrada?',
      hints: ['La raíz cuadrada de la suma de los cuadrados.'],
      worked:
        '√(0,02195² + 0,008²) = √(0,000482 + 0,000064) = 0,0234 magnitudes. El informe: V = 19,00 ± 0,02 (el segundo decimal es el último que sostiene la incertidumbre).',
    },
    'which-term-wins': {
      title: 'De dónde viene la incertidumbre',
      body: 'La traza llevó dos términos y un total de 0,0234 magnitudes.',
      prompt: '¿Qué afirmación respalda la traza?',
      options: [
        'El ruido de fotones de la estrella aporta cerca del 88 por ciento de la varianza, así que más luz mejora más el número',
        'La calibración aporta la mayor parte de la varianza, así que mejores patrones lo mejoran más',
        'Los dos aportan por igual',
        'La incertidumbre está dominada por la extinción de la atmósfera',
      ],
      misconceptions: [
        {
          say: 'La varianza de la calibración es 0,000064 frente a 0,000482 de la estrella: el 12 por ciento del total.',
        },
        {
          say: 'La extinción está dentro de los 0,008 de la calibración, que es el término menor.',
        },
      ],
      hints: ['Compara las dos varianzas, no las dos incertidumbres.'],
      because:
        'Las varianzas se suman: 0,000482 de 0,000546 es el 88 por ciento, de la estrella. Leer las proporciones en las varianzas, no en las incertidumbres, es la forma rápida de ver qué término atacar.',
    },
    'halve-it': {
      title: 'Reducir a la mitad la incertidumbre',
      body: 'El doble de señal a ruido reduce a la mitad el término de fotones. Lee la exposición total para una señal a ruido objetivo de <strong>50</strong> y de <strong>100</strong> (lo demás sin cambiar); el instrumento divide.',
      fields: [
        { label: 'Exposición total, señal a ruido 50' },
        { label: 'Exposición total, señal a ruido 100' },
        { label: 'Veces mayor' },
      ],
    },
    'the-number-you-would-report': {
      title: 'El número que informarías',
      body: 'La traza termina con una magnitud y una incertidumbre: 19,00 ± 0,02.',
      prompt:
        'Escribe el resultado como una frase de informe: el número con su incertidumbre, la banda, a qué está calibrado y una cosa que supone.',
    },
    'what-you-worked-out': {
      title: 'Lo que averiguaste',
      body: 'Una estrella de magnitud 19 dio 5101 electrones con un ruido de 103: una señal a ruido de 49,5, que son 0,022 magnitudes. Su tasa, 86 electrones por segundo, dio 19,02 magnitudes observadas y 19,00 por encima de la atmósfera. La calibración añadió 0,008, en cuadratura: un total de 0,023 magnitudes, el 88 por ciento de la varianza de los fotones de la estrella. Reducir a la mitad la incertidumbre costó 3,2 veces la exposición, no 4, porque parte del ruido es de la cámara.\n\nLa traza es una predicción con suposiciones declaradas. El punto cero del planificador es un rendimiento aportado y el instrumento de la calibración es propio: la cadena muestra la aritmética, no un telescopio real. Deja fuera el error de aplanado, el amontonamiento y el cielo cambiante.',
    },
  },
};

export const FROM_PHOTONS_TO_A_NUMBER_DEEPER_ES = {
  steps: {
    'a-flat-field-floor': {
      title: 'Un suelo bajo la incertidumbre',
      body: 'Un aplanado nunca es perfecto. Supón que queda un error sistemático del 1 por ciento (0,0109 magnitudes) en el flujo de la estrella, independiente de los demás.',
      prompt:
        '¿Cuál es la incertidumbre total con el término de fotones (0,02195), la calibración (0,008) y el suelo (0,0109)?',
      hints: ['Eleva los tres al cuadrado, súmalos y toma la raíz.'],
      worked:
        '√(0,02195² + 0,008² + 0,0109²) = √(0,000482 + 0,000064 + 0,000119) = 0,0258 magnitudes: el suelo añade un 10 por ciento al total, todavía por detrás de los fotones de la estrella.',
    },
    'where-the-floor-wins': {
      title: 'Dónde gana el suelo',
      body: 'El término de fotones baja al subir la señal a ruido; el suelo no. Un suelo del 1 por ciento del flujo son 0,0109 magnitudes, y el término de fotones es el mismo 1,0857 por el error fraccionario 1 ÷ (señal a ruido). El planificador avisa de esto por encima de una señal a ruido de 100.',
      prompt:
        '¿A qué señal a ruido iguala el término de fotones a un suelo del 1 por ciento?',
      hints: [
        '¿Dónde el error fraccionario de fotones, 1 ÷ S, es igual a 0,01?',
      ],
      worked:
        'El suelo es un error fraccionario de 0,01; el término de fotones es un error fraccionario de 1 ÷ S, así que son iguales en S = 100. Ese es el punto donde empieza el aviso del planificador: más allá, más exposición no compra casi nada, porque el suelo no disminuye con el tiempo.',
    },
  },
};
