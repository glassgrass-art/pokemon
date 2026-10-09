begin;
create table if not exists public.scan_daily_usage_v2 (
  user_id uuid references auth.users(id), day date, calls integer not null, primary key(user_id,day)
);
create table if not exists public.scan_global_usage_v2 (day date primary key,calls integer not null);
alter table public.scan_daily_usage_v2 enable row level security;
alter table public.scan_global_usage_v2 enable row level security;
revoke all on public.scan_daily_usage_v2,public.scan_global_usage_v2 from public,anon,authenticated;
create or replace function public.consume_scan_quota_v2()
returns void language plpgsql security definer set search_path='' as $$
declare d date := (now() at time zone 'UTC')::date; n integer; begin
  if auth.uid() is null then raise exception 'Login required'; end if;
  -- A shared database lock enforces the global cap across server processes and restarts.
  perform pg_advisory_xact_lock(819261008);
  select calls into n from public.scan_daily_usage_v2 where user_id=auth.uid() and day=d;
  if coalesce(n,0)>=20 then raise exception 'Daily account limit reached'; end if;
  select calls into n from public.scan_global_usage_v2 where day=d;
  if coalesce(n,0)>=500 then raise exception 'Daily site limit reached'; end if;
  insert into public.scan_daily_usage_v2 values(auth.uid(),d,1)
    on conflict(user_id,day) do update set calls=public.scan_daily_usage_v2.calls+1;
  insert into public.scan_global_usage_v2 values(d,1)
    on conflict(day) do update set calls=public.scan_global_usage_v2.calls+1;
end $$;
revoke all on function public.consume_scan_quota_v2() from public,anon;
grant execute on function public.consume_scan_quota_v2() to authenticated;
commit;
