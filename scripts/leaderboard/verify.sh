#!/usr/bin/env bash
# 验证 Supabase 排行榜 RPC（需已在 SQL Editor 执行 migration）
set -euo pipefail
URL="${SB_URL:-https://whhwkfqrrqukfwqzqpif.supabase.co}"
ANON="${SB_ANON:-}"
if [[ -z "$ANON" ]]; then
  echo "请设置 SB_ANON 为 anon public key" >&2
  exit 1
fi
HDR=(-H "apikey: $ANON" -H "Authorization: Bearer $ANON" -H "Content-Type: application/json")
DEVICE="verify-$(date +%s)"

rpc() {
  local name="$1" body="$2"
  local out code
  out=$(curl -sS -w '\n%{http_code}' -X POST "$URL/rest/v1/rpc/$name" "${HDR[@]}" -d "$body")
  code=$(echo "$out" | tail -n1)
  out=$(echo "$out" | sed '$d')
  echo "$out"
  if [[ "$code" != 200 && "$code" != 201 ]]; then
    echo "HTTP $code for $name" >&2
    return 1
  fi
  if echo "$out" | grep -q '"code":"PGRST'; then
    echo "RPC error for $name — 是否尚未执行 supabase/migrations/20261024_leaderboard.sql？" >&2
    return 1
  fi
}

echo "== submit_score =="
rpc submit_score "{\"p_game_id\":\"flappy\",\"p_device_id\":\"$DEVICE\",\"p_nickname\":\"测试员\",\"p_score\":12345}"
echo
echo "== get_leaderboard =="
rpc get_leaderboard '{"p_game_id":"flappy","p_limit":5}'
echo
echo "== get_my_rank =="
rpc get_my_rank "{\"p_game_id\":\"flappy\",\"p_device_id\":\"$DEVICE\"}"
echo
echo "OK: 写入并读回成功（device=$DEVICE）"
