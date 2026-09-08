"""Small parametric-modelling toolkit on top of bpy/bmesh.

Conventions: metres, Z up, the FRONT of every asset faces -Y (glTF's +Y-up
export turns that into +Z in three.js). Origin = floor centre of the asset.
"""
import bpy, bmesh, math, random
from mathutils import Vector, Matrix

# ----------------------------------------------------------------- materials
MATS = {}
PALETTE = {
    'oak': ((0.66, 0.52, 0.36, 1), 0.55, 0),
    'oak_light': ((0.78, 0.66, 0.50, 1), 0.5, 0),
    'walnut': ((0.30, 0.19, 0.12, 1), 0.45, 0),
    'ebony': ((0.09, 0.08, 0.08, 1), 0.4, 0),
    'cream_paint': ((0.93, 0.90, 0.84, 1), 0.45, 0),
    'white_paint': ((0.97, 0.96, 0.94, 1), 0.4, 0),
    'sage_paint': ((0.56, 0.63, 0.56, 1), 0.45, 0),
    'blue_paint': ((0.55, 0.64, 0.70, 1), 0.45, 0),
    'black_paint': ((0.12, 0.12, 0.13, 1), 0.4, 0),
    'brass': ((0.87, 0.68, 0.32, 1), 0.28, 1),
    'gilt': ((0.83, 0.64, 0.28, 1), 0.42, 1),
    'chrome': ((0.9, 0.9, 0.9, 1), 0.15, 1),
    'black_iron': ((0.10, 0.10, 0.10, 1), 0.55, 0.6),
    'linen_cream': ((0.90, 0.86, 0.78, 1), 0.95, 0),
    'linen_oat': ((0.80, 0.74, 0.64, 1), 0.95, 0),
    'boucle_white': ((0.95, 0.93, 0.88, 1), 1.0, 0),
    'velvet_blue': ((0.36, 0.46, 0.55, 1), 0.85, 0),
    'velvet_green': ((0.26, 0.38, 0.32, 1), 0.85, 0),
    'velvet_rose': ((0.80, 0.62, 0.60, 1), 0.85, 0),
    'velvet_mustard': ((0.78, 0.62, 0.30, 1), 0.85, 0),
    'fabric_grey': ((0.62, 0.62, 0.62, 1), 0.95, 0),
    'leather_tan': ((0.55, 0.36, 0.22, 1), 0.5, 0),
    'leather_green': ((0.16, 0.30, 0.25, 1), 0.5, 0),
    'marble_white': ((0.94, 0.93, 0.90, 1), 0.18, 0),
    'marble_black': ((0.12, 0.12, 0.13, 1), 0.18, 0),
    'ceramic_white': ((0.97, 0.97, 0.96, 1), 0.12, 0),
    'ceramic_blue': ((0.30, 0.42, 0.62, 1), 0.15, 0),
    'glass': ((0.85, 0.92, 0.95, 1), 0.05, 0),
    'crystal': ((0.92, 0.95, 1.0, 1), 0.03, 0),
    'paper': ((0.96, 0.93, 0.86, 1), 0.9, 0),
    'candle': ((0.96, 0.93, 0.85, 1), 0.6, 0),
    'bulb': ((1.0, 0.85, 0.6, 1), 0.3, 0),
    'ember': ((1.0, 0.35, 0.08, 1), 0.6, 0),
    'screen_black': ((0.02, 0.02, 0.02, 1), 0.2, 0),
    'terracotta': ((0.74, 0.44, 0.30, 1), 0.85, 0),
    'soil': ((0.20, 0.15, 0.11, 1), 1.0, 0),
    'leaf_green': ((0.20, 0.38, 0.18, 1), 0.7, 0),
    'leaf_olive': ((0.45, 0.52, 0.36, 1), 0.7, 0),
    'trunk': ((0.35, 0.28, 0.20, 1), 0.9, 0),
    'cane': ((0.80, 0.66, 0.42, 1), 0.7, 0),
    'stainless': ((0.75, 0.75, 0.75, 1), 0.3, 1),
    'books': ((0.5, 0.4, 0.3, 1), 0.8, 0),
    'canvas': ((0.9, 0.88, 0.82, 1), 0.9, 0),
    'mirror': ((1, 1, 1, 1), 0.02, 1),
    'plaster': ((0.95, 0.94, 0.91, 1), 0.7, 0),
    'stone_grey': ((0.62, 0.60, 0.57, 1), 0.8, 0),
    'rattan': ((0.72, 0.58, 0.38, 1), 0.75, 0),
    'ivory': ((0.95, 0.92, 0.85, 1), 0.5, 0),
    'copper': ((0.80, 0.50, 0.35, 1), 0.3, 1),
    # ---- Italian palette
    'leather_black': ((0.10, 0.09, 0.09, 1), 0.5, 0),
    'leather_taupe': ((0.52, 0.45, 0.38, 1), 0.55, 0),
    'marble_grey': ((0.34, 0.34, 0.36, 1), 0.2, 0),
    'calacatta': ((0.93, 0.91, 0.89, 1), 0.2, 0),
    'travertine': ((0.84, 0.79, 0.69, 1), 0.6, 0),
    'smoked_glass': ((0.40, 0.37, 0.35, 1), 0.05, 0),
    'champagne': ((0.80, 0.72, 0.55, 1), 0.3, 1),
    'ceramic_black': ((0.07, 0.07, 0.07, 1), 0.25, 0),
    'teak': ((0.62, 0.44, 0.27, 1), 0.6, 0),
    'lacquer_taupe': ((0.60, 0.56, 0.50, 1), 0.35, 0),
    'lacquer_grey': ((0.33, 0.33, 0.34, 1), 0.35, 0),
    'matte_white': ((0.94, 0.93, 0.91, 1), 0.7, 0),
    'matte_black': ((0.09, 0.09, 0.09, 1), 0.7, 0),
    'bronze': ((0.42, 0.32, 0.22, 1), 0.5, 1),
    'fabric_taupe': ((0.66, 0.60, 0.53, 1), 1.0, 0),
    'boucle_oat': ((0.84, 0.79, 0.71, 1), 1.0, 0),
    'velvet_charcoal': ((0.20, 0.20, 0.22, 1), 0.85, 0),
    'velvet_olive': ((0.36, 0.38, 0.29, 1), 0.85, 0),
    'velvet_terracotta': ((0.64, 0.38, 0.29, 1), 0.85, 0),
    'linen_white': ((0.93, 0.91, 0.87, 1), 0.95, 0),
    'linen_grey': ((0.62, 0.61, 0.59, 1), 0.95, 0),
    'led': ((1.0, 0.92, 0.80, 1), 0.4, 0),
    'oak_smoked': ((0.42, 0.34, 0.27, 1), 0.55, 0),
    'fabric_charcoal': ((0.22, 0.22, 0.23, 1), 1.0, 0),
    'velvet_forest': ((0.20, 0.33, 0.26, 1), 0.85, 0),
    'velvet_cognac': ((0.58, 0.33, 0.20, 1), 0.85, 0),
    'lacquer_charcoal': ((0.16, 0.16, 0.17, 1), 0.3, 0),
    'knit_grey': ((0.55, 0.53, 0.50, 1), 1.0, 0),
    'brass_mesh': ((0.60, 0.48, 0.28, 1), 0.5, 0.8),
    'wine': ((0.20, 0.05, 0.08, 1), 0.1, 0),
    # ---- Modern minimalist (mo_) palette
    'oak_pale': ((0.80, 0.69, 0.53, 1), 0.55, 0),
    'oak_veneer': ((0.83, 0.73, 0.57, 1), 0.5, 0),
    'lacquer_warm_white': ((0.92, 0.90, 0.86, 1), 0.35, 0),
    'lacquer_greige': ((0.70, 0.66, 0.60, 1), 0.35, 0),
    'boucle_cream': ((0.92, 0.89, 0.83, 1), 1.0, 0),
    'linen_sand': ((0.78, 0.72, 0.62, 1), 0.95, 0),
    'fabric_greige': ((0.62, 0.58, 0.52, 1), 1.0, 0),
    'fabric_oat': ((0.84, 0.79, 0.70, 1), 1.0, 0),
    'velvet_sage': ((0.55, 0.60, 0.52, 1), 0.85, 0),
    'leather_camel': ((0.66, 0.48, 0.32, 1), 0.5, 0),
    'ceramic_cream': ((0.93, 0.90, 0.85, 1), 0.35, 0),
    'ceramic_sand': ((0.80, 0.72, 0.60, 1), 0.6, 0),
    'clay': ((0.62, 0.44, 0.34, 1), 0.85, 0),
    'knit_oat': ((0.86, 0.81, 0.72, 1), 1.0, 0),
    'acrylic_white': ((0.96, 0.95, 0.92, 1), 0.3, 0),
    'slab_white': ((0.92, 0.90, 0.87, 1), 0.25, 0),   # warm-white sintered stone (three.js: white marble texture)
    # ---- Song (sg_) palette
    'ash': ((0.84, 0.76, 0.62, 1), 0.55, 0),
    'ash_dark': ((0.62, 0.52, 0.40, 1), 0.5, 0),
    'bamboo': ((0.78, 0.66, 0.44, 1), 0.6, 0),
    'celadon': ((0.66, 0.77, 0.73, 1), 0.12, 0),
    'celadon_pale': ((0.80, 0.87, 0.84, 1), 0.12, 0),
    'ceramic_ivory': ((0.94, 0.91, 0.85, 1), 0.15, 0),
    'linen_sage': ((0.70, 0.74, 0.66, 1), 0.95, 0),
    'linen_rice': ((0.92, 0.89, 0.82, 1), 0.95, 0),
    'fabric_indigo': ((0.20, 0.26, 0.38, 1), 1.0, 0),
    'fabric_moon': ((0.86, 0.89, 0.87, 1), 0.7, 0),
    'fabric_rush': ((0.80, 0.72, 0.55, 1), 0.95, 0),
    'paper_rice': ((0.94, 0.91, 0.84, 1), 0.9, 0),
    'stone_qing': ((0.45, 0.48, 0.48, 1), 0.7, 0),
    'ink': ((0.12, 0.12, 0.13, 1), 0.5, 0),
    'cinnabar': ((0.62, 0.20, 0.16, 1), 0.5, 0),
    'clay_dark': ((0.30, 0.26, 0.24, 1), 0.8, 0),
    'moss': ((0.35, 0.42, 0.28, 1), 0.9, 0),
    'leaf_bamboo': ((0.45, 0.58, 0.32, 1), 0.7, 0),
    'pine_dark': ((0.22, 0.34, 0.24, 1), 0.8, 0),
}

def mat(name):
    if name in MATS:
        return MATS[name]
    color, rough, metal = PALETTE[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    if name in ('bulb', 'ember', 'led'):
        bsdf.inputs['Emission Color'].default_value = color
        bsdf.inputs['Emission Strength'].default_value = 4.0
    if name in ('glass', 'crystal', 'smoked_glass'):
        bsdf.inputs['Alpha'].default_value = 0.25
        for attr, val in (('surface_render_method', 'BLENDED'), ('blend_method', 'BLEND')):
            try:
                setattr(m, attr, val)
            except Exception:
                pass
    MATS[name] = m
    return m

# ----------------------------------------------------------------- scene
def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear()

def link(obj):
    bpy.context.scene.collection.objects.link(obj)
    return obj

def mesh_from_bm(name, bm, m=None, smooth=False):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new(name, me)
    if m is not None:
        me.materials.append(mat(m) if isinstance(m, str) else m)
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    return link(obj)

def bevel(obj, width=0.01, segments=3, angle=None):
    mod = obj.modifiers.new('bevel', 'BEVEL')
    mod.width = width
    mod.segments = segments
    mod.limit_method = 'ANGLE'
    mod.angle_limit = math.radians(40 if angle is None else angle)
    return obj

def subsurf(obj, levels=2):
    mod = obj.modifiers.new('subsurf', 'SUBSURF')
    mod.levels = levels
    mod.render_levels = levels
    return obj

def shade_smooth(obj):
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj

# ----------------------------------------------------------------- primitives
def box(name, size, loc=(0, 0, 0), m='oak', bevel_w=0, segs=3, rot=(0, 0, 0), smooth=None):
    """Axis-aligned box; loc = centre."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    obj = mesh_from_bm(name, bm, m, smooth=bool(bevel_w) if smooth is None else smooth)
    obj.location = loc
    obj.rotation_euler = rot
    if bevel_w:
        bevel(obj, bevel_w, segs)
    return obj

def rbox(name, size, loc=(0, 0, 0), m='linen_cream', r=None, segs=5, rot=(0, 0, 0)):
    """Soft rounded box (cushions, mattresses, upholstery)."""
    r = r or min(size) * 0.35
    return box(name, size, loc, m, bevel_w=r, segs=segs, rot=rot, smooth=True)

def cyl(name, r, h, loc=(0, 0, 0), m='brass', segs=32, r2=None, rot=(0, 0, 0), bevel_w=0):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r, radius2=r if r2 is None else r2, depth=h)
    obj = mesh_from_bm(name, bm, m, smooth=True)
    obj.location = loc
    obj.rotation_euler = rot
    # keep the caps flat
    for p in obj.data.polygons:
        if abs(p.normal.z) > 0.9:
            p.use_smooth = False
    if bevel_w:
        bevel(obj, bevel_w, 3)
    return obj

def sphere(name, r, loc=(0, 0, 0), m='brass', segs=24, scale=(1, 1, 1)):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=max(8, segs // 2), radius=r)
    bmesh.ops.scale(bm, vec=Vector(scale), verts=bm.verts)
    obj = mesh_from_bm(name, bm, m, smooth=True)
    obj.location = loc
    return obj

def torus(name, R, r, loc=(0, 0, 0), m='brass', segs=32, rsegs=12, scale=(1, 1, 1), rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=segs, minor_segments=rsegs, location=loc, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(mat(m))
    shade_smooth(obj)
    return obj

def lathe(name, profile, loc=(0, 0, 0), m='brass', segs=32, smooth=True):
    """Surface of revolution around Z. profile = [(r, z), ...] bottom->top."""
    bm = bmesh.new()
    verts = [bm.verts.new((max(r, 1e-4), 0, z)) for r, z in profile]
    edges = [bm.edges.new((verts[i], verts[i + 1])) for i in range(len(verts) - 1)]
    bmesh.ops.spin(bm, geom=verts + edges, cent=(0, 0, 0), axis=(0, 0, 1), angle=math.pi * 2, steps=segs, use_merge=True)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    # cap top/bottom if open
    for z_end in (profile[0][1], profile[-1][1]):
        ring = [v for v in bm.verts if abs(v.co.z - z_end) < 1e-6 and v.co.length > 2e-4]
        if len(ring) > 2:
            try:
                bm.faces.new(ring)
            except ValueError:
                pass
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    obj = mesh_from_bm(name, bm, m, smooth=smooth)
    obj.location = loc
    return obj

def lathe_arc(name, profile, angle, loc=(0, 0, 0), m='brass', segs=24, start=0.0, thickness=0.0, smooth=True):
    """Partial surface of revolution (shell). angle in radians, start = rotation about Z."""
    bm = bmesh.new()
    verts = [bm.verts.new((max(r, 1e-4), 0, z)) for r, z in profile]
    edges = [bm.edges.new((verts[i], verts[i + 1])) for i in range(len(verts) - 1)]
    bmesh.ops.spin(bm, geom=verts + edges, cent=(0, 0, 0), axis=(0, 0, 1), angle=angle, steps=segs, use_merge=False)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    obj = mesh_from_bm(name, bm, m, smooth=smooth)
    obj.location = loc
    obj.rotation_euler.z = start
    if thickness:
        mod = obj.modifiers.new('solid', 'SOLIDIFY')
        mod.thickness = thickness
        mod.offset = 0
    return obj

def tube(name, points, radius, m='brass', res=8, closed=False, taper=None):
    """Smooth bezier tube through points."""
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = radius
    cu.bevel_resolution = res
    cu.fill_mode = 'FULL'
    cu.use_fill_caps = True
    sp = cu.splines.new('BEZIER')
    sp.bezier_points.add(len(points) - 1)
    for bp, p in zip(sp.bezier_points, points):
        bp.co = Vector(p)
        bp.handle_left_type = bp.handle_right_type = 'AUTO'
    sp.use_cyclic_u = closed
    obj = bpy.data.objects.new(name, cu)
    link(obj)
    obj.data.materials.append(mat(m))
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target='MESH')
    obj.select_set(False)
    shade_smooth(obj)
    return obj

def extrude_shape(name, points, depth, loc=(0, 0, 0), m='cream_paint', rot=(0, 0, 0), bevel_w=0):
    """Extrude a planar polygon (XZ plane, listed counter-clockwise) along +Y by depth. Centre on Y."""
    bm = bmesh.new()
    verts = [bm.verts.new((x, -depth / 2, z)) for x, z in points]
    face = bm.faces.new(verts)
    r = bmesh.ops.extrude_face_region(bm, geom=[face])
    ext_verts = [g for g in r['geom'] if isinstance(g, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=(0, depth, 0), verts=ext_verts)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    obj = mesh_from_bm(name, bm, m)
    obj.location = loc
    obj.rotation_euler = rot
    if bevel_w:
        bevel(obj, bevel_w, 2)
    return obj

def arch_points(w, h, r=None, n=24, base=0.0):
    """Rectangle with a round top: width w, total height h, arc radius r (default w/2)."""
    r = r or w / 2
    pts = [(-w / 2, base), (w / 2, base), (w / 2, h - r)]
    for i in range(1, n):
        a = math.pi * i / n
        pts.append((math.cos(a) * r, h - r + math.sin(a) * r))
    pts.append((-w / 2, h - r))
    return pts

def leaf(name, length, width, loc, rot, m='leaf_green', curl=0.35, segs=6):
    """A curled leaf blade lying along +X (tip at +X)."""
    bm = bmesh.new()
    rows = []
    for i in range(segs + 1):
        t = i / segs
        x = t * length
        half = width * 0.5 * math.sin(math.pi * (0.08 + 0.92 * t)) if t < 1 else 0.001
        z = -curl * length * (t ** 2) * 0.5
        rows.append((bm.verts.new((x, -half, z)), bm.verts.new((x, half, z + half * 0.4))))
    for i in range(segs):
        a, b = rows[i]
        c, d = rows[i + 1]
        bm.faces.new((a, b, d, c))
    obj = mesh_from_bm(name, bm, m, smooth=True)
    obj.location = loc
    obj.rotation_euler = rot
    return obj

def panel_frame(name, w, h, loc, m='cream_paint', bar=0.035, depth=0.012, rot=(0, 0, 0)):
    """Applied rectangular moulding frame in the XZ plane (face -Y). loc = centre. Single mesh."""
    bm = bmesh.new()
    def cube(size, center):
        r = bmesh.ops.create_cube(bm, size=1.0)
        vs = r['verts']
        bmesh.ops.scale(bm, vec=Vector(size), verts=vs)
        bmesh.ops.translate(bm, vec=Vector(center), verts=vs)
    cube((w, depth, bar), (0, 0, -h / 2 + bar / 2))
    cube((w, depth, bar), (0, 0, h / 2 - bar / 2))
    cube((bar, depth, h - 2 * bar), (-w / 2 + bar / 2, 0, 0))
    cube((bar, depth, h - 2 * bar), (w / 2 - bar / 2, 0, 0))
    obj = mesh_from_bm(name, bm, m)
    obj.location = loc
    obj.rotation_euler = rot
    bevel(obj, 0.003, 2)
    return obj

def join(objs, name):
    objs = [o for o in objs if o is not None]
    if len(objs) == 1:
        objs[0].name = name
        return objs[0]
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    obj = bpy.context.active_object
    obj.name = name
    obj.select_set(False)
    return obj

def apply_modifiers(obj):
    bpy.context.view_layer.objects.active = obj
    for mod in list(obj.modifiers):
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj

def rotate_z(obj, deg):
    obj.rotation_euler.z += math.radians(deg)
    return obj

def mirror_x(obj, name=None):
    """Copy of obj mirrored across the YZ plane."""
    cp = obj.copy()
    cp.data = obj.data.copy()
    cp.name = name or obj.name + '_m'
    link(cp)
    cp.scale.x *= -1
    return cp

def bbox(objs):
    """World-space AABB from evaluated mesh vertices (modifiers applied)."""
    xs, ys, zs = [], [], []
    dg = bpy.context.evaluated_depsgraph_get()
    for o in objs:
        if o.type != 'MESH':
            continue
        ev = o.evaluated_get(dg)
        me = ev.to_mesh()
        mw = ev.matrix_world
        for v in me.vertices:
            p = mw @ v.co
            xs.append(p.x); ys.append(p.y); zs.append(p.z)
        ev.to_mesh_clear()
    return (min(xs), min(ys), min(zs), max(xs), max(ys), max(zs))
