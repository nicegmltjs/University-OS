-- University OS beta · Supabase SQL Editor 실행용
-- Authentication is provided by Supabase Auth. NEVER expose service_role credentials in the browser.
create table if not exists public.workspaces (
 user_id uuid primary key references auth.users(id) on delete cascade,
 data jsonb not null default '{"settings":{"semester":"","start":"","end":"","theme":"sage","dark":false},"courses":[],"tasks":[],"journals":[],"materials":[]}'::jsonb,
 updated_at timestamptz not null default now()
);
create table if not exists public.entitlements (
 user_id uuid primary key references auth.users(id) on delete cascade,
 plan text not null default 'free' check (plan in ('free','pro')),
 expires_at timestamptz,
 updated_at timestamptz not null default now()
);
alter table public.workspaces enable row level security;
alter table public.entitlements enable row level security;
drop policy if exists workspace_select_self on public.workspaces;
drop policy if exists workspace_insert_self on public.workspaces;
drop policy if exists workspace_update_self on public.workspaces;
drop policy if exists entitlement_select_self on public.entitlements;
create policy workspace_select_self on public.workspaces for select to authenticated using (auth.uid()=user_id);
create policy workspace_insert_self on public.workspaces for insert to authenticated with check (auth.uid()=user_id);
create policy workspace_update_self on public.workspaces for update to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
drop policy if exists workspace_delete_self on public.workspaces;
create policy workspace_delete_self on public.workspaces for delete to authenticated using (auth.uid()=user_id);
create policy entitlement_select_self on public.entitlements for select to authenticated using (auth.uid()=user_id);
-- Prohibit arbitrary clients modifying subscriptions. Only trusted server/service role may write entitlements.
revoke insert,update,delete on public.entitlements from anon,authenticated;
grant select on public.entitlements to authenticated;
grant select,insert,update,delete on public.workspaces to authenticated;
create or replace function public.enforce_workspace_limits()
returns trigger language plpgsql security definer set search_path = public as $$
declare p text; expiry timestamptz; counts text[] := array['courses','tasks','journals','materials']; i int;
begin
 if jsonb_typeof(new.data) <> 'object' then raise exception 'Workspace must be an object'; end if;
 for i in 1..4 loop
  if jsonb_typeof(new.data->counts[i]) <> 'array' then raise exception 'Invalid workspace field %',counts[i]; end if;
 end loop;
 if pg_column_size(new.data)>2000000 then raise exception 'Workspace exceeds maximum size'; end if;
 select plan,expires_at into p,expiry from public.entitlements where user_id=new.user_id;
 if p='pro' and (expiry is null or expiry>now()) then return new; end if;
 -- A subscription expiry must not lock users out of editing or deleting existing work.
 -- Existing over-quota records may remain, but the count cannot increase after downgrade.
 if jsonb_array_length(new.data->'journals')>20 and (
   tg_op = 'INSERT'
   or jsonb_array_length(new.data->'journals')>jsonb_array_length(old.data->'journals')
 ) then raise exception 'FREE plan journals limit is 20'; end if;
 if coalesce(new.data#>>'{settings,theme}','sage') not in ('sage','mono') and (
   tg_op='INSERT'
   or new.data#>>'{settings,theme}' is distinct from old.data#>>'{settings,theme}'
 ) then raise exception 'FREE theme is restricted'; end if;
 new.updated_at=now();
 return new;
end;$$;
drop trigger if exists workspace_limits on public.workspaces;
create trigger workspace_limits before insert or update on public.workspaces
for each row execute function public.enforce_workspace_limits();

-- Not included yet: payment fulfillment. A trusted payment provider webhook
-- must verify event signatures, deduplicate transaction IDs, and update
-- entitlements using server-side service credentials only.
