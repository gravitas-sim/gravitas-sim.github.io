// =============================================================================
// The Spanish check messages of the five computing lessons
// -----------------------------------------------------------------------------
// Integrators in Practice, Extending an Experiment, Two Periodograms, Sampling
// a Posterior and Refitting a Transit grade numbers a student types, and the
// sentences their checks return carry those numbers ("You chose 438: set steps
// to 438 ..."). js/i18n/lesson.js keys a computed sentence by what it says, so a
// sentence with the student's number in it would need one entry per number.
//
// This catalog keys the sentence with every number cut out instead: `#` stands
// for each number, the Spanish keeps its own numbers where they never change and
// takes `{0}`, `{1}`, ... for the ones that do (counted from the left in the
// English), and the number comes back in Spanish form, with the decimal comma
// and a point between thousands, as the lessons' Spanish prose writes them.
// tests/computingMessagesEs.test.js runs every check of the five lessons and
// holds each sentence to an entry here, each entry to a sentence, and each
// sentence's numbers to its translation's. A key is a hash of the English with
// its numbers cut out; the comment above an entry says which check returns the
// sentence and gives the English. A sentence with no entry stays English.
//
// How it is reached: it is a lazy file of its own. The Spanish words of each of
// the five lessons export `messages`, which imports it; loaders.js awaits that
// when it loads the lesson in Spanish and hands the lesson to `speak`, which
// returns the lesson with its checks wrapped. An English reader, every other
// lesson and every page that is not one of these lessons never fetch it, and
// js/i18n/lesson.js, which then translates the sentences that have no number,
// is untouched. This file imports nothing, on purpose: an import of lesson.js
// or of the i18n index would make a lazy entry that shares them, and the bundler
// would then move those into a chunk of their own that every lesson route, and
// several pages, would fetch.
// =============================================================================

/** A number as a check writes it: a minus sign, thousands commas, a decimal point. */
export const NUMBER = /−?\d+(?:,\d{3})+(?:\.\d+)?|−?\d+(?:\.\d+)?/g;

/**
 * The key of a sentence, its numbers cut out (FNV-1a over the text).
 *
 * @param {string} text - The English with each number replaced by `#`
 * @returns {string} A short key
 */
export function templateKey(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++)
    h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

/** Keys to Spanish templates. */
export const COMPUTING_ES = {
  // integrators-in-practice/four-drifts
  // Explicit Euler has gained energy equal to half the size of the starting energy, which is not a small drift but a different orbit. Symplectic Euler and velocity Verlet are within a few thousandths of a percent, and Runge-Kutta # is tens of thousands of times better than either. All four took the same # steps.
  j4qca7:
    'El Euler explícito ha ganado una energía igual a la mitad de la energía inicial, lo que no es una deriva pequeña sino una órbita distinta. El Euler simpléctico y el Verlet de velocidad quedan dentro de unas pocas milésimas de un por ciento, y el Runge-Kutta 4 es decenas de miles de veces mejor que cualquiera de los dos. Los cuatro dieron los mismos 10.722 pasos.',
  // integrators-in-practice/four-drifts
  // Check the settings (# periods, # steps) and read the capsule’s numbers in percent: explicit Euler about #, the others tiny, and the sign of each as the page shows it.
  '12yis5d':
    'Comprueba los ajustes (3 períodos, 500 pasos) y lee los números de la cápsula en porcentaje: el Euler explícito, unos 50; los demás, diminutos; y el signo de cada uno tal como lo muestra la página.',
  // integrators-in-practice/four-drifts
  // The step count should be # with # periods and # steps. If yours is different, check the two settings.
  c0j2n6:
    'El número de pasos debería ser 10.722 con 3 períodos y 500 pasos. Si el tuyo es distinto, revisa los dos ajustes.',
  // integrators-in-practice/choose-the-second-step
  // Those are the drifts of the #-step run. You chose #: set steps to # on the compute page and run again.
  ofj5ch:
    'Esas son las derivas de la ejecución de {0} pasos. Has elegido {1}: pon los pasos en {2} en la página de cálculo y ejecuta de nuevo.',
  // integrators-in-practice/choose-the-second-step
  // Set steps to # with # periods, run, and read the drifts of velocity Verlet and Runge-Kutta #, then divide each baseline drift by the new one.
  '1wdyrku':
    'Pon los pasos en {0} con 3 períodos, ejecuta, lee las derivas del Verlet de velocidad y del Runge-Kutta 4, y divide luego cada deriva de referencia entre la nueva.',
  // integrators-in-practice/choose-the-second-step
  // Your two drifts match the #-step run. The improvement is the baseline's #-step drift divided by this run's drift, for each method: the old number over the new, not the other way round.
  vcxnqr:
    'Tus dos derivas coinciden con las de la ejecución de {0} pasos. La mejora es la deriva de referencia, de 500 pasos, dividida entre la deriva de esta ejecución, para cada método: el número antiguo entre el nuevo, no al revés.',
  // integrators-in-practice/choose-the-second-step
  // The ratio of your step count to the baseline's is #. Velocity Verlet's improvement, #, is that ratio squared, which is what second order means; Runge-Kutta #'s, #, is not simply its fourth power: its apparent power of the step ratio is near # rather than #, so more than the leading term of its error shows at these steps.
  '7qohpd':
    'El cociente entre tu número de pasos y el de la referencia es {0}. La mejora del Verlet de velocidad, {1}, es ese cociente al cuadrado, que es lo que significa segundo orden; la del Runge-Kutta 4, {3}, no es simplemente su cuarta potencia: la potencia aparente del cociente de pasos es de casi 4,8 y no de 4, así que con estos pasos se nota algo más que el término principal de su error.',
  // integrators-in-practice/the-engine
  // Velocity Verlet and Runge-Kutta # agree with the engine, which gave +# % and #×#⁻⁷ % over the same three periods, to a fraction of a percent: the same arithmetic. Symplectic Euler’s number is a different matter, and the next question is about why.
  '1txm4t5':
    'El Verlet de velocidad y el Runge-Kutta 4 coinciden con el motor, que dio +0,002299 % y −1,217×10⁻⁷ % en esos mismos tres períodos, con una diferencia de una fracción de un por ciento: la misma aritmética. El número del Euler simpléctico es otra cuestión, y la siguiente pregunta trata de por qué.',
  // integrators-in-practice/the-engine
  // Set steps to #, keep the periods at #, and read velocity Verlet, Runge-Kutta # and symplectic Euler.
  '1nsqzeh':
    'Pon los pasos en 438, deja los períodos en 3, y lee el Verlet de velocidad, el Runge-Kutta 4 y el Euler simpléctico.',
  // extending-an-experiment/the-fit
  // The edge is at # of the stars’ separation, good to #, a fraction of the gap of about a tenth that the trials leave open. Twelve of the twenty stayed, and the extension to two hundred thousand gives nearly the same fraction, #, but with an uncertainty of #.
  f2bu1g:
    'El borde está en 0,255 de la separación de las estrellas, con una precisión de 0,024, una fracción del hueco de cerca de una décima que dejan abierto los ensayos. Doce de los veinte se quedaron, y la extensión a doscientos mil da casi la misma fracción, 0,596, pero con una incertidumbre de 0,076.',
  // extending-an-experiment/the-fit
  // Check the settings (slope #, # planets, cutoff #) and read the edge, its uncertainty, and the two fractions from the page.
  '1tn0z84':
    'Comprueba los ajustes (pendiente 1, 200.000 planetas, umbral 3) y lee de la página el borde, su incertidumbre y las dos fracciones.',
  // extending-an-experiment/a-uniform-population
  // A uniform population at the same edge would have # bound, not #: the twenty drawn happened to put more planets near the star than a uniform draw does on average.
  '1bvejml':
    'Una población uniforme con el mismo borde tendría una fracción ligada de 0,451, no de 0,6: los veinte sorteados pusieron por casualidad más planetas cerca de la estrella de lo que pone, de media, un sorteo uniforme.',
  // extending-an-experiment/a-uniform-population
  // Set the slope to #, keep the other two settings, run, read the fraction in the synthetic population, and subtract it from #.
  '1c2hu9f':
    'Pon la pendiente en 0, deja los otros dos ajustes, ejecuta, lee la fracción en la población sintética y réstala de 0,6.',
  // extending-an-experiment/move-the-definition-yours
  // Those are the numbers for cutoffs #, # and #. You chose #: set the cutoff to # on the compute page and run again.
  '13k3ro0':
    'Esos son los números de los umbrales 4, 6 y 10. Has elegido {3}: pon el umbral en {4} en la página de cálculo y ejecuta de nuevo.',
  // extending-an-experiment/move-the-definition-yours
  // Set the slope to # and the cutoff to #, keep # planets, run, and read the half-way distance and the fraction in the synthetic population.
  kd52y:
    'Pon la pendiente en 1 y el umbral en {1}, deja 200.000 planetas, ejecuta, y lee la distancia a medio camino y la fracción en la población sintética.',
  // extending-an-experiment/move-the-definition-yours
  // Those are the numbers for cutoff #. You chose #: set the cutoff to # on the compute page and run again.
  '1qb6ltw':
    'Esos son los números del umbral {0}. Has elegido {1}: pon el umbral en {2} en la página de cálculo y ejecuta de nuevo.',
  // extending-an-experiment/which-trial-moved
  // That is the answer for cutoffs # and #, not # and #. Compare the bound column of the tables for the two cutoffs you chose.
  '1un7dep':
    'Esa es la respuesta para los umbrales {0} y {1}, no para {2} y {3}. Compara la columna de ensayos ligados de las tablas de los dos umbrales que has elegido.',
  // extending-an-experiment/which-trial-moved
  // The bound counts do differ between cutoffs # and #. Compare the bound trials column of the two tables bin by bin, count how many trials change class, and give the center of the bin nearest the star where they differ.
  '6wg8aj':
    'Los recuentos de ligados sí difieren entre los umbrales {0} y {1}. Compara la columna de ensayos ligados de las dos tablas, tramo a tramo, cuenta cuántos ensayos cambian de clase y da el centro del tramo más cercano a la estrella en el que difieren.',
  // extending-an-experiment/which-trial-moved
  // Two trials change class: the ones that started at # and #, in the bins centered on # and #. Each has a mean distance between # and # of its starting distance. An outcome is a definition, and the uncertainty of the extension does not include the choice of it.
  '1npiil':
    'Dos ensayos cambian de clase: los que empezaron en {0} y {1}, en los tramos centrados en {2} y {3}. Cada uno tiene una distancia media de entre {4} y {5} veces su distancia inicial. Un resultado es una definición, y la incertidumbre de la extensión no incluye la elección de esa definición.',
  // extending-an-experiment/which-trial-moved
  // One trial changes class: the one that started at #, in the bin centered on #. Its mean distance is more than # and less than # of its starting distance, so it is unbound at the smaller cutoff and bound at the larger. One reclassification is enough to move the edge: an outcome is a definition, and the uncertainty of the extension does not include the choice of it.
  '1l5zb8d':
    'Un ensayo cambia de clase: el que empezó en {0}, en el tramo centrado en {1}. Su distancia media es de más de {2} y de menos de {3} veces su distancia inicial, así que no está ligado con el umbral menor y sí con el mayor. Una sola reclasificación basta para mover el borde: un resultado es una definición, y la incertidumbre de la extensión no incluye la elección de esa definición.',
  // extending-an-experiment/which-trial-moved
  // No bound count differs between cutoffs # and #. If the tables agree in every bin, enter # and write none.
  '17f320k':
    'Ningún recuento de ligados difiere entre los umbrales {0} y {1}. Si las tablas coinciden en todos los tramos, introduce 0 y escribe «ninguno».',
  // extending-an-experiment/which-trial-moved
  // No trial changes class between cutoffs # and #: none has a mean distance between # and # of its starting distances, so the two tables agree in every bin.
  p4g4ro:
    'Ningún ensayo cambia de clase entre los umbrales {0} y {1}: ninguno tiene una distancia media de entre {2} y {3} veces su distancia inicial, así que las dos tablas coinciden en todos los tramos.',
  // two-periodograms/the-two-periods
  // The box search finds # days, the planet’s period. The Lomb-Scargle peak is at # days, # of that: very nearly half.
  '1fyj62f':
    'La búsqueda de caja encuentra 3,524 días, el período del planeta. El pico de Lomb-Scargle está en 1,769 días, 0,502 de eso: casi exactamente la mitad.',
  // two-periodograms/the-two-periods
  // Run the notebook with its settings at # and #, and read the two best periods and their ratio from the table of numbers it returns.
  '1ohnozj':
    'Ejecuta el cuaderno con sus ajustes en 15 y 6, y lee de la tabla de números que devuelve los dos mejores períodos y su cociente.',
  // two-periodograms/the-box-with-your-limit
  // Your best box is # hours long and your limit was #: the search could not try a longer box, so it is at the edge of the range. Enter #.
  '1s8a5i1':
    'Tu mejor caja dura {0} horas y tu límite era {1}: la búsqueda no pudo probar una caja más larga, así que está en el borde del intervalo. Introduce 1.',
  // two-periodograms/the-box-with-your-limit
  // Set Longest box duration tried to #, run, and read the box duration, the box depth and its signal-to-noise ratio from the table of numbers. They are rows of the table, in hours and in parts per million.
  pfoabi:
    'Pon Duración de caja más larga probada en {0}, ejecuta, y lee de la tabla de números la duración de la caja, su profundidad y su relación señal-ruido. Son filas de la tabla, en horas y en partes por millón.',
  // two-periodograms/the-box-with-your-limit
  // With the limit at # hours the best box is # hours long: the limit itself. The search could not try a longer box, so what it reports is the longest box it was allowed, and a longer one might fit better. A box that is too short covers only the deepest part of the transit, so its depth is greater (# ppm) but it rests on fewer points, and its signal-to-noise ratio (#) is the lowest of the menu.
  '1nxdkxs':
    'Con el límite en 2 horas, la mejor caja dura 2,0 horas: el propio límite. La búsqueda no pudo probar una caja más larga, así que lo que informa es la caja más larga que se le permitió, y una más larga podría ajustar mejor. Una caja demasiado corta cubre solo la parte más profunda del tránsito, así que su profundidad es mayor (15.244 ppm) pero se apoya en menos puntos, y su relación señal-ruido (103,7) es la más baja del menú.',
  // two-periodograms/the-box-with-your-limit
  // Those are the numbers of limit #. You chose #: set Longest box duration tried to # on the compute page and run again.
  aug6cz:
    'Esos son los números del límite {0}. Has elegido {1}: pon Duración de caja más larga probada en {2} en la página de cálculo y ejecuta de nuevo.',
  // two-periodograms/the-box-with-your-limit
  // Choose the longest box duration you allowed from the menu first: what is right depends on it.
  e0feow:
    'Elige primero en el menú la duración máxima de caja que permitiste: lo correcto depende de ella.',
  // two-periodograms/the-box-with-your-limit
  // With the limit at # hours the best box is # hours long, inside the range: the search had room for a longer box and did not choose one. That duration is # to # hours whichever limit you allow, a little different each time because the search refines its durations on a grid of # values from # hour to the limit. The box is an average of the real transit, which has sloped ingress and egress and a limb-darkened floor.
  '1fg2dxl':
    'Con el límite en {0} horas, la mejor caja dura {1} horas, dentro del intervalo: la búsqueda tenía espacio para una caja más larga y no la eligió. Esa duración es de 2,5 a 2,7 horas con cualquier límite que permitas, algo distinta cada vez porque la búsqueda afina sus duraciones en una rejilla de 21 valores desde 1 hora hasta el límite. La caja es un promedio del tránsito real, que tiene una entrada y una salida inclinadas y un fondo con oscurecimiento del limbo.',
  // two-periodograms/the-box-with-your-limit
  // Your best box is # hours long and your limit was #: it is shorter than the limit, so the search had room for a longer box and did not choose one. Enter #.
  g2xoap:
    'Tu mejor caja dura {0} horas y tu límite era {1}: es más corta que el límite, así que la búsqueda tenía espacio para una caja más larga y no la eligió. Introduce 0.',
  // two-periodograms/the-box-with-your-limit
  // Those are the numbers of limits # and #. You chose #: set Longest box duration tried to # on the compute page and run again.
  '1q3fsrm':
    'Esos son los números de los límites 4 y 6. Has elegido {2}: pon Duración de caja más larga probada en {3} en la página de cálculo y ejecuta de nuevo.',
  // two-periodograms/separation-from-your-period
  // The separation is about # of the larger uncertainties, well beyond three: the difference survives the correction. Enter #.
  n41gz5:
    'La separación es de unas {0} de las incertidumbres mayores, muy por encima de tres: la diferencia sobrevive a la corrección. Introduce 1.',
  // two-periodograms/separation-from-your-period
  // Read the box least squares period from the table of your latest run: it is a little under # days at every setting the menu allows.
  '108uw4k':
    'Lee el período de mínimos cuadrados de caja de la tabla de tu última ejecución: es algo menos de 3,5241 días con cualquier ajuste que permite el menú.',
  // two-periodograms/separation-from-your-period
  // Subtract your period from #, and divide by #, the fit’s uncertainty.
  '1mbdaga':
    'Resta tu período de 3,52454 y divide entre 0,00003, la incertidumbre del ajuste.',
  // two-periodograms/separation-from-your-period
  // Make the uncertainty # times larger, which makes the separation # times smaller: divide your first separation by #.
  nqlbm8:
    'Haz la incertidumbre 1,7 veces mayor, lo que hace la separación 1,7 veces menor: divide tu primera separación entre 1,7.',
  // two-periodograms/separation-from-your-period
  // Correlated noise makes the real uncertainty larger, so the same separation is fewer of them: divide by #, not multiply.
  fkcf00:
    'El ruido correlacionado hace mayor la incertidumbre real, así que la misma separación equivale a menos de ellas: divide entre 1,7, no multipliques.',
  // two-periodograms/separation-from-your-period
  // Your box period is # of the fit's uncertainties from the fitted one, about # with the panel's correlated-noise factor, so the difference survives it. That is not a mistake of the box search: its period is the best point of a grid of boxes, and it was never a number with an error bar of #.
  '1pi8gjg':
    'Tu período de caja se aparta del período ajustado en {0} incertidumbres del ajuste, unas {1} con el factor de ruido correlacionado del panel, así que la diferencia lo supera. No es un error de la búsqueda de caja: su período es el mejor punto de una rejilla de cajas, y nunca fue un número con una barra de error de 0,00003.',
  // sampling-a-posterior/the-draws-at-your-ratio
  // With a/R* held at #, Rp/R* is # with a # percent interval # wide: as narrow as with the fit panel’s own value. But the median is # from the panel’s #, # times the interval’s half-width and # of the panel’s uncertainties: a narrow interval around a different value. The width comes from the data once a/R* is held; where the interval sits comes from the value you held.
  '1w5tg5g':
    'Con a/R* fijado en {0}, Rp/R* es {1}, con un intervalo del 68 por ciento de {3} de anchura: tan estrecho como con el valor propio del panel de ajuste. Pero la mediana está a {4} del 0,1193 del panel, {6} veces la semianchura del intervalo y {7} de las incertidumbres del panel: un intervalo estrecho alrededor de otro valor. La anchura viene de los datos una vez fijado a/R*; dónde se sitúa el intervalo viene del valor que fijaste.',
  // sampling-a-posterior/the-draws-at-your-ratio
  // Set a/R* to # on the compute page, run the notebook, and read each median from the Value column, and subtract the low end of its interval from the high end for its width.
  tg8fmw:
    'Pon a/R* en {0} en la página de cálculo, ejecuta el cuaderno, lee cada mediana de la columna Valor y resta el extremo inferior de su intervalo del superior para obtener su anchura.',
  // sampling-a-posterior/the-draws-at-your-ratio
  // The medians are right for your choice. Read each interval’s two ends from the table and subtract the low end from the high end for its width.
  '5f6znp':
    'Las medianas son correctas para tu elección. Lee de la tabla los dos extremos de cada intervalo y resta el extremo inferior del superior para obtener su anchura.',
  // sampling-a-posterior/the-draws-at-your-ratio
  // Those are the medians of the run with a/R* #. You chose #: set a/R* to # on the compute page and run again.
  '9kdzb8':
    'Esas son las medianas de la ejecución con a/R* {0}. Has elegido {1}: pon a/R* en {2} en la página de cálculo y ejecuta de nuevo.',
  // sampling-a-posterior/the-draws-at-your-ratio
  // Choose the a/R* you held from the menu first: what is right depends on it.
  '2d81yy':
    'Elige primero en el menú el a/R* que fijaste: lo correcto depende de él.',
  // sampling-a-posterior/the-draws-at-your-ratio
  // a/R* # is the value the fit panel found, so Rp/R* comes out where the panel put it, #, with an interval # wide, plus or minus #. That is about twelve times narrower than the panel’s #, which you will account for below.
  '15ja8qs':
    'a/R* 9,21 es el valor que encontró el panel de ajuste, así que Rp/R* sale donde lo puso el panel, 0,1193, con un intervalo de 0,00026 de anchura, más o menos 0,00013. Eso es unas doce veces más estrecho que el 0,0016 del panel, lo cual explicarás más abajo.',
  // sampling-a-posterior/did-it-converge
  // R-hat is just above #, there are thousands of effective samples out of # draws, and about # percent of proposals were accepted. Those are the three things a reader checks before quoting an interval from a chain, and the notebook checks them itself.
  '1dgr5zn':
    'R-hat está justo por encima de 1, hay miles de muestras efectivas de 128.000 extracciones, y se aceptó cerca del 72 por ciento de las propuestas. Son las tres cosas que un lector comprueba antes de citar un intervalo de una cadena, y el cuaderno las comprueba él mismo.',
  // sampling-a-posterior/did-it-converge
  // Read the largest R-hat, the smallest effective sample size and the acceptance fraction from the table of numbers. R-hat is a little above #, and the sample size is in the thousands.
  drzkh6:
    'Lee de la tabla de números el mayor R-hat, el menor tamaño de muestra efectivo y la fracción de aceptación. R-hat está algo por encima de 1, y el tamaño de muestra es de miles.',
  // refitting-a-transit/the-fit
  // The period is # days and Rp/R* is #, the numbers the fit panel finds for the same light curve to a few thousandths of an error bar. The reduced chi-square is #: the points scatter about # times their error bars about this model.
  r49tqs:
    'El período es de 3,52454 días y Rp/R* es 0,11926, los números que encuentra el panel de ajuste para la misma curva de luz con una diferencia de unas milésimas de una barra de error. El chi cuadrado reducido es 7,98: los puntos se dispersan unas 2,8 veces sus barras de error en torno a este modelo.',
  // refitting-a-transit/the-fit
  // Run the notebook with its setting at #, and read the period, Rp/R*, a/R*, the impact parameter and the reduced chi-square from the table of numbers it returns.
  oc8eto:
    'Ejecuta el cuaderno con su ajuste en 1, y lee el período, Rp/R*, a/R*, el parámetro de impacto y el chi cuadrado reducido de la tabla de números que devuelve.',
  // refitting-a-transit/sigma-and-profile
  // Rp/R* is # with a sigma of # and a profile interval from # to #, which is narrower than plus or minus one sigma. The impact parameter’s profile runs # below its best value, #, and only # above it.
  zzo7nb:
    'Rp/R* es 0,1193 con un sigma de 0,0016 y un intervalo de perfil de 0,1180 a 0,1204, que es más estrecho que más o menos un sigma. El perfil del parámetro de impacto llega 0,062 por debajo de su mejor valor, 0,430, y solo 0,046 por encima.',
  // refitting-a-transit/sigma-and-profile
  // Read Rp/R*’s sigma from the Uncertainty column, and the ends of the two profile intervals from the rows labeled with their profile interval.
  '187p28u':
    'Lee el sigma de Rp/R* de la columna Incertidumbre, y los extremos de los dos intervalos de perfil de las filas rotuladas con su intervalo de perfil.',
  // refitting-a-transit/shift-from-your-fit
  // Holding the limb darkening cut Rp/R*’s sigma from # to #, and moved Rp/R* from # to #: a move of #, about one old sigma (#), which is # of its new sigmas. The smaller error bar does not include the cost of assuming the limb darkening, and the assumption moved the answer by more than the bar.
  '16vn2xf':
    'Fijar el oscurecimiento del limbo redujo el sigma de Rp/R* de 0,0016 a 0,0005, y movió Rp/R* de 0,1193 a 0,1177: un movimiento de 0,0016, de cerca de un sigma antiguo (0,97), que son 3,2 de sus sigmas nuevos. La barra de error menor no incluye el coste de suponer el oscurecimiento del limbo, y la suposición movió la respuesta más que la barra.',
  // refitting-a-transit/shift-from-your-fit
  // Your own value is the one from the run with the setting at #, the limb darkening fitted. Enter that one first, then run with the setting at #.
  aaskj7:
    'Tu propio valor es el de la ejecución con el ajuste en 1, con el oscurecimiento del limbo ajustado. Introduce primero ese, y ejecuta luego con el ajuste en 0.',
  // refitting-a-transit/shift-from-your-fit
  // Set the setting to #, run, read Rp/R* and its sigma, and divide the difference from your own value by the new sigma.
  cplh33:
    'Pon el ajuste en 0, ejecuta, lee Rp/R* y su sigma, y divide la diferencia respecto de tu propio valor entre el nuevo sigma.',
  // refitting-a-transit/shift-from-your-fit
  // The run is right. The shift is the difference between the two values, yours with the limb darkening fitted and the new one, divided by the new sigma. From your own entries your shift should be about #.
  '12q1plr':
    'La ejecución es correcta. El desplazamiento es la diferencia entre los dos valores, el tuyo con el oscurecimiento del limbo ajustado y el nuevo, dividida entre el nuevo sigma. Con tus propias entradas, tu desplazamiento debería ser de unos {0}.',
  // integrators-in-practice/choose-the-second-step
  // Those are the drifts of the baseline run, # steps. You chose #: set steps to # on the compute page and run again.
  '1ihv368':
    'Esas son las derivas de la ejecución de referencia, de 500 pasos. Has elegido {1}: pon los pasos en {2} en la página de cálculo y ejecuta de nuevo.',
  // extending-an-experiment/move-the-definition-yours
  // Those are the numbers of the baseline run, cutoff #. You chose #: set the cutoff to # on the compute page and run again.
  '1h77en5':
    'Esos son los números de la ejecución de referencia, con umbral 3. Has elegido {1}: pon el umbral en {2} en la página de cálculo y ejecuta de nuevo.',
};

/**
 * The Spanish for a computed sentence, or undefined if this catalog has none.
 *
 * @param {string} text - The English sentence a check returned
 * @returns {string|undefined} The Spanish, numbers in Spanish form
 */
export function computingMessage(text) {
  const numbers = [];
  const template =
    COMPUTING_ES[
      templateKey(
        text.replace(NUMBER, found => {
          numbers.push(found);
          return '#';
        })
      )
    ];
  return template?.replace(/\{(\d+)\}/g, (_, i) =>
    (numbers[i] ?? '').replace(/[.,]/g, c => (c === '.' ? ',' : '.'))
  );
}

/**
 * A Spanish lesson whose checks answer in Spanish where this catalog can.
 *
 * Nothing is modified: the lesson and its steps are the memoised ones, shared
 * with the loader, so each step that checks is copied with its check wrapped.
 *
 * @param {object} lesson - The lesson, Spanish words merged over it
 * @returns {object} The lesson, its checks' sentences translated
 */
export function speak(lesson) {
  const wrap = check =>
    function (...args) {
      const verdict = check.apply(this, args);
      const es =
        typeof verdict?.message === 'string' &&
        computingMessage(verdict.message);
      return es ? { ...verdict, message: es } : verdict;
    };
  return {
    ...lesson,
    steps: lesson.steps.map(step =>
      step.validate ? { ...step, validate: wrap(step.validate) } : step
    ),
  };
}
