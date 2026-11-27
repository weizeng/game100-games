-- game100 全服游戏评分、印象标签与玩家短评（仅用 anon key + RPC 访问）
-- 在 Supabase Dashboard → SQL Editor 整份执行本文件。
-- 设计要点：
--   * 与全服排行榜同架构：身份用本机生成的 device_id，不依赖登录；绝不写 service_role 进 App。
--   * 表对 anon 关闭直接 INSERT/UPDATE/DELETE，只开放 SELECT 与 4 个 RPC。
--   * 每台设备对每款游戏保留 1 条可更新评价（同 game_id + device_id upsert）。

create extension if not exists pgcrypto;

create table if not exists public.game_reviews (
  id uuid primary key default gen_random_uuid(),
  game_id text not null,
  device_id text not null,
  nickname text not null default '玩家',
  rating smallint not null,
  tags text[] not null default '{}',
  comment text not null default '',
  updated_at timestamptz not null default now(),
  constraint game_reviews_game_id_check
    check (char_length(game_id) between 1 and 64),
  constraint game_reviews_device_id_check
    check (char_length(device_id) between 8 and 80),
  constraint game_reviews_nickname_check
    check (char_length(nickname) between 1 and 24),
  constraint game_reviews_rating_check
    check (rating between 1 and 5),
  constraint game_reviews_tags_len_check
    check (coalesce(array_length(tags, 1), 0) <= 3),
  constraint game_reviews_comment_len_check
    check (char_length(comment) <= 200),
  constraint game_reviews_unique_player
    unique (game_id, device_id)
);

create index if not exists game_reviews_game_updated_idx
  on public.game_reviews (game_id, updated_at desc);

alter table public.game_reviews enable row level security;

drop policy if exists game_reviews_select_public on public.game_reviews;
create policy game_reviews_select_public
  on public.game_reviews
  for select
  to anon, authenticated
  using (true);

revoke insert, update, delete on public.game_reviews from anon, authenticated;
grant select on public.game_reviews to anon, authenticated;

-- 1) 提交或更新评价（星级 + 最多 3 个白名单印象标签 + ≤200 字短评）
create or replace function public.submit_review(
  p_game_id text,
  p_device_id text,
  p_nickname text,
  p_rating integer,
  p_tags text[] default '{}',
  p_comment text default ''
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game text := trim(coalesce(p_game_id, ''));
  v_device text := trim(coalesce(p_device_id, ''));
  v_nick text := left(trim(coalesce(nullif(trim(p_nickname), ''), '玩家')), 24);
  v_rating integer := p_rating;
  v_comment text := left(trim(coalesce(p_comment, '')), 200);
  v_allowed text[] := array['解压上头', '画面精致', '操作顺手', '烧脑耐玩', '节奏爽快', '难度偏高'];
  v_tags text[] := '{}';
  v_row public.game_reviews%rowtype;
begin
  if char_length(v_game) < 1 or char_length(v_game) > 64 then
    raise exception 'invalid game_id';
  end if;
  if char_length(v_device) < 8 or char_length(v_device) > 80 then
    raise exception 'invalid device_id';
  end if;
  if v_rating is null or v_rating < 1 or v_rating > 5 then
    raise exception 'invalid rating';
  end if;

  v_nick := regexp_replace(v_nick, E'[\\n\\r\\t]', '', 'g');
  if char_length(v_nick) < 1 then
    v_nick := '玩家';
  end if;
  v_comment := regexp_replace(v_comment, E'[\\r\\t]+', ' ', 'g');

  if p_tags is not null then
    select coalesce(array_agg(distinct t), '{}')
      into v_tags
      from (
        select unnest(p_tags) as t
      ) s
     where t = any(v_allowed)
     limit 3;
  end if;

  insert into public.game_reviews as r (game_id, device_id, nickname, rating, tags, comment, updated_at)
  values (v_game, v_device, v_nick, v_rating::smallint, v_tags, v_comment, now())
  on conflict (game_id, device_id) do update
    set nickname = excluded.nickname,
        rating = excluded.rating,
        tags = excluded.tags,
        comment = excluded.comment,
        updated_at = now()
  returning * into v_row;

  return jsonb_build_object(
    'ok', true,
    'game_id', v_row.game_id,
    'rating', v_row.rating,
    'tags', to_jsonb(v_row.tags),
    'comment', v_row.comment,
    'updated_at', v_row.updated_at
  );
end;
$$;

-- 2) 单款游戏评分汇总 + 印象标签统计
create or replace function public.get_game_review_summary(
  p_game_id text
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_game text := trim(coalesce(p_game_id, ''));
  v_count bigint := 0;
  v_avg numeric := 0;
  v_dist jsonb := '[0,0,0,0,0]'::jsonb;
  v_tags jsonb := '[]'::jsonb;
begin
  if char_length(v_game) < 1 then
    raise exception 'invalid game_id';
  end if;

  select
    count(*),
    coalesce(round(avg(rating)::numeric, 1), 0),
    jsonb_build_array(
      count(*) filter (where rating = 1),
      count(*) filter (where rating = 2),
      count(*) filter (where rating = 3),
      count(*) filter (where rating = 4),
      count(*) filter (where rating = 5)
    )
    into v_count, v_avg, v_dist
    from public.game_reviews
   where game_id = v_game;

  select coalesce(jsonb_agg(jsonb_build_object('tag', tag, 'count', cnt) order by cnt desc, tag asc), '[]'::jsonb)
    into v_tags
    from (
      select unnest(tags) as tag, count(*) as cnt
        from public.game_reviews
       where game_id = v_game
       group by tag
       order by cnt desc, tag asc
       limit 6
    ) t;

  return jsonb_build_object(
    'ok', true,
    'count', v_count,
    'avg_rating', v_avg,
    'dist', v_dist,
    'tags', v_tags
  );
end;
$$;

-- 3) 拉取某款游戏的最近玩家评价（含短评或标签）
create or replace function public.get_game_reviews(
  p_game_id text,
  p_limit integer default 20
) returns table (
  nickname text,
  rating smallint,
  tags text[],
  comment text,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_game text := trim(coalesce(p_game_id, ''));
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 50);
begin
  if char_length(v_game) < 1 then
    raise exception 'invalid game_id';
  end if;
  return query
    select r.nickname, r.rating, r.tags, r.comment, r.updated_at
      from public.game_reviews r
     where r.game_id = v_game
       and (char_length(r.comment) > 0 or coalesce(array_length(r.tags, 1), 0) > 0)
     order by r.updated_at desc
     limit v_limit;
end;
$$;

-- 4) 全库评分摘要（供首页卡片角标与「高分好评」排序）
create or replace function public.get_all_rating_summaries()
returns table (
  game_id text,
  avg_rating numeric,
  review_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.game_id,
    round(avg(r.rating)::numeric, 1) as avg_rating,
    count(*) as review_count
  from public.game_reviews r
  group by r.game_id
  having count(*) > 0;
$$;

grant execute on function public.submit_review(text, text, text, integer, text[], text) to anon, authenticated;
grant execute on function public.get_game_review_summary(text) to anon, authenticated;
grant execute on function public.get_game_reviews(text, integer) to anon, authenticated;
grant execute on function public.get_all_rating_summaries() to anon, authenticated;

comment on table public.game_reviews is 'game100 per-game community ratings, impression tags and short reviews';
