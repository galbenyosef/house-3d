"""Song-dynasty aesthetic (宋式) furniture, lighting and fittings. Same conventions as assets.py:
metres, front faces -Y, origin at the floor centre (wall-hung pieces: origin on the wall plane
at the piece's bottom; ceiling fixtures span z = 0 .. H with the canopy at H)."""
import math, random
from mathutils import Vector
from lib import (box, rbox, cyl, sphere, torus, lathe, lathe_arc, tube, extrude_shape, leaf,
                 join, mesh_from_bm, bevel, shade_smooth, panel_frame)
from assets import leaf_cloud, bead_chain
import bmesh, bpy

# ----------------------------------------------------------------- helpers
def slats(name, w, h, loc, sw=0.02, gap=0.03, depth=0.02, m='ash', rot=(0, 0, 0), nmax=60):
    """Row of vertical slats in the XZ plane (face -Y), centred at loc, filling width w. One mesh."""
    bm = bmesh.new()
    pitch = sw + gap
    n = max(1, min(nmax, int((w + gap + 1e-6) // pitch)))
    total = n * sw + (n - 1) * gap
    for i in range(n):
        x = -total / 2 + sw / 2 + i * pitch
        r = bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.scale(bm, vec=Vector((sw, depth, h)), verts=r['verts'])
        bmesh.ops.translate(bm, vec=Vector((x, 0, 0)), verts=r['verts'])
    obj = mesh_from_bm(name, bm, m)
    obj.location = loc
    obj.rotation_euler = rot
    return obj

def bars(name, items, m='ash', bevel_w=0.003):
    """Several axis-aligned boxes [(size, centre), ...] as one mesh (frames, stretchers)."""
    bm = bmesh.new()
    for size, centre in items:
        r = bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.scale(bm, vec=Vector(size), verts=r['verts'])
        bmesh.ops.translate(bm, vec=Vector(centre), verts=r['verts'])
    obj = mesh_from_bm(name, bm, m)
    if bevel_w:
        bevel(obj, bevel_w, 2)
    return obj

def legs4(name, lx, ly, h, s=0.045, m='ash', splay=0.0, z0=0.0, round_=False):
    """Four legs centred at (+-lx, +-ly); splay tilts the tops inward (radians)."""
    P = []
    for sx in (-1, 1):
        for sy in (-1, 1):
            nm = '%s%d%d' % (name, sx > 0, sy > 0)
            loc = (sx * lx, sy * ly, z0 + h / 2)
            rot = (sy * splay, -sx * splay, 0)
            if round_:
                P.append(cyl(nm, s / 2, h, loc, m, 14, rot=rot))
            else:
                P.append(box(nm, (s, s, h), loc, m, 0.003, rot=rot))
    return P

def apron(name, lx, ly, s, ztop, h=0.08, t=0.02, m='ash'):
    """牙板 boards between the legs, just inside the leg faces, hanging from ztop."""
    items = []
    for sy in (-1, 1):
        items.append(((2 * lx - s + 0.01, t, h), (0, sy * (ly + s / 2 - t / 2 - 0.004), ztop - h / 2)))
    for sx in (-1, 1):
        items.append(((t, 2 * ly - s + 0.01, h), (sx * (lx + s / 2 - t / 2 - 0.004), 0, ztop - h / 2)))
    return bars(name, items, m)

def stretchers(name, lx, ly, s, z, t=0.025, m='ash', sides=True, front=True, back=True, dz=0.0):
    """Leg stretchers; the front one sits lower than the sides and the back one higher (步步高)."""
    items = []
    if front:
        items.append(((2 * lx - s + 0.01, t, t), (0, -ly, z)))
    if back:
        items.append(((2 * lx - s + 0.01, t, t), (0, ly, z + 2 * dz)))
    if sides:
        for sx in (-1, 1):
            items.append(((t, 2 * ly - s + 0.01, t), (sx * lx, 0, z + dz)))
    return bars(name, items, m, 0)

def woven_seat(name, w, d, z, m='fabric_rush', frame=0.05):
    """Inset woven panel sitting 6 mm proud of a seat frame top at z."""
    return box(name, (w - 2 * frame, d - 2 * frame, 0.012), (0, 0, z + 0.002), m, 0.004)

def teapot(name, loc, s=1.0, m='clay_dark'):
    x, y, z = loc
    prof = [(0.001, 0), (0.045, 0), (0.062, 0.015), (0.066, 0.05), (0.056, 0.085), (0.032, 0.10),
            (0.034, 0.108), (0.024, 0.114), (0.001, 0.116)]
    P = [lathe(name + '_body', [(r * s, h * s) for r, h in prof], loc, m, 24)]
    P.append(sphere(name + '_knob', 0.011 * s, (x, y, z + 0.122 * s), m, 10))
    P.append(tube(name + '_spout', [(x + 0.05 * s, y, z + 0.045 * s), (x + 0.085 * s, y, z + 0.075 * s), (x + 0.10 * s, y, z + 0.108 * s)], 0.007 * s, m, res=5))
    P.append(tube(name + '_handle', [(x - 0.052 * s, y, z + 0.04 * s), (x - 0.098 * s, y, z + 0.072 * s), (x - 0.05 * s, y, z + 0.10 * s)], 0.006 * s, m, res=5))
    return P

def cup(name, loc, s=1.0, m='celadon'):
    prof = [(0.001, 0), (0.02, 0), (0.028, 0.03), (0.031, 0.046), (0.027, 0.046), (0.023, 0.012), (0.001, 0.01)]
    return lathe(name, [(r * s, h * s) for r, h in prof], loc, m, 20)

def vase(name, loc, h=0.32, m='celadon'):
    prof = [(0.045, 0), (0.07, 0.03), (0.08, 0.10), (0.072, 0.18), (0.046, 0.24), (0.040, 0.28), (0.05, 0.31), (0.044, 0.32), (0.001, 0.31)]
    k = h / 0.32
    return lathe(name, [(r * k, z * k) for r, z in prof], loc, m, 28)

def burner(name, loc, s=1.0, m='bronze'):
    """香炉: bronze body on three feet with a domed lid and two ears."""
    x, y, z = loc
    body = [(0.001, 0.03), (0.045, 0.03), (0.06, 0.045), (0.065, 0.08), (0.056, 0.105), (0.058, 0.112), (0.052, 0.116), (0.001, 0.116)]
    lid = [(0.001, 0.112), (0.049, 0.112), (0.056, 0.119), (0.05, 0.131), (0.028, 0.145), (0.012, 0.15), (0.012, 0.165), (0.001, 0.175)]
    P = [lathe(name + '_body', [(r * s, h * s) for r, h in body], loc, m, 24),
         lathe(name + '_lid', [(r * s, h * s) for r, h in lid], loc, m, 24)]
    for i in range(3):
        a = math.pi / 2 + i * 2 * math.pi / 3
        P.append(cyl(name + '_foot%d' % i, 0.009 * s, 0.036 * s, (x + math.cos(a) * 0.04 * s, y + math.sin(a) * 0.04 * s, z + 0.018 * s), m, 10))
    for sx in (-1, 1):
        P.append(tube(name + '_ear%d' % (sx > 0), [(x + sx * 0.055 * s, y, z + 0.085 * s), (x + sx * 0.069 * s, y, z + 0.108 * s), (x + sx * 0.052 * s, y, z + 0.126 * s)], 0.005 * s, m, res=5))
    return P

def plum_branch(name, base, seed=3, h=0.55, spread=0.13, n=30):
    """Three bare branches with small cinnabar blossoms (one mesh)."""
    rr = random.Random(seed)
    x0, y0, z0 = base
    P = []
    paths = []
    for i in range(3):
        a = i * 2.1 + 0.4
        r1, r2 = spread * 0.45, spread
        pts = [(x0, y0, z0), (x0 + math.cos(a) * r1, y0 + math.sin(a) * r1, z0 + h * 0.45),
               (x0 + math.cos(a + 0.5) * r2 * 0.8, y0 + math.sin(a + 0.5) * r2 * 0.8, z0 + h * (0.8 + 0.2 * rr.random())),
               (x0 + math.cos(a + 0.2) * r2, y0 + math.sin(a + 0.2) * r2, z0 + h * (0.55 + 0.45 * rr.random()))]
        if i == 0:
            pts[-1] = (x0 + math.cos(a) * r2 * 0.4, y0 + math.sin(a) * r2 * 0.4, z0 + h)
        P.append(tube(name + '_br%d' % i, pts, 0.005 if i else 0.007, 'trunk', res=4))
        paths.append(pts)
    bm = bmesh.new()
    for k in range(n):
        pts = paths[k % 3]
        t = 0.35 + 0.65 * rr.random()
        seg = min(2, int(t * 3))
        f = t * 3 - seg
        p = Vector(pts[seg]).lerp(Vector(pts[seg + 1]), f)
        p += Vector((rr.random() - 0.5, rr.random() - 0.5, rr.random() - 0.5)) * 0.02
        r = bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=5, radius=0.012)
        bmesh.ops.translate(bm, vec=p, verts=r['verts'])
    P.append(mesh_from_bm(name + '_blossoms', bm, 'cinnabar', smooth=True))
    return P

def stud_ring(name, R, z, n=16, r=0.007, m='bronze'):
    """Ring of small studs (one mesh)."""
    bm = bmesh.new()
    for i in range(n):
        a = i * 2 * math.pi / n
        s = bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=4, radius=r)
        bmesh.ops.translate(bm, vec=Vector((math.cos(a) * R, math.sin(a) * R, z)), verts=s['verts'])
    return mesh_from_bm(name, bm, m, smooth=True)

def lattice_door(name, w, h, loc, sw=0.02, gap=0.06, bar=0.05, depth=0.025, m='ash', paper='paper_rice'):
    """Ash frame + paper infill + 直棂 slats; loc = centre of the door front plane (face -Y).
    Frame occupies y loc-depth .. loc (its back is proud of any body behind by >= 2 mm)."""
    x, y, z = loc
    P = [panel_frame(name + '_f', w, h, (x, y - depth / 2, z), m, bar, depth)]
    P.append(box(name + '_p', (w - 2 * bar + 0.02, 0.004, h - 2 * bar + 0.02), (x, y - 0.0045, z), paper))
    P.append(slats(name + '_s', w - 2 * bar - 0.01, h - 2 * bar - 0.01, (x, y - 0.0125, z), sw, gap, 0.012, m))
    return P

# ----------------------------------------------------------------- seating
def sg_sofa(w=2.4, d=0.95):
    """罗汉床: slatted three-sided surround on a low platform with loose cushions."""
    s, lx, ly = 0.05, w / 2 - 0.07, d / 2 - 0.06
    P = [box('top', (w, d, 0.04), (0, 0, 0.40), 'ash', 0.005)]
    P += legs4('leg', lx, ly, 0.38, s)
    P.append(apron('apron', lx, ly, s, 0.38, 0.10, 0.02))
    # surround: back + two arms, 0.30 above the seat
    zb, hb = 0.42, 0.30
    fb = 0.04
    yb = d / 2 - fb / 2
    items = [((w, fb, fb), (0, yb, zb + hb - fb / 2)), ((w, fb, fb), (0, yb, zb + fb / 2))]
    for sx in (-1, 1):
        items.append(((fb, fb, hb), (sx * (w / 2 - fb / 2), yb, zb + hb / 2)))
    al = d - fb - 0.16
    for sx in (-1, 1):
        xa = sx * (w / 2 - fb / 2)
        ya = d / 2 - fb - al / 2
        items.append(((fb, al, fb), (xa, ya, zb + hb - fb / 2)))
        items.append(((fb, al, fb), (xa, ya, zb + fb / 2)))
        items.append(((fb, fb, hb), (xa, d / 2 - fb - al + fb / 2, zb + hb / 2)))
    P.append(bars('frame', items, 'ash'))
    P.append(slats('backslats', w - 2 * fb - 0.02, hb - 2 * fb, (0, yb, zb + hb / 2), 0.02, 0.03, 0.02))
    for sx in (-1, 1):
        P.append(slats('armslats%d' % (sx > 0), al - 2 * fb - 0.02, hb - 2 * fb, (sx * (w / 2 - fb / 2), d / 2 - fb - al / 2, zb + hb / 2), 0.02, 0.03, 0.02, rot=(0, 0, math.pi / 2)))
    P.append(rbox('cushion', (w - 0.12, d - 0.16, 0.10), (0, -0.03, 0.47), 'linen_rice', r=0.03))
    for i, x in enumerate((-0.55, 0.45)):
        P.append(rbox('back%d' % i, (0.50, 0.12, 0.30), (x, d / 2 - 0.13, 0.665), 'linen_sage', r=0.035, rot=(-0.18, 0, 0)))
    P.append(cyl('bolster', 0.09, 0.50, (-w / 2 + 0.36, 0.0, 0.61), 'fabric_indigo', 20, rot=(0, math.pi / 2, 0), bevel_w=0.02))
    P.append(rbox('throw', (0.16, 0.44, 0.05), (w / 2 - 0.03, -0.05, zb + hb + 0.025), 'fabric_rush', r=0.015))
    P.append(rbox('throwdrop', (0.04, 0.42, 0.26), (w / 2 + 0.01, -0.05, zb + hb - 0.12), 'fabric_rush', r=0.012))
    return P

def sg_armchair():
    """圈椅: continuous horseshoe rail from the front grips over the crest, S-curved splat."""
    R, yc = 0.29, 0.02
    def ring(a):
        return (math.cos(a) * R, yc + math.sin(a) * R, 0.84 + 0.14 * math.sin(a))
    pts = [(0.31, -0.25, 0.70), (0.28, -0.12, 0.76)]
    pts += [ring(a * math.pi / 8) for a in range(0, 9)]
    pts += [(-0.28, -0.12, 0.76), (-0.31, -0.25, 0.70)]
    P = [tube('ring', pts, 0.02, 'ash', res=8)]
    P.append(box('seat', (0.56, 0.50, 0.04), (0, 0.01, 0.43), 'ash', 0.004))
    P.append(woven_seat('woven', 0.56, 0.50, 0.45, frame=0.045))
    ax = math.acos(0.24 / R)
    zr = 0.84 + 0.14 * math.sin(ax)
    for sx in (-1, 1):
        P.append(cyl('rear%d' % (sx > 0), 0.02, zr, (sx * 0.24, yc + math.sin(ax) * R, zr / 2), 'ash', 14))
        P.append(cyl('front%d' % (sx > 0), 0.02, 0.71, (sx * 0.26, -0.20, 0.355), 'ash', 14))
        P.append(tube('brace%d' % (sx > 0), [(sx * 0.255, -0.03, 0.45), (sx * 0.265, -0.06, 0.60), (sx * 0.27, -0.12, 0.745)], 0.011, 'ash', res=5))
    # S-curved back splat (side profile in the YZ plane, extruded across X)
    spine = [(0.20, 0.45), (0.25, 0.56), (0.29, 0.70), (0.30, 0.84), (0.29, 0.97)]
    t = 0.007
    prof = [(y + t, z) for y, z in spine] + [(y - t, z) for y, z in reversed(spine)]
    P.append(extrude_shape('splat', prof, 0.14, (0, 0, 0), 'ash', rot=(0, 0, math.pi / 2), bevel_w=0.002))
    P.append(apron('apron', 0.26, 0.23, 0.04, 0.41, 0.06, 0.018))
    P.append(stretchers('stretch', 0.26, 0.19, 0.04, 0.12, 0.022, dz=0.05))
    return P

def sg_rose_chair():
    """玫瑰椅: low straight lattice back, straight arms, woven seat."""
    lx, ly = 0.26, 0.20
    P = []
    for sx in (-1, 1):
        P.append(cyl('rear%d' % (sx > 0), 0.02, 0.85, (sx * lx, ly, 0.425), 'ash', 14))
        P.append(cyl('front%d' % (sx > 0), 0.02, 0.65, (sx * lx, -ly, 0.325), 'ash', 14))
    P.append(box('seat', (0.56, 0.48, 0.04), (0, 0, 0.44), 'ash', 0.004))
    P.append(woven_seat('woven', 0.56, 0.48, 0.46, frame=0.045))
    items = [((2 * lx, 0.03, 0.03), (0, ly, 0.835)), ((2 * lx - 0.04, 0.025, 0.025), (0, ly, 0.56)),
             ((2 * lx - 0.04, 0.025, 0.025), (0, ly, 0.70))]
    for sx in (-1, 1):
        items.append(((0.03, 2 * ly, 0.03), (sx * lx, 0, 0.635)))
        items.append(((0.025, 2 * ly - 0.04, 0.025), (sx * lx, 0, 0.55)))
    P.append(bars('rails', items, 'ash'))
    P.append(slats('backlat', 2 * lx - 0.05, 0.26, (0, ly, 0.69), 0.012, 0.06, 0.012))
    P.append(slats('backlat2', 2 * lx - 0.05, 0.10, (0, ly, 0.51), 0.012, 0.06, 0.012))
    for sx in (-1, 1):
        P.append(slats('armlat%d' % (sx > 0), 2 * ly - 0.08, 0.07, (sx * lx, 0, 0.59), 0.012, 0.06, 0.012, rot=(0, 0, math.pi / 2)))
    P.append(apron('apron', lx, ly, 0.04, 0.42, 0.06, 0.018))
    P.append(stretchers('stretch', lx, ly, 0.04, 0.12, 0.022, dz=0.05))
    return P

def sg_stool():
    """鼓凳: celadon drum stool with stud rings."""
    prof = [(0.001, 0), (0.13, 0), (0.16, 0.02), (0.178, 0.10), (0.18, 0.22), (0.176, 0.33), (0.16, 0.42), (0.145, 0.45), (0.001, 0.45)]
    P = [lathe('drum', prof, (0, 0, 0), 'celadon', 40)]
    P.append(torus('ring1', 0.171, 0.006, (0, 0, 0.065), 'celadon', 40, 8))
    P.append(torus('ring2', 0.172, 0.006, (0, 0, 0.385), 'celadon', 40, 8))
    P.append(stud_ring('studs1', 0.176, 0.045, 18))
    P.append(stud_ring('studs2', 0.176, 0.405, 18))
    return P

def sg_bench(w=1.0):
    """条凳: thick top on splayed legs."""
    P = [box('top', (w, 0.32, 0.04), (0, 0, 0.43), 'ash', 0.005)]
    P += legs4('leg', w / 2 - 0.10, 0.10, 0.41, 0.045, splay=0.07)
    P.append(bars('stretch', [((0.025, 0.21, 0.025), (sx * (w / 2 - 0.10), 0, 0.16)) for sx in (-1, 1)] +
                  [((w - 0.22, 0.022, 0.03), (0, 0, 0.16))], 'ash', 0))
    return P

def sg_cushion():
    """蒲团: round rush cushion."""
    prof = [(0.001, 0), (0.17, 0), (0.21, 0.012), (0.225, 0.05), (0.212, 0.088), (0.17, 0.10), (0.05, 0.10), (0.02, 0.092), (0.001, 0.092)]
    P = [lathe('puff', prof, (0, 0, 0), 'fabric_rush', 40)]
    for i in range(3):
        P.append(torus('coil%d' % i, 0.06 + i * 0.05, 0.004, (0, 0, 0.101), 'fabric_rush', 40, 6))
    return P

def sg_lounge_outdoor():
    """Bamboo lounge chair: slat seat sweeping up into a back, side rails in bamboo."""
    P = []
    th = -0.646
    for s in (-1, 1):
        x = s * 0.31
        P.append(tube('rail%d' % (s > 0), [(x, -0.66, 0.34), (x, 0.25, 0.34), (x, 0.62, 0.82)], 0.016, 'bamboo', res=7))
        P.append(tube('legf%d' % (s > 0), [(x, -0.60, 0.0), (x, -0.62, 0.34)], 0.014, 'bamboo', res=6))
        P.append(tube('legb%d' % (s > 0), [(x, 0.30, 0.0), (x, 0.28, 0.34)], 0.014, 'bamboo', res=6))
        P.append(tube('side%d' % (s > 0), [(x, -0.60, 0.16), (x, 0.30, 0.16)], 0.010, 'bamboo', res=6))
    P.append(tube('cross1', [(-0.31, -0.60, 0.16), (0.31, -0.60, 0.16)], 0.010, 'bamboo', res=6))
    P.append(tube('cross2', [(-0.31, 0.30, 0.16), (0.31, 0.30, 0.16)], 0.010, 'bamboo', res=6))
    for i in range(10):
        P.append(box('slat%d' % i, (0.60, 0.055, 0.018), (0, -0.62 + i * 0.085, 0.35), 'bamboo', 0.003))
    for i in range(7):
        t = 0.05 + i * 0.085
        y, z = 0.25 + 0.602 * t, 0.34 + 0.798 * t
        P.append(box('bslat%d' % i, (0.60, 0.018, 0.055), (0, y, z), 'bamboo', 0.003, rot=(th, 0, 0)))
    P.append(rbox('cushion', (0.56, 0.78, 0.06), (0, -0.20, 0.39), 'linen_sage', r=0.02))
    P.append(rbox('backcush', (0.54, 0.06, 0.46), (0, 0.42, 0.62), 'linen_sage', r=0.02, rot=(th, 0, 0)))
    return P

# ----------------------------------------------------------------- tables and storage
def trestle(name, x, depth, ztop, r=0.028, m='ash', rail=True):
    """夹头榫 trestle: two round posts on a floor rail with an apron board between them."""
    ly = depth / 2 - 0.08
    P = []
    for sy in (-1, 1):
        P.append(cyl('%s_post%d' % (name, sy > 0), r, ztop - 0.04, (x, sy * ly, 0.04 + (ztop - 0.04) / 2), m, 14))
    P.append(box(name + '_board', (0.035, 2 * ly - 2 * r + 0.02, 0.14), (x, 0, ztop - 0.07), m, 0.003))
    if rail:
        P.append(box(name + '_rail', (0.07, 2 * ly + 0.12, 0.04), (x, 0, 0.02), m, 0.004))
    return P

def sg_tea_table():
    """茶桌: low table with a tea tray, clay teapot, cups and a small vase."""
    w, d, s = 1.2, 0.6, 0.045
    lx, ly, zt = w / 2 - 0.08, d / 2 - 0.07, 0.36
    P = [box('top', (w, d, 0.04), (0, 0, zt - 0.02), 'ash', 0.005)]
    P += legs4('leg', lx, ly, zt - 0.04, s)
    P.append(apron('apron', lx, ly, s, zt - 0.04, 0.07, 0.02))
    tx = -0.22
    P.append(box('tray', (0.42, 0.28, 0.015), (tx, 0, zt + 0.0095), 'ash_dark', 0.003))
    P.append(bars('trayrim', [((0.42, 0.012, 0.02), (tx, -0.134, zt + 0.02)), ((0.42, 0.012, 0.02), (tx, 0.134, zt + 0.02)),
                              ((0.012, 0.256, 0.02), (tx - 0.204, 0, zt + 0.02)), ((0.012, 0.256, 0.02), (tx + 0.204, 0, zt + 0.02))], 'ash_dark', 0))
    P += teapot('pot', (tx - 0.08, 0.02, zt + 0.015), 0.75)
    for i, (cx, cy) in enumerate(((0.06, -0.07), (0.13, -0.02), (0.06, 0.07), (0.14, 0.07))):
        P.append(cup('cup%d' % i, (tx + cx, cy, zt + 0.015), 0.85))
    P.append(vase('vase', (0.40, 0.10, zt), 0.09))
    P.append(tube('sprig', [(0.40, 0.10, zt + 0.07), (0.42, 0.09, zt + 0.11), (0.41, 0.12, zt + 0.13)], 0.003, 'trunk', res=4))
    return P

def sg_coffee_table():
    """矮几: low table with a lower shelf and a bronze incense burner."""
    w, d, s = 1.0, 0.5, 0.04
    lx, ly, zt = w / 2 - 0.06, d / 2 - 0.06, 0.28
    P = [box('top', (w, d, 0.035), (0, 0, zt - 0.0175), 'ash', 0.005)]
    P += legs4('leg', lx, ly, zt - 0.035, s)
    P.append(apron('apron', lx, ly, s, zt - 0.035, 0.05, 0.018))
    P.append(box('shelf', (2 * lx, 2 * ly, 0.02), (0, 0, 0.09), 'ash', 0.003))
    P += burner('burner', (0.28, 0.0, zt), 0.42)
    return P

def sg_side_table():
    """香几: tall round incense stand on three curved legs with a bronze burner on top."""
    zt = 0.60
    P = [cyl('top', 0.175, 0.03, (0, 0, zt - 0.015), 'ash', 40, bevel_w=0.005)]
    P.append(torus('apron', 0.14, 0.015, (0, 0, zt - 0.045), 'ash', 32, 8))
    P.append(torus('foot', 0.13, 0.012, (0, 0, 0.014), 'ash', 32, 8))
    for i in range(3):
        a = math.pi / 2 + i * 2 * math.pi / 3
        c, s_ = math.cos(a), math.sin(a)
        P.append(tube('leg%d' % i, [(c * 0.13, s_ * 0.13, zt - 0.02), (c * 0.166, s_ * 0.166, 0.40), (c * 0.14, s_ * 0.14, 0.15), (c * 0.125, s_ * 0.125, 0.02)], 0.014, 'ash', res=6))
    P += burner('burner', (0, 0, zt), 0.78)
    return P

def sg_dining_table(L=2.0, W=0.9):
    """条案桌: long top on two trestles, fruit bowl in the middle."""
    zt = 0.72
    P = [box('top', (L, W, 0.045), (0, 0, zt - 0.0225), 'ash', 0.005)]
    for sx in (-1, 1):
        P += trestle('trestle%d' % (sx > 0), sx * (L / 2 - 0.30), W, zt - 0.045, 0.03)
    P.append(cyl('stretcher', 0.015, L - 0.66, (0, 0, 0.30), 'ash', 12, rot=(0, math.pi / 2, 0)))
    P.append(lathe('bowl', [(0.05, 0), (0.10, 0.008), (0.13, 0.04), (0.135, 0.06), (0.128, 0.06), (0.115, 0.03), (0.06, 0.012), (0.001, 0.01)], (0, 0, zt), 'ceramic_ivory', 32))
    for i in range(6):
        a = i * math.pi / 3
        P.append(sphere('fruit%d' % i, 0.034, (math.cos(a) * 0.065, math.sin(a) * 0.065, zt + 0.05), 'leaf_green', 14))
    P.append(sphere('fruit6', 0.034, (0, 0, zt + 0.052), 'leaf_green', 14))
    return P

def sg_console(L=1.6, W=0.40):
    """条案: altar table with 翘头 upturned ends on two trestles; vase and burner on top."""
    zt = 0.72
    h = L / 2
    prof = [(-h, zt), (h, zt), (h + 0.04, zt + 0.02), (h + 0.06, zt + 0.06), (h + 0.05, zt + 0.10), (h + 0.02, zt + 0.10),
            (h, zt + 0.07), (h - 0.02, zt + 0.045), (h - 0.06, zt + 0.04)]
    prof += [(-x, z) for x, z in reversed(prof[2:])]
    P = [extrude_shape('top', prof, W, (0, 0, 0), 'ash', bevel_w=0.004)]
    for sx in (-1, 1):
        P += trestle('trestle%d' % (sx > 0), sx * (L / 2 - 0.22), W, zt, 0.025)
    P.append(cyl('stretcher', 0.014, L - 0.50, (0, 0, 0.28), 'ash', 12, rot=(0, math.pi / 2, 0)))
    P.append(vase('vase', (-0.45, 0.0, zt + 0.04), 0.16))
    P += burner('burner', (0.42, 0.0, zt + 0.04), 0.6)
    return P

def sg_sideboard(w=2.0, d=0.45, h=0.72, doors=4):
    """Ash cabinet on short legs with lattice-and-paper doors; celadon bowls on top."""
    zl = 0.10
    P = [box('body', (w, d, h - zl - 0.02), (0, 0, zl + (h - zl - 0.02) / 2), 'ash', 0.004)]
    P.append(box('top', (w + 0.02, d + 0.02, 0.02), (0, 0, h - 0.01), 'ash', 0.004))
    P += legs4('leg', w / 2 - 0.05, d / 2 - 0.05, zl, 0.045)
    P.append(cyl('legm', 0.02, zl, (0, -d / 2 + 0.05, zl / 2), 'ash', 10))
    dw = (w - 0.04) / doors
    for i in range(doors):
        x = -w / 2 + 0.02 + dw / 2 + i * dw
        P += lattice_door('door%d' % i, dw - 0.02, h - zl - 0.06, (x, -d / 2 - 0.002, zl + (h - zl - 0.02) / 2), 0.02, 0.05, 0.045, 0.02)
    for i in range(3):
        P.append(lathe('bowl%d' % i, [(0.05, 0), (0.09, 0.006), (0.115, 0.04), (0.12, 0.058), (0.113, 0.058), (0.10, 0.03), (0.05, 0.01), (0.001, 0.008)], (w * 0.30, 0.02, h + i * 0.026), 'celadon', 28))
    return P

def sg_bookcase(w=1.0, d=0.35, h=2.1):
    """博古架: open shelving with staggered full and half-width compartments."""
    P = legs4('post', w / 2 - 0.02, d / 2 - 0.02, h, 0.04)
    t = 0.03
    items = [((w - 0.04, d - 0.04, t), (0, 0, z)) for z in (0.08, 0.72, 1.40, h - t / 2)]
    half = w / 2 - 0.02
    items += [((half - 0.015, d - 0.06, t), (-half / 2 - 0.0075, 0, 0.42)), ((half - 0.015, d - 0.06, t), (half / 2 + 0.0075, 0, 1.06)),
              ((half - 0.015, d - 0.06, t), (-half / 2 - 0.0075, 0, 1.74))]
    for z0, z1 in ((0.435, 0.705), (0.735, 1.045), (1.415, 1.725)):
        items.append(((0.03, d - 0.06, z1 - z0), (0, 0, (z0 + z1) / 2)))
    items += [((w - 0.04, 0.02, 0.06), (0, d / 2 - 0.03, 0.125)), ((w - 0.04, 0.02, 0.04), (0, d / 2 - 0.03, h - 0.05))]
    P.append(bars('shelves', items, 'ash'))
    P.append(vase('vase', (-0.24, 0.0, 0.735), 0.24))
    P.append(box('books', (0.24, 0.16, 0.09), (0.26, 0.0, 1.46), 'fabric_indigo', 0.003, rot=(0, 0, 0.1)))
    P.append(box('books2', (0.16, 0.22, 0.20), (0.28, 0.0, 0.195), 'books', 0.003))
    P += burner('bronze', (0.24, 0.0, 1.075), 0.45)
    P.append(sphere('orb', 0.05, (-0.25, 0.0, 1.805), 'bronze', 20))
    return P

def sg_media_wall(w=3.2, h=2.6):
    """[WALL] full-height 直棂 lattice on a paper backing, floating cabinet, TV, plum vase."""
    P = [box('backing', (w, 0.02, h), (0, -0.01, h / 2), 'paper_rice')]
    P.append(slats('lattice', w, h, (0, -0.035, h / 2), 0.03, 0.05, 0.03, nmax=45))
    P.append(box('cabinet', (2.4, 0.30, 0.35), (0, -0.20, 0.525), 'ash', 0.005))
    for i in (1, 2):
        P.append(box('gap%d' % i, (0.004, 0.012, 0.35), (-1.2 + i * 0.8, -0.351, 0.525), 'ash_dark'))
    P.append(box('cabled', (2.3, 0.02, 0.006), (0, -0.12, 0.347), 'led'))
    P.append(box('screen', (1.65, 0.012, 0.95), (0, -0.071, 1.55), 'screen_black'))
    P.append(box('bezel', (1.67, 0.025, 0.97), (0, -0.0625, 1.55), 'matte_black', 0.003))
    P.append(vase('vase', (-0.85, -0.20, 0.70), 0.26))
    P += plum_branch('plum', (-0.85, -0.20, 0.92), seed=7, h=0.42, spread=0.12, n=26)
    P.append(box('books', (0.24, 0.16, 0.05), (0.90, -0.20, 0.725), 'fabric_indigo', 0.003))
    return P

def sg_screen(panels=4, pw=0.50, h=1.90, tilt=math.radians(28)):
    """屏风: four paper-and-lattice panels standing in a shallow zig-zag."""
    P = []
    span = panels * pw * math.cos(tilt)
    for i in range(panels):
        th = tilt if i % 2 == 0 else -tilt
        cx = -span / 2 + (i + 0.5) * pw * math.cos(tilt)
        parts = [panel_frame('pf%d' % i, pw, h, (0, 0, h / 2), 'ash', 0.045, 0.03),
                 box('paper%d' % i, (pw - 0.07, 0.006, h - 0.07), (0, 0.004, h / 2), 'paper_rice'),
                 slats('lat%d' % i, pw - 0.10, h - 0.10, (0, -0.006, h / 2), 0.014, (pw - 0.10 - 3 * 0.014) / 2, 0.012, 'ash'),
                 box('rail%d' % i, (pw - 0.09, 0.028, 0.03), (0, 0, 0.36), 'ash')]
        obj = join(parts, 'panel%d' % i)
        obj.rotation_euler.z = th
        obj.location = (cx, 0, h / 2)
        P.append(obj)
    return P

def sg_lattice_panel(w=1.2, h=2.2):
    """[WALL] 直棂 slat panel over a rice-paper backing."""
    P = [box('backing', (w, 0.02, h), (0, -0.01, h / 2), 'paper_rice')]
    P.append(slats('lattice', w - 0.06, h - 0.10, (0, -0.035, h / 2), 0.03, 0.05, 0.03))
    P.append(bars('frame', [((w, 0.03, 0.05), (0, -0.035, 0.025)), ((w, 0.03, 0.05), (0, -0.035, h - 0.025)),
                            ((0.03, 0.03, h - 0.10), (-w / 2 + 0.015, -0.035, h / 2)), ((0.03, 0.03, h - 0.10), (w / 2 - 0.015, -0.035, h / 2))], 'ash'))
    return P

def sg_desk(L=1.6, W=0.7):
    """画案: writing table on trestles with a scroll, brush pot and ink stone."""
    zt = 0.72
    P = [box('top', (L, W, 0.04), (0, 0, zt - 0.02), 'ash', 0.005)]
    for sx in (-1, 1):
        P += trestle('trestle%d' % (sx > 0), sx * (L / 2 - 0.22), W, zt - 0.04, 0.026)
    P.append(cyl('stretcher', 0.014, L - 0.50, (0, 0, 0.32), 'ash', 12, rot=(0, math.pi / 2, 0)))
    P.append(cyl('roll', 0.022, 0.34, (-0.40, 0.02, zt + 0.022), 'linen_rice', 16, rot=(math.pi / 2, 0, 0)))
    P.append(box('sheet', (0.48, 0.32, 0.003), (-0.16, 0.02, zt + 0.0035), 'linen_rice'))
    P.append(box('seal', (0.02, 0.02, 0.002), (0.02, -0.08, zt + 0.006), 'cinnabar'))
    P.append(cyl('brushpot', 0.038, 0.08, (0.50, 0.14, zt + 0.04), 'ceramic_ivory', 20))
    for i, (dx, dy, tilt) in enumerate(((0.0, 0.0, 0.0), (0.015, 0.01, 0.12), (-0.012, 0.012, -0.10))):
        P.append(cyl('stick%d' % i, 0.004, 0.11, (0.50 + dx, 0.14 + dy, zt + 0.075), 'trunk', 8, rot=(tilt, tilt * 0.5, 0)))
    P.append(box('inkstone', (0.14, 0.09, 0.02), (0.30, -0.14, zt + 0.01), 'ink', 0.003))
    P.append(cyl('brush', 0.005, 0.20, (0.28, -0.03, zt + 0.006), 'trunk', 8, rot=(0, math.pi / 2, 0.3)))
    return P

def sg_nightstand(w=0.50, d=0.40, h=0.55):
    """方几: small square table with a lower shelf."""
    s = 0.04
    lx, ly = w / 2 - 0.05, d / 2 - 0.05
    P = [box('top', (w, d, 0.03), (0, 0, h - 0.015), 'ash', 0.004)]
    P += legs4('leg', lx, ly, h - 0.03, s)
    P.append(apron('apron', lx, ly, s, h - 0.03, 0.06, 0.018))
    P.append(box('shelf', (2 * lx, 2 * ly, 0.02), (0, 0, 0.15), 'ash', 0.003))
    return P

def sg_dresser(w=1.0, d=0.45):
    """Dressing table with two drawers and an oval mirror on an ash stand."""
    s, zt = 0.045, 0.75
    lx, ly = w / 2 - 0.05, d / 2 - 0.05
    P = [box('top', (w, d, 0.03), (0, 0, zt - 0.015), 'ash', 0.004)]
    P += legs4('leg', lx, ly, zt - 0.03, s)
    P.append(apron('apron', lx, ly, s, zt - 0.03, 0.13, 0.02))
    for sx in (-1, 1):
        P.append(box('drawer%d' % (sx > 0), (0.38, 0.012, 0.10), (sx * 0.22, -d / 2 + 0.028, zt - 0.10), 'ash', 0.003))
        P.append(cyl('knob%d' % (sx > 0), 0.007, 0.03, (sx * 0.22, -d / 2 + 0.016, zt - 0.10), 'bronze', 10, rot=(0, 0, 0)))
    ym = 0.12
    P.append(bars('stand', [((0.44, 0.05, 0.03), (0, ym, zt + 0.015)), ((0.02, 0.02, 0.56), (-0.22, ym, zt + 0.31)), ((0.02, 0.02, 0.56), (0.22, ym, zt + 0.31))], 'ash'))
    zc = 1.35 - 0.28
    P.append(torus('oval', 0.20, 0.012, (0, ym, zc), 'ash', 40, 8, scale=(1, 1.35, 1), rot=(math.pi / 2, 0, 0)))
    g = cyl('glass', 0.195, 0.008, (0, ym - 0.004, zc), 'mirror', 40, rot=(math.pi / 2, 0, 0))
    g.scale = (1, 1.35, 1)
    P.append(g)
    return P

def sg_wardrobe(w=1.6, h=2.40, doors=3):
    """Ash wardrobe on short legs, three lattice-and-paper doors."""
    d, zl = 0.60, 0.08
    P = [box('body', (w, d, h - zl - 0.04), (0, 0, zl + (h - zl - 0.04) / 2), 'ash', 0.004)]
    P.append(box('top', (w + 0.02, d + 0.02, 0.04), (0, 0, h - 0.02), 'ash', 0.004))
    P += legs4('leg', w / 2 - 0.06, d / 2 - 0.06, zl, 0.05)
    P.append(cyl('legm', 0.022, zl, (0, d / 2 - 0.06, zl / 2), 'ash', 10))
    dw = (w - 0.04) / doors
    for i in range(doors):
        x = -w / 2 + 0.02 + dw / 2 + i * dw
        P += lattice_door('door%d' % i, dw - 0.015, h - zl - 0.10, (x, -d / 2 - 0.002, zl + (h - zl - 0.04) / 2), 0.02, 0.06, 0.05, 0.025)
        sx = 1 if i < doors / 2 else -1
        P.append(cyl('pull%d' % i, 0.006, 0.05, (x + sx * (dw / 2 - 0.045), -d / 2 - 0.036, 1.0), 'bronze', 8))
    return P

def sg_platform(w=2.0, d=1.8, h=0.40):
    """地台: ash platform with drawer grooves, rush mat, futon and a tea tray."""
    P = [box('platform', (w, d, h), (0, 0, h / 2), 'ash', 0.008)]
    for i in (1, 2):
        P.append(box('groove%d' % i, (0.006, 0.012, h - 0.10), (-w / 2 + i * w / 3, -d / 2 - 0.001, h / 2), 'ash_dark'))
    P.append(box('grooveh', (w - 0.06, 0.012, 0.006), (0, -d / 2 - 0.001, h - 0.05), 'ash_dark'))
    P.append(box('mat', (w - 0.06, d - 0.06, 0.012), (0, 0, h + 0.006), 'fabric_rush', 0.004))
    fw, fl = 1.4, d - 0.16
    fx = -w / 2 + 0.05 + fw / 2
    P.append(rbox('futon', (fw, fl, 0.12), (fx, 0.0, h + 0.072), 'linen_rice', r=0.04))
    P.append(rbox('duvet', (fw - 0.06, fl * 0.58, 0.09), (fx, -fl * 0.18, h + 0.17), 'linen_sage', r=0.04))
    P.append(rbox('pillow', (0.60, 0.38, 0.11), (fx, fl / 2 - 0.26, h + 0.18), 'linen_rice', r=0.04))
    tx = w / 2 - 0.30
    P.append(box('tray', (0.42, 0.30, 0.015), (tx, d / 2 - 0.40, h + 0.0215), 'ash_dark', 0.003))
    P += teapot('pot', (tx - 0.08, d / 2 - 0.40, h + 0.0295), 0.75)
    P.append(cup('cup0', (tx + 0.09, d / 2 - 0.46, h + 0.0295), 0.85))
    P.append(cup('cup1', (tx + 0.13, d / 2 - 0.35, h + 0.0295), 0.85))
    puff = lathe('puff', [(0.001, 0), (0.15, 0), (0.19, 0.012), (0.20, 0.045), (0.185, 0.075), (0.15, 0.085), (0.001, 0.085)], (tx, -d / 2 + 0.45, h + 0.014), 'fabric_rush', 32)
    P.append(puff)
    return P

def sg_bed(w=1.8, L=2.1):
    """Low platform bed with a slatted 直棂 headboard (head at +Y)."""
    P = [box('base', (w - 0.10, L - 0.24, 0.22), (0, -0.02, 0.11), 'ash_dark', 0.004)]
    P.append(box('rail', (w + 0.16, L + 0.04, 0.06), (0, 0.0, 0.25), 'ash', 0.006))
    hw = w + 0.30
    yh = L / 2 - 0.025
    items = [((0.05, 0.05, 1.10), (sx * (hw / 2 - 0.025), yh, 0.55)) for sx in (-1, 1)]
    items += [((hw - 0.10, 0.05, 0.05), (0, yh, 1.075)), ((hw - 0.10, 0.05, 0.05), (0, yh, 0.325))]
    P.append(bars('headframe', items, 'ash'))
    P.append(slats('headslats', hw - 0.14, 0.70, (0, yh, 0.70), 0.025, 0.045, 0.03))
    P.append(rbox('mattress', (w - 0.06, L - 0.30, 0.18), (0, -0.05, 0.37), 'linen_rice', r=0.045))
    P.append(rbox('duvet', (w - 0.02, L * 0.58, 0.09), (0, -L / 2 + 0.10 + L * 0.29, 0.50), 'linen_rice', r=0.04))
    P.append(rbox('fold', (w - 0.02, 0.22, 0.08), (0, -L / 2 + 0.10 + L * 0.58 - 0.06, 0.53), 'linen_rice', r=0.035))
    P.append(rbox('throw', (w + 0.02, 0.50, 0.05), (0, -L / 2 + 0.45, 0.57), 'fabric_moon', r=0.02))
    n = 2 if w >= 1.5 else 1
    for i in range(n):
        x = 0 if n == 1 else (i - 0.5) * (w * 0.5)
        P.append(rbox('euro%d' % i, (0.58, 0.14, 0.58), (x, L / 2 - 0.24, 0.74), 'linen_sage', r=0.04, rot=(-0.18, 0, 0)))
        P.append(rbox('pillow%d' % i, (0.64, 0.16, 0.40), (x, L / 2 - 0.40, 0.63), 'linen_rice', r=0.04, rot=(-0.26, 0, 0)))
    return P

def sg_bay_cushion(w=3.0, d=0.78):
    P = [rbox('pad', (w, d, 0.06), (0, 0, 0.03), 'fabric_rush', r=0.02)]
    P.append(rbox('c1', (0.44, 0.13, 0.40), (-w * 0.3, d * 0.3, 0.245), 'linen_sage', r=0.035, rot=(-0.3, 0, 0.15)))
    P.append(rbox('c2', (0.44, 0.13, 0.40), (w * 0.3, d * 0.3, 0.245), 'fabric_indigo', r=0.035, rot=(-0.3, 0, -0.15)))
    P.append(rbox('c3', (0.40, 0.12, 0.36), (0.0, d * 0.32, 0.225), 'linen_sage', r=0.035, rot=(-0.32, 0, 0.0)))
    return P

def sg_hook_rail(w=0.6):
    """[WALL] ash rail with four bronze hooks at z 1.56-1.62."""
    P = [box('rail', (w, 0.02, 0.05), (0, -0.01, 1.585), 'ash', 0.003)]
    for i in range(4):
        x = -w / 2 + 0.08 + i * (w - 0.16) / 3
        P.append(tube('hook%d' % i, [(x, -0.02, 1.58), (x, -0.07, 1.575), (x, -0.075, 1.62)], 0.006, 'bronze', res=5))
    return P

# ----------------------------------------------------------------- kitchen (room-fitted)
def sg_kitchen_set(W=2.623, D=2.760):
    """Room coordinates: NW interior corner at the origin, room spans x 0..W, y 0..-D.
    West run along x=0 (sink under the window), north run along y=0 with the range, fridge
    column at the east end, uppers + hood on the north wall. Ash fronts with ash_dark grooves."""
    P = []
    bd, bh, th = 0.60, 0.88, 0.02
    fridge_w = 0.72
    north_len = W - fridge_w - 0.02
    rx = bd + 0.55
    rw = 0.60
    front, groove = 'ash', 'ash_dark'
    P.append(box('base_w', (bd, D - 0.02, bh - 0.08), (bd / 2, -D / 2, 0.08 + (bh - 0.08) / 2), front))
    P.append(box('plinth_w', (bd - 0.06, D - 0.02, 0.08), (bd / 2 - 0.03, -D / 2, 0.04), 'matte_black'))
    ny = -bd - 0.02
    nd = int(round((D - bd - 0.04) / 0.55))
    for i in range(1, nd):
        yy = ny - i * (D - bd - 0.04) / nd
        P.append(box('wgap%d' % i, (0.012, 0.004, bh - 0.08), (bd + 0.001, yy, 0.08 + (bh - 0.08) / 2), groove))
    P.append(box('wgaph', (0.012, D - bd - 0.08, 0.004), (bd + 0.001, ny - (D - bd - 0.04) / 2, bh - 0.08 - 0.20), groove))
    for i, (x0, x1) in enumerate(((bd, rx - rw / 2), (rx + rw / 2, north_len))):
        cw = x1 - x0
        P.append(box('base_n%d' % i, (cw, bd, bh - 0.08), ((x0 + x1) / 2, -bd / 2, 0.08 + (bh - 0.08) / 2), front))
        P.append(box('plinth_n%d' % i, (cw, bd - 0.06, 0.08), ((x0 + x1) / 2, -bd / 2 + 0.03, 0.04), 'matte_black'))
        n = max(1, int(round(cw / 0.5)))
        for k in range(1, n):
            P.append(box('ngap%d_%d' % (i, k), (0.004, 0.012, bh - 0.08), (x0 + k * cw / n, -bd - 0.001, 0.08 + (bh - 0.08) / 2), groove))
        P.append(box('ngaph%d' % i, (cw - 0.04, 0.012, 0.004), ((x0 + x1) / 2, -bd - 0.001, bh - 0.08 - 0.20), groove))
    P.append(box('top_w', (bd + 0.03, D, th), ((bd + 0.03) / 2, -D / 2, bh + th / 2), 'stone_qing', 0.003))
    P.append(box('endpanel', (bd + 0.03, 0.02, bh + th), ((bd + 0.03) / 2, -D + 0.01, (bh + th) / 2), 'stone_qing', 0.003))
    for i, (x0, x1) in enumerate(((bd + 0.03, rx - rw / 2), (rx + rw / 2, north_len))):
        P.append(box('top_n%d' % i, (x1 - x0, bd + 0.03, th), ((x0 + x1) / 2, -(bd + 0.03) / 2, bh + th / 2), 'stone_qing', 0.003))
    sink_y = -D * 0.55
    P.append(box('sink', (0.46, 0.42, 0.18), (bd / 2 + 0.02, sink_y, bh + th - 0.09 + 0.004), 'ceramic_ivory'))
    P.append(tube('faucet', [(0.09, sink_y, bh + th), (0.09, sink_y, bh + th + 0.34), (0.30, sink_y, bh + th + 0.34), (0.32, sink_y, bh + th + 0.28)], 0.011, 'matte_black'))
    P.append(box('hob', (rw, bd - 0.10, 0.008), (rx, -bd / 2 - 0.02, bh + th + 0.004), 'matte_black'))
    for i, (dx, dy) in enumerate(((-0.15, -0.12), (0.15, -0.12), (-0.15, 0.12), (0.15, 0.12))):
        P.append(torus('ring%d' % i, 0.07, 0.003, (rx + dx, -bd / 2 - 0.02 + dy, bh + th + 0.009), 'stainless', 24, 6))
    P.append(box('rangebody', (rw, bd - 0.02, bh - 0.08), (rx, -bd / 2 + 0.01, 0.08 + (bh - 0.08) / 2), front))
    P.append(box('ovendoor', (rw - 0.04, 0.015, 0.50), (rx, -bd - 0.008, 0.40), 'screen_black'))
    P.append(box('ovenhandle', (0.50, 0.025, 0.018), (rx, -bd - 0.035, 0.62), 'matte_black', 0.004))
    uh, ud, uz = 0.72, 0.36, 1.50
    P.append(box('splash', (north_len, 0.015, uz - bh - th), (north_len / 2, -0.0115, bh + th + (uz - bh - th) / 2), 'stone_qing'))
    P.append(box('upper', (north_len, ud, uh), (north_len / 2, -ud / 2, uz + uh / 2), front, 0.004))
    nu = 4
    for k in range(1, nu):
        P.append(box('ugap%d' % k, (0.004, 0.012, uh), (k * north_len / nu, -ud - 0.001, uz + uh / 2), groove))
    # lattice-look grooves on the upper doors
    for k in range(nu):
        x0 = k * north_len / nu
        for j in range(1, 5):
            P.append(box('ulat%d_%d' % (k, j), (0.003, 0.010, uh - 0.10), (x0 + j * (north_len / nu) / 5, -ud - 0.001, uz + uh / 2), groove))
    P.append(box('hood', (rw + 0.30, ud + 0.06, 0.06), (rx, -ud / 2 - 0.03, uz - 0.03), 'matte_black'))
    P.append(box('ledstrip', (north_len - 0.1, 0.02, 0.008), (north_len / 2, -ud + 0.05, uz - 0.004), 'led'))
    fx = W - fridge_w / 2 - 0.01
    P.append(box('fridge', (fridge_w, 0.62, 2.22), (fx, -0.31, 1.11), front, 0.004))
    P.append(box('fdoor', (fridge_w - 0.02, 0.01, 2.16), (fx, -0.626, 1.11), 'ash'))
    P.append(box('fgap', (fridge_w - 0.02, 0.012, 0.004), (fx, -0.632, 1.55), groove))
    P.append(box('fgapv', (0.004, 0.012, 2.10), (fx - 0.02, -0.633, 1.11), groove))
    P.append(lathe('kettle', [(0.05, 0), (0.08, 0.02), (0.075, 0.12), (0.035, 0.15), (0.04, 0.17), (0.001, 0.175)], (north_len - 0.35, -0.35, bh + th), 'clay_dark', 20))
    P.append(tube('kspout', [(north_len - 0.29, -0.35, bh + th + 0.06), (north_len - 0.24, -0.35, bh + th + 0.12), (north_len - 0.23, -0.35, bh + th + 0.15)], 0.007, 'clay_dark', res=5))
    P.append(tube('khandle', [(north_len - 0.40, -0.35, bh + th + 0.12), (north_len - 0.35, -0.35, bh + th + 0.24), (north_len - 0.30, -0.35, bh + th + 0.12)], 0.006, 'clay_dark', res=5))
    P.append(box('board', (0.02, 0.28, 0.40), (0.34, -1.25, bh + th + 0.2), 'ash', 0.004))
    P.append(lathe('bowl', [(0.05, 0), (0.12, 0.02), (0.15, 0.07), (0.14, 0.075), (0.10, 0.03), (0.001, 0.025)], (bd + 0.4, -0.30, bh + th), 'celadon', 24))
    return P

# ----------------------------------------------------------------- bathroom
def sg_vanity(w=0.9):
    """[WALL] floating ash cabinet (place at z=550), stone top, ivory basin, black spout."""
    P = [box('body', (w, 0.50, 0.30), (0, -0.25, 0.15), 'ash', 0.005)]
    P.append(box('gap', (0.004, 0.012, 0.30), (0, -0.50, 0.15), 'ash_dark'))
    P.append(box('gaph', (w - 0.04, 0.012, 0.004), (0, -0.50, 0.20), 'ash_dark'))
    P.append(box('top', (w + 0.02, 0.52, 0.02), (0, -0.26, 0.31), 'stone_qing', 0.004))
    P.append(lathe('basin', [(0.12, 0.32), (0.19, 0.33), (0.20, 0.42), (0.19, 0.45), (0.17, 0.45), (0.17, 0.44), (0.15, 0.35), (0.001, 0.34)], (0, -0.27, 0), 'ceramic_ivory', 32))
    P.append(tube('spout', [(0, 0, 0.62), (0, -0.22, 0.62), (0, -0.25, 0.58)], 0.011, 'matte_black'))
    P.append(cyl('mixer', 0.025, 0.02, (0, -0.01, 0.62), 'matte_black', 16, rot=(math.pi / 2, 0, 0)))
    P.append(box('ledgap', (w - 0.04, 0.02, 0.006), (0, -0.04, 0.003), 'led'))
    return P

def sg_mirror_round(dia=0.70):
    """[WALL] ash ring frame with a mirror."""
    P = [torus('ring', dia / 2 - 0.015, 0.015, (0, -0.015, dia / 2), 'ash', 56, 10, rot=(math.pi / 2, 0, 0))]
    P.append(cyl('glass', dia / 2 - 0.02, 0.006, (0, -0.022, dia / 2), 'mirror', 56, rot=(math.pi / 2, 0, 0)))
    P.append(cyl('back', dia / 2 - 0.02, 0.008, (0, -0.008, dia / 2), 'ash', 56, rot=(math.pi / 2, 0, 0)))
    return P

def sg_mirror_full(w=0.6, h=1.8):
    """Leaning framed mirror (tilt -6 deg)."""
    tilt = math.radians(-6)
    c, s = math.cos(tilt), math.sin(tilt)
    P = [box('frame', (w, 0.05, h), (0, 0.0, h / 2), 'ash', 0.005, rot=(tilt, 0, 0))]
    off = -0.028
    P.append(box('glass', (w - 0.07, 0.006, h - 0.07), (0, off * c, h / 2 + off * s), 'mirror', rot=(tilt, 0, 0)))
    return P

# ----------------------------------------------------------------- lighting [CEIL]
def sg_lantern(dia=0.60, H=0.80):
    """Round paper lantern with bamboo rings and ash ribs, cord to a canopy at z=H."""
    r = dia / 2
    rz = r * 0.85
    zc = 0.015 + rz - 0.004
    P = [sphere('paper', r, (0, 0, zc), 'paper', 28, scale=(1, 1, 0.85))]
    P.append(cyl('capb', r * 0.2, 0.02, (0, 0, 0.01), 'ash', 20))
    P.append(cyl('capt', r * 0.2, 0.02, (0, 0, zc + rz - 0.004), 'ash', 20))
    for i, ang in enumerate((-52, -26, 0, 26, 52)):
        a = math.radians(ang)
        P.append(torus('ring%d' % i, r * math.cos(a) + 0.002, 0.005, (0, 0, zc + rz * math.sin(a)), 'bamboo', 36, 5))
    for i in range(6):
        a = i * math.pi / 3
        pts = []
        for k in range(7):
            ph = -math.pi / 2 + 0.16 + (math.pi - 0.32) * k / 6
            rr = r * math.cos(ph) * 1.012
            pts.append((math.cos(a) * rr, math.sin(a) * rr, zc + rz * math.sin(ph) * 1.012))
        P.append(tube('rib%d' % i, pts, 0.0035, 'ash', res=4))
    P.append(sphere('bulb', r * 0.14, (0, 0, zc), 'bulb', 12))
    zt = zc + rz + 0.004
    P.append(cyl('cord', 0.002, H - 0.02 - zt, (0, 0, zt + (H - 0.02 - zt) / 2), 'matte_black', 6))
    P.append(cyl('canopy', 0.05, 0.02, (0, 0, H - 0.01), 'matte_black', 20))
    return P

def sg_lantern_square():
    """Square ash-frame lantern with paper panels (after assets.lantern), canopy at z=0.55."""
    w, h, z0 = 0.26, 0.32, 0.02
    P = [box('base', (0.28, 0.28, 0.02), (0, 0, 0.01), 'ash', 0.003)]
    items = []
    for sx in (-1, 1):
        for sy in (-1, 1):
            items.append(((0.015, 0.015, h), (sx * w / 2, sy * w / 2, z0 + h / 2)))
    for z in (z0 + 0.0075, z0 + h - 0.0075):
        items += [((w, 0.015, 0.015), (0, -w / 2, z)), ((w, 0.015, 0.015), (0, w / 2, z)),
                  ((0.015, w, 0.015), (-w / 2, 0, z)), ((0.015, w, 0.015), (w / 2, 0, z))]
    P.append(bars('frame', items, 'ash', 0))
    P.append(box('paper', (w - 0.012, w - 0.012, h - 0.012), (0, 0, z0 + h / 2), 'paper'))
    cap = lathe('cap', [(0.212, z0 + h), (0.212, z0 + h + 0.012), (0.10, z0 + h + 0.055), (0.03, z0 + h + 0.075), (0.001, z0 + h + 0.08)], (0, 0, 0), 'ash', 4, smooth=False)
    cap.rotation_euler.z = math.pi / 4
    P.append(cap)
    P.append(sphere('bulb', 0.03, (0, 0, z0 + h / 2), 'bulb', 12, scale=(1, 1, 1.3)))
    zt = z0 + h + 0.08
    P.append(cyl('cord', 0.002, 0.53 - zt, (0, 0, zt + (0.53 - zt) / 2), 'matte_black', 6))
    P.append(cyl('canopy', 0.04, 0.02, (0, 0, 0.54), 'matte_black', 20))
    return P

def sg_flush_paper(w=0.42, h=0.10):
    """Square ash frame with a paper bottom panel and an led disc behind it (top at z=h)."""
    b = 0.04
    items = [((w, b, h), (0, -(w / 2 - b / 2), h / 2)), ((w, b, h), (0, w / 2 - b / 2, h / 2)),
             ((b, w - 2 * b, h), (-(w / 2 - b / 2), 0, h / 2)), ((b, w - 2 * b, h), (w / 2 - b / 2, 0, h / 2))]
    P = [bars('frame', items, 'ash')]
    P.append(box('paper', (w - 2 * b + 0.01, w - 2 * b + 0.01, 0.006), (0, 0, 0.012), 'paper'))
    P.append(cyl('led', (w - 2 * b) * 0.42, 0.01, (0, 0, 0.03), 'led', 32))
    P.append(box('plate', (w - 2 * b + 0.01, w - 2 * b + 0.01, 0.008), (0, 0, h - 0.008), 'ash'))
    return P

def sg_floor_lamp():
    """Ash tripod with a paper drum shade."""
    P = [cyl('hub', 0.03, 0.05, (0, 0, 1.05), 'ash', 16)]
    for i in range(3):
        a = math.pi / 2 + i * 2 * math.pi / 3
        P.append(tube('leg%d' % i, [(math.cos(a) * 0.16, math.sin(a) * 0.16, 0.0), (math.cos(a) * 0.018, math.sin(a) * 0.018, 1.05)], 0.012, 'ash', res=6))
    P.append(cyl('stem', 0.012, 0.42, (0, 0, 1.28), 'ash', 10))
    P.append(lathe('shade', [(0.16, 1.08), (0.16, 1.50), (0.001, 1.50)], (0, 0, 0), 'paper', 40))
    P.append(torus('rimb', 0.16, 0.004, (0, 0, 1.08), 'ash', 40, 6))
    P.append(torus('rimt', 0.16, 0.004, (0, 0, 1.495), 'ash', 40, 6))
    P.append(sphere('bulb', 0.035, (0, 0, 1.32), 'bulb', 12, scale=(1, 1, 1.4)))
    return P

def sg_table_lamp():
    """Celadon gourd base with a paper drum shade."""
    prof = [(0.001, 0), (0.06, 0), (0.078, 0.03), (0.072, 0.09), (0.046, 0.13), (0.056, 0.16), (0.062, 0.20), (0.046, 0.245), (0.02, 0.26), (0.02, 0.29), (0.001, 0.29)]
    P = [lathe('base', prof, (0, 0, 0), 'celadon', 32)]
    P.append(cyl('stem', 0.008, 0.10, (0, 0, 0.32), 'bronze', 10))
    P.append(lathe('shade', [(0.14, 0.30), (0.14, 0.49), (0.001, 0.49)], (0, 0, 0), 'paper', 40))
    P.append(torus('rimb', 0.14, 0.004, (0, 0, 0.30), 'ash', 40, 6))
    P.append(cyl('finial', 0.012, 0.012, (0, 0, 0.495), 'ash', 10))
    P.append(sphere('bulb', 0.03, (0, 0, 0.39), 'bulb', 12, scale=(1, 1, 1.4)))
    return P

def sg_wall_light():
    """[WALL] ash box with a paper front and a bulb."""
    P = [box('back', (0.12, 0.02, 0.30), (0, -0.01, 0.15), 'ash', 0.003)]
    P.append(bars('frame', [((0.015, 0.08, 0.30), (-0.0525, -0.06, 0.15)), ((0.015, 0.08, 0.30), (0.0525, -0.06, 0.15)),
                            ((0.09, 0.08, 0.015), (0, -0.06, 0.0075)), ((0.09, 0.08, 0.015), (0, -0.06, 0.2925))], 'ash'))
    P.append(box('paper', (0.092, 0.006, 0.272), (0, -0.096, 0.15), 'paper'))
    P.append(sphere('bulb', 0.022, (0, -0.055, 0.15), 'bulb', 12, scale=(1, 1, 1.5)))
    return P

# ----------------------------------------------------------------- decor
def sg_art_scroll():
    """[WALL] 挂轴 hanging scroll: canvas between two rollers, mount strips, seal, cord loop."""
    y = -0.015
    P = [cyl('rollb', 0.015, 0.50, (0, y, 0.015), 'ash', 16, rot=(0, math.pi / 2, 0))]
    P.append(cyl('rollt', 0.015, 0.50, (0, y, 1.325), 'ash', 16, rot=(0, math.pi / 2, 0)))
    P.append(box('canvas', (0.46, 0.006, 1.30), (0, y, 0.67), 'canvas'))
    P.append(box('mountt', (0.46, 0.004, 0.14), (0, y - 0.0035, 1.25), 'linen_rice'))
    P.append(box('mountb', (0.46, 0.004, 0.10), (0, y - 0.0035, 0.07), 'linen_rice'))
    P.append(box('seal', (0.03, 0.002, 0.03), (0.17, y - 0.0045, 0.17), 'cinnabar'))
    P.append(box('bar', (0.46, 0.012, 0.02), (0, y, 1.352), 'ash'))
    P.append(tube('cord', [(-0.10, y, 1.362), (-0.05, y, 1.385), (0, y, 1.398), (0.05, y, 1.385), (0.10, y, 1.362)], 0.002, 'fabric_indigo', res=4))
    return P

def sg_art(w=1.4, h=0.7):
    """[WALL] wide ink painting in a thin ash frame."""
    P = [panel_frame('frame', w, h, (0, -0.015, h / 2), 'ash', 0.03, 0.03)]
    P.append(box('canvas', (w - 0.04, 0.01, h - 0.04), (0, -0.012, h / 2), 'canvas'))
    return P

def sg_vase_celadon():
    """Celadon vase with a blossoming plum branch."""
    P = [vase('vase', (0, 0, 0), 0.32)]
    P += plum_branch('plum', (0, 0, 0.27), seed=3, h=0.56, spread=0.10, n=30)
    return P

def sg_vase_tall():
    """Ivory tall vase with dried grass blades."""
    prof = [(0.05, 0), (0.085, 0.05), (0.09, 0.18), (0.06, 0.32), (0.045, 0.38), (0.05, 0.40), (0.001, 0.39)]
    P = [lathe('vase', prof, (0, 0, 0), 'ceramic_ivory', 28)]
    rr = random.Random(21)
    blades = []
    for i in range(14):
        a = rr.random() * 2 * math.pi
        L = 0.42 + rr.random() * 0.10
        blades.append(leaf('blade%d' % i, L, 0.014, (math.cos(a) * 0.012, math.sin(a) * 0.012, 0.38), (0, -math.radians(82 + rr.random() * 7), a), 'fabric_rush', 0.25, 4))
    P.append(join(blades, 'grass'))
    return P

def sg_tea_set():
    """Ash tray with a clay teapot and four celadon cups."""
    P = [box('tray', (0.40, 0.28, 0.015), (0, 0, 0.0075), 'ash', 0.003)]
    P.append(bars('rim', [((0.40, 0.012, 0.022), (0, -0.134, 0.021)), ((0.40, 0.012, 0.022), (0, 0.134, 0.021)),
                          ((0.012, 0.256, 0.022), (-0.194, 0, 0.021)), ((0.012, 0.256, 0.022), (0.194, 0, 0.021))], 'ash', 0))
    P += teapot('pot', (-0.08, 0.02, 0.015), 1.15)
    for i, (cx, cy) in enumerate(((0.07, -0.08), (0.14, -0.03), (0.07, 0.06), (0.15, 0.07))):
        P.append(cup('cup%d' % i, (cx, cy, 0.015), 1.0))
    return P

def sg_incense():
    """Bronze 香炉 on an ash disc."""
    P = [cyl('disc', 0.07, 0.01, (0, 0, 0.005), 'ash', 32)]
    P += burner('burner', (0, 0, 0.01), 0.97)
    return P

def sg_bonsai():
    """松树盆景: shallow stone pot, twisting trunk, four flat pine pads."""
    pot = lathe('pot', [(0.001, 0), (0.17, 0), (0.19, 0.02), (0.20, 0.10), (0.19, 0.12), (0.165, 0.12), (0.16, 0.03), (0.001, 0.03)], (0, 0, 0), 'stone_qing', 32)
    pot.scale = (1, 0.7, 1)
    soil = cyl('soil', 0.16, 0.02, (0, 0, 0.113), 'soil', 24)
    soil.scale = (1, 0.7, 1)
    P = [pot, soil]
    P.append(tube('trunk', [(0, 0, 0.10), (0.05, 0.02, 0.28), (-0.03, 0.01, 0.42), (0.06, -0.02, 0.56), (0.03, 0.0, 0.62)], 0.022, 'trunk', res=6))
    pads = (((-0.19, 0.05, 0.40), 0.11, (0.02, 0.01, 0.30)), ((0.19, -0.04, 0.48), 0.11, (0.0, 0.0, 0.40)),
            ((-0.07, 0.10, 0.57), 0.09, (-0.03, 0.01, 0.42)), ((0.07, -0.02, 0.665), 0.085, (0.03, 0.0, 0.60)))
    for i, (c, r, src) in enumerate(pads):
        P.append(tube('branch%d' % i, [src, ((src[0] + c[0]) / 2, (src[1] + c[1]) / 2, (src[2] + c[2]) / 2 - 0.03), (c[0] * 0.9, c[1] * 0.9, c[2] - 0.02)], 0.009, 'trunk', res=5))
        P.append(leaf_cloud('pad%d' % i, c, r, 110, 0.035, 'pine_dark', seed=30 + i, flat=0.28))
    return P

def sg_plant_bamboo():
    """Ivory pot with six bamboo canes and a cloud of leaves near the top."""
    P = [lathe('pot', [(0.14, 0), (0.17, 0.03), (0.18, 0.30), (0.17, 0.34), (0.15, 0.34), (0.001, 0.34)], (0, 0, 0), 'ceramic_ivory', 32)]
    P.append(cyl('soil', 0.155, 0.02, (0, 0, 0.345), 'soil', 24))
    rr = random.Random(17)
    canes = []
    for i in range(6):
        a = i * 1.05 + 0.3
        rad = 0.05 + 0.05 * (i % 3)
        x, y = math.cos(a) * rad, math.sin(a) * rad
        H = 1.30 + rr.random() * 0.22
        canes.append(cyl('cane%d' % i, 0.012, H, (x, y, 0.34 + H / 2), 'bamboo', 10))
        for k in range(1, int(H / 0.28) + 1):
            canes.append(cyl('node%d_%d' % (i, k), 0.0145, 0.012, (x, y, 0.34 + k * 0.28), 'bamboo', 10))
    P.append(join(canes, 'canes'))
    leaves = []
    for i in range(60):
        a = rr.random() * 2 * math.pi
        rad = 0.02 + rr.random() * 0.06
        z = 1.25 + rr.random() * 0.62
        L = 0.10 + rr.random() * 0.05
        leaves.append(leaf('leaf%d' % i, L, 0.028, (math.cos(a) * rad, math.sin(a) * rad, z), (0, -0.2 - rr.random() * 0.9, rr.random() * 2 * math.pi), 'leaf_bamboo', 0.3, 4))
    P.append(join(leaves, 'leaves'))
    return P

def sg_books():
    """线装书: four thread-bound books with indigo covers."""
    P = []
    rr = random.Random(4)
    z = 0
    for i in range(4):
        rot = (0, 0, (rr.random() - 0.5) * 0.06)
        dx, dy = (rr.random() - 0.5) * 0.02, (rr.random() - 0.5) * 0.02
        P.append(box('pages%d' % i, (0.24, 0.16, 0.018), (dx, dy, z + 0.009), 'paper_rice', rot=rot))
        P.append(box('cover%d' % i, (0.242, 0.162, 0.005), (dx, dy, z + 0.0205), 'fabric_indigo', rot=rot))
        P.append(box('label%d' % i, (0.03, 0.09, 0.002), (dx - 0.09, dy + 0.02, z + 0.024), 'paper_rice', rot=rot))
        z += 0.024
    return P

def sg_stone_table():
    """石桌: thick round stone top on a drum base."""
    prof = [(0.001, 0), (0.24, 0), (0.25, 0.02), (0.21, 0.08), (0.20, 0.40), (0.22, 0.58), (0.26, 0.64), (0.40, 0.66), (0.40, 0.71), (0.39, 0.72), (0.001, 0.72)]
    return [lathe('table', prof, (0, 0, 0), 'stone_qing', 40)]

def sg_stone_stool():
    """石鼓凳: stone drum."""
    prof = [(0.001, 0), (0.12, 0), (0.14, 0.02), (0.15, 0.10), (0.15, 0.32), (0.14, 0.40), (0.13, 0.42), (0.001, 0.42)]
    P = [lathe('drum', prof, (0, 0, 0), 'stone_qing', 32)]
    P.append(torus('ring1', 0.148, 0.006, (0, 0, 0.07), 'stone_qing', 32, 6))
    P.append(torus('ring2', 0.148, 0.006, (0, 0, 0.35), 'stone_qing', 32, 6))
    return P

def sg_planter():
    """Celadon pot with a moss dome and bamboo blades."""
    P = [lathe('pot', [(0.15, 0), (0.19, 0.06), (0.21, 0.30), (0.20, 0.42), (0.21, 0.45), (0.19, 0.45), (0.001, 0.44)], (0, 0, 0), 'celadon', 32)]
    P.append(sphere('moss', 0.185, (0, 0, 0.44), 'moss', 24, scale=(1, 1, 0.35)))
    rr = random.Random(8)
    blades = []
    for i in range(12):
        a = rr.random() * 2 * math.pi
        L = 0.24 + rr.random() * 0.10
        blades.append(leaf('blade%d' % i, L, 0.03, (math.cos(a) * 0.04, math.sin(a) * 0.04, 0.48), (0, -math.radians(62 + rr.random() * 18), a), 'leaf_bamboo', 0.4, 4))
    P.append(join(blades, 'blades'))
    return P

def sg_planter_box(w=0.9):
    """Stone trough with grass blades (after it_planter_grass)."""
    P = [box('trough', (w, 0.30, 0.35), (0, 0, 0.175), 'stone_qing', 0.006)]
    P.append(box('soil', (w - 0.04, 0.26, 0.02), (0, 0, 0.345), 'soil'))
    rr = random.Random(12)
    blades = []
    for i in range(70):
        x = -w / 2 + 0.06 + rr.random() * (w - 0.12)
        y = -0.06 + rr.random() * 0.12
        L = 0.24 + rr.random() * 0.18
        blades.append(leaf('blade%d' % i, L, 0.016, (x, y, 0.35), (0, -math.radians(85 + rr.random() * 5), rr.random() * 6.28), 'leaf_bamboo', 0.25, 4))
    P.append(join(blades, 'grass'))
    return P

def sg_bowl():
    prof = [(0.06, 0), (0.08, 0.004), (0.14, 0.04), (0.15, 0.075), (0.148, 0.08), (0.14, 0.078), (0.13, 0.045), (0.07, 0.015), (0.001, 0.012)]
    return [lathe('bowl', prof, (0, 0, 0), 'celadon', 40)]

# ----------------------------------------------------------------- registry
ASSETS_SONG = {
    'sg_sofa': lambda: sg_sofa(),
    'sg_armchair': lambda: sg_armchair(),
    'sg_rose_chair': lambda: sg_rose_chair(),
    'sg_dining_chair': lambda: sg_rose_chair(),
    'sg_desk_chair': lambda: sg_armchair(),
    'sg_stool': lambda: sg_stool(),
    'sg_bench': lambda: sg_bench(),
    'sg_cushion': lambda: sg_cushion(),
    'sg_lounge_outdoor': lambda: sg_lounge_outdoor(),
    'sg_tea_table': lambda: sg_tea_table(),
    'sg_coffee_table': lambda: sg_coffee_table(),
    'sg_side_table': lambda: sg_side_table(),
    'sg_dining_table': lambda: sg_dining_table(),
    'sg_console': lambda: sg_console(),
    'sg_sideboard': lambda: sg_sideboard(),
    'sg_bookcase': lambda: sg_bookcase(),
    'sg_media_wall': lambda: sg_media_wall(),
    'sg_screen': lambda: sg_screen(),
    'sg_lattice_panel': lambda: sg_lattice_panel(),
    'sg_desk': lambda: sg_desk(),
    'sg_nightstand': lambda: sg_nightstand(),
    'sg_dresser': lambda: sg_dresser(),
    'sg_wardrobe': lambda: sg_wardrobe(),
    'sg_wardrobe_wide': lambda: sg_wardrobe(2.2, 2.40, 4),
    'sg_platform': lambda: sg_platform(),
    'sg_bed_queen': lambda: sg_bed(1.8, 2.1),
    'sg_bed_double': lambda: sg_bed(1.5, 2.0),
    'sg_bay_cushion': lambda: sg_bay_cushion(),
    'sg_hook_rail': lambda: sg_hook_rail(),
    'sg_kitchen_set': lambda: sg_kitchen_set(),
    'sg_vanity': lambda: sg_vanity(),
    'sg_vanity_wide': lambda: sg_vanity(1.1),
    'sg_mirror_round': lambda: sg_mirror_round(),
    'sg_mirror_full': lambda: sg_mirror_full(),
    'sg_lantern_large': lambda: sg_lantern(0.60, 0.80),
    'sg_lantern_small': lambda: sg_lantern(0.40, 0.60),
    'sg_lantern_square': lambda: sg_lantern_square(),
    'sg_flush_paper': lambda: sg_flush_paper(),
    'sg_floor_lamp': lambda: sg_floor_lamp(),
    'sg_table_lamp': lambda: sg_table_lamp(),
    'sg_wall_light': lambda: sg_wall_light(),
    'sg_art_scroll': lambda: sg_art_scroll(),
    'sg_art_large': lambda: sg_art(1.4, 0.7),
    'sg_art_small': lambda: sg_art(0.5, 0.6),
    'sg_vase_celadon': lambda: sg_vase_celadon(),
    'sg_vase_tall': lambda: sg_vase_tall(),
    'sg_tea_set': lambda: sg_tea_set(),
    'sg_incense': lambda: sg_incense(),
    'sg_bonsai': lambda: sg_bonsai(),
    'sg_plant_bamboo': lambda: sg_plant_bamboo(),
    'sg_books': lambda: sg_books(),
    'sg_stone_table': lambda: sg_stone_table(),
    'sg_stone_stool': lambda: sg_stone_stool(),
    'sg_planter': lambda: sg_planter(),
    'sg_planter_box': lambda: sg_planter_box(),
    'sg_bowl': lambda: sg_bowl(),
}
