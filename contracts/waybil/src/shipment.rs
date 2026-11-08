//! Shipments: approve, cancel, pickup, delivery and the automatic payout
//! (docs/specs/contract.md, Shipper, Driver, Warehouse, Payout and callbacks; decision 0003).

use crate::events::emit;
use crate::{Contract, ContractExt, DAY_NS, GAS_CALLBACK, GAS_FT_TRANSFER, ext_ft, key};
use near_sdk::json_types::{U64, U128};
use near_sdk::serde_json::json;
use near_sdk::{AccountId, NearToken, Promise, PromiseOrValue, env, near, require};

#[near(serializers = [json, borsh])]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Status {
    Approved,
    PickedUp,
    Reported,
    Paid,
    Repaid,
    Cancelled,
    CoveredByReserve,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, PartialEq)]
pub struct Shipment {
    pub id: u64,
    pub shipper: AccountId,
    pub driver: AccountId,
    pub destination: u32,
    /// Cargo as a number and a free-text unit ("boxes", "kg", "pallets").
    pub qty: u32,
    pub unit: String,
    /// What the shipper owes the pool.
    pub bill: U128,
    /// What the driver gets on arrival (bill × driver_bps).
    pub advance: U128,
    pub due_at: U64,
    pub status: Status,
    pub approved_at: U64,
    pub picked_up_at: Option<U64>,
    pub arrived_at: Option<U64>,
    pub good_qty: Option<u32>,
    /// sha256 of the warehouse report and photo hashes, when there is a problem.
    pub report_hash: Option<String>,
    pub paid_at: Option<U64>,
    pub repaid_at: Option<U64>,
}

#[near]
impl Contract {
    /// The shipper approves a trip. Locks the fee and due date and sets the advance aside.
    pub fn create_shipment(
        &mut self,
        driver: AccountId,
        destination: u32,
        qty: u32,
        unit: String,
        bill: U128,
        due_at: U64,
    ) -> u64 {
        let shipper_id = env::predecessor_account_id();
        let now = Self::now();
        let mut shipper = self.shipper_or_panic(&shipper_id);
        require!(shipper.paused.is_none(), "E_PAUSED");
        require!(shipper.late_bills == 0, "E_LATE_BILL");
        require!(
            self.network.contains(&(shipper_id.clone(), driver.clone())),
            "E_DRIVER_NOT_IN_NETWORK"
        );
        let dest = self
            .destinations
            .get(&destination)
            .cloned()
            .unwrap_or_else(|| env::panic_str("E_NO_DESTINATION"));
        require!(dest.shipper == shipper_id, "E_NOT_YOUR_DESTINATION");
        require!(qty > 0, "E_BAD_QTY");
        require!(!unit.trim().is_empty() && unit.len() <= 32, "E_BAD_UNIT");
        require!(bill.0 > 0, "E_ZERO_AMOUNT");
        let max_due = now + self.config.max_due_days as u64 * DAY_NS;
        require!(due_at.0 > now && due_at.0 <= max_due, "E_BAD_DUE_DATE");
        require!(
            shipper.owed.0 + shipper.committed.0 + bill.0 <= shipper.limit.0,
            "E_OVER_LIMIT"
        );
        let value = self.pool_value();
        require!(value > 0, "E_POOL_EMPTY");
        require!(
            bill.0 * crate::BPS <= value * self.config.max_share_bps as u128,
            "E_OVER_POOL_SHARE"
        );
        let advance = Self::bps_of(bill.0, self.config.driver_bps);
        require!(self.free_cash() >= advance, "E_POOL_BUSY");

        let id = self.next_shipment;
        self.next_shipment += 1;
        self.pool.committed = U128(self.pool.committed.0 + advance);
        shipper.committed = U128(shipper.committed.0 + bill.0);
        self.shippers.insert(shipper_id.clone(), shipper);

        let shipment = Shipment {
            id,
            shipper: shipper_id.clone(),
            driver: driver.clone(),
            destination,
            qty,
            unit,
            bill,
            advance: U128(advance),
            due_at,
            status: crate::Status::Approved,
            approved_at: U64(now),
            picked_up_at: None,
            arrived_at: None,
            good_qty: None,
            report_hash: None,
            paid_at: None,
            repaid_at: None,
        };
        self.shipments.insert(id, shipment);
        self.by_shipper.push(&key("s", &shipper_id), id);
        self.by_driver.push(&key("d", &driver), id);
        self.by_destination.push(&format!("w:{destination}"), id);
        emit(
            "shipment_created",
            json!({
                "id": id, "shipper": shipper_id, "driver": driver, "destination": destination,
                "bill": bill, "advance": U128(advance), "due_at": due_at,
            }),
        );
        id
    }

    /// The shipper cancels before pickup. Nothing was paid, so the limit and pool money free up.
    pub fn cancel_shipment(&mut self, id: u64) {
        let mut s = self.shipment_or_panic(id);
        require!(
            env::predecessor_account_id() == s.shipper,
            "E_NOT_SHIPPER_OF_SHIPMENT"
        );
        require!(s.status == Status::Approved, "E_WRONG_STATUS");
        let mut shipper = self.shipper_or_panic(&s.shipper);
        shipper.committed = U128(shipper.committed.0 - s.bill.0);
        self.pool.committed = U128(self.pool.committed.0 - s.advance.0);
        self.shippers.insert(s.shipper.clone(), shipper);
        s.status = Status::Cancelled;
        self.shipments.insert(id, s);
        emit("shipment_cancelled", json!({ "id": id }));
    }

    /// The driver confirms the load is on the truck.
    pub fn confirm_pickup(&mut self, id: u64) {
        let mut s = self.shipment_or_panic(id);
        require!(env::predecessor_account_id() == s.driver, "E_NOT_DRIVER");
        require!(s.status == Status::Approved, "E_WRONG_STATUS");
        s.status = Status::PickedUp;
        s.picked_up_at = Some(U64(Self::now()));
        self.shipments.insert(id, s);
        emit("pickup_confirmed", json!({ "id": id }));
    }

    /// The destination's warehouse confirms arrival.
    /// Everything good and no report: the driver is paid in the same call.
    /// Otherwise the shipment is `Reported` and the payout waits for the shipper.
    pub fn confirm_delivery(
        &mut self,
        id: u64,
        good_qty: u32,
        report_hash: Option<String>,
    ) -> PromiseOrValue<bool> {
        let mut s = self.shipment_or_panic(id);
        let dest = self
            .destinations
            .get(&s.destination)
            .cloned()
            .unwrap_or_else(|| env::panic_str("E_NO_DESTINATION"));
        require!(
            env::predecessor_account_id() == dest.warehouse,
            "E_NOT_WAREHOUSE"
        );
        require!(s.status == Status::PickedUp, "E_WRONG_STATUS");
        require!(good_qty <= s.qty, "E_BAD_QTY");
        if let Some(h) = &report_hash {
            require!(!h.is_empty() && h.len() <= 128, "E_BAD_REPORT_HASH");
        }
        s.arrived_at = Some(U64(Self::now()));
        s.good_qty = Some(good_qty);
        let clean = good_qty == s.qty && report_hash.is_none();
        s.report_hash = report_hash.clone();
        emit(
            "delivery_confirmed",
            json!({ "id": id, "good_qty": good_qty, "report_hash": report_hash }),
        );
        if clean {
            self.shipments.insert(id, s);
            PromiseOrValue::Promise(self.pay_driver(id, false))
        } else {
            s.status = Status::Reported;
            self.shipments.insert(id, s);
            emit(
                "problem_reported",
                json!({ "id": id, "good_qty": good_qty }),
            );
            PromiseOrValue::Value(false)
        }
    }
}

impl Contract {
    /// Moves money for the advance and sends it. State changes first; `on_payout`
    /// puts it back if the transfer fails.
    pub(crate) fn pay_driver(&mut self, id: u64, from_reported: bool) -> Promise {
        let mut s = self.shipment_or_panic(id);
        let advance = s.advance.0;
        let mut shipper = self.shipper_or_panic(&s.shipper);
        shipper.committed = U128(shipper.committed.0 - s.bill.0);
        shipper.owed = U128(shipper.owed.0 + s.bill.0);
        self.shippers.insert(s.shipper.clone(), shipper);
        self.pool.committed = U128(self.pool.committed.0 - advance);
        self.pool.cash = U128(self.pool.cash.0 - advance);
        self.pool.lent = U128(self.pool.lent.0 + advance);
        s.status = Status::Paid;
        s.paid_at = Some(U64(Self::now()));
        let driver = s.driver.clone();
        self.shipments.insert(id, s);

        ext_ft::ext(self.usdc.clone())
            .with_attached_deposit(NearToken::from_yoctonear(1))
            .with_static_gas(GAS_FT_TRANSFER)
            .ft_transfer(driver, U128(advance), Some(format!("Waybil payout #{id}")))
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(GAS_CALLBACK)
                    .on_payout(id, from_reported),
            )
    }
}
