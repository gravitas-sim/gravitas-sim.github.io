// Muestrear una posterior - español, paso a paso con ../sampling-a-posterior.js.
export default {
  title: 'Muestrear una posterior',
  subtitle:
    'El tamaño del planeta y el parámetro de impacto de un tránsito muestreados en Python, con la convergencia comprobada, y comparados con el intervalo de perfil del mismo problema',
  objectives: [
    'Ejecutar un muestreador de conjunto sobre la posterior de un tránsito y leer sus diagnósticos de convergencia',
    'Decir qué son un intervalo posterior y un intervalo de perfil, y cuándo casi coinciden',
    'Explicar por qué fijar parámetros estrecha un intervalo sin hacer que se conozcan',
    'Decir por qué un muestreador que se niega a dar un intervalo de una ejecución corta funciona bien',
  ],
  steps: {
    'what-a-sampler-does': {
      title: 'Qué hace un muestreador',
      body: `Cuando se mantienen fijos algunos números de un ajuste, ¿cuánto de la respuesta es de los datos y cuánto de la elección del valor fijo? Lo averiguarás eligiendo uno. Un ajuste pregunta qué valores hacen más probables los datos, y cuán ancho es ese valle de chi cuadrado. Una <strong>posterior</strong> hace otra pregunta: dados los datos y lo que se creía antes de ellos (una <strong>a priori</strong>), ¿cuán probable es cada valor? Se responde sacando muchas muestras de esa distribución y leyendo los intervalos de las muestras.
             \n\nEl cuaderno muestrea el tamaño del planeta, Rp/R*, y el parámetro de impacto del tránsito de HD 209458 con un <strong>muestreador de conjunto afín-invariante</strong>, escrito solo en NumPy: cuatro grupos independientes de ocho caminantes, cada uno proponiendo un paso a lo largo de la recta hacia otro caminante de su grupo, aceptado según el cociente de la posterior. La época, el período y el oscurecimiento del limbo se mantienen fijos, en los valores que halló el panel de ajuste del Observatorio, y también a/R*, en un valor que elegirás. La a priori es uniforme. El cuaderno también calcula la posterior exacta en una rejilla, para comprobar el muestreador, y el intervalo de perfil del mismo problema de dos parámetros, para compararlo.
             \n\nAbre la página de cálculo en <strong>/compute/</strong> de este sitio. Solo funciona con conexión y la primera vez descarga unos 9 MB de Python, cuando pulsas el botón. Elige el cuaderno <strong>Muestrear la posterior de un tránsito</strong> y deja su entrada de ejemplo y su número de pasos. La ejecución tarda aproximadamente un minuto. Todavía no pulses Ejecutar.`,
    },
    'pick-the-ratio-predict-the-width': {
      title: 'Elige el tamaño de la órbita, predice la anchura',
      body: `El paso siguiente te hace mantener fijo el tamaño de la órbita, a/R*, en un valor de un menú: <strong>8</strong>, <strong>8,5</strong>, <strong>9,21</strong> o <strong>10</strong>. Solo Rp/R* y el parámetro de impacto siguen libres. El panel de ajuste, con a/R*, la época, el período, el oscurecimiento del limbo y la línea de base también libres, halló Rp/R* = 0,1193 con una incertidumbre de 0,0016.`,
      prompt:
        'Sea cual sea el valor que fijes, el intervalo del 68 por ciento del cuaderno para Rp/R* será&hellip;',
      options: [
        'aproximadamente igual de ancho, más o menos 0,0016',
        'unas diez veces más estrecho, y casi igual de estrecho donde fijes a/R*',
        'más estrecho en el valor que halló el panel de ajuste, y mucho más ancho cuanto más lejos de él fijes a/R*',
        'unas diez veces más ancho, porque muestrear explora más',
      ],
      because:
        'Rp/R* está correlacionado con los números que aquí se mantienen fijos, y un ajuste que los libera lleva su incertidumbre a la de Rp/R*. Fijarlos la elimina, y el intervalo se reduce a una doceava parte aproximadamente. Dónde fijes a/R* decide dónde se sitúan las muestras, no cuánto se dispersan: la anchura viene de cómo los datos limitan Rp/R* una vez fijado a/R*.',
    },
    'the-draws-at-your-ratio': {
      title: 'Ejecútalo: las muestras con el tamaño de órbita que elegiste',
      body: `Elige del menú el tamaño de órbita que vas a fijar: <strong>8</strong>, <strong>8,5</strong>, <strong>9,21</strong> o <strong>10</strong>. Pulsa <strong>Iniciar el entorno</strong>, espera, pon <strong>a/R*</strong> en tu elección y luego <strong>Ejecutar el cuaderno</strong>. Lee las cantidades que devuelve e introdúcelas aquí: tu elección, la mediana de las muestras de Rp/R* y la anchura de su intervalo del 68 por ciento (extremo superior menos extremo inferior), y lo mismo para el parámetro de impacto.`,
      fields: [
        { label: 'El a/R* que fijaste' },
        { label: 'Rp/R*, mediana' },
        { label: 'Rp/R*, anchura del intervalo' },
        { label: 'Parámetro de impacto, mediana' },
        { label: 'Parámetro de impacto, anchura del intervalo' },
      ],
    },
    'did-it-converge': {
      title: 'Si convergió',
      body: `Las muestras de un muestreador significan algo solo si la cadena ha corrido lo bastante para olvidar de dónde partió. Para la ejecución que acabas de hacer, el cuaderno informa del mayor <strong>R-hat dividido</strong> (debe ser menor que 1,05: los cuatro conjuntos independientes coinciden entre sí), del menor <strong>tamaño de muestra efectivo</strong> (al menos 400 muestras de información independiente) y de la <strong>fracción de aceptación</strong> de las propuestas (entre 0,1 y 0,9). Introduce los tres.`,
      fields: [
        { label: 'Mayor R-hat' },
        { label: 'Menor tamaño de muestra efectivo' },
        { label: 'Fracción de aceptación' },
      ],
    },
    'profile-and-posterior': {
      title: 'Posterior y perfil',
      body: `La tabla también da el intervalo de perfil de cada parámetro, el rango de valores cuyo chi cuadrado está a una unidad del mejor, hallado en la rejilla, y el cociente de la anchura del intervalo de las muestras entre él. Lee los dos cocientes de tu propia ejecución: los dos son cercanos a uno.`,
      prompt: '¿Qué dice esa coincidencia?',
      options: [
        'En estos dos parámetros el problema es casi gaussiano, así que un intervalo de probabilidad y un intervalo de chi cuadrado casi coinciden: un hecho de este problema, no una regla',
        'Un intervalo posterior y un intervalo de perfil son lo mismo',
        'El muestreador es correcto, porque coincide con el perfil',
        'La a priori no importa en ningún problema',
      ],
      misconceptions: [
        {
          say: 'Uno es una probabilidad bajo una a priori; el otro es un rango de valores que ajustan casi igual de bien. Coinciden aquí, y no lo harían con una posterior asimétrica o acotada.',
        },
        {
          say: 'El muestreador se comprueba con la rejilla de la misma posterior (sus medianas coinciden hasta 0,03 desviaciones típicas con cualquier a/R* del menú) y con problemas de respuesta exacta. El perfil coincide por otra razón: el problema es casi gaussiano.',
        },
        {
          say: 'Con muchos datos una a priori uniforme cambia poco, como aquí. Con pocos datos, o un parámetro cerca de un límite, puede decidir la respuesta.',
        },
      ],
      hints: [
        'Para una verosimilitud gaussiana el rango a una unidad del mínimo de chi cuadrado y el 68 por ciento central de la probabilidad son el mismo rango.',
      ],
      because:
        'Una posterior gaussiana tiene un intervalo central del 68 por ciento de más o menos una desviación típica, y el rango de chi cuadrado más uno del perfil tiene la misma anchura. Difieren cuando la posterior es asimétrica o choca con un límite, que es donde un muestreador se gana su coste.',
    },
    'why-narrower': {
      title: 'Por qué tanto más estrecho',
      body: `La incertidumbre del panel de ajuste para Rp/R* es 0,0016. El intervalo que hallaste es más o menos 0,00014, una docena de veces menor, con la misma curva de luz, sea cual sea el a/R* que fijaste.`,
      prompt: '¿Por qué?',
      options: [
        'El panel reajusta la época, el período, a/R* y el oscurecimiento del limbo en cada valor de Rp/R*, así que su incertidumbre pasa a la de Rp/R*; aquí se mantienen fijos, lo que oculta su incertidumbre y no la elimina',
        'El cuaderno usa más datos',
        'Un muestreador es siempre más preciso que un ajuste',
        'Las barras de error del cuaderno se hicieron menores',
      ],
      misconceptions: [
        {
          say: 'Usa los mismos 1.882 puntos y las mismas barras de error, escaladas por el mismo chi cuadrado reducido.',
        },
        {
          say: 'Un muestreador es una manera de explorar una distribución, no de estrecharla: la anchura es propiedad de la verosimilitud y de la a priori, y de lo que es libre.',
        },
      ],
      hints: [
        'La investigación anterior fijó el oscurecimiento del limbo y el sigma de Rp/R* cayó a un tercio.',
      ],
      because:
        'Un intervalo está condicionado a lo que se mantiene fijo. Fijar la época, el período, a/R* y el oscurecimiento del limbo hace el intervalo de Rp/R* unas doce veces más estrecho, y ninguno se conoce tan bien. El a/R* que fijaste movió la mediana muchas semianchuras del intervalo, y la anchura no lo notó. Estrecho no es lo mismo que conocido.',
    },
    'refuse-a-short-run': {
      title: 'Una ejecución demasiado corta',
      body: `El cuaderno acepta cualquier número de pasos de 1000 a 10000. Antes de ejecutar ninguno, decide para cuáles se negará a dar un intervalo. Luego comprueba tu predicción con dos ejecuciones: pon los <strong>pasos</strong> en un número que esperes que rechace y ejecútalo, y después en uno que esperes que acepte y ejecútalo. Antes de ambas, devuelve <strong>a/R*</strong> a 9,21, el valor por defecto del cuaderno: dónde cae el límite depende de él. Una ejecución rechazada es rápida; una aceptada tarda aproximadamente un minuto.`,
      prompt: '¿Para qué números de pasos se negará el cuaderno?',
      options: [
        'Las ejecuciones cortas: una cadena demasiado corta no ha olvidado de dónde partió, así que incumple un límite de convergencia y el cuaderno no da ningún intervalo, diciendo qué límite falló',
        'Ninguno: cualquier número de su intervalo da un intervalo, y menos pasos dan uno más estrecho',
        'Solo 1000, que es el más pequeño que permite el ajuste',
        'Las ejecuciones largas, porque más pasos dan más margen a las cadenas para discrepar',
      ],
      misconceptions: [
        {
          say: 'Menos pasos no estrechan una distribución; dejan a la cadena sin haber olvidado de dónde partió, que es lo que miden R-hat y el recuento de autocorrelación.',
        },
        {
          say: 'El límite no está en el borde del ajuste: cuán larga debe ser una cadena depende de lo que tarda en olvidar su inicio, así que también se rechazan números bastante mayores que 1000. Prueba uno.',
        },
      ],
      hints: [
        'Lee el mensaje que muestra la página tras las palabras sobre que el cuaderno se detuvo con un error: nombra el límite que falló.',
      ],
      because:
        'El cuaderno somete cada ejecución a límites: los conjuntos deben coincidir (R-hat menor que 1,05), debe haber al menos 400 muestras efectivas, y la cadena tras su calentamiento debe tener al menos 50 tiempos de autocorrelación. Aquí un tiempo de autocorrelación son unos 40 pasos, así que una cadena necesita unos 2.000 pasos tras su calentamiento, la primera mitad de una ejecución, es decir, unos cuatro mil pasos en total, para pasar el último límite, y el cuaderno rechaza las ejecuciones que no llegan: devuelve los diagnósticos y ningún intervalo para una cadena que no ha convergido, porque ese intervalo es un número sin nada detrás. Dónde cae el límite depende de a/R* y de la versión de Python, así que un número cercano puede rechazarse en una máquina y aceptarse en otra. Con 9,21 y la versión comprobada, 1.000 y 2.000 pasos se rechazan con holgura, 3.000 y 4.000 por unos pocos tiempos de autocorrelación o por uno (49 frente a 50 con 4.000), y 5.000 pasos se aceptan.',
    },
    'what-you-worked-out': {
      title: 'Lo que has deducido',
      body: `Un muestreador sacó 128.000 valores de Rp/R* y del parámetro de impacto con a/R* fijo donde elegiste, e informó de intervalos tan anchos como los intervalos de perfil del mismo problema, porque el problema es casi gaussiano en estos dos números. Las muestras coinciden con una rejilla de la posterior exacta, y el muestreador se ha comprobado con problemas de respuesta exacta.
             \n\nLo que el intervalo no cubre: está condicionado a la época, el período, el oscurecimiento del limbo y el a/R* que fijaste, y es unas doce veces más estrecho que el del panel de ajuste por eso. Mover el a/R* fijo movió la mediana muchas semianchuras del intervalo y apenas cambió su anchura, así que un intervalo estrecho no es un valor conocido. Y un muestreador que no corre lo bastante lo dice y no da nada, que es el comportamiento que vale la pena pedir a cualquiera. La ejecución es tuya para conservarla: su cápsula registra el hash del cuaderno y el de la curva de luz, así que un informe puede citarla.`,
    },
  },
};

export const messages = () =>
  import('../../../i18n/computingMessagesEs.js').catch(() => {});
