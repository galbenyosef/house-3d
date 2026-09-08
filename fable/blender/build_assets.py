"""Generate every asset as a GLB plus a manifest of bounding boxes.
Usage: Blender -b --python blender/build_assets.py -- <out_dir> [asset ...]
"""
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import glob, importlib
import lib, assets
# every blender/assets_<style>.py contributes its ASSETS_* dict(s) — no registration needed
for _path in sorted(glob.glob(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assets_*.py'))):
    _mod = importlib.import_module(os.path.basename(_path)[:-3])
    for _key, _val in vars(_mod).items():
        if _key.startswith('ASSETS') and isinstance(_val, dict):
            assets.ASSETS.update(_val)

args = sys.argv[sys.argv.index('--') + 1:]
out = args[0]
only = args[1:]
os.makedirs(out, exist_ok=True)
manifest_path = os.path.join(out, 'manifest.json')
manifest = json.load(open(manifest_path)) if os.path.exists(manifest_path) else {}

def export(path):
    kwargs = dict(filepath=path, export_format='GLB', export_apply=True, export_yup=True,
                  export_materials='EXPORT', export_animations=False, export_lights=False, export_cameras=False)
    try:
        bpy.ops.export_scene.gltf(**kwargs)
    except TypeError:
        bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_apply=True)

for name, fn in assets.ASSETS.items():
    if only and name not in only:
        continue
    t = time.time()
    lib.clear_scene()
    objs = fn()
    objs = [o for o in objs if o is not None]
    x0, y0, z0, x1, y1, z1 = lib.bbox(objs)
    bpy.ops.object.select_all(action='SELECT')
    export(os.path.join(out, name + '.glb'))
    tris = sum(len(o.data.polygons) for o in objs if o.type == 'MESH')
    manifest[name] = {'size': [round(x1 - x0, 3), round(y1 - y0, 3), round(z1 - z0, 3)],
                      'min': [round(x0, 3), round(y0, 3), round(z0, 3)], 'max': [round(x1, 3), round(y1, 3), round(z1, 3)],
                      'faces': tris}
    print('ASSET %-20s %5.1fs  size %s  faces %d' % (name, time.time() - t, manifest[name]['size'], tris))

json.dump(manifest, open(manifest_path, 'w'), indent=1, sort_keys=True)
print('MANIFEST', manifest_path, len(manifest))
