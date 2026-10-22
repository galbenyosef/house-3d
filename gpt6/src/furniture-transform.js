import { Box3, Matrix4, Vector3 } from 'three';

// Measure in the furniture's own axes: rotating an item must not swap its
// displayed width and depth, and resizing must not lift it off the floor.
export function furnitureBounds(object) {
  object.updateWorldMatrix(true, true);
  const inverse = object.matrixWorld.clone().invert(), bounds = new Box3();
  object.traverse(child => {
    if (!child.isMesh) return;
    child.geometry.computeBoundingBox();
    bounds.union(child.geometry.boundingBox.clone().applyMatrix4(
      new Matrix4().multiplyMatrices(inverse, child.matrixWorld),
    ));
  });
  if (bounds.isEmpty()) throw new Error('家具模型没有可编辑的几何尺寸');
  return bounds;
}

export function readTransform(object) {
  return {position: object.position.toArray(), rotation: object.rotation.y, scale: object.scale.toArray()};
}

export function applyTransform(object, transform) {
  object.position.fromArray(transform.position);
  object.rotation.y = transform.rotation;
  object.scale.fromArray(transform.scale);
  object.updateWorldMatrix(true, true);
}

export function dimensionsOf(bounds, transform) {
  return bounds.getSize(new Vector3()).multiply(new Vector3(...transform.scale)).toArray();
}

export function editTransform(bounds, current, change) {
  const next = {position: [...current.position], rotation: current.rotation, scale: [...current.scale]};
  if (change.rotation !== undefined) {
    if (!Number.isFinite(change.rotation)) throw new Error('旋转角度必须是有效数字');
    next.rotation = change.rotation;
  }
  if (change.dimensions !== undefined) {
    const size = bounds.getSize(new Vector3()).toArray();
    if (!Array.isArray(change.dimensions) || change.dimensions.length !== 3 ||
        [...change.dimensions].some(n => !Number.isFinite(n) || n < .005 || n > 15)) {
      throw new Error('家具各边尺寸须在 5–15000 mm 之间');
    }
    next.scale = change.dimensions.map((n, i) => n / size[i]);
    if (next.scale.some(n => !Number.isFinite(n) || n < .05 || n > 10)) {
      throw new Error('调整后的尺寸须在原模型的 0.05–10 倍之间');
    }
  }
  // Keep the floor contact point and the footprint centre stationary.
  const pivot = bounds.getCenter(new Vector3()); pivot.y = bounds.min.y;
  const offset = transform => pivot.clone().multiply(new Vector3(...transform.scale))
    .applyAxisAngle(new Vector3(0, 1, 0), transform.rotation);
  next.position = new Vector3(...current.position).add(offset(current)).sub(offset(next)).toArray();
  if (change.position !== undefined) {
    if (!Array.isArray(change.position) || change.position.length !== 3 ||
        [...change.position].some(n => !Number.isFinite(n))) throw new Error('家具位置必须是有效坐标');
    next.position = [...change.position];
  }
  return next;
}
