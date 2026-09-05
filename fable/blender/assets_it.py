"""Italian contemporary-luxury (意式轻奢) furniture, lighting and fittings.
Same conventions as assets.py: metres, front faces -Y, origin at the floor
centre (wall-hung pieces: origin on the wall plane at the piece's bottom)."""
import math, random
from mathutils import Vector
from lib import (box, rbox, cyl, sphere, torus, lathe, lathe_arc, tube, extrude_shape, leaf,
                 join, mesh_from_bm, bevel, shade_smooth)
from assets import leaf_cloud, bead_chain
import bmesh, bpy

# ----------------------------------------------------------------- helpers
def grooves(name, w, h, loc, n, m='matte_black', vertical=True, depth=0.012, width=0.004, rot=(0, 0, 0)):
    """Thin dark lines that read as panel gaps on a flush front. loc = centre of the front (face -Y)."""
    P = []
    for i in range(1, n):
        if vertical:
            x = -w / 2 + i * w / n
            P.append(box('%s%d' % (name, i), (width, depth, h), (loc[0] + x, loc[1], loc[2]), m))
        else:
            z = -h / 2 + i * h / n
            P.append(box('%s%d' % (name, i), (w, depth, width), (loc[0], loc[1], loc[2] + z), m))
    return P

def plinth(name, w, d, h=0.06, inset=0.05, m='matte_black'):
    return box(name, (w - 2 * inset, d - 2 * inset, h), (0, 0, h / 2), m)

# ----------------------------------------------------------------- seating
def it_sofa(w=2.6, d=1.0, chaise=False, fabric='fabric_charcoal'):
    P = [plinth('plinth', w, d, 0.09, 0.05)]
    P.append(rbox('body', (w, d, 0.30), (0, 0, 0.24), fabric, r=0.04))
    P.append(rbox('back', (w, 0.22, 0.34), (0, d / 2 - 0.11, 0.56), fabric, r=0.05))
    P.append(box('backtrim', (w, 0.03, 0.02), (0, d / 2 - 0.015, 0.74), 'champagne', 0.003))
    n = 3
    cw = w / n
    for i in range(n):
        x = -w / 2 + cw / 2 + i * cw
        P.append(rbox('seat%d' % i, (cw - 0.02, d - 0.24, 0.12), (x, -0.11, 0.45), fabric, r=0.04))
        P.append(rbox('cush%d' % i, (cw - 0.06, 0.16, 0.36), (x, d / 2 - 0.30, 0.68), fabric, r=0.05, rot=(-0.16, 0, 0)))
    if chaise:
        cx = w / 2 - cw / 2
        P.append(box('cplinth', (cw - 0.10, 0.60, 0.09), (cx, -d / 2 - 0.30, 0.045), 'matte_black'))
        P.append(rbox('cbody', (cw - 0.02, 0.66, 0.30), (cx, -d / 2 - 0.30, 0.24), fabric, r=0.04))
        P.append(rbox('cseat', (cw - 0.04, 0.60, 0.12), (cx, -d / 2 - 0.30, 0.45), fabric, r=0.04))
    P.append(rbox('pillowA', (0.50, 0.14, 0.50), (-w / 2 + 0.45, d / 2 - 0.42, 0.72), 'linen_grey', r=0.04, rot=(-0.22, 0, 0.08)))
    P.append(rbox('pillowB', (0.45, 0.14, 0.45), (0.15, d / 2 - 0.42, 0.70), 'linen_white', r=0.04, rot=(-0.22, 0, -0.06)))
    P.append(rbox('throw', (0.55, 0.62, 0.05), (w / 2 - 0.40, -0.10, 0.54), 'knit_grey', r=0.02, rot=(0, 0, 0.12)))
    P.append(rbox('throwdrop', (0.42, 0.06, 0.30), (w / 2 - 0.40, -d / 2 + 0.02, 0.36), 'knit_grey', r=0.02))
    return P

def it_chaise(w=0.85, d=1.65, fabric='fabric_charcoal'):
    """Chaise module that continues the sofa line (back at +Y like the sofa)."""
    P = [box('plinth', (w - 0.10, d - 0.10, 0.09), (0, 0, 0.045), 'matte_black')]
    P.append(rbox('body', (w, d, 0.30), (0, 0, 0.24), fabric, r=0.04))
    P.append(rbox('seat', (w - 0.04, d - 0.28, 0.12), (0, -0.12, 0.45), fabric, r=0.04))
    P.append(rbox('back', (w, 0.22, 0.34), (0, d / 2 - 0.11, 0.56), fabric, r=0.05))
    P.append(box('backtrim', (w, 0.03, 0.02), (0, d / 2 - 0.015, 0.74), 'champagne', 0.003))
    P.append(rbox('cush', (w - 0.08, 0.16, 0.36), (0, d / 2 - 0.30, 0.68), fabric, r=0.05, rot=(-0.16, 0, 0)))
    return P

def it_ottoman(w=1.0):
    P = [box('plinth', (w - 0.12, w - 0.12, 0.05), (0, 0, 0.025), 'matte_black')]
    P.append(rbox('body', (w, w, 0.36), (0, 0, 0.24), 'velvet_forest', r=0.09, segs=6))
    # tufting: a grid of gentle dimples read as small dark spheres pressed into the top
    for i in range(3):
        for j in range(3):
            P.append(sphere('tuft%d%d' % (i, j), 0.018, (-w / 3 + i * w / 3, -w / 3 + j * w / 3, 0.41), 'velvet_forest', 10))
    return P

def it_armchair(fabric='boucle_oat'):
    P = [cyl('disc', 0.30, 0.02, (0, 0, 0.01), 'matte_black', 40)]
    P.append(cyl('stem', 0.035, 0.14, (0, 0, 0.09), 'matte_black', 16))
    P.append(cyl('seatbase', 0.40, 0.12, (0, 0, 0.22), fabric, 40, bevel_w=0.04))
    P.append(rbox('cushion', (0.70, 0.66, 0.11), (0, -0.02, 0.335), fabric, r=0.04))
    back = lathe_arc('back', [(0.42, 0.28), (0.43, 0.36), (0.42, 0.62), (0.40, 0.72)], math.radians(210), (0, 0, 0), fabric, 28, start=math.radians(165), thickness=0.05)
    P.append(back)
    P.append(rbox('lumbar', (0.42, 0.12, 0.30), (0, 0.24, 0.52), 'velvet_olive', r=0.035, rot=(-0.2, 0, 0)))
    return P

def it_dining_chair(fabric='velvet_forest'):
    P = [rbox('seat', (0.48, 0.48, 0.08), (0, 0, 0.46), fabric, r=0.03)]
    P.append(box('seatpan', (0.46, 0.46, 0.02), (0, 0, 0.41), 'matte_black'))
    back = lathe_arc('back', [(0.25, 0.0), (0.26, 0.10), (0.25, 0.30)], math.radians(190), (0, 0.02, 0.50), fabric, 24, start=math.radians(175), thickness=0.04)
    P.append(back)
    for s in (-1, 1):
        P.append(cyl('post', 0.009, 0.10, (s * 0.16, 0.20, 0.47), 'matte_black', 10))
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append(cyl('leg', 0.011, 0.41, (sx * 0.20, sy * 0.19, 0.205), 'matte_black', 10, rot=(sy * 0.05, -sx * 0.05, 0)))
    return P

def it_desk_chair():
    P = [cyl('base', 0.30, 0.015, (0, 0, 0.008), 'matte_black', 5)]
    for i in range(5):
        a = i * 2 * math.pi / 5
        P.append(box('arm%d' % i, (0.30, 0.03, 0.02), (math.cos(a) * 0.15, math.sin(a) * 0.15, 0.02), 'matte_black', rot=(0, 0, a)))
        P.append(cyl('wheel%d' % i, 0.025, 0.02, (math.cos(a) * 0.29, math.sin(a) * 0.29, 0.025), 'matte_black', 12, rot=(0, math.pi / 2, a)))
    P.append(cyl('lift', 0.025, 0.30, (0, 0, 0.18), 'chrome', 12))
    P.append(rbox('seat', (0.50, 0.50, 0.08), (0, 0, 0.44), 'leather_black', r=0.03))
    P.append(rbox('back', (0.46, 0.08, 0.46), (0, 0.22, 0.72), 'leather_black', r=0.03, rot=(-0.12, 0, 0)))
    for s in (-1, 1):
        P.append(tube('armrest%d' % s, [(s * 0.24, 0.10, 0.44), (s * 0.24, 0.10, 0.62), (s * 0.24, -0.12, 0.64)], 0.012, 'matte_black'))
    return P

def it_bench(w=1.0):
    P = [rbox('seat', (w, 0.40, 0.09), (0, 0, 0.415), 'leather_tan', r=0.03)]
    for s in (-1, 1):
        P.append(tube('leg%d' % s, [(s * (w / 2 - 0.10), -0.17, 0), (s * (w / 2 - 0.10), -0.17, 0.37), (s * (w / 2 - 0.10), 0.17, 0.37), (s * (w / 2 - 0.10), 0.17, 0)], 0.012, 'matte_black'))
    return P

def it_lounge_outdoor():
    P = []
    for s in (-1, 1):
        P.append(tube('frame%d' % s, [(s * 0.32, -0.42, 0.0), (s * 0.32, -0.42, 0.34), (s * 0.32, 0.30, 0.34), (s * 0.32, 0.42, 0.72), (s * 0.32, 0.42, 0.0)], 0.014, 'matte_black'))
    for i in range(7):
        P.append(box('slat%d' % i, (0.62, 0.07, 0.02), (0, -0.36 + i * 0.11, 0.35), 'teak', 0.003))
    for i in range(4):
        P.append(box('bslat%d' % i, (0.62, 0.02, 0.07), (0, 0.33 + i * 0.03, 0.42 + i * 0.09), 'teak', 0.003))
    P.append(rbox('cushion', (0.60, 0.70, 0.06), (0, -0.02, 0.39), 'fabric_taupe', r=0.02))
    P.append(rbox('backcush', (0.58, 0.06, 0.34), (0, 0.30, 0.60), 'fabric_taupe', r=0.02, rot=(-0.3, 0, 0)))
    return P

# ----------------------------------------------------------------- tables & storage
def it_coffee_table_set():
    P = [cyl('top', 0.45, 0.03, (0, 0, 0.305), 'calacatta', 56, bevel_w=0.005)]
    P.append(torus('rim', 0.45, 0.012, (0, 0, 0.30), 'champagne', 56, 10))
    P.append(cyl('base', 0.30, 0.28, (0, 0, 0.14), 'lacquer_charcoal', 40))
    P.append(lathe('tray', [(0.001, 0.32), (0.14, 0.32), (0.14, 0.40), (0.135, 0.40), (0.135, 0.33), (0.001, 0.33)], (-0.12, 0.05, 0), 'champagne', 40))
    P.append(cyl('glass', 0.12, 0.006, (-0.12, 0.05, 0.403), 'smoked_glass', 40))
    P.append(lathe('drum2', [(0.25, 0), (0.275, 0.02), (0.275, 0.40), (0.26, 0.42), (0.001, 0.42)], (0.62, -0.18, 0), 'marble_black', 40))
    P.append(sphere('apple', 0.04, (0.25, -0.05, 0.36), 'leaf_green', 14))
    return P

def it_side_table():
    P = [cyl('top', 0.225, 0.02, (0, 0, 0.54), 'marble_black', 40, bevel_w=0.004)]
    P.append(cyl('stem', 0.03, 0.51, (0, 0, 0.27), 'matte_black', 16))
    P.append(cyl('foot', 0.16, 0.015, (0, 0, 0.0075), 'matte_black', 32))
    return P

def it_dining_table(L=1.8, W=0.9):
    P = [box('top', (L, W, 0.04), (0, 0, 0.73), 'marble_black', 0.006)]
    P.append(box('edge', (L, W, 0.06), (0, 0, 0.68), 'lacquer_charcoal', 0.004))
    P.append(box('plinth', (L * 0.55, W * 0.5, 0.65), (0, 0, 0.325), 'lacquer_charcoal', 0.004))
    P.append(box('foot', (L * 0.60, W * 0.55, 0.03), (0, 0, 0.015), 'champagne', 0.003))
    return P

def it_sideboard(w=2.2, d=0.45, h=0.70, doors=4, front='lacquer_charcoal'):
    P = [plinth('plinth', w, d, 0.07, 0.04)]
    P.append(box('body', (w, d, h - 0.09), (0, 0, 0.07 + (h - 0.09) / 2), front, 0.004))
    P.append(box('top', (w + 0.02, d + 0.02, 0.02), (0, 0, h - 0.01), 'marble_grey', 0.004))
    P += grooves('gap', w, h - 0.09, (0, -d / 2 + 0.001, 0.07 + (h - 0.09) / 2), doors, m='champagne', width=0.003)
    P.append(box('line', (w, 0.012, 0.004), (0, -d / 2 + 0.001, h - 0.02 - 0.25), 'champagne'))
    return P

def it_nightstand(w=0.6):
    """Wall-hung box, origin on the wall plane at its bottom."""
    P = [box('body', (w, 0.40, 0.20), (0, -0.20, 0.10), 'walnut', 0.005)]
    P.append(box('gap', (w - 0.02, 0.012, 0.004), (0, -0.40, 0.10), 'matte_black'))
    P.append(box('led', (w - 0.04, 0.02, 0.006), (0, -0.05, 0.003), 'led'))
    return P

def it_dresser(w=1.2):
    """Floating vanity: origin on the wall plane at its bottom (place at z=650)."""
    P = [box('body', (w, 0.45, 0.16), (0, -0.225, 0.08), 'walnut', 0.005)]
    P.append(box('top', (w + 0.02, 0.47, 0.02), (0, -0.235, 0.17), 'marble_grey', 0.004))
    P += grooves('gap', w, 0.16, (0, -0.45, 0.08), 2)
    return P

def it_wardrobe(w=1.6, h=2.65, doors=3, front='lacquer_charcoal'):
    P = [box('plinth', (w - 0.06, 0.52, 0.06), (0, 0.02, 0.03), 'matte_black')]
    P.append(box('body', (w, 0.60, h - 0.06), (0, 0, 0.06 + (h - 0.06) / 2), front, 0.004))
    P += grooves('gap', w, h - 0.06, (0, -0.30 + 0.001, 0.06 + (h - 0.06) / 2), doors, m='champagne', width=0.003)
    P.append(box('line', (w, 0.012, 0.004), (0, -0.30 + 0.001, 0.06 + (h - 0.06) * 0.62), 'champagne'))
    return P

def it_desk(L=1.6, W=0.7):
    P = [box('top', (L, W, 0.04), (0, 0, 0.73), 'walnut', 0.006)]
    P.append(box('pad', (0.70, 0.45, 0.005), (0, -0.02, 0.7525), 'leather_black'))
    for s in (-1, 1):
        P.append(tube('sled%d' % s, [(s * (L / 2 - 0.12), -W / 2 + 0.05, 0.0), (s * (L / 2 - 0.12), -W / 2 + 0.05, 0.71), (s * (L / 2 - 0.12), W / 2 - 0.05, 0.71), (s * (L / 2 - 0.12), W / 2 - 0.05, 0.0)], 0.015, 'matte_black'))
    P.append(box('stretcher', (L - 0.28, 0.03, 0.03), (0, W / 2 - 0.05, 0.60), 'matte_black'))
    return P

def it_shelving(w=1.0, h=2.2, d=0.35, shelves=5):
    P = []
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append(box('post', (0.025, 0.025, h), (sx * (w / 2 - 0.0125), sy * (d / 2 - 0.0125), h / 2), 'matte_black'))
    gap = (h - 0.10) / shelves
    rr = random.Random(5)
    for i in range(shelves + 1):
        z = 0.08 + i * gap
        if z > h - 0.02:
            break
        P.append(box('shelf%d' % i, (w - 0.04, d - 0.04, 0.03), (0, 0, z), 'walnut', 0.003))
        if i < shelves and i % 2 == 0:
            P.append(box('books%d' % i, (0.30 + rr.random() * 0.2, d - 0.14, gap * 0.55), (-w / 2 + 0.25, 0.02, z + 0.015 + gap * 0.275), 'books'))
        if i == 1:
            P.append(lathe('vase', [(0.05, 0), (0.09, 0.06), (0.06, 0.18), (0.04, 0.26), (0.001, 0.26)], (w / 4, 0, z + 0.015), 'ceramic_black', 24))
        if i == 3:
            P.append(sphere('obj', 0.06, (w / 4, 0, z + 0.075), 'bronze', 20))
    return P

def it_platform(w=2.0, d=1.8, h=0.40):
    P = [box('plinth', (w - 0.10, d - 0.10, 0.06), (0, 0, 0.03), 'matte_black')]
    P.append(box('led', (w - 0.12, 0.01, 0.02), (0, -d / 2 + 0.06, 0.06), 'led'))
    P.append(box('platform', (w, d, h - 0.06), (0, 0, 0.06 + (h - 0.06) / 2), 'walnut', 0.006))
    fw, fl = min(1.5, w * 0.74), d - 0.14
    fx = -w / 2 + 0.04 + fw / 2
    P.append(rbox('mattress', (fw, fl, 0.14), (fx, 0, h + 0.07), 'linen_grey', r=0.04))
    P.append(rbox('duvet', (fw - 0.04, fl * 0.56, 0.08), (fx, -fl * 0.2, h + 0.17), 'velvet_charcoal', r=0.035))
    P.append(rbox('pillow', (0.62, 0.40, 0.11), (fx, fl / 2 - 0.26, h + 0.19), 'linen_white', r=0.035))
    P.append(box('tray', (0.40, 0.28, 0.02), (w / 2 - 0.30, d / 2 - 0.35, h + 0.01), 'matte_black', 0.003))
    P.append(lathe('cup', [(0.03, 0), (0.035, 0.07), (0.001, 0.07)], (w / 2 - 0.32, d / 2 - 0.35, h + 0.02), 'ceramic_black', 16))
    return P

def it_bed(w=1.8, L=2.1, fabric='fabric_charcoal', head='leather_black', accent='velvet_forest', wing=0.3):
    P = [box('plinth', (w - 0.14, L - 0.30, 0.10), (0, -0.05, 0.05), 'matte_black')]
    P.append(rbox('base', (w + 0.10, L - 0.10, 0.22), (0, -0.02, 0.21), fabric, r=0.03))
    P.append(rbox('headboard', (w + wing, 0.09, 1.05), (0, L / 2 - 0.02, 0.60), head, r=0.02))
    P.append(box('headline', (w + wing, 0.012, 0.012), (0, L / 2 - 0.07, 1.12), 'champagne'))
    P.append(rbox('mattress', (w - 0.02, L - 0.24, 0.22), (0, -0.05, 0.43), 'linen_white', r=0.05))
    P.append(rbox('duvet', (w + 0.02, L * 0.60, 0.10), (0, -L / 2 + 0.05 + L * 0.30, 0.58), 'linen_white', r=0.045))
    P.append(rbox('fold', (w + 0.02, 0.20, 0.09), (0, -L / 2 + 0.05 + L * 0.60 - 0.05, 0.61), 'linen_white', r=0.04))
    P.append(rbox('throw', (w + 0.04, 0.50, 0.05), (0, -L / 2 + 0.40, 0.66), accent, r=0.02))
    n = 2 if w >= 1.5 else 1
    for i in range(n):
        x = 0 if n == 1 else (i - 0.5) * (w * 0.5)
        P.append(rbox('euro%d' % i, (0.60, 0.15, 0.60), (x, L / 2 - 0.22, 0.86), 'velvet_charcoal', r=0.045, rot=(-0.18, 0, 0)))
        P.append(rbox('pillow%d' % i, (0.68, 0.17, 0.42), (x, L / 2 - 0.38, 0.72), 'linen_white', r=0.045, rot=(-0.26, 0, 0)))
    return P

def it_bay_cushion(w=3.0, d=0.78):
    P = [rbox('pad', (w, d, 0.06), (0, 0, 0.03), 'leather_taupe', r=0.02)]
    P.append(rbox('c1', (0.45, 0.14, 0.45), (-w * 0.3, d * 0.3, 0.30), 'velvet_charcoal', r=0.035, rot=(-0.3, 0, 0.15)))
    P.append(rbox('c2', (0.45, 0.14, 0.45), (w * 0.3, d * 0.3, 0.30), 'velvet_olive', r=0.035, rot=(-0.3, 0, -0.15)))
    return P

def it_media_wall(w=3.2, h=2.6):
    P = [box('slab', (w, 0.12, h), (0, 0.06, h / 2), 'calacatta', 0.004)]
    P.append(box('cabinet', (2.4, 0.42, 0.36), (0, -0.21, 0.43), 'lacquer_charcoal', 0.005))
    P += grooves('gap', 2.4, 0.36, (0, -0.42 + 0.001, 0.43), 3, m='champagne', width=0.003)
    P.append(box('cabled', (2.3, 0.02, 0.006), (0, -0.05, 0.253), 'led'))
    P.append(box('firebox', (1.40, 0.10, 0.30), (0, 0.05, 0.92), 'matte_black'))
    P.append(box('mesh', (1.36, 0.01, 0.26), (0, 0.09, 0.92), 'brass_mesh'))
    P.append(box('fireglass', (1.36, 0.004, 0.26), (0, -0.002, 0.92), 'smoked_glass'))
    P.append(box('flame', (1.30, 0.03, 0.10), (0, 0.04, 0.84), 'ember'))
    P.append(box('firetrim', (1.44, 0.02, 0.34), (0, -0.005, 0.92), 'champagne'))
    P.append(box('screen', (1.65, 0.025, 0.95), (0, -0.0125, 1.72), 'screen_black', 0.003))
    P.append(box('bezel', (1.67, 0.03, 0.97), (0, 0.0, 1.72), 'matte_black', 0.004))
    P.append(lathe('vase', [(0.05, 0), (0.09, 0.05), (0.07, 0.22), (0.04, 0.28), (0.001, 0.28)], (-0.9, -0.22, 0.61), 'ceramic_black', 24))
    P.append(box('books', (0.22, 0.16, 0.05), (0.85, -0.22, 0.635), 'leather_black', 0.003))
    return P

def it_wine_cabinet(w=1.6, h=2.4, d=0.40):
    """Black-framed glass display with backlit shelves, bottles and glasses."""
    P = [box('back', (w, 0.02, h), (0, d / 2 - 0.01, h / 2), 'lacquer_charcoal')]
    for sx in (-1, 1):
        P.append(box('side', (0.03, d, h), (sx * (w / 2 - 0.015), 0, h / 2), 'matte_black'))
    P.append(box('top', (w, d, 0.04), (0, 0, h - 0.02), 'matte_black'))
    P.append(box('plinth', (w, d - 0.02, 0.08), (0, 0.01, 0.04), 'matte_black'))
    shelves = 5
    gap = (h - 0.16) / shelves
    rr = random.Random(9)
    for i in range(shelves):
        z = 0.08 + i * gap
        P.append(box('shelf%d' % i, (w - 0.06, d - 0.06, 0.02), (0, 0.0, z + 0.01), 'smoked_glass'))
        P.append(box('led%d' % i, (w - 0.08, 0.02, 0.008), (0, d / 2 - 0.03, z + 0.03), 'led'))
        n = int((w - 0.2) / 0.11)
        for k in range(n):
            x = -w / 2 + 0.12 + k * 0.11
            if i % 2 == 0:
                if rr.random() < 0.8:
                    P.append(lathe('bottle', [(0.035, 0), (0.037, 0.18), (0.015, 0.25), (0.015, 0.30), (0.018, 0.31), (0.001, 0.31)], (x, 0.02, z + 0.02), 'wine' if rr.random() < 0.6 else 'smoked_glass', 14))
            elif rr.random() < 0.7:
                P.append(lathe('glass', [(0.005, 0), (0.03, 0.005), (0.004, 0.01), (0.004, 0.08), (0.03, 0.10), (0.035, 0.17), (0.02, 0.19), (0.001, 0.19)], (x, 0.0, z + 0.02), 'glass', 14))
    # two sliding glass doors with slim black frames
    for s_ in (-1, 1):
        dx = s_ * (w / 4)
        zz = (s_ + 1) * 0.015
        P.append(box('door%d' % s_, (w / 2 - 0.01, 0.006, h - 0.14), (dx, -d / 2 + 0.02 - zz, 0.08 + (h - 0.14) / 2), 'glass'))
        P.append(box('dframe%d' % s_, (0.02, 0.02, h - 0.14), (dx + s_ * (w / 4 - 0.01), -d / 2 + 0.02 - zz, 0.08 + (h - 0.14) / 2), 'matte_black'))
    return P

def it_pendant_ring():
    """Sculptural pendant: two thin luminous rings hung on cords."""
    P = [cyl('canopy', 0.08, 0.02, (0, 0, 0.79), 'matte_black', 24)]
    for i, (R, tilt, z, off) in enumerate(((0.32, 0.55, 0.30, 0.0), (0.24, -0.45, 0.42, 0.10))):
        P.append(torus('ring%d' % i, R, 0.012, (off, 0, z), 'led', 64, 10, rot=(tilt, 0, 0)))
        P.append(torus('trim%d' % i, R, 0.016, (off, 0, z - 0.004), 'champagne', 64, 10, rot=(tilt, 0, 0)))
        for a in (0.3, 2.4, 4.2):
            x = off + math.cos(a) * R
            y = math.sin(a) * R * math.cos(tilt)
            zt = z + math.sin(a) * R * math.sin(tilt)
            P.append(cyl('cord', 0.002, 0.78 - zt, (x, y, zt + (0.78 - zt) / 2), 'matte_black', 6))
    return P

# ----------------------------------------------------------------- lighting
def it_pendant_linear(L=1.2):
    P = [cyl('canopy', 0.06, 0.02, (0, 0, 0.49), 'matte_black', 24)]
    P.append(box('bar', (L, 0.04, 0.03), (0, 0, 0.36), 'champagne', 0.004))
    for s in (-1, 1):
        P.append(cyl('rod%d' % s, 0.004, 0.13, (s * L * 0.35, 0, 0.43), 'matte_black', 8))
    for i in range(3):
        x = -L / 2 + L / 6 + i * L / 3
        P.append(lathe('shade%d' % i, [(0.02, 0.34), (0.07, 0.34), (0.08, 0.30), (0.08, 0.10), (0.075, 0.06), (0.001, 0.06)], (x, 0, 0), 'smoked_glass', 28))
        P.append(sphere('bulb%d' % i, 0.03, (x, 0, 0.20), 'bulb', 14, scale=(1, 1, 1.5)))
    return P

def it_pendant_cluster():
    P = [cyl('canopy', 0.16, 0.02, (0, 0, 0.89), 'matte_black', 32)]
    rr = random.Random(4)
    for i in range(7):
        a = i * 2 * math.pi / 7
        r = 0.0 if i == 0 else 0.22 + rr.random() * 0.1
        x, y = math.cos(a) * r, math.sin(a) * r
        rad = 0.08 + rr.random() * 0.05
        z = 0.15 + rr.random() * 0.45
        P.append(cyl('cord%d' % i, 0.0025, 0.88 - z - rad, (x, y, z + rad + (0.88 - z - rad) / 2), 'matte_black', 6))
        P.append(sphere('globe%d' % i, rad, (x, y, z + rad), 'smoked_glass' if i % 2 else 'glass', 24))
        P.append(sphere('bulb%d' % i, rad * 0.35, (x, y, z + rad), 'bulb', 12))
        P.append(cyl('cap%d' % i, 0.02, 0.03, (x, y, z + 2 * rad), 'champagne', 12))
    return P

def it_pendant_globe(r=0.175):
    P = [cyl('canopy', 0.05, 0.02, (0, 0, 0.59), 'matte_black', 24)]
    P.append(cyl('cord', 0.0025, 0.58 - 2 * r - 0.02, (0, 0, 2 * r + 0.02 + (0.58 - 2 * r - 0.02) / 2), 'matte_black', 6))
    P.append(cyl('cap', 0.03, 0.04, (0, 0, 2 * r + 0.01), 'champagne', 16))
    P.append(sphere('globe', r, (0, 0, r), 'smoked_glass', 28))
    P.append(sphere('bulb', r * 0.35, (0, 0, r), 'bulb', 12))
    return P

def it_flush_black():
    P = [cyl('ring', 0.15, 0.08, (0, 0, 0.04), 'matte_black', 40)]
    P.append(cyl('disc', 0.12, 0.01, (0, 0, 0.005), 'led', 32))
    return P

def it_spot_track(L=0.6):
    P = [box('track', (L, 0.035, 0.03), (0, 0, 0.105), 'matte_black')]
    for i in range(3):
        x = -L / 2 + L / 6 + i * L / 3
        P.append(cyl('spot%d' % i, 0.03, 0.09, (x, 0, 0.05), 'matte_black', 20, rot=(0.35 * (i - 1), 0, 0)))
        P.append(cyl('lens%d' % i, 0.022, 0.005, (x, -0.015 * (i - 1), 0.005), 'led', 16))
    return P

def it_arco_lamp():
    P = [box('base', (0.26, 0.40, 0.24), (0, 0.10, 0.12), 'marble_white', 0.01)]
    P.append(tube('arc', [(0, 0.10, 0.24), (0, 0.05, 1.6), (0, -0.7, 2.3), (0, -1.6, 2.2), (0, -1.95, 1.85)], 0.014, 'chrome'))
    P.append(lathe('shade', [(0.02, 1.86), (0.16, 1.86), (0.17, 1.80), (0.16, 1.72), (0.001, 1.72)], (0, -1.95, 0), 'chrome', 32))
    P.append(sphere('bulb', 0.035, (0, -1.95, 1.78), 'bulb', 14))
    return P

def it_table_lamp():
    P = [cyl('base', 0.09, 0.02, (0, 0, 0.01), 'champagne', 32)]
    P.append(cyl('stem', 0.012, 0.08, (0, 0, 0.06), 'champagne', 12))
    P.append(sphere('globe', 0.13, (0, 0, 0.22), 'glass', 28))
    P.append(sphere('bulb', 0.05, (0, 0, 0.22), 'bulb', 14))
    return P

def it_floor_lamp():
    P = [cyl('base', 0.15, 0.015, (0, 0, 0.0075), 'matte_black', 32)]
    P.append(cyl('stem', 0.012, 1.5, (0, 0, 0.76), 'matte_black', 12))
    P.append(lathe('shade', [(0.03, 1.40), (0.16, 1.40), (0.17, 1.44), (0.17, 1.66), (0.001, 1.66)], (0, 0, 0), 'linen_grey', 32))
    P.append(sphere('bulb', 0.03, (0, 0, 1.52), 'bulb', 12))
    return P

def it_wall_light():
    P = [box('body', (0.06, 0.09, 0.30), (0, -0.045, 0.15), 'matte_black', 0.004)]
    P.append(cyl('up', 0.02, 0.006, (0, -0.045, 0.302), 'led', 16))
    P.append(cyl('down', 0.02, 0.006, (0, -0.045, -0.002), 'led', 16))
    return P

# ----------------------------------------------------------------- wall pieces
def it_mirror_round(dia=0.9):
    P = [torus('ring', dia / 2, 0.012, (0, 0.012, dia / 2 + 0.012), 'champagne', 56, 10, rot=(math.pi / 2, 0, 0))]
    P.append(cyl('glass', dia / 2 - 0.004, 0.006, (0, 0.012, dia / 2 + 0.012), 'mirror', 56, rot=(math.pi / 2, 0, 0)))
    return P

def it_mirror_led(dia=0.7):
    P = [cyl('halo', dia / 2 + 0.03, 0.01, (0, 0.03, dia / 2 + 0.03), 'led', 56, rot=(math.pi / 2, 0, 0))]
    P.append(cyl('back', dia / 2, 0.04, (0, 0.02, dia / 2 + 0.03), 'matte_black', 56, rot=(math.pi / 2, 0, 0)))
    P.append(cyl('glass', dia / 2, 0.006, (0, -0.003, dia / 2 + 0.03), 'mirror', 56, rot=(math.pi / 2, 0, 0)))
    return P

def it_mirror_full(w=0.6, h=1.8):
    tilt = math.radians(-6)
    P = [box('frame', (w, 0.03, h), (0, 0.0, h / 2), 'matte_black', 0.004, rot=(tilt, 0, 0))]
    P.append(box('glass', (w - 0.05, 0.006, h - 0.05), (0, -0.017, h / 2), 'mirror', rot=(tilt, 0, 0)))
    return P

def it_art(w=1.2, h=0.9):
    P = [box('frame', (w, 0.03, h), (0, 0.015, h / 2), 'matte_black', 0.003)]
    P.append(box('canvas', (w - 0.03, 0.01, h - 0.03), (0, -0.002, h / 2), 'canvas'))
    return P

def it_hook_rail(w=0.6):
    P = [box('rail', (w, 0.02, 0.04), (0, -0.01, 1.60), 'matte_black', 0.003)]
    for i in range(4):
        x = -w / 2 + 0.08 + i * (w - 0.16) / 3
        P.append(tube('hook%d' % i, [(x, -0.02, 1.58), (x, -0.07, 1.57), (x, -0.075, 1.62)], 0.006, 'champagne'))
    return P

# ----------------------------------------------------------------- kitchen (room-fitted)
def it_kitchen_set(W=2.623, D=2.760):
    P = []
    bd, bh, th = 0.60, 0.88, 0.02
    fridge_w = 0.72
    north_len = W - fridge_w - 0.02
    rx = bd + 0.55
    rw = 0.60
    front = 'lacquer_charcoal'
    P.append(box('base_w', (bd, D - 0.02, bh - 0.08), (bd / 2, -D / 2, 0.08 + (bh - 0.08) / 2), front))
    P.append(box('plinth_w', (bd - 0.06, D - 0.02, 0.08), (bd / 2 - 0.03, -D / 2, 0.04), 'matte_black'))
    ny = -bd - 0.02
    nd = int(round((D - bd - 0.04) / 0.55))
    P += grooves('wgap', D - bd - 0.04, bh - 0.08, (bd + 0.001, ny - (D - bd - 0.04) / 2, 0.08 + (bh - 0.08) / 2), nd, vertical=True, rot=(0, 0, 0))
    # west-run gaps must run along y: rebuild them as boxes across x
    P = [o for o in P if not o.name.startswith('wgap')]
    for i in range(1, nd):
        yy = ny - i * (D - bd - 0.04) / nd
        P.append(box('wgap%d' % i, (0.012, 0.004, bh - 0.08), (bd + 0.001, yy, 0.08 + (bh - 0.08) / 2), 'matte_black'))
    for i, (x0, x1) in enumerate(((bd, rx - rw / 2), (rx + rw / 2, north_len))):
        cw = x1 - x0
        P.append(box('base_n%d' % i, (cw, bd, bh - 0.08), ((x0 + x1) / 2, -bd / 2, 0.08 + (bh - 0.08) / 2), front))
        P.append(box('plinth_n%d' % i, (cw, bd - 0.06, 0.08), ((x0 + x1) / 2, -bd / 2 + 0.03, 0.04), 'matte_black'))
        n = max(1, int(round(cw / 0.5)))
        P += grooves('ngap%d' % i, cw, bh - 0.08, ((x0 + x1) / 2, -bd - 0.001, 0.08 + (bh - 0.08) / 2), n)
    P.append(box('top_w', (bd + 0.03, D, th), ((bd + 0.03) / 2, -D / 2, bh + th / 2), 'calacatta', 0.003))
    P.append(box('waterfall', (0.02, bd + 0.03, bh + th), ((bd + 0.03) - 0.01, -D + (bd + 0.03) / 2 - 0.0, (bh + th) / 2), 'marble_grey', 0.003) if False else box('endpanel', (bd + 0.03, 0.02, bh + th), ((bd + 0.03) / 2, -D + 0.01, (bh + th) / 2), 'calacatta', 0.003))
    for i, (x0, x1) in enumerate(((bd + 0.03, rx - rw / 2), (rx + rw / 2, north_len))):
        P.append(box('top_n%d' % i, (x1 - x0, bd + 0.03, th), ((x0 + x1) / 2, -(bd + 0.03) / 2, bh + th / 2), 'calacatta', 0.003))
    sink_y = -D * 0.55
    P.append(box('sink', (0.46, 0.42, 0.18), (bd / 2 + 0.02, sink_y, bh + th - 0.09 + 0.004), 'ceramic_black'))
    P.append(tube('faucet', [(0.09, sink_y, bh + th), (0.09, sink_y, bh + th + 0.34), (0.30, sink_y, bh + th + 0.34), (0.32, sink_y, bh + th + 0.28)], 0.011, 'matte_black'))
    P.append(box('hob', (rw, bd - 0.10, 0.008), (rx, -bd / 2 - 0.02, bh + th + 0.004), 'screen_black'))
    for i, (dx, dy) in enumerate(((-0.15, -0.12), (0.15, -0.12), (-0.15, 0.12), (0.15, 0.12))):
        P.append(torus('ring%d' % i, 0.07, 0.003, (rx + dx, -bd / 2 - 0.02 + dy, bh + th + 0.009), 'chrome', 24, 6))
    P.append(box('rangebody', (rw, bd - 0.02, bh - 0.08), (rx, -bd / 2 + 0.01, 0.08 + (bh - 0.08) / 2), front))
    P.append(box('ovendoor', (rw - 0.04, 0.015, 0.50), (rx, -bd - 0.008, 0.40), 'screen_black'))
    P.append(box('ovenhandle', (0.50, 0.025, 0.018), (rx, -bd - 0.035, 0.62), 'matte_black', 0.004))
    # splashback slab to the underside of the uppers, uppers, integrated hood
    uh, ud, uz = 0.72, 0.36, 1.50
    P.append(box('splash', (north_len, 0.015, uz - bh - th), (north_len / 2, -0.0115, bh + th + (uz - bh - th) / 2), 'calacatta'))
    P.append(box('upper', (north_len, ud, uh), (north_len / 2, -ud / 2, uz + uh / 2), front, 0.004))
    P += grooves('ugap', north_len, uh, (north_len / 2, -ud - 0.001, uz + uh / 2), 4, m='champagne', width=0.003)
    P.append(box('hood', (rw + 0.30, ud + 0.06, 0.06), (rx, -ud / 2 - 0.03, uz - 0.03), 'matte_black'))
    P.append(box('ledstrip', (north_len - 0.1, 0.02, 0.008), (north_len / 2, -ud + 0.05, uz - 0.004), 'led'))
    # fridge column at the east end
    fx = W - fridge_w / 2 - 0.01
    P.append(box('fridge', (fridge_w, 0.62, 2.22), (fx, -0.31, 1.11), front, 0.004))
    P.append(box('fdoor', (fridge_w - 0.02, 0.01, 2.16), (fx, -0.626, 1.11), 'screen_black'))
    P.append(box('fgap', (fridge_w - 0.02, 0.012, 0.004), (fx, -0.63, 1.55), 'matte_black'))
    # decor
    P.append(lathe('kettle', [(0.06, 0), (0.09, 0.02), (0.08, 0.12), (0.03, 0.16), (0.04, 0.18), (0.001, 0.18)], (north_len - 0.35, -0.35, bh + th), 'matte_black', 20))
    P.append(box('board', (0.02, 0.28, 0.40), (0.34, -1.25, bh + th + 0.2), 'walnut', 0.004))
    P.append(lathe('bowl', [(0.05, 0), (0.12, 0.02), (0.15, 0.07), (0.14, 0.075), (0.10, 0.03), (0.001, 0.025)], (bd + 0.4, -0.30, bh + th), 'ceramic_black', 24))
    return P

# ----------------------------------------------------------------- bathroom
def it_vanity(w=0.9):
    """Wall-hung: origin on the wall plane at the cabinet bottom (place at z=550)."""
    P = [box('body', (w, 0.50, 0.30), (0, -0.25, 0.15), 'walnut', 0.005)]
    P += grooves('gap', w, 0.30, (0, -0.50, 0.15), 2)
    P.append(box('top', (w + 0.02, 0.52, 0.02), (0, -0.26, 0.31), 'marble_grey', 0.004))
    basin = lathe('basin', [(0.12, 0.32), (0.19, 0.33), (0.20, 0.42), (0.19, 0.45), (0.17, 0.45), (0.17, 0.44), (0.15, 0.35), (0.001, 0.34)], (0, -0.27, 0), 'ceramic_black', 32)
    P.append(basin)
    P.append(tube('spout', [(0, 0, 0.62), (0, -0.22, 0.62), (0, -0.25, 0.58)], 0.011, 'matte_black'))
    P.append(cyl('mixer', 0.025, 0.02, (0, -0.01, 0.62), 'matte_black', 16, rot=(math.pi / 2, 0, 0)))
    P.append(box('ledgap', (w - 0.04, 0.02, 0.006), (0, -0.04, 0.003), 'led'))
    return P

def it_toilet():
    """Wall-hung pan, origin on the wall plane."""
    P = [rbox('pan', (0.36, 0.53, 0.33), (0, -0.265, 0.56), 'matte_white', r=0.06)]
    P.append(rbox('seat', (0.37, 0.50, 0.03), (0, -0.28, 0.745), 'matte_black', r=0.012))
    P.append(box('plate', (0.24, 0.006, 0.15), (0, -0.003, 1.05), 'matte_black', 0.003))
    P.append(box('button', (0.10, 0.004, 0.04), (0, -0.007, 1.05), 'chrome', 0.002))
    return P

def it_bathtub():
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=48, v_segments=24, radius=1.0)
    bmesh.ops.scale(bm, vec=Vector((0.80, 0.375, 0.42)), verts=bm.verts)
    bmesh.ops.translate(bm, vec=Vector((0, 0, 0.56)), verts=bm.verts)
    geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
    bmesh.ops.bisect_plane(bm, geom=geom, plane_co=(0, 0, 0.56), plane_no=(0, 0, 1), clear_outer=True)
    shell = mesh_from_bm('shell', bm, 'matte_white', smooth=True)
    mod = shell.modifiers.new('solid', 'SOLIDIFY')
    mod.thickness = 0.04
    mod.offset = -1
    P = [shell]
    P.append(torus('rim', 1.0, 0.02, (0, 0, 0.56), 'matte_white', 64, 10, scale=(0.80, 0.375, 1)))
    P.append(box('base', (1.2, 0.5, 0.14), (0, 0, 0.07), 'matte_white', 0.02))
    P.append(tube('spout', [(0.0, -0.44, 0.0), (0.0, -0.44, 0.45), (0.0, -0.44, 0.80), (0.0, -0.36, 0.86), (0.0, -0.24, 0.82)], 0.012, 'matte_black'))
    P.append(cyl('handle', 0.02, 0.05, (0.0, -0.44, 0.62), 'matte_black', 12, rot=(math.pi / 2, 0, 0)))
    return P

def it_shower(w=0.9):
    P = [box('tray', (w, w, 0.02), (0, 0, 0.01), 'marble_grey', 0.004)]
    P.append(box('drain', (w - 0.1, 0.05, 0.006), (0, -w / 2 + 0.08, 0.02), 'matte_black'))
    P.append(box('glass', (0.008, w, 2.0), (-w / 2 + 0.004, 0, 1.02), 'glass'))
    P.append(box('topbar', (0.03, w + 0.02, 0.03), (-w / 2 + 0.004, 0, 2.035), 'matte_black'))
    P.append(box('profile', (0.03, 0.03, 2.0), (-w / 2 + 0.004, w / 2 - 0.015, 1.02), 'matte_black'))
    P.append(cyl('head', 0.125, 0.012, (0.05, 0.12, 2.2), 'matte_black', 32))
    P.append(tube('arm', [(0.05, w / 2, 2.2), (0.05, 0.12, 2.2)], 0.01, 'matte_black'))
    P.append(box('column', (0.10, 0.03, 1.1), (0.05, w / 2 - 0.015, 1.15), 'matte_black', 0.004))
    P.append(cyl('mixer', 0.03, 0.02, (0.05, w / 2 - 0.04, 1.05), 'matte_black', 20, rot=(math.pi / 2, 0, 0)))
    P.append(lathe('hand', [(0.02, 1.35), (0.035, 1.40), (0.035, 1.44), (0.001, 1.46)], (0.05, w / 2 - 0.06, 0), 'matte_black', 12))
    return P

def it_washer():
    P = [box('body', (0.60, 0.60, 0.85), (0, 0, 0.425), 'matte_black', 0.01, 3)]
    P.append(torus('doorring', 0.20, 0.018, (0, -0.30, 0.42), 'chrome', 40, 10, rot=(math.pi / 2, 0, 0)))
    P.append(cyl('doorglass', 0.19, 0.02, (0, -0.31, 0.42), 'screen_black', 40, rot=(math.pi / 2, 0, 0)))
    P.append(cyl('dial', 0.03, 0.02, (0.18, -0.315, 0.78), 'chrome', 20, rot=(math.pi / 2, 0, 0)))
    return P

# ----------------------------------------------------------------- outdoor & decor
def it_outdoor_table():
    P = [cyl('top', 0.25, 0.02, (0, 0, 0.44), 'matte_black', 40, bevel_w=0.004)]
    P.append(cyl('stem', 0.03, 0.42, (0, 0, 0.22), 'matte_black', 16))
    P.append(cyl('foot', 0.18, 0.015, (0, 0, 0.0075), 'matte_black', 32))
    return P

def it_planter_olive():
    P = [lathe('pot', [(0.20, 0), (0.20, 0.55), (0.19, 0.60), (0.001, 0.60)], (0, 0, 0), 'matte_black', 40)]
    P.append(cyl('soil', 0.18, 0.02, (0, 0, 0.606), 'soil', 24))
    P.append(tube('trunk', [(0, 0, 0.55), (0.03, 0.02, 0.95), (-0.02, 0.0, 1.25)], 0.02, 'trunk'))
    P.append(leaf_cloud('canopy', (0, 0, 1.45), 0.40, 420, 0.05, 'leaf_olive', seed=8, flat=0.75))
    return P

def it_planter_grass(w=0.9):
    P = [box('trough', (w, 0.30, 0.35), (0, 0, 0.175), 'matte_black', 0.006)]
    P.append(box('soil', (w - 0.04, 0.26, 0.02), (0, 0, 0.345), 'soil'))
    rr = random.Random(12)
    blades = []
    for i in range(70):
        x = -w / 2 + 0.05 + rr.random() * (w - 0.1)
        y = -0.1 + rr.random() * 0.2
        L = 0.35 + rr.random() * 0.35
        blades.append(leaf('blade%d' % i, L, 0.018, (x, y, 0.35), (0, -math.radians(80 + rr.random() * 10), rr.random() * 6.28), 'leaf_olive', 0.6, 4))
    P.append(join(blades, 'grass'))
    return P

def it_vase_black():
    return [lathe('vase', [(0.06, 0), (0.10, 0.08), (0.08, 0.30), (0.04, 0.42), (0.045, 0.50), (0.001, 0.50)], (0, 0, 0), 'ceramic_black', 32),
            tube('stem', [(0, 0, 0.45), (0.03, 0.02, 0.75), (0.02, 0.05, 1.0)], 0.005, 'trunk'),
            leaf_cloud('leaves', (0.02, 0.04, 0.95), 0.12, 24, 0.06, 'leaf_olive', seed=3, flat=0.7)]

def it_vase_travertine():
    return [lathe('vase', [(0.08, 0), (0.15, 0.06), (0.14, 0.20), (0.06, 0.28), (0.07, 0.32), (0.001, 0.32)], (0, 0, 0), 'travertine', 32)]

def it_sculpture():
    return [box('base', (0.16, 0.16, 0.03), (0, 0, 0.015), 'marble_black', 0.003),
            sphere('s1', 0.07, (0, 0, 0.10), 'bronze', 24, scale=(1, 0.8, 1.2)),
            sphere('s2', 0.05, (0.04, 0.02, 0.22), 'bronze', 20, scale=(1.3, 1, 0.9)),
            tube('arc', [(-0.06, 0, 0.03), (-0.10, 0.02, 0.2), (0.0, 0.03, 0.34)], 0.008, 'bronze')]

def it_books():
    P = []
    z = 0
    rr = random.Random(6)
    for i, m in enumerate(('leather_black', 'linen_grey', 'matte_black')):
        h = 0.03 + rr.random() * 0.02
        P.append(box('book%d' % i, (0.24 - i * 0.02, 0.17 - i * 0.01, h), (rr.random() * 0.02, rr.random() * 0.02, z + h / 2), m, 0.003, rot=(0, 0, (rr.random() - 0.5) * 0.2)))
        z += h
    return P

def it_candle_set():
    P = [box('tray', (0.30, 0.14, 0.015), (0, 0, 0.0075), 'marble_black', 0.003)]
    for i, (h, r) in enumerate(((0.12, 0.035), (0.18, 0.03), (0.09, 0.04))):
        P.append(cyl('candle%d' % i, r, h, (-0.09 + i * 0.09, 0, 0.015 + h / 2), 'matte_black', 20))
        P.append(cyl('wax%d' % i, r - 0.004, 0.004, (-0.09 + i * 0.09, 0, 0.015 + h + 0.002), 'candle', 20))
    return P

def it_bowl_black():
    return [lathe('bowl', [(0.05, 0), (0.13, 0.02), (0.17, 0.07), (0.16, 0.075), (0.12, 0.03), (0.001, 0.025)], (0, 0, 0), 'ceramic_black', 32)]

ASSETS_IT = {
    'it_sofa': lambda: it_sofa(),
    'it_chaise': lambda: it_chaise(),
    'it_ottoman': lambda: it_ottoman(),
    'it_wine_cabinet': lambda: it_wine_cabinet(),
    'it_pendant_ring': lambda: it_pendant_ring(),
    'it_armchair': lambda: it_armchair(),
    'it_armchair_olive': lambda: it_armchair('velvet_olive'),
    'it_dining_chair': lambda: it_dining_chair('velvet_forest'),
    'it_dining_chair_cognac': lambda: it_dining_chair('velvet_cognac'),
    'it_desk_chair': lambda: it_desk_chair(),
    'it_bench': lambda: it_bench(),
    'it_lounge_outdoor': lambda: it_lounge_outdoor(),
    'it_coffee_table_set': lambda: it_coffee_table_set(),
    'it_side_table': lambda: it_side_table(),
    'it_dining_table': lambda: it_dining_table(),
    'it_sideboard': lambda: it_sideboard(),
    'it_console': lambda: it_sideboard(1.4, 0.40, 0.70, 3),
    'it_nightstand': lambda: it_nightstand(),
    'it_nightstand_s': lambda: it_nightstand(0.45),
    'it_dresser': lambda: it_dresser(),
    'it_wardrobe': lambda: it_wardrobe(),
    'it_wardrobe_wide': lambda: it_wardrobe(2.2, 2.65, 4),
    'it_desk': lambda: it_desk(),
    'it_shelving': lambda: it_shelving(),
    'it_platform': lambda: it_platform(),
    'it_bed_queen': lambda: it_bed(1.8, 2.1),
    'it_bed_double': lambda: it_bed(1.5, 2.0, 'fabric_charcoal', 'leather_black', 'velvet_cognac'),
    'it_bay_cushion': lambda: it_bay_cushion(),
    'it_media_wall': lambda: it_media_wall(),
    'it_pendant_linear': lambda: it_pendant_linear(),
    'it_pendant_cluster': lambda: it_pendant_cluster(),
    'it_pendant_globe': lambda: it_pendant_globe(),
    'it_flush_black': lambda: it_flush_black(),
    'it_spot_track': lambda: it_spot_track(),
    'it_arco_lamp': lambda: it_arco_lamp(),
    'it_table_lamp': lambda: it_table_lamp(),
    'it_floor_lamp': lambda: it_floor_lamp(),
    'it_wall_light': lambda: it_wall_light(),
    'it_mirror_round': lambda: it_mirror_round(),
    'it_mirror_led': lambda: it_mirror_led(),
    'it_mirror_full': lambda: it_mirror_full(),
    'it_art_large': lambda: it_art(1.2, 0.9),
    'it_art_tall': lambda: it_art(0.8, 1.0),
    'it_art_small': lambda: it_art(0.5, 0.6),
    'it_hook_rail': lambda: it_hook_rail(),
    'it_kitchen_set': lambda: it_kitchen_set(),
    'it_vanity': lambda: it_vanity(),
    'it_vanity_wide': lambda: it_vanity(1.1),
    'it_toilet': lambda: it_toilet(),
    'it_bathtub': lambda: it_bathtub(),
    'it_shower': lambda: it_shower(),
    'it_washer': lambda: it_washer(),
    'it_outdoor_table': lambda: it_outdoor_table(),
    'it_planter_olive': lambda: it_planter_olive(),
    'it_planter_grass': lambda: it_planter_grass(),
    'it_vase_black': lambda: it_vase_black(),
    'it_vase_travertine': lambda: it_vase_travertine(),
    'it_sculpture': lambda: it_sculpture(),
    'it_books': lambda: it_books(),
    'it_candle_set': lambda: it_candle_set(),
    'it_bowl_black': lambda: it_bowl_black(),
}
