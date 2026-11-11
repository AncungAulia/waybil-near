create table public.relay_requests (
  id text primary key check (id ~ '^[a-f0-9]{64}$'),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  version integer not null default 0 check (version >= 0),
  check (data->>'digest' is not null and data->>'digest' = id),
  check (data->>'accountId' is not null and data->>'txHash' is not null and data->>'bytes' is not null),
  check (data->>'status' is not null and data->>'status' in ('pending','confirmed','failed'))
);
create unique index relay_hash_idx on public.relay_requests ((data->>'txHash'));
create index relay_data_idx on public.relay_requests using gin (data);
alter table public.relay_requests enable row level security;
revoke all on public.relay_requests from anon, authenticated;
grant all on public.relay_requests to service_role;
