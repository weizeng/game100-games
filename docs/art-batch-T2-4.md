# 画面升级批次 T2-4（2026-10-28）

第 3 步「画布画面升级」第二档第 4 批（太空续 + 深海 + 魔法 + 街机）。24 款全部完成。批次表见 [皮肤 B 上线记录](ui-skin-b-2026-10-20.md)。

- 统一做法：画布内用共享的 `GameUI.fx`：倒角糖果方块 `tile`、光泽球 `orb`、接触投影 `shadow`、渐变背景 `stage`、少量发光 `glow`、粒子 `burst` / `drawBurst`。
- 大块静态画面只在第一次画进离屏 canvas，之后每帧一次 `drawImage`（`ensureSlBg` / `ensureSmBg` / `ensureAsBg` / `ensureIsBg` / `ensureJzBg` / `ensureLhBg` / `ensureScBg` / `ensureSsBg` / `ensureSnBg` / `ensureTsBg` / `ensureBrBg` / `ensureDeBg` / `ensureDkBg` / `ensureHdBg` / `ensureLvBg` / `ensureSdBg` / `ensureBrlBg` / `ensureHpBg` / `ensurePfBg` / `ensurePnBg` / `_pyBg` / `ensureShBg` / `ensureWtBg` / `ensureFrBg` 等）。
- `tile`、`orb` 的尺寸都取整数；原来的平面 draw 原样保留，没有 FX 时作为兜底。
- 玩法、碰撞、计分、存档键都没改；`studio` 没改。
- zip 和 manifest 交给 Actions 生成，没有手改。

## 逐款改动

| 游戏 | id | 版本 | 画面改动 |
|---|---|---|---|
| 太空电梯 | spacelevator | 4→5 | 星空底预渲染；轿厢 `tile`；星点 `orb` |
| 星际快递 | starmail | 4→5 | 星空底预渲染；包裹/星 `orb` |
| 深海归途 | ascent | 3→4 | Kit：`ensureAsBg` 缓存霓虹底；原有 FX 保留 |
| 章鱼喷墨 | inkspray | 3→4 | Kit：`ensureIsBg` 缓存霓虹底；原有 FX 保留 |
| 电鳗伏击 | jellyzap | 2→3 | 深海底预渲染；电鳗/粒子 `orb`+`glow` |
| 灯塔引航 | lighthouse | 2→3 | 夜海底预渲染；灯塔 `tile`；光束/星 `orb` |
| 深海炮手 | seacannon | 2→3 | 深海底预渲染；炮弹/目标 `orb` |
| 换壳蟹 | shellswap | 2→3 | 海底底预渲染；贝壳 `tile`/`orb` |
| 声呐寻宝 | sonar | 3→4 | 深海底预渲染；声呐环/宝物 `orb` |
| 潮汐寻宝 | tideseek | 3→4 | 潮汐底预渲染；藏宝点 `orb` |
| 扫帚夜行 | broomrace | 2→3 | 夜空底预渲染；月亮/星 `orb` |
| 龙蛋孵化 | dragonegg | 3→4 | Kit：`ensureDeBg` 缓存霓虹底；原有 FX 保留 |
| 地牢钥匙 | dungeonkey | 2→3 | 地牢底预渲染；钥匙/门 `tile`/`orb` |
| 巫师决斗 | hexduel | 3→4 | Kit：`ensureHdBg` 缓存霓虹底；原有 FX 保留 |
| 悬浮术 | levitate | 3→4 | Kit：`ensureLvBg` 缓存霓虹底；原有 FX 保留 |
| 符文施法 | spelldraw | 2→3 | 法阵底预渲染；起点 `orb`+`glow`；星点 `orb` |
| 滚珠入洞 | ballroll | 5→6 | 舞台底预渲染；墙体 `tile` |
| 投篮 | hoop | 5→6 | Kit：`ensureHpBg` 缓存霓虹底；原有 FX 保留 |
| 纸飞机 | paperfly | 4→5 | 天空底预渲染；太阳 `orb`+`glow` |
| 点球 | penalty | 4→5 | 球场底预渲染 |
| 跳格金字塔 | pyramid | 4→5 | 舞台底预渲染；玩家 `tile`；敌人 `orb`+`glow` |
| 踢毽子 | shuttle | 4→5 | 夜空底预渲染 |
| 平稳托盘 | waiter | 4→5 | 霓虹厅底预渲染；托盘 `tile` |
| 冰窗花 | frost | 4→5 | 冬夜底预渲染；月亮 `orb`+`glow` |

## 触控与布局修复（≥44px，不滚动）

- 各款本地 `html.game-ui … {min-width:44px;min-height:44px}`（未改共用 CSS）。
- `paperfly` / `penalty`：本地补强 `#pz` / `#snd` / `.ib` 至 44×44（覆盖原 34px）。
- 本批 390×844 / 360×640 开局后页面无新增滚动（相对改前基线）。

## 对比图（390×844，改前左、改后右）

| | |
|---|---|
| ![spacelevator](art-batch-T2-4/spacelevator.png) | ![starmail](art-batch-T2-4/starmail.png) |
| ![ascent](art-batch-T2-4/ascent.png) | ![inkspray](art-batch-T2-4/inkspray.png) |
| ![jellyzap](art-batch-T2-4/jellyzap.png) | ![lighthouse](art-batch-T2-4/lighthouse.png) |
| ![seacannon](art-batch-T2-4/seacannon.png) | ![shellswap](art-batch-T2-4/shellswap.png) |
| ![sonar](art-batch-T2-4/sonar.png) | ![tideseek](art-batch-T2-4/tideseek.png) |
| ![broomrace](art-batch-T2-4/broomrace.png) | ![dragonegg](art-batch-T2-4/dragonegg.png) |
| ![dungeonkey](art-batch-T2-4/dungeonkey.png) | ![hexduel](art-batch-T2-4/hexduel.png) |
| ![levitate](art-batch-T2-4/levitate.png) | ![spelldraw](art-batch-T2-4/spelldraw.png) |
| ![ballroll](art-batch-T2-4/ballroll.png) | ![hoop](art-batch-T2-4/hoop.png) |
| ![paperfly](art-batch-T2-4/paperfly.png) | ![penalty](art-batch-T2-4/penalty.png) |
| ![pyramid](art-batch-T2-4/pyramid.png) | ![shuttle](art-batch-T2-4/shuttle.png) |
| ![waiter](art-batch-T2-4/waiter.png) | ![frost](art-batch-T2-4/frost.png) |

## 测试结果（2026-10-28）

- `node scripts/check-game.cjs` 本批 24 款：两种尺寸 **48/48 PASS**。
- 无头浏览器开局测试（Playwright；点开始→关卡/教程）：390×844 与 360×640 **48/48 PASS**，控制台无报错。
- `node scripts/sync-game-ui.cjs --check --strict --only=<本批24>`：Verified 24，退出码 0。
- `node scripts/build-classic-games.cjs --check`：五款 Verified（`pyramid` 源在 `scripts/classics/pyramid.cjs`；`CLASSIC_VERSION` 4→5，五款经典 meta 同步）。
- `node scripts/test-classic-games.cjs`：connectfour / colorlines / yahtzee / pyramid PASS；`columns` 对角线消除断言 `4!==3` 为既有问题（本批未改 columns 玩法，仅 meta 版本随 CLASSIC_VERSION 同步）。
- `paperfly` / `penalty`：本地补强 `#pz` / `.ib` 至 44×44（覆盖原 34px）。
- zip / manifest 未手改。

