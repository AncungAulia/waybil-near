create table public.applications (
  id text primary key,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  version integer not null default 0 check (version >= 0),
  check (data->>'id' is not null and data->>'id' = id),
  check (data->>'shipperId' is not null),
  check (data->>'state' is not null and data->>'state' in ('draft','in_review','needs_more','approved','rejected')),
  check (jsonb_typeof(data->'company') = 'object' and jsonb_typeof(data->'documents') = 'object')
);
create unique index application_shipper_idx on public.applications ((data->>'shipperId')) where data->>'state' <> 'rejected';
create index applications_data_idx on public.applications using gin (data);
create table public.application_documents (
  id text primary key,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  version integer not null default 0 check (version >= 0),
  check (data->>'id' is not null and data->>'id' = id),
  check (data->>'applicationId' is not null and data->>'sha256' is not null and data->>'path' is not null),
  check (data->>'kind' is not null and data->>'kind' in ('registration','bank_statement','tax_id')),
  check (data->>'state' is not null and data->>'state' in ('uploading','ready','cleanup'))
);
create index application_documents_data_idx on public.application_documents using gin (data);
create table public.email_log (
  id text primary key,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  version integer not null default 0 check (version >= 0),
  check (data->>'id' is not null and data->>'id' = id),
  check (data->>'state' is not null and data->>'state' in ('queued','sending','sent','failed','uncertain')),
  check (data->>'key' is not null and jsonb_typeof(data->'message') = 'object')
);
create unique index email_key_idx on public.email_log ((data->>'key'));
alter table public.applications enable row level security;
alter table public.application_documents enable row level security;
alter table public.email_log enable row level security;
revoke all on public.applications, public.application_documents, public.email_log from anon, authenticated;
grant all on public.applications, public.application_documents, public.email_log to service_role;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('documents','documents',false,2097152,array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update set public=false, file_size_limit=2097152, allowed_mime_types=excluded.allowed_mime_types;
