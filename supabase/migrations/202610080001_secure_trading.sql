-- Apply as the project owner in Supabase SQL Editor. No legacy rows are deleted.
begin;
-- Legacy data has no authenticated owner. Lock it until an operator verifies ownership.
do $$ declare t text; p record; begin
  foreach t in array array['trainer_backups','trade_listings','trade_proposals'] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('revoke all on public.%I from public, anon, authenticated', t);
      for p in select policyname from pg_policies where schemaname='public' and tablename=t loop
        execute format('drop policy %I on public.%I', p.policyname, t);
      end loop;
    end if;
  end loop;
end $$;

create table if not exists public.card_catalog_v2 (
  id text primary key, rarity text not null, eligible boolean not null
);
create table if not exists public.trainer_profiles_v2 (
  user_id uuid primary key references auth.users(id),
  friend_code text not null unique check (friend_code ~ '^[0-9]{16}$'),
  trainer_name text not null check (length(trainer_name) between 1 and 60),
  trainer_avatar text not null default ''
);
create table if not exists public.trainer_backups_v2 (
  user_id uuid primary key references auth.users(id),
  trainer_profile jsonb not null, user_collection jsonb not null,
  applied_trade_ids jsonb not null default '[]',
  version integer not null default 1,
  updated_at timestamptz not null default now()
);
create table if not exists public.trade_listings_v2 (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.trainer_profiles_v2(user_id),
  offer_card_ids text[] not null, want_card_ids text[] not null,
  offer_quantities jsonb not null,
  rarity text not null, note text not null default '' check (length(note)<=500),
  status text not null default 'active' check (status in ('active','completed','cancelled')),
  created_at timestamptz not null default now(), expires_at timestamptz not null default (now()+interval '7 days')
);
create table if not exists public.trade_proposals_v2 (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.trade_listings_v2(id),
  from_user_id uuid not null references public.trainer_profiles_v2(user_id),
  to_user_id uuid not null references public.trainer_profiles_v2(user_id),
  offer_card_id text not null references public.card_catalog_v2(id),
  want_card_id text not null references public.card_catalog_v2(id),
  has_flair boolean not null default false, has_gold_frame boolean not null default false,
  status text not null default 'pending' check (status in ('pending','accepted','declined','completed')),
  from_confirmed_at timestamptz, to_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  check (from_user_id <> to_user_id),
  check (status <> 'completed' or (from_confirmed_at is not null and to_confirmed_at is not null))
);
create unique index if not exists unique_open_proposal_v2 on public.trade_proposals_v2
  (listing_id,from_user_id,offer_card_id,want_card_id) where status in ('pending','accepted');
create index if not exists listings_active_v2 on public.trade_listings_v2(status,created_at desc);
create index if not exists proposals_sender_v2 on public.trade_proposals_v2(from_user_id,created_at desc);
create index if not exists proposals_recipient_v2 on public.trade_proposals_v2(to_user_id,created_at desc);

alter table public.card_catalog_v2 enable row level security;
alter table public.trainer_profiles_v2 enable row level security;
alter table public.trainer_backups_v2 enable row level security;
alter table public.trade_listings_v2 enable row level security;
alter table public.trade_proposals_v2 enable row level security;
revoke all on public.card_catalog_v2,public.trainer_profiles_v2,public.trainer_backups_v2,
  public.trade_listings_v2,public.trade_proposals_v2 from public,anon,authenticated;
grant select on public.card_catalog_v2,public.trainer_profiles_v2,public.trade_listings_v2 to anon,authenticated;
grant select on public.trainer_backups_v2,public.trade_proposals_v2 to authenticated;
drop policy if exists catalog_read on public.card_catalog_v2;
create policy catalog_read on public.card_catalog_v2 for select using (true);
drop policy if exists profile_read on public.trainer_profiles_v2;
create policy profile_read on public.trainer_profiles_v2 for select using (true);
drop policy if exists listing_read on public.trade_listings_v2;
create policy listing_read on public.trade_listings_v2 for select using
  ((status='active' and expires_at>now()) or owner_id=auth.uid());
drop policy if exists backup_owner on public.trainer_backups_v2;
create policy backup_owner on public.trainer_backups_v2 for select to authenticated using (user_id=auth.uid());
drop policy if exists proposal_participant on public.trade_proposals_v2;
create policy proposal_participant on public.trade_proposals_v2 for select to authenticated using
  (from_user_id=auth.uid() or to_user_id=auth.uid());

create or replace function public.register_trainer_v2(p_code text,p_name text,p_avatar text)
returns void language plpgsql security definer set search_path='' as $$ begin
  if auth.uid() is null then raise exception '请先登录'; end if;
  if length(p_avatar)>2048 then raise exception '头像地址过长'; end if;
  insert into public.trainer_profiles_v2 values (auth.uid(),p_code,p_name,p_avatar)
  on conflict(user_id) do update set friend_code=excluded.friend_code,trainer_name=excluded.trainer_name,trainer_avatar=excluded.trainer_avatar;
end $$;

create or replace function public.publish_listing_v2(p_id uuid,p_offer text[],p_want text[],p_quantities jsonb,p_note text)
returns void language plpgsql security definer set search_path='' as $$
declare r text; c text; q integer; begin
  if auth.uid() is null then raise exception '请先登录'; end if;
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
  if not exists(select 1 from public.trainer_profiles_v2 where user_id=auth.uid()) then raise exception '请先填写好友码'; end if;
  if cardinality(p_offer) not between 1 and 20 or cardinality(p_want) not between 1 and 20 then raise exception '每侧请选择1至20张卡'; end if;
  if jsonb_typeof(p_quantities) is distinct from 'object' or exists(select 1 from jsonb_object_keys(p_quantities) k where not k=any(p_offer)) then raise exception '出卡数量格式无效'; end if;
  select rarity into r from public.card_catalog_v2 where id=p_offer[1] and eligible;
  if r is null then raise exception '卡牌不支持交换'; end if;
  foreach c in array p_offer || p_want loop
    if not exists(select 1 from public.card_catalog_v2 where id=c and rarity=r and eligible) then raise exception '只能交换同稀有度的有效卡牌'; end if;
  end loop;
  foreach c in array p_offer loop
    q := (p_quantities->>c)::integer;
    if q is null or q not between 1 and 99 then raise exception '请填写有效出卡数量'; end if;
  end loop;
  if exists(select 1 from public.trade_listings_v2 where id=p_id and owner_id=auth.uid()) then
    if exists(select 1 from public.trade_listings_v2 where id=p_id and offer_card_ids=p_offer and want_card_ids=p_want and offer_quantities=p_quantities and note=p_note and status='active') then return; end if;
    raise exception '这条挂单已发布，请刷新后重新创建新挂单';
  end if;
  if (select count(*) from public.trade_listings_v2 where owner_id=auth.uid() and status='active' and expires_at>now())>=30 then raise exception '最多同时发布30条挂单'; end if;
  insert into public.trade_listings_v2(id,owner_id,offer_card_ids,want_card_ids,offer_quantities,rarity,note)
    values(p_id,auth.uid(),p_offer,p_want,p_quantities,r,p_note);
end $$;

create or replace function public.cancel_listing_v2(p_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare l public.trade_listings_v2; begin
  select * into l from public.trade_listings_v2 where id=p_id for update;
  if auth.uid() is null or l.owner_id is distinct from auth.uid() then raise exception '只能撤销自己的挂单'; end if;
  if exists(select 1 from public.trade_proposals_v2 where listing_id=p_id and status='accepted') then raise exception '请先处理进行中的交换'; end if;
  update public.trade_listings_v2 set status='cancelled' where id=p_id;
  update public.trade_proposals_v2 set status='declined' where listing_id=p_id and status='pending';
end $$;

create or replace function public.request_trade_v2(p_id uuid,p_listing uuid,p_give text,p_get text,p_flair boolean,p_gold boolean)
returns public.trade_proposals_v2 language plpgsql security definer set search_path='' as $$
declare l public.trade_listings_v2; p public.trade_proposals_v2; begin
  if auth.uid() is null then raise exception '请先登录'; end if;
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
  select * into l from public.trade_listings_v2 where id=p_listing for update;
  if l.id is null or l.status<>'active' or l.expires_at<=now() or l.owner_id=auth.uid() then raise exception '挂单不可用'; end if;
  if p_give=p_get then raise exception '请选择两张不同的卡'; end if;
  if not (p_give=any(l.want_card_ids) and p_get=any(l.offer_card_ids)) or coalesce((l.offer_quantities->>p_get)::integer,0)<1 then raise exception '所选卡牌不在挂单内或已换完'; end if;
  if not exists(select 1 from public.card_catalog_v2 where id=p_give and eligible and rarity=l.rarity)
    or not exists(select 1 from public.card_catalog_v2 where id=p_get and eligible and rarity=l.rarity) then raise exception '卡牌规则已更新，请重新选卡'; end if;
  select * into p from public.trade_proposals_v2 where listing_id=p_listing and from_user_id=auth.uid()
    and offer_card_id=p_give and want_card_id=p_get and status in ('pending','accepted');
  if p.id is not null then return p; end if;
  if (select count(*) from public.trade_proposals_v2 where from_user_id=auth.uid() and created_at>now()-interval '1 hour')>=30 then raise exception '请求过于频繁，请稍后再试'; end if;
  insert into public.trade_proposals_v2(id,listing_id,from_user_id,to_user_id,offer_card_id,want_card_id,has_flair,has_gold_frame)
    values(p_id,p_listing,auth.uid(),l.owner_id,p_give,p_get,p_flair,p_gold) returning * into p;
  return p;
end $$;

create or replace function public.respond_trade_v2(p_id uuid,p_action text)
returns public.trade_proposals_v2 language plpgsql security definer set search_path='' as $$
declare p public.trade_proposals_v2; l public.trade_listings_v2; reserved integer; begin
  -- Lock the listing before proposals in every RPC to serialize quantity updates and avoid deadlocks.
  select * into l from public.trade_listings_v2 where id=(select listing_id from public.trade_proposals_v2 where id=p_id) for update;
  select * into p from public.trade_proposals_v2 where id=p_id for update;
  if auth.uid() is null or p.id is null or auth.uid() not in (p.from_user_id,p.to_user_id) then raise exception '无权处理此交换'; end if;
  if p_action='decline' then
    if p.status='completed' then raise exception '已完成交换不能撤销'; end if;
    if p.from_confirmed_at is not null or p.to_confirmed_at is not null then raise exception '已有一方确认完成，请联系对方核对'; end if;
    update public.trade_proposals_v2 set status='declined' where id=p_id;
  elsif p_action='accept' then
    if auth.uid()<>p.to_user_id then raise exception '只有接收方能接受'; end if;
    if p.status='accepted' then return p; end if;
    if p.status<>'pending' or l.status<>'active' or l.expires_at<=now() then raise exception '请求不可接受'; end if;
    select count(*) into reserved from public.trade_proposals_v2 where listing_id=l.id and want_card_id=p.want_card_id and status='accepted';
    if coalesce((l.offer_quantities->>p.want_card_id)::integer,0)<=reserved then raise exception '这张卡的可交换数量已被预约'; end if;
    update public.trade_proposals_v2 set status='accepted' where id=p_id;
  elsif p_action='confirm' then
    if p.status='completed' then return p; end if;
    if p.status<>'accepted' then raise exception '请先等待对方接受交换'; end if;
    update public.trade_proposals_v2 set
      from_confirmed_at=case when auth.uid()=from_user_id then coalesce(from_confirmed_at,now()) else from_confirmed_at end,
      to_confirmed_at=case when auth.uid()=to_user_id then coalesce(to_confirmed_at,now()) else to_confirmed_at end
      where id=p_id returning * into p;
    if p.from_confirmed_at is not null and p.to_confirmed_at is not null then
      update public.trade_proposals_v2 set status='completed' where id=p_id;
      update public.trade_listings_v2 set offer_quantities=jsonb_set(offer_quantities,array[p.want_card_id],
        to_jsonb(greatest(0,(offer_quantities->>p.want_card_id)::integer-1))) where id=l.id;
      update public.trade_listings_v2 set status='completed' where id=l.id and not exists
        (select 1 from jsonb_each_text(offer_quantities) where value::integer>0);
    end if;
  else raise exception '无效操作'; end if;
  select * into p from public.trade_proposals_v2 where id=p_id;
  return p;
end $$;

create or replace function public.save_backup_v2(p_profile jsonb,p_collection jsonb,p_applied jsonb,p_version integer)
returns public.trainer_backups_v2 language plpgsql security definer set search_path='' as $$
declare b public.trainer_backups_v2; begin
  if auth.uid() is null then raise exception '请先登录'; end if;
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
  select * into b from public.trainer_backups_v2 where user_id=auth.uid() for update;
  if p_version is null or p_version<0 then raise exception '备份版本无效'; end if;
  if coalesce(b.version,0)<>p_version then raise exception '云端已有较新备份，请先恢复云端数据再保存'; end if;
  if jsonb_typeof(p_collection)<>'object' or jsonb_typeof(p_applied)<>'array' or jsonb_typeof(p_profile)<>'object' then raise exception '备份格式无效'; end if;
  insert into public.trainer_backups_v2(user_id,trainer_profile,user_collection,applied_trade_ids,version)
    values(auth.uid(),p_profile,p_collection,p_applied,p_version+1)
    on conflict(user_id) do update set trainer_profile=excluded.trainer_profile,user_collection=excluded.user_collection,
      applied_trade_ids=excluded.applied_trade_ids,version=excluded.version,updated_at=now()
    returning * into b;
  return b;
end $$;

revoke all on function public.register_trainer_v2(text,text,text),public.publish_listing_v2(uuid,text[],text[],jsonb,text),
  public.cancel_listing_v2(uuid),public.request_trade_v2(uuid,uuid,text,text,boolean,boolean),
  public.respond_trade_v2(uuid,text),public.save_backup_v2(jsonb,jsonb,jsonb,integer) from public,anon;
grant execute on function public.register_trainer_v2(text,text,text),public.publish_listing_v2(uuid,text[],text[],jsonb,text),
  public.cancel_listing_v2(uuid),public.request_trade_v2(uuid,uuid,text,text,boolean,boolean),
  public.respond_trade_v2(uuid,text),public.save_backup_v2(jsonb,jsonb,jsonb,integer) to authenticated;
commit;
