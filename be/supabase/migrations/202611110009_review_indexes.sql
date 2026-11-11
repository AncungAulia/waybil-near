create index auth_challenges_expiry_idx on public.auth_challenges ((data->>'expiresAt'));
