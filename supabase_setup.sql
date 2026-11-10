-- Supabase SQL Editor에서 한 번만 실행하세요.
-- 문제 원문은 저장하지 않고 학습상태 JSON만 저장합니다.
create extension if not exists pgcrypto;

create table if not exists public.study_state (
  sync_hash text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.study_state enable row level security;
revoke all on public.study_state from anon, authenticated;

create or replace function public.get_study_state(p_sync_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare h text; result jsonb;
begin
  if length(coalesce(p_sync_code,'')) < 20 then
    raise exception 'sync code too short';
  end if;
  h := encode(digest(p_sync_code, 'sha256'), 'hex');
  select payload into result from public.study_state where sync_hash=h limit 1;
  return result;
end;
$$;

create or replace function public.put_study_state(p_sync_code text, p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare h text;
begin
  if length(coalesce(p_sync_code,'')) < 20 then
    raise exception 'sync code too short';
  end if;
  h := encode(digest(p_sync_code, 'sha256'), 'hex');
  insert into public.study_state(sync_hash,payload,updated_at)
  values(h,coalesce(p_payload,'{}'::jsonb),now())
  on conflict(sync_hash) do update
  set payload=excluded.payload, updated_at=now();
end;
$$;

revoke all on function public.get_study_state(text) from public;
revoke all on function public.put_study_state(text,jsonb) from public;
grant execute on function public.get_study_state(text) to anon, authenticated;
grant execute on function public.put_study_state(text,jsonb) to anon, authenticated;
