"""Build the original Maison eight-arm brass chandelier without external assets.

Reproduce with Blender 4.5+:
  /Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/build_chandelier.py -- --render

The glTF origin is the ceiling contact point. All geometry hangs below it;
Blender Z is converted to glTF Y on export. Dimensions are in metres.
"""

import bpy
import json
import math
import sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
MODELS = ROOT / "public" / "models"
ARTIFACTS = ROOT / "artifacts"
MODELS.mkdir(parents=True, exist_ok=True)
ARTIFACTS.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)


def material(name, color, metal=0.0, roughness=0.35, transmission=0.0, emission=0.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Metallic"].default_value = metal
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["IOR"].default_value = 1.46
    bsdf.inputs["Transmission Weight"].default_value = transmission
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*color, 1)
        bsdf.inputs["Emission Strength"].default_value = emission
    return mat


brass = material("Brushed antique brass", (0.48, 0.285, 0.095), 0.82, 0.28)
dark_brass = material("Recessed patinated brass", (0.20, 0.106, 0.032), 0.8, 0.38)
ivory = material("Warm ivory candle sleeves", (0.86, 0.76, 0.57), 0, 0.31)
crystal = material("Cut clear crystal", (0.97, 0.94, 0.85), 0, 0.06, 0.88)
bulb = material("2700K candle bulbs", (1.0, 0.60, 0.25), 0, 0.24, 0, 4)
objects = []


def mesh_object(name, verts, faces, mat, smooth=True):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    if smooth:
        for polygon in mesh.polygons:
            polygon.use_smooth = True
    objects.append(obj)
    return obj


def lathe(name, profile, mat=brass, center=(0, 0, 0), segments=32, flutes=0, smooth=True):
    """Profile points are radius/z pairs. Mild radial fluting is geometric."""
    verts = []
    for r, z in profile:
        for j in range(segments):
            angle = math.tau * j / segments
            flute = 1 + 0.06 * math.cos(angle * flutes) if flutes else 1
            verts.append((center[0] + r * flute * math.cos(angle), center[1] + r * flute * math.sin(angle), center[2] + z))
    faces = []
    for k in range(len(profile) - 1):
        for j in range(segments):
            nj = (j + 1) % segments
            faces.append((k * segments + j, k * segments + nj, (k + 1) * segments + nj, (k + 1) * segments + j))
    return mesh_object(name, verts, faces, mat, smooth)


def tube(name, points, radius, mat=brass, sides=8):
    verts = []
    for i, point in enumerate(points):
        point = Vector(point)
        tangent = Vector(points[min(i + 1, len(points) - 1)]) - Vector(points[max(i - 1, 0)])
        tangent.normalize()
        axis = tangent.cross(Vector((0, 0, 1)))
        if axis.length < 0.01:
            axis = tangent.cross(Vector((1, 0, 0)))
        axis.normalize()
        second = tangent.cross(axis).normalized()
        for j in range(sides):
            angle = math.tau * j / sides
            v = point + radius * (axis * math.cos(angle) + second * math.sin(angle))
            verts.append(tuple(v))
    faces = []
    for i in range(len(points) - 1):
        for j in range(sides):
            faces.append((i * sides + j, i * sides + (j + 1) % sides, (i + 1) * sides + (j + 1) % sides, (i + 1) * sides + j))
    faces.extend([tuple(reversed(range(sides))), tuple((len(points) - 1) * sides + j for j in range(sides))])
    return mesh_object(name, verts, faces, mat)


def ring(name, center, major, minor, mat=brass, plane="xy", segments=20, sides=5, elongate=1):
    points = []
    for j in range(segments + 1):
        a = math.tau * j / segments
        u, v = major * math.cos(a), major * elongate * math.sin(a)
        offset = (u, v, 0) if plane == "xy" else ((u, 0, v) if plane == "xz" else (0, u, v))
        points.append(tuple(center[k] + offset[k] for k in range(3)))
    return tube(name, points, minor, mat, sides)


def bead(name, location, radius=0.006):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=radius, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(crystal)
    objects.append(obj)
    return obj


def drop(name, x, y, z, size=1):
    ring(name + " bail", (x, y, z - 0.004), 0.006 * size, 0.0013, plane="xz", segments=12, sides=5)
    profile = [(0, 0), (0.004, -0.008), (0.009, -0.022), (0.014, -0.041), (0.011, -0.052), (0.003, -0.063), (0, -0.068)]
    return lathe(name, [(r * size, h * size) for r, h in profile], crystal, (x, y, z - 0.01), segments=10, smooth=False)


def bezier(a, b, c, d, samples):
    return [tuple((1-t)**3*a[k] + 3*(1-t)**2*t*b[k] + 3*(1-t)*t*t*c[k] + t**3*d[k] for k in range(2)) for t in [i / samples for i in range(samples + 1)]]


# Ceiling rose: turned stepped edge and fluted bell.
lathe("Fluted ceiling canopy", [(0, 0), (.08, 0), (.091, -.009), (.091, -.020), (.078, -.027), (.073, -.036), (.057, -.055), (.031, -.072), (.019, -.077), (0, -.077)], segments=36, flutes=12)
ring("Canopy beaded rim", (0, 0, -.022), .087, .003, segments=32)
lathe("Canopy neck", [(0, -.07), (.014, -.07), (.014, -.087), (.009, -.095), (0, -.095)], segments=20)

# Alternating hand-forged oval chain links.
for i in range(5):
    ring(f"Suspension chain {i+1}", (0, 0, -.11 - i*.024), .011, .0028, plane="xz" if i % 2 == 0 else "yz", segments=12, sides=5, elongate=1.45)

# Central spindle with traditional turned baluster and a fluted lower basket.
lathe("Turned central baluster", [(0,-.217),(.013,-.217),(.018,-.229),(.018,-.24),(.032,-.25),(.036,-.267),(.029,-.279),(.014,-.29),(.011,-.325),(.018,-.36),(.034,-.394),(.044,-.424),(.046,-.46),(.038,-.48),(.025,-.501),(.020,-.548),(.026,-.56),(.030,-.571),(.030,-.589),(.047,-.607),(.055,-.625),(.05,-.642),(.034,-.653),(.033,-.68),(.051,-.697),(.058,-.714),(.054,-.741),(.038,-.758),(.025,-.765),(0,-.765)], segments=28)
lathe("Fluted lower basket", [(.04,-.694),(.058,-.706),(.061,-.728),(.051,-.752),(.026,-.774),(.01,-.781),(0,-.781)], dark_brass, segments=40, flutes=10)
ring("Basket rim", (0,0,-.709), .057,.003,segments=24)
lathe("Bottom brass finial", [(0,-.771),(.014,-.771),(.018,-.78),(.011,-.795),(.012,-.804),(.006,-.815),(0,-.818)], segments=20)
drop("Central pendant",0,0,-.818,1.55)

for arm in range(8):
    angle = arm * math.tau / 8
    ca, sa = math.cos(angle), math.sin(angle)
    radial = lambda r,z: (r*ca,r*sa,z)
    # Two connected Bezier curves make a continuous, rounded S-profile.
    path = bezier((.032,-.666),(.18,-.627),(.11,-.794),(.245,-.78),10)
    path += bezier((.245,-.78),(.355,-.775),(.321,-.579),(.41,-.546),12)[1:]
    tube(f"Sweeping brass arm {arm+1}",[radial(r,z) for r,z in path],.009,sides=6)
    # Small inward scroll terminates below the candle cup.
    scroll = bezier((.343,-.647),(.268,-.627),(.291,-.569),(.319,-.596),8)
    tube(f"Inner scroll {arm+1}",[radial(r,z) for r,z in scroll],.0045,sides=5)
    x,y = .41*ca,.41*sa
    lathe(f"Fluted candle bobeche {arm+1}",[(0,-.551),(.016,-.551),(.021,-.538),(.036,-.531),(.046,-.516),(.047,-.510),(.036,-.509),(.026,-.518),(.013,-.522),(0,-.522)],center=(x,y,0),segments=16,flutes=8)
    ring(f"Bobeche rolled rim {arm+1}",(x,y,-.511),.045,.0028,segments=16,sides=5)
    lathe(f"Candle socket {arm+1}",[(0,-.524),(.014,-.524),(.015,-.509),(.013,-.503),(0,-.503)],center=(x,y,0),segments=12)
    lathe(f"Ivory candle sleeve {arm+1}",[(0,-.506),(.011,-.506),(.011,-.427),(.0105,-.422),(0,-.422)],ivory,(x,y,0),segments=12)
    lathe(f"Warm candle bulb {arm+1}",[(0,-.424),(.007,-.422),(.011,-.411),(.010,-.397),(.005,-.381),(0,-.366)],bulb,(x,y,0),segments=12)
    # Cut-glass pendant on the outward edge of every brass drip tray.
    drop(f"Bobeche crystal {arm+1}",.449*ca,.449*sa,-.522,.84)
    drop(f"Arm crystal {arm+1}",.251*ca,.251*sa,-.79,.82)
    # Eight delicate crystal swags bridge adjacent arms.
    points=[]
    for step in range(17):
        t=step/16
        a=angle+t*math.tau/8
        r=.345-.018*math.sin(t*math.pi)
        z=-.614-.081*math.sin(t*math.pi)
        points.append((r*math.cos(a),r*math.sin(a),z))
    tube(f"Crystal swag wire {arm+1}",points,.0011,brass,sides=4)
    for step in (1,3,5,7,9,11,13,15):
        bead(f"Faceted swag bead {arm+1}-{step}",points[step],.0055)

# Join the original single-material parts into five export meshes / draw calls.
export_objects=[]
material_groups=[(mat,[obj for obj in objects if obj.data.materials[0] == mat]) for mat in (brass,dark_brass,ivory,crystal,bulb)]
for mat,group in material_groups:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in group:
        obj.select_set(True)
    bpy.context.view_layer.objects.active=group[0]
    if len(group) > 1:
        bpy.ops.object.join()
    joined=bpy.context.object
    joined.name=mat.name
    # The asset origin is exactly at the ceiling, including after glTF axis conversion.
    bpy.context.scene.cursor.location=(0,0,0)
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
    export_objects.append(joined)

bpy.ops.object.select_all(action="DESELECT")
for obj in export_objects:
    obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(MODELS / "french-chandelier.glb"),export_format="GLB",use_selection=True,export_yup=True,export_apply=True,export_cameras=False,export_lights=False)

vertices=[obj.matrix_world@v.co for obj in export_objects for v in obj.data.vertices]
bounds=[[round(min(v[k] for v in vertices),5),round(max(v[k] for v in vertices),5)] for k in range(3)]
triangles=0
for obj in export_objects:
    obj.data.calc_loop_triangles()
    triangles+=len(obj.data.loop_triangles)
metadata={"asset":"french-chandelier.glb","source":"scripts/build_chandelier.py","style":"French Louis XVI eight-arm brass and crystal candle chandelier","units":"metres","origin":"Ceiling attachment; hangs along negative glTF Y","blender_bounds_xyz":bounds,"dimensions_xyz":[round(b[1]-b[0],5) for b in bounds],"triangles":triangles,"meshes":len(export_objects),"materials":len(export_objects)}
(ARTIFACTS / "chandelier-metadata.json").write_text(json.dumps(metadata,indent=2)+"\n")
print("CHANDELIER_METADATA",json.dumps(metadata))

if "--render" in sys.argv:
    scene=bpy.context.scene
    scene.render.engine="CYCLES"
    scene.cycles.samples=24
    scene.cycles.use_denoising=True
    scene.world.color=(.3,.3,.3)
    scene.render.resolution_x=800
    scene.render.resolution_y=960
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format="PNG"
    scene.render.filepath=str(ARTIFACTS / "chandelier-preview.png")
    scene.view_settings.view_transform="AgX"
    backdrop=material("Preview backdrop",(.14,.11,.085),0,.8)
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-1.25))
    bpy.context.object.data.materials.append(backdrop)
    for name,location,power,size in [("Key softbox",(1,-1.8,1),220,2),("Warm rim",(-1,.4,0),160,1),("Front fill",(0,-2,-.4),70,1.5)]:
        bpy.ops.object.light_add(type="AREA",location=location)
        light=bpy.context.object
        light.name=name
        light.data.energy=power
        light.data.shape="DISK"
        light.data.size=size
        light.rotation_euler=(Vector((0,0,-.45))-light.location).to_track_quat("-Z","Y").to_euler()
    bpy.ops.object.camera_add(location=(1.35,-2.25,.27))
    camera=bpy.context.object
    camera.rotation_euler=(Vector((0,0,-.46))-camera.location).to_track_quat("-Z","Y").to_euler()
    camera.data.type="ORTHO"
    camera.data.ortho_scale=1.3
    scene.camera=camera
    bpy.ops.render.render(write_still=True)
