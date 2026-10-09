// =============================================================================
// Notes for posting a link on Canvas, Moodle and Blackboard
// -----------------------------------------------------------------------------
// What an instructor does on each platform to hand students the link and get a
// PDF back, as steps. They name the platform's own labels exactly as that
// platform shows them ("Assignments" is Canvas's word and Moodle's, quoted, not
// ours), which is why they are here and not in a message catalog the
// terminology check reads. They name a setting rather than where it sits,
// because menus move, and they claim no integration: Gravitas is not an LTI
// tool and a platform only ever holds a link.
//
// Written from the platforms' public documentation and not tested against a
// live course; each note says what to check.
// =============================================================================

export const PLATFORMS = ['canvas', 'moodle', 'blackboard'];

export const NOTES = {
  en: {
    canvas: [
      'Canvas',
      [
        'Create an item under Assignments (or a Page, if you only want to post the link).',
        'In the description, paste the text below and make the link a hyperlink with the editor’s link button.',
        'For Submission Type choose Online, then File Uploads, and restrict file types to pdf.',
        'Students open the link, work, save their lab report as a PDF and upload it.',
        'Download the submissions from SpeedGrader or the assignment’s Download Submissions, and drop the PDFs on the submission review page, which reads the answers out of each one.',
        'To bring scores back, use the Canvas file from the review page under Grades, Import. Try one student first.',
      ],
    ],
    moodle: [
      'Moodle',
      [
        'Add an Assignment activity to the course.',
        'Paste the text below into its description and use the editor’s link button for the address.',
        'Under Submission types choose File submissions, and under Accepted file types choose PDF.',
        'Students open the link, work, save their lab report as a PDF and upload it.',
        'Use Download all submissions, and drop the PDFs on the submission review page.',
        'To bring scores back, use the Moodle file from the review page under Grades, Import, and map each column as the import page asks. Try one student first.',
      ],
    ],
    blackboard: [
      'Blackboard',
      [
        'Create an Assignment under Course Content (or a Document, if you only want to post the link).',
        'Paste the text below into the instructions and make the link a hyperlink.',
        'Allow File Upload as the submission type and ask for a PDF.',
        'Students open the link, work, save their lab report as a PDF and upload it.',
        'Download the submissions from the grade centre or the assignment’s submissions page, and drop the PDFs on the submission review page.',
        'Blackboard has no file here: type or paste the scores from the review page’s summary into its grade centre.',
      ],
    ],
  },
  es: {
    canvas: [
      'Canvas',
      [
        'Cree un elemento en Assignments (“Tareas” en la interfaz en español), o una Página si solo quiere publicar el enlace.',
        'En la descripción, pegue el texto de abajo y convierta el enlace en hipervínculo con el botón de enlace del editor.',
        'En el tipo de entrega elija En línea, luego Cargas de archivos, y limite los tipos de archivo a pdf.',
        'Los estudiantes abren el enlace, trabajan, guardan su informe de laboratorio como PDF y lo suben.',
        'Descargue las entregas desde SpeedGrader o con Descargar entregas, y suelte los PDF en la página de revisión de entregas, que lee las respuestas de cada uno.',
        'Para traer las calificaciones, use el archivo de Canvas de la página de revisión en Calificaciones, Importar. Pruebe primero con un estudiante.',
      ],
    ],
    moodle: [
      'Moodle',
      [
        'Añada una actividad Tarea (Assignment) al curso.',
        'Pegue el texto de abajo en su descripción y use el botón de enlace del editor para la dirección.',
        'En Tipos de entrega elija Archivos enviados, y en Tipos de archivo aceptados elija PDF.',
        'Los estudiantes abren el enlace, trabajan, guardan su informe de laboratorio como PDF y lo suben.',
        'Use Descargar todas las entregas y suelte los PDF en la página de revisión de entregas.',
        'Para traer las calificaciones, use el archivo de Moodle de la página de revisión en Calificaciones, Importar, y asigne cada columna como pide la página de importación. Pruebe primero con un estudiante.',
      ],
    ],
    blackboard: [
      'Blackboard',
      [
        'Cree una Tarea (Assignment) en Contenido del curso, o un Documento si solo quiere publicar el enlace.',
        'Pegue el texto de abajo en las instrucciones y convierta el enlace en hipervínculo.',
        'Permita la carga de archivos como tipo de entrega y pida un PDF.',
        'Los estudiantes abren el enlace, trabajan, guardan su informe de laboratorio como PDF y lo suben.',
        'Descargue las entregas desde el centro de calificaciones o desde la página de entregas, y suelte los PDF en la página de revisión de entregas.',
        'Blackboard no tiene archivo aquí: escriba o pegue las calificaciones del resumen de la página de revisión en su centro de calificaciones.',
      ],
    ],
  },
};
