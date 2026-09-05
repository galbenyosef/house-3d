"""Original two-ellipse Italian pendant, built entirely in Blender, in metres.

Rebuild and render:
  /Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/build_italian_pendant.py -- --render

The model origin is the ceiling contact point. Geometry hangs along negative
Blender Z; glTF export converts this to negative Y. No downloaded assets.
"""

import bpy
import json
import math
import struct
import sys
from pathlib import Path
from mathutils import Euler, Vector, geometry

ROOT = Path(__file__).resolve().parents[1]
MODELS = ROOT / "public" / "models"
ARTIFACTS = ROOT / "artifacts"
MODELS.mkdir(parents=True, exist_ok=True)
ARTIFACTS.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
parts = []


def material(name, color, metallic, roughness, emission=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    mat.node_tree.nodes.clear()
    bsdf = mat.node_tree.nodes.new("ShaderNodeBsdfPrincipled")
    output = mat.node_tree.nodes.new("ShaderNodeOutputMaterial")
    mat.node_tree.links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission:
        bsdf.inputs["Emission Color"].default_value = (1, .80, .53, 1)
        bsdf.inputs["Emission Strength"].default_value = emission
    return mat


champagne = material("Satin champagne anodised aluminium", (.50, .39, .245), .82, .27)
hardware = material("Dark champagne suspension hardware", (.12, .107, .083), .72, .34)
diffuser = material("Warm opal linear diffuser", (.89, .87, .79), 0, .32, 3.2)


def mesh(name, vertices, faces, mat, smooth=True):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    data.materials.append(mat)
    for poly in data.polygons:
        poly.use_smooth = smooth
    parts.append(obj)
    return obj


def lathe(name, profile, mat, segments=40, scale_y=1):
    vertices = []
    for radius, z in profile:
        for i in range(segments):
            angle = math.tau * i / segments
            vertices.append((radius * math.cos(angle), radius * math.sin(angle) * scale_y, z))
    faces = []
    for j in range(len(profile)-1):
        for i in range(segments):
            faces.append((j*segments+i, j*segments+(i+1)%segments,
                          (j+1)*segments+(i+1)%segments, (j+1)*segments+i))
    return mesh(name, vertices, faces, mat)


def rod(name, start, end, radius, mat, segments=8):
    a, b = Vector(start), Vector(end)
    axis = (b-a).normalized()
    side = axis.cross(Vector((0, 0, 1)))
    if side.length < .01:
        side = axis.cross(Vector((1, 0, 0)))
    side.normalize()
    other = axis.cross(side).normalized()
    vertices = []
    for point in (a, b):
        for i in range(segments):
            angle = math.tau * i / segments
            vertices.append(tuple(point + radius*(math.cos(angle)*side + math.sin(angle)*other)))
    faces = [(i, (i+1)%segments, segments+(i+1)%segments, segments+i) for i in range(segments)]
    faces += [tuple(reversed(range(segments))), tuple(segments+i for i in range(segments))]
    return mesh(name, vertices, faces, mat)


def rounded_profile(width, height, radius, center_z=0):
    points = []
    for cx, cz, angle in [(width/2-radius, height/2-radius, 0),
                          (-width/2+radius, height/2-radius, 90),
                          (-width/2+radius, -height/2+radius, 180),
                          (width/2-radius, -height/2+radius, 270)]:
        for step in range(3):
            a = math.radians(angle+step*45)
            points.append((cx+radius*math.cos(a), cz+center_z+radius*math.sin(a)))
    return points


def ellipse_point(ring, angle, radial=0, height=0):
    a, b = ring["a"], ring["b"]
    outward = Vector((b*math.cos(angle), a*math.sin(angle), 0)).normalized()
    local = Vector((a*math.cos(angle), b*math.sin(angle), height)) + radial*outward
    return ring["rotation"] @ local + ring["center"]


def band(name, ring, profile, mat, segments=96):
    vertices = [tuple(ellipse_point(ring, math.tau*i/segments, radial, height))
                for i in range(segments) for radial, height in profile]
    n = len(profile)
    faces = []
    for i in range(segments):
        for j in range(n):
            faces.append((i*n+j, ((i+1)%segments)*n+j,
                          ((i+1)%segments)*n+(j+1)%n, i*n+(j+1)%n))
    return mesh(name, vertices, faces, mat)


# A compact oval ceiling rose, with a recessed bottom and small cable grippers.
lathe("Oval ceiling rose", [(0,0),(.085,0),(.097,-.004),(.10,-.009),
      (.10,-.025),(.095,-.032),(.020,-.034),(0,-.034)], champagne, scale_y=.48)
lathe("Recessed canopy underside", [(0,-.033),(.071,-.033),(.071,-.0345),(0,-.0345)], hardware, segments=32, scale_y=.38)
for x in [-.075,.075]:
    rod("Flush canopy screw", (x,0,-.031), (x,0,-.034), .003, hardware, segments=12)

rings = [
    {"name":"Upper ellipse", "a":.355, "b":.227, "center":Vector((-.065,.025,-.720)),
     "rotation":Euler((math.radians(8),math.radians(-2),math.radians(25)),"XYZ").to_matrix(),
     "phase":math.radians(75)},
    {"name":"Lower ellipse", "a":.474, "b":.297, "center":Vector((.012,-.012,-.890)),
     "rotation":Euler((math.radians(4),math.radians(-4),math.radians(-13)),"XYZ").to_matrix(),
     "phase":math.radians(100)},
]

suspensions=[]
for ring in rings:
    # A fine 15 × 19 mm metal section houses the continuous opal lens beneath it.
    band(ring["name"]+" satin metal channel", ring, rounded_profile(.015,.019,.0022), champagne)
    band(ring["name"]+" downward opal lens", ring, rounded_profile(.010,.0036,.0012,-.0101), diffuser)
    inner_lens=[(radial-.0078,z) for radial,z in rounded_profile(.0026,.0078,.0009,-.0032)]
    band(ring["name"]+" inner opal light line", ring, inner_lens, diffuser)
    # Three independently adjustable suspension cables per ring define its tilt.
    for i in range(3):
        angle = ring["phase"] + i*math.tau/3
        lower = ellipse_point(ring, angle, height=.010)
        upper = Vector((.055*math.cos(angle),.020*math.sin(angle),-.046))
        suspensions.append((upper,lower))
        rod(ring["name"]+f" suspension {i+1}", upper, lower, .00115, hardware)
        rod(ring["name"]+f" top adjuster {i+1}", (upper.x,upper.y,-.033), upper, .0038, champagne, 12)
        # The compact swivel aligns with the cable, rather than floating over the ring.
        toward = (upper-lower).normalized()
        rod(ring["name"]+f" ring gripper {i+1}", lower-toward*.001, lower+toward*.011, .0035, champagne, 12)


def point_segment_distance(point, start, end):
    axis=end-start
    fraction=max(0,min(1,(point-start).dot(axis)/axis.length_squared))
    return (point-(start+fraction*axis)).length


# Lower suspension wires pass clear of the upper ellipse, and the six cables
# do not cross each other. The separated attachment angles are intentional.
upper_centerline=[ellipse_point(rings[0],math.tau*i/720) for i in range(720)]
lower_clearance=min(point_segment_distance(point,*cable) for cable in suspensions[3:] for point in upper_centerline)
assert lower_clearance>.030
cable_clearances=[]
for i,(a,b) in enumerate(suspensions):
    for c,d in suspensions[i+1:]:
        candidates=[point_segment_distance(a,c,d),point_segment_distance(b,c,d),
                    point_segment_distance(c,a,b),point_segment_distance(d,a,b)]
        closest=geometry.intersect_line_line(a,b,c,d)
        if closest:
            p,q=closest
            t=(p-a).dot(b-a)/(b-a).length_squared
            u=(q-c).dot(d-c)/(d-c).length_squared
            if 0<=t<=1 and 0<=u<=1:
                candidates.append((p-q).length)
        cable_clearances.append(min(candidates))
assert min(cable_clearances)>.0023

# Three material batches keep the GLB small and avoid per-part draw calls.
groups = [(mat,[obj for obj in parts if obj.data.materials[0] == mat]) for mat in (champagne,hardware,diffuser)]
export_objects = []
for mat, objects in groups:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    if len(objects)>1:
        bpy.ops.object.join()
    obj=bpy.context.object
    obj.name=mat.name
    bpy.context.scene.cursor.location=(0,0,0)
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
    export_objects.append(obj)

bpy.ops.object.select_all(action="DESELECT")
for obj in export_objects:
    obj.select_set(True)
destination=MODELS / "italian-pendant.glb"
bpy.ops.export_scene.gltf(filepath=str(destination),export_format="GLB",use_selection=True,
                          export_yup=True,export_apply=True,export_cameras=False,export_lights=False)

vertices=[obj.matrix_world@v.co for obj in export_objects for v in obj.data.vertices]
mins=[min(v[k] for v in vertices) for k in range(3)]
maxs=[max(v[k] for v in vertices) for k in range(3)]
radial_extent=max(math.hypot(v.x,v.y) for v in vertices)
triangles=0
for obj in export_objects:
    obj.data.calc_loop_triangles()
    triangles+=len(obj.data.loop_triangles)

# Check the actual GLB index/accessor data as well as the Blender source geometry.
blob=destination.read_bytes()
json_length,_=struct.unpack_from("<II",blob,12)
gltf=json.loads(blob[20:20+json_length])
gltf_min=[min(gltf["accessors"][primitive["attributes"]["POSITION"]]["min"][k]
              for mesh in gltf["meshes"] for primitive in mesh["primitives"]) for k in range(3)]
gltf_max=[max(gltf["accessors"][primitive["attributes"]["POSITION"]]["max"][k]
              for mesh in gltf["meshes"] for primitive in mesh["primitives"]) for k in range(3)]
gltf_triangles=sum(gltf["accessors"][p["indices"]]["count"]//3 for m in gltf["meshes"] for p in m["primitives"])
assert gltf_triangles == triangles
assert len(blob)<400_000
assert abs(gltf_max[1])<1e-6 and -.98<=gltf_min[1]<-.90
assert gltf_max[0]-gltf_min[0]<=1.05 and gltf_max[2]-gltf_min[2]<=1.05
assert radial_extent<.61  # Every point stays above the existing 1.22 m round table.
metadata={
    "name":"Orbite — 双椭圆线性吊灯", "asset":"public/models/italian-pendant.glb",
    "source":"scripts/build_italian_pendant.py", "units":"metres",
    "origin":"Ceiling contact point; hangs along negative glTF Y",
    "gltf_bounds":{"min":gltf_min,"max":gltf_max},
    "dimensions_xyz":[round(gltf_max[k]-gltf_min[k],6) for k in range(3)],
    "max_radius_about_mount_axis_m":round(radial_extent,6),
    "clearance_to_1_22m_table_edge_m":round(.61-radial_extent,6),
    "installed_top_m":2.8,"installed_bottom_m":round(2.8+gltf_min[1],6),
    "clearance_above_tabletop_0_7725m":round(2.8+gltf_min[1]-.7725,6),
    "triangles":triangles,"meshes":len(gltf["meshes"]),"materials":len(gltf["materials"]),
    "glb_bytes":len(blob),"texture_images":len(gltf.get("images",[])),
    "extensions":gltf.get("extensionsUsed",[]),
    "suspension_checks":{"min_cable_centerline_spacing_mm":round(min(cable_clearances)*1000,3),
                         "lower_cable_to_upper_ring_centerline_mm":round(lower_clearance*1000,3)},
    "specification":{"metal_section_mm":[15,19],"lower_ellipse_centerline_mm":[948,594],
                     "upper_ellipse_centerline_mm":[710,454],"cables":6,
                     "champagne_metallic":.82,"champagne_roughness":.27,
                     "diffuser_emissive_strength":3.2},
}
(ARTIFACTS / "italian-pendant-metadata.json").write_text(json.dumps(metadata,indent=2,ensure_ascii=False)+"\n")
print("ITALIAN_PENDANT_METADATA",json.dumps(metadata,ensure_ascii=False))

if "--render" in sys.argv:
    scene=bpy.context.scene
    scene.render.engine="CYCLES"
    scene.cycles.samples=64
    scene.cycles.use_denoising=True
    scene.world.color=(.22,.22,.22)
    scene.render.resolution_x=900
    scene.render.resolution_y=1050
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format="PNG"
    scene.render.filepath=str(ARTIFACTS / "italian-pendant-preview.png")
    scene.view_settings.view_transform="AgX"
    for name,location,power,size in [
        ("Soft key",(1,-1.4,.65),180,1.6),
        ("Rim softbox",(-1,.55,-.1),100,1.2),
        ("Front reflection card",(0,-1.8,-.45),65,1.7),
    ]:
        bpy.ops.object.light_add(type="AREA",location=location)
        light=bpy.context.object
        light.name=name
        light.data.energy=power
        light.data.shape="DISK"
        light.data.size=size
        light.rotation_euler=(Vector((0,0,-.55))-light.location).to_track_quat("-Z","Y").to_euler()
    bpy.ops.object.camera_add(location=(.95,-1.90,.24))
    camera=bpy.context.object
    camera.rotation_euler=(Vector((0,0,-.48))-camera.location).to_track_quat("-Z","Y").to_euler()
    camera.data.type="ORTHO"
    camera.data.ortho_scale=1.30
    scene.camera=camera
    bpy.ops.render.render(write_still=True)
