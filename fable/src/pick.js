// Picking for 布置 mode. three.js raycasts hidden objects too, and from the
// top-down edit camera the hidden roof slab, ceiling roses and chandeliers lie
// between the eye and the furniture — so only visible, editable pieces count.
// Pure (no DOM) so it can be unit-tested.

const shown = (o) => { for (; o; o = o.parent) if (!o.visible) return false; return true; };

// nearest visible hit on one of `pieces` (editable roots): { obj, point } or null
export function pickEditable(raycaster, pieces) {
  const roots = new Set(pieces);
  for (const hit of raycaster.intersectObjects([...roots], true)) {
    if (!shown(hit.object)) continue;
    if (hit.object.name === 'glass' && hit.object.material?.transparent) continue;
    let o = hit.object;
    while (o && !roots.has(o)) o = o.parent;
    if (o) return { obj: o, point: hit.point };
  }
  return null;
}

// point-in-convex/concave polygon (even–odd), for screen- or plan-space outlines
export function pointInOutline(poly, x, y) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
