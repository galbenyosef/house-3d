"""Offline photoreal render of the exported three.js scene with Cycles.

Usage:
  Blender -b --python blender/render_pano.py -- <scene.glb> <meta.json> <out.jpg>
        [--cam X Y Z] [--yaw DEG] [--samples N] [--res W] [--test] [--persp]

Coordinates for --cam are three.js metres (x east, y up, z south); the pano
faces `--yaw` degrees (0 = south, 90 = east). Output is an equirectangular
JPG unless --persp is given (then a 35 mm perspective still).
"""
import sys, os, json, math, time
import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
glb, meta_path, out = args[0], args[1], args[2]
opts = {'cam': (2.0, 1.45, 10.4), 'yaw': 0.0, 'samples': 256, 'res': 4096, 'test': False, 'persp': False, 'exposure': -0.8, 'world': 0.08, 'sun': 0.25, 'lamp': 0.08}
i = 3
while i < len(args):
    a = args[i]
    if a == '--cam':
        opts['cam'] = tuple(float(v) for v in args[i + 1:i + 4]); i += 4; continue
    if a == '--yaw':
        opts['yaw'] = float(args[i + 1]); i += 2; continue
    if a == '--samples':
        opts['samples'] = int(args[i + 1]); i += 2; continue
    if a == '--res':
        opts['res'] = int(args[i + 1]); i += 2; continue
    if a == '--exposure':
        opts['exposure'] = float(args[i + 1]); i += 2; continue
    if a in ('--world', '--sun', '--lamp'):
        opts[a[2:]] = float(args[i + 1]); i += 2; continue
    if a == '--test':
        opts['test'] = True; i += 1; continue
    if a == '--persp':
        opts['persp'] = True; i += 1; continue
    i += 1

t0 = time.time()
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
meta = json.load(open(meta_path))

# ------------------------------------------------------------------ import
bpy.ops.import_scene.gltf(filepath=glb)
print('IMPORTED', len(bpy.data.objects), 'objects', len(bpy.data.materials), 'materials', '%.1fs' % (time.time() - t0))

def principled(mat):
    if not mat.use_nodes:
        return None
    for n in mat.node_tree.nodes:
        if n.type == 'BSDF_PRINCIPLED':
            return n
    return None

# ------------------------------------------------------------------ materials
for mat in bpy.data.materials:
    p = principled(mat)
    if not p:
        continue
    name = (mat.name or '').lower()
    alpha = p.inputs['Alpha'].default_value
    is_glass = 'glass' in name or 'crystal' in name or alpha < 0.7
    if is_glass:
        p.inputs['Transmission Weight'].default_value = 1.0
        p.inputs['Roughness'].default_value = 0.03 if 'smoked' not in name else 0.08
        p.inputs['Alpha'].default_value = 1.0
        p.inputs['IOR'].default_value = 1.5
        if 'smoked' in name:
            p.inputs['Base Color'].default_value = (0.35, 0.32, 0.30, 1)
        else:
            p.inputs['Base Color'].default_value = (0.95, 0.97, 0.98, 1)
        for attr, val in (('surface_render_method', 'DITHERED'), ('blend_method', 'HASHED')):
            try:
                setattr(mat, attr, val)
            except Exception:
                pass
    if 'mirror' in name:
        p.inputs['Metallic'].default_value = 1.0
        p.inputs['Roughness'].default_value = 0.02
    if 'sheer' in name:
        p.inputs['Alpha'].default_value = 0.35
    if name.startswith('paper'):
        # rice paper (lantern shades, screens): diffuse translucency so the bulb / point
        # light inside a lantern glows through instead of being blocked by an opaque shell
        p.inputs['Transmission Weight'].default_value = 1.0
        p.inputs['Roughness'].default_value = 0.95
        p.inputs['IOR'].default_value = 1.05
        p.inputs['Base Color'].default_value = (0.96, 0.93, 0.86, 1)
    # crank emissive strength for lamps so they read as lit
    es = p.inputs['Emission Strength'].default_value
    if es > 0.5:
        p.inputs['Emission Strength'].default_value = max(es, 3.0) * (2.5 if 'bulb' in name or 'led' in name else 1.0)

# ------------------------------------------------------------------ world + sun
world = bpy.data.worlds.new('sky')
scene.world = world
world.use_nodes = True
nt = world.node_tree
bg = nt.nodes['Background']
sky = nt.nodes.new('ShaderNodeTexSky')
# Blender 5.x renamed the Nishita model; fall back gracefully on older builds
for sky_type in ('MULTIPLE_SCATTERING', 'NISHITA', 'SINGLE_SCATTERING', 'HOSEK_WILKIE'):
    try:
        sky.sky_type = sky_type
        break
    except TypeError:
        continue
for attr, val in (('sun_elevation', math.radians(34)), ('sun_rotation', math.radians(225)), ('sun_intensity', opts['sun']),
                  ('sun_size', math.radians(0.6)), ('altitude', 40), ('air_density', 1.0), ('dust_density', 1.2), ('sun_disc', True)):
    try:
        setattr(sky, attr, val)
    except Exception:
        pass
print('SKY', sky.sky_type)
nt.links.new(sky.outputs['Color'], bg.inputs['Color'])
bg.inputs['Strength'].default_value = opts['world']   # sky model is in physical units; keep interiors in range

# ------------------------------------------------------------------ interior lights
ceil = meta.get('ceil', 2720) / 1000.0
for f in meta.get('fixtures', []):
    drop = {'chandelier-large': 0.7, 'chandelier-small': 0.5, 'lantern': 0.45, 'flush': 0.1}.get(f['kind'], 0.5)
    if 'drop' in f:  # per-fixture override from the descriptor (mm)
        drop = f['drop'] / 1000.0 + 0.05
    ld = bpy.data.lights.new('L_' + f['id'], 'POINT')
    ld.energy = f['lumens'] * opts['lamp'] * meta.get('interiorBoost', 1)
    ld.color = (1.0, 0.86, 0.66)
    ld.shadow_soft_size = 0.12
    lo = bpy.data.objects.new('L_' + f['id'], ld)
    # three.js (x, y, z) -> Blender (x, -z, y)
    lo.location = (f['x'] / 1000.0, -f['y'] / 1000.0, ceil - drop - 0.05)
    scene.collection.objects.link(lo)

# ------------------------------------------------------------------ camera
cam_data = bpy.data.cameras.new('pano')
if opts['persp']:
    cam_data.type = 'PERSP'
    cam_data.lens = 24
    cam_data.sensor_width = 36
else:
    cam_data.type = 'PANO'
    try:
        cam_data.panorama_type = 'EQUIRECTANGULAR'
    except Exception:
        cam_data.cycles.panorama_type = 'EQUIRECTANGULAR'
cam = bpy.data.objects.new('pano', cam_data)
scene.collection.objects.link(cam)
cx, cy, cz = opts['cam']
cam.location = (cx, -cz, cy)
# look horizontally; yaw 0 = south (Blender -Y), 90 = east (+X), -90 = west (-X).
# (A camera pitched up 90° looks along +Y; rotating it by 180 + yaw about Z turns
# +Y into -Y for yaw 0 and into +X for yaw 90.)
cam.rotation_euler = (math.radians(90), 0, math.radians(180 + opts['yaw']))
scene.camera = cam

# ------------------------------------------------------------------ render settings
scene.render.engine = 'CYCLES'
prefs = bpy.context.preferences.addons['cycles'].preferences
prefs.refresh_devices()
try:
    prefs.compute_device_type = 'METAL'
    for d in prefs.devices:
        d.use = d.type == 'METAL'
    scene.cycles.device = 'GPU'
except Exception as e:
    print('GPU unavailable, CPU fallback', e)
scene.cycles.samples = 32 if opts['test'] else opts['samples']
scene.cycles.use_denoising = True
try:
    scene.cycles.denoiser = 'OPENIMAGEDENOISE'
    scene.cycles.denoising_use_gpu = True
except Exception:
    pass
scene.cycles.max_bounces = 8
scene.cycles.diffuse_bounces = 4
scene.cycles.glossy_bounces = 4
scene.cycles.transmission_bounces = 8
scene.cycles.caustics_reflective = False
scene.cycles.caustics_refractive = False
scene.cycles.blur_glossy = 1.0
scene.cycles.use_light_tree = True
res = 1024 if opts['test'] else opts['res']
scene.render.resolution_x = res
scene.render.resolution_y = res // 2 if not opts['persp'] else int(res * 9 / 16)
scene.render.resolution_percentage = 100
scene.render.film_transparent = False
scene.view_settings.view_transform = 'AgX'
try:
    scene.view_settings.look = 'AgX - Medium High Contrast'
except Exception:
    pass
scene.view_settings.exposure = opts['exposure']
scene.render.image_settings.file_format = 'JPEG'
scene.render.image_settings.quality = 92
scene.render.filepath = os.path.abspath(out)
os.makedirs(os.path.dirname(scene.render.filepath), exist_ok=True)
print('RENDER start', res, 'samples', scene.cycles.samples, 'cam', cam.location[:], 'yaw', opts['yaw'])
bpy.ops.render.render(write_still=True)
print('RENDER done', out, '%.1fs' % (time.time() - t0))
