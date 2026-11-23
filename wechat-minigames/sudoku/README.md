# 数独 · 微信小游戏样板

把现有 `games/sudoku` 的玩法改到 **Canvas + wx 运行时**（没有 DOM / WebView）。本目录是独立样板，**没有改** Android 工程、`games/sudoku`、`manifest.json` 或任何游戏 zip，也没有新增第 501 款。

这不是已经上架的微信小游戏。没有注册、登录微信，没有提审或上传。`project.config.json` 里的 `touristappid` 只是微信开发者工具游客模式的占位符，**不是真实 AppID，也不是已认证账号**。

## 和原作对齐的范围

对照过原版 `games/sudoku/index.html`（v8）。原作棋盘、数字键、清除/提示/检查都是 DOM，Canvas 只画了一条装饰标题；这里把全部界面画在 Canvas 上。

已保留：

- 15 关：4×4 → 6×6 → 9×9，挖空比例和时限递增
- 第 5 / 10 / 15 关为首领关（盘面更大、已知更少、时限更紧）。原作配置里的 `strict` 字段在原逻辑中未使用，这里也没有另造首领机制
- 选格、填数、清除、检查（按解答核对，错了扣命）、提示（填入一格）
- 教学、暂停 / 继续 / 重开、切到后台自动暂停、生命、计时、星级解锁、金币升级（提示 / 加时 / 额外命）、静音、最佳纪录

原作**没有**笔记 / 铅笔标记，本样板也没有做。

## 本地预览（不是微信真机）

仓库根目录之外，在本目录启动：

```bash
node preview/server.js
```

默认地址：<http://127.0.0.1:8765/>（可用环境变量 `PORT` 修改）。

浏览器里能玩，只说明共用的核心逻辑和 Canvas 布局可以在普通 Canvas 上跑。**不能**把它当成微信开发者工具或真机已经通过。页面顶部有明确提示。

## 导入微信开发者工具

1. 安装[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 选择「小游戏」，项目目录选本文件夹 `wechat-minigames/sudoku`
3. AppID：没有正式账号时保持 `touristappid`（游客模式）；有账号后把 `project.config.json` 的 `appid` 换成你自己的
4. 用模拟器和真机预览检查触控、安全区、音频、切后台暂停

`preview/`、`test/`、`screenshots/` 已写在 `packOptions.ignore` 里，导入后不应打进代码包。

## 还没有在微信里验证的事项

- 微信开发者工具模拟器
- iOS / Android 真机触控、全面屏安全区、高 DPI
- `wx.createWebAudioContext` 是否可用（没有则静音，不影响玩）
- `wx` 存储、振动、切后台
- 游客模式以外的登录、分享、广告、支付、提审、备案

## 测试说明

```bash
# 需要本机已安装 @napi-rs/canvas（测试脚本默认从 /tmp/napi-canvas/node_modules 加载）
node test/run-tests.js
```

这是 Node 里的逻辑测试和程序化 Canvas 截图，**不是**浏览器自动化，也**不是**微信真机测试。覆盖：首关通关、错误输入、清除、提示、暂停后续玩、计时在暂停时冻结、坐标映射。

程序化截图在 `screenshots/`。

## 体积与性能（测量值，不是真机帧率）

在 2026-11-23 本机测量：

- 会打进微信代码包的文件合计 **41.4 KB**（`game.js` + `game.json` + `project.config.json` + `src/sudoku-app.js` + `src/platform-wx.js`），远低于主包 4MB 限制
- Node + `@napi-rs/canvas` 下 120 次完整绘制平均约 **0.23 ms / 帧**。这只说明绘制路径不重，不能外推微信真机帧率

## 目录

```
wechat-minigames/sudoku/
  game.js                 微信入口
  game.json
  project.config.json     请自行填写真实 AppID
  src/sudoku-app.js       共用核心（玩法 + Canvas UI）
  src/platform-wx.js      微信适配
  preview/                本地薄适配器与预览页
  test/                   自动化测试
  screenshots/            程序化截图
```
