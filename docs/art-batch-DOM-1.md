# 画面升级批次 DOM-1（2026-10-31）

第 4 步「DOM 类游戏细节打磨」第 1 批（科学实验 + 海洋 + 魔法网页类）。26 款全部完成。批次表见 [皮肤 B 上线记录](ui-skin-b-2026-10-20.md)。

- 统一做法：以 `scripts/game-ui/custom.cjs` 的 `html[data-skin="b"][data-game="…"]` 选择器做霓虹糖果表面打磨（倒角卡片、饱和渐变、硬底边、暗色实验室/魔法光晕），`sync-game-ui.cjs` 注入各款。
- 含画布玩法面的 12 款：在已有 `GameUI.fx` 之上加 `ensure*Bg` 离屏缓存（整数尺寸、有限色、FX 为空时平面兜底），标记 `/* ART DOM-1 */`。`photosynthesis` 昼夜动态底保留原 FX.stage。
- 玩法、碰撞、计分、存档键都没改；`studio` 保持 Muse。
- zip 和 manifest 交给 Actions 生成，没有手改。

## 逐款改动

| 游戏 | id | 版本 | 画面改动 |
|---|---|---|---|
| 化学反应 | chemreact | 5→6 | 烧杯/架子霓虹卡片；硬边阴影 |
| 密度实验 | densitylab | 4→5 | 实验室底预渲染；浮沉 FX 保留 |
| 消化之旅 | digestion | 4→5 | 消化底预渲染；粒子 FX 保留 |
| 生态瓶 | ecobottle | 6→7 | 生态瓶底预渲染 |
| 电解水 | electrolysis | 3→4 | 电解槽卡片霓虹边；电极管高光 |
| 热胀冷缩 | expansion | 3→4 | 热胀冷缩 HUD/球体面板贴纸感 |
| 食物链 | foodchain | 4→5 | 食物链卡片/槽位硬边糖果风 |
| 水果电池 | fruitbattery | 6→7 | 水果电池底预渲染；电极 orb |
| 热传导 | heattransfer | 3→4 | 热传导条/材料按钮霓虹打磨 |
| 酸碱指示剂 | indicator | 6→7 | 指示剂底预渲染 |
| 金属活动性 | metalreact | 3→4 | 金属排序卡霓虹边与硬底 |
| 元素周期表 | periodic | 4→5 | 周期表底预渲染；格 tile |
| 光合作用 | photosynthesis | 4→5 | 昼夜动态底保留；顶栏/按钮霓虹打磨 |
| pH试纸 | phtest | 6→7 | pH 试纸底预渲染 |
| 压强实验 | pressurelab | 3→4 | 压强筒/滑杆面板糖果硬边 |
| 遗传棋盘 | punnett | 4→5 | 遗传棋盘底预渲染；格 tile |
| 火箭原理 | rocketlab | 6→7 | 火箭原理底预渲染；焰 orb |
| 静电实验 | staticlab | 6→7 | 静电底预渲染；电荷 tile/orb |
| 小丑调色 | colormix | 3→4 | 调色管/色块饱和渐变+硬底 |
| 珍珠贝 | pearlcatch | 5→6 | 海底底预渲染；珍珠 orb |
| 海马竞速 | seahorse | 3→4 | 赛道按钮圆形霓虹边 |
| 炼金转化 | alchemy | 3→4 | 炼金槽/背包贴纸面板；触控≥44 |
| 魔药调配 | potion | 3→4 | 魔药坩埚/货架霓虹；触控≥44 |
| 影子魔术 | shadowmatch | 3→4 | 剪影槽位硬边霓虹 |
| 魔杖店 | wandshop | 3→4 | 魔杖店卡片/列表霓虹；触控≥44 |
| 挖宝 | dig | 6→7 | 挖宝底预渲染；土块 tile |

## 触控与布局修复（≥44px，不滚动）

- 各款本地 `html.game-ui … {{min-width:44px;min-height:44px}}`（未改共用 CSS），标记 `/* ART DOM-1 */`。
- alchemy / potion / wandshop 原 `.tbtn` 42px → 提到 ≥44px。
- 本批 390×844 / 360×640 开局后页面无新增滚动（相对改前基线）。

## 对比图（390×844，改前左、改后右）

| | |
|---|---|
| ![chemreact](art-batch-DOM-1/chemreact.png) | ![densitylab](art-batch-DOM-1/densitylab.png) |
| ![digestion](art-batch-DOM-1/digestion.png) | ![ecobottle](art-batch-DOM-1/ecobottle.png) |
| ![electrolysis](art-batch-DOM-1/electrolysis.png) | ![expansion](art-batch-DOM-1/expansion.png) |
| ![foodchain](art-batch-DOM-1/foodchain.png) | ![fruitbattery](art-batch-DOM-1/fruitbattery.png) |
| ![heattransfer](art-batch-DOM-1/heattransfer.png) | ![indicator](art-batch-DOM-1/indicator.png) |
| ![metalreact](art-batch-DOM-1/metalreact.png) | ![periodic](art-batch-DOM-1/periodic.png) |
| ![photosynthesis](art-batch-DOM-1/photosynthesis.png) | ![phtest](art-batch-DOM-1/phtest.png) |
| ![pressurelab](art-batch-DOM-1/pressurelab.png) | ![punnett](art-batch-DOM-1/punnett.png) |
| ![rocketlab](art-batch-DOM-1/rocketlab.png) | ![staticlab](art-batch-DOM-1/staticlab.png) |
| ![colormix](art-batch-DOM-1/colormix.png) | ![pearlcatch](art-batch-DOM-1/pearlcatch.png) |
| ![seahorse](art-batch-DOM-1/seahorse.png) | ![alchemy](art-batch-DOM-1/alchemy.png) |
| ![potion](art-batch-DOM-1/potion.png) | ![shadowmatch](art-batch-DOM-1/shadowmatch.png) |
| ![wandshop](art-batch-DOM-1/wandshop.png) | ![dig](art-batch-DOM-1/dig.png) |

## 测试结果（2026-10-31）

- `node scripts/check-game.cjs` 本批 26 款：两种尺寸 **52/52 PASS**。
- 无头浏览器开局测试（Playwright；点开始→关卡/教程）：390×844 与 360×640 **52/52 PASS**，控制台无报错。
- `node scripts/sync-game-ui.cjs --check --strict --only=<本批26>`：Verified 26，退出码 0。
- `node scripts/build-classic-games.cjs --check`：五款 Verified（本批无经典源改动）。
- `node scripts/test-classic-games.cjs`：10/10 通过。
- zip / manifest 未手改。
