// Las investigaciones de atmósfera, más a fondo: las palabras en español, paso a paso con ../atmosphere-sequence.js (D-R10-81).
// Sin lectura por una persona que lea español con fluidez.

// Por qué Venus es caliente, pasos más profundos: paso a paso con el inglés.
export const WHY_VENUS_IS_HOT_DEEPER = {
  steps: [
    {
      title: 'La Tierra sin albedo',
      body: 'El albedo de Bond fija cuánta luz solar absorbe un planeta. Pon el planeta en <strong>Tierra</strong>, cambia el albedo a <strong>la mía</strong> y ponlo en <strong>0</strong>: un planeta que lo absorbe todo. Lee la nueva temperatura de equilibrio y cuánto más cálida es que con el propio albedo de la Tierra, 254 K.',
      fields: [
        { label: 'Temperatura de equilibrio de la Tierra con albedo 0' },
        { label: 'Cuánto más cálida que con su propio albedo' },
      ],
    },
    {
      title: '¿Con qué rapidez se enrarece el aire?',
      body: 'En una atmósfera isoterma la presión baja en el mismo factor, 1/e o un 37 por ciento, en cada <strong>altura de escala</strong> <em>H</em> = <em>kT</em>/(<em>μm</em><sub>u</sub><em>g</em>). No es el grosor de la atmósfera: no hay un tope. Lee la altura de escala de <strong>Venus</strong> a su temperatura superficial, y la de la <strong>Tierra</strong>.',
      fields: [
        { label: 'Altura de escala de Venus' },
        { label: 'Altura de escala de la Tierra' },
      ],
    },
  ],
};

// Dos modelos de efecto invernadero, pasos más profundos: paso a paso con el inglés.
export const TWO_GREENHOUSE_MODELS_DEEPER = {
  steps: [
    {
      title: 'Marte en los dos modelos',
      body: 'Marte tiene una atmósfera fina. Pon el planeta en <strong>Marte</strong> y lee la emisividad de una capa y la profundidad óptica que dan su temperatura superficial medida, 210 K.',
      fields: [
        { label: 'Emisividad que da 210 K' },
        { label: 'Profundidad óptica que da 210 K' },
      ],
    },
    {
      title: 'Una unidad en cada modelo',
      body: 'Pon el planeta en <strong>Tierra</strong>. Da al modelo de una capa una emisividad de <strong>1</strong> (una capa que absorbe todo el infrarrojo) y al modelo gris una profundidad óptica de <strong>1</strong>. Lee la temperatura del suelo que da cada uno.',
      fields: [
        {
          label: 'Temperatura del suelo, modelo gris con profundidad óptica 1',
        },
        { label: 'Temperatura del suelo, una capa con emisividad 1' },
      ],
    },
    {
      title: 'Dónde se detiene el modelo gris',
      body: 'El perfil gris es la solución de Eddington. Existe una solución gris numéricamente exacta y el instrumento la dibuja discontinua. Mira lo alto de la atmósfera, con profundidad óptica 0, y lee cuánto más cálida es la curva de Eddington que la gris exacta, como porcentaje.\n\nEsa diferencia es el error de la aproximación. Un límite mayor es la palabra <em>gris</em>: la opacidad real depende de la longitud de onda, y la luz solar y el infrarrojo del planeta se absorben de maneras muy distintas, algo que este modelo no puede representar.',
      fields: [{ label: 'Eddington frente al gris exacto, arriba' }],
    },
  ],
};

// El Sol que gira, pasos más profundos: paso a paso con el inglés (Prompt 194, parte 2).
export const THE_TURNING_SUN_DEEPER = {
  steps: [
    {
      title: 'Un segundo grupo, en el sur',
      body: 'G3 es el grupo más grande de las imágenes, a 20 grados al sur. Elige <strong>G3</strong> con los mismos días (1 a 9) y lee su <strong>velocidad sideral</strong> y la incertidumbre de esa velocidad.',
      fields: [
        { label: 'Velocidad sideral de G3 (grados por día)' },
        { label: 'La incertidumbre de esa velocidad (grados por día)' },
      ],
    },
    {
      title: 'Lo que dice la ley de referencia en cada uno',
      body: 'La ley de referencia, Howard, Harvey y Forgach (1990), da la velocidad a cualquier latitud con una forma fija, <em>A</em> + <em>B</em> sen<sup>2</sup>(latitud) + <em>C</em> sen<sup>4</sup>(latitud). Se midió sobre rasgos magnéticos, no sobre manchas, y se copió del artículo sin volver a leerlo aquí. Lee lo que predice a la latitud de G1 y a la de G3: cambia entre los dos grupos.',
      fields: [
        {
          label:
            'La velocidad de la ley a la latitud de G1, 7,3 grados (grados por día)',
        },
        {
          label:
            'La velocidad de la ley a la latitud de G3, −20,1 grados (grados por día)',
        },
      ],
    },
    {
      title: '¿Es el Sol una bola sólida?',
      body: 'Si el Sol girara como una bola sólida, todas las manchas tendrían la misma velocidad sideral. G1 gira a 14,13 &plusmn; 0,06 grados al día y G3 a 13,48 &plusmn; 0,06, que difieren en 0,66.',
      prompt: '¿Qué dicen estos dos grupos?',
      options: [
        'La diferencia va en el sentido que da la ley, el grupo más cercano al ecuador más rápido, pero los grupos se dispersan unos 0,3 grados al día entre sí, así que dos grupos sugieren y no pueden decidirlo solos',
        'Lo deciden: 0,66 es más de diez veces la incertidumbre de 0,06 de cada uno',
        'Son iguales dentro del error, así que el Sol es una bola sólida',
        'Muestran que la rotación del Sol cambia de un día a otro',
      ],
      misconceptions: [
        {
          say: 'Una diferencia de 0,66 queda muy fuera del 0,06 del ajuste, así que por esa medida no son iguales. Pero la incertidumbre del ajuste no es la única, y ese es el punto de la respuesta.',
        },
        {
          say: 'El 0,06 es solo lo bien que las marcas de un grupo caen sobre una recta. Los grupos también difieren entre sí, unos 0,3 grados al día, por motivos que una colocación no ve (crecen, se dividen). Frente a ± 0,43, la diferencia de los dos grupos es de cerca de 1,5, no de 10.',
        },
        {
          say: 'Cada velocidad es un ajuste a nueve días de un grupo, así que de ella no se puede leer un cambio de un día a otro.',
        },
      ],
      hints: [
        '¿Cuál es la incertidumbre de la diferencia una vez que se cuenta la dispersión entre grupos?',
      ],
      because:
        'El sentido es el correcto y el tamaño no lo deciden dos grupos: 0,66 frente a unos 0,43 una vez contada la dispersión entre grupos. Que la superficie del Sol gira más deprisa en el ecuador se estableció siguiendo muchísimos grupos y rasgos durante un siglo; dos grupos son dos puntos.',
    },
    {
      title: 'Una marca cerca del borde',
      body: 'G1 sigue en el disco el día 7, cerca del borde. Pon el día en <strong>7</strong> y lee el <strong>mu</strong> de G1, el coseno del ángulo desde el centro del disco visto desde el Sol (1 en el centro, 0 en el borde), y la incertidumbre de su longitud.',
      fields: [
        { label: 'El mu de G1 el día 7' },
        { label: 'La incertidumbre de su longitud' },
      ],
    },
    {
      title: 'Ajustar el único coeficiente que los grupos pueden fijar',
      body: 'Dos grupos, a dos latitudes, dan dos números. La ley tiene tres coeficientes. Así que ajusta solo el <strong>término ecuatorial A</strong> y mantén los otros dos en los valores de la ley. Elige el modo <strong>Ajustar el término ecuatorial</strong> y lee A, su incertidumbre y el chi cuadrado.',
      fields: [
        { label: 'El término ecuatorial A ajustado (grados por día)' },
        { label: 'La incertidumbre de A (grados por día)' },
      ],
    },
    {
      title: '¿Por qué no ajustar los tres?',
      body: 'Elige el modo <strong>Ajustar los tres coeficientes</strong>. El instrumento lo rechaza.',
      prompt: '¿Por qué lo rechaza?',
      options: [
        'Dos latitudes fijan dos números: con tres coeficientes que hallar hay infinitas curvas que pasan por los dos grupos, y los datos no pueden elegir',
        'Las marcas tienen demasiado ruido: con más días podría ajustarlo',
        'La ley está mal, así que no se puede ajustar',
        'Ajustar tres números es demasiada aritmética para un navegador',
      ],
      misconceptions: [
        {
          say: 'El ruido ensancharía la incertidumbre, no prohibiría el ajuste. Más días de los mismos dos grupos no ayudarían: añadirían precisión a las mismas dos latitudes, y la curva sigue libre entre ellas y más allá.',
        },
        {
          say: 'El rechazo trata de cuántas latitudes hay, no de la ley: con tres o más latitudes distintas se permite el mismo ajuste, con sus incertidumbres.',
        },
      ],
      hints: ['¿Cuántos números te dan dos grupos?'],
      because:
        'Dos latitudes dan dos números, y una curva con tres coeficientes libres tiene toda una familia de ajustes por ellos. El instrumento dice cuántas latitudes necesita en vez de devolver coeficientes que parecen exactos y no significan nada.',
    },
    {
      title: '¿Están las marcas de G3 sobre una recta?',
      body: 'Elige <strong>Seguir un grupo</strong> y G3 otra vez. Lee el chi cuadrado por grado de libertad: cerca de 1 cuando las marcas caen sobre la recta hasta donde dicen sus incertidumbres, mayor cuando no.',
      fields: [{ label: 'Chi cuadrado por grado de libertad de G3' }],
    },
  ],
};

// El poder del Sol, pasos más profundos: paso a paso con el inglés (Prompt 194, parte 2).
export const THE_SUNS_POWER_DEEPER = {
  steps: [
    {
      title: 'El flujo cae a lo largo de los seis días',
      body: 'Con los seis días y la corrección activada, lee cuánto cayó el flujo en la Tierra del primer día al último, y cuánto cayó el flujo a 1 UA.',
      fields: [
        { label: 'La caída en la Tierra (W/m²)' },
        { label: 'La caída a 1 UA (W/m²)' },
      ],
    },
    {
      title: '¿Cuán segura es la media?',
      body: 'La media de los seis días corregidos tiene una incertidumbre dada por la dispersión de los días dividida entre la raíz de seis. Léela, y la incertidumbre que da a la luminosidad.',
      fields: [
        { label: 'La incertidumbre del flujo medio (W/m²)' },
        { label: 'La incertidumbre de la luminosidad (× 10²² W)' },
      ],
    },
    {
      title: 'Siete filas de cero',
      body: 'El archivo tiene siete filas más, del 10 al 16 de mayo, con una irradiancia de 0,0 y una incertidumbre de 0,0.',
      prompt: '¿Qué significan, y qué debe hacerse con ellas?',
      options: [
        'Son valores de relleno, no medidas: no había ningún valor. Déjalas fuera de la media',
        'El Sol no emitió luz esos días: inclúyelas',
        'Son medidas muy pequeñas: inclúyelas con su incertidumbre de 0,0',
        'Son errores de los seis días reales: descarta también esos',
      ],
      misconceptions: [
        {
          say: 'El Sol no se apaga. Una irradiancia de exactamente 0,0 con una incertidumbre de exactamente 0,0 es como un archivo marca un valor que no tiene, y una media que las incluyera quedaría baja en cientos de W/m².',
        },
        {
          say: 'Una incertidumbre de 0,0 daría a esas filas un peso infinito en una media ponderada. Un número que no puede ser una medida no debe serlo en ningún punto de un cálculo.',
        },
      ],
      hints: [
        '¿Podría un instrumento real medir el Sol exactamente cero y sin ninguna incertidumbre?',
      ],
      because:
        'Los valores de relleno marcan datos que faltan. El paquete lo dice y no lleva irradiancia del 10 al 17 de mayo; la media y la luminosidad de arriba usan solo los seis días medidos. Los ceros silenciosos en una serie son una de las formas más comunes de que una media salga mal sin parecerlo.',
    },
    {
      title: '¿Qué incertidumbre es mayor?',
      body: 'El archivo cita una incertidumbre de medida de 0,27 a 0,32 W/m² para cada día. La media de los seis días tiene una incertidumbre de 0,15 W/m² por su dispersión.',
      prompt: '¿Qué relación hay entre las dos, y qué dice sobre el 0,15?',
      options: [
        'La citada es cerca del doble de la basada en la dispersión: el 0,15 deja fuera de lo que el propio instrumento es incierto, que los días comparten, y por eso promediar no lo quita',
        'El 0,15 es correcto y la citada es demasiado cauta: promediar seis días la divide entre √6',
        'Deben ser iguales, pues describen la misma medida',
        'La citada es para un día, así que nada tiene que ver con la media de seis',
      ],
      misconceptions: [
        {
          say: 'Promediar reduce la dispersión que es independiente de un día a otro. Una parte de la incertidumbre de un instrumento, su calibración por ejemplo, es la misma cada día, así que seis días no la reducen.',
        },
      ],
      hints: [
        'Si una calibración se desvía un poco, ¿se desvía lo mismo cada día?',
      ],
      because:
        'El doble. La dispersión de seis días dice cuán bien concuerdan entre sí; la incertidumbre citada del instrumento cubre además lo que comparten. Una afirmación justa de la potencia del Sol con estos días lleva la mayor, cerca de un 0,02 por ciento, y ninguna incluye el cambio real del Sol a lo largo de los días.',
    },
    {
      title: 'Frente al Sol nominal',
      body: 'La luminosidad solar nominal de la Unión Astronómica Internacional es 3,828 &times; 10<sup>26</sup> W y su temperatura efectiva nominal 5772 K. Lee cuánto se aparta tu luminosidad de la nominal, en porcentaje, y tu temperatura, en kelvin.',
      fields: [
        { label: 'La luminosidad frente a la nominal' },
        { label: 'La temperatura frente a 5772 K' },
      ],
    },
  ],
};

export default {
  'why-venus-is-hot': WHY_VENUS_IS_HOT_DEEPER,
  'two-greenhouse-models': TWO_GREENHOUSE_MODELS_DEEPER,
  'the-turning-sun': THE_TURNING_SUN_DEEPER,
  'the-suns-power': THE_SUNS_POWER_DEEPER,
};
