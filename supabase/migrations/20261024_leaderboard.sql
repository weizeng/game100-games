-- game100 全服排行榜（仅用 anon key 从客户端访问）
-- 在 Supabase Dashboard → SQL Editor 整份执行本文件。
-- 设计要点：
--   * 身份用 device_id（App 本地生成的 UUID），不依赖登录；匿名登录未开启。
--   * 表对 anon 关闭直接 INSERT/UPDATE/DELETE，只开放 SELECT 与两个 RPC，
--     避免有人改别人的分数。
--   * submit_score 只升不降；同 (game_id, device_id) 一行。

create extension if not exists pgcrypto;

create table if not exists public.leaderboard_scores (
  id uuid primary key default gen_random_uuid(),
  game_id text not null,
  device_id text not null,
  nickname text not null default '玩家',
  score integer not null,
  updated_at timestamptz not null default now(),
  constraint leaderboard_scores_game_id_check
    check (char_length(game_id) between 1 and 64),
  constraint leaderboard_scores_device_id_check
    check (char_length(device_id) between 8 and 80),
  constraint leaderboard_scores_nickname_check
    check (char_length(nickname) between 1 and 24),
  constraint leaderboard_scores_score_check
    check (score >= 0 and score <= 1000000000),
  constraint leaderboard_scores_unique_player
    unique (game_id, device_id)
);

create index if not exists leaderboard_scores_game_score_idx
  on public.leaderboard_scores (game_id, score desc, updated_at asc);

alter table public.leaderboard_scores enable row level security;

-- 公开可读（排行榜）；写操作只走下面的 RPC
drop policy if exists leaderboard_scores_select_public on public.leaderboard_scores;
create policy leaderboard_scores_select_public
  on public.leaderboard_scores
  for select
  to anon, authenticated
  using (true);

revoke insert, update, delete on public.leaderboard_scores from anon, authenticated;
grant select on public.leaderboard_scores to anon, authenticated;

-- 提交分数：只更新自己的 device_id 行，且分数只升不降
create or replace function public.submit_score(
  p_game_id text,
  p_device_id text,
  p_nickname text,
  p_score integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game text := trim(p_game_id);
  v_device text := trim(p_device_id);
  v_nick text := left(trim(coalesce(nullif(trim(p_nickname), ''), '玩家')), 24);
  v_score integer := p_score;
  v_row public.leaderboard_scores%rowtype;
begin
  if v_game is null or char_length(v_game) < 1 or char_length(v_game) > 64 then
    raise exception 'invalid game_id';
  end if;
  if v_device is null or char_length(v_device) < 8 or char_length(v_device) > 80 then
    raise exception 'invalid device_id';
  end if;
  if v_score is null or v_score < 0 or v_score > 1000000000 then
    raise exception 'invalid score';
  end if;
  -- 昵称去掉控制字符
  v_nick := regexp_replace(v_nick, E'[\\n\\r\\t]', '', 'g');
  if char_length(v_nick) < 1 then
    v_nick := '玩家';
  end if;

  insert into public.leaderboard_scores as t (game_id, device_id, nickname, score, updated_at)
  values (v_game, v_device, v_nick, v_score, now())
  on conflict (game_id, device_id) do update
    set score = greatest(t.score, excluded.score),
        nickname = excluded.nickname,
        updated_at = case
          when excluded.score > t.score then now()
          else t.updated_at
        end
  returning * into v_row;

  return jsonb_build_object(
    'ok', true,
    'game_id', v_row.game_id,
    'device_id', v_row.device_id,
    'nickname', v_row.nickname,
    'score', v_row.score,
    'updated_at', v_row.updated_at
  );
end;
$$;

-- 拉取某游戏 Top N
create or replace function public.get_leaderboard(
  p_game_id text,
  p_limit integer default 20
) returns table (
  rank bigint,
  nickname text,
  score integer,
  updated_at timestamptz,
  is_self boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_game text := trim(p_game_id);
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 100);
begin
  if v_game is null or char_length(v_game) < 1 then
    raise exception 'invalid game_id';
  end if;
  return query
    select
      row_number() over (order by s.score desc, s.updated_at asc) as rank,
      s.nickname,
      s.score,
      s.updated_at,
      false as is_self
    from public.leaderboard_scores s
    where s.game_id = v_game
    order by s.score desc, s.updated_at asc
    limit v_limit;
end;
$$;

-- 查自己的名次（可选）
create or replace function public.get_my_rank(
  p_game_id text,
  p_device_id text
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_game text := trim(p_game_id);
  v_device text := trim(p_device_id);
  v_score integer;
  v_rank bigint;
  v_nick text;
begin
  select s.score, s.nickname into v_score, v_nick
  from public.leaderboard_scores s
  where s.game_id = v_game and s.device_id = v_device;

  if v_score is null then
    return jsonb_build_object('ok', true, 'ranked', false);
  end if;

  select count(*) + 1 into v_rank
  from public.leaderboard_scores s
  where s.game_id = v_game
    and (s.score > v_score
         or (s.score = v_score and s.updated_at < (
           select updated_at from public.leaderboard_scores
           where game_id = v_game and device_id = v_device
         )));

  return jsonb_build_object(
    'ok', true,
    'ranked', true,
    'rank', v_rank,
    'score', v_score,
    'nickname', v_nick
  );
end;
$$;

grant execute on function public.submit_score(text, text, text, integer) to anon, authenticated;
grant execute on function public.get_leaderboard(text, integer) to anon, authenticated;
grant execute on function public.get_my_rank(text, text) to anon, authenticated;

comment on table public.leaderboard_scores is 'game100 per-game best scores keyed by device_id';
comment on function public.submit_score is 'Upsert best score for a device; score never decreases';
comment on function public.get_leaderboard is 'Top N scores for a game_id';
