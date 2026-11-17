// What the canvas behind a lesson is for: the pure half. A lesson or a step
// says `canvas: 'scene' | 'portrait' | 'quiet'`; none stated is today.
//   scene     the step's own setup, stage or bind
//   portrait  a scenario or staged object that is the lesson's subject, held
//             still and called a picture: `picture: 'Jupiter and Io'`
//   quiet     nothing staged
// A declaration holds until the next one, then the lesson's own is the default.
// js/lessonCanvas.js is the half that touches the page.

export const CANVAS = Object.freeze(['scene', 'portrait', 'quiet']);

/**
 * The canvas in force at a step.
 * @param {object} inv - The lesson
 * @param {number} i - Step index
 * @returns {?{kind: string, picture: string, at: number}} Null when none is stated
 */
export function canvasAt(inv, i) {
  const steps = inv?.steps || [];
  for (let j = Math.min(i, steps.length - 1); j >= 0; j--) {
    const s = steps[j];
    if (s?.canvas) return { kind: s.canvas, picture: s.picture || '', at: j };
  }
  return inv?.canvas
    ? { kind: inv.canvas, picture: inv.picture || '', at: -1 }
    : null;
}

/** The distinct kinds a lesson uses, sorted. */
export const canvasKinds = inv =>
  [
    ...new Set(
      (inv?.steps || []).map((_, i) => canvasAt(inv, i)?.kind).filter(Boolean)
    ),
  ].sort();

/**
 * What is wrong with a lesson's canvas declarations.
 * @param {object} inv - The lesson
 * @returns {Array<string>} One sentence per problem
 */
export function canvasProblems(inv) {
  const out = [];
  const steps = inv?.steps || [];
  const named = (s, i) => s?.sid || `step ${i + 1}`;
  if (inv?.canvas && !CANVAS.includes(inv.canvas))
    out.push(`canvas "${inv.canvas}" is not one of ${CANVAS.join(', ')}`);
  let setup = false;
  steps.forEach((s, i) => {
    setup ||= Boolean(s.setup);
    if (s.canvas && !CANVAS.includes(s.canvas))
      out.push(
        `${named(s, i)}: canvas "${s.canvas}" is not one of ${CANVAS.join(', ')}`
      );
    const c = canvasAt(inv, i);
    if (!c || !CANVAS.includes(c.kind)) return;
    if (c.kind === 'quiet') {
      if (s.stage || s.bind || s.setup)
        out.push(
          `${named(s, i)}: a quiet canvas stages nothing, so the step may not declare a stage, bind or setup`
        );
      return;
    }
    if (!(s.stage || s.bind || setup))
      out.push(
        `${named(s, i)}: a ${c.kind} canvas needs a stage, bind or setup in force`
      );
    if (c.kind === 'portrait' && !c.picture)
      out.push(
        `${named(s, i)}: a portrait needs \`picture\`, what the picture shows`
      );
  });
  return out;
}
