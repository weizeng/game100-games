-- game100 应用内反馈（仅用 anon key 从客户端写入）
-- 在 Supabase Dashboard → SQL Editor 整份执行本文件。
-- 设计要点：
--   * App 用 anon 直接 INSERT；不依赖登录。
--   * anon 可读（便于每日巡检），可只改 status（触保行内容）。
--   * 永远不要把 service_role 写进 App。

create extension if not exists pgcrypto;

create table if not exists public.feedbacks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  category text not null,
  message text not null default '',
  game_id text,
  app_version text,
  device_info text,
  device_id text,
  status text not null default 'open',
  constraint feedbacks_category_check
    check (category in ('crash_black', 'stuck', 'visual', 'hard_to_find', 'other')),
  constraint feedbacks_status_check
    check (status in ('open', 'triaged', 'fixed', 'wontfix', 'duplicate')),
  constraint feedbacks_message_len
    check (char_length(message) <= 2000),
  constraint feedbacks_game_id_len
    check (game_id is null or char_length(game_id) between 1 and 64),
  constraint feedbacks_app_version_len
    check (app_version is null or char_length(app_version) <= 32),
  constraint feedbacks_device_info_len
    check (device_info is null or char_length(device_info) <= 240),
  constraint feedbacks_device_id_len
    check (device_id is null or char_length(device_id) between 8 and 80)
);

create index if not exists feedbacks_status_created_idx
  on public.feedbacks (status, created_at asc);

create index if not exists feedbacks_game_created_idx
  on public.feedbacks (game_id, created_at desc);

alter table public.feedbacks enable row level security;

-- 客户端提交
drop policy if exists feedbacks_insert_anon on public.feedbacks;
create policy feedbacks_insert_anon
  on public.feedbacks
  for insert
  to anon, authenticated
  with check (
    category in ('crash_black', 'stuck', 'visual', 'hard_to_find', 'other')
    and char_length(coalesce(message, '')) <= 2000
    and coalesce(status, 'open') = 'open'
  );

-- 巡检可读（内容相当于公开反馈，勿写隐私）
drop policy if exists feedbacks_select_anon on public.feedbacks;
create policy feedbacks_select_anon
  on public.feedbacks
  for select
  to anon, authenticated
  using (true);

-- 允许把 status 改成处理态（行内容由 trigger 锁死）
drop policy if exists feedbacks_update_status_anon on public.feedbacks;
create policy feedbacks_update_status_anon
  on public.feedbacks
  for update
  to anon, authenticated
  using (true)
  with check (status in ('open', 'triaged', 'fixed', 'wontfix', 'duplicate'));

revoke delete on public.feedbacks from anon, authenticated;
grant select, insert, update on public.feedbacks to anon, authenticated;

-- 禁止匿名改写反馈正文，只放行 status
create or replace function public.feedbacks_protect_immutable()
returns trigger
language plpgsql
as $$
begin
  new.created_at := old.created_at;
  new.category := old.category;
  new.message := old.message;
  new.game_id := old.game_id;
  new.app_version := old.app_version;
  new.device_info := old.device_info;
  new.device_id := old.device_id;
  if new.status is null
     or new.status not in ('open', 'triaged', 'fixed', 'wontfix', 'duplicate') then
    raise exception 'invalid status';
  end if;
  return new;
end;
$$;

drop trigger if exists feedbacks_protect_immutable_trg on public.feedbacks;
create trigger feedbacks_protect_immutable_trg
  before update on public.feedbacks
  for each row
  execute function public.feedbacks_protect_immutable();

comment on table public.feedbacks is 'game100 in-app feedback; anon insert/select; status-only updates';
