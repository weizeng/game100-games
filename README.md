# 游戏100 远程游戏资源

`games/` 下是各游戏源码（index.html + meta.json），由 GitHub Actions 自动打包成 zip 并生成 `manifest.json`。App 拉取 `manifest.json` 即可发现新游戏。

发布地址：https://cdn.jsdelivr.net/gh/weizeng/game100-games@main/manifest.json

2026-10-16 那一轮的 141 款的界面与玩法更新见 [逐款改动清单](docs/game-upgrade-2026-10-16.md)。

共用界面源文件放在 `scripts/game-ui/`。修改后运行 `node scripts/sync-game-ui.cjs`，界面资源会内嵌到各游戏 HTML，保持离线 ZIP 兼容；使用 `node scripts/sync-game-ui.cjs --check` 检查同步状态与脚本语法。

Android 原生界面调整见 [改动说明](docs/app-ui-redesign.md)，可直接查看 [无需编译的设计预览](docs/app-ui-preview.html)。

新增五款经典游戏（2026-10-17）：四子棋、彩色连珠、快艇骰子、宝石列柱、跳格金字塔，见 [玩法与验证记录](docs/classic-games-2026-10-17.md)。源码位于 `scripts/classics/`，运行 `node scripts/build-classic-games.cjs` 生成可独立离线运行的 HTML，使用 `--check` 核对生成结果。

`node scripts/test-classic-games.cjs` 验证五款游戏的经典与进阶玩法，需要 Playwright；可通过 `CHROME_PATH` 指定 Chrome。只核对这五款的共用界面同步状态：`node scripts/sync-game-ui.cjs --check --only=connectfour,colorlines,yahtzee,columns,pyramid`。

2026-10-20 热修（开始按钮被裁切、桌球第二杆、珍珠贝/食物链/水果合成报错、四款共用界面恢复）见 [热修记录](docs/hotfix-2026-10-20.md)。

**做新游戏 / 改游戏前必读**：[游戏开发指南 docs/GAME-DEV-GUIDE.md](docs/GAME-DEV-GUIDE.md)，AI 工具的入口是 [AGENTS.md](AGENTS.md)。最小模板在 `scripts/templates/starter/`；新建用 `node scripts/new-game.cjs`，单款检查用 `node scripts/check-game.cjs <id>`。

2026-10-20 全部 226 款统一换上皮肤 B「霓虹糖果 Pop Arcade」，补登记了 80 款（含 50 款科学实验），并升级了俄罗斯方块、贪吃蛇、桌球、水果合成、2048 的画面立体感，见 [皮肤 B 上线记录](docs/ui-skin-b-2026-10-20.md)。

2026-10-21 每日新游戏第 3 批（10 款）：小丑牌局、棋王之路、斗地主擂台、花园保卫战、星域征服、背包乱斗、霓虹弓手、地铁迷城、暗影潜行、机甲防线，见 [玩法与验证记录](docs/new-games-2026-10-21.md)。

2026-10-24 每日新游戏（10 款）：飞箭出逃、猫咪领地、彩块出闸、纱轴编织、流沙填坑、挪车离场、巴士排队、解绳结、重力翻转、料理冲刺，见 [玩法与验证记录](docs/new-games-2026-10-24.md)。
