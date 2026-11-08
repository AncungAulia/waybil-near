//! Credit assistant limits (docs/specs/contract.md, Credit assistant; decision 0002).
//! Within the caps the assistant acts alone. Anything bigger becomes a team proposal.

use crate::events::emit;
use crate::{BPS, Contract, ContractExt, DAY_NS, ProposalKind};
use near_sdk::json_types::{U64, U128};
use near_sdk::serde_json::json;
use near_sdk::{AccountId, env, near, require};

#[near]
impl Contract {
    /// Sets a limit within the caps: never above `max_limit`, and at most
    /// `assistant_raise_bps` higher than the limit at the start of the 7-day window.
    /// Lowering is always allowed.
    pub fn assistant_set_limit(&mut self, shipper: AccountId, limit: U128) {
        self.assert_assistant();
        let now = Self::now();
        let mut s = self.shipper_or_panic(&shipper);
        require!(now >= s.blocked_until.0, "E_ASSISTANT_COOLDOWN");
        require!(limit.0 <= self.config.max_limit.0, "E_OVER_MAX_LIMIT");
        if limit.0 > s.limit.0 {
            if now >= s.raise_window_start.0 + 7 * DAY_NS {
                s.raise_window_start = U64(now);
                s.raise_window_base = s.limit;
            }
            let cap = s.raise_window_base.0 * (BPS + self.config.assistant_raise_bps as u128) / BPS;
            require!(limit.0 <= cap, "E_OVER_WEEKLY_RAISE");
        }
        s.limit = limit;
        self.shippers.insert(shipper.clone(), s);
        emit(
            "limit_changed",
            json!({ "shipper": shipper, "limit": limit, "by": "assistant" }),
        );
    }

    /// Suggests a limit change the assistant can't make alone. The team votes on it.
    pub fn assistant_propose(&mut self, shipper: AccountId, limit: U128) -> u64 {
        let assistant = self.assert_assistant();
        let s = self.shipper_or_panic(&shipper);
        require!(Self::now() >= s.blocked_until.0, "E_ASSISTANT_COOLDOWN");
        require!(limit.0 != s.limit.0, "E_NO_CHANGE");
        self.create_proposal(ProposalKind::SetLimit { shipper, limit }, assistant, true)
    }
}

impl Contract {
    fn assert_assistant(&self) -> AccountId {
        let caller = env::predecessor_account_id();
        require!(caller == self.assistant, "E_NOT_ASSISTANT");
        caller
    }
}
