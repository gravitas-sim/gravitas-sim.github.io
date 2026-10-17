# Declaración de protección de datos

[English](DATA_PROTECTION.md)

**Borrador del proyecto, fechado el 17 de octubre de 2026.** Esta traducción la hizo el propio proyecto y no la ha revisado ninguna persona externa ni ningún servicio jurídico. Si difiere de la versión en inglés, prevalece la versión en inglés.

Para la oficina de informática, de privacidad o de accesibilidad de una institución. Esto es lo que Gravitas guarda, lo que nunca envía, lo que quien lo usa puede decidir enviar, lo que recibe un docente, cuánto tiempo se conserva algo y a quién preguntar. Describe el software tal como se publicó (2.0.0); es una descripción del diseño, no un dictamen jurídico ni un contrato, y no afirma cumplir ninguna ley en particular. Cada afirmación se comprueba contra el código donde una prueba puede hacerlo, y donde no puede, lo dice.

## En un párrafo

Gravitas es un sitio web estático. No hay un servidor que el proyecto opere, ni base de datos, ni cuentas, ni inicio de sesión, ni analítica, ni publicidad. Todo lo que hace una persona estudiante queda en el navegador que usa, en el almacenamiento propio de ese navegador. Solo reciben algo quienes reciben de la persona estudiante un archivo o un código.

## Qué se guarda y dónde

Todo está en el navegador de quien lee (almacenamiento local, almacenamiento de sesión, IndexedDB y la caché del service worker). [STORAGE.md](STORAGE.md) es el inventario, clave por clave (está en inglés), y `tests/storageInventory.test.js` falla cuando el código nombra una clave que esa página no menciona. Por grupos:

| Grupo | Qué contiene | ¿Datos personales? |
|---|---|---|
| El trabajo de la persona estudiante | El progreso y las respuestas de cada investigación y tarea, el cuaderno de evidencia, los experimentos guardados, el mundo guardado del simulador, los escenarios creados y los borradores de las herramientas de autoría | Su propio texto y sus números. Puede incluir lo que escriba. |
| El nombre | El nombre que se escribe para que un informe o una entrega lo lleve (`gravitas_student_name`) y las notas del docente en la página Enseñar | Sí, si se escribe un nombre real. El nombre es opcional para explorar y solo se pide al crear un informe o una entrega. |
| Preferencias | Idioma, tema, unidades, nivel del curso, qué paneles están abiertos, que se vio la bienvenida | No |
| El estado propio de la aplicación | La caché de archivos del sitio del service worker, las extensiones del catálogo instaladas, las respuestas de archivo en caché y la versión de cada capacidad cargada | No |
| La sesión de un docente | La clave de descifrado de los materiales del docente, en el almacenamiento de sesión, solo durante esa sesión del navegador | La clave se deriva de una contraseña que escribe el docente y no se escribe en ningún otro lugar. |

La aplicación no cifra nada de este almacenamiento (se aplican las protecciones del navegador), de modo que en un equipo compartido vale el consejo habitual: usar una ventana privada o borrar los datos del sitio al terminar.

## Qué nunca se envía

El proyecto no tiene un servidor al que enviarlo. En concreto, la aplicación no transmite a ningún lugar ninguna respuesta de investigación, nombre, registro de progreso, entrada del cuaderno, mundo guardado, preferencia ni evento de uso. No hay servicio de analítica ni de informes de errores, ni cookies, ni píxeles de seguimiento, ni tipografías o scripts de terceros cargados desde otro sitio (las tipografías y las bibliotecas de gráficos y de 3-D se sirven con el sitio), ni publicidad. El service worker solo guarda en caché los archivos del propio sitio.

Un enlace compartido lleva su contenido en la parte de la dirección posterior a `#`, que el navegador no envía a ningún servidor. Quien reciba el enlace puede leer lo que contiene, así que un enlace es tan privado como la persona a quien se da.

El alojamiento es el habitual: GitHub Pages sirve los archivos y, como cualquier alojamiento web, puede ver que una dirección pidió una página en un momento dado. El proyecto no opera ningún servidor y no recibe registros.

## Qué puede decidir enviar quien lee

Dos funciones contactan con otro sitio, y solo cuando se pulsa el control que lo dice:

1. **La importación de archivo del Observatorio** («buscar las épocas Gaia de una estrella en el CDS (en vivo, opcional)»). Al pulsar Buscar, el nombre escrito y después la posición que devuelve el servicio van al Centre de Données astronomiques de Strasbourg (los servicios Sesame y VizieR) y a nadie más. Véase [ARCHIVE_IMPORT.md](ARCHIVE_IMPORT.md). Ninguna investigación la usa. La respuesta se guarda en caché en el navegador.
2. **La página de cómputo** (`/compute/`, una función de enseñanza avanzada). La página dice que requiere conexión y es opcional, y no carga nada hasta pulsar «Iniciar el entorno»: entonces descarga el entorno de Python de su red de distribución de contenido y enmarca una página del origen separado `gravitas-compute.github.io`, que se ejecuta en un entorno aislado sin acceso al almacenamiento de quien lee ni a la página. Los datos se procesan en el navegador y no se envían a ninguno de los dos sitios como parte del cuaderno. Véase [COMPUTE.md](COMPUTE.md). Ambos sitios ven una solicitud normal.

Seguir un enlace fuera del sitio (por ejemplo, a un servicio de cuadernos o a una referencia) sale de Gravitas, y lo que recoja ese sitio es asunto de ese sitio.

Exportar es siempre una acción explícita y siempre un archivo que conserva la persona estudiante: un archivo de progreso, una copia de seguridad de Mi trabajo, el informe de laboratorio (PDF o página web), el informe de evidencia, un CSV de una serie.

## Qué recibe un docente

Solo lo que una persona estudiante le entrega. Puede entregar el informe de laboratorio (un PDF o una página web), el código de entrega (texto) y un archivo de progreso. El informe lleva el nombre si se escribió uno, las respuestas, cuántos intentos requirió cada una, qué pasos se alcanzaron y un código de finalización que hace visible una edición casual; no prueba la autoría. El portal del docente lee esos archivos en el navegador del propio docente. Un docente no puede ver el resto del trabajo de la persona estudiante, y Gravitas no le da lista de estudiantes, ni panel de actividad, ni modo de mirar el navegador de nadie.

Una institución que reúne esos archivos, por un sistema de gestión del aprendizaje o por correo, los conserva bajo sus propias políticas. Gravitas no participa en ese tratamiento.

Los materiales del docente (claves de respuestas y guías) se publican cifrados. El docente escribe una contraseña en el navegador para leerlos; nada de eso se envía a ninguna parte. Véase [SECURITY.md](SECURITY.md).

## Qué recibe un investigador

Nada. No se ha hecho ningún estudio con este software, no se han recogido datos de ninguna persona usuaria y no ha habido revisión ética ni institucional ([LEARNING_STUDY.md](LEARNING_STUDY.md) es un diseño, no un resultado). Los instrumentos del kit de evidencia de aula son formularios que un docente puede usar y conservar en su propio curso; el kit no envía nada al proyecto.

## Conservación y borrado

El proyecto no conserva ninguna copia de nada, así que no tiene nada que retener ni borrar en nombre de una persona estudiante. Lo que está en un navegador permanece hasta que quien lee lo borra. Mi trabajo enumera lo guardado y permite exportarlo como archivo y borrarlo, elemento por elemento o todo (pide antes una copia descargada); borrar los datos del sitio en el navegador elimina todo, incluida la caché del service worker. Un archivo exportado o entregado lo tiene quien lo tenga.

## Menores

El sitio no pregunta la edad y no tiene cuentas. Está escrito para cursos universitarios y de bachillerato. Una institución que lo ofrezca a menores decide, según sus propias normas, si una persona estudiante debe escribir un nombre real en un informe.

## Accesibilidad de esta declaración

La declaración es texto plano en una página web y en el repositorio. El informe de accesibilidad acotado es [ACCESSIBILITY_CONFORMANCE.md](ACCESSIBILITY_CONFORMANCE.md) (en inglés).

## Preguntas y cambios

Escriba al responsable del proyecto, Carl Ziegler, a <Carl.Ziegler@sfasu.edu>. Un informe de seguridad debe seguir [SECURITY.md](SECURITY.md). Si una versión añade algo que guarde más o envíe algo, esta declaración cambia en la misma versión y el cambio se anota en [CHANGELOG.md](CHANGELOG.md).
