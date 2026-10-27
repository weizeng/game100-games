# 画面升级批次 T2-3（2026-10-27）

第 3 步「画布画面升级」第二档第 3 批（街机/动作续 + 太空）。24 款全部完成。批次表见 [皮肤 B 上线记录](ui-skin-b-2026-10-20.md)。

- 统一做法：画布内用共享的 `GameUI.fx`：倒角糖果方块 `tile`、光泽球 `orb`、接触投影 `shadow`、渐变背景 `stage`、少量发光 `glow`、粒子 `burst` / `drawBurst`。
- 大块静态画面只在第一次画进离屏 canvas，之后每帧一次 `drawImage`（`ensurePnBg` / `ensurePpBg` / `ensurePtBg` / `ensureRhBg` / `ensureSgBg` / `ensureSlBg` / `ensureStBg` / `ensureSwBg` / `ensureSpBg` / `ensureTdBg` / `ensureTrBg` / `ensureTwBg` / `ensureVoBg` / `ensureAuBg` / `ensureDsBg` / `ensureDkBg` / `ensureJpBg` / `ensureLlBg` / `ensureMsBg` / `ensureMcBg` / `ensureOrBg` / `ensureRkBg` / `ensureShBg` 等）。
- `tile`、`orb` 的尺寸都取整数；原来的平面 draw 原样保留，没有 FX 时作为兜底。
- 玩法、碰撞、计分、存档键都没改；`studio` 没改。
- zip 和 manifest 交给 Actions 生成，没有手改。

## 逐款改动

| 游戏 | id | 版本 | 画面改动 |
|---|---|---|---|
| 钢琴块 | piano | 5→6 | Kit：`ensurePnBg` 缓存霓虹底；原有 FX 保留 |
| 梅花桩 | plumpile | 5→6 | Kit：`ensurePpBg` 缓存霓虹底；原有 FX 保留 |
| 陶艺拉坯 | pottery | 3→4 | Kit：`ensurePtBg` 缓存霓虹底；原有 FX 保留 |
| 节奏拍 | rhythm | 4→5 | 舞台底预渲染；按键 `tile`；音符 `orb` |
| 猜杯子 | shellgame | 2→3 | 舞台底预渲染；小球 `orb`+`glow` |
| 引力弹射 | slingshot | 5→6 | 星空底预渲染；行星/粒子 `orb` |
| 打陀螺 | spintop | 2→3 | 舞台底预渲染；陀螺芯 `orb` |
| 剑守三关 | swordlane | 5→6 | 舞台底预渲染；粒子 `orb` |
| 剑气格挡 | swordparry | 4→5 | 舞台底预渲染；粒子 `orb` |
| 简易塔防 | towerdef | 4→5 | 战场底预渲染；炮塔/敌人/子弹 `orb` |
| 空中飞人 | trapeze | 2→3 | 夜空底预渲染；月亮 `orb`；秋千座 `tile` |
| 江湖拔河 | tugwar | 4→5 | 舞台底预渲染；粒子 `orb` |
| 火山逃生 | volcano | 5→6 | Kit：`ensureVoBg` 缓存霓虹底；原有 FX 保留 |
| 极光 | aurora | 4→5 | 极夜底预渲染；月亮/粒子 `orb` |
| 太空清道夫 | debrisweep | 4→5 | 星空底预渲染；光束点 `orb` |
| 太空对接 | docking | 5→6 | 星空底预渲染；舱窗/粒子 `orb` |
| 喷气背包 | jetpack | 4→5 | 夜城底预渲染；电塔 `tile`；头盔/粒子 `orb` |
| 登月舱 | lunarlander | 4→5 | 星空底预渲染；着陆台 `tile` |
| 导弹拦截 | missile | 4→5 | 夜空/地面底预渲染；城市 `tile`；弹头/粒子 `orb` |
| 月球车 | mooncrawl | 4→5 | 星空底预渲染；地形保留 |
| 月相拼图 | moonphase | 4→5 | 霓虹月相砖 CSS；彩纸粒子 `orb` |
| 轨道躲避 | orbit | 5→6 | Kit：`ensureOrBg` 缓存霓虹底；原有 FX 保留 |
| 火箭 | rocket | 4→5 | 高度色键缓存霓虹星空底 |
| 星球护盾 | shieldguard | 4→5 | 星空底预渲染；护盾原有效果保留 |

## 触控与布局修复（≥44px，不滚动）

- 各款本地 `html.game-ui … {min-width:44px;min-height:44px}`（未改共用 CSS）。
- `rhythm` / `rocket`：本地补强 `#pz` / `.ib` 至 44×44（覆盖原 34px）。
- `spintop`：开始按钮 id 统一为 `startBtn`（原 `startbtn`），便于检查脚本识别。
- 本批 390×844 / 360×640 开局后页面无新增滚动（相对改前基线）。

## 对比图（390×844，改前左、改后右）

| | |
|---|---|
| ![piano](art-batch-T2-3/piano.png) | ![plumpile](art-batch-T2-3/plumpile.png) |
| ![pottery](art-batch-T2-3/pottery.png) | ![rhythm](art-batch-T2-3/rhythm.png) |
| ![shellgame](art-batch-T2-3/shellgame.png) | ![slingshot](art-batch-T2-3/slingshot.png) |
| ![spintop](art-batch-T2-3/spintop.png) | ![swordlane](art-batch-T2-3/swordlane.png) |
| ![swordparry](art-batch-T2-3/swordparry.png) | ![towerdef](art-batch-T2-3/towerdef.png) |
| ![trapeze](art-batch-T2-3/trapeze.png) | ![tugwar](art-batch-T2-3/tugwar.png) |
| ![volcano](art-batch-T2-3/volcano.png) | ![aurora](art-batch-T2-3/aurora.png) |
| ![debrisweep](art-batch-T2-3/debrisweep.png) | ![docking](art-batch-T2-3/docking.png) |
| ![jetpack](art-batch-T2-3/jetpack.png) | ![lunarlander](art-batch-T2-3/lunarlander.png) |
| ![missile](art-batch-T2-3/missile.png) | ![mooncrawl](art-batch-T2-3/mooncrawl.png) |
| ![moonphase](art-batch-T2-3/moonphase.png) | ![orbit](art-batch-T2-3/orbit.png) |
| ![rocket](art-batch-T2-3/rocket.png) | ![shieldguard](art-batch-T2-3/shieldguard.png) |

## 测试结果（2026-10-27）

- `node scripts/check-game.cjs` 本批 24 款：两种尺寸 **48/48 PASS**。
- 无头浏览器开局测试（Playwright；点开始→关卡/教程）：390×844 与 360×640 **48/48 PASS**，控制台无报错。
- `node scripts/sync-game-ui.cjs --check --strict --only=<本批24>`：Verified 24，退出码 0。
- `node scripts/build-classic-games.cjs --check`：五款 Verified。
- `node scripts/test-classic-games.cjs`：10/10 PASS。
- 本批相关玩法：`towerdef` classic/expert、`moonphase` classic PASS（全量 `test-gameplay` 被无关的 snake 既有问题打断，未计入本批）。
- zip / manifest 未手改。
