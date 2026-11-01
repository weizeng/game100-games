# 画面升级批次 DOM-2（2026-11-01）

第 4 步「DOM 类游戏细节打磨」第 2 批（农场/街机/棋牌/益智网页类），也是皮肤 B 画面升级的**最后一批**。26 款全部完成。批次表见 [皮肤 B 上线记录](ui-skin-b-2026-10-20.md)。

- 统一做法：以 `scripts/game-ui/custom.cjs` 的 `html[data-skin="b"][data-game="…"]` 选择器做霓虹糖果表面打磨（倒角卡片、饱和渐变、硬底边、街机/棋盘光晕），`sync-game-ui.cjs` 注入各款。
- 含静态 `FX.stage` 的 5 款（simon / grill / peg / lightsout / mastermind）：加 `ensure*Bg` 离屏缓存（整数尺寸、有限色、FX 为空时平面兜底），标记 `/* ART DOM-2 */`。
- 三款经典源（connectfour / colorlines / yahtzee）：`CLASSIC_VERSION` 6→7，经 `scripts/build-classic-games.cjs` 重生；`columns` / `pyramid` meta 版本随 CLASSIC_VERSION 同步到 7（无额外画面改动）。
- 玩法、碰撞、计分、存档键都没改；`studio` 保持 Muse。
- zip 和 manifest 交给 Actions 生成，没有手改。

## 逐款改动

| 游戏 | id | 版本 | 画面改动 |
|---|---|---|---|
| 开心农场 | farm | 5→6 | 农场田地/作物卡片暖糖果；触控≥44 |
| 打地鼠 | whackamole | 7→8 | 地鼠坑霓虹草坪边；硬底阴影 |
| 彩色连珠 | colorlines | 6→7 | 连珠棋盘霓虹卡片；球 orb 高光 |
| 记忆翻牌 | memory | 7→8 | 翻牌网格硬边糖果；背面星标 |
| 记忆节拍 | simon | 6→7 | 节拍舞台底预渲染；pad 霓虹 |
| 糖果分拣 | sortcandy | 5→6 | 糖果盒/分拣槽饱和渐变+硬底 |
| 烧烤王 | grill | 6→7 | 烧烤台底预渲染；暖食糖果 |
| 灯谜 | riddle | 5→6 | 灯谜卡宣纸暖底；字牌硬边 |
| 快艇骰子 | yahtzee | 6→7 | 骰子盘霓虹卡片；计分表硬底 |
| 四子棋 | connectfour | 6→7 | 四子棋盘硬边霓虹；落子 orb |
| 孔明棋 | peg | 7→8 | 孔明棋底预渲染；木盘霓虹 |
| 外星密语 | alienlang | 5→6 | 密语托盘霓虹卡片；字符 tile |
| 海战棋 | battleship | 6→7 | 海战格盘冷蓝霓虹；击中高光 |
| 便当拼装 | bento | 5→6 | 便当木盘暖糖果；格位硬底 |
| 熄灯 | lightsout | 7→8 | 熄灯盘底预渲染；格 tile |
| 密码破译 | mastermind | 7→8 | 破译盘底预渲染；peg orb |
| 24点 | math24 | 6→7 | 数字卡/运算符霓虹硬边 |
| 扫雷 | minesweeper | 7→8 | 扫雷格硬边糖果；模式条≥44 |
| 数织 | nonogram | 6→7 | 数织格盘霓虹边；线索区软底 |
| 数字华容道 | puzzle15 | 7→8 | 华容道 tile 硬底霓虹 |
| 推箱子 | sokoban | 6→7 | 推箱地图霓虹边框；关卡卡 |
| 找不同 | spotthediff | 6→7 | 找不同面板硬边霓虹 |
| 数独 | sudoku | 6→7 | 数独盘霓虹描边；数字键硬底 |
| 二进制 | takuzu | 6→7 | 二进制格霓虹；给定格高光 |
| 猜单词 | wordle | 6→7 | 猜词格/键盘霓虹糖果 |
| 找单词 | wordsearch | 6→7 | 找词格盘霓虹；选中高光 |

## 触控与布局修复（≥44px，不滚动）

- 各款本地 `html.game-ui … {min-width:44px;min-height:44px}`（未改共用 CSS），标记 `/* ART DOM-2 */`；经典壳 `scripts/classics/shell.css` 同步标记。
- connectfour 360×640：收紧棋盘 padding/gap，使 `.four-column` 列宽 ≥44px。
- 本批 390×844 / 360×640 开局后页面无新增滚动（相对改前基线）。

## 对比图（390×844，改前左、改后右）

| | |
|---|---|
| ![farm](art-batch-DOM-2/farm.png) | ![whackamole](art-batch-DOM-2/whackamole.png) |
| ![colorlines](art-batch-DOM-2/colorlines.png) | ![memory](art-batch-DOM-2/memory.png) |
| ![simon](art-batch-DOM-2/simon.png) | ![sortcandy](art-batch-DOM-2/sortcandy.png) |
| ![grill](art-batch-DOM-2/grill.png) | ![riddle](art-batch-DOM-2/riddle.png) |
| ![yahtzee](art-batch-DOM-2/yahtzee.png) | ![connectfour](art-batch-DOM-2/connectfour.png) |
| ![peg](art-batch-DOM-2/peg.png) | ![alienlang](art-batch-DOM-2/alienlang.png) |
| ![battleship](art-batch-DOM-2/battleship.png) | ![bento](art-batch-DOM-2/bento.png) |
| ![lightsout](art-batch-DOM-2/lightsout.png) | ![mastermind](art-batch-DOM-2/mastermind.png) |
| ![math24](art-batch-DOM-2/math24.png) | ![minesweeper](art-batch-DOM-2/minesweeper.png) |
| ![nonogram](art-batch-DOM-2/nonogram.png) | ![puzzle15](art-batch-DOM-2/puzzle15.png) |
| ![sokoban](art-batch-DOM-2/sokoban.png) | ![spotthediff](art-batch-DOM-2/spotthediff.png) |
| ![sudoku](art-batch-DOM-2/sudoku.png) | ![takuzu](art-batch-DOM-2/takuzu.png) |
| ![wordle](art-batch-DOM-2/wordle.png) | ![wordsearch](art-batch-DOM-2/wordsearch.png) |

## 测试结果（2026-11-01）

- `node scripts/check-game.cjs` 本批 26 款：两种尺寸 **52/52 PASS**。
- 无头浏览器开局测试（Playwright；点开始→关卡/教程）：390×844 与 360×640 **52/52 PASS**，控制台无报错。
- `node scripts/sync-game-ui.cjs --check --strict --only=<本批26>`：Verified 26，退出码 0。
- `node scripts/build-classic-games.cjs --check`：五款 Verified（`CLASSIC_VERSION` 6→7）。
- `node scripts/test-classic-games.cjs`：10/10 通过。
- `node scripts/test-gameplay.cjs`：本批相关 minesweeper PASS；`solitaire` 点 `#stockPile` 超时为既有不稳定项（非本批）。
- zip / manifest 未手改。

## 收尾

- 皮肤 B 画面升级批次 **T1-1 … T2-6、DOM-1、DOM-2 全部完成**；定时画面升级例程可由父任务删除。
- 拼贴：`/workspace/art-dom-2/collage-2026-11-01.png`（副本 `docs/art-batch-DOM-2/collage-2026-11-01.png`）。

