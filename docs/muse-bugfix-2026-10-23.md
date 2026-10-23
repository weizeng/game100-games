# Muse 游戏 Bug 排查与修复（2026-10-23）

## 范围

- 仓库：`games/*/meta.json` 中 `studio: "Muse"`
- Muse 游戏总数：**246**（全库约 266，Grok 约 20）
- 本轮：**全量双视口冒烟**（390×844 + 360×640）+ 开局/暂停相关探测；对问题款再做交互冒烟

## 方法摘要

1. Playwright + 系统 Chrome 无头打开每款 Muse 游戏
2. 点「开始」/关卡入口，记录 `pageerror`、能否开局、文档纵向溢出（`scrollHeight - innerHeight`）
3. 对溢出与可疑款再测交互（加试剂、消行、掷骰等）
4. 按严重度排序后修复最严重一批，逐款复测后再推送

## 结论（自动化实测）

| 项 | 结果 |
|---|---|
| 全量 Muse | 246 |
| 开局卡住 | **0** |
| 无法点开始 | **0**（早期 `bumpercar` 误报，复测正常） |
| 控制台 pageerror（开局） | **0** |
| **360×640 页面溢出** | **16**（主要问题） |

用户体感「Muse 好像都有 bug」，本轮硬证据集中在：**早期科学实验 / 部分经典玩法在小屏上整页过高，底栏按钮被裁切或要整页滚动**，而不是大面积 JS 崩溃。

### 溢出 16 款（修复前，360×640 溢出像素）

溶解度 679、酸碱中和 422、化学反应 327、水果电池 326、pH试纸 265、生态瓶 221、晶体生长 216、快艇骰子 211、共振实验 156、酸碱指示剂 105、静电实验 99、魔块跳跳 90、显微镜 90、火箭原理 86、俄罗斯方块 81、眼睛成像 61。

根因模式：固定高度烧杯/曲线双栏、`min-height:100vh` 叠面板，未锁 `html/body { overflow:hidden }` + 视口内布局。

## 本批已修复（16 款）

每款：注入 `muse-short-fix-2026-10-23` 短屏 CSS（锁视口、压缩画布/面板、内部滚动）、**version +1**、**studio 保持 Muse**。

| id | 名称 | 新版本 | 修复要点 |
|---|---|---|---|
| solubility | 溶解度 | 3 | 烧杯/溶解度曲线压缩，`#app` 视口内滚动 |
| acidbase | 酸碱中和 | 3 | 滴定管/烧杯/曲线降高 |
| chemreact | 化学反应 | 3 | 烧杯与试剂架压缩，screen 内滚动 |
| fruitbattery | 水果电池 | 3 | 舞台与日志区降高 |
| phtest | pH试纸 | 3 | 浸纸区/比色布局适配短屏 |
| ecobottle | 生态瓶 | 3 | 舞台与日志压缩 |
| crystal | 晶体生长 | 3 | 主画布/结果画布降高 |
| yahtzee | 快艇骰子 | 4 | 记分表内部滚动，收紧间距 |
| resonance | 共振实验 | 3 | 画布 `max-height: svh` |
| indicator | 酸碱指示剂 | 3 | 试管高度压缩 |
| staticlab | 静电实验 | 3 | 舞台/日志压缩 |
| cubhop | 魔块跳跳 | 3 | 画布随 `#cvwrap` 缩放 |
| microscopelab | 显微镜 | 3 | 视野区 `max-height` |
| rocketlab | 火箭原理 | 3 | 舞台/日志压缩 |
| tetris | 俄罗斯方块 | 6 | 棋盘 `max-height: calc(100dvh - …)`，收紧控制条 |
| eyevision | 眼睛成像 | 3 | 画布 `max-height: svh` |

复测：**16/16 在 360×640 溢出 ≤ 8px**；抽样可玩性（溶解度加溶质、酸碱滴液、方块落到底、化学反应预测、pH 点瓶、水果电池开局）**无 pageerror**。

## 尚未修但已确认 / 观察

- **未发现** Muse 全量级「点开始就崩 / 黑屏」；若实机仍有单款逻辑 bug，需按具体步骤继续修。
- 共享样式在 ≤360 宽顶栏按钮 **min-width 40px**（未达 44px）影响面大（百款级），本轮**未改**共用 GameUI，避免无请求全库升版。
- 部分科学实验可玩性仍偏「沙盒」而非关卡（与 Grok 升级款对比），属体验迭代，不在本轮崩溃级范围。
- 拉霸等「开始」画在 canvas 上，DOM 探测会误判无按钮；实测点画布可转（非 bug）。

## 产物路径

- 报告：`docs/muse-bugfix-2026-10-23.md`
- 对比拼图：`/workspace/muse-bugs/muse-overflow-before-after.png`
- 复测数据：`/workspace/muse-bugs/retest.json`、`fixed-batch.json`

## 发布

- 提交：`6575a41`
- Actions：https://github.com/weizeng/game100-games/actions/runs/39940499919
