create table public.proposal_reasons (
  id text primary key,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  version integer not null default 0 check (version >= 0),
  check (data->>'id' is not null and data->>'id' = id),
  check (data->>'proposalId' is not null and data->>'actor' is not null),
  check (data->>'reason' is not null and data->>'reason' in ('too_big_jump','needs_history','payment_risk','other'))
);
create unique index proposal_reason_vote_idx on public.proposal_reasons ((data->>'proposalId'),(data->>'actor'));
create index proposal_reasons_data_idx on public.proposal_reasons using gin(data);
create table public.pause_notes (
  id text primary key,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  version integer not null default 0 check (version >= 0),
  check (data->>'id' is not null and data->>'id' = id and data->>'txHash' = id),
  check (data->>'actor' is not null and data->>'shipperId' is not null),
  check (data->>'reason' is not null and data->>'reason' in ('payment_risk','late_bills','other'))
);
create index pause_notes_data_idx on public.pause_notes using gin(data);
create table public.job_runs (
  id text primary key,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  version integer not null default 0 check (version >= 0),
  check (data->>'id' is not null and data->>'id' = id),
  check (data->>'kind' is not null and data->>'kind' in ('late','reminders','expiry')),
  check (data->>'state' is not null and data->>'state' in ('running','complete','failed'))
);
create index job_runs_data_idx on public.job_runs using gin(data);
alter table public.proposal_reasons enable row level security;
alter table public.pause_notes enable row level security;
alter table public.job_runs enable row level security;
revoke all on public.proposal_reasons, public.pause_notes, public.job_runs from anon, authenticated;
grant all on public.proposal_reasons, public.pause_notes, public.job_runs to service_role;

create function public.renew_work_lease(lease_key text, lease_owner uuid, ttl_seconds integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare renewed text;
begin
  if ttl_seconds < 1 or ttl_seconds > 300 then raise exception 'Invalid lease duration'; end if;
  update work_leases set expires_at = clock_timestamp() + make_interval(secs => ttl_seconds)
    where id = lease_key and owner = lease_owner and expires_at > clock_timestamp()
    returning id into renewed;
  return renewed is not null;
end;
$$;
revoke all on function public.renew_work_lease(text,uuid,integer) from public, anon, authenticated;
grant execute on function public.renew_work_lease(text,uuid,integer) to service_role;
