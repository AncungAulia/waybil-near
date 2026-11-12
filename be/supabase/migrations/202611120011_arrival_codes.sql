create table public.arrival_codes (
  id text primary key check (id ~ '^[1-9][0-9]*$'),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  version integer not null default 0 check (version >= 0),
  check (data->>'shipmentId' is not null and data->>'shipmentId' = id),
  check (data->>'code' is not null and data->>'code' ~ '^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$'),
  check (data->>'createdAt' is not null)
);
create unique index arrival_codes_code_idx on public.arrival_codes ((data->>'code'));
alter table public.arrival_codes enable row level security;
revoke all on public.arrival_codes from anon, authenticated;
grant all on public.arrival_codes to service_role;
