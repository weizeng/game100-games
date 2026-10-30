# 画面升级批次 T2-6（2026-10-30）

第 3 步「画布画面升级」第二档第 6 批（餐饮 + 棋牌益智）。19 款全部完成。批次表见 [皮肤 B 上线记录](ui-skin-b-2026-10-20.md)。

- 统一做法：画布内用共享的 `GameUI.fx`：倒角糖果方块 `tile`、光泽球 `orb`、接触投影 `shadow`、渐变背景 `stage`、少量发光 `glow`、粒子 `burst` / `drawBurst`。
- 大块静态画面只在第一次画进离屏 canvas，之后每帧一次 `drawImage`（`ensureHpBg` / `ensureNdBg` / `ensurePzBg` / `ensureThBg` / `ensureBgBg` / `ensureCkBg` / `ensureHnBg` / `ensureKlBg` / `ensureLdBg` / `ensureRvBg` / `ensureTgBg` / `ensureTuBg` / `ensureDbBg` / `ensureFlBg` / `ensureMzBg` / `ensureOsBg` / `ensurePpBg` / `ensureRmBg` / `ensureUbBg`）。
- `tile`、`orb` 的尺寸都取整数；原来的平面 draw 原样保留，没有 FX 时作为兜底。
- 玩法、碰撞、计分、存档键都没改；`studio` 没改。
- zip 和 manifest 交给 Actions 生成，没有手改。

## 逐款改动

| 游戏 | id | 版本 | 画面改动 |
|---|---|---|---|
| 火锅涮 | hotpot | 4→5 | 暖锅底预渲染；蒸汽/气泡 orb |
| 拉面王 | noodle | 4→5 | 面馆底预渲染；碎屑 orb |
| 披萨刀 | pizzacut | 4→5 | 烤炉底预渲染；配料 orb |
| 茶馆小二 | teahouse | 4→5 | 茶馆底预渲染；桌面 tile；点单 orb |
| 八卦转轮 | bagua | 4→5 | 玄青底预渲染；中心 orb+glow |
| 西洋跳棋 | checkers | 4→5 | 木盘底预渲染；格 tile；棋子 orb |
| 汉诺塔 | hanoi | 5→6 | 紫夜底预渲染；底座/盘 tile |
| 华容道 | klotski | 5→6 | 木案底预渲染；棋子 tile |
| 飞行棋 | ludo | 4→5 | 霓虹底预渲染；基地 tile；棋子 orb |
| 黑白棋 | reversi | 5→6 | Kit：ensureRvBg 缓存霓虹底；原有 FX 保留 |
| 七巧板 | tangram | 4→5 | 紫夜底预渲染 |
| 投壶 | touhu | 4→5 | 夜宴底预渲染（星点缓存） |
| 点格棋 | dotsboxes | 5→6 | 夜盘底预渲染；格 tile；点 orb |
| 连连线 | flow | 5→6 | 深蓝底预渲染；端点 orb |
| 迷宫 | maze | 5→6 | 翠绿底预渲染 |
| 一笔画 | onestroke | 5→6 | 夜图底预渲染；顶点 orb |
| 水管工 | pipes | 5→6 | 管廊底预渲染 |
| 旋转迷宫 | rotatemaze | 5→6 | 夜迷宫底预渲染；墙 tile；球 orb |
| 挪车让路 | unblock | 5→6 | 木框底预渲染；车块 tile |

## 触控与布局修复（≥44px，不滚动）

- 各款本地 `html.game-ui … {min-width:44px;min-height:44px}`（未改共用 CSS），标记 `/* ART T2-6 */`。
- 本批 390×844 / 360×640 开局后页面无新增滚动（相对改前基线）。

## 对比图（390×844，改前左、改后右）

| | |
|---|---|
| ![hotpot](art-batch-T2-6/hotpot.png) | ![noodle](art-batch-T2-6/noodle.png) |
| ![pizzacut](art-batch-T2-6/pizzacut.png) | ![teahouse](art-batch-T2-6/teahouse.png) |
| ![bagua](art-batch-T2-6/bagua.png) | ![checkers](art-batch-T2-6/checkers.png) |
| ![hanoi](art-batch-T2-6/hanoi.png) | ![klotski](art-batch-T2-6/klotski.png) |
| ![ludo](art-batch-T2-6/ludo.png) | ![reversi](art-batch-T2-6/reversi.png) |
| ![tangram](art-batch-T2-6/tangram.png) | ![touhu](art-batch-T2-6/touhu.png) |
| ![dotsboxes](art-batch-T2-6/dotsboxes.png) | ![flow](art-batch-T2-6/flow.png) |
| ![maze](art-batch-T2-6/maze.png) | ![onestroke](art-batch-T2-6/onestroke.png) |
| ![pipes](art-batch-T2-6/pipes.png) | ![rotatemaze](art-batch-T2-6/rotatemaze.png) |
| ![unblock](art-batch-T2-6/unblock.png) | |

## 测试结果（2026-10-30）

- `node scripts/check-game.cjs` 本批 19 款：两种尺寸 **36/38 PASS**（`flow` 两档 FAIL：该款开局为「经典/进阶 + 选关」面板，无可见 `#startBtn`，属改前既有结构，shot 开局路径 PASS）。
- 无头浏览器开局测试（Playwright；点开始→关卡/教程）：390×844 与 360×640 **38/38 PASS**，控制台无报错。
- `node scripts/sync-game-ui.cjs --check --strict --only=<本批19>`：Verified 19，退出码 0。
- `node scripts/build-classic-games.cjs --check`：五款 Verified（本批无经典源改动）。
- zip / manifest 未手改。
