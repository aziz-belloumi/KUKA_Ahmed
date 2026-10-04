/**
 * RobotAnimation.js
 * Smooth interpolation and multi-waypoint sequence player for the KUKA LBR iiwa robot.
 */

export class RobotAnimation {
  /**
   * @param {import('./RobotKinematics.js').RobotKinematics} kinematics
   */
  constructor(kinematics) {
    this.kinematics = kinematics;

    // Active interpolation state
    this.isAnimating = false;
    this.startAngles = new Float32Array(7);
    this.targetAngles = new Float32Array(7);
    this.currentAngles = new Float32Array(7);
    this.duration = 1.5; // seconds
    this.elapsedTime = 0.0;
    this.onCompleteCallback = null;

    // Multi-waypoint demonstration sequence state
    this.isPlayingSequence = false;
    this.currentSequence = null;
    this.currentWaypointIndex = 0;
    this.isPausedInWaypoint = false;
    this.pauseRemaining = 0.0;
    this.loopSequence = true;

    // Listeners for animation status changes
    this.statusListeners = new Set();
  }

  /**
   * Smooth easing function (cubic ease-in-out for smooth robotic acceleration & deceleration)
   */
  _easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * Animate smoothly from current joint angles to target angles
   * @param {number[]} targetAnglesDeg - 7 target joint angles in degrees
   * @param {number} durationSec - transition duration in seconds (default 1.5s)
   * @param {Function} [onComplete] - callback when transition finishes
   */
  animateTo(targetAnglesDeg, durationSec = 1.5, onComplete = null) {
    const current = this.kinematics.getJointAnglesDeg();
    for (let i = 0; i < 7; i++) {
      this.startAngles[i] = current[i];
      this.targetAngles[i] = targetAnglesDeg[i];
    }
    this.duration = Math.max(0.1, durationSec);
    this.elapsedTime = 0.0;
    this.onCompleteCallback = onComplete;
    this.isAnimating = true;

    this._notifyStatus();
  }

  /**
   * Smoothly return to Home pose (all joints at 0°)
   * @param {number} [durationSec=1.5]
   */
  home(durationSec = 1.5) {
    this.stopSequence();
    this.animateTo([0, 0, 0, 0, 0, 0, 0], durationSec);
  }

  /**
   * Play a multi-waypoint demonstration sequence
   * @param {Object} sequenceDef - sequence definition from RobotConfiguration
   * @param {boolean} [loop=true]
   */
  playSequence(sequenceDef, loop = true) {
    if (!sequenceDef || !sequenceDef.waypoints || sequenceDef.waypoints.length === 0) return;

    this.currentSequence = sequenceDef;
    this.currentWaypointIndex = 0;
    this.loopSequence = loop;
    this.isPlayingSequence = true;
    this.isPausedInWaypoint = false;

    this._startNextWaypoint();
    this._notifyStatus();
  }

  /**
   * Pauses the active sequence or animation
   */
  pause() {
    this.isAnimating = false;
    this._notifyStatus();
  }

  /**
   * Stops sequence and cancels active transition
   */
  stopSequence() {
    this.isPlayingSequence = false;
    this.currentSequence = null;
    this.currentWaypointIndex = 0;
    this.isAnimating = false;
    this.isPausedInWaypoint = false;
    this._notifyStatus();
  }

  _startNextWaypoint() {
    if (!this.isPlayingSequence || !this.currentSequence) return;

    const waypoints = this.currentSequence.waypoints;
    if (this.currentWaypointIndex >= waypoints.length) {
      if (this.loopSequence) {
        this.currentWaypointIndex = 0;
      } else {
        this.stopSequence();
        return;
      }
    }

    const wp = waypoints[this.currentWaypointIndex];
    this.animateTo(wp.angles, wp.duration || 1.8, () => {
      // Pause at waypoint if specified
      if (wp.pause && wp.pause > 0) {
        this.isPausedInWaypoint = true;
        this.pauseRemaining = wp.pause;
      } else {
        this.currentWaypointIndex++;
        this._startNextWaypoint();
      }
    });

    this._notifyStatus();
  }

  /**
   * Updates interpolation frame. Must be called in the main requestAnimationFrame loop.
   * @param {number} deltaSec - delta time in seconds
   */
  update(deltaSec) {
    // 1. Handle pause between waypoints
    if (this.isPlayingSequence && this.isPausedInWaypoint) {
      this.pauseRemaining -= deltaSec;
      if (this.pauseRemaining <= 0) {
        this.isPausedInWaypoint = false;
        this.currentWaypointIndex++;
        this._startNextWaypoint();
      }
      return;
    }

    // 2. Handle active interpolation
    if (!this.isAnimating) return;

    this.elapsedTime += deltaSec;
    const progress = Math.min(1.0, this.elapsedTime / this.duration);
    const ease = this._easeInOutCubic(progress);

    for (let i = 0; i < 7; i++) {
      this.currentAngles[i] = this.startAngles[i] + (this.targetAngles[i] - this.startAngles[i]) * ease;
    }

    this.kinematics.setAllJointAnglesDeg(this.currentAngles);

    if (progress >= 1.0) {
      this.isAnimating = false;
      const cb = this.onCompleteCallback;
      this.onCompleteCallback = null;
      if (cb) cb();
      this._notifyStatus();
    }
  }

  /**
   * Subscribe to animation status changes
   */
  onStatusChange(callback) {
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }

  _notifyStatus() {
    const status = {
      isAnimating: this.isAnimating,
      isPlayingSequence: this.isPlayingSequence,
      sequenceName: this.currentSequence ? this.currentSequence.name : null,
      waypointIndex: this.currentWaypointIndex,
      totalWaypoints: this.currentSequence ? this.currentSequence.waypoints.length : 0
    };
    for (const cb of this.statusListeners) {
      cb(status);
    }
  }
}
