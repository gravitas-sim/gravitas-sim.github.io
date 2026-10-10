// De qué está hecho un espectro - español, paso a paso con ../what-a-spectrum-is-made-of.js.
export default {
  title: 'De qué está hecho un espectro',
  subtitle: 'Por qué un mismo gas hace líneas oscuras, brillantes o ninguna',
  objectives: [
    'Enunciar los tres tipos de espectro que puede hacer una fuente: un continuo, líneas brillantes y líneas oscuras',
    'Predecir y luego medir qué le hace una nube de gas a la luz que tiene detrás',
    'Explicar por qué una nube fría delante de una fuente más caliente hace líneas oscuras, y una más caliente las hace brillantes',
    'Decir qué cuenta un espectro con líneas oscuras sobre la temperatura del gas que las hizo',
    'Reconocer que el mismo gas puede hacer líneas de absorción o de emisión, según lo que tenga detrás',
  ],
  steps: [
    {
      title: 'Una fuente caliente y densa',
      body: 'Un sólido, un líquido o un gas espeso y caliente brilla en todas las longitudes de onda, y el espectro que hace es una curva suave: un <strong>continuo</strong>. Conociste su forma en Color y temperatura, la curva del cuerpo negro. Las capas interiores, calientes y densas, de una estrella hacen uno.\n\nEl demostrador de abajo es un modelo: un cuerpo negro caliente, una nube de hidrógeno tenue y un detector. Empieza con la fuente sola. Todo lo que dibuja y cada número de su lista está calculado, no medido; las imágenes de estrellas de arriba son marcadores.',
    },
    {
      title: 'Pon una nube en medio',
      body: 'Una nube de hidrógeno tenue, más fría que la fuente, se coloca entre la fuente caliente y el detector. Todavía no cambies el demostrador.',
      prompt: 'Comparado con la fuente sola, el detector ve ahora&hellip;',
      options: [
        'líneas oscuras recortadas en el mismo continuo',
        'líneas brillantes añadidas al continuo',
        'el mismo continuo liso, sin cambios',
        'nada de luz, porque la nube la bloquea',
      ],
      hints: [
        'Los átomos de hidrógeno quitan luz al haz, pero solo en las longitudes de onda que pueden absorber.',
      ],
      because:
        'Líneas oscuras. El gas quita luz al haz en sus propias longitudes de onda y deja pasar el resto. El paso siguiente lo mide, y luego pregunta qué pasa si la nube es más caliente.',
    },
    {
      title: 'Mide dos nubes',
      body: 'Pon el demostrador en <strong>la fuente, a través de la nube</strong>, con una fuente de 6.000&nbsp;K, una nube de 4.000&nbsp;K y gas 3 (el segundo preajuste lo hace), y acércate a H-alfa. Lee la fila «En el centro de H-alfa, brillo respecto del de la fuente»: 100&nbsp;% sería ninguna línea. Luego sube la nube a 8.000&nbsp;K, sin tocar lo demás, y léela otra vez.',
      fields: [
        { label: 'Centro de H-alfa, nube a 4.000 K' },
        { label: 'Centro de H-alfa, nube a 8.000 K' },
      ],
    },
    {
      title: '¿Qué dio vuelta la línea?',
      body: 'En los dos ajustes que mediste, el gas era el mismo hidrógeno en la misma cantidad. La línea pasó de oscura a brillante.',
      prompt: '¿Qué cambió?',
      options: [
        'La nube pasó de estar más fría que la fuente a estar más caliente',
        'La nube pasó de hidrógeno a otro gas',
        'La nube se hizo más espesa, así que bloqueó más luz',
        'La fuente se hizo más brillante',
      ],
      misconceptions: [
        {
          say: 'El gas no cambió: las líneas están en las mismas longitudes de onda en ambos. Mira qué control moviste.',
        },
        {
          say: 'La cantidad de gas siguió en 3. Una nube más espesa hace la línea más fuerte, apunte hacia donde apunte; no convierte lo oscuro en brillante.',
        },
      ],
      hints: ['Solo un control se movió entre las dos lecturas.'],
      because:
        'La temperatura de la nube, frente a la de la fuente. Una nube también brilla a su propia temperatura. Más fría que la fuente, añade menos de lo que quita y la línea es oscura; más caliente, añade más y la línea es brillante.',
    },
    {
      title: 'Una nube sin nada detrás',
      body: 'Mira ahora <strong>la nube sola</strong>, caliente (8.000&nbsp;K), sin fuente detrás. La única luz es la de la propia nube.',
      prompt: '¿Qué ve el detector?',
      options: [
        'líneas brillantes sobre un fondo oscuro',
        'líneas oscuras sobre un fondo brillante',
        'un continuo liso',
        'nada en absoluto',
      ],
      hints: [
        'Un gas tenue brilla solo en las longitudes de onda que sus átomos pueden emitir.',
      ],
      because:
        'Líneas brillantes sobre un fondo oscuro, un espectro de emisión. Un gas tenue y caliente brilla solo en sus propias longitudes de onda, así que no hay nada entre las líneas. Es el mismo gas que hizo líneas oscuras delante de una fuente más caliente.',
    },
    {
      title: 'La misma temperatura',
      body: 'Pon la fuente y la nube las dos a 6.000&nbsp;K, con la fuente vista a través de la nube y mucho gas (3). Mira el espectro completo y luego H-alfa.',
      prompt: '¿Qué ves?',
      options: [
        'un continuo liso sin ninguna línea',
        'líneas oscuras profundas',
        'líneas brillantes',
        'nada de luz',
      ],
      misconceptions: [
        {
          say: 'Pruébalo: el gas está ahí, pero una nube a la misma temperatura de la fuente devuelve exactamente la luz que quita.',
        },
      ],
      hints: [
        'Compara el cuerpo negro de la propia nube en H-alfa con el de la fuente, en la lista bajo la gráfica.',
      ],
      because:
        'Ninguna línea. Una nube a la temperatura de la fuente brilla, en cada longitud de onda, tanto como la luz que quita a la fuente, así que se compensan y el espectro es el continuo. Las líneas aparecen solo cuando la nube y la fuente difieren de temperatura.',
    },
    {
      title: 'Con tus propias palabras',
      body: 'Una nube fría no es oscura: también brilla, a su propia temperatura.',
      prompt:
        '¿Por qué una nube fría delante de una fuente más caliente hace igualmente líneas oscuras?',
    },
    {
      title: 'Las líneas oscuras de una estrella',
      body: 'El visor muestra el espectro de la <strong>estrella G</strong>, una estrella como el Sol, del Sloan Digital Sky Survey. Es un continuo liso con líneas oscuras recortadas.',
      prompt: '¿Qué dice eso del gas de la atmósfera de la estrella?',
      options: [
        'El gas que hizo las líneas está más frío que las capas calientes que tiene detrás',
        'El gas que hizo las líneas está más caliente que las capas que tiene detrás',
        'La estrella no tiene atmósfera',
        'La estrella se mueve hacia nosotros',
      ],
      misconceptions: [
        {
          say: 'El movimiento corre las líneas, como en Líneas y movimiento; no las hace. Las líneas están ahí aunque la estrella esté en reposo.',
        },
      ],
      hints: [
        'Las líneas oscuras son lo que deja un gas más frío en la luz de una fuente más caliente que tiene detrás.',
      ],
      because:
        'Más frío. Las líneas oscuras significan que el gas absorbente está más frío que las capas que tiene detrás: en una estrella la temperatura baja hacia afuera por la atmósfera, así que las capas altas, más frías, imprimen sus líneas en el interior caliente y brillante.',
    },
    {
      title: 'El destello de un eclipse',
      body: 'En un eclipse total de Sol la Luna cubre la superficie brillante. Durante un segundo o dos, una capa delgada de gas caliente sobre la superficie se asoma más allá del borde de la Luna, sin nada brillante detrás, y un espectrógrafo apuntado hacia ella registra un «espectro destello».',
      prompt: '¿Qué muestra el espectro destello?',
      options: [
        'líneas brillantes, en las mismas longitudes de onda que las líneas oscuras del Sol',
        'líneas oscuras, en las mismas longitudes de onda que las líneas oscuras del Sol',
        'un continuo liso',
        'líneas brillantes en longitudes de onda donde el Sol no tiene líneas oscuras',
      ],
      hints: ['El gas es el mismo; lo que cambió es lo que hay detrás.'],
      because:
        'Líneas brillantes, en las longitudes de onda de las líneas oscuras del Sol. Vista contra la superficie brillante la capa absorbe; vista sola contra el cielo oscuro brilla. Se registró así por primera vez en 1870 y mostró que los mismos átomos hacen las dos cosas.',
    },
    {
      title: 'Lo que descubriste',
      body: 'Una fuente caliente y densa hace un continuo. Un gas tenue tiene líneas en longitudes de onda que pertenecen a sus átomos. Visto solo y caliente, hace líneas brillantes. Delante de una fuente más caliente hace líneas oscuras, porque quita luz al haz y devuelve menos de lo que quitó. A la misma temperatura que la fuente no hace ninguna. Así que un espectro con líneas oscuras dice que el gas que las hizo está más frío que lo que tiene detrás, y uno con líneas brillantes dice que se ve un gas caliente solo o contra algo más frío.',
    },
  ],
};
