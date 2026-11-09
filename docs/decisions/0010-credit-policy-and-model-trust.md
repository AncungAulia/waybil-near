# 0010: Explicit credit policy and model signer trust

- Status: accepted for testnet implementation
- Date: 2026-11-09

The team has not selected a credit formula. No default coefficient, currency conversion or
automatic limit change is enabled. Operators must supply the versioned policy described in
the API spec and explicitly enable automation. The assistant extracts narrow evidence;
deterministic server code calculates a recommendation and the contract enforces its caps.
Starting limits always need team approval. Unclear papers produce no starting limit.

The current official inference SDK requires Node.js 24, while this project targets Node.js
22. Use the gateway REST API and explicit Ed25519 model signing-key pins that an operator
has independently verified with official hardware-verification tooling. Pins include an
expiry and exact model ID. Require matching fresh preflight references and exact-byte
provider_tee signatures before accepting inference output. No key is learned automatically.

Proof metadata calls this `pinned_model_signer`. It is not fresh hardware attestation
verification by this backend. Preserve real attestation evidence for review. Gateway-only,
ambiguous, expired or missing signer evidence is a failed review and cannot authorize a
write. A later runtime upgrade may replace the explicit pin policy with the full verifier;
do not silently broaden the current trust policy or substitute an incognito external model.
