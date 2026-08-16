insert into storage.buckets (id, name, public)
values ('watch-photos', 'watch-photos', false)
on conflict (id) do update set public = false;

drop policy if exists "B612 upload own photos" on storage.objects;
drop policy if exists "B612 view own photos" on storage.objects;
drop policy if exists "B612 update own photos" on storage.objects;
drop policy if exists "B612 delete own photos" on storage.objects;

create policy "B612 upload own photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'watch-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "B612 view own photos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'watch-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "B612 update own photos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'watch-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'watch-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "B612 delete own photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'watch-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
