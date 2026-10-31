// Las palabras de los paneles de variaciones de tiempo de tránsito, en español (Prompt 226).
export const ES_TTV = {
  'ttvW.system.0': 'Cerca de 2:1 (periodos de 10 y 20,6 días)',
  'ttvW.system.1': 'Cerca de 3:2 (periodos de 10 y 15,45 días)',
  'ttvW.system.2': 'Lejos de la resonancia (periodos de 10 y 27 días)',
  'ttvW.sys.0': 'Cerca de 2:1',
  'ttvW.sys.1': 'Cerca de 3:2',
  'ttvW.sys.2': 'Par lejano',
  'ttvW.planet.0': 'Planeta interior',
  'ttvW.planet.1': 'Planeta exterior',
  'ttvW.control.system': 'Sistema',
  'ttvW.control.planet': 'Planeta',
  'ttvW.row.system': 'Sistema',
  'ttvW.row.assumes': 'Qué supone',
  'ttvW.v.percent': '{x} por ciento',

  'ttvW.t.title': 'El instante de un tránsito',
  'ttvW.t.note':
    'Una ventana de curva de luz alrededor de un tránsito y el ajuste que mide su instante central: la plantilla es fija y solo se ajustan el instante y la línea de base',
  'ttvW.t.control.transit': 'Número de tránsito',
  'ttvW.t.control.noise': 'Ruido por punto',
  'ttvW.t.noise.0': 'Bajo (100 ppm)',
  'ttvW.t.noise.1': 'Típico (400 ppm)',
  'ttvW.t.noise.2': 'Alto (1600 ppm)',
  'ttvW.t.control.view': 'Mostrar',
  'ttvW.t.view.0': 'Curva de luz',
  'ttvW.t.view.1': 'Chi cuadrada',
  'ttvW.axis.minPredicted':
    'Tiempo desde el centro previsto del tránsito (minutos)',
  'ttvW.axis.minFit': 'Instante menos el mejor ajuste (minutos)',
  'ttvW.axis.flux': 'Flujo relativo',
  'ttvW.axis.dchi2': 'Chi cuadrada sobre su mínimo',
  'ttvW.legend.flux': 'Flujo medido',
  'ttvW.legend.fit': 'Plantilla en el instante ajustado',
  'ttvW.legend.profile': 'Chi cuadrada',
  'ttvW.legend.one': 'Uno sobre el mínimo: una sigma',
  'ttvW.t.row.which': 'Tránsito',
  'ttvW.t.row.noise': 'Ruido',
  'ttvW.t.row.fit': 'Ajuste',
  'ttvW.t.row.time': 'Instante respecto de la previsión',
  'ttvW.t.row.chi': '¿Ajusta la plantilla?',
  'ttvW.t.row.regime': '¿Es la barra de error un intervalo?',
  'ttvW.t.v.reliable':
    'Sí: la barra de error es bastante menor que el intervalo de dos minutos entre puntos, así que puede leerse como una sigma',
  'ttvW.t.v.lowSnr':
    'No del todo: la barra de error de {s} minutos es tan larga como los {c} minutos entre puntos y entonces la dispersión real es mayor de lo que dice; léela como una cota inferior',
  'ttvW.t.row.truth': 'El instante verdadero del motor',
  'ttvW.t.v.which': 'Número {n}, {planet}',
  'ttvW.t.v.noise': '{ppm} ppm por punto de dos minutos',
  'ttvW.t.v.refused':
    'Sin instante: la ventana es demasiado corta o el ruido no es un número',
  'ttvW.t.v.time': '{dt} minutos, más o menos {s} (una sigma)',
  'ttvW.t.v.chiOk': 'Sí: chi cuadrada por grado de libertad {c} con {n} grados',
  'ttvW.t.v.chiFlag':
    'No: la chi cuadrada por grado de libertad, {c} con {n} grados, es demasiado alta para ser solo ruido; no hay que fiarse de la barra de error indicada',
  'ttvW.t.v.truth':
    'El planeta sintético cruzó a {e} minutos del instante ajustado, {z} sigma',
  'ttvW.t.a.template':
    'La forma del tránsito (cociente de radios, a/R*, parámetro de impacto, oscurecimiento del limbo) es la verdadera y fija, el ruido es blanco con el tamaño indicado y la estrella no tiene manchas',

  'ttvW.o.title': 'El diagrama O-C',
  'ttvW.o.note':
    'Observado menos calculado: cada instante de tránsito medido frente al reloj de línea recta ajustado a todos, con la sinusoide y el superperiodo que halla el ajuste',
  'ttvW.o.control.span': 'Parte del registro',
  'ttvW.axis.transit': 'Número de tránsito',
  'ttvW.axis.oc': 'O - C (minutos)',
  'ttvW.legend.oc': 'Instante medido menos el reloj, con una sigma',
  'ttvW.legend.line': 'El reloj de línea recta',
  'ttvW.legend.sine': 'Recta más sinusoide, ajustadas',
  'ttvW.o.row.record': 'El registro',
  'ttvW.o.row.clock': 'El reloj',
  'ttvW.o.row.scatter': 'Dispersión en torno al reloj',
  'ttvW.o.row.verdict': 'Veredicto',
  'ttvW.o.row.period': 'Superperiodo ajustado',
  'ttvW.o.row.amp': 'Amplitud ajustada',
  'ttvW.o.row.relation': 'Superperiodo según los periodos del par',
  'ttvW.o.row.formula': 'Amplitud según la fórmula',
  'ttvW.o.v.record': '{n} tránsitos en {d} días',
  'ttvW.o.v.refused':
    'Sin efeméride: menos de tres tránsitos, o un instante que no es un número',
  'ttvW.o.v.clock': 'Periodo {p} días, más o menos {s}',
  'ttvW.o.v.scatter': '{rms} minutos; chi cuadrada por grado de libertad {c}',
  'ttvW.o.v.noSignal':
    'Sin señal de TTV sobre el ruido: la dispersión en torno a la recta es la que permiten las barras de error (p {p})',
  'ttvW.o.v.unresolved':
    'Hay señal, pero el registro cubre {c} ciclos de la oscilación y un periodo necesita {m}: no se da superperiodo',
  'ttvW.o.v.period': '{p} días (una sigma de {a} a {b})',
  'ttvW.o.v.amp': '{a} minutos',
  'ttvW.o.v.relation':
    '{p} días: 1 entre la diferencia de j entre el periodo exterior y j menos 1 entre el interior, j = {j}, distancia a la resonancia {d}',
  'ttvW.o.v.formula':
    '{a} minutos, si ambas órbitas fueran circulares (y lo que esto deja fuera es la excentricidad: una amplitud no es una masa)',
  'ttvW.o.control.view': 'Mostrar',
  'ttvW.o.view.0': 'Diagrama O-C',
  'ttvW.o.view.1': 'Lectura de masa',
  'ttvW.o.control.z': 'Excentricidad libre |Z| (una ilustración)',
  'ttvW.axis.z': 'Combinación de excentricidades libres |Z|',
  'ttvW.axis.amp': 'Amplitud de las TTV con estas masas (minutos)',
  'ttvW.legend.maxAmp': 'Amplitud mayor, con la mejor dirección de Z',
  'ttvW.legend.minAmp': 'Amplitud menor, con la peor dirección',
  'ttvW.legend.measuredAmp': 'La amplitud medida',
  'ttvW.legend.here': 'El |Z| fijado arriba',
  'ttvW.o.who.outer': 'planeta exterior',
  'ttvW.o.who.inner': 'planeta interior',
  'ttvW.o.who.other': 'otro planeta',
  'ttvW.o.row.mass': 'Masa del {who}, si el par es circular',
  'ttvW.o.row.truthMass': 'La masa del motor',
  'ttvW.o.row.assumption': 'Suposición',
  'ttvW.o.row.spread': 'Qué hace una excentricidad',
  'ttvW.o.v.mass':
    '{c} masas terrestres (de {a} a {b}), para una estrella de una masa solar',
  'ttvW.o.v.truthMass': '{m} masas terrestres',
  'ttvW.o.v.assumption':
    'Órbitas circulares. La amplitud depende también de las excentricidades de los planetas, que no puede dar, así que esta es la masa solo si son pequeñas frente a la distancia a la resonancia',
  'ttvW.o.v.spread':
    'Con las mismas masas y una combinación de excentricidades libres de {z}, la amplitud podría estar entre {lo} y +{hi} por ciento de la circular, y la masa leída de ella se equivocaría en esa medida',
  'ttvW.o.v.noMass':
    'Sin masa: la amplitud no está medida, o el par queda fuera del intervalo de la relación',
  'ttvW.o.refuse.far-from-resonance':
    'Sin relación: el par está a {d} de la resonancia de primer orden más cercana, demasiado lejos para esperar una oscilación lenta; hay que usar el motor',
  'ttvW.o.refuse.inside-resonance-width':
    'Sin relación: el par está dentro de la anchura de la resonancia, donde el ángulo libra y la sinusoide no es la respuesta',
  'ttvW.o.refuse.invalid':
    'Sin relación: los periodos o las masas no son números',
  'ttvW.o.refuse.order':
    'Sin relación: el planeta interior no es el de periodo más corto',
  'ttvW.o.a.model':
    'Solo dos planetas, en un plano, con una razón de periodos cercana a una resonancia de primer orden pero fuera de su anchura; los instantes son los del motor con ruido blanco y nada de esto es observado',
};
