#!/usr/bin/env python3
"""Generate 23 original Fiona skeletal animations with NumPy, not Mixamo.

The resulting motions are local Euler *offsets* around FBX bind pose. They
do not translate the character root or scale any mesh.
Run: python tools/generate_fiona_motions.py
Requires: pip install numpy
"""
import gzip
import json
from pathlib import Path
from math import pi
import numpy as np

OUT=Path(__file__).resolve().parents[1]/'public/models/fiona/animations/motions.json.gz'
def P(**bones):
 return {bone:[round(float(v),3) for v in xyz] for bone,xyz in bones.items()}
def M(sec,loop,*frames):
 return {'d':sec,'l':int(loop),'f':[[round(float(t),3),v] for t,v in frames]}
def F(t,**bones):
 return (t,P(**bones))

O={}
C=P(Spine=[.59,0,0],Spine1=[.18,0,0],LeftUpLeg=[-1,0,0],RightUpLeg=[-1,0,0],LeftLeg=[1.2,0,0],RightLeg=[1.2,0,0],LeftArm=[.5,0,-.18],RightArm=[.5,0,.18])
B=P(Spine=[-.22,0,0],LeftArm=[-.83,0,-.25],RightArm=[-.83,0,.25],LeftForeArm=[-.42,0,0],RightForeArm=[-.42,0,0],LeftUpLeg=[-.58,0,0],RightUpLeg=[-.58,0,0],LeftLeg=[.64,0,0],RightLeg=[.64,0,0])
# Power-levitation pose: the rig rests close to a T-pose, so keep the
# shoulder Z rotation SMALL to spread arms sideways rather than push
# them in front of the chest. Elbows remain soft; wrists open outward.
V=P(Spine=[-.085,0,0],Spine1=[-.065,0,0],Head=[.035,0,0],
 LeftArm=[-.075,.10,-.22],RightArm=[-.075,-.10,.22],
 LeftForeArm=[-.09,.045,-.16],RightForeArm=[-.09,-.045,.16],
 LeftHand=[.06,.10,-.09],RightHand=[.06,-.10,.09],
 LeftUpLeg=[.08,0,-.045],RightUpLeg=[-.045,0,.045],
 LeftLeg=[.16,0,0],RightLeg=[.11,0,0])
D=P(Spine=[.86,0,.19],Spine1=[.35,0,.12],Head=[.12,0,0],LeftUpLeg=[-.7,0,0],RightUpLeg=[-.7,0,0],LeftLeg=[.96,0,0],RightLeg=[.96,0,0])
run=[]
for t in np.linspace(0,1,9):
 phase=2*pi*float(t)
 s=float(np.sin(phase))
 run.append(F(t,Spine=[-.09+float(np.cos(2*phase))*.025,0,float(np.sin(phase))*.032],Spine1=[-.025,0,-float(np.sin(phase))*.023],
  LeftUpLeg=[s*.57,0,0],RightUpLeg=[-s*.57,0,0],LeftLeg=[max(0,-s)*.36,0,0],RightLeg=[max(0,s)*.36,0,0],
  LeftArm=[-s*.43,0,-.09],RightArm=[s*.43,0,.09],LeftForeArm=[-.16,0,0],RightForeArm=[-.16,0,0],
  LeftFoot=[max(0,s)*.14,0,0],RightFoot=[max(0,-s)*.14,0,0]))
O['run']=M(.74,True,*run)
O['idle']=M(2,True,F(0,Spine=[0,0,0]),F(.5,Spine=[.025,0,0],Spine1=[.014,0,0]),F(1,Spine=[0,0,0]))
O['jump']=M(.75,False,(0,{}),F(.14,Spine=[.18,0,0],LeftUpLeg=[-.4,0,0],RightUpLeg=[-.4,0,0],LeftLeg=[.32,0,0],RightLeg=[.32,0,0],LeftArm=[-.45,0,-.28],RightArm=[-.45,0,.28]),F(.39,Spine=[-.18,0,0],LeftUpLeg=[-.36,0,0],RightUpLeg=[-.4,0,0],LeftArm=[-.85,0,-.31],RightArm=[-.85,0,.31]),F(.78,Spine=[-.08,0,0],LeftUpLeg=[-.2,0,0],RightUpLeg=[-.24,0,0],LeftArm=[-.48,0,-.21],RightArm=[-.48,0,.21]),(1,{}))
O['doubleJump']=M(.76,False,(0,{}),F(.2,Spine=[-.15,0,0],LeftUpLeg=[-.62,0,0],RightUpLeg=[-.55,0,0],LeftLeg=[.65,0,0],RightLeg=[.65,0,0],LeftArm=[-.85,0,-.5],RightArm=[-.85,0,.5]),F(.62,Spine=[-.09,0,0],LeftUpLeg=[-.35,0,0],RightUpLeg=[-.31,0,0],LeftArm=[-.46,0,-.36],RightArm=[-.46,0,.36]),(1,{}))
O['moveLeft']=M(.32,False,(0,{}),F(.35,Spine=[0,0,.22],Spine1=[0,0,.10],LeftArm=[-.17,0,-.18]),F(.7,Spine=[0,0,.11]),(1,{}))
O['moveRight']=M(.32,False,(0,{}),F(.35,Spine=[0,0,-.22],Spine1=[0,0,-.10],RightArm=[-.17,0,.18]),F(.7,Spine=[0,0,-.11]),(1,{}))
O['land']=M(.27,False,F(0,Spine=[.2,0,0],LeftUpLeg=[-.28,0,0],RightUpLeg=[-.28,0,0],LeftLeg=[.36,0,0],RightLeg=[.36,0,0]),F(.45,Spine=[.1,0,0],LeftLeg=[.12,0,0],RightLeg=[.12,0,0]),(1,{}))
O['slide']=M(.84,True,(0,C),(.5,P(**{**C,'Spine':[.63,0,.025]})),(1,C))
O['slideEnd']=M(.37,False,(0,C),F(.45,Spine=[.22,0,0],LeftUpLeg=[-.52,0,0],RightUpLeg=[-.52,0,0],LeftLeg=[.57,0,0],RightLeg=[.57,0,0]),(1,{}))
O['slip']=M(.72,True,F(0,Spine=[0,0,.15],LeftArm=[-.51,0,-.6],RightArm=[-.51,0,.6]),F(.5,Spine=[0,0,-.15],LeftArm=[-.53,0,-.3],RightArm=[-.53,0,.94]),F(1,Spine=[0,0,.15],LeftArm=[-.51,0,-.6],RightArm=[-.51,0,.6]))
O['broomStart']=M(.59,False,(0,{}),(.65,B),(1,B))
O['broomFly']=M(1.3,True,(0,B),(.5,P(**{**B,'Spine':[-.19,0,.02]})),(1,B))
O['broomDuck']=M(.94,True,(0,P(**{**B,'Spine':[.48,0,0],'Spine1':[.32,0,0],'Head':[.20,0,0]})),(.5,P(**{**B,'Spine':[.52,0,0],'Spine1':[.36,0,0],'Head':[.23,0,0]})),(1,P(**{**B,'Spine':[.48,0,0],'Spine1':[.32,0,0],'Head':[.20,0,0]})))
O['broomLand']=M(.48,False,(0,B),F(.5,Spine=[-.11,0,0],LeftArm=[-.28,0,-.1],RightArm=[-.28,0,.1],LeftUpLeg=[-.18,0,0],RightUpLeg=[-.18,0,0]),(1,{}))
# Three stages of a controlled show of power. The shoulder keys grow
# sideways into a strong open silhouette with minimal forward reach.
# Durations stay synchronized with src/player/UltimateFlight.js.
O['ultimateStart']=M(.72,False,
 (0,{}),
 F(.18,Spine=[.07,0,0],Spine1=[-.02,0,0],LeftArm=[-.16,0,-.32],RightArm=[-.16,0,.32],LeftUpLeg=[-.12,0,0],RightUpLeg=[-.12,0,0]),
 F(.48,Spine=[-.05,0,0],Spine1=[-.05,0,0],Head=[.025,0,0],
   LeftArm=[-.09,.07,-.43],RightArm=[-.09,-.07,.43],
   LeftForeArm=[-.11,.02,-.14],RightForeArm=[-.11,-.02,.14],
   LeftHand=[.03,.06,-.06],RightHand=[.03,-.06,.06],
   LeftUpLeg=[.035,0,-.02],RightUpLeg=[-.035,0,.02]),
 F(.80,**{**V,'LeftArm':[-.085,.10,-.24],'RightArm':[-.085,-.10,.24]}),
 (1,V))
# A slow, nearly still hover conveys authority; no exaggerated arm flapping.
O['ultimateFly']=M(2.6,True,
 (0,V),
 F(.25,**{**V,'Spine':[-.095,0,.008],'Spine1':[-.078,0,.004],
   'LeftArm':[-.065,.105,-.18],'RightArm':[-.082,-.10,.20],
   'LeftForeArm':[-.085,.045,-.15],'RightForeArm':[-.10,-.045,.16],
   'LeftHand':[.07,.105,-.10],'RightHand':[.05,-.10,.08]}),
 F(.50,**{**V,'Spine':[-.075,0,0],'Spine1':[-.058,0,0],
   'LeftArm':[-.080,.10,-.23],'RightArm':[-.065,-.105,.18],
   'LeftForeArm':[-.095,.04,-.17],'RightForeArm':[-.08,-.045,.14],
   'LeftHand':[.06,.09,-.09],'RightHand':[.07,-.11,.09],
   'RightUpLeg':[-.035,0,.045],'LeftLeg':[.14,0,0]}),
 F(.75,**{**V,'Spine':[-.095,0,-.008],'Spine1':[-.075,0,-.004],
   'LeftArm':[-.075,.095,-.19],'RightArm':[-.075,-.10,.22],
   'LeftForeArm':[-.09,.045,-.15],'RightForeArm':[-.09,-.04,.16],
   'LeftHand':[.055,.10,-.085],'RightHand':[.06,-.10,.085]}),
 (1,V))
# Arms relax back into a running stance only after the magical landing.
O['ultimateEnd']=M(.60,False,
 (0,V),
 F(.40,Spine=[-.035,0,0],Spine1=[-.035,0,0],Head=[.025,0,0],
   LeftArm=[-.13,.06,-.47],RightArm=[-.13,-.06,.47],
   LeftForeArm=[-.13,.025,-.17],RightForeArm=[-.13,-.025,.17],
   LeftHand=[.03,.04,-.05],RightHand=[.03,-.04,.05],
   LeftUpLeg=[-.05,0,0],RightUpLeg=[-.05,0,0],LeftLeg=[.16,0,0],RightLeg=[.15,0,0]),
 F(.78,Spine=[.105,0,0],Head=[.02,0,0],
   LeftArm=[-.24,0,-.40],RightArm=[-.24,0,.40],
   LeftForeArm=[-.14,0,0],RightForeArm=[-.14,0,0],
   LeftUpLeg=[-.20,0,0],RightUpLeg=[-.20,0,0],
   LeftLeg=[.32,0,0],RightLeg=[.32,0,0]),
 F(1,Spine=[-.06,0,0],Head=[.025,0,0],
   LeftArm=[-.26,0,-.33],RightArm=[-.26,0,.33],
   LeftForeArm=[-.12,0,0],RightForeArm=[-.12,0,0],
   LeftUpLeg=[-.12,0,0],RightUpLeg=[.12,0,0],
   LeftLeg=[.10,0,0],RightLeg=[.06,0,0]))
O['soulPickup']=M(.29,False,(0,{}),F(.47,RightArm=[-.31,0,.22],RightForeArm=[-.4,0,0]),(1,{}))
O['hatPickup']=M(.56,False,(0,{}),F(.52,RightArm=[-1.03,0,.25],RightForeArm=[-.68,0,0],Head=[-.07,0,0]),(1,{}))
O['scarfPickup']=M(.64,False,(0,{}),F(.56,Spine=[.20,0,0],RightArm=[-.67,0,.32],RightForeArm=[-.54,0,0]),(1,{}))
O['hitTree']=M(.54,False,(0,{}),F(.26,Spine=[.39,0,-.15],Spine1=[.20,0,0],Head=[.17,0,0],LeftArm=[-1,0,-.4],RightArm=[-.98,0,.44]),F(1,Spine=[.25,0,-.02],Head=[-.04,0,0]))
O['death']=M(1.36,False,(0,{}),F(.32,Spine=[.42,0,0],LeftArm=[-.66,0,-.43],RightArm=[-.66,0,.43]),(.76,D),(1,P(**{**D,'Spine':[1.1,0,.19]})))
O['revive']=M(1.16,False,(0,P(**{**D,'Spine':[1.1,0,.19]})),(.55,C),F(.85,Spine=[.12,0,0],LeftUpLeg=[-.18,0,0],RightUpLeg=[-.18,0,0]),(1,{}))

assert len(O)==23
for name,motion in O.items():
 times=[t for t,_ in motion['f']]
 assert times[0]==0 and times[-1]==1 and all(a<b for a,b in zip(times,times[1:])),name
 for _,poses in motion['f']:
  for xyz in poses.values():
   assert len(xyz)==3 and all(np.isfinite(v) and abs(v)<3.2 for v in xyz),name
OUT.parent.mkdir(parents=True,exist_ok=True)
data=json.dumps({'schema':1,'author':'python-numpy','motions':O},ensure_ascii=False,separators=(',',':'))+'\n'
OUT.write_bytes(gzip.compress(data.encode('utf-8'),compresslevel=9,mtime=0))
print(f'Generated {len(O)} motions -> {OUT} ({OUT.stat().st_size} bytes)')
