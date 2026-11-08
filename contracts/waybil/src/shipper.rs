//! Shippers, their driver network and their destinations (docs/specs/contract.md, Shipper).

use crate::events::emit;
use crate::{Contract, ContractExt, key};
use near_sdk::json_types::{U64, U128};
use near_sdk::serde_json::json;
use near_sdk::{AccountId, env, near, require};

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, PartialEq)]
pub struct Shipper {
    /// Most the shipper can owe at once (bills not yet repaid).
    pub limit: U128,
    /// Bills whose driver was already paid and that are not repaid yet.
    pub owed: U128,
    /// Bills approved but not paid out yet (waiting for pickup or delivery).
    pub committed: U128,
    /// Reason, when the team paused new shipments.
    pub paused: Option<String>,
    pub late_bills: u32,
    /// The assistant can't change this shipper's limit before this time.
    pub blocked_until: U64,
    /// Start of the current 7-day raise window and the limit at that start.
    pub raise_window_start: U64,
    pub raise_window_base: U128,
}

impl Shipper {
    pub(crate) fn started(limit: u128, now: u64) -> Self {
        Self {
            limit: U128(limit),
            owed: U128(0),
            committed: U128(0),
            paused: None,
            late_bills: 0,
            blocked_until: U64(0),
            raise_window_start: U64(now),
            raise_window_base: U128(limit),
        }
    }
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, PartialEq)]
pub struct Destination {
    pub id: u32,
    pub shipper: AccountId,
    pub warehouse: AccountId,
}

/// A shipper's drivers and destinations, for the Network screen.
#[near(serializers = [json])]
pub struct Network {
    pub drivers: Vec<AccountId>,
    pub destinations: Vec<Destination>,
}

#[near]
impl Contract {
    /// Adds a driver to the caller's network, after the driver accepted an invite.
    pub fn add_driver(&mut self, driver: AccountId) {
        let shipper = env::predecessor_account_id();
        self.shipper_or_panic(&shipper);
        require!(driver != shipper, "E_SELF");
        let pair = (shipper.clone(), driver.clone());
        require!(!self.network.contains(&pair), "E_ALREADY_IN_NETWORK");
        self.network.insert(pair);
        self.driver_list.push(&key("s", &shipper), driver.clone());
        emit(
            "driver_added",
            json!({ "shipper": shipper, "driver": driver }),
        );
    }

    /// Links a receiving warehouse account to the caller. Returns the destination id.
    pub fn add_destination(&mut self, warehouse: AccountId) -> u32 {
        let shipper = env::predecessor_account_id();
        self.shipper_or_panic(&shipper);
        require!(warehouse != shipper, "E_SELF");
        let id = self.next_destination;
        self.next_destination += 1;
        self.destinations.insert(
            id,
            Destination {
                id,
                shipper: shipper.clone(),
                warehouse: warehouse.clone(),
            },
        );
        self.destination_list.push(&key("s", &shipper), id);
        emit(
            "destination_added",
            json!({ "id": id, "shipper": shipper, "warehouse": warehouse }),
        );
        id
    }
}
