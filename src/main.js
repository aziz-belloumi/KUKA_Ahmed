import { SceneManager } from './scene/SceneManager.js';
import { KukaRobot } from './robot/KukaRobot.js';
import { RobotControls } from './ui/RobotControls.js';

// DOM Elements
const canvasContainer = document.getElementById('canvas-container');
const uiContainer = document.getElementById('ui-container');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingBarFill = document.getElementById('loading-bar-fill');
const loadingStatusText = document.getElementById('loading-status-text');

async function initApplication() {
  try {
    // 1. Initialize Scene Manager (WebGL renderer, camera, lighting, studio floor)
    const sceneManager = new SceneManager(canvasContainer);

    // 2. Initialize Robot Controller
    const robot = new KukaRobot({
      modelPath: '/models/kuka_lbr_iiwa.glb'
    });
    sceneManager.scene.add(robot.object);

    // 3. Register robot animation & kinematics update in render loop
    sceneManager.onUpdate((delta) => {
      robot.update(delta);
    });

    // 4. Mount Engineering UI Controls
    const controls = new RobotControls(robot, sceneManager.camera);
    controls.mount(uiContainer);

    // 5. Load the converted CAD model with progress feedback
    loadingStatusText.textContent = "Loading CAD geometry...";
    await robot.load((percent) => {
      if (loadingBarFill) {
        loadingBarFill.style.width = `${Math.min(100, Math.max(5, percent))}%`;
      }
      loadingStatusText.textContent = `Loading CAD model (${Math.round(percent)}%)...`;
    });

    // 6. Complete loading and reveal interface
    loadingStatusText.textContent = "Robot assembled successfully";
    if (loadingBarFill) loadingBarFill.style.width = '100%';

    setTimeout(() => {
      loadingOverlay.classList.add('fade-out');
      setTimeout(() => {
        loadingOverlay.style.display = 'none';
      }, 500);
    }, 400);

    console.log("[App] KUKA LBR iiwa 14 R820 3D visualizer running smoothly.");
  } catch (error) {
    console.error("[App] Application initialization error:", error);
    showErrorScreen(error);
  }
}

function showErrorScreen(error) {
  if (!loadingOverlay) return;

  loadingOverlay.innerHTML = `
    <div class="error-banner">
      <h3 style="color:#ef4444; margin-bottom:8px; font-weight:700;">Failed to load KUKA robot model</h3>
      <p style="margin-bottom:12px;">${error.message || 'An error occurred while loading or parsing the 3D model.'}</p>
      <p style="font-size:11px; opacity:0.8;">Please check browser console for detailed diagnostic logs.</p>
      <button class="btn btn-primary" style="margin-top:14px;" onclick="window.location.reload()">Reload Application</button>
    </div>
  `;
}

// Start application
window.addEventListener('DOMContentLoaded', initApplication);
