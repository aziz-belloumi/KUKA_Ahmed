import * as THREE from 'three';

/**
 * Lighting
 * Studio lighting system optimized for technical 3D robotics inspection.
 * Delivers crisp edge highlights, accurate surface definition, and soft ground shadows.
 */
export class Lighting {
  constructor(scene) {
    this.scene = scene;
    this.lights = {};

    this._setupLights();
  }

  _setupLights() {
    // 1. Ambient / Hemisphere Light (soft sky, soft upward bounce from floor)
    const hemiLight = new THREE.HemisphereLight(0xf4f7ff, 0x333b47, 1.1);
    hemiLight.position.set(0, 10, 0);
    this.scene.add(hemiLight);
    this.lights.hemi = hemiLight;

    // 2. Primary Key Light (Main casting shadow — warm white)
    const keyLight = new THREE.DirectionalLight(0xfff8f0, 1.8);
    keyLight.position.set(3.5, 5.5, 3.0);
    keyLight.castShadow = true;
    
    // Shadow parameters optimized for 1.5m robot
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 15;
    const shadowSize = 1.8;
    keyLight.shadow.camera.left = -shadowSize;
    keyLight.shadow.camera.right = shadowSize;
    keyLight.shadow.camera.top = shadowSize;
    keyLight.shadow.camera.bottom = -shadowSize;
    keyLight.shadow.bias = -0.0003;
    keyLight.shadow.normalBias = 0.02;
    keyLight.shadow.radius = 2.5;

    this.scene.add(keyLight);
    this.lights.key = keyLight;

    // 3. Fill Light (Opposite side — slightly cool blue-grey to contrast warm key)
    const fillLight = new THREE.DirectionalLight(0xc5d8ff, 0.85);
    fillLight.position.set(-3.0, 3.5, -2.5);
    fillLight.castShadow = false;
    this.scene.add(fillLight);
    this.lights.fill = fillLight;

    // 4. Rim / Silhouette Light (crisp white edge highlights on robot contours)
    const rimLight = new THREE.DirectionalLight(0xffffff, 1.1);
    rimLight.position.set(0.5, 4.0, -4.5);
    rimLight.castShadow = false;
    this.scene.add(rimLight);
    this.lights.rim = rimLight;

    // 5. Subtle Top Down Overhead Light
    const topLight = new THREE.DirectionalLight(0xffffff, 0.6);
    topLight.position.set(0, 6, 0);
    this.scene.add(topLight);
    this.lights.top = topLight;
  }
}
