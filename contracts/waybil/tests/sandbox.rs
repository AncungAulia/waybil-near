//! Sandbox test for the core flow with the real test USDC token:
//! deposit → team starts a shipper → network → shipment → pickup → delivery → driver paid,
//! a failed payout that rolls back, and the private callback guard.
//! near-sandbox has no Windows build, so this file only compiles on Linux and macOS.
#![cfg(not(target_os = "windows"))]

use near_api::{AccountId, NearGas, NearToken};
use near_sdk::json_types::U128;
use near_sdk::serde_json::{Value, json};

const USDC: u128 = 1_000_000;
const DAY_NS: u64 = 86_400 * 1_000_000_000;
const STORAGE: u128 = 10_000_000_000_000_000_000_000; // 0.01 NEAR

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
    // Patched keys must reach finality before the signer fetches their nonce.
    let ready = async {
        loop {
            let key = near_api::Account(id.clone())
                .access_key(near_sandbox::config::DEFAULT_GENESIS_ACCOUNT_PUBLIC_KEY.parse()?)
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
    let waybil_wasm = std::fs::read(cargo_near_build::build_with_cli(Default::default())?)?;
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
