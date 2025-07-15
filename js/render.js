import {
  bh_list,
  planets,
  stars,
  gas_giants,
  asteroids,
  debris,
  particles,
  neutron_stars,
  white_dwarfs,
  accretion_disk_particles,
  updatePhysics,
  DT,
  SOLAR_MASS_UNIT,
  gravity_ripples,
  screen_to_world,
  world_to_screen,
  findObjectAtPosition,
} from './physics.js';
import { hexToRgb } from './utils.js';
import { SETTINGS, state, showObjectInspector, hideObjectInspector } from './ui.js';

const canvas = document.getElementById('simulationCanvas');
const ctx = canvas.getContext('2d');
const overlayDiv = document.getElementById('overlay');
// Starfield and rendering functions
const starfieldCanvas = document.getElementById('starfieldCanvas');
const starCtx = starfieldCanvas.getContext('2d');
const starfieldStars = [];

// Ensure canvas is properly sized on initialization
if (starfieldCanvas) {
  starfieldCanvas.width = window.innerWidth;
  starfieldCanvas.height = window.innerHeight;
  
  // Generate initial starfield
  setTimeout(() => {
    generateStarfield();
  }, 100);
} else {
  console.error('Starfield canvas not found!');
}

/**
 * Create ambient gradient for starfield background
 * @returns {CanvasGradient} Linear gradient for ambient lighting effect
 */
const createAmbientGradient = () => {
  const grad = starCtx.createLinearGradient(0, 0, 0, starfieldCanvas.height);
  grad.addColorStop(0, '#1a1a3a');
  grad.addColorStop(1, '#0a0a1a');
  return grad;
};

/**
 * Generate random starfield
 * Creates stars with random positions, brightness, and size
 */
function generateStarfield() {
  starfieldStars.length = 0;
  
  const totalStars = SETTINGS.star_density || 300; // Lower default density
  const W = starfieldCanvas.width;
  const H = starfieldCanvas.height;
  
  // Generate stars with smaller size in screen coordinates
  for (let i = 0; i < totalStars; i++) {
    starfieldStars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      b: Math.random() * 0.8 + 0.2, // Brightness: 0.2 to 1.0
      s: Math.random() * 1.0 + 0.5, // Size: 0.5 to 1.5 (smaller)
      twinkle: Math.random() * Math.PI * 2 // Random twinkle phase
    });
  }
  
  drawStarfield();
}

function drawStarfield() {
  const W = starfieldCanvas.width;
  const H = starfieldCanvas.height;

  // Clear the starfield canvas
  starCtx.setTransform(1, 0, 0, 1, 0, 0);
  starCtx.clearRect(0, 0, W, H);

  // Draw background gradient
  starCtx.fillStyle = SETTINGS.show_ambient_lighting
    ? createAmbientGradient()
    : '#0d0d1a';
  starCtx.fillRect(0, 0, W, H);

  const c = 0.18; // Speed of light in world units per ms (tweak for simulation scale)
  // --- Gravitational wave ripples (placeholder effect) ---
  if (SETTINGS.show_gravitational_waves) {
    const now = performance.now();
    for (let i = gravity_ripples.length - 1; i >= 0; i--) {
      const ripple = gravity_ripples[i];
      const age = now - ripple.created;
      if (age > ripple.duration) {
        gravity_ripples.splice(i, 1);
        continue;
      }
      // Convert world coordinates to screen
      const screen = world_to_screen({ x: ripple.x, y: ripple.y });
      // Amplitude and wavelength scale with merger mass
      const mass = ripple.mass || 1.0;
      const amplitude = 8 + 10 * Math.log10(mass + 1); // px, more for higher mass
      const wavelength = 80 + 40 * Math.log10(mass + 1); // px, more for higher mass
      const radius = c * age * state.zoom;
      const progress = age / ripple.duration;
      // Fade out as ripple expands
      const alpha = 0.18 * (1 - progress) * (1 - progress);
      for (let j = 0; j < 3; j++) {
        const r = radius + j * wavelength;
        // Color shift: blue at leading edge, red at trailing edge
        const phase = (progress + j * 0.18) % 1.0;
        const color = `hsl(${220 - 120 * phase}, 90%, 70%)`; // 220=blue, 100=red
        starCtx.save();
        starCtx.globalAlpha = alpha * (1 - j * 0.25);
        starCtx.beginPath();
        starCtx.arc(screen.x, screen.y, r + Math.sin(progress * Math.PI * 2 + j) * amplitude, 0, 2 * Math.PI);
        starCtx.lineWidth = 4 + 2 * (1 - progress);
        starCtx.strokeStyle = color;
        starCtx.shadowColor = color;
        starCtx.shadowBlur = 8;
        starCtx.stroke();
        starCtx.restore();
      }
    }
  }

  // Draw stars as static background (no zoom or pan transformations)
  const time = Date.now() * 0.001; // Current time for twinkling

  starfieldStars.forEach(st => {
    let sx = st.x;
    let sy = st.y;
    // Apply lensing distortion if within any active ripple
    if (SETTINGS.show_gravitational_waves) {
      for (let i = 0; i < gravity_ripples.length; i++) {
        const ripple = gravity_ripples[i];
        const now = performance.now();
        const age = now - ripple.created;
        if (age > ripple.duration) continue;
        // Amplitude and wavelength scale with merger mass
        const mass = ripple.mass || 1.0;
        const amplitude = 8 + 10 * Math.log10(mass + 1);
        const wavelength = 80 + 40 * Math.log10(mass + 1);
        // Convert ripple center to screen
        const screen = world_to_screen({ x: ripple.x, y: ripple.y });
        const radius = c * age * state.zoom;
        const progress = age / ripple.duration;
        const dx = sx - screen.x;
        const dy = sy - screen.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < radius + 1.5 * wavelength && dist > 8) {
          // Sine-based lensing: offset outward, modulated by ripple
          const phase = (dist - radius) / wavelength;
          const local_amp = amplitude * Math.exp(-Math.abs(phase));
          const factor = local_amp * Math.sin(phase * Math.PI * 2 - progress * Math.PI * 2);
          sx += (dx / dist) * factor;
          sy += (dy / dist) * factor;
        }
      }
    }
    // Add subtle twinkling effect
    const twinkle = Math.sin(time * 2 + st.twinkle) * 0.1 + 0.9;
    const brightness = st.b * twinkle;
    starCtx.globalAlpha = brightness;
    starCtx.fillStyle = '#fff';
    starCtx.fillRect(sx, sy, st.s, st.s);
  });

  starCtx.globalAlpha = 1;
}

// Remove all lensing-related functions and variables below this point.
// Only keep starfield rendering, generation, and unrelated rendering logic.

// Original drawScene function from index.html
const drawScene = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0); 
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(canvas.width / 2 + state.pan.x, canvas.height / 2 + state.pan.y);
    ctx.scale(state.zoom, -state.zoom);


    if (SETTINGS.show_trails) {
        [...planets, ...gas_giants, ...asteroids, ...stars, ...neutron_stars, ...white_dwarfs].forEach(obj => {
            if (obj.alive && obj.trail.length > 1) {
                const baseColor = obj.baseColor || SETTINGS[`${obj.obj_type.toLowerCase()}_base_color`] || '#6495ed';
                const rgb = hexToRgb(baseColor);
                
                if (SETTINGS.trail_style === "Cloud") {
                    // Draw cloud-like trail with multiple passes
                    for (let pass = 0; pass < 3; pass++) {
                        const trailWidth = (2.5 - pass * 0.5) / state.zoom;
                        const maxAlpha = 0.6 - pass * 0.15;
                        
                        ctx.lineWidth = trailWidth;
                        ctx.lineCap = 'round';
                        ctx.lineJoin = 'round';
                        
                        ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${maxAlpha})`;
                        ctx.beginPath();
                        
                        // Draw trail with smooth curves and fade-out (use world coordinates directly)
                        ctx.moveTo(obj.trail[0].x, obj.trail[0].y);
                        
                        for (let i = 1; i < obj.trail.length; i++) {
                            const age_factor = 1 - (obj.trail[i].age / SETTINGS.trail_length);
                            const velocity_factor = Math.min(1, obj.trail[i].velocity / 50);
                            const alpha = age_factor * velocity_factor * maxAlpha;
                            
                            ctx.globalAlpha = alpha;
                            
                            // Use quadratic curves for smoother trails
                            if (i < obj.trail.length - 1) {
                                const cp_x = (obj.trail[i].x + obj.trail[i + 1].x) / 2;
                                const cp_y = (obj.trail[i].y + obj.trail[i + 1].y) / 2;
                                ctx.quadraticCurveTo(obj.trail[i].x, obj.trail[i].y, cp_x, cp_y);
                            } else {
                                ctx.lineTo(obj.trail[i].x, obj.trail[i].y);
                            }
                        }
                        ctx.stroke();
                    }
                    
                    // Draw bright core trail
                    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.9)`;
                    ctx.lineWidth = 1.0 / state.zoom;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    
                    ctx.moveTo(obj.trail[0].x, obj.trail[0].y);
                    
                    for (let i = 1; i < obj.trail.length; i++) {
                        const age_factor = 1 - (obj.trail[i].age / SETTINGS.trail_length);
                        ctx.globalAlpha = age_factor * 0.9;
                        ctx.lineTo(obj.trail[i].x, obj.trail[i].y);
                    }
                    ctx.stroke();
                    
                } else if (SETTINGS.trail_style === "Glow") {
                    // Draw glowing trail with radial gradients
                    for (let i = 0; i < obj.trail.length; i++) {
                        const age_factor = 1 - (obj.trail[i].age / SETTINGS.trail_length);
                        const velocity_factor = Math.min(1, obj.trail[i].velocity / 50);
                        const intensity = age_factor * velocity_factor;
                        
                        if (intensity > 0.05) {
                            const radius = (3 + intensity * 5) / state.zoom;
                            const gradient = ctx.createRadialGradient(obj.trail[i].x, obj.trail[i].y, 0, obj.trail[i].x, obj.trail[i].y, radius);
                            gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${intensity * 0.8})`);
                            gradient.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${intensity * 0.3})`);
                            gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
                            
                            ctx.fillStyle = gradient;
                            ctx.beginPath();
                            ctx.arc(obj.trail[i].x, obj.trail[i].y, radius, 0, 2 * Math.PI);
                            ctx.fill();
                        }
                    }
                    
                } else { // Simple style
                    // Draw simple trail with fade-out
                    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`;
                    ctx.lineWidth = 1.5 / state.zoom;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    
                    ctx.moveTo(obj.trail[0].x, obj.trail[0].y);
                    
                    for (let i = 1; i < obj.trail.length; i++) {
                        const age_factor = 1 - (obj.trail[i].age / SETTINGS.trail_length);
                        ctx.globalAlpha = age_factor * 0.8;
                        ctx.lineTo(obj.trail[i].x, obj.trail[i].y);
                    }
                    ctx.stroke();
                }
            }
        });
        ctx.globalAlpha = 1; 
    }

    [...debris, ...asteroids, ...planets, ...gas_giants, ...stars, ...neutron_stars, ...white_dwarfs].forEach(obj => { if (obj.alive) obj.draw(ctx); });
    
    particles.forEach(p => p.draw(ctx));
    
    // Draw accretion disk particles (they are drawn by black holes but also independently for cleanup)
    accretion_disk_particles.forEach(ap => { if (ap.alive) ap.draw(ctx); });
    
    // Draw gravity ripples (behind black holes)
    
    ctx.globalAlpha = 1;
    
    bh_list.forEach(bh => bh.draw(ctx));
    
    // Draw hover effect for clickable objects - draw in world coordinates since canvas is already transformed
    if (!state.inspector_open && state.user_has_interacted) {
        const worldPos = screen_to_world(state.mouse);
        const hoveredObject = findObjectAtPosition(worldPos);
        if (hoveredObject) {
            // Draw circle in world coordinates (canvas is already transformed)
            const obj_pos = hoveredObject.object.pos;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 2 / state.zoom;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(obj_pos.x, obj_pos.y, hoveredObject.object.radius + 5 / state.zoom, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    // Draw tooltip in screen coordinates (will be drawn after ctx.restore)
    if (!state.inspector_open && state.user_has_interacted) {
        const worldPos = screen_to_world(state.mouse);
        const hoveredObject = findObjectAtPosition(worldPos);
        if (hoveredObject) {
            const tooltipX = state.mouse.x + 15;
            const tooltipY = state.mouse.y - 10;
            
            // Get object info for tooltip
            let tooltipText = '';
            switch (hoveredObject.type) {
                case 'BlackHole':
                    const bhMass = (hoveredObject.object.mass / SOLAR_MASS_UNIT).toFixed(1);
                    tooltipText = `Black Hole (${bhMass} M☉) - Click to inspect`;
                    break;
                case 'Star':
                    const starMass = (hoveredObject.object.massInSuns || hoveredObject.object.mass / SOLAR_MASS_UNIT).toFixed(2);
                    tooltipText = `Star (${starMass} M☉) - Click to inspect`;
                    break;
                case 'Planet':
                    tooltipText = `Planet - Click to inspect`;
                    break;
                case 'GasGiant':
                    const gasGiantMass = (hoveredObject.object.massInJupiters || hoveredObject.object.mass / 50.0).toFixed(2);
                    tooltipText = `Gas Giant (${gasGiantMass} M♃) - Click to inspect`;
                    break;
                case 'Asteroid':
                    tooltipText = `Asteroid - Click to inspect`;
                    break;
                case 'NeutronStar':
                    const neutronMass = (hoveredObject.object.massInSuns || hoveredObject.object.mass / SOLAR_MASS_UNIT).toFixed(2);
                    tooltipText = `Neutron Star (${neutronMass} M☉) - Click to inspect`;
                    break;
                case 'WhiteDwarf':
                    const whiteDwarfMass = (hoveredObject.object.massInSuns || hoveredObject.object.mass / SOLAR_MASS_UNIT).toFixed(2);
                    tooltipText = `White Dwarf (${whiteDwarfMass} M☉) - Click to inspect`;
                    break;
                case 'Comet':
                    const cometMass = (hoveredObject.object.massInComets || 0.001).toFixed(3);
                    tooltipText = `Comet (${cometMass} C) - Click to inspect`;
                    break;
            }
            
            // Draw tooltip background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(tooltipX - 5, tooltipY - 20, ctx.measureText(tooltipText).width + 10, 25);
            
            // Draw tooltip text
            ctx.fillStyle = 'white';
            ctx.font = '12px Poppins';
            ctx.fillText(tooltipText, tooltipX, tooltipY);
        }
    }

    ctx.restore();
    
    if (state.adding_mass) {
        // Draw drag line
        ctx.strokeStyle = 'lime'; 
        ctx.lineWidth = 3; 
        ctx.lineCap = 'round';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(state.add_start_screen.x, state.add_start_screen.y);
        ctx.lineTo(state.mouse.x, state.mouse.y); 
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw start point
        ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
        ctx.beginPath();
        ctx.arc(state.add_start_screen.x, state.add_start_screen.y, 8, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw end point
        ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
        ctx.beginPath();
        ctx.arc(state.mouse.x, state.mouse.y, 6, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw velocity arrow
        const dx = state.mouse.x - state.add_start_screen.x;
        const dy = state.mouse.y - state.add_start_screen.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 20) {
            const angle = Math.atan2(dy, dx);
            const arrowLength = 20;
            const arrowAngle = Math.PI / 6;
            
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.9)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(state.mouse.x, state.mouse.y);
            ctx.lineTo(
                state.mouse.x - arrowLength * Math.cos(angle - arrowAngle),
                state.mouse.y - arrowLength * Math.sin(angle - arrowAngle)
            );
            ctx.moveTo(state.mouse.x, state.mouse.y);
            ctx.lineTo(
                state.mouse.x - arrowLength * Math.cos(angle + arrowAngle),
                state.mouse.y - arrowLength * Math.sin(angle + arrowAngle)
            );
            ctx.stroke();
        }
    }

    if (SETTINGS.show_dynamic_overlays) {
        const lines = [ 
            `<span class="category-label">Planets:</span> ${planets.length} | <span class="category-label">Gas Giants:</span> ${gas_giants.length} | <span class="category-label">Asteroids:</span> ${asteroids.length}`, 
            `<span class="category-label">Stars:</span> ${stars.length} | <span class="category-label">Neutron Stars:</span> ${neutron_stars.length} | <span class="category-label">White Dwarfs:</span> ${white_dwarfs.length}`, 
            `<span class="category-label">Black Holes:</span> ${bh_list.length} | <span class="category-label">Particles:</span> ${particles.length} | <span class="category-label">Debris:</span> ${debris.length}`, 
            `<div class="separator-line"></div>`, 
            `<span class="important-stat"><span class="category-label">Zoom:</span> ${state.zoom.toFixed(2)}x | <span class="category-label">Sim Speed:</span> ${SETTINGS.sim_speed.toFixed(1)}x</span>`, 
            `<span class="important-stat"><span class="category-label">Status:</span> ${state.paused ? 'Paused (Space)' : 'Running'}</span>`,
            `<div class="separator-line"></div>`,
            `🖱️ <span class="category-label">Controls:</span> Arrow Keys = Pan | Mouse Wheel = Zoom`,
            `Click objects to inspect | ESC to close inspector`
        ];
        overlayDiv.innerHTML = lines.join('<br>');
    } else {
        overlayDiv.innerHTML = '';
    }
};

// Performance monitoring
let frameCount = 0;
let lastPerformanceLog = 0;
let frameTimeSum = 0;

// Original gameLoop function from index.html
const gameLoop = (timestamp) => {
    const frameStart = performance.now();
    
    if (!state.last_time) state.last_time = timestamp; 
    const dt_seconds = (timestamp - state.last_time) / 1000.0;
    state.last_time = timestamp;
    const dt_sim = Math.min(dt_seconds, 0.05) * SETTINGS.sim_speed * 50 * DT;
    if (!state.paused) updatePhysics(dt_sim);
    
    // Draw star field first (background layer)
    drawStarfield();
    
    // Draw simulation objects (foreground layer)
    drawScene();
    
    // Performance monitoring
    const frameTime = performance.now() - frameStart;
    frameTimeSum += frameTime;
    frameCount++;
    
    // Log performance every 5 seconds
    if (timestamp - lastPerformanceLog > 5000) {
      const avgFrameTime = frameTimeSum / frameCount;
      if (avgFrameTime > 16.67) { // Only log if performance is poor
        console.log(`Performance warning: Average frame time ${avgFrameTime.toFixed(1)}ms (target: 16.67ms for 60fps)`);
      }
      frameTimeSum = 0;
      frameCount = 0;
      lastPerformanceLog = timestamp;
    }
    
    requestAnimationFrame(gameLoop);
};

// Original resizeCanvas function from index.html
function resizeCanvas(){
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width  = W;  canvas.height  = H;        // sim layer
    starfieldCanvas.width  = W; starfieldCanvas.height = H; // star layer
    generateStarfield();                           // redraw background
}
window.addEventListener('resize', resizeCanvas);



// Export functions
export {
  generateStarfield,
  drawStarfield,
  drawScene,
  gameLoop,
  resizeCanvas,
};
