"""Modern warm-minimalist (现代简约) furniture, lighting and fittings.
Same conventions as assets.py: metres, front faces -Y, origin at the floor
centre (wall-hung pieces: origin on the wall plane at the piece's bottom;
ceiling fixtures: z = 0 at the lowest point, canopy top at z = H).
Pale oak, warm-white lacquer, slim matte-black metal, oat boucle / sand linen."""
import math, random
from mathutils import Vector
from lib import (box, rbox, cyl, sphere, torus, lathe, lathe_arc, tube, extrude_shape, leaf,
                 join, mesh_from_bm, bevel, shade_smooth, panel_frame)
from assets import leaf_cloud, bead_chain
import bmesh, bpy

# ----------------------------------------------------------------- helpers
def grooves(name, w, h, loc, n, m='matte_black', vertical=True, depth=0.012, width=0.004):
    """Thin dark lines that read as handleless door/drawer gaps on a flush front (face -Y). loc = centre of the front."""
    P = []
    for i in range(1, n):
        if vertical:
            x = -w / 2 + i * w / n
            P.append(box('%s%d' % (name, i), (width, depth, h), (loc[0] + x, loc[1], loc[2]), m))
        else:
            z = -h / 2 + i * h / n
            P.append(box('%s%d' % (name, i), (w, depth, width), (loc[0], loc[1], loc[2] + z), m))
    return P

def plinth(name, w, d, h=0.06, inset=0.05, m='oak_pale', y=0.0):
    """Recessed toe-kick; 2 mm taller than nominal so it overlaps the body above (no shared faces)."""
    return box(name, (w - 2 * inset, d - 2 * inset, h), (0, y, h / 2), m)

def rod(name, p0, p1, r, m='matte_black', segs=10):
    """Straight cylinder between two points (light-weight alternative to tube for frames)."""
    a, b = Vector(p0), Vector(p1)
    d = b - a
    obj = cyl(name, r, d.length, tuple((a + b) / 2), m, segs)
    obj.rotation_euler = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_euler()
    return obj

def cup(name, loc, m='ceramic_cream', h=0.07, r=0.035):
    return lathe(name, [(r * 0.8, 0), (r, 0.012), (r, h - 0.006), (r * 0.94, h), (r * 0.8, h - 0.002),
                        (r * 0.8, 0.014), (0.001, 0.015)], loc, m, 20)

def vase(name, loc, m='ceramic_sand', h=0.28, r=0.09):
    """Rounded bottle vase (solid)."""
    return lathe(name, [(r * 0.55, 0), (r * 0.9, h * 0.12), (r, h * 0.40), (r * 0.8, h * 0.70), (r * 0.42, h * 0.86),
                        (r * 0.40, h * 0.97), (r * 0.44, h), (0.001, h + 0.001)], loc, m, 28)

def bowl(name, loc, m='ceramic_cream', r=0.15, h=0.08):
    return lathe(name, [(r * 0.35, 0), (r * 0.8, h * 0.25), (r, h * 0.9), (r * 0.98, h), (r * 0.9, h - 0.006),
                        (r * 0.7, h * 0.35), (0.001, h * 0.3)], loc, m, 32)

# ----------------------------------------------------------------- seating
def mo_sofa(w=2.6, d=1.0, body='boucle_oat', seat='fabric_oat'):
    """Low modular sofa on a recessed oak plinth: soft rounded body, low arms, loose cushions."""
    aw = 0.24
    P = [plinth('plinth', w, d, 0.062, 0.05, 'oak_pale')]
    P.append(rbox('body', (w, d, 0.30), (0, 0, 0.21), body, r=0.05))
    P.append(rbox('back', (w - 0.004, 0.24, 0.42), (0, d / 2 - 0.12, 0.55), body, r=0.05))
    for s in (-1, 1):
        P.append(rbox('arm%d' % s, (aw, d - 0.23, 0.20), (s * (w / 2 - aw / 2 - 0.002), -0.115, 0.45), body, r=0.05))
    n = 3
    iw = w - 2 * aw
    cw = iw / n
    for i in range(n):
        x = -iw / 2 + cw / 2 + i * cw
        P.append(rbox('seat%d' % i, (cw - 0.02, d - 0.28, 0.12), (x, -0.13, 0.41), seat, r=0.04))
        P.append(rbox('cush%d' % i, (cw - 0.05, 0.16, 0.30), (x, d / 2 - 0.31, 0.61), seat, r=0.05, rot=(-0.16, 0, 0)))
    P.append(rbox('pillowA', (0.40, 0.13, 0.34), (-iw / 2 + 0.30, d / 2 - 0.42, 0.64), 'linen_sand', r=0.04, rot=(-0.25, 0, 0.10)))
    P.append(rbox('pillowB', (0.38, 0.13, 0.32), (iw / 2 - 0.32, d / 2 - 0.42, 0.63), 'velvet_sage', r=0.04, rot=(-0.25, 0, -0.08)))
    ax = -(w / 2 - aw / 2 - 0.002)
    P.append(rbox('throw', (aw + 0.04, 0.55, 0.035), (ax, -0.14, 0.565), 'knit_oat', r=0.015))
    P.append(rbox('throwdrop', (0.035, 0.50, 0.30), (-(w / 2 + 0.015), -0.14, 0.42), 'knit_oat', r=0.012))
    return P

def mo_chaise(w=0.85, d=1.65, body='boucle_oat', seat='fabric_oat'):
    """Chaise module continuing the sofa line (back at +Y)."""
    P = [plinth('plinth', w, d, 0.062, 0.05, 'oak_pale')]
    P.append(rbox('body', (w, d, 0.30), (0, 0, 0.21), body, r=0.05))
    P.append(rbox('back', (w - 0.004, 0.24, 0.42), (0, d / 2 - 0.12, 0.55), body, r=0.05))
    P.append(rbox('seat', (w - 0.04, d - 0.28, 0.12), (0, -0.13, 0.41), seat, r=0.04))
    P.append(rbox('cush', (w - 0.10, 0.16, 0.30), (0, d / 2 - 0.31, 0.61), seat, r=0.05, rot=(-0.16, 0, 0)))
    P.append(rbox('pillow', (0.38, 0.13, 0.32), (0.06, d / 2 - 0.44, 0.63), 'velvet_sage', r=0.04, rot=(-0.25, 0, -0.08)))
    return P

def mo_armchair(shell='boucle_cream', seat='fabric_oat'):
    """Curved barrel lounge chair on an oak ring base with four short round legs."""
    P = []
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append(cyl('leg', 0.022, 0.13, (sx * 0.24, sy * 0.24, 0.065), 'oak_pale', 14))
    P.append(torus('ring', 0.34, 0.03, (0, 0, 0.14), 'oak_pale', 48, 12, scale=(1, 1, 0.6)))
    P.append(cyl('seatbase', 0.37, 0.14, (0, 0, 0.225), shell, 40, bevel_w=0.04))
    P.append(rbox('cushion', (0.64, 0.60, 0.10), (0, -0.03, 0.34), seat, r=0.04))
    ang = math.radians(210)
    P.append(lathe_arc('back', [(0.37, 0.27), (0.375, 0.40), (0.37, 0.60), (0.35, 0.72)], ang, (0, 0, 0), shell, 28,
                       start=math.pi / 2 - ang / 2, thickness=0.05))
    P.append(rbox('lumbar', (0.40, 0.10, 0.24), (0, 0.22, 0.50), 'velvet_sage', r=0.035, rot=(-0.2, 0, 0)))
    return P

def mo_dining_chair(seat='fabric_oat'):
    """Oak frame: round tapered legs, three bent back slats wrapping the sitter, thin seat pad."""
    P = []
    for sx in (-1, 1):
        P.append(cyl('fleg', 0.013, 0.44, (sx * 0.20, -0.21, 0.22), 'oak_pale', 12, r2=0.019))
        P.append(cyl('rleg', 0.014, 0.80, (sx * 0.205, 0.22, 0.40), 'oak_pale', 12, r2=0.019))
        P.append(box('apron', (0.03, 0.40, 0.06), (sx * 0.20, 0.0, 0.412), 'oak_pale', 0.003))
    for sy in (-1, 1):
        P.append(box('apron', (0.38, 0.03, 0.06), (0, sy * 0.21, 0.412), 'oak_pale', 0.003))
    P.append(box('seat', (0.46, 0.50, 0.03), (0, 0, 0.455), 'oak_pale', 0.006))
    P.append(rbox('pad', (0.42, 0.44, 0.03), (0, -0.01, 0.483), seat, r=0.012))
    R = 0.46
    ang = 2 * math.asin(0.215 / R)
    cy = 0.22 - math.sqrt(R * R - 0.205 ** 2)
    for i, z in enumerate((0.55, 0.63, 0.71)):
        P.append(lathe_arc('slat%d' % i, [(R, z), (R, z + 0.055)], ang, (0, cy, 0), 'oak_pale', 16,
                           start=math.pi / 2 - ang / 2, thickness=0.016))
    return P

def mo_desk_chair(fabric='fabric_greige'):
    """Swivel task chair: black five-star base on castors, fabric seat/back, oak armrest caps."""
    P = [cyl('hub', 0.05, 0.03, (0, 0, 0.035), 'matte_black', 16)]
    for i in range(5):
        a = i * 2 * math.pi / 5 + math.pi / 2
        P.append(box('arm%d' % i, (0.26, 0.03, 0.02), (math.cos(a) * 0.13, math.sin(a) * 0.13, 0.03), 'matte_black', rot=(0, 0, a)))
        P.append(cyl('wheel%d' % i, 0.025, 0.02, (math.cos(a) * 0.245, math.sin(a) * 0.245, 0.025), 'matte_black', 12, rot=(0, math.pi / 2, a + math.pi / 2)))
    P.append(cyl('lift', 0.022, 0.30, (0, 0, 0.19), 'matte_black', 12))
    P.append(box('mech', (0.22, 0.22, 0.04), (0, 0, 0.362), 'matte_black', 0.005))
    P.append(rbox('seat', (0.50, 0.50, 0.08), (0, 0, 0.42), fabric, r=0.03))
    P.append(rbox('back', (0.46, 0.07, 0.42), (0, 0.22, 0.66), fabric, r=0.03, rot=(-0.12, 0, 0)))
    for s in (-1, 1):
        P.append(rod('armpost', (s * 0.25, 0.14, 0.42), (s * 0.25, 0.14, 0.62), 0.01))
        P.append(box('armcap', (0.05, 0.24, 0.02), (s * 0.25, 0.05, 0.63), 'oak_pale', 0.005))
    return P

def mo_bench(w=1.0):
    """Entry bench: oak slab legs and top, thin fabric pad."""
    P = [box('seat', (w, 0.40, 0.04), (0, 0, 0.40), 'oak_pale', 0.006)]
    for s in (-1, 1):
        P.append(box('leg', (0.04, 0.34, 0.384), (s * (w / 2 - 0.08), 0, 0.192), 'oak_pale', 0.004))
    P.append(box('rail', (w - 0.18, 0.04, 0.06), (0, 0.0, 0.352), 'oak_pale', 0.003))
    P.append(rbox('pad', (w - 0.06, 0.34, 0.05), (0, 0, 0.44), 'fabric_oat', r=0.02))
    return P

def mo_ottoman(r=0.30, h=0.40):
    """Round boucle pouf on an oak disc."""
    P = [cyl('disc', r - 0.04, 0.03, (0, 0, 0.015), 'oak_pale', 40)]
    P.append(lathe('pouf', [(r - 0.06, 0.028), (r - 0.01, 0.06), (r, 0.14), (r, 0.30), (r - 0.03, 0.37), (r - 0.10, 0.395), (0.001, h)], (0, 0, 0), 'boucle_oat', 40))
    P.append(torus('seam', r - 0.005, 0.006, (0, 0, 0.22), 'boucle_oat', 40, 8))
    return P

# ----------------------------------------------------------------- tables & storage
def mo_coffee_table():
    """Two round nesting tables: travertine top on an oak drum + ceramic drum side table, bowl on the big one."""
    bx, by = -0.185, 0.03
    P = [cyl('foot', 0.20, 0.012, (bx, by, 0.006), 'matte_black', 40)]
    P.append(cyl('base', 0.225, 0.27, (bx, by, 0.145), 'oak_pale', 40))
    P.append(cyl('top', 0.44, 0.04, (bx, by, 0.30), 'travertine', 64, bevel_w=0.006))
    P.append(bowl('bowl', (bx - 0.06, by + 0.05, 0.318), 'ceramic_cream', 0.12, 0.06))
    sx, sy = 0.404, -0.247
    P.append(lathe('drum', [(0.20, 0), (0.22, 0.02), (0.22, 0.39), (0.205, 0.415), (0.001, 0.42)], (sx, sy, 0), 'ceramic_sand', 40))
    return P

def mo_side_table(r=0.225, h=0.55):
    """Solid oak drum with a dark shadow line below the top."""
    P = [lathe('drum', [(r - 0.01, 0), (r, 0.012), (r, h - 0.05), (r - 0.012, h - 0.05), (r - 0.012, h - 0.035), (r, h - 0.035),
                        (r, h - 0.006), (r - 0.008, h), (0.001, h + 0.001)], (0, 0, 0), 'oak_pale', 48)]
    P.append(cyl('shadow', r - 0.010, 0.013, (0, 0, h - 0.0425), 'matte_black', 48))
    return P

def mo_dining_table(L=1.8, W=0.9):
    P = [box('top', (L, W, 0.02), (0, 0, 0.74), 'slab_white', 0.002, 1)]
    for s in (-1, 1):
        P.append(box('leg', (0.08, 0.70, 0.728), (s * (L / 2 - 0.20), 0, 0.364), 'oak_pale', 0.004))
    P.append(box('stretcher', (L - 0.46, 0.04, 0.06), (0, 0, 0.28), 'matte_black', 0.003))
    return P

def mo_sideboard(w=2.2, d=0.45, h=0.72, doors=4):
    """Handleless warm-white sideboard: dark door gaps, oak top, recessed oak plinth, squat vase."""
    bh = h - 0.06 - 0.025
    P = [plinth('plinth', w, d, 0.062, 0.05, 'oak_pale')]
    P.append(box('body', (w, d, bh), (0, 0, 0.06 + bh / 2), 'lacquer_warm_white', 0.004))
    P += grooves('gap', w, bh, (0, -d / 2 + 0.001, 0.06 + bh / 2), doors)
    P.append(box('top', (w + 0.02, d + 0.02, 0.025), (0, 0, h - 0.0125), 'oak_pale', 0.004))
    P.append(vase('vase', (w * 0.32, 0.0, h - 0.001), 'ceramic_sand', 0.065, 0.075))
    return P

def mo_media_wall(w=3.2, h=2.6):
    """Wall-hung: oak slat panel on a warm-white backing, floating cabinet with LED, TV, decor."""
    P = [box('backing', (w, 0.02, h), (0, -0.01, h / 2), 'lacquer_warm_white')]
    slats = []
    for i in range(40):
        x = -w / 2 + 0.04 + i * 0.08
        slats.append(box('slat%d' % i, (0.04, 0.022, h - 0.004), (x, -0.029, h / 2), 'oak_pale'))
    P.append(join(slats, 'slats'))
    cd, ch, cz = 0.36, 0.35, 0.40
    P.append(box('cabinet', (2.4, cd, ch), (0, -0.04 - cd / 2 + 0.002, cz + ch / 2), 'lacquer_warm_white', 0.005))
    P += grooves('gap', 2.4, ch, (0, -0.04 - cd + 0.003, cz + ch / 2), 3)
    P.append(box('cabled', (2.3, 0.02, 0.008), (0, -0.12, cz + 0.002), 'led'))
    P.append(box('bezel', (1.67, 0.03, 0.97), (0, -0.053, 1.55), 'matte_black', 0.004))
    P.append(box('screen', (1.65, 0.02, 0.95), (0, -0.062, 1.55), 'screen_black'))
    P.append(vase('vase', (-0.85, -0.22, cz + ch - 0.001), 'ceramic_sand', 0.24, 0.08))
    P.append(box('books', (0.24, 0.17, 0.05), (0.80, -0.20, cz + ch + 0.024), 'linen_sand', 0.003))
    P.append(box('book2', (0.20, 0.15, 0.03), (0.81, -0.21, cz + ch + 0.062), 'fabric_greige', 0.003))
    return P

def mo_nightstand(w=0.5):
    """Wall-hung floating oak box: origin on the wall plane at its bottom (place at z=450)."""
    P = [box('body', (w, 0.40, 0.196), (0, -0.20, 0.102), 'oak_pale', 0.005)]
    P.append(box('gap', (w - 0.03, 0.012, 0.004), (0, -0.40, 0.155), 'matte_black'))
    P.append(box('led', (w - 0.06, 0.02, 0.008), (0, -0.06, 0.004), 'led'))
    return P

def mo_dresser(w=1.2):
    """Floating oak vanity with a calacatta top: origin on the wall plane at its bottom (place at z=650)."""
    P = [box('body', (w, 0.45, 0.156), (0, -0.225, 0.082), 'oak_pale', 0.005)]
    P.append(box('top', (w + 0.02, 0.47, 0.02), (0, -0.235, 0.17), 'slab_white', 0.003))
    P += grooves('gap', w, 0.156, (0, -0.45, 0.082), 2)
    P.append(box('line', (w - 0.02, 0.012, 0.004), (0, -0.45, 0.13), 'matte_black'))
    P.append(box('led', (w - 0.08, 0.02, 0.008), (0, -0.06, 0.004), 'led'))
    return P

def mo_wardrobe(w=1.6, h=2.65, doors=3, panel=0.40):
    """Handleless warm-white wardrobe with an oak full-height end panel on the east side."""
    dw = w - panel
    zc = 0.06 + (h - 0.06) / 2
    P = [box('plinth', (w - 0.06, 0.52, 0.062), (0, 0.02, 0.031), 'matte_black')]
    P.append(box('body', (dw, 0.60, h - 0.06), (-panel / 2, 0, zc), 'lacquer_warm_white', 0.004))
    P += grooves('gap', dw, h - 0.06, (-panel / 2, -0.30 + 0.001, zc), doors)
    P.append(box('endpanel', (panel, 0.60, h - 0.06), (w / 2 - panel / 2, 0, zc), 'oak_pale', 0.004))
    P.append(box('seam', (0.004, 0.012, h - 0.06), (dw - w / 2, -0.30 + 0.001, zc), 'matte_black'))
    return P

def mo_desk(L=1.6, W=0.7):
    """Oak top on a thin black sled frame; cup and oak tray."""
    P = [box('top', (L, W, 0.03), (0, 0, 0.735), 'oak_pale', 0.005)]
    for s in (-1, 1):
        x = s * (L / 2 - 0.12)
        y0, y1 = -W / 2 + 0.05, W / 2 - 0.05
        P.append(rod('post', (x, y0, 0.0), (x, y0, 0.722), 0.012))
        P.append(rod('post', (x, y1, 0.0), (x, y1, 0.722), 0.012))
        P.append(rod('runner', (x, y0, 0.012), (x, y1, 0.012), 0.012))
        P.append(rod('toprail', (x, y0, 0.71), (x, y1, 0.71), 0.012))
    P.append(box('stretcher', (L - 0.26, 0.03, 0.03), (0, W / 2 - 0.05, 0.60), 'matte_black'))
    P.append(box('tray', (0.30, 0.20, 0.015), (0.45, 0.10, 0.7555), 'oak_veneer', 0.003))
    P.append(cup('cup', (0.30, -0.12, 0.749), 'ceramic_cream', 0.065, 0.034))
    return P

def mo_shelving(w=1.0, h=2.2, d=0.35, shelves=5):
    """Oak shelves on two black side ladders; books, vase, bowl and a small plant."""
    P = []
    zs = [0.10 + i * (h - 0.20) / (shelves - 1) for i in range(shelves)]
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append(box('post', (0.025, 0.025, h), (sx * (w / 2 - 0.0125), sy * (d / 2 - 0.0125), h / 2), 'matte_black'))
        for z in zs:
            P.append(box('rung', (0.025, d - 0.04, 0.025), (sx * (w / 2 - 0.0125), 0, z), 'matte_black'))
    rr = random.Random(5)
    for i, z in enumerate(zs):
        P.append(box('shelf%d' % i, (w - 0.03, d - 0.06, 0.03), (0, 0, z + 0.0255), 'oak_pale', 0.003))
        top = z + 0.0405
        if i in (0, 2):
            P.append(box('books%d' % i, (0.30 + rr.random() * 0.15, d - 0.16, 0.22), (-w / 2 + 0.25, 0.02, top + 0.108), 'books', 0.003))
        if i == 1:
            P.append(vase('vase', (w / 4, 0, top - 0.002), 'ceramic_sand', 0.26, 0.08))
        if i == 2:
            P.append(bowl('bowl', (w / 4 + 0.05, 0.02, top - 0.002), 'ceramic_cream', 0.09, 0.05))
        if i == 3:
            P.append(lathe('pot', [(0.06, 0), (0.075, 0.12), (0.001, 0.121)], (w / 4, 0, top - 0.002), 'ceramic_cream', 20))
            P.append(leaf_cloud('plant', (w / 4, 0, top + 0.20), 0.10, 60, 0.045, 'leaf_green', seed=3, flat=0.8))
    return P

def mo_platform(w=2.0, d=1.8, h=0.40):
    """Oak tatami platform with three drawer fronts, futon-style bedding on the west 1.5 m, tray and cup east."""
    P = [box('plinth', (w - 0.10, d - 0.10, 0.062), (0, 0, 0.031), 'matte_black')]
    P.append(box('body', (w, d, h - 0.06), (0, 0, 0.06 + (h - 0.06) / 2), 'oak_pale', 0.005))
    dh = h - 0.06 - 0.04
    P += grooves('gap', w, dh, (0, -d / 2 + 0.001, 0.06 + dh / 2), 3)
    P.append(box('line', (w - 0.004, 0.012, 0.004), (0, -d / 2 + 0.001, h - 0.04), 'matte_black'))
    fw, fl = 1.5, d - 0.14
    fx = -w / 2 + 0.04 + fw / 2
    P.append(rbox('mattress', (fw, fl, 0.10), (fx, 0, h + 0.048), 'linen_sand', r=0.03))
    P.append(rbox('duvet', (fw - 0.04, fl * 0.56, 0.06), (fx, -fl * 0.2, h + 0.125), 'fabric_greige', r=0.025))
    P.append(rbox('pillow', (0.62, 0.40, 0.09), (fx, fl / 2 - 0.26, h + 0.14), 'linen_rice', r=0.03))
    P.append(box('tray', (0.38, 0.26, 0.015), (w / 2 - 0.26, d / 2 - 0.30, h + 0.0055), 'oak_veneer', 0.003))
    P.append(cup('cup', (w / 2 - 0.30, d / 2 - 0.30, h + 0.012), 'ceramic_cream', 0.065, 0.032))
    return P

def mo_bed(w=1.8, L=2.1):
    """Low bed: oak plinth, oat upholstered base, wide rounded boucle headboard, linen bedding. Head at +Y."""
    P = [box('plinth', (w - 0.14, L - 0.30, 0.102), (0, -0.05, 0.051), 'oak_pale')]
    P.append(rbox('base', (w + 0.10, L - 0.10, 0.22), (0, -0.02, 0.21), 'fabric_oat', r=0.03))
    P.append(rbox('headboard', (w + 0.40, 0.14, 0.94), (0, L / 2 - 0.05, 0.53), 'boucle_oat', r=0.06))
    P.append(rbox('mattress', (w - 0.02, L - 0.24, 0.20), (0, -0.05, 0.42), 'linen_white', r=0.05))
    P.append(rbox('duvet', (w + 0.02, L * 0.60, 0.09), (0, -L / 2 + 0.05 + L * 0.30, 0.56), 'linen_white', r=0.04))
    P.append(rbox('fold', (w + 0.02, 0.20, 0.08), (0, -L / 2 + 0.05 + L * 0.60 - 0.05, 0.59), 'linen_white', r=0.04))
    P.append(rbox('throw', (w + 0.04, 0.50, 0.05), (0, -L / 2 + 0.40, 0.625), 'velvet_sage', r=0.02))
    n = 2 if w >= 1.5 else 1
    for i in range(n):
        x = 0 if n == 1 else (i - 0.5) * (w * 0.5)
        P.append(rbox('euro%d' % i, (0.60, 0.15, 0.55), (x, L / 2 - 0.22, 0.76), 'linen_sand', r=0.045, rot=(-0.18, 0, 0)))
        P.append(rbox('pillow%d' % i, (0.68, 0.17, 0.42), (x, L / 2 - 0.38, 0.70), 'linen_white', r=0.045, rot=(-0.26, 0, 0)))
    return P

def mo_bay_cushion(w=3.0, d=0.78):
    P = [rbox('pad', (w, d, 0.06), (0, 0, 0.03), 'linen_sand', r=0.02)]
    P.append(rbox('c1', (0.42, 0.13, 0.42), (-w * 0.3, d * 0.3, 0.25), 'velvet_sage', r=0.035, rot=(-0.3, 0, 0.15)))
    P.append(rbox('c2', (0.42, 0.13, 0.42), (w * 0.3, d * 0.3, 0.25), 'boucle_cream', r=0.035, rot=(-0.3, 0, -0.15)))
    P.append(rbox('c3', (0.36, 0.12, 0.36), (w * 0.3 - 0.22, d * 0.28, 0.22), 'linen_sand', r=0.035, rot=(-0.35, 0, -0.3)))
    return P

def mo_hook_rail(w=0.6):
    """Wall-hung oak rail with four black pegs, z 1.56-1.62."""
    P = [box('rail', (w, 0.02, 0.06), (0, -0.01, 1.59), 'oak_pale', 0.003)]
    for i in range(4):
        x = -w / 2 + 0.09 + i * (w - 0.18) / 3
        P.append(rod('peg', (x, -0.018, 1.585), (x, -0.075, 1.585), 0.006))
        P.append(sphere('tip', 0.009, (x, -0.078, 1.585), 'matte_black', 10))
    return P

# ----------------------------------------------------------------- kitchen (room-fitted)
def mo_kitchen_set(W=2.623, D=2.760):
    """Room coordinates (NW corner at origin, x 0..W, y 0..-D): warm-white handleless bases, oak uppers
    with LED, calacatta top + splashback, black plinth/hood/faucet/hob, cream sink, warm-white fridge column."""
    P = []
    bd, bh, th = 0.60, 0.88, 0.02
    fridge_w = 0.72
    north_len = W - fridge_w - 0.02
    rx = bd + 0.55
    rw = 0.60
    front = 'lacquer_warm_white'
    # west run (doors face east), sink under the window
    P.append(box('base_w', (bd, D - 0.02, bh - 0.08), (bd / 2, -D / 2, 0.08 + (bh - 0.08) / 2), front))
    P.append(box('plinth_w', (bd - 0.06, D - 0.02, 0.082), (bd / 2 - 0.03, -D / 2, 0.041), 'matte_black'))
    ny = -bd - 0.02
    nd = int(round((D - bd - 0.04) / 0.55))
    for i in range(1, nd):
        yy = ny - i * (D - bd - 0.04) / nd
        P.append(box('wgap%d' % i, (0.012, 0.004, bh - 0.08), (bd + 0.001, yy, 0.08 + (bh - 0.08) / 2), 'matte_black'))
    # north run split around the range
    for i, (x0, x1) in enumerate(((bd, rx - rw / 2), (rx + rw / 2, north_len))):
        cw = x1 - x0
        P.append(box('base_n%d' % i, (cw, bd, bh - 0.08), ((x0 + x1) / 2, -bd / 2, 0.08 + (bh - 0.08) / 2), front))
        P.append(box('plinth_n%d' % i, (cw, bd - 0.06, 0.082), ((x0 + x1) / 2, -bd / 2 + 0.03, 0.041), 'matte_black'))
        n = max(1, int(round(cw / 0.5)))
        P += grooves('ngap%d' % i, cw, bh - 0.08, ((x0 + x1) / 2, -bd - 0.001, 0.08 + (bh - 0.08) / 2), n)
    # worktop
    P.append(box('top_w', (bd + 0.03, D, th), ((bd + 0.03) / 2, -D / 2, bh + th / 2), 'slab_white', 0.003))
    P.append(box('endpanel', (bd + 0.03, 0.02, bh), ((bd + 0.03) / 2, -D + 0.01, bh / 2), 'slab_white', 0.003))
    for i, (x0, x1) in enumerate(((bd + 0.03, rx - rw / 2), (rx + rw / 2, north_len))):
        P.append(box('top_n%d' % i, (x1 - x0, bd + 0.03, th), ((x0 + x1) / 2, -(bd + 0.03) / 2, bh + th / 2), 'slab_white', 0.003))
    sink_y = -D * 0.55
    P.append(box('sink', (0.46, 0.42, 0.18), (bd / 2 + 0.02, sink_y, bh + th - 0.09 + 0.004), 'ceramic_cream'))
    P.append(tube('faucet', [(0.09, sink_y, bh + th), (0.09, sink_y, bh + th + 0.34), (0.30, sink_y, bh + th + 0.34), (0.32, sink_y, bh + th + 0.28)], 0.011, 'matte_black'))
    P.append(box('hob', (rw, bd - 0.10, 0.008), (rx, -bd / 2 - 0.02, bh + th + 0.004), 'screen_black'))
    for i, (dx, dy) in enumerate(((-0.15, -0.12), (0.15, -0.12), (-0.15, 0.12), (0.15, 0.12))):
        P.append(torus('ring%d' % i, 0.07, 0.003, (rx + dx, -bd / 2 - 0.02 + dy, bh + th + 0.009), 'matte_black', 24, 6))
    P.append(box('rangebody', (rw, bd - 0.02, bh - 0.08), (rx, -bd / 2 + 0.01, 0.08 + (bh - 0.08) / 2), front))
    P.append(box('ovendoor', (rw - 0.04, 0.015, 0.50), (rx, -bd - 0.008, 0.40), 'screen_black'))
    P.append(box('ovenhandle', (0.50, 0.025, 0.018), (rx, -bd - 0.035, 0.62), 'matte_black', 0.004))
    # splashback, oak uppers with LED underneath, integrated black hood
    uh, ud, uz = 0.72, 0.36, 1.50
    P.append(box('splash', (north_len, 0.015, uz - bh - th), (north_len / 2, -0.0115, bh + th + (uz - bh - th) / 2), 'slab_white'))
    P.append(box('upper', (north_len, ud, uh), (north_len / 2, -ud / 2, uz + uh / 2), 'oak_pale', 0.004))
    P += grooves('ugap', north_len, uh, (north_len / 2, -ud - 0.001, uz + uh / 2), 4)
    P.append(box('hood', (rw + 0.30, ud + 0.06, 0.06), (rx, -ud / 2 - 0.03, uz - 0.029), 'matte_black'))
    P.append(box('ledstrip', (north_len - 0.1, 0.02, 0.008), (north_len / 2, -ud + 0.05, uz - 0.002), 'led'))
    # fridge column at the east end
    fx = W - fridge_w / 2 - 0.01
    P.append(box('fridge', (fridge_w, 0.62, 2.22), (fx, -0.31, 1.11), front, 0.004))
    P.append(box('fgap', (fridge_w - 0.02, 0.012, 0.004), (fx, -0.62, 1.55), 'matte_black'))
    P.append(box('fgap2', (fridge_w - 0.02, 0.012, 0.004), (fx, -0.62, 0.70), 'matte_black'))
    # decor
    P.append(lathe('kettle', [(0.06, 0), (0.09, 0.02), (0.08, 0.12), (0.03, 0.16), (0.04, 0.18), (0.001, 0.181)], (north_len - 0.35, -0.35, bh + th), 'matte_black', 20))
    P.append(box('board', (0.02, 0.28, 0.40), (0.34, -1.25, bh + th + 0.2), 'oak_pale', 0.004))
    P.append(bowl('bowl', (bd + 0.4, -0.30, bh + th), 'ceramic_sand', 0.15, 0.075))
    return P

# ----------------------------------------------------------------- bathroom
def mo_vanity(w=0.9):
    """Wall-hung: origin on the wall plane at the cabinet bottom (place at z=550)."""
    P = [box('body', (w, 0.50, 0.296), (0, -0.25, 0.152), 'oak_pale', 0.005)]
    P += grooves('gap', w, 0.296, (0, -0.50, 0.152), 2)
    P.append(box('top', (w + 0.02, 0.52, 0.02), (0, -0.26, 0.31), 'slab_white', 0.003))
    P.append(lathe('basin', [(0.12, 0.318), (0.19, 0.33), (0.20, 0.42), (0.19, 0.45), (0.17, 0.45), (0.17, 0.44), (0.15, 0.35), (0.001, 0.34)], (0, -0.27, 0), 'ceramic_cream', 32))
    P.append(tube('spout', [(0, 0, 0.62), (0, -0.22, 0.62), (0, -0.25, 0.58)], 0.011, 'matte_black'))
    P.append(cyl('mixer', 0.025, 0.02, (0, -0.01, 0.62), 'matte_black', 16, rot=(math.pi / 2, 0, 0)))
    P.append(box('led', (w - 0.06, 0.02, 0.008), (0, -0.06, 0.004), 'led'))
    return P

# ----------------------------------------------------------------- wall pieces
def mo_mirror_round(dia=0.7):
    R = dia / 2
    P = [torus('ring', R, 0.008, (0, -0.012, R + 0.008), 'matte_black', 56, 8, rot=(math.pi / 2, 0, 0))]
    P.append(cyl('glass', R - 0.003, 0.006, (0, -0.012, R + 0.008), 'mirror', 56, rot=(math.pi / 2, 0, 0)))
    P.append(cyl('back', R - 0.02, 0.01, (0, -0.005, R + 0.008), 'matte_black', 32, rot=(math.pi / 2, 0, 0)))
    return P

def mo_mirror_full(w=0.6, h=1.8):
    """Oak-framed leaning mirror, tilted 6 degrees back against the wall."""
    tilt = math.radians(-6)
    P = [box('frame', (w, 0.04, h), (0, 0.0, h / 2), 'oak_pale', 0.004, rot=(tilt, 0, 0))]
    P.append(box('glass', (w - 0.06, 0.006, h - 0.06), (0, -0.021, h / 2), 'mirror', rot=(tilt, 0, 0)))
    return P

def mo_art(w=1.2, h=0.9):
    """Thin oak frame with a recessed canvas (mesh + material 'canvas' get generated art in the app)."""
    P = [panel_frame('frame', w, h, (0, -0.01, h / 2), 'oak_pale', bar=0.02, depth=0.02)]
    P.append(box('canvas', (w - 0.02, 0.008, h - 0.02), (0, -0.008, h / 2), 'canvas'))
    return P

# ----------------------------------------------------------------- lighting (ceiling: z 0 = lowest point)
def mo_pendant_linear(L=1.2, H=0.50):
    P = [box('led', (L - 0.08, 0.03, 0.008), (0, 0, 0.004), 'led')]
    P.append(box('diffuser', (L - 0.02, 0.05, 0.058), (0, 0, 0.033), 'acrylic_white'))
    P.append(box('bar', (L, 0.06, 0.04), (0, 0, 0.08), 'matte_black', 0.004))
    for s in (-1, 1):
        P.append(cyl('cord', 0.002, H - 0.12, (s * L * 0.35, 0, 0.10 + (H - 0.12) / 2), 'matte_black', 6))
    P.append(cyl('canopy', 0.05, 0.02, (0, 0, H - 0.01), 'matte_black', 24))
    return P

def mo_pendant_disc(r=0.225, H=0.60):
    P = [cyl('led', r - 0.04, 0.008, (0, 0, 0.004), 'led', 40)]
    P.append(cyl('disc', r, 0.04, (0, 0, 0.024), 'matte_white', 56, bevel_w=0.006))
    P.append(cyl('cord', 0.002, H - 0.064, (0, 0, 0.044 + (H - 0.064) / 2), 'matte_black', 6))
    P.append(cyl('canopy', 0.045, 0.02, (0, 0, H - 0.01), 'matte_white', 24))
    return P

def mo_spot_track(L=0.8):
    P = [box('track', (L, 0.05, 0.03), (0, 0, 0.105), 'matte_black')]
    for i in range(3):
        x = -L / 2 + L / 6 + i * L / 3
        t = 0.35 * (i - 1)
        P.append(cyl('spot%d' % i, 0.026, 0.085, (x, 0, 0.053), 'matte_black', 20, rot=(t, 0, 0)))
        P.append(cyl('lens%d' % i, 0.020, 0.006, (x, 0.0455 * math.sin(t), 0.053 - 0.0455 * math.cos(t)), 'led', 16, rot=(t, 0, 0)))
    return P

def mo_flush_slim(r=0.15):
    P = [cyl('led', r - 0.03, 0.01, (0, 0, 0.005), 'led', 32)]
    P.append(cyl('ring', r, 0.044, (0, 0, 0.028), 'matte_white', 48, bevel_w=0.006))
    return P

def mo_floor_lamp():
    P = [cyl('base', 0.14, 0.012, (0, 0, 0.006), 'matte_black', 32)]
    P.append(cyl('stem', 0.010, 1.30, (0, 0, 0.66), 'matte_black', 12))
    P.append(cyl('socket', 0.012, 0.05, (0, 0, 1.335), 'matte_black', 12))
    P.append(sphere('bulb', 0.03, (0, 0, 1.40), 'bulb', 14, scale=(1, 1, 1.4)))
    P.append(lathe_arc('shade', [(0.175, 1.27), (0.175, 1.55)], 2 * math.pi, (0, 0, 0), 'linen_sand', 40, thickness=0.004))
    return P

def mo_table_lamp():
    P = [lathe('base', [(0.07, 0), (0.09, 0.02), (0.085, 0.12), (0.05, 0.20), (0.035, 0.24), (0.03, 0.26), (0.001, 0.261)], (0, 0, 0), 'ceramic_sand', 28)]
    P.append(cyl('stem', 0.008, 0.10, (0, 0, 0.30), 'matte_black', 10))
    P.append(sphere('bulb', 0.025, (0, 0, 0.39), 'bulb', 12, scale=(1, 1, 1.4)))
    P.append(lathe_arc('shade', [(0.15, 0.30), (0.15, 0.48)], 2 * math.pi, (0, 0, 0), 'linen_rice', 36, thickness=0.004))
    return P

# ----------------------------------------------------------------- plants, outdoor & decor
def mo_planter_fig():
    P = [lathe('pot', [(0.19, 0), (0.215, 0.02), (0.225, 0.40), (0.225, 0.45), (0.20, 0.45), (0.20, 0.40), (0.001, 0.401)], (0, 0, 0), 'ceramic_cream', 36)]
    P.append(cyl('soil', 0.195, 0.02, (0, 0, 0.412), 'soil', 24))
    P.append(tube('trunk', [(0, 0, 0.40), (0.02, 0.01, 0.85), (-0.01, 0.03, 1.2), (0.02, -0.02, 1.55)], 0.018, 'trunk'))
    rr = random.Random(11)
    leaves = []
    for i in range(24):
        z = 0.70 + i * 0.034 + rr.random() * 0.03
        a = rr.random() * 2 * math.pi
        L = 0.24 + rr.random() * 0.12
        leaves.append(leaf('leaf%d' % i, L, L * 0.62, (math.cos(a) * 0.03, math.sin(a) * 0.03, z), (0, -0.35 - rr.random() * 0.4, a), 'leaf_green', 0.5, 6))
    P.append(join(leaves, 'leaves'))
    return P

def mo_plant_small():
    P = [lathe('pot', [(0.09, 0), (0.10, 0.01), (0.12, 0.16), (0.125, 0.17), (0.105, 0.17), (0.105, 0.13), (0.001, 0.131)], (0, 0, 0), 'ceramic_sand', 24)]
    P.append(cyl('soil', 0.10, 0.015, (0, 0, 0.14), 'soil', 20))
    P.append(leaf_cloud('foliage', (0, 0, 0.24), 0.085, 70, 0.04, 'leaf_green', seed=5, flat=0.75))
    return P

def mo_vase():
    """Sand ceramic bottle vase with three dried stems and small linen-coloured tufts."""
    P = [vase('vase', (0, 0, 0), 'ceramic_sand', 0.32, 0.09)]
    for i, top in enumerate((0.58, 0.68, 0.76)):
        a = i * 2.1 + 0.4
        dx, dy = math.cos(a) * 0.07, math.sin(a) * 0.07
        P.append(tube('stem%d' % i, [(0, 0, 0.28), (dx * 0.5, dy * 0.5, 0.50), (dx, dy, top)], 0.004, 'trunk'))
        P.append(leaf_cloud('tuft%d' % i, (dx, dy, top + 0.02), 0.045, 18, 0.03, 'linen_sand', seed=7 + i, flat=0.9))
    return P

def mo_bowl():
    return [bowl('bowl', (0, 0, 0), 'ceramic_cream', 0.15, 0.08)]

def mo_books():
    P = []
    z = 0
    rr = random.Random(6)
    for i, m in enumerate(('linen_sand', 'fabric_greige', 'leather_camel')):
        h = 0.03 + rr.random() * 0.02
        P.append(box('book%d' % i, (0.25 - i * 0.02, 0.18 - i * 0.01, h), (rr.random() * 0.02, rr.random() * 0.02, z + h / 2 - (0.002 if i else 0)), m, 0.003, rot=(0, 0, (rr.random() - 0.5) * 0.2)))
        z += h
    return P

def mo_lounge_outdoor():
    """Outdoor lounge chair: oak slat seat and back on a slim black frame, oat cushions."""
    P = []
    for s in (-1, 1):
        x = s * 0.31
        P.append(rod('front', (x, -0.40, 0.0), (x, -0.40, 0.36), 0.012))
        P.append(rod('seatrail', (x, -0.40, 0.36), (x, 0.28, 0.36), 0.012))
        P.append(rod('backrail', (x, 0.28, 0.36), (x, 0.40, 0.74), 0.012))
        P.append(rod('rear', (x, 0.40, 0.74), (x, 0.40, 0.0), 0.012))
        P.append(rod('runner', (x, -0.40, 0.012), (x, 0.40, 0.012), 0.012))
    for i in range(7):
        P.append(box('slat%d' % i, (0.60, 0.07, 0.02), (0, -0.34 + i * 0.10, 0.375), 'oak_pale', 0.003))
    lean = math.atan2(0.12, 0.38)
    for i in range(4):
        t = 0.15 + i * 0.23
        y, z = 0.28 + 0.12 * t, 0.36 + 0.38 * t
        P.append(box('bslat%d' % i, (0.60, 0.02, 0.07), (0, y - 0.014, z + 0.004), 'oak_pale', 0.003, rot=(-lean, 0, 0)))
    P.append(rbox('cushion', (0.58, 0.66, 0.06), (0, -0.03, 0.415), 'fabric_oat', r=0.02))
    P.append(rbox('backcush', (0.56, 0.06, 0.34), (0, 0.297, 0.5635), 'fabric_oat', r=0.02, rot=(-lean, 0, 0)))
    return P

def mo_outdoor_table():
    P = [cyl('top', 0.25, 0.02, (0, 0, 0.44), 'matte_black', 40, bevel_w=0.004)]
    P.append(cyl('stem', 0.025, 0.424, (0, 0, 0.222), 'matte_black', 16))
    P.append(cyl('foot', 0.18, 0.012, (0, 0, 0.006), 'matte_black', 32))
    return P

def mo_planter_grass(w=0.9):
    P = [box('trough', (w, 0.30, 0.34), (0, 0, 0.17), 'ceramic_sand', 0.008)]
    P.append(box('soil', (w - 0.04, 0.26, 0.02), (0, 0, 0.335), 'soil'))
    rr = random.Random(12)
    blades = []
    for i in range(64):
        x = -w / 2 + 0.06 + rr.random() * (w - 0.12)
        y = -0.09 + rr.random() * 0.18
        L = 0.22 + rr.random() * 0.22
        blades.append(leaf('blade%d' % i, L, 0.016, (x, y, 0.34), (0, -math.radians(78 + rr.random() * 12), rr.random() * 6.28), 'leaf_olive', 0.6, 4))
    P.append(join(blades, 'grass'))
    return P

# ----------------------------------------------------------------- registry
ASSETS_MODERN = {
    'mo_sofa': lambda: mo_sofa(),
    'mo_chaise': lambda: mo_chaise(),
    'mo_armchair': lambda: mo_armchair(),
    'mo_dining_chair': lambda: mo_dining_chair(),
    'mo_desk_chair': lambda: mo_desk_chair(),
    'mo_bench': lambda: mo_bench(),
    'mo_ottoman': lambda: mo_ottoman(),
    'mo_coffee_table': lambda: mo_coffee_table(),
    'mo_side_table': lambda: mo_side_table(),
    'mo_dining_table': lambda: mo_dining_table(),
    'mo_sideboard': lambda: mo_sideboard(),
    'mo_console': lambda: mo_sideboard(1.4, 0.40, 0.72, 3),
    'mo_media_wall': lambda: mo_media_wall(),
    'mo_nightstand': lambda: mo_nightstand(),
    'mo_dresser': lambda: mo_dresser(),
    'mo_wardrobe': lambda: mo_wardrobe(),
    'mo_wardrobe_wide': lambda: mo_wardrobe(2.2, 2.65, 4),
    'mo_desk': lambda: mo_desk(),
    'mo_shelving': lambda: mo_shelving(),
    'mo_platform': lambda: mo_platform(),
    'mo_bed_queen': lambda: mo_bed(1.8, 2.1),
    'mo_bed_double': lambda: mo_bed(1.5, 2.0),
    'mo_bay_cushion': lambda: mo_bay_cushion(),
    'mo_hook_rail': lambda: mo_hook_rail(),
    'mo_kitchen_set': lambda: mo_kitchen_set(),
    'mo_vanity': lambda: mo_vanity(),
    'mo_vanity_wide': lambda: mo_vanity(1.1),
    'mo_mirror_round': lambda: mo_mirror_round(),
    'mo_mirror_full': lambda: mo_mirror_full(),
    'mo_pendant_linear': lambda: mo_pendant_linear(),
    'mo_pendant_disc': lambda: mo_pendant_disc(),
    'mo_spot_track': lambda: mo_spot_track(),
    'mo_flush_slim': lambda: mo_flush_slim(),
    'mo_floor_lamp': lambda: mo_floor_lamp(),
    'mo_table_lamp': lambda: mo_table_lamp(),
    'mo_art_large': lambda: mo_art(1.2, 0.9),
    'mo_art_tall': lambda: mo_art(0.8, 1.0),
    'mo_art_small': lambda: mo_art(0.5, 0.6),
    'mo_planter_fig': lambda: mo_planter_fig(),
    'mo_plant_small': lambda: mo_plant_small(),
    'mo_vase': lambda: mo_vase(),
    'mo_bowl': lambda: mo_bowl(),
    'mo_books': lambda: mo_books(),
    'mo_lounge_outdoor': lambda: mo_lounge_outdoor(),
    'mo_outdoor_table': lambda: mo_outdoor_table(),
    'mo_planter_grass': lambda: mo_planter_grass(),
}
