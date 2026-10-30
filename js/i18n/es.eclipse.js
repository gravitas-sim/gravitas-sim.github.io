// The eclipsing-binary panels' words, in Spanish (Prompt 217): the same keys as
// js/i18n/en.eclipse.js.
export const ES_ECLIPSE = {
  'eclW.c.title': 'Dos estrellas que se eclipsan',
  'eclW.c.note':
    'Dos estrellas en una misma órbita, vistas casi de canto, de modo que cada una pasa delante de la otra. La curva es la luz de ambas frente a la fase de la órbita: el eclipse primario es cuando se oculta la estrella 1 (la 2 delante), el secundario cuando se oculta la 2. Mueve los deslizadores para cambiar las estrellas y la órbita; activa unos datos para compararlos. Todos los datos de aquí son sintéticos: los hizo un modelo.',
  'eclW.c.control.rsum': 'Suma de radios, (R1+R2)/a',
  'eclW.c.control.k': 'Cociente de radios, R2/R1',
  'eclW.c.control.inc': 'Inclinación',
  'eclW.c.control.J': 'Brillo superficial, S2/S1',
  'eclW.c.control.ecosw': 'e cos w',
  'eclW.c.control.esinw': 'e sen w',
  'eclW.c.control.data': 'Comparar con datos',
  'eclW.data.0': 'ninguno',
  'eclW.data.1': 'la pareja desigual',
  'eclW.data.2': 'la pareja excéntrica',
  'eclW.data.3': 'la pareja rasante',
  'eclW.data.4': 'la pareja con manchas',
  'eclW.v.deg': '{x}°',
  'eclW.axis.phase': 'Fase orbital',
  'eclW.axis.flux': 'Flujo relativo',
  'eclW.legend.model': 'Modelo',
  'eclW.legend.data': 'Datos sintéticos',
  'eclW.legend.fit': 'Mejor ajuste',
  'eclW.row.model': 'Modelo',
  'eclW.m.binary':
    'Dos esferas con oscurecimiento del limbo cuadrático en una órbita kepleriana; nada más (sin reflexión, sin luz elipsoidal, sin manchas)',
  'eclW.row.primary': 'Eclipse primario',
  'eclW.row.secondary': 'Eclipse secundario',
  'eclW.v.eclipse':
    'profundidad {d} por ciento, {w} d del primer al último contacto, fondo {b}',
  'eclW.v.none': 'sin eclipse: las estrellas nunca se solapan en el cielo',
  'eclW.bottom.flat': 'plano',
  'eclW.bottom.curved': 'curvo',
  'eclW.row.phase': 'Secundario en la fase',
  'eclW.v.phase':
    '{p} (la mitad es {h}); e cos w a partir de ella, a primer orden, {e}',
  'eclW.row.orbit': 'Órbita',
  'eclW.v.orbit': 'los eclipses de estos datos se repiten cada {p} d',
  'eclW.row.light': 'Cociente de luz L2/L1',
  'eclW.v.light': '{l}',
  'eclW.row.radii': 'Radios fraccionarios',
  'eclW.v.radii': 'R1/a = {a}, R2/a = {b}',
  'eclW.row.compare': 'Frente a los datos',
  'eclW.v.compare':
    '{n} filas, chi cuadrado {c}, reducido {r}; la línea base se resuelve exactamente',
  'eclW.row.assumes': 'Supone',
  'eclW.a.curve':
    'Una órbita kepleriana circular o excéntrica, estrellas esféricas, el oscurecimiento del limbo del conjunto (0,40 y 0,22 para la estrella 1, 0,50 y 0,18 para la 2), sin luz de una tercera estrella',
  'eclW.f.title': 'Ajusta los eclipses',
  'eclW.f.note':
    'El núcleo de inferencia ajusta el modelo de binaria eclipsante a una curva de luz sintética y dice, parámetro por parámetro, si los datos lo fijan. Un parámetro marcado como no restringido es uno que los datos dejan abierto: el ajuste da un número, y ese número no es una medida. La prueba de residuos compara la dispersión con las barras de error.',
  'eclW.f.control.dataset': 'Datos',
  'eclW.f.control.profile': 'Perfil del cociente de radios',
  'eclW.f.control.truth': 'Mostrar lo que hizo los datos',
  'eclW.on': 'activado',
  'eclW.off': 'desactivado',
  'eclW.row.system': 'Datos',
  'eclW.v.system': '{n} filas sintéticas, ruido {s} por punto, órbita de {p} d',
  'eclW.row.param': '{name}',
  'eclW.v.param': '{v} ± {s}',
  'eclW.v.paramOpen': '{v}, no restringido ({why})',
  'eclW.why.rank': 'los datos dejan una dirección abierta',
  'eclW.why.bound': 'está en su límite',
  'eclW.why.uncertain': 'su incertidumbre supera un cuarto de su valor',
  'eclW.why.derived':
    'se deduce de un cociente de radios que los datos dejan abierto',
  'eclW.why.singular': 'la covarianza es singular',
  'eclW.row.verdict': 'Lo que fijan los datos',
  'eclW.verdict.constrained':
    'restringido: todo parámetro ajustado queda fijado con su incertidumbre indicada',
  'eclW.verdict.open': 'no restringido: {names}',
  'eclW.row.chi2': 'Bondad del ajuste',
  'eclW.v.chi2':
    'chi cuadrado reducido {c} con {d} grados de libertad; factor de ruido correlacionado {b}',
  'eclW.row.residual': 'Prueba de residuos',
  'eclW.resid.pass':
    'superada: la dispersión es la que dicen las barras de error',
  'eclW.resid.fail':
    'no superada: la dispersión es mayor que la que dicen las barras de error, así que la curva de luz contiene algo que el modelo omite',
  'eclW.row.ecc': 'Excentricidad',
  'eclW.v.ecc': 'e = {e} ± {s}, w = {w}°',
  'eclW.row.profile': 'Cociente de radios, perfil',
  'eclW.v.profile':
    'el chi cuadrado sube 1 en k = {a} y {b}; el ajuste dice {k}',
  'eclW.v.profileOpen':
    'abierto por un lado o por ambos: k = {a} a {b}, el ajuste dice {k}',
  'eclW.row.truth': 'Lo que lo hizo',
  'eclW.v.truth':
    'rsum {r}, k {k}, inclinación {i}°, J {j}, e cos w {c}, e sen w {s}',
  'eclW.row.refused': 'Rechazado',
  'eclW.a.fit':
    'El modelo separado del núcleo de inferencia, ajustado por mínimos cuadrados ponderados desde varios comienzos; oscurecimiento del limbo fijo, tercera luz nula',
};
