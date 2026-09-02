// Import specific functions from modules
import { resizeCanvas, gameLoop, generateStarfield } from './render.js';
import {
  initialize_simulation,
  state,
  updateSpeedDisplay,
  updateObjectTypeButton,
} from './ui.js';
import { watchFor3DView } from './view3dBridge.js';
import { initLightCurve } from './lightCurve.js';
import { initRadialVelocity } from './radialVelocity.js';
import { initRotationCurve } from './rotationCurve.js';
import { initAstrometry } from './astrometry.js';
import { initObservationLayout } from './observationLayout.js';
import { initControls } from './controls.js';
import { initTutorial } from './tutorial.js';
import { initShare, hasSharedLink, applySharedLinkFromUrl } from './share.js';
import { initExportDialog } from './exportDialog.js';
import { watchForInvestigations } from './investigationsLoader.js';
import { initWelcome, openWelcome, shouldShowWelcome } from './welcome.js';
import { initScenarioBrowser } from './scenarioBrowser.js';

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

  // Whether this load ends at the front door rather than at the sandbox.
  // Decided once, at boot: a first-time visitor with no deep link in the URL.
  // Reading it here rather than at splash-end means the answer cannot change
  // underneath the start-up sequence.
  const frontDoorPending = shouldShowWelcome();

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

    // The two paths diverge here, and only here. A returning visitor gets the
    // interface exactly as before. A first-time visitor gets the front door
    // over a simulation that is already running, and the interface is revealed
    // only once they enter: splash straight to welcome, with no flash of a
    // control rail in between, and nothing underneath competing for attention.
    if (frontDoorPending) {
      openWelcome({ automatic: true, onEnter: revealInterface });
    } else {
      revealInterface();
    }
  };

  /**
   * Fade in the interface and run the start-up notices that belong with it.
   *
   * Split out of revealApp() so the front door can hold it back: the scenario
   * card and the touch-controls popup both hide themselves on a timer, and
   * raising either behind a full-screen welcome layer would burn that timer
   * where nobody can see them.
   */
  function revealInterface() {
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

      // Show scenario info box after splash ends, unless a lesson has already
      // started: a deep link straight into an investigation opens the panel
      // before this fires, and the card lands on top of its instruments.
      const scenarioInfoBox = document.getElementById('scenarioInfoBox');
      if (
        scenarioInfoBox &&
        !document.body.classList.contains('investigation-open')
      ) {
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

      showMobileInstructionsOnce();
    }, 200);
  }

  /**
   * The touch-controls popup, on a phone, on the first visit only.
   *
   * Called from revealInterface() rather than at DOMContentLoaded, which is
   * what keeps a first-time phone visitor from meeting the front door and this
   * popup at once. It hides itself after five seconds, so on a first visit it
   * used to spend those five seconds behind the welcome layer and be gone by
   * the time anyone reached the simulation.
   */
  function showMobileInstructionsOnce() {
    // More specific mobile detection to avoid showing on desktop
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
    if (!isMobile || window.innerWidth > 768) return;

    const mobileInstructions = document.getElementById('mobileInstructions');
    if (!mobileInstructions) return;
    try {
      if (localStorage.getItem('mobile_instructions_shown')) return;
      localStorage.setItem('mobile_instructions_shown', 'true');
    } catch {
      // Storage refused. Showing the instructions once per load is a better
      // failure than never showing them.
    }

    mobileInstructions.style.display = 'block';
    setTimeout(() => {
      if (mobileInstructions.style.display === 'block') {
        mobileInstructions.style.display = 'none';
      }
    }, 5000);
  }

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

  // Initialize with error handling
  try {
    resizeCanvas();
    // Controls own the theme, so they initialize before anything paints.
    initControls();
    initTutorial();
    // Not init3DView(): that reaches three.js, 256KB from a CDN, for a panel
    // that starts closed. The bridge holds the button until it is pressed.
    watchFor3DView();
    // An optional panel must never take the simulation down with it.
    try {
      initLightCurve();
      initRadialVelocity();
      initRotationCurve();
      initAstrometry();
      initObservationLayout();
    } catch (err) {
      console.error('Light curve unavailable:', err);
    }

    // Ensure inspector is hidden on page load
    const inspector = document.getElementById('objectInspector');
    if (inspector) {
      inspector.style.display = 'none';
      inspector.classList.remove('visible');
    }

    initShare();
    initExportDialog();
    // Not initInvestigations(): the lesson system is half the bundle and is
    // loaded the first time somebody asks for it. See investigationsLoader.js.
    watchForInvestigations();
    initWelcome();
    // The gallery does not load scenarios itself: it hands the chosen key to
    // the one authoritative loader, the same one the front door's featured
    // cards use.
    initScenarioBrowser({
      onScenarioSelected: async key => {
        const { loadScenarioByKey } = await import('./ui.js');
        loadScenarioByKey(key);
      },
    });
    if (hasSharedLink()) {
      // A link names its own scenario, so building the default one first would
      // be work thrown away — and on a heavy scenario that is a visible stall.
      // Decoding is async (the payload is deflated), so the loop starts on an
      // empty world for a frame or two, behind the splash.
      applySharedLinkFromUrl().then(applied => {
        if (!applied) initialize_simulation();
      });
    } else {
      initialize_simulation();
    }
    requestAnimationFrame(gameLoop);
  } catch (error) {
    console.error('Initialization failed:', error);
    alert('Failed to initialize simulation. Please refresh the page.');
  }
});
