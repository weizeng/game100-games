from fontTools.ttLib import TTFont, TTCollection
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
G='/usr/share/fonts/truetype/sand-box/google/'
FONTS={'titan':G+'Titan One/TitanOne-Regular.ttf','lilita':G+'Lilita One/LilitaOne-Regular.ttf'}
_cache={}
def font(key):
    if key in _cache: return _cache[key]
    if key=='cjk':
        c=TTCollection('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc')
        f=[x for x in c.fonts if 'SC' in x['name'].getDebugName(1)][0]
    else: f=TTFont(FONTS[key])
    _cache[key]=f; return f
def text_path(key,text,height,cx,cy,track=0):
    """Path for text scaled so the visual bbox height == height, centred at (cx,cy)."""
    f=font(key); gs=f.getGlyphSet(); cmap=f.getBestCmap(); hm=f['hmtx']
    names=[cmap[ord(ch)] for ch in text]
    # measure in font units
    x=0; bp=BoundsPen(gs); pos=[]
    for n in names:
        pos.append(x); gs[n].draw(TransformPen(bp,(1,0,0,1,x,0))); x+=hm[n][0]+track
    xmin,ymin,xmax,ymax=bp.bounds
    s=height/(ymax-ymin)
    ox=cx-(xmin+xmax)/2*s; oy=cy+(ymin+ymax)/2*s
    sp=SVGPathPen(gs, lambda v: ('%.2f'%v).rstrip('0').rstrip('.'))
    for n,px in zip(names,pos):
        gs[n].draw(TransformPen(sp,(s,0,0,-s,ox+px*s,oy)))
    return sp.getCommands(), ((xmax-xmin)*s)
if __name__=='__main__':
    d,w=text_path('titan','100',18,54,55); print(len(d),w)
    d,w=text_path('cjk','游',26,54,46); print(len(d),w, font('cjk')['name'].getDebugName(1))
