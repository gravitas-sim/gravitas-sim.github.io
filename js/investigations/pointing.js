// A step can point at one object of the scene (`point: role`): a dashed ring
// and a name drawn round it on the main canvas, the object's chip focused and
// its name announced once. It names an object, never a value, and ends with
// the step. Drawn through js/overlays.js, so js/render.js does not grow.

import { registerOverlay } from '../overlays.js';
import { registerMessages, t } from '../i18n/index.js';
import { EN_LINKED } from '../i18n/en.linked.js';
import { ES_LINKED } from '../i18n/es.linked.js';
import { world_to_screen } from '../physics.js';

registerMessages('en', EN_LINKED);
registerMessages('es', ES_LINKED);

let remove = null;

/** Take the ring off the canvas; the next frame the scene draws is without it. */
export function stop() {
  remove?.();
  remove = null;
}

/**
 * @param {string} role - The lesson's name for the object
 * @param {{roleBody: Function, announce: Function, objects: ?Element}} host -
 *   roleBody(role) is its body; objects holds its chips
 */
export function start(role, host) {
  stop();
  let said = false;
  let focused = false;
  remove = registerOverlay(ctx => {
    const body = host.roleBody(role);
    if (!body?.pos) return;
    const name = String(body.name || role);
    if (!said) {
      said = true;
      host.announce(t('inv.point.announce', { name }));
    }
    if (!focused) {
      const chip = host.objects?.querySelector(`[data-object-id="${body.id}"]`);
      if (chip) {
        chip.focus({ preventScroll: true });
        focused = true;
      }
    }
    const canvas = ctx.canvas;
    const d = canvas.width / (canvas.clientWidth || canvas.width);
    const at = world_to_screen(body.pos);
    const r = 20 * d;
    ctx.save();
    ctx.lineWidth = 2 * d;
    ctx.setLineDash([6 * d, 4 * d]);
    // A dark ring under a light one reads on a bright star and a dark sky.
    for (const [color, extra] of [
      ['rgba(0, 0, 0, 0.7)', 2 * d],
      ['#ffffff', 0],
    ]) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2 * d + extra;
      ctx.beginPath();
      ctx.arc(at.x, at.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    const words = t('inv.point.label', { name });
    ctx.font = `600 ${13 * d}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const w = ctx.measureText(words).width + 10 * d;
    const y = at.y - r - 4 * d;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(at.x - w / 2, y - 18 * d, w, 20 * d);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(words, at.x, y);
    ctx.restore();
  });
}
