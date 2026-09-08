// Contemporary silk-shade lighting; the ceiling-origin geometry is shared by
// Three.js and Cycles. This is an original design, not a historical lamp replica.
export function createSongPendant(THREE,mats){
  const group=new THREE.Group();group.name='木骨绢光六方吊灯';
  const shade=new THREE.MeshStandardMaterial({color:'#e6dcc6',roughness:.9,emissive:'#f2d2a0',emissiveIntensity:.22,side:THREE.DoubleSide});
  function cylinder(name,radius,height,y,material,n=48){
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,n),material);
    mesh.name=name;mesh.position.y=y;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;
  }
  cylinder('顶盘',.065,.024,-.012,mats.walnut);
  cylinder('吊线',.003,.34,-.19,mats.metal);
  cylinder('六方绢罩',.288,.37,-.56,shade,6);
  for(const y of [-.373,-.747])cylinder('木骨边框',.30,.018,y,mats.walnut,6);
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3,post=cylinder('细木骨',.007,.365,-.56,mats.walnut,8);
    post.position.x=Math.sin(a)*.293;post.position.z=Math.cos(a)*.293;
  }
  cylinder('下部扩散面',.279,.008,-.76,mats.light,6);
  return group;
}
