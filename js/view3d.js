import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import {
  bh_list,
  planets,
  stars,
  gas_giants,
  asteroids,
  comets,
  gravity_ripples,
  debris,
  neutron_stars,
  white_dwarfs,
} from './physics.js';
import { getStarColor } from './utils.js';

let containerEl = null;
let canvasHost = null;
let renderer = null;
let scene = null;
let camera = null;
let controls = null;
let rootGroup = null;
let toggleBtn = null;
let mobileToggleBtn = null;
let statusLabel = null;
let resizeObserver = null;
let viewEnabled = false;
let needsFocusReset = false;
let lastRender = 0;

const MIN_RENDER_INTERVAL = 1000 / 45; // ~45 FPS cap for the 3D viewport

const hasWindow = typeof window !== 'undefined';
const supportsResizeObserver =
  hasWindow && typeof window.ResizeObserver !== 'undefined';
const TYPE_STYLES = {
  default: {
    color: '#99aabf',
    emissive: '#1a1f29',
    emissiveIntensity: 0.2,
    metalness: 0.3,
    roughness: 0.55,
  },
};
const PLANET_DENSITY_COLORS = {
  gaseous: '#87CEEB',
  icy: '#E6E6FA',
  rocky: '#87CEEB',
};
const GAS_GIANT_COLORS = {
  brown_dwarf: '#8B4513',
  super_jupiter: '#DAA520',
  jupiter_like: '#D2B48C',
  neptune_like: '#4169E1',
  mini_neptune: '#87CEEB',
};
const EARTH_COLOR = '#3d8bff';
const MOON_COLOR = '#d7d4ca';
const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
const smallSphereGeometry = new THREE.SphereGeometry(1, 18, 18);
const meshCache = new Map();
const SPACE_BG_COLOR = 0x010102;
const GRID_COLOR = 0xffffff;
const GRID_FADE = 0.75;
const SPACETIME_SIZE = 3000;
const SPACETIME_SEGMENTS = 260;
const GRID_SEGMENTS = 50; // Denser grid for better detail
const SPACETIME_MAX_WELL = 2000; // Deep enough to look like a singularity
const SPACETIME_SMOOTHING = 0.3;
const WELL_STRENGTH = {
  BlackHole: 80,
  StarObject: 25,
  GasGiant: 8,
  Planet: 5,
  NeutronStar: 35,
  WhiteDwarf: 20,
  default: 5,
};
const WELL_FALLOFF = {
  BlackHole: 45,
  StarObject: 90,
  GasGiant: 60,
  Planet: 50,
  NeutronStar: 55,
  WhiteDwarf: 70,
  default: 80,
};
const OBJECT_BASE_ALTITUDE = 42;
const OBJECT_ALTITUDE_SPREAD = 26;
const BLACK_HOLE_ALTITUDE_OFFSET = -18;
let spacetimeSurface = null;
let spacetimeGeometry = null;
let spacetimeHeights = null;
let gridMesh = null;

/**
 * Initialize DOM bindings for the 3D viewport.
 * @param {{ state?: object }} options
 */
function init3DView() {
  containerEl = document.getElementById('threeViewportContainer');
  canvasHost = document.getElementById('threeViewport');
  statusLabel = document.getElementById('threeViewStatus');
  toggleBtn = document.getElementById('toggle3DView');
  mobileToggleBtn = document.getElementById('mobileToggle3DViewBtn');
  const closeBtn = document.getElementById('close3DViewBtn');
  const resetBtn = document.getElementById('reset3DCameraBtn');
  const resizeHandle = document.getElementById('threeViewResizeHandle');
  const header = containerEl?.querySelector('.three-view-toolbar');

  const toggleHandler = () => set3DViewEnabled(!viewEnabled);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleHandler);
  }
  if (mobileToggleBtn) {
    mobileToggleBtn.addEventListener('click', toggleHandler);
  }
  if (closeBtn) {
    closeBtn.addEventListener('click', () => set3DViewEnabled(false));
  }
  if (resetBtn) {
    resetBtn.addEventListener('click', () => focusScene(true));
  }

  // Draggable logic
  if (header && containerEl) {
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    header.addEventListener('mousedown', e => {
      // Don't drag if clicking buttons
      if (e.target.closest('button')) return;
      
      isDragging = true;
      containerEl.classList.add('interacting');
      
      const rect = containerEl.getBoundingClientRect();
      // Switch to explicit left/top positioning if not already
      containerEl.style.right = 'auto';
      containerEl.style.bottom = 'auto';
      containerEl.style.left = `${rect.left}px`;
      containerEl.style.top = `${rect.top}px`;
      
      startX = e.clientX;
      startY = e.clientY;
      initialLeft = rect.left;
      initialTop = rect.top;
      
      e.preventDefault(); // Prevent text selection
    });

    window.addEventListener('mousemove', e => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      
      // Constrain to window bounds
      const newLeft = Math.max(0, Math.min(window.innerWidth - containerEl.offsetWidth, initialLeft + dx));
      const newTop = Math.max(0, Math.min(window.innerHeight - containerEl.offsetHeight, initialTop + dy));
      
      containerEl.style.left = `${newLeft}px`;
      containerEl.style.top = `${newTop}px`;
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        containerEl.classList.remove('interacting');
      }
    });
  }

  // Resizable logic (Top-Left Handle)
  if (resizeHandle && containerEl) {
    let isResizing = false;
    let startX, startY, startWidth, startHeight, startLeft, startTop;

    resizeHandle.addEventListener('mousedown', e => {
      isResizing = true;
      containerEl.classList.add('interacting');
      
      const rect = containerEl.getBoundingClientRect();
      // Switch to explicit left/top positioning if not already
      containerEl.style.right = 'auto';
      containerEl.style.bottom = 'auto';
      containerEl.style.left = `${rect.left}px`;
      containerEl.style.top = `${rect.top}px`;

      startX = e.clientX;
      startY = e.clientY;
      startWidth = rect.width;
      startHeight = rect.height;
      startLeft = rect.left;
      startTop = rect.top;
      
      e.preventDefault();
      e.stopPropagation();
    });

    window.addEventListener('mousemove', e => {
      if (!isResizing) return;
      
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      
      // Calculate new dimensions (dragging top-left: moving right/down shrinks, left/up grows)
      // Note: dx/dy is positive when moving right/down.
      // So we subtract dx from width, dy from height.
      let newWidth = Math.max(280, startWidth - dx);
      let newHeight = Math.max(240, startHeight - dy);
      
      // Constrain against max window size (optional, but good practice)
      newWidth = Math.min(newWidth, window.innerWidth - 20);
      newHeight = Math.min(newHeight, window.innerHeight - 20);

      // Calculate new position
      // The right/bottom edge should theoretically stay fixed.
      // right_edge = startLeft + startWidth
      // newLeft = right_edge - newWidth
      const rightEdge = startLeft + startWidth;
      const bottomEdge = startTop + startHeight;
      
      const newLeft = rightEdge - newWidth;
      const newTop = bottomEdge - newHeight;
      
      containerEl.style.width = `${newWidth}px`;
      containerEl.style.height = `${newHeight}px`;
      containerEl.style.left = `${newLeft}px`;
      containerEl.style.top = `${newTop}px`;
      
      handleWindowResize();
    });

    window.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        containerEl.classList.remove('interacting');
      }
    });
  }

  updateToggleLabel();
}

/**
 * Update the 3D view on each animation frame.
 * @param {number} timestamp
 */
function update3DScene(timestamp = performance.now()) {
  if (!viewEnabled) return;
  if (!renderer || !scene || !camera) return;
  if (timestamp - lastRender < MIN_RENDER_INTERVAL) return;

  lastRender = timestamp;
  const activeObjects = syncMeshes();
  updateSpacetimeSurface();

  if (needsFocusReset) {
    focusScene(true);
  }

  controls?.update();
  renderer.render(scene, camera);

  if (statusLabel) {
    statusLabel.textContent = activeObjects
      ? `LIVE · ${activeObjects} bodies`
      : 'LIVE · waiting';
  }
}

function set3DViewEnabled(next) {
  if (next === viewEnabled) return;
  if (next && !ensureScene()) {
    console.warn('Unable to initialize 3D renderer (WebGL not available?)');
    return;
  }

  viewEnabled = next;
  needsFocusReset = viewEnabled;
  updateToggleLabel();

  if (containerEl) {
    containerEl.classList.toggle('visible', viewEnabled);
    containerEl.setAttribute('aria-hidden', viewEnabled ? 'false' : 'true');
  }
  if (renderer?.domElement) {
    renderer.domElement.style.pointerEvents = viewEnabled ? 'auto' : 'none';
  }
  if (!viewEnabled && statusLabel) {
    statusLabel.textContent = 'Hidden';
  }
}

function ensureScene() {
  if (renderer && scene && camera && controls) return true;
  if (!canvasHost) canvasHost = document.getElementById('threeViewport');
  if (!canvasHost) return false;

  const bounds = canvasHost.getBoundingClientRect();
  const width = Math.max(1, Math.floor(bounds.width || 320));
  const height = Math.max(1, Math.floor(bounds.height || 240));

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setSize(width, height, false);
  renderer.domElement.setAttribute(
    'aria-label',
    'Interactive 3D spatial view of the current simulation'
  );
  canvasHost.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(SPACE_BG_COLOR);

  camera = new THREE.PerspectiveCamera(55, width / height, 1, 6000);
  camera.position.set(0, 260, 360);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enablePan = true;
  controls.panSpeed = 0.8;
  controls.minDistance = 60;
  controls.maxDistance = 4000;
  controls.maxPolarAngle = Math.PI * 0.98;

  rootGroup = new THREE.Group();
  scene.add(rootGroup);

  addEnvironment();
  createSpacetimeSurface();

  if (hasWindow) {
    window.addEventListener('resize', handleWindowResize);
  }
  if (supportsResizeObserver && canvasHost) {
    resizeObserver = new window.ResizeObserver(() => handleWindowResize());
    resizeObserver.observe(canvasHost);
  }

  return true;
}

function addEnvironment() {
  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambient);

  const hemi = new THREE.HemisphereLight(0x5cb7ff, 0x050311, 0.35);
  scene.add(hemi);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
  keyLight.position.set(140, 260, 180);
  keyLight.castShadow = false;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x8ab6ff, 0.55);
  fillLight.position.set(-220, -160, -140);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0x4fffff, 0.4);
  rimLight.position.set(0, 220, -260);
  scene.add(rimLight);

  // Create a sparser grid that will bend with spacetime curvature
  const gridMaterial = new THREE.LineBasicMaterial({
    color: 0x44aaff, // Sci-fi blue-ish grid
    transparent: true,
    opacity: 0.8,
    linewidth: 1, // WebGL limitation often forces 1
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
  });
  
  // Create grid with subdivided lines so they can bend
  const points = [];
  const halfSize = SPACETIME_SIZE / 2;
  const gridStep = SPACETIME_SIZE / GRID_SEGMENTS;
  const subdivisions = 100; // High subdivision for smooth tight curves
  const subStep = SPACETIME_SIZE / subdivisions;
  
  // Create horizontal lines (parallel to X axis) with subdivisions
  for (let i = 0; i <= GRID_SEGMENTS; i++) {
    const z = -halfSize + i * gridStep;
    // Create a continuous line for this row
    for (let j = 0; j < subdivisions; j++) {
      const x1 = -halfSize + j * subStep;
      const x2 = -halfSize + (j + 1) * subStep;
      points.push(new THREE.Vector3(x1, 0, z));
      points.push(new THREE.Vector3(x2, 0, z));
    }
  }
  
  // Create vertical lines (parallel to Z axis) with subdivisions
  for (let i = 0; i <= GRID_SEGMENTS; i++) {
    const x = -halfSize + i * gridStep;
    // Create a continuous line for this column
    for (let j = 0; j < subdivisions; j++) {
      const z1 = -halfSize + j * subStep;
      const z2 = -halfSize + (j + 1) * subStep;
      points.push(new THREE.Vector3(x, 0, z1));
      points.push(new THREE.Vector3(x, 0, z2));
    }
  }
  
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
  gridMesh = new THREE.LineSegments(lineGeometry, gridMaterial);
  gridMesh.position.y = -OBJECT_BASE_ALTITUDE * 0.45; 
  rootGroup.add(gridMesh);
}

function createSpacetimeSurface() {
  // Deprecated: User requested ONLY the grid, not the solid surface.
  // Leaving empty or minimal if needed for logic preservation, 
  // but we will disable the mesh creation.
  spacetimeSurface = null;
  spacetimeGeometry = null;
  spacetimeHeights = null;
}

function updateSpacetimeSurface() {
  // Update grid directly
  const sources = getSpacetimeSources();
  if (!sources.length && !gravity_ripples.length) return;
  
  updateGridCurvature(sources);
}

function updateGridCurvature(sources) {
  if (!gridMesh) return;
  
  const position = gridMesh.geometry.attributes.position;
  const vertexCount = position.count;
  const now = performance.now();
  
  // Precompute active ripples and their properties to optimize vertex loop
  const activeRipples = [];
  const halfSize = SPACETIME_SIZE / 2; // 1500

  for (let j = 0; j < gravity_ripples.length; j++) {
    const ripple = gravity_ripples[j];
    const age = now - ripple.created;
    
    const rx = ripple.x;
    const rz = -ripple.y; // Convert from simulation Y to 3D Z
    
    // Calculate max distance to any corner of the grid to ensure coverage
    // Grid corners are at (+-halfSize, +-halfSize)
    const d1 = Math.hypot(halfSize - rx, halfSize - rz);
    const d2 = Math.hypot(halfSize - rx, -halfSize - rz);
    const d3 = Math.hypot(-halfSize - rx, halfSize - rz);
    const d4 = Math.hypot(-halfSize - rx, -halfSize - rz);
    const maxDistToCorner = Math.max(d1, d2, d3, d4);
    
    // Wave parameters
    const speed = 0.35; // Propagation speed
    const wavelength = 120 + Math.log10(ripple.mass + 1) * 40;
    const amplitude = (20 + Math.log10(ripple.mass + 1) * 15) * (ripple.gw_strength || 1);
    
    // Reduce packet cycles further (user requested ~half of previous 5)
    // A value of 2.5 means we only see about 2-3 distinct wave crests
    const packetCycles = 2.5; 
    const packetLength = wavelength * packetCycles;
    
    // Fade out only after we pass the furthest corner
    const edgeFadeStart = maxDistToCorner; 
    const edgeFadeLength = wavelength * 4.0;
    const maxDistance = maxDistToCorner + packetLength + edgeFadeLength;
    const waveLifetime = maxDistance / speed;

    if (age > waveLifetime) continue;

    const waveFront = age * speed;
    
    activeRipples.push({
      rx, rz,
      waveFront,
      wavelength,
      amplitude,
      packetLength,
      packetStart: Math.max(0, waveFront - packetLength),
      leadSoftness: wavelength * 1.5,
      tailSoftness: wavelength * 2.5,
      edgeFadeStart,
      edgeFadeLength,
      age
    });
  }
  
  // Update each grid line vertex to follow gravitational curvature
  for (let i = 0; i < vertexCount; i++) {
    const vx = position.getX(i);
    const vz = position.getZ(i);
    let targetHeight = 0;
    
    // Calculate gravitational well depth from massive objects
    for (let j = 0; j < sources.length; j++) {
      targetHeight += computeWellDepth(sources[j], vx, vz);
    }
    
    // Add gravitational wave ripples
    for (let j = 0; j < activeRipples.length; j++) {
        const r = activeRipples[j];
        const dx = vx - r.rx;
        const dz = vz - r.rz;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        const distanceBehindFront = r.waveFront - dist;
        const distanceAheadOfTail = dist - r.packetStart;

        // Only evaluate vertices within the traveling packet window
        if (distanceBehindFront >= -r.leadSoftness && distanceAheadOfTail >= -r.tailSoftness) {
            const phase = (dist - r.waveFront) / r.wavelength * Math.PI * 2;

            let envelope = 1.0;
            if (distanceBehindFront < 0) {
                // Ahead of the wavefront (leading edge)
                const normalized = THREE.MathUtils.clamp(
                    (distanceBehindFront + r.leadSoftness) / r.leadSoftness,
                    0,
                    1
                );
                envelope *= normalized;
            }
            if (distanceAheadOfTail < 0) {
                // Behind the packet tail (trailing edge)
                const normalized = THREE.MathUtils.clamp(
                    (distanceAheadOfTail + r.tailSoftness) / r.tailSoftness,
                    0,
                    1
                );
                envelope *= normalized;
            }
            
            // Fade if extremely far (beyond grid corners)
            if (dist > r.edgeFadeStart) {
                const normalized = 1 - THREE.MathUtils.clamp(
                    (dist - r.edgeFadeStart) / r.edgeFadeLength,
                    0,
                    1
                );
                envelope *= normalized;
            }

            // Slow decay to keep amplitude until the wave actually meets the edge
            const distanceDecay = 1.0 / (1.0 + dist / 12000);

            // Add an initial impulse at age~0 near center
            let impulse = 0;
            if (r.age < 500 && dist < 100) {
                impulse = Math.sin(r.age * 0.01) * r.amplitude * 0.5 * (1 - dist / 100);
            }

            targetHeight += (Math.sin(phase) * r.amplitude * envelope * distanceDecay) + impulse;
        }
    }
    
    targetHeight = Math.max(-SPACETIME_MAX_WELL, Math.min(150, targetHeight)); // Allow higher peaks
    position.setY(i, targetHeight);
  }
  
  position.needsUpdate = true;
}

function handleWindowResize() {
  if (!renderer || !camera || !canvasHost) return;
  const bounds = canvasHost.getBoundingClientRect();
  const width = Math.max(1, Math.floor(bounds.width || 320));
  const height = Math.max(1, Math.floor(bounds.height || 240));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function syncMeshes(_forceMaterialRefresh = false) {
  if (!rootGroup) return 0;

  const seen = new Set();
  const objects = gatherObjects();

  for (const obj of objects) {
    if (!obj || !obj.alive) continue;
    const id = obj.id ?? `${obj.obj_type}-${obj.mass}-${obj.radius}`;
    seen.add(id);
    let record = meshCache.get(id);
    if (!record) {
      const mesh = createMeshFor(obj);
      if (!mesh) continue;
      meshCache.set(id, { mesh });
      rootGroup.add(mesh);
      record = meshCache.get(id);
    }

    updateMeshAppearance(record.mesh, obj);
    updateMeshTransform(record.mesh, obj);
  }

  meshCache.forEach((record, id) => {
    if (!seen.has(id)) {
      rootGroup.remove(record.mesh);
      meshCache.delete(id);
    }
  });

  return seen.size;
}

function createMeshFor(obj) {
  const type = getType(obj);
  const geometry = getGeometryForType(type);
  if (!geometry) return null;
  const material = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    emissive: '#1b1f2a',
    emissiveIntensity: 0.18,
    metalness: 0.3,
    roughness: 0.6,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  updateMeshAppearance(mesh, obj);
  updateMeshTransform(mesh, obj);
  return mesh;
}

function updateMeshTransform(mesh, obj) {
  if (!mesh || !obj) return;
  const scale = getScaleForObject(obj);
  mesh.scale.setScalar(scale);
  mesh.position.set(obj.pos.x || 0, getObjectAltitude(obj), -(obj.pos.y || 0));
}

function getScaleForObject(obj) {
  const base = Math.max(2, Math.min(obj.radius || 4, 200));
  const type = getType(obj);
  switch (type) {
    case 'BlackHole':
      return Math.max(10, Math.min(base * 1.3, 80));
    case 'StarObject':
      return Math.max(8, Math.min(base, 140));
    case 'GasGiant':
      return Math.max(6, Math.min(base * 0.9, 60));
    case 'Planet':
      return Math.max(4, Math.min(base * 0.7, 40));
    case 'NeutronStar':
    case 'WhiteDwarf':
      return Math.max(5, Math.min(base * 0.8, 35));
    case 'Asteroid':
    case 'Comet':
    case 'Debris':
      return Math.max(2, Math.min(base * 0.5, 12));
    default:
      return Math.max(3, Math.min(base, 30));
  }
}

function getType(obj) {
  return obj?.obj_type || obj?.constructor?.name || 'object';
}

function getGeometryForType(type) {
  switch (type) {
    case 'Asteroid':
    case 'Debris':
      return smallSphereGeometry;
    default:
      return sphereGeometry;
  }
}

function getStyleForObject(obj) {
  const fallback = { ...TYPE_STYLES.default };
  if (!obj) return fallback;
  switch (obj.obj_type) {
    case 'StarObject': {
      const starHex =
        obj.baseColor ||
        (typeof obj.massInSuns === 'number'
          ? getStarColor(obj.massInSuns)
          : '#ffd89c');
      return {
        color: starHex,
        emissive: starHex,
        emissiveIntensity: 1.25,
        metalness: 0.05,
        roughness: 0.15,
      };
    }
    case 'BlackHole': {
      const glow =
        Math.min(
          1,
          Math.max(0, (obj.accretion_intensity || 0) + (obj.jet_intensity || 0))
        ) || 0;
      return {
        color: '#04020c',
        emissive: '#4f2cff',
        emissiveIntensity: 0.45 + glow * 0.6,
        metalness: 0.85,
        roughness: 0.8,
      };
    }
    case 'Planet': {
      let base =
        (obj.isEarth && EARTH_COLOR) ||
        (obj.isMoon && MOON_COLOR) ||
        PLANET_DENSITY_COLORS[obj.density] ||
        PLANET_DENSITY_COLORS.rocky;
      return {
        color: base,
        emissive: '#0e1622',
        emissiveIntensity: 0.06,
        metalness: 0.2,
        roughness: 0.72,
      };
    }
    case 'GasGiant': {
      const color = GAS_GIANT_COLORS[obj.giantType] || '#87CEEB';
      return {
        color,
        emissive: color,
        emissiveIntensity: 0.2,
        metalness: 0.28,
        roughness: 0.42,
      };
    }
    case 'NeutronStar':
      return {
        color: '#9fd4ff',
        emissive: '#8dd2ff',
        emissiveIntensity: 1.0,
        metalness: 0.08,
        roughness: 0.2,
      };
    case 'WhiteDwarf':
      return {
        color: '#e3f2ff',
        emissive: '#cfe9ff',
        emissiveIntensity: 0.8,
        metalness: 0.08,
        roughness: 0.25,
      };
    case 'Comet':
      return {
        color: '#f0f0f0',
        emissive: '#b6deff',
        emissiveIntensity: 0.35,
        metalness: 0.05,
        roughness: 0.35,
      };
    case 'Asteroid':
      return {
        color: '#8B4513',
        emissive: '#1a0a03',
        emissiveIntensity: 0.05,
        metalness: 0.4,
        roughness: 0.85,
      };
    case 'Debris':
      return {
        color: '#c8c8c8',
        emissive: '#3a3a3a',
        emissiveIntensity: 0.08,
        metalness: 0.25,
        roughness: 0.7,
      };
    default: {
      return { ...fallback };
    }
  }
}

function updateMeshAppearance(mesh, obj) {
  if (!mesh || !mesh.material) return;
  const style = getStyleForObject(obj);
  try {
    mesh.material.color.set(style.color || '#ffffff');
  } catch {
    mesh.material.color.set('#ffffff');
  }
  try {
    mesh.material.emissive.set(style.emissive || '#000000');
  } catch {
    mesh.material.emissive.set('#000000');
  }
  mesh.material.emissiveIntensity =
    style.emissiveIntensity ?? TYPE_STYLES.default.emissiveIntensity;
  mesh.material.metalness =
    style.metalness ?? TYPE_STYLES.default.metalness ?? 0.3;
  mesh.material.roughness =
    style.roughness ?? TYPE_STYLES.default.roughness ?? 0.55;
}

function getSpacetimeSources() {
  return [
    ...bh_list,
    ...stars,
    ...gas_giants,
    ...planets,
    ...neutron_stars,
    ...white_dwarfs,
  ].filter(obj => obj && obj.alive && obj.pos);
}

function computeWellDepth(obj, vx, vz) {
  if (!obj || !obj.pos) return 0;
  const objX = obj.pos.x || 0;
  const objZ = -(obj.pos.y || 0);
  const dx = vx - objX;
  const dz = vz - objZ;
  const distSq = dx * dx + dz * dz;
  const distance = Math.sqrt(distSq) + 0.1; // Avoid division by zero
  
  const baseStrength = WELL_STRENGTH[obj.obj_type] ?? WELL_STRENGTH.default;
  const falloff = WELL_FALLOFF[obj.obj_type] ?? WELL_FALLOFF.default;
  const mass = Math.max(getObjectMassApprox(obj), 1);
  
  // Special handling for Black Holes to create a "singularity" punch-through effect
  if (obj.obj_type === 'BlackHole') {
    // Sharper falloff for BH
    const sharpness = 3.5; 
    // The well should be extremely deep near the center
    const deepWell = (baseStrength * mass * 5.0) / (Math.pow(distance / 6, sharpness) + 0.05);
    return -Math.min(SPACETIME_MAX_WELL, deepWell);
  }

  // Standard gravity well for other objects
  const magnitude = Math.log10(1 + mass) * baseStrength;
  // Gaussian-like falloff for smoother but tight curvature
  const normalized = Math.exp(-(distance * distance) / (2 * falloff * falloff));

  const depth = -magnitude * normalized * 10; // Multiplier to give visual depth
  return Math.max(-SPACETIME_MAX_WELL * 0.5, depth);
}

function getObjectMassApprox(obj) {
  if (!obj) return 1;
  if (typeof obj.mass === 'number') return obj.mass;
  if (typeof obj.massInSuns === 'number') return obj.massInSuns * 1000;
  if (typeof obj.massInEarths === 'number') return obj.massInEarths;
  return 1;
}

function getObjectAltitude(obj) {
  const base = OBJECT_BASE_ALTITUDE;
  const altVariance =
    (Math.log10(Math.max(getObjectMassApprox(obj), 1)) || 0) *
    (OBJECT_ALTITUDE_SPREAD * 0.4);
  let altitude = base + altVariance;
  if (obj?.obj_type === 'BlackHole') {
    altitude += BLACK_HOLE_ALTITUDE_OFFSET;
  }
  return altitude;
}

function gatherObjects() {
  return [
    ...bh_list,
    ...stars,
    ...planets,
    ...gas_giants,
    ...neutron_stars,
    ...white_dwarfs,
    ...asteroids,
    ...comets,
    ...debris,
  ];
}

function focusScene(force = false) {
  if (!controls || !camera) return;
  if (!viewEnabled && !force) return;

  const objects = gatherObjects().filter(obj => obj && obj.alive);
  if (objects.length === 0) {
    controls.target.set(0, 0, 0);
    camera.position.set(160, 180, 220);
    controls.update();
    needsFocusReset = false;
    return;
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  objects.forEach(obj => {
    if (obj.pos.x < minX) minX = obj.pos.x;
    if (obj.pos.x > maxX) maxX = obj.pos.x;
    if (obj.pos.y < minY) minY = obj.pos.y;
    if (obj.pos.y > maxY) maxY = obj.pos.y;
  });

  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const extent = Math.max(80, spanX, spanY);
  const centerX = (minX + maxX) / 2;
  const centerZ = -((minY + maxY) / 2);

  controls.target.set(centerX, 0, centerZ);
  const distance = extent * 1.5;
  const height = Math.max(120, extent * 0.9);
  camera.position.set(centerX + distance * 0.35, height, centerZ + distance);
  controls.update();
  needsFocusReset = false;
}

function updateToggleLabel() {
  const label = viewEnabled ? 'Hide Spacetime View' : 'Show Spacetime View';
  [toggleBtn, mobileToggleBtn].forEach(btn => {
    if (!btn) return;
    btn.textContent = label;
    btn.setAttribute('aria-pressed', viewEnabled ? 'true' : 'false');
    btn.dataset.state = viewEnabled ? 'on' : 'off';
  });

  if (!viewEnabled && statusLabel) {
    statusLabel.textContent = 'Hidden';
  }
}

export { init3DView, update3DScene };
