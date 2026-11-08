//! Private callbacks for token transfers. They never panic: a failed transfer
//! rolls the state back and emits an event instead.

use crate::events::emit;
use crate::{Contract, ContractExt, Status};
use near_sdk::json_types::U128;
use near_sdk::serde_json::json;
use near_sdk::{env, near};

#[near]
impl Contract {
    /// Result of the driver payout. Returns true when the driver got the money.
    #[private]
    pub fn on_payout(&mut self, id: u64, from_reported: bool) -> bool {
        // ft_transfer returns nothing, so a short max length is enough.
        let ok = env::promise_results_count() == 1 && env::promise_result_checked(0, 64).is_ok();
        if ok {
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
}
