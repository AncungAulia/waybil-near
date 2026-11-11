//! Team proposals and votes, 2 of 3 (docs/specs/contract.md, Team; decisions 0002 and 0004).

use crate::events::emit;
use crate::{Contract, ContractExt, DAY_NS, Shipper};
use near_sdk::json_types::{Base58CryptoHash, U64, U128};
use near_sdk::serde_json::json;
use near_sdk::{
    AccountId, CryptoHash, Gas, NearToken, Promise, PromiseOrValue, env, near, require,
};

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, PartialEq)]
pub enum ProposalKind {
    /// First limit for a new shipper.
    StartShipper {
        shipper: AccountId,
        limit: U128,
    },
    SetLimit {
        shipper: AccountId,
        limit: U128,
    },
    Unpause {
        shipper: AccountId,
    },
    /// The reserve covers a bill still unpaid `reserve_cover_after_days` after its due date.
    CoverFromReserve {
        shipment_id: u64,
    },
    /// Replace the contract code with the wasm whose sha256 is `code_hash`.
    /// The second approval comes with the code through `approve_upgrade` (decision 0012).
    /// Keep this the last variant: stored proposals depend on the variant order.
    Upgrade {
        code_hash: Base58CryptoHash,
    },
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ProposalStatus {
    Open,
    Approved,
    Rejected,
    Expired,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, PartialEq)]
pub struct Proposal {
    pub id: u64,
    pub kind: ProposalKind,
    pub by: AccountId,
    /// Suggested by the credit assistant (a rejection starts its cooldown).
    pub from_assistant: bool,
    pub created_at: U64,
    pub approvals: Vec<AccountId>,
    pub rejections: Vec<AccountId>,
    pub status: ProposalStatus,
}

/// Votes needed to approve or reject.
pub const QUORUM: usize = 2;

/// Raw storage key for the hash of the code an approved upgrade is deploying.
/// `migrate` in the new code moves it to `CODE_HASH_KEY`. Raw keys leave the state struct
/// unchanged, so the stored state stays readable by older and newer code.
pub(crate) const CODE_HASH_PENDING_KEY: &[u8] = b"code_hash_pending";
/// Raw storage key for the hash of the current code, written by `migrate`.
pub(crate) const CODE_HASH_KEY: &[u8] = b"code_hash";
/// Gas for `migrate` in the new code, in the same batch as the deploy.
const GAS_MIGRATE: Gas = Gas::from_tgas(100);

#[near]
impl Contract {
    /// A team member proposes a change. Their proposal counts as their approval.
    pub fn propose(&mut self, kind: ProposalKind) -> u64 {
        let by = self.assert_team_member();
        self.check_kind(&kind);
        let id = self.create_proposal(kind, by.clone(), false);
        self.cast(id, by, true);
        id
    }

    /// Approve or reject an open proposal. Returns the new status.
    /// A vote on an expired proposal closes it as `Expired` instead of failing.
    pub fn vote(&mut self, id: u64, approve: bool) -> ProposalStatus {
        let member = self.assert_team_member();
        self.cast(id, member, approve)
    }

    /// Second approval of an `Upgrade` proposal, sent with the new code (decision 0012).
    /// The input is borsh `(id: u64, code: Vec<u8>)`, not JSON, so the wasm travels as bytes.
    /// At 2 of 3 the contract deploys the code to itself and calls `migrate` in one batch,
    /// and returns that batch. If `migrate` fails the batch rolls back and the old code stays.
    /// A call on an expired proposal closes it as `Expired` instead of failing.
    pub fn approve_upgrade(
        &mut self,
        #[serializer(borsh)] id: u64,
        #[serializer(borsh)] code: Vec<u8>,
    ) -> PromiseOrValue<ProposalStatus> {
        let member = self.assert_team_member();
        let Some(mut p) = self.open_for_vote(id, &member) else {
            return PromiseOrValue::Value(ProposalStatus::Expired);
        };
        let code_hash = match &p.kind {
            ProposalKind::Upgrade { code_hash } => *code_hash,
            _ => env::panic_str("E_NOT_UPGRADE"),
        };
        let hash = CryptoHash::from(code_hash);
        require!(env::sha256_array(&code) == hash, "E_CODE_HASH");
        Self::record_vote(&mut p, member, true);
        if p.approvals.len() < QUORUM {
            self.proposals.insert(id, p);
            return PromiseOrValue::Value(ProposalStatus::Open);
        }
        p.status = ProposalStatus::Approved;
        self.proposals.insert(id, p);
        emit(
            "proposal_resolved",
            json!({ "id": id, "status": ProposalStatus::Approved }),
        );
        emit(
            "upgrade_approved",
            json!({ "id": id, "code_hash": code_hash }),
        );
        env::storage_write(CODE_HASH_PENDING_KEY, &hash);
        PromiseOrValue::Promise(
            Promise::new(env::current_account_id())
                .deploy_contract(code)
                .function_call(
                    "migrate".to_string(),
                    b"{}".to_vec(),
                    NearToken::from_yoctonear(0),
                    GAS_MIGRATE,
                ),
        )
    }

    /// Emergency brake: any one member stops a shipper's new shipments at once.
    /// Turning it back on needs a 2-of-3 `Unpause` proposal.
    pub fn pause_shipper(&mut self, shipper: AccountId, reason: String) {
        let by = self.assert_team_member();
        require!(
            !reason.trim().is_empty() && reason.len() <= 280,
            "E_BAD_REASON"
        );
        let mut s = self.shipper_or_panic(&shipper);
        require!(s.paused.is_none(), "E_ALREADY_PAUSED");
        s.paused = Some(reason.clone());
        self.shippers.insert(shipper.clone(), s);
        emit(
            "shipper_paused",
            json!({ "shipper": shipper, "by": by, "reason": reason }),
        );
    }
}

impl Contract {
    pub(crate) fn check_kind(&self, kind: &ProposalKind) {
        match kind {
            ProposalKind::StartShipper { shipper, limit } => {
                require!(!self.shippers.contains_key(shipper), "E_ALREADY_SHIPPER");
                require!(limit.0 > 0, "E_ZERO_AMOUNT");
            }
            ProposalKind::SetLimit { shipper, .. } => {
                self.shipper_or_panic(shipper);
            }
            ProposalKind::Unpause { shipper } => {
                require!(
                    self.shipper_or_panic(shipper).paused.is_some(),
                    "E_NOT_PAUSED"
                );
            }
            ProposalKind::CoverFromReserve { shipment_id } => {
                let s = self.shipment_or_panic(*shipment_id);
                require!(s.status == crate::Status::Paid, "E_WRONG_STATUS");
                let wait = self.config.reserve_cover_after_days as u64 * DAY_NS;
                require!(Self::now() > s.due_at.0 + wait, "E_TOO_EARLY");
            }
            // The hash is 32 bytes by type. Members check it against a reproducible build.
            ProposalKind::Upgrade { .. } => {}
        }
    }

    pub(crate) fn create_proposal(
        &mut self,
        kind: ProposalKind,
        by: AccountId,
        from_assistant: bool,
    ) -> u64 {
        let id = self.next_proposal;
        self.next_proposal += 1;
        self.proposals.insert(
            id,
            Proposal {
                id,
                kind: kind.clone(),
                by: by.clone(),
                from_assistant,
                created_at: U64(Self::now()),
                approvals: vec![],
                rejections: vec![],
                status: ProposalStatus::Open,
            },
        );
        emit(
            "proposal_created",
            json!({ "id": id, "kind": kind, "by": by, "from_assistant": from_assistant }),
        );
        id
    }

    /// Loads an open proposal that `member` may still vote on. An expired one is closed as
    /// `Expired` and `None` is returned, so the caller returns instead of failing.
    fn open_for_vote(&mut self, id: u64, member: &AccountId) -> Option<Proposal> {
        let mut p = self
            .proposals
            .get(&id)
            .cloned()
            .unwrap_or_else(|| env::panic_str("E_NO_PROPOSAL"));
        require!(p.status == ProposalStatus::Open, "E_PROPOSAL_CLOSED");
        let ttl = self.config.proposal_ttl_days as u64 * DAY_NS;
        if Self::now() > p.created_at.0 + ttl {
            p.status = ProposalStatus::Expired;
            self.proposals.insert(id, p);
            emit(
                "proposal_resolved",
                json!({ "id": id, "status": "Expired" }),
            );
            return None;
        }
        require!(
            !p.approvals.contains(member) && !p.rejections.contains(member),
            "E_ALREADY_VOTED"
        );
        Some(p)
    }

    fn record_vote(p: &mut Proposal, member: AccountId, approve: bool) {
        emit(
            "vote_cast",
            json!({ "id": p.id, "member": member, "approve": approve }),
        );
        if approve {
            p.approvals.push(member);
        } else {
            p.rejections.push(member);
        }
    }

    /// Records one vote and resolves the proposal when it reaches 2 of 3.
    fn cast(&mut self, id: u64, member: AccountId, approve: bool) -> ProposalStatus {
        let Some(mut p) = self.open_for_vote(id, &member) else {
            return ProposalStatus::Expired;
        };
        // The approval that deploys an upgrade must carry the code.
        if approve && matches!(p.kind, ProposalKind::Upgrade { .. }) {
            require!(p.approvals.len() + 1 < QUORUM, "E_USE_APPROVE_UPGRADE");
        }
        Self::record_vote(&mut p, member, approve);
        let now = Self::now();

        if p.approvals.len() >= QUORUM {
            // Re-check: the state may have changed since the proposal was made.
            self.check_kind(&p.kind);
            self.execute(&p.kind);
            p.status = ProposalStatus::Approved;
        } else if p.rejections.len() >= QUORUM {
            p.status = ProposalStatus::Rejected;
            // A rejected assistant suggestion blocks the assistant for this shipper.
            if p.from_assistant
                && let ProposalKind::SetLimit { shipper, .. } = &p.kind
                && let Some(mut s) = self.shippers.get(shipper).cloned()
            {
                let cooldown = self.config.reject_cooldown_days as u64 * DAY_NS;
                s.blocked_until = U64(now + cooldown);
                self.shippers.insert(shipper.clone(), s);
            }
        }
        let status = p.status;
        self.proposals.insert(id, p);
        if status != ProposalStatus::Open {
            emit("proposal_resolved", json!({ "id": id, "status": status }));
        }
        status
    }

    fn execute(&mut self, kind: &ProposalKind) {
        let now = Self::now();
        match kind {
            ProposalKind::StartShipper { shipper, limit } => {
                self.shippers
                    .insert(shipper.clone(), Shipper::started(limit.0, now));
                emit(
                    "shipper_started",
                    json!({ "shipper": shipper, "limit": limit }),
                );
            }
            ProposalKind::SetLimit { shipper, limit } => {
                let mut s = self.shipper_or_panic(shipper);
                s.limit = *limit;
                s.raise_window_start = U64(now);
                s.raise_window_base = *limit;
                self.shippers.insert(shipper.clone(), s);
                emit(
                    "limit_changed",
                    json!({ "shipper": shipper, "limit": limit, "by": "team" }),
                );
            }
            ProposalKind::Unpause { shipper } => {
                let mut s = self.shipper_or_panic(shipper);
                s.paused = None;
                self.shippers.insert(shipper.clone(), s);
                emit("shipper_unpaused", json!({ "shipper": shipper }));
            }
            ProposalKind::CoverFromReserve { shipment_id } => self.cover_from_reserve(*shipment_id),
            // Never runs: `cast` sends the deciding approval of an upgrade to `approve_upgrade`.
            ProposalKind::Upgrade { .. } => env::panic_str("E_USE_APPROVE_UPGRADE"),
        }
    }

    /// Writes off an unpaid bill. The reserve pays back the advance as far as it can;
    /// anything the reserve can't cover is a loss shared by the pool.
    fn cover_from_reserve(&mut self, id: u64) {
        let mut s = self.shipment_or_panic(id);
        let advance = s.advance.0;
        let covered = advance.min(self.pool.reserve.0);
        self.pool.reserve = U128(self.pool.reserve.0 - covered);
        self.pool.lent = U128(self.pool.lent.0 - advance);
        self.pool.cash = U128(self.pool.cash.0 + covered);

        let mut shipper = self.shipper_or_panic(&s.shipper);
        shipper.owed = U128(shipper.owed.0 - s.bill.0);
        if s.marked_late {
            shipper.late_bills = shipper.late_bills.saturating_sub(1);
        }
        // The company still owes the money off-chain, so it stays paused.
        if shipper.paused.is_none() {
            shipper.paused = Some("Bill covered by the reserve".into());
        }
        self.shippers.insert(s.shipper.clone(), shipper);

        s.status = crate::Status::CoveredByReserve;
        s.marked_late = false;
        self.shipments.insert(id, s);
        emit(
            "reserve_cover",
            json!({ "id": id, "covered": U128(covered), "loss": U128(advance - covered) }),
        );
        self.pay_queue(10);
    }
}
