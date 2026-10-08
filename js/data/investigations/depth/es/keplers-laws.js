// Kepler's Laws, deeper: the Spanish words, step for step with ../keplers-laws.js.
export default {
  steps: [
    {
      title: '¿Qué tan seguro es un periodo?',
      body: 'Cada número que has anotado hasta ahora es una lectura, y una lectura no es la verdad. Aquí el periodo de una órbita se lee del movimiento del planeta en ese instante, y los planetas se atraen entre sí, así que leerlo en tres momentos distintos da tres respuestas ligeramente distintas.\n\nSelecciona un planeta y pulsa el botón tres veces, con unos segundos de diferencia, para que cada lectura sea de un momento distinto. La dispersión de las tres es la escala de tu incertidumbre. La incertidumbre de su <em>media</em> es la desviación estándar dividida por √3, y no puede ser menor que lo que el propio indicador resuelve: un número mostrado con cuatro decimales es bueno hasta media unidad del último.\n\nLa fracción de abajo es cuán incierto es <em>cualquiera</em> de tus periodos, como parte de sí mismo. El paso siguiente la usa.',
      importLabel: 'Tomar una lectura',
      fields: [
        { label: 'Lectura 1: P' },
        { label: 'Lectura 2: P' },
        { label: 'Lectura 3: P' },
        { label: 'Periodo medio' },
        { label: 'Incertidumbre de la media' },
        { label: 'Incertidumbre como fracción del periodo' },
      ],
    },
    {
      title: 'Ajusta la ley con pesos',
      body: 'No hay nada nuevo que medir: este paso trabaja con la tabla que rellenaste y la incertidumbre que acabas de hallar.\n\nEnderezando los datos como antes, P² frente a a³ debe ser una recta por el origen con pendiente k. Hay dos maneras de hallarla. La pendiente de mínimos cuadrados simples trata igual a todos los planetas. Pero un periodo incierto en la misma <em>fracción</em> hace que P² sea incierto en el doble de esa fracción <em>de sí mismo</em>, así que los planetas exteriores, con P² grande, se conocen peor en términos absolutos, y un ajuste ponderado cuenta cada fila por uno entre el cuadrado de su incertidumbre.\n\nLas dos deben coincidir dentro de la incertidumbre. Si no, hay una fila equivocada. Las dos últimas casillas usan la constante ponderada para predecir el periodo del planeta a 4 UA del paso anterior, propagando su incertidumbre: P = √(k·a³), así que σ<sub>P</sub> = a<sup>3/2</sup>·σ<sub>k</sub> / (2√k).',
      fields: [
        { label: 'Planetas usados de tu tabla' },
        { label: 'Constante k de mínimos cuadrados' },
        { label: 'Constante k ponderada' },
        { label: 'Su incertidumbre' },
        { label: 'Periodo previsto a 4 UA' },
        { label: 'Su incertidumbre' },
      ],
    },
    {
      title: 'Predice, con barra de error',
      body: 'Una predicción sin incertidumbre no se puede poner a prueba: cualquier medida sería «cercana». Da el periodo del planeta a 4 UA como se da un resultado: el valor, luego ±, luego su incertidumbre, tomados de las dos últimas casillas del paso anterior.\n\nCuenta como correcta cuando el rango que das se solapa con el que permite la ley y no es más ancho que el doble de la semianchura de ese rango, porque una incertidumbre capaz de solaparse con cualquier cosa no ha dicho nada a nadie.',
      prompt: 'Periodo a a = 4 UA, con su incertidumbre',
      placeholder: 'p. ej. 8,0 ± 0,1',
      hints: {
        concept:
          'El ajuste ponderado da una constante k y lo bien que se conoce. La ley la convierte en un periodo y una incertidumbre del periodo.',
        method:
          'Copia el periodo previsto y su incertidumbre del paso del ajuste ponderado y escríbelos como valor ± incertidumbre.',
      },
      worked:
        'La constante ponderada es cercana a 1, así que P = √(k·64) es cercano a 8 años, con una incertidumbre de unas centésimas.',
      because:
        'La ley, ajustada con pesos, da unos 8 años con una incertidumbre de unas centésimas de año, que se solapa con los 8 años que da la ley sin pesos. Que dos maneras de hallar la constante coincidan, con una barra de error honesta en cada una, es lo que convierte la ley en una medida y no en un eslogan.',
    },
    {
      title: 'Pesa la estrella de un planeta real',
      body: 'El lienzo sigue mostrando el Sistema Solar; este paso usa solo números. Son los que usan las investigaciones de tránsitos y de velocidad radial para HD 209458 b: un periodo orbital de <strong>3,5247 ± 0,0001 días</strong> y una órbita de <strong>0,0475 ± 0,0005 UA</strong>.\n\nLa forma de Newton de la tercera ley da la masa de la estrella en masas solares a partir de a en UA y P en años: M = a³ / P². Convierte antes el periodo. La incertidumbre de un producto de potencias suma en cuadratura las incertidumbres fraccionarias, cada una multiplicada por su potencia: σ<sub>M</sub>/M = √((3σ<sub>a</sub>/a)² + (2σ<sub>P</sub>/P)²).',
      prompt: 'Masa de HD 209458, con su incertidumbre',
      placeholder: 'p. ej. 1,15 ± 0,04',
      hints: {
        concept:
          'La tercera ley de Kepler en años, UA y masas solares: la masa es a al cubo dividido entre P al cuadrado.',
        method:
          'P = 3,5247 / 365,25 años. Calcula M, luego las dos incertidumbres fraccionarias, combínalas y multiplica por M.',
      },
      worked:
        'P = 0,009650 años, así que M = 0,0475³ / 0,009650² = 1,151. Las fracciones son 3 × 0,0105 = 0,032 y 2 × 0,00003, así que σ es de unos 0,036: M = 1,15 ± 0,04 masas solares.',
      because:
        'Unas 1,15 masas solares, con incertidumbre de unas 0,04. Casi toda viene del tamaño de la órbita, porque a se eleva al cubo: una incertidumbre del 1 % en a es del 3 % en la masa, mientras que el periodo, conocido con unas pocas partes en cien mil, apenas contribuye.',
    },
    {
      title: 'Dos métodos, un periodo',
      body: 'Ese periodo de 3,52 días se puede hallar de dos maneras independientes: por el bamboleo de la estrella hacia nosotros y alejándose (el análisis de velocidad radial incluido en Gravitas, en Herramientas) y por la caída de brillo cada vez que el planeta cruza la estrella (la investigación de tránsitos, y curvas de luz reales como las de TESS). Donde los dos discrepan, uno de ellos está mal.',
      prompt: '¿Qué te da que dos métodos independientes coincidan?',
      options: [
        'Una incertidumbre menor en el periodo, y nada más',
        'Protección contra una señal que viene del instrumento o de la estrella y no de un planeta',
        'La prueba de que la masa del planeta es exactamente el valor publicado',
        'Nada: cualquiera de los dos métodos por sí solo habría bastado',
      ],
      because:
        'Cada método tiene sus propias maneras de ser engañado: las manchas estelares y la deriva del instrumento imitan un bamboleo, una estrella eclipsante de fondo imita una caída. Un periodo que aparece en ambos, con el mismo valor dentro de su incertidumbre, difícilmente es un fallo común a los dos. Por sí solo no fija la masa.',
    },
  ],
};
