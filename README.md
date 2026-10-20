# 游戏100 远程游戏资源

`games/` 下是各游戏源码（index.html + meta.json），由 GitHub Actions 自动打包成 zip 并生成 `manifest.json`。App 拉取 `manifest.json` 即可发现新游戏。

发布地址：https://cdn.jsdelivr.net/gh/weizeng/game100-games@main/manifest.json

本轮全部 141 款的界面与玩法更新见 [逐款改动清单](docs/game-upgrade-2026-10-16.md)。

共用界面源文件放在 `scripts/game-ui/`。修改后运行 `node scripts/sync-game-ui.cjs`，界面资源会内嵌到各游戏 HTML，保持离线 ZIP 兼容；使用 `node scripts/sync-game-ui.cjs --check` 检查同步状态与脚本语法。

Android 原生界面调整见 [改动说明](docs/app-ui-redesign.md)，可直接查看 [无需编译的设计预览](docs/app-ui-preview.html)。

新增五款经典游戏（2026-10-17）：四子棋、彩色连珠、快艇骰子、宝石列柱、跳格金字塔，见 [玩法与验证记录](docs/classic-games-2026-10-17.md)。源码位于 `scripts/classics/`，运行 `node scripts/build-classic-games.cjs` 生成可独立离线运行的 HTML，使用 `--check` 核对生成结果。

`node scripts/test-classic-games.cjs` 验证五款游戏的经典与进阶玩法，需要 Playwright；可通过 `CHROME_PATH` 指定 Chrome。只核对这五款的共用界面同步状态：`node scripts/sync-game-ui.cjs --check --only=connectfour,colorlines,yahtzee,columns,pyramid`。

2026-10-20 热修（开始按钮被裁切、桌球第二杆、珍珠贝/食物链/水果合成报错、四款共用界面恢复）见 [热修记录](docs/hotfix-2026-10-20.md)。
