create table public.reports (
  id text primary key,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  version integer not null default 0 check (version >= 0),
  check (data->>'shipmentId' is not null and data->>'shipmentId' = id),
  check (data->>'warehouseId' is not null and data->>'reportHash' is not null and data->>'canonical' is not null),
  check (data->>'state' is not null and data->>'state' in ('uploading','ready'))
);
create table public.report_photos (
  id text primary key,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  version integer not null default 0 check (version >= 0),
  check (data->>'id' is not null and data->>'id' = id),
  check (data->>'reportHash' is not null and data->>'path' is not null and data->>'sha256' is not null)
);
create index report_photos_data_idx on public.report_photos using gin (data);
alter table public.reports enable row level security;
alter table public.report_photos enable row level security;
revoke all on public.reports, public.report_photos from anon, authenticated;
grant all on public.reports, public.report_photos to service_role;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('report-photos','report-photos',false,2097152,array['image/jpeg','image/png'])
on conflict (id) do update set public=false, file_size_limit=2097152, allowed_mime_types=excluded.allowed_mime_types;
