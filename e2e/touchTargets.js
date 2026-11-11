// =============================================================================
// Pointer-target measurement (Prompt 283)
// -----------------------------------------------------------------------------
// One function, run in the page, that measures every control a finger can
// press against WCAG 2.2's Target Size (Minimum), 2.5.8, as the design system
// states it (DESIGN_SYSTEM.md, "Touch measurement"):
//
//   size       a target is at least 24 x 24 CSS px (a slider is judged by its
//              height: its thumb is the target and the browser draws it);
//   spacing    a smaller target passes if a 24 px circle centred on it meets
//              no other target (a target of 24 px or more) and no other
//              undersized target's circle;
//   inline     a link in a sentence of other words is exempt (not enlarged);
//   control    a control the browser draws and the page cannot resize is
//              exempt (a file picker, a colour well).
//
// Each target is reported as 'ok', 'spacing', 'inline', 'control' or 'fail'.
// `under44` counts the targets that are not inline and are under 44 x 44, the
// touch size of the controls the layout spec holds (e2e/responsiveLayout.spec.js).
// Nothing here imports the application.
// =============================================================================

export function measureTargets() {
  const SELECTOR =
    'a[href], button, input:not([type=hidden]), select, textarea, summary, ' +
    '[role=button], [role=link], [role=tab], [role=menuitem], ' +
    '[role=checkbox], [role=radio], [role=switch], [role=slider], ' +
    '[role=option], [tabindex]:not([tabindex="-1"])';
  const MIN = 23.5;
  const sig = el =>
    `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${
      el.classList.length ? '.' + el.classList[0] : ''
    }`;

  const all = [...document.querySelectorAll(SELECTOR)].filter(el => {
    if (el.disabled || el.closest('[inert], [hidden], [aria-hidden=true]'))
      return false;
    if (
      !el.checkVisibility({ visibilityProperty: true, opacityProperty: true })
    )
      return false;
    // A scroll region is reached by keyboard, not pressed: not a target.
    if (
      el.matches('[tabindex]') &&
      !el.matches(':is(a, button, input, select, textarea, summary, [role])')
    )
      return false;
    const r = el.getBoundingClientRect();
    // Visually hidden (clipped to a pixel) or parked off the page.
    return r.width > 1 && r.height > 1 && r.right > 0 && r.bottom > -1e6;
  });
  // The control a label presses is the label's own target; count the pair once.
  const targets = all.filter(
    el =>
      !(
        el.matches('input') &&
        el.closest('label') &&
        all.includes(el.closest('label'))
      )
  );
  const rects = new Map(targets.map(el => [el, el.getBoundingClientRect()]));

  const small = el => {
    const r = rects.get(el);
    if (el.matches('input[type=range]')) return r.height < MIN;
    return r.width < MIN || r.height < MIN;
  };

  const inline = el => {
    const p = el.parentElement;
    if (!p || !el.matches('a, [role=link]')) return false;
    const ds = getComputedStyle(p).display;
    if (ds === 'flex' || ds === 'grid' || ds === 'inline-flex') return false;
    const copy = p.cloneNode(true);
    copy.querySelectorAll(SELECTOR).forEach(n => n.remove());
    return (copy.textContent.match(/[\p{L}\p{N}]/gu) || []).length >= 8;
  };

  const userAgent = el =>
    el.matches(
      'input[type=file], input[type=color], input[type=date], input[type=time]'
    );

  // A link that wraps has one box per line; its bounding box spans the gap.
  const parts = el =>
    [...el.getClientRects()].filter(r => r.width > 1 && r.height > 1);
  const circleHitsRect = (c, r) => {
    const x = Math.max(r.left, Math.min(c.x, r.right));
    const y = Math.max(r.top, Math.min(c.y, r.bottom));
    return Math.hypot(c.x - x, c.y - y) < 12;
  };
  const centre = r => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  // The page's own coordinates: a target below the fold still has a position.
  const related = (a, b) =>
    a.contains(b) ||
    b.contains(a) ||
    (a.labels && [...a.labels].includes(b)) ||
    (b.labels && [...b.labels].includes(a));

  const out = {
    measured: targets.length,
    fail: [],
    spacing: 0,
    inline: 0,
    control: 0,
    ok: 0,
    under44: 0,
  };
  for (const el of targets) {
    const r = rects.get(el);
    const isSmall = small(el);
    if (!isSmall) {
      out.ok++;
    } else if (userAgent(el)) {
      out.control++;
    } else if (inline(el)) {
      out.inline++;
    } else {
      const c = centre(r);
      const clash = targets.some(o => {
        if (o === el || related(el, o)) return false;
        if (small(o)) {
          const oc = centre(rects.get(o));
          return Math.hypot(c.x - oc.x, c.y - oc.y) < 24;
        }
        return parts(o).some(pr => circleHitsRect(c, pr));
      });
      if (clash) {
        out.fail.push(
          `${sig(el)} ${Math.round(r.width)}x${Math.round(r.height)} ${el.textContent.trim().slice(0, 40)}`
        );
      } else {
        out.spacing++;
      }
    }
    if (
      !inline(el) &&
      !userAgent(el) &&
      (r.height < 43.5 || (r.width < 43.5 && !el.matches('input[type=range]')))
    )
      out.under44++;
  }
  return out;
}
