# 游戏100 远程游戏资源

`games/` 下是各游戏源码（index.html + meta.json），由 GitHub Actions 自动打包成 zip 并生成 `manifest.json`。App 拉取 `manifest.json` 即可发现新游戏。

发布地址：https://cdn.jsdelivr.net/gh/weizeng/game100-games@main/manifest.json

本轮全部 141 款的界面与玩法更新见 [逐款改动清单](docs/game-upgrade-2026-10-16.md)。

共用界面源文件放在 `scripts/game-ui/`。修改后运行 `node scripts/sync-game-ui.cjs`，界面资源会内嵌到各游戏 HTML，保持离线 ZIP 兼容；使用 `node scripts/sync-game-ui.cjs --check` 检查同步状态与脚本语法。
