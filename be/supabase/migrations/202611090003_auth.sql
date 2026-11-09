create table public.auth_challenges (
  id text primary key,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  version integer not null default 0 check (version >= 0),
  check (data->>'id' is not null and data->>'id' = id),
  check (data->>'expiresAt' is not null),
  check (jsonb_typeof(data->'consumed') = 'boolean')
);
create table public.auth_identities (
  id text primary key check (id ~ '^[a-f0-9]{64}$'),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  version integer not null default 0 check (version >= 0),
  check (data->>'subjectHash' is not null and data->>'subjectHash' = id),
  check (data->>'role' is not null and data->>'role' in ('driver','warehouse')),
  check (data->>'accountId' is not null and data->>'devicePublicKey' is not null),
  check (data->'recovery'->>'ciphertext' is not null)
);
create unique index auth_identity_account_idx on public.auth_identities ((data->>'accountId'));
create index auth_identities_data_idx on public.auth_identities using gin (data);
create table public.work_leases (id text primary key, owner uuid not null, expires_at timestamptz not null);
create function public.claim_work_lease(lease_key text, lease_owner uuid, ttl_seconds integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare claimed text;
begin
  if ttl_seconds < 1 or ttl_seconds > 300 then raise exception 'Invalid lease duration'; end if;
  insert into work_leases (id, owner, expires_at)
    values (lease_key, lease_owner, clock_timestamp() + make_interval(secs => ttl_seconds))
  on conflict (id) do update set owner = excluded.owner, expires_at = excluded.expires_at
    where work_leases.expires_at <= clock_timestamp()
  returning id into claimed;
  return claimed is not null;
end;
$$;
create function public.release_work_lease(lease_key text, lease_owner uuid)
returns void language sql security definer set search_path = public as $$
  delete from work_leases where id = lease_key and owner = lease_owner;
$$;
alter table public.auth_challenges enable row level security;
alter table public.auth_identities enable row level security;
alter table public.work_leases enable row level security;
revoke all on public.auth_challenges, public.auth_identities, public.work_leases from anon, authenticated;
grant all on public.auth_challenges, public.auth_identities, public.work_leases to service_role;
revoke all on function public.claim_work_lease(text,uuid,integer), public.release_work_lease(text,uuid) from public, anon, authenticated;
grant execute on function public.claim_work_lease(text,uuid,integer), public.release_work_lease(text,uuid) to service_role;
