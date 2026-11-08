//! Waybil: pays truck drivers the moment a warehouse confirms delivery,
//! financed by an investor pool, with credit limits approved by a team of three.
//!
//! The rules come from `docs/specs/contract.md` and the decision records in
//! `docs/decisions/`. Change the spec before the code.

use near_sdk::json_types::U128;
use near_sdk::store::{IterableMap, LookupMap, LookupSet};
use near_sdk::{AccountId, BorshStorageKey, Gas, PanicOnDefault, env, ext_contract, near, require};

mod assistant;
mod callbacks;
mod events;
mod index;
mod pool;
mod shipment;
mod shipper;
mod team;
mod views;

#[cfg(test)]
mod tests;
#[cfg(test)]
mod tests_money;

pub use index::Index;
pub use pool::{InvestorView, Pool, QueueEntry};
pub use shipment::{Shipment, Status};
pub use shipper::{Destination, Network, Shipper};
pub use team::{Proposal, ProposalKind, ProposalStatus};

/// One day in nanoseconds.
pub const DAY_NS: u64 = 86_400 * 1_000_000_000;
/// 100% in basis points.
pub const BPS: u128 = 10_000;
/// Version of the stored state. Bump it with every migration.
pub const STATE_VERSION: u16 = 1;

pub(crate) const GAS_FT_TRANSFER: Gas = Gas::from_tgas(10);
pub(crate) const GAS_CALLBACK: Gas = Gas::from_tgas(10);

#[ext_contract(ext_ft)]
pub trait FungibleToken {
    fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>);
}

/// Rules the team can change by proposal later. Defaults follow decisions 0002 and 0003.
#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, PartialEq)]
pub struct Config {
    pub driver_bps: u16,
    pub pool_bps: u16,
    pub reserve_bps: u16,
    pub waybil_bps: u16,
    /// Highest limit the credit assistant may set on its own.
    pub max_limit: U128,
    /// Most the assistant may raise a limit within 7 days.
    pub assistant_raise_bps: u16,
    /// Biggest single bill compared to the pool value.
    pub max_share_bps: u16,
    pub max_due_days: u32,
    pub reserve_cover_after_days: u32,
    pub proposal_ttl_days: u32,
    pub reject_cooldown_days: u32,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            driver_bps: 9_750,
            pool_bps: 160,
            reserve_bps: 40,
            waybil_bps: 50,
            max_limit: U128(10_000 * 1_000_000),
            assistant_raise_bps: 2_000,
            max_share_bps: 2_500,
            max_due_days: 60,
            reserve_cover_after_days: 14,
            proposal_ttl_days: 7,
            reject_cooldown_days: 7,
        }
    }
}

#[derive(BorshStorageKey)]
#[near]
pub(crate) enum StorageKey {
    Shippers,
    NetworkPairs,
    DriverListCount,
    DriverListItems,
    Destinations,
    DestinationListCount,
    DestinationListItems,
    Shipments,
    ByShipperCount,
    ByShipperItems,
    ByDriverCount,
    ByDriverItems,
    ByDestinationCount,
    ByDestinationItems,
    Investors,
    Proposals,
    WithdrawQueue,
    InvestorQueued,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    pub(crate) version: u16,
    pub(crate) usdc: AccountId,
    pub(crate) assistant: AccountId,
    pub(crate) treasury: AccountId,
    pub(crate) team: Vec<AccountId>,
    pub(crate) config: Config,

    pub(crate) shippers: LookupMap<AccountId, Shipper>,
    /// (shipper, driver) pairs in a shipper's network.
    pub(crate) network: LookupSet<(AccountId, AccountId)>,
    pub(crate) driver_list: Index<AccountId>,
    pub(crate) destinations: LookupMap<u32, Destination>,
    pub(crate) destination_list: Index<u32>,
    pub(crate) next_destination: u32,

    pub(crate) shipments: LookupMap<u64, Shipment>,
    pub(crate) by_shipper: Index<u64>,
    pub(crate) by_driver: Index<u64>,
    pub(crate) by_destination: Index<u64>,
    pub(crate) next_shipment: u64,

    pub(crate) pool: Pool,
    /// Pool shares per investor.
    pub(crate) investors: LookupMap<AccountId, U128>,
    /// Withdrawals waiting for cash, oldest at `queue_head`. Positions `queue_head..queue_tail`.
    pub(crate) queue: LookupMap<u64, QueueEntry>,
    pub(crate) queue_head: u64,
    pub(crate) queue_tail: u64,
    /// Total still queued per investor.
    pub(crate) investor_queued: LookupMap<AccountId, U128>,

    pub(crate) proposals: IterableMap<u64, Proposal>,
    pub(crate) next_proposal: u64,
}

#[near]
impl Contract {
    /// `team` must be three different accounts. They approve changes 2 of 3.
    #[init]
    pub fn new(
        usdc: AccountId,
        assistant: AccountId,
        treasury: AccountId,
        team: Vec<AccountId>,
    ) -> Self {
        require!(team.len() == 3, "E_TEAM_SIZE");
        require!(
            team[0] != team[1] && team[1] != team[2] && team[0] != team[2],
            "E_TEAM_DUPLICATE"
        );
        Self {
            version: STATE_VERSION,
            usdc,
            assistant,
            treasury,
            team,
            config: Config::default(),
            shippers: LookupMap::new(StorageKey::Shippers),
            network: LookupSet::new(StorageKey::NetworkPairs),
            driver_list: Index::new(StorageKey::DriverListCount, StorageKey::DriverListItems),
            destinations: LookupMap::new(StorageKey::Destinations),
            destination_list: Index::new(
                StorageKey::DestinationListCount,
                StorageKey::DestinationListItems,
            ),
            next_destination: 1,
            shipments: LookupMap::new(StorageKey::Shipments),
            by_shipper: Index::new(StorageKey::ByShipperCount, StorageKey::ByShipperItems),
            by_driver: Index::new(StorageKey::ByDriverCount, StorageKey::ByDriverItems),
            by_destination: Index::new(
                StorageKey::ByDestinationCount,
                StorageKey::ByDestinationItems,
            ),
            next_shipment: 1,
            pool: Pool::default(),
            investors: LookupMap::new(StorageKey::Investors),
            queue: LookupMap::new(StorageKey::WithdrawQueue),
            queue_head: 0,
            queue_tail: 0,
            investor_queued: LookupMap::new(StorageKey::InvestorQueued),
            proposals: IterableMap::new(StorageKey::Proposals),
            next_proposal: 1,
        }
    }
}

impl Contract {
    pub(crate) fn now() -> u64 {
        env::block_timestamp()
    }

    pub(crate) fn is_team_member(&self, account: &AccountId) -> bool {
        self.team.contains(account)
    }

    pub(crate) fn assert_team_member(&self) -> AccountId {
        let caller = env::predecessor_account_id();
        require!(self.is_team_member(&caller), "E_NOT_TEAM");
        caller
    }

    pub(crate) fn shipper_or_panic(&self, account: &AccountId) -> Shipper {
        self.shippers
            .get(account)
            .cloned()
            .unwrap_or_else(|| env::panic_str("E_NOT_SHIPPER"))
    }

    pub(crate) fn shipment_or_panic(&self, id: u64) -> Shipment {
        self.shipments
            .get(&id)
            .cloned()
            .unwrap_or_else(|| env::panic_str("E_NO_SHIPMENT"))
    }

    pub(crate) fn bps_of(amount: u128, bps: u16) -> u128 {
        amount * bps as u128 / BPS
    }
}

/// Short account key for the list indexes.
pub(crate) fn key(prefix: &str, account: &AccountId) -> String {
    format!("{prefix}:{account}")
}
