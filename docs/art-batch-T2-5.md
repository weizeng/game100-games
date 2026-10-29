# 画面升级批次 T2-5（2026-10-29）

第 3 步「画布画面升级」第二档第 5 批（冰雪 + 街机）。24 款全部完成。批次表见 [皮肤 B 上线记录](ui-skin-b-2026-10-20.md)。

- 统一做法：画布内用共享的 `GameUI.fx`：倒角糖果方块 `tile`、光泽球 `orb`、接触投影 `shadow`、渐变背景 `stage`、少量发光 `glow`、粒子 `burst` / `drawBurst`。
- 大块静态画面只在第一次画进离屏 canvas，之后每帧一次 `drawImage`（`ensureIbBg` / `ensureIcBg` / `ensureIsBg` / `ensureSkBg` / `ensureSlhBg` / `ensureSbBg` / `ensureSnbBg` / `ensureSfBg` / `ensureSmBg` / `ensureSpBg` / `ensureYtBg` / `ensureBfBg` / `ensureDdBg` / `ensureDhBg` / `ensureLmBg` / `ensureBlBg` / `ensureCtBg` / `ensureClBg` / `ensureCoBg` / `ensureDrBg` / `ensureFiBg` / `ensurePpBg` / `ensureSltBg` 等）。
- `tile`、`orb` 的尺寸都取整数；原来的平面 draw 原样保留，没有 FX 时作为兜底。
- 玩法、碰撞、计分、存档键都没改；`studio` 没改。
- zip 和 manifest 交给 Actions 生成，没有手改。

## 逐款改动

| 游戏 | id | 版本 | 画面改动 |
|---|---|---|---|
| 铺冰桥 | icebridge | 4→5 | 夜冰底预渲染；星点 orb |
| 冰壶 | icecurl | 5→6 | 冰面底预渲染；冰壶 orb |
| 冰滑块 | iceslide | 4→5 | 冰盘底预渲染；墙体 tile |
| 滑雪 | ski | 4→5 | 雪坡底预渲染；雪花 orb |
| 雪橇 | sleigh | 4→5 | 夜空底预渲染；月亮 orb+glow |
| 雪球大战 | snowball | 5→6 | Kit：ensureSbBg 缓存霓虹底；原有 FX 保留 |
| 雪人兄弟 | snowbros | 4→5 | 冰夜底预渲染；平台 tile；雪花 orb |
| 雪花剪 | snowflake | 4→5 | 冬夜底预渲染；星点 orb |
| 堆雪人 | snowman | 4→5 | 冬夜底预渲染；雪花 orb |
| 铲雪车 | snowplow | 4→5 | 夜路底预渲染；道路 tile；星点 orb |
| 雪怪 | yeti | 4→5 | 夜山底预渲染；月亮 orb+glow |
| 大鱼吃小鱼 | bigfish | 5→6 | Kit：ensureBfBg 缓存霓虹底；原有 FX 保留 |
| 挖地 | digdug | 4→5 | 泥土底预渲染；土块 tile |
| 打鸭子 | duckhunt | 4→5 | 天空底预渲染；草地 tile |
| 砍树工 | lumber | 4→5 | 林间底预渲染；树桩 tile |
| 打气球 | balloon | 6→7 | Kit：ensureBlBg 缓存霓虹底；原有 FX 保留 |
| 接金币 | catch | 4→5 | 霓虹厅底预渲染 |
| 抓娃娃 | claw | 5→6 | Kit：ensureClBg 缓存霓虹底；原有 FX 保留 |
| 方块消消 | collapse | 7→8 | Kit：ensureCoBg 缓存霓虹底；原有 FX 保留 |
| 画线救援 | draw | 4→5 | 紫夜底预渲染；地面 tile；光点 orb |
| 翻色 | floodit | 5→6 | 霓虹底预渲染；色块 tile |
| 连连看 | link | 5→6 | DOM 棋盘霓虹底与糖果 tile 光泽 |
| 戳泡泡 | pop | 4→5 | 霓虹底预渲染；泡泡 orb |
| 拉霸 | slot | 5→6 | Kit：ensureSltBg 缓存霓虹底；原有 FX 保留 |

## 触控与布局修复（≥44px，不滚动）

- 各款本地 `html.game-ui … {min-width:44px;min-height:44px}`（未改共用 CSS）。
- `link`：DOM 棋盘补强霓虹底与糖果 tile 光泽（本批无独立 canvas 舞台）。
- 本批 390×844 / 360×640 开局后页面无新增滚动（相对改前基线）。

## 对比图（390×844，改前左、改后右）

| | |
|---|---|
| ![icebridge](art-batch-T2-5/icebridge.png) | ![icecurl](art-batch-T2-5/icecurl.png) |
| ![iceslide](art-batch-T2-5/iceslide.png) | ![ski](art-batch-T2-5/ski.png) |
| ![sleigh](art-batch-T2-5/sleigh.png) | ![snowball](art-batch-T2-5/snowball.png) |
| ![snowbros](art-batch-T2-5/snowbros.png) | ![snowflake](art-batch-T2-5/snowflake.png) |
| ![snowman](art-batch-T2-5/snowman.png) | ![snowplow](art-batch-T2-5/snowplow.png) |
| ![yeti](art-batch-T2-5/yeti.png) | ![bigfish](art-batch-T2-5/bigfish.png) |
| ![digdug](art-batch-T2-5/digdug.png) | ![duckhunt](art-batch-T2-5/duckhunt.png) |
| ![lumber](art-batch-T2-5/lumber.png) | ![balloon](art-batch-T2-5/balloon.png) |
| ![catch](art-batch-T2-5/catch.png) | ![claw](art-batch-T2-5/claw.png) |
| ![collapse](art-batch-T2-5/collapse.png) | ![draw](art-batch-T2-5/draw.png) |
| ![floodit](art-batch-T2-5/floodit.png) | ![link](art-batch-T2-5/link.png) |
| ![pop](art-batch-T2-5/pop.png) | ![slot](art-batch-T2-5/slot.png) |

## 测试结果（2026-10-29）

- `node scripts/check-game.cjs` 本批 24 款：两种尺寸 **48/48 PASS**。
- 无头浏览器开局测试（Playwright；点开始→关卡/教程）：390×844 与 360×640 **48/48 PASS**，控制台无报错。
- `node scripts/sync-game-ui.cjs --check --strict --only=<本批24>`：Verified 24，退出码 0。
- `node scripts/build-classic-games.cjs --check`：五款 Verified（本批无经典源改动）。
- zip / manifest 未手改。
