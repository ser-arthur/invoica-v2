"""Writes the guilloché rosettes, the bands and the seal mark as SVG files to the folder given.

Usage: python3 guilloche.py <folder>
"""
import math, sys
from pathlib import Path
OUT=Path(sys.argv[1]); OUT.mkdir(exist_ok=True, parents=True)
BLEND=[('0','#CFF26A'),('0.4','#37C66B'),('0.7','#6CE4A2'),('1','#138C86')]
def grad(gid,x1,y1,x2,y2):
    return f'<linearGradient id="{gid}" gradientUnits="userSpaceOnUse" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}">'+''.join(f'<stop offset="{o}" stop-color="{c}"/>' for o,c in BLEND)+'</linearGradient>'
def P(pts,close=True): return 'M'+' L'.join(f'{x:.1f},{y:.1f}' for x,y in pts)+(' Z' if close else '')
def svg(w,h,defs,body): return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}"><defs>{defs}</defs>{body}</svg>'
def strokes(ps,stroke,wid,op): return ''.join(f'<path d="{d}" fill="none" stroke="{stroke}" stroke-width="{wid}" stroke-opacity="{op}"/>' for d in ps)
def hypo(cx,cy,R,r,d,rot,steps=3000):
    # hypotrochoid, closes after lcm turns
    from math import gcd
    turns = r//gcd(R,r)
    pts=[]
    for s in range(steps+1):
        t=2*math.pi*turns*s/steps
        x=(R-r)*math.cos(t)+d*math.cos((R-r)/r*t)
        y=(R-r)*math.sin(t)-d*math.sin((R-r)/r*t)
        c,sn=math.cos(rot),math.sin(rot)
        pts.append((cx+x*c-y*sn, cy+x*sn+y*c))
    return P(pts)
def ring(cx,cy,r0,a,k,lines,spread,steps=900):
    out=[]
    for i in range(lines):
        ph=i*spread
        pts=[]
        for s in range(steps+1):
            t=2*math.pi*s/steps
            r=r0+a*math.sin(k*t+ph)
            pts.append((cx+r*math.cos(t),cy+r*math.sin(t)))
        out.append(P(pts))
    return out
# Rosette: an outer woven ring (many phase-shifted waves) and an inner spirograph flower.
paths = ring(300,300,240,24,14,12,2*math.pi/12) + ring(300,300,176,18,11,10,2*math.pi/10) + ring(300,300,116,14,8,8,2*math.pi/8)
inner = ring(300,300,62,10,6,6,2*math.pi/6)
for name,op in (('rosette-dark.svg',0.5),('rosette-light.svg',0.62)):
    (OUT/name).write_text(svg(600,600,grad('g',40,40,560,560),strokes(paths,'url(#g)',0.7,op)+strokes(inner,'url(#g)',0.7,op)))
# Band: a woven ribbon, tight and regular, as on a cheque.
def band(y0,lines,a,k,spread,x0=0,x1=1600,steps=800):
    out=[]
    for i in range(lines):
        ph=i*spread
        pts=[]
        for s in range(steps+1):
            x=x0+(x1-x0)*s/steps; u=x/(x1-x0)*2*math.pi
            y=y0+a*math.sin(k*u+ph)
            pts.append((x,y))
        out.append(P(pts,False))
    return out
b=band(60,12,28,16,2*math.pi/12)
for name,op in (('band-light.svg',0.6),('band-dark.svg',0.5)):
    (OUT/name).write_text(svg(1600,120,grad('g',0,0,1600,0),strokes(b,'url(#g)',0.7,op)))
print('ok')

# The seal: a ring and a woven band, with room in the middle for the i.
seal = ring(60,60,46,3.2,10,6,2*math.pi/6,steps=480)
for name,bg in (('mark-seal.svg',None),):
    body = '<circle cx="60" cy="60" r="56" fill="none" stroke="url(#s)" stroke-width="4"/>' + strokes(seal,'url(#s)',1.1,0.95)
    (OUT/name).write_text(svg(120,120,grad('s',8,8,112,112),body))
print('seal')
