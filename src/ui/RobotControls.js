/**
 * RobotControls.js
 * Professional engineering UI controller for the KUKA LBR iiwa 14 R820.
 * Manages 7 joint sliders, preset pose selector, animation playback controls,
 * camera controls, joint limit readouts, and end-effector cartesian telemetry.
 */

export class RobotControls {
  /**
   * @param {import('../robot/KukaRobot.js').KukaRobot} robot
   * @param {import('../scene/Camera.js').Camera} camera
   */
  constructor(robot, camera) {
    this.robot = robot;
    this.camera = camera;

    this.sliderElements = [];
    this.valueBadgeElements = [];
    this.isUpdatingFromRobot = false;

    this._bindEvents();
    this._setupTelemetryUpdates();
  }

  /**
   * Mounts the UI into the DOM
   */
  mount(rootContainer) {
    this.container = rootContainer;
    this.container.innerHTML = this._generateHTML();

    this._cacheElements();
    this._attachEventListeners();
    this.updateSlidersFromRobot();
  }

  _generateHTML() {
    const meta = this.robot.metadata;
    const jointDefs = this.robot.jointDefs;
    const presets = this.robot.predefinedPoses;
    const sequences = this.robot.demoSequences;

    return `
      <div class="app-layout">
        <!-- Main 3D Viewport Header Overlay -->
        <header class="top-bar">
          <div class="brand-badge">
            <div class="brand-logo-accent"></div>
            <div class="brand-titles">
              <h1 class="brand-title">${meta.name}</h1>
              <p class="brand-subtitle">${meta.type} &bull; ${meta.payloadKg}kg Payload &bull; ${meta.reachMm}mm Reach</p>
            </div>
          </div>
          
          <div class="top-quick-actions">
            <!-- Color Theme Selector -->
            <div class="theme-selector-group" title="Select Robot Body Theme">
              <button class="theme-pill active theme-body-btn" data-theme="orange" title="KUKA Signature Industrial Orange">
                <span class="theme-color-dot" style="background:#ff5500;"></span>
                <span>Orange</span>
              </button>
              <button class="theme-pill theme-body-btn" data-theme="white" title="Collaborative Cleanroom White">
                <span class="theme-color-dot" style="background:#f5f6fa; border: 1px solid rgba(255,255,255,0.4);"></span>
                <span>White</span>
              </button>
              <button class="theme-pill theme-body-btn" data-theme="stealth" title="Dark Titanium Stealth">
                <span class="theme-color-dot" style="background:#2e323b; border: 1px solid rgba(255,255,255,0.2);"></span>
                <span>Titanium</span>
              </button>
            </div>

            <!-- Joint Color Selector -->
            <div class="theme-selector-group" title="Rotating Joints Color (A2, A4, A6)">
              <span style="font-size:10px; font-weight:700; color:var(--text-secondary); padding: 0 4px; text-transform:uppercase; letter-spacing:0.04em;">Joints:</span>
              <button class="theme-pill active joint-color-btn" data-joint-color="#333842" data-joint-metal="0.82" data-joint-rough="0.32" title="Dark Gunmetal (High Contrast)">
                <span class="theme-color-dot" style="background:#333842; border: 1px solid rgba(255,255,255,0.25);"></span>
                <span>Gunmetal</span>
              </button>
              <button class="theme-pill joint-color-btn" data-joint-color="#8c94a4" data-joint-metal="0.88" data-joint-rough="0.22" title="Machined Silver / Aluminum">
                <span class="theme-color-dot" style="background:#8c94a4; border: 1px solid rgba(255,255,255,0.4);"></span>
                <span>Silver</span>
              </button>
              <button class="theme-pill joint-color-btn" data-joint-color="#14161a" data-joint-metal="0.70" data-joint-rough="0.30" title="Obsidian Black">
                <span class="theme-color-dot" style="background:#14161a; border: 1px solid rgba(255,255,255,0.15);"></span>
                <span>Black</span>
              </button>
              <button class="theme-pill joint-color-btn" data-joint-color="#c27803" data-joint-metal="0.85" data-joint-rough="0.26" title="Machined Bronze Accent">
                <span class="theme-color-dot" style="background:#c27803; border: 1px solid rgba(255,255,255,0.25);"></span>
                <span>Bronze</span>
              </button>
            </div>

            <button id="btn-camera-reset" class="btn btn-secondary btn-sm" title="Reset camera to default view">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                <path d="M16 21h5v-5"/>
              </svg>
              <span>Reset View</span>
            </button>
            
            <button id="btn-toggle-axes" class="btn btn-secondary btn-sm" title="Toggle joint & tool coordinate frames">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m2 2 20 20M2 12h20M12 2v20"/>
              </svg>
              <span>Frames</span>
            </button>

            <button id="btn-quick-home" class="btn btn-primary btn-sm" title="Return smoothly to Home pose">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <span>Home</span>
            </button>
          </div>
        </header>

        <!-- Right Side Floating Engineering Control Panel -->
        <aside class="control-panel">
          <div class="panel-header">
            <div class="panel-title-wrap">
              <span class="panel-status-dot online"></span>
              <h2 class="panel-title">Articulated Joint Control</h2>
            </div>
            <span class="dof-pill">7-DOF</span>
          </div>

          <!-- Section: 7 Independent Joint Sliders -->
          <div class="panel-section joint-sliders-section">
            <div class="section-title-row">
              <span class="section-label">Joint Coordinates</span>
              <button id="btn-zero-all" class="btn-text-link" title="Set all joint angles to 0°">Zero All</button>
            </div>

            <div class="joint-controls-list">
              ${jointDefs.map((joint, idx) => `
                <div class="joint-slider-row" id="row-joint-${idx}">
                  <div class="joint-slider-header">
                    <div class="joint-tag">
                      <span class="joint-id-badge" style="border-color: #${joint.colorHex.toString(16).padStart(6, '0')}">${joint.label}</span>
                      <span class="joint-desc-text">${joint.name.split(' - ')[1] || joint.name}</span>
                    </div>
                    <div class="joint-val-group">
                      <span class="joint-axis-tag">${joint.axisName}-Axis</span>
                      <span class="joint-value-badge" id="val-joint-${idx}">0.0°</span>
                    </div>
                  </div>

                  <div class="joint-slider-container">
                    <span class="slider-limit-label">${joint.minDeg}°</span>
                    <input 
                      type="range" 
                      id="slider-joint-${idx}" 
                      class="joint-slider" 
                      min="${joint.minDeg}" 
                      max="${joint.maxDeg}" 
                      step="0.5" 
                      value="${joint.defaultDeg}"
                      title="${joint.name}: [${joint.minDeg}° to ${joint.maxDeg}°]"
                    />
                    <span class="slider-limit-label">+${joint.maxDeg}°</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Section: Predefined Poses -->
          <div class="panel-section">
            <span class="section-label">Target Configurations</span>
            <div class="pose-presets-grid">
              ${Object.entries(presets).map(([key, pose]) => `
                <button class="btn btn-preset" data-pose="${key}" title="${pose.description}">
                  ${pose.name}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Section: Demonstration Sequences & Automation -->
          <div class="panel-section">
            <span class="section-label">Kinematic Sequences</span>
            
            <div class="sequence-selector-wrap">
              <select id="select-demo-sequence" class="form-select">
                ${sequences.map(seq => `
                  <option value="${seq.id}">${seq.name}</option>
                `).join('')}
              </select>
            </div>

            <div class="animation-buttons-row">
              <button id="btn-start-anim" class="btn btn-accent flex-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                <span>Run Demo</span>
              </button>

              <button id="btn-stop-anim" class="btn btn-secondary" title="Halt playback">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12"/>
                </svg>
                <span>Halt</span>
              </button>

              <button id="btn-random-pose" class="btn btn-secondary" title="Random valid configuration">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                </svg>
                <span>Random</span>
              </button>
            </div>

            <div id="anim-progress-bar-wrap" class="anim-progress-bar-wrap hidden">
              <div class="anim-status-text">
                <span id="anim-status-label">Trajectory Active</span>
                <span id="anim-step-label">Step 1/7</span>
              </div>
              <div class="progress-track">
                <div id="anim-progress-bar" class="progress-fill"></div>
              </div>
            </div>
          </div>

          <!-- Section: Real-time Telemetry Readout -->
          <div class="panel-section telemetry-section">
            <span class="section-label">Tool Center Point (TCP) Telemetry</span>
            <div class="telemetry-grid">
              <div class="telemetry-card">
                <span class="telemetry-axis">X (Lateral)</span>
                <span class="telemetry-val" id="tcp-x">0.000 m</span>
              </div>
              <div class="telemetry-card">
                <span class="telemetry-axis">Y (Vertical)</span>
                <span class="telemetry-val" id="tcp-y">1.306 m</span>
              </div>
              <div class="telemetry-card">
                <span class="telemetry-axis">Z (Depth)</span>
                <span class="telemetry-val" id="tcp-z">0.000 m</span>
              </div>
              <div class="telemetry-card">
                <span class="telemetry-axis">Reach Extent</span>
                <span class="telemetry-val" id="tcp-reach">0.000 m</span>
              </div>
            </div>
          </div>
        </aside>

        <!-- Viewport Instructions / Hints Overlay -->
        <div class="viewport-hints">
          <span class="hint-item"><kbd>Left Mouse</kbd> Rotate</span>
          <span class="hint-item"><kbd>Right Mouse</kbd> Pan</span>
          <span class="hint-item"><kbd>Scroll</kbd> Zoom</span>
        </div>
      </div>
    `;
  }

  _cacheElements() {
    this.sliderElements = [];
    this.valueBadgeElements = [];

    for (let i = 0; i < 7; i++) {
      const slider = this.container.querySelector(`#slider-joint-${i}`);
      const badge = this.container.querySelector(`#val-joint-${i}`);
      this.sliderElements.push(slider);
      this.valueBadgeElements.push(badge);
    }

    this.btnCameraReset = this.container.querySelector('#btn-camera-reset');
    this.btnToggleAxes = this.container.querySelector('#btn-toggle-axes');
    this.btnQuickHome = this.container.querySelector('#btn-quick-home');
    this.btnZeroAll = this.container.querySelector('#btn-zero-all');
    this.btnStartAnim = this.container.querySelector('#btn-start-anim');
    this.btnStopAnim = this.container.querySelector('#btn-stop-anim');
    this.btnRandomPose = this.container.querySelector('#btn-random-pose');
    this.selectSequence = this.container.querySelector('#select-demo-sequence');
    this.animProgressWrap = this.container.querySelector('#anim-progress-bar-wrap');
    this.animStatusLabel = this.container.querySelector('#anim-status-label');
    this.animStepLabel = this.container.querySelector('#anim-step-label');
    this.animProgressBar = this.container.querySelector('#anim-progress-bar');

    this.tcpX = this.container.querySelector('#tcp-x');
    this.tcpY = this.container.querySelector('#tcp-y');
    this.tcpZ = this.container.querySelector('#tcp-z');
    this.tcpReach = this.container.querySelector('#tcp-reach');
  }

  _attachEventListeners() {
    // 1. Joint Slider Inputs
    this.sliderElements.forEach((slider, idx) => {
      slider.addEventListener('input', (e) => {
        if (this.isUpdatingFromRobot) return;
        const val = parseFloat(e.target.value);
        this.robot.setJointAngle(idx, val);
        this._updateValueBadge(idx, val);
      });

      // Double click slider to reset single joint to 0
      slider.addEventListener('dblclick', () => {
        slider.value = 0;
        this.robot.setJointAngle(idx, 0);
        this._updateValueBadge(idx, 0);
      });
    });

    // 2. Quick Home & Zero
    this.btnQuickHome?.addEventListener('click', () => {
      this.robot.home(1.5);
    });

    this.btnZeroAll?.addEventListener('click', () => {
      this.robot.home(1.2);
    });

    // 3. Random Pose
    this.btnRandomPose?.addEventListener('click', () => {
      this.robot.randomPose(1.5);
    });

    // 4. Predefined Poses buttons
    const presetButtons = this.container.querySelectorAll('.btn-preset');
    presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const poseKey = btn.getAttribute('data-pose');
        this.robot.goToPose(poseKey, 1.6);
      });
    });

    // 5. Sequence Animation Playback
    this.btnStartAnim?.addEventListener('click', () => {
      const seqId = this.selectSequence.value;
      const sequence = this.robot.demoSequences.find(s => s.id === seqId);
      if (sequence) {
        this.robot.animation.playSequence(sequence, true);
      }
    });

    this.btnStopAnim?.addEventListener('click', () => {
      this.robot.animation.stopSequence();
    });

    // 6. Camera Reset
    this.btnCameraReset?.addEventListener('click', () => {
      this.camera.reset(1.0);
    });

    // 7. Toggle Coordinate Frames
    let framesVisible = false;
    this.btnToggleAxes?.addEventListener('click', () => {
      framesVisible = !framesVisible;
      this.robot.setAxisHelpersVisible(framesVisible);
      this.btnToggleAxes.classList.toggle('active', framesVisible);
    });

    // 8. Body Color Scheme Selector
    const themeBodyButtons = this.container.querySelectorAll('.theme-body-btn');
    themeBodyButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        themeBodyButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const theme = btn.getAttribute('data-theme');
        this.robot.setColorTheme(theme);
      });
    });

    // 9. Rotating Joints Color Customization
    const jointColorButtons = this.container.querySelectorAll('.joint-color-btn');
    jointColorButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        jointColorButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const color = btn.getAttribute('data-joint-color');
        const metal = parseFloat(btn.getAttribute('data-joint-metal') || '0.8');
        const rough = parseFloat(btn.getAttribute('data-joint-rough') || '0.3');
        this.robot.setJointColor(color, metal, rough);
      });
    });
  }

  _updateValueBadge(index, deg) {
    const badge = this.valueBadgeElements[index];
    if (badge) {
      const sign = deg > 0 ? '+' : '';
      badge.textContent = `${sign}${deg.toFixed(1)}°`;
      if (Math.abs(deg) > 0.1) {
        badge.classList.add('nonzero');
      } else {
        badge.classList.remove('nonzero');
      }
    }
  }

  /**
   * Refreshes all sliders and badges to match current robot kinematics
   */
  updateSlidersFromRobot() {
    this.isUpdatingFromRobot = true;
    const angles = this.robot.kinematics.getJointAnglesDeg();
    for (let i = 0; i < 7; i++) {
      const deg = angles[i];
      if (this.sliderElements[i]) {
        this.sliderElements[i].value = deg;
      }
      this._updateValueBadge(i, deg);
    }
    this.isUpdatingFromRobot = false;
  }

  _setupTelemetryUpdates() {
    // Kinematic updates (joint sliders and TCP position)
    this.robot.kinematics.subscribe(({ anglesDeg, eePose }) => {
      if (!this.isUpdatingFromRobot) {
        this.updateSlidersFromRobot();
      }

      // Update Cartesian TCP Telemetry
      if (this.tcpX && eePose) {
        const pos = eePose.position;
        this.tcpX.textContent = `${pos.x.toFixed(3)} m`;
        this.tcpY.textContent = `${pos.y.toFixed(3)} m`;
        this.tcpZ.textContent = `${pos.z.toFixed(3)} m`;
        
        // Horizontal radial reach from base origin
        const radialReach = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
        this.tcpReach.textContent = `${radialReach.toFixed(3)} m`;
      }
    });

    // Animation progress updates
    this.robot.animation.onStatusChange((status) => {
      if (status.isPlayingSequence) {
        this.animProgressWrap?.classList.remove('hidden');
        if (this.animStatusLabel) this.animStatusLabel.textContent = status.sequenceName || "Playing Sequence";
        if (this.animStepLabel) this.animStepLabel.textContent = `Pose ${status.waypointIndex + 1}/${status.totalWaypoints}`;
        if (this.animProgressBar) {
          const percent = ((status.waypointIndex + 1) / status.totalWaypoints) * 100;
          this.animProgressBar.style.width = `${percent}%`;
        }
      } else {
        this.animProgressWrap?.classList.add('hidden');
      }
    });
  }

  _bindEvents() {
    // Keyboard shortcuts: 'H' for home, 'R' for random, Space for camera reset
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      if (e.key === 'h' || e.key === 'H') {
        this.robot.home(1.5);
      } else if (e.key === 'r' || e.key === 'R') {
        this.robot.randomPose(1.5);
      } else if (e.key === ' ') {
        this.camera.reset(1.0);
      }
    });
  }
}
