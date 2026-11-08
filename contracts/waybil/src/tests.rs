//! Unit tests. Each `E_` rule in docs/specs/contract.md for this part has a test.

use crate::*;
use near_sdk::json_types::{U64, U128};
use near_sdk::test_utils::VMContextBuilder;
use near_sdk::{
    AccountId, NearToken, PromiseOrValue, PromiseResult, RuntimeFeesConfig, testing_env,
};

pub(crate) const USDC: u128 = 1_000_000;
pub(crate) const T0: u64 = 1_000 * DAY_NS;

pub(crate) fn acc(name: &str) -> AccountId {
    name.parse().unwrap()
}

pub(crate) fn as_(caller: &str, now: u64) {
    testing_env!(
        VMContextBuilder::new()
            .current_account_id(acc("app.waybil.testnet"))
            .predecessor_account_id(acc(caller))
            .signer_account_id(acc(caller))
            .block_timestamp(now)
            .attached_deposit(NearToken::from_yoctonear(0))
            .build()
    );
}

pub(crate) fn as_callback(now: u64, result: PromiseResult) {
    testing_env!(
        VMContextBuilder::new()
            .current_account_id(acc("app.waybil.testnet"))
            .predecessor_account_id(acc("app.waybil.testnet"))
            .block_timestamp(now)
            .build(),
        near_sdk::test_vm_config(),
        RuntimeFeesConfig::test(),
        Default::default(),
        vec![result]
    );
}

pub(crate) fn new_contract() -> Contract {
    as_("waybil.testnet", T0);
    Contract::new(
        acc("usdc.waybil.testnet"),
        acc("assistant.waybil.testnet"),
        acc("treasury.waybil.testnet"),
        vec![
            acc("risk.testnet"),
            acc("ops.testnet"),
            acc("finance.testnet"),
        ],
    )
}

/// Team starts `shipper` with a limit (risk proposes, ops approves).
pub(crate) fn start_shipper(c: &mut Contract, shipper: &str, limit: u128) {
    as_("risk.testnet", T0);
    let id = c.propose(ProposalKind::StartShipper {
        shipper: acc(shipper),
        limit: U128(limit),
    });
    as_("ops.testnet", T0);
    assert_eq!(c.vote(id, true), ProposalStatus::Approved);
}

pub(crate) fn deposit(c: &mut Contract, investor: &str, amount: u128) {
    as_("usdc.waybil.testnet", T0);
    let r = c.ft_on_transfer(acc(investor), U128(amount), "deposit".into());
    assert!(matches!(r, PromiseOrValue::Value(U128(0))));
}

/// A ready world: pool 25,000, Northwind with a 3,000 limit, Sam and Harbor Hub linked.
pub(crate) fn world() -> (Contract, u32) {
    let mut c = new_contract();
    deposit(&mut c, "maya.testnet", 25_000 * USDC);
    start_shipper(&mut c, "northwind.testnet", 3_000 * USDC);
    as_("northwind.testnet", T0);
    c.add_driver(acc("sam.testnet"));
    let dest = c.add_destination(acc("harborhub.testnet"));
    (c, dest)
}

pub(crate) fn create(c: &mut Contract, dest: u32, bill: u128) -> u64 {
    as_("northwind.testnet", T0);
    c.create_shipment(
        acc("sam.testnet"),
        dest,
        120,
        "boxes".into(),
        U128(bill),
        U64(T0 + 29 * DAY_NS),
    )
}

// ---------- init ----------

#[test]
fn init_sets_defaults() {
    let c = new_contract();
    assert_eq!(c.get_config(), Config::default());
    assert!(c.is_member(acc("ops.testnet")));
    assert!(!c.is_member(acc("northwind.testnet")));
    assert_eq!(c.get_pool(), Pool::default());
}

#[test]
#[should_panic(expected = "E_TEAM_SIZE")]
fn init_needs_three_members() {
    as_("waybil.testnet", T0);
    Contract::new(
        acc("u.testnet"),
        acc("a.testnet"),
        acc("t.testnet"),
        vec![acc("x.testnet")],
    );
}

#[test]
#[should_panic(expected = "E_TEAM_DUPLICATE")]
fn init_rejects_duplicate_members() {
    as_("waybil.testnet", T0);
    Contract::new(
        acc("u.testnet"),
        acc("a.testnet"),
        acc("t.testnet"),
        vec![acc("x.testnet"), acc("x.testnet"), acc("y.testnet")],
    );
}

// ---------- pool deposit ----------

#[test]
fn deposit_mints_shares_at_the_current_price() {
    let mut c = new_contract();
    deposit(&mut c, "maya.testnet", 5_000 * USDC);
    deposit(&mut c, "orbit-ventures.testnet", 8_000 * USDC);
    assert_eq!(c.get_pool().cash.0, 13_000 * USDC);
    assert_eq!(c.get_investor(acc("maya.testnet")).value.0, 5_000 * USDC);
    assert_eq!(
        c.get_investor(acc("orbit-ventures.testnet")).value.0,
        8_000 * USDC
    );
}

#[test]
#[should_panic(expected = "E_WRONG_TOKEN")]
fn deposit_only_from_usdc() {
    let mut c = new_contract();
    as_("fake-token.testnet", T0);
    let _ = c.ft_on_transfer(acc("maya.testnet"), U128(USDC), "deposit".into());
}

#[test]
#[should_panic(expected = "E_BAD_MSG")]
fn unknown_transfer_message_fails() {
    let mut c = new_contract();
    as_("usdc.waybil.testnet", T0);
    let _ = c.ft_on_transfer(acc("maya.testnet"), U128(USDC), "hello".into());
}

// ---------- team ----------

#[test]
fn two_approvals_start_a_shipper() {
    let mut c = new_contract();
    start_shipper(&mut c, "northwind.testnet", 2_500 * USDC);
    assert_eq!(
        c.get_shipper(acc("northwind.testnet")).unwrap().limit.0,
        2_500 * USDC
    );
}

#[test]
fn one_approval_and_one_rejection_stays_open() {
    let mut c = new_contract();
    as_("risk.testnet", T0);
    let id = c.propose(ProposalKind::StartShipper {
        shipper: acc("meridian.testnet"),
        limit: U128(2_000 * USDC),
    });
    as_("ops.testnet", T0);
    assert_eq!(c.vote(id, false), ProposalStatus::Open);
    as_("finance.testnet", T0);
    assert_eq!(c.vote(id, true), ProposalStatus::Approved);
}

#[test]
fn two_rejections_close_it() {
    let mut c = new_contract();
    as_("risk.testnet", T0);
    let id = c.propose(ProposalKind::StartShipper {
        shipper: acc("coastline.testnet"),
        limit: U128(1_000 * USDC),
    });
    as_("ops.testnet", T0);
    c.vote(id, false);
    as_("finance.testnet", T0);
    assert_eq!(c.vote(id, false), ProposalStatus::Rejected);
    assert!(c.get_shipper(acc("coastline.testnet")).is_none());
}

#[test]
fn a_vote_after_7_days_expires_it() {
    let mut c = new_contract();
    as_("risk.testnet", T0);
    let id = c.propose(ProposalKind::StartShipper {
        shipper: acc("meridian.testnet"),
        limit: U128(2_000 * USDC),
    });
    as_("ops.testnet", T0 + 7 * DAY_NS + 1);
    assert_eq!(c.vote(id, true), ProposalStatus::Expired);
    assert!(c.get_shipper(acc("meridian.testnet")).is_none());
}

#[test]
#[should_panic(expected = "E_ALREADY_VOTED")]
fn no_double_votes() {
    let mut c = new_contract();
    as_("risk.testnet", T0);
    let id = c.propose(ProposalKind::StartShipper {
        shipper: acc("meridian.testnet"),
        limit: U128(USDC),
    });
    c.vote(id, true);
}

#[test]
#[should_panic(expected = "E_NOT_TEAM")]
fn only_members_vote() {
    let mut c = new_contract();
    as_("northwind.testnet", T0);
    c.propose(ProposalKind::StartShipper {
        shipper: acc("northwind.testnet"),
        limit: U128(USDC),
    });
}

#[test]
#[should_panic(expected = "E_PROPOSAL_CLOSED")]
fn closed_proposals_take_no_votes() {
    let mut c = new_contract();
    start_shipper(&mut c, "northwind.testnet", USDC);
    as_("finance.testnet", T0);
    c.vote(1, true);
}

#[test]
fn pause_is_instant_and_unpause_needs_two() {
    let (mut c, dest) = world();
    as_("finance.testnet", T0);
    c.pause_shipper(acc("northwind.testnet"), "Late bill".into());
    assert!(
        c.get_shipper(acc("northwind.testnet"))
            .unwrap()
            .paused
            .is_some()
    );
    as_("risk.testnet", T0);
    let id = c.propose(ProposalKind::Unpause {
        shipper: acc("northwind.testnet"),
    });
    as_("ops.testnet", T0);
    c.vote(id, true);
    assert!(
        c.get_shipper(acc("northwind.testnet"))
            .unwrap()
            .paused
            .is_none()
    );
    create(&mut c, dest, 300 * USDC);
}

#[test]
#[should_panic(expected = "E_PAUSED")]
fn paused_shipper_cannot_create() {
    let (mut c, dest) = world();
    as_("finance.testnet", T0);
    c.pause_shipper(acc("northwind.testnet"), "Late bill".into());
    create(&mut c, dest, 300 * USDC);
}

// ---------- credit assistant ----------

#[test]
fn assistant_raises_up_to_20_percent_a_week() {
    let (mut c, _) = world();
    as_("assistant.waybil.testnet", T0);
    c.assistant_set_limit(acc("northwind.testnet"), U128(3_600 * USDC));
    assert_eq!(
        c.get_shipper(acc("northwind.testnet")).unwrap().limit.0,
        3_600 * USDC
    );
}

#[test]
#[should_panic(expected = "E_OVER_WEEKLY_RAISE")]
fn assistant_cannot_raise_more_than_20_percent() {
    let (mut c, _) = world();
    as_("assistant.waybil.testnet", T0);
    c.assistant_set_limit(acc("northwind.testnet"), U128(3_601 * USDC));
}

#[test]
#[should_panic(expected = "E_OVER_WEEKLY_RAISE")]
fn two_raises_in_one_week_share_the_cap() {
    let (mut c, _) = world();
    as_("assistant.waybil.testnet", T0);
    c.assistant_set_limit(acc("northwind.testnet"), U128(3_300 * USDC));
    as_("assistant.waybil.testnet", T0 + DAY_NS);
    c.assistant_set_limit(acc("northwind.testnet"), U128(3_700 * USDC));
}

#[test]
fn a_new_week_resets_the_raise_window() {
    let (mut c, _) = world();
    as_("assistant.waybil.testnet", T0);
    c.assistant_set_limit(acc("northwind.testnet"), U128(3_600 * USDC));
    as_("assistant.waybil.testnet", T0 + 7 * DAY_NS);
    c.assistant_set_limit(acc("northwind.testnet"), U128(4_320 * USDC));
}

#[test]
#[should_panic(expected = "E_OVER_MAX_LIMIT")]
fn assistant_never_goes_above_10000() {
    let (mut c, _) = world();
    as_("risk.testnet", T0);
    let id = c.propose(ProposalKind::SetLimit {
        shipper: acc("northwind.testnet"),
        limit: U128(9_500 * USDC),
    });
    as_("ops.testnet", T0);
    c.vote(id, true);
    as_("assistant.waybil.testnet", T0);
    c.assistant_set_limit(acc("northwind.testnet"), U128(10_001 * USDC));
}

#[test]
#[should_panic(expected = "E_NOT_ASSISTANT")]
fn only_the_assistant_sets_limits() {
    let (mut c, _) = world();
    as_("northwind.testnet", T0);
    c.assistant_set_limit(acc("northwind.testnet"), U128(3_100 * USDC));
}

#[test]
fn rejected_assistant_proposal_blocks_it_for_7_days() {
    let (mut c, _) = world();
    as_("assistant.waybil.testnet", T0);
    let id = c.assistant_propose(acc("northwind.testnet"), U128(5_000 * USDC));
    as_("risk.testnet", T0);
    c.vote(id, false);
    as_("finance.testnet", T0);
    assert_eq!(c.vote(id, false), ProposalStatus::Rejected);
    let s = c.get_shipper(acc("northwind.testnet")).unwrap();
    assert_eq!(s.blocked_until.0, T0 + 7 * DAY_NS);
}

#[test]
#[should_panic(expected = "E_ASSISTANT_COOLDOWN")]
fn assistant_waits_out_the_cooldown() {
    let (mut c, _) = world();
    as_("assistant.waybil.testnet", T0);
    let id = c.assistant_propose(acc("northwind.testnet"), U128(5_000 * USDC));
    as_("risk.testnet", T0);
    c.vote(id, false);
    as_("finance.testnet", T0);
    c.vote(id, false);
    as_("assistant.waybil.testnet", T0 + 7 * DAY_NS - 1);
    c.assistant_set_limit(acc("northwind.testnet"), U128(3_100 * USDC));
}

#[test]
fn team_approves_a_big_raise_from_the_assistant() {
    let (mut c, _) = world();
    as_("assistant.waybil.testnet", T0);
    let id = c.assistant_propose(acc("northwind.testnet"), U128(5_000 * USDC));
    as_("risk.testnet", T0);
    c.vote(id, true);
    as_("finance.testnet", T0);
    assert_eq!(c.vote(id, true), ProposalStatus::Approved);
    assert_eq!(
        c.get_shipper(acc("northwind.testnet")).unwrap().limit.0,
        5_000 * USDC
    );
}

// ---------- network ----------

#[test]
fn network_lists_drivers_and_destinations() {
    let (c, dest) = world();
    let n = c.get_network(acc("northwind.testnet"));
    assert_eq!(n.drivers, vec![acc("sam.testnet")]);
    assert_eq!(n.destinations[0].id, dest);
    assert_eq!(n.destinations[0].warehouse, acc("harborhub.testnet"));
}

#[test]
#[should_panic(expected = "E_NOT_SHIPPER")]
fn only_shippers_add_drivers() {
    let mut c = new_contract();
    as_("nobody.testnet", T0);
    c.add_driver(acc("sam.testnet"));
}

#[test]
#[should_panic(expected = "E_ALREADY_IN_NETWORK")]
fn no_duplicate_drivers() {
    let (mut c, _) = world();
    as_("northwind.testnet", T0);
    c.add_driver(acc("sam.testnet"));
}

// ---------- shipments ----------

#[test]
fn create_commits_the_bill_and_the_advance() {
    let (mut c, dest) = world();
    let id = create(&mut c, dest, 300 * USDC);
    let s = c.get_shipment(id).unwrap();
    assert_eq!(s.status, Status::Approved);
    assert_eq!(s.advance.0, 292_500_000);
    assert_eq!(
        c.get_shipper(acc("northwind.testnet")).unwrap().committed.0,
        300 * USDC
    );
    assert_eq!(c.get_pool().committed.0, 292_500_000);
    assert_eq!(
        c.list_shipments_by_shipper(acc("northwind.testnet"), None, None)
            .len(),
        1
    );
    assert_eq!(
        c.list_shipments_by_driver(acc("sam.testnet"), None, None)
            .len(),
        1
    );
    assert_eq!(c.list_shipments_by_destination(dest, None, None).len(), 1);
}

#[test]
#[should_panic(expected = "E_OVER_LIMIT")]
fn create_respects_the_limit() {
    let (mut c, dest) = world();
    create(&mut c, dest, 2_400 * USDC);
    create(&mut c, dest, 1_200 * USDC);
}

#[test]
#[should_panic(expected = "E_DRIVER_NOT_IN_NETWORK")]
fn create_needs_a_driver_in_the_network() {
    let (mut c, dest) = world();
    as_("northwind.testnet", T0);
    c.create_shipment(
        acc("stranger.testnet"),
        dest,
        1,
        "box".into(),
        U128(USDC),
        U64(T0 + DAY_NS),
    );
}

#[test]
#[should_panic(expected = "E_BAD_DUE_DATE")]
fn due_date_within_60_days() {
    let (mut c, dest) = world();
    as_("northwind.testnet", T0);
    c.create_shipment(
        acc("sam.testnet"),
        dest,
        1,
        "box".into(),
        U128(USDC),
        U64(T0 + 61 * DAY_NS),
    );
}

#[test]
#[should_panic(expected = "E_BAD_UNIT")]
fn unit_is_required() {
    let (mut c, dest) = world();
    as_("northwind.testnet", T0);
    c.create_shipment(
        acc("sam.testnet"),
        dest,
        1,
        " ".into(),
        U128(USDC),
        U64(T0 + DAY_NS),
    );
}

#[test]
#[should_panic(expected = "E_POOL_EMPTY")]
fn no_shipments_without_a_pool() {
    let mut c = new_contract();
    start_shipper(&mut c, "northwind.testnet", 3_000 * USDC);
    as_("northwind.testnet", T0);
    c.add_driver(acc("sam.testnet"));
    let dest = c.add_destination(acc("harborhub.testnet"));
    create(&mut c, dest, 300 * USDC);
}

#[test]
#[should_panic(expected = "E_OVER_POOL_SHARE")]
fn one_bill_cannot_take_over_a_quarter_of_the_pool() {
    let mut c = new_contract();
    deposit(&mut c, "maya.testnet", 1_000 * USDC);
    start_shipper(&mut c, "northwind.testnet", 3_000 * USDC);
    as_("northwind.testnet", T0);
    c.add_driver(acc("sam.testnet"));
    let dest = c.add_destination(acc("harborhub.testnet"));
    create(&mut c, dest, 300 * USDC);
}

#[test]
fn cancel_before_pickup_frees_everything() {
    let (mut c, dest) = world();
    let id = create(&mut c, dest, 300 * USDC);
    as_("northwind.testnet", T0);
    c.cancel_shipment(id);
    assert_eq!(c.get_shipment(id).unwrap().status, Status::Cancelled);
    assert_eq!(
        c.get_shipper(acc("northwind.testnet")).unwrap().committed.0,
        0
    );
    assert_eq!(c.get_pool().committed.0, 0);
}

#[test]
#[should_panic(expected = "E_WRONG_STATUS")]
fn no_cancel_after_pickup() {
    let (mut c, dest) = world();
    let id = create(&mut c, dest, 300 * USDC);
    as_("sam.testnet", T0);
    c.confirm_pickup(id);
    as_("northwind.testnet", T0);
    c.cancel_shipment(id);
}

#[test]
#[should_panic(expected = "E_NOT_DRIVER")]
fn only_the_driver_confirms_pickup() {
    let (mut c, dest) = world();
    let id = create(&mut c, dest, 300 * USDC);
    as_("northwind.testnet", T0);
    c.confirm_pickup(id);
}

#[test]
#[should_panic(expected = "E_NOT_WAREHOUSE")]
fn only_the_destination_warehouse_confirms() {
    let (mut c, dest) = world();
    let id = create(&mut c, dest, 300 * USDC);
    as_("sam.testnet", T0);
    c.confirm_pickup(id);
    as_("sam.testnet", T0);
    let _ = c.confirm_delivery(id, 120, None);
}

#[test]
fn clean_delivery_pays_the_driver_at_once() {
    let (mut c, dest) = world();
    let id = create(&mut c, dest, 300 * USDC);
    as_("sam.testnet", T0);
    c.confirm_pickup(id);
    as_("harborhub.testnet", T0 + 1);
    let r = c.confirm_delivery(id, 120, None);
    assert!(matches!(r, PromiseOrValue::Promise(_)));

    let s = c.get_shipment(id).unwrap();
    assert_eq!(s.status, Status::Paid);
    let pool = c.get_pool();
    assert_eq!(pool.lent.0, 292_500_000);
    assert_eq!(pool.cash.0, 25_000 * USDC - 292_500_000);
    assert_eq!(pool.committed.0, 0);
    let shipper = c.get_shipper(acc("northwind.testnet")).unwrap();
    assert_eq!(shipper.owed.0, 300 * USDC);
    assert_eq!(shipper.committed.0, 0);
    // The pool value doesn't change when money is lent out.
    assert_eq!(c.get_investor(acc("maya.testnet")).value.0, 25_000 * USDC);
}

#[test]
fn damaged_goods_hold_the_payout() {
    let (mut c, dest) = world();
    let id = create(&mut c, dest, 300 * USDC);
    as_("sam.testnet", T0);
    c.confirm_pickup(id);
    as_("harborhub.testnet", T0 + 1);
    let r = c.confirm_delivery(id, 112, Some("ab".repeat(32)));
    assert!(matches!(r, PromiseOrValue::Value(false)));
    let s = c.get_shipment(id).unwrap();
    assert_eq!(s.status, Status::Reported);
    assert_eq!(s.good_qty, Some(112));
    assert_eq!(c.get_pool().committed.0, 292_500_000);
}

#[test]
fn failed_payout_rolls_back() {
    let (mut c, dest) = world();
    let id = create(&mut c, dest, 300 * USDC);
    as_("sam.testnet", T0);
    c.confirm_pickup(id);
    as_("harborhub.testnet", T0 + 1);
    let _ = c.confirm_delivery(id, 120, None);

    as_callback(T0 + 2, PromiseResult::Failed);
    assert!(!c.on_payout(id, false));
    let s = c.get_shipment(id).unwrap();
    assert_eq!(s.status, Status::PickedUp);
    assert_eq!(s.paid_at, None);
    let pool = c.get_pool();
    assert_eq!(pool.lent.0, 0);
    assert_eq!(pool.cash.0, 25_000 * USDC);
    assert_eq!(pool.committed.0, 292_500_000);
    let shipper = c.get_shipper(acc("northwind.testnet")).unwrap();
    assert_eq!(shipper.owed.0, 0);
    assert_eq!(shipper.committed.0, 300 * USDC);
}

#[test]
fn successful_payout_keeps_the_state() {
    let (mut c, dest) = world();
    let id = create(&mut c, dest, 300 * USDC);
    as_("sam.testnet", T0);
    c.confirm_pickup(id);
    as_("harborhub.testnet", T0 + 1);
    let _ = c.confirm_delivery(id, 120, None);
    as_callback(T0 + 2, PromiseResult::Successful(vec![]));
    assert!(c.on_payout(id, false));
    assert_eq!(c.get_shipment(id).unwrap().status, Status::Paid);
}
