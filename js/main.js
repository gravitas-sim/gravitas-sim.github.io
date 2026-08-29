// Import specific functions from modules
import { resizeCanvas, gameLoop, generateStarfield } from './render.js';
import {
  initialize_simulation,
  state,
  updateSpeedDisplay,
  updateObjectTypeButton,
} from './ui.js';
import { init3DView } from './view3d.js';
import { initLightCurve } from './lightCurve.js';
import { initControls } from './controls.js';
import { initTutorial } from './tutorial.js';

// Add global flag to track splash screen status
window.isSplashActive = true;

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('simulationCanvas');
  const starfieldCanvas = document.getElementById('starfieldCanvas');
  const splash = document.getElementById('splash');

  // Validate canvas context
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    alert(
      'Error: Could not get 2D context. Your browser may not support canvas.'
    );
    return;
  }

  /*  nothing to show at first ↓  */
  canvas.classList.remove('showCanvas');
  starfieldCanvas.classList.remove('showCanvas');

  // The entire UI reveal used to hang on this one animationend event. If the
  // animation never runs — reduced-motion, a background tab at load, an
  // interrupted animation — the page stayed black for ever with no recovery.
  // revealApp() is idempotent and also runs on a timer as a backstop.
  let revealed = false;

  const revealApp = () => {
    if (revealed) return;
    revealed = true;
    splash.remove();

    // Set global flag to indicate splash screen has ended
    window.splashScreenEnded = true;

    // Update global flag
    window.isSplashActive = false;

    canvas.classList.add('showCanvas'); // NOW fade the sim in
    starfieldCanvas.classList.add('showCanvas');

    // Generate starfield after canvases are visible
    generateStarfield();

    // Show UI elements after a short delay
    setTimeout(async () => {
      document.querySelector('.ui-container').classList.add('showUI');
      document.getElementById('overlay').classList.add('showUI');
      const sonificationPanel = document.getElementById('sonificationControl');
      if (sonificationPanel) {
        sonificationPanel.classList.add('showUI');
      }

      // Set up overlay minimize functionality
      const { setupOverlayMinimize } = await import('./ui.js');
      setupOverlayMinimize();

      // On a phone the readout starts collapsed — expanded it covers most of
      // the screen, and the simulation is the point.
      const { collapseReadoutOnSmallScreens } = await import('./controls.js');
      collapseReadoutOnSmallScreens();

      // Show scenario info box after splash ends
      const scenarioInfoBox = document.getElementById('scenarioInfoBox');
      if (scenarioInfoBox) {
        scenarioInfoBox.classList.add('showUI');
      }

      // Show the narrow-screen menu button. The rail itself *is* the menu it
      // opens, so there is no separate dropdown to reveal.
      document.getElementById('mobileMenuToggle')?.classList.add('showUI');

      // Fade in the transport bar with the rest of the UI
      const timelineBar = document.getElementById('timelineBar');
      if (timelineBar) {
        timelineBar.classList.add('showUI');
      }

      // Fade in the tutorial button with the rest of the UI
      const tutorialBtn = document.getElementById('tutorialBtn');
      if (tutorialBtn) {
        tutorialBtn.classList.add('showUI');
      }
      // Fade in the attribution text with the rest of the UI
      const attribution = document.getElementById('attribution');
      if (attribution) {
        attribution.classList.add('showUI');
      }

      // Show object inspector after splash ends (it will be hidden by default)
      const objectInspector = document.getElementById('objectInspector');
      if (objectInspector) {
        objectInspector.classList.add('showUI');
      }
    }, 200);
  };

  splash.addEventListener('animationend', e => {
    if (e.animationName === 'splashFadeOut') revealApp();
  });

  // Backstop: the splash animation totals ~3.5s, so this only fires when the
  // event genuinely did not arrive.
  setTimeout(revealApp, 4500);

  // A tab that was hidden at load gets its animations deferred; reveal as soon
  // as it becomes visible rather than waiting out the timer.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) setTimeout(revealApp, 100);
  });

  // Initialize object type button
  updateObjectTypeButton();

  // Initialize speed display
  updateSpeedDisplay();

  // Color randomizer easter egg (triple-click settings button)
  let settingsClickCount = 0;
  let settingsClickTimer = null;
  document.getElementById('settingsBtn').addEventListener('click', () => {
    settingsClickCount++;
    if (settingsClickTimer) clearTimeout(settingsClickTimer);

    settingsClickTimer = setTimeout(async () => {
      if (settingsClickCount >= 3) {
        // Randomize colors
        const randomColor = () =>
          '#' +
          Math.floor(Math.random() * 16777215)
            .toString(16)
            .padStart(6, '0');
        // Access SETTINGS through the UI module
        const { SETTINGS } = await import('./ui.js');
        SETTINGS.planet_base_color = randomColor();
        SETTINGS.star_base_color = randomColor();
        alert('🎨 Colors randomized! Check the settings panel.');
      }
      settingsClickCount = 0;
    }, 500);
  });

  // Mobile double-tap handling for reset view
  let lastTap = 0;
  canvas.addEventListener('touchend', _e => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    if (tapLength < 500 && tapLength > 0) {
      // Double tap detected - reset view
      state.zoom = 1.0;
      state.pan = { x: 0.0, y: 0.0 };
    }
    lastTap = currentTime;
  });

  // Show mobile instructions for first-time mobile users
  // More specific mobile detection to avoid showing on desktop
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  const isSmallScreen = window.innerWidth <= 768;

  if (isMobile && isSmallScreen) {
    const mobileInstructions = document.getElementById('mobileInstructions');
    if (
      mobileInstructions &&
      !localStorage.getItem('mobile_instructions_shown')
    ) {
      mobileInstructions.style.display = 'block';
      localStorage.setItem('mobile_instructions_shown', 'true');

      // Auto-hide after 5 seconds if user doesn't interact
      setTimeout(() => {
        if (mobileInstructions.style.display === 'block') {
          mobileInstructions.style.display = 'none';
        }
      }, 5000);
    }
  }

  // Initialize with error handling
  try {
    resizeCanvas();
    // Controls own the theme, so they initialise before anything paints.
    initControls();
    initTutorial();
    init3DView();
    // An optional panel must never take the simulation down with it.
    try {
      initLightCurve();
    } catch (err) {
      console.error('Light curve unavailable:', err);
    }

    // Ensure inspector is hidden on page load
    const inspector = document.getElementById('objectInspector');
    if (inspector) {
      inspector.style.display = 'none';
      inspector.classList.remove('visible');
    }

    initialize_simulation();
    requestAnimationFrame(gameLoop);
  } catch (error) {
    console.error('Initialization failed:', error);
    alert('Failed to initialize simulation. Please refresh the page.');
  }
});
