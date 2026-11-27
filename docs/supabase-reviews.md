# 全服游戏评分与短评（Supabase）

本功能与全服排行榜共用同一个 Supabase 项目（`BuildConfig.SUPABASE_URL` / `BuildConfig.SUPABASE_ANON_KEY`），无需登录、绝不写入 `service_role`，离线时自动降级为本机评分。

## 1. 建表与 RPC

在 Supabase Dashboard → **SQL Editor** 整份执行：

- `supabase/migrations/20261128_reviews.sql`

执行后将创建：

- 数据表 `public.game_reviews`（按 `(game_id, device_id)` 唯一，每台设备对每款游戏一条可更新评价）
- `submit_review(p_game_id, p_device_id, p_nickname, p_rating, p_tags, p_comment)`：提交/更新 1–5 星评分、最多 3 个白名单印象标签和 ≤200 字短评
- `get_game_review_summary(p_game_id)`：返回全服均分、评分人数、星级分布和热门印象标签计数
- `get_game_reviews(p_game_id, p_limit)`：返回最近带标签或短评的玩家评价
- `get_all_rating_summaries()`：单次返回全库已评分游戏的均分与人数，供首页卡片角标和「高分好评」排序使用（客户端缓存 30 分钟）

## 2. 端到端验证

```bash
SUPABASE_URL="https://你的项目.supabase.co"
ANON_KEY="你的_anon_key"

curl -sS -X POST "$SUPABASE_URL/rest/v1/rpc/submit_review" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"p_game_id":"snake","p_device_id":"verify-device-0001","p_nickname":"测试玩家","p_rating":5,"p_tags":["解压上头","操作顺手"],"p_comment":"手感很顺，越玩越上头"}'

curl -sS -X POST "$SUPABASE_URL/rest/v1/rpc/get_game_review_summary" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"p_game_id":"snake"}'
```
