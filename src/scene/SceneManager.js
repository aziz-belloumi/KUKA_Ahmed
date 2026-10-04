import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Camera } from './Camera.js';
import { Lighting } from './Lighting.js';

/**
 * SceneManager
 * Sets up and manages the Three.js WebGL rendering pipeline, studio environment,
 * engineering floor grid with reach radius markings, and main render loop.
 */
export class SceneManager {
  constructor(canvasContainer) {
    this.container = canvasContainer;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x11141c); // Sleek studio dark slate background

    // 2. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      alpha: false
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.container.appendChild(this.renderer.domElement);

    // Setup PBR environment map so metallic and white materials render correctly
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = roomEnv;  // Applies to all MeshStandardMaterial / MeshPhysicalMaterial
    pmremGenerator.dispose();

    // 3. Camera & Navigation
    this.camera = new Camera(this.renderer.domElement);

    // 4. Lighting System
    this.lighting = new Lighting(this.scene);

    // 5. Environment & Floor Grid
    this._createFloor();

    // 6. Clock & Animation Loop
    this.clock = new THREE.Clock();
    this.updateCallbacks = new Set();
    this.isRunning = false;

    // 7. Resize handling
    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);

    this.start();
  }

  /**
   * Technical engineering floor with reach envelope markings
   */
  _createFloor() {
    const floorGroup = new THREE.Group();
    floorGroup.name = "EngineeringFloor";

    // A. Main Shadow Receiver Floor
    const floorGeo = new THREE.PlaneGeometry(16, 16);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x14181f,
      roughness: 0.85,
      metalness: 0.15,
      depthWrite: true
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -0.002;
    floorMesh.receiveShadow = true;
    floorGroup.add(floorMesh);

    // Center Mounting Pedestal Marker (neatly under robot base)
    const mountGeo = new THREE.CircleGeometry(0.18, 48);
    const mountMat = new THREE.MeshStandardMaterial({
      color: 0x1a202c,
      roughness: 0.7,
      metalness: 0.3
    });
    const mountDisc = new THREE.Mesh(mountGeo, mountMat);
    mountDisc.rotation.x = -Math.PI / 2;
    mountDisc.position.y = -0.0015;
    mountDisc.receiveShadow = true;
    floorGroup.add(mountDisc);

    // B. Precision Dual Grid (below y=0 so it never clips robot geometry)
    const mainGrid = new THREE.GridHelper(10, 20, 0x3b82f6, 0x1f293d);
    mainGrid.position.y = -0.001;
    mainGrid.material.opacity = 0.45;
    mainGrid.material.transparent = true;
    mainGrid.material.depthWrite = false;
    floorGroup.add(mainGrid);

    const subGrid = new THREE.GridHelper(10, 100, 0x1e293b, 0x182030);
    subGrid.position.y = -0.0012;
    subGrid.material.opacity = 0.25;
    subGrid.material.transparent = true;
    subGrid.material.depthWrite = false;
    floorGroup.add(subGrid);

    // C. 820 mm (0.82m) Max Reach Envelope Radial Guide Ring
    const reachRadius = 0.820; // 820mm
    const reachGeo = new THREE.RingGeometry(reachRadius - 0.004, reachRadius + 0.004, 96);
    const reachMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.4,
      depthWrite: false
    });
    const reachRing = new THREE.Mesh(reachGeo, reachMat);
    reachRing.rotation.x = -Math.PI / 2;
    reachRing.position.y = -0.0008;
    floorGroup.add(reachRing);

    // Subtle Inner Guide Ring (0.4m)
    const innerRadius = 0.400;
    const innerGeo = new THREE.RingGeometry(innerRadius - 0.002, innerRadius + 0.002, 64);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25,
      depthWrite: false
    });
    const innerRing = new THREE.Mesh(innerGeo, innerMat);
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.y = -0.0008;
    floorGroup.add(innerRing);

    this.scene.add(floorGroup);
  }

  /**
   * Registers a callback to be executed on each frame
   */
  onUpdate(callback) {
    this.updateCallbacks.add(callback);
    return () => this.updateCallbacks.delete(callback);
  }

  _onResize() {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.resize(width, height);
    this.renderer.setSize(width, height);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();

    const loop = () => {
      if (!this.isRunning) return;
      requestAnimationFrame(loop);

      const delta = Math.min(this.clock.getDelta(), 0.1); // Cap delta to prevent jump on tab switch

      // Update camera controls
      this.camera.update(delta);

      // Execute registered entity updates
      for (const cb of this.updateCallbacks) {
        cb(delta);
      }

      // Render frame
      this.renderer.render(this.scene, this.camera.camera);
    };

    loop();
  }

  stop() {
    this.isRunning = false;
    this.clock.stop();
  }

  dispose() {
    this.stop();
    window.removeEventListener('resize', this._onResize);
    this.renderer.dispose();
  }
}
