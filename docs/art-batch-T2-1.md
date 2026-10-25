# 画面升级批次 T2-1（2026-10-25）

第 3 步「画布画面升级」第二档第 1 批（科学实验 / lab）。24 款全部完成。批次表见 [皮肤 B 上线记录](ui-skin-b-2026-10-20.md)。

- 统一做法：画布内用共享的 `GameUI.fx`：倒角糖果方块 `tile`、光泽球 `orb`、接触投影 `shadow`、渐变背景 `stage`、少量发光 `glow`、粒子 `burst` / `drawBurst`。
- 大块静态画面（实验台/夜空/导轨底）只在第一次画进离屏 canvas，之后每帧一次 `drawImage`（`ensureLabBg` / `ensureFfBg` / `ensureBuoyBg` / `ensureColBg` / `ensurePulBg` / `ensureAbBg` / `ensureCrBg` / `ensureEvBg` / `ensureHpBg` / `ensureLuBg` 等）。
- `tile`、`orb` 的尺寸都取整数；原来的平面 draw 原样保留，没有 FX 时作为兜底。
- 玩法、碰撞、计分、存档键都没改；`studio` 没改（24 款均为 `"Muse"`）。
- zip 和 manifest 交给 Actions 生成，没有手改。

## 逐款改动

| 游戏 | id | 版本 | 画面改动 |
|---|---|---|---|
| 酸碱滴定 | acidbase | 4→5 | 曲线台底 `stage` 预渲染；当前点 `orb`+`glow`；触控 ≥44px + canvas max-width |
| 浮力实验 | buoyancy | 2→3 | 水槽底预渲染；浮体 `orb`/`tile`+投影；水花 `burst` |
| 细胞结构 | cellstruct | 3→4 | Kit：`ensureLabBg` 缓存霓虹底；原有 FX 细胞部件保留 |
| 电路实验 | circuit | 3→4 | Kit：lab 底缓存；原有 FX 元件保留 |
| 碰撞实验 | collision | 2→3 | 导轨底预渲染；小车 `tile`+轮 `orb`；撞击闪光 `glow`/`burst` |
| 燃烧实验 | combustion | 2→3 | 蜡烛 `tile`；木板/地面糖果块；水滴 `orb` |
| 晶体生长 | crystal | 4→5 | 烧杯台底预渲染；温度计 `tile`；晶粒/闪光 `orb`；晶体 `glow` |
| 电磁铁 | electromagnet | 3→4 | Kit：lab 底缓存；原有 FX 保留 |
| 眼睛成像 | eyevision | 4→5 | 场景底预渲染；模糊/物体投影与 `glow` |
| 自由落体 | freefall | 2→3 | 斜塔/地面底预渲染；球 `orb`+投影；落地尘烟 `burst` |
| 摩擦实验 | friction | 2→3 | 星空底预渲染；斜面/木块 `tile`+投影 |
| 心脏泵血 | heartpump | 3→4 | 舞台底预渲染；心跳 `glow`；粒子/血滴 `orb` |
| 斜面实验 | incline | 3→4 | Kit：lab 底缓存；原有 FX 保留 |
| 透镜成像 | lens | 3→4 | Kit：lab 底缓存；原有 FX 保留 |
| 杠杆实验 | lever | 2→3 | 星空底预渲染；砝码/支点/杆 `tile`；平衡 `burst` |
| 肺活量 | lungcap | 3→4 | 舞台底预渲染；气管 `tile`；肺叶 `glow`；气流 `orb` |
| 磁铁实验 | magnet | 3→4 | Kit：lab 底缓存；原有 FX 保留 |
| 显微镜实验室 | microscopelab | 4→5 | 视野底 `stage`；细胞块 `tile`；细胞核 `orb`；标记 `glow` |
| 有丝分裂 | mitosis | 3→4 | Kit：lab 底缓存；原有 FX 保留 |
| 欧姆定律 | ohm | 3→4 | Kit：lab 底缓存；原有 FX 保留 |
| 单摆实验 | pendulum | 4→5 | Kit：lab 底缓存；原有 FX 保留 |
| 棱镜色散 | prism | 4→5 | Kit：lab 底缓存；原有 FX 保留 |
| 平抛实验 | projectile | 4→5 | Kit：lab 底缓存；角度/速度微调钮本地强制 ≥44px |
| 滑轮组 | pulley | 2→3 | 舞台底预渲染；滑轮 `orb`；重物 `tile`+投影 |

## 触控与布局修复（≥44px，不滚动）

- 各款本地 `html.game-ui … {min-width:44px;min-height:44px}`（未改共用 CSS）。
- Kit / 独立实验：canvas 加 `max-width:min(480px,calc((100svh - Npx)*1.2))`（并保留 `vh` 兜底），避免 360×640 溢出。
- projectile：`#aM/#aP/#vM/#vP` 在 360 宽时被共用样式压小，本地强制 44×44。
- combustion 在 360×640 点开始后页面高度约 670（**改前同样**），相对基线 Δ=0，未额外引入滚动。

## 对比图（390×844，改前左、改后右）

| | |
|---|---|
| ![acidbase](art-batch-T2-1/acidbase.png) | ![buoyancy](art-batch-T2-1/buoyancy.png) |
| ![cellstruct](art-batch-T2-1/cellstruct.png) | ![circuit](art-batch-T2-1/circuit.png) |
| ![collision](art-batch-T2-1/collision.png) | ![combustion](art-batch-T2-1/combustion.png) |
| ![crystal](art-batch-T2-1/crystal.png) | ![electromagnet](art-batch-T2-1/electromagnet.png) |
| ![eyevision](art-batch-T2-1/eyevision.png) | ![freefall](art-batch-T2-1/freefall.png) |
| ![friction](art-batch-T2-1/friction.png) | ![heartpump](art-batch-T2-1/heartpump.png) |
| ![incline](art-batch-T2-1/incline.png) | ![lens](art-batch-T2-1/lens.png) |
| ![lever](art-batch-T2-1/lever.png) | ![lungcap](art-batch-T2-1/lungcap.png) |
| ![magnet](art-batch-T2-1/magnet.png) | ![microscopelab](art-batch-T2-1/microscopelab.png) |
| ![mitosis](art-batch-T2-1/mitosis.png) | ![ohm](art-batch-T2-1/ohm.png) |
| ![pendulum](art-batch-T2-1/pendulum.png) | ![prism](art-batch-T2-1/prism.png) |
| ![projectile](art-batch-T2-1/projectile.png) | ![pulley](art-batch-T2-1/pulley.png) |

## 测试结果（2026-10-25）

- `node scripts/check-game.cjs` 本批 24 款：两种尺寸 **48/48 PASS**。
- 无头浏览器开局测试（Playwright；点开始→关卡/教程→轻点画布）：390×844 和 360×640 **47/48 PASS**（combustion 360×640 滚动与改前基线相同 Δ=0，见上）。控制台无报错。
- `node scripts/sync-game-ui.cjs --check --strict --only=<本批24>`：Verified 24，退出码 0。
- `node scripts/build-classic-games.cjs --check`：五款 Verified。
- `node scripts/test-classic-games.cjs`：10/10 PASS。
- `test-gameplay.cjs`：本批无相关断言；全量脚本在无关的 snake 上因既有问题失败，未纳入本批门槛。
