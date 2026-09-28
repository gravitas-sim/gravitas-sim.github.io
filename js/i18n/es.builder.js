// =============================================================================
// Las palabras del constructor de sistemas orbitales, en español
// -----------------------------------------------------------------------------
// La sombra de ./en.builder.js, con las mismas claves. Solo la importa
// js/systemBuilder.js, que se carga cuando alguien lo abre.
// =============================================================================

export const ES_BUILDER = {
  'builder.title': 'Constructor de sistemas orbitales',
  'builder.intro':
    'Construye un sistema a partir de elementos orbitales. Elige qué orbita cada compañero y describe su órbita; el constructor calcula dónde empieza cada cuerpo y con qué velocidad se mueve, con el centro de masas de todo el sistema en reposo.',
  'builder.template.label': 'Empezar desde',
  'builder.template.apply': 'Usar este punto de partida',
  'builder.template.starPlanet': 'Una estrella y un planeta',
  'builder.template.sunEarthMoon': 'El Sol, la Tierra y la Luna',
  'builder.template.giants': 'El Sol, Júpiter y Saturno',
  'builder.template.kepler16':
    'Un planeta alrededor de una estrella binaria (Kepler-16)',
  'builder.template.alphaCen':
    'Un planeta en una binaria amplia (Alfa Centauri)',
  'builder.template.triple': 'Una estrella triple jerárquica',
  'builder.template.applied': 'Se empezó desde {name}.',
  'builder.name.star': 'Estrella',
  'builder.name.planet': 'Planeta',
  'builder.name.sun': 'Sol',
  'builder.name.earth': 'Tierra',
  'builder.name.moon': 'Luna',
  'builder.name.jupiter': 'Júpiter',
  'builder.name.saturn': 'Saturno',
  'builder.name.kepler16a': 'Kepler-16 A',
  'builder.name.kepler16b': 'Kepler-16 B',
  'builder.name.kepler16planet': 'Kepler-16 b',
  'builder.name.alphaCenA': 'Alfa Centauri A',
  'builder.name.alphaCenB': 'Alfa Centauri B',
  'builder.name.alphaCenPlanet': 'Un planeta de A',
  'builder.name.tripleA': 'Estrella A',
  'builder.name.tripleB': 'Estrella B',
  'builder.name.tripleC': 'Estrella C',
  'builder.defaultName': '{type} {n}',

  'builder.body.root': 'Cuerpo 1: el centro del sistema',
  'builder.body.companion': 'Cuerpo {n}',
  'builder.field.name': 'Nombre',
  'builder.field.type': 'Tipo',
  'builder.field.mass': 'Masa ({unit})',
  'builder.field.massHint': 'De {min} a {max}.',
  'builder.field.radius': 'Radio de contacto (unidades de simulación)',
  'builder.field.radiusHint':
    'En blanco para el radio propio de este tipo con esta masa, {radius}. Dos cuerpos más cerca que la suma de sus radios chocan.',
  'builder.field.radiusBlackHole':
    'El radio de un agujero negro se deduce de su masa: {radius}.',
  'builder.field.primary': 'Orbita',
  'builder.field.a': 'Semieje mayor (UA)',
  'builder.field.e': 'Excentricidad',
  'builder.field.omega': 'Argumento del periastro (grados)',
  'builder.field.omegaHint': 'La dirección del periastro, desde el eje +x.',
  'builder.field.phase': 'Anomalía media inicial (grados)',
  'builder.field.phaseHint': '0 empieza en el periastro, 180 en el apoastro.',
  'builder.field.direction': 'Sentido',
  'builder.direction.prograde': 'Prógrado (antihorario)',
  'builder.direction.retrograde': 'Retrógrado (horario)',
  'builder.mass.suns': 'masas solares',
  'builder.mass.earths': 'masas terrestres',
  'builder.mass.jupiters': 'masas de Júpiter',
  'builder.add': 'Añadir un compañero',
  'builder.remove': 'Quitar {name}',
  'builder.removed': 'Se quitó {name}.',

  'builder.preview.heading': 'Vista previa',
  'builder.preview.caption':
    'Dónde empieza cada cuerpo y la órbita osculatriz de cada compañero, tal como se verán en el lienzo. Los cuerpos no están dibujados a escala.',
  'builder.preview.label':
    'Vista previa de {count} cuerpos, de {width} UA de ancho. La tabla de abajo enumera todas las órbitas.',
  'builder.preview.none':
    'La vista previa aparece cuando todos los campos están completos.',
  'builder.table.heading': 'Órbitas, en el orden en que se construyen',
  'builder.table.caption':
    'Cada compañero orbita todo lo que aparece antes que él alrededor del mismo cuerpo. Los periodos son estimaciones keplerianas de la órbita de dos cuerpos.',
  'builder.col.order': 'Orden',
  'builder.col.body': 'Compañero',
  'builder.col.primary': 'Orbita',
  'builder.col.period': 'Periodo',
  'builder.col.periapsis': 'Periastro (UA)',
  'builder.col.apoapsis': 'Apoastro (UA)',
  'builder.col.offset': 'Desplazamiento del baricentro (UA)',
  'builder.inner': '{name} y lo que orbita por dentro',
  'builder.period.days': '{value} días',
  'builder.period.years': '{value} años',
  'builder.residuals':
    'Leída de nuevo a partir de las posiciones y velocidades iniciales, cada órbita coincide con lo introducido con un error menor que {worst} de su tamaño, y el momento neto del sistema es {momentum} del total.',

  'builder.checks.heading': 'Comprobaciones',
  'builder.checks.none': 'Nada llama la atención en este sistema.',
  'builder.checks.error': 'No se puede construir: {text}',
  'builder.checks.caution': 'Atención: {text}',
  'builder.check.overlap':
    '{first} y {second} se solapan al empezar: están a {distance} UA y se tocan a {contact} UA. Chocarían en el primer paso.',
  'builder.check.contact':
    '{first} llega a {periapsis} UA de {second} en el periastro, dentro de la distancia de contacto ({contact} UA). El primer acercamiento termina en un choque.',
  'builder.check.hillOutside':
    '{first} llega a {reach} veces el radio de Hill de {second} ({hill} UA en su punto más cercano a lo que orbita). Tan lejos, {second} no puede retenerlo.',
  'builder.check.hillWide':
    '{first} llega a {reach} veces el radio de Hill de {second} ({hill} UA). Las lunas prógradas suelen ser estables solo dentro de la mitad de ese radio (Hamilton y Burns, 1991).',
  'builder.check.crossing':
    'Las órbitas de {first} y {second} se cruzan: {first} llega a {apoapsis} UA y {second} baja hasta {periapsis} UA.',
  'builder.check.circumbinary':
    '{second} orbita a {semiMajor} UA, dentro de {critical} UA, la órbita estable más cercana a esta binaria según los ajustes de Holman y Wiegert (1999). Los planetas colocados por dentro solían perderse.',
  'builder.check.circumstellar':
    '{first} orbita a {semiMajor} UA, fuera de {critical} UA, la órbita estable más amplia alrededor de una de las estrellas de este par según los ajustes de Holman y Wiegert (1999).',
  'builder.check.triple':
    'La órbita de {second} es {ratio} veces la de {first}. Mardling y Aarseth (2001) sitúan el límite de estabilidad de una triple como esta cerca de {critical}; una triple más compacta difícilmente sigue siendo jerárquica.',
  'builder.check.spacing':
    '{first} y {second} están a {spacing} radios de Hill mutuos. Gladman (1993) demostró que dos planetas separados más de 3,46 no pueden encontrarse nunca; más cerca, nada lo impide.',
  'builder.check.fastOrbit':
    '{first} completa una vuelta en {period} unidades de tiempo, más rápido de lo que el paso más pequeño del integrador puede seguir a velocidad normal. Su órbita derivará; reduce la velocidad de la simulación o amplía la órbita.',
  'builder.check.fitRange':
    'Este par queda fuera de las razones de masas y excentricidades para las que se hizo el ajuste, así que toma el límite como una guía aproximada.',

  'builder.note.osculating':
    'Estos elementos son osculadores: cada uno describe la órbita de dos cuerpos que seguiría un compañero si solo tiraran de él los cuerpos que hay dentro de su órbita. En cuanto el sistema se mueve, todos los demás lo perturban, así que su semieje mayor, su excentricidad y su periastro cambiarán.',
  'builder.note.proof':
    'Ninguna comprobación de aquí demuestra que el sistema sea estable. Solo ejecutarlo muestra lo que hace, y una ejecución larga no dice nada de otra más larga.',
  'builder.note.settings':
    'El sistema se ejecuta con todos los cuerpos atrayéndose entre sí, los agujeros negros libres para moverse, sin decaimiento orbital, un paso de integración de como mucho {step} unidades de tiempo y una longitud de suavizado de {soft} unidades de simulación.',

  'builder.build': 'Construir este sistema',
  'builder.export': 'Guardar como archivo',
  'builder.import': 'Abrir un archivo',
  'builder.close': 'Cerrar',
  'builder.built':
    'Se construyeron {count} cuerpos. El sistema está en marcha; Recargar escenario lo vuelve a construir desde el principio.',
  'builder.invalid':
    '{count} campos necesitan atención antes de poder construir este sistema.',
  'builder.blocked':
    'Este sistema no se puede construir tal como está. Mira las comprobaciones.',
  'builder.file.notSystem': 'Ese archivo no es un sistema orbital de Gravitas.',
  'builder.file.newer':
    'Ese archivo lo hizo una versión más reciente de Gravitas (versión de formato {version}). Recarga la página e inténtalo de nuevo.',
  'builder.file.unreadable': 'No se pudo leer ese archivo.',
  'builder.file.loaded': 'Se abrió un sistema de {count} cuerpos.',
  'builder.file.drift':
    'El estado inicial guardado en el archivo no coincide con el que esta versión de Gravitas calcula a partir de sus elementos. Se han usado los elementos.',
  'builder.file.saved': 'Se guardó {file}.',

  'builder.error.tooFew':
    'Un sistema necesita al menos dos cuerpos. Añade un compañero.',
  'builder.error.tooMany': 'Un sistema puede tener como mucho {max} cuerpos.',
  'builder.error.type': 'Elige un tipo.',
  'builder.error.number': 'Introduce un número.',
  'builder.error.massRange': 'Introduce una masa de {min} a {max}.',
  'builder.error.blackHoleRadius':
    'El radio de un agujero negro se deduce de su masa. Déjalo en blanco.',
  'builder.error.radiusRange':
    'Introduce un radio mayor que 0 y de como mucho {max}, o déjalo en blanco.',
  'builder.error.rootPrimary':
    'El primer cuerpo es el centro del sistema y no orbita nada.',
  'builder.error.primary':
    'Elige un cuerpo de los que aparecen antes que este.',
  'builder.error.aRange':
    'Introduce una distancia mayor que 0 y de como mucho {max} UA.',
  'builder.error.unbound':
    'Una excentricidad de 1 o más es una órbita no ligada: el compañero se iría y no volvería nunca. Introduce menos de 1.',
  'builder.error.eRange': 'Introduce una excentricidad de 0 a {max}.',
  'builder.error.mixedBlackHoles':
    'En Gravitas a un agujero negro solo lo atraen otros agujeros negros, así que uno entre estrellas o planetas no respondería a ellos y el sistema no podría mantenerse unido. Haz que todos los cuerpos sean agujeros negros, o ninguno.',
};
