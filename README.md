# KUKA LBR iiwa 14 R820 - Interactive 3D Kinematics Visualization

A high-performance, engineering-grade Three.js 3D web application that loads, visualizes, and animates the **KUKA LBR iiwa 14 R820** 7-DOF collaborative robotic arm directly converted from the provided CAD STEP model (`ROBOT KUKA LBR IIWA 14 R820.stp`).

> **Quick Documentation Links:**
> - [HOW_TO_RUN.md](HOW_TO_RUN.md) — Comprehensive guide on launching, using all interactive UI features, and building the project.
> - [REQUIREMENTS.md](REQUIREMENTS.md) — Detailed software, runtime, hardware, and CAD specifications.
> - [requirements.txt](requirements.txt) — Python dependencies for the CAD conversion pipeline.

---

## 1. Project Purpose

The primary objective of this project is to convert the supplied industrial CAD assembly of the **KUKA LBR iiwa 14 R820** into an interactive, browser-friendly 3D visualization. The application provides:

* Complete interactive 3D inspection of the robot with OrbitControls (rotate, pan, zoom).
* Reconstructed 7-DOF mechanical joint hierarchy where each joint rotates strictly around its true physical axis and pivot location.
* Independent joint control via seven dedicated sliders with real-time degree and radian readouts.
* Predefined industrial robotic poses (Home, Ready, Forward Reach, High Inspection, Side Workspace, Compact).
* Automated multi-waypoint demonstration animations with smooth cubic easing interpolation.
* Real-time Tool Center Point (TCP) cartesian telemetry $(X, Y, Z)$ and reach radius calculations.
* Sleek, modern technical interface with dark theme, glassmorphism, coordinate frame helpers, and responsive layout.

---

## 2. Requirements

* **Node.js**: v18.0.0 or later (Tested on Node.js v22.13.0)
* **npm**: v9.0.0 or later
* **Modern Web Browser**: Chrome, Edge, Firefox, or Safari with WebGL 2.0 support.
* *(Optional for CAD re-conversion)*: Python 3.10+ with `cadquery-ocp-novtk`, `cascadio`, `trimesh`, `scipy`, `numpy`.

---

## 3. Installation

Clone or open the repository directory, then install the Node.js dependencies:

```bash
npm install
```

---

## 4. How to Run the Application

### Development Server

Start the local Vite development server:

```bash
npm run dev
```

Open your browser and navigate to:
```
http://localhost:5173/
```

### Production Build

To produce an optimized production bundle:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

---

## 5. How the STEP Model was Converted

The original source CAD file `ROBOT KUKA LBR IIWA 14 R820.stp` (10.1 MB) was converted into an optimized, multi-mesh GLB (`public/models/kuka_lbr_iiwa.glb`, 3.43 MB) through a dedicated Python conversion pipeline:

1. **CAD Topological Analysis (`inspect_step_solids.py` & `analyze_joints.py`)**:
   - OpenCASCADE Technology (OCCT 8.0 via `cadquery-ocp-novtk`) was used to inspect the STEP assembly structure.
   - Identified **15 distinct solids** in the STEP compound representation.
   - Cylindrical surface adaptor analysis extracted the exact rotational symmetry axes, joint centers, and bearing alignments for all 7 degrees of freedom.
2. **Component Link Categorization**:
   - **Solid 14**: Robot Base (mounting plate & lower casing).
   - **Solid 13**: Link 1 (A1 azimuth casing & base collar).
   - **Solid 12**: Link 2 (A2 shoulder segment).
   - **Solid 11**: Link 3 (A3 upper arm rotation body).
   - **Solid 10**: Link 4 (A4 elbow joint segment).
   - **Solid 09**: Link 5 (A5 forearm rotation body).
   - **Solid 08**: Link 6 (A6 wrist pitch segment).
   - **Solids 00, 01, 02–07**: Link 7 & Tool Flange (rotating flange disk and steel/brass mounting pins).
3. **High-Fidelity Tessellation (`convert_step_to_robot_glb.py`)**:
   - Tessellated with fine deflection settings (linear: 0.25 mm, angular: 0.25 rad) yielding smooth curvature on all robot shells.
   - Total model complexity is ~73,000 triangles across the entire robot—ideal for 60+ FPS rendering in WebGL.
4. **PBR Material Assignment**:
   - Extracted AP214 automotive material associations from the STEP data:
     - `kuka_orange`: Glossy industrial robot orange (`#ff5500`, roughness: 0.35, metallic: 0.2).
     - `kuka_anthracite`: Dark metallic joint casing graphite (`#232426`, roughness: 0.4, metallic: 0.75).
     - `kuka_accent_metal`: Brass/metallic mounting pins (`#d9b847`, roughness: 0.25, metallic: 0.9).
5. **Separated Mesh Export**:
   - Exported each physical link as individual mesh nodes into `kuka_lbr_iiwa.glb` so Three.js can parent them into independent kinematic pivots.

To re-run the conversion pipeline at any time:
```bash
python convert_step_to_robot_glb.py
```

---

## 6. Where the Resulting GLB File is Located

The converted 3D model is located at:
```
public/models/kuka_lbr_iiwa.glb
```
Vite serves this file as a static asset under `/models/kuka_lbr_iiwa.glb`.

---

## 7. Robot Mechanical Hierarchy

In Three.js (`src/robot/RobotKinematics.js`), the robot is assembled into a strict forward kinematic tree of `THREE.Group` objects:

```text
RobotBase (BaseGroup)
└── base_link (Casing & Mount)
└── JointGroup_J1 (A1 - Yaw, axis: +Z)
    └── LinkGroup_1 (Link 1 Shell & Collar)
    └── JointGroup_J2 (A2 - Pitch, axis: +Y, pivot: [0, 0, 0.360m])
        └── LinkGroup_2 (Link 2 Shell)
        └── JointGroup_J3 (A3 - Roll/Yaw, axis: +Z, pivot: [0, 0, 0.000m])
            └── LinkGroup_3 (Link 3 Shell)
            └── JointGroup_J4 (A4 - Pitch, axis: +Y, pivot: [0, 0, 0.420m])
                └── LinkGroup_4 (Link 4 Shell)
                └── JointGroup_J5 (A5 - Roll/Yaw, axis: +Z, pivot: [0, 0, 0.000m])
                    └── LinkGroup_5 (Link 5 Shell)
                    └── JointGroup_J6 (A6 - Pitch, axis: +Y, pivot: [0, 0, 0.400m])
                        └── LinkGroup_6 (Link 6 Shell)
                        └── JointGroup_J7 (A7 - Roll/Yaw, axis: +Z, pivot: [0, 0, 0.080m])
                            └── LinkGroup_7 (Flange Plate & Accent Pins)
                            └── EndEffectorFlangeTip (TCP, offset: [0, 0, 0.046m])
```

When an upstream joint rotates (e.g. J2), all downstream components (J3 through J7 and Link 2 through Link 7) move synchronously, while upstream links (Base and Link 1) remain completely static.

---

## 8. Joint Configuration & Kinematic Specifications

| Joint | Axis | Pivot Position (World) | Pivot Relative to Parent | Motion Range | Description |
|:---:|:---:|:---:|:---:|:---:|:---|
| **A1 (J1)** | +Z (Yaw) | $(0, 0, 0.000\text{ m})$ | $(0, 0, 0.000\text{ m})$ | $\pm 170^\circ$ | Arm base azimuth rotation |
| **A2 (J2)** | +Y (Pitch) | $(0, 0, 0.360\text{ m})$ | $(0, 0, 0.360\text{ m})$ | $\pm 120^\circ$ | Upper arm shoulder pitch |
| **A3 (J3)** | +Z (Roll) | $(0, 0, 0.360\text{ m})$ | $(0, 0, 0.000\text{ m})$ | $\pm 170^\circ$ | Upper arm longitudinal twist |
| **A4 (J4)** | +Y (Pitch) | $(0, 0, 0.780\text{ m})$ | $(0, 0, 0.420\text{ m})$ | $\pm 120^\circ$ | Elbow flexion / extension |
| **A5 (J5)** | +Z (Roll) | $(0, 0, 0.780\text{ m})$ | $(0, 0, 0.000\text{ m})$ | $\pm 170^\circ$ | Forearm longitudinal twist |
| **A6 (J6)** | +Y (Pitch) | $(0, 0, 1.180\text{ m})$ | $(0, 0, 0.400\text{ m})$ | $\pm 120^\circ$ | Wrist articulation |
| **A7 (J7)** | +Z (Roll) | $(0, 0, 1.260\text{ m})$ | $(0, 0, 0.080\text{ m})$ | $\pm 175^\circ$ | Tool flange roll |
| **TCP** | — | $(0, 0, 1.306\text{ m})$ | $(0, 0, 0.046\text{ m})$ | — | Tool mounting flange face |

*Note: In the Three.js scene, the root group is oriented with a $-90^\circ$ X-rotation such that the robot rests upright on the standard $Y=0$ floor grid, with local $+Z$ mapping to world $+Y$ (upward).*

---

## 9. How to Modify Joint Limits

Joint limits and physical attributes are centralized in:
[`src/robot/RobotConfiguration.js`](file:///c:/Users/bello/Desktop/KUKA/src/robot/RobotConfiguration.js)

To adjust limits, edit the `minDeg` and `maxDeg` properties in `JOINT_DEFINITIONS`:

```javascript
// Example: Modifying Joint 1 limit to ±160°
export const JOINT_DEFINITIONS = [
  {
    index: 0,
    id: "j1",
    label: "A1",
    minDeg: -160, // <-- update here
    maxDeg: 160,  // <-- update here
    // ...
  },
  // ...
];
```
The UI sliders, numeric clamp boundaries, and validation routines automatically adapt to these settings.

---

## 10. How to Add New Predefined Poses

Add an entry to the `PREDEFINED_POSES` object in [`src/robot/RobotConfiguration.js`](file:///c:/Users/bello/Desktop/KUKA/src/robot/RobotConfiguration.js):

```javascript
export const PREDEFINED_POSES = {
  // Existing poses...
  myCustomPose: {
    name: "Weld Angle 45",
    description: "Orientation for angled welding pass",
    angles: [25, 40, -10, 65, 0, -30, 15] // 7 joint angles in degrees
  }
};
```
The new pose button will automatically appear in the Target Configurations panel.

---

## 11. How to Modify Animations & Sequences

Multi-pose sequences are configured in `DEMO_SEQUENCES` inside [`src/robot/RobotConfiguration.js`](file:///c:/Users/bello/Desktop/KUKA/src/robot/RobotConfiguration.js):

```javascript
export const DEMO_SEQUENCES = [
  {
    id: "custom_routine",
    name: "Inspection Routine",
    waypoints: [
      { angles: [0, 0, 0, 0, 0, 0, 0], duration: 1.5, pause: 0.5 },
      { angles: [30, 45, 0, -50, 0, 40, 0], duration: 2.0, pause: 1.0 },
      { angles: [0, 0, 0, 0, 0, 0, 0], duration: 1.5, pause: 0.2 }
    ]
  }
];
```
* `duration`: Transition time in seconds between waypoints.
* `pause`: Dwell time in seconds at the waypoint before starting the next transition.

---

## 12. Known Limitations

* **Singularity Handling**: The visualization does not enforce inverse kinematic singularity avoidance because it operates in joint space forward kinematics.
* **Collision Detection**: Mesh-to-mesh self-collision geometry is not physically simulated.
* **Dynamics & Payload Inertia**: Joint movements interpolate smoothly using kinematic cubic easing without motor torque/inertia dynamics.

---

## 13. Project Structure

```text
KUKA/
├── public/
│   └── models/
│       └── kuka_lbr_iiwa.glb          # Converted multi-mesh GLB
│
├── src/
│   ├── main.js                        # App bootstrap & lifecycle
│   ├── scene/
│   │   ├── SceneManager.js            # WebGL renderer, studio floor, render loop
│   │   ├── Camera.js                  # Perspective camera & smooth OrbitControls
│   │   └── Lighting.js                # Studio lighting & shadows
│   │
│   ├── robot/
│   │   ├── KukaRobot.js               # High-level coordinator & loader
│   │   ├── RobotKinematics.js         # 7-DOF kinematic chain & forward kinematics
│   │   ├── RobotConfiguration.js      # Joint specs, limits, poses, and demos
│   │   └── RobotAnimation.js          # Smooth interpolation & sequence player
│   │
│   ├── ui/
│   │   └── RobotControls.js           # Interactive panel, sliders & telemetry
│   │
│   └── styles/
│       └── main.css                   # Technical engineering design system
│
├── convert_step_to_robot_glb.py       # CAD conversion pipeline script
├── test_kinematics.py                 # Kinematic verification test suite
├── package.json                       # Dependencies (Three.js, Vite)
├── index.html                         # Application HTML entry point
└── README.md                          # Full documentation
```
