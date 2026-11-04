#!/usr/bin/env bash
# 验证 Supabase feedbacks 表（需已在 SQL Editor 执行 migration）
set -euo pipefail
URL="${SB_URL:-https://whhwkfqrrqukfwqzqpif.supabase.co}"
ANON="${SB_ANON:-}"
if [[ -z "$ANON" ]]; then
  echo "请设置 SB_ANON 为 anon public key" >&2
  exit 1
fi
HDR=(-H "apikey: $ANON" -H "Authorization: Bearer $ANON" -H "Content-Type: application/json" -H "Prefer: return=representation")
DEVICE="verify-feedback-$(date +%s)"

echo "== INSERT feedback =="
out=$(curl -sS -w '\n%{http_code}' -X POST "$URL/rest/v1/feedbacks" "${HDR[@]}" \
  -d "{\"category\":\"other\",\"message\":\"verify script ping\",\"game_id\":\"flappy\",\"app_version\":\"verify\",\"device_info\":\"script\",\"device_id\":\"$DEVICE\",\"status\":\"open\"}")
code=$(echo "$out" | tail -n1)
body=$(echo "$out" | sed '$d')
echo "$body"
if [[ "$code" != 200 && "$code" != 201 ]]; then
  echo "HTTP $code — 是否尚未执行 supabase/migrations/20261104_feedbacks.sql？" >&2
  exit 1
fi
id=$(echo "$body" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1)
if [[ -z "$id" ]]; then
  echo "没有返回 id" >&2
  exit 1
fi

echo "== LIST open =="
curl -sS "$URL/rest/v1/feedbacks?status=eq.open&order=created_at.desc&limit=3&select=id,category,message,game_id,status" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON" -H "Accept: application/json"
echo

echo "== PATCH status=wontfix (cleanup) =="
curl -sS -o /dev/null -w "HTTP %{http_code}\n" -X PATCH "$URL/rest/v1/feedbacks?id=eq.$id" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON" -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d '{"status":"wontfix"}'

echo "OK: feedbacks insert/list/status 可用（id=$id）"
