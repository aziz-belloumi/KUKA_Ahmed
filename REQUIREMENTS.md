# System and Software Requirements

Project requirements for running the **KUKA LBR iiwa 14 R820 3D Web Visualizer** and executing the optional CAD conversion pipeline.

---

## 1. Quick Requirements Summary

| Layer | Component | Minimum Version | Recommended Version |
| :--- | :--- | :--- | :--- |
| **Runtime Environment** | Node.js | v18.0.0 | v20.x or v22.x LTS (Tested on v22.13.0) |
| **Package Manager** | npm | v9.0.0 | v10.x |
| **Frontend Framework** | Three.js | 0.170.0 | 0.170.x |
| **Build Tool** | Vite | 6.0.0 | 6.4.x |
| **Python (CAD Tools)** | Python | 3.10 | 3.11 or 3.12 |
| **Graphics API** | WebGL | WebGL 2.0 | WebGL 2.0 with Hardware Acceleration |

---

## 2. Web Application Frontend Requirements

The web application runs entirely in the browser using Three.js and Vite.

### Dependencies (`package.json`)
```json
{
  "dependencies": {
    "three": "^0.170.0"
  },
  "devDependencies": {
    "vite": "^6.0.0"
  }
}
```

### Supported Web Browsers
* **Google Chrome**: Version 100+ (Windows, macOS, Linux, Android)
* **Microsoft Edge**: Version 100+ (Windows, macOS)
* **Mozilla Firefox**: Version 100+ (Windows, macOS, Linux)
* **Apple Safari**: Version 15+ (macOS, iOS, iPadOS)

### Hardware Requirements
* **GPU**: Any integrated or discrete graphics processor with WebGL 2.0 support (Intel Iris/UHD 620+, AMD Radeon Vega/RDNA, NVIDIA GeForce GTX 900+ / RTX).
* **RAM**: 4 GB RAM minimum (8 GB recommended).
* **Display**: Responsive layout supports 1080p, 1440p, 4K, and mobile / tablet screens.

---

## 3. Python CAD Conversion Pipeline Requirements (Optional)

The pre-converted 3D robot model is already included in `public/models/kuka_lbr_iiwa.glb`. You only need Python if you wish to re-tessellate or re-convert the raw CAD file (`ROBOT KUKA LBR IIWA 14 R820.stp`).

### Python Version
* **Python**: 3.10, 3.11, or 3.12 64-bit

### Python Packages (`requirements.txt`)
```text
cadquery-ocp-novtk>=8.0.1.0.0
cadquery-ocp-proxy>=8.0.1.0.0
cascadio>=0.1.1
numpy>=2.0.0
scipy>=1.14.0
trimesh>=4.0.0
pillow>=10.0.0
```

### Installation Command
```bash
pip install -r requirements.txt
```

---

## 4. CAD Source Model Specification

* **Filename**: `ROBOT KUKA LBR IIWA 14 R820.stp`
* **Format**: STEP AP214 (Automotive Design & Kinematics)
* **Originating CAD**: SIEMENS NX / Teamcenter
* **File Size**: 10,134,282 bytes (~10.1 MB)
* **Solids in Assembly**: 15 distinct solids
  * Base Plate & Housing (`Solid 14`)
  * Link 1 / A1 Turret (`Solid 13`)
  * Link 2 / A2 Shoulder Pitch Joint (`Solid 12`)
  * Link 3 / A3 Upper Arm (`Solid 11`)
  * Link 4 / A4 Elbow Pitch Joint (`Solid 10`)
  * Link 5 / A5 Forearm (`Solid 09`)
  * Link 6 / A6 Wrist Pitch Joint (`Solid 08`)
  * Link 7 / A7 Tool Mounting Flange & Pins (`Solids 00..07`)
* **Kinematic Degrees of Freedom**: 7 Revolute Axes (A1 through A7)
* **Nominal Reach**: 820 mm (0.820 m)
* **Rated Payload**: 14.0 kg
* **Total Robot Weight**: 29.9 kg
