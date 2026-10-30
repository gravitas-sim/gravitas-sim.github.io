// The remnants panels' words, in Spanish (Prompt 222): the same keys as
// js/i18n/en.remnants.js.
export const ES_REMNANTS = {
  'remW.v.msun': '{x} M☉',
  'remW.v.k': '{x} K',
  'remW.axis.mass': 'Masa (M☉)',
  'remW.axis.gyr': 'Edad de enfriamiento (Ga)',
  'remW.axis.logAge': 'log10 de la edad de enfriamiento (años)',
  'remW.axis.logL': 'log10 de la luminosidad (L☉)',
  'remW.axis.mi': 'Masa inicial (M☉)',
  'remW.axis.mf': 'Masa final (M☉)',
  'remW.axis.prob': 'Probabilidad',
  'remW.axis.system': 'Sistema de dos estrellas de neutrones',
  'remW.legend.law': 'Ley de enfriamiento',
  'remW.legend.model': 'Error propio de la ley, borde superior',
  'remW.legend.modelLower': 'Error propio de la ley, borde inferior',
  'remW.legend.domain': 'Borde caliente del dominio',
  'remW.legend.domainCool': 'Borde frío del dominio',
  'remW.legend.star': 'Esta enana blanca',
  'remW.legend.interval': 'Intervalo del 95 por ciento',
  'remW.legend.wd': 'Enana blanca',
  'remW.legend.ns': 'Estrella de neutrones',
  'remW.legend.bh': 'Agujero negro',
  'remW.legend.here': 'Esta estrella',
  'remW.legend.pulsar': 'Púlsar',
  'remW.legend.companion': 'Compañera',
  'remW.legend.dns': 'Media de la población, 1,33 M☉',
  'remW.legend.chandra': 'Límite de las enanas blancas',
  'remW.legend.relation': 'Masa final',
  'remW.legend.upper': 'Borde superior del intervalo del 95 por ciento',
  'remW.legend.lower': 'Borde inferior del intervalo del 95 por ciento',

  'remW.refuse.invalid-input':
    'Los datos no son una masa y una sola luminosidad o temperatura, finitas y positivas',
  'remW.refuse.above-chandrasekhar':
    'No hay enana blanca: esta masa está en el límite que el modelo halla para una enana blanca, o por encima',
  'remW.refuse.mass-out-of-domain':
    'Sin edad: la ley está comprobada de 0,5 a 1,0 masas solares, y esta masa queda fuera',
  'remW.refuse.luminosity-out-of-domain':
    'Sin edad: esta luminosidad queda fuera del intervalo donde un solo depósito de calor y las pérdidas por fotones son lo principal',
  'remW.refuse.teff-luminosity-out-of-domain':
    'Sin edad: esta temperatura da una luminosidad fuera del intervalo donde la ley está comprobada',
  'remW.refuse.below-the-data':
    'Sin masa final: las enanas blancas a las que se ajustó la relación tenían progenitoras por encima de esto',
  'remW.refuse.above-the-data':
    'Sin masa final: las enanas blancas a las que se ajustó la relación tenían progenitoras por debajo de esto',
  'remW.refuse.below-the-domain':
    'Sin desenlace: una estrella tan ligera no ha salido de la secuencia principal en la edad del universo',
  'remW.refuse.above-the-domain':
    'Sin desenlace: los intervalos citados acaban en 120 masas solares, y la inestabilidad de pares empieza cerca de 140',
  'remW.refuse.unknown-relation': 'No existe esa relación',

  'remW.c.title': '¿Qué edad tiene una enana blanca?',
  'remW.c.note':
    'Una enana blanca no tiene combustible: brilla con el calor de sus iones y se enfría poco a poco. Da su masa y su luminosidad o su temperatura, y el panel da el tiempo que ha tardado en enfriarse, con una ley del tipo de la de Mestel. La edad viene con dos incertidumbres separadas: la de cuán bien se conocen la masa y la luminosidad, y la propia de la ley, hallada comparándola con una tabla de enfriamiento publicada. Fuera del intervalo donde la ley está comprobada, el panel no da edad. La vía de la temperatura usa el radio de una enana blanca fría, que es algo demasiado grande. No se muestra ninguna enana blanca observada.',
  'remW.c.control.mass': 'Masa',
  'remW.c.control.entry': 'Dar',
  'remW.c.control.logL': 'log10 de la luminosidad',
  'remW.c.control.teff': 'Temperatura efectiva',
  'remW.c.control.precision': 'Medida',
  'remW.c.control.view': 'Mostrar',
  'remW.c.entry.0': 'luminosidad',
  'remW.c.entry.1': 'temperatura',
  'remW.c.precision.0': 'exacta',
  'remW.c.precision.1': 'buena',
  'remW.c.precision.2': 'típica',
  'remW.c.precision.3': 'pobre',
  'remW.c.view.0': 'por luminosidad',
  'remW.c.view.1': 'por masa',
  'remW.c.row.model': 'Modelo',
  'remW.c.m.law':
    'El calor de los iones saliendo por una envoltura radiativa: la edad crece como la masa elevada a 5/7 y la luminosidad a −5/7',
  'remW.c.row.none': 'Resultado',
  'remW.c.row.domain': 'Donde la ley está comprobada',
  'remW.c.v.domain': 'de {m0} a {m1} masas solares y log10 L/L☉ de {l0} a {l1}',
  'remW.c.row.lum': 'Luminosidad y temperatura',
  'remW.c.v.lum': 'log10 L/L☉ {l}, {teff} K, radio {r} R☉',
  'remW.c.row.age': 'Edad de enfriamiento',
  'remW.c.v.age': '{a} Ga',
  'remW.c.row.obs': 'De las medidas',
  'remW.c.v.obs': '± {p} por ciento (95 por ciento)',
  'remW.c.v.obsNone': 'ninguna: los datos se toman como exactos',
  'remW.c.row.model2': 'De la propia ley',
  'remW.c.v.model':
    '± {p} por ciento (95 por ciento), medida frente a una tabla publicada',
  'remW.c.row.interval': 'Las dos juntas, 95 por ciento',
  'remW.c.v.interval': 'de {a} a {b} Ga',
  'remW.c.row.limited': 'Limitada por',
  'remW.c.v.limitedYes': 'la ley: mejores medidas no la estrecharían',
  'remW.c.v.limitedNo':
    'las medidas: unas mejores la estrecharían hasta llegar al error propio de la ley',
  'remW.c.row.assumes': 'Lo que deja fuera',
  'remW.c.a.law':
    'Sin cristalización, enfriamiento de Debye, enfriamiento por neutrinos ni acoplamiento convectivo; un núcleo de carbono y oxígeno y una capa gruesa de hidrógeno; la luminosidad es la de fotones',

  'remW.o.title': 'De estrella a remanente',
  'remW.o.note':
    'Lo que deja una estrella depende de la masa con que nació. Para estrellas de hasta unas pocas masas solares, la masa final de la enana blanca sigue una relación ajustada a enanas blancas de cúmulos estelares, con una dispersión que es real. La clase de remanente, enana blanca, estrella de neutrones o agujero negro, cambia en masas que solo se conocen dentro de un intervalo, así que el panel da probabilidades y nunca una clase sola. Elige la relación y qué mostrar: la relación, las probabilidades o las masas de estrellas de neutrones.',
  'remW.o.control.mi': 'Masa inicial',
  'remW.o.control.relation': 'Modelos estelares',
  'remW.o.control.view': 'Mostrar',
  'remW.o.relation.0': 'MIST',
  'remW.o.relation.1': 'PARSEC',
  'remW.o.view.0': 'masa final',
  'remW.o.view.1': 'probabilidades',
  'remW.o.view.2': 'estrellas de neutrones',
  'remW.o.row.model': 'Modelo',
  'remW.o.m.model':
    'Una relación lineal a trozos ajustada a enanas blancas de cúmulos, y dos intervalos umbral de la literatura, cada uno tomado como uniforme',
  'remW.o.row.final': 'Masa final, si es una enana blanca',
  'remW.o.v.final': '{m} M☉, con una dispersión de ± {s} M☉',
  'remW.o.row.lost': 'Masa perdida',
  'remW.o.v.lost': '{l} M☉, el {p} por ciento de la masa inicial',
  'remW.o.row.interval': 'Intervalo del 95 por ciento',
  'remW.o.v.interval':
    'de {a} a {b} M☉ (la incertidumbre de los coeficientes, tomados como independientes, es ± {c} M☉)',
  'remW.o.row.flag': 'Aviso',
  'remW.o.v.extrapolated':
    'por encima del intervalo al que se ajustó el último trozo de la relación: extrapolado',
  'remW.o.row.nofinal': 'Masa final',
  'remW.o.row.wd': 'Enana blanca',
  'remW.o.row.ns': 'Estrella de neutrones',
  'remW.o.row.bh': 'Agujero negro',
  'remW.o.v.prob': '{p} por ciento',
  'remW.o.row.verdict': 'Veredicto',
  'remW.o.verdict.decisive':
    'decisivo: {c}, con una probabilidad del {p} por ciento',
  'remW.o.verdict.uncertain':
    'incierto: lo más probable es {c}, con el {p} por ciento, y las probabilidades de arriba son la respuesta',
  'remW.o.class.whiteDwarf': 'una enana blanca',
  'remW.o.class.neutronStar': 'una estrella de neutrones',
  'remW.o.class.blackHole': 'un agujero negro',
  'remW.o.row.noout': 'Desenlace',
  'remW.o.row.ranges': 'Intervalos umbral citados',
  'remW.o.v.ranges':
    'enana blanca a estrella de neutrones de {a} a {b} M☉; estrella de neutrones a agujero negro de {c} a {d} M☉',
  'remW.o.row.ns2': 'Estrellas de neutrones',
  'remW.o.v.ns':
    '{n} masas de componentes de siete sistemas de dos estrellas de neutrones, de {lo} a {hi} M☉; una enana blanca no puede pasar de {c} M☉',
  'remW.o.row.assumes': 'Lo que deja fuera',
  'remW.o.a.model':
    'Estrellas simples de metalicidad solar; sin rotación ni binarias; los umbrales son intervalos, y por encima de 20 masas solares el desenlace ni siquiera es una función regular de la masa',
};
