from fonts import text_path
# 游戏 (cjk bold) + 100 (titan) wordmark, 160x40 viewBox
a,wa=text_path('cjk','游戏',30,0,20)
import re
def shift(d,dx):
    return re.sub(r'(-?[\d.]+),(-?[\d.]+)',lambda m:f'{float(m.group(1))+dx:.2f},{m.group(2)}',d) if ',' in d else d
# fontTools SVGPathPen uses spaces, not commas: rebuild with offsets directly
a,wa=text_path('cjk','游戏',30,30+0,21)
b,wb=text_path('titan','100',24,30+wa/2+6+0, 21)
# recentre b properly
b,wb=text_path('titan','100',24,30+wa/2+6+wb/2,21.5)
W=30+wa/2+6+wb+2
open('wordmark.json','w').write(__import__('json').dumps(dict(a=a,b=b,w=W)))
print(W)
