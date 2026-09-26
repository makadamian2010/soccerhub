insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('store-media','store-media',true,52428800,array['image/jpeg','image/png','image/webp','image/avif','video/mp4','video/webm']) on conflict(id) do nothing;
create policy store_media_admin_insert on storage.objects for insert to authenticated with check(bucket_id='store-media' and public.is_admin());
create policy store_media_admin_update on storage.objects for update to authenticated using(bucket_id='store-media' and public.is_admin()) with check(bucket_id='store-media' and public.is_admin());
create policy store_media_admin_delete on storage.objects for delete to authenticated using(bucket_id='store-media' and public.is_admin());
create policy store_media_read on storage.objects for select using(bucket_id='store-media');
