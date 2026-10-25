// =============================================================================
// Las palabras del lenguaje de fórmulas, en español
// -----------------------------------------------------------------------------
// Registradas por el módulo que las usa, al cargar. Mismas claves que
// en.formula.js. Las dimensiones se escriben en SI (m kg s K), que se lee igual
// en todos los idiomas; `1` es ninguna.
// =============================================================================

export const ES_FORMULA = {
  'formula.err.length': 'La fórmula tiene más de {max} caracteres.',
  'formula.err.tokens': 'La fórmula tiene más de {max} partes.',
  'formula.err.char':
    'El carácter {char} no forma parte del lenguaje de fórmulas.',
  'formula.err.number':
    '{text} no es un número que la fórmula pueda leer. Escríbelo como 1,5 o 1e-3.',
  'formula.err.empty': 'Escribe una fórmula.',
  'formula.err.expected': 'Aquí se esperaba un {want}.',
  'formula.err.end': 'La fórmula termina demasiado pronto.',
  'formula.err.unexpected': 'No se esperaba {text}.',
  'formula.err.adjacent':
    '{text} sigue a algo con lo que no puede unirse. Escribe un operador entre ellos, como *.',
  'formula.err.depth': 'Los paréntesis están anidados a más de {max} niveles.',
  'formula.err.nodes': 'La fórmula tiene más de {max} pasos.',
  'formula.err.unit': '{unit} no es una unidad que Gravitas conozca.',
  'formula.err.unknownId':
    '{name} no es una columna ni una cantidad de aquí. Puedes usar: {known}.',
  'formula.err.noUnit':
    '{name} no tiene unidad indicada, así que una fórmula no puede comprobarla. Indica primero su unidad.',
  'formula.err.interval':
    '{name} tiene una incertidumbre dada como intervalo, que esta regla no puede propagar. Usa en su lugar el bootstrap del laboratorio de análisis.',
  'formula.err.notConstrained':
    'Los datos no limitan {name}, así que no tiene un valor con el que calcular. Corrige primero el ajuste o indica un valor.',
  'formula.err.failed':
    '{name} no tiene resultado: el análisis que debía producirlo falló. Una fórmula no puede usarlo.',
  'formula.err.limit':
    '{name} es un límite superior o inferior, que esta regla no puede llevar a través de una fórmula. Una derivación hace pasar un único límite por una fórmula cuyas demás entradas son exactas.',
  'formula.err.limitMixed':
    '{name} es un límite superior o inferior, y un límite solo atraviesa una fórmula cuando es el único límite en ella y todas las demás entradas son exactas. De lo contrario el resultado no sería ni un límite ni un valor.',
  'formula.err.limitNonMonotone':
    'La fórmula no crece ni decrece de forma continua cuando {name} va de cero a su límite, así que un límite sobre ella no es un límite sobre el resultado.',
  'formula.err.correlation':
    'Las correlaciones dadas para {name} no pueden cumplirse a la vez: un coeficiente está fuera de -1 a 1, se da dos veces con valores distintos, o el conjunto no es una matriz de correlación. Corrígelas, o quítalas para tratar las entradas como independientes.',
  'formula.err.string':
    "Una unidad entre comillas solo va en to(x, 'km/s'); no hay otras cadenas de texto.",
  'formula.err.dimension':
    'En {expr}: {left} es {a} pero {right} es {b}, y magnitudes de distinta clase no se pueden sumar ni restar.',
  'formula.err.angleMix':
    'En {expr}: un ángulo y un número sin unidad no se pueden sumar ni restar. Dale al número una unidad, como 1[rad] o 1[deg].',
  'formula.err.opaque':
    'En {expr}: una magnitud (mag), un logaritmo (dex) o una unidad de simulación se puede sumar o restar con su misma clase y escalar por un número sin unidad, y nada más.',
  'formula.err.power':
    'El exponente {expr} debe ser un número escrito en la fórmula, no una columna.',
  'formula.err.fractional':
    'En {expr}: una potencia de {power} daría potencias fraccionarias de una unidad, que una fórmula no puede conservar.',
  'formula.err.unknownFn': '{name} no es una función del lenguaje de fórmulas.',
  'formula.err.arity': '{fn} admite {want} (se le dieron {got}).',
  'formula.err.conversion':
    'No se puede escribir {expr}, que es {dim}, en una unidad que es {to}.',
  'formula.err.dimensionless':
    '{fn} necesita un número sin unidad, pero {expr} es {dim}. Divídelo antes por una cantidad de la misma clase.',
  'formula.err.notAngle': '{fn} toma un número sin unidad, no un ángulo.',
  'formula.err.rows': 'Esta tabla tiene {rows} filas; el límite es {max}.',
  'formula.err.of':
    'El nombre {name} debe representar un campo de un paso de medida anterior, escrito paso.campo, y no puede ser una constante ({ref}).',
  'formula.err.unitless':
    'El resultado está en {unit}. Dale a la pregunta esa unidad, o divide el resultado por una unidad escrita como número.',
  'formula.err.data': 'Los valores de {name} no están disponibles.',

  'obs.formula.name': 'Columna nueva',
  'obs.formula.text': 'Fórmula',
  'obs.formula.go': 'Añadir la columna',
  'obs.formula.help.title': 'Qué puede usar una fórmula',
  'obs.formula.help.grammar':
    'Números, + - * / y ^, paréntesis y las funciones de abajo. Un número con unidad se escribe 5[km/s]. Una columna cuyo id tiene algo más que letras, dígitos y _ se escribe entre llaves, {flux-err}. Los números llevan coma decimal (1,5); separa los argumentos con ";". Una fórmula solo calcula: no puede asignar, bifurcar ni repetir. Una suma debe ser de una sola clase de magnitud, y un logaritmo toma un cociente, como en log10(d / 10[pc]).',
  'obs.formula.help.names':
    "Columnas: {names}. Funciones: {functions}. Constantes: {constants}. min, max y mean toman una columna y dan un solo número; to(x, 'km/s') escribe x en una unidad.",
  'obs.formula.preview': 'La columna nueva estaría en {unit}. {why}',
  'obs.formula.plain': 'sin unidad (un número)',
  'obs.formula.noUnit':
    'El resultado es {dim} ({dimension} en SI), que no tiene unidad en el registro, así que no puede ser una columna. Divide por una unidad escrita como número, como 1[yr], o escríbelo en una unidad con to(…).',
  'obs.formula.gaps':
    '{n} filas no tienen valor: faltaba una entrada ahí, o la fórmula no tiene valor en ese punto.',
  'obs.formula.why.first-order':
    'Su incertidumbre se propaga a primer orden desde la de las columnas, tratadas como independientes.',
  'obs.formula.why.first-order-correlated':
    'Su incertidumbre se propaga a primer orden desde las de las entradas, con las correlaciones dadas entre ellas.',
  'obs.formula.why.none':
    '{lacking} no tiene incertidumbre registrada, así que la columna nueva no tiene.',
  'obs.formula.why.shared':
    'No tiene incertidumbre: una columna usada dentro de min, max o mean y fuera de ellos está correlacionada consigo misma, algo que esta regla no puede tratar.',
  'obs.formula.why.exact': 'No lee ninguna columna, así que es exacta.',
  'obs.note.formula':
    'Una columna nueva, {name} = {formula}: calculada aquí con una fórmula, no medida. {why}{gaps}',
  'obs.op.formula': 'columna nueva por una fórmula',

  'nb.formula.intro':
    'Calcula un número nuevo a partir de los de este cuaderno. Llámalos q1, q2 y así, como se listan, y escribe una fórmula como (q1 / 1[yr])^2 / (q2 / 1[AU])^3. Se comprueban las unidades y la incertidumbre se propaga a primer orden cuando todos los números que usas tienen una. El resultado se guarda con su fórmula y con lo que se usó para hacerlo.',
  'nb.formula.row': '{name}: {label} = {value} {unit}',
  'nb.formula.noUnit': 'sin unidad registrada',
  'nb.formula.none': 'El cuaderno aún no tiene números.',
  'nb.formula.title': 'Nombre de la cantidad nueva',
  'nb.formula.text': 'Fórmula',
  'nb.formula.go': 'Crear la cantidad',
  'nb.formula.preview': 'La cantidad estaría en {unit}. {why}',
};
