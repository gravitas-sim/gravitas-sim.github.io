// El disco que gira - español, paso a paso con ../the-rotating-disk.js.
export default {
  title: 'El disco que gira',
  subtitle:
    'Las constantes de Oort y la curva de rotación de la Vía Láctea, a partir de datos, y luego un modelo de masa',
  objectives: [
    'Medir las constantes de Oort A y B a partir de los movimientos propios de estrellas cercanas, con incertidumbres',
    'Decir qué significa A − B y convertirlo en la rapidez circular del Sol',
    'Comparar la curva de rotación medida de la Vía Láctea con la que harían solas sus estrellas y su gas',
    'Añadir un halo, leer cuánto mejora el ajuste y decir qué muestra y qué no muestra ese ajuste',
    'Declarar los supuestos del modelo: las cotas del disco y la distancia y la rapidez del Sol',
  ],
  steps: [
    {
      title: 'La rotación de la Galaxia, en estrellas cercanas',
      body: 'El Sol y las estrellas cercanas giran alrededor del centro galáctico, pero no a una rapidez común: las estrellas más próximas al centro dan la vuelta más deprisa. Vistas desde el Sol, eso hace que las estrellas cercanas se desplacen por el cielo según un patrón que depende de la <strong>longitud galáctica</strong>. Dos números, las <strong>constantes de Oort A y B</strong>, lo describen.\n\nLa imagen muestra el movimiento de 1.570 estrellas de Gaia a lo largo del plano galáctico según la longitud, en km/s por kiloparsec, agrupado en 12 intervalos, sin el movimiento propio del Sol. La curva es el ajuste. Los valores están en la lista.',
    },
    {
      title: '¿Qué forma?',
      body: 'Dando una vuelta al plano de la Galaxia, de la longitud 0° a 360°, todavía no cambies el instrumento.',
      prompt:
        'Los movimientos propios agrupados a lo largo del plano harán&hellip;',
      options: [
        'una onda doble: dos máximos y dos mínimos en una vuelta',
        'una onda simple: un máximo y un mínimo',
        'una línea plana, porque todas las estrellas se mueven igual',
        'dispersión al azar sin ningún patrón',
      ],
      hints: [
        'La rotación diferencial hace que las estrellas en direcciones opuestas se comporten igual: l y l + 180° deberían verse iguales.',
      ],
      because:
        'Una onda doble. La rotación diferencial produce un patrón en que las longitudes separadas 180° coinciden (las estrellas en l y l + 180° se mueven en el mismo sentido a lo largo del plano), así que la curva se repite dos veces en una vuelta: A cos 2l más una constante B.',
    },
    {
      title: 'Mide A y B',
      body: 'El ajuste es la curva de la imagen: <strong>A</strong> fija la altura de la onda doble y <strong>B</strong> dónde está centrada. Con las estrellas ponderadas por la distancia (lo predeterminado), lee <strong>A de Oort</strong> y <strong>B de Oort</strong>.',
      fields: [{ label: 'A de Oort' }, { label: 'B de Oort' }],
    },
    {
      title: '¿Por qué ponderar las estrellas?',
      body: 'Cambia el ajuste a ponderar <strong>todas las estrellas por igual</strong> y lee otra vez A y B. Cambian por completo, y sus incertidumbres son cinco veces mayores.',
      prompt: '¿Por qué falla un ajuste sin ponderar?',
      options: [
        'La dispersión de rapidez de una estrella se vuelve una dispersión en estas unidades proporcional a su paralaje, así que las más cercanas son las más ruidosas y dominan',
        'Las estrellas más cercanas son las más lejanas',
        'Las estrellas cercanas de Gaia no tienen velocidades radiales',
        'Las estrellas a todas las distancias se mueven igual, así que ponderar no cambia nada',
      ],
      hints: [
        'La cantidad es una rapidez dividida entre una distancia: ¿qué hace una dispersión fija de rapidez a distancias pequeñas?',
      ],
      because:
        'Las unidades son km/s por kpc, rapidez ÷ distancia. Una rapidez aleatoria dada (unos pocos km/s) se vuelve un número mayor cuanto más cerca está la estrella, así que las cercanas se dispersan más en esta cantidad. Ponderar por 1 ÷ paralaje² da a cada estrella el peso que merece su dispersión.',
    },
    {
      title: 'La rapidez circular del Sol',
      body: 'A − B es la velocidad angular de una órbita circular en el Sol, en km/s por kpc. Multiplicada por la distancia del Sol al centro, 8,3 kpc (un supuesto: no se mide aquí), es una rapidez. Con el ajuste ponderado, lee la fila de la rapidez circular en el Sol.',
      fields: [{ label: 'Rapidez circular en el Sol' }],
    },
    {
      title: 'La curva entera',
      body: 'Las constantes de Oort dicen cómo gira la Galaxia aquí. ¿Cómo gira en todas partes? Los puntos son la <strong>rapidez circular</strong> de la Vía Láctea de 2 a 25 kpc del centro, de Bhattacharjee, Chaudhury y Kundu (2014), que combinaron muchos trazadores. Supone que el Sol está a 8,3 kpc y se mueve a 244 km/s (su artículo tabula otros dos conjuntos). Las curvas son un modelo: un bulbo y un disco (rayas verdes), un halo (puntos naranja) y su total (azul). Los deslizadores empiezan en una conjetura, que ajusta mal.',
    },
    {
      title: 'Estrellas y gas solos',
      body: 'Deja que el instrumento halle el mejor ajuste usando solo un bulbo y un disco, sin halo, con la masa del disco acotada por lo que pueden ser razonablemente las estrellas de la Galaxia (8 × 10<sup>10</sup> masas solares como máximo). Todavía no lo ejecutes.',
      prompt: 'Pasados unos 10 kpc, la mejor curva solo con estrellas&hellip;',
      options: [
        'caerá, por debajo de los puntos medidos',
        'se mantendrá plana, igual que los puntos medidos',
        'seguirá subiendo, por encima de los puntos medidos',
        'será imposible de trazar',
      ],
      hints: [
        'En un Sistema Solar, donde la masa está en el centro, las rapideces caen con la distancia. Un disco es parecido muy lejos de él.',
      ],
      because:
        'Cae. Más allá de donde está la mayor parte de las estrellas y el gas, la rapidez que sostiene su masa baja con la distancia, como en el Sistema Solar. Los puntos medidos siguen planos, que es lo que cuantifican los dos pasos siguientes.',
    },
    {
      title: 'Mejor ajuste, solo estrellas',
      body: 'Pon <strong>Parámetros del modelo</strong> en <strong>mejor ajuste, solo estrellas (sin halo)</strong>. Lee el χ² reducido (χ² por grado de libertad: cerca de 1 es un ajuste tan bueno como los errores) y la masa del disco.',
      fields: [
        { label: 'χ² reducido' },
        { label: 'Masa del disco, en 10¹⁰ masas solares' },
      ],
    },
    {
      title: 'Añade un halo',
      body: 'Ahora elige <strong>mejor ajuste, con halo</strong>. Lee el χ² reducido y la rapidez del halo lejos.',
      fields: [{ label: 'χ² reducido' }, { label: 'Rapidez del halo, lejos' }],
    },
    {
      title: 'Dónde importa el halo',
      body: 'Con el ajuste con halo, lee la fila de la rapidez a 8,3 kpc (el Sol): reparte la rapidez entre estrellas y gas, y halo. Compárala con la gráfica lejos, a 20 kpc.',
      prompt: '¿Qué enunciado concuerda con el modelo?',
      options: [
        'En el Sol las estrellas y el gas aportan más que el halo; lejos, aporta más el halo',
        'El halo aporta más en todas partes',
        'El halo no aporta nada en el Sol',
        'Las estrellas y el gas aportan más en todas partes',
      ],
      misconceptions: [
        {
          say: 'Mira la fila de 8,3 kpc: el número de estrellas y gas es el mayor allí. El halo toma el relevo pasado el disco.',
        },
      ],
      hints: [
        'Compara los dos números de la fila de 8,3 kpc, y luego las curvas verde y naranja a 20 kpc.',
      ],
      because:
        'A 8,3 kpc las estrellas y el gas dan unos 203 km/s frente a los 178 del halo, la parte mayor pero no toda. A 20 kpc el disco ha caído y el halo es el mayor. La materia oscura es una parte pequeña de la fuerza aquí y la mayor parte lejos.',
    },
    {
      title: 'Lo que supone el ajuste',
      body: 'El χ² reducido bajó de 50 a 4,8. Eso es una comparación de modelos, no una medición de un halo.',
      prompt:
        'Nombra dos supuestos de la comparación entre solo estrellas y halo y di qué depende de cada uno.',
    },
    {
      title: 'Lo que has deducido',
      body: 'Los movimientos propios de las estrellas cercanas hacen una onda doble en la longitud, cuya altura y centro son las constantes de Oort: A cerca de 13,5 y B cerca de −13,7&nbsp;km/s/kpc, así que la rapidez circular del Sol es cerca de 226&nbsp;km/s. La curva de rotación medida se mantiene plana hasta 25&nbsp;kpc; un bulbo y un disco, acotados en masa, la ajustan mal (χ² reducido de 50) y añadir un halo la ajusta diez veces mejor (4,8). Eso muestra que un halo basta dentro de un modelo simple con supuestos declarados: la cota del disco, la distancia y la rapidez del Sol.',
    },
  ],
};
