//! Read-only views (docs/specs/contract.md, Views).

use crate::{
    Config, Contract, ContractExt, Destination, InvestorView, Network, Pool, Proposal,
    ProposalStatus, Shipment, Shipper, key,
};
use near_sdk::json_types::U128;
use near_sdk::{AccountId, near};

const MAX_PAGE: u32 = 50;

#[near]
impl Contract {
    pub fn get_config(&self) -> Config {
        self.config.clone()
    }

    pub fn get_team(&self) -> Vec<AccountId> {
        self.team.clone()
    }

    pub fn is_member(&self, account_id: AccountId) -> bool {
        self.is_team_member(&account_id)
    }

    pub fn get_pool(&self) -> Pool {
        self.pool.clone()
    }

    pub fn get_shipper(&self, account_id: AccountId) -> Option<Shipper> {
        self.shippers.get(&account_id).cloned()
    }

    pub fn get_network(&self, account_id: AccountId) -> Network {
        let k = key("s", &account_id);
        let drivers = self.driver_list.page(&k, 0, u32::MAX);
        let destinations = self
            .destination_list
            .page(&k, 0, u32::MAX)
            .into_iter()
            .filter_map(|id| self.destinations.get(&id).cloned())
            .collect();
        Network {
            drivers,
            destinations,
        }
    }

    pub fn get_destination(&self, id: u32) -> Option<Destination> {
        self.destinations.get(&id).cloned()
    }

    pub fn get_shipment(&self, id: u64) -> Option<Shipment> {
        self.shipments.get(&id).cloned()
    }

    pub fn list_shipments_by_shipper(
        &self,
        account_id: AccountId,
        from: Option<u32>,
        limit: Option<u32>,
    ) -> Vec<Shipment> {
        let ids = self
            .by_shipper
            .page(&key("s", &account_id), from.unwrap_or(0), page(limit));
        self.load(ids)
    }

    pub fn list_shipments_by_driver(
        &self,
        account_id: AccountId,
        from: Option<u32>,
        limit: Option<u32>,
    ) -> Vec<Shipment> {
        let ids = self
            .by_driver
            .page(&key("d", &account_id), from.unwrap_or(0), page(limit));
        self.load(ids)
    }

    pub fn list_shipments_by_destination(
        &self,
        destination: u32,
        from: Option<u32>,
        limit: Option<u32>,
    ) -> Vec<Shipment> {
        let ids =
            self.by_destination
                .page(&format!("w:{destination}"), from.unwrap_or(0), page(limit));
        self.load(ids)
    }

    pub fn get_investor(&self, account_id: AccountId) -> InvestorView {
        let shares = self.investors.get(&account_id).map(|s| s.0).unwrap_or(0);
        InvestorView {
            shares: U128(shares),
            value: U128(self.shares_value(shares)),
        }
    }

    pub fn get_proposal(&self, id: u64) -> Option<Proposal> {
        self.proposals.get(&id).cloned()
    }

    /// Newest first. `status` filters by status when given.
    pub fn list_proposals(
        &self,
        status: Option<ProposalStatus>,
        limit: Option<u32>,
    ) -> Vec<Proposal> {
        let mut out: Vec<Proposal> = (1..self.next_proposal)
            .rev()
            .filter_map(|id| self.proposals.get(&id).cloned())
            .filter(|p| status.is_none_or(|s| p.status == s))
            .take(page(limit) as usize)
            .collect();
        out.shrink_to_fit();
        out
    }
}

impl Contract {
    fn load(&self, ids: Vec<u64>) -> Vec<Shipment> {
        ids.into_iter()
            .filter_map(|id| self.shipments.get(&id).cloned())
            .collect()
    }
}

fn page(limit: Option<u32>) -> u32 {
    limit.unwrap_or(MAX_PAGE).min(MAX_PAGE)
}
