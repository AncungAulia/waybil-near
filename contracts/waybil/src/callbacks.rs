//! Private callbacks for token transfers. They never panic: a failed transfer
//! rolls the state back and emits an event instead.

use crate::events::emit;
use crate::{Contract, ContractExt, Status};
use near_sdk::json_types::U128;
use near_sdk::serde_json::json;
use near_sdk::{AccountId, env, near};

#[near]
impl Contract {
    /// Result of the driver payout. Returns true when the driver got the money.
    #[private]
    pub fn on_payout(&mut self, id: u64, from_reported: bool) -> bool {
        if Self::transfer_ok() {
            if let Some(s) = self.shipments.get(&id) {
                emit(
                    "driver_paid",
                    json!({ "id": id, "driver": s.driver, "amount": s.advance }),
                );
            }
            return true;
        }

        let Some(mut s) = self.shipments.get(&id).cloned() else {
            return false;
        };
        let advance = s.advance.0;
        if let Some(mut shipper) = self.shippers.get(&s.shipper).cloned() {
            shipper.owed = U128(shipper.owed.0.saturating_sub(s.bill.0));
            shipper.committed = U128(shipper.committed.0 + s.bill.0);
            self.shippers.insert(s.shipper.clone(), shipper);
        }
        self.pool.lent = U128(self.pool.lent.0.saturating_sub(advance));
        self.pool.cash = U128(self.pool.cash.0 + advance);
        self.pool.committed = U128(self.pool.committed.0 + advance);
        s.status = if from_reported {
            Status::Reported
        } else {
            Status::PickedUp
        };
        s.paid_at = None;
        self.shipments.insert(id, s);
        emit("payout_failed", json!({ "id": id }));
        false
    }

    /// Result of a withdrawal transfer. On failure the money goes back to the end of the
    /// queue, so the investor still gets it later.
    #[private]
    pub fn on_withdraw_sent(&mut self, investor: AccountId, amount: U128) -> bool {
        if Self::transfer_ok() {
            return true;
        }
        self.pool.cash = U128(self.pool.cash.0 + amount.0);
        self.enqueue(&investor, amount.0, Self::now());
        emit(
            "withdraw_failed",
            json!({ "investor": investor, "amount": amount }),
        );
        false
    }

    /// Result of the treasury fee transfer. On failure the fees stay claimable.
    #[private]
    pub fn on_fees_sent(&mut self, amount: U128) -> bool {
        if Self::transfer_ok() {
            emit("fees_claimed", json!({ "amount": amount }));
            return true;
        }
        self.pool.cash = U128(self.pool.cash.0 + amount.0);
        self.pool.fees = U128(self.pool.fees.0 + amount.0);
        false
    }
}

impl Contract {
    /// True when the single promise this callback waits for succeeded.
    /// ft_transfer returns nothing, so a short max length is enough.
    pub(crate) fn transfer_ok() -> bool {
        env::promise_results_count() == 1 && env::promise_result_checked(0, 64).is_ok()
    }
}
