// Kepler's Laws, deeper: the Spanish words, step for step with ../keplers-laws.js.
export default {
  steps: [
    {
      title: '¿Qué tan seguro es un periodo?',
      decides:
        'cuántas lecturas tomar y cuándo la incertidumbre es lo bastante pequeña para parar',
      body: 'Cada número que has anotado hasta ahora es una lectura, y una lectura no es la verdad. Aquí el periodo de una órbita se lee del movimiento del planeta en ese instante, y los planetas se atraen entre sí, así que leerlo en momentos distintos da respuestas ligeramente distintas.\n\nSelecciona un planeta y pulsa el botón, con segundos de diferencia. Toma al menos tres lecturas y como mucho seis. Tú decides cuándo parar: la incertidumbre de la <em>media</em> es la desviación típica dividida entre la raíz del número de lecturas que tomaste, y no puede ser menor que lo que la propia lectura puede resolver, porque un número mostrado con cuatro decimales es bueno hasta media unidad del último. Observa cómo responde al añadir lecturas, y para cuando otra lectura ya no la cambie mucho.\n\nLa fracción de abajo es lo incierto que es <em>cualquiera</em> de tus periodos, como parte de sí mismo. El paso siguiente la usa.',
      importLabel: 'Tomar una lectura',
      fields: [
        { label: 'Lectura 1: P' },
        { label: 'Lectura 2: P' },
        { label: 'Lectura 3: P' },
        { label: 'Lectura 4: P (opcional)' },
        { label: 'Lectura 5: P (opcional)' },
        { label: 'Lectura 6: P (opcional)' },
        { label: 'Periodo medio' },
        { label: 'Incertidumbre de la media' },
        { label: 'Incertidumbre como fracción del periodo' },
      ],
    },
    {
      title: 'Ajusta la ley con pesos',
      body: 'No hay nada nuevo que medir: este paso trabaja con la tabla que rellenaste y la incertidumbre que acabas de hallar.\n\nEnderezando los datos como antes, P² frente a a³ debe ser una recta por el origen con pendiente k. Hay dos maneras de hallarla. La pendiente de mínimos cuadrados simples trata igual a todos los planetas. Pero un periodo incierto en la misma <em>fracción</em> hace que P² sea incierto en el doble de esa fracción <em>de sí mismo</em>, así que los planetas exteriores, con P² grande, se conocen peor en términos absolutos, y un ajuste ponderado cuenta cada fila por uno entre el cuadrado de su incertidumbre.\n\nLas dos deben coincidir dentro de la incertidumbre. Si no, hay una fila equivocada. El paso siguiente te pide convertir la constante ponderada y su incertidumbre en una predicción.',
      fields: [
        { label: 'Planetas usados de tu tabla' },
        { label: 'Constante k de mínimos cuadrados (yr²/AU³)' },
        { label: 'Constante k ponderada (yr²/AU³)' },
        { label: 'Su incertidumbre (yr²/AU³)' },
      ],
    },
    {
      title: 'Predice, con barra de error',
      body: 'Una predicción sin incertidumbre no se puede poner a prueba: cualquier medida sería «cercana». Da el periodo del planeta a 4 UA como se da un resultado: el valor, luego ±, luego su incertidumbre, calculados a partir de la constante ponderada y su incertidumbre del paso anterior: <em>P</em> = √(<em>k</em>·<em>a</em>³), así que σ<sub><em>P</em></sub> = <em>a</em><sup>3/2</sup>·σ<sub><em>k</em></sub> / (2√<em>k</em>).\n\nCuenta como correcta cuando el rango que das se solapa con el que permite la ley y no es más ancho que el doble de la semianchura de ese rango, porque una incertidumbre capaz de solaparse con cualquier cosa no ha dicho nada a nadie.',
      prompt: 'Periodo a a = 4 UA, con su incertidumbre',
      placeholder: 'un valor y, luego, ± su incertidumbre',
      hints: {
        concept:
          'El ajuste ponderado da una constante k y lo bien que se conoce. La ley la convierte en un periodo y una incertidumbre del periodo.',
        method:
          'Toma k y su incertidumbre del paso del ajuste ponderado. Eleva 4 UA al cubo, multiplica por k y extrae la raíz cuadrada; luego propaga la incertidumbre con la fórmula de arriba. Escribe tu respuesta como valor ± incertidumbre.',
      },
      because:
        'La ley, ajustada con pesos, da unos 8 años con una incertidumbre de unas milésimas de año, que se solapa con los 8 años que da la ley sin pesos.',
    },
    {
      title: 'Pesa la estrella de un planeta real',
      body: 'El lienzo sigue mostrando el Sistema Solar; este paso usa solo números. Son los que usan las investigaciones de tránsitos y de velocidad radial para HD 209458 b: un periodo orbital de <strong>3,5247 ± 0,0001 días</strong> y una órbita de <strong>0,0475 ± 0,0005 UA</strong>.\n\nLa forma de Newton de la tercera ley da la masa de la estrella en masas solares a partir de a en UA y P en años: M = a³ / P². Convierte antes el periodo. La incertidumbre de un producto de potencias suma en cuadratura las incertidumbres fraccionarias, cada una multiplicada por su potencia: σ<sub>M</sub>/M = √((3σ<sub>a</sub>/a)² + (2σ<sub>P</sub>/P)²).',
      prompt: 'Masa de HD 209458, con su incertidumbre',
      placeholder: 'un valor y, luego, ± su incertidumbre',
      hints: {
        concept:
          'La tercera ley de Kepler en años, UA y masas solares: la masa es a al cubo dividido entre P al cuadrado.',
        method:
          'P = 3,5247 / 365,25 años. Calcula M, luego las dos incertidumbres fraccionarias, combínalas y multiplica por M.',
      },
      because:
        'Unas 1,15 masas solares, con incertidumbre de unas 0,04. Casi toda viene del tamaño de la órbita, porque a se eleva al cubo: una incertidumbre del 1 % en a es del 3 % en la masa, mientras que el periodo, conocido con unas pocas partes en cien mil, apenas contribuye.',
    },
    {
      title: '¿Cuánto falla?',
      decides:
        'si la masa del planeta se puede dejar fuera de la ley, a partir de cuánto cambia el periodo',
      body: 'La forma de Newton de la tercera ley lleva la masa total, <em>M</em> + <em>m</em>, donde la de Kepler lleva solo la de la estrella. Para un planeta la diferencia es minúscula, así que la de Kepler funciona, pero no es cero.\n\nPruébalo con TRAPPIST-1g: un planeta de <strong>1,321</strong> masas terrestres alrededor de una estrella de <strong>0,0898</strong> masas solares. Una masa terrestre son <strong>3,0035 × 10<sup>-6</sup></strong> masas solares. El periodo según la forma de Kepler, que deja fuera al planeta, sale un poco largo. ¿Cuánto, como fracción del periodo, en partes por millón?',
      prompt: '¿Cuánto más largo sale el periodo con la forma de Kepler?',
      misconceptions: [
        {
          say: 'Esa es la razón entre la masa del planeta y la de la estrella. El periodo depende de la raíz de la masa total, así que el fallo es la mitad de esa razón.',
        },
      ],
      hints: {
        concept:
          'El periodo va como uno entre la raíz de la masa total, así que dejar fuera al planeta cambia el periodo en la mitad de la razón de masas planeta-estrella, cuando esa razón es pequeña.',
        method:
          'Pasa la masa del planeta a masas solares, divídela entre la de la estrella y toma la mitad. Después exprésalo en partes por millón.',
      },
      because:
        'Unas 22 partes por millón: el planeta es unas pocas diezmillonésimas de una estrella tan pequeña, y el periodo va como la raíz de la masa total, así que la mitad de esa razón. Es mucho menor de lo que la lectura puede mostrar, y por eso la forma de Kepler funciona para planetas, y por eso la misma corrección es del 41 % para dos estrellas iguales.',
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
