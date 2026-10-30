// Las palabras del panel de verificación, en español (Prompt 228). Cada candidato es sintético
// y el panel lo dice; las palabras de veredicto y motivo son texto fijo y se traducen por clave.
export const ES_VETTING = {
  'vetW.title': 'Verificar un candidato',
  'vetW.note':
    'Una caída que se repite es solo un candidato. Tres pruebas intentan rechazarlo: si los tránsitos impares y pares tienen la misma profundidad, si hay un segundo eclipse media órbita después, y si la luz que baja está en la posición del objetivo. Cada prueba dice aprobada, suspendida o no concluyente, y no concluyente es una respuesta propia: los datos no pudieron decidir. Un candidato que ninguna prueba rechaza no está validado. Todos los candidatos son sintéticos: los hizo un modelo, y se puede mostrar la verdad.',
  'vetW.control.candidate': 'Candidato',
  'vetW.control.plots': 'Mostrar las gráficas',
  'vetW.control.view': 'Gráfica',
  'vetW.control.truth': 'Mostrar qué lo hizo',
  'vetW.cand.0': 'A: una caída limpia',
  'vetW.cand.1': 'B: caídas profundas y someras',
  'vetW.cand.2': 'C: una caída y una segunda caída',
  'vetW.cand.3': 'D: una caída limpia, sin imágenes',
  'vetW.cand.4': 'E: una caída limpia, con imágenes',
  'vetW.cand.5': 'F: una caída débil',
  'vetW.cand.6': 'G: una caída limpia, vecina cercana',
  'vetW.cand.7': 'H: una caída ruidosa',
  'vetW.view.0': 'tránsitos impares y pares',
  'vetW.view.1': 'media órbita después',
  'vetW.view.2': 'dónde baja la luz',
  'vetW.on': 'activado',
  'vetW.off': 'desactivado',
  'vetW.axis.offset':
    'Tiempo desde el centro de la caída, en duraciones del tránsito',
  'vetW.axis.flux': 'Flujo relativo',
  'vetW.axis.x': 'Píxel x',
  'vetW.axis.y': 'Píxel y',
  'vetW.legend.odd': 'Tránsitos impares',
  'vetW.legend.even': 'Tránsitos pares',
  'vetW.legend.half': 'Media órbita después',
  'vetW.legend.target': 'Estrella objetivo',
  'vetW.legend.dic': 'Dónde baja la luz',
  'vetW.legend.neighbor': 'Vecina (verdad)',
  'vetW.verdict.pass': 'aprobada',
  'vetW.verdict.fail': 'suspendida',
  'vetW.verdict.inconclusive': 'no concluyente',
  'vetW.verdict.notRun': 'no realizada',
  'vetW.reason.depths-agree':
    'las profundidades impar y par coinciden, y la prueba habría visto una diferencia',
  'vetW.reason.depths-differ':
    'los tránsitos impares y pares tienen distinta profundidad',
  'vetW.reason.too-few-transits':
    'hay muy pocos tránsitos de una paridad para comparar',
  'vetW.reason.no-signal': 'no se detecta ninguna caída en la efeméride dada',
  'vetW.reason.low-power':
    'los datos son demasiado ruidosos para excluir lo que busca la prueba',
  'vetW.reason.no-coverage': 'los datos no cubren media órbita después',
  'vetW.reason.deep-secondary':
    'un segundo eclipse tan profundo no es la luz propia de un planeta',
  'vetW.reason.detected-below-limit':
    'un segundo eclipse débil, lo bastante somero para la luz propia de un planeta',
  'vetW.reason.not-detected':
    'no hay segundo eclipse, y la prueba habría visto uno profundo',
  'vetW.reason.on-target':
    'la caída está en la posición del objetivo, y una fuente más allá del radio de exclusión se habría visto',
  'vetW.reason.off-target':
    'la luz que baja no está en la posición del objetivo',
  'vetW.reason.too-few-frames':
    'hay muy pocas imágenes dentro o fuera del tránsito',
  'vetW.reason.no-difference-signal':
    'la imagen diferencia es demasiado débil para situar la caída',
  'vetW.reason.centroid-edge':
    'el objetivo está demasiado cerca del borde de la imagen',
  'vetW.row.candidate': 'Candidato',
  'vetW.v.candidate':
    '{n} puntos de la curva de luz cada 3 minutos, {s} por ciento de ruido por punto, con un período de {p} d; {f}',
  'vetW.v.frames': '{n} imágenes de un recorte de 17 por 17 píxeles',
  'vetW.v.noFrames': 'no se tomaron imágenes',
  'vetW.row.oddEven': 'Prueba 1: profundidades impar y par',
  'vetW.v.oddEven':
    '{v}: {r}. Profundidades {a} y {b} por ciento, diferencia {d} ± {s} por ciento ({z} sigma); habría visto una diferencia de {m} por ciento, el {q} por ciento de la profundidad',
  'vetW.v.oddEvenNone': '{v}: {r}',
  'vetW.row.secondary': 'Prueba 2: un segundo eclipse',
  'vetW.v.secondary':
    '{v}: {r}. Profundidad media órbita después {d} ± {s} por ciento; habría visto {u} por ciento, el {q} por ciento del primario',
  'vetW.v.secondaryNone': '{v}: {r}',
  'vetW.row.centroid': 'Prueba 3: dónde baja la luz',
  'vetW.v.centroid':
    '{v}: {r}. La caída está a {d} píxeles del objetivo ({z} sigma); una fuente a más de {x} píxeles se habría visto',
  'vetW.v.centroidNone': '{v}: {r}',
  'vetW.v.centroidNotRun':
    'no realizada: no se tomaron imágenes, así que esta prueba no dice nada',
  'vetW.row.overall': 'En conjunto',
  'vetW.overall.rejected':
    'Rechazado: al menos una prueba suspende. Con esta evidencia no es un planeta.',
  'vetW.overall.survives':
    'No rechazado: todas las pruebas realizadas se aprobaron. Eso no es validación: las pruebas descartan algunos falsos positivos y dejan otros.',
  'vetW.overall.undecided':
    'Sin decidir: ninguna prueba suspende, pero al menos una no pudo decidir. Di qué lo decidiría.',
  'vetW.row.rates': 'Qué hacen los umbrales',
  'vetW.v.rates':
    'En conjuntos sintéticos con semilla: los tránsitos de un planeta real son rechazados por la prueba 1 en el {a} por ciento y por la prueba 2 en el {b} por ciento; una mezcla de estrellas desiguales pasa la prueba 1 en el {c} por ciento y el segundo eclipse de una binaria pasa la prueba 2 en el {d} por ciento; las imágenes rechazan un planeta en su propio objetivo en el {e} por ciento y pasan la mezcla de una vecina en el {f} por ciento',
  'vetW.row.record': 'Registro',
  'vetW.v.record':
    '{n} cantidades con sus incertidumbres ({k}); los veredictos están en su procedencia',
  'vetW.row.truth': 'Qué lo hizo',
  'vetW.truth.clean':
    'Un planeta: una caída de una estrella que tiene un planeta, nada más.',
  'vetW.truth.alternating':
    'Una mezcla: una binaria de dos estrellas desiguales, detrás o junto al objetivo, con el doble del período. Sus eclipses más profundos son las caídas impares y los más someros las pares; su luz es el 2 por ciento del total.',
  'vetW.truth.secondary':
    'Una binaria en el propio objetivo, con el período mostrado: su segundo eclipse está media órbita después, con la mitad de la profundidad del primario.',
  'vetW.truth.twin':
    'Una mezcla: una binaria de dos estrellas iguales con el doble del período. Todas las caídas tienen la misma profundidad y no hay segundo eclipse a la mitad del período: la curva de luz no puede distinguirla de un planeta.',
  'vetW.truth.twin-frames':
    'La misma mezcla, con imágenes: la binaria es una vecina a 1,6 píxeles del objetivo.',
  'vetW.truth.faint':
    'Un planeta, con un ruido 80 veces mayor que el del candidato limpio, e imágenes débiles.',
  'vetW.truth.close':
    'La misma mezcla de estrellas iguales, pero la binaria está a 0,15 píxeles del objetivo, más cerca de lo que las imágenes pueden separar.',
  'vetW.truth.marginal':
    'Un planeta cuyos tránsitos impares son un 10 por ciento más profundos y los pares un 10 por ciento más someros que el promedio: una diferencia del 20 por ciento, con un ruido 30 veces el del candidato limpio.',
  'vetW.row.assumes': 'Supone',
  'vetW.a':
    'Datos sintéticos con ruido blanco; una órbita circular (el segundo eclipse se busca media órbita después); la efeméride dada; una vecina en las imágenes; sin efectos del detector. Una prueba aprobada descarta lo que la prueba podía ver y nada más.',
};
