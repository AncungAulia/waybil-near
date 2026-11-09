create table public.credit_reviews (
  id text primary key,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  version integer not null default 0 check (version >= 0),
  check (data->>'id' is not null and data->>'id' = id),
  check (data->>'shipperId' is not null),
  check (data->>'state' is not null and data->>'state' in ('queued','running','writing','complete')),
  check (data->>'kind' is not null and data->>'kind' in ('initial','review')),
  check (data->>'result' is null or data->>'result' in ('raised','proposed','no_change','failed'))
);
create unique index credit_active_shipper_idx on public.credit_reviews ((data->>'shipperId')) where data->>'state' <> 'complete';
create index credit_reviews_data_idx on public.credit_reviews using gin (data);
alter table public.credit_reviews enable row level security;
revoke all on public.credit_reviews from anon, authenticated;
grant all on public.credit_reviews to service_role;
