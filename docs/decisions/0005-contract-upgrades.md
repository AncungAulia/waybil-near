# 0005 — Contract upgrades: deployer key now, team vote before the demo

- Status: accepted
- Date: 2026-11-08

## Context

On NEAR, whoever holds a full-access key to the contract account can deploy new code
and take every token the contract holds. During development we need to redeploy often.
For the demo, the product promise is that no single person can move pool money alone.

## Decision

- **Development:** upgrades use the deployer key on `app.waybil.testnet`.
- **Before the demo:** upgrades need 2 of 3 team members through `ProposalKind::Upgrade`.
  Code is staged first, its hash is checked against a reproducible build, and the contract
  deploys and migrates itself on the second approval. Then the deployer's full-access key is
  deleted from the contract account.
- **From the first version:** the state is versioned and the contract has a `migrate` method,
  so later upgrades keep existing shipments and pool balances.

Details: `docs/specs/contract.md`, section "Upgrades".

## Consequences

- Switching to team upgrades is a task on the issue list with a fixed date before submission.
- After the key is deleted, a broken contract can only be fixed by a team upgrade, so the
  upgrade path itself must be tested in sandbox before the switch.
- The demo and README can say plainly: the team needs 2 of 3 votes to change the code.
