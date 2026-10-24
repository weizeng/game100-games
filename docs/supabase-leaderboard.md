# 游戏100 · Supabase 全服排行榜

把每款游戏的最高分存到 Supabase 项目 **game-100-db**，App 详情页展示 Top 10。

## 以前数据在哪

| 数据 | 位置 | 说明 |
|------|------|------|
| 本机最高分 | App `SharedPreferences`（`UserData`） | `reportScore` / 详情页「历史最高分」 |
| 收藏、星级 | 同上 | 仍只在本机 |
| 游戏内进度 / 最佳 | 各 H5 `localStorage`（如 `g100_<id>_hs`、`flappy_best`） | 离线可玩，不改 zip 规则 |
| 全服排行 | **无**（本次新增） | Supabase `leaderboard_scores` |

## 你需要做的一步：执行 SQL

anon key **不能建表**。请打开 [Supabase Dashboard](https://supabase.com/dashboard) → 项目 `game-100-db` → **SQL Editor** → New query，把仓库里这份文件全部粘贴执行：

[`supabase/migrations/20261024_leaderboard.sql`](../supabase/migrations/20261024_leaderboard.sql)

成功后应看到表 `leaderboard_scores`，以及 RPC：`submit_score`、`get_leaderboard`、`get_my_rank`。

可选：Authentication → Providers → 打开 **Anonymous**（当前未用；排行用 `device_id`，不依赖登录）。

## 表与 RLS

- **表** `public.leaderboard_scores`：`(game_id, device_id)` 唯一；只保留该设备在该游戏的最高分。
- **RLS**：anon / authenticated 可 `SELECT`；`INSERT/UPDATE/DELETE` 已撤销。
- **写入只走 RPC** `submit_score(game_id, device_id, nickname, score)`（`SECURITY DEFINER`）：校验长度与分数范围，分数只升不降，不能改别人的 `device_id` 行。
- **读取** `get_leaderboard(game_id, limit)` → Top N；`get_my_rank(game_id, device_id)` → 自己的名次。

## App 配置（anon 可进包）

默认已写入 `android/app/build.gradle` 的 `BuildConfig`：

- `SUPABASE_URL` = `https://whhwkfqrrqukfwqzqpif.supabase.co`
- `SUPABASE_ANON_KEY` = 你提供的 anon public key

覆盖方式（任选）：

```properties
# android/local.properties（不入库也行）
game100.supabase.url=https://whhwkfqrrqukfwqzqpif.supabase.co
game100.supabase.anonKey=eyJ...
```

或 `-Pgame100.supabase.url=...` / 环境变量 `GAME100_SUPABASE_URL`、`GAME100_SUPABASE_ANONKEY`。

**永远不要**把 `service_role` 写进仓库、BuildConfig 或聊天记录里的脚本默认值。

## 客户端行为（需 App ≥ 4.16）

1. **设置**里可改「排行榜昵称」（默认「玩家」）。
2. 玩游戏时 WebView 挂钩 `localStorage` / `GameUI.storageSet`；见到像最高分的数字就走已有 `NativeBridge.reportScore`。
3. App 先存本机最高分，再后台调用 `submit_score`；失败只打日志，不崩、不挡游戏。
4. **详情页**拉取 Top 10 + 我的名次；`cn` 离线包无网，排行区域隐藏。
5. 游戏 zip **不内嵌**任何 `https://`（仍遵守离线规则）；上云只通过 App。

## 自测（SQL 执行成功后）

```bash
export SB_URL='https://whhwkfqrrqukfwqzqpif.supabase.co'
export SB_ANON='（你的 anon key）'
# 或：bash scripts/leaderboard/verify.sh
bash scripts/leaderboard/verify.sh
```

应能写入一条测试分并读回排行。

## 版本

逻辑在 **4.16**（versionCode 33）。本轮默认只推代码；要体验全服排行请再发 4.16 安装包。direct / play 升到 4.16 即可；cn 包即使升级也因无网不上云。
