import * as THREE from 'three';
import { JOINT_DEFINITIONS } from './RobotConfiguration.js';

/**
 * RobotKinematics
 * Builds and controls the 7-DOF kinematic chain for the KUKA LBR iiwa 14 R820.
 * Reconstructs physical pivot groups, manages joint angles, and evaluates forward kinematics.
 */
export class RobotKinematics {
  constructor(jointDefs = JOINT_DEFINITIONS) {
    this.jointDefs = jointDefs;
    
    // Centralized joint angles (in radians)
    this.jointAnglesRad = new Float32Array(this.jointDefs.length);
    
    // Root group for the entire robot
    this.root = new THREE.Group();
    this.root.name = "KUKA_LBR_iiwa_Root";
    // Orient so that CAD Z-up becomes Three.js Y-up (ground plane at Y=0)
    this.root.rotation.x = -Math.PI / 2;
    
    // Joint pivot groups (J1 through J7)
    this.jointGroups = [];
    
    // Link holder groups
    this.linkGroups = [];
    
    // Base group
    this.baseGroup = new THREE.Group();
    this.baseGroup.name = "BaseGroup";
    this.root.add(this.baseGroup);
    
    // End effector reference frame
    this.flangeTipGroup = new THREE.Group();
    this.flangeTipGroup.name = "EndEffectorFlangeTip";
    
    // Build kinematic chain
    this._buildKinematicChain();
    
    // Listeners for joint angle changes
    this.listeners = new Set();
  }

  /**
   * Constructs the nested THREE.Group tree representing the physical kinematic chain
   * RobotBase
   * └── Joint1Group
   *     └── Link1Group
   *     └── Joint2Group
   *         └── Link2Group
   *         └── Joint3Group
   *             └── Link3Group
   *             └── Joint4Group
   *                 └── Link4Group
   *                 └── Joint5Group
   *                     └── Link5Group
   *                     └── Joint6Group
   *                         └── Link6Group
   *                         └── Joint7Group
   *                             └── Link7Group
   *                             └── EndEffectorFlangeTip
   */
  _buildKinematicChain() {
    let parentGroup = this.root;

    for (let i = 0; i < this.jointDefs.length; i++) {
      const def = this.jointDefs[i];
      const jointGroup = new THREE.Group();
      jointGroup.name = `JointGroup_${def.id.toUpperCase()}_${def.label}`;
      
      // Position joint pivot relative to parent joint
      jointGroup.position.set(def.pivot.x, def.pivot.y, def.pivot.z);
      
      // Attach to parent joint (or root for J1)
      parentGroup.add(jointGroup);
      this.jointGroups.push(jointGroup);

      // Create link container group attached to this joint
      const linkGroup = new THREE.Group();
      linkGroup.name = `LinkGroup_${i + 1}`;
      jointGroup.add(linkGroup);
      this.linkGroups.push(linkGroup);

      // Next joint will be parented to this joint group
      parentGroup = jointGroup;
    }

    // Attach end effector tip to Joint 7
    // CAD tip is at Z = 1.306m, J7 pivot is at Z = 1.260m -> offset is +0.046m along Z
    this.flangeTipGroup.position.set(0, 0, 0.046);
    this.jointGroups[6].add(this.flangeTipGroup);
  }

  /**
   * Attaches the separated CAD mesh nodes to their respective link groups
   * and applies the exact negative pivot offset so mesh vertices align with the physical joint axis.
   * @param {Object} meshMap - dictionary containing meshes by link name
   */
  attachMeshes(meshMap) {
    // 1. Base mesh
    if (meshMap.base) {
      meshMap.base.forEach(m => this.baseGroup.add(m));
    }

    // Cumulative world pivot Z positions for each joint:
    // J1: 0.000m
    // J2: 0.360m
    // J3: 0.360m
    // J4: 0.780m
    // J5: 0.780m
    // J6: 1.180m
    // J7: 1.260m
    const cumulativePivotZ = [0.0, 0.360, 0.360, 0.780, 0.780, 1.180, 1.260];

    for (let i = 0; i < 7; i++) {
      const linkKey = `link_${i + 1}`;
      const meshes = meshMap[linkKey] || [];
      const linkGroup = this.linkGroups[i];
      const offsetZ = -cumulativePivotZ[i];

      meshes.forEach(mesh => {
        // Offset the mesh so that its CAD coordinates match the joint group origin
        mesh.position.set(0, 0, offsetZ);
        linkGroup.add(mesh);
      });
    }

    // Trigger initial zero pose update
    this.applyJointAngles();
  }

  /**
   * Set single joint angle in degrees
   * @param {number} index - 0 to 6
   * @param {number} deg - angle in degrees
   */
  setJointAngleDeg(index, deg) {
    if (index < 0 || index >= this.jointDefs.length) return;
    const def = this.jointDefs[index];
    const clampedDeg = Math.max(def.minDeg, Math.min(def.maxDeg, deg));
    this.jointAnglesRad[index] = THREE.MathUtils.degToRad(clampedDeg);
    this._applySingleJoint(index);
    this._notifyListeners();
  }

  /**
   * Set all joint angles in degrees
   * @param {number[]} anglesDeg - array of 7 angles in degrees
   */
  setAllJointAnglesDeg(anglesDeg) {
    for (let i = 0; i < this.jointDefs.length && i < anglesDeg.length; i++) {
      const def = this.jointDefs[i];
      const clampedDeg = Math.max(def.minDeg, Math.min(def.maxDeg, anglesDeg[i]));
      this.jointAnglesRad[i] = THREE.MathUtils.degToRad(clampedDeg);
      this._applySingleJoint(i);
    }
    this._notifyListeners();
  }

  /**
   * Set all joint angles in radians
   * @param {Float32Array|number[]} anglesRad - array of 7 angles in radians
   */
  setAllJointAnglesRad(anglesRad) {
    for (let i = 0; i < this.jointDefs.length && i < anglesRad.length; i++) {
      const def = this.jointDefs[i];
      const minRad = THREE.MathUtils.degToRad(def.minDeg);
      const maxRad = THREE.MathUtils.degToRad(def.maxDeg);
      this.jointAnglesRad[i] = Math.max(minRad, Math.min(maxRad, anglesRad[i]));
      this._applySingleJoint(i);
    }
    this._notifyListeners();
  }

  /**
   * Rotate a specific joint group according to its defined rotation axis
   * @param {number} index - 0 to 6
   */
  _applySingleJoint(index) {
    const group = this.jointGroups[index];
    const def = this.jointDefs[index];
    const angle = this.jointAnglesRad[index];

    if (def.axisName === 'Z') {
      group.rotation.set(0, 0, angle);
    } else if (def.axisName === 'Y') {
      group.rotation.set(0, angle, 0);
    } else if (def.axisName === 'X') {
      group.rotation.set(angle, 0, 0);
    }
  }

  /**
   * Applies all current angles to all joint groups
   */
  applyJointAngles() {
    for (let i = 0; i < this.jointDefs.length; i++) {
      this._applySingleJoint(i);
    }
    this._notifyListeners();
  }

  /**
   * Returns current joint angles in degrees
   * @returns {number[]}
   */
  getJointAnglesDeg() {
    return Array.from(this.jointAnglesRad).map(rad => THREE.MathUtils.radToDeg(rad));
  }

  /**
   * Returns current joint angles in radians
   * @returns {Float32Array}
   */
  getJointAnglesRad() {
    return this.jointAnglesRad;
  }

  /**
   * Calculates world cartesian position and orientation of the tool flange end-effector
   * @returns {{position: THREE.Vector3, rotationEuler: THREE.Euler, quaternion: THREE.Quaternion}}
   */
  getEndEffectorPose() {
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    this.flangeTipGroup.updateMatrixWorld(true);
    this.flangeTipGroup.matrixWorld.decompose(pos, quat, scale);

    const euler = new THREE.Euler().setFromQuaternion(quat, 'XYZ');

    return {
      position: pos,
      quaternion: quat,
      rotationEuler: euler
    };
  }

  /**
   * Subscribe to joint angle updates
   * @param {Function} callback
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  _notifyListeners() {
    const anglesDeg = this.getJointAnglesDeg();
    const eePose = this.getEndEffectorPose();
    for (const cb of this.listeners) {
      cb({ anglesDeg, anglesRad: this.jointAnglesRad, eePose });
    }
  }
}
