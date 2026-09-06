// =============================================================================
// hohmann-transfer - es
// -----------------------------------------------------------------------------
// A shadow of ../hohmann-transfer.js carrying only its words. Laid over the
// English lesson by mergeTranslation() in ../i18n.js, so anything absent here
// keeps its English and nothing here can reach the lesson's machinery: no
// scenario name, no seed, no numeric answer, no unit token.
//
// `expect` is deliberately absent. Its `unit` and `accept` entries are tokens
// the answer parser matches against, not prose, and a translated copy of them
// would stop the parser recognising what a student typed.
//
// Arrays line up by index with the English. `null` means "not translated";
// that entry keeps its English.
// =============================================================================

export default {
  title: 'Llegar hasta allí desde aquí',
  subtitle: 'Dos impulsos, una larga travesía y la aritmética que decide ambos',
  duration: '20-25 min',
  level: 'Astronomía introductoria',
  summary:
    'Una nave a 1 UA, una estación a 2,5 UA y nada de combustible que desperdiciar. Calcula con lápiz los dos impulsos y la travesía entre ellos, y después vuela la maniobra a ver si el motor de física te da la razón. Te la da, con un error de una parte entre mil, y eso es lo que hace fiables las dos sorpresas que contiene: aceleras para alejarte, y al llegar tienes que acelerar otra vez o te caes de vuelta.',
  objectives: [
    'Predecir en qué sentido mueve una órbita un impulso, y dónde aparece el cambio',
    'Distinguir un impulso radial de uno transversal por lo que conserva cada uno',
    'Calcular los dos impulsos de una transferencia de Hohmann con la ecuación vis-viva',
    'Calcular el tiempo de travesía como la mitad del periodo de la elipse de transferencia',
    'Explicar por qué el segundo impulso es necesario y qué pasa sin él',
    'Enunciar en qué condiciones la solución cerrada es la respuesta correcta',
  ],
  steps: [
    {
      title: 'Una nave, una estación y nada de combustible que desperdiciar',
      body: `Una nave está en órbita circular a una unidad astronómica de una
             estrella de tipo solar, dando una vuelta al año a algo menos de
             treinta kilómetros por segundo. Una estación está en otra órbita
             circular dos veces y media más lejos, en el mismo plano, dando una
             vuelta cada cuatro años.
             \n\nTienes que ir de una a otra, y el combustible que tienes es el
             que llevas. La pregunta no es si <em>puedes</em>, sino cuál es la
             forma más barata y cuánto tarda.
             \n\nNo hay nada más en este sistema. Ni otros planetas, ni cinturón,
             ni lunas. Es deliberado, y al final de la lección sabrás
             exactamente cuál de tus respuestas dependía de ello.`,
      tip: 'Selecciona la nave y mira el inspector: el botón ▲ junto al alfiler abre el planificador de maniobras.',
    },
    {
      title: '¿Apuntar y empujar?',
      body: `La estación está justo hacia fuera desde la estrella, más lejos que
             tú. Lo evidente es apuntar en dirección contraria a la estrella y
             empujar.
             \n\nComprométete con una respuesta antes de probarlo.`,
      prompt: 'Empujar directamente hacia fuera, alejándose de la estrella…',
      options: [
        'movería la nave hacia fuera de forma sostenida hasta alcanzar la estación',
        'elevaría el lado lejano de la órbita y dejaría el cercano donde está',
        'deformaría la órbita sin agrandarla apenas',
        'no haría nada, porque un empuje en dirección contraria a la estrella no puede cambiar una órbita',
      ],
      because:
        'Un empuje radial no ejerce par respecto de la estrella, así que no puede cambiar el momento angular, y es el momento angular el que fija hasta dónde llega la órbita por el lado opuesto. Lo que sí cambia es la forma: la órbita se vuelve excéntrica, acercándose más por un lado y alejándose más por el otro, a cambio de muy poco tamaño. Es la dirección equivocada.',
    },
    {
      title: 'Pruébalo',
      body: `Abre el planificador de maniobras sobre la <strong>nave</strong> y
             pon una Δv radial de <strong>0,5</strong> en la casilla. No la
             apliques todavía: lee la previsión.
             \n\nEl periastro baja, el apoastro sube y el momento angular
             específico no se mueve en absoluto. Esa última fila es toda la
             respuesta a la pantalla anterior.`,
      checklist: [
        'Introduce una Δv radial de 0,5 y lee la tabla de previsión',
        'Comprueba que el momento angular específico no cambia',
        'Vuelve a ponerla a 0 sin aplicar',
      ],
      tip: 'El planificador hace la previsión sin cambiar nada. No le pasa nada al mundo hasta que pulsas Aplicar.',
    },
    {
      title: 'La palanca va de lado',
      body: `Un impulso <strong>transversal</strong> —en el sentido del
             movimiento, perpendicular a la línea que va a la estrella— es el
             que cambia el tamaño de la órbita, porque es el que cambia el
             momento angular.
             \n\nY cambia la órbita <em>por el lado opuesto</em>. El punto donde
             haces el impulso sigue estando en la órbita nueva: sigues ahí, a esa
             distancia, así que esa distancia sigue siendo un punto por el que
             la órbita pasa. Todo lo que ganas aparece media órbita después.
             \n\nEsa es la primera cosa de las maniobras orbitales que hay que
             aprender en vez de adivinar: <strong>empujas aquí y la órbita
             cambia allí</strong>.`,
    },
    {
      title: 'Mide con qué empiezas',
      body: `Selecciona la <strong>nave</strong>, luego la <strong>estación
             objetivo</strong>, y lee sus velocidades orbitales en el
             inspector.`,
      fields: [
        { label: 'Velocidad de la nave' },
        { label: 'Velocidad de la estación' },
      ],
      tip: 'El inspector da la velocidad en km/s cuando el selector de unidades está en unidades físicas.',
    },
    {
      title: 'La estación va más despacio',
      body: `La nave, más cerca, va a unos 29,8 km/s. La estación, dos veces y
             media más lejos, va a unos 18,8 km/s.`,
      prompt:
        'El cuerpo más alejado de la estrella se mueve más despacio porque…',
      options: [
        'tiene más camino que recorrer, así que tarda más',
        'allí la gravedad es más débil y basta con una velocidad menor para mantenerse en órbita',
        'empezó más despacio y nada lo ha cambiado',
        'está perdiendo energía a favor de la estrella',
      ],
      because:
        'La velocidad orbital circular es sqrt(GM/r): disminuye al crecer el radio. Una gravedad más débil necesita menos aceleración centrípeta para equilibrarse, y menos aceleración a mayor radio significa menos velocidad. La órbita exterior es más lenta *y* más larga, y por eso su periodo crece más deprisa que su radio.',
    },
    {
      title: 'El camino más barato es una elipse que toca las dos',
      body: `Esta es la idea, y se debe a Walter Hohmann, que la publicó en 1925,
             una década antes de que nadie tuviera un cohete capaz de despegar.
             \n\nHaz un impulso aquí para ponerte en una <strong>elipse</strong>
             cuyo punto más cercano sea tu órbita actual y cuyo punto más lejano
             roce justo la órbita de la estación. Déjate llevar hasta el extremo
             opuesto. Haz otro impulso para circularizar.
             \n\nDos impulsos, una travesía. Para órbitas que no estén demasiado
             separadas es la transferencia más barata que existe, y la razón es
             que cualquier otra ruta gasta combustible en cambiar algo que no
             hacía falta cambiar.`,
    },
    {
      title: '¿Cómo de grande es esa elipse?',
      body: `El semieje mayor de una elipse es la mitad de su dimensión más
             larga. Esta elipse va desde 1 UA a un lado de la estrella hasta
             2,5 UA al otro.`,
      prompt: 'El semieje mayor de la elipse de transferencia, en UA',
      hints: [
        'La dimensión más larga va de una órbita, pasando por la estrella, hasta la otra.',
        'Esa distancia es 1 UA + 2,5 UA. El semieje mayor es la mitad.',
      ],
      worked:
        'El eje mayor abarca r₁ + r₂ = 1 + 2,5 = 3,5 UA, así que a = 3,5 / 2 = 1,75 UA.',
    },
    {
      title: '¿A qué velocidad tienes que ir?',
      body: `La ecuación vis-viva da la velocidad en cualquier punto de
             cualquier órbita:
             \n\n<strong>v² = GM (2/r − 1/a)</strong>
             \n\nEn esta elipse de transferencia, en el momento de la partida,
             r vale 1 UA y a vale 1,75 UA. Una órbita circular a 1 UA aquí va a
             <strong>29,787 km/s</strong>, que es la misma ecuación con a = r.`,
      prompt:
        'Tu velocidad al principio de la elipse de transferencia, en km/s',
      hints: [
        'Puedes trabajar en unidades de la velocidad circular: v/v_circ = sqrt(2 − r/a).',
        'Con r = 1 y a = 1,75, esa razón es sqrt(2 − 0,5714) = sqrt(1,4286) = 1,1952.',
      ],
      worked:
        'v = v_circ × sqrt(2 − r/a) = 29,787 × sqrt(2 − 1/1,75) = 29,787 × 1,1952 = 35,60 km/s.',
    },
    {
      title: 'Entonces, ¿de cuánto es el primer impulso?',
      body: `Vas a 29,787 km/s y necesitas ir a 35,60 km/s, en la misma
             dirección.`,
      prompt: 'El primer impulso, en km/s',
      hints: [
        'Las dos velocidades van en la misma dirección, así que esto es una resta y no algo vectorial.',
      ],
      worked: 'Δv₁ = 35,60 − 29,787 = 5,815 km/s.',
    },
    {
      title: 'Hazlo',
      body: `En el planificador, vuelve a poner la Δv radial a
             <strong>0</strong> y mete tu respuesta en la casilla
             <strong>transversal</strong>. En las unidades de este escenario son
             <strong>0,873</strong>: el planificador trabaja en unidades de
             velocidad de simulación, y una de ellas son 6,661 km/s.
             \n\nLee primero la previsión. El apoastro debería marcar
             <strong>250</strong> unidades de simulación, que son 2,5 UA: la
             órbita de la estación. Entonces pulsa <strong>Aplicar</strong>.`,
      checklist: [
        'Vuelve a poner la radial a 0 y la transversal a 0,873',
        'Comprueba que el apoastro previsto es 2,5 UA antes de aplicar',
        'Pulsa Aplicar y mira cómo la estela se aleja de la órbita interior',
      ],
      tip: 'Si te equivocas al teclear, Deshacer devuelve el mundo exactamente a como estaba: el mundo entero, no solo la velocidad.',
    },
    {
      title: '¿Dónde cambió la órbita?',
      body: `Compara el periastro y el apoastro del planificador antes y después
             del impulso.`,
      prompt: 'El impulso cambió…',
      options: [
        'los dos extremos de la órbita en la misma medida',
        'solo el lado cercano, dejando el lejano donde estaba',
        'solo el lado lejano, dejando el cercano donde estaba',
        'ningún extremo: solo la forma',
      ],
      because:
        'Hiciste el impulso a 1 UA y sigues a 1 UA, así que la órbita nueva pasa por 1 UA: ese punto es ahora su periastro, sin cambios. Toda la energía que añadiste fue a parar a lo lejos que llega la órbita por el lado opuesto, que subió de 1 UA a 2,5 UA. Empujas aquí, cambias allí.',
    },
    {
      title: '¿Cuánto dura la travesía?',
      body: `Estás en media elipse: de su punto más cercano al más lejano. La
             tercera ley de Kepler da el periodo de una órbita completa a partir
             de su semieje mayor, y a 1 UA de esta estrella una órbita completa
             dura exactamente un año.
             \n\n<strong>T = 1 año × a^(3/2)</strong>, con a en UA.`,
      prompt:
        'La travesía desde el primer impulso hasta la órbita de la estación, en días',
      hints: [
        'Calcula primero el periodo de la elipse de transferencia completa y luego toma la mitad.',
        'a = 1,75, así que a^(3/2) = 2,315. La elipse completa dura 2,315 años.',
      ],
      worked:
        'T = 1,75^1,5 = 2,315 años para la elipse completa. La mitad son 1,157 años, o 423 días.',
    },
    {
      title: 'La travesía',
      body: `Déjalo correr. La nave se aleja de la estrella, frenando todo el
             camino, y unos catorce meses después llega a lo alto del arco, a
             2,5 UA.
             \n\nUsa el control de velocidad si prefieres no esperar en tiempo
             real. Mira cómo cae la lectura de velocidad en el inspector según
             sube: llega a la órbita de la estación a unos
             <strong>14,2 km/s</strong>.`,
      checklist: [
        'Mira cómo la nave sube hasta lo alto de su arco',
        'Mira cómo cae la velocidad según sube',
        'Anota la velocidad al llegar a 2,5 UA',
      ],
    },
    {
      title: '¿Y si no haces nada?',
      body: `La nave está al radio orbital de la estación, en lo alto de su
             arco, a 14,2 km/s. La estación, a ese radio, va a 18,8 km/s.
             \n\nSupón que no haces ningún impulso más.`,
      prompt: 'Sin segundo impulso, la nave…',
      options: [
        'se quedaría a 2,5 UA, ya que ha llegado',
        'caería de vuelta hacia dentro y volvería a 1 UA',
        'se alejaría poco a poco, ya que se mueve alejándose de la estrella',
        'seguiría a la estación a 14,2 km/s',
      ],
      because:
        'La elipse de transferencia es una órbita cerrada y la nave está en su apoastro, no en reposo. Su periastro sigue a 1 UA, así que cae de vuelta y regresa exactamente a donde empezó, una vez cada 2,3 años, para siempre. Llegar a un sitio y quedarse en él son logros distintos.',
    },
    {
      title: 'El impulso que todo el mundo olvida',
      body: `Para quedarte a 2,5 UA tienes que estar en la órbita circular de
             2,5 UA, lo que significa ir a la velocidad circular de allí:
             <strong>18,84 km/s</strong>. Llegas a <strong>14,24 km/s</strong>.`,
      prompt: 'El segundo impulso, en km/s',
      hints: [
        'Otra vez las dos van en la misma dirección, así que es una resta.',
        'Vas demasiado despacio para la órbita que quieres, así que esto es otra aceleración.',
      ],
      worked: 'Δv₂ = 18,840 − 14,242 = 4,598 km/s.',
    },
    {
      title: 'Circularizar',
      body: `Cuando la nave esté en lo alto de su arco —el apoastro, donde el
             planificador muestra que la distancia ya no crece— aplica una Δv
             transversal de <strong>0,690</strong> unidades de simulación.
             \n\nMira cómo la excentricidad en la previsión del planificador cae
             casi a cero. Ahí termina la maniobra: la órbita es ya la órbita de
             la estación.`,
      checklist: [
        'Espera a que la nave llegue a 2,5 UA',
        'Previsualiza una Δv transversal de 0,690 y comprueba que la excentricidad va a ~0',
        'Aplícala',
      ],
      tip: 'El momento importa: el mismo impulso hecho en cualquier otro punto de la elipse da otra órbita, porque un impulso cambia el lado opuesto y el lado opuesto depende de dónde estés.',
    },
    {
      title: '¿Cuánto costó?',
      body: `Suma los dos impulsos.`,
      prompt: 'La Δv total de la transferencia, en km/s',
      worked: 'Δv = 5,815 + 4,598 = 10,41 km/s.',
    },
    {
      title: 'Los dos impulsos fueron aceleraciones',
      body: `Los dos impulsos aceleraron la nave, y la nave acabó moviéndose más
             despacio que al principio: 18,8 km/s frente a 29,8.`,
      prompt: 'Eso es posible porque…',
      options: [
        'el segundo impulso era en realidad un frenado, pese a la aritmética',
        'la velocidad y la energía orbital son cosas distintas, y los impulsos añadieron energía mientras que la subida gastó velocidad',
        'la estrella la frenó entre los dos impulsos',
        'la aritmética es una aproximación y la respuesta real es otra',
      ],
      because:
        'Los dos impulsos añadieron energía orbital, y una órbita mayor tiene más energía. Pero casi toda esa energía es potencial: subir de 1 UA a 2,5 UA cuesta muchísima velocidad y compra altura. La nave acaba más arriba, con más energía total, y más despacio. Alejarse significa ir más despacio una vez allí, y acelerar dos veces para conseguirlo.',
    },
    {
      title: 'De qué dependía esta respuesta',
      body: `Todos los números que calculaste eran correctos, con un error de una
             parte entre mil, por cómo está construido este sistema: dos órbitas
             <strong>circulares</strong> en el <strong>mismo plano</strong>
             alrededor de una <strong>única</strong> masa dominante, y nada más
             en el sistema.
             \n\nQuita cualquiera de esas condiciones y la solución cerrada deja
             de ser la respuesta. Las transferencias reales a Marte se planifican
             contra un objetivo excéntrico y algo inclinado, y la aritmética de
             aquí es donde empiezan esos cálculos, no donde terminan. La propia
             previsión del planificador dice lo mismo de sí misma: muestra la
             órbita de dos cuerpos, y en un sistema donde una tercera masa cuenta
             la trayectoria real se aparta de la predicción.
             \n\nUna cosa más que esta lección ha pasado por alto: la estación
             tiene que <em>estar allí</em> cuando llegues. Acertar con el momento
             es un problema aparte con su propia aritmética, y es la razón de que
             los lanzamientos a Marte ocurran unas pocas semanas cada veintiséis
             meses y no cuando a alguien le apetezca.`,
      tip: 'Una transferencia de Hohmann deja de ser la opción más barata cuando la órbita exterior supera unas 11,9 veces la interior. A partir de ahí, una transferencia bielíptica de tres impulsos cuesta menos, y tarda muchísimo más.',
    },
  ],
};
