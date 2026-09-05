"""French-style furniture, lighting, plants and fittings. Every builder returns
a list of objects (already linked into the scene). Front faces -Y, origin at the
floor centre (wall-mounted pieces: origin at the wall/floor projection)."""
import math, random
from mathutils import Vector
from lib import (box, rbox, cyl, sphere, torus, lathe, tube, extrude_shape, arch_points, leaf,
                 panel_frame, join, rotate_z, mirror_x, mesh_from_bm, bevel, shade_smooth, mat)
import bmesh, bpy

R = random.Random(7)

# ----------------------------------------------------------------- helpers
def camelback_points(w, h1, h2, n=20, base=0.0):
    a = w / 2
    d = h2 - h1
    Rr = (a * a + d * d) / (2 * d)
    cy = h2 - Rr
    pts = [(-a, base), (a, base), (a, h1)]
    t0 = math.atan2(h1 - cy, a)
    t1 = math.pi - t0
    for i in range(1, n):
        t = t0 + (t1 - t0) * i / n
        pts.append((math.cos(t) * Rr, cy + math.sin(t) * Rr))
    pts.append((-a, h1))
    return pts

def turned_leg(name, h, loc, m='cream_paint', r=0.028):
    prof = [(r * 0.8, 0), (r * 0.8, 0.02), (r * 0.55, 0.03), (r * 0.9, h * 0.25), (r * 0.6, h * 0.3),
            (r * 0.7, h * 0.7), (r * 1.1, h * 0.78), (r * 1.1, h * 0.86), (r * 0.9, h * 0.9), (r * 1.2, h), (0.001, h)]
    return lathe(name, prof, loc, m, 20)

def cabriole_leg(name, h, loc, m='walnut', r=0.022, out=0.05, angle=0.0):
    pts = [(0, 0, h), (out * 0.9, -out * 0.9, h * 0.72), (-out * 0.15, out * 0.15, h * 0.3), (out * 0.35, -out * 0.35, 0.01)]
    o = tube(name, pts, r, m)
    o.location = loc
    o.rotation_euler.z = angle
    return o

def bead_chain(name, points, size=0.012, m='crystal'):
    """Octahedral crystal beads along a polyline (single mesh)."""
    bm = bmesh.new()
    for i in range(len(points) - 1):
        p0, p1 = Vector(points[i]), Vector(points[i + 1])
        n = max(1, int((p1 - p0).length / (size * 1.8)))
        for k in range(n):
            c = p0.lerp(p1, (k + 0.5) / n)
            s = size
            v = [bm.verts.new(c + Vector(d)) for d in ((s, 0, 0), (-s, 0, 0), (0, s, 0), (0, -s, 0), (0, 0, s * 1.6), (0, 0, -s * 1.6))]
            for a, b in ((0, 2), (2, 1), (1, 3), (3, 0)):
                bm.faces.new((v[a], v[b], v[4]))
                bm.faces.new((v[b], v[a], v[5]))
    return mesh_from_bm(name, bm, m)

def leaf_cloud(name, center, radius, count, size, m='leaf_olive', seed=1, flat=0.7):
    rr = random.Random(seed)
    bm = bmesh.new()
    for i in range(count):
        u = rr.random() * 2 * math.pi
        v = math.acos(2 * rr.random() - 1)
        rad = radius * (0.55 + 0.45 * rr.random())
        c = Vector(center) + Vector((math.sin(v) * math.cos(u) * rad, math.sin(v) * math.sin(u) * rad, math.cos(v) * rad * flat))
        d = Vector((rr.random() - 0.5, rr.random() - 0.5, rr.random() - 0.5)).normalized() * size
        w = d.cross(Vector((0, 0, 1))).normalized() * size * 0.35
        if w.length < 1e-6:
            w = Vector((size * 0.35, 0, 0))
        vs = [bm.verts.new(c - d), bm.verts.new(c + w * 0.6), bm.verts.new(c + d), bm.verts.new(c - w * 0.6)]
        bm.faces.new(vs)
    return mesh_from_bm(name, bm, m, smooth=True)

# ----------------------------------------------------------------- seating
def sofa(w=2.2, fabric='boucle_white', wood='walnut'):
    d = 0.95
    P = []
    P.append(rbox('base', (w - 0.08, d - 0.14, 0.30), (0, 0.03, 0.29), fabric, r=0.05))
    P.append(rbox('back', (w - 0.08, 0.20, 0.48), (0, d / 2 - 0.15, 0.68), fabric, r=0.06))
    P.append(box('backrail', (w - 0.02, 0.05, 0.05), (0, d / 2 - 0.09, 0.93), wood, 0.012))
    for s in (-1, 1):
        P.append(cyl('arm', 0.11, d - 0.28, (s * (w / 2 - 0.10), -0.05, 0.62), fabric, rot=(math.pi / 2, 0, 0)))
        P.append(sphere('scroll', 0.06, (s * (w / 2 - 0.10), -(d / 2 - 0.12), 0.62), wood))
        P.append(box('armbase', (0.2, d - 0.28, 0.3), (s * (w / 2 - 0.10), -0.05, 0.47), fabric, 0.03))
    n = 3 if w > 1.9 else 2
    cw = (w - 0.44) / n
    for i in range(n):
        x = -w / 2 + 0.22 + cw / 2 + i * cw
        P.append(rbox('seat%d' % i, (cw - 0.02, d - 0.42, 0.14), (x, -0.06, 0.51), fabric, r=0.045))
        P.append(rbox('backc%d' % i, (cw - 0.03, 0.15, 0.40), (x, d / 2 - 0.30, 0.79), fabric, r=0.05, rot=(-0.14, 0, 0)))
    P.append(box('trim', (w - 0.06, 0.035, 0.05), (0, -(d / 2 - 0.085), 0.155), wood, 0.008))
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append(lathe('leg', [(0.03, 0), (0.035, 0.02), (0.022, 0.05), (0.04, 0.09), (0.04, 0.14), (0.001, 0.14)], (sx * (w / 2 - 0.18), sy * (d / 2 - 0.2), 0), wood, 16))
    # two accent cushions
    P.append(rbox('cushA', (0.45, 0.14, 0.45), (-w / 2 + 0.5, d / 2 - 0.42, 0.80), 'velvet_blue', r=0.04, rot=(-0.2, 0, 0.1)))
    P.append(rbox('cushB', (0.45, 0.14, 0.45), (w / 2 - 0.5, d / 2 - 0.42, 0.80), 'velvet_mustard', r=0.04, rot=(-0.2, 0, -0.1)))
    return P

def bergere(fabric='velvet_blue', wood='cream_paint'):
    P = []
    back = extrude_shape('back', arch_points(0.58, 0.56, r=0.29), 0.08, (0, 0.24, 0.44), fabric, bevel_w=0.02)
    frame = extrude_shape('backframe', arch_points(0.64, 0.60, r=0.32), 0.035, (0, 0.30, 0.42), wood, bevel_w=0.01)
    P += [back, frame]
    P.append(box('seatframe', (0.66, 0.64, 0.05), (0, 0, 0.36), wood, 0.008))
    P.append(rbox('seat', (0.60, 0.58, 0.12), (0, -0.01, 0.44), fabric, r=0.04))
    for s in (-1, 1):
        P.append(rbox('arm', (0.10, 0.42, 0.10), (s * 0.28, 0.02, 0.62), fabric, r=0.035))
        P.append(box('armrest', (0.06, 0.46, 0.03), (s * 0.28, 0.02, 0.685), wood, 0.006))
        P.append(cyl('armpost', 0.018, 0.22, (s * 0.28, -0.18, 0.50), wood, 12))
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append(turned_leg('leg', 0.34, (sx * 0.28, sy * 0.26, 0), wood, 0.026))
    P.append(rbox('cushion', (0.38, 0.12, 0.38), (0, 0.12, 0.70), 'linen_cream', r=0.035, rot=(-0.18, 0, 0)))
    return P

def dining_chair(fabric='velvet_blue', wood='cream_paint'):
    P = []
    P.append(box('seatframe', (0.48, 0.48, 0.045), (0, 0, 0.42), wood, 0.006))
    P.append(rbox('seat', (0.46, 0.46, 0.07), (0, 0, 0.475), fabric, r=0.025))
    oval = torus('oval', 0.19, 0.016, (0, 0.21, 0.76), wood, 40, 10, scale=(1, 1, 1.25), rot=(math.pi / 2, 0, 0))
    P.append(oval)
    cane = cyl('cane', 0.175, 0.012, (0, 0.21, 0.76), 'cane', 40, rot=(math.pi / 2, 0, 0))
    cane.scale = (1, 1.25, 1)
    P.append(cane)
    for s in (-1, 1):
        P.append(cyl('post', 0.014, 0.14, (s * 0.10, 0.21, 0.49), wood, 12))
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append(cyl('leg', 0.022, 0.42, (sx * 0.20, sy * 0.20, 0.21), wood, 14, r2=0.014))
    return P

def bench(w=1.0, fabric='velvet_green', wood='cream_paint'):
    P = [rbox('seat', (w, 0.40, 0.10), (0, 0, 0.42), fabric, r=0.035), box('frame', (w - 0.02, 0.38, 0.04), (0, 0, 0.35), wood, 0.006)]
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append(turned_leg('leg', 0.33, (sx * (w / 2 - 0.08), sy * 0.14, 0), wood, 0.024))
    return P

def bistro_chair():
    P = [cyl('seat', 0.20, 0.025, (0, 0, 0.45), 'rattan', 32)]
    P.append(torus('seatring', 0.20, 0.008, (0, 0, 0.45), 'black_iron', 32, 8))
    for i in range(4):
        a = math.pi / 4 + i * math.pi / 2
        P.append(cyl('leg', 0.007, 0.45, (math.cos(a) * 0.17, math.sin(a) * 0.17, 0.225), 'black_iron', 8))
    P.append(tube('back', [(-0.17, 0.12, 0.45), (-0.19, 0.19, 0.70), (0, 0.24, 0.86), (0.19, 0.19, 0.70), (0.17, 0.12, 0.45)], 0.007, 'black_iron'))
    P.append(tube('back2', [(-0.10, 0.16, 0.45), (-0.06, 0.20, 0.72), (0.06, 0.20, 0.72), (0.10, 0.16, 0.45)], 0.006, 'black_iron'))
    return P

def bistro_table():
    P = [cyl('top', 0.30, 0.02, (0, 0, 0.71), 'marble_white', 40, bevel_w=0.004)]
    P.append(lathe('base', [(0.22, 0), (0.22, 0.015), (0.06, 0.04), (0.03, 0.2), (0.03, 0.55), (0.06, 0.62), (0.12, 0.68), (0.12, 0.70), (0.001, 0.70)], (0, 0, 0), 'black_iron', 24))
    return P

# ----------------------------------------------------------------- tables
def coffee_table():
    top = cyl('top', 0.60, 0.03, (0, 0, 0.435), 'marble_white', 48, bevel_w=0.008)
    top.scale.y = 0.55
    P = [top]
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append(cyl('leg', 0.012, 0.42, (sx * 0.42, sy * 0.16, 0.21), 'brass', 10, rot=(sy * 0.06, -sx * 0.06, 0)))
    ring = torus('ring', 0.40, 0.007, (0, 0, 0.12), 'brass', 40, 8, scale=(1, 0.5, 1))
    P.append(ring)
    P.append(box('stretcher', (0.86, 0.02, 0.02), (0, 0, 0.12), 'brass', 0.004))
    return P

def side_table():
    P = [cyl('top', 0.25, 0.025, (0, 0, 0.59), 'marble_white', 40, bevel_w=0.006)]
    for i in range(3):
        a = i * 2 * math.pi / 3 + math.pi / 2
        P.append(cyl('leg', 0.010, 0.58, (math.cos(a) * 0.16, math.sin(a) * 0.16, 0.29), 'brass', 10, rot=(math.sin(a) * 0.12, -math.cos(a) * 0.12, 0)))
    P.append(torus('ring', 0.14, 0.006, (0, 0, 0.2), 'brass', 32, 8))
    return P

def dining_table(dia=1.35):
    P = [cyl('top', dia / 2, 0.035, (0, 0, 0.745), 'marble_white', 64, bevel_w=0.01)]
    P.append(cyl('apron', dia / 2 - 0.03, 0.05, (0, 0, 0.70), 'cream_paint', 64))
    P.append(lathe('pedestal', [(0.16, 0), (0.16, 0.04), (0.09, 0.08), (0.07, 0.30), (0.10, 0.36), (0.07, 0.42), (0.08, 0.60), (0.14, 0.66), (0.16, 0.70), (0.001, 0.70)], (0, 0, 0), 'cream_paint', 32))
    for i in range(4):
        a = i * math.pi / 2 + math.pi / 4
        P.append(tube('foot', [(0, 0, 0.16), (math.cos(a) * 0.22, math.sin(a) * 0.22, 0.08), (math.cos(a) * 0.36, math.sin(a) * 0.36, 0.02)], 0.03, 'cream_paint'))
    return P

def desk():
    P = [box('top', (1.40, 0.65, 0.03), (0, 0, 0.745), 'walnut', 0.008)]
    P.append(box('leather', (1.10, 0.45, 0.004), (0, 0, 0.762), 'leather_green'))
    P.append(box('apron', (1.30, 0.55, 0.10), (0, 0, 0.68), 'walnut', 0.005))
    for s in (-1, 1):
        P.append(box('drawer', (0.38, 0.01, 0.07), (s * 0.40, -0.28, 0.68), 'walnut', 0.003))
        P.append(cyl('pull', 0.012, 0.03, (s * 0.40, -0.30, 0.68), 'brass', 12, rot=(math.pi / 2, 0, 0)))
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append(cabriole_leg('leg', 0.64, (sx * 0.60, sy * 0.24, 0), 'walnut', 0.02, 0.05, angle=math.atan2(sy, sx) + math.pi / 4))
            P.append(cyl('sabot', 0.024, 0.04, (sx * 0.60 + sx * 0.017, sy * 0.24 + sy * 0.017, 0.02), 'brass', 12))
    return P

def nightstand(w=0.5):
    P = [box('body', (w, 0.40, 0.42), (0, 0, 0.40), 'cream_paint', 0.006)]
    P.append(box('top', (w + 0.03, 0.43, 0.025), (0, 0, 0.62), 'marble_white', 0.006))
    P.append(box('drawer', (w - 0.08, 0.012, 0.16), (0, -0.20, 0.50), 'cream_paint', 0.003))
    P.append(box('door', (w - 0.08, 0.012, 0.16), (0, -0.20, 0.30), 'cream_paint', 0.003))
    P.append(cyl('knob', 0.014, 0.03, (0, -0.215, 0.50), 'brass', 12, rot=(math.pi / 2, 0, 0)))
    P.append(cyl('knob2', 0.014, 0.03, (0, -0.215, 0.30), 'brass', 12, rot=(math.pi / 2, 0, 0)))
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append(turned_leg('leg', 0.19, (sx * (w / 2 - 0.05), sy * 0.15, 0), 'cream_paint', 0.02))
    return P

def console(w=2.2, doors=4, h=0.85):
    P = [box('body', (w, 0.42, h - 0.15 - 0.03), (0, 0, 0.15 + (h - 0.18) / 2), 'cream_paint', 0.006)]
    P.append(box('top', (w + 0.04, 0.46, 0.03), (0, 0, h - 0.015), 'marble_white', 0.006))
    dw = (w - 0.06 * (doors + 1)) / doors
    for i in range(doors):
        x = -w / 2 + 0.06 + dw / 2 + i * (dw + 0.06)
        P.append(panel_frame('frame%d' % i, dw - 0.06, h - 0.32, (x, -0.216, 0.15 + (h - 0.18) / 2), 'cream_paint', 0.03, 0.012))
        side = 1 if x > 0 else -1
        P.append(cyl('knob%d' % i, 0.012, 0.03, (x + side * (dw / 2 - 0.06), -0.23, 0.15 + (h - 0.18) / 2), 'brass', 12, rot=(math.pi / 2, 0, 0)))
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append(turned_leg('leg', 0.15, (sx * (w / 2 - 0.06), sy * 0.16, 0), 'cream_paint', 0.02))
    return P

def dresser(w=1.2):
    P = [box('body', (w, 0.50, 0.66), (0, 0, 0.16 + 0.33), 'cream_paint', 0.006)]
    P.append(box('top', (w + 0.04, 0.54, 0.03), (0, 0, 0.835), 'marble_white', 0.006))
    for i in range(3):
        z = 0.26 + i * 0.20
        P.append(box('drawer%d' % i, (w - 0.08, 0.012, 0.16), (0, -0.256, z), 'cream_paint', 0.003))
        for s in (-1, 1):
            P.append(box('pull%d%d' % (i, s), (0.10, 0.02, 0.012), (s * w * 0.25, -0.27, z), 'brass', 0.004))
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append(turned_leg('leg', 0.16, (sx * (w / 2 - 0.06), sy * 0.20, 0), 'cream_paint', 0.02))
    return P

def wardrobe(w=1.6, h=2.3, doors=3):
    P = [box('body', (w, 0.60, h - 0.12), (0, 0, 0.06 + (h - 0.12) / 2), 'cream_paint', 0.005)]
    P.append(box('plinth', (w, 0.58, 0.08), (0, 0.01, 0.04), 'cream_paint'))
    P.append(box('cornice', (w + 0.08, 0.66, 0.08), (0, -0.01, h - 0.04), 'cream_paint', 0.02, 3))
    dw = (w - 0.03 * (doors + 1)) / doors
    for i in range(doors):
        x = -w / 2 + 0.03 + dw / 2 + i * (dw + 0.03)
        P.append(box('door%d' % i, (dw, 0.02, h - 0.24), (x, -0.31, 0.12 + (h - 0.24) / 2), 'cream_paint', 0.003))
        P.append(panel_frame('pf%dl' % i, dw - 0.10, (h - 0.24) * 0.32, (x, -0.322, 0.12 + (h - 0.24) * 0.22), 'cream_paint', 0.03, 0.012))
        P.append(panel_frame('pf%du' % i, dw - 0.10, (h - 0.24) * 0.50, (x, -0.322, 0.12 + (h - 0.24) * 0.68), 'cream_paint', 0.03, 0.012))
        side = -1 if i < doors / 2 - 0.5 else 1 if i > doors / 2 - 0.5 else (1 if i % 2 else -1)
        P.append(cyl('knob%d' % i, 0.013, 0.035, (x + side * (dw / 2 - 0.06), -0.335, 1.0), 'brass', 12, rot=(math.pi / 2, 0, 0)))
    return P

def bookshelf(w=1.0, h=2.2, shelves=5):
    P = []
    d = 0.35
    P.append(box('back', (w, 0.02, h - 0.12), (0, d / 2 - 0.01, 0.05 + (h - 0.12) / 2), 'sage_paint'))
    for s in (-1, 1):
        P.append(box('side', (0.025, d, h - 0.12), (s * (w / 2 - 0.0125), 0, (h - 0.12) / 2 + 0.05), 'cream_paint', 0.003))
    P.append(box('plinth', (w, d, 0.06), (0, 0, 0.03), 'cream_paint'))
    P.append(box('cornice', (w + 0.06, d + 0.03, 0.06), (0, -0.015, h - 0.03), 'cream_paint', 0.015, 3))
    gap = (h - 0.12 - 0.06) / shelves
    rr = random.Random(3)
    for i in range(shelves + 1):
        z = 0.06 + i * gap
        P.append(box('shelf%d' % i, (w - 0.05, d - 0.02, 0.025), (0, 0, z), 'cream_paint', 0.003))
        if i < shelves:
            x = -w / 2 + 0.05
            while x < w / 2 - 0.15:
                bw = 0.12 + rr.random() * 0.22
                if x + bw > w / 2 - 0.05:
                    bw = w / 2 - 0.05 - x
                bh = gap * (0.5 + rr.random() * 0.35)
                if rr.random() < 0.8:
                    P.append(box('books%d' % i, (bw - 0.02, d - 0.14, bh), (x + bw / 2, 0.02, z + 0.0125 + bh / 2), 'books'))
                elif rr.random() < 0.5:
                    P.append(lathe('vase', [(0.03, 0), (0.06, 0.04), (0.05, 0.14), (0.025, 0.18), (0.03, 0.22), (0.001, 0.22)], (x + bw / 2, 0, z + 0.0125), 'ceramic_white', 20))
                x += bw + 0.02
    return P

def tatami_platform(w=2.81, d=2.0, h=0.40):
    P = [box('platform', (w, d, h), (0, 0, h / 2), 'oak_light', 0.008)]
    P.append(box('front', (w, 0.02, h - 0.06), (0, -d / 2 - 0.01, h / 2 + 0.03), 'cream_paint'))
    n = 3
    dw = (w - 0.05 * (n + 1)) / n
    for i in range(n):
        x = -w / 2 + 0.05 + dw / 2 + i * (dw + 0.05)
        P.append(panel_frame('pf%d' % i, dw - 0.06, h - 0.16, (x, -d / 2 - 0.022, h / 2 + 0.03), 'cream_paint', 0.03, 0.012))
        P.append(box('pull%d' % i, (0.12, 0.02, 0.012), (x, -d / 2 - 0.03, h / 2 + 0.03), 'brass', 0.004))
    # futon (west part) with duvet and pillows
    fw, fl = min(1.45, w * 0.72), d - 0.12
    fx = -w / 2 + 0.04 + fw / 2
    P.append(rbox('futon', (fw, fl, 0.12), (fx, 0.0, h + 0.06), 'linen_cream', r=0.04))
    P.append(rbox('duvet', (fw - 0.05, fl * 0.58, 0.09), (fx, -fl * 0.18, h + 0.16), 'velvet_green', r=0.04))
    P.append(rbox('pillow', (0.62, 0.40, 0.12), (fx, fl / 2 - 0.28, h + 0.18), 'linen_cream', r=0.04))
    P.append(rbox('cushion1', (0.42, 0.14, 0.42), (fx - 0.2, fl / 2 - 0.10, h + 0.34), 'velvet_mustard', r=0.035, rot=(-0.25, 0, 0)))
    if w - fw > 0.9:
        # low tea table on the east part
        tx = w / 2 - (w - fw - 0.04) / 2
        P.append(box('teatable', (0.70, 0.50, 0.03), (tx, 0.1, h + 0.30), 'walnut', 0.006))
        for sx in (-1, 1):
            for sy in (-1, 1):
                P.append(cyl('tleg', 0.02, 0.28, (tx + sx * 0.30, 0.1 + sy * 0.20, h + 0.14), 'walnut', 10))
        P.append(rbox('zabuton', (0.48, 0.48, 0.06), (tx, -0.45, h + 0.03), 'velvet_green', r=0.02))
    else:
        P.append(rbox('zabuton', (0.45, 0.45, 0.06), (w / 2 - 0.30, d / 2 - 0.35, h + 0.03), 'velvet_green', r=0.02))
        P.append(box('tray', (0.36, 0.26, 0.02), (w / 2 - 0.30, -d / 2 + 0.35, h + 0.01), 'walnut', 0.004))
    return P

# ----------------------------------------------------------------- beds
def bed(w=1.8, L=2.1, fabric='linen_oat', head='velvet_blue', accent='velvet_mustard', frame='walnut'):
    P = []
    hb_h1, hb_h2 = 1.05, 1.32
    pts = camelback_points(w + 0.12, hb_h1, hb_h2)
    P.append(extrude_shape('headboard', pts, 0.09, (0, L / 2 - 0.05, 0), head, bevel_w=0.025))
    P.append(extrude_shape('hbframe', camelback_points(w + 0.20, hb_h1 + 0.04, hb_h2 + 0.05), 0.04, (0, L / 2 + 0.015, 0), frame, bevel_w=0.01))
    P.append(box('base', (w, L - 0.15, 0.28), (0, -0.05, 0.22), fabric, 0.02))
    P.append(box('rail', (w + 0.06, 0.04, 0.06), (0, -L / 2 + 0.06, 0.36), frame, 0.008))
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append(turned_leg('leg', 0.10, (sx * (w / 2 - 0.10), sy * (L / 2 - 0.2), 0), frame, 0.03))
    P.append(rbox('mattress', (w - 0.06, L - 0.22, 0.22), (0, -0.05, 0.47), 'linen_cream', r=0.05))
    P.append(rbox('duvet', (w + 0.02, L * 0.62, 0.12), (0, -L / 2 + 0.05 + L * 0.31, 0.62), fabric, r=0.05))
    P.append(rbox('fold', (w + 0.02, 0.22, 0.10), (0, -L / 2 + 0.05 + L * 0.62 - 0.05, 0.66), fabric, r=0.045))
    P.append(rbox('throw', (w + 0.04, 0.55, 0.06), (0, -L / 2 + 0.36, 0.71), accent, r=0.025))
    n = 2 if w >= 1.5 else 1
    for i in range(n):
        x = 0 if n == 1 else (i - 0.5) * (w * 0.5)
        P.append(rbox('euro%d' % i, (0.62, 0.16, 0.62), (x, L / 2 - 0.25, 0.90), head, r=0.05, rot=(-0.22, 0, 0)))
        P.append(rbox('pillow%d' % i, (0.70, 0.18, 0.45), (x, L / 2 - 0.42, 0.78), 'linen_cream', r=0.05, rot=(-0.30, 0, 0)))
    P.append(rbox('cush', (0.40, 0.13, 0.40), (0, L / 2 - 0.58, 0.76), accent, r=0.035, rot=(-0.35, 0, 0)))
    return P

def bay_cushion(w=3.0, d=0.78):
    P = [rbox('pad', (w, d, 0.06), (0, 0, 0.03), 'linen_oat', r=0.025)]
    P.append(rbox('c1', (0.45, 0.14, 0.45), (-w * 0.30, d * 0.3, 0.30), 'velvet_rose', r=0.035, rot=(-0.3, 0, 0.2)))
    P.append(rbox('c2', (0.45, 0.14, 0.45), (w * 0.32, d * 0.3, 0.30), 'linen_cream', r=0.035, rot=(-0.3, 0, -0.15)))
    P.append(rbox('c3', (0.40, 0.12, 0.40), (w * 0.20, d * 0.25, 0.27), 'velvet_blue', r=0.035, rot=(-0.3, 0, 0.1)))
    return P

# ----------------------------------------------------------------- lighting
def chandelier(arms=8, radius=0.36, h=0.78, small=False):
    P = []
    z_top = h
    P.append(lathe('canopy', [(0.05, z_top - 0.03), (0.06, z_top - 0.005), (0.001, z_top)], (0, 0, 0), 'brass', 24))
    P.append(cyl('chain', 0.006, h - 0.55, (0, 0, h - 0.03 - (h - 0.55) / 2), 'brass', 8))
    stem = lathe('stem', [(0.02, 0.10), (0.05, 0.14), (0.03, 0.2), (0.06, 0.26), (0.03, 0.32), (0.035, 0.44), (0.06, 0.48), (0.035, 0.52), (0.02, 0.55), (0.001, 0.55)], (0, 0, 0), 'brass', 24)
    P.append(stem)
    P.append(sphere('finial', 0.045, (0, 0, 0.06), 'crystal', 24))
    beads = []
    tips = []
    for i in range(arms):
        a = 2 * math.pi * i / arms
        c, s = math.cos(a), math.sin(a)
        pts = [(c * 0.03, s * 0.03, 0.30), (c * radius * 0.45, s * radius * 0.45, 0.18), (c * radius * 0.85, s * radius * 0.85, 0.22), (c * radius, s * radius, 0.34)]
        P.append(tube('arm%d' % i, pts, 0.008, 'brass'))
        tip = (c * radius, s * radius, 0.34)
        tips.append(tip)
        P.append(lathe('bobeche%d' % i, [(0.02, 0), (0.05, 0.015), (0.035, 0.02), (0.02, 0.025), (0.001, 0.025)], (tip[0], tip[1], tip[2]), 'crystal', 20))
        P.append(cyl('candle%d' % i, 0.013, 0.11, (tip[0], tip[1], tip[2] + 0.08), 'candle', 12))
        P.append(sphere('bulb%d' % i, 0.02, (tip[0], tip[1], tip[2] + 0.155), 'bulb', 14, scale=(1, 1, 1.4)))
        # drops under each bobeche
        beads.append(bead_chain('drop%d' % i, [(tip[0], tip[1], tip[2] - 0.01), (tip[0] * 0.98, tip[1] * 0.98, tip[2] - 0.09)], 0.011 if not small else 0.009))
    # swags between arm tips and the top ring, plus a bottom cluster
    for i in range(arms):
        a0 = 2 * math.pi * i / arms
        a1 = 2 * math.pi * (i + 1) / arms
        am = (a0 + a1) / 2
        p0 = (math.cos(a0) * radius, math.sin(a0) * radius, 0.34)
        pm = (math.cos(am) * radius * 0.92, math.sin(am) * radius * 0.92, 0.24)
        p1 = (math.cos(a1) * radius, math.sin(a1) * radius, 0.34)
        beads.append(bead_chain('swag%d' % i, [p0, pm, p1], 0.009))
        top = (math.cos(a0) * 0.06, math.sin(a0) * 0.06, 0.52)
        beads.append(bead_chain('strand%d' % i, [top, (math.cos(a0) * radius * 0.55, math.sin(a0) * radius * 0.55, 0.36), p0], 0.008))
    P.append(bead_chain('bottom', [(0, 0, 0.10), (0, 0, 0.0)], 0.014))
    P.append(sphere('ball', 0.035, (0, 0, -0.01), 'crystal', 20))
    P.append(join(beads, 'crystals'))
    return P

def chandelier_small():
    return chandelier(arms=5, radius=0.24, h=0.60, small=True)

def lantern():
    P = [cyl('chain', 0.005, 0.18, (0, 0, 0.44), 'brass', 8)]
    P.append(lathe('canopy', [(0.05, 0.50), (0.06, 0.525), (0.001, 0.53)], (0, 0, 0), 'brass', 20))
    w, h = 0.26, 0.34
    z0 = 0.05
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append(box('post', (0.012, 0.012, h), (sx * w / 2, sy * w / 2, z0 + h / 2), 'brass'))
    for z in (z0, z0 + h):
        P.append(box('rail', (w, 0.012, 0.012), (0, -w / 2, z), 'brass'))
        P.append(box('rail', (w, 0.012, 0.012), (0, w / 2, z), 'brass'))
        P.append(box('rail', (0.012, w, 0.012), (-w / 2, 0, z), 'brass'))
        P.append(box('rail', (0.012, w, 0.012), (w / 2, 0, z), 'brass'))
    P.append(box('glass', (w - 0.01, w - 0.01, h - 0.01), (0, 0, z0 + h / 2), 'glass'))
    P.append(lathe('cap', [(w * 0.72, z0 + h), (w * 0.5, z0 + h + 0.05), (0.03, z0 + h + 0.08), (0.001, z0 + h + 0.09)], (0, 0, 0), 'brass', 4))
    P.append(box('base', (w + 0.02, w + 0.02, 0.02), (0, 0, z0 - 0.01), 'brass'))
    P.append(cyl('candle', 0.014, 0.12, (0, 0, z0 + 0.07), 'candle', 12))
    P.append(sphere('bulb', 0.022, (0, 0, z0 + 0.16), 'bulb', 14, scale=(1, 1, 1.3)))
    return P

def flush_light():
    P = [cyl('ring', 0.18, 0.03, (0, 0, 0.015), 'brass', 40)]
    P.append(lathe('dome', [(0.16, 0.03), (0.15, 0.08), (0.10, 0.13), (0.001, 0.15)], (0, 0, 0), 'bulb', 32))
    return P

def sconce():
    P = [cyl('plate', 0.055, 0.015, (0, 0.0, 0.10), 'brass', 24, rot=(math.pi / 2, 0, 0))]
    P.append(tube('arm', [(0, -0.005, 0.10), (0, -0.09, 0.09), (0, -0.12, 0.16)], 0.006, 'brass'))
    P.append(lathe('cup', [(0.015, 0.16), (0.03, 0.18), (0.001, 0.18)], (0, -0.12, 0), 'brass', 16))
    P.append(cyl('candle', 0.011, 0.09, (0, -0.12, 0.225), 'candle', 12))
    P.append(sphere('bulb', 0.016, (0, -0.12, 0.28), 'bulb', 12))
    P.append(lathe('shade', [(0.05, 0.26), (0.07, 0.40), (0.001, 0.40)], (0, -0.12, 0), 'paper', 24))
    return P

def floor_lamp():
    P = [lathe('base', [(0.16, 0), (0.16, 0.02), (0.05, 0.04), (0.02, 0.1), (0.02, 1.35), (0.03, 1.38), (0.001, 1.40)], (0, 0, 0), 'brass', 24)]
    P.append(lathe('shade', [(0.19, 1.30), (0.21, 1.31), (0.21, 1.58), (0.19, 1.60), (0.001, 1.60)], (0, 0, 0), 'paper', 32))
    P.append(sphere('bulb', 0.03, (0, 0, 1.44), 'bulb', 14))
    return P

def table_lamp(base_m='ceramic_blue'):
    P = [lathe('base', [(0.08, 0), (0.09, 0.02), (0.13, 0.12), (0.10, 0.24), (0.05, 0.30), (0.04, 0.36), (0.02, 0.40), (0.001, 0.40)], (0, 0, 0), base_m, 24)]
    P.append(cyl('stem', 0.008, 0.10, (0, 0, 0.44), 'brass', 10))
    P.append(lathe('shade', [(0.13, 0.36), (0.14, 0.37), (0.17, 0.60), (0.15, 0.61), (0.001, 0.61)], (0, 0, 0), 'paper', 32))
    P.append(sphere('bulb', 0.025, (0, 0, 0.5), 'bulb', 14))
    return P

def ceiling_rose(dia=0.8):
    r = dia / 2
    prof = [(0.001, 0), (r, 0), (r, 0.012), (r * 0.9, 0.018), (r * 0.86, 0.03), (r * 0.7, 0.03), (r * 0.66, 0.045), (r * 0.5, 0.045), (r * 0.46, 0.06), (r * 0.3, 0.06), (r * 0.26, 0.075), (0.001, 0.075)]
    return [lathe('rose', prof, (0, 0, 0), 'plaster', 48)]

# ----------------------------------------------------------------- wall pieces
def fireplace(w=1.4):
    P = []
    d = 0.30
    h = 1.15
    for s in (-1, 1):
        P.append(box('pilaster', (0.20, d, h - 0.14), (s * (w / 2 - 0.10), 0, (h - 0.14) / 2), 'marble_white', 0.008))
        P.append(box('plinth', (0.24, d + 0.02, 0.12), (s * (w / 2 - 0.10), 0, 0.06), 'marble_white', 0.006))
        P.append(box('capital', (0.24, d + 0.02, 0.06), (s * (w / 2 - 0.10), 0, h - 0.17), 'marble_white', 0.008))
    P.append(box('frieze', (w - 0.36, 0.22, 0.22), (0, 0.04, h - 0.25), 'marble_white', 0.006))
    P.append(box('cartouche', (0.32, 0.03, 0.14), (0, -0.075, h - 0.25), 'marble_white', 0.01))
    P.append(box('shelf', (w + 0.10, d + 0.10, 0.05), (0, -0.02, h - 0.025), 'marble_white', 0.012, 3))
    P.append(box('shelfmould', (w + 0.04, d + 0.06, 0.05), (0, -0.01, h - 0.075), 'marble_white', 0.015, 3))
    P.append(box('firebox', (w - 0.44, 0.24, h - 0.40), (0, 0.03, (h - 0.40) / 2), 'black_paint'))
    P.append(box('insert', (w - 0.50, 0.03, h - 0.46), (0, -0.09, (h - 0.46) / 2), 'ebony'))
    P.append(box('surround', (w - 0.36, 0.02, 0.06), (0, -0.115, h - 0.40 + 0.02), 'ebony'))
    for i, (x, z) in enumerate(((-0.14, 0.09), (0.12, 0.09), (0, 0.17))):
        P.append(cyl('log%d' % i, 0.05, 0.36, (x, -0.02, z), 'trunk', 10, rot=(0, math.pi / 2, 0.3 * (i - 1))))
    P.append(sphere('ember', 0.06, (0, -0.02, 0.06), 'ember', 12, scale=(3, 1.2, 0.6)))
    P.append(box('hearth', (w + 0.2, 0.45, 0.02), (0, -0.25, 0.01), 'marble_black', 0.004))
    P.append(box('grate', (w - 0.5, 0.02, 0.10), (0, -0.14, 0.05), 'black_iron'))
    return P

def tv(w=1.45, h=0.83):
    P = [box('screen', (w, 0.02, h), (0, -0.01, h / 2 + 0.02), 'screen_black', 0.003)]
    P.append(box('bezel', (w + 0.02, 0.03, h + 0.02), (0, 0.01, h / 2 + 0.02), 'black_paint', 0.004))
    return P

def mirror_ornate(w=0.9, h=1.4):
    P = [extrude_shape('frame', arch_points(w, h, r=w / 2), 0.045, (0, 0.0225, 0), 'gilt', bevel_w=0.012)]
    P.append(extrude_shape('inner', arch_points(w - 0.10, h - 0.07, r=(w - 0.10) / 2, base=0.045), 0.02, (0, 0.006, 0), 'gilt', bevel_w=0.006))
    P.append(extrude_shape('glass', arch_points(w - 0.14, h - 0.10, r=(w - 0.14) / 2, base=0.06), 0.006, (0, -0.010, 0), 'mirror'))
    P.append(sphere('crest', 0.05, (0, 0.02, h + 0.02), 'gilt', 16, scale=(1.6, 0.6, 1)))
    P.append(sphere('crestl', 0.03, (-0.09, 0.02, h - 0.01), 'gilt', 12))
    P.append(sphere('crestr', 0.03, (0.09, 0.02, h - 0.01), 'gilt', 12))
    return P

def mirror_round(dia=0.7):
    P = [torus('frame', dia / 2, 0.02, (0, 0.02, dia / 2 + 0.02), 'brass', 48, 10, rot=(math.pi / 2, 0, 0))]
    P.append(cyl('glass', dia / 2 - 0.005, 0.008, (0, 0.02, dia / 2 + 0.02), 'mirror', 48, rot=(math.pi / 2, 0, 0)))
    return P

def art(w=0.6, h=0.8, frame_m='gilt'):
    P = [box('frame', (w, 0.035, h), (0, 0.02, h / 2), frame_m, 0.008)]
    P.append(box('canvas', (w - 0.10, 0.01, h - 0.10), (0, 0.0, h / 2), 'canvas'))
    P.append(box('inner', (w - 0.07, 0.02, h - 0.07), (0, 0.008, h / 2), frame_m, 0.004))
    return P

# ----------------------------------------------------------------- plants
def plant_fig():
    P = [lathe('pot', [(0.16, 0), (0.18, 0.02), (0.20, 0.30), (0.22, 0.32), (0.22, 0.35), (0.20, 0.35), (0.001, 0.35)], (0, 0, 0), 'ceramic_white', 32)]
    P.append(cyl('soil', 0.19, 0.02, (0, 0, 0.356), 'soil', 24))
    P.append(tube('trunk', [(0, 0, 0.3), (0.02, 0.01, 0.8), (-0.01, 0.03, 1.2), (0.02, -0.02, 1.62)], 0.018, 'trunk'))
    rr = random.Random(11)
    leaves = []
    for i in range(26):
        z = 0.62 + i * 0.04 + rr.random() * 0.03
        a = rr.random() * 2 * math.pi
        L = 0.24 + rr.random() * 0.12
        leaves.append(leaf('leaf%d' % i, L, L * 0.62, (math.cos(a) * 0.03, math.sin(a) * 0.03, z), (0, -0.35 - rr.random() * 0.4, a), 'leaf_green', 0.5, 6))
    P.append(join(leaves, 'leaves'))
    return P

def plant_olive():
    P = [lathe('pot', [(0.15, 0), (0.17, 0.02), (0.20, 0.32), (0.22, 0.34), (0.22, 0.37), (0.20, 0.37), (0.001, 0.37)], (0, 0, 0), 'terracotta', 32)]
    P.append(cyl('soil', 0.19, 0.02, (0, 0, 0.376), 'soil', 24))
    P.append(tube('trunk', [(0, 0, 0.32), (0.03, 0.02, 0.7), (-0.02, 0.0, 1.0)], 0.02, 'trunk'))
    for i in range(3):
        a = i * 2.1
        P.append(tube('branch%d' % i, [(-0.02, 0, 0.95), (math.cos(a) * 0.15, math.sin(a) * 0.15, 1.1), (math.cos(a) * 0.25, math.sin(a) * 0.25, 1.25)], 0.008, 'trunk'))
    P.append(leaf_cloud('canopy', (0, 0, 1.18), 0.38, 420, 0.05, 'leaf_olive', seed=2, flat=0.75))
    return P

def plant_small():
    P = [lathe('pot', [(0.09, 0), (0.10, 0.01), (0.12, 0.16), (0.13, 0.17), (0.13, 0.19), (0.11, 0.19), (0.001, 0.19)], (0, 0, 0), 'ceramic_white', 24)]
    P.append(cyl('soil', 0.10, 0.015, (0, 0, 0.196), 'soil', 20))
    P.append(leaf_cloud('foliage', (0, 0, 0.30), 0.18, 90, 0.06, 'leaf_green', seed=5, flat=0.8))
    return P

def planter_box(w=0.9):
    P = [box('box', (w, 0.30, 0.32), (0, 0, 0.16), 'stone_grey', 0.01)]
    P.append(box('soil', (w - 0.04, 0.26, 0.02), (0, 0, 0.315), 'soil'))
    rr = random.Random(9)
    for i in range(int(w / 0.18)):
        x = -w / 2 + 0.12 + i * 0.18
        P.append(leaf_cloud('bush%d' % i, (x, 0, 0.42), 0.14 + rr.random() * 0.03, 70, 0.045, 'leaf_olive', seed=i + 20, flat=0.9))
    return P

# ----------------------------------------------------------------- kitchen (room-fitted)
def kitchen_set(W=2.623, D=2.760):
    """Built in room coordinates: NW interior corner at origin, room spans x 0..W, y 0..-D.
    No two slabs share a face: the north run starts after the corner, and both the
    base run and the countertop are split around the range."""
    P = []
    bd, bh, th = 0.60, 0.88, 0.04   # base depth, base height, top thickness
    fridge_w = 0.72
    north_len = W - fridge_w - 0.02
    rx = bd + 0.55                  # range centre on the north run
    rw = 0.60
    # west run (along x=0), full depth
    P.append(box('base_w', (bd, D - 0.02, bh - 0.10), (bd / 2, -D / 2, 0.10 + (bh - 0.10) / 2), 'cream_paint'))
    P.append(box('plinth_w', (bd - 0.05, D - 0.02, 0.10), (bd / 2 - 0.025, -D / 2, 0.05), 'black_paint'))
    # north run in two pieces either side of the range
    north_pieces = ((bd, rx - rw / 2), (rx + rw / 2, north_len))
    for i, (x0, x1) in enumerate(north_pieces):
        cw = x1 - x0
        P.append(box('base_n%d' % i, (cw, bd, bh - 0.10), ((x0 + x1) / 2, -bd / 2, 0.10 + (bh - 0.10) / 2), 'cream_paint'))
        P.append(box('plinth_n%d' % i, (cw, bd - 0.05, 0.10), ((x0 + x1) / 2, -bd / 2 + 0.025, 0.05), 'black_paint'))
        # doors on this piece
        n = max(1, int(round(cw / 0.5)))
        dw = (cw - 0.02 * (n + 1)) / n
        for k in range(n):
            cx = x0 + 0.02 + dw / 2 + k * (dw + 0.02)
            P.append(panel_frame('nd', dw - 0.06, bh - 0.22, (cx, -bd - 0.008, 0.10 + (bh - 0.10) / 2), 'cream_paint', 0.03, 0.012))
            P.append(box('pull', (0.11, 0.02, 0.012), (cx, -bd - 0.02, 0.10 + (bh - 0.10) / 2 + 0.18), 'brass', 0.003))
    # doors on the west run (facing +x)
    y = -bd - 0.02
    while y > -D + 0.4:
        dw = min(0.55, -y - (-D + 0.02) - 0.02)
        y0 = y - dw
        P.append(panel_frame('wd', dw - 0.06, bh - 0.22, (bd + 0.008, (y + y0) / 2, 0.10 + (bh - 0.10) / 2), 'cream_paint', 0.03, 0.012, rot=(0, 0, math.pi / 2)))
        P.append(box('pull', (0.012, 0.11, 0.02), (bd + 0.02, (y + y0) / 2, 0.10 + (bh - 0.10) / 2 + 0.18), 'brass', 0.003))
        y = y0 - 0.02
    # countertop: west slab full depth, north slabs start after the corner and stop at the range cut-out
    P.append(box('top_w', (bd + 0.03, D, th), ((bd + 0.03) / 2, -D / 2, bh + th / 2), 'marble_white', 0.006))
    for i, (x0, x1) in enumerate(((bd + 0.03, rx - rw / 2), (rx + rw / 2, north_len))):
        P.append(box('top_n%d' % i, (x1 - x0, bd + 0.03, th), ((x0 + x1) / 2, -(bd + 0.03) / 2, bh + th / 2), 'marble_white', 0.006))
    # sink under the window on the west run: a 6 mm proud stainless rim
    sink_y = -D * 0.55
    P.append(box('sink', (0.44, 0.40, 0.18), (bd / 2 + 0.02, sink_y, bh + th - 0.09 + 0.006), 'stainless'))
    P.append(tube('faucet', [(0.10, sink_y + 0.0, bh + th), (0.10, sink_y, bh + th + 0.30), (0.26, sink_y, bh + th + 0.30), (0.30, sink_y, bh + th + 0.22)], 0.012, 'brass'))
    # range fills the cut-out; its stainless top is flush with the marble
    P.append(box('range', (rw, bd - 0.02, bh - 0.10), (rx, -bd / 2 + 0.01, 0.10 + (bh - 0.10) / 2), 'black_paint'))
    P.append(box('rangetop', (rw, bd + 0.03, th), (rx, -(bd + 0.03) / 2, bh + th / 2), 'stainless'))
    for i, (dx, dy) in enumerate(((-0.15, -0.12), (0.15, -0.12), (-0.15, 0.14), (0.15, 0.14))):
        P.append(torus('burner%d' % i, 0.06, 0.008, (rx + dx, -bd / 2 + dy, bh + th + 0.006), 'black_iron', 20, 6))
    P.append(box('ovendoor', (rw - 0.06, 0.02, 0.42), (rx, -bd - 0.005, 0.50), 'black_paint', 0.004))
    P.append(box('ovenglass', (0.42, 0.01, 0.24), (rx, -bd - 0.02, 0.52), 'screen_black'))
    P.append(box('ovenhandle', (0.50, 0.03, 0.02), (rx, -bd - 0.04, 0.68), 'brass', 0.005))
    # hood: plaster canopy with a brass band
    P.append(box('hood', (0.90, 0.50, 0.55), (rx, -0.25, 1.75), 'cream_paint', 0.01))
    P.append(box('hoodband', (0.92, 0.52, 0.04), (rx, -0.25, 1.50), 'brass', 0.006))
    # upper cabinets on the north wall, either side of the hood
    uh, ud, uz = 0.80, 0.35, 1.45
    for (x0, x1) in ((0.02, rx - 0.47), (rx + 0.47, north_len)):
        if x1 - x0 < 0.3:
            continue
        cw = x1 - x0
        P.append(box('upper', (cw, ud, uh), ((x0 + x1) / 2, -ud / 2, uz + uh / 2), 'cream_paint', 0.004))
        n = max(1, int(cw / 0.5))
        dw = (cw - 0.02 * (n + 1)) / n
        for i in range(n):
            cx = x0 + 0.02 + dw / 2 + i * (dw + 0.02)
            P.append(panel_frame('ud', dw - 0.06, uh - 0.10, (cx, -ud - 0.008, uz + uh / 2), 'cream_paint', 0.03, 0.012))
            P.append(box('uglass', (dw - 0.12, 0.006, uh - 0.16), (cx, -ud - 0.004, uz + uh / 2), 'glass'))
            P.append(cyl('uknob', 0.012, 0.03, (cx + (dw / 2 - 0.05) * (1 if cx < rx else -1), -ud - 0.02, uz + 0.30), 'brass', 12, rot=(math.pi / 2, 0, 0)))
        P.append(box('ucornice', (cw + 0.04, ud + 0.02, 0.06), ((x0 + x1) / 2, -ud / 2 - 0.01, uz + uh + 0.03), 'cream_paint', 0.012, 3))
    # fridge at the east end of the north wall
    fx = W - fridge_w / 2 - 0.01
    P.append(box('fridge', (fridge_w, 0.70, 1.85), (fx, -0.36, 0.925), 'cream_paint', 0.02, 4))
    P.append(box('fridgedoor_top', (fridge_w - 0.04, 0.02, 0.62), (fx, -0.715, 1.50), 'cream_paint', 0.006))
    P.append(box('fridgedoor', (fridge_w - 0.04, 0.02, 1.10), (fx, -0.715, 0.62), 'cream_paint', 0.006))
    P.append(box('fhandle1', (0.03, 0.03, 0.40), (fx - 0.25, -0.75, 1.5), 'brass', 0.005))
    P.append(box('fhandle2', (0.03, 0.03, 0.60), (fx - 0.25, -0.75, 0.75), 'brass', 0.005))
    # backsplash: marble slab along the north run (stands 4 mm off the wall so it never meets the finish board)
    P.append(box('splash', (north_len, 0.015, 0.55), (north_len / 2, -0.0115, bh + th + 0.275), 'marble_white'))
    # decor: kettle, board, jars
    P.append(lathe('kettle', [(0.06, 0), (0.09, 0.02), (0.08, 0.12), (0.03, 0.16), (0.04, 0.18), (0.001, 0.18)], (north_len - 0.35, -0.35, bh + th), 'copper', 20))
    P.append(box('board', (0.02, 0.28, 0.40), (0.34, -1.2, bh + th + 0.2), 'oak', 0.004))
    for i in range(3):
        P.append(lathe('jar%d' % i, [(0.05, 0), (0.05, 0.14), (0.04, 0.15), (0.04, 0.17), (0.001, 0.17)], (north_len - 0.62 - i * 0.13, -0.42, bh + th), 'glass', 16))
    return P

# ----------------------------------------------------------------- bathroom
def vanity(w=0.8):
    P = [box('body', (w, 0.48, 0.60), (0, 0, 0.15 + 0.30), 'cream_paint', 0.005)]
    P.append(box('top', (w + 0.04, 0.52, 0.03), (0, 0, 0.765), 'marble_white', 0.006))
    n = 2 if w > 0.7 else 1
    dw = (w - 0.03 * (n + 1)) / n
    for i in range(n):
        x = -w / 2 + 0.03 + dw / 2 + i * (dw + 0.03)
        P.append(panel_frame('pf%d' % i, dw - 0.05, 0.50, (x, -0.248, 0.45), 'cream_paint', 0.03, 0.012))
        P.append(cyl('knob%d' % i, 0.012, 0.03, (x + (dw / 2 - 0.05) * (1 if x < 0 else -1), -0.26, 0.45), 'brass', 12, rot=(math.pi / 2, 0, 0)))
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append(turned_leg('leg', 0.15, (sx * (w / 2 - 0.05), sy * 0.19, 0), 'cream_paint', 0.02))
    basin = lathe('basin', [(0.10, 0.78), (0.19, 0.80), (0.20, 0.86), (0.19, 0.92), (0.17, 0.92), (0.17, 0.90), (0.15, 0.82), (0.001, 0.81)], (0, -0.02, 0), 'ceramic_white', 32)
    basin.scale = (1.15, 0.85, 1)
    P.append(basin)
    P.append(tube('faucet', [(0, 0.17, 0.78), (0, 0.17, 0.98), (0, 0.06, 1.0), (0, 0.03, 0.96)], 0.011, 'brass'))
    for s in (-1, 1):
        P.append(cyl('tap', 0.015, 0.05, (s * 0.07, 0.17, 0.80), 'brass', 12))
    return P

def toilet():
    P = [rbox('pedestal', (0.36, 0.50, 0.38), (0, -0.05, 0.19), 'ceramic_white', r=0.05)]
    bowl = cyl('bowl', 0.19, 0.10, (0, -0.10, 0.42), 'ceramic_white', 32, bevel_w=0.02)
    bowl.scale.y = 1.35
    P.append(bowl)
    seat = torus('seat', 0.17, 0.028, (0, -0.10, 0.475), 'ceramic_white', 32, 8, scale=(1, 1.35, 1))
    P.append(seat)
    P.append(rbox('tank', (0.38, 0.18, 0.36), (0, 0.20, 0.64), 'ceramic_white', r=0.02))
    P.append(box('lid', (0.40, 0.20, 0.02), (0, 0.20, 0.83), 'ceramic_white', 0.005))
    P.append(cyl('button', 0.02, 0.01, (0, 0.20, 0.845), 'brass', 16))
    return P

def bathtub():
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=48, v_segments=24, radius=1.0)
    bmesh.ops.scale(bm, vec=Vector((0.76, 0.36, 0.46)), verts=bm.verts)
    bmesh.ops.translate(bm, vec=Vector((0, 0, 0.60)), verts=bm.verts)
    geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
    bmesh.ops.bisect_plane(bm, geom=geom, plane_co=(0, 0, 0.60), plane_no=(0, 0, 1), clear_outer=True)
    shell = mesh_from_bm('shell', bm, 'ceramic_white', smooth=True)
    mod = shell.modifiers.new('solid', 'SOLIDIFY')
    mod.thickness = 0.03
    mod.offset = -1
    P = [shell]
    P.append(torus('rim', 1.0, 0.03, (0, 0, 0.60), 'ceramic_white', 64, 12, scale=(0.76, 0.36, 1)))
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append(lathe('foot', [(0.05, 0), (0.06, 0.02), (0.03, 0.06), (0.04, 0.12), (0.03, 0.16), (0.001, 0.16)], (sx * 0.46, sy * 0.20, 0), 'brass', 16))
    P.append(tube('spout', [(0.72, 0.0, 0.50), (0.72, 0.0, 0.75), (0.60, 0.0, 0.78), (0.55, 0.0, 0.72)], 0.012, 'brass'))
    for s in (-1, 1):
        P.append(cyl('tap', 0.02, 0.05, (0.74, s * 0.10, 0.66), 'brass', 12, rot=(0, math.pi / 2, 0)))
    P.append(tube('shower', [(0.72, 0.0, 0.75), (0.80, 0.0, 1.0), (0.78, 0.0, 1.5)], 0.008, 'brass'))
    P.append(lathe('hand', [(0.02, 1.48), (0.04, 1.52), (0.04, 1.56), (0.001, 1.58)], (0.78, 0, 0), 'brass', 12))
    return P

def shower(w=0.9):
    P = [box('tray', (w, w, 0.04), (0, 0, 0.02), 'marble_white', 0.006)]
    P.append(box('glass', (0.008, w, 2.0), (-w / 2 + 0.004, 0, 1.04), 'glass'))
    P.append(box('bar', (0.02, w, 0.02), (-w / 2 + 0.004, 0, 2.03), 'brass', 0.003))
    P.append(box('bar2', (0.02, 0.02, 2.0), (-w / 2 + 0.004, w / 2 - 0.01, 1.04), 'brass', 0.003))
    P.append(cyl('head', 0.12, 0.012, (0.05, 0.15, 2.15), 'brass', 32))
    P.append(tube('arm', [(0.05, w / 2, 2.15), (0.05, 0.15, 2.15)], 0.01, 'brass'))
    P.append(tube('riser', [(0.05, w / 2, 1.05), (0.05, w / 2, 2.15)], 0.01, 'brass'))
    P.append(cyl('mixer', 0.04, 0.02, (0.05, w / 2 - 0.01, 1.05), 'brass', 24, rot=(math.pi / 2, 0, 0)))
    P.append(lathe('handle', [(0.015, 0), (0.012, 0.06), (0.001, 0.06)], (0.05, w / 2 - 0.03, 1.05), 'brass', 12))
    return P

def washer():
    P = [box('body', (0.60, 0.60, 0.85), (0, 0, 0.425), 'white_paint', 0.01, 3)]
    P.append(torus('doorring', 0.20, 0.02, (0, -0.30, 0.42), 'chrome', 40, 10, rot=(math.pi / 2, 0, 0)))
    P.append(cyl('doorglass', 0.19, 0.02, (0, -0.31, 0.42), 'screen_black', 40, rot=(math.pi / 2, 0, 0)))
    P.append(box('panel', (0.56, 0.01, 0.08), (0, -0.305, 0.78), 'black_paint'))
    P.append(cyl('dial', 0.03, 0.02, (0.18, -0.315, 0.78), 'chrome', 20, rot=(math.pi / 2, 0, 0)))
    return P

# ----------------------------------------------------------------- decor
def vase_tall():
    return [lathe('vase', [(0.05, 0), (0.09, 0.05), (0.08, 0.20), (0.04, 0.30), (0.045, 0.36), (0.055, 0.40), (0.001, 0.40)], (0, 0, 0), 'ceramic_blue', 28),
            tube('stem1', [(0, 0, 0.35), (0.02, 0.01, 0.55), (0.05, 0.02, 0.72)], 0.004, 'trunk'),
            tube('stem2', [(0, 0, 0.35), (-0.03, 0.01, 0.52), (-0.07, 0.03, 0.66)], 0.004, 'trunk'),
            leaf_cloud('blooms', (0, 0, 0.72), 0.13, 26, 0.05, 'velvet_rose', seed=4, flat=0.8)]

def candlestick():
    return [lathe('stick', [(0.045, 0), (0.05, 0.01), (0.02, 0.03), (0.015, 0.15), (0.025, 0.18), (0.015, 0.20), (0.025, 0.24), (0.001, 0.24)], (0, 0, 0), 'brass', 20),
            cyl('candle', 0.012, 0.16, (0, 0, 0.32), 'candle', 12)]

def books_stack():
    P = []
    z = 0
    rr = random.Random(2)
    for i, m in enumerate(('leather_green', 'linen_oat', 'leather_tan')):
        h = 0.03 + rr.random() * 0.02
        P.append(box('book%d' % i, (0.22 - i * 0.02, 0.15 - i * 0.01, h), (rr.random() * 0.02, rr.random() * 0.02, z + h / 2), m, 0.003, rot=(0, 0, (rr.random() - 0.5) * 0.3)))
        z += h
    return P

def bowl():
    return [lathe('bowl', [(0.05, 0), (0.12, 0.02), (0.16, 0.07), (0.15, 0.075), (0.11, 0.03), (0.001, 0.025)], (0, 0, 0), 'ceramic_white', 32)]

def cushion(m='velvet_blue'):
    return [rbox('cushion', (0.45, 0.14, 0.45), (0, 0, 0.225), m, r=0.04)]

def coat_rack():
    P = [lathe('base', [(0.18, 0), (0.18, 0.02), (0.04, 0.04), (0.02, 0.06), (0.02, 1.7), (0.03, 1.74), (0.001, 1.76)], (0, 0, 0), 'brass', 24)]
    for i in range(4):
        a = i * math.pi / 2
        P.append(tube('hook%d' % i, [(0, 0, 1.62), (math.cos(a) * 0.12, math.sin(a) * 0.12, 1.58), (math.cos(a) * 0.16, math.sin(a) * 0.16, 1.66)], 0.007, 'brass'))
    return P

def radiator_cover():
    return []

# ----------------------------------------------------------------- registry
ASSETS = {
    'sofa': lambda: sofa(),
    'sofa_small': lambda: sofa(1.6, 'boucle_white'),
    'bergere': lambda: bergere(),
    'bergere_green': lambda: bergere('velvet_green'),
    'dining_chair': lambda: dining_chair(),
    'dining_table': lambda: dining_table(),
    'coffee_table': lambda: coffee_table(),
    'side_table': lambda: side_table(),
    'console': lambda: console(),
    'console_short': lambda: console(1.4, 3, 0.85),
    'bench': lambda: bench(),
    'desk': lambda: desk(),
    'desk_chair': lambda: dining_chair('velvet_green'),
    'nightstand': lambda: nightstand(),
    'dresser': lambda: dresser(),
    'wardrobe': lambda: wardrobe(),
    'wardrobe_wide': lambda: wardrobe(2.2, 2.4, 4),
    'bookshelf': lambda: bookshelf(),
    'tatami_platform': lambda: tatami_platform(2.0, 1.8),
    'bed_queen': lambda: bed(1.8, 2.1),
    'bed_double': lambda: bed(1.5, 2.0, 'linen_cream', 'velvet_rose', 'velvet_green'),
    'bed_single': lambda: bed(1.2, 2.0, 'linen_oat', 'velvet_green', 'velvet_rose'),
    'bay_cushion': lambda: bay_cushion(),
    'chandelier_large': lambda: chandelier(),
    'chandelier_small': lambda: chandelier_small(),
    'lantern': lambda: lantern(),
    'flush_light': lambda: flush_light(),
    'sconce': lambda: sconce(),
    'floor_lamp': lambda: floor_lamp(),
    'table_lamp': lambda: table_lamp(),
    'table_lamp_white': lambda: table_lamp('ceramic_white'),
    'ceiling_rose': lambda: ceiling_rose(),
    'ceiling_rose_small': lambda: ceiling_rose(0.55),
    'fireplace': lambda: fireplace(),
    'tv': lambda: tv(),
    'mirror_ornate': lambda: mirror_ornate(),
    'mirror_round': lambda: mirror_round(),
    'art_portrait': lambda: art(0.6, 0.8),
    'art_landscape': lambda: art(1.0, 0.7),
    'art_small': lambda: art(0.4, 0.5, 'black_paint'),
    'plant_fig': lambda: plant_fig(),
    'plant_olive': lambda: plant_olive(),
    'plant_small': lambda: plant_small(),
    'planter_box': lambda: planter_box(),
    'kitchen_set': lambda: kitchen_set(),
    'vanity': lambda: vanity(),
    'vanity_wide': lambda: vanity(1.0),
    'toilet': lambda: toilet(),
    'bathtub': lambda: bathtub(),
    'shower': lambda: shower(),
    'washer': lambda: washer(),
    'bistro_table': lambda: bistro_table(),
    'bistro_chair': lambda: bistro_chair(),
    'vase_tall': lambda: vase_tall(),
    'candlestick': lambda: candlestick(),
    'books_stack': lambda: books_stack(),
    'bowl': lambda: bowl(),
    'cushion_blue': lambda: cushion('velvet_blue'),
    'cushion_rose': lambda: cushion('velvet_rose'),
    'coat_rack': lambda: coat_rack(),
}
