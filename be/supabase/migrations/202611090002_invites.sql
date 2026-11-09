create table public.invites (
  id text primary key check (id ~ '^[a-f0-9]{24}$'),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  version integer not null default 0 check (version >= 0),
  check (data->>'code' is not null and data->>'code' = id),
  check (data->>'type' is not null and data->>'type' in ('driver','warehouse')),
  check (data->>'shipperId' is not null),
  check (data->>'expiresAt' is not null),
  check (data->>'type' <> 'warehouse' or length(data->>'address') > 0)
);
create index invites_data_idx on public.invites using gin (data);
alter table public.invites enable row level security;
revoke all on public.invites from anon, authenticated;
grant all on public.invites to service_role;
