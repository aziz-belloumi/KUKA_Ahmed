import os
import trimesh
import numpy as np
import OCP
from OCP.STEPControl import STEPControl_Reader
from OCP.TopExp import TopExp_Explorer
from OCP.TopAbs import TopAbs_SOLID, TopAbs_FACE
from OCP.TopoDS import TopoDS
from OCP.BRepMesh import BRepMesh_IncrementalMesh
from OCP.BRep import BRep_Tool
from OCP.TopLoc import TopLoc_Location
from scipy.spatial import KDTree

print("Loading STEP file...")
reader = STEPControl_Reader()
reader.ReadFile('ROBOT KUKA LBR IIWA 14 R820.stp')
reader.TransferRoots()
shape = reader.OneShape()

# Tessellate with fine tolerance: linear 0.25mm, angular 0.25 rad
print("Tessellating CAD geometry...")
mesh_tool = BRepMesh_IncrementalMesh(shape, 0.25, False, 0.25, True)
mesh_tool.Perform()

# Load reference cascadio GLB to transfer material classification
import cascadio
if not os.path.exists('raw_cascadio.glb'):
    cascadio.step_to_glb('ROBOT KUKA LBR IIWA 14 R820.stp', 'raw_cascadio.glb', tol_linear=0.5, tol_angular=0.5, merge_primitives=True, include_materials=True)
ref_scene = trimesh.load('raw_cascadio.glb')
kd_trees = {g_name: KDTree(geom.vertices) for g_name, geom in ref_scene.geometry.items()}

# ─────────────────────────────────────────────────────────────────────────────
# PBR Material Definitions — Authentic KUKA Industrial Aesthetic
# ─────────────────────────────────────────────────────────────────────────────

# 1. Signature KUKA Industrial Orange (RAL 2004 Pure Orange) for arm segments
mat_orange = trimesh.visual.material.PBRMaterial(
    name="kuka_orange",
    baseColorFactor=[1.0, 0.33, 0.02, 1.0],  # Vibrant signature KUKA orange
    metallicFactor=0.08,                     # High-durability powder-coat finish
    roughnessFactor=0.28,                     # Smooth satin sheen
    doubleSided=True
)

# 2. High-Tech Dark Gunmetal / Titanium for the Rotating Joints (Joints 2, 4, 6)
# Distinct from arm segments, giving clear visual cues of rotation
mat_joint = trimesh.visual.material.PBRMaterial(
    name="kuka_joint",
    baseColorFactor=[0.20, 0.22, 0.26, 1.0],  # Dark metallic gunmetal (#333842)
    metallicFactor=0.82,                      # Precision machined alloy sheen
    roughnessFactor=0.32,                      # Specular satin highlight
    doubleSided=True
)

# 3. Sleek Metallic Slate-Graphite for base and joint 7 casing
mat_graphite = trimesh.visual.material.PBRMaterial(
    name="kuka_graphite",
    baseColorFactor=[0.32, 0.34, 0.38, 1.0],  # Machined industrial dark slate (#525761)
    metallicFactor=0.55,                      # Cast aluminum / alloy sheen
    roughnessFactor=0.38,                      # Subtle specular highlight
    doubleSided=True
)

# 4. Precision Stainless Steel / Chrome for flange and mounting pins
mat_steel = trimesh.visual.material.PBRMaterial(
    name="kuka_steel",
    baseColorFactor=[0.88, 0.89, 0.92, 1.0],  # Bright machined steel / chrome
    metallicFactor=0.92,                      # Highly reflective metallic
    roughnessFactor=0.18,                      # Precision ground finish
    doubleSided=True
)

exp = TopExp_Explorer(shape, TopAbs_SOLID)
solids = []
while exp.More():
    solids.append(exp.Current())
    exp.Next()

# Solids mapping:
# 14 -> base_link
# 13 -> link_1 (Arm column)
# 12 -> link_2 (Joint 2 - Shoulder pitch)
# 11 -> link_3 (Upper arm)
# 10 -> link_4 (Joint 4 - Elbow pitch)
# 09 -> link_5 (Forearm)
# 08 -> link_6 (Joint 6 - Wrist pitch)
# 00..07 -> link_7 (Joint 7 - Tool Flange)

links_def = [
    ('base_link', [14]),
    ('link_1', [13]),
    ('link_2', [12]),
    ('link_3', [11]),
    ('link_4', [10]),
    ('link_5', [9]),
    ('link_6', [8]),
    ('link_7', [0, 1, 2, 3, 4, 5, 6, 7]),
]

scene = trimesh.Scene()

# Rotating joint links that get the distinct joint material
joint_links = {'link_2', 'link_4', 'link_6'}

for link_name, solid_indices in links_def:
    print(f"Processing {link_name}...")
    
    # Determine which material maps to '123_2' for this link:
    # Rotating joints get mat_joint, arm links get mat_orange
    body_mat = mat_joint if link_name in joint_links else mat_orange
    
    mat_map = {
        '123':   mat_graphite,  # Base and joint housings
        '123_1': mat_steel,     # Stainless steel mounting hardware & pins
        '123_2': body_mat,      # Joint Gunmetal for J2/J4/J6, KUKA Orange for L1/L3/L5
    }

    # Group faces by material
    mat_faces = {'123': {'verts': [], 'faces': []},
                 '123_1': {'verts': [], 'faces': []},
                 '123_2': {'verts': [], 'faces': []}}
    
    for s_idx in solid_indices:
        s = solids[s_idx]
        face_exp = TopExp_Explorer(s, TopAbs_FACE)
        while face_exp.More():
            f = TopoDS.Face(face_exp.Current())
            loc = TopLoc_Location()
            tri = BRep_Tool.Triangulation_s(f, loc)
            if tri is not None:
                trsf = loc.Transformation()
                nb_nodes = tri.NbNodes()
                nb_tri = tri.NbTriangles()
                
                # Extract nodes
                nodes = []
                for i in range(1, nb_nodes + 1):
                    p = tri.Node(i)
                    p.Transform(trsf)
                    # Convert to meters (divide by 1000)
                    nodes.append([p.X() * 0.001, p.Y() * 0.001, p.Z() * 0.001])
                nodes = np.array(nodes)
                
                # Classify material using first node
                best_m = '123'
                best_d = 1e9
                for g_name, tree in kd_trees.items():
                    d, _ = tree.query(nodes[0])
                    if d < best_d:
                        best_d = d
                        best_m = g_name
                
                # Target collection
                target = mat_faces[best_m]
                v_offset = len(target['verts'])
                target['verts'].extend(nodes.tolist())
                
                # Triangles (1-based to 0-based + offset)
                for i in range(1, nb_tri + 1):
                    t = tri.Triangle(i)
                    i1, i2, i3 = t.Get()
                    target['faces'].append([i1 - 1 + v_offset, i2 - 1 + v_offset, i3 - 1 + v_offset])
            
            face_exp.Next()
    
    # Create meshes for each non-empty material
    part_count = 0
    for mat_key, data in mat_faces.items():
        if len(data['faces']) > 0:
            verts = np.array(data['verts'], dtype=np.float32)
            faces = np.array(data['faces'], dtype=np.int32)
            mesh = trimesh.Trimesh(vertices=verts, faces=faces, process=True)
            active_mat = mat_map[mat_key]
            mesh.visual = trimesh.visual.TextureVisuals(material=active_mat)
            
            sub_name = f"{link_name}_{active_mat.name}"
            # Add to scene
            scene.add_geometry(mesh, node_name=sub_name, geom_name=sub_name)
            part_count += 1
            print(f"  Added {sub_name}: {len(mesh.vertices)} vertices, {len(mesh.faces)} faces")

output_path = 'public/models/kuka_lbr_iiwa.glb'
os.makedirs(os.path.dirname(output_path), exist_ok=True)
print(f"Exporting to {output_path}...")
glb_bytes = scene.export(file_type='glb')
with open(output_path, 'wb') as f:
    f.write(glb_bytes)
print(f"Successfully generated {output_path} (size: {len(glb_bytes) / 1024 / 1024:.2f} MB)")
print("Color scheme: arm links=KUKA orange, joints=metallic gunmetal, base=slate graphite, flange=stainless steel")
