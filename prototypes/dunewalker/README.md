# 月海旅人 · Three.js + Vite 最小 demo

开发环境建议 Node 18+。运行：

```powershell
cd prototypes/dunewalker
npm ci
npm run dev
```

构建 App 可用的单文件：

```powershell
npm run build
```

输出为 `games/dunewalker/index.html`，所有 Three.js、后期着色器、样式内联；不请求字体、贴图或 CDN。可以直接用浏览器打开该 HTML，或沿仓库现有发布流程打包进 App。构建会调用标准 UI 同步脚本，不生成 zip 或 manifest。之后修改已发布游戏时须同步递增 meta.json 的 version。

操作：WASD / 方向键 / 左下摇杆移动，拖动画面环顾，E / 右下按钮召唤并骑乘悬浮座驾，再按一次下车。Esc / 暂停按钮暂停。靠近三枚信标完成计时探索，可以继续漫游或重开；最快纪录保存在本机。切后台自动暂停，WebAudio 音效可关闭。

实现：确定性程序化沙丘、岩石拱门、螺旋塔、柱廊、天桥、巨月；MeshToonMaterial 平涂光照、屏幕空间边缘后期与几何轮廓线。角色和双推进器均为代码几何体。使用 GameUI.fx 生成内存接触阴影，保留无 FX 兜底；主 WebGL 画布由 renderer.setPixelRatio 输出高清，最高 1.5 倍以控制手机开销。

范围：这是有限区域探索原型（非无限流式世界）。基础圆形障碍阻挡，天桥暂为景观；没有跳跃、攀爬和完整物理引擎。目标距离逐段增加，座驾可加速赶路。尚未验证 Android 真机 WebView 性能，需支持 WebGL；本版本 Three.js 也提供 WebGL 1 回退。

验证：仓库 check-game 两种竖屏尺寸通过；verify.mjs 检查断网 file URL、键盘移动、座驾、暂停、重开并保存截图到 .artifacts/dunewalker。运行 `node verify.mjs`（默认使用 Windows Chrome，可通过 CHROME_PATH 指定浏览器）。全仓 UI 同步检查通过；经典游戏检查在已有 connectfour 文件上失败，本 demo 没有修改经典游戏。

依赖固定在 package-lock.json。Three.js MIT 许可见 THREE-LICENSE.txt。源码是维护入口；不要直接编辑生成的游戏 HTML。

版本 2：新增月海沙丘、紫晶荒原、青绿盐湖三个可选目的地；暂停菜单可返回选择，切换后重新开始，各场景独立保存纪录。新增实例化地表碎石、水晶群、盐湖植被、云带与座驾把手。运行 node verify-scenes.mjs 检查六种场景/手机尺寸组合。
