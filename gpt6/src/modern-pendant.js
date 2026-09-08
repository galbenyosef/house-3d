// Shared by the real-time scene and the offline scene exporter. Origin is the ceiling.
export function createModernPendant(THREE, mats) {
  const group=new THREE.Group();group.name='暖白圆盘吊灯';
  const body=new THREE.MeshStandardMaterial({color:'#f1eee6',roughness:.76});
  function cylinder(name,radius,height,y,material){
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,64),material);
    mesh.name=name;mesh.position.y=y;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
  }
  cylinder('顶盘',.07,.025,-.0125,body);
  cylinder('细吊线',.003,.63,-.34,mats.metal);
  cylinder('圆盘灯罩',.31,.08,-.73,body);
  cylinder('乳白扩散面',.294,.010,-.775,mats.light);
  return group;
}
