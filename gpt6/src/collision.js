import { Box3, Matrix4, Quaternion, Vector3 } from 'three';

// Use the same model-derived obstacles for the walkthrough and layout checks.
export function collectWalkBlockers(items, architecture) {
  const blockers = [];
  const add = (box, id) => {
    if (box.max.y > .28 && box.min.y < 1.7) {
      box.name = id;
      blockers.push(box);
    }
  };
  const addObject = (object, id) => {
    object.updateWorldMatrix(true, true);
    const position=new Vector3(),rotation=new Quaternion(),scale=new Vector3();
    object.matrixWorld.decompose(position,rotation,scale);
    const inverse = new Matrix4().compose(position,rotation,new Vector3(1,1,1)).invert();
    const localBox = new Box3();
    object.traverse(child => {
      if (!child.isMesh) return;
      child.geometry.computeBoundingBox();
      localBox.union(child.geometry.boundingBox.clone().applyMatrix4(new Matrix4().multiplyMatrices(inverse, child.matrixWorld)));
    });
    const box = new Box3().setFromObject(object);
    // Keep angled door leaves and chairs oriented; their world AABB overstates
    // the obstruction at the corners of narrow approaches.
    box.walkShape = { bounds: localBox, inverse: inverse.elements };
    add(box, id);
  };
  for (const item of items) {
    if (['rug', 'art', 'painting', 'curtain', 'sconce'].some(key => item.id.includes(key))) continue;
    item.object.updateWorldMatrix(true, true);
    const parts = item.object.userData.walkBoxes;
    if (parts) {
      for (const part of parts) {
        add(new Box3(new Vector3(...part.min), new Vector3(...part.max)).applyMatrix4(item.object.matrixWorld), item.id);
      }
    } else {
      addObject(item.object, item.id);
    }
  }
  architecture.group.updateWorldMatrix(true, true);
  architecture.group.traverse(object => {
    if (object.userData.doorLeaf || object.userData.walkObstacle) addObject(object, object.name);
  });
  return blockers;
}
