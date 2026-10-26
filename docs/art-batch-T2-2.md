# 画面升级批次 T2-2（2026-10-26）

第 3 步「画布画面升级」第二档第 2 批（科学实验续 + 街机）。24 款全部完成。批次表见 [皮肤 B 上线记录](ui-skin-b-2026-10-20.md)。

- 统一做法：画布内用共享的 `GameUI.fx`：倒角糖果方块 `tile`、光泽球 `orb`、接触投影 `shadow`、渐变背景 `stage`、少量发光 `glow`、粒子 `burst` / `drawBurst`。
- 大块静态画面只在第一次画进离屏 canvas，之后每帧一次 `drawImage`（`ensureLabBg` / `ensureParaBg` / `ensureSkBg` / `ensureSolBg` / `ensureWlBg` / `ensureArBg` / `ensureBmBg` / `ensureCnBg` / `ensureCtBg` / `ensureCsBg` / `ensureCpBg` / `ensureChBg` / `ensureDtBg` / `ensureDdBg` / `ensureDmBg` / `ensureFwBg` / `ensureLzBg` 等）。
- `tile`、`orb` 的尺寸都取整数；原来的平面 draw 原样保留，没有 FX 时作为兜底。
- 玩法、碰撞、计分、存档键都没改；`studio` 没改（24 款均为 `"Muse"`）。
- zip 和 manifest 交给 Actions 生成，没有手改。

## 逐款改动

| 游戏 | id | 版本 | 画面改动 |
|---|---|---|---|
| 光的反射 | reflection | 3→4 | Kit：`ensureLabBg` 缓存霓虹底；原有 FX 保留 |
| 光的折射 | refraction | 3→4 | Kit：`ensureLabBg` 缓存霓虹底；原有 FX 保留 |
| 共振实验 | resonance | 5→6 | Kit：`ensureLabBg` 缓存霓虹底；原有 FX 保留 |
| 串联与并联 | seriesparallel | 3→4 | Kit：`ensureLabBg` 缓存霓虹底；原有 FX 保留 |
| 骨骼拼图 | skeleton | 2→3 | 舞台底预渲染；骨块 `tile`/`orb` |
| 溶解度 | solubility | 4→5 | 烧杯台底预渲染；颗粒 `orb` |
| 弹簧振子 | spring | 3→4 | Kit：`ensureLabBg` 缓存霓虹底；原有 FX 保留 |
| 波的传播 | wavelab | 2→3 | 舞台底预渲染；波峰 `orb` |
| 神射手 | archery | 4→5 | 靶场底预渲染；靶环/箭 `tile`/`orb` |
| 轰炸机 | bomber | 5→6 | 天空/地面底预渲染；建筑 `tile`；炸弹 `orb` |
| 奶茶摇摇 | bubbletea | 3→4 | Kit：`ensureLabBg` 缓存霓虹底；原有 FX 保留 |
| 碰碰车 | bumpercar | 3→4 | Kit：`ensureLabBg` 缓存霓虹底；原有 FX 保留 |
| 炮击堡垒 | cannon | 5→6 | 战场底预渲染；炮台/堡垒 `tile`；炮弹 `orb` |
| 投石车 | catapult | 4→5 | 战场底预渲染；投石车/目标 `tile` |
| 都市天际线 | cityskyline | 6→7 | 动态天空按色键缓存 `ensureCsBg` + `stage` |
| 直升机 | copter | 4→5 | 天空底预渲染；机身 `tile`；碎片 `orb` |
| 魔块跳跳 | cubhop | 4→5 | 星空底 `stage` 预渲染；等距方块逻辑未改 |
| 飞镖 | darts | 4→5 | 靶场底预渲染；靶心 `orb`+`glow`；粒子 `orb` |
| 深潜 | deepdive | 4→5 | 深度色键缓存 `ensureDdBg` + `stage` |
| 多米诺 | domino | 2→3 | 场地底预渲染；桌面 `tile`；彩灯 `orb` |
| 烟花 | firework | 4→5 | 夜空/月亮底预渲染；火花 `orb` |
| 激光反射 | laser | 4→5 | 星空底预渲染；出口 `tile` |
| 忍者 | ninja | 5→6 | 夜城墙体底预渲染；忍者 `tile`/`orb` |
| 极限跳伞 | parachute | 3→4 | Kit：`ensureParaBg` 缓存霓虹底；原有 FX 保留 |

## 触控与布局修复（≥44px，不滚动）

- 各款本地 `html.game-ui … {min-width:44px;min-height:44px}`（未改共用 CSS）。
- 本批 390×844 / 360×640 开局后页面无新增滚动（相对改前基线）。

## 对比图（390×844，改前左、改后右）

| | |
|---|---|
| ![reflection](art-batch-T2-2/reflection.png) | ![refraction](art-batch-T2-2/refraction.png) |
| ![resonance](art-batch-T2-2/resonance.png) | ![seriesparallel](art-batch-T2-2/seriesparallel.png) |
| ![skeleton](art-batch-T2-2/skeleton.png) | ![solubility](art-batch-T2-2/solubility.png) |
| ![spring](art-batch-T2-2/spring.png) | ![wavelab](art-batch-T2-2/wavelab.png) |
| ![archery](art-batch-T2-2/archery.png) | ![bomber](art-batch-T2-2/bomber.png) |
| ![bubbletea](art-batch-T2-2/bubbletea.png) | ![bumpercar](art-batch-T2-2/bumpercar.png) |
| ![cannon](art-batch-T2-2/cannon.png) | ![catapult](art-batch-T2-2/catapult.png) |
| ![cityskyline](art-batch-T2-2/cityskyline.png) | ![copter](art-batch-T2-2/copter.png) |
| ![cubhop](art-batch-T2-2/cubhop.png) | ![darts](art-batch-T2-2/darts.png) |
| ![deepdive](art-batch-T2-2/deepdive.png) | ![domino](art-batch-T2-2/domino.png) |
| ![firework](art-batch-T2-2/firework.png) | ![laser](art-batch-T2-2/laser.png) |
| ![ninja](art-batch-T2-2/ninja.png) | ![parachute](art-batch-T2-2/parachute.png) |

## 测试结果（2026-10-26）

- `node scripts/check-game.cjs` 本批 24 款：两种尺寸 **48/48 PASS**。
- 无头浏览器开局测试（Playwright；点开始→关卡/教程）：390×844 与 360×640 **48/48 PASS**，控制台无报错。
- `node scripts/sync-game-ui.cjs --check --strict --only=<本批24>`：Verified 24，退出码 0。
- `node scripts/build-classic-games.cjs --check`：五款 Verified。
- `node scripts/test-classic-games.cjs`：10/10 PASS。
- zip / manifest 未手改。
