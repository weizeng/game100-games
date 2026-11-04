# 游戏100 · Supabase 应用内反馈

把 App「反馈」提交到 Supabase 项目 **game-100-db**，每日巡检任务拉取 `status=open` 的行并修复。

## 以前怎么反馈

游戏页右下角「反馈」会打开浏览器跳到 GitHub「新建 Issue」预填页。要登录 GitHub、还容易卡住，不好用。

## 你需要做的一步：执行 SQL

anon key **不能建表**。请打开 [Supabase Dashboard](https://supabase.com/dashboard) → 项目 `game-100-db` → **SQL Editor** → New query，把仓库里这份文件全部粘贴执行：

[`supabase/migrations/20261104_feedbacks.sql`](../supabase/migrations/20261104_feedbacks.sql)

成功后应看到表 `public.feedbacks`。

## 表与 RLS

| 列 | 说明 |
|----|------|
| `id` | uuid |
| `created_at` | 提交时间 |
| `category` | `crash_black` / `stuck` / `visual` / `hard_to_find` / `other` |
| `message` | 自由文本，最长 2000 |
| `game_id` | 在游戏内反馈时有值；设置页总反馈可空 |
| `app_version` | 如 `4.23` |
| `device_info` | 机型 / SDK / 渠道，不含通讯录等 |
| `device_id` | 本机稳定 UUID（与排行榜同一套） |
| `status` | 默认 `open`；可改为 `triaged` / `fixed` / `wontfix` / `duplicate` |

- **RLS**：anon / authenticated 可 `INSERT`（强制新行为 `open`）、可 `SELECT`、可 `UPDATE`（trigger 锁死正文，只改 `status`）。
- **无 DELETE** 给 anon。
- 反馈内容按「公开问题」处理，请勿在说明里写手机号、住址等隐私。

## App 配置（anon 可进包）

与排行榜相同，见 `android/app/build.gradle` 的 `SUPABASE_URL` / `SUPABASE_ANON_KEY`。

**永远不要**把 `service_role` 写进仓库或 BuildConfig。

## 客户端行为（需 App ≥ 4.23）

1. 游戏页「反馈」、设置页「发送反馈」→ 芯片选题 + 可选补充 → 后台 `POST /rest/v1/feedbacks`。
2. 失败 Toast，不崩游戏；本地 8 秒防连点。
3. `ONLINE_CATALOG=false` 的渠道不提交。

## 自测（SQL 执行成功后）

```bash
export SB_URL='https://whhwkfqrrqukfwqzqpif.supabase.co'
export SB_ANON='（你的 anon key）'
bash scripts/feedback/verify.sh
```

## 每日巡检

用 anon 拉 `status=eq.open`，修完后 `PATCH` 把对应行 `status` 改为 `fixed`（或 `wontfix` / `duplicate`）。也可同步开 GitHub issue，但以表为准。
