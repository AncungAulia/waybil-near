create table public.places (
  id text primary key,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  version integer not null default 0 check (version >= 0),
  check (data->>'id' is not null and data->>'id' = id),
  check (data->>'shipperId' is not null),
  check (data->>'kind' is not null and data->>'kind' in ('pickup','destination')),
  check (length(data->>'name') > 0 and length(data->>'address') > 0),
  check (jsonb_typeof(data->'lat') = 'number' and jsonb_typeof(data->'lng') = 'number')
);
create index places_data_idx on public.places using gin (data);
alter table public.places enable row level security;
revoke all on public.places from anon, authenticated;
grant all on public.places to service_role;

create table public.trips (
  id text primary key check (id ~ '^[1-9][0-9]*$'),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  version integer not null default 0 check (version >= 0),
  check (data->>'shipmentId' is not null and data->>'shipmentId' = id),
  check (data->>'shipperId' is not null),
  check (jsonb_typeof(data->'pickup') = 'object' and jsonb_typeof(data->'destination') = 'object'),
  check (data->>'routeSource' is not null and data->>'routeSource' in ('road','straight'))
);
alter table public.trips enable row level security;
revoke all on public.trips from anon, authenticated;
grant all on public.trips to service_role;
