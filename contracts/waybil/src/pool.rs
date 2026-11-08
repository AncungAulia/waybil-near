//! The investor pool: deposits, repayments with the fee split, withdrawals with a queue,
//! and Waybil's fees (docs/specs/contract.md, Investor and Repayment split; decision 0003).

use crate::events::emit;
use crate::{Contract, ContractExt, GAS_CALLBACK, GAS_FT_TRANSFER, Status, ext_ft};
use near_sdk::json_types::{U64, U128};
use near_sdk::serde::Deserialize;
use near_sdk::serde_json::{self, json};
use near_sdk::{AccountId, NearToken, Promise, PromiseOrValue, env, near, require};

/// Most queue entries paid in one call.
const QUEUE_BATCH: u32 = 10;

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, Default, PartialEq)]
pub struct Pool {
    pub total_shares: U128,
    /// USDC the contract holds for the pool. Includes money promised to approved shipments,
    /// money owed to queued withdrawals and Waybil's unclaimed fees.
    pub cash: U128,
    /// Paid out to drivers and not repaid yet.
    pub lent: U128,
    /// Set aside from fees to cover unpaid bills. Kept apart from `cash`.
    pub reserve: U128,
    /// Part of `cash` promised to approved shipments that are not paid out yet.
    pub committed: U128,
    /// Part of `cash` owed to queued withdrawals.
    pub queued: U128,
    /// Part of `cash` that is Waybil's 0.5%, waiting for `claim_fees`.
    pub fees: U128,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, PartialEq)]
pub struct QueueEntry {
    pub investor: AccountId,
    pub amount: U128,
    pub requested_at: U64,
}

#[near(serializers = [json])]
pub struct InvestorView {
    pub shares: U128,
    /// What the shares are worth now.
    pub value: U128,
    /// Withdrawals still waiting in the queue.
    pub queued: U128,
}

#[derive(Deserialize)]
#[serde(crate = "near_sdk::serde")]
struct RepayMsg {
    repay: u64,
}

impl Contract {
    /// What the pool is worth to its investors.
    pub(crate) fn pool_value(&self) -> u128 {
        (self.pool.cash.0 + self.pool.lent.0)
            .saturating_sub(self.pool.queued.0)
            .saturating_sub(self.pool.fees.0)
    }

    /// Cash that can pay new advances or new withdrawals.
    pub(crate) fn free_cash(&self) -> u128 {
        self.pool
            .cash
            .0
            .saturating_sub(self.pool.committed.0)
            .saturating_sub(self.pool.queued.0)
            .saturating_sub(self.pool.fees.0)
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

    /// The shipper pays a bill in full. Splits it and pays the queue from the new cash.
    fn repay(&mut self, shipper: &AccountId, id: u64, amount: u128) {
        let mut s = self.shipment_or_panic(id);
        require!(&s.shipper == shipper, "E_NOT_SHIPPER_OF_SHIPMENT");
        require!(s.status == Status::Paid, "E_WRONG_STATUS");
        require!(amount == s.bill.0, "E_WRONG_AMOUNT");

        let bill = s.bill.0;
        let advance = s.advance.0;
        let pool_fee = Self::bps_of(bill, self.config.pool_bps);
        let waybil_fee = Self::bps_of(bill, self.config.waybil_bps);
        // The reserve gets its share and every rounding leftover.
        let reserve_part = bill - advance - pool_fee - waybil_fee;

        self.pool.lent = U128(self.pool.lent.0 - advance);
        self.pool.cash = U128(self.pool.cash.0 + advance + pool_fee + waybil_fee);
        self.pool.fees = U128(self.pool.fees.0 + waybil_fee);
        self.pool.reserve = U128(self.pool.reserve.0 + reserve_part);

        let mut shipper_state = self.shipper_or_panic(shipper);
        shipper_state.owed = U128(shipper_state.owed.0 - bill);
        if s.marked_late {
            shipper_state.late_bills = shipper_state.late_bills.saturating_sub(1);
        }
        self.shippers.insert(shipper.clone(), shipper_state);

        s.status = Status::Repaid;
        s.repaid_at = Some(U64(Self::now()));
        self.shipments.insert(id, s);
        emit(
            "bill_repaid",
            json!({
                "id": id, "amount": U128(bill), "pool": U128(pool_fee),
                "reserve": U128(reserve_part), "waybil": U128(waybil_fee),
            }),
        );
        self.pay_queue(QUEUE_BATCH);
    }

    pub(crate) fn enqueue(&mut self, investor: &AccountId, amount: u128, requested_at: u64) {
        self.queue.insert(
            self.queue_tail,
            QueueEntry {
                investor: investor.clone(),
                amount: U128(amount),
                requested_at: U64(requested_at),
            },
        );
        self.queue_tail += 1;
        self.pool.queued = U128(self.pool.queued.0 + amount);
        let before = self.investor_queued.get(investor).map(|q| q.0).unwrap_or(0);
        self.investor_queued
            .insert(investor.clone(), U128(before + amount));
    }

    /// Pays queued withdrawals oldest first while cash is free. Partly pays the last one.
    pub(crate) fn pay_queue(&mut self, max: u32) {
        let mut paid = 0;
        while paid < max && self.queue_head < self.queue_tail {
            let available = self
                .pool
                .cash
                .0
                .saturating_sub(self.pool.committed.0)
                .saturating_sub(self.pool.fees.0);
            if available == 0 {
                break;
            }
            let Some(mut entry) = self.queue.get(&self.queue_head).cloned() else {
                self.queue_head += 1;
                continue;
            };
            let pay = entry.amount.0.min(available);
            entry.amount = U128(entry.amount.0 - pay);
            if entry.amount.0 == 0 {
                self.queue.remove(&self.queue_head);
                self.queue_head += 1;
            } else {
                self.queue.insert(self.queue_head, entry.clone());
            }
            self.pool.queued = U128(self.pool.queued.0 - pay);
            let q = self
                .investor_queued
                .get(&entry.investor)
                .map(|q| q.0)
                .unwrap_or(0);
            self.investor_queued
                .insert(entry.investor.clone(), U128(q.saturating_sub(pay)));
            // Detached: the callback puts the money back in the queue if it fails.
            let _ = self.send_withdrawal(&entry.investor, pay);
            paid += 1;
        }
    }

    /// Takes `amount` out of the pool cash and sends it to the investor.
    fn send_withdrawal(&mut self, investor: &AccountId, amount: u128) -> Promise {
        self.pool.cash = U128(self.pool.cash.0 - amount);
        emit(
            "withdraw_paid",
            json!({ "investor": investor, "amount": U128(amount) }),
        );
        ext_ft::ext(self.usdc.clone())
            .with_attached_deposit(NearToken::from_yoctonear(1))
            .with_static_gas(GAS_FT_TRANSFER)
            .ft_transfer(
                investor.clone(),
                U128(amount),
                Some("Waybil withdrawal".into()),
            )
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(GAS_CALLBACK)
                    .on_withdraw_sent(investor.clone(), U128(amount)),
            )
    }
}

#[near]
impl Contract {
    /// NEP-141 receiver. Only test USDC is accepted.
    /// `msg` is `"deposit"` for investors, or `{"repay": <shipment id>}` for shippers.
    pub fn ft_on_transfer(
        &mut self,
        sender_id: AccountId,
        amount: U128,
        msg: String,
    ) -> PromiseOrValue<U128> {
        require!(env::predecessor_account_id() == self.usdc, "E_WRONG_TOKEN");
        require!(amount.0 > 0, "E_ZERO_AMOUNT");
        if msg == "deposit" {
            self.deposit(&sender_id, amount.0);
        } else if let Ok(RepayMsg { repay }) = serde_json::from_str::<RepayMsg>(&msg) {
            self.repay(&sender_id, repay, amount.0);
        } else {
            env::panic_str("E_BAD_MSG");
        }
        PromiseOrValue::Value(U128(0))
    }

    /// Withdraws `amount` of the caller's pool value. Pays the free part now and queues
    /// the rest, which is paid oldest first as bills are repaid.
    pub fn withdraw(&mut self, amount: U128) {
        let investor = env::predecessor_account_id();
        require!(amount.0 > 0, "E_ZERO_AMOUNT");
        // Older requests first: nobody skips the queue.
        self.pay_queue(QUEUE_BATCH);
        let shares = self.investors.get(&investor).map(|s| s.0).unwrap_or(0);
        require!(amount.0 <= self.shares_value(shares), "E_NOT_ENOUGH_SHARES");

        // Burn shares at the current price (rounded up so the pool never loses).
        let value = self.pool_value();
        let total = self.pool.total_shares.0;
        let burn = (amount.0 * total).div_ceil(value).min(shares);
        self.investors.insert(investor.clone(), U128(shares - burn));
        self.pool.total_shares = U128(total - burn);

        let now_part = amount.0.min(self.free_cash());
        let later_part = amount.0 - now_part;
        if later_part > 0 {
            self.enqueue(&investor, later_part, Self::now());
            emit(
                "withdraw_queued",
                json!({ "investor": investor, "amount": U128(later_part) }),
            );
        }
        if now_part > 0 {
            let _ = self.send_withdrawal(&investor, now_part);
        }
    }

    /// Pays queued withdrawals from free cash. Anyone can call it.
    pub fn process_queue(&mut self) {
        self.pay_queue(QUEUE_BATCH);
    }

    /// Sends Waybil's collected fees to the treasury. Treasury only.
    pub fn claim_fees(&mut self) -> Promise {
        require!(
            env::predecessor_account_id() == self.treasury,
            "E_NOT_TREASURY"
        );
        let amount = self.pool.fees.0;
        require!(amount > 0, "E_ZERO_AMOUNT");
        self.pool.fees = U128(0);
        self.pool.cash = U128(self.pool.cash.0 - amount);
        ext_ft::ext(self.usdc.clone())
            .with_attached_deposit(NearToken::from_yoctonear(1))
            .with_static_gas(GAS_FT_TRANSFER)
            .ft_transfer(
                self.treasury.clone(),
                U128(amount),
                Some("Waybil fees".into()),
            )
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(GAS_CALLBACK)
                    .on_fees_sent(U128(amount)),
            )
    }
}
