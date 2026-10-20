import math, os, json
from fonts import text_path
import sys as _s; OUT=_s.argv[1] if len(_s.argv)>1 else 'out'
f=lambda v:('%.2f'%v).rstrip('0').rstrip('.')
def circle(cx,cy,r): return f'M{f(cx-r)},{f(cy)}A{f(r)},{f(r)} 0 1,0 {f(cx+r)},{f(cy)}A{f(r)},{f(r)} 0 1,0 {f(cx-r)},{f(cy)}Z'
def ellipse(cx,cy,rx,ry): return f'M{f(cx-rx)},{f(cy)}A{f(rx)},{f(ry)} 0 1,0 {f(cx+rx)},{f(cy)}A{f(rx)},{f(ry)} 0 1,0 {f(cx-rx)},{f(cy)}Z'
def rrect(x,y,w,h,r):
    r=min(r,w/2,h/2)
    return (f'M{f(x+r)},{f(y)}L{f(x+w-r)},{f(y)}A{f(r)},{f(r)} 0 0,1 {f(x+w)},{f(y+r)}L{f(x+w)},{f(y+h-r)}'
            f'A{f(r)},{f(r)} 0 0,1 {f(x+w-r)},{f(y+h)}L{f(x+r)},{f(y+h)}A{f(r)},{f(r)} 0 0,1 {f(x)},{f(y+h-r)}'
            f'L{f(x)},{f(y+r)}A{f(r)},{f(r)} 0 0,1 {f(x+r)},{f(y)}Z')
def star4(x,y,s,k=.18):
    i=s*k
    return f'M{f(x)},{f(y-s)}Q{f(x+i)},{f(y-i)} {f(x+s)},{f(y)}Q{f(x+i)},{f(y+i)} {f(x)},{f(y+s)}Q{f(x-i)},{f(y+i)} {f(x-s)},{f(y)}Q{f(x-i)},{f(y-i)} {f(x)},{f(y-s)}Z'
def xf(d,fn):
    """transform pair-only absolute path (M L C Q Z)"""
    import re
    out=[];toks=re.findall(r'[MLCQZ]|-?[\d.]+',d);i=0;nums=[]
    for t in toks:
        if t.isalpha():
            out.append(t)
        else: nums.append(float(t))
        if len(nums)==2:
            x,y=fn(*nums);out.append(f'{f(x)},{f(y)} ');nums=[]
    return ''.join(out)
def lin(x1,y1,x2,y2,*stops): return ('lin',x1,y1,x2,y2,stops)
def rad(cx,cy,r,*stops): return ('rad',cx,cy,r,stops)
def P(d,fill=None,a=1,eo=False,stroke=None,sw=0): return dict(d=d,fill=fill,a=a,eo=eo,stroke=stroke,sw=sw)

# ---------- concepts ----------
def coin():
    bg=[P('M0,0L108,0L108,108L0,108Z',rad(38,26,100,(0,'#ff7cc4'),(.42,'#b13cff'),(1,'#2c0a55')))]
    cx,cy=54,56
    for k in range(12):
        a0=math.radians(k*30-90);a1=a0+math.radians(14)
        bg.append(P(f'M{cx},{cy}L{f(cx+90*math.cos(a0))},{f(cy+90*math.sin(a0))}L{f(cx+90*math.cos(a1))},{f(cy+90*math.sin(a1))}Z','#ffffff',.09))
    for (x,y,r,c) in [(24,30,2.4,'#ffe14d'),(86,78,2.2,'#2ee6d6'),(28,82,1.8,'#ffffff'),(84,26,1.6,'#2ee6d6')]:
        bg.append(P(circle(x,y,r),c,.9))
    fg=[P(circle(cx,cy+4,27.5),'#b85a00'),
        P(circle(cx,cy,27.5),lin(0,cy-27.5,0,cy+27.5,(0,'#fff3b0'),(.45,'#ffc61f'),(1,'#f08c00'))),
        P(circle(cx,cy+1,21.5),'#d97800'),
        P(circle(cx,cy+1.6,21),lin(0,cy-22,0,cy+24,(0,'#ffa400'),(1,'#ffdf5c'))),]
    t,w=text_path('titan','100',15,cx,cy+2.2)
    fg+= [P(text_path('titan','100',15,cx,cy+3.6)[0],'#fff2b8'),P(t,'#6e2e00')]
    fg+= [P(ellipse(44,35.5,9,3.4),'#ffffff',.65),P(star4(78,32,6),'#ffffff')]
    mono=[P(circle(cx,cy,27.5)+circle(cx,cy+1,21.5),'#000000',eo=True),P(t,'#000000'),P(star4(78,32,6),'#000000')]
    return dict(key='coin',name='A 金币 100',bg=bg,fg=fg,mono=mono,
      note='街机投币的金币，正面压印“100”。暗紫+粉色放射光作底，像开局时的闪光；金币圆形在 48px 下最好认。')
def pad():
    bg=[P('M0,0L108,0L108,108L0,108Z',lin(0,0,108,108,(0,'#3ef0ff'),(.5,'#4f6bff'),(1,'#7a35ff')))]
    for i in range(7):
        for j in range(7):
            if (i+j)%2==0: bg.append(P(circle(6+i*16,6+j*16,2),'#ffffff',.16))
    s=.8; T=lambda x,y:(54+(x-54)*s,63+(y-62)*s)
    body='M34,44L74,44C83,44 88,50 89,59L91,71C92,79 86,84 80,82C76,81 73,77 70,73L38,73C35,77 32,81 28,82C22,84 16,79 17,71L19,59C20,50 25,44 34,44Z'
    B=xf(body,T); Bl=xf(body,lambda x,y:T(x,y+5))
    fg=[P(Bl,'#9e0f4c'),P(B,lin(0,47,0,82,(0,'#ffa9d6'),(.55,'#ff3d9a'),(1,'#e0207f'))),
        P(xf('M30,48.5L78,48.5L78,51.5L30,51.5Z',T),'#ffffff',.0)]
    gx,gy=T(31,47.5); fg.append(P(rrect(gx,gy,46*s,5*s,2.5*s),'#ffffff',.38))
    dx,dy=T(37,60)
    for (ox,oy) in [(0,1.4),(0,0)]:
        col='#c43c86' if oy else '#ffffff'
        fg.append(P(rrect(dx-7,dy-2.3+oy,14,4.6,1.6)+rrect(dx-2.3,dy-7+oy,4.6,14,1.6),col))
    bx,by=T(71,60)
    for (ox,oy,c,e) in [(0,-5,'#ffd23a','#c47a00'),(5,0,'#38f0e0','#0b8f86'),(-5,0,'#8dff6a','#2c9b2c'),(0,5,'#b98bff','#5a2ab8')]:
        fg+=[P(circle(bx+ox,by+oy+1.1,3.2),e),P(circle(bx+ox,by+oy,3.2),c),P(circle(bx+ox-1,by+oy-1.1,1),'#ffffff',.85)]
    # 100 badge
    fg+=[P(rrect(38,25.5,32,15,7.5),'#c97400'),P(rrect(38,23.5,32,15,7.5),lin(0,23.5,0,38.5,(0,'#fff0a0'),(.5,'#ffcf33'),(1,'#ffb000'))),
         P(rrect(43,24.6,22,2.8,1.4),'#ffffff',.6)]
    t=text_path('titan','100',8.6,54,31.2)[0]; fg.append(P(t,'#6e2e00'))
    mono=[P(B+rrect(dx-7,dy-2.3,14,4.6,1.6)+''.join(circle(bx+ox,by+oy,3.2) for ox,oy in [(0,-5),(5,0),(-5,0),(0,5)]),'#000000',eo=True),
          P(rrect(38,23.5,32,15,7.5)+t,'#000000',eo=True),
          P(rrect(dx-2.3,dy-7,4.6,6.4,1.2)+rrect(dx-2.3,dy+.6,4.6,6.4,1.2),'#000000',a=0)]
    # vertical bar of dpad must also be cut: rebuild mono body with full cross as one subpath via union approximated
    cross=f'M{f(dx-7)},{f(dy-2.3)}L{f(dx-2.3)},{f(dy-2.3)}L{f(dx-2.3)},{f(dy-7)}L{f(dx+2.3)},{f(dy-7)}L{f(dx+2.3)},{f(dy-2.3)}L{f(dx+7)},{f(dy-2.3)}L{f(dx+7)},{f(dy+2.3)}L{f(dx+2.3)},{f(dy+2.3)}L{f(dx+2.3)},{f(dy+7)}L{f(dx-2.3)},{f(dy+7)}L{f(dx-2.3)},{f(dy+2.3)}L{f(dx-7)},{f(dy+2.3)}Z'
    mono[0]=P(B+cross+''.join(circle(bx+ox,by+oy,3.2) for ox,oy in [(0,-5),(5,0),(-5,0),(0,5)]),'#000000',eo=True); mono=mono[:2]
    return dict(key='pad',name='B 糖果手柄',bg=bg,fg=fg,mono=mono,
      note='粉色果冻手柄，四颗糖豆按键，顶上一枚“100”金币牌。青蓝渐变底与游戏里的霓虹糖果配色一致，一眼就知道是游戏。')
def block():
    bg=[P('M0,0L108,0L108,108L0,108Z',lin(0,0,0,108,(0,'#2b0d63'),(.6,'#170634'),(1,'#0c0320'))),
        P('M0,0L108,0L108,108L0,108Z',rad(54,70,56,(0,'#ff3d9a'),(.5,'#ff3d9a'),(1,'#ff3d9a')),0)]
    bg.append(P('M0,58L108,58L108,108L0,108Z',lin(0,58,0,108,(0,'#ff3d9a'),(1,'#5b0f8a')),.35))
    for i,y in enumerate([64,70,78,88,100]):
        bg.append(P(f'M0,{y}L108,{y}',None,.25+i*.12,stroke='#ff5fb0',sw=.9))
    for k in range(-5,6):
        bg.append(P(f'M{54+k*4},58L{54+k*26},108',None,.45,stroke='#ff5fb0',sw=.8))
    for (x,y,r) in [(20,18,.9),(34,10,.6),(80,14,1),(92,30,.7),(14,40,.6),(70,8,.6)]:
        bg.append(P(circle(x,y,r),'#ffffff',.85))
    x,y,w,h,r=33,24,42,42,11
    fg=[P(rrect(x,y+7,w,h,r),'#5c0a3a'),P(rrect(x,y+3.5,w,h,r),'#b3125f'),
        P(rrect(x,y,w,h,r),lin(x,y,x+w,y+h,(0,'#ffa0d2'),(.5,'#ff3d9a'),(1,'#e01a7c'))),
        P(rrect(x+3,y+2.5,w-6,12,8),'#ffffff',.28)]
    g=text_path('cjk','游',27,54,y+h/2+.5)[0]; g2=text_path('cjk','游',27,54,y+h/2+2.3)[0]
    fg+=[P(g2,'#8a0d4c'),P(g,'#ffffff')]
    fg+=[P(rrect(39,67.5,30,13,6.5),'#c97400'),P(rrect(39,65.5,30,13,6.5),lin(0,65.5,0,78.5,(0,'#fff0a0'),(.5,'#ffcf33'),(1,'#ffb000')))]
    t=text_path('titan','100',7.8,54,72.2)[0]; fg+=[P(t,'#6e2e00'),P(star4(78,24,5),'#38f0e0'),P(star4(30,72,3.2),'#ffffff')]
    mono=[P(rrect(x,y,w,h,r)+g,'#000000',eo=True),P(rrect(39,65.5,30,13,6.5)+t,'#000000',eo=True)]
    return dict(key='block',name='C 霓虹「游」方块',bg=bg,fg=fg,mono=mono,
      note='一块厚厚的粉色果冻方块，压着白色“游”字，底部是“100”金色铭牌。背景是霓虹网格地平线，中文辨识度最高。')

# ---------- writers ----------
def svg_paint(p,defs,idx):
    g=p['fill']
    if g is None: return 'none'
    if isinstance(g,str): return g
    gid=f'g{idx}'
    if g[0]=='lin':
        _,x1,y1,x2,y2,st=g
        defs.append(f'<linearGradient id="{gid}" gradientUnits="userSpaceOnUse" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}">'+''.join(f'<stop offset="{o}" stop-color="{c}"/>' for o,c in st)+'</linearGradient>')
    else:
        _,cx,cy,r,st=g
        defs.append(f'<radialGradient id="{gid}" gradientUnits="userSpaceOnUse" cx="{cx}" cy="{cy}" r="{r}">'+''.join(f'<stop offset="{o}" stop-color="{c}"/>' for o,c in st)+'</radialGradient>')
    return f'url(#{gid})'
def svg_layer(paths,prefix,mono_color=None):
    defs=[];body=[]
    for i,p in enumerate(paths):
        if p['a']==0: continue
        fill='none' if p['fill'] is None else (mono_color or svg_paint(p,defs,f'{prefix}{i}'))
        attrs=f'd="{p["d"]}" fill="{fill}"'
        if p['a']<1: attrs+=f' opacity="{p["a"]}"'
        if p['eo']: attrs+=' fill-rule="evenodd"'
        if p['stroke']: attrs+=f' stroke="{mono_color or p["stroke"]}" stroke-width="{p["sw"]}"'
        body.append(f'<path {attrs}/>')
    return ''.join(defs),''.join(body)
def svg_doc(*layers,vb='0 0 108 108',size=None):
    defs='';body=''
    for i,(paths,mc) in enumerate(layers):
        d,b=svg_layer(paths,f'L{i}_',mc);defs+=d;body+=b
    sz=f' width="{size}" height="{size}"' if size else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}"{sz}><defs>{defs}</defs>{body}</svg>'
def argb(c,a=1): return '#%02X%s'%(round(a*255),c[1:].upper())
def vec_layer(paths,mono=False):
    out=[]
    for p in paths:
        if p['a']==0: continue
        attrs=[f'android:pathData="{p["d"]}"']
        if p['eo']: attrs.append('android:fillType="evenOdd"')
        inner=''
        if p['stroke']:
            attrs+= [f'android:strokeColor="{"#FF000000" if mono else argb(p["stroke"])}"',f'android:strokeWidth="{p["sw"]}"']
            if p['a']<1: attrs.append(f'android:strokeAlpha="{p["a"]}"')
        elif isinstance(p['fill'],str) or mono:
            attrs.append(f'android:fillColor="{"#FF000000" if mono else argb(p["fill"])}"')
            if p['a']<1: attrs.append(f'android:fillAlpha="{p["a"]}"')
        else:
            g=p['fill']
            if p['a']<1: attrs.append(f'android:fillAlpha="{p["a"]}"')
            if g[0]=='lin':
                _,x1,y1,x2,y2,st=g; ga=f'android:type="linear" android:startX="{x1}" android:startY="{y1}" android:endX="{x2}" android:endY="{y2}"'
            else:
                _,cx,cy,r,st=g; ga=f'android:type="radial" android:centerX="{cx}" android:centerY="{cy}" android:gradientRadius="{r}"'
            items=''.join(f'\n                <item android:offset="{o}" android:color="{argb(c)}" />' for o,c in st)
            inner=f'\n        <aapt:attr name="android:fillColor">\n            <gradient {ga}>{items}\n            </gradient>\n        </aapt:attr>\n    '
        a='\n        '.join(attrs)
        out.append(f'    <path\n        {a}>{inner}</path>' if inner else f'    <path\n        {a} />')
    return ('<?xml version="1.0" encoding="utf-8"?>\n<vector xmlns:android="http://schemas.android.com/apk/res/android"\n    xmlns:aapt="http://schemas.android.com/aapt"\n'
            '    android:width="108dp"\n    android:height="108dp"\n    android:viewportWidth="108"\n    android:viewportHeight="108">\n'+'\n'.join(out)+'\n</vector>\n')
if __name__=='__main__':
    os.makedirs(OUT,exist_ok=True)
    meta=[]
    for c in [coin(),pad(),block()]:
        k=c['key']; d=f'{OUT}/{k}'; os.makedirs(d,exist_ok=True)
        open(f'{d}/icon.svg','w').write(svg_doc((c['bg'],None),(c['fg'],None)))
        open(f'{d}/icon-visible.svg','w').write(svg_doc((c['bg'],None),(c['fg'],None),vb='18 18 72 72'))
        open(f'{d}/foreground.svg','w').write(svg_doc((c['fg'],None)))
        open(f'{d}/background.svg','w').write(svg_doc((c['bg'],None)))
        open(f'{d}/monochrome.svg','w').write(svg_doc((c['mono'],'#000000')))
        open(f'{d}/themed.svg','w').write(svg_doc(([P('M0,0L108,0L108,108L0,108Z','#d8e2ff')],None),(c['mono'],'#18306e'),vb='18 18 72 72'))
        open(f'{d}/ic_launcher_foreground.xml','w').write(vec_layer(c['fg']))
        open(f'{d}/ic_launcher_background.xml','w').write(vec_layer(c['bg']))
        open(f'{d}/ic_launcher_monochrome.xml','w').write(vec_layer(c['mono'],mono=True))
        meta.append(dict(key=k,name=c['name'],note=c['note']))
    json.dump(meta,open(f'{OUT}/meta.json','w'),ensure_ascii=False,indent=1)
    print('ok')
