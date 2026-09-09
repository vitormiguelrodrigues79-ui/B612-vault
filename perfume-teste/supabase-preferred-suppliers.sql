alter table public.profiles
  add column if not exists suppliers_visibility text not null default 'private';

do $$
begin
  alter table public.profiles
    add constraint profiles_suppliers_visibility_check
    check (suppliers_visibility in ('friends', 'private'));
exception when duplicate_object then null;
end $$;

create table if not exists public.preferred_suppliers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  url text not null check (url ~* '^https?://[^[:space:]]+$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists preferred_suppliers_user_id_idx
  on public.preferred_suppliers(user_id);

alter table public.preferred_suppliers enable row level security;

drop policy if exists "Users can view their own preferred suppliers" on public.preferred_suppliers;
create policy "Users can view their own preferred suppliers"
on public.preferred_suppliers for select
to authenticated
using (
  (select auth.uid()) = user_id
  and coalesce(((select auth.jwt())->>'is_anonymous')::boolean, false) = false
  and (
    (select auth.jwt())->'app_metadata'->>'provider' = 'google'
    or coalesce((select auth.jwt())->'app_metadata'->'providers', '[]'::jsonb) ? 'google'
  )
);

drop policy if exists "Users can add their own preferred suppliers" on public.preferred_suppliers;
create policy "Users can add their own preferred suppliers"
on public.preferred_suppliers for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and coalesce(((select auth.jwt())->>'is_anonymous')::boolean, false) = false
  and (
    (select auth.jwt())->'app_metadata'->>'provider' = 'google'
    or coalesce((select auth.jwt())->'app_metadata'->'providers', '[]'::jsonb) ? 'google'
  )
);

drop policy if exists "Users can update their own preferred suppliers" on public.preferred_suppliers;
create policy "Users can update their own preferred suppliers"
on public.preferred_suppliers for update
to authenticated
using (
  (select auth.uid()) = user_id
  and coalesce(((select auth.jwt())->>'is_anonymous')::boolean, false) = false
  and (
    (select auth.jwt())->'app_metadata'->>'provider' = 'google'
    or coalesce((select auth.jwt())->'app_metadata'->'providers', '[]'::jsonb) ? 'google'
  )
)
with check (
  (select auth.uid()) = user_id
  and coalesce(((select auth.jwt())->>'is_anonymous')::boolean, false) = false
  and (
    (select auth.jwt())->'app_metadata'->>'provider' = 'google'
    or coalesce((select auth.jwt())->'app_metadata'->'providers', '[]'::jsonb) ? 'google'
  )
);

drop policy if exists "Users can delete their own preferred suppliers" on public.preferred_suppliers;
create policy "Users can delete their own preferred suppliers"
on public.preferred_suppliers for delete
to authenticated
using (
  (select auth.uid()) = user_id
  and coalesce(((select auth.jwt())->>'is_anonymous')::boolean, false) = false
  and (
    (select auth.jwt())->'app_metadata'->>'provider' = 'google'
    or coalesce((select auth.jwt())->'app_metadata'->'providers', '[]'::jsonb) ? 'google'
  )
);

revoke all on table public.preferred_suppliers from public, anon;
grant select, insert, update, delete on table public.preferred_suppliers to authenticated;

create or replace function public.my_supplier_sharing()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce((
    select p.suppliers_visibility = 'friends'
    from public.profiles p
    where p.user_id = auth.uid()
  ), false)
  where auth.uid() is not null
    and coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
    and (
      auth.jwt()->'app_metadata'->>'provider' = 'google'
      or coalesce(auth.jwt()->'app_metadata'->'providers', '[]'::jsonb) ? 'google'
    );
$$;

create or replace function public.set_supplier_sharing(new_enabled boolean)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null
    or coalesce((auth.jwt()->>'is_anonymous')::boolean, false)
    or not (
      auth.jwt()->'app_metadata'->>'provider' = 'google'
      or coalesce(auth.jwt()->'app_metadata'->'providers', '[]'::jsonb) ? 'google'
    ) then
    raise exception 'Google authentication required';
  end if;

  update public.profiles
  set suppliers_visibility = case when new_enabled then 'friends' else 'private' end,
      updated_at = now()
  where user_id = auth.uid();

  if not found then
    raise exception 'Profile not found';
  end if;
end;
$$;

create or replace function public.friend_shared_suppliers(target_user_id uuid)
returns table(
  supplier_id uuid,
  name text,
  url text
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select s.id, s.name, s.url
  from public.preferred_suppliers s
  join public.profiles owner_profile on owner_profile.user_id = s.user_id
  where auth.uid() is not null
    and coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
    and (
      auth.jwt()->'app_metadata'->>'provider' = 'google'
      or coalesce(auth.jwt()->'app_metadata'->'providers', '[]'::jsonb) ? 'google'
    )
    and s.user_id = target_user_id
    and target_user_id <> auth.uid()
    and owner_profile.suppliers_visibility = 'friends'
    and exists (
      select 1
      from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = auth.uid() and f.addressee_id = target_user_id)
          or (f.addressee_id = auth.uid() and f.requester_id = target_user_id)
        )
    )
  order by lower(s.name), s.created_at;
$$;

revoke all on function public.my_supplier_sharing() from public, anon;
revoke all on function public.set_supplier_sharing(boolean) from public, anon;
revoke all on function public.friend_shared_suppliers(uuid) from public, anon;

grant execute on function public.my_supplier_sharing() to authenticated;
grant execute on function public.set_supplier_sharing(boolean) to authenticated;
grant execute on function public.friend_shared_suppliers(uuid) to authenticated;
