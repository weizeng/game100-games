import json,sys
sys.path.insert(0,'.')
import importlib; L=importlib.import_module('logos')
OUT=sys.argv[1]; key=sys.argv[2] if len(sys.argv)>2 else 'block'
c={'coin':L.coin,'pad':L.pad,'block':L.block}[key]()
body=L.vec_layer(c['bg']+c['fg'])
inner=body.split('android:viewportHeight="108">\n',1)[1].rsplit('</vector>',1)[0]
rr=L.rrect(18,18,72,72,16)
tile=('<?xml version="1.0" encoding="utf-8"?>\n<!-- 首页标题栏 / 设置页用的小图标：取自适应图标可见的 72×72 区域并切圆角 -->\n<vector xmlns:android="http://schemas.android.com/apk/res/android"\n    xmlns:aapt="http://schemas.android.com/aapt"\n    android:width="72dp"\n    android:height="72dp"\n    android:viewportWidth="72"\n    android:viewportHeight="72">\n'
      f'  <group android:translateX="-18" android:translateY="-18">\n    <clip-path android:pathData="{rr}" />\n{inner}  </group>\n</vector>\n')
open(f'{OUT}/logo_tile.xml','w').write(tile)
W=json.load(open('wordmark.json'))
w=round(W['w'],1)
wm=f'''<?xml version="1.0" encoding="utf-8"?>
<!-- 字标「游戏100」：白字 + 金币色数字 + 糖粉色台阶阴影（矢量，跟随 logo 风格） -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="{w*0.75:.1f}dp"
    android:height="30dp"
    android:viewportWidth="{w}"
    android:viewportHeight="40">
    <group android:translateY="2.6">
        <path android:fillColor="#FFA3124F" android:pathData="{W['a']}" />
        <path android:fillColor="#FFA3124F" android:pathData="{W['b']}" />
    </group>
    <path android:fillColor="#FFFFFFFF" android:pathData="{W['a']}" />
    <path android:fillColor="#FFFFCF33" android:pathData="{W['b']}" />
</vector>
'''
open(f'{OUT}/wordmark.xml','w').write(wm); print('ok',w)
