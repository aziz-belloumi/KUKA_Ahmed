import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RobotKinematics } from './RobotKinematics.js';
import { RobotAnimation } from './RobotAnimation.js';
import { ROBOT_METADATA, JOINT_DEFINITIONS, PREDEFINED_POSES, DEMO_SEQUENCES } from './RobotConfiguration.js';

/**
 * KukaRobot
 * Main controller for the KUKA LBR iiwa 14 R820 3D robot model.
 * Loads GLB CAD geometry, sets up kinematics, PBR materials, animations, and visual helpers.
 */
export class KukaRobot {
  constructor(options = {}) {
    this.modelPath = options.modelPath || '/models/kuka_lbr_iiwa.glb';
    this.metadata = ROBOT_METADATA;
    this.jointDefs = JOINT_DEFINITIONS;
    this.predefinedPoses = PREDEFINED_POSES;
    this.demoSequences = DEMO_SEQUENCES;

    // Kinematic chain
    this.kinematics = new RobotKinematics(this.jointDefs);
    
    // Animation controller
    this.animation = new RobotAnimation(this.kinematics);

    // Three.js object group added to scene
    this.object = new THREE.Group();
    this.object.name = "KUKA_Robot_Assembly";
    this.object.add(this.kinematics.root);

    // Visual helpers (hidden by default, depthTest=true so they don't render through solid meshes)
    this.flangeAxesHelper = new THREE.AxesHelper(0.12);
    this.flangeAxesHelper.renderOrder = 1;
    this.flangeAxesHelper.material.depthTest = true;
    this.flangeAxesHelper.material.transparent = false;
    this.flangeAxesHelper.visible = false;
    this.kinematics.flangeTipGroup.add(this.flangeAxesHelper);

    // Joint axis visualization helpers
    this.jointAxisHelpers = [];
    this._createJointAxisHelpers();

    // Material tracking for real-time theme / color customization
    this.bodyMeshes = [];      // Arm links (orange by default)
    this.jointMeshes = [];     // Rotating joints (Joints 2, 4, 6 - dark metallic gunmetal)
    this.graphiteMeshes = [];  // Base, joint rings, flange body
    this.steelMeshes = [];     // Fasteners and precision hardware
    this.currentTheme = 'orange';

    this.isLoaded = false;
  }

  /**
   * Creates subtle visual coordinate frames for each joint
   */
  _createJointAxisHelpers() {
    for (let i = 0; i < this.jointDefs.length; i++) {
      const def = this.jointDefs[i];
      const group = this.kinematics.jointGroups[i];

      const helper = new THREE.AxesHelper(0.08);
      helper.name = `AxisHelper_${def.label}`;
      helper.material.depthTest = true;
      helper.material.transparent = false;
      helper.visible = false; // Hidden by default, toggleable in UI
      group.add(helper);
      this.jointAxisHelpers.push(helper);
    }
  }

  /**
   * Loads the converted GLB CAD model
   * @param {Function} [onProgress]
   * @returns {Promise<void>}
   */
  load(onProgress = null) {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();

      loader.load(
        this.modelPath,
        (gltf) => {
          try {
            console.log(`[KukaRobot] Successfully loaded ${this.modelPath}`);
            const meshMap = this._categorizeMeshes(gltf.scene);
            this.kinematics.attachMeshes(meshMap);
            this.isLoaded = true;
            resolve();
          } catch (err) {
            console.error("[KukaRobot] Failed to assemble robot kinematics:", err);
            reject(err);
          }
        },
        (xhr) => {
          if (xhr.lengthComputable && onProgress) {
            const percent = (xhr.loaded / xhr.total) * 100;
            onProgress(percent);
          }
        },
        (err) => {
          console.error(`[KukaRobot] Failed to load KUKA robot model from ${this.modelPath}:`, err);
          reject(new Error(`Failed to load KUKA robot model from ${this.modelPath}. ${err.message || ''}`));
        }
      );
    });
  }

  /**
   * Traverses the GLB scene and sorts meshes by robot link
   * @param {THREE.Group} gltfScene
   * @returns {Object} map of link meshes
   */
  _categorizeMeshes(gltfScene) {
    const meshMap = {
      base: [],
      link_1: [],
      link_2: [],
      link_3: [],
      link_4: [],
      link_5: [],
      link_6: [],
      link_7: []
    };

    gltfScene.traverse((child) => {
      if (child.isMesh) {
        // Enable shadows
        child.castShadow = true;
        child.receiveShadow = true;

        // Enhance materials: strictly opaque, double-sided, proper depth test
        if (child.material) {
          child.material.side = THREE.DoubleSide;
          child.material.transparent = false;
          child.material.depthWrite = true;
          child.material.depthTest = true;
          child.material.envMapIntensity = 1.4;
          child.material.needsUpdate = true;
        }

        const name = (child.name || child.parent?.name || '').toLowerCase();

        // Track meshes for instant color customization
        if (name.includes('orange') || name.includes('link_1') || name.includes('link_3') || name.includes('link_5')) {
          this.bodyMeshes.push(child);
        }
        if (name.includes('joint') || name.includes('link_2') || name.includes('link_4') || name.includes('link_6')) {
          this.jointMeshes.push(child);
        }
        if (name.includes('graphite') || name.includes('anthracite') || name.includes('base')) {
          this.graphiteMeshes.push(child);
        }
        if (name.includes('steel') || name.includes('pin')) {
          this.steelMeshes.push(child);
        }

        if (name.includes('base')) {
          meshMap.base.push(child);
        } else if (name.includes('link_1')) {
          meshMap.link_1.push(child);
        } else if (name.includes('link_2')) {
          meshMap.link_2.push(child);
        } else if (name.includes('link_3')) {
          meshMap.link_3.push(child);
        } else if (name.includes('link_4')) {
          meshMap.link_4.push(child);
        } else if (name.includes('link_5')) {
          meshMap.link_5.push(child);
        } else if (name.includes('link_6')) {
          meshMap.link_6.push(child);
        } else if (name.includes('link_7')) {
          meshMap.link_7.push(child);
        } else {
          // Default fallback
          meshMap.base.push(child);
        }
      }
    });

    console.log("[KukaRobot] Identified CAD components:", {
      base: meshMap.base.length,
      link_1: meshMap.link_1.length,
      link_2: meshMap.link_2.length,
      link_3: meshMap.link_3.length,
      link_4: meshMap.link_4.length,
      link_5: meshMap.link_5.length,
      link_6: meshMap.link_6.length,
      link_7: meshMap.link_7.length,
      bodyMeshes: this.bodyMeshes.length,
      jointMeshes: this.jointMeshes.length,
      graphiteMeshes: this.graphiteMeshes.length
    });

    return meshMap;
  }

  /**
   * Sets a custom color on all rotating joints (Joints 2, 4, 6)
   * @param {string|number} colorHex
   * @param {number} [metalness=0.82]
   * @param {number} [roughness=0.32]
   */
  setJointColor(colorHex, metalness = 0.82, roughness = 0.32) {
    this.jointMeshes.forEach(mesh => {
      if (mesh.material) {
        mesh.material.color.set(colorHex);
        mesh.material.metalness = metalness;
        mesh.material.roughness = roughness;
        mesh.material.needsUpdate = true;
      }
    });
  }

  /**
   * Sets the visual color theme of the robot in real-time
   * @param {'orange'|'white'|'stealth'} themeName
   */
  setColorTheme(themeName) {
    this.currentTheme = themeName;
    const themes = {
      orange: {
        body: 0xff5500,     // Iconic KUKA RAL 2004 Pure Orange for arm links
        roughness: 0.28,
        metalness: 0.08,
        joint: 0x333842,    // High-tech dark metallic gunmetal for rotating joints
        jointMetalness: 0.82,
        jointRoughness: 0.32,
        graphite: 0x525761, // Slate graphite for base & joints
        steel: 0xe0e3e8     // Bright stainless steel
      },
      white: {
        body: 0xf5f6fa,     // Medical / Collaborative Pearl White
        roughness: 0.22,
        metalness: 0.02,
        joint: 0x2a2e36,    // Dark contrast joint housings
        jointMetalness: 0.75,
        jointRoughness: 0.35,
        graphite: 0x3d424c,
        steel: 0xd8dde4
      },
      stealth: {
        body: 0x2e323b,     // Industrial Titanium Dark
        roughness: 0.35,
        metalness: 0.65,
        joint: 0x181a1f,    // Obsidian Black joint casings
        jointMetalness: 0.88,
        jointRoughness: 0.25,
        graphite: 0x1f232b,
        steel: 0xff6600
      }
    };

    const t = themes[themeName] || themes.orange;

    this.bodyMeshes.forEach(mesh => {
      if (mesh.material) {
        mesh.material.color.setHex(t.body);
        mesh.material.roughness = t.roughness;
        mesh.material.metalness = t.metalness;
        mesh.material.needsUpdate = true;
      }
    });

    this.jointMeshes.forEach(mesh => {
      if (mesh.material) {
        mesh.material.color.setHex(t.joint);
        mesh.material.roughness = t.jointRoughness;
        mesh.material.metalness = t.jointMetalness;
        mesh.material.needsUpdate = true;
      }
    });

    this.graphiteMeshes.forEach(mesh => {
      if (mesh.material) {
        mesh.material.color.setHex(t.graphite);
        mesh.material.needsUpdate = true;
      }
    });

    this.steelMeshes.forEach(mesh => {
      if (mesh.material) {
        mesh.material.color.setHex(t.steel);
        mesh.material.needsUpdate = true;
      }
    });
  }

  /**
   * Set single joint angle in degrees immediately (manual control)
   */
  setJointAngle(index, deg) {
    // If an animated sequence was running, cancel it so user has direct control
    if (this.animation.isAnimating || this.animation.isPlayingSequence) {
      this.animation.stopSequence();
    }
    this.kinematics.setJointAngleDeg(index, deg);
  }

  /**
   * Smoothly move to a predefined pose
   * @param {string} poseKey - key from PREDEFINED_POSES
   * @param {number} [duration=1.5]
   */
  goToPose(poseKey, duration = 1.5) {
    const pose = this.predefinedPoses[poseKey];
    if (pose) {
      this.animation.stopSequence();
      this.animation.animateTo(pose.angles, duration);
    }
  }

  /**
   * Smoothly move to random valid configuration within joint limits
   */
  randomPose(duration = 1.5) {
    this.animation.stopSequence();
    const randomAngles = this.jointDefs.map((def) => {
      // Pick within 80% of motion limit for safety/aesthetics
      const range = (def.maxDeg - def.minDeg) * 0.8;
      const center = (def.maxDeg + def.minDeg) / 2;
      return Math.round(center + (Math.random() - 0.5) * range);
    });
    this.animation.animateTo(randomAngles, duration);
  }

  /**
   * Return robot smoothly to home/zero position
   */
  home(duration = 1.5) {
    this.animation.home(duration);
  }

  /**
   * Toggle visibility of joint axis helpers
   */
  setAxisHelpersVisible(visible) {
    this.jointAxisHelpers.forEach(h => h.visible = visible);
    this.flangeAxesHelper.visible = visible;
  }

  /**
   * Updates animations and kinematics per frame
   * @param {number} deltaSec
   */
  update(deltaSec) {
    this.animation.update(deltaSec);
  }
}
