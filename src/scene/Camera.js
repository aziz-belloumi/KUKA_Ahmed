import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Camera
 * Manages perspective camera, smooth OrbitControls, and camera presets/reset.
 */
export class Camera {
  constructor(canvas) {
    this.canvas = canvas;

    // Default vantage point showing full robot in 3D perspective
    this.defaultPosition = new THREE.Vector3(1.8, 1.5, 2.0);
    this.defaultTarget = new THREE.Vector3(0, 0.65, 0);

    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      45,
      canvas.clientWidth / canvas.clientHeight,
      0.05,
      100
    );
    this.camera.position.copy(this.defaultPosition);

    // Create OrbitControls
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.copy(this.defaultTarget);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 0.4;
    this.controls.maxDistance = 8.0;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02; // Don't dip below floor level

    // Camera animation state
    this.isTransitioning = false;
    this.startCamPos = new THREE.Vector3();
    this.targetCamPos = new THREE.Vector3();
    this.startTargetPos = new THREE.Vector3();
    this.endTargetPos = new THREE.Vector3();
    this.camProgress = 0;
    this.camDuration = 1.0;
  }

  /**
   * Resets camera smoothly to default vantage point
   */
  reset(duration = 1.0) {
    this.animateTo(this.defaultPosition, this.defaultTarget, duration);
  }

  /**
   * Smoothly interpolate camera position and target
   */
  animateTo(newPosition, newTarget, duration = 1.0) {
    this.startCamPos.copy(this.camera.position);
    this.targetCamPos.copy(newPosition);
    this.startTargetPos.copy(this.controls.target);
    this.endTargetPos.copy(newTarget);

    this.camDuration = Math.max(0.1, duration);
    this.camProgress = 0;
    this.isTransitioning = true;
  }

  /**
   * Updates controls and any active transition
   * @param {number} deltaSec
   */
  update(deltaSec) {
    if (this.isTransitioning) {
      this.camProgress += deltaSec / this.camDuration;
      const t = Math.min(1.0, this.camProgress);
      // Smooth cubic ease
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      this.camera.position.lerpVectors(this.startCamPos, this.targetCamPos, ease);
      this.controls.target.lerpVectors(this.startTargetPos, this.endTargetPos, ease);

      if (t >= 1.0) {
        this.isTransitioning = false;
      }
    }

    this.controls.update();
  }

  /**
   * Handle canvas resize
   */
  resize(width, height) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
