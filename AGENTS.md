# AGENTS.md · 游戏100 游戏仓库

给 AI 编码助手和 muse 看的入口文件。完整说明见 **[docs/GAME-DEV-GUIDE.md](docs/GAME-DEV-GUIDE.md)**；新游戏从模板 `scripts/templates/starter/` 起步（`node scripts/new-game.cjs <id> <theme> "<名称>" <分类> <图标> <出品方>`）。

## 10 条必须遵守的规则

1. **一款游戏 = `games/<id>/index.html` + `meta.json`**，单文件、全部内联、离线可玩。不得出现任何 `http(s)://` 资源（字体、CDN、图片、音频都不行）。
2. **`<id>.zip` 和 `manifest.json` 由 GitHub Actions 生成**，永远不要手改或手动提交。`build-apk.yml`、`android/`、keystore 文件不要动。发布脚本会按「最近改动的游戏」自动写入首页推荐位（manifest + zip 内 meta 的 `premium` / `featured`），**不要**在仓库 `games/*/meta.json` 里手写 `premium`。游戏 zip / manifest 下载地址用 raw.githubusercontent.com（仓库已超 jsDelivr 50MB 包限制）。cn 离线包要靠打新 APK 才能换推荐；direct ≥4.15 按 featured 最新在前，≥4.17 默认走 raw 游戏源。
3. **meta.json**：`category` 只能是 `科学实验 / 经典重温 / 射击 / 跑酷跳跃 / 塔防策略 / 卡牌构筑 / 棋牌对战 / 消除合成 / 益智解谜 / 休闲模拟 / 街机动作 / 节奏音乐 / 金融益智 / 3D 空间`；`version` 为正整数，文件有任何改动就 **+1**；**`studio`（出品方）必填**：Muse 做的写 `"Muse"`，Grok 做的写 `"Grok"`。升级别人的游戏**不改** studio（以最初创作者为准）。App 会按出品方显示彩色角标（Muse 紫 ✦ / Grok 橙 ◆）并支持筛选，`check-game.cjs` 缺 studio 会报错。
4. **每款游戏都要在 `scripts/game-ui/catalog.cjs` 登记主题**（科学实验一律用 `lab`），然后运行 `node scripts/sync-game-ui.cjs`。不要手改 `<!-- GAME UI BEGIN/END -->` 之间的内容。
5. **使用标准结构**：`.wrap`、`.topbar` + `<b id="score">`、`<canvas id="cv">`、`.overlay#startScr`（内含 `h1`、`p`、`button.btn#startBtn`）、`.hidden`。这样能自动获得皮肤 B「霓虹糖果」外观，开始按钮也一定能点到。
6. **触摸用 Pointer Events，坐标按画布显示尺寸换算成逻辑坐标**（`(clientX-r.left)*W/r.width`）；需要读触点时用 `changedTouches`。不要同时绑 touch 和 pointer。
7. **手机竖屏**：390×844 和 360×640 下页面都不滚动；触控目标 ≥44px；切后台（`visibilitychange`）自动暂停；画布按 devicePixelRatio 输出高清画面（`GameUI.fx.hidpi`）。
8. **画面要有立体感**：画布内用 `GameUI.fx`（tile、orb、shadow、stage、glow、burst），并保留无 FX 时的兜底画法；文字对比度 ≥4.5:1（亮色按钮用深色字）。
9. **玩法完整**：开始、暂停、结算、再来一局、计分、最佳纪录、难度递进、音效（WebAudio 合成 + 静音开关）。
10. **推送前**：先 `git pull --rebase`，在最新文件上修改（**不要用本地旧副本整体覆盖**）。依次跑通 `node scripts/sync-game-ui.cjs --check --strict`、`node scripts/build-classic-games.cjs --check`、`node scripts/check-game.cjs <ids>`，然后只做普通 `git push`，**禁止 force-push**。推送后确认 Actions「发布游戏资源」成功。

## 全服排行榜

见 [docs/supabase-leaderboard.md](docs/supabase-leaderboard.md)。需在 Supabase SQL Editor 执行 `supabase/migrations/20261024_leaderboard.sql`；App ≥ 4.16。不要把 service_role 写进仓库。
