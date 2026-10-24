# Muse 热门单机 backlog · Grok 落地报告（2026-10-24）

依据 `docs/GAME-BACKLOG.md`，本轮完成 **6** 款（studio 一律 **Grok**），视觉为霓虹糖果 / Pop Arcade + GameUI.fx。

**未做**：`reigns` 王国抉择 — **等用户自写事件卡**后再开工。

## 交付一览

| id | 名称 | 关卡 | 亮点 |
|---|---|---|---|
| watersort | 倒水排序 | 40 关 | 程序化可解生成；盲管/冰冻 Boss；撤销与空管成长 |
| blockgrid | 木块方阵 | 20 关 + 无尽 | 拖放消行列；连击倍率；锁定格与炸弹块 |
| knifehit | 飞刀入木 | 40 关 | 点掷旋转靶；反转/脉冲转速；Boss 桩与苹果收集 |
| screwpop | 拆螺丝 | 40 关 | **2D** 多边形铁片；锁螺丝；万能盒；热区≥44px |
| goodssort | 货架三消 | 50 关 | 点选+7 格暂存三消；冰冻/礼盒；货架主题成长 |
| hillclimb | 爬坡越野 | 20 关 + 无尽 | 侧视油门/刹车+简化物理；风/冰/碎石/桥 Boss；与俯视 `racing` 区分 |

## 流程

- 起手：`scripts/new-game.cjs`（studio=Grok），主题登记于 `scripts/game-ui/catalog.cjs`
- `sync-game-ui` 注入共用界面；`check-game` 双视口 390×844 / 360×640 均 PASS
- 对比拼图：`/workspace/backlog-games/sheet.png`
- 观察池：Muse 同日侦察已重写「观察区 / 已排除」，并新增 5 款推荐候选；本轮未动这些新条目

## 提交与发布

### Commits

| id | commit |
|---|---|
| watersort | `4f20e2b` |
| blockgrid | `0e5fd68` |
| knifehit | `a4735c3` |
| screwpop | `3e67af7` |
| goodssort | `c2d89d5` |
| hillclimb | `cba3bb2` |

Actions「发布游戏资源」均成功：

- watersort 推送：[run 40048287283](https://github.com/weizeng/game100-games/actions/runs/40048287283)
- 其余 5 款批量推送：[run 40048295168](https://github.com/weizeng/game100-games/actions/runs/40048295168)

## 遗留

- `reigns` 等事件卡
- watersort 无硬性失败态（卡死可撤销，符合原作解压向）
- hillclimb 物理为简化 2D，非完整双轮刚体；极端坡度手感可再调
- 未打 APK / 未改签名
