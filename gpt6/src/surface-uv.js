// Scanned finishes use metre-based UVs, including small furniture parts.
export function setSurfaceUV(geometry, material, scale = [1, 1, 1]) {
  const size = material.userData.textureSizeMeters;
  if (!size) return geometry;
  const p = geometry.attributes.position, n = geometry.attributes.normal, uv = geometry.attributes.uv;
  if (!n || !uv) return geometry;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) * scale[0], y = p.getY(i) * scale[1], z = p.getZ(i) * scale[2];
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i)), nz = Math.abs(n.getZ(i));
    if (ny >= nx && ny >= nz) uv.setXY(i, x / size, z / size);
    else if (nx >= nz) uv.setXY(i, z / size, y / size);
    else uv.setXY(i, x / size, y / size);
  }
  uv.needsUpdate = true;
  return geometry;
}
