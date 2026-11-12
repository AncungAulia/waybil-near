-- Pool history kept in the database, so a restart or deploy no longer empties it.
-- One row per pool event the contract logged (deposit, withdraw paid, queued or failed).
create table public.pool_events (
  -- "<receipt id>:<log index>", unique for every event line.
  id text primary key check (id ~ '^[A-Za-z0-9]+:[0-9]+$'),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  version integer not null default 0 check (version >= 0),
  check (data->>'kind' in ('deposit', 'withdraw_paid', 'withdraw_queued', 'withdraw_failed')),
  check (data->>'investor' is not null and data->>'amount' ~ '^[0-9]+$'),
  check (data->>'txHash' is not null and data->>'at' is not null)
);
create index pool_events_investor_idx on public.pool_events ((data->>'investor'));
alter table public.pool_events enable row level security;
revoke all on public.pool_events from anon, authenticated;
grant all on public.pool_events to service_role;

-- Where reading the indexer got to: one row per contract, with the newest receipt already
-- listed and the transactions still waiting to be read.
create table public.pool_scan (
  id text primary key,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  version integer not null default 0 check (version >= 0),
  check (jsonb_typeof(data->'pending') = 'array')
);
alter table public.pool_scan enable row level security;
revoke all on public.pool_scan from anon, authenticated;
grant all on public.pool_scan to service_role;
