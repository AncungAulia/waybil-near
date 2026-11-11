//! Unit tests for team upgrades and `migrate` (docs/specs/contract.md, Upgrades).
//! The deploy itself runs only in the sandbox test. Here we check the rules, the events,
//! and the batch the contract builds.

use crate::team::{CODE_HASH_KEY, CODE_HASH_PENDING_KEY};
use crate::tests::{T0, USDC, acc, as_, new_contract, world};
use crate::*;
use near_sdk::json_types::{Base58CryptoHash, U128};
use near_sdk::mock::MockAction;
use near_sdk::test_utils::{get_created_receipts, get_logs};
use near_sdk::{Gas, PromiseOrValue, env};

const CODE: &[u8] = b"\0asm the next version";

fn hash_of(code: &[u8]) -> Base58CryptoHash {
    Base58CryptoHash::from(env::sha256_array(code))
}

/// Risk proposes an upgrade to `CODE`.
fn propose_upgrade(c: &mut Contract) -> u64 {
    as_("risk.testnet", T0);
    c.propose(ProposalKind::Upgrade {
        code_hash: hash_of(CODE),
    })
}

fn status(r: PromiseOrValue<ProposalStatus>) -> Option<ProposalStatus> {
    match r {
        PromiseOrValue::Value(s) => Some(s),
        PromiseOrValue::Promise(_) => None,
    }
}

fn has_event(name: &str) -> bool {
    get_logs()
        .iter()
        .any(|l| l.contains(&format!("\"event\":\"{name}\"")))
}

fn stored_hash(key: &[u8]) -> Option<Vec<u8>> {
    env::storage_read(key)
}

// ---------- proposals ----------

#[test]
fn the_proposer_counts_as_the_first_approval() {
    let mut c = new_contract();
    let id = propose_upgrade(&mut c);
    let p = c.get_proposal(id).unwrap();
    assert_eq!(p.approvals, vec![acc("risk.testnet")]);
    assert_eq!(p.status, ProposalStatus::Open);
}

#[test]
fn a_fresh_contract_has_version_1_and_no_hash() {
    let c = new_contract();
    assert_eq!(
        c.get_code_info(),
        CodeInfo {
            version: STATE_VERSION,
            code_hash: None
        }
    );
}

// ---------- approve_upgrade ----------

#[test]
fn second_approval_deploys_the_code_and_calls_migrate() {
    let mut c = new_contract();
    let id = propose_upgrade(&mut c);
    as_("ops.testnet", T0 + 1);
    let r = c.approve_upgrade(id, CODE.to_vec());
    assert!(matches!(r, PromiseOrValue::Promise(_)));
    drop(r);

    let p = c.get_proposal(id).unwrap();
    assert_eq!(p.status, ProposalStatus::Approved);
    assert_eq!(p.approvals, vec![acc("risk.testnet"), acc("ops.testnet")]);
    assert!(has_event("vote_cast"));
    assert!(has_event("proposal_resolved"));
    assert!(has_event("upgrade_approved"));
    let hash = near_sdk::serde_json::to_string(&hash_of(CODE)).unwrap();
    assert!(get_logs().iter().any(|l| l.contains(&hash)));
    assert_eq!(
        stored_hash(CODE_HASH_PENDING_KEY),
        Some(env::sha256_array(CODE).to_vec())
    );

    // One batch to itself: deploy the code, then migrate with 100 Tgas.
    let receipts = get_created_receipts();
    assert_eq!(receipts.len(), 1);
    assert_eq!(receipts[0].receiver_id, acc("app.waybil.testnet"));
    let actions = &receipts[0].actions;
    assert_eq!(actions.len(), 2);
    assert!(matches!(&actions[0], MockAction::DeployContract { code, .. } if code == CODE));
    assert!(matches!(
        &actions[1],
        MockAction::FunctionCallWeight { method_name, prepaid_gas, .. }
            if method_name == b"migrate" && *prepaid_gas == Gas::from_tgas(100)
    ));
}

#[test]
#[should_panic(expected = "E_CODE_HASH")]
fn approve_upgrade_checks_the_code_hash() {
    let mut c = new_contract();
    let id = propose_upgrade(&mut c);
    as_("ops.testnet", T0 + 1);
    let _ = c.approve_upgrade(id, b"\0asm some other code".to_vec());
}

#[test]
#[should_panic(expected = "E_NOT_TEAM")]
fn only_members_approve_upgrades() {
    let mut c = new_contract();
    let id = propose_upgrade(&mut c);
    as_("northwind.testnet", T0 + 1);
    let _ = c.approve_upgrade(id, CODE.to_vec());
}

#[test]
#[should_panic(expected = "E_ALREADY_VOTED")]
fn the_proposer_cannot_approve_again() {
    let mut c = new_contract();
    let id = propose_upgrade(&mut c);
    as_("risk.testnet", T0 + 1);
    let _ = c.approve_upgrade(id, CODE.to_vec());
}

#[test]
#[should_panic(expected = "E_NOT_UPGRADE")]
fn approve_upgrade_only_for_upgrades() {
    let mut c = new_contract();
    as_("risk.testnet", T0);
    let id = c.propose(ProposalKind::StartShipper {
        shipper: acc("meridian.testnet"),
        limit: U128(USDC),
    });
    as_("ops.testnet", T0 + 1);
    let _ = c.approve_upgrade(id, CODE.to_vec());
}

#[test]
#[should_panic(expected = "E_NO_PROPOSAL")]
fn approve_upgrade_needs_a_proposal() {
    let mut c = new_contract();
    as_("ops.testnet", T0);
    let _ = c.approve_upgrade(9, CODE.to_vec());
}

#[test]
fn an_expired_upgrade_closes_without_deploying() {
    let mut c = new_contract();
    let id = propose_upgrade(&mut c);
    as_("ops.testnet", T0 + 7 * DAY_NS + 1);
    let r = c.approve_upgrade(id, CODE.to_vec());
    assert_eq!(status(r), Some(ProposalStatus::Expired));
    assert_eq!(c.get_proposal(id).unwrap().status, ProposalStatus::Expired);
    assert!(get_created_receipts().is_empty());
    assert_eq!(stored_hash(CODE_HASH_PENDING_KEY), None);
}

#[test]
#[should_panic(expected = "E_PROPOSAL_CLOSED")]
fn an_approved_upgrade_takes_no_more_approvals() {
    let mut c = new_contract();
    let id = propose_upgrade(&mut c);
    as_("ops.testnet", T0 + 1);
    let _ = c.approve_upgrade(id, CODE.to_vec());
    as_("finance.testnet", T0 + 2);
    let _ = c.approve_upgrade(id, CODE.to_vec());
}

// ---------- vote on upgrades ----------

#[test]
#[should_panic(expected = "E_USE_APPROVE_UPGRADE")]
fn vote_cannot_be_the_deciding_approval_of_an_upgrade() {
    let mut c = new_contract();
    let id = propose_upgrade(&mut c);
    as_("ops.testnet", T0 + 1);
    c.vote(id, true);
}

#[test]
fn two_rejections_close_an_upgrade() {
    let mut c = new_contract();
    let id = propose_upgrade(&mut c);
    as_("ops.testnet", T0 + 1);
    assert_eq!(c.vote(id, false), ProposalStatus::Open);
    as_("finance.testnet", T0 + 2);
    assert_eq!(c.vote(id, false), ProposalStatus::Rejected);
    assert!(get_created_receipts().is_empty());
}

#[test]
fn approve_upgrade_after_one_rejection_still_deploys() {
    let mut c = new_contract();
    let id = propose_upgrade(&mut c);
    as_("ops.testnet", T0 + 1);
    c.vote(id, false);
    as_("finance.testnet", T0 + 2);
    let r = c.approve_upgrade(id, CODE.to_vec());
    assert!(matches!(r, PromiseOrValue::Promise(_)));
    assert_eq!(c.get_proposal(id).unwrap().status, ProposalStatus::Approved);
}

// ---------- migrate ----------

/// Saves `c` as the stored state, like a deployed contract has it.
fn store(c: &Contract) {
    env::state_write(c);
}

#[test]
fn migrate_records_the_new_code_hash() {
    let (c, _) = world();
    let pool = c.get_pool();
    let northwind = c.get_shipper(acc("northwind.testnet"));
    store(&c);
    // Dropping the contract writes its cached collections to storage.
    drop(c);
    as_("app.waybil.testnet", T0 + 1);
    env::storage_write(CODE_HASH_PENDING_KEY, &env::sha256_array(CODE));
    let m = Contract::migrate();
    assert!(has_event("contract_upgraded"));
    assert!(get_logs().iter().any(|l| l.contains("\"old_hash\":null")));
    assert_eq!(
        m.get_code_info(),
        CodeInfo {
            version: STATE_VERSION,
            code_hash: Some(hash_of(CODE))
        }
    );
    assert_eq!(stored_hash(CODE_HASH_PENDING_KEY), None);
    assert_eq!(
        stored_hash(CODE_HASH_KEY),
        Some(env::sha256_array(CODE).to_vec())
    );
    // The state is untouched.
    assert_eq!(m.get_pool(), pool);
    assert!(northwind.is_some());
    assert_eq!(m.get_shipper(acc("northwind.testnet")), northwind);

    // A second upgrade reports the previous hash as the old one.
    store(&m);
    as_("app.waybil.testnet", T0 + 2);
    let next: &[u8] = b"\0asm the version after";
    env::storage_write(CODE_HASH_PENDING_KEY, &env::sha256_array(next));
    let m = Contract::migrate();
    let old = near_sdk::serde_json::to_string(&hash_of(CODE)).unwrap();
    assert!(
        get_logs()
            .iter()
            .any(|l| l.contains(&format!("\"old_hash\":{old}")))
    );
    assert_eq!(m.get_code_info().code_hash, Some(hash_of(next)));
}

#[test]
fn migrate_after_a_plain_deploy_only_sets_the_version() {
    let c = new_contract();
    store(&c);
    as_("app.waybil.testnet", T0 + 1);
    let m = Contract::migrate();
    assert!(!has_event("contract_upgraded"));
    assert_eq!(
        m.get_code_info(),
        CodeInfo {
            version: STATE_VERSION,
            code_hash: None
        }
    );
}

#[test]
#[should_panic(expected = "E_DOWNGRADE")]
fn migrate_refuses_newer_state() {
    let mut c = new_contract();
    c.version = STATE_VERSION + 1;
    store(&c);
    as_("app.waybil.testnet", T0 + 1);
    Contract::migrate();
}

#[test]
#[should_panic(expected = "E_NO_STATE")]
fn migrate_needs_stored_state() {
    as_("app.waybil.testnet", T0);
    Contract::migrate();
}

// ---------- stored proposals stay readable ----------

#[test]
fn existing_proposal_kinds_keep_their_borsh_layout() {
    let shipper = acc("northwind.testnet");
    let kinds = [
        ProposalKind::StartShipper {
            shipper: shipper.clone(),
            limit: U128(1),
        },
        ProposalKind::SetLimit {
            shipper: shipper.clone(),
            limit: U128(1),
        },
        ProposalKind::Unpause {
            shipper: shipper.clone(),
        },
        ProposalKind::CoverFromReserve { shipment_id: 7 },
        ProposalKind::Upgrade {
            code_hash: hash_of(CODE),
        },
    ];
    for (i, kind) in kinds.iter().enumerate() {
        let bytes = near_sdk::borsh::to_vec(kind).unwrap();
        assert_eq!(bytes[0] as usize, i);
    }
    // Bytes written by the code before upgrades existed.
    let old = [3u8, 7, 0, 0, 0, 0, 0, 0, 0];
    let kind: ProposalKind = near_sdk::borsh::from_slice(&old).unwrap();
    assert_eq!(kind, ProposalKind::CoverFromReserve { shipment_id: 7 });
}
