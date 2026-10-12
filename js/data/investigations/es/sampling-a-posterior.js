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
  steps: [
    {
      title: 'Qué hace un muestreador',
      body: `Un ajuste pregunta qué valores hacen más probables los datos, y cuán ancho es ese valle de chi cuadrado. Una <strong>posterior</strong> hace otra pregunta: dados los datos y lo que se creía antes de ellos (una <strong>a priori</strong>), ¿cuán probable es cada valor? Se responde sacando muchas muestras de esa distribución y leyendo los intervalos de las muestras.
             \n\nEl cuaderno muestrea el tamaño del planeta, Rp/R*, y el parámetro de impacto del tránsito de HD 209458 con un <strong>muestreador de conjunto afín-invariante</strong>, escrito solo en NumPy: cuatro grupos independientes de ocho caminantes, cada uno proponiendo un paso a lo largo de la recta hacia otro caminante de su grupo, aceptado según el cociente de la posterior. La época, el período, a/R* y el oscurecimiento del limbo se mantienen fijos, en los valores que halló el panel de ajuste del Observatorio. La a priori es uniforme. El cuaderno también calcula la posterior exacta en una rejilla, para comprobar el muestreador, y el intervalo de perfil del mismo problema de dos parámetros, para comparar.
             \n\nAbre la página de cálculo en <strong>/compute/</strong> de este sitio. Solo funciona con conexión y la primera vez descarga unos 9 MB de Python, cuando pulsas el botón. Elige el cuaderno <strong>Muestrear la posterior de un tránsito</strong>, deja su entrada de ejemplo y sus ajustes. La ejecución tarda aproximadamente un minuto. Todavía no pulses Ejecutar.`,
    },
    {
      title: 'Qué anchura tendrá',
      body: `El panel de ajuste, con la época, el período, a/R*, el oscurecimiento del limbo y la línea de base también libres, halló Rp/R* = 0,1193 con una incertidumbre de 0,0016.`,
      prompt:
        'Aquí solo Rp/R* y el parámetro de impacto son libres. El intervalo del 68 por ciento del cuaderno para Rp/R* será&hellip;',
      options: [
        'aproximadamente igual de ancho, más o menos 0,0016',
        'unas diez veces más estrecho',
        'unas diez veces más ancho, porque muestrear explora más',
        'cero, porque el muestreador se asienta en un solo valor',
      ],
      because:
        'Rp/R* está correlacionado con los números que aquí se mantienen fijos, y un ajuste que los libera lleva su incertidumbre a la de Rp/R*. Fijarlos la elimina, y el intervalo se reduce a una doceava parte aproximadamente.',
    },
    {
      title: 'Ejecútalo: las muestras',
      body: `Pulsa <strong>Iniciar el entorno</strong>, espera, y luego <strong>Ejecutar el cuaderno</strong>. Lee las cantidades que devuelve e introdúcelas aquí: la mediana de las muestras de Rp/R* y la anchura de su intervalo del 68 por ciento (extremo superior menos extremo inferior), y lo mismo para el parámetro de impacto.`,
      fields: [
        { label: 'Rp/R*, mediana' },
        { label: 'Rp/R*, anchura del intervalo' },
        { label: 'Parámetro de impacto, mediana' },
        { label: 'Parámetro de impacto, anchura del intervalo' },
      ],
    },
    {
      title: 'Si convergió',
      body: `Las muestras de un muestreador significan algo solo si la cadena ha corrido lo bastante para olvidar de dónde partió. El cuaderno informa del mayor <strong>R-hat dividido</strong> (debe ser menor que 1,05: los cuatro conjuntos independientes coinciden entre sí), del menor <strong>tamaño de muestra efectivo</strong> (al menos 400 muestras de información independiente) y de la <strong>fracción de aceptación</strong> de las propuestas (entre 0,1 y 0,9). Introduce los tres.`,
      fields: [
        { label: 'Mayor R-hat' },
        { label: 'Menor tamaño de muestra efectivo' },
        { label: 'Fracción de aceptación' },
      ],
    },
    {
      title: 'Posterior y perfil',
      body: `La tabla también da el intervalo de perfil de cada parámetro, el rango de valores cuyo chi cuadrado está a una unidad del mejor, hallado en la rejilla, y el cociente de la anchura del intervalo de las muestras entre él. Los cocientes son 0,99 para los dos.`,
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
          say: 'El muestreador se comprueba con la rejilla de la misma posterior (sus medianas coinciden hasta 0,02 desviaciones típicas) y con problemas de respuesta exacta. El perfil coincide por otra razón: el problema es casi gaussiano.',
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
    {
      title: 'Por qué tanto más estrecho',
      body: `La incertidumbre del panel de ajuste para Rp/R* es 0,0016. El intervalo de este cuaderno es más o menos 0,00013, doce veces menor, con la misma curva de luz.`,
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
        'Un intervalo está condicionado a lo que se mantiene fijo. Fijar la época, el período, a/R* y el oscurecimiento del limbo en sus mejores valores hace el intervalo de Rp/R* doce veces más estrecho, y ninguno se conoce tan bien. Estrecho no es lo mismo que conocido.',
    },
    {
      title: 'Una ejecución demasiado corta',
      body: `Pon los <strong>pasos</strong> del cuaderno en <strong>1000</strong>, deja el resto, y ejecútalo de nuevo. Tarda aproximadamente quince segundos.`,
      prompt: '¿Qué hace?',
      options: [
        'Se detiene con un error y no da ningún intervalo, diciendo cuál de sus límites de convergencia falló y que se aumente el número de pasos',
        'Da intervalos más estrechos, porque se usaron menos pasos',
        'Da los mismos intervalos, solo que más rápido',
        'Falla porque 1000 está fuera de rango',
      ],
      misconceptions: [
        {
          say: 'Menos pasos no estrechan una distribución; dejan a la cadena sin haber olvidado de dónde partió, que es lo que miden R-hat y el recuento de autocorrelación.',
        },
        {
          say: '1000 es el valor más pequeño que permite el ajuste; el cuaderno se niega a propósito, con sus propias palabras, no fallando.',
        },
      ],
      hints: [
        'Lee el mensaje que muestra la página tras las palabras sobre que el cuaderno se detuvo con un error.',
      ],
      because:
        'El cuaderno somete cada ejecución a límites: los conjuntos deben coincidir (R-hat menor que 1,05), debe haber al menos 400 muestras efectivas, y la cadena tras su calentamiento debe tener al menos 50 tiempos de autocorrelación. Una ejecución de 1000 pasos incumple el último y a menudo el primero, así que el cuaderno devuelve los diagnósticos y ningún intervalo, porque un intervalo de una cadena que no ha convergido es un número sin nada detrás.',
    },
    {
      title: 'Lo que has deducido',
      body: `Un muestreador sacó 128.000 valores de Rp/R* y del parámetro de impacto, e informó de 0,1193 &plusmn; 0,0001 y 0,430 &plusmn; 0,003, las mismas anchuras que los intervalos de perfil del mismo problema, porque el problema es casi gaussiano en estos dos números. Las muestras coinciden con una rejilla de la posterior exacta, y el muestreador se ha comprobado con problemas de respuesta exacta.
             \n\nLo que el intervalo no es: está condicionado a la época, el período, a/R* y el oscurecimiento del limbo, que se mantuvieron fijos, y es doce veces más estrecho que el del panel de ajuste por eso. Y un muestreador que no corre lo bastante lo dice y no da nada, que es el comportamiento que vale la pena pedir a cualquiera. La ejecución es tuya para conservarla: su cápsula registra el hash del cuaderno y el de la curva de luz, así que un informe puede citarla.`,
    },
  ],
};
