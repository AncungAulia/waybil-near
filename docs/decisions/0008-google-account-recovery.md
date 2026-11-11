# 0008: Per-account recovery custody

- Status: accepted for the testnet implementation
- Date: 2026-11-09

Each Google account has a different randomly generated full-access recovery key. The
backend encrypts it with AES-256-GCM using a 32-byte master secret kept only in local/Railway
settings. The identity's hashed Google subject is authenticated associated data. Supabase
stores only ciphertext, IV and tag in a server-only identity record; plaintext keys never
go into the database, logs or responses. This makes the key-location rule explicit for
encrypted recovery records. Device private keys still never leave the browser.

Account provisioning is resumable under an expiring per-identity database lease. A record
and its encrypted recovery key are written before account creation. An existing account
is attached only when its actual recovery key matches. A replacement device key is added
and the old one removed in the same chain transaction. Sessions are invalidated before
changing keys. A pending key change can be reconciled after an uncertain chain response.

Master-key rotation requires re-encrypting every record with its existing key first;
replacing the master environment value alone loses recovery access. Do not delete the
master or recovery records while those accounts are in use. This remains the partial
custody model accepted in decision 0004, scoped to testnet.
