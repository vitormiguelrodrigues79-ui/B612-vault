alter table public.profiles
  add column if not exists collection_visibility text not null default 'private',
  add column if not exists decants_visibility text not null default 'private';

do $$
begin
  alter table public.profiles
    add constraint profiles_collection_visibility_check
    check (collection_visibility in ('friends', 'private'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.profiles
    add constraint profiles_decants_visibility_check
    check (decants_visibility in ('friends', 'private'));
exception when duplicate_object then null;
end $$;

create or replace function public.my_perfume_sharing()
returns table(favorites boolean, collection boolean, decants boolean)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    p.favorites_visibility = 'friends',
    p.collection_visibility = 'friends',
    p.decants_visibility = 'friends'
  from public.profiles p
  where auth.uid() is not null
    and p.user_id = auth.uid();
$$;

create or replace function public.set_perfume_sharing(target_category text, new_enabled boolean)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if target_category = 'favorites' then
    update public.profiles
    set favorites_visibility = case when new_enabled then 'friends' else 'private' end,
        updated_at = now()
    where user_id = auth.uid();
  elsif target_category = 'collection' then
    update public.profiles
    set collection_visibility = case when new_enabled then 'friends' else 'private' end,
        updated_at = now()
    where user_id = auth.uid();
  elsif target_category = 'decants' then
    update public.profiles
    set decants_visibility = case when new_enabled then 'friends' else 'private' end,
        updated_at = now()
    where user_id = auth.uid();
  else
    raise exception 'Invalid sharing category';
  end if;

  if not found then
    raise exception 'Profile not found';
  end if;
end;
$$;

create or replace function public.friend_shared_perfumes(target_user_id uuid, target_category text)
returns table(
  perfume_id uuid,
  brand text,
  name text,
  concentration text,
  image_url text,
  profile text,
  overall_score numeric,
  inspiration_name text,
  inspiration_house text
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    p.id,
    p.brand,
    p.name,
    p.concentration,
    p.image_url,
    p.profile,
    p.overall_score,
    p.inspiration_name,
    p.inspiration_house
  from public.perfumes p
  join public.profiles owner_profile on owner_profile.user_id = p.user_id
  where auth.uid() is not null
    and p.user_id = target_user_id
    and target_user_id <> auth.uid()
    and exists (
      select 1
      from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = auth.uid() and f.addressee_id = target_user_id)
          or (f.addressee_id = auth.uid() and f.requester_id = target_user_id)
        )
    )
    and (
      (target_category = 'favorites' and owner_profile.favorites_visibility = 'friends' and p.favorite is true)
      or (target_category = 'collection' and owner_profile.collection_visibility = 'friends' and p.status = 'collection')
      or (target_category = 'decants' and owner_profile.decants_visibility = 'friends' and p.status = 'decant')
    )
  order by p.overall_score desc nulls last, p.updated_at desc;
$$;

revoke all on function public.my_perfume_sharing() from public, anon;
revoke all on function public.set_perfume_sharing(text, boolean) from public, anon;
revoke all on function public.friend_shared_perfumes(uuid, text) from public, anon;

grant execute on function public.my_perfume_sharing() to authenticated;
grant execute on function public.set_perfume_sharing(text, boolean) to authenticated;
grant execute on function public.friend_shared_perfumes(uuid, text) to authenticated;
