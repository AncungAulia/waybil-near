//! Team proposals and votes, 2 of 3 (docs/specs/contract.md, Team; decisions 0002 and 0004).

use crate::events::emit;
use crate::{Contract, ContractExt, DAY_NS, Shipper};
use near_sdk::json_types::{U64, U128};
use near_sdk::serde_json::json;
use near_sdk::{AccountId, env, near, require};

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

    /// Records one vote and resolves the proposal when it reaches 2 of 3.
    fn cast(&mut self, id: u64, member: AccountId, approve: bool) -> ProposalStatus {
        let mut p = self
            .proposals
            .get(&id)
            .cloned()
            .unwrap_or_else(|| env::panic_str("E_NO_PROPOSAL"));
        require!(p.status == ProposalStatus::Open, "E_PROPOSAL_CLOSED");
        let now = Self::now();
        let ttl = self.config.proposal_ttl_days as u64 * DAY_NS;
        if now > p.created_at.0 + ttl {
            p.status = ProposalStatus::Expired;
            self.proposals.insert(id, p);
            emit(
                "proposal_resolved",
                json!({ "id": id, "status": "Expired" }),
            );
            return ProposalStatus::Expired;
        }
        require!(
            !p.approvals.contains(&member) && !p.rejections.contains(&member),
            "E_ALREADY_VOTED"
        );
        if approve {
            p.approvals.push(member.clone());
        } else {
            p.rejections.push(member.clone());
        }
        emit(
            "vote_cast",
            json!({ "id": id, "member": member, "approve": approve }),
        );

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
        }
    }
}
