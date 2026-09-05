"""Render every GLB in a folder on a grid for visual QA.
Usage: Blender -b --python blender/contact_sheet.py -- <models_dir> <out.png> [asset ...]
"""
import sys, os, math, glob, json
import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
models, out = args[0], args[1]
only = args[2:]
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
files = sorted(glob.glob(os.path.join(models, '*.glb')))
if only:
    files = [f for f in files if os.path.splitext(os.path.basename(f))[0] in only]
n = len(files)
cols = math.ceil(math.sqrt(n * 1.6))
rows = math.ceil(n / cols)
cell = 2.6
labels = []
for i, f in enumerate(files):
    name = os.path.splitext(os.path.basename(f))[0]
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=f)
    objs = [o for o in bpy.data.objects if o not in before]
    # bbox
    xs, ys, zs = [], [], []
    for o in objs:
        if o.type != 'MESH':
            continue
        for v in o.bound_box:
            p = o.matrix_world @ Vector(v)
            xs.append(p.x); ys.append(p.y); zs.append(p.z)
    if not xs:
        continue
    size = max(max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs))
    s = min(1.0, (cell * 0.72) / size)
    cx = (i % cols) * cell
    cy = -(i // cols) * cell
    root = bpy.data.objects.new('root_' + name, None)
    scene.collection.objects.link(root)
    root.location = (cx - (min(xs) + max(xs)) / 2 * s, cy - (min(ys) + max(ys)) / 2 * s, 0)
    root.scale = (s, s, s)
    for o in objs:
        if o.parent is None:
            o.parent = root
    labels.append((name, cx, cy))
    # label as text
    bpy.ops.object.text_add(location=(cx - cell * 0.48, cy - cell * 0.62, 0.01))
    t = bpy.context.active_object
    t.data.body = name
    t.data.size = 0.26
    t.rotation_euler = (0, 0, 0)
    tm = bpy.data.materials.new('label'); tm.use_nodes = True
    tm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.1, 0.1, 0.1, 1)
    t.data.materials.append(tm)

# floor
bpy.ops.mesh.primitive_plane_add(size=cols * cell * 3, location=((cols - 1) * cell / 2, -(rows - 1) * cell / 2, -0.001))
floor = bpy.context.active_object
m = bpy.data.materials.new('floor'); m.use_nodes = True
m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.85, 0.83, 0.80, 1)
floor.data.materials.append(m)

# lights
bpy.ops.object.light_add(type='SUN', location=(0, 0, 10))
sun = bpy.context.active_object
sun.data.energy = 3.0
sun.rotation_euler = (math.radians(50), math.radians(10), math.radians(-30))
world = bpy.data.worlds.new('w'); scene.world = world; world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.9, 0.92, 0.95, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.9

# camera: orthographic, 3/4 from the front-left, above
w = cols * cell
h = rows * cell
bpy.ops.object.camera_add()
cam = bpy.context.active_object
cam.data.type = 'ORTHO'
cam.rotation_euler = (math.radians(58), 0, math.radians(-25))
center = Vector(((cols - 1) * cell / 2, -(rows - 1) * cell / 2 - 0.4, 0.8))
d = 40
cam.location = center + Vector((math.sin(math.radians(-25)) * -math.sin(math.radians(58)) * d * -1, -math.cos(math.radians(-25)) * math.sin(math.radians(58)) * d, math.cos(math.radians(58)) * d))
scene.camera = cam
aspect = (h * 1.25) / w
scene.render.resolution_x = int(260 * cols)
scene.render.resolution_y = int(260 * cols * aspect)
cam.data.ortho_scale = w * 1.06 if aspect <= 1 else h * 1.25 * 1.06
for eng in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE', 'BLENDER_WORKBENCH'):
    try:
        scene.render.engine = eng
        break
    except TypeError:
        continue
try:
    scene.eevee.taa_render_samples = 16
except Exception:
    pass
scene.render.filepath = out
scene.render.image_settings.file_format = 'PNG'
bpy.ops.render.render(write_still=True)
print('SHEET', out, n, 'assets', scene.render.engine)
