//! Unit tests for settling reports (#8) and the money cycle (#9):
//! repayment split, late bills, withdrawals with the queue, fees and the reserve.

use crate::tests::*;
use crate::*;
use near_sdk::PromiseResult;
use near_sdk::json_types::U128;

// ---------- #8 settle problem reports ----------

/// A shipment that arrived with 112 of 120 boxes good.
fn reported(c: &mut Contract, dest: u32) -> u64 {
    let id = create(c, dest, 300 * USDC);
    as_("sam.testnet", T0);
    c.confirm_pickup(id);
    as_("harborhub.testnet", T0 + 1);
    let _ = c.confirm_delivery(id, 112, Some("ab".repeat(32)));
    id
}

fn settle(c: &mut Contract, id: u64, driver_amount: u128) {
    as_("northwind.testnet", T0 + 2);
    let _ = c.settle_report(id, U128(driver_amount));
}

#[test]
fn pay_for_what_arrived_112_of_120() {
    let (mut c, dest) = world();
    let id = reported(&mut c, dest);
    settle(&mut c, id, 292_500_000 * 112 / 120);
    let s = c.get_shipment(id).unwrap();
    assert_eq!(s.status, Status::Paid);
    assert_eq!(s.advance.0, 273 * USDC);
    assert_eq!(s.bill.0, 280 * USDC);
    let shipper = c.get_shipper(acc("northwind.testnet")).unwrap();
    assert_eq!(shipper.owed.0, 280 * USDC);
    assert_eq!(shipper.committed.0, 0);
    let pool = c.get_pool();
    assert_eq!(pool.lent.0, 273 * USDC);
    assert_eq!(pool.committed.0, 0);
}

#[test]
fn pay_in_full_keeps_the_bill() {
    let (mut c, dest) = world();
    let id = reported(&mut c, dest);
    settle(&mut c, id, 292_500_000);
    assert_eq!(c.get_shipment(id).unwrap().bill.0, 300 * USDC);
}

#[test]
fn a_different_amount_rounds_the_bill_up() {
    let (mut c, dest) = world();
    let id = reported(&mut c, dest);
    settle(&mut c, id, 250 * USDC);
    assert_eq!(c.get_shipment(id).unwrap().bill.0, 256_410_257);
}

#[test]
#[should_panic(expected = "E_OVER_ADVANCE")]
fn the_driver_cannot_get_more_than_the_advance() {
    let (mut c, dest) = world();
    let id = reported(&mut c, dest);
    settle(&mut c, id, 292_500_001);
}

#[test]
#[should_panic(expected = "E_WRONG_STATUS")]
fn only_reported_shipments_settle() {
    let (mut c, dest) = world();
    let id = create(&mut c, dest, 300 * USDC);
    settle(&mut c, id, USDC);
}

#[test]
#[should_panic(expected = "E_NOT_SHIPPER_OF_SHIPMENT")]
fn only_the_shipper_settles() {
    let (mut c, dest) = world();
    let id = reported(&mut c, dest);
    as_("sam.testnet", T0 + 2);
    let _ = c.settle_report(id, U128(USDC));
}

#[test]
fn a_failed_payout_after_settling_goes_back_to_reported() {
    let (mut c, dest) = world();
    let id = reported(&mut c, dest);
    settle(&mut c, id, 273 * USDC);
    as_callback(T0 + 3, PromiseResult::Failed);
    assert!(!c.on_payout(id, true));
    assert_eq!(c.get_shipment(id).unwrap().status, Status::Reported);
    assert_eq!(c.get_pool().committed.0, 273 * USDC);
    assert_eq!(
        c.get_shipper(acc("northwind.testnet")).unwrap().committed.0,
        280 * USDC
    );
}

// ---------- #9 repayment, late bills, withdrawals, reserve ----------

/// One shipment delivered clean and paid out.
fn paid(c: &mut Contract, dest: u32) -> u64 {
    let id = create(c, dest, 300 * USDC);
    as_("sam.testnet", T0);
    c.confirm_pickup(id);
    as_("harborhub.testnet", T0 + 1);
    let _ = c.confirm_delivery(id, 120, None);
    id
}

fn repay(c: &mut Contract, shipper: &str, id: u64, amount: u128, now: u64) {
    as_("usdc.waybil.testnet", now);
    let _ = c.ft_on_transfer(acc(shipper), U128(amount), format!("{{\"repay\":{id}}}"));
}

#[test]
fn repayment_splits_the_bill() {
    let (mut c, dest) = world();
    let id = paid(&mut c, dest);
    repay(&mut c, "northwind.testnet", id, 300 * USDC, T0 + 5);
    let pool = c.get_pool();
    assert_eq!(pool.lent.0, 0);
    assert_eq!(pool.reserve.0, 1_200_000);
    assert_eq!(pool.fees.0, 1_500_000);
    assert_eq!(pool.cash.0, 25_000 * USDC + 4_800_000 + 1_500_000);
    // Maya is the only investor, so she earns the pool share of 4.80.
    assert_eq!(c.get_investor(acc("maya.testnet")).value.0, 25_004_800_000);
    assert_eq!(c.get_shipment(id).unwrap().status, Status::Repaid);
    assert_eq!(c.get_shipper(acc("northwind.testnet")).unwrap().owed.0, 0);
}

#[test]
#[should_panic(expected = "E_WRONG_AMOUNT")]
fn repayment_must_be_the_full_bill() {
    let (mut c, dest) = world();
    let id = paid(&mut c, dest);
    repay(&mut c, "northwind.testnet", id, 299 * USDC, T0 + 5);
}

#[test]
#[should_panic(expected = "E_WRONG_STATUS")]
fn no_repayment_before_the_payout() {
    let (mut c, dest) = world();
    let id = create(&mut c, dest, 300 * USDC);
    repay(&mut c, "northwind.testnet", id, 300 * USDC, T0 + 5);
}

#[test]
#[should_panic(expected = "E_NOT_SHIPPER_OF_SHIPMENT")]
fn only_the_shipper_repays() {
    let (mut c, dest) = world();
    let id = paid(&mut c, dest);
    repay(&mut c, "maya.testnet", id, 300 * USDC, T0 + 5);
}

#[test]
fn a_late_bill_blocks_new_shipments_until_repaid() {
    let (mut c, dest) = world();
    let id = paid(&mut c, dest);
    as_("anyone.testnet", T0 + 29 * DAY_NS);
    assert!(!c.mark_late(id), "not late on the due date itself");
    as_("anyone.testnet", T0 + 30 * DAY_NS);
    assert!(c.mark_late(id));
    assert!(!c.mark_late(id), "marking twice does nothing");
    assert_eq!(
        c.get_shipper(acc("northwind.testnet")).unwrap().late_bills,
        1
    );
    repay(
        &mut c,
        "northwind.testnet",
        id,
        300 * USDC,
        T0 + 31 * DAY_NS,
    );
    assert_eq!(
        c.get_shipper(acc("northwind.testnet")).unwrap().late_bills,
        0
    );
}

#[test]
#[should_panic(expected = "E_LATE_BILL")]
fn create_fails_while_a_bill_is_late() {
    let (mut c, dest) = world();
    let id = paid(&mut c, dest);
    as_("anyone.testnet", T0 + 30 * DAY_NS);
    c.mark_late(id);
    create(&mut c, dest, 10 * USDC);
}

#[test]
fn withdraw_pays_now_when_cash_is_free() {
    let (mut c, _) = world();
    as_("maya.testnet", T0);
    c.withdraw(U128(5_000 * USDC));
    let inv = c.get_investor(acc("maya.testnet"));
    assert_eq!(inv.value.0, 20_000 * USDC);
    assert_eq!(inv.queued.0, 0);
    assert_eq!(c.get_pool().cash.0, 20_000 * USDC);
}

/// Small pool: 1,200 in and one 300 bill paid out, so only 907.50 is free.
fn busy_pool() -> (Contract, u64) {
    let mut c = new_contract();
    deposit(&mut c, "maya.testnet", 1_200 * USDC);
    start_shipper(&mut c, "northwind.testnet", 3_000 * USDC);
    as_("northwind.testnet", T0);
    c.add_driver(acc("sam.testnet"));
    let dest = c.add_destination(acc("harborhub.testnet"));
    let id = paid(&mut c, dest);
    (c, id)
}

#[test]
fn withdraw_queues_what_is_lent_out_and_repayment_pays_it() {
    let (mut c, id) = busy_pool();
    as_("maya.testnet", T0 + 2);
    c.withdraw(U128(1_000 * USDC));
    assert_eq!(c.get_investor(acc("maya.testnet")).queued.0, 92_500_000);
    assert_eq!(c.get_withdraw_queue(None, None).len(), 1);
    assert_eq!(c.get_pool().queued.0, 92_500_000);

    repay(&mut c, "northwind.testnet", id, 300 * USDC, T0 + 5);
    assert_eq!(c.get_investor(acc("maya.testnet")).queued.0, 0);
    assert_eq!(c.get_pool().queued.0, 0);
    assert!(c.get_withdraw_queue(None, None).is_empty());
}

#[test]
#[should_panic(expected = "E_NOT_ENOUGH_SHARES")]
fn cannot_withdraw_more_than_you_own() {
    let (mut c, _) = world();
    as_("maya.testnet", T0);
    c.withdraw(U128(25_001 * USDC));
}

#[test]
fn a_failed_withdrawal_goes_back_to_the_queue() {
    let (mut c, _) = world();
    as_("maya.testnet", T0);
    c.withdraw(U128(5_000 * USDC));
    as_callback(T0 + 1, PromiseResult::Failed);
    assert!(!c.on_withdraw_sent(acc("maya.testnet"), U128(5_000 * USDC)));
    assert_eq!(c.get_investor(acc("maya.testnet")).queued.0, 5_000 * USDC);
    assert_eq!(c.get_pool().cash.0, 25_000 * USDC);
}

#[test]
fn treasury_claims_the_fees() {
    let (mut c, dest) = world();
    let id = paid(&mut c, dest);
    repay(&mut c, "northwind.testnet", id, 300 * USDC, T0 + 5);
    as_("treasury.waybil.testnet", T0 + 6);
    let _ = c.claim_fees();
    assert_eq!(c.get_pool().fees.0, 0);
    as_callback(T0 + 7, PromiseResult::Failed);
    assert!(!c.on_fees_sent(U128(1_500_000)));
    assert_eq!(c.get_pool().fees.0, 1_500_000);
}

#[test]
#[should_panic(expected = "E_NOT_TREASURY")]
fn only_the_treasury_claims_fees() {
    let (mut c, _) = world();
    as_("maya.testnet", T0);
    let _ = c.claim_fees();
}

#[test]
#[should_panic(expected = "E_TOO_EARLY")]
fn reserve_cover_waits_14_days_after_the_due_date() {
    let (mut c, dest) = world();
    let id = paid(&mut c, dest);
    as_("risk.testnet", T0 + 43 * DAY_NS);
    c.propose(ProposalKind::CoverFromReserve { shipment_id: id });
}

#[test]
fn reserve_covers_an_unpaid_bill() {
    let (mut c, dest) = world();
    // A repaid bill first, so the reserve holds 1.20.
    let first = paid(&mut c, dest);
    repay(&mut c, "northwind.testnet", first, 300 * USDC, T0 + 5);
    let id = paid(&mut c, dest);
    let later = T0 + 44 * DAY_NS;
    as_("anyone.testnet", later);
    c.mark_late(id);
    as_("risk.testnet", later);
    let p = c.propose(ProposalKind::CoverFromReserve { shipment_id: id });
    as_("ops.testnet", later);
    assert_eq!(c.vote(p, true), ProposalStatus::Approved);

    assert_eq!(c.get_shipment(id).unwrap().status, Status::CoveredByReserve);
    let pool = c.get_pool();
    assert_eq!(pool.reserve.0, 0);
    assert_eq!(pool.lent.0, 0);
    let shipper = c.get_shipper(acc("northwind.testnet")).unwrap();
    assert_eq!(shipper.owed.0, 0);
    assert_eq!(shipper.late_bills, 0);
    assert!(shipper.paused.is_some());
}
