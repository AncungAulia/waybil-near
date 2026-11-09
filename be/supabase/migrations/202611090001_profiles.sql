create table public.profiles (
  id text primary key,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  version integer not null default 0 check (version >= 0),
  check (data->>'accountId' is not null and data->>'accountId' = id),
  check (data->>'role' is not null and data->>'role' in ('shipper','driver','warehouse','investor','admin')),
  check (data->>'authMethod' is not null and data->>'authMethod' in ('wallet','google')),
  check (data ? 'sessionVersion' and jsonb_typeof(data->'sessionVersion') = 'number')
);
create index profiles_data_idx on public.profiles using gin (data);
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant all on public.profiles to service_role;
