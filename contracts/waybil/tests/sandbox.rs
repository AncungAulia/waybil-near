//! Sandbox tests with the real test USDC token:
//! - the core flow: deposit → team starts a shipper → network → shipment → pickup →
//!   delivery → driver paid, a failed payout that rolls back, and the private callback guard;
//! - a team upgrade from V1 to a test V2 that keeps the state, and a failing `migrate`
//!   that rolls back.
//!
//! near-sandbox has no Windows build, so this file only compiles on Linux and macOS.
#![cfg(not(target_os = "windows"))]

use near_api::{AccountId, NearGas, NearToken};
use near_sdk::json_types::U128;
use near_sdk::serde_json::{Value, json};

const USDC: u128 = 1_000_000;
const DAY_NS: u64 = 86_400 * 1_000_000_000;
const STORAGE: u128 = 10_000_000_000_000_000_000_000; // 0.01 NEAR

/// The tests build wasm into the same target folder and start their own sandbox,
/// so they run one at a time.
static SERIAL: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());

/// Builds the waybil contract. With `features`, the wasm goes to its own folder under
/// `target/near/` so the V1 build isn't overwritten.
fn waybil_wasm(features: Option<&str>) -> testresult::TestResult<Vec<u8>> {
    let opts = match features {
        None => cargo_near_build::BuildOpts::default(),
        Some(f) => cargo_near_build::BuildOpts::builder()
            .features(f)
            .out_dir(format!("{}/target/near/{f}", env!("CARGO_MANIFEST_DIR")))
            .build(),
    };
    Ok(std::fs::read(cargo_near_build::build_with_cli(opts)?)?)
}

/// Sends a transaction from `$who` to `$contract` and returns the final result.
macro_rules! tx {
    ($net:expr, $signer:expr, $who:expr, $contract:expr, $method:expr, $args:expr, $yocto:expr) => {
        $contract
            .call_function($method, $args)
            .transaction()
            .gas(NearGas::from_tgas(150))
            .deposit(NearToken::from_yoctonear($yocto))
            .with_signer($who.clone(), $signer.clone())
            .send_to(&$net)
            .await?
    };
}

/// Calls a view method and returns the decoded JSON.
macro_rules! view {
    ($net:expr, $contract:expr, $method:expr, $args:expr) => {{
        let v: Value = $contract
            .call_function($method, $args)
            .read_only()
            .fetch_from(&$net)
            .await?
            .data;
        v
    }};
}

fn mock_usdc_wasm() -> testresult::TestResult<Vec<u8>> {
    let dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../mock-usdc");
    let wasm = dir.join("target/near/mock_usdc.wasm");
    if !wasm.exists() {
        let status = std::process::Command::new("cargo")
            .args(["near", "build", "non-reproducible-wasm", "--no-abi"])
            .current_dir(&dir)
            .status()?;
        assert!(status.success(), "building mock-usdc failed");
    }
    Ok(std::fs::read(wasm)?)
}

async fn account(sandbox: &near_sandbox::Sandbox, name: &str) -> testresult::TestResult<AccountId> {
    let id: AccountId = name.parse()?;
    sandbox
        .create_account(id.clone())
        .initial_balance(NearToken::from_near(10))
        .send()
        .await?;
    let network = near_api::NetworkConfig::from_rpc_url("sandbox", sandbox.rpc_addr.parse()?);
    let public_key: near_api::PublicKey =
        near_sandbox::config::DEFAULT_GENESIS_ACCOUNT_PUBLIC_KEY.parse()?;
    // Patched keys must reach finality before the signer fetches their nonce.
    let ready = async {
        loop {
            let key = near_api::Account(id.clone())
                .access_key(public_key.clone())
                .at(near_api::types::Reference::Final)
                .fetch_from(&network)
                .await;
            if key.is_ok() {
                return testresult::TestResult::Ok(());
            }
            sandbox.fast_forward(1).await?;
        }
    };
    tokio::time::timeout(std::time::Duration::from_secs(30), ready)
        .await
        .map_err(|_| {
            std::io::Error::new(
                std::io::ErrorKind::TimedOut,
                format!("sandbox access key did not finalize for {id}"),
            )
        })??;
    Ok(id)
}

#[tokio::test]
async fn core_flow_pays_the_driver_on_delivery() -> testresult::TestResult<()> {
    let _serial = SERIAL.lock().await;
    let waybil_wasm = waybil_wasm(None)?;
    let usdc_wasm = mock_usdc_wasm()?;

    let sandbox = near_sandbox::Sandbox::start_sandbox().await?;
    let net = near_api::NetworkConfig::from_rpc_url("sandbox", sandbox.rpc_addr.parse()?);
    let signer = near_api::Signer::from_secret_key(
        near_sandbox::config::DEFAULT_GENESIS_ACCOUNT_PRIVATE_KEY.parse()?,
    )?;

    let owner = account(&sandbox, "owner.sandbox").await?;
    let usdc_id = account(&sandbox, "usdc.sandbox").await?;
    let app_id = account(&sandbox, "app.sandbox").await?;
    let risk = account(&sandbox, "risk.sandbox").await?;
    let ops = account(&sandbox, "ops.sandbox").await?;
    let finance = account(&sandbox, "finance.sandbox").await?;
    let assistant = account(&sandbox, "assistant.sandbox").await?;
    let treasury = account(&sandbox, "treasury.sandbox").await?;
    let maya = account(&sandbox, "maya.sandbox").await?;
    let northwind = account(&sandbox, "northwind.sandbox").await?;
    let sam = account(&sandbox, "sam.sandbox").await?;
    let carl = account(&sandbox, "carl.sandbox").await?;
    let harborhub = account(&sandbox, "harborhub.sandbox").await?;

    near_api::Contract::deploy(usdc_id.clone())
        .use_code(usdc_wasm)
        .with_init_call("new", json!({ "owner_id": owner }))?
        .with_signer(signer.clone())
        .send_to(&net)
        .await?
        .assert_success();
    near_api::Contract::deploy(app_id.clone())
        .use_code(waybil_wasm)
        .with_init_call(
            "new",
            json!({ "usdc": usdc_id, "assistant": assistant, "treasury": treasury,
                    "team": [risk, ops, finance] }),
        )?
        .with_signer(signer.clone())
        .send_to(&net)
        .await?
        .assert_success();
    let usdc = near_api::Contract(usdc_id.clone());
    let app = near_api::Contract(app_id.clone());

    // Register the app and Sam on the token. Carl stays unregistered on purpose.
    for who in [&app_id, &sam] {
        tx!(
            net,
            signer,
            owner,
            usdc,
            "storage_deposit",
            json!({ "account_id": who }),
            STORAGE
        )
        .assert_success();
    }
    tx!(
        net,
        signer,
        owner,
        usdc,
        "mint",
        json!({ "account_id": maya, "amount": U128(25_000 * USDC) }),
        0
    )
    .assert_success();

    // Maya deposits 25,000 into the pool.
    tx!(
        net,
        signer,
        maya,
        usdc,
        "ft_transfer_call",
        json!({ "receiver_id": app_id, "amount": U128(25_000 * USDC), "msg": "deposit" }),
        1
    )
    .assert_success();
    assert_eq!(
        view!(net, app, "get_pool", json!({}))["cash"],
        json!((25_000 * USDC).to_string())
    );

    // The team starts Northwind with a 3,000 limit (2 of 3).
    tx!(
        net,
        signer,
        risk,
        app,
        "propose",
        json!({ "kind": { "StartShipper": { "shipper": northwind, "limit": U128(3_000 * USDC) } } }),
        0
    )
    .assert_success();
    tx!(
        net,
        signer,
        ops,
        app,
        "vote",
        json!({ "id": 1, "approve": true }),
        0
    )
    .assert_success();

    // Network: Sam, Carl and Harbor Hub.
    tx!(
        net,
        signer,
        northwind,
        app,
        "add_driver",
        json!({ "driver": sam }),
        0
    )
    .assert_success();
    tx!(
        net,
        signer,
        northwind,
        app,
        "add_driver",
        json!({ "driver": carl }),
        0
    )
    .assert_success();
    tx!(
        net,
        signer,
        northwind,
        app,
        "add_destination",
        json!({ "warehouse": harborhub }),
        0
    )
    .assert_success();

    let due = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)?
        .as_nanos() as u64
        + 29 * DAY_NS;
    let shipment = |driver: &AccountId| {
        json!({ "driver": driver, "destination": 1, "qty": 120, "unit": "boxes",
                "bill": U128(300 * USDC), "due_at": due.to_string() })
    };

    // Shipment 1 with Sam: pickup, clean delivery, paid at once.
    tx!(
        net,
        signer,
        northwind,
        app,
        "create_shipment",
        shipment(&sam),
        0
    )
    .assert_success();
    tx!(
        net,
        signer,
        sam,
        app,
        "confirm_pickup",
        json!({ "id": 1 }),
        0
    )
    .assert_success();
    tx!(
        net,
        signer,
        harborhub,
        app,
        "confirm_delivery",
        json!({ "id": 1, "good_qty": 120 }),
        0
    )
    .assert_success();
    assert_eq!(
        view!(net, usdc, "ft_balance_of", json!({ "account_id": sam })),
        json!("292500000")
    );
    assert_eq!(
        view!(net, app, "get_shipment", json!({ "id": 1 }))["status"],
        json!("Paid")
    );

    // Shipment 2 with Carl, who is not registered on the token: the payout fails and rolls back.
    tx!(
        net,
        signer,
        northwind,
        app,
        "create_shipment",
        shipment(&carl),
        0
    )
    .assert_success();
    tx!(
        net,
        signer,
        carl,
        app,
        "confirm_pickup",
        json!({ "id": 2 }),
        0
    )
    .assert_success();
    let _ = tx!(
        net,
        signer,
        harborhub,
        app,
        "confirm_delivery",
        json!({ "id": 2, "good_qty": 120 }),
        0
    );
    assert_eq!(
        view!(net, app, "get_shipment", json!({ "id": 2 }))["status"],
        json!("PickedUp")
    );
    assert_eq!(
        view!(net, app, "get_pool", json!({}))["lent"],
        json!("292500000")
    );

    // Northwind repays bill 1 (300 USDC). The pool earns 4.80, the reserve 1.20, Waybil 1.50.
    tx!(
        net,
        signer,
        owner,
        usdc,
        "mint",
        json!({ "account_id": northwind, "amount": U128(300 * USDC) }),
        0
    )
    .assert_success();
    tx!(
        net,
        signer,
        northwind,
        usdc,
        "ft_transfer_call",
        json!({ "receiver_id": app_id, "amount": U128(300 * USDC), "msg": "{\"repay\":1}" }),
        1
    )
    .assert_success();
    assert_eq!(
        view!(net, app, "get_shipment", json!({ "id": 1 }))["status"],
        json!("Repaid")
    );
    let pool = view!(net, app, "get_pool", json!({}));
    assert_eq!(pool["reserve"], json!("1200000"));
    assert_eq!(pool["fees"], json!("1500000"));

    // The treasury claims Waybil's fees.
    tx!(
        net,
        signer,
        owner,
        usdc,
        "storage_deposit",
        json!({ "account_id": treasury }),
        STORAGE
    )
    .assert_success();
    tx!(net, signer, treasury, app, "claim_fees", json!({}), 0).assert_success();
    assert_eq!(
        view!(
            net,
            usdc,
            "ft_balance_of",
            json!({ "account_id": treasury })
        ),
        json!("1500000")
    );

    // Maya withdraws 1,000 USDC and receives it.
    tx!(
        net,
        signer,
        maya,
        app,
        "withdraw",
        json!({ "amount": U128(1_000 * USDC) }),
        0
    )
    .assert_success();
    assert_eq!(
        view!(net, usdc, "ft_balance_of", json!({ "account_id": maya })),
        json!((1_000 * USDC).to_string())
    );

    // Nobody outside the contract can call the payout callback.
    tx!(
        net,
        signer,
        sam,
        app,
        "on_payout",
        json!({ "id": 1, "from_reported": false }),
        0
    )
    .assert_failure();

    Ok(())
}

/// Input of `approve_upgrade`: borsh `(id: u64, code: Vec<u8>)`, the same bytes the
/// team-upgrade script sends.
fn upgrade_args(id: u64, wasm: &[u8]) -> Vec<u8> {
    let mut args = Vec::with_capacity(12 + wasm.len());
    args.extend_from_slice(&id.to_le_bytes());
    args.extend_from_slice(&(wasm.len() as u32).to_le_bytes());
    args.extend_from_slice(wasm);
    args
}

/// Base58 sha256 of a wasm, as `propose(Upgrade{code_hash})` takes it.
fn code_hash(wasm: &[u8]) -> String {
    near_api::types::CryptoHash::hash(wasm).to_string()
}

/// `approve_upgrade` with the wasm as bytes and 300 Tgas, like the team-upgrade script.
macro_rules! approve_upgrade {
    ($net:expr, $signer:expr, $who:expr, $contract:expr, $id:expr, $wasm:expr) => {
        $contract
            .call_function_raw("approve_upgrade", upgrade_args($id, $wasm))
            .transaction()
            .gas(NearGas::from_tgas(300))
            .deposit(NearToken::from_yoctonear(0))
            .with_signer($who.clone(), $signer.clone())
            .send_to(&$net)
            .await?
    };
}

/// Every view the upgrade must keep unchanged.
async fn snapshot(
    net: &near_api::NetworkConfig,
    app: &near_api::Contract,
    shipper: &AccountId,
    investor: &AccountId,
) -> testresult::TestResult<Value> {
    Ok(json!({
        "shipment": view!(net, app, "get_shipment", json!({ "id": 1 })),
        "by_shipper": view!(net, app, "list_shipments_by_shipper", json!({ "account_id": shipper })),
        "shipper": view!(net, app, "get_shipper", json!({ "account_id": shipper })),
        "network": view!(net, app, "get_network", json!({ "account_id": shipper })),
        "pool": view!(net, app, "get_pool", json!({})),
        "investor": view!(net, app, "get_investor", json!({ "account_id": investor })),
        "proposal": view!(net, app, "get_proposal", json!({ "id": 1 })),
        "team": view!(net, app, "get_team", json!({})),
        "config": view!(net, app, "get_config", json!({})),
    }))
}

#[tokio::test]
async fn team_upgrade_keeps_state_and_rolls_back_bad_migrate() -> testresult::TestResult<()> {
    let _serial = SERIAL.lock().await;
    let v1 = waybil_wasm(None)?;
    let v2 = waybil_wasm(Some("test-v2"))?;
    let bad = waybil_wasm(Some("test-bad-migrate"))?;
    let usdc_wasm = mock_usdc_wasm()?;
    assert_ne!(code_hash(&v1), code_hash(&v2));
    assert_ne!(code_hash(&v2), code_hash(&bad));

    let sandbox = near_sandbox::Sandbox::start_sandbox().await?;
    let net = near_api::NetworkConfig::from_rpc_url("sandbox", sandbox.rpc_addr.parse()?);
    let signer = near_api::Signer::from_secret_key(
        near_sandbox::config::DEFAULT_GENESIS_ACCOUNT_PRIVATE_KEY.parse()?,
    )?;

    let owner = account(&sandbox, "owner.sandbox").await?;
    let usdc_id = account(&sandbox, "usdc.sandbox").await?;
    let app_id = account(&sandbox, "app.sandbox").await?;
    let risk = account(&sandbox, "risk.sandbox").await?;
    let ops = account(&sandbox, "ops.sandbox").await?;
    let finance = account(&sandbox, "finance.sandbox").await?;
    let assistant = account(&sandbox, "assistant.sandbox").await?;
    let treasury = account(&sandbox, "treasury.sandbox").await?;
    let maya = account(&sandbox, "maya.sandbox").await?;
    let northwind = account(&sandbox, "northwind.sandbox").await?;
    let sam = account(&sandbox, "sam.sandbox").await?;
    let harborhub = account(&sandbox, "harborhub.sandbox").await?;

    near_api::Contract::deploy(usdc_id.clone())
        .use_code(usdc_wasm)
        .with_init_call("new", json!({ "owner_id": owner }))?
        .with_signer(signer.clone())
        .send_to(&net)
        .await?
        .assert_success();
    near_api::Contract::deploy(app_id.clone())
        .use_code(v1)
        .with_init_call(
            "new",
            json!({ "usdc": usdc_id, "assistant": assistant, "treasury": treasury,
                    "team": [risk, ops, finance] }),
        )?
        .with_signer(signer.clone())
        .send_to(&net)
        .await?
        .assert_success();
    let usdc = near_api::Contract(usdc_id.clone());
    let app = near_api::Contract(app_id.clone());

    // V1 state: a pool deposit, a started shipper with its network, and a shipment.
    tx!(
        net,
        signer,
        owner,
        usdc,
        "storage_deposit",
        json!({ "account_id": app_id }),
        STORAGE
    )
    .assert_success();
    tx!(
        net,
        signer,
        owner,
        usdc,
        "mint",
        json!({ "account_id": maya, "amount": U128(10_000 * USDC) }),
        0
    )
    .assert_success();
    tx!(
        net,
        signer,
        maya,
        usdc,
        "ft_transfer_call",
        json!({ "receiver_id": app_id, "amount": U128(10_000 * USDC), "msg": "deposit" }),
        1
    )
    .assert_success();
    tx!(
        net,
        signer,
        risk,
        app,
        "propose",
        json!({ "kind": { "StartShipper": { "shipper": northwind, "limit": U128(3_000 * USDC) } } }),
        0
    )
    .assert_success();
    tx!(
        net,
        signer,
        ops,
        app,
        "vote",
        json!({ "id": 1, "approve": true }),
        0
    )
    .assert_success();
    tx!(
        net,
        signer,
        northwind,
        app,
        "add_driver",
        json!({ "driver": sam }),
        0
    )
    .assert_success();
    tx!(
        net,
        signer,
        northwind,
        app,
        "add_destination",
        json!({ "warehouse": harborhub }),
        0
    )
    .assert_success();
    let due = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)?
        .as_nanos() as u64
        + 29 * DAY_NS;
    tx!(
        net,
        signer,
        northwind,
        app,
        "create_shipment",
        json!({ "driver": sam, "destination": 1, "qty": 120, "unit": "boxes",
                "bill": U128(300 * USDC), "due_at": due.to_string() }),
        0
    )
    .assert_success();

    assert_eq!(
        view!(net, app, "get_code_info", json!({})),
        json!({ "version": 1, "code_hash": null })
    );
    let before = snapshot(&net, &app, &northwind, &maya).await?;
    assert_eq!(before["shipment"]["status"], json!("Approved"));
    assert_eq!(before["pool"]["cash"], json!((10_000 * USDC).to_string()));
    assert_eq!(before["pool"]["committed"], json!("292500000"));

    // Risk proposes V2. Ops approving with other bytes fails and changes nothing.
    tx!(
        net,
        signer,
        risk,
        app,
        "propose",
        json!({ "kind": { "Upgrade": { "code_hash": code_hash(&v2) } } }),
        0
    )
    .assert_success();
    let wrong = approve_upgrade!(net, signer, ops, app, 2, &bad).assert_failure();
    assert!(format!("{wrong:?}").contains("E_CODE_HASH"), "{wrong:?}");
    let p = view!(net, app, "get_proposal", json!({ "id": 2 }));
    assert_eq!(p["status"], json!("Open"));
    assert_eq!(p["approvals"], json!([risk]));
    // A plain vote can't be the approval that deploys.
    let vote = tx!(
        net,
        signer,
        ops,
        app,
        "vote",
        json!({ "id": 2, "approve": true }),
        0
    )
    .assert_failure();
    assert!(
        format!("{vote:?}").contains("E_USE_APPROVE_UPGRADE"),
        "{vote:?}"
    );

    // Ops approves with the V2 code: deploy and migrate run in one batch.
    approve_upgrade!(net, signer, ops, app, 2, &v2).assert_success();
    assert_eq!(
        view!(net, app, "get_code_info", json!({})),
        json!({ "version": 2, "code_hash": code_hash(&v2) })
    );
    assert_eq!(
        view!(net, app, "get_proposal", json!({ "id": 2 }))["status"],
        json!("Approved")
    );
    assert_eq!(snapshot(&net, &app, &northwind, &maya).await?, before);

    // V2 still runs the flow on the old state: Sam picks up shipment 1.
    tx!(
        net,
        signer,
        sam,
        app,
        "confirm_pickup",
        json!({ "id": 1 }),
        0
    )
    .assert_success();
    let after_v2 = snapshot(&net, &app, &northwind, &maya).await?;
    assert_eq!(after_v2["shipment"]["status"], json!("PickedUp"));

    // Finance proposes code whose migrate fails. Risk approves: the batch fails and rolls
    // back, so V2 stays with its state. The proposal is still marked approved.
    tx!(
        net,
        signer,
        finance,
        app,
        "propose",
        json!({ "kind": { "Upgrade": { "code_hash": code_hash(&bad) } } }),
        0
    )
    .assert_success();
    let failed = approve_upgrade!(net, signer, risk, app, 3, &bad).assert_failure();
    assert!(
        format!("{failed:?}").contains("E_TEST_BAD_MIGRATE"),
        "{failed:?}"
    );
    assert_eq!(
        view!(net, app, "get_code_info", json!({})),
        json!({ "version": 2, "code_hash": code_hash(&v2) })
    );
    assert_eq!(
        view!(net, app, "get_proposal", json!({ "id": 3 }))["status"],
        json!("Approved")
    );
    assert_eq!(snapshot(&net, &app, &northwind, &maya).await?, after_v2);

    // `migrate` is private: nobody else can call it.
    tx!(net, signer, sam, app, "migrate", json!({}), 0).assert_failure();

    Ok(())
}
