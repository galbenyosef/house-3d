"""Import the application's exact meshes and render a Cycles photograph/panorama.
Run after export-render-scene.mjs. Coordinates are converted once by the exporter.
"""
import bpy, json, math, os, sys, argparse, time, shutil, hashlib
from datetime import datetime, timezone
from mathutils import Vector

parser=argparse.ArgumentParser()
parser.add_argument('--style',choices=['french','italian'],default='italian')
parser.add_argument('--mode',choices=['preview','panorama','both'],default='preview')
parser.add_argument('--width',type=int,default=1280)
parser.add_argument('--preview-width',type=int,default=1280)
parser.add_argument('--mobile-panorama',action='store_true',help='Downsample a finished larger panorama to a 4096px mobile image in Blender')
room_options=parser.add_mutually_exclusive_group()
room_options.add_argument('--room',default=None,help='Render one room ID (default: living)')
room_options.add_argument('--rooms',default=None,help='Comma-separated room IDs, all, or remaining (all except living)')
parser.add_argument('--samples',type=int,default=64)
parser.add_argument('--adaptive-threshold',type=float,default=.03)
parser.add_argument('--exposure',type=float,default=0.0)
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
base=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
folder=os.path.join(base,'artifacts','cycles',args.style)
with open(os.path.join(folder,'scene.json')) as f: data=json.load(f)
rooms=data.get('rooms',[{'id':'living','name':'客餐厅','camera':data['camera']}])
room_by_id={room['id']:room for room in rooms}
selected_ids=[args.room or 'living'] if not args.rooms else ([room['id'] for room in rooms if args.rooms=='all' or room['id']!='living'] if args.rooms in ['all','remaining'] else args.rooms.split(','))
if any(room_id not in room_by_id for room_id in selected_ids):raise ValueError(f'Unknown room IDs: {selected_ids}')
if len(set(selected_ids))!=len(selected_ids):raise ValueError('Duplicate room IDs')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for material in list(bpy.data.materials): bpy.data.materials.remove(material)
scene=bpy.context.scene; scene.render.engine='CYCLES'
prefs=bpy.context.preferences.addons['cycles'].preferences
prefs.compute_device_type='METAL';prefs.get_devices()
for device in prefs.devices: device.use=device.type=='METAL'
scene.cycles.device='GPU';scene.cycles.samples=args.samples
scene.cycles.use_denoising=True;scene.cycles.adaptive_threshold=args.adaptive_threshold
scene.cycles.max_bounces=10;scene.cycles.diffuse_bounces=6;scene.cycles.glossy_bounces=6;scene.cycles.transmission_bounces=8
scene.cycles.transparent_max_bounces=12;scene.cycles.sample_clamp_indirect=6
scene.render.threads_mode='AUTO';scene.render.film_transparent=False
scene.render.use_persistent_data=True
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=args.exposure
scene.render.image_settings.file_format='JPEG';scene.render.image_settings.quality=94
scene.render.resolution_percentage=100
images={}
def image_texture(nodes,links,entry,noncolor=False):
    path=os.path.join(folder,entry['file'])
    key=(path,noncolor)
    if key not in images:
        images[key]=bpy.data.images.load(path,check_existing=False)
        images[key].colorspace_settings.name='Non-Color' if noncolor else 'sRGB'
    tex=nodes.new('ShaderNodeTexImage');tex.image=images[key];tex.extension='REPEAT'
    coord=nodes.new('ShaderNodeTexCoord');matrix=entry.get('matrix',[1,0,0,0,1,0,0,0,1])
    # Matrix3 from Three.js acts on (u,v,1), preserving rotation, scale and offset.
    one=nodes.new('ShaderNodeVectorMath');one.operation='ADD';one.inputs[1].default_value=(0,0,1)
    links.new(coord.outputs['UV'],one.inputs[0])
    combine=nodes.new('ShaderNodeCombineXYZ')
    for axis,idx in [('X',0),('Y',1)]:
        dot=nodes.new('ShaderNodeVectorMath');dot.operation='DOT_PRODUCT';dot.inputs[1].default_value=(matrix[idx],matrix[3+idx],matrix[6+idx])
        links.new(one.outputs['Vector'],dot.inputs[0]);links.new(dot.outputs['Value'],combine.inputs[axis])
    links.new(combine.outputs[0],tex.inputs['Vector']);return tex

materials=[]
for entry in data['materials']:
    m=bpy.data.materials.new(f"{entry['id']:03d} {entry['name']}");m.use_nodes=True
    nodes=m.node_tree.nodes;links=m.node_tree.links;bs=nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=(*entry['color'],1)
    bs.inputs['Roughness'].default_value=entry['roughness'];bs.inputs['Metallic'].default_value=entry['metalness']
    if entry.get('transmission',0)>0:
        bs.inputs['Transmission Weight'].default_value=entry['transmission'];bs.inputs['IOR'].default_value=1.45
    if entry['map'] is not None:
        tex=image_texture(nodes,links,data['textures'][entry['map']]);mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;mix.inputs[2].default_value=(*entry['color'],1)
        links.new(tex.outputs['Color'],mix.inputs[1]);links.new(mix.outputs[0],bs.inputs['Base Color'])
    if entry['bumpMap'] is not None and entry['bumpScale']:
        tex=image_texture(nodes,links,data['textures'][entry['bumpMap']],True)
        bump=nodes.new('ShaderNodeBump');bump.inputs['Distance'].default_value=min(abs(entry['bumpScale']),.0007);bump.inputs['Strength'].default_value=.32
        links.new(tex.outputs['Color'],bump.inputs['Height']);links.new(bump.outputs['Normal'],bs.inputs['Normal'])
    if entry['normalMap'] is not None:
        tex=image_texture(nodes,links,data['textures'][entry['normalMap']],True)
        normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=entry['normalScale'][0]
        links.new(tex.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],bs.inputs['Normal'])
    if entry['roughnessMap'] is not None:
        tex=image_texture(nodes,links,data['textures'][entry['roughnessMap']],True)
        factor=nodes.new('ShaderNodeMath');factor.operation='MULTIPLY';factor.inputs[1].default_value=entry['roughness']
        links.new(tex.outputs['Color'],factor.inputs[0]);links.new(factor.outputs[0],bs.inputs['Roughness'])
    emission=max(entry['emissive'])
    if emission>0:
        bs.inputs['Emission Color'].default_value=(*entry['emissive'],1)
        bs.inputs['Emission Strength'].default_value=max(1.0,entry['emissiveIntensity'])*2
    if entry['transparent'] and entry['opacity']<.5:
        output=nodes.get('Material Output');trans=nodes.new('ShaderNodeBsdfTransparent');mix=nodes.new('ShaderNodeMixShader')
        is_glass=entry['roughness']<.2
        if is_glass:
            bs.inputs['Transmission Weight'].default_value=1;bs.inputs['IOR'].default_value=1.45
        mix.inputs[0].default_value=.09 if is_glass else entry['opacity']
        links.new(trans.outputs[0],mix.inputs[1]);links.new(bs.outputs[0],mix.inputs[2]);links.new(mix.outputs[0],output.inputs['Surface'])
    if 'fabric' in entry['name'] or entry.get('paletteRole') or entry['roughness']>.85:
        bs.inputs['Sheen Weight'].default_value=.12;bs.inputs['Sheen Roughness'].default_value=.75
    materials.append(m)

for i,entry in enumerate(data['meshes']):
    vertices=list(zip(*[iter(entry['positions'])]*3));indices=entry['indices'] or list(range(len(vertices)));faces=list(zip(*[iter(indices)]*3))
    mesh=bpy.data.meshes.new(entry['name']);mesh.from_pydata(vertices,[],faces);mesh.update()
    obj=bpy.data.objects.new(entry['name'],mesh);scene.collection.objects.link(obj)
    for material in entry['materials']:mesh.materials.append(materials[material])
    if len(entry['materials'])>1:
        for group in entry['groups']:
            start=group['start']//3;end=min(len(mesh.polygons),(group['start']+group['count'])//3)
            for face in mesh.polygons[start:end]:face.material_index=group['materialIndex']
    if entry['uv']:
        uv=mesh.uv_layers.new(name='UVMap');values=entry['uv']
        for loop in mesh.loops:uv.data[loop.index].uv=(values[loop.vertex_index*2],values[loop.vertex_index*2+1])
    for poly in mesh.polygons:poly.use_smooth=True
    if entry['normals']:
        normals=list(zip(*[iter(entry['normals'])]*3));mesh.normals_split_custom_set_from_vertices(normals)
    if i%100==0:print(f'Imported {i}/{len(data["meshes"])} meshes',flush=True)

def convert(p):return Vector((p[0],-p[2],p[1]))
def area(name,position,target,power,size,color=(1,.91,.78),shape='DISK',size_y=None):
    light=bpy.data.lights.new(name,'AREA');light.energy=power;light.color=color;light.shape=shape;light.size=size
    if size_y and shape=='RECTANGLE':light.size_y=size_y
    obj=bpy.data.objects.new(name,light);scene.collection.objects.link(obj);obj.location=convert(position);obj.rotation_euler=(convert(target)-obj.location).to_track_quat('-Z','Y').to_euler();return obj

# Window light enters the actual openings; all surfaces participate in GI.
# No invisible room-centre fill lights are imported from the real-time renderer.
world=bpy.data.worlds.new('Daylight outside the actual windows');world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.68,.78,1,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.40;scene.world=world
sun_data=bpy.data.lights.new('Low afternoon sunlight','SUN');sun_data.energy=2.0;sun_data.angle=math.radians(8);sun_data.color=(1,.86,.70)
sun=bpy.data.objects.new('Low afternoon sunlight',sun_data);scene.collection.objects.link(sun)
sun.location=convert((-1,9,24));sun.rotation_euler=(convert((3,0,8))-sun.location).to_track_quat('-Z','Y').to_euler()
area('South daylight', (2.25,2.0,17.9),(2.25,1.15,10.0),500,5.5,(.84,.91,1),'RECTANGLE',2.5)
area('East daylight', (11.0,2.0,7.0),(6.5,1.1,7.0),220,3.5,(.84,.91,1),'RECTANGLE',2)
area('North daylight', (5.0,2,-2),(5.0,1.1,2),220,5,(.84,.91,1),'RECTANGLE',2)
# These sources sit outside the actual small kitchen/bathroom windows. Their
# absence in the original living-only setup left those rooms without sky light.
area('Kitchen window daylight',(.94,1.6,2.22),(.94,1.1,4.2),35,.72,(.84,.91,1),'RECTANGLE',1.25)
area('Guest bathroom window daylight',(8.62,1.62,4.51),(6.7,1.05,4.51),30,.76,(.84,.91,1),'RECTANGLE',1.24)
area('Ensuite window daylight',(8.62,1.62,9.60),(6.6,1.05,9.60),32,.80,(.84,.91,1),'RECTANGLE',1.24)
area('Dining pendant', (2.25,1.98,8.65),(2.25,.78,8.65),14,.45,(1,.71,.42))
if args.style=='italian':
    area('Warm recessed cove',(.25,2.70,11.8),(.8,2.78,11.8),6,3.6,(1,.73,.47),'RECTANGLE',.06)

# Small rooms need actual functional lighting. Fixtures stay attached to the
# assumed 2.80m ceiling; their area lights cast shadows and participate in GI.
practical_specs={
    'kitchen':[{'position':[1.60,2.77,4.20],'diameter':.20,'power':18}],
    'bathroom':[{'position':[6.52,2.77,4.37],'diameter':.16,'power':12},{'position':[7.43,2.77,4.45],'diameter':.12,'power':4}],
    'ensuite':[{'position':[6.45,2.77,9.70],'diameter':.16,'power':12},{'position':[7.46,2.77,9.65],'diameter':.12,'power':4}],
}
practical_objects={}
for room_id,specs in practical_specs.items():
    objects=[]
    for index,spec in enumerate(specs):
        x,y,z=spec['position'];diameter=spec['diameter']
        bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=diameter/2+.012,depth=.024,location=convert((x,y+.018,z)))
        housing=bpy.context.object;housing.name=f'{room_id} functional downlight {index+1} housing'
        housing_material=bpy.data.materials.new(housing.name);housing_material.diffuse_color=(.48,.44,.38,1) if args.style=='italian' else (.74,.70,.61,1);housing.data.materials.append(housing_material)
        bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=diameter/2,depth=.004,location=convert((x,y+.006,z)))
        diffuser=bpy.context.object;diffuser.name=f'{room_id} functional downlight {index+1} diffuser'
        luminous=bpy.data.materials.new(diffuser.name);luminous.use_nodes=True
        shader=luminous.node_tree.nodes.get('Principled BSDF');shader.inputs['Base Color'].default_value=(1,.88,.71,1);shader.inputs['Emission Color'].default_value=(1,.88,.71,1);shader.inputs['Emission Strength'].default_value=6
        diffuser.data.materials.append(luminous)
        light=area(f'{room_id} functional downlight {index+1}',(x,y,z),(x,.75,z),spec['power'],diameter,(1,.88,.71))
        objects.extend([housing,diffuser,light])
    practical_objects[room_id]=objects

camera_data=bpy.data.cameras.new('Measured room viewpoint');camera=bpy.data.objects.new('Measured room viewpoint',camera_data);scene.collection.objects.link(camera);scene.camera=camera
camera_data.lens=22;camera_data.sensor_width=36;camera_data.clip_start=.06;camera_data.clip_end=200
panorama_folder=os.path.join(base,'public','panoramas');os.makedirs(panorama_folder,exist_ok=True)
manifest_path=os.path.join(panorama_folder,'manifest.json')
with open(manifest_path) as f:manifest=json.load(f)
run_id=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')

# Preserve existing living-room entries and images when rendering other rooms.
def image_info(path):
    with open(path,'rb') as f:content=f.read()
    image=bpy.data.images.load(path,check_existing=False);width,height=image.size;bpy.data.images.remove(image)
    return {'path':path,'width':width,'height':height,'bytes':len(content),'sha256':hashlib.sha256(content).hexdigest()}

def write_manifest(room,record):
    desktop=os.path.join(panorama_folder,f"{args.style}-{room['id']}-8k.jpg")
    mobile=os.path.join(panorama_folder,f"{args.style}-{room['id']}.jpg")
    preview=os.path.join(panorama_folder,f"{args.style}-{room['id']}-preview.jpg")
    generated={output['path'] for output in record['outputs']}
    if desktop not in generated or mobile not in generated:return
    if not all(os.path.exists(path) for path in [desktop,mobile,preview]):return
    high,low,thumb=[image_info(path) for path in [desktop,mobile,preview]]
    if (high['width'],high['height'])!=(8192,4096) or (low['width'],low['height'])!=(4096,2048):
        raise RuntimeError('Panorama dimensions must be genuine 8K and 4K before publication')
    entry={'url':f"panoramas/{os.path.basename(desktop)}",'preview':f"panoramas/{os.path.basename(preview)}",'width':high['width'],'height':high['height'],'bytes':high['bytes'],'sha256':high['sha256'],
        'mobileUrl':f"panoramas/{os.path.basename(mobile)}",'mobileWidth':low['width'],'mobileHeight':low['height'],'mobileBytes':low['bytes'],'mobileSha256':low['sha256'],'previewSha256':thumb['sha256'],
        'samples':args.samples,'adaptiveThreshold':args.adaptive_threshold,'exposure':record['exposure'],'mobileSource':'Blender downsample of the finished 8K JPEG','record':f"artifacts/cycles/{args.style}/rooms/{room['id']}/{args.mode}-{run_id}.json"}
    viewpoint=next((view for view in manifest['viewpoints'] if view['id']==room['id']),None)
    if viewpoint is None:
        position=room['camera']['threePosition'];target=room['camera']['threeTarget'];dx=target[0]-position[0];dy=target[1]-position[1];dz=target[2]-position[2]
        viewpoint={'id':room['id'],'name':room['name'],'camera':position,'target':target,'centerHeadingThree':[dx,0,dz],'initialPitchDegrees':round(math.degrees(math.atan2(dy,math.hypot(dx,dz))),3),'styles':{}}
        manifest['viewpoints'].append(viewpoint)
    viewpoint['styles'][args.style]=entry
    manifest['viewpoints'].sort(key=lambda view:list(room_by_id).index(view['id']))
    manifest['generatedAt']=datetime.now(timezone.utc).isoformat()
    manifest['displayTransform']='AgX / sRGB; exposure per room style metadata; disable additional Three.js tone mapping'
    manifest['interaction']='Select a room, then rotate and zoom at its fixed viewpoint. Use the real-time model to walk or edit materials.'
    temporary=manifest_path+'.tmp'
    with open(temporary,'w') as f:json.dump(manifest,f,ensure_ascii=False,indent=2)
    os.replace(temporary,manifest_path)

for room_id in selected_ids:
    room=room_by_id[room_id];position=room['camera']['threePosition'];target_three=room['camera']['threeTarget']
    camera.location=convert(position);target=convert(target_three)
    camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
    room_folder=os.path.join(folder,'rooms',room_id);os.makedirs(room_folder,exist_ok=True)
    outputs=[];started=time.time()
    scene.view_settings.exposure=args.exposure
    for lighting_room,objects in practical_objects.items():
        for obj in objects:obj.hide_render=lighting_room!=room_id
    print(json.dumps({'event':'room-start','style':args.style,'room':room_id,'camera':position,'target':target_three,'samples':args.samples,'adaptiveThreshold':args.adaptive_threshold}),flush=True)
    for mode in (['preview','panorama'] if args.mode=='both' else [args.mode]):
        if mode=='panorama':
            camera_data.type='PANO';camera_data.panorama_type='EQUIRECTANGULAR'
            camera.rotation_euler=convert((target_three[0]-position[0],0,target_three[2]-position[2])).to_track_quat('-Z','Y').to_euler()
            scene.render.resolution_x=args.width;scene.render.resolution_y=args.width//2
            suffix='-8k' if args.width==8192 else f'-{args.width}' if args.width>4096 else ''
            path=os.path.join(panorama_folder,f'{args.style}-{room_id}{suffix}.jpg')
        else:
            camera_data.type='PERSP';camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
            width=args.preview_width if args.mode=='both' else args.width
            scene.render.resolution_x=width;scene.render.resolution_y=round(width*9/16)
            path=os.path.join(room_folder,f'preview-{run_id}.jpg')
        scene.render.filepath=path;render_started=time.time()
        result=bpy.ops.render.render(write_still=True)
        if 'FINISHED' not in result or not os.path.exists(path) or os.path.getmtime(path)<render_started-.1:
            raise RuntimeError(f'Render cancelled or output not written: {path}')
        output=image_info(path);outputs.append(output)
        print(json.dumps({'event':'image-saved','style':args.style,'room':room_id,'mode':mode,**output,'seconds':round(time.time()-render_started,2)}),flush=True)
        if mode=='preview':
            shutil.copyfile(path,os.path.join(room_folder,'preview.jpg'))
            if args.mode=='both' or not os.path.exists(os.path.join(panorama_folder,f'{args.style}-{room_id}-8k.jpg')):
                shutil.copyfile(path,os.path.join(panorama_folder,f'{args.style}-{room_id}-preview.jpg'))
        elif args.mobile_panorama and args.width>4096:
            # A single high-resolution path trace supplies both display sizes.
            # Loading the display-referred JPEG and saving it as sRGB avoids
            # applying AgX twice; this is downsampling, never upscaling to 8K.
            image=bpy.data.images.load(path,check_existing=False);image.scale(4096,2048)
            mobile_path=os.path.join(panorama_folder,f'{args.style}-{room_id}.jpg')
            image.filepath_raw=mobile_path;image.file_format='JPEG';image.save();bpy.data.images.remove(image)
            mobile_output=image_info(mobile_path);mobile_output['derivedFromSha256']=output['sha256'];outputs.append(mobile_output)
            print(json.dumps({'event':'mobile-downsampled','style':args.style,'room':room_id,**mobile_output}),flush=True)
    record={'status':'completed','style':args.style,'palette':'burgundy','room':room_id,'light':'day','renderer':'Blender '+bpy.app.version_string+' / Cycles / Metal','samples':args.samples,'adaptiveThreshold':args.adaptive_threshold,'denoising':True,
        'camera':room['camera'],'coordinates':data['coordinates'],'sourceHashes':data.get('sourceHashes',{}),'panoramaForwardThree':[target_three[0]-position[0],0,target_three[2]-position[2]],
        'outputs':outputs,'seconds':round(time.time()-started,2),'exposure':scene.view_settings.exposure,'functionalLighting':practical_specs.get(room_id,[]),'functionalLightingNote':'Proposed flush ceiling fixtures, radiometric Blender area-light watts; not electrical input wattage. All lights cast shadows.',
        'scope':'Same architectural and furniture geometry. Fixed room viewpoint; rotate and zoom. Added daylight sources remain outside the actual kitchen and bathroom windows. Kitchen and bathroom functional lighting is a lighting-design addition.'}
    with open(os.path.join(room_folder,f'{args.mode}-{run_id}.json'),'w') as f:json.dump(record,f,ensure_ascii=False,indent=2)
    write_manifest(room,record)
    print(json.dumps({'event':'room-complete','style':args.style,'room':room_id,'seconds':record['seconds'],'outputs':len(outputs)}),flush=True)
print(json.dumps({'event':'batch-complete','style':args.style,'rooms':selected_ids}),flush=True)
