/**
 * RobotConfiguration.js
 * Technical specifications, kinematic joint definitions, limits, and preset configurations
 * for the KUKA LBR iiwa 14 R820 7-DOF collaborative robotic arm.
 */

export const ROBOT_METADATA = {
  name: "KUKA LBR iiwa 14 R820",
  shortName: "LBR iiwa 14 R820",
  type: "7-DOF Collaborative Articulated Robot",
  manufacturer: "KUKA Roboter GmbH",
  dof: 7,
  payloadKg: 14.0,
  reachMm: 820.0,
  weightKg: 29.9,
  poseRepeatabilityMm: 0.1,
  controller: "KUKA Sunrise Cabinet",
  description: "Lightweight 7-axis sensitive robot arm designed for high-precision assembly, compliant human-robot collaboration, and tactile automation."
};

/**
 * Joint specifications derived directly from CAD geometry analysis
 * and official KUKA specifications.
 * Kinematic chain convention: Alternating Z-Y-Z-Y-Z-Y-Z axes.
 */
export const JOINT_DEFINITIONS = [
  {
    index: 0,
    id: "j1",
    label: "A1",
    name: "Joint 1 (A1 - Base Yaw)",
    description: "Rotates the entire arm around the vertical base axis",
    axis: { x: 0, y: 0, z: 1 },
    axisName: "Z",
    pivot: { x: 0, y: 0, z: 0.0 }, // Base origin
    minDeg: -170,
    maxDeg: 170,
    defaultDeg: 0,
    colorHex: 0x3b82f6
  },
  {
    index: 1,
    id: "j2",
    label: "A2",
    name: "Joint 2 (A2 - Shoulder Pitch)",
    description: "Bends the upper arm forward and backward",
    axis: { x: 0, y: 1, z: 0 },
    axisName: "Y",
    pivot: { x: 0, y: 0, z: 0.360 }, // 360mm from base
    minDeg: -120,
    maxDeg: 120,
    defaultDeg: 0,
    colorHex: 0x10b981
  },
  {
    index: 2,
    id: "j3",
    label: "A3",
    name: "Joint 3 (A3 - Upper Arm Roll)",
    description: "Rotates the arm segment along its longitudinal axis",
    axis: { x: 0, y: 0, z: 1 },
    axisName: "Z",
    pivot: { x: 0, y: 0, z: 0.0 }, // Co-located along the upper arm link
    minDeg: -170,
    maxDeg: 170,
    defaultDeg: 0,
    colorHex: 0x8b5cf6
  },
  {
    index: 3,
    id: "j4",
    label: "A4",
    name: "Joint 4 (A4 - Elbow Pitch)",
    description: "Elbow flexion and extension (420mm from shoulder)",
    axis: { x: 0, y: 1, z: 0 },
    axisName: "Y",
    pivot: { x: 0, y: 0, z: 0.420 }, // 420mm from J2 (780mm from base)
    minDeg: -120,
    maxDeg: 120,
    defaultDeg: 0,
    colorHex: 0xf59e0b
  },
  {
    index: 4,
    id: "j5",
    label: "A5",
    name: "Joint 5 (A5 - Forearm Roll)",
    description: "Rotates the forearm segment along its longitudinal axis",
    axis: { x: 0, y: 0, z: 1 },
    axisName: "Z",
    pivot: { x: 0, y: 0, z: 0.0 }, // Along forearm link
    minDeg: -170,
    maxDeg: 170,
    defaultDeg: 0,
    colorHex: 0x06b6d4
  },
  {
    index: 5,
    id: "j6",
    label: "A6",
    name: "Joint 6 (A6 - Wrist Pitch)",
    description: "Wrist articulation (400mm from elbow)",
    axis: { x: 0, y: 1, z: 0 },
    axisName: "Y",
    pivot: { x: 0, y: 0, z: 0.400 }, // 400mm from J4 (1180mm from base)
    minDeg: -120,
    maxDeg: 120,
    defaultDeg: 0,
    colorHex: 0xec4899
  },
  {
    index: 6,
    id: "j7",
    label: "A7",
    name: "Joint 7 (A7 - Flange Roll)",
    description: "Rotates the end-effector tool flange (80mm from wrist)",
    axis: { x: 0, y: 0, z: 1 },
    axisName: "Z",
    pivot: { x: 0, y: 0, z: 0.080 }, // 80mm from J6 (1260mm from base)
    minDeg: -175,
    maxDeg: 175,
    defaultDeg: 0,
    colorHex: 0xef4444
  }
];

/**
 * Predefined robotic poses for quick inspection and automated demonstrations.
 * Angles in degrees.
 */
export const PREDEFINED_POSES = {
  home: {
    name: "Home / Zero",
    description: "Upright neutral calibration pose (all joints at 0°)",
    angles: [0, 0, 0, 0, 0, 0, 0]
  },
  ready: {
    name: "Ready / Standby",
    description: "Typical industrial working standby pose",
    angles: [0, 30, 0, -60, 0, 45, 0]
  },
  reachForward: {
    name: "Forward Reach",
    description: "Arm extended forward for pick-and-place operation",
    angles: [0, 45, 0, 55, 0, -35, 0]
  },
  highInspect: {
    name: "High Inspection",
    description: "Elevated sensor inspection orientation",
    angles: [35, -30, 25, -70, 40, -45, 30]
  },
  sideWork: {
    name: "Side Workspace",
    description: "Transverse manipulation on lateral workcell station",
    angles: [65, 35, -40, 65, 30, -50, 20]
  },
  tableAssembly: {
    name: "Tabletop Assembly",
    description: "Lowered wrist oriented perpendicular to workspace table",
    angles: [-20, 50, 15, 75, -15, 45, 10]
  },
  compact: {
    name: "Compact / Folded",
    description: "Stowed transport configuration",
    angles: [0, 75, 0, 110, 0, 35, 0]
  }
};

/**
 * Demonstration animated sequences (sequences of waypoints)
 */
export const DEMO_SEQUENCES = [
  {
    id: "overview_demo",
    name: "Full 7-DOF Kinematic Tour",
    description: "Demonstrates articulated workspace volume and joint coordination",
    waypoints: [
      { angles: [0, 0, 0, 0, 0, 0, 0], duration: 1.5, pause: 0.5 },
      { angles: [0, 30, 0, -60, 0, 45, 0], duration: 2.0, pause: 0.4 },
      { angles: [45, 45, -30, 50, 25, -40, 15], duration: 2.2, pause: 0.4 },
      { angles: [-45, 35, 30, 60, -30, 40, -20], duration: 2.5, pause: 0.4 },
      { angles: [-60, -25, 45, -65, 50, -45, 40], duration: 2.2, pause: 0.4 },
      { angles: [0, 60, 0, 90, 0, 30, 0], duration: 2.0, pause: 0.4 },
      { angles: [0, 0, 0, 0, 0, 0, 0], duration: 2.0, pause: 0.8 }
    ]
  },
  {
    id: "pick_and_place",
    name: "Pick & Place Simulation",
    description: "Simulates grasping an object, transferring across workstations, and releasing",
    waypoints: [
      { angles: [0, 25, 0, -50, 0, 35, 0], duration: 1.5, pause: 0.3 },
      { angles: [-40, 45, -15, 60, 10, -40, 25], duration: 1.8, pause: 0.6 }, // Pick station
      { angles: [-40, 25, -10, 30, 10, -20, 25], duration: 1.2, pause: 0.2 }, // Lift
      { angles: [0, 15, 0, -20, 0, 15, 0], duration: 1.5, pause: 0.2 },      // Transfer transit
      { angles: [45, 25, 10, 30, -10, -20, -25], duration: 1.5, pause: 0.2 }, // Approach place
      { angles: [45, 45, 15, 60, -10, -40, -25], duration: 1.2, pause: 0.6 }, // Place station
      { angles: [45, 20, 10, 25, -10, -15, -25], duration: 1.0, pause: 0.2 }, // Retract
      { angles: [0, 0, 0, 0, 0, 0, 0], duration: 1.8, pause: 0.5 }           // Return home
    ]
  }
];
