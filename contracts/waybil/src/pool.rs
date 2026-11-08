//! The investor pool: deposits now, withdrawals and repayments in a later PR
//! (docs/specs/contract.md, Investor).

use crate::events::emit;
use crate::{Contract, ContractExt};
use near_sdk::json_types::U128;
use near_sdk::serde_json::json;
use near_sdk::{AccountId, PromiseOrValue, env, near, require};

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, Default, PartialEq)]
pub struct Pool {
    pub total_shares: U128,
    /// USDC held for the pool, including money set aside for approved shipments.
    pub cash: U128,
    /// Paid out to drivers and not repaid yet.
    pub lent: U128,
    /// Set aside from fees to cover unpaid bills. Not part of the pool value.
    pub reserve: U128,
    /// Part of `cash` promised to approved shipments that are not paid out yet.
    pub committed: U128,
}

#[near(serializers = [json])]
pub struct InvestorView {
    pub shares: U128,
    pub value: U128,
}

impl Contract {
    /// What the pool is worth: cash plus money lent out.
    pub(crate) fn pool_value(&self) -> u128 {
        self.pool.cash.0 + self.pool.lent.0
    }

    /// Cash that can pay new advances or withdrawals.
    pub(crate) fn free_cash(&self) -> u128 {
        self.pool.cash.0 - self.pool.committed.0
    }

    pub(crate) fn shares_value(&self, shares: u128) -> u128 {
        if self.pool.total_shares.0 == 0 {
            return 0;
        }
        shares * self.pool_value() / self.pool.total_shares.0
    }

    fn deposit(&mut self, investor: &AccountId, amount: u128) {
        let value = self.pool_value();
        let shares = if self.pool.total_shares.0 == 0 {
            amount
        } else {
            require!(value > 0, "E_POOL_EMPTY");
            amount * self.pool.total_shares.0 / value
        };
        require!(shares > 0, "E_ZERO_SHARES");
        let before = self.investors.get(investor).map(|s| s.0).unwrap_or(0);
        self.investors
            .insert(investor.clone(), U128(before + shares));
        self.pool.total_shares = U128(self.pool.total_shares.0 + shares);
        self.pool.cash = U128(self.pool.cash.0 + amount);
        emit(
            "deposited",
            json!({ "investor": investor, "amount": U128(amount), "shares": U128(shares) }),
        );
    }
}

#[near]
impl Contract {
    /// NEP-141 receiver. Only test USDC is accepted.
    /// `msg` is `"deposit"` for investors. Repayments are added with the repay flow.
    pub fn ft_on_transfer(
        &mut self,
        sender_id: AccountId,
        amount: U128,
        msg: String,
    ) -> PromiseOrValue<U128> {
        require!(env::predecessor_account_id() == self.usdc, "E_WRONG_TOKEN");
        require!(amount.0 > 0, "E_ZERO_AMOUNT");
        match msg.as_str() {
            "deposit" => self.deposit(&sender_id, amount.0),
            _ => env::panic_str("E_BAD_MSG"),
        }
        PromiseOrValue::Value(U128(0))
    }
}
