# 游戏100 · 游戏开发指南（给 muse 和所有往本仓库加游戏的人或 AI）

> 最后更新：2026-10-20。本指南描述的是**当前真实可用**的流程，所有命令都在本仓库根目录下运行。
> 先看 [AGENTS.md](../AGENTS.md) 的 10 条硬规则，再按本文逐节操作。

---

## 1. 仓库结构与发布流水线

```
games/<id>/index.html     ← 单文件游戏（所有 CSS/JS/图形内联，离线可玩）
games/<id>/meta.json      ← 游戏元数据（App 列表、分类、更新检测都靠它）
scripts/game-ui/          ← 共用界面源文件（改这里，再 sync 进每款游戏）
  base.css                  基础布局/面板/按钮/开始按钮置底等
  skins/skin-b.css          默认皮肤 B「霓虹糖果 Pop Arcade」
  skins/index.cjs           各主题配色 + 自动对比度计算（Node 端计算，不用 color-mix）
  skins/fx.js               画布立体工具 GameUI.fx
  runtime.js                运行时：面板装饰、模式切换、得分弹跳、GameUI.* API
  catalog.cjs               ★ 每款游戏必须登记的「主题组」
  challenges.cjs            进阶模式规则（可选）
  custom.cjs                个别游戏的专属样式（可选）
  block.cjs                 生成内联 GAME UI 块（sync 与经典五款共用）
scripts/sync-game-ui.cjs  ← 把共用界面内联进 games/*/index.html
scripts/new-game.cjs      ← 新建游戏脚手架（复制模板 + 写 meta + 登记 catalog）
scripts/check-game.cjs    ← 单款上线前浏览器检查
scripts/templates/starter ← 符合规范的最小模板游戏「接星星」
scripts/classics/ + build-classic-games.cjs ← 五款经典（connectfour colorlines yahtzee columns pyramid）的源码与生成器
<id>.zip、manifest.json   ← ⚠️ 由 GitHub Actions 自动生成，永远不要手改、不要手动提交
```

**流水线**：push 到 `main` 且改动了 `games/**` → `.github/workflows/publish.yml` 调用 `scripts/build-publish-assets.py`：把每个 `games/<id>/` 打成 `<id>.zip`、生成 `manifest.json`（= meta.json 全部字段 + `url` + `size`），并**自动把最近改动的 12 款游戏标为首页推荐**（`premium: true`，`featured: 1…12`，1 最新；同时写入 zip 内 meta，供离线内置）。由 `game100-bot` 提交 `自动发布游戏资源 [skip ci]`，并刷新 jsDelivr 上 `manifest.json` 的缓存。

**各 App 版本怎么看到推荐**：
- **direct / play / taptap（有联网）4.14**：下拉刷新拉取 manifest 的 `premium` 即可换「精选推荐」内容；顺序按**中文名**，不是最新在前。
- **cn 渠道 ≥ 4.19**：离线保底 + 联网读 manifest（与 play/direct 同模型）；下拉刷新即可换「精选推荐」并拉新游戏。更早的 cn 离线包仍须发新版 App 才能换推荐。
- **≥ 4.15**：按 `featured` 最新在前；联网有缓存穿透；cn 内置包也会带上推荐位。

**不要**在 `meta.json` 里手写 `premium` / `featured`。App 对比 `version` 决定是否提示游戏更新。

- 打包 APK 在 muse 侧完成。`build-apk.yml`、`android/`、keystore 文件**不要动**。
- 推送前先 `git pull --rebase`，因为 bot 的自动提交会让本地落后。**只做普通 push，禁止 force-push。**

## 2. meta.json 规范

```json
{
  "color": "#FFB21E",
  "desc": "左右拖动篮子接住星星，越接越快",
  "icon": "⭐",
  "id": "starcatch",
  "name": "接星星",
  "version": 1,
  "category": "休闲模拟",
  "studio": "Grok"
}
```

| 字段 | 规则 |
| --- | --- |
| `id` | 与目录名一致；2–20 位小写字母或数字，以字母开头；全仓唯一，发布后不能改 |
| `name` | 中文名，2–6 字为宜 |
| `icon` | 单个 emoji（开始面板徽章、列表图标都用它） |
| `color` | 列表卡片主色，`#RRGGBB` |
| `desc` | 18–40 字：一句玩法 + 一句卖点 |
| `category` | **只能是** `科学实验` / `经典重温` / `射击` / `跑酷跳跃` / `塔防策略` / `卡牌构筑` / `棋牌对战` / `消除合成` / `益智解谜` / `休闲模拟` / `街机动作` / `节奏音乐` / `金融益智` / `3D 空间` 之一 |
| `version` | **正整数**。新游戏为 1；`index.html` 或 `meta.json` 只要有任何改动（包括 sync 带来的改动）就 +1。不 +1，App 不会更新 |
| `studio` | **必填，出品方**。**Muse 做的游戏写 `"Muse"`，Grok 做的写 `"Grok"`**（大小写照写）。以**最初创作者**为准：升级、换皮、修 bug 别人的游戏时**不要改** studio。App 首页卡片左上角显示出品方角标（Muse 紫色 ✦、Grok 橙色 ◆，其他出品方灰色 ●），首页有“出品方”筛选栏，详情页有出品方胶囊。`node scripts/check-game.cjs` 缺少或写错会报错。以后有新的出品方：先把名字加进 `scripts/check-game.cjs` 和 `scripts/new-game.cjs` 的 `STUDIOS`，App 会自动用中性样式显示。历史归属见 `docs/studio-audit-2026-10-21.md` |

格式统一为 2 空格缩进、UTF-8、文件末尾换行。批量 +1 的写法：

```bash
# 把本次改过 index.html 的游戏 version 各 +1（提交前运行一次）
for id in $(git diff --name-only HEAD -- 'games/*/index.html' | cut -d/ -f2 | sort -u); do
  node -e "const f='games/$id/meta.json',fs=require('fs');const s=fs.readFileSync(f,'utf8');fs.writeFileSync(f,s.replace(/(\"version\"\s*:\s*)(\d+)/,(m,a,n)=>a+(+n+1)))"
done
```

## 3. 新建一款游戏（推荐流程）

```bash
# 1) 脚手架：id、主题、名称、分类、图标
node scripts/new-game.cjs starcatch candy "接星星" 休闲模拟 ⭐ Grok   # 最后一个参数是出品方：Muse 写 Muse，Grok 写 Grok
# 2) 修改 games/starcatch/index.html 里的玩法（模板已含开始/暂停/结算、计分、最佳纪录、音效、后台暂停）
# 3) 注入共用界面
node scripts/sync-game-ui.cjs --only=starcatch
# 4) 浏览器检查（两种竖屏尺寸）
node scripts/check-game.cjs starcatch
```

不用脚手架的话，就手动把 id 加进 `scripts/game-ui/catalog.cjs` 中某个主题组的字符串（以空格分隔）。**每款游戏都必须登记**，否则 sync 会跳过它，`--strict` 也会失败。

| 主题 `theme` | 风格 | 适用题材 | 背景渐变 | 面板 | 主按钮 / 底边 | 按钮字色 | 光晕 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| wood | 糖果浅色 | 棋类、传统 | #ffcf6b→#f0803c | #fff7e6 | #3fc163 / #22863d | #124620 | #ffe08a |
| paper | 糖果浅色 | 纸笔益智 | #72cbff→#3b62ef | #ffffff | #ffb21e / #d97a00 | #714000 | #bfe6ff |
| garden | 糖果浅色 | 自然、动物 | #93e46c→#16a37a | #f6fff0 | #ffcc29 / #d48a00 | #754c00 | #d8ffb0 |
| candy | 糖果浅色 | 消除、合成、休闲 | #ff8ac6→#8d58ff | #fff4fb | #ffcf33 / #e08600 | #7b4a00 | #ffd6f0 |
| ice | 糖果浅色 | 冰雪 | #8fe6ff→#4c86ff | #f4fdff | #ff9f2e / #d8650a | #713506 | #d6f7ff |
| sky | 糖果浅色 | 跳跃、天空、球类 | #86d8ff→#5875ff | #ffffff | #ffd02e / #d98b00 | #774c00 | #e0f2ff |
| kitchen | 糖果浅色 | 美食 | #ffb58a→#ff5f6d | #fff6ee | #ffd34d / #d98a00 | #774c00 | #ffe2c4 |
| space | 霓虹深色 | 太空 | #2a1166→#05051a | #1a1446 | #00d9ff / #0077b8 | #004165 | #7a5cff |
| arcade | 霓虹深色 | 街机、射击、深色画面 | #3a0d5e→#0b0620 | #211040 | #ff3d9a / #a3124f | #510927 | #00e5ff |
| ocean | 霓虹深色 | 深海 | #0b4a6e→#03121f | #0c2a40 | #2ee6d6 / #0c8a8a | #074c4c | #7af5ff |
| magic | 霓虹深色 | 魔法、奇幻 | #4a1a7a→#0d0620 | #22113f | #b26bff / #5a22a8 | #32135c | #ff8af0 |
| lab | 霓虹深色 | **所有科学实验** | #0f3256→#03101f | #0f2742 | #33e1a0 / #0f8a5a | #084c32 | #4fc3f7 |

选择原则：游戏画面本身偏深（画布底色较暗），就选霓虹深色主题；画面偏亮，就选糖果浅色主题。`科学实验` 一律用 `lab`。

需要进阶模式时，在 `challenges.cjs` 里加 `add('<id>', '一句话说明进阶规则')`，并在玩法里用 `GameUI.pick(经典值, 进阶值)`。不加的话，开始面板就不显示模式切换（科学实验都是这种情况）。

### sync 命令速查

| 命令 | 作用 |
| --- | --- |
| `node scripts/sync-game-ui.cjs` | 全部 226+ 款重新注入（改了 `scripts/game-ui/` 后必须跑） |
| `node scripts/sync-game-ui.cjs --only=a,b` | 只注入指定游戏 |
| `node scripts/sync-game-ui.cjs --check` | 只检查、不写文件：有游戏未同步或脚本语法错误就失败 |
| `node scripts/sync-game-ui.cjs --check --strict` | 另外要求所有游戏都已登记 catalog（**推送前必须通过**） |
| `--skin=none` / `--skin=a` + `--out=DIR` | 生成无皮肤版或方案 A 版到其他目录做对比，不改仓库 |
| `node scripts/build-classic-games.cjs [--check]` | 五款经典重新生成或检查（改了共用界面后也要跑） |

`index.html` 里 `<!-- GAME UI BEGIN -->…<!-- GAME UI END -->` 之间的内容由 sync 生成。**不要手改这一段**，改了也会被下次 sync 覆盖。

## 4. 视觉规范：皮肤 B「霓虹糖果 Pop Arcade」

皮肤会自动作用于以下标准结构，**新游戏只要套用这些 class 和 id，就自动获得统一外观**：

| 元素 | 标准写法 | 皮肤效果 |
| --- | --- | --- |
| 页面容器 | `<div class="wrap">` | 背景为主题渐变 + 波点 + 光斑；深色主题为霓虹网格 |
| 顶栏 / HUD | `<div class="topbar">` 或 `.hud` / `#hud`，分数用 `<b id="score">` | 白色胶囊条，带厚底边；`#score` 和 id 含 score 的元素显示为金币徽章，数值变化时弹跳 |
| 统计条 | `.stats` | 与顶栏同款 |
| 画布 | `<canvas id="cv">` | 5px 白框 + 厚底边 + 投影；深色主题为霓虹外发光 |
| 开局 / 结算 / 暂停 | `<div class="overlay" id="startScr"><h1>…</h1><p>…</p><button class="btn" id="startBtn">开始游戏</button></div>`，隐藏用 `.hidden` | runtime 自动包成贴纸面板 `.ui-panel`，自动加 emoji 徽章和模式切换；遮罩铺满全屏；开始按钮固定在面板底部（360×640 也能点到） |
| 结算大分数 | `<div class="score" id="finalScore">` | 56px 金色描边大字 |
| 主按钮 | `button.btn`（以及 `.bigBtn`、`.startbtn`、`.actBtn`） | 3D 糖果按钮：顶部高光唇边 + 6px 深色底边，按下沉 5px |
| 次要按钮 | `.ghost`、`.toolbtn`、`.iconbtn`、`.tbtn`、`.nbtn`、`.dbtn`、`.lvl` | 白色糖果键 + 主题色底边；选中态加 `.on` 或 `aria-pressed="true"` |
| 小药丸 | `.pill` / `.hudbox` | 白色圆角胶囊 |

### 设计令牌（CSS 变量，sync 自动写入 `:root`）

`--page --surface --soft --ink --muted --accent --on-accent --line --stage`（基础九色，皮肤 B 会重映射），以及皮肤 B 专用变量：`--b-bg1 --b-bg2`（背景渐变）、`--b-btn --b-btn-hi --b-edge`（按钮色、高光、底边）、`--b-btn-ink --b-btn-tsh`（按钮字色和字影）、`--b-coin-ink`（徽章字色）、`--b-key-ink`（次要键字色）、`--b-title`（面板标题色）、`--b-glow --b-glow-rgb`（光晕色）、`--b-pedge-rgb`（霓虹描边色）。游戏自己的元素想跟主题一致，直接用这些变量：

```html
<style>
/* 自定义的道具卡片，跟随主题 */
.card{background:linear-gradient(180deg,#fff,var(--soft));border-radius:18px;
  box-shadow:inset 0 0 0 2px #fff,0 5px 0 var(--line),0 10px 16px rgba(0,0,0,.18);color:var(--ink)}
.card.sel{background:linear-gradient(180deg,var(--b-btn-hi),var(--b-btn));color:var(--b-btn-ink)}
/* 霓虹描边的框 */
.neon{border:1px solid var(--line);box-shadow:0 0 0 1px rgba(0,0,0,.4),0 0 18px rgba(var(--b-pedge-rgb),.55)}
</style>
```

完整的 3D 糖果按钮（自定义按钮想同款时可以复制）：

```css
.mybtn{position:relative;overflow:hidden;border:0;border-radius:20px;min-height:52px;padding:12px 28px;
  font-weight:900;font-size:18px;color:var(--b-btn-ink);text-shadow:var(--b-btn-tsh);
  background:linear-gradient(180deg,var(--b-btn-hi),var(--b-btn) 52%);
  box-shadow:inset 0 3px 0 rgba(255,255,255,.55),inset 0 -5px 0 rgba(0,0,0,.14),0 6px 0 var(--b-edge),0 12px 18px rgba(0,0,0,.25);
  transition:transform .08s,box-shadow .08s}
.mybtn::before{content:"";position:absolute;left:12px;top:6px;width:22px;height:9px;border-radius:9px;background:rgba(255,255,255,.75);transform:rotate(-12deg)}
.mybtn:active{transform:translateY(5px);box-shadow:inset 0 3px 0 rgba(255,255,255,.4),0 1px 0 var(--b-edge),0 4px 8px rgba(0,0,0,.2)}
```

### 字体（离线）

不加载任何外部字体或 CDN。皮肤使用系统字体栈：`"HarmonyOS Sans SC","MiSans","OPPOSans","vivo Sans","Noto Sans SC","Noto Sans CJK SC","PingFang SC","Microsoft YaHei UI",system-ui,sans-serif`。标题用 900，正文用 600–800，数字一律加 `font-variant-numeric:tabular-nums`。

### 动效

已内置以下动效：面板弹出（`uiB-in`，0.5s 回弹）、徽章摇摆（`uiB-wobble`）、星星闪烁（`uiB-twinkle`）、得分弹跳（`.ui-pop`，只在分数离散跳变时触发，每帧都在变的计数器不会触发），以及按钮按下。所有动效都遵守 `prefers-reduced-motion`。自己加动效时只动 `transform` 和 `opacity`，不要动 `width`、`top` 这类会触发重排的属性。

### 对比度规则（硬性）

- 正文和 ≤16px 的文字，与背景对比度 ≥ **4.5:1**；19px 粗体以上的按钮和标题 ≥ **3:1**。
- 皮肤 B 的按钮、徽章、次要键、标题和 muted 文字颜色，由 `skins/index.cjs` 的 `ensure()` 按 WCAG 公式自动加深，保证达标。现有 12 个主题都达到 ≥4.5:1。**黄、橙、青这类亮色按钮一律用深色字**，不要写白字。
- 自己写颜色时，可以用 `node -e "const s=require('./scripts/game-ui/skins/index.cjs');console.log(s.contrast('#7b4a00','#ffcf33'))"` 检验。

## 5. 画布内的立体感：GameUI.fx

皮肤注入后，`window.GameUI.fx` 可用（`GameUI.fx.on === true`，`GameUI.fx.skin === 'b'`）。所有形状都会预先画进缓存的精灵图，之后每帧只需一次 `drawImage`，低端 WebView 也能跑满 60fps。写法统一为：先判断 `FX`，没有 FX 时保留平面画法作为兜底。

```js
const FX = window.GameUI && GameUI.fx && GameUI.fx.on ? GameUI.fx : null;
const W = 360, H = 540;
if (FX) FX.hidpi(cv, ctx, W, H); else { cv.width = W; cv.height = H; }   // 高清：仅当输入换算用逻辑 W/H 时安全（见第 6 节）

function draw() {
  FX ? FX.stage(ctx, W, H, '#3a1d7a', '#120a2e')          // 有光照的背景：竖向渐变 + 暗角（已缓存）
     : (ctx.fillStyle = '#1b1240', ctx.fillRect(0, 0, W, H));
  for (const b of blocks) FX ? FX.tile(ctx, b.x, b.y, 22, 22, b.color)       // 倒角糖果方块（可传第 8 个参数作圆角）
                             : (ctx.fillStyle = b.color, ctx.fillRect(b.x, b.y, 22, 22));
  for (const o of balls) FX ? FX.orb(ctx, o.x, o.y, o.r, o.color)             // 光泽球：高光 + 边缘暗部 + 反光边 + 自带接触阴影
                            : (ctx.fillStyle = o.color, ctx.beginPath(), ctx.arc(o.x, o.y, o.r, 0, 7), ctx.fill());
  if (FX) FX.shadow(ctx, hero.x, hero.y + 20, 16, 5);     // 角色或 emoji 脚下的椭圆投影
  if (FX) { FX.glow(ctx, '#ff3d6e', 14); drawFood(); FX.noGlow(ctx); }        // 发光：只用于少量关键物体
  if (FX) FX.drawBurst(ctx, sparks);                      // 粒子
}
// 得分时：
if (FX) FX.burst(sparks, x, y, '#ffd34d', 14);            // sparks 是游戏自己维护的数组
```

| API | 说明 |
| --- | --- |
| `tile(ctx,x,y,w,h,color[,r])` | 糖果切面方块：深色边缘、左上亮面、光泽面、高光点 |
| `orb(ctx,x,y,r,color)` | 光泽球体（含接触阴影） |
| `shadow(ctx,x,y,rx,ry[,alpha])` | 椭圆接触投影 |
| `stage(ctx,w,h,top,bottom)` | 渐变背景 + 暗角，按尺寸和颜色缓存 |
| `glow/noGlow(ctx[,color,blur])` | shadowBlur 发光的开关。**不要对每个方块都用**，开销大 |
| `burst(list,x,y,color,n)` / `drawBurst(ctx,list)` | 轻量粒子 |
| `shade(hex,t)` / `rgba(hex,a)` | 调亮（t>0）、调暗（t<0）、转透明色 |
| `hidpi(cv,ctx,w,h)` | 按 devicePixelRatio（上限 2.5）放大画布底图，游戏坐标保持 w×h 不变 |

注意：`tile` 和 `orb` 的缓存键包含颜色和尺寸，**尺寸要取整数，颜色要用固定的有限集合**。不要每帧随机生成颜色，否则缓存会无限增长（上限 400 张，满了会清空重建）。大块静态背景（比如桌球台面）请自己画一次到离屏 canvas，参考 `games/billiards` 的 `drawTableFx()`。

参考实现：`games/tetris`（tile + hidpi + 落点发光）、`games/snake`（立体管道蛇身 + 发光食物）、`games/billiards`（台面光照、库边倒角、袋口纵深、光泽球）、`games/fruitmerge`（光泽水果 + 玻璃罐壁）、`games/game2048`（DOM 方块：`t.dataset.v=v`，配合 CSS 按数值着色）。

## 6. 移动端硬性规则

1. **竖屏优先**：设计基准为 390×844，同时必须兼容 360×640。`<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">`
2. **触摸统一用 Pointer Events**（`pointerdown/move/up/cancel`），并在画布上设 `touch-action:none`。不要同时绑 touch 和 pointer 两套，否则会重复触发（水果合成踩过这个坑）。
3. **坐标必须按画布显示尺寸换算到逻辑坐标**（桌球 #15 踩过这个坑）：
   ```js
   function posOf(e){
     const r = cv.getBoundingClientRect();
     const t = (e.touches && e.touches.length) ? e.touches[0]
             : (e.changedTouches && e.changedTouches.length) ? e.changedTouches[0] : e;  // touchend 时 touches 为空
     return { x: (t.clientX - r.left) * W / r.width, y: (t.clientY - r.top) * H / r.height };   // 用逻辑 W/H，不要用 cv.width
   }
   ```
   用逻辑 `W/H` 换算，开了 `FX.hidpi` 也不会错；用 `cv.width/r.width` 的游戏不能开 hidpi。
4. **触控目标 ≥ 44×44px**（按钮、可点格子）。实在放不下时（比如 9 列数字键），保证高度 ≥ 44、宽度 ≥ 34，并在文档里说明。
5. **页面不滚动**：`html,body{height:100%;overflow:hidden}`，内容用 `svh`、`flex` 塞进一屏。检查标准是 `scrollHeight - innerHeight ≤ 0`。
6. **开始按钮必须可达**：按第 4 节的标准结构写遮罩，由 base.css 负责铺满全屏并把按钮固定在面板底部。不要把开局面板放进跟随画布尺寸的容器里，还另外写 `position:absolute` 限高。
7. **切后台暂停**：`document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();})`
8. **高清**：画布用逻辑尺寸 + `FX.hidpi`（或自己 `cv.width=W*dpr; ctx.setTransform(dpr,0,0,dpr,0,0)`）。
9. **音效**：用 WebAudio 合成（参考模板里的 `beep()`），在首次用户操作后创建 `AudioContext`；提供 🔊/🔇 开关，并把状态存到 `GameUI.storageSet`。不引用任何音频文件 URL。
10. **存储**：最佳纪录等数据用 `GameUI.storageGet/Set`，进阶模式会自动分开存。
11. **离线**：不出现任何 `http(s)://` 资源（字体、图片、脚本、CDN 都不行）。图片用 emoji、canvas 绘制或内联 SVG / data URI。

## 7. 玩法完整度清单

- [ ] 开始面板：说明 3–5 行，规则和计分讲清楚
- [ ] 进行中：HUD 显示得分（`#score`）、生命或时间、等级
- [ ] 暂停 / 继续 / 重新开始（`#pauseBtn`、`#resumeBtn`）
- [ ] 结算面板：大分数（`.score#finalScore`）、最佳纪录、`再来一局`（`#againBtn` 或 `#restartBtn`）
- [ ] 难度递进：速度、数量或时间随分数或关卡上升，前 30 秒能上手，3 分钟后有压力
- [ ] 反馈：得分有音效 + 粒子或弹跳；失败有音效和画面反馈
- [ ] 最佳纪录持久化；静音状态持久化
- [ ] 科学实验额外要求：每轮有明确目标、实测数据、公式和知识点，结束有总结；数值要符合物理或化学常识

> **每日新游戏 / 升级例行任务的约定（Muse 与 Grok 都照此执行）**：新游戏的 `meta.json` 必须带 `studio`——Muse 的例行任务写 `"Muse"`，Grok 的例行任务写 `"Grok"`；升级对方的游戏时保留原来的 `studio`。推送前 `check-game.cjs` 会检查这一项。

## 8. 推送前测试（照抄执行）

```bash
git pull --rebase                                    # 先同步 bot 的自动提交
node scripts/sync-game-ui.cjs                        # 如果改了 scripts/game-ui/
node scripts/build-classic-games.cjs                 # 同上
node scripts/sync-game-ui.cjs --check --strict       # 必须输出 Verified N，且退出码为 0
node scripts/build-classic-games.cjs --check         # 五款 Verified
export NODE_PATH=$(npm root -g) CHROME_PATH=/usr/bin/google-chrome   # 按本机实际调整，需要 playwright
node scripts/check-game.cjs <本次新增或修改的 id，逗号分隔>          # 两种尺寸全部 PASS
node scripts/test-classic-games.cjs                  # 改到经典五款或共用界面时
node scripts/test-gameplay.cjs                       # 改到共用界面时
# 给改动过的游戏 version +1（见第 2 节），然后：
git add games scripts docs README.md && git commit -m "每日新游戏 YYYY-MM-DD：…" && git push   # 普通 push，不要 --force
```

推送后在 GitHub Actions 里确认「发布游戏资源」成功，并确认 `manifest.json` 里对应游戏的 `version` 已更新。

## 9. 审计里踩过的坑（别再犯）

| 坑 | 现象 | 正确做法 |
| --- | --- | --- |
| pearlcatch：闭包外引用未定义的变量 `el` | 网格建不出来，整款不能玩 | 提交前至少在浏览器里点一次开始并操作；`check-game.cjs` 会抓到 pageerror |
| foodchain：`appendChild(card)`，实际变量名是 `c`；文案模板漏了变量 | 第 1 关空白，文案出现“移除了后” | 同上；字符串模板拼出来后要通读一遍 |
| fruitmerge：`touchend` 里读 `e.touches[0]` | 每次点击都报错，并且重复投放 | 只用 Pointer Events；必须用 touch 时取 `changedTouches` |
| billiards：触摸坐标没按画布缩放换算 | 第二杆起点不中白球 | 用第 6 节的 `posOf()` |
| 推送“本地修复版”整文件覆盖 | 冰壶、剑道、炸弹人、七巧板的共用界面和进阶模式（约 190 行）被删 | **改游戏前先 `git pull`，在最新文件上改，不要用自己本地的旧副本整体覆盖**；提交前看 `git diff --stat`，出现大段删除要停下来确认 |
| 开始按钮被裁切 | 小恐龙等 14 款“只看到介绍” | 用标准遮罩结构，交给 base.css 处理；360×640 下检查 |
| 新游戏不登记 catalog | 没有统一外观，`--check` 形同虚设 | `new-game.cjs` 自动登记；推送前跑 `--check --strict` |
| 改了 index.html 没升 version | App 不更新 | 见第 2 节的批量 +1 |
| 手改 zip / manifest | 与 Actions 冲突 | 永远交给 Actions |

### 浏览器回归（2026-10-31）

`check-game.cjs --all` 会逐款经过首次教程和选关，再验证暂停/继续及触屏输入。`scripts/browser-game-flow.cjs` 共用这段真实开局流程；不要用测试后门跳过初始化。`node scripts/test-game-ui.cjs` 覆盖存储被禁用、后台暂停、进阶提示限额、开局前输入和游戏中缩放等故障。测试脚本用 `CHROME_PATH` 指定本机浏览器，`NODE_PATH` 指向已安装的 Playwright。

旧游戏没有自己的 `visibilitychange` 处理时，可在游戏脚本之后调用 `GameUI.autoPause()`；暂停控制只监听 `pointerdown` 的游戏用 `GameUI.autoPause('pointerdown')`。它复用原暂停按钮，并避开菜单、测验和已有暂停面板。已有后台处理的游戏不要重复接入。存储统一使用 `GameUI.storageGet/Set/Remove`；浏览器拒绝持久化时，本次页面中的记录和静音设置仍可使用，重新打开后可能丢失。
