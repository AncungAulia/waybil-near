//! Sandbox test: deploy, claim from the faucet, transfer.
//! near-sandbox has no Windows build, so this file only compiles on Linux and macOS.
//! On Windows run `cargo test --lib` (unit tests) and rely on CI for this one.
#![cfg(not(target_os = "windows"))]

use near_api::{AccountId, NearToken};
use near_sdk::json_types::U128;
use near_sdk::serde_json::json;

const ONE_USDC: u128 = 1_000_000;

#[tokio::test]
async fn faucet_and_transfer_work_on_chain() -> testresult::TestResult<()> {
    let wasm_path = cargo_near_build::build_with_cli(Default::default())?;
    let wasm = std::fs::read(wasm_path)?;

    let sandbox = near_sandbox::Sandbox::start_sandbox().await?;
    let network = near_api::NetworkConfig::from_rpc_url("sandbox", sandbox.rpc_addr.parse()?);
    let public_key: near_api::PublicKey =
        near_sandbox::config::DEFAULT_GENESIS_ACCOUNT_PUBLIC_KEY.parse()?;
    let signer = near_api::Signer::from_secret_key(
        near_sandbox::config::DEFAULT_GENESIS_ACCOUNT_PRIVATE_KEY.parse()?,
    )?;

    let owner = account(&sandbox, "owner.sandbox").await?;
    let alice = account(&sandbox, "alice.sandbox").await?;
    let bob = account(&sandbox, "bob.sandbox").await?;
    let token = account(&sandbox, "usdc.sandbox").await?.as_contract();

    near_api::Contract::deploy(token.account_id().clone())
        .use_code(wasm)
        .with_init_call("new", json!({ "owner_id": owner.account_id() }))?
        .with_signer(signer.clone())
        .send_to(&network)
        .await?
        .assert_success();

    // Alice and Bob each claim 1,000 USDC.
    for who in [&alice, &bob] {
        token
            .call_function("faucet", ())
            .transaction()
            .with_signer(who.account_id().clone(), signer.clone())
            .send_to(&network)
            .await?
            .assert_success();
    }

    // A second claim the same day fails.
    token
        .call_function("faucet", ())
        .transaction()
        .with_signer(alice.account_id().clone(), signer.clone())
        .send_to(&network)
        .await?
        .assert_failure();

    // Alice sends Bob 300 USDC (needs exactly 1 yoctoNEAR).
    token
        .call_function(
            "ft_transfer",
            json!({ "receiver_id": bob.account_id(), "amount": (300 * ONE_USDC).to_string() }),
        )
        .transaction()
        .deposit(NearToken::from_yoctonear(1))
        .with_signer(alice.account_id().clone(), signer.clone())
        .send_to(&network)
        .await?
        .assert_success();

    let balance = |who: AccountId| {
        let token = token.clone();
        let network = network.clone();
        async move {
            let b: U128 = token
                .call_function("ft_balance_of", json!({ "account_id": who }))
                .read_only()
                .fetch_from(&network)
                .await?
                .data;
            testresult::TestResult::Ok(b.0)
        }
    };
    assert_eq!(balance(alice.account_id().clone()).await?, 700 * ONE_USDC);
    assert_eq!(balance(bob.account_id().clone()).await?, 1_300 * ONE_USDC);

    Ok(())
}

async fn account(
    sandbox: &near_sandbox::Sandbox,
    name: &str,
) -> testresult::TestResult<near_api::Account> {
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
    Ok(near_api::Account(id))
}
