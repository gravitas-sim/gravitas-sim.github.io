// Una estrella variable a partir de imágenes - español, paso a paso con ../a-variable-star-from-frames.js.
export default {
  title: 'Una estrella variable a partir de imágenes',
  subtitle:
    'Fotometría diferencial de cuarenta imágenes calibradas: por qué una estrella de comparación quita la nube, y cómo saber que una variación es real',
  objectives: [
    'Decir por qué el brillo de una estrella medida sola vagabundea de una imagen a otra, y por qué una estrella de comparación lo quita',
    'Usar una estrella de control para decir cuán precisa es una medida diferencial',
    'Ajustar un periodo y una amplitud a una curva de luz diferencial, con un error, y decir si la variación es real',
    'Mostrar qué cambia cada paso de calibración en una curva de luz, frente a un manifiesto de la verdad',
  ],
  steps: [
    {
      title: 'Cuarenta imágenes de una noche',
      body: `Un telescopio toma una imagen cada 11 minutos durante casi toda una tarde. En cada una, las mismas tres estrellas están en los mismos píxeles: una estrella variable y dos constantes. Cada imagen se calibra (sesgo, oscura y plano, como en la primera investigación) y se mide la luz de cada estrella en una abertura, con el error de la ecuación del CCD.
             \n\nEl instrumento dibuja el resultado. La gráfica empieza con la <strong>estrella variable sola</strong>, como magnitud instrumental, −2,5 veces el logaritmo de los electrones; más brillante está arriba. Otras gráficas muestran la <strong>estrella de comparación</strong> sola, la variable <strong>frente a</strong> la de comparación, y una <strong>estrella de control</strong> frente a la de comparación.
             \n\nLas imágenes son <strong>sintéticas</strong>, de un modelo declarado de un CCD con una estrella variable que varía como un seno, y una nube delgada que cambia de una imagen a otra y atenúa todas las estrellas a la vez.`,
    },
    {
      title: 'La estrella sola',
      body: `Con «La estrella variable sola» y toda la calibración aplicada, lee la <strong>dispersión de la estrella variable sola</strong>, en magnitudes.`,
      fields: [{ label: 'Dispersión de la estrella sola' }],
    },
    {
      title: 'De dónde viene el vagabundeo',
      body: `Cambia la gráfica entre «La estrella variable sola» y «La estrella de comparación sola». Las dos vagabundean, y a la par.`,
      prompt: '¿Qué hace que las dos estrellas vagabundeen juntas?',
      options: [
        'Las dos estrellas son variables',
        'La transparencia del cielo cambia de una imagen a otra y atenúa todas las estrellas a la vez',
        'El ruido de lectura del CCD es mucho mayor que la luz de la estrella',
        'La estrella de comparación es demasiado débil para medirla',
      ],
      misconceptions: [
        {
          say: 'La estrella de comparación es constante en el modelo. Si vagabundeara por sí sola, la estrella de control, medida igual, no se mantendría plana.',
        },
        {
          say: 'El ruido de lectura de 8 electrones es una parte minúscula de una estrella de decenas de miles. Hace una dispersión de cerca del uno por ciento, no del siete.',
        },
      ],
      hints: [
        '¿Qué hace una nube delgada a una estrella brillante, y a una débil, en la misma imagen?',
      ],
      because:
        'Una nube delgada, o la masa de aire, multiplica la luz de todas las estrellas por el mismo factor en una imagen. El factor cambia de una imagen a otra, así que todas las estrellas se mueven juntas. Una estrella medida sola no distingue la nube de su propia variación; una medida frente a otra no la sufre, porque el factor se cancela en el cociente.',
    },
    {
      title: 'Frente a una estrella de comparación',
      body: `Elige «La estrella de control frente a la de comparación». La estrella de control no varía, así que su dispersión es la <strong>precisión</strong> de una medida diferencial. Léela, y divide entre ella la dispersión de la estrella sola (0,070).`,
      fields: [
        { label: 'Dispersión de la estrella de control' },
        { label: 'Mejora' },
      ],
    },
    {
      title: 'La variable frente a la de comparación',
      body: `La estrella variable cambia 0,04 magnitudes, unas cuatro veces la dispersión de la estrella de control. Todavía no cambies el instrumento.`,
      prompt:
        'La estrella variable medida frente a la de comparación mostrará&hellip;',
      options: [
        'la misma dispersión irregular que la estrella sola, porque es la misma estrella',
        'una subida y bajada suave que se repite, con una dispersión de unos 0,009 alrededor',
        'una línea plana, porque la estrella de comparación cancela también a la variable',
        'ningún patrón: 0,04 magnitudes es demasiado poco para verlo',
      ],
      hints: [
        'La nube se cancela porque multiplica a las dos estrellas. ¿Multiplica el cambio propio de la variable a la estrella de comparación?',
      ],
      because:
        'Una subida y bajada suave. La nube multiplica a las dos estrellas y se divide; el cambio propio de la variable le pertenece solo a ella, y se queda. Cuatro veces la dispersión de un punto se ve con facilidad entre cuarenta puntos.',
    },
    {
      title: 'Periodo y amplitud',
      body: `Elige «La variable frente a la de comparación». El instrumento ajusta una onda seno, recorriendo periodos de prueba hasta el menor chi cuadrado. Lee el <strong>periodo</strong> y la <strong>amplitud</strong> del mejor seno.`,
      fields: [{ label: 'Periodo' }, { label: 'Amplitud' }],
    },
    {
      title: '¿Es real la variación?',
      body: `La amplitud es de 0,042 ± 0,002 magnitudes, y la dispersión de la estrella de control es de 0,009.`,
      prompt:
        '¿Cómo sabes que la variación de la estrella variable es real y no ruido?',
      options: [
        'La amplitud es de una décima de magnitud',
        'La amplitud es veinte veces su error y varias veces la dispersión de una estrella que no varía, medida igual',
        'El chi cuadrado del ajuste es cero',
        'Un ajuste siempre encuentra una amplitud, así que es real por definición',
      ],
      misconceptions: [
        {
          say: 'La amplitud es de 0,04 magnitudes. Lo que la hace real es cómo se compara con el ruido, no su tamaño.',
        },
        {
          say: 'Un ajuste de un seno a puro ruido también devuelve una amplitud pequeña. La cuestión es si la amplitud supera lo que da el ruido solo, y la estrella de control mide eso.',
        },
      ],
      hints: [
        'Compara la amplitud con su error, y con lo que hace una estrella constante medida igual.',
      ],
      because:
        'El ruido solo da una amplitud pequeña con un tamaño fijado por la dispersión de un punto y el número de puntos. La estrella de control, medida exactamente como la variable, muestra la dispersión que da el ruido; la amplitud es varias veces mayor que ella y más de veinte veces su propio error, y se repite con un periodo. Eso es lo que un observador llama una detección.',
    },
    {
      title: 'Lo que calculaste',
      body: `Una estrella medida sola vagabundea 0,070 magnitudes porque una nube delgada atenúa todas las estrellas de una imagen a la vez; medida frente a una estrella de comparación, la nube se divide y una estrella de control constante se dispersa solo 0,009 magnitudes, ocho veces menos. La variable frente a la de comparación muestra una variación suave con un periodo de 0,122 días y una amplitud de 0,042 ± 0,002 magnitudes, más de veinte veces su error y varias veces la dispersión de la estrella de control: una detección.
             \n\nLas imágenes son <strong>sintéticas</strong>. La variable es un seno perfecto, las estrellas de comparación y de control son perfectamente constantes, la nube no tiene color, las estrellas nunca se mueven sobre los píxeles y no hay rayos cósmicos en esta serie. Una noche real añade un término de color para el aire, una deriva del apuntado del telescopio y una estrella de comparación que resulta variar. El método es real; el número de cosas que pueden salir mal es mayor.`,
    },
  ],
};
