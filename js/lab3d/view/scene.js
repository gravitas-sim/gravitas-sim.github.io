// =============================================================================
// The 3-D lab's picture: three.js, drawing what the frame says and no more
// -----------------------------------------------------------------------------
// Everything here is drawn from display positions the page has already put in
// the chosen frame (./frames.js): bodies, trails, the reference plane, drop
// lines, velocity arrows and the measuring instruments. Nothing is computed
// from the picture, so nothing a reader measures depends on the GPU, and the
// page works without WebGL at all (the tables are the lab).
//
// What can be mistaken for scale is stated beside it by the page's legend:
// markers are drawn at a size the reader chooses and say how much larger than
// the body's radius they are, a trail is the path over a stated span, an arrow
// is a velocity at a stated scale, and perspective shrinks what is far.
//
// The vendored three.js is the lab's own (vendor/three/lab3d.module.js).
// =============================================================================

import * as THREE from '../../../vendor/three/lab3d.module.js';
import { OrbitControls } from '../../../vendor/three/lab3d.module.js';

/** Distinct hues, in an order that keeps neighbours apart. Never the only cue. */
export const PALETTE = [
  '#ffd166',
  '#4cc9f0',
  '#f72585',
  '#90be6d',
  '#f8961e',
  '#b388ff',
  '#43aa8b',
  '#ff6b6b',
];

const BACKGROUND = 0x07080f;

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{low: boolean, reduced: boolean, onLost: Function, onRestored: Function}} o
 */
export function createScene(canvas, o = {}) {
  let low = Boolean(o.low);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !low,
    powerPreference: 'default',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(BACKGROUND, 1);
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(1, -1, 2);
  scene.add(sun);

  const perspective = new THREE.PerspectiveCamera(45, 1, 1e-4, 1e5);
  const orthographic = new THREE.OrthographicCamera(-1, 1, 1, -1, -1e5, 1e5);
  let camera = perspective;
  let controls = null;
  let width = 1;
  let height = 1;

  const makeControls = () => {
    controls?.dispose();
    controls = new OrbitControls(camera, canvas);
    controls.enableDamping = !o.reduced;
    controls.dampingFactor = 0.12;
    // The page gives the keyboard its own bindings (orbit, zoom, pan); the
    // controls keep the pointer.
    controls.enableKeys = false;
    controls.addEventListener('change', () => o.onCamera?.());
  };
  makeControls();

  const world = new THREE.Group();
  scene.add(world);

  // --- Bodies, trails, drop lines, arrows
  let bodies = [];
  const segments = () => (low ? 12 : 28);
  const sphere = new THREE.SphereGeometry(1, segments(), segments() / 2);

  const lineOf = (points, color, opacity = 1) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(points * 3), 3)
    );
    g.setDrawRange(0, 0);
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: opacity < 1,
      opacity,
    });
    const line = new THREE.Line(g, mat);
    line.frustumCulled = false;
    return line;
  };
  const setLine = (line, coords, count) => {
    const attr = line.geometry.getAttribute('position');
    attr.array.set(coords.subarray(0, count * 3));
    attr.needsUpdate = true;
    line.geometry.setDrawRange(0, count);
  };

  /**
   * One slot per body id: its marker, trail, drop line and velocity arrow.
   * @param {{id: string, color: string}[]} list
   * @param {number} trailPoints - How many trail points each body keeps
   */
  const setBodies = (list, trailPoints) => {
    for (const b of bodies) {
      world.remove(b.mesh, b.trail, b.drop, b.arrow);
      b.trail.geometry.dispose();
      b.drop.geometry.dispose();
      b.arrow.geometry.dispose();
      b.mesh.material.dispose();
    }
    bodies = list.map(({ id, color }) => {
      const mesh = new THREE.Mesh(
        sphere,
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.6,
          metalness: 0,
          emissive: new THREE.Color(color).multiplyScalar(0.25),
        })
      );
      const trail = lineOf(trailPoints, color, 0.75);
      const drop = lineOf(2, 0x8a93a8, 0.6);
      const arrow = lineOf(2, color, 1);
      world.add(mesh, trail, drop, arrow);
      return {
        id,
        mesh,
        trail,
        drop,
        arrow,
        trailPoints,
        trailBuf: new Float32Array(trailPoints * 3),
        trailCount: 0,
      };
    });
  };

  // --- The reference plane and the instruments
  let grid = null;
  const setGrid = (size, divisions) => {
    if (grid) {
      world.remove(grid);
      grid.geometry.dispose();
    }
    grid = new THREE.GridHelper(size, divisions, 0x3d4660, 0x232a3d);
    grid.rotation.x = Math.PI / 2; // GridHelper lies in xz; the plane is z = 0
    world.add(grid);
  };
  const measure = lineOf(2, 0xffffff, 0.9);
  const angleLines = lineOf(3, 0xffffff, 0.9);
  const arc = lineOf(33, 0xffffff, 0.9);
  world.add(measure, angleLines, arc);

  // --- Context loss: stop drawing, say so, and draw again when it returns.
  let lost = false;
  canvas.addEventListener('webglcontextlost', e => {
    e.preventDefault();
    lost = true;
    o.onLost?.();
  });
  canvas.addEventListener('webglcontextrestored', () => {
    lost = false;
    // three re-creates its GL state; every buffer is uploaded again.
    for (const b of bodies) {
      b.trail.geometry.getAttribute('position').needsUpdate = true;
      b.drop.geometry.getAttribute('position').needsUpdate = true;
      b.arrow.geometry.getAttribute('position').needsUpdate = true;
    }
    o.onRestored?.();
  });

  return {
    renderer,
    get camera() {
      return camera;
    },
    get lost() {
      return lost;
    },
    setBodies,
    setGrid,

    /** Size the drawing buffer to the canvas's box. */
    resize(w, h) {
      width = Math.max(1, w);
      height = Math.max(1, h);
      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, low ? 1 : 2)
      );
      renderer.setSize(width, height, false);
    },

    /** Point the camera: {mode, eye, target, up, fov, height} (./projection.js). */
    setCamera(cam) {
      const want = cam.mode === 'orthographic' ? orthographic : perspective;
      if (want !== camera) {
        camera = want;
        makeControls();
      }
      camera.up.set(...cam.up);
      camera.position.set(...cam.eye);
      if (camera === perspective) {
        camera.fov = cam.fov ?? 45;
        const dist = Math.hypot(
          cam.eye[0] - cam.target[0],
          cam.eye[1] - cam.target[1],
          cam.eye[2] - cam.target[2]
        );
        camera.near = Math.max(dist * 1e-4, 1e-9);
        camera.far = dist * 1e3;
      } else {
        orthographic.userData.height = cam.height;
      }
      controls.target.set(...cam.target);
      camera.lookAt(...cam.target);
      this.fit();
      controls.update();
    },

    /** The camera as numbers, after the reader has moved it. */
    readCamera() {
      const t = controls.target;
      const cam = {
        mode: camera === orthographic ? 'orthographic' : 'perspective',
        eye: [camera.position.x, camera.position.y, camera.position.z],
        target: [t.x, t.y, t.z],
        up: [camera.up.x, camera.up.y, camera.up.z],
        fov: perspective.fov,
      };
      if (camera === orthographic)
        cam.height =
          (orthographic.userData.height || 2) / (orthographic.zoom || 1);
      return cam;
    },

    /** The projection matrices for the canvas's aspect. */
    fit() {
      const aspect = width / height;
      perspective.aspect = aspect;
      perspective.updateProjectionMatrix();
      const h = (orthographic.userData.height || 2) / 2;
      orthographic.left = -h * aspect;
      orthographic.right = h * aspect;
      orthographic.top = h;
      orthographic.bottom = -h;
      orthographic.updateProjectionMatrix();
    },

    /**
     * Draw one frame.
     * @param {object} d
     * @param {Float64Array} d.x - Display positions, 3n
     * @param {Uint8Array} d.alive
     * @param {Float64Array} d.sizes - Each marker's drawn radius, world units
     * @param {Float64Array|null} d.arrows - Arrow tips, 3n, or null to hide
     * @param {boolean} d.trails, d.drops, d.grid
     * @param {number[][]|null} d.distance - Two points, or null
     * @param {number[][]|null} d.angle - [a, vertex, b], or null
     */
    draw(d) {
      bodies.forEach((b, i) => {
        const on = Boolean(d.alive[i]);
        const x = d.x[3 * i];
        const y = d.x[3 * i + 1];
        const z = d.x[3 * i + 2];
        b.mesh.visible = on;
        b.mesh.position.set(x, y, z);
        b.mesh.scale.setScalar(d.sizes[i]);
        b.trail.visible = d.trails && b.trailCount > 1;
        b.drop.visible = on && d.drops;
        if (b.drop.visible)
          setLine(b.drop, new Float32Array([x, y, z, x, y, 0]), 2);
        b.arrow.visible = on && Boolean(d.arrows);
        if (b.arrow.visible)
          setLine(
            b.arrow,
            new Float32Array([
              x,
              y,
              z,
              d.arrows[3 * i],
              d.arrows[3 * i + 1],
              d.arrows[3 * i + 2],
            ]),
            2
          );
      });
      if (grid) grid.visible = d.grid;
      measure.visible = Boolean(d.distance);
      if (d.distance) setLine(measure, new Float32Array(d.distance.flat()), 2);
      angleLines.visible = arc.visible = Boolean(d.angle);
      if (d.angle) {
        const [a, v, c] = d.angle;
        setLine(angleLines, new Float32Array([...a, ...v, ...c]), 3);
        setLine(arc, arcPoints(a, v, c, 32), 33);
      }
      if (!lost) {
        controls.update();
        renderer.render(scene, camera);
      }
    },

    /** Append trail points (display coordinates, k by 3n) and keep the newest. */
    pushTrail(points, k, n) {
      bodies.forEach((b, i) => {
        for (let j = 0; j < k; j++) {
          const base = j * 3 * n + 3 * i;
          if (b.trailCount === b.trailPoints) {
            b.trailBuf.copyWithin(0, 3);
            b.trailCount--;
          }
          b.trailBuf[3 * b.trailCount] = points[base];
          b.trailBuf[3 * b.trailCount + 1] = points[base + 1];
          b.trailBuf[3 * b.trailCount + 2] = points[base + 2];
          b.trailCount++;
        }
        setLine(b.trail, b.trailBuf, b.trailCount);
      });
    },
    clearTrails() {
      for (const b of bodies) {
        b.trailCount = 0;
        b.trail.geometry.setDrawRange(0, 0);
      }
    },

    /** Lower or raise the quality: pixel ratio and marker detail. */
    setLow(v) {
      low = Boolean(v);
      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, low ? 1 : 2)
      );
      renderer.setSize(width, height, false);
    },

    /** Orbit the camera about its target by yaw and pitch (radians), for the keyboard. */
    orbit(yaw, pitch) {
      const t = controls.target;
      const p = camera.position.clone().sub(t);
      const up = camera.up.clone().normalize();
      p.applyAxisAngle(up, yaw);
      const right = new THREE.Vector3().crossVectors(up, p).normalize();
      const q = p.clone().applyAxisAngle(right, pitch);
      // Stop short of the pole, where up and the line of sight would meet.
      if (Math.abs(q.clone().normalize().dot(up)) < 0.995) p.copy(q);
      camera.position.copy(t).add(p);
      camera.lookAt(t);
      controls.update();
    },
    /** Zoom by a factor (less than 1 is closer). */
    zoom(f) {
      if (camera === orthographic) {
        orthographic.zoom = Math.min(
          1e4,
          Math.max(1e-4, orthographic.zoom / f)
        );
        orthographic.updateProjectionMatrix();
      } else {
        const t = controls.target;
        camera.position.sub(t).multiplyScalar(f).add(t);
      }
      controls.update();
    },
    /** Pan the target and eye together by a fraction of the view's height. */
    pan(dx, dy) {
      const t = controls.target;
      const dist = camera.position.distanceTo(t);
      const span =
        camera === orthographic
          ? (orthographic.userData.height || 2) / orthographic.zoom
          : 2 * dist * Math.tan((perspective.fov * Math.PI) / 360);
      const f = new THREE.Vector3().subVectors(t, camera.position).normalize();
      const r = new THREE.Vector3().crossVectors(f, camera.up).normalize();
      const u = new THREE.Vector3().crossVectors(r, f);
      const move = r.multiplyScalar(dx * span).add(u.multiplyScalar(dy * span));
      camera.position.add(move);
      t.add(move);
      controls.update();
    },

    /** Shift the whole picture, to keep a followed body at the center. */
    setOffset(o) {
      world.position.set(-o[0], -o[1], -o[2]);
    },
    /** Reduced motion: no eased camera after a drag. */
    setReduced(v) {
      o.reduced = Boolean(v);
      controls.enableDamping = !o.reduced;
    },

    dispose() {
      controls?.dispose();
      renderer.dispose();
    },
  };
}

/** Points on the arc at `v` from the direction of a to the direction of c. */
export function arcPoints(a, v, c, steps = 32) {
  const p = [a[0] - v[0], a[1] - v[1], a[2] - v[2]];
  const q = [c[0] - v[0], c[1] - v[1], c[2] - v[2]];
  const lp = Math.hypot(...p);
  const lq = Math.hypot(...q);
  const out = new Float32Array((steps + 1) * 3);
  if (!(lp > 0) || !(lq > 0)) return out;
  const r = 0.3 * Math.min(lp, lq);
  const u = p.map(x => x / lp);
  // w: the unit vector in the plane of p and q, perpendicular to p.
  const dotq = (q[0] * u[0] + q[1] * u[1] + q[2] * u[2]) / lq;
  const w0 = q.map((x, k) => x / lq - dotq * u[k]);
  const lw = Math.hypot(...w0);
  const w = lw > 1e-12 ? w0.map(x => x / lw) : [0, 0, 0];
  const theta = Math.atan2(lw, dotq);
  for (let s = 0; s <= steps; s++) {
    const t = (theta * s) / steps;
    for (let k = 0; k < 3; k++)
      out[3 * s + k] = v[k] + r * (Math.cos(t) * u[k] + Math.sin(t) * w[k]);
  }
  return out;
}
