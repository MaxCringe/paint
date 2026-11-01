#!/usr/bin/env python3
"""Generate Fiona's rig-calibrated TEST run. Requires numpy.

Source FBX has an asymmetric exported bind pose (+39.57/-39.57 degree legs).
The previous sine animation added identical offsets TO that pose and therefore
could not create a symmetric stride. This script authors absolute local targets
and bakes quaternion offsets from each measured FBX rest orientation.
The previous run stays in motions.json.gz as the A/B reference.
"""
from pathlib import Path
import gzip, hashlib, json, math
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
MODEL = ROOT / 'public/models/fiona/rigged-model (1) (1).fbx'
OUT = ROOT / 'public/models/fiona/animations/run-calibrated.json.gz'
EXPECTED_BLOB = '3745db9b6eecde2fa2f865f61e3e85481f13e514'
# Euler XYZ, degrees, measured from this exact binary FBX's Model/Properties70.
BIND = {
 'Hips':[-0.019702,-0.864967,0.787322],
 'Spine':[12.995164,0.660909,-0.170608],
 'Spine1':[4.290024,0.189802,0.014238],
 'Spine2':[3.510013,0.155437,0.009534],
 'Neck':[-3.899999,0,0],
 'Head':[-10.399914,-0.042633,-0.232292],
 'LeftUpLeg':[39.566755,0,0], 'RightUpLeg':[-39.566755,0,0],
 'LeftLeg':[1.13282,0,0], 'RightLeg':[10.721284,0,0],
 'LeftFoot':[-7.414774,0,0], 'RightFoot':[15.487723,0,0],
 'LeftToeBase':[-30.094611,0,0], 'RightToeBase':[0,0,0],
 'LeftArm':[-36.401331,-7.113974,-6.976221],
 'RightArm':[34.049323,-4.257373,9.002773],
 'LeftForeArm':[-7.101673,-5.951665,-12.222289],
 'RightForeArm':[-30.257082,10.286832,8.905264]
}
def mul(a,b):
 x1,y1,z1,w1=a; x2,y2,z2,w2=b
 return np.array([w1*x2+x1*w2+y1*z2-z1*y2,
                  w1*y2-x1*z2+y1*w2+z1*x2,
                  w1*z2+x1*y2-y1*x2+z1*w2,
                  w1*w2-x1*x2-y1*y2-z1*z2],dtype=float)
def quat(degrees):
 x,y,z=np.deg2rad(degrees)/2
 qx=np.array([np.sin(x),0,0,np.cos(x)])
 qy=np.array([0,np.sin(y),0,np.cos(y)])
 qz=np.array([0,0,np.sin(z),np.cos(z)])
 q=mul(mul(qx,qy),qz)
 return q/np.linalg.norm(q)
def offset(bind,target):
 q=quat(bind); delta=mul(np.array([-q[0],-q[1],-q[2],q[3]]),quat(target))
 return [round(float(v),6) for v in delta/np.linalg.norm(delta)]

def generate():
 binary=MODEL.read_bytes()
 blob=hashlib.sha1(f'blob {len(binary)}\0'.encode()+binary).hexdigest()
 if blob!=EXPECTED_BLOB:
  raise ValueError('FBX changed: recalibrate bone rest angles before generation.')
 frames=[]
 for t in np.linspace(0,1,25):
  phase=2*math.pi*float(t);s=math.sin(phase);c=math.cos(phase)
  bend=lambda n:max(0,n)**1.6
  knee_l=7+62*bend(-math.sin(phase-.08))
  knee_r=7+62*bend(math.sin(phase-.08))
  ankle_l=-3.5+12*c+20*s+8.5*math.cos(2*phase)
  ankle_r=-3.5-12*c-20*s+8.5*math.cos(2*phase)
  # Absolute local FBX targets (degrees), NOT offsets from a crooked pose.
  target={
   'Hips':[0,6.5*s,2.5*s],
   'Spine':[10.5,-4.8*s,-1.8*s],
   'Spine1':[4.4,-2*s,-.7*s],
   'Spine2':[3.5,-1.1*s,-.5*s],
   'Neck':[-3.9,s,0],
   'Head':[-10.4,1.3*s,.65*s],
   'LeftUpLeg':[-34*c,0,0], 'RightUpLeg':[34*c,0,0],
   'LeftLeg':[knee_l,0,0], 'RightLeg':[knee_r,0,0],
   'LeftFoot':[ankle_l,0,0], 'RightFoot':[ankle_r,0,0],
   'LeftToeBase':[-7+4*math.sin(phase-.2),0,0],
   'RightToeBase':[-7-4*math.sin(phase-.2),0,0],
   'LeftArm':[30*c,-1.4-3*s,-9],
   'RightArm':[-30*c,1.4+3*s,9],
   'LeftForeArm':[-18-12*c,-7,-11],
   'RightForeArm':[-18+12*c,7,11]
  }
  bones={name:offset(BIND[name],rotation) for name,rotation in target.items()}
  lift=1.25*math.sin(2*phase)**2  # Tiny local hip bounce, in FBX centimeters.
  frames.append([round(float(t),6),bones,round(lift,5)])
 data={
  'schema':1,'mode':'fiona-rig-local-quaternion-delta',
  'sourceBlob':EXPECTED_BLOB,'name':'runCalibrated',
  'duration':.70,'frames':frames,
  'notes':'Procedural Python/NumPy, calibrated against exported FBX bone orientation. Visual trial only.'
 }
 OUT.parent.mkdir(parents=True,exist_ok=True)
 payload=(json.dumps(data,separators=(',',':'),ensure_ascii=False)+'\n').encode()
 OUT.write_bytes(gzip.compress(payload,compresslevel=9,mtime=0))
 print(f'Generated {len(frames)} frames: {OUT} ({OUT.stat().st_size} bytes)')
 return data
if __name__=='__main__':
 generate()
